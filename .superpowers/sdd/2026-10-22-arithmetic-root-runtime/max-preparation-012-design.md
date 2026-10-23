# Preparation012 Bounded Front-Root Observation Design

Status: proposed diagnostic-only scope. Parent acceptance of capture011 audit,
diagnostic investigation and independent review of this design must precede any
implementation. No012 source, preparation or target run is authorized by this
document alone. The user has authorized continuing the original Max work.

## Evidence And Unresolved Question

Capture011 fails at command101 with a runner TimeoutError. It retains accepted
ACK1-100 only. Final private ack.json contains a distinct false ACK101,5696 bytes,
SHA25687c03688cee90985af8bb4d99bd3d51db773d04f33ddc5ca3080b1f7759f2b9b.
It is forensic evidence, not a runner-accepted/retained response. Parent verified
all six original REA public hashes before projecting metadata. Inputs/source and
preferences remain preserved. Capture011 integrity/diagnosis reviews are pending.

The new progress record binds the prepared request and reports successful initial
snapshots and source validation; observe70/sample70/source-validation1. First and
last eligibility failures, polls1 and70, are front-root /front-root-mismatch /
minus-root-ownership. Intermediate reasons are not retained. Envelope/collection
are false; original owned lookup/invocation/outcome/pair counters are zero.
No inference about009/010 counters follows.

The poll captures p=max.frontpatcher and verifies its filepath against the owned
working path before validateTree traverses the original hierarchy. The collector
then rereads max.frontpatcher and rejects when that operand !== the poll root.
This proves a strict JavaScript identity inequality for the retained first/last
failures. It does not establish a focus change, different native document,
unstable wrapper identity or a causal defect in the ownership policy.

## Decision

Add one bounded forensic observation on the FIRST eligible front-root mismatch,
reusing both original comparison operands. Keep the original predicate and every
refusal exactly. This is diagnostic-only; no alias acceptance, policy relaxation,
getter admission, suppression, retries, scheduling/capacity/deadline change or
qualification advance. A successful diagnostic may still leave native document
identity unresolved and would not itself justify a later equality change.

Only controller.js and appended test_helpers.cjs may change. Changes in controller
are confined to createMinusDiagnosticCollector and the existing fail insertion.
Other fourteen mapped files and the complete011 test prefix remain byte-identical.
The011 progress record and original optional capability envelope retain their
schemas, latch, counts, staleness and export semantics. Nonminus ACKs are unchanged.

## Read And Lifetime Contract

In sample(), evaluate the original max.frontpatcher read ONCE at its original
position, retain that local operand, and perform the unchanged !==root check.
When false, follow the exact old path. When unequal, the first qualifying mismatch
may collect the record below, then MUST reject with the original reason/code.
Qualification here requires the current progress stage be eligibility, initial
owned snapshots/source cache be available, and no evidence/envelope or attempted
capability exist. Collection/guard/later/terminal failures never trigger new reads.
Mark the one-shot as spent BEFORE any diagnostic read. No second observation or
retry is allowed, including after partial failure, thrown getters or reentrancy.

At most SIX additional host reads, in this fixed order:

1. Poll root.filepath.
2. Original front operand.filepath, if the operand is a nonnull object/function.
3. Poll root.parentpatcher.
4. Original front operand.parentpatcher under the same presence guard.
5. One repeated max.frontpatcher read.
6. Repeated front operand.filepath under its presence guard.

The existing first front read is reused, not duplicated or counted as additional.
Path/parent reads skipped for absent/malformed front operands remain explicitly
skipped; exceptions do not trigger fallback, traversal or retries. Each diagnostic
getter is independently caught; do not inspect an exception's properties, type,
string or serialization. Root reads use the already-owned poll root; they do not
substitute or modify the collector root. No child/object inventory, geometry,
format, getvalueof, message, filesystem, I/O, source/config hashing or timing probe
is added. All old host reads remain in their original order, with this bounded
block inserted only after the already-failing first-front predicate.

Use only primitive path strings in the existing samePath comparison with the
owned snapshot's working_windows_path. Never persist or export raw observed
paths, path hashes, parents, wrapper/host handles, descriptors, names, titles,
graphs, geometry or private numeric values. Local observed values/handles do not
escape the synchronous observation; retain only the primitive statuses/booleans.
Do not put diagnostic phases into011 progress or replace its first/last failures.
No diagnostic failure may clear/replace the original front-root rejection.

## Separate Terminal Record

Expose an independent host-free deep-copy export. In fail(), add an optional
minus_front_root_observation only when the one-shot record exists. Preserve
minus_collector_progress and minus_numeric_preflight_diagnostic exactly.

Exact record fields:

- version: minus-front-root-observation-v1.
- identity: fixed request101 /install-minus-r1 /minus /revision1 /owner_inlet4 /
  source_sha256 and source_projection_sha256. Bind to the existing owned identity
  and complete source gate; do not copy mutable input objects or add raw paths.
- poll_index and stage: the existing poll and eligibility stage.
- original_front: present boolean and same_as_poll_root=false, using evaluated
  operands only. Presence means nonnull object/function without host properties.
- root_path, front_path, repeated_front_path: each has status returned/threw/skipped,
  string_value boolean or null, matches_owned_path boolean or null. Only a returned
  primitive string permits the path comparison; other values remain uninspected.
- root_parent and front_parent: status returned/threw/skipped and is_null boolean
  or null, without exporting or traversing nonnull results.
- repeated_front: status returned/threw, present boolean or null,
  same_as_first_front boolean or null and same_as_poll_root boolean or null.
- root_front_paths_equal: boolean only when both first path reads returned
  primitive strings, otherwise null; uses existing samePath normalization.
- extra_host_reads_attempted: integer0..6, incremented immediately before each
  actually attempted additional getter/read. Skipped paths/parents do not count.

Initialize the complete bounded record before reads. On any caught diagnostic
exception retain the corresponding threw status and continue only the remaining
fixed independent reads. Serialization/export observes plain owned primitives
only, returns independent copies, performs zero host reads and retains no handles.
No error message or exception object is retained. No unbounded history is added.

## Verification And Readiness

Before source edits, demonstrate a meaningful RED through the real synthetic
install/poll/fail path: fresh front wrappers with the same owned path preserve
false ACK /seven old diagnostics /no capability envelope /zero calls but lack
the proposed independent observation. Use only original synthetic fixtures;
never turn licensed capture data into host mocks or execute historical code.

Append tests for stable/same-path distinct wrappers, genuinely different front
path, absent/malformed fronts, parent null/non-null, all six individual thrown
getters, nonstring path values, partial/repeated/reentrant observation, no more
than six reads, exact ordered original-plus-insertion trace, no extra reads on
matched-front/root-parent/other refusals, no later/guard/terminal observation,
unconditional original refusal/error semantics, unchanged011 progress/envelope,
host-free immutable exports and no effects on nonminus ACKs. Throwing payloads
must prove no exception property/string/serialization inspection or raw-value
retention. Mutations to returned records must not affect retained evidence.

Keep original stable/ineligible work and ordered-host-read oracles exact where
the mismatch block is not entered. Meaningfully test the added six-read bound
separately rather than silently changing those prior work expectations. Parent
fresh focused/full regression, syntax and actual-source checks on the final pair
follow implementation; do not reexecute native evidence. Independent frozen
source review, fresh archive/sealed preparation, concrete review, freshness /
process ownership gates and one parent-only bounded capture follow in sequence.

All34 current private roots /2052 entries, original inputs/preferences, historical
archives/captures and native exact-five remain immutable throughout design/source
work. Capture011 stays FAILED,52 operations /336 states /94 outputs /four closes;
all six whole flags false. Full78 operations /66 events /72 live plus6 empty
checkpoints /504 states /141 outputs /six closes /90 native cable deliveries /
297 typed receipts /commands1-150 plus151 barrier and qualification0/2103 remain.
