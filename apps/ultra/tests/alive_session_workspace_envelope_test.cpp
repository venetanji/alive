#include "../src-tauri/native/alive_session.hpp"
#include <cassert>
#include <cstdio>
#include <vector>

namespace wa = ultra::workspace_admission;
using wa::Charge;
using wa::Curves;
using wa::Envelope;
uint64_t assertions = 0, source_cases = 0, boundary_cases = 0, authority_cases = 0, splice_cases = 0;
uint64_t native_cases = 0, native_accepted = 0, native_refused = 0;

void covered(const Charge &actual, const Curves &bound, unsigned width) {
  for (unsigned m = 0; m < 6; ++m) {
    if (actual[m] > bound[m][width]) {
      std::fprintf(stderr, "underbound dimension=%u width=%u actual=%llu bound=%llu\n", m, width,
                   (unsigned long long)actual[m], (unsigned long long)bound[m][width]);
      std::abort();
    }
    ++assertions;
  }
}
void accumulate(Charge &a, const Charge &b) {
  for (unsigned m = 0; m < 6; ++m)
    a[m] += b[m];
}

// Scalar reference: no production pulse, resolver, transition, cyclic or DP helper.
// Every read, clear, write, dispatch and resolution comparison is charged here.
Charge enter(const AliveSessionConfigV4 &c, unsigned source, uint64_t phase,
             unsigned roots, unsigned parameters, unsigned probes) {
  Charge cost{0, roots, 0, 2 * parameters, 0, probes};
  if (source == ALIVE_SESSION_V4_NONE)
    return cost;
  const auto &s = c.sources[source];
  std::array<bool, 128> held{};
  for (unsigned i = 0; i < s.event_count; ++i) {
    ++cost[2];
    const auto &e = c.events[s.event_begin + i];
    if (e.frame > phase)
      break;
    if (e.frame == phase) {
      if (e.kind == ALIVE_SESSION_NOTE_ON || e.kind == ALIVE_SESSION_NOTE_OFF)
        held[e.target] = false;
      continue;
    }
    if (e.kind == ALIVE_SESSION_NOTE_ON)
      held[e.target] = true;
    if (e.kind == ALIVE_SESSION_NOTE_OFF)
      held[e.target] = false;
  }
  if (phase < s.length_frames)
    for (bool h : held)
      cost[0] += h;
  return cost;
}
Charge ordinary(const AliveSessionConfigV4 &c, unsigned source, uint64_t phase) {
  Charge cost{};
  if (source != ALIVE_SESSION_V4_NONE) {
    const auto &s = c.sources[source];
    for (unsigned i = 0; i < s.event_count; ++i) {
      const auto &e = c.events[s.event_begin + i];
      if (e.frame == phase) {
        ++cost[0];
        cost[3] += e.kind == ALIVE_SESSION_AUTOMATION;
      }
    }
  }
  return cost;
}
AliveSessionConfigV4 abstract_source(unsigned length, unsigned start, unsigned end,
                                      unsigned automation) {
  AliveSessionConfigV4 c{};
  c.source_count = 1;
  c.sources[0].length_frames = length;
  if (start < end) {
    c.events[c.event_count++] = {start, 0, ALIVE_SESSION_NOTE_ON, 0, 60, 100};
    if (end < length)
      c.events[c.event_count++] = {end, 0, ALIVE_SESSION_NOTE_OFF, 0, 60, 0};
  }
  if (automation < length)
    c.events[c.event_count++] = {automation, 0, ALIVE_SESSION_AUTOMATION, 0, 0, .5};
  std::sort(c.events, c.events + c.event_count, [](const auto &a, const auto &b) {
    return a.frame < b.frame || (a.frame == b.frame && a.kind < b.kind);
  });
  c.sources[0].event_count = c.event_count;
  return c;
}

void source_oracle(const AliveSessionConfigV4 &c, unsigned offset, bool loop, unsigned width) {
  const auto length = c.sources[0].length_frames, period = length - offset;
  // The fixture has at most one interval; one chase voice is an independent bound.
  const Charge pulse{1, 2, c.event_count, 4, 0, 1};
  Curves profile{}, composed{};
  Envelope no_cuts{};
  unsigned calls = 0;
  assert(wa::source_profile(c, 0, offset, loop, pulse, profile, width));
  Charge entry = pulse;
  entry[5] = 4;
  assert(wa::compose(profile, no_cuts, entry, composed, calls, width));
  for (unsigned phase = offset; phase <= length; ++phase) {
    Charge actual{};
    bool active = phase < length;
    uint64_t p = phase;
    for (unsigned w = 1; w <= width; ++w) {
      if (w == 1)
        accumulate(actual, enter(c, active ? 0 : ALIVE_SESSION_V4_NONE, p, 2, 2, 4));
      else if (active && p == length) {
        if (loop) {
          p = offset;
          accumulate(actual, enter(c, 0, p, 2, 2, 1));
        } else {
          active = false;
          accumulate(actual, enter(c, ALIVE_SESSION_V4_NONE, 0, 2, 2, 1));
        }
      }
      if (active) {
        accumulate(actual, ordinary(c, 0, p));
        ++p;
      }
      covered(actual, composed, w);
    }
  }
  // Prefix ordinary events cannot replay in either finite or cyclic suffixes.
  assert(period > 0);
  ++source_cases;
}

void exhaustive_sources() {
  for (unsigned length = 1; length <= 7; ++length)
    for (unsigned offset = 0; offset < length; ++offset)
      for (unsigned start = 0; start <= length; ++start)
        for (unsigned end = start; end <= length; ++end)
          for (unsigned automation = 0; automation <= length; ++automation)
            for (bool loop : {false, true})
              source_oracle(abstract_source(length, start, end, automation), offset, loop, 8);
  for (unsigned period : {188u, 375u})
    for (unsigned offset : {0u, 100u})
      for (bool loop : {false, true})
        source_oracle(abstract_source(period + offset, 0, offset + period / 2, offset), offset,
                      loop, 1024);
  auto exact = abstract_source(7, 1, 4, 3);
  assert(enter(exact, 0, 1, 2, 2, 1)[0] == 0);
  assert(enter(exact, 0, 2, 2, 2, 1)[0] == 1);
  assert(enter(exact, 0, 4, 2, 2, 1)[0] == 0);
  Curves finite{}, cyclic{};
  const Charge clear{0, 2, 0, 4, 0, 1};
  const auto empty = abstract_source(5, 0, 0, 5);
  assert(wa::source_profile(empty, 0, 0, false, clear, finite));
  assert(wa::source_profile(empty, 0, 0, true, clear, cyclic));
  assert(finite[1][1] == 2 && finite[1][5] == 2 && finite[1][6] == 4);
  assert(finite[1][1024] == 4 && cyclic[1][1024] == 410);
  // Everything before O is reconstruction-only; it never appears as ordinary
  // suffix events. The only event pulse left here is the held-note chase.
  const auto prefix = abstract_source(7, 0, 7, 1);
  const Charge chase{1, 1, 2, 2, 0, 1};
  assert(wa::source_profile(prefix, 0, 3, true, chase, cyclic));
  assert(cyclic[0][4] == 1 && cyclic[0][8] == 2 && cyclic[3][4] == 2);
}

void exhaustive_boundaries() {
  for (unsigned period = 1; period <= 7; ++period)
    for (unsigned begin = 0; begin <= 3; ++begin)
      for (unsigned mask = 0; mask < (1u << (begin + period)); ++mask) {
        std::vector<uint64_t> points;
        for (unsigned f = 0; f < begin + period; ++f)
          if (mask & (1u << f))
            points.push_back(f);
        for (bool loop : {false, true}) {
          Envelope bound{};
          assert(wa::song_points(points.data(), unsigned(points.size()), begin + period + 2,
                                 loop, begin, begin + period, bound, 8));
          for (unsigned absolute = 0; absolute <= begin + 2 * period; ++absolute) {
            uint64_t total = 0;
            for (unsigned w = 1; w <= 8; ++w) {
              const unsigned at = absolute + w - 1;
              const unsigned song = loop && at >= begin ? begin + (at - begin) % period : at;
              for (uint64_t point : points)
                total += point == song;
              assert(total <= bound[w]);
              assert(bound[w] >= bound[w - 1]);
              assertions += 2;
            }
          }
          ++boundary_cases;
        }
      }
  // Extreme absolute frame coordinates must not overflow cyclic distances.
  const wa::Pulse far[]{{UINT64_MAX - 3, 1}, {UINT64_MAX - 2, 1}};
  Envelope bound{};
  assert(wa::pulse_envelope(far, 2, UINT64_MAX, true, bound));
  assert(bound[1] == 1 && bound[1024] == 2);
  const wa::Pulse huge{0, UINT64_MAX};
  assert(!wa::pulse_envelope(&huge, 1, 1, true, bound));
  uint64_t result;
  assert(!wa::plus(UINT64_MAX, 1, result));
  assert(!wa::times(UINT64_MAX, 2, result));
}

// Enumerate each concrete cut, stream choice and starting phase independently.
// No envelope/DP state is used by the reference recursion.
uint64_t splice(const std::vector<std::vector<Charge>> &streams, unsigned width,
                unsigned pieces, unsigned dimension) {
  uint64_t best = 0;
  for (const auto &stream : streams)
    for (unsigned phase = 0; phase < stream.size(); ++phase) {
      uint64_t sum = 0;
      for (unsigned n = 1; n <= width; ++n) {
        sum += stream[(phase + n - 1) % stream.size()][dimension];
        if (n == width)
          best = std::max(best, sum);
        else if (pieces > 1)
          best = std::max(best, sum + splice(streams, width - n, pieces - 1, dimension));
      }
    }
  return best;
}
void exhaustive_cuts() {
  const std::vector<std::vector<Charge>> streams{
      {{2, 1, 3, 4, 0, 1}, {1, 0, 0, 1, 0, 0}},
      {{0, 2, 1, 2, 0, 1}, {}, {1, 0, 0, 1, 0, 0}}};
  Curves source{}, composed{};
  for (unsigned m = 0; m < 6; ++m)
    for (unsigned w = 1; w <= 8; ++w)
      source[m][w] = splice(streams, w, 1, m);
  for (unsigned cuts = 0; cuts <= 2; ++cuts) {
    Envelope k{};
    for (unsigned w = 1; w <= 8; ++w)
      k[w] = cuts;
    unsigned calls = 0;
    assert(wa::compose(source, k, {}, composed, calls, 8));
    for (unsigned w = 1; w <= 8; ++w)
      for (unsigned m = 0; m < 6; ++m) {
        assert(composed[m][w] == splice(streams, w, cuts + 1, m));
        ++splice_cases;
      }
  }
  Envelope k{};
  k.fill(6);
  k[0] = 0;
  unsigned calls = 0;
  assert(wa::compose(source, k, {}, composed, calls, 8) && calls == 6);
  calls = 0;
  k[8] = 7;
  assert(!wa::compose(source, k, {}, composed, calls, 8) && calls == 0);
  k[8] = 6;
  source[0][8] = UINT64_MAX;
  assert(!wa::compose(source, k, {}, composed, calls, 8) && calls == 0);
}

AliveSessionConfigV4 sparse(unsigned tracks = 2) {
  AliveSessionConfigV4 c{};
  c.version = 4;
  c.struct_bytes = sizeof c;
  c.preparation_revision = 1;
  c.profile = c.work_policy = tracks > 2 ? 2 : 1;
  c.tempo_bpm = 120;
  c.length_frames = c.loop_end = 8192;
  c.track_count = c.device_count = c.source_count = c.slot_count = tracks;
  for (unsigned t = 0; t < tracks; ++t) {
    auto &tr = c.tracks[t];
    tr.kind = 1;
    tr.instrument = t;
    tr.gain = 1;
    std::fill_n(tr.slots, 4, ALIVE_SESSION_V4_NONE);
    tr.slots[3] = t;
    auto &d = c.devices[t];
    d.kind = 1;
    d.document = t;
    d.revision = 1;
    d.note_node = 1;
    d.output_channels = d.output_layout = 2;
    c.sources[t].track = t;
    c.sources[t].kind = 1;
    c.sources[t].audio_buffer = ALIVE_SESSION_V4_NONE;
    c.sources[t].length_frames = 4096;
    c.slots[t].track = c.slots[t].source = t;
  }
  return c;
}

struct ScalarTrack {
  bool session, silent = false;
  unsigned slot, occurrence = ALIVE_SESSION_V4_NONE, source = ALIVE_SESSION_V4_NONE;
  uint64_t phase;
};

Charge scalar_frame(const AliveSessionConfigV4 &c, unsigned t, ScalarTrack &state,
                    uint64_t song, bool wrap, bool first, unsigned action,
                    unsigned roots = 1, unsigned parameters = 0) {
  const auto &tr = c.tracks[t];
  const auto old_source = state.source, old_occurrence = state.occurrence;
  const auto old_phase = state.phase;
  bool reset = first || (wrap && !state.session), seam = false;
  unsigned probes = first ? (tr.placement_count ? 4 : 2) : 0;
  if (action) {
    reset = true;
    if (action == 1) {
      state.session = true;
      state.silent = false;
      state.phase = c.slots[state.slot].source_offset;
      probes = 2;
    } else if (action == 2) {
      state.session = state.silent = true;
      probes = 0;
    } else {
      state.session = false;
      probes = tr.placement_count ? 4 : 0;
    }
  }
  state.source = state.occurrence = ALIVE_SESSION_V4_NONE;
  if (state.session) {
    const auto &slot = c.slots[state.slot];
    const auto &src = c.sources[slot.source];
    if (!state.silent && state.phase >= src.length_frames) {
      seam = true;
      if (slot.loop_enabled)
        state.phase = slot.source_offset;
      else
        state.silent = true;
    }
    if (!state.silent)
      state.source = slot.source;
  } else {
    // Half-open scalar containment, independent of production binary search.
    for (unsigned i = 0; i < tr.placement_count; ++i) {
      const unsigned index = tr.placement_begin + i;
      const auto &p = c.placements[index];
      if (song >= p.start_frame && song < p.start_frame + p.duration_frames) {
        state.source = p.source;
        state.occurrence = index;
        const auto elapsed = song - p.start_frame;
        const auto period = c.sources[p.source].length_frames - p.source_offset;
        state.phase = p.source_offset + (p.loop_enabled ? elapsed % period : elapsed);
        if (!first && old_occurrence == index && state.phase <= old_phase)
          seam = true;
      }
    }
    if (state.occurrence != old_occurrence) {
      reset = true;
      probes = 4;
    }
    if (wrap)
      probes = tr.placement_count ? 4 : 0;
  }
  if (seam || state.source != old_source)
    reset = true;
  Charge actual{};
  if (reset) {
    if (!probes && seam)
      probes = 1;
    accumulate(actual, enter(c, state.source, state.phase, roots, parameters, probes));
  }
  accumulate(actual, ordinary(c, state.source, state.phase));
  if (state.session && !state.silent)
    ++state.phase;
  return actual;
}

void exhaustive_authority() {
  for (bool gap : {false, true})
    for (bool same_source : {false, true}) {
      auto c = abstract_source(5, 0, 3, 2);
      const auto second = abstract_source(7, 0, 6, 2);
      c.sources[1] = second.sources[0];
      c.sources[1].event_begin = c.event_count;
      for (unsigned i = 0; i < second.event_count; ++i)
        c.events[c.event_count++] = second.events[i];
      c.source_count = 2;
      c.length_frames = 20;
      c.loop_enabled = 1;
      c.loop_start = 3;
      c.loop_end = 17;
      c.tracks[0].placement_count = 2;
      c.placements[0] = {0, 0, 0, 0, 0, 4, 0};
      c.placements[1] = {0, same_source ? 0u : 1u, 1, 0, gap ? 5u : 4u, gap ? 15u : 16u, 2};
      c.slots[0] = {0, 1, 1, 0, 2};
      Curves maximum{}, profile{}, bound{};
      const Charge pulse{1, 2, 3, 4, 0, 1}, transition{1, 2, 3, 4, 0, 4};
      for (unsigned source = 0; source < 2; ++source)
        for (unsigned offset : {0u, 2u})
          for (bool loop : {false, true}) {
            assert(wa::source_profile(c, source, offset, loop, pulse, profile, 8));
            for (unsigned m = 0; m < 6; ++m)
              for (unsigned w = 1; w <= 8; ++w)
                maximum[m][w] = std::max(maximum[m][w], profile[m][w]);
          }
      uint64_t endpoints[]{0, 4, gap ? 5u : 20u, 20};
      const unsigned count = gap ? 4 : 3;
      Envelope k{};
      assert(wa::song_points(endpoints, count, 20, true, 3, 17, k, 8));
      for (unsigned w = 1; w <= 8; ++w)
        k[w] += 2; // one global seam and one independently enumerated action.
      unsigned calls = 0;
      assert(wa::compose(maximum, k, transition, bound, calls, 8));
      Curves pair = bound;
      for (auto &row : pair)
        for (auto &value : row)
          value *= 2;
      for (unsigned song_start = 0; song_start < 17; ++song_start)
        for (unsigned phase0 = 2; phase0 < 7; ++phase0)
          for (unsigned phase1 = 2; phase1 < 7; ++phase1)
            for (unsigned mask = 0; mask < 4; ++mask)
              for (unsigned cut = 0; cut < 8; ++cut)
                for (unsigned action = 0; action <= 3; ++action) {
                  ScalarTrack states[2]{{bool(mask & 1), false, 0, ALIVE_SESSION_V4_NONE,
                                          ALIVE_SESSION_V4_NONE, phase0},
                                         {bool(mask & 2), false, 0, ALIVE_SESSION_V4_NONE,
                                          ALIVE_SESSION_V4_NONE, phase1}};
                  Charge actual{};
                  uint64_t song = song_start;
                  for (unsigned w = 1; w <= 8; ++w) {
                    const bool wrap = song == 17;
                    if (wrap)
                      song = 3;
                    accumulate(actual, scalar_frame(c, 0, states[0], song, wrap, w == 1,
                                                     w - 1 == cut ? action : 0, 2, 2));
                    accumulate(actual, scalar_frame(c, 0, states[1], song, wrap, w == 1,
                                                     w - 1 == 7 - cut ? (action + 1) % 4 : 0, 2, 2));
                    covered(actual, pair, w);
                    ++song;
                  }
                  ++authority_cases;
                }
    }
}

void builder_validation() {
  auto owner = std::make_unique<ultra::AliveSession>();
  auto proof = std::make_unique<wa::Proof>();
  for (unsigned tracks : {1u, 2u, 3u, 8u}) {
    auto c = sparse(tracks);
    assert(owner->prepare_midi_envelopes_v4(c, *proof));
    assert(proof->uses == tracks && proof->segment_calls == tracks * 6);
    for (unsigned t = 0; t < tracks; ++t)
      assert(proof->prepared.reset[t][0] == 0);
    for (unsigned m = 0; m < 6; ++m)
      for (unsigned which = 0; which < 2; ++which) {
        uint64_t sum = 0;
        for (unsigned t = 0; t < tracks; ++t)
          sum += proof->contribution[t][which][m];
        assert(sum == (m == 5 ? proof->placement : proof->prepared.future[m])[which ? 1024 : 1]);
      }
    assert(owner->validate_v4(c) == (tracks <= 2));
  }
  auto refused = [&](AliveSessionConfigV4 c, unsigned error) {
    assert(!owner->prepare_midi_envelopes_v4(c, *proof));
    assert(proof->diagnostic.error == error);
    assert(proof->segment_calls == 0);
  };
  auto c = sparse();
  c.tracks[0].gain = 2.01;
  refused(c, ALIVE_SESSION_V4_BAD_FIELD);
  c = sparse();
  c.slots[1].source = 0;
  refused(c, ALIVE_SESSION_V4_BAD_SOURCE);
  c = sparse();
  c.tracks[0].slots[0] = 0;
  refused(c, ALIVE_SESSION_V4_BAD_OWNERSHIP);
  c = sparse();
  c.tracks[1].slots[3] = ALIVE_SESSION_V4_NONE;
  refused(c, ALIVE_SESSION_V4_BAD_SOURCE);
  c = sparse();
  c.sources[0].length_frames = UINT64_MAX;
  refused(c, ALIVE_SESSION_V4_BAD_SOURCE);
  c = sparse();
  c.event_count = 1025;
  refused(c, ALIVE_SESSION_V4_BAD_FIELD);
  c = sparse(1);
  c.source_count = 5;
  for (unsigned s = 1; s < 5; ++s)
    c.sources[s] = c.sources[0];
  refused(c, ALIVE_SESSION_V4_BAD_SOURCE);
  c = sparse(1);
  c.sources[1] = c.sources[0];
  c.source_count = 2;
  c.event_count = c.sources[1].event_count = 5;
  for (unsigned i = 0; i < 5; ++i)
    c.events[i] = {i, 0, ALIVE_SESSION_NOTE_ON, 0, 60 + i, 100};
  refused(c, ALIVE_SESSION_V4_BAD_SOURCE); // Unused source still enforces four voices.
  c.sources[1].event_count = c.event_count = 2;
  c.events[1] = {1, 0, ALIVE_SESSION_NOTE_ON, 0, 60, 100};
  std::fill(c.events + 2, c.events + 5, AliveSessionEventV2{});
  refused(c, ALIVE_SESSION_V4_BAD_SOURCE);
  c.events[0] = {0, 0, ALIVE_SESSION_NOTE_OFF, 0, 60, 0};
  refused(c, ALIVE_SESSION_V4_BAD_SOURCE);
  // Four endpoint unions + grid + natural end is exactly six; adding one
  // separated occurrence makes eight. All tracks are checked before any DP.
  c = sparse(2);
  c.placement_count = c.tracks[1].placement_count = 2;
  c.placements[0] = {1, 1, 0, 0, 100, 100, 0};
  c.placements[1] = {1, 1, 0, 0, 300, 100, 0};
  assert(owner->prepare_midi_envelopes_v4(c, *proof));
  assert(proof->boundaries[1][1024] == 6);
  c.placement_count = c.tracks[1].placement_count = 3;
  c.placements[2] = {1, 1, 0, 0, 500, 100, 0};
  refused(c, ALIVE_SESSION_V4_WORK_LIMIT);
  assert(proof->diagnostic.limit == 6 && proof->diagnostic.observed == 8);
  assert(proof->diagnostic.track_mask == 2 && proof->diagnostic.source[1] == 1);
  // Touching starts/ends form one union point, yielding exactly seven.
  c.placements[2].start_frame = 400;
  refused(c, ALIVE_SESSION_V4_WORK_LIMIT);
  assert(proof->diagnostic.observed == 7);
  c.placements[2].start_frame = UINT64_MAX;
  refused(c, ALIVE_SESSION_V4_BAD_PLACEMENT);
  for (unsigned tempo : {120u, 240u}) {
    c = sparse(1);
    c.tempo_bpm = tempo;
    const unsigned minimum = tempo == 120 ? 375 : 188;
    c.slots[0].loop_enabled = 1;
    c.slots[0].source_offset = 4096 - minimum;
    assert(owner->prepare_midi_envelopes_v4(c, *proof));
    ++c.slots[0].source_offset;
    refused(c, ALIVE_SESSION_V4_BAD_SOURCE);
  }
  c = sparse(1);
  c.tracks[0].placement_count = c.placement_count = 9;
  refused(c, ALIVE_SESSION_V4_BAD_FIELD);
  c = sparse(1);
  c.placement_count = c.tracks[0].placement_count = 1;
  c.placements[0] = {0, 0, 1, 0, 0, 8192, 4096 - 374};
  refused(c, ALIVE_SESSION_V4_BAD_PLACEMENT);
  c = sparse(1);
  c.sources[0].owned_masks[0] = 1;
  refused(c, ALIVE_SESSION_V4_BAD_OWNERSHIP);
  c = sparse(1);
  c.event_count = c.sources[0].event_count = 1;
  c.events[0] = {0, 0, ALIVE_SESSION_AUTOMATION, 0, 0, .5};
  refused(c, ALIVE_SESSION_V4_BAD_OWNERSHIP);
  // Exercise all 96 distinct descriptors without copying event storage. The
  // shape is valid but its conservative placement curve is allowed to refuse.
  c = sparse(8);
  c.length_frames = c.loop_end = 20000;
  c.source_count = c.slot_count = 32;
  c.placement_count = 64;
  for (unsigned t = 0; t < 8; ++t) {
    c.tracks[t].placement_begin = t * 8;
    c.tracks[t].placement_count = 8;
    for (unsigned s = 0; s < 4; ++s) {
      c.sources[t * 4 + s] = {};
      c.sources[t * 4 + s].kind = 1;
      c.sources[t * 4 + s].track = t;
      c.sources[t * 4 + s].length_frames = 4096;
      c.sources[t * 4 + s].audio_buffer = ALIVE_SESSION_V4_NONE;
      c.slots[t * 4 + s] = {t, t * 4 + s, 0, 0, s};
      c.tracks[t].slots[s] = t * 4 + s;
    }
    for (unsigned p = 0; p < 8; ++p)
      c.placements[t * 8 + p] = {t, t * 4 + p % 4, 0, 0, p * 2048, 1024, p + 4};
  }
  assert(!owner->prepare_midi_envelopes_v4(c, *proof));
  assert(proof->uses == 96 && proof->segment_calls == 48);
  assert(proof->diagnostic.resource == ALIVE_SESSION_V4_RESOURCE_PLACEMENT_STEPS);
  assert(proof->diagnostic.window_frames == 1 && proof->diagnostic.limit == 64);
  assert(proof->placement_contributors[7] == UINT64_C(0xff00000000000000));
  c = sparse(1);
  c.slot_count = 2;
  c.slots[1] = c.slots[0];
  c.slots[1].loop_enabled = 1;
  c.tracks[0].slots[0] = 1;
  assert(owner->prepare_midi_envelopes_v4(c, *proof));
  assert(proof->uses == 1);
}

void native_timelines() {
  auto owner = std::make_unique<ultra::AliveSession>();
  auto proof = std::make_unique<wa::Proof>();
  for (unsigned period : {188u, 375u})
    for (unsigned tracks : {1u, 3u, 8u})
      for (bool finite_session : {false, true}) {
        auto c = sparse(tracks);
        c.tempo_bpm = period == 188 ? 240 : 120;
        c.loop_enabled = 1;
        c.loop_start = 2400;
        c.loop_end = 4000;
        for (unsigned t = 0; t < tracks; ++t) {
          c.sources[t].length_frames = 100 + period;
          c.slots[t].source_offset = 100;
          c.slots[t].loop_enabled = !finite_session;
          if (tracks < 8) {
            c.sources[t].event_begin = t;
            c.sources[t].event_count = 1;
            c.events[c.event_count++] = {0, t, ALIVE_SESSION_NOTE_ON, t, 60 + t, 100};
            c.tracks[t].placement_begin = t;
            c.tracks[t].placement_count = 1;
            c.placements[c.placement_count++] = {t, t, 1, 0, 0, 8192, 100};
          }
        }
        const bool accepted = owner->prepare_midi_envelopes_v4(c, *proof);
        if (accepted)
          ++native_accepted;
        else
          ++native_refused;
        assert(proof->segment_calls == tracks * 6);
        assert(accepted); // Sparse native-scale cases fit the unchanged limits.
        Curves bound{};
        std::copy(proof->prepared.future.begin(), proof->prepared.future.end(), bound.begin());
        bound[5] = proof->placement;
        const unsigned starts[]{0, 2399, 2400, 3999};
        for (unsigned song_start : starts)
          for (unsigned seed = 0; seed < 3; ++seed)
            for (unsigned mask = 0; mask < (1u << tracks); ++mask) {
              std::array<ScalarTrack, 8> states{};
              for (unsigned t = 0; t < tracks; ++t)
                states[t] = {bool(mask & (1u << t)), false, t, ALIVE_SESSION_V4_NONE,
                              ALIVE_SESSION_V4_NONE, 100 + (seed * 37 * (t + 1)) % period};
              Charge actual{};
              uint64_t song = song_start;
              for (unsigned w = 1; w <= 1024; ++w) {
                const bool wrap = song == c.loop_end;
                if (wrap)
                  song = c.loop_start;
                for (unsigned t = 0; t < tracks; ++t) {
                  // A single control-entry discontinuity is already included by
                  // the arbitrary-entry term. Due actions are otherwise on the
                  // native bar/seam grid, never invented at arbitrary frames.
                  const unsigned action = w == 1 ? (seed + t) % 4 : 0;
                  accumulate(actual, scalar_frame(c, t, states[t], song, wrap, w == 1, action));
                }
                covered(actual, bound, w);
                ++song;
              }
              ++native_cases;
            }
      }
  // Dense but shape-valid minimum-period material refuses conservatively.
  auto dense = sparse(8);
  dense.tempo_bpm = 240;
  for (unsigned t = 0; t < 8; ++t) {
    dense.slots[t].loop_enabled = 1;
    dense.sources[t].length_frames = 188;
    dense.sources[t].event_begin = dense.event_count;
    dense.sources[t].event_count = 8;
    for (unsigned pitch = 0; pitch < 4; ++pitch)
      dense.events[dense.event_count++] = {0, t, ALIVE_SESSION_NOTE_ON, t, 60 + pitch, 100};
    for (unsigned pitch = 0; pitch < 4; ++pitch)
      dense.events[dense.event_count++] = {187, t, ALIVE_SESSION_NOTE_OFF, t, 60 + pitch, 0};
  }
  assert(!owner->prepare_midi_envelopes_v4(dense, *proof));
  assert(proof->diagnostic.conservative && proof->diagnostic.resource == 1);
  assert(proof->diagnostic.track_mask == 255);
  ++native_refused;
}

void native_automation_chain() {
  auto c = sparse(1);
  c.device_count = 2;
  c.tracks[0].effect_count = 1;
  c.tracks[0].effects[0] = 1;
  c.devices[1] = c.devices[0];
  c.devices[1].document = 1;
  c.devices[1].kind = 2;
  c.devices[1].note_node = 0;
  c.devices[1].input_node = 1;
  c.devices[1].input_channels = c.devices[1].input_layout = 2;
  for (unsigned d = 0; d < 2; ++d) {
    c.devices[d].parameter_count = 1;
    c.devices[d].parameters[0] = {1, 0, 1, 0, .25, 0, 1};
    c.sources[0].owned_masks[d] = 1;
  }
  c.sources[0].lane_count = 2;
  c.sources[0].event_count = c.event_count = 6;
  c.events[0] = {0, 0, ALIVE_SESSION_NOTE_ON, 0, 60, 100};
  c.events[1] = {10, 0, ALIVE_SESSION_AUTOMATION, 0, 0, .25};
  c.events[2] = {20, 0, ALIVE_SESSION_AUTOMATION, 1, 0, .5};
  c.events[3] = {100, 0, ALIVE_SESSION_AUTOMATION, 0, 0, .75};
  c.events[4] = {200, 0, ALIVE_SESSION_NOTE_OFF, 0, 60, 0};
  c.events[5] = {1000, 0, ALIVE_SESSION_NOTE_ON, 0, 64, 100};
  c.slots[0].source_offset = 100;
  c.slots[0].loop_enabled = 1;
  c.tracks[0].placement_count = c.placement_count = 1;
  c.placements[0] = {0, 0, 1, 0, 0, 8192, 100};
  c.loop_enabled = 1;
  c.loop_start = 2400;
  c.loop_end = 4000;
  auto owner = std::make_unique<ultra::AliveSession>();
  auto proof = std::make_unique<wa::Proof>();
  assert(owner->prepare_midi_envelopes_v4(c, *proof));
  assert(proof->prepared.reset[0] == ultra::clip_admission::Cost({0, 2, 6, 4, 0}));
  Curves bound{};
  std::copy(proof->prepared.future.begin(), proof->prepared.future.end(), bound.begin());
  bound[5] = proof->placement;
  for (unsigned song_start : {0u, 2399u, 3999u})
    for (unsigned phase : {100u, 200u, 1000u, 1500u})
      for (bool session : {false, true}) {
        ScalarTrack state{session, false, 0, ALIVE_SESSION_V4_NONE, ALIVE_SESSION_V4_NONE, phase};
        Charge actual{};
        uint64_t song = song_start;
        for (unsigned w = 1; w <= 1024; ++w) {
          const bool wrap = song == c.loop_end;
          if (wrap)
            song = c.loop_start;
          accumulate(actual, scalar_frame(c, 0, state, song, wrap, w == 1, 0, 2, 2));
          covered(actual, bound, w);
          ++song;
        }
        ++native_cases;
      }
  ++native_accepted;
  c.sources[0].owned_masks[1] = 0;
  assert(!owner->prepare_midi_envelopes_v4(c, *proof));
  assert(proof->diagnostic.error == ALIVE_SESSION_V4_BAD_OWNERSHIP);
}

int main() {
  exhaustive_sources();
  exhaustive_boundaries();
  exhaustive_cuts();
  exhaustive_authority();
  builder_validation();
  native_timelines();
  native_automation_chain();
  auto owner = std::make_unique<ultra::AliveSession>();
  const auto c = sparse();
  auto proof = std::make_unique<ultra::workspace_admission::Proof>();
  assert(owner->prepare_midi_envelopes_v4(c, *proof));
  assert(owner->validate_v4(c));
  assert(owner->prepare_midi_envelopes_v4(sparse(8), *proof));
  assert(!owner->validate_v4(sparse(8)));
  std::printf("PASS: sources=%llu boundaries=%llu splices=%llu authority=%llu native=%llu accepted=%llu refused=%llu assertions=%llu\n",
              (unsigned long long)source_cases, (unsigned long long)boundary_cases,
              (unsigned long long)splice_cases, (unsigned long long)authority_cases,
              (unsigned long long)native_cases, (unsigned long long)native_accepted,
              (unsigned long long)native_refused,
              (unsigned long long)assertions);
}
