# Task 10 Native CI Harness Correction

2026-10-24. Implemented on Task 11 checkpoint
`db96180772e59099cc96e0bab189ba2dc8825522` (tree
`fb2297002f5db0e02d7e8311cc83ddb9c8436cac`). Local qualification passes;
independent scoped review and a new exact-head CI qualification remain with the
controller. Historical CI run `40062078651` is still a failed run.

## Scope And Changes

- `apps/ultra/tests/check_alive_desktop.py`: Alive-specific reorder input now
  resolves the actual scoped showing frame, matches its native window by title
  and process ID, and follows native hit-test ancestry at the target center.
  It flushes pointer motion separately and waits up to two seconds for enabled,
  sensitive, showing, positive-geometry target ownership. Each poll re-resolves
  the accessible geometry/state; a moved target receives fresh pointer motion.
  Only after the native ownership predicate passes does it send one button
  press/release. Failure records hit paths/unavailable states and a screenshot.
- The original `Select Pulse Stereo Lowpass effect 2` assertion remains. The
  later reorder pair also explicitly waits for each resulting order. All saved
  identity/order, source, editor/history, audio and cancellation assertions remain.
  Shared Ultra `ui.click` is unchanged.
- The same file splits the native chooser slash gesture: key press and flush,
  bounded wait for the focused/showing/enabled/sensitive EditableText entry with
  positive geometry, then key release in `finally`, including on error. The old
  three-gesture retry loop is removed. Every release records its readiness and
  result in `native-inputs.json`.
- `apps/ultra/tests/check_alive_native_input.py`: focused actual-native regression
  loads Utility and Lowpass through that chooser helper, saves their complete
  effect state, verifies the first reordered identities, deliberately waits for
  an actual native tooltip covering Earlier, then requires one corrected Earlier
  click to restore every saved effect field. It preserves hit paths, screenshots,
  audio diagnostics and normal Quit evidence. The initial chain preparation in
  the full journey also exercises that tooltip precondition. The hover is a
  bounded diagnostic precondition, not the correction's wait strategy.
- This report is the third committed file. No application, Rust, DSP, event
  limit, package tooling, credential or persistent environment changes.

## Direct Red Evidence

The accepted diagnoses were read before this correction:
`.superpowers/sdd/PLAN/ci-d1f8a66-reorder-diagnosis.md` and
`experiments/alive-piano-m3-20261024/gtk-diagnostic/README.md`.

The retained immutable-binary reorder probe loses the ordinary batched click
with an actual tooltip covering Earlier, leaves Lowpass 1 / Utility 2, and
restores order on an identical retry. The controlled comparison records native
child `4194413` instead of owned main window `4194307` before motion; after a
motion-only flush the main window owns the point in 0.010334581 seconds and the
single unchanged press/release works. Those observations establish the input
failure mechanism. Attribution of the exact historical CI event remains an
inference because that run did not retain its pre-click tooltip/hit trace.

The separate fatal-critical GTK reproduction stops at slash key release:
GDK event 9, keyval 47, `GtkFileChooserEntry`, realized=false. Its paced
comparison completes both loads and exits normally. The old debugger's cached
event-pointer inspection after normal exit is a debugger error, not an app
failure. No debugger is used in the new qualification below.

Historical executable SHA-256:
`0e0576124a45460c266f49f309bf140d02bda4cd8d223f1a1455abaf56846fdc`;
historical adjacent library:
`693f0acff15caa77b8e572255f9e333bd8254eec2905c19386b38ffd9882a3a1`.
These historical objects were not used to claim the new green qualification.

## Build And Source Identity

Command, exit 0:

```sh
bash apps/alive/build.sh > /tmp/task10-ci-fix-build.log 2>&1
```

This builds native DSP plus the separate Ultra and Alive release executables,
then atomically publishes the adjacent native library using the existing build
script. No mapped-library inode was overwritten in place. `ldd` resolves
Alive's `libultra_native.so` to the adjacent rebuilt release library.

SHA-256 identities, also in `/tmp/alive-task10-ci-fix/receipt.json`:

| File | SHA-256 |
| --- | --- |
| `apps/ultra/src-tauri/target/release/alive` | `e34d21b5857ea381805c4d195d5c60b0ad1c6d1d7bbbf5d5675fab00871e8a78` |
| `apps/ultra/src-tauri/target/release/ultra` | `563bb3842af71be266364c902731955a916ecd5c863f3474eaed87d0b7217b63` |
| `apps/ultra/src-tauri/target/release/libultra_native.so` | `8d1768cedb1f5b2208f8708deb8fccb663c727dcc4ecbdf183a257cbe9755f00` |
| `apps/ultra/tests/check_alive_desktop.py` | `810ed297c65c5fb758416d504944ef2159925dc8a441e2d55aa6b03ae15210ef` |
| `apps/ultra/tests/check_alive_native_input.py` | `33114e9cbea272cc5100bd5b11f7f4527fc50ba6ba052dbccc1c395050f3f6e1` |

The post-run check confirms these source/binary/library hashes remain unchanged.
`/tmp/alive-task10-ci-fix/artifact-sha256.json` records 69 raw artifact hashes
across the build log, initial fixture failure, focused success and full journey.

Build warning retained: `method reserve_native is never used`,
`src/document_windows.rs:39:8`, `#[warn(dead_code)]`. The build otherwise
finishes successfully; there is no warning suppression.

## Focused Actual-Native Qualification

`/tmp/alive-task10-ci-fix/launch-fatal` is a temporary executable launcher:

```sh
#!/bin/sh
exec env G_DEBUG=fatal-criticals /home/venetanji/.codex/worktrees/edd5/alive/apps/ultra/src-tauri/target/release/alive "$@"
```

The final command exits 0:

```sh
ULTRA_TEST_ALIVE=1 \
ULTRA_TEST_ALIVE_BINARY=/tmp/alive-task10-ci-fix/launch-fatal \
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_native_input.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh \
  /tmp/alive-task10-ci-fix-input-v2 \
  > /tmp/alive-task10-ci-fix-input-v2.log 2>&1
```

`native-input-report.json` proves two distinct stable effect identities, the
reversed intermediate order, and exact equality of the final saved effects
with the original effects. Before Earlier, its rectangle is
`[1018,385,52,25]`, and the native path is `[927,4204071]`: a typed tooltip,
not owner `4194307`. The corrected helper samples that blocked path, flushes
motion separately, samples `[927,4194307]`, and records `presses=1,releases=1`.
`reorder-covering-tooltip.png` visibly covers the Earlier row;
`input-restored.png` retains the restored state. Both chooser gestures record
`ready_before_release=true,released=true`. Quit exits normally; the application
log has no GTK critical. Focused audio is intentionally off, callbacks=0; this
run qualifies input behavior rather than playback.

An earlier fixture attempt is retained at `/tmp/alive-task10-ci-fix-input` and
`/tmp/alive-task10-ci-fix-input.log` (exit 1). It failed before either correction
was exercised because the fixture queried `Transport playing` while Audio
details was collapsed. The fixture was corrected to open diagnostics for that
initial assertion and close them before editing. No product or assertion
weakening addressed this fixture error. The final source is the v2 source.

## Full Actual-Native Journey

Command, exit 0, run sequentially after the focused regression on the same
rebuilt release/native library:

```sh
ULTRA_TEST_ALIVE=1 \
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh \
  /tmp/alive-task10-ci-fix-native \
  > /tmp/alive-task10-ci-fix-native.log 2>&1
```

`native-session-report.json`, `native-inputs.json`, `operations.json`, saved
sessions, captures and screenshots retain the results:

- Startup delivery and simultaneous separate Alive/Ultra native windows pass.
  The private audio-settings flow saves 48 kHz / 512 frames, rejects the
  unsupported buffer without replacing settings, terminates notes on stop, and
  restarts with transport stopped.
- Both reorder pairs pass with one press/release per click. The original
  Lowpass effect 2 guard passes. Prepared and saved Utility/Lowpass instance IDs
  remain `500be439-cca0-4314-ae21-d551412a3203` and
  `c888f2ea-6991-44a8-a8e8-2718f89ad51d`, in that order.
- Native device loads, independent chain/editor parameter state, live base and
  automation ownership, piano add/keyboard/undo/redo, stopped Apply, editor
  closure/reopen, save/reopen, missing/changed-source rejection preserving the
  playing session, device removal and terminated voices all pass.
- All nine slash gestures record usable entries before successful release.
  The full application log has no `Gtk-CRITICAL` entry.
- Capture: 2,719,744 stereo frames, 56.66133333333333 seconds, every sample
  finite, peak 0.35335424542427063; SHA-256
  `9572ae8fa52ac8b47f36da69dca6a03045a44524881c85d156ac2af556ba2dd6`.
  The source explicitly checks every sample for finiteness. Intentional stop
  and reopen intervals remain in the capture; it is not continuous-playback
  deadline evidence. Final recorded PipeWire diagnostics: callbacks=1510,
  absolute frame=3000832, stream errors=0, rejected commands=0, failed=false.
- Accepted Apply followed by outer Quit cancellation clears draft history;
  accepted Discard followed by canceled Save picker clears draft history;
  Quit cancellation preserves the session; native window close reaches the
  dirty guard; pending-draft Quit cancellation preserves edits/playback; final
  Quit/Discard exits. All six receipt flags are true.

## Warnings, Self-Review And Limits

Raw harness logs retain portal activation failures (`cannot open display :0`,
missing portal implementations, no Wayland compositor), and the private
PipeWire legacy access-option warning. Application logs retain the two
MESA-EGL DRI3 warnings. Those outer portal diagnostics are distinct from an
application GTK critical. They are not filtered or treated as evidence that
all GTK assertions are harmless. The focused process-local fatal setting
applies only to the final Alive app, not the startup smoke helper or services.

Self-review checked actual-frame/PID ownership rather than a guessed corner
point, ancestry membership rather than topmost-child equality, fresh target
state/geometry after motion, bounded occlusion evidence, exactly one click,
finally-released slash, and unchanged shared input behavior and original
regression guards. `python3 -m py_compile` for both changed scripts and
`git diff --check` pass. No broader Rust/DSP/UI suite was repeated for this
harness-only correction. Parent-owned PLAN, progress, README and evidence
changes remain outside this commit.

Qualification uses owned private Xvfb/accessibility/software PipeWire sessions.
Optional WM/client ancestry is supported by the native path algorithm but was
not separately qualified; shared Ultra input was not changed. No physical
input/audio, Xrun-specific count, uninterrupted deadline result or endurance
soak is claimed. `endurance=null` and conservative endurance seconds=0. This
does not qualify the pending Task 11 native review correction or future source
changes. No local blocker remains for this scoped correction; independent
review, controller evidence retention and exact-head CI remain follow-up gates.
