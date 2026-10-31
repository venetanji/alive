# Task 2C: finite MIDI authority actions report

## Fix round 1: current handoff

Status: DONE; independent re-review pending. The P2 pending-slot finding from
`task-2c-authority-actions-review.md` is corrected at
`74d92d407602d3fd7b8c2ac6161d59220eb09f1f`, based on reviewed implementation
`92d84d1f53dc1d8ad4f7b345f16f862e911d3ec7`.

Commit: `fix(alive): retain pending workspace slot across boundaries`.
Only `alive_session_workspaces.hpp` and `alive_session_v4_authority_test.cpp`
changed: 110 insertions, one deletion. Production delta is one comment and one
assignment in the shared final transition helper. After authority/occurrence
resolution, cursor pending-slot metadata is derived from the reducer's
`pending_action` / global `pending_clip` token. This preserves the independent
pending command across adjacent occurrences, gap entry/exit and other cursor
replacement. The existing due-application path still clears the pending fields
and publishes the applied receipt together. No new pending owner, scheduler,
ABI, ceiling or admission path was added.

The new playing regression launches track 1 local slot 3 / global slot 5 /
source 3 at song position 3000, targeting native song frame 48000. It checks
all pending slot/action/serial/absolute-target/receipt fields at 12 checkpoints
before and across the adjacent same-source boundary at 10000, gap entry at
20000, gap exit at 30000 and the due boundary. Observed Arrangement source,
placement and gap phase are checked independently. At application it asserts
Session authority, active global slot 5, source 3, phase 1001 after the first
rendered sample, one epoch increment, cleared pending fields and applied member
mask 2 with the original absolute target retained.

The original concurrent test exercised stopped reductions only; its earlier
pending-publication claim was not established. It now also starts playback,
queues the sparse Launch, crosses all three boundaries and reaches application
while the snapshot reader runs. Explicit off-callback synchronization requires
successful playing-pending reads in all three boundary regions and a successful
applied-state read; the coverage cannot pass merely because the reader missed
the transition. Focused execution observed 27010 playing-pending snapshots,
boundary mask 7 and two applied reads; native CI observed 29367, mask 7 and two.
Counts are scheduling-dependent; the assertions require positive observations
and all boundary regions, not these particular counts.

### Fix verification and artifacts

Evidence is separate at
`/tmp/alive-workspaces-task2c-authority-actions/fix-1`. The initial raw manifest,
pins and artifacts remain unchanged, as does parent-curated evidence.
`fix-1/pins.json` records the new source/binary/fixture/report pins;
`fix-1/evidence-sha256.json` inventories only this fix round. Baseline source
copies, baseline backend, exact RED source, both RED binaries and their command
metadata/logs are retained. `final-source/` contains the two committed files;
`scoped.diff` is the exact fix delta.

- Review reproduction, before the source fix: compile exit 0, execution exit 1.
  It reports `before position=3001 action=1 slot=0; after position=10001
  action=1 slot=4294967295 receipt_pending=1 fault=0`. The supplied
  `/tmp/alive-authority-review-pending-slot.cpp` is retained unchanged as
  `review-reproduction.cpp`.
- New sparse regression, before the source fix: compile exit 0; execution
  terminates with SIGABRT (Python return code -6, shell equivalent 134) at the
  required pending global slot 5 identity assertion. The exact pre-fix test
  source is `regression-red-source.cpp`.
- Final focused command: `bash
  /tmp/alive-workspaces-task2c-authority-actions/fix-1/focused.sh`, with evidence
  output directed to the same fix directory. Exit 0, 45.13031977100036 seconds.
  New and original authority checks, original finite multi-track v4, and
  original one-lane v4 all pass under Werror and callback guards.
- The supplied review reproduction rebuilt against the fixed backend compiles
  and runs with exit 0. At position 10001 it now reports `action=1 slot=0
  receipt_pending=1 fault=0`. Only this include-based review harness retains
  the review's two warning suppressions; production/focused warning policy is
  unchanged.
- Exactly one full native CI for this fix round after its final shared-helper
  edit: `bash apps/ultra/tests/ci/check-native.sh`, exit 0,
  171.13981463100208 seconds. Includes the unchanged complete envelope oracle
  with 106661824 assertions, original v1/v2/v3 and v4 suites, new playing pending
  regression, callback guards and 42 edit plus 42 baseline Stop-stress cycles
  over 43008 float samples.
- Direct current-source shipping test (without the provisional definition):
  compile and execution exit 0, shipping admission remains disabled.
- Main PCM is byte-identical to the initial implementation: 145001 stereo
  frames, SHA-256
  `d33c7335cb3c14d8f6d34990770d645a5064958e08844948096152ed66c0bc11`.
  The unchanged work-curve and dense placement-refusal checks also pass.
- `git diff --check`, empty cached diff and frozen source checks pass. No source
  edits followed final verification or commit. Parent `PLAN.md` and untracked
  curated evidence were not modified.

Source/slot suffix loops, song loops, Seek, audio sources, shipping activation,
Rust/UI integration and deadline qualification remain gated. The accepted
old-pending/failed-optional-Seek carry-forward remains unchanged. No subagents,
app rebuild, settings edits, release or push occurred.

## Initial implementation record (historical)

The following records the original 92d84d1 implementation and its original
artifacts. The fix-round section supersedes its source pin and concurrent
pending-publication claim for the current handoff.

Status: DONE for this native provisional sub-slice. Source and index are frozen
for independent review. This does not activate shipping v4 or claim desktop,
audio-source, loop, Seek or deadline qualification.

## Pins and ownership

- Base: `8a6192f01e36dfea5978503d2799dd4339970d1d`.
- Approved multi-track preparation consumed:
  `0606542c505f5ba615f43404b639f6c5f63e6e37`, with its final implementation report
  and independent review. Native source between that commit and the base is
  byte-identical.
- Implementation: `92d84d1f53dc1d8ad4f7b345f16f862e911d3ec7`.
- Commit: `feat(alive): add finite MIDI workspace authority actions`.
- Six scoped files: `alive_session_clips.hpp`, `alive_session_workspaces.hpp`,
  new `alive_session_v4_authority_test.cpp`, the two existing v4 runtime suites,
  and `tests/ci/check-native.sh` registration.
- Evidence: `/tmp/alive-workspaces-task2c-authority-actions`. `pins.json` pins
  implementation, base, compiler, source, original builder/oracle/v3 tests,
  actual saved devices, native core library and retained binaries.
  `final-source/` contains the six committed files. `evidence-sha256.json`
  hashes all retained evidence. `base-source.tar` and the exact initial RED
  source preserve the initial reproduction, including its old backend object.
- Parent-owned `PLAN.md` remains unstaged and outside the commit. Cached diff
  is empty. This requested report is outside the scoped source commit.

## Implementation and retained gates

The dedicated provisional v4 backend accepts finite MIDI Launch, Track Stop,
Return and atomic multi-track action requests through the existing ingress,
queue, reducer, receipt tables, reserved Stop mailbox, renderer and clock.
Ingress resolves track-local slots through the immutable prepared map; active
and pending observations contain global slot indices. Slot tokens are never
passed to the source or legacy clip arrays.

Stopped actions cue authority without audio. Ordered reduction retains the
final stopped cue and member outcomes, then reserves and resolves only final
Arrangement cursors. A superseded Return does not perform a lookup or consume
an unnecessary horizon allowance. Stopped Return still goes through admission
when all roots are already clear. A 64-Return batch performs one bounded lookup;
64 actions ending in Launch perform none. START resumes active Session phase
and authority; natural-end START rewinds remembered cues to their offsets.

The shared bounded transition scratch selects due authority actions before
Arrangement boundaries or Session completion. It is used by first-sample
preview and actual dispatch, with placement allowance reserved before reads.
Arrangement continuation still advances the existing next-placement cursor;
Return uses the bounded binary search at application position. Both candidate
and scheduled transitions retain the existing rolling resource ledgers.

Actual dispatch prepares chase against prospective tracks without publishing
them, counts the combined ordinary/synthetic batch, and commits tracks,
cursors and applied receipt members only after the batch fits. Each changed
chain clears once. Fault cleanup sees the last committed authority and cancels
pending members without partial event emission. Preview includes synthetic
chase allowance for every final changed active track, including due actions.
Rejected expensive preview consumes guard and placement credits without
reconstruction or root reset. The scheduled placement first-frame bound is
checked alongside the existing optional retained-history horizon.

Nonlooping Session completion publishes Session authority, NONE active source,
slot and placement, and phase zero while retaining the private ended cue.
Global Stop/Start preserves that silence. Natural song end followed by START
restarts the remembered cue at its offset. Explicit Track Stop clears the cue;
Return changes authority and clears the Session cue. Pending Return exposes
NONE pending slot while observed Session authority remains unchanged.

The complete envelope builder, exhaustive oracle, ABI, ceilings and native
configuration admission are unchanged. No alternate admission path or narrowed
curve was introduced. Shipping features remain zero and shipping configure/
request remain refused. Source/slot suffix loops, song loops, Seek and audio
sources remain explicitly refused.

## Behavior evidence

- Actual saved subtractive instrument, utility, standalone stateful filter and
  utility-to-filter chains are used with independent root revisions. Muting the
  overridden first track gives sample-identical, nonzero second-track PCM with
  and without Launch/Return/Stop controls for every chain shape. Phase and epoch
  remain continuous on the unaffected track. Scoped Stop leaves the clock and
  other track running; muted-other-track tests prove exact silence and cleared
  effect tails after Stop and gap Return.
- Exact native controls target 48000, 96000 and 144000 at 240 BPM. Launch at
  48000 replaces an adjacent same-source Arrangement occurrence before its old
  endpoint automation can enter the batch. Return at 96000 resolves occurrence
  1 at source phase 49000; the submitted position does not determine its phase.
  Stop at 144000 suppresses the new Arrangement occurrence at that endpoint.
- O=1000 has a note ending, a note beginning and a held note spanning entry.
  Launch and Return dispatch note-off 61, due automation, chased 64 and ordinary
  60 in that exact order; due automation wins over prefix automation. The changed
  track clears once and the other chain remains continuous. Original adjacent
  occurrence and implicit source-end tests remain unchanged.
- Sparse mapping is explicit: track 1 local slot 3 resolves to global slot 5,
  source 3, offset 1000. Shared source 1 slots use offsets 1000 and 2000. Neither
  local slot 3 nor global slot 5 is treated as source 3 by coincidence. The initial
  simpler fixture also checks global slot 7/source 3/offset 300.
- Stopped Launch -> Stop -> Return and Return -> Launch retain per-member
  superseded/applied results. A stopped cue -> queued START -> future Return at
  nonzero song position preserves the active cue and exact absolute target.
  Natural completion, global Stop/resume and natural-end restart distinguish
  ended private cues from explicit Track Stop.
- Atomic scenes use Track Stop for empty members. Replacing one member preserves
  the other member's pending/applied results and yields the expected MIXED
  masks. Global Return is one request. Stopped optional refusal preserves old
  committed authority/cursors/epochs; accepted base, mixer and bypass changes
  retain their established semantics. Superseded terminal members remain
  superseded when the final optional batch refuses.
- Full 64-command queue, modulo-128 receipt collision and terminal reuse,
  serial exhaustion, injected Stop-epoch saturation, reserved Stop race hooks,
  stale pre-Stop commands and fresh post-Stop requests are covered. No callback
  fragment rearms after a fault. Final unreachable nonlooping-grid actions
  cancel immediately with END_CANCELED and NO_FRAME.
- A retained 28-event ledger plus four actual chased/ordinary events accepts at
  32; 29 plus four refuses at 33 without dispatch or applied scene members.
  This is explicit test-only ledger pressure, not a claimed admitted authored
  33-event score. Test-only private-member access lives entirely in the test;
  no production setter or ABI was added.
- Concurrent snapshots validate source/slot/placement/authority/phase and
  pending receipt identity from one publication. Original wrong-mode and
  caller-canary tests remain unchanged. All callback runs use the existing
  malloc/calloc/realloc/free/mutex guards.
- PCM and dispatch are exact across fixed 1/31/63/64/127/1024 and mixed partitions,
  with gestures anchored at the same native absolute boundaries. The retained
  main PCM has 145001 stereo frames / 290002 nonzero float samples; SHA-256 is
  `d33c7335cb3c14d8f6d34990770d645a5064958e08844948096152ed66c0bc11`.

## Sparse acceptance and work bounds

Two sounding tracks are proved with no effect and all three effect variations.
Eight-track authority evidence is intentionally sparse: eight real instrument
roots, one sounding Session lane and seven Session-silent lanes in the scene;
all eight Return atomically. It is not a claim of eight simultaneously sounding
Arrangement lanes. The prior finite multi-track tests remain regressions.

The shape-valid eight-track/32-slot fixture still refuses at 66 scheduled
placement steps against 64/frame. The binary refused configuration and its
native diagnostic are retained alongside 27 accepted binary configurations.
No source limit, work ceiling, reset cost or future curve changed to accept a
fixture.

Actual scheduled ledger maxima for the two-track/six-root authority trajectory:

| Resource | Frame actual / admitted | Window actual / admitted |
| --- | --- | --- |
| Events | 2 / 12 | 2 / 24 |
| Root clears | 3 / 30 | 3 / 48 |
| Reconstruction scans | 1 / 10 | 1 / 16 |
| Parameter writes | 20 / 200 | 20 / 320 |
| Scheduled guard | 0 / 0 | 0 / 0 |
| Placement steps | 4 / 34 | 4 / 40 |

Every width 1..1024 is checked at every charged endpoint; with nonnegative work
these endpoints cover maxima of all fixed-width windows. Dispatch counts equal
charged event counts. Independently counted reconstruction reads, descriptor
probes and epoch-derived clears stay within reservations; preview reads stay
within 128. Parameter-write numbers are conservative ledger charges, not a
separate DSP instruction counter. MIDI sample-payload reads remain zero.

A first-sample rejected candidate spends guard 9252 and optional placement 2058,
with zero reconstruction/root work. It retains Arrangement state and rejects
both START and the candidate Launch. The mutation removing synthetic preview
allowance fails this exact assertion by allowing the candidate to reach a later
runtime fault. The optional 2114, scheduled placement 64/512, event 32/64, queue
64 and receipt 128 ceilings remain unchanged.

Raw `work.tsv`, `dispatch.tsv`, `receipts.tsv`, `authority-pcm.f32`, accepted
configurations and the refused configuration are retained. Column definitions,
PCM format and sample statistics are in `evidence-description.json`.

## Verification

- Meaningful initial RED: compile exit 0; valid stopped Launch fails the old
  START-only ingress, executable exit 134. Exact test source, failed executable,
  baseline archive, old backend, command metadata and `red.log` are retained.
  An initial unused-helper Werror was corrected before this behavior RED.
- Isolated preview mutation: compile succeeds; `test --first-sample` exits 134
  at the required rejected-candidate/no-fault assertion. Mutation source,
  backend, executable, script, log and command metadata are retained. Runtime
  tests did not require modifying the complete envelope builder or oracle.
- Final focused command: `bash
  /tmp/alive-workspaces-task2c-authority-actions/focused.sh`, with
  `ALIVE_AUTHORITY_EVIDENCE=/tmp/alive-workspaces-task2c-authority-actions`.
  Exit 0, 45.019842373003485 seconds. Builds current provisional backend and
  new authority, original finite multi-track, and original one-lane v4 suites
  under Werror and callback guards.
- Unchanged complete oracle: compile and execution exit 0;
  `sources=8576 boundaries=7620 splices=144 authority=217600 native=12792
  accepted=13 refused=1 assertions=106661824`.
- Exactly one full native CI after final shared-helper changes:
  `bash apps/ultra/tests/ci/check-native.sh`, exit 0,
  170.6433554289979 seconds. Includes the new suite, all original v1/v2/v3
  runtime/layout/envelope/scene/receipt/capacity/guard proofs, original v4,
  unchanged complete oracle, shipping refusal, and 42 edit plus 42 baseline
  Stop-stress cycles over 43008 float samples.
- Additional direct current-source shipping check compiles the unchanged
  shipping test with current `backend.cpp` without the provisional definition.
  Compile and execution exit 0; `PASS: v4 shipping admission remains disabled`.
- `git diff --check` and post-commit `git diff --cached --exit-code` pass.
  No source edits followed final verification or the scoped commit.

Only obsolete valid-action refusals changed in old v4 tests, as explicitly
ruled by the parent: `alive_session_v4_test.cpp`'s valid Track Stop refusal and
`alive_session_v4_midi_test.cpp`'s valid Launch/Stop/Return refusal loop now
assert queued ingress and native END_CANCELED behavior in their short-song,
no-future-grid fixtures, with authority unchanged. The new suite proves the
reachable pending/applied cases. Seek/loop/audio/shipping refusals and every
unrelated v4/v1/v2/v3 assertion remain intact.

During expansion, the stopped Return -> Launch test caught an unnecessary
intermediate Return horizon charge; final-only reduction fixed it. Intermediate
logs also retain a hand-counted test target correction and two test compile
issues (unused helper, temporary lambda/indentation), distinct from runtime
failures. No failed test was removed to obtain GREEN.

## Carried requirement and next slice

The parent explicitly ruled that old committed pending + failed optional Seek
batch is unreachable in this no-Seek slice under the established reducer:
playing track actions are scheduled, START while playing is a no-op, and global
Stop cancels pending actions. This slice does not invent optional admission for
playing actions solely to manufacture that case. It proves stopped optional
refusal, scheduled pending member replacement, atomic fault and Stop behavior;
the unchanged v3 old-pending refusal proof remains. Carry the v4 old-pending
optional-refusal scenario into the suffix-loop/authority-aware Seek slice.

Independent review is next. Only then widen to source suffix loops and
Arrangement-only Seek reconstruction while preserving active/ended Session
cursors, unaffected PCM and rolling-ledger refusal continuity. Partial song
loops remain a subsequent slice. Audio, Rust/desktop integration, measurement,
production activation and the final end-user journey remain gated.

No subagent, app/Rust/UI rebuild, settings edit, release or push was performed.
