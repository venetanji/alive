#include "engine.hpp"
#include "ultra_core.h"
#include "clockwork_embed.h"
#include "audio_processor.h"
#include "lanes/lanes.h"
#include <array>
#include <atomic>
#include <algorithm>
#include <cmath>
#include <cstring>
#include <new>
extern "C" bool ultra_guest_ready();
namespace alive {
static_assert(std::atomic<bool>::is_always_lock_free && std::atomic<uint32_t>::is_always_lock_free && std::atomic<uint64_t>::is_always_lock_free, "Ultra callback requires lock-free scalar atomics");
namespace { constexpr uint32_t B=64, Capacity=64, Horizon=1024, Budget=16;
std::atomic<bool> owned{false};
void put(uint8_t*p,uint32_t n){p[0]=n>>24;p[1]=n>>16;p[2]=n>>8;p[3]=n;}
}
struct Engine::Impl {
 ClockworkEmbed* h=nullptr; ClockworkClient* client=nullptr; bool owner=false;
 std::atomic<bool> ready{false},fault{false}; std::atomic<uint64_t> rejected{0},published{0};
 std::atomic<uint32_t> queued{0},head{0},tail{0}; std::array<Event,Capacity+1> ingress{};
 struct Scheduled {uint64_t frame; Event event;}; std::array<Scheduled,Capacity> events{};
 uint32_t count=0,fill=0; uint64_t cursor=0,processed=0; int64_t epoch=0;
 std::array<float,B> input{},left{},right{},diagnostic{};
 void fail() noexcept {rejected.fetch_add(1,std::memory_order_relaxed);fault.store(true,std::memory_order_release);}
 bool admit(Event e) noexcept {
  if(!ready.load(std::memory_order_acquire)||fault.load(std::memory_order_acquire))return false;
  if(e.offset>Horizon||e.device>1||unsigned(e.kind)>8||e.note>127||e.value>127||count==Capacity){fail();return false;}
  const uint64_t at=cursor+e.offset, block=at/B;
  unsigned due=0;for(unsigned i=0;i<count;i++)due+=events[i].frame/B==block;
  if(due>=Budget){fail();return false;}
  unsigned i=count++;while(i&&events[i-1].frame>at){events[i]=events[i-1];--i;}events[i]={at,e};queued.store(count,std::memory_order_relaxed);return true;
 }
 bool tick() noexcept {
  unsigned used=0;while(used<count&&events[used].frame<processed+B){
   const auto&s=events[used++];uint8_t packet[64]{};std::memcpy(packet,"#bundle\0",8);
   const uint64_t time=uint64_t(epoch)+uint64_t(std::llround(s.frame*(4294967296.0/48000)));
   put(packet+8,time>>32);put(packet+12,time);put(packet+16,44);
   std::memcpy(packet+20,"/ultra/event\0",12);std::memcpy(packet+32,",iiiiii\0",8);
   put(packet+40,s.event.device);put(packet+44,0);put(packet+48,unsigned(s.event.kind));put(packet+52,s.event.note);put(packet+56,s.event.value);
   if(clockwork_client_send(client,packet,64,123)!=CLOCKWORK_OK){fail();return false;}
  }
  for(unsigned i=used;i<count;i++)events[i-used]=events[i];count-=used;queued.store(count,std::memory_order_relaxed);
  float* out[]={left.data(),right.data(),diagnostic.data()};const float* in[]={input.data()};
  if(clockwork_embed_render(h,out,3,in,1,B)!=B){fail();return false;}
  processed+=B;return true;
 }
};
Engine::Engine():p(std::make_unique<Impl>()){}
Engine::~Engine(){shutdown();}
bool Engine::init(uint32_t rate){
 if(p->h||p->owner||rate!=48000)return false;
 bool expected=false;if(!owned.compare_exchange_strong(expected,true))return false;p->owner=true;
 // Exclusive ownership is part of the admission proof, including low-level clients.
 if(clockwork_attached()!=0){owned=false;p->owner=false;return false;}
 ClockworkEmbedConfig c{};c.struct_bytes=sizeof c;c.sample_rate=rate;c.block_size=B;c.input_channels=1;c.output_channels=3;c.max_render_frames=B;
 ClockworkStatus st;p->h=clockwork_embed_attach(&c,&st);
 if(!p->h||st!=CLOCKWORK_OK||!ultra_guest_ready()||clockwork_embed_block_size(p->h)!=B){shutdown();return false;}
 p->client=clockwork_embed_client(p->h);
 // Warm and read the actual engine clock on the control thread, before exposure.
 float a[B]{},b[B]{},d[B]{};float* out[]={a,b,d};
 if(clockwork_embed_render(p->h,out,3,nullptr,0,B)!=B){shutdown();return false;}
 ClockworkClientSampleClock clock{};clock.struct_bytes=sizeof clock;
 if(clockwork_client_sample_clock(p->client,&clock)!=CLOCKWORK_OK){shutdown();return false;}
 p->epoch=static_cast<int64_t>(static_cast<uint64_t>((static_cast<long double>(clock.dac_ntp)+static_cast<long double>(B)/48000)*4294967296.L));
 p->cursor=p->processed=0;p->fill=p->count=0;p->head=0;p->tail=0;p->queued=0;p->published=0;p->rejected=0;
 p->left.fill(0);p->right.fill(0);p->input.fill(0);p->diagnostic.fill(0);p->fault=false;p->ready=true;return true;
}
void Engine::shutdown(){
 p->ready=false;p->count=0;p->queued=0;p->head=0;p->tail=0;
 if(p->h){clockwork_embed_close(p->h);p->h=nullptr;p->client=nullptr;}
 if(p->owner){teardown_memory();p->owner=false;owned=false;}
}
bool Engine::queue(Event e) noexcept {
 if(!p->ready.load(std::memory_order_acquire)||p->fault.load(std::memory_order_acquire))return false;
 if(e.offset||e.device>1||unsigned(e.kind)>8||e.note>127||e.value>127){p->fail();return false;}
 auto head=p->head.load(std::memory_order_relaxed),next=(head+1)%(Capacity+1);
 if(next==p->tail.load(std::memory_order_acquire)){p->fail();return false;}
 p->ingress[head]=e;p->head.store(next,std::memory_order_release);return true;
}
bool Engine::submit(Event e) noexcept{return p->admit(e);}
void Engine::panic() noexcept{p->fail();}
void Engine::render_bus(AudioBusView output,const float* input,uint32_t frames,float* diagnostic) noexcept {
 // Check width before touching the channel array. An invalid bus has no known
 // writable destination; mute occurs on the next valid render via sticky fault.
 if(output.channel_count!=2||!output.channels||!output.channels[0]||!output.channels[1]){p->fail();return;}
 render(output.channels[0],output.channels[1],input,frames,diagnostic);
}
void Engine::render(float*l,float*r,const float*in,uint32_t n,float*diag) noexcept {
 auto silence=[&]{if(l)std::fill(l,l+n,0.f);if(r)std::fill(r,r+n,0.f);if(diag)std::fill(diag,diag+n,0.f);};
 if(n>4096||p->cursor+n>=uint64_t(INT32_MAX)-4096){p->fail();}
 if(!p->ready.load(std::memory_order_acquire)||p->fault.load(std::memory_order_acquire)){p->count=0;p->queued=0;silence();return;}
 // Snapshot producer head once. Drain <=64 slots, independent of concurrent producer speed.
 const auto end=p->head.load(std::memory_order_acquire);auto tail=p->tail.load(std::memory_order_relaxed);
 for(unsigned i=0;tail!=end&&i<Capacity;i++){auto e=p->ingress[tail];tail=(tail+1)%(Capacity+1);p->admit(e);}
 p->tail.store(tail,std::memory_order_release);
 for(uint32_t f=0;f<n;f++){
  if(p->fault.load(std::memory_order_acquire)){p->count=0;p->queued=0;silence();return;}
  if(l)l[f]=p->left[p->fill];if(r)r[f]=p->right[p->fill];if(diag)diag[f]=p->diagnostic[p->fill];
  p->input[p->fill]=in?in[f]:0.f;++p->fill;++p->cursor;
  if(p->fill==B){p->fill=0;if(!p->tick()){silence();return;}}
 }
 p->published.store(p->cursor,std::memory_order_release);
}
Status Engine::status()const noexcept{return {p->ready.load(),p->fault.load(),p->published.load(),p->rejected.load(),B,p->queued.load()};}
}
struct UltraCore {alive::Engine engine;};
extern "C" {
UltraCore* ultra_core_create(uint32_t rate){try{auto p=std::make_unique<UltraCore>();if(!p->engine.init(rate))return nullptr;return p.release();}catch(...){return nullptr;}}
void ultra_core_destroy(UltraCore*p){delete p;}
static alive::Event convert(UltraEvent e){return {e.offset,e.device,alive::Kind(e.kind),e.note,e.value};}
int ultra_core_queue(UltraCore*p,UltraEvent e){return p&&p->engine.queue(convert(e));}
int ultra_core_submit(UltraCore*p,UltraEvent e){return p&&p->engine.submit(convert(e));}
void ultra_core_panic(UltraCore*p){if(p)p->engine.panic();}
void ultra_core_render(UltraCore*p,float*l,float*r,const float*i,float*d,uint32_t n){if(p)p->engine.render(l,r,i,n,d);else{if(l)std::fill(l,l+n,0.f);if(r)std::fill(r,r+n,0.f);if(d)std::fill(d,d+n,0.f);}}
UltraStatus ultra_core_status(const UltraCore*p){if(!p)return {};auto s=p->engine.status();return {s.rendered,s.rejected,s.ready,s.fault,s.delay_frames,s.queued};}
}
