# Panel Corrections Plan

Goal: match the user's November 2 layout clarification and private Live captures
without changing native contracts or rebuilding the approved shell.

The upper row contains Browser beside Session/Arrangement. The lower area owns
Help and the editors. Help has an independent fixed width. Both editors open
means full-width Clip above a fixed Help/Devices row. Existing nodes, drafts,
selection identity, native acknowledgements and unavailable states survive.

## Bounded Work

- [x] Add failing browser regressions for independent row geometry, Browser
  collapse/reopen/cancel, contextual Help without tooltips, Clip fill/reflow,
  expanded Clip with a remaining track area, and dB/stereo presentation.
- [x] Fix sizing in `alive-workspace.mjs`, `alive-shell.css` and
  `alive-ui-contract.css`. Use a separate Help width, a larger fixed Device row,
  and preserve Browser requested width across collapse and cancellation.
- [x] Fix Clip fill and expose automatic/horizontal/vertical presentation using
  existing property nodes in `alive-clip-view.mjs` and `alive-piano.css`.
  Keep auxiliary inspectors accessible without full-width empty bands.
- [x] Route Alive descriptions into contextual Help, including dynamic titles,
  while preserving the shared Ultra default. Use original SVG action icons with
  accessible names. Show dB and distinct L/R lanes from existing native values.
- [x] Run adjacent tests, then all relevant browser/Node/helper tests. Inspect
  actual 800x600, 1280x800 and 1440x900 renders, including rejected changes,
  drafts, keyboard focus, repeated toggles and resize/restore.
- [x] Build both applications and select the matching launcher pair. Verify
  artifact hashes and software-native UI. Report exact sources, captures and
  all failed, skipped or unrun acceptance gates.

## Evidence Limits

The shipped Live executable contains separate Info and detail layout ownership,
explicit automatic/horizontal/vertical Clip layout commands and independent
Clip/Device state. Static code supports a fixed 231-unit Help width, 190-unit
Device height and 224-unit Clip minimum; exact virtual-bound semantics and
display scaling remain inferred. Browser collapse thresholds, automatic Clip
orientation thresholds and fader taper are unverified. Alive's 180-unit Browser
collapse, 360-unit automatic orientation and compact stacked Clip fallback are
its own presentation rules. See `LIVE-UI-CODE-EVIDENCE.md` for evidence limits.
No engine work, physical audio changes, new recording/routing, automatic CI or
publication.
