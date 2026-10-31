//! Native document commands. Calling-window identity is the authority for graph access.
use crate::{documents::{self, Document, Kind, Registry}, Audio};
use serde_json::Value;
use std::{path::{Path, PathBuf}, sync::Mutex};
#[cfg(target_os = "macos")]
#[path = "mac_termination.rs"]
mod mac_termination;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogResult};
#[path = "document_commands.rs"]
pub mod commands;

#[derive(Default)]
pub struct Documents(pub Mutex<Registry>, Mutex<QuitSession>);

#[derive(Default)]
struct QuitSession {
    owners: Vec<String>,
    approved: usize,
    active: bool,
    committed: bool,
    saves: usize,
    generation: u64,
    native_pending: Option<u64>,
}
#[derive(Debug, PartialEq)]
enum QuitStep { Prepare(String), Commit, Waiting }
impl QuitSession {
    fn start(&mut self, owners: Vec<String>) -> QuitStep {
        if self.active || self.saves != 0 { return QuitStep::Waiting; }
        self.generation = self.generation.wrapping_add(1);
        self.committed = false;
        self.native_pending = None;
        self.owners = owners;
        self.approved = 0;
        self.active = true;
        self.advance()
    }
    fn reserve_native(&mut self) -> Option<u64> {
        if self.active || self.native_pending.is_some() { return None; }
        self.native_pending = Some(self.generation);
        Some(self.generation)
    }
    fn native_is_current(&self, token: u64) -> bool {
        !self.active && self.native_pending == Some(token) && self.generation == token
    }
    fn current(&self) -> Option<&str> {
        if !self.active || self.committed { return None; }
        self.owners.get(self.approved).map(String::as_str)
    }
    fn advance(&mut self) -> QuitStep {
        if self.approved == self.owners.len() {
            self.committed = true;
            QuitStep::Commit
        } else { QuitStep::Prepare(self.owners[self.approved].clone()) }
    }
    fn approve(&mut self, label: &str) -> QuitStep {
        if self.current() != Some(label) { return QuitStep::Waiting; }
        self.approved += 1;
        self.advance()
    }
    fn can_exit(&self, registry: &Registry) -> bool {
        self.saves == 0 && (registry.list().is_empty() || (self.committed && self.owners == owner_labels(registry)))
    }
}

fn owner_labels(registry: &Registry) -> Vec<String> {
    registry.list().into_iter().map(|doc| doc.label).collect()
}

// Cancel releases every editor barrier and reverses approval freezes. Discard
// never modifies dirty state until termination has actually been authorized.
fn cancel_quit_state(registry: &mut Registry, quit: &mut QuitSession) -> Vec<documents::CloseNotice> {
    if !quit.active || quit.committed { return vec![]; }
    let owners = std::mem::take(&mut quit.owners);
    quit.active = false;
    quit.generation = quit.generation.wrapping_add(1);
    quit.native_pending = None;
    quit.approved = 0;
    owners.into_iter().filter_map(|label| {
        if let Ok(document) = registry.get_mut(&label) {
            document.close_approved = false;
            document.close_pending = false;
        }
        registry.release_close(&label)
    }).collect()
}

pub fn cancel_quit(app: &AppHandle) {
    let state = app.state::<Documents>();
    let notices = match (state.0.lock(), state.1.lock()) {
        (Ok(mut registry), Ok(mut quit)) => cancel_quit_state(&mut registry, &mut quit),
        _ => return,
    };
    for notice in notices { commands::close_cancelled(app, Some(notice)); }
}

fn cancel_quit_for(app: &AppHandle, label: &str, token: Option<u64>) {
    let state = app.state::<Documents>();
    let notices = match (state.0.lock(), state.1.lock()) {
        (Ok(mut registry), Ok(mut quit)) => {
            let owner = registry.get(label).ok().map(|doc| doc.label.clone());
            if owner.is_none() || quit.current() != owner.as_deref() || token.is_some_and(|token| token != quit.generation) { return; }
            cancel_quit_state(&mut registry, &mut quit)
        },
        _ => return,
    };
    for notice in notices { commands::close_cancelled(app, Some(notice)); }
}

fn valid_quit_token(app: &AppHandle, label: &str, token: Option<u64>) -> bool {
    let Some(token) = token else { return true; };
    app.state::<Documents>().1.lock().ok()
        .is_some_and(|quit| quit.current() == Some(label) && quit.generation == token)
}

fn admit_new_owner(state: &Documents) -> Result<(), String> {
    if state.1.lock().map_err(|_| "Quit lock poisoned")?.active {
        return Err("Finish or cancel Quit before opening another patch window.".into());
    }
    Ok(())
}

#[tauri::command]
pub fn document_cancel_close(window: WebviewWindow, quit_token: Option<u64>) -> Result<bool, String> {
    if !valid_quit_token(window.app_handle(), window.label(), quit_token) { return Ok(false); }
    cancel_quit_for(window.app_handle(), window.label(), quit_token);
    let state = window.state::<Documents>();
    let notice = state.0.lock().map_err(|_| "Document lock poisoned")?.release_close(window.label());
    commands::close_cancelled(window.app_handle(), notice);
    Ok(true)
}

fn title(document: &Document) -> String {
    let name = if document.view_path.is_empty() { document.title.clone() } else { format!("{} - {}", document.view_title, document.title) };
    format!("{}{} - Ultra", if document.dirty { "* " } else { "" }, name)
}
fn update_title(window: &WebviewWindow, document: &Document) { let _ = window.set_title(&title(document)); }

fn create_window(app: &AppHandle, document: Document) -> Result<Document, String> {
    {
        let state = app.state::<Documents>();
        let mut registry = state.0.lock().map_err(|_| "Document lock poisoned")?;
        if state.1.lock().map_err(|_| "Quit lock poisoned")?.active {
            registry.remove(&document.label);
            return Err("Finish or cancel Quit before opening another patch window.".into());
        }
    }
    let result = (|| -> tauri::Result<WebviewWindow> {
    let builder = WebviewWindowBuilder::new(app, &document.label, WebviewUrl::App("canvas.html".into()));
    #[cfg(not(target_os = "macos"))]
    let builder = builder.menu(document_menu(app, &document.label)?);
    builder
        .title(title(&document)).inner_size(1120., 780.).min_inner_size(640., 480.)
        .position(60. + f64::from(document.id % 8) * 26., 50. + f64::from(document.id % 8) * 26.)
        .build().and_then(|window| {
            #[cfg(target_os = "linux")]
            crate::canvas_pinch::install(&window)?;
            Ok(window)
        })
    })();
    match result {
        Ok(_) => Ok(document),
        Err(error) => {
            if let Ok(mut registry) = app.state::<Documents>().0.lock() { registry.remove(&document.label); }
            Err(format!("Cannot open patch window: {error}"))
        }
    }
}
fn focus(app: &AppHandle, document: Document) -> Result<Document, String> {
    let window = app.get_webview_window(&document.label).ok_or("Patch window is closing. Try opening it again.")?;
    window.unminimize().map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(document)
}

pub fn open_path(app: &AppHandle, path: &Path) -> Result<Document, String> {
    let loaded = documents::read_patch(path)?;
    let state = app.state::<Documents>();
    let mut registry = state.0.lock().map_err(|_| "Document lock poisoned")?;
    admit_new_owner(&state)?;
    if let Some(document) = registry.for_path(&loaded.path).cloned() { drop(registry); return focus(app, document); }
    let source_name = loaded.path.file_name().unwrap_or_default().to_string_lossy().into_owned();
    let document = registry.add(source_name.clone(), Kind::Patch, loaded.patch, Some(loaded.path), None)?;
    let stored = registry.get_mut(&document.label)?;
    stored.source = loaded.source;
    stored.source_name = stored.source.as_ref().map(|_| source_name);
    let document = stored.clone();
    drop(registry);
    create_window(app, document)
}

#[tauri::command]
pub fn document_current(window: WebviewWindow, state: tauri::State<Documents>, audio: tauri::State<Audio>) -> Result<Document, String> {
    let mut registry = state.0.lock().map_err(|_| "Document lock poisoned")?;
    let document = registry.prepare_runtime(window.label(), |owner| {
        let mut audio = audio.0.lock().map_err(|_| "Audio control lock poisoned")?;
        commands::admit(&mut audio.graphs[owner.id as usize], owner, owner.patch.as_ref().unwrap(), None, true)
    })?;
    registry.set_reveal(window.label(), None, None)?;
    let flushes = registry.mark_ready(window.label())?;
    drop(registry);
    for notice in flushes { commands::request_close_flush(window.app_handle(), notice); }
    Ok(document)
}

#[tauri::command]
pub fn document_new(app: AppHandle) -> Result<Document, String> {
    let state = app.state::<Documents>();
    let mut registry = state.0.lock().map_err(|_| "Document lock poisoned")?;
    admit_new_owner(&state)?;
    let document = registry.add("Untitled".into(), Kind::Patch, Some(documents::empty_patch()), None, None)?;
    drop(registry);
    create_window(&app, document)
}

#[tauri::command]
pub fn document_instantiate(window: WebviewWindow, state: tauri::State<Documents>) -> Result<Document, String> {
    let mut registry = state.0.lock().map_err(|_| "Document lock poisoned")?;
    admit_new_owner(&state)?;
    let document = registry.instantiate(window.label())?;
    drop(registry);
    create_window(window.app_handle(),document)
}

#[tauri::command]
pub async fn document_open(window: WebviewWindow, path: Option<String>) -> Result<Option<Document>, String> {
    let app = window.app_handle().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let path = match path {
            Some(path) => PathBuf::from(path),
            None => {
                let Some(path) = window.dialog().file().set_parent(&window).set_title("Open Patch")
                    .add_filter("Patch files", &["ultra", "json", "maxpat", "maxhelp"])
                    .add_filter("All files", &["*"]).blocking_pick_file() else { return Ok(None); };
                path.into_path().map_err(|e| format!("Choose a local patch file: {e}"))?
            }
        };
        open_path(&app, &path).map(Some)
    }).await.map_err(|e| format!("Open task failed: {e}"))?
}

#[tauri::command]
pub async fn document_save(window: WebviewWindow, save_as: bool) -> Result<Option<Document>, String> {
    let app = window.app_handle().clone();
    let label = window.label().to_owned();
    let save_quit_token = quit_token_for(&app, &label);
    {
        let state = app.state::<Documents>();
        let registry = state.0.lock().map_err(|_| "Document lock poisoned")?;
        registry.get_open(&label)?;
        state.1.lock().map_err(|_| "Quit lock poisoned")?.saves += 1;
    }
    let result = tauri::async_runtime::spawn_blocking(move || {
        let app = window.app_handle();
        let state = app.state::<Documents>();
        let current = state.0.lock().map_err(|_| "Document lock poisoned")?.get_open(window.label())?.clone();
        let patch = current.patch.clone().ok_or("Patch is not ready to save")?;
        let direct = !save_as && current.kind == Kind::Patch && current.source.is_none();
        let path = if direct { current.path.clone() } else { None };
        let path = match path {
            Some(path) => path,
            None => {
                let name = current.path.as_ref().and_then(|p| p.file_stem()).and_then(|s| s.to_str()).unwrap_or(&current.title);
                let mut picker = window.dialog().file().set_parent(&window).set_title("Save Ultra Patch")
                    .add_filter("Ultra patch", &["ultra"]).set_file_name(format!("{name}.ultra"));
                if let Some(parent) = current.path.as_ref().and_then(|p| p.parent()) { picker = picker.set_directory(parent); }
                let Some(path) = picker.blocking_save_file() else { return Ok(None); };
                path.into_path().map_err(|e| format!("Choose a local save location: {e}"))?
            }
        };
        let path = documents::save_path(&path)?;
        let mut registry = state.0.lock().map_err(|_| "Document lock poisoned")?;
        registry.check_save_path(window.label(), &path)?;
        let path = documents::save_patch(&path, &patch)?;
        let document = registry.saved(window.label(), path, patch)?;
        drop(registry);
        let registry = state.0.lock().map_err(|_| "Document lock poisoned")?;
        commands::broadcast(app, &registry, &document.owner_label);
        Ok(Some(document))
    }).await.map_err(|e| format!("Save task failed: {e}")).and_then(|result| result);
    if let Ok(mut quit) = app.state::<Documents>().1.lock() { quit.saves = quit.saves.saturating_sub(1); }
    if !matches!(&result, Ok(Some(document)) if !document.dirty) { cancel_quit_for(&app, &label, save_quit_token); }
    result
}

#[tauri::command]
pub fn document_set_dirty(window: WebviewWindow, state: tauri::State<Documents>, dirty: bool) -> Result<bool, String> {
    let _ = dirty;
    let mut registry = state.0.lock().map_err(|_| "Document lock poisoned")?;
    registry.get_open(window.label())?;
    let document = registry.get_mut(window.label())?;
    document.dirty = document.patch.as_ref() != Some(&document.saved_patch);
    update_title(&window, &registry.descriptor(window.label())?);
    Ok(true)
}

#[tauri::command]
pub fn document_list(state: tauri::State<Documents>) -> Result<Vec<Document>, String> {
    let mut documents = state.0.lock().map_err(|_| "Document lock poisoned")?.list();
    for document in &mut documents { document.patch = None; document.source = None; }
    Ok(documents)
}

#[tauri::command]
pub fn document_focus(app: AppHandle, label: String) -> Result<Document, String> {
    let document = app.state::<Documents>().0.lock().map_err(|_| "Document lock poisoned")?.descriptor(&label)?;
    focus(&app, document)
}

#[tauri::command]
pub fn document_open_help(app: AppHandle, key: String) -> Result<Document, String> {
    let state = app.state::<Documents>();
    let mut registry = state.0.lock().map_err(|_| "Document lock poisoned")?;
    admit_new_owner(&state)?;
    if let Some(document) = registry.for_help(&key).cloned() { drop(registry); return focus(&app, document); }
    let manifest: Value = serde_json::from_str(include_str!("../../ui/canvas-library-data.json")).map_err(|e| e.to_string())?;
    let entry = manifest.get("entries").and_then(Value::as_array).and_then(|entries| entries.iter().find(|entry| entry["key"] == key)).ok_or("Unknown help patch")?;
    let patch = entry.get("patch").ok_or("Help patch is missing")?.clone();
    crate::canvas::prepare(patch.clone())?;
    let kind = if entry["kind"] == "help" { Kind::Help } else { Kind::Example };
    let document = registry.add(entry["title"].as_str().ok_or("Help title is missing")?.into(), kind, Some(patch), None, Some(key))?;
    drop(registry);
    create_window(&app, document)
}

#[tauri::command]
pub fn document_close_confirmed(window: WebviewWindow, state: tauri::State<Documents>, quit_token: Option<u64>) -> Result<bool, String> {
    if !valid_quit_token(window.app_handle(), window.label(), quit_token) { return Ok(false); }
    if let Some(token) = quit_token {
        let registry = state.0.lock().map_err(|_| "Document lock poisoned")?;
        if registry.get_open(window.label())?.dirty { return Err("Save the latest patch changes before closing.".into()); }
        drop(registry);
        prepare_quit_owner(window.app_handle(), window.label(), token);
        return Ok(true);
    }
    {
        let mut registry = state.0.lock().map_err(|_| "Document lock poisoned")?;
        let document = registry.get_mut(window.label())?;
        if document.label != window.label() { drop(registry); window.close().map_err(|e| e.to_string())?; return Ok(true); }
        document.close_pending = false;
        if document.dirty { return Err("Save the latest patch changes before closing.".into()); }
    }
    window.close().map_err(|e| e.to_string())?;
    Ok(true)
}

fn menu_target<'a>(id: &'a str, focused: Option<&'a str>) -> Option<(&'a str, &'a str)> {
    let (label, action) = id.strip_prefix("doc:")?.split_once(':')?;
    Some((if label == "focused" { focused? } else { label }, action))
}

fn quit_token_for(app: &AppHandle, label: &str) -> Option<u64> {
    app.state::<Documents>().1.lock().ok().and_then(|quit| {
        (quit.current() == Some(label)).then_some(quit.generation)
    })
}

// Deferred completions carry their generation instead of scheduling a native
// CloseRequested that could arrive after Cancel and become an ordinary close.
fn queue_quit_prepare(app: &AppHandle, label: String, token: u64) {
    let handle = app.clone();
    let _ = std::thread::Builder::new().name("ultra-quit-prepare".into()).spawn(move || {
        let task = handle.clone();
        let _ = handle.run_on_main_thread(move || prepare_quit_owner(&task, &label, token));
    });
}

pub fn route_completed_closes(app: &AppHandle, labels: Vec<String>) -> Vec<String> {
    labels.into_iter().filter(|label| {
        if let Some(token) = quit_token_for(app, label) {
            queue_quit_prepare(app, label.clone(), token);
            false
        } else { true }
    }).collect()
}

fn prepare_quit_owner(app: &AppHandle, label: &str, token: u64) {
    let state = app.state::<Documents>();
    let (Ok(mut registry), Ok(quit)) = (state.0.lock(), state.1.lock()) else { return; };
    if quit.current() != Some(label) || quit.generation != token || quit.saves != 0 { return; }
    let Ok(document) = registry.get(label) else { drop(quit); drop(registry); cancel_quit(app); return; };
    if document.close_pending { return; }
    let gate = registry.begin_close(label);
    match gate {
        Ok(documents::CloseGate::Waiting) => {},
        Ok(documents::CloseGate::Flush { token: flush_token, views }) => {
            drop(quit); drop(registry);
            commands::request_close_flush(app, documents::CloseNotice { request_label: label.into(), token: flush_token, views });
        },
        Ok(documents::CloseGate::Proceed) => {
            let dirty = registry.get(label).is_ok_and(|document| document.dirty);
            drop(quit); drop(registry);
            if dirty {
                if let Some(window) = app.get_webview_window(label) { show_dirty_dialog(&window.as_ref().window(), Some(token)); }
                else { cancel_quit(app); }
            } else { approve_quit(app, label, token); }
        },
        Err(error) => {
            drop(quit); drop(registry);
            cancel_quit(app);
            let _ = app.emit_to(tauri::EventTarget::webview_window(label), "document-error", error);
        },
    }
}

fn dispatch_quit_step(app: &AppHandle, step: QuitStep) {
    match step {
        QuitStep::Prepare(label) => {
            if let Some(token) = quit_token_for(app, &label) { prepare_quit_owner(app, &label, token); }
        },
        QuitStep::Commit => app.exit(0),
        QuitStep::Waiting => {},
    }
}

/// Collect every owner's approval before destroying any window. Approved
/// owners are frozen using get_open's existing admission fence, reversibly.
pub fn begin_quit(app: &AppHandle) { begin_quit_request(app, None); }

fn begin_quit_request(app: &AppHandle, native_token: Option<u64>) {
    let state = app.state::<Documents>();
    let (Ok(registry), Ok(mut quit)) = (state.0.lock(), state.1.lock()) else { return; };
    if native_token.is_some_and(|token| !quit.native_is_current(token)) { return; }
    if quit.active { return; }
    quit.native_pending = None;
    if quit.saves != 0 || registry.list().iter().any(|doc| doc.close_pending || doc.close_approved || registry.owner_close_active(&doc.label).unwrap_or(true)) {
        drop(quit); drop(registry);
        app.dialog().message("Finish the current Save or Close operation, then try Quit again.").title("Patch Is Busy").show(|_| {});
        return;
    }
    let step = quit.start(owner_labels(&registry));
    drop(quit); drop(registry);
    dispatch_quit_step(app, step);
}

fn approve_quit(app: &AppHandle, label: &str, token: u64) {
    let state = app.state::<Documents>();
    let (Ok(mut registry), Ok(mut quit)) = (state.0.lock(), state.1.lock()) else { return; };
    if quit.current() != Some(label) || quit.generation != token { return; }
    // New owners or externally destroyed owners invalidate the whole round.
    if quit.owners != owner_labels(&registry) {
        drop(quit); drop(registry); cancel_quit(app); return;
    }
    let Ok(document) = registry.get_mut(label) else { return; };
    document.close_approved = true;
    let step = quit.approve(label);
    drop(quit); drop(registry);
    dispatch_quit_step(app, step);
}

pub fn request_quit(app: &AppHandle, api: &tauri::ExitRequestApi) {
    let state = app.state::<Documents>();
    let allowed = match (state.0.lock(), state.1.lock()) {
        (Ok(registry), Ok(quit)) => quit.can_exit(&registry),
        _ => false,
    };
    if allowed { return; }
    api.prevent_exit();
    begin_quit(app);
}

/// Cocoa asks the delegate *before* applicationWillTerminate. Always return
/// Cancel while approval is pending, and queue work outside its delegate stack.
#[cfg(target_os = "macos")]
fn native_termination_requested(app: &AppHandle) -> bool {
    let state = app.state::<Documents>();
    let (allowed, pending) = match (state.0.lock(), state.1.lock()) {
        (Ok(registry), Ok(mut quit)) => {
            let allowed = quit.can_exit(&registry);
            (allowed, if allowed { None } else { quit.reserve_native() })
        },
        _ => (false, None),
    };
    if let Some(token) = pending {
        // Wry executes run_on_main_thread inline on its main thread; send from
        // a worker so Cocoa finishes the delegate call before any sheet work.
        let handle = app.clone();
        let queued = std::thread::Builder::new().name("ultra-quit-request".into()).spawn(move || {
            let task = handle.clone();
            let _ = handle.run_on_main_thread(move || begin_quit_request(&task, Some(token)));
        });
        if queued.is_err() {
            if let Ok(mut quit) = state.1.lock() { quit.native_pending = None; }
        }
    }
    allowed
}

pub fn window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
    let app = window.app_handle();
    let Some(state) = app.try_state::<Documents>() else { return; };
    if matches!(event, tauri::WindowEvent::Destroyed) {
        if let Ok(mut registry) = state.0.lock() {
            let removed_owner = registry.remove(window.label()).is_some();
            let empty = registry.list().is_empty();
            let completed = route_completed_closes(app, registry.take_completed_closes());
            drop(registry);
            commands::close_views(app, completed);
            // Auxiliary windows must not keep a completed Quit alive.
            if removed_owner && empty { app.exit(0); }
        }
        return;
    }
    let tauri::WindowEvent::CloseRequested { api, .. } = event else { return; };
    let Ok(mut registry) = state.0.lock() else { api.prevent_close(); return; };
    let Ok(document) = registry.get(window.label()) else { return; };
    let quit_round = {
        let Ok(quit) = state.1.lock() else { api.prevent_close(); return; };
        if quit.saves != 0 { api.prevent_close(); return; }
        quit.active.then_some((quit.current().map(str::to_owned), quit.generation))
    };
    if let Some((current, token)) = quit_round {
        api.prevent_close();
        drop(registry);
        if current.as_deref() == Some(window.label()) { prepare_quit_owner(app, window.label(), token); }
        return;
    }
    if document.close_approved { return; }
    if document.label == window.label() && document.close_pending { api.prevent_close(); return; }
    match registry.begin_close(window.label()) {
        Ok(documents::CloseGate::Proceed) => {},
        Ok(documents::CloseGate::Waiting) => { api.prevent_close(); return; },
        Ok(documents::CloseGate::Flush { token, views }) => {
            api.prevent_close();
            drop(registry);
            commands::request_close_flush(app, documents::CloseNotice { request_label: window.label().into(), token, views });
            return;
        },
        Err(error) => {
            api.prevent_close();
            let _ = window.emit_to(tauri::EventTarget::webview_window(window.label()), "document-error", error);
            return;
        }
    }
    let Ok(document) = registry.get_mut(window.label()) else { return; };
    if document.label != window.label() { return; }
    if !document.dirty {
        let audio = app.state::<Audio>();
        let Ok(_guard) = audio.0.lock() else {
            api.prevent_close();
            let notice = registry.release_close(window.label()); drop(registry);
            commands::close_cancelled(app, notice);
            return;
        };
        if unsafe { crate::ultra_canvas_close_document(document.id) } == 0 {
            api.prevent_close();
            let notice = registry.release_close(window.label()); drop(registry);
            commands::close_cancelled(app, notice);
            let _ = window.emit_to(tauri::EventTarget::webview_window(window.label()), "document-error", "Patch is busy. Try closing the window again.");
        } else {
            document.close_approved = true;
            let children = registry.owner_views(window.label()).unwrap_or_default().into_iter().filter(|label| label != window.label()).collect();
            drop(registry);
            commands::close_views(app, children);
        }
        return;
    }
    api.prevent_close();
    drop(registry);
    show_dirty_dialog(window, None);
}

fn show_dirty_dialog(window: &tauri::Window, quit_token: Option<u64>) {
    let state = window.state::<Documents>();
    let Ok(mut registry) = state.0.lock() else { return; };
    if !valid_quit_token(window.app_handle(), window.label(), quit_token) { return; }
    let Ok(document) = registry.get_mut(window.label()) else { return; };
    if document.close_pending { return; }
    document.close_pending = true;
    let name = document.title.clone();
    let target = window.clone();
    drop(registry);
    window.dialog().message(format!("Save changes to {name} before closing?"))
        .title("Unsaved Patch").parent(window)
        .buttons(MessageDialogButtons::YesNoCancelCustom("Save".into(), "Discard".into(), "Cancel".into()))
        .show_with_result(move |result| {
            let state = target.state::<Documents>();
            let Ok(mut registry) = state.0.lock() else { return; };
            if !valid_quit_token(target.app_handle(), target.label(), quit_token) { return; }
            let Ok(document) = registry.get_mut(target.label()) else { return; };
            document.close_pending = false;
            let save = matches!(&result, MessageDialogResult::Yes) || matches!(&result, MessageDialogResult::Custom(action) if action == "Save");
            let discard = matches!(&result, MessageDialogResult::No) || matches!(&result, MessageDialogResult::Custom(action) if action == "Discard");
            if save {
                let notice = registry.release_close(target.label());
                drop(registry);
                commands::close_cancelled(target.app_handle(), notice);
                if target.emit_to(tauri::EventTarget::webview_window(target.label()), "document-save-before-close", quit_token.map(|token| serde_json::json!({"quitToken":token}))).is_err() {
                    cancel_quit_for(target.app_handle(), target.label(), quit_token);
                }
            } else if discard {
                let preparing_quit = quit_token.is_some();
                if preparing_quit {
                    drop(registry);
                    approve_quit(target.app_handle(), target.label(), quit_token.unwrap());
                } else {
                    document.dirty = false;
                    let _ = registry.allow_close_once(target.label());
                    drop(registry);
                    commands::close_views(target.app_handle(), vec![target.label().into()]);
                }
            } else {
                let notice = registry.release_close(target.label());
                drop(registry);
                commands::close_cancelled(target.app_handle(), notice);
                cancel_quit_for(target.app_handle(), target.label(), quit_token);
            }
        });
}

pub fn open_arguments(app: &AppHandle, args: Vec<String>, cwd: &str) {
    let paths: Vec<_> = args.into_iter().skip(1).filter(|arg| arg != "--").collect();
    if paths.is_empty() {
        if let Some(window) = app.webview_windows().values().next() { let _ = window.unminimize(); let _ = window.set_focus(); }
        return;
    }
    for path in paths {
        let path = Path::new(&path);
        let path = if path.is_absolute() { path.to_path_buf() } else { Path::new(cwd).join(path) };
        if let Err(error) = open_path(app, &path) { app.dialog().message(error).title("Cannot Open Patch").show(|_| {}); }
    }
}

pub fn initialize(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let mut paths = std::env::args().skip(1).filter(|arg| arg != "--");
    let first = paths.next();
    let loaded = first.as_ref().map(|path| documents::read_patch(Path::new(path))).transpose();
    let mut initial_error = None;
    let (name, patch, path, source) = match loaded {
        Ok(Some(loaded)) => (loaded.path.file_name().unwrap_or_default().to_string_lossy().into_owned(), loaded.patch, Some(loaded.path), loaded.source),
        result => {
            if let Err(error) = result { initial_error = Some(error); }
            ("Untitled".into(), Some(serde_json::from_str(include_str!("../../ui/canvas-preset.json"))?), None, None)
        }
    };
    {
        let state = app.state::<Documents>();
        let mut registry = state.0.lock().map_err(|_| "Document lock poisoned")?;
        let document = registry.add(name.clone(), Kind::Patch, patch, path, None)?;
        let document = registry.get_mut(&document.label)?;
        document.source_name = source.as_ref().map(|_| name);
        document.source = source;
        if let Some(window) = app.get_webview_window("main") { update_title(&window, document); }
    }
    install_menu(app)?;
    if let Some(error) = initial_error { app.dialog().message(error).title("Cannot Open Patch").show(|_| {}); }
    for path in paths {
        if let Err(error) = open_path(app, Path::new(&path)) { app.dialog().message(error).title("Cannot Open Patch").show(|_| {}); }
    }
    Ok(())
}

fn document_menu(app: &AppHandle, label: &str) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    use tauri::menu::{MenuBuilder, SubmenuBuilder};
    let id = |action| format!("doc:{label}:{action}");
    let file = SubmenuBuilder::new(app, "File").text(id("new"), "New Patch").text(id("open"), "Open...")
        .separator().text(id("save"), "Save").text(id("save-as"), "Save As...").separator().text(id("close"), "Close Window").build()?;
    let help = SubmenuBuilder::new(app, "Help").text(id("library"), "Help & Examples").build()?;
    let menu = MenuBuilder::new(app);
    #[cfg(target_os = "macos")]
    let menu = menu.item(&mac_application_menu(app)?);
    menu.item(&file).item(&help).build()
}

#[cfg(any(test, target_os = "macos"))]
#[cfg_attr(not(target_os = "macos"), allow(dead_code))] // Host tests type-check the pinned Mac menu builder API.
fn mac_application_menu(app: &AppHandle) -> tauri::Result<tauri::menu::Submenu<tauri::Wry>> {
    tauri::menu::SubmenuBuilder::new(app, "Ultra")
        .item(&tauri::menu::MenuItemBuilder::with_id("ultra-quit", "Quit Ultra")
            .accelerator("CmdOrCtrl+Q").build(app)?).build()
}

pub fn install_menu(app: &AppHandle) -> tauri::Result<()> {
    // A shared GTK menu caches native handles after destruction. Independent
    // menus survive handle reuse, and their IDs preserve the source document.
    #[cfg(target_os = "macos")]
    app.set_menu(document_menu(app, "focused")?)?;
    #[cfg(not(target_os = "macos"))]
    if let Some(window) = app.get_webview_window("main") {
        window.set_menu(document_menu(app, "main")?)?;
        #[cfg(target_os = "linux")]
        crate::canvas_pinch::install(&window)?;
    }
    #[cfg(target_os = "macos")]
    mac_termination::install(app).map_err(|error| tauri::Error::Io(std::io::Error::other(error)))?;
    app.on_menu_event(|app, event| {
        if event.id().as_ref() == "ultra-quit" { begin_quit(app); return; }
        let focused = app.webview_windows().into_values().find(|window| window.is_focused().unwrap_or(false));
        if let Some((label, action)) = menu_target(event.id().as_ref(), focused.as_ref().map(|window| window.label())) {
            if let Some(window) = app.get_webview_window(label).filter(|window| app.state::<Documents>().0.lock().ok()
                .is_some_and(|registry| registry.get(window.label()).is_ok())) {
                let _ = window.emit_to(tauri::EventTarget::webview_window(window.label()), "document-action", action);
            }
        }
    });
    Ok(())
}

#[cfg(test)]
mod lifecycle_tests {
    use super::*;

    #[test]
    fn quit_preparation_does_not_close_other_owners_before_cancel() {
        let mut registry = Registry::default();
        let a = registry.add("A".into(), Kind::Patch, Some(documents::empty_patch()), None, None).unwrap();
        let b = registry.add("B".into(), Kind::Patch, Some(documents::empty_patch()), None, None).unwrap();
        registry.get_mut(&a.label).unwrap().dirty = true;
        let mut quit = QuitSession::default();
        assert_eq!(quit.start(owner_labels(&registry)), QuitStep::Prepare(a.label.clone()));
        // Approval (including Discard) freezes authoring but preserves every
        // descriptor and graph until *all* owners have made their decision.
        registry.get_mut(&a.label).unwrap().close_approved = true;
        assert_eq!(quit.approve(&a.label), QuitStep::Prepare(b.label.clone()));
        assert!(registry.get_open(&a.label).is_err());
        assert!(!quit.can_exit(&registry));
        cancel_quit_state(&mut registry, &mut quit);
        assert!(registry.get_open(&a.label).unwrap().dirty);
        assert!(registry.get_open(&b.label).is_ok());
        assert_eq!(registry.list().len(), 2);
        assert!(!quit.can_exit(&registry));
    }

    #[test]
    fn quit_repeated_requests_pending_save_and_stale_approvals_are_inert() {
        let mut quit = QuitSession::default();
        quit.saves = 1;
        assert!(!quit.can_exit(&Registry::default()), "a pending save must block even a windowless exit");
        assert_eq!(quit.start(vec!["a".into(), "b".into()]), QuitStep::Waiting);
        assert!(!quit.active);
        quit.saves = 0;
        assert_eq!(quit.start(vec!["a".into(), "b".into()]), QuitStep::Prepare("a".into()));
        assert_eq!(quit.start(vec!["a".into(), "b".into()]), QuitStep::Waiting);
        assert_eq!(quit.approve("b"), QuitStep::Waiting);
        assert_eq!(quit.approve("a"), QuitStep::Prepare("b".into()));
        assert_eq!(quit.approve("a"), QuitStep::Waiting);
        assert_eq!(quit.approve("b"), QuitStep::Commit);
    }

    #[test]
    fn native_quit_requests_coalesce_and_old_dispatch_dies_after_cancel() {
        let mut quit = QuitSession::default();
        let token = quit.reserve_native().unwrap();
        assert!(quit.native_is_current(token));
        assert_eq!(quit.reserve_native(), None);
        quit.start(vec!["main".into()]); // Custom menu wins before native dispatch.
        assert!(!quit.native_is_current(token));
        assert_eq!(quit.reserve_native(), None, "active round must not enqueue Cocoa requests");
        cancel_quit_state(&mut Registry::default(), &mut quit);
        assert!(!quit.native_is_current(token));
        let next = quit.reserve_native().unwrap();
        assert_ne!(next, token);
        assert!(quit.native_is_current(next));
    }

    #[test]
    fn exit_requires_every_current_owner_approval() {
        let mut registry = Registry::default();
        let a = registry.add("A".into(), Kind::Patch, Some(documents::empty_patch()), None, None).unwrap();
        let mut quit = QuitSession::default();
        quit.start(owner_labels(&registry));
        assert!(!quit.can_exit(&registry), "Cocoa must cancel native terminate before approval");
        assert_eq!(quit.approve(&a.label), QuitStep::Commit);
        assert!(quit.can_exit(&registry));
        registry.add("B".into(), Kind::Patch, Some(documents::empty_patch()), None, None).unwrap();
        assert!(!quit.can_exit(&registry), "a new unapproved owner must block termination");
    }

    #[test]
    fn quit_cancel_releases_every_flush_and_allows_a_new_round() {
        let mut registry = Registry::default();
        let a = registry.add("A".into(), Kind::Patch, Some(documents::empty_patch()), None, None).unwrap();
        let b = registry.add("B".into(), Kind::Patch, Some(documents::empty_patch()), None, None).unwrap();
        let mut quit = QuitSession::default();
        quit.start(owner_labels(&registry));
        let old_token = quit.generation;
        for document in [&a, &b] {
            registry.mark_ready(&document.label).unwrap();
            assert!(matches!(registry.begin_close(&document.label).unwrap(), documents::CloseGate::Flush { .. }));
        }
        assert_eq!(cancel_quit_state(&mut registry, &mut quit).len(), 2);
        for document in [&a, &b] { assert!(!registry.owner_close_active(&document.label).unwrap()); }
        assert_eq!(quit.start(owner_labels(&registry)), QuitStep::Prepare(a.label));
        assert_ne!(old_token, quit.generation, "late Save completion must not confirm a new Quit round");
    }

    #[test]
    fn app_menu_routes_to_focus_and_window_menu_keeps_its_source() {
        assert_eq!(menu_target("doc:focused:save", Some("child-2")), Some(("child-2", "save")));
        assert_eq!(menu_target("doc:focused:close", None), None);
        assert_eq!(menu_target("doc:main:save", Some("child-2")), Some(("main", "save")));
        assert_eq!(menu_target("unrelated", Some("main")), None);
    }

    #[test]
    fn focused_child_menu_retains_owner_authority() {
        let mut registry = Registry::default();
        let patch = serde_json::json!({"version":2,"profile":"ultra-patcher-v2","nodes":[{"id":1,"type":"patcher","x":0,"y":0,"params":{"name":"child"},"patcher":{"nodes":[],"edges":[]}}],"edges":[]});
        let owner = registry.add("Owner".into(), Kind::Patch, Some(patch), None, None).unwrap();
        let child = registry.open_view(&owner.label, 1).unwrap().0;
        let (target, action) = menu_target("doc:focused:save", Some(&child.label)).unwrap();
        assert_eq!(action, "save");
        assert_eq!(target, child.label);
        assert_eq!(registry.get(target).unwrap().label, owner.label);
        assert_eq!(owner_labels(&registry), vec![owner.label]);
    }

    #[test]
    fn quit_save_retains_owner_until_save_and_final_close() {
        let mut registry = Registry::default();
        let patch = documents::empty_patch();
        let owner = registry.add("Owner".into(), Kind::Patch, Some(patch.clone()), None, None).unwrap();
        registry.get_mut(&owner.label).unwrap().dirty = true;
        registry.mark_ready(&owner.label).unwrap();
        let documents::CloseGate::Flush { token, .. } = registry.begin_close(&owner.label).unwrap() else { panic!("missing flush"); };
        registry.acknowledge_close(&owner.label, &owner.label, token).unwrap();
        assert!(matches!(registry.begin_close(&owner.label).unwrap(), documents::CloseGate::Proceed));
        registry.release_close(&owner.label); // Native Save delegates to editor save command.
        assert!(registry.get(&owner.label).unwrap().dirty);
        assert_eq!(owner_labels(&registry), vec![owner.label.clone()]);
        registry.saved(&owner.label, PathBuf::from("saved.ultra"), patch).unwrap();
        assert!(!registry.get(&owner.label).unwrap().dirty);
        assert!(!owner_labels(&registry).is_empty(), "saving alone must never authorize native app exit");
        registry.remove(&owner.label);
        assert!(owner_labels(&registry).is_empty());
    }

    #[test]
    fn multi_owner_quit_waits_for_each_flush_and_cancel_preserves_owner() {
        let mut registry = Registry::default();
        let patch = documents::empty_patch();
        let a = registry.add("A".into(), Kind::Patch, Some(patch.clone()), None, None).unwrap();
        let b = registry.add("B".into(), Kind::Patch, Some(patch), None, None).unwrap();
        for doc in [&a, &b] { registry.mark_ready(&doc.label).unwrap(); }
        let mut tokens = Vec::new();
        for label in owner_labels(&registry) {
            let documents::CloseGate::Flush { token, .. } = registry.begin_close(&label).unwrap() else { panic!("Quit must flush each owner"); };
            tokens.push((label, token));
        }
        for (label, _) in &tokens { assert!(matches!(registry.begin_close(label).unwrap(), documents::CloseGate::Waiting)); }
        registry.reject_close(&a.label, &a.label, tokens[0].1).unwrap();
        assert!(registry.get_open(&a.label).is_ok(), "failed pending operations must retain the owner");
        assert!(registry.acknowledge_close(&b.label, &b.label, tokens[1].1).unwrap());
        assert!(matches!(registry.begin_close(&b.label).unwrap(), documents::CloseGate::Proceed));
        registry.release_close(&b.label); // Cancel / save picker cancellation.
        assert_eq!(registry.list().len(), 2);
        registry.allow_close_once(&b.label).unwrap(); // Discard after successful flush.
        assert!(matches!(registry.begin_close(&b.label).unwrap(), documents::CloseGate::Proceed));
        registry.remove(&b.label);
        assert_eq!(registry.list().len(), 1, "cancelled owner prevents final native exit");
    }
}
