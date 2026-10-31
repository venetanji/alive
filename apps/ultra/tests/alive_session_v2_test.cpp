#include "../src-tauri/native/backend.h"
#include "../src-tauri/native/alive_session.hpp"
#include "canvas_callback_guard.hpp"
#include <algorithm>
#include <array>
#include <cassert>
#include <chrono>
#include <cstdio>
#include <cstring>
#include <cstddef>
#include <vector>

namespace {
#if INTPTR_MAX == INT64_MAX
static_assert(sizeof(AliveSessionTrack)==688);
static_assert(sizeof(AliveSessionEvent)==32);
static_assert(sizeof(AliveSessionConfig)==34184);
static_assert(sizeof(AliveSessionTrackState)==360);
static_assert(sizeof(AliveSessionState)==784);
static_assert(offsetof(AliveSessionTrack,revision)==24);
static_assert(offsetof(AliveSessionTrack,parameters)==48);
static_assert(offsetof(AliveSessionConfig,tracks)==40);
static_assert(offsetof(AliveSessionConfig,events)==1416);
static_assert(offsetof(AliveSessionState,tracks)==64);
static_assert(sizeof(AliveSessionParameter)==40);
static_assert(sizeof(AliveSessionDeviceV2)==696);
static_assert(sizeof(AliveSessionTrackV2)==32);
static_assert(sizeof(AliveSessionEventV2)==32);
static_assert(sizeof(AliveSessionConfigV2)==37064);
static_assert(sizeof(AliveSessionTrackStateV2)==40);
static_assert(sizeof(AliveSessionDeviceStateV2)==344);
static_assert(sizeof(AliveSessionStateV2)==2216);
#endif
static_assert(ultra::CanvasWorkspace::MaxDocuments==16);
static_assert(alive::DocumentDevices==32);
uint64_t revision=20000;
std::array<float,1024> left{},right{};
std::array<UltraCanvasGraph,6> graphs{};
UltraCanvasGraph instrument(){
 UltraCanvasGraph g{};g.revision=++revision;g.node_count=5;g.edge_count=5;
 const unsigned kinds[]={60,65,12,13,14};
 for(unsigned i=0;i<5;++i){g.nodes[i].id=i+1;g.nodes[i].kind=kinds[i];}
 g.nodes[0].p0=4;g.nodes[2].p0=127;
 g.edges[0]={1,1,2,0};g.edges[1]={2,0,3,0};g.edges[2]={3,0,4,0};g.edges[3]={3,0,4,1};g.edges[4]={4,0,5,0};return g;
}
UltraCanvasGraph effect(bool filter){
 UltraCanvasGraph g{};g.revision=++revision;g.node_count=filter?3:5;g.nodes[0].id=1;g.nodes[0].kind=66;
 if(filter){g.nodes[1].id=2;g.nodes[1].kind=67;g.nodes[1].p0=2400;g.nodes[1].p1=.7;
  g.nodes[2].id=3;g.nodes[2].kind=ultra::SignalDac;std::strcpy(g.nodes[2].text,"1 2");
  for(unsigned ch=0;ch<2;++ch){g.edges[g.edge_count++]={1,ch,2,ch};g.edges[g.edge_count++]={2,ch,3,ch};}
 }else{
  for(unsigned i=1;i<5;++i)g.nodes[i].id=i+1;
  g.nodes[1].kind=ultra::LineSignal;g.nodes[1].p0=1;
  g.nodes[2].kind=g.nodes[3].kind=ultra::SignalMultiply;g.nodes[4].kind=ultra::SignalDac;std::strcpy(g.nodes[4].text,"1 2");
  for(unsigned ch=0;ch<2;++ch){g.edges[g.edge_count++]={1,ch,3+ch,0};g.edges[g.edge_count++]={2,0,3+ch,1};g.edges[g.edge_count++]={3+ch,0,5,ch};}
 }return g;
}
void cleanup(){ultra_audio_stop();assert(alive_session_reset());for(unsigned d=0;d<16;++d)assert(ultra_canvas_close_document(d));}
AliveSessionConfigV2 prepare(unsigned tracks=1,bool reverse=false){
 cleanup();AliveSessionConfigV2 c{};c.version=2;c.struct_bytes=sizeof c;c.track_count=tracks;c.device_count=tracks*3;c.length_frames=2048;
 const unsigned documents[]={9,3,12,1,15,6};
 for(unsigned t=0;t<tracks;++t){const unsigned b=t*3;graphs[b]=effect(false);graphs[b+1]=effect(true);graphs[b+2]=instrument();
  auto& tr=c.tracks[t];tr.instrument=b+2;tr.effect_count=2;tr.effects[0]=b+(reverse?1:0);tr.effects[1]=b+(reverse?0:1);tr.gain=1;
  for(unsigned i=b;i<b+3;++i){auto& d=c.devices[i];d.document=documents[i];d.revision=graphs[i].revision;d.output_channels=2;d.output_layout=2;d.parameter_count=1;
   if(i==b+2){d.kind=1;d.note_node=1;d.parameters[0]={3,0,0,0,127,0,127};}
   else {d.kind=2;d.input_node=1;d.input_channels=2;d.input_layout=2;d.parameters[0]={2,0,0,0,i==b?1.:2400.,i==b?0.:20.,i==b?2.:20000.};}
   assert(ultra_canvas_install_document(d.document,&graphs[i]));
  }
 }return c;
}
void add(AliveSessionConfigV2& c,uint64_t frame,unsigned track,unsigned kind,unsigned device,unsigned target,double value){c.events[c.event_count++]={frame,track,kind,device,target,value};}
void impulse(AliveSessionConfigV2& c,unsigned track=0){add(c,0,track,2,c.tracks[track].instrument,60,127);add(c,1,track,0,c.tracks[track].instrument,60,0);}
void render(unsigned n){callback_guard::begin();const int ok=ultra_external_render(n,left.data(),right.data());callback_guard::end();assert(ok);}
AliveSessionStateV2 state(){AliveSessionStateV2 s{};s.version=2;s.struct_bytes=sizeof s;assert(alive_session_state_v2(&s));return s;}
void assert_score_unchanged(AliveSessionStateV2 before, AliveSessionStateV2 after) {
  // The rejection counter is sampled independently of the published score.
  before.rejected=after.rejected=0;
  assert(std::memcmp(&before,&after,sizeof before)==0);
}
void master_rejection_freshness_v2() {
  auto c=prepare();assert(alive_session_configure_v2(&c));
  AliveSessionStateV2 score{};score.version=2;score.struct_bytes=sizeof score;
  AliveMasterStateV1 master{};master.version=1;master.struct_bytes=sizeof master;
  assert(alive_session_master_snapshot_v2(&score,&master)==ALIVE_MASTER_OK);
  auto before=score;auto legacy_before=state();auto master_before=master;const auto base=score.rejected;
  assert(!alive_session_validate_prepared_v2(&c,nullptr,0));
  auto legacy_after=state();assert(legacy_after.rejected==base+1);
  assert_score_unchanged(legacy_before,legacy_after);
  assert(alive_session_master_snapshot_v2(&score,&master)==ALIVE_MASTER_OK);
  assert(score.rejected==base+1);
  assert_score_unchanged(before,score);
  assert(std::memcmp(&master,&master_before,sizeof master)==0);
  assert(alive_session_master_set(1,0.5,987654)==ALIVE_MASTER_OK);
  assert(alive_session_master_snapshot_v2(&score,&master)==ALIVE_MASTER_OK);
  assert(score.rejected==base+1);
  before=score;legacy_before=state();master_before=master;
  assert(!alive_session_validate_prepared_v2(&c,nullptr,0));
  legacy_after=state();assert(legacy_after.rejected==base+2);
  assert_score_unchanged(legacy_before,legacy_after);
  assert(alive_session_master_snapshot_v2(&score,&master)==ALIVE_MASTER_OK);
  assert(score.rejected==base+2);
  assert_score_unchanged(before,score);
  assert(std::memcmp(&master,&master_before,sizeof master)==0);
}
void start(const AliveSessionConfigV2& c){const int configured=alive_session_configure_v2(&c);if(!configured)std::fprintf(stderr,"v2 configure: %s (tracks=%u devices=%u events=%u)\n",alive_session_error(),c.track_count,c.device_count,c.event_count);assert(configured);assert(ultra_external_start());assert(alive_session_start());}
std::vector<float> ordered(bool reverse,const std::vector<unsigned>& partitions){
 auto c=prepare(1,reverse);c.devices[0].parameters[0].automated=1;impulse(c);add(c,1,0,1,0,0,0);start(c);
 std::vector<float> out;for(unsigned at=0,b=0;at<2048;){const unsigned n=std::min(partitions[b++%partitions.size()],2048-at);render(n);for(unsigned f=0;f<n;++f){assert(left[f]==right[f]);out.push_back(left[f]);}at+=n;}
 assert(out[0]>0);assert(reverse?out[1]==0:out[1]>0);assert(!state().playing);return out;
}
void order_and_partitions(){
 const auto forward=ordered(false,{1});assert(forward==ordered(false,{31,63,64,127,1024}));
 const auto reverse=ordered(true,{1});assert(reverse==ordered(true,{1024,127,64,63,31,1}));assert(forward!=reverse);
}
void bypass_and_warm_state(){
 auto c=prepare();impulse(c);start(c);render(128);const auto wet=left;
 c=prepare();impulse(c);c.devices[1].bypassed=1;start(c);render(1);assert(left[0]==.25f);render(30);for(unsigned i=0;i<30;++i)assert(left[i]==0);
 assert(alive_session_bypass_v2(c.devices[1].document,c.devices[1].revision,0));render(97);for(unsigned i=0;i<97;++i)assert(left[i]==wet[i+31]);
 // A live wet-to-dry toggle selects the matching dry sample at this boundary.
 c=prepare();impulse(c);start(c);render(31);for(unsigned i=0;i<31;++i)assert(left[i]==wet[i]);
 assert(alive_session_bypass_v2(c.devices[1].document,c.devices[1].revision,1));render(33);for(unsigned i=0;i<33;++i)assert(left[i]==0&&right[i]==0);
 assert(alive_session_bypass_v2(c.devices[1].document,c.devices[1].revision,0));render(64);for(unsigned i=0;i<64;++i)assert(left[i]==wet[i+64]);
 auto s=state();assert(!s.devices[1].bypassed);
 // Muting a chain only suppresses its endpoint; its filter still advances.
 c=prepare();impulse(c);start(c);render(1);assert(alive_session_mixer(0,1,1,0));render(30);for(unsigned i=0;i<30;++i)assert(left[i]==0);
 assert(alive_session_mixer(0,1,0,0));render(97);for(unsigned i=0;i<97;++i)assert(left[i]==wet[i+31]);
 c=prepare(2);impulse(c);start(c);render(1);
 assert(alive_session_mixer(1,1,0,1));render(30);for(unsigned i=0;i<30;++i)assert(left[i]==0);
 assert(alive_session_mixer(1,1,0,0));render(97);for(unsigned i=0;i<97;++i)assert(left[i]==wet[i+31]);
}
void endpoint_sum_and_short_chains(){
 auto c=prepare();impulse(c);start(c);render(64);const auto single=left;
 c=prepare(2);add(c,0,0,2,2,60,127);add(c,0,1,2,5,60,127);add(c,1,0,0,2,60,0);add(c,1,1,0,5,60,0);
 c.tracks[0].gain=.5;c.tracks[1].gain=2;start(c);render(64);
 double peak=0;for(unsigned i=0;i<64;++i){assert(std::abs(left[i]-single[i]*2.5)<1e-8);peak=std::max(peak,double(std::abs(left[i])));}
 const auto s=state();assert(std::abs(s.peak_left-peak)<1e-8);assert(s.tracks[1].peak_left==s.tracks[0].peak_left*4);
 for(unsigned effects=0;effects<2;++effects){c=prepare();
  assert(ultra_canvas_close_document(c.devices[1].document));if(!effects)assert(ultra_canvas_close_document(c.devices[0].document));
  c.devices[effects]=c.devices[2];c.device_count=effects+1;c.tracks[0].instrument=effects;c.tracks[0].effect_count=effects;
  c.devices[0].parameters[0].base=effects?.5:127;impulse(c);start(c);render(2);assert(left[0]==(effects?.125f:.25f)&&left[1]==0);
 }
}
void additional_input_readers(){
 auto c=prepare();impulse(c);start(c);render(64);const auto expected=left;
 c=prepare(2);
 // Both readers consume the same stereo instance bundle, even when the
 // declared binding names only the first reader.
 auto& utility=graphs[0];utility.revision=++revision;utility.nodes[utility.node_count].id=6;utility.nodes[utility.node_count++].kind=ultra::AudioIn;utility.edges[3].from=6;
 c.devices[0].revision=utility.revision;
 assert(alive_session_validate_device_v2(&c.devices[0],&utility));
 assert(ultra_canvas_install_document(c.devices[0].document,&utility));
 // Incidental instrument readers get zero external input. In particular the
 // silent second instrument cannot acquire the first chain's filter output.
 for(unsigned device:{2u,5u}){auto& graph=graphs[device];graph.revision=++revision;
  auto& input=graph.nodes[graph.node_count++];input.id=6;input.kind=ultra::AudioIn;
  auto& sink=graph.nodes[graph.node_count++];sink.id=7;sink.kind=ultra::SignalDac;std::strcpy(sink.text,"1 2");
  graph.edges[graph.edge_count++]={6,0,7,0};graph.edges[graph.edge_count++]={6,1,7,1};c.devices[device].revision=graph.revision;
  assert(alive_session_validate_device_v2(&c.devices[device],&graph));assert(ultra_canvas_install_document(c.devices[device].document,&graph));
 }
 impulse(c);start(c);render(64);for(unsigned i=0;i<64;++i)assert(left[i]==expected[i]&&right[i]==expected[i]);
}
void ownership_and_isolation(){
 auto c=prepare(2);c.devices[0].parameters[0].automated=1;
 add(c,0,0,1,0,0,.5);add(c,0,0,2,2,60,127);add(c,0,1,2,5,60,127);start(c);render(32);
 assert(alive_session_base_v2(c.devices[0].document,c.devices[0].revision,0,.25));render(1);auto s=state();
 assert(s.devices[0].base[0]==.25&&s.devices[0].effective[0]==.5&&s.devices[0].owned[0]);assert(s.devices[3].effective[0]==1&&!s.devices[3].owned[0]);
 assert(alive_session_base(0,0,64));render(1);s=state();AliveSessionState legacy{};assert(alive_session_state(&legacy));
 assert(s.devices[2].base[0]==64&&s.devices[5].base[0]==127&&s.devices[0].base[0]==.25);
 assert(legacy.absolute_frame==s.absolute_frame&&legacy.position==s.position&&legacy.tracks[0].base[0]==64&&legacy.tracks[0].effective[0]==64&&!legacy.tracks[0].owned[0]);
 assert(!alive_session_base_v2(0,c.devices[0].revision,0,1));assert(!alive_session_base_v2(c.devices[0].document,c.devices[0].revision+1,0,1));
 assert(!alive_session_bypass_v2(c.devices[0].document,c.devices[0].revision+1,1));assert(!alive_session_bypass_v2(c.devices[2].document,c.devices[2].revision,1));
 assert(!ultra_canvas_param_document(c.devices[0].document,c.devices[0].revision,2,0,1));assert(!ultra_canvas_close_document(c.devices[1].document));
 auto replacement=effect(true);assert(!ultra_canvas_install_document(c.devices[1].document,&replacement));
 unsigned accepted=0;while(alive_session_bypass_v2(c.devices[1].document,c.devices[1].revision,accepted&1))++accepted;assert(accepted==64);
 assert(!alive_session_base_v2(c.devices[0].document,c.devices[0].revision,0,.125));
 alive_session_stop();render(1);assert(left[0]==0);s=state();assert(!s.playing&&!s.devices[0].owned[0]&&s.devices[0].effective[0]==.25);
 // Reinstallation invalidates the old document/revision handle, even if dense indices agree.
 const auto old=c.devices[0];c=prepare();start(c);assert(!alive_session_base_v2(old.document,old.revision,0,1));assert(!alive_session_bypass_v2(old.document,old.revision,1));
}
void hard_resets(){
 for(unsigned reason=0;reason<6;++reason)for(unsigned bypassed=0;bypassed<2;++bypassed){
  auto c=prepare();impulse(c);c.devices[1].bypassed=bypassed;
  if(reason==2){c.loop_enabled=1;c.loop_start=10;c.loop_end=32;}
  if(reason==3)c.length_frames=32;
  start(c);render(31);
  if(reason==0)alive_session_stop();
  if(reason==1)assert(alive_session_seek(100));
  render(1);
  if(reason>=4){ultra_audio_stop();assert(alive_session_reset());for(const auto& d:c.devices)if(d.revision)assert(ultra_canvas_close_document(d.document));
   if(reason==5){c=prepare();c.event_count=0;start(c);}else assert(ultra_external_start());
  }else {assert(alive_session_bypass_v2(c.devices[1].document,c.devices[1].revision,0));}
  render(32);for(unsigned i=0;i<32;++i)assert(left[i]==0&&right[i]==0);
 }
}
void admission(){
 auto c=prepare(2);assert(alive_session_validate_v2(&c));assert(alive_session_validate_prepared_v2(&c,graphs.data(),6));
 auto bad=c;bad.version=1;assert(!alive_session_validate_v2(&bad));bad=c;--bad.struct_bytes;assert(!alive_session_validate_v2(&bad));bad=c;bad.reserved1=1;assert(!alive_session_validate_v2(&bad));
 bad=c;bad.track_count=3;assert(!alive_session_validate_v2(&bad));bad=c;bad.device_count=17;assert(!alive_session_validate_v2(&bad));bad=c;bad.tracks[0].effect_count=3;assert(!alive_session_validate_v2(&bad));
 bad=c;bad.tracks[0].effects[1]=0;assert(!alive_session_validate_v2(&bad));bad=c;std::swap(bad.tracks[0].effects[0],bad.tracks[1].effects[0]);add(bad,0,0,1,0,0,1);assert(!alive_session_validate_v2(&bad));
 bad=c;bad.devices[1].document=bad.devices[0].document;assert(!alive_session_validate_v2(&bad));bad=c;bad.devices[1].input_layout=1;assert(!alive_session_validate_v2(&bad));
 bad=c;bad.devices[1].reserved0=1;assert(!alive_session_validate_v2(&bad));bad=c;bad.devices[2].bypassed=1;assert(!alive_session_validate_v2(&bad));bad=c;bad.devices[1].note_node=1;assert(!alive_session_validate_v2(&bad));
 bad=c;--bad.track_count;assert(!alive_session_validate_v2(&bad));bad=c;bad.devices[1].bypassed=2;assert(!alive_session_validate_v2(&bad));
 bad=c;add(bad,0,0,2,0,60,127);assert(!alive_session_validate_v2(&bad));bad=c;add(bad,0,1,3,2,0,127);assert(!alive_session_validate_v2(&bad));
 bad=c;for(unsigned d=0;d<3;++d){bad.devices[d].parameter_count=d==2?1:8;for(unsigned p=0;p<bad.devices[d].parameter_count;++p)bad.devices[d].parameters[p]={100+p,0,1,0,1,0,2};}assert(!alive_session_validate_v2(&bad));
 bad=c;bad.length_frames=8192;bad.devices[0].parameters[0].automated=1;for(unsigned i=0;i<257;++i)add(bad,i*16,0,1,0,0,1);assert(!alive_session_validate_v2(&bad));
 bad=c;bad.length_frames=4096;for(unsigned i=0;i<129;++i)add(bad,i*16,0,2,2,60,127);assert(!alive_session_validate_v2(&bad));
 assert(!alive_session_validate_prepared_v2(&c,graphs.data(),5));
 auto graph=graphs[1];graph.nodes[0].kind=ultra::LineSignal;assert(!alive_session_validate_device_v2(&c.devices[1],&graph));
 graph=graphs[2];graph.nodes[graph.node_count].id=10;graph.nodes[graph.node_count++].kind=ultra::Voice;assert(!alive_session_validate_device_v2(&c.devices[2],&graph));
 graph=graphs[0];graph.nodes[4].text[0]='2';assert(!alive_session_validate_device_v2(&c.devices[0],&graph));
 bad=c;for(unsigned i=0;i<33;++i)add(bad,0,0,2,2,60,127);assert(!alive_session_validate_v2(&bad));
 bad=c;for(unsigned i=0;i<65;++i)add(bad,i*2,0,2,2,60,127);assert(!alive_session_validate_v2(&bad));
 bad=c;bad.loop_enabled=1;bad.loop_end=512;for(unsigned i=0;i<33;++i)add(bad,i*15,0,2,2,60,127);assert(!alive_session_validate_v2(&bad));
 AliveSessionStateV2 invalid{};assert(!alive_session_state_v2(&invalid));assert(invalid.version==0);
 // Failed prospective admission preserves the current configuration.
 assert(alive_session_configure_v2(&c));assert(!alive_session_configure_v2(&bad));assert(state().device_count==6);
 start(c);assert(!alive_session_configure_v2(&bad));assert(state().device_count==6);
}
void legacy_admission_policy(){
 AliveSessionConfig c{};c.version=1;c.track_count=1;c.length_frames=128;
 auto& t=c.tracks[0];t.document=0;t.revision=1;t.output_channels=2;t.output_layout=2;t.gain=1;t.reserved=123;
 // V1 config-only validation did not require a note-node binding or inspect
 // reserved fields. Graph validation remains responsible for the entry node.
 assert(alive_session_validate(&c));
 auto graph=instrument();t.note_node=1;t.revision=graph.revision;
 for(unsigned i=0;i<2;++i){auto& sink=graph.nodes[graph.node_count++];sink.id=6+i;sink.kind=ultra::SignalDac;std::strcpy(sink.text,"1 2");}
 assert(alive_session_validate_graph(&t,&graph));
 assert(alive_session_validate_prepared(&c,&graph,1));
}
void initial_snapshot(){
 const auto s=state();assert(s.version==2&&s.struct_bytes==sizeof s&&!s.configured&&!s.device_count);
}
void measured_six_device_paths(){
 auto c=prepare(2);c.length_frames=24576000;
 // Full 1024-event schedule: 128 note pairs and 256 automation points per
 // track, exactly 64 events/1024 frames. Seek near its end scans it all.
 for(unsigned i=0;i<512;++i){const unsigned track=i%2,n=i/2;add(c,i*16,track,n<128?2:0,track*3+2,n%128,n<128?127:0);}
 for(unsigned i=0;i<512;++i){const unsigned track=i%2,device=track*3+(i/2)%3;c.devices[device].parameters[0].automated=1;add(c,(i+512)*16,track,1,device,0,c.devices[device].parameters[0].base);}
 c.loop_enabled=1;c.loop_end=16384;start(c);render(1024);
 using Clock=std::chrono::steady_clock;
 const auto begin=Clock::now();for(unsigned i=0;i<100;++i)render(1024);const auto dense=std::chrono::duration<double,std::micro>(Clock::now()-begin).count()/100;
 const auto reset_begin=Clock::now();for(unsigned i=0;i<100;++i){assert(alive_session_seek(16380));render(1);}const auto reset=std::chrono::duration<double,std::micro>(Clock::now()-reset_begin).count()/100;
 std::printf("six-device dense 1024-frame callback mean_us=%.3f; six-device seek+one-frame mean_us=%.3f (wall clock, no deadline claim)\n",dense,reset);
}
}
int main(){initial_snapshot();master_rejection_freshness_v2();order_and_partitions();bypass_and_warm_state();endpoint_sum_and_short_chains();additional_input_readers();ownership_and_isolation();hard_resets();admission();legacy_admission_policy();measured_six_device_paths();cleanup();std::puts("PASS: v2 ordered chains, exact bypass/warm state, partitions, ownership, resets, admission, overload and callback guard");}
