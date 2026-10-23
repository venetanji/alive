#pragma once
#include "patch_graph.h"
#include "canvas_message.hpp"
#include "canvas_message_box.hpp"
#include "canvas_objects.hpp"
#include "canvas_list_objects.hpp"
#include "canvas_signal_objects.hpp"
#include "canvas_voice_objects.hpp"
#include "../../core/engine.hpp"
#include <array>
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <atomic>

namespace ultra {
inline bool canvas_relay_kind(unsigned kind)noexcept{return kind==Inlet||kind==Outlet;}
inline bool canvas_arithmetic_kind(unsigned kind)noexcept{return kind==Add||kind==Multiply||(kind>=Subtract&&kind<=Abs);}
inline bool canvas_arithmetic_valid(const UltraCanvasNode& node)noexcept {
 const auto mode=node.p1;
 return canvas_arithmetic_kind(node.kind)&&canvas_range(mode,node.kind==Add||node.kind==Multiply?0:1,2,true)
  &&canvas_number(node.p0)&&(node.kind==Abs?node.p0==0:mode!=1||std::trunc(node.p0)==node.p0)
  &&!node.p2&&!node.p3&&!node.p4&&!node.p5&&!node.text[0];
}
inline unsigned canvas_inlets(unsigned kind) noexcept {
 static constexpr unsigned n[]={1,1,2,1,2,2,2,2,2,3,0,3,2,2,1,2,2,1,1,2,1,2,2,1,3,1,1,1,1,1,1,2,2,2,2,2,2,2,1,2,2,2,2,2,2,1,3,2,2,2,1,1,1,2,2,2,2,2,2,1,2,1,3,5,2,1};return kind<=MixVoice?n[kind]:0;
}
// 5 is exactly four discrete voice lanes, distinct from stereo speaker feeds.
inline unsigned canvas_input(unsigned kind,unsigned inlet) noexcept {
 if(inlet>=canvas_inlets(kind))return 0;
 if(canvas_voice_kind(kind))return kind==PolyNote?1:inlet==0||kind==MultiplyVoice?5:1;
 if(kind==Gain&&inlet==0)return 2;
 if(kind==Join)return 2;
 if(kind==Dac)return 3;
 if(kind==SignalDac)return 2;
 if(canvas_relay_kind(kind))return 4;
 if(kind==Sig||(kind>=SignalAdd&&kind<=Phasor)||kind==SignalClip||(kind==Snapshot&&!inlet))return 4;
 return 1;
}
inline unsigned canvas_output(unsigned kind,unsigned outlet) noexcept {
 if(canvas_voice_kind(kind))return outlet<(kind==PolyNote?3u:1u)?kind==MixVoice?2:5:0;
 if(outlet>unsigned((kind>=ZlReg&&kind<=ZlRot)||kind==LineSignal||kind==Flonum||kind==NumberInt)||kind>Abs||kind==Dac||kind==Print||kind==Send||kind==SignalDac)return 0;
 if(canvas_relay_kind(kind))return 4;
 if(kind>=Sig&&kind<=LineSignal)return kind==LineSignal&&outlet?1:2;
 return kind==Voice||kind==Gain?2:kind==Join?3:1;
}
inline bool canvas_param_valid(unsigned kind,unsigned param,double value) noexcept {
 switch(kind){
 case Number:case Add:case Multiply:case Subtract:case Divide:case Modulo:case ReverseSubtract:case ReverseDivide:return param==0&&canvas_number(value);
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
 case NumberInt:return param<3&&canvas_range(value,-100000,100000,true);
 case Slider:return (param==0||param==2||param==3)?canvas_number(value):param==1?canvas_range(value,1,100000,true):param==4&&canvas_range(value,0,1,true);
 case Line:return param==0?canvas_number(value):param==1?canvas_range(value,0,100000):param==2?canvas_range(value,1,100000):param==3&&canvas_range(value,0,2,true);
 case Print:return (param==0&&canvas_range(value,0,3,true))||(param==1&&canvas_range(value,0,1,true));
 case ZlIter:return param==0&&canvas_range(value,0,100000,true);
 case ZlSlice:return param==0&&canvas_range(value,0,100000,true);
 case ZlRot:return param==0&&canvas_range(value,-100000,100000,true);
 case SignalAdd:case SignalSubtract:case SignalMultiply:case SignalDivide:return param==0&&canvas_number(value);
 case Cycle:case Phasor:case SignalClip:return param<2&&canvas_number(value);
 case LineSignal:return param==0?canvas_number(value):param==1&&canvas_range(value,0,100000);
 case Snapshot:return param==0?canvas_range(value,0,100000):param==1&&canvas_range(value,0,63,true);
 case PolyNote:return false;
 case FilterVoice:return param==0?canvas_range(value,20,20000):param==1&&canvas_range(value,.1,20);
 case AdsrVoice:return param==2?canvas_range(value,0,1):param<4&&canvas_range(value,1,10000);
 default:return false;
 }
}
inline unsigned canvas_inlets(const UltraCanvasNode& node) noexcept {
 if(node.kind==Receive)return node.text[0]?0:1;
 CanvasMessage args{};
 if(node.kind==SignalDac)return canvas_signal_args(node,args)?args.count:0;
 if(node.kind==Pack||node.kind==Select||node.kind==Route){
  if(!canvas_creation_args(node,args))return 0;
  return node.kind==Pack?args.count:node.kind==Route?args.count+1:args.count==1?2:1;
 }
 return canvas_inlets(node.kind);
}
inline unsigned canvas_outlets(const UltraCanvasNode& node) noexcept {
 if(node.kind==PolyNote)return 3;
 CanvasMessage args{};
 if(node.kind==Sig)return canvas_signal_args(node,args)?args.count:0;
 if(node.kind==Unpack||node.kind==Select||node.kind==Route||node.kind==Trigger){
  if(!canvas_creation_args(node,args))return 0;
  return args.count+(node.kind==Select||node.kind==Route);
 }
 return node.kind==Flonum||node.kind==NumberInt||node.kind==Line||node.kind==LineSignal||(node.kind>=ZlReg&&node.kind<=ZlRot)?2:node.kind==Dac||node.kind==SignalDac||node.kind==Print||node.kind==Send?0:1;
}
inline unsigned canvas_input(const UltraCanvasNode& node,unsigned inlet) noexcept {
 if(inlet>=canvas_inlets(node))return 0;
 if(canvas_relay_kind(node.kind))return 4;
 return node.kind==SignalDac?2:canvas_signal_kind(node.kind)||canvas_voice_kind(node.kind)||node.kind<=Dac?canvas_input(node.kind,inlet):1;
}
inline unsigned canvas_output(const UltraCanvasNode& node,unsigned outlet) noexcept {
 if(outlet>=canvas_outlets(node))return 0;
 if(canvas_relay_kind(node.kind))return 4;
 if(node.kind==Sig)return 2;
 return canvas_signal_kind(node.kind)||canvas_voice_kind(node.kind)||node.kind<=Dac?canvas_output(node.kind,outlet):1;
}
struct CanvasPlan {
 UltraCanvasGraph graph{};
 enum Domain : unsigned {Control=1,Mono=2,Stereo=4,Voices=8};
 struct Edge {unsigned from=0,to=0,inlet=0,outlet=0,domains=0,width=0;};
 std::array<Edge,64> edges{};
 std::array<CanvasMessage,32> arguments{};
 std::array<CanvasMessageTemplate,32> message_templates{};
 std::array<unsigned,32> signal_order{};
 std::array<std::array<bool,8>,32> signal_connected{};
 std::array<int,32> signal_first{};
 std::array<int,64> signal_next{};
 unsigned signal_count=0;
 int allocator=-1;
 std::array<int,2> output{{-1,-1}}; // physical channel -> prepared voice bank
 int find(uint32_t id)const noexcept {for(unsigned i=0;i<graph.node_count;i++)if(graph.nodes[i].id==id)return int(i);return -1;}
};
inline bool compile_canvas(const UltraCanvasGraph& g,CanvasPlan& out) noexcept {
 if(!g.revision||g.node_count>32||g.edge_count>64)return false;
 CanvasPlan p{};p.graph=g;p.signal_first.fill(-1);p.signal_next.fill(-1);
 unsigned devices=0,joins=0,dacs=0;
 for(unsigned i=0;i<g.node_count;i++){
  const auto& n=g.nodes[i];if(!n.id||n.kind>MixVoice||!canvas_number(n.p0)||!canvas_number(n.p1)||!canvas_number(n.p2)||!canvas_number(n.p3)||!canvas_number(n.p4)||!canvas_number(n.p5)||(n.kind!=MessageBox&&!canvas_text(n.text,128)))return false;
  for(unsigned j=0;j<i;j++)if(g.nodes[j].id==n.id)return false;
  if(n.kind!=Voice&&n.device)return false;
  if(n.kind!=Message&&n.count)return false;
  if(n.kind<Dac+1&&(n.p3||n.p4||n.p5||(n.kind!=Message&&n.text[0])))return false;
  switch(n.kind){
   case PolyNote:
    if(p.allocator>=0||!canvas_range(n.p0,1,4,true)||n.p1||n.p2||n.p3||n.p4||n.p5||n.text[0])return false;
    p.allocator=int(i);break;
   case FilterVoice:
    if(!canvas_param_valid(n.kind,0,n.p0)||!canvas_param_valid(n.kind,1,n.p1)||n.p2||n.p3||n.p4||n.p5||n.text[0])return false;
    break;
   case AdsrVoice:
    if(!canvas_param_valid(n.kind,0,n.p0)||!canvas_param_valid(n.kind,1,n.p1)||!canvas_param_valid(n.kind,2,n.p2)||!canvas_param_valid(n.kind,3,n.p3)||n.p4||n.p5||n.text[0])return false;
    break;
   case SawVoice:case MultiplyVoice:case MixVoice:
    if(n.p0||n.p1||n.p2||n.p3||n.p4||n.p5||n.text[0])return false;
    break;
   case Add:case Multiply:case Subtract:case Divide:case Modulo:case ReverseSubtract:case ReverseDivide:case Abs:
    if(!canvas_arithmetic_valid(n))return false;
    break;
   case MessageBox:
    if(n.p0||n.p1||n.p2||n.p3||n.p4||n.p5||!canvas_message_template(n.text,p.message_templates[i]))return false;
    break;
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
   case NumberInt:
    if(!canvas_param_valid(n.kind,0,n.p0)||!canvas_param_valid(n.kind,1,n.p1)||!canvas_param_valid(n.kind,2,n.p2)||n.p1>n.p2||n.p3||n.p4||n.p5||n.text[0])return false;
    break;
   case Slider:
    if(!canvas_param_valid(n.kind,0,n.p0)||!canvas_param_valid(n.kind,1,n.p1)||!canvas_param_valid(n.kind,2,n.p2)||!canvas_param_valid(n.kind,3,n.p3)||!canvas_param_valid(n.kind,4,n.p4)||n.p5||n.text[0])return false;
    break;
   case Line:
    if(!canvas_param_valid(n.kind,0,n.p0)||!canvas_param_valid(n.kind,1,n.p1)||!canvas_param_valid(n.kind,2,n.p2)||!canvas_param_valid(n.kind,3,n.p3)||n.p4||n.p5||n.text[0])return false;
    break;
   case Print:
    if(!canvas_param_valid(n.kind,0,n.p0)||!canvas_param_valid(n.kind,1,n.p1)||n.p2||n.p3||n.p4||n.p5||!canvas_symbol(n.text,false))return false;
    break;
   case Send:case Receive:
    if(n.p0||n.p1||n.p2||n.p3||n.p4||n.p5||!canvas_symbol(n.text,n.kind==Receive))return false;
    break;
   case Pack:case Unpack:case Select:case Route:case Trigger:
    if(n.p0||n.p1||n.p2||n.p3||n.p4||n.p5||!canvas_creation_args(n,p.arguments[i]))return false;
    break;
   case Prepend:case Append:case ZlReg:case ZlJoin:
    if(n.p0||n.p1||n.p2||n.p3||n.p4||n.p5||!canvas_parse_args(n.text,p.arguments[i]))return false;
    break;
   case Iter:case ZlLen:case ZlRev:
    if(n.p0||n.p1||n.p2||n.p3||n.p4||n.p5||n.text[0])return false;
    break;
   case ZlIter:case ZlSlice:case ZlRot:
    if(!canvas_param_valid(n.kind,0,n.p0)||n.p1||n.p2||n.p3||n.p4||n.p5||n.text[0])return false;
    break;
   case Sig:case SignalDac:
    if(n.p0||n.p1||n.p2||n.p3||n.p4||n.p5||!canvas_signal_args(n,p.arguments[i]))return false;
    break;
   case SignalAdd:case SignalSubtract:case SignalMultiply:case SignalDivide:
    if(!canvas_param_valid(n.kind,0,n.p0)||n.p1||n.p2||n.p3||n.p4||n.p5||n.text[0])return false;
    break;
   case Cycle:case Phasor:case SignalClip:case LineSignal:case Snapshot:
    if(!canvas_param_valid(n.kind,0,n.p0)||!canvas_param_valid(n.kind,1,n.p1)||n.p2||n.p3||n.p4||n.p5||n.text[0])return false;
    break;
   case Noise:case Inlet:case Outlet:
    if(n.p0||n.p1||n.p2||n.p3||n.p4||n.p5||n.text[0])return false;
    break;
   default:if(!canvas_param_valid(n.kind,0,n.p0)||n.p1||n.p2)return false;
  }
  if(n.kind==Join&&++joins>1)return false;
  if(n.kind==Dac&&++dacs>1)return false;
 }
 std::array<unsigned,32> control_indegree{},signal_indegree{},audio_out{};
 std::array<int,32> gain_voice{};gain_voice.fill(-1);
 int join=-1,dac=-1;std::array<int,2> join_gain{{-1,-1}};
 for(unsigned i=0;i<g.node_count;i++){if(g.nodes[i].kind==Join)join=i;if(g.nodes[i].kind==Dac)dac=i;}
 for(unsigned i=0;i<g.edge_count;i++){
  const auto& e=g.edges[i];int from=p.find(e.from),to=p.find(e.to);if(from<0||to<0)return false;
  unsigned type=canvas_output(g.nodes[from],e.outlet);if(!canvas_ports_match(type,canvas_input(g.nodes[to],e.inlet)))return false;
  for(unsigned j=0;j<i;j++){const auto& x=g.edges[j];if(e.from==x.from&&e.outlet==x.outlet&&e.to==x.to&&e.inlet==x.inlet)return false;}
  p.edges[i]={unsigned(from),unsigned(to),e.inlet,e.outlet};
 }
 // Undriven boundaries pass messages without creating a zero-valued MSP cord.
 std::array<bool,32> relay_signal{};
 bool changed=true;
 while(changed){
  changed=false;
  for(unsigned i=0;i<g.edge_count;i++){
   const auto& e=p.edges[i];
   if(!canvas_relay_kind(g.nodes[e.to].kind)||relay_signal[e.to])continue;
   const auto type=canvas_output(g.nodes[e.from],e.outlet);
   if(type==2||(type==4&&relay_signal[e.from])){relay_signal[e.to]=true;changed=true;}
  }
 }
 for(unsigned i=0;i<g.edge_count;i++){
  auto& e=p.edges[i];const auto& source=g.nodes[e.from];const auto& target=g.nodes[e.to];
  const auto output=canvas_output(source,e.outlet),input=canvas_input(target,e.inlet);
  if(canvas_control_port(output)&&canvas_control_port(input)){e.domains|=CanvasPlan::Control;++control_indegree[e.to];}
  if(output==5){e.domains|=CanvasPlan::Voices;e.width=4;}
  else if(output==3){e.domains|=CanvasPlan::Stereo;e.width=2;}
  else if((output==2||(output==4&&relay_signal[e.from]))&&(input==2||input==4))e.domains|=CanvasPlan::Mono;
  if(e.domains&CanvasPlan::Mono)e.width=1;
  if(!(e.domains&(CanvasPlan::Mono|CanvasPlan::Stereo|CanvasPlan::Voices)))continue;
  ++signal_indegree[e.to];++audio_out[e.from];p.signal_connected[e.to][e.inlet]=true;
  p.signal_next[i]=p.signal_first[e.to];p.signal_first[e.to]=int(i);
  if(source.kind==Voice&&target.kind==Gain)gain_voice[e.to]=e.from;
  else if(source.kind==Gain&&target.kind==Join)join_gain[e.inlet]=e.from;
 }
 // Signal/control crossings carry state, so each dependency graph is checked separately.
 for(unsigned signal=0;signal<2;signal++){
  auto indegree=signal?signal_indegree:control_indegree;
  std::array<unsigned,32> queue{};unsigned head=0,tail=0;
  for(unsigned i=0;i<g.node_count;i++)if(!indegree[i])queue[tail++]=i;
  while(head<tail){
   const unsigned slot=queue[head++];
   for(unsigned e=0;e<g.edge_count;e++){
    const auto& edge=p.edges[e];
    const unsigned domains=signal?CanvasPlan::Mono|CanvasPlan::Stereo|CanvasPlan::Voices:CanvasPlan::Control;
    if(edge.from!=slot||!(edge.domains&domains))continue;
    if(!--indegree[edge.to])queue[tail++]=edge.to;
   }
  }
  if(tail!=g.node_count)return false;
  if(signal){p.signal_order=queue;p.signal_count=tail;}
 }
 if(join>=0&&dac>=0&&audio_out[join])for(unsigned c=0;c<2;c++)if(join_gain[c]>=0&&gain_voice[join_gain[c]]>=0)p.output[c]=int(g.nodes[gain_voice[join_gain[c]]].device);
 out=p;return true;
}
inline bool canvas_event_valid(const CanvasPlan& p,uint64_t revision,uint32_t node,unsigned inlet,const CanvasMessage& m) noexcept {
 int slot=p.find(node);return revision==p.graph.revision&&slot>=0&&canvas_control_port(canvas_input(p.graph.nodes[slot],inlet))&&(p.graph.nodes[slot].kind==MessageBox&&(inlet==1||canvas_named(m,"set"))?canvas_message_replacement_valid(m):canvas_message_valid(m));
}
inline bool canvas_tab_valid(const CanvasPlan& p,uint64_t revision,uint32_t node) noexcept {
 const int slot=p.find(node);return revision==p.graph.revision&&slot>=0&&(p.graph.nodes[slot].kind==Flonum||p.graph.nodes[slot].kind==NumberInt);
}
inline bool change_canvas_param(CanvasPlan& p,uint32_t id,unsigned param,double value) noexcept {
 int slot=p.find(id);if(slot<0||!canvas_param_valid(p.graph.nodes[slot].kind,param,value))return false;
 auto g=p.graph;auto& n=g.nodes[slot];
 if(param==0)n.p0=value;else if(param==1)n.p1=value;else if(param==2)n.p2=value;else if(param==3)n.p3=value;else if(param==4)n.p4=value;else if(param==5)n.p5=value;else return false;
 CanvasPlan compiled{};if(!compile_canvas(g,compiled))return false;p=compiled;return true;
}

struct CanvasPrintPopupState {
 CanvasMessage message{};
 uint64_t generation=0,frame=0;
 bool has_value=false;
};
class CanvasRuntime;
struct CanvasDispatchItem {
 CanvasRuntime* runtime=nullptr;unsigned slot=0,inlet=0;CanvasMessage message{};bool output=false;unsigned outlet=0;
 unsigned cursor=0;bool continuation=false;
};
// One iterative stack spans every document, including named-message cycles.
struct CanvasDispatchContext {
 std::array<CanvasDispatchItem,1024> stack{};unsigned size=0,budget=4096;
 bool running=false,failed=false,rejected=false;
 std::array<CanvasRuntime*,alive::DocumentCount> resume{};unsigned resume_count=0;
 void* owner=nullptr;
 void (*route)(void*,const char*,const CanvasMessage&)noexcept=nullptr;
#ifdef ULTRA_CANVAS_TEST_TRACE
 void* trace_owner=nullptr;
 void (*trace)(void*,const CanvasRuntime*,unsigned,unsigned,bool,const CanvasMessage&)noexcept=nullptr;
#endif
 bool push(CanvasDispatchItem item)noexcept {
  if(failed||size==stack.size()){failed=true;return false;}
  stack[size++]=item;return true;
 }
 void request_resume(CanvasRuntime* runtime)noexcept{
  for(unsigned i=0;i<resume_count;i++)if(resume[i]==runtime)return;
  if(resume_count<resume.size())resume[resume_count++]=runtime;
 }
 void begin()noexcept{size=0;budget=4096;running=false;failed=false;rejected=false;resume_count=0;}
};

// A fixed, callback-owned control graph. All traversal, timers and messages are
// bounded. No allocation, ownership destruction, wall clock, DSP creation or locks.
class CanvasRuntime {
 CanvasPlan plan_{};
 struct State {
  double value=0,hot=0,start=0,target=0;
  uint64_t pulses=0,next=0,started=0,length=0,paused_at=0;
  bool armed=false,paused=false;
  CanvasMessage stored{},last{},list_right{};
  CanvasMessageBoxState message_box{};
  CanvasPrintPopupState print_popup{};
  bool has_list=false;unsigned list_capacity=0;
  char bound_name[32]{};
  std::array<double,4> targets{},times{};
  unsigned segments=0,segment=0;
  std::array<double,8> signal{};
  std::array<std::array<double,4>,3> voices{};
  std::array<double,64> snapshot_current{},snapshot_previous{};
  double phase=0,reset_phase=0;
  bool snapshot_running=false;
  uint32_t random=1;
 };
 std::array<State,32> states_{};
 std::array<CanvasVoiceKernels,32> voice_dsp_{};
 CanvasPolyVoices poly_{};
 struct Timer {uint64_t due=0;unsigned slot=0,pitch=0;bool active=false;};
 std::array<Timer,64> timers_{};
 uint64_t text_edit_serial_=0;
 uint64_t frame_=0;unsigned budget_=4096;bool failed_=false;
 uint64_t signal_frame_=0;bool signal_active_=true;
 unsigned signal_vector_frame_=0;
 std::array<unsigned,64> signal_notify_slot_{},signal_notify_port_{};
 std::array<double,64> signal_notify_value_{};unsigned signal_notifications_=0;
 CanvasDispatchContext* context_=nullptr;unsigned device_base_=0;
 // One producer (callback or stopped control owner), one serialized IPC reader.
 // Keep cursors across graph resets so unread messages retain their source revision.
 std::array<UltraCanvasConsoleRecord,128> console_{};
 std::atomic<uint64_t> console_head_{0},console_tail_{0},console_dropped_{0};
 uint64_t console_sequence_=0;
 void console(unsigned slot,const CanvasMessage& message,unsigned level,const char* label)noexcept {
  const auto sequence=++console_sequence_,head=console_head_.load(std::memory_order_relaxed);
  if(head-console_tail_.load(std::memory_order_acquire)>=console_.size()){
   console_dropped_.fetch_add(1,std::memory_order_relaxed);return;
  }
  auto& record=console_[head%console_.size()];const auto& node=plan_.graph.nodes[slot];
  record={};record.sequence=sequence;record.revision=plan_.graph.revision;record.frame=frame_;
  record.node=node.id;record.level=level;canvas_copy_symbol(record.label,label);
  record.message=canvas_message_to_pod(message);console_head_.store(head+1,std::memory_order_release);
 }
 void print(unsigned slot,const CanvasMessage& message)noexcept {
  const auto& node=plan_.graph.nodes[slot];
  if(node.p1){auto& popup=states_[slot].print_popup;popup.message=message;popup.frame=frame_;popup.has_value=true;++popup.generation;}
  console(slot,message,unsigned(node.p0),node.text);
 }
 void reject_list(unsigned slot,CanvasDispatchContext& work)noexcept {
  work.rejected=true;CanvasMessage error{};canvas_copy_symbol(error.selector,"error");error.count=2;error.tags[0]=2;
  canvas_copy_symbol(error.symbols[0],"list-capacity-exceeded");error.values[1]=8;
  console(slot,error,2,canvas_list_name(plan_.graph.nodes[slot].kind));
 }
 void reject_list_method(unsigned slot,CanvasDispatchContext& work,const char* method)noexcept {
  work.rejected=true;CanvasMessage error{};canvas_copy_symbol(error.selector,"error");error.count=2;error.tags[0]=error.tags[1]=2;
  canvas_copy_symbol(error.symbols[0],"unsupported-list-method");canvas_copy_symbol(error.symbols[1],method);
  console(slot,error,2,canvas_list_name(plan_.graph.nodes[slot].kind));
 }
 void reject_signal(unsigned slot,CanvasDispatchContext& work)noexcept {
  work.rejected=true;CanvasMessage error{};canvas_copy_symbol(error.selector,"error");error.count=1;error.tags[0]=2;
  canvas_copy_symbol(error.symbols[0],"unsupported-signal-message");console(slot,error,2,"msp");
 }
 void reject_arithmetic(unsigned slot,CanvasDispatchContext& work)noexcept {
  work.rejected=true;CanvasMessage error{};canvas_copy_symbol(error.selector,"error");error.count=1;error.tags[0]=2;
  canvas_copy_symbol(error.symbols[0],"arithmetic-result-out-of-range");console(slot,error,2,"arithmetic");
 }
 static unsigned midi(double v)noexcept{return unsigned(std::clamp(std::floor(v),0.,127.));}
 static double bounded(double v)noexcept{return std::clamp(v,-100000.,100000.);}
 static uint64_t duration(double ms)noexcept{return uint64_t(std::ceil(ms*48.));}
 void stop_line(State& state)noexcept {state.armed=false;state.paused=false;state.segments=0;state.segment=0;}
 void start_segment(unsigned slot)noexcept {
  auto& state=states_[slot];state.start=state.value;state.target=state.targets[state.segment];
  state.started=plan_.graph.nodes[slot].kind==LineSignal?signal_frame_:frame_;state.length=duration(state.times[state.segment]);state.next=frame_;state.armed=true;state.paused=false;
 }
 template<class Emit> bool emit_event(unsigned offset,unsigned device,alive::Kind kind,unsigned note,unsigned value,Emit& emit)noexcept{
  if(!emit({offset,uint8_t(device_base_+device),kind,uint8_t(note),uint8_t(value)})){fail();return false;}return true;
 }
 bool dispatch_failed()const noexcept{return failed_||(context_&&context_->failed);}
 uint64_t voice_release_frames()const noexcept{
  double release=1;
  for(unsigned i=0;i<plan_.graph.node_count;i++)if(plan_.graph.nodes[i].kind==AdsrVoice)release=std::max(release,plan_.graph.nodes[i].p3);
  return duration(release);
 }
 void clear_voice_lane(unsigned voice)noexcept{for(unsigned i=0;i<plan_.graph.node_count;i++)if(canvas_voice_kind(plan_.graph.nodes[i].kind))voice_dsp_[i].clear(voice);}
 void clear_voice_state()noexcept{
  poly_.clear();for(unsigned i=0;i<plan_.graph.node_count;i++)if(canvas_voice_kind(plan_.graph.nodes[i].kind)){voice_dsp_[i].clear();states_[i].voices={};}
 }
 public:
 unsigned active_voice_count()const noexcept{return poly_.active();}
 bool pop_console(UltraCanvasConsoleRecord& record)noexcept {
  const auto tail=console_tail_.load(std::memory_order_relaxed);
  if(tail==console_head_.load(std::memory_order_acquire))return false;
  record=console_[tail%console_.size()];console_tail_.store(tail+1,std::memory_order_release);return true;
 }
 uint64_t console_dropped()const noexcept{return console_dropped_.load(std::memory_order_relaxed);}
 void reset_console_count()noexcept{console_sequence_=0;console_dropped_.store(0,std::memory_order_relaxed);}
 void bind_workspace(CanvasDispatchContext& context,unsigned document)noexcept{context_=&context;device_base_=document*2;}
 const char* bound_name(unsigned slot)const noexcept{return states_[slot].bound_name;}
 void begin_callback()noexcept{budget_=4096;}
 void fail()noexcept{failed_=true;signal_notifications_=0;for(auto& s:states_)s.armed=false;for(auto& t:timers_)t.active=false;}
 void recover()noexcept{failed_=false;budget_=4096;clear_timers();}
 bool failed()const noexcept{return failed_;}
 const CanvasPlan& plan()const noexcept{return plan_;}
 uint64_t frame()const noexcept{return frame_;}
 double value(unsigned slot)const noexcept{return states_[slot].value;}
 uint64_t pulses(unsigned slot)const noexcept{return states_[slot].pulses;}
 uint64_t text_edit_serial()const noexcept{return text_edit_serial_;}
 const CanvasMessageBoxState& message_box(unsigned slot)const noexcept{return states_[slot].message_box;}
 const CanvasPrintPopupState& print_popup(unsigned slot)const noexcept{return states_[slot].print_popup;}
 bool message_text(uint64_t revision,uint32_t id,uint64_t serial,const CanvasMessageTemplate& content)noexcept {
  const int slot=plan_.find(id);if(revision!=plan_.graph.revision||slot<0||plan_.graph.nodes[slot].kind!=MessageBox||serial<=text_edit_serial_)return false;
  states_[slot].message_box.replace(content,true);text_edit_serial_=serial;return true;
 }
 const CanvasMessage& last_message(unsigned slot)const noexcept{return states_[slot].last;}
 bool signal_active()const noexcept{return signal_active_;}
 void resume_signals()noexcept{signal_active_=true;}
 void audio_started()noexcept{signal_active_=true;signal_vector_frame_=0;for(unsigned i=0;i<plan_.graph.node_count;i++)if(plan_.graph.nodes[i].kind==Cycle)states_[i].phase=states_[i].reset_phase;}
 void reset(const CanvasPlan& p,bool reset_budget=true)noexcept{
  text_edit_serial_=0;plan_=p;states_={};timers_={};frame_=0;signal_frame_=0;signal_vector_frame_=0;signal_active_=true;signal_notifications_=0;if(reset_budget)budget_=4096;failed_=false;
  clear_voice_state();
  for(unsigned i=0;i<plan_.graph.node_count;i++){
   const auto& n=plan_.graph.nodes[i];auto& s=states_[i];s.value=n.kind==Int?std::trunc(n.p0):(n.kind==Flonum||n.kind==NumberInt)?std::clamp(n.p0,n.p1,n.p2):n.p0;
   s.stored=plan_.arguments[i];
   if(n.kind==MessageBox){s.message_box.content=plan_.message_templates[i];s.message_box.arguments.count=2;}
   if(n.kind==ZlJoin){s.list_right=s.stored;s.stored={};}
   if(canvas_list_kind(n.kind))s.has_list=s.stored.count!=0;
   if(n.kind==Receive)canvas_copy_symbol(s.bound_name,n.text);
   if(n.kind==Sig)for(unsigned a=0;a<s.stored.count;a++)s.signal[a]=s.stored.values[a];
   if(n.kind==Noise)s.random=0x9e3779b9u^n.id;
   if(n.kind==Phasor)s.phase=canvas_wrap_phase(n.p1);
   if(n.kind==Snapshot){s.snapshot_running=n.p0>0;s.next=duration(n.p0);}
  }
  clear_timers();
 }
 void clear_timers()noexcept{for(unsigned i=0;i<plan_.graph.node_count;i++){stop_line(states_[i]);if(plan_.graph.nodes[i].kind==Toggle){plan_.graph.nodes[i].p0=0;states_[i].value=0;}if(plan_.graph.nodes[i].kind==Metro)states_[i].value=0;}for(auto& t:timers_)t.active=false;}
 template<class Emit> bool stop(unsigned offset,Emit& emit)noexcept{
  signal_active_=false;signal_notifications_=0;clear_timers();clear_voice_state();return emit_event(offset,0,alive::Kind::HardClear,0,0,emit)&&emit_event(offset,1,alive::Kind::HardClear,0,0,emit);
 }
 template<class Emit> bool configure_voices(unsigned offset,Emit& emit)noexcept{
  // Gain is evaluated per connection so Voice fan-out preserves independent levels.
  for(unsigned d=0;d<2;d++)if(!emit_event(offset,d,alive::Kind::Level,0,127,emit))return false;
  for(unsigned i=0;i<plan_.graph.node_count;i++){
   const auto& n=plan_.graph.nodes[i];
   if(n.kind==Voice){if(!emit_event(offset,n.device,alive::Kind::Attack,0,unsigned(n.p0),emit)||!emit_event(offset,n.device,alive::Kind::Release,0,unsigned(n.p1),emit))return false;}
  }return true;
 }
 template<class Emit> bool param(const CanvasPlan& next,unsigned id,unsigned param,double value,unsigned offset,Emit& emit)noexcept{
  int slot=plan_.find(id);if(slot<0||next.graph.revision!=plan_.graph.revision)return false;
  const auto kind=plan_.graph.nodes[slot].kind;
  if(!canvas_param_valid(kind,param,value))return false;
  auto& node=plan_.graph.nodes[slot];
  if(canvas_arithmetic_kind(kind)){auto candidate=node;if(param==0)candidate.p0=value;else return false;if(!canvas_arithmetic_valid(candidate))return false;}
  if((kind==Flonum||kind==NumberInt)&&((param==1&&value>node.p2)||(param==2&&value<node.p1)))return false;
  if(kind==Print&&param==1&&node.p1!=value){auto& popup=states_[slot].print_popup;popup.has_value=false;popup.message={};popup.frame=0;++popup.generation;}
  if(param==0)node.p0=value;else if(param==1)node.p1=value;else if(param==2)node.p2=value;
  else if(param==3)node.p3=value;else if(param==4)node.p4=value;else if(param==5)node.p5=value;else return false;
  if(param==0){states_[slot].value=kind==Int?std::trunc(value):value;if(kind==Line||kind==LineSignal)stop_line(states_[slot]);}
  if(kind==Flonum||kind==NumberInt)states_[slot].value=std::clamp(states_[slot].value,plan_.graph.nodes[slot].p1,plan_.graph.nodes[slot].p2);
  if(kind==Counter)states_[slot].hot=std::fmod(states_[slot].hot,value);
  if(kind==Snapshot&&param==0){states_[slot].snapshot_running=value>0;states_[slot].next=signal_frame_+duration(value);}
  if(kind==Phasor&&param==1)states_[slot].phase=canvas_wrap_phase(value);
  if(kind==Voice){const bool accepted=emit_event(offset,plan_.graph.nodes[slot].device,param==0?alive::Kind::Attack:alive::Kind::Release,0,unsigned(value),emit);if(accepted)signal_active_=true;return accepted;}
  signal_active_=true;
  return true;
 }
 template<class Emit> void dispatch_item(const CanvasDispatchItem& item,unsigned offset,Emit& emit,CanvasDispatchContext& work)noexcept{
   auto& node=plan_.graph.nodes[item.slot];auto& state=states_[item.slot];auto msg=item.message;bool forward=item.output;
#ifdef ULTRA_CANVAS_TEST_TRACE
   if(!item.output&&!item.continuation&&work.trace)work.trace(work.trace_owner,this,item.slot,item.inlet,false,msg);
#endif
   auto push=[&](unsigned port,const CanvasMessage& value){if(!work.push({this,item.slot,0,value,true,port}))fail();};
   if(item.continuation){
    if(item.cursor==msg.count){if(node.kind==ZlIter)node.p0=item.outlet;return;}
    const unsigned count=std::min(item.outlet,msg.count-item.cursor),next=item.cursor+count;
    if((next<msg.count||node.kind==ZlIter)&&!work.push({this,item.slot,0,msg,false,item.outlet,next,true})){fail();return;}
    push(0,canvas_sequence_message(canvas_list_range(msg,item.cursor,count)));return;
   }
   CanvasMessage list_input{},affixed{};
   if(!item.output&&canvas_voice_kind(node.kind)){
    const bool scalar=msg.count==1&&canvas_numeric_message(msg);
    bool supported=false;
    if(node.kind==PolyNote)supported=item.inlet?scalar&&canvas_range(msg.values[0],0,127,true):(!msg.count&&canvas_named(msg,"panic"))||(msg.count==2&&canvas_numeric_message(msg)&&canvas_range(msg.values[0],0,127,true)&&canvas_range(msg.values[1],0,127,true));
    else if(node.kind==FilterVoice||node.kind==AdsrVoice)supported=item.inlet&&scalar&&canvas_param_valid(node.kind,item.inlet-1,msg.values[0]);
    if(!supported){reject_signal(item.slot,work);return;}
   }
   if(!item.output&&canvas_signal_kind(node.kind)){
    const bool scalar=msg.count==1&&canvas_numeric_message(msg),numbers=msg.count&&canvas_numeric_message(msg),bang=canvas_bang(msg);
    bool supported=false;
    switch(node.kind){
     case Sig:supported=numbers||(canvas_named(msg,"set")&&msg.count==2&&msg.tags[0]!=2&&msg.tags[1]!=2&&canvas_range(msg.values[0],0,plan_.arguments[item.slot].count-1,true));break;
     case SignalAdd:case SignalSubtract:case SignalMultiply:case SignalDivide:case SignalClip:supported=scalar;break;
     case Cycle:supported=scalar||(!item.inlet&&canvas_named(msg,"reset")&&msg.count==1&&msg.tags[0]!=2);break;
     case Phasor:supported=scalar;break;
     case Noise:break;
     case LineSignal:supported=item.inlet?scalar:numbers&&(msg.count==1||msg.count%2==0);
      supported=supported||(!item.inlet&&((canvas_named(msg,"set")&&msg.count==1&&msg.tags[0]!=2)||(!msg.count&&(canvas_named(msg,"stop")||canvas_named(msg,"pause")||canvas_named(msg,"resume")))));break;
     case Snapshot:supported=item.inlet?scalar&&msg.values[0]>=0:bang||(!msg.count&&(canvas_named(msg,"start")||canvas_named(msg,"stop")))||(canvas_named(msg,"offset")&&msg.count==1&&msg.tags[0]!=2&&canvas_range(msg.values[0],0,63,true));break;
     default:break;
    }
    if(node.kind==Snapshot&&bang&&!canvas_number(state.snapshot_previous[unsigned(node.p1)]))supported=false;
    if(!supported){reject_signal(item.slot,work);return;}
   }
   if(!item.output&&canvas_list_kind(node.kind)){
    const bool affix=node.kind==Prepend||node.kind==Append,silent=affix&&canvas_named(msg,"set"),bang=canvas_bang(msg);
    if(node.kind>=ZlReg&&(canvas_named(msg,"mode")||canvas_named(msg,"fuzzy")||canvas_named(msg,"zlmaxsize"))){reject_list_method(item.slot,work,msg.selector);return;}
    if(node.kind>=ZlReg&&(canvas_named(msg,"zlreset")||canvas_named(msg,"zlclear"))){
     state.stored={};state.list_right={};state.has_list=false;
     if(canvas_named(msg,"zlclear")&&(node.kind==ZlIter||node.kind==ZlSlice||node.kind==ZlRot))node.p0=0;
     return;
    }
    const bool active=!item.inlet||node.kind==ZlReg||node.kind==ZlJoin;
    if(affix&&!silent&&(!bang||node.kind==Prepend)){
     CanvasMessage input=msg;if(bang)canvas_copy_symbol(input.selector,"bang");
     if(!canvas_affix_message(state.stored,input,node.kind==Prepend,affixed)){reject_list(item.slot,work);return;}
    }else if(!affix&&active&&!bang&&!canvas_list_atoms(msg,list_input)){reject_list(item.slot,work);return;}
    if(node.kind==ZlJoin&&!bang){
     CanvasMessage joined{};if(!canvas_list_join(item.inlet?state.stored:list_input,item.inlet?list_input:state.list_right,joined)){reject_list(item.slot,work);return;}
    }
   }
   if(!item.output){
    ++state.pulses;state.last=msg;if(node.kind<=Dac&&(!canvas_arithmetic_kind(node.kind)||!node.p1)&&msg.count&&canvas_numeric_message(msg))state.value=msg.values[0];
    const bool scalar=msg.count==1&&canvas_numeric_message(msg),bang=canvas_bang(msg);
    switch(node.kind){
     case Inlet:case Outlet:if(scalar)state.value=msg.values[0];forward=true;break;
     case Print:print(item.slot,msg);break;
     case Send:if(work.route)work.route(work.owner,node.text,msg);break;
     case Receive:
      if(canvas_named(msg,"set")&&msg.count==1&&msg.tags[0]==2&&canvas_symbol(msg.symbols[0],false))canvas_copy_symbol(state.bound_name,msg.symbols[0]);
      break;
     case Bang:msg={};forward=true;break;
     case MessageBox:if(!state.message_box.input(msg,item.inlet,msg,forward)){reject_list_method(item.slot,work,"message");return;}break;
     case Message:msg=plan_.arguments[item.slot];forward=!(canvas_named(msg,"list")&&!msg.count);break;
     case Number:if(scalar){node.p0=bounded(msg.values[0]);state.value=node.p0;}if(scalar||bang){msg={1,{node.p0,0,0}};forward=item.inlet==0;}break;
     case Toggle:if(bang)node.p0=node.p0?0:1;else if(scalar)node.p0=msg.values[0]!=0;else break;state.value=node.p0;msg={1,{node.p0,0,0}};forward=true;break;
     case Add:case Multiply:case Subtract:case Divide:case Modulo:case ReverseSubtract:case ReverseDivide:case Abs: {
      if(!node.p1){
       if(item.inlet==1){if(scalar)node.p0=bounded(msg.values[0]);break;}
       if(scalar)state.hot=bounded(msg.values[0]);
       if(scalar||bang){state.value=bounded(node.kind==Add?state.hot+node.p0:state.hot*node.p0);msg={1,{state.value,0,0}};forward=true;}
       break;
      }
      const bool integer=node.p1==1,reverse=node.kind==ReverseSubtract||node.kind==ReverseDivide;
      const auto coerce=[&](double value){return integer?std::trunc(value):value;};
      const bool numeric=msg.count&&msg.tags[0]!=2;
      const bool sequence=numeric&&(!msg.selector[0]||canvas_named(msg,"list"));
      if(node.kind==Abs){
       if(sequence){state.value=std::abs(coerce(msg.values[0]));msg=canvas_scalar(state.value,integer?0:1);forward=true;}
       break;
      }
      if(item.inlet){if(scalar&&!msg.selector[0])node.p0=coerce(msg.values[0]);break;}
      // Only the integer direct inlet methods are qualified by the oracle.
      if(integer&&numeric&&msg.count==1&&(canvas_named(msg,"in1")||(reverse&&canvas_named(msg,"ft1")))){node.p0=coerce(msg.values[0]);break;}
      if(canvas_named(msg,"set")){if(!reverse&&numeric)state.hot=coerce(msg.values[0]);break;}
      if(!sequence&&!bang)break;
      if(sequence){
       if(msg.count>1&&msg.tags[1]!=2)node.p0=coerce(msg.values[1]);
       state.hot=coerce(msg.values[0]);
      }
      const auto hot=state.hot,right=node.p0;double result=0;
      switch(node.kind){
       case Add:result=hot+right;break;
       case Multiply:result=hot*right;break;
       case Subtract:result=hot-right;break;
       case Divide:
        if(integer)result=std::trunc(hot/(right?right:1));
        else if(right)result=hot*(1./right);else {reject_arithmetic(item.slot,work);return;}
        break;
       case Modulo:
        if(right)result=std::fmod(hot,right);else if(!integer){reject_arithmetic(item.slot,work);return;}
        break;
       case ReverseSubtract:result=right-hot;break;
       case ReverseDivide:result=hot?(integer?std::trunc(right/hot):right/hot):0;break;
       default:break;
      }
      if(integer&&result==0)result=0;
      // Accepted operands remain available after a refused output, as in Max recovery.
      if(!canvas_number(result)){reject_arithmetic(item.slot,work);return;}
      state.value=result;msg=canvas_scalar(result,integer?0:1);forward=true;break;
     }
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
     case PolyNote:
      if(item.inlet)poly_.pedal(msg.values[0]>=64,signal_frame_,voice_release_frames());
      else if(canvas_named(msg,"panic"))clear_voice_state();
      else {const int voice=poly_.note(unsigned(msg.values[0]),unsigned(msg.values[1]),unsigned(node.p0),signal_frame_,voice_release_frames());if(voice>=0)clear_voice_lane(unsigned(voice));}
      state.value=poly_.active();break;
     case FilterVoice:case AdsrVoice:
      if(item.inlet==1)node.p0=msg.values[0];else if(item.inlet==2)node.p1=msg.values[0];else if(item.inlet==3)node.p2=msg.values[0];else if(item.inlet==4)node.p3=msg.values[0];
      break;
     case Gain:
      if(item.inlet==1&&scalar)node.p0=midi(msg.values[0]);
      break;
     case Sig:
      if(canvas_named(msg,"set"))state.signal[unsigned(msg.values[0])]=msg.values[1];
      else for(unsigned i=0;i<msg.count&&i<plan_.arguments[item.slot].count;i++)state.signal[i]=msg.values[i];
      state.value=state.signal[0];break;
     case SignalAdd:case SignalSubtract:case SignalMultiply:case SignalDivide:node.p0=msg.values[0];break;
     case Cycle:
      if(canvas_named(msg,"reset"))state.reset_phase=state.phase=canvas_wrap_phase(msg.values[0]);
      else if(item.inlet)node.p1=canvas_wrap_phase(msg.values[0]);else node.p0=msg.values[0];
      break;
     case Phasor:
      if(item.inlet)node.p1=state.phase=canvas_wrap_phase(msg.values[0]);else node.p0=msg.values[0];
      break;
     case SignalClip:
      if(item.inlet==1)node.p0=msg.values[0];else if(item.inlet==2)node.p1=msg.values[0];else state.hot=msg.values[0];
      break;
     case Snapshot:
      if(item.inlet){node.p0=msg.values[0];state.snapshot_running=node.p0>0;state.next=signal_frame_+duration(node.p0);}
      else if(canvas_named(msg,"offset"))node.p1=msg.values[0];
      else if(canvas_named(msg,"start")){state.snapshot_running=true;state.next=signal_frame_+duration(node.p0);}
      else if(canvas_named(msg,"stop"))state.snapshot_running=false;
      else {state.signal[0]=state.snapshot_previous[unsigned(node.p1)];msg=canvas_scalar(state.signal[0],1);forward=true;}
      break;
     case LineSignal: {
      if(canvas_named(msg,"stop")){stop_line(state);break;}
      if(canvas_named(msg,"pause")){if(state.armed&&!state.paused){state.paused=true;state.paused_at=signal_frame_;}break;}
      if(canvas_named(msg,"resume")){if(state.armed&&state.paused){state.started+=signal_frame_-state.paused_at;state.paused=false;}break;}
      if(canvas_named(msg,"set")){stop_line(state);state.value=msg.values[0];node.p0=state.value;break;}
      if(item.inlet){node.p1=std::max(0.,msg.values[0]);break;}
      stop_line(state);state.segments=msg.count==1?1:msg.count/2;
      for(unsigned i=0;i<state.segments;i++){state.targets[i]=msg.values[2*i];state.times[i]=std::max(0.,msg.count==1?node.p1:msg.values[2*i+1]);}
      node.p1=0;start_segment(item.slot);break;
     }
     case Int:case Float:case Flonum:case NumberInt:case Slider: {
      if((node.kind==Int||node.kind==Float)&&canvas_named(msg,"send")){
       if(!item.inlet&&msg.count==1&&msg.tags[0]==2&&work.route)work.route(work.owner,msg.symbols[0],canvas_scalar(state.value,node.kind==Int?0:1));
       break;
      }
      const bool number_ui=node.kind==Flonum||node.kind==NumberInt;
      if(number_ui&&(canvas_named(msg,"min")||canvas_named(msg,"max"))){
       if(msg.count&&msg.tags[0]!=2){
        // Fractional integer-UI bounds are outside this qualified profile.
        if(node.kind==NumberInt&&std::trunc(msg.values[0])!=msg.values[0])break;
        const double bound=msg.values[0];if(canvas_named(msg,"min")&&bound<=node.p2)node.p1=bound;if(canvas_named(msg,"max")&&bound>=node.p1)node.p2=bound;
       }
       else if(!msg.count){if(canvas_named(msg,"min"))node.p1=-100000;else node.p2=100000;}
       state.value=std::clamp(state.value,node.p1,node.p2);break;
      }
      if(node.kind==Slider&&canvas_named(msg,"setminmax")&&msg.count==2&&msg.tags[0]!=2&&msg.tags[1]!=2){
       node.p2=msg.values[0];node.p3=msg.values[1]-msg.values[0];node.p1=2;node.p4=1;break;
      }
      const bool silent=canvas_named(msg,"set");
      const bool number=msg.count&&msg.tags[0]!=2&&(!msg.selector[0]||canvas_named(msg,"list")||silent);
      const bool repeat_list=number_ui&&msg.count>1&&number&&!silent;
      if(number){
       double value=msg.values[0];
       if(node.kind==Int||node.kind==NumberInt||(node.kind==Slider&&!node.p4))value=std::trunc(value);
       if(number_ui)value=std::clamp(value,node.p1,node.p2);
       state.value=value;node.p0=value;
      }
      if((number||bang)&&!silent&&item.inlet==0){
       const unsigned tag=node.kind==Int||node.kind==NumberInt||(node.kind==Slider&&!node.p4)?0:1;
       double value=node.kind==Slider?bounded(state.value*node.p3+node.p2):state.value;
       if(node.kind==Slider&&!node.p4)value=std::trunc(value);
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
     case Iter:case ZlIter: {
      if(item.inlet){if(!bang)node.p0=std::clamp(std::trunc(canvas_list_parameter(msg)),0.,100000.);break;}
      if(!bang){
       state.stored=list_input;state.has_list=true;
       if(node.kind==Iter){
        const bool growing=list_input.count>state.list_capacity;
        // Preserve the measured selector recall history using fixed storage.
        if(growing&&msg.selector[0]&&!canvas_named(msg,"list"))state.stored=canvas_list_range(list_input,1,list_input.count-1);
        if(!list_input.count)state.list_capacity=0;
        else if(growing)state.list_capacity=std::max(list_input.count,state.list_capacity*2);
       }
      }
      const auto& source=bang?state.stored:list_input;
      if(state.has_list&&source.count&&(node.kind==Iter||node.p0>0)&&!work.push({this,item.slot,0,source,false,node.kind==Iter?1u:unsigned(node.p0),0,true}))fail();
      break;
     }
     case Prepend:case Append:
      if(canvas_named(msg,"set")){state.stored=msg;state.stored.selector[0]=0;break;}
      if(!bang||node.kind==Prepend){msg=affixed;if(canvas_named(msg,"bang")&&!msg.count)msg={};forward=true;}
      break;
     case ZlReg:
      if(!bang){state.stored=list_input;state.has_list=true;}
      if(!item.inlet&&state.has_list&&state.stored.count){msg=canvas_sequence_message(state.stored);forward=true;}
      break;
     case ZlJoin:
      if(!bang){if(item.inlet)state.list_right=list_input;else {state.stored=list_input;state.has_list=true;}}
      if(!item.inlet){CanvasMessage joined{};if(canvas_list_join(state.stored,state.list_right,joined)&&joined.count){msg=canvas_sequence_message(joined);forward=true;}}
      break;
     case ZlLen:case ZlRev:case ZlRot:case ZlSlice: {
      if(item.inlet){if((node.kind==ZlRot||node.kind==ZlSlice)&&!bang)node.p0=std::clamp(std::trunc(canvas_list_parameter(msg)),node.kind==ZlSlice?0.:-100000.,100000.);break;}
      if(!bang){state.stored=list_input;state.has_list=true;}
      if(!state.has_list)break;
      if(node.kind==ZlLen){msg=canvas_scalar(state.stored.count);forward=true;break;}
      if(!state.stored.count)break;
      CanvasMessage result=state.stored;
      if(node.kind==ZlRev)for(unsigned i=0;i<result.count;i++)canvas_store_atom(result,i,state.stored,result.count-1-i);
      else if(node.kind==ZlRot){
       const int size=int(result.count),rotation=(int(node.p0)%size+size)%size;
       for(unsigned i=0;i<result.count;i++)canvas_store_atom(result,i,state.stored,unsigned((int(i)+size-rotation)%size));
      }else {
       const unsigned cut=std::min(unsigned(node.p0),result.count);
       if(cut)push(0,canvas_sequence_message(canvas_list_range(result,0,cut)));
       if(cut<result.count)push(1,canvas_sequence_message(canvas_list_range(result,cut,result.count-cut)));
       break;
      }
      msg=canvas_sequence_message(result);forward=true;break;
     }
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
#ifdef ULTRA_CANVAS_TEST_TRACE
   if(forward&&!failed_&&work.trace)work.trace(work.trace_owner,this,item.slot,item.outlet,true,msg);
#endif
   if(forward&&!failed_)for(unsigned e=plan_.graph.edge_count;e>0;--e){const auto& edge=plan_.edges[e-1];if(edge.from!=item.slot||edge.outlet!=item.outlet||!(edge.domains&CanvasPlan::Control))continue;if(!work.push({this,edge.to,edge.inlet,msg,false,0})){fail();break;}}
 }
 template<class Emit> bool dispatch_work(CanvasDispatchContext& work,unsigned slot,unsigned inlet,CanvasMessage message,unsigned offset,Emit& emit,bool output,unsigned outlet)noexcept{
  if(!work.running){work.rejected=false;work.resume_count=0;}
  if(failed_||!work.push({this,slot,inlet,message,output,outlet})){fail();return false;}
  if(work.running)return true;
  work.running=true;
  while(work.size&&!work.failed){
   auto item=work.stack[--work.size];
   if(!work.budget){item.runtime->fail();work.failed=true;break;}
   --work.budget;item.runtime->dispatch_item(item,offset,emit,work);
   if(item.runtime->failed()){work.failed=true;break;}
  }
  work.running=false;
  if(work.failed)work.size=0;
  const bool accepted=!work.failed&&!failed_&&!work.rejected;
  if(accepted)for(unsigned i=0;i<work.resume_count;i++)work.resume[i]->resume_signals();
  work.resume_count=0;return accepted;
 }
 template<class Emit> bool dispatch(unsigned slot,unsigned inlet,CanvasMessage message,unsigned offset,Emit& emit,bool output=false,unsigned outlet=0)noexcept{
  if(context_)return dispatch_work(*context_,slot,inlet,message,offset,emit,output,outlet);
  CanvasDispatchContext local{};local.budget=budget_;
  const bool accepted=dispatch_work(local,slot,inlet,message,offset,emit,output,outlet);
  budget_=local.budget;return accepted;
 }
 template<class Emit> bool event(uint64_t revision,uint32_t id,unsigned inlet,const CanvasMessage& msg,unsigned offset,Emit& emit)noexcept{
  if(!canvas_event_valid(plan_,revision,id,inlet,msg))return false;
  const bool accepted=dispatch(unsigned(plan_.find(id)),inlet,msg,offset,emit);
  if(accepted)signal_active_=true;
  return accepted;
 }
 template<class Emit> bool tab(uint64_t revision,uint32_t id,unsigned offset,Emit& emit)noexcept{
  if(!canvas_tab_valid(plan_,revision,id))return false;
  const bool accepted=dispatch(unsigned(plan_.find(id)),0,{},offset,emit,true,1);
  if(accepted)signal_active_=true;
  return accepted;
 }
 template<class Emit> bool midi_input(unsigned channel,unsigned pitch,unsigned velocity,unsigned offset,Emit& emit)noexcept{
  bool accepted=true,matched=false;
  for(unsigned i=0;i<plan_.graph.node_count;i++)if(plan_.graph.nodes[i].kind==MidiIn&&plan_.graph.nodes[i].p0==channel){
   matched=true;if(!dispatch(i,0,{2,{double(pitch),double(velocity),0}},offset,emit,true)){accepted=false;if(dispatch_failed())return false;}
  }
  if(accepted&&matched)signal_active_=true;
  return accepted;
 }
 template<class Emit> bool sample(unsigned offset,Emit& emit)noexcept{
  if(!dispatch_failed()){
   for(auto& timer:timers_)if(timer.active&&timer.due<=frame_){timer.active=false;dispatch(timer.slot,0,{2,{double(timer.pitch),0,0}},offset,emit,true);if(dispatch_failed())break;}
   for(unsigned i=0;i<plan_.graph.node_count&&!dispatch_failed();i++)if(plan_.graph.nodes[i].kind==Metro&&states_[i].armed&&states_[i].next<=frame_){states_[i].next=frame_+duration(plan_.graph.nodes[i].p0);dispatch(i,0,{},offset,emit,true);}
   for(unsigned i=0;i<plan_.graph.node_count&&!dispatch_failed();i++){
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
    dispatch(i,0,canvas_scalar(output,tag),offset,emit,true,0);if(dispatch_failed())break;
    if(!state.paused&&frame_>=end){
     node.p0=state.value;
     dispatch(i,0,{},offset,emit,true,1);if(dispatch_failed())break;
     if(++state.segment<state.segments)start_segment(i);else stop_line(state);
    }else state.next=state.paused?frame_+duration(node.p2):std::min(end,frame_+duration(node.p2));
   }
  }++frame_;return !dispatch_failed();
 }
 template<class Emit> bool flush_signal_events(unsigned next_offset,Emit& emit)noexcept{
  const unsigned count=signal_notifications_;signal_notifications_=0;
  for(unsigned i=0;i<count&&!dispatch_failed();i++){
   const unsigned slot=signal_notify_slot_[i];
   if(plan_.graph.nodes[slot].kind==Snapshot){
    if(!canvas_number(signal_notify_value_[i])){CanvasDispatchContext local{};reject_signal(slot,context_?*context_:local);continue;}
    dispatch(slot,0,canvas_scalar(signal_notify_value_[i],1),next_offset,emit,true,0);
   }else dispatch(slot,0,{},next_offset,emit,true,signal_notify_port_[i]);
  }
  return !dispatch_failed();
 }
 template<class Emit> std::array<double,2> signal_sample(double voice_a,double voice_b,unsigned next_offset,Emit& emit,bool defer_notifications=false)noexcept{
  std::array<double,2> mix{};
  if(!signal_active_||dispatch_failed())return mix;
  signal_notifications_=0;
  poly_.retire(signal_frame_);
  for(unsigned order=0;order<plan_.signal_count;order++){
   const unsigned slot=plan_.signal_order[order];auto& node=plan_.graph.nodes[slot];auto& state=states_[slot];
   std::array<double,8> input{};
   std::array<std::array<double,4>,2> voice_input{};
   for(int e=plan_.signal_first[slot];e>=0;e=plan_.signal_next[unsigned(e)]){
    const auto& edge=plan_.edges[unsigned(e)];const auto& source=states_[edge.from].signal;
    if(edge.domains&CanvasPlan::Voices){for(unsigned voice=0;voice<4;voice++)voice_input[edge.inlet][voice]+=states_[edge.from].voices[edge.outlet][voice];}
    else if(edge.domains&CanvasPlan::Stereo){input[0]+=source[0];input[1]+=source[1];}
    else input[edge.inlet]+=source[edge.outlet];
   }
   const auto& connected=plan_.signal_connected[slot];
   switch(node.kind){
    case PolyNote:
     for(unsigned voice=0;voice<4;voice++){const auto& lane=poly_.lanes[voice];state.voices[0][voice]=lane.note>=0?lane.frequency:0;state.voices[1][voice]=lane.gate?1:0;state.voices[2][voice]=lane.note>=0?lane.velocity:0;}
     state.value=poly_.active();break;
    case SawVoice:case FilterVoice:case AdsrVoice:case MultiplyVoice:
     for(unsigned voice=0;voice<4;voice++){
      double value=0;
      if(poly_.lanes[voice].note>=0){
       if(node.kind==SawVoice&&voice_input[0][voice]>0)value=voice_dsp_[slot].saw(voice,std::clamp(voice_input[0][voice],1.,20000.));
       else if(node.kind==FilterVoice)value=voice_dsp_[slot].filter(voice,voice_input[0][voice],node.p0,node.p1);
       else if(node.kind==AdsrVoice)value=voice_dsp_[slot].adsr(voice,voice_input[0][voice],node);
       else if(node.kind==MultiplyVoice)value=voice_input[0][voice]*voice_input[1][voice];
      }
      state.voices[0][voice]=canvas_safe_signal(value);
     }
     break;
    case MixVoice:
     state.signal[0]=0;for(unsigned voice=0;voice<4;voice++)state.signal[0]+=voice_input[0][voice]*.25;
     state.signal[0]=canvas_safe_signal(state.signal[0]);break;
    case Inlet:case Outlet:state.signal[0]=input[0];break;
    case Voice:state.signal[0]=node.device?voice_b:voice_a;break;
    case Gain:state.signal[0]=input[0]*node.p0/127.;break;
    case Join:state.signal[0]=input[0];state.signal[1]=input[1];break;
    case Dac:mix[0]+=input[0];mix[1]+=input[1];break;
    case Sig:break;
    case SignalAdd:case SignalSubtract:case SignalMultiply:case SignalDivide: {
     const double left=connected[0]?input[0]:connected[1]?node.p0:0.,right=connected[1]?input[1]:node.p0;
     state.signal[0]=canvas_safe_signal(node.kind==SignalAdd?left+right:node.kind==SignalSubtract?left-right:node.kind==SignalMultiply?left*right:right?left/right:0.);
     break;
    }
    case Cycle: {
     const double frequency=connected[0]?input[0]:node.p0,phase=connected[1]?input[1]:node.p1;
     state.signal[0]=canvas_cosine(canvas_safe_signal(state.phase+phase));
     state.phase=canvas_wrap_phase(canvas_safe_signal(state.phase+frequency/48000.));break;
    }
    case Phasor: {
     const double frequency=connected[0]?input[0]:node.p0;
     if(connected[1]&&input[1]!=0)state.phase=canvas_wrap_phase(node.p1);
     state.signal[0]=state.phase;state.phase=canvas_wrap_phase(canvas_safe_signal(state.phase+frequency/48000.));break;
    }
    case Noise:
     state.random^=state.random<<13;state.random^=state.random>>17;state.random^=state.random<<5;
     state.signal[0]=double(state.random)/2147483648.-1.;break;
    case SignalClip: {
     const double value=connected[0]?input[0]:state.hot,minimum=connected[1]?input[1]:node.p0,maximum=connected[2]?input[2]:node.p1;
     state.signal[0]=value<minimum?minimum:value>maximum?maximum:value;break;
    }
    case LineSignal:
     if(state.armed&&!state.paused){
      const uint64_t elapsed=signal_frame_-state.started;
      state.value=state.length?state.start+(state.target-state.start)*std::min(1.,double(elapsed)/double(state.length)):state.target;
      if(elapsed>=state.length){
       node.p0=state.value;
       if(++state.segment<state.segments)start_segment(slot);
       else {stop_line(state);signal_notify_slot_[signal_notifications_]=slot;signal_notify_port_[signal_notifications_++]=1;}
      }
     }
     state.signal[0]=state.value;break;
    case Snapshot:
     state.snapshot_current[signal_vector_frame_]=canvas_safe_signal(input[0]);
     if(signal_vector_frame_==63){
      state.snapshot_previous=state.snapshot_current;state.signal[0]=state.snapshot_previous[unsigned(node.p1)];
      if(state.snapshot_running&&node.p0>0&&signal_frame_+1>=state.next){state.next+=std::max<uint64_t>(1,duration(node.p0));signal_notify_slot_[signal_notifications_]=slot;signal_notify_port_[signal_notifications_]=0;signal_notify_value_[signal_notifications_++]=state.signal[0];}
     }
     break;
    case SignalDac:
     for(unsigned channel=0;channel<plan_.arguments[slot].count;channel++)mix[unsigned(plan_.arguments[slot].values[channel])-1]+=input[channel];
     break;
    default:break;
   }
   if(canvas_signal_kind(node.kind)&&node.kind!=Snapshot&&node.kind!=SignalDac)state.value=state.signal[0];
  }
  ++signal_frame_;signal_vector_frame_=(signal_vector_frame_+1)%64;
  // A workspace defers these until every document finishes the current sample.
  if(!defer_notifications)flush_signal_events(next_offset,emit);
  mix[0]=canvas_safe_signal(mix[0]);mix[1]=canvas_safe_signal(mix[1]);return mix;
 }
};
}
