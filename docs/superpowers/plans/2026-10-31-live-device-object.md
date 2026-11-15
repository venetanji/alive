# Live Device Object Implementation Plan

> **For agentic workers:** Use the assigned ownership boundaries and test each behavior before implementing it. The user explicitly authorizes independent parallel tasks. Preserve all existing dirty work; do not commit or replace the installed application.

**Goal:** Create and persist the working Analog as `live.device~ Analog` in normal Ultra, then deliver a portable Terra mapping skill.

**Architecture:** Versioned per-node full device state selects a qualified profile. Native document ownership and atomic state publication keep DLL construction and destruction outside active audio callbacks. The installed panel and existing Analog binding/display modules mount inside the node.

**Tech Stack:** Existing C++/C PE adapter, Rust/Tauri document host, browser JS shared controls.

**Spec:** `docs/superpowers/specs/2026-10-31-live-device-object.md`.

## Global Constraints

- Profile `live12-analog-v1`, state version 1, exactly 203 native values.
- Exact qualified DLL/GUI/Graphics identities; paths are resolved locally.
- One control inlet and two mono outlets; preserve the existing Analog mappings.
- Save complete state through canonical document admission; retain prior graph/state on failed admission.
- Native feature stays opt-in; default builds reject unavailable device execution explicitly.
- REA has one coordinator; parallel workers consume immutable packets.
- No proprietary payloads in source and no rebuild of a library mapped into a running app.

## Tasks And Ownership

- [x] Native host (`live_device_native`): new `native/external_device/live_device.*`, `backend.cpp`, CMake and native tests. Test transactional construction, independent nodes, atomic compound edits, stale revisions, release/stop/restart and failed admission. C ABI: install graph with source sidecars, set full state batches, query parameter states. All ordinary-build exports have disabled stubs.
- [x] Rust admission (`live_device_rust`): `canvas.rs`, new `live_device.rs`, audio/document commands and IPC registration/tests. Strictly validate profile sidecars; compare state as well as graph; infer state-only edits; fence structural changes and preserve authoritative state. Expose revision-keyed `live_device_parameters`, installed pack and default-preset readers.
- [x] Profile and authoring (root): new JS profile/state module and tests; registry/catalog/hierarchy/controller updates; create defaults before object admission; save/undo complete values. Test two independent full states, bad identities/values, state roundtrip and live edit dispatch.
- [x] Embedded editor (root): mount existing resource/layout/binding/display pipeline in a node; retain controls across polling; prevent drag/edit shortcuts from capturing control gestures. Test native transport responses, unsupported controls, state edit persistence, stale updates and release.
- [x] Mapping package (`terra_mapping_workflow`): `docs/skills/live-device-mapping/SKILL.md`, private packet validator and role-specific references. Validate packaging and exercise a real offline worker task. No REA calls by mapping workers.
- [x] Integration (root/reviewer): native+Rust+Node/browser checks, build normal Ultra to a private fresh native output, run actual Analog patch and two-instance render, saved-state roundtrip, default-build checks. Launch the ordinary Ultra patch if native/UI checks pass. Record exact evidence and remaining qualification boundaries.
- [x] Desktop performance followup: profile the reported opening/cable-edit stalls, regression-test and replace linear allocation lookup in the shim, recheck real DLL/host/sanitizer behavior, preserve and reopen the user's edited patch with a fresh immutable library.

## Validation Commands

```sh
node --test apps/ultra/ui/live-device-profile.test.mjs apps/ultra/ui/live-device-object.test.mjs
node --test apps/ultra/ui/*.test.mjs
git diff --check
```

Native/Rust/browser commands and observed results are recorded in the task reports
under the private `~/.cache/alive-ultra-evidence/live-device-object-20261031/`
directory. Compile to fresh output paths; preserve the running Analog test.

## Progress

Implemented and independently reviewed in the existing isolated worktree.
The ordinary Analog patch is open on workspace 8; the latest performance-fixed
launch visually confirms audio running and the user's seven saved objects.
Fresh verification: 663 Node tests, 3 focused installed-panel browser tests,
74 standalone canvas tests and 297 full Rust tests pass; 4 existing Rust tests
remain ignored. The preceding full browser run passed 213 with 2 existing skips.
Native bank/concurrent-state, real Analog two-document backend, sanitizer and
default-disabled checks pass. The ordinary release desktop build succeeds.

The mapping skill validates; all 10 packet-helper tests pass. Electric, Collision
and Tension have verified private packets and worker prompts. A fresh independent
worker exercised Electric's packet without REA, returned inventory/questions and
rejected tampering. Its provenance observation is corrected in immutable Electric
revision 3; old packets remain unchanged. No Terra launcher was available.

See `experiments/native-devices-20261031/live-device-object.md` for the final
implementation, evidence and explicit Analog/Alive qualification boundaries.
