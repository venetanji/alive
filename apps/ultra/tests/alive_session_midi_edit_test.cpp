#include "../src-tauri/native/alive-midi-edit-v1.h"
#include "../src-tauri/native/backend.h"
#include "../src-tauri/native/alive_session.hpp"
#include "canvas_callback_guard.hpp"
#include "saved_graphs.hpp"
#include <cassert>
#include <chrono>
#include <cstdio>
#include <vector>

namespace {
std::array<float, 2048> left{}, right{};
uint64_t revision = 95000, preparation = 0, serial = 0;
struct Note { uint64_t frame; unsigned pitch; double value; };
std::vector<Note> dispatched;
uint64_t charged_events=0;
void charge(unsigned family,const ultra::clip_admission::Cost& cost)noexcept{if(family==0)charged_events+=cost[0];}
void trace(uint64_t frame, unsigned, unsigned, const AliveSessionEventV2 &event) noexcept {
  if (event.kind != ALIVE_SESSION_AUTOMATION) dispatched.push_back({frame,event.target,event.value});
}
void render(unsigned count) {
  while(count){const auto part=std::min(count,1024u);callback_guard::begin();
    const auto ok=ultra_external_render(part,left.data(),right.data());
    callback_guard::end();assert(ok);count-=part;}
}
AliveSessionStateV4 state() {
  AliveSessionStateV4 s{};s.version=4;s.struct_bytes=sizeof s;assert(alive_session_state_v4(&s));return s;
}
AliveMidiStateV1 midi() {
  AliveMidiStateV1 s{};s.version=1;s.struct_bytes=sizeof s;assert(alive_midi_state_v1(&s));return s;
}
AliveSessionConfigV4 setup(unsigned variants=0,bool optional=true) {
  ultra_audio_stop();assert(alive_session_reset());
  for(unsigned d=0;d<16;++d)assert(ultra_canvas_close_document(d));
  AliveSessionConfigV4 c{};c.version=4;c.struct_bytes=sizeof c;c.profile=c.work_policy=1;
  c.preparation_revision=++preparation;c.track_count=c.device_count=c.source_count=c.slot_count=1;
  c.length_frames=c.loop_end=16384;c.tempo_bpm=120;c.loop_enabled=1;
  auto& tr=c.tracks[0];tr.kind=1;tr.gain=1;std::fill_n(tr.slots,4,ALIVE_SESSION_V4_NONE);tr.slots[0]=0;tr.placement_count=1;
  UltraCanvasGraph graph{};saved_0(graph,c.devices[0]);graph.revision=++revision;c.devices[0].revision=revision;
  assert(ultra_canvas_install_document(0,&graph));
  c.sources[0].kind=1;c.sources[0].audio_buffer=ALIVE_SESSION_V4_NONE;c.sources[0].length_frames=8192;c.sources[0].event_count=2;
  c.slots[0]={0,0,1,0,0};c.placement_count=1;c.placements[0]={0,0,1,0,0,16384,0};
  c.event_count=2;c.events[0]={0,0,ALIVE_SESSION_NOTE_ON,0,60,100};c.events[1]={4096,0,ALIVE_SESSION_NOTE_OFF,0,60,0};
  if(variants&1){c.sources[0].event_count=c.event_count=4;c.events[1]={0,0,ALIVE_SESSION_NOTE_ON,0,64,80};c.events[2]={4096,0,ALIVE_SESSION_NOTE_OFF,0,60,0};c.events[3]={4096,0,ALIVE_SESSION_NOTE_OFF,0,64,0};}
  if(variants&2){c.slot_count=2;tr.slots[1]=1;c.slots[1]={0,0,1,0,1024};}
  if(variants&4){c.sources[0].event_count=c.event_count=8;for(unsigned i=0;i<4;++i){c.events[i]={i*16,0,ALIVE_SESSION_NOTE_ON,0,60+i,100};c.events[i+4]={4096+i*16,0,ALIVE_SESSION_NOTE_OFF,0,60+i,0};}}
  if(variants&8){c.source_count=c.slot_count=2;tr.slots[1]=1;c.slots[1]={0,1,1,0,0};c.sources[1]=c.sources[0];c.sources[1].event_begin=2;c.event_count=4;c.events[2]={0,0,ALIVE_SESSION_NOTE_ON,0,72,100};c.events[3]={4096,0,ALIVE_SESSION_NOTE_OFF,0,72,0};}
  assert(alive_session_configure_v4(&c,nullptr,0));
  AliveMidiLimitsV1 l{};l.version=1;l.struct_bytes=sizeof l;assert(alive_midi_limits_v1(&l));
  assert(bool(l.available)==optional);
  assert(ultra_external_start());dispatched.clear();return c;
}
void start() {
  AliveSessionRequestV4 r{};r.version=4;r.struct_bytes=sizeof r;r.kind=ALIVE_SESSION_V4_START;r.preparation_revision=preparation;r.request_serial=++serial;
  AliveSessionReceiptV4 receipt{};receipt.version=4;receipt.struct_bytes=sizeof receipt;assert(alive_session_request_v4(&r,&receipt));render(1);
}
void replace(unsigned pitch) {
  AliveMidiEditV1 r{};r.version=1;r.struct_bytes=sizeof r;r.preparation_revision=preparation;r.serial=++serial;r.source_revision=midi().source_revision;r.source=0;r.event_count=2;
  r.events[0]={0,0,ALIVE_SESSION_NOTE_ON,0,pitch,100};r.events[1]={4096,0,ALIVE_SESSION_NOTE_OFF,0,pitch,0};
  assert(alive_midi_edit_v1(&r));
}
void held_edit_preserves_transport_and_roots() {
  const auto c=setup();start();render(1200);const auto before=state();dispatched.clear();
  replace(64);assert(midi().status==ALIVE_MIDI_QUEUED);render(1);const auto after=state();
  assert(midi().status==ALIVE_MIDI_APPLIED);assert(after.playing&&after.position==before.position+1);
  assert(after.tracks[0].phase==before.tracks[0].phase+1);assert(after.devices[0].revision==c.devices[0].revision);
  assert(dispatched.size()==2&&dispatched[0].pitch==60&&dispatched[0].value==0&&dispatched[1].pitch==64&&dispatched[1].value==100);
}
uint64_t preview(unsigned pitch) {
  AliveMidiPreviewV1 request{1,sizeof request,0,pitch,100,0,preparation,++serial};
  assert(alive_midi_preview_v1(&request));render(1);return request.serial;
}
void stopped_preview_is_real_audio_and_releases() {
  setup();const auto before=state();const auto token=preview(67);render(512);
  assert(!state().playing&&state().position==before.position);assert(midi().preview_active);
  bool audible=false;for(unsigned i=0;i<512;++i)audible|=std::abs(left[i])+std::abs(right[i])>1e-7;assert(audible);
  assert(alive_midi_release_v1(preparation,token));render(1);
  assert(!midi().preview_active&&dispatched.size()==2&&dispatched.back().value==0);
  assert(!alive_midi_release_v1(preparation+1,token));
}
void scheduled_pitch_collision_never_retriggers_or_releases_music() {
  setup();start();render(1200);dispatched.clear();const auto token=preview(60);
  assert(midi().preview_active&&dispatched.empty());assert(alive_midi_release_v1(preparation,token));render(1);
  assert(dispatched.empty()&&!midi().preview_active&&state().tracks[0].mixer.active_voices>0);
}
void busy_stale_and_recent_work_refusal_preserve_source() {
  setup();start();render(1200);replace(64);
  AliveMidiEditV1 request{};request.version=1;request.struct_bytes=sizeof request;request.preparation_revision=preparation;request.serial=++serial;request.source_revision=0;
  assert(!alive_midi_edit_v1(&request));render(1);assert(midi().status==ALIVE_MIDI_APPLIED);
  assert(!alive_midi_edit_v1(&request));
  replace(67);render(1);assert(midi().status==ALIVE_MIDI_REJECTED&&midi().error==ALIVE_MIDI_LIMIT);
  assert(midi().source_revision==1&&state().playing);render(1024);dispatched.clear();replace(69);render(1);
  assert(midi().status==ALIVE_MIDI_APPLIED&&midi().source_revision==2);
  assert(dispatched.size()==2&&dispatched[0].pitch==64&&dispatched[1].pitch==69);
}
void expiry_and_stop_release_preview_without_frontend_timer() {
  setup();preview(67);render(96000);assert(!midi().preview_active);
  assert(dispatched.size()==2&&dispatched.back().value==0);
  preview(69);assert(midi().preview_active);alive_session_stop_v4();render(1);assert(!midi().preview_active);
  render(512);assert(state().tracks[0].mixer.active_voices==0);
  for(unsigned i=0;i<512;++i)assert(left[i]==0&&right[i]==0);
}
void exact_note_off_phase_does_not_chase_an_ended_note() {
  setup();start();render(4095);assert(state().tracks[0].phase==4096);dispatched.clear();replace(64);render(1);
  assert(midi().status==ALIVE_MIDI_APPLIED&&dispatched.size()==1&&dispatched[0].pitch==60&&dispatched[0].value==0);
}
void velocity_edit_changes_future_note_on_without_retrigger() {
  setup();start();render(1200);dispatched.clear();
  AliveMidiEditV1 r{};r.version=1;r.struct_bytes=sizeof r;r.preparation_revision=preparation;r.serial=++serial;r.source_revision=midi().source_revision;r.event_count=2;
  r.events[0]={0,0,ALIVE_SESSION_NOTE_ON,0,60,37};r.events[1]={4096,0,ALIVE_SESSION_NOTE_OFF,0,60,0};
  assert(alive_midi_edit_v1(&r));render(1);assert(midi().status==ALIVE_MIDI_APPLIED&&dispatched.empty());
  render(unsigned(8192-state().tracks[0].phase));dispatched.clear();render(1);assert(dispatched.size()==1&&dispatched[0].pitch==60&&dispatched[0].value==37);
}
void inactive_source_edit_leaves_playing_source_until_launch() {
  setup(8);start();render(1200);dispatched.clear();
  AliveMidiEditV1 r{};r.version=1;r.struct_bytes=sizeof r;r.preparation_revision=preparation;r.serial=++serial;r.source_revision=midi().source_revision;r.source=1;r.event_count=2;
  r.events[0]={0,0,ALIVE_SESSION_NOTE_ON,0,67,90};r.events[1]={4096,0,ALIVE_SESSION_NOTE_OFF,0,67,0};
  assert(alive_midi_edit_v1(&r));render(1);assert(midi().status==ALIVE_MIDI_APPLIED&&dispatched.empty()&&state().tracks[0].active_source==0);
  render(1024);AliveSessionRequestV4 request{};request.version=4;request.struct_bytes=sizeof request;request.kind=ALIVE_SESSION_V4_TRACK_ACTIONS;request.track_mask=1;request.preparation_revision=preparation;request.request_serial=++serial;request.tracks[0]={ALIVE_SESSION_V4_LAUNCH,1};
  AliveSessionReceiptV4 receipt{};receipt.version=4;receipt.struct_bytes=sizeof receipt;assert(alive_session_request_v4(&request,&receipt));render(1);
  const auto target=state().tracks[0].pending_frame;assert(target!=UINT64_MAX);while(state().absolute_frame<target)render(unsigned(std::min<uint64_t>(1024,target-state().absolute_frame)));
  dispatched.clear();render(1);assert(state().tracks[0].active_source==1&&dispatched.size()==1&&dispatched[0].pitch==67&&dispatched[0].value==90);
}
void stopped_source_edits_need_no_reconstruction_guard() {
  setup();for(unsigned pitch:{62u,64u,65u}){replace(pitch);render(1);assert(midi().status==ALIVE_MIDI_APPLIED);}
  assert(midi().source_revision==3&&!state().playing&&dispatched.empty());
}
void audio_stop_resolves_pending_source_receipt() {
  setup();start();render(1200);replace(62);render(1);assert(midi().status==ALIVE_MIDI_APPLIED);render(1024);
  replace(64);assert(midi().status==ALIVE_MIDI_QUEUED);
  ultra_audio_stop();assert(midi().status==ALIVE_MIDI_REJECTED);assert(midi().source_revision==1);
  assert(ultra_external_start());dispatched.clear();start();assert(dispatched.size()==1&&dispatched[0].pitch==62);
}
void shrinking_source_event_count_clears_unused_storage() {
  setup(1);
  replace(62);render(1);assert(midi().status==ALIVE_MIDI_APPLIED);
  AliveMidiEditV1 r{};r.version=1;r.struct_bytes=sizeof r;r.preparation_revision=preparation;r.serial=++serial;r.source_revision=midi().source_revision;
  r.event_count=1;r.events[0]={0,0,ALIVE_SESSION_NOTE_ON,0,62,100};
  assert(alive_midi_edit_v1(&r));render(1);assert(midi().status==ALIVE_MIDI_APPLIED);
  r.serial=++serial;r.source_revision=midi().source_revision;r.event_count=0;r.events[0]={};
  assert(alive_midi_edit_v1(&r));render(1);assert(midi().status==ALIVE_MIDI_APPLIED);
  start();render(1024);assert(dispatched.empty());
}
void dense_source_refuses_optional_capability_but_keeps_normal_playback() {
  setup(4,false);start();render(1200);assert(state().playing&&state().tracks[0].mixer.active_voices>=4);
  AliveMidiPreviewV1 request{1,sizeof request,0,80,100,0,preparation,++serial};assert(!alive_midi_preview_v1(&request));
  assert(state().playing);
}
void loop_boundary_and_exact_note_on_dispatch_once() {
  setup();start();render(8191);assert(state().tracks[0].phase==8192);const auto epoch=state().tracks[0].track_epoch;
  dispatched.clear();replace(64);render(1);assert(midi().status==ALIVE_MIDI_APPLIED);
  assert(state().tracks[0].phase==1&&state().tracks[0].track_epoch==epoch+1);
  assert(dispatched.size()==3&&dispatched[0].pitch==60&&dispatched[0].value==100&&dispatched[1].pitch==60&&dispatched[1].value==0&&dispatched[2].pitch==64&&dispatched[2].value==100);
}
void saturated_preview_retains_release_and_event_ceilings() {
  setup();std::array<uint64_t,1024> window{};uint64_t total=0,last=0;bool refused=false;
  for(unsigned frame=0;frame<2100;++frame){
    if(frame<30){AliveMidiPreviewV1 request{1,sizeof request,0,60+frame%12,100,0,preparation,++serial};assert(alive_midi_preview_v1(&request));last=request.serial;}
    if(frame==30)assert(alive_midi_release_v1(preparation,last));
    charged_events=0;render(1);assert(charged_events<=32);total-=window[frame%1024];window[frame%1024]=charged_events;total+=charged_events;assert(total<=64);
    refused|=midi().preview_error==ALIVE_MIDI_LIMIT;
    if(frame==30)assert(!midi().preview_active);
  }assert(refused);
}
void unchanged_held_pitch_survives_without_root_clear_or_retrigger() {
  setup(1);start();render(1200);const auto before=state();dispatched.clear();
  AliveMidiEditV1 r{};r.version=1;r.struct_bytes=sizeof r;r.preparation_revision=preparation;r.serial=++serial;r.source_revision=midi().source_revision;r.event_count=4;
  r.events[0]={0,0,ALIVE_SESSION_NOTE_ON,0,64,80};r.events[1]={0,0,ALIVE_SESSION_NOTE_ON,0,67,100};r.events[2]={4096,0,ALIVE_SESSION_NOTE_OFF,0,64,0};r.events[3]={4096,0,ALIVE_SESSION_NOTE_OFF,0,67,0};
  assert(alive_midi_edit_v1(&r));render(1);assert(midi().status==ALIVE_MIDI_APPLIED);
  assert(state().tracks[0].track_epoch==before.tracks[0].track_epoch);
  assert(state().tracks[0].mixer.active_voices>=2);assert(dispatched.size()==2&&dispatched[0].pitch==60&&dispatched[1].pitch==67);
}
void source_swap_preserves_pending_shared_slot_target_and_offset() {
  setup(2);start();render(1200);
  AliveSessionRequestV4 request{};request.version=4;request.struct_bytes=sizeof request;request.kind=ALIVE_SESSION_V4_TRACK_ACTIONS;request.track_mask=1;request.preparation_revision=preparation;request.request_serial=++serial;request.tracks[0]={ALIVE_SESSION_V4_LAUNCH,1};
  AliveSessionReceiptV4 receipt{};receipt.version=4;receipt.struct_bytes=sizeof receipt;assert(alive_session_request_v4(&request,&receipt));render(1);
  const auto target=state().tracks[0].pending_frame;assert(target!=UINT64_MAX);render(1024);replace(64);render(1);assert(midi().status==ALIVE_MIDI_APPLIED);assert(state().tracks[0].pending_frame==target);
  while(state().absolute_frame<target)render(unsigned(std::min<uint64_t>(1024,target-state().absolute_frame)));
  dispatched.clear();replace(67);render(1);assert(midi().status==ALIVE_MIDI_APPLIED);
  const auto after=state();assert(after.tracks[0].phase==1025&&after.tracks[0].active_slot==1);
  assert(after.receipts[request.request_serial%128].status==ALIVE_SESSION_V4_APPLIED);
  assert(dispatched.size()==3&&dispatched[0].pitch==64&&dispatched[1].pitch==64&&dispatched[2].pitch==67);
}
void measure_reconciliation_callback() {
  setup();start();render(1200);std::array<double,32> micros{};
  for(unsigned i=0;i<micros.size();++i){
    replace(62+i%2);const auto before=std::chrono::steady_clock::now();render(256);
    micros[i]=std::chrono::duration<double,std::micro>(std::chrono::steady_clock::now()-before).count();
    assert(midi().status==ALIVE_MIDI_APPLIED);render(1024);
  }
  std::sort(micros.begin(),micros.end());std::printf("MIDI measured256-frame reconciliation: median %.1f us, p95 %.1f us, max %.1f us; deadline5333.3 us (32 samples, one instrument)\n",micros[16],micros[30],micros[31]);
}
}
int main() {
  dispatched.reserve(4096);ultra::alive_session_test_dispatch=trace;ultra::alive_session_test_charge=charge;
  measure_reconciliation_callback();audio_stop_resolves_pending_source_receipt();dense_source_refuses_optional_capability_but_keeps_normal_playback();shrinking_source_event_count_clears_unused_storage();held_edit_preserves_transport_and_roots();stopped_preview_is_real_audio_and_releases();
  inactive_source_edit_leaves_playing_source_until_launch();velocity_edit_changes_future_note_on_without_retrigger();scheduled_pitch_collision_never_retriggers_or_releases_music();busy_stale_and_recent_work_refusal_preserve_source();
  expiry_and_stop_release_preview_without_frontend_timer();exact_note_off_phase_does_not_chase_an_ended_note();stopped_source_edits_need_no_reconstruction_guard();loop_boundary_and_exact_note_on_dispatch_once();saturated_preview_retains_release_and_event_ceilings();unchanged_held_pitch_survives_without_root_clear_or_retrigger();source_swap_preserves_pending_shared_slot_target_and_offset();ultra_audio_stop();
  std::puts("MIDI: source reconciliation, real stopped Preview, collisions, expiry, Stop, exact phase and refusal pass");
}
