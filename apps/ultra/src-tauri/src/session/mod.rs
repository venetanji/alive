//! Alive's saved musical model and off-callback device preparation.
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
mod prepare;
mod master;
mod launch;
pub use master::{MasterSettings, SavedSession};
pub use prepare::{prepare, PreparedSession};
mod persistence;
mod history;
mod document;
mod prepare_workspaces;
mod wav;
pub mod workspaces;
mod runtime;
mod runtime_workspaces;
mod workspace_edits;
mod browser;
pub use workspaces::ProjectV4 as Document;
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
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Lane { pub instance_id: String, pub key: String, pub enabled: bool, pub points: Vec<Point> }
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Point { pub beat: f64, pub value: f64 }

#[cfg(test)]
mod tests;
