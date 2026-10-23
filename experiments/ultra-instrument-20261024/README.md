# Authored Subtractive Instrument

This slice extends the existing Ultra canvas/native engine with an original
editable four-voice instrument. Base: merged foundation `8217458` on `main`;
there was no `staging` branch. Packaging PR #2 is separate.

## Try It

```sh
bash apps/ultra/build.sh
bash apps/ultra/run.sh -- apps/ultra/examples/subtractive.ultra
```

Start audio, open Perform and play its on-screen keyboard (or focus it and use
A W S E D F T G Y H U J K). ADSR, cutoff, resonance and level edit the actual
graph objects. Init/Soft/Pluck are saved presets. Lock the canvas and click the
separate toggle for the authored chord score. Store a preset and Save to retain
it. New instance creates an independent untitled root. No MIDI hardware is
required; physical MIDI is not connected through the desktop CPAL path.

The six new primitives are `poly.note~`, `saw.voice~`, `lowpass.voice~`,
`adsr.voice~`, `*.voice~` and `mix.voice~`. Four discrete voice lanes remain
explicit until mixdown; the example duplicates mono into a stereo join. Every
audible route is an ordinary cable. The saw/filter/envelope use pinned Faust
library kernels prepared outside render, in the existing native signal evaluator
alongside the legacy Clockwork guest. This does not add arbitrary DSP/JIT,
speaker multichannel or Max instrument compatibility.

## Native Host Interface

Alive session hosting is not implemented. The saved graph plus strict `device`
manifest is the interface demonstrated by the standalone host:

```sh
env -u DISPLAY -u WAYLAND_DISPLAY LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
  apps/ultra/src-tauri/target/release/ultra --instrument-probe \
  apps/ultra/examples/subtractive.ultra /tmp/ultra-instrument-host
```

The harness creates no desktop/editor, uses two independent roots, applies the
three saved presets and live parameter changes without replacing their runtime,
and checks exact silence for mute, Stop and required-cable disconnection. It
renders 207744 stereo frames at 48 kHz to float32 WAV. `host/report.json` retains
the checked result; three short original renders are retained for inspection.
Its `canonicalDocumentSha256` hashes compact canonical document JSON, not the
pretty file bytes. Other segments are reproducible with the command.

## Verification Commands

```sh
node --test apps/ultra/ui/*.test.mjs apps/ultra/ui/components/*.test.mjs
bash apps/ultra/tests/ci/check-contracts.sh
bash apps/ultra/tests/ci/check-native.sh
cd apps/ultra/tests/ci && npm ci --ignore-scripts --no-audit --no-fund
npx --no-install playwright test
```

Contracts need `apps/ultra/tests/ci/requirements.txt` in the Python tool environment.
Native checks need `bash apps/ultra/build.sh --native-only`. Rust tests use the
pinned toolchain/dependency environment from `build.sh`, `ULTRA_NATIVE_LIB_DIR`
and `LD_LIBRARY_PATH=$PWD/apps/ultra/build`. The full build includes Rust/Tauri.
CI performs these gates, the display-free host and private CPAL loopback.
`verification/results.json` records the final local results and release hashes:
409 UI tests, 103 rendered-browser tests, the complete contracts/native gates
and 127 Rust tests passed (two intentional environment-dependent ignores).
Small build/native/Rust logs are retained alongside it. Final pushed-commit
CI status and its run URL are recorded on the draft PR.
The first cloud native gate found a GCC 13 bounds warning in the existing
message-observation publisher. An explicit document-index range check fixes
the diagnostic while keeping warnings fatal. An isolated Ubuntu GCC 13.3.0
compile reproduces failure before and success after the check; native, Rust,
headless host, release build and actual desktop checks were repeated afterward.

Native tests cover oscillator/filter/ADSR response, exact four-lane mixdown,
mono/stereo matching, four-voice capacity/oldest stealing, repeated notes,
sustain, bounded release, callback partition invariance, queue saturation and
scoped/global Stop/Panic/restart. Wrapped malloc/calloc/realloc/free/new/delete
and blocking mutex calls fail if exercised during render, including graph
replacement/close and live parameter writes. Separate documents retain their
own voices and parameters.

## Desktop And Performance

The actual Tauri test builds from an empty canvas using N entry/autocomplete and
ordinary cable drags. It packages the graph, plays panel keys and score, edits
controls, stores/recalls a preset, saves/closes/reopens and operates two instances.
Its private Xvfb/D-Bus/accessibility/PipeWire session avoids user desktop/audio
configuration. Run from the repository root:

```sh
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_instrument_desktop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/ultra-instrument-desktop
```

The test captures a minute of stereo output during parameter edits, object
movement, zoom and Space-drag panning, checks every analyzed one-second window
for output, and records live CPAL buffer/error observations and `pw-top`. Initial
monitor links are created separately, so analysis ignores their first 4096
frames; retained hashes cover each complete raw capture. Structural changes
reset a document's timers/voices by contract; sustained verification uses live
and layout edits, which preserve playback.

The final release run passed with 16 keyboard-authored objects and 18 dragged
cables. Warm was stored, recalled and recovered after reopen; two instances
retained independent controls and voices. A held note remained audible while
cutoff changed, and note release settled to exact silence. During 18 editing
cycles, 2880000 captured stereo frames cover 60 seconds; all 60 analyzed windows
contain output (minimum peak 0.1331). `desktop/instrument-result.json` and four
screenshots retain the results and exact release binary hash.

The host was an AMD Ryzen 9 5900HS, Linux 7.2.8-10-omarchy, Xvfb/WebKitGTK and
Rust CPAL/PipeWire `default_output` at 48 kHz stereo. The callback reported
512 frames / 10.67 ms and zero stream errors. `pw-top` batch output was empty,
so a direct PipeWire underrun count is unavailable. The separate private CPAL
gate recorded 150528 finite stereo frames, 271 callbacks and zero stream errors;
its report and probe log are retained in `cpal/`. Neither run measures physical
MIDI-to-analog latency or qualifies hardware deadlines.

`performance/` retains the repeatable release process-tree CPU/PSS comparison on
the identical original starter, actual WM Normal/Iconic verification, package
versions and binary/patch hashes. `reference/` records a fresh bounded local
Max 9.1.5 authoring observation under Wine 11.13, including preservation and
authorization/DSP limits. No proprietary binaries, factory patches or extracted
resources are committed.

## Limits

- Alive session/device hosting and automation remain absent; the standalone
  host is the integration proof, not an Alive implementation.
- CPAL physical MIDI and calibrated MIDI-to-analog latency remain untested.
  Private software output/callback checks do not qualify hardware deadlines.
- One paired Xvfb performance run has no statistical confidence interval or
  GPU/compositor qualification. Active sequencing still costs WebKit CPU.
- Overflow safety follows bounded control transforms and static Send/Receive
  paths, with wildcard rebindable Receives. Dynamic Int/Float `send <name>`
  dispatch is outside this inference; explicit Stop/Panic remain available.
- Abrupt process termination cannot guarantee pending webview IPC delivery.
