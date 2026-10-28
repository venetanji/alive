// Included inside AliveSession; the additive dialect shares runtime ownership.
private:
AliveSessionDiagnosticV4 diagnostic4_{};
static bool header_v4(unsigned version, unsigned bytes, size_t expected) noexcept {
  return version == 4 && bytes == expected;
}
template <class Request> bool request_fields_v4(const Request &r) const noexcept {
  if (r.reserved || r.kind < 1 || r.kind > 3 || (r.track_mask >> 8))
    return false;
  if (r.kind == 3) {
    if (!r.track_mask || r.position)
      return false;
  } else if (r.track_mask || (r.kind == 1 && r.position))
    return false;
  for (unsigned t = 0; t < 8; ++t) {
    const auto &a = r.tracks[t];
    if (!(r.track_mask & (1u << t))) {
      if (a.action || a.slot)
        return false;
    } else if (a.action == 1) {
      if (a.slot >= 4)
        return false;
    } else if ((a.action != 2 && a.action != 3) || a.slot != None)
      return false;
  }
  return true;
}
bool reject_v4(unsigned error, const char *message, unsigned resource = 0, uint64_t observed = 0,
               uint64_t limit = 0) noexcept {
  diagnostic4_ = {};
  diagnostic4_.version = 4;
  diagnostic4_.struct_bytes = sizeof diagnostic4_;
  diagnostic4_.error = error;
  diagnostic4_.resource = resource;
  diagnostic4_.frame = NoFrame;
  diagnostic4_.window_frames = 1024;
  diagnostic4_.observed = observed;
  diagnostic4_.limit = limit;
  std::fill_n(diagnostic4_.source, 8, None);
  std::fill_n(diagnostic4_.placement, 8, None);
  return reject(message);
}
template <class T> static bool zero_record(const T &value) noexcept {
  const auto *bytes = reinterpret_cast<const unsigned char *>(&value);
  for (size_t i = 0; i < sizeof value; ++i)
    if (bytes[i])
      return false;
  return true;
}
bool bounds_v4(const AliveSessionConfigV4 &c, bool complete_midi = false) noexcept {
  if (!header_v4(c.version, c.struct_bytes, sizeof c))
    return reject_v4(ALIVE_SESSION_V4_BAD_HEADER, "Invalid v4 configuration header.");
  if ((c.profile != 1 && c.profile != 2) || c.work_policy != c.profile)
    return reject_v4(ALIVE_SESSION_V4_BAD_PROFILE, "Unknown workspace policy.");
  const unsigned max_tracks = c.profile == 1 ? 2 : 8, max_devices = c.profile == 1 ? 6 : 16;
  if (!c.track_count || c.track_count > max_tracks || c.device_count > max_devices ||
      c.source_count > (c.profile == 1 ? 8u : 32u) || c.slot_count > (c.profile == 1 ? 8u : 32u) ||
      c.placement_count > (c.profile == 1 ? 16u : 64u) || c.event_count > 1024 ||
      c.audio_buffer_count > 8 || !flag(c.loop_enabled) || !c.preparation_revision ||
      !std::isfinite(c.tempo_bpm) || c.tempo_bpm < 30 || c.tempo_bpm > 240)
    return reject_v4(ALIVE_SESSION_V4_BAD_FIELD, "Invalid workspace counts or tempo.");
  const uint64_t minimum = uint64_t(std::round((1. / 64) * 48000 * 60 / c.tempo_bpm));
  const uint64_t maximum =
      std::min<uint64_t>(24576000, uint64_t(std::round(256. * 48000 * 60 / c.tempo_bpm)));
  if (c.length_frames < minimum || c.length_frames > maximum || c.loop_start >= c.loop_end ||
      c.loop_end > c.length_frames || c.loop_end - c.loop_start < minimum)
    return reject_v4(ALIVE_SESSION_V4_BAD_FIELD, "Invalid song length or loop range.");
  std::array<int, 16> owner{};
  owner.fill(-1);
  std::array<unsigned, 16> unions{};
  std::array<unsigned, 32> slot_owners{};
  std::array<bool, 64> placement_owners{};
  std::array<bool, 1024> covered{};
  std::array<unsigned, 8> notes{}, lanes{}, points{}, sources{};
  if (complete_midi && c.audio_buffer_count)
    return reject_v4(ALIVE_SESSION_V4_FEATURE_DISABLED, "MIDI preparation cannot admit audio.");
  const bool final_midi = true;
  bool unsupported = c.audio_buffer_count;
#ifndef ULTRA_ALIVE_SESSION_V4_PROVISIONAL
  if (!complete_midi && c.profile != 1)
    return reject_v4(ALIVE_SESSION_V4_FEATURE_DISABLED,
                     "Workspace profile 2 has not passed measured deadline qualification.");
#endif
  for (unsigned d = 0; d < c.device_count; ++d) {
    if (!validate_device(c.devices[d]))
      return reject_v4(ALIVE_SESSION_V4_BAD_FIELD, "Invalid device.");
    for (unsigned p = 0; p < c.devices[d].parameter_count; ++p)
      if (c.devices[d].parameters[p].reserved)
        return reject_v4(ALIVE_SESSION_V4_BAD_FIELD, "Reserved parameter.");
    for (unsigned p = c.devices[d].parameter_count; p < 16; ++p)
      if (!zero_record(c.devices[d].parameters[p]))
        return reject_v4(ALIVE_SESSION_V4_BAD_FIELD, "Unused parameter is nonzero.");
    for (unsigned prior = 0; prior < d; ++prior)
      if (c.devices[prior].document == c.devices[d].document)
        return reject_v4(ALIVE_SESSION_V4_BAD_OWNERSHIP, "Duplicate document root.");
  }
  for (unsigned t = 0; t < c.track_count; ++t) {
    const auto &tr = c.tracks[t];
    if ((tr.kind != 1 && tr.kind != 2) || tr.reserved || tr.effect_count > 2 || !gain(tr.gain) ||
        !flag(tr.mute) || !flag(tr.solo) || (tr.kind == 2 && tr.instrument != None))
      return reject_v4(ALIVE_SESSION_V4_BAD_FIELD, "Invalid workspace track.");
    unsupported |= tr.kind != 1;
    if (final_midi && (tr.kind != 1 || tr.gain > 2 || tr.placement_count > 8))
      return reject_v4(ALIVE_SESSION_V4_BAD_FIELD, "Invalid final MIDI track shape.");
    for (unsigned member = tr.kind == 1 ? 0 : 1; member <= tr.effect_count; ++member) {
      const unsigned d = member ? tr.effects[member - 1] : tr.instrument;
      if (d >= c.device_count || owner[d] >= 0 || c.devices[d].kind != (member ? 2u : 1u))
        return reject_v4(ALIVE_SESSION_V4_BAD_OWNERSHIP, "Invalid chain ownership.");
      owner[d] = int(t);
    }
    for (unsigned member = tr.effect_count; member < 2; ++member)
      if (tr.effects[member])
        return reject_v4(ALIVE_SESSION_V4_BAD_FIELD, "Unused effect is nonzero.");
    for (unsigned slot : tr.slots) {
      if (slot == None)
        continue;
      if (slot >= c.slot_count || c.slots[slot].track != t || ++slot_owners[slot] != 1)
        return reject_v4(ALIVE_SESSION_V4_BAD_OWNERSHIP, "Invalid slot ownership.");
    }
    if (tr.placement_begin > c.placement_count ||
        tr.placement_count > c.placement_count - tr.placement_begin)
      return reject_v4(ALIVE_SESSION_V4_BAD_PLACEMENT, "Invalid track placement range.");
    uint64_t endpoint = 0;
    for (unsigned i = 0; i < tr.placement_count; ++i) {
      const unsigned index = tr.placement_begin + i;
      const auto &p = c.placements[index];
      if (placement_owners[index] || p.track != t || p.source >= c.source_count ||
          c.sources[p.source].track != t || p.reserved || !flag(p.loop_enabled) ||
          !p.duration_frames || p.start_frame > c.length_frames ||
          p.duration_frames > c.length_frames - p.start_frame || (i && p.start_frame < endpoint))
        return reject_v4(ALIVE_SESSION_V4_BAD_PLACEMENT, "Overlapping or invalid placement.");
      const auto &source = c.sources[p.source];
      if (p.source_offset >= source.length_frames ||
          (!p.loop_enabled && p.duration_frames > source.length_frames - p.source_offset) ||
          (final_midi && p.loop_enabled && source.length_frames - p.source_offset < minimum))
        return reject_v4(ALIVE_SESSION_V4_BAD_PLACEMENT, "Placement exceeds source suffix.");
      placement_owners[index] = true;
      endpoint = p.start_frame + p.duration_frames;
    }
  }
  for (unsigned d = 0; d < c.device_count; ++d)
    if (owner[d] < 0)
      return reject_v4(ALIVE_SESSION_V4_BAD_OWNERSHIP, "Unowned device.");
  for (unsigned i = 0; i < c.placement_count; ++i)
    if (!placement_owners[i])
      return reject_v4(ALIVE_SESSION_V4_BAD_PLACEMENT, "Unowned placement.");
  for (unsigned i = 0; i < c.slot_count; ++i) {
    const auto &slot = c.slots[i];
    if (slot_owners[i] != 1 || slot.track >= c.track_count || slot.source >= c.source_count ||
        c.sources[slot.source].track != slot.track || slot.reserved || !flag(slot.loop_enabled) ||
        slot.source_offset >= c.sources[slot.source].length_frames ||
        (final_midi && slot.loop_enabled &&
         c.sources[slot.source].length_frames - slot.source_offset < minimum))
      return reject_v4(ALIVE_SESSION_V4_BAD_SOURCE, "Invalid slot source.");
  }
  for (unsigned s = 0; s < c.source_count; ++s) {
    const auto &source = c.sources[s];
    if (source.track >= c.track_count || source.kind != c.tracks[source.track].kind ||
        source.reserved0 || source.reserved1 || source.event_begin > c.event_count ||
        source.event_count > c.event_count - source.event_begin || source.length_frames < minimum ||
        source.length_frames > maximum || source.lane_count > 16 ||
        (source.kind == 1 ? source.audio_buffer != None
                          : source.audio_buffer >= c.audio_buffer_count))
      return reject_v4(ALIVE_SESSION_V4_BAD_SOURCE, "Invalid source fields or range.");
    if (final_midi && ++sources[source.track] > 4)
      return reject_v4(ALIVE_SESSION_V4_BAD_SOURCE, "More than four sources per track.");
    unsigned enabled = 0;
    for (unsigned d = 0; d < 16; ++d) {
      const unsigned mask = source.owned_masks[d];
      if (mask && (d >= c.device_count || owner[d] != int(source.track) ||
                   (mask >> c.devices[d].parameter_count)))
        return reject_v4(ALIVE_SESSION_V4_BAD_OWNERSHIP, "Invalid source ownership mask.");
      unions[d] |= mask;
      enabled += session_bits::count(mask);
    }
    if (enabled > source.lane_count || (lanes[source.track] += source.lane_count) > 16)
      return reject_v4(ALIVE_SESSION_V4_BAD_SOURCE, "Source lanes exceed track bound.");
    std::array<bool, 128> held{};
    unsigned held_count = 0;
    for (unsigned i = 0; i < source.event_count; ++i) {
      const unsigned at = source.event_begin + i;
      const auto &e = c.events[at];
      if (covered[at] || e.track != source.track || e.device >= c.device_count ||
          owner[e.device] != int(e.track) || e.frame >= source.length_frames ||
          e.kind > ALIVE_SESSION_NOTE_ON || !std::isfinite(e.value))
        return reject_v4(ALIVE_SESSION_V4_BAD_OWNERSHIP, "Invalid source event ownership or kind.");
      covered[at] = true;
      if (i) {
        const auto &p = c.events[at - 1];
        if (p.frame > e.frame ||
            (p.frame == e.frame &&
             (priority(p.kind) > priority(e.kind) ||
              (priority(p.kind) == priority(e.kind) &&
               (p.device > e.device || (p.device == e.device && p.target > e.target))))))
          return reject_v4(ALIVE_SESSION_V4_BAD_FIELD, "Source events are not canonically sorted.");
      }
      if (e.kind == ALIVE_SESSION_AUTOMATION) {
        if (e.target >= c.devices[e.device].parameter_count ||
            !(source.owned_masks[e.device] & (1u << e.target)))
          return reject_v4(ALIVE_SESSION_V4_BAD_OWNERSHIP, "Automation has no source owner.");
        const auto &p = c.devices[e.device].parameters[e.target];
        if (e.value < p.minimum || e.value > p.maximum || ++points[e.track] > 256)
          return reject_v4(ALIVE_SESSION_V4_BAD_FIELD, "Automation exceeds bounds.");
      } else {
        if (source.kind != 1 || e.device != c.tracks[e.track].instrument)
          return reject_v4(ALIVE_SESSION_V4_BAD_OWNERSHIP, "Notes require a MIDI instrument.");
        if (e.target > 127 || std::floor(e.value) != e.value || e.value < 0 || e.value > 127 ||
            (e.kind == ALIVE_SESSION_NOTE_ON && (!e.value || ++notes[e.track] > 128)) ||
            (e.kind == ALIVE_SESSION_NOTE_OFF && e.value != 0))
          return reject_v4(ALIVE_SESSION_V4_BAD_FIELD, "Note exceeds bounds.");
        if (e.kind == ALIVE_SESSION_NOTE_ON) {
          if (held[e.target])
            return reject_v4(ALIVE_SESSION_V4_BAD_SOURCE, "Overlapping same-pitch notes.");
          held[e.target] = true;
          if (++held_count > 4)
            return reject_v4(ALIVE_SESSION_V4_BAD_SOURCE, "More than four held pitches.");
        } else if (held[e.target]) {
          held[e.target] = false;
          --held_count;
        } else
          return reject_v4(ALIVE_SESSION_V4_BAD_SOURCE, "Unmatched note-off.");
      }
    }
  }
  for (unsigned i = 0; i < c.event_count; ++i)
    if (!covered[i])
      return reject_v4(ALIVE_SESSION_V4_BAD_OWNERSHIP, "Unowned source event.");
  for (unsigned d = 0; d < c.device_count; ++d)
    for (unsigned p = 0; p < c.devices[d].parameter_count; ++p)
      if (bool(unions[d] & (1u << p)) != bool(c.devices[d].parameters[p].automated))
        return reject_v4(ALIVE_SESSION_V4_BAD_OWNERSHIP,
                         "Automation summary differs from sources.");
#define CHECK_UNUSED(field, count)                                                                 \
  for (unsigned i = c.count; i < sizeof c.field / sizeof c.field[0]; ++i)                          \
    if (!zero_record(c.field[i]))                                                                  \
  return reject_v4(ALIVE_SESSION_V4_BAD_FIELD, "Unused " #field " record is nonzero.")
  CHECK_UNUSED(tracks, track_count);
  CHECK_UNUSED(devices, device_count);
  CHECK_UNUSED(sources, source_count);
  CHECK_UNUSED(slots, slot_count);
  CHECK_UNUSED(placements, placement_count);
  CHECK_UNUSED(events, event_count);
#undef CHECK_UNUSED
  if (unsupported && !complete_midi)
    return reject_v4(ALIVE_SESSION_V4_FEATURE_DISABLED,
                     "Audio workspace sources are not admitted.");
  return true;
}
struct BorrowedSource {
  unsigned event_begin, event_count;
  uint64_t length_frames;
  const uint32_t *owned_masks;
};
BorrowedSource source(unsigned index) const noexcept {
  if (mode_ == Mode::Workspaces) {
    const auto &s = config_.sources[index];
    return {s.event_begin, s.event_count, s.length_frames, s.owned_masks};
  }
  const auto &s = config_.clips[index];
  return {s.event_begin, s.event_count, s.length_frames, s.owned_masks};
}
struct ResolvedCursor {
  unsigned source = None, occurrence = None, next_placement = None;
  uint64_t phase = 0, next_boundary = NoFrame, occurrence_end = NoFrame;
  unsigned authority = ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY;
  unsigned active_slot = None, remembered_slot = None, pending_slot = None;
  uint64_t ended_phase = 0;
  bool ended = false;
};
std::array<ResolvedCursor, 8> resolved_{}, candidate_resolved_{};
struct TransitionV4 {
  std::array<AliveSessionTrackStateV3, 8> tracks{};
  std::array<ResolvedCursor, 8> cursors{};
  uint64_t position = 0;
  unsigned changed = 0, placement = 0;
} transition_v4_{};
struct PlacementLedger {
  std::array<uint64_t, 1024> entries{};
  uint64_t total = 0, expired = 0;
  void expire(uint64_t frame) noexcept {
    auto &slot = entries[frame % 1024];
    expired = slot;
    total -= slot;
    slot = 0;
  }
  void charge(uint64_t frame, uint64_t amount) noexcept {
    entries[frame % 1024] += amount;
    total += amount;
  }
} placement_scheduled_{}, placement_optional_{};
clip_admission::Envelope placement_future_{};
void placement_cursor_v4(ResolvedCursor &out, unsigned index, uint64_t frame) const noexcept {
  const auto &p = config_.placements[index];
  const auto elapsed = frame - p.start_frame;
  const auto period = source(p.source).length_frames - p.source_offset;
  out.source = p.source;
  out.occurrence = index;
  out.phase = p.source_offset + (p.loop_enabled ? elapsed % period : elapsed);
  out.occurrence_end = out.next_boundary = p.start_frame + p.duration_frames;
  if (p.loop_enabled)
    out.next_boundary = frame + std::min(period - elapsed % period, out.occurrence_end - frame);
}
ResolvedCursor resolve_arrangement(unsigned track, uint64_t frame,
                                   unsigned &probes, unsigned family = 1) const noexcept {
  (void)family;
  const unsigned begin = config_.placement_begin[track], count = config_.placement_size[track];
  unsigned lo = 0, hi = count;
  while (lo < hi) {
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
    if (alive_session_test_placement_probe)
      alive_session_test_placement_probe(family);
#endif
    ++probes;
    const unsigned mid = (lo + hi) / 2;
    if (config_.placements[begin + mid].start_frame <= frame)
      lo = mid + 1;
    else
      hi = mid;
  }
  ResolvedCursor out{};
  out.next_placement = begin + lo;
  if (lo) {
    const unsigned index = begin + lo - 1;
    const auto &p = config_.placements[index];
    if (frame - p.start_frame < p.duration_frames) {
      placement_cursor_v4(out, index, frame);
      return out;
    }
  }
  if (lo < count)
    out.next_boundary = config_.placements[begin + lo].start_frame;
  return out;
}
ResolvedCursor next_arrangement(unsigned track, uint64_t frame,
                                const ResolvedCursor &previous, bool optional) const noexcept {
  ResolvedCursor out{};
  out.next_placement = previous.next_placement;
  if (previous.occurrence != None && frame < previous.occurrence_end) {
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
    if (alive_session_test_placement_probe)
      alive_session_test_placement_probe(optional ? 1 : 0);
#endif
    placement_cursor_v4(out, previous.occurrence, frame);
    return out;
  }
  const unsigned end = config_.placement_begin[track] + config_.placement_size[track];
  if (out.next_placement < end) {
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
    if (alive_session_test_placement_probe)
      alive_session_test_placement_probe(optional ? 1 : 0);
#endif
    (void)optional;
    const unsigned index = out.next_placement;
    const auto &p = config_.placements[index];
    if (frame >= p.start_frame) {
      placement_cursor_v4(out, index, frame);
      ++out.next_placement;
    } else
      out.next_boundary = p.start_frame;
  }
  return out;
}
void cue_v4(ResolvedCursor &cursor, unsigned action, unsigned slot) const noexcept {
  cursor = {};
  if (action == ALIVE_SESSION_V4_RETURN)
    return;
  cursor.authority = ALIVE_SESSION_V4_SESSION_AUTHORITY;
  if (action == ALIVE_SESSION_V4_LAUNCH) {
    const auto &descriptor = config_.slots[slot];
    cursor.active_slot = cursor.remembered_slot = slot;
    cursor.source = descriptor.source;
    cursor.phase = descriptor.source_offset;
  }
}
static void project_cursor_v4(AliveSessionTrackStateV3 &track,
                              const ResolvedCursor &cursor) noexcept {
  track.active_clip = cursor.source;
  track.phase = cursor.source == None ? 0 : cursor.phase;
}
// Preview and dispatch share the final authority/occurrence calculation. Its
// descriptor allowance is reserved before any lookup; publication is separate.
bool transition_v4(const AliveSessionTrackStateV3 *tracks,
                   const std::array<ResolvedCursor, 8> &cursors,
                   uint64_t position, bool playing, unsigned changed,
                   bool optional) noexcept {
  auto &out = transition_v4_;
  std::copy_n(tracks, 8, out.tracks.begin());
  out.cursors = cursors;
  out.changed = changed;
  out.placement = 0;
  const bool wrap = playing && config_.loop_enabled && position >= config_.loop_end;
  out.position = position = wrap ? config_.loop_start : position;
  if (!playing || position >= config_.length_frames)
    return true;
  for (unsigned t = 0; t < config_.track_count; ++t) {
    const auto &ts = tracks[t];
    const auto &cursor = cursors[t];
    const bool due = ts.pending_action && ts.pending_frame <= state_.absolute_frame;
    if ((due && ts.pending_action == ALIVE_SESSION_V4_RETURN) ||
        (!due && wrap && cursor.authority == ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY))
      out.placement += 4;
    else if (!due && cursor.authority == ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY &&
             position >= cursor.next_boundary)
      out.placement += cursor.next_boundary < cursor.occurrence_end ? 1 : 4;
    else if (!due && cursor.authority == ALIVE_SESSION_V4_SESSION_AUTHORITY &&
             cursor.source != None && ts.phase >= source(cursor.source).length_frames)
      ++out.placement;
  }
  if (out.placement && !(optional ? reserve_optional_placement(out.placement)
                                 : reserve_scheduled_placement(out.placement)))
    return false;
  for (unsigned t = 0; t < config_.track_count; ++t) {
    auto &ts = out.tracks[t];
    auto &cursor = out.cursors[t];
    if (ts.pending_action && ts.pending_frame <= state_.absolute_frame) {
      cue_v4(cursor, ts.pending_action, ts.pending_clip);
      if (ts.pending_action == ALIVE_SESSION_V4_RETURN) {
        unsigned probes = 0;
        cursor = resolve_arrangement(t, position, probes, optional ? 1 : 0);
      }
      out.changed |= 1u << t;
    } else if (cursor.authority == ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY) {
      if (wrap) {
        unsigned probes = 0;
        cursor = resolve_arrangement(t, position, probes, optional ? 1 : 0);
        out.changed |= 1u << t;
      } else if (position >= cursor.next_boundary) {
        cursor = next_arrangement(t, position, cursor, optional);
        out.changed |= 1u << t;
      }
    } else if (cursor.source != None && ts.phase >= source(cursor.source).length_frames) {
      const auto &slot = config_.slots[cursor.active_slot];
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
      if (alive_session_test_placement_probe)
        alive_session_test_placement_probe(optional ? 1 : 0);
#endif
      if (slot.loop_enabled)
        cursor.phase = slot.source_offset;
      else {
        cursor.ended = true;
        cursor.ended_phase = ts.phase;
        cursor.source = cursor.active_slot = None;
        cursor.phase = 0;
      }
      out.changed |= 1u << t;
    }
    // Occurrence replacement must retain the reducer's independent pending token.
    cursor.pending_slot = ts.pending_action == ALIVE_SESSION_V4_LAUNCH ? ts.pending_clip : None;
    project_cursor_v4(ts, cursor);
  }
  return true;
}
unsigned chain_member(unsigned track, unsigned member) const noexcept {
  const auto &chain = config_.tracks[track];
  return member ? chain.effects[member - 1] : chain.instrument;
}
bool envelopes_v4(const AliveSessionConfigV4 &c, clip_admission::Prepared &out,
                  clip_admission::Envelope &placement) noexcept {
  auto proof = std::make_unique<workspace_admission::Proof>();
  if (!prepare_midi_envelopes_v4(c, *proof))
    return false;
  out = proof->prepared;
  placement = proof->placement;
  return true;
}

AliveSessionStateV4 project_v4() const noexcept {
  AliveSessionStateV4 out{};
  out.version = 4;
  out.struct_bytes = sizeof out;
#define COPY_STATE(field) out.field = state_.field
  COPY_STATE(configured);
  COPY_STATE(playing);
  COPY_STATE(profile);
  COPY_STATE(work_policy);
  COPY_STATE(track_count);
  COPY_STATE(device_count);
  COPY_STATE(fault);
  COPY_STATE(fault_resource);
  COPY_STATE(absolute_frame);
  COPY_STATE(position);
  COPY_STATE(generation);
  COPY_STATE(rejected);
  COPY_STATE(preparation_revision);
  COPY_STATE(last_consumed_request);
  COPY_STATE(requested_stop_epoch);
  COPY_STATE(applied_stop_epoch);
  COPY_STATE(work_rejected);
  COPY_STATE(event_faults);
  COPY_STATE(peak_left);
  COPY_STATE(peak_right);
#undef COPY_STATE
  out.source_count = config_.source_count;
  out.slot_count = config_.slot_count;
  out.placement_count = config_.placement_count;
  for (unsigned t = 0; t < 8; ++t) {
    auto &tr = out.tracks[t];
    const auto &old = state_.tracks[t];
    tr.mixer = old.mixer;
    tr.authority = resolved_[t].authority;
    tr.active_slot = resolved_[t].active_slot;
    tr.pending_slot = resolved_[t].pending_slot;
    tr.pending_action = old.pending_action;
    tr.pending_serial = old.pending_serial;
    tr.pending_frame = old.pending_action ? old.pending_frame : NoFrame;
    tr.active_source = resolved_[t].source;
    tr.active_placement = resolved_[t].occurrence;
    tr.phase = tr.active_source == None ? 0 : old.phase;
    tr.track_epoch = old.track_epoch;
  }
  std::copy_n(state_.devices, 16, out.devices);
  for (unsigned i = 0; i < 128; ++i) {
    auto &r = out.receipts[i];
    const auto &old = state_.receipts[i];
    r.version = 4;
    r.struct_bytes = sizeof r;
#define COPY_RECEIPT(field) r.field = old.field
    COPY_RECEIPT(status);
    COPY_RECEIPT(error);
    COPY_RECEIPT(preparation_revision);
    COPY_RECEIPT(request_serial);
    COPY_RECEIPT(observed_frame);
    COPY_RECEIPT(target_frame);
    COPY_RECEIPT(kind);
    COPY_RECEIPT(track_mask);
    COPY_RECEIPT(pending_mask);
    COPY_RECEIPT(applied_mask);
    COPY_RECEIPT(superseded_mask);
    COPY_RECEIPT(canceled_mask);
    COPY_RECEIPT(rejected_mask);
#undef COPY_RECEIPT
  }
  return out;
}

public:
// Off-callback complete proof, also consumed by finite MIDI configuration.
// Preparation alone does not enable the future authority or loop actions.
bool prepare_midi_envelopes_v4(const AliveSessionConfigV4 &c,
                               workspace_admission::Proof &out) noexcept {
  out = {};
  if (!bounds_v4(c, true)) {
    out.diagnostic = diagnostic4_;
    return false;
  }
  const bool accepted = workspace_admission::build_validated(c, out);
  diagnostic4_ = out.diagnostic;
  if (!accepted)
    return reject("Complete MIDI envelope exceeds bounded preparation policy.");
  return true;
}
bool limits_v4(unsigned profile, AliveSessionLimitsV4 &out) const noexcept {
  if (!header_v4(out.version, out.struct_bytes, sizeof out) || (profile != 1 && profile != 2))
    return false;
  const auto old = clip_admission::policy(profile);
  out = {};
  out.version = 4;
  out.struct_bytes = sizeof out;
  out.profile = profile;
  out.work_policy = profile;
  // Only measured profile 1 is eligible; full candidate admission still applies.
  out.features = profile == 1 ? ALIVE_SESSION_V4_FEATURE_ADMITTED |
      ALIVE_SESSION_V4_FEATURE_ATOMIC_TRACK_ACTIONS | ALIVE_SESSION_V4_FEATURE_ARRANGEMENT : 0;
  out.max_tracks = old.max_tracks;
  out.max_devices = old.max_devices;
  out.max_sources = out.max_slots = profile == 1 ? 8 : 32;
  out.max_placements = profile == 1 ? 16 : 64;
  out.max_audio_buffers = 8;
  out.max_events = 1024;
  out.max_frame_events = 32;
  out.max_window_events = 64;
  out.window_frames = 1024;
  out.max_commands = 64;
  out.max_receipts = 128;
  out.sample_rate = 48000;
  out.min_loop_frames = 188;
  out.max_audio_frames = 2880000;
  out.max_audio_bytes = 67108864;
  out.max_audio_file_bytes = 25165824;
  auto work = [](const AliveSessionWorkV3 &w, uint64_t placement, uint64_t reads) {
    return AliveSessionWorkV4{w.root_clears, w.event_scans, w.parameter_writes,
                              w.guard_steps, placement,     reads};
  };
  out.scheduled_frame = work(old.scheduled_frame, 64, 16);
  out.scheduled_window = work(old.scheduled_window, 512, 16384);
  out.optional_frame = out.optional_window = work(old.optional_frame, 2114, 0);
  out.emergency = work(old.emergency, 0, 0);
  out.max_sample_reads_frame = 16;
  out.max_peak_bins = 4096;
  return true;
}
bool diagnostic_v4(AliveSessionDiagnosticV4 &out) const noexcept {
  if (!header_v4(out.version, out.struct_bytes, sizeof out))
    return false;
  out = diagnostic4_;
  out.version = 4;
  out.struct_bytes = sizeof out;
  return true;
}
bool validate_v4(const AliveSessionConfigV4 &c) noexcept {
  if (!bounds_v4(c))
    return false;
  auto scratch = std::make_unique<clip_admission::Prepared>();
  clip_admission::Envelope placement{};
  return envelopes_v4(c, *scratch, placement);
}
bool validate_prepared_v4(const AliveSessionConfigV4 &c, const UltraCanvasGraph *graphs,
                          unsigned count, const AliveSessionAudioBufferV4 *audio,
                          unsigned audio_count) noexcept {
  if (!bounds_v4(c))
    return false;
  if (count != c.device_count || (count && !graphs))
    return reject_v4(ALIVE_SESSION_V4_GRAPH_REJECTED, "Prepared workspace graph count mismatch.");
  if (audio_count != c.audio_buffer_count || (audio_count && !audio))
    return reject_v4(ALIVE_SESSION_V4_AUDIO_BOUNDS, "Prepared workspace audio count mismatch.");
  for (unsigned d = 0; d < count; ++d)
    if (!measured_graph(
            c.devices[d], d, c.events, c.event_count, graphs[d],
            [&](unsigned error, const char *message) { return reject_v4(error, message); }))
      return false;
  return validate_v4(c);
}
bool configure_v4(const AliveSessionConfigV4 &c, const AliveSessionAudioBufferV4 *audio,
                  unsigned audio_count, CanvasWorkspace &workspace) noexcept {
  if (!bounds_v4(c))
    return false;
  if (audio_count != c.audio_buffer_count || (audio_count && !audio))
    return reject_v4(ALIVE_SESSION_V4_AUDIO_BOUNDS, "Audio descriptor count mismatch.");
  if (c.preparation_revision <= last_preparation_)
    return reject_v4(ALIVE_SESSION_V4_STALE_PREPARATION, "Preparation identity must increase.");
  auto scratch = std::make_unique<clip_admission::Prepared>();
  clip_admission::Envelope placement{};
  auto plans = std::make_unique<std::array<CanvasPlan, 16>>();
  std::array<int, CanvasWorkspace::MaxDocuments> documents{};
  documents.fill(-1);
  for (unsigned d = 0; d < c.device_count; ++d) {
    const auto &device = c.devices[d];
    if (!workspace.live(device.document))
      return reject_v4(ALIVE_SESSION_V4_GRAPH_REJECTED, "Prepared root is missing.");
    const auto &graph = workspace.runtime(device.document).plan().graph;
    if (!measured_graph(
            device, d, c.events, c.event_count, graph,
            [&](unsigned error, const char *message) { return reject_v4(error, message); }))
      return false;
    (*plans)[d] = workspace.runtime(device.document).plan();
    documents[device.document] = int(d);
    for (unsigned p = 0; p < device.parameter_count; ++p) {
      const auto &b = device.parameters[p];
      if (!change_canvas_param((*plans)[d], b.node, b.param, b.base))
        return reject_v4(ALIVE_SESSION_V4_GRAPH_REJECTED, "Cannot prepare base values.");
    }
  }
  for (unsigned d = 0; d < CanvasWorkspace::MaxDocuments; ++d)
    if (workspace.live(d) && documents[d] < 0)
      return reject_v4(ALIVE_SESSION_V4_GRAPH_REJECTED, "Unrelated installed root.");
  if (!envelopes_v4(c, *scratch, placement))
    return false;
  prepared_ = *scratch;
  placement_future_ = placement;
  parameter_plans_ = *plans;
  document_devices_ = documents;
  mode_ = Mode::Workspaces;
  last_preparation_ = c.preparation_revision;
  config_ = {};
  config_.track_count = c.track_count;
  config_.device_count = c.device_count;
  config_.event_count = c.event_count;
  config_.source_count = c.source_count;
  config_.slot_count = c.slot_count;
  config_.loop_enabled = c.loop_enabled;
  config_.placement_count = c.placement_count;
  config_.length_frames = c.length_frames;
  config_.loop_start = c.loop_start;
  config_.loop_end = c.loop_end;
  config_.preparation_revision = c.preparation_revision;
  config_.tempo_bpm = c.tempo_bpm;
  config_.profile = c.profile;
  config_.work_policy = c.work_policy;
  std::copy_n(c.devices, 16, config_.devices);
  std::copy_n(c.events, 1024, config_.events);
  std::copy_n(c.sources, 32, config_.sources);
  std::copy_n(c.slots, 32, config_.slots);
  for (auto &map : config_.source_map)
    map.fill(None);
  for (auto &map : config_.slot_map)
    map.fill(None);
  for (unsigned s = 0; s < c.source_count; ++s) {
    const unsigned t = c.sources[s].track;
    config_.source_map[t][config_.source_size[t]++] = s;
  }
  std::copy_n(c.placements, 64, config_.placements);
  const auto absolute = state_.absolute_frame, generation = state_.generation;
  state_ = {};
  state_.absolute_frame = absolute;
  state_.generation = generation;
  state_.configured = 1;
  state_.track_count = c.track_count;
  state_.device_count = c.device_count;
  state_.profile = c.profile;
  state_.work_policy = c.work_policy;
  state_.preparation_revision = c.preparation_revision;
  head_ = 0;
  tail_ = 0;
  clear_master();
  applied_stop_ = stop_epoch_.load();
  state_.requested_stop_epoch = state_.applied_stop_epoch = applied_stop_;
  reservations_ = {};
  scheduled_ = {};
  optional_ = {};
  placement_scheduled_ = {};
  placement_optional_ = {};
  optional_clear_ = 0;
  callback_fault_ = false;
  resolved_ = {};
  for (auto &r : state_.receipts) {
    r.version = 3;
    r.struct_bytes = sizeof r;
    r.observed_frame = r.target_frame = NoFrame;
  }
  for (unsigned t = 0; t < c.track_count; ++t) {
    const auto &tr = c.tracks[t];
    auto &chain = config_.tracks[t];
    chain.instrument = tr.instrument;
    chain.effect_count = tr.effect_count;
    std::copy_n(tr.effects, 2, chain.effects);
    chain.gain = tr.gain;
    chain.mute = tr.mute;
    chain.solo = tr.solo;
    std::copy_n(tr.slots, 4, config_.slot_map[t].begin());
    config_.placement_begin[t] = tr.placement_begin;
    config_.placement_size[t] = tr.placement_count;
    unsigned probes = 0;
    resolved_[t] = resolve_arrangement(t, 0, probes);
    auto &ts = state_.tracks[t];
    ts.mixer.gain = tr.gain;
    ts.mixer.mute = tr.mute;
    ts.mixer.solo = tr.solo;
    ts.active_clip = resolved_[t].source;
    ts.phase = resolved_[t].phase;
    ts.pending_clip = None;
    ts.pending_frame = NoFrame;
  }
  for (unsigned d = 0; d < c.device_count; ++d) {
    auto &ds = state_.devices[d];
    const auto &device = c.devices[d];
    ds.document = device.document;
    ds.revision = device.revision;
    ds.bypassed = device.bypassed;
    ds.parameter_count = device.parameter_count;
    for (unsigned p = 0; p < device.parameter_count; ++p)
      ds.base[p] = device.parameters[p].base;
  }
  clear_tracks(workspace, (1u << c.track_count) - 1);
  publish(workspace);
  return true;
}
bool request_v4(const AliveSessionRequestV4 &r, AliveSessionReceiptV4 &out) noexcept {
  if (!header_v4(out.version, out.struct_bytes, sizeof out))
    return false;
  return request_ingress(r, out, 4);
}
bool snapshot_v4(AliveSessionStateV4 &out) const noexcept {
  if (!header_v4(out.version, out.struct_bytes, sizeof out))
    return false;
  return coherent_wire(out, 4);
}

private:
bool reserve_optional_placement(uint64_t count) noexcept {
  if (placement_optional_.entries[state_.absolute_frame % 1024] + count > 2114 ||
      placement_optional_.total + count > 2114)
    return false;
  placement_optional_.charge(state_.absolute_frame, count);
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
  if (alive_session_test_placement_charge)
    alive_session_test_placement_charge(1, count);
#endif
  return true;
}
bool scheduled_placement_exceeds(uint64_t count) const noexcept {
  return placement_scheduled_.entries[state_.absolute_frame % 1024] + count > 64 ||
         placement_scheduled_.total + count > 512;
}
bool reserve_scheduled_placement(uint64_t count) noexcept {
  if (scheduled_placement_exceeds(count))
    return false;
  placement_scheduled_.charge(state_.absolute_frame, count);
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
  if (alive_session_test_placement_charge)
    alive_session_test_placement_charge(0, count);
#endif
  return true;
}
