# Task 12 Saved Clip Integration Report

Status: implementation and focused UI receipt fixes are committed; local checks
and the rebuilt final-source native clip journey pass. Source work is complete.
Independent scoped re-review, pushed-head CI/package results and final task
acceptance remain parent-owned.

## Scope And Source

- Task 12 source checkpoint: `ecfed29fcaa4306568fe5041a962187da7296bfb`.
- Receipt-presentation fix: `93879f5` (two UI/test files only).
- Separate Tauri verbosity diagnostic: `813ba7645491346a7b87e419033f3d3e8825ddb4`.
- Prerequisite portable bit-operations fix: `fdcdd1b`. It changes native helpers
  only, preserves scheduler policy and is a separate commit; its v3/v1/v2 guarded
  tests passed. Parent reports all three CI jobs and the Windows/MSVC package
  passed on that prerequisite. Those are prior-checkpoint results, not Task 12 CI.
- Approved inputs: Task 12 brief/integration design, accepted Task 11 and
  stopped-reducer fix, shared-source recovery investigation, existing UI contract.
- Scope stays 2 tracks / 6 devices / 8 clips, four fixed slots per track. No scenes,
  eight-track admission, scheduler redesign, DSP copy, telemetry project, user
  settings change, merge, release or deployment.
- Parent-owned PLAN/ledger/experiment changes remain unstaged and untouched by
  this implementation commit. The source/build freeze excludes that expected dirt.

## Implemented Behavior

`session/clips.rs` introduces explicit `Document::{LegacyV2,ClipsV3}` with strict
v3 wire structs, exact four-slot arrays, required nullable defaults and a recursive
original-text duplicate-member pass, including parameter-map keys. Legacy v1/v2
persistence decoding retains its direct original-text behavior. The old common
track/device data remains shared internally; serialized v3 tracks have no legacy
notes/automation fields. IDs use the specified namespace grammar and whole-session
uniqueness. Migration keeps authored numeric values, hashes, track/device IDs and
chain/live fields, with length-prefixed SHA-256 clip/note identities. Tests include
literal independent expected IDs for track-1 and its first note.

Rust owns create/duplicate/delete/rename/length/default/noteCreate through the
existing focused history gate. New IDs check current draft, prepared score and
retained history. Duplication copies score IDs independently while retaining
device instances. Deletion preserves the empty slot and clears a deleted default.
Whole-document v3 edits validate exact current slot/default identities and note
membership. Undo/redo restore score identities without reinstalling DSP. Aggregate
128-note/16-lane/256-point limits include every stored clip and disabled lanes.

`session/prepare.rs` compiles independent contiguous clip event ranges with exact
single-expression frame rounding and enabled-empty-lane ownership. The legacy
compiler/density path is retained. `session/host.rs` uses the committed ABI and
explicit 2x4 profile/work policy/NONE/defaults, checks the admitted limits and
maps native diagnostics immediately against candidate identities. Conservative
envelopes and saturated counts are labeled honestly. Root/preparation revisions
advance for attempted installs and restoration, with exhaustion guards.

Open/New/startup first admit a playable legacy candidate, then attempt v3 with
the same captured graph/dependency data. A stricter v3 refusal retains the
playable v2 candidate with its reason. Invalid explicit v3 never downgrades;
missing/changed sources remain normal failures. Successful conversion is dirty
in memory and Save writes v3. Explicit stopped Enable clip bank retries fallback;
Save and normal Apply do not silently retry. Save returns the exact successfully
written/rebased document, preserving mode, history and editor bindings.

`session/runtime.rs` retains bounded request observations, matches both request
identities, preserves queued until consumption, and marks missed results
unavailable. Native owns receipt reservations. Snapshots expose mode, bounded
capabilities, prepared persistent IDs and native runtime state. Native u64 fields
and snapshot sequence use canonical decimal strings; renderer ordering uses a
strict BigInt helper independently of JS-safe desktop numeric counters.

Main-window commands authenticate generation/preparation, resolve prepared clip
IDs and submit single-track actions only. Global Stop remains available with
stale view identities and uses the reserved native Stop epoch. Audio-off track
actions refuse with Start Audio guidance. Stopped Launch cues without starting
transport; playing Launch and track Stop follow native quantized boundaries.
The UI distinguishes selection, saved default, prepared version, active clip and
pending request. Draft-only Launch is disabled. Existing editors survive score
draft/history, selection, launch, Stop and Save As; successful Apply/structure
keeps the existing editor-close boundary.

The UI preserves the established compact desktop language, four slot controls
per track, separate Select/Launch, per-track Stop, selected clip length and
global Transport length. Delayed edits capture track/clip/note IDs and local
scope; result focus applies only when its selection token is still current.
Rejections refresh authoritative numeric controls. README, SESSION_CONTRACT and
PRODUCT describe v3/fallback, strict source recovery, runtime/default separation
and practical observed buffers >=256 without changing audio settings.

## Shared-Source Recovery

Dependency checks group canonical paths, including symlinks, and preserve strict
per-instance hashes. Selected Replace failure uses the original dependency group
as well as candidate stale references, so it still identifies a blocking sibling
when the selected candidate is the only newly captured reference. The guidance
requires preserving the changed file at a new path, restoring a matching original
backup at the shared path, and explicitly replacing each intended instance.
It states that a matching original backup is required; copying alone or trying
siblings in turn is not general recovery. Replace retains its existing new-ID,
default-base/bypass and lane-removal behavior; it never refingerprints siblings.

Focused regressions check either selected failure, unchanged draft/history/model,
and sequential preserved-copy/restored-original recovery. The earlier actual
native2 journey completed both selected failures and both successful replacements.
The final harness additionally checks an existing hosted effect editor survives
both failed replacements and closes at successful replacement.

## Verification At The Frozen Checkpoint

| Check | Result | Evidence |
| --- | --- | --- |
| Focused session Rust tests | 46 passed | `/tmp/alive-task12-final-focused.log` |
| Full shared Rust library | 187 passed, 2 ignored | `/tmp/alive-task12-rust-final.log` |
| All UI/component Node tests | 486 passed | `/tmp/alive-task12-ui-final.log` |
| Chromium Alive browser suite | 5 passed | `/tmp/alive-task12-browser-checkpoint.log` |
| Harness Python syntax | passed | `python3 -m py_compile` on three changed harnesses |
| Diff whitespace | passed | `git diff --check` |
| Separate Alive Cargo check | passed | `/tmp/alive-task12-alive-check.log` |
| Atomic release build | passed | `/tmp/alive-task12-release-final-build.log` |
| Exact-build saved-clip native journey | passed, exit 0 | `/tmp/alive-task12-native-final.log` |
| Exact-build retained full native journey | passed, exit 0 | `/tmp/alive-task12-retained-final.log` |
| Repeated hosted editor resources on ecfed29 | passed, exit 0 | `/tmp/alive-task12-editor-resources.log` |
| Final UI/module suite after receipt fix | 491 passed | `/tmp/alive-task12-ui-receipts-final.log` |
| Final Chromium Alive suite | 5 passed | `/tmp/alive-task12-browser-receipts-final.log` |
| Release-wrapper diagnostic tests | 17 passed | `/tmp/alive-task12-release-diagnostic-tests.log` |
| Final 813ba76 atomic release build | passed, exit 0 | `/tmp/alive-task12-release-receipts-build.log` |
| Final 813ba76 native clip journey | passed, exit 0 | `/tmp/alive-task12-native-receipts-final.log` |

Rust coverage includes strict wire fields/nullability/duplicate members/IDs and
disabled aggregate limits; deterministic migration; fractional beats/roundtrip/
Save As; independent ranges and empty lane ownership; focused score duplication,
history and whole-document bypass rejection; shared-source failures/recovery;
both-key receipt matching and u64 overflow strings; and native v3 ABI fixtures.
The native-host child-process test installs a real v3 bank, observes stopped
defaults, renders a queued request through 512 frames to APPLIED, and exercises
real legacy graph fallback (reason 17), explicit invalid-v3 refusal and legacy
save/reopen. Its real density fixture has 20 simultaneous notes on each of two
tracks at dispersed legacy beats; v2 passes while v3's conservative envelope
refuses conversion without modifying the score.

UI coverage adds late same-revision/preparation snapshots, >2^53 native values,
four slots, separate launch/selection, persistent note identity, captured queue
identity and delayed-result focus. Browser coverage uses actual Chromium with
its sandbox and includes 900x660 desktop no-overflow and retained device controls.
The retained full desktop/input harness now resolves v3 slot selection and score
storage while keeping all original numeric, GTK pacing, native input, reorder,
audio, editor, failed-Open and Quit/history guards. The new saved-clip journey is
an additional CI step with its own always-uploaded artifact, not a replacement.

## Test Development And Earlier Attempts

Red-stage logs are retained at `/tmp/alive-task12-wire-red.log`,
`/tmp/alive-task12-compile-red.log`, `/tmp/alive-task12-history-red.log`,
`/tmp/alive-task12-source-red.log`, `/tmp/alive-task12-ui-model-red.log` and
`/tmp/alive-task12-ui-slots-red.log`. Some Rust red stages are missing-symbol
compile failures, not assertion failures. Native/runtime integration checks were
added after the implementation and first passed; no red-first claim is made for
those checks. Subsequent strict/focus regression additions are reported as such.

The first actual native attempt `/tmp/alive-task12-native` failed its short-length
error assertion after reaching duplication/edit/history/editor continuity. The
error exposed f64::MIN_POSITIVE as an unreadable decimal and the rejected input
was not refreshed. Product code now explains that clip length cannot truncate a
note and refreshes authoritative controls. That failed evidence is retained.

`/tmp/alive-task12-native2` is an unchanged earlier passing journey from build2,
not the final committed-build association. It covers New/save v3, shared effects,
hosted live edits, duplicate/edit/undo/redo, failed truncation, create/add/delete/
undo, saved default, Apply/editor boundary, stopped cue, quantized launch, track
Stop while Harmony continues, global Stop, Save As/editor continuity, stopped
reopen default, both shared-source failures and sequential recovery. It captured
318976 finite frames (6.6453s), peak 0.2225944549, requested/observed 512 on private
software PipeWire. Its report and PCM remain in that directory; the final journey
uses a new directory rather than overwriting it.

## Visual Review

Earlier real native initial/stopped/recovered captures were inspected and one
track-grid placement defect fixed using `.track.clips-track`. The bounded browser
and native confirmation retained the existing visual language. The mechanical
Impeccable detector ran once after implementation; output is
`/tmp/alive-task12-impeccable-detect.log`. It reports two inherited compact type/
font findings and twelve color advisories. These concern established 12px desktop
roles and existing palette/documentation drift; no redesign or unrelated design
metadata repair was introduced. This is not a claim of a comprehensive WCAG audit.

## Final Build Association And Native Results

The final build uses source commit `ecfed29fcaa4306568fe5041a962187da7296bfb`.
`/tmp/alive-task12-native-final/build-provenance.json` records the complete tracked
source-file SHA-256 map for native/Alive/Ultra runtime/UI/tests and confirms no
source diff at build association. Expected parent-only PLAN/evidence dirt is
excluded. `bash apps/alive/build.sh` completed successfully and retained atomic
native-library publication. Both build/check show only the existing unrelated
`reserve_native` dead-code warning.

| Artifact | SHA-256 |
| --- | --- |
| release `alive` | `eb6674c723b5221c46eebb949da69b90456d87ea3dda03bddbe11c23ea01cc03` |
| release `ultra` | `919a8ed562217862cae7367110020c06e5c27126af3603a15ba505c0ad2f8df7` |
| adjacent `libultra_native.so` | `bc7df392ce0bad1a6500268ee16bd0e013ffff5c891656584d58f4fc27df6dce` |
| build `libultra_native.so` | `bc7df392ce0bad1a6500268ee16bd0e013ffff5c891656584d58f4fc27df6dce` |
| `check_alive_clips.py` | `a0908aa237a346120429d098f39e701b6931ffbc08a034eb0fa367196afbd111` |
| `check_alive_desktop.py` | `36f291c6c1a3e966d45c5ccef68f79215db4aa0b98e805793c3bbb99f975ac5d` |
| `check_canvas_desktop.sh` | `5034207dfc73254374aee50ae18ad444bbbc42e1f1bde06864342735c14ed8d5` |

The exact-build clip journey passed with exit 0. Invocation:

```sh
ULTRA_TEST_ALIVE=1 \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_clips.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-task12-native-final
```

Its `native-clips-report.json` confirms every prior native2 journey assertion plus
`failed_shared_replace_editor_continuity: true`. Saved `initial-v3.alive`,
`clips-prepared.alive`, `moved/relocated.alive` and both `recovered-*.alive` files retain
inspectable wire evidence. `clip-observations.json` directly records:

- `Cued Clip 1 / request 2 applied` with transport stopped.
- `Playing Clip 1 / request 4 pending / pending launch at frame 359314`.
- `Playing Clip 1 copy / request 4 applied` after native boundary consumption.
- `Stopped / request 5 applied` for Pulse while Harmony remains `Playing Clip 1`.
- `Cued Clip 1 copy` after reopening, with transport stopped.

Requested and observed private software PipeWire buffer were 512 at 48 kHz.
Captured PCM contains 315904 finite frames / 6.581333 seconds, peak
0.2225944548845291, SHA-256
`b5d802e84d2e74489e11b473eb567e8ee4797cf1ff56708b7e2dca36c3878c45`.
Final polled errors/rejected commands are zero and voices/transport stopped;
the final audio-off callback counters reset to zero and must not be presented as
complete totals. Native input/window evidence and screenshots remain in the
same new directory. The prior native2 directory is untouched.

The retained full journey passed with exit 0 using `check_alive_desktop.py` and
`/tmp/alive-task12-retained-final`, with log at the sibling `.log` path. Its
`native-session-report.json` confirms original chain/base/automation/source/file/
history/editor/native-input guards and final Quit behavior, including accepted
Apply followed by outer Quit cancellation, accepted Discard followed by canceled
Save picker, native window-close dirty guard, cancel retaining edits/playback and
final discard/exit. PCM has 2853376 finite frames / 59.445333 seconds, peak
0.35335424542427063, SHA-256
`15c526f3fbd5af5103c8b6d1b6c0856caa2a14bc015f8dcb95c8bd5482366219`.
This is the standard journey without the optional ten-minute endurance phase.

The existing hosted-editor resource harness passed eight close/reopen cycles
and its idle check on ecfed29 in `/tmp/alive-task12-editor-resources`. WebKit
worker count remains one; descriptors are 154 after the first close and 153
after idle. PSS rises from 458055 KiB after first close to 505788 KiB after idle,
within its existing 384 MiB bound. No resource threshold or teardown behavior
was changed to obtain this result.

## Receipt-Presentation Follow-Up

Self-review found that asynchronous WORK_LIMIT displayed numeric `reason 12`
without the requested clip or actionable recovery, despite immediate refusals
having guidance. A new DOM test reproduced that exact assertion failure in
`/tmp/alive-task12-async-notice-red.log`. Shared request formatting now displays
the requested prepared clip, human reason, retained prior playback/pending state
and explicit retry-after-audio guidance. It does not invent native contributor
counts or retry automatically.

Independent review additionally identified discarded Start/Seek RequestResult
values and omitted trackless asynchronous receipts. Four new tests reproduced
the misleading `Transport playing.` / `Transport seek queued.` strings and
the risk of immediate QUEUED hiding a matching APPLIED publication; red evidence
is `/tmp/alive-task12-transport-notice-red.log`. The follow-up reports transport
results, renders changed trackless receipts through Session status, and prefers
a coherent publication matching both preparation and serial. All 45 DOM tests
pass in `/tmp/alive-task12-transport-notice-green.log`. Committed as `93879f5`.
Full current UI/component suite: 491 passed in
`/tmp/alive-task12-ui-receipts-final.log`. Actual Chromium Alive suite: five passed
in `/tmp/alive-task12-browser-receipts-final.log`. These are later-source results;
the earlier 486-test/browser logs remain attributed to ecfed29. The five new
regressions cover async clip WORK_LIMIT with unchanged active/pending state,
immediate Start and Seek refusal, queued-to-async trackless refusal with no
retry, and newer matching APPLIED publication taking precedence over immediate
QUEUED. Rust/native scheduler, desktop ownership and harness code are unchanged.

Self-review checked that transport feedback comes from RequestResult/native
publication, matches preparation and serial, shows asynchronous terminal changes,
does not repeatedly overwrite status for unchanged observations, and never
retries. The shared formatter is used by immediate and polled track results;
known clip context comes from prepared metadata. Global Stop retains its native
reserved path and the UI now says stop requested rather than inferring receipt
application. Independent review of this focused fix is pending.

### Separate Packaging Diagnostic

Commit `813ba7645491346a7b87e419033f3d3e8825ddb4` inserts exactly `'-v'` before
`'build'` in the existing `release.py` Tauri invocation. It follows the verified
pinned CLI 2.8.4 parser/source diagnosis and leaves release flags, bundle targets,
signing, verification and publish gates unchanged. It does not set environment
fields or fix the unknown Intel DMG failure. The next authorized Intel package
job must provide the original child failure evidence before a functional fix.

`python3 apps/ultra/scripts/test_release.py`: all 17 tests passed, log
`/tmp/alive-task12-release-diagnostic-tests.log`.
`python3 -m py_compile apps/ultra/scripts/release.py apps/ultra/scripts/test_release.py`:
exit 0, empty success log `/tmp/alive-task12-release-diagnostic-syntax.log`.
No literal-argument-only test or blind CI rerun was added.

### Rebuilt Final Source

`bash apps/alive/build.sh` passes on `813ba76`, log
`/tmp/alive-task12-release-receipts-build.log`, with only the same existing
`reserve_native` warning. The updated source/build manifest is
`/tmp/alive-task12-native-receipts-final/build-provenance.json`, and it records
an empty source diff. It includes the runtime/UI/native/harness and packaging
source hashes. The adjacent/build native library and harness hashes remain
identical to ecfed29; only embedded app UI binaries change:

| Artifact | Final SHA-256 |
| --- | --- |
| release `alive` | `d085dc968a2bbea65df1f72106ea990b07ebba718cf3f23a7cc02694e973bd09` |
| release `ultra` | `730c85e890f0ec5f45704bf8433b5610eee4ff52b50e9761972f948c8c94ccfd` |
| adjacent `libultra_native.so` | `bc7df392ce0bad1a6500268ee16bd0e013ffff5c891656584d58f4fc27df6dce` |
| `release.py` | `10377d41bcb00806cb223aee08afabb970bbe7eb9dcedb1623e150d7e34a8727` |

The final native clip confirmation passed with exit 0 in the new directory
`/tmp/alive-task12-native-receipts-final`, with sibling `.log`. Invocation is the
same clip harness as above with that new output path. No earlier output directory
is overwritten. The initial ecfed29 retained full journey, Rust, native and
editor-resource results remain precisely attributed to that checkpoint; they
are not repeated for this UI formatter/packaging diagnostic change without a
new concern. All recorded build/harness artifact hashes were recomputed after
the journey and remain unchanged. Independent scoped re-review is pending.

The final report again confirms stopped cue, native pending target then applied
switch, Pulse Stop with Harmony continuing, unchanged editor bindings through
draft/history/Stop/Save As, editor close on Apply/reopen/successful Replace,
stopped saved-default reopen, both selected shared-source failures and both
successful sequential recovery steps. The changed UI appears in native text:
`Playing Clip 1 / request 4 pending for Clip 1 copy / pending launch at frame 358290`,
then `Playing Clip 1 copy / request 4 applied for Clip 1 copy`. This journey
qualifies the changed real view; it does not force native queue/work pressure.
Those presentation refusals are the focused DOM regressions backed by the
existing native scheduler/receipt tests, not claimed physical pressure injection.

Final captured audio: 318976 finite frames / 6.645333 seconds, peak
0.2225944548845291, SHA-256
`1632fa19f6b3496baf2cb9d4acadaf8b1ec13723c0d57e5200c4fde6ce57db10`.
Requested/observed buffer remains 512, rate 48000, software PipeWire only.
Final stopped polled errors/rejected commands are zero; audio-off counters are
reset and are not cumulative totals. App/startup logs contain only the existing
MESA-EGL DRI3 software-Xvfb warnings; the wrapper retains its private-session
portal/Wayland-compositor warnings as well. No logs or warnings were suppressed.

## Limits And Follow-Up Ownership

- Real desktop verification uses private Xvfb, D-Bus and software PipeWire at
  48 kHz. It does not qualify physical device latency or physical underruns.
- Polled zero exposed stream/native errors are observations only. Driver counters
  reset on Stop, so these are not complete per-epoch or cumulative error totals;
  lifecycle/telemetry coverage belongs to Task 13a.
- Asynchronous WORK_LIMIT has receipt reason/request identity and retry guidance,
  not invented synchronous contributor counts. Full contribution diagnostics are
  prospective-bank admission data under the existing native ABI.
- Native policy and timing matrix are unchanged by Task 12; the portable-helper
  prerequisite reran guarded native v3/v1/v2 tests. No additional broad timing
  qualification is claimed here.
- Final Task 12 CI/package results and independent review are parent-owned and
  remain separate from local source checks. Capacity expansion belongs to 13b.
