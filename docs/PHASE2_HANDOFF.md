# Phase 2 Implementation Handoff

Updated 2026-10-29. Read this before resuming after compaction. The implementation
goal is active; this file records accepted work, evidence limits and the next
incomplete gate. Use the execution checkpoint, not historical planning text,
to decide what to resume.

## Active Execution Checkpoint

Application source: `c71b60805e0e877915fb2b9efaf83b479252d5e3`, integrating
reviewed Task 7 native Master `81220d3` over accepted Task 6 owner `e716e4`
and Node DTO/model `de30ca8`. Tasks 1-7 are complete at their recorded scopes;
do not restart them. Root verifies all 25 native packet files byte-identically,
runs the full pinned native suite (exit 0, 186.425s), 286 Ultra Rust tests with
four ignored, and one Alive test. A focused loader trace proves the actual new
native module. Exact compiler, library hashes, command and terminal receipts
are under `task-7-root-validation-81220d3/` in the canonical workspace.

Earlier Task 6 combined checks pass 585 Node/component, 273 Ultra Rust with four
ignored, one Alive and one staging test. Its full pinned contracts pass in 219.253s.
Reports/reviews, original failed and final logs and source hashes are under
`experiments/phase2-20261028/master/`. Non-unity history/round-trip uses explicit
model-only seams; production non-unity installation was refused before Task 7.

Containing pushed checkpoint: `62a657a55e8f007408fa42abce18f60b3bf8cecb`.
Full CI `40721716899` and all four package targets in `40721716535` pass on
that exact head; publication is skipped. Terminal receipts are under
`experiments/phase2-20261028/master/cloud-62a657a/`. They qualify the saved-owner
checkpoint, not later Task 7 native Master source. These are not the earlier
foundation runs.
Fresh fetch confirms the release foundation remains `31033483`.

Most recent fully CI-qualified checkpoint is `13d3061ced9df759aa65201c4d7361d831cefbd9`.
It includes the reviewed browser correction and unchanged application source.
Its full CI `40736406708` passes all three jobs, including native/Rust/software
CPAL and Chromium. All four package targets in `40736407041` pass; publication
is skipped. Both terminal receipts and their hashes are in the
`cloud-browser49/integrated-13d3061/` evidence subdirectory.
Previous `49d68bb` CI `40728696609`
completes with native and UI/reference jobs passing and one
Chromium Arrangement failure: the first blank-lane bounding box is null before
pointer input. All four packages in `40728696620` pass; publication is skipped.
The independently reviewed browser-only candidate `f035161` is applied to root
byte-identically with syntax/whitespace checks passing. Its focused worker
red/green and original-case runs pass; fresh cloud Chromium now passes the
integrated full suite. This qualifies 13d3061, not later Master source. Original cloud
failure, controlled mechanism, reviews and terminal receipts are retained in
`experiments/phase2-20261028/reliability/cloud-browser49/`. The induced detached
handle mechanism does not establish the exact cloud trigger.

New native application source `c71b608` has independent local qualification
above; its containing pushed head still requires fresh cloud CI/packages.

Full foundation CI `40710079202` and all four package targets `40710079013`
pass at `3b3df87572722d2349d0725f4059cfc4afd467ae`; publication is skipped.
These results do not qualify later Master source. Terminal receipts are in
`experiments/phase2-20261028/reliability/cloud-3b3df87-g0/`. G0 is fully
accepted, superseding its earlier split source-equivalence qualification.
Original c6 chooser and c272 browser failures and reviewed corrections remain
under the reliability checkpoint; none of the original assertions was removed.

Task 7 integrates candidate `81220d33348b2baa0890b0d74f1e517aa5474722`
on `6f407a4` as root `c71b608`. Whole-packet and subsequent ramp, partition and owner-FULL spec
and quality reviews have no blocking source finding. The final FULL retry
asserts receipt/saved gain 0.5 and owner/receipt serial agreement. Two minor
witness gaps remain for whole-branch triage: retry serial comparison with all
intervening allocations and stored history contents beyond `History::view`.
The worker reports 286 Rust tests passing with four ignored and one Alive test;
the native suite and measured production inputs are source-equivalent across
the later test-only changes. Independent evidence audit verifies the retained
hashes, loader distinction and all 735 v4 manifest entries.

The original integrated native suite exits 127 at the old resolver fixture
under pinned Rust 1.85.1. Its standalone test executable borrowed Rust std
symbols from the full native library, then lost them when substituting the old
fixture. The narrow test-only `81220d3` correction links against the minimal
anchor and rejects borrowed Rust symbols, retaining all four module cases.
Both fresh Terra source reviews have no finding; the evidence addendum verifies
hashes and distinguishes reconstructed fixture labels and worker-reported
metadata. Root's independent final pinned native/Rust checks now pass with
captured commands/exits/compiler/module identity. The original red remains in
`experiments/phase2-20261028/master/native/root-original/`; correction evidence
is in `resolver-fix/`. No production resolver relaxation or old launcher artifact
overwrite was required. All native worker resources were explicitly released.

Completed v3 capacity/scene timing at practical buffers reports 0/93,600
observed overruns for two tracks, 0/36,000 for four tracks, and 4/52,800 for
eight tracks. All four are consecutive `extended_dense_controls` samples at
1024 frames: max 24.016ms versus 21.333ms period. Master-burst cases have zero
observed overruns at 512/1024. Saved/maximal graph practical cases are below
their periods; small synthetic 64-frame cases have excursions. These are
software timing measurements, not physical underrun counts or causal evidence.
V4 qualification completes all 15 commands. Shipping v4 profile 1 has zero
observed overruns in 108,000 practical-buffer samples across 57 cases; the
provisional, refused profile 2 has 1,176/79,200 and remains unshipped.
The bounded identical-fixture B/C/B/C comparison completes four fresh-process
1,200-sample runs with identical PCM hashes and no excursions. It does not
recreate the preceding matrix process history or identify the original cause.
Controller ruling permits the UI slice after integrated functional checks pass,
while carrying this eight-track timing result to final qualification. No clean
all-profile deadline pass is claimed, and no threshold, capacity or setting is
changed. The working two-device profile remains the first checkpoint scope.
The canonical ledger records the ruling and its possible rework cost. Those
functional checks now pass; Task 8 is leased and Task 9 remains gated.

Curated native reports, reviews, reproduction scripts, original red/green and
raw software timing samples are under
`experiments/phase2-20261028/master/native/`, with original/stored hash manifest.
Binary/PCM/source-copy archives remain local and separately hash-pinned; omitted
archives are explicitly identified. The partial interrupted timing log remains.

Task 7 diagnosed a local test-loader discrepancy: Cargo selected the worker's
old adjacent `target/release/libultra_native.so`, correctly reporting Master
unavailable; direct execution of the same test binary against the new build
module resolves successfully. Preserve the old/new identities and failed
loader evidence, and pin the mapped module in final tests. Do not weaken the
resolver or overwrite the old tested launcher artifacts for unit-test setup.
Any measurement-driven source change requires a new immutable candidate and
scoped review; earlier review does not automatically qualify later bytes.

The Master v1 contract is frozen at `docs/contracts/alive-master-v1.md`.
Fresh explicit `gpt-6.1-terra` / high worker `/root/p21_master_workspace_ui`
owns Task 8 in `bb01` at `c71b608`. Its canonical `task-8-brief.md` activates
the full Alive UI/focused tests and Alive-only design/surface documentation
lease, including explicit `alive-master.mjs` producer handoff while preserving
pure DTO exports. It owns build/cache plus serialized browser/native GUI and
software-audio resources until release. Root performs docs/evidence/cloud work
only, with no competing local build/browser/GUI/audio/native workload. No host,
native, ABI, capacity, Ultra canvas or release-workflow change is leased.

The UI worker's first partial producer report was not an acceptance candidate;
root renewed the same lease to finish the full packet in place. No partial UI
source has been integrated. Read the canonical ledger/current report rather
than inferring completion from focused Node tests.

Separately, fresh Terra worker `/root/q1_endurance_collector_fixtures` prepares
only two new GI-free Python helper/test files in `27be` at `c71b608`. This uses
the runbook's disjoint-fixture allowance while the UI owns runtime resources.
The canonical `task9-collector-fixtures-brief.md` forbids driver/UI/native/CI
edits, native/build/browser/GUI/audio/AT-SPI/recorder workloads and bound changes.
It consumes existing epoch/playing contracts and must pass independent review
before integration. This is test-support preparation, not a Task 9 native,
pilot or endurance lease; Q1 qualification remains gated on accepted Task 8.
The next user-testable checkpoint is a real saved native Master with closer
Live Session/Arrangement composition, not another standalone instrument.

The last completed local application build is still `b4b1a5c`; Task 6 unit
tests are not a new launcher build. Rebuild/hash both binaries and their native
library after the complete native/UI slice before refreshing the test launcher.
Endurance and physical output are unqualified. Continue subsequent bounded
plan tasks after the first checkpoint without expanding its scope prematurely.

## Owner Intent And Current Boundary

Alive and Ultra are the apps being built: separate binaries, Live-style host
and Max-style patch/device editor, with workflow and visual fidelity first.
The owner explicitly wants a real Master channel and closer Live composition.
File interchange is a separate measured lane. Use REA for installed Live/Max;
use normal source tools and tests for Alive/Ultra.

The owner accepted the Phase 2 direction and requested implementation using
multiple Terra agents. The active goal now names this handoff and authorizes
execution. Its planning-only boundary is historical; accepted Tasks 1-6 must
not be redispatched after compaction.

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
- Accepted application source: `c71b60805e0e877915fb2b9efaf83b479252d5e3`.
- CI/packages-qualified foundation: `3b3df87572722d2349d0725f4059cfc4afd467ae`.
- Release foundation: `31033483eb3baf15edab1734b966cc6d55c4b8c7`.
- Draft PR: #6, targeting `build/ultra-desktop-releases`.
- Do not edit/merge active release branches, PR #2 or PR #5.

Root is curating `PLAN.md`, this handoff, the reviewed browser-only test and
`experiments/phase2-20261028/{master,reliability}/`; those changes are intentional. Check
actual HEAD/upstream for the containing evidence checkpoint and fresh cloud
statuses. Expected worker changes are confined to its isolated `bb01` lease;
preserve its `.superpowers`, `r-u` and test-result evidence. Review/candidate
ancestry is retained under local `agents/phase2-*` refs. Commit only intended
paths, preserving user work and private reference material. No destructive cleanup.

## First Runnable Work

Read the canonical ledger and reconcile the live Task 8 UI worker; do not
dispatch another UI writer or restart accepted Tasks 1-7. Root's final Task 7
native/Rust/Alive checks and earlier Task 6 pinned contracts are terminal exit 0
at their recorded source, with receipts under the native/saved-owner evidence.
The staging regression
is now an explicit CI step; v5 and legacy conversion notices reflect the actual
wire and dirty detection uses the score transition, preserving saved notices.

Root may update docs/evidence/draft PR and inspect cloud statuses while native
work runs. Final qualification requires the final pushed head; the old full
foundation CI/packages cannot qualify Task 6 or later native/UI source. Fetch
and reconcile the release foundation again before final testing. No merges.

On Task 8 report: freeze the exact candidate, independently review spec and
quality, resolve findings, integrate byte-identically and run affected tests.
Require bounded producer, actual Master/native action receipts and both-size
WebKit/Chromium layout/fader proof; preserve the pure DTO/model contract and
original history/Prepare/Apply/scoped Stop/Quit regressions. Task 9 owns the coherent local build, both
sizes/native save/Quit/restart, launcher, 1800 proven playing seconds, final
head CI/packages and reviewed draft checkpoint. Preserve evidence limitations
and distinguish software-loopback from physical output.

Read-only Task 9 preparation is retained at
`experiments/phase2-20261028/master/checkpoint-preparation.md`. The existing long
desktop workload counts conservative playing time but lacks the short stream
observability journey's contiguous epoch collection. Task 9 must integrate
that collection, action boundaries and final retirement, retaining original
assertions. Use an exact-artifact short pilot to check the unchanged wall,
audio, metadata and epoch bounds before the 1800-playing-second run; a pilot
does not qualify endurance. No Task 9 implementation lease was granted.

While the exclusive profiler runs, two fresh Terra workers completed read-only
Task 10 browser and Task 12 authoring inventories. Hash-pinned reports are under
`experiments/phase2-20261028/preparation/`. They identify future contract/source
seams and unobserved Live/Max questions; they freeze no API and create no extra
dependency on the first checkpoint. No reference runtime was relaunched.

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

The last completed local application build is `b4b1a5c`, before saved-owner
changes. Unit-test binaries do not refresh the test launcher. Existing commands are `bash apps/alive/build.sh`,
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

The current thread goal is **active**, with objective `docs/PHASE2_HANDOFF.md`.
Do not create a duplicate goal, mark this work complete before its gates pass,
or infer a pause from compaction. No token/time budget was requested. The
following expanded objective records the authorized scope for a new session
only if it needs to be transferred through the normal goal interface.

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

## Historical Planning Validation

Fresh Terra spec review found no actionable omission. Fresh Terra quality
review found the baseline/diagnostics circular gate; it was corrected in the
primary plan, runbook and this handoff, and scoped re-review confirmed the fix.
Document/fence/whitespace and embedded shell/JavaScript syntax checks pass.
Those documentation checks did not qualify application behavior. The active
execution checkpoint at the top records subsequent implementation and keeps
candidate-native, integrated-native and exact-pushed-head evidence distinct.
