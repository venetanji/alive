#include "alive_session_suffix_fixture.hpp"
#include "../src-tauri/native/alive_session.hpp"
#include "../src-tauri/native/backend.h"
#include "canvas_callback_guard.hpp"
#include "saved_graphs.hpp"
#include <cassert>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <thread>
#include <vector>
namespace {
struct Dispatch {
  uint64_t frame;
  unsigned source, occurrence, kind, pitch;
  double value;
};
std::array<Dispatch, 4096> dispatches{};
unsigned dispatch_count = 0;
uint64_t trace_origin = 0, placement_steps = 0;
using Cost = ultra::clip_admission::Cost;
struct Work {
  std::array<Cost, 4> cost{};
  std::array<uint64_t, 2> placement{}, probes{};
};
Work *work = nullptr;
void trace_work(unsigned family, const Cost &cost) noexcept {
  if (work)
    work->cost[family] = ultra::clip_admission::add(work->cost[family], cost);
}
void trace_probe(unsigned family) noexcept {
  if (work)
    assert(++work->probes[family] <= work->placement[family]);
}
void trace_event(uint64_t frame, unsigned source, unsigned occurrence,
                 const AliveSessionEventV2 &event) noexcept {
  assert(dispatch_count < dispatches.size());
  dispatches[dispatch_count++] = {frame - trace_origin, source,       occurrence,
                                  event.kind,           event.target, event.value};
}
void trace_placement(unsigned family, uint64_t amount) noexcept {
  placement_steps += amount;
  if (work)
    work->placement[family] += amount;
}

uint64_t preparation = 0, serial = 0, revision = 90000;
std::array<float, 1024> left{}, right{};
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
  c.placements[0] = {0, 0, 0, 0, 512, 2048, 0,0,0,0};
  c.placements[1] = {0, 0, 0, 0, 4096, 2048, 1024,0,0,0};
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
} // namespace

AliveSessionConfigV4 multi(unsigned tracks, unsigned effects = 0) {
  const bool filter_only = effects == 3;
  if (filter_only)
    effects = 1;
  auto c = prepare(effects);
  c.profile = c.work_policy = tracks > 2 || effects ? 2 : 1;
  c.track_count = tracks;
  c.source_count = tracks * 2;
  c.slot_count = 8;
  c.device_count = tracks * (effects + 1);
  c.placement_count = c.event_count = 0;
  std::fill_n(c.events, 1024, AliveSessionEventV2{});
  std::fill_n(c.placements, 64, AliveSessionPlacementV4{});
  c.length_frames = c.loop_end = 16384;
  for (unsigned t = 0; t < tracks; ++t) {
    auto &tr = c.tracks[t];
    tr = {};
    tr.kind = 1;
    tr.gain = 0.1;
    tr.instrument = t * (effects + 1);
    tr.effect_count = effects;
    for (unsigned member = 0; member <= effects; ++member) {
      const unsigned d = tr.instrument + member;
      UltraCanvasGraph graph{};
      if (!member)
        saved_0(graph, c.devices[d]);
      else if (member == 1 && !filter_only)
        saved_1(graph, c.devices[d]);
      else
        saved_2(graph, c.devices[d]);
      graph.revision = c.devices[d].revision = ++revision;
      c.devices[d].document = d;
      if (member)
        tr.effects[member - 1] = d;
      else
        c.devices[d].parameters[0].base = 1000 + t * 100;
      assert(ultra_canvas_install_document(d, &graph));
    }
    for (unsigned local = 0; local < 2; ++local) {
      const unsigned s = t * 2 + local;
      auto &src = c.sources[s];
      src = {};
      src.track = t;
      src.kind = 1;
      src.audio_buffer = ALIVE_SESSION_V4_NONE;
      src.length_frames = 16384;
      src.event_begin = c.event_count;
      if (t < 2) {
        src.event_count = 1;
        c.events[c.event_count++] = {
            0, t, ALIVE_SESSION_NOTE_ON, tr.instrument, 48 + t + local * 12, 80};
      }
    }
    for (unsigned local = 0; local < 4; ++local) {
      if (t >= 2) {
        tr.slots[local] = ALIVE_SESSION_V4_NONE;
        continue;
      }
      const unsigned slot = t * 4 + local;
      tr.slots[local] = slot;
      c.slots[slot] = {t, t * 2 + local % 2, 0, 0, local * 100u,0,0,0};
    }
    tr.placement_begin = c.placement_count;
    // The complete proof can conservatively refuse many simultaneous lanes.
    // Eight-track coverage uses one sounding lane and seven prepared silent lanes.
    if (t >= 2 || (tracks == 8 && t == 1))
      continue;
    tr.placement_count = t == 0 ? 3 : 1;
    if (t == 0) {
      c.placements[c.placement_count++] = {t, 0, 0, 0, 512, 2048, 100,0,0,0};
      c.placements[c.placement_count++] = {t, 0, 0, 0, 2560, 2048, 200,0,0,0};
      c.placements[c.placement_count++] = {t, 1, 0, 0, 6144, 2048, 300,0,0,0};
    } else
      c.placements[c.placement_count++] = {t, 2, 0, 0, 0, 12000, 700,0,0,0};
  }
  return c;
}

AliveSessionReceiptV4 actions(unsigned mask, unsigned action0,
                              unsigned slot0 = ALIVE_SESSION_V4_NONE, unsigned action1 = 0,
                              unsigned slot1 = 0) {
  AliveSessionRequestV4 r{};
  r.version = 4;
  r.struct_bytes = sizeof r;
  r.preparation_revision = preparation;
  r.request_serial = ++serial;
  r.kind = ALIVE_SESSION_V4_TRACK_ACTIONS;
  r.track_mask = mask;
  if (mask & 1)
    r.tracks[0] = {action0, slot0};
  if (mask & 2)
    r.tracks[1] = {action1, slot1};
  AliveSessionReceiptV4 out{};
  out.version = 4;
  out.struct_bytes = sizeof out;
  assert(alive_session_request_v4(&r, &out));
  return out;
}
void stopped_authority() {
  auto c = multi(2);
  assert(configure_suffix_fixture(&c, nullptr, 0));
  assert(ultra_external_start());
  const auto cue = actions(2, 0, 0, ALIVE_SESSION_V4_LAUNCH, 3);
  render(1);
  auto s = state();
  assert(!s.playing && s.tracks[1].authority == ALIVE_SESSION_V4_SESSION_AUTHORITY);
  assert(s.tracks[1].active_slot == 7 && s.tracks[1].active_source == 3 &&
         s.tracks[1].phase == 300);
  assert(s.receipts[cue.request_serial % 128].applied_mask == 2);
  assert(left[0] == 0 && right[0] == 0);
  request();
  render(1024);
  assert(state().playing);
}

constexpr unsigned NONE = ALIVE_SESSION_V4_NONE;
constexpr unsigned LAUNCH = ALIVE_SESSION_V4_LAUNCH, STOP = ALIVE_SESSION_V4_TRACK_STOP,
                   RETURN = ALIVE_SESSION_V4_RETURN;
AliveSessionConfigV4 authority_fixture(unsigned effects = 0) {
  auto c = multi(2, effects);
  c.tempo_bpm = 240;
  c.length_frames = c.loop_end = 160000;
  c.slot_count = 6;
  c.slots[4] = {1, 2, 0, 0, 0,0,0,0};
  c.slots[5] = {1, 3, 0, 0, 1000,0,0,0};
  c.slots[6] = c.slots[7] = {};
  c.tracks[1].slots[0] = 4;
  c.tracks[1].slots[1] = c.tracks[1].slots[2] = NONE;
  c.tracks[1].slots[3] = 5;
  c.slots[0] = {0, 1, 0, 0, 1000,0,0,0};
  c.slots[1] = {0, 1, 0, 0, 2000,0,0,0};
  c.slots[2] = {0, 0, 0, 0, 1000,0,0,0};
  c.slots[3] = {0, 0, 0, 0, 2000,0,0,0};
  c.placements[0] = {0, 0, 0, 0, 0, 48000, 0,0,0,0};
  c.placements[1] = {0, 0, 0, 0, 48000, 72000, 1000,0,0,0};
  c.placements[2] = {0, 0, 0, 0, 144000, 16000, 0,0,0,0};
  c.placements[3] = {1, 2, 0, 0, 0, 160000, 0,0,0,0};
  c.event_count = 0;
  std::fill_n(c.events, 1024, AliveSessionEventV2{});
  for (unsigned i = 0; i < 4; ++i) {
    auto &src = c.sources[i];
    src.length_frames = i % 2 ? 100000 : 180000;
    src.event_begin = c.event_count;
    src.event_count = 1;
    c.events[c.event_count++] = {0,      i / 2, ALIVE_SESSION_NOTE_ON, c.tracks[i / 2].instrument,
                                 48 + i, 80};
  }
  return c;
}
AliveSessionConfigV4 pending_boundary_fixture() {
  auto c = authority_fixture();
  c.placement_count = 6;
  c.tracks[1].placement_count = 3;
  c.placements[3] = {1, 2, 0, 0, 0, 10000, 0,0,0,0};
  c.placements[4] = {1, 2, 0, 0, 10000, 10000, 1000,0,0,0};
  c.placements[5] = {1, 2, 0, 0, 30000, 130000, 0,0,0,0};
  return c;
}
void install(const AliveSessionConfigV4 &c) {
  if (!configure_suffix_fixture(&c, nullptr, 0)) {
    AliveSessionDiagnosticV4 d{};
    d.version = 4;
    d.struct_bytes = sizeof d;
    assert(alive_session_diagnostic_v4(&d));
    std::fprintf(stderr, "authority fixture refused resource=%u observed=%llu limit=%llu\n",
                 d.resource, (unsigned long long)d.observed, (unsigned long long)d.limit);
    assert(false);
  }
  assert(ultra_external_start());
  trace_origin = state().absolute_frame;
  dispatch_count = 0;
  if (const auto dir = std::getenv("ALIVE_AUTHORITY_EVIDENCE")) {
    const auto path =
        std::string(dir) + "/accepted-fixture-" + std::to_string(c.preparation_revision) + ".bin";
    FILE *file = std::fopen(path.c_str(), "wb");
    assert(file);
    assert(std::fwrite(&c, sizeof c, 1, file) == 1);
    assert(std::fclose(file) == 0);
  }
}
void frames(unsigned count, unsigned partition = 1024, std::vector<float> *pcm = nullptr) {
  static constexpr unsigned mixed[] = {1, 31, 63, 64, 127, 1024};
  unsigned step = 0;
  while (count) {
    const unsigned n = std::min(count, partition ? partition : mixed[step++ % 6]);
    render(n);
    if (pcm)
      for (unsigned i = 0; i < n; ++i) {
        pcm->push_back(left[i]);
        pcm->push_back(right[i]);
      }
    assert(!state().fault);
    count -= n;
  }
}
void receipt(const AliveSessionReceiptV4 &r, unsigned status, unsigned applied,
             unsigned superseded = 0, unsigned pending = 0, unsigned rejected = 0) {
  const auto actual = state().receipts[r.request_serial % 128];
  assert(actual.request_serial == r.request_serial && actual.status == status);
  assert(actual.applied_mask == applied && actual.superseded_mask == superseded &&
         actual.pending_mask == pending && actual.rejected_mask == rejected);
  if (const auto dir = std::getenv("ALIVE_AUTHORITY_EVIDENCE")) {
    const auto path = std::string(dir) + "/receipts.tsv";
    FILE *file = std::fopen(path.c_str(), "a");
    assert(file);
    std::fprintf(file, "%llu\t%llu\t%u\t%u\t%llu\t%llu\t%u\t%u\t%u\t%u\t%u\n",
                 (unsigned long long)actual.preparation_revision,
                 (unsigned long long)actual.request_serial, actual.status, actual.error,
                 (unsigned long long)actual.observed_frame, (unsigned long long)actual.target_frame,
                 actual.pending_mask, actual.applied_mask, actual.superseded_mask,
                 actual.canceled_mask, actual.rejected_mask);
    assert(std::fclose(file) == 0);
  }
}
void reductions_and_cues() {
  auto c = authority_fixture();
  install(c);
  const auto scene = actions(3, LAUNCH, 0, LAUNCH, 3);
  const auto stop = actions(1, STOP);
  const auto back = actions(1, RETURN);
  Work measured{};
  work = &measured;
  render(1);
  work = nullptr;
  auto s = state();
  assert(!s.playing && s.tracks[0].authority == ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY);
  assert(s.tracks[0].active_source == 0 && s.tracks[0].phase == 0);
  assert(s.tracks[1].authority == ALIVE_SESSION_V4_SESSION_AUTHORITY &&
         s.tracks[1].active_slot == 5);
  assert(s.tracks[1].active_source == 3 && s.tracks[1].phase == 1000);
  receipt(scene, ALIVE_SESSION_V4_MIXED, 2, 1);
  receipt(stop, ALIVE_SESSION_V4_SUPERSEDED, 0, 1);
  receipt(back, ALIVE_SESSION_V4_APPLIED, 1);
  assert(measured.probes[1] <= 4 && measured.placement[1] == 2054);
  frames(1024);
  const auto first = actions(1, RETURN);
  const auto last = actions(1, LAUNCH, 1);
  render(1);
  receipt(first, ALIVE_SESSION_V4_SUPERSEDED, 0, 1);
  receipt(last, ALIVE_SESSION_V4_APPLIED, 1);
  assert(state().tracks[0].active_slot == 1 && state().tracks[0].active_source == 1 &&
         state().tracks[0].phase == 2000);
  request();
  render(1024);
  assert(state().tracks[0].phase == 3024 && state().tracks[1].phase == 2024);
  const auto pending = actions(3, RETURN, NONE, STOP, NONE);
  render(1);
  s = state();
  assert(s.tracks[0].authority == ALIVE_SESSION_V4_SESSION_AUTHORITY &&
         s.tracks[0].pending_slot == NONE);
  assert(s.tracks[0].pending_frame == trace_origin + 1026 + 48000);
  receipt(pending, ALIVE_SESSION_V4_PENDING, 0, 0, 3);
  std::puts("stopped reductions/global slot 5/queued Start/future pending=PASS");
}

void queued_resume_and_future() {
  auto c = authority_fixture();
  install(c);
  request();
  frames(3000);
  alive_session_stop_v4();
  frames(1024);
  const auto now = state().absolute_frame;
  const auto cue = actions(1, LAUNCH, 0);
  const auto start = request();
  const auto future = actions(1, RETURN);
  render(1);
  auto s = state();
  receipt(cue, ALIVE_SESSION_V4_APPLIED, 1);
  receipt(start, ALIVE_SESSION_V4_APPLIED, 0);
  receipt(future, ALIVE_SESSION_V4_PENDING, 0, 0, 1);
  assert(s.playing && s.position == 3001 &&
         s.tracks[0].authority == ALIVE_SESSION_V4_SESSION_AUTHORITY);
  assert(s.tracks[0].active_slot == 0 && s.tracks[0].phase == 1001 &&
         s.tracks[0].pending_frame == now + 45000);
  frames(45000);
  s = state();
  receipt(future, ALIVE_SESSION_V4_APPLIED, 1);
  assert(s.tracks[0].authority == ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY &&
         s.tracks[0].active_placement == 1 && s.tracks[0].phase == 1001);
  std::puts("stopped cue -> queued Start -> future Return preserves active cue and exact absolute "
            "target=PASS");
}
struct AudioRun {
  std::vector<float> pcm;
  std::vector<Dispatch> events;
};
AudioRun playing_authority(unsigned partition, unsigned effects, bool mute_first, bool controls) {
  auto c = authority_fixture(effects);
  c.tracks[0].mute = mute_first;
  install(c);
  request();
  AudioRun out;
  frames(3000, partition, &out.pcm);
  const auto before = state();
  AliveSessionReceiptV4 launch{}, back{}, stopped{};
  if (controls)
    launch = actions(1, LAUNCH, 0);
  frames(45000, partition, &out.pcm);
  if (controls) {
    auto s = state();
    assert(s.tracks[0].authority == ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY);
    assert(s.tracks[0].pending_slot == 0 && s.tracks[0].pending_frame == trace_origin + 48000);
  }
  frames(1, partition, &out.pcm);
  auto s = state();
  if (controls) {
    assert(s.tracks[0].authority == ALIVE_SESSION_V4_SESSION_AUTHORITY &&
           s.tracks[0].active_slot == 0);
    assert(s.tracks[0].active_source == 1 && s.tracks[0].phase == 1001 &&
           s.tracks[0].active_placement == NONE);
    assert(s.tracks[0].track_epoch == before.tracks[0].track_epoch + 1);
    receipt(launch, ALIVE_SESSION_V4_APPLIED, 1);
    back = actions(1, RETURN);
  }
  assert(s.tracks[1].phase == 48001 && s.tracks[1].track_epoch == before.tracks[1].track_epoch);
  frames(47999, partition, &out.pcm);
  if (controls) {
    s = state();
    assert(s.tracks[0].authority == ALIVE_SESSION_V4_SESSION_AUTHORITY &&
           s.tracks[0].pending_action == RETURN);
  }
  frames(1, partition, &out.pcm);
  s = state();
  if (controls) {
    assert(s.tracks[0].authority == ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY);
    assert(s.tracks[0].active_source == 0 && s.tracks[0].active_slot == NONE &&
           s.tracks[0].active_placement == 1);
    assert(s.tracks[0].phase == 49001);
    receipt(back, ALIVE_SESSION_V4_APPLIED, 1);
    stopped = actions(1, STOP);
  }
  frames(48000, partition, &out.pcm);
  s = state();
  if (controls) {
    assert(s.tracks[0].authority == ALIVE_SESSION_V4_SESSION_AUTHORITY &&
           s.tracks[0].active_source == NONE);
    assert(s.tracks[0].phase == 0 && s.playing && s.tracks[1].phase == 144001);
    receipt(stopped, ALIVE_SESSION_V4_APPLIED, 1);
  }
  frames(1000, partition, &out.pcm);
  out.events.assign(dispatches.begin(), dispatches.begin() + dispatch_count);
  return out;
}
void same_audio(const AudioRun &a, const AudioRun &b) {
  assert(a.pcm == b.pcm && a.events.size() == b.events.size());
  for (unsigned i = 0; i < a.events.size(); ++i) {
    const auto &x = a.events[i], &y = b.events[i];
    assert(x.frame == y.frame && x.source == y.source && x.occurrence == y.occurrence &&
           x.kind == y.kind && x.pitch == y.pitch && x.value == y.value);
  }
}
void one_shot() {
  for (bool explicit_stop : {false, true}) {
    auto c = authority_fixture();
    c.sources[1].length_frames = 4000;
    install(c);
    actions(1, LAUNCH, 0);
    request();
    render(1);
    assert(state().tracks[0].active_source == 1 && state().tracks[0].phase == 1001);
    frames(3000);
    auto s = state();
    assert(s.playing && s.tracks[0].authority == ALIVE_SESSION_V4_SESSION_AUTHORITY);
    assert(s.tracks[0].active_slot == NONE && s.tracks[0].active_source == NONE &&
           s.tracks[0].phase == 0);
    alive_session_stop_v4();
    frames(1024);
    assert(!state().playing);
    if (explicit_stop) {
      actions(1, STOP);
      render(1);
    }
    request();
    render(1);
    assert(state().playing && state().tracks[0].active_source == NONE && !state().tracks[0].phase);
    frames(unsigned(c.length_frames - state().position));
    assert(!state().playing && state().position == c.length_frames);
    frames(1024);
    request();
    render(1);
    s = state();
    assert(s.playing && s.position == 1 &&
           s.tracks[0].authority == ALIVE_SESSION_V4_SESSION_AUTHORITY);
    if (explicit_stop)
      assert(s.tracks[0].active_source == NONE && s.tracks[0].phase == 0);
    else
      assert(s.tracks[0].active_slot == 0 && s.tracks[0].active_source == 1 &&
             s.tracks[0].phase == 1001);
  }
  std::puts("one-shot ended cue/Stop-resume silence/natural-end restart/explicit Stop=PASS");
}

void offset_return_and_gap() {
  auto c = authority_fixture(2);
  c.event_count = 0;
  for (unsigned i = 0; i < 4; ++i) {
    auto &src = c.sources[i];
    src.event_begin = c.event_count;
    const unsigned t = i / 2, d = c.tracks[t].instrument;
    auto add = [&](uint64_t frame, unsigned kind, unsigned target, double value) {
      c.events[c.event_count++] = {frame, t, kind, d, target, value};
    };
    if (i < 2) {
      const unsigned offset = i ? 1000 : 49000;
      add(0, ALIVE_SESSION_NOTE_ON, 61, 100);
      add(0, ALIVE_SESSION_NOTE_ON, 64, 100);
      add(500, ALIVE_SESSION_AUTOMATION, 0, 1000);
      if (!i)
        add(48000, ALIVE_SESSION_AUTOMATION, 0, 1500);
      add(offset, ALIVE_SESSION_NOTE_OFF, 61, 0);
      add(offset, ALIVE_SESSION_AUTOMATION, 0, 2000);
      add(offset, ALIVE_SESSION_NOTE_ON, 60, 90);
      src.lane_count = src.owned_masks[d] = 1;
      c.devices[d].parameters[0].automated = 1;
    } else
      add(0, ALIVE_SESSION_NOTE_ON, 50, 80);
    src.event_count = c.event_count - src.event_begin;
  }
  std::fill(c.events + c.event_count, c.events + 1024, AliveSessionEventV2{});
  c.tracks[1].mute = 1;
  install(c);
  request();
  frames(3000);
  actions(1, LAUNCH, 0);
  frames(45000);
  auto before = state();
  unsigned event_begin = dispatch_count;
  render(1);
  auto s = state();
  assert(s.tracks[0].track_epoch == before.tracks[0].track_epoch + 1 &&
         s.devices[0].effective[0] == 2000);
  assert(dispatch_count == event_begin + 4);
  const unsigned kinds[]{ALIVE_SESSION_NOTE_OFF, ALIVE_SESSION_AUTOMATION, ALIVE_SESSION_NOTE_ON,
                         ALIVE_SESSION_NOTE_ON};
  const unsigned pitches[]{61, 0, 64, 60};
  for (unsigned j = 0; j < 4; ++j) {
    const auto &e = dispatches[event_begin + j];
    assert(e.frame == 48000 && e.source == 1 && e.occurrence == NONE && e.kind == kinds[j] &&
           e.pitch == pitches[j]);
  }
  actions(1, RETURN);
  frames(47999);
  event_begin = dispatch_count;
  before = state();
  render(1);
  s = state();
  assert(s.tracks[0].track_epoch == before.tracks[0].track_epoch + 1 &&
         s.devices[0].effective[0] == 2000);
  assert(dispatch_count == event_begin + 4);
  for (unsigned j = 0; j < 4; ++j) {
    const auto &e = dispatches[event_begin + j];
    assert(e.frame == 96000 && e.source == 0 && e.occurrence == 1 && e.kind == kinds[j] &&
           e.pitch == pitches[j]);
  }
  actions(1, STOP);
  frames(48000);
  render(1024);
  assert(std::all_of(left.begin(), left.end(), [](float value) { return value == 0; }));
  assert(std::all_of(right.begin(), right.end(), [](float value) { return value == 0; }));
  assert(!state().devices[0].owned[0]);

  c = authority_fixture(2);
  c.tracks[1].mute = 1;
  c.sources[1].length_frames = 180000;
  c.placements[2].start_frame = 150000;
  c.placements[2].duration_frames = 10000;
  install(c);
  actions(1, LAUNCH, 0);
  request();
  frames(130000);
  const auto gap = actions(1, RETURN);
  frames(14001);
  render(1024);
  s = state();
  receipt(gap, ALIVE_SESSION_V4_APPLIED, 1);
  assert(s.playing && s.tracks[0].authority == ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY);
  assert(s.tracks[0].active_source == NONE && s.tracks[0].active_placement == NONE &&
         !s.tracks[0].phase);
  assert(std::all_of(left.begin(), left.end(), [](float value) { return value == 0; }));
  assert(std::all_of(right.begin(), right.end(), [](float value) { return value == 0; }));
  std::puts(
      "O=1000 strict-prefix/due automation/end-start-span/held Return/gap/stateful tails=PASS");
}
void receipts_refusal_stop() {
  auto c = authority_fixture(2);
  install(c);
  const auto initial = actions(1, RETURN);
  render(1);
  const auto before = state();
  const auto scene = actions(3, LAUNCH, 0, LAUNCH, 3);
  const auto stopped = actions(1, STOP);
  const auto back = actions(1, RETURN);
  assert(alive_session_base_v2(c.devices[0].document, c.devices[0].revision, 0, 1200));
  assert(alive_session_mixer(1, .5, 0, 0));
  assert(alive_session_bypass_v2(c.devices[1].document, c.devices[1].revision, 1));
  Work measured{};
  work = &measured;
  render(1);
  work = nullptr;
  auto s = state();
  receipt(initial, ALIVE_SESSION_V4_APPLIED, 1);
  receipt(scene, ALIVE_SESSION_V4_MIXED, 0, 1, 0, 2);
  receipt(stopped, ALIVE_SESSION_V4_SUPERSEDED, 0, 1);
  receipt(back, ALIVE_SESSION_V4_REJECTED, 0, 0, 0, 1);
  assert(s.work_rejected == before.work_rejected + 1 && !s.playing);
  for (unsigned t = 0; t < 2; ++t)
    assert(s.tracks[t].active_source == before.tracks[t].active_source &&
           s.tracks[t].authority == before.tracks[t].authority &&
           s.tracks[t].track_epoch == before.tracks[t].track_epoch);
  assert(s.devices[0].base[0] == 1200 && s.devices[0].effective[0] == 1200 &&
         s.devices[1].bypassed);
  assert(s.tracks[1].mixer.gain == .5 && measured.placement[1] == 4 && !measured.cost[1][2]);
  frames(1024);
  request();
  render(1024);
  const auto pending = actions(3, LAUNCH, 0, STOP, NONE);
  render(1);
  const auto later = actions(1, RETURN);
  render(1);
  receipt(pending, ALIVE_SESSION_V4_PENDING, 0, 1, 2);
  receipt(later, ALIVE_SESSION_V4_PENDING, 0, 0, 1);
  assert(state().tracks[0].pending_slot == NONE && state().tracks[1].pending_action == STOP);
  frames(48000 - unsigned(state().position));
  render(1);
  receipt(pending, ALIVE_SESSION_V4_MIXED, 2, 1);
  receipt(later, ALIVE_SESSION_V4_APPLIED, 1);
  assert(state().tracks[1].authority == ALIVE_SESSION_V4_SESSION_AUTHORITY &&
         state().tracks[1].active_source == NONE);
  const auto global = actions(3, RETURN, NONE, RETURN, NONE);
  render(1);
  receipt(global, ALIVE_SESSION_V4_PENDING, 0, 0, 3);
  serial = global.request_serial + 127;
  AliveSessionRequestV4 collision{};
  collision.version = 4;
  collision.struct_bytes = sizeof collision;
  collision.kind = ALIVE_SESSION_V4_START;
  collision.preparation_revision = preparation;
  collision.request_serial = ++serial;
  AliveSessionReceiptV4 out{};
  out.version = 4;
  out.struct_bytes = sizeof out;
  assert(!alive_session_request_v4(&collision, &out) && out.error == ALIVE_SESSION_V4_RECEIPT_BUSY);
  for (unsigned i = 0; i < 64; ++i)
    assert(alive_session_mixer(0, 1, 0, 0));
  collision.request_serial = ++serial;
  assert(!alive_session_request_v4(&collision, &out) && out.error == ALIVE_SESSION_V4_QUEUE_FULL);
  const auto epoch = alive_session_stop_v4();
  render(1024);
  s = state();
  assert(!s.playing && s.applied_stop_epoch == epoch && !s.tracks[0].pending_action &&
         !s.tracks[1].pending_action);
  assert(s.receipts[global.request_serial % 128].canceled_mask == 3 &&
         s.receipts[global.request_serial % 128].error == ALIVE_SESSION_V4_STOP_CANCELED);
  assert(s.tracks[1].authority == ALIVE_SESSION_V4_SESSION_AUTHORITY);
  assert(std::all_of(left.begin(), left.end(), [](float value) { return value == 0; }));
  serial = global.request_serial + 255;
  collision.request_serial = ++serial;
  assert(alive_session_request_v4(&collision, &out));
  render(1);
  assert(state().playing &&
         state().receipts[collision.request_serial % 128].status == ALIVE_SESSION_V4_APPLIED);
  frames(145000 - unsigned(state().position));
  const auto unreachable = actions(3, RETURN, NONE, LAUNCH, 3);
  render(1);
  s = state();
  assert(s.receipts[unreachable.request_serial % 128].canceled_mask == 3 &&
         s.receipts[unreachable.request_serial % 128].error == ALIVE_SESSION_V4_END_CANCELED &&
         s.receipts[unreachable.request_serial % 128].target_frame == ALIVE_SESSION_V4_NO_FRAME);
  std::puts("stopped optional refusal/live controls/member masks/global Return/full queue/receipt "
            "collision/unreachable grid=PASS");
}
uint64_t race_stop = 0, race_start = 0, race_outside = 0, race_fresh = 0;
void boundary_stop() noexcept {
  ultra::alive_session_test_boundary = nullptr;
  race_outside = actions(3, LAUNCH, 0, LAUNCH, 3).request_serial;
  race_stop = alive_session_stop_v4();
  race_start = request().request_serial;
  race_fresh = actions(3, RETURN, NONE, RETURN, NONE).request_serial;
}
void fault_and_race() {
  auto c = authority_fixture();
  install(c);
  request();
  frames(3000);
  const auto old = actions(3, LAUNCH, 0, LAUNCH, 3);
  ultra::alive_session_test_boundary = boundary_stop;
  render(1);
  auto s = state();
  assert(!s.playing && s.applied_stop_epoch == race_stop && s.last_consumed_request < race_outside);
  assert(s.receipts[old.request_serial % 128].canceled_mask == 3);
  render(1);
  s = state();
  assert(s.playing && s.receipts[race_start % 128].status == ALIVE_SESSION_V4_APPLIED);
  assert(s.receipts[race_outside % 128].canceled_mask == 3 &&
         s.receipts[race_fresh % 128].pending_mask == 3);
  frames(48000 - unsigned(s.position));
  const unsigned events = dispatch_count;
  const auto committed = state();
  ultra::alive_session_test_fault_resource = ALIVE_SESSION_V3_RESOURCE_EVENTS;
  render(1024);
  ultra::alive_session_test_fault_resource = 0;
  s = state();
  assert(!s.playing && s.fault == ALIVE_SESSION_V4_RUNTIME_INVARIANT && s.event_faults == 1);
  assert(dispatch_count == events && s.receipts[race_fresh % 128].canceled_mask == 3 &&
         !s.receipts[race_fresh % 128].applied_mask);
  for (unsigned t = 0; t < 2; ++t)
    assert(s.tracks[t].authority == committed.tracks[t].authority &&
           s.tracks[t].active_source == committed.tracks[t].active_source &&
           s.tracks[t].phase == committed.tracks[t].phase);
  assert(std::all_of(left.begin(), left.end(), [](float value) { return value == 0; }));
  std::puts(
      "reserved Stop epoch race/stale requests/atomic due fault/no later-fragment rearm=PASS");
}

void work_curves() {
  auto c = authority_fixture(2);
  auto owner = std::make_unique<ultra::AliveSession>();
  auto proof = std::make_unique<ultra::workspace_admission::Proof>();
  assert(owner->prepare_midi_envelopes_v4(suffix_region_fixture(c), *proof));
  install(c);
  request();
  const auto policy = ultra::clip_admission::policy(c.profile);
  const auto scheduled_frame = ultra::clip_admission::cost(policy.scheduled_frame);
  const auto scheduled_window = ultra::clip_admission::cost(policy.scheduled_window);
  const auto optional = ultra::clip_admission::cost(policy.optional_frame);
  std::vector<Work> observed(146100);
  std::array<uint64_t, 6> peaks{}, windows{};
  for (unsigned frame = 0; frame < observed.size(); ++frame) {
    if (frame == 3000)
      actions(1, LAUNCH, 0);
    if (frame == 48001)
      actions(1, RETURN);
    if (frame == 96001)
      actions(1, STOP);
    if (frame == 145000)
      actions(3, RETURN, NONE, RETURN, NONE);
    work = &observed[frame];
    const auto before = state();
    const auto reads = ultra::alive_session_test_reconstruction_reads;
    const auto preview = ultra::alive_session_test_preview_reads;
    const auto events = dispatch_count;
    render(1);
    const auto after = state();
    assert(!after.fault && dispatch_count - events == work->cost[0][0]);
    assert(ultra::alive_session_test_reconstruction_reads - reads <=
           work->cost[0][2] + work->cost[1][2]);
    assert(ultra::alive_session_test_preview_reads - preview <= 128);
    unsigned roots = 0;
    for (unsigned t = 0; t < 2; ++t)
      roots += (after.tracks[t].track_epoch - before.tracks[t].track_epoch) * 3;
    assert(roots <= work->cost[0][1] + work->cost[1][1] + work->cost[2][1]);
    bool charged = false;
    for (unsigned m = 0; m < 5; ++m) {
      assert(work->cost[0][m] <= (m ? scheduled_frame[m] : 32));
      assert(!m || work->cost[1][m] <= optional[m]);
      peaks[m] = std::max(peaks[m], work->cost[0][m]);
      charged |= bool(work->cost[0][m] || work->cost[1][m]);
    }
    assert(work->placement[0] <= 64 && work->placement[1] <= 2114);
    peaks[5] = std::max(peaks[5], work->placement[0]);
    charged |= bool(work->placement[0] || work->placement[1]);
    // With nonnegative charges every maximum window ends at a charged frame.
    if (charged) {
      Cost scheduled{}, unscheduled{};
      uint64_t placement = 0, optional_placement = 0;
      for (unsigned width = 1; width <= std::min(1024u, frame + 1); ++width) {
        const auto &old = observed[frame + 1 - width];
        scheduled = ultra::clip_admission::add(scheduled, old.cost[0]);
        unscheduled = ultra::clip_admission::add(unscheduled, old.cost[1]);
        placement += old.placement[0];
        optional_placement += old.placement[1];
        for (unsigned m = 0; m < 5; ++m) {
          assert(scheduled[m] <= proof->prepared.future[m][width]);
          assert(scheduled[m] <= (m ? scheduled_window[m] : 64));
          assert(!m || unscheduled[m] <= optional[m]);
          windows[m] = std::max(windows[m], scheduled[m]);
        }
        assert(placement <= proof->placement[width] && placement <= 512 &&
               optional_placement <= 2114);
        windows[5] = std::max(windows[5], placement);
      }
    }
  }
  work = nullptr;
  std::printf(
      "authority work six roots actual-frame/admitted-frame actual-window/admitted-window:");
  for (unsigned m = 0; m < 6; ++m) {
    const auto &curve = m == 5 ? proof->placement : proof->prepared.future[m];
    std::printf(" %llu/%llu,%llu/%llu", (unsigned long long)peaks[m], (unsigned long long)curve[1],
                (unsigned long long)windows[m], (unsigned long long)curve[1024]);
  }
  std::puts("");
  if (const auto dir = std::getenv("ALIVE_AUTHORITY_EVIDENCE")) {
    const auto path = std::string(dir) + "/work.tsv";
    FILE *file = std::fopen(path.c_str(), "w");
    assert(file);
    for (unsigned frame = 0; frame < observed.size(); ++frame) {
      const auto &w = observed[frame];
      bool nonzero = false;
      for (const auto &cost : w.cost)
        for (auto amount : cost)
          nonzero |= bool(amount);
      nonzero |= bool(w.placement[0] || w.placement[1]);
      if (!nonzero)
        continue;
      std::fprintf(file, "%u", frame);
      for (const auto &cost : w.cost)
        for (auto amount : cost)
          std::fprintf(file, "\t%llu", (unsigned long long)amount);
      for (auto amount : w.placement)
        std::fprintf(file, "\t%llu", (unsigned long long)amount);
      for (auto amount : w.probes)
        std::fprintf(file, "\t%llu", (unsigned long long)amount);
      std::fprintf(file, "\n");
    }
    assert(std::fclose(file) == 0);
  }
}
// Explicit instantiation permits test-only access to inject identity exhaustion
// and retained ledger pressure without adding a production API or test setter.
template <class Tag, typename Tag::Type Member> struct Access {
  friend typename Tag::Type access(Tag) { return Member; }
};
struct StopEpoch {
  using Type = std::atomic<uint64_t> ultra::AliveSession::*;
  friend Type access(StopEpoch);
};
struct Scheduled {
  using Type = ultra::clip_admission::Ledger ultra::AliveSession::*;
  friend Type access(Scheduled);
};
template struct Access<StopEpoch, &ultra::AliveSession::stop_epoch_>;
template struct Access<Scheduled, &ultra::AliveSession::scheduled_>;
void saturation_and_first_sample() {
  for (bool saturation : {false, true}) {
    auto c = authority_fixture();
    auto owner = std::make_unique<ultra::AliveSession>();
    auto workspace = std::make_unique<ultra::CanvasWorkspace>();
    auto emit = [](alive::Event) { return true; };
    for (unsigned d = 0; d < 2; ++d) {
      UltraCanvasGraph graph{};
      AliveSessionDeviceV2 descriptor{};
      saved_0(graph, descriptor);
      graph.revision = c.devices[d].revision;
      ultra::CanvasPlan plan{};
      assert(ultra::compile_canvas(graph, plan) && workspace->install(d, plan, 0, emit));
    }
    assert(owner->configure_v4(suffix_region_fixture(c), nullptr, 0, *workspace));
    AliveSessionRequestV4 r{};
    r.version = 4;
    r.struct_bytes = sizeof r;
    r.preparation_revision = c.preparation_revision;
    AliveSessionReceiptV4 out{};
    out.version = 4;
    out.struct_bytes = sizeof out;
    r.request_serial = 1;
    r.kind = ALIVE_SESSION_V4_START;
    if (saturation) {
      (owner.get()->*access(StopEpoch{})).store(UINT64_MAX - 1);
      assert(owner->stop() == UINT64_MAX && owner->stop() == UINT64_MAX);
      assert(!owner->request_v4(r, out) && out.error == ALIVE_SESSION_V4_STALE_REQUEST);
      owner->begin(*workspace);
      owner->sample(*workspace);
      owner->publish(*workspace);
      AliveSessionStateV4 s{};
      s.version = 4;
      s.struct_bytes = sizeof s;
      assert(owner->snapshot_v4(s));
      assert(!s.playing && s.applied_stop_epoch == UINT64_MAX);
      r.request_serial = UINT64_MAX;
      assert(!owner->request_v4(r, out) && out.error == ALIVE_SESSION_V4_STALE_REQUEST);
    } else {
      // Only one event remains in this frame. Final due Launch needs a chase
      // from source 1, although the initial Arrangement source would differ.
      (owner.get()->*access(Scheduled{})).charge(0, Cost{31, 0, 0, 0, 0});
      assert(owner->request_v4(r, out));
      r.request_serial = 2;
      r.kind = ALIVE_SESSION_V4_TRACK_ACTIONS;
      r.track_mask = 1;
      r.tracks[0] = {LAUNCH, 0};
      assert(owner->request_v4(r, out));
      Work measured{};
      work = &measured;
      const auto reads = ultra::alive_session_test_reconstruction_reads;
      owner->begin(*workspace);
      owner->sample(*workspace);
      owner->publish(*workspace);
      work = nullptr;
      AliveSessionStateV4 s{};
      s.version = 4;
      s.struct_bytes = sizeof s;
      assert(owner->snapshot_v4(s));
      assert(!s.playing && !s.fault && s.receipts[1].status == ALIVE_SESSION_V4_REJECTED &&
             s.receipts[2].rejected_mask == 1);
      assert(s.tracks[0].authority == ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY &&
             s.tracks[0].active_slot == NONE);
      assert(measured.cost[1][4] == ultra::clip_admission::HorizonSteps &&
             measured.placement[1] == 2058);
      assert(!measured.cost[1][1] && !measured.cost[1][2] &&
             ultra::alive_session_test_reconstruction_reads == reads);
      std::printf("first-sample refusal guard=%llu placement=%llu reconstruction=0\n",
                  (unsigned long long)measured.cost[1][4],
                  (unsigned long long)measured.placement[1]);
    }
  }
  std::puts(
      "serial/Stop epoch saturation/final first-sample admission/rejected expensive guard=PASS");
}
void pending_slot_boundaries() {
  auto c = pending_boundary_fixture();
  install(c);
  request();
  frames(3000);
  const auto launch = actions(2, 0, 0, LAUNCH, 3);
  const auto target = trace_origin + 48000;
  for (unsigned position : {3001u, 9999u, 10000u, 10001u, 19999u, 20000u, 20001u, 29999u, 30000u,
                            30001u, 47999u, 48000u}) {
    frames(position - unsigned(state().position));
    const auto s = state();
    const auto &tr = s.tracks[1];
    const auto &r = s.receipts[launch.request_serial % 128];
    std::printf("pending boundary position=%u action=%u slot=%u serial=%llu target=%llu "
                "placement=%u receipt_pending=%u\n",
                position, tr.pending_action, tr.pending_slot, (unsigned long long)tr.pending_serial,
                (unsigned long long)tr.pending_frame, tr.active_placement, r.pending_mask);
    assert(tr.authority == ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY);
    assert(tr.pending_action == LAUNCH && tr.pending_slot == 5 &&
           tr.pending_serial == launch.request_serial && tr.pending_frame == target);
    assert(r.request_serial == launch.request_serial && r.status == ALIVE_SESSION_V4_PENDING &&
           r.pending_mask == 2 && r.target_frame == target &&
           r.observed_frame == trace_origin + 3000 && !r.applied_mask && !r.canceled_mask &&
           !r.superseded_mask && !r.rejected_mask);
    const unsigned placement = position <= 10000   ? 3
                               : position <= 20000 ? 4
                               : position <= 30000 ? NONE
                                                   : 5;
    assert(tr.active_placement == placement && tr.active_source == (placement == NONE ? NONE : 2));
    if (placement == NONE)
      assert(tr.phase == 0);
  }
  const auto before = state();
  render(1);
  const auto s = state();
  const auto &tr = s.tracks[1];
  assert(s.position == 48001 && tr.authority == ALIVE_SESSION_V4_SESSION_AUTHORITY &&
         tr.active_slot == 5 && tr.active_source == 3 && tr.active_placement == NONE &&
         tr.phase == 1001 && tr.track_epoch == before.tracks[1].track_epoch + 1);
  assert(!tr.pending_action && tr.pending_slot == NONE && !tr.pending_serial &&
         tr.pending_frame == ALIVE_SESSION_V4_NO_FRAME);
  receipt(launch, ALIVE_SESSION_V4_APPLIED, 2);
  assert(s.receipts[launch.request_serial % 128].target_frame == target);
  std::puts("pending local3/global5 survives adjacent occurrence, gap entry/exit and applies at "
            "48000=PASS");
}
void bounded_reduction_and_coherence() {
  auto c = pending_boundary_fixture();
  install(c);
  std::array<AliveSessionReceiptV4, 64> queued{};
  for (unsigned i = 0; i < 64; ++i)
    queued[i] = actions(1, i % 3 == 0 ? LAUNCH : i % 3 == 1 ? STOP : RETURN, i % 3 == 0 ? 0 : NONE);
  Work measured{};
  work = &measured;
  render(1);
  work = nullptr;
  for (unsigned i = 0; i < 63; ++i)
    receipt(queued[i], ALIVE_SESSION_V4_SUPERSEDED, 0, 1);
  receipt(queued[63], ALIVE_SESSION_V4_APPLIED, 1);
  assert(measured.probes[1] == 0 && measured.placement[1] == 0);
  // A final Return does one lookup after the whole 64-command reduction.
  for (unsigned i = 0; i < 64; ++i)
    queued[i] = actions(1, RETURN);
  measured = {};
  work = &measured;
  render(1);
  work = nullptr;
  assert(measured.probes[1] <= 4 && measured.placement[1] == 2054);
  frames(1024);
  std::atomic<bool> done{false};
  std::atomic<unsigned> reads{0};
  std::atomic<unsigned> playing_pending_reads{0}, boundary_reads{0}, applied_reads{0};
  std::atomic<uint64_t> expected_serial{0}, expected_target{0};
  std::thread reader([&] {
    while (!done.load()) {
      AliveSessionStateV4 s{};
      s.version = 4;
      s.struct_bytes = sizeof s;
      if (!alive_session_state_v4(&s))
        continue;
      assert(s.preparation_revision == c.preparation_revision && s.source_count == 4 &&
             s.slot_count == 6);
      for (unsigned t = 0; t < 2; ++t) {
        const auto &tr = s.tracks[t];
        assert(tr.authority == ALIVE_SESSION_V4_SESSION_AUTHORITY ||
               tr.authority == ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY);
        if (tr.authority == ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY)
          assert(tr.active_slot == NONE);
        if (tr.active_source == NONE)
          assert(tr.phase == 0 && tr.active_slot == NONE && tr.active_placement == NONE);
        if (tr.active_slot != NONE)
          assert(tr.active_slot < c.slot_count && c.slots[tr.active_slot].track == t &&
                 c.slots[tr.active_slot].source == tr.active_source);
        if (tr.pending_action) {
          const auto &r = s.receipts[tr.pending_serial % 128];
          assert(r.request_serial == tr.pending_serial && r.pending_mask & (1u << t));
          assert(tr.pending_frame == r.target_frame);
          assert(tr.pending_action == LAUNCH ? tr.pending_slot < c.slot_count
                                             : tr.pending_slot == NONE);
          if (s.playing && t == 1) {
            assert(tr.pending_action == LAUNCH && tr.pending_slot == 5 &&
                   tr.pending_serial == expected_serial.load() &&
                   tr.pending_frame == expected_target.load());
            ++playing_pending_reads;
            if (s.position >= 10001 && s.position <= 20000)
              boundary_reads.fetch_or(1);
            if (s.position >= 20001 && s.position <= 30000)
              boundary_reads.fetch_or(2);
            if (s.position >= 30001 && s.position <= 48000)
              boundary_reads.fetch_or(4);
          }
        } else
          assert(tr.pending_slot == NONE && tr.pending_frame == ALIVE_SESSION_V4_NO_FRAME);
      }
      const auto serial = expected_serial.load();
      if (serial && s.receipts[serial % 128].request_serial == serial &&
          s.receipts[serial % 128].applied_mask == 2) {
        assert(s.position == 48001 && s.tracks[1].active_slot == 5 &&
               s.tracks[1].active_source == 3 && s.tracks[1].phase == 1001);
        ++applied_reads;
      }
      ++reads;
    }
  });
  for (unsigned i = 0; i < 40; ++i) {
    actions(3, LAUNCH, i % 2, LAUNCH, 3);
    render(1);
    actions(3, STOP, NONE, RETURN, NONE);
    frames(1024);
    actions(3, RETURN, NONE, RETURN, NONE);
    frames(1024);
  }
  request();
  frames(3000);
  const auto launch = actions(2, 0, 0, LAUNCH, 3);
  expected_target = state().absolute_frame + 45000;
  expected_serial = launch.request_serial;
  auto await_read = [](auto predicate) {
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(5);
    while (!predicate()) {
      assert(std::chrono::steady_clock::now() < deadline);
      std::this_thread::yield();
    }
  };
  for (unsigned i = 0; i < 3; ++i) {
    frames((i + 1) * 10000 + 1 - unsigned(state().position));
    await_read([&] { return boundary_reads.load() & (1u << i); });
  }
  frames(48001 - unsigned(state().position));
  await_read([&] { return applied_reads.load() > 0; });
  done = true;
  reader.join();
  assert(reads > 0);
  assert(playing_pending_reads > 0 && boundary_reads == 7 && applied_reads > 0);
  std::printf("concurrent playing pending reads=%u boundary_mask=%u applied_reads=%u\n",
              playing_pending_reads.load(), boundary_reads.load(), applied_reads.load());
  std::puts("64-command final-only lookup/coherent authority-slot-source-receipt publication=PASS");
}
void action_validation() {
  auto c = authority_fixture();
  install(c);
  AliveSessionRequestV4 r{};
  r.version = 4;
  r.struct_bytes = sizeof r;
  r.kind = ALIVE_SESSION_V4_TRACK_ACTIONS;
  r.preparation_revision = preparation;
  r.track_mask = 2;
  r.tracks[1] = {LAUNCH, 1};
  AliveSessionReceiptV4 out{};
  out.version = 4;
  out.struct_bytes = sizeof out;
  auto reject = [&](unsigned error) {
    r.request_serial = ++serial;
    assert(!alive_session_request_v4(&r, &out) && out.error == error);
  };
  reject(ALIVE_SESSION_V4_EMPTY_SLOT);
  r.tracks[1] = {RETURN, 0};
  reject(ALIVE_SESSION_V4_BAD_FIELD);
  r.tracks[1] = {STOP, 0};
  reject(ALIVE_SESSION_V4_BAD_FIELD);
  r.tracks[1] = {LAUNCH, 5};
  reject(ALIVE_SESSION_V4_BAD_FIELD);
  r.tracks[1] = {99, NONE};
  reject(ALIVE_SESSION_V4_BAD_FIELD);
  r.tracks[1] = {RETURN, NONE};
  r.track_mask = 6;
  reject(ALIVE_SESSION_V4_BAD_FIELD);
  r.track_mask = 2;
  r.tracks[0] = {RETURN, NONE};
  reject(ALIVE_SESSION_V4_BAD_FIELD);
  r.tracks[0] = {};
  r.position = 1;
  reject(ALIVE_SESSION_V4_BAD_FIELD);
  r.position = 0;
  r.preparation_revision = preparation - 1;
  reject(ALIVE_SESSION_V4_STALE_PREPARATION);
  assert(!state().last_consumed_request);
  std::puts("empty/cross-track slot token/malformed action/mask/stale revision ingress=PASS");
}

void sparse_eight_and_denied_density() {
  auto c = multi(8);
  install(c);
  AliveSessionRequestV4 r{};
  r.version = 4;
  r.struct_bytes = sizeof r;
  r.kind = ALIVE_SESSION_V4_TRACK_ACTIONS;
  r.preparation_revision = preparation;
  r.request_serial = ++serial;
  r.track_mask = 255;
  for (auto &action : r.tracks)
    action = {STOP, NONE};
  r.tracks[0] = {LAUNCH, 1};
  AliveSessionReceiptV4 out{};
  out.version = 4;
  out.struct_bytes = sizeof out;
  assert(alive_session_request_v4(&r, &out));
  request();
  render(1024);
  auto s = state();
  assert(s.playing && s.receipts[r.request_serial % 128].applied_mask == 255);
  assert(s.tracks[0].active_source == 1);
  for (unsigned t = 1; t < 8; ++t)
    assert(s.tracks[t].authority == ALIVE_SESSION_V4_SESSION_AUTHORITY &&
           s.tracks[t].active_source == NONE);
  const auto epoch = alive_session_stop_v4();
  render(1024);
  assert(state().applied_stop_epoch == epoch);
  r.request_serial = ++serial;
  for (auto &action : r.tracks)
    action = {RETURN, NONE};
  assert(alive_session_request_v4(&r, &out));
  render(1);
  s = state();
  assert(!s.playing && s.receipts[r.request_serial % 128].applied_mask == 255);
  for (unsigned t = 0; t < 8; ++t)
    assert(s.tracks[t].authority == ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY);
  c.slot_count = 32;
  for (unsigned t = 2; t < 8; ++t)
    for (unsigned i = 0; i < 4; ++i) {
      c.tracks[t].slots[i] = t * 4 + i;
      c.slots[t * 4 + i] = {t, t * 2 + i % 2, 0, 0, i * 100u,0,0,0};
    }
  assert(!validate_suffix_fixture(&c));
  AliveSessionDiagnosticV4 d{};
  d.version = 4;
  d.struct_bytes = sizeof d;
  assert(alive_session_diagnostic_v4(&d) && d.resource == 6 && d.observed == 66 && d.limit == 64);
  if (const auto dir = std::getenv("ALIVE_AUTHORITY_EVIDENCE")) {
    const auto path = std::string(dir) + "/refused-eight-track-32-slots.bin";
    FILE *file = std::fopen(path.c_str(), "wb");
    assert(file);
    assert(std::fwrite(&c, sizeof c, 1, file) == 1 && std::fwrite(&d, sizeof d, 1, file) == 1);
    assert(std::fclose(file) == 0);
  }
  std::puts("sparse eight-track atomic scene/global Return=PASS; dense 32-slot fixture refused "
            "placement 66/64");
}
void exact_combined_batch() {
  for (unsigned retained : {28u, 29u}) {
    auto c = authority_fixture();
    c.sources[1].event_begin = 1;
    c.sources[1].event_count = 4;
    c.events[1] = {0, 0, ALIVE_SESSION_NOTE_ON, 0, 61, 90};
    c.events[2] = {0, 0, ALIVE_SESSION_NOTE_ON, 0, 64, 90};
    c.events[3] = {1000, 0, ALIVE_SESSION_NOTE_OFF, 0, 61, 0};
    c.events[4] = {1000, 0, ALIVE_SESSION_NOTE_ON, 0, 60, 90};
    c.events[5] = {0, 1, ALIVE_SESSION_NOTE_ON, 1, 50, 80};
    c.events[6] = {0, 1, ALIVE_SESSION_NOTE_ON, 1, 51, 80};
    c.sources[2].event_begin = 5;
    c.sources[3].event_begin = 6;
    c.event_count = 7;
    auto owner = std::make_unique<ultra::AliveSession>();
    auto workspace = std::make_unique<ultra::CanvasWorkspace>();
    auto emit = [](alive::Event) { return true; };
    for (unsigned d = 0; d < 2; ++d) {
      UltraCanvasGraph graph{};
      AliveSessionDeviceV2 descriptor{};
      saved_0(graph, descriptor);
      graph.revision = c.devices[d].revision;
      ultra::CanvasPlan plan{};
      assert(ultra::compile_canvas(graph, plan) && workspace->install(d, plan, 0, emit));
    }
    assert(owner->configure_v4(suffix_region_fixture(c), nullptr, 0, *workspace));
    AliveSessionRequestV4 r{};
    r.version = 4;
    r.struct_bytes = sizeof r;
    r.kind = 1;
    r.request_serial = 1;
    r.preparation_revision = c.preparation_revision;
    AliveSessionReceiptV4 out{};
    out.version = 4;
    out.struct_bytes = sizeof out;
    assert(owner->request_v4(r, out));
    owner->begin(*workspace);
    owner->sample(*workspace);
    owner->advance(*workspace, 0, 0);
    r.kind = 3;
    r.track_mask = 3;
    r.request_serial = 2;
    r.tracks[0] = {LAUNCH, 0};
    r.tracks[1] = {LAUNCH, 3};
    assert(owner->request_v4(r, out));
    owner->begin(*workspace);
    for (unsigned frame = 1; frame < 48000; ++frame) {
      owner->sample(*workspace);
      owner->advance(*workspace, 0, 0);
    }
    (owner.get()->*access(Scheduled{})).charge(48000, Cost{retained, 0, 0, 0, 0});
    const auto before = dispatch_count;
    owner->sample(*workspace);
    owner->publish(*workspace);
    AliveSessionStateV4 s{};
    s.version = 4;
    s.struct_bytes = sizeof s;
    assert(owner->snapshot_v4(s));
    if (retained == 28) {
      assert(s.playing && !s.fault && dispatch_count - before == 4 &&
             s.receipts[2].applied_mask == 3);
      assert(s.tracks[0].active_source == 1 && s.tracks[1].active_slot == 5);
    } else {
      assert(!s.playing && s.fault == ALIVE_SESSION_V4_RUNTIME_INVARIANT &&
             dispatch_count == before);
      assert(s.receipts[2].canceled_mask == 3 && !s.receipts[2].applied_mask);
      assert(s.tracks[0].authority == ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY &&
             s.tracks[0].active_source == 0);
    }
  }
  std::puts("combined chased/ordinary events: retained28+batch4=32 accepted; retained29+batch4=33 "
            "atomic refusal=PASS");
}
AliveSessionReceiptV4 seek(uint64_t position, bool expected = true) {
  AliveSessionRequestV4 r{};
  r.version = 4;
  r.struct_bytes = sizeof r;
  r.kind = ALIVE_SESSION_V4_SEEK;
  r.preparation_revision = preparation;
  r.request_serial = ++serial;
  r.position = position;
  AliveSessionReceiptV4 out{};
  out.version = 4;
  out.struct_bytes = sizeof out;
  assert(bool(alive_session_request_v4(&r, &out)) == expected);
  return out;
}
AliveSessionConfigV4 suffix_fixture(unsigned effects = 0) {
  auto c = prepare(effects);
  c.length_frames = c.loop_end = 12000;
  c.sources[0].length_frames = 2000;
  c.sources[0].event_count = c.event_count = 8;
  c.sources[0].lane_count = c.sources[0].owned_masks[0] = 1;
  c.devices[0].parameters[0].automated = 1;
  c.events[0] = {0, 0, ALIVE_SESSION_NOTE_ON, 0, 61, 100};
  c.events[1] = {0, 0, ALIVE_SESSION_NOTE_ON, 0, 64, 100};
  c.events[2] = {100, 0, ALIVE_SESSION_AUTOMATION, 0, 0, 1000};
  c.events[3] = {400, 0, ALIVE_SESSION_NOTE_OFF, 0, 61, 0};
  c.events[4] = {400, 0, ALIVE_SESSION_AUTOMATION, 0, 0, 2000};
  c.events[5] = {400, 0, ALIVE_SESSION_NOTE_ON, 0, 60, 90};
  c.events[6] = {700, 0, ALIVE_SESSION_NOTE_OFF, 0, 64, 0};
  c.events[7] = {900, 0, ALIVE_SESSION_NOTE_OFF, 0, 60, 0};
  c.slot_count = 1;
  c.tracks[0].slots[3] = 0;
  c.slots[0] = {0, 0, 1, 0, 400,0,0,0};
  c.placements[0] = {0, 0, 1, 0, 0, 3500, 400,0,0,0};
  c.placements[1] = {0, 0, 1, 0, 3500, 2100, 400,0,0,0};
  return c;
}
AudioRun suffix_playback(unsigned partition, unsigned effects = 0, bool session = false) {
  auto c = suffix_fixture(effects);
  install(c);
  if (session)
    actions(1, LAUNCH, 3);
  request();
  AudioRun out;
  frames(6000, partition, &out.pcm);
  const auto s = state();
  assert(s.playing && !s.fault);
  if (session) {
    assert(s.tracks[0].active_slot == 0 && s.tracks[0].phase == 1600);
    assert(s.tracks[0].authority == ALIVE_SESSION_V4_SESSION_AUTHORITY);
  } else {
    assert(s.tracks[0].active_source == NONE && !s.tracks[0].phase);
    assert(std::all_of(out.pcm.begin() + 11200, out.pcm.end(), [](float v) { return v == 0; }));
    assert(std::none_of(dispatches.begin(), dispatches.begin() + dispatch_count,
                        [](const Dispatch &e) { return e.frame == 5600; }));
  }
  const unsigned kinds[]{ALIVE_SESSION_NOTE_OFF, ALIVE_SESSION_AUTOMATION,
                         ALIVE_SESSION_NOTE_ON, ALIVE_SESSION_NOTE_ON};
  const unsigned pitches[]{61, 0, 64, 60};
  for (unsigned seam : session ? std::vector<unsigned>{0, 1600, 3200, 4800}
                               : std::vector<unsigned>{0, 1600, 3200, 3500, 5100}) {
    auto it = std::find_if(dispatches.begin(), dispatches.begin() + dispatch_count,
                           [=](const Dispatch &e) { return e.frame == seam; });
    assert(it != dispatches.begin() + dispatch_count);
    for (unsigned j = 0; j < 4; ++j) {
      assert(it[j].frame == seam && it[j].kind == kinds[j] && it[j].pitch == pitches[j]);
      assert(it[j].occurrence == (session ? NONE : seam < 3500 ? 0u : 1u));
    }
    // Every real instrument/effect root restarts to the identical audible state.
    for (unsigned i = 0; i < 200; ++i)
      assert(out.pcm[i] == out.pcm[seam * 2 + i]);
  }
  out.events.assign(dispatches.begin(), dispatches.begin() + dispatch_count);
  return out;
}
AudioRun seek_continuity(unsigned partition, unsigned effects, bool change, bool looping = false) {
  auto c = authority_fixture(effects);
  if (looping) {
    for (unsigned s = 0; s < 4; ++s)
      c.sources[s].length_frames = s < 2 ? 2000 : 2301;
    for (unsigned i = 0; i < c.slot_count; ++i) {
      c.slots[i].start_marker = 400;
      c.slots[i].loop_enabled = 1;
    }
    for (unsigned i = 0; i < c.placement_count; ++i) {
      c.placements[i].start_marker = 400;
      c.placements[i].loop_enabled = 1;
    }
  }
  c.tracks[0].mute = 1;
  install(c);
  actions(2, 0, 0, LAUNCH, 3);
  request();
  AudioRun out;
  frames(2048, partition, &out.pcm);
  unsigned elapsed = 2048;
  for (unsigned position : {2000u, 48000u, 125000u, 0u}) {
    const auto before = state().tracks[1];
    if (change)
      seek(position);
    frames(2048, partition, &out.pcm);
    const auto after = state().tracks[1];
    assert(after.active_slot == 5 && after.active_source == 3 &&
           after.phase == (looping ? 400 + (elapsed + 2048) % 1901 : before.phase + 2048));
    assert(after.track_epoch == before.track_epoch +
           (looping ? (elapsed + 2047) / 1901 - (elapsed - 1) / 1901 : 0));
    elapsed += 2048;
    if (change)
      assert(state().position == position + 2048);
  }
  out.events.assign(dispatches.begin(), dispatches.begin() + dispatch_count);
  return out;
}
void seek_reduction() {
  auto c = authority_fixture();
  install(c);
  request();
  frames(2048);
  Work measured{};
  work = &measured;
  std::array<AliveSessionReceiptV4, 64> requests{};
  for (unsigned i = 0; i < 64; ++i)
    requests[i] = seek(i == 63 ? 2000 : i % 2 ? 48000 : 125000);
  render(1);
  work = nullptr;
  assert(state().position == 2001 && measured.probes[1] == 3 && measured.placement[1] == 2058);
  for (unsigned i = 0; i < 64; ++i)
    receipt(requests[i], i == 63 ? ALIVE_SESSION_V4_APPLIED : ALIVE_SESSION_V4_SUPERSEDED, 0);
  frames(2048);
  const auto before = state();
  seek(0);
  const auto launch = actions(1, LAUNCH, 0);
  measured = {};
  work = &measured;
  const auto events = dispatch_count;
  render(1);
  work = nullptr;
  // The final due Launch replaces track zero's Seek resolution entirely.
  assert(measured.probes[1] == 1 && measured.placement[1] == 2054);
  assert(state().tracks[0].active_source == 1 && state().tracks[0].phase == 1001 &&
         state().tracks[0].track_epoch == before.tracks[0].track_epoch + 1);
  assert(dispatches[events].source == 1 && dispatches[events].pitch == 49);
  receipt(launch, ALIVE_SESSION_V4_APPLIED, 1);
}
void minimum_suffixes() {
  for (unsigned tempo : {120u, 240u}) {
    const unsigned period = tempo == 120 ? 375 : 188;
    auto c = suffix_fixture();
    c.tempo_bpm = tempo;
    c.sources[0].length_frames = 400 + period;
    c.sources[0].event_count = c.event_count = 1;
    c.sources[0].owned_masks[0] = c.sources[0].lane_count = 0;
    c.devices[0].parameters[0].automated = 0;
    std::fill(c.events + 1, c.events + 1024, AliveSessionEventV2{});
    auto bad = c;
    --bad.sources[0].length_frames;
    assert(!validate_suffix_fixture(&bad));
    if (const auto dir = std::getenv("ALIVE_AUTHORITY_EVIDENCE")) {
      const auto path = std::string(dir) + "/refused-suffix-" + std::to_string(tempo) + ".bin";
      FILE *file = std::fopen(path.c_str(), "wb");
      assert(file && std::fwrite(&bad, sizeof bad, 1, file) == 1);
      assert(std::fclose(file) == 0);
    }
    install(c);
    request();
    frames(period);
    const auto before = state().tracks[0].track_epoch;
    render(1);
    assert(state().tracks[0].phase == 401 && state().tracks[0].track_epoch == before + 1);
    assert(dispatches[dispatch_count - 1].frame == period);
    alive_session_stop_v4();
    render(1);
    assert(!state().playing && left[0] == 0 && right[0] == 0);
    ultra_audio_stop();
    assert(alive_session_reset());
    assert(ultra_external_start());
    render(32);
    assert(std::all_of(left.begin(), left.begin() + 32, [](float v) { return v == 0; }));
  }
  std::puts("tempo minimum suffixes 375/120BPM and188/240BPM; shorter refused; Stop/removal silent=PASS");
}
void seek_boundaries() {
  const auto c = suffix_fixture(2);
  install(c);
  request();
  frames(2048);
  for (unsigned position : {200u, 1600u, 3500u, 6000u}) {
    const auto before = state().tracks[0].track_epoch;
    const auto events = dispatch_count;
    const auto accepted = seek(position);
    render(1);
    const auto s = state();
    receipt(accepted, ALIVE_SESSION_V4_APPLIED, 0);
    assert(s.position == position + 1 && s.tracks[0].track_epoch == before + 1);
    if (position == 6000) {
      assert(s.tracks[0].active_source == NONE && !s.devices[0].owned[0]);
      assert(dispatch_count == events && left[0] == 0 && right[0] == 0);
    } else {
      assert(s.tracks[0].active_placement == (position == 3500 ? 1u : 0u));
      assert(s.tracks[0].phase == (position == 200 ? 601u : 401u));
      assert(s.devices[0].effective[0] == 2000);
      assert(dispatch_count - events == (position == 200 ? 2u : 4u));
    }
    frames(2048);
  }
  assert(seek(c.length_frames, false).error == ALIVE_SESSION_V4_BAD_FIELD);
  assert(seek(UINT64_MAX, false).error == ALIVE_SESSION_V4_BAD_FIELD);
  alive_session_stop_v4();
  render(1);
  actions(1, LAUNCH, 3);
  render(1);
  const auto cue = state().tracks[0];
  seek(3500);
  render(1);
  assert(!state().playing && state().tracks[0].active_slot == cue.active_slot &&
         state().tracks[0].phase == cue.phase && state().tracks[0].track_epoch == cue.track_epoch);
  std::puts("Seek held/source seam/placement boundary/gap/range/stopped Session cue=PASS");
}
void seek_ended_cue() {
  auto c = suffix_fixture();
  c.slots[0].loop_enabled = 0;
  install(c);
  actions(1, LAUNCH, 3);
  request();
  frames(2048);
  auto ended = state().tracks[0];
  assert(ended.authority == ALIVE_SESSION_V4_SESSION_AUTHORITY && ended.active_source == NONE);
  seek(6000);
  render(1);
  assert(state().tracks[0].active_source == NONE && state().tracks[0].phase == 0 &&
         state().tracks[0].track_epoch == ended.track_epoch);
  frames(5999);
  assert(!state().playing);
  request();
  render(1);
  assert(state().playing && state().tracks[0].active_slot == 0 && state().tracks[0].phase == 401);
  std::puts("Seek retains ended one-shot silence and private restart cue=PASS");
}
void suffix_work_curves() {
  auto c = suffix_fixture(2);
  auto owner = std::make_unique<ultra::AliveSession>();
  auto proof = std::make_unique<ultra::workspace_admission::Proof>();
  assert(owner->prepare_midi_envelopes_v4(suffix_region_fixture(c), *proof));
  install(c);
  request();
  std::vector<Work> observed(10000);
  std::array<uint64_t, 6> peak{}, window{};
  const auto policy = ultra::clip_admission::policy(c.profile);
  const auto optional = ultra::clip_admission::cost(policy.optional_frame);
  for (unsigned frame = 0; frame < observed.size(); ++frame) {
    if (frame == 2300) seek(1600);
    if (frame == 4500) seek(3500);
    if (frame == 6700) seek(200);
    work = &observed[frame];
    const auto before = state().tracks[0].track_epoch;
    const auto events = dispatch_count;
    const auto reads = ultra::alive_session_test_reconstruction_reads;
    const auto previews = ultra::alive_session_test_preview_reads;
    render(1);
    assert(!state().fault && dispatch_count - events == work->cost[0][0]);
    assert(ultra::alive_session_test_reconstruction_reads - reads <= work->cost[0][2] + work->cost[1][2]);
    assert(ultra::alive_session_test_preview_reads - previews <= 128);
    assert(state().tracks[0].track_epoch - before <= 1);
    assert((state().tracks[0].track_epoch - before) * 3 <= work->cost[0][1] + work->cost[1][1]);
    bool charged = work->placement[0] || work->placement[1];
    for (const auto &family : work->cost)
      for (auto value : family) charged |= value != 0;
    if (!charged) continue;
    Cost scheduled{}, unscheduled{};
    uint64_t placement = 0, optional_placement = 0;
    for (unsigned width = 1; width <= std::min(1024u, frame + 1); ++width) {
      const auto &old = observed[frame + 1 - width];
      scheduled = ultra::clip_admission::add(scheduled, old.cost[0]);
      unscheduled = ultra::clip_admission::add(unscheduled, old.cost[1]);
      placement += old.placement[0];
      optional_placement += old.placement[1];
      for (unsigned m = 0; m < 5; ++m) {
        assert(scheduled[m] <= proof->prepared.future[m][width]);
        assert(!m || unscheduled[m] <= optional[m]);
        if (width == 1) peak[m] = std::max(peak[m], scheduled[m]);
        window[m] = std::max(window[m], scheduled[m]);
      }
      assert(placement <= proof->placement[width] && optional_placement <= 2114);
      if (width == 1) peak[5] = std::max(peak[5], placement);
      window[5] = std::max(window[5], placement);
    }
  }
  work = nullptr;
  std::printf("suffix/Seek actual-frame/admitted-frame actual-window/admitted-window:");
  for (unsigned m = 0; m < 6; ++m) {
    const auto &curve = m == 5 ? proof->placement : proof->prepared.future[m];
    std::printf(" %llu/%llu,%llu/%llu", (unsigned long long)peak[m], (unsigned long long)curve[1],
                (unsigned long long)window[m], (unsigned long long)curve[1024]);
  }
  std::puts("");
  if (const auto dir = std::getenv("ALIVE_AUTHORITY_EVIDENCE")) {
    const auto path = std::string(dir) + "/suffix-work.tsv";
    FILE *file = std::fopen(path.c_str(), "w");
    assert(file);
    for (unsigned frame = 0; frame < observed.size(); ++frame) {
      std::fprintf(file, "%u", frame);
      for (const auto &cost : observed[frame].cost)
        for (auto amount : cost) std::fprintf(file, "\t%llu", (unsigned long long)amount);
      for (auto amount : observed[frame].placement) std::fprintf(file, "\t%llu", (unsigned long long)amount);
      for (auto amount : observed[frame].probes) std::fprintf(file, "\t%llu", (unsigned long long)amount);
      std::fprintf(file, "\n");
    }
    assert(std::fclose(file) == 0);
  }
}
AudioRun refused_seek_pending(bool refuse) {
  auto c = authority_fixture(2);
  auto owner = std::make_unique<ultra::AliveSession>();
  auto workspace = std::make_unique<ultra::CanvasWorkspace>();
  auto emit = [](alive::Event) { return true; };
  for (unsigned d = 0; d < c.device_count; ++d) {
    UltraCanvasGraph graph{};
    AliveSessionDeviceV2 descriptor{};
    if (d % 3 == 0) saved_0(graph, descriptor);
    else if (d % 3 == 1) saved_1(graph, descriptor);
    else saved_2(graph, descriptor);
    graph.revision = c.devices[d].revision;
    ultra::CanvasPlan plan{};
    assert(ultra::compile_canvas(graph, plan) && workspace->install(d, plan, 0, emit));
  }
  assert(owner->configure_v4(suffix_region_fixture(c), nullptr, 0, *workspace));
  AliveSessionRequestV4 r{};
  r.version = 4;
  r.struct_bytes = sizeof r;
  r.preparation_revision = c.preparation_revision;
  AliveSessionReceiptV4 immediate{};
  immediate.version = 4;
  immediate.struct_bytes = sizeof immediate;
  auto submit = [&] { ++r.request_serial; assert(owner->request_v4(r, immediate)); };
  auto snapshot = [&] {
    owner->publish(*workspace);
    AliveSessionStateV4 s{};
    s.version = 4;
    s.struct_bytes = sizeof s;
    assert(owner->snapshot_v4(s));
    return s;
  };
  auto evidence = [&](const AliveSessionStateV4 &s, const char *stage, const char *mode) {
    const auto dir = std::getenv("ALIVE_AUTHORITY_EVIDENCE");
    if (!dir) return;
    const auto path = std::string(dir) + "/seek-receipts.tsv";
    FILE *file = std::fopen(path.c_str(), mode);
    assert(file);
    for (unsigned i = 2; i <= r.request_serial; ++i) {
      const auto &receipt = s.receipts[i];
      std::fprintf(file, "%s\t%llu\t%u\t%u\t%u\t%u\t%u\t%u\t%llu\t%llu\n", stage,
                   (unsigned long long)s.position, i, receipt.status, receipt.error,
                   receipt.pending_mask, receipt.applied_mask, receipt.canceled_mask,
                   (unsigned long long)receipt.observed_frame, (unsigned long long)receipt.target_frame);
    }
    assert(std::fclose(file) == 0);
  };
  AudioRun out;
  auto tick = [&] {
    callback_guard::begin();
    owner->sample(*workspace);
    assert(workspace->sample(0, emit));
    const std::array<float, alive::DocumentDevices> voices{};
    const auto pcm = owner->render_sample(*workspace, voices, 1, emit);
    owner->advance(*workspace, pcm[0], pcm[1]);
    callback_guard::end();
    out.pcm.push_back(float(pcm[0]));
    out.pcm.push_back(float(pcm[1]));
  };
  r.kind = ALIVE_SESSION_V4_START;
  submit();
  owner->begin(*workspace);
  for (unsigned i = 0; i < 3072; ++i) tick();
  r.kind = ALIVE_SESSION_V4_TRACK_ACTIONS;
  r.track_mask = 3;
  r.tracks[0] = {LAUNCH, 0};
  r.tracks[1] = {LAUNCH, 3};
  submit();
  owner->begin(*workspace);
  tick();
  const auto before = snapshot();
  assert(before.receipts[2].pending_mask == 3 && before.tracks[1].pending_slot == 5);
  if (refuse) {
    evidence(before, "committed-pending", "w");
    (owner.get()->*access(Scheduled{})).charge(3073, Cost{31, 0, 0, 0, 0});
    r.kind = ALIVE_SESSION_V4_SEEK;
    r.track_mask = 0;
    r.tracks[0] = r.tracks[1] = {};
    r.position = 48000;
    submit();
    Work measured{};
    work = &measured;
    const auto reads = ultra::alive_session_test_reconstruction_reads;
    owner->begin(*workspace);
    tick();
    work = nullptr;
    const auto after = snapshot();
    evidence(after, "refused-seek", "a");
    assert(after.playing && !after.fault && after.position == 3074 && after.work_rejected == 1);
    assert(after.receipts[3].status == ALIVE_SESSION_V4_REJECTED &&
           after.receipts[3].error == ALIVE_SESSION_V4_WORK_LIMIT);
    assert(std::memcmp(&before.receipts[2], &after.receipts[2], sizeof before.receipts[2]) == 0);
    for (unsigned t = 0; t < 2; ++t) {
      assert(after.tracks[t].pending_serial == 2 && after.tracks[t].pending_action == LAUNCH &&
             after.tracks[t].pending_slot == (t ? 5u : 0u) && after.tracks[t].pending_frame == 48000);
      assert(after.tracks[t].phase == before.tracks[t].phase + 1 &&
             after.tracks[t].track_epoch == before.tracks[t].track_epoch);
    }
    assert(measured.cost[1][4] == ultra::clip_admission::HorizonSteps &&
           measured.placement[1] == 2058 && !measured.cost[1][1] && !measured.cost[1][2]);
    assert(ultra::alive_session_test_reconstruction_reads == reads &&
           (owner.get()->*access(Scheduled{})).total[0] == 31);
    // A second candidate cannot erase the guard history spent by the first refusal.
    submit();
    owner->begin(*workspace);
    tick();
    const auto again = snapshot();
    evidence(again, "retained-history-refusal", "a");
    assert(again.work_rejected == 2 && again.receipts[4].error == ALIVE_SESSION_V4_WORK_LIMIT &&
           again.receipts[2].pending_mask == 3 && again.tracks[1].pending_slot == 5);
    std::printf("pending-survives-refused-Seek: serial2 mask3 slot5 target48000 guard=%llu placement=%llu\n",
                (unsigned long long)measured.cost[1][4], (unsigned long long)measured.placement[1]);
  } else {
    tick();
    tick();
  }
  for (unsigned i = 0; i < 1024; ++i) tick();
  assert(std::any_of(out.pcm.begin(), out.pcm.end(), [](float v) { return v != 0; }));
  if (refuse) {
    submit();
    owner->begin(*workspace);
    tick();
    const auto accepted = snapshot();
    evidence(accepted, "accepted-seek", "a");
    assert(accepted.receipts[5].status == ALIVE_SESSION_V4_APPLIED && accepted.position == 48001);
    assert(accepted.receipts[2].canceled_mask == 3 &&
           accepted.receipts[2].error == ALIVE_SESSION_V4_REPLACED_REQUEST);
    assert(!accepted.tracks[0].pending_action && !accepted.tracks[1].pending_action &&
           accepted.tracks[0].pending_slot == NONE && accepted.tracks[1].pending_slot == NONE);
    // This accepted relocation is outside the refused-continuity PCM interval.
    out.pcm.resize(out.pcm.size() - 2);
  }
  return out;
}
void suffix_pending() {
  auto c = authority_fixture();
  c.sources[2].length_frames = 2301;
  c.placements[3].loop_enabled = 1;
  c.placements[3].start_marker = 400;
  install(c);
  request();
  frames(2048);
  const auto pending = actions(2, 0, 0, LAUNCH, 3);
  render(1);
  const auto token = state().receipts[pending.request_serial % 128];
  for (unsigned position : {3803u, 5704u, 10000u, 30000u, 48000u}) {
    frames(position - unsigned(state().position));
    const auto s = state();
    assert(s.tracks[1].pending_slot == 5 && s.tracks[1].pending_action == LAUNCH &&
           s.tracks[1].pending_serial == pending.request_serial &&
           s.tracks[1].pending_frame == trace_origin + 48000);
    assert(std::memcmp(&token, &s.receipts[pending.request_serial % 128], sizeof token) == 0);
  }
  const auto before = state().tracks[1].track_epoch;
  render(1);
  assert(state().tracks[1].active_slot == 5 && state().tracks[1].active_source == 3 &&
         state().tracks[1].phase == 1001 && state().tracks[1].track_epoch == before + 1);
  receipt(pending, ALIVE_SESSION_V4_APPLIED, 2);
  std::puts("sparse pending Launch global5 survives repeated Arrangement source seams=PASS");
}
void suffix_evidence(const AudioRun &run, const char *name) {
  const auto dir = std::getenv("ALIVE_AUTHORITY_EVIDENCE");
  if (!dir) return;
  const auto base = std::string(dir) + "/" + name;
  FILE *file = std::fopen((base + ".f32").c_str(), "wb");
  assert(file);
  assert(std::fwrite(run.pcm.data(), sizeof(float), run.pcm.size(), file) == run.pcm.size());
  assert(std::fclose(file) == 0);
  file = std::fopen((base + "-dispatch.tsv").c_str(), "w");
  assert(file);
  for (const auto &e : run.events)
    std::fprintf(file, "%llu\t%u\t%u\t%u\t%u\t%.17g\n", (unsigned long long)e.frame,
                 e.source, e.occurrence, e.kind, e.pitch, e.value);
  assert(std::fclose(file) == 0);
}
void suffix_seek_tests(bool loops, bool seeks) {
  if (loops) {
    minimum_suffixes();
    suffix_work_curves();
    suffix_pending();
    const auto reference = suffix_playback(1);
    suffix_evidence(reference, "suffix-pcm");
    for (unsigned partition : {0u, 31u, 63u, 64u, 127u, 1024u})
      same_audio(reference, suffix_playback(partition));
    for (unsigned effects : {0u, 1u, 2u}) {
      suffix_playback(127, effects);
      suffix_playback(31, effects, true);
    }
    std::puts("suffix L2000/O400 period1600 ordering/cutoff/adjacent occurrence/effect PCM=PASS");
  }
  if (seeks) {
    seek_reduction();
    seek_boundaries();
    seek_ended_cue();
    const auto refused = refused_seek_pending(true);
    const auto continued = refused_seek_pending(false);
    assert(refused.pcm == continued.pcm);
    suffix_evidence(refused, "refused-seek-pcm");
    suffix_evidence(continued, "refused-seek-control-pcm");
    for (unsigned effects : {0u, 1u, 2u, 3u}) {
      const auto changed = seek_continuity(31, effects, true);
      const auto control = seek_continuity(1024, effects, false);
      assert(changed.pcm == control.pcm);
      assert(std::any_of(control.pcm.begin(), control.pcm.end(), [](float v) { return v != 0; }));
      const auto looping = seek_continuity(63, effects, true, true);
      const auto independent = seek_continuity(1024, effects, false, true);
      assert(looping.pcm == independent.pcm);
    }
    const auto gestures = seek_continuity(1, 0, true, true);
    suffix_evidence(gestures, "seek-gestures-pcm");
    for (unsigned partition : {0u, 31u, 63u, 64u, 127u, 1024u})
      same_audio(gestures, seek_continuity(partition, 0, true, true));
    std::puts("Arrangement-only Seek preserves Session phase/epoch/real PCM=PASS");
  }
}
AliveSessionConfigV4 song_fixture(unsigned effects = 0, bool gap = false) {
  auto c = multi(2, effects);
  c.length_frames = 8192;
  c.loop_enabled = 1;
  c.loop_start = 2400;
  c.loop_end = 4000;
  for (unsigned s = 0; s < c.source_count; ++s)
    c.sources[s].length_frames = 2301;
  for (unsigned i = 0; i < c.slot_count; ++i) {
    c.slots[i].start_marker = 400;
    c.slots[i].loop_enabled = 1;
  }
  c.placements[0] = {0, 0, 1, 0, 0, 1000, 400,0,0,0};
  c.placements[1] = {0, 0, 1, 0, gap ? 2800u : 1600u, gap ? 1200u : 2400u, 400,0,0,0};
  c.placements[2] = {0, 1, 1, 0, 4000, 2000, 400,0,0,0};
  c.placements[3] = {1, 2, 1, 0, 0, 8192, 400,0,0,0};
  return c;
}
AudioRun song_playback(unsigned partition, unsigned effects, bool looping = true,
                       bool session_only = false, bool gap = false) {
  auto c = song_fixture(effects, gap);
  if (!looping) {
    c.loop_enabled = 0;
    c.length_frames = 20000;
  }
  c.tracks[0].mute = session_only;
  if (gap) c.tracks[1].mute = 1;
  install(c);
  const auto session_epoch = state().tracks[1].track_epoch;
  actions(2, 0, 0, LAUNCH, 3);
  request();
  AudioRun out;
  frames(10400, partition, &out.pcm);
  const auto s = state();
  assert(s.playing && s.tracks[1].authority == ALIVE_SESSION_V4_SESSION_AUTHORITY);
  assert(s.tracks[1].phase == 400 + 10400 % 1901);
  assert(s.tracks[1].track_epoch == session_epoch + 2 + 10399 / 1901);
  assert(s.position == (looping ? 4000u : 10400u));
  if (looping) {
    // The next callback enters the same occurrence at B, which still resets it.
    const auto before = s.tracks[0].track_epoch;
    frames(1, partition, &out.pcm);
    assert(state().position == 2401 && state().tracks[0].track_epoch == before + 1);
    assert(state().tracks[0].phase == (gap ? 0 : 1201));
    for (unsigned seam : {4000u, 5600u, 7200u, 8800u, 10400u}) {
      const auto first = out.pcm.begin() + seam * 2;
      if (gap)
        assert(std::all_of(first, first + (seam == 10400 ? 2 : 800), [](float v) { return v == 0; }));
      auto it = std::find_if(dispatches.begin(), dispatches.begin() + dispatch_count,
                             [=](const Dispatch &e) { return e.frame == seam && e.source == 0; });
      assert((it != dispatches.begin() + dispatch_count) == !gap);
      if (!gap) assert(it->occurrence == 1);
    }
    assert(std::count_if(dispatches.begin(), dispatches.begin() + dispatch_count,
                         [](const Dispatch &e) { return e.occurrence == 0; }) == 1);
    assert(std::none_of(dispatches.begin(), dispatches.begin() + dispatch_count,
                        [](const Dispatch &e) { return e.occurrence == 2; }));
  } else
    frames(1, partition, &out.pcm);
  out.events.assign(dispatches.begin(), dispatches.begin() + dispatch_count);
  return out;
}
void song_targets() {
  for (unsigned at : {2000u, 2400u, 3000u, 4000u, 5600u}) {
    auto c = song_fixture();
    install(c);
    request();
    frames(at);
    const auto before = state();
    const auto r = actions(1, RETURN);
    const unsigned target = at <= 2400 ? 2400 : at <= 4000 ? 4000 : 5600;
    render(1);
    assert(state().receipts[r.request_serial % 128].target_frame == trace_origin + target);
    if (target > at) {
      receipt(r, ALIVE_SESSION_V4_PENDING, 0, 0, 1);
      frames(target - at - 1);
      assert(state().tracks[0].pending_serial == r.request_serial);
      render(1);
    }
    receipt(r, ALIVE_SESSION_V4_APPLIED, 1);
    assert(state().position == 2401 && state().tracks[0].phase == 1201);
    if (at >= 4000)
      assert(state().tracks[0].track_epoch == before.tracks[0].track_epoch + 1);
  }
  auto c = song_fixture();
  install(c);
  seek(4000, false);
  seek(8191, false);
  seek(UINT64_MAX, false);
  const auto r = seek(1000);
  render(1);
  receipt(r, ALIVE_SESSION_V4_APPLIED, 0);
  assert(state().position == 1000);
  for (unsigned at : {88000u, 90000u, 90001u, 96000u, 96001u, 100000u, 116001u}) {
    c = song_fixture();
    c.length_frames = 160000;
    c.loop_start = 90000;
    c.loop_end = 100000;
    install(c);
    request();
    frames(at);
    const auto r = actions(1, LAUNCH, 0);
    const unsigned target = at <= 90000 ? 90000 : at <= 96000 ? 96000 :
                            at <= 100000 ? 100000 : 120000;
    render(1);
    assert(state().receipts[r.request_serial % 128].target_frame == trace_origin + target);
    if (target > at) {
      receipt(r, ALIVE_SESSION_V4_PENDING, 0, 0, 1);
      frames(target - at - 1);
      assert(state().tracks[0].pending_serial == r.request_serial);
      render(1);
    }
    receipt(r, ALIVE_SESSION_V4_APPLIED, 1);
    assert(state().tracks[0].phase == 401);
  }
}
void song_coincidences() {
  for (unsigned action : {RETURN, LAUNCH, STOP})
    for (bool interior : {false, true}) {
      auto c = song_fixture(2);
      // At E, track zero also reaches its suffix and occurrence endpoints.
      c.sources[0].length_frames = 2800;
      install(c);
      request();
      frames(3000);
      const auto pending = actions(1, action, action == LAUNCH ? 1 : NONE);
      render(1);
      assert(state().receipts[pending.request_serial % 128].target_frame == trace_origin + 4000);
      frames((interior ? 3990 : 4000) - 3001);
      const auto before = state();
      const auto events = dispatch_count;
      Work measured{};
      work = &measured;
      render(interior ? 11 : 1);
      work = nullptr;
      auto s = state();
      receipt(pending, ALIVE_SESSION_V4_APPLIED, 1);
      assert(s.position == 2401 && s.tracks[0].track_epoch == before.tracks[0].track_epoch + 1);
      assert(s.tracks[1].track_epoch == before.tracks[1].track_epoch + 1);
      assert(measured.cost[0][1] == 6 && measured.placement[0] == (action == RETURN ? 8 : 4));
      assert(s.tracks[0].authority == (action == RETURN ? ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY :
                                                       ALIVE_SESSION_V4_SESSION_AUTHORITY));
      assert(s.tracks[0].active_source == (action == STOP ? NONE : action == RETURN ? 0u : 1u));
      assert(s.tracks[0].phase == (action == STOP ? 0 : action == RETURN ? 1201 : 401));
      assert(s.tracks[0].active_placement == (action == RETURN ? 1u : NONE));
      unsigned emitted = 0;
      for (unsigned i = events; i < dispatch_count; ++i) {
        const auto &e = dispatches[i];
        assert(e.frame == 4000 && e.occurrence != 2);
        if (e.source < 2) {
          ++emitted;
          assert(e.kind == ALIVE_SESSION_NOTE_ON && e.source == (action == RETURN ? 0u : 1u));
        }
      }
      assert(emitted == (action == STOP ? 0u : 1u));
    }
  // An old note at the cut frame must not enter the returned occurrence.
  auto c = song_fixture();
  c.sources[0].length_frames = 4000;
  c.sources[0].event_count = 2;
  for (unsigned i = c.event_count; i > 1; --i) c.events[i] = c.events[i - 1];
  ++c.event_count;
  for (unsigned s = 1; s < c.source_count; ++s) ++c.sources[s].event_begin;
  c.events[1] = {2800, 0, ALIVE_SESSION_NOTE_ON, 0, 72, 90};
  install(c);
  request();
  frames(4001);
  assert(std::none_of(dispatches.begin(), dispatches.begin() + dispatch_count,
                      [](const Dispatch &e) { return e.pitch == 72; }));
  std::puts("brace/due Return-Launch-Stop/suffix/placement first-and-interior coalescing=PASS");
}
void song_work_curves() {
  auto c = song_fixture(2);
  auto owner = std::make_unique<ultra::AliveSession>();
  auto proof = std::make_unique<ultra::workspace_admission::Proof>();
  assert(owner->prepare_midi_envelopes_v4(suffix_region_fixture(c), *proof));
  install(c);
  request();
  std::vector<Work> observed(11000);
  std::array<uint64_t, 6> peak{}, window{};
  const auto optional = ultra::clip_admission::cost(ultra::clip_admission::policy(c.profile).optional_frame);
  for (unsigned frame = 0; frame < observed.size(); ++frame) {
    if (frame == 2000) actions(1, RETURN);
    if (frame == 3000) actions(1, LAUNCH, 1);
    if (frame == 4600) actions(1, RETURN);
    if (frame == 6200) seek(1000);
    if (frame == 8400) actions(1, STOP);
    work = &observed[frame];
    const auto before = state();
    const auto events = dispatch_count;
    const auto reads = ultra::alive_session_test_reconstruction_reads;
    const auto previews = ultra::alive_session_test_preview_reads;
    render(1);
    assert(!state().fault && dispatch_count - events == work->cost[0][0]);
    assert(ultra::alive_session_test_reconstruction_reads - reads <= work->cost[0][2] + work->cost[1][2]);
    assert(ultra::alive_session_test_preview_reads - previews <= 128);
    for (unsigned t = 0; t < 2; ++t)
      assert(state().tracks[t].track_epoch - before.tracks[t].track_epoch <= 1);
    Cost scheduled{}, unscheduled{};
    uint64_t placement = 0, optional_placement = 0;
    for (unsigned width = 1; width <= std::min(1024u, frame + 1); ++width) {
      const auto &old = observed[frame + 1 - width];
      scheduled = ultra::clip_admission::add(scheduled, old.cost[0]);
      unscheduled = ultra::clip_admission::add(unscheduled, old.cost[1]);
      placement += old.placement[0];
      optional_placement += old.placement[1];
      for (unsigned m = 0; m < 5; ++m) {
        assert(scheduled[m] <= proof->prepared.future[m][width]);
        assert(!m || unscheduled[m] <= optional[m]);
        if (width == 1) peak[m] = std::max(peak[m], scheduled[m]);
        window[m] = std::max(window[m], scheduled[m]);
      }
      assert(placement <= proof->placement[width] && optional_placement <= 2114);
      if (width == 1) peak[5] = std::max(peak[5], placement);
      window[5] = std::max(window[5], placement);
    }
  }
  work = nullptr;
  std::printf("song six-root actual-frame/admitted-frame actual-window/admitted-window:");
  for (unsigned m = 0; m < 6; ++m) {
    const auto &curve = m == 5 ? proof->placement : proof->prepared.future[m];
    std::printf(" %llu/%llu,%llu/%llu", (unsigned long long)peak[m], (unsigned long long)curve[1],
                (unsigned long long)window[m], (unsigned long long)curve[1024]);
  }
  std::puts("");
  if (const auto dir = std::getenv("ALIVE_AUTHORITY_EVIDENCE")) {
    const auto path = std::string(dir) + "/song-work.tsv";
    FILE *file = std::fopen(path.c_str(), "w");
    assert(file);
    for (unsigned frame = 0; frame < observed.size(); ++frame) {
      std::fprintf(file, "%u", frame);
      for (const auto &cost : observed[frame].cost)
        for (auto amount : cost) std::fprintf(file, "\t%llu", (unsigned long long)amount);
      for (auto amount : observed[frame].placement) std::fprintf(file, "\t%llu", (unsigned long long)amount);
      for (auto amount : observed[frame].probes) std::fprintf(file, "\t%llu", (unsigned long long)amount);
      std::fprintf(file, "\n");
    }
    assert(std::fclose(file) == 0);
  }
}
void song_stop_resume() {
  for (bool end_equals_length : {false, true}) {
    auto c = song_fixture();
    if (end_equals_length) c.loop_end = c.length_frames;
    install(c);
    actions(2, 0, 0, LAUNCH, 3);
    request();
    frames(unsigned(c.loop_end));
    const auto before = state();
    std::array<AliveSessionReceiptV4, 64> queued{};
    for (auto &r : queued) r = actions(1, LAUNCH, 0);
    alive_session_stop_v4();
    frames(1024);
    const auto stopped = state();
    assert(!stopped.playing && stopped.position == c.loop_end &&
           stopped.tracks[1].phase == before.tracks[1].phase &&
           stopped.tracks[1].authority == ALIVE_SESSION_V4_SESSION_AUTHORITY);
    for (const auto &r : queued) {
      const auto &result = stopped.receipts[r.request_serial % 128];
      assert(result.canceled_mask == 1 && result.error == ALIVE_SESSION_V4_STOP_CANCELED);
    }
    request();
    render(1);
    assert(state().position == c.loop_start + 1 &&
           state().tracks[1].phase == before.tracks[1].phase + 1 &&
           state().tracks[1].active_slot == 7);
  }
}
void song_profiles() {
  for (unsigned effects : {0u, 1u}) {
    auto c = multi(8, effects);
    c.length_frames = 8192;
    c.loop_enabled = 1;
    c.loop_start = 2400;
    c.loop_end = 4000;
    std::fill_n(c.placements, 64, AliveSessionPlacementV4{});
    std::fill_n(c.slots, 32, AliveSessionSlotV4{});
    c.slot_count = c.placement_count = 1;
    c.slots[0] = {0, 1, 1, 0, 400,0,0,0};
    c.placements[0] = {0, 0, 1, 0, 0, 8192, 400,0,0,0};
    for (unsigned t = 0; t < 8; ++t) {
      c.tracks[t].placement_begin = t ? 1 : 0;
      c.tracks[t].placement_count = t ? 0 : 1;
      std::fill_n(c.tracks[t].slots, 4, NONE);
    }
    c.tracks[0].slots[0] = 0;
    for (unsigned s = 0; s < c.source_count; ++s) c.sources[s].length_frames = 2301;
    if (effects) {
      assert(!validate_suffix_fixture(&c));
      AliveSessionDiagnosticV4 d{};
      d.version = 4;
      d.struct_bytes = sizeof d;
      assert(alive_session_diagnostic_v4(&d) && d.conservative && d.resource == 2 && d.limit == 48);
      assert(d.observed > d.limit);
      std::printf("song profile2 eight-track/sixteen-root conservative roots=%llu/48 refused\n",
                  (unsigned long long)d.observed);
      if (const auto dir = std::getenv("ALIVE_AUTHORITY_EVIDENCE")) {
        FILE *file = std::fopen((std::string(dir) + "/song-refused-eight-sixteen.bin").c_str(), "wb");
        assert(file && std::fwrite(&c, sizeof c, 1, file) == 1 && std::fwrite(&d, sizeof d, 1, file) == 1);
        assert(std::fclose(file) == 0);
      }
      continue;
    }
    install(c);
    request();
    frames(4000);
    const auto before = state();
    Work measured{};
    work = &measured;
    render(1);
    work = nullptr;
    assert(state().position == 2401 && measured.cost[0][1] == 8 && measured.placement[0] == 32);
    for (unsigned t = 0; t < 8; ++t)
      assert(state().tracks[t].track_epoch == before.tracks[t].track_epoch + 1);
    actions(1, LAUNCH, 0);
    frames(1600);
    assert(state().tracks[0].authority == ALIVE_SESSION_V4_SESSION_AUTHORITY && state().tracks[0].phase == 401);
    actions(1, RETURN);
    frames(1600);
    assert(state().tracks[0].authority == ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY && !state().fault);
  }
  auto c = song_fixture(2);
  c.profile = c.work_policy = 1;
  assert(!validate_suffix_fixture(&c));
  AliveSessionDiagnosticV4 d{};
  d.version = 4;
  d.struct_bytes = sizeof d;
  assert(alive_session_diagnostic_v4(&d) && d.conservative && d.resource == 2 &&
         d.observed == 30 && d.limit == 18);
  if (const auto dir = std::getenv("ALIVE_AUTHORITY_EVIDENCE")) {
    FILE *file = std::fopen((std::string(dir) + "/song-refused-two-six.bin").c_str(), "wb");
    assert(file && std::fwrite(&c, sizeof c, 1, file) == 1 && std::fwrite(&d, sizeof d, 1, file) == 1);
    assert(std::fclose(file) == 0);
  }
  std::puts("song admitted profile1 two-track/two-root and profile2 eight-track/eight-root; profile1 six-root30/18 refused");
}
void song_fault() {
  auto c = song_fixture(2);
  install(c);
  request();
  frames(3000);
  const auto pending = actions(3, LAUNCH, 1, LAUNCH, 3);
  frames(1000);
  const auto before = state();
  const auto events = dispatch_count;
  ultra::alive_session_test_fault_resource = ALIVE_SESSION_V3_RESOURCE_EVENTS;
  render(1024);
  ultra::alive_session_test_fault_resource = 0;
  const auto s = state();
  assert(!s.playing && s.fault == ALIVE_SESSION_V4_RUNTIME_INVARIANT && s.event_faults == 1);
  assert(s.position == before.position && dispatch_count == events);
  for (unsigned t = 0; t < 2; ++t)
    assert(s.tracks[t].authority == before.tracks[t].authority &&
           s.tracks[t].active_source == before.tracks[t].active_source &&
           s.tracks[t].phase == before.tracks[t].phase && !s.tracks[t].pending_action);
  const auto &r = s.receipts[pending.request_serial % 128];
  assert(r.canceled_mask == 3 && !r.applied_mask && r.error == ALIVE_SESSION_V4_RUNTIME_INVARIANT);
  assert(std::all_of(left.begin(), left.end(), [](float value) { return value == 0; }));
  std::puts("failed wrap+scene retains committed position/authority, cancels members, emits no events/PCM=PASS");
}
void song_first_sample() {
  auto c = song_fixture();
  auto owner = std::make_unique<ultra::AliveSession>();
  auto workspace = std::make_unique<ultra::CanvasWorkspace>();
  auto emit = [](alive::Event) { return true; };
  for (unsigned d = 0; d < 2; ++d) {
    UltraCanvasGraph graph{};
    AliveSessionDeviceV2 descriptor{};
    saved_0(graph, descriptor);
    graph.revision = c.devices[d].revision;
    ultra::CanvasPlan plan{};
    assert(ultra::compile_canvas(graph, plan) && workspace->install(d, plan, 0, emit));
  }
  assert(owner->configure_v4(suffix_region_fixture(c), nullptr, 0, *workspace));
  AliveSessionRequestV4 r{};
  r.version = 4;
  r.struct_bytes = sizeof r;
  r.preparation_revision = c.preparation_revision;
  r.kind = ALIVE_SESSION_V4_START;
  AliveSessionReceiptV4 immediate{};
  immediate.version = 4;
  immediate.struct_bytes = sizeof immediate;
  auto submit = [&] { ++r.request_serial; assert(owner->request_v4(r, immediate)); };
  auto snapshot = [&] {
    owner->publish(*workspace);
    AliveSessionStateV4 s{};
    s.version = 4;
    s.struct_bytes = sizeof s;
    assert(owner->snapshot_v4(s));
    return s;
  };
  auto tick = [&] {
    callback_guard::begin();
    owner->sample(*workspace);
    assert(workspace->sample(0, emit));
    const std::array<float, alive::DocumentDevices> voices{};
    const auto pcm = owner->render_sample(*workspace, voices, 1, emit);
    owner->advance(*workspace, pcm[0], pcm[1]);
    callback_guard::end();
  };
  submit();
  owner->begin(*workspace);
  for (unsigned i = 0; i < 4000; ++i) tick();
  owner->stop();
  owner->begin(*workspace);
  const auto before = snapshot();
  assert(!before.playing && before.position == 4000);
  (owner.get()->*access(Scheduled{})).charge(4000, Cost{31, 0, 0, 0, 0});
  submit();
  r.kind = ALIVE_SESSION_V4_TRACK_ACTIONS;
  r.track_mask = 1;
  r.tracks[0] = {RETURN, NONE};
  submit();
  Work measured{};
  work = &measured;
  const auto reads = ultra::alive_session_test_reconstruction_reads;
  owner->begin(*workspace);
  tick();
  work = nullptr;
  const auto after = snapshot();
  assert(!after.playing && !after.fault && after.position == 4000 && after.work_rejected == 1);
  assert(after.receipts[2].error == ALIVE_SESSION_V4_WORK_LIMIT && after.receipts[3].rejected_mask == 1);
  assert(measured.cost[1][4] == ultra::clip_admission::HorizonSteps && measured.placement[1] <= 2114);
  assert(!measured.cost[1][1] && !measured.cost[1][2] && ultra::alive_session_test_reconstruction_reads == reads);
  for (unsigned t = 0; t < 2; ++t)
    assert(after.tracks[t].phase == before.tracks[t].phase &&
           after.tracks[t].track_epoch == before.tracks[t].track_epoch);
  assert((owner.get()->*access(Scheduled{})).total[0] >= 31);
  r.kind = ALIVE_SESSION_V4_START;
  r.track_mask = 0;
  r.tracks[0] = {};
  submit();
  owner->begin(*workspace);
  tick();
  assert(snapshot().work_rejected == 2);
  for (unsigned i = 0; i < 1024; ++i) tick();
  submit();
  owner->begin(*workspace);
  tick();
  assert(snapshot().playing && snapshot().position == 2401 && snapshot().tracks[0].phase == 1201);
  std::puts("wrap final-first-frame refusal retains history/position/cursors; rejected guards charged; later restart=PASS");
}
AudioRun song_gestures(unsigned partition, unsigned effects, bool change) {
  auto c = song_fixture(effects);
  c.tracks[0].mute = 1;
  install(c);
  actions(2, 0, 0, LAUNCH, 3);
  request();
  AudioRun out;
  frames(2048, partition, &out.pcm);
  for (unsigned position : {1000u, 2400u, 0u}) {
    if (change) seek(position);
    frames(2048, partition, &out.pcm);
    const auto before = state().tracks[1];
    alive_session_stop_v4();
    frames(1024, partition, &out.pcm);
    assert(!state().playing && state().tracks[1].phase == before.phase &&
           state().tracks[1].authority == ALIVE_SESSION_V4_SESSION_AUTHORITY);
    if (change) seek(position);
    frames(1024, partition, &out.pcm);
    assert(state().tracks[1].phase == before.phase);
    request();
    frames(2048, partition, &out.pcm);
  }
  out.events.assign(dispatches.begin(), dispatches.begin() + dispatch_count);
  assert(std::any_of(out.pcm.begin(), out.pcm.end(), [](float v) { return v != 0; }));
  return out;
}
void song_tests() {
  song_stop_resume();
  song_profiles();
  song_fault();
  song_first_sample();
  song_targets();
  song_coincidences();
  song_work_curves();
  const auto reference = song_playback(1, 2);
  suffix_evidence(reference, "song-pcm");
  for (unsigned partition : {0u, 31u, 63u, 64u, 127u, 1024u})
    same_audio(reference, song_playback(partition, 2));
  song_playback(31, 0, true, false, true);
  for (unsigned effects : {0u, 1u, 2u, 3u}) {
    const auto loop = song_playback(31, effects, true, true);
    const auto control = song_playback(1024, effects, false, true);
    assert(loop.pcm == control.pcm);
    const auto gestures = song_gestures(31, effects, true);
    const auto unchanged = song_gestures(1024, effects, false);
    assert(gestures.pcm == unchanged.pcm);
    if (effects == 2) {
      suffix_evidence(loop, "song-session-pcm");
      suffix_evidence(control, "song-session-control-pcm");
      suffix_evidence(gestures, "song-gestures-pcm");
      suffix_evidence(unchanged, "song-gestures-control-pcm");
      for (unsigned partition : {0u, 1u, 63u, 64u, 127u, 1024u})
        same_audio(gestures, song_gestures(partition, effects, true));
    }
  }
  std::puts("partial song brace/prefix/mid-source Return/absolute targets/Session PCM=PASS");
}
void save_audio(const AudioRun &run) {
  const auto dir = std::getenv("ALIVE_AUTHORITY_EVIDENCE");
  if (!dir)
    return;
  std::string path = std::string(dir) + "/authority-pcm.f32";
  FILE *file = std::fopen(path.c_str(), "wb");
  assert(file);
  assert(std::fwrite(run.pcm.data(), sizeof(float), run.pcm.size(), file) == run.pcm.size());
  assert(std::fclose(file) == 0);
  path = std::string(dir) + "/dispatch.tsv";
  file = std::fopen(path.c_str(), "w");
  assert(file);
  for (const auto &e : run.events)
    std::fprintf(file, "%llu\t%u\t%u\t%u\t%u\t%.17g\n", (unsigned long long)e.frame, e.source,
                 e.occurrence, e.kind, e.pitch, e.value);
  assert(std::fclose(file) == 0);
}
int main(int argc, char **argv) {
  ultra::alive_session_test_charge = trace_work;
  ultra::alive_session_test_placement_probe = trace_probe;
  ultra::alive_session_test_dispatch = trace_event;
  ultra::alive_session_test_placement_charge = trace_placement;
  if (argc == 2 && std::strcmp(argv[1], "--song") == 0) {
    song_tests();
    ultra_audio_stop();
    assert(alive_session_reset());
    return 0;
  }
  if (argc == 2 && (std::strcmp(argv[1], "--suffix") == 0 || std::strcmp(argv[1], "--seek") == 0)) {
    suffix_seek_tests(std::strcmp(argv[1], "--suffix") == 0, std::strcmp(argv[1], "--seek") == 0);
    ultra_audio_stop();
    assert(alive_session_reset());
    return 0;
  }
  if (argc == 2 && std::strcmp(argv[1], "--first-sample") == 0) {
    saturation_and_first_sample();
    ultra_audio_stop();
    assert(alive_session_reset());
    return 0;
  }
  if (argc == 2 && std::strcmp(argv[1], "--pending-slot") == 0) {
    pending_slot_boundaries();
    bounded_reduction_and_coherence();
    ultra_audio_stop();
    assert(alive_session_reset());
    return 0;
  }
  stopped_authority();
  reductions_and_cues();
  queued_resume_and_future();
  one_shot();
  offset_return_and_gap();
  receipts_refusal_stop();
  fault_and_race();
  work_curves();
  saturation_and_first_sample();
  pending_slot_boundaries();
  bounded_reduction_and_coherence();
  action_validation();
  sparse_eight_and_denied_density();
  exact_combined_batch();
  suffix_seek_tests(true, true);
  song_tests();
  const auto reference = playing_authority(1, 0, false, true);
  save_audio(reference);
  for (unsigned partition : {0u, 31u, 63u, 64u, 127u, 1024u})
    same_audio(reference, playing_authority(partition, 0, false, true));
  for (unsigned effects : {0u, 1u, 2u, 3u}) {
    const auto changed = playing_authority(31, effects, true, true);
    const auto steady = playing_authority(1024, effects, true, false);
    assert(changed.pcm == steady.pcm);
    assert(std::any_of(changed.pcm.begin(), changed.pcm.end(),
                       [](float value) { return value != 0; }));
  }
  std::puts("quantized authority/endpoint coalescing/held Return/independent real PCM and "
            "partitions=PASS");
  ultra_audio_stop();
  assert(alive_session_reset());
  std::puts("PASS: MIDI authority actions, source suffix loops and Arrangement Seek");
}
