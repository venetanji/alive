//! Complete immutable workspace schedules publish against retained device roots.
use super::{native as n, native_master::platform::Module};
use std::ffi::{c_int,c_void};

#[repr(C)]
pub struct Request {
    pub version:u32,pub struct_bytes:u32,pub changed_tracks:u32,pub reserved:u32,
    pub preparation_revision:u64,pub bank_revision:u64,pub serial:u64,pub stop_epoch:u64,
    pub tracks:[u32;8],pub sources:[u32;32],pub slots:[u32;32],pub placements:[u32;64],
}
impl Default for Request {
    fn default()->Self{Self{version:4,struct_bytes:592,changed_tracks:0,reserved:0,
        preparation_revision:0,bank_revision:0,serial:0,stop_epoch:0,
        tracks:[n::V4_NONE;8],sources:[n::V4_NONE;32],slots:[n::V4_NONE;32],placements:[n::V4_NONE;64]}}
}
#[repr(C)]
#[derive(Default,Clone,Copy,Debug,serde::Serialize)]
#[serde(rename_all="camelCase")]
pub struct State {
    pub version:u32,pub struct_bytes:u32,pub status:u32,pub error:u32,
    pub preparation_revision:u64,pub serial:u64,pub bank_revision:u64,
    pub applied_frame:u64,pub stop_epoch:u64,pub retired_serial:u64,
}
type Publish=unsafe extern "C" fn(*const n::ConfigV4,*const n::AudioBufferV4,u32,*const Request)->c_int;
type Observe=unsafe extern "C" fn(*mut State)->c_int;
pub struct Capability{_module:Module,publish:Publish,observe:Observe}
const _:()={assert!(std::mem::size_of::<Request>()==592);assert!(std::mem::size_of::<State>()==64);};
pub fn capability()->Option<&'static Capability>{
    static VALUE:std::sync::OnceLock<Option<Capability>>=std::sync::OnceLock::new();
    VALUE.get_or_init(||unsafe{
        let module=Module::from_anchor(n::alive_session_state_v2 as *const () as *const c_void)?;
        let publish=std::mem::transmute::<*mut c_void,Publish>(module.symbol(b"alive_session_publish_v4\0")?);
        let observe=std::mem::transmute::<*mut c_void,Observe>(module.symbol(b"alive_session_publication_state_v4\0")?);
        Some(Capability{_module:module,publish,observe})
    }).as_ref()
}
impl Capability {
    pub fn state(&self)->Result<State,String>{
        let mut state=State{version:4,struct_bytes:64,..Default::default()};
        if unsafe{(self.observe)(&mut state)}!=1||state.version!=4||state.struct_bytes!=64{return Err("Workspace publication observation is temporarily unavailable".into())}
        Ok(state)
    }
    pub fn publish(&self,config:&n::ConfigV4,audio:&[n::AudioBufferV4],request:&Request)->Result<(),String>{
        if unsafe{(self.publish)(config,audio.as_ptr(),audio.len() as u32,request)}!=1{return Err(n::error())}
        Ok(())
    }
}
pub fn require(preparation:u64)->Result<&'static Capability,String>{
    let capability=capability().ok_or("Native workspace editing is unavailable in this build")?;
    if capability.state()?.preparation_revision!=preparation{return Err("Prepared workspace changed; refresh before editing".into())}
    Ok(capability)
}
