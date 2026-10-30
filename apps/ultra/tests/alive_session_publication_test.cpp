#include "../src-tauri/native/alive_session.hpp"
#include "../src-tauri/native/backend.h"
#include "canvas_callback_guard.hpp"
#include "saved_graphs.hpp"
#include <cassert>
#include <chrono>
#include <cstdio>
#include <tuple>
#include <vector>

namespace {
std::array<float, 1024> left{}, right{};
uint64_t preparation = 100000, serial = 0, revision = 200000;
std::array<AliveSessionEventV2,32> events{};unsigned event_count=0;
void trace_event(uint64_t,unsigned,unsigned,const AliveSessionEventV2& event)noexcept {
  if(event.kind==ALIVE_SESSION_AUTOMATION)return;
  assert(event_count<events.size());events[event_count++]=event;
}
void render(unsigned frames) {
  while(frames){const auto count=std::min(frames,1024u);callback_guard::begin();
    const auto result=ultra_external_render(count,left.data(),right.data());callback_guard::end();assert(result);frames-=count;}
}
AliveSessionStateV4 state() {
  AliveSessionStateV4 value{};
  value.version = 4;
  value.struct_bytes = sizeof value;
  assert(alive_session_state_v4(&value));
  return value;
}
AliveSessionPublicationStateV4 publication() {
  AliveSessionPublicationStateV4 value{};value.version=4;value.struct_bytes=sizeof value;
  assert(alive_session_publication_state_v4(&value));return value;
}
AliveSessionPublicationV4 identity(const AliveSessionConfigV4& before) {
  const auto current=publication();
  AliveSessionPublicationV4 request{};request.version=4;request.struct_bytes=sizeof request;
  request.preparation_revision=before.preparation_revision;request.bank_revision=current.bank_revision;
  request.serial=++serial;request.stop_epoch=current.stop_epoch;
  std::fill_n(request.tracks,8,ALIVE_SESSION_V4_NONE);std::fill_n(request.sources,32,ALIVE_SESSION_V4_NONE);
  std::fill_n(request.slots,32,ALIVE_SESSION_V4_NONE);std::fill_n(request.placements,64,ALIVE_SESSION_V4_NONE);
  for(unsigned i=0;i<before.track_count;++i)request.tracks[i]=i;
  for(unsigned i=0;i<before.source_count;++i)request.sources[i]=i;
  for(unsigned i=0;i<before.slot_count;++i)request.slots[i]=i;
  for(unsigned i=0;i<before.placement_count;++i)request.placements[i]=i;
  return request;
}
uint64_t action(unsigned kind,unsigned track=0,unsigned slot=0,unsigned quantization=ALIVE_LAUNCH_NONE) {
  AliveLaunchRequestV1 request{};request.version=1;request.struct_bytes=sizeof request;
  request.kind=kind;request.quantization=quantization;request.preparation_revision=preparation;request.request_serial=++serial;
  if(kind==ALIVE_SESSION_V4_TRACK_ACTIONS){request.track_mask=1u<<track;request.tracks[track]={ALIVE_SESSION_V4_LAUNCH,slot};}
  AliveSessionReceiptV4 receipt{};receipt.version=4;receipt.struct_bytes=sizeof receipt;
  if(kind==ALIVE_SESSION_V4_TRACK_ACTIONS)assert(alive_launch_request_v4_v1(&request,&receipt));
  else {AliveSessionRequestV4 ordinary{};ordinary.version=4;ordinary.struct_bytes=sizeof ordinary;ordinary.kind=kind;ordinary.preparation_revision=preparation;ordinary.request_serial=request.request_serial;assert(alive_session_request_v4(&ordinary,&receipt));}
  return request.request_serial;
}
AliveSessionConfigV4 empty(unsigned tracks = 1) {
  ultra_audio_stop();
  assert(alive_session_reset());
  for (unsigned d = 0; d < 16; ++d) assert(ultra_canvas_close_document(d));
  AliveSessionConfigV4 c{};
  c.version = 4;
  c.struct_bytes = sizeof c;
  c.profile = c.work_policy = 1;
  c.preparation_revision = ++preparation;
  c.track_count = tracks;
  c.length_frames = c.loop_end = 192000;
  c.tempo_bpm = 120;
  c.loop_enabled = 1;
  for (unsigned t = 0; t < tracks; ++t) {
    c.tracks[t].kind = t % 2 ? ALIVE_SESSION_V4_AUDIO : ALIVE_SESSION_V4_MIDI;
    c.tracks[t].instrument = ALIVE_SESSION_V4_NONE;
    c.tracks[t].gain = 1;
    std::fill_n(c.tracks[t].slots, 4, ALIVE_SESSION_V4_NONE);
  }
  return c;
}
void empty_tracks_are_real_tracks() {
  auto c = empty(8);
  assert(alive_session_configure_v4(&c, nullptr, 0));
  assert(state().track_count == 8);
  assert(ultra_external_start());
  render(512);
  assert(!state().fault);
  for (unsigned i = 0; i < 512; ++i) assert(left[i] == 0 && right[i] == 0);
}
void pcm_uses_independent_clip_start_and_loop_range() {
  auto c=empty(2);c.source_count=c.slot_count=c.audio_buffer_count=1;
  c.tracks[1].slots[0]=0;c.sources[0].track=1;c.sources[0].kind=ALIVE_SESSION_V4_AUDIO;
  c.sources[0].length_frames=8192;c.slots[0]={1,0,1,0,256,8192,1024,2048};
  std::array<float,16384> samples{};for(unsigned i=0;i<8192;++i){samples[i*2]=float(i)/8192;samples[i*2+1]=-float(i)/8192;}
  AliveSessionAudioBufferV4 audio{4,sizeof audio,2,48000,8192,16384,samples.data(),0};
  assert(alive_session_configure_v4(&c,&audio,1));assert(ultra_external_start());
  action(ALIVE_SESSION_V4_START);render(1024);const auto launched=action(ALIVE_SESSION_V4_TRACK_ACTIONS,1);render(1);
  if(left[0]!=samples[512]||right[0]!=samples[513]){const auto s=state();std::fprintf(stderr,"PCM actual %.9f %.9f phase %llu source %u receipt %u/%u fault %u\n",left[0],right[0],(unsigned long long)s.tracks[1].phase,s.tracks[1].active_source,s.receipts[launched%128].status,s.receipts[launched%128].error,s.fault);}
  assert(left[0]==samples[512]&&right[0]==samples[513]);
  assert(state().tracks[1].phase==257);
  for(unsigned remaining=1791;remaining;){const auto count=std::min(remaining,1024u);render(count);remaining-=count;}
  render(1);assert(state().tracks[1].phase==1025);
  assert(left[0]==samples[2048]&&right[0]==samples[2049]);
}
AliveSessionConfigV4 instrument() {
  auto c=empty();c.device_count=c.source_count=c.slot_count=c.placement_count=1;
  auto& tr=c.tracks[0];tr.instrument=0;tr.slots[0]=0;tr.placement_count=1;
  UltraCanvasGraph graph{};saved_0(graph,c.devices[0]);graph.revision=c.devices[0].revision=++revision;
  assert(ultra_canvas_install_document(0,&graph));
  c.sources[0].kind=1;c.sources[0].audio_buffer=ALIVE_SESSION_V4_NONE;c.sources[0].length_frames=48000;
  c.sources[0].event_count=c.event_count=2;
  c.events[0]={0,0,ALIVE_SESSION_NOTE_ON,0,60,100};c.events[1]={24000,0,ALIVE_SESSION_NOTE_OFF,0,60,0};
  c.slots[0]={0,0,1,0,0,48000,0,48000};c.placements[0]={0,0,1,0,0,c.length_frames,0,48000,0,48000};
  assert(alive_session_configure_v4(&c,nullptr,0));assert(ultra_external_start());action(ALIVE_SESSION_V4_START);render(1);return c;
}
void add_empty_track_and_clip_preserves_sounding_root() {
  auto before=instrument();render(1);const auto playing=state();
  auto candidate=before;candidate.track_count=2;candidate.tracks[1].kind=1;candidate.tracks[1].instrument=ALIVE_SESSION_V4_NONE;
  candidate.tracks[1].gain=.7;std::fill_n(candidate.tracks[1].slots,4,ALIVE_SESSION_V4_NONE);
  candidate.source_count=2;candidate.slot_count=2;candidate.sources[1].track=1;candidate.sources[1].kind=1;
  candidate.sources[1].audio_buffer=ALIVE_SESSION_V4_NONE;candidate.sources[1].event_begin=2;candidate.sources[1].length_frames=24000;
  candidate.slots[1]={1,1,1,0,0,24000,0,24000};candidate.tracks[1].slots[0]=1;
  auto request=identity(before);request.changed_tracks=2;
  assert(alive_session_publish_v4(&candidate,nullptr,0,&request));render(1);
  const auto applied=publication();const auto after=state();
  assert(applied.status==ALIVE_SESSION_V4_APPLIED&&applied.retired_serial==request.serial&&applied.bank_revision==1);
  assert(after.playing&&after.position==playing.position+1&&after.track_count==2);
  assert(after.tracks[0].phase==playing.tracks[0].phase+1&&after.tracks[0].track_epoch==playing.tracks[0].track_epoch);
  assert(after.tracks[0].mixer.active_voices==playing.tracks[0].mixer.active_voices&&after.devices[0].revision==playing.devices[0].revision);
}
void pending_launch_survives_source_and_slot_reordering() {
  auto before=instrument();render(1024);
  before.source_count=before.slot_count=2;before.tracks[0].slots[1]=1;
  before.sources[1]=before.sources[0];before.sources[1].event_begin=2;before.event_count=4;
  before.events[2]={0,0,ALIVE_SESSION_NOTE_ON,0,72,80};before.events[3]={24000,0,ALIVE_SESSION_NOTE_OFF,0,72,0};
  before.slots[1]={0,1,1,0,0,48000,0,48000};
  auto added=identity(before);added.sources[1]=added.slots[1]=ALIVE_SESSION_V4_NONE;
  assert(alive_session_publish_v4(&before,nullptr,0,&added));render(1);assert(publication().status==ALIVE_SESSION_V4_APPLIED);
  render(1024);
  const auto pending=action(ALIVE_SESSION_V4_TRACK_ACTIONS,0,1,ALIVE_LAUNCH_QUARTER);render(1);
  const auto accepted=state();assert(accepted.tracks[0].pending_slot==1);const auto target=accepted.tracks[0].pending_frame;
  render(1024);
  auto candidate=before;std::swap(candidate.sources[0],candidate.sources[1]);std::swap(candidate.slots[0],candidate.slots[1]);
  candidate.slots[0].source=0;candidate.slots[1].source=1;candidate.tracks[0].slots[0]=1;candidate.tracks[0].slots[1]=0;
  candidate.placements[0].source=1;
  auto request=identity(before);request.sources[0]=1;request.sources[1]=0;request.slots[0]=1;request.slots[1]=0;
  assert(alive_session_publish_v4(&candidate,nullptr,0,&request));render(1);
  assert(publication().status==ALIVE_SESSION_V4_APPLIED);
  const auto remapped=state();assert(remapped.tracks[0].pending_slot==0&&remapped.tracks[0].pending_serial==pending&&remapped.tracks[0].pending_frame==target);
  while(state().absolute_frame<=target){const auto count=unsigned(std::min<uint64_t>(1024,target-state().absolute_frame+1));render(count);}
  const auto launched=state();assert(launched.tracks[0].active_slot==0&&launched.tracks[0].active_source==0);
  assert(launched.receipts[pending%128].status==ALIVE_SESSION_V4_APPLIED&&!launched.fault);
}
void stop_cancels_publication_and_retires_its_pcm() {
  auto before=instrument();render(1024);auto candidate=before;
  candidate.track_count=candidate.source_count=candidate.slot_count=2;candidate.audio_buffer_count=1;
  candidate.tracks[1].kind=2;candidate.tracks[1].instrument=ALIVE_SESSION_V4_NONE;candidate.tracks[1].gain=1;
  std::fill_n(candidate.tracks[1].slots,4,ALIVE_SESSION_V4_NONE);candidate.tracks[1].slots[0]=1;
  candidate.sources[1].track=1;candidate.sources[1].kind=2;candidate.sources[1].audio_buffer=0;candidate.sources[1].event_begin=2;candidate.sources[1].length_frames=4096;
  candidate.slots[1]={1,1,1,0,0,4096,0,4096};
  auto pcm=std::make_unique<std::array<float,8192>>();pcm->fill(.125);
  AliveSessionAudioBufferV4 audio{4,sizeof audio,2,48000,4096,8192,pcm->data(),0};
  auto request=identity(before);assert(alive_session_publish_v4(&candidate,&audio,1,&request));
  alive_session_stop_v4();render(1);
  const auto canceled=publication();assert(canceled.serial==request.serial&&canceled.status==ALIVE_SESSION_V4_CANCELED);
  assert(canceled.retired_serial==request.serial&&canceled.bank_revision==0&&!state().playing);
  pcm.reset();render(512);assert(!state().fault&&state().track_count==1);
}
void live_note_and_region_edit_retains_transport() {
  auto before=instrument();render(2048);const auto playing=state();auto candidate=before;
  candidate.events[0].target=candidate.events[1].target=67;
  candidate.placements[0].loop_start=1024;candidate.placements[0].loop_end=4096;
  auto request=identity(before);request.changed_tracks=0;
  ultra::alive_session_test_dispatch=trace_event;event_count=0;
  assert(alive_session_publish_v4(&candidate,nullptr,0,&request));render(1);
  assert(publication().status==ALIVE_SESSION_V4_APPLIED);
  assert(event_count==2&&events[0].target==60&&events[0].value==0&&events[1].target==67&&events[1].value==100);
  assert(state().position==playing.position+1&&state().tracks[0].phase==playing.tracks[0].phase+1);
  render(1024);render(unsigned(4096-state().tracks[0].phase));render(1);
  assert(state().tracks[0].phase==1025&&!state().fault);
  ultra::alive_session_test_dispatch=nullptr;
}
void sparse_eight_audio_tracks_stay_within_callback_deadline() {
  auto c=empty(8);c.source_count=c.slot_count=c.audio_buffer_count=8;
  std::array<std::array<float,16384>,8> pcm{};std::array<AliveSessionAudioBufferV4,8> audio{};
  for(unsigned t=0;t<8;++t){c.tracks[t].kind=2;c.tracks[t].slots[0]=t;
    c.sources[t].track=t;c.sources[t].kind=2;c.sources[t].audio_buffer=t;c.sources[t].length_frames=8192;
    c.slots[t]={t,t,1,0,0,8192,0,8192};
    for(unsigned s=0;s<8192;++s){pcm[t][s*2]=float(t+1)/800;pcm[t][s*2+1]=-float(t+1)/800;}
    audio[t]={4,sizeof(AliveSessionAudioBufferV4),2,48000,8192,16384,pcm[t].data(),0};
  }
  assert(alive_session_configure_v4(&c,audio.data(),8));assert(ultra_external_start());action(ALIVE_SESSION_V4_START);render(1024);
  AliveLaunchRequestV1 launch{};launch.version=1;launch.struct_bytes=sizeof launch;launch.kind=3;launch.track_mask=255;launch.preparation_revision=preparation;launch.request_serial=++serial;
  for(auto& tr:launch.tracks)tr={1,0};
  AliveSessionReceiptV4 receipt{};receipt.version=4;receipt.struct_bytes=sizeof receipt;
  assert(alive_launch_request_v4_v1(&launch,&receipt));render(1);assert(state().receipts[serial%128].status==ALIVE_SESSION_V4_APPLIED);
  double maximum=0;
  for(unsigned i=0;i<64;++i){const auto begin=std::chrono::steady_clock::now();render(256);const auto micros=std::chrono::duration<double,std::micro>(std::chrono::steady_clock::now()-begin).count();maximum=std::max(maximum,micros);}
  assert(!state().fault&&std::abs(left[0]-.045)<1e-7&&std::abs(right[0]+.045)<1e-7);
  std::printf("Eight rootless audio tracks: max %.1f us / 5333.3 us deadline, 16 sample reads/frame\n",maximum);
  assert(maximum<5333.3);
}
void queued_preview_follows_its_track_across_insertion() {
  auto before=instrument();render(1024);auto candidate=before;
  candidate.track_count=2;candidate.tracks[1]=before.tracks[0];candidate.tracks[0]={};
  candidate.tracks[0].kind=2;candidate.tracks[0].instrument=ALIVE_SESSION_V4_NONE;candidate.tracks[0].gain=1;
  std::fill_n(candidate.tracks[0].slots,4,ALIVE_SESSION_V4_NONE);
  candidate.sources[0].track=candidate.slots[0].track=candidate.placements[0].track=1;
  for(unsigned e=0;e<candidate.event_count;++e)candidate.events[e].track=1;
  AliveMidiPreviewV1 preview{1,sizeof preview,0,67,100,0,preparation,++serial};assert(alive_midi_preview_v1(&preview));
  auto request=identity(before);request.tracks[0]=1;
  assert(alive_session_publish_v4(&candidate,nullptr,0,&request));render(1);
  AliveMidiStateV1 midi{};midi.version=1;midi.struct_bytes=sizeof midi;assert(alive_midi_state_v1(&midi));
  assert(publication().status==ALIVE_SESSION_V4_APPLIED&&midi.preview_active&&midi.preview_track==1&&midi.preview_error==0);
  assert(state().tracks[0].mixer.active_voices==0&&state().tracks[1].mixer.active_voices==2);
}
void deleting_active_session_slot_stops_that_occurrence() {
  auto before=instrument();render(1024);action(ALIVE_SESSION_V4_TRACK_ACTIONS);render(1);render(1024);
  assert(state().tracks[0].authority==ALIVE_SESSION_V4_SESSION_AUTHORITY);
  auto candidate=before;candidate.slot_count=0;candidate.slots[0]={};candidate.tracks[0].slots[0]=ALIVE_SESSION_V4_NONE;
  auto request=identity(before);request.slots[0]=ALIVE_SESSION_V4_NONE;
  ultra::alive_session_test_dispatch=trace_event;event_count=0;
  assert(alive_session_publish_v4(&candidate,nullptr,0,&request));render(2);
  ultra::alive_session_test_dispatch=nullptr;
  assert(publication().status==ALIVE_SESSION_V4_APPLIED);
  const auto stopped=state();assert(stopped.playing&&!stopped.fault);
  assert(stopped.tracks[0].authority==ALIVE_SESSION_V4_SESSION_AUTHORITY&&stopped.tracks[0].active_source==ALIVE_SESSION_V4_NONE&&stopped.tracks[0].active_slot==ALIVE_SESSION_V4_NONE);
  assert(event_count==1&&events[0].target==60&&events[0].value==0);
  render(512);assert(!state().fault);
}
bool late_preview=false,late_mixer=false,late_transport=false;
void after_command_snapshot()noexcept {
  ultra::alive_session_test_boundary=nullptr;
  AliveMidiPreviewV1 preview{1,sizeof preview,0,67,100,0,preparation,++serial};late_preview=alive_midi_preview_v1(&preview);
  late_mixer=alive_session_mixer(0,.125,0,0);
  AliveSessionRequestV4 seek{};seek.version=4;seek.struct_bytes=sizeof seek;seek.kind=2;seek.preparation_revision=preparation;seek.request_serial=++serial;seek.position=1234;
  AliveSessionReceiptV4 receipt{};receipt.version=4;receipt.struct_bytes=sizeof receipt;late_transport=alive_session_request_v4(&seek,&receipt);
}
void publication_fences_numeric_commands_after_callback_snapshot() {
  auto before=instrument();render(1024);auto candidate=before;candidate.track_count=2;
  candidate.tracks[1]=before.tracks[0];candidate.tracks[0]={};
  candidate.tracks[0].kind=2;candidate.tracks[0].instrument=ALIVE_SESSION_V4_NONE;candidate.tracks[0].gain=1;std::fill_n(candidate.tracks[0].slots,4,ALIVE_SESSION_V4_NONE);
  candidate.sources[0].track=candidate.slots[0].track=candidate.placements[0].track=1;
  for(unsigned e=0;e<candidate.event_count;++e)candidate.events[e].track=1;
  auto request=identity(before);request.tracks[0]=1;assert(alive_session_publish_v4(&candidate,nullptr,0,&request));
  ultra::alive_session_test_boundary=after_command_snapshot;render(1);
  assert(!late_preview&&!late_mixer&&!late_transport&&publication().status==ALIVE_SESSION_V4_APPLIED);
  assert(alive_session_mixer(1,.5,0,0));AliveMidiPreviewV1 preview{1,sizeof preview,1,67,100,0,preparation,++serial};assert(alive_midi_preview_v1(&preview));
  render(1);assert(state().tracks[1].mixer.gain==.5&&!state().fault);
}
void identity_publication_keeps_mixer_and_preview_available() {
  for(bool append_track:{false,true}) {
    auto before=instrument();render(1024);auto candidate=before;
    candidate.source_count=candidate.slot_count=2;candidate.tracks[0].slots[1]=1;
    candidate.sources[1].kind=1;candidate.sources[1].audio_buffer=ALIVE_SESSION_V4_NONE;candidate.sources[1].length_frames=96000;
    candidate.sources[1].event_begin=candidate.event_count;candidate.slots[1]={0,1,1,0,0,96000,0,96000};
    if(append_track){candidate.track_count=2;candidate.tracks[1].kind=2;candidate.tracks[1].instrument=ALIVE_SESSION_V4_NONE;candidate.tracks[1].gain=1;std::fill_n(candidate.tracks[1].slots,4,ALIVE_SESSION_V4_NONE);}
    auto request=identity(before);assert(alive_session_publish_v4(&candidate,nullptr,0,&request));
    ultra::alive_session_test_boundary=after_command_snapshot;render(1);
    assert(late_preview&&late_mixer&&!late_transport&&publication().status==ALIVE_SESSION_V4_APPLIED);
    render(1);AliveMidiStateV1 midi{};midi.version=1;midi.struct_bytes=sizeof midi;assert(alive_midi_state_v1(&midi));
    assert(midi.preview_active&&midi.preview_track==0&&midi.preview_pitch==67&&midi.preview_error==0);
    assert(state().tracks[0].mixer.gain==.125&&!state().fault);
  }
}
void arrangement_loop_in_gap_and_new_clip_remain_publishable() {
  auto c=empty(3);c.device_count=2;c.source_count=4;c.slot_count=5;c.placement_count=1;c.audio_buffer_count=1;
  c.length_frames=384000;c.loop_end=192000;c.tracks[0].instrument=0;c.tracks[0].effect_count=1;c.tracks[0].effects[0]=1;
  c.tracks[0].slots[0]=0;c.tracks[0].slots[1]=1;c.tracks[0].placement_count=1;
  c.tracks[1].slots[0]=2;c.tracks[2].slots[0]=3;c.tracks[2].slots[1]=4;
  UltraCanvasGraph graph{};saved_0(graph,c.devices[0]);graph.revision=c.devices[0].revision=++revision;assert(ultra_canvas_install_document(0,&graph));
  saved_1(graph,c.devices[1]);c.devices[1].document=1;graph.revision=c.devices[1].revision=++revision;assert(ultra_canvas_install_document(1,&graph));
  c.sources[0].kind=1;c.sources[0].audio_buffer=ALIVE_SESSION_V4_NONE;c.sources[0].length_frames=192000;c.sources[0].lane_count=3;
  c.sources[0].owned_masks[0]=(1u<<4)|(1u<<6);c.sources[0].owned_masks[1]=1;
  c.devices[0].parameters[4].automated=c.devices[0].parameters[6].automated=c.devices[1].parameters[0].automated=1;
  const unsigned pitches[4][2]{{60,64},{65,69},{67,71},{60,64}};
  for(unsigned chord=0;chord<4;++chord)for(unsigned pitch:pitches[chord]){
    c.events[c.event_count++]={48000*chord,0,ALIVE_SESSION_NOTE_ON,0,pitch,76};
    c.events[c.event_count++]={48000*chord+36000,0,ALIVE_SESSION_NOTE_OFF,0,pitch,0};
  }
  for(unsigned point=0;point<2;++point){
    c.events[c.event_count++]={96000*point,0,ALIVE_SESSION_AUTOMATION,1,0,point?.9:.7};
    c.events[c.event_count++]={96000*point,0,ALIVE_SESSION_AUTOMATION,0,4,point?3200.:1800.};
    c.events[c.event_count++]={96000*point,0,ALIVE_SESSION_AUTOMATION,0,6,point?90.:70.};
  }
  std::sort(c.events,c.events+c.event_count,[](const auto& a,const auto& b){return std::tie(a.frame,a.kind,a.device,a.target)<std::tie(b.frame,b.kind,b.device,b.target);});
  c.sources[0].event_count=c.event_count;
  for(unsigned s=1;s<4;++s){c.sources[s].track=s==1?1:2;c.sources[s].kind=s==1?2:1;c.sources[s].audio_buffer=s==1?0:ALIVE_SESSION_V4_NONE;c.sources[s].length_frames=s==1?192000:96000;c.sources[s].event_begin=c.event_count;}
  c.slots[0]={0,0,1,0,0,192000,48000,144000};c.slots[1]={0,0,1,0,0,192000,0,192000};
  c.slots[2]={1,1,1,0,48000,192000,48000,144000};c.slots[3]={2,2,1,0,0,96000,0,96000};c.slots[4]={2,3,1,0,0,96000,0,96000};
  c.placements[0]={0,0,1,0,0,192000,0,192000,0,192000};
  std::vector<float> samples(384000,.125f);AliveSessionAudioBufferV4 audio{4,sizeof audio,2,48000,192000,384000,samples.data(),0};
  assert(alive_session_configure_v4(&c,&audio,1));assert(ultra_external_start());action(ALIVE_SESSION_V4_START);render(1024);
  AliveSessionRequestV4 launch{};launch.version=4;launch.struct_bytes=sizeof launch;launch.kind=ALIVE_SESSION_V4_TRACK_ACTIONS;launch.track_mask=2;
  launch.preparation_revision=preparation;launch.request_serial=++serial;launch.tracks[1]={ALIVE_SESSION_V4_LAUNCH,0};
  AliveSessionReceiptV4 receipt{};receipt.version=4;receipt.struct_bytes=sizeof receipt;assert(alive_session_request_v4(&launch,&receipt));render(96000);
  assert(state().receipts[launch.request_serial%128].status==ALIVE_SESSION_V4_APPLIED&&state().tracks[1].active_slot==2);
  auto publish=[&](const AliveSessionConfigV4& before,const AliveSessionConfigV4& candidate){const auto position=state().position;auto request=identity(before);assert(alive_session_publish_v4(&candidate,&audio,1,&request));render(1);assert(publication().status==ALIVE_SESSION_V4_APPLIED&&state().playing&&!state().fault);assert(state().position==position+1&&state().tracks[1].active_slot==2);};
  auto looped=c;looped.loop_start=216000;looped.loop_end=312000;publish(c,looped);
  auto added=looped;added.source_count=5;added.placement_count=2;added.tracks[2].placement_begin=1;added.tracks[2].placement_count=1;
  added.sources[4]=added.sources[3];added.placements[1]={2,4,1,0,216000,96000,0,96000,0,96000};publish(looped,added);
  auto unlooped=added;unlooped.loop_start=0;unlooped.loop_end=192000;publish(added,unlooped);
  publish(unlooped,added);
  AliveSessionRequestV4 seek{};seek.version=4;seek.struct_bytes=sizeof seek;seek.kind=ALIVE_SESSION_V4_SEEK;seek.preparation_revision=preparation;seek.request_serial=++serial;seek.position=311999;
  assert(alive_session_request_v4(&seek,&receipt));render(2);assert(state().position==216001&&state().tracks[2].active_source==4&&!state().fault);
}
}
int main(int argc,char** argv) {
  if(argc==2){if(std::strcmp(argv[1],"--queued-preview")==0)queued_preview_follows_its_track_across_insertion();else if(std::strcmp(argv[1],"--late-preview")==0)publication_fences_numeric_commands_after_callback_snapshot();else if(std::strcmp(argv[1],"--identity-live-values")==0)identity_publication_keeps_mixer_and_preview_available();else if(std::strcmp(argv[1],"--arrangement-gap")==0)arrangement_loop_in_gap_and_new_clip_remain_publishable();else deleting_active_session_slot_stops_that_occurrence();return 0;}
  empty_tracks_are_real_tracks();
  pcm_uses_independent_clip_start_and_loop_range();
  add_empty_track_and_clip_preserves_sounding_root();
  pending_launch_survives_source_and_slot_reordering();
  stop_cancels_publication_and_retires_its_pcm();
  live_note_and_region_edit_retains_transport();
  sparse_eight_audio_tracks_stay_within_callback_deadline();
  queued_preview_follows_its_track_across_insertion();
  deleting_active_session_slot_stops_that_occurrence();
  publication_fences_numeric_commands_after_callback_snapshot();
  identity_publication_keeps_mixer_and_preview_available();
  arrangement_loop_in_gap_and_new_clip_remain_publishable();
  ultra_audio_stop();
  assert(alive_session_reset());
  std::puts("PASS: live schedule publication and audio regions");
}
