# Alive: Instruments And Effect Chains

Alive is a separate `alive` executable with a compact Rust/Tauri session UI.
Ultra remains the `ultra` patch-editor executable. Both share the native engine
and Rust library; Alive hosts saved Ultra instruments and ordered stereo effect
chains through versioned device manifests and the native Faust evaluator. Canonical
`alive-session-v2` files preserve instance IDs, original-source fingerprints,
ordered effects, parameter bases, bypass and automation targets. Existing
session-v1 examples migrate on Open; version-1 instrument manifests remain valid.
The example references the original subtractive device
twice; it does not contain a copied patch or a fixed synthesizer implementation.

## Run

From the repository root:

```sh
bash apps/alive/build.sh
bash apps/alive/run.sh
# Or open an existing session:
bash apps/alive/run.sh apps/alive/examples/two-instruments.alive
```

The developer binary is `apps/ultra/src-tauri/target/release/alive` (`alive.exe`
on Windows). Alive has its own Cargo/Tauri package under `apps/alive/src-tauri`;
the developer build shares Ultra's target directory and adjacent native library.
The launcher runs the Alive executable directly. Both apps can open at once.
Alive uses application identifier `org.alive.session`, separate from Ultra's
`org.alive.ultra.research`. The old `ultra --alive` entry remains compatible.

The existing release pipeline builds separate Alive and Ultra desktop packages:
DEB and AppImage on Linux, NSIS on Windows, and application bundles/DMG on macOS.
Each package owns its executable and desktop identity, includes the shared native
runtime, notices and example devices, and can be installed alongside the other.
No Ultra editor installation is required to run Alive. From a native Linux build
environment with the prerequisites in `apps/ultra/RUNNING.txt`:

```sh
npm --prefix apps/ultra/scripts/tooling ci --ignore-scripts --no-audit --no-fund
python3 apps/ultra/scripts/release.py build --target x86_64-unknown-linux-gnu
python3 apps/ultra/scripts/release.py collect --target x86_64-unknown-linux-gnu
# Add --product alive to build or collect only Alive.
```

Artifacts and per-product checksums appear in `dist/alive` and `dist/ultra`,
named `Alive-<version>-<target>` and `Ultra-<version>-<target>`. Package verification
checks the extracted application against its own native library and renders the
bundled session from outside the repository, using the bundled Ultra device.
Platform builds still require their native runners; Linux results do not qualify
the Windows or macOS artifacts.

The default First Light session contains Pulse and Harmony instrument tracks,
an eight-beat C / Am / F / G progression, and cutoff/level automation. New
creates a fresh copy of this template. Replace loads a saved `.ultra` device
on a stopped track; Remove track and Add instrument allow a one-track session to
return to two tracks. Select a track to see its instrument followed by up to two
stereo effects. Add effect loads a saved `.ultra` effect such as the bundled
Stereo Utility or Stereo Lowpass. Earlier / Later changes the effect order.
Selection changes the visible controls without starting playback. The first
profile requires at least one instrument track.
Audio uses the shared CPAL driver at 48 kHz, with its own application settings
directory and system-default output on first launch. Open Audio settings in the
footer to choose the output host/device and Automatic or a requested buffer.
Stop audio before changing settings; this also stops transport and releases all
notes. Save & start audio opens the output while leaving musical transport
stopped. The panel reports the observed callback size separately from the
requested buffer. Refresh retains disconnected selections so you can explicitly
choose a replacement; rejected settings preserve the previous saved values.

## Perform And Edit

- Start/Stop share one native audio frame clock. Seek uses beats within the
  prepared clip, and Loop repeats the session length. Space works outside
  focused controls. Meters show post-mixer callback peaks, including the master.
- Select a clip to edit note beat, pitch, duration and velocity. Tempo, length,
  looping and step-automation changes are retained as a draft. Stop, then choose
  Prepare / Apply. Rejected preparation leaves the current session intact.
- Gain, mute, solo, device base values and effect bypass operate live. Bypass
  preserves warm device state and leaves audio I/O running. Parameter controls
  come from each selected instance's manifest; identical reusable devices retain
  independent bases and state. Enabled automation owns
  effective values during playback. Changing a base stores it for Stop or for
  playback without that lane; it does not override automation. Both are shown.
  The automation Target selector names an instance and its declared parameter.
  Add lane exposes a step lane alongside the original instrument cutoff/level
  lanes. Schedule edits remain drafts until stopped Prepare / Apply; playing
  continues to use the prepared schedule, including its ownership state.
- Edit in Ultra opens an optional graph view of the selected hosted instance.
  The track-row Editor shortcut opens that track's instrument.
  Manifest-bound controls and graph fields edit the same instance bases.
  Closing or reopening this view preserves DSP and playback. Unbound graph
  structure is read-only: stop Alive, edit and save the source in Ultra, then
  Replace to validate and load it. Add, remove, reorder and replacement require
  stopped transport and resolved schedule drafts. Remove deletes only its
  effect and lanes; replacing an instance clears only its lanes. Reordering
  retains instance identity, lanes, bases and bypass. Remove track explicitly
  deletes its whole instrument/effect chain, keeping at least one track.
  Apply/structural preparation invalidates stale editors. Source-change errors
  identify the reference and explain Replace recovery.
- Save/Save As persist tracks, instrument/effect references, fingerprints, bases,
  order, bypass, notes, automation and mixer values. File actions explicitly resolve pending schedule edits,
  then unsaved changes. Missing/incompatible device errors identify the track
  and reference; failed Open preserves the working session.

## Verify

```sh
bash apps/ultra/tests/ci/check-native.sh
env PATH="$PWD/experiments/clockwork-faust/.deps/rust/bin:$PATH" \
  CARGO_HOME="$PWD/experiments/clockwork-faust/.deps/cargo" \
  ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build" \
  LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
  cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked
env -u DISPLAY -u WAYLAND_DISPLAY \
  apps/ultra/src-tauri/target/release/alive --session-probe \
  apps/alive/examples/two-instruments.alive /tmp/alive-session-render
ULTRA_TEST_ALIVE=1 ALIVE_ENDURANCE_SECONDS=600 \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-session-desktop
ULTRA_TEST_ALIVE=1 \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_editor_resources.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-editor-resources
python3 experiments/alive-session-20261024/verify.py
```

The desktop harness creates its own display, bus, runtime directory and software
PipeWire server. It does not qualify physical audio or change desktop services.
Without `ALIVE_ENDURANCE_SECONDS`, CI runs the same native journey without the
ten-minute sustained phase. Reports preserve actual stream errors, backend,
rate/buffer, captured audio and process-tree resource samples. CPAL does not
expose an underrun counter; a zero stream-error count is not an xrun claim.
The separate editor regression checks eight close/reopen cycles against the
real webview process tree. Linux editors disconnect the pinned Wry IPC handler
on GTK destruction to release its strong view/message-manager reference cycle.

## Supported Profile

One or two instrument tracks, up to two stereo effects per track and six hosted
instances total; four voices per instrument, 48 kHz, explicit mono/stereo channel
bundles, declared stereo device/master output, one shared clip length, up to
128 notes and 256 automation points per
track. Session length is at most 256 beats and 512 seconds. Scheduled events,
command queues and per-callback work are bounded. Structural changes require
stopped transport and preparation outside the callback.

The authored AOT Faust kernels run in Ultra's native evaluator, alongside
Clockwork. The legacy Clockwork Voice path adds 64 samples and is rejected by
this hosted profile; native hosted alignment delay is zero. Wider speaker
layouts, arbitrary Faust/JIT devices, external MIDI, unrestricted live graph
editing and a full DAW arrangement are outside this first slice.

See `SESSION_CONTRACT.md` for timing, ownership, admission and persistence rules,
and `PLAN.md` at the repository root for foundation and acceptance evidence.
