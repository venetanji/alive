# Task 3: Minimal Alive Native Interface

Status at frontend handoff: implemented and tested; parent owns the final Rust,
packaging, native walkthrough and endurance acceptance evidence. No native DSP
source, ABI, tests or library rebuild was changed by the frontend slice.

## Implementation

- Alive main view uses the established compact charcoal/amber/Liberation Sans
  world: transport, two independent track rows, actual note previews and selected
  piano roll, note fields, cutoff/level step lanes, post-mixer track/master peaks,
  and validated manifest parameter controls.
- Clip and automation edits are explicit drafts. Polls merge current live bases
  and mixer values without replacing musical edits. Apply submits the complete
  draft, and a rejected Apply retains it. File/close actions first synchronize
  pending musical edits; rejection blocks the action. Native Apply/Discard/Cancel
  results authoritatively restore or clear the pending draft.
- Optional hosted editor renders the actual prepared patch using Ultra's
  `createNodeView`, `nodeSpec`, `applyNodeAppearance` and `cablePath`. Bound panel
  fields and the authored Level gain face use the same `alive_base` command.
  Runtime automation ownership/effective value is separate from saved base.
  Closing the editor invokes only the window close operation.
- Structure is unavailable in the hosted view. Its visible source workflow is:
  stop Alive, edit the saved .ultra in Ultra, then use Replace in Alive to prepare
  and apply it. Source paths and graph object/cable counts remain observable.
- Audio details exposes actual Driver/native snapshots. It distinguishes stream
  errors from the unavailable underrun count and provides no fabricated metrics.

The initial desktop/control implementation was handed to the parent, who owns
subsequent review and changes to session/desktop.rs, main.rs, capability and
resource mappings. Parent also exclusively owns check_canvas_desktop.sh,
check_alive_desktop.py, native/endurance scripts, CI and final branch integration.

## Verification

- `node --test apps/ultra/ui/alive-model.test.mjs apps/ultra/ui/alive-dom.test.mjs`:
  8 tests passed, 0 failures. Covers musical drafts, live-state merge, automation
  ownership, authoritative native dialog results, actual musical field events,
  rejected/accepted Apply, draft-before-file ordering, rejection blocking Save,
  actual hosted patch renderer objects/cables, panel and graph bound edits, and
  UI-only close.
- `node --test apps/ultra/ui/*.test.mjs`: 424 tests passed, 0 failures.
- `node --check apps/ultra/ui/alive.mjs` and
  `node --check apps/ultra/ui/alive-editor.mjs`: exited 0 during implementation.
- Observed failing tests before fixes: missing Alive draft model; native file
  results incorrectly clearing retained drafts; failed draft synchronization
  still permitting Save; hosted editor passing an object to parsePatch(text).
  Each has a passing targeted test after implementation/correction.
- Inspected the parent's first actual native screenshot at
  `/tmp/alive-native-smoke/native-focus-failure.png`. Main view hierarchy, notes,
  lanes and base/effective controls align and remain readable. The initial
  860px native window exceeded the harness's 840px display; recommended a default
  800px window while retaining the scrollable main content and pinned footer.
- DOM adapters test real view-module behavior and command payloads. They do not
  establish rendered geometry, native playback or audio continuity. Those are
  parent-owned native acceptance checks.

## Native Walkthrough Interface

Launch: `ultra --alive [session.alive]`. Main window label: `main`; editor label:
`alive-editor-{generation}-{track}`. Main native title initially `Alive`; hosted
title is `<track name> - Ultra Hosted Editor`.

Commands: `alive_current`, `alive_draft`, `alive_apply`, `alive_base`,
`alive_mixer`, `alive_transport`, `alive_editor`, `alive_file`, `alive_device`.
`alive_current` includes document, devices, generation, dirty, draft, native
state, Driver audio snapshot, and the editor's actual prepared patch/track.
Write commands include the current generation. Hosted parameter events capture
their generation before entering the UI command queue.

Stable accessibility labels:

- `Start transport`, `Stop transport`, `Tempo`, `Clip length beats`,
  `Loop session`, `Transport position`, `Seek beat`, `Seek transport`.
- `New session`, `Open session`, `Save session`, `Save session as`, `Quit Alive`,
  `Prepare / Apply`, `Discard edits`, `Add instrument track`.
- `Pulse clip`, `Harmony clip`, `Pulse gain`, `Pulse mute`, `Pulse solo`,
  `Open Pulse editor`, `Replace Pulse device`, `Remove Pulse device`; track-name
  substitutions apply to Harmony and newly loaded tracks.
- `Note 1 beat`, `Note 1 pitch`, `Note 1 duration`, `Note 1 velocity`,
  `Remove note 1`, `Add note`; note indexes are one-based.
- `Cutoff automation enabled`, `Cutoff point 1 beat`, `Cutoff point 1 value`,
  `Add Cutoff point`, `Remove Cutoff point 1`; analogous Level labels.
- `Cutoff base`, `Level base`, `Cutoff effective ownership`,
  `Level effective ownership`; all manifest labels follow the same scheme.
- Hosted: `Hosted Cutoff base`, `Hosted Level base`, `Hosted Level graph base`,
  `Hosted Cutoff effective ownership`, `Hosted graph summary`,
  `Fit hosted graph`, `Close hosted editor`.
- Expand the `Audio details` summary. Readouts: `Audio backend`, `Audio device`,
  `Audio sample rate`, `Audio buffer frames`, `Audio callbacks`,
  `Audio stream errors`, `Audio failed`, `Audio status`, `Transport playing`,
  `Absolute frame`, `Rejected commands`, `Native generation`,
  `Track 1 active voices`, `Track 2 active voices`.

## Limits And Pending Acceptance

The frozen native contract accepts one or two configured tracks. Removing the
last track currently returns an explicit keep-one/replace-device error; removing
the second and adding a new referenced device are supported. An empty session
would require a separate unconfigured UI state or a coordinated native contract
change. This was reported to the parent for the final scope decision.

The hosted view supports bound live numeric controls, graph inspection, nested
patcher navigation and zoom. It does not promise live graph-structure editing.
Native Save/Open, failure preservation, actual editor close/reopen playback,
missing/incompatible device rejection and endurance remain parent acceptance
items at this handoff. Frontend commits and final native evidence are recorded
by the parent after integrating this report.

## Frontend Review Follow-Up

The reviewed P3 stale automation-base segment is corrected. Lane drawing uses
a dependency key containing the selected track, clip length, lane data and the
current manifest binding ranges/bases. Live base edits repaint the pre-first-
point segment and empty-lane base line, while unchanged polling snapshots retain
the existing SVG elements. A real-view DOM regression first reproduced the stale
coordinates, then passed after the fix; it also checks unchanged SVG identity.

The hosted editor's Zoom selector now follows the actual graph fit, using a
dynamic percentage option for fitted scales outside the fixed zoom choices.
The native screenshot's prior graph-69%/selector-75% mismatch is covered by a
failing-then-passing test for initial fit, manual zoom and another Fit action.

Fresh post-review verification:

- `node --test apps/ultra/ui/alive-model.test.mjs apps/ultra/ui/alive-dom.test.mjs`:
  10 passed, 0 failed.
- `node --test apps/ultra/ui/*.test.mjs`: 426 passed, 0 failed.
- Inspected `/tmp/alive-native-journey5/hosted-editor.png`: actual prepared graph,
  cables and separate saved-base/automation-effective readouts are visible. The
  zoom fix changes the selector value only; the graph geometry stays intact.
- Preserved the parent's Session status label in alive.html. The review follow-up
  touches only Alive view modules, the DOM regression tests and this report.
