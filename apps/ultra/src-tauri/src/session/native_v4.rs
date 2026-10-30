//! Additive workspace ABI; capability admission is independent of POD validation.
use super::{DeviceStateV2, DeviceV2, EventV2, NativeGraph, TrackStateV2};
pub const V4_RESULT_EMPTY: u32 = 0;
pub const V4_QUEUED: u32 = 1;
pub const V4_PENDING: u32 = 2;
pub const V4_APPLIED: u32 = 3;
pub const V4_REJECTED: u32 = 4;
pub const V4_SUPERSEDED: u32 = 5;
pub const V4_CANCELED: u32 = 6;
pub const V4_MIXED: u32 = 7;
pub const V4_OK: u32 = 0;
pub const V4_BAD_HEADER: u32 = 1;
pub const V4_BAD_PROFILE: u32 = 2;
pub const V4_BAD_FIELD: u32 = 3;
pub const V4_BAD_OWNERSHIP: u32 = 4;
pub const V4_STALE_PREPARATION: u32 = 5;
pub const V4_STALE_REQUEST: u32 = 6;
pub const V4_QUEUE_FULL: u32 = 7;
pub const V4_RECEIPT_BUSY: u32 = 8;
pub const V4_EMPTY_SLOT: u32 = 9;
pub const V4_EVENT_FRAME_LIMIT: u32 = 10;
pub const V4_EVENT_WINDOW_LIMIT: u32 = 11;
pub const V4_WORK_LIMIT: u32 = 12;
pub const V4_STOP_CANCELED: u32 = 13;
pub const V4_END_CANCELED: u32 = 14;
pub const V4_FEATURE_DISABLED: u32 = 15;
pub const V4_RUNTIME_INVARIANT: u32 = 16;
pub const V4_GRAPH_REJECTED: u32 = 17;
pub const V4_REPLACED_REQUEST: u32 = 18;
pub const V4_RESOURCE_NONE: u32 = 0;
pub const V4_RESOURCE_EVENTS: u32 = 1;
pub const V4_RESOURCE_ROOT_CLEARS: u32 = 2;
pub const V4_RESOURCE_EVENT_SCANS: u32 = 3;
pub const V4_RESOURCE_PARAMETER_WRITES: u32 = 4;
pub const V4_RESOURCE_GUARD_STEPS: u32 = 5;
pub const V4_BAD_PLACEMENT: u32 = 19;
pub const V4_BAD_SOURCE: u32 = 20;
pub const V4_AUDIO_BOUNDS: u32 = 21;
pub const V4_AUDIO_DISABLED: u32 = 22;
pub const V4_RESOURCE_PLACEMENT_STEPS: u32 = 6;
pub const V4_RESOURCE_SAMPLE_READS: u32 = 7;
pub const V4_VERSION: u32 = 4;
pub const V4_PROFILE_2X4: u32 = 1;
pub const V4_PROFILE_8X4: u32 = 2;
pub const V4_WORK_POLICY_1: u32 = 1;
pub const V4_WORK_POLICY_2: u32 = 2;
pub const V4_TRACKS: u32 = 8;
pub const V4_DEVICES: u32 = 16;
pub const V4_SOURCES: u32 = 32;
pub const V4_SLOTS: u32 = 32;
pub const V4_PLACEMENTS: u32 = 64;
pub const V4_AUDIO_BUFFERS: u32 = 8;
pub const V4_EVENTS: u32 = 1024;
pub const V4_RECEIPTS: u32 = 128;
pub const V4_MIDI: u32 = 1;
pub const V4_AUDIO: u32 = 2;
pub const V4_ARRANGEMENT_AUTHORITY: u32 = 0;
pub const V4_SESSION_AUTHORITY: u32 = 1;
pub const V4_NO_ACTION: u32 = 0;
pub const V4_LAUNCH: u32 = 1;
pub const V4_TRACK_STOP: u32 = 2;
pub const V4_RETURN: u32 = 3;
pub const V4_START: u32 = 1;
pub const V4_SEEK: u32 = 2;
pub const V4_TRACK_ACTIONS: u32 = 3;
pub const V4_FEATURE_ADMITTED: u32 = 1;
pub const V4_FEATURE_ATOMIC_TRACK_ACTIONS: u32 = 2;
pub const V4_FEATURE_ARRANGEMENT: u32 = 4;
pub const V4_FEATURE_AUDIO: u32 = 8;
pub const V4_NONE: u32 = u32::MAX;
pub const V4_NO_FRAME: u64 = u64::MAX;
#[repr(C)]
#[derive(Clone, Copy)]
pub struct TrackV4 {
    pub kind: u32,
    pub instrument: u32,
    pub effect_count: u32,
    pub reserved: u32,
    pub effects: [u32; 2],
    pub slots: [u32; 4],
    pub placement_begin: u32,
    pub placement_count: u32,
    pub gain: f64,
    pub mute: u32,
    pub solo: u32,
}
impl Default for TrackV4 {
    fn default() -> Self {
        // All fields are scalars, arrays of POD, or a nullable borrowed pointer.
        #[allow(unused_mut)]
        let mut value: Self = unsafe { std::mem::zeroed() };
        value.kind = 1;
        value.slots = [V4_NONE; 4];
        value.gain = 1.;
        value
    }
}
#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct SourceV4 {
    pub track: u32,
    pub kind: u32,
    pub event_begin: u32,
    pub event_count: u32,
    pub lane_count: u32,
    pub audio_buffer: u32,
    pub reserved0: u32,
    pub reserved1: u32,
    pub length_frames: u64,
    pub owned_masks: [u32; 16],
}
impl Default for SourceV4 {
    fn default() -> Self {
        // All fields are scalars, arrays of POD, or a nullable borrowed pointer.
        #[allow(unused_mut)]
        let mut value: Self = unsafe { std::mem::zeroed() };
        value.kind = 1;
        value.audio_buffer = V4_NONE;
        value
    }
}
#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct SlotV4 {
    pub track: u32,
    pub source: u32,
    pub loop_enabled: u32,
    pub reserved: u32,
    pub start_marker: u64,
    pub end_marker: u64,
    pub loop_start: u64,
    pub loop_end: u64,
}
impl Default for SlotV4 {
    fn default() -> Self {
        // All fields are scalars, arrays of POD, or a nullable borrowed pointer.
        #[allow(unused_mut)]
        let mut value: Self = unsafe { std::mem::zeroed() };
        value
    }
}
#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct PlacementV4 {
    pub track: u32,
    pub source: u32,
    pub loop_enabled: u32,
    pub reserved: u32,
    pub start_frame: u64,
    pub duration_frames: u64,
    pub start_marker: u64,
    pub end_marker: u64,
    pub loop_start: u64,
    pub loop_end: u64,
}
impl Default for PlacementV4 {
    fn default() -> Self {
        // All fields are scalars, arrays of POD, or a nullable borrowed pointer.
        #[allow(unused_mut)]
        let mut value: Self = unsafe { std::mem::zeroed() };
        value
    }
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct AudioBufferV4 {
    pub version: u32,
    pub struct_bytes: u32,
    pub channels: u32,
    pub sample_rate: u32,
    pub frames: u64,
    pub sample_count: u64,
    pub samples: *const f32,
    pub reserved: u64,
}
impl Default for AudioBufferV4 {
    fn default() -> Self {
        // All fields are scalars, arrays of POD, or a nullable borrowed pointer.
        #[allow(unused_mut)]
        let mut value: Self = unsafe { std::mem::zeroed() };
        value.version = 4;
        value.struct_bytes = std::mem::size_of::<Self>() as u32;
        value
    }
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct ConfigV4 {
    pub version: u32,
    pub struct_bytes: u32,
    pub profile: u32,
    pub work_policy: u32,
    pub track_count: u32,
    pub device_count: u32,
    pub source_count: u32,
    pub slot_count: u32,
    pub placement_count: u32,
    pub event_count: u32,
    pub audio_buffer_count: u32,
    pub loop_enabled: u32,
    pub preparation_revision: u64,
    pub length_frames: u64,
    pub loop_start: u64,
    pub loop_end: u64,
    pub tempo_bpm: f64,
    pub tracks: [TrackV4; 8],
    pub devices: [DeviceV2; 16],
    pub sources: [SourceV4; 32],
    pub slots: [SlotV4; 32],
    pub placements: [PlacementV4; 64],
    pub events: [EventV2; 1024],
}
impl Default for ConfigV4 {
    fn default() -> Self {
        // All fields are scalars, arrays of POD, or a nullable borrowed pointer.
        #[allow(unused_mut)]
        let mut value: Self = unsafe { std::mem::zeroed() };
        value.version = 4;
        value.struct_bytes = std::mem::size_of::<Self>() as u32;
        value
    }
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct TrackActionV4 {
    pub action: u32,
    pub slot: u32,
}
impl Default for TrackActionV4 {
    fn default() -> Self {
        // All fields are scalars, arrays of POD, or a nullable borrowed pointer.
        #[allow(unused_mut)]
        let mut value: Self = unsafe { std::mem::zeroed() };
        value
    }
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct RequestV4 {
    pub version: u32,
    pub struct_bytes: u32,
    pub kind: u32,
    pub track_mask: u32,
    pub preparation_revision: u64,
    pub request_serial: u64,
    pub position: u64,
    pub reserved: u64,
    pub tracks: [TrackActionV4; 8],
}
impl Default for RequestV4 {
    fn default() -> Self {
        // All fields are scalars, arrays of POD, or a nullable borrowed pointer.
        #[allow(unused_mut)]
        let mut value: Self = unsafe { std::mem::zeroed() };
        value.version = 4;
        value.struct_bytes = std::mem::size_of::<Self>() as u32;
        value
    }
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct ReceiptV4 {
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
impl Default for ReceiptV4 {
    fn default() -> Self {
        // All fields are scalars, arrays of POD, or a nullable borrowed pointer.
        #[allow(unused_mut)]
        let mut value: Self = unsafe { std::mem::zeroed() };
        value.version = 4;
        value.struct_bytes = std::mem::size_of::<Self>() as u32;
        value.observed_frame = V4_NO_FRAME;
        value.target_frame = V4_NO_FRAME;
        value
    }
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct WorkV4 {
    pub root_clears: u64,
    pub event_scans: u64,
    pub parameter_writes: u64,
    pub guard_steps: u64,
    pub placement_steps: u64,
    pub sample_reads: u64,
}
impl Default for WorkV4 {
    fn default() -> Self {
        // All fields are scalars, arrays of POD, or a nullable borrowed pointer.
        #[allow(unused_mut)]
        let mut value: Self = unsafe { std::mem::zeroed() };
        value
    }
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct LimitsV4 {
    pub version: u32,
    pub struct_bytes: u32,
    pub profile: u32,
    pub work_policy: u32,
    pub features: u32,
    pub max_tracks: u32,
    pub max_devices: u32,
    pub max_sources: u32,
    pub max_slots: u32,
    pub max_placements: u32,
    pub max_audio_buffers: u32,
    pub max_events: u32,
    pub max_frame_events: u32,
    pub max_window_events: u32,
    pub window_frames: u32,
    pub max_commands: u32,
    pub max_receipts: u32,
    pub sample_rate: u32,
    pub min_loop_frames: u32,
    pub reserved: u32,
    pub max_audio_frames: u64,
    pub max_audio_bytes: u64,
    pub max_audio_file_bytes: u64,
    pub scheduled_frame: WorkV4,
    pub scheduled_window: WorkV4,
    pub optional_frame: WorkV4,
    pub optional_window: WorkV4,
    pub emergency: WorkV4,
    pub max_sample_reads_frame: u32,
    pub max_peak_bins: u32,
}
impl Default for LimitsV4 {
    fn default() -> Self {
        // All fields are scalars, arrays of POD, or a nullable borrowed pointer.
        #[allow(unused_mut)]
        let mut value: Self = unsafe { std::mem::zeroed() };
        value.version = 4;
        value.struct_bytes = std::mem::size_of::<Self>() as u32;
        value
    }
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct DiagnosticV4 {
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
    pub source: [u32; 8],
    pub placement: [u32; 8],
    pub contribution: [u32; 8],
}
impl Default for DiagnosticV4 {
    fn default() -> Self {
        // All fields are scalars, arrays of POD, or a nullable borrowed pointer.
        #[allow(unused_mut)]
        let mut value: Self = unsafe { std::mem::zeroed() };
        value.version = 4;
        value.struct_bytes = std::mem::size_of::<Self>() as u32;
        value.frame = V4_NO_FRAME;
        value.source = [V4_NONE; 8];
        value.placement = [V4_NONE; 8];
        value
    }
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct TrackStateV4 {
    pub mixer: TrackStateV2,
    pub authority: u32,
    pub active_slot: u32,
    pub active_placement: u32,
    pub active_source: u32,
    pub pending_action: u32,
    pub pending_slot: u32,
    pub reserved0: u32,
    pub reserved1: u32,
    pub phase: u64,
    pub track_epoch: u64,
    pub pending_serial: u64,
    pub pending_frame: u64,
}
impl Default for TrackStateV4 {
    fn default() -> Self {
        // All fields are scalars, arrays of POD, or a nullable borrowed pointer.
        #[allow(unused_mut)]
        let mut value: Self = unsafe { std::mem::zeroed() };
        value.active_slot = V4_NONE;
        value.active_source = V4_NONE;
        value.active_placement = V4_NONE;
        value.pending_slot = V4_NONE;
        value.pending_frame = V4_NO_FRAME;
        value
    }
}
#[repr(C)]
#[derive(Clone, Copy)]
pub struct StateV4 {
    pub version: u32,
    pub struct_bytes: u32,
    pub configured: u32,
    pub playing: u32,
    pub profile: u32,
    pub work_policy: u32,
    pub track_count: u32,
    pub device_count: u32,
    pub source_count: u32,
    pub slot_count: u32,
    pub placement_count: u32,
    pub audio_buffer_count: u32,
    pub fault: u32,
    pub fault_resource: u32,
    pub reserved0: u32,
    pub reserved1: u32,
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
    pub tracks: [TrackStateV4; 8],
    pub devices: [DeviceStateV2; 16],
    pub receipts: [ReceiptV4; 128],
    pub bank_revision: u64,
}
impl Default for StateV4 {
    fn default() -> Self {
        // All fields are scalars, arrays of POD, or a nullable borrowed pointer.
        #[allow(unused_mut)]
        let mut value: Self = unsafe { std::mem::zeroed() };
        value.version = 4;
        value.struct_bytes = std::mem::size_of::<Self>() as u32;
        value.tracks = [TrackStateV4::default(); 8];
        value.receipts = [ReceiptV4::default(); 128];
        value
    }
}
extern "C" {
    pub fn alive_session_limits_v4(profile: u32, out: *mut LimitsV4) -> i32;
    pub fn alive_session_validate_v4(config: *const ConfigV4) -> i32;
    pub fn alive_session_validate_prepared_v4(
        config: *const ConfigV4,
        graphs: *const NativeGraph,
        graph_count: u32,
        audio: *const AudioBufferV4,
        audio_count: u32,
    ) -> i32;
    pub fn alive_session_configure_v4(
        config: *const ConfigV4,
        audio: *const AudioBufferV4,
        audio_count: u32,
    ) -> i32;
    pub fn alive_session_request_v4(request: *const RequestV4, immediate: *mut ReceiptV4) -> i32;
    pub fn alive_session_stop_v4() -> u64;
    pub fn alive_session_state_v4(out: *mut StateV4) -> i32;
    pub fn alive_session_diagnostic_v4(out: *mut DiagnosticV4) -> i32;
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::mem::{align_of, offset_of, size_of};
    #[test]
    fn defaults_initialize_headers_and_active_record_sentinels() {
        let config = ConfigV4::default();
        assert_eq!(
            (config.version, config.struct_bytes),
            (4, size_of::<ConfigV4>() as u32)
        );
        assert_eq!(config.track_count, 0);
        assert_eq!(config.tracks[0].kind, 0);
        assert_eq!(TrackV4::default().slots, [V4_NONE; 4]);
        assert_eq!(SourceV4::default().audio_buffer, V4_NONE);
        let state = StateV4::default();
        assert_eq!(state.tracks[0].active_source, V4_NONE);
        assert_eq!(state.tracks[0].active_placement, V4_NONE);
        assert_eq!(state.tracks[0].pending_frame, V4_NO_FRAME);
        assert_eq!(state.receipts[127].version, 4);
        assert_eq!(state.receipts[127].target_frame, V4_NO_FRAME);
    }
    #[test]
    fn exact_v4_layout() {
        assert_eq!(size_of::<TrackV4>(), 64);
        assert_eq!(align_of::<TrackV4>(), 8);
        assert_eq!(offset_of!(TrackV4, effects), 16);
        assert_eq!(offset_of!(TrackV4, slots), 24);
        assert_eq!(offset_of!(TrackV4, placement_begin), 40);
        assert_eq!(offset_of!(TrackV4, gain), 48);
        assert_eq!(size_of::<SourceV4>(), 104);
        assert_eq!(align_of::<SourceV4>(), 8);
        assert_eq!(offset_of!(SourceV4, length_frames), 32);
        assert_eq!(offset_of!(SourceV4, owned_masks), 40);
        assert_eq!(size_of::<SlotV4>(), 48);
        assert_eq!(align_of::<SlotV4>(), 8);
        assert_eq!(offset_of!(SlotV4, start_marker), 16);
        assert_eq!(size_of::<PlacementV4>(), 64);
        assert_eq!(align_of::<PlacementV4>(), 8);
        assert_eq!(offset_of!(PlacementV4, start_frame), 16);
        assert_eq!(offset_of!(PlacementV4, duration_frames), 24);
        assert_eq!(offset_of!(PlacementV4, start_marker), 32);
        assert_eq!(size_of::<AudioBufferV4>(), 48);
        assert_eq!(align_of::<AudioBufferV4>(), 8);
        assert_eq!(offset_of!(AudioBufferV4, frames), 16);
        assert_eq!(offset_of!(AudioBufferV4, sample_count), 24);
        assert_eq!(offset_of!(AudioBufferV4, samples), 32);
        assert_eq!(offset_of!(AudioBufferV4, reserved), 40);
        assert_eq!(size_of::<ConfigV4>(), 53464);
        assert_eq!(align_of::<ConfigV4>(), 8);
        assert_eq!(offset_of!(ConfigV4, preparation_revision), 48);
        assert_eq!(offset_of!(ConfigV4, tempo_bpm), 80);
        assert_eq!(offset_of!(ConfigV4, tracks), 88);
        assert_eq!(offset_of!(ConfigV4, devices), 600);
        assert_eq!(offset_of!(ConfigV4, sources), 11736);
        assert_eq!(offset_of!(ConfigV4, slots), 15064);
        assert_eq!(offset_of!(ConfigV4, placements), 16600);
        assert_eq!(offset_of!(ConfigV4, events), 20696);
        assert_eq!(size_of::<TrackActionV4>(), 8);
        assert_eq!(align_of::<TrackActionV4>(), 4);
        assert_eq!(offset_of!(TrackActionV4, slot), 4);
        assert_eq!(size_of::<RequestV4>(), 112);
        assert_eq!(align_of::<RequestV4>(), 8);
        assert_eq!(offset_of!(RequestV4, preparation_revision), 16);
        assert_eq!(offset_of!(RequestV4, tracks), 48);
        assert_eq!(size_of::<ReceiptV4>(), 80);
        assert_eq!(align_of::<ReceiptV4>(), 8);
        assert_eq!(offset_of!(ReceiptV4, preparation_revision), 16);
        assert_eq!(offset_of!(ReceiptV4, kind), 48);
        assert_eq!(offset_of!(ReceiptV4, reserved), 76);
        assert_eq!(size_of::<WorkV4>(), 48);
        assert_eq!(align_of::<WorkV4>(), 8);
        assert_eq!(offset_of!(WorkV4, placement_steps), 32);
        assert_eq!(offset_of!(WorkV4, sample_reads), 40);
        assert_eq!(size_of::<LimitsV4>(), 352);
        assert_eq!(align_of::<LimitsV4>(), 8);
        assert_eq!(offset_of!(LimitsV4, max_audio_frames), 80);
        assert_eq!(offset_of!(LimitsV4, scheduled_frame), 104);
        assert_eq!(offset_of!(LimitsV4, emergency), 296);
        assert_eq!(offset_of!(LimitsV4, max_sample_reads_frame), 344);
        assert_eq!(size_of::<DiagnosticV4>(), 152);
        assert_eq!(align_of::<DiagnosticV4>(), 8);
        assert_eq!(offset_of!(DiagnosticV4, frame), 32);
        assert_eq!(offset_of!(DiagnosticV4, source), 56);
        assert_eq!(offset_of!(DiagnosticV4, placement), 88);
        assert_eq!(offset_of!(DiagnosticV4, contribution), 120);
        assert_eq!(size_of::<TrackStateV4>(), 104);
        assert_eq!(align_of::<TrackStateV4>(), 8);
        assert_eq!(offset_of!(TrackStateV4, authority), 40);
        assert_eq!(offset_of!(TrackStateV4, pending_action), 56);
        assert_eq!(offset_of!(TrackStateV4, phase), 72);
        assert_eq!(size_of::<StateV4>(), 16744);
        assert_eq!(offset_of!(StateV4, bank_revision), 16736);
        assert_eq!(align_of::<StateV4>(), 8);
        assert_eq!(offset_of!(StateV4, absolute_frame), 64);
        assert_eq!(offset_of!(StateV4, peak_left), 144);
        assert_eq!(offset_of!(StateV4, tracks), 160);
        assert_eq!(offset_of!(StateV4, devices), 992);
        assert_eq!(offset_of!(StateV4, receipts), 6496);
    }
}
