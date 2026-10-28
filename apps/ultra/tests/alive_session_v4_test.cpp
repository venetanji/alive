#include "../src-tauri/native/alive_session.hpp"
#include "../src-tauri/native/backend.h"
#include "canvas_callback_guard.hpp"
#include "saved_graphs.hpp"
#include <cassert>
#include <cstdio>
#include <cstring>
#include <vector>
#include <thread>
namespace {
struct Dispatch {
  uint64_t frame;
  unsigned source, occurrence, kind, pitch;
  double value;
};
std::array<Dispatch, 4096> dispatches{};
unsigned dispatch_count = 0;
uint64_t trace_origin = 0, placement_steps = 0;
void trace_event(uint64_t frame, unsigned source, unsigned occurrence,
                 const AliveSessionEventV2 &event) noexcept {
  assert(dispatch_count < dispatches.size());
  dispatches[dispatch_count++] = {frame - trace_origin, source,       occurrence,
                                  event.kind,           event.target, event.value};
}
void trace_placement(unsigned, uint64_t amount) noexcept { placement_steps += amount; }

uint64_t preparation = 0, serial = 0, revision = 90000;
std::array<float, 1024> left{}, right{};
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
std::atomic<bool> master_publication_entered{false},master_publication_release{false};
void hold_master_publication()noexcept{master_publication_entered=true;while(!master_publication_release.load())std::this_thread::yield();}
#endif
AliveSessionConfigV4 prepare(unsigned effects = 0) {
  ultra_audio_stop();
  assert(alive_session_reset());
  for (unsigned d = 0; d < 16; ++d)
    assert(ultra_canvas_close_document(d));
  AliveSessionConfigV4 c{};
  c.version = 4;
  c.struct_bytes = sizeof c;
  c.profile = c.work_policy = 1;
  c.track_count = c.source_count = 1;
  c.device_count = effects + 1;
  c.placement_count = 2;
  c.preparation_revision = ++preparation;
  c.length_frames = c.loop_end = 8192;
  c.tempo_bpm = 120;
  auto &track = c.tracks[0];
  track.kind = 1;
  track.gain = 1;
  track.effect_count = effects;
  std::fill_n(track.slots, 4, ALIVE_SESSION_V4_NONE);
  track.placement_count = 2;
  for (unsigned d = 0; d <= effects; ++d) {
    UltraCanvasGraph graph{};
    if (d == 0)
      saved_0(graph, c.devices[d]);
    else if (d == 1)
      saved_1(graph, c.devices[d]);
    else
      saved_2(graph, c.devices[d]);
    graph.revision = ++revision;
    c.devices[d].revision = revision;
    c.devices[d].document = d;
    if (d)
      track.effects[d - 1] = d;
    assert(ultra_canvas_install_document(d, &graph));
  }
  auto &source = c.sources[0];
  source.kind = 1;
  source.audio_buffer = ALIVE_SESSION_V4_NONE;
  source.length_frames = 4096;
  source.event_count = c.event_count = 4;
  c.events[0] = {0, 0, ALIVE_SESSION_NOTE_ON, 0, 60, 100};
  c.events[1] = {1500, 0, ALIVE_SESSION_NOTE_OFF, 0, 60, 0};
  c.events[2] = {2000, 0, ALIVE_SESSION_NOTE_ON, 0, 64, 100};
  c.events[3] = {3000, 0, ALIVE_SESSION_NOTE_OFF, 0, 64, 0};
  c.placements[0] = {0, 0, 0, 0, 512, 2048, 0};
  c.placements[1] = {0, 0, 0, 0, 4096, 2048, 1024};
  return c;
}
AliveSessionStateV4 state() {
  AliveSessionStateV4 s{};
  s.version = 4;
  s.struct_bytes = sizeof s;
  assert(alive_session_state_v4(&s));
  return s;
}
void render(unsigned frames) {
  callback_guard::begin();
  const int ok = ultra_external_render(frames, left.data(), right.data());
  callback_guard::end();
  assert(ok);
}
void master_v4_fifo_and_publication() {
  auto c=prepare();assert(alive_session_configure_v4(&c,nullptr,0));
  assert(alive_session_master_set(1,0.5,1)==ALIVE_MASTER_OK);
  AliveSessionStateV4 score{};score.version=4;score.struct_bytes=sizeof score;
  AliveMasterStateV1 master{};master.version=1;master.struct_bytes=sizeof master;
  assert(alive_session_master_snapshot_v4(&score,&master)==ALIVE_MASTER_OK);
  assert(master.current_gain==0.5&&master.applied_serial==1&&master.applied_frame==score.absolute_frame);
  assert(ultra_external_start());assert(alive_session_master_set(1,1.,2)==ALIVE_MASTER_OK);
  assert(alive_session_master_reset_clip(1,3)==ALIVE_MASTER_OK);render(64);
  assert(alive_session_master_snapshot_v4(&score,&master)==ALIVE_MASTER_OK);
  assert(!score.playing&&master.current_gain==1.&&master.applied_serial==3);
  assert(master.applied_frame+64==score.absolute_frame);
  const auto rejected_base=score.rejected;
  std::atomic<bool> done{false};std::atomic<unsigned> reads{0};
  std::thread reader([&]{while(!done.load()){
    AliveSessionStateV4 s{};s.version=4;s.struct_bytes=sizeof s;AliveMasterStateV1 m{};m.version=1;m.struct_bytes=sizeof m;
    const int result=alive_session_master_snapshot_v4(&s,&m);assert(result==ALIVE_MASTER_OK||result==ALIVE_MASTER_BUSY);
    if(result==ALIVE_MASTER_OK){assert(s.tracks[0].mixer.gain==m.target_gain);assert(m.applied_frame==m.observation_start_frame && m.observation_end_frame==s.absolute_frame);
      const auto completed=m.applied_serial==3?0:(m.applied_serial-3)/63;assert(s.rejected==rejected_base+completed);++reads;}
  }});
  for(unsigned i=0;i<2000;++i){const double value=i%2?0.25:0.75;
    for(unsigned j=0;j<63;++j)assert(alive_session_master_set(1,value,4+uint64_t(i)*63+j)==ALIVE_MASTER_OK);
    assert(alive_session_mixer(0,value,0,0));assert(!alive_session_mixer(0,value,0,0));render(1);}
  done=true;reader.join();assert(reads>0);
  AliveSessionStateV3 wrong{};wrong.version=3;wrong.struct_bytes=sizeof wrong;wrong.absolute_frame=123;
  master.applied_serial=456;assert(alive_session_master_snapshot_v3(&wrong,&master)==ALIVE_MASTER_UNSUPPORTED);
  assert(wrong.absolute_frame==123&&master.applied_serial==456);
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
  master_publication_entered=false;master_publication_release=false;ultra::alive_session_test_publication=hold_master_publication;
  std::thread writer([]{render(1);});while(!master_publication_entered.load())std::this_thread::yield();
  score.absolute_frame=123;master.applied_serial=456;
  assert(alive_session_master_snapshot_v4(&score,&master)==ALIVE_MASTER_BUSY);assert(score.absolute_frame==123&&master.applied_serial==456);
  master_publication_release=true;writer.join();ultra::alive_session_test_publication=nullptr;
#endif
}
AliveSessionReceiptV4 request(unsigned kind = ALIVE_SESSION_V4_START, bool expected = true) {
  AliveSessionRequestV4 r{};
  r.version = 4;
  r.struct_bytes = sizeof r;
  r.kind = kind;
  if (kind == ALIVE_SESSION_V4_TRACK_ACTIONS) {
    r.track_mask = 1;
    r.tracks[0] = {ALIVE_SESSION_V4_TRACK_STOP, ALIVE_SESSION_V4_NONE};
  }
  r.preparation_revision = preparation;
  r.request_serial = ++serial;
  AliveSessionReceiptV4 receipt{};
  receipt.version = 4;
  receipt.struct_bytes = sizeof receipt;
  assert(bool(alive_session_request_v4(&r, &receipt)) == expected);
  return receipt;
}
std::vector<float> play(unsigned partition, unsigned effects = 0) {
  auto c = prepare(effects);
  assert(alive_session_validate_v4(&c));
  assert(alive_session_configure_v4(&c, nullptr, 0));
  assert(!alive_session_start());
  assert(!alive_session_seek(0));
  assert(!alive_session_base(0, 0, 1));
  AliveSessionStateV3 old{};
  old.version = 3;
  old.struct_bytes = sizeof old;
  const auto canary = old;
  assert(!alive_session_state_v3(&old));
  assert(!std::memcmp(&old, &canary, sizeof old));
  trace_origin = state().absolute_frame;
  dispatch_count = 0;
  placement_steps = 0;
  assert(ultra_external_start());
  request();
  std::vector<float> audio;
  for (unsigned position = 0; position < 8192;) {
    const unsigned parts[] = {31, 63, 64, 127, 1024, 1};
    const unsigned count =
        std::min(partition ? partition : parts[(position / 31) % 6], 8192 - position);
    render(count);
    audio.insert(audio.end(), left.begin(), left.begin() + count);
    position += count;
  }
  const uint64_t expected_frames[] = {512, 2012, 2512, 4096, 4572, 5072, 6072};
  assert(dispatch_count == 7);
  for (unsigned i = 0; i < 7; ++i) {
    assert(dispatches[i].frame == expected_frames[i]);
    assert(dispatches[i].source == 0);
    assert(dispatches[i].occurrence == (i < 3 ? 0u : 1u));
  }
  assert(placement_steps > 0);
  auto s = state();
  assert(!s.playing && s.position == 8192 && !s.fault);
  for (unsigned i = 0; i < audio.size(); ++i)
    if (i < 512 || (i >= 2560 && i < 4096) || i >= 6144)
      assert(audio[i] == 0);
  for (unsigned begin : {512u, 4096u}) {
    bool sounding = false;
    for (unsigned i = begin; i < begin + 256; ++i)
      sounding |= audio[i] != 0;
    assert(sounding);
  }
  std::printf("dispatch=512,2012,2512,4096,4572,5072,6072 placement_steps=%llu ",
              static_cast<unsigned long long>(placement_steps));
  std::printf("partition=%u effects=%u frames=%zu silence/chase/guards=PASS\n", partition, effects,
              audio.size());
  return audio;
}
} // namespace
void boundary_cases() {
  // At O=1000: 64 stays held, 61 ends, and ordinary 60 follows chased 64.
  auto c = prepare(2);
  c.placement_count = c.tracks[0].placement_count = 2;
  c.placements[0] = {0, 0, 0, 0, 512, 1024, 1000};
  c.placements[1] = {0, 0, 0, 0, 1536, 1024, 1000};
  c.events[0] = {0, 0, ALIVE_SESSION_NOTE_ON, 0, 61, 100};
  c.events[1] = {0, 0, ALIVE_SESSION_NOTE_ON, 0, 64, 100};
  c.events[2] = {500, 0, ALIVE_SESSION_AUTOMATION, 0, 0, 1000};
  c.events[3] = {1000, 0, ALIVE_SESSION_NOTE_OFF, 0, 61, 0};
  c.events[4] = {1000, 0, ALIVE_SESSION_AUTOMATION, 0, 0, 2000};
  c.events[5] = {1000, 0, ALIVE_SESSION_NOTE_ON, 0, 60, 90};
  c.event_count = c.sources[0].event_count = 6;
  c.sources[0].lane_count = 1;
  c.sources[0].owned_masks[0] = 1;
  c.devices[0].parameters[0].automated = 1;
  assert(alive_session_configure_v4(&c, nullptr, 0));
  trace_origin = state().absolute_frame;
  dispatch_count = 0;
  assert(ultra_external_start());
  request();
  render(512);
  render(1);
  auto s = state();
  assert(s.devices[0].effective[0] == 2000);
  assert(s.tracks[0].active_placement == 0);
  assert(dispatch_count == 4);
  auto assert_entry_order = [](unsigned begin, unsigned occurrence, uint64_t frame) {
    std::printf("entry occurrence=%u frame=%llu note-order=%u,%u expected=64,60\n", occurrence,
                static_cast<unsigned long long>(frame), dispatches[begin + 2].pitch,
                dispatches[begin + 3].pitch);
    std::fflush(stdout);
    assert(dispatches[begin].kind == ALIVE_SESSION_NOTE_OFF && dispatches[begin].pitch == 61);
    assert(dispatches[begin + 1].kind == ALIVE_SESSION_AUTOMATION);
    assert(dispatches[begin + 2].kind == ALIVE_SESSION_NOTE_ON &&
           dispatches[begin + 2].pitch == 64);
    assert(dispatches[begin + 3].kind == ALIVE_SESSION_NOTE_ON &&
           dispatches[begin + 3].pitch == 60);
    for (unsigned i = begin; i < begin + 4; ++i) {
      assert(dispatches[i].frame == frame && dispatches[i].source == 0);
      assert(dispatches[i].occurrence == occurrence);
    }
  };
  assert_entry_order(0, 0, 512);
  render(1023);
  render(1);
  s = state();
  assert(s.tracks[0].active_placement == 1 && dispatch_count == 8);
  assert_entry_order(4, 1, 1536);
  assert(s.tracks[0].track_epoch > 2);
  render(1023);
  render(1024);
  for (unsigned i = 0; i < 1024; ++i)
    assert(left[i] == 0);
  std::puts("boundary held/off/on/automation/adjacent reset=PASS");
}
void refusals_and_receipts() {
  auto c = prepare();
  auto bad = c;
  bad.placements[1].start_frame = 1000;
  assert(!alive_session_validate_v4(&bad));
  AliveSessionDiagnosticV4 diagnostic{};
  diagnostic.version = 4;
  diagnostic.struct_bytes = sizeof diagnostic;
  assert(alive_session_diagnostic_v4(&diagnostic) &&
         diagnostic.error == ALIVE_SESSION_V4_BAD_PLACEMENT);
  bad = c;
  bad.placements[0].duration_frames = UINT64_MAX;
  assert(!alive_session_validate_v4(&bad));
  bad = c;
  bad.placements[0].source_offset = 4096;
  assert(!alive_session_validate_v4(&bad));
  bad = c;
  bad.placements[0].loop_enabled = 1;
  assert(alive_session_validate_v4(&bad));
  bad = c;
  bad.event_count = bad.sources[0].event_count = 5;
  for (unsigned i = 0; i < 5; ++i)
    bad.events[i] = {0, 0, ALIVE_SESSION_NOTE_ON, 0, 60 + i, 100};
  assert(!alive_session_validate_v4(&bad));
  assert(alive_session_diagnostic_v4(&diagnostic) &&
         diagnostic.error == ALIVE_SESSION_V4_BAD_SOURCE);
  bad = c;
  bad.placement_count = bad.tracks[0].placement_count = 8;
  for (unsigned i = 0; i < 8; ++i)
    bad.placements[i] = {0, 0, 0, 0, i * 10u, 10, 0};
  assert(!alive_session_validate_v4(&bad));
  assert(alive_session_diagnostic_v4(&diagnostic) &&
         diagnostic.error == ALIVE_SESSION_V4_WORK_LIMIT);
  assert(alive_session_configure_v4(&c, nullptr, 0));
  assert(ultra_external_start());
  AliveSessionStateV2 old_state{};
  old_state.version = 2;
  old_state.struct_bytes = sizeof old_state;
  const auto old_canary = old_state;
  assert(!alive_session_state_v2(&old_state) &&
         !std::memcmp(&old_state, &old_canary, sizeof old_state));
  AliveSessionState first_state{};
  std::memset(&first_state, 0xa5, sizeof first_state);
  const auto first_canary = first_state;
  assert(!alive_session_state(&first_state) &&
         !std::memcmp(&first_state, &first_canary, sizeof first_state));
  AliveSessionRequestV4 canary_request{};
  canary_request.version = 4;
  canary_request.struct_bytes = sizeof canary_request;
  canary_request.kind = 1;
  canary_request.preparation_revision = preparation;
  canary_request.request_serial = serial + 1;
  AliveSessionReceiptV4 bad_receipt{};
  std::memset(&bad_receipt, 0xa5, sizeof bad_receipt);
  const auto receipt_canary = bad_receipt;
  assert(!alive_session_request_v4(&canary_request, &bad_receipt));
  assert(!std::memcmp(&bad_receipt, &receipt_canary, sizeof bad_receipt));
  AliveSessionStateV4 bad_state{};
  bad_state.version = 4;
  bad_state.struct_bytes = sizeof bad_state - 1;
  const auto state_canary = bad_state;
  assert(!alive_session_state_v4(&bad_state));
  assert(!std::memcmp(&bad_state, &state_canary, sizeof bad_state));
  auto first = request();
  AliveSessionRequestV4 r{};
  r.version = 4;
  r.struct_bytes = sizeof r;
  r.kind = 1;
  r.preparation_revision = preparation;
  r.request_serial = first.request_serial + 128;
  AliveSessionReceiptV4 out{};
  out.version = 4;
  out.struct_bytes = sizeof out;
  assert(!alive_session_request_v4(&r, &out) && out.error == ALIVE_SESSION_V4_RECEIPT_BUSY);
  serial = r.request_serial;
  render(1);
  r.request_serial += 128;
  serial = r.request_serial;
  assert(alive_session_request_v4(&r, &out));
  render(1);
  assert(state().receipts[r.request_serial % 128].status == ALIVE_SESSION_V4_APPLIED);
  assert(!alive_session_request_v4(&r, &out) && out.error == ALIVE_SESSION_V4_STALE_REQUEST);
  r.request_serial = UINT64_MAX;
  assert(!alive_session_request_v4(&r, &out) && out.error == ALIVE_SESSION_V4_STALE_REQUEST);

  auto before = state();
  request();
  render(1);
  auto after = state();
  assert(after.tracks[0].track_epoch == before.tracks[0].track_epoch);
  r.preparation_revision = preparation - 1;
  r.request_serial = ++serial;
  assert(!alive_session_request_v4(&r, &out) && out.error == ALIVE_SESSION_V4_STALE_PREPARATION);
  AliveSessionRequestV3 old{};
  old.version = 3;
  old.struct_bytes = sizeof old;
  old.kind = 1;
  old.preparation_revision = preparation;
  old.request_serial = ++serial;
  AliveSessionReceiptV3 old_out{};
  old_out.version = 3;
  old_out.struct_bytes = sizeof old_out;
  assert(!alive_session_request_v3(&old, &old_out));
  for (unsigned i = 0; i < 64; ++i)
    assert(alive_session_mixer(0, 1, 0, 0));
  assert(!alive_session_mixer(0, 1, 0, 0));
  alive_session_stop_v4();
  render(1);
  assert(!state().playing);
  // Expire the bounded optional ledger, then resume in the initial gap.
  render(1024);
  request();
  render(1);
  assert(state().playing);
  assert(left[0] == 0);
  ultra_audio_stop();
  before = state();
  bad = c;
  bad.preparation_revision = ++preparation;
  bad.placements[0].source_offset = UINT64_MAX;
  assert(!alive_session_configure_v4(&bad, nullptr, 0));
  after = state();
  assert(before.preparation_revision == after.preparation_revision &&
         before.position == after.position);
  std::puts("refusals/layout-aware receipt collision/queue-full Stop=PASS");
}
void source_end_and_authenticated_edits() {
  auto c = prepare(2);
  c.placement_count = c.tracks[0].placement_count = 1;
  c.placements[0] = {0, 0, 0, 0, 0, 4096, 0};
  c.placements[1] = {};
  c.event_count = c.sources[0].event_count = 1;
  for (unsigned i = 1; i < 4; ++i)
    c.events[i] = {};
  assert(alive_session_configure_v4(&c, nullptr, 0));
  assert(ultra_external_start());
  request();
  render(1024);
  assert(!alive_session_base_v2(0, c.devices[0].revision + 1, 0, 20));
  assert(alive_session_base_v2(0, c.devices[0].revision, 0, 20));
  assert(alive_session_bypass_v2(1, c.devices[1].revision, 1));
  assert(alive_session_mixer(0, 0, 0, 0));
  render(1024);
  auto s = state();
  assert(s.devices[0].base[0] == 20 && s.devices[0].effective[0] == 20 && s.devices[1].bypassed);
  for (unsigned i = 0; i < 1024; ++i)
    assert(left[i] == 0);
  assert(alive_session_mixer(0, 1, 0, 0));
  render(1024);
  render(1024);
  render(1024);
  s = state();
  assert(s.tracks[0].active_source == ALIVE_SESSION_V4_NONE &&
         s.tracks[0].mixer.active_voices == 0);
  for (unsigned i = 0; i < 1024; ++i)
    assert(left[i] == 0);
  std::puts("implicit source end/full chain clear/authenticated base/bypass/mixer=PASS");
}
void rejected_candidate_identity() {
  auto c = prepare();
  c.placements[0] = {0, 0, 0, 0, 0, 188, 0};
  assert(alive_session_configure_v4(&c, nullptr, 0));
  assert(ultra_external_start());
  request();
  render(188);
  alive_session_stop_v4();
  render(1);
  const auto before = state();
  assert(before.position == 188 && before.tracks[0].active_placement == 0);
  const auto receipt = request();
  render(1);
  const auto after = state();
  assert(!after.playing && after.tracks[0].active_placement == before.tracks[0].active_placement);
  assert(after.receipts[receipt.request_serial % 128].error == ALIVE_SESSION_V4_WORK_LIMIT);
  render(1024);
  request();
  render(1);
  assert(state().playing && state().tracks[0].active_placement == ALIVE_SESSION_V4_NONE);
  std::puts("rejected candidate keeps applied occurrence; bounded later gap resume=PASS");
}
void rejected_start_lookup_preserves_natural_end() {
  auto c = prepare();
  c.length_frames = c.loop_end = c.sources[0].length_frames = 375;
  c.placement_count = c.tracks[0].placement_count = 1;
  c.placements[0] = {0, 0, 0, 0, 0, 375, 0};
  c.placements[1] = {};
  c.event_count = c.sources[0].event_count = 1;
  for (unsigned i = 1; i < 4; ++i)
    c.events[i] = {};
  assert(alive_session_configure_v4(&c, nullptr, 0));
  assert(ultra_external_start());
  placement_steps = 0;
  dispatch_count = 0;
  request();
  render(375);
  assert(placement_steps == 2054 && dispatch_count == 1);
  auto ended = state();
  assert(!ended.playing && ended.position == 375 && ended.tracks[0].phase == 375);
  for (unsigned attempt = 0; attempt < 20; ++attempt) {
    const auto before = state();
    const auto prior_steps = placement_steps;
    const double gain = attempt % 2 ? 0.75 : 0.25;
    // A rejected START must also preserve earlier reductions in this batch.
    assert(alive_session_mixer(0, gain, 0, 0));
    const auto queued = request();
    render(1);
    const auto after = state();
    const auto &receipt = after.receipts[queued.request_serial % 128];
    std::printf("rejected-start attempt=%u placement=%llu position=%llu phase=%llu\n", attempt + 1,
                static_cast<unsigned long long>(placement_steps),
                static_cast<unsigned long long>(after.position),
                static_cast<unsigned long long>(after.tracks[0].phase));
    std::fflush(stdout);
    assert(receipt.status == ALIVE_SESSION_V4_REJECTED &&
           receipt.error == ALIVE_SESSION_V4_WORK_LIMIT);
    assert(placement_steps - prior_steps == (attempt < 15 ? 4 : 0));
    assert(after.position == before.position && after.playing == before.playing);
    assert(after.tracks[0].phase == before.tracks[0].phase);
    assert(after.tracks[0].active_placement == before.tracks[0].active_placement);
    assert(after.tracks[0].active_source == before.tracks[0].active_source);
    assert(after.tracks[0].authority == before.tracks[0].authority);
    assert(after.generation == before.generation && dispatch_count == 1);
    assert(after.tracks[0].mixer.gain == gain);
  }
  render(1024);
  const auto restart = request();
  render(1);
  const auto resumed = state();
  assert(resumed.playing && resumed.position == 1 && resumed.tracks[0].phase == 1);
  assert(resumed.receipts[restart.request_serial % 128].status == ALIVE_SESSION_V4_APPLIED);
  std::puts("PASS: exhausted lookup refusal preserves natural-end candidate and prior mixer edits");
}
int main(int argc, char **argv) {
  ultra::alive_session_test_dispatch = trace_event;
  ultra::alive_session_test_placement_charge = trace_placement;
  if (argc == 2 && std::strcmp(argv[1], "--start-reservation") == 0) {
    rejected_start_lookup_preserves_natural_end();
    ultra_audio_stop();
    assert(alive_session_reset());
    return 0;
  }
  if (argc == 2 && std::strcmp(argv[1], "--chase-order") == 0) {
    boundary_cases();
    ultra_audio_stop();
    assert(alive_session_reset());
    return 0;
  }

  master_v4_fifo_and_publication();
  for (unsigned profile : {1u, 2u}) {
    AliveSessionLimitsV4 limits{};
    limits.version = 4;
    limits.struct_bytes = sizeof limits;
    assert(alive_session_limits_v4(profile, &limits) && limits.features == (profile == 1 ? 7u : 0u));
  }
  ultra::alive_session_test_dispatch = trace_event;
  ultra::alive_session_test_placement_charge = trace_placement;
  const auto reference = play(1);
  for (unsigned partition : {0u, 31u, 32u, 63u, 64u, 127u, 128u, 256u, 512u, 1024u})
    assert(play(partition) == reference);
  play(31, 2);
  auto c = prepare();
  assert(alive_session_configure_v4(&c, nullptr, 0));
  assert(ultra_external_start());
  request();
  render(1024);
  auto before = state();
  assert(before.tracks[0].active_placement == 0);
  alive_session_stop_v4();
  render(1);
  assert(!state().playing);
  request();
  render(1);
  assert(state().playing && state().tracks[0].active_source == 0);
  assert(request(99, false).error == ALIVE_SESSION_V4_BAD_FIELD);
  const auto unreachable = request(ALIVE_SESSION_V4_TRACK_ACTIONS);
  render(1);
  assert(state().receipts[unreachable.request_serial % 128].error == ALIVE_SESSION_V4_END_CANCELED);
  assert(state().tracks[0].authority == ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY);
  render(1024);
  const auto sought = request(ALIVE_SESSION_V4_SEEK);
  render(1);
  assert(state().position == 1 && state().receipts[sought.request_serial % 128].status == ALIVE_SESSION_V4_APPLIED);
  boundary_cases();
  refusals_and_receipts();
  rejected_candidate_identity();
  rejected_start_lookup_preserves_natural_end();
  source_end_and_authenticated_edits();
  ultra_audio_stop();
  assert(alive_session_reset());
  std::puts("PASS: v4 real saved-device Arrangement");
}
