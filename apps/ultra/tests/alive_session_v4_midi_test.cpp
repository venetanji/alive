#include "../src-tauri/native/alive_session.hpp"
#include "../src-tauri/native/backend.h"
#include "canvas_callback_guard.hpp"
#include "saved_graphs.hpp"
#include <cassert>
#include <cstdio>
#include <cstring>
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
  if (work) work->cost[family] = ultra::clip_admission::add(work->cost[family], cost);
}
void trace_probe(unsigned family) noexcept {
  if (work) assert(++work->probes[family] <= work->placement[family]);
}
void trace_event(uint64_t frame, unsigned source, unsigned occurrence,
                 const AliveSessionEventV2 &event) noexcept {
  assert(dispatch_count < dispatches.size());
  dispatches[dispatch_count++] = {frame - trace_origin, source,       occurrence,
                                  event.kind,           event.target, event.value};
}
void trace_placement(unsigned family, uint64_t amount) noexcept {
  placement_steps += amount;
  if (work) work->placement[family] += amount;
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
  if (filter_only) effects = 1;
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
      if (!member) saved_0(graph, c.devices[d]);
      else if (member == 1 && !filter_only) saved_1(graph, c.devices[d]);
      else saved_2(graph, c.devices[d]);
      graph.revision = c.devices[d].revision = ++revision;
      c.devices[d].document = d;
      if (member) tr.effects[member - 1] = d;
      else c.devices[d].parameters[0].base = 1000 + t * 100;
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
        c.events[c.event_count++] = {0, t, ALIVE_SESSION_NOTE_ON, tr.instrument,
                                    48 + t + local * 12, 80};
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
    if (t >= 2 || (tracks == 8 && t == 1)) continue;
    tr.placement_count = t == 0 ? 3 : 1;
    if (t == 0) {
      c.placements[c.placement_count++] = {t, 0, 0, 0, 512, 2048, 100};
      c.placements[c.placement_count++] = {t, 0, 0, 0, 2560, 2048, 200};
      c.placements[c.placement_count++] = {t, 1, 0, 0, 6144, 2048, 300};
    } else c.placements[c.placement_count++] = {t, 2, 0, 0, 0, 12000, 700};
  }
  return c;
}


struct Run {
  std::vector<float> pcm;
  std::vector<Dispatch> events;
};
Run run(unsigned tracks, unsigned effects, unsigned partition, bool mute_first = false,
        bool remove_first = false, bool stop_resume = true) {
  auto c = multi(tracks, effects);
  c.tracks[0].mute = mute_first;
  if (remove_first) {
    c.placements[0] = c.placements[3];
    std::fill_n(c.placements + 1, 3, AliveSessionPlacementV4{});
    c.placement_count = 1;
    c.tracks[0].placement_count = 0;
    c.tracks[1].placement_begin = 0;
    for (unsigned t = 2; t < tracks; ++t) c.tracks[t].placement_begin = 1;
  }
  const bool valid = alive_session_validate_v4(&c);
  if (!valid) {
    AliveSessionDiagnosticV4 d{};
    d.version = 4;
    d.struct_bytes = sizeof d;
    assert(alive_session_diagnostic_v4(&d));
    std::printf("refused tracks=%u resource=%u width=%u observed=%llu limit=%llu error=%u\n",
                tracks, d.resource, d.window_frames, static_cast<unsigned long long>(d.observed),
                static_cast<unsigned long long>(d.limit), d.error);
  }
  assert(valid);
  assert(alive_session_configure_v4(&c, nullptr, 0));
  auto s = state();
  assert(s.track_count == tracks && s.source_count == tracks * 2 && s.slot_count == c.slot_count);
  assert(s.placement_count == c.placement_count && s.preparation_revision == c.preparation_revision);
  for (unsigned t = 0; t < tracks; ++t) {
    assert(s.tracks[t].authority == ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY);
    assert(s.tracks[t].active_slot == ALIVE_SESSION_V4_NONE);
    assert(s.tracks[t].pending_slot == ALIVE_SESSION_V4_NONE);
    assert(!s.tracks[t].pending_action && !s.tracks[t].pending_serial);
    assert(s.tracks[t].pending_frame == ALIVE_SESSION_V4_NO_FRAME);
    if (t != 1 || tracks == 8)
      assert(s.tracks[t].active_source == ALIVE_SESSION_V4_NONE && !s.tracks[t].phase);
  }
  trace_origin = s.absolute_frame;
  dispatch_count = 0;
  placement_steps = 0;
  assert(ultra_external_start());
  request();
  Run out;
  const unsigned checkpoints[]{512, 513, 2560, 2561, 4608, 4609, 5500, 5501, 7550, 7551, 20000};
  unsigned checkpoint = 0, part = 0;
  uint64_t other_epoch = 0;
  for (unsigned absolute = 0; absolute < 20000;) {
    if (stop_resume && absolute == 5500) {
      request();
      alive_session_stop_v4();
    }
    if (stop_resume && absolute == 7550) request();
    const unsigned mixed[]{1, 31, 127, 63, 1024, 64};
    const unsigned count = std::min(partition ? partition : mixed[part++ % 6],
                                    checkpoints[checkpoint] - absolute);
    render(count);
    out.pcm.insert(out.pcm.end(), left.begin(), left.begin() + count);
    absolute += count;
    s = state();
    assert(!s.fault);
    if (absolute == checkpoints[checkpoint]) ++checkpoint;
    for (unsigned t = 0; t < tracks; ++t) {
      assert(s.tracks[t].authority == ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY);
      assert(s.tracks[t].active_slot == ALIVE_SESSION_V4_NONE);
      if (s.tracks[t].active_source == ALIVE_SESSION_V4_NONE) assert(s.tracks[t].phase == 0);
    }
    if (absolute == 513) {
      other_epoch = s.tracks[1].track_epoch;
      if (tracks == 2) assert(s.tracks[1].phase == 1213 && s.tracks[1].active_source == 2);
      if (!remove_first) assert(s.tracks[0].phase == 101 && s.tracks[0].active_placement == 0);
    }
    if (absolute == 2561 || absolute == 4609) {
      assert(s.tracks[1].track_epoch == other_epoch);
      if (tracks == 2) assert(s.tracks[1].phase == absolute + 700);
      if (!remove_first && absolute == 2561)
        assert(s.tracks[0].phase == 201 && s.tracks[0].active_placement == 1);
      if (absolute == 4609) assert(s.tracks[0].active_source == ALIVE_SESSION_V4_NONE);
    }
    if (stop_resume && absolute > 5500 && absolute <= 7550) {
      assert(!s.playing && s.position == 5500);
      for (unsigned i = 0; i < count; ++i) assert(left[i] == 0);
    }
  }
  assert(!s.playing && s.position == 16384);
  for (unsigned t = 0; t < tracks; ++t) assert(!s.tracks[t].mixer.active_voices);
  out.events.assign(dispatches.begin(), dispatches.begin() + dispatch_count);
  if (!remove_first && stop_resume) {
    const uint64_t expected[]{0, 512, 2560, 7550, 8194};
    const unsigned sources[]{2, 0, 0, 2, 1}, occurrences[]{3, 0, 1, 3, 2};
    unsigned observed = 0;
    for (unsigned i = 0; i < 5; ++i) {
      if (tracks == 8 && (i == 0 || i == 3)) continue;
      const auto &event = out.events[observed++];
      assert(event.frame == expected[i] && event.source == sources[i] &&
             event.occurrence == occurrences[i] && event.kind == ALIVE_SESSION_NOTE_ON);
    }
    assert(observed == out.events.size());
  }
  std::printf("tracks=%u roots=%u partition=%u muted=%u removed=%u events=%u steps=%llu PASS\n",
              tracks, c.device_count, partition, mute_first, remove_first, dispatch_count,
              static_cast<unsigned long long>(placement_steps));
  return out;
}
void same(const Run &a, const Run &b) {
  assert(a.pcm == b.pcm && a.events.size() == b.events.size());
  for (unsigned i = 0; i < a.events.size(); ++i) {
    const auto &x = a.events[i], &y = b.events[i];
    assert(x.frame == y.frame && x.source == y.source && x.occurrence == y.occurrence &&
           x.kind == y.kind && x.pitch == y.pitch && x.value == y.value);
  }
}

void work_limits(unsigned tracks, unsigned effects) {
  auto c = multi(tracks, effects);
  auto owner = std::make_unique<ultra::AliveSession>();
  auto proof = std::make_unique<ultra::workspace_admission::Proof>();
  assert(owner->prepare_midi_envelopes_v4(c, *proof));
  assert(alive_session_configure_v4(&c, nullptr, 0));
  assert(ultra_external_start());
  request();
  const auto policy = ultra::clip_admission::policy(c.profile);
  const auto scheduled_frame = ultra::clip_admission::cost(policy.scheduled_frame);
  const auto scheduled_window = ultra::clip_admission::cost(policy.scheduled_window);
  const auto optional = ultra::clip_admission::cost(policy.optional_frame);
  std::vector<Work> frames(20000);
  std::array<uint64_t, 6> peaks{}, windows{};
  for (unsigned i = 0; i < frames.size(); ++i) {
    work = &frames[i];
    if (i == 5500) alive_session_stop_v4();
    if (i == 7550) request();
    const auto before = state();
    const auto reads = ultra::alive_session_test_reconstruction_reads;
    const auto preview = ultra::alive_session_test_preview_reads;
    const unsigned events = dispatch_count;
    render(1);
    const auto after = state();
    assert(!after.fault);
    assert(dispatch_count - events == work->cost[0][0]);
    assert(ultra::alive_session_test_reconstruction_reads - reads <=
           work->cost[0][2] + work->cost[1][2]);
    assert(ultra::alive_session_test_preview_reads - preview <= 128);
    uint64_t roots = 0;
    for (unsigned t = 0; t < tracks; ++t)
      roots += (after.tracks[t].track_epoch - before.tracks[t].track_epoch) *
               (1 + c.tracks[t].effect_count);
    assert(roots <= work->cost[0][1] + work->cost[1][1] + work->cost[2][1]);
    for (unsigned m = 0; m < 5; ++m) {
      assert(work->cost[0][m] <= (m ? scheduled_frame[m] : 32));
      if (m) assert(work->cost[1][m] <= optional[m]);
      peaks[m] = std::max(peaks[m], work->cost[0][m]);
    }
    peaks[5] = std::max(peaks[5], work->placement[0]);
    assert(work->placement[0] <= 64 && work->placement[1] <= 2114);
  }
  work = nullptr;
  for (unsigned end = 0; end < frames.size(); ++end) {
    Cost scheduled{}, unscheduled{};
    uint64_t placement = 0, optional_placement = 0;
    for (unsigned width = 1; width <= std::min(1024u, end + 1); ++width) {
      const auto &f = frames[end + 1 - width];
      scheduled = ultra::clip_admission::add(scheduled, f.cost[0]);
      unscheduled = ultra::clip_admission::add(unscheduled, f.cost[1]);
      placement += f.placement[0];
      optional_placement += f.placement[1];
      for (unsigned m = 0; m < 5; ++m) {
        assert(scheduled[m] <= proof->prepared.future[m][width]);
        assert(scheduled[m] <= (m ? scheduled_window[m] : 64));
        if (m) assert(unscheduled[m] <= optional[m]);
        windows[m] = std::max(windows[m], scheduled[m]);
      }
      assert(placement <= proof->placement[width] && placement <= 512);
      assert(optional_placement <= 2114);
      windows[5] = std::max(windows[5], placement);
    }
  }
  std::printf("work tracks=%u roots=%u actual-frame/admitted-frame actual-window/admitted-window:",
              tracks, c.device_count);
  for (unsigned m = 0; m < 6; ++m) {
    const auto &curve = m == 5 ? proof->placement : proof->prepared.future[m];
    std::printf(" %llu/%llu,%llu/%llu", static_cast<unsigned long long>(peaks[m]),
                static_cast<unsigned long long>(curve[1]), static_cast<unsigned long long>(windows[m]),
                static_cast<unsigned long long>(curve[1024]));
  }
  std::puts(" reads/probes/clears/rolling1024=PASS");
}
void bounded_lookups() {
  auto c = multi(2);
  c.placement_count = 16;
  for (unsigned t = 0; t < 2; ++t) {
    c.tracks[t].placement_begin = t * 8;
    c.tracks[t].placement_count = 8;
    for (unsigned i = 0; i < 8; ++i)
      c.placements[t * 8 + i] = {t, t * 2, 0, 0, 1000 + i * 1800u, 100, 100};
  }
  assert(alive_session_configure_v4(&c, nullptr, 0));
  assert(ultra_external_start());
  Work measured{};
  work = &measured;
  // The reducer resolves only the final START, not all 64 queued requests.
  for (unsigned i = 0; i < 64; ++i) request();
  render(1);
  work = nullptr;
  assert(state().playing && !state().fault);
  assert(measured.probes[1] == 8 && measured.placement[1] == 2058);
  std::puts("eight placements/track, 64 STARTs: eight pre-reserved probes, one horizon=PASS");
}

void refusals() {
  auto c = multi(2);
  assert(alive_session_configure_v4(&c, nullptr, 0));
  assert(ultra_external_start());
  request();
  render(1024);
  unsigned refused = 0;
  auto reject = [&](AliveSessionConfigV4 bad) {
    const auto before = state();
    bad.preparation_revision = preparation + 1;
    assert(!alive_session_validate_v4(&bad));
    assert(!alive_session_configure_v4(&bad, nullptr, 0));
    const auto after = state();
    assert(after.playing && after.preparation_revision == before.preparation_revision &&
           after.position == before.position && after.generation == before.generation);
    for (unsigned t = 0; t < 2; ++t)
      assert(after.tracks[t].phase == before.tracks[t].phase &&
             after.tracks[t].track_epoch == before.tracks[t].track_epoch);
    ++refused;
  };
  auto bad = c;
  bad.tracks[1].instrument = 0; reject(bad);
  bad = c; bad.devices[1].document = bad.devices[0].document; reject(bad);
  bad = c; bad.device_count = 3; bad.devices[2] = bad.devices[1];
  bad.devices[2].document = 2; reject(bad);
  bad = c; bad.sources[0].track = 1; reject(bad);
  bad = c; bad.sources[1].event_begin = 0; reject(bad);
  bad = c; bad.event_count = 5; bad.events[4] = bad.events[0]; reject(bad);
  bad = c; bad.event_count = 1025; reject(bad);
  bad = c; bad.slots[4].source = 0; reject(bad);
  bad = c; bad.tracks[0].slots[1] = 0; reject(bad);
  bad = c; bad.tracks[1].slots[3] = ALIVE_SESSION_V4_NONE; reject(bad);
  bad = c; bad.slots[7].source_offset = 16384; reject(bad);
  bad = c; bad.placements[3].source = 0; reject(bad);
  bad = c; bad.placements[1].start_frame = 1024; reject(bad);
  bad = c; bad.placements[0].source_offset = UINT64_MAX; reject(bad);
  bad = c; bad.placements[0].duration_frames = UINT64_MAX; reject(bad);
  bad = c; bad.tracks[0].placement_count = 9; reject(bad);
  bad = c; bad.source_count = 7;
  for (unsigned i = 4; i < 7; ++i) {
    bad.sources[i] = bad.sources[0]; bad.sources[i].event_count = 0;
  }
  reject(bad);
  bad = c; bad.sources[3].owned_masks[0] = 1; reject(bad);
  bad = c; bad.events[3].device = 0; reject(bad);
  bad = c; bad.events[3].target = 128; reject(bad);
  bad = c; bad.events[3].kind = ALIVE_SESSION_AUTOMATION; reject(bad);
  bad = c; bad.sources[3].event_count = 5; bad.event_count = 8;
  for (unsigned i = 0; i < 5; ++i) bad.events[3 + i] = {0, 1, ALIVE_SESSION_NOTE_ON, 1, 60 + i, 80};
  reject(bad);
  bad = c; bad.profile = bad.work_policy = 3; reject(bad);
  bad = c; bad.devices[0].output_layout = 1; reject(bad);
  bad = c; bad.tracks[0].gain = 2.01; reject(bad);
  bad = c; bad.loop_enabled = 1; reject(bad);
  bad = c; bad.placements[0].loop_enabled = 1; reject(bad);
  bad = c; bad.slots[7].loop_enabled = 1; reject(bad);
  bad = c; bad.audio_buffer_count = 1; reject(bad);
  for (unsigned action : {ALIVE_SESSION_V4_LAUNCH, ALIVE_SESSION_V4_TRACK_STOP,
                          ALIVE_SESSION_V4_RETURN}) {
    AliveSessionRequestV4 r{};
    r.version = 4; r.struct_bytes = sizeof r;
    r.preparation_revision = preparation; r.request_serial = ++serial;
    r.kind = ALIVE_SESSION_V4_TRACK_ACTIONS; r.track_mask = 2;
    r.tracks[1] = {action, action == ALIVE_SESSION_V4_LAUNCH ? 3u : ALIVE_SESSION_V4_NONE};
    AliveSessionReceiptV4 out{}; out.version = 4; out.struct_bytes = sizeof out;
    assert(!alive_session_request_v4(&r, &out) && out.error == ALIVE_SESSION_V4_FEATURE_DISABLED);
  }
  assert(request(ALIVE_SESSION_V4_SEEK, false).error == ALIVE_SESSION_V4_FEATURE_DISABLED);
  render(1024);
  assert(state().playing && state().tracks[1].phase == 2748);
  std::printf("transactional malformed/ownership/unused-source/loops/audio refusals=%u future-actions=4 PASS\n", refused);

  c = multi(2);
  c.source_count = 8;
  for (unsigned i = 4; i < 8; ++i) {
    c.sources[i] = c.sources[(i - 4) / 2 * 2];
    c.sources[i].event_count = 0;
  }
  c.slots[7].source = 7;
  assert(alive_session_configure_v4(&c, nullptr, 0));
  assert(state().source_count == 8 && state().slot_count == 8);
  c = multi(8);
  c.slot_count = 32;
  for (unsigned t = 2; t < 8; ++t)
    for (unsigned i = 0; i < 4; ++i) {
      c.tracks[t].slots[i] = t * 4 + i;
      c.slots[t * 4 + i] = {t, t * 2 + i % 2, 0, 0, i * 100u};
    }
  assert(!alive_session_validate_v4(&c));
  AliveSessionDiagnosticV4 d{}; d.version = 4; d.struct_bytes = sizeof d;
  assert(alive_session_diagnostic_v4(&d) && d.resource == 6 && d.limit == 64);
  std::printf("shape-valid eight-track/four-slot refusal placement=%llu/64 width=%u PASS\n",
              static_cast<unsigned long long>(d.observed), d.window_frames);
}
void removed_configuration() {
  auto c = multi(2, 2);
  assert(alive_session_configure_v4(&c, nullptr, 0));
  assert(ultra_external_start()); request(); render(1024);
  ultra_audio_stop();
  assert(alive_session_reset());
  assert(ultra_external_start());
  for (unsigned block = 0; block < 8; ++block) {
    render(1024);
    for (unsigned i = 0; i < 1024; ++i) assert(left[i] == 0 && right[i] == 0);
  }
  std::puts("removed configuration: all real roots remain silent across later fragments=PASS");
}

void adjacent_automation() {
  auto c = multi(2, 2);
  c.placements[0] = {0, 0, 0, 0, 512, 1024, 1000};
  c.placements[1] = {0, 0, 0, 0, 1536, 1024, 1000};
  for (unsigned i = 1; i < 4; ++i) {
    c.events[5 + i] = c.events[i];
    c.sources[i].event_begin = 5 + i;
  }
  c.events[0] = {0, 0, ALIVE_SESSION_NOTE_ON, 0, 61, 100};
  c.events[1] = {0, 0, ALIVE_SESSION_NOTE_ON, 0, 64, 100};
  c.events[2] = {500, 0, ALIVE_SESSION_AUTOMATION, 0, 0, 1000};
  c.events[3] = {1000, 0, ALIVE_SESSION_NOTE_OFF, 0, 61, 0};
  c.events[4] = {1000, 0, ALIVE_SESSION_AUTOMATION, 0, 0, 2000};
  c.events[5] = {1000, 0, ALIVE_SESSION_NOTE_ON, 0, 60, 90};
  c.event_count = 9;
  c.sources[0].event_count = 6;
  c.sources[0].lane_count = c.sources[0].owned_masks[0] = 1;
  c.devices[0].parameters[0].automated = 1;
  assert(alive_session_configure_v4(&c, nullptr, 0));
  assert(ultra_external_start());
  trace_origin = state().absolute_frame; dispatch_count = 0;
  request(); render(512);
  auto before = state();
  render(1);
  auto after = state();
  assert(after.devices[0].effective[0] == 2000);
  assert(after.tracks[0].track_epoch == before.tracks[0].track_epoch + 1);
  assert(after.tracks[1].track_epoch == before.tracks[1].track_epoch);
  render(1023); before = state(); render(1); after = state();
  assert(after.tracks[0].track_epoch == before.tracks[0].track_epoch + 1);
  assert(after.tracks[1].track_epoch == before.tracks[1].track_epoch && after.tracks[1].phase == 2237);
  assert(after.devices[0].effective[0] == 2000 && after.tracks[0].active_placement == 1);
  assert(dispatch_count == 9);
  for (unsigned occurrence = 0; occurrence < 2; ++occurrence) {
    const unsigned start = 1 + occurrence * 4;
    const unsigned kind[]{ALIVE_SESSION_NOTE_OFF, ALIVE_SESSION_AUTOMATION,
                          ALIVE_SESSION_NOTE_ON, ALIVE_SESSION_NOTE_ON};
    const unsigned target[]{61, 0, 64, 60};
    for (unsigned i = 0; i < 4; ++i) {
      const auto &e = dispatches[start + i];
      assert(e.kind == kind[i] && e.pitch == target[i] && e.source == 0 &&
             e.occurrence == occurrence && e.frame == 512 + occurrence * 1024);
    }
  }
  std::puts("two-track offset/automation/off/chased-before-ordinary/adjacent-one-clear=PASS");
}
void direct_transaction() {
  auto c = multi(2);
  auto workspace = std::make_unique<ultra::CanvasWorkspace>();
  auto owner = std::make_unique<ultra::AliveSession>();
  auto emit = [](alive::Event) { return true; };
  for (unsigned d = 0; d < 2; ++d) {
    UltraCanvasGraph graph{}; AliveSessionDeviceV2 descriptor{};
    saved_0(graph, descriptor);
    graph.revision = c.devices[d].revision;
    ultra::CanvasPlan plan{};
    assert(ultra::compile_canvas(graph, plan));
    assert(workspace->install(d, plan, 0, emit));
  }
  auto bad = c;
  bad.preparation_revision = c.preparation_revision + 1;
  bad.sources[3].event_begin = 0;
  for (unsigned version : {3u, 4u}) {
    if (version == 3) {
      AliveSessionConfigV3 old{};
      old.version = 3; old.struct_bytes = sizeof old;
      old.profile = old.work_policy = 1;
      old.track_count = old.device_count = old.clip_count = old.event_count = 2;
      old.preparation_revision = c.preparation_revision;
      old.length_frames = 16384; old.tempo_bpm = 120;
      for (unsigned t = 0; t < 2; ++t) {
        old.devices[t] = c.devices[t];
        old.tracks[t].chain.instrument = t;
        old.tracks[t].chain.gain = 0.1;
        std::fill_n(old.tracks[t].slots, 4, ALIVE_SESSION_V3_NONE);
        old.tracks[t].slots[0] = old.tracks[t].initial_clip = t;
        old.clips[t].track = t; old.clips[t].event_begin = t;
        old.clips[t].event_count = 1; old.clips[t].length_frames = 16384;
        old.events[t] = c.events[t * 2];
      }
      assert(owner->configure_v3(old, *workspace));
      AliveSessionRequestV3 r{}; r.version = 3; r.struct_bytes = sizeof r;
      r.kind = 1; r.preparation_revision = c.preparation_revision; r.request_serial = 1;
      AliveSessionReceiptV3 receipt{}; receipt.version = 3; receipt.struct_bytes = sizeof receipt;
      assert(owner->request_v3(r, receipt));
    } else {
      c.preparation_revision += 2; bad.preparation_revision = c.preparation_revision + 1;
      assert(owner->configure_v4(c, nullptr, 0, *workspace));
      AliveSessionRequestV4 r{}; r.version = 4; r.struct_bytes = sizeof r;
      r.kind = 1; r.preparation_revision = c.preparation_revision; r.request_serial = 2;
      AliveSessionReceiptV4 receipt{}; receipt.version = 4; receipt.struct_bytes = sizeof receipt;
      assert(owner->request_v4(r, receipt));
    }
    owner->begin(*workspace); owner->sample(*workspace); owner->advance(*workspace, 0, 0);
    owner->publish(*workspace);
    auto check = [&](auto &snapshot, auto read) {
      assert((owner.get()->*read)(snapshot));
      const auto before = snapshot;
      assert(before.playing);
      for (unsigned failure = 0; failure < 3; ++failure) {
        auto rejected = failure == 0 ? bad : c;
        rejected.preparation_revision = c.preparation_revision + 1;
        if (failure == 1) rejected.devices[1].parameters[0].node = UINT32_MAX;
        if (failure == 2)
          for (unsigned i = 0; i < 3; ++i)
            rejected.placements[i] = {0, 0, 0, 0, 10 + i * 20u, 10, 0};
        assert(!owner->configure_v4(rejected, nullptr, 0, *workspace));
        assert((owner.get()->*read)(snapshot));
        assert(snapshot.rejected > before.rejected);
        snapshot.rejected = before.rejected;
        assert(!std::memcmp(&snapshot, &before, sizeof snapshot));
      }
      owner->sample(*workspace); owner->advance(*workspace, 0, 0); owner->publish(*workspace);
      assert((owner.get()->*read)(snapshot));
      assert(snapshot.playing && snapshot.position == before.position + 1);
      for (unsigned t = 0; t < 2; ++t)
        assert(snapshot.tracks[t].track_epoch == before.tracks[t].track_epoch);
    };
    if (version == 3) {
      AliveSessionStateV3 snapshot{}; snapshot.version = 3; snapshot.struct_bytes = sizeof snapshot;
      check(snapshot, &ultra::AliveSession::snapshot_v3);
    } else {
      AliveSessionStateV4 snapshot{}; snapshot.version = 4; snapshot.struct_bytes = sizeof snapshot;
      check(snapshot, &ultra::AliveSession::snapshot_v4);
    }
  }
  std::puts("direct native rejected configuration preserves playing v3/v4 publication and continuation=PASS");
}
int main(int argc, char **argv) {
  ultra::alive_session_test_charge = trace_work;
  ultra::alive_session_test_placement_probe = trace_probe;
  ultra::alive_session_test_dispatch = trace_event;
  ultra::alive_session_test_placement_charge = trace_placement;
  if (argc == 2 && std::strcmp(argv[1], "--lookups") == 0) {
    bounded_lookups();
    ultra_audio_stop();
    assert(alive_session_reset());
    return 0;
  }
  for (unsigned tracks : {2u, 8u}) {
    const auto reference = run(tracks, 0, 1);
    for (unsigned part : {0u, 31u, 63u, 64u, 127u, 1024u}) same(reference, run(tracks, 0, part));
  }
  for (unsigned effects : {0u, 1u, 2u, 3u}) {
    const auto changed = run(2, effects, 31, true, false, false);
    const auto steady = run(2, effects, 1024, true, true, false);
    assert(changed.pcm == steady.pcm);
    assert(std::any_of(changed.pcm.begin() + 4608, changed.pcm.begin() + 6144,
                       [](float value) { return value != 0; }));
  }
  work_limits(2, 2);
  work_limits(8, 0);
  bounded_lookups();
  refusals();
  adjacent_automation();
  direct_transaction();
  removed_configuration();
  ultra_audio_stop();
  assert(alive_session_reset());
  std::puts("PASS: finite multi-track MIDI preparation and independent real PCM");
}
