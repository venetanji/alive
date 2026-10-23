#pragma once
#include "canvas_message.hpp"
#include <array>
#include <algorithm>
#include <cmath>
#include <cstdint>

// These signal-input-only AOT kernels need no Faust runtime or UI discovery.
// Keep the minimal generated-code architecture private to this namespace.
namespace ultra::voice_kernel {
struct dsp {};
struct Meta {void declare(const char*,const char*)noexcept{}};
struct UI {void openVerticalBox(const char*)noexcept{};void closeBox()noexcept{}};
#pragma push_macro("FAUST_INT_WRAP")
#pragma push_macro("FAUSTCLASS")
#pragma push_macro("FAUSTFLOAT")
#pragma push_macro("RESTRICT")
#undef FAUST_INT_WRAP
#undef FAUSTCLASS
#undef FAUSTFLOAT
#undef RESTRICT
#define FAUSTFLOAT float
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunused-parameter"
#include "../../core/generated/voice_saw.hpp"
#include "../../core/generated/voice_filter.hpp"
#include "../../core/generated/voice_adsr.hpp"
#pragma GCC diagnostic pop
#pragma pop_macro("RESTRICT")
#pragma pop_macro("FAUSTFLOAT")
#pragma pop_macro("FAUSTCLASS")
#pragma pop_macro("FAUST_INT_WRAP")
}

namespace ultra {
struct CanvasVoiceKernels {
 struct Lane {voice_kernel::UltraSawKernel saw;voice_kernel::UltraFilterKernel filter;voice_kernel::UltraAdsrKernel adsr;};
 std::array<Lane,4> lanes;
 CanvasVoiceKernels()noexcept{for(auto& lane:lanes){lane.saw.instanceInit(48000);lane.filter.instanceInit(48000);lane.adsr.instanceInit(48000);}}
 void clear(unsigned voice)noexcept{auto& lane=lanes[voice];lane.saw.instanceClear();lane.filter.instanceClear();lane.adsr.instanceClear();}
 void clear()noexcept{for(unsigned voice=0;voice<4;voice++)clear(voice);}
 double saw(unsigned voice,double frequency)noexcept{
  float frequency_sample=float(frequency),output=0;float* inputs[]={&frequency_sample};float* outputs[]={&output};lanes[voice].saw.compute(1,inputs,outputs);return output;
 }
 double filter(unsigned voice,double audio,double cutoff,double q)noexcept{
  float audio_sample=float(audio),cutoff_sample=float(cutoff),q_sample=float(q),output=0;float* inputs[]={&audio_sample,&cutoff_sample,&q_sample};float* outputs[]={&output};lanes[voice].filter.compute(1,inputs,outputs);return output;
 }
 double adsr(unsigned voice,double gate,const UltraCanvasNode& node)noexcept{
  float gate_sample=float(gate),attack=float(node.p0),decay=float(node.p1),sustain=float(node.p2),release=float(node.p3),output=0;
  float* inputs[]={&gate_sample,&attack,&decay,&sustain,&release};float* outputs[]={&output};lanes[voice].adsr.compute(1,inputs,outputs);return output;
 }
};
struct CanvasPolyVoices {
 struct Lane {int note=-1;double frequency=0,velocity=0;uint64_t born=0,release_at=0;bool down=false,gate=false;};
 std::array<Lane,4> lanes{};
 uint64_t serial=0;bool sustain=false;
 void clear()noexcept{lanes={};serial=0;sustain=false;}
 unsigned active()const noexcept{unsigned count=0;for(const auto& lane:lanes)count+=lane.note>=0;return count;}
 void release(Lane& lane,uint64_t frame,uint64_t release_frames)noexcept{
  if(lane.note<0||!lane.gate)return;
  // The maximum authored release is captured once. Live edits and repeated
  // note-offs can never extend a released lane's bounded lifetime.
  lane.gate=false;lane.release_at=frame+release_frames;
 }
 void pedal(bool held,uint64_t frame,uint64_t release_frames)noexcept{
  sustain=held;if(!held)for(auto& lane:lanes)if(!lane.down)release(lane,frame,release_frames);
 }
 int note(unsigned pitch,unsigned velocity,unsigned count,uint64_t frame,uint64_t release_frames)noexcept{
  if(!velocity){
   Lane* found=nullptr;for(auto& lane:lanes)if(lane.note==int(pitch)&&lane.down&&(!found||lane.born<found->born))found=&lane;
   if(found){found->down=false;if(!sustain)release(*found,frame,release_frames);}return -1;
  }
  unsigned chosen=0;for(unsigned v=0;v<count;v++){if(lanes[v].note<0){chosen=v;break;}if(lanes[v].born<lanes[chosen].born)chosen=v;}
  lanes[chosen]={int(pitch),440.*std::exp2((double(pitch)-69.)/12.),double(velocity)/127.,++serial,0,true,true};return int(chosen);
 }
 void retire(uint64_t frame)noexcept{for(auto& lane:lanes)if(lane.note>=0&&!lane.gate&&frame>=lane.release_at)lane={};}
};
}
