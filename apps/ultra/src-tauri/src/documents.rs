//! Document identity and file persistence, independent of windowing and audio.
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{collections::{BTreeMap, VecDeque}, fs::{self, OpenOptions}, io::{Read, Write}, path::{Path, PathBuf}, sync::atomic::{AtomicU64, Ordering}};

pub const MAX_DOCUMENTS: usize = 16;
#[path = "documents_shared.rs"]
mod shared;
#[path = "documents_close.rs"]
mod close;
#[path = "documents_save.rs"]
mod save;
pub use close::{CloseGate, CloseNotice};
pub use save::{SaveNotice, SaveSnapshot};
const MAX_IMPORT_BYTES: u64 = 8 * 1024 * 1024;
static NEXT_TEMP: AtomicU64 = AtomicU64::new(1);

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind { Patch, Help, Example }

pub struct Admission { pub revision: u64, pub message_text_serial: u64 }
impl From<u64> for Admission {
    fn from(revision: u64) -> Self { Self { revision, message_text_serial: 0 } }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    pub id: u32,
    pub label: String,
    pub title: String,
    pub path: Option<PathBuf>,
    pub kind: Kind,
    pub patch: Option<Value>,
    pub source: Option<String>,
    pub source_name: Option<String>,
    pub help_key: Option<String>,
    pub dirty: bool,
    pub shared: bool,
    pub owner_label: String,
    pub view_path: Vec<u32>,
    pub view_title: String,
    pub authoring_revision: u64,
    pub descriptor_revision: u64,
    pub runtime_revision: u64,
    pub message_text_serial: u64,
    pub can_undo: bool,
    pub can_redo: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reveal_node: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reveal_revision: Option<u64>,
    #[serde(skip)]
    pub saved_patch: Value,
    #[serde(skip)]
    undo: VecDeque<Snapshot>,
    #[serde(skip)]
    redo: VecDeque<Snapshot>,
    #[serde(skip)]
    pub close_pending: bool,
    #[serde(skip)]
    pub close_approved: bool,
}

#[derive(Default)]
pub struct Registry {
    entries: BTreeMap<String, Document>,
    views: BTreeMap<String, View>,
    consoles: BTreeMap<String, ConsoleCache>,
    close: close::CloseState,
    save: save::SaveState,
    serial: u64,
}
#[derive(Default)]
struct ConsoleCache { records: VecDeque<(u64, crate::canvas::ConsoleRecord)>, next: u64, dropped: u64, cursors: BTreeMap<String, (u64, u64)> }
struct View { owner: String, path: Vec<u32>, reveal_node: Option<u32>, reveal_revision: Option<u64> }
#[derive(Clone)]
struct Snapshot { patch: std::sync::Arc<Value>, bytes: usize }
impl Snapshot {
    fn new(patch: Value) -> Self {
        let bytes = serde_json::to_vec(&patch).map_or(0, |bytes| bytes.len());
        Self { patch: std::sync::Arc::new(patch), bytes }
    }
}

#[derive(Serialize)]
pub struct CommitResult { pub accepted: bool, pub document: Document }
impl Registry {
    pub fn instantiate(&mut self, label: &str) -> Result<Document, String> {
        let source=self.get_open(label)?;
        let patch=source.patch.clone().ok_or("Patch is not ready to instantiate")?;
        crate::canvas::prepare(patch.clone())?;
        let instance=self.add("Untitled".into(),Kind::Patch,Some(patch),None,None)?;
        let stored=self.get_mut(&instance.label)?;
        stored.saved_patch=empty_patch();
        stored.dirty=stored.patch.as_ref()!=Some(&stored.saved_patch);
        Ok(stored.clone())
    }
    pub fn add(&mut self, title: String, kind: Kind, patch: Option<Value>, path: Option<PathBuf>, help_key: Option<String>) -> Result<Document, String> {
        let id = (0..MAX_DOCUMENTS as u32).find(|id| self.entries.values().all(|doc| doc.id != *id))
            .ok_or("Up to 16 patch windows can be open. Close a window and try again.")?;
        let label = if self.serial == 0 { "main".into() } else { format!("patch-{}", self.serial) };
        self.serial = self.serial.checked_add(1).ok_or("Document identity exhausted")?;
        let patch = patch.unwrap_or_else(empty_patch);
        let doc = Document { id, label: label.clone(), owner_label: label.clone(), view_title: title.clone(), title, path, kind, saved_patch: patch.clone(), patch: Some(patch), source: None, source_name: None, help_key, dirty: false, shared: true, view_path: vec![], authoring_revision: 0, descriptor_revision: 0, runtime_revision: 0, message_text_serial: 0, can_undo: false, can_redo: false, reveal_node: None, reveal_revision: None, undo: VecDeque::new(), redo: VecDeque::new(), close_pending: false, close_approved: false };
        self.entries.insert(label, doc.clone());
        Ok(doc)
    }
    pub fn get(&self, label: &str) -> Result<&Document, String> { self.entries.get(self.views.get(label).map_or(label, |view| view.owner.as_str())).ok_or_else(|| "This patch window is closed".into()) }
    pub fn get_open(&self, label: &str) -> Result<&Document, String> {
        let document = self.get(label)?;
        if document.close_approved { return Err("This patch window is closing".into()); }
        Ok(document)
    }
    pub fn get_mut(&mut self, label: &str) -> Result<&mut Document, String> {
        let owner = self.views.get(label).map_or(label, |view| view.owner.as_str()).to_owned();
        self.entries.get_mut(&owner).ok_or_else(|| "This patch window is closed".into())
    }
    pub fn remove(&mut self, label: &str) -> Option<Document> {
        self.detach_save(label);
        self.detach_close(label);
        if let Some(view) = self.views.remove(label) {
            if let Some(cache) = self.consoles.get_mut(&view.owner) { cache.cursors.remove(label); }
            return None;
        }
        self.views.retain(|_, view| view.owner != label);
        self.consoles.remove(label);
        self.entries.remove(label)
    }
    pub fn list(&self) -> Vec<Document> {
        let mut docs: Vec<_> = self.entries.values().cloned().collect();
        docs.sort_by_key(|doc| doc.id);
        docs
    }
    pub fn for_path(&self, path: &Path) -> Option<&Document> { self.entries.values().find(|doc| doc.path.as_deref() == Some(path)) }
    pub fn for_help(&self, key: &str) -> Option<&Document> { self.entries.values().find(|doc| doc.help_key.as_deref() == Some(key)) }
    pub fn check_save_path(&self, label: &str, path: &Path) -> Result<(), String> {
        let current = self.get_open(label)?;
        if current.source.is_some() && current.path.as_deref() == Some(path) {
            return Err("Choose a new file name to preserve the imported Max source.".into());
        }
        if self.for_path(path).is_some_and(|doc| doc.label != current.label) { return Err("That file is open in another patch window. Choose another name.".into()); }
        Ok(())
    }
    pub fn saved(&mut self, label: &str, path: PathBuf, patch: Value) -> Result<Document, String> {
        self.get_open(label)?;
        let document = self.get_mut(label)?;
        let publication = document.descriptor_revision.checked_add(1).ok_or("Descriptor revision exhausted")?;
        document.title = path.file_name().unwrap_or_default().to_string_lossy().into_owned();
        document.path = Some(path); document.saved_patch = patch; document.kind = Kind::Patch;
        document.dirty = document.patch.as_ref() != Some(&document.saved_patch);
        document.source = None; document.source_name = None; document.help_key = None;
        document.descriptor_revision = publication;
        // Preserve edits made while the save picker was open.
        self.descriptor(label)
    }
}

pub struct Loaded {
    pub path: PathBuf,
    pub patch: Option<Value>,
    pub source: Option<String>,
}
pub fn read_patch(path: &Path) -> Result<Loaded, String> {
    let path = fs::canonicalize(path).map_err(|error| format!("Cannot open {}: {error}", path.display()))?;
    let file = fs::File::open(&path).map_err(|error| format!("Cannot read patch: {error}"))?;
    if !file.metadata().map_err(|e| e.to_string())?.is_file() { return Err("Choose a patch file.".into()); }
    let mut text = String::new();
    file.take(MAX_IMPORT_BYTES + 1).read_to_string(&mut text).map_err(|error| format!("Cannot read patch as UTF-8: {error}"))?;
    if text.len() as u64 > MAX_IMPORT_BYTES { return Err("Patch exceeds the 8 MiB import limit.".into()); }
    let value: Value = serde_json::from_str(&text).map_err(|error| format!("Patch is not valid JSON: {error}"))?;
    if value.get("patcher").is_some() {
        Ok(Loaded { path, patch: None, source: Some(text) })
    } else {
        crate::canvas::prepare(value.clone())?;
        Ok(Loaded { path, patch: Some(value), source: None })
    }
}

pub fn save_path(path: &Path) -> Result<PathBuf, String> {
    let mut path = path.to_path_buf();
    if path.extension().is_none() { path.set_extension("ultra"); }
    if path.extension().and_then(|s| s.to_str()).is_some_and(|ext| matches!(ext.to_ascii_lowercase().as_str(), "maxpat" | "maxhelp")) {
        return Err("Save as .ultra or .json to keep the original Max file.".into());
    }
    if path.exists() {
        let resolved = fs::canonicalize(&path).map_err(|e| format!("Cannot resolve save path: {e}"))?;
        if resolved != path { return save_path(&resolved); }
        return Ok(resolved);
    }
    let parent = path.parent().filter(|p| !p.as_os_str().is_empty()).unwrap_or_else(|| Path::new("."));
    let parent = fs::canonicalize(parent).map_err(|error| format!("Cannot access save folder: {error}"))?;
    Ok(parent.join(path.file_name().ok_or("Choose a file name")?))
}

pub fn save_patch(path: &Path, patch: &Value) -> Result<PathBuf, String> {
    crate::canvas::prepare(patch.clone())?;
    let path = save_path(path)?;
    let mut bytes = serde_json::to_vec_pretty(patch).map_err(|e| e.to_string())?;
    bytes.push(b'\n');
    let temporary = path.with_file_name(format!(".ultra-save-{}-{}.tmp", std::process::id(), NEXT_TEMP.fetch_add(1, Ordering::Relaxed)));
    let result = (|| {
        let mut file = OpenOptions::new().write(true).create_new(true).open(&temporary)?;
        if let Ok(metadata) = fs::metadata(&path) { file.set_permissions(metadata.permissions())?; }
        file.write_all(&bytes)?;
        file.sync_all()?;
        fs::rename(&temporary, &path)
    })();
    if let Err(error) = result {
        let _ = fs::remove_file(&temporary);
        return Err(format!("Patch was not saved: {error}"));
    }
    Ok(path)
}

pub fn empty_patch() -> Value { serde_json::json!({"version":1,"profile":"ultra-canvas-v1","nodes":[],"edges":[]}) }

#[cfg(test)]
#[path = "documents_tests.rs"]
mod tests;
