#pragma once
#include "alive_session.h"
#include "alive-master-v1.h"
#include "canvas_workspace.hpp"
#include "alive_session_clip_policy.hpp"
#include "alive_session_workspace_envelope.hpp"
#include "alive_session_bits.hpp"
#include <memory>
#include <atomic>
#include <cstring>
#include <limits>

namespace ultra {
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
inline void (*alive_session_test_boundary)()noexcept=nullptr;
inline void (*alive_session_test_publication)()noexcept=nullptr;
inline void (*alive_session_test_charge)(unsigned,const clip_admission::Cost&)noexcept=nullptr;
inline unsigned alive_session_test_fault_resource=0;
inline void (*alive_session_test_dispatch)(uint64_t,unsigned,unsigned,const AliveSessionEventV2&)noexcept=nullptr;
inline void (*alive_session_test_placement_charge)(unsigned,uint64_t)noexcept=nullptr;
inline void (*alive_session_test_placement_probe)(unsigned)noexcept=nullptr;
inline uint64_t alive_session_test_reconstruction_reads=0,alive_session_test_preview_reads=0;
#endif
class AliveSession {
 struct InternalRequest {uint32_t kind=0,track_mask=0;uint64_t preparation_revision=0,request_serial=0,position=0;AliveSessionTrackActionV3 tracks[8]{};};
 struct Command {unsigned kind=0,track=0,param=0,mute=0,solo=0;double value=0;uint64_t frame=0,epoch=0;InternalRequest request{};};
 struct Config {
  uint32_t track_count=0,device_count=0,event_count=0,loop_enabled=0;
  uint64_t length_frames=0,loop_start=0,loop_end=0,preparation_revision=0;
  uint32_t profile=0,work_policy=0,clip_count=0;double tempo_bpm=0;
  AliveSessionTrackV2 tracks[8]{};AliveSessionDeviceV2 devices[16]{};AliveSessionEventV2 events[1024]{};
  AliveSessionTrackV3 bank[8]{};AliveSessionClipV3 clips[32]{};
  uint32_t source_count=0,placement_count=0,slot_count=0;
  AliveSessionSourceV4 sources[32]{};
  AliveSessionSlotV4 slots[32]{};
  AliveSessionPlacementV4 placements[64]{};
  std::array<unsigned,8> placement_begin{},placement_size{};
  std::array<std::array<unsigned,4>,8> source_map{},slot_map{};
  std::array<unsigned,8> source_size{};
  void legacy(const AliveSessionConfigV2& c)noexcept{
   *this={};track_count=c.track_count;device_count=c.device_count;event_count=c.event_count;loop_enabled=c.loop_enabled;
   length_frames=c.length_frames;loop_start=c.loop_start;loop_end=c.loop_end;
   std::copy_n(c.tracks,2,tracks);std::copy_n(c.devices,6,devices);std::copy_n(c.events,1024,events);
  }
 } config_{};
 AliveSessionStateV3 state_{};
 enum class Mode {Legacy, Clips, Workspaces};
 Mode mode_=Mode::Legacy;
 std::array<Command,65> commands_{};
 std::atomic<unsigned> head_{0},tail_{0};
 std::atomic<uint64_t> stop_epoch_{0},rejected_{0};uint64_t applied_stop_=0;
 static constexpr unsigned Words=(sizeof(AliveSessionStateV4)+7)/8;
 std::array<std::atomic<uint64_t>,Words> published_{};
 std::array<std::atomic<uint64_t>,sizeof(AliveMasterStateV1)/8> published_master_{};
 std::atomic<uint64_t> publication_{0};
 AliveMasterStateV1 master_{ALIVE_MASTER_V1,sizeof(AliveMasterStateV1),0,0,1.,1.,0.,0.,0,0,0,0};
 double master_from_=1.;unsigned master_ramp_=0;bool master_quiescent_=false;
 unsigned next_event_=0;
 // Control-thread snapshots retain structural constraints for queued base edits.
 std::array<CanvasPlan,16> parameter_plans_{};
 // Serialized control ingress resolves handles before enqueue; callback never searches.
 std::array<int,CanvasWorkspace::MaxDocuments> document_devices_{};
 const char* error_="No Alive session configured.";
 static bool flag(unsigned value)noexcept{return value<=1;}
 static bool gain(double value)noexcept{return std::isfinite(value)&&value>=0&&value<=4;}
 static unsigned priority(unsigned kind)noexcept{return kind==ALIVE_SESSION_SUSTAIN?0:kind;}
 bool reject(const char* error)noexcept{error_=error;rejected_.fetch_add(1);return false;}
 bool enqueue(Command command,bool report_full=true)noexcept{
  const unsigned head=head_.load(std::memory_order_relaxed),next=(head+1)%65;
  if(next==tail_.load(std::memory_order_acquire))return report_full?reject("Alive command queue is full; edit rejected."):false;
  command.epoch=stop_epoch_.load(std::memory_order_acquire);
  if(command.epoch==UINT64_MAX&&(command.kind<=2||command.kind==6))return reject("Stop identity exhausted; restart the host.");
  commands_[head]=command;
  head_.store(next,std::memory_order_release);return true;
 }
 bool normalize_v1(const AliveSessionConfig& c,AliveSessionConfigV2& out)noexcept{
  if(c.version!=1||!c.track_count||c.track_count>2||c.event_count>1024)return reject("Invalid Alive version or bounds.");
  out={};out.version=2;out.struct_bytes=sizeof out;out.track_count=c.track_count;out.device_count=c.track_count;
  out.event_count=c.event_count;out.loop_enabled=c.loop_enabled;out.length_frames=c.length_frames;out.loop_start=c.loop_start;out.loop_end=c.loop_end;
  for(unsigned t=0;t<c.track_count;++t){const auto& tr=c.tracks[t];auto& d=out.devices[t];auto& track=out.tracks[t];
   d.document=tr.document;d.kind=ALIVE_SESSION_DEVICE_INSTRUMENT;d.note_node=tr.note_node;d.output_channels=tr.output_channels;d.output_layout=tr.output_layout;
   d.revision=tr.revision;d.parameter_count=tr.parameter_count;std::memcpy(d.parameters,tr.parameters,sizeof d.parameters);
   track.instrument=t;track.gain=tr.gain;track.mute=tr.mute;track.solo=tr.solo;
  }
  for(unsigned i=0;i<c.event_count;++i){const auto& e=c.events[i];if(e.track>=c.track_count)return reject("Alive event track does not exist.");out.events[i]={e.frame,e.track,e.kind,e.track,e.target,e.value};}
  return true;
 }
 bool validate_device(const AliveSessionDeviceV2& d,bool legacy=false)noexcept{
  if(d.document>=CanvasWorkspace::MaxDocuments||!d.revision||d.output_channels!=2||d.output_layout!=2||d.parameter_count>16||!flag(d.bypassed)||d.reserved0||d.reserved1)
   return reject("Alive device requires bounded fields and stereo speaker output.");
  if(d.kind==ALIVE_SESSION_DEVICE_INSTRUMENT){
   if((!legacy&&!d.note_node)||d.input_node||d.input_channels||d.input_layout||d.bypassed)return reject("Alive instrument requires a note entry, no input and no bypass.");
  }else if(d.kind==ALIVE_SESSION_DEVICE_AUDIO_EFFECT){
   if(d.note_node||!d.input_node||d.input_channels!=2||d.input_layout!=2)return reject("Alive effect requires a stereo audio input and no note entry.");
  }else return reject("Unknown Alive device kind.");
  for(unsigned p=0;p<d.parameter_count;++p){const auto& b=d.parameters[p];
   if(!std::isfinite(b.base)||!std::isfinite(b.minimum)||!std::isfinite(b.maximum)||b.minimum>b.maximum||b.base<b.minimum||b.base>b.maximum||b.param>5||!flag(b.automated))return reject("Invalid Alive parameter binding or base range.");
   for(unsigned q=0;q<p;++q)if(d.parameters[q].node==b.node&&d.parameters[q].param==b.param)return reject("Duplicate Alive parameter binding.");
  }return true;
 }
 void parameter(CanvasWorkspace& workspace,unsigned device,unsigned param,double value)noexcept{
  auto& runtime=workspace.runtime(config_.devices[device].document);const auto& binding=config_.devices[device].parameters[param];
  auto discard=[](alive::Event){return true;};
  if(!runtime.param(runtime.plan(),binding.node,binding.param,value,0,discard)){runtime.fail();return;}
  state_.devices[device].effective[param]=value;
 }
 void chase(CanvasWorkspace& workspace)noexcept{
  std::array<std::array<double,16>,16> values{};
  for(unsigned d=0;d<config_.device_count;++d)for(unsigned p=0;p<config_.devices[d].parameter_count;++p){
   auto& ds=state_.devices[d];values[d][p]=ds.base[p];ds.owned[p]=state_.playing&&config_.devices[d].parameters[p].automated;
  }
  // One schedule scan, followed by bounded device/parameter application.
  if(state_.playing)for(unsigned i=0;i<config_.event_count&&config_.events[i].frame<=state_.position;++i){const auto& e=config_.events[i];if(e.kind==ALIVE_SESSION_AUTOMATION)values[e.device][e.target]=e.value;}
  for(unsigned d=0;d<config_.device_count;++d)for(unsigned p=0;p<config_.devices[d].parameter_count;++p)parameter(workspace,d,p,values[d][p]);
 }
 void discontinuity(CanvasWorkspace& workspace)noexcept{
  ++state_.generation;
  for(unsigned d=0;d<config_.device_count;++d){auto& runtime=workspace.runtime(config_.devices[d].document);runtime.reset(runtime.plan());}
  chase(workspace);
  if(!state_.playing){auto discard=[](alive::Event){return true;};for(unsigned d=0;d<config_.device_count;++d)workspace.stop(config_.devices[d].document,0,discard);}
  next_event_=0;while(next_event_<config_.event_count&&config_.events[next_event_].frame<state_.position)++next_event_;
 }
 int resolve(unsigned document,uint64_t revision)const noexcept{
  if(!configured()||document>=document_devices_.size())return -1;
  const int device=document_devices_[document];return device>=0&&config_.devices[unsigned(device)].revision==revision?device:-1;
 }
 bool base_device(unsigned device,unsigned param,double value)noexcept{
  if(device>=config_.device_count||param>=config_.devices[device].parameter_count)return reject("Alive parameter binding does not exist.");
  const auto& b=config_.devices[device].parameters[param];
  if(!std::isfinite(value)||value<b.minimum||value>b.maximum)return reject("Alive base parameter is outside its declared native range/type.");
  auto next=parameter_plans_[device];if(!change_canvas_param(next,b.node,b.param,value))return reject("Alive base parameter violates its prepared node constraints.");
  Command c{};c.kind=3;c.track=device;c.param=param;c.value=value;if(!enqueue(c))return false;parameter_plans_[device]=next;return true;
 }
 public:
 AliveSession()noexcept{
  document_devices_.fill(-1);state_.version=3;state_.struct_bytes=sizeof state_;
  std::array<uint64_t,Words> words{};std::memcpy(words.data(),&state_,sizeof state_);
  for(unsigned i=0;i<Words;++i)published_[i].store(words[i],std::memory_order_relaxed);
 }
 const char* error()const noexcept{return error_;}
 bool configured()const noexcept{return state_.configured!=0;}
 void clear_master()noexcept{master_={ALIVE_MASTER_V1,sizeof(AliveMasterStateV1),0,0,1.,1.,0.,0.,0,0,state_.absolute_frame,state_.absolute_frame};master_from_=1.;master_ramp_=0;}
 void apply_master(const Command& c)noexcept{
  if(c.kind==7){master_.target_gain=c.value;master_from_=master_.current_gain;master_ramp_=master_quiescent_?0:64;if(master_quiescent_)master_.current_gain=c.value;}
  else master_.clip_mask=0;
  master_.applied_serial=c.frame;master_.applied_frame=state_.absolute_frame;
 }
 int master_command(uint32_t version,double value,uint64_t serial,bool reset,bool quiescent,CanvasWorkspace& workspace)noexcept{
  if(version!=ALIVE_MASTER_V1)return ALIVE_MASTER_UNSUPPORTED;
  if(!serial||(!reset&&!gain(value)))return ALIVE_MASTER_INVALID;
  if(!configured())return ALIVE_MASTER_UNCONFIGURED;
  if(quiescent){master_quiescent_=true;begin(workspace);}
  Command c{};c.kind=reset?8:7;c.value=value;c.frame=serial;
  if(!enqueue(c,false)){master_quiescent_=false;return ALIVE_MASTER_FULL;}
  if(quiescent){begin(workspace);publish(workspace);master_quiescent_=false;}
  return ALIVE_MASTER_OK;
 }
 bool hosted(unsigned document)const noexcept{for(unsigned d=0;d<config_.device_count;++d)if(config_.devices[d].document==document)return true;return false;}
 bool validate(const AliveSessionConfig& c)noexcept{AliveSessionConfigV2 normalized{};return normalize_v1(c,normalized)&&validate_config(normalized,true);}
 bool validate_v2(const AliveSessionConfigV2& c)noexcept{return validate_config(c,false);}
 private:
 bool validate_config(const AliveSessionConfigV2& c,bool legacy)noexcept{
  if(c.version!=2||c.struct_bytes!=sizeof c||!c.track_count||c.track_count>2||c.device_count<c.track_count||c.device_count>6||c.reserved0||c.reserved1||c.event_count>1024||!flag(c.loop_enabled)||!c.length_frames||c.length_frames>24576000)
   return reject("Invalid Alive version, size, bounds, or session length.");
  if(c.loop_enabled&&(c.loop_start>=c.loop_end||c.loop_end>c.length_frames))return reject("Invalid Alive loop range.");
  std::array<int,6> owner{};owner.fill(-1);
  for(unsigned d=0;d<c.device_count;++d){if(!validate_device(c.devices[d],legacy))return false;
   for(unsigned prior=0;prior<d;++prior)if(c.devices[prior].document==c.devices[d].document)return reject("Alive devices require independent document slots.");
  }
  for(unsigned t=0;t<c.track_count;++t){const auto& tr=c.tracks[t];
   if(tr.instrument>=c.device_count||tr.effect_count>2||!gain(tr.gain)||!flag(tr.mute)||!flag(tr.solo))return reject("Invalid Alive track chain or mixer.");
   for(unsigned member=0;member<=tr.effect_count;++member){const unsigned d=member?tr.effects[member-1]:tr.instrument;
    if(d>=c.device_count||owner[d]>=0||c.devices[d].kind!=(member?ALIVE_SESSION_DEVICE_AUDIO_EFFECT:ALIVE_SESSION_DEVICE_INSTRUMENT))return reject("Alive chain contains duplicate or incompatible devices.");
    owner[d]=int(t);
   }
   unsigned lanes=0;for(unsigned d=0;d<c.device_count;++d)if(owner[d]==int(t))for(unsigned p=0;p<c.devices[d].parameter_count;++p)lanes+=c.devices[d].parameters[p].automated;
   if(lanes>16)return reject("Alive automation exceeds sixteen lanes per track.");
  }
  for(unsigned d=0;d<c.device_count;++d)if(owner[d]<0)return reject("Alive device has no owning track chain.");
  std::array<unsigned,2> notes{},automation{};unsigned window=0,same=0;
  for(unsigned i=0;i<c.event_count;++i){const auto& e=c.events[i];
   if(e.track>=c.track_count||e.device>=c.device_count||owner[e.device]!=int(e.track)||e.frame>=c.length_frames||e.kind>3||!std::isfinite(e.value))return reject("Alive event is outside its track, device, frame or value bounds.");
   if(i&&(c.events[i-1].frame>e.frame||(c.events[i-1].frame==e.frame&&priority(c.events[i-1].kind)>priority(e.kind))))return reject("Alive events must be ordered by frame, then termination/automation/note-on.");
   same=i&&c.events[i-1].frame==e.frame?same+1:1;while(c.events[window].frame+1024<=e.frame)++window;
   if(same>32||i-window+1>64)return reject("Alive event density exceeds 32/frame or 64/1024 frames.");
   if(e.kind==ALIVE_SESSION_AUTOMATION){
    if(e.target>=c.devices[e.device].parameter_count)return reject("Alive automation parameter does not exist.");
    const auto& b=c.devices[e.device].parameters[e.target];if(!b.automated||e.value<b.minimum||e.value>b.maximum||++automation[e.track]>256)return reject("Alive automation lane/range/point limit rejected.");
   }else if(e.device!=c.tracks[e.track].instrument)return reject("Alive notes and sustain must target the track instrument.");
   else if(e.kind==ALIVE_SESSION_SUSTAIN){if(e.target||!(e.value==0||e.value==127))return reject("Invalid Alive sustain event.");}
   else if(e.target>127||std::floor(e.value)!=e.value||e.value<0||e.value>127||(e.kind==ALIVE_SESSION_NOTE_ON&&(e.value==0||++notes[e.track]>128))||(e.kind==ALIVE_SESSION_NOTE_OFF&&e.value!=0))return reject("Invalid Alive note or note-count limit.");
  }
  // Count repeated loop seams and their non-looping prefix arithmetically.
  if(c.loop_enabled){const uint64_t period=c.loop_end-c.loop_start;
   for(unsigned i=0;i<c.event_count;++i){const uint64_t anchor=c.events[i].frame;if(anchor>=c.loop_end)break;uint64_t density=0;
    for(unsigned j=0;j<c.event_count;++j){const uint64_t frame=c.events[j].frame;if(frame>=c.loop_end)break;
     if(frame<c.loop_start){density+=frame>=anchor&&frame<anchor+1024;continue;}
     if(frame>=anchor+1024)continue;
     const uint64_t first=frame<anchor?(anchor-frame+period-1)/period:0,last=(anchor+1023-frame)/period;if(last>=first)density+=last-first+1;
    }if(density>64)return reject("Alive repeated loop/prefix exceeds callback event density.");
   }
  }
  error_="Alive configuration validated.";return true;
 }
 enum class GraphAdmission {LegacyV1,DeviceV2};
 bool validate_graph_common(const AliveSessionDeviceV2& device,const UltraCanvasGraph& graph,GraphAdmission policy)noexcept{
  if(policy==GraphAdmission::DeviceV2&&!validate_device(device))return false;
  CanvasPlan plan{};if(!compile_canvas(graph,plan)||graph.revision!=device.revision)return reject("Alive device graph/revision is invalid.");
  // Standalone v1 graph admission checks only its original descriptor fields.
  if(policy==GraphAdmission::LegacyV1&&(device.parameter_count>16||device.output_channels!=2||device.output_layout!=2))return reject("Alive device needs an explicit stereo speaker descriptor.");
  const int entry=plan.find(device.kind==ALIVE_SESSION_DEVICE_INSTRUMENT?device.note_node:device.input_node);
  const unsigned entry_kind=device.kind==ALIVE_SESSION_DEVICE_INSTRUMENT?PolyNote:AudioIn;
  if(entry<0||graph.nodes[unsigned(entry)].kind!=entry_kind)return reject(policy==GraphAdmission::LegacyV1?"Alive MIDI entry must bind a native poly_note node.":"Alive device entry node has an incompatible native kind.");
  bool stereo=false;
  for(unsigned n=0;n<graph.node_count;++n){const auto& node=graph.nodes[n];
   if(node.kind==Voice)return reject("Alive native profile rejects legacy Clockwork Voice (+64 frames).");
   if(node.kind==Send||node.kind==Receive)return reject("Alive native profile rejects named Send/Receive paths.");
   if(node.kind==Dac)stereo=true;
   if(node.kind==SignalDac){const auto& args=plan.arguments[n];if(args.count!=2||args.values[0]!=1||args.values[1]!=2)return reject("Alive output must use explicit stereo speakers 1 2.");stereo=true;}
  }
  if(!stereo)return reject("Alive device has no explicit stereo output route.");
  // Validate every declared base using the real graph compiler off callback.
  for(unsigned p=0;p<device.parameter_count;++p){const auto& b=device.parameters[p];const int slot=plan.find(b.node);
   if(slot>=0&&(graph.nodes[unsigned(slot)].kind==Flonum||graph.nodes[unsigned(slot)].kind==NumberInt)&&(b.param==1||b.param==2))return reject("Alive numeric UI min/max bounds are structural; bind the value instead.");
   if(!change_canvas_param(plan,b.node,b.param,b.base))return reject("Alive bound parameter is incompatible with its native node.");
  }error_="Alive device validated.";return true;
 }
 public:
 bool validate_graph(const AliveSessionTrack& track,const UltraCanvasGraph& graph)noexcept{
  AliveSessionDeviceV2 device{};device.document=track.document;device.kind=ALIVE_SESSION_DEVICE_INSTRUMENT;device.note_node=track.note_node;
  device.output_channels=track.output_channels;device.output_layout=track.output_layout;device.parameter_count=track.parameter_count;device.revision=track.revision;
  std::memcpy(device.parameters,track.parameters,sizeof device.parameters);
  return validate_graph_common(device,graph,GraphAdmission::LegacyV1);
 }
 bool validate_device_v2(const AliveSessionDeviceV2& device,const UltraCanvasGraph& graph)noexcept{
  return validate_graph_common(device,graph,GraphAdmission::DeviceV2);
 }
 bool validate_values_v2(const AliveSessionConfigV2& config,unsigned device,const UltraCanvasGraph& graph)noexcept{
  CanvasPlan plan{};if(!compile_canvas(graph,plan))return reject("Alive automation graph is invalid.");
  const auto& d=config.devices[device];
  for(unsigned p=0;p<d.parameter_count;++p){const auto& b=d.parameters[p];if(!change_canvas_param(plan,b.node,b.param,b.base))return reject("Alive base parameter cannot be prepared.");}
  for(unsigned i=0;i<config.event_count;++i){const auto& event=config.events[i];if(event.device!=device||event.kind!=ALIVE_SESSION_AUTOMATION)continue;const auto& b=d.parameters[event.target];
   if(!change_canvas_param(plan,b.node,b.param,event.value))return reject("Alive automation value violates the native parameter type/range.");
  }return true;
 }
 bool validate_values(const AliveSessionConfig& config,unsigned track,const UltraCanvasGraph& graph)noexcept{
  AliveSessionConfigV2 normalized{};return normalize_v1(config,normalized)&&validate_config(normalized,true)&&track<normalized.device_count&&validate_values_v2(normalized,track,graph);
 }
 bool validate_prepared_v2(const AliveSessionConfigV2& config,const UltraCanvasGraph* graphs,unsigned count)noexcept{
  if(!validate_v2(config))return false;
  if(!graphs||count!=config.device_count)return reject("Alive prepared graph count does not match the devices.");
  for(unsigned d=0;d<count;++d)if(!validate_device_v2(config.devices[d],graphs[d])||!validate_values_v2(config,d,graphs[d]))return false;
  return true;
 }
 bool validate_prepared(const AliveSessionConfig& config,const UltraCanvasGraph* graphs,unsigned count)noexcept{
  AliveSessionConfigV2 normalized{};if(!normalize_v1(config,normalized)||!validate_config(normalized,true))return false;
  if(!graphs||count!=config.track_count)return reject("Alive prepared graph count does not match the tracks.");
  for(unsigned t=0;t<count;++t)if(!validate_graph(config.tracks[t],graphs[t])||!validate_values_v2(normalized,t,graphs[t]))return false;
  return true;
 }
 private:
 bool configure_common(const AliveSessionConfigV2& c,CanvasWorkspace& workspace,const AliveSessionConfig* legacy)noexcept{
  if(!validate_config(c,legacy!=nullptr))return false;
  std::array<CanvasPlan,16> parameter_plans{};std::array<int,CanvasWorkspace::MaxDocuments> documents{};documents.fill(-1);
  for(unsigned d=0;d<c.device_count;++d){const auto& device=c.devices[d];if(!workspace.live(device.document))return reject("Alive document graph is missing.");
   const auto& graph=workspace.runtime(device.document).plan().graph;
   if(!(legacy?validate_graph(legacy->tracks[d],graph):validate_device_v2(device,graph))||!validate_values_v2(c,d,graph))return false;
   parameter_plans[d]=workspace.runtime(device.document).plan();documents[device.document]=int(d);
   for(unsigned p=0;p<device.parameter_count;++p){const auto& b=device.parameters[p];if(!change_canvas_param(parameter_plans[d],b.node,b.param,b.base))return reject("Alive base parameter cannot be prepared.");}
  }
  for(unsigned d=0;d<CanvasWorkspace::MaxDocuments;++d)if(workspace.live(d)&&documents[d]<0)return reject("Alive session cannot mix unrelated document roots.");
  parameter_plans_=parameter_plans;document_devices_=documents;config_.legacy(c);mode_=Mode::Legacy;
  const uint64_t absolute=state_.absolute_frame,generation=state_.generation;state_={};state_.version=3;state_.struct_bytes=sizeof state_;state_.absolute_frame=absolute;state_.generation=generation;
  state_.configured=1;state_.track_count=c.track_count;state_.device_count=c.device_count;head_=0;tail_=0;applied_stop_=stop_epoch_.load();clear_master();
  for(unsigned t=0;t<c.track_count;++t){auto& ts=state_.tracks[t].mixer;ts.gain=c.tracks[t].gain;ts.mute=c.tracks[t].mute;ts.solo=c.tracks[t].solo;}
  for(unsigned d=0;d<c.device_count;++d){auto& ds=state_.devices[d];const auto& device=c.devices[d];ds.document=device.document;ds.revision=device.revision;ds.bypassed=device.bypassed;ds.parameter_count=device.parameter_count;
   for(unsigned p=0;p<device.parameter_count;++p)ds.base[p]=device.parameters[p].base;
  }discontinuity(workspace);publish(workspace);return true;
 }
 public:
 bool configure(const AliveSessionConfig& c,CanvasWorkspace& workspace)noexcept{AliveSessionConfigV2 normalized{};return normalize_v1(c,normalized)&&configure_common(normalized,workspace,&c);}
 bool configure_v2(const AliveSessionConfigV2& c,CanvasWorkspace& workspace)noexcept{return configure_common(c,workspace,nullptr);}
 void reset(CanvasWorkspace& workspace)noexcept{
  if(mode_!=Mode::Legacy){terminate_v3(workspace,ALIVE_SESSION_V3_STOP_CANCELED);const auto absolute=state_.absolute_frame,generation=state_.generation;state_={};state_.absolute_frame=absolute;state_.generation=generation;}
  else {state_.playing=0;discontinuity(workspace);}
  mode_=Mode::Legacy;state_.profile=0;config_={};state_.configured=0;state_.track_count=0;state_.device_count=0;head_=0;tail_=0;document_devices_.fill(-1);clear_master();publish(workspace);
 }
 bool start()noexcept{if(mode_!=Mode::Legacy)return reject("Use identity-bearing v3 requests.");if(!configured())return reject("No Alive session configured.");Command c{};c.kind=1;return enqueue(c);}
 uint64_t stop()noexcept{
  auto epoch=stop_epoch_.load(std::memory_order_relaxed);
  while(epoch!=UINT64_MAX&&!stop_epoch_.compare_exchange_weak(epoch,epoch+1,std::memory_order_release,std::memory_order_relaxed)){}
  return epoch==UINT64_MAX?epoch:epoch+1;
 }
 bool seek(uint64_t frame)noexcept{if(mode_!=Mode::Legacy)return reject("Use identity-bearing v3 requests.");if(!configured()||frame>=config_.length_frames)return reject("Alive seek is outside the session.");Command c{};c.kind=2;c.frame=frame;return enqueue(c);}
 bool base(unsigned track,unsigned param,double value)noexcept{
  if(mode_==Mode::Workspaces)return reject("Use document/revision base authentication.");
  if(track>=config_.track_count)return reject("Alive parameter track does not exist.");
  const auto& d=config_.devices[config_.tracks[track].instrument];return base_v2(d.document,d.revision,param,value);
 }
 bool base_v2(unsigned document,uint64_t revision,unsigned param,double value)noexcept{
  const int device=resolve(document,revision);if(device<0)return reject("Stale or unowned Alive document/revision handle.");return base_device(unsigned(device),param,value);
 }
 bool bypass_v2(unsigned document,uint64_t revision,unsigned bypassed)noexcept{
  const int device=resolve(document,revision);if(device<0)return reject("Stale or unowned Alive document/revision handle.");
  if(!flag(bypassed)||config_.devices[unsigned(device)].kind!=ALIVE_SESSION_DEVICE_AUDIO_EFFECT)return reject("Alive bypass requires an effect and a boolean flag.");
  Command c{};c.kind=5;c.track=unsigned(device);c.mute=bypassed;return enqueue(c);
 }
 bool mixer(unsigned track,double level,unsigned mute,unsigned solo)noexcept{
  if(track>=config_.track_count||!gain(level)||!flag(mute)||!flag(solo))return reject("Invalid Alive mixer edit.");
  Command c{};c.kind=4;c.track=track;c.value=level;c.mute=mute;c.solo=solo;return enqueue(c);
 }
 void begin(CanvasWorkspace& workspace)noexcept{
  master_.peak_left=master_.peak_right=0;master_.observation_start_frame=master_.observation_end_frame=state_.absolute_frame;
  // An acquired command head also orders the producer's preceding Stop.
  // Snapshot it first so a newly published Start/Seek cannot look stale.
  const unsigned end=head_.load(std::memory_order_acquire);
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
  if(alive_session_test_boundary)alive_session_test_boundary();
#endif
  const uint64_t stop=stop_epoch_.load(std::memory_order_acquire);
  if(mode_!=Mode::Legacy){begin_v3(workspace,end,stop);return;}
  if(stop!=applied_stop_){state_.playing=0;discontinuity(workspace);applied_stop_=stop;}
  unsigned tail=tail_.load(std::memory_order_relaxed);
  for(unsigned budget=0;tail!=end&&budget<64;++budget){const auto& c=commands_[tail];tail=(tail+1)%65;if(c.kind<=2&&c.epoch!=stop)continue;
   if(c.kind==1){if(!state_.playing){if(state_.position>=config_.length_frames)state_.position=0;state_.playing=1;discontinuity(workspace);}}
   else if(c.kind==2){state_.position=c.frame;discontinuity(workspace);}
   else if(c.kind==3){auto& ds=state_.devices[c.track];ds.base[c.param]=c.value;if(!ds.owned[c.param])parameter(workspace,c.track,c.param,c.value);}
   else if(c.kind==4){auto& ts=state_.tracks[c.track].mixer;ts.gain=c.value;ts.mute=c.mute;ts.solo=c.solo;}
   else if(c.kind==5)state_.devices[c.track].bypassed=c.mute;
   else if(c.kind==7||c.kind==8)apply_master(c);
  }tail_.store(tail,std::memory_order_release);state_.peak_left=state_.peak_right=0;for(auto& ts:state_.tracks)ts.mixer.peak_left=ts.mixer.peak_right=0;
 }
 void device_stopped(CanvasWorkspace& workspace)noexcept{stop();master_quiescent_=true;begin(workspace);publish(workspace);master_quiescent_=false;}
 void dispatch_event(CanvasWorkspace& workspace,const AliveSessionEventV2& event)noexcept{
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
   if(mode_==Mode::Workspaces&&alive_session_test_dispatch)alive_session_test_dispatch(state_.absolute_frame,resolved_[event.track].source,resolved_[event.track].occurrence,event);
#endif
   if(event.kind==ALIVE_SESSION_AUTOMATION)parameter(workspace,event.device,event.target,event.value);
   else{const auto& device=config_.devices[event.device];CanvasMessage message{};unsigned inlet=0;
    if(event.kind==ALIVE_SESSION_SUSTAIN){inlet=1;message.count=1;message.values[0]=event.value;}else{message.count=2;message.values[0]=event.target;message.values[1]=event.value;}
    auto discard=[](alive::Event){return true;};workspace.event(device.document,device.revision,device.note_node,inlet,message,0,discard);
   }
 }
 void sample(CanvasWorkspace& workspace)noexcept{
  if(mode_!=Mode::Legacy){sample_v3(workspace);return;}
  if(!state_.playing)return;
  while(next_event_<config_.event_count&&config_.events[next_event_].frame==state_.position){const auto& event=config_.events[next_event_++];
   dispatch_event(workspace,event);
  }
 }
 std::array<double,2> mix(unsigned document,const std::array<double,2>& signal)noexcept{
  bool solo=false;for(unsigned t=0;t<config_.track_count;++t)solo|=state_.tracks[t].mixer.solo;
  for(unsigned t=0;t<config_.track_count;++t)if(config_.devices[config_.tracks[t].instrument].document==document){auto& ts=state_.tracks[t].mixer;
   if(!state_.playing||(mode_!=Mode::Legacy&&state_.tracks[t].active_clip==ALIVE_SESSION_V3_NONE)||ts.mute||(solo&&!ts.solo))return {};
   const std::array<double,2> output{signal[0]*ts.gain,signal[1]*ts.gain};
   if(std::isfinite(output[0]))ts.peak_left=std::max(ts.peak_left,std::abs(output[0]));
   if(std::isfinite(output[1]))ts.peak_right=std::max(ts.peak_right,std::abs(output[1]));
   return output;
  }return signal;
 }
 template<class Emit> std::array<double,2> render_sample(CanvasWorkspace& workspace,const std::array<float,alive::DocumentDevices>& voices,unsigned next_offset,Emit& emit)noexcept{
  std::array<double,2> sum{};
  for(unsigned t=0;t<config_.track_count;++t){const auto& track=config_.tracks[t];const auto& instrument=config_.devices[track.instrument];const unsigned doc=instrument.document;
   // AudioIn readers share one per-instance bundle; instruments receive zero.
   auto signal=workspace.runtime(doc).signal_sample(voices[doc*2],voices[doc*2+1],next_offset,emit,true,{});
   for(unsigned i=0;i<track.effect_count;++i){const unsigned d=track.effects[i];const auto& effect=config_.devices[d];
    const auto wet=workspace.runtime(effect.document).signal_sample(voices[effect.document*2],voices[effect.document*2+1],next_offset,emit,true,signal);
    if(!state_.devices[d].bypassed)signal=wet;
   }
   const auto endpoint=mix(doc,signal);sum[0]+=endpoint[0];sum[1]+=endpoint[1];
  }
  if(master_ramp_){const unsigned step=65-master_ramp_;master_.current_gain=master_from_+(master_.target_gain-master_from_)*double(step)/64.;--master_ramp_;}
  else master_.current_gain=master_.target_gain;
  sum[0]*=master_.current_gain;sum[1]*=master_.current_gain;
  if(std::isfinite(sum[0])){
   if(std::abs(sum[0])>1.)master_.clip_mask|=1;
  }
  if(std::isfinite(sum[1])){
   if(std::abs(sum[1])>1.)master_.clip_mask|=2;
  }
  return sum;
 }
 void observe_master(const std::array<double,2>& sample)noexcept{
  if(std::isfinite(sample[0]))master_.peak_left=std::max(master_.peak_left,std::abs(sample[0]));
  if(std::isfinite(sample[1]))master_.peak_right=std::max(master_.peak_right,std::abs(sample[1]));
 }
 void advance(CanvasWorkspace& workspace,double left,double right)noexcept{
  ++state_.absolute_frame;master_.observation_end_frame=state_.absolute_frame;state_.peak_left=std::max(state_.peak_left,std::abs(left));state_.peak_right=std::max(state_.peak_right,std::abs(right));if(mode_!=Mode::Legacy){advance_v3(workspace);return;}if(!state_.playing)return;
  ++state_.position;if(config_.loop_enabled&&state_.position>=config_.loop_end){state_.position=config_.loop_start;discontinuity(workspace);}
  else if(state_.position>=config_.length_frames){state_.playing=0;discontinuity(workspace);}
 }
 void publish(const CanvasWorkspace& workspace)noexcept{
  state_.version=3;state_.struct_bytes=sizeof state_;state_.rejected=rejected_.load();if(mode_!=Mode::Legacy){state_.requested_stop_epoch=stop_epoch_.load();state_.applied_stop_epoch=applied_stop_;}for(unsigned t=0;t<config_.track_count;++t)state_.tracks[t].mixer.active_voices=workspace.runtime(config_.devices[config_.tracks[t].instrument].document).active_voice_count();
  if(mode_==Mode::Workspaces){const auto projected=project_v4();publish_wire(projected);}
  else publish_wire(state_);
 }
 template<class T> void publish_wire(const T& value)noexcept{
  publication_.fetch_add(1);
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
  if(alive_session_test_publication)alive_session_test_publication();
#endif
  for(unsigned i=0;i<sizeof(T)/8;++i){uint64_t word;std::memcpy(&word,reinterpret_cast<const char*>(&value)+i*8,8);published_[i].store(word);}
  for(unsigned i=0;i<sizeof(master_)/8;++i){uint64_t word;std::memcpy(&word,reinterpret_cast<const char*>(&master_)+i*8,8);published_master_[i].store(word);}
  publication_.fetch_add(1);
 }
 template<class T> bool coherent_wire(T& result,unsigned version)const noexcept{
  for(unsigned attempt=0;attempt<4;++attempt){
   const auto before=publication_.load();if(before&1)continue;
   const uint64_t header=published_[0].load();uint32_t fields[2];std::memcpy(fields,&header,8);
   if(fields[0]!=version||fields[1]!=sizeof(T)){if(before==publication_.load())return false;continue;}
   std::array<uint64_t,sizeof(T)/8> words{};words[0]=header;
   for(unsigned i=1;i<words.size();++i)words[i]=published_[i].load();
   if(before==publication_.load()){std::memcpy(&result,words.data(),sizeof result);result.rejected=rejected_.load();return true;}
  }return false;
 }
 bool coherent(AliveSessionStateV3& result)const noexcept{return coherent_wire(result,3);}
 template<class T> int master_snapshot_wire(T& score,AliveMasterStateV1& master,unsigned version)const noexcept{
  for(unsigned attempt=0;attempt<4;++attempt){
   const auto before=publication_.load();if(before&1)continue;
   std::array<uint64_t,sizeof(T)/8> words{};
   for(unsigned i=0;i<words.size();++i)words[i]=published_[i].load();
   std::array<uint64_t,sizeof(AliveMasterStateV1)/8> mw{};
   for(unsigned i=0;i<mw.size();++i)mw[i]=published_master_[i].load();
   if(before!=publication_.load())continue;
   T value{};AliveMasterStateV1 observation{};std::memcpy(&value,words.data(),sizeof value);std::memcpy(&observation,mw.data(),sizeof observation);
   if(!value.configured)return ALIVE_MASTER_UNCONFIGURED;
   if(value.version!=version||value.struct_bytes!=sizeof value)return ALIVE_MASTER_UNSUPPORTED;
   value.rejected=rejected_.load();
   score=value;master=observation;return ALIVE_MASTER_OK;
  }return ALIVE_MASTER_BUSY;
 }
 int master_snapshot(AliveSessionStateV2& score,AliveMasterStateV1& master)const noexcept{
  AliveSessionStateV3 value{};AliveMasterStateV1 observation{};const int result=master_snapshot_wire(value,observation,3);
  if(result!=ALIVE_MASTER_OK)return result;
  if(value.profile||!project_v2(value,score))return ALIVE_MASTER_UNSUPPORTED;
  master=observation;return ALIVE_MASTER_OK;
 }
 int master_snapshot(AliveSessionStateV3& score,AliveMasterStateV1& master)const noexcept{
  AliveSessionStateV3 value{};AliveMasterStateV1 observation{};const int result=master_snapshot_wire(value,observation,3);
  if(result!=ALIVE_MASTER_OK)return result;
  if(!value.profile)return ALIVE_MASTER_UNSUPPORTED;
  for(auto& receipt:value.receipts){receipt.version=3;receipt.struct_bytes=sizeof receipt;}
  score=value;master=observation;return ALIVE_MASTER_OK;
 }
 int master_snapshot(AliveSessionStateV4& score,AliveMasterStateV1& master)const noexcept{return master_snapshot_wire(score,master,4);}
 bool receipt_available(unsigned cell,uint64_t preparation,uint64_t serial,unsigned version)const noexcept{
  for(unsigned attempt=0;attempt<4;++attempt){
   const auto before=publication_.load();if(before&1)continue;
   const uint64_t header=published_[0].load();uint32_t fields[2];std::memcpy(fields,&header,8);
   if(fields[0]!=version){if(before==publication_.load())return false;continue;}
   const size_t revision_offset=version==4?offsetof(AliveSessionStateV4,preparation_revision):offsetof(AliveSessionStateV3,preparation_revision);
   const size_t receipt_offset=version==4?offsetof(AliveSessionStateV4,receipts):offsetof(AliveSessionStateV3,receipts);
   const uint64_t revision=published_[revision_offset/8].load();
   const size_t stride=version==4?sizeof(AliveSessionReceiptV4):sizeof(AliveSessionReceiptV3);
   const size_t serial_offset=version==4?offsetof(AliveSessionReceiptV4,request_serial):offsetof(AliveSessionReceiptV3,request_serial);
   const size_t status_offset=version==4?offsetof(AliveSessionReceiptV4,status):offsetof(AliveSessionReceiptV3,status);
   const size_t cell_offset=receipt_offset+cell*stride;
   const uint64_t identity=published_[(cell_offset+serial_offset)/8].load();
   const uint64_t status_word=published_[(cell_offset+status_offset)/8].load();
   uint32_t status;std::memcpy(&status,&status_word,sizeof status);
   if(before==publication_.load())return revision==preparation&&identity==serial&&terminal(status);
  }return false;
 }
 static bool project_v2(const AliveSessionStateV3& value,AliveSessionStateV2& result)noexcept{
  if(result.version!=2||result.struct_bytes!=sizeof result||value.track_count>2||value.device_count>6)return false;
  AliveSessionStateV2 projected{};projected.version=2;projected.struct_bytes=sizeof projected;
  projected.absolute_frame=value.absolute_frame;projected.position=value.position;projected.generation=value.generation;projected.rejected=value.rejected;
  projected.configured=value.configured;projected.playing=value.playing;projected.track_count=value.track_count;projected.device_count=value.device_count;
  projected.peak_left=value.peak_left;projected.peak_right=value.peak_right;
  for(unsigned t=0;t<value.track_count;++t)projected.tracks[t]=value.tracks[t].mixer;
  std::copy_n(value.devices,value.device_count,projected.devices);result=projected;return true;
 }
 bool snapshot_v2(AliveSessionStateV2& result)const noexcept{
  if(result.version!=2||result.struct_bytes!=sizeof result)return false;
  AliveSessionStateV3 value{};return coherent(value)&&project_v2(value,result);
 }
 bool snapshot(AliveSessionState& result)const noexcept{
  AliveSessionStateV2 coherent{};coherent.version=2;coherent.struct_bytes=sizeof coherent;if(!snapshot_v2(coherent))return false;
  result={};result.absolute_frame=coherent.absolute_frame;result.position=coherent.position;result.generation=coherent.generation;result.rejected=coherent.rejected;
  result.configured=coherent.configured;result.playing=coherent.playing;result.track_count=coherent.track_count;result.peak_left=coherent.peak_left;result.peak_right=coherent.peak_right;
  for(unsigned t=0;t<coherent.track_count;++t){auto& tr=result.tracks[t];const auto& ts=coherent.tracks[t];const auto& ds=coherent.devices[config_.tracks[t].instrument];
   tr.peak_left=ts.peak_left;tr.peak_right=ts.peak_right;tr.gain=ts.gain;tr.mute=ts.mute;tr.solo=ts.solo;tr.active_voices=ts.active_voices;
   std::memcpy(tr.base,ds.base,sizeof tr.base);std::memcpy(tr.effective,ds.effective,sizeof tr.effective);std::memcpy(tr.owned,ds.owned,sizeof tr.owned);
  }return true;
 }
#include "alive_session_clips.hpp"
#include "alive_session_workspaces.hpp"
};
}
