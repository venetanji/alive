#ifndef ALIVE_MASTER_V1_H
#define ALIVE_MASTER_V1_H
#include <stddef.h>
#include <stdint.h>
#include "alive_session.h"
#define ALIVE_MASTER_V1 1u
#define ALIVE_MASTER_OK 1
#define ALIVE_MASTER_INVALID 0
#define ALIVE_MASTER_UNSUPPORTED (-1)
#define ALIVE_MASTER_FULL (-2)
#define ALIVE_MASTER_BUSY (-3)
#define ALIVE_MASTER_UNCONFIGURED (-4)
#define ALIVE_MASTER_EXHAUSTED (-5)
#define ALIVE_MASTER_FEATURE_GAIN 1u
#define ALIVE_MASTER_FEATURE_METER 2u
#define ALIVE_MASTER_FEATURE_RESET 4u
#ifdef __cplusplus
extern "C" {
#endif
typedef struct { uint32_t version, struct_bytes, features, ramp_frames; double max_gain; } AliveMasterLimitsV1;
typedef struct { uint32_t version, struct_bytes, clip_mask, reserved; double target_gain, current_gain, peak_left, peak_right; uint64_t applied_serial, applied_frame, observation_start_frame, observation_end_frame; } AliveMasterStateV1;
int alive_session_master_limits(AliveMasterLimitsV1 *out);
int alive_session_master_set(uint32_t version, double gain, uint64_t serial);
int alive_session_master_reset_clip(uint32_t version, uint64_t serial);
int alive_session_master_snapshot_v2(AliveSessionStateV2 *score, AliveMasterStateV1 *master);
int alive_session_master_snapshot_v3(AliveSessionStateV3 *score, AliveMasterStateV1 *master);
int alive_session_master_snapshot_v4(AliveSessionStateV4 *score, AliveMasterStateV1 *master);
#ifdef __cplusplus
}
#define MASTER_ASSERT static_assert
#define MASTER_ALIGN alignof
#else
#define MASTER_ASSERT _Static_assert
#define MASTER_ALIGN _Alignof
#endif
MASTER_ASSERT(sizeof(AliveMasterLimitsV1)==24 && MASTER_ALIGN(AliveMasterLimitsV1)==8, "limits layout");
MASTER_ASSERT(offsetof(AliveMasterLimitsV1,version)==0 && offsetof(AliveMasterLimitsV1,struct_bytes)==4 && offsetof(AliveMasterLimitsV1,features)==8 && offsetof(AliveMasterLimitsV1,ramp_frames)==12 && offsetof(AliveMasterLimitsV1,max_gain)==16, "limits offsets");
MASTER_ASSERT(sizeof(AliveMasterStateV1)==80 && MASTER_ALIGN(AliveMasterStateV1)==8, "state layout");
MASTER_ASSERT(offsetof(AliveMasterStateV1,version)==0 && offsetof(AliveMasterStateV1,struct_bytes)==4 && offsetof(AliveMasterStateV1,clip_mask)==8 && offsetof(AliveMasterStateV1,reserved)==12 && offsetof(AliveMasterStateV1,target_gain)==16 && offsetof(AliveMasterStateV1,current_gain)==24 && offsetof(AliveMasterStateV1,peak_left)==32 && offsetof(AliveMasterStateV1,peak_right)==40 && offsetof(AliveMasterStateV1,applied_serial)==48 && offsetof(AliveMasterStateV1,applied_frame)==56 && offsetof(AliveMasterStateV1,observation_start_frame)==64 && offsetof(AliveMasterStateV1,observation_end_frame)==72, "state offsets");
#undef MASTER_ASSERT
#undef MASTER_ALIGN
#endif
