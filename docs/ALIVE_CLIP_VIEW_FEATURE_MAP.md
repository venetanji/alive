# Live Clip View Feature Map

Research and implementation inventory for Alive, 2026-10-31. The goal is to
reproduce Live's spatial organization and musical interactions, while wiring
each control to real Alive behavior. This is a feature map, not a claim that
Alive already implements all of Live. A status of **Partial** identifies a
bounded implementation, not feature parity. The map covers the relevant Live
12 manual sections; individual context-menu commands and version-specific
variants still need observation as they are implemented.

## Evidence And Limits

- Live 12.4.6 MIDI clip, selection, launch and note-editing captures:
  `experiments/alive-workflow-reference-20261024/08-clip-created.png` and
  `18-launch-panel.png`, with actions and limitations in that directory's README.
- Live audio Clip View, Warp/Beats controls, Start/End and loop range:
  `experiments/alive-clip-regions-20261031/live-reference/30-audio-ctrl-l-fields.png`.
  The source is a silent WAV; this witnesses the UI, not stretch quality.
- Additional direct MIDI/audio loop observations and limits:
  `experiments/alive-clip-regions-20261031/live-reference.md` and the committed
  `live-reference/` captures. The old `/tmp` path in that record is ephemeral.
- Ableton Live 12 manual: [Clip View](https://www.ableton.com/en/live-manual/12/clip-view/),
  [Launching Clips](https://www.ableton.com/en/live-manual/12/launching-clips/),
  [Editing MIDI](https://www.ableton.com/en/live-manual/12/editing-midi/),
  [Audio Clips, Tempo, and Warping](https://www.ableton.com/en/live-manual/12/audio-clips-tempo-and-warping/),
  [Clip Envelopes](https://www.ableton.com/en/live-manual/12/clip-envelopes/),
  [Editing MPE](https://www.ableton.com/en/live-manual/12/editing-mpe/) and
  [MIDI Tools](https://www.ableton.com/en/live-manual/12/midi-tools/).
- REA opened the installed x86-64 PE executable, SHA-256
  `f6a7e6c045c2dd19a0e0e5e8cd9cc0cb81972ebf4924ca2574c6678a081c91f6`.
  Its complete PE resource inventory has 12 entries: icons, icon groups,
  version data and a manifest. It does not expose a declarative Clip View
  layout. Bounded binary strings include `.ClipViewLoopBar.StartMarker`,
  `.ClipViewLoopBar.LoopStartMarker`, `.ClipViewLoopBar.EndMarker`,
  `.ClipViewLoopBar.LoopEndMarker`, `.ClipEnvelopeEnsemble.AutomationView`,
  `ClipViewSelector` and `ClipViewStretchMarkerBar`; these establish names,
  not component geometry or recovered source. REA's deep string provider did
  not return within the bounded query. Live's `.ask` themes describe colors;
  its MIDI Remote Scripts concern controllers, not the desktop layout.

## Spatial Model

Live puts a clip title bar above a properties area on the left and an editor on
the right. Properties can be arranged horizontally or vertically, resized,
folded and scrolled. The clip's type and Session/Arrangement context determine
which panels are present. The right editor switches between Notes, Envelopes and
MPE for MIDI, or Sample and Envelopes for audio. Its ruler/markers and its
editor-specific content share one timeline. Contextual Help/Info remains in the
bottom-left application region, outside the Clip View.

Alive's first structural pass groups existing region, audio Re-Pitch and Session
launch-quantization controls in a scrollable properties area beside the piano
roll or waveform. It is not the finished Live Clip View: the editor-mode tabs,
Live-style panel resizing/folding and many controls in the inventory remain
future work. Unsupported settings must not be displayed as working controls.

## Shared Clip Properties

| Live feature | Alive status | Work needed for parity |
| --- | --- | --- |
| Select clip; title, rename, color and activator | Partial | Slot name exists; clip-specific color and activator/deactivation need model, scheduling and UI. Track color is not clip color. |
| Independent clip Start and End | Partial | Existing source-beat fields and draggable markers; add bars.beats.sixteenths display/editing and Live's Set actions. |
| Loop toggle, Position, Length and brace/handles | Partial | Existing independent loop region, selection + Ctrl+L, live publication and Undo; match Live's display, Set actions and brace interactions. |
| Start before loop / intro | Implemented | Preserve independent Start and loop region through edits, launching and persistence. |
| Clip time signature | Missing | Model clip meter separately from the current fixed 4/4 transport, including ruler and scheduling implications. |
| Groove chooser, hot-swap and Commit | Missing | Groove library/pool, timing and velocity transforms; audio Commit can create/replace a volume envelope. |
| Clip scale, root and scale mode | Missing | Per-clip scale state, scale-aware note display and editing. |
| Edit several clips' shared properties | Missing | Selection model and mixed-value UI; define atomic publication and Undo for batch edits. |
| Panel arrangement, resizing, folding, clip title context menu | Partial | Detail panel itself resizes/maximizes; independent properties-panel arrangement, resizing and folding are not implemented. |
| Clip duplication, source identity, deletion | Partial | Existing slot duplication, source independence and deletion use Alive's explicit shared-source semantics; compare behavior and placement with Live. |
| Clip crop, replace/edit sample, clip defaults | Missing | Define non-destructive source/occurrence ownership, file operations and undoable crop; no old-format migration required. |
| Sample details | Partial | Audio metadata and duration exist; present filename, format, rate, bit depth and channels coherently in the clip header. |

## Session Launch And Follow Actions

| Live feature | Alive status | Work needed for parity |
| --- | --- | --- |
| Per-clip launch quantization / Global | Implemented | Existing None through 8 Bars and captured queued target; preserve native receipts and 4/4 limits. |
| Trigger, Gate, Toggle and Repeat launch modes | Partial | Click launch exists; selectable modes, press/release ownership, repeated scheduling, cancellation and input mappings are missing. |
| Legato launch | Missing | Chase preceding clip phase across distinct source lengths and loop ranges, including quantized requests. |
| Launch velocity amount | Missing | Map triggering MIDI velocity to clip gain with a defined audio/MIDI model. |
| Clip nudge and scrub | Missing | Specify clock/quantization, playback position, release/chase and safe live edits. |
| Follow Actions, two actions and chances | Missing | Clip groups, action choices, probability, timing, linked/unlinked intervals, scene targets and bounded scheduling. |
| MIDI bank, sub-bank and program changes | Missing | Persist and schedule MIDI program messages; expose in MIDI clip context including Arrangement. |
| Session-only launch controls | Partial | Quantization appears for selected slots; avoid presenting Session launch options for Arrangement-only occurrences. |

## MIDI Notes, Velocity And Utilities

| Live feature | Alive status | Work needed for parity |
| --- | --- | --- |
| Piano roll, keyboard, ruler and note creation | Partial | Existing fixed-grid double-click creation and selectable/editable notes; support Live's wider grid and draw-mode choices. |
| Move, resize, delete, keyboard edits, Undo/Redo | Partial | Existing single-note gestures and numeric inspector; add multi-note and time-range operations with atomic history. |
| MIDI note preview/audition | Partial | Existing toggle and device-chain audition; compare complete Live gesture, keyboard and stopped-audio behavior. |
| Time/pitch zoom, scroll and Fit | Partial | Existing wheel and buttons; compare ruler drag, zoom-to-selection, Follow, grid and clip scrubbing. |
| Grid snapping, fixed/adaptive grids, draw mode | Partial | Existing fixed 1/16 grid; expose supported subdivisions, adaptive behavior and draw gestures. |
| Time selection, note selection, find/select | Partial | Existing time selection and single-note selection; add multi-select, selection modifiers and find/filter. |
| Velocity lane and selected velocity | Partial | Existing per-note lane and control; add multi-select, ranges, draw/ramp/randomize and lane controls. |
| Note-off/release velocity | Missing | Per-note value, editing lane, MIDI output and device support. |
| Probability, Play All / Play One groups | Missing | Persist per-note/group probability; deterministic real-time scheduling, random state and group rules. |
| Fold, Scale, Highlight Scale | Missing | Note-row filtering and clip-scale model without changing musical content. |
| Note mute/deactivate, split, chop, join | Missing | Per-note state and selection-aware atomic edits. |
| Pitch utilities: transpose, fit to scale, invert, add interval | Missing | Batch selection-aware transforms, scale-aware choices, live publication and Undo. |
| Time utilities: stretch, x2, /2, set length, humanize, reverse, legato | Missing | Batch timing transforms, bounds, deterministic humanize, preview/cancel and Undo. |
| Note quantization | Missing | Adjustable grid, strength, start/end behavior and selection-aware Undo. |
| Multi-clip editing and Focus mode | Missing | Simultaneous source/occurrence selection, independent ownership and safe publication. |
| Transform tools | Missing | Arpeggiate, Chop, Connect, Glissando, LFO, Ornament, Quantize, Recombine, Span, Strum, Time Warp and Velocity Shaper. |
| Generators | Missing | Rhythm, Seed, Shape, Stacks and Euclidean; specify generated-note identity and replace/commit semantics. |

## Audio Sample And Warp

| Live feature | Alive status | Work needed for parity |
| --- | --- | --- |
| Waveform, sample details, time/amplitude zoom and Fit | Partial | Existing prepared waveform peaks, time and amplitude zoom and Fit; match Live's timeline/selection and header. |
| WAV import, external source identity and Re-Pitch | Partial | Existing bounded mono/stereo WAV decoding and prepared 48 kHz PCM; other formats and wider limits are not implied. |
| Source BPM, beat length, x2 / /2 | Partial | Existing Re-Pitch source tempo and sample-length operations edit the shared source; compare per-clip Live behavior and labels. |
| Warp on/off and unwarped playback | Missing | Preserve original-time playback separately from synchronized playback and define transitions while rolling. |
| Warp markers and transient/pseudo-markers | Missing | Per-clip beat/sample mapping, analysis, editing, multi-selection, undo, real-time publication and persistence. |
| Auto-warp, Warp From Here, clip leader/follower | Missing | Analysis and clip/set-tempo policies; test variable-tempo and boundary cases. |
| Beats mode | Missing | Transients or fixed-division Preserve, loop direction/mode and transient envelope. |
| Tones and Texture modes | Missing | Grain-size controls; Texture also needs flux. |
| Complex and Complex Pro modes | Missing | Time/pitch processing and Complex Pro formants/envelope controls; qualify original implementations independently. |
| Clip gain, transpose in semitones and cents | Missing | Per-clip DSP, automation, persistence and real-time admission. Source-tempo Re-Pitch is not independent pitch control. |
| Clip fades | Missing | Session automatic edge fades and Arrangement fade-envelope behavior. |
| Reverse sample | Missing | Reversed derived source, marker/region/envelope transformation, shared-file ownership and undo. |
| External destructive sample editor | Missing | Explicit file ownership/reload behavior; do not silently overwrite originals. |
| RAM and Hi-Q controls | Missing | The current host prepares bounded PCM in memory; do not imply Live's streaming/RAM toggle or selectable resampling quality. |
| Audio crop and sample replacement | Missing | Source/occurrence identity, linked references, markers, prepared PCM lifetime and history. |

## Envelopes And Expression

| Live feature | Alive status | Work needed for parity |
| --- | --- | --- |
| Device-parameter clip automation | Partial | Existing bounded step/hold points and enabled lane per instance; graphical envelope editing and Live's chooser hierarchy remain missing. |
| Mixer, sends, clip gain/pitch, MIDI CC envelopes | Missing | Parameter domains, native targets and scheduling; only expose targets actually supported by the host. |
| Breakpoint shapes, drawing and modulation | Missing | Interpolation/curves, grid editing, modulation versus automation semantics and ownership. |
| Linked/unlinked envelope loops | Missing | Separate envelope length, phase, boundaries and persistence from the clip loop. |
| Notes / Sample / Envelopes editor tabs | Missing | Independent view selection, focus, scroll and persistent editor state without mutating music. |
| MPE Pitch, Slide, Pressure, Velocity, Release Velocity | Missing | Per-note expression model, editing lanes, MIDI routing and instrument support. |

## Dependencies And Acceptance

1. Finish the spatial shell: collapsible/resizable properties, type-specific
   panel order, Notes/Sample/Envelopes modes, compact scrolling and 800x600
   through large-window coverage. Preserve empty MIDI and audio-track states.
2. Define source versus occurrence ownership before extending clip schemas.
   Loop/start, launch and processing state that belong to a clip occurrence
   must not accidentally rewrite another clip sharing a source.
3. Add launch modes/follow actions and MIDI editing as bounded native musical
   publications, preserving immediate editing, Undo/Redo, cancellation,
   generation/revision checks and native launch receipts.
4. Add audio processing incrementally with real sample/PCM lifetime, audible
   tests and explicit CPU/work admission. Re-Pitch is the only current mode;
   a visual control alone is not a warp engine.
5. Add envelope targets/interpolation, then MPE only with end-to-end routing and
   ownership. Keep device instance identity and accepted bases distinct from
   automation. A browser fixture is not native or physical audio evidence.
6. For each feature compare Live interaction and keyboard behavior on a
   disposable installation; cover Session and Arrangement, rolling/stopped,
   empty/selected/multiple clips, Undo/Redo, rejected edits, resizing, keyboard
   focus and real audio where applicable. Preserve screenshots and source hashes.
