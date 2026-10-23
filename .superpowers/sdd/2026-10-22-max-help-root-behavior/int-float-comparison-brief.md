# Int/Float Comparison Brief

Planning inspection, 2026-10-22. This brief defines a separate finite comparator
for the retained 54-operation Int/Float score. It records no new Max or native
execution and does not change the completed append/prepend comparator.

**Goal:** Compare typed endpoint streams, directly observed numeric UI values,
Message prototype retention, owner lifecycle and the finite destination-output
order against the same source-bound score.

**Architecture:** Validate artifact identities and the complete operation/live
owner/request matrix before evaluating values. Keep numeric getter evidence,
typed output messages, native internal state, destination-output order and
saved-authoring/order/view/gesture claims separate. Unavailable capabilities
produce a failed gate or an explicit unknown result, never an empty success.

**Tech Stack:** Python 3 standard library and original synthetic unittest/CLI
fixtures. The new comparator consumes existing public native evidence and the
separate `experiments/max-reference/int-float-runtime-20261022` capture package.

**Spec:** `docs/superpowers/specs/2026-10-22-max-help-root-behavior-design.md`;
score details in `.impeccable/review/max-fidelity-20261021/int-float-score-plan.md`.

## Bound Inputs

| Artifact | SHA-256 |
| --- | --- |
| `experiments/max-reference/help-roots-native-20261022/int-float-score.json` | `0ea52e269e960d64f7a55f137a1925d2186119cd6d960afabc21730e3c2fad30` |
| `experiments/max-reference/help-roots-native-20261022/results/int-float-native-score-current.json` | `5fc133b2909ec845150541068a16b3ec391435142eeabfb8e4cb924b63df0726` |
| Retained private 644-assertion verifier | `f9ebd65c4ed06b466cc7c236e08f2e3087f616df20eed259b349dd23a4b4684c` |

The verifier source and retained public assertion metadata were inspected; the
verifier was not rerun for this planning task. Its 644 checks cover integrity,
retained state, lifecycle, main values, destination output/input order, named
send, sender setup, cold store, display-only edits, direct buttons, float scaling
and UI conversion. Those native-only checks do not substitute for Max evidence.

The exact installed identities are:

- int: `bbb8fc3b458eb168fe69b8709ba343808d23b6d55e2c59cc3086d01976c5ac61`.
- float: `c5e9bd4e89ebc5808d2faf76400031705c35195c32b363b890787a37bbdec15c`.

Do not copy source-owned Message text, sender names, helper payloads, initial
creation operands or private dictionaries into the comparator report. Public
stimuli, typed receipts, hashes, numeric outcomes, anchors and classes suffice.

## Native Shapes And Exact Coverage

The score uses `action`, not `op`: 4 installs, 48 events and 2 closes. Install
rows include an exact positive integer revision; event rows include anchor,
inlet 0 and typed message; closes have no invented control action. There is no
automatic install prefix, separate `initial` row or `row` label field.

Each public native result row has:

```text
step_id, action, document, accepted, failed, templates_unchanged,
trace_overflow, console, trace, snapshots
```

Every snapshot has `document`, `revision`, `text_edit_serial`,
`console_dropped`, and `nodes`. Each node has `anchor`, numeric `kind`, `value`,
`pulses`, and normalized `last_message`; the saved Message additionally has
`message_box={empty,generation,prototype,arguments,placeholders}`. Trace rows
have `ordinal,document,anchor,phase,port,message`. The native trace is 342 rows:
168 inputs and 174 outputs. Its ordinal order is local to a completed operation.

| Score Interval / Boundary | Exact Live Owners After Operation |
| --- | --- |
| `install-int`, `E01` | int revision 1 |
| `install-float` through `E40` | int revision 1, float revision 1 |
| `close-float`, `E41` | int revision 1 |
| `reinstall-float` through `E44` | int revision 1, float revision 2 |
| `close-int`, `E45` | float revision 2 |
| `reinstall-int` through `E48` | int revision 2, float revision 2 |

This is exactly 102 live-owner checkpoints: 52 int and 50 float. A checkpoint
for only the action owner loses cross-owner receiver state. A closed owner must
have neither checkpoint nor output receipt. Every install/close boundary must
preserve any other live owner; each reinstall resets only its own owner from a fresh
pristine working copy. No control outputs are expected for install or close.

Each int snapshot contains 14 executable nodes and each float snapshot 16, for
1,528 native node states. The full source trees contain 25/27 boxes, their Basic
scopes contain 21/23 boxes, and the complete observer inventories contain 20/22
leaf cables. Executable node counts are not the full-tree identity inventory.
Runtime cable inventories contain 10/12 saved cables respectively.

The exact directly comparable UI set in each document is
`root/obj-2/{obj-16,obj-17,obj-18,obj-20,obj-21,obj-33}`: four number/flonum
controls and two sliders. Six values for every live-owner checkpoint yield
612 comparisons. Primitive finite numeric zero is valid; null, boolean,
missing or unsupported getter results are unavailable. A getter's scalar or
single-element container representation is separate from a measured Max atom
tag. Float-valued UI state may be serialized as an integral JSON number; typed
message tags are compared on receipts instead. Preserve signed zero when the
observation provides it, and introduce no unreviewed numeric tolerance.

The internal main/sender stores (`obj-22`/`obj-28`) and isolated alias (`obj-9`)
must not be treated as UI getter values. Their native retained state remains
available for native-only invariants, and the score's original recall/send
actions compare their observable behavior. Extra direct state comparisons need
an independently demonstrated getter capability and an explicit schema scope.

## Reference Interface Requirements

The numeric reference implementer proposed schema version 1 with separate
receipts and all-live-owner checkpoints. Freeze field spellings against that
package's `schema.md` before implementation; the semantic requirements are:

- Bind the exact score path/hash/byte count/54 operations and both source hashes.
- Keep the action's document/revision distinct from a receipt/checkpoint's
  observed document/revision. A float action can update int receiver UI state;
  a close operation checkpoints only the surviving owner.
- Retain an exact operation ledger for all 54 actions and a request ledger for
  all 102 live-owner reads. Bind unique positive exact-integer request IDs,
  step/action, action owner/revision, observed owner/revision, source identity,
  working path, private raw observation SHA-256 and positive byte count.
- Check the exact live-owner/revision matrix derived from the score before any
  `all()` aggregation. Request coverage must be duplicate-sensitive. Preserve
  command identity across revisions and reject stale responses.
- Record all six numeric UI anchors/classes per checkpoint and the numeric
  getter representation. No absent anchor may become a zero-value state.
- Record the sole saved Message at `root/obj-2/obj-29` per checkpoint: text hash,
  character count, and a source/anchor-bound authored-prototype identity whose
  unchanged outcome is checked. There are 102 Message checkpoints. Numeric
  roots have no cold Message display; append's cold-Message gate is inapplicable.
- Preserve direct leaf observation of every original executable outlet, exact
  input/output endpoint multisets including duplicate multiplicity, full-tree
  box identity, and the declared observer branches. Carry `saved_order_observed`
  as exactly false; runtime endpoint inventory does not expose saved order.
- Bind actual event stimuli to the score's typed selector/atoms and the action
  completion bracket. Verify 48 stimuli and 54 operation completions, with no
  invented lifecycle emissions or receipt from an absent/stale owner.
- Require exact-boolean numeric readback, typed float dispatch and initial
  Message prototype capabilities. Keep synchronous destination-output evidence
  separate: unavailable order capability yields an unknown order result.
- Cleanup proves original/pristine sources, all four helpers, preferences and
  every revision's working copy unchanged, with exact-owned process cleanup.
  Fresh revision-2 working files must not reuse a prior instrumented live copy.

The published interface is now
`experiments/max-reference/int-float-runtime-20261022/schema.md`. Successful
readback request records include the checkpoint's exact `raw_sha256` and
`raw_bytes`, with silent getter sequence boundaries. Public operation records
project exactly nine identity/liveness/path fields; private full score commands
retain action-specific injection fields. Stimuli explicitly carry inlet port 0.
Complete public receipt sequence numbers are contiguous from 1, so a missing
journal row cannot preserve accepted sequence coverage.

## Destination Order And Behavioral Scope

For exactly these 21 events, inspect the original destination outputs:

```text
E08 E09 E10 E11 E13 E14 E16 E17 E18 E19 E20 E21 E22
E24 E25 E27 E28 E30 E32 E43 E47
```

Filter each completed event to the action document's `obj-21:0` and `obj-24:0`
outputs. Require exactly one correctly typed numeric scalar at the first and
one bang at the second, then require the numeric output's observed sequence to
precede the button output's. Independently apply the same predicate to native
output ordinals. Native input ordinals additionally establish a native-only
input order; Max leaves cannot directly prove arbitrary inlet processing.

Two per-endpoint streams can match while this order is reversed. The comparator
must contain an original reversed-pair fixture that passes endpoint matching
and fails destination order. Missing/extra/duplicate outputs also fail. A true
synchronous capability must be backed by retained direct-control witnesses;
source-store leaf callback order is insufficient. If that capability is false,
report the Max order cell as unknown while preserving independently evaluable
endpoint/state results.

Display-only events `E29,E31,E33,E35` and direct indicator events `E37-E40`
have their own exact cardinality/silence rules. They never satisfy the main
destination-pair predicate. Thirteen saved-send actions produce 23 receiver
deliveries across the live-owner matrix; compare the pre-conversion typed
receiver output and each document's local UI conversion without imposing
portable order between documents. Exact full endpoint streams enforce silence
at sender/main paths as well as positive values.

All 13 saved-send actions also emit the original Message's selector and symbol
argument. Compare these source Message outputs using the shared hashed selector
and symbol form. Scalar-only injection does not permit omitting these outlets
from endpoint coverage.

## Proposed Comparator Boundary

Create `compare-int-float.py` and `test-compare-int-float.py` beside the existing
native replay. Do not modify `compare.py`, the retained score/results/verifier,
product code or either harness. Proposed CLI:

```text
python3 compare-int-float.py --native NATIVE.json --reference CAPTURE_DIR \
    --score int-float-score.json --output NEW_RESULT.json
```

Implement separately testable validation and comparison functions:

```python
model_timeline(score) -> list[operation_with_live_revisions]
validate_native(score, native, timeline) -> None
validate_reference(score, native, session, receipts, checkpoints, cleanup, timeline) -> None
compare_endpoint_streams(reference_receipts, native_trace) -> dict
compare_numeric_states(reference_checkpoints, native_rows) -> list[dict]
compare_destination_outputs(reference_receipts, native_rows, timeline, capability) -> list[dict]
```

Result fields must distinguish artifact/coverage gates, endpoint values/tags,
612 UI state comparisons, 102 Message prototype checks, 21 destination output
order cells, native-only retained-state/input-order assertions, runtime endpoint
retention and unresolved saved order/view/gesture/metadata gates. Include exact
input hashes and method metadata, retain exclusive output creation, and keep
`complete_installed_help_qualification_passes_added=0` for every outcome.

Original fixtures must exercise complete lifecycle coverage, cross-owner sends,
revision-2 reset, missing/stale/duplicate checkpoints, six-anchor coverage,
primitive getter failures, typed float-versus-int receipts, incorrect actual
stimulus, output silence/cardinality, reversed cross-anchor order and cleanup
working-copy failures. Use synthetic CLI tests for acceptance/refusal. Do not
run a preparation, native scorer or Max capture as part of comparator work.
