#pragma once
#include "patch_graph.h"
#include "../../core/engine.hpp"
#include <array>
#include <algorithm>
#include <cmath>
#include <cstdint>

namespace ultra {
enum CanvasKind : unsigned { Bang,Message,Number,Toggle,Add,Multiply,Metro,Counter,Chord,MakeNote,MidiIn,Voice,Gain,Join,Dac };
struct CanvasMessage { unsigned count=0; std::array<double,3> values{}; };
inline bool canvas_number(double v) noexcept {return std::isfinite(v)&&v>=-100000&&v<=100000;}
inline bool canvas_range(double v,double lo,double hi,bool integer=false) noexcept {return std::isfinite(v)&&v>=lo&&v<=hi&&(!integer||std::floor(v)==v);}
inline unsigned canvas_inlets(unsigned kind) noexcept {
 static constexpr unsigned n[]={1,1,2,1,2,2,2,2,2,3,0,3,2,2,1};return kind<=Dac?n[kind]:0;
}
// 0 = absent, 1 = control, 2 = mono audio, 3 = stereo audio.
inline unsigned canvas_input(unsigned kind,unsigned inlet) noexcept {
 if(inlet>=canvas_inlets(kind))return 0;
 if(kind==Gain&&inlet==0)return 2;
 if(kind==Join)return 2;
 if(kind==Dac)return 3;
 return 1;
}
inline unsigned canvas_output(unsigned kind,unsigned outlet) noexcept {
 if(outlet||kind>Dac||kind==Dac)return 0;
 return kind==Voice||kind==Gain?2:kind==Join?3:1;
}
inline bool canvas_param_valid(unsigned kind,unsigned param,double value) noexcept {
 switch(kind){
 case Number:case Add:case Multiply:return param==0&&canvas_number(value);
 case Toggle:return param==0&&canvas_range(value,0,1,true);
 case Metro:return param==0&&canvas_range(value,20,2000);
 case Counter:return param==0&&canvas_range(value,1,32,true);
 case Chord:return (param==0&&canvas_range(value,0,127,true))||(param==1&&canvas_range(value,0,2,true));
 case MakeNote:return (param==0&&canvas_range(value,1,127,true))||(param==1&&canvas_range(value,10,2000));
 case MidiIn:return false;
 case Voice:return param<2&&canvas_range(value,0,127,true);
 case Gain:return param==0&&canvas_range(value,0,127,true);
 default:return false;
 }
}
struct CanvasPlan {
 UltraCanvasGraph graph{};
 struct Edge {unsigned from=0,to=0,inlet=0;};
 std::array<Edge,64> edges{};
 std::array<int,2> output{{-1,-1}}; // physical channel -> prepared voice bank
 int find(uint32_t id)const noexcept {for(unsigned i=0;i<graph.node_count;i++)if(graph.nodes[i].id==id)return int(i);return -1;}
};
inline bool compile_canvas(const UltraCanvasGraph& g,CanvasPlan& out) noexcept {
 if(!g.revision||g.node_count>32||g.edge_count>64)return false;
 CanvasPlan p{};p.graph=g;
 unsigned devices=0,joins=0,dacs=0;
 for(unsigned i=0;i<g.node_count;i++){
  const auto& n=g.nodes[i];if(!n.id||n.kind>Dac||!canvas_number(n.p0)||!canvas_number(n.p1)||!canvas_number(n.p2))return false;
  for(unsigned j=0;j<i;j++)if(g.nodes[j].id==n.id)return false;
  if(n.kind!=Voice&&n.device)return false;
  if(n.kind!=Message&&n.count)return false;
  switch(n.kind){
   case Message:if(n.count>3||(n.count<3&&n.p2)||(n.count<2&&n.p1)||(!n.count&&n.p0))return false;break;
   case Chord:case MakeNote:if(!canvas_param_valid(n.kind,0,n.p0)||!canvas_param_valid(n.kind,1,n.p1)||n.p2)return false;break;
   case MidiIn:if(!canvas_range(n.p0,1,16,true)||n.p1||n.p2)return false;break;
   case Voice:if(n.device>1||(devices&(1u<<n.device))||!canvas_param_valid(Voice,0,n.p0)||!canvas_param_valid(Voice,1,n.p1)||n.p2)return false;devices|=1u<<n.device;break;
   case Bang:case Join:case Dac:if(n.p0||n.p1||n.p2)return false;break;
   default:if(!canvas_param_valid(n.kind,0,n.p0)||n.p1||n.p2)return false;
  }
  if(n.kind==Join&&++joins>1)return false;
  if(n.kind==Dac&&++dacs>1)return false;
 }
 std::array<unsigned,32> indegree{};std::array<unsigned,32> audio_in{},audio_out{};
 std::array<int,32> gain_voice{};gain_voice.fill(-1);
 int join=-1,dac=-1;std::array<int,2> join_gain{{-1,-1}};
 for(unsigned i=0;i<g.node_count;i++){if(g.nodes[i].kind==Join)join=i;if(g.nodes[i].kind==Dac)dac=i;}
 for(unsigned i=0;i<g.edge_count;i++){
  const auto& e=g.edges[i];int from=p.find(e.from),to=p.find(e.to);if(from<0||to<0)return false;
  const auto fk=g.nodes[from].kind,tk=g.nodes[to].kind;
  unsigned type=canvas_output(fk,e.outlet);if(!type||type!=canvas_input(tk,e.inlet))return false;
  for(unsigned j=0;j<i;j++){const auto& x=g.edges[j];if(e.from==x.from&&e.outlet==x.outlet&&e.to==x.to&&e.inlet==x.inlet)return false;}
  p.edges[i]={unsigned(from),unsigned(to),e.inlet};++indegree[to];
  if(type==1)continue;
  if(fk==Voice&&tk==Gain){if(++audio_out[from]>1||++audio_in[to]>1)return false;gain_voice[to]=from;}
  else if(fk==Gain&&tk==Join){if(join_gain[e.inlet]>=0)return false;join_gain[e.inlet]=from;++audio_out[from];}
  else if(fk==Join&&tk==Dac){if(++audio_out[from]>1||++audio_in[to]>1)return false;}
  else return false;
 }
 // Kahn validation includes both control and signal edges: feedback is not supported.
 std::array<unsigned,32> queue{};unsigned head=0,tail=0;
 for(unsigned i=0;i<g.node_count;i++)if(!indegree[i])queue[tail++]=i;
 while(head<tail){unsigned slot=queue[head++];for(unsigned e=0;e<g.edge_count;e++)if(p.edges[e].from==slot&&!--indegree[p.edges[e].to])queue[tail++]=p.edges[e].to;}
 if(tail!=g.node_count)return false;
 if(join>=0&&dac>=0&&audio_out[join])for(unsigned c=0;c<2;c++)if(join_gain[c]>=0&&gain_voice[join_gain[c]]>=0)p.output[c]=int(g.nodes[gain_voice[join_gain[c]]].device);
 out=p;return true;
}
inline bool canvas_event_valid(const CanvasPlan& p,uint64_t revision,uint32_t node,unsigned inlet,const CanvasMessage& m) noexcept {
 int slot=p.find(node);if(revision!=p.graph.revision||slot<0||canvas_input(p.graph.nodes[slot].kind,inlet)!=1||m.count>3)return false;
 for(unsigned i=0;i<m.count;i++)if(!canvas_number(m.values[i]))return false;
 return true;
}
inline bool change_canvas_param(CanvasPlan& p,uint32_t id,unsigned param,double value) noexcept {
 int slot=p.find(id);if(slot<0||!canvas_param_valid(p.graph.nodes[slot].kind,param,value))return false;
 auto g=p.graph;auto& n=g.nodes[slot];
 if(param==0)n.p0=value;else if(param==1)n.p1=value;else return false;
 CanvasPlan compiled{};if(!compile_canvas(g,compiled))return false;p=compiled;return true;
}

// A fixed, callback-owned control graph. All traversal, timers and messages are
// bounded. No allocation, ownership destruction, wall clock, DSP creation or locks.
class CanvasRuntime {
 CanvasPlan plan_{};
 struct State {double value=0,hot=0;uint64_t pulses=0,next=0;bool armed=false;};
 std::array<State,32> states_{};
 struct Timer {uint64_t due=0;unsigned slot=0,pitch=0;bool active=false;};
 std::array<Timer,64> timers_{};
 uint64_t frame_=0;unsigned budget_=4096;bool failed_=false;
 static unsigned midi(double v)noexcept{return unsigned(std::clamp(std::floor(v),0.,127.));}
 static double bounded(double v)noexcept{return std::clamp(v,-100000.,100000.);}
 static uint64_t duration(double ms)noexcept{return uint64_t(std::ceil(ms*48.));}
 template<class Emit> bool emit_event(unsigned offset,unsigned device,alive::Kind kind,unsigned note,unsigned value,Emit& emit)noexcept{
  if(!emit({offset,uint8_t(device),kind,uint8_t(note),uint8_t(value)})){fail();return false;}return true;
 }
 public:
 void begin_callback()noexcept{budget_=4096;}
 void fail()noexcept{failed_=true;for(auto& s:states_)s.armed=false;for(auto& t:timers_)t.active=false;}
 bool failed()const noexcept{return failed_;}
 const CanvasPlan& plan()const noexcept{return plan_;}
 uint64_t frame()const noexcept{return frame_;}
 double value(unsigned slot)const noexcept{return states_[slot].value;}
 uint64_t pulses(unsigned slot)const noexcept{return states_[slot].pulses;}
 void reset(const CanvasPlan& p,bool reset_budget=true)noexcept{
  plan_=p;states_={};timers_={};frame_=0;if(reset_budget)budget_=4096;failed_=false;
  for(unsigned i=0;i<plan_.graph.node_count;i++)states_[i].value=plan_.graph.nodes[i].p0;
  clear_timers();
 }
 void clear_timers()noexcept{for(unsigned i=0;i<plan_.graph.node_count;i++){states_[i].armed=false;if(plan_.graph.nodes[i].kind==Toggle){plan_.graph.nodes[i].p0=0;states_[i].value=0;}if(plan_.graph.nodes[i].kind==Metro)states_[i].value=0;}for(auto& t:timers_)t.active=false;}
 template<class Emit> bool stop(unsigned offset,Emit& emit)noexcept{
  clear_timers();return emit_event(offset,0,alive::Kind::HardClear,0,0,emit)&&emit_event(offset,1,alive::Kind::HardClear,0,0,emit);
 }
 template<class Emit> bool configure_voices(unsigned offset,Emit& emit)noexcept{
  // Both banks start silent. A disconnected gain does not affect another path.
  for(unsigned d=0;d<2;d++)if(!emit_event(offset,d,alive::Kind::Level,0,0,emit))return false;
  for(unsigned i=0;i<plan_.graph.node_count;i++){
   const auto& n=plan_.graph.nodes[i];
   if(n.kind==Voice){if(!emit_event(offset,n.device,alive::Kind::Attack,0,unsigned(n.p0),emit)||!emit_event(offset,n.device,alive::Kind::Release,0,unsigned(n.p1),emit))return false;}
   if(n.kind==Gain)for(unsigned e=0;e<plan_.graph.edge_count;e++)if(plan_.edges[e].to==i&&plan_.graph.nodes[plan_.edges[e].from].kind==Voice)
    if(!emit_event(offset,plan_.graph.nodes[plan_.edges[e].from].device,alive::Kind::Level,0,unsigned(n.p0),emit))return false;
  }return true;
 }
 template<class Emit> bool param(const CanvasPlan& next,unsigned id,unsigned param,double value,unsigned offset,Emit& emit)noexcept{
  int slot=plan_.find(id);if(slot<0||next.graph.revision!=plan_.graph.revision)return false;
  const auto kind=plan_.graph.nodes[slot].kind;
  if(param==0)plan_.graph.nodes[slot].p0=value;else if(param==1)plan_.graph.nodes[slot].p1=value;else return false;
  if(param==0)states_[slot].value=value;
  if(kind==Counter)states_[slot].hot=std::fmod(states_[slot].hot,value);
  if(kind==Voice)return emit_event(offset,plan_.graph.nodes[slot].device,param==0?alive::Kind::Attack:alive::Kind::Release,0,unsigned(value),emit);
  if(kind==Gain){for(unsigned e=0;e<plan_.graph.edge_count;e++)if(plan_.edges[e].to==unsigned(slot)&&plan_.graph.nodes[plan_.edges[e].from].kind==Voice)return emit_event(offset,plan_.graph.nodes[plan_.edges[e].from].device,alive::Kind::Level,0,unsigned(value),emit);}
  return true;
 }
 template<class Emit> bool dispatch(unsigned slot,unsigned inlet,CanvasMessage message,unsigned offset,Emit& emit,bool output=false)noexcept{
  struct Item{unsigned slot,inlet;CanvasMessage message;bool output;};
  std::array<Item,256> stack{};unsigned size=1;stack[0]={slot,inlet,message,output};
  while(size&&!failed_){
   if(!budget_--){fail();break;}
   auto item=stack[--size];auto& node=plan_.graph.nodes[item.slot];auto& state=states_[item.slot];auto msg=item.message;bool forward=item.output;
   if(!item.output){
    ++state.pulses;if(msg.count)state.value=msg.values[0];const bool scalar=msg.count==1,bang=msg.count==0;
    switch(node.kind){
     case Bang:msg={};forward=true;break;
     case Message:msg={node.count,{node.p0,node.p1,node.p2}};forward=true;break;
     case Number:if(scalar){node.p0=bounded(msg.values[0]);state.value=node.p0;}if(scalar||bang){msg={1,{node.p0,0,0}};forward=item.inlet==0;}break;
     case Toggle:if(bang)node.p0=node.p0?0:1;else if(scalar)node.p0=msg.values[0]!=0;else break;state.value=node.p0;msg={1,{node.p0,0,0}};forward=true;break;
     case Add:case Multiply:
      if(item.inlet==1){if(scalar)node.p0=bounded(msg.values[0]);break;}
      if(scalar)state.hot=bounded(msg.values[0]);
      if(scalar||bang){state.value=bounded(node.kind==Add?state.hot+node.p0:state.hot*node.p0);msg={1,{state.value,0,0}};forward=true;}break;
     case Metro:
      if(item.inlet==1){if(scalar)node.p0=std::clamp(msg.values[0],20.,2000.);break;}
      if(bang){msg={};forward=true;}else if(scalar){if(msg.values[0]&&!state.armed)state.next=frame_;state.armed=msg.values[0]!=0;state.value=state.armed;}break;
     case Counter:
      if(item.inlet==1){if(scalar)state.hot=std::fmod(std::max(0.,std::floor(msg.values[0])),node.p0);break;}
      if(bang){state.value=state.hot;msg={1,{state.hot,0,0}};state.hot=std::fmod(state.hot+1,node.p0);forward=true;}break;
     case Chord:
      if(item.inlet==1){if(scalar)node.p0=midi(msg.values[0]);break;}
      if(scalar){static constexpr unsigned triads[3][3]={{0,4,7},{0,3,7},{0,5,7}};unsigned ix=unsigned(std::max(0.,std::floor(msg.values[0])));state.value=midi(node.p0+triads[unsigned(node.p1)][ix%3]+12.*(ix/3));msg={1,{state.value,0,0}};forward=true;}break;
     case MakeNote:
      if(item.inlet){if(scalar){if(item.inlet==1)node.p0=std::clamp(std::floor(msg.values[0]),1.,127.);else node.p1=std::clamp(msg.values[0],10.,2000.);}break;}
      if(scalar){unsigned t=0;while(t<timers_.size()&&timers_[t].active)++t;if(t==timers_.size()){fail();break;}unsigned pitch=midi(msg.values[0]);timers_[t]={frame_+duration(node.p1),item.slot,pitch,true};msg={2,{double(pitch),node.p0,0}};forward=true;}break;
     case Voice:
      if(item.inlet){if(scalar){unsigned v=midi(msg.values[0]);if(item.inlet==1)node.p0=v;else node.p1=v;emit_event(offset,node.device,item.inlet==1?alive::Kind::Attack:alive::Kind::Release,0,v,emit);}break;}
      if(msg.count==2){unsigned pitch=midi(msg.values[0]),velocity=midi(msg.values[1]);emit_event(offset,node.device,velocity?alive::Kind::On:alive::Kind::Off,pitch,velocity,emit);}break;
     case Gain:
      if(item.inlet==1&&scalar){node.p0=midi(msg.values[0]);for(unsigned e=0;e<plan_.graph.edge_count;e++)if(plan_.edges[e].to==item.slot&&plan_.graph.nodes[plan_.edges[e].from].kind==Voice)emit_event(offset,plan_.graph.nodes[plan_.edges[e].from].device,alive::Kind::Level,0,unsigned(node.p0),emit);}break;
     default:break;
    }
   }else{++state.pulses;if(msg.count)state.value=msg.values[0];}
   if(forward&&!failed_)for(unsigned e=plan_.graph.edge_count;e>0;--e){const auto& edge=plan_.edges[e-1];if(edge.from!=item.slot||canvas_output(node.kind,0)!=1)continue;if(size==stack.size()){fail();break;}stack[size++]={edge.to,edge.inlet,msg,false};}
  }return !failed_;
 }
 template<class Emit> bool event(uint64_t revision,uint32_t id,unsigned inlet,const CanvasMessage& msg,unsigned offset,Emit& emit)noexcept{
  if(!canvas_event_valid(plan_,revision,id,inlet,msg))return false;
  return dispatch(unsigned(plan_.find(id)),inlet,msg,offset,emit);
 }
 template<class Emit> bool midi_input(unsigned channel,unsigned pitch,unsigned velocity,unsigned offset,Emit& emit)noexcept{
  for(unsigned i=0;i<plan_.graph.node_count;i++)if(plan_.graph.nodes[i].kind==MidiIn&&plan_.graph.nodes[i].p0==channel)
   if(!dispatch(i,0,{2,{double(pitch),double(velocity),0}},offset,emit,true))return false;
  return true;
 }
 template<class Emit> bool sample(unsigned offset,Emit& emit)noexcept{
  if(!failed_){
   for(auto& timer:timers_)if(timer.active&&timer.due<=frame_){timer.active=false;if(!dispatch(timer.slot,0,{2,{double(timer.pitch),0,0}},offset,emit,true))break;}
   for(unsigned i=0;i<plan_.graph.node_count&&!failed_;i++)if(plan_.graph.nodes[i].kind==Metro&&states_[i].armed&&states_[i].next<=frame_){states_[i].next=frame_+duration(plan_.graph.nodes[i].p0);dispatch(i,0,{},offset,emit,true);}
  }++frame_;return !failed_;
 }
};
}
