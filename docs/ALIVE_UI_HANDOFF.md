# Alive UI Handoff

This is the UI restructuring handoff for the baseline integrated by PR #6.
The next PR starts from integrated `main`. No redesign is implemented here.
Read `apps/alive/SESSION_CONTRACT.md` for the current behavior contract and
`experiments/alive-pr6-finalization-20261031/README.md` for merge validation
and its limits. Dated experiments describe their recorded builds.

## Required Spatial Organization

Follow Ableton Live's spatial organization, control hierarchy and interaction
conventions, not merely its colors or surface appearance.

| Region | Responsibility |
| --- | --- |
| Top | Global transport and global musical controls |
| Left | Browser |
| Main workspace | Session or Arrangement |
| Bottom | Contextual Clip or Device detail |
| Bottom-left | Contextual Help/Info, reserved for this purpose |

Future work must place controls within these responsibilities. Do not introduce
arbitrary buttons or panels outside these regions. The present browser/footer
actions are existing design debt, not a template for more controls.

## Current Architecture And Entry Points

Alive is a Tauri desktop application with an HTML/CSS/JavaScript frontend shared
with Ultra. Session slots and Arrangement placements reference stable MIDI/audio
sources in one workspace score. Session launch can override Arrangement per
track; selection and workspace navigation are separate from playback authority.
Clip and Device detail share the resizable/maximizable bottom area. The current
Master detail is another selection in that area.

Paths in this table are relative to `apps/ultra/ui/` unless stated otherwise.

| Entry point | Responsibility |
| --- | --- |
| `alive.html`, `alive.mjs` | Shell markup, page controller, serialized IPC command queue, native polling, accepted snapshots and render coordination |
| `alive-model.mjs`, `alive-workspace-edits.mjs` | Accepted document/runtime model and musical edit construction |
| `alive-workspace.mjs` | Session/Arrangement and detail navigation, browser/detail sizing, focused draft parking/restoration |
| `alive-shell.mjs`, `alive-shell.css` | Transport options, shell layout and responsive rules |
| `alive-browser.mjs`, `alive-browser.css`, `alive-device-drop.mjs` | Search, categories, incremental native catalog and validated device drops |
| `alive-timeline.mjs` | Arrangement lanes, placements, selection, loop brace and playhead |
| `alive-clip-view.mjs`, `alive-piano.mjs`, `alive-piano.css`, `alive-midi-preview.mjs` | MIDI/audio editor geometry, waveform, markers, note/velocity gestures and opt-in audition |
| `canvas-presentation.mjs`, `canvas-presentation-view.mjs`, `canvas-presentation-view.css`, `canvas-presentation-hosts.mjs` | Saved device surfaces shared with Ultra Perform, bindings, instance ownership and gesture admission |
| `live-controls.mjs`, `live-controls.css`, `components/` | Reusable controls; inspect actual imports before changing shared styling |
| `alive-master.mjs`, `audio-settings.mjs` | Master control producer and output-device settings |
| `alive.css` | Main visual tokens, controls, track/mixer, timeline, detail and footer styles |
| `apps/alive/src-tauri/` | Alive executable/configuration and shared runtime integration |
| `apps/ultra/src-tauri/src/session/` | Native document, history, persistence, browser, preparation, publications and launch ownership |

`alive.html` loads styles in this order: `alive.css`,
`canvas-presentation-view.css`, `alive-shell.css`, `alive-piano.css`,
`alive-browser.css`. Inspect cascade and shared consumers before moving rules.
The frontend owns navigation, focus and gesture previews. Rust/native code owns
accepted music, revisions, scheduling, DSP and audio; renderer timers only poll.
Native engine entry points include `apps/ultra/src-tauri/native/alive_session*.hpp`.

## Known UI Problems

- Too many visible and duplicated actions across browser, track controls,
  editing strips, device cards and footer; hierarchy and discoverability vary.
- Global, track, clip and device actions mix together. Labels, icon/text usage,
  alignment and control placement are inconsistent.
- Bottom-left currently contains browser actions/status rather than contextual
  Help/Info. Establish the reserved Help/Info region in the redesign.
- Footer diagnostics, audio settings and status compete with musical controls;
  technical runtime details are too prominent in the normal musical workflow.
- Clip/Device/Master selection, detail expansion and maximization need a
  coherent Live hierarchy. Preserve resizing, scrolling and keyboard access.
- `alive.mjs` is large and CSS is layered across files. Restructure deliberately
  around the defined regions; avoid adding another isolated action strip.

## Interaction And Runtime Invariants

- Navigation, selection, browser search and resizing do not launch clips,
  change playback authority or modify accepted music. Preserve unfinished input
  across these operations without accepting it on incidental blur.
- Empty MIDI tracks/slots show no piano roll. A real zero-note MIDI clip still
  has an editor. Audio clips use waveform detail, never the MIDI piano roll.
- Ctrl+T creates audio tracks; Ctrl+Shift+T creates MIDI tracks. Empty MIDI clip
  creation and musical edits work while rolling without an edit confirmation or
  separate Apply action. File unsaved-project decisions remain distinct.
- Source contents, clip Start/End, clip loop, placement span and song loop are
  separate. Ctrl+L applies the selected time range in the active editing context.
  Preserve explicit source/occurrence identities and native launch boundaries.
- Device parameters, drafts and gesture ownership belong to a specific instance.
  Same-source instances remain independent. Navigation cannot redirect stale
  writes; commit/cancel and editor close/reopen must retain their semantics.
- Track devices can exist without a clip. Closing an editor or detail view does
  not own or terminate playback. Preserve ordered effects and validated drops;
  generation, edit revision, target identity and rollback checks remain intact.
- Preserve native revision checks, admission/work limits, acknowledged musical
  publication, PCM retirement, Undo/Redo and rejection/cancellation behavior.
  Do not replace native receipts with optimistic UI success or timed guesses.
- Retain keyboard focus/accessibility, readable control ownership and contained
  scrolling at 800x600 through desktop sizes. Browser fixtures establish UI
  behavior and geometry; they are not native audio evidence.

## Existing References And Evidence

| Location | Contents |
| --- | --- |
| `experiments/alive-workflow-reference-20261024/` | Actual Live runtime screenshots and action receipts. Start with `README.md`, `08-clip-created.png`, `18-launch-panel.png`, `35-a-running.png`, `36-b-queued-phase1.png`, `38-b-running.png`, `41-track-stopped-transport-running.png`, `44-device-context.png`, `49-host-running-editor-closed.png` and `50-editor-reopened-transport-running.png` |
| `experiments/alive-clip-regions-20261031/live-reference.md` | Actual Live MIDI/audio time selection, Ctrl+L, independent Start and Arrangement loop observations, plus manual sources |
| `/tmp/alive-live-range-reference-20261031/` | Local, ephemeral Live range captures, including `04-editor-expanded.png`, `05-time-selected.png`, `06-clip-ctrl-l.png`, `07-start-independent.png`, `17-arrangement-ctrl-l.png`, `28-audio-time-selected.png`, `30-audio-ctrl-l-fields.png`; these are not all committed |
| `experiments/phase2-ui-20261030/` | Alive UI captures, responsive checks and retained native/cloud failures; these are app evidence, not Live reference screenshots |
| `experiments/alive-presentation-checkpoint-20261031/` | Installed source/build manifests, acceptance receipts, reviews, failed attempts and `captures/final-9ced05e/` Alive/Ultra screenshots |

Preserve original evidence and failures. Broader Arrangement Return-gap and
historical Master automation-ownership qualification remain unresolved. Installed
Live candidates (including Analog) are unavailable in this baseline; native DLL
work is in another worktree. Continuous DSP structural edits, generated shared
Live libraries, recording/input routing and video remain pending. Do not expose
these proposals as working controls.

## Existing Verification Commands

From the repository root, run current frontend contracts with:

```sh
node --test apps/ultra/ui/*.test.mjs apps/ultra/ui/components/*.test.mjs
```

For browser screenshots and geometry/interaction assertions, from
`apps/ultra/tests/ci/` (installed lockfile dependencies and Chromium required):

```sh
ALIVE_TEST_PORT=4197 npx playwright test alive-chain.spec.mjs alive-clip-regions.spec.mjs canvas-instrument.spec.mjs --reporter=list --output=/tmp/alive-ui-next-browser
```

`alive-chain.spec.mjs` captures normal and expanded detail, Session/Arrangement,
browser and device surfaces at sizes including 800x600, 1024x768, 1280x800,
1440x900 and 1920x1080. These are screenshot-backed assertions, not a golden-image
pixel-diff suite. Keep Chromium sandboxing enabled.

The existing private native UI harness, from the repository root with a matching
built binary and libraries, is:

```sh
ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCREEN_SIZE=1920x1080 \
ULTRA_TEST_ALIVE_BINARY="$PWD/apps/ultra/src-tauri/target/debug/alive" \
ULTRA_TEST_ALIVE_SESSION="$PWD/apps/alive/examples/midi-arrangement.alive" \
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_ui_fidelity.py" \
bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-ui-next-native
```

Use fresh output directories. This script checks the actual WebKit desktop;
confirm binary identity before interpreting results. Installed saved-surface
reproduction and its separate Ultra follow-up are documented in
`experiments/alive-presentation-checkpoint-20261031/README.md` and
`reproduce-installed.sh` there. Do not rebuild or mutate the frozen native
library to run UI screenshots. A broad native Arrangement/endurance rerun is a
separate qualification task, not a prerequisite for every styling change.
