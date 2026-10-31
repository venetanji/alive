# Task 1: Session Workspace And Shared Shell

Status: Task 1 implemented, verified and committed; ready for independent review.
Source commit: 238c427708a0de9790a4c8e5d95aa06045b1cac5. Base: c511f14. Branch: feat/alive-session-host.
This is the Task 1 transitional Session increment. It does not complete the
Arrangement/audio product goal or establish Arrangement playback.

## Owned Changes

- `apps/ultra/ui/alive.html`: shared top navigation, collapsible browser, Session
  board/right scenes, truthful Arrangement capability gate, resizable selectable
  Clip/Devices detail, numerical note/automation inspectors.
- `apps/ultra/ui/alive.css`: existing charcoal/Liberation Sans controls with true
  track columns, four stacked slots, matching scene-row geometry, per-column
  mixer, internal scrolling, compact target-viewport proportions.
- `apps/ultra/ui/alive.mjs`: mount the presentation-only workspace controller;
  group the existing controls into mixer/secondary track inspector; keep all
  native commands, stable IDs, selection, receipt wording and editor ownership.
- `apps/ultra/ui/alive-workspace.mjs`: local view/browser/detail state, plain Tab
  outside controls, normal modified/control Tab, pointer/keyboard resize and
  cancellation. Resize maximum derives from actual shell/chrome dimensions.
  Unfinished Session fields are parked during navigation: hidden-input blur
  cannot publish a native edit or let polling replace the string. A later user
  change/blur commits the parked value normally and exactly once.
- `apps/ultra/ui/alive-dom.test.mjs`: five new functional tests; all 49 original
  assertions/tests remain. Adapter now supports document events/static text.
- `apps/ultra/tests/ci/alive-chain.spec.mjs`: retain original checks and navigate
  the now-secondary inspectors; add eight-column/four-scene geometry at both
  viewports, unfinished tempo/gain navigation, and maximum detail reachability.
- `apps/ultra/tests/alive_workspace_navigation.py` and `check_alive_desktop.py`:
  navigate the new Clip/Devices/inspectors before original native actions and
  close occluding diagnostics. Original native behavioral assertions remain;
  piano keyboard focus is explicitly restored after reading the note inspector.
- `.impeccable/surfaces/alive-session.md`: precise Operate surface context;
  earlier two-track/no-scenes exclusions are stale, and native capability bounds
  remain authoritative. Ultra patcher DESIGN.md was not changed.

Parent-owned PLAN.md, PRODUCT.md and apps/alive/README.md are excluded from my
commit. No Rust/C++/native contracts/examples, desktop settings, persistent audio
settings, cloud sessions, subagents, PR or ledger were changed by this worker.

## Red / Green Evidence

All raw evidence is under `/tmp/alive-workspaces-task1`.

1. `node --test apps/ultra/ui/alive-dom.test.mjs`
   - `red.log`: 54 total, 49 original pass, five new workspace tests fail because
     the workspace/controls/mixer grouping do not exist yet.
   - `green-focused.log` from DOM/model/piano combined: 64/64 pass.
2. `node --test apps/ultra/ui/*.test.mjs apps/ultra/ui/components/*.test.mjs`
   - `full-ui.log`, then `full-ui-final.log`: 500/500 pass, zero skipped/failures.
3. `apps/ultra/tests/ci/node_modules/.bin/playwright test --config apps/ultra/tests/ci/playwright.config.mjs alive-chain.spec.mjs --output /tmp/alive-workspaces-task1/browser-first`
   - Initial browser pass: seven pass, one fails because view-button pointer
     focus blurred the unfinished tempo field and emitted `alive_edit`.
   - `browser-confirm.log`: 8/8 pass after preventing that focus handoff.
4. Focused browser regression with `ULTRA_TEST_NO_CAPTURES=1`:
   `... playwright test --config ... alive-chain.spec.mjs --grep 'maximum detail|unfinished gain'`
   - `browser-resize-red.log`: both fail. Hidden gain changed 0.85 back to 0.7;
     maximum detail bottom 813 exceeds footer top 762.
   - `browser-gain-red.log`: explicitly proves the hidden gain emitted unwanted
     `alive_mixer` with gain 0.85.
   - First fix retained in `browser-resize-green.log`: still failed, preserving
     evidence of a one-pixel border omission and lost repeated-park commit flag.
   - Final `browser-final.log`: all 10 Alive browser tests pass, including no
     mutation during three hidden-gain round trips and exactly one later user
     commit, plus maximum detail entirely above footer and workspace >=150px.
5. Native screenshot inspection found the 40px track header flex-shrank its title to 9px despite 16px text content. `browser-header-red.log` proves the clipping; fixed only header interior padding/gap and explicit nonshrinking 14px/12px line heights. `browser-header-final.log`: all 11 Alive browser tests pass. The outer header/scene geometry remains unchanged.
6. `python3 -m py_compile apps/ultra/tests/alive_workspace_navigation.py apps/ultra/tests/check_alive_desktop.py`
   and `git diff --check`: pass.

## Actual Release And Native Evidence

Build command: `bash apps/alive/build.sh`; final log `build-header-final.log`, exit 0.
The script stages a fresh native library inode before replacing the installed
path; it does not overwrite a mapped library inode. Existing Rust dead-code
warning remains in the log. Final release native library equals the prior
build byte-for-byte; only embedded frontend assets changed.

Final binary SHA-256:

- alive: `a506e4364a8b4b3c784c8e5f8a837578098acef0bb5eaca9147fcac86f7c42c4`
- ultra: `ef51cc6f43927c35e651e2efed60100791422911cefc6beb711ba1d02bab311a`
- libultra_native.so: `4c54e3e0a2e7bf2007a56620d1006658e97b86d5f8828e08f13e9ffd3a1e9e70`

`provenance.json` pins the actual HTML/CSS/modules/tests, native release files,
original harnesses, navigation adapter, temporary focused script/private wrapper,
and exact legal eight-track fixture. `provenance-pre-resize-fix.json` retains the
older build/source identity. Native-attempt directories must not be presented
as the final build. Commit identity is added after the final gate.

Final focused native command:

```bash
ULTRA_TEST_ALIVE=1 \
ULTRA_TEST_SCRIPT=/tmp/alive-workspaces-task1/native-check.py \
ULTRA_TEST_ALIVE_SESSION=/tmp/alive-workspaces-task1/eight-tracks.alive \
bash /tmp/alive-workspaces-task1/private-desktop.sh /tmp/alive-workspaces-task1/native
```

The temporary wrapper is the existing `check_canvas_desktop.sh` with only its
ROOT pinned and private Xvfb enlarged from 1280x840 to 1600x1000, allowing exact
1440x900 and 1280x800 application captures. Private XDG/PipeWire/DBus state stays
isolated. The fixture uses the existing legal session(8,8) generator, with eight
independent instruments and real MIDI clips; it is not an audio-track fixture.

Final focused native report `native/native-report.json` proves:

- Real eight-track Session shown at both target sizes; Arrangement shown as
  explicitly unavailable at both sizes.
- WebKit preserves an unfinished Session gain across three pointer view trips.
- Real transport continues across seven additional view round trips and native
  Scene 2 applies to all eight members with a separate scene receipt.
- Finite nonzero stereo PCM captured from private software loopback; exact
  sample count/peak/hash recorded in the report and supervised capture metadata.
- Harmony hosted editor opens from Devices detail, exposes Hosted Cutoff base,
  closes, and the native audio frame clock continues advancing.
- Zero native command rejections, stream errors or failed audio; Save and Quit
  exit the actual native process.

The initial focused native attempt wrongly expected `applied` in a track
receipt for a scene launch. That was a harness assertion error: scenes publish
separate scene receipts. `native-attempt1/` and `native-attempt1.log` preserve the
failure; the corrected harness checks both track playback and Scene 2 receipt.
`native-pre-resize-fix/` is the earlier successful native build, not final proof.

Original native journey command:

```bash
ULTRA_TEST_ALIVE=1 \
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" \
bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-workspaces-task1/original-final
```

The unadapted `original-red/` failed on the hidden Replace Pulse device control.
`original-adapted/native-session-report.json` passed all original assertions on
the pre-final build: real file choosers/independent roots, chain reordering and
instance identity, base/bypass/mixer isolation, both hosted editor workflows,
piano add/arrows/undo/redo while effect editor remains open, stopped Apply,
Save/Open, missing/changed source transactional rejection, canceled Quit/Save
outer guards, pending history retention, and final Quit discard exit.
`original-final/native-session-report.json` passed the full original journey: 85.7067 seconds of finite nonzero PCM, zero stream errors/rejections and all file/history/editor/Quit assertions. `provenance-original-final.json` pins that exact build. This run precedes only the final CSS header interior correction; no JavaScript or native behavior changed afterward.

## Captures And Bounded Inspection

Final actual-native captures:

- `native/native-session-1440x900.png`
- `native/native-session-1280x800.png`
- `native/native-arrangement-unavailable-1440x900.png`
- `native/native-arrangement-unavailable-1280x800.png`

Browser `browser-first/` and `browser-confirm/` contain the paired target
screenshots. One batched visual inspection, one geometry/proportion fix batch,
and one confirmation were used; subsequent no-capture functional checks were
for concrete gain/resize defects. Parent inspected the native pair and requested the title-clipping functional correction; final native screenshots repeat the capture after that correction. Native screenshots are for parent review;
no open-ended cosmetic loop was run.

## Self Review And Limits

Native invocation signatures and selection IDs are unchanged. Workspace state
never invokes the backend or reinitializes editors/history/transport. Tests
exercise document preservation and exact mutation absence, geometry, focus,
resize cancellation, and subsequent intentional commit; existing behavioral
assertions were retained. The native navigation adapter is test-only.

Arrangement placement editing/scheduling, WAV import/playback/waveforms and
Session override/Back to Arrangement are unavailable and not claimed. The
Session authority label describes the current v3 capability. Full integrated
runtime qualification, physical audio/endurance, final-head CI/packages and
whole-branch review remain later tasks. This worker did not run the complete
C++/Rust/contracts matrix because it changed frontend/test navigation only;
all UI tests, affected browser tests and actual native journeys are the checks
for this increment.

## Final Handoff

Commit `238c427708a0de9790a4c8e5d95aa06045b1cac5` contains exactly the nine owned files above. Final source,
build and harness hashes all match `provenance.json`; committed asset bytes
were checked against those hashes after commit. Final focused native run exits
successfully and retains corrected-header captures at both viewports.

Final native result: 3.072000 seconds finite nonzero
software PCM, peak 0.137721464, WebKit unfinished gain
preserved, eight Scene 2 member outcomes applied, Harmony hosted editor
opened/closed, native clock advances, zero stream errors/rejections, Save/Quit
exits. Main original journey passed on the build immediately before the
CSS-only header correction; its exact identity is separately pinned.

Final checks: UI 500/500; Alive browser 11/11; native focused pass; original
native full journey pass; Python syntax and diff checks pass. No source edits
remain from this worker. Parent documentation/runtime-contract changes remain
uncommitted and untouched. Independent review and later Arrangement/audio
tasks remain parent-owned.
