# Max Print Popup Implementation Plan

> **For agentic workers:** Use the requested native agent for Task1; root owns
> Task2. An independent reviewer checks integration. Preserve the dirty shared
> checkout and all existing evidence; do not commit, reset or revert.

**Goal:** Add Max-style transient Print value bubbles without opening console.

**Architecture:** Extend Print p1 with default-off popup; publish typed bounded
non-consuming snapshots; merge view-local monotonic deadlines and render the
observed compact bubble. Keep the old console ABI and all native capacities.

**Tech Stack:** C++ callback, Rust/Tauri, JavaScript/WebKit, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-22-max-print-popup-design.md`

## Global Constraints

- Print stays kind25; p0 level0..3, p1 popup0/1. No old ABI struct/API changes.
- Keep32 nodes,64 cables,eight atoms,16 owners and all scheduler limits fixed.
- No callback formatting, wall clock, allocation or concurrent nonatomic reads.
- Popup selectors are ordinary print data; attribute edits clear prior bubbles.
- Use2000 ms as local policy, not an exact Max timing qualification.

## Task 1: Native Receipt And Rust Publication

Files: `patch_graph.h`, `patch_graph.hpp`, `backend.cpp`, `canvas.rs`, `main.rs`,
focused native/Rust tests, CI contracts and protocol.

Interfaces: new `ultra_canvas_print_popups_document` PODs and nullable status
`print_popups` from the spec. Saved/live Print popup uses p1/default0.

- [x] Write/run failing native cases for default-off, typed enabled receipts,
  two objects, popup0 selector logging, clearing on attribute changes and reset.
- [x] Implement callback-owned receipt state and atomic-word snapshot publication
  with non-consuming reads and contention failure. Keep old console unchanged.
- [x] Add Rust strict parameter mapping, POD validation, off-callback formatting
  and canvas-status projection. Reuse typed formatting without changing output.
- [x] Verify native header/linked/threaded readers and Rust tests; document the
  new additive API, finite clock policy and original runtime evidence.

## Task 2: Authoring, Import, Cache And Bubble

Files: new `canvas-print-ui.mjs`/tests; model/catalog/Inspector/import/controllers;
node renderer/CSS; original print example/generated library; focused JS/browser
tests and desktop harness.

Interfaces: `mergePrintPopups(previous,snapshot,{revision,ids,now})` returns
per-ID records with text/generation/deadline; `printPopupText(record,now)` returns
text or null. Controllers expose `printPopups`; no authored-state mutation.

- [x] Write/run failing JS tests for default0/strict popup, @popup authoring,
  complete saved value import, and generation/revision/null/age/deadline cases.
- [x] Implement cache validation/merging and both controller projections. A new
  receipt gets at most2000 ms; the same generation never extends or resurrects.
- [x] Expose the named Inspector choice and render a safe accessible original
  dark bubble with dot/pointer, flipping at viewport edge. Preserve console
  visibility and existing locked Print double-click behavior.
- [x] Update original print help/example and generated library without changing
  native-kind/object/library entry counts. Add real browser and desktop cases.

## Task 3: Integration, Review And Evidence

- [x] Review snapshot concurrency, text safety, cache lifecycle and native/API
  compatibility; resolve actual findings. Include the separately found console
  source-reveal revision race fix and its tests in integration checks.
- [x] Run required contracts/full JS/Rust, release build, relevant browser and
  fresh private desktop wrapper. Recheck only affected failures after fixes.
- [x] Inspect one combined bubble capture; preserve the completed visual world.
  Record exact evidence, local timing/placement limits and remaining help-shell
  work in `.impeccable/review/max-fidelity-20261021/print-popup.md`.

Final evidence: full JS294 passed; browser75 passed; contracts and native
header/linked/threaded/regression checks passed. Release Rust100 passed with
1 existing ignored test (`/tmp/ultra-print-rust-release-final.log`). A stale
generated release-deps native library was refreshed to the verified build
before that passing release run; the audit is retained in `/tmp`.

The initial combined visual capture exposed stacking and short-label wrapping.
One CSS batch corrected both; the confirmation release build passed
(`/tmp/ultra-print-build-confirm.log`). The fresh full private desktop wrapper
`/tmp/ultra-print-popup-desktop-confirm/` exits0 with startup, canvas and
documents results passed. Its cleanup report finds zero marked processes
across all six Print runs. Root inspected exactly one confirmation
`native-print-popup.png`, confirming both bubbles above neighbors and `bang`
on one line. No additional Print polish is planned.

The earlier final-3 signal7 cause remains unconfirmed; final physical document
opens pass with diagnostic-only harness changes. This does not qualify exact
Max timing/placement or any complete installed help root; whole-help remains
0/2,103. The separate help-shell plan owns the remaining adapter/view work.
