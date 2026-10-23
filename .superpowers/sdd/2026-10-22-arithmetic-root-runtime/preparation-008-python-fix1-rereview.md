# Preparation008 Python Fix1 Independent Rereview

Date: 2026-10-23 (Asia/Hong_Kong).

## Findings

1. **P2 - The extraction tests write private-derived raw payloads to general temporary storage.** `test_preparation.py:574` reads the genuine007 failed readback, then `test_preparation.py:580` creates a default `tempfile.TemporaryDirectory()` and `test_preparation.py:581` copies its exact bytes to `raw.json`. Successful refused-result retention also writes `retained-raw.json` there. The invalid/missing-context controls repeat the raw copy at `test_preparation.py:593` and `test_preparation.py:601`. In this environment there is no `TMPDIR`, `TEMP`, `TMP` or module-level `tempfile.tempdir` override; Linux tempfile selection starts at the available `/tmp`. The resulting destinations are `/tmp/tmp<random>/raw.json` and, for valid refused results, `/tmp/tmp<random>/retained-raw.json`, outside the private evidence root. This is actual capture/source-derived data: the failed envelope contains private diagnostic rectangles and scalar observations, and the new test's success/invalid-success/mismatched-operation payloads inherit private geometry/scalars through `plus008_fixture` at `test_preparation.py:336`. Its narrow mutations do not remove that content. The directly adjacent trusted-record test also writes the fixture's private-derived raw success through a default temporary directory and `write_json` at `test_preparation.py:555` and `test_preparation.py:556`, then retains it on successful extraction. Directory mode0700, file mode0600 and automatic cleanup do not meet the required storage boundary. Keep every raw/retained byte in these exact two extraction tests in memory with mocked I/O while preserving their production validation, exact-byte/accounting and invalid-context assertions. Do not reproduce the original failed payload or source-derived success fixtures in the repository or general temporary storage. This finding is limited to these two directly related extraction tests; no broader fixture review is included.

The two original P2 production findings are **ADDRESSED**. Overall specification verdict: **CHANGES REQUIRED**. Code-quality verdict: **CHANGES REQUIRED**. The remaining blocker is the extraction tests' private-data storage behavior, not the production retention or nested-type fixes.

## Original Findings Rechecked

**Valid refusal retention/accounting:** `arithmetic.py:1777` validates the trusted record independently of raw result admission, including exact request/step/action/document/revision/source/path and action-document/revision fields, strict positive request/operation IDs and strict revision type. Missing/invalid context refuses before retention or record updates. With valid context, `arithmetic.py:1786` retains the original payload and updates the existing hash/size binding before parsing and checkpoint admission. Thus both the five-key failed envelope and later-invalid success remain retained/accounted while refusal propagates. Successful payloads still require strict raw/trusted identity and causing-operation agreement at `arithmetic.py:1791`, followed by full checkpoint/witness validation. No serialized `op` field is introduced and no failed result becomes successful.

**Nested source identity typing:** the new helper at `arithmetic.py:201` checks exact edge/leaf row schemas, list containers, actual Python integer indices/ports, ordered edge indices, known string identities and source/destination bounds. Leaves additionally match their complete ordered source-derived definitions. These checks precede `_source_canonical` in the projection path, so whole-valued float and boolean identities cannot disappear into normalization. The metadata scanner now rejects malformed descriptor arrays/rows with `ValueError`. Finite numeric equivalence remains available for geometry/scalar values rather than identities. The changes are confined to these two production boundaries.

## Frozen Inputs And Scope

| Artifact | SHA256 |
| --- | --- |
| Accepted design | `79e6d3bd2db09eb87a6d62f02752989c1d571411a2d4afcb8de019866c11943a` |
| Original Python review | `13c3a4446feb607d5cbf4ee233707e053e5857bdc191098016541ed31fd95f54` |
| Python fix1 brief | `027c1e0df58dced6049e6cb5d564fb0f46f8ff454c237c8133be9c6c8dc0fb78` |
| Python fix1 report | `1ee09bb5a210157af9b366969667585905e1e589bc310f1906ef005a83fd8002` |
| Python fix1 diff | `1325359b988e0fb377a0a23eda0e2c1ab8f2c3992ffd78b6020b2106d9c79254` |
| Python fix1 map | `a8e3b5810e0ab76f1baaf02f9ff432a1e7592ab2c43773f8e0d5596ff10609f3` |
| Frozen `arithmetic.py` | `f52c868b613ba66724711e83d81d89c25d09ea2978b1484eb0c7698440725812` |
| Frozen `test_preparation.py` | `f1de3bbb5b8b4d3228a11516556fb9005607f01e2063c6dcc0baab63f0617d0c` |
| Immutable initial Python binding | `a22ddee8c578a42d582ccd6a1e1558b9db5c692c15ba60439d73c0294fa6ad26` |

Read the378-line frozen fix1 diff once, the original review, fix report/map/brief and applicable common/design boundaries. Exactly the Python production/test pair differs in this task map, with corresponding test hunks. Authorized concurrent JavaScript fixes are outside this Python freeze.

Narrow outside-diff reads addressed named interface risks only: whether the failed envelope remains unable to pass checkpoint admission after retention; how `read_private`/`retain_raw` treat bytes and file modes; how the new test's fixture derives private content; and where default tempfile allocation sends those bytes. Parent's bounded ruling includes the directly adjacent trusted-record extraction test, whose default-tempfile/write_json behavior is visible in the supplied diff context. No broad re-audit or complete/focused unittest rerun occurred.

## Evidence And Test Quality

A read-only `python3 -B` check inspected the original file at `/home/venetanji/.cache/alive-ultra-evidence/arithmetic-max-runtime-007/observations/request-52-plus-r1.json`. It is5350 bytes with SHA256 `87459a07efa7a7f8d0bdcaba10148f138369d080104324e520cc7fb1aaf1fd71`, has five outer fields and `success=false`, and contains the V8 diagnostic object. Aggregate shape inspection found13 `rect`/`live_rect` fields and six format/value-observation fields; no geometry or scalar values were printed. The test copies these bytes unchanged. The same test's positive fixture reads private007 config/diagnostics, copies measured numeric observations and root rectangles, and constructs source-derived Basic rectangles and numeric values; canonicalizing its mutated success payloads therefore does not make them public or wholly synthetic.

The tempfile source, current environment and test call sites establish the exact source and destination form without replaying the unsafe write. Random directory suffixes are generated during each invocation and were not retained in the report. This review created no temporary fixture or duplicate raw file and makes no claim to recover past deleted random suffixes.

The new tests meaningfully cover valid failed-envelope retention, later-invalid success, forged-success operation IDs and missing/changed trusted fields with byte equality and exact record accounting. The nested-source test covers64 corruptions through both metadata and full-checkpoint consumers, guards the normalizer so refusal must occur earlier, and includes positive geometry/scalar-equivalence controls. Earlier test content remains intact.

Worker-reported RED evidence has three expected missing-retention subtest failures and separate nested-type failures reaching the guarded normalizer or malformed-container exceptions before the fixes. Subsequent focused controls and the full suite pass in its report. Parent independently reports a fresh full Python run of79 tests,78 executed passes and one existing external-native-evidence skip, exit0, session57793. These suites were not duplicated here; the new finding follows directly from byte flow and destination selection rather than an uncovered production failure.

## Preservation And Remaining Gates

All26 private arithmetic inventories remain unchanged, including names, modes, sizes, mtimes, inodes, file hashes and link targets. Frozen Python files, fix1 artifacts, original review/design and immutable initial binding retain the listed hashes. The accepted007 audit and native exact-five inventory remain intact. The privacy finding concerns transient test copies outside those preserved evidence directories.

Only this rereview report is written. No code/private/history write, suite rerun, preparation, archive, launch, capture, commit or delegation occurs. Parent has accepted the new finding and queues a bounded fix to these exact two extraction tests after the JavaScript fix freezes, with every raw/retained byte kept in memory and real production validation retained, followed by scoped review. Integrated verification and later preparation/capture gates remain outstanding; this rereview establishes no live parity or qualification. Full denominators and qualification0/2103 remain unchanged.
