# Task 4 independent review

Candidate `a2fdc9869fb3b7e1c5dbe02ca292ae0460b9b209` against `5663956b669f34758ed82fb8eabecb95a81c792c`.

## Spec verdict: PASS, with stated hosted-preset limitation

Existing devices are validated against their actual graph before any identity change; validation returns copies and the branch preserves all manifest fields other than the requested id/name. Invalid bindings throw before `controller.load`; the mounted handler routes errors to `controller.notice`. The no-device template path remains unchanged. Version 2 and stereo effects are covered, and the Perform copy now describes hosted effects. The diff is restricted to the five permitted files.

The direct regression covers customized Tone binding/range/label, presets, MIDI and audio, input nonmutation, invalid binding rejection, and non-template version 2. The mounted regression exercises preservation and effect rename. The worker's red and green receipts report 94/4 and 98/0 respectively. I inspected the diff and receipts; I did not rerun the suite or native GUI.

The native rename script compares the entire saved manifest to the pre-rename manifest with only the name changed and checks nodes and edges. The reopen script asserts the exported saved patch, identical manifests in a new instance, and independent graph changes. The saved and reopen files currently share SHA-256 `6092dc2706c6e7815905ffe6451a53a07677dc072b265b70ae3cd967ae0b5a1e`. The saved file contains Tone bound to node 4 cutoff with range 100..9000 and Init/Soft/Pluck tone values 2400/700/4200. Both session track references name that exact saved file; the host script and successful log show both Tone controls retaining independent 1200/3400 values. This supports retention through the same saved dependency and host admission, not hosted preset recall. Alive has no preset selection/recall UI or API, per controller scope; no such pass is claimed. The host run did not record a contemporaneous hash or inspect an internal hosted preset object, so the file-identity conclusion rests on the saved path and current file plus scripts/logs.

## Quality verdict: PASS

No actionable correctness or regression finding in the candidate diff. The guard reports validation errors and `packageInstrument` executes before the load; the existing validation provides useful binding-specific errors. Panel rendering remains protected by existing identity/rebuild and draft handling. The new effect test also exercises a live control after rename. `git diff --check` passed in this review.

Residual coverage gap: the invalid-binding test is at the production-function level, not an end-to-end mounted-panel rejection assertion. Since the canonical controller only admits validated patches and the guard/load ordering is clear, this is not a blocker; a future regression can explicitly exercise a refusal notice and unchanged owner if a realistic incompatible owner state is exposed. General manifest authoring and hosted preset recall remain outside this task.

## Scoped selector follow-up

PASS: root commit `b4b1a5c` changes only the native instrument journey's click from `Package instrument` to `Package device` at `apps/ultra/tests/check_instrument_desktop.py:157`, matching the candidate button text at `apps/ultra/ui/canvas.html:120`. The surrounding journey and assertions are unchanged. No test or GUI run was performed for this scoped review; the full native journey remains pending G0.
