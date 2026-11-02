#pragma once
#include <array>
#include <cstdint>
#include <limits>

// Pure C1 model only. No production caller, native identity or work-budget grant.
namespace ultra::release_reservation {
constexpr unsigned Window = 1024, Queue = 16, Held = 4, Operations = 32;
enum class Health { Healthy, Quarantined };
enum class Error {
 None, InvalidState, InvalidLedger, Unhealthy, InvalidPlan,
 Duplicate, FifthHeld, PhysicalReserve, EventBudget, Overflow
};
enum class Kind { On, Off, Release };
struct State {
 unsigned queued = 0, held_count = 0;
 std::array<unsigned, Held> held{};
 unsigned obligation = 0;
 Health health = Health::Healthy;
};
struct Ledger {
 std::array<uint64_t, Window> entries{};
 unsigned current = 0;
 uint64_t total = 0, expired = 0;
};
struct Operation { Kind kind = Kind::Off; unsigned pitch = 0; };
struct Plan {
 std::array<Operation, Operations> operations{};
 unsigned count = 0;
 uint64_t debit = 0;
};
struct Record { bool on = false; unsigned pitch = 0; };
struct Projection {
 State state{};
 Ledger ledger{};
 std::array<Record, Queue> appended{};
 unsigned appended_count = 0;
 uint64_t debit = 0;
 unsigned peak_obligation = 0, failed_operation = Operations;
 Error error = Error::None;
 bool accepted() const noexcept { return error == Error::None; }
};
struct Future {
 // Complete cumulative first+tail debit, including stopped-candidate work.
 // Requires independently certified tail per-frame and interruptible-prefix
 // admission, including the outstanding reserve. Differences between these
 // cumulative bounds are not a per-frame or prefix certificate.
 std::array<uint64_t, Window + 1> debit{};
 // Conservative upper bound at every positive cut, zero or four.
 unsigned obligation = 0;
};
struct HorizonResult { Error error = Error::None; unsigned failed_cut = Window + 1; };
struct AdvanceResult { Ledger ledger{}; Error error = Error::None; };
enum class RenderObservation { Success, Failed, Disarmed };
enum class RenderOutcome { Rendered, Quarantined, InvalidState };
struct RenderResult {
 State state{};
 RenderOutcome outcome = RenderOutcome::InvalidState;
 unsigned delivered_records = 0;
};

namespace detail {
inline bool add(uint64_t a, uint64_t b, uint64_t& sum) noexcept {
 if (b > std::numeric_limits<uint64_t>::max() - a) return false;
 sum = a + b; return true;
}
inline bool valid(const State& state) noexcept {
 if (state.queued > Queue || state.held_count > Held ||
     state.obligation != (state.held_count ? Held : 0) ||
     (state.health != Health::Healthy && state.health != Health::Quarantined)) return false;
 for (unsigned i = 0; i < state.held_count; ++i)
  if (state.held[i] > 127 || (i && state.held[i - 1] >= state.held[i])) return false;
 return state.queued <= Queue - state.obligation;
}
inline bool valid(const Ledger& ledger) noexcept {
 if (ledger.current >= Window || ledger.total > 64 || ledger.expired > 32) return false;
 uint64_t sum = 0;
 for (uint64_t debit : ledger.entries)
  if (debit > 32 || !add(sum, debit, sum)) return false;
 return sum == ledger.total;
}
inline Error fits(const Ledger& ledger, uint64_t debit, unsigned reservation) noexcept {
 uint64_t frame = 0, window = 0;
 if (!add(ledger.entries[ledger.current], debit, frame) || !add(frame, reservation, frame) ||
     !add(ledger.total, debit, window) || !add(window, reservation, window)) return Error::Overflow;
 return frame <= 32 && window <= 64 ? Error::None : Error::EventBudget;
}
inline Error initial(const State& state, const Ledger& ledger) noexcept {
 if (!valid(state)) return Error::InvalidState;
 if (!valid(ledger)) return Error::InvalidLedger;
 if (state.health != Health::Healthy) return Error::Unhealthy;
 return fits(ledger, 0, state.obligation) == Error::None ? Error::None : Error::InvalidState;
}
inline void charge(Ledger& ledger, uint64_t debit) noexcept {
 // Callers already checked both additions, including the outstanding reserve.
 ledger.entries[ledger.current] += debit; ledger.total += debit;
}
} // namespace detail

inline Projection project(const State& state, const Ledger& ledger, const Plan& plan) noexcept {
 Projection result{}; result.state = state; result.ledger = ledger;
 result.error = detail::initial(state, ledger);
 if (!result.accepted()) return result;
 if (plan.count > Operations) { result.error = Error::InvalidPlan; return result; }
 for (unsigned i = 0; i < plan.count; ++i) {
  const auto& operation = plan.operations[i];
  if ((operation.kind != Kind::On && operation.kind != Kind::Off && operation.kind != Kind::Release) ||
      operation.pitch > 127) {
   result.error = Error::InvalidPlan; result.failed_operation = i; return result;
  }
 }
 State next = state;
 std::array<Record, Queue> records{};
 unsigned count = 0, peak = state.obligation;
 for (unsigned i = 0; i < plan.count; ++i) {
  const auto& operation = plan.operations[i];
  unsigned at = 0;
  while (at < next.held_count && next.held[at] < operation.pitch) ++at;
  const bool present = at < next.held_count && next.held[at] == operation.pitch;
  auto refused = [&](Error error) {
   result.error = error; result.failed_operation = i; return result;
  };
  if (operation.kind == Kind::Release) {
   if (next.held_count > Queue - next.queued) return refused(Error::PhysicalReserve);
   for (unsigned n = 0; n < next.held_count; ++n) records[count++] = {false, next.held[n]};
   next.queued += next.held_count; next.held_count = 0;
  } else if (operation.kind == Kind::On || present) {
   if (operation.kind == Kind::On && present) return refused(Error::Duplicate);
   if (operation.kind == Kind::On && next.held_count == Held) return refused(Error::FifthHeld);
   if (next.queued == Queue) return refused(Error::PhysicalReserve);
   if (operation.kind == Kind::On) {
    for (unsigned n = next.held_count; n > at; --n) next.held[n] = next.held[n - 1];
    next.held[at] = operation.pitch; ++next.held_count;
   } else {
    for (unsigned n = at + 1; n < next.held_count; ++n) next.held[n - 1] = next.held[n];
    --next.held_count;
   }
   records[count++] = {operation.kind == Kind::On, operation.pitch}; ++next.queued;
  }
  next.obligation = next.held_count ? Held : 0;
  if (next.queued > Queue - next.obligation) return refused(Error::PhysicalReserve);
  if (next.obligation > peak) peak = next.obligation;
 }
 if (plan.debit < count) { result.error = Error::InvalidPlan; return result; }
 // Precharge covers a fault after any prefix, including batches ending H=0.
 result.error = detail::fits(ledger, plan.debit, peak);
 if (!result.accepted()) return result;
 result.state = next; result.appended = records; result.appended_count = count;
 result.debit = plan.debit; result.peak_obligation = peak;
 detail::charge(result.ledger, plan.debit);
 return result;
}

inline Projection terminal(const State& state, const Ledger& ledger) noexcept {
 Projection result{}; result.state = state; result.ledger = ledger;
 result.error = detail::initial(state, ledger);
 if (!result.accepted() || !state.held_count) return result;
 // Atomic token conversion: reservation four becomes debit four once. The
 // physical ascending Off append may contain fewer than four records.
 result.debit = state.obligation; result.peak_obligation = state.obligation;
 for (unsigned i = 0; i < state.held_count; ++i) result.appended[i] = {false, state.held[i]};
 result.appended_count = state.held_count;
 result.state.queued += state.held_count; result.state.held_count = 0; result.state.obligation = 0;
 detail::charge(result.ledger, result.debit);
 return result;
}

inline RenderResult finish_render(const State& state, RenderObservation observation) noexcept {
 RenderResult result{}; result.state = state;
 if (!detail::valid(state) || (observation != RenderObservation::Success &&
     observation != RenderObservation::Failed && observation != RenderObservation::Disarmed)) return result;
 if (state.health == Health::Quarantined || observation != RenderObservation::Success) {
  result.state.health = Health::Quarantined; result.outcome = RenderOutcome::Quarantined;
  return result;
 }
 result.outcome = RenderOutcome::Rendered; result.delivered_records = state.queued; result.state.queued = 0;
 return result;
}

inline AdvanceResult advance(const Ledger& ledger) noexcept {
 AdvanceResult result{}; result.ledger = ledger;
 if (!detail::valid(ledger)) { result.error = Error::InvalidLedger; return result; }
 result.ledger.current = (ledger.current + 1) % Window;
 auto& old = result.ledger.entries[result.ledger.current];
 result.ledger.expired = old; result.ledger.total -= old; old = 0;
 return result;
}

// Proves first-frame and rolling-window checks only. Tail per-frame and
// interruptible-prefix admission, including the outstanding reserve, must be
// independently certified; cumulative-bound differences do not certify them.
inline HorizonResult horizon(const State& state, const Ledger& ledger, const Future& future) noexcept {
 HorizonResult result{}; result.error = detail::initial(state, ledger);
 if (result.error != Error::None) return result;
 if (future.debit[0] || (future.obligation != 0 && future.obligation != Held)) {
  result.error = Error::InvalidPlan; return result;
 }
 for (unsigned j = 1; j <= Window; ++j)
  if (future.debit[j] < future.debit[j - 1]) { result.error = Error::InvalidPlan; return result; }
 const unsigned reserve = state.obligation > future.obligation ? state.obligation : future.obligation;
 uint64_t frame = 0;
 if (!detail::add(ledger.entries[ledger.current], future.debit[1], frame) ||
     !detail::add(frame, reserve, frame)) return {Error::Overflow, 1};
 if (frame > 32) return {Error::EventBudget, 1};
 uint64_t past = 0;
 if (!detail::add(ledger.total, ledger.expired, past)) return {Error::Overflow, 0};
 past -= ledger.entries[ledger.current];
 // Model-only scalar sweep. Its validation/sweep cost is not paid for by
 // any existing callback work bound; production integration needs a proof.
 for (unsigned j = 0; j <= Window; ++j) {
  uint64_t sum = past;
  if (j && (!detail::add(sum, ledger.entries[ledger.current], sum) ||
            !detail::add(sum, future.debit[j], sum))) return {Error::Overflow, j};
  if (!detail::add(sum, j ? reserve : state.obligation, sum)) return {Error::Overflow, j};
  if (sum > 64) return {Error::EventBudget, j};
  if (!j) past -= ledger.expired;
  else if (j < Window) past -= ledger.entries[(ledger.current + j) % Window];
 }
 return result;
}
} // namespace ultra::release_reservation
