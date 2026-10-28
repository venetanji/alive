#include "../src-tauri/native/alive_session.hpp"
#include "../src-tauri/native/backend.h"
#include "canvas_callback_guard.hpp"
#include <algorithm>
#include <cassert>
#include <cstdio>
#include <cstring>
#include <vector>
#include <thread>

static_assert(ultra::session_bits::count(0) == 0);
static_assert(ultra::session_bits::count(0xffffffffu) == 32);
static_assert(ultra::session_bits::count(0x80008001u) == 3);
static_assert(ultra::session_bits::first(0) == 32);
static_assert(ultra::session_bits::first(1) == 0);
static_assert(ultra::session_bits::first(0x80000000u) == 31);
static_assert(ultra::session_bits::first(0x80000080u) == 7);

namespace {
uint64_t revision = 40000, preparation = 0, serial = 0;
std::array<float, 1024> left{}, right{};
std::array<UltraCanvasGraph, 16> graphs{};
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
std::atomic<bool> master_publication_entered{false},master_publication_release{false};
void hold_master_publication()noexcept{master_publication_entered=true;while(!master_publication_release.load())std::this_thread::yield();}
#endif
void cleanup() {
  ultra_audio_stop();
  assert(alive_session_reset());
  for (unsigned d = 0; d < 16; ++d)
    assert(ultra_canvas_close_document(d));
}
AliveSessionConfigV3 prepare(unsigned tracks = 2) {
  cleanup();
  AliveSessionConfigV3 c{};
  c.version = 3;
  c.struct_bytes = sizeof c;
  c.profile = tracks > 2 ? 2 : 1;
  c.work_policy = tracks > 2 ? 2 : 1;
  c.track_count = tracks;
  c.device_count = tracks;
  c.clip_count = tracks * 2;
  c.preparation_revision = ++preparation;
  c.length_frames = 96000;
  c.tempo_bpm = 120;
  c.loop_enabled = 1;
  for (unsigned t = 0; t < tracks; ++t) {
    auto &tr = c.tracks[t];
    tr.chain.instrument = t;
    tr.chain.gain = 1;
    std::fill_n(tr.slots, 4, ALIVE_SESSION_V3_NONE);
    tr.slots[0] = t * 2;
    tr.slots[1] = t * 2 + 1;
    tr.initial_clip = t * 2;
    auto &g = graphs[t];
    g = {};
    g.revision = ++revision;
    g.node_count = 5;
    g.edge_count = 5;
    const unsigned kinds[] = {60, 65, 12, 13, 14};
    for (unsigned n = 0; n < 5; ++n) {
      g.nodes[n].id = n + 1;
      g.nodes[n].kind = kinds[n];
    }
    g.nodes[0].p0 = 4;
    g.nodes[2].p0 = 127;
    g.edges[0] = {1, 2, 2, 0};
    g.edges[1] = {2, 0, 3, 0};
    g.edges[2] = {3, 0, 4, 0};
    g.edges[3] = {3, 0, 4, 1};
    g.edges[4] = {4, 0, 5, 0};
    auto &d = c.devices[t];
    d.document = t;
    d.kind = 1;
    d.note_node = 1;
    d.revision = g.revision;
    d.output_channels = 2;
    d.output_layout = 2;
    d.parameter_count = 1;
    d.parameters[0] = {3, 0, 0, 0, 127, 0, 127};
    assert(ultra_canvas_install_document(t, &g));
    for (unsigned slot = 0; slot < 2; ++slot) {
      auto &clip = c.clips[t * 2 + slot];
      clip.track = t;
      clip.length_frames = 48000;
    }
  }
  return c;
}
void add(AliveSessionConfigV3 &c, unsigned clip, uint64_t frame, unsigned kind, unsigned target,
         double value) {
  auto &cl = c.clips[clip];
  if (!cl.event_count)
    cl.event_begin = c.event_count;
  ++cl.event_count;
  c.events[c.event_count++] = {frame, cl.track, kind, c.tracks[cl.track].chain.instrument, target, value};
}
void finalize(AliveSessionConfigV3 &c) {
  unsigned begin = 0;
  for (unsigned i = 0; i < c.clip_count; ++i) {
    c.clips[i].event_begin = begin;
    begin += c.clips[i].event_count;
  }
}
void render(unsigned n) {
  callback_guard::begin();
  const int result = ultra_external_render(n, left.data(), right.data());
  callback_guard::end();
  assert(result);
}
AliveSessionStateV3 state() {
  AliveSessionStateV3 s{};
  s.version = 3;
  s.struct_bytes = sizeof s;
  assert(alive_session_state_v3(&s));
  for (const auto &r : s.receipts) {
    if (r.status < ALIVE_SESSION_V3_PENDING)
      continue;
    const auto combined =
        r.pending_mask | r.applied_mask | r.superseded_mask | r.canceled_mask | r.rejected_mask;
    const auto total =
        r.pending_mask + r.applied_mask + r.superseded_mask + r.canceled_mask + r.rejected_mask;
    assert(combined == r.track_mask && total == r.track_mask);
  }
  return s;
}
AliveSessionReceiptV3 request(unsigned kind, uint64_t position = 0, unsigned track = 0, unsigned slot = 0,
                              unsigned action = 1, bool accepted = true) {
  AliveSessionRequestV3 r{};
  r.version = 3;
  r.struct_bytes = sizeof r;
  r.kind = kind;
  r.preparation_revision = preparation;
  r.request_serial = ++serial;
  r.position = position;
  if (kind == 3) {
    r.track_mask = 1u << track;
    r.tracks[track] = {action, slot};
  }
  AliveSessionReceiptV3 receipt{};
  receipt.version = 3;
  receipt.struct_bytes = sizeof receipt;
  assert(bool(alive_session_request_v3(&r, &receipt)) == accepted);
  assert(receipt.status == (accepted ? ALIVE_SESSION_V3_QUEUED : ALIVE_SESSION_V3_REJECTED));
  assert(receipt.observed_frame == UINT64_MAX && receipt.target_frame == UINT64_MAX);
  return receipt;
}
void start(AliveSessionConfigV3 &c) {
  finalize(c);
  if (!alive_session_configure_v3(&c))
    std::fprintf(stderr, "configure v3: %s\n", alive_session_error());
  else {
    assert(ultra_external_start());
    request(1);
    return;
  }
  assert(false);
}
void admission() {
  AliveSessionStateV3 wide{};
  wide.track_count = 8;
  wide.device_count = 16;
  AliveSessionStateV2 projection{};
  projection.version = 2;
  projection.struct_bytes = sizeof projection;
  const auto original = projection;
  assert(!ultra::AliveSession::project_v2(wide, projection));
  assert(std::memcmp(&projection, &original, sizeof projection) == 0);
  auto c = prepare();
  finalize(c);
  assert(alive_session_validate_v3(&c));
  assert(alive_session_validate_prepared_v3(&c, graphs.data(), 2));
  auto bad = c;
  bad.track_count = 9;
  assert(!alive_session_validate_v3(&bad));
  bad = c;
  bad.device_count = 17;
  assert(!alive_session_validate_v3(&bad));
  bad = c;
  bad.profile = 2;
  assert(!alive_session_validate_v3(&bad));
  bad = c;
  bad.tracks[0].slots[1] = 0;
  assert(!alive_session_validate_v3(&bad));
  bad = c;
  bad.clips[1].track = 1;
  assert(!alive_session_validate_v3(&bad));
  bad = c;
  bad.clips[0].owned_masks[1] = 1;
  assert(!alive_session_validate_v3(&bad));
  bad = c;
  bad.clips[0].length_frames = 187;
  assert(!alive_session_validate_v3(&bad));
  bad = c;
  bad.preparation_revision = 0;
  assert(!alive_session_validate_v3(&bad));
  bad = c;
  for (unsigned i = 0; i < 33; ++i)
    add(bad, 0, 0, 2, 60, 127);
  finalize(bad);
  assert(!alive_session_validate_v3(&bad));
  bad = c;
  for (unsigned i = 0; i < 65; ++i)
    add(bad, 0, i * 2, 2, 60, 127);
  finalize(bad);
  assert(!alive_session_validate_v3(&bad));
  assert(alive_session_configure_v3(&c));
  assert(!alive_session_configure_v3(&bad));
  assert(state().preparation_revision == c.preparation_revision);
  AliveSessionLimitsV3 l{};
  l.version = 3;
  l.struct_bytes = sizeof l;
  assert(alive_session_limits_v3(2, &l) &&
         l.features == (ALIVE_SESSION_V3_FEATURE_ADMITTED | ALIVE_SESSION_V3_FEATURE_ATOMIC_TRACK_ACTIONS) &&
         l.work_policy == ALIVE_SESSION_V3_WORK_POLICY_2);
  assert(alive_session_limits_v3(1, &l) && (l.features & 1));
  assert(!alive_session_start());
  assert(!alive_session_seek(0));
}
std::vector<float> playback(const std::vector<unsigned> &parts) {
  auto c = prepare();
  c.length_frames = 1900;
  c.clips[0].length_frames = 379;
  c.clips[1].length_frames = 383;
  c.clips[2].length_frames = 389;
  c.clips[3].length_frames = 397;
  add(c, 0, 0, 2, 60, 127);
  add(c, 0, 1, 0, 60, 0);
  add(c, 1, 0, 2, 61, 64);
  add(c, 1, 1, 0, 61, 0);
  add(c, 2, 30, 2, 65, 127);
  add(c, 2, 31, 0, 65, 0);
  start(c);
  std::vector<float> out;
  for (unsigned f = 0, b = 0; f < 7600;) {
    const unsigned n = std::min(parts[b++ % parts.size()], 7600 - f);
    render(n);
    out.insert(out.end(), left.begin(), left.begin() + n);
    f += n;
  }
  assert(!state().fault);
  return out;
}
void transitions() {
  auto c = prepare();
  add(c, 0, 0, 2, 60, 127);
  add(c, 0, 1, 0, 60, 0);
  add(c, 1, 0, 2, 61, 64);
  add(c, 1, 1, 0, 61, 0);
  start(c);
  render(1);
  assert(left[0] == .25f);
  auto r = request(3, 0, 0, 1);
  render(1);
  auto s = state();
  assert(s.receipts[r.request_serial % 128].status == ALIVE_SESSION_V3_PENDING);
  assert(s.tracks[0].pending_frame == s.absolute_frame - 2 + 96000);
  auto newer = request(3, 0, 0, 0);
  render(1);
  s = state();
  assert(s.receipts[r.request_serial % 128].status == ALIVE_SESSION_V3_SUPERSEDED);
  assert(s.tracks[0].pending_serial == newer.request_serial);
  auto epoch = alive_session_stop_v3();
  render(1);
  s = state();
  assert(!s.playing && s.applied_stop_epoch == epoch && !s.tracks[0].pending_action);
  assert(s.receipts[newer.request_serial % 128].status == ALIVE_SESSION_V3_CANCELED);
  r = request(3, 0, 0, 1);
  render(1);
  s = state();
  assert(!s.playing && s.tracks[0].active_clip == 1 &&
         s.receipts[r.request_serial % 128].status == ALIVE_SESSION_V3_APPLIED);
  render(1024);
  request(1);
  render(1);
  assert(left[0] == float(64. / 127. * .25));
}
void receipt_is(const AliveSessionStateV3 &s, const AliveSessionReceiptV3 &request, unsigned status,
                unsigned error = ALIVE_SESSION_V3_OK) {
  const auto &r = s.receipts[request.request_serial % 128];
  assert(r.request_serial == request.request_serial && r.track_mask == request.track_mask);
  assert(r.status == status && r.error == error);
  assert(r.pending_mask == (status == ALIVE_SESSION_V3_PENDING ? r.track_mask : 0));
  assert(r.applied_mask == (status == ALIVE_SESSION_V3_APPLIED ? r.track_mask : 0));
  assert(r.superseded_mask == (status == ALIVE_SESSION_V3_SUPERSEDED ? r.track_mask : 0));
  assert(r.canceled_mask == (status == ALIVE_SESSION_V3_CANCELED ? r.track_mask : 0));
  assert(r.rejected_mask == (status == ALIVE_SESSION_V3_REJECTED ? r.track_mask : 0));
}
void configure_stopped(AliveSessionConfigV3 &c) {
  finalize(c);
  assert(alive_session_configure_v3(&c));
  assert(ultra_external_start());
}
void master_v3_fifo_and_publication() {
  auto c=prepare();finalize(c);assert(alive_session_configure_v3(&c));
  assert(alive_session_master_set(1,0.5,1)==ALIVE_MASTER_OK);
  AliveSessionStateV3 score{};score.version=3;score.struct_bytes=sizeof score;
  AliveMasterStateV1 master{};master.version=1;master.struct_bytes=sizeof master;
  assert(alive_session_master_snapshot_v3(&score,&master)==ALIVE_MASTER_OK);
  assert(master.current_gain==0.5&&master.applied_serial==1&&master.applied_frame==score.absolute_frame);
  assert(ultra_external_start());
  assert(alive_session_master_set(1,1.,2)==ALIVE_MASTER_OK);
  assert(alive_session_master_reset_clip(1,3)==ALIVE_MASTER_OK);render(64);
  assert(alive_session_master_snapshot_v3(&score,&master)==ALIVE_MASTER_OK);
  assert(!score.playing&&master.current_gain==1.&&master.applied_serial==3);
  assert(master.applied_frame+64==score.absolute_frame);
  const auto rejected_base=score.rejected;
  std::atomic<bool> done{false};std::atomic<unsigned> reads{0};
  std::thread reader([&]{while(!done.load()){
    AliveSessionStateV3 s{};s.version=3;s.struct_bytes=sizeof s;AliveMasterStateV1 m{};m.version=1;m.struct_bytes=sizeof m;
    const int result=alive_session_master_snapshot_v3(&s,&m);assert(result==ALIVE_MASTER_OK||result==ALIVE_MASTER_BUSY);
    if(result==ALIVE_MASTER_OK){assert(s.tracks[0].mixer.gain==m.target_gain);assert(m.applied_frame==m.observation_start_frame && m.observation_end_frame==s.absolute_frame);
      const auto completed=m.applied_serial==3?0:(m.applied_serial-3)/63;assert(s.rejected==rejected_base+completed);++reads;}
  }});
  for(unsigned i=0;i<2000;++i){const double value=i%2?0.25:0.75;
    for(unsigned j=0;j<63;++j)assert(alive_session_master_set(1,value,4+uint64_t(i)*63+j)==ALIVE_MASTER_OK);
    assert(alive_session_mixer(0,value,0,0));assert(!alive_session_mixer(0,value,0,0));render(1);}
  done=true;reader.join();assert(reads>0);
  AliveSessionStateV2 wrong{};wrong.version=2;wrong.struct_bytes=sizeof wrong;wrong.absolute_frame=123;
  master.applied_serial=456;assert(alive_session_master_snapshot_v2(&wrong,&master)==ALIVE_MASTER_UNSUPPORTED);
  assert(wrong.absolute_frame==123&&master.applied_serial==456);
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
  master_publication_entered=false;master_publication_release=false;ultra::alive_session_test_publication=hold_master_publication;
  std::thread writer([]{render(1);});while(!master_publication_entered.load())std::this_thread::yield();
  score.absolute_frame=123;master.applied_serial=456;
  assert(alive_session_master_snapshot_v3(&score,&master)==ALIVE_MASTER_BUSY);assert(score.absolute_frame==123&&master.applied_serial==456);
  master_publication_release=true;writer.join();ultra::alive_session_test_publication=nullptr;
#endif
}
AliveSessionReceiptV3 scene(unsigned mask, unsigned slot = 1, unsigned stops = 0,
                             bool accepted = true) {
  AliveSessionRequestV3 r{};
  r.version = 3;
  r.struct_bytes = sizeof r;
  r.kind = ALIVE_SESSION_V3_TRACK_ACTIONS;
  r.preparation_revision = preparation;
  r.request_serial = ++serial;
  r.track_mask = mask;
  for (unsigned t = 0; t < 8; ++t)
    if (mask & (1u << t))
      r.tracks[t] = {stops & (1u << t) ? ALIVE_SESSION_V3_TRACK_STOP : ALIVE_SESSION_V3_LAUNCH,
                     stops & (1u << t) ? UINT32_MAX : slot};
  AliveSessionReceiptV3 result{};
  result.version = 3;
  result.struct_bytes = sizeof result;
  assert(bool(alive_session_request_v3(&r, &result)) == accepted);
  assert(result.status == (accepted ? ALIVE_SESSION_V3_QUEUED : ALIVE_SESSION_V3_REJECTED));
  return result;
}
void scene_member_receipts() {
  for (unsigned tracks : {2u, 8u}) {
    const unsigned all = (1u << tracks) - 1;
    for (unsigned t = 0; t < tracks; ++t) {
      auto c = prepare(tracks);
      c.length_frames = 1900;
      start(c);
      render(1);
      const auto first = scene(all);
      render(1);
      auto s = state();
      const auto target = s.tracks[0].pending_frame;
      for (unsigned i = 0; i < tracks; ++i)
        assert(s.tracks[i].pending_serial == first.request_serial && s.tracks[i].pending_frame == target);
      request(3, 0, t, 0);
      render(1);
      s = state();
      auto r = s.receipts[first.request_serial % 128];
      assert(r.status == ALIVE_SESSION_V3_PENDING && r.pending_mask == (all & ~(1u << t)) &&
             r.superseded_mask == (1u << t) && r.error == ALIVE_SESSION_V3_REPLACED_REQUEST);
      while (state().absolute_frame <= target)
        render(unsigned(std::min<uint64_t>(1024, target + 1 - state().absolute_frame)));
      r = state().receipts[first.request_serial % 128];
      assert(r.status == ALIVE_SESSION_V3_MIXED && r.applied_mask == (all & ~(1u << t)) &&
             r.superseded_mask == (1u << t) && !r.pending_mask && r.target_frame == target);
    }
    auto c = prepare(tracks);
    start(c);
    render(1);
    const auto old = scene(all);
    render(1);
    const auto newer = scene(all, 0);
    render(1);
    receipt_is(state(), old, ALIVE_SESSION_V3_SUPERSEDED, ALIVE_SESSION_V3_REPLACED_REQUEST);
    receipt_is(state(), newer, ALIVE_SESSION_V3_PENDING);
    request(3, 0, 0, 1);
    render(1);
    const auto epoch = alive_session_stop_v3();
    render(1);
    auto s = state();
    const auto &r = s.receipts[newer.request_serial % 128];
    assert(s.applied_stop_epoch == epoch && !s.playing && r.status == ALIVE_SESSION_V3_MIXED &&
           r.superseded_mask == 1 && r.canceled_mask == (all & ~1u) && r.error == ALIVE_SESSION_V3_STOP_CANCELED);
  }
}
void scene_stopped_and_refusal() {
  for (unsigned tracks : {2u, 8u}) {
    const unsigned all = (1u << tracks) - 1;
    auto c = prepare(tracks);
    configure_stopped(c);
    const auto cue = scene(all);
    const auto stop = request(3, 0, 0, UINT32_MAX, ALIVE_SESSION_V3_TRACK_STOP);
    render(1);
    auto s = state();
    const auto &r = s.receipts[cue.request_serial % 128];
    assert(!s.playing && r.status == ALIVE_SESSION_V3_MIXED && r.superseded_mask == 1 && r.applied_mask == (all & ~1u));
    receipt_is(s, stop, ALIVE_SESSION_V3_APPLIED);
    assert(s.tracks[0].active_clip == UINT32_MAX);
    const auto empty = scene(all, 0, all);
    render(1);
    receipt_is(state(), empty, ALIVE_SESSION_V3_APPLIED);
    for (unsigned t = 0; t < tracks; ++t)
      assert(state().tracks[t].active_clip == UINT32_MAX);

    c = prepare(tracks);
    configure_stopped(c);
    request(2, 17);
    render(1);
    const auto refused = scene(all);
    request(3, 0, 0, 0);
    const auto seek = request(2, 77);
    render(1);
    s = state();
    const auto &mixed = s.receipts[refused.request_serial % 128];
    assert(!s.playing && s.position == 17 && mixed.status == ALIVE_SESSION_V3_MIXED &&
           mixed.superseded_mask == 1 && mixed.rejected_mask == (all & ~1u) &&
           !mixed.applied_mask && mixed.error == ALIVE_SESSION_V3_WORK_LIMIT);
    receipt_is(s, seek, ALIVE_SESSION_V3_REJECTED, ALIVE_SESSION_V3_WORK_LIMIT);
    for (unsigned t = 0; t < tracks; ++t)
      assert(s.tracks[t].active_clip == t * 2 && s.tracks[t].phase == 17);
    c = prepare(tracks);
    configure_stopped(c);
    std::array<AliveSessionReceiptV3, 64> burst{};
    for (unsigned i = 0; i < burst.size(); ++i) burst[i] = scene(all, i % 2);
    render(1);
    s = state();
    for (unsigned i = 0; i + 1 < burst.size(); ++i)
      receipt_is(s, burst[i], ALIVE_SESSION_V3_SUPERSEDED, ALIVE_SESSION_V3_REPLACED_REQUEST);
    receipt_is(s, burst.back(), ALIVE_SESSION_V3_APPLIED);
  }
}
void scene_ingress_and_reuse() {
  auto c = prepare(8);
  start(c);
  render(1);
  const auto pending = scene(255);
  render(1);
  const auto before = state();
  AliveSessionRequestV3 invalid{};
  invalid.version = 3;
  invalid.struct_bytes = sizeof invalid;
  invalid.kind = ALIVE_SESSION_V3_TRACK_ACTIONS;
  invalid.preparation_revision = preparation;
  invalid.track_mask = 255;
  for (auto &a : invalid.tracks) a = {ALIVE_SESSION_V3_LAUNCH, 0};
  for (unsigned mode = 0; mode < 4; ++mode) {
    auto r = invalid;
    r.request_serial = ++serial;
    if (mode == 0) r.tracks[7].slot = 3;
    if (mode == 1) r.tracks[7] = {ALIVE_SESSION_V3_TRACK_STOP, 0};
    if (mode == 2) r.track_mask = 127; // Last action is unmasked data.
    if (mode == 3) r.track_mask = 511;
    AliveSessionReceiptV3 out{};
    out.version = 3; out.struct_bytes = sizeof out;
    assert(!alive_session_request_v3(&r, &out));
    assert(out.error == (mode == 0 ? ALIVE_SESSION_V3_EMPTY_SLOT : ALIVE_SESSION_V3_BAD_FIELD));
    assert(out.rejected_mask == r.track_mask);
    const auto after = state();
    assert(std::memcmp(before.tracks, after.tracks, sizeof before.tracks) == 0);
    assert(std::memcmp(before.receipts, after.receipts, sizeof before.receipts) == 0);
  }
  for (unsigned i = 0; i < 64; ++i) assert(alive_session_mixer(0, 1, 0, 0));
  assert(scene(255, 0, 0, false).error == ALIVE_SESSION_V3_QUEUE_FULL);
  render(1);
  for (unsigned i = 0; i < 63; ++i) assert(alive_session_mixer(0, 1, 0, 0));
  const auto replacement = scene(255, 0);
  render(1);
  receipt_is(state(), pending, ALIVE_SESSION_V3_SUPERSEDED, ALIVE_SESSION_V3_REPLACED_REQUEST);
  request(3, 0, 0, 1);
  render(1);
  serial = replacement.request_serial + 127;
  assert(scene(255, 0, 0, false).error == ALIVE_SESSION_V3_RECEIPT_BUSY);
  const auto epoch = alive_session_stop_v3();
  render(1);
  assert(state().applied_stop_epoch == epoch);
  serial = replacement.request_serial + 255;
  const auto reuse = scene(255);
  serial += 127;
  assert(scene(255, 0, 0, false).error == ALIVE_SESSION_V3_RECEIPT_BUSY);
  render(1);
  receipt_is(state(), reuse, ALIVE_SESSION_V3_APPLIED);
  c = prepare(8); start(c); render(1024);
  std::array<AliveSessionReceiptV3, 64> queued{};
  for (auto &r : queued) r = scene(255);
  assert(scene(255, 0, 0, false).error == ALIVE_SESSION_V3_QUEUE_FULL);
  const auto full_stop = alive_session_stop_v3(); render(1);
  const auto stopped = state();
  assert(!stopped.playing && stopped.applied_stop_epoch == full_stop);
  for (const auto &r : queued) receipt_is(stopped, r, ALIVE_SESSION_V3_CANCELED, ALIVE_SESSION_V3_STOP_CANCELED);
}
void scene_transport_order_and_old_refusal() {
  auto c = prepare(8);
  configure_stopped(c);
  const auto cue = scene(255), seek = request(2, 137), play = request(1), future = scene(255, 0);
  render(1);
  auto s = state();
  receipt_is(s, cue, ALIVE_SESSION_V3_APPLIED);
  receipt_is(s, seek, ALIVE_SESSION_V3_APPLIED);
  receipt_is(s, play, ALIVE_SESSION_V3_APPLIED);
  receipt_is(s, future, ALIVE_SESSION_V3_PENDING);
  for (unsigned t = 0; t < 8; ++t)
    assert(s.tracks[t].active_clip == t * 2 + 1 && s.tracks[t].phase == 138);
  const auto blocked_seek = request(2, 77), blocked_scene = scene(255);
  request(3, 0, 0, 0);
  assert(alive_session_base_v2(c.devices[0].document, c.devices[0].revision, 0, 32));
  assert(alive_session_mixer(7, .5, 0, 0));
  render(1);
  s = state();
  receipt_is(s, future, ALIVE_SESSION_V3_PENDING);
  receipt_is(s, blocked_seek, ALIVE_SESSION_V3_REJECTED, ALIVE_SESSION_V3_WORK_LIMIT);
  const auto &mixed = s.receipts[blocked_scene.request_serial % 128];
  assert(mixed.superseded_mask == 1 && mixed.rejected_mask == 254 && !mixed.applied_mask);
  assert(s.devices[0].base[0] == 32 && s.tracks[7].mixer.gain == .5);
  render(1024);
  const auto first = scene(127), overlap = scene(254, 0);
  request(2, 777);
  render(1);
  s = state();
  const auto &a = s.receipts[first.request_serial % 128];
  assert(a.status == ALIVE_SESSION_V3_MIXED && a.superseded_mask == 126 && a.canceled_mask == 1);
  receipt_is(s, overlap, ALIVE_SESSION_V3_CANCELED, ALIVE_SESSION_V3_REPLACED_REQUEST);
  for (unsigned t = 0; t < 8; ++t) assert(!s.tracks[t].pending_action && s.tracks[t].phase == 778);

  c = prepare(8);
  c.loop_enabled = 0;
  c.length_frames = 1900;
  start(c);
  render(1);
  const auto ended = scene(255);
  render(1);
  receipt_is(state(), ended, ALIVE_SESSION_V3_CANCELED, ALIVE_SESSION_V3_END_CANCELED);
  for (unsigned t = 0; t < 8; ++t) assert(!state().tracks[t].pending_action);
}
void scene_expensive_refusal() {
  auto c = prepare(8);
  for (unsigned t = 0; t < 8; ++t)
    for (unsigned pitch = 0; pitch < 4; ++pitch)
      add(c, t * 2, 5000, ALIVE_SESSION_NOTE_ON, pitch, 100);
  start(c);
  for (unsigned i = 0; i < 4; ++i) render(1024);
  render(905);
  const auto old = scene(255);
  render(1);
  const auto before = state();
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
  ultra::alive_session_test_preview_reads = ultra::alive_session_test_reconstruction_reads = 0;
#endif
  const auto seek = request(2, 4500), refused = scene(255);
  render(1);
  auto s = state();
  receipt_is(s, seek, ALIVE_SESSION_V3_REJECTED, ALIVE_SESSION_V3_WORK_LIMIT);
  receipt_is(s, refused, ALIVE_SESSION_V3_REJECTED, ALIVE_SESSION_V3_WORK_LIMIT);
  receipt_is(s, old, ALIVE_SESSION_V3_PENDING);
  for (unsigned t = 0; t < 8; ++t)
    assert(s.tracks[t].pending_serial == old.request_serial && s.tracks[t].pending_frame == before.tracks[t].pending_frame);
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
  assert(ultra::alive_session_test_preview_reads > 0 && ultra::alive_session_test_preview_reads <= 128);
  assert(!ultra::alive_session_test_reconstruction_reads);
  ultra::alive_session_test_preview_reads = 0;
  request(2, 4500); scene(255); render(1);
  assert(!ultra::alive_session_test_preview_reads && !ultra::alive_session_test_reconstruction_reads);
#endif
}
struct SceneAudio {
  std::vector<float> samples;
  std::array<uint64_t, 8> phases{}, epochs{};
  std::array<unsigned, 8> clips{}, owned{}, voices{};
  std::array<double, 8> effective{};
  bool operator==(const SceneAudio &b) const {
    return samples == b.samples && phases == b.phases && epochs == b.epochs && clips == b.clips &&
           owned == b.owned && voices == b.voices && effective == b.effective;
  }
};
SceneAudio scene_audio(bool atomic, unsigned partition, unsigned tracks, bool short_loop) {
  auto c = prepare(tracks);
  c.tempo_bpm = 137;
  const unsigned boundary = short_loop ? 1900 : unsigned(std::round(4. * 48000 * 60 / 137));
  c.length_frames = boundary + (short_loop ? 0 : 32);
  for (unsigned t = 0; t < tracks; ++t) {
    c.devices[t].parameters[0].automated = 1;
    for (unsigned slot = 0; slot < 2; ++slot) {
      const unsigned clip = 2 * t + slot;
      c.clips[clip].length_frames = 12000 + t * 103 + slot * 31;
      c.clips[clip].owned_masks[t] = 1;
      c.clips[clip].lane_count = 1;
      if (t == tracks - 1 && slot) continue; // Empty-event clip retains lane ownership.
      add(c, clip, 0, ALIVE_SESSION_AUTOMATION, 0, 50 + t + slot * 10);
      add(c, clip, 0, ALIVE_SESSION_NOTE_ON, 60 + t, 60 + slot * 20);
      add(c, clip, 1031, ALIVE_SESSION_NOTE_OFF, 60 + t, 0);
    }
  }
  start(c);
  SceneAudio out;
  for (unsigned section = 0; section < 4; ++section) {
    const unsigned ends[] = {31, boundary + 1, unsigned(c.length_frames + 1), unsigned(c.length_frames + 2200)};
    if (section == 1 || section == 2) {
      const unsigned stops = section == 1 ? 1 : 0, slot = section == 1 ? 1 : 0;
      if (atomic) scene((1u << tracks) - 1, slot, stops);
      else for (unsigned t = 0; t < tracks; ++t)
        request(3, 0, t, stops & (1u << t) ? UINT32_MAX : slot,
                stops & (1u << t) ? ALIVE_SESSION_V3_TRACK_STOP : ALIVE_SESSION_V3_LAUNCH);
    }
    unsigned f = section ? ends[section - 1] : 0;
    while (f < ends[section]) {
      const unsigned n = std::min(partition, ends[section] - f);
      render(n);
      for (unsigned i = 0; i < n; ++i) { out.samples.push_back(left[i]); out.samples.push_back(right[i]); }
      f += n;
    }
  }
  const auto s = state();
  assert(!s.fault);
  for (unsigned t = 0; t < tracks; ++t) {
    out.phases[t] = s.tracks[t].phase; out.epochs[t] = s.tracks[t].track_epoch;
    out.clips[t] = s.tracks[t].active_clip; out.voices[t] = s.tracks[t].mixer.active_voices;
    out.owned[t] = s.devices[t].owned[0]; out.effective[t] = s.devices[t].effective[0];
  }
  return out;
}
void scene_sample_equivalence() {
  for (unsigned tracks : {2u, 8u})
    for (bool short_loop : {false, true}) {
      const auto individual = scene_audio(false, 1024, tracks, short_loop);
      for (unsigned partition : {1u, 31u, 64u, 256u, 1024u})
        assert(scene_audio(true, partition, tracks, short_loop) == individual);
    }
}
void stopped_action_supersession() {
  const unsigned pairs[][2] = {{ALIVE_SESSION_V3_LAUNCH, ALIVE_SESSION_V3_LAUNCH},
                               {ALIVE_SESSION_V3_LAUNCH, ALIVE_SESSION_V3_TRACK_STOP},
                               {ALIVE_SESSION_V3_TRACK_STOP, ALIVE_SESSION_V3_LAUNCH}};
  for (bool seek_between : {false, true})
    for (const auto &pair : pairs) {
      auto c = prepare();
      configure_stopped(c);
      const auto first = request(3, 0, 0, pair[0] == ALIVE_SESSION_V3_LAUNCH ? 1 : UINT32_MAX, pair[0]);
      const auto other = request(3, 0, 1, 1);
      AliveSessionReceiptV3 seek{};
      if (seek_between)
        seek = request(2, 137);
      const auto last = request(3, 0, 0, pair[1] == ALIVE_SESSION_V3_LAUNCH ? 0 : UINT32_MAX, pair[1]);
      render(1);
      const auto s = state();
      receipt_is(s, first, ALIVE_SESSION_V3_SUPERSEDED, ALIVE_SESSION_V3_REPLACED_REQUEST);
      receipt_is(s, other, ALIVE_SESSION_V3_APPLIED);
      receipt_is(s, last, ALIVE_SESSION_V3_APPLIED);
      if (seek_between)
        receipt_is(s, seek, ALIVE_SESSION_V3_APPLIED);
      assert(!s.playing && s.position == (seek_between ? 137u : 0u));
      assert(s.tracks[0].active_clip == (pair[1] == ALIVE_SESSION_V3_LAUNCH ? 0 : UINT32_MAX));
      assert(s.tracks[0].phase == 0 && !s.tracks[0].pending_action);
      assert(s.tracks[1].active_clip == 3 && s.tracks[1].phase == (seek_between ? 137u : 0u));
    }

  auto saturated = prepare();
  configure_stopped(saturated);
  std::array<AliveSessionReceiptV3, 64> actions{};
  for (unsigned i = 0; i < actions.size(); ++i)
    actions[i] = request(3, 0, 0, i % 2);
  render(1);
  const auto drained = state();
  for (unsigned i = 0; i + 1 < actions.size(); ++i)
    receipt_is(drained, actions[i], ALIVE_SESSION_V3_SUPERSEDED, ALIVE_SESSION_V3_REPLACED_REQUEST);
  receipt_is(drained, actions.back(), ALIVE_SESSION_V3_APPLIED);
  assert(!drained.playing && drained.tracks[0].active_clip == 1 && drained.tracks[1].active_clip == 2);

  // A stopped cue remains the active selection when START is followed by a
  // future quantized action. SEEK preserves that selection and reanchors it.
  auto c = prepare();
  configure_stopped(c);
  const auto cue = request(3, 0, 0, 1), seek = request(2, 137), play = request(1);
  const auto future = request(3, 0, 0, 0);
  render(1);
  auto s = state();
  receipt_is(s, cue, ALIVE_SESSION_V3_APPLIED);
  receipt_is(s, seek, ALIVE_SESSION_V3_APPLIED);
  receipt_is(s, play, ALIVE_SESSION_V3_APPLIED);
  receipt_is(s, future, ALIVE_SESSION_V3_PENDING);
  assert(s.playing && s.position == 138 && s.tracks[0].active_clip == 1 && s.tracks[0].phase == 138);
  assert(s.tracks[0].pending_serial == future.request_serial && s.tracks[0].pending_frame > s.absolute_frame);
  assert(s.tracks[1].active_clip == 2 && s.tracks[1].phase == 138);

  // A running action canceled by SEEK must not become SUPERSEDED later.
  c = prepare();
  configure_stopped(c);
  request(1);
  const auto canceled = request(3, 0, 0, 1);
  request(2, 137);
  const auto replacement = request(3, 0, 0, 0);
  render(1);
  s = state();
  receipt_is(s, canceled, ALIVE_SESSION_V3_CANCELED, ALIVE_SESSION_V3_REPLACED_REQUEST);
  receipt_is(s, replacement, ALIVE_SESSION_V3_PENDING);
  assert(s.playing && s.position == 138 && s.tracks[0].active_clip == 0 && s.tracks[0].phase == 138);
}
void stopped_action_work_refusal() {
  auto c = prepare();
  configure_stopped(c);
  request(2, 17);
  render(1); // Spend the optional guard allowance while remaining stopped.
  const auto first = request(3, 0, 0, 1), other = request(3, 0, 1, 1);
  const auto last = request(3, 0, 0, UINT32_MAX, ALIVE_SESSION_V3_TRACK_STOP);
  const auto seek = request(2, 77);
  assert(alive_session_base_v2(c.devices[0].document, c.devices[0].revision, 0, 32));
  assert(alive_session_mixer(1, .5, 0, 0));
  render(1);
  auto s = state();
  receipt_is(s, first, ALIVE_SESSION_V3_SUPERSEDED, ALIVE_SESSION_V3_REPLACED_REQUEST);
  receipt_is(s, last, ALIVE_SESSION_V3_REJECTED, ALIVE_SESSION_V3_WORK_LIMIT);
  receipt_is(s, other, ALIVE_SESSION_V3_REJECTED, ALIVE_SESSION_V3_WORK_LIMIT);
  receipt_is(s, seek, ALIVE_SESSION_V3_REJECTED, ALIVE_SESSION_V3_WORK_LIMIT);
  assert(!s.playing && s.position == 17 && s.tracks[0].active_clip == 0 && s.tracks[0].phase == 17);
  assert(s.tracks[1].active_clip == 2 && s.tracks[1].phase == 17 && s.tracks[1].mixer.gain == .5);
  assert(s.devices[0].base[0] == 32 && s.devices[0].effective[0] == 32);

  c = prepare();
  configure_stopped(c);
  const auto cue = request(3, 0, 0, 1);
  render(1);
  request(1);
  render(1);
  const auto pending = request(3, 0, 0, 0);
  render(1);
  const auto before = state();
  const auto blocked_seek = request(2, 77), superseded = request(3, 0, 0, 1);
  const auto blocked_action = request(3, 0, 0, UINT32_MAX, ALIVE_SESSION_V3_TRACK_STOP);
  render(1);
  s = state();
  receipt_is(s, cue, ALIVE_SESSION_V3_APPLIED);
  receipt_is(s, pending, ALIVE_SESSION_V3_PENDING);
  receipt_is(s, superseded, ALIVE_SESSION_V3_SUPERSEDED, ALIVE_SESSION_V3_REPLACED_REQUEST);
  receipt_is(s, blocked_seek, ALIVE_SESSION_V3_REJECTED, ALIVE_SESSION_V3_WORK_LIMIT);
  receipt_is(s, blocked_action, ALIVE_SESSION_V3_REJECTED, ALIVE_SESSION_V3_WORK_LIMIT);
  assert(s.playing && s.position == before.position + 1 && s.tracks[0].active_clip == 1);
  assert(s.tracks[0].pending_serial == pending.request_serial &&
         s.tracks[0].pending_frame == before.tracks[0].pending_frame);
}
void queue_stop() {
  auto c = prepare();
  start(c);
  render(1);
  for (unsigned i = 0; i < 64; ++i)
    assert(alive_session_mixer(0, 1, 0, 0));
  auto r = request(3, 0, 0, 1, 1, false);
  assert(r.error == ALIVE_SESSION_V3_QUEUE_FULL);
  auto epoch = alive_session_stop_v3();
  render(1);
  assert(state().applied_stop_epoch == epoch && !state().playing);
}
void end_and_strict_chase() {
  auto c = prepare(1);
  c.loop_enabled = 0;
  c.length_frames = 1024;
  c.devices[0].parameters[0].automated = 1;
  c.clips[0].owned_masks[0] = 1;
  c.clips[0].lane_count = 1;
  add(c, 0, 0, 1, 0, 64);
  add(c, 0, 0, 2, 60, 127);
  add(c, 0, 512, 1, 0, 32);
  start(c);
  render(1024);
  auto s = state();
  assert(!s.playing && s.position == 1024 && !s.devices[0].owned[0]);
  assert(s.devices[0].effective[0] == 127 && s.tracks[0].mixer.active_voices == 0);
  request(2, 512);
  request(1);
  render(1);
  s = state();
  assert(s.playing && s.position == 513 && s.devices[0].effective[0] == 32 && s.devices[0].owned[0]);
  assert(s.tracks[0].mixer.active_voices == 0); // No chase of held notes.
}
void receipts_and_identity() {
  auto c = prepare(1);
  start(c);
  render(1);
  auto pending = request(3, 0, 0, 1);
  render(1);
  auto s = state();
  const auto pending_frame = s.tracks[0].pending_frame;
  serial = pending.request_serial + 127;
  auto busy = request(3, 0, 0, 0, 1, false);
  assert(busy.error == ALIVE_SESSION_V3_RECEIPT_BUSY);
  assert(state().tracks[0].pending_serial == pending.request_serial);
  auto empty = request(3, 0, 0, 3, 1, false);
  assert(empty.error == ALIVE_SESSION_V3_EMPTY_SLOT);
  assert(state().tracks[0].pending_frame == pending_frame);
  AliveSessionRequestV3 r{};
  r.version = 3;
  r.struct_bytes = sizeof r;
  r.kind = 1;
  r.preparation_revision = preparation;
  r.request_serial = ++serial;
  AliveSessionReceiptV3 result{};
  const auto untouched = result;
  assert(!alive_session_request_v3(&r, &result) && std::memcmp(&result, &untouched, sizeof result) == 0);
  result.version = 3;
  result.struct_bytes = sizeof result;
  assert(alive_session_request_v3(&r, &result));
  render(1);
  assert(state().receipts[serial % 128].status == ALIVE_SESSION_V3_APPLIED);
  assert(!alive_session_request_v3(&r, &result) && result.error == ALIVE_SESSION_V3_STALE_REQUEST);
  const auto epoch = alive_session_stop_v3();
  render(1);
  assert(state().applied_stop_epoch == epoch);
  serial = pending.request_serial + 255;
  auto reused = request(3, 0, 0, 0);
  render(1);
  assert(state().receipts[reused.request_serial % 128].request_serial == reused.request_serial);
  // Invalid output headers cannot overwrite surrounding storage.
  struct Canary {
    uint64_t before;
    AliveSessionStateV3 state;
    uint64_t after;
  } canary{123, {}, 456};
  const auto copy = canary;
  assert(!alive_session_state_v3(&canary.state));
  assert(std::memcmp(&copy, &canary, sizeof canary) == 0);
  AliveSessionStateV2 old{};
  old.version = 2;
  old.struct_bytes = sizeof old;
  assert(alive_session_state_v2(&old));
  assert(old.track_count == 1 && old.device_count == 1 && old.position == state().position);
}
void optional_rejection_and_reduction() {
  auto c = prepare(1);
  add(c, 0, 0, 2, 60, 127);
  add(c, 0, 100, 0, 60, 0);
  start(c);
  render(1);
  auto seek = request(2, 200);
  auto launch = request(3, 0, 0, 1);
  assert(alive_session_base_v2(c.devices[0].document, c.devices[0].revision, 0, 32));
  render(1);
  auto s = state();
  assert(s.position == 2 && s.tracks[0].active_clip == 0 && !s.tracks[0].pending_action);
  assert(s.receipts[seek.request_serial % 128].status == ALIVE_SESSION_V3_REJECTED &&
         s.receipts[launch.request_serial % 128].status == ALIVE_SESSION_V3_REJECTED);
  assert(s.devices[0].base[0] == 32 && s.devices[0].effective[0] == 32);
  for (unsigned i = 0; i < 20; ++i) {
    request(2, 50);
    render(1);
  }
  assert(!state().fault);
  auto stop = alive_session_stop_v3();
  render(1);
  assert(state().applied_stop_epoch == stop && !state().playing);
  const auto blocked_start = request(1), dependent_start = request(1);
  render(1);
  s = state();
  assert(s.receipts[blocked_start.request_serial % 128].status == ALIVE_SESSION_V3_REJECTED);
  assert(s.receipts[dependent_start.request_serial % 128].status == ALIVE_SESSION_V3_REJECTED);
  render(1024);
  request(1);
  auto first = request(2, 5);
  auto last = request(2, 10);
  render(1);
  s = state();
  assert(s.playing && s.position == 11 &&
         s.receipts[first.request_serial % 128].status == ALIVE_SESSION_V3_SUPERSEDED &&
         s.receipts[last.request_serial % 128].status == ALIVE_SESSION_V3_APPLIED);
}
void dense_future_and_scheduled_actions() {
  auto c = prepare(1);
  for (unsigned pitch = 0; pitch < 32; ++pitch)
    add(c, 0, 5000, 2, pitch, 100);
  start(c);
  for (unsigned i = 0; i < 4; ++i)
    render(1024);
  render(905); // Batch at 5000 is now in retained history.
  auto noop = request(1);
  auto launch = request(3, 0, 0, 1);
  render(1);
  auto s = state();
  assert(s.receipts[noop.request_serial % 128].status == ALIVE_SESSION_V3_APPLIED);
  assert(s.receipts[launch.request_serial % 128].status == ALIVE_SESSION_V3_PENDING);
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
  static uint64_t rejected_scans = 0, rejected_guards = 0;
  rejected_scans = rejected_guards = 0;
  ultra::alive_session_test_reconstruction_reads = ultra::alive_session_test_preview_reads = 0;
  ultra::alive_session_test_charge = [](unsigned family, const ultra::clip_admission::Cost &cost) noexcept {
    if (family == 1) {
      rejected_scans += cost[2];
      rejected_guards += cost[4];
    }
  };
#endif
  auto seek = request(2, 4500);
  render(1);
  s = state();
  assert(s.receipts[seek.request_serial % 128].status == ALIVE_SESSION_V3_REJECTED);
  assert(s.tracks[0].pending_serial == launch.request_serial && !s.fault);
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
  assert(!ultra::alive_session_test_reconstruction_reads && !rejected_scans);
  assert(ultra::alive_session_test_preview_reads > 0 && ultra::alive_session_test_preview_reads <= 56);
  assert(rejected_guards == ultra::clip_admission::HorizonSteps);
  for (unsigned i = 0; i < 8; ++i) {
    ultra::alive_session_test_reconstruction_reads = ultra::alive_session_test_preview_reads = 0;
    request(2, 4500);
    render(1);
    assert(!ultra::alive_session_test_reconstruction_reads && !ultra::alive_session_test_preview_reads);
  }
  ultra::alive_session_test_charge = nullptr;
#endif
}
void combination_limits() {
  auto c = prepare();
  for (unsigned p = 0; p < 20; ++p)
    add(c, 0, 0, 2, p, 100);
  for (unsigned p = 0; p < 20; ++p)
    add(c, 2, 0, 2, p, 100);
  finalize(c);
  assert(!alive_session_validate_v3(&c));
  AliveSessionDiagnosticV3 diagnostic{};
  diagnostic.version = 3;
  diagnostic.struct_bytes = sizeof diagnostic;
  assert(alive_session_diagnostic_v3(&diagnostic));
  assert(diagnostic.error == ALIVE_SESSION_V3_EVENT_FRAME_LIMIT && diagnostic.observed == 40 &&
         diagnostic.limit == 32 && diagnostic.frame == UINT64_MAX && diagnostic.conservative);
  assert(diagnostic.contribution[0] == 20 && diagnostic.contribution[1] == 20);
  c = prepare(1);
  for (unsigned p = 0; p < 32; ++p)
    add(c, 0, 0, 2, p, 100);
  finalize(c);
  assert(alive_session_validate_v3(&c));
  // The unselected slot must still pass; an unsafe incoming fragment cannot hide.
  for (unsigned p = 0; p < 33; ++p)
    add(c, 1, 0, 2, p, 100);
  finalize(c);
  assert(!alive_session_validate_v3(&c));
  c = prepare(1);
  for (unsigned p = 0; p < 32; ++p)
    add(c, 0, 0, 2, p, 100);
  for (unsigned p = 0; p < 32; ++p)
    add(c, 0, 1024, 2, p, 100);
  finalize(c);
  assert(alive_session_validate_v3(&c));
  for (unsigned p = 32; p < 64; ++p)
    c.events[p].frame = 1023;
  assert(alive_session_validate_v3(&c));
  add(c, 0, 1023, 2, 32, 100);
  finalize(c);
  assert(!alive_session_validate_v3(&c));
  c = prepare(1);
  add(c, 0, c.clips[0].length_frames, 0, 60, 0);
  finalize(c);
  assert(!alive_session_validate_v3(&c));
}
void ownership_transition() {
  for (bool empty_owned : {false, true}) {
    auto c = prepare(1);
    c.length_frames = 400;
    c.clips[0].length_frames = c.clips[1].length_frames = 400;
    c.devices[0].parameters[0].automated = 1;
    c.clips[0].owned_masks[0] = 1;
    c.clips[0].lane_count = 1;
    if (empty_owned) {
      c.clips[1].owned_masks[0] = 1;
      c.clips[1].lane_count = 1;
    }
    add(c, 0, 300, 1, 0, 64);
    start(c);
    render(301);
    assert(state().devices[0].effective[0] == 64);
    assert(alive_session_base_v2(c.devices[0].document, c.devices[0].revision, 0, 32));
    request(3, 0, 0, 1);
    render(99);
    assert(state().devices[0].effective[0] == 64);
    render(1);
    const auto s = state();
    assert(s.tracks[0].active_clip == 1 && s.devices[0].effective[0] == 32 &&
           bool(s.devices[0].owned[0]) == empty_owned);
    const auto stop = alive_session_stop_v3();
    render(1);
    assert(state().applied_stop_epoch == stop && !state().devices[0].owned[0]);
    request(3, 0, 0, UINT32_MAX, 2);
    render(1);
    assert(state().tracks[0].active_clip == UINT32_MAX);
  }
}
void equal_priority_preserves_authored_order() {
  auto c = prepare(1);
  add(c, 0, 0, 2, 0, 100);
  add(c, 0, 1, 0, 0, 0);
  for (unsigned i = 0; i < 30; ++i)
    add(c, 0, 1, 3, 0, 127);
  start(c);
  render(64); // Allow the native minimum 1 ms voice release to retire.
  assert(state().tracks[0].mixer.active_voices == 0);
}
void abi_cleanup_and_failure() {
  auto c = prepare(1);
  start(c);
  render(1);
  AliveSessionReceiptV3 receipt{};
  receipt.version = 3;
  receipt.struct_bytes = sizeof receipt;
  assert(!alive_session_request_v3(nullptr, &receipt));
  assert(receipt.status == ALIVE_SESSION_V3_REJECTED && receipt.error == ALIVE_SESSION_V3_BAD_HEADER);
  cleanup();
  const auto s = state();
  assert(!s.configured && !s.profile && !s.work_policy && !s.clip_count && !s.preparation_revision);
  for (const auto &r : s.receipts)
    assert(r.version == 3 && r.struct_bytes == sizeof r && !r.request_serial && !r.status);
}
std::vector<float> action_partitions(const std::vector<unsigned> &parts, bool launch) {
  auto c = prepare();
  c.length_frames = 96032;
  c.clips[0].length_frames = 997;
  c.clips[1].length_frames = 991;
  c.clips[2].length_frames = 983;
  add(c, 0, 0, 2, 60, 127);
  add(c, 0, 1, 0, 60, 0);
  add(c, 1, 0, 2, 60, 64);
  add(c, 1, 1, 0, 60, 0);
  add(c, 2, 0, 2, 65, 100);
  add(c, 2, 500, 0, 65, 0);
  start(c);
  std::vector<float> out;
  const unsigned entries[] = {0, 31, 95999, 96000, 96001, 96032, 98000};
  for (unsigned section = 0, block = 0; section < 6; ++section) {
    const unsigned begin = entries[section], end = entries[section + 1];
    if (begin == 31 && launch)
      request(3, 0, 0, 1);
    for (unsigned f = begin; f < end;) {
      const unsigned n = std::min(parts[block++ % parts.size()], end - f);
      render(n);
      out.insert(out.end(), left.begin(), left.begin() + n);
      f += n;
    }
  }
  if (launch) {
    const auto s = state();
    assert(s.tracks[0].active_clip == 1 && !s.tracks[0].pending_action && !s.fault);
    assert(out[96000] >= float(64. / 127. * .25));
  }
  return out;
}
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
void nonloop_end_fault_resource() {
  auto c = prepare(1);
  c.loop_enabled = 0;
  c.length_frames = c.clips[0].length_frames = 400;
  add(c, 0, 0, ALIVE_SESSION_NOTE_ON, 60, 100);
  start(c);
  render(399);
  ultra::alive_session_test_charge = [](unsigned family, const ultra::clip_admission::Cost &) noexcept {
    if (family == 0) {
      ultra::alive_session_test_fault_resource = ALIVE_SESSION_V3_RESOURCE_PARAMETER_WRITES;
      ultra::alive_session_test_charge = nullptr;
    }
  };
  render(1); // Arm the fault after the final sample check, before end cleanup.
  ultra::alive_session_test_fault_resource = 0;
  const auto s = state();
  assert(s.position == 400 && !s.playing && !s.tracks[0].mixer.active_voices);
  assert(s.fault == ALIVE_SESSION_V3_RUNTIME_INVARIANT && s.event_faults == 1);
  assert(s.fault_resource == ALIVE_SESSION_V3_RESOURCE_PARAMETER_WRITES);
}
uint64_t charged_scans = 0;
void observe_scans(unsigned family, const ultra::clip_admission::Cost &cost) noexcept {
  if (family < 3)
    charged_scans += cost[2];
}
void scanned_render(unsigned frames) {
  ultra::alive_session_test_reconstruction_reads = ultra::alive_session_test_preview_reads = 0;
  charged_scans = 0;
  render(frames);
  assert(ultra::alive_session_test_reconstruction_reads <= charged_scans);
  assert(ultra::alive_session_test_preview_reads <= 56);
}
void shared_chase_scan() {
  auto c = prepare(1);
  c.tempo_bpm = 240;
  c.length_frames = 96032;
  c.clips[0].length_frames = 48000;
  c.clips[1].length_frames = 188;
  c.devices[0].parameters[0].automated = 1;
  for (unsigned clip = 0; clip < 2; ++clip) {
    c.clips[clip].owned_masks[0] = 1;
    c.clips[clip].lane_count = 1;
  }
  for (unsigned i = 0; i < 1024; ++i)
    add(c, 0, i * 32, ALIVE_SESSION_SUSTAIN, 0, 0);
  ultra::alive_session_test_charge = observe_scans;
  start(c);
  scanned_render(1024);
  request(2, 40000);
  scanned_render(1);
  assert(ultra::alive_session_test_reconstruction_reads == 1024 && charged_scans == 1024);
  for (unsigned i = 0; i < 16; ++i) {
    const auto r = request(2, 30000);
    scanned_render(1);
    assert(state().receipts[r.request_serial % 128].status == ALIVE_SESSION_V3_REJECTED);
    assert(!ultra::alive_session_test_reconstruction_reads && !ultra::alive_session_test_preview_reads);
  }
  alive_session_stop_v3();
  scanned_render(1);
  for (unsigned i = 0; i < 16; ++i) {
    const auto r = request(1);
    scanned_render(1);
    assert(state().receipts[r.request_serial % 128].status == ALIVE_SESSION_V3_REJECTED);
    assert(!ultra::alive_session_test_reconstruction_reads && !ultra::alive_session_test_preview_reads);
  }
  scanned_render(1024);
  request(1);
  scanned_render(1);
  while (state().position < 48000)
    scanned_render(unsigned(std::min<uint64_t>(1024, 48000 - state().position)));
  scanned_render(1); // Natural clip wrap.
  assert(ultra::alive_session_test_reconstruction_reads == 1 && charged_scans == 1024);
  request(3, 0, 0, 1);
  while (state().position < 96000)
    scanned_render(unsigned(std::min<uint64_t>(1024, 96000 - state().position)));
  scanned_render(1); // Due launch replaces the natural clip wrap; empty owned lane.
  assert(!ultra::alive_session_test_reconstruction_reads && charged_scans == 1024);
  assert(state().tracks[0].active_clip == 1 && state().devices[0].owned[0]);
  scanned_render(31);
  scanned_render(1); // Partial-bar global seam, keeping the same empty clip.
  assert(!ultra::alive_session_test_reconstruction_reads && charged_scans == 1024);
  scanned_render(188); // Natural empty clip wrap.
  assert(!ultra::alive_session_test_reconstruction_reads && charged_scans == 1024);
  ultra::alive_session_test_charge = nullptr;
}
void invariant_fault_cancels_due_launch() {
  auto c = prepare(1);
  c.length_frames = 400;
  c.clips[0].length_frames = c.clips[1].length_frames = 400;
  add(c, 0, 0, 2, 60, 100);
  add(c, 1, 0, 2, 61, 100);
  start(c);
  render(400);
  const auto action = request(3, 0, 0, 1);
  ultra::alive_session_test_fault_resource = ALIVE_SESSION_V3_RESOURCE_EVENTS;
  render(64);
  ultra::alive_session_test_fault_resource = 0;
  const auto s = state();
  assert(!s.playing && s.fault == ALIVE_SESSION_V3_RUNTIME_INVARIANT && s.event_faults == 1);
  assert(!s.tracks[0].mixer.active_voices && s.peak_left == 0 && s.peak_right == 0);
  const auto &receipt = s.receipts[action.request_serial % 128];
  assert(receipt.status == ALIVE_SESSION_V3_CANCELED && receipt.error == ALIVE_SESSION_V3_RUNTIME_INVARIANT);
}
void scene_fault_and_stop_race() {
  for (bool supersede : {false, true}) {
  auto c = prepare(8);
  c.length_frames = 1900;
  for (unsigned t = 0; t < 8; ++t) {
    add(c, 2 * t, 0, ALIVE_SESSION_NOTE_ON, 60, 100);
    add(c, 2 * t + 1, 0, ALIVE_SESSION_NOTE_ON, 61, 100);
  }
  start(c);
  render(1024); render(876);
  const auto due = scene(255);
  if (supersede) request(3, 0, 0, 0);
  ultra::alive_session_test_fault_resource = ALIVE_SESSION_V3_RESOURCE_EVENTS;
  render(64);
  ultra::alive_session_test_fault_resource = 0;
  const auto s = state();
  assert(!s.playing && s.fault == ALIVE_SESSION_V3_RUNTIME_INVARIANT && s.event_faults == 1);
  if (!supersede) receipt_is(s, due, ALIVE_SESSION_V3_CANCELED, ALIVE_SESSION_V3_RUNTIME_INVARIANT);
  else {
    const auto &r = s.receipts[due.request_serial % 128];
    assert(r.status == ALIVE_SESSION_V3_MIXED && r.superseded_mask == 1 && r.canceled_mask == 254 &&
           !r.applied_mask && r.error == ALIVE_SESSION_V3_RUNTIME_INVARIANT);
  }
  for (unsigned t = 0; t < 8; ++t) assert(!s.tracks[t].mixer.active_voices);
  assert(std::all_of(left.begin(), left.begin() + 64, [](float x) { return x == 0; }));
  }
}
uint64_t race_stop = 0, race_start = 0;
uint64_t outside_scene = 0, fresh_scene = 0;
void scene_stop_boundary() noexcept {
  ultra::alive_session_test_boundary = nullptr;
  outside_scene = scene(255).request_serial;
  race_stop = alive_session_stop_v3();
  race_start = request(1).request_serial;
  fresh_scene = scene(255, 0).request_serial;
}
void scene_epoch_race() {
  auto c = prepare(8);
  start(c); render(1024);
  const auto old = scene(255);
  ultra::alive_session_test_boundary = scene_stop_boundary;
  render(1);
  auto s = state();
  receipt_is(s, old, ALIVE_SESSION_V3_CANCELED, ALIVE_SESSION_V3_STOP_CANCELED);
  assert(s.applied_stop_epoch == race_stop && !s.playing && s.last_consumed_request < outside_scene);
  render(1);
  s = state();
  const auto &outside = s.receipts[outside_scene % 128];
  assert(outside.request_serial == outside_scene && outside.canceled_mask == 255 && outside.error == ALIVE_SESSION_V3_STOP_CANCELED);
  assert(s.playing && s.receipts[race_start % 128].status == ALIVE_SESSION_V3_APPLIED);
  assert(s.receipts[fresh_scene % 128].pending_mask == 255);
  for (unsigned t = 0; t < 8; ++t) assert(s.tracks[t].pending_serial == fresh_scene);
}
void stop_race() noexcept {
  ultra::alive_session_test_boundary = nullptr;
  race_stop = alive_session_stop_v3();
  race_start = request(1).request_serial;
}
void epoch_race() {
  auto c = prepare(1);
  start(c);
  render(1024);
  auto old = request(2, 40);
  ultra::alive_session_test_boundary = stop_race;
  render(1);
  auto s = state();
  assert(s.applied_stop_epoch == race_stop && !s.playing &&
         s.receipts[old.request_serial % 128].status == ALIVE_SESSION_V3_CANCELED);
  render(1);
  s = state();
  assert(s.playing && s.receipts[race_start % 128].status == ALIVE_SESSION_V3_APPLIED);
}
#endif
} // namespace
int main(int argc, char **argv) {
  if (argc == 2 && std::strcmp(argv[1], "--scene-disabled") == 0) {
    auto c = prepare(8); configure_stopped(c);
    assert(scene(255, 0, 0, false).error == ALIVE_SESSION_V3_FEATURE_DISABLED);
    assert(!state().last_consumed_request); cleanup();
    std::puts("PASS: unqualified scene feature refuses without queue mutation"); return 0;
  }
  if (argc == 2 && std::strcmp(argv[1], "--scenes") == 0) {
    scene_member_receipts();
    scene_stopped_and_refusal();
    scene_ingress_and_reuse();
    scene_transport_order_and_old_refusal();
    scene_expensive_refusal();
    scene_sample_equivalence();
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
    scene_fault_and_stop_race();
    scene_epoch_race();
#endif
    cleanup();
    std::puts("PASS: scene member masks, common targets, stopped winners and all-or-none refusal");
    return 0;
  }
  if (argc == 2 && std::strcmp(argv[1], "--stopped-reducer") == 0) {
    stopped_action_supersession();
    stopped_action_work_refusal();
    cleanup();
    std::puts("PASS: stopped action supersession, ordering, masks and work refusal");
    return 0;
  }
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
  if (argc == 2 && std::strcmp(argv[1], "--nonloop-resource") == 0) {
    nonloop_end_fault_resource();
    cleanup();
    std::puts("PASS: nonloop cleanup preserves the failed work resource");
    return 0;
  }
#endif
  admission();
  master_v3_fifo_and_publication();
  assert(playback({1}) == playback({31, 63, 64, 127, 1024, 1}));
  transitions();
  scene_member_receipts();
  scene_stopped_and_refusal();
  scene_ingress_and_reuse();
  scene_transport_order_and_old_refusal();
  scene_expensive_refusal();
  scene_sample_equivalence();
  stopped_action_supersession();
  stopped_action_work_refusal();
  queue_stop();
  end_and_strict_chase();
  receipts_and_identity();
  optional_rejection_and_reduction();
  dense_future_and_scheduled_actions();
  combination_limits();
  ownership_transition();
  equal_priority_preserves_authored_order();
  abi_cleanup_and_failure();
  assert(action_partitions({1}, true) == action_partitions({1024, 127, 63, 1, 31}, true));
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
  nonloop_end_fault_resource();
  shared_chase_scan();
  invariant_fault_cancels_due_launch();
  scene_fault_and_stop_race();
  scene_epoch_race();
  epoch_race();
#endif
  cleanup();
  std::puts("PASS: v3 admission, prime clips, partitions, quantization, receipts, Stop and callback guards");
}
