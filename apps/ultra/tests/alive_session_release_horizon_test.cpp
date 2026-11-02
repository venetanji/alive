#include "../src-tauri/native/alive_session.hpp"
#include <cassert>
#include <cstdio>
#include <cstring>
#include <memory>
#include <type_traits>

namespace {
using Session = ultra::AliveSession;
using Cost = ultra::clip_admission::Cost;
constexpr unsigned Window = 1024;
template<class Tag, auto Member> struct Access { friend auto access(Tag) { return Member; } };
#define MEMBER_TAG(Name, member) \
  struct Name { friend auto access(Name); }; \
  template struct Access<Name, &Session::member>
MEMBER_TAG(State, state_);
MEMBER_TAG(Scheduled, scheduled_);
MEMBER_TAG(Optional, optional_);
MEMBER_TAG(PlacementScheduled, placement_scheduled_);
MEMBER_TAG(PlacementOptional, placement_optional_);
MEMBER_TAG(Data, midi_);
MEMBER_TAG(Prove, midi_prove);
MEMBER_TAG(Bank, midi_bank_);
MEMBER_TAG(Preview, midi_enabled_);
MEMBER_TAG(Launch, launch_active_);
MEMBER_TAG(Resolved, resolved_);
MEMBER_TAG(Cursors, cursors_);
MEMBER_TAG(Held, midi_held_);
MEMBER_TAG(Clear, clear_);
MEMBER_TAG(OptionalClear, optional_clear_);
MEMBER_TAG(Candidate, candidate_);
MEMBER_TAG(Transition, transition_v4_);
MEMBER_TAG(First, first_candidate_cost);
#undef MEMBER_TAG

std::array<Cost, 4> charged{};
uint64_t placement = 0;
unsigned dispatches = 0;
void charge(unsigned family, const Cost& amount) noexcept {
  charged[family] = ultra::clip_admission::add(charged[family], amount);
}
void placement_charge(unsigned family, uint64_t amount) noexcept { if (family == 1) placement += amount; }
void dispatch(uint64_t, unsigned, unsigned, const AliveSessionEventV2&) noexcept { ++dispatches; }

struct Fixture {
  std::unique_ptr<Session> owner = std::make_unique<Session>();
  std::unique_ptr<ultra::CanvasWorkspace> workspace = std::make_unique<ultra::CanvasWorkspace>();
  AliveSessionStateV3 initial{};
  std::decay_t<decltype(std::declval<Session>().*access(Resolved{}))> initial_resolved{};
  uint64_t serial = 0;
  unsigned selected_variant = 0;
  Fixture(unsigned profile, unsigned release = 4, unsigned variant = 0, unsigned selected_bank = 0) {
    selected_variant = variant;
    AliveSessionConfigV4 c{};
    c.version = 4; c.struct_bytes = sizeof c; c.preparation_revision = 1;
    c.profile = c.work_policy = profile; c.tempo_bpm = 120;
    c.length_frames = c.loop_end = 16384; c.loop_enabled = 1;
    c.track_count = c.source_count = c.slot_count = c.placement_count = 1;
    auto& track = c.tracks[0]; track.kind = 1; track.instrument = ALIVE_SESSION_V4_NONE; track.gain = 1;
    std::fill_n(track.slots, 4, ALIVE_SESSION_V4_NONE); track.slots[0] = 0; track.placement_count = 1;
    c.sources[0].kind = 1; c.sources[0].audio_buffer = ALIVE_SESSION_V4_NONE;
    c.sources[0].length_frames = 4096;
    c.slots[0] = {0, 0, 0, 0, 0, 4096, 0, 4096};
    c.placements[0] = {0, 0, 0, 0, 0, 4096, 0, 4096, 0, 4096};
    assert(owner->configure_v4(c, nullptr, 0, *workspace));
    auto& data = (*owner).*access(Data{});
    assert(((*owner).*access(Prove{}))(data->banks[0], false,
      ultra::workspace_admission::ReleaseBounds{release}));
    data->banks[1] = data->banks[0];
    (*owner).*access(Bank{}) = selected_bank;
    (*owner).*access(Preview{}) = bool(variant & 2);
    (*owner).*access(Launch{}) = bool(variant & 1);
    initial = (*owner).*access(State{});
    initial_resolved = (*owner).*access(Resolved{});
  }
  auto& state() { return (*owner).*access(State{}); }
  auto& scheduled() { return (*owner).*access(Scheduled{}); }
  void seed(unsigned current, bool playing = false) {
    auto& s = state();
    s.absolute_frame = 4096 + current; s.position = 64; s.playing = playing;
    s.generation = initial.generation; s.work_rejected = 0; s.fault = 0;
    std::copy_n(initial.tracks, 8, s.tracks);
    (*owner).*access(Resolved{}) = initial_resolved;
    (*owner).*access(Preview{}) = bool(selected_variant & 2);
    (*owner).*access(Launch{}) = bool(selected_variant & 1);
    // The synthetic release fixture has a pending clear and no DSP root.
    ((*owner).*access(Clear{})).fill(false);
    auto& held = (*owner).*access(Held{});
    held = {};
    // Abstract held state makes a premature clear observable without running DSP.
    for (unsigned pitch = 60; pitch < 64; ++pitch) held[0][pitch] = 90;
    (*owner).*access(OptionalClear{}) = 0;
    (*owner).*access(Optional{}) = {};
    (*owner).*access(PlacementScheduled{}) = {};
    (*owner).*access(PlacementOptional{}) = {};
    scheduled() = {};
    charged = {}; placement = dispatches = 0;
  }
  void history(unsigned age, unsigned events) {
    assert(age >= 1 && age < Window && events <= 32);
    scheduled().charge(state().absolute_frame - age, Cost{events, 0, 0, 0, 0});
  }
  bool request(bool final_none = false, bool gap = false, bool quantized_stop = false) {
    const auto before = state();
    const auto cursors = (*owner).*access(Cursors{});
    const auto held = (*owner).*access(Held{});
    const auto generation = state().generation;
    const auto old_scheduled = scheduled();
    const auto resolved = (*owner).*access(Resolved{});
    const auto clears = (*owner).*access(Clear{});
    AliveSessionRequestV4 r{};
    r.version = 4; r.struct_bytes = sizeof r; r.preparation_revision = 1; r.request_serial = ++serial;
    r.kind = final_none ? ALIVE_SESSION_V4_TRACK_ACTIONS : ALIVE_SESSION_V4_SEEK;
    if (final_none) { r.track_mask = 1; r.tracks[0] = {ALIVE_SESSION_V4_TRACK_STOP, ALIVE_SESSION_V4_NONE}; }
    else r.position = gap ? 8192 : 512;
    AliveSessionReceiptV4 immediate{}; immediate.version = 4; immediate.struct_bytes = sizeof immediate;
    if (quantized_stop) {
      assert(final_none && state().playing);
      AliveLaunchRequestV1 launch{};
      launch.version = 1; launch.struct_bytes = sizeof launch; launch.kind = r.kind;
      launch.track_mask = r.track_mask; launch.preparation_revision = r.preparation_revision;
      launch.request_serial = r.request_serial; launch.quantization = 0;
      launch.tracks[0] = {r.tracks[0].action, r.tracks[0].slot};
      assert((owner->launch_request<AliveSessionRequestV4>(launch, immediate, 4)));
    } else assert(owner->request_v4(r, immediate));
    assert(immediate.status == ALIVE_SESSION_V4_QUEUED);
    owner->begin(*workspace);
    const auto& receipt = state().receipts[serial % 128];
    const bool accepted = receipt.status == ALIVE_SESSION_V4_APPLIED ||
        (quantized_stop && receipt.status == ALIVE_SESSION_V4_PENDING);
    assert(accepted || (receipt.status == ALIVE_SESSION_V4_REJECTED && receipt.error == ALIVE_SESSION_V4_WORK_LIMIT));
    assert(state().work_rejected == unsigned(!accepted));
    assert(std::memcmp(&old_scheduled, &scheduled(), sizeof old_scheduled) == 0);
    assert(charged[0] == Cost{} && dispatches == 0 && state().generation == generation);
    assert(((*owner).*access(Cursors{})) == cursors && ((*owner).*access(Held{})) == held);
    assert(((*owner).*access(Clear{})) == clears);
    assert(charged[1][0] == 0 && charged[1][4] == ultra::clip_admission::HorizonSteps);
    assert(placement == (final_none ? 2050u : 2054u));
    if (quantized_stop) {
      assert(((*owner).*access(Candidate{})).clear_mask == 0);
      assert(((*owner).*access(Transition{})).tracks[0].active_clip == ALIVE_SESSION_V4_NONE);
      assert(((*owner).*access(First{}))()[0] == 4);
    }
    if (!accepted) {
      assert(state().position == before.position && state().playing == before.playing);
      assert(std::memcmp(state().tracks, before.tracks, sizeof before.tracks) == 0);
      assert(((*owner).*access(OptionalClear{})) == 0);
      assert(std::memcmp(&resolved, &((*owner).*access(Resolved{})), sizeof resolved) == 0);
      for (unsigned m = 0; m < 4; ++m) assert(charged[1][m] == 0);
    } else {
      assert(((*owner).*access(OptionalClear{})) == unsigned(!quantized_stop));
      if (quantized_stop) assert(state().tracks[0].pending_action == ALIVE_SESSION_V4_TRACK_STOP);
      else assert(final_none ? state().tracks[0].active_clip == ALIVE_SESSION_V4_NONE : state().position == r.position);
    }
    owner->publish(*workspace);
    return accepted;
  }
};

using History = std::array<unsigned, Window + 1>;
bool scalar_stopped(const History& history, unsigned first) {
  if (history[0] + first > 32) return false;
  std::array<uint64_t, 2 * Window + 1> prefix{};
  for (unsigned frame = 0; frame < 2 * Window; ++frame) {
    const uint64_t events = frame < Window ? history[Window - frame]
        : frame == Window ? history[0] + first : 0;
    prefix[frame + 1] = prefix[frame] + events;
  }
  // Literal 1024-frame windows before and after the proposed first event.
  for (unsigned end = Window; end <= 2 * Window; ++end)
    if (prefix[end] - prefix[end - Window] > 64) return false;
  return true;
}
void seed_history(Fixture& fixture, const History& history) {
  for (unsigned age = 0; age < Window; ++age) if (history[age]) {
    assert(history[age] <= 32);
    fixture.scheduled().charge(fixture.state().absolute_frame - age, Cost{history[age], 0, 0, 0, 0});
  }
  fixture.scheduled().expired[0] = history[Window];
}

void stopped_expiration_scalar() {
  const std::array<History, 7> histories = [] {
    std::array<History, 7> out{};
    out[0][1023] = out[0][1022] = 30; out[0][1024] = 4;
    out[1][1023] = 30; out[1][1022] = 31; out[1][1024] = 3;
    out[2][1023] = out[2][1022] = 30; out[2][1024] = 5;
    out[3][0] = 28; out[3][1023] = 32; out[3][1024] = 4;
    out[4][0] = 29;
    out[5][1023] = 31; out[5][1022] = 30;
    out[6][1024] = 31; out[6][1023] = 30;
    return out;
  }();
  const bool literal[] = {true, false, false, true, false, false, true};
  for (unsigned profile : {1u, 2u}) for (bool none : {false, true}) {
    Fixture fixture(profile);
    for (unsigned current : {0u, 1u, 511u, 1023u})
      for (unsigned test = 0; test < histories.size(); ++test) {
        assert(scalar_stopped(histories[test], 4) == literal[test]);
        fixture.seed(current); seed_history(fixture, histories[test]);
        assert(fixture.request(none) == literal[test]);
      }
  }
}

void stopped_proof_variants() {
  for (unsigned profile : {1u, 2u}) for (unsigned bank : {0u, 1u})
    for (unsigned variant = 0; variant < 4; ++variant) {
      Fixture fixture(profile, 4, variant, bank);
      for (unsigned current : {0u, 1u, 1023u}) for (bool none : {false, true})
        for (unsigned retained : {60u, 61u}) {
          fixture.seed(current); fixture.history(1, 30); fixture.history(2, retained - 30);
          assert(fixture.request(none) == (retained == 60));
        }
    }
}

void actual_proof_playing_gap() {
  // The sparse A-built curves saturate at32/48 base,42/58 with Preview.
  // Pending release4 raises the positive-width tail maxima to36/52/46/62.
  const unsigned retained_limit[] = {28, 12, 18, 2};
  for (unsigned profile : {1u, 2u}) for (unsigned bank : {0u, 1u})
    for (unsigned variant = 0; variant < 4; ++variant) {
      Fixture fixture(profile, 4, variant, bank);
      for (unsigned current : {0u, 511u, 1023u})
        for (unsigned retained : {retained_limit[variant], retained_limit[variant] + 1}) {
          fixture.seed(current, true); fixture.history(1, retained);
          assert(fixture.request(false, true) == (retained == retained_limit[variant]));
        }
    }
}
void quantized_clear_without_explicit_mask() {
  for (unsigned profile : {1u, 2u}) for (unsigned bank : {0u, 1u})
    for (unsigned variant : {0u, 2u}) {
      Fixture fixture(profile, 4, variant, bank);
      const unsigned retained_limit = variant ? 2 : 12;
      for (unsigned current : {0u, 511u, 1023u})
        for (unsigned retained : {retained_limit, retained_limit + 1}) {
          fixture.seed(current, true); fixture.history(1, retained);
          assert(fixture.request(true, false, true) == (retained == retained_limit));
        }
    }
}

using Tail = std::array<unsigned, 12>;
ultra::clip_admission::Envelope scalar_envelope(const Tail& tail) {
  ultra::clip_admission::Envelope envelope{};
  for (unsigned width = 1; width <= Window; ++width)
    for (unsigned begin = 0; begin < tail.size(); ++begin) {
      uint64_t sum = 0;
      for (unsigned frame = begin; frame < tail.size() && frame < begin + width; ++frame)
        sum += tail[frame];
      envelope[width] = std::max(envelope[width], sum);
    }
  return envelope;
}
bool scalar_forward(const History& history, const Tail& tail, bool pending) {
  if (history[0] + 4 > 32) return false;
  std::array<uint64_t, 2 * Window + 1> prefix{};
  for (unsigned frame = 0; frame < 2 * Window; ++frame) {
    uint64_t events = frame < Window ? history[Window - frame] : 0;
    if (frame == Window) events += history[0] + (pending ? 4 : 0);
    const unsigned offset = frame >= Window ? frame - Window : Window;
    if (pending) { if (offset >= 1 && offset <= tail.size()) events += tail[offset - 1]; }
    else if (offset < tail.size()) events += tail[offset];
    prefix[frame + 1] = prefix[frame] + events;
  }
  for (unsigned end = Window; end <= 2 * Window; ++end)
    if (prefix[end] - prefix[end - Window] > 64) return false;
  return true;
}
void scalar_tail_selection() {
  for (unsigned profile : {1u, 2u}) for (unsigned bank : {0u, 1u}) {
    Fixture fixture(profile, 4, 0, bank);
    auto& proofs = ((*fixture.owner).*access(Data{}))->banks[bank];
    for (unsigned variant = 0; variant < 4; ++variant) {
      Tail regular{}, launch{};
      for (unsigned frame = 0; frame < 3; ++frame) regular[frame] = 4;
      for (unsigned frame = 0; frame < 5; ++frame) launch[frame] = 4;
      proofs.base_regular.future[0] = scalar_envelope(regular);
      proofs.base_launch.future[0] = scalar_envelope(launch);
      regular[0] += 10; launch[0] += 10;
      proofs.regular.future[0] = scalar_envelope(regular);
      proofs.launch.future[0] = scalar_envelope(launch);
      fixture.selected_variant = variant;
      Tail actual{};
      for (unsigned frame = 0; frame < ((variant & 1) ? 5u : 3u); ++frame) actual[frame] = 4;
      if (variant & 2) actual[0] += 10;
      for (unsigned current : {0u, 1u, 1023u}) for (unsigned retained = 0; retained <= 64; ++retained) {
        History history{}; history[1] = std::min(32u, retained); history[2] = retained - history[1];
        const bool expected = scalar_forward(history, actual, false) && scalar_forward(history, actual, true);
        fixture.seed(current, true); seed_history(fixture, history);
        assert(fixture.request(false, true) == expected);
      }
    }
  }
}

template<class T> void bytes(FILE* output, const T& value) {
  assert(std::fwrite(&value, sizeof value, 1, output) == 1);
}
void zero_snapshot(const char* path) {
  FILE* output = std::fopen(path, "wb"); assert(output);
  for (unsigned profile : {1u, 2u}) for (unsigned bank : {0u, 1u})
    for (unsigned variant = 0; variant < 4; ++variant) {
      Fixture fixture(profile, 0, variant, bank);
      for (unsigned current : {0u, 1u, 511u, 1023u}) for (bool playing : {false, true})
        for (unsigned retained : {0u, 28u, 29u, 60u, 61u}) {
          fixture.seed(current, playing);
          History history{}; history[1] = std::min(32u, retained); history[1023] = retained - history[1];
          seed_history(fixture, history);
          const bool accepted = fixture.request(false, playing);
          bytes(output, accepted); bytes(output, fixture.state().position); bytes(output, fixture.state().playing);
          bytes(output, fixture.state().generation); bytes(output, fixture.state().work_rejected);
          bytes(output, fixture.state().tracks); bytes(output, fixture.state().receipts[fixture.serial % 128]);
          bytes(output, fixture.scheduled()); bytes(output, ((*fixture.owner).*access(Optional{})));
          bytes(output, charged); bytes(output, placement); bytes(output, dispatches);
          bytes(output, ((*fixture.owner).*access(Cursors{}))); bytes(output, ((*fixture.owner).*access(Held{})));
        }
    }
  assert(std::fclose(output) == 0);
}

void stopped_window_caps() {
  for (unsigned profile : {1u, 2u}) for (bool final_none : {false, true}) {
    Fixture fixture(profile);
    for (unsigned current = 0; current < Window; ++current)
      for (unsigned retained : {60u, 61u}) {
        fixture.seed(current);
        fixture.history(1, 30); fixture.history(2, retained - 30);
        const bool accepted = fixture.request(final_none);
        if (accepted != (retained == 60))
          std::fprintf(stderr, "stopped window profile=%u none=%u current=%u retained=%u accepted=%u\n",
            profile, unsigned(final_none), current, retained, unsigned(accepted));
        assert(accepted == (retained == 60));
      }
  }
}
void stopped_frame_caps() {
  for (unsigned profile : {1u, 2u}) for (bool final_none : {false, true}) {
    Fixture fixture(profile);
    for (unsigned current = 0; current < Window; ++current)
      for (unsigned retained : {28u, 29u}) {
        fixture.seed(current);
        fixture.scheduled().charge(fixture.state().absolute_frame, Cost{retained, 0, 0, 0, 0});
        assert(fixture.request(final_none) == (retained == 28));
      }
  }
}
}
int main(int argc, char** argv) {
  ultra::alive_session_test_charge = charge;
  ultra::alive_session_test_dispatch = dispatch;
  ultra::alive_session_test_placement_charge = placement_charge;
  if (argc == 3 && std::strcmp(argv[1], "--r0-snapshot") == 0) { zero_snapshot(argv[2]); return 0; }
  assert(argc <= 2);
  struct Test { const char* name; void (*run)(); };
  const Test tests[] = {{"window", stopped_window_caps}, {"frame", stopped_frame_caps},
    {"expiration", stopped_expiration_scalar}, {"variants", stopped_proof_variants},
    {"playing", actual_proof_playing_gap}, {"quantized", quantized_clear_without_explicit_mask},
    {"scalar", scalar_tail_selection}};
  unsigned ran = 0;
  for (const auto& test : tests) if (argc == 1 || std::strcmp(argv[1], test.name) == 0) {
    test.run(); ++ran; std::printf("PASS: %s release-aware optional horizon\n", test.name);
  }
  assert(ran);
}
