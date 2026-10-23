//! Cocoa termination protection for the locked Tao 0.34.8 delegate.
//!
//! Muda's predefined Quit sends `terminate:`; Tao's applicationWillTerminate
//! emits LoopDestroyed/Exit without ExitRequested. NSApplication consults
//! applicationShouldTerminate: first. Add that method on a *private subclass
//! of this delegate instance*, preserving Tao's ivars, lifetime, and inherited
//! methods. Never swizzle Tao's shared class or applicationWillTerminate.
//!
//! Source/API checked against pinned crates; macOS GUI execution is required
//! to validate the complete Cocoa menu / Dock / Cmd-Q interaction.
use std::{ffi::{c_char, c_void, CStr}, sync::OnceLock};
use tauri::AppHandle;

type Object = *mut c_void;
type Class = *mut c_void;
type Selector = *const c_void;
type Terminate = unsafe extern "C" fn(Object, Selector, Object) -> usize;
static APP: OnceLock<AppHandle> = OnceLock::new();
static ORIGINAL: OnceLock<Option<Terminate>> = OnceLock::new();

#[link(name = "objc")]
extern "C" {
    fn objc_getClass(name: *const c_char) -> Class;
    fn object_getClass(object: Object) -> Class;
    fn object_setClass(object: Object, class: Class) -> Class;
    fn class_getName(class: Class) -> *const c_char;
    fn objc_allocateClassPair(superclass: Class, name: *const c_char, extra: usize) -> Class;
    fn objc_registerClassPair(class: Class);
    fn objc_disposeClassPair(class: Class);
    fn class_addMethod(class: Class, selector: Selector, implementation: *const c_void, types: *const c_char) -> bool;
    fn class_getInstanceMethod(class: Class, selector: Selector) -> *mut c_void;
    fn method_getImplementation(method: *mut c_void) -> *const c_void;
    fn sel_registerName(name: *const c_char) -> Selector;
    fn objc_msgSend();
}

unsafe extern "C" fn should_terminate(delegate: Object, selector: Selector, sender: Object) -> usize {
    // Never unwind through Cocoa. On error keep documents and the process alive.
    std::panic::catch_unwind(|| {
        let Some(app) = APP.get() else { return 0; };
        if !super::native_termination_requested(app) { return 0; }
        match ORIGINAL.get().copied().flatten() {
            Some(original) => unsafe { original(delegate, selector, sender) },
            None => 1, // NSTerminateNow: Cocoa's default when no delegate method exists.
        }
    }).unwrap_or(0)
}

// Shared by the live installer and the macOS-only runtime/ABI regression below.
// The added subclass has no ivars; superclass layout and behavior are inherited.
unsafe fn guarded_subclass(superclass: Class, name: &CStr) -> Result<(Class, Option<Terminate>), String> {
    let selector = sel_registerName(c"applicationShouldTerminate:".as_ptr());
    let method = class_getInstanceMethod(superclass, selector);
    let original = if method.is_null() { None } else {
        Some(std::mem::transmute::<*const c_void, Terminate>(method_getImplementation(method)))
    };
    let subclass = objc_allocateClassPair(superclass, name.as_ptr(), 0);
    if subclass.is_null() { return Err("Cannot allocate guarded termination delegate".into()); }
    // NSApplicationTerminateReply wraps NSUInteger on both supported 64-bit Macs.
    if !class_addMethod(subclass, selector, should_terminate as *const c_void, c"Q@:@".as_ptr()) {
        objc_disposeClassPair(subclass);
        return Err("Cannot install guarded application termination method".into());
    }
    objc_registerClassPair(subclass);
    Ok((subclass, original))
}

/// Must run on the main thread during Tauri setup, after Tao installs its delegate.
pub fn install(app: &AppHandle) -> Result<(), String> {
    if APP.get().is_some() { return Ok(()); }
    unsafe {
        let send: unsafe extern "C" fn(Object, Selector) -> Object = std::mem::transmute(objc_msgSend as *const ());
        let application_class = objc_getClass(c"NSApplication".as_ptr());
        if application_class.is_null() { return Err("NSApplication class is unavailable".into()); }
        let application = send(application_class, sel_registerName(c"sharedApplication".as_ptr()));
        let delegate = send(application, sel_registerName(c"delegate".as_ptr()));
        if delegate.is_null() { return Err("Cannot protect Quit: application delegate is unavailable".into()); }
        let superclass = object_getClass(delegate);
        if CStr::from_ptr(class_getName(superclass)).to_bytes() != b"TaoAppDelegateParent" {
            return Err("Cannot protect Quit: unexpected application delegate class".into());
        }
        let (subclass, original) = guarded_subclass(superclass, c"UltraGuardedTerminationDelegate")?;
        let _ = ORIGINAL.set(original);
        let _ = APP.set(app.clone());
        object_setClass(delegate, subclass);
        // Refresh any optional-delegate-selector cache in NSApplication while
        // retaining Tao's same, already-owned delegate instance.
        let set_delegate: unsafe extern "C" fn(Object, Selector, Object) = std::mem::transmute(objc_msgSend as *const ());
        set_delegate(application, sel_registerName(c"setDelegate:".as_ptr()), delegate);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    extern "C" {
        fn class_addIvar(class: Class, name: *const c_char, size: usize, alignment: u8, types: *const c_char) -> bool;
        fn class_getInstanceSize(class: Class) -> usize;
        fn class_getInstanceVariable(class: Class, name: *const c_char) -> *mut c_void;
        fn ivar_getOffset(ivar: *mut c_void) -> isize;
    }
    unsafe extern "C" fn original_reply(_: Object, _: Selector, _: Object) -> usize { 7 }

    // Pure Objective-C runtime exercise: no NSApplication, windows, Tauri
    // runtime, dialogs, or synthetic AppHandle. Run this on both Mac CI targets.
    #[test]
    fn private_delegate_subclass_guards_only_its_instance_and_preserves_layout() {
        unsafe {
            assert!(APP.get().is_none());
            let superclass = objc_getClass(c"NSObject".as_ptr());
            assert!(!superclass.is_null());
            let fixture = objc_allocateClassPair(superclass, c"UltraQuitDelegateRuntimeFixture".as_ptr(), 0);
            assert!(!fixture.is_null());
            let selector = sel_registerName(c"applicationShouldTerminate:".as_ptr());
            assert!(class_addMethod(fixture, selector, original_reply as *const c_void, c"Q@:@".as_ptr()));
            assert!(class_addIvar(fixture, c"retainedMarker".as_ptr(), std::mem::size_of::<usize>(), 3, c"Q".as_ptr()));
            objc_registerClassPair(fixture);
            let send: unsafe extern "C" fn(Object, Selector) -> Object = std::mem::transmute(objc_msgSend as *const ());
            let hooked = send(send(fixture, sel_registerName(c"alloc".as_ptr())), sel_registerName(c"init".as_ptr()));
            let untouched = send(send(fixture, sel_registerName(c"alloc".as_ptr())), sel_registerName(c"init".as_ptr()));
            let offset = ivar_getOffset(class_getInstanceVariable(fixture, c"retainedMarker".as_ptr()));
            let marker = hooked.cast::<u8>().offset(offset).cast::<usize>();
            marker.write(0x1234_5678);
            let (subclass, original) = guarded_subclass(fixture, c"UltraQuitDelegateRuntimeFixtureGuarded").unwrap();
            assert_eq!(original.unwrap()(hooked, selector, std::ptr::null_mut()), 7);
            assert_eq!(class_getInstanceSize(subclass), class_getInstanceSize(fixture));
            object_setClass(hooked, subclass);
            let terminate: Terminate = std::mem::transmute(objc_msgSend as *const ());
            assert_eq!(terminate(hooked, selector, std::ptr::null_mut()), 0, "unset APP must conservatively cancel termination");
            assert_eq!(terminate(untouched, selector, std::ptr::null_mut()), 7, "another delegate instance must retain its original method");
            assert_eq!(object_getClass(untouched), fixture);
            assert_eq!(marker.read(), 0x1234_5678, "subclassing must preserve Tao's inherited ivar storage");
            let release: unsafe extern "C" fn(Object, Selector) = std::mem::transmute(objc_msgSend as *const ());
            release(hooked, sel_registerName(c"release".as_ptr()));
            release(untouched, sel_registerName(c"release".as_ptr()));
        }
    }
}
