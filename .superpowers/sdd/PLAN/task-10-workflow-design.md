# M3 Clip Workflow Design And Gated Slices

Status: design proposal only, 2026-10-24. No implementation or capacity increase
is authorized by this document alone. It extends the user specification and
`PLAN.md` M3 after Tasks 7-9 pass. Task 7's interface remains frozen.

**Goal:** Make one complete editable clip/instrument/effect workflow usable,
then add independent quantized clip switching, then admit eight tracks only
after measuring the actual native workload. Scenes are the final optional slice.

**Architecture:** Keep the single Rust host owner, shared native evaluator and
native audio clock. Prepare a bounded immutable bank of clip schedules while
stopped; the callback changes cursors and bounded state, never graphs. Musical
editing remains a staged draft with focused undo and explicit stopped Apply.

**Basis:** Inspect native code at `6d16ec3`, not Task 7's concurrently edited
runtime. Read current `apps/alive/SESSION_CONTRACT.md`, session Rust modules,
`alive-model.mjs`, `alive.mjs`, existing tests, and
`.superpowers/sdd/PLAN/task-7-interface-design.md`. The latter specifies future
M2 semantics absent from the inspected HEAD. Reconcile this proposal with the
completed M2 code before implementation; do not code against presumed changes.

## Decisions And Tradeoffs

1. Recommend a stopped-prepared clip bank with native launch commands. A browser
   timer switching entire prepared sessions would lose sample timing, reset
   unrelated tracks and reinstall roots. A live mutable score/graph publisher
   adds ownership and reclamation complexity that this milestone does not need.
2. Keep four fixed slots per track. Empty slots contain no device and consume no
   root. Every clip on a track shares that track's instrument/effect instances.
   A duplicate copies notes/automation, never DSP objects or parameter bases.
3. Clip loops and clip changes hard-clear that track's complete chain. This
   sacrifices seamless release tails across clips but gives deterministic note
   termination without extra voices/roots or hidden parallel tail rendering.
4. Keep the existing session length/loop controls as a global playback region.
   Individual clips repeat within it. At the global loop seam, active clips
   restart at phase zero together. This preserves the old single-clip musical
   result and gives seek/loop an explicit meaning without an arrangement editor.
5. Preserve imported off-grid beat values. The first editor has one fixed
   **1/16-note grid = 1/4 quarter-note beat = 0.25 beat**, in fixed 4/4. It is not
   a 1/16-beat grid (0.0625 beat). No swing, adaptive grid or time signatures.

`experiments/alive-workflow-reference-20261024/README.md` supplies observed
create/select/move/resize/velocity/delete/undo and queued launch/stop workflows.
Its screenshots do not establish exact sample boundaries or audio continuity.
The policies below are Alive decisions tested in its own runtime. Do not rerun
Wine/REA or infer Alive's DSP ownership from Max's documented preview copies.

## Bounds That Remain In Force

| Resource | Initial clip profile | Expansion gate |
| --- | --- | --- |
| Tracks / devices | 2 / 6 | Measured 8 / 16; never 8 plus 9 effects |
| Effects per track | 2 | Keep 2; also enforce global 16-root pool |
| Clip slots per track | 4 | Keep 4 |
| Parameters per device | 16 | Keep 16 |
| Notes per track | 128 across all its stored clips | Keep aggregate limit |
| Automation per track | 16 lane records, 256 points across all clips | Keep aggregate limits |
| Compiled events | 1024 across the entire stored clip bank | Keep 1024 |
| Event dispatch | 32 per frame; 64 in any half-open 1024-frame window | Keep both |
| Control queue | 64 commands per consumed snapshot | Keep 64 plus independent Stop |
| Native render partitions | 1..1024 frames at 48 kHz | Keep both |
| Tempo / length | 30..240 BPM; 1/64..256 beats; <=24576000 frames | Keep both |
| Saved file | 1 MiB | Keep 1 MiB |

The aggregate note/lane/point policy is deliberately conservative: duplication
can exhaust a track budget even if only one clip plays. Report the resource and
track rather than silently dropping notes, disabling lanes or increasing caps.
The UI creates quarter-beat-aligned material, but short legacy clips remain
valid if they pass admission. Tiny loops require repeated-seam workload tests.

## Slice A: Piano Roll And Focused Draft Undo

Deliver this on completed session-v2 before introducing slots or a new ABI.
Use the existing selected track's `notes` and `automation`; its single clip uses
the existing session length. The current SVG is display-only and the note table
already edits staged data. Add a small geometry/gesture module rather than
turning `alive.mjs` into a second state owner.

- Double-click empty grid: add and select pitch 0..127, velocity 100, duration
  0.25 beat, if it fits. Select existing note with one click; selection does not
  play, edit, dirty the document or launch anything.
- Drag body: snapped time displacement and whole-semitone pitch displacement;
  preserve duration. For an imported off-grid note, snap the displacement in
  0.25-beat steps and retain its original fractional offset.
- Drag right edge: change duration in 0.25-beat steps from its original duration,
  preserving start/pitch; require at least one frame and keep end in the clip.
  New notes have minimum duration 0.25 beat. Do not silently quantize imports.
- Delete/Backspace removes selected notes when the piano roll has focus.
  Escape/pointercancel restores the gesture's starting state. A velocity control
  changes 1..127; drag commits once on release, not once per pixel.
- Keep numeric note fields for precise/off-grid edits and keyboard access.
  Arrow keys move by one grid step or semitone; Shift plus horizontal arrow
  resizes. Reject same-pitch overlaps using prepared frame intervals, including
  collisions introduced by rounding at the selected tempo.
- Shortening the clip/global length rejects if it would truncate notes or
  automation. Explain which event must move/delete; do not silently trim it.

Use pointer capture and viewBox coordinates, including horizontal scroll and
zoom-independent hit testing. Notes have separate body/right-edge hit regions;
the selected note gets a visible outline and associated velocity marker. A
stable viewport pitch range during a gesture prevents notes moving under the
pointer when an extreme note is selected. Commit only a complete gesture.

The Rust `Control` owns musical history, because native file/Quit dialogs can
apply/discard drafts. Add `session/history.rs` with bounded before/after musical
snapshots: at most 64 entries and 8 MiB combined serialized musical payload,
evicting oldest entries. Allocation and eviction occur under the existing
control mutex, never on audio. History excludes live bases, bypass, mixer,
runtime, device graph/identity and UI selection. Merge live fields by M2 stable
instance ID when restoring history, as when applying a draft.

Proposed desktop commands:

```text
alive_edit(document, label, generation, draftRevision) -> Snapshot
alive_history(direction: "undo" | "redo", generation, draftRevision) -> Snapshot
```

Validate shape, musical ranges and the current instance/chain identity before
retaining an edit; reuse M2's draft gate. Increment `draftRevision` on accepted
edit/undo/redo/discard. Reject stale revisions without changing draft/history.
The renderer may preview a drag locally but admits only one final transaction;
on failure it restores the authoritative snapshot and shows the reason. Route
existing note-table edits through the same history path. Do not leave an old
`alive_draft` command capable of silently bypassing the new history policy.

Undo/redo affects pending musical edits only. Clear this focused history after
successful Apply, Discard, New/Open or structural device operations; failed
Apply/Open preserves it. Label the actions "Undo pending edit" / "Redo pending
edit", and explain that Apply begins a new history scope. This bounded behavior
does not claim an undo stack for live knob gestures or device replacement.
Do not change Ultra editor history. Apply retains the M2 stopped preparation
and editor-generation behavior; live schedule replacement is out of scope.

## Slice B: Saved Clip Bank And Identity

Introduce strict `alive-session-v3` JSON only with the new native clip runtime.
Session-v1 and session-v2 parsers and C layouts remain frozen. Require a profile
string `native-clips-2x4-v1`; a later measured implementation may additionally
support `native-clips-8x4-v1`. Unknown format/profile rejects explicitly before
resource/dependency access. A profile describes admission, not device schema.

Concrete wire model changes (retain M2 `DeviceInstance` and `Lane` unchanged):

```rust
struct SessionV3 {
    format: String, profile: String, title: String, tempo: f64,
    length_beats: f64, loop_enabled: bool, tracks: Vec<TrackV3>,
}
struct TrackV3 {
    id: String, name: String, device: DeviceInstance,
    effects: Vec<DeviceInstance>, gain: f64, mute: bool, solo: bool,
    slots: [Option<Clip>; 4], default_clip_id: Option<String>,
}
struct Clip {
    id: String, name: String, length_beats: f64,
    notes: Vec<ClipNote>, automation: Vec<Lane>,
}
struct ClipNote {
    id: String, beat: f64, duration: f64, pitch: u32, velocity: u32,
}
```

All wire structs use camelCase and `deny_unknown_fields`. Slot array length is
exactly four. IDs follow the M2 safe-ASCII/uniqueness policy. A clip ID belongs
to one track and a note ID to one clip; validate global uniqueness. Runtime
indices never appear as saved identity. `defaultClipId` must name a present
clip on that track or be null. New clips start with four beats, empty notes and
lanes. Each clip loops; one-shot clips are not part of this slice.

Migration is explicit and deterministic: run v1 through the tested M2 v2
migration; then move each v2 track's notes/lanes into slot zero, with the old
session length as its clip length and set its default clip. Generate namespaced
IDs from SHA-256 of old track ID plus object kind and original note index;
check all collisions. Preserve note ordering, beat doubles, automation values,
enabled state, instance IDs, source hashes, bases, mixer and global loop policy.
Slots one through three are null. An admitted single-clip v2 score must render
identically after conversion; if new conservative launch admission rejects a
previously valid file, keep the original v2 document runnable and report the
conversion limit. Never silently change its score or falsely label it v3.

Duplication uses the next empty slot, or rejects when full. It creates fresh
clip/note IDs, copies notes/lanes/length and retains lane instance targets.
Creating/duplicating/deleting clips and editing length are staged musical edits
with the same history scope. A slot's content is not admitted to native until
stopped Apply. Draft-only clips cannot be launched. Removing the default clip
sets its default to null in the same operation. Clip selection is UI state;
running/queued clip, playhead and launch phase are runtime state, never saved.
Save/reopen starts stopped with the saved defaults, not a captured performance.

## Native API And Ownership

Add a separate v3 C ABI in `native/alive_session.h`; do not enlarge v2 arrays,
reuse reserved fields, change v1/v2 symbols or reinterpret their state sizes.
The first v3 structures have two tracks, six devices and eight clips. The later
eight-track/sixteen-device/thirty-two-clip wire structs are a separate v4 ABI,
added only after the capacity gate. Both can normalize into one internal engine;
there must never be another audio owner or a second clock.

Reuse `AliveSessionDeviceV2`, `AliveSessionEventV2` and chain records where their
layout suffices. In v3 an event's `frame` is relative to its owning clip, and
its track/device fields still undergo strict ownership checks. The separate
config type makes this semantic change unambiguous.

```text
AliveSessionClipV3:
  u32 track, event_begin, event_count, reserved
  u64 length_frames
  u32 owned_masks[6]  // 16 parameter bits per device; other bits reject

AliveSessionConfigV3:
  version, struct_bytes, profile, counts, reserved fields
  u64 schedule_revision, length_frames
  loop_enabled, quantization_count
  u64 quantization_frames[65]
  TrackV3 tracks[2]   // chain/mixer + four clip indices + initial clip index
  DeviceV2 devices[6]
  ClipV3 clips[8]
  EventV2 events[1024]

alive_session_validate_v3(config)
alive_session_validate_prepared_v3(config, graphs, count)
alive_session_configure_v3(config)
alive_session_launch_v3(schedule_revision, track, slot, action)
alive_session_state_v3(state)
```

Use explicit no-clip constant `UINT32_MAX`; action is Launch or TrackStop.
TrackStop ignores slot only if it equals that sentinel; reject ambiguous inputs.
An empty launch slot rejects, never implicitly stops. Pass a monotonically
increasing preparation revision, distinct from root revisions, transport epochs
and desktop generation. Resolve IDs to indices on the serialized host thread.
Launch validates the current revision and slots before enqueue; no patch/file
read, compile, configure, root assignment or graph destroy occurs at launch.

The exact C declarations and Rust `repr(C)` mirrors need a small ABI review when
M2 has landed: all headers/counts/ranges/unused fields and masks validated before
indexing; nonoverlapping clip event ranges cover all events exactly once; every
clip belongs to its listed track; every graph/root belongs to exactly one chain.
Keep C++ size/offset and Rust layout tests for *all* ABI versions. V1/v2 reads
project coherent snapshots of their original two-track fields; new fields are
available only through the correctly sized new snapshot.

Native runtime adds fixed per-track `active_clip`, `phase`, `next_event`,
`track_epoch`, `pending_action`, `pending_clip`, `pending_absolute_frame` and
`pending_valid`. Snapshot publishes these with `schedule_revision` and accepted
request serials, alongside existing mixer/meters/device ownership. Selected clip
is deliberately absent. Existing root document/revision handles still identify
device bases/bypass; launches do not increment root revisions or reopen editors.

## Clock, Launch, Seek And End Semantics

The callback remains the sole frame clock. `absolute_frame` increases during
audio callbacks even when transport is stopped. Global musical `position` and
each active track's `phase` advance only while transport plays. A frame's events
apply before its signal evaluation; intervals are half-open. Compute every beat
position independently as `round(beat * 48000 * 60 / tempo)` during preparation.
Do not add rounded beat durations repeatedly or use a browser/audio wall clock.

Fixed launch quantum is one 4/4 bar, four beats. Preparation supplies sorted
distinct boundaries `round(4*k*frames_per_beat)` inside the global playback
region, including zero. The global loop seam also starts a new grid even when
the region ends in a partial bar. Native validates the boundary table, and Rust
tests it against tempo/beat conversion. No per-clip quantization selector yet.

At callback entry B, drain the bounded command snapshot. A running launch/track
stop targets the first grid boundary at or after the current position, including
the current sample if exactly on a boundary. If the global loop seam arrives
first, target its zero boundary. A nonlooping global end cancels a request for
which no boundary remains. Store the resulting absolute sample; never estimate
it from the last UI poll. Commands arriving after the snapshot wait until the
next callback; this is UI command latency, not lost scheduled sample accuracy.

Each track has at most one pending action. A later accepted action replaces it;
same-clip launch explicitly retriggers at the next eligible boundary. Repeated
same-track commands in one drained snapshot coalesce to the last action before
state mutation. TrackStop is quantized and uses ordinary queue capacity. Global
Stop retains its independent out-of-band mailbox, cancels every pending action
and invalidates older start/seek/launch commands. A full queue rejects a new
launch without changing the already accepted pending action.

While stopped, Launch chooses that track's active clip at phase zero immediately
without starting transport; TrackStop clears it. Initial configuration chooses
saved defaults. Start resumes active choices/phases at the current global
position and chases automation; it does not resurrect notes that started before
that phase. Global Stop preserves active choices and phase/position for Start,
but clears sound, ownership and pending actions. Transport end clears sound and
pending actions; the next Start returns global position and active phases to
zero. Neither action rewrites saved defaults.

Seek preserves active clip choices, cancels all pending actions, resets every
chain and sets each active phase to `target_position % clip_length_frames`.
This deliberately reanchors clips to the global grid, discarding prior launch
offsets. Chase automation at that phase; do not chase held notes. It works while
playing or stopped, using the existing command-boundary behavior. No event from
before the seek may rearm a note. Seek is within the prepared global region.

At an ordinary clip seam, reset only that track, set phase zero, chase, and
execute phase-zero events once. At the global loop seam reset all active tracks
to phase zero. Pending launches targeted to that seam still execute there. At
a sample with multiple causes, resolve the final clip choice first and reset
each affected track only once: global Stop/nonloop end wins; otherwise global
wrap/seek is applied, pending launch/track stop selects the final clip, then a
remaining natural clip wrap applies. No outgoing-clip event fires at the switch
sample. Termination precedes ownership/chase, then scheduled automation, then
note-on. Merge event heads across tracks in that priority order, with stable
track/device/target tie breaking; do not process a complete track's note-ons
ahead of another track's same-frame note-offs.

## Per-Track Sound And Automation Policy

Clip launch, track stop and natural clip loop hard-clear notes, sustain,
instrument memory and *all* effect state on the affected track, including warm
bypassed effects. Ordinary note-off retains release and ringing until such a
discontinuity. The other tracks' root state, phase and pending requests remain
untouched. Mute/solo continue processing all active roots and apply once at each
chain endpoint. A stopped track produces no endpoint output; its DSP graph
stays installed. No extra roots are created for overlap or tails.

Automation belongs to a clip, targeting M2 `(instance_id, parameter_key)`.
Device base/bypass belong to the track's persistent device instance. A clip's
enabled lane owns its target while that clip plays; a disabled lane owns none.
Use precomputed per-clip masks, not a config-wide union of automated parameters
as the runtime ownership decision. Empty enabled lanes own their parameter but
use base until a point exists. Duplicate lane targets within a clip reject.

At a switch, release the outgoing masks, restore current bases, establish the
incoming masks, and chase only incoming points at/before incoming phase (zero
for launch). Incoming lanes without a prior point use current base. A parameter
automated only by the outgoing clip must visibly return to Base at the switch
sample. Live base edits under automation update the base but do not override
the effective value. Track/global Stop restores all affected bases and clears
ownership. Seek/loop retains base values but re-chases the appropriate clip.
Use a single scan of the incoming clip's bounded events plus bounded parameter
work, not a full-bank scan for every parameter. Device removal explicitly
removes its lanes from every clip in the same stopped structural operation;
reorder preserves them. Source/parameter changes use M2's existing admission.

## Admission For Every Combination And Switch

Checking only default clips or testing each clip independently is unsound.
Two individually legal clips on different tracks can overload when aligned;
outgoing notes just before a switch plus incoming notes just after can violate
the rolling window although each steady loop passes. Admission must account
for every selectable clip, arbitrary relative phases and all permitted switches.

Use a conservative, deterministic off-callback proof initially:

1. Validate every clip and compile all events into the shared 1024-event bank.
   For each clip, count periodic events in any integer window of length
   `w=1..1024`, including as many repeated seams as the window spans. Arithmetic
   repetition is required for a 188-frame legacy loop. Let `E_t(w)` be the
   maximum over all clips on track t and all cyclic window phases; stopped is
   the zero case. This permits all relative phases without enumerating 4^8
   global combinations or an enormous least-common-multiple timeline.
2. Bound `K(w)`, the maximum quantization boundaries in any w-frame window of
   the prepared global timeline, including repeated global seams and a partial
   last bar. It is not always one: a short session or partial bar can create
   adjacent/repeated boundaries. Count the finite boundary table periodically.
3. Bound any track's switched window by splitting w into at most `K(w)+1`
   nonempty integer segments and maximizing the sum of `E_t(segment_length)`.
   A small off-callback dynamic program over lengths 1..1024 supplies this
   conservative splice envelope. Cache identical K cases; saturate counts above
   64 rather than constructing unbounded timelines. For w=1 the bound is simply
   `E_t(1)`: old/new events do not both dispatch on the transition sample.
4. Require the sum across tracks of the frame bounds <=32 and of the 1024-frame
   splice bounds <=64. Count all clips even muted, unselected or not default.
   Report offending track/clip density and the retained limits. Conservative
   false rejection is acceptable initially; silent acceptance is not. A more
   exact proof can replace this algorithm later without changing the limits.

The splice proof covers clip switches. Repeated manual seek/restart can create
extra discontinuities independent of that grid, an existing control-path risk.
Add a defensive fixed 1024-frame dispatch ledger indexed by the native absolute
clock, with running total and per-frame counts, to the new clip runtime. Before
dispatching a frame's complete batch, check both limits; if violated, hard-stop
and report a density fault before dispatching any part of the batch. Global
Stop still works, and the prepared bank remains intact. Do not reset the ledger
on Stop/seek/loop, or repeated controls could evade it. This guard is not a
substitute for prospective all-combination admission. Keep legacy ABI regression
results unchanged; review whether the defensive invariant can safely cover
legacy mode as a separately justified correction.

Reset, chase, parameter/base/bypass, meters and queued control work are additional
bounded costs, not free because they are absent from the event array. Measure
their maxima separately. Short empty loops can have zero events and expensive
resets. Before admitting the eight-track profile, either demonstrate its full
short-loop/control workload fits or add an explicit measured work admission
limit with a distinct error/profile policy. Never increase event, command or
root caps to hide a failed benchmark.

## Minimal Interface

Retain charcoal, amber and Liberation Sans, transport/audio/sidebar placement
and selected-track device chain. Tracks show four small named clip slots with
separate body/select and launch controls plus one track-stop button. Empty slots
offer Create on double-click; selection and launch have distinct accessible
names. Show selected outline, queued indicator and playing indicator separately;
polling updates them from native state without inferring play from selection.

The lower pane shows selected clip name, loop length, fixed "1/16 note" label,
piano roll and velocity. Keep transport, mixer and chain visible at practical
desktop sizes; narrow windows can scroll the track grid and collapse optional
parameter detail without hiding Stop or pending-draft status. A draft badge
states "Stop and Apply to hear edits". Launching an existing prepared clip while
it has a changed draft plays its prepared content and states that clearly;
draft-only slots disable Launch. Show queued-to-stop distinctly from stopped.
Keyboard commands are scoped to this pane and never intercept editor/text-input
undo or Delete. No new graphics assets, fonts, arrangement or browser synthesizer.

## Implementable Slices And Gates

### A. Interactive Single Clip And Pending-Edit History

Files: add `apps/ultra/ui/alive-piano.mjs` and its unit tests; add
`apps/ultra/src-tauri/src/session/history.rs`; modify `alive-model.mjs`,
`alive.mjs`, `alive.html`, `alive.css`, `session/desktop.rs` and command registry.
Extend `alive-model.test.mjs`, `alive-dom.test.mjs` and Rust desktop tests.

- [ ] Write gesture/coordinate, cancellation, overlap and history tests first.
- [ ] Implement one-transaction gestures and native-authoritative undo/redo.
- [ ] Prove live base/mixer updates survive undo and failed Apply retains edits.
- [ ] Run actual release Alive: create, move, resize, velocity, delete, undo,
      Stop/Apply/play, save/reopen. Preserve all M2 editor/chain behavior.

Gate: one usable musical editing workflow; no clip ABI/storage changes yet.

### B. Two-Track Clip Bank And Quantized Individual Launch

Files: add `session/clips.rs` for wire migration/preparation and
`session/admission.rs` for cyclic/splice proofs; modify `session/mod.rs`,
`persistence.rs`, `prepare.rs`, `native.rs`, `host.rs`, `desktop.rs`, `probe.rs`;
extend native `alive_session.h/.hpp`, `backend.cpp` only where required for the
existing owner; add `tests/alive_session_v3_test.cpp` and integrate its runner
in `tests/ci/check-native.sh`. Add slot controls to the existing Alive UI and
update `apps/alive/SESSION_CONTRACT.md` / examples with the admitted profile.

- [ ] Freeze exact v3 ABI/size tests and failing transition/admission fixtures.
- [ ] Implement native bank/cursors/track reset and quantized command state.
- [ ] Implement strict migration, duplicate/length editing/history and UI slots.
- [ ] Render actual saved M2 instruments/effects under all clip combinations;
      compare native samples/state with a scalar reference and arbitrary splits.
- [ ] Perform native UI create/duplicate/switch/stop/base/edit-editor/save/reopen
      journey, retaining screenshots and software audio evidence.

Gate: two tracks/six devices and four slots; complete independent launch/stop,
safe all-bank admission and v1/v2 regressions. No eight-track claim yet.

### C. Measure Then Admit Eight Tracks Within Sixteen Roots

Files: extend the v3 native test/benchmark fixture and saved-device probe first;
retain measurements in a new dated `experiments/alive-m3-capacity-*` directory.
Only after evidence, add separately sized v4 native/Rust config/state records
and the known `native-clips-8x4-v1` saved profile; adapt UI row count and tests.

- [ ] Record machine/CPU, OS, build revision/compiler/release flags, output
      backend/device, 48 kHz, requested and actual buffer sizes and partitioning.
- [ ] Benchmark 2/6, then 4/8, then 8/16 using real shared Faust graphs. Include
      eight instruments plus eight effects, and uneven two-effect chains, all
      active/muted/bypassed, maximum allowed voices/parameters and dense events.
- [ ] Exercise aligned clip switches, shortest admitted loops, global wraps,
      64-command bursts including seek/base/bypass, chase and hard reset of all
      sixteen roots. Instrument no callback alloc/free/blocking lock, compile,
      destroy, filesystem access or UI dependency. Include snapshot publication.
- [ ] Retain callback duration distribution (p50/p95/p99/p99.9/max), deadline
      ratio, CPU/PSS, process/worker counts, command/density rejection counters
      and audio backend errors. Separate instrumented guard builds from release
      timing builds, and offline wall-time from actual CPAL callback timing.
- [ ] For tested desktop buffers require zero callback invariant failures and
      zero observed deadline misses; use <=50% p99.9 deadline utilization as
      the initial headroom target and report max explicitly. Arbitrary 1-frame
      partitions establish correctness; they do not promise a physical 1-frame
      hardware buffer. Treat an unobservable xrun counter as unavailable.
- [ ] Only then admit the new profile, test its finite maximum storage/stack
      footprint and perform the specified 30-minute release playback/edit/
      editor-cycle soak. If measurements fail, keep the working 2/6 profile and
      report the bottleneck; optimize measured work before retrying.

The benchmark is evidence for the exercised graphs/hardware, not proof that
every legal arbitrary Ultra graph meets a deadline. State that limit. Preserve
graph/node bounds and measure high-cost admitted graphs separately; root count
alone is not a CPU budget. No raised capacity based only on idle CPU averages.

### D. Scenes Only After B And C Are Stable

A scene is one existing slot row across tracks, not a saved arrangement. Add a
single native command carrying the row and a complete validated action mask;
empty slots mean TrackStop. Resolve one target boundary for the entire scene,
enqueue one command and replace all affected pending actions atomically. Queue
failure changes none. Reuse each track's established termination/automation
policy and the admission proof for arbitrary simultaneous switches. Add no
scene-only audio engine, timeline or duplicated clips. Test scene versus
equivalent simultaneous individual launches and queue-saturation atomicity.

Gate: keep this slice absent if individual launch or capacity/soak evidence has
unresolved failures. The first three slices remain usable without it.

## Required Deterministic Test Matrix

- V1/v2 C sizes/offsets and saved migration remain unchanged. Unknown fields,
  profiles, duplicate IDs, invalid defaults, event ranges/masks, cross-track
  targets, 17 roots, ninth track and fifth slot reject before dependency access
  or fixed-array indexing. Failed conversion/Open/Apply leaves running state.
- Compile note/automation offsets at 0, 1, 31, 63, 64, 127, 1023 and 1024.
  Test same-frame note-off/automation/note-on priority and a note ending exactly
  at clip end. Test tempo rounding at nonintegral frames per beat and independent
  conversion of starts/ends/grid boundaries.
- Scalar render versus partitions `[1]`, `[31]`, `[63]`, `[64]`, `[127]`,
  `[1024]`, mixed `[1,31,63,64,127,1024]`, and seeded arbitrary 1..1024 lengths.
  Put switch/stop/loop boundaries at each listed offset within partitions;
  compare command-free audio exactly and command runs with commands injected
  at the same native entry frame. Changing command observation boundaries is
  allowed to change UI-command latency, not scheduled event offsets.
- Launch just before/on/after a bar boundary; arrivals before/after snapshot;
  last pending request wins; same-clip retrigger; empty slot rejects; stopped
  selection does not play; nonloop end cancels; partial-bar seam and 188-frame
  session loops. Note-on at incoming phase zero executes exactly once.
- Track B audio/state remains sample-identical while A launches/stops/loops;
  shared source files still have independent device state. Test active and
  bypassed filter tails hard-clear on A while B's tail persists. Mixer endpoint
  and warm bypass retain M2 behavior between discontinuities.
- Switch from automated A to unautomated B, both automated with different first
  points, enabled empty lane, disabled lane, edit base while A owns parameter,
  seek before/after first point, loop, Stop/Start and reordered effects. Reopen
  and duplicate retain stable instance targets without duplicating roots.
- At 32/33 same-frame and 64/65 rolling events, reject only over-limit input.
  Include two clips individually legal but jointly overloaded, unsafe nondefault
  combinations, mutually prime clip lengths, short-loop repeats, and outgoing
  end/incoming start densities that only fail across a switch. Cross-check the
  conservative envelope against a brute-force tiny-state oracle. Exercise the
  runtime ledger with repeated seek/restart; no partial chord may dispatch.
- Fill all 64 command slots; new launch rejects while accepted pending action
  remains, and independent Stop clears sound/pending work. Reproduce the existing
  Stop-snapshot race test with launch actions; stale preparation revisions and
  pre-Stop commands never rearm voices. Stress reset/chase under callback guards.
- Piano gestures through scrolling/resizing, cancellation, numeric inputs,
  keyboard focus, selected versus queued versus playing, rejected edits, history
  eviction, redo invalidation and native dialog Apply/Discard/Cancel. Verify a
  duplicate's length/notes are independent and live bases are never rolled back.

## Blocking Questions Resolved By Evidence, Not Guesses

The remaining implementation gates are the completed M2 ABI/reset semantics,
whether whole-runtime reset cost admits short-loop multi-track work, and measured
capacity of the maximum root/graph profile. If reset is too expensive, propose
a reviewed bounded sound-state reset with tests before raising track count;
do not substitute Faust initialization in the callback. If conservative splice
admission rejects a useful score, retain the working lower profile and improve
the proof, not the limits. No physical MIDI, recording, arrangement, unrestricted
routing, source hot-swap or DSP engine migration is part of this design.
