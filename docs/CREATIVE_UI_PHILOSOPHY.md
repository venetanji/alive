# Creative apps: shared UI philosophy

Alive and Ultra are built together, not clones of Live and Max. Preserve the
**task-specific hierarchy** of each workspace while unifying visual language,
interaction grammar, Help, settings presentation and evidence standards.

## Same system, different workspaces

| Responsibility | Alive | Ultra |
| --- | --- | --- |
| Primary surface | Session/Arrangement (tracks, clips, mixer) | Patch canvas (objects, cables, edit/lock mode) |
| Top-level working controls | Transport and view mode | Patch tools, Edit/Lock, zoom and undo |
| Secondary navigation | Left device/clip browser | File menu, object palette, Inspector |
| Contextual work | Resizable Clip/Device detail below | Inspector to the side, Console below |
| **Help/Info** | **Bottom-left Info rail; Clip/Device hints** | **Lower-left Info rail alongside existing port/wiring assistance; patch Help and examples** |
| Audio settings | Audio settings entry in footer | Audio settings entry in footer |
| Status | Native receipts and playback authority | Patch/wiring assistance, audio state and native notices |

Do **not** move Ultra's editing toolbar or side Inspector into Alive's regions.
Do **not** transpose Alive's timeline, clip slots or mixer into patcher columns.
The hierarchy is intentionally different because the work is different.

## Common, enforceable language

- **Colors:** charcoal chrome, raised surfaces, neutral canvas, light text,
  amber (objects/primary accent) and blue focus/selection; shared semantic
  tokens rather than decorative per-app palettes.
- **Typography and density:** 12px Liberation Sans workhorse text, 11px labels,
  27px compact controls, two-pixel corners and restrained spacing.
- **Menus and disclosure:** use the same bordered, dark surface and hover/focus
  treatment. A control stays in its owning region; secondary actions belong in
  menus or contextual panels rather than new permanent toolbar rows.
- **Help:** one passive implementation (`creative-info.mjs`) for hover and
  keyboard-focus hints. An app provides region descriptions but must not
  overwrite its native status channel, dispatch commands or steal focus.
  More substantial help remains accessible using existing app-specific tools.
- **Settings:** the same form rhythm, selector style and status language
  (`ui-settings-surface`). Both retain their own native audio-device state and
  lifecycle; visual consistency does not mean silently sharing persisted
  preferences or starting/stopping the other app's audio.
- **Accessibility:** real button/summary controls, labels, explicit focus
  outlines, complete keyboard access, Escape dismissals and bounded scrolling.
- **Evidence:** compare populated 1440×900, 1280×800 and 800×600 app states.
  Do not infer native-audio correctness from browser screenshots.

## Source ownership

- `creative-shell.css`: shared styles/tokens for both apps.
- `creative-info.mjs`: shared passive contextual Help behavior.
- `alive-ui-contract.css`, `alive-info.mjs`: Alive-only placement and menu
  ownership; inherited from the Alive UI baseline.
- `canvas-ui-contract.css`, `canvas-info.mjs`: Ultra-only placement and
  Max-style patcher region explanations.
- `docs/ALIVE_UI_CONTRACT.md`: Alive's detailed shell contract.
- `DESIGN.md`: Ultra's detailed Max-inspired editor interaction rules.

New UI controls need (1) an owner region, (2) a shared style primitive unless a
task-specific exception is justified, (3) accessible help and keyboard behavior,
and (4) a screenshot/interaction acceptance path. Do not solve a layout problem
with another unrelated button or CSS override.

## Scope of this integration pass

The patcher still uses its original toolbar/Inspector/Console organization.
Ultra's Help actions moved to the lower-left Info rail, retaining their
existing DOM IDs and behavior. The separate port/wiring assistance and audio
engine status remain intact. Both applications share Info discovery, menu
presentation, form styling and semantic design tokens.

This is a **UI-only** pass. It neither unifies engine settings/storage nor
changes document adoption, patch authoring, musical playback, DSP or device
instances. Cross-app preference synchronization, settings schema alignment and
larger structural redesigns require separate explicit specifications and tests.
