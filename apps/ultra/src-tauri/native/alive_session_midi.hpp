// Included inside AliveSession. Two immutable banks are prepared by serialized
// control ingress; the callback publishes retirement before either can be reused.
private:
static constexpr unsigned MidiAllowance=10, MidiWindow=1024;
struct MidiBank {
  AliveSessionConfigV4 config{};
  clip_admission::Prepared regular{},launch{};
};
struct MidiData {
  std::array<MidiBank,2> banks{};
  std::atomic<unsigned> active{0},pending{2};
  std::atomic<uint64_t> submitted{0},release{0};
  uint64_t ingress=0,preview_ingress=0;
  bool admitted=false;
};
std::unique_ptr<MidiData> midi_;
unsigned midi_bank_=0;
bool midi_enabled_=false,midi_ready_=false,midi_done_=false;
uint64_t midi_epoch_=0,midi_release_seen_=0,midi_tail_=0;
AliveMidiStateV1 midi_state_{};
std::array<std::atomic<uint64_t>,sizeof(AliveMidiStateV1)/8> midi_published_{};
std::array<std::array<unsigned,128>,8> midi_held_{};
clip_admission::Ledger midi_events_{};
AliveMidiPreviewV1 midi_preview_pending_{};

const AliveSessionEventV2& scheduled_event(unsigned index)const noexcept {
  return mode_==Mode::Workspaces&&midi_enabled_?midi_->banks[midi_bank_].config.events[index]:config_.events[index];
}
const AliveSessionSourceV4& midi_source(unsigned index)const noexcept {
  return midi_enabled_?midi_->banks[midi_bank_].config.sources[index]:config_.sources[index];
}
const clip_admission::Prepared& midi_proof(bool launch=false)const noexcept {
  if(mode_==Mode::Workspaces&&midi_enabled_)return launch?midi_->banks[midi_bank_].launch:midi_->banks[midi_bank_].regular;
  return launch?launch_prepared_:prepared_;
}
bool midi_prove(MidiBank& bank)noexcept {
  auto proof=std::make_unique<workspace_admission::Proof>();
  if(!bounds_v4(bank.config,true)||!workspace_admission::build_validated(bank.config,*proof))return false;
  bank.regular=proof->prepared;
  if(!workspace_admission::build_validated(bank.config,*proof,true))return false;
  bank.launch=proof->prepared;
  for(auto* prepared:{&bank.regular,&bank.launch}){
    for(unsigned w=1;w<=MidiWindow;++w)prepared->future[0][w]+=MidiAllowance;
    if(prepared->future[0][1]>32||prepared->future[0][MidiWindow]>64)return false;
  }
  return true;
}
void midi_configure(const AliveSessionConfigV4& config)noexcept {
  midi_=std::make_unique<MidiData>();midi_->banks[0].config=config;
  const auto diagnostic=diagnostic4_;const auto error=error_;
  midi_->admitted=midi_prove(midi_->banks[0]);diagnostic4_=diagnostic;error_=error;
  midi_bank_=0;midi_enabled_=midi_ready_=midi_done_=false;midi_epoch_=midi_release_seen_=midi_tail_=0;
  midi_state_={};midi_state_.version=1;midi_state_.struct_bytes=sizeof midi_state_;midi_state_.preparation_revision=config.preparation_revision;
  midi_held_={};midi_events_={};midi_preview_pending_={};
}
void midi_publish()noexcept {
  for(unsigned i=0;i<midi_published_.size();++i){uint64_t word;std::memcpy(&word,reinterpret_cast<const char*>(&midi_state_)+i*8,8);midi_published_[i].store(word,std::memory_order_relaxed);}
}
bool midi_output(unsigned track)const noexcept {
  return mode_==Mode::Workspaces&&midi_&&midi_state_.preview_track==track&&(midi_state_.preview_active||state_.absolute_frame<midi_tail_);
}
void midi_clear_track(unsigned track)noexcept {
  midi_held_[track].fill(0);
  if(midi_state_.preview_track==track){midi_state_.preview_active=0;midi_state_.preview_expiry=0;midi_tail_=0;}
}
bool midi_owns(unsigned track,unsigned pitch)const noexcept {
  return mode_==Mode::Workspaces&&midi_state_.preview_active&&midi_state_.preview_track==track&&midi_state_.preview_pitch==pitch;
}
void midi_dispatch(CanvasWorkspace& workspace,const AliveSessionEventV2& event)noexcept {
  if(mode_!=Mode::Workspaces||event.kind==ALIVE_SESSION_AUTOMATION||event.kind==ALIVE_SESSION_SUSTAIN){dispatch_event_raw(workspace,event);return;}
  if(event.kind==ALIVE_SESSION_NOTE_ON){midi_held_[event.track][event.target]=unsigned(event.value);if(midi_owns(event.track,event.target))return;}
  else if(event.kind==ALIVE_SESSION_NOTE_OFF){midi_held_[event.track][event.target]=0;if(midi_owns(event.track,event.target))return;}
  dispatch_event_raw(workspace,event);
}
void midi_note(CanvasWorkspace& workspace,unsigned track,unsigned pitch,unsigned velocity)noexcept {
  if(velocity)clear_[track]=false;
  const AliveSessionEventV2 event{state_.tracks[track].phase,track,velocity?ALIVE_SESSION_NOTE_ON:ALIVE_SESSION_NOTE_OFF,config_.tracks[track].instrument,pitch,double(velocity)};
  dispatch_event_raw(workspace,event);
}
void midi_charge(unsigned count)noexcept {
  Cost cost{};cost[0]=count;scheduled_.charge(state_.absolute_frame,cost);midi_events_.charge(state_.absolute_frame,cost);trace_charge(0,cost);
}
void midi_release_note(CanvasWorkspace& workspace)noexcept {
  if(!midi_state_.preview_active)return;
  const auto track=midi_state_.preview_track,pitch=midi_state_.preview_pitch;
  if(!midi_held_[track][pitch]){midi_charge(1);midi_note(workspace,track,pitch,0);}
  midi_state_.preview_active=0;midi_state_.preview_expiry=0;midi_tail_=state_.absolute_frame+24000;
}
bool midi_reserve_work(unsigned scans)noexcept {
  const auto limits=clip_admission::policy(config_.profile);
  const Cost cost{0,0,scans,0,clip_admission::HorizonSteps};
  const auto allowance=clip_admission::cost(limits.optional_window);
  for(unsigned m=1;m<5;++m)if(optional_.total[m]+cost[m]>allowance[m])return false;
  optional_.charge(state_.absolute_frame,cost);trace_charge(1,cost);return true;
}
bool midi_horizon(const clip_admission::Prepared& proof,unsigned notes)noexcept {
  const auto limits=clip_admission::policy(config_.profile);
  const auto frame=clip_admission::cost(limits.scheduled_frame),window=clip_admission::cost(limits.scheduled_window);
  const auto current=unsigned(state_.absolute_frame%MidiWindow);
  // Keep one future note-off available for every accepted Preview owner.
  if(midi_events_.total[0]+notes+1>MidiAllowance)return false;
  if(scheduled_.entries[current][0]+notes>32)return false;
  Cost past=scheduled_.total;past[0]+=notes;
  uint64_t past_midi=midi_events_.total[0]+notes;
  for(unsigned w=0;w<=MidiWindow;++w){
    for(unsigned m=0;m<5;++m){
      uint64_t future=state_.playing?proof.future[m][w]:(m==0&&w?MidiAllowance:0);
      // Past and future MIDI work share one rolling allowance. The prepared
      // bound includes the full allowance; already-spent work cannot recur.
      if(m==0&&w)future-=std::min<uint64_t>(MidiAllowance,past_midi);
      if(past[m]+future>(m?window[m]:64))return false;
    }
    if(w<MidiWindow){
      const auto slot=(current+w+1)%MidiWindow;
      clip_admission::subtract(past,scheduled_.entries[slot]);past_midi-=midi_events_.entries[slot][0];
      if(w+1==MidiWindow){past[0]-=notes;past_midi-=notes;}
    }
  }
  // Ordinary events for this frame have already run. Future[1] bounds the
  // next frame independently; adding it here would count two frames as one.
  for(unsigned m=0;m<5;++m)if(scheduled_.entries[current][m]+(m==0?notes:0)>(m?frame[m]:32))return false;
  return true;
}
void midi_apply_edit(CanvasWorkspace& workspace)noexcept {
  if(!midi_ready_||!midi_)return;
  midi_ready_=false;
  const unsigned next=midi_->pending.load(std::memory_order_acquire);if(next>=2)return;
  auto& bank=midi_->banks[next];
  const unsigned source=midi_edit_source_;
  const unsigned track=bank.config.sources[source].track;
  const auto& descriptor=bank.config.sources[source];
  unsigned error=midi_epoch_!=applied_stop_?ALIVE_MIDI_STOPPED:0;
  if(!error&&state_.playing&&!midi_reserve_work(state_.tracks[track].active_clip==source?descriptor.event_count:0))error=ALIVE_MIDI_LIMIT;
  unsigned cursor=0,count=0;std::array<unsigned,128> desired{};
  if(!error&&state_.playing&&state_.tracks[track].active_clip==source){
    for(;cursor<descriptor.event_count;++cursor){const auto& event=bank.config.events[descriptor.event_begin+cursor];trace_read(false);if(event.frame>state_.tracks[track].phase)break;if(event.kind==ALIVE_SESSION_NOTE_ON)desired[event.target]=unsigned(event.value);else if(event.kind==ALIVE_SESSION_NOTE_OFF)desired[event.target]=0;}
    for(unsigned pitch=0;pitch<128;++pitch)if(bool(desired[pitch])!=bool(midi_held_[track][pitch])&&!midi_owns(track,pitch))++count;
  }
  if(!error&&state_.playing&&!midi_horizon(launch_active_?bank.launch:bank.regular,count))error=ALIVE_MIDI_LIMIT;
  midi_state_.applied_frame=state_.absolute_frame;
  midi_state_.status=error?ALIVE_MIDI_REJECTED:ALIVE_MIDI_APPLIED;midi_state_.error=error;
  if(!error){
    midi_bank_=next;midi_enabled_=true;++midi_state_.source_revision;
    if(state_.playing&&state_.tracks[track].active_clip==source){
      midi_charge(count);
      for(unsigned pitch=0;pitch<128;++pitch)if(midi_held_[track][pitch]&&!desired[pitch]){midi_held_[track][pitch]=0;if(!midi_owns(track,pitch))midi_note(workspace,track,pitch,0);}
      for(unsigned pitch=0;pitch<128;++pitch)if(!midi_held_[track][pitch]&&desired[pitch]){midi_held_[track][pitch]=desired[pitch];if(!midi_owns(track,pitch))midi_note(workspace,track,pitch,desired[pitch]);}
      cursors_[track]=cursor;
    }
    midi_->active.store(next,std::memory_order_release);
  }
  midi_done_=true;
}
unsigned midi_edit_source_=0;
void midi_sample(CanvasWorkspace& workspace)noexcept {
  if(mode_!=Mode::Workspaces||!midi_)return;
  const auto release=midi_->release.load(std::memory_order_acquire);
  if(release>midi_release_seen_){midi_release_seen_=release;if(midi_state_.preview_serial<=release)midi_release_note(workspace);}
  if(midi_state_.preview_active&&state_.absolute_frame>=midi_state_.preview_expiry)midi_release_note(workspace);
  midi_apply_edit(workspace);
  const auto request=midi_preview_pending_;midi_preview_pending_={};if(!request.serial)return;
  midi_state_.preview_error=0;
  if(request.serial<=release||midi_preview_epoch_!=applied_stop_){midi_state_.preview_error=ALIVE_MIDI_STOPPED;return;}
  const bool same=midi_state_.preview_active&&request.track==midi_state_.preview_track&&request.pitch==midi_state_.preview_pitch;
  const unsigned release_count=midi_state_.preview_active&&!same&&!midi_held_[midi_state_.preview_track][midi_state_.preview_pitch]?1:0;
  const unsigned start_count=!same&&!midi_held_[request.track][request.pitch]?1:0;
  const auto& bank=midi_->banks[midi_bank_];
  const auto notes=release_count+start_count;
  if(midi_events_.total[0]+notes+1>MidiAllowance||(!midi_enabled_&&(!midi_reserve_work(0)||!midi_horizon(launch_active_?bank.launch:bank.regular,notes)))){midi_state_.preview_error=ALIVE_MIDI_LIMIT;return;}
  midi_enabled_=true;
  if(!same)midi_release_note(workspace);
  midi_state_.preview_serial=request.serial;midi_state_.preview_active=1;midi_state_.preview_track=request.track;midi_state_.preview_pitch=request.pitch;
  midi_state_.preview_expiry=state_.absolute_frame+96000;midi_tail_=0;
  if(start_count){midi_charge(1);midi_note(workspace,request.track,request.pitch,request.velocity);}
}
uint64_t midi_preview_epoch_=0;
public:
bool midi_limits(AliveMidiLimitsV1& out)const noexcept {
  if(out.version!=1||out.struct_bytes!=sizeof out)return false;
  out={1,sizeof out,unsigned(mode_==Mode::Workspaces&&midi_&&midi_->admitted),MidiAllowance,1024,0,config_.preparation_revision};return true;
}
bool midi_snapshot(AliveMidiStateV1& out)const noexcept {
  if(out.version!=1||out.struct_bytes!=sizeof out)return false;
  for(unsigned attempt=0;attempt<4;++attempt){const auto before=publication_.load(std::memory_order_acquire);if(before&1)continue;
    AliveMidiStateV1 result{};for(unsigned i=0;i<midi_published_.size();++i){const auto word=midi_published_[i].load(std::memory_order_relaxed);std::memcpy(reinterpret_cast<char*>(&result)+i*8,&word,8);}
    if(before!=publication_.load(std::memory_order_acquire))continue;
    if(midi_){const auto submitted=midi_->submitted.load(std::memory_order_acquire);if(submitted>result.serial){result.serial=submitted;result.status=ALIVE_MIDI_QUEUED;result.error=0;}}
    out=result;return true;
  }return false;
}
bool midi_edit(const AliveMidiEditV1& request)noexcept {
  if(request.version!=1||request.struct_bytes!=sizeof request||!request.serial||request.event_count>1024)return reject("Invalid MIDI source edit.");
  if(mode_!=Mode::Workspaces||!midi_||!midi_->admitted)return reject("Live MIDI editing exceeds this preparation's optional work allowance.");
  if(request.preparation_revision!=config_.preparation_revision||request.serial<=midi_->ingress)return reject("Stale MIDI edit identity.");
  if(midi_->pending.load(std::memory_order_acquire)!=2)return reject("A MIDI edit is awaiting native application.");
  AliveMidiStateV1 observed{};observed.version=1;observed.struct_bytes=sizeof observed;if(!midi_snapshot(observed)||request.source_revision!=observed.source_revision)return reject("Stale MIDI source revision.");
  const auto active=midi_->active.load(std::memory_order_acquire),next=1-active;
  const auto& old=midi_->banks[active].config;
  if(request.source>=old.source_count)return reject("MIDI source is not prepared.");
  auto& bank=midi_->banks[next];bank.config=old;auto& candidate=bank.config;unsigned count=0;
  for(unsigned source=0;source<old.source_count;++source){auto& descriptor=candidate.sources[source];descriptor.event_begin=count;
    if(source==request.source){
      for(unsigned i=0;i<request.event_count;++i){const auto& event=request.events[i];if(event.kind!=ALIVE_SESSION_NOTE_ON&&event.kind!=ALIVE_SESSION_NOTE_OFF)return reject("Live source edits contain notes only.");if(count>=1024)return reject("Live source exceeds event capacity.");candidate.events[count++]=event;}
      for(unsigned i=0;i<old.sources[source].event_count;++i){const auto& event=old.events[old.sources[source].event_begin+i];if(event.kind==ALIVE_SESSION_AUTOMATION){if(count>=1024)return reject("Live source exceeds event capacity.");candidate.events[count++]=event;}}
      std::sort(candidate.events+descriptor.event_begin,candidate.events+count,[](const auto& a,const auto& b){return std::tie(a.frame,a.kind,a.track,a.device,a.target)<std::tie(b.frame,b.kind,b.track,b.device,b.target);});
    }else for(unsigned i=0;i<old.sources[source].event_count;++i){if(count>=1024)return reject("Live source exceeds event capacity.");candidate.events[count++]=old.events[old.sources[source].event_begin+i];}
    descriptor.event_count=count-descriptor.event_begin;
  }
  candidate.event_count=count;
  std::fill(candidate.events+count,std::end(candidate.events),AliveSessionEventV2{});
  if(!midi_prove(bank))return reject("Live MIDI candidate exceeds the complete source/Preview work envelope.");
  Command command{};command.kind=9;command.track=request.source;command.param=next;command.frame=request.serial;
  midi_->pending.store(next,std::memory_order_release);
  if(!enqueue(command)){midi_->pending.store(2,std::memory_order_release);return false;}
  midi_->ingress=request.serial;midi_->submitted.store(request.serial,std::memory_order_release);return true;
}
bool midi_preview(const AliveMidiPreviewV1& request)noexcept {
  if(request.version!=1||request.struct_bytes!=sizeof request||request.reserved||!request.serial||request.pitch>127||!request.velocity||request.velocity>127)return reject("Invalid MIDI Preview request.");
  if(mode_!=Mode::Workspaces||!midi_||!midi_->admitted)return reject("MIDI Preview exceeds this preparation's optional work allowance.");
  if(request.preparation_revision!=config_.preparation_revision||request.track>=config_.track_count||request.serial<=midi_->preview_ingress)return reject("Stale MIDI Preview identity.");
  Command command{};command.kind=10;command.track=request.track;command.param=request.pitch;command.value=request.velocity;command.frame=request.serial;
  if(!enqueue(command))return false;
  midi_->preview_ingress=request.serial;return true;
}
bool midi_release(uint64_t preparation,uint64_t serial)noexcept {
  if(!midi_||mode_!=Mode::Workspaces||preparation!=config_.preparation_revision||!serial||serial>midi_->preview_ingress)return false;
  const auto old=midi_->release.load(std::memory_order_relaxed);if(serial>old)midi_->release.store(serial,std::memory_order_release);return true;
}
