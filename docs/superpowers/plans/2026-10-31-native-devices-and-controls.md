# Native Devices And Controls Implementation Plan

**Goal:** Deliver shared Live-style controls and a reproducible Analog native
graph experiment, then qualify device hosting before product admission.

**Architecture:** Shared DOM/SVG controls retain existing controller semantics.
An original native PE adapter and borrowed callback bridge remain experimental.

**Tech Stack:** JavaScript/CSS/SVG, C/C++17, existing native Ultra engine.

**Spec:** ../specs/2026-10-31-native-devices-and-controls.md

## Work

- [x] Inspect current Alive host, retained Live UI and seven installed devices.
- [x] Reproduce Analog startup with retained adapter; test one-frame audio and
  no-note silence before choosing the runtime bridge.
- [x] Build shared controls in live-controls.mjs/css and integrate Perform/Alive
  parameter views without changing their controller ownership.
- [x] Verify shared controls with node tests, browser interactions and captures.
- [x] Implement exact-hash C++ adapter in native/external_device with a standalone
  qualification executable and explicit errors for unsupported operations.
- [x] Add compile-flag-only experimental kernel/proxy callbacks to CanvasRuntime;
  verify default rejection, graph validation and frame ordering with mock owners.
- [x] Connect the real Analog adapter to the experimental graph; record note,
  silence, gain and parameter cases plus limits and reproduction commands.
- [x] Review changed code and rendered controls; resolve material findings.
- [x] Document delivered behavior and the remaining gates to saved Alive hosting,
  complete Analog UI/state and independent qualification of the other devices.

No commits or edits to the other session's worktrees are part of this task.

## Delivered Evidence

See `experiments/native-devices-20261031/README.md` and `results.json`.
Final UI coverage: 605 Node tests and 77 browser tests pass. Final native rerun
passes the retained loader/shim suite, Analog and Electric at 1/256 frames,
the real Analog graph and enabled/default callback harnesses. Independent code
and visual reviews are complete; the realloc finding was fixed and verified.

## Remaining Product Work

- [ ] Verify Analog's full parameter map, units, curves, enums and preset state.
- [ ] Build the full Analog editor with the shared controls; migrate existing
  canvas control faces to the default family.
- [ ] Add versioned full-state/resource identity and save/recall contracts.
- [ ] Qualify lifecycle, sustain, hard clear, realtime capacity and instances.
- [ ] Admit the measured external-instrument graph family in Ultra/Alive hosts.
- [ ] Qualify Collision, Tension and Corpus in the retained adapter; investigate
  Amp/Cabinet construction and extend testing individually.

The delivered experiment does not mark these product gates complete.

## Keyboard Test Followup

- [x] Build and launch a separate experimental desktop binary with Ultra's audio
  driver, Analog graph, onscreen/computer keyboard and output level.
- [x] Verify native queue/audio/mute/overflow/close behavior and three browser
  keyboard/failure/layout tests. Record native window/render evidence separately.
- [x] Explain the boundary: this is a playback test window with no Analog
  synthesis controls, not the requested full editor or a saved Ultra device.
- [ ] Replace the dedicated test route with the reusable native-device object
  and an ordinary patch/control panel after parameter/state/lifecycle admission.
