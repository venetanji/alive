//! Bounded close admission: flush each ready editor before detaching its view.
use super::*;
use std::collections::BTreeSet;

pub enum CloseGate { Proceed, Waiting, Flush { token: u64, views: Vec<String> } }

struct Request { token: u64, owner: String, awaiting: BTreeSet<String>, members: BTreeSet<String> }
pub struct CloseNotice { pub request_label: String, pub token: u64, pub views: Vec<String> }

#[derive(Default)]
pub(super) struct CloseState {
    ready: BTreeSet<String>,
    requests: BTreeMap<String, Request>,
    sessions: BTreeMap<String, Request>,
    completed: BTreeSet<String>,
    dispatch: BTreeSet<String>,
    serial: u64,
}

impl Registry {
    pub(super) fn ready_owner_views(&self, label: &str) -> Result<Vec<String>, String> {
        Ok(self.owner_views(label)?.into_iter().filter(|view| self.close.ready.contains(view)).collect())
    }
    pub fn mark_ready(&mut self, label: &str) -> Result<Vec<CloseNotice>, String> {
        let owner = self.get_open(label)?.label.clone();
        if !self.close.ready.insert(label.into()) { return Ok(vec![]); }
        let request = self.close.requests.get_mut(&owner).or_else(|| self.close.sessions.get_mut(&owner));
        if let Some(request) = request {
            request.awaiting.insert(label.into());
            request.members.insert(label.into());
            self.close.completed.remove(&owner);
            self.close.dispatch.remove(&owner);
            return Ok(vec![CloseNotice { request_label: owner, token: request.token, views: vec![label.into()] }]);
        }
        Ok(vec![])
    }

    pub fn begin_close(&mut self, label: &str) -> Result<CloseGate, String> {
        let owner = self.get_open(label)?.label.clone();
        if self.close.completed.remove(label) {
            self.require_settled_parameter_gestures(label)?;
            self.close.dispatch.remove(label);
            if let Some(request) = self.close.requests.remove(label) { self.close.sessions.insert(label.into(), request); }
            return Ok(CloseGate::Proceed);
        }
        if self.close.requests.contains_key(label) || self.close.sessions.contains_key(label) { return Ok(CloseGate::Waiting); }
        let views: Vec<_> = if owner == label { self.owner_views(label)? } else { vec![label.into()] }
            .into_iter().filter(|view| self.close.ready.contains(view)).collect();
        if views.is_empty() { self.require_settled_parameter_gestures(label)?;return Ok(CloseGate::Proceed); }
        let token = self.close.serial.checked_add(1).ok_or("Close request identity exhausted")?;
        self.close.serial = token;
        self.close.requests.insert(label.into(), Request { token, owner, awaiting: views.iter().cloned().collect(), members: views.iter().cloned().collect() });
        Ok(CloseGate::Flush { token, views })
    }

    fn validate_close_ack(&self, caller: &str, target: &str, token: u64) -> Result<(), String> {
        let owner = &self.get_open(caller)?.label;
        let request = self.close.requests.get(target).or_else(|| self.close.sessions.get(target)).ok_or("No pending close request")?;
        if request.token != token || &request.owner != owner || !request.awaiting.contains(caller) {
            return Err("Stale or unrelated close acknowledgement".into());
        }
        if self.get_open(target)?.label != *owner { return Err("Close target belongs to another owner".into()); }
        Ok(())
    }

    pub fn acknowledge_close(&mut self, caller: &str, target: &str, token: u64) -> Result<bool, String> {
        self.validate_close_ack(caller, target, token)?;
        if let Some(session) = self.close.sessions.get_mut(target) { session.awaiting.remove(caller); return Ok(false); }
        let request = self.close.requests.get_mut(target).unwrap();
        request.awaiting.remove(caller);
        if !request.awaiting.is_empty() { return Ok(false); }
        self.close.completed.insert(target.into());
        Ok(true)
    }

    pub fn cancel_close(&mut self, target: &str, token: u64) -> Result<CloseNotice, String> {
        if self.close.requests.get(target).or_else(|| self.close.sessions.get(target)).is_none_or(|request| request.token != token) {
            return Err("Stale close request".into());
        }
        self.release_close(target).ok_or_else(|| "Close request was removed".into())
    }

    pub fn reject_close(&mut self, caller: &str, target: &str, token: u64) -> Result<CloseNotice, String> {
        self.validate_close_ack(caller, target, token)?;
        self.cancel_close(target, token)
    }

    pub fn release_close(&mut self, target: &str) -> Option<CloseNotice> {
        self.close.completed.remove(target);
        self.close.dispatch.remove(target);
        self.close.requests.remove(target).or_else(|| self.close.sessions.remove(target))
            .map(|request| CloseNotice { request_label: target.into(), token: request.token, views: request.members.into_iter().collect() })
    }

    pub fn owner_close_active(&self, label: &str) -> Result<bool, String> {
        let owner = &self.get_open(label)?.label;
        Ok(self.close.requests.contains_key(owner) || self.close.sessions.contains_key(owner))
    }

    pub fn allow_close_once(&mut self, label: &str) -> Result<(), String> {
        self.get_open(label)?;
        self.close.completed.insert(label.into());
        Ok(())
    }

    pub fn take_completed_closes(&mut self) -> Vec<String> {
        std::mem::take(&mut self.close.dispatch).into_iter().collect()
    }

    pub(super) fn detach_close(&mut self, label: &str) {
        let removed: BTreeSet<_> = if self.views.contains_key(label) { vec![label.into()] }
            else { self.owner_views(label).unwrap_or_else(|_| vec![label.into()]) }.into_iter().collect();
        for label in &removed {
            self.close.ready.remove(label);
            self.close.requests.remove(label);
            self.close.sessions.remove(label);
            self.close.completed.remove(label);
            self.close.dispatch.remove(label);
        }
        let mut complete = Vec::new();
        for (target, request) in &mut self.close.requests {
            request.awaiting.retain(|view| !removed.contains(view));
            request.members.retain(|view| !removed.contains(view));
            if request.awaiting.is_empty() { complete.push(target.clone()); }
        }
        for target in complete {
            self.close.completed.insert(target.clone());
            self.close.dispatch.insert(target);
        }
        for session in self.close.sessions.values_mut() {
            session.awaiting.retain(|view| !removed.contains(view));
            session.members.retain(|view| !removed.contains(view));
        }
    }
}
