#pragma once
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif
/* ultra-canvas-v1: POD-only C ABI. Control calls are serialized off callback.
 * kind matches PATCH_PROTOCOL.md. count is only message literal length (0=bang).
 * p0/p1/p2 hold typed values documented in PATCH_PROTOCOL.md; voice.device is
 * separate. midiin.channel and voice.device are structural-only parameters.
 * All unused descriptor fields are zero. revision must increase on install. */
typedef struct UltraCanvasNode { uint32_t id,kind,device,count; double p0,p1,p2; } UltraCanvasNode;
typedef struct UltraCanvasEdge { uint32_t from,outlet,to,inlet; } UltraCanvasEdge;
typedef struct UltraCanvasGraph {
 uint64_t revision;
 uint32_t node_count,edge_count;
 UltraCanvasNode nodes[32];
 UltraCanvasEdge edges[64];
} UltraCanvasGraph;
typedef struct UltraCanvasObservation { uint32_t id,reserved; double value; uint64_t pulses; } UltraCanvasObservation;
typedef struct UltraCanvasStatus {
 uint64_t revision;
 uint32_t node_count,active;
 UltraCanvasObservation nodes[32];
} UltraCanvasStatus;
int ultra_canvas_install(const UltraCanvasGraph* graph);
int ultra_canvas_event(uint64_t revision,uint32_t node,uint32_t inlet,uint32_t count,const double* values);
int ultra_canvas_param(uint64_t revision,uint32_t node,uint32_t param,double value);
void ultra_canvas_stop(void);
void ultra_canvas_status(UltraCanvasStatus* status);
#ifdef __cplusplus
}
#endif
