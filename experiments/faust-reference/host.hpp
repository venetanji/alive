#pragma once
#include <array>
#include <vector>
#include <stdexcept>
#include "faust/dsp/dsp.h"
#include "faust/gui/MapUI.h"
#include "faust/gui/meta.h"
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunused-parameter"
#include "generated/voice.hpp"
#pragma GCC diagnostic pop
// Research fixture: single MIDI channel, sorted fixed-capacity score, 48 kHz.
enum class Kind { On,Off,Sustain,Level,AllOff,Reset };
struct Event {int frame; Kind kind; int note,value;};
struct Result { std::vector<float> audio; std::vector<int> stolen; int max_active=0; };
struct Voice {
 ReferenceVoice dsp;
 MapUI ui;
 float *gate=nullptr,*gain=nullptr,*freq=nullptr,*level=nullptr;
 int note=-1, born=0, release_at=-1;
 bool down=false;
 void prepare() {
  dsp.instanceInit(48000); dsp.buildUserInterface(&ui);
  gate=ui.getParamZone("gate"); gain=ui.getParamZone("gain");
  freq=ui.getParamZone("freq"); level=ui.getParamZone("level");
  if(!gate || !gain || !freq || !level) throw std::runtime_error("missing generated UI zone");
 }
 void reset() {dsp.instanceClear(); *gate=0;note=-1;down=false;release_at=-1;}
 bool active(int frame) const {return note>=0 && (release_at<0 || frame<release_at);}
 void release(int frame) { *gate=0; down=false; release_at=frame+16; }
};
inline Result render(const std::vector<Event>& score,const std::vector<int>& blocks,int n) {
 // Validate and allocate off the render path. No dynamic input queue is claimed.
 if(n<0 || score.size()>256 || blocks.empty()) throw std::invalid_argument("unsupported score");
 for(int b:blocks) if(b<1 || b>256) throw std::invalid_argument("block outside 1..256");
 int last=-1;
 for(const auto& e:score) {
  if(e.frame<last || e.frame<0 || e.frame>=n || e.note<0 || e.note>127 || e.value<0 || e.value>127)
   throw std::invalid_argument("invalid or unsorted MIDI score");
  last=e.frame;
 }
 Result result;result.audio.resize(n);result.stolen.reserve(256);
 std::array<Voice,4> voices;
 ReferenceVoice::classInit(48000); // shared tables initialized once, before rendering
 for(auto& v:voices) v.prepare();
 std::array<float,256> scratch{};
 bool sustain=false;float level=1;int serial=0;
 auto apply=[&](const Event& e) {
  if(e.kind==Kind::Reset) {for(auto&v:voices) v.reset();sustain=false;level=1;return;}
  if(e.kind==Kind::Level) {level=e.value/127.f;for(auto&v:voices)*v.level=level;return;}
  if(e.kind==Kind::AllOff) {sustain=false;for(auto&v:voices) if(v.active(e.frame))v.release(e.frame);return;}
  if(e.kind==Kind::Sustain) {
   sustain=e.value>=64;
   if(!sustain)for(auto&v:voices)if(v.active(e.frame)&&!v.down&&v.release_at<0)v.release(e.frame);
   return;
  }
  if(e.kind==Kind::Off || (e.kind==Kind::On&&e.value==0)) {
   // Explicit policy: release every held instance of the pitch on this channel.
   for(auto&v:voices)if(v.active(e.frame)&&v.note==e.note&&v.down) {
    v.down=false;if(!sustain)v.release(e.frame);
   }
   return;
  }
  Voice* pick=nullptr;
  for(auto&v:voices)if(!v.active(e.frame)){pick=&v;break;}
  if(!pick) {pick=&voices[0];for(auto&v:voices)if(v.born<pick->born)pick=&v;result.stolen.push_back(pick->note);}
  // Deliberately hard-steal/reset: bounded and deterministic, not click-free.
  pick->reset();pick->note=e.note;pick->down=true;pick->born=serial++;
  *pick->freq=440.f*std::pow(2.f,(e.note-69)/12.f);*pick->gain=e.value/127.f;*pick->gate=1;*pick->level=level;
  int count=0;for(const auto&v:voices)count+=v.active(e.frame);result.max_active=std::max(result.max_active,count);
 };
 size_t event=0,block=0;int frame=0;
 while(frame<n) {
  int end=std::min(n,frame+blocks[block++%blocks.size()]);
  while(frame<end) {
   while(event<score.size()&&score[event].frame==frame)apply(score[event++]);
   int stop=end;if(event<score.size())stop=std::min(stop,score[event].frame);
   int count=stop-frame;
   for(auto&v:voices)if(v.active(frame)) {
    float* out[]={scratch.data()};v.dsp.compute(count,nullptr,out);
    for(int i=0;i<count;++i)result.audio[frame+i]+=scratch[i];
   }
   frame=stop;
  }
 }
 return result;
}
