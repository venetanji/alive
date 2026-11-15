#pragma once
#include <stddef.h>
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif

enum { ULTRA_EXTERNAL_BLOCK = 256, ULTRA_EXTERNAL_MAX_MIDI = 16 };
typedef struct UltraExternalDevice UltraExternalDevice;
typedef struct UltraExternalParameter {
 uint32_t index, initialized;
 int32_t tag_a, tag_b, type;
 float minimum, maximum, auxiliary;
} UltraExternalParameter;
typedef struct UltraExternalMidi {
 uint32_t offset;
 uint8_t status, data1, data2, reserved;
} UltraExternalMidi;

/* Experimental in-process Linux x86-64 host; not admitted to ordinary builds.
 * Serialized calls only. Raw DLL faults are NOT isolated from the host.
 * Open creates one instance at 48 kHz, for the two exact qualified hashes only.
 * No DLL startup/TLS or Windows UI is run. */
UltraExternalDevice* ultra_external_device_open(const char* dll_path,
 const char* expected_sha256,char* error,size_t error_capacity);
const char* ultra_external_device_error(const UltraExternalDevice* device);
uint32_t ultra_external_device_parameter_count(const UltraExternalDevice* device);
int ultra_external_device_parameter(const UltraExternalDevice* device,uint32_t index,UltraExternalParameter* parameter);
int ultra_external_device_set_parameter(UltraExternalDevice* device,uint32_t index,float value);
/* This is the last commanded value, not a native DSP/state readback. */
int ultra_external_device_get_commanded_parameter(const UltraExternalDevice* device,uint32_t index,float* value);
/* Calls the qualified ResetA export; does not guarantee silence or flush PCM. */
int ultra_external_device_reset(UltraExternalDevice* device);
/* 1..256 frames at 48 kHz; event offsets are relative to this call. On any
 * invalid request/output/adapter failure, return 0. Inspect error for detail.
 * Adapter failures poison the instance. Access violations are not caught. */
int ultra_external_device_render(UltraExternalDevice* device,uint32_t frames,float* left,float* right,
 const UltraExternalMidi* midi,uint32_t midi_count);
void ultra_external_device_close(UltraExternalDevice* device);
#ifdef __cplusplus
}
#endif
