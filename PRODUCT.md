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

## Development Policy

Alive and Ultra are experimental software with no deployed users. Their own
previous file formats, schemas and native interfaces do not need backward
compatibility. Evolve the current architecture directly; do not add migrations,
old-format conversion flows or compatibility fallbacks. Update development
fixtures with the architecture, and remove obsolete paths when they obstruct it.
Preserve actual project work during development. Live/Max import and device
interoperability remain product goals.

## Capabilities and Constraints

- Alive shares one transport between Session and Arrangement, with up to eight
  logical MIDI/audio tracks and six hosted DSP roots. MIDI tracks can be empty
  or load a saved Ultra instrument; either track type can use up to two ordered
  stereo effects. The patch-authored subtractive instrument uses four voices,
  native Faust oscillators/filter/ADSR and explicit stereo mixdown.
  Session has four slots per track and atomic scene launching. Arrangement
  placements reference the same sources. Clip Start, End and loop markers are
  independent of source contents and Arrangement placement spans.
  MIDI notes, automation, regions, empty tracks and bounded WAV/Re-Pitch audio
  edits publish during playback. The native callback acknowledges a complete
  candidate before the document and Undo history change. Undo/Redo uses the same
  path, preserving live mixer, bases, bypass and warm device state. Preview
  auditions MIDI through the selected chain. Graph installation requires stopped
  transport. The shared bottom Clip/Devices area resizes and maximizes; browser,
  track area and editors scroll at compact window sizes.
  The sole saved session format is a v6 envelope containing the v4 workspace
  score, Master gain and launch quantization. Stable track/source/note/device
  identities, external source hashes, slots, placements, effects and automation
  persist together. See `apps/alive/README.md` and
  `apps/alive/SESSION_CONTRACT.md` for current behavior and limits.

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
- Reusable manifests describe instruments and stereo audio effects. Stereo
  Utility and Stereo Lowpass are saved graphs with live controls and presets.
  `audio.in~` receives explicit host audio; `lowpass.stereo~` uses the native
  Faust filter kernel. Enabled automation owns effective parameter values while
  playback runs; device panels and hosted Ultra editors share saved bases.
  Source hashes identify the exact saved graph; replacing an externally changed
  shared source requires restoring other instances' expected dependencies.
  Master gain follows the track sum, with stereo peaks and an explicit digital
  overload reset. Launch quantization supports None, note grids and 1/2/4/8 Bars,
  with per-clip overrides. Queued requests retain their captured targets.
  Session launch overrides a track's Arrangement; Stop retains silence until
  Return. Return follows the current Arrangement position. Selection does not
  launch, and changing views does not change playback. The piano roll supports
  gestures, keyboard/numeric editing and velocity, with 64 entries / 8 MiB of
  musical history. Input routing, monitoring, arm and recording are next; a
  shared silent-video engine follows. Native Live device/preset integration is
  progressing in a separate session and is not part of this installed build.
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

`PLAN.md` records the active workflow sequence and runtime boundaries.
`docs/WORKFLOW_COVERAGE.md` distinguishes current app features, test-only work,
source-pinned native verification and remaining reference gaps.
`experiments/max-reference/` and `experiments/max-ui-reference/` retain historical
Max observations. New original-application captures stay private; publish derived
action/result findings and their execution/coverage limits without proprietary
assets. `docs/ALIVE_ARRANGEMENT_REFERENCE.md` records the latest bounded study.
Frozen signal observations and production-header replay live in
`experiments/max-reference/signal-runtime-20261021/`. Original runnable examples
and partial imports do not establish complete execution of installed Max help.

## Product Principles

- Put the authored patch first.
- Make object creation and editing direct and keyboard accessible.
- Explain accepted inlet messages separately from emitted outlet values.
- Keep observed Max behavior separate from Ultra's implemented semantics.
