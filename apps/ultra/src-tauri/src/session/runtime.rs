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
#[derive(Clone,Serialize)]
#[serde(rename_all="camelCase")]
pub struct RequestResult {pub preparation_revision:String,pub request_serial:String,pub status:String,pub reason:u32,pub track_id:Option<String>,pub clip_id:Option<String>,pub target_frame:Option<String>}
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
pub struct Runtime {revision:u64,serial:u64,requests:Vec<RequestResult>}
fn status(value:u32)->&'static str{match value{n::V3_QUEUED=>"queued",n::V3_PENDING=>"pending",n::V3_APPLIED=>"applied",n::V3_REJECTED=>"rejected",n::V3_SUPERSEDED=>"superseded",n::V3_CANCELED=>"canceled",n::V3_MIXED=>"mixed",_=>"unavailable"}}
fn frame(value:u64)->Option<String>{(value!=n::V3_NO_FRAME).then(||value.to_string())}
impl Runtime {
    pub fn poll(&mut self,host:&Host)->Result<(serde_json::Value,Option<View>),String>{
        let p=host.prepared.as_ref().ok_or("No session")?;
        if !p.document.is_clips(){return Ok((serde_json::to_value(n::state()?).map_err(|e|e.to_string())?,None));}
        let mut raw=Box::<n::StateV3>::default();if unsafe{n::alive_session_state_v3(&mut *raw)}==0{return Err("Session state is temporarily unavailable".into());}
        if raw.preparation_revision!=host.preparation_revision{return Err("Native preparation publication is temporarily unavailable".into());}
        if self.revision!=host.preparation_revision{self.requests.clear();self.revision=host.preparation_revision;}
        self.reconcile(&raw);
        let Schedule::Clips(clips)=&p.schedule else{return Err("Missing prepared bank".into())};
        let clip_id=|index:u32|clips.get(index as usize).map(|c|c.id.clone());
        let tracks=p.document.tracks.iter().enumerate().map(|(i,t)|{let r=&raw.tracks[i];Track{track_id:t.id.clone(),active_clip_id:clip_id(r.active_clip),phase:r.phase.to_string(),epoch:r.track_epoch.to_string(),pending_action:match r.pending_action{n::V3_LAUNCH=>Some("launch".into()),n::V3_TRACK_STOP=>Some("stop".into()),_=>None},pending_clip_id:clip_id(r.pending_clip),pending_serial:(r.pending_serial!=0).then(||r.pending_serial.to_string()),pending_frame:frame(r.pending_frame)}}).collect();
        let devices=raw.devices[..p.devices.len()].iter().map(|d|serde_json::json!({"document":d.document,"bypassed":d.bypassed,"parameterCount":d.parameter_count,"revision":d.revision.to_string(),"base":d.base,"effective":d.effective,"owned":d.owned})).collect::<Vec<_>>();
        let state=serde_json::json!({"playing":raw.playing,"configured":raw.configured,"absoluteFrame":raw.absolute_frame.to_string(),"position":raw.position.to_string(),"generation":raw.generation.to_string(),"rejected":raw.rejected.to_string(),"peakLeft":raw.peak_left,"peakRight":raw.peak_right,"tracks":raw.tracks[..p.tracks.len()].iter().map(|t|t.mixer).collect::<Vec<_>>(),"devices":devices});
        Ok((state,Some(View{tracks,requests:self.requests.clone(),requested_stop_epoch:raw.requested_stop_epoch.to_string(),applied_stop_epoch:raw.applied_stop_epoch.to_string()})))
    }
    fn reconcile(&mut self,raw:&n::StateV3){
        for request in &mut self.requests {
            let serial=decimal(&request.request_serial).unwrap();let revision=decimal(&request.preparation_revision).unwrap();
            if let Some(receipt)=raw.receipts.iter().find(|r|r.preparation_revision==revision&&r.request_serial==serial&&r.status!=n::V3_RESULT_EMPTY){request.status=status(receipt.status).into();request.reason=receipt.error;request.target_frame=frame(receipt.target_frame);}
            else if matches!(request.status.as_str(),"queued"|"pending")&&raw.last_consumed_request>=serial{request.status="unavailable".into();}
        }
    }
    pub fn request(&mut self,host:&Host,mut request:n::RequestV3,track:Option<String>,clip:Option<String>)->Result<RequestResult,String>{
        self.poll(host)?;
        // Terminal observations can be summarized; native alone owns receipt reservation.
        while self.requests.len()>=128 {if let Some(i)=self.requests.iter().position(|r|!matches!(r.status.as_str(),"queued"|"pending")){self.requests.remove(i);}else{return Err("128 requests remain outstanding. Let audio advance before retrying.".into());}}
        self.serial=self.serial.checked_add(1).ok_or("Request identity exhausted")?;request.request_serial=self.serial;request.preparation_revision=host.preparation_revision;
        let mut receipt=n::ReceiptV3::default();unsafe{n::alive_session_request_v3(&request,&mut receipt);}
        let result=RequestResult{preparation_revision:host.preparation_revision.to_string(),request_serial:self.serial.to_string(),status:status(receipt.status).into(),reason:receipt.error,track_id:track,clip_id:clip,target_frame:frame(receipt.target_frame)};
        self.requests.push(result.clone());Ok(result)
    }
}
pub fn prepared(host:&Host)->Vec<PreparedClip>{let Some(p)=&host.prepared else{return vec![]};match &p.schedule{Schedule::Legacy=>vec![],Schedule::Clips(clips)=>clips.iter().map(|c|PreparedClip{track_id:p.document.tracks[c.track].id.clone(),clip_id:c.id.clone(),name:c.name.clone(),slot:c.slot,length_frames:c.length_frames.to_string()}).collect()}}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn receipts_match_both_identities_and_keep_queued_until_consumed(){
        let mut r=Runtime::default();r.requests.push(RequestResult{preparation_revision:"2".into(),request_serial:"9".into(),status:"queued".into(),reason:0,track_id:None,clip_id:None,target_frame:None});
        let mut raw=n::StateV3::default();raw.receipts[0].preparation_revision=1;raw.receipts[0].request_serial=9;raw.receipts[0].status=n::V3_APPLIED;
        r.reconcile(&raw);assert_eq!(r.requests[0].status,"queued");raw.receipts[0].preparation_revision=2;raw.receipts[0].status=n::V3_SUPERSEDED;r.reconcile(&raw);assert_eq!(r.requests[0].status,"superseded");
        assert_eq!(decimal("18446744073709551615").unwrap(),u64::MAX);for bad in ["01","-1","1.0","18446744073709551616",""]{assert!(decimal(bad).is_err());}
    }
}
