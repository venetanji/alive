# Preparation004 Fix1 Independent Review

Disposition: P1 addressed, P2 addressed. No new finding in the scoped fix or
private Basic proof interface. Specification and task-quality verdicts are PASS
for this frozen fix scope. This is code/synthetic review acceptance; no
revision004 preparation or application execution occurred.

## Scope And Frozen Binding

Reviewed the fix1 brief, both new implementation reports, combined delta, exact
ten-file hash map, changed production code and focused tests. Only
`v8-readback.js`, `test_helpers.cjs`, `lifecycle.py`, and `test_lifecycle.py`
changed from initial004. Every current file matched the supplied map before and
after the independent probes.

Combined canonical filename/hash map SHA256:
`22d237c6efd59c8aa87acad901da09028999e369d62c89deb1cc3fe646da177a`.

The accepted initial review remains unchanged at SHA256
`5dc92022e0df68dc95aea0fca95b6322d33c455d23569f01cf1dd30584ce3656`.
Initial004 archive binding remains
`92677edf00fad9cabb88ad69b1e4f4a5f6b937c9f7018bdec9c2f814ba78fae9`.

All code references in this report are relative to
`experiments/max-reference/arithmetic-roots-runtime-20261022/`.

## Per-Finding Review

### P1: Addressed

`v8-readback.js:423` now collects a fresh bounded Basic inventory and separate
observed input/output patchcord arrays. It checks complete original/leaf names,
duplicates/extras/missing entries, actual original and leaf classes, finite
rectangles, exact original geometry under the existing measured policies,
source text/empty/port metadata, and both duplicate-sensitive endpoint
multisets. The three gated numeric objects reuse their fresh admitted witness
classes/geometry; other original runtime classes stay strict. The collector
adds no full seven-number getter sweep.

`v8-readback.js:524` invokes this path unconditionally for every owner, including
plus/minus, and `v8-readback.js:574` retains the exact private nested envelope.
The outer root proof still checks the container's source name, actual permitted
class, exact geometry and top-level working owner.

`lifecycle.py:449` independently validates the envelope, current owner/request/
source/path/Basic name, strict integer identities and ports, complete original/
leaf inventory, source descriptors/text/empty/ports, actual classes, exact
permitted geometry, and separate endpoint counters. `lifecycle.py:559` makes
the payload mandatory on every close; `lifecycle.py:606` checks it after the
outer root proof and five representation witnesses. `lifecycle.py:842` still
replays retained closes through `_verify_close` and `_root`, so historical
Basic evidence receives the same semantic validation.

The four original P1 mutations now refuse pre-close:

| Original Reproduction | Actual Fix1 Outcome |
| --- | --- |
| Nongated Basic class changed | Refused: `basic-original-class-or-geometry` |
| Nongated Basic duplicate varname | Refused: `basic-object-identity-changed` |
| Nongated Basic geometry changed | Refused: `basic-original-class-or-geometry` |
| Existing Basic patchcord destination inlet changed | Refused: `basic-runtime-endpoint-changed` |

Every refusal retained three numeric plus four root diagnostic rows. The
endpoint reproduction uses the existing observed patchcord `dstinlet`; no live
port-count getter is assumed.

### P2: Addressed

The try/catch at `v8-readback.js:520` now covers Basic collection and all later
root original/harness/geometry/endpoint/route checks. Its closing catch at
`v8-readback.js:576` attaches the already-collected representation diagnostic.

Both original direct root-failure reproductions refuse at the expected stage
and now carry three numeric plus four root rows. Both original serialized
`lifecycleproof` reproductions retain a non-null representation diagnostic:

| Original Reproduction | Actual Fix1 Outcome |
| --- | --- |
| Reader harness class mismatch | Refused at `harness`; seven rows retained |
| Root lifecycle destination-inlet mismatch | Refused at `routes`; seven rows retained |

No earlier source-binding or unavailable-inventory contract was broadened.
Existing suppression of numeric probes for incomplete root/Basic coverage
remains in place.

## Private Interface And Capability Boundary

The exact nested `arithmetic-basic-retention-v1` envelope matches the fixed
brief: request and operation IDs, close step/action, source owner/revision,
working path, Basic varname, actual box rows, and separate endpoint arrays.
The JavaScript producer and independent Python consumer agree on the fields
and strict endpoint semantics. Public function signatures, returned lifecycle
metadata keys, and five representation-witness schemas are unchanged.

Basic binds by its unique root-enumerated saved varname and the outer root
proof's existing source class/geometry checks. Endpoints bind by captured unique
varname, sealed source port bounds and exact multisets. Code inspection found
no new JavaScript wrapper-equality assumption. A reviewer probe supplied fresh
root and Basic object wrappers on each traversal, fresh patchcord endpoint
wrappers, and a throwing `getnamed` accessor. Pre-close still accepted the
complete fixture and performed exactly the existing three format/value probe
pairs. It retained 35 actual Basic rows.

Source class descriptors and actual observations stay separate. New source-text
hashing uses sealed strings and introduces no live text getter. There is no new
live port-count getter, setter, input, or plus/minus numeric probe. The Basic
snapshot remains private.

## Independent Verification

The reviewer reran the exact executable reproduction from
`preparation-004-review.md` against fix1. All six direct probes and two serialized
wrapper probes returned the corrected outcomes described above. The synthetic
fixture prefix also covers both times revisions, plus/minus revisions1/2,
fresh repeated probes, incomplete-inventory suppression, getter/input
constraints, Basic corruption cases and later diagnostic retention cases.
This was a focused fixture-prefix run, not a duplicate full-stage suite.

Additional original in-memory review probes established:

- Fresh root/Basic/endpoint wrappers succeed without reference identity and
  without consulting `getnamed`; the three admitted format/value probe pairs
  remain the only numeric probes at close.
- A source cable intentionally present twice succeeds when both observed
  endpoint arrays retain both copies; removing one input copy then refuses and
  retains all seven diagnostic rows. The synthetic accepted proof contains
  21 input and 21 output endpoint rows in this duplicate-cable case.
- JavaScript-collected full root proofs for both times revisions pass the
  independently loaded Python `_root` validator. This cross-language probe
  completes only omitted metadata in the original synthetic fixture (Basic
  anchor and generic source-box hashes) and binds the independent validator to
  that fixture's original synthetic pin tables. It does not alter frozen code
  or use licensed values. Duplicating one Basic input row in either accepted
  proof is independently refused by Python.

Reviewed test coverage includes all six mandatory Basic envelopes and valid
duplicate cables (`test_lifecycle.py:302`), missing-proof refusals for all owners
(`test_lifecycle.py:317`), payload and source-descriptor corruption, exact
measured geometry, all six forged histories after synchronized outer digest/
byte rebinding (`test_lifecycle.py:451`), and a forged prior endpoint multiset
at the next close (`test_lifecycle.py:463`). This confirms meaningful tests for
both acceptance and semantic refusal rather than only stale-digest detection.

The parent separately reports fresh combined verification: 63 Python tests
ran, 62 passed with one intentional opt-in skip; the full Node helper suite
passed. These are parent results and were not duplicated by this reviewer.
The independent lifecycle implementer reports 20 focused lifecycle tests
passing. Both fix reports preserve their test-first RED/GREEN records.

## Specification And Quality Verdicts

Specification: PASS for P1, P2 and the resulting private Basic proof interface.
Full fresh Basic checks now cover all six owners and retained history;
duplicate-sensitive source/observer endpoints, actual classes and source text/
empty/port metadata are preserved. Later failures retain the seven-row
diagnostic. No representation transfer or new getter/wrapper capability claim
was found.

Task quality: PASS for this scoped fix. The changes stay within the four agreed
files, the independent validator remains stdlib-only and independent of the
producer/arithmetic implementation, and focused regressions cover the original
gaps plus the new proof and replay path. No open finding remains in this scope.

## File And Input Hashes

| Stage File | SHA256 |
| --- | --- |
| arithmetic.py | 68c0eae3f620b3e262e78f78e7f64fde3bf9f26f2ce1a5c993abc0a406526f4a |
| controller.js | d8d8730386d7b7dbd1228af9071394d4a50ce0864290d7741d0b9fe1f6452304 |
| observer.js | ca8c15e16ffe11acfa5e279d53da0aec8814baa78fac3ced6208b36757f41399 |
| v8-readback.js | 48dc878ef645df6491b2ba0d59d616c34464c0761991664d760ee3b1cd6fc4e3 |
| lifecycle.py | 74cc5c1ecd05f32d840dcd6c5516878ed678c55e81c3e7b32f85ba0321ab8508 |
| lifecycle-observer.js | d582fcffe982b631ddd453238c6f0a1006e54f0f5968d21083e9f3d04b2ac847 |
| prepare-runtime.py | 74b069f7202ff462dbd92374de7cda5de88d4bfeba110795a765e162778039d4 |
| test_preparation.py | 34c525120fbc787a7c42e3441b6d6fdc86c6d04090cf976a485afb2f5ba849df |
| test_helpers.cjs | 31024fc10f49aaf8c100b1a777ceabd7bff8a0062a1fd54a1219e02b80f922ef |
| test_lifecycle.py | 4bce4ff00b50974cc2c35c74c54ebee3369d0003ac1781c9a95c80567a96d0b6 |

| Review Input | SHA256 |
| --- | --- |
| preparation-004-fix1-brief.md | 16048596efc803f6c49dd144a98db81871b97939033b6b424266f35399afae1b |
| preparation-004-fix1-review.diff | 695cf37a198dc33a36c202e11291b7fdb61878c9cafa4441ea8c8f4a9f31911a |
| preparation-004-fix1-review.json | 3184d93d036ce3a1c91889a8d6313eca4e0d1037592d063b60745945eeb130fd |
| max-preparation-004-fix1-report.md | 2cdadb004784664ac58dc506901de1403ba741c6e4bd7d12f71268ca8858753f |
| preparation-004-lifecycle-fix1-report.md | 98b03f11409d0e12ccbe13cf70adc547e866551b64f858224e16b606e2812b97 |

## Residual Limits

No code, preparation, Max/Wine/display/capture launch, commit, native score run
or subagent delegation occurred. This report adds no real runtime success,
getter-silence, callback-order, parity or qualification claim. Capture003 stays
FAILED, complete=false, with zero completed score operations. A fresh sealed
preparation and any real execution remain separate parent work. Licensed
values, geometry vectors, configuration/graphs, raw bodies and credential state
were not printed or copied into this report.
