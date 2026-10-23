#include "../src-tauri/native/canvas_workspace.hpp"
#include <cassert>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <vector>

using namespace ultra;
namespace {
constexpr unsigned sig=38,add_signal=39,subtract_signal=40,multiply_signal=41,divide_signal=42,cycle=43,phasor=44,noise=45,clip=46,line_signal=47,snapshot=48,dac_signal=49;
auto discard=[](alive::Event){return true;};
UltraCanvasNode node(unsigned id,unsigned kind,double p0=0,double p1=0,const char* text=""){
 UltraCanvasNode result{};result.id=id;result.kind=kind;result.p0=p0;result.p1=p1;std::strcpy(result.text,text);return result;
}
UltraCanvasGraph output_graph(unsigned kind,double p0=0,double p1=0,const char* text=""){
 UltraCanvasGraph result{};result.revision=1;result.node_count=2;result.edge_count=2;
 result.nodes[0]=node(1,kind,p0,p1,text);result.nodes[1]=node(2,dac_signal,0,0,"1 2");result.edges[0]={1,0,2,0};result.edges[1]={1,0,2,1};return result;
}
CanvasMessage literal(const char* text){CanvasMessage result{};assert(canvas_parse_message(text,result));return result;}
void close(double actual,double expected,double tolerance=1e-12){if(std::abs(actual-expected)>tolerance)std::fprintf(stderr,"actual %.17g expected %.17g\n",actual,expected);assert(std::abs(actual-expected)<=tolerance);}
std::array<double,2> tick(CanvasRuntime& runtime,unsigned offset=1){assert(runtime.sample(offset-1,discard));return runtime.signal_sample(0,0,offset,discard);}
void topology_and_validation(){
 CanvasPlan plan{};auto graph=output_graph(sig,0,0,"0.25 0.5 -1");assert(compile_canvas(graph,plan));
 assert(canvas_inlets(graph.nodes[0])==1&&canvas_outlets(graph.nodes[0])==3);
 assert(canvas_inlets(graph.nodes[1])==2&&canvas_outlets(graph.nodes[1])==0);
 graph.nodes[0].text[0]=0;assert(!compile_canvas(graph,plan));std::strcpy(graph.nodes[0].text,"0.25 apple");assert(!compile_canvas(graph,plan));
 for(unsigned kind=add_signal;kind<=line_signal;kind++){
  graph=output_graph(kind,kind==clip?-1:0,kind==clip?1:0);assert(compile_canvas(graph,plan));
  assert(canvas_inlets(graph.nodes[0])==(kind==noise?1u:kind==clip?3u:2u));
  graph.nodes[0].p5=1;assert(!compile_canvas(graph,plan));
 }
 graph=output_graph(sig,0,0,"1");std::strcpy(graph.nodes[1].text,"3");assert(!compile_canvas(graph,plan));
 std::strcpy(graph.nodes[1].text,"1 2 1 2 1 2 1 2");assert(compile_canvas(graph,plan)&&canvas_inlets(graph.nodes[1])==8);
 graph.nodes[0]=node(1,snapshot);graph.nodes[1]=node(2,Print,0,0,"snapshot");graph.edge_count=1;assert(compile_canvas(graph,plan));
}
void constants_and_arithmetic(){
 auto graph=output_graph(sig,0,0,"0.25 0.5 -1");graph.edges[1].outlet=1;CanvasPlan plan{};assert(compile_canvas(graph,plan));CanvasRuntime runtime;runtime.reset(plan);
 auto sample=tick(runtime);close(sample[0],.25);close(sample[1],.5);
 assert(runtime.event(1,1,0,literal("0.75 -0.25 9"),0,discard));sample=tick(runtime);close(sample[0],.75);close(sample[1],-.25);
 assert(runtime.event(1,1,0,literal("set 1 0.125"),0,discard));sample=tick(runtime);close(sample[0],.75);close(sample[1],.125);
 for(unsigned kind=add_signal;kind<=divide_signal;kind++){
  graph=output_graph(kind,10);assert(compile_canvas(graph,plan));runtime.reset(plan);
  const double no_signal[]={10,-10,0,0};close(tick(runtime)[0],no_signal[kind-add_signal]);
  assert(runtime.event(1,1,0,literal("7"),0,discard));const double changed[]={7,-7,0,0};close(tick(runtime)[0],changed[kind-add_signal]);
  graph.nodes[2]=node(3,sig,0,0,"6");graph.node_count=3;graph.edges[2]={3,0,1,0};graph.edge_count=3;assert(compile_canvas(graph,plan));runtime.reset(plan);
  const double left[]={16,-4,60,.6};close(tick(runtime)[0],left[kind-add_signal]);
  graph.edges[2].inlet=1;assert(compile_canvas(graph,plan));runtime.reset(plan);
  const double right[]={16,4,60,10./6.};close(tick(runtime)[0],right[kind-add_signal]);
  graph.nodes[3]=node(4,sig,0,0,"3");graph.nodes[4]=node(5,sig,0,0,"2");graph.nodes[5]=node(6,sig,0,0,"1");graph.node_count=6;
  graph.edges[2]={3,0,1,0};graph.edges[3]={4,0,1,0};graph.edges[4]={5,0,1,1};graph.edges[5]={6,0,1,1};graph.edge_count=6;assert(compile_canvas(graph,plan));runtime.reset(plan);
  const double summed[]={12,6,27,3};close(tick(runtime)[0],summed[kind-add_signal]);
  assert(runtime.event(1,1,1,literal("99"),0,discard));close(tick(runtime)[0],summed[kind-add_signal]);
 }
 graph=output_graph(divide_signal);assert(compile_canvas(graph,plan));runtime.reset(plan);close(tick(runtime)[0],0);
}
void legacy_gain_fanout(){
 UltraCanvasGraph graph{};graph.revision=1;graph.node_count=5;graph.edge_count=5;
 graph.nodes[0]=node(1,Voice,8,28);graph.nodes[1]=node(2,Gain,127);graph.nodes[2]=node(3,Gain,63);graph.nodes[3]=node(4,Join);graph.nodes[4]=node(5,Dac);
 graph.edges[0]={1,0,2,0};graph.edges[1]={1,0,3,0};graph.edges[2]={2,0,4,0};graph.edges[3]={3,0,4,0};graph.edges[4]={4,0,5,0};
 CanvasPlan plan{};assert(compile_canvas(graph,plan));CanvasRuntime runtime;runtime.reset(plan);std::vector<alive::Event> events;auto emit=[&](alive::Event event){events.push_back(event);return true;};
 assert(runtime.configure_voices(0,emit));unsigned levels=0;for(const auto& event:events)if(event.kind==alive::Kind::Level){assert(event.value==127);++levels;}assert(levels==2);
 auto sample=runtime.signal_sample(.4,.9,1,emit);close(sample[0],.4*(1.+63./127.));close(sample[1],0);
 events.clear();assert(runtime.event(1,3,1,literal("0"),0,emit)&&events.empty());sample=runtime.signal_sample(.4,.9,2,emit);close(sample[0],.4);
}
void oscillator_clip_and_line(){
 CanvasPlan plan{};CanvasRuntime runtime;auto graph=output_graph(cycle,1000);assert(compile_canvas(graph,plan));runtime.reset(plan);
 for(unsigned i=0;i<97;i++)close(tick(runtime)[0],std::cos(6.283185307179586*double(i)/48.),2e-8);
 graph=output_graph(phasor,1000);assert(compile_canvas(graph,plan));runtime.reset(plan);for(unsigned i=0;i<48;i++)close(tick(runtime)[0],double(i)/48.);
 assert(runtime.event(1,1,1,literal("0.25"),0,discard));close(tick(runtime)[0],.25);
 graph=output_graph(clip,-1,1);graph.nodes[2]=node(3,sig,0,0,"2");graph.node_count=3;graph.edges[2]={3,0,1,0};graph.edge_count=3;assert(compile_canvas(graph,plan));runtime.reset(plan);close(tick(runtime)[0],1);
 assert(runtime.event(1,3,0,literal("-2"),0,discard));close(tick(runtime)[0],-1);
 graph=output_graph(line_signal);graph.nodes[2]=node(3,Print,0,0,"done");graph.node_count=3;graph.edges[2]={1,1,3,0};graph.edge_count=3;assert(compile_canvas(graph,plan));runtime.reset(plan);
 assert(runtime.event(1,1,0,literal("1 10"),0,discard));for(unsigned i=0;i<=480;i++)close(tick(runtime)[0],double(i)/480.);close(tick(runtime)[0],1);assert(runtime.pulses(2)==1);
}
void phasor_saved_and_live_phase(){
 auto graph=output_graph(phasor,0,.25);CanvasPlan plan{};assert(compile_canvas(graph,plan));CanvasRuntime runtime;runtime.reset(plan);close(tick(runtime)[0],.25);
 assert(change_canvas_param(plan,1,1,.5));assert(runtime.param(plan,1,1,.5,0,discard));close(tick(runtime)[0],.5);
 assert(change_canvas_param(plan,1,1,-.25));assert(runtime.param(plan,1,1,-.25,0,discard));close(tick(runtime)[0],.75);
 assert(runtime.event(1,1,1,literal("0.125"),0,discard));close(tick(runtime)[0],.125);close(runtime.plan().graph.nodes[0].p1,.125);
 graph.nodes[2]=node(3,sig,0,0,"1");graph.node_count=3;graph.edges[graph.edge_count++]={3,0,1,1};assert(compile_canvas(graph,plan));runtime.reset(plan);
 assert(runtime.event(1,1,1,literal("0.625"),0,discard));close(tick(runtime)[0],.625);close(tick(runtime)[0],.625);
}
void snapshot_feedback_and_stopping(){
 auto graph=output_graph(sig,0,0,"0.25");graph.nodes[2]=node(3,snapshot);graph.nodes[3]=node(4,Print,0,0,"sample");graph.node_count=4;
 graph.edges[2]={1,0,3,0};graph.edges[3]={3,0,4,0};graph.edges[4]={3,0,1,0};graph.edge_count=5;CanvasPlan plan{};assert(compile_canvas(graph,plan));CanvasRuntime runtime;runtime.reset(plan);
 assert(runtime.event(1,3,0,{},0,discard));close(runtime.last_message(3).values[0],0);assert(runtime.last_message(3).tags[0]==1);
 assert(runtime.event(1,1,0,literal("0.25"),0,discard));for(unsigned i=0;i<64;i++)close(tick(runtime)[0],.25);assert(runtime.event(1,3,0,{},0,discard));close(runtime.last_message(3).values[0],.25);
 assert(runtime.stop(0,discard));close(tick(runtime)[0],0);assert(!runtime.signal_active());
 assert(!runtime.event(2,1,0,literal("1"),0,discard));assert(!runtime.signal_active());
 const auto pulses=runtime.pulses(0);assert(!runtime.event(1,1,0,literal("set 9 1"),0,discard));assert(runtime.pulses(0)==pulses&&!runtime.signal_active());
 assert(runtime.event(1,1,0,literal("0.5"),0,discard));close(tick(runtime)[0],.5);assert(runtime.signal_active());
 graph.edges[4]={1,0,1,0};assert(!compile_canvas(graph,plan));
 // A named message can restart an independently stopped patch in the workspace.
 graph=output_graph(sig,0,0,"0.25");graph.nodes[2]=node(3,Receive,0,0,"level");graph.node_count=3;graph.edges[2]={3,0,1,0};graph.edge_count=3;assert(compile_canvas(graph,plan));CanvasWorkspace workspace;assert(workspace.install(1,plan,0,discard));
 UltraCanvasGraph sender{};sender.revision=1;sender.node_count=1;sender.nodes[0]=node(1,Send,0,0,"level");CanvasPlan sender_plan{};assert(compile_canvas(sender,sender_plan));assert(workspace.install(0,sender_plan,0,discard));
 workspace.stop(1,0,discard);assert(!workspace.runtime(1).signal_active());assert(workspace.event(0,1,1,0,literal("0.75"),0,discard));assert(workspace.runtime(1).signal_active());close(tick(workspace.runtime(1))[0],.75);
}
void snapshot_vectors_and_audio_restart(){
 auto graph=output_graph(phasor,1000);graph.nodes[2]=node(3,snapshot);graph.nodes[3]=node(4,Print,0,0,"sample");graph.node_count=4;graph.edges[2]={1,0,3,0};graph.edges[3]={3,0,4,0};graph.edge_count=4;
 CanvasPlan plan{};assert(compile_canvas(graph,plan));CanvasRuntime runtime;runtime.reset(plan);for(unsigned i=0;i<64;i++)tick(runtime);
 assert(runtime.event(1,3,0,{},0,discard));close(runtime.last_message(3).values[0],0);
 assert(runtime.event(1,3,0,literal("offset 1"),0,discard));assert(runtime.event(1,3,0,{},0,discard));close(runtime.last_message(3).values[0],1./48.);
 assert(runtime.event(1,3,0,literal("offset 63"),0,discard));assert(runtime.event(1,3,0,{},0,discard));close(runtime.last_message(3).values[0],15./48.);
 const auto next=tick(runtime)[0];runtime.audio_started();close(tick(runtime)[0],canvas_wrap_phase(next+1./48.));
 graph=output_graph(cycle,1000);assert(compile_canvas(graph,plan));runtime.reset(plan);for(unsigned i=0;i<10;i++)tick(runtime);runtime.audio_started();close(tick(runtime)[0],1);
 assert(runtime.event(1,1,0,literal("reset 0.25"),0,discard));close(tick(runtime)[0],0);for(unsigned i=0;i<10;i++)tick(runtime);runtime.audio_started();close(tick(runtime)[0],0);
 assert(runtime.stop(0,discard));assert(!runtime.signal_active());runtime.audio_started();assert(runtime.signal_active());close(tick(runtime)[0],0);
}
void interval_parameter_and_deferred_documents(){
 auto graph=output_graph(sig,0,0,"0.25");graph.nodes[2]=node(3,snapshot);graph.nodes[3]=node(4,Print,0,0,"periodic");graph.node_count=4;graph.edges[2]={1,0,3,0};graph.edges[3]={3,0,4,0};graph.edge_count=4;
 CanvasPlan plan{};assert(compile_canvas(graph,plan));CanvasRuntime runtime;runtime.reset(plan);assert(change_canvas_param(plan,3,0,1));assert(runtime.param(plan,3,0,1,0,discard));
 for(unsigned i=0;i<192;i++)tick(runtime);
 assert(runtime.pulses(3)>0);
 for(unsigned sender=0;sender<2;sender++){
  const unsigned target=1-sender;CanvasWorkspace workspace;
  UltraCanvasGraph source{};source.revision=1;source.node_count=3;source.edge_count=2;source.nodes[0]=node(1,sig,0,0,"1");source.nodes[1]=node(2,snapshot,1);source.nodes[2]=node(3,Send,0,0,"probe");source.edges[0]={1,0,2,0};source.edges[1]={2,0,3,0};assert(compile_canvas(source,plan));assert(workspace.install(sender,plan,0,discard));
  auto sink=output_graph(sig,0,0,"0");sink.nodes[2]=node(3,Receive,0,0,"probe");sink.node_count=3;sink.edges[sink.edge_count++]={3,0,1,0};assert(compile_canvas(sink,plan));assert(workspace.install(target,plan,0,discard));
  for(unsigned frame=0;frame<=64;frame++){
   assert(workspace.sample(frame,discard));std::array<std::array<double,2>,2> outputs{};
   for(unsigned document=0;document<2;document++)outputs[document]=workspace.runtime(document).signal_sample(0,0,frame+1,discard,true);
   for(unsigned document=0;document<2;document++)assert(workspace.runtime(document).flush_signal_events(frame+1,discard));
   close(outputs[target][0],frame<64?0:1);
  }
 }
}
void bounded_snapshot_and_vector_restart(){
 auto graph=output_graph(multiply_signal,100000);graph.nodes[2]=node(3,sig,0,0,"100000");graph.nodes[3]=node(4,snapshot);graph.nodes[4]=node(5,Print,0,0,"bounded");graph.node_count=5;graph.edges[2]={3,0,1,0};graph.edges[3]={1,0,4,0};graph.edges[4]={4,0,5,0};graph.edge_count=5;
 CanvasPlan plan{};assert(compile_canvas(graph,plan));CanvasRuntime runtime;runtime.reset(plan);for(unsigned i=0;i<64;i++)tick(runtime);
 const auto pulses=runtime.pulses(3);assert(!runtime.event(1,4,0,{},0,discard));assert(runtime.pulses(3)==pulses&&runtime.pulses(4)==0&&!runtime.failed());
 graph=output_graph(phasor,1000);graph.nodes[2]=node(3,snapshot);graph.nodes[3]=node(4,Print,0,0,"sample");graph.node_count=4;graph.edges[2]={1,0,3,0};graph.edges[3]={3,0,4,0};graph.edge_count=4;assert(compile_canvas(graph,plan));runtime.reset(plan);
 for(unsigned i=0;i<65;i++)tick(runtime);
 runtime.audio_started();for(unsigned i=0;i<64;i++)tick(runtime);
 assert(runtime.event(1,3,0,{},0,discard));close(runtime.last_message(3).values[0],17./48.);
}
void capture_row(CanvasRuntime& runtime,const char* fixture,const char* stage,const char* label,unsigned frames){
 std::printf("{\"fixture\":\"%s\",\"stage\":\"%s\",\"label\":\"%s\",\"values\":[",fixture,stage,label);
 for(unsigned frame=0;frame<frames;frame++)std::printf("%s%.17g",frame?",":"",tick(runtime,frame+1)[0]);
 std::puts("]}");
}
void capture_arithmetic(){
 const char* operators[]={"+~","-~","*~","/~"};const char* topologies[]={"none","left","right","both","summed","creation10"};
 const char* stages[]={"initial","left3","right5","left7","right4","right0"};const double values[]={0,3,5,7,4,0};
 for(unsigned op=0;op<4;op++)for(unsigned topology=0;topology<6;topology++){
  auto graph=output_graph(add_signal+op,topology==5?10:0);graph.node_count=6;
  graph.nodes[2]=node(3,sig,0,0,"6");graph.nodes[3]=node(4,sig,0,0,"2");graph.nodes[4]=node(5,sig,0,0,"3");graph.nodes[5]=node(6,sig,0,0,"1");
  if(topology==1||topology>=3)graph.edges[graph.edge_count++]={3,0,1,0};
  if(topology>=2&&topology<=4)graph.edges[graph.edge_count++]={4,0,1,1};
  if(topology==4){graph.edges[graph.edge_count++]={5,0,1,0};graph.edges[graph.edge_count++]={6,0,1,1};}
  CanvasPlan plan{};assert(compile_canvas(graph,plan));CanvasRuntime runtime;runtime.reset(plan);char label[64]{};std::snprintf(label,sizeof(label),"%s:%s",operators[op],topologies[topology]);
  for(unsigned stage=0;stage<6;stage++){
   if(stage)assert(runtime.event(1,1,stage%2?0:1,canvas_scalar(values[stage]),0,discard));
   runtime.audio_started();capture_row(runtime,"arithmetic",stages[stage],label,512);
  }
 }
}
void capture_waves(){
 const char* labels[]={"sig_default","sig_multi_0","sig_multi_1","sig_multi_2","cycle1000","cycle1000_phase_quarter","cycle_default","cycle0_phase_signal_quarter","phasor1000","phasor_negative1000","clip_-2.0","clip_-1.0","clip_-0.5","clip_0.0","clip_0.5","clip_1.0","clip_2.0","clip~","clip~ 1. -1.","line_0_to_1_10ms"};
 for(unsigned channel=0;channel<20;channel++){
  auto graph=output_graph(sig,0,0,channel?"0.25 -0.5 2":"0");
  if(channel>=1&&channel<=3){graph.edges[0].outlet=channel-1;graph.edges[1].outlet=channel-1;}
  if(channel>=4&&channel<=7){graph=output_graph(cycle,channel<6?1000:0,channel==5?.25:0);if(channel==7){graph.nodes[2]=node(3,sig,0,0,"0.25");graph.node_count=3;graph.edges[graph.edge_count++]={3,0,1,1};}}
  if(channel==8||channel==9)graph=output_graph(phasor,channel==8?1000:-1000);
  if(channel>=10&&channel<=18){
   const char* constants[]={"-2","-1","-0.5","0","0.5","1","2","2","2"};
   graph=output_graph(clip,channel==17?0:channel==18?1:-1,channel==17?0:channel==18?-1:1);graph.nodes[2]=node(3,sig,0,0,constants[channel-10]);graph.node_count=3;graph.edges[graph.edge_count++]={3,0,1,0};
  }
  if(channel==19)graph=output_graph(line_signal);
  CanvasPlan plan{};assert(compile_canvas(graph,plan));CanvasRuntime runtime;runtime.reset(plan);
  if(channel==19)assert(runtime.event(1,1,0,literal("1 10"),0,discard));
  runtime.audio_started();capture_row(runtime,"waves","initial",labels[channel],1024);
  if(channel>=1&&channel<=3){assert(runtime.event(1,1,0,literal("0.75 0.5 -2"),0,discard));assert(runtime.event(1,1,0,literal("set 1 0.125"),0,discard));}
  if(channel==4)assert(runtime.event(1,1,0,literal("reset 0.25"),0,discard));
  if(channel==8)assert(runtime.event(1,1,1,literal("0.25"),0,discard));
  runtime.audio_started();if(channel!=9)capture_row(runtime,"waves","changed",labels[channel],1024);
 }
}
void capture_precision(){
 const char* labels[]={"clip_reversed_-2.0","clip_reversed_0.0","clip_reversed_2.0","phasor1000","cycle1000"};
 for(unsigned channel=0;channel<5;channel++){
  auto graph=output_graph(channel==3?phasor:cycle,1000);
  if(channel<3){const char* values[]={"-2","0","2"};graph=output_graph(clip,1,-1);graph.nodes[2]=node(3,sig,0,0,values[channel]);graph.node_count=3;graph.edges[graph.edge_count++]={3,0,1,0};}
  CanvasPlan plan{};assert(compile_canvas(graph,plan));CanvasRuntime runtime;runtime.reset(plan);runtime.audio_started();capture_row(runtime,"precision","initial",labels[channel],64);
  runtime.audio_started();if(channel!=3)capture_row(runtime,"precision","restarted",labels[channel],64);
  if(channel==3)assert(runtime.event(1,1,1,literal("0.25"),0,discard));
  if(channel==4)assert(runtime.event(1,1,0,literal("reset 0.25"),0,discard));
  runtime.audio_started();capture_row(runtime,"precision","reset",labels[channel],64);
 }
}
}
int main(int argc,char** argv){
 if(argc==2&&!std::strcmp(argv[1],"--capture")){capture_arithmetic();capture_waves();capture_precision();return 0;}
 topology_and_validation();constants_and_arithmetic();legacy_gain_fanout();oscillator_clip_and_line();phasor_saved_and_live_phase();snapshot_feedback_and_stopping();snapshot_vectors_and_audio_restart();interval_parameter_and_deferred_documents();bounded_snapshot_and_vector_restart();std::puts("PASS: native signal topology, arithmetic, fan-in, gains, oscillators, ramps, snapshots and document stop/resume");
}
