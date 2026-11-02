#include "live_device.hpp"
#include "device_profiles.hpp"
#include <atomic>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <stdexcept>
#include <string>
#include <vector>

#ifndef ULTRA_EXTERNAL_DEVICE_EXPERIMENTAL
#error Owned Live devices require the experimental native build.
#endif
namespace ultra {
namespace {
constexpr unsigned Parameters=LiveDeviceMaximumParameters,Instances=32;
bool failure(char* error,size_t capacity,const char* message)noexcept{if(error&&capacity)std::snprintf(error,capacity,"%s",message);return false;}
void require(bool ok,const char* message){if(!ok)throw std::runtime_error(message);}
uint64_t command(float value,uint32_t version){uint32_t bits=0;std::memcpy(&bits,&value,4);return(uint64_t(version)<<32)|bits;}
float value(uint64_t command){const auto bits=uint32_t(command);float result=0;std::memcpy(&result,&bits,4);return result;}
}
struct LiveDeviceBank::State {
 struct Instance {
  unsigned node=0;
  const LiveDeviceProfile* profile=nullptr;
  std::string path;
  UltraExternalDevice* device=nullptr;
  std::array<UltraExternalParameter,Parameters> descriptors{};
  std::array<std::atomic<uint64_t>,Parameters> requested{},applied{};
  std::array<UltraExternalMidi,16> notes{};unsigned note_count=0;
  std::array<unsigned,4> held{};unsigned held_count=0;
  bool fault=false; // Callback owner only, except under the quiescent fence.
  ~Instance(){ultra_external_device_close(device);}
  bool accepts(unsigned index,float v)const noexcept{
   if(index>=profile->parameter_count)return false;
   const auto& d=descriptors[index];
   return d.initialized&&std::isfinite(v)&&v>=d.minimum&&v<=d.maximum&&(d.type!=3||std::trunc(v)==v);
  }
  static bool note(void* raw,unsigned pitch,unsigned velocity,uint64_t)noexcept{
   auto& self=*static_cast<Instance*>(raw);if(self.fault)return false;
   if(pitch>127||velocity>127){self.fault=true;return false;}
   unsigned at=0;while(at<self.held_count&&self.held[at]<pitch)++at;
   const bool present=at<self.held_count&&self.held[at]==pitch;
   if(!velocity&&!present)return true;
   if(self.note_count==self.notes.size()||(velocity&&(present||self.held_count==self.held.size()))){self.fault=true;return false;}
   if(velocity){
    for(unsigned i=self.held_count;i>at;--i)self.held[i]=self.held[i-1];
    self.held[at]=pitch;++self.held_count;
   }else{
    for(unsigned i=at+1;i<self.held_count;++i)self.held[i-1]=self.held[i];
    --self.held_count;
   }
   self.notes[self.note_count++]={0,uint8_t(velocity?0x90:0x80),uint8_t(pitch),uint8_t(velocity),0};return true;
  }
  static bool release_notes(void* raw,uint64_t)noexcept{
   auto& self=*static_cast<Instance*>(raw);if(self.fault)return false;
   if(self.held_count>self.notes.size()-self.note_count){self.fault=true;return false;}
   for(unsigned i=0;i<self.held_count;++i)self.notes[self.note_count++]={0,0x80,uint8_t(self.held[i]),0,0};
   self.held_count=0;return true;
  }
  static bool parameter(void*,unsigned,double,uint64_t)noexcept{return false;}
  static bool sample(void* raw,double* l,double* r,uint64_t)noexcept{
   auto& self=*static_cast<Instance*>(raw);*l=*r=0;if(self.fault)return false;
   float left=0,right=0;
   const bool result=ultra_external_device_render(self.device,1,&left,&right,self.notes.data(),self.note_count);
   self.note_count=0;
   if(!result||!std::isfinite(left)||!std::isfinite(right)){self.fault=true;return false;}
   *l=left;*r=right;return true;
  }
 };
 UltraCanvasGraph graph{};
 std::vector<std::unique_ptr<Instance>> instances;
 std::atomic<uint64_t> requested_epoch{0},applied_epoch{0};
 bool fault=false; // Render owner only, except under the quiescent fence.
 Instance* find(unsigned node)const noexcept{for(const auto& i:instances)if(i->node==node)return i.get();return nullptr;}
};
static_assert(std::atomic<uint64_t>::is_always_lock_free);
LiveDeviceBank::LiveDeviceBank(std::unique_ptr<State> state):state_(std::move(state)){}
LiveDeviceBank::~LiveDeviceBank()=default;
std::unique_ptr<LiveDeviceBank> LiveDeviceBank::prepare(const UltraCanvasGraph& graph,const UltraLiveDeviceSource* sources,unsigned count,char* error,size_t capacity){
 try{
  require(count<=Instances&&(!count||sources),"Invalid Live device source count.");
  unsigned expected=0;for(unsigned i=0;i<graph.node_count;++i){
   require(graph.nodes[i].kind!=ExternalParameter,"Owned Live devices do not admit experimental parameter proxies.");
   expected+=graph.nodes[i].kind==ExternalInstrument;
  }
  require(expected==count,"Every live.device~ node requires exactly one source state.");
  auto next=std::make_unique<State>();next->graph=graph;
  // Validate source identities before any foreign construction.
  for(unsigned i=0;i<count;++i){
   const auto& s=sources[i];
   const auto* profile=live_device_profile(s.profile,s.profile_version);
   require(profile&&profile->descriptors&&!s.reserved,"Unsupported Live device profile.");
   require(s.parameter_count==profile->parameter_count&&s.values&&s.dll_path&&s.dll_path[0],"Live device requires complete source state and a local DLL.");
   bool found=false;for(unsigned n=0;n<graph.node_count;++n)found|=graph.nodes[n].id==s.node&&graph.nodes[n].kind==ExternalInstrument;
   require(found,"Live device source references a missing instrument node.");
   for(unsigned prior=0;prior<i;++prior)require(sources[prior].node!=s.node,"Duplicate Live device source node.");
  }
  for(unsigned i=0;i<count;++i){
   const auto& s=sources[i];auto instance=std::make_unique<State::Instance>();instance->node=s.node;instance->path=s.dll_path;
   instance->profile=live_device_profile(s.profile,s.profile_version);
   const auto& profile=*instance->profile;
   char detail[256]{};instance->device=ultra_external_device_open(s.dll_path,profile.dll_sha256,detail,sizeof detail);
   require(instance->device,detail[0]?detail:"Cannot construct Live device.");
   require(ultra_external_device_parameter_count(instance->device)==profile.parameter_count,"Live device descriptor count changed.");
   for(unsigned p=0;p<profile.parameter_count;++p){
    require(ultra_external_device_parameter(instance->device,p,&instance->descriptors[p]),"Cannot inspect Live device descriptor.");
    const auto& actual=instance->descriptors[p];const auto& expected=profile.descriptors[p];
    require(actual.index==expected.index&&actual.initialized==expected.initialized
      &&actual.tag_a==expected.tag_a&&actual.tag_b==expected.tag_b&&actual.type==expected.type
      &&actual.minimum==expected.minimum&&actual.maximum==expected.maximum,
      "Live device descriptor signature changed.");
    require(instance->accepts(p,s.values[p]),"Live device source state is outside the qualified parameter range.");
   }
   next->instances.push_back(std::move(instance));
  }
  // Validate every constructed source before any candidate receives saved state.
  for(unsigned i=0;i<count;++i){
   const auto& s=sources[i];auto& instance=next->instances[i];
   const auto& profile=*instance->profile;
   for(unsigned p=0;p<profile.parameter_count;++p){
    require(ultra_external_device_set_parameter(instance->device,p,s.values[p]),"Cannot restore Live device source state.");
    instance->requested[p].store(command(s.values[p],1));instance->applied[p].store(command(s.values[p],1));
   }
  }
  if(error&&capacity)error[0]=0;
  return std::unique_ptr<LiveDeviceBank>(new LiveDeviceBank(std::move(next)));
 }catch(const std::exception& e){failure(error,capacity,e.what());return nullptr;}
 catch(...){failure(error,capacity,"Live device preparation failed.");return nullptr;}
}
bool LiveDeviceBank::has(unsigned node)const noexcept{return state_->find(node);}
unsigned LiveDeviceBank::count()const noexcept{return unsigned(state_->instances.size());}
bool LiveDeviceBank::bind(CanvasRuntime& runtime)noexcept{
 if(state_->fault)return false;
 for(const auto& i:state_->instances){const int slot=runtime.plan().find(i->node);if(i->fault||slot<0||runtime.plan().graph.nodes[unsigned(slot)].kind!=ExternalInstrument)return false;}
 unsigned bound=0;
 for(const auto& i:state_->instances){
  if(!runtime.bind_external(i->node,{i.get(),State::Instance::note,State::Instance::parameter,State::Instance::sample,nullptr,false,State::Instance::release_notes})){
   for(unsigned n=0;n<bound;++n)runtime.unbind_external(state_->instances[n]->node);
   return false;
  }
  ++bound;
 }
 return true;
}
bool LiveDeviceBank::rearm(CanvasRuntime& runtime,char* error,size_t capacity){
 // Old bindings stay silent until every fresh instance has reconstructed state.
 std::array<std::array<float,Parameters>,Instances> values{};
 std::array<UltraLiveDeviceSource,Instances> sources{};
 for(unsigned n=0;n<state_->instances.size();++n){const auto& i=*state_->instances[n];
  for(unsigned p=0;p<i.profile->parameter_count;++p)values[n][p]=value(i.requested[p].load());
  sources[n]={i.node,i.profile->version,i.profile->parameter_count,0,i.profile->id,i.path.c_str(),values[n].data()};
 }
 auto next=prepare(state_->graph,sources.data(),unsigned(state_->instances.size()),error,capacity);if(!next)return false;
 // A rearm preserves command versions: the UI need not infer a new graph revision.
 for(unsigned n=0;n<state_->instances.size();++n)for(unsigned p=0;p<state_->instances[n]->profile->parameter_count;++p){
  const auto cell=state_->instances[n]->requested[p].load();
  next->state_->instances[n]->requested[p].store(cell);next->state_->instances[n]->applied[p].store(cell);
 }
 if(!next->bind(runtime))return failure(error,capacity,"Cannot rebind Live device instances.");
 state_.swap(next->state_);return true;
}
bool LiveDeviceBank::set_states(const UltraLiveDeviceStateUpdate* updates,unsigned count,char* error,size_t capacity)noexcept{
 if(!updates||!count||count>state_->instances.size())return failure(error,capacity,"Invalid Live device state batch.");
 for(unsigned n=0;n<count;++n){
  const auto& u=updates[n];const auto* instance=state_->find(u.node);
  if(!instance||!u.values||u.parameter_count!=instance->profile->parameter_count)return failure(error,capacity,"Live device batch requires complete known source state.");
  for(unsigned prior=0;prior<n;++prior)if(updates[prior].node==u.node)return failure(error,capacity,"Duplicate Live device state update.");
  for(unsigned p=0;p<instance->profile->parameter_count;++p)if(!instance->accepts(p,u.values[p]))return failure(error,capacity,"Live device state batch is outside the qualified range.");
 }
 state_->requested_epoch.fetch_add(1);
 for(unsigned n=0;n<count;++n){auto& instance=*state_->find(updates[n].node);
  for(unsigned p=0;p<instance.profile->parameter_count;++p){const auto old=instance.requested[p].load();if(value(old)==updates[n].values[p])continue;
   auto version=uint32_t(old>>32)+1;if(!version)++version;instance.requested[p].store(command(updates[n].values[p],version));
  }
 }
 state_->requested_epoch.fetch_add(1);if(error&&capacity)error[0]=0;return true;
}
unsigned LiveDeviceBank::parameters(unsigned node,UltraLiveDeviceParameterState* states,unsigned capacity)const noexcept{
 const auto* instance=state_->find(node);if(!instance||!states||capacity<instance->profile->parameter_count)return 0;
 for(unsigned attempt=0;attempt<4;++attempt){
  const auto request=state_->requested_epoch.load(),applied=state_->applied_epoch.load();if((request|applied)&1)continue;
  for(unsigned p=0;p<instance->profile->parameter_count;++p){const auto r=instance->requested[p].load(),a=instance->applied[p].load();states[p]={instance->descriptors[p],value(r),value(a),uint32_t(r>>32),uint32_t(a>>32)};}
  if(request==state_->requested_epoch.load()&&applied==state_->applied_epoch.load())return instance->profile->parameter_count;
 }
 return 0;
}
bool LiveDeviceBank::apply_pending()noexcept{
 if(state_->fault)return false;
 for(const auto& i:state_->instances)if(i->fault)return false;
 std::array<std::array<uint64_t,Parameters>,Instances> cells{};
 const auto before=state_->requested_epoch.load();if(before&1)return true;
 bool changed=false;
 for(unsigned n=0;n<state_->instances.size();++n)for(unsigned p=0;p<state_->instances[n]->profile->parameter_count;++p){cells[n][p]=state_->instances[n]->requested[p].load();changed|=cells[n][p]!=state_->instances[n]->applied[p].load();}
 if(before!=state_->requested_epoch.load()||!changed)return true;
 state_->applied_epoch.fetch_add(1);
 for(unsigned n=0;n<state_->instances.size();++n)for(unsigned p=0;p<state_->instances[n]->profile->parameter_count;++p){auto& i=*state_->instances[n];
  if(cells[n][p]!=i.applied[p].load()&&!ultra_external_device_set_parameter(i.device,p,value(cells[n][p]))){state_->fault=true;state_->applied_epoch.fetch_add(1);return false;}
 }
 for(unsigned n=0;n<state_->instances.size();++n)for(unsigned p=0;p<state_->instances[n]->profile->parameter_count;++p)state_->instances[n]->applied[p].store(cells[n][p]);
 state_->applied_epoch.fetch_add(1);return true;
}
}
