# Preparation007 Implementation Report

The authorized five-file implementation is frozen for the parent's independent
review. This report records the JS implementation and test-first sequence,
plus directly executed combined verification after both workers froze their
files. It does not authorize or record a preparation, target launch or capture.

The accepted design is `max-preparation-007-design.md`, SHA256
`641fec636da5405d5bc24bc0ec27ed28d5fb4991aa360c08fd4b382202e27d8b`.
The implementation brief is `preparation-007-implementation-brief.md`, SHA256
`21e1cd2606a00dd75493a60b1c333c8788acb598664cf112dffd372871ea6642`.
The specification-only policy contract is
`preparation-007-policy-contract.json`, SHA256
`b21497577dddd01a3051063eec16ffea3da4a5d6b030ffbf374907a75332c73a`.
The Python worker's separate test-first report is
`preparation-007-python-report.md`, SHA256
`ec13260c79dcccda94e63e6ba191b1853d44cd5a3de65907bc9064a0f2d15ff0`.

## Concrete JS Changes

Both scripts independently validate the exact
`plus_controller_numeric_cohort_policy` schema, its three source-bound members,
the complete copies in `boxes` and `full_inventory`, source/default/rectangle
hashes, helpers and immutable006 evidence. The contract is not a runtime
dependency. The new field never enters the times representation-policy reader
or a per-object class-admission fast path.

The controller completes the original20/root4/Basic16 hierarchy preflight
before the six existing numeric capability calls. It requires exactly three
eligible mismatches, no unrelated diagnostic, exact owner/request/revision/path
binding, unique Basic16 source descriptors and matching descriptor copies.
Malformed or partial new metadata suppresses capabilities. Entirely absent
metadata retains the original diagnostic-only strict-refusal behavior.

Successful cohort validation preserves all three original class mismatch
diagnostics and adds three separate observations with explicit
`cohort_satisfied` disposition. Each fresh complete cohort calls only the
existing format and numeric getters, once per member. Nonfinite, unavailable,
throwing, ambiguous, wrong-shape and unequal-default results refuse and retain
the complete unsatisfied outcomes when those calls complete normally.

Request, definition and owner snapshots precede host hierarchy traversal.
The controller checks them before capabilities and after capability collection.
This prevents traversal or a final getter from changing the identity that a
new result would otherwise bless. A final bind check also covers definition
changes during the existing handle rereads.

`createPlusValidationPass` owns its issued reference and captured payload in a
local closure. Bind authenticates exact result/pass/root/definition identity
before inspecting any caller object. It rejects forged, foreign, expired,
consumed or stale results and consumes authority before attachment. The final
pass reuses its captured Basic and sixteen source handles; no lookup,
subpatcher re-resolution or repeated numeric capability occurs during bind.
Every poll expires its local authority in `finally`.

The independent V8 diagnostic branch derives four root rows, three numeric
rows and the exact8/35 root/Basic inventory from plus descriptors. The four
authored-number objects contribute coverage only. Incomplete, extra,
ambiguous, unavailable or throwing inventories retain raw candidate/prefix
diagnostics, leave positive fields unknown and make zero target probes.
Complete binding permits only the existing six diagnostic getter calls.
Raw classes and return shapes survive; plus `number` and `jpatcher` remain
strict mismatches with no plus V8 witness policy or class admission.

## Test-First Evidence

All nine named JS groups were introduced before their production behavior.
Their initial intended RED causes against consumed006 were:

| Group | Initial RED Cause |
| --- | --- |
| `plus007_preflight_suppresses_capabilities` | Malformed new policy still reached six target calls |
| `plus007_current_capability_refusal` | Separate retained cohort outcomes were absent |
| `plus007_fresh_cohort_bind_reuse` | Valid complete plus install still refused |
| `plus007_result_ownership_lifetime` | Local result issuer was absent |
| `plus007_both_independent_revisions` | Local result issuer was absent |
| `plus007_old_fixture_refusal` | Partial malformed new metadata still reached probes |
| `plus007_v8_complete_diagnostics` | Plus diagnostic producer returned no result |
| `plus007_v8_incomplete_suppression` | Plus diagnostic producer returned no result |
| `plus007_v8_recognition_is_not_admission` | Valid metadata did not reach the required plus diagnostic and strict-refusal path |

Additional required controls exposed two concrete preflight gaps before their
fixes. A duplicate nonnumeric Basic descriptor was accepted; after uniqueness
was enforced, a boxes-only port-copy change was still accepted. The final
controller requires the exact unique16 immediate Basic descriptors and
compares class, rectangle, source identity, port and authored-text fields
across the two descriptor views. The complete preflight group is GREEN with
zero target calls for every invalid case.

Ownership controls first reproduced acceptance when a final getter changed
the request, owner or descriptor before snapshots were taken. Moving snapshots
before capability collection made those controls GREEN. A further traversal
control reproduced the same gap before that later snapshot boundary; moving
the snapshot before host traversal and checking currentness before capabilities
made it GREEN with zero calls. These changes preserve the separate original
class diagnostics and unsatisfied outcomes on refusal.

The targeted commands used the existing complete baseline suite plus the
selected new group:

```sh
ARITHMETIC_007_CASE=plus007_preflight_suppresses_capabilities node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs
ARITHMETIC_007_CASE=plus007_result_ownership_lifetime node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs
```

Final verification was executed after the JS freeze:

```sh
node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs
node --check experiments/max-reference/arithmetic-roots-runtime-20261022/controller.js
node --check experiments/max-reference/arithmetic-roots-runtime-20261022/v8-readback.js
node --check experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs
python -B -m unittest discover -s experiments/max-reference/arithmetic-roots-runtime-20261022 -p 'test_*.py'
```

All nine JS groups pass. All three syntax checks exit zero. The complete
Python discovery run passes70 tests with one existing optional native-binary
skip. No native binary was launched for this verification.

The unchanged prior P1/P2 checks report12 identity cases and8 geometry cases,
with zero target calls or direct/serialized observations for invalid bindings.
The strict-refusal trace remains1710 rows. The longest80-poll fixture remains
1740 rows,644956 bytes, maximum947 ASCII bytes per line and420 capability calls.
All ten queued terminal-failure cases have zero later activity, ACK changes or
unexpected queue changes. The real controller poll fixture installs from ten
fresh polls with60 capability calls,23 helper creations and the exact captured
Basic/member handles; its three original diagnostics remain present.

## Actual Source And Policy Verification

Read-only `source_metadata()` reconstruction passes for three installed
documents and four helpers. Its private descriptors were passed directly to
both real JS validators without printing their contents. Across revisions1/2
and both scripts, four metadata recognitions and24 member-copy recognitions
pass. Every recognized policy equals the parent contract exactly.

| Document | Existing Controller Policies | New Plus Cohort Policies | V8 Numeric Policies | V8 Root Policies |
| --- | ---: | ---: | ---: | ---: |
| times | 3 | 0 | 3 | 2 |
| plus | 0 | 3 | 0 | 0 |
| minus | 0 | 0 | 0 | 0 |

Each plus source view has exactly three new policies. Authored/source runtime
descriptors remain `flonum`; observed controller `number` is a separate fact.
No plus V8 admission follows from policy recognition.

## Frozen Identity And Scope

The canonical compact sorted filename/hash map for all sixteen files is now
`eb299dc8346498e2f323e538f6b55503cc2aad8bf141f0435a7c768c7e60d374`.
The ten-file `PACKAGE_FILES` map is
`67b8c8fb6a2f81dae30a2a410f8e56bdf3697257f7018e9382812ed19e399f3f`.
Exactly five files differ from the consumed006 sixteen-file baseline map
`c6132cd1dc86becaad8b129a41dfe9a8bf778edc95bc6351f917e7fcabcefc9c`:

| Authorized Changed File | Frozen SHA256 |
| --- | --- |
| `arithmetic.py` | `9adb74bde2cd8352cca08bc05d91687c3eeea41667912f99d050a81e5dc18216` |
| `controller.js` | `da4473ac8014f39fd255b830121508738c16980b6e303fb0a9b8c963ce0f13a8` |
| `v8-readback.js` | `754eeedd42a1f33adc4e108551187791ce43523e08e58b2f9b6eb3ff9670a4d9` |
| `test_preparation.py` | `dc1bd20011ff7993a9b7aa567658e2f4a50ada6d3eacacbcd9dcbe6e62f584eb` |
| `test_helpers.cjs` | `ab91ab1a76729d8f8c946f94417099b4ef79722343062ea39fb141fe1349cd23` |

The other eleven frozen implementation/test files exactly match baseline:
`observer.js`, `lifecycle.py`, `lifecycle-observer.js`, `prepare-runtime.py`,
`run-runtime.py`, `compare.py`, `native_score.py`, `test_lifecycle.py`,
`test_runner.py`, `test_comparison.py` and `test_native_score.py`.
The complete score remains
`95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb`.
The full78-operation/504-state/141-emission/six-close denominator and
qualification0/2103 are unchanged.

## Evidence Preservation And Limits

Read-only private006 inventory verification still yields141 entries and hash
`0228e97862aa5905ab5678d817c1a8b9a955ecee2da8a8551f3dea4849bdc49a`,
exactly matching the recorded pre-implementation baseline. The inventory
algorithm includes relative names, lstat modes, link targets or file sizes and
hashes in sorted compact JSON. No historical/private evidence was written.

The existing native evidence directory still contains exactly its five
original regular files, with every hash matching `native-report.md`; directory
and file permissions also match. Its current inventory hash is
`fccf7ce3b6844fbac4b1a1c3405ec497d396a221382ad92719430fd50c0da134`.
Native evidence, scorer, transport, lifecycle, runner, comparator, observer
helpers and score were not changed by either authorized implementation split.

No known required implementation issue remains at this freeze. Synthetic
behavior and read-only source reconstruction do not establish live plus
installation, V8 representation permission, complete capture, parity, silence,
saved order or any additional qualified property. The parent's fresh
independent implementation review, archive binding, preparation007,
concrete-input review and capture remain separate work.
