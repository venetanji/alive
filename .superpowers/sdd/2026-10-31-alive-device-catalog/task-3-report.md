# Task 3 report

Status: installed catalog acceptance complete; controller owns final launcher,
review and PR publication. No production correction was required. No launcher,
native-worktree source/runtime, user configuration or cloud CI was changed.

## Delivered

- Focused actual-native helper:
  `apps/ultra/tests/check_alive_catalog_desktop.py`.
- Reports, manifested source/artifact identities, build logs and native captures:
  `experiments/alive-device-catalog-20261031/`.
- `PLAN.md` and the hosting ledger mark only delivery 0 complete and preserve
  all later native-hosting/presentation requirements. Upcoming saved-presentation
  documents remain planning only; the full hosting goal is still active.

## Verification

Alive and Ultra built separately with `cargo build --locked` against the
assigned frozen `/tmp/alive-piano-live-edit-20261031`, using the owned
`/tmp/alive-live-regions-rust-target`. Both exit 0 with the four existing
warnings. Installation uses the separately assigned immutable shipping native
library SHA `69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90`.

Concrete install directory:
`/home/venetanji/.local/share/alive/builds/be355bb`.
Alive executable:
`/home/venetanji/.local/share/alive/builds/be355bb/bin/alive`.
Ultra executable:
`/home/venetanji/.local/share/alive/builds/be355bb/bin/ultra`.
Manifest source: `be355bbeb675a725001d46b7cd401ae0d4bdbdd7`.
All 308 sources, seven resources and three installed artifact hashes verify.
Running Alive executable and native mapping match this installed directory;
the adjacent installed Ultra passes the existing private startup journey.

The final actual Tauri/WebKit desktop journey exits 0. It finds 22 installed
unavailable candidates + three bundled devices + one authored user fixture;
explicit refresh finds a second fixture created after indexing. Searching and
selecting Analog show its useful reason with disabled load. Enter, actual
double click and pointer drag preserve accepted score and native generation,
with zero rejected native commands. Source review confirms metadata preparation
and separate blocking discovery/cache ownership, without native construction
or graph installation. No DLL/Max external appears in process mappings. This
does not claim direct native constructor tracing.

Actual bundled track/chain/card dragging, clip/note creation, save and scheduled
playback pass. Effect order is Lowpass then Utility. Private PCM contains
197120 stereo frames at 48 kHz, peak `0.09684687107801437`; stream errors and
rejected commands are zero. No physical hardware or realtime qualification claim.
Actual client captures at 800x600 and 1280x800 were visually inspected and have
bounded search/refresh/reason/load controls, without whole-window overflow.
User desktop windows and unsaved work remain untouched by the private harness.

Initial native attempt was intentionally stopped after Audio details, opened
by diagnostic reads, covered the bundled drop target. Helper-only correction
closes that pane. The final complete rerun is retained separately. Prior 159
Node, 110 Chromium and 15 Rust provider passes were retained, not repeated.
Python compilation and `git diff --check` pass for the task files.

## Concerns and handoff

All Live candidates, including Analog, remain unavailable by design. No native
capacity or qualification was raised. A missing private XDG default library root
produces a discovery notice without hiding valid explicit roots. The browser
status repeats the full candidate reason when its longer description clips.
The installed manifest identifies production source `be355bb`; the follow-up
task commit contains the acceptance helper/evidence/roadmap only. The controller
must review this task commit before updating the existing launcher and draft PR.

Full final output: `/tmp/alive-catalog-native-final-20261031`.
Build logs: `/tmp/alive-catalog-build-20261031`.
Private installer adaptation: `/tmp/alive-catalog-install-20261031.py`.
No proprietary payloads are committed. Artifact hashes and authored reports are
retained in the evidence packet.

## Fix Round 1: Unfiltered Native Containment

Status: new installed acceptance passes on production source
`dd423bd0fa418656304427cb7c89646813cfd065`; controller re-review/integration remains
pending. This supersedes the earlier filtered-only native layout conclusion.
Task 3 review correctly identified row overpaint in the original full-list
captures. Task 2's `dd423bd` correction sets `.browser-results {min-height:0}`
and records two red long-list Chromium regressions followed by six focused green
cases. Those browser cases were not repeated in this acceptance round.

The new immutable install is
`/home/venetanji/.local/share/alive/builds/dd423bd`, with executables at
`bin/alive` and `bin/ultra`. Builds use the same frozen native link directory and
owned Cargo target as before. Both builds exit 0 with four existing warnings.
All 308 manifested sources, seven resources and three installed artifacts
verify. Running executable/native mapping and artifact hashes match the new
manifest. `be355bb` and `cf7ac2b` artifact hashes also verify unchanged.

### Exact Build And Install Commands

```sh
ULTRA_NATIVE_LIB_DIR=/tmp/alive-piano-live-edit-20261031 CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target cargo build --manifest-path apps/alive/src-tauri/Cargo.toml --locked > /tmp/alive-catalog-clipping-build-20261031/alive.log 2>&1
ULTRA_NATIVE_LIB_DIR=/tmp/alive-piano-live-edit-20261031 CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target cargo build --manifest-path apps/ultra/src-tauri/Cargo.toml --locked > /tmp/alive-catalog-clipping-build-20261031/ultra.log 2>&1
python3 /tmp/alive-catalog-clipping-install-20261031.py > /tmp/alive-catalog-clipping-build-20261031/install-verification.json
```

All exit 0. The private installer adapts the prior fresh-staging/atomic-rename
installer, asserts exact HEAD `dd423bd`, refuses an existing destination and
copies the approved shipping library SHA `69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90`.
No engine library was rebuilt or overwritten. A fresh fixture directory
`/tmp/alive-catalog-clipping-library-20261031` began with only `one.ultra`, copied
from the authored bundled Subtractive and renamed/id-changed as specified.

### Native Attempts And Helper-Only Corrections

First command:

```sh
ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_DEFAULT=1 ULTRA_TEST_ALIVE_BINARY=/home/venetanji/.local/share/alive/builds/dd423bd/bin/alive ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_alive_catalog_desktop.py ALIVE_LIVE_ROOTS='/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources' ALIVE_DEVICE_LIBRARY_PATHS=/tmp/alive-catalog-clipping-library-20261031 bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-catalog-clipping-native-20261031 > /tmp/alive-catalog-clipping-native-20261031.log 2>&1
```

Exit 1 at the 800x600 strict footer pixel comparison, after geometry and nine
footer ownership samples passed. The failure capture shows a native
`Stereo Utility / Bundled Ultra device` hover tooltip across the footer because
wheel scrolling leaves the pointer over a result. Added helper-only pointer
parking in the blank detail area before both samples/captures.

Second command:

```sh
ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_DEFAULT=1 ULTRA_TEST_ALIVE_BINARY=/home/venetanji/.local/share/alive/builds/dd423bd/bin/alive ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_alive_catalog_desktop.py ALIVE_LIVE_ROOTS='/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources' ALIVE_DEVICE_LIBRARY_PATHS=/tmp/alive-catalog-clipping-library-20261031 bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-catalog-clipping-native-final-20261031 > /tmp/alive-catalog-clipping-native-final-20261031.log 2>&1
```

Exit 1 at the same strict comparison. Tooltip was absent. A direct GdkPixbuf
comparison of the scrolled capture and failure image found exactly 281 changed
pixels within x=205..209/y=292..348, confined to the description's native overlay
scrollbar thumb fading out. The rest of the footer was unchanged, and geometry
and all footer ownership samples again passed. Added a helper-only bounded
stability wait: the entire footer pixel band must remain identical for two
seconds before sampling, with a six-second deadline. No pixel masks, tolerances
or weaker before/after comparison were introduced. Failure-capture hashes and
paths are recorded in `experiments/alive-device-catalog-20261031/verification.json`.

Final command:

```sh
ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_DEFAULT=1 ULTRA_TEST_ALIVE_BINARY=/home/venetanji/.local/share/alive/builds/dd423bd/bin/alive ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_alive_catalog_desktop.py ALIVE_LIVE_ROOTS='/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources' ALIVE_DEVICE_LIBRARY_PATHS=/tmp/alive-catalog-clipping-library-20261031 bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-catalog-clipping-native-settled-20261031 > /tmp/alive-catalog-clipping-native-settled-20261031.log 2>&1
python3 -m py_compile apps/ultra/tests/check_alive_catalog_desktop.py
git diff --check
```

All exit 0. The final full native journey checks 26 unfiltered entries at both
800x600 and 1280x800, Home/End selection/reveal, 40 real wheel-up inputs,
retained last-candidate selection, bounded list/footer geometry, nine footer hit
samples per size and exact settled footer pixel equality across scrolling.
Compact list bounds are `[83,180,136,98]`, normal `[83,180,136,298]`.
Utility moves from y=855 to y=250/450 on End; wheel returns the first row to
y=180 without changing the selected Utility. Four additional actual-native
unfiltered top/scrolled captures, two filtered captures and the refreshed
empty-MIDI/chain captures were visually inspected. Rows clip above the footer;
later results scroll into view without covering description/Load/status.

The same final journey rechecks 22 unavailable installed candidates, fixture
refresh 1-to-2, Analog refusal inputs, unchanged accepted score/generation and
zero rejected commands, then performs all bundled track/chain/card drags,
clip/note creation, save and scheduled playback. Effect order remains Lowpass
then Utility. Raw retained PCM independently verifies 196096 stereo frames,
SHA `b89673681716f134c40205235d31475f4eeddf3404829537e0f72543317fea5d`,
peak `0.09684687107801437`, stream errors 0 and rejected commands 0.
Recorder supervision is complete/requested_stop, stderr bytes 0, recorder
return code 1 as in the existing helper. This is private software audio only.

### Refreshed Evidence And Boundary

The current packet now manifests `dd423bd`, the refreshed logs/reports/captures
and four additional unfiltered screenshots. Older installations and private
attempts are preserved. The latest complete output is
`/tmp/alive-catalog-clipping-native-settled-20261031`.
The README and roadmap identify only the new tested source and retain all later
presentation/full-hosting milestones. This follow-up changes no production
code, native admission, launcher, user configuration, native `2a0f` state or
mapped library. User windows and unsaved work were preserved. No unrelated
suites, cloud CI, push or launcher change was performed.

## Final Fixed-Source Acceptance: a8b5f67

Exact production source `a8b5f67f2e1cc3052dce76ff704b102ffbfac457` now passes
the complete extended native journey. Exact archive/build/install commands,
attempt diagnoses and results are in `final-installed-report.md` beside this
report; current authored evidence is under
`experiments/alive-device-catalog-20261031/`.

The immutable install is `/home/venetanji/.local/share/alive/builds/a8b5f67`,
with Alive and Ultra under `bin/`. Both apps were built from a fresh git archive
at `/tmp/alive-catalog-final-source-a8b5f67-20261031`, whose 8733 archived files
match fixed git blobs before and after compilation. The manifest records the
actual archive build root, fixed tree and selected source git blob identities;
all 309 source, seven resource and three artifact hashes verify. Both link and
execution use the shipping library SHA `69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90`,
not the old piano ABI. No native library was rebuilt.

The four paused presentation checkpoint changes were excluded from the archive
and remain byte-identical in the worktree. Committed `canvas_tests.rs` is used
instead of its paused modification; the three untracked presentation files are
absent from the archived build. Existing `cf7ac2b`, `be355bb` and `dd423bd`
artifact hashes also verify unchanged.

Native acceptance retains both-size unfiltered clipping/scroll/footer checks,
catalog refusal and refresh, and adds cached missing/invalid/unsupported file
refusal from Audio with accepted score/generation/selection/history controls
unchanged. Successful automatic insertion, one-step Undo/Redo with identical
instrument identity and original-fixture restoration all pass. The subsequent
actual bundled drag/save/scheduled-audio workflow passes: 173568 stereo PCM
frames, peak `0.09684687107801437`, zero stream errors/rejected commands.
Snapshot and raw PCM bytes were independently checked.

Two helper-only fixes were needed and are documented with retained captures:
unique refusal Save As snapshot names avoid GTK overwrite confirmation; closing
the transaction's expanded Audio details pane restores an unobscured chain
drop target. No production source was changed in this acceptance dispatch.
The final full run exits 0 at `/tmp/alive-catalog-final-native-accepted-20261031`.
Python compilation, diff checks and all four paused checkpoint hashes pass.
Prior source-fix suites were not rerun. Only delivery 0 is complete; later
presentation/hosting milestones remain active. Controller owns final scoped
re-review, launcher and PR integration; no launcher/push/cloud CI occurred here.
