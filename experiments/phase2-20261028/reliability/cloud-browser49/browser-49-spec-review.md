# R-B49 independent spec review

## Findings

No spec-blocking findings in immutable candidate `f03516116de0d0823851d9e789f5078e1cecb3f4` against base `49d68bb9fa7e7d1d07ddd26950a22f62a3ba89c6`. Verdict: **pass for the bounded candidate**, subject to the pending full browser suite and final-head CI.

## Evidence and limits

- The complete binary diff and candidate file hashes match the review brief. Only `apps/ultra/tests/ci/alive-chain.spec.mjs` changes. At candidate lines 301-307 and 333-337, the original first-lane coordinates `[384,35]` to `[480,35]`, six-step real mouse drag, and source, placement, stale gesture, brace and history assertions are preserved. Other existing calls retain their original geometry path.
- At lines 305-307, the first lane and nonzero rectangle are read in one browser evaluation, eliminating the demonstrated handle-resolution gap for this read. It does not ensure the geometry stays fixed until pointer input or address other geometry reads.
- At lines 339-348, the regression checks real zoom redraw replacement, range selection and source creation. The private locator hook forces a further redraw only when the old handle-based path is used. The retained mutation script changes only the new helper back to that path; `RED.log` reports the null `x` failure, while `GREEN.log` and `SCENARIO.log` report passes. Thus the regression discriminates the reproduced mechanism; the green candidate does not claim to force a redraw inside its atomic evaluation.
- The retained control and forced logs show, respectively, the connected lane with a valid box and the detached old lane with null box while its replacement remains measurable. This supports a plausible cause of the cloud symptom, not proof of the actual cloud trigger.
- The worker report records separate bounded runs, owned-process cleanup and a clear pending full-suite/final-head gate. The focused logs support the reported outcomes; this review did not independently run tests, inspect live processes, or verify the cleanup timing. No browser, build, GUI, audio or native workload was started for this review.
