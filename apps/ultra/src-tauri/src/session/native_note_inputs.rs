//! Independently versioned, control-thread note capability ABI. Status 0 is OK.
use super::{AudioBufferV4, ConfigV4};
use crate::canvas::NativeGraph;
use std::ffi::{c_char, c_void};

pub const NOTE_INPUTS_V1: u32 = 1;
pub const NOTE_NONE: u32 = 0;
pub const NOTE_POLY: u32 = 1;
pub const NOTE_NATIVE: u32 = 2;
pub const NOTE_POLICY_BUILT_IN: u32 = 0;
pub const NOTE_POLICY_NATIVE: u32 = 1;
pub const NOTE_FEATURE_NATIVE_ADMITTED: u32 = 1;

#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct NoteInputV1 {
    pub device: u32,
    pub document: u32,
    pub note_node: u32,
    pub kind: u32,
    pub profile_version: u32,
    pub policy: u32,
    pub revision: u64,
    pub profile: [c_char; 64],
    pub dll_sha256: [u8; 32],
}
impl Default for NoteInputV1 {
    fn default() -> Self {
        Self {
            device: 0,
            document: 0,
            note_node: 0,
            kind: 0,
            profile_version: 0,
            policy: 0,
            revision: 0,
            profile: [0; 64],
            dll_sha256: [0; 32],
        }
    }
}
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct NoteInputsV1 {
    pub version: u32,
    pub struct_bytes: u32,
    pub count: u32,
    pub reserved: u32,
    pub preparation_revision: u64,
    pub inputs: [NoteInputV1; 16],
}
impl Default for NoteInputsV1 {
    fn default() -> Self {
        Self {
            version: 1,
            struct_bytes: std::mem::size_of::<Self>() as u32,
            count: 0,
            reserved: 0,
            preparation_revision: 0,
            inputs: [NoteInputV1::default(); 16],
        }
    }
}
#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct NoteLimitsV1 {
    pub version: u32,
    pub struct_bytes: u32,
    pub workspace_profile: u32,
    pub features: u32,
    pub native_policy: u32,
    pub max_native_roots: u32,
    pub held_keys: u32,
    pub midi_records_per_sample: u32,
    pub emergency_note_records: u32,
    pub supported_native_features: u32,
    pub reserved0: u32,
    pub reserved1: u32,
}
impl Default for NoteLimitsV1 {
    fn default() -> Self {
        Self {
            version: 1,
            struct_bytes: std::mem::size_of::<Self>() as u32,
            workspace_profile: 0,
            features: 0,
            native_policy: 0,
            max_native_roots: 0,
            held_keys: 0,
            midi_records_per_sample: 0,
            emergency_note_records: 0,
            supported_native_features: 0,
            reserved0: 0,
            reserved1: 0,
        }
    }
}
// Layout of existing UltraPreparedDocumentV1. Sources point at existing
// UltraLiveDeviceSource rows; this declaration adds no ownership or ABI fields.
#[repr(C)]
pub struct NotePreparedDocumentV1 {
    pub struct_bytes: u32,
    pub document: u32,
    pub graph: *const NativeGraph,
    pub sources: *const c_void,
    pub source_count: u32,
    pub reserved: u32,
}
extern "C" {
    pub fn alive_session_note_limits_v1(profile: u32, limits: *mut NoteLimitsV1) -> i32;
    pub fn alive_session_validate_prepared_notes_v1(
        config: *const ConfigV4,
        documents: *const NotePreparedDocumentV1,
        count: u32,
        audio: *const AudioBufferV4,
        audio_count: u32,
        notes: *const NoteInputsV1,
    ) -> i32;
    pub fn alive_session_configure_notes_v1(
        config: *const ConfigV4,
        audio: *const AudioBufferV4,
        audio_count: u32,
        notes: *const NoteInputsV1,
    ) -> i32;
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::mem::{align_of, offset_of, size_of};
    #[test]
    fn note_companion_layout_matches_c() {
        assert_eq!(
            (size_of::<NoteInputV1>(), align_of::<NoteInputV1>()),
            (128, 8)
        );
        assert_eq!(offset_of!(NoteInputV1, revision), 24);
        assert_eq!(offset_of!(NoteInputV1, profile), 32);
        assert_eq!(offset_of!(NoteInputV1, dll_sha256), 96);
        assert_eq!(size_of::<NoteInputsV1>(), 2072);
        assert_eq!(offset_of!(NoteInputsV1, preparation_revision), 16);
        assert_eq!(offset_of!(NoteInputsV1, inputs), 24);
        assert_eq!(size_of::<NoteLimitsV1>(), 48);
        assert_eq!(size_of::<NotePreparedDocumentV1>(), 32);
        assert_eq!(offset_of!(NotePreparedDocumentV1, graph), 8);
        assert_eq!(offset_of!(NotePreparedDocumentV1, sources), 16);
    }
    #[test]
    fn limits_report_closed_native_policy_with_explicit_status() {
        let _guard = crate::tests::NATIVE_FFI_TEST_LOCK.lock().unwrap();
        let mut limits = NoteLimitsV1::default();
        assert_eq!(unsafe { alive_session_note_limits_v1(1, &mut limits) }, 0);
        assert_eq!(
            (
                limits.features,
                limits.max_native_roots,
                limits.supported_native_features
            ),
            (0, 0, 0)
        );
        assert_eq!(
            (
                limits.held_keys,
                limits.midi_records_per_sample,
                limits.emergency_note_records
            ),
            (4, 16, 4)
        );
        assert_eq!(unsafe { alive_session_note_limits_v1(99, &mut limits) }, 2);
        limits.struct_bytes -= 1;
        assert_eq!(unsafe { alive_session_note_limits_v1(1, &mut limits) }, 1);
    }
}
