#pragma once
#include "backend.h"
#include "../../core/engine.hpp"
#include <algorithm>
#include <cstdint>

namespace ultra {
using SequenceConfig=UltraSequenceConfig;
inline bool valid_sequence(const SequenceConfig& c) noexcept {
 return c.enabled<=1&&c.bpm>=30&&c.bpm<=240&&c.root>=24&&c.root<=84&&c.chord<=2&&c.steps>=1&&c.steps<=8&&c.gate>=10&&c.gate<=90&&c.velocity>=1&&c.velocity<=127&&c.transpose>=-24&&c.transpose<=24&&c.clock_source<=1;
}
// Callback-owned, fixed-state research program. No allocation, locks or wall clock.
// Internal time is an exact rational phase at 48 kHz; callback partitioning is irrelevant.
// MIDI clock gates use the preceding F8 interval, initially the configured BPM.
// Gates remain sample-timed if the external source disappears. This is not a PLL.
class Sequencer {
 SequenceConfig config_{0,120,60,0,8,50,100,0,0};
 bool armed_=false,playing_=false,pending_=false,clock_seen_=false;
 unsigned next_=0,step_=0,note_=128,clock_phase_=0;
 uint64_t ticks_=0,phase_=0,frame_=0,last_clock_=0,gate_at_=0,clock_interval_=1000;
 static constexpr uint64_t Period=48000*60;
 template<class Emit> bool release(unsigned offset,Emit& emit) noexcept {
  if(note_==128)return true;
  const auto note=note_;note_=128;
  if(!emit({offset,0,alive::Kind::Off,uint8_t(note),0})){clear();return false;}return true;
 }
 template<class Emit> void trigger(unsigned offset,Emit& emit) noexcept {
  if(!release(offset,emit))return;
  static constexpr unsigned triads[3][3]={{0,4,7},{0,3,7},{0,5,7}};
  step_=next_;next_=(next_+1)%config_.steps;
  const int pitch=int(config_.root)+int(triads[config_.chord][step_%3])+12*int(step_/3)+config_.transpose;
  note_=unsigned(std::clamp(pitch,0,127));
  if(!emit({offset,0,alive::Kind::On,uint8_t(note_),uint8_t(config_.velocity)})){clear();return;}
  ++ticks_;gate_at_=frame_+std::max<uint64_t>(1,clock_interval_*6*config_.gate/100);
 }
 public:
 void clear() noexcept {armed_=playing_=pending_=clock_seen_=false;next_=step_=clock_phase_=0;note_=128;ticks_=phase_=frame_=last_clock_=gate_at_=0;config_={0,120,60,0,8,50,100,0,0};clock_interval_=1000;}
 template<class Emit> void stop(unsigned offset,Emit& emit) noexcept {release(offset,emit);armed_=playing_=pending_=false;config_.enabled=0;phase_=0;}
 template<class Emit> void configure(const SequenceConfig& c,Emit& emit) noexcept {
  if(!release(0,emit))return;
  clear();config_=c;if(!valid_sequence(c)||!c.enabled)return;
  armed_=true;playing_=c.clock_source==0;pending_=playing_;clock_interval_=Period/(c.bpm*24);
 }
 template<class Emit> void midi(unsigned status,unsigned offset,Emit& emit) noexcept {
  if(!armed_||config_.clock_source!=1)return;
  if(status==0xfc){release(offset,emit);playing_=false;pending_=false;clock_phase_=0;clock_seen_=false;return;}
  if(status==0xfa||status==0xfb){
   if(!release(offset,emit))return;
   if(status==0xfa){next_=step_=0;ticks_=0;}
   playing_=true;clock_phase_=0;clock_seen_=false;return;
  }
  if(status!=0xf8||!playing_)return;
  if(clock_seen_&&frame_>last_clock_)clock_interval_=std::clamp<uint64_t>(frame_-last_clock_,1,48000);
  last_clock_=frame_;clock_seen_=true;
  if(clock_phase_==0)trigger(offset,emit);
  clock_phase_=(clock_phase_+1)%6;
 }
 template<class Emit> void sample(unsigned offset,Emit& emit) noexcept {
  if(armed_&&playing_){
   if(config_.clock_source==0){
    if(pending_){pending_=false;trigger(offset,emit);}
    else if(phase_>=Period){phase_-=Period;trigger(offset,emit);}
    if(note_!=128&&phase_*100>=Period*config_.gate)release(offset,emit);
    phase_+=config_.bpm*4;
   }else if(note_!=128&&frame_>=gate_at_)release(offset,emit);
  }
  ++frame_;
 }
 bool armed()const noexcept{return armed_;}
 unsigned step()const noexcept{return step_;}
 unsigned note()const noexcept{return note_;}
 uint64_t ticks()const noexcept{return ticks_;}
 unsigned clock_source()const noexcept{return config_.clock_source;}
};
}
