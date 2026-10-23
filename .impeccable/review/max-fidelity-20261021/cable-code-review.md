# Saved cable geometry code review

Reviewed the bounded cable midpoint phase against
`docs/superpowers/specs/2026-10-22-max-cable-geometry-design.md` on 2026-10-22.
This review covers JS/Rust schemas, Max import, hierarchy lowering, movement,
standalone/shared admission and SVG/camera integration. It preserves the existing
dirty checkout and excludes unrelated object, comment, help and Print work.

## Findings

No unresolved P1/P2 implementation findings remain in the reviewed midpoint
scope. One P2 finding from the previous independent review is corrected:

- `apps/ultra/ui/canvas-cable-geometry.mjs:14`: comparing independently
  reconstructed endpoint deltas with strict equality leaves saved bends behind
  during fractional group movement. For example, adding 0.1 to endpoints at
  10.5 and 80.1 produces unequal floating point subtraction results. The helper
  now compares with an operand-scaled roundoff tolerance and canonicalizes
  translation drift at 0/4000. Genuine unequal movement and genuine overflow
  still retain bends or reject, respectively. Geometry tests exercise both
  branches, boundary drift and input immutability; the model test checks
  rejection leaves the document and history unchanged.

The former strict comparison was substituted into an in-memory helper copy and
run against the existing geometry tests without modifying repository source.
That controlled run failed exactly two tests: fractional equal movement and
boundary roundoff. The current helper passes both. Evidence is retained in
`experiments/max-reference/cable-verification-20261022/results/strict-delta-regression-red.log`.

## Review checks

- JS and Rust accept the same optional flat, even, finite coordinate array of
  up to 128 pairs within 0..4000, including an explicitly empty array. Present
  null, malformed arrays, nonnumbers and excess coordinates fail. Unknown cable
  attributes remain rejected.
- Max import clones valid geometry onto its corresponding edge before fanout
  ordering. Invalid geometry emits an appearance warning and retains an
  otherwise executable cable. It does not rewrite endpoint order or indices.
- Flat controller fingerprints and JS/Rust hierarchical lowering explicitly
  select endpoint fields. Saved geometry does not enter native edge data or
  trigger graph replacement. Boundary remapping preserves the containing
  authoring edge and its geometry.
- Document movement computes translated geometry against original node
  positions and validates the cloned edit before recording history. Moving one
  endpoint or moving endpoints differently keeps bends absolute. Shared
  root/child CAS and Undo/Redo preserve authoring geometry and runtime revision.
- SVG visible and hit paths receive the same computed route and actual port
  centers. Automatic curves remain for absent/empty geometry. Saved bends enter
  camera/Fit bounds. Pointer preview uses the same helper as committed movement,
  and selected-route bounds constrain the shared drag delta.
- Keyboard movement rejection reaches the existing outer event guard and
  becomes a notice; the direct call inside the key handler is not an unhandled
  error. No renderer correction is needed for that inspected path.

## Fresh verification

Durable command output is under
`experiments/max-reference/cable-verification-20261022/results/`:

- `focused-js.log`: **121 passed, 0 failed** across geometry, path, flat model,
  hierarchy, Max import and shared-controller tests.
- `focused-rust.log`: **2 passed, 0 failed, 110 filtered out**, using the existing
  local Rust toolchain and native library. The owner/history test commits from
  both root and child, rejects stale CAS, and checks root/child Undo/Redo while
  preserving live message text, Print receipt generation and runtime revision.
  Each transition clears the destination then bangs the source, requiring a
  fresh native propagation of the retained value rather than stale display
  state.

## Remaining evidence boundary

This review does not substitute for the parent-owned browser/desktop checks,
the independent original-Max movement probe, or a newly built application.
Those checks must establish displayed geometry, hit testing and movement
agreement before this phase is qualified. The focused Rust run links the
existing native library and does not rebuild it. No full suite or new native
session was run for this review. Whole-help conformance remains **0/2103**.

## Rounded contour follow-up, 2026-10-22

Read-only review of the corrected `canvas-cable-path.mjs`, its seven unit test
definitions, the routed-cable cases in `canvas-compat.spec.mjs`, and the updated
specification/protocol. No unresolved P1/P2 finding is identified in this
correction. This follow-up does not rerun tests or inspect/capture images; the
parent owns refreshed JS/browser/build/native confirmation.

- `apps/ultra/ui/canvas-cable-path.mjs:4` constructs fresh bend records before
  projecting the first/last x coordinates onto the actual ports. Singleton
  duplication also creates a separate record. The source array and endpoint
  objects are not assigned to, so display projection cannot rewrite authoring
  geometry or introduce a serialization/history change.
- `apps/ultra/ui/canvas-cable-path.mjs:8` collapses adjacent duplicate display
  points before rounding. Each interior point therefore has nonzero incoming
  and outgoing segment lengths for validated finite input. Coincident routes
  still return a finite M/L path; collinear and reversing segments use straight
  lines. The bounded coordinate contract prevents overflow in differences,
  lengths and the collinearity products. Malformed/nonfinite midpoint input
  continues to be rejected at the existing authoring boundary.
- `apps/ultra/ui/canvas-cable-path.mjs:20` limits each corner trim to 12 and at
  most half either adjoining segment. Two corner trims cannot overlap along
  their shared segment. Trim points lie on those segments and quadratic
  controls remain at the original display vertices, so the rounded contour
  stays inside their convex hull without extending camera bounds. The unit
  definitions cover full and short trims, stale endpoint x values, single and
  repeated bends, coincident/collinear/reversing paths, source retention and
  unchanged automatic curves.
- `apps/ultra/ui/canvas.mjs:323` continues to compute one route string for the
  visible and generous hit paths. `cableBounds` still includes saved bends;
  actual port positions are covered by object bounds. Projecting endpoint bend
  x values can make these saved bounds conservative, but cannot place a rounded
  route outside the union of saved-vertex and object bounds. Fit and selected
  drag bounds therefore remain safe. Saved-coordinate drag limits are still
  needed even when a stale endpoint x is no longer used for display.
- `apps/ultra/tests/ci/canvas-compat.spec.mjs:20` checks actual route endpoints
  against current port centers after pan/zoom and samples near each end to
  assert vertical joins. The test also checks identical hit-path data, ordinary
  selection/context handling and unchanged saved geometry. The movement case
  checks the corrected Q control point during single/group previews and
  history; the compact Fit case measures the displayed path within the
  workspace and verifies the saved array survives.

The updated design correctly describes this as a fitted rounded contour based
on the retained initial Max image, rather than a qualified general routing
algorithm. The private movement probe did not yield serialized patchlines;
Ultra's saved-motion policy remains explicitly unqualified. Earlier verification
counts in this report are historical evidence for the prior renderer state;
the parent records fresh affected checks for the rounded correction. No new
whole-help qualification is claimed by this review.
