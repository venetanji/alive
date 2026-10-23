# Arithmetic Reference Correction Review

2026-10-22. Scoped independent re-review of the prior P1 and new breakage
within the frozen fix delta. Review-package SHA-256:
`de0a52e82826b7f8ee9ed4e324917415179dc1043dad43883641de7b4f2ebafe`.
Both production/test file hashes in that package match the current files.
No tests were rerun and no product files were edited by this reviewer.

## Findings And P1 Disposition

**P1 ADDRESSED.** `apps/ultra/ui/canvas-help-view.mjs:1` now adds exactly
times/plus/minus to the existing finite safe-page catalog. That shared set
governs response validation at line 7, related-link availability at line 46
and opening Reference at line 85. Each arithmetic response can therefore
reach the existing plain-text renderer and its Reference pane can open.
The symbolic classes, path aliases and unknown names remain outside the
catalog. No other production branch changes in this fix package.

No new actionable breakage was identified in the reviewed delta. The earlier
integrated review remains historical and unchanged at SHA-256
`e46ac5d25ef1c13174e8257ccb2d6510d9d7c01ef58b676aaa14bc68bb3ae387`.

## Specification Verdict

**PASS for the reviewed admission implementation.** The finite frontend
Reference gate now agrees with the previously reviewed safe IDs and fixed
backend tuples. This closes the sole prior specification blocker while
preserving legacy pages, response identity checks, bounded fields/lists,
plain-text rendering and refusal of symbolic public requests. The original
source/helper binding, hierarchy, isolation and diagnostic requirements are
unchanged by this wave.

## Quality Verdict

**PASS.** The one-line production correction directly resolves all three
failure paths. Eight new original synthetic view cases cover exact response
identities for all three roots, opening/rendering each page, safe related
navigation, disabled/refused aliases, markup-shaped literal text and malformed
or oversized fields. Existing focus, keyboard and helper interaction tests
remain present. No CSS, geometry, source identity or diagnostic suppression
change accompanies the fix.

## Evidence And Remaining Gate

The worker report records seven expected RED failures followed by 40 focused
GREEN tests, including 14 view cases. The parent reports the post-fix full
frontend run exits successfully with 387 tests. This reviewer inspected the
test delta and reported results without rerunning them.

The updated metadata-only
`experiments/max-reference/arithmetic-help-admission-20261022/intake-001.json`
is now labelled
`javascript-intake-and-production-rust-export`. All seven rows assert
production Rust preparation and exact native node-ID/route agreement with
JavaScript lowering. Arithmetic rows retain 20/20 boxes, eight cables, ten
executable nodes, all diagnostics and `complete=false`. The source/helper
identities are unchanged and whole-help qualification remains 0/2103.

The initial locked release build completed according to the parent. A final
release build after this UI change is still required and pending at this
review freeze. These PASS verdicts cover the inspected implementation;
they do not assert that pending build has completed. Ordinary Help/F1,
78-operation runtime capture, physical/view/visual and protected saved-state
qualification remain separate work.
