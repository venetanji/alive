# Preparation010 Source Re-review Fix1

## Findings And Verdicts

No new actionable finding in the scoped fix. The sole prior P1, custom
prototypes bypassing complete plain-input guards, is ADDRESSED.

- Specification verdict: PASS for the final frozen pair, incorporating the
  prior review's accepted invariants and this prototype correction.
- Quality verdict: PASS for the scoped fix and regression coverage.

This resolves the source-review blocker. Parent integrated checks, real-source
verification, private preservation, preparation and concrete launch gates
remain separate requirements. No timing fix or launch authorization follows.

## P1 Correction

Reviewed `experiments/max-reference/arithmetic-roots-runtime-20261022/controller.js:431`
and the new plainPrototype function at line448. Local Object.prototype and
Array.prototype are explicit allowed identities. A previously unknown foreign
prototype must have an own function-valued constructor descriptor, that
constructor's own prototype descriptor must point back to the exact proposed
prototype, and the captured native Function.prototype.toString must match the
corresponding intrinsic Object or Array constructor. The object form must have
a null parent; the array form must itself be an array with an accepted object
prototype parent. This is stronger than the former ancestry-depth test.

The reviewed object trigger, Object.create(null) carrying toJSON, has no valid
intrinsic constructor/back-pointer pair and is rejected. The reviewed array
trigger, a custom array whose parent is Object.prototype and which carries
toJSON, likewise has no valid own intrinsic constructor/back-pointer pair and
is rejected. In either case the complete own-value equality cannot authorize
continued source-cache reuse after the prototype mutation.

Recognized prototypes remain collector-local. Every use freshly verifies the
retained parent identity and absence of an own toJSON descriptor; arrays also
recheck the accepted object parent. Descriptor inspection does not call an
accessor or inherited serialization hook. Native function inspection does not
invoke the candidate constructor or its own toString/valueOf. Null prototypes
remain accepted, and recognizing a legitimate foreign intrinsic prototype does
not refresh the canonical data authority or skip complete own-data comparison.

The fix retains owned canonical snapshots, original reference/action checks,
complete bounded comparison, and the postvalidation equality requirement
before source-cache assignment. Positive equal data in other ordinary realms
or null-prototype containers remains allowed. Object-key insertion order,
finite numeric equivalence and negative zero retain the prior controls.

## Regression Evidence

Inspected the seven new groups at test_helpers.cjs:2173 and the appended
implementation report's exact RED/GREEN commands and results. Six separately
named tests cover both custom prototype forms at first method lookup, first
returned outcome and later validation. Assertions include:

- Exact invocation/retained-outcome prefixes0/1/6, lookups1/1/6 and completed
  pairs0/0/3, with no serialization-hook execution.
- guard-threw invalidation at collection-guard/poll1 or later-validation/poll2.
- Correct guard-before-invocation or guard-after-outcome first failure at
  method0; later mutation preserves the complete collection and null failure.
- Preservation of the prior returned observation and unattempted remaining
  invocations, plus strict minus refusal and absence of admission.

The positive group exercises six equal-data replacements after source-cache
success: controller-realm object/array, fresh foreign-realm object/array and
null-prototype object/array. Each requires six calls, counts6/6/6/3, a complete
collection and unchanged current terminal context.

The worker records six meaningful RED failures against the initial frozen010
controller before changing source: lookup cases6instead of0 calls, returned-
outcome cases6instead of1, and later cases stale=false instead oftrue. GREEN
then passes all seven new groups, including the six positive forms. This
directly closes the independently reproduced initial review gap.

Worker final verification records14completed010groups and51full Node groups
(10/11/16/14 for007/008/009/010), no failures and successful syntax checks for
both files. Stable work remains one top-level canonicalization per snapshot,
one source validation,63geometry hashes,89samples,20820rectangle reads and
159filepath reads. The89x274ordered event oracle retains digest
`bd9606c23777bcc7bce36c56f688eaea22d3314bf88b55110394d03059fbfea6`.
Ineligible ownership retains70fresh attempts, one source validation,
43geometry hashes,19040rectangle reads,70filepath reads and no calls/envelope.

These runtime results are reviewed implementation evidence, not duplicate
suite execution by this reviewer. No specific unresolved doubt required a
further focused synthetic check. Parent runs fresh final integration separately.

## Independent Byte Verification And Scope

Read the fix brief, scoped initial010-to-fix1 diff and appended implementation
report against the accepted initial source review. Independently reproduced
all supplied hashes using Python3 -B. Reverse-applied the scoped diff in memory
to the current source pair and reproduced both original frozen010 hashes.
No reconstructed or historical code was executed or written to disk.

All16 final current files match the final map; all16 historical009 files match
the base map; the other14 files remain unchanged. Independently regenerated
the full009-to-final unified diff and confirmed exact equality to the supplied
final diff. All initial010 tests remain byte-identical apart from insertion
of the seven new groups before their final summary/assertion.

The controller region from function sample through the end of the entire file
is byte-identical between initial010 and fix1. The fix therefore changes no
host traversal, retained eligibility, ordered-candidate logic, collection
guard point, method lookup, invocation bridge, outcome classification,
source-cache assignment, later/terminal behavior, export or consumer code.
The pre-collector constants/pins/source/canonical prefix also remains outside
the scoped changes. The prior resolved ordered-candidate concern is not
reopened; its existing seven-diagnostic eligibility invariants still apply.

Only this new re-review report was written. No source/private/history edit,
full suite, historical execution, delegation, preparation/archive operation or
Max/Wine/native/display/REA launch occurred. The worker reports all30private
roots/1523entries unchanged with aggregate
`73aa36f56b1aea0557a84dec10d9343810934c5d812397013faa16531bb7208b`;
parent independently owns final inventory preservation. No licensed values
were emitted or stored by this review.

## Frozen Bindings

| Artifact | SHA256 |
| --- | --- |
| Final controller.js | 90e012563d7a91b5346a071766c5f17b94d7efd1ce912b7e0ba1f303a19ac6a3 |
| Final test_helpers.cjs | 4ccd76f00cb8a88a55f571afa911b49dd051a1e9108ee6707531a440536be4a4 |
| Fix1 brief | fc2120829d61a71bd289042e3951f6ccb80fa960a6d6759884a6c430bdb7a803 |
| Appended implementation report | a3c705ea1c8b2a3326e61f97b3de12dfd1bf44bf3c2e10e2eac167cc1d0d2dea |
| Initial source review | 18d7c22350519e7921d8be9b183eb3e48cad03a65c6288bc3d63d670d951c5a9 |
| Scoped fix1 diff | d935edf22751b086403a8d0b8fe348aa648c2a679c465673d441c8aadb13a2b2 |
| Full final source diff | 9d337b17684c39c807691143aaee2dedd3b3915a7199b2d7d3eb0b3ba6f494c4 |
| Final source map JSON | a6790ed0840efe8492ed53eeb2e38ca0454eadbd0e0339294cac76c237b054b2 |
| Canonical final16file map | 625b52d524b49919ac149287ac06274d3e067ffe211fbbdbd9fbed1bdfb8e400 |

This re-review report's hash is supplied separately after writing, avoiding
a recursive self-hash.

Capture009 remains FAILED/incomplete, internal minus progress UNKNOWN and
timeout cause unproven. No actual Max timing or compatibility fix is established.
All six whole-capture flags remain false, saved_order_observed=false and
qualification0/2103 remain. Full78operations/66events/72live+6empty/504states/
141outputs/6closes/90nativecables/297typedreceipts, commands1-150plusbarrier151,
one owner and pristine resets remain required under unchanged timing/capacity
and policy bounds.
