#include "../src-tauri/native/alive_session.hpp"
#include "../src-tauri/native/backend.h"
#include "canvas_callback_guard.hpp"
#include "saved_graphs.hpp"
#include <cassert>
#include <chrono>
#include <cstdio>
#include <cstring>
#include <vector>

namespace {
std::array<UltraCanvasGraph, 6> graphs;
std::array<float, 1024> left, right;
uint64_t preparation = 100000, serial = 100000, revision = 100000;
std::array<ultra::clip_admission::Cost, 4> counters{};
void charge(unsigned family, const ultra::clip_admission::Cost &value) noexcept {
  for (unsigned i = 0; i < 5; ++i)
    counters[family][i] += value[i];
}
void render(unsigned n) {
  const auto reads = ultra::alive_session_test_reconstruction_reads;
  const auto previews = ultra::alive_session_test_preview_reads;
  const auto scans = counters[0][2] + counters[1][2] + counters[2][2];
  callback_guard::begin();
  assert(ultra_external_render(n, left.data(), right.data()));
  callback_guard::end();
  assert(ultra::alive_session_test_reconstruction_reads - reads <=
         counters[0][2] + counters[1][2] + counters[2][2] - scans);
  assert(ultra::alive_session_test_preview_reads - previews <= 56);
}
AliveSessionStateV3 state() {
  AliveSessionStateV3 out{};
  out.version = 3;
  out.struct_bytes = sizeof out;
  assert(alive_session_state_v3(&out));
  return out;
}
void request(unsigned kind, uint64_t position = 0) {
  AliveSessionRequestV3 r{};
  r.version = 3;
  r.struct_bytes = sizeof r;
  r.kind = kind;
  r.position = position;
  r.preparation_revision = preparation;
  r.request_serial = ++serial;
  AliveSessionReceiptV3 out{};
  out.version = 3;
  out.struct_bytes = sizeof out;
  assert(alive_session_request_v3(&r, &out));
}
AliveSessionConfigV3 fixture(bool maximal, uint64_t length, bool populated, bool dense = false,
                             bool heavy = false, bool armed_demo = false) {
  ultra_audio_stop();
  assert(alive_session_reset());
  for (unsigned i = 0; i < 16; ++i)
    assert(ultra_canvas_close_document(i));
  AliveSessionConfigV3 c{};
  c.version = 3;
  c.struct_bytes = sizeof c;
  c.profile = 1;
  c.work_policy = 1;
  c.preparation_revision = ++preparation;
  c.track_count = 2;
  c.device_count = 6;
  c.clip_count = 2;
  c.length_frames = length;
  c.tempo_bpm = 240;
  c.loop_enabled = 1;
  for (unsigned t = 0; t < 2; ++t) {
    auto &tr = c.tracks[t];
    tr.chain.instrument = t * 3;
    tr.chain.effect_count = 2;
    tr.chain.effects[0] = t * 3 + 1;
    tr.chain.effects[1] = t * 3 + 2;
    tr.chain.gain = 1;
    std::fill_n(tr.slots, 4, UINT32_MAX);
    tr.slots[0] = t;
    tr.initial_clip = t;
    for (unsigned i = 0; i < 3; ++i) {
      const unsigned d = t * 3 + i;
      auto &g = graphs[d];
      auto &device = c.devices[d];
      if (i == 0)
        saved_0(g, device);
      if (i == 1)
        saved_1(g, device);
      if (i == 2)
        saved_2(g, device);
      if (armed_demo && i == 0)
        g.nodes[11].p0 = 1;
      if (maximal) {
        while (!heavy && device.parameter_count < 16) {
          auto &n = g.nodes[g.node_count++];
          n.id = 100 + g.node_count;
          n.kind = ultra::LineSignal;
          n.p0 = 1;
          device.parameters[device.parameter_count++] = {n.id, 0, 0, 0, 1, 0, 2};
        }
        while (g.node_count < 32) {
          auto &n = g.nodes[g.node_count++];
          n.id = 100 + g.node_count;
          n.kind = i == 0 ? ultra::MultiplyVoice : ultra::SignalMultiply;
        }
        // The admitted 64-edge maximum, all active signal edges. Duplicate routes
        // are forbidden by the compiler; use distinct source/destination pairs.
        for (unsigned from = 0; from < g.node_count && g.edge_count < 64; ++from)
          for (unsigned to = from + 1; to < g.node_count && g.edge_count < 64; ++to) {
            const auto &a = g.nodes[from];
            const auto &b = g.nodes[to];
            if (b.id < 100 || (b.kind != ultra::MultiplyVoice && b.kind != ultra::SignalMultiply))
              continue;
            if (i == 0 ? !(a.kind == ultra::PolyNote || a.kind == ultra::MultiplyVoice ||
                           a.kind == ultra::SawVoice || a.kind == ultra::FilterVoice ||
                           a.kind == ultra::AdsrVoice)
                       : !(a.kind == ultra::LineSignal || a.kind == ultra::SignalMultiply))
              continue;
            g.edges[g.edge_count++] = {a.id, 0, b.id, 0};
          }
      }
      g.revision = ++revision;
      device.document = d;
      device.revision = g.revision;
      assert(ultra_canvas_install_document(d, &g));
    }
    auto &cl = c.clips[t];
    cl.track = t;
    cl.length_frames = length;
    cl.event_begin = c.event_count;
    if (dense) {
      cl.lane_count = 1;
      cl.owned_masks[t * 3] = 1;
      c.devices[t * 3].parameters[0].automated = 1;
      for (unsigned i = 0; i < 512; ++i) {
        const unsigned kind = i < 128 ? 2 : i < 256 ? 0 : 1;
        const double value = kind == 2 ? 100 : kind == 0 ? 0 : c.devices[t * 3].parameters[0].base;
        c.events[c.event_count++] = {uint64_t(i * 64 + t * 32), t,    kind, t * 3,
                                     kind == 1 ? 0 : i % 128,   value};
      }
    } else if (populated) {
      const unsigned voices = length < 1024 ? 2 : 4;
      for (unsigned i = 0; i < voices; ++i)
        c.events[c.event_count++] = {0, t, 2, t * 3, 60 + i, 100};
    }
    cl.event_count = c.event_count - cl.event_begin;
  }
  if (armed_demo) {
    const double on = 1;
    for (unsigned d : {0u, 3u})
      assert(ultra_canvas_event_document(d, c.devices[d].revision, 12, 0, 1, &on));
  }
  assert(alive_session_validate_prepared_v3(&c, graphs.data(), 6));
  auto nonloop = c;
  nonloop.loop_enabled = 0;
  assert(alive_session_validate_prepared_v3(&nonloop, graphs.data(), 6));
  assert(alive_session_configure_v3(&c));
  assert(ultra_external_start());
  request(1);
  render(1024);
  assert(!state().fault);
  return c;
}
void profile_control_isolation() {
  auto c = fixture(false, 48000, false, false, false, true);
  const double on = 1;
  assert(!ultra_canvas_event_document(0, c.devices[0].revision, 12, 0, 1, &on));
  assert(!ultra_canvas_param_hot_document(0, c.devices[0].revision, 12, 0, 1, 1));
  for (unsigned frame = 0; frame < 100; ++frame) {
    for (unsigned d = 0; d < 6; ++d)
      for (unsigned p = 0; p < c.devices[d].parameter_count; ++p)
        assert(alive_session_base_v2(d, c.devices[d].revision, p, c.devices[d].parameters[p].base));
    render(1024);
    const auto s = state();
    assert(!s.fault && !s.tracks[0].mixer.active_voices && !s.tracks[1].mixer.active_voices &&
           s.peak_left == 0 && s.peak_right == 0);
  }
  auto bad = c;
  bad.devices[0].parameters[bad.devices[0].parameter_count++] = {12, 0, 0, 0, 1, 0, 1};
  assert(alive_session_validate_device_v2(&bad.devices[0], &graphs[0]));
  assert(!alive_session_validate_prepared_v3(&bad, graphs.data(), 6));
  auto changed = graphs;
  auto &graph = changed[0];
  auto &source = graph.nodes[graph.node_count++];
  source.id = 30;
  source.kind = ultra::Snapshot;
  source.p0 = 1;
  graph.edges[graph.edge_count++] = {8, 0, 30, 0};
  graph.edges[graph.edge_count++] = {30, 0, 12, 0};
  assert(alive_session_validate_device_v2(&c.devices[0], &graph));
  assert(!alive_session_validate_prepared_v3(&c, changed.data(), 6));
  std::puts("PASS: authored-on and prearmed demo timers cleared; hosted editor ingress refused; timer "
            "bindings and autonomous signal/control route rejected");
}
void preparation_bound() {
  auto c = fixture(true, 48000, true, true);
  c.clip_count = 8;
  for (unsigned t = 0; t < 2; ++t)
    for (unsigned slot = 1; slot < 4; ++slot) {
      const unsigned index = 2 + t * 3 + slot - 1;
      c.tracks[t].slots[slot] = index;
      c.clips[index].track = t;
      c.clips[index].event_begin = c.event_count;
      c.clips[index].length_frames = 188;
    }
  const auto begin = std::chrono::steady_clock::now();
  assert(alive_session_validate_prepared_v3(&c, graphs.data(), 6));
  const auto ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - begin).count();
  assert(ms < 5000);
  std::printf("PASS: maximum profile preparation clips=8 events=1024 roots=6 params=96 elapsed_ms=%.3f "
              "bound_ms=5000\n",
              ms);
}
std::vector<float> unaffected_chain(unsigned action, const std::vector<unsigned> &partitions) {
  auto c = fixture(false, 96032, true);
  ultra_audio_stop();
  assert(alive_session_reset());
  c.preparation_revision = ++preparation;
  c.tracks[1].chain.solo = 1;
  c.devices[4].bypassed = 1;
  c.clip_count = 3;
  c.tracks[0].slots[1] = 2;
  c.clips[2] = c.clips[0];
  c.clips[2].event_begin = c.event_count;
  for (unsigned i = 0; i < c.clips[0].event_count; ++i) {
    c.events[c.event_count] = c.events[i];
    c.events[c.event_count++].target += 12;
  }
  assert(alive_session_configure_v3(&c));
  assert(ultra_external_start());
  request(1);
  std::vector<float> samples;
  unsigned block = 0;
  for (unsigned section = 0; section < 2; ++section) {
    const unsigned begin = section ? 31 : 0, end = section ? 50000 : 31;
    if (section && action) {
      AliveSessionRequestV3 r{};
      r.version = 3;
      r.struct_bytes = sizeof r;
      r.kind = ALIVE_SESSION_V3_TRACK_ACTIONS;
      r.preparation_revision = preparation;
      r.request_serial = ++serial;
      r.track_mask = 1;
      r.tracks[0] = {action, action == ALIVE_SESSION_V3_LAUNCH ? 1u : UINT32_MAX};
      AliveSessionReceiptV3 receipt{};
      receipt.version = 3;
      receipt.struct_bytes = sizeof receipt;
      assert(alive_session_request_v3(&r, &receipt));
    }
    for (unsigned f = begin; f < end;) {
      const auto n = std::min(partitions[block++ % partitions.size()], end - f);
      render(n);
      samples.insert(samples.end(), left.begin(), left.begin() + n);
      f += n;
    }
  }
  const auto s = state();
  assert(!s.fault && s.tracks[1].mixer.active_voices == 4 && !s.tracks[0].pending_action);
  assert(s.tracks[0].active_clip == (action == 1 ? 2 : action == 2 ? UINT32_MAX : 0));
  return samples;
}
void local_effect_isolation() {
  const auto reference = unaffected_chain(0, {1024});
  assert(std::any_of(reference.begin(), reference.end(), [](float sample) { return sample != 0; }));
  assert(reference == unaffected_chain(ALIVE_SESSION_V3_LAUNCH, {31, 63, 64, 127, 1024, 1}));
  assert(reference == unaffected_chain(ALIVE_SESSION_V3_TRACK_STOP, {127, 1024, 31}));
  std::puts("PASS: other saved instrument/effect chain stays sample-identical across local launch/stop and "
            "mixed partitions, including warm bypass");
}
void scene_fixed_reduction() {
  fixture(true, 48000, true);
  alive_session_stop_v3(); render(1024);
  std::array<uint64_t, 64> requests{};
  for (unsigned i = 0; i < requests.size(); ++i) {
    AliveSessionRequestV3 r{};
    r.version = 3; r.struct_bytes = sizeof r; r.kind = ALIVE_SESSION_V3_TRACK_ACTIONS;
    r.preparation_revision = preparation; r.request_serial = ++serial; r.track_mask = 3;
    r.tracks[0] = r.tracks[1] = {ALIVE_SESSION_V3_LAUNCH, 0};
    AliveSessionReceiptV3 receipt{}; receipt.version = 3; receipt.struct_bytes = sizeof receipt;
    assert(alive_session_request_v3(&r, &receipt)); requests[i] = r.request_serial;
  }
  render(1);
  const auto s = state();
  assert(!s.playing && !s.fault && !s.tracks[0].mixer.active_voices && !s.tracks[1].mixer.active_voices);
  for (unsigned i = 0; i < requests.size(); ++i) {
    const auto &r = s.receipts[requests[i] % 128];
    assert(r.request_serial == requests[i]);
    assert(i + 1 == requests.size() ? r.applied_mask == 3 : r.superseded_mask == 3);
  }
  std::puts("PASS: saved maximal six-root scene burst reduces 128 members with callback guards; final cue alone applies");
}
template <class Before> void measure(const char *name, unsigned frames, unsigned count, Before before) {
  std::vector<double> times;
  times.reserve(count);
  std::array<ultra::clip_admission::Cost, 4> maxima{};
  uint64_t max_reads = 0, max_previews = 0;
  for (unsigned i = 0; i < count; ++i) {
    before(i);
    counters = {};
    const auto reads = ultra::alive_session_test_reconstruction_reads;
    const auto previews = ultra::alive_session_test_preview_reads;
    const auto begin = std::chrono::steady_clock::now();
    render(frames);
    const auto end = std::chrono::steady_clock::now();
    times.push_back(std::chrono::duration<double, std::micro>(end - begin).count());
    assert(!state().fault);
    max_reads = std::max(max_reads, ultra::alive_session_test_reconstruction_reads - reads);
    max_previews = std::max(max_previews, ultra::alive_session_test_preview_reads - previews);
    for (unsigned f = 0; f < 4; ++f)
      for (unsigned m = 0; m < 5; ++m)
        maxima[f][m] = std::max(maxima[f][m], counters[f][m]);
  }
  std::sort(times.begin(), times.end());
  double total = 0;
  for (auto t : times)
    total += t;
  std::printf("%s frames=%u iterations=%u mean_us=%.3f p99_us=%.3f p999_us=%.3f max_us=%.3f\n", name, frames,
              count, total / count, times[(count - 1) * 99 / 100], times[(count - 1) * 999 / 1000],
              times.back());
  std::printf("  actual_reconstruction_reads=%llu preview_reads=%llu fixed_preview_limit=56\n",
              (unsigned long long)max_reads, (unsigned long long)max_previews);
  for (unsigned f = 0; f < 4; ++f)
    std::printf("  family=%u max_events=%llu root_clears=%llu event_scans=%llu parameter_writes=%llu "
                "guard_steps=%llu\n",
                f, (unsigned long long)maxima[f][0], (unsigned long long)maxima[f][1],
                (unsigned long long)maxima[f][2], (unsigned long long)maxima[f][3],
                (unsigned long long)maxima[f][4]);
}
void policy_upper_bound() {
  auto c = fixture(true, 48000, true);
  auto workspace = std::make_unique<ultra::CanvasWorkspace>();
  auto discard = [](alive::Event) { return true; };
  for (unsigned d = 0; d < 6; ++d) {
    ultra::CanvasPlan plan{};
    assert(ultra::compile_canvas(graphs[d], plan));
    assert(workspace->install(d, plan, 0, discard));
  }
  const auto limits = ultra::clip_admission::policy(1);
  const unsigned roots = unsigned(limits.scheduled_window.root_clears + limits.optional_window.root_clears +
                                  limits.emergency.root_clears);
  const unsigned writes =
      unsigned(limits.scheduled_window.parameter_writes + limits.optional_window.parameter_writes +
               limits.emergency.parameter_writes);
  volatile uint64_t scan_result = 0;
  for (unsigned frames : {64u, 128u, 256u, 1024u}) {
    std::vector<double> samples;
    samples.reserve(1200);
    for (unsigned iteration = 0; iteration < 1200; ++iteration) {
      render(1024); // Expire optional credits outside the measured interval.
      for (unsigned command = 0; command < 63; ++command) {
        const unsigned d = command % 6, p = command % 16;
        assert(alive_session_base_v2(d, c.devices[d].revision, p, c.devices[d].parameters[p].base));
      }
      request(2, 0);
      callback_guard::begin();
      const auto begin = std::chrono::steady_clock::now();
      assert(ultra_external_render(frames, left.data(), right.data()));
      workspace->begin_callback();
      // This deliberately adds all registered window ceilings to a real
      // signal/control/horizon/publication callback, including two emergency
      // full-session resets. It overcounts the work already done by render.
      for (unsigned clear = 0; clear < roots; ++clear) {
        auto &runtime = workspace->runtime(clear % 6);
        runtime.reset(runtime.plan());
      }
      for (unsigned write = 0; write < writes; ++write) {
        const unsigned d = write % 6, p = write % 16;
        auto &runtime = workspace->runtime(d);
        const auto &b = c.devices[d].parameters[p];
        assert(runtime.param(runtime.plan(), b.node, b.param, b.base, 0, discard));
      }
      for (unsigned event = 0; event < 64; ++event) {
        const unsigned d = (event % 2) * 3;
        ultra::CanvasMessage message{};
        message.count = 2;
        message.values[0] = event % 128;
        message.values[1] = 100;
        assert(workspace->event(d, c.devices[d].revision, c.devices[d].note_node, 0, message, 0, discard));
      }
      for (uint64_t scan = 0; scan < limits.scheduled_window.event_scans + limits.optional_window.event_scans;
           ++scan)
        scan_result += c.events[scan % 1024].frame;
      for (unsigned d = 0; d < 6; ++d)
        workspace->stop(d, 0, discard);
      const auto end = std::chrono::steady_clock::now();
      callback_guard::end();
      samples.push_back(std::chrono::duration<double, std::micro>(end - begin).count());
      assert(!state().fault);
    }
    std::sort(samples.begin(), samples.end());
    double total = 0;
    for (auto sample : samples)
      total += sample;
    std::printf(
        "combined_policy_upper_bound frames=%u iterations=1200 roots=%u writes=%u scans=%llu extra_events=64 "
        "guard_steps=%llu mean_us=%.3f p99_us=%.3f p999_us=%.3f max_us=%.3f\n",
        frames, roots, writes,
        (unsigned long long)(limits.scheduled_window.event_scans + limits.optional_window.event_scans),
        (unsigned long long)limits.optional_window.guard_steps, total / 1200, samples[1187], samples[1197],
        samples.back());
  }
  (void)scan_result;
}
} // namespace
int main(int argc, char **argv) {
  std::setvbuf(stdout, nullptr, _IOLBF, 0);
  ultra::alive_session_test_charge = charge;
  profile_control_isolation();
  preparation_bound();
  local_effect_isolation();
  scene_fixed_reduction();
  if (argc == 2 && std::strcmp(argv[1], "--verify") == 0) {
    for (bool maximal : {false, true}) {
      fixture(maximal, 188, false);
      fixture(maximal, 188, true);
      fixture(maximal, 48000, true, true);
    }
    fixture(true, 48000, true, false, true);
    ultra_audio_stop();
    assert(alive_session_reset());
    std::puts("PASS: saved/maximal graph profile and shortest empty/populated/dense fixtures");
    return 0;
  }
  for (bool maximal : {false, true}) {
    auto c = fixture(maximal, 48000, true);
    for (unsigned frames : {1u, 31u, 64u, 128u, 256u, 512u, 1024u})
      measure(maximal ? "max_graph_sustain" : "saved_graph_sustain", frames, 1200, [](unsigned) {});
    c = fixture(maximal, 188, false);
    for (unsigned frames : {64u, 256u, 1024u})
      measure(maximal ? "max_short_empty" : "saved_short_empty", frames, 1200, [](unsigned) {});
    c = fixture(maximal, 188, true);
    for (unsigned frames : {64u, 256u, 1024u})
      measure(maximal ? "max_short_populated" : "saved_short_populated", frames, 1200, [](unsigned) {});
    c = fixture(maximal, 48000, true, true);
    for (unsigned frames : {64u, 256u, 1024u})
      measure(maximal ? "max_dense_controls" : "saved_dense_controls", frames, 1200, [&](unsigned i) {
        for (unsigned command = 0; command < 61; ++command) {
          const unsigned d = command % 6, p = command % c.devices[d].parameter_count;
          assert(alive_session_base_v2(d, c.devices[d].revision, p, c.devices[d].parameters[p].base));
        }
        assert(alive_session_bypass_v2(1, c.devices[1].revision, i % 2));
        assert(alive_session_mixer(1, 1, 0, 0));
        request(2, 32767);
      });
    measure(maximal ? "max_stop_after_full_queue" : "saved_stop_after_full_queue", 64, 1200, [&](unsigned i) {
      for (unsigned command = 0; command < 64; ++command) {
        const unsigned d = command % 6;
        assert(alive_session_base_v2(d, c.devices[d].revision, 0, c.devices[d].parameters[0].base));
      }
      alive_session_stop_v3();
      (void)i;
    });
  }
  fixture(true, 48000, true, false, true);
  for (unsigned frames : {64u, 256u, 1024u})
    measure("max_voice_edges_sustain", frames, 1200, [](unsigned) {});
  policy_upper_bound();
  ultra_audio_stop();
  assert(alive_session_reset());
  std::puts("PASS: actual saved and maximal admitted graph measurement, callback guards, no runtime faults");
}
