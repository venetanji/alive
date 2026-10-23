# Saved cable UI correction

Completed the bounded cable pass on 2026-10-22 using Impeccable. The first root
inspection compared native desktop/compact renders with the retained original
Max initial fixture. One combined correction and one desktop/compact confirmation
followed. No additional visual iteration or Max launch was used for this pass.
Completed comment, help-shell and Print refinement stayed closed.

## Findings and correction

The initial literal polylines showed sharp corners and diagonal endpoint joins.
The retained Max image instead shows rounded segmented bends, vertical joins
aligned with the actual ports, and a dogleg for a repeated-point route.

`canvas-cable-path.mjs` now derives first/last bend x coordinates from the ports
and fits quadratic corners using a 12px trim bounded by half of each adjacent
segment. A singleton supplies two bends at its saved y. Adjacent duplicate
display points collapse; collinear/reversing segments stay straight. Saved
arrays remain unchanged, including their empty/repeated/fractional values.
The exact corner radius and endpoint projection are contour interpretations,
not a recovered general Max serialization or routing algorithm.

Visible and generous hit paths share the same `d`. Automatic cubic routes
remain for empty/absent saved geometry. The earlier integration includes bend
bounds in Fit/scroll, shares drag/commit translation rules, and forwards the
hit path's context menu to the same cable action.

## Verification

Durable logs are in
`experiments/max-reference/cable-verification-20261022/results/`:

- `rounded-path-red.log`: five expected failures against the sharp renderer;
  two existing automatic-route/bounds cases passed.
- `rounded-path-green.log`: seven path cases passed.
- `rounded-geometry-green.log`: twelve path/movement cases passed.
- `rounded-browser.log`: eleven compatibility browser cases passed, including
  actual endpoint distance/tangent, pan/zoom, hit selection/context menu,
  unchanged saved data, drag preview, history and compact Fit checks.
- `rounded-contracts.log`: required contract gate exited 0.
- `rounded-release-build.log`: locked native release build exited 0.
- `rounded-native.log`: rebuilt Tauri/WebKitGTK session exited 0; one-endpoint
  and group movement, history and Save retained exact arrays. Fresh numeric
  recall returned 77 and native runtime revision stayed 1.
- `rounded-native-cleanup.json`: no exact-output-marker processes remain.

Final native evidence is at
`/home/venetanji/.cache/alive-ultra-evidence/cables-20261022-rounded/`.
The root inspected desktop 1120x780 and compact 800x600 together in the one
allowed confirmation batch. The larger window shows rounded routing and attached
joins. At 100% the compact window scrolls the low route, as expected; Fit
containment is verified by the browser case. No further cosmetic edits follow.

The independent follow-up in `cable-code-review.md` reports no unresolved P1/P2
issue in this correction. The earlier complete JS/browser/Rust results remain
historical pre-contour checks; refreshed affected checks are named above.

## Remaining limits

The original Max motion probe retained box rectangles but no clipboard patchline
serialization. Ultra's absolute-one-endpoint/translated-equal-group policy is
tested locally, but Max saved-motion equivalence remains unqualified. Bend
handles, arbitrary routing styles and cable attributes remain outside this pass.
Source accounting retains fifteen midpoint arrays across the four sampled
roots exactly and removes precisely fifteen unsupported-midpoint warnings.
This does not qualify any whole help root: the count remains 0/2,103.
