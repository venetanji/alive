# Arithmetic Preparation005 Fix1

Addressed P1/P2 from the frozen initial review
`be83226b6d43422a27529680184576a36855a49976d151f66d24135969ab2e70`.
Only `controller.js` and `test_helpers.cjs` changed. Initial005 reports and the
review-base archive remain immutable; parent owns combined verification and
scoped independent re-review.

P1: Plus diagnostic eligibility now requires the actual root's available parent
property to be exactly null. Missing, throwing or non-null topology fails
closed. The owner's strict inlet must equal the definition's inlet, which is
already bound to the revision's expected index. Missing, boolean and wrong
owner inlets suppress every capability call.

P2: When consuming a plus geometry policy, controller resolution now requires
exact saved or pinned live geometry. An unmeasured near-saved vector no longer
qualifies. Existing times saved-geometry tolerance remains unchanged.

## RED And GREEN

`node test_helpers.cjs` first reproduced all six identity variants and all four
near-saved geometry variants for both separately owned revisions, directly and
through serialized failures: 20 invalid cases made calls and retained numeric
observations. After P1, only the eight geometry cases still did so. After P2,
the command exits 0 and prints:

```json
{"fix1IdentityCases":12,"fix1GeometryCases":8,"invalidCasesWithCalls":0,"directCasesWithObservations":0,"serializedCasesWithObservations":0}
```

The full existing Node suite also passes. Baselines explicitly bind null parent
and owner inlet 2/inlet 3 for revisions 1/2. Exact-saved controls pass at every plus
geometry anchor; pinned-live controls remain valid. A times near-saved control
passes. Invalid serialized failures preserve actual anchor diagnostics and
geometry dispositions, with no fabricated observation or numeric admission.

`node --check controller.js` and `node --check test_helpers.cjs` both exit 0.
Against the sixteen-file005 review base, exactly the authorized two files differ;
the other fourteen files and frozen score remain byte-identical. No Python/V8
policy, source metadata, score, native, runner or comparator edit occurred.

## Frozen Binding

| File | SHA256 |
| --- | --- |
| `controller.js` | `febc0bede6c58a4b11667a580e5d845089accd9237ab3c5f52caa632a884726c` |
| `test_helpers.cjs` | `9c661e919efa511aa88640f78475e50b38738b76aa1d37dd7c90b4656d6bdf9e` |

Two-file binding SHA256 (canonical sorted filename/hash map):
`1c75dc8bb0c03b0d37d028dc2ee41313ba63ebb33a3726c8cd71991e06335c58`.

Current ten-file package SHA256:
`0e81702204d177c3d13590dd617edb64eb0c0344405692219b252d8123e4ecfe`.

No preparation, runtime launch, private evidence edit, commit or delegation
occurred. These are synthetic eligibility regressions; live plus capability
availability, getter silence and numeric/V8 admission remain unestablished.
