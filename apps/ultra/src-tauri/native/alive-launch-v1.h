#pragma once
#include "alive_session.h"
#ifdef __cplusplus
extern "C" {
#endif
enum {
 ALIVE_LAUNCH_NONE=0, ALIVE_LAUNCH_THIRTY_SECOND=1, ALIVE_LAUNCH_SIXTEENTH=2,
 ALIVE_LAUNCH_EIGHTH=3, ALIVE_LAUNCH_QUARTER=4, ALIVE_LAUNCH_HALF=5,
 ALIVE_LAUNCH_BAR1=6, ALIVE_LAUNCH_BAR2=7, ALIVE_LAUNCH_BAR4=8, ALIVE_LAUNCH_BAR8=9
};
// At most one accepted control-consumption batch containing quantized requests
// per rolling 1024 native frames. A batch may replace requests or affect several
// tracks atomically; it shares the existing optional Start/Seek guard credit.
// Excess work gets a terminal WORK_LIMIT receipt, never a silent retry.
typedef struct AliveLaunchLimitsV1 {
 uint32_t version, struct_bytes, quantization_mask, window_frames;
 uint32_t admitted, reserved;
 uint64_t preparation_revision;
} AliveLaunchLimitsV1;
typedef struct AliveLaunchRequestV1 {
 uint32_t version, struct_bytes, quantization, reserved;
 uint32_t kind, track_mask;
 uint64_t preparation_revision, request_serial, position;
 AliveSessionTrackActionV3 tracks[8];
} AliveLaunchRequestV1;
int alive_launch_limits_v1(AliveLaunchLimitsV1*);
int alive_launch_request_v3_v1(const AliveLaunchRequestV1*, AliveSessionReceiptV3*);
int alive_launch_request_v4_v1(const AliveLaunchRequestV1*, AliveSessionReceiptV4*);
#ifdef __cplusplus
}
#endif
