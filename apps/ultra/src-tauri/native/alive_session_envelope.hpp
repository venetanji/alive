#pragma once
#include <algorithm>
#include <array>
#include <cstdint>

namespace ultra::clip_admission {
constexpr unsigned Window = 1024;
using Envelope = std::array<uint64_t, Window + 1>;
struct Pulse {
  uint64_t frame, weight;
};

// Two pointers visit at most two copies. Repeated periods are counted without
// expanding the timeline; duplicates and zero-weight pulses remain valid.
inline void cyclic(const Pulse *pulses, unsigned count, uint64_t period, Envelope &out,
                   unsigned width = Window) noexcept {
  out = {};
  uint64_t total = 0;
  for (unsigned i = 0; i < count; ++i)
    total += pulses[i].weight;
  if (!count)
    return;
  for (unsigned w = 1; w <= width; ++w) {
    const uint64_t residual = w % period;
    uint64_t best = 0, sum = 0;
    unsigned end = 0;
    if (residual)
      for (unsigned begin = 0; begin < count; ++begin) {
        while (end < begin + count &&
               pulses[end % count].frame + (end >= count ? period : 0) - pulses[begin].frame < residual) {
          sum += pulses[end % count].weight;
          ++end;
        }
        best = std::max(best, sum);
        sum -= pulses[begin].weight;
      }
    out[w] = (w / period) * total + best;
  }
}

// At most K(w)+1 positive-length segments. Only two DP rows are retained;
// each width takes its answer at its own independently computed boundary cap.
inline void segments(const Envelope &e, const Envelope &k, Envelope &out, unsigned width = Window) noexcept {
  Envelope previous = e, next{};
  out = {};
  unsigned max_segments = 1;
  for (unsigned w = 1; w <= width; ++w) {
    const unsigned j = std::min<uint64_t>(w, k[w] + 1);
    max_segments = std::max(max_segments, j);
    if (j == 1)
      out[w] = e[w];
  }
  for (unsigned j = 2; j <= max_segments; ++j) {
    next = previous;
    for (unsigned w = 2; w <= width; ++w)
      for (unsigned a = 1; a < w; ++a)
        next[w] = std::max(next[w], previous[w - a] + e[a]);
    for (unsigned w = 1; w <= width; ++w)
      if (std::min<uint64_t>(w, k[w] + 1) == j)
        out[w] = next[w];
    previous = next;
  }
}
} // namespace ultra::clip_admission
