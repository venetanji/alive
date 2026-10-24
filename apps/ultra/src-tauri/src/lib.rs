mod canvas;
#[cfg(target_os = "linux")]
mod canvas_pinch;
mod help_reference;
mod audio;
mod documents;
mod document_windows;
mod instrument_probe;
mod session;
use serde::{Deserialize, Serialize};
use std::{
    ffi::{c_char, CStr},
    sync::{atomic::{AtomicBool, Ordering}, Arc, Mutex},
    time::Duration,
};
use tauri::Manager;
struct AudioControl { graphs: [canvas::CanvasState; documents::MAX_DOCUMENTS] }
impl Default for AudioControl {
    fn default() -> Self { Self { graphs: std::array::from_fn(|_| canvas::CanvasState::default()) } }
}
struct Audio(Mutex<AudioControl>);
struct AudioIo(Mutex<audio::Driver>);
struct CanvasIdleClock(Arc<AtomicBool>);
extern "C" {
    #[cfg(test)]
    fn ultra_canvas_install(graph: *const canvas::NativeGraph) -> i32;
    #[cfg(test)]
    fn ultra_canvas_event(
        revision: u64,
        node: u32,
        inlet: u32,
        count: u32,
        values: *const f64,
    ) -> i32;
    #[cfg(test)]
    fn ultra_canvas_message(revision: u64, node: u32, inlet: u32, message: *const canvas::NativeMessage) -> i32;
    fn ultra_canvas_idle_tick();
    #[cfg(test)]
    fn ultra_canvas_param(revision: u64, node: u32, param: u32, value: f64) -> i32;
    #[cfg(test)]
    fn ultra_canvas_stop();
    #[cfg(test)]
    fn ultra_canvas_status(status: *mut canvas::NativeStatus);
    #[cfg(test)]
    fn ultra_canvas_console(records: *mut canvas::NativeConsoleRecord, capacity: u32, dropped: *mut u64) -> u32;
    fn ultra_canvas_install_document(document: u32, graph: *const canvas::NativeGraph) -> i32;
    fn ultra_canvas_message_document(document: u32, revision: u64, node: u32, inlet: u32, message: *const canvas::NativeMessage) -> i32;
    fn ultra_canvas_tab_document(document: u32, revision: u64, node: u32) -> i32;
    fn ultra_canvas_message_text_document(document: u32, revision: u64, node: u32, serial: u64, text: *const c_char, length: u32) -> i32;
    fn ultra_canvas_message_boxes_document(document: u32, snapshot: *mut canvas::NativeMessageBoxSnapshot) -> i32;
    fn ultra_canvas_print_popups_document(document: u32, snapshot: *mut canvas::NativePrintPopupSnapshot) -> i32;
    fn ultra_canvas_param_hot_document(document: u32, revision: u64, node: u32, param: u32, value: f64, hot: u32) -> i32;
    fn ultra_canvas_stop_document(document: u32) -> i32;
    fn ultra_canvas_close_document(document: u32) -> i32;
    fn ultra_canvas_status_document(document: u32, status: *mut canvas::NativeStatus);
    fn ultra_canvas_console_document(document: u32, records: *mut canvas::NativeConsoleRecord, capacity: u32, dropped: *mut u64) -> u32;
    fn ultra_canvas_stop_all();
    #[cfg(test)]
    fn ultra_audio_stop();
    fn ultra_audio_event(device: u32, kind: u32, note: u32, value: u32) -> i32;
    fn ultra_audio_sequence(config: *const NativeSequenceConfig) -> i32;
    fn ultra_sequence_enabled() -> u32;
    fn ultra_sequence_step() -> u32;
    fn ultra_sequence_note() -> u32;
    fn ultra_sequence_ticks() -> u64;
    fn ultra_sequence_clock_source() -> u32;
    fn ultra_audio_panic();
    fn ultra_audio_routes(mask: u32);
    fn ultra_audio_error() -> *const c_char;
    fn ultra_audio_frames() -> u64;
    fn ultra_audio_rejected() -> u64;
    fn ultra_audio_flags() -> u32;
    fn ultra_audio_period() -> u32;
    fn ultra_audio_xruns() -> u32;
}
#[derive(Serialize)]
struct Status {
    running: bool,
    ready: bool,
    fault: bool,
    server_lost: bool,
    #[serde(serialize_with="decimal_u64")]
    frames: u64,
    #[serde(serialize_with="decimal_u64")]
    rejected: u64,
    period: u32,
    xruns: u32,
    sample_rate: u32,
    delay_frames: u32,
    sequence_enabled: bool,
    sequence_step: u32,
    sequence_note: u32,
    #[serde(serialize_with="decimal_u64")]
    sequence_ticks: u64,
    sequence_clock_source: u32,
    message: String,
    output: Option<audio::Snapshot>,
}
fn decimal_u64<S:serde::Serializer>(value:&u64,serializer:S)->Result<S::Ok,S::Error>{serializer.serialize_str(&value.to_string())}
fn status() -> Status {
    unsafe {
        let f = ultra_audio_flags();
        Status {
            running: f & 1 != 0,
            ready: f & 2 != 0,
            fault: f & 4 != 0,
            server_lost: f & 8 != 0,
            frames: ultra_audio_frames(),
            rejected: ultra_audio_rejected(),
            period: ultra_audio_period(),
            xruns: ultra_audio_xruns(),
            sample_rate: 48000,
            delay_frames: 64,
            sequence_enabled: ultra_sequence_enabled() != 0,
            sequence_step: ultra_sequence_step(),
            sequence_note: ultra_sequence_note(),
            sequence_ticks: ultra_sequence_ticks(),
            sequence_clock_source: ultra_sequence_clock_source(),
            message: CStr::from_ptr(ultra_audio_error())
                .to_string_lossy()
                .into_owned(),
            output: None,
        }
    }
}
fn device_status(io: &mut audio::Driver) -> Status {
    let mut result = status();
    let output = io.snapshot();
    result.period = output.observed_buffer_frames;
    if output.failed {
        result.fault = true;
        result.ready = false;
        result.running = false;
    }
    if output.failed || !result.fault { result.message = output.message.clone(); }
    result.output = Some(output);
    result
}
#[tauri::command]
fn audio_status(state: tauri::State<Audio>, io: tauri::State<AudioIo>) -> Result<Status, String> {
    let _lock = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    let mut io = io.0.lock().map_err(|_| "Audio device lock poisoned")?;
    Ok(device_status(&mut io))
}
#[tauri::command]
fn audio_start(state: tauri::State<Audio>, io: tauri::State<AudioIo>) -> Result<Status, String> {
    let _lock = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    let mut io = io.0.lock().map_err(|_| "Audio device lock poisoned")?;
    io.start()?;
    Ok(device_status(&mut io))
}
#[tauri::command]
fn audio_stop(state: tauri::State<Audio>, io: tauri::State<AudioIo>) -> Result<Status, String> {
    let _lock = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    let mut io = io.0.lock().map_err(|_| "Audio device lock poisoned")?;
    unsafe {
        ultra_canvas_stop_all();
    }
    io.stop()?;
    Ok(device_status(&mut io))
}
#[tauri::command]
fn audio_diagnostics(state:tauri::State<Audio>,io:tauri::State<AudioIo>,after:String)->Result<serde_json::Value,String>{
    let _lock=state.0.lock().map_err(|_|"Audio control lock poisoned")?;
    let cursor=after.parse::<u64>().map_err(|_|"Invalid epoch cursor")?;if cursor.to_string()!=after{return Err("Invalid epoch cursor".into());}
    Ok(io.0.lock().map_err(|_|"Audio device lock poisoned")?.diagnostics(cursor))
}
#[tauri::command]
fn audio_devices(io: tauri::State<AudioIo>, host: Option<String>) -> Result<audio::Catalog, String> {
    let mut io = io.0.lock().map_err(|_| "Audio device lock poisoned")?;
    let selected = host.unwrap_or_else(|| io.snapshot().config.host);
    io.catalog(&selected)
}
#[tauri::command]
fn audio_configure(state: tauri::State<Audio>, io: tauri::State<AudioIo>, config: audio::Config) -> Result<Status, String> {
    let _lock = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    let mut io = io.0.lock().map_err(|_| "Audio device lock poisoned")?;
    io.configure(config)?;
    Ok(device_status(&mut io))
}
#[tauri::command]
fn audio_panic(state: tauri::State<Audio>) -> Result<Status, String> {
    let _lock = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    unsafe {
        ultra_canvas_stop_all();
        ultra_audio_panic();
    }
    Ok(status())
}
#[tauri::command]
fn note_event(
    state: tauri::State<Audio>,
    device: u32,
    kind: u32,
    note: u32,
    value: u32,
) -> Result<bool, String> {
    let _lock = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    if device > 1 || kind > 7 || note > 127 || value > 127 {
        return Err("Invalid event".into());
    }
    Ok(unsafe { ultra_audio_event(device, kind, note, value) != 0 })
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct SequenceConfig {
    enabled: bool,
    bpm: u32,
    root: u32,
    chord: u32,
    steps: u32,
    gate: u32,
    velocity: u32,
    transpose: i32,
    clock_source: u32,
}
#[repr(C)]
struct NativeSequenceConfig {
    enabled: u32,
    bpm: u32,
    root: u32,
    chord: u32,
    steps: u32,
    gate: u32,
    velocity: u32,
    transpose: i32,
    clock_source: u32,
}
impl SequenceConfig {
    fn validate(&self) -> Result<(), String> {
        if !(30..=240).contains(&self.bpm)
            || !(24..=84).contains(&self.root)
            || self.chord > 2
            || !(1..=8).contains(&self.steps)
            || !(10..=90).contains(&self.gate)
            || !(1..=127).contains(&self.velocity)
            || !(-24..=24).contains(&self.transpose)
            || self.clock_source > 1
        {
            return Err("Invalid sequence: BPM 30–240, root 24–84, chord 0–2, steps 1–8, gate 10–90%, velocity 1–127, transpose -24–24, clock source 0–1".into());
        }
        Ok(())
    }
    fn native(&self) -> NativeSequenceConfig {
        NativeSequenceConfig {
            enabled: u32::from(self.enabled),
            bpm: self.bpm,
            root: self.root,
            chord: self.chord,
            steps: self.steps,
            gate: self.gate,
            velocity: self.velocity,
            transpose: self.transpose,
            clock_source: self.clock_source,
        }
    }
}
#[tauri::command]
fn sequence_config(state: tauri::State<Audio>, config: SequenceConfig) -> Result<bool, String> {
    let _lock = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    config.validate()?;
    Ok(unsafe { ultra_audio_sequence(&config.native()) != 0 })
}
#[derive(Deserialize)]
struct Node {
    id: String,
    r#type: String,
    device: u32,
}
#[derive(Deserialize)]
struct Edge {
    from: String,
    to: String,
}
#[derive(Serialize)]
struct PatchResult {
    route_mask: u32,
}
fn validate_patch(nodes: &[Node], edges: &[Edge]) -> Result<u32, String> {
    use std::collections::{HashMap, HashSet};
    if nodes.len() > 8 || edges.len() > 6 {
        return Err("Research patch supports at most eight objects and six cords".into());
    }
    let mut by_id = HashMap::new();
    let mut kinds = HashSet::new();
    for n in nodes {
        if n.id.is_empty()
            || n.id.len() > 64
            || n.device > 1
            || !["note", "faust", "gain", "dac"].contains(&n.r#type.as_str())
            || by_id.insert(n.id.as_str(), n).is_some()
            || !kinds.insert((n.device, n.r#type.as_str()))
        {
            return Err("Unsupported, duplicate or invalid object".into());
        }
    }
    let mut cords = HashSet::new();
    for e in edges {
        let a = by_id.get(e.from.as_str()).ok_or("Unknown cord source")?;
        let b = by_id.get(e.to.as_str()).ok_or("Unknown cord destination")?;
        if a.device != b.device
            || !matches!(
                (a.r#type.as_str(), b.r#type.as_str()),
                ("note", "faust") | ("faust", "gain") | ("gain", "dac")
            )
            || !cords.insert((a.device, a.r#type.as_str(), b.r#type.as_str()))
        {
            return Err("Only note → Faust → gain → output chains are supported".into());
        }
    }
    let mut mask = 0;
    for d in 0..2 {
        if [("note", "faust"), ("faust", "gain"), ("gain", "dac")]
            .iter()
            .all(|(a, b)| cords.contains(&(d, *a, *b)))
        {
            mask |= 1 << d
        }
    }
    Ok(mask)
}
#[tauri::command]
fn patch_apply(
    state: tauri::State<Audio>,
    nodes: serde_json::Value,
    edges: serde_json::Value,
) -> Result<PatchResult, String> {
    let _lock = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    let parsed = serde_json::from_value::<Vec<Node>>(nodes)
        .and_then(|nodes| serde_json::from_value::<Vec<Edge>>(edges).map(|edges| (nodes, edges)));
    let (nodes, edges) = match parsed {
        Ok(value) => value,
        Err(e) => {
            unsafe { ultra_audio_routes(0) };
            return Err(format!("Invalid patch data: {e}"));
        }
    };
    match validate_patch(&nodes, &edges) {
        Ok(mask) => {
            unsafe { ultra_audio_routes(mask) };
            Ok(PatchResult { route_mask: mask })
        }
        Err(e) => {
            unsafe { ultra_audio_routes(0) };
            Err(e)
        }
    }
}
#[derive(Serialize)]
struct CanvasRevision {
    revision: u64,
}
#[derive(Serialize)]
struct CanvasObservation {
    id: u32,
    value: f64,
    pulses: u64,
}
#[derive(Serialize)]
struct CanvasStatus {
    revision: u64,
    active: bool,
    nodes: Vec<CanvasObservation>,
    console: Vec<canvas::ConsoleRecord>,
    console_dropped: u64,
    message_boxes: Option<canvas::MessageBoxSnapshot>,
    print_popups: Option<canvas::PrintPopupSnapshot>,
}

#[derive(Serialize)]
struct CanvasMessageTextSerial { serial: u64 }

#[tauri::command]
fn canvas_message_text(window: tauri::WebviewWindow, documents: tauri::State<document_windows::Documents>, state: tauri::State<Audio>,
    revision: u64, node: u32, text: String) -> Result<CanvasMessageTextSerial,String> {
    let mut registry=documents.0.lock().map_err(|_| "Document lock poisoned")?;
    let owner=registry.get_open(window.label())?;
    if revision!=owner.runtime_revision { return Err("Stale canvas revision".into()); }
    let base=owner.authoring_revision;let mut patch=owner.patch.clone().unwrap();
    fn update(scope: &mut serde_json::Value,id: u32,text: &str)->bool {
        let Some(nodes)=scope.get_mut("nodes").and_then(serde_json::Value::as_array_mut) else { return false; };
        for node in nodes {
            if node["id"].as_u64()==Some(u64::from(id)) { if node["type"]!="message_box" { return false; }node["params"]["text"]=serde_json::json!(text);return true; }
            if let Some(child)=node.get_mut("patcher") { if update(child,id,text) { return true; } }
        }
        false
    }
    if !update(&mut patch,node,&text) { return Err("Text actions require message_box".into()); }
    let hint=document_windows::commands::MessageText {node,text};
    let mut audio=state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    let result=registry.commit(window.label(),base,patch,true,|owner,patch| {
        document_windows::commands::admit_message(&mut audio.graphs[owner.id as usize],owner,patch,None,Some(&hint),false)
    })?;
    drop(audio);document_windows::commands::broadcast(window.app_handle(),&registry,window.label());
    Ok(CanvasMessageTextSerial {serial:result.document.message_text_serial})
}

fn with_canvas<T>(window: &tauri::WebviewWindow, documents: &document_windows::Documents, state: &Audio,
    operation: impl FnOnce(u32, &mut canvas::CanvasState) -> Result<T, String>) -> Result<T, String> {
    // Keep identity locked until admission; a closing window cannot address a reused slot.
    let registry = documents.0.lock().map_err(|_| "Document lock poisoned")?;
    let document = registry.get_open(window.label())?;
    let mut audio = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    operation(document.id, &mut audio.graphs[document.id as usize])
}

#[tauri::command]
async fn canvas_apply(
    window: tauri::WebviewWindow,
    documents: tauri::State<'_, document_windows::Documents>,
    state: tauri::State<'_, Audio>,
    patch: serde_json::Value,
) -> Result<CanvasRevision, String> {
    let mut registry = documents.0.lock().map_err(|_| "Document lock poisoned")?;
    let base = registry.get_open(window.label())?.authoring_revision;
    let mut audio = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    let result = registry.commit(window.label(), base, patch, true, |owner, patch| {
        document_windows::commands::admit(&mut audio.graphs[owner.id as usize], owner, patch, None, false)
    })?;
    let obsolete = document_windows::commands::changed(window.app_handle(), &mut registry, &result.document.owner_label);
    drop(audio); drop(registry);
    document_windows::commands::close_views(window.app_handle(), obsolete);
    Ok(CanvasRevision { revision: result.document.runtime_revision })
}
#[tauri::command]
fn canvas_event(
    window: tauri::WebviewWindow,
    documents: tauri::State<document_windows::Documents>,
    state: tauri::State<Audio>,
    revision: u64,
    node: u32,
    inlet: u32,
    value: serde_json::Value,
    action: Option<String>,
) -> Result<bool, String> {
    with_canvas(&window, &documents, &state, |id, control| {
        let admitted = if let Some(action) = action.as_deref() {
            control.ui_action(revision, node, inlet, &value, action)?;
            unsafe { ultra_canvas_tab_document(id, revision, node) }
        } else {
            let event = control.event(revision, node, inlet, value)?;
            unsafe { ultra_canvas_message_document(id, revision, node, inlet, &event) }
        };
        if admitted == 0 {
            return Err("Canvas event was not admitted; check the active revision and message".into());
        }
        Ok(true)
    })
}
#[tauri::command]
fn canvas_param(
    window: tauri::WebviewWindow,
    documents: tauri::State<document_windows::Documents>,
    state: tauri::State<Audio>,
    revision: u64,
    node: u32,
    key: String,
    value: f64,
) -> Result<bool, String> {
    let mut registry = documents.0.lock().map_err(|_| "Document lock poisoned")?;
    let owner = registry.get_open(window.label())?;
    if revision != owner.runtime_revision { return Err("Stale canvas revision".into()); }
    let base = owner.authoring_revision;
    let mut patch = owner.patch.clone().unwrap();
    fn update(scope: &mut serde_json::Value, id: u32, key: &str, value: f64) -> bool {
        let Some(nodes) = scope.get_mut("nodes").and_then(serde_json::Value::as_array_mut) else { return false; };
        for node in nodes {
            if node["id"].as_u64() == Some(u64::from(id)) { node["params"][key] = serde_json::json!(value); return true; }
            if let Some(child) = node.get_mut("patcher") { if update(child, id, key, value) { return true; } }
        }
        false
    }
    if !update(&mut patch, node, &key, value) { return Err("Unknown canvas node".into()); }
    let parameter = document_windows::commands::Parameter { node, key, value, hot: false };
    let mut audio = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    registry.commit(window.label(), base, patch, true, |owner, patch| {
        document_windows::commands::admit(&mut audio.graphs[owner.id as usize], owner, patch, Some(&parameter), false)
    })?;
    drop(audio);
    document_windows::commands::broadcast(window.app_handle(), &registry, window.label());
    Ok(true)
}
#[tauri::command]
fn canvas_stop(window: tauri::WebviewWindow, documents: tauri::State<document_windows::Documents>, state: tauri::State<Audio>) -> Result<bool, String> {
    with_canvas(&window, &documents, &state, |id, _| {
        if unsafe { ultra_canvas_stop_document(id) } == 0 { return Err("Patch stop was not admitted. Try again.".into()); }
        Ok(true)
    })
}
#[tauri::command]
fn canvas_status(window: tauri::WebviewWindow, documents: tauri::State<document_windows::Documents>, state: tauri::State<Audio>) -> Result<CanvasStatus, String> {
    let mut registry = documents.0.lock().map_err(|_| "Document lock poisoned")?;
    let id = registry.get_open(window.label())?.id;
    let _audio = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    let mut snapshot = canvas::NativeStatus::default();
    unsafe {
        ultra_canvas_status_document(id, &mut snapshot);
    }
    if snapshot.node_count as usize > canvas::MAX_NODES {
        return Err("Invalid native canvas status".into());
    }
    let mut nodes = Vec::with_capacity(snapshot.node_count as usize);
    for node in &snapshot.nodes[..snapshot.node_count as usize] {
        if !node.value.is_finite() {
            return Err("Non-finite native canvas observation".into());
        }
        nodes.push(CanvasObservation {
            id: node.id,
            value: node.value,
            pulses: node.pulses,
        });
    }
    let mut records = [canvas::NativeConsoleRecord::default(); 128];
    let mut console_dropped = 0;
    let count = unsafe { ultra_canvas_console_document(id,records.as_mut_ptr(),128,&mut console_dropped) } as usize;
    if count > records.len() { return Err("Invalid native console count".into()); }
    let console = records[..count].iter().map(canvas::console_record).collect::<Result<Vec<_>,_>>()?;
    let (console, console_dropped) = registry.console(window.label(), console, console_dropped)?;
    let mut message_snapshot=canvas::NativeMessageBoxSnapshot::default();
    let message_boxes=if unsafe { ultra_canvas_message_boxes_document(id,&mut message_snapshot) }!=0 {
        Some(canvas::message_box_snapshot(&message_snapshot)?)
    } else { None };
    let mut print_snapshot=canvas::NativePrintPopupSnapshot::default();
    let print_popups=if unsafe { ultra_canvas_print_popups_document(id,&mut print_snapshot) }!=0 {
        Some(canvas::print_popup_snapshot(&print_snapshot)?)
    } else { None };
    Ok(CanvasStatus {
        revision: snapshot.revision,
        active: snapshot.active != 0,
        nodes,
        console,
        console_dropped,
        message_boxes,
        print_popups,
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    // The FFI library retains one workspace and revision history for this process.
    pub(crate) static NATIVE_FFI_TEST_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

    #[test]
    fn native_documents_forward_typed_messages_and_keep_other_graph_state() {
        let _native_guard = NATIVE_FFI_TEST_LOCK.lock().unwrap();
        const SOURCE_DOCUMENT: u32 = 1;
        const RECEIVE_DOCUMENT: u32 = 2;
        const OTHER_DOCUMENT: u32 = 3;
        let make = |nodes: serde_json::Value, edges: serde_json::Value| canvas::prepare(serde_json::json!({"version":1,"profile":"ultra-canvas-v1","nodes":nodes,"edges":edges})).unwrap().native;
        let node = |id,kind,params| serde_json::json!({"id":id,"type":kind,"x":0,"y":0,"params":params});
        let edge = |from,to| serde_json::json!({"from":from,"outlet":0,"to":to,"inlet":0});
        let mut source = make(serde_json::json!([node(1,"number",serde_json::json!({"value":42})),node(2,"send",serde_json::json!({"name":"ffi-cross-patch"}))]),serde_json::json!([edge(1,2)]));
        let mut receiver = make(serde_json::json!([node(1,"receive",serde_json::json!({"name":"ffi-cross-patch"})),node(2,"number",serde_json::json!({})),node(3,"print",serde_json::json!({"label":"other-window"}))]),serde_json::json!([edge(1,2),edge(1,3)]));
        let mut status = canvas::NativeStatus::default();
        unsafe { ultra_canvas_status_document(SOURCE_DOCUMENT,&mut status); }
        source.revision = status.revision + 1;
        unsafe { ultra_canvas_status_document(RECEIVE_DOCUMENT,&mut status); }
        receiver.revision = status.revision + 1;
        assert_eq!(unsafe { ultra_canvas_install_document(SOURCE_DOCUMENT,&source) },1);
        assert_eq!(unsafe { ultra_canvas_install_document(RECEIVE_DOCUMENT,&receiver) },1);
        assert_eq!(unsafe { ultra_canvas_message_document(SOURCE_DOCUMENT,source.revision,1,0,&canvas::NativeMessage::default()) },1);
        unsafe { ultra_canvas_status_document(RECEIVE_DOCUMENT,&mut status); }
        assert_eq!(status.nodes[..status.node_count as usize].iter().find(|node|node.id==2).unwrap().value,42.);
        let pulses = status.nodes[..status.node_count as usize].iter().find(|node|node.id==2).unwrap().pulses;
        let mut unrelated = make(serde_json::json!([]),serde_json::json!([]));
        unsafe { ultra_canvas_status_document(OTHER_DOCUMENT,&mut status); }
        unrelated.revision = status.revision + 1;
        assert_eq!(unsafe { ultra_canvas_install_document(OTHER_DOCUMENT,&unrelated) },1);
        assert_eq!(unsafe { ultra_canvas_close_document(OTHER_DOCUMENT) },1);
        unsafe { ultra_canvas_status_document(RECEIVE_DOCUMENT,&mut status); }
        assert_eq!(status.nodes[..status.node_count as usize].iter().find(|node|node.id==2).unwrap().pulses,pulses,"another window's open/close reset this graph");
        let mut decoder = canvas::CanvasState::default();
        let decoding_revision = decoder.install(canvas::Prepared { native: source.clone() }, |_| true).unwrap();
        let text = decoder.event(decoding_revision,2,0,serde_json::json!("notice hello 2.25")).unwrap();
        assert_eq!(unsafe { ultra_canvas_message_document(SOURCE_DOCUMENT,source.revision,2,0,&text) },1);
        let mut records = [canvas::NativeConsoleRecord::default();128]; let mut dropped=0;
        let count = unsafe { ultra_canvas_console_document(RECEIVE_DOCUMENT,records.as_mut_ptr(),128,&mut dropped) };
        let rows = records[..count as usize].iter().map(canvas::console_record).collect::<Result<Vec<_>,_>>().unwrap();
        assert_eq!(rows.last().unwrap().text,"notice hello 2.25");
        assert_eq!(rows.last().unwrap().label,"other-window");
        assert_eq!(unsafe { ultra_canvas_close_document(RECEIVE_DOCUMENT) },1);
        assert_eq!(unsafe { ultra_canvas_message_document(RECEIVE_DOCUMENT,receiver.revision,2,0,&text) },0,"closed documents still accepted events");
        assert_eq!(unsafe { ultra_canvas_close_document(SOURCE_DOCUMENT) },1);
    }
    #[test]
    fn native_canvas_ffi_retains_admitted_graph_while_stopped() {
        let _native_guard = NATIVE_FFI_TEST_LOCK.lock().unwrap();
        // Exercise the actual shared-library ABI, not a mock installer. This test
        // never opens JACK or a desktop and does not enable audio playback.
        let patch = serde_json::from_str(include_str!("../../ui/canvas-preset.json")).unwrap();
        let plan = canvas::prepare(patch).unwrap();
        let mut invalid = plan.native.clone();
        let mut control = canvas::CanvasState::default();
        let revision = control
            .install(plan, |graph| unsafe { ultra_canvas_install(graph) != 0 })
            .unwrap();
        assert_eq!(revision, 1);
        let mut snapshot = canvas::NativeStatus::default();
        unsafe {
            ultra_canvas_status(&mut snapshot);
        }
        assert_eq!(snapshot.revision, revision);
        assert_eq!(snapshot.active, 1);
        assert!(snapshot.node_count > 0);
        // Update a live gain in the actual native admitted plan while stopped.
        control
            .parameter(revision, 7, "value", 4., |slot, value| unsafe {
                ultra_canvas_param(revision, 7, slot, value) != 0
            })
            .unwrap();
        unsafe {
            ultra_canvas_status(&mut snapshot);
        }
        assert_eq!(
            snapshot.nodes[..snapshot.node_count as usize]
                .iter()
                .find(|node| node.id == 7)
                .unwrap()
                .value,
            4.
        );
        // Native independently rejects malformed plans and stale generations.
        invalid.revision = revision + 1;
        invalid.nodes[0].kind = 99;
        assert_eq!(unsafe { ultra_canvas_install(&invalid) }, 0);
        assert_eq!(unsafe { ultra_canvas_param(revision + 1, 7, 0, 3.) }, 0);
        let values = [60., 100.];
        assert_eq!(
            unsafe { ultra_canvas_event(revision, 6, 0, 2, values.as_ptr()) },
            1
        );
        unsafe {
            ultra_canvas_stop();
            ultra_audio_stop();
            ultra_canvas_status(&mut snapshot);
        }
        assert_eq!(snapshot.revision, revision);
        assert_eq!(snapshot.active, 1);
        assert_eq!(
            snapshot.nodes[..snapshot.node_count as usize]
                .iter()
                .find(|node| node.id == 7)
                .unwrap()
                .value,
            4.
        );
        // Every shipped object example passes both Rust preparation and actual
        // native graph admission, with monotonically increasing generations.
        for example in [
            include_str!("../../examples/int.ultra"),
            include_str!("../../examples/float.ultra"),
            include_str!("../../examples/flonum.ultra"),
            include_str!("../../examples/slider.ultra"),
            include_str!("../../examples/pack.ultra"),
            include_str!("../../examples/unpack.ultra"),
            include_str!("../../examples/select.ultra"),
            include_str!("../../examples/route.ultra"),
            include_str!("../../examples/trigger.ultra"),
            include_str!("../../examples/line.ultra"),
            include_str!("../../examples/print.ultra"),
        ] {
            let prepared = canvas::prepare(serde_json::from_str(example).unwrap()).unwrap();
            control.install(prepared, |graph| unsafe { ultra_canvas_install(graph) != 0 }).unwrap();
        }
        let node = |id,kind,params| serde_json::json!({"id":id,"type":kind,"x":0,"y":0,"params":params});
        let edge = |from,outlet,to,inlet| serde_json::json!({"from":from,"outlet":outlet,"to":to,"inlet":inlet});
        let mut nodes = vec![
            node(1,"int",serde_json::json!({})), node(2,"float",serde_json::json!({})),
            node(3,"flonum",serde_json::json!({})), node(4,"slider",serde_json::json!({})),
            node(5,"pack",serde_json::json!({"args":"0 0."})), node(6,"unpack",serde_json::json!({"args":"0 0."})),
            node(7,"select",serde_json::json!({"args":"7"})), node(8,"route",serde_json::json!({"args":"routekey"})),
            node(9,"trigger",serde_json::json!({"args":"i f"})), node(10,"line",serde_json::json!({"grain":1})),
        ];
        nodes.extend((11..=22).map(|id| node(id,if matches!(id,17|22) {"bang"} else {"number"},serde_json::json!({}))));
        let edges = vec![edge(1,0,11,0),edge(2,0,12,0),edge(3,0,13,0),edge(4,0,14,0),
            edge(5,0,6,0),edge(6,0,15,0),edge(6,1,16,0),edge(7,0,17,0),edge(8,0,18,0),
            edge(9,0,19,0),edge(9,1,20,0),edge(10,0,21,0),edge(10,1,22,0)];
        let prepared = canvas::prepare(serde_json::json!({"version":1,"profile":"ultra-canvas-v1","nodes":nodes,"edges":edges})).unwrap();
        let revision = control.install(prepared, |graph| unsafe { ultra_canvas_install(graph) != 0 }).unwrap();
        for (node,inlet,value) in [
            (1,0,serde_json::json!("3.75")), (2,0,serde_json::json!("4.25")),
            (3,0,serde_json::json!("12.25")), (4,0,serde_json::json!([7])),
            (5,1,serde_json::json!("8.5")), (5,0,serde_json::json!([3])),
            (7,0,serde_json::json!([7])), (8,0,serde_json::json!("routekey 22")),
            (9,0,serde_json::json!("3.75")), (10,0,serde_json::json!("10 10")),
        ] {
            let message = control.event(revision,node,inlet,value).unwrap();
            assert_eq!(unsafe { ultra_canvas_message(revision,node,inlet,&message) },1,"node {node}");
        }
        std::thread::sleep(Duration::from_millis(30));
        unsafe { ultra_canvas_idle_tick(); ultra_canvas_status(&mut snapshot); }
        assert_eq!(unsafe { ultra_audio_flags() } & 1,0,"message execution must not start audio");
        for (id,value) in [(11,3.),(12,4.25),(13,12.25),(14,7.),(15,3.),(16,8.5),(18,22.),(19,3.),(20,3.75),(21,10.)] {
            let observed = snapshot.nodes[..snapshot.node_count as usize].iter().find(|n| n.id==id).unwrap();
            assert_eq!(observed.value,value,"node {id}");
            assert!(observed.pulses>0,"node {id}");
        }
        for id in [17,22] {
            assert_eq!(snapshot.nodes[..snapshot.node_count as usize].iter().find(|n|n.id==id).unwrap().pulses,1,"bang sink {id}");
        }
        let prepared = canvas::prepare(serde_json::from_str(include_str!("../../examples/print.ultra")).unwrap()).unwrap();
        let revision = control.install(prepared, |graph| unsafe { ultra_canvas_install(graph) != 0 }).unwrap();
        for (node,value) in [(1,serde_json::Value::Null),(3,serde_json::json!("75.5")),(2,serde_json::json!("set 4."))] {
            let message = control.event(revision,node,0,value).unwrap();
            assert_eq!(unsafe { ultra_canvas_message(revision,node,0,&message) },1);
        }
        let mut records = [canvas::NativeConsoleRecord::default();128];
        let mut dropped = 0;
        let count = unsafe { ultra_canvas_console(records.as_mut_ptr(),128,&mut dropped) };
        assert_eq!(count,3);assert_eq!(dropped,0);
        let rows = records[..count as usize].iter().map(canvas::console_record).collect::<Result<Vec<_>,_>>().unwrap();
        assert_eq!(rows.iter().map(|r|r.text.as_str()).collect::<Vec<_>>(),vec!["note 60 100","0.51","set 4."]);
        assert_eq!(rows[0].label,"notes");assert_eq!(rows[1].label,"position");
        assert_eq!(rows[0].revision,revision);
        assert_eq!(unsafe { ultra_canvas_console(records.as_mut_ptr(),128,&mut dropped) },0);
        assert_eq!(unsafe { ultra_audio_flags() } & 1,0,"printing must work with audio off");
        unsafe { ultra_canvas_stop(); }
    }

    #[test]
    fn sequence_bounds_and_serialization() {
        let mut c:SequenceConfig=serde_json::from_str(r#"{"enabled":true,"bpm":120,"root":60,"chord":0,"steps":8,"gate":50,"velocity":100,"transpose":0,"clock_source":0}"#).unwrap();
        assert!(c.validate().is_ok());
        assert_eq!(c.native().enabled, 1);
        assert_eq!(std::mem::size_of::<NativeSequenceConfig>(), 36);
        c.bpm = 29;
        assert!(c.validate().is_err());
        c.bpm = 240;
        c.transpose = -25;
        assert!(c.validate().is_err());
        c.transpose = 24;
        c.clock_source = 2;
        assert!(c.validate().is_err());
        c.clock_source = 1;
        c.steps = 0;
        assert!(c.validate().is_err());
    }

    fn chain(device: u32) -> (Vec<Node>, Vec<Edge>) {
        let types = ["note", "faust", "gain", "dac"];
        let nodes = types
            .iter()
            .map(|s| Node {
                id: format!("{device}-{s}"),
                r#type: s.to_string(),
                device,
            })
            .collect();
        let edges = types
            .windows(2)
            .map(|p| Edge {
                from: format!("{device}-{}", p[0]),
                to: format!("{device}-{}", p[1]),
            })
            .collect();
        (nodes, edges)
    }
    #[test]
    fn complete_disconnected_and_empty() {
        let (n, e) = chain(0);
        assert_eq!(validate_patch(&n, &e).unwrap(), 1);
        assert_eq!(validate_patch(&n, &e[..2]).unwrap(), 0);
        assert_eq!(validate_patch(&[], &[]).unwrap(), 0);
    }
    #[test]
    fn independent_routes() {
        let (mut n, mut e) = chain(0);
        let (n2, e2) = chain(1);
        n.extend(n2);
        e.extend(e2);
        assert_eq!(validate_patch(&n, &e).unwrap(), 3);
        e[0].to = "1-faust".into();
        assert!(validate_patch(&n, &e).is_err());
    }
    #[test]
    fn duplicate_objects_rejected() {
        let (mut n, e) = chain(0);
        n[1].id = n[0].id.clone();
        assert!(validate_patch(&n, &e).is_err());
        let (mut n, e) = chain(0);
        n[1].r#type = "note".into();
        assert!(validate_patch(&n, &e).is_err());
    }
    #[test]
    fn invalid_cords_rejected() {
        let (n, mut e) = chain(0);
        e[0].to = "missing".into();
        assert!(validate_patch(&n, &e).is_err());
        e[0].to = "0-note".into();
        assert!(validate_patch(&n, &e).is_err());
        let (n, mut e) = chain(0);
        e.push(Edge {
            from: e[0].from.clone(),
            to: e[0].to.clone(),
        });
        assert!(validate_patch(&n, &e).is_err());
    }
    #[test]
    fn unknown_type_and_bounds_rejected() {
        let (mut n, e) = chain(0);
        n[0].r#type = "eval".into();
        assert!(validate_patch(&n, &e).is_err());
        let (mut n, e) = chain(0);
        n[0].id = "x".repeat(65);
        assert!(validate_patch(&n, &e).is_err());
    }
}
fn cli_info(arguments: &[std::ffi::OsString], app: &str, usage: &str) -> bool {
    if arguments.len() == 2 {
        if arguments[1] == "--help" || arguments[1] == "-h" {
            println!("{usage}");
            return true;
        }
        if arguments[1] == "--version" {
            println!("{app} {}", env!("CARGO_PKG_VERSION"));
            return true;
        }
    }
    false
}

fn session_probe(arguments: &[std::ffi::OsString], app: &str) -> bool {
    if arguments.get(1).is_some_and(|argument|argument=="--session-probe") {
        if arguments.len()!=4 {eprintln!("Usage: {app} --session-probe <session.alive> <output-directory>");std::process::exit(2);}
        match session::probe::run(std::path::Path::new(&arguments[2]),std::path::Path::new(&arguments[3])) {
            Ok(report)=>{println!("{}",serde_json::to_string_pretty(&report).unwrap());return true;},
            Err(error)=>{eprintln!("Alive session probe failed: {error}");std::process::exit(1);},
        }
    }
    false
}

fn require_desktop(app: &str) {
    #[cfg(target_os = "linux")]
    if std::env::var_os("DISPLAY").is_none() && std::env::var_os("WAYLAND_DISPLAY").is_none() {
        eprintln!("{app} needs a Linux desktop session (DISPLAY or WAYLAND_DISPLAY). Run with --help for offline commands.");
        std::process::exit(2);
    }
    let _ = app;
}

/// Alive owns its application identity; devices and optional editors share this process.
pub fn run_alive(context: fn() -> tauri::Context<tauri::Wry>) {
    const USAGE: &str = "Usage: alive [session.alive]\n       alive --session-probe <session.alive> <output-directory>\n       alive --help | --version";
    let arguments: Vec<_> = std::env::args_os().collect();
    if cli_info(&arguments, "alive", USAGE) || session_probe(&arguments, "alive") { return; }
    let path = match &arguments[1..] {
        [] => None,
        [path] if !path.as_encoded_bytes().starts_with(b"-") => Some(path.into()),
        [separator, path] if separator == "--" => Some(path.into()),
        _ => { eprintln!("{USAGE}"); std::process::exit(2); },
    };
    require_desktop("Alive");
    session::desktop::run(context(), path);
}

pub fn run_ultra(context: fn() -> tauri::Context<tauri::Wry>) {
    let arguments:Vec<_>=std::env::args_os().collect();
    if cli_info(&arguments, "ultra", "Usage: ultra [patch.ultra ...]\n       ultra --instrument-probe <patch.ultra> <output-directory>\n       ultra --help | --version\nUse alive [session.alive] for the Alive session host.")
        || session_probe(&arguments, "ultra") { return; }
    if arguments.get(1).is_some_and(|argument|argument=="--instrument-probe") {
        if arguments.len()!=4 {eprintln!("Usage: ultra --instrument-probe <patch.ultra> <output-directory>");std::process::exit(2);}
        match instrument_probe::run(std::path::Path::new(&arguments[2]),std::path::Path::new(&arguments[3])) {
            Ok(report)=>{println!("{}",serde_json::to_string_pretty(&report).unwrap());return;},
            Err(error)=>{eprintln!("Instrument probe failed: {error}");std::process::exit(1);},
        }
    }
    require_desktop("Ultra");
    if arguments.get(1).is_some_and(|argument|argument=="--alive") {
        if arguments.len()>3 { eprintln!("Usage: ultra --alive [session.alive]"); std::process::exit(2); }
        session::desktop::run(context(), arguments.get(2).map(std::path::PathBuf::from));
        return;
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            // The single-instance service can receive files before setup has
            // registered main. Process them only after setup on the event loop.
            let handle = app.clone();
            if let Err(error) = app.run_on_main_thread(move || document_windows::open_arguments(&handle, args, &cwd)) {
                eprintln!("Cannot queue patch file opening: {error}");
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .manage(Audio(Mutex::new(AudioControl::default())))
        .manage(document_windows::Documents::default())
        .manage(CanvasIdleClock(Arc::new(AtomicBool::new(true))))
        .setup(|app| {
            let path = app.path().app_data_dir()?.join("audio-settings.json");
            app.manage(AudioIo(Mutex::new(audio::Driver::load(path))));
            document_windows::initialize(app.handle())?;
            let handle = app.handle().clone();
            let running = app.state::<CanvasIdleClock>().0.clone();
            std::thread::Builder::new().name("ultra-control-clock".into()).spawn(move || {
                while running.load(Ordering::Acquire) {
                    let Some(control) = handle.try_state::<Audio>() else { break; };
                    match control.0.lock() {
                        Ok(_guard) => {
                            if running.load(Ordering::Acquire) {
                                unsafe { ultra_canvas_idle_tick(); }
                            }
                        }
                        Err(_) => break,
                    }
                    std::thread::sleep(Duration::from_millis(2));
                }
            })?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            audio_status,
            audio_start,
            audio_stop,
            audio_panic,
            audio_devices,
            audio_diagnostics,
            audio_configure,
            note_event,
            patch_apply,
            sequence_config,
            canvas_apply,
            canvas_event,
            canvas_param,
            canvas_message_text,
            canvas_stop,
            canvas_status,
            help_reference::help_shell_probe,
            help_reference::help_reference,
            document_windows::document_current,
            document_windows::commands::document_commit,
            document_windows::commands::document_history,
            document_windows::commands::document_open_patcher,
            document_windows::commands::document_close_flushed,
            document_windows::document_new,
            document_windows::document_instantiate,
            document_windows::document_open,
            document_windows::document_save,
            document_windows::document_set_dirty,
            document_windows::document_list,
            document_windows::document_focus,
            document_windows::document_open_help,
            document_windows::document_cancel_close,
            document_windows::document_close_confirmed
        ])
        .on_window_event(document_windows::window_event)
        .build(context())
        .expect("Unable to start Ultra window")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = &event {
                document_windows::request_quit(app, api);
            }
            if matches!(event, tauri::RunEvent::Exit) {
                app.state::<CanvasIdleClock>().0.store(false, Ordering::Release);
                let state = app.state::<Audio>();
                if let Ok(_lock) = state.0.lock() {
                    unsafe {
                        ultra_canvas_stop_all();
                    }
                    if let Ok(mut io) = app.state::<AudioIo>().0.lock() { io.authorized_exit(); }
                };
            }
        });
}
