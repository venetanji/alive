#include "../src-tauri/native/patch_graph.hpp"
#include <cassert>
#include <cstdio>
#include <cstring>
using namespace ultra;
int main(){
 UltraCanvasGraph graph{};graph.revision=1;graph.node_count=2;
 graph.nodes[0]={1,Print,0,0,0,0,0};std::strcpy(graph.nodes[0].text,"quiet");
 graph.nodes[1]={2,Print,0,0,0,1,0};std::strcpy(graph.nodes[1].text,"popup");
 CanvasPlan plan{};assert(compile_canvas(graph,plan)&&"Print popup1 must compile");
 static_assert(sizeof(UltraCanvasConsoleRecord)==456);
 static_assert(sizeof(UltraCanvasPrintPopupObservation)==424);
 static_assert(sizeof(UltraCanvasPrintPopupSnapshot)==13592);
 auto discard=[](alive::Event){return true;};CanvasRuntime runtime;runtime.reset(plan);
 auto send=[&](unsigned id,const char* text){CanvasMessage m{};assert(canvas_parse_message(text,m));assert(runtime.event(1,id,0,m,0,discard));};
 auto change=[&](unsigned id,unsigned param,double value){auto next=runtime.plan();assert(change_canvas_param(next,id,param,value));assert(runtime.param(next,id,param,value,0,discard));};
 send(1,"17");assert(!runtime.print_popup(0).has_value);
 send(2,"list 5 kiwi 2.25");const auto first=runtime.print_popup(1);
 assert(first.has_value&&first.generation==1&&first.frame==runtime.frame());
 assert(first.message.count==3&&first.message.tags[1]==2&&first.message.tags[2]==1);
 send(2,"popup 0");assert(runtime.plan().graph.nodes[1].p1==1);
 assert(!std::strcmp(runtime.print_popup(1).message.selector,"popup")&&runtime.print_popup(1).generation==2);
 UltraCanvasConsoleRecord row{};assert(runtime.pop_console(row)&&row.node==1);assert(runtime.pop_console(row)&&row.node==2);
 assert(runtime.pop_console(row)&&!std::strcmp(row.message.selector,"popup")&&row.message.values[0]==0);
 change(1,1,1);send(1,"71");send(2,"73");
 assert(runtime.print_popup(0).message.values[0]==71&&runtime.print_popup(1).message.values[0]==73);
 const auto generation=runtime.print_popup(1).generation;
 change(2,0,2);change(2,1,1);assert(runtime.print_popup(1).generation==generation&&runtime.print_popup(1).has_value);
 change(2,1,0);assert(!runtime.print_popup(1).has_value&&runtime.print_popup(1).generation==generation+1);
 send(2,"79");assert(!runtime.print_popup(1).has_value&&runtime.print_popup(1).generation==generation+1);
 change(2,1,1);assert(!runtime.print_popup(1).has_value&&runtime.print_popup(1).generation==generation+2);
 send(2,"bang");assert(runtime.print_popup(1).has_value&&canvas_bang(runtime.print_popup(1).message));
 runtime.reset(plan);assert(!runtime.print_popup(0).has_value&&!runtime.print_popup(1).has_value&&runtime.print_popup(1).generation==0);
 for(double invalid:{-1.,0.5,2.}){graph.nodes[1].p1=invalid;assert(!compile_canvas(graph,plan));}
 std::puts("print popup contracts passed");
}
