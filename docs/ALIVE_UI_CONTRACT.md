# Alive UI Layout Contract

**Product reference:** Ableton Live's spatial and workflow conventions, not its
proprietary assets or a pixel clone. This contract applies to **Alive**, not
Ultra's Max-style patch editor. Read `docs/ALIVE_UI_HANDOFF.md` for ownership,
the session runtime invariants and retained Live/Alive screenshots.

## Region ownership

| Region | Always owns | May contain | Must not contain |
| --- | --- | --- | --- |
| Document header | Project name, dirty state, compact File menu, Save | File-level actions inside File menu | Transport, track controls, debug output, free-standing New/Open/Quit actions |
| Global top transport | Tempo, time signature, beat position, start/stop/loop, quantization, view switch | Compact options disclosure | Feature-specific creation buttons |
| Left browser | Search, catalog, browser selection and device drag | One Add track/device disclosure | Persistent rows of Add/Open buttons, clip editing or diagnostics |
| Central Session / Arrangement | Tracks, slots/scenes or timeline, compact mixer and master | Inline track context controls on selection | Project-level actions, text-heavy configuration forms |
| Bottom detail | Selected clip or device, resizer and maximization | Track/device editors and contextual inspectors | Duplicate global transport and project controls |
| **Bottom-left Info** | **Contextual explanation of hovered/focused control** | Brief region hint when no control targeted | Status, diagnostics, mixer, file buttons |
| Status footer | Native receipts, playback authority, audio status and settings | Secondary diagnostics disclosure | Browser navigation and musical edit toolbars |

The bottom-left Info View is always present, even when the browser or detail is
hidden. Tooltip/help data may be set via `data-help` on an element; title and
accessible name are fallbacks. It is observational only and must never trigger
a native command or change selection, accepted music, focused drafts or playback.

## Admission rules for new controls

1. **Name the owner region before adding a button.** If it belongs to a track,
   clip, device or project, place it inside that owner. Do not add new toolbar
   strips to accommodate a feature.
2. **Keep primary vs secondary actions distinct.** Frequently used transport,
   selection and editing controls are direct. File management, track creation
   and diagnostics belong to disclosures/menus/shortcuts where possible.
3. **Retain the real action ID and semantics.** Collapsing a command into a
   disclosure cannot remove it, silently change its shortcut or introduce
   playback-authority changes. Don't replace unsupported actions with mock
   controls.
4. **One shared design language.** Small flat controls, consistent focus rings,
   stable mixer alignment, thin borders and existing restrained color tokens.
   Avoid ornamental animation and ad hoc CSS overrides.
5. **No text explanation embedded in the work surface.** Describe controls via
   Info, accessible names and short hints; reserve verbose technical notes
   for disclosure panels.
6. **Do not modify shared Ultra styling casually.** Alive owns
   `alive-ui-contract.css`, loaded after the existing Alive CSS. Shared
   device-presentation components remain governed by their own contracts.
7. **Treat screenshots as acceptance evidence, not implementation proof.**
   UI screenshots do not certify audio timing or DSP ownership.

## Current implementation

- `apps/ultra/ui/alive.html`: the shell regions and existing action IDs.
- `apps/ultra/ui/alive-ui-contract.css`: compact File and Add menus; visible
  Info region anchored to the footer's left edge.
- `apps/ultra/ui/alive-info.mjs`: event-delegated passive descriptions,
  outside-click and Escape dismissal. No audio/session imports.
- `apps/ultra/ui/alive-info.test.mjs`: Info priority and menu semantics.
- `apps/ultra/tests/ci/alive-chain.spec.mjs`: responsive region, disclosure and
  non-mutation assertions at 800×600 and 1280×800.

## Next review gates

Capture populated Session and Arrangement at **1440×900, 1280×800 and 800×600**.
Compare with the retained Live evidence in
`experiments/alive-session-ui-reference-20261026/` and
`experiments/alive-workflow-reference-20261024/`.

Before accepting a future change, verify: Info stays bottom-left during browser
hide and view switching; global transport remains visible; menus do not change
musical state; all secondary actions remain keyboard accessible; track/device
selection, drafts, clip launching and device scrolling remain intact. Run
`node --test apps/ultra/ui/*.test.mjs apps/ultra/ui/components/*.test.mjs` and
the existing Chromium acceptance suite when the environment is available.

## Deliberately unaddressed

This phase does not rewrite Session/Arrangement rendering, native audio/DSP,
the full mixer CSS cascade or the device card renderer. More ambitious reshaping
requires a separate reviewed visual comparison using the existing Live captures.
The historical native Arrangement Return-gap and Master automation ownership
issues remain independent of this interface pass.
