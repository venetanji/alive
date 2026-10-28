#include <stdint.h>

typedef struct { uint32_t version, bytes, features, ramp; double max_gain; } Limits;
int alive_session_state_v2(void *out) { (void)out; return 1; }
int alive_session_master_limits(Limits *out) {
    out->version = 1; out->bytes = sizeof(*out); out->features = 7;
    out->ramp = 64; out->max_gain = FIXTURE_BAD_LIMITS ? 3.0 : 4.0;
    return 1;
}
int alive_session_master_set(uint32_t parameter, double value, uint64_t serial) {
    (void)parameter; (void)value; (void)serial; return 1;
}
int alive_session_master_reset_clip(uint32_t mask, uint64_t serial) {
    (void)mask; (void)serial; return 1;
}
int alive_session_master_snapshot_v2(void *state, void *master) { (void)state; (void)master; return 1; }
int alive_session_master_snapshot_v3(void *state, void *master) { (void)state; (void)master; return 1; }
int alive_session_master_snapshot_v4(void *state, void *master) { (void)state; (void)master; return 1; }
