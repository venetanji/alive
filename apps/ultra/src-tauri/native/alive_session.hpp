#pragma once
#include "alive_session.h"
#include "canvas_workspace.hpp"
#include <atomic>
#include <cstring>
#include <limits>

namespace ultra {
class AliveSession {
 struct Command {unsigned kind=0,track=0,param=0,mute=0,solo=0;double value=0;uint64_t frame=0,epoch=0;};
 AliveSessionConfig config_{};
 AliveSessionState state_{};
 std::array<Command,65> commands_{};
 std::atomic<unsigned> head_{0},tail_{0};
 std::atomic<uint64_t> stop_epoch_{0},rejected_{0};uint64_t applied_stop_=0;
 static constexpr unsigned Words=(sizeof(AliveSessionState)+7)/8;
 std::array<std::atomic<uint64_t>,Words> published_{};
 std::atomic<uint64_t> publication_{0};
 unsigned next_event_=0;
 std::array<std::array<unsigned,16>,2> parameter_kinds_{};
 const char* error_="No Alive session configured.";
 static bool flag(unsigned value)noexcept{return value<=1;}
 static bool gain(double value)noexcept{return std::isfinite(value)&&value>=0&&value<=4;}
 static unsigned priority(unsigned kind)noexcept{return kind==ALIVE_SESSION_SUSTAIN?0:kind;}
 bool reject(const char* error)noexcept{error_=error;rejected_.fetch_add(1);return false;}
 bool enqueue(Command command)noexcept{
  const unsigned head=head_.load(std::memory_order_relaxed),next=(head+1)%65;
  if(next==tail_.load(std::memory_order_acquire))return reject("Alive command queue is full; edit rejected.");
  command.epoch=stop_epoch_.load(std::memory_order_acquire);commands_[head]=command;
  head_.store(next,std::memory_order_release);return true;
 }
 void parameter(CanvasWorkspace& workspace,unsigned track,unsigned param,double value)noexcept{
  auto& runtime=workspace.runtime(config_.tracks[track].document);const auto& binding=config_.tracks[track].parameters[param];
  auto discard=[](alive::Event){return true;};
  if(!runtime.param(runtime.plan(),binding.node,binding.param,value,0,discard)){runtime.fail();return;}
  state_.tracks[track].effective[param]=value;
 }
 void chase(CanvasWorkspace& workspace)noexcept{
  for(unsigned t=0;t<config_.track_count;++t)for(unsigned p=0;p<config_.tracks[t].parameter_count;++p){
   const auto& binding=config_.tracks[t].parameters[p];auto& ts=state_.tracks[t];double value=ts.base[p];
   ts.owned[p]=state_.playing&&binding.automated;
   if(ts.owned[p])for(unsigned e=0;e<config_.event_count&&config_.events[e].frame<=state_.position;++e){
    const auto& event=config_.events[e];if(event.kind==ALIVE_SESSION_AUTOMATION&&event.track==t&&event.target==p)value=event.value;
   }
   parameter(workspace,t,p,value);
  }
 }
 void discontinuity(CanvasWorkspace& workspace)noexcept{
  ++state_.generation;
  for(unsigned t=0;t<config_.track_count;++t){auto& runtime=workspace.runtime(config_.tracks[t].document);runtime.reset(runtime.plan());}
  chase(workspace);
  if(!state_.playing){auto discard=[](alive::Event){return true;};for(unsigned t=0;t<config_.track_count;++t)workspace.stop(config_.tracks[t].document,0,discard);}
  next_event_=0;while(next_event_<config_.event_count&&config_.events[next_event_].frame<state_.position)++next_event_;
 }
 public:
 const char* error()const noexcept{return error_;}
 bool configured()const noexcept{return state_.configured!=0;}
 bool hosted(unsigned document)const noexcept{for(unsigned t=0;t<config_.track_count;++t)if(config_.tracks[t].document==document)return true;return false;}
 bool validate(const AliveSessionConfig& c)noexcept{
  if(c.version!=1||!c.track_count||c.track_count>2||c.event_count>1024||!flag(c.loop_enabled)||!c.length_frames||c.length_frames>24576000)
   return reject("Invalid Alive version, bounds, or session length.");
  if(c.loop_enabled&&(c.loop_start>=c.loop_end||c.loop_end>c.length_frames))return reject("Invalid Alive loop range.");
  for(unsigned t=0;t<c.track_count;++t){const auto& tr=c.tracks[t];
   if(tr.document>=CanvasWorkspace::MaxDocuments||!tr.revision||tr.output_channels!=2||tr.output_layout!=ALIVE_SESSION_SPEAKERS_STEREO||tr.parameter_count>16||!gain(tr.gain)||!flag(tr.mute)||!flag(tr.solo))return reject("Alive v1 requires a stereo speaker output and bounded track fields.");
   for(unsigned prior=0;prior<t;++prior)if(c.tracks[prior].document==tr.document)return reject("Alive tracks require independent document slots.");
   for(unsigned p=0;p<tr.parameter_count;++p){const auto& b=tr.parameters[p];
    if(!std::isfinite(b.base)||!std::isfinite(b.minimum)||!std::isfinite(b.maximum)||b.minimum>b.maximum||b.base<b.minimum||b.base>b.maximum||b.param>5||!flag(b.automated))return reject("Invalid Alive parameter binding or base range.");
    for(unsigned q=0;q<p;++q)if(tr.parameters[q].node==b.node&&tr.parameters[q].param==b.param)return reject("Duplicate Alive parameter binding.");
   }
  }
  std::array<unsigned,2> notes{},automation{};unsigned window=0,same=0;
  for(unsigned i=0;i<c.event_count;++i){const auto& e=c.events[i];
   if(e.track>=c.track_count||e.frame>=c.length_frames||e.kind>3||!std::isfinite(e.value))return reject("Alive event is outside its track, frame or value bounds.");
   if(i&&(c.events[i-1].frame>e.frame||(c.events[i-1].frame==e.frame&&priority(c.events[i-1].kind)>priority(e.kind))))return reject("Alive events must be ordered by frame, then termination/automation/note-on.");
   same=i&&c.events[i-1].frame==e.frame?same+1:1;
   while(c.events[window].frame+1024<=e.frame)++window;
   if(same>32||i-window+1>64)return reject("Alive event density exceeds 32/frame or 64/1024 frames.");
   if(e.kind==ALIVE_SESSION_AUTOMATION){
    if(e.target>=c.tracks[e.track].parameter_count)return reject("Alive automation parameter does not exist.");
    const auto& b=c.tracks[e.track].parameters[e.target];if(!b.automated||e.value<b.minimum||e.value>b.maximum||++automation[e.track]>256)return reject("Alive automation lane/range/point limit rejected.");
   }else if(e.kind==ALIVE_SESSION_SUSTAIN){if(e.target||!(e.value==0||e.value==127))return reject("Invalid Alive sustain event.");}
   else if(e.target>127||std::floor(e.value)!=e.value||e.value<0||e.value>127||(e.kind==ALIVE_SESSION_NOTE_ON&&(e.value==0||++notes[e.track]>128))||(e.kind==ALIVE_SESSION_NOTE_OFF&&e.value!=0))return reject("Invalid Alive note or note-count limit.");
  }
  // Count the infinite repeated loop arithmetically, including the first
  // transition from its non-looping prefix. No materialized repeat buffers.
  if(c.loop_enabled){const uint64_t period=c.loop_end-c.loop_start;
   for(unsigned i=0;i<c.event_count;++i){const uint64_t anchor=c.events[i].frame;if(anchor>=c.loop_end)break;uint64_t density=0;
    for(unsigned j=0;j<c.event_count;++j){const uint64_t frame=c.events[j].frame;if(frame>=c.loop_end)break;
     if(frame<c.loop_start){density+=frame>=anchor&&frame<anchor+1024;continue;}
     if(frame>=anchor+1024)continue;
     const uint64_t first=frame<anchor?(anchor-frame+period-1)/period:0,last=(anchor+1023-frame)/period;
     if(last>=first)density+=last-first+1;
    }
    if(density>64)return reject("Alive repeated loop/prefix exceeds callback event density.");
   }
  }
  error_="Alive configuration validated.";return true;
 }
 bool validate_graph(const AliveSessionTrack& track,const UltraCanvasGraph& graph)noexcept{
  CanvasPlan plan{};if(!compile_canvas(graph,plan)||graph.revision!=track.revision)return reject("Alive device graph/revision is invalid.");
  if(track.parameter_count>16||track.output_channels!=2||track.output_layout!=2)return reject("Alive device needs an explicit stereo speaker descriptor.");
  const int note=plan.find(track.note_node);if(note<0||graph.nodes[unsigned(note)].kind!=PolyNote)return reject("Alive MIDI entry must bind a native poly_note node.");
  bool stereo=false;
  for(unsigned n=0;n<graph.node_count;++n){const auto& node=graph.nodes[n];
   if(node.kind==Voice)return reject("Alive native profile rejects legacy Clockwork Voice (+64 frames).");
   if(node.kind==Send||node.kind==Receive)return reject("Alive native profile rejects named Send/Receive paths.");
   if(node.kind==Dac)stereo=true;
   if(node.kind==SignalDac){const auto& args=plan.arguments[n];if(args.count!=2||args.values[0]!=1||args.values[1]!=2)return reject("Alive output must use explicit stereo speakers 1 2.");stereo=true;}
  }
  if(!stereo)return reject("Alive device has no explicit stereo output route.");
  // Validate every declared base using the real graph compiler off callback.
  for(unsigned p=0;p<track.parameter_count;++p){const auto& b=track.parameters[p];
   if(!change_canvas_param(plan,b.node,b.param,b.base))return reject("Alive bound parameter is incompatible with its native node.");
  }
  error_="Alive device validated.";return true;
 }
 bool validate_values(const AliveSessionConfig& config,unsigned track,const UltraCanvasGraph& graph)noexcept{
  CanvasPlan plan{};if(!compile_canvas(graph,plan))return reject("Alive automation graph is invalid.");
  for(unsigned p=0;p<config.tracks[track].parameter_count;++p){const auto& b=config.tracks[track].parameters[p];if(!change_canvas_param(plan,b.node,b.param,b.base))return reject("Alive base parameter cannot be prepared.");}
  for(unsigned i=0;i<config.event_count;++i){const auto& event=config.events[i];if(event.track!=track||event.kind!=ALIVE_SESSION_AUTOMATION)continue;
   const auto& b=config.tracks[track].parameters[event.target];
   if(!change_canvas_param(plan,b.node,b.param,event.value))return reject("Alive automation value violates the native parameter type/range.");
  }return true;
 }
 bool validate_prepared(const AliveSessionConfig& config,const UltraCanvasGraph* graphs,unsigned count)noexcept{
  if(!graphs||count!=config.track_count)return reject("Alive prepared graph count does not match the tracks.");
  if(!validate(config))return false;
  for(unsigned t=0;t<count;++t)if(!validate_graph(config.tracks[t],graphs[t])||!validate_values(config,t,graphs[t]))return false;
  return true;
 }
 bool configure(const AliveSessionConfig& c,CanvasWorkspace& workspace)noexcept{
  if(!validate(c))return false;
  for(unsigned t=0;t<c.track_count;++t){if(!workspace.live(c.tracks[t].document))return reject("Alive document graph is missing.");
   const auto& graph=workspace.runtime(c.tracks[t].document).plan().graph;
   if(!validate_graph(c.tracks[t],graph)||!validate_values(c,t,graph))return false;
  }
  for(unsigned d=0;d<CanvasWorkspace::MaxDocuments;++d)if(workspace.live(d)){bool found=false;for(unsigned t=0;t<c.track_count;++t)found|=c.tracks[t].document==d;if(!found)return reject("Alive session cannot mix unrelated document roots.");}
  config_=c;const uint64_t absolute=state_.absolute_frame,generation=state_.generation;state_={};state_.absolute_frame=absolute;state_.generation=generation;
  state_.configured=1;state_.track_count=c.track_count;head_=0;tail_=0;applied_stop_=stop_epoch_.load();
  for(unsigned t=0;t<c.track_count;++t){auto& ts=state_.tracks[t];ts.gain=c.tracks[t].gain;ts.mute=c.tracks[t].mute;ts.solo=c.tracks[t].solo;for(unsigned p=0;p<c.tracks[t].parameter_count;++p){ts.base[p]=c.tracks[t].parameters[p].base;
   const auto& plan=workspace.runtime(c.tracks[t].document).plan();parameter_kinds_[t][p]=plan.graph.nodes[unsigned(plan.find(c.tracks[t].parameters[p].node))].kind;
  }}
  discontinuity(workspace);publish(workspace);return true;
 }
 void reset(CanvasWorkspace& workspace)noexcept{
  state_.playing=0;discontinuity(workspace);config_={};state_.configured=0;state_.track_count=0;head_=0;tail_=0;publish(workspace);
 }
 bool start()noexcept{if(!configured())return reject("No Alive session configured.");Command c{};c.kind=1;return enqueue(c);}
 void stop()noexcept{stop_epoch_.fetch_add(1,std::memory_order_release);}
 bool seek(uint64_t frame)noexcept{if(!configured()||frame>=config_.length_frames)return reject("Alive seek is outside the session.");Command c{};c.kind=2;c.frame=frame;return enqueue(c);}
 bool base(unsigned track,unsigned param,double value)noexcept{
  if(track>=config_.track_count||param>=config_.tracks[track].parameter_count)return reject("Alive parameter binding does not exist.");
  const auto& b=config_.tracks[track].parameters[param];
  if(!std::isfinite(value)||value<b.minimum||value>b.maximum||!canvas_param_valid(parameter_kinds_[track][param],b.param,value))return reject("Alive base parameter is outside its declared native range/type.");
  Command c{};c.kind=3;c.track=track;c.param=param;c.value=value;return enqueue(c);
 }
 bool mixer(unsigned track,double level,unsigned mute,unsigned solo)noexcept{
  if(track>=config_.track_count||!gain(level)||!flag(mute)||!flag(solo))return reject("Invalid Alive mixer edit.");
  Command c{};c.kind=4;c.track=track;c.value=level;c.mute=mute;c.solo=solo;return enqueue(c);
 }
 void begin(CanvasWorkspace& workspace)noexcept{
  const uint64_t stop=stop_epoch_.load(std::memory_order_acquire);
  if(stop!=applied_stop_){state_.playing=0;discontinuity(workspace);applied_stop_=stop;}
  const unsigned end=head_.load(std::memory_order_acquire);unsigned tail=tail_.load(std::memory_order_relaxed);
  for(unsigned budget=0;tail!=end&&budget<64;++budget){const auto& c=commands_[tail];tail=(tail+1)%65;
   if(c.kind<=2&&c.epoch!=stop)continue;
   if(c.kind==1){if(!state_.playing){if(state_.position>=config_.length_frames)state_.position=0;state_.playing=1;discontinuity(workspace);}}
   else if(c.kind==2){state_.position=c.frame;discontinuity(workspace);}
   else if(c.kind==3){auto& ts=state_.tracks[c.track];ts.base[c.param]=c.value;if(!ts.owned[c.param])parameter(workspace,c.track,c.param,c.value);}
   else if(c.kind==4){auto& ts=state_.tracks[c.track];ts.gain=c.value;ts.mute=c.mute;ts.solo=c.solo;}
  }
  tail_.store(tail,std::memory_order_release);
  state_.peak_left=state_.peak_right=0;for(auto& ts:state_.tracks)ts.peak_left=ts.peak_right=0;
 }
 void device_stopped(CanvasWorkspace& workspace)noexcept{stop();begin(workspace);publish(workspace);}
 void sample(CanvasWorkspace& workspace)noexcept{
  if(!state_.playing)return;
  while(next_event_<config_.event_count&&config_.events[next_event_].frame==state_.position){const auto& event=config_.events[next_event_++];
   if(event.kind==ALIVE_SESSION_AUTOMATION)parameter(workspace,event.track,event.target,event.value);
   else{const auto& track=config_.tracks[event.track];CanvasMessage message{};unsigned inlet=0;
    if(event.kind==ALIVE_SESSION_SUSTAIN){inlet=1;message.count=1;message.values[0]=event.value;}
    else{message.count=2;message.values[0]=event.target;message.values[1]=event.value;}
    auto discard=[](alive::Event){return true;};workspace.event(track.document,track.revision,track.note_node,inlet,message,0,discard);
   }
  }
 }
 std::array<double,2> mix(unsigned document,const std::array<double,2>& signal)noexcept{
  bool solo=false;for(unsigned t=0;t<config_.track_count;++t)solo|=state_.tracks[t].solo;
  for(unsigned t=0;t<config_.track_count;++t)if(config_.tracks[t].document==document){auto& ts=state_.tracks[t];
   if(!state_.playing||ts.mute||(solo&&!ts.solo))return {};
   const std::array<double,2> output{signal[0]*ts.gain,signal[1]*ts.gain};ts.peak_left=std::max(ts.peak_left,std::abs(output[0]));ts.peak_right=std::max(ts.peak_right,std::abs(output[1]));return output;
  }
  return signal;
 }
 void advance(CanvasWorkspace& workspace,double left,double right)noexcept{
  ++state_.absolute_frame;state_.peak_left=std::max(state_.peak_left,std::abs(left));state_.peak_right=std::max(state_.peak_right,std::abs(right));
  if(!state_.playing)return;
  ++state_.position;
  if(config_.loop_enabled&&state_.position>=config_.loop_end){state_.position=config_.loop_start;discontinuity(workspace);}
  else if(state_.position>=config_.length_frames){state_.playing=0;discontinuity(workspace);}
 }
 void publish(const CanvasWorkspace& workspace)noexcept{
  state_.rejected=rejected_.load();for(unsigned t=0;t<config_.track_count;++t)state_.tracks[t].active_voices=workspace.runtime(config_.tracks[t].document).active_voice_count();
  std::array<uint64_t,Words> words{};std::memcpy(words.data(),&state_,sizeof state_);publication_.fetch_add(1);
  for(unsigned i=0;i<Words;++i)published_[i].store(words[i]);
  publication_.fetch_add(1);
 }
 bool snapshot(AliveSessionState& result)const noexcept{
  for(unsigned attempt=0;attempt<4;++attempt){const auto before=publication_.load();if(before&1)continue;std::array<uint64_t,Words> words{};
   for(unsigned i=0;i<Words;++i)words[i]=published_[i].load();
   if(before==publication_.load()){std::memcpy(&result,words.data(),sizeof result);result.rejected=rejected_.load();return true;}
  }return false;
 }
};
}
