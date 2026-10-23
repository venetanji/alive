# Arithmetic Preparation006 Private Install Trace

Implemented the accepted bounded diagnostic brief in exactly `controller.js` and `test_helpers.cjs`. The accepted capture005 investigation, SHA256 `ac15007e4ee7f7f2a85cde2205bb748ce816839d7ac2a3a765d182dce46d595d`, remains unresolved-boundary evidence. This change diagnoses progress; it does not fix or identify the timeout's root cause.

## Behavior And Private Schema

Tracing activates only for the strict request51 / operation / install / plus / revision1 / action-revision1 / `install-plus-r1` conjunction. It verifies the pinned source, owner inlet2, revision and owner working-path agreement. The sidecar is derived solely from the already sealed config/ACK directory, requires exact `config.json` and `ack.json` basenames with common directory agreement, rejects relative dot segments and refuses an existing sidecar without modifying it. The filename is `install-plus-r1-trace.jsonl`; no configurable generic destination was added.

Every ASCII JSONL row carries ordered `seq`, fixed request/step/action/document/revision/source/owner identity, attempt, phase, wall-clock milliseconds and elapsed wall-clock milliseconds. The initial command-consumed row binds the working path. Clock intervals include synchronous trace-writing overhead; they are not monotonic or CPU-attribution measurements.

The trace records command consumption, openfile enter/return, poll scheduling/entry, the already computed root/path decision, validation enter/return/refusal, plus eligibility, capability entry, direct host-call return and normalized capability result. Result writes are outside the capability exception handler. A trace sink error cannot become a capability throw. A result already returned by a capability is retained in memory before a trace error propagates, and the normal private failure ACK carries it if the sidecar cannot accept it.

Already collected anchor diagnostics and geometry dispositions are persisted immediately as bounded `observation-chunk` records, including before subsequent traversal. Chunks carry observation kind/ID and zero-based part/part-count fields; their ASCII JSON data must be concatenated in order and parsed only after all parts are present. Equal per-kind/index observations are deduplicated. A partial group remains incomplete. Existing capability results are copied to private result rows only after the existing call returns; no graph, config, ACK or readback body is copied wholesale.

Terminal failure markers bracket the existing journal append and failure-ACK write. A trace failure fails the installation explicitly and preserves current anchor/geometry diagnostics, original refusal context when one exists, trace error context and already returned capability results in private `install_trace_failure` metadata. Sink/bound failures are latched rather than ignored. Normal journal/ACK handling still runs when possible. If the post-write marker fails, the already-failed ACK is replaced once with its instrumentation refusal context. A successful install has a readiness marker before publishing its unchanged success ACK, with no fallible trace write after that publication.

## Bounds And Site Arithmetic

The hard limits are unchanged from the approved brief: at most 2048 records, 2048 ASCII bytes including newline per record and 2097152 total bytes. Each normal append reserves one terminal record and its full 2048-byte allowance. Crossing any limit writes an explicit `trace-limit` marker within the reserved allowance and refuses instrumentation. A sink failure that prevents that marker remains an explicit failure in the normal private ACK when that channel is available. There is no loop or background task added to the runtime path.

Each eligible failed validation has six existing capability operations. Each contributes three trace rows: entry, direct host-call return and normalized result. The remaining per-poll sites are poll entry, root decision, validation entry, eligibility, refusal and next scheduling: at most 24 rows per such poll, with the terminal poll omitting scheduling. An unmatched poll uses three rows. Observation chunks are deduplicated independently; changing observations consume the same finite budget and may explicitly refuse rather than expand it.

The complete synthetic 80-poll path contains 70 eligible failed validations and ten unmatched polls. Its arithmetic is four initial rows, `70 * 24 - 1` eligible-poll rows, `10 * 3` unmatched-poll rows, 22 initial observation chunks and five terminal failure rows: **1740 total**. The 70-poll persistent-refusal path contains 1710 rows. Even the conservative counterfactual allowance of 80 fully eligible polls plus those initial chunks and terminal sites is 1950 rows, before optional success-bind sites; adding four such sites still stays below 2048. The actual failure path terminates at its unchanged attempt bound.

Measured synthetic 80-poll sidecar: **644956 bytes**, maximum **947 bytes** per record, **420 original capability calls**. Every line is ASCII. No configured trace limit, runner deadline or runtime retry capacity was expanded.

## RED And GREEN Evidence

The implementation followed the test-first sequence:

1. With frozen005 production code, all existing tests passed before the new regression failed: request51 did not durably create a sidecar before its terminal ACK.
2. The first implementation passed the expanded suite. Adding the direct post-call regression failed with zero direct return markers instead of six; the boundary marker was then added outside the capability catch.
3. A partial-observation regression failed because collected geometry was buffered until validation ended. Immediate, deduplicated observation hooks fixed that gap without adding target probes.
4. The final full Node helper suite and both syntax checks exit0 after production/tests were frozen.

Final command results:

```text
node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs
node --check experiments/max-reference/arithmetic-roots-runtime-20261022/controller.js
node --check experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs
```

The Node suite verifies durable phase ordering and identity, path/source/pre-existing-sidecar refusal, partial observation prefixes before host return, unchanged actual host-property/geometry/capability counts and call order against an untraced install, available/unavailable/throwing/property-throwing/ambiguous outcomes, sink failure with retained returned result and original refusal, and each record/record-byte/total-byte bound. Synthetic interrupted-open and getter tests inspect the durable prefix from inside the host call; they do not claim to reproduce a live blocked call.

The persistent strict refusal still uses 70 polls and 420 calls; no-match still uses 80 polls and zero calls; every schedule remains 100ms. Synthetic 43ms callback costs reach 10010ms with no deadline or retry change. A real bind fixture preserves the minimum ten attempts, and eight initial unmatched polls require thirteen total attempts to obtain five stable passes. Healthy traced and untraced refusal ACK bodies agree after request-identity normalization. The private journal contains only its original harness-error row, with no progress events.

All005 direct/serialized topology, owner-inlet, exact plus-geometry and times-tolerance regressions still pass. The twelve identity and eight geometry invalid cases make zero calls and retain zero numeric observations. Trace-specific invalid topology/geometry controls also suppress all capability entries. Strict plus class refusal remains; no numeric/controller/V8 policy or source descriptor changed.

## Frozen Scope And Bindings

Read-only comparison against the sixteen historical005 implementation/test files finds exactly the authorized two differences. The other fourteen files and frozen score are byte-identical. Runner, comparator, Python, V8 and lifecycle policies remain unchanged. Private capture005 and historical005 directory inventories match the investigation's retained checks.

| Binding | SHA256 |
| --- | --- |
| `controller.js` | `f86d3deb2bfaaacffa1be17e8d0d1e9f288b28ef0dd1a4a52d7909c7747228cf` |
| `test_helpers.cjs` | `0b52117223f5b6554db0e6c993f87d6209a2050e29ee98426cb859fd77aada84` |
| Two-file map | `e0fa5c912d19c9499dc67732cdb5da5aace6e05aac6ae5443f395b5ce4b932f4` |
| Current ten-file package | `4e64a9ad5af3f27a43e231eeadde0feebce842dc09c1de47f74c97527aa4a2c0` |
| Current sixteen-file map | `d2268c3f657b6b0c94a25519755746b014671b893b59181bbe5e3b5ffecb1438` |
| Frozen score | `95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb` |

Map bindings use canonical sorted filename/SHA256 JSON with compact separators. The ten-file map uses the unchanged `PACKAGE_FILES` list. These are code bindings, not a fresh preparation or capture identity.

No private evidence body, source vector, creation operand, value/default or raw configuration is reproduced in this report. No preparation, launch, commit or delegation occurred. The parent owns combined verification, independent scoped review and any fresh preparation/launch. Target availability, runtime trace overhead, live plus eligibility and capability behavior remain unmeasured. The trace may end at an unreturned boundary or incomplete chunk; that localizes retained progress without identifying an underlying host cause. Qualification remains0/2103, saved order is unobserved, and the full 78 operations / 504 states / 141 emissions / six independent closes remain required.
