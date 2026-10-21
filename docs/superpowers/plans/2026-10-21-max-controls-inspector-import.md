# Max Controls, Inspector And Help Intake

**Goal:** Make existing controls usable with the Max editing/performance workflow,
save supported inspector appearance attributes, and open compatible Max help tabs
with explicit compatibility reports.

**Architecture:** Keep control gestures in the node view. Store optional Max-named
appearance attributes on each node and validate them in JavaScript and Rust without
changing the native runtime descriptor. Convert selected Max patchers into the
existing bounded profile; unsupported graph content requires explicit partial import.

**Constraints:** Preserve the established compact UI, 32-node/64-cable execution
limits, existing user artifacts, native audio path and saved patches. Do not ship
proprietary help files. Browser previews do not execute native control messages.

- [x] Controls: reproduce pointer conflicts; add browser regressions; implement
  whole-face locked controls, Ctrl/Cmd operation while editing, numeric dragging,
  range axes and cancellation. Files: `canvas-node.mjs`, `canvas.css`, controls spec.
- [x] Inspector contract: validate optional Max-style attributes through JS/Rust;
  preserve them across export/configure/history; test absence of native resets.
  Files: `canvas-appearance.mjs`, `canvas-model.mjs`, `canvas.rs`, contract tests.
- [x] Inspector surface: grouped appearance fields, RGBA editing and reset; render
  colors/dimensions/type settings and update cable anchors. Test rendered export/undo.
- [x] Max intake: bounded parser, named subpatch selection, retained wiring order,
  attributes and diagnostics; explicit partial consent. Test synthetic full selections
  and inspect installed help files without copying them into the repository.
- [x] Integration: run browser and contract suites; rebuild; exercise actual native
  controls and an imported installed help fragment; document exact execution limits.

Run focused red/green tests for each behavior before the combined suites. Commit
only this task's files after verification; preserve unrelated untracked artifacts.

## Verification

- Combined Chromium suite: 42 tests pass; after final visual fixes the affected
  controls/compatibility suites pass 17 tests.
- Contract suite: 156 JavaScript tests plus reference/Python/native C++ checks pass.
- Rust bridge: 37 pass, one pre-existing private PipeWire test ignored; the real
  desktop run separately exercises private CPAL output at 48 kHz / 512 frames.
- Native desktop: face clicks, numeric/range gestures and the original installed
  slider basic tab pass. The imported 14-node/9-cable branch emits downstream
  values 95 and 26. Whole-help execution remains unsupported.
- WebKitGTK gain-fill raster regression passes. Desktop/narrow screenshots pass
  the final bounded visual confirmation.
