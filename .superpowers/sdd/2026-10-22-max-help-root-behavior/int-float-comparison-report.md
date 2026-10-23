# Int/Float Comparator Implementation Report

2026-10-22. The separate finite numeric comparator is implemented and frozen.
This work ran original offline fixtures and syntax checks. Actual Max capture,
native scorer execution and retained Max/native parity comparison remain pending.
The installed-help qualification increment remains zero.

## Owned Deliverables

| File | SHA-256 | Bytes |
| --- | --- | ---: |
| `experiments/max-reference/help-roots-native-20261022/compare-int-float.py` | `b0e962ace212eb787f26d7aaeb1681f9f1d62c2848d8729480294dbee3c36a62` | 39769 |
| `experiments/max-reference/help-roots-native-20261022/test-compare-int-float.py` | `7f76750c9cfcc1d1cf5dd7b979fe82b784f0cdf75f05d5e11b2ca6fd30e7eb22` | 25777 |

The planning interface is recorded in
`.superpowers/sdd/2026-10-22-max-help-root-behavior/int-float-comparison-brief.md`.
The producer's public schema is
`experiments/max-reference/int-float-runtime-20261022/schema.md`.

The existing append/prepend `compare.py`, completed score/results/private verifier,
replay, product code and both runtime harnesses were left unchanged by this
numeric-comparator task. Producer fixes were coordinated with its owner.

## Input Evidence And Native Correspondence

The planning inspection read the retained public score/native result and the
private verifier source, without running that verifier or a runtime. The public
assertion metadata records 644 native checks in 13 groups with zero failures.
Their native-only status remains explicit.

| Retained Input | SHA-256 |
| --- | --- |
| `int-float-score.json` | `0ea52e269e960d64f7a55f137a1925d2186119cd6d960afabc21730e3c2fad30` |
| `results/int-float-native-score-current.json` | `5fc133b2909ec845150541068a16b3ec391435142eeabfb8e4cb924b63df0726` |
| Private verifier source | `f9ebd65c4ed06b466cc7c236e08f2e3087f616df20eed259b349dd23a4b4684c` |

Root independently reported that read-only `model_timeline` plus `validate_native`
accept the actual retained score/native artifact. This is artifact validation;
it does not rerun the scorer or establish a Max comparison.

The comparator derives all owner revisions and live sets from the declared
54-operation timeline: four installs, 48 scalar events and two independent-owner
closes. Native rows have no synthesized install prefix. It requires exactly
102 checkpoints (52 int, 50 float), with both live owners represented after
cross-document sends and only the surviving owner represented after close.
Reinstall uses revision 2, a distinct working path and source-initial native
state while preserving the other owner.

The source inventories distinguish full tree, Basic scope, executable nodes,
saved cables and added observers:

| Document | Full Boxes | Basic Boxes | Executable Nodes | Saved Cables | Observer Leaves |
| --- | ---: | ---: | ---: | ---: | ---: |
| int | 25 | 21 | 14 | 10 | 20 |
| float | 27 | 23 | 16 | 12 | 22 |

The six directly observed UI anchors per live owner produce exactly 612 numeric
comparisons. The sole saved Message produces exactly 102 source/anchor-bound
prototype checks. Internal store and isolated-alias state is validated within
native snapshots; observable main/sender behavior is compared through original
endpoint receipts and declared recall/send actions.

## Accepted Interface And Refusal Gates

The CLI requires `--native`, `--reference`, `--score` and `--output`. It verifies
the score's actual hash/size against the native artifact and reference binding,
then validates the complete native and reference matrices before constructing a
comparison result. The output path is created exclusively.

Reference operation ledgers contain exactly the agreed nine identity, liveness
and working-path fields. Request IDs are positive exact integers and increase
globally across all 156 operation/readback commands. All 102 checkpoint requests
bind operation identity, action owner/revision, observed owner/revision, source,
working path, method and retained raw observation digest/byte count. The request
record's raw digest/size must exactly equal its checkpoint's. Getter sequence
boundaries equal the completed action's journal sequence, proving no intervening
readback emission within this evidence format.

Public journal sequences must be contiguous from 1. There are exactly 48 typed
stimuli and 54 completed operation brackets. Stimulus port, source, owner,
revision, anchor and exact typed message match the score; float-zero sign is
preserved. Lifecycle commands cannot invent control outputs. Closed or stale
owners, duplicated/missing snapshots and reordered operations fail coverage.

Numeric getters require primitive finite values, exact six-anchor coverage,
expected number/flonum/slider classes, declared getter representation and class
semantic tags. Null, missing, boolean and nonfinite observations remain failures.
Class semantic tags never become measured receipt tags. Serialized-state labels
and unsupported checkpoint/operation fields are refused.

Runtime retention requires exact Basic/observer counts, both duplicate-sensitive
endpoint multiset gates, zero unexpected cables, and `saved_order_observed=false`.
Cleanup requires all four revision working records, unchanged installed/pristine/
working files, unchanged preferences, exact-owned process cleanup and all four
pinned helper hashes. Both installed and private helper copies require exactly
true preservation flags.

The finite capability gates for initial Message prototypes, initial/runtime
numeric readback, silent getters, runtime endpoints and typed float dispatch
must be exactly true. The synchronous destination-output capability is separately
typed: false preserves evaluable endpoint/state results and reports order as
unknown, with a failing overall comparison gate.

## Comparison Results

Typed per-endpoint streams compare selector, atom values, tags and cardinality,
including silence. All 13 original saved-send Message outputs remain included
using shared hashed selectors/symbol atoms. An unknown numeric list tag can
match a numeric value without becoming a measured scalar tag.

For the 21 declared main-store events, the comparator requires one typed numeric
output at the original `obj-21:0`, one bang at `obj-24:0`, and numeric-before-button
sequence. It independently checks native output ordinals and records native-only
destination input order. The reference's direct synchronous witnesses must bind
the exact observed output sequence and operation request. Display-only edits and
direct indicator actions do not enter this predicate. Named-receiver output order
between documents is unconstrained.

Result fields keep endpoint values, 612 UI states, 102 Message prototype checks,
21 destination output cells, native-only input order, runtime retention and
input artifact hashes separate. V8 numeric readback never sets serialized-state
success; `all_serialized_message_states_match` is null. Saved cable order, saved
authoring, physical actions, shared views, rendering, fonts/layout, metadata and
whole-help qualification remain unresolved.

## Verification

Final frozen-code commands:

```text
python3 -B experiments/max-reference/help-roots-native-20261022/test-compare-int-float.py -v
15 tests passed in 4.961 seconds

python3 -B experiments/max-reference/help-roots-native-20261022/test-compare.py
17 tests passed in 0.848 seconds
```

Both new files passed `ast.parse` syntax validation. The test suite includes
complete synthetic lifecycle/state coverage, helper and CLI refusals for missing/
duplicate/stale/mislabeled data, primitive getter failures, capability truthiness,
typed float dispatch, signed-zero stimulus identity, source/working retention,
private helper preservation/hash mismatches, and source Message redaction/output
coverage. It also proves that matching per-endpoint streams can fail reversed
destination order, unavailable synchronous evidence stays unknown, UI mismatches
remain distinct from endpoint mismatches, and interdocument receiver order is
not imposed. Existing output files remain unchanged on CLI overwrite refusal.

A producer-contract test invokes its `retain_raw` helper on original synthetic
temporary bytes and verifies that the resulting raw identity binds both request
and checkpoint. Review found producer/consumer mismatches in stimulus port,
request raw metadata and operation projection; producer and comparator owners
aligned those exact fields before freeze. Contiguous sequence and private helper
preservation regressions first failed before their fixes.

Independent source review is coordinated through `arithmetic_ui_review`; final
hash verification belongs to the parent integration step. No source-owned text,
private dictionaries, source creation operands or helper payloads are copied into
this report, and no actual Max/native parity output is created by these tests.
