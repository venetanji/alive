# Numeric UI Fidelity

The numeric dependency phase is complete. The native desktop capture retains
the compact Max-inspired object faces, cables, console and editor chrome from
the completed Impeccable refinement. No new visual redesign was introduced.

## Changes

- Added `number_int` (native kind 52), authored as `number` or `number.int`,
  with one inlet, two outlets, signed truncation and integral bounds.
- Preserved saved legacy `number` (kind 2), its fractional values and original
  port contract. Its explicit authoring spelling is `number.legacy`.
- Implemented physical Tab as a separate queued action for integer and float
  boxes. Incoming selector `tab` remains silent. Existing edit, revision,
  document-close and shared callback admission rules apply.
- Added typed hot `send name` to `int` and `float`, through the shared global
  bus without firing the storage object's normal outlet.
- Updated Max import, authoring shortcuts, live silent observations, examples,
  protocol documentation and CI coverage.

## Review And Verification

Independent read-only review by `native_views_review` found no substantive
defect or contradiction with the retained Max oracle. It checked schema/ABI
boundaries, legacy preservation, truncation, bounds, list repetition, physical
Tab ordering/admission, shared budget and typed sends. The reviewer did not
rerun the tests; the integration evidence is recorded here separately.

- JavaScript: 272 passed; `/tmp/ultra-numeric-ui-js-final.log`.
- Rust release: 90 passed, one existing private-audio test ignored;
  `/tmp/ultra-numeric-ui-rust.log`, exit 0.
- Required contracts, retained reference comparisons and header numeric test:
  `/tmp/ultra-numeric-ui-contracts.log`, exit 0.
- Linked native backend action/admission test:
  `/tmp/ultra-numeric-ui-backend.log`, exit 0.
- Release build: `/tmp/ultra-numeric-ui-build.log`, exit 0.
- Browser controls: 29 passed. Full suite: 71 passed, two stale palette-count
  assertions failed; both assertions were updated from 54 to 55 and both
  affected tests passed on rerun. Logs: `/tmp/ultra-numeric-ui-browser-controls.log`,
  `/tmp/ultra-numeric-ui-browser.log`, `/tmp/ultra-numeric-ui-browser-rerun.log`.
- Actual Tauri/WebKit desktop wrapper with isolated software audio: exit 0;
  `/tmp/ultra-numeric-ui-desktop-verified.log`. Canvas, document and startup
  result JSON files all report `passed`.
- `git diff --check`: passed.

The native capture at
`/tmp/ultra-numeric-ui-desktop-verified/native-numeric-ui.png` was inspected.
It shows integer direct entry `-4` and a physical-Tab console bang. The runner
also checks incoming `-3.9` becomes `-3`, direct keyboard entry `-4.9` becomes
`-4`, both physical Tab outlets work, and an incoming `tab` selector stays
silent. The wider wrapper verifies native file dialogs, startup forwarding,
independent help/child windows, cross-document typed messages, shared DSP,
list and MSP objects, and hierarchy lifecycle without resetting runtime state.

## Limits

Complete installed-help qualification remains **0/2,103**. The slider Basic
fragment imports 15 nodes and nine edges and executes only that supported
fragment; it is not a complete-help pass. Numeric behavior is qualified against
the finite original oracle in
`experiments/max-reference/message-ui-runtime-20261022/`.

Fractional `number_int` min/max messages remain unqualified and are refused by
literal import. The native implementation leaves them unchanged. ABI struct
sizes and existing capacity limits remain unchanged.

Next dependencies for the four candidate help roots are mutable Message
storage/display and atomic authored text edits, `print @popup 1`, explicit
licensed helper/reference adapters, and correct help-tab metadata/selection.
The installed `?` help affordance is a Reference/Related Objects popover over
Basic, not an empty canvas view.
