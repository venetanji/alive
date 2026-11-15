//! Qualified installed-device source state and the ordinary Ultra host boundary.
use crate::{canvas, Audio};
use serde::Serialize;
use crate::canvas::live_device::{Source, PROFILE, PARAMETER_COUNT};
use std::{ffi::{c_char, CStr, CString}, io::Read, path::{Path, PathBuf}};

#[repr(C)]
struct NativeSource {
    node: u32, profile_version: u32, parameter_count: u32, reserved: u32,
    profile: *const c_char, dll_path: *const c_char, values: *const f32,
}
#[repr(C)]
struct NativeStateUpdate { node: u32, parameter_count: u32, values: *const f32 }
#[repr(C)]
#[derive(Clone, Copy, Default)]
struct NativeDescriptor {
    index: u32, initialized: u32, module: i32, property: i32, kind: i32,
    min: f32, max: f32, auxiliary: f32,
}
#[repr(C)]
#[derive(Clone, Copy, Default)]
struct NativeParameter {
    descriptor: NativeDescriptor, requested: f32, applied: f32,
    request_version: u32, applied_version: u32,
}
extern "C" {
    fn ultra_canvas_install_live_devices_document(document: u32, graph: *const canvas::NativeGraph,
        sources: *const NativeSource, count: u32, error: *mut c_char, capacity: usize) -> i32;
    fn ultra_canvas_live_devices_set_states_document(document: u32, revision: u64,
        updates: *const NativeStateUpdate, count: u32, error: *mut c_char, capacity: usize) -> i32;
    fn ultra_canvas_live_device_parameters_document(document: u32, revision: u64, node: u32,
        states: *mut NativeParameter, capacity: u32) -> u32;
    fn ultra_canvas_live_devices_count_document(document: u32) -> u32;
}

fn native_result(operation: impl FnOnce(*mut c_char, usize) -> i32) -> Result<(), String> {
    let mut error = [0 as c_char; 512];
    if operation(error.as_mut_ptr(), error.len()) != 0 { return Ok(()); }
    // The adapter owns this bounded output and always terminates it.
    error[511] = 0;
    let message = unsafe { CStr::from_ptr(error.as_ptr()) }.to_string_lossy();
    Err(if message.is_empty() { "Native live.device~ operation was refused".into() } else { message.into_owned() })
}

pub(crate) fn count(document: u32) -> u32 { unsafe { ultra_canvas_live_devices_count_document(document) } }

pub(crate) fn install(document: u32, graph: &canvas::NativeGraph, sources: &[Source]) -> Result<(), String> {
    let profile = CString::new(PROFILE).unwrap();
    let path = if sources.is_empty() { CString::new("").unwrap() } else {
        CString::new(resource_directory()?.join("Devices/Pc/Analog_64.dll").as_os_str().as_encoded_bytes())
            .map_err(|_| "Invalid installed Live Resources path")?
    };
    let rows: Vec<_> = sources.iter().map(|source| NativeSource {
        node: source.node, profile_version: source.state.version, parameter_count: source.state.values.len() as u32,
        reserved: 0, profile: profile.as_ptr(), dll_path: path.as_ptr(), values: source.state.values.as_ptr(),
    }).collect();
    native_result(|error, capacity| unsafe {
        ultra_canvas_install_live_devices_document(document, graph, rows.as_ptr(), rows.len() as u32, error, capacity)
    })
}

pub(crate) fn publish(document: u32, revision: u64, sources: &[Source]) -> Result<(), String> {
    let rows: Vec<_> = sources.iter().map(|source| NativeStateUpdate {
        node: source.node, parameter_count: source.state.values.len() as u32, values: source.state.values.as_ptr(),
    }).collect();
    native_result(|error, capacity| unsafe {
        ultra_canvas_live_devices_set_states_document(document, revision, rows.as_ptr(), rows.len() as u32, error, capacity)
    })
}

pub(crate) fn resource_directory() -> Result<PathBuf, String> {
    if let Some(path) = std::env::var_os("ULTRA_LIVE_RESOURCES").filter(|p| !p.is_empty()) { return Ok(PathBuf::from(path)); }
    let base = std::env::var_os("HOME").ok_or("Set ULTRA_LIVE_RESOURCES to the installed Live Resources directory")?;
    Ok(PathBuf::from(base).join(".wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources"))
}

fn read_bounded(path: &Path, limit: u64) -> Result<Vec<u8>, String> {
    let file = std::fs::File::open(path).map_err(|e| format!("Cannot read installed Live resource {}: {e}",path.display()))?;
    let metadata = file.metadata().map_err(|e| e.to_string())?;
    if !metadata.is_file() || metadata.len() > limit { return Err("Unsupported Live resource size or type".into()); }
    let mut bytes = Vec::new();
    file.take(limit + 1).read_to_end(&mut bytes).map_err(|e| e.to_string())?;
    if bytes.len() as u64 > limit { return Err("Installed Live resource exceeded its size limit".into()); }
    Ok(bytes)
}

#[tauri::command]
pub(crate) async fn live_device_resource_pack(kind: String) -> Result<tauri::ipc::Response, String> {
    let filename = match kind.as_str() { "GUI" => "GUI.alp", "Graphics" => "Graphics.alp", _ => return Err("Unknown Live resource pack".into()) };
    let path = resource_directory()?.join(filename);
    let bytes = tauri::async_runtime::spawn_blocking(move || read_bounded(&path, 64 * 1024 * 1024))
        .await.map_err(|e| e.to_string())??;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
pub(crate) async fn live_device_default_preset(device: String) -> Result<tauri::ipc::Response, String> {
    if device != "Analog" { return Err("No qualified installed default for this device".into()); }
    let path = resource_directory()?.join("Core Library/Defaults/Instruments/Analog.adv");
    let bytes = tauri::async_runtime::spawn_blocking(move || read_bounded(&path, 1024 * 1024))
        .await.map_err(|e| e.to_string())??;
    Ok(tauri::ipc::Response::new(bytes))
}

#[derive(Serialize)]
pub(crate) struct Parameter {
    index: u32, module: i32, property: i32, kind: i32, min: f32, max: f32,
    value: f32, applied: f32, revision: u32, applied_revision: u32,
}
#[derive(Serialize)]
pub(crate) struct Parameters { generation: String, parameters: Vec<Parameter> }

#[tauri::command]
pub(crate) fn live_device_parameters(window: tauri::WebviewWindow,
    documents: tauri::State<crate::document_windows::Documents>, state: tauri::State<Audio>,
    revision: u64, node: u32) -> Result<Parameters, String> {
    crate::with_canvas(&window, &documents, &state, |document, control| {
        control.live_source(revision, node)?;
        let mut rows = vec![NativeParameter::default(); PARAMETER_COUNT];
        let count = unsafe { ultra_canvas_live_device_parameters_document(document, revision, node, rows.as_mut_ptr(), rows.len() as u32) };
        if count as usize != PARAMETER_COUNT { return Err("Native live.device~ parameter snapshot is unavailable or stale".into()); }
        let parameters = rows.into_iter().filter(|p| p.descriptor.initialized != 0).map(|p| {
            let d = p.descriptor;
            Parameter { index: d.index, module: d.module, property: d.property, kind: d.kind,
                min: d.min, max: d.max, value: p.requested, applied: p.applied,
                revision: p.request_version, applied_revision: p.applied_version }
        }).collect();
        Ok(Parameters { generation: revision.to_string(), parameters })
    })
}
