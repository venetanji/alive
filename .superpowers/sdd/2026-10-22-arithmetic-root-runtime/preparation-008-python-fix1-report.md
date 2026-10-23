# Preparation008 Python Fix1 Report

Date: 2026-10-23 (Asia/Hong_Kong).

The two bounded Python fixes are complete and frozen for parent packaging and
focused independent rereview. Only `arithmetic.py`, `test_preparation.py` and
this new report were edited. The initial snapshot/binding, earlier reports,
JS pair and all private evidence remain unchanged by this worker. No launch,
preparation, archive, commit or subagent was performed.

## Inputs And Final Hashes

- Accepted design: `79e6d3bd2db09eb87a6d62f02752989c1d571411a2d4afcb8de019866c11943a`.
- Independent Python review: `13c3a4446feb607d5cbf4ee233707e053e5857bdc191098016541ed31fd95f54`.
- Fix1 brief: `027c1e0df58dced6049e6cb5d564fb0f46f8ff454c237c8133be9c6c8dc0fb78`.
- Final `arithmetic.py`: `f52c868b613ba66724711e83d81d89c25d09ea2978b1484eb0c7698440725812`.
- Final `test_preparation.py`: `f1de3bbb5b8b4d3228a11516556fb9005607f01e2063c6dcc0baab63f0617d0c`.

Code paths are under
`experiments/max-reference/arithmetic-roots-runtime-20261022/`.
The immutable initial versions remain under
`.superpowers/sdd/2026-10-22-arithmetic-root-runtime/preparation-008-python-initial/`.
This report's hash is returned separately to parent to avoid self-reference.

## Valid Refusal Retention And Accounting

`extract_checkpoint` now validates the trusted caller/context independently
of the raw result. It checks the supplied request/step/action/document/revision/
source/path identities, the action document/revision and a positive integer
causing-operation ID before any retained write or request-record update.
Missing or invalid trusted context still refuses without either side effect.

For a valid trusted context, extraction retains the original bytes and updates
only the existing `raw_sha256`/`raw_bytes` binding before parsing/admitting the
result. Thus the unchanged five-key failed-readback envelope and a success-shaped
payload that later fails validation remain available through the normal retained
file/session protocol while extraction propagates refusal. No failed result is
converted to success, and no diagnostic fields or raw bytes are rewritten.

Successful admission still requires the full raw/trusted causing-operation and
identity conjunction, followed by the existing independent checkpoint/witness
validation. A success payload with internally agreeing forged raw/witness
operation IDs is retained/accounted as a refused result and cannot pass the
trusted conjunction. No serialized `op` field is added or required.

The new test uses the real immutable five-key failed envelope read-only, writes
its exact bytes only into a temporary fixture and checks byte equality, original
file preservation and the exact session hash/size update. It also covers a later
getter-shape failure and forged success operation IDs. Forty missing/changed
trusted-field combinations across failed/success raw shapes plus missing-record
controls preserve the refusal-before-retention boundary. The original trusted
record test remains intact and passes.

## Strict Nested Source Identities

`plus_v8_source_projection` now validates nested route/leaf data before calling
the normalizer or computing the projection digest. Saved edges require exactly
`index`, `source` and `destination`; their indices must be actual Python integers
matching their ordered positions. Each endpoint must be a two-member list with
an existing string Basic ID and an actual integer port within that source's
outlets or destination's inlets.

Observer leaves require exactly `anchor`, `port` and `varname`, known string
anchors, nonempty string names and actual integer ports within their source
outlets. Complete leaves must equal the ordered source-derived observer
definitions. Metadata scanning also rejects malformed descriptor arrays/rows
with `ValueError`, so malformed leaf rows cannot fail through incidental
container exceptions before reaching the strict checks.

The nested-source test covers 64 corruptions through both early metadata and
full-checkpoint consumers: whole-valued floats, booleans, strings, null,
negative/upper-bound indices and ports; missing/extra edge/leaf fields; malformed
arrays/rows; endpoint length/container/identity changes; and invalid leaf
identity/name types. It guards `_source_canonical` with an assertion, requiring
each invalid case to raise `ValueError` before normalization rather than merely
changing a later digest. Positive metadata/checkpoint controls independently
convert whole-valued geometry coordinates to integers and numeric defaults to
floats, confirming that finite geometry/scalar equivalence remains accepted.

## Test-First Evidence

All unittest commands run from
`experiments/max-reference/arithmetic-roots-runtime-20261022/` with `python3 -B`.

1. Retention RED:
   `python3 -B -m unittest test_preparation.Preparation008Tests.test_plus_v8_valid_refusals_keep_exact_retained_bytes_and_session_binding`.
   Ran 1 test; exit 1, three expected failed subtests: the genuine failed
   envelope, later-invalid success and forged-operation success had no retained
   file. Invalid-context controls had no unrelated failures.
2. Retention GREEN:
   `python3 -B -m unittest test_preparation.Preparation008Tests.test_plus_v8_valid_refusals_keep_exact_retained_bytes_and_session_binding test_preparation.Preparation008Tests.test_plus_v8_trusted_record_is_checked_before_update`.
   Ran 2 tests in 0.117 seconds; exit 0, OK.
3. Nested identity RED:
   `python3 -B -m unittest test_preparation.Preparation008Tests.test_plus_v8_nested_source_identities_refuse_before_normalization`.
   Ran 1 test; exit 1, 122 failed subtests reaching the guarded normalizer and
   6 production `TypeError` errors on malformed leaf container shapes. These
   were the missing early schema/type refusals, not syntax/import/test setup
   failures. The strict nested checks and safe metadata scan were then added.
4. Combined focused GREEN:
   `python3 -B -m unittest test_preparation.Preparation008Tests.test_plus_v8_nested_source_identities_refuse_before_normalization test_preparation.Preparation008Tests.test_plus_v8_valid_refusals_keep_exact_retained_bytes_and_session_binding test_preparation.Preparation008Tests.test_plus_v8_trusted_record_is_checked_before_update`.
   Ran 3 tests in 0.333 seconds; exit 0, OK.
5. Complete008 GREEN after the positive geometry/scalar equivalence control:
   `python3 -B -m unittest test_preparation.Preparation008Tests`.
   Ran 8 tests in 4.774 seconds; exit 0, OK.
6. Required complete Python regression:
   `python3 -B -m unittest discover -p 'test_*.py'`.
   Ran 79 tests in 16.786 seconds; exit 0, OK (skipped=1).
   Exactly 78 executed tests passed, with zero failures/errors. All earlier
   preparation, comparison, native-score logic, lifecycle and runner suites are
   included; no tests were removed or newly skipped.

The existing skip is
`test_native_score.ActualCaptureRefusals.test_complete_actual_capture_refuses_each_declared_corruption`,
which requires explicit external private native-evidence environment paths.
Those paths were not supplied.

From repository root, a `python3 -B` heredoc parsed both changed Python files
with `ast.parse` and computed their SHA256 values. Both syntax checks passed;
their final hashes appear above. A read-only unified diff against the immutable
initial Python snapshot confirmed production changes only in nested source
schema validation and extraction context/retention/admission ordering.

## Limits And Remaining Gates

This fix addresses exactly the two reviewed P2 findings. No JS/lifecycle code,
controller, runner, comparator, source/policy pins, score or native result was
changed. The full Python suite passed against the concurrently frozen JS files;
the worker did not run the Node suite or JavaScript syntax checks because parent
had freshly completed them and this brief owns only the Python pair.

Live target/native/Wine/Max/display execution, external actual-native-evidence
tests, preparations, archives, captures and independent rereview were not run.
Parent owns the frozen fix diff/map, focused rereview and later integration
gates. All private historical/source reads were read-only; test mutations and
retained writes occurred only in in-memory or temporary fixtures. Denominators
and qualification remain unchanged, including zero qualification increment.
