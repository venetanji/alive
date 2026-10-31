#pragma once
#include "alive_session.h"
#include "alive_session_envelope.hpp"

namespace ultra::clip_admission {
using Cost = std::array<uint64_t, 5>; // events, root clears, scans, writes, guard steps
constexpr uint64_t HorizonSteps = 9 * (Window + 1) + 27;
inline Cost cost(const AliveSessionWorkV3 &w) noexcept {
  return {0, w.root_clears, w.event_scans, w.parameter_writes, w.guard_steps};
}
inline Cost add(Cost a, const Cost &b) noexcept {
  for (unsigned m = 0; m < 5; ++m)
    a[m] += b[m];
  return a;
}
inline void subtract(Cost &a, const Cost &b) noexcept {
  for (unsigned m = 0; m < 5; ++m)
    a[m] -= b[m];
}
inline AliveSessionLimitsV3 policy(unsigned profile) noexcept {
  AliveSessionLimitsV3 out{};
  out.version = 3;
  out.struct_bytes = sizeof out;
  out.profile = profile;
  out.work_policy = 1;
  out.max_tracks = profile == 1 ? 2 : 8;
  out.max_devices = profile == 1 ? 6 : 16;
  out.max_clips = profile == 1 ? 8 : 32;
  out.max_events = 1024;
  out.max_frame_events = 32;
  out.max_window_events = 64;
  out.window_frames = 1024;
  out.max_commands = 64;
  out.max_receipts = 128;
  if (profile == 1) {
    // Measured policy 1: see alive_session_v3_policy.md for graph bounds,
    // derivation, actual-kernel distributions and practical buffer scope.
    out.features = ALIVE_SESSION_V3_FEATURE_ADMITTED;
    out.scheduled_frame = {18, 3072, 608, 0};
    out.scheduled_window = {108, 18432, 3520, 0};
    out.optional_frame = {6, 1024, 192, HorizonSteps};
    out.optional_window = out.optional_frame;
    out.emergency = {12, 0, 192, 0};
  }
  // Internal experimental proposal only; shipping sources remain unmodified.
  if (profile == 2) {
    out.work_policy = 2;
    out.features = ALIVE_SESSION_V3_FEATURE_ADMITTED;
    out.scheduled_frame = {48, 3072, 1568, 0};
    out.scheduled_window = {288, 18432, 9280, 0};
    out.optional_frame = {16, 1024, 512, HorizonSteps};
    out.optional_window = out.optional_frame;
    out.emergency = {32, 0, 512, 0};
  }
  return out;
}
struct Prepared {
  std::array<Envelope, 5> future{};
  std::array<Cost, 8> reset{};
  std::array<uint64_t, 65> bars{};
  unsigned bar_count = 0;
};
struct Ledger {
  std::array<Cost, Window> entries{};
  Cost total{}, expired{};
  void expire(uint64_t frame) noexcept {
    auto &slot = entries[frame % Window];
    expired = slot;
    subtract(total, slot);
    slot = {};
  }
  void charge(uint64_t frame, const Cost &amount) noexcept {
    auto &slot = entries[frame % Window];
    slot = add(slot, amount);
    total = add(total, amount);
  }
};
} // namespace ultra::clip_admission
