use super::Document;

#[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MasterSettings { pub gain: f64 }

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SaveWire { LegacyScore, V5, V6 }

#[derive(Clone, Debug, PartialEq)]
pub struct SavedSession { pub score: Document, pub master: MasterSettings, pub launch: super::launch::LaunchSettings, pub wire: SaveWire }

impl SavedSession {
    pub fn with_score(&self, score: Document) -> Self {
        let mut saved = self.clone();
        saved.score = score;
        saved
    }
    pub fn validate_master(&self) -> Result<(), String> {
        super::prepare::bounded(self.master.gain, 0., 4., "Master gain")
    }
}
