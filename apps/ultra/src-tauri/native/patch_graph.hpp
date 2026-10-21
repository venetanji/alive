#pragma once
#include "patch_graph.h"
#include "canvas_message.hpp"
#include "canvas_objects.hpp"
#include "../../core/engine.hpp"
#include <array>
#include <algorithm>
#include <cmath>
#include <cstdint>

namespace ultra {
inline unsigned canvas_inlets(unsigned kind) noexcept {
 static constexpr unsigned n[]={1,1,2,1,2,2,2,2,2,3,0,3,2,2,1,2,2,1,1,2,1,2,2,1,3};return kind<=Line?n[kind]:0;
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
 if(outlet||kind>Line||kind==Dac)return 0;
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
 case Int:case Float:return param==0&&canvas_number(value);
 case Flonum:return param<3?canvas_number(value):param==3&&canvas_range(value,0,9,true);
 case Slider:return (param==0||param==2||param==3)?canvas_number(value):param==1?canvas_range(value,1,100000,true):param==4&&canvas_range(value,0,1,true);
 case Line:return param==0?canvas_number(value):param==1?canvas_range(value,0,100000):param==2?canvas_range(value,1,100000):param==3&&canvas_range(value,0,2,true);
 default:return false;
 }
}
inline unsigned canvas_inlets(const UltraCanvasNode& node) noexcept {
 CanvasMessage args{};
 if(node.kind==Pack||node.kind==Select||node.kind==Route){
  if(!canvas_creation_args(node,args))return 0;
  return node.kind==Pack?args.count:node.kind==Route?args.count+1:args.count==1?2:1;
 }
 return canvas_inlets(node.kind);
}
inline unsigned canvas_outlets(const UltraCanvasNode& node) noexcept {
 CanvasMessage args{};
 if(node.kind==Unpack||node.kind==Select||node.kind==Route||node.kind==Trigger){
  if(!canvas_creation_args(node,args))return 0;
  return args.count+(node.kind==Select||node.kind==Route);
 }
 return node.kind==Flonum||node.kind==Line?2:node.kind==Dac?0:1;
}
inline unsigned canvas_input(const UltraCanvasNode& node,unsigned inlet) noexcept {
 return inlet<canvas_inlets(node)?(node.kind>Dac?1:canvas_input(node.kind,inlet)):0;
}
inline unsigned canvas_output(const UltraCanvasNode& node,unsigned outlet) noexcept {
 return outlet<canvas_outlets(node)?(node.kind>Dac?1:canvas_output(node.kind,outlet)):0;
}
struct CanvasPlan {
 UltraCanvasGraph graph{};
 struct Edge {unsigned from=0,to=0,inlet=0,outlet=0;};
 std::array<Edge,64> edges{};
 std::array<CanvasMessage,32> arguments{};
 std::array<int,2> output{{-1,-1}}; // physical channel -> prepared voice bank
 int find(uint32_t id)const noexcept {for(unsigned i=0;i<graph.node_count;i++)if(graph.nodes[i].id==id)return int(i);return -1;}
};
inline bool compile_canvas(const UltraCanvasGraph& g,CanvasPlan& out) noexcept {
 if(!g.revision||g.node_count>32||g.edge_count>64)return false;
 CanvasPlan p{};p.graph=g;
 unsigned devices=0,joins=0,dacs=0;
 for(unsigned i=0;i<g.node_count;i++){
  const auto& n=g.nodes[i];if(!n.id||n.kind>Line||!canvas_number(n.p0)||!canvas_number(n.p1)||!canvas_number(n.p2)||!canvas_number(n.p3)||!canvas_number(n.p4)||!canvas_number(n.p5)||!canvas_text(n.text,128))return false;
  for(unsigned j=0;j<i;j++)if(g.nodes[j].id==n.id)return false;
  if(n.kind!=Voice&&n.device)return false;
  if(n.kind!=Message&&n.count)return false;
  if(n.kind<Dac+1&&(n.p3||n.p4||n.p5||(n.kind!=Message&&n.text[0])))return false;
  switch(n.kind){
   case Message:
    if(n.text[0]){if(n.count||n.p0||n.p1||n.p2||!canvas_parse_message(n.text,p.arguments[i]))return false;}
    else {if(n.count>3||(n.count<3&&n.p2)||(n.count<2&&n.p1)||(!n.count&&n.p0))return false;p.arguments[i]={n.count,{n.p0,n.p1,n.p2}};}
    break;
   case Chord:case MakeNote:if(!canvas_param_valid(n.kind,0,n.p0)||!canvas_param_valid(n.kind,1,n.p1)||n.p2)return false;break;
   case MidiIn:if(!canvas_range(n.p0,1,16,true)||n.p1||n.p2)return false;break;
   case Voice:if(n.device>1||(devices&(1u<<n.device))||!canvas_param_valid(Voice,0,n.p0)||!canvas_param_valid(Voice,1,n.p1)||n.p2)return false;devices|=1u<<n.device;break;
   case Bang:case Join:case Dac:if(n.p0||n.p1||n.p2)return false;break;
   case Int:case Float:if(!canvas_param_valid(n.kind,0,n.p0)||n.p1||n.p2||n.p3||n.p4||n.p5||n.text[0])return false;break;
   case Flonum:
    if(!canvas_param_valid(n.kind,0,n.p0)||!canvas_param_valid(n.kind,1,n.p1)||!canvas_param_valid(n.kind,2,n.p2)||!canvas_param_valid(n.kind,3,n.p3)||n.p1>n.p2||n.p4||n.p5||n.text[0])return false;
    break;
   case Slider:
    if(!canvas_param_valid(n.kind,0,n.p0)||!canvas_param_valid(n.kind,1,n.p1)||!canvas_param_valid(n.kind,2,n.p2)||!canvas_param_valid(n.kind,3,n.p3)||!canvas_param_valid(n.kind,4,n.p4)||n.p5||n.text[0])return false;
    break;
   case Line:
    if(!canvas_param_valid(n.kind,0,n.p0)||!canvas_param_valid(n.kind,1,n.p1)||!canvas_param_valid(n.kind,2,n.p2)||!canvas_param_valid(n.kind,3,n.p3)||n.p4||n.p5||n.text[0])return false;
    break;
   case Pack:case Unpack:case Select:case Route:case Trigger:
    if(n.p0||n.p1||n.p2||n.p3||n.p4||n.p5||!canvas_creation_args(n,p.arguments[i]))return false;
    break;
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
  unsigned type=canvas_output(g.nodes[from],e.outlet);if(!type||type!=canvas_input(g.nodes[to],e.inlet))return false;
  for(unsigned j=0;j<i;j++){const auto& x=g.edges[j];if(e.from==x.from&&e.outlet==x.outlet&&e.to==x.to&&e.inlet==x.inlet)return false;}
  p.edges[i]={unsigned(from),unsigned(to),e.inlet,e.outlet};++indegree[to];
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
 int slot=p.find(node);return revision==p.graph.revision&&slot>=0&&canvas_input(p.graph.nodes[slot],inlet)==1&&canvas_message_valid(m);
}
inline bool change_canvas_param(CanvasPlan& p,uint32_t id,unsigned param,double value) noexcept {
 int slot=p.find(id);if(slot<0||!canvas_param_valid(p.graph.nodes[slot].kind,param,value))return false;
 auto g=p.graph;auto& n=g.nodes[slot];
 if(param==0)n.p0=value;else if(param==1)n.p1=value;else if(param==2)n.p2=value;else if(param==3)n.p3=value;else if(param==4)n.p4=value;else if(param==5)n.p5=value;else return false;
 CanvasPlan compiled{};if(!compile_canvas(g,compiled))return false;p=compiled;return true;
}

// A fixed, callback-owned control graph. All traversal, timers and messages are
// bounded. No allocation, ownership destruction, wall clock, DSP creation or locks.
class CanvasRuntime {
 CanvasPlan plan_{};
 struct State {
  double value=0,hot=0,start=0,target=0;
  uint64_t pulses=0,next=0,started=0,length=0,paused_at=0;
  bool armed=false,paused=false;
  CanvasMessage stored{},last{};
  std::array<double,4> targets{},times{};
  unsigned segments=0,segment=0;
 };
 std::array<State,32> states_{};
 struct Timer {uint64_t due=0;unsigned slot=0,pitch=0;bool active=false;};
 std::array<Timer,64> timers_{};
 uint64_t frame_=0;unsigned budget_=4096;bool failed_=false;
 static unsigned midi(double v)noexcept{return unsigned(std::clamp(std::floor(v),0.,127.));}
 static double bounded(double v)noexcept{return std::clamp(v,-100000.,100000.);}
 static uint64_t duration(double ms)noexcept{return uint64_t(std::ceil(ms*48.));}
 void stop_line(State& state)noexcept {state.armed=false;state.paused=false;state.segments=0;state.segment=0;}
 void start_segment(unsigned slot)noexcept {
  auto& state=states_[slot];state.start=state.value;state.target=state.targets[state.segment];
  state.started=frame_;state.length=duration(state.times[state.segment]);state.next=frame_;state.armed=true;state.paused=false;
 }
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
 const CanvasMessage& last_message(unsigned slot)const noexcept{return states_[slot].last;}
 void reset(const CanvasPlan& p,bool reset_budget=true)noexcept{
  plan_=p;states_={};timers_={};frame_=0;if(reset_budget)budget_=4096;failed_=false;
  for(unsigned i=0;i<plan_.graph.node_count;i++){
   const auto& n=plan_.graph.nodes[i];auto& s=states_[i];s.value=n.kind==Int?std::trunc(n.p0):n.kind==Flonum?std::clamp(n.p0,n.p1,n.p2):n.p0;
   s.stored=plan_.arguments[i];
  }
  clear_timers();
 }
 void clear_timers()noexcept{for(unsigned i=0;i<plan_.graph.node_count;i++){stop_line(states_[i]);if(plan_.graph.nodes[i].kind==Toggle){plan_.graph.nodes[i].p0=0;states_[i].value=0;}if(plan_.graph.nodes[i].kind==Metro)states_[i].value=0;}for(auto& t:timers_)t.active=false;}
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
  if(!canvas_param_valid(kind,param,value))return false;
  auto& node=plan_.graph.nodes[slot];
  if(kind==Flonum&&((param==1&&value>node.p2)||(param==2&&value<node.p1)))return false;
  if(param==0)node.p0=value;else if(param==1)node.p1=value;else if(param==2)node.p2=value;
  else if(param==3)node.p3=value;else if(param==4)node.p4=value;else if(param==5)node.p5=value;else return false;
  if(param==0){states_[slot].value=kind==Int?std::trunc(value):value;if(kind==Line)stop_line(states_[slot]);}
  if(kind==Flonum)states_[slot].value=std::clamp(states_[slot].value,plan_.graph.nodes[slot].p1,plan_.graph.nodes[slot].p2);
  if(kind==Counter)states_[slot].hot=std::fmod(states_[slot].hot,value);
  if(kind==Voice)return emit_event(offset,plan_.graph.nodes[slot].device,param==0?alive::Kind::Attack:alive::Kind::Release,0,unsigned(value),emit);
  if(kind==Gain){for(unsigned e=0;e<plan_.graph.edge_count;e++)if(plan_.edges[e].to==unsigned(slot)&&plan_.graph.nodes[plan_.edges[e].from].kind==Voice)return emit_event(offset,plan_.graph.nodes[plan_.edges[e].from].device,alive::Kind::Level,0,unsigned(value),emit);}
  return true;
 }
 template<class Emit> bool dispatch(unsigned slot,unsigned inlet,CanvasMessage message,unsigned offset,Emit& emit,bool output=false,unsigned outlet=0)noexcept{
  struct Item{unsigned slot,inlet;CanvasMessage message;bool output;unsigned outlet;};
  std::array<Item,256> stack{};unsigned size=1;stack[0]={slot,inlet,message,output,outlet};
  while(size&&!failed_){
   if(!budget_--){fail();break;}
   auto item=stack[--size];auto& node=plan_.graph.nodes[item.slot];auto& state=states_[item.slot];auto msg=item.message;bool forward=item.output;
   auto push=[&](unsigned port,const CanvasMessage& value){if(size==stack.size()){fail();return;}stack[size++]={item.slot,0,value,true,port};};
   if(!item.output){
    ++state.pulses;state.last=msg;if(node.kind<=Dac&&msg.count&&canvas_numeric_message(msg))state.value=msg.values[0];
    const bool scalar=msg.count==1&&canvas_numeric_message(msg),bang=canvas_bang(msg);
    switch(node.kind){
     case Bang:msg={};forward=true;break;
     case Message:msg=plan_.arguments[item.slot];forward=true;break;
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
      if(msg.count==2&&canvas_numeric_message(msg)){unsigned pitch=midi(msg.values[0]),velocity=midi(msg.values[1]);emit_event(offset,node.device,velocity?alive::Kind::On:alive::Kind::Off,pitch,velocity,emit);}break;
     case Gain:
      if(item.inlet==1&&scalar){node.p0=midi(msg.values[0]);for(unsigned e=0;e<plan_.graph.edge_count;e++)if(plan_.edges[e].to==item.slot&&plan_.graph.nodes[plan_.edges[e].from].kind==Voice)emit_event(offset,plan_.graph.nodes[plan_.edges[e].from].device,alive::Kind::Level,0,unsigned(node.p0),emit);}break;
     case Int:case Float:case Flonum:case Slider: {
      if(node.kind==Flonum&&canvas_named(msg,"tab")){push(1,{});break;}
      if(node.kind==Flonum&&(canvas_named(msg,"min")||canvas_named(msg,"max"))){
       if(msg.count&&msg.tags[0]!=2){if(canvas_named(msg,"min")&&msg.values[0]<=node.p2)node.p1=msg.values[0];if(canvas_named(msg,"max")&&msg.values[0]>=node.p1)node.p2=msg.values[0];}
       else if(!msg.count){if(canvas_named(msg,"min"))node.p1=-100000;else node.p2=100000;}
       state.value=std::clamp(state.value,node.p1,node.p2);break;
      }
      if(node.kind==Slider&&canvas_named(msg,"setminmax")&&msg.count==2&&msg.tags[0]!=2&&msg.tags[1]!=2){
       node.p2=msg.values[0];node.p3=msg.values[1]-msg.values[0];node.p1=2;node.p4=1;break;
      }
      const bool silent=canvas_named(msg,"set");
      const bool number=msg.count&&msg.tags[0]!=2&&(!msg.selector[0]||canvas_named(msg,"list")||silent);
      const bool repeat_list=node.kind==Flonum&&msg.count>1&&number&&!silent;
      if(number){
       double value=msg.values[0];
       if(node.kind==Int||(node.kind==Slider&&!node.p4))value=std::trunc(value);
       if(node.kind==Flonum)value=std::clamp(value,node.p1,node.p2);
       state.value=value;node.p0=value;
      }
      if((number||bang)&&!silent&&item.inlet==0){
       const unsigned tag=node.kind==Int||(node.kind==Slider&&!node.p4)?0:1;
       const double value=node.kind==Slider?bounded(state.value*node.p3+node.p2):state.value;
       msg=canvas_scalar(value,tag);if(repeat_list)push(0,msg);forward=true;
      }
      break;
     }
     case Pack: {
      const bool silent=canvas_named(msg,"set");
      if(!bang){
       CanvasMessage atoms=silent?msg:canvas_atoms(msg,false);atoms.selector[0]=0;
       for(unsigned i=0;i<atoms.count&&i+item.inlet<state.stored.count;i++){
        const unsigned target=i+item.inlet;auto converted=canvas_coerce_atom(atoms,i,plan_.arguments[item.slot].tags[target]);
        canvas_store_atom(state.stored,target,converted,0);
       }
      }
      if(item.inlet==0&&!silent){msg=canvas_sequence_message(state.stored);forward=true;}
      break;
     }
     case Unpack: {
      auto atoms=canvas_atoms(msg);const unsigned count=bang?state.stored.count:std::min(atoms.count,state.stored.count);
      for(unsigned i=0;i<count;i++){
       if(!bang){
        const unsigned tag=plan_.arguments[item.slot].tags[i];
        if(tag==2&&atoms.tags[i]!=2)continue;
        auto converted=canvas_coerce_atom(atoms,i,tag);canvas_store_atom(state.stored,i,converted,0);
       }
       push(i,canvas_atom(state.stored,i));
      }
      break;
     }
     case Select:case Route: {
      auto atoms=canvas_atoms(msg,false);
      if(bang){atoms={};atoms.count=1;atoms.tags[0]=2;canvas_copy_symbol(atoms.symbols[0],"bang");}
      if(item.inlet){
       const unsigned target=node.kind==Route?item.inlet-1:0;
       if(atoms.count&&target<state.stored.count)canvas_store_atom(state.stored,target,atoms,0);
       break;
      }
      unsigned match=0;while(match<state.stored.count&&!canvas_atom_matches(state.stored,match,atoms,node.kind==Select))++match;
      if(match==state.stored.count){
       if(node.kind==Select&&bang){msg={};msg.count=1;msg.tags[0]=2;canvas_copy_symbol(msg.symbols[0],"bang");canvas_copy_symbol(msg.selector,"symbol");}
       push(match,msg);
      }else if(node.kind==Select)push(match,{});
      else {
       CanvasMessage rest{};rest.count=atoms.count?atoms.count-1:0;
       for(unsigned i=0;i<rest.count;i++)canvas_store_atom(rest,i,atoms,i+1);
       push(match,canvas_sequence_message(rest));
      }
      break;
     }
     case Trigger:
      for(unsigned i=0;i<state.stored.count;i++)push(i,canvas_trigger_message(state.stored,i,msg));
      break;
     case Line: {
      if(canvas_named(msg,"stop")){stop_line(state);break;}
      if(canvas_named(msg,"pause")){if(state.armed&&!state.paused){state.paused=true;state.paused_at=frame_;}break;}
      if(canvas_named(msg,"resume")){if(state.armed&&state.paused){state.started+=frame_-state.paused_at;state.next=frame_;state.paused=false;}break;}
      if(canvas_named(msg,"set")){if(msg.count&&msg.tags[0]!=2){stop_line(state);state.value=msg.values[0];node.p0=state.value;}break;}
      if(!canvas_numeric_message(msg)||!msg.count)break;
      if(item.inlet){if(item.inlet==1)node.p1=std::clamp(msg.values[0],0.,100000.);else node.p2=std::clamp(msg.values[0],1.,100000.);break;}
      stop_line(state);
      if(msg.count==3)node.p2=std::clamp(msg.values[2],1.,100000.);
      state.segments=msg.count<4?1:msg.count/2;
      for(unsigned i=0;i<state.segments;i++){state.targets[i]=msg.values[i*2];state.times[i]=std::max(0.,msg.count==1?node.p1:msg.values[i*2+1]);}
      node.p1=0;start_segment(item.slot);
      if(!state.length&&state.segments==1){state.value=state.target;node.p0=state.value;stop_line(state);push(1,{});push(0,canvas_scalar(node.p3==0?std::trunc(state.value):state.value,node.p3==0?0:1));}
      break;
     }
     default:break;
    }
   }else{++state.pulses;state.last=msg;if(msg.count&&msg.tags[0]!=2&&node.kind!=Line)state.value=msg.values[0];}
   if(forward&&!failed_)for(unsigned e=plan_.graph.edge_count;e>0;--e){const auto& edge=plan_.edges[e-1];if(edge.from!=item.slot||edge.outlet!=item.outlet||canvas_output(node,item.outlet)!=1)continue;if(size==stack.size()){fail();break;}stack[size++]={edge.to,edge.inlet,msg,false,0};}
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
   for(unsigned i=0;i<plan_.graph.node_count&&!failed_;i++){
    auto& state=states_[i];auto& node=plan_.graph.nodes[i];if(node.kind!=Line||!state.armed||state.next>frame_)continue;
    const auto end=state.started+state.length;
    if(!state.paused)state.value=state.length?state.start+(state.target-state.start)*std::min(1.,double(frame_-state.started)/double(state.length)):state.target;
    double output=state.value;unsigned tag=node.p3==0?0:1;
    if(node.p3==2){
     const double distance=std::abs(state.target-state.start);
     const double step=state.length?distance*double(duration(node.p2))/double(state.length):distance;
     if(distance>1||step>=0.4)tag=0;
    }
    if(!tag)output=std::trunc(output);
    if(!dispatch(i,0,canvas_scalar(output,tag),offset,emit,true,0))break;
    if(!state.paused&&frame_>=end){
     node.p0=state.value;
     if(!dispatch(i,0,{},offset,emit,true,1))break;
     if(++state.segment<state.segments)start_segment(i);else stop_line(state);
    }else state.next=state.paused?frame_+duration(node.p2):std::min(end,frame_+duration(node.p2));
   }
  }++frame_;return !failed_;
 }
};
}
