# Phase 2 Implementation Handoff

## Resumed Checkpoint, 2026-10-29

The active goal has resumed after shutdown. Tasks 1-8 remain accepted;
Task 9 is open. Resume from this section; pause/running descriptions below
are historical observations, not current process state.

- Recovery began at local `e8c0d53`, a documentation checkpoint over `0f1deae`.
  A fresh origin fetch confirms release foundation `31033483` is unchanged
  and remains an ancestor. No protected refs were changed.
- All three local binary hashes and device/inodes still match
  `checkpoint-q1/final64-build/receipt.json`. Application source remains
  `64fcacd`; later Windows test scripts and package diagnostics change no
  compiled application inputs.
- Package attempt 2 is terminal **failure**, not pending. Intel Mac job
  `123186152452` builds/signs Ultra, then DMG bundling fails after three
  `hdiutil` eject attempts report `Resource busy`. The holding process is
  unproven. This differs from attempt 1's artifact-service upload timeout.
  Other three successes are carried forward; no Intel artifact is delivered.
  Immutable terminal receipts/log/manifest are in
  `experiments/phase2-20261028/master/cloud-0f1deae/attempt-2-terminal/`.
  No further same-head retry is authorized. The next normal feature push
  qualifies the reviewed diagnostic revision through the existing workflows.
- Reviewed local `c301d0d` adds bounded unsigned-Mac-build-failure diagnostics
  and macOS fixture execution to the existing package workflow. Independent
  spec/quality fix-round reviews pass; root verifies 8 diagnostic, 18 release
  and 4 notices tests. This is not a busy-eject fix or Mac runtime proof.
  Source/review/test evidence is in `checkpoint-q1/dmg-failure-diagnostic/`;
  it changes no application or pilot inputs. Its normal feature push includes
  the resumed pilot evidence; inspect current refs for the containing head.
- Interrupted final64 endurance stays partial at 1792.759948 seconds; it
  cannot be topped up. The fresh current-boot pilot exits 0 with
  **500.397271484 target proven seconds**, 888 valid credits, five cycles,
  seven contiguous finalized epochs, actual Quit and quiescent retirement.
  Independent operator/Terra audits agree: 41 processing-budget exceedances,
  seven other counters zero; no physical-underrun claim follows.
- New admission FAILS: unchanged 10% forecast collector 2811.565578530s
  exceeds hard 2700s by 111.565578530s, with -4.132058% headroom versus 5%.
  Recorder 2416.468s, PCM 927872831 bytes, metadata 39599110 bytes and ten
  epochs fit their projections. Actual collector is 1005.634s, recorder
  610.536s. No new full attempt, margin exception or automatic pilot retry is
  authorized. All runtime/artifact leases are released to root after teardown.
  Evidence is under `checkpoint-q1/resume-final64-pilot/`; original PCM stays
  in ignored SDD. App RSS grows 234036 KiB and FDs 52, with up to ten missed
  sampler cadences; this proves neither a leak nor clean resource behavior.
- Next: retain exact-head cloud results for the diagnostic revision and
  investigate the pilot's fixed/cycle overhead and budget observations from
  existing raw evidence before proposing a bounded correction or measurement.
  `pilot_regression_triage` has source/evidence-only ownership of its report;
  no runtime lease. Complete Q1 before Task 10 freeze/implementation.
  Existing separate binaries and the Alive (Test) launcher need no change.

Existing pilot resource triage in `checkpoint-q1/resume-20261029/` separates
transient cohort changes from persistent Alive/WebKit growth. Last-only
processes explain 16 of the 52 extra FDs; the persistent Alive parent adds
36 FDs, whose targets are not captured. No concrete leak or clean-resource
claim is established; no resource diagnostic run has been authorized.

## Historical Shutdown Checkpoint, 2026-10-29

The user explicitly paused the goal. Stop here until the user resumes; the
active/running descriptions below are the preceding checkpoint, not live state.
Local final64 endurance was interrupted immediately by SIGINT: last completed
milestone 1792.759948156938 target seconds / ten cycles, wrapper exit 130.
Preserve it as partial evidence with no full-endurance, actual Quit or terminal
retirement pass. Recorder supervision reports requested_stop, 2010.001480597
seconds and 771764224 PCM bytes; all owned local processes are gone and all
native/GUI/audio/recorder/sampler/artifact leases are explicitly released.
Artifacts remain unchanged. Canonical interruption report is
`final64-local-endurance-01-report.md` in SDD; no retry was started.

Cloud polling stopped and its lease is released. Attempt-1 receipts remain
immutable. Already-submitted package attempt 2 was not cancelled: the single
shutdown check still has exact `0f1deae`, Intel Mac job `123186152452` building,
other three targets successful; final outcome unknown. Partial attempt-2
snapshots/hashes and `cloud-0f1deae-attempt2-report.md` are retained. CI on
`0f1deae` is terminal success in all three jobs. The user then authorized a
bounded shutdown cleanup while keeping the goal paused: preserve evidence,
save a local documentation checkpoint and leave the useful cloud job running.
The local checkpoint is intentionally not pushed because a push could cancel
that same-branch job. No app source or binary changed. Task 9 remains open;
no Task 10 implementation or contract freeze is activated.

## Historical Restart Checklist

1. Keep the goal paused until the user resumes. Start in this worktree on
   `feat/alive-session-host`; read `git status --short --branch` and
   `git log -3 --oneline`. The local shutdown checkpoint contains notes/evidence
   over pushed `0f1deae`, whose application inputs remain source `64fcacd`.
2. Once resumed, read GitHub run `40789537264` attempt 2 and retain its terminal
   receipt before any push. Attempt 1 failed only at Intel Mac artifact upload;
   no automatic further retry is authorized. Publication remains tag-only and
   outside scope. Final-head CI is already green at `0f1deae`.
3. All local leases are released and all old test PIDs are stale. Verify the
   existing binaries against `checkpoint-q1/final64-build/receipt.json` before
   choosing whether to reuse or rebuild. Alive (Test) already invokes this
   checkout's `apps/alive/run.sh`; no launcher/settings change is needed.
4. Review the interrupted attempt before deciding a fresh full measurement.
   Its 1792.759948 seconds cannot be topped up across a reboot or promoted to a
   completed thirty-minute run. The prior one-attempt planning exception is
   exhausted; preserve the failed 3.480731% pilot margin and all hard bounds.
   A new attempt requires an explicit controller ruling and current-backend
   admission, not an automatic retry or an 8-second continuation.
5. Complete Task 9's remaining qualification/delivery gate before activating
   Task 10. Unfrozen browser contracts and proposed decisions are preserved in
   `experiments/phase2-20261028/preparation/task10-contract-20261029/`.
   Use exact `gpt-6.1-terra` / high / fresh for future children; that ID has
   repeatedly succeeded despite omission from the advertised model list.

The interrupted run's 47 original files, including local-only PCM, are hashed
in `checkpoint-q1/final64-local-endurance-interrupted/manifest.json`; bounded
logs/JSON are retained losslessly compressed there. Original large audio stays
in ignored SDD and is not committed. New source review, pilot and cloud receipts
are also included in the local shutdown checkpoint. No background local job
needs to survive power-off.

Updated 2026-10-29. Read this before resuming after compaction. The implementation
goal was active before the pause; this file records accepted work, evidence
limits and the next incomplete gate. Use the execution checkpoint, not
historical planning text, to decide what to resume.

## Active Execution Checkpoint

Recovered 2026-10-29 after compaction. Current integrated application source is
`64fcacd2c454393e89526043fa57c6b2c8ec942f`; current pushed checkpoint is
`0f1deaecc34e8a54bc9b1ec136876831ebb132e5`. It contains Windows launcher
correction `4326b0bd6ba439566964761e47a7dbc09704a4f8` over diagnostic
`ece60909598ba4dcb26701e19e54b35592a06561`; Linux application inputs are unchanged.
`66249c5` adds the reviewed optional
cloud off/pilot/endurance dispatch to Ultra CI. `64fcacd` integrates the reviewed
two-file mixer-baseline packet `a31ecfd` byte-identically. The exact requested
`gpt-6.1-terra`/high model was accepted again for fresh reviewers in this recovery;
do not infer unavailability from the advertised model list.

The sole pre-correction endurance attempt is terminal exit 0: 1800.344707
target playing seconds, 3287 valid credited intervals, nine contiguous finalized
epochs, all eight observed error/budget/anomaly counters zero, stream retirement
and actual Quit. Root independently reruns the raw audit, verifies all 28
manifest entries including local-only PCM and decoded gzip hashes, and retains
`checkpoint-q1/endurance-01/root-audit.log`. The 2374.365s collector and 773152768
PCM bytes fit hard bounds. Both failed 5% planning projections remain explicit:
pilot headroom 0.824%, actual-run forecast 4.63079%. The one-attempt waiver does
not transfer to later source or cloud runs. This qualifies only f691/d507,
not the later device-intent or CSS changes. Software PipeWire 48kHz/512 only;
physical audio/underruns remain unmeasured. Observed app RSS grows 274980 KiB
and FDs 52; sampling missed up to 20 cadences, so this is neither a leak finding
nor a clean resource-growth claim.

All old Task 9 native/build/GUI/audio/AT-SPI/recorder/sampler/artifact leases were
explicitly released to root after teardown. Original f691 Alive/Ultra/module
files are preserved and hash-verified in
`.superpowers/sdd/2026-10-28-phase2-live-max/pre-final64-artifacts/`.
Coherent final64 build exits 0 in 145.216s; receipt is in
`checkpoint-q1/final64-build/`. Alive SHA-256 is
`741cc7ede7f76257f9caec8a8052d42aaa2a484e7a60ea662ce26e5a8851d1a1`,
Ultra `e793a74b6c2db82198f70de7c8a1c85fd72d5620969d2b5d42525739b48f2097`,
and module remains `9fd07611...` with new inode 8395136. The existing
`q1_checkpoint_integration` worker runs current root harness and exact binaries:
Master, original desktop with endurance 0 and separate mixer geometry all exit 0.
Root verifies initial/restarted executable and mapped module identities, complete
v5 file equality/gain 0.5, both nonzero PCM hashes, actual Quit and identical
collapsed/expanded/recovered geometry at both sizes. Evidence is curated under
`checkpoint-q1/final64-native/` (89 original entries; PCM local only).
The worker explicitly releases all runtime resources after teardown; root now
owns them. No final64 pilot, endurance or physical output is qualified.

Mixer correction: expanding one track's Device / track disclosure previously
shortened only its fader. An upward action overlay now preserves mixer flow
height. Four original rendered failures, four corrected cases and 12 integrated
affected Chromium cases are retained under `checkpoint-q1/mixer64/` with source
hashes and independent spec/quality approval. Native WebKit confirms layout and
close/recovery geometry; the subsequent bounded keyboard witness described
below also passes. It does not prove pointer hits on covered controls.
No new slots, device capacity or transport behavior is added.

Exact pushed 58be6da CI `40776217076` is terminal success in all three jobs.
Packages `40776217079` are terminal: Linux/both Mac pass, Windows fails, publication
is skipped. Receipts and CI rendered log are retained in `master/cloud-58be6da/`.
The Windows resolver fixture fails before any case executes. The original
combined cmd invocation emits a path syntax error
then `probe compile failed: 1`; this does not establish a production resolver
defect. Raw terminal Windows evidence is in `master/windows-fixture58/`.
A two-file failure-only launcher diagnostic is frozen in
`master/windows-fixture58-fix/candidate.patch.gz`. Fresh independent review requests
bounded stage/cleanup work; fix round 1 adds a shared 45s execution budget and
finite 5s owned-tree cleanup wait. Scoped spec/quality re-review approves its
source, retaining actual Windows timeout/tree/transcript gaps. It preserves the
original failure and has no Windows runtime result. Root verifies the frozen
patch and both resulting files byte-identically, then integrates as `ece6090`.
Do not label that packet a fix or infer fixture/cached/full-host qualification.

Fresh `git fetch origin` confirms protected release foundation `31033483` is
unchanged and remains an ancestor; the read-only receipt is in final64-build.
Alive (Test) still invokes this checkout's run.sh; launcher identity is recorded
without changing any desktop or environment setting.

The reviewed checkpoint is pushed normally. Draft PR #6 head/base/draft and exact
body were re-read and verified, with new native screenshots, local commands,
old/new source attribution, RSS/FD growth and failed planning margins explicit.
Latest exact-head CI `40789537429` is terminal success in all three jobs on
`0f1deae`. Packages `40789537264` attempt 1 fail only at Intel Mac artifact
upload, after successful compilation/package/checksum collection. Five
CreateArtifact requests time out; no Intel Mac artifact is delivered. Linux,
Windows and Apple Silicon Mac pass; publication is skipped. Root verifies all
11 stored/decoded/ZIP entries before authorizing exactly one same-head failed-job
rerun. Attempt 2 is queued as Intel Mac job `123186152452`. `q1_cloud_receipts`
owns its separate bounded attempt-2 collection/report under `master/cloud-0f1deae/`;
all attempt-1 files/report remain frozen. No additional automatic retry or
aggregate package pass is inferred; preserve the useful rerun before another
push. PR body hash is
`2e9a1b45dcc5e5d3fc16ebef7181c29dee0931c1c1b4b93efa0b7236acd18355`
after adding the local pilot refusal and new one-attempt exception. The exact
body/verification receipt is `pr6-0f1deae-endurance-running*` in canonical SDD.
Previous-head default CI `40782901995`, packages `40782901980` and manually
dispatched cloud pilot `40782963181` all use `0f3776c`. Default CI is terminal
success in all three jobs; packages are terminal failure solely at the Windows
compiler launcher (Linux and both Macs pass; publication skipped). The manual
pilot and all later native journeys are terminal success in all three jobs.
Fresh Terra `q1_cloud_receipts` completes and releases cloud receipt/raw-pilot
collection and audit under `master/cloud-0f3776c/`. Root verifies the exact
terminal statuses/heads, all 54 original files including local-only PCM and all
15 retained/decoded gzip files. The raw artifact proves
501.149688 playing seconds, 824 valid credits, five cycles, seven final epochs
and zero invalid/gap-action-crossing credit. The unchanged 10% forecast is
recorder 2766.802 seconds, collector 3478.125 seconds (both over hard 2700) and
PCM 1062408861 bytes (only 1.055% margin versus required 5%). Ten processing-
budget exceedances occur; seven other observed counters are zero. This pilot
does not admit endurance and does not measure physical underruns. Full ZIP/PCM
remain local/ignored; bounded raw logs, all-entry hashes and independent audits
are retained. This is AMD EPYC 7763 / four vCPU software PipeWire at 48kHz/512.
Observed aggregate app/children RSS grows 275004 KiB and FDs 30; Alive-only RSS
grows 84864 KiB. There are 15 app coverage-gap samples, maximum one missed
cadence, maximum sampler delay 0.154897s and duration 1.130722s. Keep sampled
growth separate from causal/leak or clean-resource claims. Cloud evidence lease
is released to root; no full-endurance dispatch occurs.

Actual Windows diagnostic run `40782901980` / job `123148786137` preserves the
original quoted launcher failure, then compiles the same probe through bounded
stdin with vcvars/rustc/cmd exits zero and output present. No fixture case runs
because the diagnostic correctly preserves the original failure. Separate
Windows Rust cached-capability tests pass. Root verifies four published hashes,
the ZIP report entry and decoded log hash in `master/windows-0f3776c/`.
Fresh Terra's two-file primary stdin candidate is frozen as `4fb8e3a` in `2bb3`
with independent spec and quality approval. Root verifies both files and diff
byte-identically, passes whitespace checks and integrates locally as `4326b0b`.
The old useful runs were terminal and their receipts retained before the normal
feature-only push as containing head `0f1deae`. Root verified all 65 selected
retained/decoded manifest entries and staged whitespace/Python AST. Curated source/reviews are in
`master/windows-stdin-launcher/`. Its brief/report/review package are
`windows-stdin-launcher-*` in the canonical SDD workspace. No candidate runtime
or interactive Windows host/audio pass is claimed.

Actual exact-head Windows job `123171010686` now succeeds: retained compiler
transcript has vcvars/rustc/cmd exits zero and probe output present, all six
direct resolver cases pass, and separate Rust tests are 284 passed / 0 failed /
4 ignored, including cached capability. These results do not establish an
interactive Windows host/audio pass or timeout/tree-cleanup failure behavior.
Full receipt collection remains with the cloud worker until Intel Mac finishes.

Next: retain the complete exact-head cloud/package receipts and the sole local
final64 full attempt. Final-source cloud endurance requires a
new same-source/backend >=500-proven-second pilot, raw audit and unchanged
10% variability/5% headroom policy. No old-source waiver transfers. Update draft
PR #6 after the reviewed checkpoint; preserve release foundation and PR #2/#5.

While cloud qualification ran, fresh Terra `task10_browser_reference` held the
exclusive local Wine/private-reference-display lease for two previously unobserved
Live browser/slot questions. This is reference preparation, not Task 10 source
implementation or contract freeze. Canonical brief/report are
`task10-browser-reference-{brief,report}.md` in the plan workspace. Attempt 1
stops after 53s on an overbroad recovery-prompt reading, is retained with complete
cleanup, and has Evidence ID
`ev_7914a5e7349c80a314d269b6ea0a5093587415e50d04596b81d0e2ad22e0643d`.
Root clarifies normal No in the disposable copy is already authorized by prior
Master-study practice, and permits exactly one corrected attempt within the
original remaining 20-minute window. No license/login workarounds or original
file changes. Corrected attempt observes selection versus double-click load,
no-match results, cell arrows/Escape and rename/duplicate results; Enter focus
and occupied Enter launch remain unproven. REA's client timed out without a
second Evidence ID; read-only retained-ledger recovery found only attempt 1.
Do not attribute its Evidence ID to attempt 2. Scoped XTest receipts/private
capture hashes and independent owned-process/source-preference cleanup are
retained in the derived report under `preparation/browser-reference-20261029/`.
The worker explicitly releases the reference lease. Fresh Terra
`q1_mixer_keyboard_witness` completes one bounded native/private-Xvfb/software
PipeWire run against unchanged final64 binaries, wrapper exit 0 and actual Quit.
Root audits raw identity/geometry/state JSON and current artifact hashes. At
both sizes sequential Tab/Shift+Tab/Return open/close and neighboring Harmony
mute pointer activation/restoration work; fader/M/S geometry remains identical.
Post-close direct fader/mute activation and covered-control pointer hits remain
unobserved. Evidence is in `checkpoint-q1/mixer-keyboard/`. The worker releases
all local runtime resources to root; no source or binary is changed.
Fresh Terra `final64_local_pilot` completes the new local pilot with wrapper
exit 0, 500.004730442 target seconds, 908 valid credits/no crossed gaps/actions,
four cycles, seven contiguous final epochs, all eight counters zero and actual
Quit. Root and fresh independent Terra audit hashes, current binary/module
identity and input equality. The 10% forecast is collector 2606.020260509s,
recorder 2272.023010172s, PCM 872407728 bytes, metadata 38834176 bytes and ten
epochs: all hard projections fit, but 3.480731% collector headroom FAILS the
extra 5% policy. `within_limits=false` is retained. App-tree RSS grows 261080
KiB and FDs 52; max missed cadences five. Keep sampling/causality limits.

NEW Ruling: root waives ONLY that extra planning margin for exactly ONE actual
final64/local/current-driver 1800-proven-playing-second measurement after the
fresh pilot and independent audit. This is not transfer of the old f691 waiver.
Cost if wrong is one bounded failed run and lost time; hard 2700s/1GiB/64MiB/
256-epoch/credit/action/disk/liveness bounds, original operations/assertions and
180-second dwell remain unchanged. No automatic retry, source/pacing/threshold
change or future waiver. Canonical `final64-local-endurance-01-brief.md` and
report govern. The same operator now runs that sole attempt, initial HEAD
`0f1deae`, all frozen build/harness/example hashes and inodes reverified. It
owns all local native/GUI/Xvfb/software-PipeWire/audio/AT-SPI/recorder/sampler/
artifact resources until explicit teardown/release. Root and other workers
perform only source/docs/cloud work. No actual full result or physical audio
qualification is inferred. Fresh `task10_contract_preparation` owns only a
read-only child-contract proposal incorporating new bounded reference facts;
Task 10 implementation and contract freeze remain gated on Q1.
The proposal is complete as `task10-child-contract-proposal.md` (184 lines),
with current Master ownership, corrected reference facts, atomic v4 create/assign
proposal and four routine contract decisions still unruled. This is preparation
only; do not dispatch Task 10 implementation while Task 9 gates are open.
Private reference captures stay private; publish only derived action/result
evidence. Tasks 1-8 remain accepted; Task 9 remains open.

Fresh final Q1 source integration review establishes no actionable finding in
the inspected `1ebf216..0f1deae` paths; it retains direct FULL/history witness and
runtime qualification limits. Root verifies the complete wrapper and inner diff
hashes and curates the report/triage under `checkpoint-q1/final-source-review/`.
Another exact `gpt-6.1-terra` / high / fresh dispatch succeeds for read-only
`task10_resource_contract`. Its report favors a verified durable per-user store
of the three original bundled sources using existing path/fingerprint wire,
avoiding AppImage mount paths without a v6 expansion. This is preparation only,
with storage integrity, trusted New-template rebinding and package/native restart
gates explicit. Current Tauri docs confirm resource maps merge keywise; the
release overlay alone does not prove effects missing from actual packages.
`task10-controller-decisions.md` records proposed controller choices in canonical
SDD; no Task 10 contract is frozen or implementation activated before Q1.

## Prior Checkpoint Detail

Latest integrated source is `71e61085ab3d486e30db5b9ca7929f737a3b7317`;
last audited cloud head is `58057f980afd3365e106433c7102cfc19450c130`.
Read actual refs for the containing documentation checkpoint. Root has reviewed Task 9
harness `d507866` integrated as `85adb2e`, Windows anchor metadata `3212065`
integrated as `fc320f5`, and Windows direct-resolver fixtures `8a83d13`
integrated as `210b37e`. All packets have independent spec/quality reviews,
exact blob checks and stated static validation. Windows runtime is pending.
Do not confuse source approval with complete Task 9 qualification.

The coherent Linux Alive/Ultra/module build remains pinned at `f69125c`, with
hashes/inodes below and in `checkpoint-q1/root-build/`. The existing
`q1_checkpoint_integration` worker in `bb01` owns exclusive native/GUI/audio/
recorder/sampler resources and the unchanged artifacts. Root performs only
source/docs/evidence/cloud work. Do not rebuild, replace binaries or start a
competing native job.

Task 9's original Master, Arrangement and clips/epoch journeys pass. Strengthened
Master-04 on `3f555cc` also passes: both views/sizes, complete v5 file equality,
non-unity gain, empty reopened history, exact initial/restarted identity and
nonzero software replay. Later `d507866` changes only dwell/test in that path.
Root verifies the retained identities/files/PCM hashes; original captures are
in `checkpoint-q1/master-04/`. Original editor-resource and standalone desktop
journeys now also exit 0 on the pinned pair.

Pilot 05 on `289c778` completes 270.007 proven seconds/four cycles, but its
projection is refused. Its 14 retained artifacts and omitted PCM hash are in
`checkpoint-q1/pilot-05/`; raw source is retained as local
`agents/phase2-task9-pilot05-289c778`. Five consolidated source findings are
fixed and both scoped re-reviews accept `d507866`; root applies all 11 files
byte-identically as `85adb2e`. Worker 44 focused tests and three exact CI
commands pass; root static AST/shell/whitespace/blob checks pass.

Pilot 06 on `d507866` completes 500.506 proven seconds/five cycles, 913 valid
credited intervals, seven contiguous final epochs, quiescent retirement and
actual terminal Quit. Root verifies raw hashes, advancing frames/same action/
running states, <=2.5s gaps with no crossed recorded gap/action, all eight
error/budget/anomaly counters zero and exact projected quantities. Actual
edit density is 6.713 actions per proven minute. The approved 180-second dwell
preserves every original operation/assertion and all hard limits; it further
reduces edit frequency, so keep 8/90-second pilots separate. Resource action/
playing labels are unsynchronized best-effort snapshots, not causal labels;
the driving-thread log alone governs credit.

The pilot's forecast with 10% variable allowance is 2677.751 collector seconds,
2343.586 recorder seconds, 899,872,495 PCM bytes, 39,193,202 metadata bytes and
10 epochs. No hard projected limit is exceeded, but the extra 5% planning margin
fails (collector headroom 0.824%): `within_limits=false` stays explicit.
Root Ruling: waive that extra margin for exactly ONE bounded unchanged-source
1800-proven-second measurement attempt. Hard 2700s/1GiB/64MiB/256-epoch and
credit bounds remain; no threshold/pacing change or automatic retry. Cost if
wrong is a bounded failed run and lost time; retain the failure and require a
concrete next decision. `task9-endurance-01` is now running on frozen `d507866`
and root artifacts. No endurance result is inferred. The canonical ledger and
current `task-9-report.md` govern live state.

Pushed `58057f9` CI `40769366285` passes all three jobs. Its packages
`40769366396` are terminal: Linux and both Mac targets pass, Windows fails and
publication is skipped. Terminal receipts and rendered CI logs are retained at
`master/cloud-58057f9/`. Prior `da7c6fb` full CI and Linux/both Mac packages pass;
Windows fails and publication is skipped. Preserve terminal receipts before
next push; no later-source cloud pass is implied. Draft PR #6 remains draft
against `build/ultra-desktop-releases`; body/head were verified after the push.

The actual `58057f9` Windows initializer diagnostic compiles and runs, then
fails 275 passed/9 failed/4 ignored: fresh empty cache uses a test-EXE-owned
address without the anchor export, while later helper/direct pointers belong
to the DLL and pass ownership/limits checks. This is instrumented evidence,
not proven instruction bytes or the prior unobserved cause. The reviewed
Windows-only explicit anchor DLL metadata and six-case direct fixtures are
local and await actual Windows CI. Direct fixture negatives are not cached-path
or full-host negatives. No owner/export/limits check is relaxed.

Fresh integrated source review on `1ebf216..210b37e` finds P1: effect bypass
captures its instance ID at click time but substitutes the post-Open generation
at queue execution, allowing an old click to alter a new project with reused
IDs. The adjacent structural chain helper has the same substitution. Fresh
Terra fixes only `alive.mjs`/`alive-dom.test.mjs` in candidate `d13f6e8`, covering
bypass, chain structure, track replace/remove/editor and selected editor.
Six successful-Open cases fail before correction; all 12 successful/failed-Open
cases pass afterward, retaining valid same-generation intent and live bypass.
Independent scoped spec/quality reviews have no findings. Root verifies both
files byte-identical and passes all 107 DOM tests, then integrates as `71e6108`.
Evidence is curated under `reliability/q1-device-intent/`. Workspace removal
shares the guarded branch but has no separate new regression; same-generation
revision changes also lack a dedicated new queue case. All native/build/browser
resources remain with endurance-01; no artifact is replaced. The changed UI
requires final artifact/native attribution, and the ongoing old-source run
cannot qualify it. Report/brief and recovery ledger entries remain canonical.

Completed pilot-06 and Windows source-review/diagnostic evidence is now curated
under `checkpoint-q1/pilot-06/` and `master/windows-anchor/`, with independent
Terra hash/source/credit audits. Root verifies all stored manifest entries and
decoded gzip hashes. Master-04 and pilot-05 retained manifests also verify.
Neither evidence bundle adds a native or Windows runtime result.

## Accepted Source And Earlier Evidence

Application source: `f69125cd289365424cd0661975291d8c12a96cac`, integrating
reviewed rejection-observation/Windows-diagnostic packet `7ff950f` over
`36b0b39` Task 8 UI and `c71b608` native Master. Tasks 1-8 are complete at their
recorded scopes; do not restart them. Root verifies all seven correction files
byte-identically, runs the full pinned native suite (exit 0, 187.411s), 286 Ultra
Rust tests with four ignored, and one Alive test. A focused loader trace proves
the corrected native module. Exact compiler, library hashes, commands and
terminal receipts are in `experiments/phase2-20261028/master/correction/root/`.
Earlier Task 7's 25-file audit and 186.425s native pass retain their separate
identity under `master/native/root-final/`.

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
above. Its containing pushed head is now
`f0f7871fa9b917fe566483c4dde5018ebd5e28a9`: CI `40751616984` is terminal
failure at the native Arrangement rejected-command increment assertion.
Native build/Rust, offline renders, the original Alive desktop journey,
Chromium and UI/reference tests pass; downstream native journeys skip.
Package run `40751616882` is terminal failure with eight Windows Master
capability/owner test failures although its direct resolver test passes.
Linux and both macOS package targets pass; publication is skipped.
Original logs and Arrangement failure artifacts are retained under
`master/cloud-f0f7871/`. Fresh Terra workers own read-only source/artifact
diagnoses of the two independent failures; neither has a source or local
runtime/build lease. Task 8's unintegrated UI is not attributed as their cause.
Draft PR #6 is updated and its head/base/body re-read and verified. Root keeps
new documentation/evidence unpushed until the next reviewed source checkpoint.

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
functional checks permitted Task 8; its final candidate is recorded next and
Task 9 remains gated.

Task 8's final UI candidate is now `5b10db9788d636ec2624fdc933293a1b9c8292e3`
on `c71b608`. Independent source spec review, scoped readability re-review and
fresh quality review find no actionable source issue. Root verifies all 11
source and seven final native screenshot hashes and integrates the packet
byte-identically as `36b0b39`; all 130 affected root Node tests pass. Worker final
evidence records 130 Node and 51 Chromium cases, both-size native v4/max-v3
layout/fader/admission/application checks and a separate playing observation;
reports, original red/green, captures and root audit are curated under
`master/ui/`. This is not a new root launcher, PCM, persistence, endurance or
final-head cloud pass. The UI worker explicitly released its resources and
source lease; do not redispatch its completed packet or overwrite the applied
root UI files.

Native correction candidate `7ff950f4ab7eba8b6a354084e948f1a801618e6a` on
`d025c91` reproduces V2/V3/V4 rejection freshness failures before correction:
each legacy getter exposes baseline+1 while the Master getter does not. Worker
full-native, 122 Rust session tests and the unchanged native Arrangement
journey pass. The preservation fix compares all returned legacy/combined score
fields except rejection across both refusals; an intentional device-revision
mutation fails the new assertion and restored V2/V3/V4 pass. Source spec,
scoped preservation re-review and fresh explicit Terra quality review have no
blocking finding. Root applies all seven files byte-identically, passes full
pinned native/Rust/Alive/loader checks and commits `f69125c`. The worker releases
all runtime resources. Correction evidence/reviews and hashes are under
`experiments/phase2-20261028/master/correction/`.
The Windows test-only production-anchor diagnostic includes its reviewed
early-return correction. Actual da7 Windows output proves both measured anchors
resolve to valid DLL exports while the cached capability is false; it does not
measure the actual initializer. The newer local `3ca670d` diagnostic traces
that missing path. Its Windows compilation/output and an evidence-supported
production fix remain pending.
The frozen Master contract now explicitly amends the contradictory rejection
tuple requirement: callback-owned score/Master fields remain coherent, while
the independently updated rejection count is sampled once after that tuple,
matching legacy semantics. Exact off-callback increments and unchanged musical
state are required. The ledger records the ruling and rework cost. Root's
integrated checks and complete app build pass. Task 9's existing worker now
owns serialized native/GUI/audio/AT-SPI/recorder/sampler resources, using the
root binaries pinned below; root performs source/docs/evidence/cloud work only.

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

The Master v1 contract and dated rejection-observation amendment are at
`docs/contracts/alive-master-v1.md`. Task 8 worker
`/root/p21_master_workspace_ui` used explicit `gpt-6.1-terra` / high in
`bb01`, handed off its final candidate and released all source/runtime
resources. Its canonical brief/report and root audit govern the applied
11-file packet. The native correction worker in `27be` and root have released
runtime resources to Task 9. No competing local workload or artifact rebuild runs.

The UI worker's first partial producer report was not an acceptance candidate;
root renewed the same lease to finish the full packet in place. The final
complete packet is integrated as `36b0b39`. Read the canonical ledger/current
report rather than inferring completion from focused Node tests.

The separate two-file sustained-measurement helper is accepted at GI-free scope as
`d025c91a7b8341ad1ca4525b265cdc7ed147bd79`, integrating reviewed `07f1d9d`
byte-identically. Original spec/quality findings and both fix rounds are retained;
root independently passes 18 new/four selected existing tests. Evidence and
source hashes are under `experiments/phase2-20261028/master/collector-support/`.
Its caller must explicitly identify process disappearance and supply actual UI
observations, bounded sampling/recorder cleanup and health checks. No existing
driver or CI step changed in that packet. The existing Task 9 worker now prepares
the actual driver/CI source and tests in `bb01` and has the explicit native
runtime transfer. Pilot/endurance/terminal Quit remain unqualified. Do not redispatch the completed
helper packet.
The next user-testable checkpoint is a real saved native Master with closer
Live Session/Arrangement composition, not another standalone instrument.

The completed coherent root build is now `f69125c`, with exact commands/hashes/
device/inode receipt in `experiments/phase2-20261028/checkpoint-q1/root-build/`.
Alive SHA-256 is `2bfdfb4c260cf32d6ba6749bf0ded2165e2f8b0ca728777db804f49a8c4782b9`,
adjacent Ultra is `9e95b66306b74ad015065bdbe1bfc93acad8b970ef7d091ad2e573320bf773d9`,
and adjacent native module is `9fd076115b2a914fa2d156dab37b0a1d99676d40634e23f78ba2c50c110062c4`.
The existing Alive (Test) entry is verified to run this checkout's run.sh;
no launcher configuration changed. Previous artifacts are preserved under
`.superpowers/sdd/2026-10-28-phase2-live-max/pre-q1-launcher-artifacts/`.
Task 9 owns these fixed artifacts for its native/pilot/endurance work; do not
rebuild or replace them while leased. Endurance and physical output remain
unqualified. Continue subsequent bounded
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
- Accepted application source: `f69125cd289365424cd0661975291d8c12a96cac`.
- CI/packages-qualified foundation: `3b3df87572722d2349d0725f4059cfc4afd467ae`.
- Release foundation: `31033483eb3baf15edab1734b966cc6d55c4b8c7`.
- Draft PR: #6, targeting `build/ultra-desktop-releases`.
- Do not edit/merge active release branches, PR #2 or PR #5.

Root is curating `PLAN.md`, this handoff, the reviewed browser-only test and
`experiments/phase2-20261028/{master,reliability}/`; those changes are intentional. Check
actual HEAD/upstream for the containing evidence checkpoint and fresh cloud
statuses. Root has committed the exact reviewed UI packet; the explicit
Master-contract amendment and seven-file correction are committed as `f69125c`;
curated evidence/docs are still uncommitted. Preserve both workers' `.superpowers`, `r-u`
and test-result evidence. Review/candidate
ancestry is retained under local `agents/phase2-*` refs. Commit only intended
paths, preserving user work and private reference material. No destructive cleanup.

## First Runnable Work

Read the canonical ledger and reconcile the active Task 9 native worker;
the final Task 8 packet is integrated as `36b0b39` with root affected tests green.
Do not dispatch another UI writer or restart accepted Tasks 1-8. Root's final Task 7
native/Rust/Alive checks and earlier Task 6 pinned contracts are terminal exit 0
at their recorded source, with receipts under the native/saved-owner evidence.
The staging regression
is now an explicit CI step; v5 and legacy conversion notices reflect the actual
wire and dirty detection uses the score transition, preserving saved notices.

Root may update docs/evidence/draft PR and inspect cloud statuses while native
work runs. Final qualification requires the final pushed head; the old full
foundation CI/packages cannot qualify Task 6 or later native/UI source. Fetch
and reconcile the release foundation again before final testing. No merges.

Task 8 source spec/quality and final worker evidence are audited and its exact
packet is committed after affected integrated tests pass.
Native correction `7ff950f` is reviewed, verified and integrated as `f69125c`.
Push the containing evidence checkpoint for actual Windows diagnostics, which
must run on the actual Windows runner
before claiming a cause or production fix. Preserve the pure DTO/model contract
and original history/Prepare/Apply/scoped Stop/Quit regressions. Task 9 owns the coherent local build, both
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
does not qualify endurance. Task 9 now has the explicit runtime transfer and
exact root artifacts; inspect its current report before dispatching anything.

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

The completed coherent local build is `f69125c`, with exact artifact identities
recorded above. Its native checkpoint qualification is in progress. Existing commands are `bash apps/alive/build.sh`,
`bash apps/alive/run.sh apps/alive/examples/midi-arrangement.alive` and
`bash apps/ultra/run.sh`. The Ultra desktop launcher points to another checkout;
use the explicit current-checkout run command for qualification. Do not rebuild
while Task 9 owns the pinned artifacts.

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
