# M3 Architecture Reconciliation

Status: recommendation only, 2026-10-24. No source, ABI, PLAN, capacity, Git or PR
change is made by this report. Native baseline is reviewed Task 7 `920bdc6`.
Task 8 Rust/persistence integration is executing separately and must pass before
the M3 implementation consumes its contracts. Existing working tree changes to
Task 8 tests are outside this report.

Sources: the attached user specification, `task-10-workflow-design.md`, reviewed
`task-7-interface-design.md`, `task-7-report.md`, `task-7-review.md`, native
`alive_session.h/.hpp`, `alive_session_v2_test.cpp`, current session contract,
and retained Alive application/session measurements. The current public session
contract still describes v1; it is not evidence that Task 8 integration is done.
No new benchmark or test was run for this read-only architecture review.

## Decisions And Requirement Status

The binding goal is a usable music workflow: piano-roll editing and focused
undo, duplication/loop length, individual quantized launch/stop, eight bounded
tracks and multiple slots, then scenes. Preserve device instance/parameter IDs,
existing undo, native-owned timing, the shared device runtime, and callback
bounds. The user explicitly requires measurement before raising capacity and a
30-minute actual release-app playback/edit/editor-cycle soak. The user does not
specify four slots, one-bar quantization, ABI version numbers, a particular
percentile headroom threshold, or a universal hardware buffer size.

| Area | Recommended decision | Status / reason |
| --- | --- | --- |
| First deliverable | Piano roll and focused pending-edit history on completed session-v2 | Required workflow first; no clip ABI prerequisite |
| Clip storage | Four slots per track; one active clip per track; one prepared bank | Conservative product choice; avoids duplicate DSP instances |
| New native interface | One v3 clip ABI with fixed 8-track / 16-device / 32-clip storage | Recommendation; do not add a redundant v4 merely for larger arrays |
| Initial admission | Only the 2-track / 6-device profile enabled initially | Storage capacity is not admitted or measured audio capacity |
| Eight-track gate | Enable the 8-track / 16-device profile only after actual-kernel measurements | Binding staged expansion; no ninth effect with eight instruments |
| Existing ABI | Freeze v1/v2 structs, symbols, semantics and admission | Reviewed contract; new clip meaning must not reinterpret v2 frames |
| Score limits | Retain 1024 stored events and 32/frame, 64/1024-frame dispatch | Existing bounds; multiple slots alone do not justify an increase |
| Discontinuities | Track-local hard-clear; explicit reset/chase work admission | Existing tail policy extended locally; events alone do not bound work |
| Controls | Coalesce no-audio intermediate states; admit repeated discontinuity work separately | Recommendation for v3; Stop remains unconditional |
| Performance | Report distribution/deadlines; treat 50% p99.9 as an advisory headroom target | No such numeric user acceptance requirement or supporting measurement |
| Scenes | Final slice using one atomic command and existing track switching | User-requested order; defer on failure, do not redefine as permanently optional |

Keep two effects per track, sixteen parameters/device, 128 notes and sixteen
lane records/256 points per track across all stored clips, 1 MiB saved files,
48 kHz, 1..1024-frame native partitions, existing tempo/length bounds, and the
64-command snapshot. These are simultaneous limits: eight times a per-track
maximum is not a promise that the resulting bank fits the global event limit.
For scale, 32 clips with eight notes each use 512 note events before automation;
the retained bank supports a useful small workflow. Count compiled events,
including generated terminations, before reporting capacity. If real example
work proves storage insufficient, review that measured requirement separately;
do not raise dispatch density or roots as a side effect of adding slots.

The retained dispatch cap is musically restrictive at eight tracks: eight
simultaneous triads use 24 note-ons, leaving eight scheduled events at that frame.
Two automation points per track would take that batch to 40 and must reject;
simultaneous old note-offs can exceed it sooner. The example/capacity fixtures
must deliberately fit these limits, while an otherwise identical over-limit
fixture proves rejection. Use genuinely contrasting parts and authored timing,
not an undisclosed timing shift inserted by the compiler. Explain, for example,
"Frame 48000 has 40 events; limit 32 (24 note-ons, 16 automation points across
tracks ...). Spread events or simplify this boundary." Rolling/splice errors
identify the 1024-frame window and contributing clips, or explicitly state that
the conservative combination bound exceeded 64. A commonplace rejected score
is evidence for a separate measured density proposal, not permission to enlarge
the cap silently.

## Exact Interface And Ownership Contracts

Append v3 C records and entry points, reusing immutable `AliveSessionDeviceV2`
and `AliveSessionEventV2` layouts where applicable. New config/state records
use exact `version=3` and `struct_bytes`, fixed tracks[8], devices[16], clips[32],
events[1024], four slot indices/track and sixteen device masks/clip. Profile
identifiers constrain admitted counts, independent of array size. Initially
reject the eight-track profile before graph/dependency access. Later enabling
it must require no struct-size change. Device/event/track graph validation
continues through shared helpers; do not implement another evaluator.

Native profile numbers and saved `native-clips-2x4-v1` /
`native-clips-8x4-v1` strings must map explicitly. Unknown formats/profiles,
flags, reserved fields and out-of-range counts reject before indexing. Every
clip event range is nonoverlapping and all ranges cover the bank exactly;
every event belongs to its clip's track/device; every device belongs to exactly
one chain/root. Unused active-record fields/masks have a documented zero or
sentinel value. Layout/offset tests cover C++ and Rust on supported targets;
measure publication and stack storage at full structural capacity too.

Use `UINT32_MAX` for no clip. Launch of an empty slot rejects. TrackStop requires
the sentinel slot. Commands carry monotonically increasing preparation revision
and request serial; saved identity is never a runtime index. A schedule revision
is distinct from root revision, desktop generation and Stop epoch. Expose queued,
applied, superseded, canceled and rejected outcomes rather than equating enqueue
success with an executed switch. Snapshot state has actual/queued clip and phase;
UI selection is separate. Live controls still use M2 instance ID -> root handle
resolution. Launch never prepares/compiles/installs a graph or changes its root
revision, device instance, editor binding or audio owner.

Retain original v1/v2 operation and sample equivalence when configured through
those versions. Legacy state getters can project a representable new state,
but must return failure without writing when the active configuration exceeds
their two-track/six-device capacities. Never publish a count larger than the
caller's arrays, silently truncate a full session, or use v1/v2 snapshots to
drive the new UI. This is new-version coexistence, not an old-layout expansion.

Use strict session-v3 storage and deterministic v1 -> v2 -> v3 migration as
proposed. Preserve source hashes, stable instance IDs/parameter keys, exact beat
values and order, bases/bypass/mixer, and default clips. Duplication creates
clip/note IDs only; it shares the track's existing device instances. Reorder
preserves automation targets; explicit removal removes that instance's lanes
from every clip. If stricter v3 admission rejects a valid v2 score, keep its v2
document and runtime usable and explain the conversion failure. Keep the current
two-track packaged example runnable throughout; make an expanded example only
after the admitted profile exists.

## Scheduling And Admission

Use one native absolute clock, per-track active clip/phase/cursor, and a bounded
merge of at most eight event heads. Resolve discontinuities before dispatch;
apply termination, automation, then note-on globally with stable tie-breaking.
No outgoing event fires at a switch sample; phase-zero incoming events fire
once. At one sample, combine global wrap/seek, launch/stop and natural wrap into
one final clip choice and at most one clear/chase per affected track.

The proposed one-bar quantization and fixed 4/4, quarter-beat editor grid are
reasonable defaults. Independently round beat positions, including grid
boundaries and note ends, to frames. Seek reanchors active phases to
`position % clip_length`; it cancels queued actions and chases automation but
never held notes. A global loop reanchors phases to zero. A partial final bar
and every short global seam are launch boundaries. Global Stop preserves active
choices/position, clears sound and ownership, and cancels older queued work.
Stop followed by a newly accepted Start must still work: the preserved Stop
epoch race contract rejects pre-Stop actions, not all fresh post-Stop actions.

### Scheduled Event Envelope

The proposal's conservative cyclic/splice proof is sound if **global resets are
counted as splices even when no clip changes**, with these precise definitions:

1. For every nonempty selectable clip c, length Lc, let Ec(w) be the maximum
   event count in any integer half-open cyclic interval of w frames. Compute
   whole repetitions arithmetically plus the maximum residual circular window;
   include duplicates at one frame. Empty clips have zero events, not zero cost.
   `Et(w) = max_c Ec(w)` for track t, including stopped=0, for w=1..1024.
2. Let K(w) conservatively bound quantization/global-seam positions in any such
   window of the global timeline. Use the actual rounded boundary table and
   arithmetical repetition for looping sessions. Partial bars can put boundaries
   close together. A nonlooping end clears/stops rather than splicing new events.
3. Let `Ft(w,k)` be the maximum sum of Et over at most min(w,k+1) positive
   integer segment lengths summing to w. Compute with an off-callback bounded
   dynamic program. This overapproximates every clip selection, relative phase,
   natural loop and allowed quantized switch without enumerating 4^8 sessions
   or a least-common-multiple period. Cache/saturate at 65 for dispatch proof.
4. Require `sum_t Et(1) <= 32` and `sum_t Ft(1024,K(1024)) <= 64`.
   At w=1 there is no old/new double batch. Count muted, bypassed, nondefault and
   currently unselected clips. Emit a specific resource/track/clip witness or
   conservative-envelope explanation when rejecting.

Do this on the complete candidate bank before replacing the prepared session.
Admission must be enforced by native validation too, or by an independently
checked bounded native certificate; trusting only Rust would leave the public
C configure path unbounded. The simplest first implementation uses one native
authoritative validator and Rust compilation/preflight, sharing fixtures instead
of maintaining two divergent proofs. Preparation work/storage must themselves
be bounded by fixed bank/window/table limits; do not materialize full timelines.

### Reset, Chase And Control Work

Do not postpone this issue until eight tracks. The shortest existing musical
loop is about 188 frames at 240 BPM; an empty clip still repeatedly clears its
instrument and effects. Current Task 7 `begin()` also executes a full clear/chase
for each seek in its 64-command snapshot. A 1024-event cap proves neither cost.

Derive a second, understandable work envelope alongside event admission:

- For track t, record root count Dt, bound Pt on parameter applications, and Ht
  on scanned clip events. Retain graph/node/kernel bounds; root count alone is
  not a bound on the cost of a particular root reset or parameter propagation.
- Put a reset/chase cost marker at phase zero in each clip's periodic work
  sequence, even for an empty clip. Apply the same cyclic/segment envelope to
  these markers. Add one extra full track transition cost per splice as a safe
  overestimate; it covers arbitrary incoming phase relaxation and TrackStop.
  Global seams count as splices. Natural wraps inside each segment are already
  periodic markers. Count a nonlooping end clear separately.
- A reset marker charges Dt root clears, bounded parameter writes (including
  base restoration/ownership transition), and bounded chase/cursor work. A
  simple safe initial charge scans at most Ht events plus parameter candidates
  once per affected track, never Ht per parameter. A tighter phase-zero lookup
  may be precomputed if measurements justify it; it is not a graph rewrite.
- Track separate maxima for event dispatch, root clears, event scans, parameter
  applications and queued control work. Full-bank scans/masks, endpoint mixing
  and coherent publication belong in callback measurements too. Arithmetic
  counts are portable work bounds; benchmark duration is hardware evidence.

Keep these categories disjoint for admission: automation chase/base restoration
and hard-clear at an end/seam are work charges, not invented scheduled events.
An actual stored automation event at the landing frame counts once in the
dispatch batch. Restore/chase the prefix strictly before that frame, then apply
its events once, or document and charge any equivalent duplicate parameter
application separately. A note ending exactly at a hard-clear seam need not
produce a second fabricated note-off outside the clip; prove its termination
through the clear contract. This avoids false density rejection without hiding
real callback work.

In v3, reduce the bounded command snapshot to its final no-audio intermediate
state before DSP side effects. Simulate command order, Stop epochs, current
position/playing and last per-track pending action; coalesce resulting clears
to at most one per affected track at callback entry. Last base/bypass values can
be applied to the final ownership state; retain accepted-base persistence and
rejection semantics. Never reorder a post-Stop Start into pre-Stop work. Keep
legacy mode's behavior unchanged and test the new reducer against a scalar
state model, including interleaved base/seek/start/Stop actions.

Coalescing alone is insufficient: 1-frame native partitions could request a
seek/restart every frame. Use a fixed absolute-frame rolling ledger for dispatch
and non-emergency discontinuity work. Ledger time advances while stopped and
is not reset by Stop, seek, wrap or restart. Resetting/clearing it is only safe
after stopped-I/O reconfiguration, with fresh preparation identity.

Before a control-caused discontinuity, reserve its conservative work and check
the new trajectory against retained recent dispatch/work history, including
future windows that still overlap that history. Checking only its first batch
would miss a dense suffix reached shortly after the seek. Precompute bounded
future event/work envelopes off callback; a fixed bounded lookup/scan over the
1024-frame horizon can conservatively validate these overlap windows, with its
own cost included in measurement. Reject/rate-limit the action with an explicit
runtime result if it would exceed the admitted control budget;
leave prior musical state/pending request intact. Do not silently delay a seek
or individual launch to another sample. Before dispatch, test the entire batch
against 32/frame and 64/1024; an invariant failure hard-stops before any partial
chord. All ledger arrays/storage and access work are fixed. This defense handles
manual seeks/restarts outside the scheduled splice proof; it does not replace
prospective admission of every ordinary clip combination.

Reserve bounded emergency cleanup outside the optional-control allowance.
Global Stop and due note termination must never wait for budget or queue room.
Stop immediately cancels pending work and clears every affected chain once;
repeated Stop while already silent/cleared is idempotent. Hard-stop fault cleanup
uses the same reserved path. No future scheduled events can rearm that stopped
state. Optional work must not consume the allowance needed for admitted scheduled
events/discontinuities or this cleanup. A rejected seek is acceptable overload;
a deferred note-off or a failing Stop is not.

Concrete work ceilings must be selected from the actual-kernel measurements,
then documented/tested as v3 profile policy; do not invent a universal microsecond
budget from the six-device mean. Before enabling even 2/6 clips, either prove
the full admitted short-loop workload fits the tested buffers, or reject the
offending loop/control workload with a clear work-limit error. Preserve v2
fallback. If useful material fails, improve a measured narrow clear/chase path
or the conservative proof; do not initiate a speculative engine migration.

## Measurement Interpretation

Task 7's final focused report records means of 1052.995 us per dense 1024-frame
render and 33.488 us for seek plus one rendered frame, averaged over 100 calls
under wrappers. Its preceding full native gate records 1052.424 and 32.308 us.
These are consistent offline averages, not CPAL tail durations, isolated reset
costs, hardware deadlines, or eight-track results. At 48 kHz, 1024 frames span
21.333 ms: roughly 4.94% for the reported mean is encouraging but establishes
no p99.9 bound. One frame spans 20.833 us, below the combined seek mean; this
directly shows why sample-partition correctness cannot imply hardware support
for a 1-frame buffer. Do not extrapolate linearly from six to sixteen roots.

Retain the proposed release callback distribution, maximum, deadline ratios,
CPU/PSS/process/worker counts, command/work rejection counts and available
audio errors. Test the negotiated desktop callback size, including driver
callbacks split into several native partitions. Separate guarded correctness
builds, offline benchmarks and actual CPAL release measurements. Requesting
32..8192 frames does not prove the device uses that size.

Use zero observed deadline misses/invariant failures as a reasonable controlled
workload release gate, while reporting background scheduler outliers and any
misses honestly. The proposed <=50% p99.9 target is useful headroom guidance,
not a specification-derived pass/fail rule or hard real-time proof. Select a
practical supported buffer with evidence; do not block a usable workflow solely
because an unrequested percentile target misses. The user does require a full
30-minute release playback/edit/editor-cycle soak. Prior 602.551 playing seconds
and 840.576 seconds of software capture do not satisfy it. CPAL stream errors
are not underruns; unavailable xrun counters remain unavailable.

## Implementation Boundaries And Acceptance

For M3-A, keep the proposed authoritative `alive_edit(document, label,
generation, draftRevision)` and `alive_history(direction, generation,
draftRevision)` transaction gate. Validate musical ranges and unchanged chain
identity; reject stale revisions without mutation. One gesture is one history
entry; cancellation restores its starting draft. Route numeric/table edits
through the same gate, leaving no history-bypassing draft command. The proposed
64-entry/8 MiB combined musical snapshot bound is a reasonable control-thread
default, not callback memory. Merge live fields by stable instance ID on undo.
Clear focused history only after successful Apply/Discard/New/Open or explicit
structural change; failed operations preserve it. Label the scope "Undo pending
edit" and keep Ultra editor undo unchanged.

| Task boundary | Deliverable / key contract | Acceptance before expansion |
| --- | --- | --- |
| M3-A, after Task 8 and M2 integration | Piano roll, fixed 1/16-note grid, one complete transaction/gesture, Rust-owned focused draft history; use existing v2 document/runtime | Add/select/move/resize/delete/velocity; off-grid preservation and frame-rounded overlap; cancel/scroll/focus; live bases/mixer survive undo; failed Apply preserves draft/history; actual release create/edit/play/save/reopen |
| M3-B1 | Freeze one v3 ABI and strict clip wire model; bounded bank compilation, migration, event/work admission; capacity probe fixtures before enabling new behavior | Cross-language layouts; original v1/v2 suite; unknown/oversized/misowned input rejection before access; two-track example stays usable; brute-force tiny-model checks for cyclic/splice/reset envelopes |
| M3-B2 | Two-track bank/cursors and native individual quantized launch/stop, control reducer, ledger and request outcomes; no launch graph work | Exact scalar/partition samples; boundary/race/ownership/termination tests; empty-short-loop and repeated seek/restart workloads admitted or explicitly refused under measured policy; queue-full Stop; actual saved kernels |
| M3-B3 | Four-slot UI, create/duplicate/delete/length edits through history; strict persistence and base/automation display | Selection distinct from queued/playing; draft-only slots cannot launch; independent duplicated score; editor remains same device; Save As/dependency/hash failure safety; actual release switch/stop/edit/save/reopen journey |
| M3-C | Measure 2/6, then internal 4/8 and 8/16 fixtures; enable 8/16 profile only after evidence, with same v3 records | Actual shared instruments/effects, uneven two-effect chains, maximum admitted events/parameters/voices, aligned switches, short loops, controls/clear/chase/publication, 17-root rejection, complete 30-minute release soak |
| M3-D | One atomic scene-row command; empty slots explicitly stop those tracks; shared quantized target | Equivalent samples to simultaneous individual actions, all-or-none queue failure, supersession/Stop race tests, no scene-only engine or schedule |

B1 and B2 are code-review boundaries within one deliverable: do not expose a
saved v3 format that cannot yet be played. The capacity benchmark can exercise
the eventual fixed storage internally without accepting an eight-track saved
profile in a released host. Tasks A, B and C must each leave the app usable.

Required adversarial fixtures: independently legal clips whose combined frame
or rolling count fails; unsafe nondefault slots; outgoing dense suffix/incoming
dense prefix; global resets with unchanged clip choice; mutually prime lengths;
188-frame empty and populated loops; partial-bar seams; 32/33 and 64/65 event
boundaries; simultaneous natural/global/launch transitions; repeated seek to
a dense point; Stop/Start and Stop-snapshot races; one-track clear preserving
the other track's exact tail; automated-to-unautomated ownership release; eight
instruments plus nine effects; and old getter canaries under larger v3 state.

Use `[1]`, `[31]`, `[63]`, `[64]`, `[127]`, `[1024]`, mixed and seeded arbitrary
1..1024 partitions. Inject UI commands at identical native entry frames for
comparison: different observation boundaries legitimately change UI latency.
Admission never drops a note or lane to make a fixture pass. Keep all callback
allocation/free/lock checks, native Faust/Clockwork placement and existing Ultra
regressions. Require actual native saved-device output, not browser mocks alone.

## Remaining Gates And Decisions

No user decision is necessary to begin M3-A after Task 8/M2 acceptance. Four
slots, one-bar quantization, stopped Apply, focused pending-edit undo and hard
track clears are conservative reversible defaults already justified by scope.

Two engineering gates remain: completed Task 8 identities/persistence/host
contracts, and actual-kernel work measurements selecting a safe v3 work policy
and practical desktop buffer. Neither is a reason to request cosmetic approval
or stop unrelated work. A user/product decision is needed only if measurements
show the requested useful eight-track workflow cannot meet a practical buffer
within current graph/root constraints and every narrow optimization or explicit
work admission would materially change that workflow. Report the measured
bottleneck and concrete alternatives then; do not preemptively promise an engine
rewrite, silently raise limits, or claim the milestone complete at two tracks.
