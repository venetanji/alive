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
#ifdef __cplusplus
}
#endif
