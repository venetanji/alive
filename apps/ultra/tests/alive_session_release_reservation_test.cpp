#if __has_include("../src-tauri/native/alive_session_release_reservation.hpp")
#include "../src-tauri/native/alive_session_release_reservation.hpp"
#include <cassert>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <limits>
#include <new>
#include <type_traits>

namespace {
namespace rr = ultra::release_reservation;
bool forbid_allocation = false;
}
void* operator new(std::size_t size) {
 assert(!forbid_allocation);
 if (void* memory = std::malloc(size ? size : 1)) return memory;
 throw std::bad_alloc();
}
void* operator new[](std::size_t size) { return ::operator new(size); }
void operator delete(void* memory) noexcept { assert(!forbid_allocation); std::free(memory); }
void operator delete[](void* memory) noexcept { ::operator delete(memory); }
void operator delete(void* memory, std::size_t) noexcept { ::operator delete(memory); }
void operator delete[](void* memory, std::size_t) noexcept { ::operator delete(memory); }

namespace {
rr::State held(unsigned queued = 0) {
 rr::State state{};
 state.queued = queued; state.held_count = 4;
 state.held = {60, 62, 64, 67}; state.obligation = 4;
 return state;
}
rr::Ledger spent(unsigned frame, unsigned previous = 0, unsigned current = 0) {
 rr::Ledger ledger{}; ledger.current = current;
 ledger.entries[current] = frame;
 ledger.entries[(current + 1023) % 1024] = previous;
 ledger.total = frame + previous;
 return ledger;
}
bool same(const rr::State& left, const rr::State& right) {
 return left.queued == right.queued && left.held_count == right.held_count &&
  left.held == right.held && left.obligation == right.obligation && left.health == right.health;
}
bool same(const rr::Ledger& left, const rr::Ledger& right) {
 return left.current == right.current && left.entries == right.entries &&
  left.total == right.total && left.expired == right.expired;
}
void unchanged(const rr::Projection& result, rr::Error error,
 const rr::State& state, const rr::Ledger& ledger) {
 assert(result.error == error && !result.accepted());
 assert(same(result.state, state) && same(result.ledger, ledger));
 assert(result.appended_count == 0 && result.debit == 0);
}
void records(const rr::Projection& result, const rr::Record* expected, unsigned count) {
 assert(result.accepted() && result.appended_count == count);
 for (unsigned i = 0; i < count; ++i)
  assert(result.appended[i].on == expected[i].on && result.appended[i].pitch == expected[i].pitch);
}
rr::Plan four_on() {
 rr::Plan plan{}; plan.count = 4; plan.debit = 4;
 plan.operations[0] = {rr::Kind::On, 60}; plan.operations[1] = {rr::Kind::On, 62};
 plan.operations[2] = {rr::Kind::On, 64}; plan.operations[3] = {rr::Kind::On, 67};
 return plan;
}
void physical_edges_and_sorted_terminal() {
 const auto ledger = spent(0);
 for (unsigned queued : {13u, 16u}) {
  const auto state = held(queued);
  unchanged(rr::terminal(state, ledger), rr::Error::InvalidState, state, ledger);
 }
 auto one = held(15); one.held_count = 1;
 unchanged(rr::terminal(one, ledger), rr::Error::InvalidState, one, ledger);
 const auto state = held(12);
 auto result = rr::terminal(state, ledger);
 const rr::Record expected[] = {{false,60}, {false,62}, {false,64}, {false,67}};
 records(result, expected, 4);
 assert(result.state.queued == 16 && result.state.held_count == 0 && result.state.obligation == 0);
 assert(result.debit == 4 && result.ledger.entries[0] == 4 && result.ledger.total == 4);
 const auto repeated = rr::terminal(result.state, result.ledger);
 assert(repeated.accepted() && repeated.appended_count == 0 && repeated.debit == 0);
 assert(same(repeated.state, result.state) && same(repeated.ledger, result.ledger));
 // A one-key release still consumes the conservative four-event token.
 one = held(12); one.held_count = 1;
 result = rr::terminal(one, ledger);
 assert(result.accepted() && result.appended_count == 1 && result.state.queued == 13 && result.debit == 4);
}
void ordinary_prefixes_preserve_four_slots() {
 rr::State state{}; state.queued = 8;
 const auto ledger = spent(0);
 auto plan = four_on();
 const auto acquired = rr::project(state, ledger, plan);
 const rr::Record expected[] = {{true,60}, {true,62}, {true,64}, {true,67}};
 records(acquired, expected, 4);
 assert(acquired.state.queued == 12 && acquired.state.obligation == 4);
 plan.count = 8; plan.debit = 8;
 plan.operations[4] = {rr::Kind::Off, 60}; plan.operations[5] = {rr::Kind::Off, 62};
 plan.operations[6] = {rr::Kind::Off, 64}; plan.operations[7] = {rr::Kind::Off, 67};
 // Final Q16/H0 fits, but the first Off creates unprotected Q13/H3.
 const auto result = rr::project(state, ledger, plan);
 unchanged(result, rr::Error::PhysicalReserve, state, ledger);
 assert(result.failed_operation == 4);
 // This is not an exact-held P2 policy: even Q13/H1 is refused.
 state = held(12); state.held_count = 2;
 plan = {}; plan.count = 1; plan.debit = 1; plan.operations[0] = {rr::Kind::Off, 60};
 unchanged(rr::project(state, ledger, plan), rr::Error::PhysicalReserve, state, ledger);
}
void fifth_key_duplicate_and_absent_off() {
 const rr::State state{}; const auto ledger = spent(0);
 rr::Plan plan{}; plan.count = 10; plan.debit = 10;
 for (unsigned i = 0; i < 5; ++i) {
  plan.operations[i] = {rr::Kind::On, 60 + i};
  plan.operations[i + 5] = {rr::Kind::Off, 60 + i};
 }
 const auto fifth = rr::project(state, ledger, plan);
 unchanged(fifth, rr::Error::FifthHeld, state, ledger); assert(fifth.failed_operation == 4);
 plan = {}; plan.count = 2; plan.debit = 2;
 plan.operations[0] = plan.operations[1] = {rr::Kind::On, 60};
 unchanged(rr::project(state, ledger, plan), rr::Error::Duplicate, state, ledger);
 plan = {}; plan.count = 1; plan.operations[0] = {rr::Kind::Off, 60};
 const auto absent = rr::project(state, ledger, plan);
 assert(absent.accepted() && same(absent.state, state) && same(absent.ledger, ledger));
 assert(absent.appended_count == 0 && absent.debit == 0);
}
void whole_batch_precharge_uses_peak_obligation() {
 const rr::State state{};
 rr::Plan plan{}; plan.count = 4; plan.debit = 4;
 plan.operations[0] = {rr::Kind::On, 60}; plan.operations[1] = {rr::Kind::Off, 60};
 plan.operations[2] = {rr::Kind::On, 62}; plan.operations[3] = {rr::Kind::Off, 62};
 for (auto ledger : {spent(28), spent(0, 32)}) {
  if (!ledger.entries[ledger.current]) {
   ledger.entries[(ledger.current + 1022) % 1024] = 28; ledger.total = 60;
  }
  unchanged(rr::project(state, ledger, plan), rr::Error::EventBudget, state, ledger);
 }
 const auto accepted = rr::project(state, spent(24), plan);
 const rr::Record expected[] = {{true,60}, {false,60}, {true,62}, {false,62}};
 records(accepted, expected, 4);
 assert(accepted.state.held_count == 0 && accepted.state.obligation == 0);
 assert(accepted.peak_obligation == 4 && accepted.ledger.entries[0] == 28 && accepted.debit == 4);
}
void terminal_converts_once_at_global_boundary() {
 const auto state = held(); const auto ledger = spent(28, 32);
 const auto result = rr::terminal(state, ledger);
 assert(result.accepted() && result.ledger.entries[0] == 32 && result.ledger.total == 64);
 assert(result.state.queued == 4 && result.state.obligation == 0 && result.debit == 4);
 const auto repeated = rr::terminal(result.state, result.ledger);
 assert(repeated.accepted() && repeated.debit == 0 && same(repeated.ledger, result.ledger));
 const auto invalid = spent(29, 32);
 unchanged(rr::terminal(state, invalid), rr::Error::InvalidState, state, invalid);
 const auto invalid_frame = spent(29);
 unchanged(rr::terminal(state, invalid_frame), rr::Error::InvalidState, state, invalid_frame);
 // Window invalidity is distinct from a valid state's guaranteed conversion.
 const auto invalid_window = spent(1, 32);
 auto wide = invalid_window; wide.entries[1022] = 28; wide.total = 61;
 unchanged(rr::terminal(state, wide), rr::Error::InvalidState, state, wide);
 unchanged(rr::project(result.state, result.ledger, four_on()),
  rr::Error::EventBudget, result.state, result.ledger);
}
void stop_restart_fault_generations_and_prior_queue() {
 for (unsigned queued : {0u, 4u}) {
  const auto initial = held(queued);
  const auto stopped = rr::terminal(initial, spent(20, 32));
  assert(stopped.accepted() && stopped.state.queued == queued + 4 && stopped.ledger.total == 56);
  const auto restart = rr::project(stopped.state, stopped.ledger, four_on());
  assert(restart.accepted() && restart.state.queued == queued + 8);
  assert(restart.state.obligation == 4 && restart.ledger.entries[0] == 28 && restart.ledger.total == 60);
  const auto fault = rr::terminal(restart.state, restart.ledger);
  assert(fault.accepted() && fault.state.queued == queued + 12 && fault.state.held_count == 0);
  assert(fault.ledger.entries[0] == 32 && fault.ledger.total == 64 && fault.state.obligation == 0);
  const auto repeated = rr::terminal(fault.state, fault.ledger);
  assert(repeated.accepted() && repeated.debit == 0 && repeated.appended_count == 0);
 }
 const auto stopped = rr::terminal(held(), spent(24));
 unchanged(rr::project(stopped.state, stopped.ledger, four_on()),
  rr::Error::EventBudget, stopped.state, stopped.ledger);
 // Prior queued records also survive a budget-safe Stop/restart boundary.
 const auto crowded = rr::terminal(held(8), spent(0));
 unchanged(rr::project(crowded.state, crowded.ledger, four_on()),
  rr::Error::PhysicalReserve, crowded.state, crowded.ledger);
}
void scheduled_release_is_not_debited_twice() {
 rr::Plan plan{}; plan.count = 1; plan.debit = 4;
 plan.operations[0] = {rr::Kind::Release, 0};
 const auto result = rr::project(held(), spent(20), plan);
 assert(result.accepted() && result.debit == 4 && result.ledger.entries[0] == 24);
 assert(result.state.held_count == 0 && result.state.obligation == 0 && result.state.queued == 4);
 assert(result.peak_obligation == 4);
 // The batch still needs headroom while its scheduled release is interruptible.
 unchanged(rr::project(held(), spent(28), plan), rr::Error::EventBudget, held(), spent(28));
 // A scheduled release followed by a fresh generation reacquires protection.
 plan.count = 2; plan.debit = 5; plan.operations[1] = {rr::Kind::On, 70};
 const auto restarted = rr::project(held(), spent(20), plan);
 const rr::Record expected[] = {{false,60}, {false,62}, {false,64}, {false,67}, {true,70}};
 records(restarted, expected, 5);
 assert(restarted.state.obligation == 4 && restarted.state.held_count == 1);
 assert(restarted.ledger.entries[0] == 25 && restarted.debit == 5);
}
void other_event_producers_share_the_same_reservation() {
 const auto state = held();
 rr::Plan built_in{}; built_in.debit = 4;
 auto accepted = rr::project(state, spent(24), built_in);
 assert(accepted.accepted() && accepted.state.obligation == 4 && accepted.ledger.entries[0] == 28);
 built_in.debit = 1;
 unchanged(rr::project(accepted.state, accepted.ledger, built_in),
  rr::Error::EventBudget, accepted.state, accepted.ledger);
 // A rolling-window shortage can reject built-in work with an empty frame.
 auto ledger = spent(0, 32); ledger.entries[1022] = 28; ledger.total = 60;
 unchanged(rr::project(state, ledger, built_in), rr::Error::EventBudget, state, ledger);
}
void render_success_and_retirement_have_different_meanings() {
 const auto input = held(4);
 const auto rendered = rr::finish_render(input, rr::RenderObservation::Success);
 assert(rendered.outcome == rr::RenderOutcome::Rendered && rendered.delivered_records == 4);
 assert(rendered.state.queued == 0 && rendered.state.held_count == 4 && rendered.state.obligation == 4);
 assert(rendered.state.health == rr::Health::Healthy);
 const auto release = rr::terminal(rendered.state, spent(4));
 const rr::Record expected[] = {{false,60}, {false,62}, {false,64}, {false,67}};
 records(release, expected, 4);
 const auto delivered = rr::finish_render(release.state, rr::RenderObservation::Success);
 assert(delivered.outcome == rr::RenderOutcome::Rendered && delivered.delivered_records == 4);
 assert(delivered.state.queued == 0 && delivered.state.held_count == 0 && delivered.state.obligation == 0);
 const auto empty = rr::finish_render(delivered.state, rr::RenderObservation::Success);
 assert(empty.delivered_records == 0);
 for (auto observation : {rr::RenderObservation::Failed, rr::RenderObservation::Disarmed}) {
  const auto failed = rr::finish_render(release.state, observation);
  assert(failed.outcome == rr::RenderOutcome::Quarantined && failed.delivered_records == 0);
  auto expected_state = release.state; expected_state.health = rr::Health::Quarantined;
  assert(same(failed.state, expected_state));
  unchanged(rr::terminal(failed.state, release.ledger), rr::Error::Unhealthy, failed.state, release.ledger);
  unchanged(rr::project(failed.state, release.ledger, four_on()),
   rr::Error::Unhealthy, failed.state, release.ledger);
  const auto retried = rr::finish_render(failed.state, rr::RenderObservation::Success);
  assert(retried.outcome == rr::RenderOutcome::Quarantined && retried.delivered_records == 0);
  assert(same(retried.state, failed.state));
 }
}
void stopped_calls_do_not_advance_time_or_clear_pending_records() {
 auto stopped = rr::terminal(held(), spent(20, 32));
 const auto original_state = stopped.state; const auto original_ledger = stopped.ledger;
 for (unsigned command = 0; command < 64; ++command) {
  stopped = rr::terminal(stopped.state, stopped.ledger);
  assert(stopped.accepted() && same(stopped.state, original_state) && same(stopped.ledger, original_ledger));
 }
 // Only explicit sample advance expires history; it does not touch native Q.
 const auto advanced = rr::advance(stopped.ledger);
 assert(advanced.error == rr::Error::None && advanced.ledger.current == 1);
 assert(stopped.state.queued == 4 && same(stopped.state, original_state));
}

// Independent chronological frame oracle. It names old frames directly, with
// no ring removal or arithmetic helper from the implementation under test.
struct OldDebit { unsigned expiration_cut; unsigned debit; };
uint64_t oracle_cut(unsigned cut, unsigned current, unsigned expired,
 const OldDebit* old, unsigned count, uint64_t future, unsigned reservation) {
 uint64_t sum = cut ? current + future : expired;
 for (unsigned i = 0; i < count; ++i)
  if (!cut || old[i].expiration_cut >= cut) sum += old[i].debit;
 return sum + reservation;
}
void every_ring_index_and_expiration_boundary() {
 const auto state = held();
 for (unsigned index = 0; index < 1024; ++index) {
  rr::Ledger ledger{}; ledger.current = index;
  ledger.entries[index] = 4;
  ledger.entries[(index + 513) % 1024] = 32;
  ledger.entries[(index + 800) % 1024] = 24;
  ledger.total = 60; ledger.expired = 4;
  const OldDebit old[] = {{513,32}, {800,24}};
  for (unsigned start : {512u, 513u, 514u}) {
   rr::Future future{}; future.obligation = 4;
   for (unsigned cut = start; cut <= 1024; ++cut) future.debit[cut] = 5;
   unsigned rejected_at = 1025;
   for (unsigned cut = 0; cut <= 1024; ++cut) {
    const uint64_t expected = oracle_cut(cut, 4, 4, old, 2, cut >= start ? 5 : 0, 4);
    if (expected > 64) { rejected_at = cut; break; }
   }
   assert(rejected_at == (start == 514 ? 1025 : start));
   const auto result = rr::horizon(state, ledger, future);
   assert(result.error == (start == 514 ? rr::Error::None : rr::Error::EventBudget));
   assert(result.failed_cut == rejected_at);
   assert(ledger.current == index && ledger.total == 60 && ledger.expired == 4);
  }
  // This explicit old debit is two advances from expiration. Exercise the
  // before/at/after boundary at every current ring index.
  rr::Ledger advancing{}; advancing.current = index;
  advancing.entries[(index + 2) % 1024] = advancing.total = 28;
  for (unsigned frame = 1; frame <= 3; ++frame) {
   const auto next = rr::advance(advancing); assert(next.error == rr::Error::None);
   advancing = next.ledger;
   assert(advancing.total == (frame < 2 ? 28u : 0u));
   assert(advancing.expired == (frame == 2 ? 28u : 0u));
  }
 }
 // A current debit remains retained for a complete 1024-frame revolution.
 auto advancing = spent(28);
 for (unsigned frame = 1; frame <= 1025; ++frame) {
  const auto next = rr::advance(advancing); assert(next.error == rr::Error::None);
  advancing = next.ledger;
  assert(advancing.total == (frame < 1024 ? 28u : 0u));
  assert(advancing.expired == (frame == 1024 ? 28u : 0u));
 }
}
void horizon_retains_current_and_stopped_first_debit() {
 const auto state = held();
 auto ledger = spent(4, 32); ledger.entries[1022] = 24; ledger.total = 60;
 rr::Future future{}; future.obligation = 4;
 for (unsigned cut = 1; cut <= 1024; ++cut) future.debit[cut] = 1;
 const auto rejected = rr::horizon(state, ledger, future);
 assert(rejected.error == rr::Error::EventBudget && rejected.failed_cut == 1);
 // At j=0 there is no pending first debit or future-only obligation.
 ledger = spent(4, 32); ledger.entries[1022] = 24; ledger.total = 60; ledger.expired = 4;
 rr::State empty{}; future = {}; future.obligation = 4;
 for (unsigned cut = 1; cut <= 1024; ++cut) future.debit[cut] = 1;
 const auto at_zero = rr::horizon(empty, ledger, future);
 assert(at_zero.error == rr::Error::EventBudget && at_zero.failed_cut == 1);
 // The old expired amount does participate at j=0, even though it is no
 // longer in the current total. A later render/Stop cannot erase that cut.
 ledger.expired = 5; // Past61 needs the existing reservation4 at j=0.
 future = {};
 const auto expired = rr::horizon(state, ledger, future);
 assert(expired.error == rr::Error::EventBudget && expired.failed_cut == 0);
 // A stopped candidate's first release still counts at every positive cut.
 ledger = spent(0, 32); ledger.entries[1022] = 28; ledger.total = 60;
 future = {}; for (unsigned cut = 1; cut <= 1024; ++cut) future.debit[cut] = 5;
 const auto stopped = rr::horizon(empty, ledger, future);
 assert(stopped.error == rr::Error::EventBudget && stopped.failed_cut == 1);
}
void horizon_requires_independent_tail_frame_admission() {
 rr::State state{}; state.held_count = 1; state.held[0] = 60; state.obligation = 4;
 const rr::Ledger empty_history{};
 rr::Future future{}; future.obligation = 4;
 for (unsigned cut = 100; cut <= 1024; ++cut) future.debit[cut] = 29;
 // Rolling29+reserve4 fits64, and the first frame has no debit. This
 // horizon result does not certify the later frame or its prefixes.
 const auto rolling = rr::horizon(state, empty_history, future);
 assert(rolling.error == rr::Error::None && rolling.failed_cut == 1025);
 rr::Ledger later_frame{}; later_frame.current = 100;
 rr::Plan later{}; later.debit = 29;
 // Independent admission must refuse later-frame29+reserve4>32.
 unchanged(rr::project(state, later_frame, later), rr::Error::EventBudget, state, later_frame);
}
void zero_obligation_preserves_legacy_scalar_results() {
 const rr::State state{};
 for (unsigned index : {0u, 1u, 511u, 1023u})
  for (unsigned current : {0u, 20u, 32u})
   for (unsigned previous : {0u, 20u, 32u})
    for (unsigned debit : {0u, 1u, 4u, 32u, 64u}) {
     const auto ledger = spent(current, previous, index);
     rr::Plan plan{}; plan.debit = debit;
     const auto result = rr::project(state, ledger, plan);
     const bool legacy = current + debit <= 32 && current + previous + debit <= 64;
     assert(result.accepted() == legacy);
     if (legacy) {
      assert(result.state.obligation == 0 && same(result.state, state));
      assert(result.ledger.entries[index] == current + debit && result.ledger.total == current + previous + debit);
     } else unchanged(result, rr::Error::EventBudget, state, ledger);
     rr::Future future{};
     for (unsigned cut = 1; cut <= 1024; ++cut) future.debit[cut] = debit;
     const OldDebit old[] = {{1023,previous}};
     bool horizon_legacy = current + debit <= 32;
     for (unsigned cut = 0; cut <= 1024; ++cut)
      if (oracle_cut(cut, current, 0, old, 1, debit, 0) > 64) horizon_legacy = false;
     assert((rr::horizon(state, ledger, future).error == rr::Error::None) == horizon_legacy);
    }
}
void malformed_inputs_overflow_and_failed_projection_atomicity() {
 const auto ledger = spent(0); const rr::State empty{};
 auto state = held(); state.held = {60, 60, 64, 67};
 unchanged(rr::terminal(state, ledger), rr::Error::InvalidState, state, ledger);
 state = held(); state.held[3] = 128;
 unchanged(rr::terminal(state, ledger), rr::Error::InvalidState, state, ledger);
 state = held(); state.held_count = 5;
 unchanged(rr::terminal(state, ledger), rr::Error::InvalidState, state, ledger);
 state = held(); state.obligation = 0;
 unchanged(rr::terminal(state, ledger), rr::Error::InvalidState, state, ledger);
 state = {}; state.obligation = 4;
 unchanged(rr::terminal(state, ledger), rr::Error::InvalidState, state, ledger);
 state = {}; state.queued = 17;
 unchanged(rr::terminal(state, ledger), rr::Error::InvalidState, state, ledger);
 state = {}; state.health = static_cast<rr::Health>(255);
 unchanged(rr::terminal(state, ledger), rr::Error::InvalidState, state, ledger);
 state = {}; state.health = rr::Health::Quarantined;
 unchanged(rr::terminal(state, ledger), rr::Error::Unhealthy, state, ledger);
 for (unsigned malformed = 0; malformed < 5; ++malformed) {
  auto bad = ledger;
  if (malformed == 0) bad.current = 1024;
  if (malformed == 1) bad.entries[0] = 1;
  if (malformed == 2) { bad.entries[0] = 33; bad.total = 33; }
  if (malformed == 3) bad.total = std::numeric_limits<uint64_t>::max();
  if (malformed == 4) bad.expired = 33;
  unchanged(rr::project(empty, bad, {}), rr::Error::InvalidLedger, empty, bad);
  const auto advanced = rr::advance(bad);
  assert(advanced.error == rr::Error::InvalidLedger && same(advanced.ledger, bad));
 }
 rr::Plan plan{}; plan.count = 33;
 unchanged(rr::project(empty, ledger, plan), rr::Error::InvalidPlan, empty, ledger);
 plan = {}; plan.count = 1; plan.debit = 1; plan.operations[0] = {rr::Kind::On, 128};
 unchanged(rr::project(empty, ledger, plan), rr::Error::InvalidPlan, empty, ledger);
 plan.operations[0] = {static_cast<rr::Kind>(255), 60};
 unchanged(rr::project(empty, ledger, plan), rr::Error::InvalidPlan, empty, ledger);
 plan = four_on(); plan.debit = 3;
 unchanged(rr::project(empty, ledger, plan), rr::Error::InvalidPlan, empty, ledger);
 plan = {}; plan.debit = std::numeric_limits<uint64_t>::max();
 unchanged(rr::project(empty, spent(1), plan), rr::Error::Overflow, empty, spent(1));
 unchanged(rr::project(held(), ledger, plan), rr::Error::Overflow, held(), ledger);
 rr::Future future{}; future.debit[0] = 1;
 assert(rr::horizon(empty, ledger, future).error == rr::Error::InvalidPlan);
 future = {}; future.obligation = 1;
 assert(rr::horizon(empty, ledger, future).error == rr::Error::InvalidPlan);
 future = {}; future.debit[1] = 1;
 assert(rr::horizon(empty, ledger, future).error == rr::Error::InvalidPlan);
 future = {}; for (unsigned cut = 1; cut <= 1024; ++cut) future.debit[cut] = std::numeric_limits<uint64_t>::max();
 assert(rr::horizon(empty, spent(1), future).error == rr::Error::Overflow);
 const auto invalid_render = rr::finish_render(held(13), rr::RenderObservation::Success);
 assert(invalid_render.outcome == rr::RenderOutcome::InvalidState && invalid_render.delivered_records == 0);
 assert(same(invalid_render.state, held(13)));
}
void bounded_no_allocation_and_literal_operation_records() {
 static_assert(std::is_trivially_copyable_v<rr::State> && std::is_trivially_copyable_v<rr::Ledger>);
 static_assert(noexcept(rr::project(rr::State{}, rr::Ledger{}, rr::Plan{})));
 static_assert(noexcept(rr::terminal(rr::State{}, rr::Ledger{})));
 static_assert(noexcept(rr::finish_render(rr::State{}, rr::RenderObservation::Success)));
 static_assert(noexcept(rr::advance(rr::Ledger{})));
 static_assert(noexcept(rr::horizon(rr::State{}, rr::Ledger{}, rr::Future{})));
 rr::Plan plan{}; plan.count = 8; plan.debit = 8;
 plan.operations[0] = {rr::Kind::On, 67}; plan.operations[1] = {rr::Kind::On, 60};
 plan.operations[2] = {rr::Kind::On, 64}; plan.operations[3] = {rr::Kind::On, 62};
 plan.operations[4] = {rr::Kind::Release, 0}; plan.operations[5] = {rr::Kind::Off, 80};
 plan.operations[6] = {rr::Kind::Off, 81}; plan.operations[7] = {rr::Kind::Off, 82};
 const rr::Record expected[] = {{true,67}, {true,60}, {true,64}, {true,62},
  {false,60}, {false,62}, {false,64}, {false,67}};
 forbid_allocation = true;
 const auto result = rr::project({}, {}, plan);
 records(result, expected, 8);
 assert(result.state.queued == 8 && result.state.held_count == 0 && result.state.obligation == 0);
 assert(result.debit == 8 && result.ledger.total == 8);
 const auto repeated = rr::terminal(result.state, result.ledger);
 assert(repeated.accepted() && repeated.debit == 0);
 assert(rr::finish_render(result.state, rr::RenderObservation::Success).delivered_records == 8);
 assert(rr::advance(result.ledger).error == rr::Error::None);
 assert(rr::horizon(result.state, result.ledger, {}).error == rr::Error::None);
 forbid_allocation = false;
}
}

int main(int argc, char** argv) {
 struct Test { const char* name; void (*run)(); };
 const Test tests[] = {
  {"physical", physical_edges_and_sorted_terminal},
  {"prefix", ordinary_prefixes_preserve_four_slots},
  {"notes", fifth_key_duplicate_and_absent_off},
  {"precharge", whole_batch_precharge_uses_peak_obligation},
  {"terminal", terminal_converts_once_at_global_boundary},
  {"generations", stop_restart_fault_generations_and_prior_queue},
  {"scheduled", scheduled_release_is_not_debited_twice},
  {"producers", other_event_producers_share_the_same_reservation},
  {"delivery", render_success_and_retirement_have_different_meanings},
  {"stopped", stopped_calls_do_not_advance_time_or_clear_pending_records},
  {"ring", every_ring_index_and_expiration_boundary},
  {"horizon", horizon_retains_current_and_stopped_first_debit},
  {"tail-composition", horizon_requires_independent_tail_frame_admission},
  {"zero", zero_obligation_preserves_legacy_scalar_results},
  {"malformed", malformed_inputs_overflow_and_failed_projection_atomicity},
  {"bounded", bounded_no_allocation_and_literal_operation_records},
 };
 unsigned ran = 0;
 for (const auto& test : tests) if (argc == 1 || std::strcmp(argv[1], test.name) == 0) {
  test.run(); ++ran; std::printf("PASS: %s release reservation\n", test.name);
 }
 assert(ran);
}
#else
#include <cstdio>
int main() {
 std::fputs("FAIL: C1 bounded release reservation model is absent (missing new feature, not an existing planner failure)\n", stderr);
 return 1;
}
#endif
