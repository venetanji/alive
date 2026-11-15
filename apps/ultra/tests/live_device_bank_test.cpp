#include "../src-tauri/native/external_device/live_device.hpp"
#include <cassert>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <limits>
#include <atomic>
#include <thread>

// A deterministic adapter double makes ownership and transaction failures visible
// without shipping a device DLL or tying state tests to its oscillator output.
struct UltraExternalDevice {std::array<float,203> values{};bool held=false;};
namespace {unsigned opened=0,closed=0,writes=0;bool reject_open=false;
constexpr const char* profile="live12-analog-v1";
auto discard=[](alive::Event){return true;};
UltraCanvasGraph graph(){
 UltraCanvasGraph g{};g.revision=1;g.node_count=3;g.edge_count=2;
 g.nodes[0].id=1;g.nodes[0].kind=68;g.nodes[1].id=2;g.nodes[1].kind=68;
 g.nodes[2].id=3;g.nodes[2].kind=ultra::SignalDac;std::strcpy(g.nodes[2].text,"1 2");
 g.edges[0]={1,0,3,0};g.edges[1]={2,0,3,1};return g;
}
ultra::CanvasMessage note(unsigned velocity){ultra::CanvasMessage n{};n.count=2;n.values[0]=60;n.values[1]=velocity;return n;}
std::array<double,2> tick(ultra::CanvasRuntime& runtime){runtime.begin_callback();assert(runtime.sample(0,discard));return runtime.signal_sample(0,0,1,discard);}
}
extern "C" {
UltraExternalDevice* ultra_external_device_open(const char*,const char*,char*,size_t){if(reject_open)return nullptr;++opened;return new UltraExternalDevice;}
void ultra_external_device_close(UltraExternalDevice* p){if(p){++closed;delete p;}}
uint32_t ultra_external_device_parameter_count(const UltraExternalDevice*){return 203;}
int ultra_external_device_parameter(const UltraExternalDevice*,uint32_t index,UltraExternalParameter* p){if(index>=203||!p)return 0;*p={index,1,100,int32_t(index),0,0,1,0};return 1;}
int ultra_external_device_set_parameter(UltraExternalDevice* p,uint32_t index,float value){if(index>=203||!std::isfinite(value)||value<0||value>1)return 0;p->values[index]=value;++writes;return 1;}
int ultra_external_device_render(UltraExternalDevice* p,uint32_t frames,float* l,float* r,const UltraExternalMidi* events,uint32_t count){for(unsigned i=0;i<count;++i)p->held=events[i].status==0x90&&events[i].data2;for(unsigned i=0;i<frames;++i)l[i]=r[i]=p->held?p->values[0]:0;return 1;}
const char* ultra_external_device_error(const UltraExternalDevice*){return "test adapter error";}
}
int main(){
 auto g=graph();ultra::CanvasPlan plan{};assert(ultra::compile_canvas(g,plan));
 auto runtime=std::make_unique<ultra::CanvasRuntime>();runtime->reset(plan);
 std::array<float,203> a{},b{};a.fill(.25f);b.fill(.5f);
 std::array<UltraLiveDeviceSource,2> sources{{{1,1,203,0,profile,"test.dll",a.data()},{2,1,203,0,profile,"test.dll",b.data()}}};
 char error[256]{};
 auto bank=ultra::LiveDeviceBank::prepare(g,sources.data(),2,error,sizeof error);
 assert(bank&&opened==2);assert(bank->bind(*runtime));assert(tick(*runtime)==(std::array<double,2>{}));
 assert(runtime->event(1,1,0,note(100),0,discard));assert(tick(*runtime)==(std::array<double,2>{.25,0}));
 assert(runtime->event(1,2,0,note(100),0,discard));assert(tick(*runtime)==(std::array<double,2>{.25,.5}));
 std::array<UltraLiveDeviceParameterState,203> states{};
 assert(bank->parameters(1,states.data(),203)==203&&states[0].requested==.25f&&states[0].applied==.25f);
 a[0]=.75f;b[0]=.125f;
 const std::array<UltraLiveDeviceStateUpdate,2> updates{{{1,203,a.data()},{2,203,b.data()}}};
 const auto before=writes;assert(bank->set_states(updates.data(),2,error,sizeof error));assert(writes==before);
 assert(bank->parameters(1,states.data(),203)==203&&states[0].requested==.75f&&states[0].applied==.25f);
 assert(tick(*runtime)==(std::array<double,2>{.25,.5}));
 assert(bank->apply_pending());assert(tick(*runtime)==(std::array<double,2>{.75,.125}));
 assert(bank->parameters(1,states.data(),203)==203&&states[0].request_version==states[0].applied_version);
 a[0]=.9f;b[100]=std::numeric_limits<float>::quiet_NaN();
 assert(!bank->set_states(updates.data(),2,error,sizeof error));assert(bank->apply_pending());
 assert(tick(*runtime)==(std::array<double,2>{.75,.125}));
 b[100]=.5f;
 auto duplicate=updates;duplicate[1].node=1;assert(!bank->set_states(duplicate.data(),2,error,sizeof error));
 auto bad=sources;bad[1].node=1;assert(!ultra::LiveDeviceBank::prepare(g,bad.data(),2,error,sizeof error));
 bad=sources;bad[0].profile="unknown";assert(!ultra::LiveDeviceBank::prepare(g,bad.data(),2,error,sizeof error));
 assert(!ultra::LiveDeviceBank::prepare(g,sources.data(),1,error,sizeof error));
 a[0]=.25f;b[0]=.75f;assert(bank->set_states(updates.data(),2,error,sizeof error));assert(bank->apply_pending());
 std::atomic<bool> done{false};
 std::thread producer([&]{
  auto left=a,right=b;char detail[256]{};
  const std::array<UltraLiveDeviceStateUpdate,2> batch{{{1,203,left.data()},{2,203,right.data()}}};
  for(unsigned i=0;i<1000;++i){left[0]=(i&1)?.125f:.875f;right[0]=1-left[0];assert(bank->set_states(batch.data(),2,detail,sizeof detail));}
  done=true;
 });
 do{assert(bank->apply_pending());const auto pair=tick(*runtime);assert(pair[0]+pair[1]==1);}while(!done.load());
 producer.join();assert(bank->apply_pending());
 assert(bank->parameters(1,states.data(),203)==203);const auto restored=states[0].requested;
 assert(runtime->stop(0,discard));assert(tick(*runtime)==(std::array<double,2>{}));
 // Recreate under the off-thread fence, restoring commanded values without tails.
 reject_open=true;assert(!bank->rearm(*runtime,error,sizeof error));reject_open=false;
 assert(tick(*runtime)==(std::array<double,2>{}));assert(bank->rearm(*runtime,error,sizeof error));
 assert(tick(*runtime)==(std::array<double,2>{}));
 assert(runtime->event(1,1,0,note(100),0,discard));assert(tick(*runtime)==(std::array<double,2>{restored,0}));
 runtime->unbind_external(1);runtime->unbind_external(2);bank.reset();assert(opened==closed);
 std::puts("PASS: live device bank owns independent instances, validates atomic full-state edits, and recreates stopped sources without tails");
}
