//! Qualified installed-device source state and the ordinary Ultra host boundary.
use crate::{canvas, Audio};
use serde::Serialize;
use crate::canvas::live_device::{Source, PROFILE, PARAMETER_COUNT};
use std::{ffi::{c_char, CStr, CString}, io::Read, path::{Path, PathBuf}};

pub(crate) mod document_batch;

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

struct SourceRows<'a> {
    _profile: CString,
    _path: CString,
    rows: Vec<NativeSource>,
    _sources: std::marker::PhantomData<&'a [Source]>,
}
impl<'a> SourceRows<'a> {
    fn new(sources: &'a [Source]) -> Result<Self, String> {
        let profile = CString::new(PROFILE).unwrap();
        let path = if sources.is_empty() { CString::new("").unwrap() } else {
            CString::new(resource_directory()?.join("Devices/Pc/Analog_64.dll").as_os_str().as_encoded_bytes())
                .map_err(|_| "Invalid installed Live Resources path")?
        };
        let rows = sources.iter().map(|source| NativeSource {
            node: source.node, profile_version: source.state.version, parameter_count: source.state.values.len() as u32,
            reserved: 0, profile: profile.as_ptr(), dll_path: path.as_ptr(), values: source.state.values.as_ptr(),
        }).collect();
        Ok(Self { _profile: profile, _path: path, rows, _sources: std::marker::PhantomData })
    }
}

pub(crate) fn install(document: u32, graph: &canvas::NativeGraph, sources: &[Source]) -> Result<(), String> {
    let sources = SourceRows::new(sources)?;
    native_result(|error, capacity| unsafe {
        ultra_canvas_install_live_devices_document(document, graph, sources.rows.as_ptr(), sources.rows.len() as u32, error, capacity)
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
    index: u32, module: i32, property: i32, kind: i32, min: f64, max: f64,
    value: f64, applied: f64, revision: u32, applied_revision: u32,
}
impl From<NativeParameter> for Parameter {
    fn from(p: NativeParameter) -> Self {
        let d = p.descriptor;
        // JSON consumers use binary64; widen before choosing decimal wire precision.
        Self { index: d.index, module: d.module, property: d.property, kind: d.kind,
            min: f64::from(d.min), max: f64::from(d.max),
            value: f64::from(p.requested), applied: f64::from(p.applied),
            revision: p.request_version, applied_revision: p.applied_version }
    }
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
        let parameters = rows.into_iter().filter(|p| p.descriptor.initialized != 0).map(Parameter::from).collect();
        Ok(Parameters { generation: revision.to_string(), parameters })
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{document_windows::commands, documents::{Kind, Registry}};
    use serde_json::json;

    fn parameter_json(rows: &[NativeParameter], generation: &str) -> String {
        use tauri::ipc::{InvokeResponseBody, IpcResponse};
        let response = Parameters { generation: generation.into(),
            parameters: rows.iter().copied().map(Parameter::from).collect() };
        match response.body().unwrap() {
            InvokeResponseBody::Json(body) => body,
            _ => panic!("parameter command must return JSON"),
        }
    }

    fn assert_parameter_json_floats(body: &str, rows: &[NativeParameter]) {
        #[derive(serde::Deserialize)]
        struct Wire {
            parameters: Vec<std::collections::BTreeMap<String, Box<serde_json::value::RawValue>>>,
        }
        let parsed: Wire = serde_json::from_str(body).unwrap();
        assert_eq!(parsed.parameters.len(), rows.len());
        for (native, row) in rows.iter().zip(parsed.parameters) {
            for (field, value) in [("min", native.descriptor.min), ("max", native.descriptor.max),
                ("value", native.requested), ("applied", native.applied)] {
                // Rust's correctly rounded parser matches JavaScript's binary64 conversion.
                let number: f64 = row[field].get().parse().unwrap();
                assert_eq!(number, f64::from(value), "{} {field}", native.descriptor.index);
            }
        }
    }

    #[test]
    fn parameter_ipc_json_preserves_native_float_values_and_receipts() {
        let rows: Vec<_> = [0.16666667_f32, 0.65, -0.1, 12.1, -10.0, 10.0].into_iter()
            .enumerate().map(|(index, requested)| NativeParameter {
                descriptor: NativeDescriptor { index: index as u32, initialized: 1,
                    module: 3502, property: 7, kind: 2, min: -10.1, max: 24.1, auxiliary: 0.0 },
                requested, applied: f32::from_bits(requested.to_bits() + 1),
                request_version: 1, applied_version: u32::MAX,
            }).collect();
        let body = parameter_json(&rows, "18446744073709551615");
        println!("PARAMETER_IPC_JSON={body}");
        assert_parameter_json_floats(&body, &rows);
        let parsed: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert_eq!(parsed["generation"], "18446744073709551615");
        for (native, row) in rows.iter().zip(parsed["parameters"].as_array().unwrap()) {
            assert_eq!(row["index"], native.descriptor.index);
            assert_eq!(row["module"], 3502);
            assert_eq!(row["property"], 7);
            assert_eq!(row["kind"], 2);
            assert_eq!(row["revision"], 1);
            assert_eq!(row["applied_revision"], u32::MAX);
            assert_ne!(row["value"], row["applied"]);
        }
    }

    #[test]
    fn analog_parameter_ipc_json_preserves_complete_source_observation() {
        let mut rows: Vec<_> = crate::canvas::live_device::ANALOG_DESCRIPTORS.iter().enumerate()
            .map(|(index, &(module, property, kind, min, max))| NativeParameter {
                descriptor: NativeDescriptor { index: index as u32, initialized: 1,
                    module: module as i32, property: property as i32, kind: kind as i32,
                    min: min as f32, max: max as f32, auxiliary: 0.0 },
                requested: min as f32, applied: min as f32, request_version: 1, applied_version: 1,
            }).collect();
        for (index, value) in [(1, 0.16666667), (2, 0.65), (194, 12.1), (196, -0.1)] {
            rows[index].requested = value;
            rows[index].applied = value;
        }
        rows[26].requested = 0.25;
        rows[26].applied = 0.75;
        rows[26].applied_version = u32::MAX;
        let body = parameter_json(&rows, "10");
        println!("ANALOG_IPC_JSON={body}");
        // Exercise JSON.parse and the production adapter on the actual Tauri body.
        use std::io::Write;
        use std::process::{Command, Stdio};
        let script = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../ui/live-profiles/analog/parameter-ipc-oracle.mjs");
        let mut node = Command::new("node").arg(script)
            .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped())
            .spawn().expect("Node is required for the Analog IPC regression");
        node.stdin.take().unwrap().write_all(body.as_bytes()).unwrap();
        let result = node.wait_with_output().unwrap();
        assert!(result.status.success(), "Analog IPC adapter failed:\n{}\n{}",
            String::from_utf8_lossy(&result.stdout), String::from_utf8_lossy(&result.stderr));
        assert_eq!(rows.len(), PARAMETER_COUNT);
        assert_parameter_json_floats(&body, &rows);
    }

    #[test]
    #[ignore = "requires the opt-in native adapter and qualified local Analog DLL"]
    fn canonical_native_source_edits_restore_history_and_saved_state() {
        const NAME: &str = "live_device::tests::canonical_native_source_edits_restore_history_and_saved_state";
        if std::env::var("ULTRA_LIVE_HOST_TEST_PROCESS").as_deref() != Ok("1") {
            let child = std::process::Command::new(std::env::current_exe().unwrap())
                .args(["--exact", NAME, "--ignored", "--nocapture"])
                .env("ULTRA_LIVE_HOST_TEST_PROCESS", "1").output().unwrap();
            assert!(child.status.success(), "{}\n{}", String::from_utf8_lossy(&child.stdout), String::from_utf8_lossy(&child.stderr));
            return;
        }
        let _guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
        let state = json!({"version":1,"profile":PROFILE,
            "dllSha256":"4528afb1fbc78d49ed92161ed13ae1df50606e2e2b2c4f28caeca0cbc1476133",
            "guiSha256":"5ec872d673fd5f4f5f05787e4245c56e172ff2663c2d4493e94d598b883114e6",
            "graphicsSha256":"a0b8aa480aa3d21f093b416ea59b3f200d2e2466936f95d886a554bffe875cb7",
            "values":crate::canvas::live_device::ANALOG_DESCRIPTORS.iter()
                .map(|&(_,_,_,minimum,_)|minimum).collect::<Vec<_>>()});
        let original = json!({"version":2,"profile":"ultra-patcher-v2","presentation":null,"edges":[],"nodes":[
            {"id":1,"type":"live_device","x":0,"y":0,"params":{"device":"Analog","state":state}},
            {"id":2,"type":"live_device","x":0,"y":400,"params":{"device":"Analog","state":state}}]});
        let mut registry = Registry::default();
        let root = registry.add("Native state".into(), Kind::Patch, Some(original.clone()), None, None).unwrap();
        let mut control = canvas::CanvasState::default();
        let mut io = crate::audio::Driver::load(PathBuf::from("/nonexistent/ultra-live-source-test.json"));
        let root = registry.prepare_runtime(&root.label, |owner|
            commands::admit_owned(&mut io, &mut control, owner, owner.patch.as_ref().unwrap(), None, None, true)).unwrap();
        assert_eq!(count(root.id), 2);
        let revision = control.revision();
        let mut edited = original.clone();
        edited["nodes"][0]["params"]["state"]["values"][34] = json!(0.25);
        edited["nodes"][1]["params"]["state"]["values"][117] = json!(0.75);
        let committed = registry.commit(&root.label, 0, edited.clone(), true, |owner, patch|
            commands::admit_owned(&mut io, &mut control, owner, patch, None, None, false)).unwrap();
        assert!(committed.accepted);
        assert_eq!(control.revision(), revision, "state-only edits replaced the runtime");
        for (base, direction, values) in [(1, "undo", [0., 0.]), (2, "redo", [0.25, 0.75])] {
            registry.history(&root.label, base, direction, |owner, patch|
                commands::admit_owned(&mut io, &mut control, owner, patch, None, None, false)).unwrap();
            assert_eq!(control.live_source(revision, 1).unwrap().state.values[34], values[0]);
            assert_eq!(control.live_source(revision, 2).unwrap().state.values[117], values[1]);
        }
        let mut rows = vec![NativeParameter::default(); PARAMETER_COUNT];
        assert_eq!(unsafe { ultra_canvas_live_device_parameters_document(root.id, revision, 1, rows.as_mut_ptr(), PARAMETER_COUNT as u32) }, PARAMETER_COUNT as u32);
        assert_eq!(rows[34].requested, 0.25);
        assert_eq!(unsafe { ultra_canvas_live_device_parameters_document(root.id, revision + 1, 1, rows.as_mut_ptr(), PARAMETER_COUNT as u32) }, 0);
        let mut structural = edited.clone();
        structural["nodes"].as_array_mut().unwrap().push(json!({"id":3,"type":"number","x":0,"y":0,"params":{}}));
        assert!(commands::admit(&mut control, registry.get(&root.label).unwrap(), &structural, None, false)
            .err().unwrap().contains("callback fence"));
        assert_eq!(control.revision(), revision);
        let folder = std::env::temp_dir().join(format!("ultra-live-source-{}", std::process::id()));
        std::fs::create_dir_all(&folder).unwrap();
        let path = folder.join("edited.ultra");
        crate::documents::save_patch(&path, &edited).unwrap();
        commands::close_owned(&mut io, root.id).unwrap();
        assert_eq!(count(root.id), 0);
        let reopened = crate::documents::read_patch(&path).unwrap().patch.unwrap();
        let plan = canvas::prepare(reopened).unwrap();
        let mut graph = plan.native;
        graph.revision = revision + 1;
        install(root.id, &graph, &plan.live_devices).unwrap();
        assert_eq!(unsafe { ultra_canvas_live_device_parameters_document(root.id, graph.revision, 2, rows.as_mut_ptr(), PARAMETER_COUNT as u32) }, PARAMETER_COUNT as u32);
        assert_eq!(rows[117].requested, 0.75);
        assert_eq!(rows[117].applied, 0.75);
        commands::close_owned(&mut io, root.id).unwrap();
        std::fs::remove_dir_all(folder).unwrap();
    }
}
