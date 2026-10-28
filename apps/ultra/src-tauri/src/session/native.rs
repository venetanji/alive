//! POD interface shared with native/alive_session.h. Calls are control-serialized.
#![allow(dead_code)] // V1 layouts remain available for cross-ABI regression checks.
use crate::canvas::NativeGraph;
use serde::Serialize;
use std::ffi::{c_char, CStr};

#[cfg(not(all(test, target_os="windows")))]
pub(super) fn master_capability() -> Option<&'static super::native_master::Capability> {
    static CAPABILITY: std::sync::OnceLock<Option<super::native_master::Capability>> = std::sync::OnceLock::new();
    CAPABILITY.get_or_init(|| super::native_master::resolve(alive_session_state_v2 as *const () as *const std::ffi::c_void)).as_ref()
}

#[cfg(all(test, target_os="windows"))]
pub(super) fn master_capability() -> Option<&'static super::native_master::Capability> {
    static CAPABILITY: std::sync::OnceLock<Option<super::native_master::Capability>> = std::sync::OnceLock::new();
    #[cfg(all(test, target_os="windows"))]
    if std::env::var_os("ALIVE_MASTER_DIAGNOSTIC_CHILD").is_some() {
        println!("cache: before={:?} thread={:?}",CAPABILITY.get().map(|value| value.is_some()),std::thread::current().id());
    }
    let result=CAPABILITY.get_or_init(|| {
        let anchor=alive_session_state_v2 as *const () as *const std::ffi::c_void;
        #[cfg(all(test, target_os="windows"))]
        if std::env::var_os("ALIVE_MASTER_DIAGNOSTIC_CHILD").is_some() {
            println!("cache: initializer_enter anchor={anchor:p} thread={:?}",std::thread::current().id());
        }
        let resolved=super::native_master::resolve(anchor);
        #[cfg(all(test, target_os="windows"))]
        if std::env::var_os("ALIVE_MASTER_DIAGNOSTIC_CHILD").is_some() {
            println!("cache: initializer_result={}",resolved.is_some());
        }
        resolved
    }).as_ref();
    #[cfg(all(test, target_os="windows"))]
    if std::env::var_os("ALIVE_MASTER_DIAGNOSTIC_CHILD").is_some() {
        println!("cache: return={}",result.is_some());
    }
    result
}

#[cfg(all(test, target_os="windows"))]
pub(super) fn master_test_anchor() -> *const std::ffi::c_void {
    alive_session_state_v2 as *const () as *const std::ffi::c_void
}

#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct Parameter {
    pub node: u32, pub param: u32, pub automated: u32, pub reserved: u32,
    pub base: f64, pub minimum: f64, pub maximum: f64,
}
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct Track {
    pub document: u32, pub note_node: u32, pub output_channels: u32, pub parameter_count: u32,
    pub output_layout: u32, pub reserved: u32, pub revision: u64,
    pub gain: f64, pub mute: u32, pub solo: u32, pub parameters: [Parameter; 16],
}
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct Event {
    pub frame: u64, pub track: u32, pub kind: u32, pub target: u32, pub reserved: u32, pub value: f64,
}
#[repr(C)]
pub struct Config {
    pub version: u32, pub track_count: u32, pub event_count: u32, pub loop_enabled: u32,
    pub length_frames: u64, pub loop_start: u64, pub loop_end: u64,
    pub tracks: [Track; 2], pub events: [Event; 1024],
}
impl Default for Config {
    fn default() -> Self {
        Self { version: 1, track_count: 0, event_count: 0, loop_enabled: 0,
            length_frames: 0, loop_start: 0, loop_end: 0,
            tracks: [Track::default(); 2], events: [Event::default(); 1024] }
    }
}
#[repr(C)]
#[derive(Clone, Copy, Default, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackState {
    pub peak_left: f64, pub peak_right: f64, pub gain: f64,
    pub mute: u32, pub solo: u32, pub active_voices: u32, pub reserved: u32,
    pub base: [f64; 16], pub effective: [f64; 16], pub owned: [u32; 16],
}
#[repr(C)]
#[derive(Clone, Copy, Default, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct State {
    pub absolute_frame: u64, pub position: u64, pub generation: u64, pub rejected: u64,
    pub configured: u32, pub playing: u32, pub track_count: u32, pub reserved: u32,
    pub peak_left: f64, pub peak_right: f64, pub tracks: [TrackState; 2],
}

extern "C" {
    pub fn alive_session_validate_graph(track: *const Track, graph: *const NativeGraph) -> i32;
    pub fn alive_session_validate_prepared(config: *const Config, graphs: *const NativeGraph, count: u32) -> i32;
    pub fn alive_session_configure(config: *const Config) -> i32;
    pub fn alive_session_reset() -> i32;
    pub fn alive_session_start() -> i32;
    pub fn alive_session_stop();
    pub fn alive_session_seek(position: u64) -> i32;
    pub fn alive_session_base(track: u32, parameter: u32, value: f64) -> i32;
    pub fn alive_session_mixer(track: u32, gain: f64, mute: u32, solo: u32) -> i32;
    pub fn alive_session_state(state: *mut State) -> i32;
    fn alive_session_error() -> *const c_char;
    pub fn ultra_external_start() -> i32;
    pub fn ultra_external_render(frames: u32, left: *mut f32, right: *mut f32) -> i32;
    pub fn ultra_audio_stop();
}
pub fn error() -> String {
    unsafe { CStr::from_ptr(alive_session_error()).to_string_lossy().into_owned() }
}
pub fn state() -> Result<StateV2, String> {
    let mut state = StateV2::default();
    if unsafe { alive_session_state_v2(&mut state) } == 0 { return Err("Session state is temporarily unavailable".into()); }
    Ok(state)
}
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct DeviceV2 {
    pub document: u32, pub kind: u32, pub note_node: u32, pub input_node: u32,
    pub input_channels: u32, pub input_layout: u32, pub output_channels: u32, pub output_layout: u32,
    pub parameter_count: u32, pub bypassed: u32, pub reserved0: u32, pub reserved1: u32,
    pub revision: u64, pub parameters: [Parameter; 16],
}
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct TrackV2 { pub instrument: u32, pub effect_count: u32, pub effects: [u32; 2], pub gain: f64, pub mute: u32, pub solo: u32 }
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct EventV2 { pub frame: u64, pub track: u32, pub kind: u32, pub device: u32, pub target: u32, pub value: f64 }
#[repr(C)]
pub struct ConfigV2 {
    pub version: u32, pub struct_bytes: u32, pub track_count: u32, pub device_count: u32,
    pub event_count: u32, pub loop_enabled: u32, pub reserved0: u32, pub reserved1: u32,
    pub length_frames: u64, pub loop_start: u64, pub loop_end: u64,
    pub tracks: [TrackV2; 2], pub devices: [DeviceV2; 6], pub events: [EventV2; 1024],
}
impl Default for ConfigV2 {
    fn default() -> Self { Self { version: 2, struct_bytes: std::mem::size_of::<Self>() as u32, track_count: 0, device_count: 0, event_count: 0, loop_enabled: 0,
        reserved0: 0, reserved1: 0, length_frames: 0, loop_start: 0, loop_end: 0, tracks: [TrackV2::default(); 2], devices: [DeviceV2::default(); 6], events: [EventV2::default(); 1024] } }
}
#[repr(C)]
#[derive(Clone, Copy, Default, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackStateV2 { pub peak_left: f64, pub peak_right: f64, pub gain: f64, pub mute: u32, pub solo: u32, pub active_voices: u32, pub reserved: u32 }
#[repr(C)]
#[derive(Clone, Copy, Default, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceStateV2 { pub document: u32, pub bypassed: u32, pub parameter_count: u32, pub reserved: u32, pub revision: u64,
    pub base: [f64; 16], pub effective: [f64; 16], pub owned: [u32; 16] }
#[repr(C)]
#[derive(Clone, Copy, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StateV2 {
    pub version: u32, pub struct_bytes: u32, pub absolute_frame: u64, pub position: u64, pub generation: u64, pub rejected: u64,
    pub configured: u32, pub playing: u32, pub track_count: u32, pub device_count: u32,
    pub peak_left: f64, pub peak_right: f64, pub tracks: [TrackStateV2; 2], pub devices: [DeviceStateV2; 6],
}
impl Default for StateV2 {
    fn default() -> Self { Self { version: 2, struct_bytes: std::mem::size_of::<Self>() as u32, absolute_frame: 0, position: 0, generation: 0, rejected: 0,
        configured: 0, playing: 0, track_count: 0, device_count: 0, peak_left: 0., peak_right: 0., tracks: [TrackStateV2::default(); 2], devices: [DeviceStateV2::default(); 6] } }
}
extern "C" {
    pub fn alive_session_validate_v2(config: *const ConfigV2) -> i32;
    pub fn alive_session_validate_device_v2(device: *const DeviceV2, graph: *const NativeGraph) -> i32;
    pub fn alive_session_validate_prepared_v2(config: *const ConfigV2, graphs: *const NativeGraph, count: u32) -> i32;
    pub fn alive_session_configure_v2(config: *const ConfigV2) -> i32;
    pub fn alive_session_base_v2(document: u32, revision: u64, parameter: u32, value: f64) -> i32;
    pub fn alive_session_bypass_v2(document: u32, revision: u64, bypassed: u32) -> i32;
    pub fn alive_session_state_v2(state: *mut StateV2) -> i32;
}

// Fixed v3 ABI. Desktop activation and saved-format migration are separate.
pub const V3_VERSION: u32 = 3;
pub const V3_TRACKS: u32 = 8;
pub const V3_DEVICES: u32 = 16;
pub const V3_CLIPS: u32 = 32;
pub const V3_SLOTS: u32 = 4;
pub const V3_RECEIPTS: u32 = 128;
pub const V3_PROFILE_2X4: u32 = 1;
pub const V3_PROFILE_8X4: u32 = 2;
pub const V3_WORK_POLICY_1: u32 = 1;
pub const V3_WORK_POLICY_2: u32 = 2;
pub const V3_START: u32 = 1;
pub const V3_SEEK: u32 = 2;
pub const V3_TRACK_ACTIONS: u32 = 3;
pub const V3_NO_ACTION: u32 = 0;
pub const V3_LAUNCH: u32 = 1;
pub const V3_TRACK_STOP: u32 = 2;
pub const V3_RESULT_EMPTY: u32 = 0;
pub const V3_QUEUED: u32 = 1;
pub const V3_PENDING: u32 = 2;
pub const V3_APPLIED: u32 = 3;
pub const V3_REJECTED: u32 = 4;
pub const V3_SUPERSEDED: u32 = 5;
pub const V3_CANCELED: u32 = 6;
pub const V3_MIXED: u32 = 7;
pub const V3_OK: u32 = 0;
pub const V3_BAD_HEADER: u32 = 1;
pub const V3_BAD_PROFILE: u32 = 2;
pub const V3_BAD_FIELD: u32 = 3;
pub const V3_BAD_OWNERSHIP: u32 = 4;
pub const V3_STALE_PREPARATION: u32 = 5;
pub const V3_STALE_REQUEST: u32 = 6;
pub const V3_QUEUE_FULL: u32 = 7;
pub const V3_RECEIPT_BUSY: u32 = 8;
pub const V3_EMPTY_SLOT: u32 = 9;
pub const V3_EVENT_FRAME_LIMIT: u32 = 10;
pub const V3_EVENT_WINDOW_LIMIT: u32 = 11;
pub const V3_WORK_LIMIT: u32 = 12;
pub const V3_STOP_CANCELED: u32 = 13;
pub const V3_END_CANCELED: u32 = 14;
pub const V3_FEATURE_DISABLED: u32 = 15;
pub const V3_RUNTIME_INVARIANT: u32 = 16;
pub const V3_GRAPH_REJECTED: u32 = 17;
pub const V3_REPLACED_REQUEST: u32 = 18;
pub const V3_RESOURCE_NONE: u32 = 0;
pub const V3_RESOURCE_EVENTS: u32 = 1;
pub const V3_RESOURCE_ROOT_CLEARS: u32 = 2;
pub const V3_RESOURCE_EVENT_SCANS: u32 = 3;
pub const V3_RESOURCE_PARAMETER_WRITES: u32 = 4;
pub const V3_RESOURCE_GUARD_STEPS: u32 = 5;
pub const V3_FEATURE_ADMITTED: u32 = 1;
pub const V3_FEATURE_ATOMIC_TRACK_ACTIONS: u32 = 2;
pub const V3_NONE: u32 = u32::MAX;
pub const V3_NO_FRAME: u64 = u64::MAX;
#[repr(C)]
#[derive(Clone, Copy)]
pub struct TrackV3 {
    pub chain: TrackV2,
    pub slots: [u32; 4],
    pub initial_clip: u32,
    pub reserved: u32,
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct ClipV3 {
    pub track: u32,
    pub event_begin: u32,
    pub event_count: u32,
    pub lane_count: u32,
    pub length_frames: u64,
    pub owned_masks: [u32; 16],
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct ConfigV3 {
    pub version: u32,
    pub struct_bytes: u32,
    pub profile: u32,
    pub work_policy: u32,
    pub track_count: u32,
    pub device_count: u32,
    pub clip_count: u32,
    pub event_count: u32,
    pub loop_enabled: u32,
    pub reserved: u32,
    pub preparation_revision: u64,
    pub length_frames: u64,
    pub tempo_bpm: f64,
    pub tracks: [TrackV3; 8],
    pub devices: [DeviceV2; 16],
    pub clips: [ClipV3; 32],
    pub events: [EventV2; 1024],
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct TrackActionV3 {
    pub action: u32,
    pub slot: u32,
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct RequestV3 {
    pub version: u32,
    pub struct_bytes: u32,
    pub kind: u32,
    pub track_mask: u32,
    pub preparation_revision: u64,
    pub request_serial: u64,
    pub position: u64,
    pub reserved: u64,
    pub tracks: [TrackActionV3; 8],
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct ReceiptV3 {
    pub version: u32,
    pub struct_bytes: u32,
    pub status: u32,
    pub error: u32,
    pub preparation_revision: u64,
    pub request_serial: u64,
    pub observed_frame: u64,
    pub target_frame: u64,
    pub kind: u32,
    pub track_mask: u32,
    pub pending_mask: u32,
    pub applied_mask: u32,
    pub superseded_mask: u32,
    pub canceled_mask: u32,
    pub rejected_mask: u32,
    pub reserved: u32,
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct WorkV3 {
    pub root_clears: u64,
    pub event_scans: u64,
    pub parameter_writes: u64,
    pub guard_steps: u64,
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct LimitsV3 {
    pub version: u32,
    pub struct_bytes: u32,
    pub profile: u32,
    pub work_policy: u32,
    pub features: u32,
    pub max_tracks: u32,
    pub max_devices: u32,
    pub max_clips: u32,
    pub max_events: u32,
    pub max_frame_events: u32,
    pub max_window_events: u32,
    pub window_frames: u32,
    pub max_commands: u32,
    pub max_receipts: u32,
    pub reserved0: u32,
    pub reserved1: u32,
    pub scheduled_frame: WorkV3,
    pub scheduled_window: WorkV3,
    pub optional_frame: WorkV3,
    pub optional_window: WorkV3,
    pub emergency: WorkV3,
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct DiagnosticV3 {
    pub version: u32,
    pub struct_bytes: u32,
    pub error: u32,
    pub resource: u32,
    pub track_mask: u32,
    pub conservative: u32,
    pub window_frames: u32,
    pub reserved: u32,
    pub frame: u64,
    pub observed: u64,
    pub limit: u64,
    pub clip: [u32; 8],
    pub contribution: [u32; 8],
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct TrackStateV3 {
    pub mixer: TrackStateV2,
    pub active_clip: u32,
    pub pending_action: u32,
    pub pending_clip: u32,
    pub reserved: u32,
    pub phase: u64,
    pub track_epoch: u64,
    pub pending_serial: u64,
    pub pending_frame: u64,
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct StateV3 {
    pub version: u32,
    pub struct_bytes: u32,
    pub configured: u32,
    pub playing: u32,
    pub profile: u32,
    pub work_policy: u32,
    pub track_count: u32,
    pub device_count: u32,
    pub clip_count: u32,
    pub fault: u32,
    pub fault_resource: u32,
    pub reserved: u32,
    pub absolute_frame: u64,
    pub position: u64,
    pub generation: u64,
    pub rejected: u64,
    pub preparation_revision: u64,
    pub last_consumed_request: u64,
    pub requested_stop_epoch: u64,
    pub applied_stop_epoch: u64,
    pub work_rejected: u64,
    pub event_faults: u64,
    pub peak_left: f64,
    pub peak_right: f64,
    pub tracks: [TrackStateV3; 8],
    pub devices: [DeviceStateV2; 16],
    pub receipts: [ReceiptV3; 128],
}
impl Default for TrackV3 {
    fn default() -> Self {
        // Every field is numeric POD; all-zero is a valid Rust representation.
        let value: Self = unsafe { std::mem::zeroed() };
        value
    }
}
impl Default for ClipV3 {
    fn default() -> Self {
        // Every field is numeric POD; all-zero is a valid Rust representation.
        let value: Self = unsafe { std::mem::zeroed() };
        value
    }
}
impl Default for ConfigV3 {
    fn default() -> Self {
        // Every field is numeric POD; all-zero is a valid Rust representation.
        let mut value: Self = unsafe { std::mem::zeroed() };
        value.version = 3;
        value.struct_bytes = std::mem::size_of::<Self>() as u32;
        value
    }
}
impl Default for TrackActionV3 {
    fn default() -> Self {
        // Every field is numeric POD; all-zero is a valid Rust representation.
        let value: Self = unsafe { std::mem::zeroed() };
        value
    }
}
impl Default for RequestV3 {
    fn default() -> Self {
        // Every field is numeric POD; all-zero is a valid Rust representation.
        let mut value: Self = unsafe { std::mem::zeroed() };
        value.version = 3;
        value.struct_bytes = std::mem::size_of::<Self>() as u32;
        value
    }
}
impl Default for ReceiptV3 {
    fn default() -> Self {
        // Every field is numeric POD; all-zero is a valid Rust representation.
        let mut value: Self = unsafe { std::mem::zeroed() };
        value.version = 3;
        value.struct_bytes = std::mem::size_of::<Self>() as u32;
        value
    }
}
impl Default for WorkV3 {
    fn default() -> Self {
        // Every field is numeric POD; all-zero is a valid Rust representation.
        let value: Self = unsafe { std::mem::zeroed() };
        value
    }
}
impl Default for LimitsV3 {
    fn default() -> Self {
        // Every field is numeric POD; all-zero is a valid Rust representation.
        let mut value: Self = unsafe { std::mem::zeroed() };
        value.version = 3;
        value.struct_bytes = std::mem::size_of::<Self>() as u32;
        value
    }
}
pub fn clip_limits(profile: u32) -> Result<LimitsV3, String> {
    let mut limits = LimitsV3::default();
    let expected = match profile {
        V3_PROFILE_2X4 => (V3_WORK_POLICY_1, 2, 6, 8),
        V3_PROFILE_8X4 => (V3_WORK_POLICY_2, 8, 16, 32),
        _ => return Err("Unknown native clip profile".into()),
    };
    if unsafe { alive_session_limits_v3(profile, &mut limits) } == 0
        || limits.features & V3_FEATURE_ADMITTED == 0 || limits.profile != profile
        || (limits.work_policy, limits.max_tracks, limits.max_devices, limits.max_clips) != expected
    { return Err("The requested native clip profile is not admitted".into()); }
    Ok(limits)
}
pub fn clip_capacity() -> Result<LimitsV3, String> {
    clip_limits(V3_PROFILE_8X4).or_else(|_| clip_limits(V3_PROFILE_2X4))
}
impl Default for DiagnosticV3 {
    fn default() -> Self {
        // Every field is numeric POD; all-zero is a valid Rust representation.
        let mut value: Self = unsafe { std::mem::zeroed() };
        value.version = 3;
        value.struct_bytes = std::mem::size_of::<Self>() as u32;
        value
    }
}
impl Default for TrackStateV3 {
    fn default() -> Self {
        // Every field is numeric POD; all-zero is a valid Rust representation.
        let value: Self = unsafe { std::mem::zeroed() };
        value
    }
}
impl Default for StateV3 {
    fn default() -> Self {
        // Every field is numeric POD; all-zero is a valid Rust representation.
        let mut value: Self = unsafe { std::mem::zeroed() };
        value.version = 3;
        value.struct_bytes = std::mem::size_of::<Self>() as u32;
        value
    }
}
extern "C" {
    pub fn alive_session_limits_v3(profile: u32, limits: *mut LimitsV3) -> i32;
    pub fn alive_session_validate_v3(config: *const ConfigV3) -> i32;
    pub fn alive_session_validate_prepared_v3(
        config: *const ConfigV3,
        graphs: *const NativeGraph,
        count: u32,
    ) -> i32;
    pub fn alive_session_configure_v3(config: *const ConfigV3) -> i32;
    pub fn alive_session_request_v3(request: *const RequestV3, immediate: *mut ReceiptV3) -> i32;
    pub fn alive_session_stop_v3() -> u64;
    pub fn alive_session_state_v3(state: *mut StateV3) -> i32;
    pub fn alive_session_diagnostic_v3(diagnostic: *mut DiagnosticV3) -> i32;
}

#[path = "native_v4.rs"]
mod native_v4;
#[allow(unused_imports)] // The additive ABI is not wired into Document until Task 2D.
pub use native_v4::*;
