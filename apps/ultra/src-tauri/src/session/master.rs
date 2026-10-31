use super::Document;

#[derive(Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MasterSettings { pub gain: f64 }

#[derive(Clone, Debug, PartialEq)]
pub struct SavedSession { pub score: Document, pub master: MasterSettings, pub launch: super::launch::LaunchSettings }

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
