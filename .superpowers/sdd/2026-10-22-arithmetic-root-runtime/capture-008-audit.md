# Capture008 Read-Only Audit

Date: 2026-10-23 (Asia/Hong_Kong).

Evidence-integrity verdict: **PASS**. No additional integrity, binding,
projection or preservation defect was found. Capture verdict remains
**FAILED, `complete=false`**. Both times revisions and both plus revisions
complete their scored operations. The next request, `install-minus-r1`,
receives an explicit controller refusal. No minus operation, stimulus,
original outlet output or checkpoint is accepted.

| Measure | Accepted Capture008 | Complete Denominator | Remaining |
| --- | ---: | ---: | ---: |
| Completed operations | 52 | 78 | 26 |
| Events | 44 | 66 | 22 |
| Installs | 4 | 6 | 2 |
| Independent closes / explicit empty checkpoints | 4 | 6 | 2 |
| Live readbacks | 48 | 72 | 24 |
| Numeric states | 336 | 504 | 168 |
| Original outlet messages | 94 | 141 | 47 |

There are 101 consecutive command requests and 101 retained ACKs; exactly
100 ACKs succeed. All 48 readback requests succeed and are accepted. The
last accepted operation is `close-plus-r2`, request100. The 191 globally
contiguous journal rows contain 52 completion brackets, 44 stimuli,
94 original outlet receipts and one final harness error. All six
whole-capture completion flags remain false. The strict complete comparator
CLI was not run on incomplete evidence, and its denominator was not reduced.

## Provenance And Frozen Bindings

REA evidence: `ev_5918c4938b343ff302dfbdac274410bd597c3ebb78ef89e33637a72d1bfeb2ee`.

The parent retains the complete original REA response and reports a normal
process exit with exit code1 and `truncated=false`. It directly checked all
six original public artifact hashes and byte sizes against that response
before writing the seventh metadata projection. That direct response proof
is parent-attested. This audit independently checks all six projected
names, hashes and sizes against current local bytes, and checks the seventh
file's frozen identity and session/cleanup/count bindings. It does not
present the projection as independent access to the original tool response.

| Frozen Artifact | SHA256 |
| --- | --- |
| Concrete review | `41f054877e3b3e4b5cb67a6aa11f0ec047b99e707cd672bc2356565bafeab520` |
| Concrete bindings | `2d52113013e1735f62204d12b592b54acb67b03daccb4e1ff1b5655cc4d59a6c` |
| Config008 | `54fc4f6f07aa5bab24ed7cd0f1babaa1a85b06bda86829fb40fe185f5495363e` |
| Seal008 | `a2e22eb7a750261415d9ce7a3fb742032ca32da7bdcdca4ccb2530445e21296a` |
| Manifest008 | `d85a990ff83eec5c15c25dbd388c8b05e21b6636997329fa4430f45aee8e51ba` |
| Historical008 binding | `0e5263ffbf1d4e79fa35529c615e73196377f3c7750229e64da17e0512f64926` |
| Complete ten-file package | `50fe2a3faa286b89fe96176b2d070be9d619c714441f8e7ab66aa0b60853e4e5` |
| Canonical sixteen-file map | `4ea3e2265a3a084841b43ec43687885af9184b7629d6a0d184af6e69a7853410` |
| Integrated review map | `a6cf92d8bdddfe3f38abcbb8dc5cd227e79ac33dac0164327c07f66f63e7a560` |
| Integrated six-file diff | `48f400f6eecc30d61b93d3677a21384115d2568f647987a4f219b1077392a299` |
| Source-verification record | `78bad8de7edc94fef28929344934bfe70fc566a47c1a73d410fcfcb1775d3e21` |
| Full score | `95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb` |
| Frozen native result | `ce1976dfaecf4494ff876395a3c5df4add4f393f28235343cfc434120200a836` |

All sixteen current code/test files match their final008 archive copies and
mapped hashes. The archive has exactly those sixteen private regular,
single-linked files plus binding.json, with the expected directory/file
permissions. The ten-file package matches the archive, integrated review
and current producer binding. The actual design, integrated diff, five
bound review reports and source-verification record match their identities.
All 22 sealed inputs revalidate through the current preparation and
lifecycle consumers. No historical executable package is imported.

Fresh installed-source reconstruction exactly reproduces all six complete
configured definitions, their public metadata and four helper records.
The definitions digest is
`e9b89f46fff573a32190400059a78cb2c5758273966fbdedcd952f8c38190348`;
the public source-metadata digest is
`6a6303d2a91b234a47df5522636c1734dfe4650237a212bca953e5f914529c25`.
Both plus metadata consumers and the independent lifecycle source
projections pass for the actual configured revisions/owners. All six
installed/pristine/working source pairs, four installed/private helpers
and four copied runtime scripts match their frozen identities. The source
Max executable matches the session hash. Retained readiness confirms an
initially empty driver and zero source roots opened.

## Complete Native And Accepted Operation Replay

The complete native evidence revalidates entirely in memory, without
execution. The exact five originals remain binding.json, expectations.json,
native.jsonl, stderr.txt and transport.txt. Their private read restrictions,
hashes, empty stderr, scorer/transport/score/binary identities, unchanged
production source bundles, exact production transport and reconstructed
expectations all pass. All 78 rows, 78 public checkpoints, twelve native
gates and public counts match. The native binding SHA256 remains
`fa204d268f28711dfa06afca0b0b9556ec43c12574b041d5ccb4f911afb62e7d`.

Native accounting remains 78 operations, 72 live plus six empty checkpoints,
504 numeric states, 141 original outputs, 90 cable deliveries and 297 typed
receipts. Saved order remains unobserved.

Every one of the 52 accepted Max operations matches its corresponding full
score/timeline/native row. Request ordering, action/source/owner/revision,
working path, explicit live/empty checkpoint set, seven exact numeric
anchors and synchronous action brackets revalidate. All 44 exact typed
stimuli and 94 original outputs match the native rows; output comparison
preserves duplicate multiplicities, scalar selectors/tags and original
source endpoints. All 336 finite numeric values and semantic tags match
their corresponding native states. Ten accepted original float dispatch
witnesses pass, while the whole-score float gate remains false.

All 48 original raw readbacks equal their retained counterparts byte for
byte, with matching request/state hashes and lengths. There are exactly
48 original and 48 retained raw files. Current checkpoint validation
reproduces every complete private state dictionary, including fresh policy
witnesses, semantic bases, source/helper/request bindings, original classes,
retention and endpoint results. Each checkpoint retains 16 original Basic
objects, 19 observer leaves, eight saved cables and 19 observer cables.
Both input and output route arrays contain 27 exact duplicate-sensitive
routes. Every readback has equal before/after journal sequence positions.

Source-derived initial installation values, numeric progress, revision2
pristine UI resets and arithmetic store resets agree with the complete
native replay. Getter receipt tags remain unobserved. Digest over all
52 checked native-row/action-journal/checkpoint bindings:
`37813bfec7a0250b73bb5f870db717f601641d28cc3e4ef212b0fca652f2fe44`.
Digest over the 48 revalidated complete private checkpoints:
`9c4aeb7e138833f346047f97a02f2789e67ee456fc7523adf0326d68394a05b3`.

## Actual Plus Host Evidence

All 24 accepted plus readbacks and both plus close proofs carry fresh
request-bound witnesses under the frozen strict implementation. Both
revisions retain complete eight-object outer-root and 35-object Basic
inventories, the exact three numeric and two root policy witnesses, and
complete endpoint multisets. Fresh getters and source-derived installation
defaults pass; neither classes nor geometry are inferred from readiness.

The actual copied/archived V8 helper enforces repeated strict host reference
identity for the Basic patcher, ordered root/Basic object wrappers and
captured live properties around its observation pass. Its Basic patchcord
checks require each endpoint wrapper to be the exact inventory wrapper;
the outer close route also uses strict endpoint wrapper identity. Successful
raw readbacks and close proofs are the retained results of those checked
runtime paths, and their complete inventories independently revalidate.
No alias comparison, candidate-key broadening or inferred identity
relaxation was introduced. Host references themselves are ephemeral and
are not serialized, so this read-only audit cannot repeat the host reference
comparisons outside that invocation.

All four install ACKs independently bind their exact step and working path,
four geometry dispositions, no numeric-mode observations and three fresh
controller observations. Both plus ACK cohorts have separate
`cohort_satisfied=true` dispositions. The source classes remain distinct
from observed representations. Format/getter shapes, policies, source-box
identities, request/revision identities and pristine default equalities
match. All 44 event ACKs have the exact expected protocol schema.

Current plus-r1 trace SHA256:
`00dc463c5b651eea11c3c5328f53acfe0c2d8cf212b9b8c9b327b82db403f964`.
Its 110008 bytes contain exactly 268 complete ASCII rows. The largest
record is 955 bytes including newline; all existing record-count,
per-record and total limits pass. An independent parser of the current
producer checks every row schema and ordered phase, source/owner/request
identity, all 22 bounded observation chunks, four geometry observations,
three original mismatch diagnostics, complete source candidate inventories,
ten fresh validation passes and 60 returned capability calls. All six
anchor/method results remain stable across all ten passes. Final-pass
observations equal the install51 ACK, followed by exactly one bind and
install-ready terminal sequence. No refusal or trace-limit marker occurs.

The producer records its start time before the first append. Capture008
has a nonzero first elapsed value; all 268 rows have one exact
`at_ms - elapsed_ms` origin and nondecreasing wall-clock measurements.
An initial auditor attempt using the explicitly historical007-only parser
rejected its assumption that the first elapsed value is zero. The current
trace was then checked against the actual producer contract, without
altering evidence, source, validators or host proof policies. These
wall-clock intervals include trace I/O and validation and establish no
isolated API timing.

## Four Independent Closes

Only write-free `_configuration`, `_verify_close`, `_closed_owners` and
`_history` are used. Neither `validate_close`, `validate_barrier` nor any
exclusive retention writer is called. Each current proof equals its retained
bytes. Exact source/owner/request/revision/path/helper identities, full
root and Basic source coverage, outer/driver routes, disposal samples and
independent observer reports pass. All twelve numeric close witnesses also
equal the immediately preceding accepted states for their exact anchors.

Each close revalidates its earlier accepted observer history. A final
retained-history replay covers all four accepted closes and verifies
transition/event prefixes and unchanged closed-owner states. Root and ACK
hashes/lengths reproduce each validated-close metadata record.

| Close Request | Current / Retained Root SHA256 | ACK SHA256 | Metadata SHA256 |
| --- | --- | --- | --- |
| 43 | `271b54d75720341e9b32a23fba4f06533bda32a6afe385b2dd49145e90dfb32f` | `5e6d9daacfc504fd833c0603530da842a67b5106864af0ad360f440ded1db511` | `1e67fee551310ab60875de4d8256602b5e9e0e311a44c2c4747b93d3816f4333` |
| 50 | `6de59fde1d1aabdd10a322f82e21a650ea9b8574b0172a0853d42bb63df9bf8b` | `80d948a0cfe4f239e7d8c580913e65e45cac105aa473b18b247867631f90a3b1` | `fff648ed160f3380667854c9ff2e450358252240ddcdc1868cbd0719ad666189` |
| 93 | `9fe2d997c94943324938934d909d85423f824ff01c1ec81a0545e1e3cdfe5776` | `6b7bd280d09fbb2cf16b75179935e1b961380e2697227f30ed30017a07ad5ac8` | `dc018b426a473824a3fd3f437f2d3731a0abec24eb16606da70b6e7ae5863891` |
| 100 | `d8c7ad1b617f69219a799bee091c000805bb3e5f4687abcc441a404ee3fbcf66` | `d4b0b21a4909942d9f0b68bf39202f7ded5a4a21a2142bd29c78597cc587e93f` | `2df7ccb47a82c00fc214f75bdfbd2f918eead2c8a82a736acc6044d4883966fe` |

No lifecycle-completion file or all-six close barrier exists.

## Minus Refusal Boundary

Request101 equals the next full-score command, `install-minus-r1`, for the
actual sealed minus revision1 owner/source. Its current ACK equals retained
ACK101 and reports `success=false`, `arithmetic-controller-refused`. It has
seven source-bound anchor diagnostics and empty geometry, controller
representation and numeric-mode observation arrays. All expected anchors,
authored/expected classes and saved geometry match the sealed source.
The seven candidate arrays retain their full shapes and counts
(four, four, sixteen, sixteen, sixteen, sixteen, four); their raw content
remains private. Diagnostic aggregate SHA256:
`0a64086021239bbc2992e491545b483ed4cdffcb7c9591ef0b1f96e8270d4493`.

| Failure Artifact | SHA256 |
| --- | --- |
| Current / retained ACK101 | `cd86e257eac4d6dcbecfd25e133226bfa6728366b7df26b1f946f171a0970fe4` |
| Current command | `7aef00f82dc331f6c37aeca85d20f1e3297bf57ff09f76a666ccec3e690976c8` |
| Private failure | `1a49981cfa96e4e2778c9a635ba739e7a6143d572a264e4d8ba708a7c3f7cfa1` |
| Failure error / session binding | `6d8bf3bb5ba4145f22c2d48cae211c17564ed8e5057fbfcb683f04272a2b2322` |

The private failure is the exact retained ValueError from the unsuccessful
controller ACK. The final journal row is the request101 harness error;
there is no completion bracket, minus stimulus/receipt, accepted minus
state or request102 readback file. This failure concerns controller
installation. It establishes neither a minus V8 refusal nor any later
getter, retention, endpoint or close behavior. The parent separately owns
the detailed minus investigation; these diagnostics remain intact and
establish no new class or geometry admission.

## Preservation And Public Projection

The public states and receipts equal their exact privacy projections from
the independently checked private evidence. Public close claims appear
only for the four independently accepted closes. Session private journal,
state and log hashes/lengths match current files. Both preference snapshots
are byte-equal, and fresh current protected preference reads equal the
retained after snapshot. Original sources/helpers remain unchanged.

Cleanup retains empty exact-owned, prefix and marker process sets, exited
Xvfb and removed disposable prefix. The exact prefix is still absent.
Attribution uses the marker/prefix/display/PID-start conjunction, with
display-only attribution false. The recorded scans also have 319 unreadable
owned-scan environments and 317 each for prefix/marker scans. Empty recorded
sets therefore do not establish visibility into every unrelated process.

Before/after metadata-and-content inventories cover all 28 arithmetic
private roots and all 1259 entries including roots. They compare relative
paths, file types/raw modes, uid/gid, link counts, inode/device, sizes,
nanosecond mtime/ctime, regular-file hashes and symlink targets. Access
times are excluded. The completed pass wraps 204 read-only check calls in
full before/after inventories; earlier auditor-reader attempts include
247 more such calls. Every interval and both subsequent focused checks
retain the same whole-inventory digest:
`7734c426493e4a17189514f748d4e182af4192bdfe0953a6a86dccdcb3bfff75`.
No private root changes, appears or disappears during this audit.

| Private Root | Entries Including Root | Inventory SHA256 |
| --- | ---: | --- |
| `arithmetic-max-runtime-008` | 247 | `6a726265de98171a8b995f1ffed4ba8283cad45557d49dcf88ad063c19b0215a` |
| `arithmetic-package-008-historical` | 18 | `b1df73f1a34b283b6be7d9563db17c1b264619116ac253de9c000bd8bb5d8a22` |
| `arithmetic-native-score-001` | 6 | `387a44e29cea007bc057d076656233569b6026ec177697b673afc0f333ae20b9` |

The parent separately retains original28-root prelaunch/postcapture
inventories and reports that only008work changed while all27 other roots
matched. That capture-interval proof is parent-attested; this audit's
fresh unchanged28-root proof covers its own read-only interval.

| Public Artifact | Bytes | SHA256 |
| --- | ---: | --- |
| `capture-evidence.json` | 2242 | `7fe464885c95cd551631597357f220ef3729085f734a501b712f61fae30780af` |
| `cleanup.json` | 1843 | `a4f239050bc2c48f433aa244c19e39ce10dcc7062b122af2ea47a75c8ab59e66` |
| `display-states.json` | 20837 | `e76e47bcaf62682b245a74bee87bb30348e7edccb093b7e3a63b23f917481bad` |
| `preferences-after.json` | 205649 | `1b82ffaec5911d8e7e31bb086cc65d54d82a9a131d3e1b8ccdd9aafde7f65329` |
| `preferences-before.json` | 205649 | `1b82ffaec5911d8e7e31bb086cc65d54d82a9a131d3e1b8ccdd9aafde7f65329` |
| `receipts.jsonl` | 80493 | `93326f7e0b1589c02077c031996ce814754b5d888dce14cdef11d6d266d62c7c` |
| `session.json` | 72820 | `53df6177d426a1e7b8ad80a812ed2e655bc62c09ebec8916d5b059bbd7b835b6` |

All evidence scripts/imports use python3 -B. Only this report is written.
No preparation/copy, private/history edit, retention writer, Max/Wine/native
or display launch, capture, source/test change, commit or delegation occurs.
The dirty worktree is preserved. Licensed bodies, operands, defaults,
helpers, modes, raw geometry/class vectors and private numeric program
values remain private; comparisons stay in memory and outputs contain
only bounded counts, hashes and dispositions.

The remaining full-score obligations are both minus revisions, 26 scored
operations, 22 events, two independent installs/closes, 24 live readbacks,
168 numeric states and 47 original outputs, followed by the all-six close
barrier and complete comparison. Qualification remains **0/2103**, with
zero added passes. This integrity PASS establishes no whole-capture parity
or complete installed-help qualification.
