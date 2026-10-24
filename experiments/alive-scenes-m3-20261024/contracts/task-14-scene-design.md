# Task 14 Atomic Scene Design

Design only, 2026-10-24. Source observations below are frozen at
`79aec9d45b94e51ac76b95c5b3d5a514119b1483`, read through `git show`; line numbers
refer to that tree. Inputs are `task-14-brief.md`, `task-11-interface-design.md`
and `task-12-integration-design.md`. This document does not enable scenes or
eight tracks. Completed Task 12 integration and its actual release workflow,
then measured and accepted Task 13 capacity, remain prerequisites. The native
stopped same-callback supersession correction is concurrent work: its accepted
winner-tracking semantics/tests are an additional prerequisite, not inspected or
modified here. Reconcile this design against that accepted correction before
implementation.

## Scope And Source Anchors

A scene is a runtime action on one of the four prepared slot positions across
all configured tracks. Occupied slots launch; empty slots stop their tracks.
There is one request, one queue entry, one serial, one receipt and one native
target. No scene object, saved scene name, arrangement, alternate engine, score
schema, root owner or clock is added. The existing alive-session-v3 format and
saved defaults remain sufficient.

Relevant frozen source:

- `apps/ultra/src-tauri/native/alive_session.h:171`: existing feature bits;
  `:203`, `:209`, `:236`, `:242`: request, receipt masks, per-track pending state
  and coherent state. RequestV3 remains 112 bytes, ReceiptV3 80, StateV3 16592.
- `apps/ultra/src-tauri/native/alive_session_clips.hpp:37`, `:64`: bounded
  candidate and whole-receipt `finish`; `:615`: ingress; `:683`: candidate
  completion; `:804`: callback reducer; `:898`: single-bit `ctz` action path.
- `apps/ultra/src-tauri/native/alive_session_clips.hpp:478`, `:960`, `:1053`:
  pending cancellation, whole-frame resolution/guard, due receipt completion.
  The latter two receipt sites currently finish an entire request for one track.
- `apps/ultra/src-tauri/native/alive_session_clips.hpp:200`, `:711`, `:756`:
  summed prepared envelopes, first-candidate preview and optional admission.
  `apps/ultra/src-tauri/native/alive_session_clip_policy.hpp:20` advertises only
  admitted 2x4, and `alive_session_v3_policy.md` qualifies that measured policy.
- `apps/ultra/src-tauri/src/session/desktop.rs:9`, `:121`, `:201`, `:487`:
  serialized Control owner, snapshots, transport IPC and registration.
  `apps/ultra/ui/alive.mjs:7`, `:13`, `:54`, `:95`, `:241`:
  local selection, invocation, refresh, selection handlers and rendering.
  These desktop files are still v2 in the frozen tree; extend Task 12's accepted
  implementation, not this v2 shape. The exact v3 identity/DTO contract is in
  Task 12 sections 4-6.

## One Ingress Transaction

Retain TRACK_ACTIONS and its existing action array. Native multi-bit callers may
use any valid nonempty subset; the desktop scene operation always uses
`(1u << prepared.track_count) - 1`. Multi-bit acceptance requires the configured
profile's ADMITTED and ATOMIC_TRACK_ACTIONS bits. Replace the unconditional
multi-bit rejection at `request_v3:645` with that feature check. Do not infer
permission from array capacity or limits-query success. Single-bit requests
retain their existing contract.

Validate the complete mask and every masked/unmasked action before reserving or
enqueueing anything. LAUNCH still rejects an empty slot; TRACK_STOP requires
slot=NONE; unmasked entries remain NO_ACTION/slot=0. It is the desktop scene
mapper that deliberately translates an empty prepared slot to TRACK_STOP.
Do not silently turn an invalid native LAUNCH into a stop.

One invalid member, invalid/stale identity, full queue or busy receipt cell
rejects the whole incoming request. No member modifies active/pending state or
an older receipt. Ingress consumes a fresh serial at the same existing point
after valid preparation/header, including ordinary admission refusal. Output
header failure remains a no-write/no-enqueue failure. Queue-full does not leave
a reservation. QUEUED has unknown observation/target frames and means only that
one command was accepted; it never claims all members have played.

No loop of native calls, compensating stops or retry-on-partial-success protocol
is acceptable. A scene with all empty slots is a valid quantized all-track stop;
it does not become global Stop. A stopped all-empty scene removes every cue.

## Bounded Reduction And Member Receipts

Keep the existing candidate transaction, command snapshot limit of 64 and
per-track runtime pending slots. Compute a scene target once from candidate
transport state at that command's position in queue order. Then iterate its
masked tracks in ascending index order. Running members all get the same target
from the existing rounded native bar/seam table; stopped members cue at the
current absolute frame. A nonlooping position with no future boundary cancels
the entire request END_CANCELED before replacing any older pending choices.
Later member supersession never moves the surviving scene members' target.

Replace member uses of `finish` with an internal mask transition helper. Keep
whole-request initialization and mask-zero START/SEEK completion separate.
For a track-action receipt after observation:

```text
pending | applied | superseded | canceled | rejected == track_mask
all five masks are pairwise disjoint
status = PENDING if pending != 0
otherwise status = the sole terminal kind, or MIXED if several kinds are present
```

The helper moves only explicitly supplied unresolved member bits, preserving
all prior terminal bits. Within unpublished candidate scratch, a provisional
stopped-cue APPLIED bit is also replaceable by SUPERSEDED or REJECTED until
admission commits it. Never rewrite a previously published APPLIED member.
QUEUED retains its existing immediate-receipt exception: the callback has not
yet populated per-member pending/terminal outcomes.

Pin these reducer changes:

1. Replace `ctz` with one bounded masked loop and initialize one scene receipt.
   Preserve the accepted stopped-winner correction's per-track provenance so
   multiple same-callback stopped cues/stops report only the final surviving
   cue/stop as applied. Generalize its provenance to member bits; do not rely
   exclusively on `pending_serial`, which stopped cues do not retain.
2. Give candidate completion an explicit member mask. Updating a new receipt
   must not finish its other tracks. Old pending disposition remains staged per
   track (`old_status`/`old_error` or the correction's equivalent); commit all
   affected bits to the matching old receipt cumulatively, even when multiple
   tracks share its serial. The current first matching old-track return is
   insufficient.
3. Keep all callback mutations in fixed candidate/runtime storage. Existing
   bounded receipt scans can remain initially, but document and measure their
   multi-member worst case. Do not introduce per-request allocation or a new
   callback container. If measurement requires direct indexing, a fixed
   candidate-index table is an internal optimization with the same semantics.
4. Convert cancel_pending and due completion to one-bit transitions with both
   serial and preparation identity checks. Global cancellation may visit one
   scene receipt several times; each visit preserves earlier outcomes.
5. Aggregate receipt status/error only from its resulting masks/outcomes.
   Publish all final receipts and tracks through the existing coherent state;
   no reader sees an intermediate scene member commit.

The single ABI `error` cannot encode one reason per member. Proposed deterministic
summary rule: OK when no member has a failure/cancellation/supersession reason;
otherwise keep the highest-priority reason encountered for this receipt:
RUNTIME_INVARIANT, STOP_CANCELED, WORK_LIMIT, END_CANCELED, REPLACED_REQUEST.
Immediate whole-request validation errors and stale-preparation rejection keep
their exact existing reason. This priority applies only to callback combinations
of the listed reasons; it does not rank unrelated ingress errors. A pending
receipt can consequently have error=REPLACED_REQUEST while other members remain
pending. An applied+superseded receipt ends MIXED/REPLACED_REQUEST; a
superseded+canceled receipt after Stop ends MIXED/STOP_CANCELED. The UI describes
member outcomes from masks and treats error as a request-level summary, never
as an asserted per-track reason. Exact per-member reasons are unavailable in
this ABI. Ratify this summary rule during review before implementation.

## Optional Refusal, Due Application And Races

Quantized-only scenes require no arbitrary-phase horizon check. Their scheduled
work was already admitted with the prepared bank. A scene combined in one
callback with an effective START/SEEK or stopped work requiring a real clear
participates in the existing one combined optional candidate check. Compute
the final union of affected tracks and charge each actual coalesced reset/chase
once. Do not check/admit each scene member separately.

On optional rejection, retain every pre-callback musical/pending choice and its
receipt, including old scenes that the tentative candidate would supersede or
cancel. Preserve accepted base/bypass/mixer changes and unconditional Stop.
For new candidate requests, retain already reduced superseded/canceled bits;
turn every surviving provisional APPLIED/PENDING group member into
REJECTED/WORK_LIMIT. A scene partly superseded in the candidate can therefore
finish MIXED with superseded and rejected masks, but zero applied members.
This is the Task 11 conservative batch rule, not partial execution. Apply the
same surviving-request rule to mask-zero dependent START/SEEK receipts. Checking
only overall status APPLIED/PENDING, as the frozen whole-receipt refusal loop
does, is insufficient once terminal mixed member results exist.

At a target sample, retain the existing aggregate frame path: resolve global
wrap/seek, due actions and natural wraps; gather the whole resulting event/work
batch; validate scheduled invariants; then clear/chase and dispatch with the
existing termination/automation/note-on order. Each affected track clears once.
All surviving scene members apply in this one frame, together with any other
due individual requests. Never spend credits track by track, postpone a member,
or execute some members before discovering another does not fit.

The frozen implementation speculatively updates active clips/phases before its
aggregate guard and commits APPLIED receipts only after it passes. Preserve the
guarantee that a failed guard performs emergency silence and cancels all due
members without any partial note/automation dispatch or APPLIED masks. This
design does not add rollback of the frozen fault path's speculative active
identities; the transport is faulted/stopped and active identity alone is not
proof of application. If product requirements demand original active identities
after invariant failure, that is a separately reviewed change, not an implicit
scene rollback promise.

Required race semantics:

- A later valid individual or overlapping scene supersedes only overlapping
  unresolved members after successful candidate admission. Nonoverlapping bits
  keep their original target. Invalid/full/busy/new optional-refused work leaves
  previously published pending members intact.
- SEEK cancels pending scene bits with REPLACED_REQUEST; accepted seek reanchors
  active phases and chases only strict-prefix automation. SEEK before a scene
  determines its common target; scene before SEEK is canceled where still pending.
  START and SEEK still may share one final admitted discontinuity.
- A stopped scene changes cues/phases without starting transport or chasing held
  notes. Scene then START starts the accepted cues; START then scene obeys running
  quantization at the resulting position. Same-callback scene/individual/START/
  SEEK permutations must preserve the accepted correction's queue-order semantics.
  In particular a cue that remains the active clip while a later running action
  waits for a future boundary must not be mislabeled as an unused cue.
- Stop preserves acquired-head-before-epoch ordering. Every pre-Stop scene is
  canceled in full or in its remaining members; old-epoch commands outside the
  acquired head cannot execute and may publish cancellation on a later drain.
  Fresh post-Stop work remains valid, subject to optional admission. Stop needs
  no queue/receipt cell and cannot fail because either is full.
- Natural end cancels remaining members; global loop seam applies due scene
  members at zero, with no outgoing clip event at that sample. Same-clip scene
  launches retrigger. Empty-slot stops release ownership and clear that track's
  instrument and active/bypassed effects using the existing helpers.

## Receipt Lifetime And Desktop Operation

Keep the native table at 128 slots and reservation rule serial%128. A partially
superseded scene is still busy while any member is pending. Reuse is allowed
only after a coherent matching terminal publication, including MIXED; the
producer reservation also prevents an old terminal publication from freeing a
new unobserved scene. Do not reserve one cell per member. Task 12's bounded
outstanding map and dual identity comparison remain authoritative; a missed
terminal publication is unavailable, not inferred from active clips.

Add exactly one main-window IPC operation, proposed name `alive_launch_scene`,
with `{generation, preparationRevision, slot}`. Slot is an integer 0..3 naming
the fixed scene row; native serial and target are never renderer arguments.
Use the Task 12 canonical decimal-string preparation identity and existing safe
numeric generation. Under Control's existing mutex:

1. Check main-window origin, matching generation/preparation, v3 profile and both
   enabled capability bits, valid row and audio I/O running.
2. Read only the immutable prepared slot map. Build a single native request whose
   mask includes all configured tracks: occupied -> LAUNCH at that prepared slot;
   empty -> TRACK_STOP/NONE. Do not read selected track, draft bank or saved default
   to decide members. A draft-only clip is not a prepared launch target.
3. Reconcile outstanding observations as in Task 12, allocate one fresh serial,
   invoke request_v3 once, and return its existing RequestResult plus the same
   bounded runtime projection. Native remains reservation owner.

Row index is intentionally this operation's runtime identity, authenticated by
preparationRevision; it does not become a saved clip identity. A queued click
captures generation, preparation and slot at the gesture, so Apply/reopen cannot
silently retarget it to a successor preparation. Draft edits alone do not require
draftRevision or disable the action. Display the prepared row members when draft
occupancy/names differ. With audio off, refuse with `Start Audio to launch a scene`;
do not silently start the driver or transport. Global Stop remains available.

Extend Task 12's four-slot bank with one clearly labeled `Launch scene 1` through
`Launch scene 4` control per shared slot position. Keep the accepted bank layout,
typography and selected-track chain/editor panel. Include short persistent help:
`Launches this prepared row. Empty slots stop their tracks.` Stopped-transport
feedback says `Cued`, not `Playing`. All-empty rows remain actionable. These are
explicit buttons separate from selection; activation does not select a clip,
track, note or device. Preserve keyboard focus and local selection on delayed
responses as well as successful/rejected actions.

Render one scene request with per-track queued/pending/applied/superseded/canceled/
rejected outcomes and the common native target when known. A partial supersession
must not make the entire row look canceled or applied. Text supplements color.
Use native playing/active state for current playback, never persistent `scene
active` state inferred from an old receipt: later individual launches can diverge
the row. Async WORK_LIMIT has no detailed per-request native diagnostic; follow
Task 12's truthful summary and explicit retry guidance without borrowing a stale
synchronous diagnostic. No browser target/phase timer or automatic retry is added.

Scene requests do not change document, dirty flag, history, defaults, device
instance IDs, roots, revisions, editors or audio settings. Save/reopen restores
saved defaults, not last launched scenes. All live base/bypass/mixer and device
ownership rules continue through their existing routes.

## Envelope Coverage And Measurement Gate

The initial algorithm already covers simultaneous scene DSP work. It maximizes
over each track's selectable clips and sums track envelopes; the segment bound
allows every track to splice at every permitted native boundary. A scene merely
chooses several of those already allowed splices together. The work envelope
adds each track's reset/chase charge at forced boundaries, including empty-bank
stops. Partial supersession leaves a subset of the same permitted actions.
There is no new event, extra seam, cross-track graph, or need to enumerate 4^8
combinations. A quantized scene must not be routinely refused for optional
credits; aggregate runtime guards remain fault detectors, not a scene admission
lottery. Eight simultaneous triads plus two automation points per track remain
40 events and must reject the unchanged 32/frame bound.

This proof is not timing qualification. Frozen policy 1 measured two tracks and
single-member commands; it cannot justify enabling scenes on eight tracks.
Task 13 must establish the admitted eight-track graph/work/driver profile.
Task 14 then measures the changed unavoidable work, together with that profile:

- 64 commands can now contain 512 member visits. Repeated overlapping scenes
  maximize candidate receipt transitions, same-callback stopped winner updates,
  old pending deltas and rejection work. A naive retained receipt scan costs up
  to 64 comparisons per member, not merely 64 total commands. Record the exact
  loop bound of the final implementation and its failed-admission path.
- Eight-track first-candidate preview cannot inherit the policy document's
  two-track 56-read ceiling. A simple safe bound with <=1024 stored events is
  `11*T + 32 + T`, hence <=128 reads at T=8: binary probes, matching frame records
  and terminating reads. Task 13 may establish a tighter bound. Scene-only
  quantized requests do not add a preview; scene+START/SEEK still does at most
  one combined preview/check. Trace the final bound on accepted and rejected
  candidates; early optional-budget refusals perform no new preview/chase.
- Due receipt and Stop/end cancellation updates visit at most eight pending
  tracks but may repeatedly aggregate the same receipt. Measure those paths,
  fixed candidate clearing/copying, 16592-byte coherent publication, and terminal
  slot reuse under pressure. Publication size itself does not grow.
- Combine the above with admitted signal/scheduled/optional maxima, up to 64
  accepted live edits and the independent two-full-session emergency reserve.
  A rejection cannot erase the fixed cost already spent reducing or publishing
  a scene. Preserve allocation/lock guards and actual graph fixtures.

Do not guess new ceilings, raise event limits, or enable the feature to obtain
an apparently successful fixture. A newly measured work-policy value fits the
existing ABI if needed; document its compatibility and profile mapping. Keep
ADMITTED and ATOMIC_TRACK_ACTIONS disabled for any unqualified profile/policy.
The final feature-bit change must follow tests and measurement, not precede
them in a shipped build. If both 2x4 and 8x4 will expose scenes, qualify both;
do not automatically advertise the bit globally. Logical partitions 1/31 are
not driver deadline evidence. Preserve Task 13's recorded supported buffers,
observed driver sizes and timing limitations.

## Concrete Verification And Remaining Decisions

Extend the existing tests rather than constructing a second scheduler oracle:

1. **Ingress and capabilities:** ABI size/offset fixtures unchanged; disabled
   multi-bit request returns FEATURE_DISABLED; invalid last member/empty LAUNCH/
   unmasked data/out-of-range bit rejects everything. Fill 64 queue entries and
   reject one scene, then test one free queue slot accepts a full scene. Assert
   no earlier pending/receipt changes and one reservation/serial only.
2. **Sample equivalence:** extend `alive_session_v3_test.cpp` transitions and
   ownership tests with scene versus simultaneous individual requests, all
   enqueued before the same observed callback at identical prepared/ledger
   state. Compare rendered samples, active phases, ownership, effective bases
   and track epochs; normalize serial/receipt representation. Cover mixed
   launch/stop, same-clip retrigger, empty-event clips, bypassed effects, mute/
   solo, different clip periods, rounded bar, short/global seams and natural
   wraps. Partition 1/31/64/256/1024 with requests at matching native frames.
3. **Partial masks:** scene ABC, later B, then target -> scene PENDING with A/C
   pending and B superseded, finally MIXED with A/C applied. Overlapping ABC/BCD
   scenes retain A and D correctly. Repeat all track permutations, repeated
   same-serial old-receipt updates and full supersession. Assert mask partition
   after every coherent observation, common target and summary-error rule.
4. **Stopped reduction and transport:** extend the accepted stopped-winner test
   to scenes, scene/individual overlaps and launch/stop mixtures, then START
   before/after scenes and SEEK before/after scenes. Ensure a discarded cue
   never reports applied and an active cue needed before a future running
   launch retains the correct outcome. Stopped transport remains silent; START
   chases automation only, without held-note resurrection.
5. **Optional all-or-none refusal:** extend
   `optional_rejection_and_reduction` and `dense_future_and_scheduled_actions`.
   Exhaust optional allowance; submit seek+scene with live edits and earlier
   pending scene. No new member applies, old pending receipt/target survives,
   and live edits persist. Include new superseded+rejected member masks and
   expensive-check refusal versus cheap refusal; verify traced charges and
   absolute ledgers across Stop/restart.
6. **Stop/end/fault races:** extend `queue_stop`, `epoch_race` and
   `invariant_fault_cancels_due_launch`. Cover Stop before observation, after
   observation, at target, queue full, receipt busy, acquired-head race and
   fresh post-Stop scene/START. Pre-Stop members never rearm. Inject aggregate
   guard failure before due dispatch: no member APPLIED, no partial audio/event
   dispatch, one latched fault and bounded emergency cleanup. Include prior
   superseded members plus canceled remainder, and nonloop END_CANCELED.
7. **Receipt reuse/publication:** extend `receipts_and_identity`. Colliding
   serial+128 remains busy while any scene member is pending; MIXED terminal
   permits reuse; old terminal state cannot release a fresh queued reservation.
   Exercise failed coherent reads, missed terminal observations, reprepare and
   Stop acknowledgment preceding a later cancellation publication.
8. **Admission and timing:** retain envelope oracle and useful legal eight-track
   fixtures from Task 13; assert 40-event refusal. Add all-member scene stress
   to `alive_session_v3_measure.cpp`, record exact reducer/preview bounds,
   allocation/lock checks and combined distributions on the admitted host/
   actual driver buffers. Compare signal output and observed work to already
   admitted simultaneous individual actions without moving fixture events.
9. **Desktop and actual release:** Rust checks exactly one request with all
   prepared tracks; audio-off, stale preparation, hosted-editor origin and
   unsupported profile refuse before native mutation. DOM tests cover selection
   independence, mixed outcomes, prepared-versus-draft labels, all-empty rows,
   delayed results and string identities. Run the actual Alive binary/native
   pair through New/Open, clip edits/undo/Apply, row launch, partial override,
   track/global Stop, selected device editor/base/bypass, Save As/reopen defaults
   and existing source-recovery workflow. Record binary/source identities,
   actual native receipt/state and rendered output. Browser mocks alone do not
   complete this gate; the final app soak remains Task 15.

Remaining decisions are narrow: ratify the scalar mixed-error priority, reconcile
stopped provenance with the accepted native correction, and choose the enabled
profile/policy set from Task 13/14 measurements. There is no identified need for
a new ABI, scene schema or scheduling engine. Implementation remains blocked
on the prerequisite gates and measured fixed overhead. This design task ran no
builds, tests, GUI, audio, services or benchmarks and modified only this file.
