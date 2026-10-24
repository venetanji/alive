// Included inside AliveSession: clip cursors share its clock, queue, graph
// owner, parameter path and publication. Admission helpers own no audio state.
private:
using Cost = clip_admission::Cost;
static void trace_read(bool preview) noexcept {
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
  ++(preview ? alive_session_test_preview_reads : alive_session_test_reconstruction_reads);
#else
  (void)preview;
#endif
}
static void trace_charge(unsigned family, const Cost &value) noexcept {
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
  if (alive_session_test_charge)
    alive_session_test_charge(family, value);
#else
  (void)family;
  (void)value;
#endif
}
static constexpr unsigned None = ALIVE_SESSION_V3_NONE;
static constexpr uint64_t NoFrame = ALIVE_SESSION_V3_NO_FRAME;
clip_admission::Prepared prepared_{};
clip_admission::Ledger scheduled_{}, optional_{};
std::array<unsigned, 8> cursors_{};
struct Chase {
  std::array<std::array<double, 16>, 3> values{};
  unsigned cursor = 0;
};
std::array<Chase, 8> chase_{};
std::array<bool, 8> clear_{};
std::array<uint64_t, 128> reservations_{};
uint64_t ingress_serial_ = 0, last_preparation_ = 0;
unsigned optional_clear_ = 0;
bool callback_fault_ = false;
AliveSessionDiagnosticV3 diagnostic_{};
struct Candidate {
  AliveSessionTrackStateV3 tracks[8]{};
  AliveSessionReceiptV3 receipts[64]{};
  unsigned count = 0, old_status[8]{}, old_error[8]{}, clear_mask = 0;
  bool group[64]{};
  uint64_t position = 0;
  unsigned playing = 0;
  bool unscheduled = false;
} candidate_{};
static bool output_header(unsigned version, unsigned bytes, size_t expected) noexcept {
  return version == 3 && bytes == expected;
}
bool reject_v3(unsigned error, const char *message, unsigned resource = 0, uint64_t observed = 0,
               uint64_t limit = 0) noexcept {
  diagnostic_ = {};
  diagnostic_.version = 3;
  diagnostic_.struct_bytes = sizeof diagnostic_;
  diagnostic_.error = error;
  diagnostic_.resource = resource;
  diagnostic_.frame = NoFrame;
  diagnostic_.observed = observed;
  diagnostic_.limit = limit;
  diagnostic_.window_frames = 1024;
  std::fill_n(diagnostic_.clip, 8, None);
  return reject(message);
}
static bool terminal(unsigned status) noexcept { return status >= ALIVE_SESSION_V3_APPLIED; }
static void finish(AliveSessionReceiptV3 &receipt, unsigned status, unsigned error = 0) noexcept {
  receipt.status = status;
  receipt.error = error;
  receipt.applied_mask = receipt.superseded_mask = receipt.canceled_mask = receipt.rejected_mask = 0;
  receipt.pending_mask = status == ALIVE_SESSION_V3_PENDING ? receipt.track_mask : 0;
  if (status == ALIVE_SESSION_V3_APPLIED)
    receipt.applied_mask = receipt.track_mask;
  if (status == ALIVE_SESSION_V3_SUPERSEDED)
    receipt.superseded_mask = receipt.track_mask;
  if (status == ALIVE_SESSION_V3_CANCELED)
    receipt.canceled_mask = receipt.track_mask;
  if (status == ALIVE_SESSION_V3_REJECTED)
    receipt.rejected_mask = receipt.track_mask;
}
bool bounds_v3(const AliveSessionConfigV3 &c) noexcept {
  if (!output_header(c.version, c.struct_bytes, sizeof c))
    return reject_v3(ALIVE_SESSION_V3_BAD_HEADER, "Invalid v3 configuration header.");
  const auto limits = clip_admission::policy(c.profile);
  if ((c.profile != 1 && c.profile != 2) || c.work_policy != limits.work_policy ||
      !(limits.features & ALIVE_SESSION_V3_FEATURE_ADMITTED))
    return reject_v3(ALIVE_SESSION_V3_BAD_PROFILE, "Clip profile has no registered measured policy.");
  if (!c.track_count || c.track_count > limits.max_tracks || c.device_count < c.track_count || c.device_count > limits.max_devices ||
      c.clip_count > c.track_count * 4 || c.event_count > 1024 || !flag(c.loop_enabled) || c.reserved ||
      !c.preparation_revision || !std::isfinite(c.tempo_bpm) || c.tempo_bpm < 30 || c.tempo_bpm > 240)
    return reject_v3(ALIVE_SESSION_V3_BAD_FIELD, "Invalid v3 counts, fields or tempo.");
  const uint64_t minimum = uint64_t(std::round((1. / 64) * 48000 * 60 / c.tempo_bpm)),
                 maximum = uint64_t(std::round(256. * 48000 * 60 / c.tempo_bpm));
  if (c.length_frames < minimum || c.length_frames > maximum || c.length_frames > 24576000)
    return reject_v3(ALIVE_SESSION_V3_BAD_FIELD, "Invalid v3 session length.");
  std::array<int, 16> owners{};
  owners.fill(-1);
  std::array<unsigned, 32> slots{};
  std::array<unsigned, 16> unions{};
  for (unsigned d = 0; d < c.device_count; ++d) {
    if (!validate_device(c.devices[d]))
      return reject_v3(ALIVE_SESSION_V3_BAD_FIELD, "Invalid v3 device descriptor.");
    for (unsigned p = 0; p < c.devices[d].parameter_count; ++p)
      if (c.devices[d].parameters[p].reserved)
        return reject_v3(ALIVE_SESSION_V3_BAD_FIELD, "Reserved parameter field is nonzero.");
    for (unsigned prior = 0; prior < d; ++prior)
      if (c.devices[prior].document == c.devices[d].document)
        return reject_v3(ALIVE_SESSION_V3_BAD_OWNERSHIP, "Devices must own distinct roots.");
  }
  for (unsigned t = 0; t < c.track_count; ++t) {
    const auto &tr = c.tracks[t];
    const auto &chain = tr.chain;
    if (tr.reserved || chain.instrument >= c.device_count || chain.effect_count > 2 || !gain(chain.gain) ||
        !flag(chain.mute) || !flag(chain.solo))
      return reject_v3(ALIVE_SESSION_V3_BAD_FIELD, "Invalid v3 track chain.");
    for (unsigned member = 0; member <= chain.effect_count; ++member) {
      const unsigned d = member ? chain.effects[member - 1] : chain.instrument;
      if (d >= c.device_count || owners[d] >= 0 || c.devices[d].kind != (member ? 2u : 1u))
        return reject_v3(ALIVE_SESSION_V3_BAD_OWNERSHIP, "Each device belongs to one compatible chain.");
      owners[d] = int(t);
    }
    bool initial = tr.initial_clip == None;
    for (unsigned slot : tr.slots) {
      if (slot == None)
        continue;
      if (slot >= c.clip_count || c.clips[slot].track != t || ++slots[slot] != 1)
        return reject_v3(ALIVE_SESSION_V3_BAD_OWNERSHIP,
                         "Each clip belongs to exactly one slot on its track.");
      initial |= slot == tr.initial_clip;
    }
    if (!initial)
      return reject_v3(ALIVE_SESSION_V3_BAD_OWNERSHIP, "Initial clip is not in the track bank.");
  }
  for (unsigned d = 0; d < c.device_count; ++d)
    if (owners[d] < 0)
      return reject_v3(ALIVE_SESSION_V3_BAD_OWNERSHIP, "Unowned v3 device.");
  std::array<bool, 1024> covered{};
  std::array<unsigned, 8> notes{}, points{}, lanes{};
  for (unsigned index = 0; index < c.clip_count; ++index) {
    const auto &clip = c.clips[index];
    if (clip.track >= c.track_count || slots[index] != 1 || clip.event_begin > c.event_count ||
        clip.event_count > c.event_count - clip.event_begin || clip.length_frames < minimum ||
        clip.length_frames > maximum || clip.length_frames > 24576000 || clip.lane_count > 16)
      return reject_v3(ALIVE_SESSION_V3_BAD_FIELD, "Invalid clip range, length or lane count.");
    unsigned enabled = 0;
    for (unsigned d = 0; d < 16; ++d) {
      const unsigned mask = clip.owned_masks[d];
      if (mask &&
          (d >= c.device_count || owners[d] != int(clip.track) || (mask >> c.devices[d].parameter_count)))
        return reject_v3(ALIVE_SESSION_V3_BAD_OWNERSHIP, "Invalid clip parameter ownership mask.");
      enabled += session_bits::count(mask);
      unions[d] |= mask;
    }
    if (enabled > clip.lane_count || (lanes[clip.track] += clip.lane_count) > 16)
      return reject_v3(ALIVE_SESSION_V3_BAD_FIELD, "Clip bank exceeds track lane capacity.");
    for (unsigned i = 0; i < clip.event_count; ++i) {
      const unsigned at = clip.event_begin + i;
      const auto &e = c.events[at];
      if (covered[at] || e.track != clip.track || e.device >= c.device_count ||
          owners[e.device] != int(clip.track) || e.frame >= clip.length_frames || e.kind > 3 ||
          !std::isfinite(e.value))
        return reject_v3(ALIVE_SESSION_V3_BAD_OWNERSHIP, "Invalid or multiply covered clip event.");
      covered[at] = true;
      if (i) {
        const auto &p = c.events[at - 1];
        if (p.frame > e.frame ||
            (p.frame == e.frame &&
             (priority(p.kind) > priority(e.kind) ||
              (priority(p.kind) == priority(e.kind) &&
               (p.track > e.track ||
                (p.track == e.track &&
                 (p.device > e.device || (p.device == e.device && p.target > e.target))))))))
          return reject_v3(ALIVE_SESSION_V3_BAD_FIELD,
                           "Clip events require frame/priority/track/device/target order.");
      }
      if (e.kind == ALIVE_SESSION_AUTOMATION) {
        if (e.target >= c.devices[e.device].parameter_count ||
            !(clip.owned_masks[e.device] & (1u << e.target)))
          return reject_v3(ALIVE_SESSION_V3_BAD_OWNERSHIP, "Automation event has no owning clip lane.");
        const auto &p = c.devices[e.device].parameters[e.target];
        if (e.value < p.minimum || e.value > p.maximum || ++points[e.track] > 256)
          return reject_v3(ALIVE_SESSION_V3_BAD_FIELD,
                           "Automation value or stored point count exceeds bounds.");
      } else if (e.device != c.tracks[e.track].chain.instrument)
        return reject_v3(ALIVE_SESSION_V3_BAD_OWNERSHIP, "Notes target their track instrument only.");
      else if (e.kind == ALIVE_SESSION_SUSTAIN) {
        if (e.target || !(e.value == 0 || e.value == 127))
          return reject_v3(ALIVE_SESSION_V3_BAD_FIELD, "Invalid sustain event.");
      } else if (e.target > 127 || std::floor(e.value) != e.value || e.value < 0 || e.value > 127 ||
                 (e.kind == ALIVE_SESSION_NOTE_ON && (e.value == 0 || ++notes[e.track] > 128)) ||
                 (e.kind == ALIVE_SESSION_NOTE_OFF && e.value != 0))
        return reject_v3(ALIVE_SESSION_V3_BAD_FIELD, "Invalid note or stored note count.");
    }
  }
  for (unsigned i = 0; i < c.event_count; ++i)
    if (!covered[i])
      return reject_v3(ALIVE_SESSION_V3_BAD_FIELD, "Clip ranges do not cover the stored event array.");
  for (unsigned d = 0; d < c.device_count; ++d)
    for (unsigned p = 0; p < c.devices[d].parameter_count; ++p)
      if (bool(unions[d] & (1u << p)) != bool(c.devices[d].parameters[p].automated))
        return reject_v3(ALIVE_SESSION_V3_BAD_OWNERSHIP,
                         "Device automation summary does not match clip ownership.");
  return true;
}
bool envelopes_v3(const AliveSessionConfigV3 &c, clip_admission::Prepared &out) noexcept {
  using namespace clip_admission;
  out = {};
  Envelope boundaries{};
  std::array<Pulse, 1025> pulses{};
  for (unsigned k = 0; k <= 64; ++k) {
    const uint64_t frame = uint64_t(std::round((4. * k) * 48000 * 60 / c.tempo_bpm));
    if (frame < c.length_frames)
      out.bars[out.bar_count++] = frame;
  }
  for (unsigned i = 0; i < out.bar_count; ++i)
    pulses[i] = {out.bars[i], 1};
  if (c.loop_enabled)
    cyclic(pulses.data(), out.bar_count, c.length_frames, boundaries);
  else
    for (unsigned w = 1; w <= Window; ++w) {
      unsigned end = 0;
      for (unsigned begin = 0; begin < out.bar_count; ++begin) {
        while (end < out.bar_count && out.bars[end] - out.bars[begin] < w)
          ++end;
        boundaries[w] = std::max<uint64_t>(boundaries[w], end - begin);
      }
    }
  if (boundaries[Window] > 6)
    return reject_v3(ALIVE_SESSION_V3_RUNTIME_INVARIANT, "Derived quantization boundary bound exceeds six.");
  const auto limits = policy(c.profile);
  const Cost frame_limit = {32, limits.scheduled_frame.root_clears, limits.scheduled_frame.event_scans,
                            limits.scheduled_frame.parameter_writes, limits.scheduled_frame.guard_steps};
  const Cost window_limit = {64, limits.scheduled_window.root_clears, limits.scheduled_window.event_scans,
                             limits.scheduled_window.parameter_writes, limits.scheduled_window.guard_steps};
  std::array<std::array<unsigned, 8>, 5> frame_contribution{}, window_contribution{};
  for (unsigned t = 0; t < c.track_count; ++t) {
    auto &reset = out.reset[t];
    reset[1] = 1 + c.tracks[t].chain.effect_count;
    for (unsigned d = 0; d < c.device_count; ++d) {
      const auto &chain = c.tracks[t].chain;
      bool member = d == chain.instrument;
      for (unsigned i = 0; i < chain.effect_count; ++i)
        member |= chain.effects[i] == d;
      if (member)
        reset[3] += 2 * c.devices[d].parameter_count;
    }
    for (unsigned clip = 0; clip < c.clip_count; ++clip)
      if (c.clips[clip].track == t)
        reset[2] = std::max<uint64_t>(reset[2], c.clips[clip].event_count);
    for (unsigned m = 0; m < 5; ++m) {
      Envelope track{}, one{}, spliced{};
      for (unsigned clip = 0; clip < c.clip_count; ++clip) {
        const auto &cl = c.clips[clip];
        if (cl.track != t)
          continue;
        unsigned count = 0;
        if (m)
          pulses[count++] = {0, reset[m]};
        for (unsigned i = 0; i < cl.event_count; ++i) {
          const auto &e = c.events[cl.event_begin + i];
          const uint64_t weight = m == 0 ? 1 : (m == 3 && e.kind == ALIVE_SESSION_AUTOMATION ? 1 : 0);
          if (weight)
            pulses[count++] = {e.frame, weight};
        }
        cyclic(pulses.data(), count, cl.length_frames, one);
        for (unsigned w = 1; w <= Window; ++w)
          track[w] = std::max(track[w], one[w]);
      }
      segments(track, boundaries, spliced);
      for (unsigned w = 1; w <= Window; ++w) {
        uint64_t value = spliced[w];
        if (m)
          value += boundaries[w] * reset[m] + (!c.loop_enabled ? reset[m] : 0);
        out.future[m][w] += value;
        if (w == 1)
          frame_contribution[m][t] = unsigned(value);
        if (w == Window)
          window_contribution[m][t] = unsigned(value);
      }
    }
  }
  for (unsigned m = 0; m < 5; ++m)
    for (unsigned width : {1u, Window}) {
      const auto observed = out.future[m][width], limit = width == 1 ? frame_limit[m] : window_limit[m];
      if (observed <= limit)
        continue;
      const unsigned error = m            ? ALIVE_SESSION_V3_WORK_LIMIT
                             : width == 1 ? ALIVE_SESSION_V3_EVENT_FRAME_LIMIT
                                          : ALIVE_SESSION_V3_EVENT_WINDOW_LIMIT;
      reject_v3(error,
                m ? "Clip combination envelope exceeds scheduled work policy."
                  : "Clip combination envelope exceeds event density.",
                m + 1, observed, limit);
      diagnostic_.conservative = 1;
      diagnostic_.track_mask = (1u << c.track_count) - 1;
      diagnostic_.window_frames = width;
      for (unsigned t = 0; t < c.track_count; ++t)
        diagnostic_.contribution[t] = (width == 1 ? frame_contribution : window_contribution)[m][t];
      return false;
    }
  return true;
}
bool graph_v3(const AliveSessionConfigV3 &c, unsigned device, const UltraCanvasGraph &graph) noexcept {
  if (!validate_device_v2(c.devices[device], graph))
    return reject_v3(ALIVE_SESSION_V3_GRAPH_REJECTED,
                     "Clip device graph rejected by common device validation.");
  // A finite signal-kernel profile: one four-voice subtractive instrument or
  // one stereo filter per root. Control-only arbitrary patchers remain legacy.
  unsigned saw = 0, filter = 0, adsr = 0, stereo = 0, poly = 0;
  for (unsigned n = 0; n < graph.node_count; ++n) {
    switch (graph.nodes[n].kind) {
    case PolyNote:
      ++poly;
      break;
    case SawVoice:
      ++saw;
      break;
    case FilterVoice:
      ++filter;
      break;
    case AdsrVoice:
      ++adsr;
      break;
    case FilterStereo:
      ++stereo;
      break;
    case MultiplyVoice:
    case MixVoice:
    case AudioIn:
    case LineSignal:
    case SignalMultiply:
    case SignalDac:
    case Gain:
    case Join:
    case Dac:
      break;
    case MidiIn:
    case Toggle:
    case Metro:
    case Counter:
    case Chord:
    case MakeNote:
      break;
    default:
      return reject_v3(ALIVE_SESSION_V3_GRAPH_REJECTED,
                       "Graph contains a node outside the measured clip kernel profile.");
    }
  }
  const bool instrument = c.devices[device].kind == 1;
  if (saw > unsigned(instrument) || filter > unsigned(instrument) || adsr > unsigned(instrument) ||
      poly != unsigned(instrument) || stereo > unsigned(!instrument))
    return reject_v3(ALIVE_SESSION_V3_GRAPH_REJECTED, "Graph exceeds the measured kernel counts.");
  CanvasPlan plan{};
  if (!compile_canvas(graph, plan))
    return reject_v3(ALIVE_SESSION_V3_GRAPH_REJECTED, "Cannot compile clip graph.");
  for (unsigned p = 0; p < c.devices[device].parameter_count; ++p) {
    const auto &b = c.devices[device].parameters[p];
    const int slot = plan.find(b.node);
    if (slot < 0)
      return reject_v3(ALIVE_SESSION_V3_GRAPH_REJECTED, "Missing bound parameter node.");
    const unsigned kind = graph.nodes[unsigned(slot)].kind;
    if (kind != Gain && kind != FilterVoice && kind != AdsrVoice && kind != FilterStereo &&
        kind != LineSignal && kind != PolyNote)
      return reject_v3(ALIVE_SESSION_V3_GRAPH_REJECTED, "Parameter can activate an unmeasured control path.");
    if (!change_canvas_param(plan, b.node, b.param, b.base))
      return reject_v3(ALIVE_SESSION_V3_GRAPH_REJECTED, "Invalid clip base parameter.");
  }
  for (unsigned i = 0; i < c.event_count; ++i) {
    const auto &e = c.events[i];
    if (e.device != device || e.kind != ALIVE_SESSION_AUTOMATION)
      continue;
    const auto &b = c.devices[device].parameters[e.target];
    if (!change_canvas_param(plan, b.node, b.param, e.value))
      return reject_v3(ALIVE_SESSION_V3_GRAPH_REJECTED, "Invalid clip automation parameter.");
  }
  return true;
}

public:
bool limits_v3(unsigned profile, AliveSessionLimitsV3 &result) const noexcept {
  if (!output_header(result.version, result.struct_bytes, sizeof result) || (profile != 1 && profile != 2))
    return false;
  result = clip_admission::policy(profile);
  return true;
}
bool validate_v3(const AliveSessionConfigV3 &c) noexcept {
  if (!bounds_v3(c))
    return false;
  auto scratch = std::make_unique<clip_admission::Prepared>();
  return envelopes_v3(c, *scratch);
}
bool validate_prepared_v3(const AliveSessionConfigV3 &c, const UltraCanvasGraph *graphs,
                          unsigned count) noexcept {
  if (!bounds_v3(c))
    return false;
  if (!graphs || count != c.device_count)
    return reject_v3(ALIVE_SESSION_V3_GRAPH_REJECTED, "Prepared clip graph count mismatch.");
  for (unsigned d = 0; d < count; ++d)
    if (!graph_v3(c, d, graphs[d]))
      return false;
  auto scratch = std::make_unique<clip_admission::Prepared>();
  return envelopes_v3(c, *scratch);
}
bool diagnostic_v3(AliveSessionDiagnosticV3 &result) const noexcept {
  if (!output_header(result.version, result.struct_bytes, sizeof result))
    return false;
  result = diagnostic_;
  result.version = 3;
  result.struct_bytes = sizeof result;
  return true;
}
bool snapshot_v3(AliveSessionStateV3 &result) const noexcept {
  if (!output_header(result.version, result.struct_bytes, sizeof result))
    return false;
  AliveSessionStateV3 value{};
  if (!coherent(value) || (value.configured && !value.profile))
    return false;
  result = value;
  for (auto &receipt : result.receipts) {
    receipt.version = 3;
    receipt.struct_bytes = sizeof receipt;
  }
  return true;
}

private:
void prepare_chase(unsigned t) noexcept {
  const auto &ts = state_.tracks[t];
  const auto &chain = config_.tracks[t];
  auto &chase = chase_[t];
  chase.cursor = 0;
  for (unsigned i = 0; i <= chain.effect_count; ++i) {
    const unsigned d = i ? chain.effects[i - 1] : chain.instrument;
    for (unsigned p = 0; p < config_.devices[d].parameter_count; ++p)
      chase.values[i][p] = state_.devices[d].base[p];
  }
  if (state_.playing && ts.active_clip != None) {
    const auto &clip = config_.clips[ts.active_clip];
    // One strict-prefix scan both chases automation and locates the event head.
    while (chase.cursor < clip.event_count) {
      trace_read(false);
      const auto &e = config_.events[clip.event_begin + chase.cursor];
      if (e.frame >= ts.phase)
        break;
      ++chase.cursor;
      if (e.kind == ALIVE_SESSION_AUTOMATION)
        for (unsigned i = 0; i <= chain.effect_count; ++i)
          if (e.device == (i ? chain.effects[i - 1] : chain.instrument))
            chase.values[i][e.target] = e.value;
    }
  }
}
void clear_track(CanvasWorkspace &workspace, unsigned t, bool chased) noexcept {
  if (!chased)
    prepare_chase(t);
  auto &ts = state_.tracks[t];
  const auto &chain = config_.tracks[t];
  cursors_[t] = chase_[t].cursor;
  for (unsigned i = 0; i <= chain.effect_count; ++i) {
    const unsigned d = i ? chain.effects[i - 1] : chain.instrument;
    auto &runtime = workspace.runtime(config_.devices[d].document);
    runtime.reset(runtime.plan());
    for (unsigned p = 0; p < config_.devices[d].parameter_count; ++p) {
      state_.devices[d].owned[p] = state_.playing && ts.active_clip != None &&
                                   bool(config_.clips[ts.active_clip].owned_masks[d] & (1u << p));
      parameter(workspace, d, p, chase_[t].values[i][p]);
    }
    if (!state_.playing || ts.active_clip == None) {
      auto discard = [](alive::Event) { return true; };
      workspace.stop(config_.devices[d].document, 0, discard);
    }
  }
  clear_[t] = !state_.playing || ts.active_clip == None;
  ++ts.track_epoch;
}
void clear_tracks(CanvasWorkspace &workspace, unsigned mask, bool chased = false) noexcept {
  if (mask)
    ++state_.generation;
  for (unsigned t = 0; t < config_.track_count; ++t)
    if (mask & (1u << t))
      clear_track(workspace, t, chased);
}
void cancel_pending(unsigned t, unsigned error) noexcept {
  auto &ts = state_.tracks[t];
  if (ts.pending_action) {
    auto &receipt = state_.receipts[ts.pending_serial % 128];
    if (receipt.request_serial == ts.pending_serial)
      finish(receipt, ALIVE_SESSION_V3_CANCELED, error);
  }
  ts.pending_action = 0;
  ts.pending_clip = None;
  ts.pending_serial = 0;
  ts.pending_frame = NoFrame;
}
void terminate_v3(CanvasWorkspace &workspace, unsigned error, bool scheduled = false) noexcept {
  state_.playing = 0;
  unsigned mask = 0;
  for (unsigned t = 0; t < config_.track_count; ++t) {
    cancel_pending(t, error);
    if (!clear_[t])
      mask |= 1u << t;
  }
  if (!scheduled) {
    Cost cost{};
    for (unsigned t = 0; t < config_.track_count; ++t)
      if (mask & (1u << t)) {
        cost[1] += prepared_.reset[t][1];
        cost[3] += prepared_.reset[t][3] / 2;
      }
    trace_charge(2, cost);
  }
  clear_tracks(workspace, mask);
  optional_clear_ = 0;
}

public:
bool configure_v3(const AliveSessionConfigV3 &c, CanvasWorkspace &workspace) noexcept {
  if (!bounds_v3(c))
    return false;
  if (c.preparation_revision <= last_preparation_)
    return reject_v3(ALIVE_SESSION_V3_STALE_PREPARATION,
                     "Preparation identity must increase on configuration.");
  auto scratch = std::make_unique<clip_admission::Prepared>();
  auto plans = std::make_unique<std::array<CanvasPlan, 16>>();
  std::array<int, CanvasWorkspace::MaxDocuments> documents{};
  documents.fill(-1);
  for (unsigned d = 0; d < c.device_count; ++d) {
    const auto &device = c.devices[d];
    if (!workspace.live(device.document))
      return reject_v3(ALIVE_SESSION_V3_GRAPH_REJECTED, "Prepared root is not installed.");
    const auto &graph = workspace.runtime(device.document).plan().graph;
    if (!graph_v3(c, d, graph))
      return false;
    (*plans)[d] = workspace.runtime(device.document).plan();
    documents[device.document] = int(d);
    for (unsigned p = 0; p < device.parameter_count; ++p) {
      const auto &b = device.parameters[p];
      if (!change_canvas_param((*plans)[d], b.node, b.param, b.base))
        return reject_v3(ALIVE_SESSION_V3_GRAPH_REJECTED, "Cannot prepare clip base values.");
    }
  }
  for (unsigned d = 0; d < CanvasWorkspace::MaxDocuments; ++d)
    if (workspace.live(d) && documents[d] < 0)
      return reject_v3(ALIVE_SESSION_V3_GRAPH_REJECTED, "Clip session cannot mix unrelated roots.");
  if (!envelopes_v3(c, *scratch))
    return false;
  parameter_plans_ = *plans;
  document_devices_ = documents;
  prepared_ = *scratch;
  clips_mode_ = true;
  last_preparation_ = c.preparation_revision;
  config_ = {};
  config_.track_count = c.track_count;
  config_.device_count = c.device_count;
  config_.clip_count = c.clip_count;
  config_.event_count = c.event_count;
  config_.length_frames = c.length_frames;
  config_.loop_end = c.length_frames;
  config_.loop_enabled = c.loop_enabled;
  config_.preparation_revision = c.preparation_revision;
  config_.tempo_bpm = c.tempo_bpm;
  config_.profile = c.profile;
  config_.work_policy = c.work_policy;
  std::copy_n(c.tracks, 8, config_.bank);
  std::copy_n(c.devices, 16, config_.devices);
  std::copy_n(c.clips, 32, config_.clips);
  std::copy_n(c.events, 1024, config_.events);
  for (unsigned t = 0; t < c.track_count; ++t)
    config_.tracks[t] = c.tracks[t].chain;
  const uint64_t absolute = state_.absolute_frame, generation = state_.generation;
  state_ = {};
  state_.version = 3;
  state_.struct_bytes = sizeof state_;
  state_.absolute_frame = absolute;
  state_.generation = generation;
  state_.configured = 1;
  state_.track_count = c.track_count;
  state_.device_count = c.device_count;
  state_.clip_count = c.clip_count;
  state_.profile = c.profile;
  state_.work_policy = c.work_policy;
  state_.preparation_revision = c.preparation_revision;
  head_ = 0;
  tail_ = 0;
  applied_stop_ = stop_epoch_.load();
  state_.requested_stop_epoch = state_.applied_stop_epoch = applied_stop_;
  reservations_ = {};
  scheduled_ = {};
  optional_ = {};
  optional_clear_ = 0;
  callback_fault_ = false;
  for (auto &receipt : state_.receipts) {
    receipt.version = 3;
    receipt.struct_bytes = sizeof receipt;
    receipt.observed_frame = receipt.target_frame = NoFrame;
  }
  for (unsigned t = 0; t < c.track_count; ++t) {
    auto &ts = state_.tracks[t];
    ts.mixer.gain = c.tracks[t].chain.gain;
    ts.mixer.mute = c.tracks[t].chain.mute;
    ts.mixer.solo = c.tracks[t].chain.solo;
    ts.active_clip = c.tracks[t].initial_clip;
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
bool request_v3(const AliveSessionRequestV3 &r, AliveSessionReceiptV3 &immediate) noexcept {
  if (!output_header(immediate.version, immediate.struct_bytes, sizeof immediate))
    return false;
  AliveSessionReceiptV3 receipt{};
  receipt.version = 3;
  receipt.struct_bytes = sizeof receipt;
  receipt.preparation_revision = r.preparation_revision;
  receipt.request_serial = r.request_serial;
  receipt.kind = r.kind;
  receipt.track_mask = r.track_mask;
  receipt.observed_frame = receipt.target_frame = NoFrame;
  auto refused = [&](unsigned error, const char *message) {
    finish(receipt, ALIVE_SESSION_V3_REJECTED, error);
    immediate = receipt;
    return reject_v3(error, message);
  };
  if (!output_header(r.version, r.struct_bytes, sizeof r))
    return refused(ALIVE_SESSION_V3_BAD_HEADER, "Invalid v3 request header.");
  if (!clips_mode_ || !configured() || r.preparation_revision != config_.preparation_revision)
    return refused(ALIVE_SESSION_V3_STALE_PREPARATION, "Stale clip preparation.");
  if (!r.request_serial || r.request_serial <= ingress_serial_ || r.request_serial == UINT64_MAX)
    return refused(ALIVE_SESSION_V3_STALE_REQUEST, "Request serial must increase without wrapping.");
  ingress_serial_ = r.request_serial;
  if (stop_epoch_.load(std::memory_order_acquire) == UINT64_MAX)
    return refused(ALIVE_SESSION_V3_STALE_REQUEST, "Stop identity exhausted; restart the host.");
  if (r.reserved || r.kind < 1 || r.kind > 3 || r.track_mask >> config_.track_count)
    return refused(ALIVE_SESSION_V3_BAD_FIELD, "Invalid clip request fields.");
  if (r.kind == 3) {
    if (!r.track_mask || r.position)
      return refused(ALIVE_SESSION_V3_BAD_FIELD, "Track action requires a mask and zero position.");
    if (r.track_mask & (r.track_mask - 1))
      return refused(ALIVE_SESSION_V3_FEATURE_DISABLED, "Atomic track actions are not admitted yet.");
  } else if (r.track_mask || (r.kind == 1 ? r.position != 0 : r.position >= config_.length_frames))
    return refused(ALIVE_SESSION_V3_BAD_FIELD, "Invalid transport request position or mask.");
  for (unsigned t = 0; t < 8; ++t) {
    const auto &action = r.tracks[t];
    if (!(r.track_mask & (1u << t))) {
      if (action.action || action.slot)
        return refused(ALIVE_SESSION_V3_BAD_FIELD, "Unmasked track action is nonzero.");
      continue;
    }
    if (action.action == ALIVE_SESSION_V3_LAUNCH) {
      if (action.slot >= 4)
        return refused(ALIVE_SESSION_V3_BAD_FIELD, "Clip slot is outside the bank.");
      if (config_.bank[t].slots[action.slot] == None)
        return refused(ALIVE_SESSION_V3_EMPTY_SLOT, "Cannot launch an empty slot.");
    } else if (action.action != ALIVE_SESSION_V3_TRACK_STOP || action.slot != None)
      return refused(ALIVE_SESSION_V3_BAD_FIELD, "Invalid track action.");
  }
  const unsigned cell = unsigned(r.request_serial % 128);
  if (reservations_[cell]) {
    AliveSessionStateV3 value{};
    if (!coherent(value) || value.preparation_revision != r.preparation_revision ||
        value.receipts[cell].request_serial != reservations_[cell] || !terminal(value.receipts[cell].status))
      return refused(ALIVE_SESSION_V3_RECEIPT_BUSY, "Receipt cell is still queued or pending.");
  }
  Command c{};
  c.kind = 6;
  c.request = r;
  if (!enqueue(c, false))
    return refused(ALIVE_SESSION_V3_QUEUE_FULL, "Clip command queue is full.");
  reservations_[cell] = r.request_serial;
  finish(receipt, ALIVE_SESSION_V3_QUEUED);
  immediate = receipt;
  return true;
}

private:
void candidate_finish(uint64_t serial, unsigned status, unsigned error) noexcept {
  for (unsigned i = 0; i < candidate_.count; ++i)
    if (candidate_.receipts[i].request_serial == serial) {
      finish(candidate_.receipts[i], status, error);
      return;
    }
  for (unsigned t = 0; t < config_.track_count; ++t)
    if (state_.tracks[t].pending_serial == serial) {
      candidate_.old_status[t] = status;
      candidate_.old_error[t] = error;
      return;
    }
}
void candidate_cancel(unsigned t, unsigned status, unsigned error) noexcept {
  auto &ts = candidate_.tracks[t];
  if (ts.pending_action)
    candidate_finish(ts.pending_serial, status, error);
  ts.pending_action = 0;
  ts.pending_clip = None;
  ts.pending_serial = 0;
  ts.pending_frame = NoFrame;
}
uint64_t target_frame(uint64_t position) const noexcept {
  for (unsigned b = 0; b < prepared_.bar_count; ++b)
    if (prepared_.bars[b] >= position)
      return state_.absolute_frame + prepared_.bars[b] - position;
  return config_.loop_enabled ? state_.absolute_frame + config_.length_frames - position : NoFrame;
}
Cost first_candidate_cost() const noexcept {
  Cost out{};
  if (!candidate_.playing)
    return out;
  const bool global = candidate_.position >= config_.length_frames;
  for (unsigned t = 0; t < config_.track_count; ++t) {
    const auto &ts = candidate_.tracks[t];
    unsigned clip = ts.active_clip;
    uint64_t phase = global ? 0 : ts.phase;
    bool reset = global;
    if (ts.pending_action && ts.pending_frame <= state_.absolute_frame) {
      clip = ts.pending_clip;
      phase = 0;
      reset = true;
    }
    if (clip != None && phase >= config_.clips[clip].length_frames) {
      phase = 0;
      reset = true;
    }
    if (reset && !(candidate_.clear_mask & (1u << t)))
      out = clip_admission::add(out, prepared_.reset[t]);
    if (clip == None)
      continue;
    const auto &cl = config_.clips[clip];
    unsigned lo = 0, hi = cl.event_count;
    while (lo < hi) {
      const unsigned mid = (lo + hi) / 2;
      trace_read(true);
      if (config_.events[cl.event_begin + mid].frame < phase)
        lo = mid + 1;
      else
        hi = mid;
    }
    while (lo < cl.event_count) {
      trace_read(true);
      const auto &e = config_.events[cl.event_begin + lo];
      if (e.frame != phase)
        break;
      ++lo;
      ++out[0];
      out[3] += e.kind == ALIVE_SESSION_AUTOMATION;
    }
  }
  return out;
}
bool optional_admission() noexcept {
  using namespace clip_admission;
  const auto limits = policy(config_.profile);
  Cost charge{};
  for (unsigned t = 0; t < config_.track_count; ++t)
    if (candidate_.clear_mask & (1u << t))
      charge = add(charge, prepared_.reset[t]);
  charge[4] = HorizonSteps;
  const auto optional_frame = cost(limits.optional_frame), optional_window = cost(limits.optional_window);
  const auto scheduled_frame = cost(limits.scheduled_frame), scheduled_window = cost(limits.scheduled_window);
  const unsigned current = unsigned(state_.absolute_frame % Window);
  for (unsigned m = 1; m < 5; ++m)
    if (optional_.entries[current][m] + charge[m] > optional_frame[m] ||
        optional_.total[m] + charge[m] > optional_window[m])
      return false;
  const auto first = first_candidate_cost();
  for (unsigned m = 0; m < 5; ++m)
    if (scheduled_.entries[current][m] + first[m] > (m ? scheduled_frame[m] : 32))
      return false;
  Cost past_scheduled = add(scheduled_.total, scheduled_.expired),
       past_optional = add(optional_.total, optional_.expired);
  subtract(past_scheduled, scheduled_.entries[current]);
  subtract(past_optional, optional_.entries[current]);
  bool accepted = true;
  for (unsigned j = 0; j <= Window; ++j) {
    for (unsigned m = 0; m < 5; ++m) {
      const uint64_t future = j && candidate_.playing ? prepared_.future[m][j] : 0;
      if (past_scheduled[m] + future + (j ? scheduled_.entries[current][m] : 0) >
          (m ? scheduled_window[m] : 64))
        accepted = false;
      if (m && past_optional[m] + (j ? charge[m] + optional_.entries[current][m] : 0) > optional_window[m])
        accepted = false;
    }
    if (j == 0) {
      subtract(past_scheduled, scheduled_.expired);
      subtract(past_optional, optional_.expired);
    } else if (j < Window) {
      const unsigned old = (current + j) % Window;
      subtract(past_scheduled, scheduled_.entries[old]);
      subtract(past_optional, optional_.entries[old]);
    }
  }
  // Failed expensive checks consume their guard allowance, but never spend
  // reset/chase credits. Fixed cheap rejection/reduction overhead is reserved.
  optional_.charge(state_.absolute_frame, accepted ? charge : Cost{0, 0, 0, 0, HorizonSteps});
  trace_charge(1, accepted ? charge : Cost{0, 0, 0, 0, HorizonSteps});
  return accepted;
}
void begin_v3(CanvasWorkspace &workspace, unsigned end, uint64_t stop) noexcept {
  callback_fault_ = false;
  state_.requested_stop_epoch = stop;
  if (stop != applied_stop_) {
    terminate_v3(workspace, ALIVE_SESSION_V3_STOP_CANCELED);
    applied_stop_ = stop;
    state_.applied_stop_epoch = stop;
  }
  candidate_ = {};
  std::copy_n(state_.tracks, 8, candidate_.tracks);
  candidate_.playing = state_.playing;
  candidate_.position = state_.position;
  unsigned tail = tail_.load(std::memory_order_relaxed);
  uint64_t last_seek = 0;
  std::array<unsigned, 8> stopped_actions{};
  for (unsigned budget = 0; tail != end && budget < 64; ++budget) {
    const auto &c = commands_[tail];
    tail = (tail + 1) % 65;
    if (c.kind == 3) {
      trace_charge(3, Cost{0, 0, 0, 1, 0});
      auto &ds = state_.devices[c.track];
      ds.base[c.param] = c.value;
      if (!ds.owned[c.param])
        parameter(workspace, c.track, c.param, c.value);
      continue;
    }
    if (c.kind == 4) {
      auto &ts = candidate_.tracks[c.track].mixer;
      ts.gain = c.value;
      ts.mute = c.mute;
      ts.solo = c.solo;
      state_.tracks[c.track].mixer = ts;
      continue;
    }
    if (c.kind == 5) {
      state_.devices[c.track].bypassed = c.mute;
      continue;
    }
    if (c.kind != 6)
      continue;
    const auto &r = c.request;
    const unsigned index = candidate_.count++;
    auto &receipt = candidate_.receipts[index];
    receipt.version = 3;
    receipt.struct_bytes = sizeof receipt;
    receipt.preparation_revision = r.preparation_revision;
    receipt.request_serial = r.request_serial;
    receipt.kind = r.kind;
    receipt.track_mask = r.track_mask;
    receipt.observed_frame = state_.absolute_frame;
    receipt.target_frame = NoFrame;
    state_.last_consumed_request = r.request_serial;
    if (c.epoch != stop) {
      finish(receipt, ALIVE_SESSION_V3_CANCELED, ALIVE_SESSION_V3_STOP_CANCELED);
      continue;
    }
    if (r.preparation_revision != config_.preparation_revision) {
      finish(receipt, ALIVE_SESSION_V3_REJECTED, ALIVE_SESSION_V3_STALE_PREPARATION);
      continue;
    }
    finish(receipt, ALIVE_SESSION_V3_APPLIED);
    receipt.target_frame = state_.absolute_frame;
    if (r.kind == 1) {
      if (candidate_.playing) {
        candidate_.group[index] = !state_.playing;
        continue;
      }
      candidate_.group[index] = true;
      candidate_.unscheduled = true;
      candidate_.playing = 1;
      if (candidate_.position >= config_.length_frames) {
        candidate_.position = 0;
        for (unsigned t = 0; t < config_.track_count; ++t)
          candidate_.tracks[t].phase = 0;
      }
      for (unsigned t = 0; t < config_.track_count; ++t)
        if (candidate_.tracks[t].active_clip != None)
          candidate_.clear_mask |= 1u << t;
    } else if (r.kind == 2) {
      if (last_seek)
        candidate_finish(last_seek, ALIVE_SESSION_V3_SUPERSEDED, ALIVE_SESSION_V3_REPLACED_REQUEST);
      last_seek = r.request_serial;
      candidate_.group[index] = true;
      candidate_.unscheduled = true;
      candidate_.position = r.position;
      for (unsigned t = 0; t < config_.track_count; ++t) {
        candidate_cancel(t, ALIVE_SESSION_V3_CANCELED, ALIVE_SESSION_V3_REPLACED_REQUEST);
        auto &ts = candidate_.tracks[t];
        if (ts.active_clip != None)
          ts.phase = r.position % config_.clips[ts.active_clip].length_frames;
        if (candidate_.playing || !clear_[t])
          candidate_.clear_mask |= 1u << t;
      }
    } else {
      candidate_.group[index] = true;
      const unsigned t = session_bits::first(r.track_mask);
      const auto &action = r.tracks[t];
      auto &ts = candidate_.tracks[t];
      const uint64_t target = candidate_.playing ? target_frame(candidate_.position) : state_.absolute_frame;
      if (target == NoFrame) {
        finish(receipt, ALIVE_SESSION_V3_CANCELED, ALIVE_SESSION_V3_END_CANCELED);
        receipt.target_frame = NoFrame;
        continue;
      }
      candidate_cancel(t, ALIVE_SESSION_V3_SUPERSEDED, ALIVE_SESSION_V3_REPLACED_REQUEST);
      const unsigned clip =
          action.action == ALIVE_SESSION_V3_LAUNCH ? config_.bank[t].slots[action.slot] : None;
      if (candidate_.playing) {
        ts.pending_action = action.action;
        ts.pending_clip = clip;
        ts.pending_serial = r.request_serial;
        ts.pending_frame = target;
        receipt.target_frame = target;
        finish(receipt, ALIVE_SESSION_V3_PENDING);
      } else {
        // Stopped cues have no pending serial. After START, their active
        // selection may coexist with a later future-pending action.
        if (stopped_actions[t])
          finish(candidate_.receipts[stopped_actions[t] - 1], ALIVE_SESSION_V3_SUPERSEDED,
                 ALIVE_SESSION_V3_REPLACED_REQUEST);
        stopped_actions[t] = index + 1;
        ts.active_clip = clip;
        ts.phase = 0;
        ++ts.track_epoch;
        if (!clear_[t]) {
          candidate_.clear_mask |= 1u << t;
          candidate_.unscheduled = true;
        }
      }
    }
  }
  tail_.store(tail, std::memory_order_release);
  const bool accepted = !candidate_.unscheduled || optional_admission();
  if (accepted) {
    for (unsigned t = 0; t < config_.track_count; ++t)
      if (candidate_.old_status[t]) {
        auto &receipt = state_.receipts[state_.tracks[t].pending_serial % 128];
        finish(receipt, candidate_.old_status[t], candidate_.old_error[t]);
      }
    std::copy_n(candidate_.tracks, 8, state_.tracks);
    state_.position = candidate_.position;
    state_.playing = candidate_.playing;
    optional_clear_ |= candidate_.clear_mask;
  } else {
    ++state_.work_rejected;
    for (unsigned i = 0; i < candidate_.count; ++i)
      if (candidate_.group[i] && (candidate_.receipts[i].status == ALIVE_SESSION_V3_APPLIED ||
                                  candidate_.receipts[i].status == ALIVE_SESSION_V3_PENDING))
        finish(candidate_.receipts[i], ALIVE_SESSION_V3_REJECTED, ALIVE_SESSION_V3_WORK_LIMIT);
  }
  for (unsigned i = 0; i < candidate_.count; ++i)
    state_.receipts[candidate_.receipts[i].request_serial % 128] = candidate_.receipts[i];
  state_.peak_left = state_.peak_right = 0;
  for (auto &ts : state_.tracks)
    ts.mixer.peak_left = ts.mixer.peak_right = 0;
}
void fault_v3(CanvasWorkspace &workspace, unsigned resource) noexcept {
  state_.fault = ALIVE_SESSION_V3_RUNTIME_INVARIANT;
  state_.fault_resource = resource;
  ++state_.event_faults;
  callback_fault_ = true;
  terminate_v3(workspace, ALIVE_SESSION_V3_RUNTIME_INVARIANT);
}
void sample_v3(CanvasWorkspace &workspace) noexcept {
  using namespace clip_admission;
  if (callback_fault_)
    return;
  unsigned mask = optional_clear_;
  Cost charge{};
  if (state_.playing && state_.position >= config_.length_frames) {
    if (config_.loop_enabled) {
      state_.position = 0;
      for (unsigned t = 0; t < config_.track_count; ++t) {
        state_.tracks[t].phase = 0;
        if (state_.tracks[t].active_clip != None)
          mask |= 1u << t;
      }
    } else {
      for (unsigned t = 0; t < config_.track_count; ++t)
        if (!clear_[t])
          charge = add(charge, prepared_.reset[t]);
      if (const auto failure = scheduled_fits(charge)) {
        fault_v3(workspace, failure);
        return;
      }
      scheduled_.charge(state_.absolute_frame, charge);
      trace_charge(0, charge);
      terminate_v3(workspace, ALIVE_SESSION_V3_END_CANCELED, true);
      return;
    }
  }
  if (state_.playing)
    for (unsigned t = 0; t < config_.track_count; ++t) {
      auto &ts = state_.tracks[t];
      if (ts.pending_action && ts.pending_frame <= state_.absolute_frame) {
        ts.active_clip = ts.pending_clip;
        ts.phase = 0;
        mask |= 1u << t;
      } else if (ts.active_clip != None && ts.phase >= config_.clips[ts.active_clip].length_frames) {
        ts.phase = 0;
        mask |= 1u << t;
      }
    }
  for (unsigned t = 0; t < config_.track_count; ++t)
    if ((mask & ~optional_clear_) & (1u << t))
      charge = add(charge, prepared_.reset[t]);
  if (mask) {
    if (const auto failure = scheduled_fits(charge)) {
      fault_v3(workspace, failure);
      return;
    }
    // Reserve reconstruction reads before doing them, even if the later event
    // invariant fails. Optional reads were already charged at batch admission.
    const Cost scans{0, 0, charge[2], 0, 0};
    scheduled_.charge(state_.absolute_frame, scans);
    trace_charge(0, scans);
    charge[2] = 0;
    for (unsigned t = 0; t < config_.track_count; ++t)
      if (mask & (1u << t))
        prepare_chase(t);
  }
  std::array<unsigned, 8> next = cursors_;
  std::array<const AliveSessionEventV2 *, 32> batch{};
  unsigned count = 0;
  if (state_.playing)
    for (unsigned t = 0; t < config_.track_count; ++t) {
      const auto &ts = state_.tracks[t];
      if (ts.active_clip == None)
        continue;
      const auto &clip = config_.clips[ts.active_clip];
      if (mask & (1u << t))
        next[t] = chase_[t].cursor;
      while (next[t] < clip.event_count) {
        const auto &e = config_.events[clip.event_begin + next[t]];
        if (e.frame != ts.phase)
          break;
        if (count == 32) {
          fault_v3(workspace, ALIVE_SESSION_V3_RESOURCE_EVENTS);
          return;
        }
        batch[count++] = &e;
        ++next[t];
        if (e.kind == ALIVE_SESSION_AUTOMATION)
          ++charge[3];
      }
    }
  charge[0] = count;
  const unsigned failure = scheduled_fits(charge);
  if (failure) {
    fault_v3(workspace, failure);
    return;
  }
  scheduled_.charge(state_.absolute_frame, charge);
  trace_charge(0, charge);
  for (unsigned t = 0; t < config_.track_count; ++t) {
    auto &ts = state_.tracks[t];
    if (ts.pending_action && ts.pending_frame <= state_.absolute_frame) {
      finish(state_.receipts[ts.pending_serial % 128], ALIVE_SESSION_V3_APPLIED);
      ts.pending_action = 0;
      ts.pending_clip = None;
      ts.pending_serial = 0;
      ts.pending_frame = NoFrame;
    }
  }
  clear_tracks(workspace, mask, true);
  optional_clear_ = 0;
  cursors_ = next;
  // At most 32 heads, deterministic across all track/clip iteration orders.
  std::sort(batch.begin(), batch.begin() + count, [](const auto *a, const auto *b) {
    if (priority(a->kind) != priority(b->kind))
      return priority(a->kind) < priority(b->kind);
    if (a->track != b->track)
      return a->track < b->track;
    if (a->device != b->device)
      return a->device < b->device;
    if (a->target != b->target)
      return a->target < b->target;
    return a < b;
  });
  for (unsigned i = 0; i < count; ++i)
    dispatch_event(workspace, *batch[i]);
}
unsigned scheduled_fits(const Cost &charge) const noexcept {
#ifdef ULTRA_ALIVE_SESSION_TEST_TRACE
  if (alive_session_test_fault_resource)
    return alive_session_test_fault_resource;
#endif
  const auto limits = clip_admission::policy(config_.profile);
  const auto frame = clip_admission::cost(limits.scheduled_frame),
             window = clip_admission::cost(limits.scheduled_window);
  for (unsigned m = 0; m < 5; ++m)
    if (scheduled_.entries[state_.absolute_frame % 1024][m] + charge[m] > (m ? frame[m] : 32) ||
        scheduled_.total[m] + charge[m] > (m ? window[m] : 64))
      return m + 1;
  return 0;
}
void advance_v3(CanvasWorkspace &workspace) noexcept {
  if (state_.playing) {
    ++state_.position;
    for (unsigned t = 0; t < config_.track_count; ++t)
      if (state_.tracks[t].active_clip != None)
        ++state_.tracks[t].phase;
  }
  scheduled_.expire(state_.absolute_frame);
  optional_.expire(state_.absolute_frame);
  if (state_.playing && !config_.loop_enabled && state_.position >= config_.length_frames)
    sample_v3(workspace);
}
