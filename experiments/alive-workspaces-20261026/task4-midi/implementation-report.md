# Task 4 MIDI Arrangement Implementation Report

Base: `e38c87b66dae72ce19b8869b0f24ec9c277ae29e`.
Evidence root: `/tmp/alive-workspaces-task4-midi`.
Status: complete and frozen; index verified empty.
Commit: `91cb9d10a6ef0401b05154d58520310b7d7ff2c5`.

## Delivered behavior

- Real v4 MIDI sources and placements drive the timeline and shared Clip editor.
  Create source and Place are separate authenticated edits/history entries; an
  unplaced source remains selectable. The source selector, source name/length,
  note/automation editors, and assignment to an empty Session slot share music.
- Placement move, right resize, fixed-end left trim, numeric timing/offset/loop,
  explicit duplicate destination, delete/undo/redo, and Make Independent use the
  existing edit protocol. Source suffix semantics and overlap refusal remain
  native policy; no runtime, capacity, admission or scheduling code changed.
- The ruler, native playhead, partial song-loop brace, zoom/Fit and scroll use
  beat geometry. MIDI marks come from actual source notes with bounded visible
  repetition. Dashed pending placements and prepared outlines distinguish draft
  geometry from installed playback. There are no audio waveforms or WAV claims.
- Shared source/track/device selection opens Clip detail without launching.
  Arrangement and Session use existing native authority observations; headers
  show Arrangement, gaps, Session overrides/silence and pending actions. Scoped
  and global Return use existing requests and member/mask receipts.
- Arrangement exposes the selected track's live gain in its inspector through
  the existing mixer path, alongside header mute/solo and shared device detail.
  Its unfinished value survives polling/navigation; queued gain retains the
  captured originating track even if selection changes before completion.
- Pointer previews submit nothing until one valid release. Escape, blur,
  pointer cancellation, capture loss, navigation and stale scope cancel them.
  Parked Arrangement fields survive navigation and polling. Queued placement
  edits resolve sibling fields at execution and check original track/source/
  placement identities; existing Task 2D slot guards remain intact.
- The admitted two-track/three-root progression ships as
  `apps/alive/examples/midi-arrangement.alive`, with repository-relative device
  paths and an explicit Alive resource entry. The original New/v3 example is
  unchanged. Browser copy points users to Open for the MIDI example.

## Verification

- `01-geometry-red.log`: expected missing timeline module before implementation.
- `20-focus-red.log`: actual browser failure exposed missing Clip-detail opening
  on occurrence selection. `21-focus-green.log` passes after correction and
  verifies piano Delete does not delete an Arrangement occurrence.
- `38-final-ui.log`: 101 model/DOM/piano/timeline tests pass, exit 0. Covers beat
  transforms, suffix marks, references, queue ordering and stale identities,
  source create/place, pointer cancellation and existing Session behavior.
- `29-browser-final.log`: all 32 Alive Chromium checks pass, exit 0, including
  both target sizes, actual pointer geometry, one-release/no-move commands,
  unfinished fields, view navigation, selection and keyboard scope.
- Parent's final visual review identified missing direct Arrangement gain.
  `33-gain-red.log` fails for that missing control; `34-gain-ui-green.log` and
  final38 pass after addition. `35-gain-browser.log` passes all 14 affected
  Arrangement checks, including two new unfinished-gain/shared-mixer cases.
- `32-native-session-regression.log`: unchanged Session presentation/fader
  preflight and original native clip journey pass, exit 0, on the coherent
  pre-gain candidate and original two-instrument input. Its final stream
  errors/rejections/active voices are all zero. No original assertion changed.
- `25-rust-all.log`: 252 pass, four existing ignores, exit 0; test executable
  runs directly against the isolated native library after build24.
- `17-native-suite.log`: full original native/authority/envelope/oracle/guard
  and queued-edit Stop stress suites pass, exit 0.
- `27-design-detector.json`: single Impeccable detector run, exit 2; density,
  small type and compact padding warnings are predominantly the existing
  desktop visual language explicitly retained by this task. Parent inspected
  the first native create/select/move captures at both sizes and accepted the
  slice. No unrelated restyling or repeated detector run was performed.
- `git diff --check` passes on the integrated change.

## Native journey and retained failures

`first-native2` is the accepted actual-backend create/select/move checkpoint.
The preceding `first-native` failed because Save expected a dialog while edits
were still pending; the corrected harness explicitly applies before Save.

`native-full1` reaches full occurrence editing but its extended partial loop
candidate refuses at root clears 21 > 18. The refusal is correct and retained.
The parent explicitly authorized trimming both original placements from [0,8)
to [2,8) with source offset 2, using real UI edits. This removes prefix
placement boundaries without altering source notes or admission limits. The
shipped example retains its original [0,8) loop and placements.

`native-full2` verifies refusal leaves prepared generation/placement and draft
history intact, performs the explicit trims, then plays the newly authored
source/placement by exact observed IDs. Session override, scoped Stop/silence,
Return into a gap, partial wrap, global Return, live gain, automation, and
Ultra hosted-editor close/reopen all complete. Its software capture contains
2,168,832 finite frames (45.184 seconds), peak 0.16578409075737. It stops at an
asynchronous diagnostics disclosure: the textarea was initially empty. Only
the test changed to wait for populated diagnostics before JSON parsing.

Complete native evidence is `native-full3` / `31-native-full.log`, PASS exit 0.
It verifies exact saved document equality after a fresh-process restart and
replays the newly authored occurrence. It also checks
view navigation while Return is pending. The deliberate admission refusal
increments aggregate rejected commands exactly once; the check requires no
additional rejection during playback, rather than claiming zero rejections.
Native screenshots and interaction video are UI evidence, not timing proof.
PCM is private software PipeWire capture, not physical output or endurance.

Full3 has 2,229,760 finite stereo frames (46.453333 seconds), peak
0.16578409075737; reopened playback has 189,952 frames (3.957333 seconds), same
peak. Independent float scanning verified both captures. The script's recorded
Start/Stop wall span is 45.661809 seconds; this is distinct from capture length
and is not an independently replayable proof of continuous playing time.
Pre-Quit diagnostics show delivered 512 frames at 48 kHz, CPAL errors/xruns 0,
over-budget 0 across 4,541 measured callbacks, maximum 1,968,767 ns. The active
epoch is not a completed/endurance measurement. The new process reports
errors 0, rejections 0 and voices 0 at final Stop. The interaction video is
valid H.264, 1440x900, 127 frames/10.583333 seconds; frame 8 was inspected.
Parent inspected all four final Arrangement/Session screenshots and confirmed
control fit and observed header state at both sizes.

Full3 and Session regression use the pre-gain source, retained separately as
`pre-gain-source-pins.txt`, `pre-gain-build-pins.txt`, and `app-pre-gain`.
The final narrow native gain check is `native-gain-final3` / log43, PASS exit 0: actual live
Arrangement gain, shared Session value, unchanged Arrangement authority, both
target-size captures, Stop/Save and exact saved-document comparison allowing
only the intended track gain change. It uses final coherent binaries36/37.
The first attempt, retained in `native-gain-final` / log39, failed because its
accessibility helper tried to read the hidden Session gain control. The helper
now verifies visible Arrangement gain, then navigates to Session to read its
shared value before returning. No product change was needed for this failure.
The second attempt reached Save but compared absolute input device paths to
the writer's relative saved paths literally. Log42 retains that failure; the
comparison now resolves both to canonical existing paths and proves the only
musical change is gain 0.7 to 0.613. Final stream errors/rejections/voices are
zero. These are harness corrections, not weakened musical assertions.
The clean final gain screenshots are in `native-gain-captures`, log44 PASS:
the same saved project reopened with gain 0.613, pointer moved away to remove
the workspace tooltip, and captures at both target sizes. The 1280x800 image
was inspected and the inspector fits on one row. This is a capture-only check,
not additional playback qualification.

## Build attribution and reproduction

Final isolated executables/library are in `app-final`; `final-build-pins.txt`
and `final-source-pins.txt` identify the exact binaries and source. Alive build
36 and Ultra build37 use the same final production sources and unchanged
isolated native library. Later changes affect tests only. The installed
launcher was not refreshed. Parent owns its later coherent update.

- Alive: `7d7edfd443496d5175e68015000492b54c2c482838b279e89cfdbeff2a9a4fed`
- Ultra: `9e7da05fae535791f8fef6769bee3e6a044333b7e632ad66f48c853eb9fa141d`
- Native: `389fbf4c2d4e25246bff32e2ca9cc6ff03fe5cdef334d9080c82bf109f9006d2`

Source/build pin checks40/41 pass. Supplemental helper hashes are recorded in
`harness-pins.txt`. Only the 13 scoped implementation/example/test/resource
files were committed; parent PLAN and experiments remain untouched in the
worktree. This report is a local ignored coordination artifact.

Commands from the worktree root (browser command from `apps/ultra/tests/ci`):

```sh
node --test apps/ultra/ui/alive-model.test.mjs apps/ultra/ui/alive-dom.test.mjs apps/ultra/ui/alive-piano.test.mjs apps/ultra/ui/alive-timeline.test.mjs
./node_modules/.bin/playwright test alive-chain.spec.mjs --reporter=list
bash /tmp/alive-workspaces-task2d-desktop/check-native-isolated.sh
env ULTRA_NATIVE_LIB_DIR=/tmp/alive-workspaces-task2d-desktop/native cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib --no-run
env LD_LIBRARY_PATH=/tmp/alive-workspaces-task2d-desktop/native apps/ultra/src-tauri/target/debug/deps/ultra_desktop-6951be0eecdd253e --test-threads=1
env CARGO_TARGET_DIR=/home/venetanji/.cache/alive-task2d-target ULTRA_NATIVE_LIB_DIR=/tmp/alive-workspaces-task2d-desktop/native cargo build --manifest-path apps/alive/src-tauri/Cargo.toml --release --locked
env CARGO_TARGET_DIR=/home/venetanji/.cache/alive-task2d-target ULTRA_NATIVE_LIB_DIR=/tmp/alive-workspaces-task2d-desktop/native cargo build --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked
env ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_SESSION="$PWD/apps/alive/examples/midi-arrangement.alive" ULTRA_TEST_ALIVE_BINARY=/tmp/alive-workspaces-task4-midi/app-final/alive ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_arrangement.py" bash /tmp/alive-workspaces-task4-midi/private-desktop.sh /tmp/alive-workspaces-task4-midi/native-full3
env ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_BINARY=/tmp/alive-workspaces-task4-midi/app-final/alive ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_session_ui.py" bash /tmp/alive-workspaces-task4-midi/private-desktop.sh /tmp/alive-workspaces-task4-midi/native-session-regression
env ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_SESSION="$PWD/apps/alive/examples/midi-arrangement.alive" ULTRA_TEST_ALIVE_BINARY=/tmp/alive-workspaces-task4-midi/app-final/alive ULTRA_TEST_SCRIPT=/tmp/alive-workspaces-task4-midi/gain-native.py PYTHONPATH="$PWD/apps/ultra/tests" bash /tmp/alive-workspaces-task4-midi/private-desktop.sh /tmp/alive-workspaces-task4-midi/native-gain-final3
```

The private desktop wrapper copies the repository harness with an explicit
ROOT and 1600x1000 Xvfb display to permit both 1440x900 and 1280x800 captures.
Its v4 path adapter resolves actual instrument/effect paths only; owned input,
diagnostic isolation and original app assertions remain in place.

## Self-review and handoff

Source selection and queued edits were reviewed for late-result selection
theft, deleted/rewired identities, source sharing and preservation of the Task
2D sibling-field fix. Numeric fields and pointer gestures use distinct commit
paths; navigation owns presentation only. Duplicate destination remains an
explicit visible field after moving an existing selection. The final change
contains no native policy alterations or installed-launcher work. Parent owns
PLAN/product/reference/evidence documentation and independent review.
