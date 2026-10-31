//! Resolve every dependency and compile a bounded frame schedule off audio.
use super::*;
use crate::{canvas, documents};
use std::{path::{Path, PathBuf}};

#[derive(Clone, Debug)]
pub struct FrameEvent {
    pub frame: u64, pub track: u32, pub kind: u32, pub device: u32, pub target: u32, pub value: f64,
}
#[derive(Clone, Debug)]
pub struct PreparedDevice {
    pub instance_id: String,
    pub track: usize,
    pub path: PathBuf,
    pub patch: serde_json::Value,
    pub graph: canvas::NativeGraph,
    pub manifest: canvas::device::HostManifest,
}
#[derive(Clone, Debug)]
pub enum PreparedTrackInput { Midi { instrument: Option<usize> }, Audio }
#[derive(Clone, Debug)]
pub struct PreparedTrack { pub input: PreparedTrackInput, pub effects: Vec<usize> }
impl PreparedTrack {
    pub fn optional_midi_instrument(&self)->Option<usize> { match self.input {PreparedTrackInput::Midi{instrument}=>instrument,PreparedTrackInput::Audio=>None} }
    pub fn midi_instrument(&self)->Result<usize,String> { self.optional_midi_instrument().ok_or_else(||"This track has no MIDI instrument".into()) }
}
#[derive(Clone, Debug)]
pub struct PreparedSession {
    pub origin: PathBuf,
    pub saved: SavedSession,
    pub tracks: Vec<PreparedTrack>,
    pub devices: Vec<PreparedDevice>,
    pub events: Vec<FrameEvent>,
    pub length_frames: u64,
    pub schedule: super::prepare_workspaces::PreparedWorkspaces,
}
pub(super) fn bounded(value: f64, min: f64, max: f64, label: &str) -> Result<(), String> {
    if value.is_finite() && (min..=max).contains(&value) { Ok(()) }
    else { Err(format!("{label} must be finite and in {min}..{max}")) }
}
pub(super) fn text(value: &str, limit: usize, label: &str) -> Result<(), String> {
    if value.is_empty() || value.len() > limit || value.chars().any(char::is_control) {
        Err(format!("{label} must contain 1..{limit} bytes without control characters"))
    } else { Ok(()) }
}

pub fn prepare(saved: &SavedSession, path: &Path) -> Result<PreparedSession, String> {
    saved.validate_master()?;
    saved.launch.validate(&saved.score)?;
    super::prepare_workspaces::prepare(saved,&saved.score,path)
}
pub(super) fn check_sources(session:&Session,origin:&Path,original:Option<&Session>)->Result<(),String>{
    let resolve=|path:&str|{let path=origin.parent().unwrap_or(Path::new(".")).join(path);std::fs::canonicalize(&path).unwrap_or(path)};
    let mut groups=std::collections::BTreeMap::<PathBuf,Vec<(document::TrackRef<'_>,&DeviceInstance)>>::new();
    for track in session.tracks(){for reference in track.devices(){groups.entry(resolve(&reference.path)).or_default().push((track,reference));}}
    for (path,references) in groups{
        let context=references.iter().map(|(t,d)|format!("Track '{}' instance '{}' ({})",t.name(),d.instance_id,d.path)).collect::<Vec<_>>().join("; ");
        let loaded=documents::read_patch(&path).map_err(|e|format!("{context}: {e}. Restore this path from a matching original source, or explicitly Replace the intended instance. No matching backup is assumed."))?;
        let patch=loaded.patch.ok_or_else(||format!("{context}: Expected a saved Ultra device"))?;let actual=fingerprint(&patch)?;
        let stale=references.iter().filter(|(_,d)|d.source_sha256!=actual).map(|(t,d)|format!("Track '{}' instance '{}' ({})",t.name(),d.instance_id,d.path)).collect::<Vec<_>>();
        if stale.is_empty(){continue;}
        let original_count=original.map_or(0,|s|s.tracks().into_iter().flat_map(|t|t.devices()).filter(|d|resolve(&d.path)==path).count());
        let guidance=if references.len()>1||original_count>1{
            "Selected Replace changes only that instance; stale siblings block full preparation. Stop transport and resolve pending edits; preserve the changed .ultra at a new path before restoring anything. Restore a matching original backup at the shared path, then explicitly Replace each intended instance from the preserved changed copy and Save. A matching original backup is required; without one there is no general supported recovery in the current desktop workflow. Replace gives a fresh instance identity, default bases/bypass and removes that instance's automation lanes. Copying alone or trying siblings in turn does not recover this session."
        }else{"Restore the original matching source at this path, or explicitly Replace this instance from the intended saved source. Replace resets its identity, bases/bypass and automation lanes."};
        return Err(format!("Device source changed or fingerprint invalid: {}. {guidance}",stale.join("; ")));
    }Ok(())
}

pub fn binding_value(binding: &canvas::device::HostParameter, value: f64) -> Result<(), String> {
    bounded(value, binding.min, binding.max, &binding.key)?;
    if binding.integral && value.fract() != 0. { return Err(format!("{} requires an integer", binding.key)); }
    Ok(())
}

pub(super) fn prepare_device(reference: &DeviceInstance, session_path: &Path, track: usize) -> Result<PreparedDevice, String> {
    text(&reference.path, 4096, "Device path")?;
    if !matches!(reference.version, 1 | 2) { return Err(format!("Unsupported device manifest version {} (host supports 1 and 2)", reference.version)); }
    let path = session_path.parent().unwrap_or(Path::new(".")).join(&reference.path);
    let loaded = documents::read_patch(&path)?;
    let mut patch = loaded.patch.ok_or("Expected a saved Ultra instrument, not a Max import")?;
    if reference.source_sha256.len() != 64 || !reference.source_sha256.bytes().all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)) {
        return Err("sourceSha256 must be 64 lowercase hexadecimal bytes".into());
    }
    if fingerprint(&patch)? != reference.source_sha256 { return Err("Device source changed".into()); }
    let initial = canvas::prepare(patch.clone())?;
    let manifest = canvas::device::host_manifest(&patch, &initial.native)?;
    if manifest.version != reference.version { return Err(format!("Device manifest version mismatch: expected {}, found {}", reference.version, manifest.version)); }
    if manifest.id != reference.id { return Err(format!("Device identity mismatch: expected {}, found {}", reference.id, manifest.id)); }
    if reference.parameters.len() > manifest.parameters.len() { return Err("Unknown stored device parameter".into()); }
    for (key, &value) in &reference.parameters {
        let binding = manifest.parameters.iter().find(|p| &p.key == key).ok_or_else(|| format!("Unknown stored device parameter: {key}"))?;
        binding_value(binding, value)?;
        if !edit_parameter(&mut patch, binding.node, &binding.param, value) { return Err(format!("Device binding {key} has no authored node")); }
    }
    let graph = canvas::prepare(patch.clone())?.native;
    if graph.nodes[..graph.node_count as usize].iter().any(|n| matches!(n.kind, 11 | 26 | 27)) {
        return Err("Alive's native instrument profile does not support legacy Voice or cross-document send/receive nodes".into());
    }
    let manifest = canvas::device::host_manifest(&patch, &graph)?;
    Ok(PreparedDevice { instance_id: reference.instance_id.clone(), track, path: loaded.path, patch, graph, manifest })
}

pub fn edit_parameter(patch: &mut serde_json::Value, id: u32, key: &str, value: f64) -> bool {
    let Some(nodes) = patch.get_mut("nodes").and_then(serde_json::Value::as_array_mut) else { return false; };
    for node in nodes {
        if node["id"].as_u64() == Some(id as u64) { node["params"][key] = serde_json::json!(value); return true; }
        if let Some(child) = node.get_mut("patcher") { if edit_parameter(child, id, key, value) { return true; } }
    }
    false
}

pub(super) fn fingerprint(patch: &serde_json::Value) -> Result<String, String> {
    use sha2::{Digest, Sha256};
    fn canonical(value: &serde_json::Value) -> serde_json::Value {
        match value {
            serde_json::Value::Object(map) => {
                let sorted: std::collections::BTreeMap<_, _> = map.iter().map(|(k, v)| (k.clone(), canonical(v))).collect();
                serde_json::to_value(sorted).unwrap()
            }
            serde_json::Value::Array(values) => serde_json::Value::Array(values.iter().map(canonical).collect()),
            other => other.clone(),
        }
    }
    Ok(format!("{:x}", Sha256::digest(serde_json::to_vec(&canonical(patch)).map_err(|e| e.to_string())?)))
}
pub(super) fn token(value: &str, label: &str) -> Result<(), String> {
    if value.is_empty() || value.len() > 64 || !value.bytes().all(|b| b.is_ascii_graphic() && b != b'/' && b != b'\\' && b != b'"') {
        return Err(format!("{label} must be a safe printable ASCII token of 1..64 bytes"));
    }
    Ok(())
}
