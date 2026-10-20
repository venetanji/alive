#include "backend.h"
#include "../../core/engine.hpp"
#include <atomic>
#include <array>
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <dlfcn.h>
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
 bool load(){
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
 }
} jack;
alive::Engine engine; const char* error="Audio is stopped.";
std::atomic<unsigned> routes{0},fault_reason{0};
std::atomic<bool> running{false},lost{false}; std::atomic<unsigned> period{0},xruns{0};
struct Control { alive::Event event{}; unsigned mask=0; bool route=false; };
constexpr unsigned ControlCapacity=64;
std::array<Control,ControlCapacity+1> controls{};
std::atomic<unsigned> control_head{0},control_tail{0};
unsigned callback_routes=0; // Callback-owned; initialized only while stopped.
bool queue_control(Control control){
 auto status=engine.status();if(!status.ready||status.fault)return false;
 const auto head=control_head.load(std::memory_order_relaxed),next=(head+1)%(ControlCapacity+1);
 if(next==control_tail.load(std::memory_order_acquire)){engine.panic();return false;}
 controls[head]=control;control_head.store(next,std::memory_order_release);return true;
}
int process(Frames n,void*){
 auto* l=static_cast<float*>(jack.port_get_buffer(jack.l,n));auto* r=static_cast<float*>(jack.port_get_buffer(jack.r,n));
 if(!l||!r)return 0;
 period.store(n,std::memory_order_relaxed);
 if(n>1024||lost.load(std::memory_order_relaxed)){if(n>1024)fault_reason.store(4);engine.panic();std::fill(l,l+n,0);std::fill(r,r+n,0);return 0;}
 // One FIFO orders route cleanup between old and new UI notes. A snapshot keeps
 // mid-callback edits behind all MIDI already admitted for this buffer.
 const auto end=control_head.load(std::memory_order_acquire);auto tail=control_tail.load(std::memory_order_relaxed);
 for(unsigned i=0;tail!=end&&i<ControlCapacity;i++){
  const auto control=controls[tail];tail=(tail+1)%(ControlCapacity+1);
  if(control.route){
   for(unsigned d=0;d<2;d++)if((callback_routes&~control.mask)&(1u<<d))engine.submit({0,uint8_t(d),alive::Kind::AllOff,0,0});
   callback_routes=control.mask;
  }else engine.submit(control.event);
 }
 control_tail.store(tail,std::memory_order_release);
 const unsigned mask=callback_routes;
 void* buffer=jack.port_get_buffer(jack.midi,n);uint32_t count=buffer?jack.midi_get_event_count(buffer):0;
 if(count>128){fault_reason.store(3);engine.panic();count=0;}
 // Submit all MIDI at true JACK buffer offsets. Core admission is bounded/fail-closed.
 for(uint32_t i=0;i<count;i++){
  MidiEvent e{};if(jack.midi_event_get(&e,buffer,i)||!e.buffer||e.size<1)continue;
  auto status=e.buffer[0];unsigned channel=status&15,cmd=status&0xf0;
  if(channel>1||e.time>=n||!(mask&(1u<<channel)))continue;
  alive::Event event{};event.device=channel;event.offset=e.time;
  if((cmd==0x90||cmd==0x80)&&e.size==3){event.kind=cmd==0x90?alive::Kind::On:alive::Kind::Off;event.note=e.buffer[1];event.value=e.buffer[2];}
  else if(cmd==0xb0&&e.size==3){event.note=0;event.value=e.buffer[2];if(e.buffer[1]==64)event.kind=alive::Kind::Sustain;else if(e.buffer[1]==123||e.buffer[1]==120)event.kind=alive::Kind::AllOff;else continue;}
  else continue;
  if(event.note>127||event.value>127){engine.panic();break;}engine.submit(event);
 }
 engine.render(l,r,nullptr,n);if(!(mask&1))std::fill(l,l+n,0.f);if(!(mask&2))std::fill(r,r+n,0.f);return 0;
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
void ultra_audio_stop(){
 running.store(false);if(jack.client){jack.deactivate(jack.client);jack.client_close(jack.client);jack.client=nullptr;}
 engine.shutdown();control_head=0;control_tail=0;if(jack.lib){dlclose(jack.lib);jack.lib=nullptr;}lost.store(false);error="Audio is stopped.";
}
static int start_impl(){
 ultra_audio_stop();if(!jack.load()){if(jack.lib){dlclose(jack.lib);jack.lib=nullptr;}error="libjack.so.0 is unavailable. Install your distro's JACK/PipeWire JACK compatibility package, then restart.";return 0;}
 unsigned status=0;jack.client=jack.client_open("ultra",1u,&status); // JackNoStartServer
 if(!jack.client){error="Cannot connect to JACK. Start your existing JACK server, or launch Ultra through pw-jack on PipeWire. No server/settings were changed.";return 0;}
 if(jack.get_sample_rate(jack.client)!=48000){ultra_audio_stop();error="This research instrument requires a 48,000 Hz JACK server. Audio remains stopped.";return 0;}
 if(!jack.get_buffer_size(jack.client)||jack.get_buffer_size(jack.client)>1024){ultra_audio_stop();error="JACK period above 1024 frames is unsupported.";return 0;}
 if(!engine.init(48000)){ultra_audio_stop();error="Clockwork/Faust guest initialization was refused.";return 0;}
 callback_routes=routes.load();
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
int ultra_audio_event(unsigned device,unsigned kind,unsigned note,unsigned value){if(device>1||kind>5||note>127||value>127||!running.load()||!(routes.load()&(1u<<device)))return 0;return queue_control({{0,uint8_t(device),alive::Kind(kind),uint8_t(note),uint8_t(value)},0,false});}
void ultra_audio_routes(unsigned mask){
 mask&=3;unsigned old=routes.load(std::memory_order_relaxed);
 routes.store(mask);if(old!=mask&&engine.status().ready)queue_control({{},mask,true});
}
void ultra_audio_panic(){fault_reason.store(1);engine.panic();}
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
  engine.render(l.data()+frame,r.data()+frame,nullptr,64);
 }
 auto s=engine.status();bool ok=s.ready&&!s.fault;
 for(unsigned i=0;i<total;i++){ok=ok&&std::isfinite(l[i])&&std::isfinite(r[i]);peak=std::max({peak,std::abs(l[i]),std::abs(r[i])});if(i>48150)ok=ok&&l[i]==0&&r[i]==0;}
 ok=ok&&peak>0.01f;engine.shutdown();if(!ok)return 0;
 FILE*f=fopen(path,"wb");if(!f)return 0;fwrite("RIFF",1,4,f);put32(f,36+total*4);fwrite("WAVEfmt ",1,8,f);put32(f,16);put16(f,1);put16(f,2);put32(f,48000);put32(f,192000);put16(f,4);put16(f,16);fwrite("data",1,4,f);put32(f,total*4);
 for(unsigned i=0;i<total;i++){put16(f,uint16_t(int16_t(std::clamp(l[i],-1.f,1.f)*32767)));put16(f,uint16_t(int16_t(std::clamp(r[i],-1.f,1.f)*32767)));}
 return fclose(f)==0;
}
int ultra_render_demo(const char*path){try{return render_demo_impl(path);}catch(...){ultra_audio_stop();return 0;}}

}
