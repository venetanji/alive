# Max Numeric UI Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for integration and
> the explicitly requested agents for native implementation and independent
> review. Preserve the dirty shared checkout; no commits or resets.

**Goal:** Give imported and newly authored integer number boxes Max-compatible
ports, integer behavior and physical Tab, and implement numeric send methods.

**Architecture:** Add NumberInt without changing legacy Number. Physical Tab
uses a dedicated native action on the same bounded shared executor; Int/Float
send reuses the existing global message bus.

**Tech Stack:** C++ native callback, Rust/Tauri, JavaScript/WebKit, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-22-max-numeric-ui-design.md`

## Global Constraints

- Preserve saved `number`, kind 2. New type `number_int`, kind 52.
- Keep ABI struct sizes, 32 nodes, 64 cables, eight atoms and 16 owners fixed.
- No callback allocation, mutable runtime reads from the control thread, or
  graph installation for an individual numeric edit or physical Tab.
- No proprietary source bodies in project fixtures and no original Max
  prefix/preferences mutation. Preserve the completed Impeccable styling.
- Whole-help qualification stays at zero until complete roots are exercised.

## Task 1: Native Numeric Contracts

Files: native `canvas_message.hpp`, `patch_graph.hpp`, `canvas_workspace.hpp`,
`backend.cpp`, `patch_graph.h`; Rust `canvas.rs`, `main.rs`,
`document_commands.rs` as required; covering C++/Rust tests and protocol docs.

Interface: `ultra_canvas_tab_document(uint32_t,uint64_t,uint32_t)` returns
admission success. `canvas_event` accepts optional `action: "tab"` with
`value:null,inlet:0`. Saved number_int uses integer value/minimum/maximum.

- [x] Add failing regressions against the retained numeric oracle: signed
  truncation, bounds/set/list repetition, explicit port shapes, legacy value,
  physical Tab versus selector, typed cross-owner send and cold send.
- [x] Implement kind 52, audit range assumptions (`kind >= 50` is not a valid
  boundary predicate), parameter/hot and history inference, bounded tab queue,
  and shared routing; reject invalid/stale UI action requests.
- [x] Run native/Rust tests and report exact evidence and edited file list.

## Task 2: Authoring And UI Integration

Files: UI `canvas-model.mjs`, `canvas-catalog.mjs`, `canvas-node.mjs`,
`canvas-appearance.mjs`, `canvas-shared.mjs`, `canvas.mjs`,
`canvas-max-import.mjs`; their tests, numeric example, generated help catalog.

Interface: both controllers expose `tab(nodeId):Promise`; preserve their
existing event queue and epoch/close barriers. Node views receive `tab`.

- [x] Write failing tests for parse/objectText legacy preservation, number_int
  integral parameters and ports, imported Max numbers/bounds/cables, plain
  numeric send acceptance and unresolved scoped-name refusal.
- [x] Add registry/catalog/appearance/rendering and I shortcut. Commit dirty
  integer input with Math.trunc; show live observations even after silent set.
- [x] Enqueue Tab separately from message input, validate UI node type and
  readiness, and pass the optional action only on Tab IPC calls. Preserve
  queued edit-before-Tab ordering in both controllers.
- [x] Add browser keyboard/theme/port regression and native desktop regression
  proving physical Tab prints via outlet 1 while incoming `tab` stays silent.
  Native tests verify hot-commit-before-Tab order and runtime-state preservation.

## Task 3: Integration Review And Verification

- [x] Independent read-only review of the changed contracts and tests; fix
  material findings and recheck the affected behavior once.
- [x] Run complete JS, Rust release, relevant browser, required contracts and
  build. Review one combined control capture without a new polish loop.
- [x] Record outcome, exact evidence and remaining help dependencies in
  `.impeccable/review/max-fidelity-20261021/numeric-ui.md`.
