# Capture009 Independent Read-Only Audit

Date: 2026-10-23 (Asia/Hong_Kong).

## Findings And Verdicts

No actionable evidence-integrity, binding, accounting, projection or
preservation finding was identified. No correction to the retained evidence
is requested.

The observed runtime blocker is request101, `install-minus-r1`: the command
ACK wait at `experiments/max-reference/arithmetic-roots-runtime-20261022/run-runtime.py:181`
expires with `TimeoutError('Finite private command did not complete')`.
There is no retained ACK101 or terminal minus diagnostic envelope. Its
internal progress, capability attempts and outcomes remain **UNKNOWN**.
The separate missing-ACK investigation owns further diagnosis.

Evidence-integrity verdict: **PASS** for the actual retained009 evidence.
Runtime-completion verdict: **FAILED, `complete=false`**. The last accepted
operation remains `close-plus-r2`, request100. No successful minus
installation, observer binding, state, stimulus, output, close or score
advance is evidenced.

| Measure | Accepted Capture009 | Full Denominator | Remaining |
| --- | ---: | ---: | ---: |
| Completed operations | 52 | 78 | 26 |
| Events | 44 | 66 | 22 |
| Installs | 4 | 6 | 2 |
| Independent closes / explicit empty checkpoints | 4 | 6 | 2 |
| Live readbacks | 48 | 72 | 24 |
| Numeric states | 336 | 504 | 168 |
| Original outlet outputs | 94 | 141 | 47 |

There are 101 consecutive command requests and exactly100 retained ACKs,
all successful. The 100 acknowledged requests consist of52 accepted
operations and48 accepted readbacks. Command101 has no raw-response hash
or length in its public request record. Current ack.json equals retained
ACK100. The journal has190 contiguous rows:52 completion brackets,
44 stimuli and94 original receipts, with **zero harness-error rows**.
All six whole-capture flags remain false. The strict full comparator CLI
is not run against incomplete evidence; no denominator is reduced.

## Provenance And Frozen Identity

REA evidence: `ev_2b367897874548f570647fd98f6b3ed116589181969d2dcc9f9b342f1a27540f`.

The parent retains the complete original REA response and directly matched
all six original public file hashes and sizes before writing the seventh
metadata projection. Its retained machine record reports a normal exit,
code1/signal0/reason exited, and `rea_truncated=false`. That original
tool-response verification is parent-attested. This audit independently
matches all six projected names, hashes and byte sizes to local files,
and verifies the frozen projection and parent-machine-record identities.
Reading those records is distinct from directly receiving the original
REA response.

| Bound Artifact | SHA256 |
| --- | --- |
| Independent source PASS review | `fb75ec09e581fae1117549d7b293e96af9f6f186e6f8fc35d6f3c6342e14f353` |
| Independent concrete PASS review | `b3e2c68320b4f2db1a5f3a686afd9e755673caf9f16219f286fb7592cf7c3bac` |
| Concrete bindings | `2c695586ecfece43fc3ff9a59479f952bee3e1f0f17561d4e3f59d0e1e6002d2` |
| Final009 archive binding | `46c942382a336480d438556eeb1524dd34ce05223267edfe84f354e0450a98ea` |
| Config009 | `47eeaa4a36e0d7aaff255156c2c1425baad57ac53a0bf0493464e78445d91fb1` |
| Seal009 | `ab40f0c0caa95d2187133ea7e41a0cf83d2099938285674703f32325a20bd96a` |
| Manifest009 | `8a8a249e1888a0a1f22eb2fc746c96b99514a0f1e62306f5f370ebcebf682a49` |
| Canonical sixteen-file map | `3b47a0970817f4f5dc06958cf895e5903d09e16c8d5e2821a9e00828eb1e26fd` |
| Complete ten-file package | `3b2ca977ec2286470a7759b13129e5bfce47abed3c003b408e2d3e14bcf3df50` |
| Source-review map | `9bb7224becb85249298210efbbcac79229ea9f878d5a50447382d3bbaa71efdf` |
| Source diff | `f4d9e4aa2c9146debf5849e3270f0ae578b4bcc9696e4b9f0cb7e2bdeff1e22c` |
| Accepted design | `3cc992afe3da3a5e8e7431ace0f25ace56d5662ec09ac9cb1e333f450f01b22d` |
| Design PASS rereview | `a337fdd4cb15e2fc469fd736d2f873eaa51f13e70b50ed5380fdcf932b46d7b4` |
| Source-verification record | `3c77c93ba41047e5e53fd6a587d86c62085f0e8d46cec6933a77169dd8f69509` |
| Frozen score | `95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb` |
| Frozen native result | `ce1976dfaecf4494ff876395a3c5df4add4f393f28235343cfc434120200a836` |
| Parent capture-preservation record | `aa7720cd8f3c23344e746bde3d86bedc37f1e5199607b56763e1c96901a1c707` |
| Parent capture-verification record | `a2d92b4ad378b2dc7068da35fbaaeeb5a1e1b104d8793f9bd01777e26836e0aa` |

All sixteen current files equal their final009 archive copies and the
mapped hashes. The archive has exactly17 private regular files: the16
copies plus binding.json. Directory/file permissions, ownership and
single-link properties pass. The actual producer package matches the
ten-file map, archive and source-review map. All four named archive-bound
reviews/reports, design, design rereview, source diff/map, source-verification
record, score, native result and parent008 archive binding match actual
bytes. Historical code is read only as data and is never imported or run.

Fresh `arithmetic.verify_private`, preparation-manifest validation and
`lifecycle._configuration` pass against actual009 work. All22 sealed inputs
revalidate. Fresh installed-source reconstruction exactly reproduces the
six configured source definitions in their actual009 namespace, including
revision/pristine/working paths, owner inlets, distinct Basic/full schemas,
indexed saved edges and ordered observer leaves. It reproduces the public
source metadata and four helpers exactly. Complete definition digest:
`a955eed1af164af219e44dd4d4f55635318b7061fd29738892083f5d931f2de9`.
Public source-metadata digest:
`6a6303d2a91b234a47df5522636c1734dfe4650237a212bca953e5f914529c25`.

All six installed/pristine/working source revision pairs, four
installed/copied resource helpers and four copied runtime scripts match
their frozen identities. Both actual plus metadata consumers and lifecycle
source projections pass. Both minus revisions retain zero admission
policies. The fresh in-memory minus nine-key source projection matches
`c17962fba204a882ce5b0bca6c792e55c0a4181366c7dfe0c39b28152215084e`.
This is source/configuration consistency, not a new live collector result.
Retained readiness starts with no live owners and zero opened source roots;
the source Max executable matches the session hash.

## Native And Accepted Prefix Replay

The existing complete native evidence is independently revalidated in
memory without execution. The exact five originals remain binding.json,
expectations.json, native.jsonl, stderr.txt and transport.txt. Their private
read restrictions, file hashes, empty stderr, frozen scorer/transport/score/
binary identities, production source bundles and before/after bundle hashes
pass. Reconstructed transport and expectations match exactly. All78 rows,
78 public checkpoints, twelve native gates and full counts revalidate.
Native binding SHA256:
`fa204d268f28711dfa06afca0b0b9556ec43c12574b041d5ccb4f911afb62e7d`.

Native accounting remains72 live plus6 empty checkpoints,504 numeric states,
141 original outputs,90 cable deliveries and297 typed receipts. Saved cable
order remains unobserved. Native exact-five bytes and source bundles are
checked again at the end of the completed audit pass.

All52 accepted Max operations independently match their corresponding rows
in the complete78-operation score, explicit lifecycle timeline and native
result. Request order, action/source/owner/revision, exact working path,
typed journal identity and synchronous stimulus/completion brackets pass.
Every one of the44 typed original inputs matches the score. All94 typed
original outlet outputs match the native rows with exact source endpoints,
scalar selectors/tags and duplicate-sensitive multiplicities. All336 finite
numeric values and semantic tags match their exact native anchors.
Ten accepted original float-dispatch witnesses pass; the whole-score float
gate remains false.

All48 original raw readbacks equal their retained copies byte for byte,
with matching state/request hashes and lengths. Every current read-only
checkpoint validation reproduces the complete private checkpoint,
including fresh source/helper/request/operation identities, representation
witnesses, semantic bases, original classes, retention and endpoint results.
There are exactly48 original and48 retained raw files. Each checkpoint has
16 original Basic objects and19 observer leaves; its input and output route
arrays each contain27 exact duplicate-sensitive routes comprising8 saved
cables and19 observer cables. All before/after journal sequence positions
are equal.

Source-derived pristine installation values, subsequent numeric progress,
revision2 pristine UI resets and arithmetic store resets agree with the
complete native replay. Getter receipt tags remain unobserved. Aggregate
digest over52 accepted native-row/action-journal/checkpoint bindings:
`94f42bca025e33c80f1c69b64ef3d2e24d1541496b25d7afd950ab9643b644a5`.
Digest over48 revalidated complete private checkpoints:
`bb32c67aaa3edf6ba96bfb06238f8aa6a43e609879048ae9ccc8443bc967c457`.

## Times And Plus Host Proofs

Both times revisions and both plus revisions are covered. Each of the24
plus readbacks and both plus close proofs has fresh request-bound three
numeric/two root policy witnesses, complete outer8/Basic35 inventories and
exact endpoint multisets. The copied V8 helper equals the frozen current
and archived code. Its successful paths enforce repeated strict retained
patcher/object-wrapper identity and captured live properties around each
pass, strict Basic patchcord endpoint wrapper identity, and strict outer
close endpoint wrapper identity. The retained successful results complete
those paths; all serialized source/request/property/route evidence also
independently revalidates. No alias matching, candidate broadening or
inferred relaxation is introduced. Ephemeral host references are not
serialized, so an audit outside that invocation cannot repeat the host
reference comparisons themselves.

All four install ACKs bind their actual step/working path, four source-bound
geometry dispositions, zero numeric-mode observations and three fresh
controller observations. Both plus cohorts have separate satisfied
dispositions. Exact policies, source-box identities, revision/request
bindings, finite format/getter shapes and source-derived pristine-default
equalities pass. The44 event ACKs have their exact expected schema.

Current plus-r1 trace SHA256:
`5b583a1422627e85732ee1f33ec68bd8bf6d6525c080d7f571e56e87b10a0d8f`.
Its110008 bytes contain268 complete ASCII rows, with955 bytes maximum per
record including newline. All existing count, per-record and total bounds
pass. A fresh parser of the actual current producer checks every ordered
phase/schema and source/owner/request identity, all22 bounded observation
chunks, four geometry observations, three retained original mismatch
diagnostics, complete source candidate inventories, ten fresh validation
passes and60 returned capability calls. Every anchor/method result remains
stable across all ten passes. Final-pass observations equal install51 ACK,
followed by exactly one bind and install-ready terminal sequence. There is
no refusal or trace-limit marker in this plus trace.

Actual009 timestamps have a zero first elapsed value, one exact
`at_ms - elapsed_ms` origin and no wall-clock regression. The parser uses
the producer contract, which permits a nonzero initial elapsed value;
it does not import a previous capture's timestamp assumption. Wall-clock
intervals include trace I/O and validation and establish no isolated API
timing or minus performance result.

## Independent Closes And History

Four fresh closes revalidate using only write-free `_configuration`,
`_verify_close`, `_closed_owners` and `_history`. Neither `validate_close`,
`validate_barrier` nor a retention writer is called. Current root proofs
equal retained bytes. Exact source/helper/request/owner/revision/path
identities, full original and harness inventories, Basic retention,
outer/driver routes, disposal samples and independent observer reports
pass. All twelve closing numeric witnesses match the immediately preceding
accepted state for their exact source anchors.

Every close checks its earlier observer history. A final retained-history
replay validates all four accepted closes, transition/event prefixes and
unchanged closed-owner states. Root/ACK hashes and lengths reproduce each
validated-close metadata record.

| Request | Current / Retained Root SHA256 | ACK SHA256 | Validated-Close Metadata SHA256 |
| --- | --- | --- | --- |
| 43 | `f6b4670f4453baaf09e57d788854cd1e2a77906ee39651df8cf7dafe04fad89c` | `65aa2560fa5b93cad5487bae366c67d3d15eea27a258d002e66ee850942a8afe` | `dc8264a39acd9ac57b5ad2547bd23c9ada1018565a4b0f545f91dd4a2922371a` |
| 50 | `c6302a9bd92215c597e3dd36e3fda814eff2b5c7e55f099a05f0c66089c1f067` | `dd57a521cf34d9c0c5507aa190e8ca323b6e2d79e9775e68f2d33221d8079ae2` | `c597fa45f8b6adedcc1c7f30e017f69722b3ba8f73dac90ff3c1f4f450a15084` |
| 93 | `18ca221682778b2480d62af9d43ae8aae77fc6adbd6902ee9112240ed9e1fee7` | `f789094bef57d997f796c020cd375db84897a611a8556773d26fdaa950aea2c7` | `a2f40b005973e5fd13f9141d5cdde1ab1e57fd2c34736c5f1011c695124f343e` |
| 100 | `e39b1356b81ddb6fcdda3850d7fb8183d84fc7cdad9d5b95973bec17c4000b1f` | `351cefe5e93eb4fe5c8be21904d3307020f3532877cb840fc109ad854b1bb4fc` | `3cd973d5bc7ecdcc8c643e62d21bb70fc14f911631103908734a65ea6dd2a605` |

No lifecycle-completion file or all-six close barrier exists.

## Command101 And Unknown Minus Progress

The exact current command equals the next complete-score installation,
request101/minus/revision1, with the sealed source and owner namespace.
The private failure is exactly the retained TimeoutError from the10-second
ACK wait, and its error digest matches session.json. Command101 has no
retained response; ack.json and the final journal row still bind close100.
There is no request101 journal row, harness error, minus readback, root
proof, successful observer evidence or accepted minus score operation.

| Boundary Artifact | SHA256 |
| --- | --- |
| Current command101 | `7aef00f82dc331f6c37aeca85d20f1e3297bf57ff09f76a666ccec3e690976c8` |
| Current / retained ACK100 | `351cefe5e93eb4fe5c8be21904d3307020f3532877cb840fc109ad854b1bb4fc` |
| Private timeout failure | `b37e2b334c7544519df1c251fc8654aed113bb2571e7e461f5fa66063deb992c` |
| Timeout error / session binding | `789c6bbf8394cc12430e61850cac52a4ca449e3e13f71ed48b4351c61d5c97db` |

The exact postcapture private inventory has241 regular files and four
subdirectories, covering22 sealed inputs plus seal.json, the ten expected
top-level runtime artifacts,100 ACK files,96 raw/retained readbacks and
twelve close proof/metadata files. No alternative minus diagnostic sidecar
exists. No retained ACK contains a minus collection envelope or terminal
minus diagnostics.

Without a retained envelope, this audit cannot validate a started batch's
snapshot digests, six ordered method slots, single-attempt counters,
classified outcomes, partial prefix, first stopping failure or stale
context. Those quantities remain unknown, rather than zero. The absence
does not show that eligibility failed, that no method was looked up or
invoked, or that a controller refusal completed. There is no accepted minus
observer graph, so the quiet journal cannot establish getter silence.

The frozen source contract at
`experiments/max-reference/arithmetic-roots-runtime-20261022/controller.js:921`
places its diagnostic collection before unconditional minus installation
refusal and before successful binding. Its export point is
`experiments/max-reference/arithmetic-roots-runtime-20261022/controller.js:1018`.
This audit binds that diagnostic-only source contract but cannot establish
which internal point actual request101 reached. No capability/default/mode
agreement, receipt tag, V8 shape, admitted class/geometry or eventual minus
behavior follows from the timeout. Finite ordered guards remain non-atomic.

## Projection, Cleanup And Preservation

Public states and receipts equal the exact privacy projections of the
freshly validated private evidence. Close claims are restricted to the
four independently accepted closes. Session journal/state/log hashes and
log length match actual bytes. The original runtime log is616 bytes,
SHA256 `355ee941b397714d34b1904e2953bd3e49ab25160d7b42bb6c23aeae5a4ae741`.
The parent's earlier614-character text count reflects CRLF normalization
and is not a raw-byte identity. Both preference snapshots are byte-equal;
fresh current protected preferences equal the retained after snapshot.
Installed/pristine/working sources and installed/private helpers remain
unchanged.

Retained cleanup has empty exact-owned, prefix and marker process sets,
exited Xvfb and removed disposable prefix. The exact prefix is still absent.
Attribution uses the marker/prefix/display/PID-start conjunction and does
not use display-only attribution. Runner cleanup reports321 unreadable
owned-scan environments and319 each in prefix/marker scans. The parent's
later postcapture scans report319 for all four scan types; these are
different samples. REA retains16 unverified process environments, left
untouched. Empty observed sets do not prove visibility into every host
process. Parent-attested REA limits also retain sampled process trees,
before/after filesystem observations, unrecorded inherited environment and
a prelaunch executable sample that is not an atomic image binding.

Fresh audit inventories cover all30 arithmetic private roots and1523
entries including roots. They compare relative names, raw modes/types,
uid/gid, link counts, inode/device, sizes, nanosecond mtime/ctime,
regular-file SHA256 and symlink targets. Access times are excluded.
The completed pass wraps206 read-only check calls in full before/after
inventories. A subsequent focused check validates the parent machine
record, exact postcapture file set and raw log, with the same unchanged
inventory. Whole30-root before/after SHA256:
`7533f2c3b873687b695dc4410300ebc3c330efd134ddcfd3b82dd10e40f0d925`.

| Private Root | Entries Including Root | Inventory SHA256 |
| --- | ---: | --- |
| `arithmetic-max-runtime-009` | 246 | `2217476d04d972b799b5b96b0aee717c63d9cca68cae9a7d73bf4035608241dd` |
| `arithmetic-package-009-historical` | 18 | `4b70488b63bfdf51f8a3fb37fde9fe0523ca3d99aedc0a16eeda95e2d49ca08f` |
| `arithmetic-native-score-001` | 6 | `387a44e29cea007bc057d076656233569b6026ec177697b673afc0f333ae20b9` |

The parent capture-preservation record independently hash-checks here:
its30-root before/after summary maps have exactly one changed root,
009work, and all29 others equal. Its before/after map SHA256 values are
`92c1316f4773420338689e49174ec63dc056b116645057d58585b4f5ce2680ab`
and `d9125030b7c3afcfb120da7626f429cc64c7a1261309e28e16909c59a2318f41`.
That capture-interval proof is parent evidence, distinct from this audit's
fresh unchanged interval. Additionally, fresh current original28-root
inventories reproduce the previously retained008 audit inventory digest
`7734c426493e4a17189514f748d4e182af4192bdfe0953a6a86dccdcb3bfff75`;
the prior report's original identity is checked as data. Its verdict is
not reused for009.

| Public Artifact | Bytes | SHA256 |
| --- | ---: | --- |
| `capture-evidence.json` | 2602 | `c2ddfe3b4b357a0cb522256f67f7c50ea1b399ea63e1c4063c0f44300887bbeb` |
| `cleanup.json` | 1845 | `0af152519c0b32b6f5feb8ee353e1549b467dc95d80bc77376f1ee04e5aca7d0` |
| `display-states.json` | 20837 | `87e16b38bab3eacfa1dbfd08f0abcff7e78314b6fdd32d4b050190a598c1777c` |
| `preferences-after.json` | 205649 | `1b82ffaec5911d8e7e31bb086cc65d54d82a9a131d3e1b8ccdd9aafde7f65329` |
| `preferences-before.json` | 205649 | `1b82ffaec5911d8e7e31bb086cc65d54d82a9a131d3e1b8ccdd9aafde7f65329` |
| `receipts.jsonl` | 80250 | `754fc5bc1aac4ccd22dc1273b4a78fe23dafc5118b8c49029e12f9d85c22a38c` |
| `session.json` | 72723 | `f21f2d44c6086ea19055943deb9547e22e24c25037d5ce1345e91e1719a5fe90` |

All evidence scripts/imports use python3 -B. Only this report is written.
No source/test/history/private edit, preparation/copy, retention writer,
Max/Wine/native/display execution, capture, commit or delegation occurs.
Licensed graphs, source operands/defaults, helper bodies, modes, geometry,
raw class vectors and private program values remain private; processing
stays in memory and outputs contain bounded counts/hashes/dispositions.
The existing dirty worktree is preserved.

Remaining full-score obligations are26 operations,22 events, two installs,
two independent closes,24 live readbacks,168 numeric states and47 original
outputs for both minus revisions, followed by the all-six close barrier
and complete comparison. The full request schedule remains commands1-150
plus barrier151, one live owner, pristine revision resets and
saved_order_observed=false. Qualification remains **0/2103**, with zero
added passes. This evidence-integrity PASS establishes no complete-capture
parity or installed-help qualification.
