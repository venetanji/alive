//! Musical state/history become authoritative only after exact native APPLIED.
use super::*;
use crate::session::{native_midi,native_publication,workspaces::ProjectV4};

pub(super) struct Pending {
    serial:u64,preparation:u64,candidate:PreparedSession,history:History,
}
fn map_ids<'a>(old:impl Iterator<Item=&'a str>,new:impl Iterator<Item=&'a str>,out:&mut [u32]) {
    let new:Vec<_>=new.collect();
    for (i,id) in old.enumerate(){out[i]=new.iter().position(|target|*target==id).map_or(native::V4_NONE,|i|i as u32);}
}
fn track_music(project:&ProjectV4,id:&str)->Projection {
    let mut project=project.clone();project.tracks.retain(|t|t.id==id);
    project.sources.retain(|s|s.track_id()==id);project.placements.retain(|p|p.track_id==id);
    Projection::from(&Document::WorkspacesV4(project))
}
fn metadata_only(before:&ProjectV4,after:&ProjectV4)->bool {
    let mut normalized=after.clone();normalized.title=before.title.clone();
    for track in &mut normalized.tracks {if let Some(old)=before.tracks.iter().find(|t|t.id==track.id){
        track.name=old.name.clone();track.color=old.color.clone();
        for slot in track.slots.iter_mut().flatten(){if let Some(previous)=old.slots.iter().flatten().find(|s|s.id==slot.id){slot.name=previous.name.clone();}}
    }}
    for source in &mut normalized.sources {if let Some(old)=before.sources.iter().find(|s|s.id()==source.id()){
        let name=match old {workspaces::SourceV4::Midi{name,..}|workspaces::SourceV4::Audio{name,..}=>name.clone()};
        match source {workspaces::SourceV4::Midi{name:target,..}|workspaces::SourceV4::Audio{name:target,..}=>*target=name}
    }}
    Projection::from(&Document::WorkspacesV4(normalized))==Projection::from(&Document::WorkspacesV4(before.clone()))
}
impl Control {
    pub(super) fn midi_reconcile(&mut self)->Option<String>{
        let pending=self.midi_pending.as_ref()?;
        let observed=native_publication::capability()?.state().ok()?;
        if observed.preparation_revision!=pending.preparation||observed.serial!=pending.serial
            ||!matches!(observed.status,native::V4_APPLIED|native::V4_REJECTED|native::V4_CANCELED)
            ||observed.retired_serial<pending.serial{return None}
        let mut pending=self.midi_pending.take()?;
        if observed.status!=native::V4_APPLIED {
            let error=format!("Musical edit was refused by playback (reason {}). Previous music and undo history are retained.",observed.error);
            self.save_feedback=Some(error.clone());return Some(error)
        }
        let current=self.host.prepared.as_ref().expect("pending edit retains prepared owner");
        merge_live(&mut pending.candidate.saved.score,&current.saved.score);
        pending.candidate.saved.master=current.saved.master.clone();
        // Knob edits may arrive while audio is acknowledging this schedule.
        for device in &mut pending.candidate.devices {
            let track=device.track;
            *device=current.devices.iter().find(|d|d.instance_id==device.instance_id).expect("publication retains roots").clone();
            device.track=track;
        }
        self.runtime.workspace.remap_tracks(&current.saved.score,&pending.candidate.saved.score);
        self.host.bank_revision=observed.bank_revision;
        self.host.prepared=Some(pending.candidate);self.history=pending.history;
        self.draft=None;self.draft_launch=None;self.dirty=true;self.draft_revision+=1;
        self.save_feedback=None;None
    }
    pub(super) fn midi_note_transaction(&mut self,_before:&Session,after:&Session,launch:&launch::LaunchSettings,history:&History)->Result<bool,String>{
        let Document::WorkspacesV4(target)=after else{return Ok(false)};
        let current=self.host.prepared.as_ref().ok_or("No session")?;
        let (Document::WorkspacesV4(project),Schedule::Workspaces(old))=(&current.saved.score,&current.schedule)else{return Err("Workspace preparation changed".into())};
        if metadata_only(project,target){
            let prepared=self.host.prepared.as_mut().unwrap();
            prepared.saved.score=after.clone();prepared.saved.launch=launch.clone();prepared.saved.wire=SaveWire::V6;
            if let Schedule::Workspaces(workspace)=&mut prepared.schedule {
                for source in &mut workspace.sources {if let Some(saved)=target.sources.iter().find(|s|s.id()==source.id){
                    source.name=match saved {workspaces::SourceV4::Midi{name,..}|workspaces::SourceV4::Audio{name,..}=>name.clone()};
                }}
                for slot in &mut workspace.slots {if let Some(saved)=target.tracks.iter().flat_map(|t|t.slots.iter().flatten()).find(|s|s.id==slot.id){slot.name=saved.name.clone();}}
            }
            self.history=history.clone();self.draft=None;self.draft_launch=None;
            self.dirty=true;self.draft_revision+=1;self.save_feedback=None;return Ok(true)
        }
        let candidate=self.host.workspace_candidate(after.clone(),launch.clone())?;
        let capability=native_publication::require(self.host.preparation_revision)?;
        let Schedule::Workspaces(new)=&candidate.schedule else{unreachable!()};
        let config=self.host.publication_config(&candidate)?;
        let observed=capability.state()?;
        let mut request=native_publication::Request::default();
        request.preparation_revision=self.host.preparation_revision;request.bank_revision=observed.bank_revision;
        request.serial=native_midi::next_serial()?;request.stop_epoch=observed.stop_epoch;
        map_ids(project.tracks.iter().map(|t|t.id.as_str()),target.tracks.iter().map(|t|t.id.as_str()),&mut request.tracks);
        map_ids(old.sources.iter().map(|s|s.id.as_str()),new.sources.iter().map(|s|s.id.as_str()),&mut request.sources);
        map_ids(old.slots.iter().map(|s|s.id.as_str()),new.slots.iter().map(|s|s.id.as_str()),&mut request.slots);
        map_ids(old.placements.iter().map(|s|s.id.as_str()),new.placements.iter().map(|s|s.id.as_str()),&mut request.placements);
        for (i,track) in target.tracks.iter().enumerate(){if track_music(project,&track.id)!=track_music(target,&track.id){request.changed_tracks|=1<<i;}}
        let audio=new.audio_descriptors();
        capability.publish(&config,&audio,&request)?;
        self.midi_pending=Some(Pending{serial:request.serial,preparation:request.preparation_revision,candidate,history:history.clone()});
        // Keep explicit pending ownership if a running stream has not reached its boundary.
        for _ in 0..40 {
            if let Some(error)=self.midi_reconcile(){return Err(error)}
            if self.midi_pending.is_none(){return Ok(true)}
            std::thread::sleep(std::time::Duration::from_millis(1));
        }
        Ok(true)
    }
    pub(super) fn midi_view(&self)->serde_json::Value{
        let observed=native_midi::capability().and_then(|c|c.state().ok());
        let publication=native_publication::capability().and_then(|c|c.state().ok());
        serde_json::json!({"pending":self.midi_pending.is_some(),"sourceRevision":publication.map(|s|s.bank_revision.to_string()),"publication":publication.map(|s|serde_json::json!({"serial":s.serial.to_string(),"status":s.status,"error":s.error,"appliedFrame":s.applied_frame.to_string()})),"previewActive":observed.is_some_and(|s|s.preview_active!=0),"previewSerial":observed.map(|s|s.preview_serial.to_string()),"previewError":observed.map(|s|s.preview_error)})
    }
}

#[tauri::command(async)]
pub fn alive_midi_preview(window:WebviewWindow,state:tauri::State<Desktop>,generation:u64,preparation_revision:String,action:String,track_id:Option<String>,pitch:Option<u32>,velocity:Option<u32>,serial:Option<String>)->Result<serde_json::Value,String>{
    main_only(window.label())?;
    // Release is control work, never audio-callback work. Wait behind a brief
    // source transaction instead of dropping the native owner's release.
    let mut control=if action=="release"{state.0.lock().map_err(|_|"MIDI Preview control is unavailable".to_string())?}else{ui_lock(&state.0)?};check_generation(control.generation,generation)?;
    let preparation=runtime::decimal(&preparation_revision)?;
    if preparation!=control.host.preparation_revision{return Err("MIDI Preview scope changed".into())}
    let capability=native_midi::require(preparation)?;
    if action=="release"{let serial=runtime::decimal(serial.as_deref().ok_or("Missing Preview identity")?)?;capability.release(preparation,serial)?;return Ok(serde_json::json!({"serial":serial.to_string()}))}
    control.midi_reconcile();if control.midi_pending.is_some(){return Err("Music is awaiting playback; refresh before Preview".into())}
    if action!="note"{return Err("Unknown MIDI Preview action".into())}
    let pitch=pitch.ok_or("Missing Preview pitch")?;let velocity=velocity.unwrap_or(100);if pitch>127||velocity==0||velocity>127{return Err("Invalid Preview pitch/velocity".into())}
    let prepared=control.host.prepared.as_ref().ok_or("No session")?;
    let track=prepared.saved.score.tracks().iter().position(|t|Some(t.id())==track_id.as_deref()).ok_or("Unknown Preview track")?;
    if prepared.saved.score.tracks()[track].instrument().is_none(){return Err("Preview requires a MIDI instrument".into())}
    control.driver.start()?;
    let serial=native_midi::next_serial()?;capability.preview(&native_midi::Preview{version:1,struct_bytes:40,track:track as u32,pitch,velocity,reserved:0,preparation_revision:preparation,serial})?;
    Ok(serde_json::json!({"serial":serial.to_string(),"status":"queued"}))
}

#[cfg(test)]mod tests {
    use super::*;
    use crate::session::workspaces::{WorkspaceEditV4,OccurrenceV4,ClipRegionV4};
    fn control()->Control {
        let path=Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/quantized-midi.alive");
        let original=read(&path).unwrap();let prepared=prepare(&original.saved,&original.origin).unwrap();
        let mut host=Host::default();let accepted_serial=host.install(prepared).unwrap();
        Control{host,runtime:Default::default(),snapshot_sequence:0,accepted_serial,driver:crate::audio::Driver::load(PathBuf::from("/nonexistent/alive-regions-test.json")),generation:7,dirty:false,saved_path:None,saved_wire:None,save_feedback:None,draft:None,draft_launch:None,draft_revision:0,history:Default::default(),midi_pending:None,closing:false,allow_exit:false,editors:Default::default()}
    }
    #[track_caller] fn render(c:&mut Control,frames:usize){let mut left=vec![0.;frames];let mut right=left.clone();assert_eq!(unsafe{native::ultra_external_render(frames as u32,left.as_mut_ptr(),right.as_mut_ptr())},1);let error=c.midi_reconcile();assert!(error.is_none(),"revision{}: {error:?}",c.draft_revision);}
    fn cleanup(){unsafe{native::ultra_audio_stop();native::alive_session_reset();for slot in 0..16{crate::ultra_canvas_close_document(slot);}}}
    #[test]
    fn rolling_clip_regions_tracks_and_history_commit_only_after_applied(){
        if crate::session::native_master::fresh_process("session::desktop::midi::tests::rolling_clip_regions_tracks_and_history_commit_only_after_applied"){return}
        if native_publication::capability().is_none(){return}
        let _guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();let mut c=control();
        let preparation=c.host.preparation_revision;let Document::WorkspacesV4(project)=c.host.prepared.as_ref().unwrap().saved.score.clone()else{unreachable!()};
        let track_id=project.tracks[0].id.clone();let slot_id=project.tracks[0].slots[0].as_ref().unwrap().id.clone();
        assert_eq!(unsafe{native::ultra_external_start()},1);
        c.runtime.workspace_request(&c.host,runtime_workspaces::Action::Start{}).unwrap();render(&mut c,1);
        let affected=c.workspace_edit("main",WorkspaceEditV4::MidiClipCreate{track_id:track_id.clone(),slot:2,name:"Rolling clip".into()},7,0).unwrap();
        assert!(c.midi_pending.is_some());assert_eq!(c.draft_revision,0);assert!(c.draft.is_none());
        c.host.mixer(0,0.55,false,false).unwrap();c.master_gain("main",7,0.6).unwrap();render(&mut c,1);
        assert!(c.midi_pending.is_none());assert_eq!(c.draft_revision,1);assert!(c.draft.is_none());assert_eq!(c.host.preparation_revision,preparation);
        let Document::WorkspacesV4(live)=&c.host.prepared.as_ref().unwrap().saved.score else{unreachable!()};
        assert_eq!(live.tracks[0].gain,0.55);assert_eq!(c.host.prepared.as_ref().unwrap().saved.master.gain,0.6);
        assert!(live.tracks[0].slots[2].is_some());assert!(affected.source_id.is_some());
        let original_source=live.sources[0].clone();let length=original_source.length_beats();
        c.workspace_edit("main",WorkspaceEditV4::RegionSet{occurrence:OccurrenceV4::Slot{track_id:track_id.clone(),slot_id},region:ClipRegionV4{start:0.,end:length,loop_start:1.,loop_end:2.,loop_enabled:true}},7,1).unwrap();render(&mut c,1);
        let Document::WorkspacesV4(live)=&c.host.prepared.as_ref().unwrap().saved.score else{unreachable!()};assert_eq!(live.sources[0],original_source);
        let inserted=c.workspace_track_edit(WorkspaceTrackOperation::AddAudio{after_track_id:Some(track_id.clone())},7,c.draft_revision).unwrap().track_id.unwrap();
        render(&mut c,1);assert_eq!(c.host.prepared.as_ref().unwrap().saved.score.tracks()[1].id(),inserted);
        assert_eq!(c.host.preparation_revision,preparation);
        c.history(Direction::Undo,7,c.draft_revision).unwrap();render(&mut c,1);assert_eq!(c.host.prepared.as_ref().unwrap().tracks.len(),project.tracks.len());
        c.history(Direction::Redo,7,c.draft_revision).unwrap();render(&mut c,1);assert_eq!(c.host.prepared.as_ref().unwrap().saved.score.tracks()[1].id(),inserted);
        let old=c.host.prepared.as_ref().unwrap().saved.score.clone();let revision=c.draft_revision;
        c.workspace_edit("main",WorkspaceEditV4::MidiClipCreate{track_id,slot:3,name:"Canceled".into()},7,revision).unwrap();assert!(c.midi_pending.is_some());
        unsafe{native::ultra_audio_stop();}assert!(c.midi_reconcile().is_some());assert_eq!(c.draft_revision,revision);assert_eq!(c.host.prepared.as_ref().unwrap().saved.score,old);cleanup();
    }
    #[test]
    fn publication_maps_use_stable_ids_and_removed_entries_are_none(){
        let mut map=[0;4];map_ids(["b","a","gone"].into_iter(),["new","a","b"].into_iter(),&mut map);
        assert_eq!(&map[..3],&[2,1,native::V4_NONE]);
    }
    #[test]
    fn metadata_after_save_as_retains_the_native_pcm_owner(){
        if crate::session::native_master::fresh_process("session::desktop::midi::tests::metadata_after_save_as_retains_the_native_pcm_owner"){return}
        if native_publication::capability().is_none(){return}
        let _guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();let mut c=control();
        let track_id=c.workspace_track_edit(WorkspaceTrackOperation::AddAudio{after_track_id:None},7,0).unwrap().track_id.unwrap();
        assert!(c.midi_pending.is_none());
        let root=std::env::temp_dir().join(format!("alive-audio-owner-{}",std::process::id()));std::fs::create_dir_all(root.join("moved")).unwrap();
        let mut wav=b"RIFF".to_vec();wav.extend_from_slice(&1956u32.to_le_bytes());wav.extend_from_slice(b"WAVEfmt ");wav.extend_from_slice(&16u32.to_le_bytes());wav.extend_from_slice(&1u16.to_le_bytes());wav.extend_from_slice(&1u16.to_le_bytes());wav.extend_from_slice(&48000u32.to_le_bytes());wav.extend_from_slice(&96000u32.to_le_bytes());wav.extend_from_slice(&2u16.to_le_bytes());wav.extend_from_slice(&16u16.to_le_bytes());wav.extend_from_slice(b"data");wav.extend_from_slice(&1920u32.to_le_bytes());for _ in 0..960{wav.extend_from_slice(&8000i16.to_le_bytes());}
        let sample=root.join("source.wav");std::fs::write(&sample,wav).unwrap();let file=wav::inspect(&sample).unwrap();
        let source_id=c.workspace_edit("main",WorkspaceEditV4::AudioClipImport{track_id,slot:0,name:"Audio".into(),file,source_tempo:120.,warp_mode:"repitch".into()},7,c.draft_revision).unwrap().source_id.unwrap();
        let pointer=|c:&Control|{let Schedule::Workspaces(w)=&c.host.prepared.as_ref().unwrap().schedule else{unreachable!()};w.audio[0].samples.as_ptr()};
        let before=pointer(&c);save_to_path(&mut c,&root.join("moved/saved.alive")).unwrap();
        c.workspace_edit("main",WorkspaceEditV4::SourceRename{source_id,name:"Renamed".into()},7,c.draft_revision).unwrap();
        assert_eq!(pointer(&c),before);assert!(c.midi_pending.is_none());
        c.history(Direction::Undo,7,c.draft_revision).unwrap();assert_eq!(pointer(&c),before);
        cleanup();std::fs::remove_dir_all(root).unwrap();
    }
}
