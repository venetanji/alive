# Arrangement Browser Geometry

Original cloud failure at `c272c4a6ac350372e990cad1e5fe3289bba86f9a`:
https://github.com/venetanji/alive/actions/runs/40704978908. Chromium passes
137 tests and fails the 1440px Arrangement pointer test when `boundingBox()`
returns null after visibility passed. The original case trace, screenshot,
context and completed-job log are preserved and hash-pinned.

Candidate `c7f12ea2f5d23cd0ef8984621de9f0f9cfcb9a8a` changes only that test's
initial placement geometry read. Timeline redraws replace placement nodes.
A controlled interleaving using real zoom actions between handle resolution
and bounding-box read reproduces the same error at both sizes. This establishes
the detached-handle mechanism, not which precise redraw caused the original
cloud failure. The corrected test queries the currently attached placement and
its rectangle in one synchronous browser evaluation. Original pointer,
cancellation, history and authority assertions remain.

The worker reports both focused cases and all 14 Arrangement tests passing;
root's byte-identical integration passes both cases in 5.4s. Local root output
contains existing Node deprecation/color-environment warnings; no application
warning or dependency/environment change is inferred. Independent Terra spec
and quality reviews accept the candidate. Later layout movement and unchanged
geometry reads elsewhere remain outside this narrow correction.

Browser fixture evidence is separate from native/audio evidence. Root's
complete final-harness native Alive run at c272 passes independently in
197.813s; its records are in the sibling chooser-diagnostics checkpoint. A new
exact-head cloud run remains required. No Master implementation, native G0
acceptance, endurance or physical audio claim follows from these browser tests.
