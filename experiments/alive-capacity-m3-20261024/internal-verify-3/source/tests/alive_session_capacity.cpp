#include "alive_session_capacity_fixture.hpp"
#ifdef CAPACITY_GUARDS
#include "canvas_callback_guard.hpp"
#endif
#include <atomic>
#include <chrono>
#include <cstdio>
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
  if (action) request(f, 3, 0, action_track, action == 2 ? UINT32_MAX : 1, action);
  for (unsigned frame = 0; frame < 50000;) {
    const auto n = std::min(parts[block++ % parts.size()], 50000 - frame);
    render(n);
    samples.insert(samples.end(), left.begin(), left.begin() + n);
    frame += n;
  }
  assert(!state().fault);
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
  std::atomic<bool> go{false}, done{false};
  std::atomic<unsigned> snapshots{0};
  auto reader = [&] {
    while (!go.load()) std::this_thread::yield();
    uint64_t previous = 0;
    do {
      AliveSessionStateV3 s{}; s.version = 3; s.struct_bytes = sizeof s;
      if (!alive_session_state_v3(&s)) continue;
      assert(!s.fault && s.absolute_frame >= previous && s.track_count == 8 && s.device_count == 16);
      previous = s.absolute_frame;
      for (const auto &r : s.receipts) {
        if (r.status < ALIVE_SESSION_V3_PENDING) continue;
        assert((r.pending_mask | r.applied_mask | r.superseded_mask | r.canceled_mask | r.rejected_mask) == r.track_mask);
        assert(r.pending_mask + r.applied_mask + r.superseded_mask + r.canceled_mask + r.rejected_mask == r.track_mask);
      }
      ++snapshots;
    } while (!done.load());
  };
  std::thread read_thread(reader);
  std::thread callback([&] {
    while (!go.load()) std::this_thread::yield();
    for (unsigned i = 0; i < 2048; ++i) {
      // Allocation wrappers are a separate single-thread diagnostic, not timings.
      assert(ultra_external_render(31, left.data(), right.data()));
      if (!(i % 16)) std::this_thread::yield();
    }
    done = true;
  });
  go = true;
  unsigned accepted = 0, refused = 0;
  for (unsigned i = 0; i < 4096 && !done.load(); ++i) {
    AliveSessionRequestV3 r{}; r.version = 3; r.struct_bytes = sizeof r;
    r.preparation_revision = f.config.preparation_revision; r.request_serial = ++serial;
    r.kind = 3; r.track_mask = 1u << (i % 8); r.tracks[i % 8] = {1, (i / 8) % 4};
    AliveSessionReceiptV3 receipt{}; receipt.version = 3; receipt.struct_bytes = sizeof receipt;
    if (alive_session_request_v3(&r, &receipt)) ++accepted;
    else { ++refused; assert(receipt.error == ALIVE_SESSION_V3_QUEUE_FULL || receipt.error == ALIVE_SESSION_V3_RECEIPT_BUSY); }
    if (!(i % 64)) alive_session_stop_v3();
    if (!(i % 8)) std::this_thread::yield();
  }
  callback.join(); read_thread.join();
  alive_session_stop_v3(); render(31);
  auto s = state();
  assert(accepted && refused && snapshots && !s.playing && !s.fault);
  for (unsigned t = 0; t < 8; ++t) assert(!s.tracks[t].mixer.active_voices);
  std::printf("PASS: concurrent callback/control/read accepted=%u refused=%u coherent_snapshots=%u callbacks=2048\n", accepted, refused, snapshots.load());
}
template<class Before> void measure(const char *name, const Fixture &f, unsigned frames, unsigned count, Before before) {
  std::vector<uint64_t> times;
  times.reserve(count);
  std::array<ultra::clip_admission::Cost, 4> maxima{};
  const auto rejected_before = state().work_rejected;
  for (unsigned i = 0; i < count; ++i) {
    before(i);
    counters = {};
    const auto begin_time = std::chrono::steady_clock::now();
    render(frames);
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
      Fixture f(tracks, tracks == 2 ? 6 : tracks * 2, music, true); begin(f);
    }
    deterministic_local();
    concurrent_publication();
  } else {
    for (unsigned tracks : {2u, 4u, 8u}) timing(tracks, tracks == 2 ? 6 : tracks * 2, 1200);
  }
  ultra_audio_stop(); assert(alive_session_reset());
  std::puts("PASS: capacity probe complete");
}
