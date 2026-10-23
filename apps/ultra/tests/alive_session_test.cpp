#include "../src-tauri/native/backend.h"
#include "../src-tauri/native/alive_session.h"
#include "canvas_callback_guard.hpp"
#include "../core/engine.hpp"
#include <algorithm>
#include <array>
#include <cassert>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <vector>

namespace {
uint64_t revision=10000;
UltraCanvasGraph instrument(){
 UltraCanvasGraph g{};g.revision=++revision;g.node_count=5;g.edge_count=5;
 const unsigned kinds[]={60,65,12,13,14};
 for(unsigned i=0;i<5;++i){g.nodes[i].id=i+1;g.nodes[i].kind=kinds[i];}
 g.nodes[0].p0=4;g.nodes[2].p0=127;
 g.edges[0]={1,1,2,0};g.edges[1]={2,0,3,0};
 g.edges[2]={3,0,4,0};g.edges[3]={3,0,4,1};g.edges[4]={4,0,5,0};return g;
}
AliveSessionConfig prepare(unsigned tracks=1){
 ultra_audio_stop();assert(alive_session_reset());
 for(unsigned d=0;d<16;++d)assert(ultra_canvas_close_document(d));
 AliveSessionConfig c{};c.version=1;c.track_count=tracks;c.length_frames=256;
 for(unsigned t=0;t<tracks;++t){auto g=instrument();assert(ultra_canvas_install_document(t,&g));
  auto& tr=c.tracks[t];tr.document=t;tr.note_node=1;tr.revision=g.revision;
  tr.output_channels=2;tr.output_layout=2;tr.gain=1;tr.parameter_count=1;
  tr.parameters[0]={3,0,1,0,127,0,127};}
 return c;
}
std::array<float,1024> l{},r{};
void render(unsigned n){callback_guard::begin();int ok=ultra_external_render(n,l.data(),r.data());callback_guard::end();assert(ok);}
AliveSessionState state(){AliveSessionState s{};assert(alive_session_state(&s));return s;}
void add(AliveSessionConfig& c,uint64_t frame,unsigned track,unsigned kind,unsigned target,double value){c.events[c.event_count++]={frame,track,kind,target,0,value};}
std::vector<float> score(const std::vector<unsigned>& blocks){
 auto c=prepare();c.length_frames=2048;add(c,0,0,2,60,127);add(c,1,0,0,60,0);
 add(c,31,0,2,61,127);add(c,63,0,1,0,64);
 add(c,64,0,0,61,0);add(c,127,0,2,62,127);
 assert(alive_session_configure(&c));assert(ultra_external_start());assert(alive_session_start());
 std::vector<float> out;unsigned at=0,b=0;
 while(at<2048){const unsigned n=std::min(blocks[b++%blocks.size()],2048-at);render(n);
  for(unsigned i=0;i<n;++i){const unsigned f=at+i;const float expected=(f==0||(f>=31&&f<63))?.25f:(f==63||f>=127)?float(.25*64/127):0.f;assert(l[i]==expected&&r[i]==expected);out.push_back(l[i]);}at+=n;}
 assert(!state().playing&&state().position==2048);return out;
}
void ownership_and_stop(){
 auto c=prepare();add(c,0,0,1,0,64);add(c,0,0,2,60,127);
 assert(alive_session_configure(&c));assert(ultra_external_start());assert(alive_session_start());render(32);
 assert(alive_session_base(0,0,100));render(1);auto s=state();assert(s.tracks[0].base[0]==100&&s.tracks[0].effective[0]==64&&s.tracks[0].owned[0]);
 assert(!ultra_canvas_param_document(0,c.tracks[0].revision,3,0,30));
 unsigned accepted=0;while(alive_session_mixer(0,1,0,0))++accepted;assert(accepted==64);
 alive_session_stop();render(32);s=state();assert(!s.playing&&s.tracks[0].effective[0]==100&&!s.tracks[0].owned[0]);for(unsigned i=0;i<32;++i)assert(l[i]==0&&r[i]==0);
 assert(alive_session_seek(20));assert(alive_session_start());render(1);s=state();assert(s.position==21&&s.tracks[0].effective[0]==64&&s.tracks[0].active_voices==0);
 auto replacement=instrument();assert(!ultra_canvas_install_document(0,&replacement));
}
void isolation_loop_mixer(){
 auto c=prepare(2);c.loop_enabled=1;c.loop_start=0;c.loop_end=64;
 c.tracks[1].parameters[0].automated=0;c.tracks[1].parameters[0].base=64;
 add(c,0,0,2,60,127);add(c,0,1,2,60,127);add(c,63,0,0,60,0);
 assert(alive_session_configure(&c));assert(ultra_external_start());assert(alive_session_start());render(65);
 assert(l[0]==float(.25+.25*64/127)&&l[63]==float(.25*64/127)&&l[64]==float(.25+.25*64/127));assert(state().generation>=2);
 assert(alive_session_mixer(0,1,0,1));render(1);assert(l[0]==.25f);
 assert(alive_session_mixer(0,1,1,1));render(1);assert(l[0]==0&&state().peak_left==0);
 alive_session_stop();render(1);ultra_audio_stop();assert(alive_session_reset());assert(ultra_canvas_close_document(0));
}
void admission(){
 auto c=prepare();assert(alive_session_configure(&c));c.tracks[0].output_channels=4;assert(!alive_session_configure(&c));
 c.tracks[0].output_channels=2;for(unsigned i=0;i<33;++i)add(c,0,0,2,60,127);assert(!alive_session_configure(&c));assert(state().configured);
 c=prepare();auto graph=instrument();c.tracks[0].revision=graph.revision;
 assert(alive_session_validate_prepared(&c,&graph,1));
 add(c,0,0,1,0,63.5);assert(!alive_session_validate_prepared(&c,&graph,1));
 c.event_count=0;graph.nodes[graph.node_count].id=99;graph.nodes[graph.node_count++].kind=11;
 assert(!alive_session_validate_graph(&c.tracks[0],&graph));assert(std::strstr(alive_session_error(),"legacy"));
 graph.nodes[graph.node_count-1].kind=26;std::strcpy(graph.nodes[graph.node_count-1].text,"outside");
 assert(!alive_session_validate_graph(&c.tracks[0],&graph));assert(std::strstr(alive_session_error(),"Send/Receive"));
 c=prepare();add(c,0,0,2,60,127);assert(alive_session_configure(&c));c.tracks[0].output_layout=1;assert(!alive_session_configure(&c));
 assert(ultra_external_start());assert(alive_session_start());render(1);assert(l[0]==.25f);
 c=prepare();c.length_frames=1024;c.loop_enabled=1;c.loop_end=512;
 for(unsigned i=0;i<32;++i)add(c,i*16,0,2,60,127);
 assert(alive_session_validate(&c));add(c,511,0,2,60,127);assert(!alive_session_validate(&c));
}
void shared_frame_and_sustain(){
 auto c=prepare();add(c,0,0,2,60,127);add(c,1,0,3,0,127);add(c,31,0,0,60,0);add(c,32,0,1,0,64);
 add(c,63,0,3,0,0);add(c,64,0,1,0,127);add(c,64,0,2,60,127);add(c,127,0,0,60,0);
 assert(alive_session_configure(&c));assert(ultra_external_start());assert(alive_session_start());render(128);
 for(unsigned i=0;i<128;++i){const float expected=i<32?.25f:i<63?float(.25*64/127):i==63||i==127?0.f:.25f;assert(l[i]==expected&&r[i]==expected);}
 alive_session_stop();render(1);assert(state().tracks[0].active_voices==0);
}
void chase_disable_remove(){
 auto c=prepare();add(c,31,0,1,0,64);add(c,31,0,2,60,127);
 assert(alive_session_configure(&c));assert(ultra_external_start());assert(alive_session_seek(10));assert(alive_session_start());render(1);
 assert(state().tracks[0].effective[0]==127&&state().tracks[0].owned[0]);
 assert(alive_session_seek(40));render(1);assert(state().tracks[0].effective[0]==64&&state().tracks[0].active_voices==0);
 assert(alive_session_start());alive_session_stop();render(1);assert(!state().playing);
 const auto absolute=state().absolute_frame;render(32);assert(state().absolute_frame==absolute+32);
 ultra_audio_stop();c.event_count=0;c.tracks[0].parameters[0].automated=0;assert(alive_session_configure(&c));
 assert(ultra_external_start());assert(alive_session_start());render(1);assert(!state().tracks[0].owned[0]&&state().tracks[0].effective[0]==127);
 ultra_audio_stop();assert(alive_session_reset());assert(ultra_canvas_close_document(0));assert(ultra_external_start());render(128);for(unsigned i=0;i<128;++i)assert(l[i]==0&&r[i]==0);
}
void measured_paths(){
 for(unsigned offset:{0u,1u,31u,63u,64u,127u}){
  auto c=prepare();add(c,offset,0,2,60,127);assert(alive_session_configure(&c));assert(ultra_external_start());assert(alive_session_start());render(256);
  const auto native=std::find_if(l.begin(),l.begin()+256,[](float v){return v!=0;})-l.begin();assert(native==offset);
  ultra_audio_stop();assert(alive_session_reset());
  alive::Engine legacy;assert(legacy.init());assert(legacy.submit({offset,0,alive::Kind::On,60,127}));
  callback_guard::begin();legacy.render(l.data(),r.data(),nullptr,256);callback_guard::end();assert(!legacy.status().fault);
  const auto guest=std::find_if(l.begin(),l.begin()+256,[](float v){return v!=0;})-l.begin();assert(guest==offset+64);
  std::printf("placement input=%u native=%td legacy=%td host_alignment=0\n",offset,native,guest);
 }
}
}
int main(){const auto expected=score({1});assert(score({32,64,127,1024})==expected);ownership_and_stop();isolation_loop_mixer();admission();shared_frame_and_sustain();chase_disable_remove();measured_paths();ultra_audio_stop();assert(alive_session_reset());std::puts("PASS: Alive exact frames, partitions, ownership, overload Stop, seek, loop, isolation, mono join, mixer and callback guard");}
