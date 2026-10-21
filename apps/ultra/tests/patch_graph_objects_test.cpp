#include "../src-tauri/native/patch_graph.hpp"
#include <cassert>
#include <cstdio>
#include <cstring>
#include <cmath>
#include <vector>
#include <tuple>
#include <cstddef>

using namespace ultra;
static UltraCanvasNode node(unsigned id,unsigned kind,double p0=0,double p1=0,double p2=0,double p3=0,double p4=0) {
 UltraCanvasNode result{id,kind,0,0,p0,p1,p2};result.p3=p3;result.p4=p4;return result;
}
static CanvasMessage literal(const char* text) {CanvasMessage result;assert(canvas_parse_message(text,result));return result;}
static auto discard=[](alive::Event){return true;};
static UltraCanvasGraph pair(unsigned kind,double a=0,double b=0,double c=0,double d=0,double e=0) {
 UltraCanvasGraph g{};g.revision=1;g.node_count=2;g.edge_count=1;
 g.nodes[0]=node(1,kind,a,b,c,d,e);g.nodes[1]=node(2,Number);g.edges[0]={1,0,2,0};return g;
}
static void parsers() {
 CanvasMessage m;
 assert(canvas_parse_message("symbol 42",m)&&m.count==1&&m.tags[0]==2&&!std::strcmp(m.symbols[0],"42"));
 assert(canvas_parse_message("set 1 2. 3e1 ready",m)&&m.count==4&&!std::strcmp(m.selector,"set")&&m.tags[0]==0&&m.tags[1]==1&&m.tags[2]==1&&m.tags[3]==2);
 assert(canvas_parse_message("list 1 2 3 4 5 6 7 8",m)&&m.count==8);
 assert(canvas_parse_message("set 1 2 3 4 5 6 7 8",m)&&m.count==8&&!std::strcmp(m.selector,"set"));
 assert(canvas_parse_message("  1\t2\n3\r",m)&&m.count==3);
 assert(!canvas_parse_message("bang 2",m)&&canvas_parse_message("list",m)&&m.count==0&&!std::strcmp(m.selector,"list"));
 assert(!canvas_parse_message("0x10",m)&&!canvas_parse_message("NaN",m)&&!canvas_parse_message("a, b",m)&&!canvas_parse_message("$1",m));
 assert(canvas_parse_args("i float ready amber",m)&&m.count==4&&m.tags[2]==2);
 assert(!canvas_parse_args("-",m)&&!canvas_parse_args("+",m));
 assert(!canvas_parse_args("1 2 3 4 5 6 7 8 9",m));
 assert(canvas_parse_message("0000000000000000000000000000000000000000000000000000000000000000001",m)&&m.values[0]==1);
 assert(canvas_parse_message("1e-999",m)&&m.values[0]==0&&m.tags[0]==1);
 assert(!canvas_parse_message("+-1",m)&&!canvas_parse_message("--1",m));
 CanvasMessage numeric=canvas_scalar(4);const auto blank=canvas_coerce_atom(numeric,0,2);
 const auto empty_symbol=canvas_atom(blank,0);assert(!canvas_bang(empty_symbol)&&canvas_named(empty_symbol,"symbol")&&empty_symbol.tags[0]==2);
 const auto p=canvas_message_to_pod(literal("hello 2. symbol"));
 const auto q=canvas_message_from_pod(p);assert(!std::strcmp(q.selector,"hello")&&q.tags[0]==1&&q.tags[1]==2);
 static_assert(sizeof(UltraCanvasNode)==192&&sizeof(UltraCanvasGraph)==7184&&sizeof(UltraCanvasMessage)==392);
 static_assert(offsetof(UltraCanvasNode,text)==64&&offsetof(UltraCanvasGraph,edges)==6160);
 static_assert(offsetof(UltraCanvasMessage,values)==8&&offsetof(UltraCanvasMessage,tags)==72&&offsetof(UltraCanvasMessage,symbols)==104&&offsetof(UltraCanvasMessage,selector)==360);
}
static void scalars() {
 CanvasPlan p;CanvasRuntime r;
 for(unsigned kind: {unsigned(Int),unsigned(Float)}) {
  auto g=pair(kind,7);assert(compile_canvas(g,p));r.reset(p);
  assert(r.event(1,1,0,literal("-3.9"),0,discard));assert(r.value(1)==(kind==Int?-3:-3.9));
  const auto before=r.pulses(1);assert(r.event(1,1,1,literal("12.5"),0,discard));assert(r.pulses(1)==before);
  assert(r.event(1,1,0,{},0,discard));assert(r.value(1)==(kind==Int?12:12.5));
  assert(r.event(1,1,0,literal("set 8"),0,discard));assert(r.pulses(1)==before+1);
  assert(r.event(1,1,0,{},0,discard));assert(r.value(1)==8);
  assert(r.event(1,1,0,literal("list 6.75 kiwi"),0,discard));assert(r.value(1)==(kind==Int?6:6.75));
 }
 auto g=pair(Flonum,0,-2,2,6);assert(compile_canvas(g,p));r.reset(p);
 assert(r.event(1,1,0,literal("9.5"),0,discard)&&r.value(1)==2);
 const auto outputs=r.pulses(1);assert(r.event(1,1,0,literal("list 1.75 kiwi"),0,discard)&&r.value(1)==1.75&&r.pulses(1)==outputs+2);
 g.edges[0].outlet=1;assert(compile_canvas(g,p));r.reset(p);
 assert(r.event(1,1,0,literal("tab"),0,discard)&&r.pulses(1)==1);
 g=pair(Slider,0,128,1,0.5,1);assert(compile_canvas(g,p));r.reset(p);
 assert(r.event(1,1,0,literal("4"),0,discard)&&r.value(1)==3);
 assert(r.event(1,1,0,literal("set 8"),0,discard)&&r.pulses(1)==1);
 assert(r.event(1,1,0,{},0,discard)&&r.value(1)==5);
 g=pair(Slider,0,128,10,2,0);assert(compile_canvas(g,p));r.reset(p);
 assert(r.event(1,1,0,literal("5"),0,discard)&&r.value(0)==5&&r.value(1)==20);
 assert(change_canvas_param(p,1,3,-2)&&r.param(p,1,3,-2,0,discard));
 assert(r.event(1,1,0,literal("7"),0,discard)&&r.value(0)==7&&r.value(1)==-4);
}
static void lists_and_order() {
 CanvasPlan p;CanvasRuntime r;auto g=pair(Pack);std::strcpy(g.nodes[0].text,"0 0. amber");
 g.nodes[1]=node(2,Unpack);std::strcpy(g.nodes[1].text,"0 0. symbol");
 assert(compile_canvas(g,p));assert(canvas_inlets(g.nodes[0])==3&&canvas_outlets(g.nodes[1])==3);
 r.reset(p);assert(r.event(1,1,1,literal("2.75"),0,discard));assert(r.pulses(1)==0);
 assert(r.event(1,1,0,literal("8.9"),0,discard)&&r.value(1)==8);
 g={};g.revision=1;g.node_count=3;g.nodes[0]=node(1,Trigger);std::strcpy(g.nodes[0].text,"b i");
 g.nodes[1]=node(2,Number);g.nodes[2]=node(3,Number);g.edge_count=3;
 g.edges[0]={1,1,2,1};g.edges[1]={1,0,2,0};g.edges[2]={2,0,3,0};
 assert(compile_canvas(g,p));r.reset(p);assert(r.event(1,1,0,literal("9"),0,discard)&&r.value(2)==9&&r.pulses(2)==1);
 g.nodes[0].kind=Unpack;std::strcpy(g.nodes[0].text,"0 0");g.nodes[1]=node(2,Add);g.edges[0]={1,1,2,1};g.edges[1]={1,0,2,0};
 assert(compile_canvas(g,p));r.reset(p);assert(r.event(1,1,0,literal("3 5"),0,discard)&&r.value(2)==8);
}
static void routing() {
 CanvasPlan p;CanvasRuntime r;auto g=pair(Select);std::strcpy(g.nodes[0].text,"2");
 assert(compile_canvas(g,p));r.reset(p);assert(r.event(1,1,0,literal("2.9"),0,discard)&&r.pulses(1)==1);
 assert(r.event(1,1,1,literal("5"),0,discard));assert(r.event(1,1,0,literal("5"),0,discard)&&r.pulses(1)==2);
 g=pair(Route);std::strcpy(g.nodes[0].text,"foo 2");assert(canvas_inlets(g.nodes[0])==3&&canvas_outlets(g.nodes[0])==3);
 assert(compile_canvas(g,p));r.reset(p);assert(r.event(1,1,0,literal("foo 9"),0,discard)&&r.value(1)==9);
 assert(r.event(1,1,1,literal("bar"),0,discard));assert(r.event(1,1,0,literal("bar 7"),0,discard)&&r.value(1)==7);
}
static void typed_pack_oracle() {
 CanvasPlan p;CanvasRuntime r;auto g=pair(Pack);std::strcpy(g.nodes[0].text,"i f s");
 g.nodes[1]=node(2,Unpack);std::strcpy(g.nodes[1].text,"i f s");
 g.node_count=5;g.edge_count=4;
 for(unsigned i=0;i<3;i++){g.nodes[2+i]=node(3+i,Number);g.edges[1+i]={2,i,3+i,0};}
 assert(compile_canvas(g,p));r.reset(p);assert(r.event(1,1,0,{},0,discard));
 assert(r.last_message(2).tags[0]==0&&r.last_message(3).tags[0]==1&&!std::strcmp(r.last_message(4).selector,"s"));
 assert(r.event(1,1,1,literal("2.75"),0,discard));assert(r.event(1,1,2,literal("symbol pear"),0,discard));
 assert(r.event(1,1,0,literal("5"),0,discard));
 assert(r.value(2)==5&&r.value(3)==2.75&&!std::strcmp(r.last_message(4).selector,"pear"));
 assert(r.event(1,1,0,literal("list 8 9."),0,discard));
 assert(r.value(2)==8&&r.value(3)==9&&!std::strcmp(r.last_message(4).selector,"pear"));
 assert(r.event(1,1,0,literal("list 1 2. peach extra"),0,discard));
 assert(r.value(2)==1&&r.value(3)==2&&!std::strcmp(r.last_message(4).selector,"peach"));
 assert(r.event(1,1,0,literal("set 8 4. plum"),0,discard));const auto count=r.pulses(2);
 assert(r.event(1,1,0,{},0,discard)&&r.pulses(2)==count+1&&r.value(2)==8&&r.value(3)==4&&!std::strcmp(r.last_message(4).selector,"plum"));
}
static void ramps() {
 CanvasPlan p;CanvasRuntime r;auto g=pair(Line,0,0,10,1);g.nodes[2]=node(3,Number);g.node_count=3;g.edges[1]={1,1,3,0};g.edge_count=2;
 assert(compile_canvas(g,p));r.reset(p);assert(r.event(1,1,0,literal("10 40"),0,discard));
 for(unsigned i=0;i<=960;i++){r.begin_callback();assert(r.sample(0,discard));}
 assert(std::abs(r.value(1)-5)<1e-9&&r.pulses(2)==0);
 assert(r.event(1,1,0,literal("pause"),0,discard));const auto v=r.value(1);
 for(unsigned i=0;i<960;i++){r.begin_callback();assert(r.sample(0,discard));}assert(r.value(1)==v);
 assert(r.event(1,1,0,literal("resume"),0,discard));
 for(unsigned i=0;i<960;i++){r.begin_callback();assert(r.sample(0,discard));}assert(r.value(1)==10&&r.pulses(2)==1);
 assert(r.event(1,1,0,literal("0 40"),0,discard));assert(r.event(1,1,0,literal("set 3"),0,discard));
 const auto pulses=r.pulses(1);for(unsigned i=0;i<3000;i++){r.begin_callback();assert(r.sample(0,discard));}
 assert(r.pulses(1)==pulses&&r.value(0)==3);
 assert(r.event(1,1,0,literal("1 0 5 20"),0,discard));
 for(unsigned i=0;i<=961;i++){r.begin_callback();assert(r.sample(0,discard));}
 assert(r.value(1)==5&&r.pulses(2)>=3);
 assert(r.event(1,1,0,literal("0 40"),0,discard));assert(r.event(1,1,0,literal("pause"),0,discard));
 assert(r.stop(0,discard));assert(r.event(1,1,0,literal("resume"),0,discard));const auto stopped=r.pulses(1);
 for(unsigned i=0;i<2000;i++){r.begin_callback();assert(r.sample(0,discard));}assert(r.pulses(1)==stopped);
}
static void live_parameter_regressions() {
 CanvasPlan p;CanvasRuntime r;auto g=pair(Voice,8,28);g.edges[0]={1,0,2,0};g.edge_count=0;
 assert(compile_canvas(g,p));r.reset(p);
 assert(r.event(1,1,2,literal("77"),0,discard));assert(change_canvas_param(p,1,0,12));assert(r.param(p,1,0,12,0,discard));
 assert(r.plan().graph.nodes[0].p0==12&&r.plan().graph.nodes[0].p1==77);
 auto emitted=0;auto count=[&](alive::Event){++emitted;return true;};
 assert(r.event(1,1,0,literal("set 64 100"),0,count)&&emitted==0);
 assert(r.event(1,1,0,literal("list hello 100"),0,count)&&emitted==0);
 assert(r.event(1,1,0,literal("64 100"),0,count)&&emitted==1);
 g=pair(Line,0,0,20,1);assert(compile_canvas(g,p));r.reset(p);
 assert(r.event(1,1,1,literal("40"),0,discard));assert(change_canvas_param(p,1,2,10));assert(r.param(p,1,2,10,0,discard));
 assert(r.plan().graph.nodes[0].p1==40);
 g=pair(Flonum,0,-5,5,6);assert(compile_canvas(g,p));r.reset(p);
 assert(r.event(1,1,0,literal("min 4"),0,discard));assert(change_canvas_param(p,1,2,2));assert(!r.param(p,1,2,2,0,discard));
 assert(r.plan().graph.nodes[0].p1==4&&r.plan().graph.nodes[0].p2==5);
 g=pair(Line,0,0,20,0);assert(compile_canvas(g,p));r.reset(p);
 assert(r.event(1,1,0,literal("3.9"),0,discard)&&r.value(1)==3&&r.last_message(1).tags[0]==0);
 g=pair(Line,0,0,1,2);assert(compile_canvas(g,p));r.reset(p);
 assert(r.event(1,1,0,literal("1 2"),0,discard));assert(r.sample(0,discard));assert(r.last_message(1).tags[0]==0);
 r.reset(p);assert(r.event(1,1,0,literal("1 10"),0,discard));assert(r.sample(0,discard));assert(r.last_message(1).tags[0]==1);
}
static std::vector<std::tuple<unsigned,double,uint64_t>> line_score(const std::vector<unsigned>& parts) {
 CanvasPlan p;CanvasRuntime r;auto g=pair(Line,0,0,7,1);assert(compile_canvas(g,p));r.reset(p);
 assert(r.event(1,1,0,literal("10 40 0 40"),0,discard));
 std::vector<std::tuple<unsigned,double,uint64_t>> outputs;unsigned frame=0;uint64_t seen=0;
 for(unsigned block=0;frame<5000;block++){
  r.begin_callback();const auto count=std::min(parts[block%parts.size()],5000-frame);
  for(unsigned i=0;i<count;i++,frame++){
   assert(r.sample(i,discard));
   if(r.pulses(1)!=seen){seen=r.pulses(1);outputs.emplace_back(frame,r.value(1),seen);}
  }
 }
 assert(r.value(1)==0&&outputs.size()>8);return outputs;
}

int main() {
 ultra::CanvasPlan plan;
 UltraCanvasGraph graph{};
 graph.revision=1;
 graph.node_count=1;
 graph.nodes[0]={1,15,0,0,7,0,0};
 assert(ultra::compile_canvas(graph,plan)&&"the mapped integer kind must compile");
 parsers();scalars();lists_and_order();routing();typed_pack_oracle();live_parameter_regressions();ramps();
 assert(line_score({64})==line_score({1,7,31,511}));
 std::puts("PASS: native mapped object parsing, scalar state, dynamic ports, list coercion, outlet order, routing and ramps");
}
