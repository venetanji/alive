# Max Comment UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve and render multiline comments and original Max-like callouts.

**Architecture:** Extend the existing comment-only authoring style schema, retain
the existing text interaction target, and render bounded callout geometry after
appearance layout. Native executable graphs remain unchanged by appearance.

**Tech Stack:** ES modules, CSS/original SVG, Rust/serde, Node, Playwright and the
existing private Tauri/WebKitGTK desktop harness.

**Spec:** `docs/superpowers/specs/2026-10-22-max-comment-ui-design.md`

## Global Constraints

- Preserve the dirty checkout, user documents and installed Max preferences.
- Do not commit, revert, or redistribute proprietary code, help prose or assets.
- bubble integer 0..1; bubbleside integer 0..3; bubblepoint finite 0..1; comment-only.
- Common width12..1200, height12..800, font size8..48 and RGBA bounds remain.
- Keep all unsupported diagnostics explicit; no complete help qualification.
- Private runtime sessions only; screenshots in /tmp; clean marked processes.
- One batched comment visual inspection, at most one confirmation.

## Task 1: Establish Comment Oracle

- [x] Record reference metadata and targeted saved-value facts.
- [x] Observe original synthetic multiline/callout comments in disposable Max.
- [x] Record exact geometry, linecount and font behavior with coverage limits.

## Task 2: Authoring Schema And Import

Owner: comment_schema_scout. Files: canvas-appearance.mjs, appearance corpus/tests,
canvas-max-import.mjs/import tests, Rust validate_style/tests, PATCH_PROTOCOL.

- [x] Add meaningful failing shared JS/Rust schema and import regressions.
- [x] Implement strict comment style fields, preserving executable descriptors.
- [x] Preserve flat comments and supported inherited comment font size.
- [x] Resolve linecount metadata only as supported by the oracle evidence.
- [x] Run focused suites and report red/green evidence.

## Task 3: Renderer And Inspector Integration

Owner: comment_renderer. Files: canvas-comment-ui.mjs if needed, canvas-node.mjs,
canvas-appearance-view.mjs, canvas.css, renderer/browser tests.

- [x] Demonstrate multiline clipping with an original browser regression.
- [x] Implement multiline text in saved bounds and observed callout geometry.
- [x] Cover safe literal text, all sides, points, fonts, reset and interaction.
- [x] Run focused suites; preserve existing control/header behavior.

## Task 4: Review And Shipped Verification

Owner: root, with a fresh scoped review and native verification delegation.

- [x] Independently review schema/import and rendering changes against spec.
- [x] Run full JS/contracts/browser checks and Rust schema/native tests.
- [x] Build release and verify original fixture on private native WebKitGTK.
- [x] Inspect one batch at shipped desktop sizes; no visual correction required.
- [x] No confirmation needed; record cleanup and update DESIGN/report/plan.

## Decisions

- Ruling: continue in the existing checkout. The accumulated implementation is
  uncommitted and required by this phase; a clean worktree would omit it.
- Ruling: use standing full permission for ordinary reversible implementation;
  no approval checkpoint or commit is required.
- Ruling: keep named-style/font warnings. A locally empty named style alone is
  insufficient provenance to establish general Max style resolution.
- Ruling: saved linecount changes Max loader fitting, so retain its diagnostic
  while preserving the authored rectangle in this bounded renderer.
- Ruling: retain the original textarea source on an unchanged comment commit;
  DOM newline normalization must not rewrite authored CRLF/CR bytes.
- Ruling: a tight 54px browser fixture checks visible glyph containment, rather
  than requiring the full nominal padding below a font line box. Measured text
  fits inside saved geometry; Max's fitted 55px result remains a documented gap.

## Completion Evidence

Full JS 336, full browser 88, release Rust 108 / 2 ignored and required contracts pass.
The affected tightened 54px browser case passes separately. Release build and
new private native comment suite exit 0. Runtime r1/value 77, Save/export and
cleanup pass. Root inspected one desktop/compact batch; no confirmation or
Print/help re-polish. Details: `.impeccable/review/max-fidelity-20261021/comment-ui.md`.
The larger all-objects/help goal remains active and whole-root qualification 0.
