//! Control-thread-only pending musical history. Live fields never enter payloads.
use super::{Session, Note, Lane};
use serde::{Deserialize, Serialize};
const MAX_BYTES: usize = 8 * 1024 * 1024;
#[derive(Clone, Debug, PartialEq, Serialize)]
pub(super) enum Projection { Legacy(LegacyMusic), Workspaces(WorkspaceMusic) }
#[derive(Clone, Debug, PartialEq, Serialize)]
pub(super) struct LegacyMusic { title:String, tempo:f64, length_beats:f64, loop_enabled:bool, tracks:Vec<MusicTrack>, banks:Vec<super::ClipBank> }
#[derive(Clone, Debug, PartialEq, Serialize)]
struct MusicTrack { id:String, name:String, notes:Vec<Note>, automation:Vec<Lane> }
#[derive(Clone, Debug, PartialEq, Serialize)]
pub(super) struct WorkspaceMusic { title:String, tempo:f64, length_beats:f64, loop_enabled:bool, loop_start_beats:f64, loop_end_beats:f64, tracks:Vec<WorkspaceTrackMusic>, sources:Vec<super::workspaces::SourceV4>, placements:Vec<super::workspaces::PlacementV4> }
#[derive(Clone, Debug, PartialEq, Serialize)]
struct WorkspaceTrackMusic { id:String, name:String, color:String, slots:[Option<super::workspaces::SlotV4>;4], chain:super::workspaces::ChainV4,effects:Vec<super::DeviceInstance> }
fn music_device(device:&super::DeviceInstance)->super::DeviceInstance {
    let mut device=device.clone();device.parameters.clear();device.bypassed=false;device
}
fn workspace_track(track:&super::workspaces::TrackV4)->WorkspaceTrackMusic {
    use super::workspaces::ChainV4;
    WorkspaceTrackMusic{id:track.id.clone(),name:track.name.clone(),color:track.color.clone(),slots:track.slots.clone(),
        chain:match &track.chain{ChainV4::Midi{instrument}=>ChainV4::Midi{instrument:instrument.as_ref().map(music_device)},ChainV4::Audio{}=>ChainV4::Audio{}},
        effects:track.effects.iter().map(music_device).collect()}
}
impl From<&Session> for Projection {
    fn from(document:&Session)->Self {
        match document {
            super::Document::WorkspacesV4(s)=>Self::Workspaces(WorkspaceMusic {title:s.title.clone(),tempo:s.tempo,length_beats:s.length_beats,loop_enabled:s.loop_enabled,loop_start_beats:s.loop_start_beats,loop_end_beats:s.loop_end_beats,tracks:s.tracks.iter().map(workspace_track).collect(),sources:s.sources.clone(),placements:s.placements.clone()}),
            super::Document::LegacyV2(s)|super::Document::ClipsV3(super::clips::ClipDocument{common:s,..})=>Self::Legacy(LegacyMusic { title:s.title.clone(),tempo:s.tempo,length_beats:s.length_beats,loop_enabled:s.loop_enabled,
                tracks:s.tracks.iter().map(|t|MusicTrack{id:t.id.clone(),name:t.name.clone(),notes:t.notes.clone(),automation:t.automation.clone()}).collect(),banks:document.banks().to_vec() })
        }
    }
}
impl Projection {
    fn identities(&self)->std::collections::HashSet<String> {
        match self {
            Self::Legacy(p)=>p.banks.iter().flat_map(|b|b.slots.iter().flatten()).flat_map(|c|std::iter::once(c.id.clone()).chain(c.notes.iter().map(|n|n.id.clone()))).collect(),
            Self::Workspaces(p)=>p.tracks.iter().map(|t|t.id.clone()).chain(p.tracks.iter().flat_map(|t|t.slots.iter().flatten().map(|s|s.id.clone()))).chain(p.sources.iter().map(|s|s.id().to_owned())).chain(p.sources.iter().flat_map(|s|match s {super::workspaces::SourceV4::Midi{notes,..}=>notes.iter().map(|n|n.id.clone()).collect::<Vec<_>>(),super::workspaces::SourceV4::Audio{..}=>vec![]})).chain(p.placements.iter().map(|p|p.id.clone())).collect()
        }
    }
    pub fn materialize(&self, live:&Session)->Result<Session,String> {
        let mut document=live.clone();
        match (self,&mut document) {
            (Self::Workspaces(p),super::Document::WorkspacesV4(s))=>{
                s.title=p.title.clone();s.tempo=p.tempo;s.length_beats=p.length_beats;s.loop_enabled=p.loop_enabled;s.loop_start_beats=p.loop_start_beats;s.loop_end_beats=p.loop_end_beats;s.sources=p.sources.clone();s.placements=p.placements.clone();
                s.tracks=p.tracks.iter().map(|target|{
                    let mut track=s.tracks.iter().find(|t|t.id==target.id).cloned().unwrap_or_else(||super::workspaces::TrackV4{
                        id:target.id.clone(),name:target.name.clone(),color:target.color.clone(),chain:target.chain.clone(),effects:target.effects.clone(),
                        slots:target.slots.clone(),gain:1.,mute:false,solo:false});
                    track.name=target.name.clone();track.color=target.color.clone();track.slots=target.slots.clone();track
                }).collect();
            },
            (Self::Legacy(p),s)=>{
                let common=s.legacy_mut()?;
                if p.tracks.len()!=common.tracks.len() || p.tracks.iter().zip(&common.tracks).any(|(a,b)|a.id!=b.id) { return Err("History belongs to another track scope".into()); }
                common.title=p.title.clone();common.tempo=p.tempo;common.length_beats=p.length_beats;common.loop_enabled=p.loop_enabled;
                for (a,b) in p.tracks.iter().zip(&mut common.tracks) {b.name=a.name.clone();b.notes=a.notes.clone();b.automation=a.automation.clone();}
                if let super::Document::ClipsV3(doc)=s{doc.banks=p.banks.clone();}
            },
            _=>return Err("History belongs to another document mode".into())
        }
        Ok(document)
    }
}
#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all="lowercase")]
pub enum Direction { Undo, Redo }
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub(super) struct View { pub can_undo:bool,pub can_redo:bool,undo_label:Option<String>,redo_label:Option<String> }
#[derive(Clone)]
struct Entry { before:Projection,after:Projection,before_launch:super::launch::LaunchSettings,after_launch:super::launch::LaunchSettings,label:String,bytes:usize }
#[derive(Default,Clone)]
pub(super) struct History { entries:Vec<Entry>,cursor:usize,bytes:usize }
impl History {
    pub fn rebase_audio_paths(&mut self,origin:&std::path::Path,destination:&std::path::Path){
        let old=origin.parent().unwrap_or(std::path::Path::new("."));let new=destination.parent().unwrap_or(std::path::Path::new("."));
        for entry in &mut self.entries {for projection in [&mut entry.before,&mut entry.after] {
            if let Projection::Workspaces(project)=projection {for source in &mut project.sources {
                if let super::workspaces::SourceV4::Audio{file,..}=source {
                    let resolved=old.join(&file.path);let resolved=std::fs::canonicalize(&resolved).unwrap_or(resolved);
                    if let Some(path)=super::persistence::relative_path(new,&resolved).to_str(){file.path=path.to_owned();}
                }
            }}
        }}
    }
    pub fn identities(&self)->std::collections::HashSet<String>{self.entries.iter().flat_map(|e|[&e.before,&e.after]).flat_map(Projection::identities).collect()}
    pub fn clear(&mut self) { *self=Self::default(); }
    pub fn view(&self)->View { View {can_undo:self.cursor>0,can_redo:self.cursor<self.entries.len(),undo_label:self.cursor.checked_sub(1).map(|i|self.entries[i].label.clone()),redo_label:self.entries.get(self.cursor).map(|e|e.label.clone())} }
    pub fn record(&mut self,a:&Session,b:&Session,label:&str)->Result<bool,String> {
        self.record_with_launch(a,b,&Default::default(),&Default::default(),label)
    }
    pub fn record_with_launch(&mut self,a:&Session,b:&Session,before_launch:&super::launch::LaunchSettings,after_launch:&super::launch::LaunchSettings,label:&str)->Result<bool,String> {
        if label.chars().any(char::is_control) {return Err("Edit label cannot contain control characters".into());} let label=label.trim(); if label.is_empty()||label.len()>64 {return Err("Edit label requires 1..64 bytes without control characters".into());}
        let before=Projection::from(a);let after=Projection::from(b);if before==after && before_launch==after_launch{return Ok(false);}
        let bytes=serde_json::to_vec(&before).map_err(|e|e.to_string())?.len()+serde_json::to_vec(&after).map_err(|e|e.to_string())?.len()+serde_json::to_vec(&(before_launch,after_launch)).map_err(|e|e.to_string())?.len()+label.len();
        if bytes>MAX_BYTES { return Err("This edit exceeds the 8 MiB pending history limit".into()); }
        self.entries.truncate(self.cursor);self.bytes=self.entries.iter().map(|e|e.bytes).sum();
        while !self.entries.is_empty()&&(self.entries.len()>=64||self.bytes+bytes>MAX_BYTES) {self.bytes-=self.entries.remove(0).bytes;}
        self.entries.push(Entry{before,after,before_launch:before_launch.clone(),after_launch:after_launch.clone(),label:label.into(),bytes});self.bytes+=bytes;self.cursor=self.entries.len();Ok(true)
    }
    pub fn target(&self,d:Direction)->Result<Projection,String> { match d {
        Direction::Undo=>self.cursor.checked_sub(1).map(|i|self.entries[i].before.clone()),
        Direction::Redo=>self.entries.get(self.cursor).map(|e|e.after.clone())
    }.ok_or_else(||"No pending edit to undo or redo".into()) }
    pub fn target_launch(&self,d:Direction)->Result<super::launch::LaunchSettings,String> {
        match d {Direction::Undo=>self.cursor.checked_sub(1).map(|i|self.entries[i].before_launch.clone()),Direction::Redo=>self.entries.get(self.cursor).map(|e|e.after_launch.clone())}.ok_or_else(||"No pending edit to undo or redo".into())
    }
    pub fn advance(&mut self,d:Direction) {match d {Direction::Undo=>self.cursor-=1,Direction::Redo=>self.cursor+=1}}
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn workspace_track_history_preserves_live_values_by_identity() {
        let project=crate::session::workspaces::prospective_from_document(&score()).unwrap();
        let original=Session::WorkspacesV4(project.clone());
        let mut changed=project.clone();
        let mut inserted=changed.tracks[0].clone();
        inserted.id="fresh-track".into();inserted.name="New MIDI".into();
        inserted.chain=crate::session::workspaces::ChainV4::Midi{instrument:None};
        inserted.effects.clear();inserted.slots=[None,None,None,None];
        changed.tracks.insert(0,inserted);
        let target=Projection::from(&Session::WorkspacesV4(changed));
        let mut live=original.clone();
        let Session::WorkspacesV4(current)=&mut live else{unreachable!()};
        current.tracks[0].gain=0.23;current.tracks[0].mute=true;
        let instance=current.tracks[0].devices().next().unwrap().instance_id.clone();
        live.device_mut(&instance).unwrap().parameters.insert("cutoff".into(),4321.);
        let restored=target.materialize(&live).unwrap();
        let Session::WorkspacesV4(result)=&restored else{unreachable!()};
        assert_eq!(result.tracks[1].id,project.tracks[0].id);
        assert_eq!(result.tracks[1].gain,0.23);assert!(result.tracks[1].mute);
        assert_eq!(result.tracks[1].devices().next().unwrap().parameters["cutoff"],4321.);
        let undone=Projection::from(&original).materialize(&restored).unwrap();
        let Session::WorkspacesV4(undone)=undone else{unreachable!()};
        assert_eq!(undone.tracks.len(),project.tracks.len());
        assert_eq!(undone.tracks[0].gain,0.23);
    }
    fn score() -> crate::session::Session {
        crate::session::read(&std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive")).unwrap().saved.score
    }
    #[test]
    fn musical_history_is_bounded_and_redo_is_transactional() {
        let mut h = History::default(); let mut a = score();
        for i in 0..70 { let mut b=a.clone(); b.legacy_mut().unwrap().title=format!("Title {i}"); h.record(&a,&b,"Rename").unwrap(); a=b; }
        assert_eq!(h.entries.len(),64);
        let restored=h.target(Direction::Undo).unwrap(); assert_eq!(restored.materialize(&a).unwrap().title(),"Title 68");
        h.advance(Direction::Undo); assert!(h.view().can_redo);
        h.record(&a,&a,"No-op").unwrap(); assert!(h.view().can_redo);
        let mut b=a.clone(); b.legacy_mut().unwrap().tempo=123.; h.record(&a,&b,"Tempo").unwrap(); assert!(!h.view().can_redo);
        assert!(h.record(&a,&b,"\n").is_err());
        let mut huge=b.clone(); huge.legacy_mut().unwrap().title="x".repeat(MAX_BYTES); let count=h.entries.len();
        assert!(h.record(&a,&huge,"Large").is_err()); assert_eq!(h.entries.len(),count);
    }
    #[test]
    fn projection_restores_music_onto_current_chain_without_live_fields() {
        let a=score(); let p=Projection::from(&a); let mut current=a.clone();
        current.legacy_mut().unwrap().tracks[0].gain=0.2; current.legacy_mut().unwrap().tracks[0].device.parameters.insert("cutoff".into(),4321.);
        current.legacy_mut().unwrap().tracks[0].device.path="relocated.ultra".into(); current.legacy_mut().unwrap().tempo=130.;
        let restored=p.materialize(&current).unwrap(); assert_eq!(restored.legacy().unwrap().tempo,a.legacy().unwrap().tempo);
        assert_eq!(restored.legacy().unwrap().tracks[0].gain,0.2); assert_eq!(restored.legacy().unwrap().tracks[0].device.parameters["cutoff"],4321.);
        assert_eq!(restored.legacy().unwrap().tracks[0].device.path,"relocated.ultra");
        current.legacy_mut().unwrap().tracks.reverse(); assert!(p.materialize(&current).is_err());
    }
    #[test]
    fn byte_eviction_and_strict_directions_are_bounded() {
        let mut h=History::default();let mut a=score();a.legacy_mut().unwrap().title="a".repeat(100_000);
        for i in 0..64 {let mut b=a.clone();b.legacy_mut().unwrap().tempo=100.+i as f64;h.record(&a,&b,"Tempo").unwrap();a=b;}
        assert!(h.entries.len()<64);assert!(h.bytes<=MAX_BYTES);
        assert!(serde_json::from_str::<Direction>("\"UNDO\"").is_err());
        assert!(serde_json::from_str::<Direction>("\"undo\"").is_ok());
    }

    #[test]
    fn launch_history_tracks_metadata_without_replacing_live_mix() {
        let a=score().to_clips().unwrap();let mut b=a.clone();
        let id=a.banks()[0].slots[0].as_ref().unwrap().id.clone();
        let before=super::super::launch::LaunchSettings::default();let mut after=before.clone();
        after.edit(&a,super::super::launch::Edit::Clip{occurrence_id:id,quantization:super::super::launch::ClipQuantization::None}).unwrap();
        let mut history=History::default();
        assert!(history.record_with_launch(&a,&a,&before,&after,"Launch quantization").unwrap());
        b.legacy_mut().unwrap().tracks[0].gain=0.25;
        assert_eq!(history.target(Direction::Undo).unwrap().materialize(&b).unwrap().tracks()[0].mixer().0,0.25);
        assert_eq!(history.target_launch(Direction::Undo).unwrap(),before);
        history.advance(Direction::Undo);
        assert_eq!(history.target_launch(Direction::Redo).unwrap(),after);
    }

}
