//! Alive's saved musical model and off-callback device preparation.
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
mod prepare;
mod master;
mod launch;
pub use master::{MasterSettings, SaveWire, SavedSession};
pub use prepare::{prepare, PreparedSession, Schedule};
mod persistence;
mod history;
mod clips;
mod document;
mod prepare_workspaces;
mod wav;
pub mod workspaces;
mod runtime;
mod runtime_workspaces;
mod workspace_edits;
mod browser;
pub use clips::{Document, ClipBank};
pub type Session = Document;
pub use persistence::{read, save};
pub mod native;
mod native_master;
mod native_launch;
mod native_midi;
mod native_publication;
pub mod host;
pub mod probe;
pub mod desktop;

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LegacySession {
    pub format: String,
    pub title: String,
    pub tempo: f64,
    pub length_beats: f64,
    pub loop_enabled: bool,
    pub tracks: Vec<Track>,
}
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Track {
    pub id: String,
    pub name: String,
    pub device: DeviceInstance,
    pub effects: Vec<DeviceInstance>,
    pub notes: Vec<Note>,
    pub automation: Vec<Lane>,
    pub gain: f64,
    pub mute: bool,
    pub solo: bool,
}
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DeviceInstance {
    pub instance_id: String,
    pub source_sha256: String,
    pub bypassed: bool,
    pub path: String,
    pub id: String,
    pub version: u32,
    pub parameters: BTreeMap<String, f64>,
}
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Note { pub beat: f64, pub duration: f64, pub pitch: u32, pub velocity: u32 }
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Lane { pub instance_id: String, pub key: String, pub enabled: bool, pub points: Vec<Point> }
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Point { pub beat: f64, pub value: f64 }

#[cfg(test)]
mod tests;

impl Track {
    pub fn devices(&self) -> impl Iterator<Item = &DeviceInstance> { std::iter::once(&self.device).chain(&self.effects) }
    pub fn devices_mut(&mut self) -> impl Iterator<Item = &mut DeviceInstance> { std::iter::once(&mut self.device).chain(&mut self.effects) }
}
