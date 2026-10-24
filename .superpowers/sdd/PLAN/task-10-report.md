# Task 10 Implementation Report

Baseline: `7d6410f925aee32108ceeeb9272e383664f1c4e4`.
Scope: interactive single-clip piano roll, Rust-owned focused pending musical
history, renderer/native tests, and public product/session documentation. Parent
owns PLAN/progress, review, CI receipt/evidence retention and PR bookkeeping.
No subagents, push, merge, tag, release, system setting or service changes.

## Implementation

- Added `session/history.rs`: bounded before/after musical projections, 64 entries
  and 8 MiB combined serialized payload plus labels across undo and redo. Oldest
  entries evict; oversized entries and invalid labels reject before mutation.
  Projections exclude device identities/references, accepted bases/bypass/mixer,
  runtime, graphs, paths, editor bindings and selection.
- Added main-only `alive_edit`, strict lowercase `alive_history`, and
  `alive_discard`. Edit/history/Apply/Discard authenticate generation and
  draftRevision under the desktop mutex. File and structural requests also
  authenticate both versions. Removed the registered writable `alive_draft`.
  Apply takes only versions and prepares the retained authoritative draft.
- Snapshot adds monotonic draftRevision and history availability/labels.
  Non-no-op edits, undo/redo and accepted boundaries increment once. Identical
  edits preserve revision and redo. Snapshot state is obtained before committing
  edit/history/discard, so native snapshot failure cannot silently commit them.
- Factored the existing preparation music compiler for manifest-only draft
  admission: ranges, notes, frame rounding, same-pitch overlaps, targets,
  parameter values, disabled lanes and truncating length edits validate before
  retention. Dependency/source/hash/graph and density admission remains at Apply.
  Failed source/density preparation retains the accepted draft and history.
- Undo/redo materializes projections onto the current canonical structure and
  reuses live merging by instance ID and mixer by track ID. Undo to baseline
  removes the draft and preserves redo and accepted live dirty state.
- Successful install clears the scope and preserves existing editor generation
  behavior. Explicit Discard clears immediately. An accepted Apply in a file
  flow closes stale editors immediately, even when a later dialog cancels.
  Save As relocation increments revision while preserving history and editors.
- Added a small pure piano geometry module, body/right-edge hit regions, local
  selection outline/velocity marker, pointer capture and stable pointer-down
  geometry. Fixed 0.25-beat displacement preserves imported offsets/durations.
  Double-click adds duration .25 / velocity 100; arrows move, Shift horizontal
  arrows resize, Delete/Backspace remove in the roll context. Precise fields
  remain. Selection alone submits nothing. Velocity previews commit once.
- Escape, pointercancel, lost capture, window blur, new revisions and scope
  operations cancel unfinished gestures. Late velocity input/change events cannot
  recommit canceled gestures. Renderer musical commands serialize using returned
  revisions, capture originating tracks/input values, and restore authoritative
  state after rejection. File None/Err outcomes refresh after accepted inner
  boundaries. Ultra patch-editor history remains unchanged.
- Kept the existing charcoal/amber/Liberation Sans desktop surface. Toolbar now
  says Prepare / Apply requires stopped transport; prepared versus draft
  automation ownership stays explicit. Public README, SESSION_CONTRACT and
  PRODUCT describe the editor, revision gate and focused scope.

## RED / GREEN And Investigations

- `/tmp/task10-history-red.log`: initial focused Rust history tests fail to
  compile before implementation (also contained two invalid Rust float literals,
  corrected before GREEN). This is scaffolding RED, not a behavioral failure.
- `/tmp/task10-ui-red.log`: pure piano geometry test fails because its module is
  absent; implementing the module makes all three geometry tests pass.
- `/tmp/task10-dom-red.log`: existing editor tests plus the new piano selection/
  keyboard test fail against the missing transaction/gesture implementation.
  Tests now assert authentic revision envelopes, serialized origin-track edits,
  cancellation, velocity grouping and refreshed file outcomes.
- `/tmp/task10-browser.log`: actual Chromium reveals empty-grid double-click
  fails because pointer-down repaint replaces the target between clicks. Keep
  empty-grid targets stable; subsequent double-click/body/resize/Escape/keyboard
  tests pass. Later browser attempts correct test geometry from assumed 16 beats
  to the actual eight-beat example and scroll the velocity control into view.
  Those test setup failures are not claimed as product failures.
- `/tmp/task10-native.log`: first actual native attempt stops at the preexisting
  rejected audio-format assertion. A changed enqueue return value swallowed
  rejection from the audio panel, which incorrectly displayed "saved".
  `/tmp/task10-queue-red.log` reproduces that exact false success in DOM tests.
  Restoring the original rejected-promise return and guarding raw musical event
  handlers fixes it; `/tmp/task10-queue-green.log` passes. A further DOM test
  confirms automation rejection restores the accepted score and a subsequent
  edit succeeds. No native assertion was removed or weakened.
- `/tmp/task10-native2.log`: actual piano add/keyboard/undo/redo and the
  independent effect editor pass, then the new harness helper tries to read
  transport diagnostics with their details panel closed. The helper now opens
  that existing panel before Stop assertions; no assertion is weakened.
- `/tmp/task10-index-red.log` and `/tmp/task10-point-index-red.log`: self-review
  reproduces stale numeric indices queued behind note/automation deletions. A
  local list revision guard rejects these old indices while preserving the first
  accepted edit. Originating tracks/input values stay captured; ordinary
  serialized edits still use predecessor-returned musical revisions.
- A rounded overlap test initially used a beat that rounded to an abutting frame
  at the actual example tempo, so the test fixture was corrected to create a
  genuine overlap. Independent sub-frame duration and disabled-lane truncation
  assertions also pass.

## Verification Commands And Results

Final native/resource outcomes are appended below.

```sh
bash apps/alive/build.sh
```

`/tmp/task10-build-final-source.log`: release native library, Ultra and separate Alive
build succeed after the final index/selection corrections. Existing native build publishes its
library atomically. Only the existing unused `reserve_native` warning remains.
Subsequent production-source changes: none; later additions are tests/docs only.

```sh
PATH="$PWD/experiments/clockwork-faust/.deps/rust/bin:$PATH" \
CARGO_HOME="$PWD/experiments/clockwork-faust/.deps/cargo" \
ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build" \
LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked
```

`/tmp/task10-rust-full.log`: 177 passed, zero failed, two existing ignored;
main/doc targets pass. Later test-only extensions run in
`/tmp/task10-rust-identity.log`: all 14 desktop tests pass, including independent
same-source effect values, sub-frame duration, unknown target and disabled-lane
truncation. Three history tests cover count/byte eviction, oversized rejection,
redo invalidation/no-op, strict direction and relocation-safe projection.

```sh
PATH="$PWD/experiments/clockwork-faust/.deps/rust/bin:$PATH" \
CARGO_HOME="$PWD/experiments/clockwork-faust/.deps/cargo" \
ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build" \
LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
cargo test --manifest-path apps/alive/src-tauri/Cargo.toml \
  --target-dir "$PWD/apps/ultra/src-tauri/target" --release --locked
```

`/tmp/task10-alive-rust.log`: own-app window/capability test passes (1/1).

```sh
uv run --no-project \
  --with-requirements apps/ultra/tests/ci/requirements.txt \
  bash apps/ultra/tests/ci/check-contracts.sh
```

`/tmp/task10-contracts.log`: complete contracts gate exits zero. Native event,
Stop/routing, observer, numeric, arithmetic, message and popup contracts pass.
Optional unpublished hierarchy oracle remains explicitly UNAVAILABLE. The known
regenerated arithmetic `results/native-build.json` is restored to baseline bytes.
No DSP implementation changes are made. After the renderer-only queue fix:

```sh
node --test apps/ultra/ui/*.test.mjs apps/ultra/ui/components/*.test.mjs
npm --prefix apps/ultra/tests/ci run test:browser -- \
  --config playwright.config.mjs alive-chain.spec.mjs
```

`/tmp/task10-node-final.log`: 468 passed, zero failed, including audio-panel and
raw musical handler recovery and stale note/automation point index regressions.
`/tmp/task10-browser-final-source.log`: three actual Chromium tests pass, including
previous chain/metadata/minimum-width controls and piano add/body/resize/velocity/
Escape/keyboard/undo transactions. Browser fixtures do not qualify hosting/audio.

Impeccable context and one mechanical detector run preserve existing identity;
`/tmp/task10-impeccable.json` retains existing palette advisories and a small-text
warning. New help/velocity text was raised to 12px. One batched screenshot
inspection covers actual native initial desktop and browser piano/history;
functional harness reruns are not polish iterations.


## Actual Final Native Journey

```sh
ULTRA_TEST_ALIVE=1 \
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-task10-native-final
```

`/tmp/task10-native-final.log` exits zero. Receipt:
`/tmp/alive-task10-native-final/native-session-report.json`. This is the actual
separate release Alive binary on owned Xvfb and private software PipeWire.

- Double-click adds note 13 at beat 2, pitch 80, duration .25, velocity 100.
  Keyboard edits set beat 2.25 and pitch 81. Undo restores pitch 80; redo restores
  81. The already-open effect editor remains independently usable at base 2000.
- Apply while playing reports Stop transport and retains note 13 and undo.
  Stop/Apply clears the scope, closes the old editor generation, and preserves
  the effect's base/prepared ownership. Reopened effect editor still reads 2000;
  Start plays the prepared score. The saved/reopened note remains exactly
  `{beat:2.25,pitch:81,duration:.25,velocity:100}`.
- Undo to prepared music retains redo through Save As; successful Open clears
  it. Prospective missing-source Open retains a pending pitch edit and undo,
  without stopping transport/frame progress. Existing changed effect-source
  recovery refusal, independent same-source bases/bypass/mixer, lane ownership,
  real editor Close/reopen and removal regressions remain asserted.
- Explicit Apply in Quit followed by outer Cancel leaves the music applied and
  history cleared. Explicit Discard followed by a canceled Save As picker leaves
  it discarded and history cleared. Existing actual WM Close/dirty Cancel,
  pending Quit Cancel retaining pitch/playback, and final Quit Discard/exit pass.
- `piano-history-playing.png` captures the final release piano with diagnostics
  collapsed, the selected Lowpass effect, base 2000 and prepared ownership 1200.
  The panel reopens before subsequent diagnostic assertions. This is one final
  visual confirmation, not a further polish pass.

Software capture: 2,798,592 frames / 58.304 seconds, finite, peak
`0.35335424542427063`, SHA-256
`e42250132455c96b28920592dfc9b551cb20003492373e7e75efc849b6f20356`.
Both captured channels match in this fixture, so no channel-separation proof is
claimed. Deliberate Stop/Apply/reopen silence occurs in the capture. Final
observation: PipeWire `default_output`, 48 kHz, observed 512 frames, 1,608
callbacks, absolute frame 3,077,632, playing true, stream errors 0, failed false
and rejected commands 0. Native generation 79 counts loops/discontinuities.
The earlier native3 journey also passes, but the final receipt is the authority
for the final production source, failed-Apply assertion and unobscured screenshot.

## Editor Resource Regression And Final Review

```sh
ULTRA_TEST_ALIVE=1 \
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_editor_resources.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-task10-editor-resources
```

`/tmp/task10-editor-resources.log` exits zero. Receipt:
`/tmp/alive-task10-editor-resources/editor-resources.json`. Eight editor
close/reopen cycles followed by 25 seconds idle keep the same three PIDs and
one WebKit web process throughout. First closed sample has 154 descriptors;
cycles two through eight and the idle sample have 153. PSS is 454,071 KiB at
the first close, 474,328 at the eighth and 491,764 after idle: +37,693 KiB from
the first close. RSS rises from 722,512 to 764,684 KiB over those same samples;
threads fall from 111 to 96. These observations pass the existing bounded
resource assertions; they do not prove leak-freedom or long-run stability.
Transport starts before the cycles and stops afterward. This resource receipt
contains process observations, not a separate audio capture or xrun counter.
The private harness emits portal-backend/display warnings but completes its
initialization/secondary-window and resource assertions successfully.

Self-review is complete, including the stale-index and rejected audio-request
regressions described above. Final `git diff --check` and Python compilation of
`check_alive_desktop.py` and `check_alive_editor_resources.py` both exit zero.
No production code changed after the successful final native journey. Parent
owns independent review and retained evidence; parent-owned PLAN/progress,
Task 11 design and experiment receipt changes are excluded from this commit.


## Limits

One clip per track, session-v2/native-v2, one or two instrument tracks, two
effects per track and six instances remain. No clip banks, launch/scenes,
capacity increase or DSP duplication. GUI software audio observations do not
establish physical-device latency, exact event samples, CPAL xrun counts,
endurance or leak-freedom. Existing native/DSP tests retain their own evidence
scope. Controller-owned independent review and later M3 capacity/endurance
acceptance remain separate.
