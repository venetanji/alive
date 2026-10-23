# Current integration frontend validation

This follow-up checks the working integration tree after combining the release review fixes with the reusable instrument milestone. It does not replace the original baseline findings or modify `probes.test.mjs`. The final commit identity and platform acceptance belong to the integration report.

The original six probes were first run after resolving the canvas merge. Numeric retry and drag completion failed with the documented symptoms; the combined cable cache also failed hierarchy switching when two scopes had no cables. After the fixes, all six original probes pass without changing their assertions:

```sh
ALIVE_VALIDATION_REPO_ROOT=/workspace/alive node --test experiments/ultra-astra-validation-20261024/frontend/probes.test.mjs
```

Current result: 6 passed, 0 failed.

The numeric control now receives an explicit synchronous queue-admission result from the page parameter handler. It retains its dirty draft until that admission succeeds. Rejected drafts survive blur, status updates, and the canonical Undo/Redo response, and Enter can retry them. Native document commit remains asynchronous through the shared controller's existing recovery. An unchanged accepted control gesture still avoids duplicate native events.

Drag completion catches authoring rejection, reports it, and immediately renders the canonical position. Another gesture after history completes is admitted. Cable invalidation retains the instrument performance cache while including document scope, authored geometry, computed paths, zoom, lock state, and cable selection; explicit resize/gesture redraws remain available. Device panel and adaptive polling integration are retained.

Permanent DOM regressions cover number, number_int, and flonum across held Undo and Redo, rejected Enter and blur, canonical response, retry, and persistence; a draft equal to its pre-Undo display; and rejected/retried drags in both history directions. Document-session tests cover native Quit cancellation after frontend preflight failure, save failure, picker cancellation, still-dirty save, and confirmation failure, plus success without cancellation. Quit generation tokens are retained through the mounted page event listener and passed to confirmation and cancellation, allowing native code to reject stale completions. The cancellation cases were observed failing before the frontend cancellation hook was added.

```sh
node --test apps/ultra/ui/*.test.mjs
```

Current result: 415 tests, 402 passed, 13 skipped, 0 failed. The full run initially caught duplicate unchanged numeric admissions while extending draft coverage; that regression was corrected before this passing run. Assigned-file `git diff --check` also passes.

These are Node tests of the real frontend modules with the existing small DOM adapter and delayed IPC service fixtures. They do not establish rendered browser geometry, native WebKit interaction, macOS lifecycle behavior, physical audio, or installer acceptance. No browser sandbox bypass or denied native deeper-review action was attempted.
