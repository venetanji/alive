#include "../src-tauri/native/external_device/live_device.hpp"
#include "../src-tauri/native/external_device/profiles/analog_descriptors.hpp"
#include <cassert>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <new>

namespace {
bool realtime=false;
unsigned opened=0,closed=0,writes=0,resets=0;
auto discard=[](alive::Event){return true;};
}
void* operator new(std::size_t size){assert(!realtime);if(auto* p=std::malloc(size?size:1))return p;throw std::bad_alloc();}
void* operator new[](std::size_t size){return ::operator new(size);}
void operator delete(void* p)noexcept{assert(!realtime);std::free(p);}
void operator delete[](void* p)noexcept{::operator delete(p);}
void operator delete(void* p,std::size_t)noexcept{::operator delete(p);}
void operator delete[](void* p,std::size_t)noexcept{::operator delete(p);}

struct UltraExternalDevice {
 std::array<bool,128> held{};
 std::array<UltraExternalMidi,16> last{};
 unsigned count=0,renders=0;
 bool render_failure=false;
};
namespace {
std::array<UltraExternalDevice*,64> devices{};
UltraCanvasGraph graph(){
 UltraCanvasGraph g{};g.revision=1;g.node_count=2;g.edge_count=2;
 g.nodes[0].id=1;g.nodes[0].kind=ultra::ExternalInstrument;
 g.nodes[1].id=2;g.nodes[1].kind=ultra::SignalDac;std::strcpy(g.nodes[1].text,"1 2");
 g.edges[0]={1,0,2,0};g.edges[1]={1,1,2,1};return g;
}
ultra::CanvasMessage message(unsigned pitch,unsigned velocity){
 ultra::CanvasMessage m{};m.count=2;m.values[0]=pitch;m.values[1]=velocity;return m;
}
bool note(ultra::CanvasRuntime& runtime,unsigned pitch,unsigned velocity){
 return runtime.event(1,1,0,message(pitch,velocity),0,discard);
}
std::array<double,2> tick(ultra::CanvasRuntime& runtime){return runtime.signal_sample(0,0,1,discard);}
struct Realtime {
 unsigned opens=opened,closes=closed,sets=writes,reset_calls=resets;
 Realtime(){assert(!realtime);realtime=true;}
 ~Realtime(){realtime=false;assert(opens==opened&&closes==closed&&sets==writes&&reset_calls==resets);}
};
struct Fixture {
 std::unique_ptr<ultra::CanvasRuntime> runtime=std::make_unique<ultra::CanvasRuntime>();
 std::unique_ptr<ultra::LiveDeviceBank> bank;
 UltraExternalDevice* device=nullptr;
 Fixture(){
  auto g=graph();ultra::CanvasPlan plan{};assert(ultra::compile_canvas(g,plan));runtime->reset(plan);
  std::array<float,203> values{};
  const UltraLiveDeviceSource source{1,1,203,0,"live12-analog-v1","test-double.dll",values.data()};
  char error[256]{};bank=ultra::LiveDeviceBank::prepare(g,&source,1,error,sizeof error);
  assert(bank&&bank->bind(*runtime));device=devices[opened-1];assert(device);
 }
 ~Fixture(){assert(runtime->unbind_external(1));bank.reset();}
};
void deterministic_release_and_sibling(){
 Fixture a,b;auto* owner=a.device;auto* sibling=b.device;
 {
  Realtime guard;
  for(unsigned pitch:{67,60,64,62})assert(note(*a.runtime,pitch,100));
  assert(note(*b.runtime,90,90));assert(tick(*a.runtime)[0]>0);assert(tick(*b.runtime)[0]>0);
  const auto sibling_renders=sibling->renders;
  assert(a.runtime->musical_discontinuity());assert(a.runtime->musical_discontinuity());
  assert(note(*a.runtime,60,110));assert(tick(*a.runtime)[0]>0);
  assert(a.device==owner&&b.device==sibling&&sibling->renders==sibling_renders&&sibling->held[90]);
  assert(owner->count==5);
  const std::array<unsigned,4> expected{60,62,64,67};
  for(unsigned i=0;i<4;++i){assert(owner->last[i].status==0x80);assert(owner->last[i].data1==expected[i]);}
  assert(owner->last[4].status==0x90&&owner->last[4].data1==60&&owner->last[4].data2==110);
  assert(a.runtime->musical_discontinuity());assert(tick(*a.runtime)[0]==0);
  assert(owner->count==1&&owner->last[0].data1==60&&owner->last[0].status==0x80);
 }
}
void sixteen_record_bound_and_retrigger(){
 Fixture f;
 Realtime guard;
 for(unsigned pitch=60;pitch<64;++pitch)assert(note(*f.runtime,pitch,100));
 tick(*f.runtime);assert(f.runtime->musical_discontinuity());assert(f.runtime->musical_discontinuity());
 for(unsigned pitch=70;pitch<74;++pitch)assert(note(*f.runtime,pitch,100));
 for(unsigned pitch=70;pitch<74;++pitch)assert(note(*f.runtime,pitch,0));
 for(unsigned pitch=70;pitch<74;++pitch)assert(note(*f.runtime,pitch,110));
 assert(tick(*f.runtime)[0]>0&&f.device->count==16);
 for(unsigned i=0;i<16;++i){const auto& e=f.device->last[i];assert(e.offset==0);assert(e.status==((i<4||(i>=8&&i<12))?0x80:0x90));}
 assert(note(*f.runtime,70,0));assert(note(*f.runtime,70,100));tick(*f.runtime);
 assert(f.device->count==2&&f.device->last[0].status==0x80&&f.device->last[1].status==0x90);
 assert(note(*f.runtime,12,0));tick(*f.runtime);assert(f.device->count==0);
}
void refused_notes_quarantine(){
 for(bool duplicate:{true,false}){
  Fixture f;
  Realtime guard;
  for(unsigned pitch=60;pitch<64;++pitch)assert(note(*f.runtime,pitch,100));
  tick(*f.runtime);const auto rendered=f.device->renders;
  assert(!note(*f.runtime,duplicate?60:64,100));assert(f.runtime->failed());
  assert(!f.runtime->musical_discontinuity());assert(tick(*f.runtime)[0]==0&&f.device->renders==rendered);
  f.runtime->recover();assert(!f.runtime->musical_discontinuity());
  assert(tick(*f.runtime)[0]==0&&f.device->renders==rendered);
 }
}
void full_queue_and_render_failure_quarantine(){
 {
  Fixture f;Realtime guard;
  for(unsigned round=0;round<2;++round){
   for(unsigned pitch=60;pitch<64;++pitch)assert(note(*f.runtime,pitch,100));
   for(unsigned pitch=60;pitch<64;++pitch)assert(note(*f.runtime,pitch,0));
  }
  assert(!note(*f.runtime,60,100));assert(f.runtime->failed());
  assert(tick(*f.runtime)[0]==0&&f.device->renders==0);
 }
 {
  Fixture f;Realtime guard;
  for(unsigned pitch=0;pitch<4;++pitch)assert(note(*f.runtime,pitch,100));
  tick(*f.runtime);assert(f.runtime->musical_discontinuity());
  for(unsigned pitch=10;pitch<14;++pitch)assert(note(*f.runtime,pitch,100));
  for(unsigned pitch=10;pitch<14;++pitch)assert(note(*f.runtime,pitch,0));
  for(unsigned pitch=10;pitch<14;++pitch)assert(note(*f.runtime,pitch,100));
  const auto rendered=f.device->renders;
  assert(!f.runtime->musical_discontinuity());assert(f.runtime->failed());
  assert(tick(*f.runtime)[0]==0&&f.device->renders==rendered);
 }
 {
  Fixture f;Realtime guard;f.device->render_failure=true;tick(*f.runtime);
  assert(f.runtime->failed());const auto rendered=f.device->renders;
  f.device->render_failure=false;f.runtime->recover();
  assert(!f.runtime->musical_discontinuity());tick(*f.runtime);assert(f.device->renders==rendered);
 }
}
void fault_requires_fresh_bank_and_sustain_is_rejected(){
 Fixture f;auto* old=f.device;
 {
  Realtime guard;ultra::CanvasMessage sustain{};
  assert(ultra::canvas_parse_message("sustain 127",sustain));
  assert(!f.runtime->event(1,1,0,sustain,0,discard));assert(!f.runtime->failed());
  assert(note(*f.runtime,60,100));tick(*f.runtime);assert(f.device->held[60]);
  assert(!note(*f.runtime,60,100));assert(!f.bank->apply_pending());
 }
 assert(!f.bank->bind(*f.runtime));
 char error[256]{};assert(f.bank->rearm(*f.runtime,error,sizeof error));
 f.device=devices[opened-1];assert(f.device!=old);f.runtime->recover();
 {
  Realtime guard;
  assert(f.runtime->musical_discontinuity());assert(tick(*f.runtime)[0]==0);
  assert(note(*f.runtime,60,100));assert(tick(*f.runtime)[0]>0);
 }
}
void local_voices_filters_and_timers(){
 UltraCanvasGraph g{};g.revision=1;g.node_count=5;g.edge_count=5;
 g.nodes[0].id=1;g.nodes[0].kind=ultra::AudioIn;
 g.nodes[1].id=2;g.nodes[1].kind=ultra::FilterStereo;g.nodes[1].p0=2400;g.nodes[1].p1=.7;
 g.nodes[2].id=3;g.nodes[2].kind=ultra::SignalDac;std::strcpy(g.nodes[2].text,"1 2");
 g.nodes[3].id=4;g.nodes[3].kind=ultra::PolyNote;g.nodes[3].p0=4;
 g.nodes[4].id=5;g.nodes[4].kind=ultra::MakeNote;g.nodes[4].p0=100;g.nodes[4].p1=10;
 g.edges[0]={1,0,2,0};g.edges[1]={1,1,2,1};g.edges[2]={2,0,3,0};g.edges[3]={2,1,3,1};g.edges[4]={5,0,4,0};
 ultra::CanvasPlan plan{};assert(ultra::compile_canvas(g,plan));
 auto runtime=std::make_unique<ultra::CanvasRuntime>();runtime->reset(plan);
 Realtime guard;auto pitch=ultra::canvas_scalar(60,0);
 assert(runtime->event(1,5,0,pitch,0,discard));assert(runtime->active_voice_count()==1);
 const auto filtered=runtime->signal_sample(0,0,1,discard,false,{.25,.25});assert(filtered[0]!=0);
 assert(runtime->musical_discontinuity());assert(runtime->active_voice_count()==0);
 assert(tick(*runtime)[0]==0);
 assert(runtime->event(1,4,0,message(60,100),0,discard));
 for(unsigned frame=0;frame<1000;++frame){runtime->begin_callback();assert(runtime->sample(0,discard));tick(*runtime);}
 assert(runtime->active_voice_count()==1);
}
struct ClockOwner {unsigned samples=0,releases=0;uint64_t last=0;bool fail_release=false;};
bool clock_note(void*,unsigned,unsigned,uint64_t)noexcept{return true;}
bool clock_parameter(void*,unsigned,double,uint64_t)noexcept{return true;}
bool clock_sample(void* raw,double* l,double* r,uint64_t frame)noexcept{
 auto& owner=*static_cast<ClockOwner*>(raw);assert(frame==owner.samples);owner.last=frame;++owner.samples;*l=*r=.25;return true;
}
bool clock_release(void* raw,uint64_t frame)noexcept{
 auto& owner=*static_cast<ClockOwner*>(raw);assert(frame==owner.samples);++owner.releases;return !owner.fail_release;
}
void continuous_time_and_conservative_teardown(){
 auto g=graph();g.node_count=4;g.edge_count=4;
 g.nodes[2].id=3;g.nodes[2].kind=ultra::Snapshot;
 g.nodes[3].id=4;g.nodes[3].kind=ultra::Number;
 g.edges[2]={1,0,3,0};g.edges[3]={3,0,4,0};
 ultra::CanvasPlan plan{};assert(ultra::compile_canvas(g,plan));
 auto runtime=std::make_unique<ultra::CanvasRuntime>();runtime->reset(plan);ClockOwner owner;
 assert(runtime->bind_external(1,{&owner,clock_note,clock_parameter,clock_sample,nullptr,false,clock_release}));
 {
  Realtime guard;
  for(unsigned frame=0;frame<130;++frame){if(frame%3==0)assert(runtime->musical_discontinuity());assert(tick(*runtime)[0]==.25);}
  assert(owner.samples==130&&owner.last==129&&owner.releases==44);
  assert(runtime->event(1,3,0,{},0,discard));assert(runtime->value(3)==.25);
  runtime->reset(plan);const auto samples=owner.samples;
  assert(tick(*runtime)[0]==0&&owner.samples==samples);
  assert(!runtime->musical_discontinuity());
 }
 runtime->recover();runtime->reset(plan);owner={};
 assert(runtime->bind_external(1,{&owner,clock_note,clock_parameter,clock_sample,nullptr,false,clock_release}));
 {
  Realtime guard;
  assert(runtime->stop(0,discard));assert(tick(*runtime)[0]==0);assert(!runtime->musical_discontinuity());
 }
 runtime->recover();runtime->reset(plan);owner={};owner.fail_release=true;
 assert(runtime->bind_external(1,{&owner,clock_note,clock_parameter,clock_sample,nullptr,false,clock_release}));
 {
  Realtime guard;
  assert(!runtime->musical_discontinuity());assert(runtime->failed());owner.fail_release=false;
  runtime->recover();assert(!runtime->musical_discontinuity());assert(tick(*runtime)[0]==0&&owner.samples==0);
 }
 runtime->recover();runtime->reset(plan);owner={};
 assert(runtime->bind_external(1,{&owner,clock_note,clock_parameter,clock_sample,nullptr,false}));
 {Realtime guard;assert(!runtime->musical_discontinuity());assert(owner.samples==0&&owner.releases==0);}
 assert(runtime->unbind_external(1));
}
void release_preflight_is_root_wide(){
 auto g=graph();g.node_count=3;g.nodes[2].id=3;g.nodes[2].kind=ultra::ExternalInstrument;
 ultra::CanvasPlan plan{};assert(ultra::compile_canvas(g,plan));
 auto runtime=std::make_unique<ultra::CanvasRuntime>();runtime->reset(plan);ClockOwner first,second;
 assert(runtime->bind_external(1,{&first,clock_note,clock_parameter,clock_sample,nullptr,false,clock_release}));
 assert(runtime->bind_external(3,{&second,clock_note,clock_parameter,clock_sample,nullptr,false}));
 Realtime guard;assert(!runtime->musical_discontinuity());
 assert(first.releases==0&&second.releases==0&&runtime->failed());
 runtime->recover();assert(tick(*runtime)[0]==0&&first.samples==0&&second.samples==0);
}
}
extern "C" {
UltraExternalDevice* ultra_external_device_open(const char*,const char*,char*,size_t){assert(!realtime&&opened<devices.size());auto* p=new UltraExternalDevice;devices[opened++]=p;return p;}
void ultra_external_device_close(UltraExternalDevice* p){assert(!realtime);if(p){++closed;delete p;}}
uint32_t ultra_external_device_parameter_count(const UltraExternalDevice*){return 203;}
int ultra_external_device_parameter(const UltraExternalDevice*,uint32_t index,UltraExternalParameter* p){if(index>=203||!p)return 0;*p=ultra::AnalogLiveDeviceDescriptors[index];return 1;}
int ultra_external_device_set_parameter(UltraExternalDevice*,uint32_t,float){assert(!realtime);++writes;return 1;}
int ultra_external_device_reset(UltraExternalDevice*){assert(!realtime);++resets;return 1;}
int ultra_external_device_render(UltraExternalDevice* p,uint32_t frames,float* l,float* r,const UltraExternalMidi* events,uint32_t count){
 assert(frames==1&&count<=16);++p->renders;if(p->render_failure)return 0;p->count=count;
 for(unsigned i=0;i<count;++i){p->last[i]=events[i];p->held[events[i].data1]=events[i].status==0x90&&events[i].data2;}
 bool held=false;for(bool value:p->held)held|=value;*l=*r=held?.25f:0.f;return 1;
}
const char* ultra_external_device_error(const UltraExternalDevice*){return "synthetic adapter error";}
}
int main(){
 deterministic_release_and_sibling();sixteen_record_bound_and_retrigger();refused_notes_quarantine();
 full_queue_and_render_failure_quarantine();fault_requires_fresh_bank_and_sustain_is_rejected();
 local_voices_filters_and_timers();continuous_time_and_conservative_teardown();release_preflight_is_root_wide();
 assert(opened==closed&&resets==0);
 std::puts("PASS: bounded native musical release, continuous ownership/time, ledger/queue refusal and conservative teardown");
}
