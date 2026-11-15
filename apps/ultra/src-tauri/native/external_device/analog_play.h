#pragma once
#include <stddef.h>
#include <stdint.h>
#include "external_device.h"
#ifdef __cplusplus
extern "C" {
#endif
/* Open/close require a quiescent audio driver. Note/gain/parameter calls share
 * one serialized control owner; render has one callback owner. No saved-device admission. */
int ultra_analog_play_open(const char* path,char* error,size_t capacity);
void ultra_analog_play_close(void);
int ultra_analog_play_active(void);
int ultra_analog_play_note(unsigned pitch,unsigned velocity);
int ultra_analog_play_gain(float gain);
typedef struct UltraAnalogParameterState {
 UltraExternalParameter descriptor;
 float requested,applied;
 uint32_t request_version,applied_version;
} UltraAnalogParameterState;
uint64_t ultra_analog_play_generation(void);
unsigned ultra_analog_play_parameter_count(void);
int ultra_analog_play_parameter_state(unsigned index,UltraAnalogParameterState* state);
typedef struct UltraAnalogParameterValue { uint32_t index; float value; } UltraAnalogParameterValue;
/* Serialized control-owner snapshots retry if the render owner is publishing.
 * Every requested/applied array is one coherent transaction snapshot. */
int ultra_analog_play_parameter_states(const uint32_t* indices,unsigned count,UltraAnalogParameterState* states);
/* Values coalesce per parameter and apply on the render owner before the next
 * callback's notes. Generation prevents edits leaking into a reopened instance. */
int ultra_analog_play_set_parameter(uint64_t generation,unsigned index,float value);
/* 1..203 distinct descriptors; reject the whole batch before publishing on any
 * invalid value. The render owner applies a complete snapshot before notes. */
int ultra_analog_play_set_parameters(uint64_t generation,const UltraAnalogParameterValue* values,unsigned count);
int ultra_analog_play_render(unsigned frames,float* left,float* right);
uint64_t ultra_analog_play_frames(void);
float ultra_analog_play_peak(void);
int ultra_analog_play_fault(void);
#ifdef __cplusplus
}
#endif
