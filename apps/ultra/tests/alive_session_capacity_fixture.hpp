#pragma once
#include "../src-tauri/native/alive_session.hpp"
#include "../src-tauri/native/backend.h"
#include "saved_graphs.hpp"
#include <cassert>
#include <cstring>

namespace capacity_fixture {
enum class Music { Sustain, EmptyShort, PopulatedShort, Dense };
inline uint64_t revision = 700000, preparation = 700000, serial = 700000;
struct Fixture {
  AliveSessionConfigV3 config{};
  std::array<UltraCanvasGraph, 16> graphs{};
  Fixture(unsigned tracks, unsigned devices, Music music, bool extended = false, bool heavy = false) {
    auto &c = config;
    c.version = 3;
    c.struct_bytes = sizeof c;
    c.profile = tracks == 2 ? 1 : 2;
    c.work_policy = tracks == 2 ? 1 : 2;
    c.preparation_revision = ++preparation;
    c.track_count = tracks;
    c.device_count = devices;
    c.clip_count = tracks * 4;
    c.length_frames = music == Music::EmptyShort || music == Music::PopulatedShort ? 188 : 48000;
    c.tempo_bpm = 240;
    c.loop_enabled = 1;
    unsigned d = 0, effects = devices - tracks;
    for (unsigned t = 0; t < tracks; ++t) {
      auto &tr = c.tracks[t];
      tr.chain.instrument = d;
      tr.chain.effect_count = std::min(2u, effects);
      effects -= tr.chain.effect_count;
      tr.chain.gain = .125;
      tr.initial_clip = t * 4;
      for (unsigned slot = 0; slot < 4; ++slot) {
        tr.slots[slot] = t * 4 + slot;
        c.clips[t * 4 + slot].track = t;
        c.clips[t * 4 + slot].length_frames = c.length_frames;
      }
      for (unsigned member = 0; member <= tr.chain.effect_count; ++member, ++d) {
        auto &g = graphs[d];
        auto &device = c.devices[d];
        if (!member) saved_0(g, device);
        else if (member == 1) saved_1(g, device);
        else saved_2(g, device);
        if (member) tr.chain.effects[member - 1] = d;
        if (extended) {
          while (!heavy && device.parameter_count < 16) {
            auto &node = g.nodes[g.node_count++];
            node.id = 100 + g.node_count;
            node.kind = ultra::LineSignal;
            node.p0 = 1;
            device.parameters[device.parameter_count++] = {node.id, 0, 0, 0, 1, 0, 2};
          }
          while (g.node_count < 32) {
            auto &node = g.nodes[g.node_count++];
            node.id = 100 + g.node_count;
            node.kind = !member ? ultra::MultiplyVoice : ultra::SignalMultiply;
          }
          for (unsigned from = 0; from < g.node_count && g.edge_count < 64; ++from)
            for (unsigned to = from + 1; to < g.node_count && g.edge_count < 64; ++to) {
              const auto &a = g.nodes[from], &b = g.nodes[to];
              if (b.id < 100 || (b.kind != ultra::MultiplyVoice && b.kind != ultra::SignalMultiply)) continue;
              if (!member ? !(a.kind == ultra::PolyNote || a.kind == ultra::MultiplyVoice ||
                              a.kind == ultra::SawVoice || a.kind == ultra::FilterVoice || a.kind == ultra::AdsrVoice)
                          : !(a.kind == ultra::LineSignal || a.kind == ultra::SignalMultiply)) continue;
              g.edges[g.edge_count++] = {a.id, 0, b.id, 0};
            }
          assert(g.node_count == 32 && g.edge_count == 64);
        }
        g.revision = ++revision;
        device.document = d;
        device.revision = g.revision;
      }
      auto &cl = c.clips[t * 4];
      cl.event_begin = c.event_count;
      const unsigned instrument = tr.chain.instrument;
      if (music == Music::Dense) {
        cl.lane_count = 1;
        cl.owned_masks[instrument] = 1;
        c.devices[instrument].parameters[0].automated = 1;
        const unsigned count = 1024 / tracks;
        for (unsigned i = 0; i < count; ++i) {
          const unsigned kind = i < count / 4 ? 2 : i < count / 2 ? 0 : 1;
          const double value = kind == 2 ? 100 : kind == 0 ? 0 : c.devices[instrument].parameters[0].base;
          c.events[c.event_count++] = {uint64_t(i * tracks * 32), t, kind, instrument,
                                      kind == 1 ? 0 : i % (count / 4), value};
        }
      } else if (music != Music::EmptyShort) {
        const unsigned voices = music == Music::Sustain ? 4 : std::min(2u, 8 / tracks);
        for (unsigned voice = 0; voice < voices; ++voice)
          c.events[c.event_count++] = {0, t, 2, instrument, 60 + voice, 100};
      }
      cl.event_count = c.event_count - cl.event_begin;
      for (unsigned slot = 1; slot < 4; ++slot) c.clips[t * 4 + slot].event_begin = c.event_count;
    }
    assert(d == devices);
  }
  void install() const {
    ultra_audio_stop();
    assert(alive_session_reset());
    for (unsigned d = 0; d < 16; ++d) assert(ultra_canvas_close_document(d));
    for (unsigned d = 0; d < config.device_count; ++d) assert(ultra_canvas_install_document(d, &graphs[d]));
    if (!alive_session_validate_prepared_v3(&config, graphs.data(), config.device_count)) {
      std::fprintf(stderr, "capacity admission: %s\n", alive_session_error());
      AliveSessionDiagnosticV3 diagnostic{};
      diagnostic.version = 3; diagnostic.struct_bytes = sizeof diagnostic;
      assert(alive_session_diagnostic_v3(&diagnostic));
      std::fprintf(stderr, "tracks=%u roots=%u length=%llu events=%u error=%u observed=%llu limit=%llu width=%u\n",
                   config.track_count, config.device_count, (unsigned long long)config.length_frames,
                   config.event_count, diagnostic.error, (unsigned long long)diagnostic.observed,
                   (unsigned long long)diagnostic.limit, diagnostic.window_frames);
      std::abort();
    }
    assert(alive_session_configure_v3(&config));
    assert(ultra_external_start());
  }
};
inline AliveSessionStateV3 state() {
  AliveSessionStateV3 value{};
  value.version = 3;
  value.struct_bytes = sizeof value;
  assert(alive_session_state_v3(&value));
  return value;
}
inline AliveSessionReceiptV3 request(const Fixture &fixture, unsigned kind, uint64_t position = 0,
                                      unsigned track = 0, unsigned slot = 0, unsigned action = 1) {
  AliveSessionRequestV3 r{};
  r.version = 3;
  r.struct_bytes = sizeof r;
  r.preparation_revision = fixture.config.preparation_revision;
  r.request_serial = ++serial;
  r.kind = kind;
  r.position = position;
  if (kind == 3) { r.track_mask = 1u << track; r.tracks[track] = {action, slot}; }
  AliveSessionReceiptV3 receipt{};
  receipt.version = 3;
  receipt.struct_bytes = sizeof receipt;
  assert(alive_session_request_v3(&r, &receipt));
  return receipt;
}
inline AliveSessionReceiptV3 scene(const Fixture &f, unsigned slot = 0, unsigned stops = 0,
                                   unsigned mask = 0) {
  AliveSessionRequestV3 r{};
  r.version = 3; r.struct_bytes = sizeof r; r.kind = ALIVE_SESSION_V3_TRACK_ACTIONS;
  r.preparation_revision = f.config.preparation_revision; r.request_serial = ++serial;
  r.track_mask = mask ? mask : (1u << f.config.track_count) - 1;
  for (unsigned t = 0; t < f.config.track_count; ++t)
    if (r.track_mask & (1u << t))
      r.tracks[t] = {stops & (1u << t) ? ALIVE_SESSION_V3_TRACK_STOP : ALIVE_SESSION_V3_LAUNCH,
                     stops & (1u << t) ? UINT32_MAX : slot};
  AliveSessionReceiptV3 out{}; out.version = 3; out.struct_bytes = sizeof out;
  assert(alive_session_request_v3(&r, &out));
  return out;
}
} // namespace capacity_fixture
