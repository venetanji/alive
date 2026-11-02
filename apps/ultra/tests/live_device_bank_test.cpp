#include "../src-tauri/native/external_device/live_device.hpp"
#include "../src-tauri/native/external_device/profiles/analog_descriptors.hpp"
#include <cassert>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <limits>
#include <atomic>
#include <thread>

// A deterministic adapter double makes ownership and transaction failures visible
// without shipping a device DLL or tying state tests to its oscillator output.
struct UltraExternalDevice {std::array<float,203> values{};bool held=false;unsigned ordinal=0;};
namespace {unsigned opened=0,closed=0,writes=0;bool reject_open=false;
enum class DescriptorMismatch { None, Index, Initialized, Module, Property, Type, Minimum, Maximum };
DescriptorMismatch mismatch=DescriptorMismatch::None;unsigned mismatch_instance=0,write_failure_instance=0;
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
UltraExternalDevice* ultra_external_device_open(const char*,const char*,char*,size_t){if(reject_open)return nullptr;auto* p=new UltraExternalDevice;p->ordinal=++opened;return p;}
void ultra_external_device_close(UltraExternalDevice* p){if(p){++closed;delete p;}}
uint32_t ultra_external_device_parameter_count(const UltraExternalDevice*){return 203;}
int ultra_external_device_parameter(const UltraExternalDevice* device,uint32_t index,UltraExternalParameter* p){
 if(index>=203||!p)return 0;*p=ultra::AnalogLiveDeviceDescriptors[index];
 if(device->ordinal==mismatch_instance&&index==202)switch(mismatch){
  case DescriptorMismatch::Index:--p->index;break;
  case DescriptorMismatch::Initialized:p->initialized=0;break;
  case DescriptorMismatch::Module:++p->tag_a;break;
  case DescriptorMismatch::Property:++p->tag_b;break;
  case DescriptorMismatch::Type:p->type=0;break;
  case DescriptorMismatch::Minimum:--p->minimum;break;
  case DescriptorMismatch::Maximum:++p->maximum;break;
  case DescriptorMismatch::None:break;
 }
 return 1;
}
int ultra_external_device_set_parameter(UltraExternalDevice* p,uint32_t index,float value){
 if(index>=203)return 0;const auto& d=ultra::AnalogLiveDeviceDescriptors[index];
 if(!std::isfinite(value)||value<d.minimum||value>d.maximum||(d.type==3&&std::trunc(value)!=value))return 0;
 if(p->ordinal==write_failure_instance&&index==1)return 0;
 p->values[index]=value;++writes;return 1;
}
int ultra_external_device_render(UltraExternalDevice* p,uint32_t frames,float* l,float* r,const UltraExternalMidi* events,uint32_t count){for(unsigned i=0;i<count;++i)p->held=events[i].status==0x90&&events[i].data2;for(unsigned i=0;i<frames;++i)l[i]=r[i]=p->held?p->values[1]:0;return 1;}
const char* ultra_external_device_error(const UltraExternalDevice*){return "test adapter error";}
}
int main(){
 auto g=graph();ultra::CanvasPlan plan{};assert(ultra::compile_canvas(g,plan));
 auto runtime=std::make_unique<ultra::CanvasRuntime>();runtime->reset(plan);
 std::array<float,203> a{},b{};a[1]=.25f;b[1]=.5f;
 std::array<UltraLiveDeviceSource,2> sources{{{1,1,203,0,profile,"test.dll",a.data()},{2,1,203,0,profile,"test.dll",b.data()}}};
 char error[256]{};
 auto bank=ultra::LiveDeviceBank::prepare(g,sources.data(),2,error,sizeof error);
 assert(bank&&opened==2);assert(bank->bind(*runtime));assert(tick(*runtime)==(std::array<double,2>{}));
 assert(runtime->event(1,1,0,note(100),0,discard));assert(tick(*runtime)==(std::array<double,2>{.25,0}));
 assert(runtime->event(1,2,0,note(100),0,discard));assert(tick(*runtime)==(std::array<double,2>{.25,.5}));
 bool descriptor_checks_passed=true;
 for(const auto variant:{DescriptorMismatch::Index,DescriptorMismatch::Initialized,DescriptorMismatch::Module,
     DescriptorMismatch::Property,DescriptorMismatch::Type,DescriptorMismatch::Minimum,DescriptorMismatch::Maximum}){
  const auto old_opened=opened,old_closed=closed,old_writes=writes;
  mismatch=variant;mismatch_instance=opened+2;
  auto rejected=ultra::LiveDeviceBank::prepare(g,sources.data(),2,error,sizeof error);
  const bool refused=!rejected;rejected.reset();mismatch=DescriptorMismatch::None;
  const bool signature_error=std::strstr(error,"descriptor signature")!=nullptr;
  const bool no_writes=writes==old_writes;
  const bool cleaned=opened==old_opened+2&&closed==old_closed+2&&opened-closed==2;
  const bool prior_usable=tick(*runtime)==(std::array<double,2>{.25,.5});
  std::printf("descriptor variant=%u refused=%u signature_error=%u no_writes=%u cleaned=%u prior_usable=%u\n",unsigned(variant),refused,signature_error,no_writes,cleaned,prior_usable);
  descriptor_checks_passed&=refused&&signature_error&&no_writes&&cleaned&&prior_usable;
 }
 if(!descriptor_checks_passed){std::fputs("FAIL: descriptor drift must reject the whole bank before any state restore and preserve prior instances\n",stderr);return 1;}
 std::array<UltraLiveDeviceParameterState,203> states{};
 assert(bank->parameters(1,states.data(),203)==203&&states[1].requested==.25f&&states[1].applied==.25f);
 a[1]=.75f;b[1]=.125f;
 const std::array<UltraLiveDeviceStateUpdate,2> updates{{{1,203,a.data()},{2,203,b.data()}}};
 const auto before=writes;assert(bank->set_states(updates.data(),2,error,sizeof error));assert(writes==before);
 assert(bank->parameters(1,states.data(),203)==203&&states[1].requested==.75f&&states[1].applied==.25f);
 assert(tick(*runtime)==(std::array<double,2>{.25,.5}));
 assert(bank->apply_pending());assert(tick(*runtime)==(std::array<double,2>{.75,.125}));
 assert(bank->parameters(1,states.data(),203)==203&&states[1].request_version==states[1].applied_version);
 a[1]=.9f;b[100]=std::numeric_limits<float>::quiet_NaN();
 assert(!bank->set_states(updates.data(),2,error,sizeof error));assert(bank->apply_pending());
 assert(tick(*runtime)==(std::array<double,2>{.75,.125}));
 b[100]=0;
 auto duplicate=updates;duplicate[1].node=1;assert(!bank->set_states(duplicate.data(),2,error,sizeof error));
 auto bad=sources;bad[1].node=1;assert(!ultra::LiveDeviceBank::prepare(g,bad.data(),2,error,sizeof error));
 bad=sources;bad[0].profile="unknown";assert(!ultra::LiveDeviceBank::prepare(g,bad.data(),2,error,sizeof error));
 assert(!ultra::LiveDeviceBank::prepare(g,sources.data(),1,error,sizeof error));
 a[1]=.25f;b[1]=.75f;assert(bank->set_states(updates.data(),2,error,sizeof error));assert(bank->apply_pending());
 std::atomic<bool> done{false};
 std::thread producer([&]{
  auto left=a,right=b;char detail[256]{};
  const std::array<UltraLiveDeviceStateUpdate,2> batch{{{1,203,left.data()},{2,203,right.data()}}};
  for(unsigned i=0;i<1000;++i){left[1]=(i&1)?.125f:.875f;right[1]=1-left[1];assert(bank->set_states(batch.data(),2,detail,sizeof detail));}
  done=true;
 });
 do{assert(bank->apply_pending());const auto pair=tick(*runtime);assert(pair[0]+pair[1]==1);}while(!done.load());
 producer.join();assert(bank->apply_pending());
 assert(bank->parameters(1,states.data(),203)==203);const auto restored=states[1].requested;
 assert(runtime->stop(0,discard));assert(tick(*runtime)==(std::array<double,2>{}));
 // Recreate under the off-thread fence, restoring commanded values without tails.
 reject_open=true;assert(!bank->rearm(*runtime,error,sizeof error));reject_open=false;
 assert(tick(*runtime)==(std::array<double,2>{}));assert(bank->rearm(*runtime,error,sizeof error));
 assert(tick(*runtime)==(std::array<double,2>{}));
 assert(runtime->event(1,1,0,note(100),0,discard));assert(tick(*runtime)==(std::array<double,2>{restored,0}));
 // A partial foreign write faults the bank until stopped reconstruction restores
 // the complete requested batch; it must not publish a partially applied batch.
 a[1]=.625f;b[1]=.375f;assert(bank->set_states(updates.data(),2,error,sizeof error));
 const auto before_failure=writes;write_failure_instance=opened;
 assert(!bank->apply_pending());assert(writes==before_failure+1);
 assert(bank->parameters(1,states.data(),203)==203&&states[1].requested==.625f&&states[1].applied==restored);
 assert(states[1].request_version!=states[1].applied_version);
 assert(!bank->apply_pending());assert(writes==before_failure+1);
 assert(runtime->stop(0,discard));write_failure_instance=0;
 assert(bank->rearm(*runtime,error,sizeof error));assert(tick(*runtime)==(std::array<double,2>{}));
 assert(bank->parameters(1,states.data(),203)==203&&states[1].requested==.625f&&states[1].applied==.625f);
 assert(states[1].request_version==states[1].applied_version);
 assert(runtime->event(1,1,0,note(100),0,discard));assert(runtime->event(1,2,0,note(100),0,discard));
 assert(tick(*runtime)==(std::array<double,2>{.625,.375}));
 runtime->unbind_external(1);runtime->unbind_external(2);bank.reset();assert(opened==closed);
 std::puts("PASS: live device bank rejects descriptor drift before writes, owns independent instances, validates atomic edits, and reconstructs stopped/faulted sources");
}
