#pragma once
#include "external_device.h"
#include "../patch_graph.h"
#ifdef __cplusplus
extern "C" {
#endif
/* A source is host-owned complete commanded state. No installed path is saved
 * in a patch. All pointed-to input memory is borrowed only for this call. */
typedef struct UltraLiveDeviceSource {
 uint32_t node,profile_version,parameter_count,reserved;
 const char* profile;
 const char* dll_path;
 const float* values;
} UltraLiveDeviceSource;
typedef struct UltraLiveDeviceStateUpdate {
 uint32_t node,parameter_count;
 const float* values;
} UltraLiveDeviceStateUpdate;
typedef struct UltraLiveDeviceParameterState {
 UltraExternalParameter descriptor;
 float requested,applied;
 uint32_t request_version,applied_version;
} UltraLiveDeviceParameterState;
/* Serialized control owner, driver callback fenced. Preparing, replacing,
 * rearming and closing owned instances never occurs in an audio callback.
 * Failed preparation retains the previously admitted graph and source state. */
int ultra_canvas_install_live_devices_document(uint32_t document,const UltraCanvasGraph* graph,
 const UltraLiveDeviceSource* sources,uint32_t count,char* error,size_t capacity);
int ultra_canvas_live_devices_rearm_document(uint32_t document,char* error,size_t capacity);
uint32_t ultra_canvas_live_devices_count_document(uint32_t document);
/* Whole batch validated before publication. The render owner applies one
 * coherent document snapshot before notes at a callback boundary. */
int ultra_canvas_live_devices_set_states_document(uint32_t document,uint64_t revision,
 const UltraLiveDeviceStateUpdate* updates,uint32_t count,char* error,size_t capacity);
/* Returns the complete descriptor count, or zero on stale/invalid/busy access.
 * requested is commanded host state, not a native DSP-state readback. */
uint32_t ultra_canvas_live_device_parameters_document(uint32_t document,uint64_t revision,
 uint32_t node,UltraLiveDeviceParameterState* states,uint32_t capacity);
#ifdef __cplusplus
}
#endif
