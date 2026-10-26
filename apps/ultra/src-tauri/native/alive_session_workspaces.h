#pragma once
// Included by alive_session.h after the shared v2 POD declarations.
#define ALIVE_SESSION_V4_NONE UINT32_MAX
#define ALIVE_SESSION_V4_NO_FRAME UINT64_MAX
enum {
 ALIVE_SESSION_V4_RESULT_EMPTY=0, ALIVE_SESSION_V4_QUEUED=1,
 ALIVE_SESSION_V4_PENDING=2, ALIVE_SESSION_V4_APPLIED=3,
 ALIVE_SESSION_V4_REJECTED=4, ALIVE_SESSION_V4_SUPERSEDED=5,
 ALIVE_SESSION_V4_CANCELED=6, ALIVE_SESSION_V4_MIXED=7
};
enum {
 ALIVE_SESSION_V4_OK=0, ALIVE_SESSION_V4_BAD_HEADER=1,
 ALIVE_SESSION_V4_BAD_PROFILE=2, ALIVE_SESSION_V4_BAD_FIELD=3,
 ALIVE_SESSION_V4_BAD_OWNERSHIP=4, ALIVE_SESSION_V4_STALE_PREPARATION=5,
 ALIVE_SESSION_V4_STALE_REQUEST=6, ALIVE_SESSION_V4_QUEUE_FULL=7,
 ALIVE_SESSION_V4_RECEIPT_BUSY=8, ALIVE_SESSION_V4_EMPTY_SLOT=9,
 ALIVE_SESSION_V4_EVENT_FRAME_LIMIT=10,
 ALIVE_SESSION_V4_EVENT_WINDOW_LIMIT=11,
 ALIVE_SESSION_V4_WORK_LIMIT=12, ALIVE_SESSION_V4_STOP_CANCELED=13,
 ALIVE_SESSION_V4_END_CANCELED=14, ALIVE_SESSION_V4_FEATURE_DISABLED=15,
 ALIVE_SESSION_V4_RUNTIME_INVARIANT=16,
 ALIVE_SESSION_V4_GRAPH_REJECTED=17,
 ALIVE_SESSION_V4_REPLACED_REQUEST=18
};
enum {
 ALIVE_SESSION_V4_RESOURCE_NONE=0, ALIVE_SESSION_V4_RESOURCE_EVENTS=1,
 ALIVE_SESSION_V4_RESOURCE_ROOT_CLEARS=2,
 ALIVE_SESSION_V4_RESOURCE_EVENT_SCANS=3,
 ALIVE_SESSION_V4_RESOURCE_PARAMETER_WRITES=4,
 ALIVE_SESSION_V4_RESOURCE_GUARD_STEPS=5
};
enum { ALIVE_SESSION_V4_BAD_PLACEMENT=19, ALIVE_SESSION_V4_BAD_SOURCE=20,
 ALIVE_SESSION_V4_AUDIO_BOUNDS=21, ALIVE_SESSION_V4_AUDIO_DISABLED=22,
 ALIVE_SESSION_V4_RESOURCE_PLACEMENT_STEPS=6, ALIVE_SESSION_V4_RESOURCE_SAMPLE_READS=7 };
enum {
 ALIVE_SESSION_V4_VERSION=4,
 ALIVE_SESSION_V4_PROFILE_2X4=1, ALIVE_SESSION_V4_PROFILE_8X4=2,
 ALIVE_SESSION_V4_WORK_POLICY_1=1, ALIVE_SESSION_V4_WORK_POLICY_2=2,
 ALIVE_SESSION_V4_TRACKS=8, ALIVE_SESSION_V4_DEVICES=16,
 ALIVE_SESSION_V4_SOURCES=32, ALIVE_SESSION_V4_SLOTS=32,
 ALIVE_SESSION_V4_PLACEMENTS=64, ALIVE_SESSION_V4_AUDIO_BUFFERS=8,
 ALIVE_SESSION_V4_EVENTS=1024, ALIVE_SESSION_V4_RECEIPTS=128,
 ALIVE_SESSION_V4_MIDI=1, ALIVE_SESSION_V4_AUDIO=2,
 ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY=0,
 ALIVE_SESSION_V4_SESSION_AUTHORITY=1,
 ALIVE_SESSION_V4_NO_ACTION=0, ALIVE_SESSION_V4_LAUNCH=1,
 ALIVE_SESSION_V4_TRACK_STOP=2, ALIVE_SESSION_V4_RETURN=3,
 ALIVE_SESSION_V4_START=1, ALIVE_SESSION_V4_SEEK=2,
 ALIVE_SESSION_V4_TRACK_ACTIONS=3,
 ALIVE_SESSION_V4_FEATURE_ADMITTED=1,
 ALIVE_SESSION_V4_FEATURE_ATOMIC_TRACK_ACTIONS=2,
 ALIVE_SESSION_V4_FEATURE_ARRANGEMENT=4,
 ALIVE_SESSION_V4_FEATURE_AUDIO=8
};
typedef struct AliveSessionTrackV4 {
 uint32_t kind,instrument,effect_count,reserved;
 uint32_t effects[2],slots[4];
 uint32_t placement_begin,placement_count;
 double gain;
 uint32_t mute,solo;
} AliveSessionTrackV4;
typedef struct AliveSessionSourceV4 {
 uint32_t track,kind,event_begin,event_count;
 uint32_t lane_count,audio_buffer,reserved0,reserved1;
 uint64_t length_frames;
 uint32_t owned_masks[16];
} AliveSessionSourceV4;
typedef struct AliveSessionSlotV4 {
 uint32_t track,source,loop_enabled,reserved;
 uint64_t source_offset;
} AliveSessionSlotV4;
typedef struct AliveSessionPlacementV4 {
 uint32_t track,source,loop_enabled,reserved;
 uint64_t start_frame,duration_frames,source_offset;
} AliveSessionPlacementV4;
typedef struct AliveSessionAudioBufferV4 {
 uint32_t version,struct_bytes,channels,sample_rate;
 uint64_t frames,sample_count;
 const float* samples;             /* immutable interleaved normalized PCM */
 uint64_t reserved;
} AliveSessionAudioBufferV4;
typedef struct AliveSessionConfigV4 {
 uint32_t version,struct_bytes,profile,work_policy;
 uint32_t track_count,device_count,source_count,slot_count;
 uint32_t placement_count,event_count,audio_buffer_count,loop_enabled;
 uint64_t preparation_revision,length_frames,loop_start,loop_end;
 double tempo_bpm;
 AliveSessionTrackV4 tracks[8];
 AliveSessionDeviceV2 devices[16];
 AliveSessionSourceV4 sources[32];
 AliveSessionSlotV4 slots[32];
 AliveSessionPlacementV4 placements[64];
 AliveSessionEventV2 events[1024];
} AliveSessionConfigV4;
typedef struct AliveSessionTrackActionV4 { uint32_t action,slot; }
 AliveSessionTrackActionV4;
typedef struct AliveSessionRequestV4 {
 uint32_t version,struct_bytes,kind,track_mask;
 uint64_t preparation_revision,request_serial,position,reserved;
 AliveSessionTrackActionV4 tracks[8];
} AliveSessionRequestV4;
typedef struct AliveSessionReceiptV4 {
 uint32_t version,struct_bytes,status,error;
 uint64_t preparation_revision,request_serial,observed_frame,target_frame;
 uint32_t kind,track_mask,pending_mask,applied_mask;
 uint32_t superseded_mask,canceled_mask,rejected_mask,reserved;
} AliveSessionReceiptV4;
typedef struct AliveSessionWorkV4 {
 uint64_t root_clears,event_scans,parameter_writes,guard_steps;
 uint64_t placement_steps,sample_reads;
} AliveSessionWorkV4;
typedef struct AliveSessionLimitsV4 {
 uint32_t version,struct_bytes,profile,work_policy;
 uint32_t features,max_tracks,max_devices,max_sources;
 uint32_t max_slots,max_placements,max_audio_buffers,max_events;
 uint32_t max_frame_events,max_window_events,window_frames,max_commands;
 uint32_t max_receipts,sample_rate,min_loop_frames,reserved;
 uint64_t max_audio_frames,max_audio_bytes,max_audio_file_bytes;
 AliveSessionWorkV4 scheduled_frame,scheduled_window;
 AliveSessionWorkV4 optional_frame,optional_window,emergency;
 uint32_t max_sample_reads_frame,max_peak_bins;
} AliveSessionLimitsV4;
typedef struct AliveSessionDiagnosticV4 {
 uint32_t version,struct_bytes,error,resource;
 uint32_t track_mask,conservative,window_frames,reserved;
 uint64_t frame,observed,limit;
 uint32_t source[8],placement[8],contribution[8];
} AliveSessionDiagnosticV4;
typedef struct AliveSessionTrackStateV4 {
 AliveSessionTrackStateV2 mixer;
 uint32_t authority,active_slot,active_placement,active_source;
 uint32_t pending_action,pending_slot,reserved0,reserved1;
 uint64_t phase,track_epoch,pending_serial,pending_frame;
} AliveSessionTrackStateV4;
typedef struct AliveSessionStateV4 {
 uint32_t version,struct_bytes,configured,playing;
 uint32_t profile,work_policy,track_count,device_count;
 uint32_t source_count,slot_count,placement_count,audio_buffer_count;
 uint32_t fault,fault_resource,reserved0,reserved1;
 uint64_t absolute_frame,position,generation,rejected;
 uint64_t preparation_revision,last_consumed_request;
 uint64_t requested_stop_epoch,applied_stop_epoch,work_rejected,event_faults;
 double peak_left,peak_right;
 AliveSessionTrackStateV4 tracks[8];
 AliveSessionDeviceStateV2 devices[16];
 AliveSessionReceiptV4 receipts[128];
} AliveSessionStateV4;

int alive_session_limits_v4(uint32_t profile, AliveSessionLimitsV4*);
int alive_session_validate_v4(const AliveSessionConfigV4*);
int alive_session_validate_prepared_v4(const AliveSessionConfigV4*,
 const UltraCanvasGraph*,uint32_t graph_count,
 const AliveSessionAudioBufferV4*,uint32_t audio_count);
int alive_session_configure_v4(const AliveSessionConfigV4*,
 const AliveSessionAudioBufferV4*,uint32_t audio_count);
int alive_session_request_v4(const AliveSessionRequestV4*,
 AliveSessionReceiptV4* immediate);
uint64_t alive_session_stop_v4(void);
int alive_session_state_v4(AliveSessionStateV4*);
int alive_session_diagnostic_v4(AliveSessionDiagnosticV4*);
