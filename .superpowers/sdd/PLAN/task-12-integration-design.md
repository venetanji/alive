# Task 12 Saved Clip Integration Design

Design only, 2026-10-24. Desktop-source claims use frozen `d1f8a66`; native handoff
uses committed checkpoint `db96180772e59099cc96e0bab189ba2dc8825522`, its C header/
Rust bindings, `task-11-report.md` and `alive_session_v3_policy.md`. The interface
design/preflight, brief, Task 10 integration/fix review, shared-source investigation
and session contract are the other inputs. The native implementation exists but
independent Task 11 review is pending; this refinement authorizes no integration.
No architectural blocker was found. Accepted Task 11 review remains a prerequisite
to enabling v3; neither structural ABI capacity nor this design enables eight tracks.

## 1. Exact Saved Format And Identities

Keep separate strict v1/v2 input DTOs and add this one v3 wire shape. The notation
below is a schema, not a JSON example; every displayed member is required.

```text
SessionV3 = {
  format: "alive-session-v3", title: string, tempo: number,
  lengthBeats: number, loopEnabled: boolean, tracks: TrackV3[]
}
TrackV3 = {
  id: string, name: string, device: DeviceInstance, effects: DeviceInstance[],
  slots: [Clip|null, Clip|null, Clip|null, Clip|null],
  defaultClipId: string|null, gain: number, mute: boolean, solo: boolean
}
Clip = {
  id: string, name: string, lengthBeats: number,
  notes: NoteV3[], automation: Lane[]
}
NoteV3 = { id: string, beat: number, duration: number, pitch: integer, velocity: integer }
Lane = { instanceId: string, key: string, enabled: boolean, points: Point[] }
Point = { beat: number, value: number }
DeviceInstance = {
  instanceId: string, sourceSha256: string, bypassed: boolean,
  path: string, id: string, version: integer, parameters: { parameterKey: number, ... }
}
```

For v3, use camelCase, `deny_unknown_fields` throughout, exact format dispatch and
no missing-field inference. Reject duplicate object members, including parameter-
map keys; dispatch from the original text and deserialize that text, not a lossy
JSON `Value`. Preserve frozen v1/v2 decoding semantics, including their existing
duplicate-field rejection and map behavior; do not impose the new v3 duplicate-
member pass on legacy input. Format dispatch must not weaken either decoder.
Required nullable `defaultClipId` needs a deserializer that distinguishes missing
from explicit null; plain Serde `Option` does not enforce that requirement.
Deserialize `slots` as an array of length four. Reject non-finite/range-invalid
numbers, unsupported formats and oversized input before dependency work. Retain
the 1 MiB file limit, atomic same-directory save and dependency-overwrite guard.

Track/device IDs retain their v2 token grammar (1..64 safe printable ASCII bytes,
excluding slash, backslash and quote). Clip/note IDs use that grammar too; track,
device, clip and note identities are each unique across the whole session in their
respective namespace. Clip and track names are 1..64 UTF-8 bytes without controls;
session title is 1..128. IDs never derive from slot, prepared index or mutable name.
The default must name an occupied clip on its own track, or be null. Empty banks
are valid. Lane identity is `(clipId, instanceId, key)`; add no redundant lane ID.
The same parameter may have one lane in each clip, but duplicate targets within
one clip reject, including disabled duplicates. Point identity stays revision-scoped.

Keep tempo 30..240 and both global/clip lengths 1/64..256 quarter-note beats.
Clip length is independent of the global transport region; global wrap resets
active phases as specified by Task 11. Notes and points must fit their own clip,
including disabled lanes. Retain exact authored beat values and current pitch,
velocity, rounded-frame duration/overlap and binding-value validation. Across
all occupied slots on each track: <=128 notes, <=16 lane records and <=256 points.
Across the bank: <=1024 compiled events, <=2 tracks, <=6 devices and <=2 effects
per track. Four slots are fixed, including nulls. Native density/work limits apply
additionally; disabled lanes consume saved record/point bounds but emit no events.

Deterministic migration IDs use SHA-256 with these exact inputs:

```text
H(parts) = lowercase_hex(SHA256(concat(u32be(utf8_len(p)), utf8(p) for p in parts)))
clip ID = "clip-" + H(["alive-v2-v3-clip", track.id])[0:32]
note ID = "note-" + H(["alive-v2-v3-note", track.id, decimal(original_note_index)])[0:32]
```

Indexes are zero-based canonical decimal without leading zeros. Reject an ID
collision; never repair one by silently renaming. New clip/note creation uses a
Rust-owned fresh-ID helper with collision checks against the retained score and
history identities, not a renderer counter. Reuse the existing instance-ID
generation approach with separate clip/note prefixes; no new ID service is needed.
Undo/redo restores the same IDs. Duplicate generates a new clip ID and new IDs for
every copied note, deep-copies lanes/points, and preserves all device instance IDs,
parameter keys and authored numeric values. Duplicate is confined to its track.

## 2. Migration, Fallback And File Transactions

The frozen `persistence.rs::decode` already strictly migrates v1 into v2 with
`legacy-<first32 SHA256(track.id)>` instrument IDs and captured source hashes.
Preserve it as the first stage. For v2->v3, place each track's existing score in
slot 0, name it `Clip 1`, copy global length into its clip length, set that clip as
the saved default, and set the other three slots null. Keep title, track order/IDs,
every source hash/reference, device ID, parameter base, bypass, mixer, lane target,
note order, point order and beat value unchanged. No source refingerprint occurs
in v2->v3. Frame recompilation never rewrites saved beats.

Use a tagged internal `Document::{LegacyV2, ClipsV3}` and schedule variant in the
existing prepared/host ownership. This is explicit compatibility state in one
host, not a second engine or parallel live score. Factor common device/chain
preparation; keep the reviewed v2 event/admission path for the legacy variant.

Open v1/v2 first validates/prepares a playable v2 candidate with its existing
policy, including native v2 graph/value admission. Then prepare and prospectively
admit the v3 conversion using those same captured dependencies. If v3's stricter
density/work/profile/graph-family or frame checks refuse a
valid legacy candidate, install/retain that v2 candidate, report the exact reason,
and show `Legacy session - clip-bank conversion unavailable`. Do not drop notes,
move events, trim clips, increase limits or classify missing/changed sources as
conversion-only failures. Errors should have typed categories, not string matching.
In particular, map native `V3_GRAPH_REJECTED` (17) to conversion-unavailable when
that captured graph/config already passed v2 admission; keep its native diagnostic
and explain the v3 graph policy restriction without labeling the source corrupt.
Do not treat every GRAPH_REJECTED as recoverable: a failed common v2 admission or
source/hash/manifest check remains a normal failure. Keep the legacy candidate's
score, graphs and source identities intact; never remove unsupported nodes or
bindings, refingerprint, or relax policy to force conversion.
An invalid v2 or invalid explicit v3 file fails Open normally and preserves the
currently installed session/draft/history. Never downgrade an invalid v3 document.

Successful conversion is in memory and opens stopped; mark it dirty with an
`Upgraded in memory; Save writes session v3` notice. Opening never rewrites disk.
A fallback remains v2 on Save/Save As and on ordinary Apply; do not rerun conversion
implicitly during save. Keep its current single-score editing/playback available.
Provide one explicit stopped `Enable clip bank` retry after Apply/Discard; failure
retains the v2 mode and data. This small compatibility branch costs separate
serialization/compilation dispatch and UI capability checks, but avoids making a
previously playable score inaccessible when conservative v3 admission rejects it.

Save/Save As in v3 serialize saved defaults, never selected/active/pending clips or
runtime phases. Relocate every chain reference by instance ID; retain source
hashes, IDs, score and history. A successful path relocation advances draftRevision
without changing native preparation or editor bindings. Reopen installs defaults
at phase zero with transport stopped, independent of what was last playing.
Retain Task 10's Apply/Discard then Save/Discard/Cancel flow and its accepted inner
scope boundaries, including a later canceled/failed outer file action.

Refactor frozen `save_current`'s save-then-`read` path: a generic `read` must not
silently convert a saved legacy document or change runtime mode behind the host.
Return the exact successfully written/rebased document from save; use it to update
origin/path/dirty state only after atomic rename. Preparation remains before write.

## 3. Authoritative Draft And Focused History

Extend `history.rs::Projection` with each track's four slots and defaultClipId.
Clip IDs, names, lengths, notes/note IDs and automation are musical data. Retain
title/tempo/global length/loop/track names. Device identity/order/references,
bases/bypass/mixer, native state, selection and receipt state remain excluded.
Materialization uses current chain structure and live fields, with parameters by
instance ID and mixer by track ID. Keep 64 entries/8 MiB across undo and redo and
transactional admission/eviction. Failed/stale operations change nothing.

Create in an explicit empty destination slot: fresh ID, `Clip N` name using the
1-based slot, global length as its initial length, empty notes/lanes. Recommend
leaving defaultClipId unchanged; `Set Saved Default` explicitly changes it. Duplicate
requires an empty explicit destination and appends ` copy` to a bounded name.
Delete nulls only that slot; if it was the default, set defaultClipId=null in the
same transaction. Do not compact slots or choose a replacement default. Rename,
length and default changes each use the same history gate. Reject a length change
that truncates any note or point; never stretch, quantize or discard material.

Draft-only clips cannot launch. A modified clip that still exists in the prepared
bank may launch its prepared version, explicitly labeled as such. A draft deletion
does not stop an already playing prepared clip. Render that identity from prepared
metadata even when absent from the draft, and retain track Stop. Apply is stopped
and installs the new bank/defaults; editing, undo/redo and selection never install
DSP. Successful Apply/structural installation retains the frozen generation/editor
close boundary; do not promise editor survival across that existing boundary.
Editors remain open and bound to the same instances through create/duplicate/
delete drafts, undo/redo, selection, launch, track Stop, global Stop and Save As.
Removing/replacing a device deletes only its lanes across all four clips, with
the same stopped/no-draft structural ownership as v2.

Preserve the Task 10 fix in `alive.mjs::edit`: capture originating track ID, clip
ID, note ID and local scope token when intent is created. Never resolve a delayed
edit from current selection or an array index. A note update/deletion resolves
its saved ID in the originating clip at execution. Automation point operations
also carry the original list revision. Serialize musical intents and acquire each
predecessor's returned draftRevision; ordinary edit acceptance preserves that
queue's scope. Apply/Discard/history/file/structure/format boundaries invalidate
old queued intents. Gesture context includes generation, draftRevision, clip ID
and captured viewport/length; selection changes cancel an unfinished gesture.

## 4. Rust/Native Preparation And Runtime Identity

Reuse the committed `native.rs` `repr(C)` v3 POD bindings; do not add a parallel
binding module. Header and Rust field orders/constants match the proposed ABI
(ConfigV3=47232 bytes, StateV3=16592); retain its committed size/offset fixtures.
The POD `Default` implementations initialize numeric zero and output headers,
not a valid semantic configuration: explicitly set profile=V3_PROFILE_2X4,
work_policy=V3_WORK_POLICY_1, nonzero preparation_revision, every actual track's
empty slots/absent initial_clip to V3_NONE, and real ranges/counts/tempo/lengths.
Request unmasked actions remain NO_ACTION/slot=0; masked TRACK_STOP uses slot=NONE.
All reserved fields remain zero. Use existing output defaults for their exact
version/struct_bytes headers; convert successful outputs into dedicated UI DTOs.

Call `alive_session_limits_v3(V3_PROFILE_2X4, ...)` and require both success and
`features & V3_FEATURE_ADMITTED != 0`, expected profile/work policy and the declared
2/6/8 limits. Read work ceilings from that result, not copied Rust constants. The
checkpoint registers policy 1 and ADMITTED for 2x4; a successful 8x4 limits query
only describes disabled storage (`features=0`, zero work ceilings). The atomic
track-action bit is absent and multi-bit requests return FEATURE_DISABLED. Neither
capability lookup success nor 8/16/32 array sizes enable a larger desktop profile.
Task 11 review is a separate acceptance gate from the runtime feature bit.
Keep large config/state/scratch in bounded control-owned storage. Existing roots,
graphs, revisions and the Desktop mutex remain owners; there is no clip-owned DSP.

Policy 1 is narrower than general v2 graph acceptance. Its measured family allows
an instrument with exactly one PolyNote, at most one each SawVoice/FilterVoice/
AdsrVoice and no FilterStereo; effects have no PolyNote/voice kernels and at most
one FilterStereo. Supporting MultiplyVoice, MixVoice, AudioIn, LineSignal,
SignalMultiply, SignalDac, Gain, Join and Dac remain within 32 nodes/64 edges.
Only the saved demo's dormant MidiIn/Toggle/Metro/Counter/Chord/MakeNote controls
are allowed; bound parameters target only Gain, FilterVoice, AdsrVoice,
FilterStereo, LineSignal or PolyNote (at most sixteen/device). Snapshot and other
signal-to-control/autonomous sources, Send/Receive and bound timer/control
parameters are outside this family. Do not reimplement these graph checks as an
alternative validator: `validate_prepared_v3`/configure are authoritative.

The exact saved subtractive, Utility and stereo-lowpass graphs remain usable.
Hosted raw MIDI/editor events and hot editor-parameter ingress are refused; bound
base edits still use Alive's authenticated per-instance base command. Preserve
that route and editor lifetime rather than treating an open editor as permission
to trigger dormant demo controls. Native reset clears their activity even when
authored on or prearmed. Reuse captured source hashes; graph-policy rejection is
not a source-change recovery case.

Build immutable maps by track document order, occupied slot order and existing
instance-ID-sorted device order. Each occupied slot owns exactly one native clip;
zero-event clips still get an event range. Store native-index->persistent-ID maps
with the preparation. Emit contiguous per-clip event ranges sorted by frame,
termination/automation/note-on priority, track, device and target, retaining
authored order for exact ties. Use Task 11's
single positive round expression `round(beat * 48000 * 60 / tempo)` independently
for starts/ends/points/lengths, with no rounded-duration accumulation. A note
ending at the clip seam terminates by hard clear, not an out-of-range event.
On seek/restart/switch, native cursor reconstruction chases only parameter events
strictly before the landing phase. Events exactly at landing stay in their normal
event range and dispatch once; Rust must not pre-apply them, synthesize a duplicate
landing event or chase a note whose onset is already past. Enabled empty lanes use
base and still own their parameter while playing. Keep the legacy v2 compiler/
chase path separate; its existing inclusive landing behavior is not reinterpreted.

Clip masks derive from enabled lanes, including enabled empty lanes; device
`automated` flags are their union across stored clips. Count disabled lane records
in aggregate limits. `initial_clip` comes only from defaultClipId. Native config
starts stopped with those active identities at phase zero. Rust remains the only
owner of beats and saved score; native owns active phases, bar targets and time.
Saved defaults take effect on successful Apply/install and reopen. START resumes
the current cued/active clip phases under Task 11's existing end behavior; it does
not reselect defaultClipId or override a runtime cue on every press.

Allocate a fresh nonzero monotonic preparationRevision for every attempted native
installation/configuration, including restoration after an apply failure. Never
reuse an identity for a different config or resurrect old requests on rollback.
Increment root revisions independently as today. Keep desktop generation's
successful-install/editor boundary. If rollback restores the previous score with
a fresh preparationRevision, clear old runtime observations/requests while keeping
its score/draft/history/editor binding contract; report any failed restoration.
Counters never wrap silently. Prospective validation occurs before driver stop;
no new config/maps become authoritative until installation succeeds.

## 5. Narrow IPC, Receipts And State

Retain the current authenticated main-window edit/history/apply/discard/file/device
commands and live per-instance parameter/bypass controls. Add these narrow
capabilities (all argument objects deny unknown fields; enum variants are exact):

```text
alive_clip_edit(operation, generation, draftRevision) -> ClipEditResult
  operation = create {trackId, slot}
            | duplicate {trackId, clipId, destinationSlot}
            | delete {trackId, clipId}
            | rename {trackId, clipId, name}
            | length {trackId, clipId, lengthBeats}
            | default {trackId, clipId: string|null}
            | noteCreate {trackId, clipId, beat, duration, pitch, velocity}
ClipEditResult = {
  snapshot: Snapshot,
  affected: {trackId: string, slot: integer|null,
             clipId: string|null, noteId: string|null}
}
alive_clip_action(action, generation, preparationRevision) -> RequestResult
  action = launch {trackId, clipId} | stop {trackId}
alive_enable_clips(generation, draftRevision) -> Snapshot
```

The operation wire object is internally tagged by `kind`; note creation is exactly
`{kind:"noteCreate", trackId, clipId, beat, duration, pitch, velocity}`. All fields
are required, no ID is accepted, and numeric ranges are the existing note rules.
Rust resolves the current editable clip, validates the candidate, allocates a fresh
note ID and appends it in the same atomic history transaction. Piano double-click
and Add note send this operation; numeric defaults are supplied by their existing
UI behavior. The returned affected noteId identifies the committed new note.

Every clip operation shares Control's projection/history gate; none are a writable
draft bypass. `alive_edit` continues accepting whole-document musical intent, but
under its generation/revision lock validates IDs against the current editable
`draft ?? document`, not merely the prepared bank. Each submitted clip must already
occupy that track/slot; each submitted note ID must already belong to that clip;
duplicate, unknown, reassigned or resurrected IDs reject atomically. It can change
existing note values/order or delete notes, but cannot create or rename identities.
The whole-document gate also requires the exact current slot-ID layout and saved
default, so omission/null cannot bypass focused clip deletion. Clip membership/
default changes use the focused clip operations. Rust-created
candidate IDs enter only through those internal operations; authenticated history
restores historical IDs. Apply this ID guard only to v3; legacy editing retains its
existing shape. The renderer resolves an edit by captured note ID before updating
its whole-document copy, and Rust independently enforces ownership on receipt.

`affected` is result metadata, never stored selection: create/duplicate return the
new clip ID and destination slot with noteId=null; delete returns the vacated slot
and null clip/note IDs; length returns the unchanged clip/slot and noteId=null.
On success, create/duplicate select the new clip and clear note selection; deleting
the selected clip leaves its same empty slot selected and clears the note; length
preserves clip and note selection by ID. Deleting another clip preserves selection.
Note creation selects its returned note ID. First accept/reconcile the authoritative
snapshot, then apply these focus intents only if the renderer's captured local
selection token still matches; a delayed result never steals a newer selection.
Always clear/reconcile IDs absent from the accepted score. Rejection preserves
selection and score; these focus changes create no history/default/launch action.

Resolve launch clipId through the prepared map, then emit exactly one masked
TRACK_ACTIONS request and native slot. Do not trust a renderer's slot/index.
Runtime actions do not require draftRevision: pending score edits are independent
of the prepared bank. They authenticate preparationRevision and generation under
the mutex; serialized Rust assigns requestSerial. START/SEEK use request_v3 in v3
mode, with the same preparation authentication. Legacy mode keeps its old calls.
Global Stop uses stop_v3/legacy Stop directly and returns its Stop epoch; stale
renderer/preparation identity must not prevent a main-window Stop. Stop consumes
no receipt/queue reservation. Do not send scene/multiple-track masks.

`RequestResult` carries preparationRevision, requestSerial, immediate status and
reason, plus a contextual diagnostic only when the synchronous native call
provides one. An accepted QUEUED receipt is not an applied launch. Rust retains
at most 128 outstanding entries keyed by both identities, polls one coherent
state and reconciles the native bounded table. Native alone owns receipt-slot
reservation; Rust never frees/reuses a slot based on an old terminal publication.
QUEUE_FULL/RECEIPT_BUSY preserve the prior pending action; explicit retry gets a
fresh serial. No automatic retry storm or per-request unbounded history.

Immediate QUEUED stays visible until a matching publication consumes it. PENDING
shows the native target, APPLIED uses published active state, and REJECTED/
SUPERSEDED/CANCELED are distinct terminal notices. Compare both receipt keys,
never infer success from table slot or `last_consumed_request` alone. Poll/reconcile
before submitting more requests so terminal entries can be summarized before
reuse. If a terminal result was missed, report unavailable rather than invent it.
Preparation changes explicitly retire old outstanding observations. Stop epoch
acknowledgment can precede old-command cancellation receipts; neither may rearm.

With audio I/O stopped, no callback can consume a queued launch. Recommend an
actionable `Start Audio to cue or stop a track` refusal for new track actions;
Start transport may start the driver as today, and global Stop remains available.
Stopped *musical transport with audio running* accepts launch as a cue at phase
zero without starting transport. Per-track Stop while running is quantized to the
native boundary; global Stop is the immediate emergency action. Never derive a
target frame or playing phase from a browser timer.

Snapshot adds mode/capabilities, preparationRevision, prepared clip maps and a
bounded runtime projection: per-track active clip/phase/epoch, pending action/
clip/serial/target, outstanding requests and Stop epochs. Serialize new u64 native
identities/frames as canonical unsigned decimal strings (NO_FRAME/NONE become null)
to avoid JS integer precision loss. Keep desktop generation/draftRevision as JSON
numbers for compatibility, validated as nonnegative safe integers on both sides;
check every increment against 9007199254740991 before committing any change and
report exhaustion without wrapping. Do not migrate them piecemeal to strings.
New preparationRevision/requestSerial/native frames/epochs and snapshotSequence
use string-only DTO fields, rejecting numeric encodings. The renderer keeps these
raw strings for IPC, uses strict same-field equality for identity, and one validated
BigInt conversion helper for ordering/arithmetic. Never compare numeric desktop
generation to native generation/preparationRevision, coerce with Number, or order
decimal strings lexicographically. Snapshot acceptance compares numeric desktop
counters with numbers and string sequence values through that helper separately.
Use a monotonic control snapshot sequence to discard late same-revision poll
responses, since draftRevision alone does not order receipt/runtime changes.
Reject old preparation snapshots even when musical generation is unchanged after
rollback. Native failure to publish a coherent state is temporary, not an empty
receipt table or evidence that a reserved request completed.

## 6. Minimal Four-Slot Interface And Diagnostics

Preserve the established UI and selected track's instrument/effects panel. Add
exactly four slot cells per track, each with a selection control, name, saved
default marker and a separate Launch button. An empty selected slot offers Create;
occupied selection offers Rename, Duplicate into an empty slot, Delete, Length
and `Set Saved Default`, with `Used after Apply and when reopened` helper text.
Put one Stop button on each track. Add no scene row, cross-track duplicate,
automatic launch-on-select or new device controls.

Selection is local `{trackId, clipId|null, emptySlot?}` and never changes score,
default, receipt or transport. Show queued request, quantized pending and active
clip independently, using text as well as color. Only show `Playing` when native
playing and that track has an active clip; otherwise use `Cued` or `Stopped`.
Display the prepared name if a draft rename/delete differs. The piano roll and
automation editor use selected clip length; retain a separately labeled global
`Transport length` and explain global loop reset. Preserve the 0.25-beat gesture
grid, exact numeric fields, scoped keyboard undo, cancel behavior and accessible
controls. Draft-only Launch is disabled with `Apply while stopped to launch`.
Bank edits can be drafted during playback; Apply requires stopped transport.

Fetch prospective diagnostic_v3 immediately after its serialized failed native
call, before another validation overwrites it. Resolve its track/clip indices
using that candidate's maps, not installed or draft slot contents. Show resource,
observed bound, limit and each contributing named track/clip. `clip=NONE`,
`frame=NO_FRAME` or conservative=1 means a combination bound, not an observed
collision: say `Conservative combination envelope exceeds ...`. Saturated counts
are `at least ...`. Suggest fewer simultaneous notes/points, longer very short
loops or simpler chains as appropriate; do not move events automatically.

The committed v3 ABI does not publish full per-request callback diagnostics. For an
asynchronous WORK_LIMIT receipt, show its known request/track/clip, the reason and
that prior playback/pending state was retained; recommend letting audio advance
before explicit retry. Do not read the synchronous diagnostic as if it belonged
to that receipt or invent counts/contributors. Detailed contribution diagnostics
are available for prospective bank rejection. This is a presentation limitation,
not a need for another ABI or an architectural blocker.

## 7. Shared-Source Error And Verified Recovery

Replace frozen `prepare.rs`/`host.rs`'s unconditional `Use Replace to recover`
suffix with dependency-specific guidance. During off-callback dependency checking,
collect every reference to a canonical resolved source path (including symlink
aliases), hash the original source before bases and identify all mismatched
expected hashes with track/instance/path context. Retain per-instance graph/base
validation. Grouping must not mutate fingerprints or merge independent devices.
On a missing path, report the missing reference and path-restoration/explicit
replacement options; do not claim a matching backup exists.

For an externally changed shared file, explain that selected Replace updates only
that instance and full preparation still rejects stale siblings. In Replace
failure, use the candidate's stale references plus the original dependency group
to identify the blocking sibling(s), even if only one stale reference remains.
Offer these exact recovery steps:

1. Stop transport and resolve pending edits; preserve the changed `.ultra` at a
   new path before restoring anything.
2. Restore the original source matching the saved hash at the shared path. An
   original matching backup is required; absent one, there is no general supported
   recovery in the current desktop workflow.
3. Explicitly Replace each intended instance from the preserved changed copy,
   leaving other instances on the restored original, then Save.

Explain Replace's fresh instance identity/default bases/bypass and removal of
that instance's lanes across its clips. Copying alone, trying siblings in turn,
or removing stale effects one by one is not a general recovery. Keep ordinary
Open/Prepare/Save hashes strict; no implicit sibling refingerprint, batch repair
command or manual JSON editing recommendation is part of Task 12.

## 8. Focused Verification And Actual App Gate

Build on frozen session/history/desktop tests and the Task 10 DOM/Chromium scope
regressions. Do not requalify eight-track capacity here. Required new evidence:

- Strict v3 missing/null/unknown/duplicate fields, slot count, duplicate IDs,
  cross-track targets and aggregate disabled/enabled limits; deterministic v1->v2
  ->v3 migration; round-trip and Save As preserve IDs/beats/hashes/bases/mixer.
  A real v2-admitted/v3-refused fixture remains playable/saveable as v2 with all
  notes/lanes retained; explicit invalid v3 never falls back. Old file is unchanged
  until Save, and fallback Save does not trigger conversion. Include a captured
  v2-valid Toggle binding or Snapshot-to-Toggle graph rejected by policy 1 with
  typed GRAPH_REJECTED, alongside the density/work fallback fixture; retained v2
  playback/save must not be subjected to the v3 graph-family rules.
- Focused create/duplicate/delete/default/length undo/redo, independent copied
  scores, fresh IDs, aggregate-limit rejection and live merge across same-source
  instances; queue a clip/note edit behind selection/delete/Apply/file scope
  changes to prove it cannot modify a successor occupant or another clip.
- C/Rust layout checks and real native v3 preparation/defaults; single-track switch
  and Stop at exact sample boundaries, same-clip retrigger, unaffected-track
  continuity, independent lengths/phases, automation ownership/chase, stopped cue,
  global Stop under queue/receipt pressure, rejection preserving prior pending,
  receipt-slot reuse and rollback preparation identity. Use Task 11's reviewed
  native tests rather than reimplementing its scheduler in a JS mock.
- Shared-source changed-file regression with two independent instances: both
  selected replacement attempts reject without changing document/history/editors;
  errors identify the blocking siblings. Preserve changed copy + restore matching
  original, replace each explicitly and verify successive full preparations pass.
  Missing backup guidance and unchanged sibling hashes/values are separate checks.
- Build the actual release Alive binary/native library together, record commit
  and binary hashes, then exercise New/Open, create, duplicate, edit/undo, failed
  length, Apply, launch/quantized switch/track Stop, selected effect editor and
  live base/bypass, Save As, close/reopen stopped defaults, and changed-source
  failure/recovery. Confirm draft/launch/editor continuity before Apply and the
  existing editor-generation boundary after it. Record actual native receipt/state
  evidence and rendered output; browser fixtures alone do not establish this gate.

Task 11's timing evidence supports practical 256-frame-and-larger driver buffers
only on the measured Ryzen 9 5900HS host, not a universal deadline guarantee.
The final traced 64-frame combined maximum was 1232.879 us against 1333.333 us,
but an earlier run reached 3016.577 us; the later result does not erase that miss.
Logical 1/31-frame partition tests and ABI acceptance are not small-buffer driver
qualification. Run Task 12's release journey with a requested supported buffer
of at least 256 frames and record the existing driver's observed size separately;
Automatic/requested size alone does not prove the observed buffer. Keep this
practical limitation in qualification/UI guidance, preserve saved audio settings
and the usable v2 desktop, and do not silently change buffers or introduce an ABI
minimum. No new timing telemetry, eight-track admission or scenes belong here;
Task 13 remains the later capacity/telemetry gate.

For the native chooser harness, split the location-entry slash key press/release
and wait until the newly created entry is usable before releasing. The retained
`experiments/alive-piano-m3-20261024/gtk-diagnostic/README.md` attributes the observed
GTK assertion to synthetic KEY_RELEASE on an unrealized GtkFileChooserEntry;
the paced comparison completed both Add effect dialogs and Quit under
fatal-criticals. Keep all other warning output. This narrow harness correction
does not establish warning-free operation, physical-input behavior or Task 12
qualification; run the actual journey with its resulting binaries.

Update `apps/alive/SESSION_CONTRACT.md` and README to match the admitted v3 profile,
fallback, default-versus-runtime behavior and shared-source recovery after the
implementation is accepted. Task 13's larger admission remains blocked on the
completed Task 12 release journey; scene actions and the final soak remain later
tasks. This report runs no builds/tests/GUI/audio/external services and changes
only this design document.
