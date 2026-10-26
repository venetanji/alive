#include "backend.h"
#include "sequence.hpp"
#include "canvas_workspace.hpp"
#include "alive_session.hpp"
#include "../../core/engine.hpp"
#include <atomic>
#include <array>
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <chrono>
#include <limits>
#if defined(__linux__)
#include <dlfcn.h>
#endif
#include <string>
#include <vector>
// ABI declarations from JACK2 1.9.22 jack.h/types.h/midiport.h (LGPL-2.1-or-later).
// Dynamic loading permits a useful missing-backend diagnostic without libjack installed.
using Frames=uint32_t; struct jack_client_t; struct jack_port_t;
struct LatencyRange {Frames min,max;};
struct MidiEvent {Frames time; size_t size; unsigned char* buffer;};
namespace {
struct Jack {
 void* lib=nullptr; jack_client_t* client=nullptr; jack_port_t *l=nullptr,*r=nullptr,*midi=nullptr;
 jack_client_t* (*client_open)(const char*,unsigned,unsigned*,...)=nullptr;
 int (*client_close)(jack_client_t*)=nullptr; int (*activate)(jack_client_t*)=nullptr; int (*deactivate)(jack_client_t*)=nullptr;
 Frames (*get_sample_rate)(jack_client_t*)=nullptr; Frames (*get_buffer_size)(jack_client_t*)=nullptr;
 int (*set_process_callback)(jack_client_t*,int(*)(Frames,void*),void*)=nullptr;
 int (*set_xrun_callback)(jack_client_t*,int(*)(void*),void*)=nullptr;
 int (*set_sample_rate_callback)(jack_client_t*,int(*)(Frames,void*),void*)=nullptr;
 int (*set_latency_callback)(jack_client_t*,void(*)(unsigned,void*),void*)=nullptr;
 void (*port_get_latency_range)(jack_port_t*,unsigned,LatencyRange*)=nullptr;
 void (*port_set_latency_range)(jack_port_t*,unsigned,LatencyRange*)=nullptr;
 void (*on_shutdown)(jack_client_t*,void(*)(void*),void*)=nullptr;
 jack_port_t* (*port_register)(jack_client_t*,const char*,const char*,unsigned long,unsigned long)=nullptr;
 void* (*port_get_buffer)(jack_port_t*,Frames)=nullptr;
 uint32_t (*midi_get_event_count)(void*)=nullptr; int (*midi_event_get)(MidiEvent*,void*,uint32_t)=nullptr;
 const char** (*get_ports)(jack_client_t*,const char*,const char*,unsigned long)=nullptr;
 const char* (*port_name)(const jack_port_t*)=nullptr;
 int (*connect)(jack_client_t*,const char*,const char*)=nullptr; void (*free_fn)(void*)=nullptr;
 void close_library(){
#if defined(__linux__)
  if(lib)dlclose(lib);
#endif
  lib=nullptr;
 }
 bool load(){
#if defined(__linux__)
  lib=dlopen("libjack.so.0",RTLD_NOW|RTLD_LOCAL);if(!lib)return false;
#define SYM(field,name) field=reinterpret_cast<decltype(field)>(dlsym(lib,name));if(!field)return false
  SYM(client_open,"jack_client_open"); SYM(client_close,"jack_client_close"); SYM(activate,"jack_activate"); SYM(deactivate,"jack_deactivate");
  SYM(get_sample_rate,"jack_get_sample_rate"); SYM(get_buffer_size,"jack_get_buffer_size"); SYM(set_process_callback,"jack_set_process_callback");
  SYM(set_xrun_callback,"jack_set_xrun_callback"); SYM(set_sample_rate_callback,"jack_set_sample_rate_callback"); SYM(on_shutdown,"jack_on_shutdown");
  SYM(set_latency_callback,"jack_set_latency_callback");SYM(port_get_latency_range,"jack_port_get_latency_range");SYM(port_set_latency_range,"jack_port_set_latency_range");
  SYM(port_register,"jack_port_register"); SYM(port_get_buffer,"jack_port_get_buffer"); SYM(midi_get_event_count,"jack_midi_get_event_count"); SYM(midi_event_get,"jack_midi_event_get");
  SYM(get_ports,"jack_get_ports"); SYM(port_name,"jack_port_name"); SYM(connect,"jack_connect"); SYM(free_fn,"jack_free");
#undef SYM
  return true;
#else
  // Desktop audio uses Rust/CPAL. The optional JACK diagnostic is Linux-only.
  return false;
#endif
 }
} jack;
alive::Engine engine; const char* error="Audio is stopped.";
std::atomic<unsigned> routes{0},fault_reason{0};
std::atomic<bool> running{false},lost{false}; std::atomic<unsigned> period{0},xruns{0};
enum class ControlKind { Event, Route, Sequence, CanvasInstall, CanvasEvent, CanvasTab, CanvasMessageText, CanvasParam, CanvasParamHot, CanvasStop, CanvasClose, CanvasStopAll };
struct Control {
 alive::Event event{}; unsigned mask=0; ControlKind kind=ControlKind::Event; UltraSequenceConfig sequence{};
 ultra::CanvasPlan canvas{};uint32_t document=0;uint64_t revision=0;uint32_t node=0,inlet=0,param=0;ultra::CanvasMessage message{};double value=0;
 ultra::CanvasMessageTemplate message_template{};uint64_t text_edit_serial=0,stop_epoch=0;
};
constexpr unsigned MaxDocuments=ultra::CanvasWorkspace::MaxDocuments;
std::array<ultra::CanvasPlan,MaxDocuments> admitted_canvas{}; // Serialized control-thread ownership.
std::array<uint64_t,MaxDocuments> admitted_message_serial{};
// Out-of-band, coalescing safety mailbox. Never competes with the edit FIFO.
std::array<std::atomic<uint64_t>,MaxDocuments> document_stop_epoch{};
std::atomic<unsigned> document_stop_group{0};
std::array<uint64_t,MaxDocuments> applied_stop_epoch{}; // Callback owner.
static_assert(MaxDocuments<32);
void request_documents_stop(unsigned mask){
 for(unsigned d=0;d<MaxDocuments;++d)if(mask&(1u<<d))document_stop_epoch[d].fetch_add(1,std::memory_order_release);
 // Reassert the whole group if a callback observed only some epoch increments.
 document_stop_group.fetch_or(mask,std::memory_order_release);
}
void request_document_stop(unsigned document){request_documents_stop(1u<<document);}
bool document_action(ControlKind kind){return kind==ControlKind::CanvasEvent||kind==ControlKind::CanvasTab||kind==ControlKind::CanvasParamHot;}

std::array<uint64_t,MaxDocuments> closed_console_revision{};
ultra::CanvasWorkspace canvas; // One callback owner across independent document slots.
ultra::AliveSession session;
using CanvasClock=std::chrono::steady_clock;
auto canvas_idle_mark=CanvasClock::now();
double canvas_idle_fraction=0;
std::array<std::atomic<bool>,MaxDocuments> requested_documents{};
std::atomic<bool> canvas_requested{false};bool callback_canvas=false;
unsigned canvas_silence=0;
std::array<unsigned,MaxDocuments> document_silence{};
struct PublishedCanvasNode {std::atomic<uint32_t> id{0};std::atomic<uint64_t> value{0},pulses{0};};
struct PublishedCanvas {
 std::array<PublishedCanvasNode,32> nodes{};
 std::atomic<uint64_t> generation{0},revision{0};
 std::atomic<unsigned> count{0},active{0};
};
std::array<PublishedCanvas,MaxDocuments> published_canvases{};
static_assert(std::atomic<uint64_t>::is_always_lock_free);
static_assert(sizeof(UltraCanvasMessageBoxObservation)==440);
struct PublishedMessageBoxes {
 std::atomic<uint64_t> generation{0},revision{0},serial{0},count{0};
 std::array<std::array<std::atomic<uint64_t>,55>,32> words{};
 // Only the runtime writer accesses this cache.
 uint64_t last_revision=0,last_serial=0;unsigned last_count=0;
 std::array<uint64_t,32> last_generations{};
};
std::array<PublishedMessageBoxes,MaxDocuments> published_message_boxes{};
void publish_message_boxes(unsigned document){
 if(document>=MaxDocuments)return;
 auto& published=published_message_boxes[document];const auto& runtime=canvas.runtime(document);const auto& plan=runtime.plan();
 std::array<unsigned,32> slots{};unsigned count=0;
 if(canvas.live(document))for(unsigned i=0;i<plan.graph.node_count;++i)if(plan.graph.nodes[i].kind==ultra::MessageBox)slots[count++]=i;
 const bool reset=published.last_revision!=plan.graph.revision||published.last_count!=count;
 bool dirty=reset||published.last_serial!=runtime.text_edit_serial();
 for(unsigned i=0;i<count;++i)dirty|=published.last_generations[i]!=runtime.message_box(slots[i]).generation;
 if(!dirty)return;
 // Every shared payload word is atomic; sequential order also fences the two
 // generation reads against payload loads in a successful reader snapshot.
 published.generation.fetch_add(1);
 published.revision.store(plan.graph.revision);published.serial.store(runtime.text_edit_serial());published.count.store(count);
 for(unsigned i=0;i<count;++i){
  const auto& box=runtime.message_box(slots[i]);
  if(!reset&&published.last_generations[i]==box.generation)continue;
  UltraCanvasMessageBoxObservation row;std::memset(&row,0,sizeof row);
  row.id=plan.graph.nodes[slots[i]].id;row.flags=box.content.empty;row.generation=box.generation;
  const auto& prototype=box.content.prototype;row.prototype.count=prototype.count;
  for(unsigned a=0;a<8;++a){row.prototype.values[a]=prototype.values[a];row.prototype.tags[a]=prototype.tags[a];std::memcpy(row.prototype.symbols[a],prototype.symbols[a],32);row.placeholders[a]=box.content.placeholders[a];}
  std::memcpy(row.prototype.selector,prototype.selector,32);
  std::array<uint64_t,55> words{};std::memcpy(words.data(),&row,sizeof row);
  for(unsigned w=0;w<words.size();++w)published.words[i][w].store(words[w]);
  published.last_generations[i]=box.generation;
 }
 published.last_revision=plan.graph.revision;published.last_serial=runtime.text_edit_serial();published.last_count=count;
 published.generation.fetch_add(1);
}
uint64_t double_bits(double v){uint64_t bits;std::memcpy(&bits,&v,sizeof bits);return bits;}
static_assert(sizeof(UltraCanvasPrintPopupObservation)==424);
struct PublishedPrintPopups {
 std::atomic<uint64_t> generation{0},revision{0},frame{0},count{0};
 std::array<std::array<std::atomic<uint64_t>,53>,32> words{};
 uint64_t last_revision=0;unsigned last_count=0;
 std::array<uint64_t,32> last_generations{};
};
std::array<PublishedPrintPopups,MaxDocuments> published_print_popups{};
void publish_print_popups(unsigned document){
 auto& published=published_print_popups[document];const auto& runtime=canvas.runtime(document);const auto& plan=runtime.plan();
 std::array<unsigned,32> slots{};unsigned count=0;
 if(canvas.live(document))for(unsigned i=0;i<plan.graph.node_count;++i)if(plan.graph.nodes[i].kind==ultra::Print)slots[count++]=i;
 const bool reset=published.last_revision!=plan.graph.revision||published.last_count!=count;
 // Advance the snapshot clock even when receipt generations are unchanged.
 // Atomic words and sequential generation checks keep concurrent reads coherent.
 published.generation.fetch_add(1);
 published.revision.store(plan.graph.revision);published.frame.store(runtime.frame());published.count.store(count);
 for(unsigned i=0;i<count;++i){
  const auto& popup=runtime.print_popup(slots[i]);
  if(!reset&&published.last_generations[i]==popup.generation)continue;
  UltraCanvasPrintPopupObservation row;std::memset(&row,0,sizeof row);
  row.id=plan.graph.nodes[slots[i]].id;row.enabled=plan.graph.nodes[slots[i]].p1!=0;
  row.has_value=popup.has_value;row.generation=popup.generation;row.frame=popup.frame;row.message=ultra::canvas_message_to_pod(popup.message);
  std::array<uint64_t,53> words{};std::memcpy(words.data(),&row,sizeof row);
  for(unsigned w=0;w<words.size();++w)published.words[i][w].store(words[w]);
  published.last_generations[i]=popup.generation;
 }
 published.last_revision=plan.graph.revision;published.last_count=count;published.generation.fetch_add(1);
}
double bits_double(uint64_t v){double result;std::memcpy(&result,&v,sizeof result);return result;}
void update_canvas_requested(){bool any=false;for(auto& requested:requested_documents)any|=requested.load();canvas_requested=any;}
void clear_canvas_requests(){for(auto& requested:requested_documents)requested=false;canvas_requested=false;}
void publish_canvas(){
 for(unsigned d=0;d<MaxDocuments;++d){
  auto& published=published_canvases[d];const auto& runtime=canvas.runtime(d);const auto& p=runtime.plan();
  published.generation.fetch_add(1,std::memory_order_acq_rel);
  published.revision.store(p.graph.revision,std::memory_order_relaxed);
  const unsigned count=canvas.live(d)?p.graph.node_count:0;
  published.count.store(count,std::memory_order_relaxed);
  published.active.store(callback_canvas&&canvas.live(d)&&!runtime.failed(),std::memory_order_relaxed);
  for(unsigned i=0;i<count;++i){
   published.nodes[i].id.store(p.graph.nodes[i].id,std::memory_order_relaxed);
   published.nodes[i].value.store(double_bits(runtime.value(i)),std::memory_order_relaxed);
   published.nodes[i].pulses.store(runtime.pulses(i),std::memory_order_relaxed);
  }
  published.generation.fetch_add(1,std::memory_order_release);
  publish_message_boxes(d);
  publish_print_popups(d);
 }
}
void reset_canvas_idle_clock(){canvas_idle_mark=CanvasClock::now();canvas_idle_fraction=0;}
void synchronize_canvas_runtime(bool stop_timers){
 auto discard=[](alive::Event){return true;};canvas.begin_callback();
 for(unsigned d=0;d<MaxDocuments;++d){
  if(canvas.runtime(d).failed())canvas.runtime(d).recover();
  if(requested_documents[d].load()){
   if(!canvas.live(d)||canvas.runtime(d).plan().graph.revision!=admitted_canvas[d].graph.revision)canvas.install(d,admitted_canvas[d],0,discard);
  }
  else canvas.close(d,0,discard);
  document_silence[d]=64;
 }
 if(stop_timers)for(unsigned d=0;d<MaxDocuments;++d)canvas.stop(d,0,discard);
 callback_canvas=canvas.any();
}
void configure_canvas_audio(){
 auto emit=[](alive::Event e){return engine.submit_document(e);};
 for(unsigned d=0;d<MaxDocuments;++d)if(canvas.live(d)){
  canvas.runtime(d).audio_started();
  canvas.runtime(d).configure_voices(0,emit);
 }
}
void tick_canvas_idle(){
 if(session.configured())return;
 if(running.load()||engine.status().ready||!canvas_requested.load()||!callback_canvas){reset_canvas_idle_clock();return;}
 const auto now=CanvasClock::now();
 const double elapsed=std::chrono::duration<double>(now-canvas_idle_mark).count();canvas_idle_mark=now;
 const double frames=std::min(elapsed,.1)*48000.+canvas_idle_fraction;
 const auto count=static_cast<unsigned>(frames);canvas_idle_fraction=frames-count;
 auto discard=[](alive::Event){return true;};
 for(unsigned i=0;i<count&&!canvas.failed();++i){if(i%1024==0)canvas.begin_callback();canvas.sample(0,discard);}
 publish_canvas();
}
ultra::Sequencer sequence;
std::atomic<bool> sequence_requested{false},sequence_enabled{false};
std::atomic<unsigned> sequence_step{0},sequence_note{128},sequence_clock_source{0};
std::atomic<uint64_t> sequence_ticks{0};
void publish_sequence(){
 sequence_step.store(sequence.step(),std::memory_order_relaxed);sequence_note.store(sequence.note(),std::memory_order_relaxed);
 sequence_ticks.store(sequence.ticks(),std::memory_order_relaxed);sequence_clock_source.store(sequence.clock_source(),std::memory_order_relaxed);
 sequence_enabled.store(sequence.armed(),std::memory_order_release);
}
static_assert(std::atomic<bool>::is_always_lock_free&&std::atomic<unsigned>::is_always_lock_free&&std::atomic<uint64_t>::is_always_lock_free);

constexpr unsigned ControlCapacity=64;
std::array<Control,ControlCapacity+1> controls{};
std::atomic<unsigned> control_head{0},control_tail{0};
unsigned callback_routes=0; // Callback-owned; initialized only while stopped.
bool queue_control(Control control,bool panic_on_overflow=true){
 // Every queued record carries a bounded document slot, including default 0
 // for non-document controls. Reject broken internal records before indexing.
 if(control.document>=MaxDocuments){engine.panic();return false;}
 auto status=engine.status();if(!status.ready||status.fault)return false;
 const auto head=control_head.load(std::memory_order_relaxed),next=(head+1)%(ControlCapacity+1);
 if(next==control_tail.load(std::memory_order_acquire)){if(panic_on_overflow)engine.panic();return false;}
 if(document_action(control.kind)||control.kind==ControlKind::CanvasInstall||control.kind==ControlKind::CanvasParam)control.stop_epoch=document_stop_epoch[control.document].load(std::memory_order_acquire);
 controls[head]=control;control_head.store(next,std::memory_order_release);return true;
}
void drain_stopped_canvas_controls(){
 // The callback has quiesced. Preserve admitted control edits at the handoff;
 // synth events are discarded because the audio engine is already stopped.
 auto discard=[](alive::Event){return true;};canvas.begin_callback();
 const auto end=control_head.load(std::memory_order_acquire);auto tail=control_tail.load(std::memory_order_relaxed);
 const unsigned stop_group=document_stop_group.exchange(0,std::memory_order_acquire);
 std::array<uint64_t,MaxDocuments> stop_epochs{};
 for(unsigned d=0;d<MaxDocuments;++d){
  stop_epochs[d]=document_stop_epoch[d].load(std::memory_order_acquire);
  if(stop_epochs[d]!=applied_stop_epoch[d]||(stop_group&(1u<<d))){
   canvas.stop(d,0,discard);applied_stop_epoch[d]=stop_epochs[d];document_silence[d]=64;
  }
 }

 for(unsigned i=0;tail!=end&&i<ControlCapacity;++i){
  const auto& control=controls[tail];tail=(tail+1)%(ControlCapacity+1);
  if(control.document>=MaxDocuments){engine.panic();tail=end;break;}
  if(document_action(control.kind)&&control.kind!=ControlKind::CanvasParamHot&&control.stop_epoch!=stop_epochs[control.document])continue;
  if(control.kind==ControlKind::CanvasInstall){canvas.install(control.document,control.canvas,0,discard);if(control.stop_epoch!=stop_epochs[control.document])canvas.stop(control.document,0,discard);}
  else if(control.kind==ControlKind::CanvasEvent)canvas.event(control.document,control.revision,control.node,control.inlet,control.message,0,discard);
  else if(control.kind==ControlKind::CanvasMessageText)canvas.runtime(control.document).message_text(control.revision,control.node,control.text_edit_serial,control.message_template);
  else if(control.kind==ControlKind::CanvasTab)canvas.tab(control.document,control.revision,control.node,0,discard);
  else if(control.kind==ControlKind::CanvasParam||control.kind==ControlKind::CanvasParamHot){
   if(canvas.live(control.document)&&control.revision==canvas.runtime(control.document).plan().graph.revision){
    if(!canvas.runtime(control.document).param(control.canvas,control.node,control.param,control.value,0,discard))canvas.runtime(control.document).fail();
    else if(control.kind==ControlKind::CanvasParamHot&&control.stop_epoch==stop_epochs[control.document])canvas.event(control.document,control.revision,control.node,0,control.message,0,discard);
    if(control.stop_epoch!=stop_epochs[control.document])canvas.stop(control.document,0,discard);
   }
  }else if(control.kind==ControlKind::CanvasStop)canvas.stop(control.document,0,discard);
  else if(control.kind==ControlKind::CanvasClose){canvas.close(control.document,0,discard);canvas.runtime(control.document).reset_console_count();}
  else if(control.kind==ControlKind::CanvasStopAll)for(unsigned d=0;d<MaxDocuments;++d)canvas.stop(d,0,discard);
  else if(control.kind==ControlKind::Route||control.kind==ControlKind::Sequence)
   for(unsigned d=0;d<MaxDocuments;++d)canvas.close(d,0,discard);
 }
 control_tail.store(tail,std::memory_order_release);
}
int render_audio(Frames n,float* l,float* r,bool with_midi){
 period.store(n,std::memory_order_relaxed);
 if(n>1024||lost.load(std::memory_order_relaxed)||engine.status().fault){
  if(n>1024){fault_reason.store(4);engine.panic();}
  sequence.clear();sequence_requested=false;canvas.clear_timers();publish_canvas();publish_sequence();std::fill(l,l+n,0);std::fill(r,r+n,0);return 0;
 }
 unsigned engine_frame=0;
 auto emit=[&](alive::Event e){
  if(e.offset<engine_frame){engine.panic();return false;}
  e.offset-=engine_frame;return engine.submit_document(e);
 };
 // A stale edit must stay logically stopped, but its epoch's physical voice
 // cleanup was already emitted by the mailbox before draining this FIFO.
 auto stopped_edit=[](alive::Event){return true;};
 canvas.begin_callback();
 session.begin(canvas);
 auto leave_canvas=[&]{if(callback_canvas){for(unsigned d=0;d<MaxDocuments;++d)canvas.close(d,0,emit);canvas_silence=64;callback_canvas=false;for(unsigned d=0;d<2;++d)emit({0,uint8_t(d),alive::Kind::Reset,0,0});}};
 auto manual=[&](alive::Event e){
  // A has a single owner while armed. B and A's envelope/level remain independent.
  if(e.device==0){
   if(e.kind==alive::Kind::AllOff||e.kind==alive::Kind::Reset||e.kind==alive::Kind::HardClear){sequence.stop(e.offset,emit);sequence_requested.store(false,std::memory_order_relaxed);}
   else if(sequence.armed()&&(e.kind==alive::Kind::On||e.kind==alive::Kind::Off||e.kind==alive::Kind::Sustain))return;
  }
  emit(e);
 };
 // One FIFO orders route cleanup, sequence replacement and manual UI input.
 // Snapshot once: edits during MIDI acquisition belong to the next callback.
 const auto end=control_head.load(std::memory_order_acquire);auto tail=control_tail.load(std::memory_order_relaxed);
 const unsigned stop_group=document_stop_group.exchange(0,std::memory_order_acquire);
 std::array<uint64_t,MaxDocuments> stop_epochs{};
 for(unsigned d=0;d<MaxDocuments;++d){
  stop_epochs[d]=document_stop_epoch[d].load(std::memory_order_acquire);
  if(stop_epochs[d]!=applied_stop_epoch[d]||(stop_group&(1u<<d))){
   canvas.stop(d,0,emit);applied_stop_epoch[d]=stop_epochs[d];document_silence[d]=64;
  }
 }

 for(unsigned i=0;tail!=end&&i<ControlCapacity;i++){
  const auto control=controls[tail];tail=(tail+1)%(ControlCapacity+1);
  if(control.document>=MaxDocuments){engine.panic();tail=end;break;}
  if(document_action(control.kind)&&control.kind!=ControlKind::CanvasParamHot&&control.stop_epoch!=stop_epochs[control.document])continue;
  if(control.kind==ControlKind::Route){
   leave_canvas();
   if((callback_routes^control.mask)&1)sequence.stop(0,emit);
   for(unsigned d=0;d<2;d++)if((callback_routes&~control.mask)&(1u<<d))emit({0,uint8_t(d),alive::Kind::HardClear,0,0});
   callback_routes=control.mask;
  }else if(control.kind==ControlKind::Sequence){
   leave_canvas();
   sequence.stop(0,emit);
   if(control.sequence.enabled){emit({0,0,alive::Kind::HardClear,0,0});}
   sequence.configure(control.sequence,emit);
  }else if(control.kind==ControlKind::CanvasInstall){
   sequence.stop(0,emit);sequence_requested.store(false,std::memory_order_relaxed);
   if(!canvas.install(control.document,control.canvas,0,emit))engine.panic();
   if(control.stop_epoch!=stop_epochs[control.document])canvas.stop(control.document,0,stopped_edit);
   callback_canvas=canvas.any();document_silence[control.document]=64;
  }else if(control.kind==ControlKind::CanvasEvent){
   if(canvas.live(control.document)&&control.revision==canvas.runtime(control.document).plan().graph.revision)
    canvas.event(control.document,control.revision,control.node,control.inlet,control.message,0,emit);
  }else if(control.kind==ControlKind::CanvasMessageText){
   canvas.runtime(control.document).message_text(control.revision,control.node,control.text_edit_serial,control.message_template);
  }else if(control.kind==ControlKind::CanvasTab){
   canvas.tab(control.document,control.revision,control.node,0,emit);
  }else if(control.kind==ControlKind::CanvasParam||control.kind==ControlKind::CanvasParamHot){
   if(canvas.live(control.document)&&control.revision==canvas.runtime(control.document).plan().graph.revision){
    if(!canvas.runtime(control.document).param(control.canvas,control.node,control.param,control.value,0,emit))canvas.runtime(control.document).fail();
    else if(control.kind==ControlKind::CanvasParamHot&&control.stop_epoch==stop_epochs[control.document])canvas.event(control.document,control.revision,control.node,0,control.message,0,emit);
    if(control.stop_epoch!=stop_epochs[control.document])canvas.stop(control.document,0,stopped_edit);
   }
  }else if(control.kind==ControlKind::CanvasStop){
   canvas.stop(control.document,0,emit);document_silence[control.document]=64;
  }else if(control.kind==ControlKind::CanvasClose){
   canvas.close(control.document,0,emit);canvas.runtime(control.document).reset_console_count();
   document_silence[control.document]=64;callback_canvas=canvas.any();
   if(!callback_canvas)canvas_silence=64;
  }else if(control.kind==ControlKind::CanvasStopAll){
   for(unsigned d=0;d<MaxDocuments;++d){canvas.stop(d,0,emit);document_silence[d]=64;}
  }else if(!callback_canvas)manual(control.event);
  if(canvas.failed()){engine.panic();break;}
 }
 control_tail.store(tail,std::memory_order_release);
 const unsigned mask=callback_routes;
 struct Input {unsigned time,size;std::array<unsigned char,3> data;};
 std::array<Input,128> input{};unsigned admitted=0;
 void* buffer=with_midi?jack.port_get_buffer(jack.midi,n):nullptr;uint32_t count=buffer?jack.midi_get_event_count(buffer):0;
 if(count>input.size()){fault_reason.store(3);engine.panic();count=0;}
 for(uint32_t i=0;i<count;i++){
  MidiEvent e{};if(jack.midi_event_get(&e,buffer,i)||!e.buffer||e.size<1||e.time>=n)continue;
  const auto status=e.buffer[0];
  if(e.size!=1&&e.size!=3)continue;
  if(admitted&&e.time<input[admitted-1].time){engine.panic();break;}
  Input item{e.time,unsigned(e.size),{status,0,0}};
  if(e.size==3){item.data[1]=e.buffer[1];item.data[2]=e.buffer[2];}
  input[admitted++]=item;
 }
 // Merge external clock/transport and musical events on the audio timeline.
 // At most 1024 samples and 128 MIDI records, never an unbounded catch-up loop.
 std::array<float,alive::DocumentDevices> voice_frame{};
 std::array<float*,alive::DocumentDevices> voice_buses{};
 for(unsigned d=0;d<voice_buses.size();++d)voice_buses[d]=&voice_frame[d];
 if(callback_canvas){std::fill(l,l+n,0.f);std::fill(r,r+n,0.f);}
 unsigned next=0;
 for(unsigned frame=0;frame<n&&!engine.status().fault;frame++){
  if(callback_canvas)engine_frame=frame;
  session.sample(canvas);
  while(next<admitted&&input[next].time==frame){
   const auto& e=input[next++];const auto status=e.data[0];
   if(callback_canvas){
    const unsigned channel=(status&15)+1,cmd=status&0xf0;
    if(e.size==3&&(cmd==0x90||cmd==0x80)){
     if(e.data[1]>127||e.data[2]>127){engine.panic();break;}
     for(unsigned d=0;d<MaxDocuments;++d)if(canvas.live(d)&&!session.hosted(d))canvas.runtime(d).midi_input(channel,e.data[1],cmd==0x80?0:e.data[2],frame,emit);
    }
    continue;
   }
   if(e.size==1&&(status==0xf8||status==0xfa||status==0xfb||status==0xfc)){sequence.midi(status,frame,emit);continue;}
   const unsigned channel=status&15,cmd=status&0xf0;
   if(e.size!=3||channel>1||!(mask&(1u<<channel)))continue;
   alive::Event event{};event.device=channel;event.offset=frame;event.note=e.data[1];event.value=e.data[2];
   if((cmd==0x90||cmd==0x80)){event.kind=cmd==0x90?alive::Kind::On:alive::Kind::Off;}
   else if(cmd==0xb0){event.note=0;if(e.data[1]==64)event.kind=alive::Kind::Sustain;else if(e.data[1]==123)event.kind=alive::Kind::AllOff;else if(e.data[1]==120)event.kind=alive::Kind::HardClear;else continue;}
   else continue;
   if(e.data[1]>127||e.data[2]>127){engine.panic();break;}manual(event);
  }
  if(callback_canvas){
   if(!canvas.sample(frame,emit)){engine.panic();break;}
   engine.render_devices({voice_buses.data(),unsigned(voice_buses.size())},nullptr,1);
   // Signal observations can emit controls for the next engine input sample.
   engine_frame=frame+1;
   const auto hosted=session.render_sample(canvas,voice_frame,frame+1,emit);
   double left=hosted[0],right=hosted[1];
   for(unsigned d=0;d<MaxDocuments;++d)if(canvas.live(d)&&!session.hosted(d)){
    const auto signal=canvas.runtime(d).signal_sample(voice_frame[d*2],voice_frame[d*2+1],frame+1,emit,true);
    if(!document_silence[d]){left+=signal[0];right+=signal[1];}
    else --document_silence[d];
   }
   // Finish every document's signal frame before delivering sampled controls.
   for(unsigned d=0;d<MaxDocuments;++d)if(canvas.live(d))
    if(!canvas.runtime(d).flush_signal_events(frame+1,emit))break;
   if(canvas.failed()||!std::isfinite(left)||!std::isfinite(right)||std::abs(left)>std::numeric_limits<float>::max()||std::abs(right)>std::numeric_limits<float>::max()){
    engine.panic();break;
   }
   l[frame]=float(left);r[frame]=float(right);
   session.advance(canvas,left,right);
  }else {sequence.sample(frame,emit);session.advance(canvas,0,0);}
 }
 if(callback_canvas){
  if(engine.status().fault){std::fill(l,l+n,0.f);std::fill(r,r+n,0.f);}
 }else{
  float* channels[]={l,r};engine.render_bus({channels,2},nullptr,n);
  const unsigned mute=std::min(canvas_silence,n);std::fill(l,l+mute,0.f);std::fill(r,r+mute,0.f);canvas_silence-=mute;
  if(!(mask&1))std::fill(l,l+n,0.f);
  if(!(mask&2))std::fill(r,r+n,0.f);
 }
 if(engine.status().fault){sequence.clear();sequence_requested.store(false,std::memory_order_relaxed);canvas.clear_timers();}
 publish_canvas();publish_sequence();session.publish(canvas);return 0;
}
int process(Frames n,void*){
 auto* l=static_cast<float*>(jack.port_get_buffer(jack.l,n));auto* r=static_cast<float*>(jack.port_get_buffer(jack.r,n));
 if(!l||!r)return 0;
 return render_audio(n,l,r,true);
}
void latency(unsigned mode,void*){
 LatencyRange range{};
 if(mode==0){jack.port_get_latency_range(jack.midi,mode,&range);range.min+=64;range.max+=64;jack.port_set_latency_range(jack.l,mode,&range);jack.port_set_latency_range(jack.r,mode,&range);}
 else{LatencyRange a{},b{};jack.port_get_latency_range(jack.l,mode,&a);jack.port_get_latency_range(jack.r,mode,&b);range={std::min(a.min,b.min)+64,std::max(a.max,b.max)+64};jack.port_set_latency_range(jack.midi,mode,&range);}
}
void shutdown(void*){fault_reason.store(2);lost.store(true);running.store(false);engine.panic();}
int xrun(void*){xruns.fetch_add(1,std::memory_order_relaxed);return 0;}
int rate(Frames n,void*){if(n!=48000){fault_reason.store(5);lost.store(true);engine.panic();}return 0;}
void put16(FILE*f,uint16_t n){unsigned char b[]={static_cast<unsigned char>(n),static_cast<unsigned char>(n>>8)};fwrite(b,1,2,f);}
void put32(FILE*f,uint32_t n){put16(f,n);put16(f,n>>16);}
}
extern "C" {
int alive_session_validate_v2(const AliveSessionConfigV2* config){return config&&session.validate_v2(*config);}
int alive_session_validate_device_v2(const AliveSessionDeviceV2* device,const UltraCanvasGraph* graph){return device&&graph&&session.validate_device_v2(*device,*graph);}
int alive_session_validate_prepared_v2(const AliveSessionConfigV2* config,const UltraCanvasGraph* graphs,uint32_t count){return config&&session.validate_prepared_v2(*config,graphs,count);}
int alive_session_configure_v2(const AliveSessionConfigV2* config){
 if(running.load()||engine.status().ready||!config)return 0;
 const int result=session.configure_v2(*config,canvas);publish_canvas();return result;
}
int alive_session_base_v2(uint32_t document,uint64_t revision,uint32_t parameter,double value){const int result=session.base_v2(document,revision,parameter,value);if(result&&!running.load()&&!engine.status().ready){session.begin(canvas);session.publish(canvas);publish_canvas();}return result;}
int alive_session_bypass_v2(uint32_t document,uint64_t revision,uint32_t bypassed){const int result=session.bypass_v2(document,revision,bypassed);if(result&&!running.load()&&!engine.status().ready){session.begin(canvas);session.publish(canvas);}return result;}
int alive_session_state_v2(AliveSessionStateV2* state){return state&&session.snapshot_v2(*state);}
int alive_session_limits_v3(uint32_t profile,AliveSessionLimitsV3* limits){return limits&&session.limits_v3(profile,*limits);}
int alive_session_validate_v3(const AliveSessionConfigV3* config){return config&&session.validate_v3(*config);}
int alive_session_validate_prepared_v3(const AliveSessionConfigV3* config,const UltraCanvasGraph* graphs,uint32_t count){return config&&session.validate_prepared_v3(*config,graphs,count);}
int alive_session_configure_v3(const AliveSessionConfigV3* config){
 if(!config||running.load()||engine.status().ready)return 0;
 const int result=session.configure_v3(*config,canvas);publish_canvas();return result;
}
int alive_session_request_v3(const AliveSessionRequestV3* request,AliveSessionReceiptV3* immediate){const AliveSessionRequestV3 invalid{};return immediate&&session.request_v3(request?*request:invalid,*immediate);}
uint64_t alive_session_stop_v3(){const auto epoch=session.stop();if(!running.load()&&!engine.status().ready){session.begin(canvas);session.publish(canvas);publish_canvas();}return epoch;}
int alive_session_state_v3(AliveSessionStateV3* state){return state&&session.snapshot_v3(*state);}
int alive_session_diagnostic_v3(AliveSessionDiagnosticV3* diagnostic){return diagnostic&&session.diagnostic_v3(*diagnostic);}
int alive_session_limits_v4(uint32_t profile,AliveSessionLimitsV4* out){return out&&session.limits_v4(profile,*out);}
int alive_session_validate_v4(const AliveSessionConfigV4* config){return config&&session.validate_v4(*config);}
int alive_session_validate_prepared_v4(const AliveSessionConfigV4* config,const UltraCanvasGraph* graphs,uint32_t count,const AliveSessionAudioBufferV4* audio,uint32_t audio_count){return config&&session.validate_prepared_v4(*config,graphs,count,audio,audio_count);}
int alive_session_configure_v4(const AliveSessionConfigV4* config,const AliveSessionAudioBufferV4* audio,uint32_t count){
 if(!config||running.load()||engine.status().ready)return 0;
 const int result=session.configure_v4(*config,audio,count,canvas);publish_canvas();return result;
}
int alive_session_request_v4(const AliveSessionRequestV4* request,AliveSessionReceiptV4* immediate){const AliveSessionRequestV4 invalid{};return immediate&&session.request_v4(request?*request:invalid,*immediate);}
uint64_t alive_session_stop_v4(){return alive_session_stop_v3();}
int alive_session_state_v4(AliveSessionStateV4* state){return state&&session.snapshot_v4(*state);}
int alive_session_diagnostic_v4(AliveSessionDiagnosticV4* diagnostic){return diagnostic&&session.diagnostic_v4(*diagnostic);}
int alive_session_validate(const AliveSessionConfig* config){return config&&session.validate(*config);}
int alive_session_validate_graph(const AliveSessionTrack* track,const UltraCanvasGraph* graph){return track&&graph&&session.validate_graph(*track,*graph);}
int alive_session_validate_prepared(const AliveSessionConfig* config,const UltraCanvasGraph* graphs,uint32_t count){return config&&session.validate_prepared(*config,graphs,count);}
int alive_session_configure(const AliveSessionConfig* config){
 if(running.load()||engine.status().ready||!config)return 0;
 const int result=session.configure(*config,canvas);publish_canvas();return result;
}
int alive_session_reset(){if(running.load()||engine.status().ready)return 0;session.reset(canvas);publish_canvas();return 1;}
int alive_session_start(){return running.load()&&session.start();}
void alive_session_stop(){session.stop();if(!running.load()&&!engine.status().ready){session.begin(canvas);session.publish(canvas);publish_canvas();}}
int alive_session_seek(uint64_t position){const int result=session.seek(position);if(result&&!running.load()&&!engine.status().ready){session.begin(canvas);session.publish(canvas);publish_canvas();}return result;}
int alive_session_base(uint32_t track,uint32_t parameter,double value){const int result=session.base(track,parameter,value);if(result&&!running.load()&&!engine.status().ready){session.begin(canvas);session.publish(canvas);publish_canvas();}return result;}
int alive_session_mixer(uint32_t track,double gain,uint32_t mute,uint32_t solo){const int result=session.mixer(track,gain,mute,solo);if(result&&!running.load()&&!engine.status().ready){session.begin(canvas);session.publish(canvas);}return result;}
int alive_session_state(AliveSessionState* state){return state&&session.snapshot(*state);}
const char* alive_session_error(){return session.error();}
static void stop_audio_impl(bool stop_timers){
 if(!running.load()&&!engine.status().ready)tick_canvas_idle();
 running.store(false);if(jack.client){jack.deactivate(jack.client);jack.client_close(jack.client);jack.client=nullptr;}
 engine.shutdown();drain_stopped_canvas_controls();sequence.clear();publish_sequence();synchronize_canvas_runtime(stop_timers);reset_canvas_idle_clock();publish_canvas();sequence_requested=false;control_head=0;control_tail=0;jack.close_library();lost.store(false);error="Audio is stopped.";
 session.device_stopped(canvas);
}
void ultra_audio_stop(){stop_audio_impl(true);}
static int start_impl(){
 stop_audio_impl(false);if(!jack.load()){jack.close_library();
#if defined(__linux__)
error="libjack.so.0 is unavailable. Install your distro's JACK/PipeWire JACK compatibility package, then restart.";
#else
error="The JACK diagnostic is Linux-only. Use the desktop CPAL audio backend.";
#endif
return 0;}
 unsigned status=0;jack.client=jack.client_open("ultra",1u,&status); // JackNoStartServer
 if(!jack.client){error="Cannot connect to JACK. Start your existing JACK server, or launch Ultra through pw-jack on PipeWire. No server/settings were changed.";return 0;}
 if(jack.get_sample_rate(jack.client)!=48000){ultra_audio_stop();error="This research instrument requires a 48,000 Hz JACK server. Audio remains stopped.";return 0;}
 if(!jack.get_buffer_size(jack.client)||jack.get_buffer_size(jack.client)>1024){ultra_audio_stop();error="JACK period above 1024 frames is unsupported.";return 0;}
 if(!engine.init(48000)){ultra_audio_stop();error="Clockwork/Faust guest initialization was refused.";return 0;}
 callback_routes=routes.load();
 synchronize_canvas_runtime(false);canvas_silence=64;
 if(callback_canvas)configure_canvas_audio();
 publish_canvas();
 jack.l=jack.port_register(jack.client,"audio_out_l","32 bit float mono audio",2,0);jack.r=jack.port_register(jack.client,"audio_out_r","32 bit float mono audio",2,0);jack.midi=jack.port_register(jack.client,"midi_in","8 bit raw midi",1,0);
 if(!jack.l||!jack.r||!jack.midi||jack.set_process_callback(jack.client,process,nullptr)||jack.set_xrun_callback(jack.client,xrun,nullptr)||jack.set_sample_rate_callback(jack.client,rate,nullptr)||jack.set_latency_callback(jack.client,latency,nullptr)){
 ultra_audio_stop();error="JACK port/callback registration failed.";return 0;}
 jack.on_shutdown(jack.client,shutdown,nullptr);fault_reason.store(0);lost.store(false);xruns.store(0);period.store(jack.get_buffer_size(jack.client));
 if(jack.activate(jack.client)){ultra_audio_stop();error="JACK activation failed.";return 0;}
 running.store(true);error="Audio running at 48 kHz. MIDI channels 1/2 control devices A/B. Connect a controller to ultra:midi_in.";
 const char** ports=jack.get_ports(jack.client,nullptr,"32 bit float mono audio",1|4); // physical audio inputs
 if(ports){bool connected=ports[0]&&ports[1];if(ports[0])connected=jack.connect(jack.client,jack.port_name(jack.l),ports[0])==0&&connected;if(ports[0]&&ports[1])connected=jack.connect(jack.client,jack.port_name(jack.r),ports[1])==0&&connected;if(!connected)error="JACK running, but stereo playback connection is incomplete. Connect ultra outputs in your JACK/PipeWire patchbay; MIDI input is ultra:midi_in.";jack.free_fn(ports);}else error="JACK running; no physical playback ports found. Connect ultra outputs manually in your patchbay. MIDI input is ultra:midi_in.";
 return 1;
}
int ultra_audio_start(){try{return start_impl();}catch(...){ultra_audio_stop();error="Native audio initialization failed (exception). Audio is stopped.";return 0;}}
int ultra_external_start(){
 try{
  stop_audio_impl(false);
  if(!engine.init(48000)){error="Clockwork/Faust guest initialization was refused.";return 0;}
  callback_routes=routes.load();synchronize_canvas_runtime(false);canvas_silence=64;
  if(callback_canvas)configure_canvas_audio();
  publish_canvas();fault_reason=0;lost=false;xruns=0;period=0;running=true;
  error="Rust audio output is running.";return 1;
 }catch(...){ultra_audio_stop();error="Native DSP initialization failed. Audio is stopped.";return 0;}
}
int ultra_external_render(unsigned n,float* left,float* right){
 if(!n||n>1024||!left||!right){fault_reason=4;engine.panic();return 0;}
 if(!running.load()){std::fill(left,left+n,0.f);std::fill(right,right+n,0.f);return 0;}
 render_audio(n,left,right,false);return !engine.status().fault;
}
int ultra_audio_event(unsigned device,unsigned kind,unsigned note,unsigned value){
 if(device>1||kind>7||note>127||value>127||canvas_requested.load()||!running.load()||!(routes.load()&(1u<<device)))return 0;
 if(device==0&&kind<=2&&sequence_requested.load(std::memory_order_acquire))return 0;
 const bool accepted=queue_control({{0,uint8_t(device),alive::Kind(kind),uint8_t(note),uint8_t(value)},0,ControlKind::Event,{}});
 if(accepted&&device==0&&(kind==4||kind==5))sequence_requested.store(false,std::memory_order_release);
 return accepted;
}
int ultra_audio_sequence(const UltraSequenceConfig* config){
 if(session.configured())return 0;
 if(!config||!ultra::valid_sequence(*config)||!running.load()||(config->enabled&&!(routes.load()&1)))return 0;
 const bool accepted=queue_control({{},0,ControlKind::Sequence,*config});
 if(accepted){sequence_requested.store(config->enabled!=0,std::memory_order_release);clear_canvas_requests();}
 return accepted;
}
void ultra_audio_routes(unsigned mask){
 if(session.configured())return;
 mask&=3;unsigned old=routes.load(std::memory_order_relaxed);
 routes.store(mask);const bool was_canvas=canvas_requested.load();
 if(old!=mask||was_canvas){if((old^mask)&1)sequence_requested=false;if(engine.status().ready){if(queue_control({{},mask,ControlKind::Route,{}}))clear_canvas_requests();}else {clear_canvas_requests();auto discard=[](alive::Event){return true;};for(unsigned d=0;d<MaxDocuments;++d)canvas.close(d,0,discard);callback_canvas=false;publish_canvas();}}
}
void ultra_audio_panic(){fault_reason.store(1);sequence_requested=false;engine.panic();}
unsigned ultra_sequence_enabled(){return running.load()&&!engine.status().fault&&sequence_enabled.load(std::memory_order_acquire);}
unsigned ultra_sequence_step(){return sequence_step.load(std::memory_order_relaxed);}
unsigned ultra_sequence_note(){return ultra_sequence_enabled()?sequence_note.load(std::memory_order_relaxed):128;}
uint64_t ultra_sequence_ticks(){return sequence_ticks.load(std::memory_order_relaxed);}
unsigned ultra_sequence_clock_source(){return sequence_clock_source.load(std::memory_order_relaxed);}

static void discard_canvas_console(unsigned document){
 UltraCanvasConsoleRecord row{};for(unsigned i=0;i<128&&canvas.runtime(document).pop_console(row);++i){}
}
static bool canvas_release_message(unsigned document,unsigned node,unsigned inlet,const ultra::CanvasMessage& message){
 const auto& plan=admitted_canvas[document];const int start=plan.find(node);if(start<0)return false;
 const bool noteoff=message.count==2&&ultra::canvas_numeric_message(message)&&message.values[1]==0;
 const bool pedal=message.count==1&&ultra::canvas_numeric_message(message)&&message.values[0]<64;
 const bool panic=!message.count&&ultra::canvas_named(message,"panic");
 const auto kind=plan.graph.nodes[unsigned(start)].kind;
 // A direct gate-on cannot hide an authored release transform.
 if((kind==ultra::Voice||kind==ultra::PolyNote)&&!inlet&&message.count==2&&ultra::canvas_numeric_message(message)&&message.values[1]>0)return false;
 if((kind==ultra::Voice&&inlet)||(kind==ultra::PolyNote&&inlet&&message.count==1&&ultra::canvas_numeric_message(message)&&message.values[0]>=64))return false;
 constexpr unsigned Slots=32,Nodes=MaxDocuments*Slots;
 std::array<bool,MaxDocuments> live{};for(unsigned d=0;d<MaxDocuments;++d)live[d]=requested_documents[d].load();
 std::array<bool,Nodes> reached{},targets{};std::array<unsigned,Nodes> pending{};unsigned head=0,tail=0;
 auto push=[&](unsigned d,unsigned slot){const unsigned index=d*Slots+slot;if(!reached[index]){reached[index]=true;pending[head++]=index;}};
 auto target=[&](unsigned d,unsigned slot,unsigned port){const auto k=admitted_canvas[d].graph.nodes[slot].kind;if(k==ultra::PolyNote||(k==ultra::Voice&&!port))targets[d*Slots+slot]=true;};
 auto named_link=[](const UltraCanvasNode& sender,const UltraCanvasNode& receiver){return !receiver.text[0]||!std::strcmp(sender.text,receiver.text);};
 target(document,unsigned(start),inlet);push(document,unsigned(start));
 // Treat control transforms conservatively. A bang may emit a stored note-off.
 // Static named links and rebindable (unnamed) Receives share this bounded walk.
 while(tail<head){
  const unsigned index=pending[tail++],d=index/Slots,slot=index%Slots;const auto& current=admitted_canvas[d];
  for(unsigned e=0;e<current.graph.edge_count;++e){const auto& edge=current.edges[e];if((edge.domains&ultra::CanvasPlan::Control)&&edge.from==slot){target(d,edge.to,edge.inlet);push(d,edge.to);}}
  const auto& sender=current.graph.nodes[slot];if(sender.kind!=ultra::Send)continue;
  for(unsigned other=0;other<MaxDocuments;++other)if(live[other]){
   const auto& graph=admitted_canvas[other].graph;
   for(unsigned s=0;s<graph.node_count;++s)if(graph.nodes[s].kind==ultra::Receive&&named_link(sender,graph.nodes[s]))push(other,s);
  }
 }
 bool any=false;reached.fill(false);head=tail=0;
 for(unsigned index=0;index<Nodes;++index)if(targets[index]){any=true;push(index/Slots,index%Slots);}
 if(!any)return false;
 // Invalidate every related producer, including queued gate-ons from a different
 // sender. Stopping those producers also disarms timers that could rearm a root.
 while(tail<head){
  const unsigned index=pending[tail++],d=index/Slots,slot=index%Slots;const auto& current=admitted_canvas[d];
  for(unsigned e=0;e<current.graph.edge_count;++e){const auto& edge=current.edges[e];if((edge.domains&ultra::CanvasPlan::Control)&&edge.to==slot&&(current.graph.nodes[slot].kind!=ultra::Voice||!edge.inlet))push(d,edge.from);}
  const auto& receiver=current.graph.nodes[slot];if(receiver.kind!=ultra::Receive)continue;
  for(unsigned other=0;other<MaxDocuments;++other)if(live[other]){
   const auto& graph=admitted_canvas[other].graph;
   for(unsigned s=0;s<graph.node_count;++s)if(graph.nodes[s].kind==ultra::Send&&named_link(graph.nodes[s],receiver))push(other,s);
  }
 }
 unsigned related=0;for(unsigned d=0;d<MaxDocuments;++d)for(unsigned s=0;s<admitted_canvas[d].graph.node_count;++s)if(reached[d*Slots+s])related|=1u<<d;
 request_documents_stop(related);
 return noteoff||pedal||panic;
}
int ultra_canvas_install_document(uint32_t document,const UltraCanvasGraph* graph){
 if(session.configured())return 0;
 if(document>=MaxDocuments||!graph||graph->revision<=admitted_canvas[document].graph.revision)return 0;
 ultra::CanvasPlan next{};if(!ultra::compile_canvas(*graph,next))return 0;
 const bool was_running=running.load();
 if(was_running){
  Control c{};c.kind=ControlKind::CanvasInstall;c.document=document;c.canvas=next;if(!queue_control(c,false))return 0;
 }else if(engine.status().ready)return 0;
 if(!was_running)tick_canvas_idle();
 admitted_canvas[document]=next;admitted_message_serial[document]=0;requested_documents[document]=true;update_canvas_requested();sequence_requested=false;
 if(!was_running){auto discard=[](alive::Event){return true;};canvas.begin_callback();canvas.install(document,next,0,discard);callback_canvas=canvas.any();publish_canvas();}
 return 1;
}
int ultra_canvas_event_document(uint32_t document,uint64_t revision,uint32_t node,uint32_t inlet,uint32_t count,const double* values){
 if(count>8||(count&&!values))return 0;
 UltraCanvasMessage message{};message.count=count;
 for(unsigned i=0;i<count;++i){message.values[i]=values[i];message.tags[i]=std::floor(values[i])==values[i]?0:1;}
 return ultra_canvas_message_document(document,revision,node,inlet,&message);
}
int ultra_canvas_message_document(uint32_t document,uint64_t revision,uint32_t node,uint32_t inlet,const UltraCanvasMessage* message){
 if(session.hosted(document))return 0;
 if(document>=MaxDocuments||!message||!requested_documents[document].load())return 0;
 const auto m=ultra::canvas_message_from_pod(*message);
 if(!ultra::canvas_event_valid(admitted_canvas[document],revision,node,inlet,m))return 0;
 if(running.load()){
  Control c{};c.kind=ControlKind::CanvasEvent;c.document=document;c.revision=revision;c.node=node;c.inlet=inlet;c.message=m;
  if(queue_control(c,false))return 1;
  // Release-shaped messages report accepted safety termination; an unclassified
  // transformed message still reports rejection after conservative scoped Stop.
  if(canvas_release_message(document,node,inlet,m))return 1;
  return 0;
 }
 if(engine.status().ready)return 0;
 tick_canvas_idle();canvas.begin_callback();auto discard=[](alive::Event){return true;};
 const bool accepted=canvas.event(document,revision,node,inlet,m,0,discard);publish_canvas();return accepted;
}
int ultra_canvas_message_text_document(uint32_t document,uint64_t revision,uint32_t node,uint64_t serial,const char* text,uint32_t length){
 if(session.hosted(document))return 0;
 if(document>=MaxDocuments||!requested_documents[document].load()||revision!=admitted_canvas[document].graph.revision||!serial||serial>9007199254740991ULL||serial<=admitted_message_serial[document]||!text||length>127)return 0;
 const int slot=admitted_canvas[document].find(node);if(slot<0||admitted_canvas[document].graph.nodes[slot].kind!=ultra::MessageBox)return 0;
 char source[128]{};for(unsigned i=0;i<length;++i){if(!text[i])return 0;source[i]=text[i];}
 ultra::CanvasMessageTemplate content{};if(!ultra::canvas_message_template(source,content))return 0;
 const bool was_running=running.load();
 if(was_running){Control c{};c.kind=ControlKind::CanvasMessageText;c.document=document;c.revision=revision;c.node=node;c.text_edit_serial=serial;c.message_template=content;if(!queue_control(c,false))return 0;}
 else if(engine.status().ready)return 0;
 if(!was_running){tick_canvas_idle();if(!canvas.runtime(document).message_text(revision,node,serial,content))return 0;publish_canvas();}
 auto& plan=admitted_canvas[document];std::memcpy(plan.graph.nodes[slot].text,source,128);plan.message_templates[slot]=content;admitted_message_serial[document]=serial;return 1;
}
int ultra_canvas_message_boxes_document(uint32_t document,UltraCanvasMessageBoxSnapshot* result){
 if(document>=MaxDocuments||!result||!requested_documents[document].load())return 0;
 const auto& published=published_message_boxes[document];
 for(unsigned attempt=0;attempt<4;++attempt){
  const auto before=published.generation.load();if(before&1)continue;
  UltraCanvasMessageBoxSnapshot snapshot{};snapshot.revision=published.revision.load();snapshot.text_edit_serial=published.serial.load();snapshot.node_count=published.count.load();
  if(snapshot.node_count>32)continue;
  for(unsigned i=0;i<snapshot.node_count;++i){std::array<uint64_t,55> words{};for(unsigned w=0;w<words.size();++w)words[w]=published.words[i][w].load();std::memcpy(&snapshot.nodes[i],words.data(),sizeof snapshot.nodes[i]);}
  if(before==published.generation.load()){*result=snapshot;return 1;}
 }
 return 0;
}
int ultra_canvas_print_popups_document(uint32_t document,UltraCanvasPrintPopupSnapshot* result){
 if(document>=MaxDocuments||!result||!requested_documents[document].load())return 0;
 const auto& published=published_print_popups[document];
 for(unsigned attempt=0;attempt<4;++attempt){
  const auto before=published.generation.load();if(before&1)continue;
  UltraCanvasPrintPopupSnapshot snapshot{};snapshot.revision=published.revision.load();snapshot.frame=published.frame.load();snapshot.node_count=published.count.load();
  if(snapshot.node_count>32)continue;
  for(unsigned i=0;i<snapshot.node_count;++i){std::array<uint64_t,53> words{};for(unsigned w=0;w<words.size();++w)words[w]=published.words[i][w].load();std::memcpy(&snapshot.nodes[i],words.data(),sizeof snapshot.nodes[i]);}
  if(before==published.generation.load()){*result=snapshot;return 1;}
 }
 return 0;
}
int ultra_canvas_param_document(uint32_t document,uint64_t revision,uint32_t node,uint32_t param,double value){
 return ultra_canvas_param_hot_document(document,revision,node,param,value,0);
}
int ultra_canvas_tab_document(uint32_t document,uint64_t revision,uint32_t node){
 if(session.hosted(document))return 0;
 if(document>=MaxDocuments||!requested_documents[document].load()||!ultra::canvas_tab_valid(admitted_canvas[document],revision,node))return 0;
 if(running.load()){
  Control c{};c.kind=ControlKind::CanvasTab;c.document=document;c.revision=revision;c.node=node;return queue_control(c,false);
 }
 if(engine.status().ready)return 0;
 tick_canvas_idle();canvas.begin_callback();auto discard=[](alive::Event){return true;};
 const bool accepted=canvas.tab(document,revision,node,0,discard);publish_canvas();return accepted;
}
int ultra_canvas_param_hot_document(uint32_t document,uint64_t revision,uint32_t node,uint32_t param,double value,uint32_t hot){
 if(session.hosted(document))return 0; // Bound edits use alive_session_base ownership.
 if(hot>1)return 0;
 if(document>=MaxDocuments||!requested_documents[document].load()||revision!=admitted_canvas[document].graph.revision)return 0;
 auto next=admitted_canvas[document];if(!ultra::change_canvas_param(next,node,param,value))return 0;
 ultra::CanvasMessage message{1,{value,0,0}};message.tags[0]=std::floor(value)==value?0:1;
 if(hot&&!ultra::canvas_event_valid(next,revision,node,0,message))return 0;
 const bool was_running=running.load();
 if(was_running){
  Control c{};c.kind=hot?ControlKind::CanvasParamHot:ControlKind::CanvasParam;c.document=document;c.revision=revision;c.node=node;c.param=param;c.value=value;c.canvas=next;c.message=message;if(!queue_control(c,false))return 0;
 }else if(engine.status().ready)return 0;
 if(!was_running){
  tick_canvas_idle();canvas.begin_callback();auto discard=[](alive::Event){return true;};
  if(!canvas.runtime(document).param(next,node,param,value,0,discard))return 0;
  if(hot)canvas.event(document,revision,node,0,message,0,discard);
  publish_canvas();
 }
 admitted_canvas[document]=next;return 1;
}
int ultra_canvas_stop_document(uint32_t document){
 if(session.hosted(document)){alive_session_stop();return 1;}
 if(document>=MaxDocuments)return 0;
 if(!requested_documents[document].load())return 1;
 if(running.load()){request_document_stop(document);return 1;}
 if(engine.status().ready)return 0;
 tick_canvas_idle();auto discard=[](alive::Event){return true;};canvas.stop(document,0,discard);publish_canvas();return 1;
}
int ultra_canvas_close_document(uint32_t document){
 if(session.hosted(document))return 0;
 if(document>=MaxDocuments)return 0;
 if(!requested_documents[document].load()){discard_canvas_console(document);return 1;}
 const bool was_running=running.load();
 if(was_running){Control c{};c.kind=ControlKind::CanvasClose;c.document=document;if(!queue_control(c,false))return 0;}
 else if(engine.status().ready)return 0;
 if(!was_running){tick_canvas_idle();auto discard=[](alive::Event){return true;};canvas.close(document,0,discard);canvas.runtime(document).reset_console_count();callback_canvas=canvas.any();publish_canvas();}
 closed_console_revision[document]=admitted_canvas[document].graph.revision;
 requested_documents[document]=false;update_canvas_requested();discard_canvas_console(document);return 1;
}
void ultra_canvas_stop_all(){
 if(session.configured())alive_session_stop();
 if(running.load())request_documents_stop((1u<<MaxDocuments)-1);
 else if(engine.status().ready)engine.panic();
 else {auto discard=[](alive::Event){return true;};for(unsigned d=0;d<MaxDocuments;++d)canvas.stop(d,0,discard);reset_canvas_idle_clock();publish_canvas();}
}
void ultra_canvas_idle_tick(){tick_canvas_idle();}
uint32_t ultra_canvas_console_document(uint32_t document,UltraCanvasConsoleRecord* records,uint32_t capacity,uint64_t* dropped){
 if(document>=MaxDocuments||!records||!dropped)return 0;
 unsigned count=0;UltraCanvasConsoleRecord row{};auto& runtime=canvas.runtime(document);
 // A closed/reused slot must never publish records from its previous graph.
 const bool requested=requested_documents[document].load();const auto revision=closed_console_revision[document];
 for(unsigned i=0;i<128&&count<std::min(capacity,128u)&&runtime.pop_console(row);++i)
  if(requested&&row.revision>revision)records[count++]=row;
 *dropped=runtime.console_dropped();return count;
}
void ultra_canvas_status_document(uint32_t document,UltraCanvasStatus* result){
 if(!result)return;
 if(document>=MaxDocuments){*result={};return;}
 const auto& published=published_canvases[document];
 for(unsigned attempt=0;attempt<4;++attempt){
  auto before=published.generation.load(std::memory_order_acquire);if(before&1)continue;
  UltraCanvasStatus status{};status.revision=published.revision.load(std::memory_order_relaxed);status.node_count=published.count.load(std::memory_order_relaxed);status.active=published.active.load(std::memory_order_relaxed);
  for(unsigned i=0;i<status.node_count;++i){status.nodes[i].id=published.nodes[i].id.load(std::memory_order_relaxed);status.nodes[i].value=bits_double(published.nodes[i].value.load(std::memory_order_relaxed));status.nodes[i].pulses=published.nodes[i].pulses.load(std::memory_order_relaxed);}
  if(before==published.generation.load(std::memory_order_acquire)){*result=status;return;}
 }
 *result={};
}
static int legacy_canvas_result(int accepted){
 // Preserve the old fail-closed overflow contract only for legacy doc-0 ingress.
 if(!accepted&&running.load()){
  const auto next=(control_head.load(std::memory_order_relaxed)+1)%(ControlCapacity+1);
  if(next==control_tail.load(std::memory_order_acquire))engine.panic();
 }
 return accepted;
}
int ultra_canvas_install(const UltraCanvasGraph* graph){return legacy_canvas_result(ultra_canvas_install_document(0,graph));}
int ultra_canvas_event(uint64_t revision,uint32_t node,uint32_t inlet,uint32_t count,const double* values){return legacy_canvas_result(ultra_canvas_event_document(0,revision,node,inlet,count,values));}
int ultra_canvas_message(uint64_t revision,uint32_t node,uint32_t inlet,const UltraCanvasMessage* message){return legacy_canvas_result(ultra_canvas_message_document(0,revision,node,inlet,message));}
int ultra_canvas_param(uint64_t revision,uint32_t node,uint32_t param,double value){return legacy_canvas_result(ultra_canvas_param_document(0,revision,node,param,value));}
void ultra_canvas_stop(){if(!ultra_canvas_stop_document(0)&&engine.status().ready)engine.panic();}
uint32_t ultra_canvas_console(UltraCanvasConsoleRecord* records,uint32_t capacity,uint64_t* dropped){return ultra_canvas_console_document(0,records,capacity,dropped);}
void ultra_canvas_status(UltraCanvasStatus* result){ultra_canvas_status_document(0,result);}
const char* ultra_audio_error(){
 const auto status=engine.status();if(status.ready&&status.fault){switch(fault_reason.load()){
 case 1:return "Panic muted the engine. Stop then Start to reset.";
 case 2:return "JACK server disconnected. Restore the server, then Stop/Start.";
 case 3:return "Safety stop: more than 128 MIDI events in one callback. Stop/Start to reset.";
 case 4:return "Safety stop: JACK period exceeded 1024 frames. Restore a supported period, then Stop/Start.";
 case 5:return "Safety stop: JACK sample rate changed from 48 kHz. Restore 48 kHz, then Stop/Start.";
 default:return "Safety stop: bounded event admission failed. Stop then Start to reset.";}}
 return error;
}
uint64_t ultra_audio_frames(){return engine.status().rendered;}
uint64_t ultra_audio_rejected(){return engine.status().rejected;}
unsigned ultra_audio_flags(){auto s=engine.status();return (running.load()?1:0)|(s.ready?2:0)|(s.ready&&s.fault?4:0)|(lost.load()?8:0);}
unsigned ultra_audio_period(){return period.load();}unsigned ultra_audio_xruns(){return xruns.load();}
static int render_demo_impl(const char*path){
 ultra_audio_stop();if(!engine.init())return 0;
 constexpr unsigned total=96000;std::vector<float> l(total),r(total);float peak=0;
 for(unsigned frame=0;frame<total;frame+=64){
  if(frame==0){engine.submit({0,0,alive::Kind::On,60,100});engine.submit({31,1,alive::Kind::On,67,100});}
  if(frame==48000){engine.submit({0,0,alive::Kind::Off,60,0});engine.submit({31,1,alive::Kind::Off,67,0});}
  float* channels[]={l.data()+frame,r.data()+frame};engine.render_bus({channels,2},nullptr,64);
 }
 auto s=engine.status();bool ok=s.ready&&!s.fault;
 for(unsigned i=0;i<total;i++){ok=ok&&std::isfinite(l[i])&&std::isfinite(r[i]);peak=std::max({peak,std::abs(l[i]),std::abs(r[i])});if(i>48150)ok=ok&&l[i]==0&&r[i]==0;}
 ok=ok&&peak>0.01f;engine.shutdown();if(!ok)return 0;
 FILE*f=fopen(path,"wb");if(!f)return 0;fwrite("RIFF",1,4,f);put32(f,36+total*4);fwrite("WAVEfmt ",1,8,f);put32(f,16);put16(f,1);put16(f,2);put32(f,48000);put32(f,192000);put16(f,4);put16(f,16);fwrite("data",1,4,f);put32(f,total*4);
 for(unsigned i=0;i<total;i++){put16(f,uint16_t(int16_t(std::clamp(l[i],-1.f,1.f)*32767)));put16(f,uint16_t(int16_t(std::clamp(r[i],-1.f,1.f)*32767)));}
 return fclose(f)==0;
}
static int render_chord_demo_impl(const char* path){
 ultra_audio_stop();if(!engine.init())return 0;
 constexpr unsigned total=8*48000,stop_at=7*48000;std::vector<float> l(total),r(total);float peak=0;
 ultra::Sequencer demo;UltraSequenceConfig config{1,112,60,0,8,65,96,0,0};
 auto emit=[](alive::Event e){return engine.submit(e);};
 for(unsigned d=0;d<2;d++){
  emit({0,uint8_t(d),alive::Kind(6),0,8});emit({0,uint8_t(d),alive::Kind(7),0,14});
  emit({0,uint8_t(d),alive::Kind::Level,0,uint8_t(d?52:100)});
 }
 unsigned bass=36;demo.configure(config,emit);emit({0,1,alive::Kind::On,uint8_t(bass),80});
 for(unsigned frame=0;frame<total;frame+=64){
  if(frame&&frame%96000==0&&frame<stop_at){
   config.chord=(frame/96000)%3;config.root=frame==192000?62:60;demo.configure(config,emit);
   emit({0,1,alive::Kind::Off,uint8_t(bass),0});bass=config.root-24;emit({0,1,alive::Kind::On,uint8_t(bass),80});
  }
  if(frame==stop_at){demo.stop(0,emit);emit({0,1,alive::Kind::Off,uint8_t(bass),0});}
  for(unsigned i=0;i<64;i++)demo.sample(i,emit);
  float* channels[]={l.data()+frame,r.data()+frame};engine.render_bus({channels,2},nullptr,64);
 }
 const auto status=engine.status();bool ok=status.ready&&!status.fault;
 for(unsigned i=0;i<total;i++){
  ok=ok&&std::isfinite(l[i])&&std::isfinite(r[i]);peak=std::max({peak,std::abs(l[i]),std::abs(r[i])});
  if(i>stop_at+24000)ok=ok&&l[i]==0&&r[i]==0;
 }
 // Reconfiguration resets visible ticks; the final segment has >7 triggers.
 ok=status.ready&&!status.fault&&peak>0.01f&&demo.ticks()>=7&&ok;
 engine.shutdown();if(!ok)return 0;
 FILE* f=fopen(path,"wb");if(!f)return 0;fwrite("RIFF",1,4,f);put32(f,36+total*4);fwrite("WAVEfmt ",1,8,f);put32(f,16);put16(f,1);put16(f,2);put32(f,48000);put32(f,192000);put16(f,4);put16(f,16);fwrite("data",1,4,f);put32(f,total*4);
 for(unsigned i=0;i<total;i++){put16(f,uint16_t(int16_t(std::clamp(l[i],-1.f,1.f)*32767)));put16(f,uint16_t(int16_t(std::clamp(r[i],-1.f,1.f)*32767)));}
 return fclose(f)==0;
}
int ultra_render_chord_demo(const char*path){try{return render_chord_demo_impl(path);}catch(...){ultra_audio_stop();error="Chord demo render failed.";return 0;}}
int ultra_render_demo(const char*path){try{return render_demo_impl(path);}catch(...){ultra_audio_stop();return 0;}}

}
