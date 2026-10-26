use super::*;
use std::{fs::{self, OpenOptions}, io::{Read, Write}, path::{Path, PathBuf}, sync::atomic::{AtomicU64, Ordering}};
const MAX_BYTES: u64 = 1024 * 1024;
static NEXT_TEMP: AtomicU64 = AtomicU64::new(1);

pub fn read(path: &Path) -> Result<PreparedSession, String> {
    let path = fs::canonicalize(path).map_err(|e| format!("Cannot open session {}: {e}", path.display()))?;
    let file = fs::File::open(&path).map_err(|e| format!("Cannot read session: {e}"))?;
    if !file.metadata().map_err(|e| e.to_string())?.is_file() { return Err("Choose an Alive session file".into()); }
    let mut text = String::new();
    file.take(MAX_BYTES + 1).read_to_string(&mut text).map_err(|e| format!("Cannot read session as UTF-8: {e}"))?;
    if text.len() as u64 > MAX_BYTES { return Err("Session exceeds the 1 MiB limit".into()); }
    let session = decode(&text, &path)?;
    prepare(&session, &path)
}
pub fn save(path: &Path, session: &Session, origin: &Path) -> Result<PathBuf, String> { save_document(path,session,origin).map(|(path,_)|path) }
pub(super) fn save_document(path: &Path, session: &Session, origin: &Path) -> Result<(PathBuf,Session), String> {
    let prepared = prepare(session, origin)?;
    let mut path = path.to_path_buf();
    if path.extension().is_none() { path.set_extension("alive"); }
    if !path.extension().and_then(|s| s.to_str()).is_some_and(|ext| ext.eq_ignore_ascii_case("alive") || ext.eq_ignore_ascii_case("json")) {
        return Err("Save the session as .alive or .json to preserve device and source files".into());
    }
    let parent = path.parent().filter(|p| !p.as_os_str().is_empty()).unwrap_or(Path::new("."));
    let parent = fs::canonicalize(parent).map_err(|e| format!("Cannot access save folder: {e}"))?;
    let path = if path.exists() { fs::canonicalize(&path).map_err(|e| e.to_string())? }
        else { parent.join(path.file_name().ok_or("Choose a session file name")?) };
    // A session symlink may resolve to a different folder than the chosen name.
    let parent = path.parent().ok_or("Choose a session file name")?;
    if prepared.devices.iter().any(|device| device.path == path) { return Err("A session cannot replace its Ultra device file".into()); }
    let mut document = prepared.document;
    // Preserve resolved identities when Save As moves a session to another folder.
    for device in &prepared.devices {
        document.device_mut(&device.instance_id)?.path = relative_path(parent, &device.path).to_str().ok_or("Device path cannot be represented as UTF-8")?.to_owned();
    }
    let mut bytes = serde_json::to_vec_pretty(&document).map_err(|e| e.to_string())?;
    bytes.push(b'\n');
    if bytes.len() as u64 > MAX_BYTES { return Err("Session exceeds the 1 MiB limit".into()); }
    let temporary = parent.join(format!(".alive-save-{}-{}.tmp", std::process::id(), NEXT_TEMP.fetch_add(1, Ordering::Relaxed)));
    let result = (|| -> std::io::Result<()> {
        let mut file = OpenOptions::new().write(true).create_new(true).open(&temporary)?;
        if let Ok(metadata) = fs::metadata(&path) { file.set_permissions(metadata.permissions())?; }
        file.write_all(&bytes)?;
        file.sync_all()?;
        fs::rename(&temporary, &path)
    })();
    if let Err(error) = result {
        let _ = fs::remove_file(&temporary);
        return Err(format!("Session was not saved: {error}"));
    }
    Ok((path,document))
}

fn relative_path(base: &Path, target: &Path) -> PathBuf {
    let left: Vec<_> = base.components().collect();
    let right: Vec<_> = target.components().collect();
    let common = left.iter().zip(&right).take_while(|(a,b)| a == b).count();
    if common == 0 { return target.to_path_buf(); }
    let mut relative = PathBuf::new();
    for _ in common..left.len() { relative.push(".."); }
    for part in &right[common..] { relative.push(part.as_os_str()); }
    relative
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SessionV1 { format: String, title: String, tempo: f64, length_beats: f64, loop_enabled: bool, tracks: Vec<TrackV1> }
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct TrackV1 { id: String, name: String, device: ReferenceV1, notes: Vec<Note>, automation: Vec<LaneV1>, gain: f64, mute: bool, solo: bool }
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct ReferenceV1 { path: String, id: String, version: u32, parameters: std::collections::BTreeMap<String, f64> }
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct LaneV1 { key: String, enabled: bool, points: Vec<Point> }
pub(super) fn decode(text: &str, origin: &Path) -> Result<Session, String> {
    use sha2::{Digest, Sha256};
    let value: serde_json::Value = serde_json::from_str(text).map_err(|e| format!("Invalid Alive session JSON: {e}"))?;
    match value["format"].as_str() {
        Some("alive-session-v4") => workspaces::decode(text).map(Document::WorkspacesV4),
        Some("alive-session-v3") => super::clips::decode_v3(text),
        Some("alive-session-v2") => serde_json::from_str::<LegacySession>(text).map(Document::LegacyV2).map_err(|e| format!("Invalid Alive session JSON: {e}")),
        Some("alive-session-v1") => {
            let old: SessionV1 = serde_json::from_str(text).map_err(|e| format!("Invalid Alive v1 session JSON: {e}"))?;
            let _ = old.format;
            if old.tracks.len() > 16 { return Err("Session exceeds sixteen native roots".into()); }
            if old.tracks.is_empty() || old.tracks.len() > 2 { return Err("Alive supports one or two instrument tracks".into()); }
            let mut ids = std::collections::HashSet::new();
            for track in &old.tracks {
                if !ids.insert(&track.id) { return Err("Duplicate track ID in legacy session".into()); }
            }
            let mut tracks = Vec::new();
            for track in old.tracks {
                let instance_id = format!("legacy-{}", &format!("{:x}", Sha256::digest(track.id.as_bytes()))[..32]);
                let source = crate::documents::read_patch(&origin.parent().unwrap_or(Path::new(".")).join(&track.device.path))
                    .map_err(|e| format!("Track '{}' instance '{}' ({}): {e}. Restore the original source at this path before opening; after opening, use explicit Replace to choose a different source", track.name, instance_id, track.device.path))?;
                let patch = source.patch.ok_or("Expected a saved Ultra device")?;
                let source_sha256 = super::prepare::fingerprint(&patch)?;
                tracks.push(Track { id: track.id, name: track.name, device: DeviceInstance { instance_id: instance_id.clone(), source_sha256, bypassed: false,
                    path: track.device.path, id: track.device.id, version: track.device.version, parameters: track.device.parameters }, effects: vec![], notes: track.notes,
                    automation: track.automation.into_iter().map(|l| Lane { instance_id: instance_id.clone(), key: l.key, enabled: l.enabled, points: l.points }).collect(), gain: track.gain, mute: track.mute, solo: track.solo });
            }
            Ok(Document::LegacyV2(LegacySession { format: "alive-session-v2".into(), title: old.title, tempo: old.tempo, length_beats: old.length_beats, loop_enabled: old.loop_enabled, tracks }))
        }
        _ => Err("Unsupported Alive session format".into()),
    }
}
