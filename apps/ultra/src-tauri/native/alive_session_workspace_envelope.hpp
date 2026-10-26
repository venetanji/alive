#pragma once
#include "alive_session_clip_policy.hpp"
#include <cmath>
#include <memory>

namespace ultra::workspace_admission {
using clip_admission::Envelope;
using clip_admission::Pulse;
constexpr unsigned Window = clip_admission::Window;
using Charge = std::array<uint64_t, 6>;
using Curves = std::array<Envelope, 6>;

inline bool plus(uint64_t a, uint64_t b, uint64_t &out) noexcept {
  if (b > UINT64_MAX - a)
    return false;
  out = a + b;
  return true;
}
inline bool times(uint64_t a, uint64_t b, uint64_t &out) noexcept {
  if (a && b > UINT64_MAX / a)
    return false;
  out = a * b;
  return true;
}

// Sorted local pulses only. No timeline is expanded, even for short periods.
inline bool pulse_envelope(const Pulse *p, unsigned n, uint64_t period, bool loop,
                           Envelope &out, unsigned width = Window) noexcept {
  out = {};
  if (!period || width > Window)
    return false;
  uint64_t total = 0;
  for (unsigned i = 0; i < n; ++i)
    if (p[i].frame > period || (loop && p[i].frame == period) ||
        (i && p[i].frame < p[i - 1].frame) || !plus(total, p[i].weight, total))
      return false;
  for (unsigned w = 1; w <= width; ++w) {
    const uint64_t residual = loop ? w % period : w;
    uint64_t best = 0, sum = 0;
    unsigned end = 0;
    if (residual)
      for (unsigned begin = 0; begin < n; ++begin) {
        while (end < (loop ? begin + n : n)) {
          // This difference avoids adding period to an absolute source frame.
          const uint64_t distance = end < n ? p[end].frame - p[begin].frame
                                           : period - p[begin].frame + p[end % n].frame;
          if (distance >= residual)
            break;
          if (!plus(sum, p[end % n].weight, sum))
            return false;
          ++end;
        }
        best = std::max(best, sum);
        sum -= p[begin].weight;
      }
    uint64_t repeated = 0;
    if (!times(loop ? w / period : 0, total, repeated) || !plus(repeated, best, out[w]))
      return false;
  }
  return true;
}

// Prefix and loop maxima are summed for first-entry crossing windows. This is
// deliberately conservative, including at width one, but independent of song length.
inline bool song_points(const uint64_t *points, unsigned count, uint64_t length,
                        bool loop, uint64_t begin, uint64_t end, Envelope &out,
                        unsigned width = Window) noexcept {
  if (!length || count > 81 || (loop && (begin >= end || end > length)))
    return false;
  std::array<Pulse, 81> prefix{}, cycle{};
  unsigned np = 0, nc = 0;
  for (unsigned i = 0; i < count; ++i) {
    if (points[i] > length || (i && points[i] <= points[i - 1]))
      return false;
    if (!loop || points[i] < begin)
      prefix[np++] = {points[i], 1};
    else if (points[i] < end)
      cycle[nc++] = {points[i] - begin, 1};
    // E is replaced by the separately charged seam, never repeated as a placement.
  }
  Envelope a{}, b{};
  if (!pulse_envelope(prefix.data(), np, length, false, a, width) ||
      (loop && !pulse_envelope(cycle.data(), nc, end - begin, true, b, width)))
    return false;
  for (unsigned w = 0; w <= width; ++w)
    if (!plus(a[w], b[w], out[w]))
      return false;
  return true;
}

inline unsigned held_bound(const AliveSessionConfigV4 &c, unsigned source) noexcept {
  const auto &s = c.sources[source];
  unsigned held = 0, peak = 0;
  for (unsigned i = 0; i < s.event_count; ++i) {
    const auto &e = c.events[s.event_begin + i];
    if (e.kind == ALIVE_SESSION_NOTE_ON)
      peak = std::max(peak, ++held);
    else if (e.kind == ALIVE_SESSION_NOTE_OFF)
      --held;
  }
  return peak;
}

inline bool source_profile(const AliveSessionConfigV4 &c, unsigned source, uint64_t offset,
                           bool loop, const Charge &reset, Curves &out,
                           unsigned width = Window) noexcept {
  const auto &s = c.sources[source];
  if (offset >= s.length_frames || s.event_count > 1024 ||
      s.event_begin > c.event_count || s.event_count > c.event_count - s.event_begin)
    return false;
  const uint64_t period = s.length_frames - offset;
  std::array<Pulse, 1026> pulses{};
  for (unsigned m = 0; m < 6; ++m) {
    unsigned n = 0;
    pulses[n++] = {0, reset[m]};
    for (unsigned i = 0; i < s.event_count; ++i) {
      const auto &e = c.events[s.event_begin + i];
      if (e.frame >= offset)
        pulses[n++] = {e.frame - offset,
                        m == 0 ? 1u : (m == 3 && e.kind == ALIVE_SESSION_AUTOMATION ? 1u : 0u)};
    }
    if (!loop)
      pulses[n++] = {period, m == 0 ? 0 : reset[m]};
    if (!pulse_envelope(pulses.data(), n, period, loop, out[m], width))
      return false;
  }
  return true;
}

// The gate precedes every DP call, including tracks that will later fail policy.
inline bool compose(const Curves &source, const Envelope &k, const Charge &transition,
                    Curves &out, unsigned &calls, unsigned width = Window) noexcept {
  if (!width || width > Window || k[width] > 6)
    return false;
  for (unsigned w = 1; w <= width; ++w) {
    if (k[w] < k[w - 1])
      return false;
    for (unsigned m = 0; m < 6; ++m)
      if (source[m][w] > UINT64_MAX / 7)
        return false;
  }
  for (unsigned m = 0; m < 6; ++m) {
    ++calls;
    clip_admission::segments(source[m], k, out[m], width);
    for (unsigned w = 1; w <= width; ++w) {
      uint64_t extra;
      if (!times(k[w] + 1, transition[m], extra) || !plus(out[m][w], extra, out[m][w]))
        return false;
    }
  }
  return true;
}

struct Proof {
  clip_admission::Prepared prepared{};
  Envelope placement{};
  std::array<Envelope, 8> boundaries{};
  std::array<std::array<Charge, 2>, 8> contribution{};
  std::array<std::array<std::array<unsigned, 6>, 2>, 8> source{};
  AliveSessionDiagnosticV4 diagnostic{};
  unsigned uses = 0, segment_calls = 0;
  uint64_t loop_begin = 0, loop_end = 0;
  unsigned grid_count = 0, loop_enabled = 0;
  std::array<uint64_t, 8> placement_contributors{};
};

// Input has passed the final MIDI shape validator. This has no runtime authority
// and cannot configure the host; the next preparation slice consumes its curves.
inline bool build_validated(const AliveSessionConfigV4 &c, Proof &out) noexcept {
  out = {};
  auto &diag = out.diagnostic;
  diag.version = 4;
  diag.struct_bytes = sizeof diag;
  diag.conservative = 1;
  diag.frame = UINT64_MAX;
  std::fill_n(diag.source, 8, UINT32_MAX);
  std::fill_n(diag.placement, 8, UINT32_MAX);
  out.loop_begin = c.loop_start;
  out.loop_end = c.loop_end;
  out.loop_enabled = c.loop_enabled;
  for (auto &track : out.source)
    for (auto &width : track)
      width.fill(UINT32_MAX);
  auto fail = [&](unsigned error, unsigned resource, unsigned width, uint64_t value,
                  uint64_t cap, unsigned track) {
    diag.error = error;
    diag.resource = resource;
    diag.window_frames = width;
    diag.observed = value;
    diag.limit = cap;
    diag.track_mask = track < 8 ? 1u << track : (1u << c.track_count) - 1;
    return false;
  };
  auto overflow = [&]() { return fail(ALIVE_SESSION_V4_WORK_LIMIT, 0, Window, UINT64_MAX, 0, 8); };
  struct Use { unsigned source; uint64_t offset; bool finite, cyclic; };
  std::array<Use, 96> uses{};
  auto use = [&](unsigned s, uint64_t o, bool loop) {
    unsigned i = 0;
    while (i < out.uses && (uses[i].source != s || uses[i].offset != o))
      ++i;
    if (i == out.uses) {
      if (out.uses == uses.size())
        return false;
      uses[out.uses++] = {s, o, false, false};
    }
    (loop ? uses[i].cyclic : uses[i].finite) = true;
    return true;
  };
  for (unsigned i = 0; i < c.slot_count; ++i)
    if (!use(c.slots[i].source, c.slots[i].source_offset, c.slots[i].loop_enabled))
      return overflow();
  for (unsigned i = 0; i < c.placement_count; ++i)
    if (!use(c.placements[i].source, c.placements[i].source_offset, c.placements[i].loop_enabled))
      return overflow();
  for (unsigned k = 0; k <= 64; ++k) {
    const uint64_t frame = uint64_t(std::round((4. * k) * 48000 * 60 / c.tempo_bpm));
    if (frame < (c.loop_enabled ? c.loop_end : c.length_frames))
      out.prepared.bars[out.prepared.bar_count++] = frame;
  }
  out.grid_count = out.prepared.bar_count;
  Envelope grid{}, global{};
  if (!song_points(out.prepared.bars.data(), out.prepared.bar_count, c.length_frames,
                   c.loop_enabled, c.loop_start, c.loop_end, grid))
    return overflow();
  const Pulse seam{0, 1};
  if (c.loop_enabled) {
    if (!pulse_envelope(&seam, 1, c.loop_end - c.loop_start, true, global))
      return overflow();
  } else
    for (unsigned w = 1; w <= Window; ++w)
      global[w] = 1;
  // Validate every track's cap first, so even a later dense track enters no DP.
  for (unsigned t = 0; t < c.track_count; ++t) {
    const auto &tr = c.tracks[t];
    std::array<uint64_t, 16> points{};
    unsigned count = 0;
    for (unsigned i = 0; i < tr.placement_count; ++i) {
      const auto &p = c.placements[tr.placement_begin + i];
      out.placement_contributors[t] |= uint64_t(1) << (tr.placement_begin + i);
      points[count++] = p.start_frame;
      if (!plus(p.start_frame, p.duration_frames, points[count++]))
        return overflow();
    }
    std::sort(points.begin(), points.begin() + count);
    count = unsigned(std::unique(points.begin(), points.begin() + count) - points.begin());
    auto &k = out.boundaries[t];
    if (!song_points(points.data(), count, c.length_frames, c.loop_enabled,
                     c.loop_start, c.loop_end, k))
      return overflow();
    for (unsigned w = 1; w <= Window; ++w)
      if (!plus(k[w], grid[w], k[w]) || !plus(k[w], global[w], k[w]) || k[w] < k[w - 1])
        return overflow();
    if (k[Window] > 6) {
      diag.placement[t] = tr.placement_count ? tr.placement_begin : UINT32_MAX;
      diag.source[t] = tr.placement_count ? c.placements[tr.placement_begin].source : UINT32_MAX;
      diag.contribution[t] = unsigned(k[Window]);
      return fail(ALIVE_SESSION_V4_WORK_LIMIT, 6, Window, k[Window], 6, t);
    }
  }
  // One profile and one track maximum are streamed; never 96 envelope sets.
  struct Scratch { Curves maximum{}, one{}, composed{}; };
  auto scratch = std::make_unique<Scratch>();
  for (unsigned t = 0; t < c.track_count; ++t) {
    const auto &tr = c.tracks[t];
    auto &reset = out.prepared.reset[t];
    reset[1] = 1 + tr.effect_count;
    unsigned chase = 0;
    for (unsigned m = 0; m <= tr.effect_count; ++m)
      reset[3] += 2 * c.devices[m ? tr.effects[m - 1] : tr.instrument].parameter_count;
    for (unsigned s = 0; s < c.source_count; ++s)
      if (c.sources[s].track == t) {
        reset[2] = std::max<uint64_t>(reset[2], c.sources[s].event_count);
        chase = std::max(chase, held_bound(c, s));
      }
    // Without placements, Return is constant silence; Launch needs only the
    // slot and source descriptors. No binary search is performed on that track.
    Charge transition{chase, reset[1], reset[2], reset[3], 0, tr.placement_count ? 4u : 2u};
    scratch->maximum = {};
    for (unsigned u = 0; u < out.uses; ++u) {
      const auto &a = uses[u];
      if (c.sources[a.source].track != t)
        continue;
      Charge pulse = transition;
      pulse[0] = held_bound(c, a.source);
      pulse[5] = 1;
      for (bool loop : {false, true}) {
        if (!(loop ? a.cyclic : a.finite))
          continue;
        if (!source_profile(c, a.source, a.offset, loop, pulse, scratch->one))
          return overflow();
        for (unsigned m = 0; m < 6; ++m)
          for (unsigned w = 1; w <= Window; ++w)
            if (scratch->one[m][w] > scratch->maximum[m][w]) {
              scratch->maximum[m][w] = scratch->one[m][w];
              if (w == 1 || w == Window)
                out.source[t][w == Window][m] = a.source;
            }
      }
    }
    if (!compose(scratch->maximum, out.boundaries[t], transition,
                  scratch->composed, out.segment_calls))
      return overflow();
    for (unsigned m = 0; m < 6; ++m) {
      auto &future = m == 5 ? out.placement : out.prepared.future[m];
      for (unsigned w = 1; w <= Window; ++w)
        if (!plus(future[w], scratch->composed[m][w], future[w]))
          return overflow();
      out.contribution[t][0][m] = scratch->composed[m][1];
      out.contribution[t][1][m] = scratch->composed[m][Window];
    }
  }
  const auto policy = clip_admission::policy(c.profile);
  const Charge frame{32, policy.scheduled_frame.root_clears, policy.scheduled_frame.event_scans,
                     policy.scheduled_frame.parameter_writes, 0, 64};
  const Charge window{64, policy.scheduled_window.root_clears, policy.scheduled_window.event_scans,
                      policy.scheduled_window.parameter_writes, 0, 512};
  for (unsigned width : {1u, Window})
    for (unsigned m = 0; m < 6; ++m) {
      const auto observed = (m == 5 ? out.placement : out.prepared.future[m])[width];
      const auto cap = (width == 1 ? frame : window)[m];
      if (observed > cap) {
        for (unsigned t = 0; t < c.track_count; ++t) {
          diag.contribution[t] = unsigned(std::min<uint64_t>(UINT32_MAX, out.contribution[t][width == Window][m]));
          diag.source[t] = out.source[t][width == Window][m];
          diag.placement[t] = c.tracks[t].placement_count ? c.tracks[t].placement_begin : UINT32_MAX;
        }
        return fail(m ? ALIVE_SESSION_V4_WORK_LIMIT : (width == 1 ? ALIVE_SESSION_V4_EVENT_FRAME_LIMIT
                                                                 : ALIVE_SESSION_V4_EVENT_WINDOW_LIMIT),
                    m + 1, width, observed, cap, 8);
      }
    }
  return true;
}
} // namespace ultra::workspace_admission
