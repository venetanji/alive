# Saved Max Cable Geometry

The Impeccable fidelity correction preserves the fifteen valid saved
midpoint arrays in the four-root help sample. Previously the importer dropped
them and the renderer replaced every route with a cubic curve. This phase does not
qualify a complete installed help root.

The user's existing autonomous authorization covers this refinement. Preserve
the dirty checkout, completed comment/help/Print work and original Max settings.
No commits or unrelated cleanup are part of this phase.

## Document Contract

Both existing document profiles accept optional `edge.midpoints`: a flat even
array of zero through 256 finite coordinates, each in 0..4000, forming up to
128 x/y pairs in the cable's patcher coordinate system. Preserve empty arrays,
repeated vertices, decimals and order. Other unknown edge fields remain errors.
JS and Rust enforce identical bounds. Valid Max arrays are imported exactly;
malformed or oversized geometry is omitted with an appearance diagnostic while
the otherwise valid executable cable survives.

Midpoints are authoring data. Native preparation, hierarchical lowering and
controller execution/topology comparisons explicitly select only the four
endpoint fields. Appearance edits, save, CAS, Undo and Redo retain geometry
without replacing native graphs or reordering fanout.

## Display And Movement

Render saved routes with rounded segmented corners, joining the actual outlet
and inlet vertically. The retained initial Max image shows rounded bends,
endpoint-aligned joins and a repeated-point dogleg. The fitted contour uses
12px corner trims bounded by half of each adjoining segment. Derived first/last
bend x coordinates follow the ports; a single saved point supplies both endpoint
bends at its saved y. Adjacent duplicate display points collapse, and collinear
segments do not curve. Saved arrays remain exact. This is a fit to the observed
contour, not a qualified general Max routing algorithm or serialized rewrite.
Empty or omitted geometry keeps the existing automatic curve. Visible and
generous invisible hit paths share exactly the same route; existing
control/signal styles remain.
Camera bounds and Fit include bends outside object bounds. Pan and zoom do not
rewrite document coordinates.

Moving one endpoint retains absolute bends. Moving both endpoints by the same
delta translates their bends by that delta. Unequal endpoint movement retains
absolute bends. Authoring rejects out-of-range translations atomically; pointer
dragging limits the shared delta to keep the complete selected route in bounds.
Preview and committed movement use the same rule. The private original Max probe
retained box movements, but both clipboard mechanisms returned no serialized
patchlines. Max's saved-motion policy remains unqualified. Ultra's movement
policy must not be reported as established Max behavior.

This phase does not add bend handles, cable color/visibility support, automatic
orthogonal routing or a fanout ordering heuristic.

## Verification

Meaningful regressions cover strict flat/v2 JS/Rust validation, valid and invalid
import, endpoint-only lowering, boundary remapping, movement/history/save,
actual SVG routes and hit testing, camera bounds, selected-route movement,
and native state retention. One batched visual comparison includes the existing
desktop sizes. At most one corrective visual confirmation is allowed.

The independent original float oracle records format6 display separately from
typed arithmetic output. It does not authorize new numeric semantics without
evidence and a separate bounded implementation.

## Work Tracking

- [x] Model, import and Rust contracts; focused tests; protocol documentation.
- [x] Render, movement preview and camera; browser regressions.
- [x] Private Max cable/float observations and cleanup; motion remains unqualified.
- [x] Confirm corrected contour, refresh affected verification and independent review.
- [x] Final evidence and remaining-gap report in `.impeccable/review/max-fidelity-20261021/cable-ui.md`.
