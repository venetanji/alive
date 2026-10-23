# Embedded Patcher Implementation Plan

> For agentic workers: use subagent-driven-development for independent native,
> Rust and reference work; the root integrates the JS document/editor flow.

**Goal:** Execute supported nested control/signal patchers in one root runtime
and edit their saved tree without resetting execution during navigation.

**Architecture:** Strict v2 authoring trees lower through explicit mixed-domain
boundary relays into the existing bounded native graph. One owner editor
projects the current patcher while saving and executing the complete tree.

**Tech Stack:** JavaScript modules, Rust/Tauri, C++ native graph, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-21-max-hierarchy-design.md`

## Global Constraints

- Preserve dirty worktree; no commits, resets or proprietary Max body copies.
- v2: 1 MiB / 512 nodes / 1024 cables / 16 embedded levels.
- Native ABI capacities remain 32 nodes / 64 cables; old kind IDs are stable.
- Child navigation has no runtime install, Stop, or initialization side effects.
- Complete-file help conformance remains independently measured at 0/2103.

### Task 1: Native Mixed Relays

Files: `native/patch_graph.h`, `native/patch_graph.hpp`, focused native tests.
Produces kinds50/51 and inferred per-edge control/active-mono routing.

- [x] Add failing control/audio coexistence, fallback, nested sum and cycle tests.
- [x] Keep structs unchanged; add relay port semantics, domain propagation,
  control fanout and once-per-sample signal sum.
- [x] Run optimized and sanitizer native tests, review callback allocations.

### Task 2: Independent Rust Tree Admission

Files: `src/canvas_hierarchy.rs`, `src/canvas.rs`, `src/canvas_tests.rs`.
Consumes the exact v2 schema; produces the existing `Prepared` native graph.

- [x] Add failing tests for geometry order, nested edges, strict global IDs,
  scope errors and bounds before implementing.
- [x] Recursively validate authoring, omit virtual nodes, lower boundary wires,
  and validate mixed-domain execution independently of frontend code.
- [x] Keep v1 limits/strictness; run the Rust release suite.

### Task 3: JS Document And Owner View

Files: new `canvas-hierarchy.mjs` and tests; `canvas-model.mjs`, catalog,
appearance, node renderer, `canvas.mjs`, `canvas.html`, `canvas.css`.
Produces `getState().document` as the complete tree, `.patch` as the visible
patcher, and navigation methods with no native calls.

- [x] Add failing tree validation/lowering, history, connector remap and
  controller-navigation tests.
- [x] Implement standalone bounded hierarchy helpers without a second runtime.
- [x] Route edits to the visible scope, history to the root, and apply/save to
  the root; preserve stable IDs and remap parent cables by boundary identity.
- [x] Add compact breadcrumb and double-click navigation; preserve the pinned
  Max visual language and existing flat-document behavior.
- [x] Run JS and focused browser regressions.

### Task 4: Import And Evidence

Files: importer and tests; one original authored nested example; protocol/docs.

- [x] Import supported embedded graphs and comments through an explicit tree
  conversion while retaining honest unsupported-helper diagnostics.
- [x] Verify native/Rust/JS lowering parity, full serialization and original
  reference provenance; review independent findings and fix material issues.
- [x] Build release and run required contracts plus relevant browser/desktop
  checks. Record results and remaining child-window/help-init work.

## Execution Notes

User's existing full autonomous permission covers implementation and parallel
agents. Native, Rust and root edits have separate ownership. No new approval
or commit ceremony is introduced. The existing Impeccable bounded visual pass
is reused; this phase does not restart its detector/polish cycle.

## Final Verification

- 230 JavaScript checks pass: `/tmp/ultra-hierarchy-js-all.log`.
- Browser suite: 70 pass; two old palette-count expectations were updated from
  50 to 54 and both corrected cases pass their focused rerun. Together these
  cover all 72 cases, including two new hierarchy flows. Logs:
  `/tmp/ultra-hierarchy-browser-all.log` and
  `/tmp/ultra-hierarchy-browser-counts-fixed.log`.
- Rust release: 71 pass, one private audio test ignored:
  `/tmp/ultra-hierarchy-rust-final.log`.
- Required contracts pass, including native hierarchy, existing signal/list/
  workspace suites, source/replay contracts and ABI-related checks:
  `/tmp/ultra-hierarchy-contracts.log`. The new portable hierarchy bundle and
  summary verification commands were then added to that script and rerun
  individually successfully; installed-source inventory also passes locally.
- Native hierarchy optimized and ASan/UBSan runs pass independently. All 2112
  retained boundary sample values match the original Max probe.
- Final release build: `/tmp/ultra-hierarchy-build-console.log`.
- Final actual native desktop suite exits 0:
  `/tmp/ultra-hierarchy-documents-console-final/documents-result.json` and
  `startup-result.json`; log:
  `/tmp/ultra-hierarchy-documents-console-final.log`.
  It verifies real OS opening/save/close, existing root-window/shared audio
  behavior, all list/MSP cases and the new nested control/signal tree. Child
  navigation and console reveal preserve number19, native r1 and identical
  stereo peaks `[0.0625, 0.05624999850988388]`; Save from a child and reopen
  preserve the complete root tree.
- Final binary SHA256:
  `f501563c2678cbe188dc1c88781f38f5a7a3535521724a866789ef5da45c998b`.
  Both build and release native libraries:
  `c80bb04f505708843b33d0903be33c9360818bd540e7a332b621a6cddb151be7`.
- `git diff --check` passes. No commit, push, original Max preference change,
  proprietary help-body copy or unrelated-worktree revert was performed.

## Remaining Goal Work

This phase is complete, but the all-objects/all-help goal remains active.
Independent native child views must attach to canonical owner documents without
duplicating audio or history. Creation-time initialization, external abstraction
arguments/scoping, full help tabs/helpers and larger execution plans remain
required. Complete installed-help conformance remains 0/2103.
