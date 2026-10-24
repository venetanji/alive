//! Control-thread-only pending musical history. Live fields never enter payloads.
use super::{Session, Note, Lane};
use serde::{Deserialize, Serialize};
const MAX_BYTES: usize = 8 * 1024 * 1024;
#[derive(Clone, Debug, PartialEq, Serialize)]
pub(super) struct Projection { title:String, tempo:f64, length_beats:f64, loop_enabled:bool, tracks:Vec<MusicTrack> }
#[derive(Clone, Debug, PartialEq, Serialize)]
struct MusicTrack { id:String, name:String, notes:Vec<Note>, automation:Vec<Lane> }
impl From<&Session> for Projection {
    fn from(s:&Session)->Self { Self { title:s.title.clone(),tempo:s.tempo,length_beats:s.length_beats,loop_enabled:s.loop_enabled,
        tracks:s.tracks.iter().map(|t|MusicTrack{id:t.id.clone(),name:t.name.clone(),notes:t.notes.clone(),automation:t.automation.clone()}).collect() } }
}
impl Projection {
    pub fn materialize(&self, live:&Session)->Result<Session,String> {
        if self.tracks.len()!=live.tracks.len() || self.tracks.iter().zip(&live.tracks).any(|(a,b)|a.id!=b.id) { return Err("History belongs to another track scope".into()); }
        let mut s=live.clone(); s.title=self.title.clone();s.tempo=self.tempo;s.length_beats=self.length_beats;s.loop_enabled=self.loop_enabled;
        for (a,b) in self.tracks.iter().zip(&mut s.tracks) {b.name=a.name.clone();b.notes=a.notes.clone();b.automation=a.automation.clone();} Ok(s)
    }
}
#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all="lowercase")]
pub enum Direction { Undo, Redo }
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub(super) struct View { pub can_undo:bool,pub can_redo:bool,undo_label:Option<String>,redo_label:Option<String> }
struct Entry { before:Projection,after:Projection,label:String,bytes:usize }
#[derive(Default)]
pub(super) struct History { entries:Vec<Entry>,cursor:usize,bytes:usize }
impl History {
    pub fn clear(&mut self) { *self=Self::default(); }
    pub fn view(&self)->View { View {can_undo:self.cursor>0,can_redo:self.cursor<self.entries.len(),undo_label:self.cursor.checked_sub(1).map(|i|self.entries[i].label.clone()),redo_label:self.entries.get(self.cursor).map(|e|e.label.clone())} }
    pub fn record(&mut self,a:&Session,b:&Session,label:&str)->Result<bool,String> {
        if label.chars().any(char::is_control) {return Err("Edit label cannot contain control characters".into());} let label=label.trim(); if label.is_empty()||label.len()>64 {return Err("Edit label requires 1..64 bytes without control characters".into());}
        let before=Projection::from(a);let after=Projection::from(b);if before==after{return Ok(false);}
        let bytes=serde_json::to_vec(&before).map_err(|e|e.to_string())?.len()+serde_json::to_vec(&after).map_err(|e|e.to_string())?.len()+label.len();
        if bytes>MAX_BYTES { return Err("This edit exceeds the 8 MiB pending history limit".into()); }
        self.entries.truncate(self.cursor);self.bytes=self.entries.iter().map(|e|e.bytes).sum();
        while !self.entries.is_empty()&&(self.entries.len()>=64||self.bytes+bytes>MAX_BYTES) {self.bytes-=self.entries.remove(0).bytes;}
        self.entries.push(Entry{before,after,label:label.into(),bytes});self.bytes+=bytes;self.cursor=self.entries.len();Ok(true)
    }
    pub fn target(&self,d:Direction)->Result<Projection,String> { match d {
        Direction::Undo=>self.cursor.checked_sub(1).map(|i|self.entries[i].before.clone()),
        Direction::Redo=>self.entries.get(self.cursor).map(|e|e.after.clone())
    }.ok_or_else(||"No pending edit to undo or redo".into()) }
    pub fn advance(&mut self,d:Direction) {match d {Direction::Undo=>self.cursor-=1,Direction::Redo=>self.cursor+=1}}
}

#[cfg(test)]
mod tests {
    use super::*;
    fn score() -> crate::session::Session {
        crate::session::read(&std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive")).unwrap().document
    }
    #[test]
    fn musical_history_is_bounded_and_redo_is_transactional() {
        let mut h = History::default(); let mut a = score();
        for i in 0..70 { let mut b=a.clone(); b.title=format!("Title {i}"); h.record(&a,&b,"Rename").unwrap(); a=b; }
        assert_eq!(h.entries.len(),64);
        let restored=h.target(Direction::Undo).unwrap(); assert_eq!(restored.title,"Title 68");
        h.advance(Direction::Undo); assert!(h.view().can_redo);
        h.record(&a,&a,"No-op").unwrap(); assert!(h.view().can_redo);
        let mut b=a.clone(); b.tempo=123.; h.record(&a,&b,"Tempo").unwrap(); assert!(!h.view().can_redo);
        assert!(h.record(&a,&b,"\n").is_err());
        let mut huge=b.clone(); huge.title="x".repeat(MAX_BYTES); let count=h.entries.len();
        assert!(h.record(&a,&huge,"Large").is_err()); assert_eq!(h.entries.len(),count);
    }
    #[test]
    fn projection_restores_music_onto_current_chain_without_live_fields() {
        let a=score(); let p=Projection::from(&a); let mut current=a.clone();
        current.tracks[0].gain=0.2; current.tracks[0].device.parameters.insert("cutoff".into(),4321.);
        current.tracks[0].device.path="relocated.ultra".into(); current.tempo=130.;
        let restored=p.materialize(&current).unwrap(); assert_eq!(restored.tempo,a.tempo);
        assert_eq!(restored.tracks[0].gain,0.2); assert_eq!(restored.tracks[0].device.parameters["cutoff"],4321.);
        assert_eq!(restored.tracks[0].device.path,"relocated.ultra");
        current.tracks.reverse(); assert!(p.materialize(&current).is_err());
    }
    #[test]
    fn byte_eviction_and_strict_directions_are_bounded() {
        let mut h=History::default();let mut a=score();a.title="a".repeat(100_000);
        for i in 0..64 {let mut b=a.clone();b.tempo=100.+i as f64;h.record(&a,&b,"Tempo").unwrap();a=b;}
        assert!(h.entries.len()<64);assert!(h.bytes<=MAX_BYTES);
        assert!(serde_json::from_str::<Direction>("\"UNDO\"").is_err());
        assert!(serde_json::from_str::<Direction>("\"undo\"").is_ok());
    }

}
