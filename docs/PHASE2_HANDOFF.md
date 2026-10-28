# Phase 2 Implementation Handoff

Updated 2026-10-28. Read this before resuming after compaction or creating the
implementation goal. This file records planning state; it is not evidence that
any Phase 2 feature has been implemented.

## Active Execution Checkpoint

The owner has now set this handoff as the active implementation goal. The
planning-only boundary and old goal observations later in this document are
historical. Execution uses the canonical ledger at
`.superpowers/sdd/2026-10-28-phase2-live-max/progress.md`.

- Reviewed planning/reproducer checkpoint: `70c356d`; application source is
  unchanged from `1ebf216`. Origin fetch succeeded; feature upstream remains
  `1ebf216` and release foundation remains `31033483`. PR #6 remains draft.
- Task 1 is complete as a known-bad baseline. Three focused reproducers expose
  five Alive defects and two Ultra defects. Independent Terra spec and quality
  reviews found no metadata findings. Root's fresh explicit Alive native driver
  exits 1 at the original Apply/editor-generation assertion. Apply input receipt
  remains unknown, as permitted for this baseline; Task 5 owns attribution.
- Evidence: `experiments/phase2-20261028/baseline/README.md`, `manifest.json`
  and `native-result.json`. Raw software-loopback PCM is retained locally and
  hash-pinned; no physical audio or endurance pass is claimed.
- Active isolated workers, all explicitly `gpt-6.1-terra` / high / fresh context:
  Task 2 at `/home/venetanji/.codex/worktrees/27be/alive`; Task 3 at
  `/home/venetanji/.codex/worktrees/bb01/alive`; Task 5 at
  `/home/venetanji/.codex/worktrees/2f1a/alive`. Each starts from `70c356d` and
  owns only its brief's files/resources. The root retains integration ownership.
- Task 2 candidate `f98d8dc` has passed independent spec and quality review and
  is integrated file-by-file. Root's affected verification passes 107 Alive
  Node tests and six focused Chromium checks; evidence is in
  `experiments/phase2-20261028/r-a/`. Native qualification remains pending.
  Source edits visibly refuse stale occurrence relationships, base edits keep
  their originating generation, loop-only brace updates and Duplicate bounds
  are corrected. The future Master generation test belongs to Tasks 6/8.
- Task 5's first candidate `216f22c` is not accepted: review requires a
  build-independent unit fixture, Apply input/IPC/revision receipts, actual
  restarted executable/library identity and recorder timeout cleanup. Fix round
  1 has a narrow additional `session/desktop.rs` tracing lease. Task 3 is still
  implementing focused editor safety; no candidate is accepted yet.
- No Master implementation is accepted yet. Read live worker state and the
  ledger before redispatch; do not restart these tasks blindly.

## Owner Intent And Current Boundary

Alive and Ultra are the apps being built: separate binaries, Live-style host
and Max-style patch/device editor, with workflow and visual fidelity first.
The owner explicitly wants a real Master channel and closer Live composition.
File interchange is a separate measured lane. Use REA for installed Live/Max;
use normal source tools and tests for Alive/Ultra.

The owner accepted the Phase 2 direction and asked to specify implementation
using multiple Terra agents. They then asked to compact, set an implementation
goal and let it run. **This planning turn does not start application work or
create/resume a goal.** On resumption, the new user goal authorizes execution.

The exact requested model is **`gpt-6.1-terra`**. The collaboration tool accepted
two planning-review agents using that exact ID. `terra-6.1` was rejected; the
advertised model list was incomplete. Do not repeat that mistaken unavailable
claim or silently substitute `gpt-6.1-sol`. Request Terra explicitly for future
implementers and reviewers, fresh context, high reasoning. Capacity is root
plus three active children, including reviews.

## Read Order

1. User/machine AGENTS instructions and any applicable checkout instructions.
2. This file, `PLAN.md`, `PRODUCT.md` and `DESIGN.md`.
3. `docs/superpowers/specs/2026-10-28-phase2-live-max-design.md`.
4. `docs/superpowers/plans/2026-10-28-phase2-live-max.md`.
5. `docs/superpowers/plans/2026-10-28-phase2-multi-agent-execution.md`.
6. `docs/DEVELOPMENT_REVIEW_20261028.md` and
   `docs/PHASE2_REFERENCE_20261028.md`.
7. The three 2026-10-26 workspace specs, the unfinished audio tasks in
   `docs/superpowers/plans/alive-workspaces-20261026.md`, reusable device
   manifest/host-probe contracts and `apps/alive/STREAM_OBSERVABILITY.md`.

The primary implementation plan owns the SDD ledger at
`.superpowers/sdd/2026-10-28-phase2-live-max/progress.md`; initialize/check it
when execution begins using the skill's workspace helper. The companion
multi-agent runbook does not own a second competing task ledger. Read completed
task/candidate/review records before dispatching anything after a restart.

## Source And Expected Worktree State

- Checkout: `/home/venetanji/.codex/worktrees/edd5/alive`.
- Feature branch: `feat/alive-session-host`.
- Planning source HEAD: `1ebf2161e0fa2a62484566fac65c7e940567f357`.
- Release foundation: `31033483eb3baf15edab1734b966cc6d55c4b8c7`.
- Draft PR: #6, targeting `build/ultra-desktop-releases`.
- Do not edit/merge active release branches, PR #2 or PR #5.

Expected local planning/review changes at this handoff:

```text
M  PLAN.md
?? docs/DEVELOPMENT_REVIEW_20261028.md
?? docs/PHASE2_REFERENCE_20261028.md
?? docs/PHASE2_HANDOFF.md
?? docs/superpowers/plans/2026-10-28-phase2-live-max.md
?? docs/superpowers/plans/2026-10-28-phase2-multi-agent-execution.md
?? docs/superpowers/specs/2026-10-28-phase2-live-max-design.md
?? experiments/development-review-20261028/
```

These are intentional work from this conversation. Preserve them. Check actual
status/refs at resume; unexpected other-actor edits require stopping to ask.
Fetch refs and identify the foundation again before implementation. Do not
wait indefinitely for release integration; reconcile it before final testing.
Commit only explicitly reviewed intended paths to make plans/reproducers
available to isolated workers; a HEAD-only worker otherwise misses untracked
inputs. Do not stage arbitrary user files or use destructive cleanup.

## First Runnable Work

No Phase 2 implementation packet has started. Start primary Task 1: establish
the current source/dirty/evidence baseline and reproduce the unchanged native
Apply/editor failure. Then dispatch the bounded independent Task 2 / Task 3 /
Task 5 lanes under the runbook's ownership and resource rules. Task 4 follows
Task 3 because they share the Perform panel and DOM tests.

Task 1 accepts a reproduced known-bad baseline. It may record Apply receipt as
unknown when the old harness cannot observe it; Task 5 supplies instrumentation
and must resolve attribution before P2.0. Do not turn missing diagnostics into
a circular prerequisite for starting the diagnostic worker.

All three bug reproducers currently demonstrate defective outcomes even when
their commands exit 0; convert them into corrected failing/passing regressions:

- Alive Make Independent + queued note/name/length edits can mutate old source.
- Alive queued device-base edits can cross Open into a replacement project.
- Ultra focused numeric text can be omitted by Save and close preflight.
- Ultra repackaging can discard presets and custom parameter metadata.
- Loop-only state can leave a stale brace; Duplicate destination/copy need repair.

CI `40421472750` at `1ebf216` failed the original assertion, "Apply must close
the old editor generation", also reproduced locally. Cause is unresolved: input
delivery/visibility versus actual lifecycle needs receipts. Preserve assertions.
Arrangement CI also needs checked-in screen sizing, ffmpeg and exact restart
binary handling. Package run `40421472639` passed all four targets independently.

After P2.0 is accepted: freeze Master contracts, Task 6 saved ownership, Task 7
UI-free native gain/meter/command proof, Task 8 real Master/Live shell, Task 9
user-testable checkpoint. First new feature is Master, not a standalone synth.
Continue subsequent bounded tasks in dependency order; do not delay that first
checkpoint with broad sampler, recording or file-format expansion.

## Contracts And Review Corrections To Preserve

- v5 is proposed as a shallow envelope around one unchanged strict v2/v3/v4
  score with Master metadata; it does not force v3 into two-track v4 admission.
- Decode nested score from raw original JSON through strict file decoders;
  lossy JSON values can erase duplicate keys. Test outer/nested/map duplicates.
- Master is outside tracks/solo/voice counts: native stereo sum, gain `[0,4]`,
  exact 64-frame live ramp, post-gain/pre-adapter peaks and digital overload latch.
- Saved gain applies before the first reopened output sample. Define stopped-I/O
  initialization/reset/rollback separately from live command application.
- Freeze actual saved-owner, native ABI and UI/IPC receipts before consumers
  implement. Preserve generation, serial, acceptance/application and snapshot
  coherence. Reserved Stop survives queue pressure.
- Admission overload refuses new work while preserving working music. Stop,
  seek, loop and removal terminate affected notes reliably.
- Musical history preserves accepted live Master/mixer/base/bypass values.
- Relocate preserves matching source identity; audio Replace creates a fresh
  source ID and atomically rewires explicitly selected readers. Reconcile old
  conflicting desktop/runtime text before audio implementation.
- Four slots/scenes, current measured profiles and explicit mono/stereo bundles
  remain. Native Faust is not claimed to run in Clockwork. WAV descriptors are
  preparatory: audio preparation still rejects all audio sources today.

## Evidence, Builds And Local Resources

The review built separate Alive/Ultra binaries at the source above. Existing
local commands are `bash apps/alive/build.sh`,
`bash apps/alive/run.sh apps/alive/examples/midi-arrangement.alive` and
`bash apps/ultra/run.sh`. The Ultra desktop launcher points to another checkout;
use the explicit current-checkout run command for qualification. Rebuild and
hash both binaries and adjacent native library for implementation evidence.

Live's fresh Master/reference study is complete. Private root:
`/home/venetanji/.cache/alive-phase2-master-reference-20261028/`.
Its lifecycle evidence is
`ev_2106e2384a17c657609020fbd7b7cc001f63e6566ce9561b78992bd5b5605851`.
Action screenshots establish UI behavior separately from REA lifecycle. All 17
private evidence hashes and cleanup receipts were checked: source/original
preferences unchanged, owned Wine processes gone, Xvfb exited, disposable prefix
removed. No reference session needs to remain open after compaction.

Max uses existing dated reference evidence; no fresh Max runtime pass was
claimed. Fresh narrow current Ultra screenshots and exploration scratch are in
`/tmp/alive-phase2-20261028/`; committed design/plan/reference docs incorporate
their findings and do not depend on those temporary files.

Cloud: source fixes, original fixtures, model/history, native offline renders,
Chromium and private native Xvfb/software-PipeWire tests, existing packaging.
Local: licensed Live/Max questions and physical audio/MIDI/listening acceptance.
No cloud account, infrastructure, credentials or persistent environment is
provisioned by this plan. No proprietary reference content is published.

Final evidence must use the final pushed commit and exact binaries/library;
retain original regressions, actual native save/Quit/restart, two device
isolation, frame-offset/partition/latency proof and **1800 proven playing
seconds**. Distinguish capture duration from playing time and software-loopback
from physical audio; leave unobservable physical/underrun gates open.

## Goal State And Suggested New Goal

The existing thread goal was observed as **blocked**, with an older objective
pointing to a pasted attachment. It was not resumed, completed or replaced in
this planning turn. After compaction, use the normal goal interface to set the
new implementation objective. Do not falsely complete the old goal to bypass
a tool restriction; if direct goal creation rejects an unfinished goal, report
that concrete restriction and use the user's goal interface.

Suggested goal text:

```text
Read docs/PHASE2_HANDOFF.md, the Phase 2 design, primary implementation plan,
and multi-agent execution runbook. Implement the approved Alive/Ultra Phase 2
plan using multiple explicitly selected gpt-6.1-terra subagents, with one
controller and at most three active children. Start from the actual current
feature-branch state, preserve existing work, and deliver P2.0 reliability then
P2.1 real native saved Master and Live-style workspace as the first complete
tested checkpoint. Continue the later bounded work packages in dependency order
under their contract and admission gates. Use isolated worker workspaces,
exclusive shared-file ownership, fresh independent spec/quality reviews and
durable progress records. Use REA on installed Live/Max only when the next
behavior needs reference evidence; keep source work and cloud/headless testing
moving independently. Keep the example session usable. Build separate Alive
and Ultra, verify final-head CI/packages, native walkthroughs, timing/isolation/
termination/persistence and the existing 1800-playing-second endurance gate,
then update draft PR #6 with commands, original screenshots, evidence and honest
limits. Do not merge, tag, release, deploy, change credentials or persistent
environment settings, or edit protected release branches or PR #2/#5. Continue
without routine confirmation requests; stop when the authorized gates pass or
a reproducible blocker requires a concrete decision, preserving the working
slice, failing evidence and narrow next step. Never claim physical or full
Live/Max compatibility from software-loopback or workflow resemblance.
```

No token/time budget was requested; do not invent one. Update this file and the
primary ledger at each accepted checkpoint so another compacted session can
resume from the next incomplete packet.

## Planning Validation

Fresh Terra spec review found no actionable omission. Fresh Terra quality
review found the baseline/diagnostics circular gate; it was corrected in the
primary plan, runbook and this handoff, and scoped re-review confirmed the fix.
Document/fence/whitespace and embedded shell/JavaScript syntax checks pass.
No application test/build/CI pass or Phase 2 feature completion is claimed by
these documentation checks. The planning source HEAD is unchanged.
