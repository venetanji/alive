#include "alive_session_capacity_fixture.hpp"
#ifdef WORKSPACES_GUARDS
#include "canvas_callback_guard.hpp"
#endif
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <string>
#include <vector>
#include <sys/resource.h>

namespace {
constexpr unsigned None = ALIVE_SESSION_V4_NONE;
using Clock = std::chrono::steady_clock;
using Charge = std::array<uint64_t, 6>;
std::array<float, 1024> left{}, right{};
std::array<Charge, 4> charged{};
uint64_t serial = 1000000, dispatched = 0;
std::array<uint64_t, 2> probes{};
const Charge *synthetic_charge = nullptr;
volatile uint64_t sink = 0;
FILE *raw = nullptr, *work = nullptr;

#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
void charge(unsigned family, const ultra::clip_admission::Cost &c) noexcept {
  for (unsigned m = 0; m < 5; ++m) charged[family][m] += c[m];
}
void placement(unsigned family, uint64_t n) noexcept { charged[family][5] += n; }
void dispatch(uint64_t, unsigned, unsigned, const AliveSessionEventV2 &) noexcept { ++dispatched; }
void probe(unsigned family) noexcept { ++probes[family]; }
#endif
void render(unsigned frames) {
#ifdef WORKSPACES_GUARDS
  callback_guard::begin();
#endif
  assert(ultra_external_render(frames, left.data(), right.data()));
#ifdef WORKSPACES_GUARDS
  callback_guard::end();
#endif
}
AliveSessionStateV4 state() {
  AliveSessionStateV4 s{}; s.version = 4; s.struct_bytes = sizeof s;
  assert(alive_session_state_v4(&s)); return s;
}
struct Fixture {
  capacity_fixture::Fixture saved;
  AliveSessionConfigV4 c{};
  std::string name;
  bool extended;
  bool heavy;
  ultra::workspace_admission::Proof proof{};
  Fixture(unsigned profile, unsigned roots, bool extended, const char *shape, unsigned tracks = 0, bool heavy = false)
      : saved(tracks ? tracks : (profile == 1 ? 2 : 8), roots, capacity_fixture::Music::Sustain, extended, heavy), name(shape), extended(extended), heavy(heavy) {
    c.version = 4; c.struct_bytes = sizeof c;
    c.profile = c.work_policy = profile;
    c.track_count = saved.config.track_count; c.device_count = roots;
    c.preparation_revision = saved.config.preparation_revision;
    c.tempo_bpm = 240; c.length_frames = c.loop_end = 3000000;
    std::copy_n(saved.config.devices, roots, c.devices);
    const bool storage = name == "storage" || name == "pool_max";
    const bool idle = name == "idle" || name == "pool_max";
    const bool session = name == "session" || name == "dense_session" || idle;
    const bool dense = name == "dense_session" || (profile == 2 && c.track_count == 2);
    const bool suffix = name == "suffix_min";
    const bool song = name == "song";
    c.source_count = c.track_count * (storage ? 4 : 1);
    for (unsigned t = 0; t < c.track_count; ++t) {
      auto &tr = c.tracks[t]; const auto &old = saved.config.tracks[t].chain;
      tr.kind = 1; tr.instrument = old.instrument; tr.effect_count = old.effect_count;
      std::copy_n(old.effects, 2, tr.effects); tr.gain = .125;
      std::fill_n(tr.slots, 4, None);
      const unsigned count = storage ? 4 : 1;
      for (unsigned local = 0; local < count; ++local) {
        const unsigned s = t * count + local;
        auto &src = c.sources[s]; src.track = t; src.kind = 1; src.audio_buffer = None;
        src.length_frames = suffix ? 588 : 3001000;
        src.event_begin = c.event_count;
        if ((t == 0 || dense) && local == 0) {
          src.event_count = 1;
          c.events[c.event_count++] = {0, t, ALIVE_SESSION_NOTE_ON, tr.instrument, 48 + t, 100};
        }
        if (!idle && (t == 0 || dense || storage)) {
          tr.slots[local] = c.slot_count;
          c.slots[c.slot_count++] = {t, s, suffix || session ? 1u : 0u, 0, suffix ? 400u : 0u};
        }
      }
      tr.placement_begin = c.placement_count;
      if (!session && (t == 0 || storage)) {
        const unsigned countp = storage ? 8 : 1;
        tr.placement_count = countp;
        for (unsigned p = 0; p < countp; ++p)
          c.placements[c.placement_count++] = {t, t * count, suffix ? 1u : 0u, 0,
              storage ? uint64_t(p * 20000) : 0, storage ? 10000u : c.length_frames,
              suffix ? 400u : 100u};
      }
    }
    if (song) {
      c.length_frames = 8192; c.loop_enabled = 1; c.loop_start = 2400; c.loop_end = 4000;
      c.placement_count = 0; std::fill_n(c.placements, 64, AliveSessionPlacementV4{});
      for (unsigned s = 0; s < c.source_count; ++s) c.sources[s].length_frames = s ? 2301 : 2800;
      for (unsigned s = 0; s < c.slot_count; ++s) { c.slots[s].loop_enabled = 1; c.slots[s].source_offset = 400; }
      for (unsigned t = 0; t < c.track_count; ++t) {
        auto &tr = c.tracks[t]; tr.placement_begin = c.placement_count; tr.placement_count = 0;
        if (t == 0) {
          tr.placement_count = 3;
          c.placements[c.placement_count++] = {t, t, 1, 0, 0, 1000, 400};
          c.placements[c.placement_count++] = {t, t, 1, 0, 1600, 2400, 400};
          c.placements[c.placement_count++] = {t, t, 1, 0, 4000, 2000, 400};
        } else if (dense) {
          tr.placement_count = 1;
          c.placements[c.placement_count++] = {t, t, 1, 0, 0, 8192, 400};
        }
      }
    }
    if (storage) {
      if (!idle) { c.loop_enabled = 1; c.loop_start = 0; c.loop_end = 160000; }
      c.event_count = 0; std::fill_n(c.events, 1024, AliveSessionEventV2{});
      for (unsigned s = 0; s < c.source_count; ++s) {
        auto &src = c.sources[s]; const unsigned t = src.track, d = c.tracks[t].instrument;
        src.event_begin = c.event_count; src.event_count = 1024 / c.source_count;
        src.lane_count = 1; src.owned_masks[d] = 1; c.devices[d].parameters[0].automated = 1;
        for (unsigned i = 0; i < src.event_count; ++i) {
          const unsigned kind = t < 2 && i % 4 == 0 ? ALIVE_SESSION_NOTE_ON :
                                t < 2 && i % 4 == 1 ? ALIVE_SESSION_NOTE_OFF : ALIVE_SESSION_AUTOMATION;
          c.events[c.event_count++] = {uint64_t(i * 10000), t, kind, d,
              kind == ALIVE_SESSION_AUTOMATION ? 0u : 48u,
              kind == ALIVE_SESSION_NOTE_ON ? 100 : kind == ALIVE_SESSION_NOTE_OFF ? 0 : c.devices[d].parameters[0].base};
        }
      }
    }
  }
  bool install(bool expected = true) {
    ultra_audio_stop(); assert(alive_session_reset());
    c.preparation_revision = ++capacity_fixture::preparation;
    for (unsigned d = 0; d < 16; ++d) assert(ultra_canvas_close_document(d));
    for (unsigned d = 0; d < c.device_count; ++d) {
      saved.graphs[d].revision = c.devices[d].revision = ++capacity_fixture::revision;
      assert(ultra_canvas_install_document(d, &saved.graphs[d]));
    }
    const auto begin = Clock::now();
    const bool ok = alive_session_validate_prepared_v4(&c, saved.graphs.data(), c.device_count, nullptr, 0);
    const double ms = std::chrono::duration<double, std::milli>(Clock::now() - begin).count();
    AliveSessionDiagnosticV4 d{}; d.version = 4; d.struct_bytes = sizeof d;
    assert(alive_session_diagnostic_v4(&d));
    std::printf("FIXTURE name=%s profile=%u tracks=%u roots=%u sources=%u slots=%u placements=%u events=%u admitted=%u prep_ms=%.6f resource=%u observed=%llu limit=%llu\n",
      name.c_str(), c.profile, c.track_count, c.device_count, c.source_count, c.slot_count,
      c.placement_count, c.event_count, ok, ms, d.resource,
      (unsigned long long)d.observed, (unsigned long long)d.limit);
    const std::string file = name + "-p" + std::to_string(c.profile) + "-t" + std::to_string(c.track_count) + "-r" + std::to_string(c.device_count) + (heavy ? "-heavy" : extended ? "-extended" : "-saved") + "-prep" + std::to_string(c.preparation_revision);
    FILE *out = std::fopen((file + ".bin").c_str(), "wb"); assert(out);
    assert(std::fwrite(&c, sizeof c, 1, out) == 1); assert(std::fclose(out) == 0);
    out = std::fopen((file + "-graphs.bin").c_str(), "wb"); assert(out);
    assert(std::fwrite(saved.graphs.data(), sizeof(UltraCanvasGraph), c.device_count, out) == c.device_count);
    assert(std::fclose(out) == 0);
    if (!ok) { if (expected) std::fprintf(stderr, "%s\n", alive_session_error()); return false; }
    assert(ultra::workspace_admission::build_validated(c, proof));
    out = std::fopen((file + "-envelope.csv").c_str(), "w"); assert(out);
    std::fprintf(out, "width,events,roots,scans,writes,guards,placement\n");
    for (unsigned w = 1; w <= 1024; ++w) {
      std::fprintf(out, "%u", w);
      for (unsigned m = 0; m < 6; ++m)
        std::fprintf(out, ",%llu", (unsigned long long)(m == 5 ? proof.placement[w] : proof.prepared.future[m][w]));
      std::fputc('\n', out);
    }
    assert(std::fclose(out) == 0);
    const auto configure_begin = Clock::now();
    assert(alive_session_configure_v4(&c, nullptr, 0));
    rusage usage{}; assert(getrusage(RUSAGE_SELF, &usage) == 0);
    std::printf("PREPARATION fixture=%s configure_ms=%.6f peak_rss_kib=%ld\n", file.c_str(),
      std::chrono::duration<double, std::milli>(Clock::now() - configure_begin).count(), usage.ru_maxrss);
    assert(ultra_external_start()); return true;
  }
};
AliveSessionReceiptV4 request(const Fixture &f, unsigned kind, unsigned action = 0, uint64_t position = 0) {
  AliveSessionRequestV4 r{}; r.version = 4; r.struct_bytes = sizeof r;
  r.preparation_revision = f.c.preparation_revision; r.request_serial = ++serial; r.kind = kind; r.position = position;
  if (kind == ALIVE_SESSION_V4_TRACK_ACTIONS) {
    r.track_mask = (1u << f.c.track_count) - 1;
    for (unsigned t = 0; t < f.c.track_count; ++t) {
      const unsigned selected = action == 1 && f.c.tracks[t].slots[0] == None ? 2 : action;
      r.tracks[t] = {selected, selected == 1 ? 0u : None};
    }
  }
  AliveSessionReceiptV4 receipt{}; receipt.version = 4; receipt.struct_bytes = sizeof receipt;
  assert(alive_session_request_v4(&r, &receipt)); return receipt;
}
void start(const Fixture &f) {
  if (f.name == "session" || f.name == "dense_session") { request(f, 3, 1); render(1); }
  request(f, 1); render(1024); assert(state().playing && !state().fault);
}
template<class Before, class Extra>
void measure(const char *name, Fixture &f, unsigned frames, unsigned count, Before before, Extra extra) {
  std::vector<double> times; times.reserve(count);
  unsigned sounding = 0; uint64_t voices = 0;
  unsigned refused_seeks = 0;
  for (unsigned i = 0; i < count; ++i) {
    before(i); charged = {}; dispatched = 0; probes = {};
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
    const auto read_begin = ultra::alive_session_test_reconstruction_reads;
    const auto preview_begin = ultra::alive_session_test_preview_reads;
#endif
    const auto begin = Clock::now(); render(frames); extra();
    const double us = std::chrono::duration<double, std::micro>(Clock::now() - begin).count();
    times.push_back(us); const auto s = state(); assert(!s.fault);
    if (std::strcmp(name, "full_queue_reserved_stop") == 0) assert(!s.playing);
    assert(s.track_count == f.c.track_count && s.source_count == f.c.source_count);
    unsigned active = 0; uint64_t v = 0;
    for (unsigned t = 0; t < s.track_count; ++t) { active += s.tracks[t].mixer.active_voices != 0; v += s.tracks[t].mixer.active_voices; }
    sounding = std::max(sounding, active); voices = std::max(voices, v);
    const auto &receipt = s.receipts[serial % 128];
    refused_seeks += receipt.kind == ALIVE_SESSION_V4_SEEK && receipt.status == ALIVE_SESSION_V4_REJECTED;
    std::fprintf(raw, "%s,%u,%u,%u,%.9f,%u,%llu,%u,%llu,%u,%u,%llu\n", name, f.c.profile, frames, i, us, active, (unsigned long long)v,
      s.playing, (unsigned long long)s.position, receipt.status, receipt.error, (unsigned long long)s.preparation_revision);
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
    uint64_t events = 0;
    const auto reads = ultra::alive_session_test_reconstruction_reads - read_begin;
    const auto previews = ultra::alive_session_test_preview_reads - preview_begin;
    assert(reads <= charged[0][2] + charged[1][2] + charged[2][2] + charged[3][2]);
    assert(previews <= 128 && probes[0] <= charged[0][5] && probes[1] <= charged[1][5]);
    for (unsigned family = 0; family < 4; ++family) {
      events += charged[family][0];
      std::fprintf(work, "%s,%u,%u,%u,%u", name, f.c.profile, frames, i, family);
      for (auto value : charged[family]) std::fprintf(work, ",%llu", (unsigned long long)value);
      std::fprintf(work, ",%llu,%llu,%llu,%llu\n", (unsigned long long)dispatched,
        (unsigned long long)reads, (unsigned long long)previews, (unsigned long long)(family < 2 ? probes[family] : 0));
    }
    assert(events == dispatched);
    for (unsigned m = 0; m < 6; ++m)
      assert(charged[0][m] <= (m == 5 ? f.proof.placement[frames] : f.proof.prepared.future[m][frames]));
#endif
    if (synthetic_charge) {
      std::fprintf(work, "%s,%u,%u,%u,4", name, f.c.profile, frames, i);
      for (auto value : *synthetic_charge) std::fprintf(work, ",%llu", (unsigned long long)value);
      std::fprintf(work, ",64,0,0,576\n");
    }
  }
  std::sort(times.begin(), times.end()); double total = 0; unsigned over = 0;
  for (auto t : times) { total += t; over += t > frames * 1000000. / 48000; }
  std::printf("TIMING case=%s profile=%u frames=%u samples=%u sounding=%u voices=%llu mean_us=%.6f p99_us=%.6f p999_us=%.6f max_us=%.6f overruns=%u refused_seek_callbacks=%u\n",
    name, f.c.profile, frames, count, sounding, (unsigned long long)voices, total/count,
    times[(count-1)*99/100], times[(count-1)*999/1000], times.back(), over, refused_seeks);
}
void matrix(unsigned count) {
  for (unsigned profile : {1u, 2u}) {
    for (const char *shape : {"session", "dense_session", "arrangement", "suffix_min", "song", "storage"}) {
      Fixture refused(profile, profile == 1 ? 6 : 16, false, shape);
      assert(!refused.install(false));
    }
    for (bool extended : {false, true}) {
      for (const char *shape : {"idle", "session", "arrangement", "suffix_min", "song", "storage"}) {
        const bool idle = std::string(shape) == "idle";
        const bool storage = std::string(shape) == "storage";
        Fixture f(profile, idle ? (profile == 1 ? 6 : 16) : (profile == 1 ? 3 : storage ? 8 : 10), extended, shape);
        if (profile == 2 && storage) { assert(!f.install(false)); continue; }
        assert(f.install()); start(f);
        const std::string label = std::string(extended ? "extended_" : "saved_") + shape;
        for (unsigned n : {1u,31u,64u,128u,256u,512u,1024u})
          measure(label.c_str(), f, n, count, [](unsigned){}, []{});
      }
    }
    Fixture controls(profile, profile == 1 ? 3 : 10, true, "arrangement");
    for (unsigned n : {1u,31u,64u,128u,256u,512u,1024u}) {
      assert(controls.install()); start(controls);
      measure("return_burst64", controls, n, count, [&](unsigned) {
        render(1024);
        for (unsigned j = 0; j < 64; ++j) request(controls, 3, 3);
      }, []{});
      measure("seek_retained_history", controls, n, count, [&](unsigned) {
        request(controls, 2, 0, 1000);
      }, []{});
      assert(controls.install()); start(controls);
      measure("full_queue_reserved_stop", controls, n, count, [&](unsigned) {
        render(1024); request(controls, 1); render(1);
        for (unsigned j = 0; j < 64; ++j) request(controls, 3, 3);
        alive_session_stop_v4();
      }, []{});
      request(controls, 1); render(1024);
    }
    Fixture pool(profile, profile == 1 ? 6 : 16, true, "pool_max");
    assert(pool.install()); start(pool);
    for (unsigned n : {1u,31u,64u,128u,256u,512u,1024u})
      measure("full_roots_source_event_pools", pool, n, count, [](unsigned){}, []{});
  }
  for (bool extended : {false, true}) for (const char *shape : {"session", "song", "storage"}) {
    Fixture f(2, 6, extended, shape, 2); assert(f.install()); start(f);
    const std::string label = std::string(extended ? "extended_" : "saved_") + "two_chains_" + shape;
    for (unsigned n : {1u,31u,64u,128u,256u,512u,1024u})
      measure(label.c_str(), f, n, count, [](unsigned){}, []{});
    if (extended && f.name == "song")
      for (unsigned n : {1u,31u,64u,128u,256u,512u,1024u})
        measure("two_chains_coincident_return64", f, n, count, [&](unsigned) {
          render(1024); request(f, 2, 0, f.c.loop_end - 1); render(1);
          assert(state().position == f.c.loop_end);
          for (unsigned j = 0; j < 64; ++j) request(f, 3, 3);
        }, []{});
  }
}

void synthetic(unsigned count) {
  for (unsigned profile : {1u, 2u}) for (bool heavy : {false, true}) {
    Fixture f(profile, profile == 1 ? 6 : 16, true, "idle", 0, heavy); assert(f.install());
    auto workspace = std::make_unique<ultra::CanvasWorkspace>();
    auto discard = [](alive::Event) { return true; };
    for (unsigned d = 0; d < f.c.device_count; ++d) {
      ultra::CanvasPlan plan{}; assert(ultra::compile_canvas(f.saved.graphs[d], plan));
      assert(workspace->install(d, plan, 0, discard));
    }
    const auto limits = ultra::clip_admission::policy(profile);
    const Charge ceiling{64, limits.scheduled_window.root_clears + limits.optional_window.root_clears + limits.emergency.root_clears,
      limits.scheduled_window.event_scans + limits.optional_window.event_scans,
      limits.scheduled_window.parameter_writes + limits.optional_window.parameter_writes + limits.emergency.parameter_writes + 64,
      limits.optional_window.guard_steps, 512 + 2114};
    auto supplement = ceiling; supplement[3] -= 64;
    synthetic_charge = &supplement;
    std::printf("SYNTHETIC profile=%u events=%llu roots=%llu scans=%llu writes=%llu guards=%llu placement=%llu pcm_reads=0 extra_dsp_roots=%u extra_voices=%u idle_callback_already_included=true native_queue_writes=64 synthetic_write_supplement=%llu\n",
      profile, (unsigned long long)ceiling[0], (unsigned long long)ceiling[1], (unsigned long long)ceiling[2],
      (unsigned long long)ceiling[3], (unsigned long long)ceiling[4], (unsigned long long)ceiling[5],
      f.c.device_count, f.c.track_count * 4, (unsigned long long)supplement[3]);
    volatile uint64_t ledger[1025]{}, future[1025]{};
    std::array<bool, 128> held{};
    for (unsigned n : {1u,31u,64u,128u,256u,512u,1024u})
      measure(heavy ? "synthetic_six_resource_heavy_dsp" : "synthetic_six_resource_plus_four_voice_dsp", f, n, count, [&](unsigned) {
        for (unsigned i = 0; i < 64; ++i) {
          const unsigned d = i % f.c.device_count;
          assert(alive_session_base_v2(d, f.c.devices[d].revision, 0, f.c.devices[d].parameters[0].base));
        }
      }, [&] {
#ifdef WORKSPACES_GUARDS
        callback_guard::begin();
        for (unsigned family = 0; family < 4; ++family) for (unsigned m = 0; m < 6; ++m)
          assert(charged[family][m] == (family == 3 && m == 3 ? 64u : 0u));
#endif
        workspace->begin_callback();
        for (uint64_t i = 0; i < ceiling[1]; ++i) {
          auto &runtime = workspace->runtime(i % f.c.device_count); runtime.reset(runtime.plan());
        }
        for (uint64_t i = 0; i < supplement[3]; ++i) {
          const unsigned d = i % f.c.device_count, p = (i / f.c.device_count) % f.c.devices[d].parameter_count;
          auto &runtime = workspace->runtime(d); const auto &b = f.c.devices[d].parameters[p];
          assert(runtime.param(runtime.plan(), b.node, b.param, b.base, 0, discard));
        }
        for (uint64_t i = 0; i < ceiling[2]; ++i) {
          const auto &e = f.c.events[i % 1024];
          if (e.kind == ALIVE_SESSION_NOTE_ON) held[e.target] = true;
          else if (e.kind == ALIVE_SESSION_NOTE_OFF) held[e.target] = false;
          sink += e.frame + held[e.target];
        }
        for (uint64_t i = 0; i < ceiling[4]; ++i)
          sink += ledger[i % 1025] + future[(1024 - i % 1025)] <= ceiling[i % 5];
        // 576 descriptor probes (512 scheduled + 64 optional), then the 2050
        // additional placement-horizon comparisons. These are scalar surrogates.
        for (unsigned i = 0; i < 576; ++i) sink += f.c.placements[i % 64].start_frame <= i;
        for (unsigned i = 0; i < 2050; ++i) sink += ledger[i % 1025] + future[1024-i%1025] <= 512;
        for (unsigned i = 0; i < 64; ++i) {
          const unsigned t = i % f.c.track_count, d = f.c.tracks[t].instrument;
          ultra::CanvasMessage message{}; message.count = 2;
          message.values[0] = 48 + (i / f.c.track_count) % 4; message.values[1] = 100;
          assert(workspace->event(d, f.c.devices[d].revision, f.c.devices[d].note_node, 0, message, 0, discard));
        }
        for (unsigned t = 0; t < f.c.track_count; ++t)
          assert(workspace->runtime(f.c.tracks[t].instrument).active_voice_count() == 4);
        for (unsigned frame = 0; frame < n; ++frame) {
          assert(workspace->sample(frame, discard));
          for (unsigned t = 0; t < f.c.track_count; ++t) {
            const auto &tr = f.c.tracks[t];
            auto signal = workspace->runtime(tr.instrument).signal_sample(0, 0, frame + 1, discard, true, {});
            for (unsigned m = 0; m < tr.effect_count; ++m)
              signal = workspace->runtime(tr.effects[m]).signal_sample(0, 0, frame + 1, discard, true, signal);
            assert(std::isfinite(signal[0]) && std::isfinite(signal[1]));
            sink += signal[0] != 0;
          }
        }
#ifdef WORKSPACES_GUARDS
        callback_guard::end();
#endif
      });
    synthetic_charge = nullptr;
  }
}
}
int main(int argc, char **argv) {
  std::setvbuf(stdout, nullptr, _IOLBF, 0);
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
  ultra::alive_session_test_charge = charge;
  ultra::alive_session_test_placement_charge = placement;
  ultra::alive_session_test_dispatch = dispatch;
  ultra::alive_session_test_placement_probe = probe;
#endif
  raw = std::fopen("samples.csv", "w"); work = std::fopen("work.csv", "w"); assert(raw && work);
  std::fprintf(raw, "case,profile,frames,iteration,us,sounding_tracks,voices,playing,position,receipt_status,receipt_error,preparation_revision\n");
  std::fprintf(work, "case,profile,frames,iteration,family,events,roots,scans,writes,guards,placement,dispatch,reconstruction_reads,preview_reads,probes\n");
  if (argc > 1 && std::string(argv[1]) == "--explore") {
    for (unsigned p : {1u,2u}) for (const char *shape : {"idle","session","dense_session","arrangement","suffix_min","song","storage"}) {
      for (unsigned roots : {p == 1 ? 6u : 16u, p == 1 ? 3u : 10u, p == 1 ? 2u : 8u}) {
        Fixture f(p, roots, false, shape); f.install(false);
      }
    }
  } else {
    const unsigned count = argc > 1 ? unsigned(std::stoul(argv[1])) : 1200;
    assert(count); matrix(count); synthetic(count);
  }
  ultra_audio_stop(); assert(alive_session_reset());
  assert(std::fclose(raw) == 0 && std::fclose(work) == 0);
  rusage usage{}; assert(getrusage(RUSAGE_SELF, &usage) == 0);
  std::printf("PASS: v4 measurement peak_rss_kib=%ld\n", usage.ru_maxrss);
}
