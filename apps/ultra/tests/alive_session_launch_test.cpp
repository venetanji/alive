#include "alive_session_suffix_fixture.hpp"
#include "../src-tauri/native/alive_session.hpp"
#include "../src-tauri/native/backend.h"
#include "canvas_callback_guard.hpp"
#include "saved_graphs.hpp"
#include <cassert>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <thread>
#include <vector>
namespace {
uint64_t preparation = 0, serial = 0, revision = 90000;
std::array<float, 1024> left{}, right{};
AliveSessionConfigV4 prepare(unsigned effects = 0) {
  ultra_audio_stop();
  assert(alive_session_reset());
  for (unsigned d = 0; d < 16; ++d)
    assert(ultra_canvas_close_document(d));
  AliveSessionConfigV4 c{};
  c.version = 4;
  c.struct_bytes = sizeof c;
  c.profile = c.work_policy = 1;
  c.track_count = c.source_count = 1;
  c.device_count = effects + 1;
  c.placement_count = 2;
  c.preparation_revision = ++preparation;
  c.length_frames = c.loop_end = 8192;
  c.tempo_bpm = 120;
  auto &track = c.tracks[0];
  track.kind = 1;
  track.gain = 1;
  track.effect_count = effects;
  std::fill_n(track.slots, 4, ALIVE_SESSION_V4_NONE);
  track.placement_count = 2;
  for (unsigned d = 0; d <= effects; ++d) {
    UltraCanvasGraph graph{};
    if (d == 0)
      saved_0(graph, c.devices[d]);
    else if (d == 1)
      saved_1(graph, c.devices[d]);
    else
      saved_2(graph, c.devices[d]);
    graph.revision = ++revision;
    c.devices[d].revision = revision;
    c.devices[d].document = d;
    if (d)
      track.effects[d - 1] = d;
    assert(ultra_canvas_install_document(d, &graph));
  }
  auto &source = c.sources[0];
  source.kind = 1;
  source.audio_buffer = ALIVE_SESSION_V4_NONE;
  source.length_frames = 4096;
  source.event_count = c.event_count = 4;
  c.events[0] = {0, 0, ALIVE_SESSION_NOTE_ON, 0, 60, 100};
  c.events[1] = {1500, 0, ALIVE_SESSION_NOTE_OFF, 0, 60, 0};
  c.events[2] = {2000, 0, ALIVE_SESSION_NOTE_ON, 0, 64, 100};
  c.events[3] = {3000, 0, ALIVE_SESSION_NOTE_OFF, 0, 64, 0};
  c.placements[0] = {0, 0, 0, 0, 512, 2048, 0,0,0,0};
  c.placements[1] = {0, 0, 0, 0, 4096, 2048, 1024,0,0,0};
  return c;
}
AliveSessionStateV4 state() {
  AliveSessionStateV4 s{};
  s.version = 4;
  s.struct_bytes = sizeof s;
  assert(alive_session_state_v4(&s));
  return s;
}
void render(unsigned frames) {
  callback_guard::begin();
  const int ok = ultra_external_render(frames, left.data(), right.data());
  callback_guard::end();
  assert(ok);
}
AliveSessionReceiptV4 request(unsigned kind = ALIVE_SESSION_V4_START, bool expected = true) {
  AliveSessionRequestV4 r{};
  r.version = 4;
  r.struct_bytes = sizeof r;
  r.kind = kind;
  if (kind == ALIVE_SESSION_V4_TRACK_ACTIONS) {
    r.track_mask = 1;
    r.tracks[0] = {ALIVE_SESSION_V4_TRACK_STOP, ALIVE_SESSION_V4_NONE};
  }
  r.preparation_revision = preparation;
  r.request_serial = ++serial;
  AliveSessionReceiptV4 receipt{};
  receipt.version = 4;
  receipt.struct_bytes = sizeof receipt;
  assert(bool(alive_session_request_v4(&r, &receipt)) == expected);
  return receipt;
}
}
#include "../src-tauri/native/alive-launch-v1.h"
static_assert(sizeof(AliveLaunchRequestV1)==112 && offsetof(AliveLaunchRequestV1,tracks)==48);
static_assert(sizeof(AliveLaunchLimitsV1)==32 && offsetof(AliveLaunchLimitsV1,preparation_revision)==24);

uint64_t onset=UINT64_MAX;
void dispatched(uint64_t frame,unsigned,unsigned,const AliveSessionEventV2 &event) noexcept {
  if(event.kind==ALIVE_SESSION_NOTE_ON) onset=std::min(onset,frame);
}
void grid_onset(unsigned grid,double tempo,unsigned partition,bool loop) {
  auto c=prepare();c.tempo_bpm=tempo;
  c.length_frames=uint64_t(std::round(256.*48000.*60./tempo));
  c.loop_end=c.length_frames;c.placement_count=c.tracks[0].placement_count=0;
  std::fill_n(c.placements,64,AliveSessionPlacementV4{});
  c.slot_count=1;c.tracks[0].slots[0]=0;c.slots[0]={0,0,1,0,0,0,0,0};
  const double beats[]={.125,.125,.25,.5,1,2,4,8,16,32};
  const auto boundary=uint64_t(std::round(beats[grid]*48000.*60./tempo));
  if(loop) {c.loop_enabled=1;c.loop_start=boundary-100;c.loop_end=boundary+600;}
  if(!configure_suffix_fixture(&c,nullptr,0)){std::fprintf(stderr,"grid configure: %s\n",alive_session_error());std::abort();}
  AliveLaunchLimitsV1 limits{};limits.version=1;limits.struct_bytes=sizeof limits;
  assert(alive_launch_limits_v1(&limits)&&limits.admitted);
  auto proof=std::make_unique<ultra::workspace_admission::Proof>();
  assert(ultra::workspace_admission::build_validated(suffix_region_fixture(c),*proof,true));
  assert(ultra_external_start());
  AliveSessionRequestV4 seek{};seek.version=4;seek.struct_bytes=sizeof seek;
  seek.kind=2;seek.position=boundary-1025;seek.preparation_revision=preparation;seek.request_serial=++serial;
  AliveSessionReceiptV4 receipt{};receipt.version=4;receipt.struct_bytes=sizeof receipt;
  assert(alive_session_request_v4(&seek,&receipt));request();
  for(unsigned remaining=1024;remaining;) {const auto count=std::min(partition,remaining);render(count);remaining-=count;}
  const auto before=state();assert(before.position==boundary-1);
  AliveLaunchRequestV1 r{};r.version=1;r.struct_bytes=sizeof r;r.kind=3;r.track_mask=1;
  r.preparation_revision=preparation;r.request_serial=++serial;r.quantization=grid;r.tracks[0]={1,0};
  onset=UINT64_MAX;ultra::alive_session_test_dispatch=dispatched;
  assert(alive_launch_request_v4_v1(&r,&receipt));
  render(1);const auto target=before.absolute_frame+(grid?1:0);
  assert(state().receipts[serial%128].target_frame==target);
  if(grid)assert(onset==UINT64_MAX);
  render(128);assert(onset==target);
  bool audible=false;for(unsigned i=0;i<128;++i)audible|=left[i]!=0||right[i]!=0;
  assert(audible);assert(!state().fault);
  ultra::alive_session_test_dispatch=nullptr;ultra_audio_stop();
}

void v3_boundary() {
  auto v4=prepare();AliveSessionConfigV3 c{};
  c.version=3;c.struct_bytes=sizeof c;c.profile=c.work_policy=1;
  c.track_count=c.device_count=c.clip_count=1;c.event_count=4;
  c.preparation_revision=preparation;c.length_frames=960000;c.tempo_bpm=120;
  c.tracks[0].chain.gain=1;c.tracks[0].initial_clip=UINT32_MAX;
  std::fill_n(c.tracks[0].slots,4,UINT32_MAX);c.tracks[0].slots[0]=0;
  c.devices[0]=v4.devices[0];c.clips[0].length_frames=4096;c.clips[0].event_count=4;
  std::copy_n(v4.events,4,c.events);assert(alive_session_configure_v3(&c));
  assert(ultra_external_start());
  AliveSessionRequestV3 old{};old.version=3;old.struct_bytes=sizeof old;old.kind=1;
  old.preparation_revision=preparation;old.request_serial=++serial;
  AliveSessionReceiptV3 receipt{};receipt.version=3;receipt.struct_bytes=sizeof receipt;
  assert(alive_session_request_v3(&old,&receipt));render(1024);
  AliveLaunchRequestV1 r{};r.version=1;r.struct_bytes=sizeof r;r.kind=3;r.track_mask=1;
  r.preparation_revision=preparation;r.request_serial=++serial;r.quantization=1;r.tracks[0]={1,0};
  assert(alive_launch_request_v3_v1(&r,&receipt));const auto pending=serial;
  render(1);AliveSessionStateV3 st{};st.version=3;st.struct_bytes=sizeof st;assert(alive_session_state_v3(&st));
  assert(st.receipts[pending%128].target_frame==st.absolute_frame+1975);
  old.kind=3;old.track_mask=1;old.tracks[0]={1,0};old.request_serial=++serial;old.reserved=1;
  assert(!alive_session_request_v3(&old,&receipt));assert(receipt.error==ALIVE_SESSION_V3_BAD_FIELD);
  r.request_serial=++serial;r.quantization=UINT32_MAX;
  assert(!alive_launch_request_v3_v1(&r,&receipt));assert(receipt.error==ALIVE_SESSION_V3_BAD_FIELD);
  alive_session_stop_v3();render(1);assert(alive_session_state_v3(&st));
  assert(!st.playing&&st.receipts[pending%128].error==ALIVE_SESSION_V3_STOP_CANCELED);
  ultra_audio_stop();
}
void dense_old_admission() {
  bool found=false;
  for(unsigned spacing=32;spacing<=80&&!found;++spacing) {
    auto c=prepare();c.length_frames=c.loop_end=960000;
    c.placement_count=c.tracks[0].placement_count=0;std::fill_n(c.placements,64,AliveSessionPlacementV4{});
    c.slot_count=1;c.tracks[0].slots[0]=0;c.slots[0]={0,0,1,0,0,0,0,0};
    c.sources[0].length_frames=64*spacing;c.sources[0].event_count=c.event_count=128;
    for(unsigned i=0;i<64;++i) {c.events[2*i]={i*spacing,0,ALIVE_SESSION_NOTE_ON,0,60,100};c.events[2*i+1]={i*spacing+spacing/2,0,ALIVE_SESSION_NOTE_OFF,0,60,0};}
    if(!configure_suffix_fixture(&c,nullptr,0))continue;
    AliveLaunchLimitsV1 limits{};limits.version=1;limits.struct_bytes=sizeof limits;
    assert(alive_launch_limits_v1(&limits));if(limits.admitted)continue;
    auto proof=std::make_unique<ultra::workspace_admission::Proof>();
    assert(ultra::workspace_admission::build_validated(suffix_region_fixture(c),*proof));
    assert(!ultra::workspace_admission::build_validated(suffix_region_fixture(c),*proof,true));
    found=true;std::printf("old-only dense admission spacing=%u\n",spacing);
    AliveLaunchRequestV1 r{};r.version=1;r.struct_bytes=sizeof r;r.kind=3;r.track_mask=1;
    r.preparation_revision=preparation;r.request_serial=++serial;r.quantization=1;r.tracks[0]={1,0};
    AliveSessionReceiptV4 receipt{};receipt.version=4;receipt.struct_bytes=sizeof receipt;
    assert(!alive_launch_request_v4_v1(&r,&receipt));assert(receipt.error==ALIVE_SESSION_V4_WORK_LIMIT);
    assert(ultra_external_start());request();render(1);assert(state().playing&&!state().fault);ultra_audio_stop();
  }
  assert(found);
}

void mixed_batches() {
  auto c=prepare();c.length_frames=c.loop_end=960000;
  c.placement_count=c.tracks[0].placement_count=0;std::fill_n(c.placements,64,AliveSessionPlacementV4{});
  c.track_count=c.device_count=c.source_count=2;c.slot_count=2;c.event_count=8;
  c.tracks[0].slots[0]=0;c.slots[0]={0,0,1,0,0,0,0,0};
  c.tracks[1]=c.tracks[0];c.tracks[1].instrument=1;c.tracks[1].slots[0]=1;
  c.slots[1]={1,1,1,0,0,0,0,0};c.sources[1]=c.sources[0];c.sources[1].track=1;c.sources[1].event_begin=4;
  for(unsigned i=0;i<4;++i){c.events[i+4]=c.events[i];c.events[i+4].track=c.events[i+4].device=1;}
  UltraCanvasGraph graph{};saved_0(graph,c.devices[1]);graph.revision=++revision;
  c.devices[1].revision=revision;c.devices[1].document=1;assert(ultra_canvas_install_document(1,&graph));
  assert(configure_suffix_fixture(&c,nullptr,0));assert(ultra_external_start());request();render(1024);
  auto submit=[&](unsigned grid,unsigned mask,unsigned action0,unsigned action1) {
    AliveLaunchRequestV1 r{};r.version=1;r.struct_bytes=sizeof r;r.kind=3;r.track_mask=mask;
    r.preparation_revision=preparation;r.request_serial=++serial;r.quantization=grid;
    if(mask&1)r.tracks[0]={action0,action0==1?0u:UINT32_MAX};
    if(mask&2)r.tracks[1]={action1,action1==1?0u:UINT32_MAX};
    AliveSessionReceiptV4 receipt{};receipt.version=4;receipt.struct_bytes=sizeof receipt;
    assert(alive_launch_request_v4_v1(&r,&receipt));return serial;
  };
  const auto first=submit(1,1,1,0);render(1024); // pending at absolute origin+3000
  const auto disjoint=submit(0,2,0,1);render(1);
  auto st=state();assert(st.receipts[disjoint%128].applied_mask==2&&st.tracks[0].pending_serial==first);
  render(1023);st=state();assert(st.receipts[first%128].applied_mask==1);
  const auto replace=submit(9,3,1,1);
  const auto scene=submit(0,3,1,2); // empty member Stop; same native batch
  render(1);st=state();assert(st.receipts[replace%128].superseded_mask==3);
  assert(st.receipts[scene%128].applied_mask==3&&st.tracks[1].active_slot==UINT32_MAX);
  render(1023);
  const auto return_request=submit(0,3,3,3);render(1);st=state();
  assert(st.receipts[return_request%128].applied_mask==3);
  assert(st.tracks[0].authority==0&&st.tracks[1].authority==0);
  render(1023);
  const auto pending=submit(9,1,1,0);render(1024);
  AliveSessionRequestV4 seek{};seek.version=4;seek.struct_bytes=sizeof seek;seek.kind=2;
  seek.preparation_revision=preparation;seek.request_serial=++serial;seek.position=960000-2;
  AliveSessionReceiptV4 receipt{};receipt.version=4;receipt.struct_bytes=sizeof receipt;
  assert(alive_session_request_v4(&seek,&receipt));render(1);st=state();
  assert(st.receipts[pending%128].error==ALIVE_SESSION_V4_REPLACED_REQUEST);
  // A request past a finite end is terminal, and None never postpones Stop.
  const auto end=submit(9,1,1,0);render(1);st=state();
  assert(st.receipts[end%128].status==ALIVE_SESSION_V4_CANCELED);
  assert(st.receipts[end%128].error==ALIVE_SESSION_V4_END_CANCELED);
  alive_session_stop_v4();render(1);assert(!state().playing&&!state().fault);
  ultra_audio_stop();
}
void retained_history_admission() {
 auto v4=prepare(); AliveSessionConfigV3 c{};
 c.version=3;c.struct_bytes=sizeof c;c.profile=c.work_policy=1;
 c.track_count=c.device_count=c.clip_count=1;c.event_count=16;
 c.preparation_revision=preparation;c.length_frames=960000;c.tempo_bpm=120;
 c.tracks[0].chain.gain=1;c.tracks[0].initial_clip=0;
 std::fill_n(c.tracks[0].slots,4,UINT32_MAX);c.tracks[0].slots[0]=0;
 c.devices[0]=v4.devices[0];c.clips[0].length_frames=960000;c.clips[0].event_count=16;
 for(unsigned i=0;i<8;++i) {c.events[i]={5000,0,ALIVE_SESSION_NOTE_ON,0,60+i,100};c.events[8+i]={5100,0,ALIVE_SESSION_NOTE_OFF,0,60+i,0};}
 assert(alive_session_configure_v3(&c));
 AliveLaunchLimitsV1 limits{};limits.version=1;limits.struct_bytes=sizeof limits;
 assert(alive_launch_limits_v1(&limits));printf("history fixture launch admitted=%u\n",limits.admitted);assert(limits.admitted);
 assert(ultra_external_start());
 AliveSessionRequestV3 start{};start.version=3;start.struct_bytes=sizeof start;start.kind=1;
 start.preparation_revision=preparation;start.request_serial=++serial;
 AliveSessionReceiptV3 receipt{};receipt.version=3;receipt.struct_bytes=sizeof receipt;
 assert(alive_session_request_v3(&start,&receipt));
 for(unsigned left=5101;left;) {auto n=std::min(left,1024u);render(n);left-=n;}
 AliveLaunchRequestV1 launch{};launch.version=1;launch.struct_bytes=sizeof launch;launch.kind=3;launch.track_mask=1;launch.preparation_revision=preparation;launch.request_serial=++serial;launch.quantization=0;launch.tracks[0]={2,UINT32_MAX};
 assert(alive_launch_request_v3_v1(&launch,&receipt));render(1);
 AliveSessionStateV3 st{};st.version=3;st.struct_bytes=sizeof st;assert(alive_session_state_v3(&st));
 auto r=st.receipts[serial%128];printf("history activation status=%u error=%u playing=%u active=%u fault=%u\n",r.status,r.error,st.playing,st.tracks[0].active_clip,st.fault);
 assert(r.status==ALIVE_SESSION_V3_REJECTED && r.error==ALIVE_SESSION_V3_WORK_LIMIT && st.playing && st.tracks[0].active_clip==0 && !st.fault);
 render(1024);launch.tracks[0]={1,0};launch.request_serial=++serial;assert(alive_launch_request_v3_v1(&launch,&receipt));render(1);assert(alive_session_state_v3(&st));r=st.receipts[serial%128];printf("settled activation status=%u error=%u active=%u fault=%u\n",r.status,r.error,st.tracks[0].active_clip,st.fault);
 assert(r.status==ALIVE_SESSION_V3_APPLIED && st.tracks[0].active_clip==0 && !st.fault);
 render(1024);
 AliveSessionRequestV3 seek=start;seek.kind=2;seek.position=4100;seek.request_serial=++serial;
 assert(alive_session_request_v3(&seek,&receipt));render(1024);render(77);
 assert(alive_session_state_v3(&st));assert(st.receipts[serial%128].status==ALIVE_SESSION_V3_APPLIED);
 assert(st.position==5201 && !st.fault);
 seek.position=4000;seek.request_serial=++serial;assert(alive_session_request_v3(&seek,&receipt));render(1);
 assert(alive_session_state_v3(&st));r=st.receipts[serial%128];
 printf("retained augmented future old Seek status=%u error=%u position=%llu fault=%u\n",r.status,r.error,(unsigned long long)st.position,st.fault);
 assert(r.status==ALIVE_SESSION_V3_REJECTED && r.error==ALIVE_SESSION_V3_WORK_LIMIT && st.position==5202 && !st.fault);
 ultra_audio_stop();
}

int main() {
  auto c=prepare();
  c.length_frames=c.loop_end=960000;
  c.placement_count=c.tracks[0].placement_count=0;
  std::fill_n(c.placements,64,AliveSessionPlacementV4{});
  c.slot_count=1;c.tracks[0].slots[0]=0;
  c.slots[0]={0,0,1,0,0,0,0,0};
  if (!configure_suffix_fixture(&c,nullptr,0)) {std::fprintf(stderr,"configure: %s\n",alive_session_error());std::abort();}
  AliveLaunchLimitsV1 limits{};limits.version=1;limits.struct_bytes=sizeof limits;
  assert(alive_launch_limits_v1(&limits));
  assert(limits.admitted && limits.quantization_mask==1023 && limits.window_frames==1024);
  assert(ultra_external_start());
  request(); render(1024);
  AliveLaunchRequestV1 r{};
  r.version=1;r.struct_bytes=sizeof r;r.quantization=1;r.kind=3;r.track_mask=1;
  r.preparation_revision=preparation;r.request_serial=++serial;r.tracks[0]={1,0};
  AliveSessionReceiptV4 receipt{};receipt.version=4;receipt.struct_bytes=sizeof receipt;
  assert(alive_launch_request_v4_v1(&r,&receipt));
  render(1);
  auto s=state();
  assert(s.receipts[serial%128].target_frame==3000);
  assert(s.receipts[serial%128].status==ALIVE_SESSION_V4_PENDING);
  const auto pending=serial;
  r.quantization=0;r.request_serial=++serial;
  assert(alive_launch_request_v4_v1(&r,&receipt)); render(1);
  s=state();
  assert(s.receipts[serial%128].status==ALIVE_SESSION_V4_REJECTED);
  assert(s.tracks[0].pending_serial==pending && s.playing && !s.fault);
  while(state().absolute_frame<3001)render(unsigned(std::min<uint64_t>(1024,3001-state().absolute_frame)));
  s=state();assert(s.receipts[pending%128].status==ALIVE_SESSION_V4_APPLIED);
  assert(s.tracks[0].active_source==0);
  ultra_audio_stop();
  for(double tempo:{30.,137.,240.})for(unsigned grid=0;grid<10;++grid)
    for(unsigned partition:{1u,127u})grid_onset(grid,tempo,partition,false);
  for(unsigned grid=0;grid<10;++grid)grid_onset(grid,240,127,true);
  v3_boundary();dense_old_admission();mixed_batches();retained_history_admission();
  std::puts("quantized request: fine target, rolling guard refusal, retained pending playback passed");
}
