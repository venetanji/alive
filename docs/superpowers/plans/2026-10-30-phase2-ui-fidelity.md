# Phase 2 UI Fidelity And Resizing

**Goal:** Complete the approved top bar, browser, and piano-roll fidelity pass, including resizing an open session.

**Architecture:** Retain Rust/Tauri, native musical ownership, the existing command queue, and the compact Live-inspired visual language. Presentation changes never prepare music or start playback. Native device loading continues through existing validated commands.

**Spec:** `docs/superpowers/specs/2026-10-28-phase2-live-max-design.md`, sections 7 and 11, plus the owner's 2026-10-30 approval and explicit resizing requirement.

## Constraints

- Preserve accepted native timing, Master, source identity, pending history, and file safety.
- Use original SVG/CSS controls, Liberation Sans, charcoal surfaces, and restrained amber/blue accents.
- Browser selection is independent of loading and playback. Index only real bundled devices and current project sources.
- Piano pitch rows are at least 10px by default. Time and pitch navigation change the viewport, never the score.
- Keep Stop and Master reachable; constrain scrolling to regions rather than overflowing the application.
- Keep the current Tauri stack. Apply compatible Omarchy conventions; a Qt migration is outside this pass.
- Preserve the existing Phase 2 qualification checkpoint. This UI branch does not claim to complete native endurance or audio qualification.

## 1. Responsive Shell And Musical Top Bar

Files: `alive.html`, `alive.css`, `alive-workspace.mjs`, `alive.mjs`, browser tests.

- [x] Add rendered regression coverage for desktop and compact windows, live resize, visible Stop/Master, and presentation-only navigation.
- [x] Group musical controls into one compact toolbar, retain secondary file actions, show bar/beat position, and move raw seek/length controls into a disclosure.
- [x] Clamp browser/detail dimensions to available space and provide useful compact-window layouts without changing music.
- [x] Stabilize the Audio details disclosure geometry and constrain diagnostics to a scrolling panel.
- [x] Run affected DOM and rendered tests and inspect captures at 1440x900, 1280x800, 1024x768, and 800x600.

## 2. Piano Editor

Files: `alive-piano.mjs`, `alive-piano-view.mjs`, `alive-piano.css`, `alive.mjs`, piano tests.

- [x] Add failing tests for readable rows, independent pitch/time navigation, hit transforms after resize, and fit-to-notes.
- [x] Implement a keyboard gutter, musical ruler, bounded pan/zoom/fit, note bodies and a velocity lane using explicit viewport geometry.
- [x] Keep original note identity, frozen gesture geometry, cancellation, numeric fallback, and one native history transaction per completed edit.
- [x] Run existing note/history tests and rendered interaction coverage.

## 3. Searchable Device And Project Browser

Files: new browser module/styles/tests, `alive.html`, `alive.mjs`, native desktop catalog resolver if required.

- [x] Add failing tests for search, empty results, selection without mutation, and explicit type-aware loading.
- [x] Expose real bundled instrument/effect entries and current project MIDI sources with narrow categories and keyboard navigation.
- [x] Load devices through existing stopped/generation/capacity-validated commands, keep file pickers as fallback, and report failures visibly.
- [x] Run affected native/catalog and browser tests; inspect empty, selected, unavailable and compact states.

## 4. Integration And Handoff

- [x] Run the relevant Node suite and full Alive browser suite; check source diff and run the Impeccable detector once.
- [x] Obtain independent review of the final UI diff and resolve concrete findings.
- [x] Retain original Alive captures and document exact tests, worktree, limitations, and how to run the changed UI.

## Decisions

- The owner's new UI priority authorizes this isolated fidelity pass while Q1 remains open on the baseline branch.
- Omarchy integration means compatible desktop conventions here. The current GTK application ID already supplies launcher/window identity; changing to Qt would require a separate frontend migration.

## Verification And Remaining Qualification

Evidence, commands and captures are in `experiments/phase2-ui-20261030/README.md`.
159 Node checks, 64 Chromium checks, 291 Rust library checks (4 ignored), final
5 catalog checks and the independent native UI resize/catalog run pass.
The extended native Arrangement journey remains failed at its unchanged brief
Return-gap observation; final restart coverage and Q1 qualification stay open.
This result is recorded separately from the passing UI checks.
