#pragma once
#include <algorithm>
#include <cmath>
#include <cstdint>

namespace ultra::launch {
// Beat-origin rounding matches score compilation. Binary search is bounded by
// 2049 points (256 beats at 1/32), without a callback allocation or period drift.
inline uint64_t distance(unsigned grid, double tempo, uint64_t position,
                         uint64_t length, bool loop, uint64_t begin,
                         uint64_t end) noexcept {
  constexpr double beats[] = {0, .125, .25, .5, 1, 2, 4, 8, 16, 32};
  if (grid >= 10 || !std::isfinite(tempo) || tempo < 30 || tempo > 240)
    return UINT64_MAX;
  if (loop && position >= end) position = begin;
  if (!grid) return 0;
  auto frame = [&](unsigned k) {
    return uint64_t(std::round((beats[grid] * k) * 48000 * 60 / tempo));
  };
  unsigned lo = 0, hi = 2049;
  while (lo < hi) {
    const unsigned mid = (lo + hi) / 2;
    if (frame(mid) < position) lo = mid + 1;
    else hi = mid;
  }
  uint64_t point = lo < 2049 ? frame(lo) : UINT64_MAX;
  if (point >= (loop ? end : length)) point = UINT64_MAX;
  if (loop) point = std::min(point, position <= begin ? begin : end);
  return point == UINT64_MAX ? point : point - position;
}
} // namespace ultra::launch
