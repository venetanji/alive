#pragma once
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif
/* Signal extensions retain the existing POD graph ABI and evaluator. */
enum UltraCanvasSignalExtensionKind {
 ULTRA_CANVAS_AUDIO_IN=66,
 ULTRA_CANVAS_FILTER_STEREO=67
};
/* ultra-canvas-v1: POD-only C ABI. Control calls are serialized off callback.
 * kind matches PATCH_PROTOCOL.md. count is only message literal length (0=bang).
 * p0/p1/p2 hold typed values documented in PATCH_PROTOCOL.md; voice.device is
 * separate. midiin.channel, voice.device and arithmetic numericmode (p1) are
 * structural-only parameters; arithmetic p0 is rhs (zero for abs).
 * All unused descriptor fields are zero. revision must increase on install. */
typedef struct UltraCanvasNode {
 uint32_t id,kind,device,count; double p0,p1,p2;
#ifdef __cplusplus
 double p3=0,p4=0,p5=0; char text[128]{};
#else
 double p3,p4,p5; char text[128];
#endif
} UltraCanvasNode;
typedef struct UltraCanvasMessage {
 uint32_t count;
 double values[8];
 uint32_t tags[8];
 char symbols[8][32];
 char selector[32];
} UltraCanvasMessage;
typedef struct UltraCanvasConsoleRecord {
 uint64_t sequence,revision,frame;
 uint32_t node,level;
 char label[32];
 UltraCanvasMessage message;
} UltraCanvasConsoleRecord;
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
typedef struct UltraCanvasMessageBoxObservation {
 uint32_t id,flags;
 uint64_t generation;
 UltraCanvasMessage prototype;
 uint32_t placeholders[8];
} UltraCanvasMessageBoxObservation;
typedef struct UltraCanvasMessageBoxSnapshot {
 uint64_t revision,text_edit_serial;
 uint32_t node_count,reserved;
 UltraCanvasMessageBoxObservation nodes[32];
} UltraCanvasMessageBoxSnapshot;
int ultra_canvas_message_boxes_document(uint32_t document,UltraCanvasMessageBoxSnapshot* snapshot);
typedef struct UltraCanvasPrintPopupObservation {
 uint32_t id,enabled,has_value,reserved;
 uint64_t generation,frame;
 UltraCanvasMessage message;
} UltraCanvasPrintPopupObservation;
typedef struct UltraCanvasPrintPopupSnapshot {
 uint64_t revision,frame;
 uint32_t node_count,reserved;
 UltraCanvasPrintPopupObservation nodes[32];
} UltraCanvasPrintPopupSnapshot;
int ultra_canvas_print_popups_document(uint32_t document,UltraCanvasPrintPopupSnapshot* snapshot);
int ultra_canvas_message_text_document(uint32_t document,uint64_t revision,uint32_t node,uint64_t edit_serial,const char* text,uint32_t byte_len);
int ultra_canvas_install(const UltraCanvasGraph* graph);
int ultra_canvas_event(uint64_t revision,uint32_t node,uint32_t inlet,uint32_t count,const double* values);
int ultra_canvas_message(uint64_t revision,uint32_t node,uint32_t inlet,const UltraCanvasMessage* message);
void ultra_canvas_idle_tick(void);
int ultra_canvas_param(uint64_t revision,uint32_t node,uint32_t param,double value);
void ultra_canvas_stop(void);
void ultra_canvas_status(UltraCanvasStatus* status);
uint32_t ultra_canvas_console(UltraCanvasConsoleRecord* records,uint32_t capacity,uint64_t* dropped);
/* Document slots 0..15 share one audio engine; graph revisions are per slot.
 * Legacy entry points above address slot 0. Closing never affects other slots. */
int ultra_canvas_install_document(uint32_t document,const UltraCanvasGraph* graph);
int ultra_canvas_event_document(uint32_t document,uint64_t revision,uint32_t node,uint32_t inlet,uint32_t count,const double* values);
int ultra_canvas_message_document(uint32_t document,uint64_t revision,uint32_t node,uint32_t inlet,const UltraCanvasMessage* message);
/* Physical numeric-UI Tab action, separate from incoming message selectors. */
int ultra_canvas_tab_document(uint32_t document,uint64_t revision,uint32_t node);
int ultra_canvas_param_document(uint32_t document,uint64_t revision,uint32_t node,uint32_t param,double value);
/* Atomically admit a live parameter and its optional hot-inlet numeric message. */
int ultra_canvas_param_hot_document(uint32_t document,uint64_t revision,uint32_t node,uint32_t param,double value,uint32_t hot);
int ultra_canvas_stop_document(uint32_t document);
int ultra_canvas_close_document(uint32_t document);
void ultra_canvas_stop_all(void);
void ultra_canvas_status_document(uint32_t document,UltraCanvasStatus* status);
uint32_t ultra_canvas_console_document(uint32_t document,UltraCanvasConsoleRecord* records,uint32_t capacity,uint64_t* dropped);
#ifdef __cplusplus
}
#endif
