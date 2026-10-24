//! Alive's single serialized control owner. Editor windows never own native slots.
use super::{host::Host, native, *};
use serde::Serialize;
use super::history::{History, Direction, Projection};
use std::{path::{Path, PathBuf}, sync::{Mutex, MutexGuard}, collections::BTreeMap};
use tauri::{Emitter, Manager, WebviewWindow};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogResult};

struct Control {
    host: Host,
    runtime: runtime::Runtime,
    snapshot_sequence: u64,
    driver: crate::audio::Driver,
    generation: u64,
    dirty: bool,
    saved_path: Option<PathBuf>,
    draft: Option<Session>,
    draft_revision: u64,
    history: History,
    closing: bool,
    allow_exit: bool,
    editors: BTreeMap<String, EditorBinding>,
}
#[derive(Clone)]
struct EditorBinding { generation: u64, instance_id: String }
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DeviceView { index: usize, track: usize, manifest: crate::canvas::device::HostManifest }
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Capabilities { clip_bank: bool, max_tracks: usize, max_devices: usize, slots_per_track: usize, max_clips: usize, atomic_track_actions: bool }
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
    draft_revision: u64,
    history: super::history::View,
    state: serde_json::Value,
    mode: String,
    capabilities: Capabilities,
    notice: Option<String>,
    preparation_revision: String,
    snapshot_sequence: String,
    prepared_clips: Vec<runtime::PreparedClip>,
    runtime: Option<runtime::View>,
    device_instances: BTreeMap<String, DeviceView>,
    instance_id: Option<String>,
    device_index: Option<usize>,
    audio: crate::audio::Snapshot,
    patch: Option<serde_json::Value>,
    track: Option<usize>,
}
fn main_only(label: &str) -> Result<(), String> {
    if label == "main" { Ok(()) } else { Err("This action belongs to the Alive session window".into()) }
}
fn editor_label(generation: u64, instance_id: &str) -> String {
    let token: String = instance_id.bytes().map(|b| format!("{b:02x}")).collect();
    format!("alive-editor-{generation}-{token}")
}
fn check_generation(actual: u64, expected: u64) -> Result<(), String> {
    if actual>9007199254740991||expected>9007199254740991{return Err("Invalid desktop generation".into());}
    if actual == expected { Ok(()) } else { Err("This device view is stale. Reopen the editor from the current session.".into()) }
}
fn ensure_counter(value:u64)->Result<(),String>{if value>=9007199254740991{Err("Desktop revision exhausted".into())}else{Ok(())}}
fn merge_live(draft: &mut Session, live: &Session) {
    for track in &mut draft.tracks {
        if let Some(current) = live.tracks.iter().find(|t| t.id == track.id) {
            for reference in track.devices_mut() {
                if let Some(device) = current.devices().find(|d| d.instance_id == reference.instance_id) {
                    reference.parameters = device.parameters.clone(); reference.bypassed = device.bypassed;
                }
            }
            track.gain = current.gain; track.mute = current.mute; track.solo = current.solo;
        }
    }
}
fn same_chain(a: &Track, b: &Track) -> bool {
    a.devices().count() == b.devices().count() && a.devices().zip(b.devices()).all(|(a,b)|
        a.instance_id == b.instance_id && a.id == b.id && a.path == b.path && a.version == b.version && a.source_sha256 == b.source_sha256)
}
fn musical_draft(mut draft: Session, live: &Session) -> Result<Session, String> {
    if draft.format != live.format || draft.tracks.len() != live.tracks.len() || draft.tracks.iter().zip(&live.tracks).any(|(a,b)| a.id != b.id || !same_chain(a,b)) {
        return Err("Load or remove devices with the stopped device controls".into());
    }
    if draft.title.len() > 128 || draft.tracks.iter().any(|track| track.name.len() > 64 || track.notes.len() > 128 || track.automation.len() > 16 || track.automation.iter().any(|lane| lane.key.len() > 64) || track.automation.iter().map(|lane| lane.points.len()).sum::<usize>() > 256) {
        return Err("Schedule draft exceeds the session's note, automation or text limits".into());
    }
    merge_live(&mut draft, live);
    Ok(draft)
}
impl Control {
    fn version(&self,generation:u64,revision:u64)->Result<(),String> {
        ensure_counter(self.generation)?;ensure_counter(self.draft_revision)?;
        check_generation(self.generation,generation)?;
        if self.draft_revision!=revision {return Err("Pending edits changed. Refresh the session and try again.".into());} Ok(())
    }
    fn clear_scope(&mut self)->Result<(),String> {ensure_counter(self.draft_revision)?;self.draft=None;self.history.clear();self.draft_revision+=1;Ok(())}
    fn retain(&mut self,document:Session) {
        let live=&self.host.prepared.as_ref().unwrap().document;
        self.draft=if Projection::from(&document)==Projection::from(live) {None}else{Some(document)};
    }
    fn edit(&mut self,document:Session,label:&str,generation:u64,revision:u64)->Result<(),String> {
        self.version(generation,revision)?;
        let prepared=self.host.prepared.as_ref().ok_or("No session")?;
        clips::guard_identities(&document,self.draft.as_ref().unwrap_or(&prepared.document))?;
        let document=musical_draft(document,&prepared.document)?;
        prepare::validate_musical(&document,prepared)?;
        let before=self.draft.as_ref().unwrap_or(&prepared.document);
        if self.history.record(before,&document,label)? {self.retain(document);self.draft_revision+=1;} Ok(())
    }
    fn clip_edit(&mut self,operation:clips::Edit,generation:u64,revision:u64)->Result<clips::Affected,String>{
        self.version(generation,revision)?;
        let prepared=self.host.prepared.as_ref().ok_or("No session")?;
        let before=self.draft.as_ref().unwrap_or(&prepared.document);let mut document=before.clone();
        let mut identities=self.history.identities();
        for clip in prepared.document.banks().iter().flat_map(|bank|bank.slots.iter().flatten()) {
            identities.insert(clip.id.clone());identities.extend(clip.notes.iter().map(|note|note.id.clone()));
        }
        let affected=clips::apply_edit(&mut document,operation,identities)?;
        merge_live(&mut document,&prepared.document);prepare::validate_musical(&document,prepared)?;
        if self.history.record(before,&document,"Clip edit")?{self.retain(document);self.draft_revision+=1;}Ok(affected)
    }
    fn history(&mut self,direction:Direction,generation:u64,revision:u64)->Result<(),String> {
        self.version(generation,revision)?;
        let prepared=self.host.prepared.as_ref().ok_or("No session")?;
        let mut document=self.history.target(direction)?.materialize(&prepared.document)?;
        merge_live(&mut document,&prepared.document);prepare::validate_musical(&document,prepared)?;
        self.history.advance(direction);self.retain(document);self.draft_revision+=1;Ok(())
    }
    fn editor_instance(&self, label: &str) -> Result<Option<&str>, String> {
        if label == "main" { return Ok(None); }
        let binding = self.editors.get(label).ok_or("This hosted editor is stale or unrelated to the current session")?;
        check_generation(self.generation, binding.generation)?;
        Ok(Some(&binding.instance_id))
    }
    fn authorize_instance(&self, label: &str, instance_id: &str) -> Result<(), String> {
        if self.editor_instance(label)?.is_some_and(|own| own != instance_id) { return Err("A hosted editor can edit only its own device".into()); }
        Ok(())
    }
    fn snapshot(&mut self, label: &str) -> Result<Snapshot, String> {
        let instance_id = self.editor_instance(label)?.map(str::to_owned);
        let sequence=self.snapshot_sequence.checked_add(1).ok_or("Snapshot sequence exhausted")?;
        let (native_state,runtime)=self.runtime.poll(&self.host)?;
        self.snapshot_sequence=sequence;
        let prepared = self.host.prepared.as_ref().ok_or("Open an Alive session")?;
        let device_index = instance_id.as_ref().map(|id| prepared.devices.iter().position(|d| &d.instance_id == id).ok_or("Unknown editor instance")).transpose()?;
        let track = device_index.map(|i| prepared.devices[i].track);
        Ok(Snapshot { document: prepared.document.clone(), path: self.saved_path.clone(),
            capabilities: Capabilities { clip_bank: prepared.document.is_clips(), max_tracks: 2, max_devices: 6, slots_per_track: if prepared.document.is_clips(){4}else{1}, max_clips: if prepared.document.is_clips(){8}else{2}, atomic_track_actions: false },
            devices: prepared.tracks.iter().map(|t| prepared.devices[t.instrument].manifest.clone()).collect(), generation: self.generation,
            device_instances: prepared.devices.iter().enumerate().map(|(index, device)| (device.instance_id.clone(), DeviceView { index, track: device.track, manifest: device.manifest.clone() })).collect(),
            dirty: self.dirty || self.draft.is_some(), draft: self.draft.clone(), draft_revision:self.draft_revision,history:self.history.view(), state: native_state,mode:if prepared.document.is_clips(){"clipsV3"}else{"legacyV2"}.into(),notice:prepared.notice.clone(),preparation_revision:self.host.preparation_revision.to_string(),snapshot_sequence:sequence.to_string(),prepared_clips:runtime::prepared(&self.host),runtime,
            audio: self.driver.snapshot(), patch: device_index.map(|i| prepared.devices[i].patch.clone()), track, instance_id, device_index })
    }
    fn stopped(&self) -> Result<(), String> {
        if native::state()?.playing != 0 { Err("Stop transport before preparing a schedule or changing devices. Your edits are retained.".into()) } else { Ok(()) }
    }
    fn install(&mut self, prepared: PreparedSession) -> Result<(), String> {
        ensure_counter(self.generation)?;ensure_counter(self.draft_revision)?;
        self.stopped()?;
        self.host.validate(&prepared)?;
        self.driver.stop()?;
        self.host.install(prepared)?;
        self.generation += 1; self.editors.clear(); self.dirty = true; self.clear_scope()?;
        Ok(())
    }
    fn apply_draft(&mut self) -> Result<(), String> {
        let Some(mut document) = self.draft.clone() else { self.clear_scope()?; return Ok(()); };
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
#[derive(Serialize)]
pub struct ClipEditResult{snapshot:Snapshot,affected:clips::Affected}
#[tauri::command]
pub fn alive_clip_edit(window:WebviewWindow,state:tauri::State<Desktop>,operation:clips::Edit,generation:u64,draft_revision:u64)->Result<ClipEditResult,String>{
    main_only(window.label())?;let mut c=ui_lock(&state.0)?;let mut snapshot=c.snapshot(window.label())?;let affected=c.clip_edit(operation,generation,draft_revision)?;snapshot.draft=c.draft.clone();snapshot.draft_revision=c.draft_revision;snapshot.history=c.history.view();snapshot.dirty=c.dirty||c.draft.is_some();Ok(ClipEditResult{snapshot,affected})
}
#[tauri::command]
pub fn alive_enable_clips(window:WebviewWindow,state:tauri::State<Desktop>,generation:u64,draft_revision:u64)->Result<Snapshot,String>{
    main_only(window.label())?;let mut c=ui_lock(&state.0)?;c.version(generation,draft_revision)?;c.stopped()?;
    if c.draft.is_some(){return Err("Apply or discard pending edits before enabling clips".into());}
    let prepared=c.host.enable_clips(c.host.prepared.clone().ok_or("No session")?)?;
    if prepared.document.is_clips(){c.install(prepared)?;close_stale_editors(window.app_handle(),c.generation);}else{c.host.prepared=Some(prepared);}
    c.snapshot(window.label())
}
#[tauri::command]
pub fn alive_clip_action(window:WebviewWindow,state:tauri::State<Desktop>,action:runtime::Action,generation:u64,preparation_revision:String)->Result<runtime::RequestResult,String>{
    main_only(window.label())?;let mut c=ui_lock(&state.0)?;check_generation(c.generation,generation)?;
    if runtime::decimal(&preparation_revision)?!=c.host.preparation_revision{return Err("Prepared bank changed. Refresh before launching".into());}
    if !c.driver.snapshot().running{return Err("Start Audio to cue or stop a track".into());}
    let p=c.host.prepared.as_ref().ok_or("No session")?;let Schedule::Clips(clips)=&p.schedule else{return Err("Enable the clip bank first".into())};
    let (track_id,clip_id)=match action{runtime::Action::Launch{track_id,clip_id}=>(track_id,Some(clip_id)),runtime::Action::Stop{track_id}=>(track_id,None)};
    let track=p.document.tracks.iter().position(|t|t.id==track_id).ok_or("Unknown track")?;
    let mut request=native::RequestV3::default();request.kind=native::V3_TRACK_ACTIONS;request.track_mask=1<<track;
    request.tracks[track]=if let Some(id)=&clip_id{let clip=clips.iter().find(|c|c.track==track&&&c.id==id).ok_or("Apply while stopped to launch this draft-only clip")?;native::TrackActionV3{action:native::V3_LAUNCH,slot:clip.slot as u32}}else{native::TrackActionV3{action:native::V3_TRACK_STOP,slot:native::V3_NONE}};
    let Control{host,runtime,..}=&mut *c;runtime.request(host,request,Some(track_id),clip_id)
}
#[tauri::command]
pub fn alive_edit(window:WebviewWindow,state:tauri::State<Desktop>,document:Session,label:String,generation:u64,draft_revision:u64)->Result<Snapshot,String> {
    main_only(window.label())?;let mut control=ui_lock(&state.0)?;
    let mut snapshot=control.snapshot(window.label())?;
    control.edit(document,&label,generation,draft_revision)?;
    snapshot.draft=control.draft.clone();snapshot.draft_revision=control.draft_revision;snapshot.history=control.history.view();snapshot.dirty=control.dirty||control.draft.is_some();Ok(snapshot)
}
#[tauri::command]
pub fn alive_history(window:WebviewWindow,state:tauri::State<Desktop>,direction:Direction,generation:u64,draft_revision:u64)->Result<Snapshot,String> {
    main_only(window.label())?;let mut control=ui_lock(&state.0)?;
    let mut snapshot=control.snapshot(window.label())?;control.history(direction,generation,draft_revision)?;
    snapshot.draft=control.draft.clone();snapshot.draft_revision=control.draft_revision;snapshot.history=control.history.view();snapshot.dirty=control.dirty||control.draft.is_some();Ok(snapshot)
}
#[tauri::command]
pub fn alive_discard(window:WebviewWindow,state:tauri::State<Desktop>,generation:u64,draft_revision:u64)->Result<Snapshot,String> {
    main_only(window.label())?;let mut control=ui_lock(&state.0)?;control.version(generation,draft_revision)?;
    let mut snapshot=control.snapshot(window.label())?;control.clear_scope()?;snapshot.draft=None;snapshot.draft_revision=control.draft_revision;snapshot.history=control.history.view();snapshot.dirty=control.dirty;Ok(snapshot)
}
#[tauri::command]
pub fn alive_apply(window: WebviewWindow, state: tauri::State<Desktop>, generation: u64,draft_revision:u64) -> Result<Snapshot, String> {
    main_only(window.label())?;let mut control=ui_lock(&state.0)?;control.version(generation,draft_revision)?;
    control.apply_draft()?;close_stale_editors(window.app_handle(),control.generation);control.snapshot(window.label())
}
#[tauri::command]
pub fn alive_base(window: WebviewWindow, state: tauri::State<Desktop>, instance_id: String, key: String, value: f64, generation: u64) -> Result<(), String> {
    let mut control = ui_lock(&state.0)?;
    check_generation(control.generation, generation)?;
    control.authorize_instance(window.label(), &instance_id)?;
    control.host.base(&instance_id, &key, value)?; control.dirty = true; Ok(())
}
#[tauri::command]
pub fn alive_bypass(window: WebviewWindow, state: tauri::State<Desktop>, instance_id: String, bypassed: bool, generation: u64) -> Result<(), String> {
    let mut control = ui_lock(&state.0)?;
    check_generation(control.generation, generation)?;
    control.authorize_instance(window.label(), &instance_id)?;
    control.host.bypass(&instance_id, bypassed)?; control.dirty = true; Ok(())
}
#[tauri::command]
pub fn alive_mixer(window: WebviewWindow, state: tauri::State<Desktop>, track: usize, gain: f64, mute: bool, solo: bool, generation: u64) -> Result<(), String> {
    main_only(window.label())?;
    let mut control = ui_lock(&state.0)?;
    check_generation(control.generation, generation)?;
    control.host.mixer(track, gain, mute, solo)?; control.dirty = true; Ok(())
}
#[tauri::command]
pub fn alive_transport(window: WebviewWindow, state: tauri::State<Desktop>, action: String, beat: Option<f64>, generation: u64, preparation_revision:Option<String>) -> Result<serde_json::Value, String> {
    main_only(window.label())?;let mut control=ui_lock(&state.0)?;
    if action=="stop" {return Ok(serde_json::json!({"stopEpoch":unsafe{native::alive_session_stop_v3()}.to_string()}));}
    check_generation(control.generation,generation)?;
    let p=control.host.prepared.as_ref().ok_or("No session")?;
    if p.document.is_clips(){
        if runtime::decimal(preparation_revision.as_deref().ok_or("Prepared identity required")?)?!=control.host.preparation_revision{return Err("Prepared bank changed. Refresh transport controls".into());}
        let mut request=native::RequestV3::default();
        match action.as_str(){"start"=>{request.kind=native::V3_START;control.driver.start()?;},"seek"=>{let beat=beat.ok_or("Enter a seek beat")?;if !beat.is_finite()||beat<0.||beat>=p.document.length_beats{return Err("Seek beat must be within the transport region".into());}request.kind=native::V3_SEEK;request.position=(beat*48_000.*60./p.document.tempo).round() as u64;},_=>return Err("Unknown transport action".into())}
        let Control{host,runtime,..}=&mut *control;return serde_json::to_value(runtime.request(host,request,None,None)?).map_err(|e|e.to_string());
    }
    match action.as_str(){"start"=>{control.driver.start()?;if unsafe{native::alive_session_start()}==0{return Err(native::error());}},"seek"=>{let beat=beat.ok_or("Enter a seek beat")?;if !beat.is_finite()||beat<0.||beat>=p.document.length_beats{return Err("Seek beat must be within the prepared clip".into());}if unsafe{native::alive_session_seek((beat*48_000.*60./p.document.tempo).round() as u64)}==0{return Err(native::error());}},_=>return Err("Unknown transport action".into())}Ok(serde_json::Value::Null)
}
#[tauri::command]
pub fn alive_audio_devices(window: WebviewWindow, state: tauri::State<Desktop>, host: Option<String>) -> Result<crate::audio::Catalog, String> {
    main_only(window.label())?;
    let mut control = ui_lock(&state.0)?;
    let selected=host.unwrap_or_else(||control.driver.snapshot().config.host);
    control.driver.catalog(&selected)
}
#[tauri::command]
pub fn alive_audio_configure(window: WebviewWindow, state: tauri::State<Desktop>, config: crate::audio::Config, generation: u64) -> Result<(), String> {
    main_only(window.label())?;
    let mut control = ui_lock(&state.0)?;
    check_generation(control.generation, generation)?;
    control.stopped()?;
    control.driver.configure(config)
}
#[tauri::command]
pub fn alive_audio_diagnostics(window:WebviewWindow,state:tauri::State<Desktop>,after:String)->Result<serde_json::Value,String>{
    main_only(window.label())?;let cursor=runtime::decimal(&after)?;Ok(ui_lock(&state.0)?.driver.diagnostics(cursor))
}
#[tauri::command]
pub fn alive_audio(window: WebviewWindow, state: tauri::State<Desktop>, action: String, generation: u64) -> Result<(), String> {
    main_only(window.label())?;
    let mut control = ui_lock(&state.0)?;
    check_generation(control.generation, generation)?;
    match action.as_str() {
        "start" => control.driver.start(),
        "stop" => { unsafe { native::alive_session_stop(); } control.driver.stop() },
        _ => Err("Unknown audio action".into()),
    }
}
#[tauri::command]
pub async fn alive_editor(window: WebviewWindow, state: tauri::State<'_, Desktop>, instance_id: String, generation: u64) -> Result<(), String> {
    main_only(window.label())?;
    let mut control = ui_lock(&state.0)?;
    check_generation(control.generation, generation)?;
    let prepared = control.host.prepared.as_ref().ok_or("No session")?;
    let device = prepared.devices.iter().find(|d| d.instance_id == instance_id).ok_or("Unknown instance")?;
    let name = &prepared.document.tracks[device.track].name;
    let label = editor_label(generation, &instance_id);
    if let Some(editor) = window.app_handle().get_webview_window(&label) { editor.set_focus().map_err(|e| e.to_string())?; }
    else { let editor = tauri::WebviewWindowBuilder::new(window.app_handle(), label.clone(), tauri::WebviewUrl::App("alive-editor.html".into()))
        .title(format!("{name} - Ultra Hosted Editor")).inner_size(1100., 760.).min_inner_size(720., 500.)
        .build().map_err(|e| e.to_string())?;
        #[cfg(target_os = "linux")]
        install_editor_teardown(&editor).map_err(|e| e.to_string())?;
        #[cfg(not(target_os = "linux"))]
        let _ = editor;
    }
    control.editors.insert(label, EditorBinding { generation, instance_id });
    Ok(())
}
#[cfg(target_os = "linux")]
fn install_editor_teardown(editor: &WebviewWindow) -> tauri::Result<()> {
    use gtk::{glib::{self, subclass::SignalId, translate::IntoGlib}, prelude::*};
    editor.with_webview(|webview| {
        webview.inner().connect_destroy(|view| {
            let manager: glib::Object = view.property("user-content-manager");
            if let Some(signal) = SignalId::lookup("script-message-received", manager.type_()) {
                // Wry 0.53.5's IPC closure strongly captures its WebView. Break
                // that manager/view cycle only when the editor is destroyed.
                unsafe { glib::gobject_ffi::g_signal_handlers_disconnect_matched(
                    manager.as_ptr(), glib::gobject_ffi::G_SIGNAL_MATCH_ID,
                    signal.into_glib(), 0, std::ptr::null_mut(), std::ptr::null_mut(), std::ptr::null_mut()); }
            }
        });
    })
}
fn close_stale_editors(app: &tauri::AppHandle, generation: u64) {
    for (label, window) in app.webview_windows() {
        if label.starts_with("alive-editor-") && !label.starts_with(&format!("alive-editor-{generation}-")) { let _ = window.close(); }
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
    if chosen(result.clone(), "Apply edits", true) { control.apply_draft()?; close_stale_editors(window.app_handle(),control.generation); Ok(true) }
    else if chosen(result, "Discard edits", false) { control.clear_scope()?; Ok(true) } else { Ok(false) }
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
    ensure_counter(control.draft_revision)?;
    control.host.validate(&prepare(&prepared.document,&prepared.origin)?)?;
    let (path,document) = persistence::save_document(&path, &prepared.document, &prepared.origin)?;
    let current = control.host.prepared.as_mut().unwrap();
    if current.origin != path || current.document != document {control.draft_revision+=1;}
    let current=control.host.prepared.as_mut().unwrap();
    current.document = document; current.origin = path.clone();
    if current.document.is_clips(){current.notice=None;}
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
fn example_path(resources: &Path, executable_dir: &Path, source: &Path) -> PathBuf {
    let relative = "alive-session/alive/examples/two-instruments.alive";
    let bundled = resources.join(relative);
    if bundled.is_file() { return bundled; }
    // Linux's combined Ultra installer places both binaries beside shared resources.
    let companion = executable_dir.join("../lib/Ultra Research").join(relative);
    if companion.is_file() { return companion; }
    source.join("../../alive/examples/two-instruments.alive")
}
fn example(app: &tauri::AppHandle) -> Result<PreparedSession, String> {
    let resources = app.path().resource_dir().map_err(|e| e.to_string())?;
    let executable = std::env::current_exe().map_err(|e| e.to_string())?;
    let path = example_path(&resources, executable.parent().ok_or("Missing executable directory")?, Path::new(env!("CARGO_MANIFEST_DIR")));
    read(&path)
}
#[tauri::command]
pub async fn alive_file(window: WebviewWindow, action: String, path: Option<PathBuf>, generation:u64,draft_revision:u64) -> Result<Option<Snapshot>, String> {
    main_only(window.label())?;
    tauri::async_runtime::spawn_blocking(move || {
        let state = window.state::<Desktop>();
        let mut control = ui_lock(&state.0)?;
        control.version(generation,draft_revision)?;
        control.closing = false;
        // Resolve prospective dependencies before any dirty-state decision or native replacement.
        let prospective = match action.as_str() {
            "new" => { let prepared = control.host.enable_clips(example(window.app_handle())?)?; Some(prepared) },
            "open" => {
                let path = match path.clone() { Some(path) => path, None => {
                    let Some(path) = window.dialog().file().set_parent(&window).set_title("Open Alive Session").add_filter("Alive session", &["alive", "json"]).blocking_pick_file() else { return Ok(None); };
                    path.into_path().map_err(|e| e.to_string())?
                }};
                let prepared = control.host.enable_clips(read(&path)?)?; Some(prepared)
            }
            "save" | "saveAs" | "quit" => None,
            _ => return Err("Unknown session action".into()),
        };
        if matches!(action.as_str(),"new"|"open"){control.driver.reject_retiring()?;}
        if !resolve_draft(&window, &mut control)? { return Ok(None); }
        match action.as_str() {
            "save" | "saveAs" => { if !save_current(&window, &mut control, action == "saveAs", path)? { return Ok(None); } }
            "new" | "open" => {
                if !resolve_dirty(&window, &mut control)? { return Ok(None); }
                let prepared = prospective.unwrap();
                let origin = prepared.origin.clone(); control.install(prepared)?;
                control.saved_path = if action == "open" { Some(origin) } else { None };
                control.dirty = action == "new" || control.host.prepared.as_ref().is_some_and(|p|p.notice.as_deref()==Some("Upgraded in memory; Save writes session v3"));
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
fn capture_device(path: &Path, document: &Session) -> Result<DeviceInstance, String> {
    use sha2::{Digest, Sha256};
    use std::sync::atomic::{AtomicU64, Ordering};
    static NEXT: AtomicU64 = AtomicU64::new(1);
    let loaded = crate::documents::read_patch(path)?;
    let patch = loaded.patch.ok_or("Choose a saved Ultra device")?;
    let graph = crate::canvas::prepare(patch.clone())?.native;
    let manifest = crate::canvas::device::host_manifest(&patch, &graph)?;
    let instance_id = loop {
        let seed = format!("{}-{:?}-{}", std::process::id(), std::time::SystemTime::now(), NEXT.fetch_add(1, Ordering::Relaxed));
        let hex = format!("{:x}", Sha256::digest(seed.as_bytes()));
        let id = format!("{}-{}-4{}-a{}-{}", &hex[..8], &hex[8..12], &hex[13..16], &hex[17..20], &hex[20..32]);
        if !document.tracks.iter().flat_map(Track::devices).any(|d| d.instance_id == id) { break id; }
    };
    Ok(DeviceInstance { instance_id, source_sha256: prepare::fingerprint(&patch)?, bypassed: false,
        path: loaded.path.to_str().ok_or("Device path must be UTF-8")?.into(), id: manifest.id, version: manifest.version, parameters: Default::default() })
}
fn change_device(document: &mut Session, track_id: &str, action: &str, instance_id: Option<&str>, before: Option<&str>, reference: Option<DeviceInstance>) -> Result<(), String> {
    let track = document.tracks.iter().position(|t| t.id == track_id);
    if track.is_none() {
        if action != "load" || document.tracks.len() >= 2 { return Err("Unknown track or two-track capacity reached".into()); }
        let name = format!("Track {}", document.tracks.len() + 1);
        document.tracks.push(Track { id: track_id.into(), name, device: reference.ok_or("Choose a device")?, effects: vec![], notes: vec![], automation: vec![], gain: 0.7, mute: false, solo: false });
        if let Document::ClipsV3(s)=document{s.banks.push(ClipBank{track_id:track_id.into(),slots:[None,None,None,None],default_clip_id:None});}
        return Ok(());
    }
    if document.is_clips() && matches!(action,"remove"|"replace"|"load") {
        let t=&document.tracks[track.unwrap()];let old_id=instance_id.unwrap_or(&t.device.instance_id).to_owned();
        if let Some(bank)=document.bank_mut(track_id){for c in bank.slots.iter_mut().flatten(){c.automation.retain(|l|l.instance_id!=old_id);}}
    }
    let index = track.unwrap();
    let track = &mut document.tracks[index];
    let id = instance_id.unwrap_or(&track.device.instance_id).to_owned();
    let effect = track.effects.iter().position(|d| d.instance_id == id);
    match action {
        "remove" if id == track.device.instance_id => {
            if document.tracks.len() == 1 { return Err("Keep at least one instrument track; replace its device or create a new session".into()); }
            document.tracks.remove(index);
            if let Document::ClipsV3(s)=document{s.banks.retain(|b|b.track_id!=track_id);}
        }
        "remove" => {
            track.effects.remove(effect.ok_or("Unknown instance")?);
            track.automation.retain(|lane| lane.instance_id != id);
        }
        "reorder" => {
            if before == Some(id.as_str()) && effect.is_some() { return Ok(()); }
            let effect = track.effects.remove(effect.ok_or("Only effects can be reordered")?);
            let position = match before { Some(id) => track.effects.iter().position(|d| d.instance_id == id).ok_or("Unknown destination instance")?, None => track.effects.len() };
            track.effects.insert(position, effect);
        }
        "add" => {
            if track.effects.len() >= 2 { return Err("At most two effects per track".into()); }
            let position = match before { Some(id) => track.effects.iter().position(|d| d.instance_id == id).ok_or("Unknown destination instance")?, None => track.effects.len() };
            track.effects.insert(position, reference.ok_or("Choose an effect")?);
        }
        "load" | "replace" => {
            let reference = reference.ok_or("Choose a device")?;
            if id == track.device.instance_id { track.device = reference; }
            else { track.effects[effect.ok_or("Unknown instance")?] = reference; }
            track.automation.retain(|lane| lane.instance_id != id);
        }
        _ => return Err("Unknown device action".into()),
    }
    Ok(())
}
#[tauri::command]
pub async fn alive_device(window: WebviewWindow, track_id: String, action: String, generation: u64, draft_revision:u64, instance_id: Option<String>, before_instance_id: Option<String>, path: Option<PathBuf>) -> Result<Snapshot, String> {
    main_only(window.label())?;
    tauri::async_runtime::spawn_blocking(move || {
        let state = window.state::<Desktop>();
        let mut control = ui_lock(&state.0)?;
        control.version(generation,draft_revision)?; control.stopped()?;
        if control.draft.is_some() { return Err("Apply or discard pending schedule edits before changing devices".into()); }
        let current = control.host.prepared.as_ref().ok_or("No session")?;
        let mut document = current.document.clone();
        let reference = if matches!(action.as_str(), "load" | "replace" | "add") {
            let path = match path { Some(path) => path, None => {
                let Some(path) = window.dialog().file().set_parent(&window).set_title("Load Ultra Device").add_filter("Ultra device", &["ultra"]).blocking_pick_file() else { return control.snapshot(window.label()); };
                path.into_path().map_err(|e| e.to_string())?
            }};
            Some(capture_device(&path, &document)?)
        } else { None };
        change_device(&mut document, &track_id, &action, instance_id.as_deref(), before_instance_id.as_deref(), reference)?;
        prepare::check_sources(&document,&current.origin,Some(&current.document))?;
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
pub fn run(mut context: tauri::Context<tauri::Wry>, path: Option<PathBuf>) {
    // Also give the legacy `ultra --alive` launch its own data directory/identity.
    context.config_mut().identifier = "org.alive.session".into();
    context.config_mut().product_name = Some("Alive".into());
    context.config_mut().app.windows.clear();
    tauri::Builder::default().plugin(tauri_plugin_dialog::init())
        .setup(move |app| {
            let prepared = match path.as_ref() { Some(path) => read(path), None => example(app.handle()) }
                .map_err(std::io::Error::other)?;
            let saved_path = path.as_ref().map(|_| prepared.origin.clone());
            let mut host = Host::default(); let prepared=host.enable_clips(prepared).map_err(std::io::Error::other)?;let upgraded=prepared.notice.as_deref()==Some("Upgraded in memory; Save writes session v3");host.install(prepared).map_err(std::io::Error::other)?;
            app.manage(Desktop(Mutex::new(Control { host, runtime:runtime::Runtime::default(),snapshot_sequence:0, driver: crate::audio::Driver::load(app.path().app_data_dir()?.join("audio-settings.json")), generation: 1,
                dirty: upgraded, saved_path, draft: None, draft_revision:0,history:History::default(), closing: false, allow_exit: false, editors: BTreeMap::new() })));
            tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::App("alive.html".into()))
                .title("Alive").inner_size(1200., 800.).min_inner_size(900., 660.).build()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![alive_current, alive_clip_edit, alive_clip_action, alive_enable_clips, alive_edit, alive_history, alive_discard, alive_apply, alive_base, alive_bypass, alive_mixer, alive_transport, alive_audio_devices, alive_audio_configure, alive_audio_diagnostics, alive_audio, alive_editor, alive_file, alive_device])
        .on_window_event(|window,event| { if window.label() == "main" { if let tauri::WindowEvent::CloseRequested { api, .. } = event { api.prevent_close(); request_close(window.app_handle()); } } })
        .build(context).expect("Unable to start Alive")
        .run(|app,event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                let allowed = app.state::<Desktop>().0.try_lock().map(|c| c.allow_exit).unwrap_or(false);
                if !allowed { api.prevent_exit(); request_close(app); }
            }
            tauri::RunEvent::Exit => {
                if let Ok(mut control) = app.state::<Desktop>().0.lock() {
                    control.driver.authorized_exit();
                    unsafe { native::alive_session_stop(); native::alive_session_reset(); for slot in 0..16 { crate::ultra_canvas_close_document(slot); } }
                }
            }
            _ => {},
        });
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn alive_companion_loads_the_installed_shared_example_without_source_tree() {
        let unique = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos();
        let root = std::env::temp_dir().join(format!("alive-companion-{}-{unique}", std::process::id()));
        let resource = root.join("usr/lib/Ultra Research/alive-session");
        let session = resource.join("alive/examples/two-instruments.alive");
        let device = resource.join("ultra/examples/subtractive.ultra");
        std::fs::create_dir_all(root.join("usr/bin")).unwrap();
        std::fs::create_dir_all(session.parent().unwrap()).unwrap();
        std::fs::create_dir_all(device.parent().unwrap()).unwrap();
        std::fs::copy(Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive"), &session).unwrap();
        std::fs::copy(Path::new(env!("CARGO_MANIFEST_DIR")).join("../examples/subtractive.ultra"), &device).unwrap();
        let path = example_path(&root.join("usr/lib/Alive"), &root.join("usr/bin"), &root.join("missing-source"));
        let result = read(&path);
        std::fs::remove_dir_all(&root).unwrap();
        let prepared = result.expect("Installed Alive must load the shared bundled session, without repository paths");
        assert_eq!(prepared.tracks.len(), 2);
    }
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
        let live = read(&Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive")).unwrap().document;
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
        let mut live = read(&Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive")).unwrap().document;
        let mut draft = live.clone(); draft.tracks[0].notes[0].pitch = 61;
        live.tracks[0].device.parameters.insert("cutoff".into(), 1234.); live.tracks[0].gain = 0.4;
        merge_live(&mut draft, &live);
        assert_eq!(draft.tracks[0].notes[0].pitch, 61); assert_eq!(draft.tracks[0].device.parameters["cutoff"], 1234.); assert_eq!(draft.tracks[0].gain, 0.4);
    }
    fn chain() -> Session {
        let mut session = read(&Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive")).unwrap().document;
        for id in ["effect-a", "effect-b"] {
            let mut d = session.tracks[0].device.clone(); d.instance_id = id.into();
            session.tracks[0].effects.push(d);
            session.tracks[0].automation.push(Lane { instance_id: id.into(), key:"cutoff".into(), enabled:true, points:vec![] });
        }
        session
    }
    #[test]
    fn canonical_musical_drafts_cannot_change_format_identity_fingerprint_or_effect_order() {
        let live = chain();
        for mutate in [
            |s: &mut Session| s.format = "alive-session-v1".into(),
            |s: &mut Session| s.tracks[0].effects.reverse(),
            |s: &mut Session| s.tracks[0].effects[0].instance_id = "substitute".into(),
            |s: &mut Session| s.tracks[0].effects[0].source_sha256 = "0".repeat(64),
            |s: &mut Session| s.tracks[0].effects[0].version = 2,
        ] {
            let mut draft=live.clone(); mutate(&mut draft);
            assert!(musical_draft(draft,&live).is_err());
        }
    }
    #[test]
    fn structural_reorder_and_removal_keep_unrelated_instance_automation() {
        let mut session=chain();let track_id=session.tracks[0].id.clone();
        let lanes=session.tracks[0].automation.clone();
        change_device(&mut session,&track_id,"reorder",Some("effect-a"),Some("effect-a"),None).unwrap();
        change_device(&mut session,&track_id,"reorder",Some("effect-b"),Some("effect-a"),None).unwrap();
        assert_eq!(session.tracks[0].effects[0].instance_id,"effect-b");
        assert_eq!(session.tracks[0].automation,lanes);
        change_device(&mut session,&track_id,"remove",Some("effect-a"),None,None).unwrap();
        assert_eq!(session.tracks[0].effects.len(),1);
        assert_eq!(session.tracks[0].automation,lanes.into_iter().filter(|l| l.instance_id!="effect-a").collect::<Vec<_>>());
    }
    #[test]
    fn actual_registered_window_binding_authenticates_instance_and_generation() {
        let mut control=Control { host:Host::default(),runtime:runtime::Runtime::default(),snapshot_sequence:0, driver:crate::audio::Driver::load(PathBuf::from("/nonexistent/alive-test.json")), generation:7,
            dirty:false,saved_path:None,draft:None,draft_revision:0,history:History::default(),closing:false,allow_exit:false,editors:BTreeMap::new() };
        let label=editor_label(7,"effect-a");
        assert!(control.authorize_instance(&label,"effect-a").is_err());
        control.editors.insert(label.clone(),EditorBinding {generation:7,instance_id:"effect-a".into()});
        assert!(control.authorize_instance(&label,"effect-a").is_ok());
        assert!(control.authorize_instance(&label,"effect-b").is_err());
        assert!(control.authorize_instance("alive-editor-7-0","effect-a").is_err());
        control.generation=8;
        assert!(control.authorize_instance(&label,"effect-a").is_err());
        assert!(control.authorize_instance("main","effect-b").is_ok());
    }

    #[test]
    fn removing_an_instrument_removes_its_whole_track_and_preserves_the_other_chain() {
        let mut document=chain();
        let track=document.tracks[0].id.clone();
        let instance=document.tracks[0].device.instance_id.clone();
        let other=document.tracks[1].clone();
        change_device(&mut document,&track,"remove",Some(&instance),None,None).unwrap();
        assert_eq!(document.tracks,vec![other]);
    }
    #[test]
    fn explicit_load_captures_fresh_identity_and_original_source_before_bases() {
        let document=chain();
        let path=Path::new(env!("CARGO_MANIFEST_DIR")).join("../examples/utility.ultra");
        let first=capture_device(&path,&document).unwrap();
        let second=capture_device(&path,&document).unwrap();
        assert_ne!(first.instance_id,second.instance_id);
        assert_eq!(first.instance_id.len(),36);
        assert_eq!(first.source_sha256,second.source_sha256);
        assert_eq!(first.id,second.id);
        assert!(first.parameters.is_empty());
        assert!(!first.bypassed);
    }

    fn musical_control()->Control {
        let prepared=read(&Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive")).unwrap();
        let mut host=Host::default();host.prepared=Some(prepared);
        Control {host,runtime:runtime::Runtime::default(),snapshot_sequence:0,driver:crate::audio::Driver::load(PathBuf::from("/nonexistent/alive-test.json")),generation:7,
            dirty:false,saved_path:None,draft:None,draft_revision:0,history:History::default(),closing:false,allow_exit:false,editors:BTreeMap::new()}
    }
    #[test]
    fn focused_clips_duplicate_scores_and_history_retains_ids_without_changing_devices() {
        let mut c=musical_control();let p=c.host.prepared.as_ref().unwrap();c.host.prepared=Some(prepare(&p.document.to_clips().unwrap(),&p.origin).unwrap());
        let track=c.host.prepared.as_ref().unwrap().document.tracks[0].id.clone();
        let original=c.host.prepared.as_ref().unwrap().document.bank(&track).unwrap().slots[0].clone().unwrap();
        let affected=c.clip_edit(clips::Edit::Duplicate{track_id:track.clone(),clip_id:original.id.clone(),destination_slot:1},7,0).unwrap();
        let copied=c.draft.as_ref().unwrap().bank(&track).unwrap().slots[1].clone().unwrap();
        assert_eq!(affected.clip_id,Some(copied.id.clone()));assert_ne!(copied.id,original.id);assert_ne!(copied.notes[0].id,original.notes[0].id);
        assert_eq!(copied.automation,original.automation);
        c.history(Direction::Undo,7,1).unwrap();assert!(c.draft.is_none());
        c.history(Direction::Redo,7,2).unwrap();assert_eq!(c.draft.as_ref().unwrap().bank(&track).unwrap().slots[1],Some(copied.clone()));
        let before=c.draft.clone();assert!(c.clip_edit(clips::Edit::Length{track_id:track.clone(),clip_id:copied.id,length_beats:0.25},7,3).is_err());assert_eq!(before,c.draft);
        let mut forged=c.draft.clone().unwrap();forged.bank_mut(&track).unwrap().slots[0].as_mut().unwrap().notes[0].id="forged".into();
        assert!(c.edit(forged,"Forged",7,3).is_err());assert_eq!(before,c.draft);
    }
    #[test]
    fn shared_changed_source_blocks_either_selected_replace_until_original_is_restored(){
        let mut c=musical_control();let current=c.host.prepared.as_ref().unwrap();let mut document=current.document.clone();
        let root=std::env::temp_dir().join(format!("alive-shared-source-{}",std::process::id()));std::fs::create_dir_all(&root).unwrap();
        let path=root.join("shared.ultra");let original=std::fs::read(&current.devices[0].path).unwrap();std::fs::write(&path,&original).unwrap();
        for t in &mut document.tracks{t.device.path=path.to_string_lossy().into_owned();}
        c.host.prepared=Some(prepare(&document,&current.origin).unwrap());
        let mut patch:serde_json::Value=serde_json::from_slice(&original).unwrap();patch["nodes"][0]["x"]=serde_json::json!(987);std::fs::write(&path,serde_json::to_vec(&patch).unwrap()).unwrap();
        let before=c.host.prepared.as_ref().unwrap().document.clone();
        for i in 0..2 {let mut candidate=before.clone();let id=candidate.tracks[i].id.clone();let replacement=capture_device(&path,&candidate).unwrap();change_device(&mut candidate,&id,"replace",None,None,Some(replacement)).unwrap();
            let error=prepare::check_sources(&candidate,&root.join("session.alive"),Some(&before)).unwrap_err();assert!(error.contains(&before.tracks[1-i].device.instance_id),"{error}");assert!(error.contains("matching original backup"),"{error}");assert!(error.contains("preserve the changed"),"{error}");}
        assert_eq!(c.host.prepared.as_ref().unwrap().document,before);assert!(!c.history.view().can_undo);
        let changed=root.join("changed.ultra");std::fs::copy(&path,&changed).unwrap();std::fs::write(&path,original).unwrap();
        let mut recovered=before.clone();for i in 0..2{let id=recovered.tracks[i].id.clone();let reference=capture_device(&changed,&recovered).unwrap();change_device(&mut recovered,&id,"replace",None,None,Some(reference)).unwrap();prepare(&recovered,&root.join("session.alive")).unwrap();}
        std::fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn delayed_retirement_preserves_draft_history_generation_and_prepared_roots(){
        let _native_guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
        let mut control=musical_control();let mut draft=control.host.prepared.as_ref().unwrap().document.clone();draft.tracks[0].notes[0].pitch=61;
        control.edit(draft,"Change pitch",7,0).unwrap();let document=control.draft.clone();let history=serde_json::to_value(control.history.view()).unwrap();let prepared=control.host.prepared.as_ref().unwrap().document.clone();
        let owner=crate::audio::tests::hold_retiring(&mut control.driver);
        assert!(control.apply_draft().unwrap_err().starts_with("retirement_pending"));
        assert_eq!(control.draft,document);assert_eq!(serde_json::to_value(control.history.view()).unwrap(),history);assert_eq!(control.generation,7);assert_eq!(control.draft_revision,1);assert_eq!(control.host.prepared.as_ref().unwrap().document,prepared);
        unsafe{native::alive_session_stop_v3();} // scoped Stop remains available.
        drop(owner);control.driver.stop().unwrap();
    }
    #[test]
    fn pending_history_versions_noops_baseline_redo_and_live_merge() {
        let mut c=musical_control();let original=c.host.prepared.as_ref().unwrap().document.clone();let mut edited=original.clone();edited.tempo=130.;
        c.edit(edited.clone(),"Tempo",7,0).unwrap();assert_eq!(c.draft_revision,1);
        assert!(c.edit(original.clone(),"Stale",7,0).is_err());assert!(c.edit(original.clone(),"Generation",6,1).is_err());
        assert_eq!(c.draft.as_ref().unwrap().tempo,130.);c.edit(edited.clone(),"Same",7,1).unwrap();assert_eq!(c.draft_revision,1);
        {let live=&mut c.host.prepared.as_mut().unwrap().document;live.tracks[0].gain=0.4;live.tracks[0].device.parameters.insert("cutoff".into(),2345.);}
        c.dirty=true;c.history(Direction::Undo,7,1).unwrap();assert!(c.draft.is_none());assert!(c.dirty);assert!(c.history.view().can_redo);
        c.history(Direction::Redo,7,2).unwrap();let d=c.draft.as_ref().unwrap();assert_eq!(d.tempo,130.);assert_eq!(d.tracks[0].gain,0.4);assert_eq!(d.tracks[0].device.parameters["cutoff"],2345.);
        assert_eq!(c.generation,7);assert!(c.history(Direction::Redo,7,3).is_err());assert_eq!(c.draft_revision,3);
        c.clear_scope().unwrap();assert!(!c.history.view().can_undo);assert!(!c.history.view().can_redo);assert_eq!(c.draft_revision,4);
    }
    #[test]
    fn edit_admission_rejects_ranges_targets_rounded_overlap_and_truncation_atomically() {
        let mut c=musical_control();let original=c.host.prepared.as_ref().unwrap().document.clone();
        for mutate in [
            |s:&mut Session|s.tempo=0.,
            |s:&mut Session|s.length_beats=0.5,
            |s:&mut Session|s.tracks[0].notes[0].velocity=0,
            |s:&mut Session|s.tracks[0].notes[0].duration=1e-10,
            |s:&mut Session|{s.length_beats=0.5;for t in &mut s.tracks {t.notes.clear();for l in &mut t.automation {l.enabled=false;}}},
            |s:&mut Session|s.tracks[0].automation[0].key="unknown".into(),
            |s:&mut Session|s.tracks[0].notes[0].pitch=128,
            |s:&mut Session|s.tracks[0].automation[0].instance_id=s.tracks[1].device.instance_id.clone(),
            |s:&mut Session|s.tracks[0].automation[0].points[0].value=-1.,
            |s:&mut Session|{s.tracks[0].notes=vec![Note{beat:0.,duration:0.00003,pitch:60,velocity:100},Note{beat:0.00001,duration:0.1,pitch:60,velocity:100}];},
        ] {let mut bad=original.clone();mutate(&mut bad);assert!(c.edit(bad,"Invalid",7,0).is_err());assert!(c.draft.is_none());assert_eq!(c.draft_revision,0);assert!(!c.history.view().can_undo);}
    }
    #[test]
    fn failed_apply_source_and_native_density_preserve_retained_history() {
        let mut c=musical_control();let mut edited=c.host.prepared.as_ref().unwrap().document.clone();edited.tempo=130.;
        c.edit(edited.clone(),"Tempo",7,0).unwrap();
        let origin=c.host.prepared.as_ref().unwrap().origin.clone();c.host.prepared.as_mut().unwrap().origin=PathBuf::from("/nonexistent/session.alive");
        assert!(c.apply_draft().is_err());assert_eq!(c.draft_revision,1);assert!(c.history.view().can_undo);assert_eq!(c.draft.as_ref().unwrap(),&edited);
        c.host.prepared.as_mut().unwrap().origin=origin;
        edited.tracks[0].notes=(0..128).map(|pitch|Note{beat:0.,duration:0.25,pitch,velocity:100}).collect();
        c.edit(edited,"Dense",7,1).unwrap();assert!(c.apply_draft().unwrap_err().contains("overload"));assert_eq!(c.draft_revision,2);assert!(c.history.view().can_undo);
    }

    #[test]
    fn undo_redo_merge_same_source_effect_bases_bypass_and_mixer_by_identity() {
        let mut c=musical_control();let current=c.host.prepared.as_ref().unwrap();let mut document=current.document.clone();
        let path=Path::new(env!("CARGO_MANIFEST_DIR")).join("../examples/utility.ultra");
        for _ in 0..2 {let d=capture_device(&path,&document).unwrap();document.tracks[0].effects.push(d);}
        c.host.prepared=Some(prepare(&document,&current.origin).unwrap());let mut edited=c.host.prepared.as_ref().unwrap().document.clone();edited.tempo=130.;
        c.edit(edited,"Tempo",7,0).unwrap();
        {let t=&mut c.host.prepared.as_mut().unwrap().document.tracks[0];t.effects[0].parameters.insert("gain".into(),0.3);t.effects[1].parameters.insert("gain".into(),0.8);t.effects[1].bypassed=true;t.gain=0.6;t.solo=true;}
        c.history(Direction::Undo,7,1).unwrap();c.history(Direction::Redo,7,2).unwrap();let t=&c.draft.as_ref().unwrap().tracks[0];
        assert_eq!(t.effects[0].parameters["gain"],0.3);assert_eq!(t.effects[1].parameters["gain"],0.8);assert!(!t.effects[0].bypassed);assert!(t.effects[1].bypassed);assert_eq!(t.gain,0.6);assert!(t.solo);
    }

}
