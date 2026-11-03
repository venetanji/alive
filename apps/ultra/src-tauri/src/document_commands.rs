//! Serialized admission and native view commands for the authoritative owner.
use super::*;
use crate::{canvas, documents::CommitResult};
use serde::Deserialize;
#[cfg(test)]
#[path = "document_commands_tests.rs"]
mod tests;
#[path="document_parameter_gestures.rs"]
mod parameter_gestures;

#[tauri::command]
pub fn document_parameter_gesture(window:WebviewWindow,state:tauri::State<Documents>,audio:tauri::State<Audio>,io:tauri::State<crate::AudioIo>,request:parameter_gestures::GestureRequest)->Result<parameter_gestures::GestureReply,String>{
    let mut registry=state.0.lock().map_err(|_|"Document lock poisoned")?;
    let mut audio=audio.0.lock().map_err(|_|"Audio control lock poisoned")?;
    let mut io=io.0.lock().map_err(|_|"Audio device lock poisoned")?;
    let result=parameter_gestures::apply(&mut registry,&mut audio,&mut io,window.label(),request);
    drop(io);drop(audio);broadcast(window.app_handle(),&registry,window.label());result
}
#[tauri::command]
pub fn document_settle_parameter_gestures(window:WebviewWindow,state:tauri::State<Documents>,audio:tauri::State<Audio>,io:tauri::State<crate::AudioIo>)->Result<Document,String>{
    let mut registry=state.0.lock().map_err(|_|"Document lock poisoned")?;
    let mut audio=audio.0.lock().map_err(|_|"Audio control lock poisoned")?;
    let mut io=io.0.lock().map_err(|_|"Audio device lock poisoned")?;
    let result=parameter_gestures::settle(&mut registry,&mut audio,&mut io,window.label());
    drop(io);drop(audio);broadcast(window.app_handle(),&registry,window.label());result
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Parameter { pub node: u32, pub key: String, pub value: f64, #[serde(default)] pub hot: bool }

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MessageText { pub node: u32, pub text: String }

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ExpectedScope { pub owner_label: String, pub runtime_revision: u64 }

pub(crate) fn trace_document(event: &str, document: &Document, token: u64, code: u8) {
    if std::env::var_os("ULTRA_TRACE_DOCUMENT_COMMANDS").is_some() {
        eprintln!("ultra-document-trace event={event} owner={} revision={} scope={} depth={} token={token} code={code}",
            document.id, document.authoring_revision, document.view_path.last().copied().unwrap_or(0), document.view_path.len());
    }
}

pub(crate) fn canvas_parameter(registry: &mut Registry, audio: &mut crate::AudioControl,
    io: &mut crate::audio::Driver, label: &str, revision: u64, parameter: Parameter) -> Result<CommitResult, String> {
    let owner = registry.get_open(label)?;
    if revision != owner.runtime_revision { return Err("Stale canvas revision".into()); }
    let base = owner.authoring_revision;
    let mut patch = owner.patch.clone().unwrap();
    fn update(scope: &mut Value, id: u32, key: &str, value: f64) -> bool {
        let Some(nodes) = scope.get_mut("nodes").and_then(Value::as_array_mut) else { return false; };
        for node in nodes {
            if node["id"].as_u64() == Some(u64::from(id)) { node["params"][key] = serde_json::json!(value); return true; }
            if let Some(child) = node.get_mut("patcher") { if update(child, id, key, value) { return true; } }
        }
        false
    }
    if !update(&mut patch, parameter.node, &parameter.key, parameter.value) { return Err("Unknown canvas node".into()); }
    registry.commit(label, base, patch, true, |owner, patch| {
        admit_owned(io, &mut audio.graphs[owner.id as usize], owner, patch, Some(&parameter), None, false)
    })
}

pub fn admit_owned(io: &mut crate::audio::Driver, control: &mut canvas::CanvasState, owner: &Document, patch: &Value,
    parameter: Option<&Parameter>, message_text: Option<&MessageText>, force: bool) -> Result<documents::Admission, String> {
    admit_owned_traced(io, control, owner, patch, parameter, message_text, force, None)
}

struct SourceReceipt { owner: u32, runtime: u64, nodes: Vec<u32>, omitted_nodes: usize, result: Result<(), String> }

fn admit_owned_traced(io: &mut crate::audio::Driver, control: &mut canvas::CanvasState, owner: &Document, patch: &Value,
    parameter: Option<&Parameter>, message_text: Option<&MessageText>, force: bool, receipt: Option<&mut Option<SourceReceipt>>) -> Result<documents::Admission, String> {
    io.reject_retiring()?;
    admit_message_inner(control, owner, patch, parameter, message_text, force, Some(io), receipt)
}

pub fn close_owned(io: &mut crate::audio::Driver, document: u32) -> Result<(), String> {
    io.reject_retiring()?;
    let external = crate::live_device::count(document) != 0;
    let resume = external && io.snapshot().running;
    if external { io.stop()?; io.require_quiescent()?; }
    let closed = unsafe { crate::ultra_canvas_close_document(document) } != 0;
    if resume { let _ = io.start(); }
    if !closed { return Err("Patch is busy. Try closing the window again.".into()); }
    Ok(())
}

pub(crate) fn stop_owned(io: &mut crate::audio::Driver, document: u32) -> Result<bool, String> {
    io.reject_retiring()?;
    let external = crate::live_device::count(document) != 0;
    let resume = external && io.snapshot().running;
    if external { io.stop()?; io.require_quiescent()?; }
    let stopped = unsafe { crate::ultra_canvas_stop_document(document) } != 0;
    // Reconstruct source state before callbacks resume; ResetA is not a hard clear.
    if resume { let _ = io.start(); }
    if !stopped { return Err("Patch stop was not admitted. Try again.".into()); }
    Ok(true)
}

pub fn admit(control: &mut canvas::CanvasState, owner: &Document, patch: &Value, parameter: Option<&Parameter>, force: bool) -> Result<documents::Admission, String> {
    admit_message(control,owner,patch,parameter,None,force)
}
pub fn admit_message(control: &mut canvas::CanvasState, owner: &Document, patch: &Value, parameter: Option<&Parameter>, message_text: Option<&MessageText>, force: bool) -> Result<documents::Admission, String> {
    admit_message_inner(control, owner, patch, parameter, message_text, force, None, None)
}
fn admit_message_inner(control: &mut canvas::CanvasState, owner: &Document, patch: &Value, parameter: Option<&Parameter>, message_text: Option<&MessageText>, force: bool,
    io: Option<&mut crate::audio::Driver>, receipt: Option<&mut Option<SourceReceipt>>) -> Result<documents::Admission, String> {
    if parameter.is_some() && message_text.is_some() { return Err("Numeric and message text hints cannot be combined".into()); }
    let plan = canvas::prepare(patch.clone())?;
    let force = force || owner.runtime_revision == 0;
    if force { owner.require_settled_parameter_gestures()?; }
    if force && message_text.is_some() { return Err("Message text hints require an active graph and cannot accompany a forced installation".into()); }
    if !force {
        if let Some(changes) = control.live_state_changes(&plan).filter(|changes| !changes.is_empty()) {
            if parameter.is_some() || message_text.is_some() { return Err("Live source state edits cannot accompany numeric or message text hints".into()); }
            let updates: Vec<_> = changes.into_iter().cloned().collect();
            let result = crate::live_device::publish(owner.id, control.revision(), &updates);
            if let Some(receipt) = receipt {
                *receipt = Some(SourceReceipt { owner: owner.id, runtime: control.revision(),
                    nodes: updates.iter().take(16).map(|source| source.node).collect(),
                    omitted_nodes: updates.len().saturating_sub(16), result: result.clone() });
            }
            result?;
            control.accept_live_state(plan);
            return Ok(documents::Admission { revision: control.revision(), message_text_serial: control.message_text_serial() });
        }
    }
    let inferred_text = if !force && parameter.is_none() && message_text.is_none() {
        control.single_message_text_change(&plan).map(|(node,text)| MessageText { node,text })
    } else { None };
    let message_text = message_text.or(inferred_text.as_ref());
    if let Some(edit) = message_text.filter(|_| !force) {
        if !control.message_text_matches(&plan,edit.node,&edit.text)? { return Err("Message text hint does not match the complete executable change".into()); }
        let revision=control.revision();
        control.message_text(revision,edit.node,&edit.text,|serial| unsafe {
            crate::ultra_canvas_message_text_document(owner.id,revision,edit.node,serial,edit.text.as_ptr().cast(),edit.text.len() as u32)!=0
        })?;
        return Ok(documents::Admission { revision,message_text_serial:control.message_text_serial() });
    }
    let inferred = if !force && parameter.is_none() {
        control.single_parameter_change(&plan).map(|(node, key, value, hot)| Parameter { node, key: key.into(), value, hot })
    } else { None };
    let parameter = parameter.or(inferred.as_ref());
    // A cold hint can reconcile native preview state even when canonical values match.
    if !force && control.matches(&plan) && parameter.is_none() {
        return Ok(documents::Admission {revision:control.revision(),message_text_serial:control.message_text_serial()});
    }
    if let Some(parameter) = parameter.filter(|_| !force) {
        if owner.parameter_previews().iter().any(|gesture|gesture.node==parameter.node&&gesture.key==parameter.key) {
            return Err("This parameter is owned by an active presentation gesture. Finish or cancel it first.".into());
        }
        if control.parameter_matches(&plan, parameter.node, &parameter.key, parameter.value)? {
            let revision = control.revision();
            if parameter.hot { control.event(revision, parameter.node, 0, serde_json::json!([parameter.value]))?; }
            control.parameter(revision, parameter.node, &parameter.key, parameter.value, |slot, value| unsafe {
                crate::ultra_canvas_param_hot_document(owner.id, revision, parameter.node, slot, value, u32::from(parameter.hot)) != 0
            })?;
            return Ok(documents::Admission {revision,message_text_serial:control.message_text_serial()});
        }
        return Err("Numeric parameter hint does not match the complete executable change".into());
    }
    let revision = if control.has_live_devices() || !plan.live_devices.is_empty() {
        let io = io.ok_or("live.device~ structural changes require the audio driver's callback fence")?;
        let resume = io.snapshot().running;
        io.stop()?;
        io.require_quiescent()?;
        let sources = plan.live_devices.clone();
        let mut detail = None;
        let installed = control.install(plan, |graph| match crate::live_device::install(owner.id, graph, &sources) {
            Ok(()) => true,
            Err(error) => { detail = Some(error); false }
        });
        // Native admission has committed; output restart failure must not undo source state.
        if resume { let _ = io.start(); }
        installed.map_err(|error| detail.unwrap_or(error))?
    } else {
        control.install(plan, |graph| unsafe { crate::ultra_canvas_install_document(owner.id, graph) != 0 })?
    };
    Ok(documents::Admission {revision,message_text_serial:control.message_text_serial()})
}

pub fn broadcast(app: &AppHandle, registry: &Registry, label: &str) {
    let Ok(labels) = registry.owner_views(label) else { return; };
    for label in labels {
        if let (Ok(document), Some(window)) = (registry.descriptor(&label), app.get_webview_window(&label)) {
            update_title(&window, &document);
            let _ = window.emit_to(tauri::EventTarget::webview_window(&label), "document-changed", document);
        }
    }
}

pub fn changed(app: &AppHandle, registry: &mut Registry, label: &str) -> Vec<String> {
    let mut obsolete = registry.prune_views(label).unwrap_or_default();
    broadcast(app, registry, label);
    obsolete.extend(super::route_completed_closes(app, registry.take_completed_closes()));
    obsolete
}

pub fn close_views(app: &AppHandle, labels: Vec<String>) {
    for label in labels {
        if let Some(window) = app.get_webview_window(&label) {
            if let Err(error) = window.close() {
                let notice = app.state::<Documents>().0.lock().ok().and_then(|mut registry| registry.release_close(&label));
                close_cancelled(app, notice);
                super::cancel_quit(app);
                let _ = window.emit_to(tauri::EventTarget::webview_window(&label), "document-error", error.to_string());
            }
        }
    }
}

pub fn close_cancelled(app: &AppHandle, notice: Option<documents::CloseNotice>) {
    let Some(notice) = notice else { return; };
    let payload = serde_json::json!({"requestLabel":notice.request_label,"token":notice.token});
    for label in notice.views {
        let _ = app.emit_to(tauri::EventTarget::webview_window(label), "document-close-cancelled", &payload);
    }
}

pub fn request_close_flush(app: &AppHandle, notice: documents::CloseNotice) {
    let payload = serde_json::json!({"requestLabel":notice.request_label,"token":notice.token});
    for label in notice.views {
        if let Ok(registry) = app.state::<Documents>().0.lock() {
            if let Ok(document) = registry.descriptor(&label) { trace_document("close_flush", &document, notice.token, 0); }
        }
        let sent = app.get_webview_window(&label).ok_or_else(|| "Editor window is unavailable".to_string())
            .and_then(|target| target.emit_to(tauri::EventTarget::webview_window(&label), "document-flush-before-close", &payload).map_err(|e| e.to_string()));
        if let Err(error) = sent {
            let cancelled = app.state::<Documents>().0.lock().ok().and_then(|mut registry| registry.cancel_close(&notice.request_label, notice.token).ok());
            close_cancelled(app, cancelled);
            super::cancel_quit(app);
            let _ = app.emit_to(tauri::EventTarget::webview_window(notice.request_label), "document-error", format!("Window remains open: {error}"));
            break;
        }
    }
}

pub fn request_save_flush(app: &AppHandle, notice: &documents::SaveNotice) {
    let payload = serde_json::json!({"owner":notice.owner,"token":notice.token});
    for label in &notice.views {
        let sent = app.get_webview_window(label).ok_or_else(|| "Editor window is unavailable".to_string())
            .and_then(|target| target.emit_to(tauri::EventTarget::webview_window(label), "document-flush-before-save", &payload).map_err(|e| e.to_string()));
        if sent.is_err() {
            if let Ok(mut registry) = app.state::<Documents>().0.lock() {
                let _ = registry.acknowledge_save(label, &notice.owner, notice.token, Some("Editor window is unavailable".into()));
            }
        }
    }
}

pub fn release_save_flush(app: &AppHandle, notice: documents::SaveNotice) {
    let payload = serde_json::json!({"owner":notice.owner,"token":notice.token});
    for label in notice.views { let _ = app.emit_to(tauri::EventTarget::webview_window(label), "document-save-flush-released", &payload); }
}

#[tauri::command]
pub fn document_save_flushed(window: WebviewWindow, state: tauri::State<Documents>, owner: String, token: u64, error: Option<String>) -> Result<(), String> {
    let mut registry = state.0.lock().map_err(|_| "Document lock poisoned")?;
    let document = registry.descriptor(window.label())?;
    let accepted = u8::from(error.is_none());
    registry.acknowledge_save(window.label(), &owner, token, error)?;
    trace_document("save_ack", &document, token, accepted);
    Ok(())
}

#[tauri::command]
pub fn document_save_barrier_active(window: WebviewWindow, state: tauri::State<Documents>, owner: String, token: u64) -> Result<bool, String> {
    state.0.lock().map_err(|_| "Document lock poisoned")?.save_barrier_active(window.label(), &owner, token)
}

#[tauri::command]
pub fn document_close_flushed(window: WebviewWindow, state: tauri::State<Documents>, request_label: String, token: u64, error: Option<String>) -> Result<bool, String> {
    let mut registry = state.0.lock().map_err(|_| "Document lock poisoned")?;
    if let Ok(document) = registry.descriptor(window.label()) { trace_document("close_ack", &document, token, u8::from(error.is_none())); }
    if let Some(error) = error {
        let cancelled = registry.reject_close(window.label(), &request_label, token)?;
        drop(registry);
        close_cancelled(window.app_handle(), Some(cancelled));
        super::cancel_quit(window.app_handle());
        let message = format!("Window remains open because pending changes could not be flushed: {}", error.chars().take(512).collect::<String>());
        let _ = window.emit_to(tauri::EventTarget::webview_window(&request_label), "document-error", message);
        return Ok(false);
    }
    let quit_token = super::quit_token_for(window.app_handle(), &request_label);
    let completed = registry.acknowledge_close(window.label(), &request_label, token)?;
    drop(registry);
    if completed {
        if let Some(quit_token) = quit_token {
            super::prepare_quit_owner(window.app_handle(), &request_label, quit_token);
        } else { close_views(window.app_handle(), vec![request_label]); }
    }
    Ok(completed)
}

#[tauri::command]
pub fn document_commit(window: WebviewWindow, state: tauri::State<Documents>, audio: tauri::State<Audio>, io: tauri::State<crate::AudioIo>, base_revision: u64,
    patch: Value, force: Option<bool>, parameter: Option<Parameter>, message_text: Option<MessageText>, history: Option<bool>, expected_scope: Option<ExpectedScope>) -> Result<CommitResult, String> {
    let tracing = crate::live_device::source_trace::enabled();
    let mut obsolete = vec![];
    let result = run_observed(|receipt| {
        let mut registry = state.0.lock().map_err(|_| "Document lock poisoned")?;
        let mut audio = audio.0.lock().map_err(|_| "Audio control lock poisoned")?;
        let mut io = io.0.lock().map_err(|_| "Audio device lock poisoned")?;
        let scope = expected_scope.as_ref().map(|scope| (scope.owner_label.as_str(), scope.runtime_revision));
        let result = registry.commit_scoped(window.label(), base_revision, patch, history.unwrap_or(true), scope, |owner, patch| {
            admit_owned_traced(&mut io, &mut audio.graphs[owner.id as usize], owner, patch, parameter.as_ref(), message_text.as_ref(), force.unwrap_or(false), if tracing { Some(receipt) } else { None })
        });
        if let Ok(result) = &result { trace_document("commit", &result.document, base_revision, u8::from(result.accepted)); }
        drop(io);
        drop(audio);
        obsolete = if let Ok(result) = &result { if result.accepted { changed(window.app_handle(), &mut registry, &result.document.owner_label) } else { vec![] } } else { vec![] };
        result
    }, |receipt, result| trace_source_reply("commit", base_revision, receipt, result));
    close_views(window.app_handle(), obsolete);
    result
}

#[tauri::command]
pub fn document_history(window: WebviewWindow, state: tauri::State<Documents>, audio: tauri::State<Audio>, io: tauri::State<crate::AudioIo>, base_revision: u64, direction: String) -> Result<CommitResult, String> {
    let tracing = crate::live_device::source_trace::enabled();
    let mut obsolete = vec![];
    let result = run_observed(|receipt| {
        let mut registry = state.0.lock().map_err(|_| "Document lock poisoned")?;
        let mut audio = audio.0.lock().map_err(|_| "Audio control lock poisoned")?;
        let mut io = io.0.lock().map_err(|_| "Audio device lock poisoned")?;
        let result = registry.history(window.label(), base_revision, &direction, |owner, patch| {
            admit_owned_traced(&mut io, &mut audio.graphs[owner.id as usize], owner, patch, None, None, false, if tracing { Some(receipt) } else { None })
        });
        drop(io);
        drop(audio);
        obsolete = if let Ok(result) = &result { if result.accepted { changed(window.app_handle(), &mut registry, &result.document.owner_label) } else { vec![] } } else { vec![] };
        result
    }, |receipt, result| trace_source_reply(match direction.as_str() { "undo" => "undo", "redo" => "redo", _ => "invalid_history" }, base_revision, receipt, result));
    close_views(window.app_handle(), obsolete);
    result
}

fn run_observed<T>(run: impl FnOnce(&mut Option<SourceReceipt>) -> Result<T, String>, observe: impl FnOnce(Option<SourceReceipt>, &Result<T, String>)) -> Result<T, String> {
    let mut receipt = None;
    let result = run(&mut receipt);
    observe(receipt, &result);
    result
}

fn trace_source_reply(operation: &str, base: u64, receipt: Option<SourceReceipt>, result: &Result<CommitResult, String>) {
    use crate::live_device::source_trace;
    if let Some(receipt) = receipt {
        source_trace::emit(None, || native_line(&receipt));
    }
    source_trace::emit(None, || document_line(operation, base, result));
}

fn native_line(receipt: &SourceReceipt) -> Value {
    serde_json::json!({"event":"u1_c_abi_admission", "owner":receipt.owner,
        "runtime_revision":receipt.runtime.to_string(), "nodes":receipt.nodes, "omitted_nodes":receipt.omitted_nodes,
        "success":receipt.result.is_ok(), "error":receipt.result.as_ref().err()})
}

fn document_line(operation: &str, base: u64, result: &Result<CommitResult, String>) -> Value {
    match result {
        Ok(reply) => serde_json::json!({"event":"rust_document_reply", "operation":operation, "base_revision":base.to_string(),
            "owner":reply.document.id, "accepted":reply.accepted, "authoring_revision":reply.document.authoring_revision.to_string(),
            "runtime_revision":reply.document.runtime_revision.to_string()}),
        Err(_) => serde_json::json!({"event":"rust_document_reply", "operation":operation, "base_revision":base.to_string(), "status":"error"}),
    }
}

#[cfg(test)]
mod source_reply_tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn trace_poisoned_lock_reply_is_observed_after_prior_guards_drop() {
        use std::sync::Mutex;
        let errors = ["Document lock poisoned", "Audio control lock poisoned", "Audio device lock poisoned"];
        for poisoned in 0..3 {
            let locks = [Mutex::new(()), Mutex::new(()), Mutex::new(())];
            std::thread::scope(|scope| { let lock = &locks[poisoned]; let _ = scope.spawn(move || { let _guard = lock.lock().unwrap(); panic!("poison"); }).join(); });
            let mut observed = false;
            let result: Result<CommitResult, String> = run_observed(|_| {
                let _document = locks[0].lock().map_err(|_| errors[0].to_string())?;
                let _audio = locks[1].lock().map_err(|_| errors[1].to_string())?;
                let _io = locks[2].lock().map_err(|_| errors[2].to_string())?;
                unreachable!()
            }, |receipt, result| {
                assert!(receipt.is_none());
                for lock in &locks[..poisoned] { assert!(lock.try_lock().is_ok()); }
                assert_eq!(result.as_ref().err().unwrap(), errors[poisoned]);
                let reply = document_line("undo", 4, result);
                assert_eq!(reply, json!({"event":"rust_document_reply", "operation":"undo", "base_revision":"4", "status":"error"}));
                observed = true;
            });
            assert_eq!(result.err().unwrap(), errors[poisoned]);
            assert!(observed);
        }
    }

    #[test]
    fn trace_reports_native_refusal_and_actual_document_rejection_separately() {
        let receipt = SourceReceipt { owner: 7, runtime: 42, nodes: vec![1,2], omitted_nodes: 0,
            result: Err("native \"refused\"\nrequest".into()) };
        let native = native_line(&receipt);
        assert_eq!(native["event"], "u1_c_abi_admission");
        assert_eq!(native["owner"], 7);
        assert_eq!(native["runtime_revision"], "42");
        assert_eq!(native["nodes"], json!([1,2]));
        assert_eq!(native["success"], false);
        assert_eq!(native["error"], "native \"refused\"\nrequest");
        assert!(native.get("applied").is_none());
        let mut registry = Registry::default();
        let document = registry.add("test".into(), documents::Kind::Patch, Some(json!({})), None, None).unwrap();
        let reply = Ok(CommitResult { accepted: false, document });
        let doc = document_line("undo", 5, &reply);
        assert_eq!(doc["event"], "rust_document_reply");
        assert_eq!(doc["accepted"], false);
        assert_eq!(doc["authoring_revision"], "0");
        assert!(doc.get("success").is_none());
    }
}

#[tauri::command]
pub fn document_open_patcher(window: WebviewWindow, state: tauri::State<Documents>, node: u32, reveal: Option<u32>, expected_revision: Option<u64>) -> Result<Document, String> {
    let mut registry = state.0.lock().map_err(|_| "Document lock poisoned")?;
    let (document, created) = registry.open_view_reveal(window.label(), node, reveal, expected_revision)?;
    drop(registry);
    let document = if created { create_window(window.app_handle(), document)? } else { focus(window.app_handle(), document)? };
    if let Some((node, revision)) = document.reveal_node.zip(document.reveal_revision) {
        if let Some(target) = window.app_handle().get_webview_window(&document.label) {
            let _ = target.emit_to(tauri::EventTarget::webview_window(&document.label), "document-reveal", serde_json::json!({"node":node,"revision":revision}));
        }
    }
    Ok(document)
}
