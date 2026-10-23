# Preparation011 Independent Design Review

## Findings

### P1: Require distinct short-circuit ownership subcondition markers

References: `max-preparation-011-design.md:55`,
`max-preparation-011-design.md:65`,
`max-preparation-011-design.md:87`.
Frozen source references:
`experiments/max-reference/arithmetic-roots-runtime-20261022/controller.js:492`
and
`experiments/max-reference/arithmetic-roots-runtime-20261022/controller.js:495`.

The instruction to record a phase before each ownership/property boundary does
not explicitly require distinct records for the short-circuited subconditions
inside a compound ownership check. A conforming coarse implementation could
retain root-ownership plus the existing minus-root-ownership reason for either
front-root mismatch or root-parent mismatch. Similarly, a scope-ownership
marker plus minus-scope-ownership can conflate duplicate scope, child-parent
mismatch and child-container mismatch. Existing explicit refusal codes are
shared by these different predicates.

Trigger: a fresh capture fails one of those existing comparisons, with no
capability envelope, and progress records only the compound boundary and its
unchanged refusal code. The next bounded capture would still not distinguish
the relevant unverified Max ownership assumptions. This directly affects the
purpose of the proposed instrumentation; capture010 supplies no retained
equality observations that resolve the ambiguity afterward.

Correction: explicitly require a distinct fixed phase or subcondition reason
for each evaluated ownership operand, including front-root versus root-parent
and duplicate-scope versus child-parent versus child-container. Reuse only
operands evaluated by the original expression. Preserve their order, strict
comparison, short-circuit behavior and skipped property reads. Do not inspect
the runtime type or properties of an unexpected exception or host value;
unexpected throws retain only a generic thrown enum and the active phase.
Leave existing public refusal messages and guard-threw meanings unchanged.

Require original synthetic controls that independently reject each relevant
subcondition and show distinct terminal progress markers. Include throwing
property reads and assertions that a failed earlier operand never reads a
later property. The unchanged complete ordered-read oracle remains necessary
for the successful sample path; it does not itself prove the short-circuit
failure paths. No new live probe or additional capture is needed to test this.

## Verdicts

Specification verdict: **NEEDS REVISION**, limited to the finding above.

Design-quality verdict: **NEEDS REVISION**, for the same diagnostic precision
gap. The proposed two-file scope, bounded aggregate and separation from the
original capability envelope are otherwise sound. No other actionable finding
was identified. A scoped rereview of the explicit subcondition and test
amendments is sufficient; broader implementation or test expansion is not
requested by this review.

Reviewed design SHA256:
`95a56819a87a9c96b2db242d08bd8a55066832040e592559a9a7d7425fdfb4ca`.

## Remaining Contract Assessment

The design correctly preserves every original guard, source check, equality,
host read, iterator step and their ordering. Progress assignments must be
owned bookkeeping around existing evaluations; a phase helper cannot acquire
another property value. Root filepath remains the last host read in each
complete sample, followed by the existing plain input checks. No extra
eligibility pass, equality probe, wrapper remapping, capability lookup,
invocation, retry, admission or timing/capacity change is authorized.

The new record is available whenever the exact request-owned collector exists,
including when the original optional envelope is suppressed. Its initial and
eligibility phases, source-validation counters, sample attempts, collection
creation/entry flags and first/last failures can distinguish the principal
suppression boundaries without another probe. The required subcondition
amendment supplies the missing precision within compound ownership boundaries.

Copying existing evidence counts, or initialized zeros before evidence creation,
can provide measured progress for preparation011. The design explicitly
forbids treating these new instrumented zeros as observations of009/010. It
also preserves the original envelope's exact schema and attempted-latch export
condition, six slots, partial counts, first collection failure and monotonic
stale context. A separate progress snapshot can expose a created-but-unexported
collection without changing that original envelope contract.

The bounded aggregate, fixed code-owned phases/reasons, first/last failure
retention and owned identity avoid unbounded traces and raw host data. Export
must copy only retained owned state, perform no host/input rereads, and return
independent plain copies. Hostile exceptions must receive generic thrown
classification without property inspection, type probing or conversion. The
initialization and export tests should demonstrate these constraints through
the existing terminal ACK path, as the design requires.

The proposed RED is meaningful: the current full synthetic install/poll/fail
path already returns seven diagnostics and no optional envelope for stable
root ownership failure, but cannot satisfy a new terminal progress assertion.
The required counters, 0/1/6 prefixes, partial outcomes, first-guard stop,
later/terminal invalidation and export isolation tests address the added
instrumentation. Existing stable work totals and the ordered host-read digest
must remain unchanged, with no weakened assertions or new timing thresholds.

## Verification And Boundaries

Read the supplied design, frozen source-map binding, current collector and
its surrounding export interface, relevant010 test/evidence contracts and
the accepted capture010 diagnostic investigation. The investigation SHA256 is
`7b173060d225ca6ba343e2f04e991b648bb2fc58aa08b9f8160cab6982ffb357`.
Its optional suggestion to classify exception types is superseded here by
the parent's explicit generic-unexpected-exception requirement and the
reviewed design's prohibition on unknown exception inspection.

Read-only `python3 -B` hashing confirmed all sixteen current source files
match `preparation-010-source-review-fix1.json`, SHA256
`a6790ed0840efe8492ed53eeb2e38ca0454eadbd0e0339294cac76c237b054b2`.
The canonical sixteen-file map is
`625b52d524b49919ac149287ac06274d3e067ffe211fbbdbd9fbed1bdfb8e400`.
Frozen controller and test hashes remain:

- controller.js: `90e012563d7a91b5346a071766c5f17b94d7efd1ce912b7e0ba1f303a19ac6a3`.
- test_helpers.cjs: `4ccd76f00cb8a88a55f571afa911b49dd051a1e9108ee6707531a440536be4a4`.

No tests, implementation edits, private writes, historical/native execution,
source reconstruction, target/display launches, preparation, archive,
delegation or commit were performed. Only this review report was written.
No licensed data was printed or copied. This review establishes no actual
Max wrapper identity, initial snapshot success, eligibility result, lookup or
invocation count for capture010.

Implementation remains gated on parent acceptance of both capture010 reports.
All32 private roots, original refusal/admission gates and timing/score bounds
remain frozen. Qualification remains0/2103, with the full denominator of
78operations/66events/72live+6empty/504states/141outputs/6closes/
90nativecables/297typedreceipts unchanged.

The report hash is supplied after writing in the reviewer return message.
