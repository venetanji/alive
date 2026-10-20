#pragma once
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif
/* Control calls must be serialized by the Rust-side mutex, never from callback. */
int ultra_audio_start(void);
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
#ifdef __cplusplus
}
#endif
