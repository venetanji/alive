#include "alive_session_capacity_fixture.hpp"
#ifdef CAPACITY_GUARDS
#include "canvas_callback_guard.hpp"
#endif
#include <atomic>
#include <chrono>
#include <cstdio>
#include <functional>
#include <thread>
#include <vector>

using namespace capacity_fixture;
namespace {
std::array<float, 1024> left{}, right{};
std::array<ultra::clip_admission::Cost, 4> counters{};
void charge(unsigned family, const ultra::clip_admission::Cost &value) noexcept {
  for (unsigned m = 0; m < 5; ++m) counters[family][m] += value[m];
}
void render(unsigned frames) {
#ifdef CAPACITY_GUARDS
  callback_guard::begin();
#endif
  assert(ultra_external_render(frames, left.data(), right.data()));
#ifdef CAPACITY_GUARDS
  callback_guard::end();
#endif
}
void begin(const Fixture &f) {
  f.install();
  request(f, 1);
  render(1024);
  assert(!state().fault && state().playing);
}
bool density_refusal(const Fixture &f) {
  if (alive_session_validate_prepared_v3(&f.config, f.graphs.data(), f.config.device_count)) return false;
  AliveSessionDiagnosticV3 d{}; d.version = 3; d.struct_bytes = sizeof d;
  assert(alive_session_diagnostic_v3(&d));
  assert(f.config.track_count >= 4 && f.config.length_frames == 188 && f.config.event_count == 8 &&
         d.error == ALIVE_SESSION_V3_EVENT_WINDOW_LIMIT && d.observed == 96 && d.limit == 64);
  std::printf("REFUSED,tracks=%u,devices=%u,length=188,events=8,window=1024,observed=96,limit=64,authored_timing_unchanged=true\n",
              f.config.track_count, f.config.device_count);
  return true;
}
void limits() {
  auto p = ultra::clip_admission::policy(1), q = ultra::clip_admission::policy(2);
  assert(p.work_policy == 1 && p.max_tracks == 2 && p.max_devices == 6);
  assert(p.scheduled_frame.root_clears == 18 && p.scheduled_window.parameter_writes == 3520);
  assert(q.features == ALIVE_SESSION_V3_FEATURE_ADMITTED && q.work_policy == 2);
  assert(q.max_tracks == 8 && q.max_devices == 16 && q.max_clips == 32);
  assert(q.scheduled_frame.root_clears == 48 && q.scheduled_frame.event_scans == 3072 &&
         q.scheduled_frame.parameter_writes == 1568);
  assert(q.scheduled_window.root_clears == 288 && q.scheduled_window.event_scans == 18432 &&
         q.scheduled_window.parameter_writes == 9280);
  assert(q.optional_window.root_clears == 16 && q.optional_window.parameter_writes == 512 &&
         q.optional_window.event_scans == 1024 && q.optional_window.guard_steps == 9252);
  assert(q.emergency.root_clears == 32 && q.emergency.parameter_writes == 512);
  assert(q.max_frame_events == 32 && q.max_window_events == 64 && q.max_events == 1024 &&
         q.max_commands == 64 && q.max_receipts == 128);
}
void rejected_density_and_roots() {
  Fixture f(8, 16, Music::Sustain);
  auto bad = f.config;
  bad.device_count = 17;
  // Bounds must reject before dereferencing any graph dependency.
  assert(!alive_session_validate_prepared_v3(&bad, nullptr, 17));
  bad = f.config;
  bad.event_count = 0;
  for (unsigned t = 0; t < 8; ++t) {
    const auto d = bad.tracks[t].chain.instrument;
    auto &clip = bad.clips[t * 4];
    clip.event_begin = bad.event_count;
    clip.event_count = 5;
    clip.lane_count = 2;
    clip.owned_masks[d] = 3;
    bad.devices[d].parameters[0].automated = bad.devices[d].parameters[1].automated = 1;
    for (unsigned p = 0; p < 2; ++p)
      bad.events[bad.event_count++] = {0, t, 1, d, p, bad.devices[d].parameters[p].base};
    for (unsigned n = 0; n < 3; ++n) bad.events[bad.event_count++] = {0, t, 2, d, 60 + n, 100};
    for (unsigned slot = 1; slot < 4; ++slot) bad.clips[t * 4 + slot].event_begin = bad.event_count;
  }
  assert(!alive_session_validate_prepared_v3(&bad, f.graphs.data(), 16));
  AliveSessionDiagnosticV3 diagnostic{};
  diagnostic.version = 3; diagnostic.struct_bytes = sizeof diagnostic;
  assert(alive_session_diagnostic_v3(&diagnostic));
  assert(diagnostic.error == ALIVE_SESSION_V3_EVENT_FRAME_LIMIT && diagnostic.observed == 40 && diagnostic.limit == 32);
  std::puts("PASS: seventeen-root dependency refusal and exact forty-event frame rejection");
}
std::vector<float> partitioned(unsigned action_track, unsigned action, const std::vector<unsigned> &parts) {
  Fixture f(8, 16, Music::Sustain);
  f.config.tracks[(action_track + 1) % 8].chain.solo = 1;
  begin(f);
  std::vector<float> samples;
  unsigned block = 0;
  request(f, 2, 0);
  render(1024);
  const auto before = state();
  assert(before.playing && before.tracks[action_track].mixer.active_voices == 4);
  AliveSessionReceiptV3 issued{};
  if (action) issued = request(f, 3, 0, action_track, action == 2 ? UINT32_MAX : 1, action);
  const auto target = before.absolute_frame + f.config.length_frames - before.position;
  bool witnessed_action = false;
  for (unsigned frame = 0; frame < 50000;) {
    const auto n = std::min(parts[block++ % parts.size()], 50000 - frame);
    render(n);
    samples.insert(samples.end(), left.begin(), left.begin() + n);
    frame += n;
    if (action && !witnessed_action) {
      const auto observed = state();
      for (const auto &receipt : observed.receipts) {
        if (receipt.request_serial != issued.request_serial) continue;
        assert(receipt.error == ALIVE_SESSION_V3_OK && receipt.target_frame == target);
        if (observed.absolute_frame <= target) {
          assert(receipt.status == ALIVE_SESSION_V3_PENDING);
          assert(observed.tracks[action_track].mixer.active_voices == 4);
          continue;
        }
        const auto &track = observed.tracks[action_track];
        assert(receipt.status == ALIVE_SESSION_V3_APPLIED && receipt.applied_mask == (1u << action_track));
        assert(!receipt.pending_mask && !receipt.rejected_mask && !receipt.canceled_mask && !receipt.superseded_mask);
        assert(observed.playing && !observed.fault && !track.pending_action && !track.pending_serial);
        assert(track.active_clip == (action == 2 ? ALIVE_SESSION_V3_NONE : action_track * 4 + 1));
        assert(track.phase == (action == 2 ? 0 : observed.absolute_frame - target));
        assert(!track.mixer.active_voices);
        witnessed_action = true;
        std::printf("TARGET,track=%u,action=%u,serial=%llu,target=%llu,observed=%llu,phase=%llu,voices_before=4,voices_after=0,receipt=applied\n",
                    action_track, action, (unsigned long long)issued.request_serial, (unsigned long long)target,
                    (unsigned long long)observed.absolute_frame, (unsigned long long)track.phase);
      }
    }
  }
  const auto final = state();
  assert(final.playing && !final.fault);
  if (action) {
    assert(witnessed_action && !final.tracks[action_track].mixer.active_voices);
    assert(final.tracks[action_track].active_clip == (action == 2 ? ALIVE_SESSION_V3_NONE : action_track * 4 + 1));
    assert(final.tracks[action_track].phase == (action == 2 ? 0 : final.absolute_frame - target));
  }
  return samples;
}
void deterministic_local() {
  for (unsigned t = 0; t < 8; ++t) {
    const auto reference = partitioned(t, 0, {1024});
    assert(reference == partitioned(t, 1, {1, 31, 64, 127, 1024}));
    assert(reference == partitioned(t, 2, {31, 1024, 1, 127}));
  }
  std::puts("PASS: eight local launch/Stop paths preserve other saved chains across exact partitions");
}
void concurrent_publication() {
  Fixture f(8, 16, Music::Sustain);
  begin(f);
  const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(30);
  auto wait_for = [&](const char *phase, auto ready) {
    while (!ready()) {
      if (std::chrono::steady_clock::now() >= deadline) {
        std::fprintf(stderr, "concurrent verification timed out: %s\n", phase);
        std::abort();
      }
      std::this_thread::yield();
    }
  };
  std::atomic<bool> go{false}, done{false}, reader_ready{false}, callback_ready{false};
  std::atomic<bool> rendering{false}, producer_active{false};
  std::atomic<unsigned> snapshots{0}, callbacks{0}, receipt_snapshots{0}, overlaps{0};
  std::atomic<unsigned> producer_progress{0}, reader_progress{0};
  unsigned first_overlap_callback = 0, last_overlap_callback = 0;
  uint64_t first_overlap_frame = 0, last_overlap_frame = 0;
  unsigned accepted = 0, refused = 0;
  auto submit = [&](unsigned i) {
    AliveSessionRequestV3 r{}; r.version = 3; r.struct_bytes = sizeof r;
    r.preparation_revision = f.config.preparation_revision; r.request_serial = ++serial;
    r.kind = 3; r.track_mask = 1u << (i % 8); r.tracks[i % 8] = {1, (i / 8) % 4};
    AliveSessionReceiptV3 receipt{}; receipt.version = 3; receipt.struct_bytes = sizeof receipt;
    if (alive_session_request_v3(&r, &receipt)) ++accepted;
    else { ++refused; assert(receipt.error == ALIVE_SESSION_V3_QUEUE_FULL || receipt.error == ALIVE_SESSION_V3_RECEIPT_BUSY); }
    if (!(i % 64)) alive_session_stop_v3();
    producer_progress = i + 1;
  };
  // Establish queue saturation before release, then require consumed requests
  // newer than this prefix in the simultaneous reader/render witnesses.
  for (unsigned i = 0; i < 128; ++i) submit(i);
  const auto first_live_serial = serial;
  auto reader = [&] {
    reader_ready = true;
    wait_for("reader start", [&] { return go.load(); });
    uint64_t previous = 0;
    while (!done.load()) {
      assert(std::chrono::steady_clock::now() < deadline);
      const auto before_callback = callbacks.load();
      const bool during_render = rendering.load();
      AliveSessionStateV3 s{}; s.version = 3; s.struct_bytes = sizeof s;
      if (!alive_session_state_v3(&s)) continue;
      const bool still_rendering = rendering.load();
      const auto after_callback = callbacks.load();
      assert(!s.fault && s.absolute_frame >= previous && s.track_count == 8 && s.device_count == 16);
      previous = s.absolute_frame;
      for (const auto &r : s.receipts) {
        if (r.status < ALIVE_SESSION_V3_PENDING) continue;
        assert((r.pending_mask | r.applied_mask | r.superseded_mask | r.canceled_mask | r.rejected_mask) == r.track_mask);
        assert(r.pending_mask + r.applied_mask + r.superseded_mask + r.canceled_mask + r.rejected_mask == r.track_mask);
      }
      if (s.last_consumed_request > first_live_serial) ++receipt_snapshots;
      // A Boolean true/false/true cycle may enclose a read between callbacks.
      if (during_render && still_rendering && before_callback == after_callback && producer_active.load() && !done.load() &&
          s.last_consumed_request > first_live_serial) {
        if (!overlaps.fetch_add(1)) {
          first_overlap_callback = before_callback;
          first_overlap_frame = s.absolute_frame;
        }
        last_overlap_callback = after_callback;
        last_overlap_frame = s.absolute_frame;
      }
      ++snapshots;
      reader_progress = after_callback;
    }
  };
  std::thread read_thread(reader);
  std::thread callback([&] {
    callback_ready = true;
    wait_for("callback start", [&] { return go.load(); });
    for (unsigned i = 0; i < 2048; ++i) {
      if (!(i % 64)) wait_for("producer progress", [&] { return producer_progress.load() > i * 2; });
      // Allocation wrappers are a separate single-thread diagnostic, not timings.
      rendering = true;
      assert(ultra_external_render(31, left.data(), right.data()));
      rendering = false;
      ++callbacks;
      // Test-only progress coordination remains outside the real render call.
      if (!((i + 1) % 64)) {
        wait_for("producer batch", [&] { return producer_progress.load() >= (i + 1) * 2; });
        wait_for("reader progress", [&] { return reader_progress.load() >= i + 1; });
      }
    }
    done = true;
  });
  wait_for("worker readiness", [&] { return reader_ready.load() && callback_ready.load(); });
  producer_active = true;
  go = true;
  for (unsigned i = 128; i < 4096; ++i) {
    if (!(i % 128)) wait_for("callback progress", [&] { return callbacks.load() >= i / 2; });
    submit(i);
  }
  producer_active = false;
  const auto producer_last_callback = callbacks.load();
  callback.join(); read_thread.join();
  alive_session_stop_v3(); render(31);
  auto s = state();
  assert(accepted > 64 && refused && snapshots && receipt_snapshots && callbacks == 2048 && !s.playing && !s.fault);
  assert(overlaps > 1 && first_overlap_callback < last_overlap_callback && last_overlap_callback <= producer_last_callback);
  assert(first_overlap_frame < last_overlap_frame && producer_last_callback >= 1984);
  for (unsigned t = 0; t < 8; ++t) assert(!s.tracks[t].mixer.active_voices);
  std::printf("PASS: concurrent callback/control/read accepted=%u refused=%u coherent_snapshots=%u new_receipt_snapshots=%u same_callback_render_overlap_snapshots=%u first_overlap_callback=%u last_overlap_callback=%u first_overlap_frame=%llu last_overlap_frame=%llu producer_last_callback=%u callbacks=2048\n",
              accepted, refused, snapshots.load(), receipt_snapshots.load(), overlaps.load(), first_overlap_callback,
              last_overlap_callback, (unsigned long long)first_overlap_frame, (unsigned long long)last_overlap_frame, producer_last_callback);
}
template<class Before> void measure(const char *name, const Fixture &f, unsigned frames, unsigned count, Before before,
                                   const std::function<void()> &after = {}) {
  std::vector<uint64_t> times;
  times.reserve(count);
  std::array<ultra::clip_admission::Cost, 4> maxima{};
  const auto rejected_before = state().work_rejected;
  for (unsigned i = 0; i < count; ++i) {
    before(i);
    counters = {};
    const auto begin_time = std::chrono::steady_clock::now();
    render(frames);
    if (after) after();
    const auto elapsed = std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::steady_clock::now() - begin_time).count();
    times.push_back(elapsed);
    assert(!state().fault);
    std::printf("SAMPLE,%s,%u,%u,%u,%u,%lld\n", name, f.config.track_count, f.config.device_count, frames, i, (long long)elapsed);
    for (unsigned family = 0; family < 4; ++family)
      for (unsigned m = 0; m < 5; ++m) maxima[family][m] = std::max(maxima[family][m], counters[family][m]);
  }
  std::sort(times.begin(), times.end());
  std::printf("RESULT,%s,tracks=%u,devices=%u,frames=%u,count=%u,p50_ns=%llu,p99_ns=%llu,p999_ns=%llu,max_ns=%llu,work_refused=%llu\n",
              name, f.config.track_count, f.config.device_count, frames, count,
              (unsigned long long)times[count/2], (unsigned long long)times[(count-1)*99/100],
              (unsigned long long)times[(count-1)*999/1000], (unsigned long long)times.back(),
              (unsigned long long)(state().work_rejected-rejected_before));
  for (unsigned family = 0; family < 4; ++family)
    std::printf("COUNTERS,%s,tracks=%u,frames=%u,family=%u,events=%llu,clears=%llu,scans=%llu,writes=%llu,guards=%llu\n",
                name, f.config.track_count, frames, family, (unsigned long long)maxima[family][0],
                (unsigned long long)maxima[family][1], (unsigned long long)maxima[family][2],
                (unsigned long long)maxima[family][3], (unsigned long long)maxima[family][4]);
}
void timing(unsigned tracks, unsigned devices, unsigned count) {
  for (bool extended : {false, true}) {
    for (auto music : {Music::Sustain, Music::EmptyShort, Music::PopulatedShort, Music::Dense}) {
      Fixture f(tracks, devices, music, extended);
      if (density_refusal(f)) continue;
      const auto start = std::chrono::steady_clock::now();
      begin(f);
      std::printf("PREPARE,tracks=%u,devices=%u,extended=%u,music=%u,elapsed_ns=%lld\n", tracks, devices, extended,
                  unsigned(music), (long long)std::chrono::duration_cast<std::chrono::nanoseconds>(std::chrono::steady_clock::now()-start).count());
      const char *name = music == Music::Sustain ? (extended ? "extended_sustain" : "saved_sustain") :
                         music == Music::EmptyShort ? (extended ? "extended_short_empty" : "saved_short_empty") :
                         music == Music::PopulatedShort ? (extended ? "extended_short_populated" : "saved_short_populated") :
                         extended ? "extended_dense_controls" : "saved_dense_controls";
      for (unsigned frames : {64u, 128u, 256u, 512u, 1024u}) {
        measure(name, f, frames, count, [&](unsigned i) {
          if (music != Music::Dense) return;
          for (unsigned c = 0; c < 61; ++c) {
            const unsigned d = c % devices, p = c % f.config.devices[d].parameter_count;
            assert(alive_session_base_v2(d, f.config.devices[d].revision, p, f.config.devices[d].parameters[p].base));
          }
          assert(alive_session_bypass_v2(1, f.config.devices[1].revision, i % 2));
          assert(alive_session_mixer(i % tracks, .125, 0, 0));
          request(f, 2, 32767);
        });
      }
      if (music == Music::Dense) {
        measure(extended ? "extended_full_queue_stop" : "saved_full_queue_stop", f, 64, count, [&](unsigned) {
          request(f, 1); render(1024);
          for (unsigned c = 0; c < 64; ++c) {
            const unsigned d = c % devices;
            assert(alive_session_base_v2(d, f.config.devices[d].revision, 0, f.config.devices[d].parameters[0].base));
          }
          alive_session_stop_v3();
        });
      }
    }
  }
  Fixture f(tracks, devices, Music::Sustain, true, true);
  begin(f);
  for (unsigned frames : {64u, 256u, 512u, 1024u}) measure("heavy_voice_edges", f, frames, count, [](unsigned) {});
  Fixture control(tracks, devices, Music::Sustain, true);
  begin(control);
  for (unsigned frames : {64u, 256u, 512u, 1024u})
    measure("aligned_switch_burst", control, frames, count, [&](unsigned i) {
      for (unsigned c = 0; c < 64; ++c) request(control, 3, 0, c % tracks, (i / 2) % 4);
    });
  auto workspace = std::make_unique<ultra::CanvasWorkspace>();
  auto discard = [](alive::Event) { return true; };
  for (unsigned d = 0; d < devices; ++d) {
    ultra::CanvasPlan plan{};
    assert(ultra::compile_canvas(control.graphs[d], plan));
    assert(workspace->install(d, plan, 0, discard));
  }
  const auto policy = ultra::clip_admission::policy(control.config.profile);
  const unsigned roots = policy.scheduled_window.root_clears + policy.optional_window.root_clears + policy.emergency.root_clears;
  const unsigned writes = policy.scheduled_window.parameter_writes + policy.optional_window.parameter_writes + policy.emergency.parameter_writes;
  volatile uint64_t scan_result = 0;
  for (unsigned frames : {64u, 128u, 256u, 512u, 1024u}) {
    measure("combined_policy_upper_bound", control, frames, count, [&](unsigned) {
      render(1024);
      for (unsigned c = 0; c < 63; ++c) {
        const unsigned d = c % devices, p = c % 16;
        assert(alive_session_base_v2(d, control.config.devices[d].revision, p, control.config.devices[d].parameters[p].base));
      }
      request(control, 2, 0);
    }, [&] {
#ifdef CAPACITY_GUARDS
      callback_guard::begin();
#endif
      workspace->begin_callback();
      for (unsigned clear = 0; clear < roots; ++clear) {
        auto &runtime = workspace->runtime(clear % devices); runtime.reset(runtime.plan());
      }
      for (unsigned write = 0; write < writes; ++write) {
        const unsigned d = write % devices, p = write % 16;
        auto &runtime = workspace->runtime(d); const auto &b = control.config.devices[d].parameters[p];
        assert(runtime.param(runtime.plan(), b.node, b.param, b.base, 0, discard));
      }
      for (unsigned event = 0; event < 64; ++event) {
        const unsigned d = control.config.tracks[event % tracks].chain.instrument;
        ultra::CanvasMessage message{}; message.count = 2; message.values[0] = event % 128; message.values[1] = 100;
        assert(workspace->event(d, control.config.devices[d].revision, control.config.devices[d].note_node, 0, message, 0, discard));
      }
      for (unsigned scan = 0; scan < policy.scheduled_window.event_scans + policy.optional_window.event_scans; ++scan)
        scan_result += control.config.events[scan % 1024].frame;
      for (unsigned d = 0; d < devices; ++d) workspace->stop(d, 0, discard);
#ifdef CAPACITY_GUARDS
      callback_guard::end();
#endif
    });
  }
  (void)scan_result;
}
} // namespace
int main(int argc, char **argv) {
  std::setvbuf(stdout, nullptr, _IOLBF, 0);
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
  ultra::alive_session_test_charge = charge;
#else
  (void)charge;
#endif
  limits();
  rejected_density_and_roots();
  if (argc > 1 && std::strcmp(argv[1], "--verify") == 0) {
    for (unsigned tracks : {2u, 4u, 8u}) for (auto music : {Music::Sustain, Music::EmptyShort, Music::PopulatedShort, Music::Dense}) {
      Fixture f(tracks, tracks == 2 ? 6 : tracks * 2, music, true);
      if (!density_refusal(f)) begin(f);
    }
    deterministic_local();
    concurrent_publication();
  } else {
    const unsigned count = argc > 1 ? unsigned(std::stoul(argv[1])) : 1200;
    for (unsigned tracks : {2u, 4u, 8u}) timing(tracks, tracks == 2 ? 6 : tracks * 2, count);
  }
  ultra_audio_stop(); assert(alive_session_reset());
  std::puts("PASS: capacity probe complete");
}
