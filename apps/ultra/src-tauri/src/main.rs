#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use serde::{Serialize,Deserialize};
use tauri::Manager;
use std::{ffi::{c_char,CStr}, sync::Mutex};
struct Audio(Mutex<()>);
extern "C" {
 fn ultra_audio_start()->i32; fn ultra_audio_stop();
 fn ultra_audio_event(device:u32,kind:u32,note:u32,value:u32)->i32;
 fn ultra_audio_sequence(config:*const NativeSequenceConfig)->i32;
 fn ultra_sequence_enabled()->u32; fn ultra_sequence_step()->u32; fn ultra_sequence_note()->u32;
 fn ultra_sequence_ticks()->u64; fn ultra_sequence_clock_source()->u32;
 fn ultra_audio_panic(); fn ultra_audio_routes(mask:u32); fn ultra_audio_error()->*const c_char;
 fn ultra_audio_frames()->u64; fn ultra_audio_rejected()->u64;
 fn ultra_audio_flags()->u32; fn ultra_audio_period()->u32; fn ultra_audio_xruns()->u32;
}
#[derive(Serialize)]
struct Status { running:bool, ready:bool, fault:bool, server_lost:bool, frames:u64, rejected:u64, period:u32, xruns:u32, sample_rate:u32, delay_frames:u32, sequence_enabled:bool, sequence_step:u32, sequence_note:u32, sequence_ticks:u64, sequence_clock_source:u32, message:String }
fn status()->Status { unsafe {let f=ultra_audio_flags();Status{running:f&1!=0,ready:f&2!=0,fault:f&4!=0,server_lost:f&8!=0,frames:ultra_audio_frames(),rejected:ultra_audio_rejected(),period:ultra_audio_period(),xruns:ultra_audio_xruns(),sample_rate:48000,delay_frames:64,sequence_enabled:ultra_sequence_enabled()!=0,sequence_step:ultra_sequence_step(),sequence_note:ultra_sequence_note(),sequence_ticks:ultra_sequence_ticks(),sequence_clock_source:ultra_sequence_clock_source(),message:CStr::from_ptr(ultra_audio_error()).to_string_lossy().into_owned()}}}
#[tauri::command]
fn audio_status(state:tauri::State<Audio>)->Result<Status,String>{let _lock=state.0.lock().map_err(|_|"Audio control lock poisoned")?;Ok(status())}
#[tauri::command]
fn audio_start(state:tauri::State<Audio>)->Result<Status,String>{let _lock=state.0.lock().map_err(|_|"Audio control lock poisoned")?;unsafe{ultra_audio_start();}Ok(status())}
#[tauri::command]
fn audio_stop(state:tauri::State<Audio>)->Result<Status,String>{let _lock=state.0.lock().map_err(|_|"Audio control lock poisoned")?;unsafe{ultra_audio_stop();}Ok(status())}
#[tauri::command]
fn audio_panic(state:tauri::State<Audio>)->Result<Status,String>{let _lock=state.0.lock().map_err(|_|"Audio control lock poisoned")?;unsafe{ultra_audio_panic();}Ok(status())}
#[tauri::command]
fn note_event(state:tauri::State<Audio>,device:u32,kind:u32,note:u32,value:u32)->Result<bool,String>{let _lock=state.0.lock().map_err(|_|"Audio control lock poisoned")?;if device>1||kind>7||note>127||value>127{return Err("Invalid event".into())}Ok(unsafe{ultra_audio_event(device,kind,note,value)!=0})}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct SequenceConfig { enabled:bool, bpm:u32, root:u32, chord:u32, steps:u32, gate:u32, velocity:u32, transpose:i32, clock_source:u32 }
#[repr(C)]
struct NativeSequenceConfig { enabled:u32, bpm:u32, root:u32, chord:u32, steps:u32, gate:u32, velocity:u32, transpose:i32, clock_source:u32 }
impl SequenceConfig {
 fn validate(&self)->Result<(),String>{
  if !(30..=240).contains(&self.bpm)||!(24..=84).contains(&self.root)||self.chord>2||!(1..=8).contains(&self.steps)||!(10..=90).contains(&self.gate)||!(1..=127).contains(&self.velocity)||!(-24..=24).contains(&self.transpose)||self.clock_source>1 {
   return Err("Invalid sequence: BPM 30–240, root 24–84, chord 0–2, steps 1–8, gate 10–90%, velocity 1–127, transpose -24–24, clock source 0–1".into());
  }Ok(())
 }
 fn native(&self)->NativeSequenceConfig {NativeSequenceConfig{enabled:u32::from(self.enabled),bpm:self.bpm,root:self.root,chord:self.chord,steps:self.steps,gate:self.gate,velocity:self.velocity,transpose:self.transpose,clock_source:self.clock_source}}
}
#[tauri::command]
fn sequence_config(state:tauri::State<Audio>,config:SequenceConfig)->Result<bool,String>{
 let _lock=state.0.lock().map_err(|_|"Audio control lock poisoned")?;config.validate()?;
 Ok(unsafe{ultra_audio_sequence(&config.native())!=0})
}
#[derive(Deserialize)]
struct Node { id:String, r#type:String, device:u32 }
#[derive(Deserialize)]
struct Edge { from:String, to:String }
#[derive(Serialize)]
struct PatchResult { route_mask:u32 }
fn validate_patch(nodes:&[Node],edges:&[Edge])->Result<u32,String>{
 use std::collections::{HashMap,HashSet};
 if nodes.len()>8||edges.len()>6{return Err("Research patch supports at most eight objects and six cords".into())}
 let mut by_id=HashMap::new();let mut kinds=HashSet::new();
 for n in nodes {if n.id.is_empty()||n.id.len()>64||n.device>1||!["note","faust","gain","dac"].contains(&n.r#type.as_str())||by_id.insert(n.id.as_str(),n).is_some()||!kinds.insert((n.device,n.r#type.as_str())){return Err("Unsupported, duplicate or invalid object".into())}}
 let mut cords=HashSet::new();
 for e in edges {let a=by_id.get(e.from.as_str()).ok_or("Unknown cord source")?;let b=by_id.get(e.to.as_str()).ok_or("Unknown cord destination")?;
  if a.device!=b.device||!matches!((a.r#type.as_str(),b.r#type.as_str()),("note","faust")|("faust","gain")|("gain","dac"))||!cords.insert((a.device,a.r#type.as_str(),b.r#type.as_str())){return Err("Only note → Faust → gain → output chains are supported".into())}}
 let mut mask=0;for d in 0..2 {if [("note","faust"),("faust","gain"),("gain","dac")].iter().all(|(a,b)|cords.contains(&(d,*a,*b))){mask|=1<<d}}Ok(mask)
}
#[tauri::command]
fn patch_apply(state:tauri::State<Audio>,nodes:serde_json::Value,edges:serde_json::Value)->Result<PatchResult,String>{
 let _lock=state.0.lock().map_err(|_|"Audio control lock poisoned")?;
 let parsed=serde_json::from_value::<Vec<Node>>(nodes).and_then(|nodes|serde_json::from_value::<Vec<Edge>>(edges).map(|edges|(nodes,edges)));
 let (nodes,edges)=match parsed{Ok(value)=>value,Err(e)=>{unsafe{ultra_audio_routes(0)};return Err(format!("Invalid patch data: {e}"))}};
 match validate_patch(&nodes,&edges){Ok(mask)=>{unsafe{ultra_audio_routes(mask)};Ok(PatchResult{route_mask:mask})},Err(e)=>{unsafe{ultra_audio_routes(0)};Err(e)}}
}
#[cfg(test)]
mod tests {
 use super::*;
 #[test] fn sequence_bounds_and_serialization(){
  let mut c:SequenceConfig=serde_json::from_str(r#"{"enabled":true,"bpm":120,"root":60,"chord":0,"steps":8,"gate":50,"velocity":100,"transpose":0,"clock_source":0}"#).unwrap();
  assert!(c.validate().is_ok());assert_eq!(c.native().enabled,1);assert_eq!(std::mem::size_of::<NativeSequenceConfig>(),36);
  c.bpm=29;assert!(c.validate().is_err());c.bpm=240;c.transpose=-25;assert!(c.validate().is_err());c.transpose=24;c.clock_source=2;assert!(c.validate().is_err());c.clock_source=1;c.steps=0;assert!(c.validate().is_err());
 }

 fn chain(device:u32)->(Vec<Node>,Vec<Edge>){let types=["note","faust","gain","dac"];let nodes=types.iter().map(|s|Node{id:format!("{device}-{s}"),r#type:s.to_string(),device}).collect();let edges=types.windows(2).map(|p|Edge{from:format!("{device}-{}",p[0]),to:format!("{device}-{}",p[1])}).collect();(nodes,edges)}
 #[test] fn complete_disconnected_and_empty(){let(n,e)=chain(0);assert_eq!(validate_patch(&n,&e).unwrap(),1);assert_eq!(validate_patch(&n,&e[..2]).unwrap(),0);assert_eq!(validate_patch(&[],&[]).unwrap(),0);}
 #[test] fn independent_routes(){let(mut n,mut e)=chain(0);let(n2,e2)=chain(1);n.extend(n2);e.extend(e2);assert_eq!(validate_patch(&n,&e).unwrap(),3);e[0].to="1-faust".into();assert!(validate_patch(&n,&e).is_err());}
 #[test] fn duplicate_objects_rejected(){let(mut n,e)=chain(0);n[1].id=n[0].id.clone();assert!(validate_patch(&n,&e).is_err());let(mut n,e)=chain(0);n[1].r#type="note".into();assert!(validate_patch(&n,&e).is_err());}
 #[test] fn invalid_cords_rejected(){let(n,mut e)=chain(0);e[0].to="missing".into();assert!(validate_patch(&n,&e).is_err());e[0].to="0-note".into();assert!(validate_patch(&n,&e).is_err());let(n,mut e)=chain(0);e.push(Edge{from:e[0].from.clone(),to:e[0].to.clone()});assert!(validate_patch(&n,&e).is_err());}
 #[test] fn unknown_type_and_bounds_rejected(){let(mut n,e)=chain(0);n[0].r#type="eval".into();assert!(validate_patch(&n,&e).is_err());let(mut n,e)=chain(0);n[0].id="x".repeat(65);assert!(validate_patch(&n,&e).is_err());}
}
fn main(){
 if std::env::var_os("DISPLAY").is_none() && std::env::var_os("WAYLAND_DISPLAY").is_none(){eprintln!("Ultra needs a Linux desktop session (DISPLAY or WAYLAND_DISPLAY). For offline checks run ultra-diagnostic --render-demo demo.wav.");std::process::exit(2);}
 tauri::Builder::default().manage(Audio(Mutex::new(())))
 .invoke_handler(tauri::generate_handler![audio_status,audio_start,audio_stop,audio_panic,note_event,patch_apply,sequence_config])
 .on_window_event(|window,event|{if matches!(event,tauri::WindowEvent::Focused(false)){let state=window.state::<Audio>();if let Ok(_lock)=state.0.lock(){unsafe{ultra_audio_event(0,4,0,0);ultra_audio_event(1,4,0,0);}};}})
 .build(tauri::generate_context!()).expect("Unable to start Ultra window")
 .run(|app,event|{if matches!(event,tauri::RunEvent::Exit){let state=app.state::<Audio>();if let Ok(_lock)=state.0.lock(){unsafe{ultra_audio_stop();}};}});
}
