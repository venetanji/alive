# Preparation005 Fix Round 1

Address both verified findings from preparation-005-review.md, SHA256
`be83226b6d43422a27529680184576a36855a49976d151f66d24135969ab2e70`.
Parent independently reproduced the direct and serialized failures before this
dispatch. The initial005 implementation, report and sixteen-file review-base
archive remain immutable historical references; initial005 was never prepared.

- P1: Plus getters run without complete root and lifecycle-inlet identity checks.
  Require a known top-level root (parent property available and exactly null)
  and the owner's strict integer inlet equal to the expected revision index and
  definition inlet. Unknown, throwing or non-null topology and missing, boolean
  or wrong inlets suppress every diagnostic capability call.
- P2: Tolerant saved-geometry matching admits unpinned plus geometry before
  getters. Require exact permitted saved/live vectors when consuming plus
  geometry policies; test each of the four policy anchors independently.
  Preserve existing times resolution behavior.

Own only controller.js and test_helpers.cjs in the arithmetic runtime stage.
Use test-first RED/GREEN regressions with valid top-level/inlet fixtures for
both plus revisions. Include direct and serialized failures, unknown/throwing
topology, strict owner inlet types and all four near-saved geometry variants.
Every invalid case must make zero capability calls and retain no fabricated
numeric observation; installation remains refused. Retain existing geometry
and diagnostic context that was actually collected.

Do not alter Python/V8 policies, source metadata, score, native/runner/comparator,
historical evidence or unrelated code. No preparation, launch, commit or further
delegation. Finish with Node/syntax verification and a concise separate
max-preparation-005-fix1-report.md containing RED/GREEN commands, output and
two-file hashes. Freeze for scoped independent re-review. Parent owns combined
verification, fresh preparation and eventual runtime execution.
