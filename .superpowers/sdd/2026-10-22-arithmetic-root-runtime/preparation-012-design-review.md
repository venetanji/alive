# Preparation012 Independent Design Review

## Findings

### P1: Explicitly capture original operands and refusal context before diagnostic reads

References: `max-preparation-012-design.md:48`,
`max-preparation-012-design.md:55`,
`max-preparation-012-design.md:71`,
`max-preparation-012-design.md:82`.

The requirement to reuse both comparison operands does not explicitly require
passing synchronous local references and immutable context into the observation.
The existing collector root and progress poll/stage/phase are mutable closure
state. Spending the new one-shot latch prevents a second observation but does
not stop a diagnostic getter from reentering collector code and changing that
state.

Trigger: root.filepath synchronously reenters observe() for another patcher or
poll. An implementation that subsequently uses closure root for parent reads or
same_as_poll_root comparisons can diagnose the wrong operand. Its eventual
front-root refusal can also acquire the reentrant progress context instead of
the context of the original failed predicate. This would make the new evidence
and existing rejection record disagree with the comparison being diagnosed.

Correction: evaluate the original front operand once, then capture the root RHS
at its original evaluation point and perform the unchanged strict comparison.
Before any added host read, capture both local references, owned snapshot path,
poll index, eligibility stage and original refusal phase/context. Pass those
values into the synchronous observation; never reread mutable collector root,
live config or progress context to describe that failed comparison. Define
reentrant ownership so an inner callback cannot redirect the outer sample or
original rejection. Diagnostic bookkeeping must not replace existing progress
failures or admit a root/capability path. Add a synthetic reentrant getter that
changes those closure fields and verifies the original operands, read order,
identity comparisons and rejection context remain authoritative.

### P1: Define truthful unattempted and pending states for reentrant export

References: `max-preparation-012-design.md:87`,
`max-preparation-012-design.md:100`,
`max-preparation-012-design.md:105`,
`max-preparation-012-design.md:112`,
`max-preparation-012-design.md:128`.

The complete record must exist before reads, and export is allowed whenever
that record exists. A diagnostic getter can therefore reenter export before
the remaining reads have run, or while its own read is in flight. The exact
schema permits only returned/threw/skipped for path/parent slots and only
returned/threw for repeated_front. None truthfully describes those pending or
unattempted operations. A deep copy alone prevents later mutation; it does not
make a fabricated initial status accurate.

Correction: extend the exact schema with explicit unattempted and pending
states for fixed reads, including repeated_front. Initialize not-yet-started
reads as unattempted, mark the current slot pending immediately before its
attempt, and record returned/threw after it settles. Use skipped only when an
evaluated presence/dependency condition actually suppresses that read. Keep
unknown booleans null and count only actual attempts, including in-flight
ones. Specify that reentrant exports are immutable plain snapshots of this
honest partial record, while remaining fixed reads may complete without
changing any earlier snapshot. Tests should export inside each getter and
again after return/throw, checking statuses, counter prefixes, independence,
no host reads during export and the once-only six-read bound.

## Verdicts

Specification verdict: **NEEDS REVISION** for the two findings above.

Design-quality verdict: **NEEDS REVISION** for the same lifecycle/evidence
gaps. No other actionable finding was identified. A scoped amendment and
rereview of these points is sufficient before implementation authority.

Reviewed design SHA256:
`13114a25153433839e6df7b143168b83f75438d2210ceb6f14ae7355fd33fd9c0`.

## Remaining Assessment

The proposed scope otherwise stays bounded: one qualifying eligibility failure,
the original front operand reused, a latch spent before added reads, and at
most six fixed additional reads. Collection/later/terminal guards cannot
trigger another observation. The original strict rejection and all admission,
timing, capacity and qualification gates remain intact.

Primitive-string path comparisons, nullable boolean classifications and
code-owned statuses can answer the bounded path/parent questions without
exporting observed paths, hashes, wrapper/parent handles or private graph and
numeric data. Independent catches must remain generic and must not inspect
exceptions or convert arbitrary values. Path and parent exceptions may affect
only their diagnostic slots, never the original refusal.

The proposed same-path/distinct-wrapper RED is meaningful and appropriately
uses original synthetic data. The exact insertion-read oracle, absent/malformed
front controls, six throw positions, no observation on other refusal paths,
unchanged original work oracles and immutable exports can test the proposal
without another live probe. The two findings add the missing reentrant operand
and partial-export obligations. Matching paths or null parents still cannot
establish native document identity or justify a later equality-policy change.

## Verification And Boundaries

Reviewed the design against the frozen011 collector lifetime and export
interfaces. Read-only hashing reproduced the supplied frozen011 controller and
test hashes and the source-review binding hash. No suite, synthetic execution, historical/native
execution, implementation/private write, source reconstruction, launch,
preparation, archive, commit or delegation was performed. Only this report was
written; no licensed content was emitted or copied.

Capture011's final false ACK remains forensic rather than runner-accepted
evidence; first/last front-root inequalities do not identify the native window
or intermediate failure history. Capture011 remains FAILED, no012 work is
admitted, and parent acceptance of both capture011 reports remains required
before implementation. All34 private roots/2052entries, frozen source16,
original inputs/preferences and qualification0/2103 remain unchanged.

The report hash is supplied after writing in the reviewer return message.
