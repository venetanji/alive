#include "../src-tauri/native/alive_session_envelope.hpp"
#include <cassert>
#include <cstdio>
#include <vector>
using namespace ultra::clip_admission;

// Independent scalar enumeration: expand each tiny period and enumerate all
// starting phases, including silent phases and duplicated weighted events.
uint64_t brute(const std::vector<Pulse> &events, unsigned period, unsigned width) {
  uint64_t best = 0;
  for (unsigned phase = 0; phase < period; ++phase) {
    uint64_t total = 0;
    for (unsigned f = 0; f < width; ++f)
      for (const auto &e : events)
        if ((phase + f) % period == e.frame)
          total += e.weight;
    best = std::max(best, total);
  }
  return best;
}
Envelope expanded(const std::vector<Pulse> &events, unsigned period) {
  Envelope result{};
  for (unsigned phase = 0; phase < period; ++phase) {
    uint64_t total = 0;
    for (unsigned width = 1; width <= Window; ++width) {
      for (const auto &event : events)
        if ((phase + width - 1) % period == event.frame)
          total += event.weight;
      result[width] = std::max(result[width], total);
    }
  }
  return result;
}
uint64_t splice(const std::vector<std::vector<unsigned>> &streams, unsigned width, unsigned remaining,
                unsigned at = 0) {
  if (!width)
    return 0;
  uint64_t best = 0;
  for (const auto &stream : streams)
    for (unsigned phase = 0; phase < stream.size(); ++phase) {
      uint64_t sum = 0;
      for (unsigned n = 1; n <= width; ++n) {
        sum += stream[(phase + n - 1) % stream.size()];
        if (n == width)
          best = std::max(best, sum);
        else if (remaining > 1)
          best = std::max(best, sum + splice(streams, width - n, remaining - 1, at + n));
      }
    }
  return best;
}
int main() {
  for (unsigned period = 1; period <= 7; ++period)
    for (unsigned mask = 0; mask < (1u << period); ++mask) {
      std::vector<Pulse> pulses;
      for (unsigned f = 0; f < period; ++f)
        if (mask & (1u << f)) {
          pulses.push_back({f, 1});
          if (f % 2 == 0)
            pulses.push_back({f, 2});
        }
      Envelope result{};
      cyclic(pulses.data(), unsigned(pulses.size()), period, result);
      const auto oracle = expanded(pulses, period);
      for (unsigned w = 0; w <= Window; ++w)
        assert(result[w] == oracle[w]);
    }
  const std::vector<std::vector<unsigned>> streams{{2, 0, 1}, {0, 0, 0, 3, 0}, {0, 0}};
  Envelope e{}, k{}, f{};
  for (unsigned w = 1; w <= 8; ++w) {
    for (const auto &stream : streams) {
      std::vector<Pulse> p;
      for (unsigned i = 0; i < stream.size(); ++i)
        p.push_back({i, stream[i]});
      e[w] = std::max(e[w], brute(p, unsigned(stream.size()), w));
    }
    k[w] = 2;
  }
  segments(e, k, f, 8);
  for (unsigned w = 1; w <= 8; ++w)
    assert(f[w] == splice(streams, w, std::min(3u, w)));
  // Enumerate concrete phase/clip pairs and every cut at every real horizon.
  // Unlike the production DP, the oracle retains each scalar trajectory.
  std::vector<Envelope> trajectories;
  for (const auto &stream : streams)
    for (unsigned phase = 0; phase < stream.size(); ++phase) {
      Envelope row{};
      for (unsigned w = 1; w <= Window; ++w)
        row[w] = row[w - 1] + stream[(phase + w - 1) % stream.size()];
      trajectories.push_back(row);
    }
  e = {};
  k = {};
  for (unsigned w = 1; w <= Window; ++w) {
    k[w] = 1;
    for (const auto &row : trajectories)
      e[w] = std::max(e[w], row[w]);
  }
  segments(e, k, f);
  for (unsigned w = 1; w <= Window; ++w) {
    uint64_t best = e[w];
    for (unsigned cut = 1; cut < w; ++cut)
      for (const auto &before : trajectories)
        for (const auto &after : trajectories)
          best = std::max(best, before[cut] + after[w - cut]);
    assert(f[w] == best);
  }
  // Empty clips still have a reset pulse; unchanged-clip resets are splices.
  Pulse reset{0, 6};
  cyclic(&reset, 1, 188, e);
  assert(e[1024] == 36);
  std::puts("PASS: cyclic weighted/duplicate/empty envelopes and independently enumerated splices");
}
