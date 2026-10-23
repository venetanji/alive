#include "../src-tauri/native/patch_graph.hpp"
#include <cassert>
#include <cmath>
#include <cstdio>
#include <cstring>

using namespace ultra;
namespace {
constexpr unsigned inlet_relay=50,outlet_relay=51;
static_assert(Sig==38&&SignalDac==49&&Inlet==inlet_relay&&Outlet==outlet_relay);
auto discard=[](alive::Event){return true;};
UltraCanvasNode node(unsigned id,unsigned kind,double p0=0,const char* text=""){
 UltraCanvasNode result{};result.id=id;result.kind=kind;result.p0=p0;std::strcpy(result.text,text);return result;
}
struct Graph {
 UltraCanvasGraph graph{};
 Graph(){graph.revision=1;}
 unsigned add(unsigned kind,double p0=0,const char* text=""){
  const unsigned id=graph.node_count+1;assert(graph.node_count<32);graph.nodes[graph.node_count++]=node(id,kind,p0,text);return id;
 }
 void wire(unsigned from,unsigned to,unsigned inlet=0,unsigned outlet=0){
  assert(graph.edge_count<64);graph.edges[graph.edge_count++]={from,outlet,to,inlet};
 }
};
CanvasMessage literal(const char* text){CanvasMessage result{};assert(canvas_parse_message(text,result));return result;}
void close(double actual,double expected){if(std::abs(actual-expected)>1e-12)std::fprintf(stderr,"actual %.17g expected %.17g\n",actual,expected);assert(std::abs(actual-expected)<=1e-12);}
std::array<double,2> tick(CanvasRuntime& runtime){assert(runtime.sample(0,discard));return runtime.signal_sample(0,0,1,discard);}
void topology_and_reserved_fields(){
 Graph graph;const auto in=graph.add(inlet_relay),out=graph.add(outlet_relay);graph.wire(in,out);CanvasPlan plan{};
 assert(compile_canvas(graph.graph,plan));
 for(const auto& item:{graph.graph.nodes[0],graph.graph.nodes[1]}){
  assert(canvas_inlets(item)==1&&canvas_outlets(item)==1&&canvas_input(item,0)==4&&canvas_output(item,0)==4);
  assert(canvas_input(item,1)==0&&canvas_output(item,1)==0);
 }
 CanvasRuntime runtime;runtime.reset(plan);assert(!runtime.event(1,in,1,{},0,discard));assert(!change_canvas_param(plan,in,0,1));
 for(unsigned field=0;field<9;field++){
  auto invalid=graph.graph;auto& item=invalid.nodes[0];
  if(field==0)item.device=1;else if(field==1)item.count=1;else if(field==2)item.text[0]='x';
  else if(field==3)item.p0=1;else if(field==4)item.p1=1;else if(field==5)item.p2=1;
  else if(field==6)item.p3=1;else if(field==7)item.p4=1;else item.p5=1;
  assert(!compile_canvas(invalid,plan));
 }
}
void typed_messages_and_depth_first_fanout(){
 Graph graph;const auto in=graph.add(inlet_relay),first=graph.add(outlet_relay),nested=graph.add(inlet_relay);
 const auto a=graph.add(Print,0,"first"),b=graph.add(Print,0,"nested"),c=graph.add(Print,0,"last");
 graph.wire(in,first);graph.wire(in,c);graph.wire(first,a);graph.wire(first,nested);graph.wire(nested,b);
 CanvasPlan plan{};assert(compile_canvas(graph.graph,plan));CanvasRuntime runtime;runtime.reset(plan);
 for(const char* text:{"bang","7","7.5","list 1 2.5 alpha","symbol alpha","arbitrary 1 beta 2.5"}){
  const auto input=literal(text);assert(runtime.event(1,in,0,input,0,discard));
  for(unsigned expected:{a,b,c}){
   UltraCanvasConsoleRecord record{};assert(runtime.pop_console(record)&&record.node==expected);
   const auto observed=canvas_message_from_pod(record.message);
   assert(observed.count==input.count&&!std::strcmp(observed.selector,input.selector));
   for(unsigned i=0;i<input.count;i++)assert(observed.tags[i]==input.tags[i]&&observed.values[i]==input.values[i]&&!std::strcmp(observed.symbols[i],input.symbols[i]));
  }
  UltraCanvasConsoleRecord extra{};assert(!runtime.pop_console(extra));
 }
}
void original_eleven_channel_boundary_cases(){
 // Original Max captures: hierarchy-reference-20261021/results/boundary-*.samples.jsonl.
 const double expected[3][11]={{10,13,10,13,10,13,10,13,10,13,5},{7,10,7,10,7,10,7,10,7,10,5},{9,12,9,12,9,12,9,12,9,12,5}};
 for(unsigned channel=0;channel<11;channel++){
  Graph graph;const bool constant=channel==10,driven=channel<10&&channel%2,fan=channel==4||channel==5,merge=channel==6||channel==7,deep=channel==8||channel==9;
  const auto input=constant?0:graph.add(inlet_relay);unsigned target=input,last=input,fan_number=0;
  if(constant)last=graph.add(Sig,0,"5");
  if(driven){const auto source=graph.add(Sig,0,"3");graph.wire(source,input);}
  if(deep){const auto inner=graph.add(inlet_relay);graph.wire(last,inner);last=inner;}
  if(channel>=2&&channel<10){
   const auto sum=graph.add(SignalAdd,10);graph.wire(last,sum);last=sum;
   if(merge){target=graph.add(inlet_relay);graph.wire(target,sum);}
  }
  if(deep){const auto inner=graph.add(outlet_relay);graph.wire(last,inner);last=inner;}
  const auto out=graph.add(outlet_relay);graph.wire(last,out);last=out;
  if(fan){fan_number=graph.add(Number);graph.wire(input,fan_number);const auto extra=graph.add(outlet_relay);graph.wire(fan_number,extra);}
  const auto number=graph.add(Number),printer=graph.add(Print,0,"boundary");graph.wire(out,number);graph.wire(out,printer);
  if(channel<2){const auto sum=graph.add(SignalAdd,10);graph.wire(last,sum);last=sum;}
  const auto dac=graph.add(SignalDac,0,"1");graph.wire(last,dac);
  CanvasPlan plan{};assert(compile_canvas(graph.graph,plan));CanvasRuntime runtime;runtime.reset(plan);
  for(unsigned stage=0;stage<3;stage++){
   if(stage&&!constant)assert(runtime.event(1,target,0,literal(stage==1?"7":"9"),0,discard));
   for(unsigned frame=0;frame<64;frame++)close(tick(runtime)[0],expected[stage][channel]);
   // A generic relay forwards numbers even while carrying a signal; an MSP sum does not.
   if(stage&&channel<2){close(runtime.value(number-1),stage==1?7:9);assert(runtime.pulses(printer-1)==stage);}
   else assert(runtime.pulses(printer-1)==0);
   if(stage&&fan)close(runtime.value(fan_number-1),stage==1?7:9);
  }
 }
}
void signal_path_multiplicity_and_inactive_fallback(){
 Graph graph;const auto source=graph.add(Sig,0,"3"),in=graph.add(inlet_relay),a=graph.add(outlet_relay),b=graph.add(outlet_relay),sum=graph.add(SignalAdd,10),dac=graph.add(SignalDac,0,"1");
 graph.wire(source,in);graph.wire(in,a);graph.wire(in,b);graph.wire(a,sum);graph.wire(b,sum);graph.wire(sum,dac);
 CanvasPlan plan{};assert(compile_canvas(graph.graph,plan));CanvasRuntime runtime;runtime.reset(plan);close(tick(runtime)[0],16);
 graph.graph.edges[graph.graph.edge_count++]=graph.graph.edges[3];assert(!compile_canvas(graph.graph,plan));--graph.graph.edge_count;
 // An undriven relay in a signal-only port must not replace the scalar operand with zero.
 graph.graph.edges[0]={source,0,sum,0};graph.graph.edges[3].inlet=1;graph.graph.edges[4].inlet=1;
 assert(compile_canvas(graph.graph,plan));runtime.reset(plan);close(tick(runtime)[0],13);
 assert(runtime.event(1,in,0,literal("7"),0,discard));close(tick(runtime)[0],10);
}
void mixed_relay_keeps_control_out_of_signal_only_ports(){
 Graph graph;const auto source=graph.add(Sig,0,"3"),relay=graph.add(inlet_relay),dac=graph.add(SignalDac,0,"1"),printer=graph.add(Print,0,"mixed");
 graph.wire(source,relay);graph.wire(relay,dac);graph.wire(relay,printer);
 CanvasPlan plan{};assert(compile_canvas(graph.graph,plan));CanvasRuntime runtime;runtime.reset(plan);close(tick(runtime)[0],3);
 assert(runtime.event(1,relay,0,literal("7"),0,discard));close(tick(runtime)[0],3);
 assert(runtime.pulses(dac-1)==0&&runtime.pulses(printer-1)==1);
 UltraCanvasConsoleRecord record{};assert(runtime.pop_console(record)&&record.node==printer&&record.message.values[0]==7);
 // Control-only boundaries can still connect to signal-only ports without creating a signal.
 graph.graph.edges[0]={relay,0,printer,0};graph.graph.edge_count=2;
 assert(compile_canvas(graph.graph,plan));runtime.reset(plan);close(tick(runtime)[0],0);
 assert(runtime.event(1,relay,0,literal("9"),0,discard));assert(runtime.pulses(dac-1)==0);close(tick(runtime)[0],0);
}
void independent_control_and_signal_cycles(){
 Graph graph;const auto in=graph.add(inlet_relay),out=graph.add(outlet_relay);graph.wire(in,out);graph.wire(out,in);CanvasPlan plan{};assert(!compile_canvas(graph.graph,plan));
 graph.graph.nodes[1]=node(out,SignalAdd,10);assert(!compile_canvas(graph.graph,plan));
 Graph crossing;const auto sample=crossing.add(Snapshot),relay=crossing.add(inlet_relay),signal=crossing.add(Sig,0,"1");
 crossing.wire(sample,relay);crossing.wire(relay,signal);crossing.wire(signal,sample);assert(compile_canvas(crossing.graph,plan));CanvasRuntime runtime;runtime.reset(plan);
 for(unsigned frame=0;frame<64;frame++)tick(runtime);
 assert(runtime.event(1,sample,0,{},0,discard));close(runtime.value(signal-1),1);
 // Boundary relays carry mono, so a legacy stereo Join cannot cross one implicitly.
 crossing.graph.nodes[0]=node(sample,Join);crossing.graph.edge_count=1;crossing.graph.edges[0]={sample,0,relay,0};assert(!compile_canvas(crossing.graph,plan));
}
}
int main(){topology_and_reserved_fields();typed_messages_and_depth_first_fanout();original_eleven_channel_boundary_cases();signal_path_multiplicity_and_inactive_fallback();mixed_relay_keeps_control_out_of_signal_only_ports();independent_control_and_signal_cycles();std::puts("PASS: transparent hierarchy relays, original 11-channel boundaries, typed messages, ordering, multiplicity and separate domain cycles");}
