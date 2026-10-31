//! Optional MIDI boundary is resolved from the existing score module as a unit.
use super::{native as n,native_master::platform::Module};
use std::ffi::{c_int,c_void};
#[repr(C)]
#[derive(Default)]
pub struct Limits {pub version:u32,pub struct_bytes:u32,pub available:u32,pub event_allowance:u32,pub window_frames:u32,pub reserved:u32,pub preparation_revision:u64}
#[repr(C)]
pub struct Preview {pub version:u32,pub struct_bytes:u32,pub track:u32,pub pitch:u32,pub velocity:u32,pub reserved:u32,pub preparation_revision:u64,pub serial:u64}
#[repr(C)]
#[derive(Default,Clone,Copy,serde::Serialize)]
#[serde(rename_all="camelCase")]
pub struct State {pub version:u32,pub struct_bytes:u32,pub status:u32,pub error:u32,pub preparation_revision:u64,pub serial:u64,pub source_revision:u64,pub applied_frame:u64,pub preview_serial:u64,pub preview_expiry:u64,pub preview_active:u32,pub preview_track:u32,pub preview_pitch:u32,pub preview_error:u32}
type GetLimits=unsafe extern "C" fn(*mut Limits)->c_int;
type Audition=unsafe extern "C" fn(*const Preview)->c_int;
type Release=unsafe extern "C" fn(u64,u64)->c_int;
type Observe=unsafe extern "C" fn(*mut State)->c_int;
pub struct Capability {_module:Module,limits:GetLimits,audition:Audition,release:Release,observe:Observe}
const _:()={assert!(std::mem::size_of::<Limits>()==32);assert!(std::mem::size_of::<Preview>()==40);assert!(std::mem::size_of::<State>()==80);};
pub fn capability()->Option<&'static Capability>{
    static VALUE:std::sync::OnceLock<Option<Capability>>=std::sync::OnceLock::new();
    VALUE.get_or_init(||unsafe{
        let module=Module::from_anchor(n::alive_session_state_v2 as *const () as *const c_void)?;
        let limits=std::mem::transmute::<*mut c_void,GetLimits>(module.symbol(b"alive_midi_limits_v1\0")?);
        let audition=std::mem::transmute::<*mut c_void,Audition>(module.symbol(b"alive_midi_preview_v1\0")?);
        let release=std::mem::transmute::<*mut c_void,Release>(module.symbol(b"alive_midi_release_v1\0")?);
        let observe=std::mem::transmute::<*mut c_void,Observe>(module.symbol(b"alive_midi_state_v1\0")?);
        let result=Capability{_module:module,limits,audition,release,observe};result.info().ok()?;Some(result)
    }).as_ref()
}
impl Capability {
    pub fn info(&self)->Result<Limits,String>{let mut out=Limits{version:1,struct_bytes:32,..Default::default()};if unsafe{(self.limits)(&mut out)}!=1||out.version!=1||out.struct_bytes!=32||out.available>1||out.event_allowance!=10||out.window_frames!=1024||out.reserved!=0{return Err("Native MIDI capability is incompatible".into())}Ok(out)}
    pub fn state(&self)->Result<State,String>{let mut out=State{version:1,struct_bytes:80,..Default::default()};if unsafe{(self.observe)(&mut out)}!=1||out.version!=1||out.struct_bytes!=80{return Err("Native MIDI observation is temporarily unavailable".into())}Ok(out)}
    pub fn preview(&self,request:&Preview)->Result<(),String>{if unsafe{(self.audition)(request)}!=1{return Err(n::error())}Ok(())}
    pub fn release(&self,preparation:u64,serial:u64)->Result<(),String>{if unsafe{(self.release)(preparation,serial)}!=1{return Err("MIDI Preview release belongs to an old scope".into())}Ok(())}
}
pub fn require(revision:u64)->Result<&'static Capability,String>{
    let c=capability().ok_or("Native MIDI Preview is unavailable")?;
    let info=c.info()?;if info.preparation_revision!=revision{return Err("Prepared MIDI scope changed".into())}
    if info.available==0{return Err("MIDI Preview is unavailable for this preparation's bounded work allowance".into())}Ok(c)
}
pub fn next_serial()->Result<u64,String>{
    use std::sync::atomic::{AtomicU64,Ordering};static SERIAL:AtomicU64=AtomicU64::new(0);
    let mut current=SERIAL.load(Ordering::Relaxed);loop{let next=current.checked_add(1).ok_or("MIDI command identity exhausted")?;match SERIAL.compare_exchange_weak(current,next,Ordering::Relaxed,Ordering::Relaxed){Ok(_)=>return Ok(next),Err(value)=>current=value}}
}

#[cfg(test)]mod tests {
    use super::*;
    #[test]fn midi_serials_are_distinct_and_missing_capability_is_explicit(){let a=next_serial().unwrap();assert!(next_serial().unwrap()>a);if capability().is_none(){assert!(require(1).err().unwrap().contains("MIDI Preview is unavailable"));}}
}
