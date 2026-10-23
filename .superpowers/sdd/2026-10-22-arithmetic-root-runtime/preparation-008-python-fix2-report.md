# Preparation008 Python Fixture Fix2 Report

Date: 2026-10-23 (Asia/Hong_Kong).

The bounded test-only storage correction is complete and frozen for parent
review. This worker edited only `test_preparation.py` and this new report.
Production `arithmetic.py`, JS files, initial/fix1 snapshots, previous records
and all private evidence remain unchanged. No private fixture directory or
new evidence root was created. No launch, preparation, archive, commit or
delegation occurred.

## Bindings

- Fix1 rereview: `37f214ac5e3426b7a3ee4fc5041cfebd84529a8303eede116a0e0505196d2cb0`.
- Fix2 brief: `a436e31109930b5197ae00e27b2ac1b3882edfb30c00f690b4901c262b01266e`.
- Parent-supplied immutable fix1 snapshot binding: `dcb8aaf81947a41fe92534e03c15b363849e9a3db4fb82eca2479e09b406573b`.
- Final `test_preparation.py`: `2ce3bff6b5d47851398e3c7d62cfbf5ef4df05642c2f56291a515c056c94c762`.
- Preserved `arithmetic.py`: `f52c868b613ba66724711e83d81d89c25d09ea2978b1484eb0c7698440725812`.

The code paths are under
`experiments/max-reference/arithmetic-roots-runtime-20261022/`.
This report's hash is returned separately to parent to avoid self-reference.

## Exact Correction

Only these two extraction tests and their directly required test helpers/imports
changed:

- `test_plus_v8_trusted_record_is_checked_before_update`.
- `test_plus_v8_valid_refusals_keep_exact_retained_bytes_and_session_binding`.

The two tests no longer allocate temporary directories, call `write_json`,
initialize files through `retain_raw`, or read fixture payloads back from disk.
Input and retained bytes exist only in a dictionary and `BytesIO` buffers.
The genuine failed007 envelope is read-only at its original private path; a
final original-path read confirms its bytes remain equal. Success-shaped and
mutated derivatives also stay exclusively in memory.

The production `extract_checkpoint`, `retain_raw`, raw parser, trusted-context
conjunction, policy/witness/checkpoint validators, SHA256/size calculation and
request-record accounting execute unchanged. The helper mocks only storage
boundaries: private preparation verification/path/read access and the retained
file's open/descriptor/mode/flush operations. The virtual open accepts only
the exact expected retained path, exclusive no-follow write flags and 0600
mode; it delegates to no real filesystem operation. Real `retain_raw` writes
to the virtual descriptor and computes its normal hash/size return value.

Assertions preserve the existing successful extraction, all invalid/missing
trusted-context cases, the genuine failed envelope, later-invalid success and
forged-operation refusal. Valid contexts require an exact retained-write byte
match, unchanged input bytes and an update of only `raw_sha256`/`raw_bytes`.
Invalid contexts require unchanged records, unchanged input bytes and no
retained write. No semantic validator or retained-byte hash/accounting function
is mocked or replaced.

## Guard And Test-First Evidence

A decorator applied only to these two tests rejects temporary-directory
allocation, write-mode `open`/`io.open`, write/create/truncate/append `os.open`
and directory/path mutation calls. Read-only original private reads remain
permitted. The in-memory retained descriptor boundary accepts only its virtual
path and never forwards a write to the OS. Unexpected disk paths or flags fail
the test. The guard remains installed around the corrected tests.

Before changing their fixture storage, the guard was added and the focused pair
was run with `python3 -B`. It blocked the original `TemporaryDirectory` calls
before directory allocation or any raw fixture write. This safely reproduced
the reviewed storage violation as RED without replaying the unsafe private
payload copy:

`python3 -B -m unittest test_preparation.Preparation008Tests.test_plus_v8_trusted_record_is_checked_before_update test_preparation.Preparation008Tests.test_plus_v8_valid_refusals_keep_exact_retained_bytes_and_session_binding`

RED result: Ran 2 tests in 0.091 seconds; exit 1, 25 expected assertion failures
at the allocation guard. No syntax/import failure or unsafe raw write occurred.

After the in-memory storage correction and final exact-accounting/original-read
assertions, the identical focused command produced:

GREEN result: Ran 2 tests in 0.124 seconds; exit 0, OK; zero failures/errors/skips.

The required eight 008 tests then ran:

`python3 -B -m unittest test_preparation.Preparation008Tests`

Result: Ran 8 tests in 4.837 seconds; exit 0, OK; zero failures/errors/skips.
All production checks in these eight tests remain active, including the
historical loader, source projection/policies, witnesses, nested identity
controls and extraction accounting.

All unittest commands ran from the arithmetic package directory. From repository
root, a separate `python3 -B` heredoc used `ast.parse` and SHA256 on the test
and production files: both parsed, the test hash matches the binding above and
production remains exactly at its frozen fix1 hash. No bytecode was generated.

## Limits And Remaining Gates

The full Python regression was intentionally not repeated: parent explicitly
assigned the focused pair/eight 008 tests now and owns the full integrated run
after lifecycle integration. Node/syntax suites, target/native/display launches,
external native-evidence tests, preparations, archives, captures and independent
rereview were not run by this worker. Parent had already frozen JS fix1 and
freshly passed its Node suite before activating this task.

This correction addresses only the two named extraction tests and does not
claim a broader fixture-storage review. Production remains frozen, qualification
and denominators remain unchanged, and this work establishes no live parity or
capture result. Parent owns focused rereview and subsequent integration gates.
