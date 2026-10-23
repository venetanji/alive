# Embedded Patcher Follow-Through

Historical phase report: the subsequent `native-views.md` records independent
native child windows and supersedes the native-window limitation below.

The existing Impeccable Max fidelity review remains the visual baseline. This
phase adds executable embedded patchers and a compact path bar; it does not
restart context loading, the detector, or the completed visual polish loop.

## Review Findings Resolved

- Saving from a child view originally supplied only the visible scope to the
  document session. Save and dirty tracking now receive the complete root tree.
- Default voice allocation originally searched the visible scope. It now finds
  devices across the owner tree.
- Explicit invalid styles on virtual nodes originally bypassed validation.
  They now follow the same strict validation as executable nodes.
- Loading changed numeric values with unchanged topology could leave native
  state stale. Load explicitly installs its replacement. Object text numeric
  argument changes also compare the complete executable parameters.
- Near-limit readable JSON exports could exceed the parser's raw-file cap.
  File parsing now admits 8 MiB before applying the existing compact 64 KiB
  v1 / 1 MiB v2 schema limits, matching native file ingestion.
- Console source links originally tested only visible nodes. They now resolve
  the complete tree, reveal the owning child view and ignore stale records.

Each finding has a regression verified failing before its fix. Independent
workers reviewed native routing, Rust lowering, the JS model and recursive
import. No unresolved material issue was reported in those bounded reviews.

## Visual And Behavior Evidence

One batched inspection covers the new path bar, annotation and connector view
at 1600x1400 and the native compact size 760x640. Captures are retained at
`/tmp/ultra-hierarchy-review/hierarchy-desktop.png` and
`/tmp/ultra-hierarchy-review/hierarchy-compact.png`. The established typography,
object faces, canvas and chrome remain intact. This is an editor view within
one root; it is not represented as an independent native child window.

New browser regressions exercise double-click/keyboard entry, navigation while
locked, complete-tree Save from a child, dirty tracking and owner-wide undo.
Native desktop regression exercises real Tauri/WebKit, Rust preparation,
message dispatch, CPAL capture, preserved revision/state and actual OS file
save/reopen. Recorded peaks before navigation and inside both children are
identical: left 0.0625, right 0.05624999850988388.
The final console-inclusive native suite exits 0; its record is
`/tmp/ultra-hierarchy-documents-console-final/documents-result.json`.
All 230 JavaScript checks pass; Rust reports 71 passing and one ignored private
audio check. Required contracts, optimized/sanitized native routing, release
build and the 72 browser cases (including the two corrected count reruns) pass.

The original Max evidence bundle records 42 hierarchy message rows, 468 boundary
rows and 2112 float32 samples without proprietary source bodies. Native boundary
tests match those sample values; schema/native limits remain explicit.

## Limits

Native child views, full Max help JavaScript/UI helpers and initialization,
external abstractions and expanded execution capacity remain separate work.
Whole-help conformance remains 0/2103. The four inspected installed whole roots
are partial data imports and are never scored as complete execution.
