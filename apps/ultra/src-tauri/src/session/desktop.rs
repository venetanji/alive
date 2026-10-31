//! Alive's single serialized control owner. Editor windows never own native slots.
use super::{host::Host, native, *};
use serde::Serialize;
use super::history::{History, Direction, Projection};
use std::{path::{Path, PathBuf}, sync::{Mutex, MutexGuard}, collections::BTreeMap};
use tauri::{Emitter, Manager, WebviewWindow};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogResult};
mod publication;
#[cfg(test)]
mod device_transactions;

fn trace_commands() -> bool { std::env::var_os("ALIVE_TRACE_COMMANDS").as_deref() == Some(std::ffi::OsStr::new("1")) }

struct Control {
    host: Host,
    runtime: runtime::Runtime,
    snapshot_sequence: u64,
    accepted_serial: u64,
    driver: crate::audio::Driver,
    generation: u64,
    dirty: bool,
    saved_path: Option<PathBuf>,
    save_feedback: Option<String>,
    edit_revision: u64,
    history: History,
    publication_pending: Option<publication::Pending>,
    closing: bool,
    allow_exit: bool,
    editors: BTreeMap<String, EditorBinding>,
}
#[derive(Clone)]
struct EditorBinding { generation: u64, instance_id: String }
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DeviceView { index: usize, track: usize, path: PathBuf, manifest: crate::canvas::device::HostManifest }
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Capabilities { midi_edit:bool,midi_preview:bool,midi_unavailable_reason:Option<String>,launch_quantization: bool, launch_unavailable_reason:Option<String>, launch_window_frames:u32, max_tracks: usize, max_devices: usize, slots_per_track: usize, max_clips: usize, atomic_track_actions: bool,workspaces:bool,arrangement:bool,audio_sources:bool,max_sources:usize,max_placements:usize, }
pub struct Desktop(Mutex<Control>);
fn ui_lock<T>(mutex: &Mutex<T>) -> Result<MutexGuard<'_, T>, String> {
    mutex.try_lock().map_err(|_| "Finish the current session dialog before using this control".into())
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    document: Session,
    master: MasterSnapshot,
    midi: serde_json::Value,
    launch: launch::LaunchSettings,
    path: Option<PathBuf>,
    generation: u64,
    dirty: bool,
    edit_revision: u64,
    history: super::history::View,
    state: serde_json::Value,
    capabilities: Capabilities,
    notice: Option<String>,
    preparation_revision: String,
    snapshot_sequence: String,
    track_chains: Vec<serde_json::Value>,
    prepared_workspaces: serde_json::Value,
    runtime: serde_json::Value,
    device_instances: BTreeMap<String, DeviceView>,
    instance_id: Option<String>,
    device_index: Option<usize>,
    audio: crate::audio::Snapshot,
    patch: Option<serde_json::Value>,
    track: Option<usize>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MasterSnapshot {
    gain: f64,
    accepted_serial: String,
    available: bool,
    unavailable_reason: Option<&'static str>,
    observation: Option<serde_json::Value>,
    observation_stale: bool,
}
#[derive(Debug,Serialize)]
pub struct MasterError { code:&'static str, message:String }
#[derive(Debug,Serialize)]
#[serde(rename_all="camelCase")]
pub struct MasterReceipt { generation:u64, accepted_gain:f64, accepted_serial:String, changed:bool }
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct MasterResetReceipt { generation:u64, accepted_serial:String }
fn master_error(code:&'static str,message:impl Into<String>)->MasterError{MasterError{code,message:message.into()}}
fn master_native_error(code:i32)->MasterError {match code {
    -2=>master_error("FULL","Native command queue is full; retry."),-3=>master_error("BUSY","Native state is busy; retry."),
    -1=>master_error("UNSUPPORTED","Native Master support is unavailable; upgrade or reinstall."),-4=>master_error("UNCONFIGURED","Open a session first."),
    -5=>master_error("EXHAUSTED","Master serial exhausted."),0=>master_error("INVALID","Invalid Master request."),_=>master_error("INTERNAL","Native Master request failed.")
}}
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
fn merge_live(candidate: &mut Session, live: &Session) {
    for current in live.tracks() {
        if candidate.tracks().iter().any(|t| t.id()==current.id()) {
            for device in current.devices() {
                if let Ok(reference)=candidate.device_mut(&device.instance_id) {reference.parameters=device.parameters.clone();reference.bypassed=device.bypassed;}
            }
            let (gain,mute,solo)=current.mixer();let _=candidate.set_mixer(current.id(),gain,mute,solo);
        }
    }
}


impl Control {
    fn current_launch(&self)->launch::LaunchSettings {
        self.host.prepared.as_ref().unwrap().saved.launch.clone()
    }

    fn launch_settings(&mut self,label:&str,generation:u64,preparation_revision:&str,revision:u64,edit:launch::Edit)->Result<(),String> {
        main_only(label)?;self.version(generation,revision)?;
        if runtime::decimal(preparation_revision)?!=self.host.preparation_revision {return Err("Prepared launch scope changed; refresh before editing".into());}
        let prepared=self.host.prepared.as_ref().ok_or("No session")?;
        let document=&prepared.saved.score.clone();
        let before=self.current_launch();let mut after=before.clone();
        super::native_launch::require_scope(self.host.preparation_revision)?;
        // One Bar needs less bounded launch work than the finer intervals.
        let supported=match &edit {
            launch::Edit::Global{quantization}=>*quantization==launch::Quantization::Bar1,
            launch::Edit::Clip{quantization,..}=>*quantization==launch::ClipQuantization::Bar1 || (*quantization==launch::ClipQuantization::Global && before.global_quantization==launch::Quantization::Bar1),
        };
        if !supported {super::native_launch::require(self.host.preparation_revision)?;}
        after.edit(&document,edit)?;
        let mut candidate=prepared.saved.with_score(document.clone());candidate.launch=after.clone();
        super::persistence::serialize_saved(&candidate)?;
        if self.history.record_with_launch(&document,&document,&before,&after,"Launch quantization")? {
            self.host.prepared.as_mut().unwrap().saved.launch=after;self.dirty=true;self.edit_revision+=1;
        }
        Ok(())
    }
    fn master_auth(&mut self,label:&str,generation:u64)->Result<&'static super::native_master::Capability,MasterError>{
        if label!="main"{return Err(master_error("INVALID","This action belongs to the Alive session window."));}
        if generation>9007199254740991{return Err(master_error("INVALID","Invalid desktop generation."));}
        if self.generation!=generation{return Err(master_error("STALE_GENERATION","Session changed; refresh and retry."));}
        let capability=native::master_capability().ok_or_else(||master_error("UNSUPPORTED","Native Master support is unavailable; upgrade or reinstall."))?;
        if self.host.prepared.is_none(){return Err(master_error("UNCONFIGURED","Open a session first."));}
        self.driver.reject_retiring().map_err(|message|master_error("BUSY",message))?;
        Ok(capability)
    }
    fn master_gain(&mut self,label:&str,generation:u64,gain:f64)->Result<MasterReceipt,MasterError>{
        if !gain.is_finite()||!(0. ..=4.).contains(&gain){return Err(master_error("INVALID","Master gain must be finite and between 0 and 4."));}
        let capability=self.master_auth(label,generation)?;
        let prepared=self.host.prepared.as_mut().unwrap();
        if gain==prepared.saved.master.gain{return Ok(MasterReceipt{generation,accepted_gain:gain,accepted_serial:self.accepted_serial.to_string(),changed:false});}
        let serial=super::native_master::next_serial().ok_or_else(||master_error("EXHAUSTED","Master serial exhausted."))?;
        let result=unsafe{(capability.set)(1,gain,serial)};if result!=1{return Err(master_native_error(result));}
        prepared.saved.master.gain=gain;self.dirty=true;self.accepted_serial=serial;
        Ok(MasterReceipt{generation,accepted_gain:gain,accepted_serial:serial.to_string(),changed:true})
    }
    fn master_reset(&mut self,label:&str,generation:u64)->Result<MasterResetReceipt,MasterError>{
        let capability=self.master_auth(label,generation)?;
        let serial=super::native_master::next_serial().ok_or_else(||master_error("EXHAUSTED","Master serial exhausted."))?;
        let result=unsafe{(capability.reset)(1,serial)};if result!=1{return Err(master_native_error(result));}
        self.accepted_serial=serial;Ok(MasterResetReceipt{generation,accepted_serial:serial.to_string()})
    }
    fn workspace_edit(&mut self,label:&str,operation:workspaces::WorkspaceEditV4,generation:u64,revision:u64)->Result<workspace_edits::Affected,String>{
        main_only(label)?;self.version(generation,revision)?;
        let prepared=self.host.prepared.as_ref().ok_or("No session")?;
        let before=&prepared.saved.score.clone();
        let project=&before;
        let mut reserved=self.history.identities();
        reserved.extend(prepared.saved.score.identities());
        let before_launch=self.current_launch();let mut after_launch=before_launch.clone();
        let copied=match &operation {workspaces::WorkspaceEditV4::SlotDuplicate{slot_id,..}=>Some(slot_id.clone()),_=>None};
        let edited=workspaces::apply_edit(project,operation.clone(),&reserved)?;
        let affected=workspace_edits::primary(project,&edited.project,&operation)?;
        let mut document=edited.project;
        merge_live(&mut document,&prepared.saved.score);
        if let (Some(from),Some(to))=(copied.as_deref(),affected.slot_id.as_deref()){after_launch.copy_override(from,to);}
        after_launch.retain_owned(&document);after_launch.validate(&document)?;
        let mut history=self.history.clone();if history.record_with_launch(&before,&document,&before_launch,&after_launch,"Workspace edit")?{self.publish_music(&before,&document,&after_launch,&history)?;}Ok(affected)
    }
    fn workspace_action(&mut self,label:&str,generation:u64,preparation_revision:&str,action:runtime_workspaces::Action)->Result<runtime_workspaces::RequestResult,String>{
        main_only(label)?;check_generation(self.generation,generation)?;
        self.reconcile_publication();if self.publication_pending.is_some(){return Err("Music is awaiting playback; refresh before launching".into())}
        if runtime::decimal(preparation_revision)?!=self.host.preparation_revision{return Err("Prepared workspace changed. Refresh before playback".into());}

        if !self.driver.snapshot().running{return Err("Start Audio before workspace playback".into());}
        self.runtime.workspace_request(&self.host,action)
    }


    fn version(&mut self,generation:u64,revision:u64)->Result<(),String> {
        self.reconcile_publication();
        if self.publication_pending.is_some(){return Err("A musical edit is awaiting playback. Refresh before another musical edit.".into());}
        ensure_counter(self.generation)?;ensure_counter(self.edit_revision)?;
        check_generation(self.generation,generation)?;
        if self.edit_revision!=revision {return Err("Music changed. Refresh the session and try again.".into());} Ok(())
    }
    fn clear_scope(&mut self)->Result<(),String>{ensure_counter(self.edit_revision)?;self.history.clear();self.edit_revision+=1;Ok(())}



    fn history(&mut self,direction:Direction,generation:u64,revision:u64)->Result<(),String> {
        self.version(generation,revision)?;
        let prepared=self.host.prepared.as_ref().ok_or("No session")?;
        let mut document=self.history.target(direction)?.materialize(&prepared.saved.score)?;
        merge_live(&mut document,&prepared.saved.score);
        let launch=self.history.target_launch(direction)?;launch.validate(&document)?;
        let before=&prepared.saved.score.clone();let mut history=self.history.clone();history.advance(direction);
        let roots=|score:&Session|score.tracks.iter().flat_map(|t|t.devices().map(|d|d.instance_id.clone())).collect::<Vec<_>>();
        if roots(before)!=roots(&document) {
            self.stopped()?;
            prepare::check_sources(&document,&prepared.origin,Some(before))?;
            let mut saved=structural_saved(&prepared.saved,document);saved.launch=launch;
            let candidate=prepare(&saved,&prepared.origin)?;
            self.install_with_history(candidate,history)?;
        }else{self.publish_music(before,&document,&launch,&history)?;}Ok(())
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
    fn snapshot(&mut self,label:&str)->Result<Snapshot,String>{
        self.reconcile_publication();let instance_id=self.editor_instance(label)?.map(str::to_owned);
        let sequence=self.snapshot_sequence.checked_add(1).ok_or("Snapshot sequence exhausted")?;
        let awaiting=self.publication_pending.is_some();let polled=self.runtime.poll(&self.host);self.reconcile_publication();
        let (native_state,runtime)=if awaiting&&self.publication_pending.is_none(){self.runtime.poll(&self.host)?}else{polled?};
        self.snapshot_sequence=sequence;
        let prepared=self.host.prepared.as_ref().ok_or("Open an Alive session")?;let limits=host::workspace_limits()?;
        let midi_edit=super::native_publication::require(self.host.preparation_revision).map(|_|());
        let midi_preview=super::native_midi::require(self.host.preparation_revision).map(|_|());
        let midi_unavailable_reason=midi_edit.as_ref().err().or_else(||midi_preview.as_ref().err()).cloned();
        let device_index=instance_id.as_ref().map(|id|prepared.devices.iter().position(|d|&d.instance_id==id).ok_or("Unknown editor instance")).transpose()?;
        let track=device_index.map(|i|prepared.devices[i].track);
        let observation=self.runtime.master_observation.map(|m|serde_json::json!({"targetGain":m.target_gain,"currentGain":m.current_gain,"peakLeft":m.peak_left,"peakRight":m.peak_right,"clipMask":m.clip_mask,"appliedSerial":m.applied_serial.to_string(),"appliedFrame":m.applied_frame.to_string(),"observationStartFrame":m.observation_start_frame.to_string(),"observationEndFrame":m.observation_end_frame.to_string()}));
        Ok(Snapshot{document:prepared.saved.score.clone(),master:MasterSnapshot{gain:prepared.saved.master.gain,accepted_serial:self.accepted_serial.to_string(),available:true,unavailable_reason:None,observation,observation_stale:false},midi:self.publication_view(),launch:self.current_launch(),path:self.saved_path.clone(),generation:self.generation,dirty:self.dirty,edit_revision:self.edit_revision,history:self.history.view(),state:native_state,
            capabilities:Capabilities{midi_edit:midi_edit.is_ok(),midi_preview:midi_preview.is_ok(),midi_unavailable_reason,launch_quantization:super::native_launch::available(self.host.preparation_revision),launch_unavailable_reason:super::native_launch::require(self.host.preparation_revision).err(),launch_window_frames:1024,max_tracks:limits.max_tracks as usize,max_devices:limits.max_devices as usize,slots_per_track:4,max_clips:limits.max_slots as usize,atomic_track_actions:limits.features&native::V4_FEATURE_ATOMIC_TRACK_ACTIONS!=0,workspaces:true,arrangement:true,audio_sources:limits.features&native::V4_FEATURE_AUDIO!=0,max_sources:limits.max_sources as usize,max_placements:limits.max_placements as usize},
            notice:self.save_feedback.clone(),preparation_revision:self.host.preparation_revision.to_string(),snapshot_sequence:sequence.to_string(),runtime,prepared_workspaces:runtime_workspaces::prepared(&self.host)?,
            track_chains:prepared.saved.score.tracks.iter().map(|t|serde_json::json!({"trackId":t.id,"kind":if matches!(t.chain,workspaces::ChainV4::Midi{..}){"midi"}else{"audio"},"instrumentId":t.instrument().map(|d|&d.instance_id),"effectIds":t.effects.iter().map(|d|&d.instance_id).collect::<Vec<_>>() })).collect(),
            device_instances:prepared.devices.iter().enumerate().map(|(index,device)|(device.instance_id.clone(),DeviceView{index,track:device.track,path:device.path.clone(),manifest:device.manifest.clone()})).collect(),audio:self.driver.snapshot(),patch:device_index.map(|i|prepared.devices[i].patch.clone()),track,instance_id,device_index})
    }
    fn stopped(&self)->Result<(),String>{
        if self.host.prepared.is_none(){return Ok(())}
        let mut state=native::StateV4::default();if unsafe{native::alive_session_state_v4(&mut state)}==0{return Err("Workspace state is temporarily unavailable".into());}
        if state.playing!=0{Err("Stop transport before changing devices or replacing the session".into())}else{Ok(())}
    }
    fn install(&mut self, prepared: PreparedSession) -> Result<(), String> {
        self.reconcile_publication();
        if self.publication_pending.is_some(){return Err("Wait for playback to apply the musical edit before replacing the session.".into());}
        ensure_counter(self.generation)?;ensure_counter(self.edit_revision)?;
        Host::preflight_master(&prepared)?;
        self.stopped()?;
        self.host.validate(&prepared)?;
        let serials=super::native_master::reserve_pair().ok_or("Master serial exhausted")?;
        self.driver.stop()?;
        if let Err(failure)=self.host.install_reserved(prepared,serials){if let Some(serial)=failure.rollback_serial{self.accepted_serial=serial;}return Err(failure.message);}
        self.accepted_serial=serials.0;
        self.generation += 1; self.editors.clear(); self.dirty = true; self.clear_scope()?;
        Ok(())
    }
    fn install_with_history(&mut self, prepared:PreparedSession, history:History)->Result<(),String> {
        self.install(prepared)?;
        self.history=history;
        Ok(())
    }

}

#[tauri::command]
pub fn alive_current(window: WebviewWindow, state: tauri::State<Desktop>) -> Result<Snapshot, String> {
    ui_lock(&state.0)?.snapshot(window.label())
}
#[tauri::command]
pub fn alive_launch_settings(window:WebviewWindow,state:tauri::State<Desktop>,generation:u64,preparation_revision:String,edit_revision:u64,edit:launch::Edit)->Result<Snapshot,String>{
    let mut c=ui_lock(&state.0)?;c.launch_settings(window.label(),generation,&preparation_revision,edit_revision,edit)?;c.snapshot(window.label())
}
#[tauri::command]
pub fn alive_master(window:WebviewWindow,state:tauri::State<Desktop>,generation:u64,gain:f64)->Result<MasterReceipt,MasterError>{
    let mut control=ui_lock(&state.0).map_err(|message|master_error("BUSY",message))?;
    control.master_gain(window.label(),generation,gain)
}
#[tauri::command]
pub fn alive_master_reset_clip(window:WebviewWindow,state:tauri::State<Desktop>,generation:u64)->Result<MasterResetReceipt,MasterError>{
    let mut control=ui_lock(&state.0).map_err(|message|master_error("BUSY",message))?;
    control.master_reset(window.label(),generation)
}

#[tauri::command]
pub fn alive_workspace_action(window:WebviewWindow,state:tauri::State<Desktop>,action:runtime_workspaces::Action,generation:u64,preparation_revision:String)->Result<runtime_workspaces::RequestResult,String>{
    ui_lock(&state.0)?.workspace_action(window.label(),generation,&preparation_revision,action)
}
#[derive(Serialize)]
pub struct WorkspaceEditResult {snapshot:Snapshot,affected:workspace_edits::Affected}
#[tauri::command]
pub fn alive_workspace_edit(window:WebviewWindow,state:tauri::State<Desktop>,operation:workspaces::WorkspaceEditV4,generation:u64,edit_revision:u64)->Result<WorkspaceEditResult,String>{
    main_only(window.label())?;let mut c=ui_lock(&state.0)?;let affected=c.workspace_edit(window.label(),operation,generation,edit_revision)?;Ok(WorkspaceEditResult{snapshot:c.snapshot(window.label())?,affected})
}





#[tauri::command]
pub fn alive_history(window:WebviewWindow,state:tauri::State<Desktop>,direction:Direction,generation:u64,edit_revision:u64)->Result<Snapshot,String> {
    main_only(window.label())?;let mut control=ui_lock(&state.0)?;
    control.history(direction,generation,edit_revision)?;close_stale_editors(window.app_handle(),control.generation);control.snapshot(window.label())
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
pub fn alive_mixer(window: WebviewWindow, state: tauri::State<Desktop>, track_id: String, gain: f64, mute: bool, solo: bool, generation: u64) -> Result<(), String> {
    main_only(window.label())?;
    let mut control = ui_lock(&state.0)?;
    check_generation(control.generation, generation)?;
    control.reconcile_publication();if control.publication_pending.is_some(){return Err("Music is awaiting playback; refresh before changing its mixer".into())}
    let track=control.host.prepared.as_ref().ok_or("No session")?.saved.score.tracks().iter().position(|t|t.id()==track_id).ok_or("Unknown mixer track")?;
    control.host.mixer(track, gain, mute, solo)?; control.dirty = true; Ok(())
}
#[tauri::command]
pub fn alive_transport(window:WebviewWindow,state:tauri::State<Desktop>,action:String,generation:u64)->Result<serde_json::Value,String>{
    main_only(window.label())?;let control=ui_lock(&state.0)?;
    if action!="stop"{return Err("Use the authenticated workspace Start or Seek action".into());}
    check_generation(control.generation,generation)?;
    let epoch=unsafe{native::alive_session_stop_v4()};Ok(serde_json::json!({"stopEpoch":epoch.to_string()}))
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
    let name = prepared.saved.score.tracks()[device.track].name();
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
    let generation = editor.label().strip_prefix("alive-editor-").and_then(|s| s.split('-').next()).and_then(|s| s.parse::<u64>().ok());
    editor.with_webview(move |webview| {
        webview.inner().connect_destroy(move |view| {
            if trace_commands() { eprintln!("ALIVE_TRACE editor_destroyed generation={}", generation.unwrap_or(0)); }
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
        if label.starts_with("alive-editor-") && !label.starts_with(&format!("alive-editor-{generation}-")) {
            let stale = label.strip_prefix("alive-editor-").and_then(|s| s.split('-').next()).and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);
            let result = window.close();
            if trace_commands() { eprintln!("ALIVE_TRACE editor_close requested_generation={stale} installed_generation={generation} result={}", if result.is_ok() { "ok" } else { "error" }); }
        }
    }
}
fn chosen(result: MessageDialogResult, name: &str, yes: bool) -> bool {
    matches!(&result, MessageDialogResult::Custom(value) if value == name)
        || if yes { matches!(result, MessageDialogResult::Yes) } else { matches!(result, MessageDialogResult::No) }
}

fn save_current(window: &WebviewWindow, control: &mut Control, save_as: bool, path: Option<PathBuf>) -> Result<bool, String> {
    let prepared = control.host.prepared.as_ref().ok_or("No session")?;
    let path = path.or_else(|| if save_as { None } else { control.saved_path.clone() });
    let path = match path {
        Some(path) => path,
        None => {
            let Some(path) = window.dialog().file().set_parent(window).set_title("Save Alive Session")
                .add_filter("Alive session", &["alive"]).set_file_name(format!("{}.alive", prepared.saved.score.title())).blocking_save_file() else { return Ok(false); };
            path.into_path().map_err(|e| e.to_string())?
        }
    };
    save_to_path(control,&path)?;
    Ok(true)
}
fn save_to_path(control: &mut Control, path: &Path) -> Result<(), String> {
    control.reconcile_publication();if control.publication_pending.is_some(){return Err("Wait for playback to apply the musical edit before saving".into())}
    let prepared = control.host.prepared.as_ref().ok_or("No session")?;
    ensure_counter(control.edit_revision)?;
    control.host.validate(&prepare(&prepared.saved,&prepared.origin)?)?;
    let (path,saved) = persistence::save_document(path, &prepared.saved, &prepared.origin)?;
    control.history.rebase_paths(&prepared.origin,&path);
    let current = control.host.prepared.as_mut().unwrap();
    if current.origin != path || current.saved != saved {control.edit_revision+=1;}
    let current=control.host.prepared.as_mut().unwrap();
    current.saved = saved; current.origin = path.clone();
    control.save_feedback=None;
    control.saved_path = Some(path); control.dirty = false; Ok(())
}
fn resolve_dirty(window: &WebviewWindow, control: &mut Control) -> Result<bool, String> {
    if !control.dirty { return Ok(true); }
    let result = window.dialog().message("Save changes to this Alive session before continuing?")
        .title("Unsaved Alive Session").parent(window)
        .buttons(MessageDialogButtons::YesNoCancelCustom("Save".into(), "Discard".into(), "Cancel".into())).blocking_show_with_result();
    if chosen(result.clone(), "Save", true) { save_current(window, control, false, None) }
    else { Ok(chosen(result, "Discard", false)) }
}
fn example_path(resources: &Path, source: &Path) -> PathBuf {
    let relative = "alive-session/alive/examples/empty-workspaces.alive";
    let bundled = resources.join(relative);
    if bundled.is_file() { return bundled; }
    source.join("../../alive/examples/empty-workspaces.alive")
}
#[tauri::command]
pub async fn alive_browser_catalog(window: WebviewWindow, request: browser::Request) -> Result<browser::Page, String> {
    main_only(window.label())?;
    let app = window.app_handle().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let resources = app.path().resource_dir().map_err(|e| e.to_string())?;
        let config = browser::Config::environment(resources, PathBuf::from(env!("CARGO_MANIFEST_DIR")));
        app.state::<browser::CatalogCache>().page(request, &config)
    }).await.map_err(|e| e.to_string())?
}
fn example(app: &tauri::AppHandle) -> Result<PreparedSession, String> {
    let resources = app.path().resource_dir().map_err(|e| e.to_string())?;
    let path = example_path(&resources, Path::new(env!("CARGO_MANIFEST_DIR")));
    Ok(new_session(read(&path)?))
}
fn new_session(mut prepared: PreparedSession) -> PreparedSession {
    prepared.saved.master=MasterSettings{gain:1.};
    prepared
}

#[tauri::command]
pub async fn alive_file(window: WebviewWindow, action: String, path: Option<PathBuf>, generation:u64,edit_revision:u64) -> Result<Option<Snapshot>, String> {
    main_only(window.label())?;
    tauri::async_runtime::spawn_blocking(move || {
        let state = window.state::<Desktop>();
        let mut control = ui_lock(&state.0)?;
        control.version(generation,edit_revision)?;
        control.closing = false;
        // Resolve prospective dependencies before any dirty-state decision or native replacement.
        let prospective = match action.as_str() {
            "new" => { Some(example(window.app_handle())?) },
            "open" => {
                let path = match path.clone() { Some(path) => path, None => {
                    let Some(path) = window.dialog().file().set_parent(&window).set_title("Open Alive Session").add_filter("Alive session", &["alive", "json"]).blocking_pick_file() else { return Ok(None); };
                    path.into_path().map_err(|e| e.to_string())?
                }};
                Some(read(&path)?)
            }
            "save" | "saveAs" | "quit" => None,
            _ => return Err("Unknown session action".into()),
        };
        if let Some(prepared)=&prospective { Host::preflight_master(prepared)?; control.driver.reject_retiring()?; }

        match action.as_str() {
            "save" | "saveAs" => { if !save_current(&window, &mut control, action == "saveAs", path)? { return Ok(None); } }
            "new" | "open" => {
                if !resolve_dirty(&window, &mut control)? { return Ok(None); }
                let prepared = prospective.unwrap();
                let origin = prepared.origin.clone(); control.install(prepared)?;
                control.saved_path = if action == "open" { Some(origin) } else { None };
                control.save_feedback = None;
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
        if !document.tracks().into_iter().flat_map(|t|t.devices()).any(|d| d.instance_id == id) { break id; }
    };
    Ok(DeviceInstance { instance_id, source_sha256: prepare::fingerprint(&patch)?, bypassed: false,
        path: loaded.path.to_str().ok_or("Device path must be UTF-8")?.into(), id: manifest.id, version: manifest.version, parameters: Default::default() })
}
fn document_capacity(_document:&Session)->Result<(usize,usize,usize),String>{
    let limits=host::workspace_limits()?;Ok((limits.max_tracks as usize,limits.max_devices as usize,limits.max_slots as usize))
}
fn addition_capacity(document:&Session,track_id:&str,action:&str)->Result<(),String>{
    let (_,devices,_)=document_capacity(document)?;
    let track=document.tracks().into_iter().find(|t|t.id()==track_id);
    if track.is_none(){return Err("Unknown workspace track; use Add MIDI track".into());}
    if action=="add"&&track.is_some_and(|t|t.effects().len()>=2){return Err("At most two effects per track".into());}
    let adding_device=action=="add"||(action=="load"&&track.is_some_and(|t|t.instrument().is_none()&&matches!(t.chain,workspaces::ChainV4::Midi{..})));
    if adding_device&&document.tracks().into_iter().map(|t|t.devices().count()).sum::<usize>()>=devices{
        return Err(format!("The admitted {devices}-device capacity is reached; no dependency was opened"));
    }Ok(())
}
fn structural_saved(current:&SavedSession,document:Session)->SavedSession {
    let mut saved=current.with_score(document);
    saved.launch.retain_owned(&saved.score);
    saved
}
fn insert_workspace_track(document:&mut Session,after:Option<&str>,midi:bool,ids:&mut std::collections::HashSet<String>)->Result<String,String> {
    if document.tracks.len()>=host::workspace_limits()?.max_tracks as usize{return Err("Eight logical tracks are available in this workspace".into());}
    let position=match after{Some(id)=>document.tracks.iter().position(|t|t.id==id).ok_or("Unknown selected track")?+1,None=>document.tracks.len()};
    let id=workspaces::fresh("track",ids);
    let chain=if midi{workspaces::ChainV4::Midi{instrument:None}}else{workspaces::ChainV4::Audio{}};
    document.tracks.insert(position,workspaces::TrackV4{id:id.clone(),name:format!("{} {}",if midi{"MIDI"}else{"Audio"},document.tracks.len()+1),color:if midi{"#86a59c"}else{"#c77b61"}.into(),chain,effects:vec![],slots:[None,None,None,None],gain:1.,mute:false,solo:false});
    Ok(id)
}
fn change_device(document:&mut Session,track_id:&str,action:&str,instance_id:Option<&str>,before:Option<&str>,reference:Option<DeviceInstance>)->Result<(),String>{
    addition_capacity(document,track_id,action)?;change_workspace_device(document,track_id,action,instance_id,before,reference)
}
fn change_workspace_device(project:&mut workspaces::ProjectV4,track_id:&str,action:&str,instance_id:Option<&str>,before:Option<&str>,reference:Option<DeviceInstance>)->Result<(),String>{
    use workspaces::{ChainV4,SourceV4};
    let mut candidate=project.clone();
    let track=candidate.tracks.iter_mut().find(|t|t.id==track_id).ok_or("Unknown workspace track")?;
    let instrument=track.instrument().map(|d|d.instance_id.clone());
    let id=if action=="add"||(action=="load"&&instrument.is_none()&&matches!(track.chain,ChainV4::Midi{..})){instance_id.unwrap_or("")}else{instance_id.ok_or("An explicit device instance ID is required")?};
    let effect=track.effects.iter().position(|d|d.instance_id==id);
    let mut remove_lanes=false;
    match action {
        "remove" if instrument.as_deref()==Some(id)=>{track.chain=ChainV4::Midi{instrument:None};remove_lanes=true;},
        "remove"=>{track.effects.remove(effect.ok_or("Unknown effect instance")?);remove_lanes=true;},
        "replace"|"load"=>{let reference=reference.ok_or("Choose a saved Ultra device")?;if instrument.as_deref()==Some(id)||(action=="load"&&instrument.is_none()&&matches!(track.chain,ChainV4::Midi{..})){track.chain=ChainV4::Midi{instrument:Some(reference)};}else{track.effects[effect.ok_or("Unknown effect instance")?]=reference;}remove_lanes=true;},
        "reorder"=>{let index=effect.ok_or("Only actual effects can be reordered")?;if before==Some(id){return Ok(());}let mut effects=track.effects.clone();let moved=effects.remove(index);let position=match before{Some(id)=>effects.iter().position(|d|d.instance_id==id).ok_or("Unknown destination effect")?,None=>effects.len()};effects.insert(position,moved);track.effects=effects;},
        "add"=>{if track.effects.len()>=2{return Err("At most two effects per track".into());}let position=match before{Some(id)=>track.effects.iter().position(|d|d.instance_id==id).ok_or("Unknown destination effect")?,None=>track.effects.len()};track.effects.insert(position,reference.ok_or("Choose a saved Ultra effect")?);},
        _=>return Err("Unknown device action".into())
    }
    if remove_lanes{for source in &mut candidate.sources{match source {SourceV4::Midi{automation,..}|SourceV4::Audio{automation,..}=>automation.retain(|l|l.instance_id!=id)}}}
    candidate.validate()?;*project=candidate;Ok(())
}

#[derive(serde::Deserialize)]
#[serde(tag="kind",rename_all="camelCase",rename_all_fields="camelCase",deny_unknown_fields)]
pub enum WorkspaceTrackOperation {AddMidi{after_track_id:Option<String>},AddAudio{after_track_id:Option<String>},Remove{track_id:String}}
impl Control {
    fn workspace_track_edit(&mut self,operation:WorkspaceTrackOperation,generation:u64,revision:u64)->Result<workspace_edits::Affected,String>{
        self.version(generation,revision)?;
        let current=self.host.prepared.as_ref().ok_or("No session")?;
        let before=current.saved.score.clone();
        let project=&before;
        let mut candidate=project.clone();let mut ids=self.history.identities();ids.extend(project.identities());
        let midi=matches!(&operation,WorkspaceTrackOperation::AddMidi{..});
        let (track_id,label,graph_change)=match operation {
            WorkspaceTrackOperation::AddMidi{after_track_id}|WorkspaceTrackOperation::AddAudio{after_track_id}=>{
                let id=insert_workspace_track(&mut candidate,after_track_id.as_deref(),midi,&mut ids)?;
                (id,if midi{"Insert MIDI track"}else{"Insert Audio track"},false)
            },
            WorkspaceTrackOperation::Remove{track_id}=>{
                if candidate.tracks.len()==1{return Err("Keep at least one track".into());}
                let index=candidate.tracks.iter().position(|t|t.id==track_id).ok_or("Unknown workspace track")?;
                let graph_change=candidate.tracks[index].devices().next().is_some();
                candidate.tracks.remove(index);candidate.sources.retain(|s|s.track_id()!=track_id);candidate.placements.retain(|p|p.track_id!=track_id);
                (track_id,"Delete track",graph_change)
            }
        };
        candidate.validate()?;let document=candidate;
        let before_launch=self.current_launch();let mut after_launch=before_launch.clone();after_launch.retain_owned(&document);
        if graph_change {
            self.stopped()?;let prepared=prepare(&structural_saved(&current.saved,document),&current.origin)?;self.install(prepared)?;
        }else{
            let mut history=self.history.clone();
            if history.record_with_launch(&before,&document,&before_launch,&after_launch,label)?{self.publish_music(&before,&document,&after_launch,&history)?;}
        }
        Ok(workspace_edits::Affected{track_id:Some(track_id),..Default::default()})
    }
}
#[tauri::command]
pub async fn alive_workspace_track(window:WebviewWindow,operation:WorkspaceTrackOperation,generation:u64,edit_revision:u64)->Result<WorkspaceEditResult,String>{
    main_only(window.label())?;
    tauri::async_runtime::spawn_blocking(move ||{
        let state=window.state::<Desktop>();let mut c=ui_lock(&state.0)?;
        let affected=c.workspace_track_edit(operation,generation,edit_revision)?;
        close_stale_editors(window.app_handle(),c.generation);
        Ok(WorkspaceEditResult{snapshot:c.snapshot(window.label())?,affected})
    }).await.map_err(|e|e.to_string())?
}
#[tauri::command]
pub async fn alive_audio_import(window:WebviewWindow,track_id:String,slot:u32,path:Option<PathBuf>,generation:u64,edit_revision:u64)->Result<WorkspaceEditResult,String>{
    main_only(window.label())?;
    tauri::async_runtime::spawn_blocking(move ||{
        let state=window.state::<Desktop>();let mut c=ui_lock(&state.0)?;c.version(generation,edit_revision)?;
        let current=c.host.prepared.as_ref().ok_or("No session")?;
        let project=&current.saved.score;
        let track=project.tracks.iter().find(|t|t.id==track_id).ok_or("Unknown Audio track")?;
        if !matches!(track.chain,workspaces::ChainV4::Audio{}){return Err("Import WAV clips onto an Audio track".into())}
        if slot>=4||track.slots[slot as usize].is_some(){return Err("Select an empty Audio clip slot".into())}
        let path=match path {Some(path)=>path,None=>{
            let Some(path)=window.dialog().file().set_parent(&window).set_title("Import Audio Clip").add_filter("WAV audio",&["wav"]).blocking_pick_file()else{return Ok(WorkspaceEditResult{snapshot:c.snapshot(window.label())?,affected:Default::default()})};
            path.into_path().map_err(|e|e.to_string())?
        }};
        let path=std::fs::canonicalize(path).map_err(|e|format!("Open WAV: {e}"))?;
        let file=wav::inspect(&path)?;
        let name=path.file_stem().and_then(|s|s.to_str()).unwrap_or("Audio clip").to_owned();
        let operation=workspaces::WorkspaceEditV4::AudioClipImport{track_id,slot,name,file,source_tempo:project.tempo,warp_mode:"repitch".into()};
        let affected=c.workspace_edit(window.label(),operation,generation,edit_revision)?;
        Ok(WorkspaceEditResult{snapshot:c.snapshot(window.label())?,affected})
    }).await.map_err(|e|e.to_string())?
}
impl Control {
    fn device_edit(&mut self, track_id:&str, action:&str, instance_id:Option<&str>, before_instance_id:Option<&str>, generation:u64, revision:u64, choose:impl FnOnce()->Result<Option<PathBuf>,String>)->Result<(),String> {
        self.version(generation,revision)?;self.stopped()?;
        let current = self.host.prepared.as_ref().ok_or("No session")?;
        let mut document = current.saved.score.clone();
        let automatic=action=="loadNewTrack";
        // The new track remains prospective until its captured device and full graph are admitted.
        let target=if automatic {
            if instance_id.is_some()||before_instance_id.is_some(){return Err("Automatic instrument loading requires a track destination without a device instance".into());}
            let mut ids=self.history.identities();ids.extend(document.identities());
            insert_workspace_track(&mut document,Some(track_id),true,&mut ids)?
        }else{track_id.to_owned()};
        let track_id=target.as_str();let action=if automatic{"load"}else{action};
        addition_capacity(&document,track_id,action)?;
        { let project=&document;
            let track=project.tracks.iter().find(|t|t.id==track_id).ok_or("Unknown workspace track")?;
            if action!="add"&&!(action=="load"&&track.instrument().is_none()&&matches!(track.chain,workspaces::ChainV4::Midi{..})) {
                let id=instance_id.ok_or("An explicit device instance ID is required")?;
                if !track.devices().any(|d|d.instance_id==id){return Err("Unknown workspace device instance".into());}
            }
            if let Some(before)=before_instance_id{if !track.effects.iter().any(|d|d.instance_id==before){return Err("Unknown destination effect".into());}}
        }
        let reference = if matches!(action, "load" | "replace" | "add") {
            let Some(path) = choose()? else { return Ok(()); };
            Some({let mut reference=capture_device(&path,&document)?;let mut ids=self.history.identities();ids.extend(document.identities());reference.instance_id=workspaces::fresh("instance",&mut ids);reference})
        } else { None };
        change_device(&mut document, track_id, action, instance_id, before_instance_id, reference)?;
        prepare::check_sources(&document,&current.origin,Some(&current.saved.score))?;
        let saved=structural_saved(&current.saved,document);
        let prepared=prepare(&saved,&current.origin)?;
        if automatic {
            let mut history=self.history.clone();
            history.record_with_launch(&current.saved.score,&saved.score,&current.saved.launch,&saved.launch,"Insert MIDI instrument")?;
            self.install_with_history(prepared,history)?;
        }else{self.install(prepared)?;}
        Ok(())
    }
}
#[tauri::command]
pub async fn alive_device(window: WebviewWindow, track_id: String, action: String, generation: u64, edit_revision:u64, instance_id: Option<String>, before_instance_id: Option<String>, path: Option<PathBuf>) -> Result<Snapshot, String> {
    main_only(window.label())?;
    tauri::async_runtime::spawn_blocking(move || {
        let state = window.state::<Desktop>();
        let mut control = ui_lock(&state.0)?;
        control.device_edit(&track_id,&action,instance_id.as_deref(),before_instance_id.as_deref(),generation,edit_revision,|| {
            match path {Some(path)=>Ok(Some(path)),None=>{
                let Some(path) = window.dialog().file().set_parent(&window).set_title("Load Ultra Device").add_filter("Ultra device", &["ultra"]).blocking_pick_file() else {return Ok(None)};
                Ok(Some(path.into_path().map_err(|e|e.to_string())?))
            }}
        })?;
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
    context.config_mut().identifier = "org.alive.session".into();
    context.config_mut().product_name = Some("Alive".into());
    context.config_mut().app.windows.clear();
    tauri::Builder::default().plugin(tauri_plugin_dialog::init())
        .setup(move |app| {
            app.manage(browser::CatalogCache::default());
            let prepared = match path.as_ref() { Some(path) => read(path), None => example(app.handle()) }
                .map_err(std::io::Error::other)?;
            let saved_path = path.as_ref().map(|_| prepared.origin.clone());
            let mut host = Host::default(); let accepted_serial=host.install(prepared).map_err(std::io::Error::other)?;
            app.manage(Desktop(Mutex::new(Control { host, runtime:runtime::Runtime::default(),snapshot_sequence:0, accepted_serial, driver: crate::audio::Driver::load(app.path().app_data_dir()?.join("audio-settings.json")), generation: 1,
                dirty:false,saved_path,save_feedback:None, edit_revision:0,history:History::default(),publication_pending:None, closing: false, allow_exit: false, editors: BTreeMap::new() })));
            tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::App("alive.html".into()))
                .title("Alive").inner_size(1200., 800.).min_inner_size(800., 600.)
                .disable_drag_drop_handler().build()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![publication::alive_midi_preview, alive_audio_import, alive_current, alive_launch_settings, alive_browser_catalog, alive_master, alive_master_reset_clip, alive_workspace_action, alive_workspace_edit, alive_workspace_track, alive_history, alive_base, alive_bypass, alive_mixer, alive_transport, alive_audio_devices, alive_audio_configure, alive_audio_diagnostics, alive_audio, alive_editor, alive_file, alive_device])
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
pub(super) fn musical_control()->Control {
 let prepared=read(&Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive")).unwrap();
 let mut host=Host::default();host.prepared=Some(prepared);
 Control{host,runtime:Default::default(),snapshot_sequence:0,accepted_serial:0,driver:crate::audio::Driver::load(PathBuf::from("/nonexistent/alive-test.json")),generation:7,dirty:false,saved_path:None,save_feedback:None,edit_revision:0,history:Default::default(),publication_pending:None,closing:false,allow_exit:false,editors:Default::default()}
}
fn workspace_control()->Control{musical_control()}

#[test]
fn fresh_session_has_both_workspaces_without_converting_a_demo() {
        let source=Path::new(env!("CARGO_MANIFEST_DIR"));
        let path=example_path(&source.join("missing-resources"),source);
        let prepared=new_session(read(&path).unwrap());
        let project=&prepared.saved.score;
        assert_eq!(project.tracks.len(),1);
        assert!(project.tracks[0].slots.iter().all(Option::is_none));
        assert!(project.sources.is_empty());assert!(project.placements.is_empty());
        Host::default().validate(&prepared).expect("The default workspace must fit the shipping native profile");
    }
#[test]
fn alive_loads_its_installed_example_without_source_tree() {
        let unique = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos();
        let root = std::env::temp_dir().join(format!("alive-installed-{}-{unique}", std::process::id()));
        let resource = root.join("usr/lib/Alive/alive-session");
        let session = resource.join("alive/examples/empty-workspaces.alive");
        let device = resource.join("ultra/examples/subtractive.ultra");
        std::fs::create_dir_all(root.join("usr/bin")).unwrap();
        std::fs::create_dir_all(session.parent().unwrap()).unwrap();
        std::fs::create_dir_all(device.parent().unwrap()).unwrap();
        std::fs::copy(Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/empty-workspaces.alive"), &session).unwrap();
        std::fs::copy(Path::new(env!("CARGO_MANIFEST_DIR")).join("../examples/subtractive.ultra"), &device).unwrap();
        let path = example_path(&root.join("usr/lib/Alive"), &root.join("missing-source"));
        let result = read(&path);
        std::fs::remove_dir_all(&root).unwrap();
        let prepared = result.expect("Installed Alive must load its bundled session, without repository paths");
        assert_eq!(prepared.tracks.len(), 1);assert_eq!(prepared.saved.score.format,"alive-session-v4");
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
fn stale_generation_and_unrelated_main_actions_reject() {
        assert!(check_generation(4, 3).is_err()); assert!(check_generation(4, 4).is_ok());
        assert!(main_only("alive-editor-4-0").is_err()); assert!(main_only("main").is_ok());
    }
#[test]
fn actual_registered_window_binding_authenticates_instance_and_generation() {
        let mut control=Control { host:Host::default(),runtime:runtime::Runtime::default(),snapshot_sequence:0, accepted_serial:0, driver:crate::audio::Driver::load(PathBuf::from("/nonexistent/alive-test.json")), generation:7,
            dirty:false,saved_path:None,save_feedback:None,edit_revision:0,history:History::default(),publication_pending:None,closing:false,allow_exit:false,editors:BTreeMap::new() };
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
fn master_stale_generation_refuses_without_owner_mutation() {
        let mut control=musical_control();let before=control.host.prepared.as_ref().unwrap().saved.clone();
        let error=control.master_gain("main",8,0.5).unwrap_err();
        assert_eq!(error.code,"STALE_GENERATION");assert_eq!(control.host.prepared.as_ref().unwrap().saved,before);
        assert_eq!(control.accepted_serial,0);assert!(!control.dirty);
    }
#[test]
fn master_failed_install_rolls_back_gain_and_receipt() {
        if super::super::native_master::fresh_process("session::desktop::tests::master_failed_install_rolls_back_gain_and_receipt"){return;}
        let _native_guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
        let mut c=musical_control();let mut original=c.host.prepared.clone().unwrap();original.saved.master.gain=0.5;
        let ids=original.saved.score.tracks().iter().map(|track|track.id().to_owned()).collect::<Vec<_>>();
        original.saved.score.set_mixer(&ids[0],1.,false,false).unwrap();original.saved.score.set_mixer(&ids[1],1.,true,false).unwrap();
        c.accepted_serial=c.host.install(original.clone()).unwrap();let first=c.accepted_serial;
        let mut before_left=[0f32;512];let mut before_right=[0f32;512];
        unsafe{assert_eq!(native::ultra_external_start(),1);assert!(c.runtime.workspace_request(&c.host,runtime_workspaces::Action::Start{}).is_ok());assert_eq!(native::ultra_external_render(512,before_left.as_mut_ptr(),before_right.as_mut_ptr()),1);native::ultra_audio_stop();}
        assert!(before_left.iter().any(|x|x.abs()>1e-6));assert!(before_right.iter().any(|x|x.abs()>1e-6));
        let mut candidate=original.clone();candidate.saved.master.gain=0.75;
        super::super::native_master::set_serial_for_test(u64::MAX-2);
        host::test_fail_after_reset(1);
        assert!(c.install(candidate).unwrap_err().contains("prior session retained"));
        assert_eq!(c.host.prepared.as_ref().unwrap().saved,original.saved);assert_eq!(c.generation,7);assert!(!c.dirty);
        assert!(c.accepted_serial>first);assert_eq!(c.accepted_serial,u64::MAX);
        let mut score=native::StateV4::default();let mut master=super::super::native_master::State::output();
        assert_eq!(unsafe{(native::master_capability().unwrap().snapshot_v4)((&mut score as *mut native::StateV4).cast(),&mut master)},1);
        assert_eq!(master.applied_serial,c.accepted_serial);
        let mut after_left=[0f32;512];let mut after_right=[0f32;512];
        unsafe{assert_eq!(native::ultra_external_start(),1);assert!(c.runtime.workspace_request(&c.host,runtime_workspaces::Action::Start{}).is_ok());assert_eq!(native::ultra_external_render(512,after_left.as_mut_ptr(),after_right.as_mut_ptr()),1);native::ultra_audio_stop();}
        assert!(after_left.iter().any(|x|x.abs()>1e-6));
        assert_eq!(master.target_gain,original.saved.master.gain);assert_eq!(master.current_gain,original.saved.master.gain);
        assert_eq!(before_left,after_left);assert_eq!(before_right,after_right);
        unsafe{native::alive_session_reset();for slot in 0..16{crate::ultra_canvas_close_document(slot);}}
    }
#[test]
fn master_gain_admission_promotes_only_on_change() {
        if super::super::native_master::fresh_process("session::desktop::tests::master_gain_admission_promotes_only_on_change"){return;}
        let _native_guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
        let mut c=musical_control();let original=c.host.prepared.clone().unwrap();
        c.accepted_serial=c.host.install(original).unwrap();let install=c.accepted_serial;
        let no_op=c.master_gain("main",7,1.).unwrap();assert!(!no_op.changed);assert_eq!(c.accepted_serial,install);assert!(!c.dirty);

        let changed=c.master_gain("main",7,0.5).unwrap();assert!(changed.changed);assert!(c.accepted_serial>install);assert!(c.dirty);

        let accepted=c.accepted_serial;let error=c.master_gain("main",7,f64::NAN).unwrap_err();assert_eq!(error.code,"INVALID");assert_eq!(c.accepted_serial,accepted);
        c.master_gain("main",7,1.).unwrap();
        c.dirty=false;c.master_reset("main",7).unwrap();assert!(!c.dirty);assert_eq!(c.host.prepared.as_ref().unwrap().saved.master.gain,1.);
        unsafe{native::alive_session_reset();for slot in 0..16{crate::ultra_canvas_close_document(slot);}}
    }
#[test]
fn master_failed_rollback_does_not_claim_receipt() {
        if super::super::native_master::fresh_process("session::desktop::tests::master_failed_rollback_does_not_claim_receipt"){return;}
        let _native_guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
        let mut c=musical_control();let original=c.host.prepared.clone().unwrap();
        c.accepted_serial=c.host.install(original.clone()).unwrap();let accepted=c.accepted_serial;
        let mut candidate=original.clone();candidate.saved.master.gain=0.5;
        host::test_fail_after_reset(2);
        assert!(c.install(candidate).unwrap_err().contains("audio restoration failed"));
        assert_eq!(c.accepted_serial,accepted);assert_eq!(c.generation,7);assert_eq!(c.host.prepared.as_ref().unwrap().saved,original.saved);
        unsafe{native::alive_session_reset();for slot in 0..16{crate::ultra_canvas_close_document(slot);}}
    }
#[test]
fn master_pending_retirement_burns_pair_without_replacement() {
        if super::super::native_master::fresh_process("session::desktop::tests::master_pending_retirement_burns_pair_without_replacement"){return;}
        let _native_guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
        let mut c=musical_control();let original=c.host.prepared.clone().unwrap();
        c.accepted_serial=c.host.install(original.clone()).unwrap();let accepted=c.accepted_serial;
        let previous=super::super::native_master::current_serial();let preparation=c.host.preparation_revision;
        let owner=crate::audio::tests::hold_retiring(&mut c.driver);
        assert_eq!(c.master_gain("main",7,0.5).unwrap_err().code,"BUSY");
        assert!(matches!(c.master_reset("main",7),Err(MasterError{code:"BUSY",..})));
        assert_eq!(super::super::native_master::current_serial(),previous);assert_eq!(c.accepted_serial,accepted);
        let mut candidate=original.clone();candidate.saved.master.gain=0.5;
        assert!(c.install(candidate.clone()).unwrap_err().starts_with("retirement_pending"));
        assert_eq!(super::super::native_master::current_serial(),previous+2);
        assert_eq!(c.host.preparation_revision,preparation);assert_eq!(c.accepted_serial,accepted);assert_eq!(c.generation,7);
        assert_eq!(c.host.prepared.as_ref().unwrap().saved,original.saved);
        drop(owner);c.driver.stop().unwrap();c.install(candidate).unwrap();assert!(c.accepted_serial>previous+2);
        unsafe{native::alive_session_reset();for slot in 0..16{crate::ultra_canvas_close_document(slot);}}
    }
#[test]
fn master_install_refuses_serial_exhaustion_before_retirement() {
        if super::super::native_master::fresh_process("session::desktop::tests::master_install_refuses_serial_exhaustion_before_retirement"){return;}
        let _native_guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
        let mut c=musical_control();let original=c.host.prepared.clone().unwrap();c.accepted_serial=c.host.install(original.clone()).unwrap();
        let accepted=c.accepted_serial;let preparation=c.host.preparation_revision;let mut before=native::StateV4::default();assert_eq!(unsafe{native::alive_session_state_v4(&mut before)},1);
        super::super::native_master::set_serial_for_test(u64::MAX-1);
        let mut candidate=original.clone();candidate.saved.master.gain=0.5;
        assert!(c.install(candidate).unwrap_err().contains("serial exhausted"));
        let mut after=native::StateV4::default();assert_eq!(unsafe{native::alive_session_state_v4(&mut after)},1);assert_eq!(after.absolute_frame,before.absolute_frame);assert_eq!(after.generation,before.generation);
        assert_eq!(c.accepted_serial,accepted);assert_eq!(c.host.preparation_revision,preparation);assert_eq!(c.generation,7);assert_eq!(c.host.prepared.as_ref().unwrap().saved,original.saved);
        unsafe{native::alive_session_reset();for slot in 0..16{crate::ultra_canvas_close_document(slot);}}
    }
#[test]
fn workspace_commands_authenticate_origin_generation_revision_and_preparation() {
        let mut c=workspace_control();let before=c.host.prepared.as_ref().unwrap().saved.score.clone();
        let op=workspaces::WorkspaceEditV4::SourceRename{source_id:"forged".into(),name:"Forged".into()};
        for (origin,generation,revision) in [("editor",7,0),("main",6,0),("main",7,1),("main",7,0)]{assert!(c.workspace_edit(origin,op.clone(),generation,revision).is_err());}
        for (origin,generation,preparation) in [("editor",7,"0"),("main",6,"0"),("main",7,"01"),("main",7,"1"),("main",7,"0")]{assert!(c.workspace_action(origin,generation,preparation,runtime_workspaces::Action::Start{}).is_err());}
        assert_eq!(c.host.prepared.as_ref().unwrap().saved.score,before);assert_eq!(c.edit_revision,0);assert!(!c.history.view().can_undo);
    }
#[test]
fn workspace_effect_roles_never_use_the_first_effect_as_an_instrument() {
        let mut c=workspace_control();let p=&mut c.host.prepared.as_mut().unwrap().saved.score;
        let mut effect=p.tracks[0].devices().next().unwrap().clone();effect.instance_id="first-effect".into();p.tracks[0].chain=workspaces::ChainV4::Audio{};p.tracks[0].effects=vec![effect];p.tracks[0].slots=[None,None,None,None];let track=p.tracks[0].id.clone();p.sources.retain(|s|s.track_id()!=track);p.placements.retain(|p|p.track_id!=track);
        change_workspace_device(p,&track,"remove",Some("first-effect"),None,None).unwrap();assert!(p.tracks[0].devices().next().is_none());assert_eq!(p.tracks.len(),2);
        assert!(change_workspace_device(p,&track,"load",None,None,None).is_err());
    }
#[test]
fn launch_settings_and_history_preserve_preparation_and_live_fields() {
        if super::super::native_master::fresh_process("session::desktop::tests::launch_settings_and_history_preserve_preparation_and_live_fields"){return;}
        let _guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
        let mut c=musical_control();
        let prepared=read(&Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/quantized-midi.alive")).unwrap();
        c.host.install(prepared).unwrap();
        let generation=c.generation;let preparation=c.host.preparation_revision;
        let original_quantization=c.current_launch().global_quantization;
        let ids=c.host.prepared.as_ref().unwrap().devices.iter().map(|d|d.instance_id.clone()).collect::<Vec<_>>();
        c.launch_settings("main",generation,&preparation.to_string(),0,launch::Edit::Global{quantization:launch::Quantization::Sixteenth}).unwrap();
        assert_eq!(c.host.preparation_revision,preparation);assert_eq!(c.generation,generation);
        let p=c.host.prepared.as_mut().unwrap();p.saved.master.gain=0.5;p.saved.score.tracks[0].gain=0.25;
        c.history(Direction::Undo,generation,1).unwrap();
        assert_eq!(c.host.prepared.as_ref().unwrap().saved.launch.global_quantization,original_quantization);
        assert_eq!(c.host.prepared.as_ref().unwrap().saved.master.gain,0.5);
        assert_eq!(c.host.prepared.as_ref().unwrap().saved.score.tracks()[0].mixer().0,0.25);
        c.history(Direction::Redo,generation,2).unwrap();
        assert_eq!(c.host.prepared.as_ref().unwrap().saved.launch.global_quantization,launch::Quantization::Sixteenth);
        assert_eq!(c.host.preparation_revision,preparation);
        assert_eq!(ids,c.host.prepared.as_ref().unwrap().devices.iter().map(|d|d.instance_id.clone()).collect::<Vec<_>>());
        assert!(c.launch_settings("main",generation+1,&preparation.to_string(),3,launch::Edit::Global{quantization:launch::Quantization::None}).is_err());
    }

#[test]
fn shared_changed_source_blocks_either_selected_replace_until_original_is_restored(){
        let mut c=musical_control();let current=c.host.prepared.as_ref().unwrap().clone();let mut document=current.saved.score.clone();
        let root=std::env::temp_dir().join(format!("alive-shared-source-{}",std::process::id()));std::fs::create_dir_all(&root).unwrap();
        let path=root.join("shared.ultra");let original=std::fs::read(&current.devices[0].path).unwrap();std::fs::write(&path,&original).unwrap();
        for t in &mut document.tracks{let workspaces::ChainV4::Midi{instrument:Some(d)}=&mut t.chain else{panic!()};d.path=path.to_string_lossy().into_owned();}
        c.host.prepared=Some(prepare(&current.saved.with_score(document),&current.origin).unwrap());
        let mut patch:serde_json::Value=serde_json::from_slice(&original).unwrap();patch["nodes"][0]["x"]=serde_json::json!(987);std::fs::write(&path,serde_json::to_vec(&patch).unwrap()).unwrap();
        let before=c.host.prepared.as_ref().unwrap().saved.score.clone();
        for i in 0..2 {let mut candidate=before.clone();let id=candidate.tracks[i].id.clone();let replacement=capture_device(&path,&candidate).unwrap();change_device(&mut candidate,&id,"replace",before.tracks[i].instrument().map(|d|d.instance_id.as_str()),None,Some(replacement)).unwrap();
            let error=prepare::check_sources(&candidate,&root.join("session.alive"),Some(&before)).unwrap_err();assert!(error.contains(&before.tracks[1-i].instrument().unwrap().instance_id),"{error}");assert!(error.contains("matching original backup"),"{error}");assert!(error.contains("preserve the changed"),"{error}");}
        assert_eq!(c.host.prepared.as_ref().unwrap().saved.score,before);assert!(!c.history.view().can_undo);
        let changed=root.join("changed.ultra");std::fs::copy(&path,&changed).unwrap();std::fs::write(&path,original).unwrap();
        let mut recovered=before.clone();for i in 0..2{let id=recovered.tracks[i].id.clone();let reference=capture_device(&changed,&recovered).unwrap();change_device(&mut recovered,&id,"replace",before.tracks[i].instrument().map(|d|d.instance_id.as_str()),None,Some(reference)).unwrap();prepare(&current.saved.with_score(recovered.clone()),&root.join("session.alive")).unwrap();}
        std::fs::remove_dir_all(root).unwrap();
    }

#[test]
fn workspace_source_edits_preserve_occurrence_identity_and_reject_invalid_bindings_transactionally() {
        if super::super::native_master::fresh_process("session::desktop::tests::workspace_source_edits_preserve_occurrence_identity_and_reject_invalid_bindings_transactionally"){return}
        let _guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
        use workspaces::WorkspaceEditV4 as E;
        let mut c=workspace_control();c.host.install(read(&Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/quantized-midi.alive")).unwrap()).unwrap();let p=&c.host.prepared.as_ref().unwrap().saved.score;let source=p.sources[0].id().to_owned();let track=p.sources[0].track_id().to_owned();
        let result=c.workspace_edit("main",E::SourceRename{source_id:source.clone(),name:"Shared musical source".into()},7,0).unwrap();assert_eq!(result.track_id.as_deref(),Some(track.as_str()));assert_eq!(result.source_id.as_deref(),Some(source.as_str()));assert!(result.slot_id.is_none()&&result.placement_id.is_none());
        let before=c.host.prepared.as_ref().unwrap().saved.clone();let ids=c.history.identities();let bad=vec![Lane{instance_id:"forged-instance".into(),key:"cutoff".into(),enabled:true,points:vec![]}];
        assert!(c.workspace_edit("main",E::AutomationSet{source_id:source,lanes:bad},7,1).is_err());assert_eq!(c.host.prepared.as_ref().unwrap().saved,before);assert_eq!(c.edit_revision,1);assert_eq!(c.history.identities(),ids);
    }

#[test]
fn unavailable_launch_settings_allow_explicit_supported_recovery() {
        if super::super::native_master::fresh_process("session::desktop::tests::unavailable_launch_settings_allow_explicit_supported_recovery"){return;}
        let _guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
        let mut c=musical_control();
        let mut p=read(&Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/midi-arrangement.alive")).unwrap();
        let id=p.saved.score.tracks[0].slots[0].as_ref().unwrap().id.clone();
        p.saved.launch.global_quantization=launch::Quantization::Eighth;
        p.saved.launch.clip_quantization.push(launch::Override{occurrence_id:id.clone(),quantization:launch::ClipQuantization::Sixteenth});
        c.host.install(p).unwrap();let generation=c.generation;let preparation=c.host.preparation_revision.to_string();
        assert!(!super::super::native_launch::available(c.host.preparation_revision));
        assert!(c.launch_settings("main",generation,&preparation,0,launch::Edit::Global{quantization:launch::Quantization::None}).is_err());
        assert_eq!(c.current_launch().global_quantization,launch::Quantization::Eighth);
        c.launch_settings("main",generation,&preparation,0,launch::Edit::Global{quantization:launch::Quantization::Bar1}).unwrap();
        assert_eq!(c.current_launch().effective(Some(&id)),launch::Quantization::Sixteenth);
        assert!(super::super::native_launch::submit_v4(&native::RequestV4{preparation_revision:c.host.preparation_revision,..Default::default()},c.current_launch().effective(Some(&id)),&mut native::ReceiptV4::default()).is_err());
        c.launch_settings("main",generation,&preparation,1,launch::Edit::Clip{occurrence_id:id,quantization:launch::ClipQuantization::Global}).unwrap();
        assert_eq!(c.current_launch(),launch::LaunchSettings::default());
        assert_eq!(c.host.preparation_revision.to_string(),preparation);
        c.history(Direction::Undo,generation,2).unwrap();assert_eq!(c.current_launch().clip_quantization.len(),1);
    }

    #[test]
    fn master_queue_full_preserves_owner_and_allows_retry() {
        if native_master::fresh_process("session::desktop::tests::master_queue_full_preserves_owner_and_allows_retry"){return;}
        let _guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
        let mut c=musical_control();c.accepted_serial=c.host.install(c.host.prepared.clone().unwrap()).unwrap();
        let old=c.host.prepared.as_ref().unwrap().saved.score.clone();let mut renamed=old.clone();renamed.title="Musical history".into();
        c.history.record(&old,&renamed,"Rename").unwrap();c.host.prepared.as_mut().unwrap().saved.score=renamed;
        let before=c.host.prepared.as_ref().unwrap().saved.clone();let accepted=c.accepted_serial;let revision=c.edit_revision;
        let history=serde_json::to_value(c.history.view()).unwrap();
        assert_eq!(unsafe{native::ultra_external_start()},1);
        let capability=native::master_capability().unwrap();
        for _ in 0..64{assert_eq!(unsafe{(capability.set)(1,1.,native_master::next_serial().unwrap())},1);}
        let error=c.master_gain("main",7,0.5).unwrap_err();assert_eq!(error.code,"FULL");
        assert!(matches!(c.master_reset("main",7),Err(MasterError{code:"FULL",..})));
        assert_eq!(c.host.prepared.as_ref().unwrap().saved,before);assert_eq!(c.accepted_serial,accepted);
        assert_eq!(c.edit_revision,revision);assert_eq!(serde_json::to_value(c.history.view()).unwrap(),history);assert!(!c.dirty);
        unsafe{native::ultra_audio_stop();}
        let receipt=c.master_gain("main",7,0.5).unwrap();assert!(receipt.changed);assert!(c.accepted_serial>accepted);
        assert_eq!(c.host.prepared.as_ref().unwrap().saved.master.gain,0.5);assert!(c.dirty);
        assert_eq!(serde_json::to_value(c.history.view()).unwrap(),history);
        unsafe{native::alive_session_reset();for slot in 0..16{crate::ultra_canvas_close_document(slot);}}
    }

    #[test]
    fn save_owner_commits_only_after_atomic_rename() {
        let mut c=musical_control();c.dirty=true;c.host.prepared.as_mut().unwrap().saved.master.gain=0.5;
        let old=c.host.prepared.as_ref().unwrap().saved.score.clone();let mut renamed=old.clone();renamed.title="Saved music".into();
        c.history.record(&old,&renamed,"Rename").unwrap();c.host.prepared.as_mut().unwrap().saved.score=renamed;
        let before=c.host.prepared.as_ref().unwrap().saved.clone();let revision=c.edit_revision;
        let history=serde_json::to_value(c.history.view()).unwrap();
        let root=std::env::temp_dir().join(format!("alive-atomic-control-save-{}",std::process::id()));
        std::fs::create_dir_all(root.join("blocked.alive")).unwrap();
        assert!(save_to_path(&mut c,&root.join("blocked.alive")).is_err());
        assert_eq!(c.host.prepared.as_ref().unwrap().saved,before);assert_eq!(c.edit_revision,revision);
        assert_eq!(serde_json::to_value(c.history.view()).unwrap(),history);assert!(c.dirty);assert!(c.saved_path.is_none());
        let path=root.join("saved.alive");save_to_path(&mut c,&path).unwrap();assert!(!c.dirty);assert_eq!(c.saved_path.as_deref(),Some(path.as_path()));
        let reopened=persistence::decode(&std::fs::read_to_string(&path).unwrap(),&path).unwrap();
        assert_eq!(reopened,c.host.prepared.as_ref().unwrap().saved);assert_eq!(reopened.master.gain,0.5);
        assert_eq!(serde_json::to_value(c.history.view()).unwrap(),history);std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn snapshot_keeps_publication_and_preview_admission_independent() {
        if native_master::fresh_process("session::desktop::tests::snapshot_keeps_publication_and_preview_admission_independent"){return;}
        let _guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();let mut c=musical_control();
        let path=Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/midi-arrangement.alive");
        c.host.install(read(&path).unwrap()).unwrap();
        assert!(native_publication::require(c.host.preparation_revision).is_ok());
        assert!(native_midi::require(c.host.preparation_revision).is_err());
        let snapshot=c.snapshot("main").unwrap();assert!(snapshot.capabilities.midi_edit);assert!(!snapshot.capabilities.midi_preview);
        assert!(snapshot.capabilities.midi_unavailable_reason.unwrap().contains("MIDI Preview"));
        unsafe{native::alive_session_reset();for slot in 0..16{crate::ultra_canvas_close_document(slot);}}
    }
}
