# Preparation007 Fix1 Python Report

Date: 2026-10-23 (Asia/Hong_Kong).

The Python P2 owner-map correction is complete and frozen under
`preparation-007-fix1-brief.md`. This worker edited only `arithmetic.py`,
`test_preparation.py` and this new report. Parent owns integration and rereview;
the separate JS worker owns the authored-root-class correction.

## Review And Base

- Frozen scoped review SHA256: `5646e0716607a20da518d4f6ce7aa08ecffb4f2be45bbfc5193010d89df1ad19`.
- Initial007 review-base binding SHA256: `86e57db10212960123d559b9253bb9c31c02452d08c0bdffc9aa84d7e50afcb3`.
- Initial `arithmetic.py`: `9adb74bde2cd8352cca08bc05d91687c3eeea41667912f99d050a81e5dc18216`.
- Initial `test_preparation.py`: `dc1bd20011ff7993a9b7aa567658e2f4a50ada6d3eacacbcd9dcbe6e62f584eb`.

Both Python files matched the private initial007 review base before editing.
The review and private binding hashes still match after verification. The base
was read-only throughout; initial007 reports, review artifacts and policy
contract remain immutable.

## Correction

`load_plus_controller_cohort_measurements` now requires a lifecycle object with
the complete six-row owner inlet map. Each map entry must be an object with its
strict integer inlet equal to its ordered index. It then selects the owner by
the independently validated definition's inlet and requires strict JSON types
and exact agreement for inlet, document, revision, source hash and working path.
The owner-map conjunction executes before accepting source/cohort witnesses.

The synthetic fixture now includes the real lifecycle-map schema: six owner
rows with channels and proof paths, monitor identity, observer/report paths and
driver inventory. A new test supplies a valid control and twenty-three negative
controls covering missing or malformed maps/rows, duplicate owners, missing
inlet, string/boolean/float inlet and revision values, mismatched inlet/revision,
and malformed or mismatched document/source/path fields.

Each negative control rebinds only its synthetic configuration hash, the
configuration's synthetic seal entry and synthetic seal hash. The real loader
therefore reaches the independent owner guard instead of stopping at an
immutable-byte check.

## Test-First Verification

All commands ran from
`experiments/max-reference/arithmetic-roots-runtime-20261022` using `python3 -B`.

RED, before the production correction:

```text
python3 -B -m unittest test_preparation.PreparationTests.test_capture006_cohort_loader_binds_lifecycle_owner_map
```

The valid-map baseline passed. All twenty-three malformed/mismatched controls
failed because the uncorrected loader accepted them instead of raising
`ValueError`. This independently reproduced the reviewed omission.

Targeted GREEN:

```text
python3 -B -m unittest test_preparation.PreparationTests.test_capture006_cohort_loader_binds_lifecycle_owner_map test_preparation.PreparationTests.test_capture006_cohort_loader_bindings test_preparation.PreparationTests.test_capture006_cohort_trace_prefix test_preparation.PreparationTests.test_plus_cohort_policy_binding test_preparation.PreparationTests.test_plus_cohort_source_metadata_keeps_both_complete_descriptor_views
```

Result: five tests pass, including every owner-map rejection control and the
existing immutable006 trace, policy and source-metadata checks.

Full Python GREEN:

```text
python3 -B -m unittest test_preparation test_lifecycle test_runner test_native_score test_comparison
```

Result: 71 tests run in 11.969 seconds; 70 pass and one existing optional test
skips. No production or test edits follow this run.

Read-only actual-evidence checks also pass: the immutable006 loader returns
three cohort witnesses; actual-source metadata has three policies in each plus
descriptor view and complete metadata validates. No private program values,
source/helper bodies, raw geometry or configuration/ACK/readback bodies were
printed.

## Frozen Delta And Preservation

| File | SHA256 |
| --- | --- |
| `arithmetic.py` | `437701dd8c1f917e2ee1d34cb79170a6d635ec554187932d6f80618c461db90f` |
| `test_preparation.py` | `f9fceb499b6cc9d00e6033c18f1f4b2d47c9ce00c50f8470e2bb109e1b73f4ae` |

An AST comparison against the initial007 review base identifies only
`load_plus_controller_cohort_measurements` as a changed production function,
with no new production functions. Every existing test method is unchanged;
the owner-map test is the sole new test method, alongside the valid-map fixture
update. Both frozen hashes were sent to parent and the JS worker.

`controller.js` remains at
`da4473ac8014f39fd255b830121508738c16980b6e303fb0a9b8c963ce0f13a8`.
The complete score remains at
`95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb`.
No policy schema, lifecycle implementation, runner, comparator, native or
application code changed in this worker's scope. No preparation, runtime launch,
capture, commit, delegation or private/historical evidence write occurred.

This report is the only write after the two Python files froze. Parent's
combined verification, independent focused rereview, fresh sealed preparation
and any later concrete review/capture remain pending. Qualification stays
`0/2103`; all 78 operations, 504 states, 141 original emissions and six
independent closes remain required.
