# Max Signal Runtime Implementation Plan

**Goal:** Continue implementing every Max object and installed help file by
adding the general signal graph and twelve MSP primitives.

**Architecture:** Use the existing native shared runtime with separate signal
and control DAGs, mixed inlets and summed signal fan-in. Keep schema, compiler,
editor and host audio timing consistent. Preserve all existing saved kind IDs.

**Tech Stack:** C++17/native Clockwork/Faust, Rust/Tauri, JavaScript/WebKit.

**Spec:** `docs/superpowers/specs/2026-10-21-max-signal-design.md`.

## Constraints

Preserve the dirty worktree and open applications. No commits, resets or
proprietary source redistribution. Use owned disposable Max/private display and
software audio sessions for captures. Keep the all-objects/all-help goal intact.
Current evidence cannot establish complete installed-help execution.

## Tasks

- [x] Reference worker captures original arithmetic and wave scores in
  `experiments/max-reference/signal-runtime-20261021/`, preserving raw samples,
  source hashes, reproducible verification and finite scope.
- [x] Native worker writes failing sample/graph tests then implements
  `canvas_signal_objects.hpp`, signal compilation/state in `patch_graph.hpp`,
  and `tests/canvas_signal_objects_test.cpp`. Required callable interface:
  `signal_sample(double voice_a, double voice_b, unsigned next_offset, Emit&)`
  returns `std::array<double,2>`. Check constants, summed inputs, independent gain
  branches, ramps, phases, snapshot ordering and bounded failure.
- [x] Authoring worker adds parser/model/importer and twelve original runnable
  examples/help entries with regressions. New internal keys and IDs follow
  the spec. Preserve legacy saved `dac`; assign actual `dac~` to `signal_dac`.
  Validate separate control/signal cycles and mixed-inlet cables.
- [x] Root adds Rust preparation/port tests before implementing IDs, typed
  creation configuration, mixed-inlet message admission and graph validation.
  Run focused `cargo test ... canvas::tests::signal_` red, then green.
- [x] Root changes backend sample sequencing with a regression against the
  actual shared library. Rebase event offsets before/after each rendered frame
  without unsigned wrap. Confirm native voice partition behavior and absence
  of duplicate gain scaling. Each document mixes once into shared stereo.
- [x] Integrate recorded-Max/sample tests into contracts and inspect a bounded
  independent review of the changed native/host integration.
- [x] Run all UI/native/Rust/browser checks and rebuild. Use the private desktop
  harness for actual new signal output and document Stop isolation; record
  software-audio performance and the scope of measured Max agreement.
- [x] Update protocol, help counts and coverage evidence without reducing the
  original all-objects/all-help completion requirement.

## Commands

```sh
node --test apps/ultra/ui/*.test.mjs apps/ultra/ui/components/*.test.mjs
uv run --no-project --with-requirements apps/ultra/tests/ci/requirements.txt bash apps/ultra/tests/ci/check-contracts.sh
bash apps/ultra/build.sh
bash apps/ultra/tests/check_canvas_desktop.sh --software-audio /tmp/ultra-max-signal-desktop
git diff --check
```

Record actual results after execution. All completed tasks are phase progress;
none independently proves the complete installed-help objective.

## Integration Review

The bounded independent review identified four issues, all corrected with
regressions: Start audio immediately stopping continuous DSP, signal-generated
named messages arriving one sample earlier for later document slots, live
Snapshot interval edits failing to enable reports, and Rust omitting Noise's
physical control inlet. Root additionally reproduced and fixed a stale Dac
channel-dependent inlet rail and Phasor's saved/live phase parameter having no
effect. Synchronous Snapshot bang now refuses observations outside the existing
control atom bound before changing pulses or downstream state.

Signal evaluation now runs for every live document before a second pass flushes
sampled control notifications. Accepted user events, parameter changes, incoming
named messages and explicit global DSP restart resume stopped signals. Restart
resets Cycle, retains Phasor and realigns Snapshot's 64-frame vector cursor.
Each document still has the existing 64-frame admission/startup output guard;
signal states advance behind it. This differs from Voice's per-path pipeline.

## Verification

- All 208 JavaScript tests, 70 Chromium browser tests and 59 Rust tests pass.
  One opt-in device test is ignored by default; private CPAL checks exercise the
  built desktop separately. Logs are `/tmp/ultra-signal-ui.log`,
  `/tmp/ultra-signal-browser-all.log` and
  `/tmp/ultra-secondary-exit-green/rust-test.log` (after the final host fix).
- Native signal tests and ASan/UBSan pass. Existing graph, mapped-object, list,
  workspace, backend fake-JACK and sequencer suites pass. An obsolete test that
  rejected a now-valid direct signal route now rejects a true signal cycle.
- `signal_audio_test.cpp` passes against the built shared library: signal sums,
  ramps, independent Stop/resume, Cycle/Phasor global restart policy, identical
  next-sample named routing for either document order, and bit-identical output
  for callback sizes 1, 64, 127, 256 and 1024. Log:
  `/tmp/ultra-signal-abi-final.log`.
- Recorded Max replay passes 197/197 deterministic cases over 114,560 float32
  values, excluding explicitly documented noise, clip mode and unretained
  continuous-phase scenarios. The manifest preserves 1,604 original message
  rows, 309 stimuli, 14 sample files and 5,504 frames. Full-help conformance
  remains 0/2103; partial imports and original examples do not increase it.
- The contracts suite passes using the pinned Python requirements. A final
  provenance refresh and rerun after the narrowly scoped Phasor phase fix pass.
  The final replay keeps the same sample digest and compares freshly compiled
  current sources; it does not compare only frozen outputs. Log:
  `/tmp/ultra-signal-contracts-final.log`.

The rebuilt private desktop canvas run passes real WebKit controls, native
print/console with audio off/on, partial installed slider-help operation and
CPAL voice output. Its record is `/tmp/ultra-max-signal-desktop/result.json`.
The final document run passes the native picker, path deduplication, native
New/Save/close prompts, help in a separate window, all ten list objects with
audio off/on, and all twelve new MSP kinds through actual CPAL output.
With two signal documents, measured stereo peaks are 0.04/0.125; local Stop
leaves 0/0.025, named Receive restores 0.04/0.125, and global DSP restart retains
that output without another event. Evidence and PCM captures are in
`/tmp/ultra-max-signal-documents-final-verified/`; the runner exits zero.
The GTK harness uses the absolute-path shortcut because Ctrl+L toggles its
location entry and can hide it while accessibility catches up.

Desktop verification found two application file-opening bugs. Early secondary
delivery could claim `main` before initialization and remove its identity after
a duplicate-window failure. Delivery now queues on Tauri's main event loop after
setup. Separately, two crash cores show the unused secondary's libc exit
finalizers racing Tao's starting X11 worker. The pinned single-instance plugin
is locally vendored with a single Linux source change: `_exit` after the existing
blocking IPC attempt and cleanup. Licenses, source provenance and the patch
scope are recorded in its `ULTRA_PATCH.md`; ordinary primary shutdown remains.

The private startup regression holds initialization on a FIFO, delivers a second
file and checks both native graphs. A secondary-only preload probe loads in all
33 invocations and verifies that no exit finalizers run; 32 later canonical-path
deliveries preserve exactly two windows. Both regressions fail on their previous
behavior and pass on the final build. Final record:
`/tmp/ultra-max-signal-documents-final-verified/startup-result.json`.
The post-fix release build and Rust logs are in
`/tmp/ultra-secondary-exit-green/`. A bounded independent review finds no material
issues in the vendor delta, dependency lock or exit probe. Existing upstream IPC
failure handling is unchanged, including its zero exit after a failed attempt.

The registry contains 50 kinds and the library 101 original help/example entries.
Full installed-help conformance remains 0/2103; hierarchy and JavaScript help
helpers remain a separate architectural gap. Noise sequence, additional clip
modes and exact periodic Snapshot scheduling are not qualified by this phase.
The all-objects/all-help goal remains active.

## Software Throughput

`signal_audio_test.cpp --benchmark` calls the actual native external-render ABI
at 48 kHz with one or sixteen documents, each running Cycle -> Multiply -> Dac.
After 64 warm-up callbacks it renders about two seconds. The configured custom
Voice banks are idle. This checks the per-sample bridge cost for this score; it
does not measure maximum graph load, active Voice load, physical latency or
hardware deadline reliability.

Environment: AMD Ryzen 9 5900HS, 8 cores/16 threads, x86_64 Linux;
GCC 16.2.1, optimized release native library, benchmark compiled with
`-std=c++20 -O2 -Wall -Wextra -Werror`. Measurements share the user's machine
with desktop/test activity, without CPU isolation or frequency control.

| Documents | Callback Frames | Rendered Frames | Wall Seconds | Audio Seconds / Wall Seconds |
|---:|---:|---:|---:|---:|
|1|64|96000|0.030337|65.93|
|1|512|96256|0.030136|66.54|
|16|64|96000|0.180290|11.09|
|16|512|96256|0.180304|11.12|

Raw results: `/tmp/ultra-signal-benchmark-final.jsonl`. Run the normal test mode
first; its output and benchmark mode use the same rebuilt shared library.
