//! Alive's saved musical model and off-callback device preparation.
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
mod prepare;
pub use prepare::{prepare, PreparedSession};
mod persistence;
pub use persistence::{read, save};
pub mod native;
pub mod host;
pub mod probe;

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Session {
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
    pub device: DeviceReference,
    pub notes: Vec<Note>,
    pub automation: Vec<Lane>,
    pub gain: f64,
    pub mute: bool,
    pub solo: bool,
}
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DeviceReference {
    pub path: String,
    pub id: String,
    pub version: u32,
    pub parameters: BTreeMap<String, f64>,
}
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Note { pub beat: f64, pub duration: f64, pub pitch: u32, pub velocity: u32 }
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Lane { pub key: String, pub enabled: bool, pub points: Vec<Point> }
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Point { pub beat: f64, pub value: f64 }

#[cfg(test)]
mod tests;
