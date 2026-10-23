# Capture006 Private Trace Investigation

Date: 2026-10-23 (Asia/Hong_Kong). Read-only investigation; design proposal only.

Capture006 establishes 61 completed, matching-root plus validations with three repeatable controller class mismatches, four accepted exact geometry dispositions and 366 completed existing capability calls before the runner's ten-second request51 deadline. It does not establish a terminal controller ACK, a successful plus installation or the cause/cost of capture005's unmeasured path. No code change, preparation or launch is made by this report.

## Evidence And Binding

| Evidence | SHA256 / Identity |
| --- | --- |
| REA capture, parent supplied | `ev_a0ed6947bdad1fbe7e7ba19b62634a570fdff7803e7db65363b019dd0db409c8` |
| Consumed ten-file package | `b140eddbac9d134e162ff4cfdf2388be1285cf45b9127bd8bcc0d253ff0e99e5` |
| Consumed controller | `c0b0a45ef7a72a484fa976774f5a10e1ca9fcf6892603f723fb7df6c220a3d97` |
| Private trace | `2b3287e45de1123f8ac7582544aa13da5dbfba6650d2aa33e7a46b5f8be39a63` |
| Private config | `4a922bf0b1e2d2c5755eb339d0fa8e73a4139f74c5acc3b92352388e85a167ad` |
| Private seal | `3e5b31cdcb62618e08444d35c2ec20815cf07a21aad86de4d058ca6a94170935` |
| Public session | `fc827c8b6638dffd69d6283b5d08f9cc94874521bdf95377fe0cae466c8bca36` |
| Public capture projection at inspection | `66cd5472ba501e91309ee813a87ac21290eae7100a6749687f861dba1e4af6a9` |
| Frozen complete score | `95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb` |

The inspected private directory is `arithmetic-max-runtime-006`. The trace has exactly 1490 complete ASCII JSONL records, 568562 bytes, maximum955 bytes per record. Every sequence number, request51/step/action/plus/revision1/source/owner-inlet2 identity and elapsed/wall-clock relationship validates. Observed wall-clock samples are nondecreasing. The consumed controller hashes correctly, its seal names the final006 package, and the config's package-file map equals the sealed map. The independent audit owns full preparation/evidence/native/times-proof verification; this report does not substitute for it.

The pending command is still request51, `install-plus-r1`; current ACK50 is successful `close-times-r2`, with SHA256 `7d6f07dde2a6bc778e2c7c926a5fddf84eafb5b51e8eb3d79e769b4df146c7ef`. There is no retained ACK51. The journal remains95 rows with no request51 row and no harness-error row. The private failure is `TimeoutError`. The command-file to failure-file wall timestamp interval is10.03417455 seconds. These filesystem intervals are not recorded monotonic execution timings.

## What The Trace Retains

The trace contains one command-consumed/open-enter/open-return sequence, 62 poll-scheduled records including initial scheduling, and 61 each of poll entry, root decision, validation entry, plus eligibility and validation refusal. All61 root decisions have a root and a matching path. Every eligibility result is ready with three candidates and three diagnostics; every refusal retains three diagnostics and four geometry dispositions. No bind, terminal failure, limit marker or ACK phase occurs.

The existing full-inventory precondition requires20 rows/objects, exactly the three candidate diagnostics and all current geometry/source/helper/root/owner bindings before it can emit ready and call capabilities. The consumed005 P1/P2 checks are unchanged in the captured controller: available root parent exactly null, strict owner inlet2, exact saved/pinned plus geometry, original source/box/text identities and current install/request ownership. The trace records the resulting decision; it does not independently serialize every root property read.

All22 observation chunks reconstruct seven complete JSON payloads: four geometry dispositions, four parts each, and three anchor diagnostics, two parts each. Chunk IDs/parts are contiguous and complete. Each reconstructed geometry policy exactly equals the corresponding private configured policy. Each diagnostic's expected class/rectangle equals its source descriptor. Payloads are retained privately; their vectors and values are not reproduced here.

| Numeric Anchor | Source-Expected Class | Exact Geometry Candidates | Actual Candidate Class |
| --- | --- | ---: | --- |
| `root/obj-2/obj-1` | `flonum` | 1 | `number` |
| `root/obj-2/obj-24` | `flonum` | 1 | `number` |
| `root/obj-2/obj-23` | `flonum` | 1 | `number` |

Each numeric diagnostic includes16 Basic-scope candidates and exactly one at its exact source rectangle. The four geometry dispositions are at `root/obj-1`, `root/obj-2`, `root/obj-2/obj-4` and `root/obj-3`; they are not geometry failures. The numeric source cohort's canonical ordered anchor/box/text binding is `31e249de8a69dd317ae9b50f93bca88e3da8392edda68dd7b66865e6a0c98a89`.

Thus the class-refusal diagnostic basis survives even without ACK51. The anchor chunks were intentionally persisted before adding numeric observations to those diagnostic objects; their absence inside the chunks is not missing capability evidence. Capability results are separately durable. The exact aggregate exception string is not recorded by the trace, but the sealed code throws aggregate hierarchy refusal when these three diagnostics remain. A terminal failure ACK or terminal journal refusal was never reached.

## Capability Results

All61 attempts use the exact same order: the three numeric anchors in source order, format then getvalueof for each. Every one of the366 entries has a direct call-return marker and normalized exit. There are no unavailable, throwing, ambiguous, null, undefined or nonfinite outcomes in these observed calls.

| Existing Operation | Per Anchor | Overall | Stable Representation |
| --- | ---: | ---: | --- |
| `getattr` for format | 61 | 183 | returned scalar-number |
| `getvalueof` | 61 | 183 | returned singleton-number-array |

Within and across the three anchors, every normalized format observation is identical, and every normalized value observation is identical. Private comparison verifies all183 value observations are finite and exactly equal the corresponding source-derived initial numeric value. This is observed getter equality; it is not a source-default startup message, original scalar receipt or inferred semantic tag.

For reproducible private equality checks, the canonical normalized format-observation SHA256 is `1a66370eea964e643299a17b32c10e81a91757360fcec24b5ba08c16f7b85710`, and normalized value-observation SHA256 is `2aac570e7076cb6271561b1eb337b2852262955ae09001c25a63b9ba6a5caf4c`. The captured format-code finite-vector digest is `dcdadd560ab2234a2bf2d2b5ed44e5d7640e88eefe6bdbc98aa84aaf31649983`; the independently source-derived initial-value digest is `1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121`. These hashes bind private observations; the underlying values remain private.

## Instrumented Timing

All intervals below subtract trace wall-clock samples. Each includes the trace sink and other work between those samples. It is not a measurement of the native call alone or an uninstrumented callback's CPU time.

| Interval | Count | Minimum | Median | Mean | P95 | Maximum | Sum |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Validation entry to refusal | 61 | 31ms | 34ms | 59.54ms | 55ms | 1448ms | 3632ms |
| Poll entry to next scheduling marker | 61 | 34ms | 37ms | 62.48ms | 59ms | 1450ms | 3811ms |
| Scheduled marker to next poll entry | 61 | 98ms | 99ms | 100.46ms | 100ms | 170ms | 6128ms |
| Poll entry to root decision | 61 | 1ms | 1ms | 1.43ms | 2ms | 2ms | 87ms |
| Format entry to direct return | 183 | 0ms | 1ms | 0.72ms | 1ms | 1ms | 131ms |
| Getter entry to direct return | 183 | 0ms | 1ms | 0.69ms | 1ms | 1ms | 126ms |

Command consumption to open entry is1ms; open enter-to-return is15ms; initial scheduling is recorded at16ms. The61 callback intervals plus61 between-poll intervals and initial16ms sum exactly to the final9955ms elapsed time. The first poll's between-marker interval is170ms. The scheduled marker occurs after the existing Task scheduling call, so these gaps are observed marker intervals, not exact scheduler latency.

The largest adjacent trace interval is1415ms in attempt40, between plus-eligibility at elapsed5625ms and the first capability-entry marker at7040ms. That poll starts at5603ms, refuses validation at7053ms and records scheduling at7053ms. The interval contains eligibility-row sink I/O, context setup and the first candidate's repeated binding checks before capability entry, plus any host/descheduling costs in that boundary. It is not inside a measured format/getvalueof call. The trace cannot distinguish those costs or attribute CPU, file I/O or policy-loading cost within the gap.

The final record is attempt61's scheduling marker at9955ms. The failure file's wall timestamp is approximately65.49ms later; its file modification timestamp is63.52ms after the trace file's. The next100ms poll was scheduled, but poll62 does not appear before runner cleanup. The persistent matching-root refusal threshold is unchanged at70, so the recorded loop had not reached the terminal refusal branch. No trace limit or sink refusal is observed. This establishes the capture006 sequence that reaches the runner deadline before terminal controller refusal. It does not establish what happened in capture005 or what an uninstrumented run would cost.

## What Remains Unmeasured

Plus never reaches bind, so its observer leaves, V8 reader and independent lifecycle disposal helpers are not installed by this request. Missing plus journal receipts cannot establish getter silence. The trace does not observe original outlet messages, initial startup emissions, scalar receipt tags, typed arithmetic behavior or endpoint state for plus.

Legacy controller results establish no V8 behavior. Plus V8 actual numeric/root/subpatcher classes, method availability, format/getter shapes, initial/event values and live endpoint/route enumeration remain unmeasured. The current V8 diagnostic producer `collectRepresentationDiagnostics` explicitly returns null outside times, and its admitted numeric/root representation policies are times-bound. Reusing those policies or changing a source class globally would transfer unmeasured behavior across source/engine boundaries.

Revision2 plus behavior is also unobserved in capture006. Any later independently owned revision must satisfy fresh source/helper/root/path/owner/request conjunctions and fresh capabilities; this revision1 trace must not be treated as an observed revision2 readback. Full times/native proofs are handled by the independent audit. No completed arithmetic comparison, saved order, silence, parity or qualification increment follows from this trace.

## Smallest Proposed Next Step

After the independent capture006 audit freezes and the parent accepts the design, introduce a distinct plus-only legacy-controller representation gate for exactly these three source anchors. Bind it to the exact plus source, helper identities, source box/text hashes, saved geometry, source-derived initial-value hashes, the captured legacy method/shape/code witnesses, request/owner/path constraints, consumed controller/package/config/seal, this complete trace hash and the frozen audit hash. Bind the failed capture as trace evidence; do not invent an ACK51 or successful-install provenance.

Preserve the current two-stage plus preflight: validate the entire20-object hierarchy, exact geometry and all three candidate/source/helper/root/owner/request identities before any numeric capability. Collect fresh existing format/getvalueof observations on the current actual objects and require all three to match the separately pinned controller witness, including finite source-initial equality. Only that complete cohort can satisfy the narrow controller representation check. Retain actual runtime `number` and authored/source `flonum` as separate facts; do not rewrite descriptors, allow a generic class alternative or clear unrelated diagnostics. Request-local/root/object-bound witnesses must remain valid through the existing bind resolution without an unmeasured fallback or duplicate capability calls merely to manufacture policy evidence. Invalid identity/geometry/unavailable/throwing/ambiguous/mismatched representations continue to refuse.

This proposal is a new plus-specific evidence gate, not a transfer of the times controller policy. The allowed anchors, source/default/geometry/helper pins and capture006 provenance must be independently validated. Existing times/minus behavior, source contents, original inputs/outputs, trace failure latch/bounds, ten-second ACK deadline,100ms scheduling,70/80 attempts, stable criteria, lifecycle proofs, full score and denominator remain unchanged. The next capture would test whether the gate permits a real installation; this report does not predict success or elapsed time.

Separately, the next source-bound V8 request needs a diagnostic-only plus producer if the existing readback path reaches that unmeasured boundary. It should retain actual classes, unique source-bound objects, available methods/return shapes and endpoint metadata with fresh helper/source/request/owner/root checks, while keeping strict refusal. No V8 representation admission is justified until its own evidence is captured and audited. Do not infer a V8 gate from these legacy singleton arrays or from the times V8 scalar result. Getter silence and actual scalar receipt tags still require their existing independent observation paths after observers are bound.

## Write Scope

This report is the only investigation artifact. All trace parsing, chunk reconstruction, private equality comparisons and interval calculations were in memory. No private writes, code/policy/score changes, preparation, target/display/native launch, commit or delegation occurred. Source bodies, geometry vectors, operands, defaults and raw configuration/ACK/readback payloads remain private. Qualification stays0/2103; all78 operations,504 states,141 original emissions and six independent closes remain required before full comparison can pass.
