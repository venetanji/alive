# Task 2A: Strict V4 Model And Focused Musical Edits

This is one bounded source slice of the real Arrangement/Session plan. Read this
first: it is your requirements. The runtime contract is a proposed design now
accepted by the controller for staged implementation; this task implements only
its pure model and edit foundation. Native admission is still disabled. The
existing v1/v2/v3 Alive app and example remain usable throughout.

## Scope And Sequencing Ruling

Create session/workspaces.rs and focused workspaces tests; register the module.
Implement the schema/validation, deterministic prospective migration and pure
focused edits described below. Reuse strict DeviceInstance/ClipNote/Lane types
without weakening old wire decoders. No Rust/native ABI, scheduling, DSP,
frontend, PCM decoder, app command, root ownership or capability activation yet.

Keep the new ProjectV4 outside the active Document enum in this slice. Adding
that variant before runtime admission would force a half-integrated audio model
through mandatory-instrument Deref callers. The checked ProjectRef/TrackRef
adapters and Deref removal move to Task2D when the native contract is real;
no panic/unreachable/default fake instrument adapter is permitted. Existing
file open/save behavior stays as-is. Pure v4 parse/serialize APIs and conversion
are tested independently; do not claim app v4 open/Apply is available.

History-facing edits return an owned prospective project plus affected stable
IDs and are transactional; integration with desktop retained history comes in
2D. IDs must be minted/validated by the control-side model, with injectable
fixed IDs in tests. Do not invent source event compilation here. Validate beats
and compiled endpoint frames with the exact expression given below.

No subagents, no other coding sessions. Parent owns PLAN/PRODUCT/README/specs,
PR, refs, evidence and ledger. Work in the existing feature worktree; preserve
other changes, use targeted git add. Test first, make one coherent commit, then
report source freeze. Parent supplies independent spec/quality review.

## Binding Schema, Identity, Bounds, Offsets And Migration


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


## Focused Edit Interface

Use strict typed operations equivalent to the following contract. Tauri
arguments/IPC and Audio import are later stages; pure MIDI source/slot/placement
operations are this task. Source/audio variants still parse/validate descriptors
without reading files. SourceIndependent may clone an audio descriptor but does
not claim PCM exists. Unknown/missing fields and duplicate map members reject.

```rust
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
```

## Required Red/Green Behaviors

- Duplicate/unknown/missing fields and explicit null slots; canonical decimal
  frame values; finite numeric/checked arithmetic and per-track/global bounds.
- Kind/ownership/ID/automation rejection, including cross-track source and device
  references; source-wide edits and independent copy without accidental aliasing.
- Nonzero offsets, suffix loops, nonloop duration bounds, beat/frame-domain
  overlap, touching placements and duplicate occurrence sharing one source.
- Fresh note/source/slot/placement IDs, stable undo-ready IDs, exact rejection
  continuity and errors naming affected IDs. No tests just mirroring constructors.
- Deterministic v3 conversion (including null defaults and collision refusal),
  legacy prospective conversion, strict v4 round-trip and old decoder regression.
  Graph-family/native admission is later; conversion returns a candidate only.

Run focused Rust model tests with real dependencies and existing session/model
regressions once stable. No new feature flags, native builds or GUI runs solely
for this pure model slice. Report commands/counts/red failures/green results,
owned files, commit, limitations and any load-bearing concerns in
.superpowers/sdd/alive-workspaces-20261026/task-2a-report.md. Return concise status,
commit IDs and report path. Source must remain usable and reviewable on its own.
