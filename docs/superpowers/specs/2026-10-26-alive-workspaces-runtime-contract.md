# Arrangement and audio runtime contract proposal

Date: 2026-10-26. Baseline: native/session source at `c511f14`, before the
separately owned UI-only Task 1. This is a read-only architectural deliverable
for Tasks 2-4, not implementation, admission evidence, or a claim that
Arrangement/audio currently works. No production source, tests, build products,
index, or commits were changed in producing it. The parent owns ratification and
source scheduling. Tasks 2 and 3 remain outstanding after the current UI slice.

Authority: `docs/superpowers/specs/2026-10-26-alive-workspaces-design.md` and
`docs/superpowers/plans/alive-workspaces-20261026.md`.

## 1. Decision and existing ownership

Implement an opt-in `alive-session-v4` project and an additive C v4 boundary
inside the existing `AliveSession` owner. Keep one native absolute frame clock,
one control queue, the reserved Stop mailbox, one receipt reservation mechanism,
one `CanvasWorkspace`, and the existing Faust/Ultra device roots. Generalize
the existing bounded track cursor/reducer to resolve either a Session source or
an Arrangement occurrence. Do not add a second engine or copy the DSP.

Keep the current v1/v2/v3 C declarations and format decoders unchanged in
behavior. Their public structs, rejection cases, policy constants, output
projection behavior, and fixture expectations remain regression gates. The new
features do not become available merely because v4 has fixed storage. Separate
v4 capability bits require new measurement and acceptance.

The relevant baseline facts are:

| Existing owner | Reuse and required change |
| --- | --- |
| `session/clips.rs` | Strict v3 decode, duplicate-member rejection, stable note/clip IDs and focused edits are useful. Its `Document::Deref<Target=LegacySession>` cannot represent an audio track; remove that internal abstraction, not the strict legacy wire types. |
| `session/prepare.rs` | Device loading, fingerprint checking, graph preparation, parameter validation and deterministic frame compilation remain off callback. `PreparedTrack.instrument: usize` becomes optional in the internal normalized representation. |
| `session/host.rs` | Keep sixteen root revisions/ownership bits, prospective admission, stopped-I/O installation, rollback and independent instance ownership. Retain decoded sample owners alongside the prepared session. |
| `session/runtime.rs` | Keep canonical decimal identities, bounded 128-request projection and exact preparation/serial reconciliation. Add v4 projection; do not reinterpret v3 snapshots. |
| `session/desktop.rs` | Keep the serialized control owner, main-window authentication, generation/draft checks, editor instance authentication and stopped Apply. Add focused v4 commands and typed capabilities. |
| `alive_session.hpp` / `_clips.hpp` | Keep the queue, Stop epoch, candidate receipt reduction, root parameter path, ledgers and coherent publication. Factor narrow typed helpers for chain traversal, resolved source cursors, reconstruction and rendering. V3 continues through its original policy/dialect. |
| `alive_session_envelope.hpp` | Reuse the pure cyclic-envelope and segment-composition helpers; add finite-placement envelopes with independent brute-force oracles. They own no playback state. |
| `backend.cpp` | Keep `session.sample -> canvas.sample -> same Faust engine -> session.render_sample -> session.advance`. Explicitly select this hosted path for a configured v4 session even when `canvas.any()` is false. |

The last row is mandatory: `callback_canvas` currently follows `canvas.any()`;
an audio track with no effects owns zero roots. It would otherwise fall into
the legacy non-canvas bus path and never emit its samples. Introduce a local
`hosted_signal_path = callback_canvas || session.requires_signal_path()` after
control synchronization, and use it consistently for output clearing, per-frame
engine offsets, rendering, flush/fault handling and final bus selection.
`requires_signal_path()` is true for configured v4, not for unrelated Ultra
operation. Root iteration remains conditional on actual live roots. Audit
`synchronize_canvas_runtime`, both audio starts, root close, idle clocks and
route changes; configured v4 must not silently fall back when its last effect
is removed. This is a routing predicate change, not a dummy root.

## 2. Strict v4 saved wire

The following is the exact proposed JSON schema expressed as Rust wire types.
All structs use `rename_all = "camelCase", deny_unknown_fields`; all enums use
`tag = "kind", rename_all = "camelCase", rename_all_fields = "camelCase",
deny_unknown_fields`. Do not use `flatten` or a permissive `Value` conversion.
Run the duplicate-map-member pass over the original text before dispatching to
the typed v4 decoder, including nested parameter maps. Missing fields reject;
nullable slot entries must be present. `DecimalU64` serializes as a canonical
unsigned decimal string and rejects leading zeroes except `"0"`.

```rust
struct ProjectV4 {
    format: String,                 // exactly "alive-session-v4"
    title: String,
    tempo: f64,
    length_beats: f64,
    loop_enabled: bool,
    loop_start_beats: f64,
    loop_end_beats: f64,
    tracks: Vec<TrackV4>,
    sources: Vec<SourceV4>,
    placements: Vec<PlacementV4>,
}
struct TrackV4 {
    id: String,
    name: String,
    color: String,                  // # followed by six lowercase hex digits
    chain: ChainV4,
    effects: Vec<DeviceInstance>,   // unchanged strict v2 DeviceInstance fields
    slots: [Option<SlotV4>; 4],
    gain: f64,
    mute: bool,
    solo: bool,
}
enum ChainV4 {
    Midi { instrument: DeviceInstance },
    Audio {},                      // no instrument field or instrument instance
}
enum SourceV4 {
    Midi {
        id: String, track_id: String, name: String,
        length_beats: f64,
        notes: Vec<ClipNote>,       // unchanged strict v3 note fields, stable IDs
        automation: Vec<Lane>,      // unchanged instance/key/enabled/beat points
    },
    Audio {
        id: String, track_id: String, name: String,
        file: AudioFileV4,
        automation: Vec<Lane>,
    },
}
struct AudioFileV4 {
    path: String,
    source_sha256: String,          // SHA-256 of every encoded file byte
    encoding: String,               // exactly "wavPcm"
    channels: u32,                  // 1 or 2
    sample_rate: u32,               // exactly 48000
    bits_per_sample: u32,           // 16 or 24
    frames: DecimalU64,
}
enum SourceOffsetV4 {
    Beats { value: f64 },           // MIDI source only
    Frames { value: DecimalU64 },   // audio source only; exact original PCM frame
}
struct SlotV4 {
    id: String,
    name: String,
    source_id: String,
    source_offset: SourceOffsetV4,
    loop_enabled: bool,
}
struct PlacementV4 {
    id: String,
    track_id: String,
    source_id: String,
    start: f64,                     // global beats
    duration: f64,                  // global beats
    source_offset: SourceOffsetV4,
    loop_enabled: bool,
}
```

`DeviceInstance`, `ClipNote`, `Lane` and `Point` retain their current strict
fields. Audio automation uses the existing beat-valued point wire, converted at
project tempo and bounded by the audio source's frame length; it controls that
track's effects only. Changing tempo changes this automation's musical timing
and Arrangement placement timing, never the audio sample rate or pitch.

Only the root enum gains `WorkspacesV4(ProjectV4)`. Keep `LegacySession`, legacy
`Track`, v3 `ClipDocument` and their serialized representations intact. Replace
internal `Deref`/`DerefMut` callers with explicit version dispatch or a borrowed
`ProjectRef`/`TrackRef` adapter exposing metadata, mixer, devices and optional
instrument. A normalized internal `PreparedTrack` is:

```rust
enum PreparedTrackInput { Midi { instrument: usize }, Audio }
struct PreparedTrack { input: PreparedTrackInput, effects: Vec<usize> }
enum Schedule {
    Legacy,
    Clips(Vec<PreparedClip>),
    Workspaces(PreparedWorkspaces),
}
```

Do not put invented devices, fake notes, audio metadata, or v4 fields into the
legacy model to keep dereferencing convenient. Existing `Host::view`,
`Snapshot.devices`, `configuration_common`, `compile_music`, `merge_live`,
`same_chain`, `musical_draft`, `change_device`, `document_capacity`,
`history::Projection`, Save As and probe helpers need explicit review. Keep
legacy snapshot `devices` as-is; v4 uses `deviceInstances` and a new
`trackChains` projection with `instrumentId: null` on audio tracks. Any retained
v4 `devices` compatibility projection is an empty list, never a shortened list
whose indices appear to be track indices. Native indices are not persistent IDs.

### Identities, scope and admission

- Use the existing safe ASCII token rule (1-64 bytes) for all IDs. Source, slot,
  placement, note, track and instance IDs are globally unique across the v4
  document. Fresh IDs are generated by the control owner and checked against
  prepared, draft and retained-history identities. Undo restores the exact IDs.
- A source belongs to exactly one track and matches its MIDI/audio kind. All
  references are same-track. Shared file bytes may back independent audio
  sources; source ownership and automation do not cross tracks.
- Editing notes, source length or source automation changes that source and all
  slots/placements referring to it. UI must state the reference count. A focused
  Make Independent command copies the source, creates fresh source/note IDs and
  rewires only the named slot or placement; it retains that occurrence ID.
  Copying PCM ownership uses immutable shared buffers, not duplicate samples.
- Duplicate Placement retains the source ID and creates only a new placement
  ID. Duplicate Session Slot creates a new slot ID and, by explicit contract,
  retains its source ID; Make Independent is a separate action. Do not inherit
  v3's deep-copy slot semantics silently in a v4 command.
- Native preparation order: tracks in document order, devices sorted by
  instance ID as today, sources by (track index, source ID), slots by
  (track index, slot number), placements by (track index, start frame, ID),
  audio buffers by fingerprint plus verified descriptor. Prepared maps retain
  every stable ID and the preparation revision.
- Maximum eight tracks, sixteen roots, two effects per track, four slots and
  four unique sources per track, thirty-two sources/slots total, eight
  placements per track and sixty-four total. MIDI sources aggregate at most
  128 notes, 16 lanes and 256 points per track, including disabled lanes;
  audio sources share the same lane/point aggregate. The source event pool is
  at most 1024 events globally. Occurrences do not multiply stored events.
- At least one track; zero native roots are legal for all-audio projects. Gain
  remains 0..2 at the saved/desktop boundary. V4 native admission also uses
  0..2; v1/v2/v3 native 0..4 compatibility is unchanged.
- Title/name/path limits remain 128/64/4096 UTF-8 bytes, with no control
  characters. Keep the 1 MiB document and 64-entry/8 MiB musical-history bounds.
- Tempo remains 30..240 BPM and song/MIDI source lengths 1/64..256 beats.
  Validate finite arithmetic and checked additions before converting frames.
  Loop brace requires `0 <= start < end <= length` even while disabled, and a
  rounded loop period at least `round((1/64)*48000*60/tempo)` frames.

### Exact occurrence time

Use `F(b) = round(b * 48000.0 * 60.0 / tempo)`, with the same operation order
and nonnegative half-away-from-zero rounding in Rust and C++. A placement is
`[F(start), F(start + duration))`; duration frames are the difference of those
endpoints, not a separately rounded duration. Require at least one frame and
containment in the song. Validate overlap in both beat and compiled-frame
domains; touching half-open endpoints are allowed. Never merge adjacent
occurrences, including those with the same source.

Let `L` be source frame length and `O` the compiled source offset, with
`0 <= O < L`. The initial loop region is deliberately simple: the source suffix
`[O,L)`. It has period `P=L-O`. A looping occurrence reads
`O + (elapsed % P)` and hard-resets its track at each suffix repetition.
A nonlooping placement must have `duration_frames <= P`; longer placements
reject instead of adding silent padding. A looping placement may have any
admitted duration; its final iteration is cut at its placement end. A Session
slot has no Arrangement duration: it repeats the suffix if loop-enabled, or
reaches Session-owned silence when the suffix ends. A loop-enabled suffix must
meet the same 1/64-beat minimum period. Nonlooping audio may be shorter.

This first version has no independent loop-in/loop-out markers, stretching,
warping or crossfades. Shortening the source or changing tempo must validate
every referring occurrence transactionally, with the offending IDs in the
error. Audio files stay at fixed 48 kHz. A tempo change can make a nonlooping
placement longer than its remaining audio; reject that edit visibly until the
placement is shortened or looping is enabled.

### Migration and continuity

Opening v1/v2/v3 keeps the current decode/admission/optional v3-upgrade path.
It never silently upgrades to v4. Keep notices and playable legacy fallback.
An explicit stopped `alive_enable_workspaces` operation first prepares and
admits a prospective v4 project; failure leaves the old document and runtime.

For v3-to-v4 conversion, preserve track/instance/note IDs and device data.
Preserve each old clip ID as its new slot ID. Derive the source ID using the
existing length-prefixed hash scheme with domain `alive-v3-v4-source`, track
ID and clip ID. Each default clip gets one deterministic placement at beat 0,
duration equal to song length, zero offset, loop enabled, referencing that
source. Null default produces no placement. Thus the saved default's initial
playback is represented explicitly in Arrangement. Other slots stay available.
Use domain `alive-v3-v4-placement` for those placement IDs. Check collisions;
never overwrite colliding authored IDs. Preserve title, tempo, loop enabled,
mixer and chains; initialize loop brace to the whole song. Assign colors from
the fixed migration palette in track order:
`#c77b61,#86a59c,#b4a269,#8c9db4,#b58e9a,#88a26c,#c09152,#a39b8d`.

For legacy v2, perform the existing deterministic v2-to-v3 musical conversion
in the prospective candidate, then this mapping. A v2 graph outside the v3/v4
measured graph family remains playable in v2 and conversion refuses. Do not
discard an old unsupported schedule to force migration. V1 uses its existing
strict v1-to-v2 source resolution before that operation.

V4 always installs stopped, at song position 0, with every track owned by
Arrangement. Do not persist runtime authority, pending commands, receipts,
selection, workspace, play state or native frame position. Save As rewrites
both device and audio paths relative to the resolved destination directory;
protect both kinds of source files from overwrite. Saved v4 must reopen as v4
or fail explicitly, never drop audio/placements into v3.

## 3. Playback authority and reconstruction

Each track has exactly one runtime authority: `Arrangement` or `Session`.
Arrangement resolves the unique placement containing the current song frame,
or silence in a gap. Session resolves its active slot, or Session-owned silence.
Both feed the same track chain, mixer, base values and device instances.

| Operation | Applied behavior |
| --- | --- |
| Launch slot while playing | At the existing next bar boundary, set that track to Session, clear its complete chain, start suffix phase O. Other tracks continue. |
| Track Stop while playing | At the same quantized boundary, set that track to Session with no active slot, clear it and remain silent until explicit return or another launch. |
| Back to Arrangement | Quantized identically; set only requested tracks to Arrangement, resolve placement/source phase at the song position on that exact native frame, clear/chase and render that sample. |
| Global Back to Arrangement | One atomic track-action request with all track bits and return actions; preserve per-member outcomes like scenes. |
| Stopped launch/Stop/return | Cue authority immediately at the next native control boundary, with no audible output. Start later reconstructs the selected state. |
| Scene | One request; populated slots launch and empty slots produce Session-owned Stop. Never implicitly return an empty member to Arrangement. |
| Global musical Stop | Reserved mailbox, queue/receipt-independent. Cancel pending requests, clear roots and release automation; retain authority, current Session slot and phase. It does not return tracks to Arrangement. |
| Start | Resume current song position/authority; after natural song end, rewind song to zero and Session cursors to their source offsets. Reconstruct active notes/automation. |
| Seek | Immediately relocate Arrangement to the requested song frame through the optional admission path. Preserve Session authority and running Session phase; do not reset unaffected Session roots. Cancel pending track actions with replacement reason, matching the existing explicit seek cancellation convention. |
| Global song loop | Jump Arrangement to loop start and reconstruct its tracks. Session phases continue independently. Apply due per-track commands after the song wrap, at the new song position. |
| Nonlooping song end | Stop all output, cancel pending actions with end reason, retain authority. Session playback also stops with the transport. |
| Apply/open/structural reinstall | Stopped device replacement; fresh preparation and Arrangement authority. UI must communicate this reset. |
| Tab, detail/editor selection | No runtime operation or change in any authority, cursor, request, history or identity. |

Quantization remains a 4-beat grid computed once from project tempo. Include
the loop-entry seam as a quantization boundary, as v3 already includes its song
seam. While playing, target the earliest boundary at or after the current
position, including the current frame. After the last reachable boundary with
looping disabled, return `END_CANCELED`, not an indefinitely pending request.
Store targets in absolute native frames; never schedule by a browser timer.
With looping enabled, seek accepts only positions before the active loop end;
the prefix before loop start is allowed. Seeking at/after loop end rejects
with guidance to disable or extend the brace, rather than applying a different
position than the receipt claims. This is a new explicit v4 admission rule.

Order at a sample: consume mailbox/control batch at callback entry; resolve
song seam/end; apply due authority changes; resolve occurrence/suffix changes;
reserve work; reconstruct/clear changed tracks; dispatch deterministic
termination, automation, note-on events; read PCM/render roots/mix; advance the
single clock. Multiple discontinuities affecting one track on one sample are
coalesced to one actual clear. A fault cannot rearm within that callback.

V4 reconstructs the MIDI state active at a source offset or mid-note return.
The strict-prefix source scan accumulates automation bases/last values and
active note pitches/velocities. Emit synthetic note-ons for notes with
`start < phase < end`, after reset and automation, before ordinary note-ons at
that frame. Half-open ends are not chased. Notes beginning exactly at phase are
handled once by the normal event batch. Same-pitch overlapping notes still
reject. Native validation verifies well-formed matching note intervals and
the existing four-voice graph bound; synthetic dispatch uses that same
allocator. V4 additionally admits at most four simultaneously held notes per
MIDI source, so reconstruction does not have to guess which voices a previous
stealing sequence retained. This is a narrower v4 rule; a valid legacy source
exceeding it stays playable in its old format and explicit conversion refuses.
It reconstructs musical held state, not the historical oscillator
or filter state: returning in a held note restarts its attack. State this
audible limitation. V3 retains its existing automation-only chase behavior.

The chase implementation must remove notes ending exactly at phase before
forming synthetic note-ons: reuse the due-frame batch to clear those pitches
from the strict-prefix active set. A missing note-off at source length denotes
the existing implicit end boundary, not an unterminated note. Keep at most 32
synthetic/ordinary dispatch records in fixed scratch and perform one combined
admission check. At a suffix seam or adjacent placement boundary the old
occurrence terminates by full-chain clear first; old endpoint events are not
dispatched into the new occurrence. Then restore/chase new-source automation,
apply its due automation, and dispatch chased then ordinary note-ons in stable
track/device/pitch order. In a gap or at nonlooping placement/slot end there is
only clear/release and silence, with no new note-on. This order also covers a
note spanning the left source offset: it is restarted once at the offset and
terminated by its real note-off or the occurrence cutoff, whichever comes first.

Every actual/synthetic dispatch counts against the unchanged 32/frame and
64/1024-frame event limits. Reject an admitted project/transition if its chase
would exceed them; do not bypass the ledger. All track discontinuities clear
the existing full roots, including effects, so gap/end/Stop/replace do not leak
prior tails. An audio cursor itself has no DSP state to clear. During mute/solo
suppression, active source/effect computation keeps advancing as today; only
the final track mixer suppresses output. Effect bypass selects same-frame dry
audio while wet state keeps advancing, unchanged from v2.

## 4. Additive native ABI

Put declarations in a new `native/alive_session_workspaces.h`, included from
the end of `alive_session.h` within the existing C linkage block. Rust mirrors
live in `session/native_v4.rs`, re-exported by `native.rs`. No packed layouts,
C booleans, Rust enums, `usize`, `Vec` or owning smart pointers cross FFI.
The following layouts target the current supported 64-bit ABI (8-byte pointer,
u64 and double alignment); compile-time assertions reject incompatible targets
until separately specified. Native indices are zero-based; `NONE=UINT32_MAX`
and `NO_FRAME=UINT64_MAX` retain their meanings.

```c
enum {
 ALIVE_SESSION_V4_VERSION=4,
 ALIVE_SESSION_V4_PROFILE_2X4=1, ALIVE_SESSION_V4_PROFILE_8X4=2,
 ALIVE_SESSION_V4_WORK_POLICY_1=1, ALIVE_SESSION_V4_WORK_POLICY_2=2,
 ALIVE_SESSION_V4_TRACKS=8, ALIVE_SESSION_V4_DEVICES=16,
 ALIVE_SESSION_V4_SOURCES=32, ALIVE_SESSION_V4_SLOTS=32,
 ALIVE_SESSION_V4_PLACEMENTS=64, ALIVE_SESSION_V4_AUDIO_BUFFERS=8,
 ALIVE_SESSION_V4_EVENTS=1024, ALIVE_SESSION_V4_RECEIPTS=128,
 ALIVE_SESSION_V4_MIDI=1, ALIVE_SESSION_V4_AUDIO=2,
 ALIVE_SESSION_V4_ARRANGEMENT_AUTHORITY=0,
 ALIVE_SESSION_V4_SESSION_AUTHORITY=1,
 ALIVE_SESSION_V4_NO_ACTION=0, ALIVE_SESSION_V4_LAUNCH=1,
 ALIVE_SESSION_V4_TRACK_STOP=2, ALIVE_SESSION_V4_RETURN=3,
 ALIVE_SESSION_V4_START=1, ALIVE_SESSION_V4_SEEK=2,
 ALIVE_SESSION_V4_TRACK_ACTIONS=3,
 ALIVE_SESSION_V4_FEATURE_ADMITTED=1,
 ALIVE_SESSION_V4_FEATURE_ATOMIC_TRACK_ACTIONS=2,
 ALIVE_SESSION_V4_FEATURE_ARRANGEMENT=4,
 ALIVE_SESSION_V4_FEATURE_AUDIO=8
};
typedef struct AliveSessionTrackV4 {
 uint32_t kind,instrument,effect_count,reserved;
 uint32_t effects[2],slots[4];
 uint32_t placement_begin,placement_count;
 double gain;
 uint32_t mute,solo;
} AliveSessionTrackV4;
typedef struct AliveSessionSourceV4 {
 uint32_t track,kind,event_begin,event_count;
 uint32_t lane_count,audio_buffer,reserved0,reserved1;
 uint64_t length_frames;
 uint32_t owned_masks[16];
} AliveSessionSourceV4;
typedef struct AliveSessionSlotV4 {
 uint32_t track,source,loop_enabled,reserved;
 uint64_t source_offset;
} AliveSessionSlotV4;
typedef struct AliveSessionPlacementV4 {
 uint32_t track,source,loop_enabled,reserved;
 uint64_t start_frame,duration_frames,source_offset;
} AliveSessionPlacementV4;
typedef struct AliveSessionAudioBufferV4 {
 uint32_t version,struct_bytes,channels,sample_rate;
 uint64_t frames,sample_count;
 const float* samples;             /* immutable interleaved normalized PCM */
 uint64_t reserved;
} AliveSessionAudioBufferV4;
typedef struct AliveSessionConfigV4 {
 uint32_t version,struct_bytes,profile,work_policy;
 uint32_t track_count,device_count,source_count,slot_count;
 uint32_t placement_count,event_count,audio_buffer_count,loop_enabled;
 uint64_t preparation_revision,length_frames,loop_start,loop_end;
 double tempo_bpm;
 AliveSessionTrackV4 tracks[8];
 AliveSessionDeviceV2 devices[16];
 AliveSessionSourceV4 sources[32];
 AliveSessionSlotV4 slots[32];
 AliveSessionPlacementV4 placements[64];
 AliveSessionEventV2 events[1024];
} AliveSessionConfigV4;
typedef struct AliveSessionTrackActionV4 { uint32_t action,slot; }
 AliveSessionTrackActionV4;
typedef struct AliveSessionRequestV4 {
 uint32_t version,struct_bytes,kind,track_mask;
 uint64_t preparation_revision,request_serial,position,reserved;
 AliveSessionTrackActionV4 tracks[8];
} AliveSessionRequestV4;
typedef struct AliveSessionReceiptV4 {
 uint32_t version,struct_bytes,status,error;
 uint64_t preparation_revision,request_serial,observed_frame,target_frame;
 uint32_t kind,track_mask,pending_mask,applied_mask;
 uint32_t superseded_mask,canceled_mask,rejected_mask,reserved;
} AliveSessionReceiptV4;
typedef struct AliveSessionWorkV4 {
 uint64_t root_clears,event_scans,parameter_writes,guard_steps;
 uint64_t placement_steps,sample_reads;
} AliveSessionWorkV4;
typedef struct AliveSessionLimitsV4 {
 uint32_t version,struct_bytes,profile,work_policy;
 uint32_t features,max_tracks,max_devices,max_sources;
 uint32_t max_slots,max_placements,max_audio_buffers,max_events;
 uint32_t max_frame_events,max_window_events,window_frames,max_commands;
 uint32_t max_receipts,sample_rate,min_loop_frames,reserved;
 uint64_t max_audio_frames,max_audio_bytes,max_audio_file_bytes;
 AliveSessionWorkV4 scheduled_frame,scheduled_window;
 AliveSessionWorkV4 optional_frame,optional_window,emergency;
 uint32_t max_sample_reads_frame,max_peak_bins;
} AliveSessionLimitsV4;
typedef struct AliveSessionDiagnosticV4 {
 uint32_t version,struct_bytes,error,resource;
 uint32_t track_mask,conservative,window_frames,reserved;
 uint64_t frame,observed,limit;
 uint32_t source[8],placement[8],contribution[8];
} AliveSessionDiagnosticV4;
typedef struct AliveSessionTrackStateV4 {
 AliveSessionTrackStateV2 mixer;
 uint32_t authority,active_slot,active_placement,active_source;
 uint32_t pending_action,pending_slot,reserved0,reserved1;
 uint64_t phase,track_epoch,pending_serial,pending_frame;
} AliveSessionTrackStateV4;
typedef struct AliveSessionStateV4 {
 uint32_t version,struct_bytes,configured,playing;
 uint32_t profile,work_policy,track_count,device_count;
 uint32_t source_count,slot_count,placement_count,audio_buffer_count;
 uint32_t fault,fault_resource,reserved0,reserved1;
 uint64_t absolute_frame,position,generation,rejected;
 uint64_t preparation_revision,last_consumed_request;
 uint64_t requested_stop_epoch,applied_stop_epoch,work_rejected,event_faults;
 double peak_left,peak_right;
 AliveSessionTrackStateV4 tracks[8];
 AliveSessionDeviceStateV2 devices[16];
 AliveSessionReceiptV4 receipts[128];
} AliveSessionStateV4;

int alive_session_limits_v4(uint32_t profile, AliveSessionLimitsV4*);
int alive_session_validate_v4(const AliveSessionConfigV4*);
int alive_session_validate_prepared_v4(const AliveSessionConfigV4*,
 const UltraCanvasGraph*,uint32_t graph_count,
 const AliveSessionAudioBufferV4*,uint32_t audio_count);
int alive_session_configure_v4(const AliveSessionConfigV4*,
 const AliveSessionAudioBufferV4*,uint32_t audio_count);
int alive_session_request_v4(const AliveSessionRequestV4*,
 AliveSessionReceiptV4* immediate);
uint64_t alive_session_stop_v4(void);
int alive_session_state_v4(AliveSessionStateV4*);
int alive_session_diagnostic_v4(AliveSessionDiagnosticV4*);
```

Rust declarations use `#[repr(C)]` with the same ordered fields/array lengths,
`u32/u64/f64`, `samples: *const f32`, and existing `DeviceV2/EventV2` mirrors.
Their concrete extern signatures are:

```rust
extern "C" {
    pub fn alive_session_limits_v4(profile: u32, out: *mut LimitsV4) -> i32;
    pub fn alive_session_validate_v4(config: *const ConfigV4) -> i32;
    pub fn alive_session_validate_prepared_v4(
        config: *const ConfigV4, graphs: *const NativeGraph, graph_count: u32,
        audio: *const AudioBufferV4, audio_count: u32,
    ) -> i32;
    pub fn alive_session_configure_v4(
        config: *const ConfigV4, audio: *const AudioBufferV4, audio_count: u32,
    ) -> i32;
    pub fn alive_session_request_v4(
        request: *const RequestV4, immediate: *mut ReceiptV4,
    ) -> i32;
    pub fn alive_session_stop_v4() -> u64;
    pub fn alive_session_state_v4(out: *mut StateV4) -> i32;
    pub fn alive_session_diagnostic_v4(out: *mut DiagnosticV4) -> i32;
}
```

V4 uses the existing `alive_session_base_v2(document, revision, parameter,
value)`, `alive_session_bypass_v2(document, revision, bypassed)` and
`alive_session_mixer(track, gain, mute, solo)` paths, authenticated on the Rust
side by stable instance/track identity and generation. `alive_session_reset`
remains the stopped-I/O retirement operation for all modes. No new per-sample
FFI or sample-release callback exists.

Legacy `alive_session_base(track, ...)` must refuse v4 before looking up an
instrument, just as legacy Start/Seek refuse identity-bearing modes. Common
render/meter/reset helpers iterate actual chain members and mix by track index;
they never dereference the audio instrument NONE sentinel. Audio tracks report
zero active voices. These guards are required even when old C entry points are
called directly rather than through the desktop.

### Layout assertions to implement in C++ and Rust

These are specified layouts, calculated from the declarations, not claims of
executed tests. Add size, alignment and field-offset assertions on both sides
before enabling capability bits.

| Type | Bytes | Alignment | Important offsets |
| --- | ---: | ---: | --- |
| TrackV4 | 64 | 8 | effects 16, slots 24, placement_begin 40, gain 48 |
| SourceV4 | 104 | 8 | length_frames 32, owned_masks 40 |
| SlotV4 | 24 | 8 | source_offset 16 |
| PlacementV4 | 40 | 8 | start_frame 16, duration_frames 24, source_offset 32 |
| AudioBufferV4 | 48 | 8 | frames 16, sample_count 24, samples 32, reserved 40 |
| ConfigV4 | 51160 | 8 | preparation_revision 48, tempo_bpm 80, tracks 88, devices 600, sources 11736, slots 15064, placements 15832, events 18392 |
| TrackActionV4 | 8 | 4 | slot 4 |
| RequestV4 | 112 | 8 | preparation_revision 16, tracks 48 |
| ReceiptV4 | 80 | 8 | preparation_revision 16, kind 48, reserved 76 |
| WorkV4 | 48 | 8 | placement_steps 32, sample_reads 40 |
| LimitsV4 | 352 | 8 | max_audio_frames 80, scheduled_frame 104, emergency 296, max_sample_reads_frame 344 |
| DiagnosticV4 | 152 | 8 | frame 32, source 56, placement 88, contribution 120 |
| TrackStateV4 | 104 | 8 | authority 40, pending_action 56, phase 72 |
| StateV4 | 16736 | 8 | absolute_frame 64, peak_left 144, tracks 160, devices 992, receipts 6496 |

Retain existing v3 assertions exactly: Config 47232, Track 56, Clip 88,
Request 112, Receipt 80, Work 32, Limits 224, Diagnostic 120, TrackState 88,
State 16592. Preserve the old layout tests and add independent v4 tests; do not
replace their expectations with the larger structs. V1/v2 C and Rust mirrors
also remain unchanged. Add explicit mode-refusal tests: a v3 request never
operates a v4 session. V1/v2/v3 state entry points return false with untouched
outputs when v4 is configured, rather than projecting audio into fake devices.
Existing projections within old modes retain their exact behavior.

Status values 0..7 and error values 0..18 have exactly their v3 meanings in the
v4 namespace. Add v4-only errors `BAD_PLACEMENT=19`, `BAD_SOURCE=20`,
`AUDIO_BOUNDS=21`, `AUDIO_DISABLED=22`. Resource values 0..5 retain meaning;
add `PLACEMENT_STEPS=6`, `SAMPLE_READS=7`. Disk/decode errors are richer Rust
control errors, not realtime receipt strings. Unknown action/profile/policy,
nonzero reserved fields, wrong exact header size, invalid masks and unmapped
indices reject. All unused array entries are zero, except active track empty
slots and MIDI source `audio_buffer`, which use NONE. Audio track `instrument`
is NONE. Active audio sources have only automation events, never note events.

`validate_v4` checks POD structure, ownership, event/placement bounds and work
envelopes. It cannot inspect sample bytes. `validate_prepared_v4` additionally
validates every actual graph and every audio descriptor/sample off callback.
Zero graph/audio counts permit null pointers only for those empty arrays.
Every sample pointer must be nonnull/aligned when its count is nonzero, have
`sample_count == frames * channels`, and pass finite/range checks. The C caller
must supply readable memory for its declared count, as with existing graph
pointers; arbitrary invalid foreign pointers are not made safe by validation.
`configure_v4` repeats descriptor/graph/admission checks on installed roots and
requires stopped device I/O. It borrows the sample buffers only after complete
successful admission and copies the small descriptors into fixed native
storage. Failed configuration never adopts candidate pointers. Its input
descriptor array itself need not survive the call.

## 5. Immutable WAV preparation and retirement

Support little-endian RIFF/WAVE with format tag 1, a 16-byte PCM `fmt ` chunk,
48,000 Hz, mono or stereo, signed 16-bit or signed packed 24-bit samples. Reject
float PCM, 8/32-bit PCM, extensible WAVE, RIFX/RF64, compressed data, multiple
fmt/data chunks, nonintegral data frames, inconsistent block align/byte rate,
truncation, arithmetic overflow and trailing bytes outside the declared RIFF.
Permit bounded unknown chunks and their required padding; require fmt before
data. Exact accepted-format errors must name the source and supported forms.
No resampler exists in this first slice: reject 44.1/96 kHz and explain that
the project/native core requires a 48 kHz source. Do not silently change pitch.

Admission proposal: at most eight distinct decoded buffers; at most 2,880,000
frames (60 seconds) per audio file; at most 24 MiB encoded bytes per file;
at most 64 MiB decoded `f32` storage per prepared generation. Each sample is
`i16/32768.0` or sign-extended `i24/8388608.0`. Decode interleaved into one
immutable `Arc<[f32]>`; no normalization, clipping, channel averaging or hidden
gain. Mono maps to `(x,x)`, stereo maps `(L,R)`. Both immediately enter the
existing ordered Ultra effect loop and track mixer. Device graph restrictions
are the same measured v3 family, including explicit stereo effect entry/output.

Use a streaming bounded reader to fingerprint all encoded bytes and decode,
with at most 64 KiB decode scratch. Validate file-size/frame/memory caps before
sample allocation; do not read an unbounded file into a `Vec`. Asset buffers
deduplicate within a candidate by full fingerprint and descriptor, with
collision-safe byte/descriptor verification as appropriate; no unbounded
process-global cache. All clones of `PreparedSession` clone Arcs, never PCM.

```rust
struct PreparedAudio {
    path: PathBuf,
    source_sha256: String,
    channels: u32,
    frames: u64,
    samples: Arc<[f32]>,
    peaks: Arc<WaveformPeaks>,
}
struct WaveformPeaks {
    frames: u64,
    channels: u32,
    frames_per_bin: u32,
    bins: Vec<[f32; 4]>, // mono min,max duplicated into right min,max
}
struct PreparedWorkspaces {
    sources: Vec<PreparedSourceV4>,
    slots: Vec<PreparedSlotV4>,
    placements: Vec<PreparedPlacementV4>,
    audio: Vec<PreparedAudio>,
}
struct PreparedSourceV4 {
    id: String, name: String, descriptor: native::SourceV4,
}
struct PreparedSlotV4 {
    id: String, name: String, slot: u32, descriptor: native::SlotV4,
}
struct PreparedPlacementV4 {
    id: String, descriptor: native::PlacementV4,
}
```

Peaks come only from the same decoded `samples`. Set
`frames_per_bin=max(1,ceil(frames/4096))`; emit at most 4096 bins, each real
channel's exact min/max over its covered half-open frame range. Include the
last partial bin. No file re-read, dummy sine or synthetic thumbnail. The
control read API returns source ID, preparation revision, hash, channels,
frames and bin width plus bounded requested bins; at most 512 bins per request.
Waveforms are not serialized or included in every snapshot. Detail zoom uses
these real bounded peaks; sample-resolution zoom is outside this first API.

Pointer lifetime sequence is a correctness requirement:

1. Resolve, decode and admit the entire candidate while the old generation is
   retained and may still play. One candidate only under the serialized
   control owner. Current+candidate PCM is at most 128 MiB (shared buffers count
   once); peaks add at most 1 MiB across both, plus bounded decode scratch.
2. Require musical Stop for Apply/structural installation, then witness
   `Driver::stop()` destroying both CPAL closures through its existing epoch
   retirement protocol. A failed open, `stream=None`, or musical Stop is not
   proof of retirement. Preserve all existing driver retirement refusals.
3. Keep old and candidate Arcs alive. Call `ultra_audio_stop`, then
   `alive_session_reset` to remove every native borrowed sample pointer and
   pending cursor before closing any old device roots.
4. Install candidate roots and configure v4 with pointers from candidate Arcs.
   On success move the candidate into `Host.prepared`, then release the old
   owners on the control thread. New device I/O can start only afterward.
5. On installation/configuration failure reset any partially installed state
   while stopped and reinstall the old retained project with a fresh
   preparation revision, rebinding its old buffers. Drop candidate buffers
   only after native reset proves none remain referenced. Keep old owners if
   rollback also fails; surface the existing restoration-failed error and stay
   stopped. A failed candidate must not erase the old model/history.
6. Device stop alone leaves the prepared PCM owned and available for restart.
   Quit destroys driver closures, stops/resets native, closes roots, then drops
   PCM/peaks. No callback increments/decrements an Arc, frees memory, opens
   files, decodes, hashes, allocates or acquires a blocking lock.

This order must be implemented in an explicit rollback guard/owned transaction,
not by assuming `self.prepared` outlives a temporary `apply` call. Add lifetime
tests with poison/drop counters and a delayed callback retirement fixture.

Missing or changed source during open, Apply or save rejects before current
playback/model/history is replaced. Errors identify source ID/name, affected
track and referring occurrences, path, expected digest and observed failure.
Already prepared PCM continues playing if its file disappears afterward; no
callback consults disk. Provide stopped explicit source Relocate (matching
digest/descriptor only) and Replace (new source ID, all explicitly named old
source references rewired atomically). Replace preserves their stable
occurrence IDs, validates every offset/duration and clears that source's
automation rather than silently retargeting it. Independent copies sharing a
path remain independent; unchanged stale siblings must still be resolved.
Do not assume a matching backup exists. Save revalidates dependencies and
never silently blesses changed bytes using a new fingerprint.

## 6. Bounded scheduler and policy negotiation

Keep the exact v3 policy tables and graph family. V4 profile 1 has maxima
2 tracks/6 roots/8 sources/8 slots/16 placements; profile 2 has
8/16/32/32/64. Both have at most eight audio buffers and the same 64 MiB PCM
cap. These are storage/admission proposals, not timing promises. Distinct
v4 work-policy IDs 1/2 belong to the v4 namespace; never pass a v4 structure
to the v3 validator because the numbers happen to match.

`min_loop_frames` in the limits response is the absolute supported minimum
188 frames (the 240 BPM rounded endpoint); configuration validates the stricter
tempo-dependent minimum described earlier. Keep the native maximum buffer of
1024 frames and Rust driver's existing bounded splitting of larger delivered
callbacks. No source clock uses callback length as its origin.

The original four work-resource ceilings remain exactly:

| Family | Profile 1 roots/scans/writes/guard | Profile 2 roots/scans/writes/guard |
| --- | --- | --- |
| Scheduled frame | 18 / 3072 / 608 / 0 | 48 / 3072 / 1568 / 0 |
| Scheduled 1024-frame window | 108 / 18432 / 3520 / 0 | 288 / 18432 / 9280 / 0 |
| Optional frame and window | 6 / 1024 / 192 / 9252 | 16 / 1024 / 512 / 9252 |
| Emergency per callback | 12 / 0 / 192 / 0 | 32 / 0 / 512 / 0 |

Events remain separately 32/frame, 64/window, 1024 stored; queue 64 commands,
128 receipts; 16 bound parameters/root; four voices/MIDI instrument. Synthetic
chase events spend the event budget. Every returned-to/offset source requires
the same parameter ownership union checks and graph binding validation as v3.

New resources need their own explicit conservative counters and measurement:

| New resource | Frame | 1024-frame window | Notes |
| --- | ---: | ---: | --- |
| Scheduled placement steps | 64 | 512 | Only boundary/lookup work, not steady cursor increments. |
| Optional placement steps | 2114 | 2114 | At most 64 resolution probes plus 2050 extra scheduled/optional horizon comparisons. |
| Scheduled PCM scalar reads | 16 | 16384 | At most two per audio track per frame, up to eight tracks. |
| Optional/emergency PCM reads | 0 | 0 | Stop and preview never read sample payloads. |
| Emergency placement steps | 0 | 0 | Termination clears current resolved tracks without lookup. |

Retain the original five-component event/work ledger and 9252-comparison
horizon for its existing dimensions. Add a bounded placement ledger and count
its extra two comparisons per horizon step separately, rather than claiming
the larger check still performs 9252 comparisons. PCM reads have a direct
structural per-frame bound independent of authority, so they need no extra
future-horizon search; trace actual reads. The fixed preview remains bounded
by existing per-track event binary search plus 32 event heads (128 event reads
at eight tracks), with additional placement probes charged explicitly.
If implementation needs more work, it must narrow admission or return to
policy review and measurement; do not silently enlarge these limits.

### Concrete envelope construction

Do not flatten all placement repetitions into a new unbounded event list.
Source events stay source-local and occur in one pool. Prepare a fixed
per-track placement range, its sorted endpoints and a next-boundary cursor.
At steady state each track checks the next endpoint and advances its current
source cursor; no per-sample scan of all 64 placements or 1024 events.
Seek/return uses binary search within at most eight placements per track.

For each distinct `(source, offset)` used by a slot/placement, build a local
suffix event profile off callback. Include offset-chased held notes and a
reset/chase pulse at suffix phase zero; source events before O are only read
for reconstruction, not replayed. The source-prefix scan bound is its stored
event count, including the terminating probe. Hold-state reconstruction uses
a fixed 128-pitch scratch array, shared with that scan, not a second full scan.
The event cost of the reset pulse includes the maximum possible held-note
chase count at arbitrary entry phase, and parameter writes/reset costs include
the full chain. The model permits at most 96 `(source,offset)` uses, hence at
most 96 such profiles; unused sources still validate their stored bounds.

For each track, derive a conservative source envelope as the pointwise maximum
of admitted suffix cyclic profiles and finite nonlooping source profiles.
Construct the track's boundary envelope from placement starts/ends, slot
nonlooping ends, global loop seams/end and the quantization table. Song/brace
boundaries use arithmetic cyclic counting over the loop region plus a bounded
nonloop prefix; do not assume the transport loop begins at zero. Include
arbitrary Arrangement-entry phases from return/seek, and use segment
composition to cover source switches. Count forced transition reset pulses in
addition to source repetition pulses. Taking a maximum per track permits
either Session or Arrangement; summing track envelopes covers every mixed
authority combination and atomic scene/return. Conservatively double-counted
resets may refuse a dense project, but actual work must never be undercounted.

Bound preparation itself before segment dynamic programming: the conservative
forced-boundary envelope for any one track must be at most six in a 1024-frame
window. This is a new narrowing v4 admission rule, preserving the existing
maximum of seven positive-length splice segments. Count a union endpoint once
when start/end coincide; conservatively add quantization and loop/end envelopes
even if a source transition might coalesce them. If that sum exceeds six,
reject with the contributing placements and grid/loop context before calling
`segments`. Do not run the helper with up to 1024 segments or enumerate long
song repetitions to discover that a candidate is too dense. Nonlooping source
end pulses also contribute to this cap unless already represented by a finite
profile endpoint. This may reject tightly packed edits and is preferable to
quietly increasing tested transition work.

Compute these envelopes for every width 1..1024 with checked/saturating
arithmetic; overflow refuses with conservative diagnostic. Compare against the
unchanged event/root/scan/write ceilings and new placement ceiling. The pure
oracle must establish that the boundary envelope covers coincident starts,
adjacent same-source occurrences, gaps, minimum suffix loops, partial song
loops, differing Session phases and every active authority combination.
Admission is allowed to reject conservative combinations visibly.

At runtime keep the existing past-history rolling-window checks, first-frame
preview, candidate batch atomicity, failed-guard charging, partial supersession
and reserved emergency cleanup. Reserve reconstruction scans before performing
them and count generated chase events before emitting any. A runtime invariant
failure stops output and cancels pending receipts using the existing fault
semantics; never emit the partial 33rd event or silently skip a placement.

Implementation organization: share the queue reduction and receipt algebra,
with a small dialect adapter resolving `launch/stop/return`, active source and
phase. Use a common internal `ResolvedCursor { source, phase, occurrence,
next_boundary }` for v3/v4 source stepping; v3 resolution preserves its current
clip phase/seek/global-loop rules. Keep separate strict v3/v4 configuration
validators and envelope builders. Avoid maintaining a copied 1170-line second
`_clips.hpp`; extract only the mechanics proved equivalent by unchanged v3
fixtures, in separate small commits/slices. Public v3 state still publishes
16592 bytes; publish the v4 payload only for v4. A larger shared internal
scratch owner does not justify adding per-callback v3 publication cost.

Capabilities initially report no v4 ADMITTED bit. Task 2 may enable
ADMITTED|ATOMIC_TRACK_ACTIONS|ARRANGEMENT only after its MIDI policy evidence;
Task 3 separately enables AUDIO after the PCM/effect/zero-root evidence.
Decode/schema support can precede capability admission, but open/apply of a
project needing a disabled feature refuses transactionally with a useful
message. Do not present a nonfunctional Arrangement as usable.

## 7. Authenticated desktop commands and observations

Exact additive snapshot/prepared DTOs, primary affected IDs, stopped structural
track operations, reserved Stop dispatch and retained-history path handling are
pinned in [the desktop contract](2026-10-26-alive-workspaces-desktop-contract.md).
That supplement is a design contract, not evidence of active app admission.
V4 UI Play starts audio then requests Start using the same originally captured
generation/preparation identity; each endpoint retains its own authentication
and the runtime request still requires a live driver.

New command arguments are strict typed enums/structs. Runtime requests require
main window, current desktop generation, canonical preparation revision and
running audio; optional stopped cues still require a live driver to observe the
native control boundary, matching current Session commands. Edits require
generation and draft revision and resolve IDs against the current draft.
Source/device import and structural changes require stopped transport and
resolved pending drafts, following existing structural controls.

```rust
// Tauri window/state arguments omitted here only; use the existing types.
alive_enable_workspaces(generation: u64, draft_revision: u64) -> Snapshot
alive_workspace_edit(operation: WorkspaceEditV4,
    generation: u64, draft_revision: u64) -> WorkspaceEditResultV4
alive_workspace_action(action: WorkspaceActionV4,
    generation: u64, preparation_revision: String) -> RequestResultV4
alive_audio_import(track_id: Option<String>, name: String, path: Option<PathBuf>,
    generation: u64, draft_revision: u64) -> WorkspaceEditResultV4
alive_audio_source(operation: AudioSourceOperationV4,
    generation: u64, draft_revision: u64) -> WorkspaceEditResultV4
alive_audio_peaks(source_id: String, preparation_revision: String,
    generation: u64, first_bin: u32, bin_count: u32) -> WaveformPageV4

enum OccurrenceV4 { Slot { track_id: String, slot_id: String },
                    Placement { placement_id: String } }
enum WorkspaceEditV4 {
    SourceCreateMidi { track_id: String, name: String, length_beats: f64 },
    SourceRename { source_id: String, name: String },
    SourceDelete { source_id: String }, // only with zero references
    SourceLength { source_id: String, length_beats: f64 }, // MIDI only
    SourceIndependent { occurrence: OccurrenceV4 },
    NoteCreate { source_id: String, beat: f64, duration: f64,
                 pitch: u32, velocity: u32 },
    NoteUpdate { source_id: String, note_id: String, beat: f64, duration: f64,
                 pitch: u32, velocity: u32 },
    NoteDelete { source_id: String, note_id: String },
    AutomationSet { source_id: String, lanes: Vec<Lane> },
    SlotAssign { track_id: String, slot: u32, source_id: String, name: String,
                 source_offset: SourceOffsetV4, loop_enabled: bool },
    SlotUpdate { track_id: String, slot_id: String, name: String,
                 source_offset: SourceOffsetV4, loop_enabled: bool },
    SlotDuplicate { track_id: String, slot_id: String, destination_slot: u32 },
    SlotDelete { track_id: String, slot_id: String },
    PlacementCreate { track_id: String, source_id: String, start: f64,
                      duration: f64, source_offset: SourceOffsetV4,
                      loop_enabled: bool },
    PlacementUpdate { placement_id: String, start: f64, duration: f64,
                      source_offset: SourceOffsetV4, loop_enabled: bool },
    PlacementDuplicate { placement_id: String, start: f64 },
    PlacementDelete { placement_id: String },
    TransportRange { tempo: f64, length_beats: f64, loop_enabled: bool,
                     loop_start_beats: f64, loop_end_beats: f64 },
    TrackPresentation { track_id: String, name: String, color: String },
}
enum WorkspaceActionV4 {
    Launch { track_id: String, slot_id: String },
    Stop { track_id: String },
    Return { track_ids: Vec<String> }, // 1..8 unique; all IDs means global return
    Scene { slot: u32 },
    Start {},
    Seek { beat: f64 },
}
enum AudioSourceOperationV4 {
    Relocate { source_id: String, path: PathBuf },
    Replace { source_id: String, path: PathBuf },
}
```

`SlotAssign` requires an empty slot and creates a new ID. Reassigning an
existing occurrence uses explicit delete/assign or Make Independent; generic
document edits cannot spoof identities. Audio import with `track_id=None`
creates an audio track with a new server-generated ID and no effects; it
creates a source without an implicit slot or placement, returning both IDs so
the explicit subsequent assignment is undoable. With a track ID it requires
an existing audio track. The user-facing workflow can immediately issue the
focused assignment, but native audio must not depend on an imported MIDI root.
Replacing audio rewires all references to that explicit source in one
transaction; it does not change other source IDs sharing the file.

`WorkspaceEditResultV4` contains the full snapshot plus affected track/source/
slot/placement/note IDs as required nullable fields. Edits produce bounded
pending history, do not prepare native roots or launch clips, and continue to
require stopped Apply. Store v4 musical fields/sources/occurrences in the
history projection, exclude live mixer/bases/bypass/runtime authority and PCM.
Live fields merge by current stable instance/track identity as today. Failed
validation/history capacity does not advance draft revision or history cursor.

Runtime result fields preserve current request masks/statuses and add
`members[].authority` (requested target), `slotId`, and `sourceId`. Snapshots
report observed `authority`, active slot/placement/source IDs, source phase,
track epoch and pending action/slot/serial/absolute target. Use explicit null
for gaps and Session-owned silence; do not infer authority from an active clip
being absent. Keep observed and pending authority separate.

Native RequestV4 uses slot number 0..3 only for launch; Stop/Return carry NONE;
unmasked entries are all zero. Return resolves current Arrangement position at
application time, not at request submission. A same-track later request
supersedes only that member of an earlier scene/global return; unrelated
members retain pending or terminal status. Stop epochs, receipt collision,
serial saturation, queue-full and receipt-busy behavior are identical to the
current v3 contract. Existing v3 commands remain v3-only; new UI dispatches by
explicit `mode: "workspacesV4"` and negotiated features.

## 8. Narrow red/green integration slices

No additional coding sessions or cloud tasks are needed. Use one source
implementer at a time under the existing PR. Do not bundle all of Task 2 into
one model/runtime rewrite. Each slice adds meaningful failing behavior checks,
implements that slice, runs its focused regressions and receives independent
review before widening scope.

### Task 2A: strict model and explicit conversion, feature still disabled

Red: duplicate/unknown/missing fields; mandatory null slots; wrong source kind;
cross-track IDs/automation; beat and rounded overlap; suffix/offset bounds;
duplicate placement sharing source; Make Independent; source edit propagation;
deterministic migration including null defaults and playable legacy refusal;
round-trip/Save As and old file acceptance. Green: new `workspaces.rs` wire and
focused edits, explicit document adapters, musical history and preparer model.
No new native feature is exposed yet. Keep exact v1/v2/v3 decode tests.

### Task 2B: ABI and one MIDI Arrangement lane

Red: C/Rust size/offset parity, wrong-mode/size/reserved/ownership refusals;
one real Ultra MIDI source placed twice with a gap and nonzero offset;
mid-note entry/automation chase; fixed no-loop source boundaries; arbitrary
partitions. Green: v4 declarations, source/placement config, common chain
helpers and cursor resolver on the existing frame clock. New capability stays
unadmitted until the complete work policy is measured. Run original v1/v2/v3
native suites unchanged after every shared-helper refactor.

### Task 2C: authority, loops and receipts

Red: per-track launch/Stop/return, empty scene member, global return, pending
supersession masks, repeated sources, placement cutoff, suffix loop, nonzero
global loop brace, seek while another track remains Session-owned, Stop under
full queue, saturated receipts/epochs, end/fault and first-frame coalescing.
Green: extend the existing candidate/reducer with the v4 dialect and state
projection. Verify actual PCM from real MIDI devices and exact event frames,
not just a mocked cursor. No Tab/UI operation calls these commands.

### Task 2D: envelopes, authenticated desktop and measured admission

Red: brute-force finite/cyclic/segment envelope oracle, arbitrary-offset chase
cost, retained-history overlap, rejected optional request continuity,
reconstruction-read charging, maximum-profile capacity refusals, hostile edit
IDs/editor window attempts, pending undo with live bases/mixer, Apply rollback.
Green: native work admission plus desktop commands/snapshots; guard and timing
evidence for MIDI v4 at 2/6 and 8/16. Only then enable Arrangement bits for
profiles that pass. A refused eight-track profile does not inherit v3 timing.

### Task 3A: bounded decoder, assets and real peaks

Red: hand-generated known 16/24-bit PCM, mono/stereo channel ordering, signed
extrema, actual min/max bins/last partial bin, unsupported rates/encodings,
malformed RIFF lengths/chunks, caps before allocation, missing/changed file,
fingerprint metadata changes, Save As and replace/relocate continuity.
Green: `audio_source.rs`, bounded immutable ownership, source import/recovery,
peaks API and v4 audio preparation. AUDIO feature remains disabled.

### Task 3B: zero-root PCM and same Ultra effects

Red: audio-only/no-effect project emits exact input at the expected native
frame (including first sample); mono duplicated/stereo preserved, offset,
suffix wrap, duration cutoff, gap, Session Stop silence, return/seek/song loop;
real utility/filter effects, bypass wet advancement, two independent effect
instances, reset/state leakage and mixer values. Green: hosted signal-path
predicate and audio source input feeding the existing effect loop. Do not
write tests that merely assert a new audio-kind enum exists.

### Task 3C: ownership, stress and AUDIO admission

Red: delayed CPAL retirement, callback accesses during stopped replacement,
candidate install failure, rollback failure, old PCM retained on disk error,
Quit disposal, memory caps across both generations, concurrent coherent state,
sample-read/placement-work bounds and guards. Green: complete retirement guard
and rollback ownership. Measure mixed MIDI/audio maximum workloads and then
enable AUDIO for passing profiles. Integrate Task 4 only against these admitted
capabilities and exact native observations.

## 9. File and regression map

| File / new file | Responsibility and required test surface |
| --- | --- |
| `apps/ultra/src-tauri/src/session/workspaces.rs` (new) | Strict v4 model, IDs, focused edits, migration and source/occurrence validation. |
| `apps/ultra/src-tauri/src/session/audio_source.rs` (new) | Bounded WAV streaming decode, hash, immutable buffers, peaks and file errors. |
| `session/mod.rs`, `clips.rs` | Add v4 enum branch and remove mandatory-device Deref assumptions; preserve v3 parser/edit behavior. |
| `session/prepare.rs` | Common device preparation, v4 source/event/placement compilation, aggregate validation and sample budget. |
| `session/persistence.rs`, `history.rs` | Strict dispatch, atomic path-safe save, audio Save As, v4 musical projection, retained IDs. |
| `session/host.rs` | Prospective v4 admission, prepared pointer owner, root install and rollback/retirement transaction. |
| `session/runtime.rs`, `desktop.rs` | Authenticated new commands, prepared ID maps, pending/applied authority and request members. |
| `session/native_v4.rs` (new), `native.rs` | Exact mirrors, defaults/headers, mode negotiation and independent layout checks. |
| `native/alive_session_workspaces.h` (new) | Additive C declarations; no modifications to old declarations. |
| `native/alive_session_workspaces.hpp` (new) | V4 bounds, envelope construction and v4 cursor/dialect helpers inside AliveSession, not a second owner. |
| `native/alive_session.hpp`, `_clips.hpp`, `_envelope.hpp` | Narrow shared chain/render/reducer mechanics; unchanged legacy policy outcomes. |
| `native/backend.cpp` | New C wrappers and zero-root configured-session signal-path selection. |
| `native/alive_session_v4_policy.md` (new) | Proposed/accepted features, counter definitions and exact new measurement provenance. |
| `session/workspaces_tests.rs`, `audio_source_tests.rs` (new) | Wire/edit/migration/compile/asset/history/persistence behaviors. |
| `tests/alive_session_v4_layout_test.cpp` (new) | All size/alignment/offset assertions and wrong-header canaries. |
| `tests/alive_session_v4_test.cpp` (new) | Scheduling, MIDI chase, authority/receipts, PCM routing, zero roots and real effects. |
| `tests/alive_session_v4_envelope_test.cpp` (new) | Independent brute-force oracle for finite placements, suffixes and authority transitions. |
| `tests/alive_session_v4_measure.cpp` and retained runner (new) | Real graph/sample workloads, separate timing and alloc/free/lock diagnostics, exact sources and samples. |
| `tests/ci/check-native.sh`, `src-tauri/build.rs` | Wire new native tests/build inputs without replacing the old invocations. |
| `session/desktop.rs` tests and `audio_epoch` tests | Command/auth/history and delayed-retirement/rollback integration. |
| Task 4 UI tests | Consume v4 IDs/peaks, real timeline geometry/edits/undo, view-only Tab, focus and unchanged editor identity. |

The old regression gate includes `alive_session_test.cpp`,
`alive_session_v2_test.cpp`, `alive_session_v3_test.cpp`,
`alive_session_v3_layout_test.cpp`, `alive_session_envelope_test.cpp`,
`alive_session_capacity.cpp`, its saved-graph/scene fixtures and original
partition/guard cases, plus existing Rust session/desktop/history and audio
retirement tests. Do not rewrite their fixtures to make the new design pass.
Preserve legacy graph admission, diagnostics, source-error notices, Stop,
Quit, pending-history and receipt refusals. The parent's old standalone probe
result is historical baseline evidence, not v4 verification.

For deterministic audio tests generate original PCM with recognizable unequal
L/R values, impulses and nonperiodic ramps; use real saved Ultra utility and
filter graphs already in the repository. Compare output/event boundaries
across the existing arbitrary partition set and additional splits immediately
before/at/after placement, suffix, authority and global-loop boundaries.
Include callback sizes 1 and 31 for logic, and supported practical sizes for
timing. Compare direct known-PCM effect evaluation with hosted output rather
than inventing an expected filter waveform. No bundled external media is needed.

Measure the resulting build, not only the old policy: all-MIDI/all-audio/mixed,
0/6/16 roots, both channel counts, longest admitted buffers, near memory cap,
minimum loops, 64 placements, 1024 source events, dense chased notes, return
bursts, full-queue Stop, failed work admission, 128 receipts and v4 coherent
publication. Retain mean/p99/p99.9/max and raw samples, allocation/free/lock
guard results, preparation time/peak memory, and exact commit/build hashes.
Keep timing and guard binaries separate. Existing 8-track measurements already
exceed 256-frame budget in the combined scene case, so do not assume new v4
work has spare headroom. Final native app mixed-project playback, endurance,
save/Quit/reopen, actual driver observations and Task 5 CI/packages remain
separate gates; physical output cannot be inferred from deterministic tests.

## 10. Requirements coverage and explicit costs

| Requirement | Contract coverage |
| --- | --- |
| Real horizontal MIDI/audio Arrangement | Separate stable placements, frame compilation, MIDI held-state chase and PCM source path; Task 4 renders these real prepared entities. |
| Existing four-slot Session | Four fixed slots, explicit source references, quantized launch/Stop and existing receipt discipline. |
| Shared tracks, mixer and Ultra chain | One root owner; audio directly feeds the same ordered effect loop; no mandatory instrument for audio. |
| Per-track override/return independent of Tab | Explicit authority including Session-owned silence; pending/applied observations and atomic global return. |
| True import and waveforms | Defined 48 kHz PCM16/24 WAV subset, immutable bounded samples and actual decoded min/max peaks. |
| Strict persistence/migration/error continuity | Separate v4 parser, explicit migration, source/hash/path checks, no implicit format downgrade or rehash. |
| Bounded realtime ownership/work | Frozen old limits, separate new resources, checked envelopes, one clock/queue, stopped pointer retirement and capability gating. |
| Preserve regressions and live editors/history | Old ABI/layout/suites retained, identity-authenticated commands, new musical projection excludes live fields. |

The real compatibility cost is the internal model adapter/refactor: adding an
enum variant while keeping `Document::Deref` would perpetuate false instruments
through persistence, history, snapshots and rendering. The runtime cost is a
bounded cursor resolver, MIDI held-note chase, larger v4 publication, sample
reads and finite-placement envelopes. These costs require fresh measurements;
the v3 tables cannot establish v4 deadlines. Conservative source/placement
ceilings and a 48 kHz-only WAV subset keep the first implementation testable.

Ratify this contract before source work. In particular, ratify suffix-loop
semantics, source-wide edit scope, explicit v4 conversion, v4-only MIDI chase,
independent Session phase across song seek/loop, hard-reset tails, and the
48 kHz PCM16/24 import subset. They are concrete product/runtime choices, not
implementation details to improvise in Task 4. If changed, update the affected
wire/ABI/policy tests before enabling capabilities. Nothing in this proposal
authorizes higher v3 limits, a second engine, full Ultra apps per track, or a
Clockwork migration.
