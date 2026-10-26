//! Preparation-bound workspace observations and bounded request receipts.
use super::{host::Host,native as n,Schedule,PreparedSession,prepare_workspaces::PreparedWorkspaces};
use serde::{Deserialize,Serialize};

#[derive(Clone,Deserialize)]
#[serde(tag="kind",rename_all="camelCase",rename_all_fields="camelCase",deny_unknown_fields)]
pub enum Action {Launch{track_id:String,slot_id:String},Stop{track_id:String},Return{track_ids:Vec<String>},Scene{slot:usize},Start{},Seek{beat:f64}}
#[derive(Clone,Default,Serialize)]
#[serde(rename_all="camelCase")]
pub struct RequestResult {
    pub kind:String,pub preparation_revision:String,pub request_serial:String,pub status:String,pub reason:u32,
    pub track_id:Option<String>,pub slot_id:Option<String>,pub source_id:Option<String>,pub scene_slot:Option<usize>,pub target_frame:Option<String>,
    pub track_mask:u32,pub pending_mask:u32,pub applied_mask:u32,pub superseded_mask:u32,pub canceled_mask:u32,pub rejected_mask:u32,pub members:Vec<Member>,
}
#[derive(Clone,Serialize)]
#[serde(rename_all="camelCase")]
pub struct Member {pub track_index:usize,pub track_id:String,pub slot_id:Option<String>,pub source_id:Option<String>,pub action:String,pub authority:String,pub status:String}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct Track {pub track_id:String,pub authority:Option<String>,pub active_slot_id:Option<String>,pub active_placement_id:Option<String>,pub active_source_id:Option<String>,pub phase:Option<String>,pub epoch:Option<String>,pub pending_action:Option<String>,pub pending_authority:Option<String>,pub pending_slot_id:Option<String>,pub pending_serial:Option<String>,pub pending_frame:Option<String>}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct View {pub tracks:Vec<Track>,pub requests:Vec<RequestResult>,pub requested_stop_epoch:String,pub applied_stop_epoch:String}
#[derive(Default)]
pub struct Runtime {revision:u64,requests:Vec<RequestResult>}
fn frame(value:u64)->Option<String>{(value!=n::V4_NO_FRAME).then(||value.to_string())}
fn status(value:u32)->&'static str{match value{n::V4_QUEUED=>"queued",n::V4_PENDING=>"pending",n::V4_APPLIED=>"applied",n::V4_REJECTED=>"rejected",n::V4_SUPERSEDED=>"superseded",n::V4_CANCELED=>"canceled",n::V4_MIXED=>"mixed",_=>"unavailable"}}
fn workspace(p:&PreparedSession)->Result<&PreparedWorkspaces,String>{Host::check_schedule(p)?;match &p.schedule {Schedule::Workspaces(w)=>Ok(w),_=>Err("Enable MIDI workspaces first".into())}}
impl RequestResult {
    fn observe(&mut self,r:&n::ReceiptV4){
        self.status=status(r.status).into();self.reason=r.error;self.target_frame=frame(r.target_frame);self.track_mask=r.track_mask;self.pending_mask=r.pending_mask;self.applied_mask=r.applied_mask;self.superseded_mask=r.superseded_mask;self.canceled_mask=r.canceled_mask;self.rejected_mask=r.rejected_mask;
        for member in &mut self.members {let bit=1<<member.track_index;member.status=if r.status==n::V4_QUEUED{"queued"}else if r.pending_mask&bit!=0{"pending"}else if r.applied_mask&bit!=0{"applied"}else if r.superseded_mask&bit!=0{"superseded"}else if r.canceled_mask&bit!=0{"canceled"}else if r.rejected_mask&bit!=0{"rejected"}else{"unavailable"}.into();}
    }
}
impl Runtime {
    fn reconcile(&mut self,raw:&n::StateV4){
        for request in &mut self.requests {
            let serial=super::runtime::decimal(&request.request_serial).unwrap();let revision=super::runtime::decimal(&request.preparation_revision).unwrap();
            if let Some(receipt)=raw.receipts.iter().find(|r|r.preparation_revision==revision&&r.request_serial==serial&&r.status!=n::V4_RESULT_EMPTY){request.observe(receipt);}
            else if matches!(request.status.as_str(),"queued"|"pending")&&raw.last_consumed_request>=serial {request.status="unavailable".into();for m in &mut request.members {if matches!(m.status.as_str(),"queued"|"pending"){m.status="unavailable".into();}}}
        }
    }
    pub fn poll(&mut self,host:&Host)->Result<(serde_json::Value,Option<serde_json::Value>),String>{
        let p=host.prepared.as_ref().ok_or("No session")?;let w=workspace(p)?;
        let mut raw=Box::<n::StateV4>::default();if unsafe{n::alive_session_state_v4(&mut *raw)}==0{return Err("Workspace state is temporarily unavailable".into());}
        if raw.preparation_revision!=host.preparation_revision{return Err("Native workspace preparation publication is temporarily unavailable".into());}
        if self.revision!=host.preparation_revision {self.requests.clear();self.revision=host.preparation_revision;}
        self.reconcile(&raw);
        let tracks=observations(p,w,&raw)?;
        let devices=raw.devices[..p.devices.len()].iter().map(|d|serde_json::json!({"document":d.document,"bypassed":d.bypassed,"parameterCount":d.parameter_count,"revision":d.revision.to_string(),"base":d.base,"effective":d.effective,"owned":d.owned})).collect::<Vec<_>>();
        let state=serde_json::json!({"playing":raw.playing,"configured":raw.configured,"profile":raw.profile,"workPolicy":raw.work_policy,"absoluteFrame":raw.absolute_frame.to_string(),"position":raw.position.to_string(),"generation":raw.generation.to_string(),"rejected":raw.rejected.to_string(),"peakLeft":raw.peak_left,"peakRight":raw.peak_right,"tracks":raw.tracks[..p.tracks.len()].iter().map(|t|t.mixer).collect::<Vec<_>>(),"devices":devices,"fault":raw.fault});
        let view=View{tracks,requests:self.requests.clone(),requested_stop_epoch:raw.requested_stop_epoch.to_string(),applied_stop_epoch:raw.applied_stop_epoch.to_string()};
        Ok((state,Some(serde_json::to_value(view).map_err(|e|e.to_string())?)))
    }
    pub(super) fn request(&mut self,host:&Host,action:Action,serial:&mut u64)->Result<RequestResult,String>{
        let p=host.prepared.as_ref().ok_or("No session")?;let (mut request,mut result)=request(p,action)?;
        self.poll(host)?;
        while self.requests.len()>=128 {if let Some(i)=self.requests.iter().position(|r|!matches!(r.status.as_str(),"queued"|"pending")){self.requests.remove(i);}else{return Err("128 workspace requests remain outstanding. Let audio advance before retrying.".into());}}
        *serial=serial.checked_add(1).ok_or("Request identity exhausted")?;
        request.request_serial=*serial;request.preparation_revision=host.preparation_revision;
        let mut receipt=n::ReceiptV4::default();unsafe{n::alive_session_request_v4(&request,&mut receipt);}
        result.preparation_revision=host.preparation_revision.to_string();result.request_serial=serial.to_string();result.observe(&receipt);self.requests.push(result.clone());Ok(result)
    }
}
fn observations(p:&PreparedSession,w:&PreparedWorkspaces,raw:&n::StateV4)->Result<Vec<Track>,String>{
    p.document.tracks().into_iter().enumerate().map(|(index,t)|{
        let r=&raw.tracks[index];
        let authority=match r.authority {n::V4_ARRANGEMENT_AUTHORITY=>"arrangement",n::V4_SESSION_AUTHORITY=>"session",_=>return Err("Invalid native workspace authority".into())};
        let source=if r.active_source==n::V4_NONE{None}else{Some(w.sources.get(r.active_source as usize).filter(|s|s.descriptor.track==index as u32).ok_or("Unmapped native workspace source")?.id.clone())};
        let slot=|i:u32|if i==n::V4_NONE{Ok(None)}else{Ok::<_,String>(Some(w.slots.get(i as usize).filter(|s|s.descriptor.track==index as u32).ok_or("Unmapped native workspace slot")?.id.clone()))};
        let placement=if r.active_placement==n::V4_NONE{None}else{Some(w.placements.get(r.active_placement as usize).filter(|p|p.descriptor.track==index as u32).ok_or("Unmapped native workspace placement")?.id.clone())};
        let pending_action=match r.pending_action {n::V4_NO_ACTION=>None,n::V4_LAUNCH=>Some("launch"),n::V4_TRACK_STOP=>Some("stop"),n::V4_RETURN=>Some("return"),_=>return Err("Invalid pending workspace action".into())};
        Ok(Track{track_id:t.id().into(),authority:Some(authority.into()),active_slot_id:slot(r.active_slot)?,active_placement_id:placement,active_source_id:source.clone(),phase:source.map(|_|r.phase.to_string()),epoch:Some(r.track_epoch.to_string()),pending_action:pending_action.map(str::to_owned),pending_authority:pending_action.map(|a|if a=="return"{"arrangement"}else{"session"}.into()),pending_slot_id:if r.pending_action==n::V4_LAUNCH{slot(r.pending_slot)?}else{None},pending_serial:pending_action.map(|_|r.pending_serial.to_string()),pending_frame:pending_action.and_then(|_|frame(r.pending_frame))})
    }).collect()
}
fn request(p:&PreparedSession,action:Action)->Result<(n::RequestV4,RequestResult),String>{
    let w=workspace(p)?;let tracks=p.document.tracks();
    let index=|id:&str|tracks.iter().position(|t|t.id()==id).ok_or_else(||format!("Unknown prepared track '{id}'"));
    let mut r=n::RequestV4::default();let mut result=RequestResult::default();
    match action {
        Action::Start{}=>{r.kind=n::V4_START;result.kind="start".into();},
        Action::Seek{beat}=>{if !beat.is_finite()||beat<0.||beat>=p.document.length_beats(){return Err("Seek beat must be within the prepared song".into());}r.kind=n::V4_SEEK;r.position=super::workspaces::frame_at(beat,p.document.tempo())?;result.kind="seek".into();},
        Action::Launch{track_id,slot_id}=>{let i=index(&track_id)?;let slot=w.slots.iter().find(|s|s.descriptor.track==i as u32&&s.id==slot_id).ok_or("Apply while stopped to launch this draft-only slot")?;r.kind=n::V4_TRACK_ACTIONS;r.track_mask=1<<i;r.tracks[i]=n::TrackActionV4{action:n::V4_LAUNCH,slot:slot.slot as u32};result.kind="launch".into();result.track_id=Some(track_id);result.slot_id=Some(slot_id);result.source_id=Some(w.sources[slot.descriptor.source as usize].id.clone());},
        Action::Stop{track_id}=>{let i=index(&track_id)?;r.kind=n::V4_TRACK_ACTIONS;r.track_mask=1<<i;r.tracks[i]=n::TrackActionV4{action:n::V4_TRACK_STOP,slot:n::V4_NONE};result.kind="stop".into();result.track_id=Some(track_id);},
        Action::Return{track_ids}=>{if track_ids.is_empty()||track_ids.len()>tracks.len(){return Err("Return requires one or more unique prepared track IDs".into());}r.kind=n::V4_TRACK_ACTIONS;result.kind="return".into();for id in track_ids{let i=index(&id)?;if r.track_mask&(1<<i)!=0{return Err("Duplicate Return track ID".into());}r.track_mask|=1<<i;r.tracks[i]=n::TrackActionV4{action:n::V4_RETURN,slot:n::V4_NONE};}},
        Action::Scene{slot}=>{if slot>=4{return Err("Scene slot must be 0 through 3".into());}if super::host::workspace_limits()?.features&n::V4_FEATURE_ATOMIC_TRACK_ACTIONS==0{return Err("Atomic workspace scenes are unavailable".into());}r.kind=n::V4_TRACK_ACTIONS;r.track_mask=(1<<tracks.len())-1;result.kind="scene".into();result.scene_slot=Some(slot);for i in 0..tracks.len(){r.tracks[i]=if w.slots.iter().any(|s|s.descriptor.track==i as u32&&s.slot==slot){n::TrackActionV4{action:n::V4_LAUNCH,slot:slot as u32}}else{n::TrackActionV4{action:n::V4_TRACK_STOP,slot:n::V4_NONE}};}},
    }
    for (i,t) in tracks.iter().enumerate().filter(|(i,_)|r.track_mask&(1<<i)!=0){let a=r.tracks[i];let slot=w.slots.iter().find(|s|a.action==n::V4_LAUNCH&&s.descriptor.track==i as u32&&s.slot==a.slot as usize);let name=match a.action{n::V4_LAUNCH=>"launch",n::V4_RETURN=>"return",_=>"stop"};result.members.push(Member{track_index:i,track_id:t.id().into(),slot_id:slot.map(|s|s.id.clone()),source_id:slot.map(|s|w.sources[s.descriptor.source as usize].id.clone()),action:name.into(),authority:if a.action==n::V4_RETURN{"arrangement"}else{"session"}.into(),status:"queued".into()});}
    Ok((r,result))
}

pub fn prepared(host:&Host)->Result<Option<serde_json::Value>,String>{
    let p=host.prepared.as_ref().ok_or("No session")?;if !p.document.is_workspaces(){return Ok(None);}let w=workspace(p)?;let tracks=p.document.tracks();
    Ok(Some(serde_json::json!({"preparationRevision":host.preparation_revision.to_string(),
        "sources":w.sources.iter().map(|s|serde_json::json!({"trackId":tracks[s.descriptor.track as usize].id(),"sourceId":s.id,"kind":"midi","name":s.name,"lengthFrames":s.descriptor.length_frames.to_string()})).collect::<Vec<_>>(),
        "slots":w.slots.iter().map(|s|serde_json::json!({"trackId":tracks[s.descriptor.track as usize].id(),"slotId":s.id,"slot":s.slot,"sourceId":w.sources[s.descriptor.source as usize].id,"name":s.name,"sourceOffsetFrames":s.descriptor.source_offset.to_string(),"loopEnabled":s.descriptor.loop_enabled!=0})).collect::<Vec<_>>(),
        "placements":w.placements.iter().map(|p|serde_json::json!({"trackId":tracks[p.descriptor.track as usize].id(),"placementId":p.id,"sourceId":w.sources[p.descriptor.source as usize].id,"startFrame":p.descriptor.start_frame.to_string(),"durationFrames":p.descriptor.duration_frames.to_string(),"sourceOffsetFrames":p.descriptor.source_offset.to_string(),"loopEnabled":p.descriptor.loop_enabled!=0})).collect::<Vec<_>>() })))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn prepared()->PreparedSession {
        let path=std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive");
        let old=super::super::read(&path).unwrap();
        let project=super::super::workspaces::prospective_from_document(&old.document).unwrap();
        super::super::prepare(&super::super::Document::WorkspacesV4(project),&path).unwrap()
    }
    #[test]
    fn gaps_and_session_silence_keep_null_sources_and_pending_return_is_not_predicted(){
        let p=prepared();let w=workspace(&p).unwrap();let mut raw=n::StateV4::default();
        for t in &mut raw.tracks {t.authority=n::V4_ARRANGEMENT_AUTHORITY;t.active_source=n::V4_NONE;t.active_slot=n::V4_NONE;t.active_placement=n::V4_NONE;t.pending_slot=n::V4_NONE;t.pending_frame=n::V4_NO_FRAME;}
        raw.tracks[1].authority=n::V4_SESSION_AUTHORITY;raw.tracks[1].pending_action=n::V4_RETURN;raw.tracks[1].pending_serial=u64::MAX;
        let view=serde_json::to_value(observations(&p,w,&raw).unwrap()).unwrap();
        assert_eq!(view[0]["authority"],"arrangement");assert_eq!(view[1]["authority"],"session");assert_eq!(view[1]["pendingAuthority"],"arrangement");assert_eq!(view[1]["pendingSerial"],u64::MAX.to_string());
        for t in view.as_array().unwrap(){for key in ["activeSourceId","activeSlotId","activePlacementId","phase"]{assert!(t[key].is_null(),"{key}");}}
        raw.tracks[0].active_source=0;raw.tracks[0].active_slot=0;raw.tracks[0].phase=7;
        let tracks=observations(&p,w,&raw).unwrap();assert_eq!(tracks[0].active_source_id.as_deref(),Some(w.sources[0].id.as_str()));assert_eq!(tracks[0].active_slot_id.as_deref(),Some(w.slots[0].id.as_str()));assert_ne!(tracks[0].active_source_id,tracks[0].active_slot_id);assert_eq!(tracks[0].phase.as_deref(),Some("7"));
    }
    #[test]
    fn return_and_launch_use_prepared_identities_and_reject_draft_or_foreign_slots(){
        let p=prepared();let w=workspace(&p).unwrap();let tracks=p.document.tracks();
        let (raw,result)=request(&p,Action::Return{track_ids:tracks.iter().map(|t|t.id().into()).collect()}).unwrap();assert_eq!(raw.track_mask,3);assert_eq!(result.kind,"return");assert!(result.track_id.is_none());assert!(result.members.iter().all(|m|m.authority=="arrangement"));
        assert!(request(&p,Action::Return{track_ids:vec![tracks[0].id().into();2]}).is_err());
        assert!(request(&p,Action::Launch{track_id:tracks[0].id().into(),slot_id:"draft-only".into()}).is_err());
        assert!(request(&p,Action::Launch{track_id:tracks[1].id().into(),slot_id:w.slots[0].id.clone()}).is_err());
        let (_,launch)=request(&p,Action::Launch{track_id:tracks[0].id().into(),slot_id:w.slots[0].id.clone()}).unwrap();assert_eq!(launch.source_id.as_deref(),Some(w.sources[w.slots[0].descriptor.source as usize].id.as_str()));
    }
    #[test]
    fn receipt_reconciliation_matches_revision_and_preserves_terminal_members(){
        let p=prepared();let (_,mut result)=request(&p,Action::Return{track_ids:p.document.tracks().iter().map(|t|t.id().into()).collect()}).unwrap();result.preparation_revision="9".into();result.request_serial=u64::MAX.to_string();result.status="pending".into();result.members[0].status="applied".into();result.members[1].status="pending".into();
        let mut runtime=Runtime{requests:vec![result],..Default::default()};let mut raw=n::StateV4::default();raw.last_consumed_request=u64::MAX;raw.receipts[0]=n::ReceiptV4{preparation_revision:8,request_serial:u64::MAX,status:n::V4_APPLIED,applied_mask:3,..Default::default()};
        runtime.reconcile(&raw);assert_eq!(runtime.requests[0].status,"unavailable");assert_eq!(runtime.requests[0].members[0].status,"applied");assert_eq!(runtime.requests[0].members[1].status,"unavailable");
        raw.receipts[0].preparation_revision=9;runtime.reconcile(&raw);assert_eq!(runtime.requests[0].status,"applied");assert!(runtime.requests[0].members.iter().all(|m|m.status=="applied"));
    }
}
