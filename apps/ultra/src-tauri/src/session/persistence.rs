use super::*;
use std::{fs::{self, OpenOptions}, io::{Read, Write}, path::{Path, PathBuf}, sync::atomic::{AtomicU64, Ordering}};
const MAX_BYTES: u64 = 1024 * 1024;
static NEXT_TEMP: AtomicU64 = AtomicU64::new(1);

#[cfg(test)]
mod audio_tests {
    use super::*;
    #[test]
    fn save_as_preserves_relative_audio_and_never_overwrites_its_source(){
        let root=std::env::temp_dir().join(format!("alive-audio-save-{}",std::process::id()));
        fs::create_dir_all(root.join("moved")).unwrap();
        let mut bytes=b"RIFF".to_vec();bytes.extend_from_slice(&1956u32.to_le_bytes());bytes.extend_from_slice(b"WAVEfmt ");
        bytes.extend_from_slice(&16u32.to_le_bytes());bytes.extend_from_slice(&1u16.to_le_bytes());bytes.extend_from_slice(&1u16.to_le_bytes());
        bytes.extend_from_slice(&48000u32.to_le_bytes());bytes.extend_from_slice(&96000u32.to_le_bytes());bytes.extend_from_slice(&2u16.to_le_bytes());bytes.extend_from_slice(&16u16.to_le_bytes());
        bytes.extend_from_slice(b"data");bytes.extend_from_slice(&1920u32.to_le_bytes());for _ in 0..960{bytes.extend_from_slice(&16000i16.to_le_bytes());}
        let sample=root.join("sample.json");fs::write(&sample,&bytes).unwrap();
        let path=Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/empty-workspaces.alive");let prepared=read(&path).unwrap();
        let mut project=prepared.saved.score.clone();
        project.tracks[0].chain=workspaces::ChainV4::Audio{};
        let mut file=wav::inspect(&sample).unwrap();file.path="sample.json".into();
        let project=workspaces::apply_edit(&project,workspaces::WorkspaceEditV4::AudioClipImport{track_id:project.tracks[0].id.clone(),slot:0,name:"sample".into(),file,source_tempo:120.,warp_mode:"repitch".into()},&Default::default()).unwrap().project;
        let saved=prepared.saved.with_score(project);let origin=root.join("original.alive");
        let destination=root.join("moved/project.alive");save_document(&destination,&saved,&origin).unwrap();
        let reopened=read(&destination).unwrap();let p=reopened.saved.score;
        let workspaces::SourceV4::Audio{file,..}=&p.sources[0]else{unreachable!()};assert_eq!(file.path,"../sample.json");
        assert!(save_document(&sample,&saved,&origin).unwrap_err().contains("audio source"));
        assert_eq!(fs::read(&sample).unwrap(),bytes);fs::remove_dir_all(root).unwrap();
    }
}

pub fn read(path: &Path) -> Result<PreparedSession, String> {
    let path = fs::canonicalize(path).map_err(|e| format!("Cannot open session {}: {e}", path.display()))?;
    let file = fs::File::open(&path).map_err(|e| format!("Cannot read session: {e}"))?;
    if !file.metadata().map_err(|e| e.to_string())?.is_file() { return Err("Choose an Alive session file".into()); }
    let mut bytes = Vec::new();
    file.take(MAX_BYTES + 1).read_to_end(&mut bytes).map_err(|e| format!("Cannot read session: {e}"))?;
    if bytes.len() as u64 > MAX_BYTES { return Err("Session exceeds the 1 MiB limit".into()); }
    let text = String::from_utf8(bytes).map_err(|e| format!("Cannot read session as UTF-8: {e}"))?;
    let session = decode(&text, &path)?;
    prepare(&session, &path)
}
pub fn save(path: &Path, session: &SavedSession, origin: &Path) -> Result<PathBuf, String> { save_document(path,session,origin).map(|(path,_)|path) }
pub(super) fn save_document(path: &Path, session: &SavedSession, origin: &Path) -> Result<(PathBuf,SavedSession), String> {
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
    let audio_paths=prepared.saved.score.sources.iter().filter_map(|source|match source {
        workspaces::SourceV4::Audio{id,file,..}=>Some((id.clone(),origin.parent().unwrap_or(Path::new(".")).join(&file.path))),_=>None
    }).map(|(id,source)|fs::canonicalize(&source).map(|path|(id,path)).map_err(|e|format!("Resolve audio source '{}': {e}",source.display()))).collect::<Result<Vec<_>,_>>()?;
    if audio_paths.iter().any(|(_,source)|source==&path){return Err("A session cannot replace its audio source file".into())}
    let mut saved = prepared.saved;
    // Preserve resolved identities when Save As moves a session to another folder.
    for device in &prepared.devices {
        saved.score.device_mut(&device.instance_id)?.path = relative_path(parent, &device.path).to_str().ok_or("Device path cannot be represented as UTF-8")?.to_owned();
    }
    { let project=&mut saved.score;
        for source in &mut project.sources {if let workspaces::SourceV4::Audio{id,file,..}=source {
            let source=&audio_paths.iter().find(|(source,_)|source==id).expect("prepared audio identity").1;
            file.path=relative_path(parent,source).to_str().ok_or("Audio path cannot be represented as UTF-8")?.to_owned();
        }}
    }
    let bytes = serialize_saved(&saved)?;
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
    Ok((path,saved))
}

pub(super) fn serialize_saved(saved:&SavedSession)->Result<Vec<u8>,String>{
    saved.validate_master()?;saved.score.validate()?;saved.launch.validate(&saved.score)?;
    #[derive(serde::Serialize)]
    struct Envelope<'a>{format:&'static str,score:&'a Document,master:&'a MasterSettings,launch:&'a super::launch::LaunchSettings}
    let mut bytes=serde_json::to_vec_pretty(&Envelope{format:"alive-session-v6",score:&saved.score,master:&saved.master,launch:&saved.launch}).map_err(|e|e.to_string())?;
    bytes.push(b'\n');if bytes.len() as u64>MAX_BYTES{return Err("Session exceeds the 1 MiB limit".into());}Ok(bytes)
}

pub(super) fn relative_path(base: &Path, target: &Path) -> PathBuf {
    let left: Vec<_> = base.components().collect();
    let right: Vec<_> = target.components().collect();
    let common = left.iter().zip(&right).take_while(|(a,b)| a == b).count();
    if common == 0 { return target.to_path_buf(); }
    let mut relative = PathBuf::new();
    for _ in common..left.len() { relative.push(".."); }
    for part in &right[common..] { relative.push(part.as_os_str()); }
    relative
}

pub(super) fn decode(text:&str,_origin:&Path)->Result<SavedSession,String>{
    #[derive(serde::Deserialize)]
    #[serde(deny_unknown_fields)]
    struct Envelope{format:String,score:Box<serde_json::value::RawValue>,master:MasterSettings,launch:super::launch::LaunchSettings}
    let envelope:Envelope=workspaces::strict_decode(text)?;
    if envelope.format!="alive-session-v6"{return Err("Unsupported Alive session format; expected alive-session-v6".into());}
    let saved=SavedSession{score:workspaces::decode(envelope.score.get())?,master:envelope.master,launch:envelope.launch};
    saved.validate_master()?;saved.launch.validate(&saved.score)?;Ok(saved)
}
