#include "../src-tauri/native/patch_graph.hpp"
#include <cassert>
#include <cstdio>
#include <cstring>
#include <memory>
using namespace ultra;
auto discard=[](alive::Event){return true;};
UltraCanvasGraph effect(bool filter=false){
 UltraCanvasGraph g{};g.revision=1;g.node_count=filter?3:2;
 g.nodes[0].id=1;g.nodes[0].kind=66;
 auto& sink=g.nodes[filter?2:1];sink.id=3;sink.kind=SignalDac;std::strcpy(sink.text,"1 2");
 if(filter){g.nodes[1].id=2;g.nodes[1].kind=67;g.nodes[1].p0=2400;g.nodes[1].p1=.7;}
 for(unsigned channel=0;channel<2;channel++){
  g.edges[g.edge_count++]={1,channel,filter?2u:3u,channel};
  if(filter)g.edges[g.edge_count++]={2,channel,3,channel};
 }
 return g;
}
int main(){
 for(bool filter:{false,true}){
  CanvasPlan p{};assert(compile_canvas(effect(filter),p));auto r=std::make_unique<CanvasRuntime>();r->reset(p);
  assert(canvas_inlets(p.graph.nodes[0])==0&&canvas_outlets(p.graph.nodes[0])==2);
  for(unsigned f=0;f<128;f++){const auto out=r->signal_sample(.75,-.25,1,discard);assert(out[0]==0&&out[1]==0);}
  auto sample=[&](double left,double right){return r->signal_sample(0,0,1,discard,false,{left,right});};
  auto out=sample(1,-.25);if(!filter){assert(out[0]==1&&out[1]==-.25);out=sample(0,1);assert(out[0]==0&&out[1]==1);}
  else {
   assert(out[0]>0&&out[1]==out[0]*-.25);out=sample(0,0);assert(out[0]!=0&&out[1]==out[0]*-.25);
   assert(r->stop(0,discard));r->resume_signals();out=sample(0,0);assert(out[0]==0&&out[1]==0);
   out=sample(1,0);const double initial=out[0];assert(out[1]==0);
   auto next=r->plan();assert(change_canvas_param(next,2,0,800));assert(r->param(next,2,0,800,0,discard));
   next=r->plan();assert(change_canvas_param(next,2,1,2));assert(r->param(next,2,1,2,0,discard));
   out=sample(0,0);assert(out[0]!=0&&out[1]==0);
   CanvasMessage cutoff{};assert(canvas_parse_message("18000",cutoff));assert(r->event(1,2,2,cutoff,0,discard));
   assert(r->plan().graph.nodes[1].p0==18000);assert(r->plan().graph.nodes[1].p1==2);
   r->reset(p);out=sample(1,0);assert(out[0]==initial&&out[1]==0);
   r->reset(p);out=sample(0,0);assert(out[0]==0&&out[1]==0);
  }
  auto bad=effect(filter);bad.nodes[0].p0=1;CanvasPlan rejected{};assert(!compile_canvas(bad,rejected));
  if(filter){bad=effect(true);bad.nodes[1].p0=19;assert(!compile_canvas(bad,rejected));bad=effect(true);bad.nodes[1].p1=21;assert(!compile_canvas(bad,rejected));}
 }
 double energies[3]{};
 for(unsigned setting=0;setting<3;setting++){
  auto g=effect(true);CanvasPlan p{};assert(compile_canvas(g,p));auto r=std::make_unique<CanvasRuntime>();r->reset(p);
  const double cutoff=setting?18000:80,resonance=setting==2?2:.7;
  auto next=r->plan();assert(change_canvas_param(next,2,0,cutoff));assert(r->param(next,2,0,cutoff,0,discard));
  next=r->plan();assert(change_canvas_param(next,2,1,resonance));assert(r->param(next,2,1,resonance,0,discard));
  for(unsigned frame=0;frame<2048;frame++){
   const auto out=r->signal_sample(0,0,1,discard,false,{frame==0?1.:0.,0});
   assert(std::isfinite(out[0])&&out[1]==0);energies[setting]+=out[0]*out[0];
  }
 }
 assert(energies[1]>energies[0]*10&&std::abs(energies[2]-energies[1])>.001);
 {
  UltraCanvasGraph g{};g.revision=1;g.node_count=5;
  for(unsigned slot=0;slot<5;slot++)g.nodes[slot].id=slot+1;
  g.nodes[0].kind=AudioIn;g.nodes[1].kind=LineSignal;g.nodes[1].p0=.5;
  g.nodes[2].kind=g.nodes[3].kind=SignalMultiply;g.nodes[4].kind=SignalDac;std::strcpy(g.nodes[4].text,"1 2");
  for(unsigned channel=0;channel<2;channel++){
   g.edges[g.edge_count++]={1,channel,3+channel,0};g.edges[g.edge_count++]={2,0,3+channel,1};g.edges[g.edge_count++]={3+channel,0,5,channel};
  }
  CanvasPlan p{};assert(compile_canvas(g,p));auto r=std::make_unique<CanvasRuntime>();r->reset(p);
  auto out=r->signal_sample(0,0,1,discard,false,{.8,-.4});assert(out[0]==.4&&out[1]==-.2);
  auto next=r->plan();assert(change_canvas_param(next,2,0,.25));assert(r->param(next,2,0,.25,0,discard));
  out=r->signal_sample(0,0,1,discard,false,{.8,-.4});assert(out[0]==.2&&out[1]==-.1);
 }
 std::puts("PASS: stereo input separation, silent ordinary roots, Faust impulse tail/reset and live cutoff/resonance");
}
