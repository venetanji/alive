//! Saved launch intent belongs to Session occurrences, never source indices.
use super::Document;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[repr(u32)]
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all="camelCase")]
pub enum Quantization {
    None, ThirtySecond, Sixteenth, Eighth, Quarter, Half,
    #[default] Bar1, Bar2, Bar4, Bar8,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all="camelCase")]
pub enum ClipQuantization { Global, None, ThirtySecond, Sixteenth, Eighth, Quarter, Half, Bar1, Bar2, Bar4, Bar8 }
impl ClipQuantization {
    pub fn explicit(self) -> Option<Quantization> {
        Some(match self {
            Self::Global=>return None, Self::None=>Quantization::None,
            Self::ThirtySecond=>Quantization::ThirtySecond, Self::Sixteenth=>Quantization::Sixteenth,
            Self::Eighth=>Quantization::Eighth, Self::Quarter=>Quantization::Quarter,
            Self::Half=>Quantization::Half, Self::Bar1=>Quantization::Bar1,
            Self::Bar2=>Quantization::Bar2, Self::Bar4=>Quantization::Bar4, Self::Bar8=>Quantization::Bar8,
        })
    }
}
#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all="camelCase", deny_unknown_fields)]
pub struct Override { pub occurrence_id: String, pub quantization: ClipQuantization }
#[derive(Clone, Debug, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all="camelCase", deny_unknown_fields)]
pub struct LaunchSettings { pub global_quantization: Quantization, pub clip_quantization: Vec<Override> }
#[derive(Deserialize)]
#[serde(tag="kind",rename_all="camelCase",rename_all_fields="camelCase",deny_unknown_fields)]
pub enum Edit { Global { quantization: Quantization }, Clip { occurrence_id: String, quantization: ClipQuantization } }

impl LaunchSettings {
    pub fn occurrences(score:&Document)->HashSet<&str> {
        match score {
            Document::ClipsV3(s)=>s.banks.iter().flat_map(|b|b.slots.iter().flatten().map(|c|c.id.as_str())).collect(),
            Document::WorkspacesV4(s)=>s.tracks.iter().flat_map(|t|t.slots.iter().flatten().map(|c|c.id.as_str())).collect(),
            Document::LegacyV2(_)=>HashSet::new(),
        }
    }
    pub fn validate(&self,score:&Document)->Result<(),String> {
        if self.clip_quantization.len()>32 {return Err("Launch settings exceed 32 Session occurrences".into());}
        let owned=Self::occurrences(score);let mut seen=HashSet::new();
        for entry in &self.clip_quantization {
            super::prepare::token(&entry.occurrence_id,"Launch occurrence ID")?;
            if !owned.contains(entry.occurrence_id.as_str()) {return Err("Launch override targets a missing or foreign Session occurrence".into());}
            if !seen.insert(&entry.occurrence_id) {return Err("Duplicate launch occurrence ID".into());}
        }
        Ok(())
    }
    pub fn effective(&self,id:Option<&str>)->Quantization {
        id.and_then(|id|self.clip_quantization.iter().find(|o|o.occurrence_id==id))
            .and_then(|o|o.quantization.explicit()).unwrap_or(self.global_quantization)
    }
    pub fn retain_owned(&mut self,score:&Document) {
        let owned=Self::occurrences(score);
        self.clip_quantization.retain(|o|owned.contains(o.occurrence_id.as_str()));
    }
    pub fn copy_override(&mut self,from:&str,to:&str) {
        if let Some(quantization)=self.clip_quantization.iter().find(|o|o.occurrence_id==from).map(|o|o.quantization) {
            self.clip_quantization.push(Override{occurrence_id:to.into(),quantization});
        }
    }
    pub fn edit(&mut self,score:&Document,edit:Edit)->Result<(),String> {
        match edit {
            Edit::Global{quantization}=>self.global_quantization=quantization,
            Edit::Clip{occurrence_id,quantization}=>{
                if !Self::occurrences(score).contains(occurrence_id.as_str()){return Err("Select an occupied Session clip".into());}
                self.clip_quantization.retain(|o|o.occurrence_id!=occurrence_id);
                if quantization!=ClipQuantization::Global {self.clip_quantization.push(Override{occurrence_id,quantization});}
            }
        }
        self.validate(score)
    }
}
