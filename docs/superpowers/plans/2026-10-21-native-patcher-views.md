# Native Embedded Patcher Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. The user authorized autonomous subagent work and preserving this dirty checkout; no commits.

**Goal:** Open embedded patchers in independent native views of one live document.

**Architecture:** Native owner snapshots and CAS history separate root identity
from view identity. A shared frontend controller serializes edits and consumes
owner broadcasts; the established standalone controller remains available.

**Tech Stack:** Rust/Tauri, JavaScript modules, existing bounded C++ runtime.

**Spec:** `docs/superpowers/specs/2026-10-21-native-patcher-views-design.md`

## Global Constraints

- Preserve existing dirty work, artifacts and unrelated files. No commits/pushes.
- Keep inline v2 schema and current ABI/capacity bounds; 64 child views per owner.
- Use existing Max-inspired UI. Do not restart the completed Impeccable loop.
- Private desktop services only; no user applications/preferences are disturbed.

### Task 1: Native Owner Store, Admission And View Lifecycle

**Files:** `src-tauri/src/documents.rs`, `documents_tests.rs`,
`document_windows.rs`, `main.rs`, `canvas.rs`, and focused new Rust modules as
needed, all under `apps/ultra/`.

**Interfaces:** Produce the descriptor and IPC contract defined in the spec.

- [x] Write failing Rust tests for owner/view identity, stale CAS, owner history,
  save baselines and detach. Run the release Rust tests and confirm the missing
  behavior fails before implementation.
- [x] Implement canonical snapshots, bounded history and compare-and-swap.
  Validate/admit runtime changes before mutating the canonical tree. Separate
  geometry/style/name changes from executable changes.
- [x] Add native child windows and lifecycle, derive graph identity from the
  calling window binding, and cache console records with per-view cursors.
- [x] Run focused and complete Rust checks. Report changed files, evidence,
  protocol details and any unresolved issues for independent review.

### Task 2: Shared Frontend Controller

**Files:** create `apps/ultra/ui/canvas-shared.mjs` and its Node tests; minimal
exports from `canvas-model.mjs` only if necessary. Do not edit canvas.mjs or
document-session integration, owned by Task 3.

**Interfaces:** Export `createSharedCanvasController({invoke,onState})`, the
existing controller API, plus `adoptDescriptor(descriptor)` and
`acceptDescriptor(descriptor)`. Native descriptor/commit contract is the spec.

- [x] Write failing tests using a shared authoritative fake native service with
  two real controllers. Confirm boot, edits, stale CAS and detach fail first.
- [x] Implement optimistic local editing with serialized CAS, disjoint edit
  rebase or explicit conflict recovery, shared history and runtime operations.
  `prepare()` reads/adopts native state and never calls `canvas_apply`.
- [x] Test simultaneous edits, parameter/history ordering, runtime-revision
  updates, source observations and disposal without canvas_stop.
- [x] Run focused tests and existing model/hierarchy suites; report evidence.

### Task 3: Editor Integration And Native Desktop Regression

**Files:** `apps/ultra/ui/canvas.mjs`, `canvas-documents*.mjs`, affected UI tests,
`apps/ultra/tests/check_documents_desktop.py`, capabilities and docs.

**Interfaces:** Consume Task 1 descriptors/IPC and Task 2 controller API.

- [x] Add failing document-session/browser evidence for shared ready, broadcasts,
  whole-owner child save and opening child windows rather than inline navigation.
- [x] Integrate shared controller for real native windows, flush before save,
  subscribe to owner changes, preserve browser inline navigation, and route
  console source navigation to the source's native patcher view.
- [x] Build and test in the private desktop harness. Verify actual child window
  identity, shared edit/history, preserved runtime/audio and owner close/cancel.
- [x] Independently review bounded native/controller/integration changes and fix
  material findings with regression evidence. Run required contracts and the
  affected JS/Rust/browser suites, then document exact remaining coverage gaps.
