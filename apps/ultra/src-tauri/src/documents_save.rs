//! One bounded, token-fenced snapshot preflight per document owner.
use super::*;
use std::{collections::BTreeSet, sync::mpsc::SyncSender};

struct Request { token: u64, awaiting: BTreeSet<String>, members: BTreeSet<String>, wake: SyncSender<()>, error: Option<String> }
#[derive(Default)]
pub(super) struct SaveState { requests: BTreeMap<String, Request>, reservations: BTreeMap<String, u64>, serial: u64 }
pub struct SaveNotice { pub owner: String, pub token: u64, pub views: Vec<String> }
pub struct SaveSnapshot { pub notice: SaveNotice, pub document: Result<Document, String> }

impl Registry {
    pub fn begin_save(&mut self, label: &str, wake: SyncSender<()>) -> Result<SaveNotice, String> {
        let owner = self.get_open(label)?.label.clone();
        if self.save.reservations.contains_key(&owner) { return Err("A Save is already in progress for this patch".into()); }
        let views = self.ready_owner_views(label)?;
        let token = self.save.serial.checked_add(1).ok_or("Save request identity exhausted")?;
        self.save.serial = token;
        let request = Request { token, awaiting: views.iter().cloned().collect(), members: views.iter().cloned().collect(), wake, error: None };
        if request.awaiting.is_empty() { let _ = request.wake.try_send(()); }
        self.save.reservations.insert(owner.clone(), token);
        self.save.requests.insert(owner.clone(), request);
        Ok(SaveNotice { owner, token, views })
    }

    pub fn mark_save_ready(&mut self, label: &str) -> Result<Option<SaveNotice>, String> {
        let owner = self.get_open(label)?.label.clone();
        let Some(request) = self.save.requests.get_mut(&owner) else { return Ok(None); };
        if request.members.insert(label.into()) {
            request.awaiting.insert(label.into());
            return Ok(Some(SaveNotice { owner, token: request.token, views: vec![label.into()] }));
        }
        Ok(None)
    }

    pub fn acknowledge_save(&mut self, caller: &str, owner: &str, token: u64, error: Option<String>) -> Result<(), String> {
        if self.get_open(caller)?.label != owner { return Err("Save acknowledgement belongs to another owner".into()); }
        let request = self.save.requests.get_mut(owner).ok_or("No pending Save request")?;
        if request.token != token || !request.awaiting.remove(caller) { return Err("Stale or unrelated Save acknowledgement".into()); }
        if error.is_some() { request.error = Some("A linked view has an invalid or unadmitted draft".into()); }
        if request.error.is_some() || request.awaiting.is_empty() { let _ = request.wake.try_send(()); }
        Ok(())
    }

    pub fn finish_save_preflight(&mut self, owner: &str, token: u64, timeout: bool) -> Result<Option<SaveSnapshot>, String> {
        let request = self.save.requests.get(owner).ok_or("No pending Save request")?;
        if request.token != token { return Err("Stale Save request".into()); }
        if !timeout && request.error.is_none() && !request.awaiting.is_empty() { return Ok(None); }
        let request = self.save.requests.remove(owner).unwrap();
        let document = if timeout { Err("Timed out waiting for linked views to flush".into()) }
            else if let Some(error) = request.error { Err(error) }
            else { self.get_open(owner).cloned() };
        Ok(Some(SaveSnapshot { notice: SaveNotice { owner: owner.into(), token, views: request.members.into_iter().collect() }, document }))
    }

    pub fn save_barrier_active(&self, caller: &str, owner: &str, token: u64) -> Result<bool, String> {
        if self.get_open(caller)?.label != owner { return Err("Save barrier belongs to another owner".into()); }
        Ok(self.save.requests.get(owner).is_some_and(|request| request.token == token && request.members.contains(caller)))
    }

    pub fn end_save(&mut self, owner: &str, token: u64) -> Result<Option<SaveNotice>, String> {
        if self.save.reservations.get(owner) != Some(&token) { return Err("Stale Save reservation".into()); }
        self.save.reservations.remove(owner);
        Ok(self.save.requests.remove(owner).map(|request| SaveNotice { owner: owner.into(), token, views: request.members.into_iter().collect() }))
    }

    pub(super) fn detach_save(&mut self, label: &str) {
        let Ok(owner) = self.get(label).map(|document| document.label.clone()) else { return; };
        if let Some(request) = self.save.requests.get_mut(&owner) {
            if label == owner || request.members.contains(label) {
                request.error = Some("A linked view closed during Save preflight".into());
                let _ = request.wake.try_send(());
            }
        }
    }
}
