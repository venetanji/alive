#include "../src-tauri/native/canvas_workspace.hpp"
#include <cassert>
#include <cstdio>
#include <cstring>
#include <iomanip>
#include <iostream>
#include <memory>
#include <sstream>
#include <string>
#include <vector>

using namespace ultra;
static auto discard=[](alive::Event){return true;};
static CanvasMessage message(const char* text){CanvasMessage m{};assert(canvas_parse_message(text,m));return m;}
static UltraCanvasGraph arithmetic(unsigned kind,double rhs,double mode) {
 UltraCanvasGraph g{};g.revision=1;g.node_count=2;g.edge_count=1;
 g.nodes[0]={1,kind,0,0,rhs,mode,0};g.nodes[1]={2,Print,0,0,0,0,0};
 std::strcpy(g.nodes[1].text,"arithmetic");g.edges[0]={1,0,2,0};return g;
}
static CanvasPlan plan(const UltraCanvasGraph& g){CanvasPlan p{};assert(compile_canvas(g,p));return p;}
static void descriptor_contracts() {
 static_assert(sizeof(UltraCanvasNode)==192&&sizeof(UltraCanvasGraph)==7184&&sizeof(UltraCanvasMessage)==392);
 static_assert(Add==4&&Multiply==5&&MessageBox==53&&Subtract==54&&Divide==55&&Modulo==56&&ReverseSubtract==57&&ReverseDivide==58&&Abs==59);
 for(unsigned kind:{4u,5u,54u,55u,56u,57u,58u,59u}) {
  auto g=arithmetic(kind,kind==59?0:2,1);CanvasPlan p{};assert(compile_canvas(g,p));
  assert(canvas_inlets(kind)==(kind==59?1u:2u)&&canvas_output(kind,0)==1&&canvas_output(kind,1)==0);
  assert(canvas_inlets(g.nodes[0])==(kind==59?1u:2u)&&canvas_outlets(g.nodes[0])==1);
  assert(!change_canvas_param(p,1,1,2));
  auto invalid=g;invalid.nodes[0].p1=0;assert(compile_canvas(invalid,p)==(kind==4||kind==5));
  for(double bad:{-1.,.5,3.}){invalid=g;invalid.nodes[0].p1=bad;assert(!compile_canvas(invalid,p));}
  for(unsigned slot=2;slot<6;slot++){
   invalid=g;double* values[]={&invalid.nodes[0].p0,&invalid.nodes[0].p1,&invalid.nodes[0].p2,&invalid.nodes[0].p3,&invalid.nodes[0].p4,&invalid.nodes[0].p5};*values[slot]=1;assert(!compile_canvas(invalid,p));
  }
  invalid=g;std::strcpy(invalid.nodes[0].text,"unused");assert(!compile_canvas(invalid,p));
  invalid=g;invalid.nodes[0].p0=.5;assert(!compile_canvas(invalid,p));
  if(kind!=59){
   p=plan(g);assert(!change_canvas_param(p,1,0,.5));assert(p.graph.nodes[0].p0==2);
   CanvasRuntime r;r.reset(p);assert(!r.param(p,1,0,.5,0,discard));assert(r.plan().graph.nodes[0].p0==2);
  }
 }
}
static void legacy_contracts() {
 for(unsigned kind:{4u,5u}){
  CanvasRuntime r;r.reset(plan(arithmetic(kind,.5,0)));
  assert(r.event(1,1,0,message("3"),0,discard));UltraCanvasConsoleRecord row{};assert(r.pop_console(row));
  assert(row.message.count==1&&row.message.tags[0]==0&&row.message.values[0]==(kind==4?3.5:1.5));assert(!r.pop_console(row));
 }
}
static void runtime_contracts() {
 struct Operation {unsigned kind;double integer,floating;};
 for(const auto test:{Operation{4,-1,-1.75},Operation{5,-6,-7.5},Operation{54,-5,-5.75},Operation{55,-1,-1.875},Operation{56,-1,-1.75},Operation{57,5,5.75},Operation{58,0,-2./3.75}}){
  for(unsigned mode:{1u,2u}){
   CanvasRuntime r;r.reset(plan(arithmetic(test.kind,2,mode)));UltraCanvasConsoleRecord row{};
   assert(r.event(1,1,0,message("-3.75"),0,discard));assert(r.pop_console(row));
   assert(row.message.tags[0]==mode-1&&std::abs(row.message.values[0]-(mode==1?test.integer:test.floating))<1e-12);assert(!r.pop_console(row));
  }
 }
 for(unsigned kind:{4u,5u,54u,55u,56u,57u,58u}){
  CanvasRuntime r;r.reset(plan(arithmetic(kind,2,1)));UltraCanvasConsoleRecord row{};
  auto send=[&](unsigned inlet,const char* text){assert(r.event(1,1,inlet,message(text),0,discard));};
  auto value=[&](){assert(r.pop_console(row));assert(row.node==2&&row.message.tags[0]==0);assert(!r.pop_console(row));return row.message.values[0];};
  send(0,"list 7 2 99");value();send(1,"list 8 3");assert(!r.pop_console(row));
  send(0,"bang");const auto before=value();send(0,"set 9.75");assert(!r.pop_console(row));send(0,"bang");
  const auto after=value();if(kind==57||kind==58)assert(after==before);
  else {send(0,"9.75");assert(value()==after);}
 }
 for(unsigned mode:{1u,2u}){
  CanvasRuntime r;r.reset(plan(arithmetic(59,0,mode)));UltraCanvasConsoleRecord row{};
  for(const char* input:{"bang","set -8.5","bang","in1 -2.75","ft1 2.75"}){assert(r.event(1,1,0,message(input),0,discard));assert(!r.pop_console(row));}
  assert(r.event(1,1,0,message("list -3.75 kiwi"),0,discard));assert(r.pop_console(row));assert(row.message.tags[0]==mode-1&&row.message.values[0]==(mode==1?3:3.75));assert(!r.pop_console(row));
 }
}
static void bounded_results_and_zero_divisors() {
 for(unsigned kind:{55u,56u}){
  CanvasRuntime r;r.reset(plan(arithmetic(kind,2,2)));UltraCanvasConsoleRecord row{};
  assert(r.event(1,1,0,message("3.75"),0,discard));assert(r.pop_console(row));const auto previous=r.value(0);
  assert(r.event(1,1,1,message("0."),0,discard));assert(!r.pop_console(row));
  assert(!r.event(1,1,0,message("-7.5"),0,discard));assert(!r.failed()&&r.value(0)==previous);
  assert(r.pop_console(row)&&row.node==1&&row.level==2&&!std::strcmp(row.message.symbols[0],"arithmetic-result-out-of-range"));assert(!r.pop_console(row));
  assert(r.event(1,1,1,message("-2"),0,discard));assert(r.event(1,1,0,message("bang"),0,discard));assert(r.pop_console(row));assert(row.node==2&&row.message.values[0]==(kind==55?3.75:-1.5));assert(!r.pop_console(row));
 }
 for(unsigned kind:{55u,56u,58u}){
  CanvasRuntime r;r.reset(plan(arithmetic(kind,0,1)));UltraCanvasConsoleRecord row{};
  assert(r.event(1,1,0,message("11"),0,discard));assert(r.pop_console(row));assert(row.message.values[0]==(kind==55?11:0));
 }
 CanvasRuntime r;r.reset(plan(arithmetic(5,100000,2)));UltraCanvasConsoleRecord row{};
 assert(!r.event(1,1,0,message("2"),0,discard));assert(r.pop_console(row)&&row.node==1&&row.level==2);assert(!r.pop_console(row));
}
static int replay() {
 std::vector<std::unique_ptr<CanvasRuntime>> targets(64);std::string line;
 std::cout<<std::setprecision(17);
 while(std::getline(std::cin,line)){
  std::istringstream input(line);std::string command;input>>command;
  if(command=="target"){
   unsigned index=0,kind=0,mode=0;double rhs=0;assert(input>>index>>kind>>mode>>rhs);assert(index<targets.size());
   targets[index]=std::make_unique<CanvasRuntime>();targets[index]->reset(plan(arithmetic(kind,rhs,mode)));
  }else if(command=="event"){
   std::string id,text;unsigned index=0,inlet=0;assert(input>>id>>index>>inlet);std::getline(input,text);assert(index<targets.size()&&targets[index]);
   auto& runtime=*targets[index];const bool accepted=runtime.event(1,1,inlet,message(text.c_str()),0,discard);assert(!runtime.failed());
   std::cout<<"{\"id\":\""<<id<<"\",\"accepted\":"<<(accepted?"true":"false")<<",\"receipts\":[";
   UltraCanvasConsoleRecord row{};bool first=true;std::vector<std::string> errors;
   while(runtime.pop_console(row)){
    if(row.node==1){assert(row.level==2);errors.emplace_back(row.message.symbols[0]);continue;}
    assert(row.node==2&&row.message.count==1&&row.message.tags[0]<2&&canvas_number(row.message.values[0]));
    if(!first)std::cout<<',';
    first=false;
    std::cout<<"{\"selector\":\""<<(row.message.tags[0]?"float":"int")<<"\",\"atoms\":["<<row.message.values[0]<<"],\"negative_zero\":["<<(row.message.values[0]==0&&std::signbit(row.message.values[0])?"true":"false")<<"]}";
   }
   std::cout<<"],\"errors\":[";first=true;for(const auto& error:errors){if(!first)std::cout<<',';first=false;std::cout<<'"'<<error<<'"';}std::cout<<"]}\n";
  }else assert(false);
 }
 return 0;
}
int main(int argc,char** argv) {
 if(argc==2&&!std::strcmp(argv[1],"replay"))return replay();
 if(argc==1||!std::strcmp(argv[1],"descriptor"))descriptor_contracts();
 if(argc==1||!std::strcmp(argv[1],"legacy"))legacy_contracts();
 if(argc==1||!std::strcmp(argv[1],"runtime"))runtime_contracts();
 if(argc==1||!std::strcmp(argv[1],"bounds"))bounded_results_and_zero_divisors();
 std::puts("arithmetic contracts passed");
}
