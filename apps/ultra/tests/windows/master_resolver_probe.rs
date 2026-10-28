#![allow(dead_code)]
#[path = "../../src-tauri/src/session/native_master.rs"]
mod native_master;

use std::{ffi::{c_char, c_void}, path::{Path, PathBuf}, ptr};

#[link(name = "ultra_native")]
extern "C" { fn alive_session_state_v2(state: *mut c_void) -> i32; }
#[link(name = "kernel32")]
extern "system" {
    fn GetModuleHandleExW(flags: u32, address: *const u16, module: *mut *mut c_void) -> i32;
    fn GetModuleFileNameW(module: *mut c_void, path: *mut u16, size: u32) -> u32;
    fn GetProcAddress(module: *mut c_void, name: *const c_char) -> *mut c_void;
    fn FreeLibrary(module: *mut c_void) -> i32;
}

unsafe fn module_for(address: *const c_void) -> *mut c_void {
    let mut module = ptr::null_mut();
    assert!(!address.is_null() && GetModuleHandleExW(4, address.cast(), &mut module) != 0);
    assert!(!module.is_null());
    module
}
unsafe fn module_path(module: *mut c_void) -> PathBuf {
    let mut buf = [0u16; 32768];
    let len = GetModuleFileNameW(module, buf.as_mut_ptr(), buf.len() as u32) as usize;
    assert!(len > 0 && len < buf.len(), "module path unavailable or truncated");
    PathBuf::from(std::ffi::OsString::from_wide(&buf[..len]))
}
use std::os::windows::ffi::OsStringExt;

fn same_path(actual: &Path, expected: &Path) -> bool {
    std::fs::canonicalize(actual).unwrap() == std::fs::canonicalize(expected).unwrap()
}

fn main() {
    let args: Vec<_> = std::env::args_os().collect();
    assert_eq!(args.len(), 3, "probe <case> <expected DLL path>");
    let case = args[1].to_str().unwrap();
    assert!(["real", "full", "old", "partial", "forwarded", "bad_limits"].contains(&case));
    let anchor = alive_session_state_v2 as *const () as *const c_void;
    unsafe {
        let module = module_for(anchor);
        let path = module_path(module);
        println!("case={case} anchor={anchor:p} mapped={}", path.display());
        assert!(same_path(&path, Path::new(&args[2])), "unexpected anchor module");
        let exported = GetProcAddress(module, b"alive_session_state_v2\0".as_ptr().cast());
        assert_eq!(exported, anchor.cast_mut(), "anchor is not its module's export");
        let names: [&[u8]; 6] = [b"alive_session_master_limits\0", b"alive_session_master_set\0", b"alive_session_master_reset_clip\0", b"alive_session_master_snapshot_v2\0", b"alive_session_master_snapshot_v3\0", b"alive_session_master_snapshot_v4\0"];
        let mut symbols = Vec::new();
        for name in names {
            let address = GetProcAddress(module, name.as_ptr().cast());
            let label = std::str::from_utf8(&name[..name.len()-1]).unwrap();
            if address.is_null() {
                println!("symbol={label} missing");
            } else {
                let owner = module_for(address);
                let owner_path = module_path(owner);
                println!("symbol={label} owner={}", owner_path.display());
                if case == "forwarded" && label == "alive_session_master_set" {
                    let expected_target = Path::new(&args[2]).parent().unwrap().join("master_forward_target.dll");
                    assert_ne!(owner, module);
                    assert!(same_path(&owner_path, &expected_target));
                } else { assert_eq!(owner, module, "unexpected symbol owner for {label}"); }
                assert_ne!(FreeLibrary(owner), 0);
            }
            symbols.push(address);
        }
        let count = symbols.iter().filter(|p| !p.is_null()).count();
        assert_eq!(count, match case { "old" => 0, "partial" => 1, _ => 6 });
        if count == 6 {
            let get_limits: unsafe extern "C" fn(*mut native_master::Limits) -> i32 = std::mem::transmute(symbols[0]);
            let mut limits = native_master::Limits { version: 1, struct_bytes: std::mem::size_of::<native_master::Limits>() as u32, ..Default::default() };
            assert_eq!(get_limits(&mut limits), 1);
            println!("limits version={} bytes={} features={} ramp={} max_gain={}", limits.version, limits.struct_bytes, limits.features, limits.ramp_frames, limits.max_gain);
            assert_eq!((limits.version, limits.struct_bytes, limits.features, limits.ramp_frames), (1, 24, 7, 64));
            assert_eq!(limits.max_gain, if case == "bad_limits" { 3.0 } else { 4.0 });
        }
        let actual = native_master::resolve(anchor).is_some();
        let expected = case == "real" || case == "full";
        println!("resolve={actual} expected={expected}");
        assert_eq!(actual, expected);
        assert_ne!(FreeLibrary(module), 0);
    }
}
