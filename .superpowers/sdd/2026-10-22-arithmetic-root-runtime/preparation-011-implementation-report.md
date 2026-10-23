# Preparation011 Implementation Report

## Result And Frozen Files

Implemented the accepted diagnostic-only `minus_collector_progress` terminal
ACK field. The source pair is frozen for independent review:

| File | SHA256 |
| --- | --- |
| controller.js | d1f2a675a6a28fc146baa5d9661d6eb96537972784829452fa0d0c6ffcb4edaa |
| test_helpers.cjs | ddabd1f17a0c464e5b6c56d87edbca3735d9f5043476f6b73e843f1048754779 |

Both files are under
`experiments/max-reference/arithmetic-roots-runtime-20261022/`.
Authority is the accepted amended design
`max-preparation-011-design.md`, SHA256
`b65608f50bd6e87600e511a97947f611a7b911e62e69bc8aa9cf1a7791f0f80b`,
with scoped rereview
`0ce650bae98f298fa0c88de3f84a9912a336ac1cc19aa1ae1a37d86571bf4c21`
and implementation brief
`231838ab536bf9aa51b1bec95d3aeade31285ab1b7871cd1f7c1461786497dc7`.
The parent accepted both capture010 reports before dispatch.

## Implementation Scope

Controller changes are confined to `createMinusDiagnosticCollector()` and one
new ACK-field assignment in the existing `fail()` collector branch. Read-only
comparison with historical010 bytes confirms everything outside those regions
is unchanged. Source predicates, pins, canonical primitives, other14 package
files and the app/UI remain unchanged. The original169409-byte test prefix is
byte-identical; all test additions are appended case011 groups.

The new `minus-collector-progress-v1` record retains exact code-owned request/
source/owner identity, an owned string working path or explicit null, initial
snapshot availability, observe/source/sample counters, the source-cache success
flag, envelope/collection-entry flags, current/last-sample phases and bounded
first/last failure records. Failure records contain poll index, stage, fixed
phase/reason and original fixed rejection code. Unknown exceptions receive
only `threw` at their active phase; no exception property/type/string/
serialization inspection is added.

The complete sample retains distinct front-root/root-parent and duplicate-
scope/child-parent/child-container markers. Splits preserve original strict
comparisons, operand order, short-circuit behavior and skipped reads. Every
other sample property, inventory, mapping, rectangle, child and final filepath/
plain-input boundary receives owned phase bookkeeping only.

`exportProgress()` reads only owned progress and original evidence counts.
It returns independent plain copies, with explicit zero counts before evidence
exists, and original collection status/first-failure snapshots when evidence
exists. This includes attempted=false first-guard stops where the original
optional capability envelope remains suppressed. The existing optional envelope
schema, export condition, six-slot results/counts, first-failure and stale
semantics remain unchanged. Nonminus ACKs receive no new field. No extra host
read, capability call, input hash, I/O, retry, timing/capacity allowance or
admission was added; unconditional minus refusal remains.

## TDD Evidence

Before any controller edit, the new original-synthetic install/poll/fail test
set `root.parentpatcher={}`. It confirmed false ACK, seven strict terminal
diagnostics, no old capability envelope and zero calls, then failed exactly:

`terminal refusal must identify the collector boundary even without a capability envelope`

The focused run exited1 with only
`minus011_terminal_root_parent_progress` in failures011. This meaningful RED
was reported to the parent before implementation. It passed after the scoped
progress implementation.

Parent review identified that a malformed owned working path could become a
nested identity payload. A second focused RED demonstrated an object-valued
path instead of null. The fix checks only the already-owned snapshot value:
strings are retained; other types produce explicit null. Object/array/number/
boolean/undefined controls pass in the final full run.

One added first-guard fixture initially alternated ownership on later samples,
which allowed original eligibility re-entry and did not model persistent
ownership failure. The fixture was corrected to retain the mismatch after its
first successful sample. It now independently expects70 poll samples plus the
first pre-lookup guard,71 total, zero attempts, a stopped collection snapshot
and the unchanged absent original envelope. No production retry behavior was
changed for that correction.

## Final Verification

The unfiltered command `node test_helpers.cjs` completed with exit0 after the
last source/test edits. No full-suite repeat followed. Both
`node --check controller.js` and `node --check test_helpers.cjs` completed with
exit0 on the frozen pair.

| Named groups | Completed | Failure array |
| --- | ---: | --- |
| preparation007 | 10 | [] |
| preparation008 | 11 | [] |
| preparation009 | 16 | [] |
| preparation010 | 14 | [] |
| preparation011 | 14 | [] |

All65 named groups and the original legacy dispatch, geometry, capability,
trace, lifecycle and scheduled-callback controls passed without changing their
assertions. Focused development runs selected groups using the pre-existing
007/008/009/010 environment filters; no old filtering code was edited.

New case011 groups:

- `minus011_terminal_root_parent_progress`
- `minus011_stable_progress_and_work`
- `minus011_ownership_subconditions_and_skipped_reads`
- `minus011_hostile_ownership_throws_and_skipped_reads`
- `minus011_initial_input_and_source_boundaries`
- `minus011_diagnostic_gate_boundaries`
- `minus011_malformed_owned_path_stays_primitive`
- `minus011_sample_property_throw_phases`
- `minus011_explicit_sample_rejections`
- `minus011_unattempted_first_guard_retains_collection_stop`
- `minus011_partial_lookup_invocation_and_classification_counts`
- `minus011_later_and_terminal_stale_boundaries`
- `minus011_owned_host_free_repeated_export`
- `minus011_nonminus_and_queued_callback_boundaries`

The failed/throwing ownership cases retain distinct markers and independently
check exact skipped-read prefixes, including a throwing duplicate-scope check.
Hostile exception proxies record zero inspection probes. New terminal controls
cover initial/input/source/diagnostic rejection, attempted=false collection
stops, partial lookup/invocation/classification, zero/one/six invocation
prefixes, later/terminal stale changes and independent export copies after
live data/host reads are made hostile. Export leaves the entire in-memory
file map unchanged. Original schema/count/refusal assertions also pass.

Deterministic work remains:

| Work | Stable eligible | Ineligible ownership |
| --- | ---: | ---: |
| Complete command/definition/config/owner canonicalizations | 1 each | 1 each |
| Successful cached source validations | 1 | 1 |
| Geometry hashes | 63 | 43 |
| Complete/attempted collector samples | 89 | 70 |
| Total rectangle reads, including legacy | 20820 | 19040 |
| Total root filepath reads | 159 | 70 |
| Capability invocations | 6 | 0 |

The ineligible oracle remains70 fresh ownership checks /140 ordered ownership
reads. The stable oracle remains89 samples x274 reads with ordered digest
`bd9606c23777bcc7bce36c56f688eaea22d3314bf88b55110394d03059fbfea6`.
Stable progress reports lookup/invocation/outcome/pair counts6/6/6/3; all
partial prefixes agree with actual fixture calls and the unchanged original
evidence counts.

## Preservation And Remaining Uncertainty

All32 private arithmetic roots and1788 entries retain the exact investigation/
implementation baseline inventory digest:
`f8fde306b517bb855b9b1ab84075da8625989b7e03c0faca2a4f849959e22728`.
The inventory includes names, type/mode, uid/gid, size, mtime_ns, ctime_ns,
inode, link targets and regular-file hashes. All other14 mapped files match
the frozen010 map. Only the authorized source pair and this report were
written. Every Python command used `python3 -B`.

No target/Max/Wine/native/REA/display launch, historical executable import,
private write, preparation/archive, broad Python suite, commit or delegation
occurred. Licensed graph/operand/default/mode/geometry/helper-body data was not
emitted or persisted. Historical010 files were used only for byte comparison.
Parent-owned independent source review, Python integration and real-source
checks remain pending at this worker's return.

Actual legacy-js API compatibility, strict wrapper identity and capture010's
internal refusal boundary remain unverified. The new progress is evidence for
a future separately prepared parent-owned capture; it does not resolve Max
refusal or establish timing, capability support or admission. Nothing is
back-projected into009/010. Qualification remains0/2103 with the full existing
denominator and all runtime/admission bounds unchanged.
