#include "../src-tauri/native/backend.h"
#include "../src-tauri/native/patch_graph.h"
#include <algorithm>
#include <array>
#include <cassert>
#include <chrono>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <vector>

namespace {
uint64_t revision=0;
UltraCanvasNode node(unsigned id,unsigned kind,double p0=0,const char* text="") {
 UltraCanvasNode result{};result.id=id;result.kind=kind;result.p0=p0;std::strcpy(result.text,text);return result;
}
UltraCanvasGraph constant(const char* values,const char* channels="1 2") {
 UltraCanvasGraph graph{};graph.revision=++revision;graph.node_count=3;graph.edge_count=4;
 graph.nodes[0]=node(1,38,0,values);graph.nodes[1]=node(2,39);graph.nodes[2]=node(3,49,0,channels);
 graph.edges[0]={1,0,2,0};graph.edges[1]={1,1,2,0};graph.edges[2]={2,0,3,0};graph.edges[3]={2,0,3,1};
 if(!std::strchr(channels,' '))graph.edge_count=3;
 return graph;
}
void close_documents() { for(unsigned document=0;document<16;++document)assert(ultra_canvas_close_document(document)); }
std::vector<float> wave(unsigned block) {
 ultra_audio_stop();close_documents();ultra_audio_routes(3);assert(ultra_external_start());
 UltraCanvasGraph graph{};graph.revision=++revision;graph.node_count=4;graph.edge_count=4;
 graph.nodes[0]=node(1,43,1000);graph.nodes[1]=node(2,47);graph.nodes[2]=node(3,41);graph.nodes[3]=node(4,49,0,"1 2");
 graph.edges[0]={1,0,3,0};graph.edges[1]={2,0,3,1};graph.edges[2]={3,0,4,0};graph.edges[3]={3,0,4,1};
 assert(ultra_canvas_install_document(0,&graph));
 UltraCanvasMessage ramp{};ramp.count=2;ramp.values[0]=0.25;ramp.values[1]=10;
 assert(ultra_canvas_message_document(0,graph.revision,2,0,&ramp));
 std::array<float,1024> left{},right{};std::vector<float> result;
 for(unsigned frame=0;frame<4096;) {
  const unsigned count=std::min(block,4096-frame);assert(ultra_external_render(count,left.data(),right.data()));
  for(unsigned i=0;i<count;++i) {
   const unsigned sample=frame+i;
   const double expected=sample<64?0.:std::cos(6.2831853071795864769*sample/48.)*0.25*std::min(1.,sample/480.);
   assert(left[i]==right[i]&&std::isfinite(left[i])&&std::abs(left[i]-expected)<1e-6);
   result.push_back(left[i]);
  }
  frame+=count;
 }
 ultra_audio_stop();return result;
}
std::vector<float> cross_document(unsigned source) {
 ultra_audio_stop();close_documents();ultra_audio_routes(3);assert(ultra_external_start());
 UltraCanvasGraph sender{};sender.revision=++revision;sender.node_count=3;sender.edge_count=2;
 sender.nodes[0]=node(1,38,0,"0.25");sender.nodes[1]=node(2,48,2);sender.nodes[2]=node(3,26,0,"abi-signal-order");
 sender.edges[0]={1,0,2,0};sender.edges[1]={2,0,3,0};
 UltraCanvasGraph target{};target.revision=++revision;target.node_count=3;target.edge_count=3;
 target.nodes[0]=node(1,27,0,"abi-signal-order");target.nodes[1]=node(2,38,0,"0");target.nodes[2]=node(3,49,0,"1 2");
 target.edges[0]={1,0,2,0};target.edges[1]={2,0,3,0};target.edges[2]={2,0,3,1};
 assert(ultra_canvas_install_document(source,&sender));assert(ultra_canvas_install_document(1-source,&target));
 std::array<float,256> left{},right{};assert(ultra_external_render(left.size(),left.data(),right.data()));
 for(unsigned i=0;i<left.size();++i)assert(left[i]==right[i]&&left[i]==(i<128?0.f:0.25f));
 ultra_audio_stop();return {left.begin(),left.end()};
}
void global_restart() {
 ultra_audio_stop();close_documents();ultra_audio_routes(3);assert(ultra_external_start());
 UltraCanvasGraph graph{};graph.revision=++revision;graph.node_count=3;graph.edge_count=2;
 graph.nodes[0]=node(1,43,1000);graph.nodes[1]=node(2,44,1000);graph.nodes[2]=node(3,49,0,"1 2");
 graph.edges[0]={1,0,3,0};graph.edges[1]={2,0,3,1};assert(ultra_canvas_install_document(0,&graph));
 std::array<float,256> left{},right{};assert(ultra_external_render(left.size(),left.data(),right.data()));
 // Mirror the desktop's global Stop path. Restart resumes continuous DSP
 // without an extra control event, resetting Cycle but retaining Phasor.
 ultra_canvas_stop_all();ultra_audio_stop();assert(ultra_external_start());
 assert(ultra_external_render(left.size(),left.data(),right.data()));
 for(unsigned i=64;i<left.size();++i){
  assert(std::abs(left[i]-std::cos(6.2831853071795864769*i/48.))<1e-6);
  assert(std::abs(right[i]-std::fmod((256.+i)/48.,1.))<1e-6);
 }
}
void benchmark() {
 for(unsigned documents:{1u,16u})for(unsigned block:{64u,512u}){
  ultra_audio_stop();close_documents();ultra_audio_routes(3);assert(ultra_external_start());
  for(unsigned document=0;document<documents;++document){
   UltraCanvasGraph graph{};graph.revision=++revision;graph.node_count=3;graph.edge_count=3;
   graph.nodes[0]=node(1,43,440+document);graph.nodes[1]=node(2,41,0.05);graph.nodes[2]=node(3,49,0,"1 2");
   graph.edges[0]={1,0,2,0};graph.edges[1]={2,0,3,0};graph.edges[2]={2,0,3,1};
   assert(ultra_canvas_install_document(document,&graph));
  }
  std::array<float,512> left{},right{};
  for(unsigned i=0;i<64;++i)assert(ultra_external_render(block,left.data(),right.data()));
  const auto start=std::chrono::steady_clock::now();unsigned frames=0;
  while(frames<96000){assert(ultra_external_render(block,left.data(),right.data()));frames+=block;}
  const double elapsed=std::chrono::duration<double>(std::chrono::steady_clock::now()-start).count();
  std::printf("{\"documents\":%u,\"block_frames\":%u,\"frames\":%u,\"audio_seconds\":%.9g,\"elapsed_seconds\":%.9g,\"realtime_ratio\":%.9g}\n",documents,block,frames,frames/48000.,elapsed,frames/48000./elapsed);
 }
 ultra_audio_stop();close_documents();
}
}
int main(int argc,char** argv) {
 if(argc==2&&std::strcmp(argv[1],"--benchmark")==0){benchmark();return 0;}
 ultra_audio_stop();close_documents();ultra_audio_routes(3);assert(ultra_external_start());
 const auto first=constant("0.25 -0.125");assert(ultra_canvas_install_document(0,&first));
 std::array<float,512> left{},right{};
 auto render=[&]{assert(ultra_external_render(left.size(),left.data(),right.data()));};
 render();for(unsigned i=0;i<left.size();++i)assert(left[i]==right[i]&&left[i]==(i<64?0.f:0.125f));
 const auto second=constant("0.5 -0.125","1");assert(ultra_canvas_install_document(1,&second));
 render();for(unsigned i=64;i<left.size();++i)assert(left[i]==0.5f&&right[i]==0.125f);
 assert(ultra_canvas_stop_document(0));render();render();
 for(unsigned i=0;i<left.size();++i)assert(left[i]==0.375f&&right[i]==0.f);
 UltraCanvasMessage value{};value.count=1;value.values[0]=0.5;
 assert(ultra_canvas_message_document(0,first.revision,1,0,&value));render();
 for(unsigned i=64;i<left.size();++i)assert(left[i]==0.75f&&right[i]==0.375f);
 close_documents();ultra_audio_stop();
 const auto expected=wave(64);for(unsigned block:{1u,127u,256u,1024u})assert(wave(block)==expected);
 assert(cross_document(0)==cross_document(1));global_restart();
 // A queued replacement/cold edit must retain its values without resuming
 // continuous DSP across a later scoped Stop boundary.
 const auto replacement=constant("0.25 0.25");
 assert(ultra_canvas_install_document(0,&replacement));
 assert(ultra_canvas_param_hot_document(0,replacement.revision,2,0,0.5,0));
 assert(ultra_canvas_stop_document(0));render();render();
 for(unsigned i=0;i<left.size();++i)assert(left[i]==0.f&&right[i]==0.f);
 UltraCanvasStatus stopped{};ultra_canvas_status_document(0,&stopped);
 assert(stopped.revision==replacement.revision);

 close_documents();ultra_audio_stop();
 std::puts("PASS: native MSP sums, ramps, document Stop/resume, global DSP restart, cross-window sample ordering and callback partition invariance");
}
