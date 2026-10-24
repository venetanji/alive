//! Strict clip wire data, persistent identities, and legacy compatibility.
use super::*;
use serde::{Deserializer, Serializer};
use std::{collections::HashSet, ops::{Deref, DerefMut}};

#[derive(Clone, Debug, PartialEq)]
pub enum Document { LegacyV2(LegacySession), ClipsV3(ClipDocument) }
#[derive(Clone, Debug, PartialEq)]
pub struct ClipDocument { pub common: LegacySession, pub banks: Vec<ClipBank> }
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct ClipBank { pub track_id: String, pub slots: [Option<Clip>; 4], pub default_clip_id: Option<String> }
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all="camelCase", deny_unknown_fields)]
pub struct Clip { pub id: String, pub name: String, pub length_beats: f64, pub notes: Vec<ClipNote>, pub automation: Vec<Lane> }
#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ClipNote { pub id: String, pub beat: f64, pub duration: f64, pub pitch: u32, pub velocity: u32 }
#[derive(Deserialize, Serialize)]
#[serde(rename_all="camelCase", deny_unknown_fields)]
struct Wire { format:String, title:String, tempo:f64, length_beats:f64, loop_enabled:bool, tracks:Vec<WireTrack> }
#[derive(Deserialize, Serialize)]
#[serde(rename_all="camelCase", deny_unknown_fields)]
struct WireTrack {
    id:String, name:String, device:DeviceInstance, effects:Vec<DeviceInstance>, slots:[Option<Clip>;4],
    #[serde(deserialize_with="required_nullable")]
    default_clip_id:Option<String>, gain:f64, mute:bool, solo:bool,
}
fn required_nullable<'de,D:Deserializer<'de>>(d:D)->Result<Option<String>,D::Error> { Option::deserialize(d) }
impl Deref for Document { type Target=LegacySession; fn deref(&self)->&LegacySession {match self {Self::LegacyV2(s)=>s,Self::ClipsV3(s)=>&s.common}} }
impl DerefMut for Document { fn deref_mut(&mut self)->&mut LegacySession {match self {Self::LegacyV2(s)=>s,Self::ClipsV3(s)=>&mut s.common}} }
impl Serialize for Document {
    fn serialize<S:Serializer>(&self,s:S)->Result<S::Ok,S::Error> {
        match self {
            Self::LegacyV2(old)=>old.serialize(s),
            Self::ClipsV3(doc)=>Wire {format:doc.common.format.clone(),title:doc.common.title.clone(),tempo:doc.common.tempo,length_beats:doc.common.length_beats,loop_enabled:doc.common.loop_enabled,
                tracks:doc.common.tracks.iter().map(|t| {let bank=doc.banks.iter().find(|b|b.track_id==t.id).expect("clip bank follows track identity");
                    WireTrack{id:t.id.clone(),name:t.name.clone(),device:t.device.clone(),effects:t.effects.clone(),slots:bank.slots.clone(),default_clip_id:bank.default_clip_id.clone(),gain:t.gain,mute:t.mute,solo:t.solo}}).collect()}.serialize(s),
        }
    }
}
impl<'de> Deserialize<'de> for Document {
    fn deserialize<D:Deserializer<'de>>(d:D)->Result<Self,D::Error> {
        let value=serde_json::Value::deserialize(d)?;
        match value["format"].as_str() {
            Some("alive-session-v2")=>serde_json::from_value(value).map(Self::LegacyV2).map_err(serde::de::Error::custom),
            Some("alive-session-v3")=>serde_json::from_value::<Wire>(value).map(Document::from_wire).map_err(serde::de::Error::custom),
            _=>Err(serde::de::Error::custom("Unsupported Alive session format")),
        }
    }
}
impl Document {
    fn from_wire(w:Wire)->Self {
        let banks=w.tracks.iter().map(|t|ClipBank{track_id:t.id.clone(),slots:t.slots.clone(),default_clip_id:t.default_clip_id.clone()}).collect();
        Self::ClipsV3(ClipDocument{common:LegacySession{format:w.format,title:w.title,tempo:w.tempo,length_beats:w.length_beats,loop_enabled:w.loop_enabled,
            tracks:w.tracks.into_iter().map(|t|Track{id:t.id,name:t.name,device:t.device,effects:t.effects,notes:vec![],automation:vec![],gain:t.gain,mute:t.mute,solo:t.solo}).collect()},banks})
    }
    pub fn is_clips(&self)->bool {matches!(self,Self::ClipsV3(_))}
    pub fn banks(&self)->&[ClipBank] {match self {Self::LegacyV2(_)=>&[],Self::ClipsV3(s)=>&s.banks}}
    pub fn bank(&self,id:&str)->Option<&ClipBank> {self.banks().iter().find(|b|b.track_id==id)}
    pub fn bank_mut(&mut self,id:&str)->Option<&mut ClipBank> {match self {Self::ClipsV3(s)=>s.banks.iter_mut().find(|b|b.track_id==id),_=>None}}
    pub fn to_clips(&self)->Result<Self,String> {
        if self.is_clips(){return Ok(self.clone());}
        let mut common=self.deref().clone();common.format="alive-session-v3".into();
        let banks=common.tracks.iter_mut().map(|t| {
            let id=identity("clip", &["alive-v2-v3-clip", &t.id]);
            let notes=t.notes.drain(..).enumerate().map(|(index,n)|ClipNote{id:identity("note", &["alive-v2-v3-note",&t.id,&index.to_string()]),beat:n.beat,duration:n.duration,pitch:n.pitch,velocity:n.velocity}).collect();
            ClipBank{track_id:t.id.clone(),slots:[Some(Clip{id:id.clone(),name:"Clip 1".into(),length_beats:self.length_beats,notes,automation:std::mem::take(&mut t.automation)}),None,None,None],default_clip_id:Some(id)}
        }).collect();
        let document=Self::ClipsV3(ClipDocument{common,banks});document.validate_clips()?;Ok(document)
    }
    pub fn validate_clips(&self)->Result<(),String> {
        if !self.is_clips(){return Ok(());}
        super::prepare::text(&self.title,128,"Session title")?;
        super::prepare::bounded(self.tempo,30.,240.,"Tempo")?;
        super::prepare::bounded(self.length_beats,1./64.,256.,"Transport length")?;
        let count:usize=self.tracks.iter().map(|t|1+t.effects.len()).sum();
        if count>16{return Err("Session exceeds sixteen native roots".into());}
        let limits=super::native::clip_capacity()?;
        if self.tracks.is_empty()||self.tracks.len()>limits.max_tracks as usize{return Err(format!("This admitted clip profile supports one to {} instrument tracks",limits.max_tracks));}
        let mut ids=HashSet::new();let mut notes=HashSet::new();let mut tracks=HashSet::new();let mut devices=HashSet::new();
        for t in &self.tracks {
            super::prepare::token(&t.id,"Track ID")?;super::prepare::text(&t.name,64,"Track name")?;
            super::prepare::bounded(t.gain,0.,2.,"Track gain")?;
            if !tracks.insert(&t.id){return Err("Duplicate track ID".into());}
            if t.effects.len()>2{return Err("At most two effects per track".into());}
            for d in t.devices(){super::prepare::token(&d.instance_id,"Instance ID")?;if !devices.insert(&d.instance_id){return Err("Duplicate device instance ID".into());}}
            let bank=self.bank(&t.id).ok_or("Missing clip bank")?;
            if bank.default_clip_id.as_ref().is_some_and(|id|!bank.slots.iter().flatten().any(|c|&c.id==id)){return Err("Saved default must name a clip on its track".into());}
            let mut counts=(0,0,0);
            for c in bank.slots.iter().flatten(){
                super::prepare::token(&c.id,"Clip ID")?;super::prepare::text(&c.name,64,"Clip name")?;
                super::prepare::bounded(c.length_beats,1./64.,256.,"Clip length")?;
                if !ids.insert(&c.id){return Err("Duplicate clip ID".into());}
                counts.0+=c.notes.len();counts.1+=c.automation.len();counts.2+=c.automation.iter().map(|l|l.points.len()).sum::<usize>();
                for n in &c.notes{super::prepare::token(&n.id,"Note ID")?;if !notes.insert(&n.id){return Err("Duplicate note ID".into());}
                    if n.beat+n.duration>c.length_beats+1e-10{return Err("Clip length cannot truncate a note; shorten or move the note first".into());}
                    super::prepare::bounded(n.beat,0.,c.length_beats,"Note beat")?;super::prepare::bounded(n.duration,f64::MIN_POSITIVE,c.length_beats,"Note duration")?;
                    if n.pitch>127||!(1..=127).contains(&n.velocity)||n.beat+n.duration>c.length_beats+1e-10{return Err("Note pitch, velocity or end exceeds the clip bounds".into());}
                }
                let mut targets=HashSet::new();
                for l in &c.automation{if !t.devices().any(|d|d.instance_id==l.instance_id){return Err("Missing or cross-track automation instance".into());}if !targets.insert((&l.instance_id,&l.key)){return Err("Duplicate automation lane".into());}
                    for p in &l.points{super::prepare::bounded(p.beat,0.,c.length_beats,"Automation beat")?;if !p.value.is_finite(){return Err("Automation value must be finite".into());}}
                }
            }
            if counts.0>128||counts.1>16||counts.2>256{return Err(format!("Track '{}' stored clips exceed aggregate limits: 128 notes, 16 lanes, 256 points (including disabled lanes)",t.name));}
        }
        if devices.len()>limits.max_devices as usize{return Err(format!("At most {} devices in this admitted clip profile",limits.max_devices));}Ok(())
    }
}
fn identity(prefix:&str,parts:&[&str])->String {
    use sha2::{Digest,Sha256};let mut hash=Sha256::new();
    for part in parts {hash.update((part.len() as u32).to_be_bytes());hash.update(part.as_bytes());}
    format!("{prefix}-{}",&format!("{:x}",hash.finalize())[..32])
}

#[derive(Deserialize)]
#[serde(tag="kind",rename_all="camelCase",rename_all_fields="camelCase",deny_unknown_fields)]
pub enum Edit {
    Create{track_id:String,slot:usize}, Duplicate{track_id:String,clip_id:String,destination_slot:usize},
    Delete{track_id:String,clip_id:String}, Rename{track_id:String,clip_id:String,name:String},
    Length{track_id:String,clip_id:String,length_beats:f64}, Default{track_id:String,#[serde(deserialize_with="required_nullable")]clip_id:Option<String>},
    NoteCreate{track_id:String,clip_id:String,beat:f64,duration:f64,pitch:u32,velocity:u32},
}
#[derive(Serialize,Debug)]
#[serde(rename_all="camelCase")]
pub struct Affected {pub track_id:String,pub slot:Option<usize>,pub clip_id:Option<String>,pub note_id:Option<String>}
pub(super) fn fresh(prefix:&str,ids:&mut HashSet<String>)->String {
    use std::sync::atomic::{AtomicU64,Ordering};static NEXT:AtomicU64=AtomicU64::new(1);
    loop{let seed=format!("{}-{:?}-{}",std::process::id(),std::time::SystemTime::now(),NEXT.fetch_add(1,Ordering::Relaxed));let id=identity(prefix,&[&seed]);if ids.insert(id.clone()){return id;}}
}
pub(super) fn apply_edit(document:&mut Document,operation:Edit,mut ids:HashSet<String>)->Result<Affected,String> {
    for c in document.banks().iter().flat_map(|b|b.slots.iter().flatten()){ids.insert(c.id.clone());ids.extend(c.notes.iter().map(|n|n.id.clone()));}
    let track_id=match &operation{Edit::Create{track_id,..}|Edit::Duplicate{track_id,..}|Edit::Delete{track_id,..}|Edit::Rename{track_id,..}|Edit::Length{track_id,..}|Edit::Default{track_id,..}|Edit::NoteCreate{track_id,..}=>track_id.clone()};
    let length=document.length_beats;let bank=document.bank_mut(&track_id).ok_or("Enable the clip bank first")?;
    let find=|bank:&ClipBank,id:&str|bank.slots.iter().position(|c|c.as_ref().is_some_and(|c|c.id==id)).ok_or_else(||"Unknown clip on this track".to_string());
    let mut result=Affected{track_id,slot:None,clip_id:None,note_id:None};
    match operation {
        Edit::Create{slot,..}=>{if slot>=4||bank.slots[slot].is_some(){return Err("Choose an empty slot".into());}let id=fresh("clip",&mut ids);bank.slots[slot]=Some(Clip{id:id.clone(),name:format!("Clip {}",slot+1),length_beats:length,notes:vec![],automation:vec![]});result.slot=Some(slot);result.clip_id=Some(id);}
        Edit::Duplicate{clip_id,destination_slot,..}=>{let source=find(bank,&clip_id)?;if destination_slot>=4||bank.slots[destination_slot].is_some(){return Err("Choose an empty destination slot".into());}let mut c=bank.slots[source].clone().unwrap();c.id=fresh("clip",&mut ids);while c.name.len()>59{c.name.pop();}c.name.push_str(" copy");for n in &mut c.notes{n.id=fresh("note",&mut ids);}result.clip_id=Some(c.id.clone());result.slot=Some(destination_slot);bank.slots[destination_slot]=Some(c);}
        Edit::Default{clip_id,..}=>{if let Some(id)=&clip_id{result.slot=Some(find(bank,id)?);}bank.default_clip_id=clip_id.clone();result.clip_id=clip_id;}
        Edit::Delete{clip_id,..}=>{let slot=find(bank,&clip_id)?;bank.slots[slot]=None;if bank.default_clip_id.as_ref()==Some(&clip_id){bank.default_clip_id=None;}result.slot=Some(slot);}
        Edit::Rename{clip_id,name,..}=>{let slot=find(bank,&clip_id)?;bank.slots[slot].as_mut().unwrap().name=name;result.slot=Some(slot);result.clip_id=Some(clip_id);}
        Edit::Length{clip_id,length_beats,..}=>{let slot=find(bank,&clip_id)?;bank.slots[slot].as_mut().unwrap().length_beats=length_beats;result.slot=Some(slot);result.clip_id=Some(clip_id);}
        Edit::NoteCreate{clip_id,beat,duration,pitch,velocity,..}=>{let slot=find(bank,&clip_id)?;let id=fresh("note",&mut ids);bank.slots[slot].as_mut().unwrap().notes.push(ClipNote{id:id.clone(),beat,duration,pitch,velocity});result.slot=Some(slot);result.clip_id=Some(clip_id);result.note_id=Some(id);}
    }Ok(result)
}
pub(super) fn guard_identities(candidate:&Document,current:&Document)->Result<(),String> {
    if !current.is_clips(){return Ok(());}
    for bank in candidate.banks(){let old=current.bank(&bank.track_id).ok_or("Unknown track bank")?;
        if bank.default_clip_id!=old.default_clip_id{return Err("Use Set Saved Default to change the default".into());}
        for (a,b) in bank.slots.iter().zip(&old.slots){if a.as_ref().map(|c|&c.id)!=b.as_ref().map(|c|&c.id){return Err("Use the focused clip controls to change slot membership".into());}
            if let(Some(a),Some(b))=(a,b){for n in &a.notes{if !b.notes.iter().any(|old|old.id==n.id){return Err("Unknown or reassigned note ID; use Add note".into());}}}
        }
    }Ok(())
}
pub(super) fn decode_v3(text:&str)->Result<Document,String> {
    reject_duplicates(text)?;
    let wire:Wire=serde_json::from_str(text).map_err(|e|format!("Invalid Alive v3 session JSON: {e}"))?;
    let doc=Document::from_wire(wire);doc.validate_clips()?;Ok(doc)
}
// This pass runs only on v3, before a Value could discard duplicate map members.
fn reject_duplicates(text:&str)->Result<(),String> {
    struct Unique;
    impl<'de> Deserialize<'de> for Unique {
        fn deserialize<D:Deserializer<'de>>(d:D)->Result<Self,D::Error>{
            struct Visitor;
            impl<'de> serde::de::Visitor<'de> for Visitor {
                type Value=Unique;
                fn expecting(&self,f:&mut std::fmt::Formatter)->std::fmt::Result{f.write_str("JSON without duplicate members")}
                fn visit_map<M:serde::de::MapAccess<'de>>(self,mut m:M)->Result<Unique,M::Error>{let mut keys=HashSet::new();while let Some(k)=m.next_key::<String>()?{if !keys.insert(k){return Err(serde::de::Error::custom("Duplicate JSON member"));}m.next_value::<Unique>()?;}Ok(Unique)}
                fn visit_seq<A:serde::de::SeqAccess<'de>>(self,mut a:A)->Result<Unique,A::Error>{while a.next_element::<Unique>()?.is_some(){}Ok(Unique)}
                fn visit_str<E:serde::de::Error>(self,_:&str)->Result<Unique,E>{Ok(Unique)}
                fn visit_bool<E:serde::de::Error>(self,_:bool)->Result<Unique,E>{Ok(Unique)}
                fn visit_i64<E:serde::de::Error>(self,_:i64)->Result<Unique,E>{Ok(Unique)}
                fn visit_u64<E:serde::de::Error>(self,_:u64)->Result<Unique,E>{Ok(Unique)}
                fn visit_f64<E:serde::de::Error>(self,_:f64)->Result<Unique,E>{Ok(Unique)}
                fn visit_unit<E:serde::de::Error>(self)->Result<Unique,E>{Ok(Unique)}
            }d.deserialize_any(Visitor)
        }
    }
    serde_json::from_str::<Unique>(text).map(|_|()).map_err(|e|format!("Invalid Alive v3 session JSON: {e}"))
}
