# Ultra CI

`.github/workflows/ultra-ci.yml` runs only on manual dispatch. Ordinary pushes
and pull-request updates do not start CI, including on `main`. All three jobs
and the optional Alive endurance modes remain available when requested. It does
not deploy, release, publish a package, or submit to a store.
The token is read-only, checkout credentials are not persisted, and the workflow
does not read repository secrets or use `pull_request_target`.

In GitHub Actions, select **Ultra CI**, choose **Run workflow**, then select the
branch and endurance mode. From a checkout with GitHub CLI authentication:

```sh
gh workflow run ultra-ci.yml --ref YOUR_BRANCH -f alive_endurance=off
```

Use `pilot` or `endurance` instead of `off` for the optional sustained journey.
Dispatch a fresh run on the intended final commit before merge/release
qualification; an older green run does not validate later commits. Desktop
packages are a separate opt-in workflow documented in
`docs/ultra-desktop-releases.md`; version tags still trigger release packaging.

## What the three jobs establish

1. **UI, protocol, and reference tests:** all UI/controller/component Node tests,
   bounded Max inventory tests, recorded Max evidence/schema integrity, launcher
   installation/file-argument regressions, and portable native sequence, graph
   and multi-document workspace execution tests. Document tests cover save/dirty
   races and independent new/open actions; send/receive tests
   cover typed names, ports and supported import semantics. The original help
   manifest is checked against the browser library and 68 native object kinds plus patcher/comment constructs
   (144 original help/example/starter/device entries).
   The list-runtime check compiles the production native headers and compares
   ordered outlets, selectors and values against recorded Max cases, including
   scalar integer/float identity. The recordings cannot establish numeric atom
   tags within lists. Two feedback cases require their own topology tests and
   are explicitly excluded from the generic replay. Signal-runtime checks
   validate the frozen capture and compile the production native headers for
   comparison against 197 recorded Max cases / 114560 samples. These samples
   passed through Max buffer~ float32 storage; they do not establish its internal
   DSP precision. Portable signal tests cover mixed ports, summed inputs,
   separate dependency graphs, ramps, snapshots and native lifecycle behavior.
   Exact noise sequences and periodic snapshot scheduling remain outside the
   compatibility claim. The unpublished local hierarchy oracle is explicitly reported as `UNAVAILABLE`
   in a public checkout; original portable hierarchy/resource tests still run.
   Partial or changed local oracle bundles fail identity checks. This is no
   Max comparison pass. Eight `Preparation008Tests` methods additionally require
   the separate private capture007 runtime and historical directories. They are
   explicitly skipped only when both are wholly absent; any partial local
   directory or symlink makes them execute their unchanged strict checks. The
   remaining arithmetic preparation tests use original portable synthetic
   fixtures and still run. Eleven private-derived `plus008` helper cases likewise
   report `UNAVAILABLE` only when licensed resources and both capture007
   directories are wholly absent; all original in-memory helper suites remain
   active. The reference checks do not run Max or establish
   whole-help compatibility. Signal source identities and observations are in
   `experiments/max-reference/signal-runtime-20261021/`.
2. **Chromium canvas editing smoke:** the actual HTML/CSS/modules served over
   loopback HTTP in sandboxed Chromium. It checks document editing and visible
   top-inlet/bottom-outlet geometry, keyboard creation, text-edit undo, lock
   protection, directional help, group moves, zoomed cord geometry, dragging
   cords in both directions, keyboard wiring, rejected drops, cancellation,
   history during wiring, full control faces, modifier operation, numeric dragging,
   gesture cancellation, styled range orientation, inspector export/reset/undo,
   Max tab selection and explicit partial imports, and small viewport controls.
   Preview suites use no Tauri/native IPC shim. `canvas-documents.spec.mjs`
   separately supplies a document bridge fixture to check the native window
   switcher layout with sixteen entries at 640x480 and keyboard file actions.
   It does not run native graphs.
   No suite creates browser audio; passing these checks is not native audio
   qualification.

3. **Linux native build, Rust bridge, and CPAL loopback:** builds the pinned real Clockwork/Faust
   engine and `libultra_native.so`, runs backend/sequence/canvas integration tests
   against an explicitly identified JACK ABI test double, then builds and tests
   the real Rust/Tauri bridge using `Cargo.lock`. Rust document tests cover
   atomic saves, source protection, registry limits and close admission.
   The numeric UI backend regression covers physical Tab admission, hot-edit
   ordering, stopped execution, queue saturation and stale/closed rejection.
   Print popup tests preserve the console ABI and cover strict p1 admission,
   typed receipts, independent objects, clearing, graph reset and non-consuming
   atomic snapshots with two concurrent readers across1000 rendered updates.
   Finally it explicitly runs the
   ignored `audio::tests::private_software_output` test in a private software-only
   PipeWire graph and checks recorded stereo PCM for finite, non-silent,
   non-clipping samples. The test must exist (zero matched tests fails the gate).
   This executes actual CPAL callbacks and native DSP, not an audio mock.
   It does not prove real JACK server behavior, physical MIDI, audible hardware
   output, hardware latency, or realtime deadlines.

The optional desktop `check_canvas_desktop.sh --software-audio` additionally
drives the built Tauri/WebKit app with real X input: notch-adjacent button/toggle
clicks, locked and modifier sliders, numeric dragging, and native downstream
observations. It also checks integer truncation and authored keyboard entry,
physical Tab on both number boxes, and silent incoming `tab` messages through
the actual WebKit/Tauri/native boundary. When the licensed local `slider.maxhelp` is available (override
with `ULTRA_TEST_MAX_HELP`), it opens the original JSON through the dialog,
accepts the partial basic tab, and checks the actual imported slider-to-number
branch. The report records whether that optional source was available; it never
claims complete Max help execution. The same run checks real CPAL software audio.
It also exercises the native print console with audio off and during playback,
including message text through WebKit accessibility, slider output and Clear.

That runner first invokes `check_document_startup.py`, which holds initialization
on a private FIFO and delivers a second file before the main window is registered.
The secondary process must return promptly; both documents must then retain
healthy native graphs. Only the expected non-file alert is dismissed.
The test compiles a secondary-only preload probe with `cc`, requires 32 further
canonical-path deliveries to succeed, and verifies that the unused forwarding
processes skip exit finalizers. This covers the pinned Linux plugin patch in
`../../src-tauri/vendor/tauri-plugin-single-instance/ULTRA_PATCH.md`; the primary
keeps its ordinary shutdown path.

It also invokes `check_documents_desktop.py` in the same private session.
It exercises all ten list-processing objects through the console with shared
audio stopped and running, and all twelve new MSP kinds through actual CPAL
output. The signal graph checks summed inputs, independent document Stop,
named Receive resuming a stopped graph, and global DSP restart without another
control event.
It checks startup/secondary file arguments, single-instance delivery, focusing an
already-open file, native New/Open/Save, Save/Discard/Cancel on close, help opening
in its own window, typed cross-window send/receive with audio off, and two
documents playing through the shared stereo output. A local Stop patch must
leave the other document audible. Its `documents-result.json` and PCM captures
are separate native evidence; these desktop checks are not part of the three
cloud jobs.

Reproduce static coverage and native execution of the exact imported slider
fragment with `experiments/max-reference/help-import-20261021/check-import.mjs`.
No proprietary help source is stored in the repository.

The native runner installs JACK headers, ALSA/PipeWire/libclang build dependencies
for CPAL, and Tauri's GTK/WebKit dependencies from
Ubuntu's official apt repositories, plus `pipewire-bin`, `wireplumber`, and `dbus`
for the private loopback gate. It also tests the Rust-host native rendering ABI
across callback partitions. Physical and native desktop Audio settings UI
qualification remain separate tasks described in `../../RUNNING.txt` and
`../../AUDIO.md`; neither is claimed by the cloud job.

The loopback script starts only its own PipeWire server, policy-only WirePlumber,
and D-Bus session under a fresh mode-0700 temporary runtime directory. No hardware
monitors, system service reconfiguration, device permissions, or security bypasses
are needed. Ubuntu 24.04's WirePlumber 0.4 uses upstream `policy.conf`; newer
WirePlumber uses its `policy` profile. Capture requests `--raw` when advertised
by `pw-cat --help`, because newer versions otherwise write an AU container to
stdout; PipeWire 1.0's raw stdout remains supported without that flag. Recording stops cleanly
after the real Rust test, so frame count varies. The analyzer requires a recorded
planned SIGINT, a passing probe, empty recorder stderr, and valid stereo PCM.
It accepts exit status 1 only for matching compiled/linked PipeWire 1.0.5,
1.6.9 or 1.6.10: upstream
[`pw-cat` returns success only after playback drain](https://github.com/PipeWire/pipewire/blob/1.0.5/src/tools/pw-cat.c#L1916-L1921),
not for a recording stopped by SIGINT. The
[same shutdown behavior remains in 1.6.9](https://github.com/PipeWire/pipewire/blob/1.6.9/src/tools/pw-cat.c#L2655-L2660)
and [1.6.10](https://github.com/PipeWire/pipewire/blob/1.6.10/src/tools/pw-cat.c#L2645-L2650).
The raw exit status remains in the report;
unknown-version status 1, timeouts, missing stop evidence, errors, and invalid PCM
are rejected. `check_cpal_capture.py --self-test` covers these cases in the
contracts job without substituting for the actual audio integration gate.
Probe and capture timeouts bound
failures; process cleanup removes the private runtime directory.

CI uploads build logs, exact tool versions, the matched test list, daemon/test
logs, graph and link snapshots, raw stereo float32 PCM, and a JSON signal report
when successful. Available failure evidence is uploaded too, for seven days.
No waveform or JSON report is a claim of acoustic or hardware qualification.
The Ubuntu runner and apt security updates are intentionally not frozen images.

## Run locally

From the repository root, with Node 22.20.0, Python 3.12, and a C++ compiler:

```sh
python3 -m pip install -r apps/ultra/tests/ci/requirements.txt
bash apps/ultra/tests/ci/check-contracts.sh
```

For browser smoke:

```sh
cd apps/ultra/tests/ci
npm ci --ignore-scripts --no-audit --no-fund
npx --no-install playwright install --with-deps chromium
npm run test:browser
```

The browser must support its normal sandbox. The test configuration explicitly
keeps it enabled; do not work around a launch failure with `--no-sandbox`.
The browser job uses the supported Ubuntu 22.04 runner so it does not need to
change Ubuntu 24.04's AppArmor user-namespace restrictions for downloaded browsers.
The test runner owns its loopback HTTP server and shuts it down afterward.
GitHub retains browser reports, screenshots, and failed-test traces for seven
days. Tests use only the checked-in research patch, never a user's private data.

For native document/file/message and software-audio desktop checks after a full
build, use Linux GTK/WebKitGTK, Python GI/AT-SPI, Xvfb/xauth, D-Bus, PipeWire,
WirePlumber, `pw-cat` and `pw-link`:

```sh
bash apps/ultra/tests/check_canvas_desktop.sh --software-audio /tmp/ultra-canvas-results
```

This runs both canvas and document desktop checks. To run only the document
checks in the same isolated harness:

```sh
ULTRA_TEST_DOCUMENTS_ONLY=1 bash apps/ultra/tests/check_canvas_desktop.sh --software-audio /tmp/ultra-documents-results
```

For the native trackpad-pinch regression in the same isolated harness:

```sh
ULTRA_TEST_PINCH_ONLY=1 bash apps/ultra/tests/check_canvas_desktop.sh --software-audio /tmp/ultra-pinch-results
```

This injects synthetic GDK touchpad-pinch events into the actual Tauri/WebKitGTK
widget. It checks canvas zoom, unchanged toolbar geometry, cancelled-gesture
recovery and pinches over toolbar controls. The probe runs only in its test
process; physical trackpad hardware and Wayland delivery still require a manual check.

The harness owns its private X display, D-Bus/accessibility session and
software-only PipeWire output; it does not drive the user's desktop or connect
to hardware audio. The `--software-audio` spelling remains accepted for
compatibility; this runner always uses private software audio.

For the optional Linux WebKitGTK gain-slider rendering regression, use system
Python with GI, Cairo, GTK 3, WebKit2 4.1 introspection, Xvfb, and xauth installed:

```sh
xvfb-run -a python3 apps/ultra/tests/ci/check_gain_slider_webkit.py
```

This check loads the real page in an ephemeral WebKit context on a private
display, owns its loopback server, and samples the gain track at minimum,
midpoint, and maximum. It covers the Linux rendering engine used by Tauri;
it is separate from the three cloud jobs and makes no native audio claim.
See [the slider color study](../../../../experiments/max-ui-reference/slider-colors.md)
for the observed engine difference and the bounded Max comparison.

For native checks, first install the apt packages listed in the workflow, then:

```sh
bash apps/ultra/build.sh --native-only
python3 apps/ultra/tests/check_backend.py
python3 apps/ultra/tests/check_sequence.py
python3 apps/ultra/tests/check_canvas.py
export PATH="$PWD/experiments/clockwork-faust/.deps/rust/bin:$PATH"
export CARGO_HOME="$PWD/experiments/clockwork-faust/.deps/cargo"
export ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build"
export LD_LIBRARY_PATH="$ULTRA_NATIVE_LIB_DIR"
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked
cargo build --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked
bash apps/ultra/tests/check_cpal_audio.sh "$PWD/apps/ultra/build/cpal-evidence"
```

The object batch also has a real C ABI check for stopped-audio message dispatch,
live parameter state retention, and native `line` ramp/completion scheduling.
Build the native library first, then run from the repository root:

```sh
c++ -std=c++17 -O2 -Wall -Wextra -Werror \
  apps/ultra/tests/canvas_idle_test.cpp -L apps/ultra/build \
  -Wl,-rpath,"$PWD/apps/ultra/build" -lultra_native -o /tmp/ultra-canvas-idle-test
/tmp/ultra-canvas-idle-test
```

This opens no audio device. The portable contract gate separately compiles the
native graph and workspace tests, including typed routing, outlet order, ramp
timing, isolated document state, global named-message fanout, and bounded
cross-document feedback. `canvas_signal_objects_test.cpp` additionally checks
the twelve new signal kinds, signal/control admission and dependency graphs,
arithmetic, oscillator phase, clipping, sample-clock ramps, snapshot offsets and
deferred signal-to-control notifications.

The native CI job also compiles and runs `document_runtime_test.cpp`,
`document_audio_test.cpp` and `signal_audio_test.cpp` against the built library.
The document tests check timer and voice isolation, console retention across
edits and cleanup at close/reuse, FIFO close
rejection, receive binding and counter retention across audio restart, and actual
shared-engine audio. The signal audio test checks mono summing, ramps, local
Stop/resume, explicit global DSP restart, cross-window next-sample ordering and
callback partition invariance. Global restart resumes all continuous signal
graphs, including locally stopped ones, while leaving stopped metros off.
Cycle resets phase and Phasor retains phase across DSP off/on. These tests also
keep the current-frame native MSP evaluator distinct from the legacy custom
Voice 64-frame pipeline. The engine-start/graph-replacement guard mutes the first
64 output samples while signal state advances; the signal test accounts for
that separate guard. Run their CI compile commands locally after building:

```sh
for test in document_runtime document_audio signal_audio; do
  c++ -std=c++20 -O2 -Wall -Wextra -Werror "apps/ultra/tests/${test}_test.cpp" \
    -Lapps/ultra/build -lultra_native -Wl,-rpath,"$PWD/apps/ultra/build" \
    -o "apps/ultra/build/${test}-test"
  "apps/ultra/build/${test}-test"
done
```

These tests use the external host render API and open no audio
device; the separate CPAL loopback gate verifies device callback integration.

Run the complete compiled-backend gate with:

```sh
bash apps/ultra/tests/ci/check-native.sh
```

The portable contract gate includes `canvas_voice_objects_test.cpp` for the six
authored four-voice objects, exact lane admission, allocator behavior and Faust
signal processing. The compiled-backend gate also runs
`canvas_voice_backend_test.cpp` with the backend and core linked statically.
Linker wrappers count allocation, free and mutex calls during render while the
test exercises voice termination, saturated ingress and callback partitions.

The native CI job renders the original saved instrument through the real Rust
document admission path, with both desktop display variables removed:

```sh
env -u DISPLAY -u WAYLAND_DISPLAY LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
  apps/ultra/src-tauri/target/release/ultra --instrument-probe \
  apps/ultra/examples/subtractive.ultra apps/ultra/build/instrument-evidence
```

This host creates two independent roots without creating an editor, then checks
live level, cutoff and envelope edits, metadata and preset retention, isolated
Stop/close and an audible cable disconnection/restoration. The command fails if
an assertion fails and writes stereo float32 WAV segments plus `report.json`.
CI uploads those artifacts for seven days. This proves standalone saved-graph
processing; Alive session hosting and hardware timing remain outside the probe.

## Dependency and cache policy

The existing native setup scripts pin Rust 1.85.1, CMake 3.31.6, Faust 2.88.0,
and the Clockwork commit, with SHA256 verification. CI caches only downloaded
archives and Cargo registry downloads/index, not multi-gigabyte extracted
toolchains or native build products. A fresh runner rechecks the archive hashes.
There are no broad fallback cache keys. Jobs have bounded timeouts; new commits
cancel older runs for the same ref.

Playwright 1.56.1 and its matching browser revision are locked in `package-lock.json`.
Schema-validator dependencies are exact-version pinned in `requirements.txt`.
Every GitHub Action uses a full commit SHA verified in its official repository:

- [checkout 11bd719](https://github.com/actions/checkout/commit/11bd71901bbe5b1630ceea73d27597364c9af683)
- [setup-node 49933ea](https://github.com/actions/setup-node/commit/49933ea5288caeca8642d1e84afbd3f7d6820020)
- [setup-python a26af69](https://github.com/actions/setup-python/commit/a26af69be951a213d495a4c3e4e4022e16d87065)
- [cache 0400d5f](https://github.com/actions/cache/commit/0400d5f644dc74513175e3cd8d07132dd4860809)
- [upload-artifact ea165f8](https://github.com/actions/upload-artifact/commit/ea165f8d65b6e75b540449e92b4886f43607fa02)

Update pins deliberately and rerun the workflow. Do not describe a newly added
workflow as passing until GitHub reports all jobs successful for that commit.
