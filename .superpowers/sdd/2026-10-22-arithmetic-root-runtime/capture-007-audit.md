# Capture007 Read-Only Audit

Date: 2026-10-23 (Asia/Hong_Kong).

Audit verdict: **capture remains FAILED, `complete=false`**. No additional evidence-integrity or binding defect was found. Plus installation request51 now succeeds under the reviewed controller cohort policy. Its first V8 readback, request52, explicitly refuses strict class validation. The accepted operation ledger therefore still ends at `close-times-r2`; successful protocol ACKs do not establish a passing checkpoint.

| Measure | Accepted Capture007 | Complete Denominator | Remaining |
| --- | ---: | ---: | ---: |
| Completed operations | 26 | 78 | 52 |
| Events | 22 | 66 | 44 |
| Completed installs | 2 | 6 | 4 |
| Independent closes / explicit empty checkpoints | 2 | 6 | 4 |
| Live readbacks | 24 | 72 | 48 |
| Numeric states | 168 | 504 | 336 |
| Original outlet messages | 47 | 141 | 94 |

There are52 command requests and52 received successful protocol ACKs, plus25 readback requests. The first24 readbacks are accepted times checkpoints; the last is the invalid plus52. Install51 has a successful ACK and a journal completion bracket, but contributes no completed ledger operation because its initial checkpoint fails. The private/public journal has96 contiguous rows:27 completion brackets,22 stimuli and47 original outlet receipts. Row96 is the plus install51 bracket; no request52 journal row, plus event, plus original outlet receipt or revision2 plus runtime witness is retained.

## Provenance And Frozen Bindings

REA evidence: `ev_c19e98841d00f4654a6c405a8d80067f1d966cf11a11106234b93a05a70c13a5`.

The parent directly matched all six original public artifact hashes to the complete retained REA response, with no hash omissions or enumeration truncation. That direct response verification is parent-attested. This audit independently checked all six names, hashes and byte sizes in the seventh metadata projection against local bytes, plus the session/cleanup and retained-evidence bindings.

| Frozen Artifact | SHA256 |
| --- | --- |
| Concrete ready review | `d516e13f12971b3c93293b298263dba5c393b55da0b37a92fb6bb409ed753417` |
| Config007 | `eb44b4930d0bb2504f9739367dad7b144c12b1baada9ac8d37f8bde127ae550b` |
| Seal007 | `cedafaa9aa57b066b7fa19b95580c08b884ef2267bec42c6143429bbd41a9641` |
| Manifest007 | `73b623f8893e5758f8f74cbc4c41f599e291c12cb9d3a662c572d55fcc40bc7f` |
| Historical007 binding | `97a59c54d9185b47c417c876b12ac8b8ebc4734bb80ad7b439e6e5790aaf991b` |
| Final ten-file package | `121d5aa5e3056337306bbe2d7a2771221f53e7adb9750572d934d20ac8a8c978` |
| Canonical sixteen-file map | `f01f727c2f17b10175de23da47a536e6a10f19d609bb7d0e92add241811fedac` |
| Fix1 review map | `e390c4f8e3f450839fcdab1d64283c90ea383233b7dd404b1c9d7f6add3a6a85` |
| Full score | `95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb` |
| Complete native binding | `fa204d268f28711dfa06afca0b0b9556ec43c12574b041d5ccb4f911afb62e7d` |

All22 sealed inputs revalidate. All16 final historical files equal their frozen current implementation files and bound hashes; archive files remain regular, private and single-linked. Config/seal/manifest/package/score and concrete-review identities match the exact brief. The initial historical role string is retained as frozen provenance and is not rewritten after execution.

## Complete Native And Accepted Times Replay

The existing complete native record was independently revalidated in memory without binary execution. Exact five-file inventory, scorer/transport/score hashes, retained file hashes, source bundles, empty stderr, full production transport and expectations, all78 rows, public counts/gates/checkpoints and full lifecycle accounting match. Native coverage remains72 live plus6 empty checkpoints,504 numeric states,141 original outputs,90 cable deliveries and297 typed receipts.

Every accepted times operation revalidates its score action, source, owner, revision, request order, working path and checkpoint binding. All22 exact typed stimuli and all47 typed original outputs match their corresponding rows in the complete native score; output comparison is duplicate-sensitive and preserves strict types, source endpoints and synchronous dispatch brackets. All168 numeric states equal the matching native values and semantic tags at the seven exact source anchors per readback.

Each of24 accepted raw readbacks is byte-identical to its retained copy and bound hash/length. Independent checkpoint validation reproduces the complete private state dictionary, including retention/endpoints, original classes, semantic basis, source/helper/request identities and fresh times representation witnesses. Numeric progress and source-derived pristine installation resets revalidate. Accepted times readbacks have equal before/after journal sequence positions. Getter scalar receipt tags and saved cable order remain unobserved.

Digest over the26 checked action/native-row/journal/checkpoint bindings: `61178c46e4381f87abb0ed352c94734663536529edf3c042e5567a32b33c0ce3`.

Both independent closes revalidate using only write-free `_configuration`, `_verify_close`, `_closed_owners` and `_history`. Neither `validate_close` nor its exclusive retention writer was called. Each proof binds the exact source/owner/request/revision/path/helpers, outer root and driver routes, disposal evidence and independent observer report. Full Basic coverage is16 originals plus19 observer leaves; independently observed input and output route arrays each contain27 exact duplicate-sensitive routes. Source descriptor/text/empty/port integrity and exact admitted classes/geometry revalidate.

Close43 has no earlier close. Close50 revalidates close43 and its observer prefix. A further retained-history replay validates both accepted closes against the last accepted report. Current and retained proof bytes match, and validated-close metadata reproduce the root/ACK hashes and lengths.

| Close Request | Current / Retained Root SHA256 | ACK SHA256 | Validated-Close Metadata SHA256 |
| --- | --- | --- | --- |
| 43 | `177c99827761beaa92dd1a8a597b3111be36417067a36022bf4cb0ac93524057` | `c9f5f4cafb3e008546f7c6c939b94168a38eeaeacc5c4eeb2809a90af9ff8a91` | `286e2e4eecf8a126e5e7b9cf89c1b05963c8016a1e559da97061dbe1ce920dc2` |
| 50 | `228ca84e78211dd71b2a47fc47c7779cd1b08a3497cd4e655321b853d34056c6` | `7c7e2cacacb92740fec28ff4ab35b3a17f23647079109d082f866b0099fb00e2` | `dd70226239fe21f3c4bf8dd74d10b6a787aa8951345d96cae84c3fc69fb5168a` |

Both current and retained root proofs remain in `arithmetic-max-runtime-007/observations/`, using the `lifecycle-root-times-r1.json` / `lifecycle-root-times-r2.json` names and their `retained-` counterparts. There is no final lifecycle-completion file or all-six close barrier.

## Successful Plus Install51

ACK51 SHA256: `ba39c2e9b59c9983d938cb8e500f05aef3b82af830558548e50ef97d31df1a82`.

The ACK binds the exact plus revision1 working file, four measured geometry dispositions, no numeric-mode observations, and three separate controller representation observations. Each observation binds source/box/policy/request/step/action/engine identity and retains authored `flonum` separately from observed controller `number`; `cohort_satisfied=true` is a separate disposition. The complete ordered three-member cohort matches both sealed descriptor views.

Trace SHA256: `bc0e23dc19b130b4bcfe09777a74e56a48f62a9d39860cae7fdc8d3e1a837185`, at `arithmetic-max-runtime-007/install-plus-r1-trace.jsonl`. Its110008 bytes contain268 complete ASCII JSONL rows, strictly contiguous sequences and exact phase schemas. Maximum record size is954 bytes excluding newline,955 including newline, below all frozen count/per-record/total bounds. Every row binds request51, plus revision1, owner inlet2, source, step/action, strict identity/attempt types and consistent finite nondecreasing wall-clock measurements. The first command row binds the exact sealed working path.

Startup is command-consumed, openfile-enter/return and scheduling. Attempts1 through10 each record matching-root, validation-enter, ready eligibility, six ordered capability enter/call-return/exit brackets and validation-return. There are60 returned calls:30 format observations and30 value observations. Attempts1 through9 reschedule; attempt10 ends with exactly one bind-enter, bind-return and install-ready-for-ack, at elapsed1627ms. No validation-refused, failure-handler or trace-limit marker occurs. Binding adds no additional traced capability call.

All22 chunks reconstruct exactly seven nonduplicate source-bound objects: four measured geometry dispositions and three original numeric mismatch diagnostics, emitted at attempt1 only. Object IDs, part dimensions/order, contiguous chunk sequences and512-byte ASCII boundaries revalidate. The shared16-candidate Basic inventory maps uniquely and completely to exact sealed original geometry or its admitted measured geometry. The three original strict-class diagnostics remain retained alongside their separately satisfied cohort observations.

Every pass performs `getattr("format")` then `getvalueof` for each cohort member once, in sealed order. All60 finite returned payloads have exact method/attribute/status/representation shapes. Controller format results are scalar-number and value getters singleton-number-array; private format expectations and every getter's source-derived pristine/default-native equality pass. All six anchor/method results are stable over ten fresh passes. Final ACK observations exactly equal the final pass results and sealed policies.

The trace's ready marker records the reviewed eligibility predicates; it is not an independent raw host-property snapshot of every predicate such as parent ownership. The audit establishes only traced calls and retained bindings. Wall-clock intervals include trace I/O and validation; they do not establish isolated API costs or untraced behavior.

## Explicit V8 Readback52 Refusal

| Failure Boundary Artifact | SHA256 |
| --- | --- |
| Current / retained raw52 | `87459a07efa7a7f8d0bdcaba10148f138369d080104324e520cc7fb1aaf1fd71` |
| Protocol ACK52 | `1c4dcdb18ed66194264e9fbfe914664c636ab066375636647cb4d3038fb62f01` |
| Current readback command | `be98938644e0ee42eabb329709effcc5ce40d32c6007ee4e139f6856ce7eab28` |
| Private failure | `ff8bf8f5e2c279c255a9da658814488704f233f64278d69e6f0e6373d6ff78d7` |
| Failure error / session digest | `1b0b067f6525427a5bde7aefffe0af9b0f33c82b33f3e2828f323de1d9272005` |

The5350-byte original and retained raw52 files are identical. The exact current command binds request52 to install51, plus revision1, the configured owner/source and the output file. Current ACK bytes equal retained ACK52 and report successful protocol completion. The separately retained readback has `success=false`, `numeric-readback-refused`, no numeric-mode observation, and an exact source/helper/request-bound V8 diagnostic object.

Diagnostic inventory coverage is complete at8/8 root objects and35/35 Basic objects. It contains four root rows and three numeric rows, with strict unique candidate counts and `strict_mismatch=true`. All root authored classes, source box/text hashes, expected classes and selected saved/measured geometry bind exactly. Every candidate maps uniquely to the sealed source/varname cohort. Two selected root classes are raw `jpatcher` and fail the unchanged source runtime-class allowlists.

All three numeric rows bind exact source hashes, authored `flonum`, unique original names/candidates and exact geometry; observed V8 `number` remains a strict mismatch. Their format and getter observations returned finite scalar-number results. Private format expectations and source-derived pristine/default-native getter equalities pass. V8 getter representation is independently observed as scalar-number and is not forced to the controller array representation.

Calling the unchanged read-only checkpoint validator on raw52 independently reproduces the exact retained `ValueError`: `Arithmetic checkpoint identity or unsupported capability mismatch`. The error text digest matches the session, and no accepted plus state or completed ledger operation results. No plus V8 policy or class admission follows from diagnostic recognition.

Journal sequence remains96 and contains no request52 row or plus monitored outlet output. This is an observed absence during the bounded three diagnostic probes. Strict refusal precedes full Basic retention/endpoint and seven-getter checkpoint validation; complete diagnostic identity coverage, including19 observer-leaf identities, does not establish those later gates or full getter silence.

## Preservation, Projection And Limits

All six installed/pristine/working source revisions and four installed/private helpers independently revalidate against their frozen hashes. Public states and receipts equal their exact privacy projections, with close claims restricted to independently accepted closes. The private log and journal/state digests match the session. Before/after preference snapshots are byte-equal.

Retained cleanup records empty exact-owned, prefix and marker process sets; Xvfb exited and the disposable prefix was removed. The prefix remains absent. Cleanup attribution uses marker, prefix, display and PID-start conjunctions, with display-only attribution false. Retained environment scans also report315/317 unreadable process environments; the empty recorded owned sets do not prove visibility into every unrelated host process. No global process-silence claim is made.

All26 private arithmetic roots were inventoried before validators and around each wrapped validator, including interrupted audit passes. The two completed audit passes include163 wrapped validator calls. Relative names, raw modes, file sizes, mtimes, inodes, regular-file hashes and symlink targets all remain unchanged. Relative to the concrete pre-capture snapshot, all25 other roots match and only007work gained capture evidence. Selected unchanged audit-time inventories:

| Private Root | Entries Including Root | Inventory SHA256 |
| --- | ---: | --- |
| `arithmetic-max-runtime-007` | 146 | `e37affa391a9363531fbff95302bf57a7042a16e497588eea91053957b6b8fc6` |
| `arithmetic-package-007-historical` | 18 | `c164a3f2f836b1b218868b66e3ba81622fc9e7f5588d884b1aa737f1e9459f5d` |
| `arithmetic-native-score-001` | 6 | `fd6740dd1ae700e96dc22b8c9880a76c981110db987f51ea9323253a35468f89` |

The native directory retains exactly five originals: `binding.json`, `expectations.json`, `native.jsonl`, `stderr.txt`, `transport.txt`. This audit writes only this report. No code/private/history file, preparation, launch, capture, native execution, commit or delegation occurs.

| Public Artifact | SHA256 |
| --- | --- |
| `capture-evidence.json` | `7af321bb16ae4fa70f9974f4fd933f0ad67517935d9071b9c72f07b581c90474` |
| `cleanup.json` | `864893767cfe0692596f3634b993631313f83a502baf2b8b7f61015536b594d8` |
| `display-states.json` | `7bac63baeb254bd53e65253b44e6ce5134ee5836a4819df2f0f9fec67516577e` |
| `preferences-after.json` | `1b82ffaec5911d8e7e31bb086cc65d54d82a9a131d3e1b8ccdd9aafde7f65329` |
| `preferences-before.json` | `1b82ffaec5911d8e7e31bb086cc65d54d82a9a131d3e1b8ccdd9aafde7f65329` |
| `receipts.jsonl` | `63d37827b6ffb93afba8a48aff2b22c049ee1f4f91a7ee1f1bf77d95dc0cbad4` |
| `session.json` | `34f5e431030d88cab6b2813ab06f40b72510b60cc47b74baf5a4febedc36453f` |

All six whole-capture completion flags remain false. Full comparison is incomplete; the strict comparator CLI was not run on this incomplete capture and no denominator was reduced. Saved order remains unobserved, qualification stays0/2103 with zero increment, and this audit makes no parity or plus V8 admission claim. Licensed bodies, operands, authored strings, defaults/runtime values/modes, raw geometry/class vectors and private configuration/graph payloads remain private.

