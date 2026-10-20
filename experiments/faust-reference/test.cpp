#include <algorithm>
#include <cmath>
#include <iostream>
#include <stdexcept>
#include <vector>
#include "host.hpp"
void check(bool yes, const char* text) { if (!yes) throw std::runtime_error(text); }
int onset(const std::vector<float>& x) { for (size_t i=0;i<x.size();++i) if (std::abs(x[i])>1e-8f) return int(i); return -1; }
bool silent(const std::vector<float>& x,int a,int b) { for(int i=a;i<b;++i) if(x[i]!=0) return false; return true; }
int main() {
 try {
  auto one = render({{37,Kind::On,69,127},{101,Kind::Off,69,0}}, {64}, 256);
  check(onset(one.audio)==37,"exact onset must be frame 37");
  check(silent(one.audio,117,256),"release must terminate by frame 117");
  auto half = render({{37,Kind::On,69,64},{101,Kind::Off,69,0}}, {64},256);
  float verr=0; for(int i=0;i<256;++i) verr=std::max(verr,std::abs(half.audio[i]-one.audio[i]*(64.f/127)));
  check(verr<1e-7,"velocity must scale linearly");
  auto held = render({{37,Kind::On,69,127},{80,Kind::Sustain,0,127},{101,Kind::Off,69,0},{140,Kind::Sustain,0,0}}, {32},256);
  check(!silent(held.audio,117,140),"sustain must hold released key");
  check(silent(held.audio,156,256),"sustain-up must release");
  auto zero=render({{0,Kind::On,60,127},{40,Kind::On,60,0}}, {32},128);
  check(silent(zero.audio,56,128),"zero velocity note-on must act as note-off");
  auto reset=render({{0,Kind::On,60,127},{70,Kind::Reset,0,0},{90,Kind::On,69,127}}, {17},180);
  auto fresh=render({{90,Kind::On,69,127}}, {64},180);
  check(silent(reset.audio,70,90),"reset must immediately silence");
  check(std::equal(reset.audio.begin()+90,reset.audio.end(),fresh.audio.begin()+90),"reset must clear DSP state");
  auto panic=render({{0,Kind::On,60,127},{10,Kind::Sustain,0,127},{70,Kind::AllOff,0,0}}, {64},160);
  check(silent(panic.audio,86,160),"all-notes-off must release despite sustain");
  auto level=render({{0,Kind::On,69,127},{53,Kind::Level,0,0},{90,Kind::Level,0,127}}, {64},160);
  check(silent(level.audio,53,90),"level changes must be sample exact");
  check(!silent(level.audio,90,110),"level must resume at event frame");
  std::vector<Event> score={{0,Kind::On,60,127},{31,Kind::On,62,100},{32,Kind::On,64,80},{63,Kind::On,65,60},{64,Kind::On,67,127},{65,Kind::Off,60,0},{80,Kind::Sustain,0,127},{97,Kind::Off,62,0},{111,Kind::Level,0,64},{128,Kind::Sustain,0,0},{160,Kind::AllOff,0,0},{181,Kind::On,69,127},{200,Kind::Reset,0,0},{219,Kind::On,72,127},{260,Kind::Off,72,0}};
  auto ref=render(score,{1},512);
  check(ref.stolen==std::vector<int>{60},"voice exhaustion must steal oldest note");
  check(ref.max_active==4,"voice pool must never exceed four");
  float error=0;
  for(auto blocks:std::vector<std::vector<int>>{{32},{64},{128},{256},{3,17,1,64,31,128}}) {
   auto x=render(score,blocks,512);
   for(size_t i=0;i<x.audio.size();++i) error=std::max(error,std::abs(x.audio[i]-ref.audio[i]));
   check(x.audio==ref.audio,"partition equality must be bit exact");
  }
  bool rejected=false; try {render(score,{257},512);} catch(const std::invalid_argument&) {rejected=true;}
  check(rejected,"unsupported block size must be rejected");
  rejected=false; try {render(std::vector<Event>(257,{0,Kind::On,60,127}),{64},512);} catch(const std::invalid_argument&) {rejected=true;}
  check(rejected,"oversized event score must be rejected");
  rejected=false; try {render({{20,Kind::On,60,127},{10,Kind::Off,60,0}},{64},512);} catch(const std::invalid_argument&) {rejected=true;}
  check(rejected,"unsorted event score must be rejected");
  for(const auto& invalid:std::vector<Event>{{0,Kind::On,-1,127},{0,Kind::On,128,127},{0,Kind::On,60,-1},{0,Kind::On,60,128},{-1,Kind::On,60,127},{512,Kind::On,60,127}}) {
   rejected=false; try {render({invalid},{64},512);} catch(const std::invalid_argument&) {rejected=true;}
   check(rejected,"out-of-range pitch, value or frame must be rejected");
  }
  std::cout<<"PASS onset_frame=37 release_silent_from=117 sustain_release_silent_from=156\nPASS velocity_max_error="<<verr<<" tolerance=1e-7\nPASS partitions=1,32,64,128,256,irregular max_abs_error="<<error<<" bit_exact=true\nPASS max_voices=4 stolen_note=60 reset,zero_velocity,all_notes_off,parameter_timing\nPASS invalid_block,score_overflow,unsorted_score,out_of_range_pitch_value_frame rejected\n";
 } catch(const std::exception& e) {std::cerr<<"FAIL "<<e.what()<<'\n';return 1;}
}
