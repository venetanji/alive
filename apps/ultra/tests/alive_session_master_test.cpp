#include "../src-tauri/native/alive_session.h"
#include "../src-tauri/native/backend.h"
#include "../../../docs/contracts/alive-master-v1.h"
#include <cassert>
#include <dlfcn.h>
#include <initializer_list>
#include <atomic>
#include <algorithm>
#include <thread>
#include <limits>
#include <cstring>
#include <cmath>

int main() {
  Dl_info anchor_info{};
  auto anchor=reinterpret_cast<void*>(&alive_session_error);
  assert(dladdr(anchor,&anchor_info));
  void* library = dlopen(anchor_info.dli_fname, RTLD_NOW | RTLD_NOLOAD);
  assert(library);
  assert(dlsym(library,"alive_session_error")==anchor);
  for(const char* symbol:{"alive_session_master_limits","alive_session_master_set","alive_session_master_reset_clip","alive_session_master_snapshot_v2","alive_session_master_snapshot_v3","alive_session_master_snapshot_v4"}){
    auto address=dlsym(library,symbol);Dl_info info{};
    assert(address && dladdr(address,&info) && info.dli_fbase==anchor_info.dli_fbase);
  }
  using Limits = int (*)(AliveMasterLimitsV1*);
  auto limits = reinterpret_cast<Limits>(dlsym(library, "alive_session_master_limits"));
  assert(limits && "native Master limits must be exported");
  AliveMasterLimitsV1 out{ALIVE_MASTER_V1, sizeof(out), 0, 0, 0};
  assert(limits(&out) == ALIVE_MASTER_OK);
  assert(out.features == 7 && out.ramp_frames == 64 && out.max_gain == 4);
  AliveMasterLimitsV1 invalid{2, sizeof(invalid), 42, 43, 44};
  assert(limits(&invalid) == ALIVE_MASTER_UNSUPPORTED);
  assert(invalid.version == 2 && invalid.features == 42 && invalid.ramp_frames == 43 && invalid.max_gain == 44);
  assert(limits(nullptr) == ALIVE_MASTER_INVALID);
  using Set = int (*)(uint32_t, double, uint64_t);
  using Reset = int (*)(uint32_t, uint64_t);
  using Snapshot = int (*)(AliveSessionStateV2*, AliveMasterStateV1*);
  auto set = reinterpret_cast<Set>(dlsym(library, "alive_session_master_set"));
  auto reset = reinterpret_cast<Reset>(dlsym(library, "alive_session_master_reset_clip"));
  auto snapshot = reinterpret_cast<Snapshot>(dlsym(library, "alive_session_master_snapshot_v2"));
  assert(set && reset && snapshot && "native Master commands and combined snapshot must be exported");
  assert(set(1, 0.5, 1) == ALIVE_MASTER_UNCONFIGURED);
  UltraCanvasGraph graph{}; graph.revision=100; graph.node_count=5; graph.edge_count=5;
  const unsigned kinds[]={60,65,12,13,14};
  for(unsigned i=0;i<5;++i){graph.nodes[i].id=i+1;graph.nodes[i].kind=kinds[i];}
  graph.nodes[0].p0=4;graph.nodes[2].p0=127;
  graph.edges[0]={1,1,2,0};graph.edges[1]={2,0,3,0};graph.edges[2]={3,0,4,0};graph.edges[3]={3,0,4,1};graph.edges[4]={4,0,5,0};
  assert(ultra_canvas_install_document(0,&graph));
  AliveSessionConfig config{};config.version=1;config.track_count=1;config.length_frames=256;
  auto& track=config.tracks[0];track.document=0;track.note_node=1;track.revision=graph.revision;track.output_channels=2;track.output_layout=2;track.gain=1;
  track.parameter_count=1;track.parameters[0]={3,0,1,0,127,0,127};
  config.events[0]={0,0,ALIVE_SESSION_NOTE_ON,60,0,127};config.event_count=1;
  auto unrelated=graph;unrelated.revision=101;assert(ultra_canvas_install_document(1,&unrelated));
  assert(!alive_session_configure(&config));assert(ultra_canvas_close_document(1));
  assert(alive_session_configure(&config));
  assert(set(1, 0.5, 1) == ALIVE_MASTER_OK);
  AliveSessionStateV2 score{};score.version=2;score.struct_bytes=sizeof(score);
  AliveMasterStateV1 master{};master.version=1;master.struct_bytes=sizeof(master);
  assert(snapshot(&score,&master)==ALIVE_MASTER_OK);
  assert(master.target_gain==0.5 && master.current_gain==0.5 && master.applied_serial==1);
  assert(master.applied_frame==score.absolute_frame && master.observation_start_frame==score.absolute_frame && master.observation_end_frame==score.absolute_frame);
  auto score_before=score;auto master_before=master;
  master.version=2;assert(snapshot(&score,&master)==ALIVE_MASTER_UNSUPPORTED);
  assert(score.absolute_frame==score_before.absolute_frame && master.version==2 && master.applied_serial==master_before.applied_serial);
  master=master_before;
  assert(ultra_external_start());assert(alive_session_start());
  float left[512]{},right[512]{};assert(ultra_external_render(1,left,right));assert(left[0]==0.125f && right[0]==0.125f);
  assert(set(1,1.,2)==ALIVE_MASTER_OK);assert(ultra_external_render(64,left,right));
  for(unsigned i=0;i<64;++i){const float expected=float(.25*(.5+.5*double(i+1)/64));assert(left[i]==expected&&right[i]==expected);}
  assert(snapshot(&score,&master)==ALIVE_MASTER_OK);
  assert(master.target_gain==1. && master.current_gain==1. && master.applied_serial==2);
  assert(master.applied_frame+64==score.absolute_frame && master.observation_end_frame==score.absolute_frame);
  assert(set(1,0.,3)==ALIVE_MASTER_OK);assert(ultra_external_render(17,left,right));
  for(unsigned i=0;i<17;++i){const float expected=float(.25*(1.-double(i+1)/64));assert(left[i]==expected&&right[i]==expected);}
  assert(set(1,1.,4)==ALIVE_MASTER_OK);assert(ultra_external_render(64,left,right));
  const double interrupted=1.-17./64.;
  for(unsigned i=0;i<64;++i){const float expected=float(.25*(interrupted+(1.-interrupted)*double(i+1)/64));assert(left[i]==expected&&right[i]==expected);}
  assert(set(1,-1.,3)==ALIVE_MASTER_INVALID && set(1,5.,3)==ALIVE_MASTER_INVALID && set(1,1.,0)==ALIVE_MASTER_INVALID);
  assert(set(1,std::numeric_limits<double>::quiet_NaN(),3)==ALIVE_MASTER_INVALID);
  assert(set(1,std::numeric_limits<double>::infinity(),3)==ALIVE_MASTER_INVALID);
  auto unchanged=master;master.reserved=1;
  assert(snapshot(&score,&master)==ALIVE_MASTER_INVALID && master.reserved==1 && master.applied_serial==unchanged.applied_serial);
  master.reserved=0;
  for(unsigned i=0;i<64;++i)assert(set(1,0.5,5+i)==ALIVE_MASTER_OK);
  assert(reset(1,69)==ALIVE_MASTER_FULL);
  alive_session_stop();assert(ultra_external_render(1,left,right));
  assert(snapshot(&score,&master)==ALIVE_MASTER_OK && !score.playing && master.applied_serial==68);
  assert(reset(1,70)==ALIVE_MASTER_OK);assert(ultra_external_render(1,left,right));
  assert(snapshot(&score,&master)==ALIVE_MASTER_OK && master.applied_serial==70 && master.clip_mask==0);
  ultra_audio_stop();assert(alive_session_reset());
  assert(alive_session_configure(&config));assert(set(1,0.7,100)==ALIVE_MASTER_OK);
  assert(ultra_external_start());assert(alive_session_start());assert(set(1,0.1,101)==ALIVE_MASTER_OK);
  assert(ultra_external_render(64,left,right));assert(snapshot(&score,&master)==ALIVE_MASTER_OK);
  assert(master.current_gain==0.7+(0.1-0.7));assert(left[63]==float(.25*(0.7+(0.1-0.7))));assert(ultra_external_render(1,left,right));
  assert(snapshot(&score,&master)==ALIVE_MASTER_OK && master.current_gain==0.1);
  assert(left[0]==float(.25*0.1));
  ultra_audio_stop();assert(alive_session_reset());
  config.length_frames=2048;
  uint64_t partition_serial=10000;
  for(unsigned partition:{1u,31u,32u,63u,64u,65u,127u,128u,256u,512u}){
    assert(alive_session_configure(&config));assert(set(1,0.5,++partition_serial)==ALIVE_MASTER_OK);
    assert(ultra_external_start());assert(alive_session_start());assert(ultra_external_render(1,left,right));
    assert(left[0]==0.125f && right[0]==0.125f);assert(set(1,1.,++partition_serial)==ALIVE_MASTER_OK);
    unsigned largest=0;
    for(unsigned at=0;at<512;){const unsigned n=std::min(partition,512-at);largest=std::max(largest,n);assert(ultra_external_render(n,left,right));
      for(unsigned i=0;i<n;++i){const unsigned frame=at+i;const double gain=frame<64?.5+.5*double(frame+1)/64:1.;const float expected=float(.25*gain);assert(left[i]==expected&&right[i]==expected);}at+=n;
    }
    assert(largest==partition);
    ultra_audio_stop();assert(alive_session_reset());
    assert(alive_session_configure(&config));assert(set(1,0.7,++partition_serial)==ALIVE_MASTER_OK);
    assert(ultra_external_start());assert(alive_session_start());assert(set(1,0.1,++partition_serial)==ALIVE_MASTER_OK);
    for(unsigned at=0;at<64;){const unsigned n=std::min(partition,64-at);assert(ultra_external_render(n,left,right));at+=n;}
    assert(snapshot(&score,&master)==ALIVE_MASTER_OK);const double last=0.7+(0.1-0.7);assert(master.current_gain==last);
    assert(set(1,0.7,++partition_serial)==ALIVE_MASTER_OK);assert(ultra_external_render(1,left,right));
    assert(snapshot(&score,&master)==ALIVE_MASTER_OK && master.current_gain==last+(0.7-last)/64.);
    ultra_audio_stop();assert(alive_session_reset());
  }
  assert(ultra_canvas_close_document(0));
  graph.revision=101;assert(ultra_canvas_install_document(0,&graph));
  track.revision=101;config.track_count=2;config.tracks[1]=track;
  graph.revision=102;assert(ultra_canvas_install_document(1,&graph));
  config.tracks[1].document=1;config.tracks[1].revision=102;
  config.events[1]={0,1,ALIVE_SESSION_NOTE_ON,60,0,127};config.event_count=2;
  assert(alive_session_configure(&config));assert(set(1,2.,71)==ALIVE_MASTER_OK);
  assert(ultra_external_start());assert(alive_session_start());assert(ultra_external_render(1,left,right));
  assert(left[0]==1.f && right[0]==1.f);assert(snapshot(&score,&master)==ALIVE_MASTER_OK && master.clip_mask==0);
  assert(set(1,4.,72)==ALIVE_MASTER_OK);assert(ultra_external_render(64,left,right));
  assert(left[63]==2.f && right[63]==2.f);assert(snapshot(&score,&master)==ALIVE_MASTER_OK);
  assert(master.clip_mask==3 && master.peak_left==2. && master.peak_right==2.);
  assert(reset(1,73)==ALIVE_MASTER_OK);assert(ultra_external_render(1,left,right));
  assert(snapshot(&score,&master)==ALIVE_MASTER_OK && master.clip_mask==3 && master.applied_serial==73);
  assert(set(1,0.5,74)==ALIVE_MASTER_OK);assert(reset(1,75)==ALIVE_MASTER_OK);assert(set(1,0.75,76)==ALIVE_MASTER_OK);
  const auto stopped_frame=score.absolute_frame;ultra_audio_stop();
  assert(snapshot(&score,&master)==ALIVE_MASTER_OK && master.applied_serial==76 && master.current_gain==0.75 && master.clip_mask==0);
  assert(set(1,0.25,77)==ALIVE_MASTER_OK);assert(snapshot(&score,&master)==ALIVE_MASTER_OK);
  assert(master.applied_serial==77 && master.current_gain==0.25 && master.target_gain==0.25 && master.applied_frame==stopped_frame);
  assert(master.clip_mask==0 && master.peak_left==0 && master.peak_right==0 && master.observation_end_frame==stopped_frame);
  assert(alive_session_reset());assert(ultra_canvas_close_document(0));assert(ultra_canvas_close_document(1));
  graph.revision=103;assert(ultra_canvas_install_document(0,&graph));
  config.track_count=1;config.event_count=1;track.revision=103;
  assert(alive_session_configure(&config));assert(set(1,0.5,72)==ALIVE_MASTER_OK);
  assert(alive_session_mixer(0,0.5,0,0));assert(ultra_external_start());
  assert(snapshot(&score,&master)==ALIVE_MASTER_OK);const auto rejected_base=score.rejected;
  std::atomic<bool> done{false};std::atomic<unsigned> reads{0};
  std::thread reader([&]{while(!done.load(std::memory_order_acquire)){
    AliveSessionStateV2 s{};s.version=2;s.struct_bytes=sizeof s;
    AliveMasterStateV1 m{};m.version=1;m.struct_bytes=sizeof m;
    const int result=snapshot(&s,&m);assert(result==ALIVE_MASTER_OK||result==ALIVE_MASTER_BUSY);
    if(result==ALIVE_MASTER_OK){assert(s.tracks[0].gain==m.target_gain);assert(m.applied_frame==m.observation_start_frame && m.observation_end_frame==s.absolute_frame);
      const auto completed=m.applied_serial==72?0:(m.applied_serial-72)/63;
      assert(s.rejected>=rejected_base+completed && s.rejected<=rejected_base+5000);++reads;}
  }});
  for(unsigned i=0;i<5000;++i){const double value=i%2?0.25:0.75;
    for(unsigned j=0;j<63;++j)assert(set(1,value,73+uint64_t(i)*63+j)==ALIVE_MASTER_OK);
    assert(alive_session_mixer(0,value,0,0));assert(!alive_session_mixer(0,value,0,0));assert(ultra_external_render(1,left,right));
  }
  done.store(true,std::memory_order_release);reader.join();assert(reads>0);
  assert(snapshot(&score,&master)==ALIVE_MASTER_OK && score.rejected==rejected_base+5000);
  ultra_audio_stop();assert(alive_session_reset());assert(ultra_canvas_close_document(0));
  UltraCanvasGraph asymmetric{};asymmetric.revision=104;asymmetric.node_count=4;asymmetric.edge_count=2;
  asymmetric.nodes[0].id=1;asymmetric.nodes[0].kind=60;asymmetric.nodes[0].p0=4;
  asymmetric.nodes[1].id=2;asymmetric.nodes[1].kind=38;std::strcpy(asymmetric.nodes[1].text,"0.25");
  asymmetric.nodes[2].id=3;asymmetric.nodes[2].kind=38;std::strcpy(asymmetric.nodes[2].text,"0.5");
  asymmetric.nodes[3].id=4;asymmetric.nodes[3].kind=49;std::strcpy(asymmetric.nodes[3].text,"1 2");
  asymmetric.edges[0]={2,0,4,0};asymmetric.edges[1]={3,0,4,1};
  assert(ultra_canvas_install_document(0,&asymmetric));config.track_count=1;config.event_count=0;track.revision=104;track.parameter_count=0;
  assert(alive_session_configure(&config));assert(set(1,4.,400000)==ALIVE_MASTER_OK);
  assert(ultra_external_start());assert(alive_session_start());assert(ultra_external_render(1,left,right));
  assert(left[0]==1.f&&right[0]==2.f);assert(snapshot(&score,&master)==ALIVE_MASTER_OK);
  assert(master.peak_left==1.&&master.peak_right==2.&&master.clip_mask==2);
  ultra_audio_stop();assert(alive_session_reset());assert(ultra_canvas_close_document(0));
  UltraCanvasGraph overload{};overload.revision=105;overload.node_count=11;overload.edge_count=10;
  overload.nodes[0].id=1;overload.nodes[0].kind=60;overload.nodes[0].p0=4;
  overload.nodes[1].id=2;overload.nodes[1].kind=38;std::strcpy(overload.nodes[1].text,"100000");
  for(unsigned i=2;i<10;++i){overload.nodes[i].id=i+1;overload.nodes[i].kind=41;overload.nodes[i].p0=100000;overload.edges[i-2]={i,0,i+1,0};}
  overload.nodes[10].id=11;overload.nodes[10].kind=49;std::strcpy(overload.nodes[10].text,"1 2");
  overload.edges[8]={10,0,11,0};overload.edges[9]={10,0,11,1};
  assert(ultra_canvas_install_document(0,&overload));config.track_count=1;config.event_count=0;track.revision=105;track.parameter_count=0;
  assert(alive_session_configure(&config));assert(set(1,4.,400001)==ALIVE_MASTER_OK);
  assert(ultra_external_start());assert(alive_session_start());left[0]=right[0]=99.f;
  assert(!ultra_external_render(1,left,right));assert(left[0]==0.f&&right[0]==0.f);
  assert(snapshot(&score,&master)==ALIVE_MASTER_OK);
  assert(std::isfinite(master.peak_left)&&std::isfinite(master.peak_right));
  assert(master.observation_start_frame==master.observation_end_frame && master.peak_left==0. && master.peak_right==0. && master.clip_mask==3);
  assert(std::isfinite(score.tracks[0].peak_left)&&std::isfinite(score.tracks[0].peak_right));
  ultra_audio_stop();assert(alive_session_reset());assert(ultra_canvas_close_document(0));
  overload.revision=106;overload.nodes[1].kind=44;overload.nodes[1].p0=24000;overload.nodes[1].p1=0.000001;overload.nodes[1].text[0]=0;
  assert(ultra_canvas_install_document(0,&overload));track.revision=106;assert(alive_session_configure(&config));
  assert(set(1,4.,400002)==ALIVE_MASTER_OK);assert(ultra_external_start());assert(alive_session_start());
  left[0]=right[0]=left[1]=right[1]=99.f;assert(!ultra_external_render(2,left,right));
  assert(left[0]==0.f&&right[0]==0.f&&left[1]==0.f&&right[1]==0.f);assert(snapshot(&score,&master)==ALIVE_MASTER_OK);
  assert(master.observation_end_frame==master.observation_start_frame+1);
  assert(master.peak_left>1.&&master.peak_left<std::numeric_limits<float>::max()&&master.peak_right==master.peak_left&&master.clip_mask==3);
  ultra_audio_stop();assert(alive_session_reset());assert(ultra_canvas_close_document(0));
  assert(dlclose(library) == 0);
}
