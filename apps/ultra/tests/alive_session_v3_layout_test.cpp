#include "../src-tauri/native/alive_session.h"
#include <cstddef>
#include <cstdio>

static_assert(sizeof(AliveSessionTrackV3) == 56);
static_assert(sizeof(AliveSessionClipV3) == 88);
static_assert(sizeof(AliveSessionConfigV3) == 47232);
static_assert(sizeof(AliveSessionTrackActionV3) == 8);
static_assert(sizeof(AliveSessionRequestV3) == 112);
static_assert(sizeof(AliveSessionReceiptV3) == 80);
static_assert(sizeof(AliveSessionWorkV3) == 32);
static_assert(sizeof(AliveSessionLimitsV3) == 224);
static_assert(sizeof(AliveSessionDiagnosticV3) == 120);
static_assert(sizeof(AliveSessionTrackStateV3) == 88);
static_assert(sizeof(AliveSessionStateV3) == 16592);
static_assert(alignof(AliveSessionConfigV3) == 8);
static_assert(alignof(AliveSessionStateV3) == 8);
static_assert(offsetof(AliveSessionConfigV3, preparation_revision) == 40);
static_assert(offsetof(AliveSessionConfigV3, tracks) == 64);
static_assert(offsetof(AliveSessionConfigV3, devices) == 512);
static_assert(offsetof(AliveSessionConfigV3, clips) == 11648);
static_assert(offsetof(AliveSessionConfigV3, events) == 14464);
static_assert(offsetof(AliveSessionRequestV3, tracks) == 48);
static_assert(offsetof(AliveSessionStateV3, tracks) == 144);
static_assert(offsetof(AliveSessionStateV3, devices) == 848);
static_assert(offsetof(AliveSessionStateV3, receipts) == 6352);
int main() { std::puts("PASS: v3 C layout"); }
