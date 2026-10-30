//! Optional launch boundary resolved from the same native module as the score ABI.
use super::{launch::Quantization, native as n, native_master::platform::Module};
use std::ffi::{c_int,c_void};
#[repr(C)]
#[derive(Default)]
pub struct Limits {pub version:u32,pub struct_bytes:u32,pub quantization_mask:u32,pub window_frames:u32,pub admitted:u32,pub reserved:u32,pub preparation_revision:u64}
#[repr(C)]
pub struct Request {version:u32,struct_bytes:u32,quantization:u32,reserved:u32,kind:u32,track_mask:u32,preparation_revision:u64,request_serial:u64,position:u64,tracks:[n::TrackActionV3;8]}
type GetLimits=unsafe extern "C" fn(*mut Limits)->c_int;
type RequestV3=unsafe extern "C" fn(*const Request,*mut n::ReceiptV3)->c_int;
type RequestV4=unsafe extern "C" fn(*const Request,*mut n::ReceiptV4)->c_int;
pub struct Capability {_module:Module,limits:GetLimits,request_v3:RequestV3,request_v4:RequestV4}
const _:()={assert!(std::mem::size_of::<Limits>()==32);assert!(std::mem::size_of::<Request>()==112);assert!(std::mem::offset_of!(Request,tracks)==48);};
pub fn capability()->Option<&'static Capability> {
    static VALUE:std::sync::OnceLock<Option<Capability>>=std::sync::OnceLock::new();
    VALUE.get_or_init(||unsafe {
        let module=Module::from_anchor(n::alive_session_state_v2 as *const () as *const c_void)?;
        let limits=std::mem::transmute::<*mut c_void,GetLimits>(module.symbol(b"alive_launch_limits_v1\0")?);
        let request_v3=std::mem::transmute::<*mut c_void,RequestV3>(module.symbol(b"alive_launch_request_v3_v1\0")?);
        let request_v4=std::mem::transmute::<*mut c_void,RequestV4>(module.symbol(b"alive_launch_request_v4_v1\0")?);
        let result=Capability{_module:module,limits,request_v3,request_v4};
        result.info().ok()?;Some(result)
    }).as_ref()
}
impl Capability {
    pub fn info(&self)->Result<Limits,String> {
        let mut out=Limits{version:1,struct_bytes:std::mem::size_of::<Limits>() as u32,..Default::default()};
        if unsafe{(self.limits)(&mut out)}!=1 || out.version!=1 || out.struct_bytes!=32 || out.quantization_mask!=1023 || out.window_frames!=1024 || out.reserved!=0 || out.admitted>1 {return Err("Native launch capability is incompatible".into());}
        Ok(out)
    }
}
pub fn available(revision:u64)->bool {
    capability().and_then(|c|c.info().ok()).is_some_and(|l|l.admitted==1&&l.preparation_revision==revision)
}
pub fn require(revision:u64)->Result<(),String> {
    let c=capability().ok_or("Native launch quantization is unavailable; saved settings are retained. Upgrade the native library")?;
    let l=c.info()?;
    if l.preparation_revision!=revision {return Err("Native launch preparation changed; refresh before launching".into());}
    if l.admitted==0 {return Err("This preparation exceeds quantized launch work limits; simplify simultaneous music or use 1 Bar".into());}
    Ok(())
}
pub fn submit_v3(r:&n::RequestV3,q:Quantization,out:&mut n::ReceiptV3)->Result<(),String> {
    if q==Quantization::Bar1 {unsafe{n::alive_session_request_v3(r,out);};return Ok(());}
    require(r.preparation_revision)?;
    let request=Request{version:1,struct_bytes:112,quantization:q as u32,reserved:0,kind:r.kind,track_mask:r.track_mask,preparation_revision:r.preparation_revision,request_serial:r.request_serial,position:r.position,tracks:r.tracks};
    unsafe{(capability().unwrap().request_v3)(&request,out);};Ok(())
}
pub fn submit_v4(r:&n::RequestV4,q:Quantization,out:&mut n::ReceiptV4)->Result<(),String> {
    if q==Quantization::Bar1 {unsafe{n::alive_session_request_v4(r,out);};return Ok(());}
    require(r.preparation_revision)?;
    let request=Request{version:1,struct_bytes:112,quantization:q as u32,reserved:0,kind:r.kind,track_mask:r.track_mask,preparation_revision:r.preparation_revision,request_serial:r.request_serial,position:r.position,tracks:std::array::from_fn(|i|n::TrackActionV3{action:r.tracks[i].action,slot:r.tracks[i].slot})};
    unsafe{(capability().unwrap().request_v4)(&request,out);};Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn unavailable_native_preserves_nondefault_saved_intent() {
        if capability().is_some(){return;}
        let mut out=n::ReceiptV3::default();
        assert!(submit_v3(&n::RequestV3::default(),Quantization::Sixteenth,&mut out).unwrap_err().contains("saved settings are retained"));
        assert_eq!(out.status,0);
    }
}
