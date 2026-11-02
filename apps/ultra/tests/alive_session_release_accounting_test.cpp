#include "../src-tauri/native/alive_session.hpp"
#include "saved_graphs.hpp"
#include <cassert>
#include <cstdio>
#include <cstring>
#include <memory>

namespace {
using Session = ultra::AliveSession;
using Cost = ultra::clip_admission::Cost;
// Test-only access follows the authority tests; production has no policy setter.
template<class Tag, auto Member> struct Access {
 friend auto access(Tag) { return Member; }
};
#define MEMBER_TAG(Name, member) \
 struct Name { friend auto access(Name); }; \
 template struct Access<Name, &Session::member>
MEMBER_TAG(State, state_);
MEMBER_TAG(Scheduled, scheduled_);
MEMBER_TAG(Optional, optional_);
MEMBER_TAG(OptionalClear, optional_clear_);
MEMBER_TAG(Proof, midi_proof);
MEMBER_TAG(Candidate, candidate_);
MEMBER_TAG(Transition, transition_v4_);
MEMBER_TAG(First, first_candidate_cost);
MEMBER_TAG(Admit, optional_admission);
#undef MEMBER_TAG

std::array<Cost, 4> traced{};
unsigned dispatches = 0;
void charge(unsigned family, const Cost& cost) noexcept {
 traced[family] = ultra::clip_admission::add(traced[family], cost);
}
void dispatch(uint64_t, unsigned, unsigned, const AliveSessionEventV2&) noexcept {
 ++dispatches;
}
struct Fixture {
 std::unique_ptr<Session> owner = std::make_unique<Session>();
 std::unique_ptr<ultra::CanvasWorkspace> workspace = std::make_unique<ultra::CanvasWorkspace>();
 Fixture(unsigned tracks = 1, bool notes = false) {
  auto c = std::make_unique<AliveSessionConfigV4>();
  c->version = 4; c->struct_bytes = sizeof(*c); c->profile = c->work_policy = 1;
  c->preparation_revision = 1; c->track_count = c->device_count = tracks;
  c->source_count = c->placement_count = tracks;
  c->length_frames = 8192; c->loop_enabled = 1; c->loop_end = 4096;
  c->loop_start = notes ? 1000 : 0; c->tempo_bpm = 120;
  auto emit = [](alive::Event) noexcept { return true; };
  for (unsigned t = 0; t < tracks; ++t) {
   UltraCanvasGraph graph{}; saved_0(graph, c->devices[t]);
   graph.revision = c->devices[t].revision = 1; c->devices[t].document = t;
   ultra::CanvasPlan plan{}; assert(ultra::compile_canvas(graph, plan));
   assert(workspace->install(t, plan, 0, emit));
   auto& tr = c->tracks[t]; tr.kind = 1; tr.instrument = t; tr.gain = 1;
   std::fill_n(tr.slots, 4, ALIVE_SESSION_V4_NONE);
   tr.placement_begin = t; tr.placement_count = 1;
   auto& source = c->sources[t]; source.kind = 1; source.track = t;
   source.audio_buffer = ALIVE_SESSION_V4_NONE; source.length_frames = 4096;
   c->placements[t] = {t, t, 0, 0, 0, 4096, 0, 4096, 0, 4096};
  }
  if (notes) {
   c->sources[0].event_count = c->event_count = 4;
   c->events[0] = {0, 0, ALIVE_SESSION_NOTE_ON, 0, 60, 100};
   c->events[1] = {1000, 0, ALIVE_SESSION_NOTE_ON, 0, 64, 90};
   c->events[2] = {2000, 0, ALIVE_SESSION_NOTE_OFF, 0, 64, 0};
   c->events[3] = {2500, 0, ALIVE_SESSION_NOTE_OFF, 0, 60, 0};
  }
  assert(owner->configure_v4(*c, nullptr, 0, *workspace));
  traced = {}; dispatches = 0;
 }
 void release(unsigned track, uint64_t bound = 4) {
  for (bool launch : {false, true}) {
   auto& proof = const_cast<ultra::clip_admission::Prepared&>(((*owner).*access(Proof{}))(launch));
   proof.reset[track][0] = bound;
  }
 }
 void automatic() {
  auto& state = (*owner).*access(State{});
  state.playing = 1; state.position = 4096;
 }
 void optional(unsigned mask = 1) { (*owner).*access(OptionalClear{}) = mask; }
 void sample(uint64_t expected) {
  owner->sample(*workspace);
  assert(!((*owner).*access(State{})).fault);
  const auto& scheduled = (*owner).*access(Scheduled{});
  if (scheduled.total[0] != expected)
   std::fprintf(stderr, "release accounting expected=%llu actual=%llu\n",
    static_cast<unsigned long long>(expected), static_cast<unsigned long long>(scheduled.total[0]));
  assert(scheduled.total[0] == expected && traced[0][0] == expected);
  assert(((*owner).*access(Optional{})).total[0] == 0 && traced[1][0] == 0);
 }
};
void automatic_clear_with_no_due_events() {
 Fixture f; f.release(0); f.automatic(); f.sample(4); assert(dispatches == 0);
}
void optional_clear_is_scheduled_event_work() {
 Fixture f; f.release(0); f.optional(); f.sample(4); assert(dispatches == 0);
}
void stopped_and_silent_candidates_keep_release_cost() {
 Fixture f; f.release(0);
 auto& candidate = (*f.owner).*access(Candidate{});
 candidate.clear_mask = 1; candidate.playing = 0;
 assert(((*f.owner).*access(First{}))()[0] == 4);
 candidate.playing = 1;
 auto& transition = (*f.owner).*access(Transition{});
 transition.changed = 1; transition.tracks[0].active_clip = ALIVE_SESSION_V4_NONE;
 assert(((*f.owner).*access(First{}))()[0] == 4);
}
void automatic_and_optional_union_releases_once() {
 Fixture f; f.release(0); f.automatic(); f.optional(); f.sample(4);
}
void due_and_chase_records_are_added_to_release() {
 Fixture f(1, true); f.release(0); f.automatic(); f.sample(6);
 assert(dispatches == 2); // One strict-prefix chase and one exact-boundary On.
}
void optional_ledger_carries_work_not_release_events() {
 Fixture f; f.release(0);
 auto& candidate = (*f.owner).*access(Candidate{});
 candidate.clear_mask = 1; candidate.playing = 0;
 assert(((*f.owner).*access(Admit{}))());
 assert(((*f.owner).*access(Optional{})).total[0] == 0 && traced[1][0] == 0);
 f.optional(); f.sample(4);
}
void stopped_candidate_keeps_the_existing_frame_cap() {
 for (uint64_t retained : {28u, 29u}) {
  Fixture f; f.release(0);
  auto& candidate = (*f.owner).*access(Candidate{});
  candidate.clear_mask = 1; candidate.playing = 0;
  auto& scheduled = (*f.owner).*access(Scheduled{});
  scheduled.charge(0, Cost{retained, 0, 0, 0, 0});
  assert((((*f.owner).*access(Admit{}))()) == (retained == 28));
  assert(scheduled.total[0] == retained && dispatches == 0);
 }
}
void scalar_masks_charge_each_selected_bound_once() {
 // Literal scalar expectations: per-track bounds4 and3, each selected once.
 const std::array<uint64_t, 4> expected{0, 4, 3, 7};
 for (unsigned mask = 0; mask < 4; ++mask) {
  Fixture f(2); f.release(0); f.release(1, 3); f.optional(mask); f.sample(expected[mask]);
 }
}
void zero_release_preserves_due_chase_and_candidate_cost() {
 for (bool optional : {false, true}) {
  Fixture f(1, true); f.automatic(); if (optional) f.optional(); f.sample(2);
  assert(dispatches == 2);
  std::printf("zero-release optional=%u", unsigned(optional));
  for (const auto& family : traced) for (uint64_t amount : family)
   std::printf(" %llu", static_cast<unsigned long long>(amount));
  std::puts("");
 }
 Fixture f; auto& candidate = (*f.owner).*access(Candidate{});
 candidate.clear_mask = 1; candidate.playing = 0;
 assert(((*f.owner).*access(First{}))()[0] == 0);
 assert(((*f.owner).*access(Admit{}))());
 for (uint64_t amount : ((*f.owner).*access(Optional{})).total)
  std::printf(" %llu", static_cast<unsigned long long>(amount));
 std::puts("");
}
}
int main(int argc, char** argv) {
 ultra::alive_session_test_charge = charge; ultra::alive_session_test_dispatch = dispatch;
 struct Test { const char* name; void (*run)(); };
 const Test tests[] = {{"automatic", automatic_clear_with_no_due_events},
  {"optional", optional_clear_is_scheduled_event_work},
  {"stopped", stopped_and_silent_candidates_keep_release_cost},
  {"union", automatic_and_optional_union_releases_once},
  {"batch", due_and_chase_records_are_added_to_release},
  {"optional-ledger", optional_ledger_carries_work_not_release_events},
  {"frame-cap", stopped_candidate_keeps_the_existing_frame_cap},
  {"scalar", scalar_masks_charge_each_selected_bound_once},
  {"zero", zero_release_preserves_due_chase_and_candidate_cost}};
 unsigned ran = 0;
 for (const auto& test : tests) if (argc == 1 || std::strcmp(argv[1], test.name) == 0) {
  test.run(); ++ran; std::printf("PASS: %s release accounting\n", test.name);
 }
 assert(ran);
}
