//! Native document commands. Calling-window identity is the authority for graph access.
use crate::{documents::{self, Document, Kind, Registry}, Audio};
use serde_json::Value;
use std::{path::{Path, PathBuf}, sync::Mutex};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogResult};
#[path = "document_commands.rs"]
pub mod commands;

#[derive(Default)]
pub struct Documents(pub Mutex<Registry>);

fn title(document: &Document) -> String {
    let name = if document.view_path.is_empty() { document.title.clone() } else { format!("{} - {}", document.view_title, document.title) };
    format!("{}{} - Ultra", if document.dirty { "* " } else { "" }, name)
}
fn update_title(window: &WebviewWindow, document: &Document) { let _ = window.set_title(&title(document)); }

fn create_window(app: &AppHandle, document: Document) -> Result<Document, String> {
    let result = document_menu(app, &document.label).and_then(|menu| WebviewWindowBuilder::new(app, &document.label, WebviewUrl::App("canvas.html".into()))
        .menu(menu)
        .title(title(&document)).inner_size(1120., 780.).min_inner_size(640., 480.)
        .position(60. + f64::from(document.id % 8) * 26., 50. + f64::from(document.id % 8) * 26.)
        .build().and_then(|window| {
            #[cfg(target_os = "linux")]
            crate::canvas_pinch::install(&window)?;
            Ok(window)
        }));
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
    let document = state.0.lock().map_err(|_| "Document lock poisoned")?
        .add("Untitled".into(), Kind::Patch, Some(documents::empty_patch()), None, None)?;
    create_window(&app, document)
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
    tauri::async_runtime::spawn_blocking(move || {
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
    }).await.map_err(|e| format!("Save task failed: {e}"))?
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
pub fn document_close_confirmed(window: WebviewWindow, state: tauri::State<Documents>) -> Result<bool, String> {
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

pub fn window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
    let app = window.app_handle();
    let Some(state) = app.try_state::<Documents>() else { return; };
    if matches!(event, tauri::WindowEvent::Destroyed) {
        if let Ok(mut registry) = state.0.lock() {
            registry.remove(window.label());
            let completed = registry.take_completed_closes();
            drop(registry);
            commands::close_views(app, completed);
        }
        return;
    }
    let tauri::WindowEvent::CloseRequested { api, .. } = event else { return; };
    let Ok(mut registry) = state.0.lock() else { api.prevent_close(); return; };
    let Ok(document) = registry.get(window.label()) else { return; };
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
            let Ok(document) = registry.get_mut(target.label()) else { return; };
            document.close_pending = false;
            match result {
                MessageDialogResult::Yes => { let notice = registry.release_close(target.label()); drop(registry); commands::close_cancelled(target.app_handle(), notice); let _ = target.emit_to(tauri::EventTarget::webview_window(target.label()), "document-save-before-close", ()); }
                MessageDialogResult::No => { document.dirty = false; let _ = registry.allow_close_once(target.label()); drop(registry); commands::close_views(target.app_handle(), vec![target.label().into()]); }
                MessageDialogResult::Custom(action) if action == "Save" => { let notice = registry.release_close(target.label()); drop(registry); commands::close_cancelled(target.app_handle(), notice); let _ = target.emit_to(tauri::EventTarget::webview_window(target.label()), "document-save-before-close", ()); }
                MessageDialogResult::Custom(action) if action == "Discard" => { document.dirty = false; let _ = registry.allow_close_once(target.label()); drop(registry); commands::close_views(target.app_handle(), vec![target.label().into()]); }
                _ => { let notice = registry.release_close(target.label()); drop(registry); commands::close_cancelled(target.app_handle(), notice); }
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
    MenuBuilder::new(app).item(&file).item(&help).build()
}

pub fn install_menu(app: &AppHandle) -> tauri::Result<()> {
    // A shared GTK menu caches native handles after destruction. Independent
    // menus survive handle reuse, and their IDs preserve the source document.
    if let Some(window) = app.get_webview_window("main") {
        window.set_menu(document_menu(app, "main")?)?;
        #[cfg(target_os = "linux")]
        crate::canvas_pinch::install(&window)?;
    }
    app.on_menu_event(|app, event| {
        if let Some((label, action)) = event.id().as_ref().strip_prefix("doc:").and_then(|id| id.split_once(':')) {
            if let Some(window) = app.get_webview_window(label) {
                let _ = window.emit_to(tauri::EventTarget::webview_window(window.label()), "document-action", action);
            }
        }
    });
    Ok(())
}
