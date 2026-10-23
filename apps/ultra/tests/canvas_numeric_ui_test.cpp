#include "../src-tauri/native/canvas_workspace.hpp"
#include <cassert>
#include <cstdio>
#include <cstring>
#include <memory>

using namespace ultra;
static auto discard=[](alive::Event){return true;};
static CanvasMessage message(const char* text){CanvasMessage m{};assert(canvas_parse_message(text,m));return m;}
static UltraCanvasGraph numeric(unsigned kind) {
 UltraCanvasGraph g{};g.revision=1;g.node_count=3;g.edge_count=2;
 g.nodes[0]={1,kind,0,0,0,-100000,100000};
 g.nodes[1]={2,Print,0,0,0,0,0};std::strcpy(g.nodes[1].text,"value");
 g.nodes[2]={3,Print,0,0,0,0,0};std::strcpy(g.nodes[2].text,"tab");
 g.edges[0]={1,0,2,0};g.edges[1]={1,1,3,0};return g;
}
static CanvasPlan plan(const UltraCanvasGraph& g){CanvasPlan p{};assert(compile_canvas(g,p));return p;}
static void integer_number() {
 auto g=numeric(52);auto p=plan(g);CanvasRuntime r;r.reset(p);
 assert(canvas_inlets(g.nodes[0])==1&&canvas_outlets(g.nodes[0])==2);
 auto invalid=g;invalid.edges[0]={2,0,1,1};assert(!compile_canvas(invalid,p));
 for(double bad:{.5,-1.25}){invalid=g;invalid.nodes[0].p0=bad;assert(!compile_canvas(invalid,p));}
 invalid=g;invalid.nodes[0].p1=4;invalid.nodes[0].p2=3;assert(!compile_canvas(invalid,p));
 auto expect=[&](const char* input,double value,unsigned count=1){
  assert(r.event(1,1,0,message(input),0,discard));UltraCanvasConsoleRecord row{};
  for(unsigned i=0;i<count;++i){assert(r.pop_console(row));assert(row.node==2&&row.message.count==1&&row.message.tags[0]==0&&row.message.values[0]==value);}
  assert(!r.pop_console(row));assert(r.value(0)==value);
 };
 expect("3.9",3);expect("-3.9",-3);expect("list 4 5",4,2);expect("list 6.75 kiwi",6,2);
 expect("set 12",12,0);expect("bang",12);expect("min -2",12,0);expect("max 2",2,0);
 expect("max 1.5",2,0);
 expect("9.9",2);expect("-9.9",-2);expect("set 8.9",2,0);expect("bang",2);
 expect("min",2,0);expect("max",2,0);expect("9.9",9);expect("tab",9,0);
 assert(!r.event(1,1,1,message("8"),0,discard));
 g={};g.revision=1;g.node_count=1;g.nodes[0]={1,Number,0,0,2.75,0,0};r.reset(plan(g));
 assert(canvas_inlets(g.nodes[0])==2&&canvas_outlets(g.nodes[0])==1);
 assert(r.event(1,1,1,message("-3.75"),0,discard)&&r.value(0)==-3.75);
}
static void selector_tab_is_ignored() {
 CanvasRuntime r;r.reset(plan(numeric(Flonum)));
 assert(r.event(1,1,0,message("tab"),0,discard));
 UltraCanvasConsoleRecord row{};assert(!r.pop_console(row));
}
static void physical_tab_preserves_state_and_uses_shared_dispatch() {
 auto workspace=std::make_unique<CanvasWorkspace>();
 for(unsigned kind:{unsigned(Flonum),unsigned(NumberInt)}){
  const auto g=numeric(kind);assert(workspace->install(0,plan(g),0,discard));workspace->begin_callback();
  assert(workspace->event(0,1,1,0,message("set 7"),0,discard));
  assert(!workspace->tab(0,2,1,0,discard)&&!workspace->tab(0,1,2,0,discard)&&!workspace->tab(1,1,1,0,discard));
  assert(workspace->tab(0,1,1,0,discard));UltraCanvasConsoleRecord row{};
  assert(workspace->runtime(0).pop_console(row)&&row.node==3&&row.message.count==0);
  assert(!workspace->runtime(0).pop_console(row)&&workspace->runtime(0).value(0)==7);
 }
 // A Tab-triggered numeric send cycle must share the normal bounded executor.
 auto g=numeric(NumberInt);g.node_count=4;g.edge_count=2;
 g.nodes[1]={2,Message,0,0,0,0,0};std::strcpy(g.nodes[1].text,"send cycle");
 g.nodes[2]={3,Int,0,0,4,0,0};g.nodes[3]={4,Receive,0,0,0,0,0};std::strcpy(g.nodes[3].text,"cycle");
 g.edges[0]={1,1,2,0};g.edges[1]={2,0,3,0};
 auto receiver=g;receiver.revision=2;receiver.edge_count=2;receiver.edges[0]={4,0,2,0};receiver.edges[1]={2,0,3,0};
 assert(workspace->install(0,plan(g),0,discard));assert(workspace->install(1,plan(receiver),0,discard));
 workspace->begin_callback();assert(!workspace->tab(0,1,1,0,discard));assert(workspace->failed());
}
static void named_numeric_send() {
 auto workspace=std::make_unique<CanvasWorkspace>();
 UltraCanvasGraph receiver{};receiver.revision=1;receiver.node_count=2;receiver.edge_count=1;
 receiver.nodes[0]={1,Receive,0,0,0,0,0};std::strcpy(receiver.nodes[0].text,"numbers");
 receiver.nodes[1]={2,Print,0,0,0,0,0};std::strcpy(receiver.nodes[1].text,"received");receiver.edges[0]={1,0,2,0};
 assert(workspace->install(1,plan(receiver),0,discard));assert(workspace->install(2,plan(receiver),0,discard));
 for(unsigned kind:{unsigned(Int),unsigned(Float)}) {
  UltraCanvasGraph source{};source.revision=kind;source.node_count=2;source.edge_count=1;
  source.nodes[0]={1,kind,0,0,0,0,0};source.nodes[1]=receiver.nodes[1];source.edges[0]={1,0,2,0};
  assert(workspace->install(0,plan(source),0,discard));workspace->begin_callback();
  assert(workspace->event(0,kind,1,1,message("8.75"),0,discard));
  assert(workspace->event(0,kind,1,0,message("send numbers"),0,discard));
  UltraCanvasConsoleRecord row{};
  assert(!workspace->runtime(0).pop_console(row));
  for(unsigned d:{1u,2u}){assert(workspace->runtime(d).pop_console(row));assert(row.message.values[0]==(kind==Int?8:8.75)&&row.message.tags[0]==(kind==Int?0u:1u));assert(!workspace->runtime(d).pop_console(row));}
  assert(workspace->event(0,kind,1,1,message("send numbers"),0,discard));
  assert(workspace->event(0,kind,1,0,message("send"),0,discard));
  assert(workspace->event(0,kind,1,0,message("send 42"),0,discard));
  assert(workspace->event(0,kind,1,0,message("send numbers extra"),0,discard));
  for(unsigned d:{0u,1u,2u})assert(!workspace->runtime(d).pop_console(row));
  assert(workspace->runtime(0).value(0)==(kind==Int?8:8.75));
 }
}
int main(int argc,char** argv) {
 if(argc==1||!std::strcmp(argv[1],"number"))integer_number();
 if(argc==1||!std::strcmp(argv[1],"selector"))selector_tab_is_ignored();
 if(argc==1||!std::strcmp(argv[1],"send"))named_numeric_send();
 if(argc==1||!std::strcmp(argv[1],"tab"))physical_tab_preserves_state_and_uses_shared_dispatch();
 std::puts("numeric UI contracts passed");
}
