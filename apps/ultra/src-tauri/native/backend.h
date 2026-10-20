#pragma once
#include <stdint.h>
#include "patch_graph.h"
#ifdef __cplusplus
extern "C" {
#endif
/* Control calls must be serialized by the Rust-side mutex, never from callback. */
typedef struct UltraSequenceConfig {
 uint32_t enabled,bpm,root,chord,steps,gate,velocity;
 int32_t transpose;
 uint32_t clock_source;
} UltraSequenceConfig;
int ultra_audio_sequence(const UltraSequenceConfig* config);
unsigned ultra_sequence_enabled(void);
unsigned ultra_sequence_step(void);
unsigned ultra_sequence_note(void); /* 128 means no owned note. */
uint64_t ultra_sequence_ticks(void);
unsigned ultra_sequence_clock_source(void);
int ultra_audio_start(void);
/* Rust owns device I/O. Start/stop only with the device callback stopped.
   Render runs on its single callback thread, 1..1024 planar stereo frames. */
int ultra_external_start(void);
int ultra_external_render(unsigned frames, float* left, float* right);
void ultra_audio_stop(void);
int ultra_audio_event(unsigned device,unsigned kind,unsigned note,unsigned value);
void ultra_audio_routes(unsigned mask);
void ultra_audio_panic(void);
const char* ultra_audio_error(void);
uint64_t ultra_audio_frames(void);
uint64_t ultra_audio_rejected(void);
unsigned ultra_audio_flags(void); /* 1 running, 2 ready, 4 fault, 8 server lost */
unsigned ultra_audio_period(void);
unsigned ultra_audio_xruns(void);
int ultra_render_demo(const char* path);
int ultra_render_chord_demo(const char* path);
#ifdef __cplusplus
}
#endif
