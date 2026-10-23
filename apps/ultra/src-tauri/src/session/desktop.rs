//! Alive's single serialized control owner. Editor windows never own native slots.
use super::{host::Host, native, *};
use serde::Serialize;
use std::{path::{Path, PathBuf}, sync::{Mutex, MutexGuard}};
use tauri::{Emitter, Manager, WebviewWindow};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogResult};

struct Control {
    host: Host,
    driver: crate::audio::Driver,
    generation: u64,
    dirty: bool,
    saved_path: Option<PathBuf>,
    draft: Option<Session>,
    closing: bool,
    allow_exit: bool,
}
pub struct Desktop(Mutex<Control>);
fn ui_lock<T>(mutex: &Mutex<T>) -> Result<MutexGuard<'_, T>, String> {
    mutex.try_lock().map_err(|_| "Finish the current session dialog before using this control".into())
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    document: Session,
    path: Option<PathBuf>,
    devices: Vec<crate::canvas::device::HostManifest>,
    generation: u64,
    dirty: bool,
    draft: Option<Session>,
    state: native::State,
    audio: crate::audio::Snapshot,
    patch: Option<serde_json::Value>,
    track: Option<usize>,
}
fn main_only(label: &str) -> Result<(), String> {
    if label == "main" { Ok(()) } else { Err("This action belongs to the Alive session window".into()) }
}
fn editor_label(generation: u64, track: usize) -> String { format!("alive-editor-{generation}-{track}") }
fn check_generation(actual: u64, expected: u64) -> Result<(), String> {
    if actual == expected { Ok(()) } else { Err("This device view is stale. Reopen the editor from the current session.".into()) }
}
fn merge_live(draft: &mut Session, live: &Session) {
    for track in &mut draft.tracks {
        if let Some(current) = live.tracks.iter().find(|t| t.id == track.id && t.device.id == track.device.id && t.device.path == track.device.path) {
            track.device.parameters = current.device.parameters.clone();
            track.gain = current.gain; track.mute = current.mute; track.solo = current.solo;
        }
    }
}
fn musical_draft(mut draft: Session, live: &Session) -> Result<Session, String> {
    if draft.tracks.len() != live.tracks.len() || draft.tracks.iter().zip(&live.tracks).any(|(a,b)| a.id != b.id || a.device.id != b.device.id || a.device.path != b.device.path || a.device.version != b.device.version) {
        return Err("Load or remove devices with the stopped device controls".into());
    }
    if draft.title.len() > 128 || draft.tracks.iter().any(|track| track.name.len() > 64 || track.notes.len() > 128 || track.automation.len() > 16 || track.automation.iter().any(|lane| lane.key.len() > 64) || track.automation.iter().map(|lane| lane.points.len()).sum::<usize>() > 256) {
        return Err("Schedule draft exceeds the session's note, automation or text limits".into());
    }
    merge_live(&mut draft, live);
    Ok(draft)
}
impl Control {
    fn stage(&mut self, document: Option<Session>, generation: u64) -> Result<(), String> {
        check_generation(self.generation, generation)?;
        self.draft = document.map(|draft| musical_draft(draft, &self.host.prepared.as_ref().ok_or("No session")?.document)).transpose()?;
        Ok(())
    }
    fn editor_track(&self, label: &str) -> Result<Option<usize>, String> {
        if label == "main" { return Ok(None); }
        let count = self.host.prepared.as_ref().map_or(0, |p| p.tracks.len());
        (0..count).find(|&track| label == editor_label(self.generation, track)).map(Some)
            .ok_or_else(|| "This hosted editor is stale or unrelated to the current session".into())
    }
    fn snapshot(&self, label: &str) -> Result<Snapshot, String> {
        let track = self.editor_track(label)?;
        let prepared = self.host.prepared.as_ref().ok_or("Open an Alive session")?;
        Ok(Snapshot { document: prepared.document.clone(), path: self.saved_path.clone(),
            devices: prepared.tracks.iter().map(|t| t.manifest.clone()).collect(), generation: self.generation,
            dirty: self.dirty || self.draft.is_some(), draft: self.draft.clone(), state: native::state()?,
            audio: self.driver.snapshot(), patch: track.map(|i| prepared.tracks[i].patch.clone()), track })
    }
    fn stopped(&self) -> Result<(), String> {
        if native::state()?.playing != 0 { Err("Stop transport before preparing a schedule or changing devices. Your edits are retained.".into()) } else { Ok(()) }
    }
    fn install(&mut self, prepared: PreparedSession) -> Result<(), String> {
        self.stopped()?;
        self.host.validate(&prepared)?;
        self.driver.stop();
        self.host.install(prepared)?;
        self.generation += 1; self.dirty = true; self.draft = None;
        Ok(())
    }
    fn apply_draft(&mut self) -> Result<(), String> {
        let Some(mut document) = self.draft.clone() else { return Ok(()); };
        let current = self.host.prepared.as_ref().ok_or("No session")?;
        merge_live(&mut document, &current.document);
        let prepared = prepare(&document, &current.origin)?;
        self.install(prepared)
    }
}

#[tauri::command]
pub fn alive_current(window: WebviewWindow, state: tauri::State<Desktop>) -> Result<Snapshot, String> {
    ui_lock(&state.0)?.snapshot(window.label())
}
#[tauri::command]
pub fn alive_draft(window: WebviewWindow, state: tauri::State<Desktop>, document: Option<Session>, generation: u64) -> Result<(), String> {
    main_only(window.label())?;
    ui_lock(&state.0)?.stage(document, generation)
}
#[tauri::command]
pub fn alive_apply(window: WebviewWindow, state: tauri::State<Desktop>, document: Session, generation: u64) -> Result<Snapshot, String> {
    main_only(window.label())?;
    let mut control = ui_lock(&state.0)?;
    control.stage(Some(document), generation)?;
    control.apply_draft()?;
    close_stale_editors(window.app_handle(), control.generation);
    control.snapshot(window.label())
}
#[tauri::command]
pub fn alive_base(window: WebviewWindow, state: tauri::State<Desktop>, track: usize, key: String, value: f64, generation: u64) -> Result<(), String> {
    let mut control = ui_lock(&state.0)?;
    check_generation(control.generation, generation)?;
    if control.editor_track(window.label())?.is_some_and(|own| own != track) { return Err("A hosted editor can edit only its own device".into()); }
    control.host.base(track, &key, value)?; control.dirty = true; Ok(())
}
#[tauri::command]
pub fn alive_mixer(window: WebviewWindow, state: tauri::State<Desktop>, track: usize, gain: f64, mute: bool, solo: bool, generation: u64) -> Result<(), String> {
    main_only(window.label())?;
    let mut control = ui_lock(&state.0)?;
    check_generation(control.generation, generation)?;
    control.host.mixer(track, gain, mute, solo)?; control.dirty = true; Ok(())
}
#[tauri::command]
pub fn alive_transport(window: WebviewWindow, state: tauri::State<Desktop>, action: String, beat: Option<f64>, generation: u64) -> Result<(), String> {
    main_only(window.label())?;
    let mut control = ui_lock(&state.0)?;
    check_generation(control.generation, generation)?;
    match action.as_str() {
        "start" => { control.driver.start()?; if unsafe { native::alive_session_start() } == 0 { return Err(native::error()); } }
        "stop" => unsafe { native::alive_session_stop(); },
        "seek" => {
            let document = &control.host.prepared.as_ref().ok_or("No session")?.document;
            let beat = beat.ok_or("Enter a seek beat")?;
            if !beat.is_finite() || beat < 0. || beat >= document.length_beats { return Err("Seek beat must be within the prepared clip".into()); }
            if unsafe { native::alive_session_seek((beat * 48_000. * 60. / document.tempo).round() as u64) } == 0 { return Err(native::error()); }
        }
        _ => return Err("Unknown transport action".into()),
    }
    Ok(())
}
#[tauri::command]
pub async fn alive_editor(window: WebviewWindow, state: tauri::State<'_, Desktop>, track: usize, generation: u64) -> Result<(), String> {
    main_only(window.label())?;
    let control = ui_lock(&state.0)?;
    check_generation(control.generation, generation)?;
    let prepared = control.host.prepared.as_ref().ok_or("No session")?;
    let name = &prepared.document.tracks.get(track).ok_or("Unknown track")?.name;
    let label = editor_label(generation, track);
    if let Some(editor) = window.app_handle().get_webview_window(&label) { editor.set_focus().map_err(|e| e.to_string())?; }
    else { tauri::WebviewWindowBuilder::new(window.app_handle(), label, tauri::WebviewUrl::App("alive-editor.html".into()))
        .title(format!("{name} - Ultra Hosted Editor")).inner_size(1100., 760.).min_inner_size(720., 500.)
        .build().map_err(|e| e.to_string())?; }
    Ok(())
}
fn close_stale_editors(app: &tauri::AppHandle, generation: u64) {
    for (label, window) in app.webview_windows() {
        if label.starts_with("alive-editor-") && !(0..2).any(|i| label == editor_label(generation, i)) { let _ = window.close(); }
    }
}
fn chosen(result: MessageDialogResult, name: &str, yes: bool) -> bool {
    matches!(&result, MessageDialogResult::Custom(value) if value == name)
        || if yes { matches!(result, MessageDialogResult::Yes) } else { matches!(result, MessageDialogResult::No) }
}
fn resolve_draft(window: &WebviewWindow, control: &mut Control) -> Result<bool, String> {
    if control.draft.is_none() { return Ok(true); }
    let result = window.dialog().message("Clip, tempo or automation edits have not been prepared. Stop transport to apply them, or discard them explicitly.")
        .title("Pending Schedule Edits").parent(window)
        .buttons(MessageDialogButtons::YesNoCancelCustom("Apply edits".into(), "Discard edits".into(), "Cancel".into())).blocking_show_with_result();
    if chosen(result.clone(), "Apply edits", true) { control.apply_draft()?; Ok(true) }
    else if chosen(result, "Discard edits", false) { control.draft = None; Ok(true) } else { Ok(false) }
}
fn save_current(window: &WebviewWindow, control: &mut Control, save_as: bool, path: Option<PathBuf>) -> Result<bool, String> {
    let prepared = control.host.prepared.as_ref().ok_or("No session")?;
    let path = path.or_else(|| if save_as { None } else { control.saved_path.clone() });
    let path = match path {
        Some(path) => path,
        None => {
            let Some(path) = window.dialog().file().set_parent(window).set_title("Save Alive Session")
                .add_filter("Alive session", &["alive"]).set_file_name(format!("{}.alive", prepared.document.title)).blocking_save_file() else { return Ok(false); };
            path.into_path().map_err(|e| e.to_string())?
        }
    };
    let path = save(&path, &prepared.document, &prepared.origin)?;
    let saved = read(&path)?;
    let current = control.host.prepared.as_mut().unwrap();
    current.document = saved.document; current.origin = saved.origin;
    control.saved_path = Some(path); control.dirty = false; Ok(true)
}
fn resolve_dirty(window: &WebviewWindow, control: &mut Control) -> Result<bool, String> {
    if !control.dirty { return Ok(true); }
    let result = window.dialog().message("Save changes to this Alive session before continuing?")
        .title("Unsaved Alive Session").parent(window)
        .buttons(MessageDialogButtons::YesNoCancelCustom("Save".into(), "Discard".into(), "Cancel".into())).blocking_show_with_result();
    if chosen(result.clone(), "Save", true) { save_current(window, control, false, None) }
    else { Ok(chosen(result, "Discard", false)) }
}
fn example(app: &tauri::AppHandle) -> Result<PreparedSession, String> {
    let bundled = app.path().resource_dir().map_err(|e| e.to_string())?.join("alive-session/alive/examples/two-instruments.alive");
    let path = if bundled.is_file() { bundled } else { Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive") };
    read(&path)
}
#[tauri::command]
pub async fn alive_file(window: WebviewWindow, action: String, path: Option<PathBuf>) -> Result<Option<Snapshot>, String> {
    main_only(window.label())?;
    tauri::async_runtime::spawn_blocking(move || {
        let state = window.state::<Desktop>();
        let mut control = ui_lock(&state.0)?;
        control.closing = false;
        // Resolve prospective dependencies before any dirty-state decision or native replacement.
        let prospective = match action.as_str() {
            "new" => Some(example(window.app_handle())?),
            "open" => {
                let path = match path.clone() { Some(path) => path, None => {
                    let Some(path) = window.dialog().file().set_parent(&window).set_title("Open Alive Session").add_filter("Alive session", &["alive", "json"]).blocking_pick_file() else { return Ok(None); };
                    path.into_path().map_err(|e| e.to_string())?
                }};
                let prepared = read(&path)?; control.host.validate(&prepared)?; Some(prepared)
            }
            "save" | "saveAs" | "quit" => None,
            _ => return Err("Unknown session action".into()),
        };
        if !resolve_draft(&window, &mut control)? { return Ok(None); }
        match action.as_str() {
            "save" | "saveAs" => { if !save_current(&window, &mut control, action == "saveAs", path)? { return Ok(None); } }
            "new" | "open" => {
                if !resolve_dirty(&window, &mut control)? { return Ok(None); }
                let prepared = prospective.unwrap();
                let origin = prepared.origin.clone(); control.install(prepared)?;
                control.saved_path = if action == "open" { Some(origin) } else { None };
                control.dirty = action == "new";
            }
            "quit" => {
                if !resolve_dirty(&window, &mut control)? { return Ok(None); }
                control.allow_exit = true;
                drop(control);
                window.app_handle().exit(0); return Ok(None);
            }
            _ => unreachable!(),
        }
        close_stale_editors(window.app_handle(), control.generation);
        control.snapshot(window.label()).map(Some)
    }).await.map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn alive_device(window: WebviewWindow, track: usize, action: String, generation: u64, path: Option<PathBuf>) -> Result<Snapshot, String> {
    main_only(window.label())?;
    tauri::async_runtime::spawn_blocking(move || {
        let state = window.state::<Desktop>();
        let mut control = ui_lock(&state.0)?;
        check_generation(control.generation, generation)?; control.stopped()?;
        if control.draft.is_some() { return Err("Apply or discard pending schedule edits before changing devices".into()); }
        let current = control.host.prepared.as_ref().ok_or("No session")?;
        let mut document = current.document.clone();
        if action == "remove" {
            if document.tracks.len() == 1 { return Err("Keep at least one instrument track; replace its device or create a new session".into()); }
            if track >= document.tracks.len() { return Err("Unknown track".into()); } document.tracks.remove(track);
        } else if action == "load" {
            if track > document.tracks.len() || track >= 2 { return Err("Alive supports up to two tracks".into()); }
            let path = match path { Some(path) => path, None => {
                let Some(path) = window.dialog().file().set_parent(&window).set_title("Load Ultra Device").add_filter("Ultra device", &["ultra"]).blocking_pick_file() else { return control.snapshot(window.label()); };
                path.into_path().map_err(|e| e.to_string())?
            }};
            let loaded = crate::documents::read_patch(&path)?;
            let patch = loaded.patch.ok_or("Choose a saved Ultra device")?;
            let graph = crate::canvas::prepare(patch.clone())?.native;
            let manifest = crate::canvas::device::host_manifest(&patch, &graph)?;
            let reference = DeviceReference { path: loaded.path.to_str().ok_or("Device path must be UTF-8")?.into(), id: manifest.id, version: manifest.version, parameters: Default::default() };
            if track < document.tracks.len() {
                document.tracks[track].device = reference;
                document.tracks[track].automation.clear();
            } else {
                let id = format!("track-{}-{}", control.generation, track);
                document.tracks.push(Track { id, name: format!("Track {}", track + 1), device: reference, notes: vec![], automation: vec![], gain: 0.7, mute: false, solo: false });
            }
        } else { return Err("Unknown device action".into()); }
        let prepared = prepare(&document, &current.origin)?; control.install(prepared)?;
        close_stale_editors(window.app_handle(), control.generation);
        control.snapshot(window.label())
    }).await.map_err(|e| e.to_string())?
}
fn request_close(app: &tauri::AppHandle) {
    let state = app.state::<Desktop>();
    let Ok(mut control) = state.0.try_lock() else { return; };
    if control.closing || control.allow_exit { return; }
    control.closing = true;
    let _ = app.emit_to("main", "alive-close-requested", ());
}
pub fn run(path: Option<PathBuf>) {
    let mut context = tauri::generate_context!();
    context.config_mut().app.windows.clear();
    tauri::Builder::default().plugin(tauri_plugin_dialog::init())
        .setup(move |app| {
            let prepared = match path.as_ref() { Some(path) => read(path), None => example(app.handle()) }
                .map_err(std::io::Error::other)?;
            let saved_path = path.as_ref().map(|_| prepared.origin.clone());
            let mut host = Host::default(); host.install(prepared).map_err(std::io::Error::other)?;
            app.manage(Desktop(Mutex::new(Control { host, driver: crate::audio::Driver::load(app.path().app_data_dir()?.join("audio-settings.json")), generation: 1,
                dirty: false, saved_path, draft: None, closing: false, allow_exit: false })));
            tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::App("alive.html".into()))
                .title("Alive").inner_size(1200., 800.).min_inner_size(900., 660.).build()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![alive_current, alive_draft, alive_apply, alive_base, alive_mixer, alive_transport, alive_editor, alive_file, alive_device])
        .on_window_event(|window,event| { if window.label() == "main" { if let tauri::WindowEvent::CloseRequested { api, .. } = event { api.prevent_close(); request_close(window.app_handle()); } } })
        .build(context).expect("Unable to start Alive")
        .run(|app,event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                let allowed = app.state::<Desktop>().0.try_lock().map(|c| c.allow_exit).unwrap_or(false);
                if !allowed { api.prevent_exit(); request_close(app); }
            }
            tauri::RunEvent::Exit => {
                if let Ok(mut control) = app.state::<Desktop>().0.lock() {
                    control.driver.stop();
                    unsafe { native::alive_session_stop(); native::alive_session_reset(); for slot in 0..2 { crate::ultra_canvas_close_document(slot); } }
                }
            }
            _ => {},
        });
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn polling_or_close_during_native_dialog_never_blocks_the_ui() {
        let owner = Mutex::new(false);
        let dialog = owner.lock().unwrap();
        assert!(ui_lock(&owner).unwrap_err().contains("dialog"));
        assert!(owner.try_lock().is_err());
        drop(dialog);
        assert!(!*ui_lock(&owner).unwrap());
    }
    #[test]
    fn draft_rejects_device_substitution_and_overload_before_retention() {
        let live: Session = serde_json::from_str(include_str!("../../../../alive/examples/two-instruments.alive")).unwrap();
        let mut draft = live.clone();
        draft.tracks[0].device.path = "other.ultra".into();
        assert!(musical_draft(draft, &live).unwrap_err().contains("stopped"));
        let mut draft = live.clone();
        draft.tracks[0].notes = vec![draft.tracks[0].notes[0].clone(); 129];
        assert!(musical_draft(draft, &live).unwrap_err().contains("limits"));
    }
    #[test]
    fn stale_generation_and_unrelated_main_actions_reject() {
        assert!(check_generation(4, 3).is_err()); assert!(check_generation(4, 4).is_ok());
        assert!(main_only("alive-editor-4-0").is_err()); assert!(main_only("main").is_ok());
    }
    #[test]
    fn pending_schedule_merges_latest_live_bases_and_mixer() {
        let mut live: Session = serde_json::from_str(include_str!("../../../../alive/examples/two-instruments.alive")).unwrap();
        let mut draft = live.clone(); draft.tracks[0].notes[0].pitch = 61;
        live.tracks[0].device.parameters.insert("cutoff".into(), 1234.); live.tracks[0].gain = 0.4;
        merge_live(&mut draft, &live);
        assert_eq!(draft.tracks[0].notes[0].pitch, 61); assert_eq!(draft.tracks[0].device.parameters["cutoff"], 1234.); assert_eq!(draft.tracks[0].gain, 0.4);
    }
}
