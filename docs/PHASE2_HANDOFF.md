# Phase 2 Implementation Handoff

Updated 2026-10-28. Read this before resuming after compaction. The implementation
goal is active; this file records accepted work, evidence limits and the next
incomplete gate. Use the execution checkpoint, not historical planning text,
to decide what to resume.

## Active Execution Checkpoint

Latest resumption: exact-checkpoint CI `40695723200` failed in the Alive native
walkthrough at `check_alive_desktop.py:1175`: Replace Harmony device did not
produce a viewable Load Ultra Device chooser. UI/reference and Chromium jobs
succeeded. Original failed logs and the complete Alive artifact are retained
under the canonical workspace's `cloud-c6df81f/`. Fresh Terra worker
`p20_cloud_chooser_fix` owns the narrow harness/navigation and native GUI/audio
lease in `27be`; root must await its explicit resource release before launching
native tests. Diagnose from the original evidence; do not weaken assertions.
Master packet `6638858` has clean scoped spec/quality re-reviews and root's
fresh fixture/C11/C++17/Rust ABI compilation, but remains unfrozen pending G0.
`p21_saved_owner_preparation` is read-only preparation, not a production lease.
Package run `40695723144` last sampled Linux/Apple ARM/Windows success and Intel
Mac in progress. Read actual statuses and the live ledger before dispatching.

The owner has now set this handoff as the active implementation goal. The
planning-only boundary and old goal observations later in this document are
historical. Execution uses the canonical ledger at
`.superpowers/sdd/2026-10-28-phase2-live-max/progress.md`.

- Reviewed planning/reproducer checkpoint: `70c356d`; its application tree
  matches `1ebf216`. Release foundation remains `31033483`; PR #6 remains draft.
- Current application source is `b4b1a5c`, including reviewed Task 3 and Task 4
  integrations. Earlier checkpoint `5b464e7`: CI `40686059005` and
  packages `40686058990` both completed successfully on that commit, including
  all four package targets; publication was skipped. These results do not
  qualify the newer source commits. This checkpoint adds only documentation
  and original evidence to `b4b1a5c`; consult actual HEAD/remote refs for its
  containing commit. PR #6 remains draft.
- Root's integrated Node/component suite records 572 passing tests and eight
  focused Chromium checks. A fresh rebuild at `b4b1a5c` exits 0; the command,
  exact executable/library hashes and build-log hash are in the canonical
  workspace's `checkpoint-build-b4b1a5c.json`, retained durably as
  `experiments/phase2-20261028/reliability/root/build.json`. All four combined
  native journeys exit 0 on that source: Alive 197.710s, Arrangement 118.157s,
  Ultra canvas/documents 166.320s and instrument authoring 139.502s. Durable
  commands, reports, log hashes and both-size screenshots are in
  `experiments/phase2-20261028/reliability/native/`. The instrument journey has
  18 edit cycles over 62.833s; 26 local captures contain 10,873,472 finite stereo
  frames. This is not the required 1800-playing-second endurance pass.
- Fresh full pinned headless contracts exit 0 in 212.257s on `b4b1a5c`,
  including all 572 UI/component tests, schemas, recorded-reference checks and
  C++ graph/object suites. Durable command/log receipts are in the reliability
  checkpoint's `root/contracts.json` and `root/contracts.log`. The command's
  own generated arithmetic build receipt was retained and restored to its
  prior bytes; no unrelated source was reverted.
- Task 1 is complete as a known-bad baseline. Three focused reproducers expose
  five Alive defects and two Ultra defects. Independent Terra spec and quality
  reviews found no metadata findings. Root's fresh explicit Alive native driver
  exits 1 at the original Apply/editor-generation assertion. Apply input receipt
  remains unknown, as permitted for this baseline; Task 5 owns attribution.
- Evidence: `experiments/phase2-20261028/baseline/README.md`, `manifest.json`
  and `native-result.json`. Raw software-loopback PCM is retained locally and
  hash-pinned; no physical audio or endurance pass is claimed.
- Isolated implementation uses explicit `gpt-6.1-terra` / high / fresh context.
  A fresh `checkpoint_evidence_review` dispatch succeeds with that exact model
  ID in this resumed session. Tasks 2/3/4/5 are complete; do not restart their
  implementation. Task 4 explicitly released the native GUI/audio/build lease
  to root after confirming its processes exited. Root now owns serial G0.
  Preserve the worker workspaces at `27be`, `bb01` and `2f1a` until their original
  evidence is retained; their existence does not imply an active writer.
- Task 2 candidate `f98d8dc` has passed independent spec and quality review and
  is integrated file-by-file. Root's affected verification passes 107 Alive
  Node tests and six focused Chromium checks; evidence is in
  `experiments/phase2-20261028/r-a/`. Combined-source Alive and Arrangement
  journeys now pass, as do the remaining combined native G0 journeys. Final-head
  cloud and later-feature acceptance remain separate gates.
  Source edits visibly refuse stale occurrence relationships, base edits keep
  their originating generation, loop-only brace updates and Duplicate bounds
  are corrected. The future Master generation test belongs to Tasks 6/8.
- Task 5 fix-round candidate `72e79ae` resolves the four first-review findings:
  build-independent helper fixtures, correlated Apply input/IPC/install/editor
  receipts, actual restarted executable/library identity and recorder cleanup.
  Scoped specification re-review and independent quality review accept the fixes.
  Full traced original Alive and Arrangement journeys pass on that candidate.
  The deliberate occlusion run retains the original failure and attributes it
  to input hitting Audio details instead of Apply. Integrated as `65dbf5a`;
  root's 17 helper regressions pass. Candidate-native evidence is retained under
  `experiments/phase2-20261028/r-d/`; combined-source Alive and Arrangement
  reruns now pass. Full Ultra and instrument journeys also pass on the combined
  source; final pushed-head CI/packages remain separate gates.
- The full Ultra journey reaches an independently diagnosed optional installed
  `slider.maxhelp` fixture mismatch: the converter now preserves five comments,
  giving 21 nodes (16 executable) and ten edges. The old fixed native IDs also
  drift. Independently reviewed fixture repair is integrated at `003024f`, with
  exact total/comment/executable counts, original control roles/edge and numeric
  assertions retained, and its two headless regressions included in CI. The
  complete combined-source Ultra journey now passes, including that optional
  local fixture. Preserve the old failure and exclude licensed derived graphs
  and screenshots from published evidence.
- Task 3 candidate `5663956` passed specification re-review and fresh quality
  review; it is integrated as `9997589`. Focused drafts survive reconstruction,
  and owner-wide Save flushes/refuses linked views before snapshot. The bounded
  token-fenced reservation survives picker/write, reconciles lost releases and
  resumes fenced Quit. A real Linux File > Quit Ultra action uses the existing
  coordinator. Root's integration checks pass 568 Node/component and four
  Chromium checks. The ten-case native protocol matrix predates final lifetime
  changes; four affected final-build native smokes cover invalid peer refusal,
  OS close Save, Quit Cancel/Save/process exit, and editing during the picker.
  Save-only note-off permission is covered by deterministic IPC fixtures, not
  rendered native PCM. Preserve these attribution limits in later reports.
- Task 4 candidate `a2fdc98` passed independent spec/quality review and is
  integrated as `b4b1a5c`. Repackaging validates an existing manifest before
  mutation and preserves bindings, ranges, presets and version while renaming.
  Perform supports renaming an existing effect. Four meaningful red tests become
  98 focused green tests; root's combined suite reaches 572. Native worker runs
  save/reopen the complete custom manifest and host the same saved file twice
  with independent Tone values 1200/3400. Hosted preset recall is not implemented
  or claimed. The native instrument driver now clicks the actual Package device
  label, with all surrounding assertions retained and scoped review accepted.
- No Master implementation is accepted yet. Read live worker state and the
  ledger before redispatch; do not restart these tasks blindly.
- Independent Terra Master preflight review found five contract gaps; the
  scratch draft now specifies rollback serial reservation, ordinary quiescent
  commands, structured retry errors, coherent rejection counts and unavailable
  unity installation. It remains unfrozen until P2.0 passes.

## Owner Intent And Current Boundary

Alive and Ultra are the apps being built: separate binaries, Live-style host
and Max-style patch/device editor, with workflow and visual fidelity first.
The owner explicitly wants a real Master channel and closer Live composition.
File interchange is a separate measured lane. Use REA for installed Live/Max;
use normal source tools and tests for Alive/Ultra.

The owner accepted the Phase 2 direction and requested implementation using
multiple Terra agents. The active goal now names this handoff and authorizes
execution. Its planning-only boundary is historical; accepted Tasks 1-5 must
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
- Current application HEAD: `b4b1a5c526830026321e3c3c02db24d7c9a76d3c`.
- Prior CI-qualified checkpoint: `5b464e796016052e1f1cfda2c30d00ee77b77a21`.
- Release foundation: `31033483eb3baf15edab1734b966cc6d55c4b8c7`.
- Draft PR: #6, targeting `build/ultra-desktop-releases`.
- Do not edit/merge active release branches, PR #2 or PR #5.

Expected tracked changes while this checkpoint is being curated:

```text
 M PLAN.md
 M docs/PHASE2_HANDOFF.md
?? experiments/phase2-20261028/reliability/
```

These are intentional progress updates from this conversation. The earlier
planning documents and baseline evidence are committed. Check actual status
and refs at resume; unexpected other-actor edits require stopping to ask.
Fresh origin fetch confirms the release foundation remains `31033483`.
Reconcile it before final testing. Commit only explicitly reviewed intended
paths, including curated original evidence; do not stage arbitrary user files
or private reference artifacts. Do not use destructive cleanup.

## First Runnable Work

Read the canonical ledger and curated reliability checkpoint first. Tasks 1-5
are accepted at their stated scope. Combined native run `42462` is complete:
all four journeys exit 0 on the rebuilt `b4b1a5c` binaries. Do not restart those
completed journeys or their workers without a new relevant source change.
Root's full pinned headless contracts run `23016` also exits 0. Local P2.0
verification is complete at this scope. Read the current exact-head cloud
statuses before promoting the checkpoint; final pushed-head CI/packages remain
open until their runs complete. No root app/case-path processes remain at the
recorded cleanup sample. Check actual resources before starting another driver.

The Oct28 known-bad reproducers are historical failure witnesses, not green
regressions. Ordinary corrected tests now cover those defects. Task 5 attributed
the original Apply/editor assertion to input occluded by Audio details and
preserved its full generation/lifetime assertions. Arrangement screen sizing,
ffmpeg dependency and exact restart binary/library checks are implemented in
the checked-in harness/CI. The strict optional installed-slider fixture repair
is integrated and its full local Ultra rerun passes.

After P2.0 is accepted: freeze Master contracts (the existing unfrozen proposal
and preflight reviews are retained under the reliability checkpoint's
`proposals/`), Task 6 saved ownership, Task 7
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
