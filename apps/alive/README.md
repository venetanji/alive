# Alive: Saved Clips, Instruments And Effect Chains

Alive is a separate `alive` executable with a compact Rust/Tauri session UI.
Ultra remains the `ultra` patch-editor executable. Both share the native engine
and Rust library; Alive hosts saved Ultra instruments and ordered stereo effect
chains through versioned device manifests and the native Faust evaluator. Canonical
`alive-session-v3` files preserve four clip slots per track, stable clip/note IDs,
saved defaults, instance IDs, original-source fingerprints, ordered effects,
parameter bases, bypass and automation targets. Existing v1/v2 sessions upgrade
in memory on Open when admitted; Save writes the upgrade. A playable legacy
session refused by the stricter clip-bank policy remains editable and runnable
in v2 with the reason shown. Version-1 instrument manifests remain valid.
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
Use an observed buffer of at least 256 frames for practical clip-bank work.
Smaller buffers remain diagnostic choices; admission is not a physical audio
underrun guarantee. This guidance does not change saved audio settings.

## Perform And Edit

- Start/Stop share one native audio frame clock. Seek uses beats within the
  global transport region, and Loop repeats its length. Space works outside
  focused controls. Meters show post-mixer callback peaks, including the master.
- Each track has four fixed slots. Select chooses the score to edit; Launch
  cues it at phase zero while stopped or queues a switch at the next strict
  four-beat bar while playing. Track Stop stops only that track; global Stop
  clears pending actions and silences every track. Runtime text distinguishes
  queued/pending, applied, rejected and unavailable observations. A queued
  request is not proof that it played.
- Create, Duplicate, Delete, Name, Clip length and Set Saved Default affect the
  selected clip through pending history. Duplicate copies notes and automation
  with new score IDs but shares the track's existing device chain. Clip length
  is independent of Transport length. Reopen starts stopped with saved defaults
  cued at phase zero. Selection and last playback are not saved defaults.
  Draft-only clips cannot launch; an edited prepared clip launches its prepared
  version until stopped Apply. Deleting a draft clip does not stop its prepared
  version. Legacy mode offers an explicit stopped Enable clip bank retry.
- Select a clip for its interactive piano roll and precise numeric note fields.
  Double-click empty grid to add a velocity-100, quarter-beat note. Select a note,
  drag its body to move or its right edge to resize, or use arrows (Shift plus
  Left/Right resizes). Delete/Backspace removes the selected note while the roll
  has focus. The selected velocity slider commits once per gesture. Escape or
  pointer cancellation restores the committed score. The fixed 1/16-note grid is
  0.25 quarter-note beat; movement preserves imported off-grid offsets.
- Tempo, length, looping, notes and step automation share Rust-owned pending-edit
  history. Undo pending edit / Redo pending edit, or Ctrl/Cmd+Z while the roll has
  focus, affect this musical scope only. History retains at most 64 entries and
  8 MiB of combined musical payload; it excludes live bases, bypass and mixer.
  Drafting works during playback. Stop, then choose Prepare / Apply; this begins
  a new history scope. Discard, successful New/Open and structural changes also
  clear the scope. Failed preparation retains the accepted draft and history.
  Length reductions that truncate notes/automation and rounded-frame same-pitch
  overlaps reject with a recovery message. Existing Ultra editor undo is separate.
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
  Apply/structural preparation invalidates stale editors. Draft edits, history,
  selection, launch, Stop and Save As retain hosted editor bindings.
- Save/Save As persist tracks, instrument/effect references, fingerprints, bases,
  order, bypass, notes, automation and mixer values. File actions explicitly resolve pending schedule edits,
  then unsaved changes. Missing/incompatible device errors identify the track
  and reference; failed Open preserves the working session.

Source hashes remain strict. If several instances reference an externally changed
file, replacing only one cannot install while another still expects the original
hash. Preserve the changed file at a new path, restore a matching original backup
at the shared path, then explicitly Replace each intended instance with the
preserved copy. This requires the matching original backup; without it, restore
the dependency from another trusted copy before retrying. Alive neither changes
sibling fingerprints nor rewrites sources to make a replacement pass.

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
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_clips.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-clips-desktop
ULTRA_TEST_ALIVE=1 \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_editor_resources.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-editor-resources
python3 experiments/alive-session-20261024/verify.py
```

The desktop harness creates its own display, bus, runtime directory and software
PipeWire server. It does not qualify physical audio or change desktop services.
Without `ALIVE_ENDURANCE_SECONDS`, CI runs the same native journey without the
ten-minute sustained phase. Reports preserve actual stream errors, backend,
rate/buffer, captured audio and process-tree resource samples. The current
interface reports aggregate stream errors; CPAL's typed backend xrun reports
are not separated by these counters. A zero stream-error count does not
establish zero physical underruns. Driver counters reset on Stop, so periodic
zero observations do not establish complete cumulative totals across restarts.
The separate editor regression checks eight close/reopen cycles against the
real webview process tree. Linux editors disconnect the pinned Wry IPC handler
on GTK destruction to release its strong view/message-manager reference cycle.

## Supported Profile

One or two instrument tracks, up to two stereo effects per track and six hosted
instances total; four voices per instrument, 48 kHz, explicit mono/stereo channel
bundles, declared stereo device/master output, four slots per track and eight
stored clips total. Across all stored clips on each track, at most 128 notes,
16 automation lanes and 256 points are retained, including disabled lanes.
Transport and clip lengths are independently at most 256 beats / 512 seconds.
The native 2x4 profile applies conservative density/work and graph-family limits;
refusals identify contributors and recovery choices without trimming the score.
Scheduled events,
command queues and per-callback work are bounded. Structural changes require
stopped transport and preparation outside the callback.

The authored AOT Faust kernels run in Ultra's native evaluator, alongside
Clockwork. The legacy Clockwork Voice path adds 64 samples and is rejected by
this hosted profile; native hosted alignment delay is zero. Wider speaker
layouts, arbitrary Faust/JIT devices, external MIDI, unrestricted live graph
editing, scenes, eight-track admission and a full DAW arrangement remain outside
this profile.

See `SESSION_CONTRACT.md` for timing, ownership, admission and persistence rules,
and `PLAN.md` at the repository root for foundation and acceptance evidence.
