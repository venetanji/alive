//! Command-primary identities are separate from the model's invalidation set.
use super::workspaces::*;
use serde::Serialize;
#[derive(Default,Debug,Serialize)]
#[serde(rename_all="camelCase")]
pub struct Affected {pub track_id:Option<String>,pub source_id:Option<String>,pub slot_id:Option<String>,pub placement_id:Option<String>,pub note_id:Option<String>}
pub fn primary(before:&ProjectV4,after:&ProjectV4,operation:&WorkspaceEditV4)->Result<Affected,String>{
    use WorkspaceEditV4::*;
    let mut result=Affected::default();
    let source=|id:&str|before.sources.iter().chain(&after.sources).find(|s|s.id()==id).ok_or("Missing primary source");
    let new_source=||after.sources.iter().find(|s|!before.sources.iter().any(|old|old.id()==s.id())).ok_or("Missing created source");
    let slot=|p:&ProjectV4,track:&str,id:&str|p.tracks.iter().find(|t|t.id==track).and_then(|t|t.slots.iter().flatten().find(|s|s.id==id)).map(|s|s.clone()).ok_or("Missing primary slot");
    let placement=|id:&str|before.placements.iter().find(|p|p.id==id).ok_or("Missing primary placement");
    match operation {
        SourceCreateMidi{track_id,..}=>{result.track_id=Some(track_id.clone());result.source_id=Some(new_source()?.id().into());},
        SourceRename{source_id,..}|SourceLength{source_id,..}|SourceDelete{source_id}|AutomationSet{source_id,..}|NoteUpdate{source_id,..}|NoteDelete{source_id,..}|NoteCreate{source_id,..}=>{
            result.track_id=Some(source(source_id)?.track_id().into());result.source_id=Some(source_id.clone());
            match operation {
                NoteUpdate{note_id,..}|NoteDelete{note_id,..}=>result.note_id=Some(note_id.clone()),
                NoteCreate{..}=>{let old=before.identities();let Some(SourceV4::Midi{notes,..})=after.sources.iter().find(|s|s.id()==source_id)else{return Err("Missing MIDI source".into())};result.note_id=Some(notes.iter().find(|n|!old.contains(&n.id)).ok_or("Missing created note")?.id.clone());},_=>{}
            }
        },
        SourceIndependent{occurrence}=>match occurrence {
            OccurrenceV4::Slot{track_id,slot_id}=>{let s=slot(after,track_id,slot_id)?;result.track_id=Some(track_id.clone());result.source_id=Some(s.source_id);result.slot_id=Some(slot_id.clone());},
            OccurrenceV4::Placement{placement_id}=>{let p=after.placements.iter().find(|p|&p.id==placement_id).ok_or("Missing independent placement")?;result.track_id=Some(p.track_id.clone());result.source_id=Some(p.source_id.clone());result.placement_id=Some(placement_id.clone());}
        },
        SlotAssign{track_id,slot:cell,..}|SlotDuplicate{track_id,destination_slot:cell,..}=>{let s=after.tracks.iter().find(|t|&t.id==track_id).and_then(|t|t.slots.get(*cell as usize)).and_then(Option::as_ref).ok_or("Missing created slot")?;result.track_id=Some(track_id.clone());result.source_id=Some(s.source_id.clone());result.slot_id=Some(s.id.clone());},
        SlotUpdate{track_id,slot_id,..}|SlotDelete{track_id,slot_id}=>{let s=slot(before,track_id,slot_id)?;result.track_id=Some(track_id.clone());result.source_id=Some(s.source_id);result.slot_id=Some(slot_id.clone());},
        PlacementCreate{..}|PlacementDuplicate{..}=>{let p=after.placements.iter().find(|p|!before.placements.iter().any(|old|old.id==p.id)).ok_or("Missing created placement")?;result.track_id=Some(p.track_id.clone());result.source_id=Some(p.source_id.clone());result.placement_id=Some(p.id.clone());},
        PlacementUpdate{placement_id,..}|PlacementDelete{placement_id}=>{let p=placement(placement_id)?;result.track_id=Some(p.track_id.clone());result.source_id=Some(p.source_id.clone());result.placement_id=Some(p.id.clone());},
        TrackPresentation{track_id,..}=>result.track_id=Some(track_id.clone()),TransportRange{..}=>{}
    }Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn command_primary_ids_follow_the_operation_not_sorted_invalidation(){
        let path=std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive");
        let document=super::super::read(&path).unwrap().document;
        let original=prospective_from_document(&document).unwrap();let track=original.tracks[0].id.clone();let slot=original.tracks[0].slots[0].as_ref().unwrap().clone();let source=slot.source_id.clone();let placement=original.placements[0].id.clone();
        for operation in [
            WorkspaceEditV4::SlotDuplicate{track_id:track.clone(),slot_id:slot.id.clone(),destination_slot:1},
            WorkspaceEditV4::SourceIndependent{occurrence:OccurrenceV4::Slot{track_id:track.clone(),slot_id:slot.id.clone()}},
            WorkspaceEditV4::SourceIndependent{occurrence:OccurrenceV4::Placement{placement_id:placement.clone()}},
            WorkspaceEditV4::SourceRename{source_id:source.clone(),name:"Shared renamed".into()},
            WorkspaceEditV4::SlotDelete{track_id:track.clone(),slot_id:slot.id.clone()},
            WorkspaceEditV4::PlacementDelete{placement_id:placement.clone()},
        ] {
            let edited=apply_edit(&original,operation.clone(),&Default::default()).unwrap();let result=primary(&original,&edited.project,&operation).unwrap();
            assert_eq!(result.track_id.as_deref(),Some(track.as_str()));assert!(result.note_id.is_none());
            match operation {
                WorkspaceEditV4::SlotDuplicate{..}=>{assert_eq!(result.source_id.as_deref(),Some(source.as_str()));assert_ne!(result.slot_id.as_deref(),Some(slot.id.as_str()));assert!(result.placement_id.is_none());},
                WorkspaceEditV4::SourceIndependent{occurrence:OccurrenceV4::Slot{..}}=>{assert_ne!(result.source_id.as_deref(),Some(source.as_str()));assert_eq!(result.slot_id.as_deref(),Some(slot.id.as_str()));assert!(result.placement_id.is_none());},
                WorkspaceEditV4::SourceIndependent{occurrence:OccurrenceV4::Placement{..}}=>{assert_ne!(result.source_id.as_deref(),Some(source.as_str()));assert_eq!(result.placement_id.as_deref(),Some(placement.as_str()));assert!(result.slot_id.is_none());},
                WorkspaceEditV4::SourceRename{..}=>{assert_eq!(result.source_id.as_deref(),Some(source.as_str()));assert!(result.slot_id.is_none()&&result.placement_id.is_none());},
                WorkspaceEditV4::SlotDelete{..}=>assert_eq!(result.slot_id.as_deref(),Some(slot.id.as_str())),
                WorkspaceEditV4::PlacementDelete{..}=>assert_eq!(result.placement_id.as_deref(),Some(placement.as_str())),_=>unreachable!()
            }
            let value=serde_json::to_value(result).unwrap();assert_eq!(value.as_object().unwrap().len(),5);assert!(value["noteId"].is_null());
        }
    }
}
