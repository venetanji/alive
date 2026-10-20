#include "engine.hpp"
#include "ultra_core.h"
#include "guest/observe.hpp"
#include "../../../../experiments/faust-reference/host.hpp"
#include "../../../../experiments/clockwork-faust/instrument.hpp"
#include <iostream>

namespace {
using Core = alive::Engine;
using AppEvent = alive::Event;
using Audio = std::array<std::vector<float>, 2>;
constexpr auto Attack = static_cast<alive::Kind>(6);
constexpr auto Release = static_cast<alive::Kind>(7);
constexpr auto HardClear = static_cast<alive::Kind>(8);
void check(bool good, const char* message) {
 if (!good) throw std::runtime_error(message);
}
struct Result { Audio audio; Observation observation; };
Result run(const std::vector<AppEvent>& score, int frames,
           const std::vector<int>& partitions = {64}) {
 Core core;
 check(core.init(), "initialize real Clockwork core");
 Result result;
 for (auto& channel : result.audio) channel.resize(frames);
 size_t next = 0, partition = 0;
 for (int at = 0; at < frames;) {
  int count = std::min(frames-at, partitions[partition++ % partitions.size()]);
  work = {}; measuring = true;
  while (next < score.size() && score[next].offset < unsigned(at+count)) {
   auto event = score[next++];
   event.offset -= at;
   if (!core.submit(event)) { measuring = false; check(false, "admit envelope event"); }
  }
  core.render(result.audio[0].data()+at, result.audio[1].data()+at, nullptr, count);
  measuring = false;
  check(!work.allocations && !work.frees && !work.locks,
        "envelope callback allocated, freed, or locked");
  check(!core.status().fault, "envelope callback faulted");
  at += count;
 }
 check(next == score.size(), "unrendered score event");
 result.observation = ultra_observe();
 check(!result.observation.malformed && !result.observation.late,
       "real scheduler rejected or delivered late");
 return result;
}
void exact(const std::vector<float>& actual, const std::vector<float>& expected,
           int delay = 64) {
 for (int i=0; i<delay; ++i) check(actual[i] == 0, "causal startup silence");
 for (size_t i=0; i<expected.size(); ++i)
  check(actual[i+delay] == expected[i], "default oracle sample mismatch");
}
void default_oracle() {
 const std::vector<Event> oracle = {
  {0,Kind::On,60,127},{1,Kind::Level,0,90},{31,Kind::On,62,100},
  {63,Kind::Off,60,0},{64,Kind::On,64,80},{127,Kind::Level,0,77},
  {127,Kind::Off,62,0},{127,Kind::On,62,90},{256,Kind::AllOff,0,0}
 };
 std::vector<AppEvent> score;
 score.push_back({0,0,Attack,0,0});
 score.push_back({0,0,Release,0,0});
 for (auto e:oracle)
  score.push_back({unsigned(e.frame),0,alive::Kind(e.kind),uint8_t(e.note),uint8_t(e.value)});
 const auto expected=render(oracle,{1},512).audio;
 for (auto p:std::vector<std::vector<int>>{{1},{32},{64},{128},{256},{1,31,63,64,127,3,17}})
  exact(run(score,576,p).audio[0],expected);
 std::cout << "PASS default and zero-value envelope controls bit-exact frozen oracle, six partitions\n";
}
void durations() {
 for (int value : {0,1,2,8,41,126,127}) {
  const int attack=value ? value*192 : 16;
  const int release=value ? value*384 : 16;
  const int off=attack+71, frames=off+release+128;
  const std::vector<AppEvent> score = {
   {0,0,Attack,0,uint8_t(value)},{0,0,Release,0,uint8_t(value)},
   {0,0,alive::Kind::On,69,127},{unsigned(off),0,alive::Kind::Off,69,0}
  };
  auto actual=run(score,frames+64,{1,31,63,64,127,3,17}).audio[0];
  auto held=render({{0,Kind::On,69,127}},{64},frames).audio;
  for (int f=0; f<frames; ++f) {
   const float originalEnvelope=std::min((f+1)*(1.f/16),1.f);
   const float oscillator=held[f]/originalEnvelope;
   const float envelope=f<off ? std::min((f+1)*(1.f/attack),1.f)
                            : std::max(0.f,1.f-(f-off+1)*(1.f/release));
   check(std::abs(actual[f+64]-oscillator*envelope)<2e-7f,
         "attack/release frame mapping or waveform differs");
  }
  check(std::abs(actual[64]-.25f/attack)<1e-9f, "attack first sample");
  const int attackFull=attack-1+(float(attack)*(1.f/attack)<1.f);
  const int releaseZero=off+release-1+(float(release)*(1.f/release)<1.f);
  check(actual[64+attackFull] == held[attackFull], "attack reaches full scale on time");
  check(actual[64+releaseZero-1] != 0, "release tail was cut short");
  for(int f=releaseZero;f<frames;++f)
   check(actual[64+f]==0,"release tail failed to terminate");
 }
 std::cout << "PASS 16-frame, 4/8ms through 508/1016ms envelope parameters, including float endpoint rounding\n";
}
void partitions_and_isolation() {
 const std::vector<AppEvent> score = {
  {0,0,Attack,0,1},{0,1,alive::Kind::Level,0,77},
  {1,0,Release,0,2},{1,1,alive::Kind::On,65,99},
  {31,0,alive::Kind::On,60,127},{63,0,Attack,0,8},
  {64,0,alive::Kind::On,64,127},{127,0,Release,0,4},
  {127,1,alive::Kind::Off,65,0},{181,1,alive::Kind::On,72,110},
  {256,0,alive::Kind::AllOff,0,0},{260,1,alive::Kind::Off,72,0}
 };
 auto expected=run(score,2400,{1}).audio;
 for (auto p:std::vector<std::vector<int>>{{32},{64},{128},{256},{1,31,63,64,127,3,17}})
  check(run(score,2400,p).audio==expected,"envelope partition dependence");
 auto b=render({{0,Kind::Level,0,77},{1,Kind::On,65,99},{127,Kind::Off,65,0},
                {181,Kind::On,72,110},{260,Kind::Off,72,0}},{1},2336).audio;
 exact(expected[1],b);
 std::cout << "PASS envelope offsets 0/1/31/63/64/127 stable across partitions; B remains oracle-exact\n";
}
void latched_controls() {
 const std::vector<AppEvent> baseline = {
  {0,0,Attack,0,2},{0,0,Release,0,2},{1,0,alive::Kind::On,69,127},
  {512,0,alive::Kind::Off,69,0}
 };
 auto changed=baseline;
 changed.insert(changed.begin()+3,{31,0,Attack,0,127});
 changed.insert(changed.begin()+4,{63,0,Release,0,127});
 changed.push_back({700,0,Attack,0,0});
 changed.push_back({701,0,Release,0,0});
 check(run(baseline,1800).audio==run(changed,1800).audio,
       "control changes reshaped held or releasing note");
 std::cout << "PASS per-note envelope latching across held-note and release-tail edits\n";
}
void early_release_and_stop() {
 auto a=run({{0,0,Attack,0,1},{0,0,Release,0,1},{0,0,alive::Kind::On,69,127},
             {48,0,alive::Kind::Off,69,0}},256);
 // ASR note-off during attack releases from 48/192, not from full scale.
 check(a.audio[0][64+48+94]!=0,"early-release tail truncated");
 for(int f=64+48+95;f<256;++f)check(a.audio[0][f]==0,"early release duration");
 check(a.observation.active[0]==0,"early release retained an already silent voice");
 auto b=run({{0,0,Release,0,1},{0,0,alive::Kind::On,69,127},
             {31,0,alive::Kind::Sustain,0,127},{63,0,alive::Kind::Off,69,0},
             {128,0,alive::Kind::AllOff,0,0},{160,0,alive::Kind::AllOff,0,0}},768);
 for(int f=64+128+383;f<768;++f)check(b.audio[0][f]==0,"stop left a note sounding");
 check(b.observation.active[0]==0,"stop left active voice");
 std::cout << "PASS early note-off envelope and repeated all-off terminate sustained notes\n";
}
void reset_and_polyphony() {
 std::vector<AppEvent> score = {
  {0,0,Attack,0,127},{0,0,Release,0,127},{1,0,alive::Kind::On,60,127},
  {2,0,alive::Kind::On,62,127},{3,0,alive::Kind::On,64,127},
  {4,0,alive::Kind::On,65,127},{5,0,alive::Kind::On,67,127},
  {64,0,alive::Kind::Reset,0,0},{64,0,alive::Kind::On,69,127},
  {128,0,alive::Kind::Off,69,0}
 };
 auto actual=run(score,512);
 auto expected=render({{0,Kind::On,69,127},{64,Kind::Off,69,0}},{1},320).audio;
 for(size_t f=0;f<expected.size();++f)check(actual.audio[0][128+f]==expected[f],"reset did not restore 16-frame defaults");
 check(actual.observation.steals[0]==1,"four-voice deterministic stealing");
 check(actual.observation.active[0]==0,"reset/end active voice");
 std::cout << "PASS reset restores defaults, four voices, deterministic steal, clean end\n";
}
void queue_contract() {
 UltraCore* core=ultra_core_create(48000);check(core,"C API initialize");
 check(ultra_core_queue(core,{0,0,6,0,1}),"C queue attack");
 check(ultra_core_queue(core,{0,0,7,0,1}),"C queue release");
 check(ultra_core_queue(core,{0,0,0,69,127}),"C queue note");
 float left[128]{},right[128]{};
 work={};measuring=true;ultra_core_render(core,left,right,nullptr,nullptr,128);measuring=false;
 check(!work.allocations&&!work.frees&&!work.locks,"queued controls realtime work");
 check(left[64] == .25f/192,"queued control did not reach prepared Faust zone");
 check(!ultra_core_submit(core,{0,0,9,0,1}),"unknown kind accepted");
 check(ultra_core_status(core).fault,"invalid kind not fail-closed");
 ultra_core_destroy(core);
 std::cout << "PASS C API/UI queue reaches Faust zones; unknown kind rejected\n";
}
void hard_clear() {
 const std::vector<AppEvent> settings = {
  {0,0,Attack,0,8},{0,0,Release,0,14},{0,0,alive::Kind::Level,0,64}
 };
 auto expectedScore=settings;
 expectedScore.push_back({0,0,alive::Kind::On,69,127});
 expectedScore.push_back({64,0,alive::Kind::Off,69,0});
 const auto expected=run(expectedScore,768).audio[0];
 auto score=settings;
 score.push_back({0,0,alive::Kind::On,60,127});
 score.push_back({1,0,alive::Kind::Sustain,0,127});
 score.push_back({64,0,alive::Kind::Off,60,0});
 score.push_back({128,0,HardClear,0,0});
 score.push_back({256,0,alive::Kind::On,69,127});
 score.push_back({320,0,alive::Kind::Off,69,0});
 const auto actual=run(score,1024,{1,31,63,64,127,3,17});
 for(int f=128+64;f<256+64;++f)
  check(actual.audio[0][f]==0,"hard clear left a release or sustained tail");
 for(size_t f=0;f<expected.size();++f)
  check(actual.audio[0][f+256]==expected[f],"hard clear changed retained envelope/level or sustain");
 check(actual.observation.active[0]==0,"hard clear did not clear sustain");
 std::cout<<"PASS internal hard clear immediately silences while retaining level/attack/release and clearing sustain\n";
}
template<class T> void audio_bus() {
 if constexpr(requires(T& core, float** channels) {
  core.render_bus({channels,2},nullptr,128,nullptr);
 }) {
  {
   T core;check(core.init(),"bus initialize");
   check(core.submit({0,0,alive::Kind::On,69,127}),"bus note");
   float left[128]{},right[128]{};float* channels[]={left,right};
   work={};measuring=true;core.render_bus({channels,2},nullptr,128,nullptr);measuring=false;
   check(!work.allocations&&!work.frees&&!work.locks,"bus realtime work");
   check(left[64]==.25f/16 && right[64]==0,"bus channel placement");
  }
  for(int scenario=0;scenario<5;++scenario) {
   T core;check(core.init(),"invalid bus initialize");
   float left[128],right[128];std::fill_n(left,128,42);std::fill_n(right,128,43);
   float* channels[]={left,right};
   if(scenario==0)core.render_bus({nullptr,2},nullptr,128,nullptr);
   if(scenario==1)core.render_bus({channels,1},nullptr,128,nullptr);
   if(scenario==2)core.render_bus({reinterpret_cast<float**>(uintptr_t(1)),UINT32_MAX},nullptr,128,nullptr);
   if(scenario==3){float* invalid[]={nullptr,right};core.render_bus({invalid,2},nullptr,128,nullptr);}
   if(scenario==4){float* invalid[]={left,nullptr};core.render_bus({invalid,2},nullptr,128,nullptr);}
   check(core.status().fault,"invalid audio bus must fail closed");
   check(left[0]==42 && right[0]==43,"invalid audio bus wrote an unknown destination");
   core.render(left,right,nullptr,128);
   for(float x:left)check(x==0,"invalid bus did not mute subsequent callback");
   for(float x:right)check(x==0,"invalid bus did not mute second channel");
  }
  std::cout<<"PASS two-channel native bus; null/invalid-width buses fault without dereference or writes\n";
 } else {
  check(false,"missing explicit multichannel audio bus boundary");
 }
}
}
int main() {
 try {
  instrumentation_control();
  default_oracle();durations();partitions_and_isolation();latched_controls();
  early_release_and_stop();reset_and_polyphony();queue_contract();hard_clear();audio_bus<Core>();
  std::cout << "PASS all app envelope tests through real Clockwork\n";
 } catch(const std::exception& e) {
  measuring=false;std::cerr<<"FAIL "<<e.what()<<'\n';return 1;
 }
}
