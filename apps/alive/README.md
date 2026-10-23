# Alive: First Hosted Session

Alive is a compact session view in the existing Ultra Rust/Tauri executable.
It hosts saved Ultra instruments through the version-1 device manifest and
native Faust evaluator. The example references the original subtractive device
twice; it does not contain a copied patch or a fixed synthesizer implementation.

## Run

From the repository root:

```sh
bash apps/ultra/build.sh
apps/ultra/src-tauri/target/release/ultra --alive
# Or open an existing session:
apps/ultra/src-tauri/target/release/ultra --alive apps/alive/examples/two-instruments.alive
```

The default First Light session contains Pulse and Harmony instrument tracks,
an eight-beat C / Am / F / G progression, and cutoff/level automation. New
creates a fresh copy of this template. Replace loads a saved `.ultra` device
on a stopped track; Remove and Add instrument allow a one-track session to
return to two tracks. The first profile requires at least one instrument track.
Audio uses Ultra's existing output configuration at 48 kHz. Alive currently
does not expose an additional audio-settings panel.

## Perform And Edit

- Start/Stop share one native audio frame clock. Seek uses beats within the
  prepared clip, and Loop repeats the session length. Space works outside
  focused controls. Meters show post-mixer callback peaks, including the master.
- Select a clip to edit note beat, pitch, duration and velocity. Tempo, length,
  looping and step-automation changes are retained as a draft. Stop, then choose
  Prepare / Apply. Rejected preparation leaves the current session intact.
- Gain, mute, solo and device base values operate live. Enabled automation owns
  effective values during playback. Changing a base stores it for Stop or for
  playback without that lane; it does not override automation. Both are shown.
- Editor opens an optional Ultra graph view of the actual hosted device.
  Manifest-bound controls and graph fields edit the same instance bases.
  Closing or reopening this view preserves DSP and playback. Unbound graph
  structure is read-only: stop Alive, edit and save the source in Ultra, then
  Replace to validate and load it. Apply/replacement invalidates stale editors.
- Save/Save As persist tracks, device references and bases, notes, automation
  and mixer values. File actions explicitly resolve pending schedule edits,
  then unsaved changes. Missing/incompatible device errors identify the track
  and reference; failed Open preserves the working session.

## Verify

```sh
bash apps/ultra/tests/ci/check-native.sh
# With the pinned Rust/Cargo environment used by build.sh:
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked
env -u DISPLAY -u WAYLAND_DISPLAY \
  apps/ultra/src-tauri/target/release/ultra --session-probe \
  apps/alive/examples/two-instruments.alive /tmp/alive-session-render
ULTRA_TEST_ALIVE=1 ALIVE_ENDURANCE_SECONDS=600 \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-session-desktop
```

The desktop harness creates its own display, bus, runtime directory and software
PipeWire server. It does not qualify physical audio or change desktop services.
Without `ALIVE_ENDURANCE_SECONDS`, CI runs the same native journey without the
ten-minute sustained phase. Reports preserve actual stream errors, backend,
rate/buffer, captured audio and process-tree resource samples. CPAL does not
expose an underrun counter; a zero stream-error count is not an xrun claim.

## Supported Profile

One or two devices, four voices per device, 48 kHz, explicit mono/stereo channel
bundles, one shared clip length, up to 128 notes and 256 automation points per
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
