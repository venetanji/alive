# Arithmetic Help Admission Integrated Review

2026-10-22. Independent read-only review of the frozen package at SHA-256
`e2308451b1c181d2e07ede2950bcf8dd1f2aff0da25111f4e4cfdbe63d372a43`.
All ten source/fixture/CI hashes listed in that package match the reviewed
files. Scope includes the design, worker reports, relevant unchanged view
dependencies, the 110-case shared corpus, finite private bridge and parent's
metadata-only installed intake. No passed tests were rerun, no application
was launched and no product files were edited by this reviewer.

## Findings

1. **P1: The frontend Reference catalog excludes all three admitted arithmetic
   pages.** `apps/ultra/ui/canvas-help-view.mjs:1` still contains only the
   original 13 safe page IDs. For any imported times/plus/minus shell,
   `update` requests its page at line 108, but `checkedReference` rejects an
   otherwise valid backend response at line 7 because the page is absent
   from that catalog. Selecting Reference also returns before opening the
   pane at line 85. Related arithmetic actions remain disabled by line 46.
   Consequently the backend tuples and complete imports pass while the
   required shared Reference interaction cannot display any arithmetic page.
   Add exactly times/plus/minus to the finite frontend page set and cover
   response validation, opening each arithmetic page and following safe
   related arithmetic IDs, while continuing to refuse symbolic/unknown
   request IDs. Existing view tests initialize append at
   `apps/ultra/ui/canvas-help-view.test.mjs:34`; they do not cover this new
   integration path.

No additional actionable findings were identified in the reviewed changes.
The four observed port-shape warnings belong to comments, not helpers; their
correction history remains in `evidence-baseline.md`.

## Specification Verdict

**FAIL pending P1.** The design explicitly includes usable shared Basic and
Reference shell behavior for these three roots. The existing frontend
catalog prevents that outcome. Source/helper admission, Rust tuple-bound
Reference extraction, hierarchy policy pairs and complete source retention
meet their inspected requirements; those successful components do not
resolve the frontend Reference failure.

## Quality Verdict

**REQUEST CHANGES.** Correct the finite frontend page catalog and add focused
synthetic view integration coverage before marking this stage complete.
The gap is limited to Reference admission and needs no visual redesign,
geometry change, alias expansion or diagnostic suppression.

## Inspected Evidence

- JavaScript profile pins exactly match the independently revalidated source,
  helper argument/starter hashes and anchors. `probeHelpShell` snapshots the
  verified response before awaiting bounded WebCrypto facts; private WeakMap
  state remains bound to the same immutable source string. Synchronous import
  rechecks the role raw values, shape and complete-tree script isolation.
  Caller-supplied profile/digest objects cannot authorize helpers.
- The importer delta only emits the identity's selected adapter. Existing
  appearance bounds, arithmetic range/format warnings, saved metadata
  diagnostics and completeness rules remain intact. Helpers remain authoring
  annotations with no native ports or script execution.
- Rust verifies all four fixed helpers before returning either finite source
  policy. Each arithmetic Reference uses its exact safe ID, fixed route,
  symbolic XML identity and XML digest. Unknown/symbolic public requests have
  no route; related symbols map only through the three finite tuples, whose
  current XML must validate. Admitted-owner authorization and existing
  contained regular-file, read/parser/field/response bounds remain present.
  Rendering uses textContent in the unchanged view dependency.
- Frontend and Rust hierarchy admission use matching adapter/object sets and
  retain direct named tabs, exactly four helper roles, an empty question
  scope and unavailable helper ports. The first 49 fixture cases are unchanged;
  61 appended cases provide three arithmetic positives and policy/topology
  refusals, for 110 total. Both language suites consume the shared corpus.
- The new private bridge accepts only the three finite safe source IDs and
  fixed helper/source pins, then uses production recognition/import/lowering.
  Existing bundle writing refuses worktree output and requires new private
  directories/files. Full authored graphs remain private. Its supplied IPC
  identity is explicitly an offline bridge, with real Rust admission checked
  separately. CI runs the new bridge tests at
  `apps/ultra/tests/ci/check-contracts.sh:10`; the Node glob at line 8 includes
  the arithmetic production tests.
- `experiments/max-reference/arithmetic-help-admission-20261022/intake-001.json`
  records all seven installed imports. Each arithmetic root retains 20/20
  boxes, 8/8 cables, 20 exact source mappings and ten executable nodes.
  Each retains 137 diagnostics: 81 appearance, 48 semantic, four comment
  port-shape warnings and four helper informational entries, with
  `complete=false`. Legacy adapter IDs remain correct for the four older
  roots. Qualification remains 0/2103.

## Verification Boundary

Worker reports record affected Node tests, focused Rust tests and the explicit
local identity/Reference check. The parent reports 379 frontend and six bridge
tests passing, then 119 full locked Rust tests passing with two ignored tests,
one explicit local identity/Reference test passing and all seven production
Rust exports completing with the expected arithmetic 20/8/10 counts. Those
parent export results were communicated during review; the inspected intake
artifact itself is labelled JavaScript intake before native export. The
release build remains running at this review freeze, so this report makes
no release-build completion claim.

Ordinary Help/F1 discovery, the declared 78-operation runtime comparison,
physical/view/visual behavior and protected saved-state gates remain outside
this admission verdict. No whole-help qualification increment follows from
the reviewed intake or this report.
