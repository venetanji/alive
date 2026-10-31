# Task 2 Installed Checkpoint Report

## Focused Native Minimum Fix

The first immutable install used accepted source
`1b6cb68b2e379eaaa3fa87f5bca2741a180283db` at
`/home/venetanji/.local/share/alive/builds/1b6cb68`. It remains intact.
Its installed Alive drop/audio and saved-surface journeys pass, including actual
800x600 and 1280x800 windows, independent instance values/unfinished drafts and
closing its hosted editor during software-audio playback. The supplementary
installed Ultra Perform journey opens the real saved controls with no automatic
keyboard, but its exact800x600 resize fails because the native config declares
minWidth900 and minHeight620. The failure was retained in
`/home/venetanji/.cache/alive-verification/presentation-installed-20261031/surface-5.log`.
The acceptance assertion is retained; native size hints are not bypassed.

The controller explicitly authorized only `apps/ultra/src-tauri/tauri.conf.json`
minWidth900->800 and minHeight620->600. Configuration-only source commit:
`9ced05e` (`fix(ultra): allow the validated compact window size`). No other
product file changed. Existing initial1280x840 size and native resize semantics
remain intact. Context7 was queried first using `/tauri-apps/tauri-docs` for
WindowConfig minimum constraints. Its current window customization documentation
identifies tauri.conf.json as the window configuration owner, and Tauri2 release
notes describe min/max constraints being applied independently. Context7's exact
field ranking was shallow, so the locally resolved tauri-utils config docs were
also checked: min_width and min_height specify logical-pixel window minima.
This directly explains why the old native window could not reach the already
browser-validated shared-surface compact size.

`git diff --check` passed. No unit test mirrors these two reversible config
values; fresh installed exact-size checks are the required validation. Build and
installation were paused at this stage pending the controller's tiny source review;
the approval and final validation follow. All earlier
archives, installs, attempts, and helper assertions remain preserved.

## Final Reviewed Build And Immutable Install

The controller approved `9ced05eb38e0620865e4c9401646657669c1f6ae` in
`task-2-window-minimum-review.md`, with no findings. The unchanged prepared
runner was copied into fresh disk-backed run directory
`/home/venetanji/.cache/alive-verification/presentation-publish-compact-fwkhm2op`.
Its command completed successfully:

```bash
python /home/venetanji/.cache/alive-verification/presentation-publish-compact-fwkhm2op/build_install.py 9ced05eb38e0620865e4c9401646657669c1f6ae
```

Both locked development-profile Tauri binaries were built against the frozen
native library without invoking the native build wrapper. The complete source
archive verifies all 8,759 git blobs both before and after builds. The manifest's
330 selected build-source hashes, all 14 explicit bundle resources across both
product directories (`Alive` and `Ultra Research`), installed executable/library
hashes, icon and installed manifest verify. This is a complete archive, not a
selective build closure. The immutable install is:
`/home/venetanji/.local/share/alive/builds/9ced05e`.

Artifact SHA-256 values:

- Alive: `fef9b441bfa142d8492fd4425dd55b1699db1a355909f8413da76a34610e569c`
- Ultra: `eeb76c2758bb4a9233fb80b2250e5d354a82397569f6d772496b661a250fed78`
- Adjacent frozen native: `69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90`

The original `/tmp` extraction hit a disk quota before compilation. Only the
owned partial source/archive were removed; the prepared run moved to
`/home/venetanji/.cache/alive-verification/presentation-publish-dya4lhw0`, with
its old name retained as a symlink. Its complete successful archive and initial
`1b6cb68` install remain intact. `build/archive-recovery.md` in the evidence
packet retains the original failure excerpts and recovery. Both prior installs
and the Alive/Ultra launcher byte sequences were verified unchanged. The
controller's expected private `switch_launcher.py`, `pr-body.md` and previous
install preflight remain in the final run directory; none was executed/edited
by this worker.

## Actual Installed Acceptance

Evidence packet: `experiments/alive-presentation-checkpoint-20261031/`.
Its README has exact build/acceptance/verification commands, manifests, source
versus evidence identity, selected captures, all attempts, reviews/fix evidence
and remaining scope. Main private output root:
`/home/venetanji/.cache/alive-verification/presentation-installed-final-9ced05e`.
The initial final command was:

```bash
bash experiments/alive-presentation-checkpoint-20261031/reproduce-installed.sh /home/venetanji/.local/share/alive/builds/9ced05e /home/venetanji/.cache/alive-verification/presentation-installed-final-9ced05e
```

The existing browser/drop journey passes on exact final Alive: fresh empty MIDI
area, real Subtractive drag, Stereo Utility insertion, Stereo Lowpass inserted
before Utility, immediate clip/note creation, save, scheduled clip playback,
finite nonzero PCM, errors/rejections both zero, actual installed executable
path and adjacent mapped native library. Final `drop.log` and
`drop/device-drop-report.json` retain results. Capture: 195,072 frames / 4.064s,
peak 0.09684687107801437, SHA-256
`ad4a14164a553d0a5a04506cea1728181f68dcc5e1aed222edcfd83cc141ddcb`.
Initial silence reflects scheduled bar launch.

Focused Alive acceptance passes on that same binary. Two same-source instances
keep independent parameters. Actual XTest number typing accepts Attack 23 and 47;
clearing the first field leaves a dirty unfinished draft through switching to
Harmony and back. Escape restores its accepted 23; real Right-arrow input on its
saved dial accepts 122.99. Saved session comparisons retain Harmony 47 and every
other parameter. Actual native 800x600/1280x800 windows are measured through X;
readable saved ownership and start/end scrolling are captured with fixed chrome.
Opening the real Pulse hosted editor displays its accepted 122.99; closing it
destroys only the editor while the session transport and audio keep playing.
Capture: 751,104 finite frames / 15.648s, peak 0.4655124545097351, all 16 one-second
peaks nonzero, SHA-256
`892e80c3796c6409187113224acedc495f70f6dbd5d1f9b1a2947d1f71b4e168`.
Errors and rejected commands stay zero. PCM stays local; statistics/capture
supervision/hash are archived. Software-only CPAL/PipeWire is 48 kHz/512 frames.

The initial final process then fails only in supplementary Ultra scrolling:
focusing Level moves its previously cached Attack wheel target out of the
viewport, so the next wheel hits the patch canvas. The process is explicitly
retained as nonzero in `logs/final-surface-initial.log`, with diagnostics under
`attempts/final-surface-initial/`; its passing Alive receipt is archived separately.
No failing process is relabeled fully passing.

A focused Ultra-only follow-up completed on the same immutable source/artifacts:

```bash
ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_DEFAULT=1 ALIVE_PRESENTATION_ULTRA_ONLY=1 \
ULTRA_TEST_ALIVE_BINARY=/home/venetanji/.local/share/alive/builds/9ced05e/bin/alive \
ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_saved_presentation_desktop.py \
bash apps/ultra/tests/check_canvas_desktop.sh /home/venetanji/.cache/alive-verification/presentation-installed-final-ultra-9ced05e-3
```

This follow-up exits 0 with `passed:true`. It verifies exact native 800x600 and
1280x800 sizes, actual installed Perform, all seven observed sliders against the
installed 640x112 saved presentation, no automatic keyboard, correct executable
and adjacent mapped-library hashes, accepted source values, closing/reopening
Perform, and full first/last reachability with fixed chrome. The helper uses a
fixed point in the authored eight-pixel top gutter, then bounded repeated native
Shift+wheel batches. It verifies first/last values do not change during scroll.
Right-scroll uses two batches at 800x600 and one at 1280x800. Normal-size reset reaches the actual
panel's left boundary so the first value/ownership is fully readable too.
No script injects IPC/UI snapshots, alters DOM scroll state, bypasses native
minimum hints, or relaxes containment assertions.

The three final receipts are cross-checked against the immutable manifest by:

```bash
python experiments/alive-presentation-checkpoint-20261031/verify-install.py /home/venetanji/.cache/alive-verification/presentation-publish-compact-fwkhm2op /home/venetanji/.local/share/alive/builds/9ced05e
python experiments/alive-presentation-checkpoint-20261031/verify-receipts.py
```

Both commands pass. `reports/final-9ced05e/combined-verification.json` records
combined scoped success while retaining the nonzero initial final attempt.
Already-passing Node/Rust/Chromium source suites were not rerun.

## Attempts, Visual Inspection And Self-Review

All initial private attempts remain under
`/home/venetanji/.cache/alive-verification/presentation-installed-20261031/`:
`surface-1` is an incorrect raw-file fingerprint in a fresh fixture (correctly
refused startup); `surface-2` relied on focus alone for scrolling; `surface-3`
used unsupported horizontal wheel buttons; `surface-4` wheeled over a number
input; `surface-5` passes Alive then exposes the product's native minimum.
Original logs and selected diagnostics are archived. The corrected fixture
retains the supplied canonical fingerprint and points to the actual installed
resource. These harness mistakes are distinguished from the separately reviewed
minimum configuration correction.

Final Ultra follow-ups are local roots
`/home/venetanji/.cache/alive-verification/presentation-installed-final-ultra-9ced05e`,
`...-2`, and `...-3`, with adjacent `.log` files. The first confirms scroll
movement but has an insufficient single batch; the second reaches both ends but
self-review catches the partly scrolled start of its 1280 capture. Both are retained
under `attempts/` and `logs/`. The third fixes the input point/left reset and passes
all strict assertions. No further product source change occurs.

Visually inspected final Alive 800 start/end, Alive 1280 start, hosted editor while
playing and editor-closed diagnostics, plus Ultra 800/1280 start/end. They show
actual saved dials/numbers/ownership, contained horizontal clipping/scrolling,
fully readable first/last targets, no automatic Perform keyboard, and transport
true after editor closure. Captures are original private-desktop images; smaller
foreground Ultra can reveal the owned test Alive window behind it.

Self-review confirms the product commit changes only the approved two minimum
values, the built source excludes later untracked helper/evidence work, resource
maps match each actual productName, both runtime library mappings use the adjacent
frozen artifact, independent values are verified from actual native saves, all
input is native UI, no proprietary payload enters git, and previous installs/
launchers are intact. Helper Python compilation, reproduction shell syntax,
receipt verification and whitespace checks on authored files pass. The whole-packet
check flags only original copied raw log/diff trailing/EOF whitespace, retained
byte-for-byte in evidence; diagnostics are in `reports/raw-evidence-whitespace.txt`.
The authored-file check excludes `logs/`, `reviews/*.log` and `reviews/*.diff` only.
Four existing Rust warning
categories and expected private portal/DRI3 warning noise remain in logs.

## Scope And Handoff

Tasks 1/2 are reviewed and installed; presentation authoring, Max presentation
import and native hosting remain pending, and the broader roadmap stays paused.
All 22 native candidates remain unavailable. This does not qualify actual Analog
hosting, foreign-DSP capacity, proprietary panel acquisition or physical audio.
No native rebuild, other-tree/user-window/config edit, launcher switch, push,
release, tag, merge or cloud CI dispatch was performed. Controller owns final
evidence review, Alive launcher switch and publication of the existing draft PR.

The source commit is `9ced05eb38e0620865e4c9401646657669c1f6ae`; the later
acceptance-only commit is recorded after commit in this local report and the
worker's return message. Its packet/helper/docs are not claimed as built source.

## Publication Evidence And Review Corrections

The installed evidence review is approved with no Critical/Important findings;
its full report is archived as `reviews/task-2-install-review.md`. The minor
right-scroll wording now matches the accepted receipt: two batches at 800x600,
one at 1280x800. Existing build/private-harness warning noise remains disclosed
and deferred.

The immutable raw manifest's inherited `runtime_native_dir` field records the
frozen build-library input, `/tmp/alive-live-publish-native-20261031`. It is not
the observed process mapping. The accepted Alive and Ultra runtime receipts
prove the adjacent installed `bin/libultra_native.so` and its frozen hash. Raw
manifests and logs remain unchanged.

After the evidence gate, the controller successfully switched Alive (Test) to
the tested source `9ced05e`. `publication/launcher-verification.json` and the
archived controller `publication/switch_launcher.py` record that action: the
desktop file validates, the desktop database updates, and previous install
artifacts, the research launcher and existing user windows remain preserved.
This documentation worker did not rerun the switch. PR push remains
controller-owned; no additional builds, tests or desktop journeys were run.
