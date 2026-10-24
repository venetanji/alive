//! POD interface shared with native/alive_session.h. Calls are control-serialized.
#![allow(dead_code)] // V1 layouts remain available for cross-ABI regression checks.
use crate::canvas::NativeGraph;
use serde::Serialize;
use std::ffi::{c_char, CStr};

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
