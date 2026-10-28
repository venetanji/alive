//! Optional Master symbols are resolved from the image containing the linked anchor.
use std::ffi::{c_char, c_int, c_void};

#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct Limits { pub version:u32, pub struct_bytes:u32, pub features:u32, pub ramp_frames:u32, pub max_gain:f64 }
#[repr(C)]
#[derive(Clone, Copy, Default, Debug)]
pub struct State { pub version:u32, pub struct_bytes:u32, pub clip_mask:u32, pub reserved:u32, pub target_gain:f64, pub current_gain:f64, pub peak_left:f64, pub peak_right:f64, pub applied_serial:u64, pub applied_frame:u64, pub observation_start_frame:u64, pub observation_end_frame:u64 }
impl State { pub fn output()->Self { Self { version:1, struct_bytes:std::mem::size_of::<Self>() as u32, ..Self::default() } } }
const _: () = { use std::mem::{size_of,align_of,offset_of};
    assert!(size_of::<Limits>()==24 && align_of::<Limits>()==8);
    assert!(offset_of!(Limits,version)==0 && offset_of!(Limits,struct_bytes)==4 && offset_of!(Limits,features)==8 && offset_of!(Limits,ramp_frames)==12 && offset_of!(Limits,max_gain)==16);
    assert!(size_of::<State>()==80 && align_of::<State>()==8);
    assert!(offset_of!(State,version)==0 && offset_of!(State,struct_bytes)==4 && offset_of!(State,clip_mask)==8 && offset_of!(State,reserved)==12 && offset_of!(State,target_gain)==16 && offset_of!(State,current_gain)==24 && offset_of!(State,peak_left)==32 && offset_of!(State,peak_right)==40 && offset_of!(State,applied_serial)==48 && offset_of!(State,applied_frame)==56 && offset_of!(State,observation_start_frame)==64 && offset_of!(State,observation_end_frame)==72);
};
pub type Set = unsafe extern "C" fn(u32,f64,u64)->c_int;
pub type Reset = unsafe extern "C" fn(u32,u64)->c_int;
pub type Snapshot = unsafe extern "C" fn(*mut c_void,*mut State)->c_int;
type GetLimits = unsafe extern "C" fn(*mut Limits)->c_int;

pub struct Capability { _module: platform::Module, pub set:Set, pub reset:Reset, pub snapshot_v2:Snapshot, pub snapshot_v3:Snapshot, pub snapshot_v4:Snapshot }
#[derive(Default)]
pub struct Serials(pub u64);
impl Serials {
    pub fn reserve_pair(&mut self)->Option<(u64,u64)> { let last=self.0.checked_add(2)?;self.0=last;Some((last-1,last)) }
    pub fn next(&mut self)->Option<u64> { let next=self.0.checked_add(1)?;self.0=next;Some(next) }
}
static SERIALS: std::sync::Mutex<Serials> = std::sync::Mutex::new(Serials(0));
pub fn reserve_pair()->Option<(u64,u64)> { SERIALS.lock().ok()?.reserve_pair() }
pub fn next_serial()->Option<u64> { SERIALS.lock().ok()?.next() }
#[cfg(test)]
pub fn current_serial()->u64 { SERIALS.lock().unwrap().0 }
#[cfg(test)]
pub fn set_serial_for_test(value:u64) { SERIALS.lock().unwrap().0=value; }
#[cfg(test)]
pub fn fresh_process(test_name:&str)->bool {
    if std::env::var_os("ALIVE_MASTER_TEST_CHILD").is_some(){return false;}
    let output=std::process::Command::new(std::env::current_exe().unwrap()).args(["--exact",test_name,"--nocapture"])
        .env("ALIVE_MASTER_TEST_CHILD","1").output().unwrap();
    assert!(output.status.success(),"native fixture failed:\n{}\n{}",String::from_utf8_lossy(&output.stdout),String::from_utf8_lossy(&output.stderr));
    true
}

pub fn resolve(anchor: *const c_void) -> Option<Capability> {
    unsafe {
        let module=platform::Module::from_anchor(anchor)?;
        let mut symbols=[std::ptr::null_mut();6];
        let names:[&[u8];6]=[b"alive_session_master_limits\0",b"alive_session_master_set\0",b"alive_session_master_reset_clip\0",b"alive_session_master_snapshot_v2\0",b"alive_session_master_snapshot_v3\0",b"alive_session_master_snapshot_v4\0"];
        for (slot,name) in symbols.iter_mut().zip(names) { *slot=module.symbol(name)?; }
        let limits:GetLimits=std::mem::transmute(symbols[0]);
        let mut info=Limits {version:1,struct_bytes:std::mem::size_of::<Limits>() as u32,..Limits::default()};
        if limits(&mut info)!=1 || info.version!=1 || info.struct_bytes!=std::mem::size_of::<Limits>() as u32 || info.features!=7 || info.ramp_frames!=64 || info.max_gain!=4. { return None; }
        Some(Capability {_module:module,set:std::mem::transmute(symbols[1]),reset:std::mem::transmute(symbols[2]),snapshot_v2:std::mem::transmute(symbols[3]),snapshot_v3:std::mem::transmute(symbols[4]),snapshot_v4:std::mem::transmute(symbols[5])})
    }
}

#[cfg(any(target_os="linux",target_os="macos"))]
mod platform {
    use super::*;
    #[repr(C)] struct DlInfo { name:*const c_char, base:*mut c_void, symbol:*const c_char, address:*mut c_void }
    #[cfg_attr(target_os="linux",link(name="dl"))]
    extern "C" { fn dladdr(address:*const c_void,info:*mut DlInfo)->c_int; fn dlopen(name:*const c_char,flags:c_int)->*mut c_void; fn dlsym(handle:*mut c_void,name:*const c_char)->*mut c_void; fn dlclose(handle:*mut c_void)->c_int; }
    const NOW:c_int=2;
    #[cfg(target_os="linux")] const NOLOAD:c_int=4;
    #[cfg(target_os="macos")] const NOLOAD:c_int=0x10;
    pub struct Module { handle:usize, base:usize }
    impl Module {
        pub unsafe fn from_anchor(anchor:*const c_void)->Option<Self> {
            let mut info:DlInfo=std::mem::zeroed();
            if anchor.is_null() || dladdr(anchor,&mut info)==0 || info.name.is_null() || info.base.is_null() {return None;}
            let handle=dlopen(info.name,NOW|NOLOAD);
            if handle.is_null(){return None;}
            let module=Self{handle:handle as usize,base:info.base as usize};
            if module.symbol(b"alive_session_state_v2\0")? != anchor.cast_mut(){return None;}
            Some(module)
        }
        pub unsafe fn symbol(&self,name:&[u8])->Option<*mut c_void> {
            let address=dlsym(self.handle as *mut c_void,name.as_ptr().cast());
            let mut info:DlInfo=std::mem::zeroed();
            if address.is_null() || dladdr(address,&mut info)==0 || info.base as usize!=self.base {None}else{Some(address)}
        }
    }
    impl Drop for Module {fn drop(&mut self){unsafe{dlclose(self.handle as *mut c_void);}}}
}

#[cfg(target_os="windows")]
mod platform {
    use super::*;
    #[link(name="kernel32")]
    extern "system" {fn GetModuleHandleExW(flags:u32,name:*const u16,handle:*mut *mut c_void)->i32;fn GetProcAddress(handle:*mut c_void,name:*const c_char)->*mut c_void;fn FreeLibrary(handle:*mut c_void)->i32;}
    pub struct Module {handle:usize}
    impl Module {
        pub unsafe fn from_anchor(anchor:*const c_void)->Option<Self>{
            let mut handle=std::ptr::null_mut();
            if anchor.is_null() || GetModuleHandleExW(4,anchor.cast(),&mut handle)==0 || handle.is_null(){return None;}
            let module=Self{handle:handle as usize};
            if module.symbol(b"alive_session_state_v2\0")? != anchor.cast_mut(){return None;}Some(module)
        }
        pub unsafe fn symbol(&self,name:&[u8])->Option<*mut c_void>{
            let address=GetProcAddress(self.handle as *mut c_void,name.as_ptr().cast());
            if address.is_null(){return None;}
            let mut owner=std::ptr::null_mut();
            if GetModuleHandleExW(4,address.cast(),&mut owner)==0 || owner.is_null(){return None;}
            let same=owner as usize==self.handle;FreeLibrary(owner);
            if same{Some(address)}else{None}
        }
    }
    impl Drop for Module {fn drop(&mut self){unsafe{FreeLibrary(self.handle as *mut c_void);}}}
}

#[cfg(test)]
mod tests {
    use super::*;
    #[link(name="ultra_native")]
    #[allow(clashing_extern_declarations)]
    extern "C" { fn alive_session_state_v2(state:*mut c_void) -> c_int; }
    #[test]
    fn resolves_the_loaded_native_image() {
        let anchor = alive_session_state_v2 as *const () as *const c_void;
        assert!(resolve(std::ptr::null()).is_none());
        assert_eq!(resolve(anchor).is_some(),std::env::var_os("ALIVE_MASTER_EXPECT_UNAVAILABLE").is_none());
    }
    #[test]
    fn reserves_a_pair_without_wrap_or_reuse() {
        let mut serials=Serials(u64::MAX-2);
        assert_eq!(serials.reserve_pair(),Some((u64::MAX-1,u64::MAX)));
        assert_eq!(serials.next(),None);
        let mut short=Serials(u64::MAX-1);
        assert_eq!(short.reserve_pair(),None);
        assert_eq!(short.0,u64::MAX-1);
    }
}
