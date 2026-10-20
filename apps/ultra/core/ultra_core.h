#ifndef ULTRA_CORE_H
#define ULTRA_CORE_H
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif
typedef struct UltraCore UltraCore;
typedef struct UltraEvent { uint32_t offset; uint8_t device, kind, note, value; } UltraEvent;
typedef struct UltraStatus { uint64_t rendered, rejected; uint32_t ready, fault, delay_frames, queued; } UltraStatus;
// Kinds: 0 on, 1 off, 2 sustain, 3 level, 4 all-off, 5 musical reset.
// One engine/process. Create/destroy only with callback stopped; 48kHz only.
UltraCore* ultra_core_create(uint32_t sample_rate);
void ultra_core_destroy(UltraCore*);
// One UI producer, offset must be 0. Queue is bounded; false faults/mutes globally.
int ultra_core_queue(UltraCore*, UltraEvent);
// Callback only, before render; offset from next render start, <=1024 frames.
int ultra_core_submit(UltraCore*, UltraEvent);
// Any thread. Sticky fail-closed mute, requires stopped destroy+create to recover.
void ultra_core_panic(UltraCore*);
// Callback only, at most 4096 frames/call. Planar stereo; optional mono input and diagnostic passthrough.
// Every signal has fixed 64-frame causal delay, independent of host partitions.
void ultra_core_render(UltraCore*, float* left, float* right, const float* input, float* diagnostic, uint32_t frames);
UltraStatus ultra_core_status(const UltraCore*);
#ifdef __cplusplus
}
#endif
#endif
