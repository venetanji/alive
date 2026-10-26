#include "../src-tauri/native/alive_session.h"
#include "../src-tauri/native/backend.h"
#include <algorithm>
#include <cassert>
#include <cstdio>
#include <cstring>
#include <initializer_list>

#include "saved_graphs.hpp"
int main() {
  AliveSessionConfigV4 config{};
  config.version = 4;
  config.struct_bytes = sizeof config;
  config.profile = config.work_policy = config.track_count = config.device_count =
      config.source_count = config.placement_count = 1;
  config.preparation_revision = 2;
  config.length_frames = config.loop_end = 8192;
  config.tempo_bpm = 120;
  config.tracks[0].kind = 1;
  config.tracks[0].gain = 1;
  config.tracks[0].placement_count = 1;
  std::fill_n(config.tracks[0].slots, 4, ALIVE_SESSION_V4_NONE);
  config.sources[0].kind = 1;
  config.sources[0].audio_buffer = ALIVE_SESSION_V4_NONE;
  config.sources[0].length_frames = 4096;
  config.sources[0].event_count = config.event_count = 1;
  config.events[0] = {0, 0, ALIVE_SESSION_NOTE_ON, 0, 60, 100};
  config.placements[0] = {0, 0, 0, 0, 0, 4096, 0};
  UltraCanvasGraph graph{};
  saved_0(graph, config.devices[0]);
  graph.revision = config.devices[0].revision = 70001;
  assert(alive_session_validate_v4(&config));
  assert(alive_session_validate_prepared_v4(&config, &graph, 1, nullptr, 0));
  assert(!alive_session_validate_prepared_v4(&config, nullptr, 1, nullptr, 0));
  assert(!alive_session_validate_prepared_v4(&config, &graph, 1, nullptr, 1));
  auto bad = config;
  bad.struct_bytes--;
  assert(!alive_session_validate_v4(&bad));
  bad = config;
  bad.sources[0].reserved0 = 1;
  assert(!alive_session_validate_v4(&bad));
  bad = config;
  bad.devices[0].parameters[bad.devices[0].parameter_count].node = 123;
  assert(!alive_session_validate_v4(&bad));
  assert(!alive_session_validate_v4(nullptr));
  assert(ultra_canvas_install_document(0, &graph));
  AliveSessionConfigV3 legacy{};
  legacy.version = 3;
  legacy.struct_bytes = sizeof legacy;
  legacy.profile = legacy.work_policy = 1;
  legacy.track_count = legacy.device_count = legacy.clip_count = legacy.event_count = 1;
  legacy.length_frames = 8192;
  legacy.tempo_bpm = 120;
  legacy.preparation_revision = 1;
  legacy.tracks[0].chain.gain = 1;
  std::fill_n(legacy.tracks[0].slots, 4, ALIVE_SESSION_V3_NONE);
  legacy.tracks[0].slots[0] = 0;
  legacy.devices[0] = config.devices[0];
  legacy.clips[0].length_frames = 4096;
  legacy.clips[0].event_count = 1;
  legacy.events[0] = config.events[0];
  assert(alive_session_configure_v3(&legacy));
  assert(ultra_external_start());
  AliveSessionRequestV3 start{};
  start.version = 3;
  start.struct_bytes = sizeof start;
  start.kind = 1;
  start.preparation_revision = start.request_serial = 1;
  AliveSessionReceiptV3 accepted{};
  accepted.version = 3;
  accepted.struct_bytes = sizeof accepted;
  assert(alive_session_request_v3(&start, &accepted));
  float left[64]{}, right[64]{};
  assert(ultra_external_render(64, left, right));
  AliveSessionStateV3 before{};
  before.version = 3;
  before.struct_bytes = sizeof before;
  assert(alive_session_state_v3(&before));
  assert(before.playing);
  assert(!alive_session_configure_v4(&config, nullptr, 0));

  for (unsigned profile : {1u, 2u}) {
    AliveSessionLimitsV4 limits{};
    limits.version = 4;
    limits.struct_bytes = sizeof limits;
    assert(alive_session_limits_v4(profile, &limits));
    assert(limits.features == 0 && limits.max_frame_events == 32 && limits.max_window_events == 64);
    assert(limits.scheduled_frame.placement_steps == 64 &&
           limits.optional_frame.placement_steps == 2114);
  }
  AliveSessionLimitsV4 limits{};
  std::memset(&limits, 0xa5, sizeof limits);
  const auto limits_canary = limits;
  assert(!alive_session_limits_v4(1, &limits));
  assert(!std::memcmp(&limits, &limits_canary, sizeof limits));
  AliveSessionRequestV4 request{};
  request.version = 4;
  request.struct_bytes = sizeof request;
  request.kind = ALIVE_SESSION_V4_START;
  AliveSessionReceiptV4 receipt{};
  receipt.version = 4;
  receipt.struct_bytes = sizeof receipt;
  assert(!alive_session_request_v4(&request, &receipt));
  assert(receipt.error == ALIVE_SESSION_V4_FEATURE_DISABLED);
  AliveSessionStateV3 after{};
  after.version = 3;
  after.struct_bytes = sizeof after;
  assert(alive_session_state_v3(&after));
  assert(before.position == after.position &&
         before.preparation_revision == after.preparation_revision && after.playing);
  assert(!std::memcmp(before.receipts, after.receipts, sizeof before.receipts));
  AliveSessionStateV4 wrong{};
  wrong.version = 4;
  wrong.struct_bytes = sizeof wrong;
  const auto state_canary = wrong;
  assert(!alive_session_state_v4(&wrong));
  assert(!std::memcmp(&wrong, &state_canary, sizeof wrong));
  std::memset(&receipt, 0xa5, sizeof receipt);
  const auto receipt_canary = receipt;
  assert(!alive_session_request_v4(&request, &receipt));
  assert(!std::memcmp(&receipt, &receipt_canary, sizeof receipt));
  ultra_audio_stop();
  assert(alive_session_state_v3(&before));
  assert(!alive_session_configure_v4(&config, nullptr, 0));
  assert(alive_session_state_v3(&after));
  assert(before.position == after.position &&
         before.preparation_revision == after.preparation_revision);
  assert(alive_session_reset());
  assert(ultra_canvas_close_document(0));
  std::puts("PASS: v4 shipping admission remains disabled");
}
