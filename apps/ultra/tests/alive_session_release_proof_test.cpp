#include "../src-tauri/native/alive_session.hpp"
#include <cassert>
#include <cstdio>
#include <type_traits>

namespace {
using Session = ultra::AliveSession;
using ReleaseBounds = std::array<unsigned, 8>;
template<class Tag, auto Member> struct Access {
  friend auto access(Tag) { return Member; }
};
#define MEMBER_TAG(Name, member) \
  struct Name { friend auto access(Name); }; \
  template struct Access<Name, &Session::member>
MEMBER_TAG(Data, midi_);
MEMBER_TAG(Prove, midi_prove);
MEMBER_TAG(Configure, midi_configure);
#undef MEMBER_TAG

AliveSessionConfigV4 config(unsigned tracks = 1, bool notes = false) {
  AliveSessionConfigV4 c{};
  c.version = 4; c.struct_bytes = sizeof c; c.preparation_revision = 1;
  c.profile = c.work_policy = tracks > 2 ? 2 : 1;
  c.tempo_bpm = 120; c.length_frames = c.loop_end = 8192;
  c.track_count = c.device_count = c.source_count = c.slot_count = tracks;
  for (unsigned t = 0; t < tracks; ++t) {
    auto& tr = c.tracks[t]; tr.kind = 1; tr.instrument = t; tr.gain = 1;
    std::fill_n(tr.slots, 4, ALIVE_SESSION_V4_NONE); tr.slots[0] = t;
    auto& d = c.devices[t]; d.kind = 1; d.document = t; d.revision = 1;
    d.note_node = 1; d.output_channels = d.output_layout = 2;
    auto& s = c.sources[t]; s.track = t; s.kind = 1;
    s.audio_buffer = ALIVE_SESSION_V4_NONE; s.length_frames = 4096;
    c.slots[t] = {t, t, 0, 0, 0, 4096, 0, 4096};
    if (notes) {
      s.event_begin = c.event_count; s.event_count = 2;
      c.events[c.event_count++] = {0, t, ALIVE_SESSION_NOTE_ON, t, 60, 100};
      c.events[c.event_count++] = {3000, t, ALIVE_SESSION_NOTE_OFF, t, 60, 0};
    }
  }
  return c;
}

template<class Bank>
bool prove(Session& owner, Bank& bank, bool require_preview, const ReleaseBounds& release) {
#ifdef ALIVE_RELEASE_BASELINE
  (void)release;
  return (owner.*access(Prove{}))(bank, require_preview);
#else
  return (owner.*access(Prove{}))(bank, require_preview, release);
#endif
}

void variants() {
  auto owner = std::make_unique<Session>();
  auto& data = (*owner).*access(Data{});
  data = std::make_unique<std::remove_reference_t<decltype(*data)>>();
  for (unsigned profile : {1u, 2u})
    for (unsigned bound = 0; bound <= 4; ++bound) {
      const ReleaseBounds release{bound, 1};
      for (auto& bank : data->banks) {
        bank.config = config(2); bank.config.profile = bank.config.work_policy = profile;
        assert(prove(*owner, bank, true, release));
        assert(bank.preview_admitted && bank.launch_admitted);
        for (const auto* proof : {&bank.regular, &bank.launch, &bank.base_regular, &bank.base_launch}) {
          assert(proof->reset[0][0] == bound && proof->reset[1][0] == 1);
          for (unsigned t = 2; t < 8; ++t) assert(proof->reset[t][0] == 0);
        }
        for (unsigned w = 0; w <= 1024; ++w)
          for (unsigned m = 0; m < 5; ++m) {
            const unsigned allowance = m == 0 && w ? 10 : 0;
            assert(bank.regular.future[m][w] == bank.base_regular.future[m][w] + allowance);
            assert(bank.launch.future[m][w] == bank.base_launch.future[m][w] + allowance);
          }
        // At one frame, any overlapping clear causes occupy exactly one frame.
        assert(bank.base_regular.future[0][1] == bound + 1);
        assert(bank.base_launch.future[0][1] == bound + 1);
      }
    }
  ((*owner).*access(Configure{}))(config(2));
  for (const auto& bank : data->banks)
    for (const auto* proof : {&bank.regular, &bank.launch, &bank.base_regular, &bank.base_launch})
      for (const auto& reset : proof->reset) assert(reset[0] == 0);
}

void preview_refusal() {
  auto owner = std::make_unique<Session>();
  auto& data = (*owner).*access(Data{});
  data = std::make_unique<std::remove_reference_t<decltype(*data)>>();
  auto& bank = data->banks[0]; bank.config = config(1, true);
  assert(prove(*owner, bank, true, {}));
  assert(bank.preview_admitted);
  assert(!prove(*owner, bank, true, ReleaseBounds{4}));
  assert(bank.launch_admitted && !bank.preview_admitted);
  assert(bank.base_launch.future[0][1024] == 55);
  assert(bank.launch.future == bank.base_launch.future);
  assert(bank.regular.future == bank.base_regular.future);
  assert(prove(*owner, bank, false, ReleaseBounds{4}));
  assert(!bank.preview_admitted && bank.base_launch.reset[0][0] == 4);
}

template<class T> void bytes(FILE* file, const T& value) {
  assert(std::fwrite(&value, sizeof value, 1, file) == 1);
}
void snapshot(const char* path) {
  FILE* file = std::fopen(path, "wb"); assert(file);
  auto owner = std::make_unique<Session>();
  auto& data = (*owner).*access(Data{});
  data = std::make_unique<std::remove_reference_t<decltype(*data)>>();
  for (unsigned tracks : {1u, 2u, 8u})
    for (bool notes : {false, true})
      for (bool require : {false, true})
        for (auto& bank : data->banks) {
          bank.config = config(tracks, notes);
          const bool accepted = prove(*owner, bank, require, {});
          bytes(file, accepted); bytes(file, bank.launch_admitted); bytes(file, bank.preview_admitted);
          for (const auto* p : {&bank.regular, &bank.launch, &bank.base_regular, &bank.base_launch}) {
            bytes(file, p->future); bytes(file, p->reset); bytes(file, p->bars); bytes(file, p->bar_count);
          }
          bytes(file, bank.placement); bytes(file, bank.launch_placement);
        }
  // The production configuration caller supplies no synthetic input.
  ((*owner).*access(Configure{}))(config());
  for (const auto& bank : data->banks)
    for (const auto* p : {&bank.regular, &bank.launch, &bank.base_regular, &bank.base_launch})
      for (const auto& reset : p->reset) assert(reset[0] == 0);
  assert(std::fclose(file) == 0);
}
}
int main(int argc, char** argv) {
  if (argc == 3 && std::strcmp(argv[1], "--r0-snapshot") == 0) { snapshot(argv[2]); return 0; }
  if (argc == 1 || std::strcmp(argv[1], "variants") == 0) variants();
  if (argc == 1 || std::strcmp(argv[1], "preview") == 0) preview_refusal();
  std::puts("PASS: release proof base/launch/Preview variants and refusal");
}
