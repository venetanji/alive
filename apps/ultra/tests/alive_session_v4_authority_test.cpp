#include "../src-tauri/native/alive_session.hpp"
#include "../src-tauri/native/backend.h"
#include "canvas_callback_guard.hpp"
#include "saved_graphs.hpp"
#include <cassert>
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
      c.slots[slot] = {t, t * 2 + local % 2, 0, 0, local * 100u};
    }
    tr.placement_begin = c.placement_count;
    // The complete proof can conservatively refuse many simultaneous lanes.
    // Eight-track coverage uses one sounding lane and seven prepared silent lanes.
    if (t >= 2 || (tracks == 8 && t == 1))
      continue;
    tr.placement_count = t == 0 ? 3 : 1;
    if (t == 0) {
      c.placements[c.placement_count++] = {t, 0, 0, 0, 512, 2048, 100};
      c.placements[c.placement_count++] = {t, 0, 0, 0, 2560, 2048, 200};
      c.placements[c.placement_count++] = {t, 1, 0, 0, 6144, 2048, 300};
    } else
      c.placements[c.placement_count++] = {t, 2, 0, 0, 0, 12000, 700};
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
  assert(alive_session_configure_v4(&c, nullptr, 0));
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
  c.slots[4] = {1, 2, 0, 0, 0};
  c.slots[5] = {1, 3, 0, 0, 1000};
  c.slots[6] = c.slots[7] = {};
  c.tracks[1].slots[0] = 4;
  c.tracks[1].slots[1] = c.tracks[1].slots[2] = NONE;
  c.tracks[1].slots[3] = 5;
  c.slots[0] = {0, 1, 0, 0, 1000};
  c.slots[1] = {0, 1, 0, 0, 2000};
  c.slots[2] = {0, 0, 0, 0, 1000};
  c.slots[3] = {0, 0, 0, 0, 2000};
  c.placements[0] = {0, 0, 0, 0, 0, 48000, 0};
  c.placements[1] = {0, 0, 0, 0, 48000, 72000, 1000};
  c.placements[2] = {0, 0, 0, 0, 144000, 16000, 0};
  c.placements[3] = {1, 2, 0, 0, 0, 160000, 0};
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
void install(const AliveSessionConfigV4 &c) {
  if (!alive_session_configure_v4(&c, nullptr, 0)) {
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
  assert(owner->prepare_midi_envelopes_v4(c, *proof));
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
    assert(owner->configure_v4(c, nullptr, 0, *workspace));
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
void bounded_reduction_and_coherence() {
  auto c = authority_fixture();
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
          assert(tr.pending_action == LAUNCH ? tr.pending_slot < c.slot_count
                                             : tr.pending_slot == NONE);
        } else
          assert(tr.pending_slot == NONE && tr.pending_frame == ALIVE_SESSION_V4_NO_FRAME);
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
  done = true;
  reader.join();
  assert(reads > 0);
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
      c.slots[t * 4 + i] = {t, t * 2 + i % 2, 0, 0, i * 100u};
    }
  assert(!alive_session_validate_v4(&c));
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
    assert(owner->configure_v4(c, nullptr, 0, *workspace));
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
  if (argc == 2 && std::strcmp(argv[1], "--first-sample") == 0) {
    saturation_and_first_sample();
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
  bounded_reduction_and_coherence();
  action_validation();
  sparse_eight_and_denied_density();
  exact_combined_batch();
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
  std::puts("PASS: finite MIDI authority actions");
}
