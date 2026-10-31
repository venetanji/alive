#pragma once
#include "alive_session.h"
#ifdef __cplusplus
extern "C" {
#endif
enum { ALIVE_MIDI_QUEUED=1, ALIVE_MIDI_APPLIED=3, ALIVE_MIDI_REJECTED=4,
       ALIVE_MIDI_INVALID=1, ALIVE_MIDI_STALE=2, ALIVE_MIDI_BUSY=3,
       ALIVE_MIDI_LIMIT=4, ALIVE_MIDI_UNAVAILABLE=5, ALIVE_MIDI_STOPPED=6 };
typedef struct AliveMidiLimitsV1 {
  uint32_t version,struct_bytes,available,event_allowance,window_frames,reserved;
  uint64_t preparation_revision;
} AliveMidiLimitsV1;
typedef struct AliveMidiEditV1 {
  uint32_t version,struct_bytes,source,event_count;
  uint64_t preparation_revision,serial,source_revision;
  AliveSessionEventV2 events[1024];
} AliveMidiEditV1;
typedef struct AliveMidiPreviewV1 {
  uint32_t version,struct_bytes,track,pitch,velocity,reserved;
  uint64_t preparation_revision,serial;
} AliveMidiPreviewV1;
typedef struct AliveMidiStateV1 {
  uint32_t version,struct_bytes,status,error;
  uint64_t preparation_revision,serial,source_revision,applied_frame;
  uint64_t preview_serial,preview_expiry;
  uint32_t preview_active,preview_track,preview_pitch,preview_error;
} AliveMidiStateV1;
int alive_midi_limits_v1(AliveMidiLimitsV1*);
int alive_midi_edit_v1(const AliveMidiEditV1*);
int alive_midi_preview_v1(const AliveMidiPreviewV1*);
int alive_midi_release_v1(uint64_t preparation_revision,uint64_t serial);
int alive_midi_state_v1(AliveMidiStateV1*);
#ifdef __cplusplus
}
#endif
