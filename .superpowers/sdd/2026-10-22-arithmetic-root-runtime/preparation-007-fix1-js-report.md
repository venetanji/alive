# Preparation007 Fix1 JS Report

The scoped JS correction is implemented, verified and frozen for the parent's
focused independent rereview. It addresses only the reviewed authored-source
class gap in plus V8 root diagnostics.

Authorization is `preparation-007-fix1-brief.md`, SHA256
`43f9447b528ca1da944360964e39b3e02a8cdf70bd26d7bb8b20d924d721ebe4`.
The independently reproduced P2 finding is in
`preparation-007-scoped-review.md`, SHA256
`5646e0716607a20da518d4f6ce7aa08ecffb4f2be45bbfc5193010d89df1ad19`.
The initial007 review archive was read-only, binding SHA256
`86e57db10212960123d559b9253bb9c31c02452d08c0bdffc9aa84d7e50afcb3`.

## Test-First Reproduction And Fix

The new `plus007_fix1_v8_root_source_class_binding` test was written before
the production edit. Its valid control supplies the expected authored classes
for all four roots, retains raw actual `jpatcher` on the Basic root and
`number` on the three numeric targets, obtains complete8/35 coverage and six
diagnostic target calls, and verifies the strict V8 readback refusal.

The negative controls independently alter only the authored `maxclass` of
each root and require rejection with zero target calls. Against frozen007 the
test reproduced the specific reviewed gap:

```text
Missing expected exception: root/obj-4: changed authored class must refuse before target calls
```

The existing measured geometry policies already refused the other three
altered-root controls, while the fourth root had no such incidental guard.
The fix adds an explicit `source_class` to every separate plus root diagnostic
pin and requires descriptor `maxclass` equality in the common source-root
binding predicate. All four roots are now independently pinned. The synthetic
fixture includes the corresponding authored-class pin, and the new test also
checks the production table's four exact classes.

The targeted test then passed. Each of its four altered-source controls makes
zero numeric target calls; the valid control still retains raw actual classes
and refuses strict readback. This changes no policy schema, runtime class
admission, controller code, host API call, coverage count or probe allowance.

## Executed Verification

```sh
ARITHMETIC_007_CASE=plus007_fix1_v8_root_source_class_binding node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs
node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs
node --check experiments/max-reference/arithmetic-roots-runtime-20261022/v8-readback.js
node --check experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs
node --check experiments/max-reference/arithmetic-roots-runtime-20261022/controller.js
```

The targeted command first exited1 for the root/obj-4 missing exception and,
after the minimal production correction, exited0. The complete Node suite
passes all ten007 groups, including the nine original groups. All three
syntax checks exit0.

Retained baseline evidence is unchanged:12 identity cases,8 geometry cases,
zero invalid target calls or direct/serialized observations,1710 strict-refusal
trace rows,1740 longest-fixture rows,644956 bytes, maximum947 ASCII bytes per
line,80 polls and420 capability calls. All ten queued terminal-failure cases
still have zero later activity, changed ACKs or unexpected queue changes.

A separate read-only installed-source check verifies the plus source digest
and compares the four installed root authored classes directly with the real
V8 pin table. All four match. No licensed body, raw configuration, private
geometry, defaults or capability value was printed.

The parent owns complete combined Python/source verification and focused
rereview after the disjoint Python correction. This worker did not rerun the
Python suites or launch a target/native binary.

## Frozen Scope

Only these two existing files were edited by this JS worker:

| File | Initial007 SHA256 | Fix1 Frozen SHA256 |
| --- | --- | --- |
| `v8-readback.js` | `754eeedd42a1f33adc4e108551187791ce43523e08e58b2f9b6eb3ff9670a4d9` | `7d857163d254c82ecbc02b6cd3ff43be1fdf9f67ed09ddf6eb554a7d87c175fa` |
| `test_helpers.cjs` | `ab91ab1a76729d8f8c946f94417099b4ef79722343062ea39fb141fe1349cd23` | `c75c319163cb624220bc88cce4f14efd1a214c0e39393ad338bdf00b7c49a8d2` |

This new immutable report is the worker's only additional persistent write.
The separate Python worker's authorized concurrent edits affect only
`arithmetic.py` and `test_preparation.py`. The total currently observed stage
delta against initial007 is exactly those four authorized files; the other
twelve frozen implementation/test files match the initial007 archive.
`controller.js` remains
`da4473ac8014f39fd255b830121508738c16980b6e303fb0a9b8c963ce0f13a8`.
The complete score remains
`95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb`.

## Preservation And Limits

Before/after read-only inventories include each root directory and all
descendants, relative names, lstat mode/size/mtime-nanoseconds/inode, link
targets and regular-file SHA256. All three inventories compare equal:

| Evidence Directory | Entries Including Root | Unchanged Inventory SHA256 |
| --- | ---: | --- |
| `arithmetic-package-007-review-base` | 18 | `ddf2365c11f02df8e23d6f44208e585a6f99cd89b8bdc1f28a937f1f89f3d999` |
| `arithmetic-max-runtime-006` | 142 | `167db4de416a4b38e48f0010fde3ea9e0ce30ec9ea8bb177d09eb0eeac01e9da` |
| `arithmetic-native-score-001` | 6 | `4653a982a848278aaa21f4984926220247d3292afff35e3851e1580225c35ae2` |

The initial007 implementation reports, scoped review, review map and review
diff retain their recorded hashes. All sixteen initial007 archive file hashes
also compare equal before and after this work. No historical/private evidence
was written, and no preparation, runtime/display/Wine/Max/native launch,
capture, commit or delegation occurred.

No remaining JS issue was identified within this bounded correction and its
tests. Focused independent rereview remains pending. These synthetic results
do not establish live installation, V8 permission, capture completeness,
parity, silence or saved order. Qualification remains0/2103; the full78
operations,504 states,141 original emissions and six independent closes remain
required.
