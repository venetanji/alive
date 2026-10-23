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
    let session = serde_json::from_str(&text).map_err(|e| format!("Invalid Alive session JSON: {e}"))?;
    prepare(&session, &path)
}
pub fn save(path: &Path, session: &Session, origin: &Path) -> Result<PathBuf, String> {
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
    if prepared.tracks.iter().any(|track| track.path == path) { return Err("A session cannot replace its Ultra device file".into()); }
    let mut document = prepared.document;
    // Preserve resolved identities when Save As moves a session to another folder.
    for (track, device) in document.tracks.iter_mut().zip(&prepared.tracks) {
        track.device.path = relative_path(parent, &device.path).to_str()
            .ok_or("Device path cannot be represented as UTF-8")?.to_owned();
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
    Ok(path)
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
