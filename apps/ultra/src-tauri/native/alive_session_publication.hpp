// Included inside AliveSession. PCM ownership stays with the control-thread host.
private:
AliveSessionPublicationV4 publication_request_{};
AliveSessionPublicationStateV4 publication_state_{};
std::array<std::atomic<uint64_t>,8> publication_words_{};
std::atomic<uint64_t> publication_submitted_{0};
std::atomic<uint64_t> publication_inflight_{0};
std::atomic<uint64_t> publication_track_inflight_{0};
uint64_t publication_ingress_=0;
bool publication_ready_=false,publication_done_=false;
bool publication_control_=false;

void publication_configure(const AliveSessionConfigV4& c)noexcept {
  publication_request_={};publication_state_={};
  publication_state_.version=4;publication_state_.struct_bytes=sizeof publication_state_;
  publication_state_.preparation_revision=c.preparation_revision;
  publication_state_.stop_epoch=applied_stop_;
  publication_submitted_=0;publication_inflight_=0;publication_track_inflight_=0;publication_ingress_=0;publication_ready_=publication_done_=false;
}
void publication_note_applied()noexcept {++publication_state_.bank_revision;}
void publication_publish()noexcept {
  publication_state_.stop_epoch=applied_stop_;
  if(publication_done_){
    publication_state_.retired_serial=publication_state_.serial;
    publication_done_=false;midi_done_=true;
  }
  for(unsigned i=0;i<8;++i){uint64_t word;std::memcpy(&word,reinterpret_cast<const char*>(&publication_state_)+i*8,8);publication_words_[i].store(word,std::memory_order_relaxed);}
}
static unsigned mapped_mask_v4(unsigned mask,const uint32_t* tracks)noexcept {
  unsigned result=0;for(unsigned t=0;t<8;++t)if((mask&(1u<<t))&&tracks[t]!=None)result|=1u<<tracks[t];return result;
}
static bool same_root_v4(AliveSessionDeviceV2 a,AliveSessionDeviceV2 b)noexcept {
  a.bypassed=b.bypassed=0;
  for(unsigned p=0;p<16;++p){a.parameters[p].base=b.parameters[p].base=0;a.parameters[p].automated=b.parameters[p].automated=0;}
  return std::memcmp(&a,&b,sizeof a)==0;
}
static bool valid_map_v4(const uint32_t* map,unsigned capacity,unsigned old_count,unsigned new_count)noexcept {
  uint64_t seen=0;
  for(unsigned i=0;i<capacity;++i){const auto n=map[i];
    if(n==None)continue;
    if(i>=old_count||n>=new_count||(seen&(uint64_t(1)<<n)))return false;
    seen|=uint64_t(1)<<n;
  }
  return true;
}
static bool same_events_v4(const AliveSessionConfigV4& old,unsigned before,const AliveSessionConfigV4& next,unsigned after)noexcept {
  if(before==None||after==None)return before==after;
  const auto &a=old.sources[before],&b=next.sources[after];
  if(a.kind!=b.kind||a.length_frames!=b.length_frames||a.event_count!=b.event_count||a.lane_count!=b.lane_count||
     std::memcmp(a.owned_masks,b.owned_masks,sizeof a.owned_masks))return false;
  for(unsigned e=0;e<a.event_count;++e){auto x=old.events[a.event_begin+e],y=next.events[b.event_begin+e];x.track=y.track=0;
    if(std::memcmp(&x,&y,sizeof x))return false;
  }
  return true;
}
bool publication_reserve_v4(unsigned scans,unsigned writes,uint64_t guard=0)noexcept {
  if(publication_control_&&!state_.playing)return true;
  const auto limits=clip_admission::policy(config().profile);
  const Cost cost{0,0,scans,writes,guard};
  const auto frame=clip_admission::cost(limits.optional_frame),window=clip_admission::cost(limits.optional_window);
  for(unsigned m=1;m<5;++m)if(optional_.entries[state_.absolute_frame%1024][m]+cost[m]>frame[m]||optional_.total[m]+cost[m]>window[m])return false;
  optional_.charge(state_.absolute_frame,cost);trace_charge(1,cost);
  return true;
}
bool publication_work_v4(const MidiBank& bank,unsigned notes)noexcept {
  if(publication_control_&&!state_.playing)return true;
  const bool preview=midi_enabled_&&bank.preview_admitted;
  const auto& proof=launch_active_?(preview?bank.launch:bank.base_launch):(preview?bank.regular:bank.base_regular);
  const auto& future=launch_active_?bank.launch_placement:bank.placement;
  const auto limits=clip_admission::policy(config().profile);
  const auto frame=clip_admission::cost(limits.scheduled_frame),window=clip_admission::cost(limits.scheduled_window);
  const auto current=unsigned(state_.absolute_frame%1024);
  if(midi_events_.total[0]+notes+1>MidiAllowance)return false;
  bool quick=true;
  for(unsigned m=0;m<5;++m){
    const auto work=state_.playing?proof.future[m][1024]:0;
    if(scheduled_.total[m]+(m==0?notes:0)+work>(m?window[m]:64)||
       scheduled_.entries[current][m]+(m==0?notes:0)>(m?frame[m]:32))quick=false;
  }
  if(placement_scheduled_.total+(state_.playing?future[1024]:0)>512)quick=false;
  // A sufficient bound avoids a full rolling-horizon sweep for sparse edits.
  if(quick)return true;
  if(!publication_reserve_v4(0,0,clip_admission::HorizonSteps))return false;
  if(preview){if(!midi_horizon(proof,notes))return false;}
  else {
    Cost past=scheduled_.total;past[0]+=notes;
    for(unsigned w=0;w<=1024;++w){for(unsigned m=0;m<5;++m)
        if(past[m]+(state_.playing?proof.future[m][w]:0)>(m?window[m]:64))return false;
      if(w<1024)clip_admission::subtract(past,scheduled_.entries[(current+w+1)%1024]);
    }
  }
  uint64_t past=placement_scheduled_.total;
  for(unsigned w=0;w<=1024;++w){
    if(past+(state_.playing?future[w]:0)>512)return false;
    if(w<1024)past-=placement_scheduled_.entries[(current+w+1)%1024];
  }
  return true;
}

void publication_sample(CanvasWorkspace& workspace)noexcept {
  if(!publication_ready_||!midi_)return;
  publication_ready_=false;
  const auto next=midi_->pending.load(std::memory_order_acquire);
  if(next>=2)return;
  auto& bank=midi_->banks[next];
  const auto old_bank=midi_bank_;
  const auto& before=midi_->banks[old_bank];
  const auto& request=publication_request_;
  publication_state_.serial=request.serial;publication_state_.applied_frame=state_.absolute_frame;
  publication_state_.stop_epoch=applied_stop_;
  auto finish_publication=[&](unsigned status,unsigned error){publication_state_.status=status;publication_state_.error=error;publication_done_=true;};
  if(request.stop_epoch!=applied_stop_||request.stop_epoch!=stop_epoch_.load(std::memory_order_acquire)){
    finish_publication(ALIVE_SESSION_V4_CANCELED,ALIVE_SESSION_V4_STOP_CANCELED);return;
  }
  if(request.bank_revision!=publication_state_.bank_revision){finish_publication(ALIVE_SESSION_V4_REJECTED,ALIVE_SESSION_V4_STALE_PREPARATION);return;}
  if((launch_active_&&!bank.launch_admitted)||((midi_state_.preview_active||midi_preview_pending_.serial)&&!bank.preview_admitted)){
    finish_publication(ALIVE_SESSION_V4_REJECTED,ALIVE_SESSION_V4_WORK_LIMIT);return;
  }
  unsigned placement_work=0,mapped_tracks=0;
  for(unsigned t=0;t<before.config.track_count;++t){const auto n=request.tracks[t];if(n==None)continue;mapped_tracks|=1u<<n;
    if(resolved_[t].authority==ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY)placement_work+=bank.config.tracks[n].placement_count?4:0;
    else if(resolved_[t].active_slot!=None&&request.slots[resolved_[t].active_slot]!=None)placement_work+=2;
  }
  for(unsigned t=0;t<bank.config.track_count;++t)if(!(mapped_tracks&(1u<<t))&&bank.config.tracks[t].placement_count)placement_work+=4;
  if(placement_work&&!publication_control_&&!reserve_optional_placement(placement_work)){finish_publication(ALIVE_SESSION_V4_REJECTED,ALIVE_SESSION_V4_WORK_LIMIT);return;}
  std::array<AliveSessionTrackStateV3,8> tracks{};
  std::array<ResolvedCursor,8> resolved{};
  std::array<std::array<unsigned,128>,8> held{};
  std::array<unsigned,8> cursor{};
  std::array<bool,8> clear{};
  std::array<unsigned,8> old_track{};old_track.fill(None);
  for(unsigned t=0;t<bank.config.track_count;++t){
    auto& ts=tracks[t];ts.active_clip=ts.pending_clip=None;ts.pending_frame=NoFrame;
    ts.mixer.gain=bank.config.tracks[t].gain;ts.mixer.mute=bank.config.tracks[t].mute;ts.mixer.solo=bank.config.tracks[t].solo;clear[t]=true;
  }
  unsigned changed=0;
  const auto previous_position=state_.position;
  const double ratio=before.config.tempo_bpm/bank.config.tempo_bpm;
  uint64_t position=uint64_t(std::llround(double(previous_position)*ratio));
  if(bank.config.loop_enabled&&position>=bank.config.loop_end)position=bank.config.loop_start+(position-bank.config.loop_end)%(bank.config.loop_end-bank.config.loop_start);
  for(unsigned t=0;t<before.config.track_count;++t){const unsigned n=request.tracks[t];if(n==None)continue;
    old_track[n]=t;tracks[n]=state_.tracks[t];resolved[n]=resolved_[t];held[n]=midi_held_[t];cursor[n]=cursors_[t];clear[n]=clear_[t];
    auto& ts=tracks[n];auto& r=resolved[n];
    ts.phase=uint64_t(std::llround(double(ts.phase)*ratio));
    const auto old_source=r.source;
    const auto old_slot=r.active_slot;
    r.source=r.source==None?None:request.sources[r.source];
    r.active_slot=r.active_slot==None?None:request.slots[r.active_slot];
    r.remembered_slot=r.remembered_slot==None?None:request.slots[r.remembered_slot];
    r.pending_slot=r.pending_slot==None?None:request.slots[r.pending_slot];
    r.occurrence=r.occurrence==None?None:request.placements[r.occurrence];
    if(r.authority==ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY){unsigned probes=0;r=resolve_arrangement(n,position,probes,1,&bank.runtime);
      if(r.phase!=ts.phase||r.source!=(old_source==None?None:request.sources[old_source]))changed|=1u<<n;
      ts.phase=r.phase;
    }else if(old_slot!=None&&r.active_slot==None){r.source=None;r.phase=ts.phase=0;changed|=1u<<n;
    }else if(r.active_slot!=None){const auto& slot=bank.config.slots[r.active_slot];r.source=slot.source;
      if(r.source!=(old_source==None?None:request.sources[old_source]))changed|=1u<<n;
      const auto end=slot.loop_enabled?slot.loop_end:slot.end_marker;
      if(ts.phase>=end){if(slot.loop_enabled)ts.phase=slot.loop_start+(ts.phase-slot.loop_end)%(slot.loop_end-slot.loop_start);else{r.source=r.active_slot=None;ts.phase=0;}changed|=1u<<n;}
      r.phase=ts.phase;
    }else if(r.source==None){ts.phase=0;changed|=1u<<n;}
    if(ratio!=1||(r.source!=None&&(bank.changed_sources&(1u<<r.source))))changed|=1u<<n;
    if(r.source!=None&&bank.config.sources[r.source].kind==ALIVE_SESSION_V4_AUDIO){
      const auto old_audio=old_source==None?None:before.config.sources[old_source].audio_buffer;
      const auto new_audio=bank.config.sources[r.source].audio_buffer;
      if(old_audio==None||before.runtime.audio[old_audio].samples!=bank.runtime.audio[new_audio].samples)changed|=1u<<n;
    }
    ts.active_clip=r.source;
    if(ts.pending_action==ALIVE_SESSION_V4_LAUNCH)ts.pending_clip=request.slots[ts.pending_clip];
    r.pending_slot=ts.pending_action==ALIVE_SESSION_V4_LAUNCH?ts.pending_clip:None;
  }
  for(unsigned t=0;t<bank.config.track_count;++t)if(old_track[t]==None){unsigned probes=0;resolved[t]=resolve_arrangement(t,position,probes,1,&bank.runtime);
    tracks[t].active_clip=resolved[t].source;tracks[t].phase=resolved[t].phase;changed|=1u<<t;
  }
  std::array<std::array<unsigned,128>,8> desired=held;
  std::array<std::array<double,16>,16> values{};
  std::array<std::array<bool,16>,16> owned{};
  unsigned scans=0,notes=0;
  for(unsigned t=0;t<bank.config.track_count;++t)if((changed&(1u<<t))&&state_.playing&&tracks[t].active_clip!=None)scans+=bank.config.sources[tracks[t].active_clip].event_count;
  if(!publication_reserve_v4(scans,0)){finish_publication(ALIVE_SESSION_V4_REJECTED,ALIVE_SESSION_V4_WORK_LIMIT);return;}
  for(unsigned d=0;d<bank.config.device_count;++d)for(unsigned p=0;p<bank.config.devices[d].parameter_count;++p){values[d][p]=state_.devices[d].effective[p];owned[d][p]=state_.devices[d].owned[p];}
  for(unsigned t=0;t<bank.config.track_count;++t)if(changed&(1u<<t)){
    desired[t].fill(0);cursor[t]=0;const auto& chain=bank.config.tracks[t];
    for(unsigned member=chain.instrument==None?1:0;member<=chain.effect_count;++member){const auto d=member?chain.effects[member-1]:chain.instrument;
      for(unsigned p=0;p<bank.config.devices[d].parameter_count;++p){values[d][p]=state_.devices[d].base[p];owned[d][p]=state_.playing&&tracks[t].active_clip!=None&&bool(bank.config.sources[tracks[t].active_clip].owned_masks[d]&(1u<<p));}
    }
    if(state_.playing&&tracks[t].active_clip!=None){const auto& s=bank.config.sources[tracks[t].active_clip];
      for(unsigned e=0;e<s.event_count;++e){trace_read(false);const auto& event=bank.config.events[s.event_begin+e];if(event.frame>tracks[t].phase)break;++cursor[t];
        if(event.kind==ALIVE_SESSION_NOTE_ON)desired[t][event.target]=unsigned(event.value);
        else if(event.kind==ALIVE_SESSION_NOTE_OFF)desired[t][event.target]=0;
        else if(event.kind==ALIVE_SESSION_AUTOMATION)values[event.device][event.target]=event.value;
      }
    }
    for(unsigned pitch=0;pitch<128;++pitch)if(bool(held[t][pitch])!=bool(desired[t][pitch])){
      const unsigned prior=old_track[t];
      if(prior==None||!midi_owns(prior,pitch))++notes;
    }
  }
  unsigned writes=0;for(unsigned d=0;d<bank.config.device_count;++d)for(unsigned p=0;p<bank.config.devices[d].parameter_count;++p)writes+=values[d][p]!=state_.devices[d].effective[p];
  if(!publication_reserve_v4(0,writes)||!publication_work_v4(bank,notes)){
    finish_publication(ALIVE_SESSION_V4_REJECTED,ALIVE_SESSION_V4_WORK_LIMIT);return;
  }
  for(unsigned t=0;t<before.config.track_count;++t)if(request.tracks[t]==None||
      (state_.tracks[t].pending_action==ALIVE_SESSION_V4_LAUNCH&&request.slots[state_.tracks[t].pending_clip]==None))cancel_pending(t,ALIVE_SESSION_V4_EMPTY_SLOT);
  for(unsigned i=0;i<128;++i){auto& receipt=state_.receipts[i];
    receipt.track_mask=mapped_mask_v4(receipt.track_mask,request.tracks);receipt.pending_mask=mapped_mask_v4(receipt.pending_mask,request.tracks);
    receipt.applied_mask=mapped_mask_v4(receipt.applied_mask,request.tracks);receipt.superseded_mask=mapped_mask_v4(receipt.superseded_mask,request.tracks);
    receipt.canceled_mask=mapped_mask_v4(receipt.canceled_mask,request.tracks);receipt.rejected_mask=mapped_mask_v4(receipt.rejected_mask,request.tracks);
  }
  for(unsigned t=0;t<bank.config.track_count;++t)if(tracks[t].pending_action==ALIVE_SESSION_V4_LAUNCH&&tracks[t].pending_clip==None){tracks[t].pending_action=0;tracks[t].pending_serial=0;tracks[t].pending_frame=NoFrame;resolved[t].pending_slot=None;}
  if(midi_state_.preview_active||state_.absolute_frame<midi_tail_){const auto mapped=request.tracks[midi_state_.preview_track];
    if(mapped!=None)midi_state_.preview_track=mapped;
  }
  if(midi_preview_pending_.serial){const auto mapped=request.tracks[midi_preview_pending_.track];
    if(mapped==None){midi_preview_pending_={};midi_state_.preview_error=ALIVE_MIDI_STOPPED;}else midi_preview_pending_.track=mapped;
  }
  state_.track_count=bank.config.track_count;state_.position=position;
  std::copy_n(tracks.begin(),8,state_.tracks);resolved_=resolved;cursors_=cursor;clear_=clear;midi_held_=held;
  midi_bank_=next;midi_enabled_=midi_enabled_&&bank.preview_admitted;midi_->admitted=bank.preview_admitted;active_config_.store(&bank.runtime,std::memory_order_release);
  midi_->active.store(next,std::memory_order_release);
  launch_admitted_=bank.launch_admitted;
  midi_charge(notes);
  for(unsigned t=0;t<bank.config.track_count;++t)if(changed&(1u<<t)){
    for(unsigned pitch=0;pitch<128;++pitch)if(midi_held_[t][pitch]&&!desired[t][pitch]){midi_held_[t][pitch]=0;if(!midi_owns(t,pitch))midi_note(workspace,t,pitch,0);}
    for(unsigned pitch=0;pitch<128;++pitch)if(!midi_held_[t][pitch]&&desired[t][pitch]){midi_held_[t][pitch]=desired[t][pitch];if(!midi_owns(t,pitch))midi_note(workspace,t,pitch,desired[t][pitch]);}
    clear_[t]=!state_.playing||tracks[t].active_clip==None;
  }
  for(unsigned d=0;d<bank.config.device_count;++d)for(unsigned p=0;p<bank.config.devices[d].parameter_count;++p){state_.devices[d].owned[p]=owned[d][p];if(values[d][p]!=state_.devices[d].effective[p])parameter(workspace,d,p,values[d][p]);}
  ++publication_state_.bank_revision;++midi_state_.source_revision;
  finish_publication(ALIVE_SESSION_V4_APPLIED,0);
}

public:
void publication_pump(CanvasWorkspace& workspace)noexcept {
  // The stopped backend has no audio callback whose work window can expire.
  publication_control_=true;begin(workspace);sample(workspace);publish(workspace);publication_control_=false;
}
bool publication_snapshot(AliveSessionPublicationStateV4& out)const noexcept {
  if(!header_v4(out.version,out.struct_bytes,sizeof out)||mode_!=Mode::Workspaces||!midi_)return false;
  for(unsigned attempt=0;attempt<4;++attempt){const auto before=publication_.load(std::memory_order_acquire);if(before&1)continue;
    AliveSessionPublicationStateV4 result{};
    for(unsigned i=0;i<8;++i){const auto word=publication_words_[i].load(std::memory_order_relaxed);std::memcpy(reinterpret_cast<char*>(&result)+i*8,&word,8);}
    if(before!=publication_.load(std::memory_order_acquire))continue;
    const auto submitted=publication_submitted_.load(std::memory_order_acquire);
    if(submitted>result.serial){result.serial=submitted;result.status=ALIVE_SESSION_V4_QUEUED;result.error=0;}
    out=result;return true;
  }return false;
}
bool publication(const AliveSessionConfigV4& candidate,const AliveSessionAudioBufferV4* audio,unsigned audio_count,
                 const AliveSessionPublicationV4& request,CanvasWorkspace& workspace)noexcept {
  if(!header_v4(request.version,request.struct_bytes,sizeof request)||request.reserved||!request.serial||!candidate.track_count||candidate.track_count>8||
     request.changed_tracks>>candidate.track_count)return reject_v4(ALIVE_SESSION_V4_BAD_HEADER,"Invalid schedule publication header.");
  if(mode_!=Mode::Workspaces||!midi_||request.preparation_revision!=config().preparation_revision||
     candidate.preparation_revision!=request.preparation_revision||request.serial<=publication_ingress_)
    return reject_v4(ALIVE_SESSION_V4_STALE_PREPARATION,"Stale schedule publication identity.");
  if(midi_->pending.load(std::memory_order_acquire)!=2)return reject_v4(ALIVE_SESSION_V4_RECEIPT_BUSY,"A musical edit is awaiting callback publication.");
  AliveSessionPublicationStateV4 observed{};observed.version=4;observed.struct_bytes=sizeof observed;
  if(!publication_snapshot(observed)||request.bank_revision!=observed.bank_revision||request.stop_epoch!=stop_epoch_.load(std::memory_order_acquire))
    return reject_v4(ALIVE_SESSION_V4_STALE_PREPARATION,"Stale schedule bank or Stop epoch.");
  const auto active=midi_->active.load(std::memory_order_acquire),next=1-active;
  const auto& old=midi_->banks[active].config;
  if(!bounds_v4(candidate)||!audio_bounds_v4(candidate,audio,audio_count))return false;
  if(candidate.profile!=old.profile||candidate.device_count!=old.device_count||
     !valid_map_v4(request.tracks,8,old.track_count,candidate.track_count)||
     !valid_map_v4(request.sources,32,old.source_count,candidate.source_count)||
     !valid_map_v4(request.slots,32,old.slot_count,candidate.slot_count)||
     !valid_map_v4(request.placements,64,old.placement_count,candidate.placement_count))
    return reject_v4(ALIVE_SESSION_V4_BAD_OWNERSHIP,"Invalid stable-identity publication maps.");
  for(unsigned d=0;d<old.device_count;++d){if(!same_root_v4(old.devices[d],candidate.devices[d]))return reject_v4(ALIVE_SESSION_V4_GRAPH_REJECTED,"Live publication must retain its prepared device roots.");
    if(!measured_graph(candidate.devices[d],d,candidate.events,candidate.event_count,workspace.runtime(candidate.devices[d].document).plan().graph,
       [&](unsigned error,const char* message){return reject_v4(error,message);}))return false;
  }
  for(unsigned t=0;t<old.track_count;++t){const auto n=request.tracks[t];const auto& a=old.tracks[t];
    if(n==None){if(a.instrument!=None||a.effect_count)return reject_v4(ALIVE_SESSION_V4_GRAPH_REJECTED,"Removing a prepared root requires a graph transaction.");continue;}
    const auto& b=candidate.tracks[n];if(a.kind!=b.kind||a.instrument!=b.instrument||a.effect_count!=b.effect_count||std::memcmp(a.effects,b.effects,sizeof a.effects))
      return reject_v4(ALIVE_SESSION_V4_GRAPH_REJECTED,"Live publication must retain track input and root ownership.");
  }
  for(unsigned s=0;s<old.source_count;++s)if(request.sources[s]!=None){const auto& a=old.sources[s];const auto& b=candidate.sources[request.sources[s]];
    if(request.tracks[a.track]!=b.track||a.kind!=b.kind)return reject_v4(ALIVE_SESSION_V4_BAD_OWNERSHIP,"Mapped source changed track or kind.");
  }
  for(unsigned s=0;s<old.slot_count;++s)if(request.slots[s]!=None&&request.tracks[old.slots[s].track]!=candidate.slots[request.slots[s]].track)
    return reject_v4(ALIVE_SESSION_V4_BAD_OWNERSHIP,"Mapped slot changed track.");
  for(unsigned p=0;p<old.placement_count;++p)if(request.placements[p]!=None&&request.tracks[old.placements[p].track]!=candidate.placements[request.placements[p]].track)
    return reject_v4(ALIVE_SESSION_V4_BAD_OWNERSHIP,"Mapped placement changed track.");
  auto& bank=midi_->banks[next];bank.config=candidate;
  if(!midi_prove(bank,false))return reject_v4(ALIVE_SESSION_V4_WORK_LIMIT,"Schedule publication exceeds the complete playback envelope.");
  normalize_v4(candidate,audio,audio_count,bank.runtime);
  publication_request_=request;
  bank.changed_sources=candidate.source_count==32?UINT32_MAX:(1u<<candidate.source_count)-1;
  for(unsigned s=0;s<old.source_count;++s){const auto n=request.sources[s];
    if(n!=None&&same_events_v4(old,s,candidate,n))bank.changed_sources&=~(1u<<n);
  }
  Command command{};command.kind=11;command.frame=request.serial;command.param=next;
  bool remaps_tracks=false;for(unsigned t=0;t<old.track_count;++t)remaps_tracks|=request.tracks[t]!=t;
  // Mixer and Preview indices stay valid when existing tracks retain their positions.
  publication_track_inflight_.store(remaps_tracks?request.serial:0,std::memory_order_release);
  publication_inflight_.store(request.serial,std::memory_order_release);
  midi_->pending.store(next,std::memory_order_release);
  if(!enqueue(command)){midi_->pending.store(2,std::memory_order_release);publication_inflight_.store(0,std::memory_order_release);publication_track_inflight_.store(0,std::memory_order_release);return false;}
  publication_ingress_=request.serial;publication_submitted_.store(request.serial,std::memory_order_release);return true;
}
