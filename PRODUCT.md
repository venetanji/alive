# Alive / Ultra

<!-- impeccable:product-schema 1 -->

## Platform

web

Ultra's editor and Alive's session view use local HTML/CSS/JavaScript inside the
existing Rust/Tauri Linux desktop app. The browser preview edits documents; the
native app executes control messages, device hosting, transport and audio.

## Users

Musicians and patch authors building small instruments and control patches.
The current user knows Max/MSP and explicitly wants its editing workflow and
compact visual language as the blueprint.

## Product Purpose

Author, understand, connect, save, reopen, and play a bounded patch without having
to configure every object through permanent side panels. Host reusable saved
instruments in a small, reopenable Alive session with clips, automation and a mixer.

## Capabilities and Constraints

- A patch-authored four-voice subtractive instrument combines Faust saw/filter/
  ADSR primitives, explicit voice-lane mixdown and stereo output. Its Perform
  panel, saved parameter/preset interface, independent instances and headless
  host harness form the reusable-device slice. Alive now loads that same saved
  device independently on up to two tracks through its versioned interface.
  A native shared transport plays editable chord clips with note velocity and
  duration, metadata-selected instance/parameter automation, gain/mute/solo and
  stereo peak meters. Each selected-track chain exposes an instrument and up to
  two ordered stereo effects, live bases/effect bypass and optional instance editors.
  Canonical session-v2 files preserve independent instance IDs, original-source
  fingerprints, order, bases, bypass, musical data and mixer values. Existing
  session-v1 examples migrate on Open. Original cutoff/level lanes remain;
  prepared automation owns effective values while musical edits remain drafts.
  Optional hosted Ultra graph editors make supported bound parameter edits
  without owning DSP lifetime. Clip/automation and device structure changes
  require stopped preparation; the first hosted graph view is read-only for
  structure. See `apps/alive/README.md` and `apps/alive/SESSION_CONTRACT.md`.

- Up to 16 native patch, help and example windows each run an independent
  `ultra-canvas-v1` graph with 68 native object kinds, 32 nodes and 64 edges. Ports
  distinguish control, mono audio, mixed control/mono, stereo and explicit
  four-lane discrete voice bundles.
- Native control objects and ramps operate with audio off. Typed messages and
  variadic object ports are bounded. Plain-name `send`/`receive` connects typed
  messages across open windows, including while audio is off. Max patch-local
  name expansion and signal-rate `send~`/`receive~` are unsupported.
- Native New/Open/Save/Save As, file drops and command-line file opening use
  separate patch windows. Saves are atomic; closing a modified patch offers
  Save, Discard or Cancel. Imported Max source always saves to a separate Ultra
  file. Max files expose named help tabs/patchers and compatibility reports;
  partial selections require explicit acceptance. Whole Max help files and
  arbitrary Max objects are not executable.
- Help & Examples searches 144 original entries: help and an example for each
  supported kind, plus the starter, subtractive instrument and two stereo effects. Object help opens or focuses its own patch
  window; the library also switches between open native windows.
- Existing controls operate across their face when locked or with Ctrl/Cmd while
  editing. Optional Max-named appearance overrides save with the document and
  do not reset execution when edited.
- One native audio device and Clockwork/Faust runtime serve all windows at
  48 kHz. Each document owns its control state, timers, native signal graph and
  two prepared voice paths. Mono sources sum at signal inputs; control and signal
  dependencies are validated separately. New MSP sources run at the native sample
  rate; the legacy custom Voice path retains its 64-frame pipeline. Engine
  starts and graph replacements mute the first 64 output samples as a guard
  while signal state advances. Stop patch freezes and silences only its document;
  an accepted event, parameter change,
  incoming receive or global DSP restart resumes its continuous signals.
  Start/Stop audio and Panic are shared. Focus changes preserve playback. UI
  editing must retain the existing Rust/native validation and safety rules.
- Signal primitives include `sig~`, arithmetic, `cycle~`, `phasor~`, `noise~`,
  `clip~`, `line~`, `snapshot~` and mono-input `dac~`. The legacy stereo-bundle
  sink is authored as `stereo.dac~`. Output maps to physical channels 1 and 2
  only. Numeric creation/control values are bounded to -100000..100000; signal
  samples are not subject to that control bound. Exact Max noise sequences and
  periodic snapshot scheduling are not established.
- Version 2 reusable manifests describe instruments or stereo audio effects;
  version 1 instrument files remain valid. Stereo Utility and Stereo Lowpass
  are authored saved graphs with live controls and presets. `audio.in~` reads
  explicit host audio (silence in ordinary Ultra roots); `lowpass.stereo~` reuses
  the existing Faust filter kernel. Alive hosts their saved graphs in its
  current two-track, six-instance profile. Add/remove/reorder/replacement require
  stopped preparation; live bypass preserves warm state without restarting I/O.
  Selection does not launch playback. This slice adds no piano-roll gestures,
  clip banks, additional tracks or alternate DSP path.
- Supported object names and arguments must be explicit. Unsupported objects
  must be rejected visibly. Familiar appearance does not imply Max compatibility.
- Linux desktop is the shipped target. A smaller browser preview supports
  document editing, separate preview windows and downloads, without native
  execution or synthesizing sound.
- Preserve user projects, original Wine preferences, local work and the draft PR.
  Study installed Max/Live in disposable copies on a private display.

## Brand Commitments

Ultra is the patch editor and device authoring environment; Alive is its compact
session host. They have separate `ultra` and `alive` executables/app identities
and share the native engine and reusable device contracts. The user confirmed a close Max visual and workflow match
on 2026-10-20. Build original controls and help content; do not redistribute Max
code, fonts, proprietary help patches, icons, or application assets.

## Evidence on Hand

`PLAN.md` records the first canvas, its runtime boundaries, and the assigned local
UI investigation. `experiments/max-reference/` records prior local Max semantics.
New UI observations belong in `experiments/max-ui-reference/` with execution and
coverage limits kept explicit.
Frozen signal observations and production-header replay live in
`experiments/max-reference/signal-runtime-20261021/`. Original runnable examples
and partial imports do not establish complete execution of installed Max help.

## Product Principles

- Put the authored patch first.
- Make object creation and editing direct and keyboard accessible.
- Explain accepted inlet messages separately from emitted outlet values.
- Keep observed Max behavior separate from Ultra's implemented semantics.
