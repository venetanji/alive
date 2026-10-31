# Alive Saved Presentation Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development, one
> implementation worker at a time, fresh task review after each task. Workers
> never spawn helpers. The controller owns whole-delivery acceptance.

**Goal:** Author and persist one typed Ultra presentation and render it inside
Ultra preview and each existing Alive device card.

**Architecture:** Canonical document metadata is validated independently from
the executable graph. A shared renderer receives an instance-scoped adapter;
Ultra provides document capabilities and Alive supplies authorized base/effective
bindings. Installed panel bodies reuse the authored native-session control family.

**Tech Stack:** Existing JS canvas/Alive UI, Rust/Tauri schema/admission, shared
Live controls, Node tests, Chromium and private native desktop verification.

**Spec:** `docs/superpowers/specs/2026-10-31-alive-saved-presentation.md` and full
hosting goal `experiments/native-devices-20261031/alive-device-hosting.md`.

## Global Constraints

- Work only in `phase2-ui/alive`; read the concurrent `2a0f` source without edits.
  Imported authored modules get a recorded source hash; no proprietary payloads.
- No migrations, old-format readers, inferred surfaces or legacy inspector.
  Update current schemas, examples, producers and fixtures together.
- No automatic audition keyboard. Surface lifetime never owns playback.
- Keep canonical document/history, instance-scoped replies, card draft guards,
  captured browser targets and current stopped structural graph edits.
- Presentation edits never install DSP or change musical transport/notes.
- Preserve 800x600 and larger layouts with internal horizontal device scrolling.
- No native admission, capacity increase, mapped-library rebuild, cloud CI,
  merge, release or tag. Actual Analog playback remains a separate delivery.

## Task 1: Current Document Contract And Host Projection

**Files:** Create `apps/ultra/ui/canvas-presentation.mjs` and tests,
`apps/ultra/src-tauri/src/canvas_presentation.rs`; modify `canvas-model.mjs`,
`canvas-hierarchy.mjs`, `canvas-device.mjs`, `canvas-instrument.mjs`,
Rust `canvas.rs`, `canvas_device.rs`, session preparation/catalog admission,
current `.ultra` examples and affected current fixtures/producers.

**Interfaces:** `validatePresentation(document,registry,structural)` validates
authored scope metadata; `CanvasDocument.setPresentation(value)` and
`updatePresentationItem(id,changes)` use the existing history transaction path.
`HostManifest.presentation` is the validated root presentation with resolved
control descriptors and text, independent of `NativeGraph`.

- [ ] Add a shared JSON corpus for valid/invalid control/panel records, bounds,
  hierarchy/identity errors, unknown fields and unsupported capabilities. Include
  `assert.throws(()=>validatePatch({...valid,presentation:{...p,version:2}}))`
  and empty surface acceptance. Run focused JS and Rust tests red.
- [ ] Implement the exact schema from the spec in JS/Rust; preserve metadata
  through hierarchy validation and exclude it from execution/topology lowering.
  Require explicit current nullable records on roots/scopes; update producers and
  fixtures mechanically rather than adding default-on-load fallback code.
- [ ] Add canonical item mutations/identity remapping/deletion and one-gesture
  history. Test edit/undo/redo leaves execution fingerprint and apply count equal.
- [ ] Consolidate current manifest-v2 validation, remove v1 reader and allow
  zero exposed parameters. Author explicit bundled saved layouts and project
  them through prepared snapshots. Refuse unsupported Alive surface bindings
  before native installation; keep ordinary nondevice Ultra targets available.
- [ ] Run document/model/hierarchy/device tests and relevant Rust suites against
  frozen native library; update tests directly for current schemas. Commit only
  task files and report changed interfaces and exact red/green evidence.

## Task 2: Shared Surface And Scoped Host Adapters

**Files:** Create `canvas-presentation-view.mjs/.css`, focused host adapter
modules/tests. Import only authored shared controls/resource-body modules needed
from `2a0f`; modify `canvas-device-panel.mjs`, `canvas.html`, Alive device-card
mounts/styles, packaging resource maps and relevant DOM/Chromium fixtures.

**Interfaces:** `mountPresentation({doc,root,presentation,host,mode,onError})`
returns `{update,dispose,hasDraft}`. Host signatures and scope are exact in spec.
Consumes `HostManifest.presentation`; numeric Alive writes retain `alive_base`
generation/instance authorization and effective automation ownership.

- [ ] Write red DOM tests with two scoped fake hosts using one layout: independent
  writes/drafts, delayed stale completion, rejected values, missing resources,
  conditional page visibility, complete compound writes and disposal with zero
  stop/note-release calls. Assert no keyboard in either performance surface.
- [ ] Extract the keyboard-free installed panel body/binding lifecycle; reuse
  shared control factories and immutable resource identity. Keep observations
  owner-scoped, and reject writes/replies after source/instance scope changes.
- [ ] Mount exactly this renderer in Ultra preview and Alive cards. Replace
  heuristic manifest-layout builders, preserve card cache/drafts and automation
  readouts/actions. An explicit Ultra audition tool stays outside the surface.
- [ ] Verify shared layout/bindings in rendered tests; preserve browser drop and
  failed-load rollback. At 800x600 and 1280x800 capture natural-size scrolling,
  focus and error surfaces with no whole-window overflow. Run affected suites,
  packaging-map checks and commit task files.

## Task 3: Ultra Presentation Authoring

**Files:** Create focused presentation-editor module/tests and Inspector section;
modify `canvas.mjs`, toolbar/Inspector HTML/CSS, shortcut/help documentation and
DOM/Chromium authoring tests. Keep canonical mutations from Task 1.

**Interfaces:** Editor consumes the shared renderer in edit/preview modes and
commits `setPresentation`/`updatePresentationItem` to canonical history. Transient
selection/gesture preview never enters DSP state.

- [ ] Write red tests for inclusion, binding/widget selection, rectangle/style,
  multi-move/resize/order, cancelled drag, one-undo gesture, node deletion/retype,
  nested scopes and invalid field draft survival across mode navigation.
- [ ] Implement Patch/Presentation switch using existing toolbar/lock/Inspector
  language. Add keyboard-accessible include/exclude, binding and item selection,
  move/resize/order, visibility/style and saved openOnLoad controls.
- [ ] Use temporary geometry during drag, commit once on pointer release and
  cancel on Escape. Honor focused-draft guards and canonical dirty/save flow.
  Test preview controls and presentation editing during audio with unchanged
  desired/applied execution revisions and no note release/reinstall calls.
- [ ] Run focused model/authoring and rendered keyboard tests, capture compact
  and normal authoring surfaces, then commit and report exact verification.

## Task 4: Max Presentation Import And Installed Acceptance

**Files:** Modify `canvas-max-import.mjs` and related tests/Max fixtures;
evidence under `experiments/alive-saved-presentation-20261031/`, roadmap status,
and resource map only if required. No proprietary resource payloads in evidence.

**Interfaces:** Max importer emits Task 1 presentation per authored scope and
Task 2 renderer consumes it unchanged. Strict/partial diagnostics retain original
scope and box identity. Current saved-document readers remain singular.

- [ ] Add red fixtures for presentation flags, independent rectangles/order,
  default mode, nested scopes, omitted rectangle initialization and invalid
  explicit rectangle diagnostics. Cover supported numeric/toggle/slider/bang/
  message/comment controls with their native Ultra semantics.
- [ ] Implement actual field import while preserving patch coordinates and
  existing unsupported-object policy. Assert import/save/reopen retains all
  supported authored presentation facts; never regenerate an empty surface.
- [ ] Review cross-task changes against the spec. Build Alive and Ultra against
  the frozen library to new immutable outputs and install a manifested version.
  Run actual browser load/drop/save/playback with two saved surfaces, independent
  automation/edits, failure rollback, empty clip areas and editor closure.
- [ ] Capture installed compact/normal sizing, verify source/artifact identity,
  update existing launcher and draft PR using authorized workflow. Preserve all
  remaining full hosting requirements and label native panels unqualified until
  actual Analog ownership/transport delivery passes. Commit evidence/status.
