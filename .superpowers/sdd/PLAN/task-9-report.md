# Task 9 Implementation Report

Baseline: `95be9cae59ed4fca01857743d8c940a4bb66f588`.
Scope: minimal chain UI, instance parameter/automation controls, focused and
native desktop coverage, and public Alive/product documentation. The controller
owns milestone acceptance, PLAN/progress and retained evidence. No push, merge,
tag, release, system setting or service change is part of this task.

## Implementation

- Track selection and device selection are separate. Selecting a chain instance
  changes its visible parameters without launching transport or opening an
  editor. Selecting the already-selected clip preserves its device selection.
- The selected track displays instrument -> ordered effects -> mixer. Add effect,
  per-instance Replace, effect Earlier/Later and effect Remove use stable IDs.
  Playing transport and unresolved musical drafts disable structural controls;
  explanatory status text and tooltips identify the required stopped preparation.
  Track-row Remove is explicitly `Remove track` and explains whole-chain scope.
- Parameter controls read each instance's own manifest. Effective values and
  ownership read that instance's native device index, independently of track or
  chain position. Parameter commands capture their instance ID before queueing.
  Live effect bypass targets the instance, with warm-state/I/O behavior explained.
  Instrument bypass is disabled with an effects-only tooltip and track-mute hint.
- `Edit in Ultra` opens the selected instance. Existing track-row Editor remains
  an instrument shortcut. Native editor lifecycle and capability code is unchanged.
- Metadata generates automation targets with `[instanceId, key]` values. Duplicate
  cutoff keys on instrument and effect remain independent, effect labels include
  their chain context, and the original instrument cutoff/level lanes remain.
  New points use the current live instance base rather than a stale render-time
  value. Prepared ownership stays visible while musical edits remain drafts.
- Charcoal, amber, Liberation Sans, the audio sidebar, existing clip controls and
  file/Quit guards remain. The music render key includes desktop generation so
  structural preparation rebuilds metadata controls even if note data is unchanged.
- Added DOM and real Chromium geometry/input coverage and extended the actual
  native two-track journey. Public docs now describe canonical session-v2,
  independent instances/fingerprints, effects, current bounds and stopped structure.
  Exact separate build/run commands and native/physical-audio limits remain.

## RED / GREEN Evidence

```sh
node --test apps/ultra/ui/alive-model.test.mjs apps/ultra/ui/alive-dom.test.mjs
```

- `/tmp/task9-ui-red.log`: three initial chain tests fail because chain selection,
  automation target and reorder controls do not exist. Initial implementation
  passes those tests alongside the existing suite.
- `/tmp/task9-selection-red.log`: selecting the current clip loses an effect
  selection (`Subtractive` instead of `Stereo Utility`). Resetting device selection
  only when the track actually changes makes the regression pass.
- `/tmp/task9-live-point-red.log`: a new point uses stale `2400` after a live base
  change to `3456`. Resolving the current instance manifest on click makes it pass.
- `/tmp/task9-instrument-bypass-red.log`: instrument bypass is not disabled
  (`undefined` instead of `true`). The explicit effects-only control makes it pass.
- Final `/tmp/task9-focused-reviewed.log`: 18 passed, 0 failed (13 DOM and 5 model).
  Long-name browser bounds are added coverage, not claimed as a functional RED.

## Build And Automated Verification

All listed final commands exit 0. Source production UI is unchanged since the
last release build; subsequent changes only repair the native test driver.

```sh
bash apps/alive/build.sh
```

`/tmp/task9-build-verified.log`: native library and separate Ultra/Alive release
applications build. The existing native build publishes by atomic replacement,
never overwriting a mapped library inode. Only the existing unused
`reserve_native` warning remains.

```sh
PATH="$PWD/experiments/clockwork-faust/.deps/rust/bin:$PATH" \
CARGO_HOME="$PWD/experiments/clockwork-faust/.deps/cargo" \
ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build" \
LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked
```

`/tmp/task9-rust.log`: 171 passed, 0 failed, 2 existing ignored; main/doc targets
also pass. Rust/native implementation is unchanged in Task 9.

```sh
PATH="$PWD/experiments/clockwork-faust/.deps/rust/bin:$PATH" \
CARGO_HOME="$PWD/experiments/clockwork-faust/.deps/cargo" \
ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build" \
LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
cargo test --manifest-path apps/alive/src-tauri/Cargo.toml \
  --target-dir "$PWD/apps/ultra/src-tauri/target" --release --locked
```

`/tmp/task9-alive-rust.log`: 1 passed, including the own-app capabilities gate.

```sh
npm --prefix apps/ultra/tests/ci run test:browser -- \
  --config playwright.config.mjs alive-chain.spec.mjs
```

`/tmp/task9-browser-verified.log`: 2 passed. Actual Chromium checks selected
instance controls, selection without launching, metadata lane creation and
original lanes, draft structural guards, page errors and both root/main horizontal
overflow at the native minimum 900x660, including long saved device names. It uses
an explicit snapshot fixture and makes no hosting or audio claim.

```sh
uv run --no-project \
  --with-requirements apps/ultra/tests/ci/requirements.txt \
  bash apps/ultra/tests/ci/check-contracts.sh
```

`/tmp/task9-contracts-verified.log`: complete contracts gate passes, primary Node
suite 454 passed / 0 failed. Existing native partition/stop/routing, observer,
numeric and message contracts pass. The optional unpublished hierarchy oracle is
explicitly UNAVAILABLE; it is not reported as executed. The one regenerated
arithmetic native-build receipt was restored to baseline bytes after completion.
Task 8's separate complete DSP gate remains the authority for exact samples,
callback allocation/lock guards and warm DSP state; no DSP source changed here.

```sh
git diff --check
python3 -m py_compile apps/ultra/tests/check_alive_desktop.py
```

Both pass after final native-driver changes. Self-review covers the complete
scoped UI/test/docs diff and stable instance resolution.

## Bounded Interface Verification

Applied Impeccable to the existing Alive desktop surface, with the established
Operate identity and design context. The detector found 0 anti-patterns and two
existing palette advisories (`#535353`, `#c8ae74`). The bounded initial native
inspection used `/tmp/alive-task9-desktop-audit3` and `audit4`; a single visual
confirmation used `/tmp/alive-task9-desktop-final` and
`/tmp/alive-task9-native-verified`. Captures cover chain selection, metadata
automation, saved-base/prepared-effective ownership, audio sidebar, hosted effect
editor and playback. No additional visual polish pass was performed. Later runs
address functional native-driver failures and assertions only.

## Native Driver Investigation

Early native attempts did not pass and are not counted as acceptance evidence:

- `desktop-audit` / `audit2`: GTK Open chooser keyboard location entry was absent.
- `desktop-audit3`: expanded diagnostics obscured a lower automation control.
  The driver now explicitly closes diagnostics while editing lower controls.
- `desktop-audit4`: Save As uses a visible GTK Name entry, distinct from Open's
  location entry. The driver now fills that actual native EditableText and Save.
- `desktop-final`: a constant native-generation assertion was incorrect: native
  generation advances on musical discontinuities, including loops. This assertion
  was removed after tracing native semantics, with controller agreement. Actual
  playing state, callback/frame progress and editor destruction checks remain.
- `native-verified`: chain, independent bases, prepared/draft ownership, editors,
  save/reopen and rejected dependencies pass, then a late repeated GTK chooser
  fails. Instrumenting X11 candidates proves GTK retains unmapped old windows
  with identical titles (`map_state=0`); the current window is viewable (`2`).
  The driver filters viewable candidates before focusing. This changes no product
  command, bypasses no picker and weakens no product assertion.

`/tmp/alive-task9-chooser-repeat/chooser-focus.jsonl` records the map-state
evidence. `/tmp/task9-chooser-repeat.log` exits 0 with eight actual native
instrument replacements followed by Save As. Earlier focused Add/Save probes are
under `/tmp/alive-task9-chooser-probe` and `chooser-probe2`.

## Final Native Verification

```sh
ULTRA_TEST_ALIVE=1 \
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-task9-native-final
```

`/tmp/task9-native-final.log` exits 0 on the actual separate release Alive binary,
owned Xvfb and private software PipeWire server. The full receipt is
`/tmp/alive-task9-native-final/native-session-report.json`.

- Actual instrument -> Utility -> Lowpass on Pulse and an independent same-source
  Utility on Harmony. Effects reorder before and after lane authoring; saved IDs
  equal pre-reorder IDs. Pulse/Harmony Utility bases remain `.65` / `.85`.
- The effect cutoff prepared lane remains `1200` while live base changes to
  `1900`, then to `2000` through its actual hosted graph editor. A pending point
  edit to `1500` leaves effective ownership at prepared `1200`; Discard restores
  the draft. Original instrument cutoff/level remain independent.
- Actual native effect-editor Close destroys the window; reopen preserves its
  live base while transport and callbacks continue. Original instrument editor
  Close/reopen, live mixer, effect bypass and final saved bypass also pass.
- Save/reopen/play preserves ordered IDs, bases, bypass, lanes, notes and mixer.
  Missing instrument and changed original effect source reject prospectively,
  identify the reference/Replace recovery and preserve playback/frame progress.
  Stopped effect removal and explicit whole-track removal pass.
- Separate Ultra and Alive windows, audio sidebar save/rejected format/restart,
  voice termination on Stop, actual WM Close -> dirty guard -> Cancel, pending
  schedule Quit -> Cancel retaining pitch `63` and playback, and Quit -> Discard
  -> process exit all pass. Existing scoped Stop tests are unchanged.

Software capture: 1,830,912 frames / 38.144 seconds, all finite, peak
`0.35335424542427063`; SHA-256
`0422d9d4d02a890cbf3a1e11de5a65c9318118393540e79f92f3d5a2ee02c280`.
The two output channels happen to match in this musical fixture; this does not
claim channel-separation proof. The capture includes deliberate Stop/reopen.
Final observation: PipeWire `default_output`, 48 kHz, observed 512 frames,
1,196 callbacks, absolute frame 2,154,496, playing true, stream errors 0,
failed false and rejected commands 0. Native generation is 68, reflecting loops
and intentional musical discontinuities, not an I/O restart counter. No endurance
duration was requested for this bounded journey.

```sh
ULTRA_TEST_ALIVE=1 \
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_editor_resources.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-task9-editor-resources
```

`/tmp/task9-editor-resources.log` exits 0. The unchanged resource regression runs
sequentially after the journey, using the same release application. Receipt:
`/tmp/alive-task9-editor-resources/editor-resources.json`. Eight real instrument
editor Close/reopen cycles followed by 25 seconds idle retain one WebKit worker
and the same three PIDs. First closed sample: PSS 450,586 KiB, 154 FDs. Final idle:
486,392 KiB, 153 FDs. These satisfy the existing bounded worker/FD/PSS assertions;
the observed allocator/cache growth does not establish leak-freedom. Its cycle
operations retain zero stream errors, failed false and rejected commands 0.

## Limits And Concerns

The shipped profile remains one or two instrument tracks, up to two effects per
track, six total instances. No piano-roll gestures, clip banks, track expansion,
duplicate DSP path or system customization is introduced. GUI/software-loopback
observations do not establish physical audio, CPAL xrun counts, endurance,
leak-freedom, exact event offsets or warm DSP lifetime. Those distinctions remain
explicit in public docs and native evidence. No known product blocker is found
in the scoped self-review; controller acceptance and retained-evidence work remain
outside this commit.
