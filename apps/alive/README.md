# Alive: Saved Clips, Instruments And Effect Chains

Alive is a separate `alive` executable with a compact Rust/Tauri session UI.
Ultra remains the `ultra` patch-editor executable. Both share the native engine
and Rust library; Alive hosts saved Ultra instruments and ordered stereo effect
chains through versioned device manifests and the native Faust evaluator.
The current MIDI/audio workspace shares sources between four Session slots per track
and Arrangement placements. Saved sessions retain stable note/source/device
identities, effects, parameter bases, bypass, automation, Master gain and launch
quantization. Session has a fixed-right Master strip; Arrangement has right-hand
track controls and a bottom Master lane. Both views share native stereo meters,
unity and digital-overload reset controls. See `PLAN.md` for current priorities
and verification status.

Alive is an experimental application. Its own schemas and native interfaces can
evolve together without preserving previous Alive formats; see `PRODUCT.md`.

## Run

From the repository root:

```sh
bash apps/alive/build.sh
bash apps/alive/run.sh
# Or open an existing session:
bash apps/alive/run.sh apps/alive/examples/quantized-midi.alive
```

The developer binary is `apps/ultra/src-tauri/target/release/alive` (`alive.exe`
on Windows). Alive has its own Cargo/Tauri package under `apps/alive/src-tauri`;
the developer build shares Ultra's target directory and adjacent native library.
The launcher runs the Alive executable directly. Both apps can open at once.
Alive uses application identifier `org.alive.session`, separate from Ultra's
`org.alive.ultra.research`.

Starting without a file, or choosing **New session**, opens the bundled
`empty-workspaces.alive`: one empty MIDI track with empty slots and a
working Arrangement timeline. The populated examples remain available through
Open. Both workspaces are available immediately.

On the local test machine, open **Alive (Test)** from the desktop app launcher.
Its desktop entry selects a versioned, locally verified build; it does not
rebuild on launch. Existing windows keep their original executable and project.

## Clips, Tracks And Detail Size

Completed note gestures update admitted MIDI sources during native playback.
Undo/Redo uses the same publication path.
The piano toolbar's **Preview** toggle starts off; enable it to hear keys and
note selection, creation or pitch movement through the selected instrument and
effects. Preview can sound while transport is stopped. It starts Audio when
needed, while ordinary note editing does not.

Workspace clips, regions, tempo, automation and empty tracks use the same
immediate publication workflow. The document and Undo history change only when
playback acknowledges the edit. Creating and editing clips requires no confirmation.
Dense schedules can refuse an edit within the current native work limits; a
refusal retains the installed music and history. Device graph installation still
requires stopped transport. Preview has its own workload admission.

Use **+ Audio Track** or Ctrl+T, and **+ MIDI Track** or Ctrl+Shift+T. A new track
appears immediately after the selected track while transport continues. New
MIDI tracks are empty; use **Load instrument** when you want sound. Double-click
an empty MIDI Session slot, or select it and press Ctrl+Shift+M, to create a
one-bar looping clip in one Undo step. In Arrangement, Ctrl+Shift+M creates a
MIDI clip over the selected time span.

Drag blank time in either MIDI or audio Clip View, then press Ctrl+L or
**Loop Selection**. This enables the selected loop and moves clip Start to the
selection start, preserving clip End and the source contents. Drag Start
independently for an introduction before the loop. Start, End, Loop Position
and Loop Length also have numeric controls; drag the brace or its edges to
move/resize the loop. In Arrangement, Ctrl+L sets the song loop from its time
selection. Song loop, occurrence markers and source content are separate.

Double-click an empty audio slot to import a WAV. Audio clips show the prepared
waveform and share the same selection/marker controls. The initial Warp mode is
**Re-Pitch**: changing set tempo changes playback speed and pitch together.
Supported files are mono/stereo PCM 8/16/24/32-bit or float 32/64-bit WAV,
8-192 kHz, up to 24 MiB and 60 seconds per file. Preparation is stereo 48 kHz,
bounded to 60 seconds per source and 64 MiB total PCM. Recording, input routing,
monitoring and arm remain upcoming work.

Drag the separator above **Clip / Devices** upward for a larger bottom panel.
Double-click it, or use **Maximize detail**, to give the editor the working area;
repeat to restore the previous size. The separator also supports arrow keys,
Home and End. Escape cancels an active resize. The requested height survives
window resizing, and Session/Arrangement navigation restores the upper workspace.

## Desktop Packages

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

The populated examples contain instrument tracks and saved effect chains. Select
an instance to edit its manifest-bound controls. **Load instrument** fills an
empty MIDI track; **Add effect** loads a stereo effect. Graph loading, removal,
replacement and effect reordering require stopped transport. Musical clip edits
and rootless track insertion do not.

Audio uses the shared CPAL driver at 48 kHz, with its own application settings
directory and system-default output on first launch. Open Audio settings in the
footer to choose the output host/device and Automatic or a requested buffer.
Stop audio before changing settings; this also stops transport and releases all
notes. Save & start audio opens the output while leaving musical transport
stopped. The panel reports the observed callback size separately from the
requested buffer. Refresh retains disconnected selections so you can explicitly
choose a replacement; rejected settings preserve the previous saved values.
The active workspace profile permits up to eight logical MIDI/audio tracks with
at most six hosted DSP roots, up to two effects per track, and four voices per
instrument. Event limits remain 32 events/frame and 64 events/1024 frames.
Use observed buffers of at least 256 frames as practical guidance; smaller
buffers remain diagnostic choices. Admission does not guarantee physical-device
underrun behavior, and it does not change saved audio settings.

## Perform And Edit

Session presents tracks as columns with four aligned clip slots, scene launch
buttons at the right, and each track's mixer below its slots. Scroll the track
area horizontally to reach additional tracks. Select a clip or track, then use
Clip or Devices in the bottom detail area. Drag the separator above those tabs
to resize the detail area, or focus it and use Up/Down (Shift for larger steps),
Home or End. Browser and Detail toggle those areas without changing playback.
Device / track, Note inspector, Automation inspector and Audio details expose
the secondary structural, numerical and diagnostic controls.

The compact top bar shows bars, beats and sixteenths in fixed 4/4. Open
**Transport and view options** at its right for precise seek, transport length
and track width. The window supports 800x600 through larger desktop sizes;
browser, Session tracks and detail editors scroll within their own regions.
Drag the browser divider from 180 to 420px. Small windows use icon buttons for
workspace navigation and scroll the detail contents to reach secondary fields.

The Library browser loads the bundled instruments/effects immediately and also
searches project clips. Drag a device onto a Session or Arrangement track, or
into the selected track's Devices chain. An instrument fills an empty MIDI
track or replaces its existing instrument; audio tracks accept effects. Drop
an effect above or below another device to choose its serial position, or onto
the chain's trailing drop area to append it. Successful loads open Devices and
select the added device. Device changes require stopped transport and retain
the current limit of two effects per track.

Arrow keys select a browser result; Enter or double-click activates it. Load
Instrument fills a selected empty MIDI track; Add Track creates another MIDI
track when the selection already has an instrument. Add Effect appends to the
selected track, and Open Clip selects its source for editing. Single selection
does not load a device or launch a clip. Open instrument / Open effect retain
the native file-picker fallback. Missing library files and native refusals
appear in the browser or session status.

The piano toolbar provides independent time and pitch navigation and Fit notes.
Wheel scrolls pitches; Shift+wheel scrolls time; Ctrl/Cmd+wheel zooms time;
Alt+wheel zooms pitch. These controls change only the viewport. Drag a velocity
marker to edit one note; select its body first when chord markers overlap.
Keyboard note editing and the numeric inspector remain available. Browser
navigation and closing Transport options preserve unfinished numeric fields;
return to the field and press Tab to accept it before using file actions.

Session and Arrangement buttons, or plain Tab outside controls, switch the
workspace. Tab within controls keeps normal focus navigation. Both views share
tracks, device chains, clips and the bottom editor. Open
`apps/alive/examples/midi-arrangement.alive` for a populated Arrangement, or
`apps/alive/examples/quantized-midi.alive` for sparse launch-quantization work.

The toolbar's **Launch** setting supports None, 1/32 through 1/2 notes, and
1, 2, 4 or 8 Bars in fixed 4/4. An occupied Session clip can use Global or its
own grid. Settings affect future requests; queued targets retain their captured
grid. Scenes, track Stop and Return use Global; global Stop is immediate.
Fine quantization has a separate workload proof and shares the Start/Seek
allowance. Unsupported requests refuse without changing the music.

Session launch overrides that track's Arrangement. Track Stop retains a silent
override; **Return** or **Return all** resumes Arrangement at its current
position. Scenes launch their occupied slots atomically and stop tracks whose
scene slot is empty. Selection does not launch clips. Reopen starts stopped at
the beginning with Arrangement authority.

Drag a blank Arrangement lane to select time, create a MIDI clip with
Ctrl+Shift+M, or use **Place source in range** to reuse the selected source.
Move a placement by dragging its body; trim/resize with its edges. Placement
span and the source occurrence's Start/End/loop markers remain independent.
Source edits affect every reference until **Make source independent** is used.
Loop edits never crop the source.

Double-click the MIDI grid to add a note. Drag notes or their right edges to
move/resize; arrows move and Shift+Left/Right resizes. Delete/Backspace removes
the selected note. Velocity editing commits once per gesture. Escape or pointer
cancellation restores committed state. The 1/16-note grid preserves imported
off-grid offsets. Undo/Redo applies musical edits through the same acknowledged
publication path, with at most 64 entries and 8 MiB of musical history.

Gain, mute, solo, device bases and bypass work live. Enabled automation owns
effective parameter values during playback. A base value is stored for Stop or
for times without an owning lane. Recompiling music preserves the current
mixer, bases, bypass and warm device state. Global Stop can cancel an edit still
awaiting a playback boundary.

**Edit in Ultra** opens the selected hosted instance without changing playback.
Manifest-bound controls share the same bases. Unbound graph structure is
read-only; stop Alive, edit/save the device in Ultra, then Replace. Save/Save As
persists the current document, stable identities, external references and launch
settings. WAV paths rebase on Save As; sample bytes are not copied or overwritten.
Failed Open retains the current working session. Unsaved file actions retain
their normal project confirmation; creating or editing a clip requires none.

Source hashes remain strict. If several instances reference an externally changed
file, replacing only one cannot install while another still expects the original
hash. Preserve the changed file at a new path, restore a matching original backup
at the shared path, then explicitly Replace each intended instance with the
preserved copy. This requires the matching original backup; without it, restore
the dependency from another trusted copy before retrying. Alive neither changes
sibling fingerprints nor rewrites sources to make a replacement pass.

## Verify

```sh
node --test apps/ultra/ui/alive*.test.mjs
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
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_observability.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-observability
ULTRA_TEST_ALIVE=1 \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_editor_resources.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-editor-resources
ULTRA_TEST_ALIVE=1 \
  ULTRA_TEST_ALIVE_SESSION="$PWD/apps/alive/examples/quantized-midi.alive" \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_regions_desktop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-clip-regions
```

The desktop harness creates its own display, bus, runtime directory and software
PipeWire server. It does not qualify physical audio or change desktop services.
Without `ALIVE_ENDURANCE_SECONDS`, CI runs the same native journey without the
ten-minute sustained phase. Reports preserve actual stream errors, backend,
rate/buffer, captured audio and process-tree resource samples. The short
observability wrapper preserves the clip journey and adds retained per-stream
epochs and control cycles. Stream measurements separates typed CPAL xrun and
other error reports, render failures, malformed buffers and processing-budget
exceedances. Finalized lifetime totals survive stream Stop/restarts within the
process; incomplete retirement and missing epoch coverage stay explicit. Zero
reports do not establish zero physical underruns. The existing 600-second
option remains historical coverage, not the expanded 1800-playing-second gate.
The separate editor regression checks eight close/reopen cycles against the
real webview process tree. Linux editors disconnect the pinned Wry IPC handler
on GTK destruction to release its strong view/message-manager reference cycle.

## Supported Profile

The current workspace profile supports up to eight logical MIDI/audio tracks,
six hosted DSP roots, two effects per track, four voices per instrument and
stereo 48 kHz output. Each track has four Session slots. Sources can also be
referenced by Arrangement placements. Empty MIDI tracks have no instrument and
produce no sound until an instrument is loaded.

Across stored sources per track, the bounds include 128 notes, 16 automation
lanes and 256 points, including disabled lanes. Transport and MIDI source lengths
are bounded to 256 beats / 512 seconds. PCM bounds are documented above. Native
schedule admission retains the measured graph/event limits; profile 2 remains
unavailable. Refusal preserves the document and history rather than trimming
music or opening an edit-confirmation workflow.

Recording/input routing, external MIDI, unrestricted live graph editing, wider
speaker layouts, additional Warp modes and the shared video engine remain open.
See `PLAN.md` for active priorities and the dated evidence under `experiments/`.
