use crate::{audio, Audio, AudioControl, AudioIo};
use serde::{Deserialize, Serialize};
use std::{ffi::{c_char, CString}, path::PathBuf, sync::Mutex};
use tauri::Manager;

#[tauri::command]
async fn analog_test_resource_pack(resource: tauri::State<'_, Resource>, kind: String) -> Result<tauri::ipc::Response, String> {
    use std::io::Read;
    let filename = match kind.as_str() { "GUI" => "GUI.alp", "Graphics" => "Graphics.alp", _ => return Err("Unknown Live resource pack.".into()) };
    let directory = resource.0.parent().and_then(|p| p.parent()).and_then(|p| p.parent())
        .ok_or("Cannot locate the Live Resources folder from the Analog DLL path.")?;
    let path = directory.join(filename);
    let bytes = tauri::async_runtime::spawn_blocking(move || -> Result<Vec<u8>, String> {
        let file = std::fs::File::open(path).map_err(|e| format!("Cannot read {filename}: {e}"))?;
        let metadata = file.metadata().map_err(|e| e.to_string())?;
        const LIMIT: u64 = 64 * 1024 * 1024;
        if !metadata.is_file() || metadata.len() > LIMIT { return Err("Unsupported Live resource file size/type.".into()); }
        let mut bytes = Vec::new();
        file.take(LIMIT + 1).read_to_end(&mut bytes).map_err(|e| e.to_string())?;
        if bytes.len() as u64 > LIMIT { return Err("Live resource file grew beyond the supported size.".into()); }
        Ok(bytes)
    }).await.map_err(|e| e.to_string())??;
    Ok(tauri::ipc::Response::new(bytes))
}

#[tauri::command]
async fn analog_test_default_preset(resource: tauri::State<'_, Resource>) -> Result<tauri::ipc::Response, String> {
    use std::io::Read;
    let directory = resource.0.parent().and_then(|p| p.parent()).and_then(|p| p.parent())
        .ok_or("Cannot locate the Live Resources folder from the Analog DLL path.")?;
    let path = directory.join("Core Library/Defaults/Instruments/Analog.adv");
    let bytes = tauri::async_runtime::spawn_blocking(move || -> Result<Vec<u8>, String> {
        const LIMIT: u64 = 1024 * 1024;
        let file = std::fs::File::open(path).map_err(|e| format!("Cannot read the installed Analog default preset: {e}"))?;
        let metadata = file.metadata().map_err(|e| e.to_string())?;
        if !metadata.is_file() || metadata.len() > LIMIT { return Err("Unsupported Analog default preset size/type.".into()); }
        let mut bytes = Vec::new();
        file.take(LIMIT + 1).read_to_end(&mut bytes).map_err(|e| e.to_string())?;
        if bytes.len() as u64 > LIMIT { return Err("Analog default preset grew beyond the supported size.".into()); }
        Ok(bytes)
    }).await.map_err(|e| e.to_string())??;
    Ok(tauri::ipc::Response::new(bytes))
}

extern "C" {
    fn ultra_analog_play_open(path: *const c_char, error: *mut c_char, capacity: usize) -> i32;
    fn ultra_analog_play_close();
    fn ultra_analog_play_note(pitch: u32, velocity: u32) -> i32;
    fn ultra_analog_play_gain(gain: f32) -> i32;
    fn ultra_analog_play_frames() -> u64;
    fn ultra_analog_play_peak() -> f32;
    fn ultra_analog_play_fault() -> i32;
    fn ultra_analog_play_generation() -> u64;
    fn ultra_analog_play_parameter_count() -> u32;
    fn ultra_analog_play_parameter_state(index: u32, value: *mut NativeParameter) -> i32;
    fn ultra_analog_play_set_parameter(generation: u64, index: u32, value: f32) -> i32;
    fn ultra_analog_play_set_parameters(generation: u64, values: *const ParameterValue, count: u32) -> i32;
    fn ultra_analog_play_parameter_states(indices: *const u32, count: u32, values: *mut NativeParameter) -> i32;
}
#[repr(C)]
#[derive(Default)]
struct NativeDescriptor { index: u32, initialized: u32, module: i32, property: i32, kind: i32, min: f32, max: f32, auxiliary: f32 }
#[repr(C)]
#[derive(Default)]
struct NativeParameter { descriptor: NativeDescriptor, requested: f32, applied: f32, revision: u32, applied_revision: u32 }
#[repr(C)]
#[derive(Deserialize)]
struct ParameterValue { index: u32, value: f32 }
#[derive(Serialize)]
struct Parameter { index: u32, module: i32, property: i32, kind: i32, min: f32, max: f32, value: f32, applied: f32, revision: u32, applied_revision: u32 }
#[derive(Serialize)]
struct Parameters { generation: String, parameters: Vec<Parameter> }
fn parameter(index: u32) -> Option<Parameter> {
    let mut p = NativeParameter::default();
    if unsafe { ultra_analog_play_parameter_state(index, &mut p) } == 0 { return None; }
    admitted_parameter(p)
}
fn admitted_parameter(p: NativeParameter) -> Option<Parameter> {
    if p.descriptor.initialized == 0 { return None; }
    let d = p.descriptor;
    Some(Parameter { index: d.index, module: d.module, property: d.property, kind: d.kind, min: d.min, max: d.max, value: p.requested, applied: p.applied, revision: p.revision, applied_revision: p.applied_revision })
}
fn read_parameters(indices: &[u32]) -> Result<Vec<Parameter>, String> {
    if indices.is_empty() { return Ok(Vec::new()); }
    let mut native: Vec<NativeParameter> = std::iter::repeat_with(NativeParameter::default).take(indices.len()).collect();
    if unsafe { ultra_analog_play_parameter_states(indices.as_ptr(), indices.len() as u32, native.as_mut_ptr()) } == 0 {
        return Err("Analog parameter snapshot is unavailable.".into());
    }
    Ok(native.into_iter().filter_map(admitted_parameter).collect())
}
fn parameters() -> Result<Parameters, String> {
    let indices: Vec<u32> = (0..unsafe { ultra_analog_play_parameter_count() }).collect();
    Ok(Parameters { generation: unsafe { ultra_analog_play_generation() }.to_string(), parameters: read_parameters(&indices)? })
}
struct Resource(PathBuf);
#[derive(Serialize)]
struct Snapshot { running: bool, frames: String, peak: f32, fault: bool, output: String, controls: Parameters }

#[tauri::command]
fn analog_test_parameters(state: tauri::State<Audio>) -> Result<Parameters, String> {
    let _control = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    parameters()
}
#[tauri::command]
fn analog_test_parameter(state: tauri::State<Audio>, generation: String, index: u32, value: f32) -> Result<Parameter, String> {
    let _control = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    let generation = generation.parse::<u64>().map_err(|_| "Invalid Analog instance generation.")?;
    if unsafe { ultra_analog_play_set_parameter(generation, index, value) } == 0 { return Err("Analog parameter edit was refused (stale instance, range, or device state).".into()); }
    parameter(index).ok_or_else(|| "Analog parameter state is unavailable.".into())
}

#[tauri::command]
fn analog_test_parameter_batch(state: tauri::State<Audio>, generation: String, values: Vec<ParameterValue>) -> Result<Parameters, String> {
    let _control = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    let generation = generation.parse::<u64>().map_err(|_| "Invalid Analog instance generation.")?;
    if values.is_empty() || values.len() > 203 { return Err("Analog parameter batch must contain 1 to 203 values.".into()); }
    if unsafe { ultra_analog_play_set_parameters(generation, values.as_ptr(), values.len() as u32) } == 0 {
        return Err("Analog parameter batch was refused (stale instance, duplicate descriptor, range, or device state).".into());
    }
    let indices: Vec<u32> = values.iter().map(|value| value.index).collect();
    Ok(Parameters { generation: generation.to_string(), parameters: read_parameters(&indices)? })
}

#[tauri::command]
fn analog_test_start(state: tauri::State<Audio>, io: tauri::State<AudioIo>, resource: tauri::State<Resource>) -> Result<(), String> {
    let _control = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    let mut io = io.0.lock().map_err(|_| "Audio device lock poisoned")?;
    io.stop()?;
    io.require_quiescent()?;
    unsafe { ultra_analog_play_close(); }
    let path = CString::new(resource.0.as_os_str().as_encoded_bytes()).map_err(|_| "Invalid DLL path")?;
    let mut error = [0 as c_char; 256];
    if unsafe { ultra_analog_play_open(path.as_ptr(), error.as_mut_ptr(), error.len()) } == 0 {
        return Err(unsafe { std::ffi::CStr::from_ptr(error.as_ptr()) }.to_string_lossy().into_owned());
    }
    if let Err(error) = io.start() {
        // Driver owns the callback fence even when device startup fails.
        if io.require_quiescent().is_ok() { unsafe { ultra_analog_play_close(); } }
        return Err(error);
    }
    Ok(())
}
#[tauri::command]
fn analog_test_stop(state: tauri::State<Audio>, io: tauri::State<AudioIo>) -> Result<(), String> {
    let _control = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    let mut io = io.0.lock().map_err(|_| "Audio device lock poisoned")?;
    io.stop()?;io.require_quiescent()?;
    unsafe { ultra_analog_play_close(); }
    Ok(())
}
#[tauri::command]
fn analog_test_note(state: tauri::State<Audio>, pitch: u32, velocity: u32) -> Result<bool, String> {
    let _control = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    Ok(unsafe { ultra_analog_play_note(pitch, velocity) } != 0)
}
#[tauri::command]
fn analog_test_gain(state: tauri::State<Audio>, value: f32) -> Result<(), String> {
    let _control = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    if unsafe { ultra_analog_play_gain(value) } == 0 { return Err("Output level was refused.".into()); }
    Ok(())
}
#[tauri::command]
fn analog_test_status(state: tauri::State<Audio>, io: tauri::State<AudioIo>) -> Result<Snapshot, String> {
    let _control = state.0.lock().map_err(|_| "Audio control lock poisoned")?;
    let mut io = io.0.lock().map_err(|_| "Audio device lock poisoned")?;
    let status = crate::device_status(&mut io);
    Ok(Snapshot { running: status.running, frames: unsafe { ultra_analog_play_frames() }.to_string(),
        peak: unsafe { ultra_analog_play_peak() }, fault: status.fault || unsafe { ultra_analog_play_fault() } != 0,
        output: status.message, controls: parameters()? })
}

pub fn run(mut context: tauri::Context<tauri::Wry>) {
    let Some(path) = std::env::args_os().nth(1).map(PathBuf::from) else {
        eprintln!("Usage: ultra-analog-test /absolute/path/Analog_64.dll");return;
    };
    // The build-script config can override generate_context's alternate file.
    // Apply the test identity and route explicitly, as the Alive host does.
    context.config_mut().identifier = "org.alive.ultra.analog-test".into();
    context.config_mut().product_name = Some("Ultra Analog Test".into());
    if let Some(window) = context.config_mut().app.windows.first_mut() {
        window.url = tauri::WebviewUrl::App("analog-test.html".into());
        window.title = "Ultra - Analog Native Test".into();
        window.width = 1100.; window.height = 650.;
        window.min_width = Some(720.); window.min_height = Some(520.);
    }
    tauri::Builder::default()
        .manage(Resource(path))
        .manage(Audio(Mutex::new(AudioControl::default())))
        .setup(|app| {
            let path = app.path().app_data_dir()?.join("audio-settings.json");
            app.manage(AudioIo(Mutex::new(audio::Driver::load(path))));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![analog_test_resource_pack, analog_test_default_preset, analog_test_parameters, analog_test_parameter, analog_test_parameter_batch, analog_test_start, analog_test_stop, analog_test_note, analog_test_gain, analog_test_status])
        .build(context).expect("Cannot open Ultra Analog test")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::Exit) {
                let state=app.state::<Audio>();
                if let Ok(_control)=state.0.lock() {
                    let io=app.state::<AudioIo>();
                    if let Ok(mut io)=io.0.lock() {
                        io.authorized_exit();
                        if io.require_quiescent().is_ok() { unsafe { ultra_analog_play_close(); } }
                    };
                };
            }
        });
}
