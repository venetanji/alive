//! Compile immutable MIDI sources once; occurrences retain preparation-local maps.
use super::{*, prepare::{FrameEvent, PreparedTrack, PreparedTrackInput}, workspaces::*};
use std::{collections::BTreeMap, path::Path};

#[derive(Clone, Debug)]
pub struct PreparedSource {pub id:String,pub name:String,pub descriptor:native::SourceV4}
#[derive(Clone, Debug)]
pub struct PreparedSlot {pub id:String,pub name:String,pub slot:usize,pub descriptor:native::SlotV4}
#[derive(Clone, Debug)]
pub struct PreparedPlacement {pub id:String,pub descriptor:native::PlacementV4}
#[derive(Clone, Debug)]
pub struct PreparedWorkspaces {pub sources:Vec<PreparedSource>,pub slots:Vec<PreparedSlot>,pub placements:Vec<PreparedPlacement>}

pub(super) fn prepare(project:&ProjectV4,path:&Path)->Result<PreparedSession,String> {
    project.validate()?;
    midi_only(project)?;
    // Storage bounds are an early rejection only. Host admission proves all work.
    if project.tracks.len()>2 || project.tracks.iter().map(|t|t.devices().count()).sum::<usize>()>6 {
        return Err("Measured workspace profile 1 supports at most two tracks and six roots; the complete musical work envelope may impose a lower limit. Profile 2 is not admitted. Keep this project in its current playable mode.".into());
    }
    let document=Document::WorkspacesV4(project.clone());
    super::prepare::check_sources(&document,path,None)?;
    let mut references:Vec<_>=project.tracks.iter().enumerate().flat_map(|(track,t)|t.devices().enumerate().map(move |(position,d)|(track,position,d))).collect();
    references.sort_by_key(|(_,_,d)|&d.instance_id);
    let mut prepared=PreparedSession{origin:path.to_owned(),document,tracks:vec![],devices:vec![],events:vec![],length_frames:frame_at(project.length_beats,project.tempo)?,schedule:Schedule::Workspaces(PreparedWorkspaces{sources:vec![],slots:vec![],placements:vec![]}),notice:None};
    for (track,position,reference) in references {
        let device=super::prepare::prepare_device(reference,path,track).map_err(|e|format!("Track '{}' instance '{}': {e}",project.tracks[track].name,reference.instance_id))?;
        let expected=if position==0 {crate::canvas::device::DeviceKind::Instrument}else{crate::canvas::device::DeviceKind::AudioEffect};
        if device.manifest.kind!=expected || (position==0&&reference.bypassed) {return Err(format!("Track '{}' instance '{}' has incompatible instrument/effect role",project.tracks[track].name,reference.instance_id));}
        prepared.document.device_mut(&reference.instance_id)?.parameters=device.manifest.parameters.iter().map(|p|(p.key.clone(),p.base)).collect();
        prepared.devices.push(device);
    }
    compile(project,&mut prepared)?;
    Ok(prepared)
}
fn midi_only(project:&ProjectV4)->Result<(),String>{
    if project.tracks.iter().any(|t|matches!(t.chain,ChainV4::Audio{}))||project.sources.iter().any(|s|matches!(s,SourceV4::Audio{..})) {Err("Audio sources are unavailable until WAV preparation and playback are implemented".into())}else{Ok(())}
}
pub(super) fn compile(project:&ProjectV4,prepared:&mut PreparedSession)->Result<(),String>{
    project.validate()?;midi_only(project)?;
    let frame=|beat|frame_at(beat,project.tempo);
    let mut events=Vec::new();let mut sources=Vec::new();let mut slots=Vec::new();let mut placements=Vec::new();let mut tracks=Vec::new();
    let device_index=|id:&str,track:usize|prepared.devices.iter().position(|d|d.instance_id==id&&d.track==track).ok_or_else(||format!("Missing or cross-track instance '{id}'"));
    let track_map:BTreeMap<_,_>=project.tracks.iter().enumerate().map(|(i,t)|(t.id.as_str(),i)).collect();
    for (index,t) in project.tracks.iter().enumerate(){
        let ChainV4::Midi{instrument}=&t.chain else{return Err("Audio sources are unavailable".into())};
        tracks.push(PreparedTrack{input:PreparedTrackInput::Midi{instrument:device_index(&instrument.instance_id,index)?},effects:t.effects.iter().map(|e|device_index(&e.instance_id,index)).collect::<Result<_,_>>()?});
    }
    let mut ordered:Vec<_>=project.sources.iter().collect();ordered.sort_by_key(|s|(track_map[s.track_id()],s.id()));
    for source in ordered {
        let SourceV4::Midi{id,track_id,name,length_beats,notes,automation}=source else{return Err("Audio sources are unavailable".into())};
        let track=track_map[track_id.as_str()];let begin=events.len();let length=frame(*length_beats)?;let mut masks=[0;16];
        for note in notes {
            let start=frame(note.beat)?;let end=frame(note.beat+note.duration)?;
            events.push(FrameEvent{frame:start,track:track as u32,kind:2,device:tracks[track].midi_instrument()? as u32,target:note.pitch,value:note.velocity as f64});
            if end<length {events.push(FrameEvent{frame:end,track:track as u32,kind:0,device:tracks[track].midi_instrument()? as u32,target:note.pitch,value:0.});}
        }
        for lane in automation {
            let device=device_index(&lane.instance_id,track)?;
            let (parameter,binding)=prepared.devices[device].manifest.parameters.iter().enumerate().find(|(_,p)|p.key==lane.key).ok_or_else(||format!("Source '{id}': unknown automation parameter '{}'",lane.key))?;
            if lane.enabled {masks[device]|=1<<parameter;}
            for point in &lane.points {
                super::prepare::binding_value(binding,point.value).map_err(|e|format!("Source '{id}': {e}"))?;
                if lane.enabled {events.push(FrameEvent{frame:frame(point.beat)?,track:track as u32,kind:1,device:device as u32,target:parameter as u32,value:point.value});}
            }
        }
        events[begin..].sort_by_key(|e|(e.frame,e.kind,e.track,e.device,e.target));
        sources.push(PreparedSource{id:id.clone(),name:name.clone(),descriptor:native::SourceV4{track:track as u32,event_begin:begin as u32,event_count:(events.len()-begin) as u32,lane_count:automation.iter().filter(|l|l.enabled).count() as u32,length_frames:length,owned_masks:masks,..Default::default()}});
    }
    if events.len()>1024 {return Err("Workspace sources exceed 1024 compiled events".into());}
    let source_map:BTreeMap<_,_>=sources.iter().enumerate().map(|(i,s)|(s.id.as_str(),i)).collect();
    let offset=|o:&SourceOffsetV4|match o {SourceOffsetV4::Beats{value}=>frame(*value),SourceOffsetV4::Frames{..}=>Err("MIDI occurrences require beat offsets".into())};
    for (track,t) in project.tracks.iter().enumerate(){for (slot,s) in t.slots.iter().enumerate(){if let Some(s)=s{slots.push(PreparedSlot{id:s.id.clone(),name:s.name.clone(),slot,descriptor:native::SlotV4{track:track as u32,source:source_map[s.source_id.as_str()] as u32,source_offset:offset(&s.source_offset)?,loop_enabled:s.loop_enabled as u32,..Default::default()}});}}}
    for p in &project.placements {let start=frame(p.start)?;placements.push(PreparedPlacement{id:p.id.clone(),descriptor:native::PlacementV4{track:track_map[p.track_id.as_str()] as u32,source:source_map[p.source_id.as_str()] as u32,start_frame:start,duration_frames:frame(p.start+p.duration)?-start,source_offset:offset(&p.source_offset)?,loop_enabled:p.loop_enabled as u32,..Default::default()}});}
    placements.sort_by(|a,b|(a.descriptor.track,a.descriptor.start_frame,&a.id).cmp(&(b.descriptor.track,b.descriptor.start_frame,&b.id)));
    prepared.events=events;prepared.tracks=tracks;prepared.length_frames=frame(project.length_beats)?;
    prepared.schedule=Schedule::Workspaces(PreparedWorkspaces{sources,slots,placements});Ok(())
}
