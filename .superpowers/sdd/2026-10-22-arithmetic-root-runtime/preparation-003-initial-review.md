# Arithmetic Revision003 Initial Static Review

Status: REQUIRES_CHANGES. Two bounded findings must be corrected and refrozen
before concrete preparation003 review. No actual preparation003 or launch was
performed by the reviewer.

Reviewed ten-file package SHA-256:
`68c6d3e1f17a84955c8947d8910f9e228b02973728b0b7b673bae4441f81f59c`.

Review-base archive binding SHA-256:
`2bb8881d6fadd011a227780aee598b6f5de0391cf29bc4eac39f78a50440ade6`.

## Findings

### 1. P2: Numeric Representation Gate Admits Sub-Tolerance Live Geometry Drift

Locations under `experiments/max-reference/arithmetic-roots-runtime-20261022/`:
`controller.js:247`, `controller.js:257`, `controller.js:204`.

With a present controller representation policy, `resolve` still obtains its
candidate through `sameRect`, whose inherited tolerance is 0.01 on each axis.
The policy pins the expected saved rectangle, but
`controllerNumericRepresentationObservation` never checks the actual runtime
rectangle against that saved rectangle. An otherwise matching runtime number
whose rectangle differs by a nonzero amount below that tolerance therefore
passes the new format/getter/initial-value gate.

This violates the acknowledged requirement to admit only a uniquely matched
exact saved rectangle and refuse changed geometry. The existing helper tests
mutate the expected pinned rectangle, not a live runtime rectangle by a
sub-tolerance amount, so they do not cover this path.

Required correction: for a present numeric representation policy, enforce an
exact finite live rectangle match before making capability observations or
accepting the controller binding. Add focused refusal coverage for nonzero
sub-tolerance runtime drift and unavailable/throwing live geometry, retaining
the existing nonpolicy geometry behavior.

### 2. P2: Truncated V8 Inventories Can Produce Positive Capability Observations

Locations under the same directory:
`v8-readback.js:181`, `v8-readback.js:215`, `v8-readback.js:239`,
`v8-readback.js:247`.

`representationObjects` can return an incomplete bounded prefix. Both root and
numeric collection set `strict_mismatch` when this occurs, but continue to
select a candidate whenever that prefix has one match. Root selection can then
derive Basic, and numeric selection can make format/getter probes. A duplicate
source candidate beyond the enumeration bound is unseen, so a positive
capability observation and apparent unique candidate count can be recorded
without proven uniqueness of the object or its parent.

V8 still refuses the checkpoint because `strict_mismatch` is true; this finding
concerns the authority of the retained diagnostic evidence. The acknowledged
design requires source/parent uniqueness before probing, and requires unknown
capability outcomes for ambiguous or unavailable bindings.

Required correction: retain all four root and three numeric rows while exposing
inventory completeness/count coverage. Keep capability outcomes unknown and
avoid getter calls wherever the required root or numeric inventory is
incomplete, including when a duplicate lies beyond the bound. Add focused
overflow/hidden-duplicate coverage for root and Basic inventories. Partial
observed candidate counts must not imply complete unique binding.

## Other Reviewed Requirements

No additional finding in the frozen scope:

- The new controller policy is restricted to the three source-owned times
  anchors and explicit pristine revisions 1/2, with fresh install owner,
  document/path, request, step, scalar-format and finite-singleton-getter checks.
  It binds the source-derived default initial value; no authored saved numeric
  literal or startup message is invented.
- Private capture002 ACK/config/seal/manifest pins, all sealed inputs and the
  pristine source are checked before policy construction. Source box/text,
  saved rectangle and private initial-value hashes independently match the
  source. Python/controller/V8 numeric pin maps agree.
- Original `maxclass`, `runtime_class` and `runtime_classes` descriptors are
  unchanged across all three sources, including strict flonum descriptors.
  Both policy descriptor inventories have times=3, plus=0, minus=0. Legacy
  numeric-mode policies remain unadmitted.
- V8 collects three numeric and four original source-root rows and preserves
  strict runtime-class refusal for number/flonum and jpatcher/patcher
  differences. The normal failed-checkpoint transport retains the aggregate
  diagnostic payload. Getter availability/throwing and missing/duplicate
  candidates within a complete inventory are handled without suppressing the
  remaining rows.
- V8 root pins cover the exact four original top-level times boxes and match
  source box/text/rectangle/class descriptors. Root class mismatches do not
  suppress numeric diagnostics when Basic can otherwise be uniquely bound.
- No plus/minus representation gate, V8 class alias or lifecycle admission is
  introduced. Both lifecycle implementation files and all other five owned
  files outside the stated five-file change remain unchanged from revision002.
  Complete private diagnostics are not projected as public numeric values.

## Fresh Read-Only Verification

The reviewer recomputed the frozen package digest and confirmed exactly five
changed files relative to archive002. All sixteen implementation files in the
parent's revision003 review-base archive match this freeze. The source metadata
verifier accepted the three sources, four helpers and 60 full-tree boxes;
numeric policy maps and original class descriptors matched as described above.
All 22 historical002 sealed inputs and the frozen score remained hash-identical.

The reviewer ran no test suite, runtime, display or capture. The author reports
12 preparation tests, four lifecycle tests and the Node helper suite passing;
the parent reports 44 integrated tests with one skip and Node passing. Those
reported passes do not cover the two missing cases identified here.

| Supporting Artifact | SHA-256 |
| --- | --- |
| Acknowledged revision003 design | `61548d0fe3c755d95600681bae59e45d31de427e7793394c6417cb1e879edaa1` |
| Author frozen003 report | `df292f345b3954080ff02c2d007616d2d257a99c2b7af059d696b541ca207507` |
| Parent revision003-vs002 diff | `ca5b58b55e0f1b965896eb66d1889093b5377b8469c0bb6bcfcfba553974ffca` |

This review establishes no new V8 capability, numeric output tag, arithmetic
event, reset behavior, cable delivery, real close or final lifecycle barrier.
Capture001/002 remain immutable failed captures with zero completed score
operations. A corrected freeze needs focused re-review before fresh003
preparation, followed by concrete binding review before the parent's launch.
