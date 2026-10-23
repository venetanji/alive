// AOT Faust, inside Clockwork's real custom guest boundary. No scsynth.
#include "dsp_api.h"
#include "../app_voice.hpp"
#include "../engine.hpp"
#include "observe.hpp"

#include <cstring>
#include <new>
namespace {
constexpr int kDevices=alive::DocumentDevices, kVoices=4, kPending=512, kBlockMax=256;
using Voice=alive::app::Voice;
using Kind=alive::Kind;
struct Event {int frame; Kind kind; int note,value;};

struct Instrument {
 std::array<Voice,kVoices> voices;
 bool sustain=false; float level=1; int serial=0, steals=0;
 int attack=alive::app::default_envelope_frames, release=alive::app::default_envelope_frames;
 void prepare(){for(auto&v:voices)v.prepare();}
 void hard_clear(){for(auto&v:voices){v.reset();v.envelope(attack,release);}sustain=false;}
 void reset(){attack=release=alive::app::default_envelope_frames;for(auto&v:voices){v.reset();v.envelope(attack,release);}sustain=false;level=1;}
 void apply(Event e){
  if(e.kind==Kind::Reset){reset();return;}
  if(e.kind==Kind::HardClear){hard_clear();return;}
  if(e.kind==Kind::Attack||e.kind==Kind::Release){
   if(e.kind==Kind::Attack)attack=alive::app::attack_frames(uint8_t(e.value));
   else release=alive::app::release_frames(uint8_t(e.value));
   // Only idle prepared zones can change. Active-note timing remains latched.
   for(auto&v:voices)if(!v.active(e.frame))v.envelope(attack,release);
   return;
  }
  if(e.kind==Kind::Level){level=e.value/127.f;for(auto&v:voices)*v.level=level;return;}
  if(e.kind==Kind::AllOff){sustain=false;for(auto&v:voices)if(v.active(e.frame))v.release(e.frame);return;}
  if(e.kind==Kind::Sustain){sustain=e.value>=64;if(!sustain)for(auto&v:voices)if(v.active(e.frame)&&!v.down&&v.release_at<0)v.release(e.frame);return;}
  if(e.kind==Kind::Off||(e.kind==Kind::On&&e.value==0)){
   for(auto&v:voices)if(v.active(e.frame)&&v.note==e.note&&v.down){v.down=false;if(!sustain)v.release(e.frame);}return;
  }
  Voice*pick=nullptr;for(auto&v:voices)if(!v.active(e.frame)){pick=&v;break;}
  if(!pick){pick=&voices[0];for(auto&v:voices)if(v.born<pick->born)pick=&v;++steals;}
  pick->reset();pick->envelope(attack,release);pick->started=e.frame;pick->note=e.note;pick->down=true;pick->born=serial++;
  *pick->freq=440.f*std::pow(2.f,(e.note-69)/12.f);*pick->gain=e.value/127.f;*pick->gate=1;*pick->level=level;
 }
};
struct Pending {int frame,device,generation,kind,note,value;};
uint32_t word(const uint8_t*p){return uint32_t(p[0])<<24|uint32_t(p[1])<<16|uint32_t(p[2])<<8|p[3];}
}
struct Dsp {
 Instrument instruments[kDevices]; // Two independently prepared banks per document.
 int generation[kDevices]{};

 std::array<Pending,kPending> pending{};int count=0,frame=0;
 unsigned messages_this_block=0; bool panic[kDevices]{};
 std::array<float,kBlockMax> scratch{};Observation obs;
 Instrument& device(int id){return instruments[id];}
 void apply(Pending p){
  if(p.generation!=generation[p.device]){++obs.stale;return;}
  auto&x=device(p.device);x.apply({p.frame,Kind(p.kind),p.note,p.value});

 }
};
static Dsp* live=nullptr;
static Lifecycle lifecycle;
extern "C" {
Lifecycle ultra_lifecycle(){return lifecycle;}
bool ultra_guest_ready(){return live != nullptr;}
Observation ultra_observe(){return live?live->obs:Observation{};}
const DspInfo* dsp_describe(){static DspInfo x={"Ultra Faust research","0.1",0,sizeof(Dsp),0,0,0,0,0};return &x;}
uint64_t dsp_memory_bytes(const void*,uint32_t){return 0;}
uint64_t dsp_memory_bulk_bytes(const void*,uint32_t){return 0;}
Dsp* dsp_new(const DspConfig*c,const DspHost*,const char**err){
 if(c->sample_rate!=48000||c->block_size>kBlockMax||!c->block_size||c->memory_bytes<sizeof(Dsp)){++lifecycle.refused;*err="requires 48kHz and block <=256";return nullptr;}
 ++lifecycle.created;auto*d=new(c->memory)Dsp;UltraAppVoice::classInit(48000);
 for(auto&dev:d->instruments)dev.prepare();live=d;return d;
}
void dsp_free(Dsp*d){++lifecycle.destroyed;live=nullptr;d->~Dsp();}
int dsp_reconfigure(Dsp*,double,uint32_t,uint32_t){return -1;}
int dsp_asset(Dsp*,const ClockworkAsset*){return -1;}
void dsp_osc(Dsp*d,const uint8_t*b,uint32_t n,int64_t when,uint32_t,int64_t block_time){
 auto ingest=[&](const uint8_t* message,int64_t stamp){
  ++d->obs.messages;++d->messages_this_block;
  if(stamp==0)++d->obs.immediate0;if(stamp==1)++d->obs.immediate1;
  // /ultra/event ,iiiiii device generation kind note value reserved.
  if(std::memcmp(message,"/ultra/event\0",12)||std::memcmp(message+12,",iiiiii\0",8)){++d->obs.malformed;return;}
  Pending p{};p.device=int(word(message+20));p.generation=int(word(message+24));p.kind=int(word(message+28));p.note=int(word(message+32));p.value=int(word(message+36));
  if(p.device<0||p.device>=kDevices||p.kind<0||p.kind>8||p.note<0||p.note>127||p.value<0||p.value>127){++d->obs.malformed;return;}
  auto delta=(stamp==0||stamp==1)?0:std::llround(double(stamp-block_time)*(48000.0/4294967296.0));
  if(delta<0){++d->obs.late;delta=0;}p.frame=d->frame+int(std::min<int64_t>(delta,INT32_MAX-d->frame));
  if(d->count==kPending){++d->obs.overflow;d->panic[p.device]=true;return;}
  // Stable insertion: same-time delivery order preserved, fixed 512 storage.
  int i=d->count++;while(i&&d->pending[i-1].frame>p.frame){d->pending[i]=d->pending[i-1];--i;}d->pending[i]=p;
  d->obs.max_pending=std::max(d->obs.max_pending,unsigned(d->count));
 };
 if(n==44){ingest(b,when);return;}
 if(n<16||std::memcmp(b,"#bundle\0",8)){++d->obs.malformed;return;}
 if(n==64&&word(b+16)==44){ingest(b+20,when);return;}
 // A document packet contains at most 16 single-event child bundles. Validate
 // one fixed level, then ingest each child's timestamp; never recurse.
 if(n<84||n>16+16*68||(n-16)%68){++d->obs.malformed;return;}
 for(unsigned at=16;at<n;at+=68)
  if(word(b+at)!=64||std::memcmp(b+at+4,"#bundle\0",8)||word(b+at+20)!=44){++d->obs.malformed;return;}
 for(unsigned at=16;at<n;at+=68){
  const auto* child=b+at+4;
  const int64_t stamp=static_cast<int64_t>(uint64_t(word(child+8))<<32|word(child+12));
  ingest(child+20,stamp);
 }
}
void dsp_process(Dsp*d,const float*const*in,uint32_t ni,float*const*out,uint32_t no,uint32_t frames,int64_t){
 ++d->obs.calls;d->obs.max_messages_per_block=std::max(d->obs.max_messages_per_block,d->messages_this_block);d->messages_this_block=0;
 for(unsigned c=0;c<no;c++)std::fill(out[c],out[c]+frames,0.f);
 if(no>unsigned(kDevices)&&ni)std::copy(in[0],in[0]+frames,out[kDevices]);
 for(int id=0;id<kDevices;id++)if(d->panic[id]){d->device(id).reset();++d->generation[id];d->panic[id]=false;}
 const int end=d->frame+frames;int used=0;unsigned spans=0;
 while(d->frame<end){
  while(used<d->count&&d->pending[used].frame<=d->frame)d->apply(d->pending[used++]);
  int stop=end;if(used<d->count)stop=std::min(stop,d->pending[used].frame);
  const int n=stop-d->frame,offset=frames-(end-d->frame);++spans;
  for(int id=0;id<kDevices;id++)for(auto&v:d->device(id).voices)if(v.active(d->frame)){
   float*buf[]={d->scratch.data()};v.dsp.compute(n,nullptr,buf);if(unsigned(id)<no)for(int f=0;f<n;f++)out[id][offset+f]+=d->scratch[f];
  }
  d->frame=stop;
 }
 for(int i=used;i<d->count;i++)d->pending[i-used]=d->pending[i];d->count-=used;
 d->obs.spans+=spans;d->obs.max_spans=std::max(d->obs.max_spans,spans);
 for(int id=0;id<2;id++){d->obs.level[id]=d->device(id).level;d->obs.generation[id]=d->generation[id];d->obs.replacements[id]=0;d->obs.steals[id]=d->device(id).steals;d->obs.active[id]=0;for(auto&v:d->device(id).voices)d->obs.active[id]+=v.active(d->frame);}
}
}
