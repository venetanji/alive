#include "analog_play.h"
#include "external_device.h"
#include "../patch_graph.hpp"
#include <algorithm>
#include <atomic>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <memory>
#include <stdexcept>

#ifndef ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL
#error Analog play requires the experimental native build.
#endif
namespace {
constexpr const char* analog_hash="4528afb1fbc78d49ed92161ed13ae1df50606e2e2b2c4f28caeca0cbc1476133";
struct Note {unsigned pitch=0,velocity=0;};
struct Player {
 UltraExternalDevice* device=nullptr;
 ultra::CanvasRuntime runtime;
 std::array<UltraExternalMidi,16> pending{};unsigned pending_count=0;
 std::array<Note,256> notes{};
 std::atomic<unsigned> head{0},tail{0};
 std::atomic<bool> fault{false};
 std::atomic<float> gain{.15f},peak{0};
 std::atomic<uint64_t> frames{0};
 uint64_t generation=0;
 std::array<UltraExternalParameter,203> descriptors{};
 std::array<std::atomic<uint64_t>,203> requested{},applied{};
 std::atomic<uint64_t> request_epoch{0},applied_epoch{0};
 ~Player(){runtime.unbind_external(1);ultra_external_device_close(device);}
};
static_assert(std::atomic<float>::is_always_lock_free&&std::atomic<uint64_t>::is_always_lock_free);
std::unique_ptr<Player> player;
uint64_t next_generation=0;
uint64_t command(float value,uint32_t revision){uint32_t bits=0;std::memcpy(&bits,&value,4);return(uint64_t(revision)<<32)|bits;}
float command_value(uint64_t command){uint32_t bits=uint32_t(command);float value=0;std::memcpy(&value,&bits,4);return value;}
auto discard=[](alive::Event){return true;};
bool note(void* raw,unsigned pitch,unsigned velocity,uint64_t)noexcept{
 auto& p=*static_cast<Player*>(raw);if(p.pending_count==p.pending.size())return false;
 p.pending[p.pending_count++]={0,uint8_t(velocity?0x90:0x80),uint8_t(pitch),uint8_t(velocity),0};return true;
}
bool parameter(void* raw,unsigned index,double value,uint64_t)noexcept{
 return ultra_external_device_set_parameter(static_cast<Player*>(raw)->device,index,float(value));
}
bool sample(void* raw,double* left,double* right,uint64_t)noexcept{
 auto& p=*static_cast<Player*>(raw);float l=0,r=0;
 bool ok=ultra_external_device_render(p.device,1,&l,&r,p.pending.data(),p.pending_count);
 p.pending_count=0;*left=l;*right=r;return ok;
}
UltraCanvasNode node(unsigned id,unsigned kind,double value=0){
 UltraCanvasNode n{};n.id=id;n.kind=kind;n.p0=value;return n;
}
float audition_initial_value(unsigned index,const UltraExternalParameter& descriptor){
 // Authored fallback: a tuned, note-gated oscillator with neutral modulation.
 // The installed Live preset is applied separately by the control owner.
 switch(index){
  case 0:return 4;
  case 1:return 1.f/6;
  case 2:case 45:case 128:return .65f;
  case 3:case 30:case 113:return 3;
  case 4:case 31:case 114:return 12;
  case 5:case 11:case 26:case 34:case 36:case 71:case 82:
  case 117:case 119:case 154:case 165:return .5f;
  case 7:case 28:case 46:case 65:case 87:case 99:case 129:case 148:
  case 170:case 182:case 52:case 135:case 96:case 97:case 108:case 109:
  case 179:case 180:case 191:case 192:return 1;
  case 68:case 151:return .7f;
  case 98:case 110:case 181:case 193:return .2f;
  case 121:return 1;
  default:return descriptor.minimum;
 }
}
}
extern "C" {
int ultra_analog_play_open(const char* path,char* error,size_t capacity){
 try{
  if(player)throw std::runtime_error("Stop the current Analog test first.");
  auto next=std::make_unique<Player>();
  next->device=ultra_external_device_open(path,analog_hash,error,capacity);
  if(!next->device)return 0;
  if(ultra_external_device_parameter_count(next->device)!=203)throw std::runtime_error("Unexpected Analog descriptor count.");
  for(unsigned i=0;i<203;++i){
   UltraExternalParameter p{};
   if(!ultra_external_device_parameter(next->device,i,&p))throw std::runtime_error("Cannot inspect Analog state.");
   next->descriptors[i]=p;
   if(!p.initialized)continue;
   const float value=audition_initial_value(i,p);
   if(!ultra_external_device_set_parameter(next->device,i,value))throw std::runtime_error("Cannot initialize Analog test state.");
   next->requested[i].store(command(value,1));next->applied[i].store(command(value,1));
  }
  UltraCanvasGraph g{};g.revision=1;g.node_count=4;g.edge_count=4;
  g.nodes[0]=node(1,68);g.nodes[1]=node(2,ultra::SignalMultiply,.15);
  g.nodes[2]=node(3,ultra::SignalMultiply,.15);g.nodes[3]=node(4,ultra::SignalDac);
  std::strcpy(g.nodes[3].text,"1 2");
  g.edges[0]={1,0,2,0};g.edges[1]={1,1,3,0};g.edges[2]={2,0,4,0};g.edges[3]={3,0,4,1};
  ultra::CanvasPlan plan{};if(!ultra::compile_canvas(g,plan))throw std::runtime_error("Analog graph was refused.");
  next->runtime.reset(plan);
  if(!next->runtime.bind_external(1,{next.get(),note,parameter,sample,nullptr,false}))throw std::runtime_error("Analog graph binding was refused.");
  next->generation=++next_generation;if(!next->generation)next->generation=++next_generation;
  player=std::move(next);return 1;
 }catch(const std::exception& e){if(error&&capacity)std::snprintf(error,capacity,"%s",e.what());return 0;}
}
void ultra_analog_play_close(){player.reset();}
int ultra_analog_play_active(){return bool(player);}
int ultra_analog_play_note(unsigned pitch,unsigned velocity){
 if(!player||pitch>127||velocity>127||player->fault.load())return 0;
 auto& p=*player;const unsigned head=p.head.load(std::memory_order_relaxed);
 if(head-p.tail.load(std::memory_order_acquire)==p.notes.size()){p.fault.store(true);return 0;}
 p.notes[head%p.notes.size()]={pitch,velocity};p.head.store(head+1,std::memory_order_release);return 1;
}
int ultra_analog_play_gain(float value){
 if(!player||!std::isfinite(value)||value<0||value>.5f)return 0;
 player->gain.store(value);return 1;
}
uint64_t ultra_analog_play_generation(){return player?player->generation:0;}
unsigned ultra_analog_play_parameter_count(){return player?unsigned(player->descriptors.size()):0;}
int ultra_analog_play_parameter_state(unsigned index,UltraAnalogParameterState* state){
 return ultra_analog_play_parameter_states(&index,1,state);
}
int ultra_analog_play_parameter_states(const uint32_t* indices,unsigned count,UltraAnalogParameterState* states){
 if(!player||!indices||!states||!count||count>player->descriptors.size())return 0;
 auto& p=*player;for(unsigned i=0;i<count;++i)if(indices[i]>=p.descriptors.size())return 0;
 // Only the serialized control owner retries; the callback never waits for it.
 for(;;){
  const auto requested_epoch=p.request_epoch.load(),applied_epoch=p.applied_epoch.load();
  if((requested_epoch|applied_epoch)&1)continue;
  for(unsigned i=0;i<count;++i){
   const auto index=indices[i];const auto requested=p.requested[index].load(),applied=p.applied[index].load();
   states[i]={p.descriptors[index],command_value(requested),command_value(applied),uint32_t(requested>>32),uint32_t(applied>>32)};
  }
  if(p.request_epoch.load()==requested_epoch&&p.applied_epoch.load()==applied_epoch)return 1;
 }
}
int ultra_analog_play_set_parameter(uint64_t generation,unsigned index,float value){
 const UltraAnalogParameterValue parameter{index,value};return ultra_analog_play_set_parameters(generation,&parameter,1);
}
int ultra_analog_play_set_parameters(uint64_t generation,const UltraAnalogParameterValue* values,unsigned count){
 if(!player||player->generation!=generation||player->fault.load()||!values||!count||count>player->descriptors.size())return 0;
 auto& p=*player;std::array<bool,203> seen{};
 for(unsigned i=0;i<count;++i){
  const auto index=values[i].index;const auto value=values[i].value;
  if(index>=p.descriptors.size()||seen[index])return 0;
  seen[index]=true;const auto& d=p.descriptors[index];
  if(!d.initialized||!std::isfinite(value)||value<d.minimum||value>d.maximum||(d.type==3&&std::trunc(value)!=value))return 0;
 }
 // Sequentially consistent epochs and cells also order the callback's two checks.
 p.request_epoch.fetch_add(1);
 for(unsigned i=0;i<count;++i){
  const auto index=values[i].index;auto revision=uint32_t(p.requested[index].load()>>32)+1;if(!revision)++revision;
  p.requested[index].store(command(values[i].value,revision));
 }
 p.request_epoch.fetch_add(1);return 1;
}
int ultra_analog_play_render(unsigned frames,float* left,float* right){
 if(!left||!right||!frames||frames>1024)return 0;
 std::fill_n(left,frames,0.f);std::fill_n(right,frames,0.f);
 if(!player||player->fault.load())return 0;
 auto& p=*player;auto& runtime=p.runtime;
 // Bounded coalescing mailboxes cannot consume MIDI release queue capacity.
 std::array<uint64_t,203> requested{};
 const auto epoch=p.request_epoch.load();bool complete=!(epoch&1),changed_parameters=false;
 if(complete){
  for(unsigned i=0;i<requested.size();++i)requested[i]=p.requested[i].load();
  complete=p.request_epoch.load()==epoch;
 }
 if(complete){
  for(unsigned i=0;i<requested.size();++i)changed_parameters|=requested[i]!=p.applied[i].load();
  if(changed_parameters){
   p.applied_epoch.fetch_add(1);
   for(unsigned i=0;i<requested.size();++i){
    if(requested[i]==p.applied[i].load())continue;
    if(!parameter(&p,i,command_value(requested[i]),0)){p.fault.store(true);p.applied_epoch.fetch_add(1);return 0;}
   }
   for(unsigned i=0;i<requested.size();++i)p.applied[i].store(requested[i]);
   p.applied_epoch.fetch_add(1);
  }
 }
 // An incomplete edit defers parameters only; note-on/off keep their own queue.
 const float gain=p.gain.load();auto changed=runtime.plan();
 for(unsigned id:{2u,3u}){
  if(!ultra::change_canvas_param(changed,id,0,gain)||!runtime.param(changed,id,0,gain,0,discard)){p.fault=true;return 0;}
 }
 float peak=0;
 for(unsigned frame=0;frame<frames;++frame){
  runtime.begin_callback();
  unsigned tail=p.tail.load(std::memory_order_relaxed);
  const unsigned head=p.head.load(std::memory_order_acquire);
  for(unsigned count=0;tail!=head&&count<16;++count,++tail){
   const auto event=p.notes[tail%p.notes.size()];ultra::CanvasMessage m{};m.count=2;m.values[0]=event.pitch;m.values[1]=event.velocity;
   if(!runtime.event(1,1,0,m,0,discard)){p.fault=true;break;}
  }
  p.tail.store(tail,std::memory_order_release);
  if(!runtime.sample(0,discard))p.fault=true;
  const auto pcm=runtime.signal_sample(0,0,1,discard);
  if(runtime.failed()||p.fault.load()){p.fault=true;std::fill_n(left,frames,0.f);std::fill_n(right,frames,0.f);return 0;}
  left[frame]=std::clamp(float(pcm[0]),-1.f,1.f);right[frame]=std::clamp(float(pcm[1]),-1.f,1.f);
  peak=std::max({peak,std::fabs(left[frame]),std::fabs(right[frame])});
 }
 p.frames.fetch_add(frames);p.peak.store(peak);return 1;
}
uint64_t ultra_analog_play_frames(){return player?player->frames.load():0;}
float ultra_analog_play_peak(){return player?player->peak.load():0;}
int ultra_analog_play_fault(){return player&&player->fault.load();}
}
