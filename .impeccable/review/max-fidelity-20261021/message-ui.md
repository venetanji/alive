# Message UI Fidelity

This phase adds the mutable Message dependency of the append/prepend/int/float
whole-help batch. Complete installed-help qualification remains 0/2,103.
The completed compact Max-inspired Impeccable visual world is preserved.

## Changes

- Appended native MessageBox=53, saved `message_box`: two inlets, one outlet,
  empty text, cold replacement, silent hot set and bounded typed substitution.
- Preserved saved legacy Message=1 with its literal-only single inlet. Its
  explicit authoring spelling is `message.legacy`; M, message and msg now
  create the compatible kind, empty by default.
- Separated canonical authored text, live displayed template and remembered
  substitution arguments. Hot substitution leaves literal placeholders visible.
  Runtime cold/set updates neither dirty the file nor enter authoring history.
- Added queued atomic text replacement, explicit same-text restoration,
  single-text undo/redo, and non-consuming typed display snapshots shared by
  root/child views. One text edit does not reinstall the graph.
- Imported supported empty/template messages and cold-inlet cables. Added an
  original example and regenerated the 113-entry original help/example library.

## Review

Independent native/Rust review found no substantive issue in atomic-word
publication, callback FIFO/admission, typed state, serial/CAS/history handling,
same-text restoration or existing ABI preservation.

Independent UI review found three defects, all fixed and confirmed:

1. Standalone coalescing text edits could overtake an intervening trigger.
   Text now shares the event FIFO, with an explicit interleaving regression.
2. Rejected standalone text admission could alter saved text/history. Text
   edits and single-text history now commit only after admission. Other
   standalone authoring waits for pending text admission; shared views retain
   their existing CAS queue. Lifecycle tests cover queued cancellation and
   already-admitted edits across Stop and replacement.
3. Legacy string validation rejected supported replacement placeholders.
   Target-aware cold/set validation now accepts them for MessageBox, including
   surrounding whitespace, while preserving ordinary/legacy refusal.

The reviewer confirmed no remaining finding after the focused fixes, and
independently exercised Stop/dispose/replacement promise handling with stubs.

## Verification

- JavaScript: 281 passed, `/tmp/ultra-message-ui-js-final.log`.
- Rust release: 95 passed, one existing private-audio ignored;
  `/tmp/ultra-message-rust-final.log`.
- Native header oracle replay: `/tmp/ultra-message-native-header.log`.
- Linked backend: `/tmp/ultra-message-native-linked.log`; includes 1,000
  replacements with concurrent snapshot readers, FIFO edits and rejection
  paths, unrelated counter preservation and stop-drain handling.
- Required contracts with pinned Python requirements: exit 0,
  `/tmp/ultra-message-ui-contracts-final.log`; includes all 281 JS tests and
  the retained reference comparisons, schemas and native header tests.
- Release build: exit 0, `/tmp/ultra-message-ui-build-final.log`.
- Browser: 74 passed, `/tmp/ultra-message-ui-browser-final.log`; includes M,
  empty/two-inlet Message faces, template editing/refusal, undo/redo and lock
  behavior using the real page.
- `git diff --check`: passed after integration.

Native desktop verification passed on the final release build:

- Build: exit 0, `/tmp/ultra-message-ui-build-describedby.log`.
- Full wrapper: exit 0, `/tmp/ultra-message-ui-desktop-describedby.log`.
  `result.json`, `documents-result.json` and `startup-result.json` in
  `/tmp/ultra-message-ui-desktop-describedby/` all report `status: passed`.
- The real Message face follows cold scalar/list/bang and silent set changes;
  bare set clears and suppresses output. Physical inline same-text restoration,
  changed text and Undo preserve native revision 12 and an unrelated integer77.
  Substitution emits `edited 8 9` while the face keeps its literal template.
- Root and child views independently read the live `5 pear 2.25` face; closing
  and reopening a child preserves it, the saved template and native revision1.
  Shared audio, native file dialogs/forwarding, help windows, history and owner
  lifecycle checks also pass. The cleanup record reports zero owned processes.
- Inspected the retained combined `native-shared-message-ui.png` once. The
  compact Max-inspired controls, ports and canvas remain intact. The standalone
  scenario is retained as `native-message-ui.png` in the same directory.

Desktop testing exposed a real accessibility omission: the stable trigger
label hid the live face from AT-SPI, and this WebKit ignores `aria-description`.
An isolated native probe established that hidden text referenced through
`aria-describedby` exposes both initial and changing text. Message faces now
use that relation, including an explicit `Empty message` description. The
description/relation browser regression failed before the fix and passes after;
46 affected JS tests also pass. Logs are
`/tmp/ultra-message-ui-describedby-browser-red.log`,
`/tmp/ultra-message-ui-describedby-browser.log` and
`/tmp/ultra-message-ui-describedby-js.log`. Earlier incomplete desktop wrappers
are diagnostic evidence only, not passing verification.

## Finite Limits

Evidence comes from the original direct-injection oracle in
`experiments/max-reference/message-ui-runtime-20261022/`, not proprietary
help/script bodies in distributed fixtures. Only standalone $1/$2 payload
references under a fixed selector or numeric first atom are qualified here.
Head placeholders, symbol-placeholder coercion, other dollar syntax, quotes,
escaping, comma/semicolon commands and patcher-instance expansion are refused.

Authored text is bounded to 127 ASCII bytes; typed runtime displays can reach
287 bytes under the eight-atom/31-byte-symbol profile. Hot append/prepend/
setargs, cold set and zero-atom cold list remain unqualified. Clearing and
authored replacement reset remembered arguments as an explicit local policy;
the corresponding Max transitions have not been established.

The four complete-help candidates still require print popup, explicit helper
and licensed reference adapters, saved help-tab metadata and correct hosted
tab/Reference popover behavior. The installed slider Basic fragment now keeps
16 nodes and ten cables; that is still a partial import, not whole-help
execution.
