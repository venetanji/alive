//! Bounded control-side projection of native clip observations and receipts.
use super::{native as n, host::Host, Schedule};
use serde::{Deserialize,Serialize};

pub fn decimal(value:&str)->Result<u64,String>{
    if value.is_empty()||(value.len()>1&&value.starts_with('0'))||!value.bytes().all(|b|b.is_ascii_digit()){return Err("Expected a canonical unsigned decimal string".into());}
    value.parse().map_err(|_|"Unsigned identity exceeds u64".into())
}
#[derive(Deserialize)]
#[serde(tag="kind",rename_all="camelCase",rename_all_fields="camelCase",deny_unknown_fields)]
pub enum Action { Launch{track_id:String,clip_id:String}, Stop{track_id:String} }
#[derive(Clone,Default,Serialize)]
#[serde(rename_all="camelCase")]
pub struct RequestResult {
    pub preparation_revision:String,pub request_serial:String,pub status:String,pub reason:u32,
    pub track_id:Option<String>,pub clip_id:Option<String>,pub target_frame:Option<String>,
    pub scene_slot:Option<usize>,pub track_mask:u32,pub pending_mask:u32,pub applied_mask:u32,
    pub superseded_mask:u32,pub canceled_mask:u32,pub rejected_mask:u32,pub members:Vec<Member>,
}
#[derive(Clone,Serialize)]
#[serde(rename_all="camelCase")]
pub struct Member {pub track_index:usize,pub track_id:String,pub clip_id:Option<String>,pub action:String,pub status:String}
impl RequestResult {
    fn observe(&mut self, receipt:&n::ReceiptV3) {
        self.status=status(receipt.status).into();self.reason=receipt.error;self.target_frame=frame(receipt.target_frame);
        self.track_mask=receipt.track_mask;self.pending_mask=receipt.pending_mask;self.applied_mask=receipt.applied_mask;
        self.superseded_mask=receipt.superseded_mask;self.canceled_mask=receipt.canceled_mask;self.rejected_mask=receipt.rejected_mask;
        for member in &mut self.members {
            let bit=1<<member.track_index;
            member.status=if receipt.status==n::V3_QUEUED {"queued"}
                else if receipt.pending_mask&bit!=0 {"pending"} else if receipt.applied_mask&bit!=0 {"applied"}
                else if receipt.superseded_mask&bit!=0 {"superseded"} else if receipt.canceled_mask&bit!=0 {"canceled"}
                else if receipt.rejected_mask&bit!=0 {"rejected"} else {"unavailable"}.into();
        }
    }
}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct Track {track_id:String,active_clip_id:Option<String>,phase:String,epoch:String,pending_action:Option<String>,pending_clip_id:Option<String>,pending_serial:Option<String>,pending_frame:Option<String>}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct View {pub tracks:Vec<Track>,pub requests:Vec<RequestResult>,pub requested_stop_epoch:String,pub applied_stop_epoch:String}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct PreparedClip {track_id:String,clip_id:String,name:String,slot:usize,length_frames:String}
#[derive(Default)]
pub struct Runtime {revision:u64,serial:u64,requests:Vec<RequestResult>,pub workspace:super::runtime_workspaces::Runtime,pub master_observation:Option<super::native_master::State>}
fn status(value:u32)->&'static str{match value{n::V3_QUEUED=>"queued",n::V3_PENDING=>"pending",n::V3_APPLIED=>"applied",n::V3_REJECTED=>"rejected",n::V3_SUPERSEDED=>"superseded",n::V3_CANCELED=>"canceled",n::V3_MIXED=>"mixed",_=>"unavailable"}}
fn frame(value:u64)->Option<String>{(value!=n::V3_NO_FRAME).then(||value.to_string())}
impl Runtime {
    pub fn workspace_request(&mut self,host:&Host,action:super::runtime_workspaces::Action)->Result<super::runtime_workspaces::RequestResult,String>{
        // Native ingress retains one serial floor across v3/v4 preparation changes.
        self.workspace.request(host,action,&mut self.serial)
    }
    pub fn poll(&mut self,host:&Host)->Result<(serde_json::Value,Option<serde_json::Value>),String>{
        let p=host.prepared.as_ref().ok_or("No session")?;
        super::host::Host::check_schedule(p)?;
        if p.saved.score.is_workspaces(){let result=self.workspace.poll(host)?;self.master_observation=self.workspace.master_observation;return Ok(result);}
        if !p.saved.score.is_clips(){
            let raw=if let Some(capability)=n::master_capability(){let mut raw=n::StateV2::default();let mut master=super::native_master::State::output();if unsafe{(capability.snapshot_v2)((&mut raw as *mut n::StateV2).cast(),&mut master)}!=1{return Err("Session state is temporarily unavailable".into());}self.master_observation=Some(master);raw}else{self.master_observation=None;n::state()?};
            return Ok((serde_json::to_value(raw).map_err(|e|e.to_string())?,None));
        }
        let mut raw=Box::<n::StateV3>::default();
        if let Some(capability)=n::master_capability(){let mut master=super::native_master::State::output();if unsafe{(capability.snapshot_v3)((&mut *raw as *mut n::StateV3).cast(),&mut master)}!=1{return Err("Session state is temporarily unavailable".into());}self.master_observation=Some(master);}
        else {self.master_observation=None;if unsafe{n::alive_session_state_v3(&mut *raw)}==0{return Err("Session state is temporarily unavailable".into());}}
        if raw.preparation_revision!=host.preparation_revision{return Err("Native preparation publication is temporarily unavailable".into());}
        if self.revision!=host.preparation_revision{self.requests.clear();self.revision=host.preparation_revision;}
        self.reconcile(&raw);
        let Schedule::Clips(clips)=&p.schedule else{return Err("Missing prepared bank".into())};
        let clip_id=|index:u32|clips.get(index as usize).map(|c|c.id.clone());
        let tracks=p.saved.score.tracks().into_iter().enumerate().map(|(i,t)|{let r=&raw.tracks[i];Track{track_id:t.id().to_owned(),active_clip_id:clip_id(r.active_clip),phase:r.phase.to_string(),epoch:r.track_epoch.to_string(),pending_action:match r.pending_action{n::V3_LAUNCH=>Some("launch".into()),n::V3_TRACK_STOP=>Some("stop".into()),_=>None},pending_clip_id:clip_id(r.pending_clip),pending_serial:(r.pending_serial!=0).then(||r.pending_serial.to_string()),pending_frame:frame(r.pending_frame)}}).collect();
        let devices=raw.devices[..p.devices.len()].iter().map(|d|serde_json::json!({"document":d.document,"bypassed":d.bypassed,"parameterCount":d.parameter_count,"revision":d.revision.to_string(),"base":d.base,"effective":d.effective,"owned":d.owned})).collect::<Vec<_>>();
        let state=serde_json::json!({"playing":raw.playing,"configured":raw.configured,"absoluteFrame":raw.absolute_frame.to_string(),"position":raw.position.to_string(),"generation":raw.generation.to_string(),"rejected":raw.rejected.to_string(),"peakLeft":raw.peak_left,"peakRight":raw.peak_right,"tracks":raw.tracks[..p.tracks.len()].iter().map(|t|t.mixer).collect::<Vec<_>>(),"devices":devices});
        Ok((state,Some(serde_json::to_value(View{tracks,requests:self.requests.clone(),requested_stop_epoch:raw.requested_stop_epoch.to_string(),applied_stop_epoch:raw.applied_stop_epoch.to_string()}).map_err(|e|e.to_string())?)))
    }
    fn reconcile(&mut self,raw:&n::StateV3){
        for request in &mut self.requests {
            let serial=decimal(&request.request_serial).unwrap();let revision=decimal(&request.preparation_revision).unwrap();
            if let Some(receipt)=raw.receipts.iter().find(|r|r.preparation_revision==revision&&r.request_serial==serial&&r.status!=n::V3_RESULT_EMPTY){request.observe(receipt);}
            else if matches!(request.status.as_str(),"queued"|"pending")&&raw.last_consumed_request>=serial{
                request.status="unavailable".into();
                for member in &mut request.members {if matches!(member.status.as_str(),"queued"|"pending"){member.status="unavailable".into();}}
            }
        }
    }
    pub fn request(&mut self,host:&Host,request:n::RequestV3,track:Option<String>,clip:Option<String>)->Result<RequestResult,String>{
        self.submit(host,request,track,clip,None)
    }
    pub fn scene(&mut self,host:&Host,slot:usize)->Result<RequestResult,String>{
        let p=host.prepared.as_ref().ok_or("No session")?;
        let request=scene_request(p,slot)?;
        self.submit(host,request,None,None,Some(slot))
    }
    fn submit(&mut self,host:&Host,mut request:n::RequestV3,track:Option<String>,clip:Option<String>,scene_slot:Option<usize>)->Result<RequestResult,String>{
        self.poll(host)?;
        let p=host.prepared.as_ref().ok_or("No session")?;
        let Schedule::Clips(clips)=&p.schedule else{return Err("Enable the clip bank first".into())};
        let members=p.saved.score.tracks().into_iter().enumerate().filter(|(i,_)|request.track_mask&(1<<i)!=0).map(|(i,t)|{
            let action=request.tracks[i];
            Member{track_index:i,track_id:t.id().to_owned(),clip_id:if action.action==n::V3_LAUNCH{clips.iter().find(|c|c.track==i&&c.slot==action.slot as usize).map(|c|c.id.clone())}else{None},
                action:if action.action==n::V3_LAUNCH{"launch"}else{"stop"}.into(),status:"queued".into()}
        }).collect();
        // Terminal observations can be summarized; native alone owns receipt reservation.
        while self.requests.len()>=128 {if let Some(i)=self.requests.iter().position(|r|!matches!(r.status.as_str(),"queued"|"pending")){self.requests.remove(i);}else{return Err("128 requests remain outstanding. Let audio advance before retrying.".into());}}
        self.serial=self.serial.checked_add(1).ok_or("Request identity exhausted")?;request.request_serial=self.serial;request.preparation_revision=host.preparation_revision;
        let mut receipt=n::ReceiptV3::default();unsafe{n::alive_session_request_v3(&request,&mut receipt);}
        let mut result=RequestResult{preparation_revision:host.preparation_revision.to_string(),request_serial:self.serial.to_string(),track_id:track,clip_id:clip,scene_slot,members,..Default::default()};
        result.observe(&receipt);
        self.requests.push(result.clone());Ok(result)
    }
}
pub fn scenes_available(p:&super::PreparedSession)->Result<bool,String>{
    if !matches!(p.schedule,Schedule::Clips(_)){return Ok(false);}
    let profile=if p.tracks.len()<=2&&p.devices.len()<=6{n::V3_PROFILE_2X4}else{n::V3_PROFILE_8X4};
    let required=n::V3_FEATURE_ADMITTED|n::V3_FEATURE_ATOMIC_TRACK_ACTIONS;
    Ok(n::clip_limits(profile)?.features&required==required)
}
fn scene_request(p:&super::PreparedSession,slot:usize)->Result<n::RequestV3,String>{
    if slot>=4{return Err("Scene slot must be 0 through 3".into());}
    if !scenes_available(p)?{return Err("Atomic scene launching is unavailable for this prepared profile".into());}
    let Schedule::Clips(clips)=&p.schedule else{return Err("Enable the clip bank first".into())};
    let mut request=n::RequestV3{kind:n::V3_TRACK_ACTIONS,track_mask:(1<<p.tracks.len())-1,..Default::default()};
    for t in 0..p.tracks.len(){request.tracks[t]=if clips.iter().any(|c|c.track==t&&c.slot==slot){n::TrackActionV3{action:n::V3_LAUNCH,slot:slot as u32}}else{n::TrackActionV3{action:n::V3_TRACK_STOP,slot:n::V3_NONE}};}
    Ok(request)
}
pub fn prepared(host:&Host)->Vec<PreparedClip>{let Some(p)=&host.prepared else{return vec![]};match &p.schedule{Schedule::Legacy|Schedule::Workspaces(_)=>vec![],Schedule::Clips(clips)=>clips.iter().map(|c|PreparedClip{track_id:p.saved.score.tracks()[c.track].id().to_owned(),clip_id:c.id.clone(),name:c.name.clone(),slot:c.slot,length_frames:c.length_frames.to_string()}).collect()}}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn scene_projection_retains_authoritative_member_masks() {
        let mut runtime = Runtime::default();
        runtime.requests.push(RequestResult { preparation_revision:"2".into(),request_serial:"9".into(),status:"queued".into(),..Default::default() });
        let mut raw = n::StateV3::default();
        let receipt = &mut raw.receipts[9];
        receipt.preparation_revision=2;receipt.request_serial=9;receipt.track_mask=7;
        receipt.status=n::V3_PENDING;receipt.pending_mask=5;receipt.superseded_mask=2;receipt.error=18;receipt.target_frame=96000;
        runtime.reconcile(&raw);
        let value=serde_json::to_value(&runtime.requests[0]).unwrap();
        assert_eq!(value["pendingMask"],5);
        assert_eq!(value["supersededMask"],2);
        assert_eq!(value["targetFrame"],"96000");
    }
    #[test]
    fn scene_members_keep_terminal_outcomes_when_remaining_observation_is_unavailable(){
        let members=(0..3).map(|i|Member{track_index:i,track_id:format!("track-{i}"),clip_id:Some(format!("clip-{i}")),action:"launch".into(),status:"queued".into()}).collect();
        let mut runtime=Runtime::default();runtime.requests.push(RequestResult{preparation_revision:"2".into(),request_serial:"9".into(),status:"queued".into(),members,..Default::default()});
        let mut raw=n::StateV3::default();
        raw.receipts[9]=n::ReceiptV3{preparation_revision:2,request_serial:9,track_mask:7,pending_mask:5,superseded_mask:2,status:n::V3_PENDING,error:18,..Default::default()};
        runtime.reconcile(&raw);
        assert_eq!(runtime.requests[0].members.iter().map(|m|m.status.as_str()).collect::<Vec<_>>(),vec!["pending","superseded","pending"]);
        raw.receipts[9].preparation_revision=3;raw.last_consumed_request=9;runtime.reconcile(&raw);
        assert_eq!(runtime.requests[0].status,"unavailable");
        assert_eq!(runtime.requests[0].members.iter().map(|m|m.status.as_str()).collect::<Vec<_>>(),vec!["unavailable","superseded","unavailable"]);
        raw.receipts[9].preparation_revision=2;raw.receipts[9].pending_mask=0;raw.receipts[9].applied_mask=5;raw.receipts[9].status=n::V3_MIXED;runtime.reconcile(&raw);
        assert_eq!(runtime.requests[0].status,"mixed");assert_eq!(runtime.requests[0].members[0].status,"applied");
    }
    #[test]
    fn scene_mapper_uses_immutable_prepared_slots_and_empty_members_stop(){
        let path=std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../alive/examples/two-instruments.alive");
        let old=super::super::read(&path).unwrap();let mut doc=old.saved.score.to_clips().unwrap();
        let track=doc.legacy().unwrap().tracks[1].id.clone();let bank=doc.bank_mut(&track).unwrap();bank.slots[0]=None;bank.default_clip_id=None;
        let prepared=super::super::prepare(&old.saved.with_score(doc),&path).unwrap();
        let r=scene_request(&prepared,0).unwrap();assert_eq!(r.track_mask,3);assert_eq!(r.kind,n::V3_TRACK_ACTIONS);
        assert_eq!((r.tracks[0].action,r.tracks[0].slot),(n::V3_LAUNCH,0));
        assert_eq!((r.tracks[1].action,r.tracks[1].slot),(n::V3_TRACK_STOP,n::V3_NONE));
        for a in &r.tracks[2..]{assert_eq!((a.action,a.slot),(0,0));}
        let empty=scene_request(&prepared,3).unwrap();assert_eq!(empty.track_mask,3);
        assert!(empty.tracks[..2].iter().all(|a|a.action==n::V3_TRACK_STOP&&a.slot==n::V3_NONE));
        assert!(scene_request(&prepared,4).is_err());assert!(scene_request(&old,0).is_err());
    }
    #[test]
    fn receipts_match_both_identities_and_keep_queued_until_consumed(){
        let mut r=Runtime::default();r.requests.push(RequestResult{preparation_revision:"2".into(),request_serial:"9".into(),status:"queued".into(),..Default::default()});
        let mut raw=n::StateV3::default();raw.receipts[0].preparation_revision=1;raw.receipts[0].request_serial=9;raw.receipts[0].status=n::V3_APPLIED;
        r.reconcile(&raw);assert_eq!(r.requests[0].status,"queued");raw.receipts[0].preparation_revision=2;raw.receipts[0].status=n::V3_SUPERSEDED;r.reconcile(&raw);assert_eq!(r.requests[0].status,"superseded");
        assert_eq!(decimal("18446744073709551615").unwrap(),u64::MAX);for bad in ["01","-1","1.0","18446744073709551616",""]{assert!(decimal(bad).is_err());}
    }
}
