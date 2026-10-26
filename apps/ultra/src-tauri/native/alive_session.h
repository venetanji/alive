#pragma once
#include <stdint.h>
#include "patch_graph.h"
#ifdef __cplusplus
extern "C" {
#endif
/* alive-session-v1. Serialized control calls; one audio callback owner.
 * configure/reset require stopped device I/O (ultra_audio_stop), not merely
 * stopped musical transport. Graphs are installed first with the canvas API.
 * No host alignment delay: native output is mixed on its exact event sample.
 * Schedule replacement is stop-device / configure / restart-device only.
 * Frame positions are integer, half-open; sort by frame, then termination
 * (note-off/sustain), automation, note-on. Limit 32 events/frame and 64 events
 * in every 1024-frame window, including repeated loop seams.
 * A full command queue rejects edits; stop has an independent safety mailbox. */
enum { ALIVE_SESSION_VERSION=1, ALIVE_SESSION_TRACKS=2,
 ALIVE_SESSION_PARAMETERS=16, ALIVE_SESSION_EVENTS=1024 };
enum { ALIVE_SESSION_SPEAKERS_MONO=1, ALIVE_SESSION_SPEAKERS_STEREO=2 };
enum { ALIVE_SESSION_NOTE_OFF=0, ALIVE_SESSION_AUTOMATION=1,
 ALIVE_SESSION_NOTE_ON=2, ALIVE_SESSION_SUSTAIN=3 };
typedef struct AliveSessionParameter {
 uint32_t node,param,automated,reserved;
 double base,minimum,maximum;
} AliveSessionParameter;
typedef struct AliveSessionTrack {
 uint32_t document,note_node,output_channels,parameter_count;
 uint32_t output_layout,reserved;
 uint64_t revision;
 double gain; /* Linear 0..4, independent of device parameters. */
 uint32_t mute,solo;
 AliveSessionParameter parameters[16];
} AliveSessionTrack;
typedef struct AliveSessionEvent {
 uint64_t frame;
 uint32_t track,kind,target,reserved; /* target: MIDI pitch or parameter index */
 double value; /* note velocity, automation value, or sustain 0/127 */
} AliveSessionEvent;
typedef struct AliveSessionConfig {
 uint32_t version,track_count,event_count,loop_enabled;
 uint64_t length_frames,loop_start,loop_end;
 AliveSessionTrack tracks[2];
 AliveSessionEvent events[1024];
} AliveSessionConfig;
typedef struct AliveSessionTrackState {
 double peak_left,peak_right,gain;
 uint32_t mute,solo,active_voices,reserved;
 double base[16],effective[16];
 uint32_t owned[16];
} AliveSessionTrackState;
typedef struct AliveSessionState {
 uint64_t absolute_frame,position,generation,rejected;
 uint32_t configured,playing,track_count,reserved;
 double peak_left,peak_right;
 AliveSessionTrackState tracks[2];
} AliveSessionState;
int alive_session_configure(const AliveSessionConfig* config);
int alive_session_validate(const AliveSessionConfig* config);
int alive_session_validate_graph(const AliveSessionTrack* track,const UltraCanvasGraph* graph);
/* graphs is a contiguous track_count array in track order; no installation. */
int alive_session_validate_prepared(const AliveSessionConfig* config,const UltraCanvasGraph* graphs,uint32_t count);
int alive_session_reset(void);
int alive_session_start(void);
void alive_session_stop(void);
int alive_session_seek(uint64_t position);
int alive_session_base(uint32_t track,uint32_t parameter,double value);
int alive_session_mixer(uint32_t track,double gain,uint32_t mute,uint32_t solo);
int alive_session_state(AliveSessionState* state);
const char* alive_session_error(void);
/* Separate v2 wire profile. Chain entries and event.device index devices;
 * live base/bypass edits authenticate the installed document/revision handle.
 * Bypass selects same-frame dry output while the wet kernel keeps advancing. */
enum { ALIVE_SESSION_V2_VERSION=2, ALIVE_SESSION_V2_TRACKS=2,
 ALIVE_SESSION_V2_DEVICES=6, ALIVE_SESSION_V2_EFFECTS=2,
 ALIVE_SESSION_DEVICE_INSTRUMENT=1, ALIVE_SESSION_DEVICE_AUDIO_EFFECT=2 };
typedef struct AliveSessionDeviceV2 {
 uint32_t document,kind,note_node,input_node;
 uint32_t input_channels,input_layout,output_channels,output_layout;
 uint32_t parameter_count,bypassed,reserved0,reserved1;
 uint64_t revision;
 AliveSessionParameter parameters[16];
} AliveSessionDeviceV2;
typedef struct AliveSessionTrackV2 {
 uint32_t instrument,effect_count,effects[2];
 double gain;
 uint32_t mute,solo;
} AliveSessionTrackV2;
typedef struct AliveSessionEventV2 {
 uint64_t frame;
 uint32_t track,kind,device,target;
 double value;
} AliveSessionEventV2;
typedef struct AliveSessionConfigV2 {
 uint32_t version,struct_bytes,track_count,device_count;
 uint32_t event_count,loop_enabled,reserved0,reserved1;
 uint64_t length_frames,loop_start,loop_end;
 AliveSessionTrackV2 tracks[2];
 AliveSessionDeviceV2 devices[6];
 AliveSessionEventV2 events[1024];
} AliveSessionConfigV2;
typedef struct AliveSessionTrackStateV2 {
 double peak_left,peak_right,gain;
 uint32_t mute,solo,active_voices,reserved;
} AliveSessionTrackStateV2;
typedef struct AliveSessionDeviceStateV2 {
 uint32_t document,bypassed,parameter_count,reserved;
 uint64_t revision;
 double base[16],effective[16];
 uint32_t owned[16];
} AliveSessionDeviceStateV2;
typedef struct AliveSessionStateV2 {
 uint32_t version,struct_bytes;
 uint64_t absolute_frame,position,generation,rejected;
 uint32_t configured,playing,track_count,device_count;
 double peak_left,peak_right;
 AliveSessionTrackStateV2 tracks[2];
 AliveSessionDeviceStateV2 devices[6];
} AliveSessionStateV2;
int alive_session_validate_v2(const AliveSessionConfigV2*);
int alive_session_validate_device_v2(const AliveSessionDeviceV2*,const UltraCanvasGraph*);
int alive_session_validate_prepared_v2(const AliveSessionConfigV2*,const UltraCanvasGraph*,uint32_t count);
int alive_session_configure_v2(const AliveSessionConfigV2*);
int alive_session_base_v2(uint32_t document,uint64_t revision,uint32_t parameter,double value);
int alive_session_bypass_v2(uint32_t document,uint64_t revision,uint32_t bypassed);
int alive_session_state_v2(AliveSessionStateV2*);
/* Fixed clip-bank storage; profile admission is queried separately. */
enum {
 ALIVE_SESSION_V3_VERSION=3,
 ALIVE_SESSION_V3_TRACKS=8, ALIVE_SESSION_V3_DEVICES=16,
 ALIVE_SESSION_V3_CLIPS=32, ALIVE_SESSION_V3_SLOTS=4,
 ALIVE_SESSION_V3_RECEIPTS=128,
 ALIVE_SESSION_V3_PROFILE_2X4=1, ALIVE_SESSION_V3_PROFILE_8X4=2,
 ALIVE_SESSION_V3_WORK_POLICY_1=1, ALIVE_SESSION_V3_WORK_POLICY_2=2
};
#define ALIVE_SESSION_V3_NONE UINT32_MAX
#define ALIVE_SESSION_V3_NO_FRAME UINT64_MAX
enum {
 ALIVE_SESSION_V3_START=1, ALIVE_SESSION_V3_SEEK=2,
 ALIVE_SESSION_V3_TRACK_ACTIONS=3
};
enum {
 ALIVE_SESSION_V3_NO_ACTION=0, ALIVE_SESSION_V3_LAUNCH=1,
 ALIVE_SESSION_V3_TRACK_STOP=2
};
enum {
 ALIVE_SESSION_V3_RESULT_EMPTY=0, ALIVE_SESSION_V3_QUEUED=1,
 ALIVE_SESSION_V3_PENDING=2, ALIVE_SESSION_V3_APPLIED=3,
 ALIVE_SESSION_V3_REJECTED=4, ALIVE_SESSION_V3_SUPERSEDED=5,
 ALIVE_SESSION_V3_CANCELED=6, ALIVE_SESSION_V3_MIXED=7
};
enum {
 ALIVE_SESSION_V3_OK=0, ALIVE_SESSION_V3_BAD_HEADER=1,
 ALIVE_SESSION_V3_BAD_PROFILE=2, ALIVE_SESSION_V3_BAD_FIELD=3,
 ALIVE_SESSION_V3_BAD_OWNERSHIP=4, ALIVE_SESSION_V3_STALE_PREPARATION=5,
 ALIVE_SESSION_V3_STALE_REQUEST=6, ALIVE_SESSION_V3_QUEUE_FULL=7,
 ALIVE_SESSION_V3_RECEIPT_BUSY=8, ALIVE_SESSION_V3_EMPTY_SLOT=9,
 ALIVE_SESSION_V3_EVENT_FRAME_LIMIT=10,
 ALIVE_SESSION_V3_EVENT_WINDOW_LIMIT=11,
 ALIVE_SESSION_V3_WORK_LIMIT=12, ALIVE_SESSION_V3_STOP_CANCELED=13,
 ALIVE_SESSION_V3_END_CANCELED=14, ALIVE_SESSION_V3_FEATURE_DISABLED=15,
 ALIVE_SESSION_V3_RUNTIME_INVARIANT=16,
 ALIVE_SESSION_V3_GRAPH_REJECTED=17,
 ALIVE_SESSION_V3_REPLACED_REQUEST=18
};
enum {
 ALIVE_SESSION_V3_RESOURCE_NONE=0, ALIVE_SESSION_V3_RESOURCE_EVENTS=1,
 ALIVE_SESSION_V3_RESOURCE_ROOT_CLEARS=2,
 ALIVE_SESSION_V3_RESOURCE_EVENT_SCANS=3,
 ALIVE_SESSION_V3_RESOURCE_PARAMETER_WRITES=4,
 ALIVE_SESSION_V3_RESOURCE_GUARD_STEPS=5
};
enum {
 ALIVE_SESSION_V3_FEATURE_ADMITTED=1,
 ALIVE_SESSION_V3_FEATURE_ATOMIC_TRACK_ACTIONS=2
};

typedef struct AliveSessionTrackV3 {
 AliveSessionTrackV2 chain;
 uint32_t slots[4], initial_clip, reserved;
} AliveSessionTrackV3;

typedef struct AliveSessionClipV3 {
 uint32_t track, event_begin, event_count, lane_count;
 uint64_t length_frames;
 uint32_t owned_masks[16];
} AliveSessionClipV3;

typedef struct AliveSessionConfigV3 {
 uint32_t version, struct_bytes, profile, work_policy;
 uint32_t track_count, device_count, clip_count, event_count;
 uint32_t loop_enabled, reserved;
 uint64_t preparation_revision, length_frames;
 double tempo_bpm;
 AliveSessionTrackV3 tracks[8];
 AliveSessionDeviceV2 devices[16];
 AliveSessionClipV3 clips[32];
 AliveSessionEventV2 events[1024];
} AliveSessionConfigV3;

typedef struct AliveSessionTrackActionV3 {
 uint32_t action, slot;
} AliveSessionTrackActionV3;

typedef struct AliveSessionRequestV3 {
 uint32_t version, struct_bytes, kind, track_mask;
 uint64_t preparation_revision, request_serial, position, reserved;
 AliveSessionTrackActionV3 tracks[8];
} AliveSessionRequestV3;

typedef struct AliveSessionReceiptV3 {
 uint32_t version, struct_bytes, status, error;
 uint64_t preparation_revision, request_serial, observed_frame, target_frame;
 uint32_t kind, track_mask, pending_mask, applied_mask;
 uint32_t superseded_mask, canceled_mask, rejected_mask, reserved;
} AliveSessionReceiptV3;

typedef struct AliveSessionWorkV3 {
 uint64_t root_clears, event_scans, parameter_writes, guard_steps;
} AliveSessionWorkV3;

typedef struct AliveSessionLimitsV3 {
 uint32_t version, struct_bytes, profile, work_policy;
 uint32_t features, max_tracks, max_devices, max_clips;
 uint32_t max_events, max_frame_events, max_window_events, window_frames;
 uint32_t max_commands, max_receipts, reserved0, reserved1;
 AliveSessionWorkV3 scheduled_frame, scheduled_window;
 AliveSessionWorkV3 optional_frame, optional_window, emergency;
} AliveSessionLimitsV3;

typedef struct AliveSessionDiagnosticV3 {
 uint32_t version, struct_bytes, error, resource;
 uint32_t track_mask, conservative, window_frames, reserved;
 uint64_t frame, observed, limit;
 uint32_t clip[8], contribution[8];
} AliveSessionDiagnosticV3;

typedef struct AliveSessionTrackStateV3 {
 AliveSessionTrackStateV2 mixer;
 uint32_t active_clip, pending_action, pending_clip, reserved;
 uint64_t phase, track_epoch, pending_serial, pending_frame;
} AliveSessionTrackStateV3;

typedef struct AliveSessionStateV3 {
 uint32_t version, struct_bytes, configured, playing;
 uint32_t profile, work_policy, track_count, device_count;
 uint32_t clip_count, fault, fault_resource, reserved;
 uint64_t absolute_frame, position, generation, rejected;
 uint64_t preparation_revision, last_consumed_request;
 uint64_t requested_stop_epoch, applied_stop_epoch;
 uint64_t work_rejected, event_faults;
 double peak_left, peak_right;
 AliveSessionTrackStateV3 tracks[8];
 AliveSessionDeviceStateV2 devices[16];
 AliveSessionReceiptV3 receipts[128];
} AliveSessionStateV3;

int alive_session_limits_v3(uint32_t profile, AliveSessionLimitsV3*);
int alive_session_validate_v3(const AliveSessionConfigV3*);
int alive_session_validate_prepared_v3(const AliveSessionConfigV3*,
                                      const UltraCanvasGraph*, uint32_t count);
int alive_session_configure_v3(const AliveSessionConfigV3*);
int alive_session_request_v3(const AliveSessionRequestV3*,
                             AliveSessionReceiptV3* immediate);
uint64_t alive_session_stop_v3(void);
int alive_session_state_v3(AliveSessionStateV3*);
int alive_session_diagnostic_v3(AliveSessionDiagnosticV3*);
#include "alive_session_workspaces.h"
#ifdef __cplusplus
}
#endif
