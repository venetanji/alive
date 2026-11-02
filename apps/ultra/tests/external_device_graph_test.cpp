#include "../src-tauri/native/patch_graph.hpp"
#include "../src-tauri/native/external_device/external_device.h"
#include <cassert>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <memory>
#include <vector>

namespace {
using namespace ultra;
struct Owner {
 UltraExternalDevice* device=nullptr;
 UltraExternalMidi pending{};
 unsigned count=0;
 unsigned notes=0,writes=0,samples=0;
};
bool note(void* raw,unsigned pitch,unsigned velocity,uint64_t)noexcept {
 auto& owner=*static_cast<Owner*>(raw);
 if(owner.count)return false;
 owner.pending={0,uint8_t(velocity?0x90:0x80),uint8_t(pitch),uint8_t(velocity),0};
 owner.count=1;++owner.notes;return true;
}
bool parameter(void* raw,unsigned index,double value,uint64_t)noexcept {
 auto& owner=*static_cast<Owner*>(raw);++owner.writes;
 return ultra_external_device_set_parameter(owner.device,index,float(value));
}
bool sample(void* raw,double* left,double* right,uint64_t)noexcept {
 auto& owner=*static_cast<Owner*>(raw);float l=0,r=0;
 const bool ok=ultra_external_device_render(owner.device,1,&l,&r,&owner.pending,owner.count);
 owner.count=0;++owner.samples;*left=l;*right=r;return ok;
}
bool clear(void*,uint64_t)noexcept {return false;}
constexpr auto discard=[](alive::Event){return true;};
UltraCanvasNode node(unsigned id,unsigned kind,double value=0) {
 UltraCanvasNode result{};result.id=id;result.kind=kind;result.p0=value;return result;
}
UltraCanvasGraph graph(double gain) {
 UltraCanvasGraph g{};g.revision=1;g.node_count=5;g.edge_count=4;
 g.nodes[0]=node(1,68);
 // Exercise the bounded enum at descriptor 29; audible semantics remain unqualified.
 g.nodes[1]=node(2,69,2);g.nodes[1].p1=29;g.nodes[1].p2=1;
 g.nodes[2]=node(3,SignalMultiply,gain);g.nodes[3]=node(4,SignalMultiply,gain);
 g.nodes[4]=node(5,SignalDac);std::strcpy(g.nodes[4].text,"1 2");
 g.edges[0]={1,0,3,0};g.edges[1]={1,1,4,0};
 g.edges[2]={3,0,5,0};g.edges[3]={4,0,5,1};return g;
}
void initialize(UltraExternalDevice* device) {
 for(unsigned i=0;i<ultra_external_device_parameter_count(device);++i) {
  UltraExternalParameter p{};assert(ultra_external_device_parameter(device,i,&p));
  if(!p.initialized)continue;
  float value=(p.minimum+p.maximum)*.5f;
  if(p.type==3)value=p.maximum==1?1:std::round(value);
  assert(ultra_external_device_set_parameter(device,i,value));
 }
}
struct Result {double energy=0;float peak=0;};
Result run(const char* path,const char* hash,bool enabled,double gain,bool edit) {
 char error[256]{};
 std::unique_ptr<UltraExternalDevice,decltype(&ultra_external_device_close)> device(
  ultra_external_device_open(path,hash,error,sizeof(error)),ultra_external_device_close);
 if(!device){std::fprintf(stderr,"adapter: %s\n",error);std::abort();}
 assert(ultra_external_device_parameter_count(device.get())==203);initialize(device.get());
 CanvasPlan plan{};assert(compile_canvas(graph(gain),plan));
 auto runtime=std::make_unique<CanvasRuntime>();runtime->reset(plan);
 Owner owner{device.get()};
 assert(runtime->bind_external(1,{&owner,note,parameter,sample,clear,false}));
 CanvasMessage midi{};midi.count=2;midi.values[0]=60;midi.values[1]=100;
 Result result;
 for(unsigned frame=0;frame<48128;++frame) {
  runtime->begin_callback();
  if(enabled&&frame==0)assert(runtime->event(1,1,0,midi,0,discard));
  if(edit&&frame==12000) {
   auto changed=runtime->plan();assert(change_canvas_param(changed,2,0,1));
   assert(runtime->param(changed,2,0,1,0,discard));
  }
  if(enabled&&frame==24000){midi.values[1]=0;assert(runtime->event(1,1,0,midi,0,discard));}
  assert(runtime->sample(0,discard));
  const auto pcm=runtime->signal_sample(0,0,1,discard);
  for(double value:pcm){assert(std::isfinite(value));result.energy+=value*value;result.peak=std::fmax(result.peak,float(std::fabs(value)));}
 }
 assert(owner.samples==48128&&owner.notes==(enabled?2u:0u)&&owner.writes==(edit?1u:0u));
 assert(!runtime->failed());
 assert(runtime->stop(0,discard));
 const auto stopped=runtime->signal_sample(0,0,1,discard);assert(stopped[0]==0&&stopped[1]==0);
 assert(runtime->unbind_external(1));
 std::printf("Analog Ultra graph note=%u gain=%.3g edit=%u energy=%.12g peak=%.9g frames=%u\n",enabled,gain,edit,result.energy,result.peak,owner.samples);
 return result;
}
}
int main(int argc,char** argv) {
 assert(argc==3);
 assert(run(argv[1],argv[2],false,1,false).energy==0);
 assert(run(argv[1],argv[2],true,0,false).energy==0);
 assert(run(argv[1],argv[2],true,.5,false).energy>0);
 assert(run(argv[1],argv[2],true,.5,true).energy>0);
 std::puts("PASS: original Analog DSP in current Ultra graph, notes, gain, proxy writes and Stop");
}
