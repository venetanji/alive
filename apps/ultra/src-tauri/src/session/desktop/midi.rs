//! Musical state/history become authoritative only after native APPLIED.
use super::*;
use crate::session::{native_midi,workspaces::{ProjectV4,SourceV4}};

pub(super) struct Pending {
    serial:u64,preparation:u64,source_id:String,source:SourceV4,
    document:Session,launch:launch::LaunchSettings,history:History,
    events:Vec<prepare::FrameEvent>,schedule:Schedule,
}
fn note_change(before:&Session,after:&Session)->Option<String>{
    let (Document::WorkspacesV4(a),Document::WorkspacesV4(b))=(before,after)else{return None};
    let changed:Vec<_>=a.sources.iter().zip(&b.sources).filter(|(a,b)|a!=b).collect();
    if a.sources.len()!=b.sources.len()||changed.len()!=1{return None}
    let (SourceV4::Midi{id,notes:old,..},SourceV4::Midi{notes:new,..})=changed[0]else{return None};
    if old==new{return None}
    let mut restored=b.clone();let SourceV4::Midi{notes,..}=restored.sources.iter_mut().find(|s|s.id()==id)?else{return None};*notes=old.clone();
    (crate::session::history::Projection::from(&Document::WorkspacesV4(restored))==crate::session::history::Projection::from(before)).then(||id.clone())
}
fn compatible_source(prepared:&ProjectV4,target:&ProjectV4,id:&str)->bool{
    let Some(SourceV4::Midi{track_id:a,length_beats:b,automation:c,..})=prepared.sources.iter().find(|s|s.id()==id)else{return false};
    let Some(SourceV4::Midi{track_id:x,length_beats:y,automation:z,..})=target.sources.iter().find(|s|s.id()==id)else{return false};
    a==x&&b==y&&c==z
}
fn notes_are_prepared(prepared:&ProjectV4,before:&Session,id:&str)->bool{
    let Document::WorkspacesV4(before)=before else{return false};
    let Some(SourceV4::Midi{notes:a,..})=prepared.sources.iter().find(|s|s.id()==id)else{return false};
    let Some(SourceV4::Midi{notes:b,..})=before.sources.iter().find(|s|s.id()==id)else{return false};
    a==b
}
impl Control {
    pub(super) fn midi_reconcile(&mut self)->Option<String>{
        let pending=self.midi_pending.as_ref()?;
        let observed=native_midi::capability()?.state().ok()?;
        if observed.preparation_revision!=pending.preparation||observed.serial!=pending.serial||observed.status==1{return None}
        let mut pending=self.midi_pending.take()?;
        if observed.status!=3{let error=format!("Live note edit was refused by native playback (reason {}). Previous music and undo history are retained.",observed.error);self.save_feedback=Some(error.clone());return Some(error)}
        let prepared=self.host.prepared.as_mut().expect("pending edit retains prepared owner");
        let Document::WorkspacesV4(project)=&mut prepared.saved.score else{unreachable!("pending edit blocks structural installation")};
        let target=project.sources.iter_mut().find(|s|s.id()==pending.source_id).expect("pending edit retains source");
        let (SourceV4::Midi{notes:target,..},SourceV4::Midi{notes,..})=(target,&pending.source)else{unreachable!()};*target=notes.clone();
        prepared.events=pending.events;prepared.schedule=pending.schedule;
        merge_live(&mut pending.document,&prepared.saved.score);
        self.history=pending.history;self.dirty=true;self.retain_launch(pending.document,pending.launch);self.draft_revision+=1;
        self.save_feedback=Some("Note edit applied to native playback.".into());None
    }
    pub(super) fn midi_note_transaction(&mut self,before:&Session,after:&Session,launch:&launch::LaunchSettings,history:&History)->Result<bool,String>{
        let Some(id)=note_change(before,after)else{return Ok(false)};
        let Ok(capability)=native_midi::require(self.host.preparation_revision)else{return Ok(false)};
        let current=self.host.prepared.as_ref().ok_or("No session")?;
        let (Document::WorkspacesV4(prepared),Document::WorkspacesV4(target))=(&current.saved.score,after)else{return Ok(false)};
        if !compatible_source(prepared,target,&id)||!notes_are_prepared(prepared,before,&id){return Ok(false)}
        let mut candidate=current.clone();let mut project=prepared.clone();
        let source=target.sources.iter().find(|s|s.id()==id).unwrap().clone();
        let (SourceV4::Midi{notes:destination,..},SourceV4::Midi{notes,..})=(project.sources.iter_mut().find(|s|s.id()==id).unwrap(),&source)else{return Ok(false)};*destination=notes.clone();
        prepare_workspaces::compile(&project,&mut candidate)?;
        let Schedule::Workspaces(workspace)=&candidate.schedule else{unreachable!()};
        let index=workspace.sources.iter().position(|s|s.id==id).ok_or("Missing prepared MIDI source")?;
        let descriptor=&workspace.sources[index].descriptor;
        let observed=capability.state()?;
        if observed.preparation_revision!=self.host.preparation_revision{return Err("MIDI preparation changed".into())}
        let mut request=Box::<native_midi::Edit>::default();request.preparation_revision=self.host.preparation_revision;request.serial=native_midi::next_serial()?;request.source_revision=observed.source_revision;request.source=index as u32;
        for event in &candidate.events[descriptor.event_begin as usize..(descriptor.event_begin+descriptor.event_count) as usize]{
            if event.kind!=0&&event.kind!=2{continue}
            request.events[request.event_count as usize]=native::EventV2{frame:event.frame,track:event.track,kind:event.kind,device:event.device,target:event.target,value:event.value};request.event_count+=1;
        }
        let pending=Pending{serial:request.serial,preparation:request.preparation_revision,source_id:id,source,document:after.clone(),launch:launch.clone(),history:history.clone(),events:candidate.events,schedule:candidate.schedule};
        capability.edit(&request)?;self.midi_pending=Some(pending);
        // A running stream usually acknowledges on its next callback. Keep an
        // explicit pending transaction if it stalls; snapshots finish it later.
        for _ in 0..40{if let Some(error)=self.midi_reconcile(){return Err(error)}if self.midi_pending.is_none(){return Ok(true)}std::thread::sleep(std::time::Duration::from_millis(1));}
        Ok(true)
    }
    pub(super) fn midi_view(&self)->serde_json::Value{
        let observed=native_midi::capability().and_then(|c|c.state().ok());
        serde_json::json!({"pending":self.midi_pending.is_some(),"sourceRevision":observed.map(|s|s.source_revision.to_string()),"previewActive":observed.is_some_and(|s|s.preview_active!=0),"previewSerial":observed.map(|s|s.preview_serial.to_string()),"previewError":observed.map(|s|s.preview_error)})
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
    #[test]fn only_one_source_note_change_can_be_live_and_drafts_keep_their_scope(){
        let path=Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive");let saved=read(&path).unwrap();
        let project=workspaces::prospective_from_document(&saved.saved.score).unwrap();let before=Document::WorkspacesV4(project.clone());let mut after=before.clone();
        let Document::WorkspacesV4(p)=&mut after else{unreachable!()};let SourceV4::Midi{notes,id,..}=&mut p.sources[0]else{unreachable!()};notes[0].pitch+=1;let id=id.clone();
        assert!(compatible_source(&project,p,&id));assert_eq!(note_change(&before,&after).as_deref(),Some(id.as_str()));
        assert!(notes_are_prepared(&project,&before,&id));assert!(!notes_are_prepared(&project,&after,&id));
        let Document::WorkspacesV4(p)=&mut after else{unreachable!()};p.tempo+=1.;assert!(note_change(&before,&after).is_none());
        let Document::WorkspacesV4(p)=&mut after else{unreachable!()};let SourceV4::Midi{length_beats,..}=&mut p.sources[0]else{unreachable!()};*length_beats+=1.;assert!(!compatible_source(&project,p,&id));
    }
    #[test]fn native_applied_commits_notes_and_history_while_pending_transport_and_master_survive(){
        if crate::session::native_master::fresh_process("session::desktop::midi::tests::native_applied_commits_notes_and_history_while_pending_transport_and_master_survive"){return}
        if native_midi::capability().is_none(){return}
        let _guard=crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
        let original=read(&Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/quantized-midi.alive")).unwrap();
        let mut saved=original.saved.clone();let Document::WorkspacesV4(project)=&mut saved.score else{unreachable!()};
        assert!(!project.sources.is_empty());
        let prepared=prepare(&saved,&original.origin).unwrap();
        let mut host=Host::default();let accepted_serial=host.install(prepared).unwrap();
        let mut c=Control{host,runtime:Default::default(),snapshot_sequence:0,accepted_serial,driver:crate::audio::Driver::load(PathBuf::from("/nonexistent/alive-midi-test.json")),generation:7,dirty:false,saved_path:None,saved_wire:None,save_feedback:None,draft:None,draft_launch:None,draft_revision:0,history:Default::default(),midi_pending:None,closing:false,allow_exit:false,editors:Default::default()};
        native_midi::require(c.host.preparation_revision).unwrap();
        let Document::WorkspacesV4(project)=c.host.prepared.as_ref().unwrap().saved.score.clone()else{unreachable!()};
        let SourceV4::Midi{id,notes,..}=&project.sources[0]else{unreachable!()};let original=notes[0].clone();let changed=original.pitch+1;
        c.workspace_edit("main",workspaces::WorkspaceEditV4::TransportRange{tempo:130.,length_beats:project.length_beats,loop_enabled:project.loop_enabled,loop_start_beats:project.loop_start_beats,loop_end_beats:project.loop_end_beats},7,0).unwrap();
        c.host.mixer(0,0.55,false,false).unwrap();
        let device_id=c.host.prepared.as_ref().unwrap().devices[0].instance_id.clone();
        c.host.base(&device_id,"cutoff",3100.).unwrap();c.host.bypass(&project.tracks[0].effects[0].instance_id,true).unwrap();
        assert_eq!(unsafe{native::ultra_external_start()},1);
        c.workspace_edit("main",workspaces::WorkspaceEditV4::NoteUpdate{source_id:id.clone(),note_id:original.id.clone(),beat:original.beat,duration:original.duration,pitch:changed,velocity:original.velocity},7,1).unwrap();
        assert!(c.midi_pending.is_some());assert_eq!(c.draft_revision,1);assert!(!c.version(7,1).is_ok());
        let Document::WorkspacesV4(unchanged)=&c.host.prepared.as_ref().unwrap().saved.score else{unreachable!()};assert_eq!(unchanged.sources,project.sources);assert_eq!(unchanged.tracks[0].gain,0.55);
        c.master_gain("main",7,0.6).unwrap();let mut left=[0.;1];let mut right=[0.;1];assert_eq!(unsafe{native::ultra_external_render(1,left.as_mut_ptr(),right.as_mut_ptr())},1);
        assert!(c.midi_reconcile().is_none());assert!(c.midi_pending.is_none());assert_eq!(c.draft_revision,2);assert_eq!(c.host.prepared.as_ref().unwrap().saved.master.gain,0.6);
        let pitch=|document:&Session|{let Document::WorkspacesV4(p)=document else{panic!()};let SourceV4::Midi{notes,..}=&p.sources[0]else{panic!()};notes[0].pitch};
        assert_eq!(pitch(&c.host.prepared.as_ref().unwrap().saved.score),changed);assert_eq!(c.draft.as_ref().unwrap().tempo(),130.);
        let Document::WorkspacesV4(live)=&c.host.prepared.as_ref().unwrap().saved.score else{unreachable!()};assert_eq!(live.tracks[0].gain,0.55);assert!(live.tracks[0].effects[0].bypassed);
        for (direction,expected) in [(Direction::Undo,original.pitch),(Direction::Redo,changed)]{
            c.history(direction,7,c.draft_revision).unwrap();assert!(c.midi_pending.is_some());assert_eq!(unsafe{native::ultra_external_render(1,left.as_mut_ptr(),right.as_mut_ptr())},1);assert!(c.midi_reconcile().is_none());assert_eq!(pitch(&c.host.prepared.as_ref().unwrap().saved.score),expected);assert_eq!(c.draft.as_ref().unwrap().tempo(),130.);assert_eq!(c.host.prepared.as_ref().unwrap().saved.master.gain,0.6);
        }
        c.clear_scope().unwrap();assert!(c.draft.is_none());assert_eq!(pitch(&c.host.prepared.as_ref().unwrap().saved.score),changed);
        c.runtime.workspace_request(&c.host,runtime_workspaces::Action::Start{}).unwrap();
        assert_eq!(unsafe{native::ultra_external_render(1,left.as_mut_ptr(),right.as_mut_ptr())},1);
        c.runtime.workspace_request(&c.host,runtime_workspaces::Action::Launch{track_id:project.tracks[0].id.clone(),slot_id:project.tracks[0].slots[0].as_ref().unwrap().id.clone()}).unwrap();
        let mut block_left=[0.;1024];let mut block_right=[0.;1024];
        for _ in 0..13{assert_eq!(unsafe{native::ultra_external_render(1024,block_left.as_mut_ptr(),block_right.as_mut_ptr())},1);}
        c.workspace_edit("main",workspaces::WorkspaceEditV4::NoteUpdate{source_id:id.clone(),note_id:original.id.clone(),beat:original.beat,duration:original.duration,pitch:changed+11,velocity:original.velocity},7,c.draft_revision).unwrap();
        assert!(c.midi_pending.is_some());assert_eq!(unsafe{native::ultra_external_render(1,left.as_mut_ptr(),right.as_mut_ptr())},1);assert!(c.midi_reconcile().is_none());assert_eq!(pitch(&c.host.prepared.as_ref().unwrap().saved.score),changed+11);
        assert_eq!(unsafe{native::ultra_external_render(1024,block_left.as_mut_ptr(),block_right.as_mut_ptr())},1);
        c.history(Direction::Undo,7,c.draft_revision).unwrap();assert_eq!(unsafe{native::ultra_external_render(1,left.as_mut_ptr(),right.as_mut_ptr())},1);assert!(c.midi_reconcile().is_none());assert_eq!(pitch(&c.host.prepared.as_ref().unwrap().saved.score),changed);
        let history_before=serde_json::to_value(c.history.view()).unwrap();let revision_before=c.draft_revision;
        c.workspace_edit("main",workspaces::WorkspaceEditV4::NoteUpdate{source_id:id.clone(),note_id:original.id.clone(),beat:original.beat,duration:original.duration,pitch:changed+12,velocity:original.velocity},7,c.draft_revision).unwrap();assert!(c.midi_pending.is_some());
        unsafe{native::ultra_audio_stop();}assert!(c.midi_reconcile().is_some());assert!(c.midi_pending.is_none());assert_eq!(c.draft_revision,revision_before);assert_eq!(serde_json::to_value(c.history.view()).unwrap(),history_before);assert_eq!(pitch(&c.host.prepared.as_ref().unwrap().saved.score),changed);c.clear_scope().unwrap();
        let Document::WorkspacesV4(prepared)=c.host.prepared.as_ref().unwrap().saved.score.clone()else{unreachable!()};
        let source=prepared.sources.iter().find(|s|s.id()==id).unwrap();let lanes=source.automation().to_vec();assert!(!lanes.is_empty());
        c.workspace_edit("main",workspaces::WorkspaceEditV4::AutomationSet{source_id:id.clone(),lanes:vec![]},7,c.draft_revision).unwrap();
        let update=|pitch|workspaces::WorkspaceEditV4::NoteUpdate{source_id:id.clone(),note_id:original.id.clone(),beat:original.beat,duration:original.duration,pitch,velocity:original.velocity};
        c.workspace_edit("main",update(changed+1),7,c.draft_revision).unwrap();assert!(c.midi_pending.is_none());
        c.workspace_edit("main",workspaces::WorkspaceEditV4::AutomationSet{source_id:id.clone(),lanes},7,c.draft_revision).unwrap();
        c.workspace_edit("main",update(changed+2),7,c.draft_revision).unwrap();
        assert!(c.midi_pending.is_none());assert_eq!(pitch(&c.host.prepared.as_ref().unwrap().saved.score),changed);assert_eq!(pitch(c.draft.as_ref().unwrap()),changed+2);
        c.history(Direction::Undo,7,c.draft_revision).unwrap();assert!(c.midi_pending.is_none());assert_eq!(pitch(c.draft.as_ref().unwrap()),changed+1);assert_eq!(pitch(&c.host.prepared.as_ref().unwrap().saved.score),changed);
        c.clear_scope().unwrap();unsafe{native::ultra_audio_stop();}
        c.workspace_edit("main",update(changed+11),7,c.draft_revision).unwrap();assert!(c.midi_pending.is_none());assert_eq!(pitch(&c.host.prepared.as_ref().unwrap().saved.score),changed+11);
        c.history(Direction::Undo,7,c.draft_revision).unwrap();assert!(c.midi_pending.is_none());assert_eq!(pitch(&c.host.prepared.as_ref().unwrap().saved.score),changed);
        unsafe{native::ultra_audio_stop();native::alive_session_reset();for slot in 0..16{crate::ultra_canvas_close_document(slot);}}
    }
}
