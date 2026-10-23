//! Owner-authoritative authoring snapshots and independently bound views.
use super::*;

const MAX_CHILD_VIEWS: usize = 64;
const HISTORY_LIMIT: usize = 100;
const HISTORY_BYTES: usize = 16 * 1024 * 1024;

fn trim_history(owner: &mut Document) {
    let mut bytes: usize = owner.undo.iter().chain(owner.redo.iter()).map(|snapshot| snapshot.bytes).sum();
    while bytes > HISTORY_BYTES || owner.undo.len() + owner.redo.len() > HISTORY_LIMIT {
        let removed = owner.undo.pop_front().or_else(|| owner.redo.pop_front());
        let Some(removed) = removed else { break; };
        bytes = bytes.saturating_sub(removed.bytes);
    }
}

fn scope<'a>(patch: &'a Value, path: &[u32]) -> Option<&'a Value> {
    let mut current = patch;
    for id in path {
        current = current.get("nodes")?.as_array()?.iter()
            .find(|node| node["id"].as_u64() == Some(u64::from(*id)))?.get("patcher")?;
    }
    Some(current)
}

fn patcher_path(patch: &Value, id: u32, path: &mut Vec<u32>) -> bool {
    let Some(nodes) = patch.get("nodes").and_then(Value::as_array) else { return false; };
    for node in nodes {
        if let Some(child) = node.get("patcher") {
            let Some(node_id) = node["id"].as_u64() else { continue; };
            path.push(node_id as u32);
            if node_id == u64::from(id) || patcher_path(child, id, path) { return true; }
            path.pop();
        }
    }
    false
}

impl Registry {
    pub fn descriptor(&self, label: &str) -> Result<Document, String> {
        let mut document = self.get_open(label)?.clone();
        document.view_title = document.title.clone();
        if let Some(view) = self.views.get(label) {
            document.label = label.into();
            document.view_path = view.path.clone();
            document.reveal_node = view.reveal_node;
            document.reveal_revision = view.reveal_revision;
            let container = scope(document.patch.as_ref().unwrap(), &view.path[..view.path.len()-1])
                .and_then(|parent| parent["nodes"].as_array())
                .and_then(|nodes| nodes.iter().find(|node| node["id"].as_u64() == view.path.last().map(|id| u64::from(*id))));
            document.view_title = container.and_then(|node| node["params"]["name"].as_str()).filter(|name| !name.is_empty()).unwrap_or("p").into();
        }
        // A child can finish booting after the graph that produced its source row was replaced.
        if document.reveal_node.is_none() || document.reveal_revision != Some(document.runtime_revision) {
            document.reveal_node = None;
            document.reveal_revision = None;
        }
        Ok(document)
    }

    pub fn prepare_runtime(&mut self, label: &str, install: impl FnOnce(&Document) -> Result<Admission, String>) -> Result<Document, String> {
        let owner = self.get_open(label)?;
        if owner.runtime_revision == 0 {
            let next = owner.descriptor_revision.checked_add(1).ok_or("Descriptor revision exhausted")?;
            let revision = install(owner)?;
            let owner = self.get_mut(label)?;
            owner.runtime_revision = revision.revision;
            owner.message_text_serial = revision.message_text_serial;
            owner.descriptor_revision = next;
        }
        self.descriptor(label)
    }

    pub fn open_view(&mut self, label: &str, node: u32) -> Result<(Document, bool), String> {
        let owner = self.get_open(label)?;
        if node == 0 { return Ok((self.descriptor(&owner.label)?, false)); }
        let mut path = Vec::new();
        if !patcher_path(owner.patch.as_ref().unwrap(), node, &mut path) { return Err("Unknown embedded patcher".into()); }
        let owner_label = owner.label.clone();
        if let Some((label, _)) = self.views.iter().find(|(_, view)| view.owner == owner_label && view.path == path) {
            return Ok((self.descriptor(label)?, false));
        }
        if self.owner_close_active(label)? { return Err("Finish closing or cancel the close request before opening another patcher view.".into()); }
        if self.views.values().filter(|view| view.owner == owner_label).count() >= MAX_CHILD_VIEWS {
            return Err("Up to 64 embedded views can be open per patch. Close a view and try again.".into());
        }
        let label = format!("patch-view-{}", self.serial);
        self.serial = self.serial.checked_add(1).ok_or("View identity exhausted")?;
        self.views.insert(label.clone(), View { owner: owner_label, path, reveal_node: None, reveal_revision: None });
        Ok((self.descriptor(&label)?, true))
    }

    pub fn open_view_reveal(&mut self, label: &str, node: u32, reveal: Option<u32>, expected_revision: Option<u64>) -> Result<(Document, bool), String> {
        if let Some(source) = reveal {
            let owner = self.get_open(label)?;
            if expected_revision != Some(owner.runtime_revision) {
                return Err("Console source belongs to a different runtime revision".into());
            }
            let mut path = Vec::new();
            if node != 0 && !patcher_path(owner.patch.as_ref().unwrap(), node, &mut path) {
                return Err("Unknown embedded patcher".into());
            }
            let patcher = scope(owner.patch.as_ref().unwrap(), &path).ok_or("Unknown patcher view")?;
            if !patcher["nodes"].as_array().unwrap().iter().any(|entry| entry["id"].as_u64() == Some(u64::from(source))) {
                return Err("Source node does not belong to this patcher view".into());
            }
        }
        let (document, created) = self.open_view(label, node)?;
        self.set_reveal(&document.label, reveal, expected_revision)?;
        Ok((self.descriptor(&document.label)?, created))
    }

    pub fn set_reveal(&mut self, label: &str, node: Option<u32>, expected_revision: Option<u64>) -> Result<(), String> {
        let document = self.descriptor(label)?;
        if let Some(node) = node {
            if expected_revision != Some(document.runtime_revision) {
                return Err("Console source belongs to a different runtime revision".into());
            }
            let patcher = scope(document.patch.as_ref().unwrap(), &document.view_path).ok_or("Unknown patcher view")?;
            if !patcher["nodes"].as_array().unwrap().iter().any(|entry| entry["id"].as_u64() == Some(u64::from(node))) {
                return Err("Source node does not belong to this patcher view".into());
            }
        }
        let revision = node.and(expected_revision);
        if let Some(view) = self.views.get_mut(label) { view.reveal_node = node; view.reveal_revision = revision; }
        else { let owner = self.get_mut(label)?; owner.reveal_node = node; owner.reveal_revision = revision; }
        Ok(())
    }

    pub fn owner_views(&self, label: &str) -> Result<Vec<String>, String> {
        let owner = &self.get(label)?.label;
        let mut labels = vec![owner.clone()];
        labels.extend(self.views.iter().filter(|(_, view)| &view.owner == owner).map(|(label, _)| label.clone()));
        Ok(labels)
    }

    pub fn prune_views(&mut self, label: &str) -> Result<Vec<String>, String> {
        let owner = self.get(label)?;
        let obsolete: Vec<_> = self.views.iter().filter(|(_, view)| view.owner == owner.label && scope(owner.patch.as_ref().unwrap(), &view.path).is_none()).map(|(label, _)| label.clone()).collect();
        for label in &obsolete { self.remove(label); }
        Ok(obsolete)
    }

    pub fn commit(&mut self, label: &str, base: u64, patch: Value, history: bool,
        admit: impl FnOnce(&Document, &Value) -> Result<Admission, String>) -> Result<CommitResult, String> {
        let owner = self.get_open(label)?;
        if owner.authoring_revision != base { return Ok(CommitResult { accepted: false, document: self.descriptor(label)? }); }
        crate::canvas::prepare(patch.clone())?;
        let next = base.checked_add(1).ok_or("Authoring revision exhausted")?;
        let publication = owner.descriptor_revision.checked_add(1).ok_or("Descriptor revision exhausted")?;
        let runtime_revision = admit(owner, &patch)?;
        let owner = self.get_mut(label)?;
        if owner.patch.as_ref() != Some(&patch) {
            if history {
                owner.undo.push_back(Snapshot::new(owner.patch.as_ref().unwrap().clone()));
            }
            owner.redo.clear();
            owner.patch = Some(patch);
            owner.authoring_revision = next;
        }
        owner.runtime_revision = runtime_revision.revision;
        owner.message_text_serial = runtime_revision.message_text_serial;
        owner.descriptor_revision = publication;
        trim_history(owner);
        owner.can_undo = !owner.undo.is_empty(); owner.can_redo = !owner.redo.is_empty();
        owner.dirty = owner.patch.as_ref() != Some(&owner.saved_patch);
        Ok(CommitResult { accepted: true, document: self.descriptor(label)? })
    }

    pub fn history(&mut self, label: &str, base: u64, direction: &str,
        admit: impl FnOnce(&Document, &Value) -> Result<Admission, String>) -> Result<CommitResult, String> {
        let owner = self.get_open(label)?;
        if owner.authoring_revision != base { return Ok(CommitResult { accepted: false, document: self.descriptor(label)? }); }
        let undo = match direction { "undo" => true, "redo" => false, _ => return Err("History direction must be undo or redo".into()) };
        let Some(snapshot) = (if undo { &owner.undo } else { &owner.redo }).back().cloned() else {
            return Ok(CommitResult { accepted: true, document: self.descriptor(label)? });
        };
        let patch = (*snapshot.patch).clone();
        let next = base.checked_add(1).ok_or("Authoring revision exhausted")?;
        let publication = owner.descriptor_revision.checked_add(1).ok_or("Descriptor revision exhausted")?;
        let runtime_revision = admit(owner, &patch)?;
        let owner = self.get_mut(label)?;
        let previous = Snapshot::new(owner.patch.replace(patch).unwrap());
        if undo { owner.undo.pop_back(); owner.redo.push_back(previous); }
        else { owner.redo.pop_back(); owner.undo.push_back(previous); }
        owner.authoring_revision = next; owner.runtime_revision = runtime_revision.revision;
        owner.message_text_serial = runtime_revision.message_text_serial;
        owner.descriptor_revision = publication;
        trim_history(owner);
        owner.can_undo = !owner.undo.is_empty(); owner.can_redo = !owner.redo.is_empty();
        owner.dirty = owner.patch.as_ref() != Some(&owner.saved_patch);
        Ok(CommitResult { accepted: true, document: self.descriptor(label)? })
    }

    pub fn console(&mut self, label: &str, records: Vec<crate::canvas::ConsoleRecord>, dropped: u64) -> Result<(Vec<crate::canvas::ConsoleRecord>, u64), String> {
        let owner = self.get_open(label)?.label.clone();
        let cache = self.consoles.entry(owner).or_default();
        cache.dropped = dropped;
        for record in records {
            cache.next += 1;
            cache.records.push_back((cache.next, record));
            if cache.records.len() > 512 { cache.records.pop_front(); }
        }
        let (cursor, previous_missed) = cache.cursors.get(label).copied().unwrap_or_default();
        let missed = cache.records.front().map_or(0, |(first, _)| first.saturating_sub(cursor + 1));
        let result = cache.records.iter().filter(|(sequence, _)| *sequence > cursor).map(|(_, record)| record.clone()).collect();
        let missed = previous_missed.saturating_add(missed);
        cache.cursors.insert(label.into(), (cache.next, missed));
        Ok((result, missed.saturating_add(cache.dropped)))
    }
}
