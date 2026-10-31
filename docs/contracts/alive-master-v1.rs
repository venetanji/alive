//! Standalone layout and dynamically resolved ABI witness; no eager extern linkage.
use std::ffi::c_int;
pub const ALIVE_MASTER_V1:u32=1;
pub const ALIVE_MASTER_OK:c_int=1;
pub const ALIVE_MASTER_INVALID:c_int=0;
pub const ALIVE_MASTER_UNSUPPORTED:c_int=-1;
pub const ALIVE_MASTER_FULL:c_int=-2;
pub const ALIVE_MASTER_BUSY:c_int=-3;
pub const ALIVE_MASTER_UNCONFIGURED:c_int=-4;
pub const ALIVE_MASTER_EXHAUSTED:c_int=-5;
pub const ALIVE_MASTER_FEATURE_GAIN:u32=1;
pub const ALIVE_MASTER_FEATURE_METER:u32=2;
pub const ALIVE_MASTER_FEATURE_RESET:u32=4;
#[repr(C)] pub struct AliveMasterLimitsV1 { pub version:u32, pub struct_bytes:u32, pub features:u32, pub ramp_frames:u32, pub max_gain:f64 }
#[repr(C)] pub struct AliveMasterStateV1 { pub version:u32, pub struct_bytes:u32, pub clip_mask:u32, pub reserved:u32, pub target_gain:f64, pub current_gain:f64, pub peak_left:f64, pub peak_right:f64, pub applied_serial:u64, pub applied_frame:u64, pub observation_start_frame:u64, pub observation_end_frame:u64 }
// Opaque here: existing layouts are owned by their current bindings, not redefined.
#[repr(C)] pub struct AliveSessionStateV2 { _opaque:[u8;0] }
#[repr(C)] pub struct AliveSessionStateV3 { _opaque:[u8;0] }
#[repr(C)] pub struct AliveSessionStateV4 { _opaque:[u8;0] }
pub type Limits = unsafe extern "C" fn(*mut AliveMasterLimitsV1)->c_int;
pub type Set = unsafe extern "C" fn(u32,f64,u64)->c_int;
pub type ResetClip = unsafe extern "C" fn(u32,u64)->c_int;
pub type SnapshotV2 = unsafe extern "C" fn(*mut AliveSessionStateV2,*mut AliveMasterStateV1)->c_int;
pub type SnapshotV3 = unsafe extern "C" fn(*mut AliveSessionStateV3,*mut AliveMasterStateV1)->c_int;
pub type SnapshotV4 = unsafe extern "C" fn(*mut AliveSessionStateV4,*mut AliveMasterStateV1)->c_int;
const _: () = { use std::mem::{size_of,align_of,offset_of};
assert!(size_of::<AliveMasterLimitsV1>()==24 && align_of::<AliveMasterLimitsV1>()==8);
assert!(offset_of!(AliveMasterLimitsV1,version)==0 && offset_of!(AliveMasterLimitsV1,struct_bytes)==4 && offset_of!(AliveMasterLimitsV1,features)==8 && offset_of!(AliveMasterLimitsV1,ramp_frames)==12 && offset_of!(AliveMasterLimitsV1,max_gain)==16);
assert!(size_of::<AliveMasterStateV1>()==80 && align_of::<AliveMasterStateV1>()==8);
assert!(offset_of!(AliveMasterStateV1,version)==0 && offset_of!(AliveMasterStateV1,struct_bytes)==4 && offset_of!(AliveMasterStateV1,clip_mask)==8 && offset_of!(AliveMasterStateV1,reserved)==12 && offset_of!(AliveMasterStateV1,target_gain)==16 && offset_of!(AliveMasterStateV1,current_gain)==24 && offset_of!(AliveMasterStateV1,peak_left)==32 && offset_of!(AliveMasterStateV1,peak_right)==40 && offset_of!(AliveMasterStateV1,applied_serial)==48 && offset_of!(AliveMasterStateV1,applied_frame)==56 && offset_of!(AliveMasterStateV1,observation_start_frame)==64 && offset_of!(AliveMasterStateV1,observation_end_frame)==72); };
