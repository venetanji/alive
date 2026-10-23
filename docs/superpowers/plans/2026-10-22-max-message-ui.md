# Max Message UI Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for the
> explicitly requested native agent and independent review. Root integrates UI
> and verifies. Preserve the dirty shared checkout; no commits or resets.

**Goal:** Add empty, mutable, typed Message boxes with compatible substitution,
live display publication and text editing without restarting the patch.

**Architecture:** Preserve Message=1; append MessageBox=53. Compile bounded
templates off callback, apply one queued text action and publish atomic typed
snapshots. Shared authoring CAS/history carries the admitted text serial.

**Tech Stack:** C++ callback, Rust/Tauri, JavaScript/WebKit, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-22-max-message-ui-design.md`

## Global Constraints

- Keep existing ABI structs, legacy message, 32 nodes, 64 cables, eight atoms
  and 16 owners fixed. New kind is 53, saved `message_box`.
- No callback allocation, unsynchronized runtime reads, graph reinstall for
  one MessageBox text edit, or polling mutation of canonical text.
- Support only standalone `$1`/`$2`, the finite literal profile and empty text;
  refuse unsupported syntax explicitly. Do not invent empty-list evidence.
- Preserve completed Impeccable styling, licensed source bodies and prior
  evidence. Whole-help qualification remains zero until complete roots pass.

## Task 1: Native State, Publication And Authoring Admission

Files: new focused native Message template/runtime header, existing
`canvas_message.hpp`, `patch_graph.hpp`, `canvas_workspace.hpp`, `backend.cpp`,
`patch_graph.h`; Rust `canvas.rs`, `main.rs`, document command/shared state
modules; C++/Rust tests and `PATCH_PROTOCOL.md`.

Interfaces: native text action and snapshot from the spec;
`canvas_message_text({revision,node,text})->{serial}`;
`document_commit` optional `messageText:{node,text}`;
descriptor `messageTextSerial`; status `message_boxes` shape from the spec.

- [x] Add and run failing regressions for oracle rows: empty suppresses;
  `saved $1 $2` initially emits `saved 0 0`, list8 9 then cold `new $1 $2`,
  hot9 emits `new 9 9`; `symbol kiwi` and cold bang preserve display/type;
  bare set clears; silent `set fresh $1` followed by7 emits `fresh 7` while
  display stays `fresh $1`. Include exact retained other2 -> new9 -> new9 2.
- [x] Implement bounded compiler/state, two inlets, typed snapshots, atomic
  text admission, and legacy preservation. Validate full input before mutation.
- [x] Add Rust schema, new command, status projection and serial-aware shared
  CAS/history inference. Explicit same-text hint restores the live template.
- [x] Verify native header/linked tests and Rust release, including stale,
  saturation, off/on callback, same-text restore, child-view and serial cases.

## Task 2: Authoring, Import And Live UI

Files: new `ui/canvas-message-ui.mjs` for pure bounded template validation and
snapshot caching; model/catalog/appearance/node/controllers/import/library;
targeted JS/browser tests, original example and generated library.

Interfaces: `parseMessageTemplate(text)` validates and returns template words;
`mergeMessageDisplays(previous,snapshot,{revision,serial,ids,pending})` returns
cached per-ID display records without modifying authored state. Controllers
expose records in state `messageBoxes`. Use native Task1 interfaces exactly.

- [x] Write failing JS tests for new/legacy parser, two ports, empty text,
  supported `$1`/`$2`, strict refusals, both inlet cables and display caching.
- [x] Add new kind in registry native order. Map authoring `message`/`msg`/M
  to it and old type to `message.legacy`. Reuse appearance and existing face.
- [x] Queue standalone text updates before events, retain lifecycle guards,
  and use atomic text updates for single-text history/configure. Shared edits
  send validated `messageText` hints even when canonical text is unchanged.
- [x] Merge serial-matching snapshots into `messageBoxes`; hide stale display
  for pending edits, preserve caches on null, and clear on runtime revision.
- [x] Import empty/templates as new type and preserve cold cables. Update
  literal receiver classification for known placeholders without executing JS.
- [x] Add original example, regenerate catalog, update docs/count assertions
  and run JS plus targeted browser authoring/display checks.

## Task 3: Independent Review And Desktop Verification

- [x] Read-only independent review of native concurrency, strict schemas,
  shared serial/CAS/history and UI cache/order boundaries. Fix actual findings.
- [x] Run required contracts, release build, relevant browser and full JS/Rust
  suites once after integration. Recheck only affected failures after fixes.
- [x] Extend actual native desktop harness with cold/set template display,
  same-text restore, physical text edit and shared-view persistence; retain
  one combined screenshot without a new polish cycle.
- [x] Record exact evidence and remaining help dependencies under
  `.impeccable/review/max-fidelity-20261021/message-ui.md`.
