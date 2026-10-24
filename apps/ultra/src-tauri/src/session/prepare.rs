//! Resolve every dependency and compile a bounded frame schedule off audio.
use super::*;
use crate::{canvas, documents};
use std::{collections::HashSet, path::{Path, PathBuf}};

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
pub struct PreparedTrack { pub instrument: usize, pub effects: Vec<usize> }
#[derive(Clone, Debug)]
pub struct PreparedClip { pub id:String, pub name:String, pub track:usize, pub slot:usize, pub event_begin:usize, pub event_count:usize, pub lane_count:u32, pub length_frames:u64, pub owned_masks:[u32;16] }
#[derive(Clone, Debug)]
pub enum Schedule { Legacy, Clips(Vec<PreparedClip>) }
#[derive(Clone, Debug)]
pub struct PreparedSession {
    pub origin: PathBuf,
    pub document: Session,
    pub tracks: Vec<PreparedTrack>,
    pub devices: Vec<PreparedDevice>,
    pub events: Vec<FrameEvent>,
    pub length_frames: u64,
    pub schedule: Schedule,
    pub notice: Option<String>,
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

pub fn prepare(session: &Session, path: &Path) -> Result<PreparedSession, String> {
    if session.is_clips() {
        session.validate_clips()?;
        let mut common=(**session).clone();common.format="alive-session-v2".into();
        let limits=native::clip_capacity()?;
        let mut prepared=prepare_common(&Document::LegacyV2(common),path,limits.max_tracks as usize,limits.max_devices as usize)?;
        let mut document=session.clone();
        for (target,source) in document.tracks.iter_mut().zip(&prepared.document.tracks) {
            for (a,b) in target.devices_mut().zip(source.devices()) {a.parameters=b.parameters.clone();}
        }
        prepared.document=document;compile_clips(session,&mut prepared)?;return Ok(prepared);
    }
    prepare_common(session,path,2,6)
}
fn prepare_common(session:&Session,path:&Path,max_tracks:usize,max_devices:usize)->Result<PreparedSession,String> {
    if session.format != "alive-session-v2" { return Err("Unsupported Alive session format; expected alive-session-v2".into()); }
    text(&session.title, 128, "Session title")?;
    bounded(session.tempo, 30., 240., "Tempo")?;
    bounded(session.length_beats, 1. / 64., 256., "Clip length")?;
    let count: usize = session.tracks.iter().map(|t| 1 + t.effects.len()).sum();
    if count > 16 { return Err("Session exceeds sixteen native roots".into()); }
    if session.tracks.is_empty() || session.tracks.len() > max_tracks { return Err(format!("This admitted profile supports one to {max_tracks} instrument tracks")); }
    if count > max_devices || session.tracks.iter().any(|t| t.effects.len() > 2) { return Err(format!("At most two effects per track and {max_devices} devices in this admitted profile")); }
    let mut instance_ids = HashSet::new();
    let mut track_ids = HashSet::new();
    for track in &session.tracks {
        token(&track.id, "Track ID")?;
        text(&track.name, 64, "Track name")?;
        if !track_ids.insert(&track.id) { return Err(format!("Duplicate track ID: {}", track.id)); }
        for reference in track.devices() {
            token(&reference.instance_id, "Instance ID")?;
            if !instance_ids.insert(&reference.instance_id) { return Err("Duplicate device instance ID".into()); }
        }
    }
    let frames_per_beat = 48_000. * 60. / session.tempo;
    let frame = |beat: f64| (beat * frames_per_beat).round() as u64;
    let length_frames = frame(session.length_beats);
    let mut result = PreparedSession { origin: path.to_path_buf(), document: session.clone(), tracks: vec![], devices: vec![], events: vec![], length_frames, schedule:Schedule::Legacy, notice:None };
    let mut references: Vec<_> = session.tracks.iter().enumerate().flat_map(|(track, t)| t.devices().enumerate().map(move |(position, d)| (track, position, d))).collect();
    references.sort_by_key(|(_, _, d)| &d.instance_id);
    check_sources(session,path,None)?;
    for (track, position, reference) in references {
        let context = |e| format!("Track '{}' instance '{}' ({}): {e}", session.tracks[track].name, reference.instance_id, reference.path);
        let device = prepare_device(reference, path, track).map_err(context)?;
        let expected = if position == 0 { canvas::device::DeviceKind::Instrument } else { canvas::device::DeviceKind::AudioEffect };
        if device.manifest.kind != expected { return Err(context("Track instruments only occupy the first chain position; effects require the chain runtime effect position".into())); }
        if position == 0 && reference.bypassed { return Err(context("Instrument bypass is unsupported".into())); }
        result.devices.push(device);
    }
    compile_music(session, &mut result)?;
    for track in &mut result.document.tracks {
        for reference in track.devices_mut() {
            let device = result.devices.iter().find(|d| d.instance_id == reference.instance_id).unwrap();
            reference.parameters = device.manifest.parameters.iter().map(|p| (p.key.clone(), p.base)).collect();
        }
    }
    result.events.sort_by_key(|e| (e.frame, e.kind, e.track, e.device, e.target));
    if result.events.len() > 1024 { return Err("Session exceeds 1024 scheduled events".into()); }
    validate_density(&result.events, length_frames, session.loop_enabled)?;
    Ok(result)
}

pub(super) fn check_sources(session:&Session,origin:&Path,original:Option<&Session>)->Result<(),String>{
    let resolve=|path:&str|{let path=origin.parent().unwrap_or(Path::new(".")).join(path);std::fs::canonicalize(&path).unwrap_or(path)};
    let mut groups=std::collections::BTreeMap::<PathBuf,Vec<(&Track,&DeviceInstance)>>::new();
    for track in &session.tracks{for reference in track.devices(){groups.entry(resolve(&reference.path)).or_default().push((track,reference));}}
    for (path,references) in groups{
        let context=references.iter().map(|(t,d)|format!("Track '{}' instance '{}' ({})",t.name,d.instance_id,d.path)).collect::<Vec<_>>().join("; ");
        let loaded=documents::read_patch(&path).map_err(|e|format!("{context}: {e}. Restore this path from a matching original source, or explicitly Replace the intended instance. No matching backup is assumed."))?;
        let patch=loaded.patch.ok_or_else(||format!("{context}: Expected a saved Ultra device"))?;let actual=fingerprint(&patch)?;
        let stale=references.iter().filter(|(_,d)|d.source_sha256!=actual).map(|(t,d)|format!("Track '{}' instance '{}' ({})",t.name,d.instance_id,d.path)).collect::<Vec<_>>();
        if stale.is_empty(){continue;}
        let original_count=original.map_or(0,|s|s.tracks.iter().flat_map(Track::devices).filter(|d|resolve(&d.path)==path).count());
        let guidance=if references.len()>1||original_count>1{
            "Selected Replace changes only that instance; stale siblings block full preparation. Stop transport and resolve pending edits; preserve the changed .ultra at a new path before restoring anything. Restore a matching original backup at the shared path, then explicitly Replace each intended instance from the preserved changed copy and Save. A matching original backup is required; without one there is no general supported recovery in the current desktop workflow. Replace gives a fresh instance identity, default bases/bypass and removes that instance's automation lanes. Copying alone or trying siblings in turn does not recover this session."
        }else{"Restore the original matching source at this path, or explicitly Replace this instance from the intended saved source. Replace resets its identity, bases/bypass and automation lanes."};
        return Err(format!("Device source changed or fingerprint invalid: {}. {guidance}",stale.join("; ")));
    }Ok(())
}

// Admission uses the current manifests only; dependency/hash and density checks stay at Apply.
pub(super) fn validate_musical(session: &Session, prepared: &PreparedSession) -> Result<(), String> {
    if session.is_clips(){let mut score=prepared.clone();return compile_clips(session,&mut score);}
    text(&session.title,128,"Session title")?;
    bounded(session.tempo,30.,240.,"Tempo")?;
    bounded(session.length_beats,1./64.,256.,"Clip length")?;
    for track in &session.tracks { text(&track.name,64,"Track name")?; }
    let mut score=prepared.clone();score.events.clear();score.tracks.clear();
    score.length_frames=(session.length_beats*48_000.*60./session.tempo).round() as u64;
    compile_music(session,&mut score)
}
fn compile_music(session: &Session, result: &mut PreparedSession) -> Result<(), String> {
    let frames_per_beat=48_000.*60./session.tempo;
    let frame=|beat:f64|if session.is_clips(){(beat*48_000.*60./session.tempo).round() as u64}else{(beat*frames_per_beat).round() as u64};
    let length_frames=result.length_frames;
    for (index, track) in session.tracks.iter().enumerate() {
        let context = |error: String| format!("Track '{}' ({}): {error}", track.name, track.device.path);
        bounded(track.gain, 0., 2., "Track gain").map_err(context)?;
        let instrument = result.devices.iter().position(|d| d.instance_id == track.device.instance_id).unwrap();
        let effects = track.effects.iter().map(|e| result.devices.iter().position(|d| d.instance_id == e.instance_id).unwrap()).collect();
        if track.notes.len() > 128 { return Err(context("At most 128 notes per clip".into())); }
        if track.automation.len() > 16 || track.automation.iter().map(|lane| lane.points.len()).sum::<usize>() > 256 {
            return Err(context("At most 16 automation lanes and 256 points per track".into()));
        }
        let mut notes = Vec::new();
        for note in &track.notes {
            bounded(note.beat, 0., session.length_beats, "Note beat").map_err(context)?;
            bounded(note.duration, f64::MIN_POSITIVE, session.length_beats, "Note duration").map_err(context)?;
            if note.pitch > 127 || !(1..=127).contains(&note.velocity) { return Err(context("Note pitch must be 0..127 and velocity 1..127".into())); }
            if note.beat + note.duration > session.length_beats + 1e-10 { return Err(context("A note extends beyond the clip end".into())); }
            let start = frame(note.beat);
            let end = frame(note.beat + note.duration);
            if start >= length_frames || end <= start { return Err(context("Notes must occupy at least one audio frame within the clip".into())); }
            if notes.iter().any(|&(pitch, a, b)| pitch == note.pitch && start < b && end > a) {
                return Err(context("Overlapping notes with the same pitch are unsupported; shorten or move one note".into()));
            }
            notes.push((note.pitch, start, end));
            result.events.push(FrameEvent { frame: start, track: index as u32, kind: 2, device: instrument as u32, target: note.pitch, value: note.velocity as f64 });
            // End/loop discontinuities hard-clear; an endpoint belongs to the next cycle.
            if end < length_frames { result.events.push(FrameEvent { frame: end, track: index as u32, kind: 0, device: instrument as u32, target: note.pitch, value: 0. }); }
        }
        let mut lanes = HashSet::new();
        for lane in &track.automation {
            if !lanes.insert((&lane.instance_id, &lane.key)) { return Err(context(format!("Duplicate automation lane: {}", lane.key))); }
            let device = result.devices.iter().position(|d| d.instance_id == lane.instance_id && d.track == index)
                .ok_or_else(|| context(format!("Missing or cross-track automation instance: {}", lane.instance_id)))?;
            let (parameter, binding) = result.devices[device].manifest.parameters.iter().enumerate().find(|(_, p)| p.key == lane.key)
                .ok_or_else(|| context(format!("Unknown automation parameter: {}", lane.key)))?;
            let mut previous = None;
            for point in &lane.points {
                bounded(point.beat, 0., session.length_beats, "Automation beat").map_err(context)?;
                binding_value(binding, point.value).map_err(context)?;
                let at = frame(point.beat);
                if at >= length_frames || previous.is_some_and(|last| at <= last) {
                    return Err(context("Automation points must be strictly increasing, distinct audio frames before clip end".into()));
                }
                previous = Some(at);
                if lane.enabled { result.events.push(FrameEvent { frame: at, track: index as u32, kind: 1, device: device as u32, target: parameter as u32, value: point.value }); }
            }
        }
        result.tracks.push(PreparedTrack { instrument, effects });
    }
    Ok(())
}

pub(super) fn compile_clips(session:&Session,result:&mut PreparedSession)->Result<(),String> {
    session.validate_clips()?;result.events.clear();let mut clips=Vec::new();
    for (track,model) in session.tracks.iter().enumerate(){
        bounded(model.gain,0.,2.,"Track gain")?;
        for (slot,clip) in session.bank(&model.id).ok_or("Missing clip bank")?.slots.iter().enumerate(){
            let Some(clip)=clip else {continue};
            let begin=result.events.len();let length=(clip.length_beats*48_000.*60./session.tempo).round() as u64;
            let mut score=session.clone();score.length_beats=clip.length_beats;
            for t in &mut score.tracks {t.notes.clear();t.automation.clear();}
            score.tracks[track].notes=clip.notes.iter().map(|n|Note{beat:n.beat,duration:n.duration,pitch:n.pitch,velocity:n.velocity}).collect();
            score.tracks[track].automation=clip.automation.clone();
            result.length_frames=length;result.tracks.clear();
            compile_music(&score,result).map_err(|e|format!("Clip '{}' ({}): {e}",clip.name,clip.id))?;
            result.events[begin..].sort_by_key(|e|(e.frame,e.kind,e.track,e.device,e.target));
            let mut masks=[0;16];
            for lane in clip.automation.iter().filter(|l|l.enabled){
                let device=result.devices.iter().position(|d|d.instance_id==lane.instance_id&&d.track==track).ok_or("Missing automation device")?;
                let parameter=result.devices[device].manifest.parameters.iter().position(|p|p.key==lane.key).ok_or("Missing automation parameter")?;
                masks[device]|=1<<parameter;
            }
            clips.push(PreparedClip{id:clip.id.clone(),name:clip.name.clone(),track,slot,event_begin:begin,event_count:result.events.len()-begin,lane_count:clip.automation.iter().filter(|l|l.enabled).count() as u32,length_frames:length,owned_masks:masks});
        }
    }
    if result.events.len()>1024{return Err("Stored clips exceed 1024 compiled events".into());}
    // Empty banks still own their chain; compilation must not depend on a clip existing.
    result.tracks=session.tracks.iter().map(|t|PreparedTrack{instrument:result.devices.iter().position(|d|d.instance_id==t.device.instance_id).unwrap(),effects:t.effects.iter().map(|e|result.devices.iter().position(|d|d.instance_id==e.instance_id).unwrap()).collect()}).collect();
    result.length_frames=(session.length_beats*48_000.*60./session.tempo).round() as u64;
    result.schedule=Schedule::Clips(clips);Ok(())
}

pub fn binding_value(binding: &canvas::device::HostParameter, value: f64) -> Result<(), String> {
    bounded(value, binding.min, binding.max, &binding.key)?;
    if binding.integral && value.fract() != 0. { return Err(format!("{} requires an integer", binding.key)); }
    Ok(())
}

fn prepare_device(reference: &DeviceInstance, session_path: &Path, track: usize) -> Result<PreparedDevice, String> {
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

fn validate_density(events: &[FrameEvent], length: u64, looping: bool) -> Result<(), String> {
    let mut frames: Vec<u64> = events.iter().map(|e| e.frame).collect();
    if looping && !events.is_empty() {
        // Include every seam repetition covered by a callback, even for short clips.
        for cycle in 1..=1024 / length + 1 {
            frames.extend(events.iter().filter(|e| e.frame + cycle * length < length + 1024).map(|e| e.frame + cycle * length));
        }
    }
    let mut first = 0;
    let mut same_frame = 0;
    for (index, &frame) in frames.iter().enumerate() {
        same_frame = if index != 0 && frames[index - 1] == frame { same_frame + 1 } else { 1 };
        while frame - frames[first] >= 1024 { first += 1; }
        if same_frame > 32 || index - first + 1 > 64 { return Err("Event overload: at most 32 events at one frame and 64 in any 1024-frame interval, including loop wrap".into()); }
    }
    Ok(())
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
