# Preparation010 Fix Round1

Read preparation-010-source-review.md first, SHA256
18d7c22350519e7921d8be9b183eb3e48cad03a65c6288bc3d63d670d951c5a9.
Parent reads/hashes/accepts the sole P1 prototype finding. The original010
implementation brief/design and all ownership/bounds/evidence constraints
remain binding. No design or policy change is required.

Own only controller.js/test_helpers.cjs in the arithmetic runtime stage and
append a fix report to preparation-010-implementation-report.md. Parent has
preserved its initial bytes separately as implementation-report-initial.md.
Do not edit the initial report snapshot, review/design/map/diff, ledger or
other files. No delegation/commit/revert/preparation/archive/launch/full Python
or native suite/private writes. Use python3 -B for evidence work. Parent owns
re-review, integration and later gates. Freeze source on return.

Fix baseline controller023ed6b2b0f0b614b4c432f0928c9985b1668a21283c8a30a7311fe953166006;
test_helpers084947cd9f3429ee3a07ea6d0dde088c9c7dcbbb0f0998be67c585c7a46d23c3.

Reproduce meaningful RED before changing source for both reviewed forms:

- An original config.synthetic={value:0} gets a prototype Object.create(null)
  carrying an own toJSON function after snapshot/cache success.
- An original config.synthetic=[0] gets a custom array prototype constructed
  by Object.setPrototypeOf([], Object.prototype), carrying the same hook.

At first lookup, first returned outcome and later validation, assert exact
0/1/6 invocation prefixes, guard-threw invalidation and correct stage, truthful
retained preceding outcomes/counts/first failure, no hook execution and strict
minus refusal. Current code incorrectly completes all6 and stale=false.

Establish allowed ordinary object/array prototypes explicitly, including the
legitimate cross-realm plain values used by existing tests; reject custom
prototypes and introduced inherited hooks without invoking them or refreshing
authority. Prototype depth alone is insufficient. Preserve bounded complete
own-data comparison, null-prototype/plain positive cases as appropriate,
object-key order/numeric/negative-zero controls and all original assertions.
Keep prototype handling within the collector; do not change source predicate,
constants/pins/canonical primitive or host read/collection code needlessly.

The ordered-candidate concern is resolved by existing seven-diagnostic initial
eligibility invariants (see review). No change is requested there. No other
actionable finding exists in the reviewed source. Do not broaden the task.

Run focused RED/GREEN, both syntax checks and one full Node run after final
edits. Preserve stable1canonical each/1source/63geometry/89samples/20820rectangle/
159filepath reads and the89x274 ordered trace digest. Preserve ineligible
70fresh attempts/1source/43geometry/19040rectangle/70filepath/0calls/no envelope.
All30private roots/1523entries and other14mapped files must remain unchanged.

Append exact RED/GREEN commands/results, new test coverage, final pair hashes,
preservation and self-review to your report. Return concise status/report hash/
pair hashes. No user permission gate; raise concrete conflicts to parent.
Capture009 remains FAILED, internal minus progress UNKNOWN, timeout cause
unproven and qualification0/2103. No actual Max fix is claimed.
