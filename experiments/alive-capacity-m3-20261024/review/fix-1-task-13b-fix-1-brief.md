# Task 13b fix round 1: prove local actions and concurrency

Read the original task-13b-brief.md, your existing task-13b-report.md and
independent task-13b-review.md. Source reviewed: a04f259c753a7b644aa806830b1f96e24c1c5d2d.
Finish current same-binary controls on the frozen checkpoint first, then address
both Important findings below in one focused source/test checkpoint. The parent
accepts the two findings as validation gaps; no production defect is inferred.
Parent owns PLAN/ledger/PR/retained experiments and stays off your index.

## Open findings, verbatim


- I1 - `apps/ultra/tests/alive_session_capacity.cpp:96`: local launch/Stop requests have no target-state or terminal-receipt assertions. `partitioned()` solos a different track at line 90, submits the action, then only checks the other track's audio and absence of a fault at line 103. `deterministic_local()` compares those samples for all eight targets at line 109. A local request that is ignored, remains pending, or is asynchronously rejected produces the same passing comparison; leaving the target's voices alive also passes because that target is inaudible. This proves isolation but does not satisfy the explicitly required larger-profile local transport/note-termination proof. Retain the isolation comparison, and assert the requested serial's applied receipt, expected target active clip/phase, and target voice termination after its scheduled boundary for every track. Establish nonzero target voices before the action so the termination assertion cannot be vacuous. This is a required validation gap, not a demonstrated renderer bug.

- I2 - `apps/ultra/tests/alive_session_capacity.cpp:122`: the concurrent publication regression can pass with only sequential reader polling. The reader's `do` loop executes once even if `done` is already true; a reader first scheduled after the callback thread sets `done` at line 145 can take one final coherent/receipt snapshot and satisfy both nonzero snapshot assertions at line 164. `overlapping_callbacks` at line 160 is only the cumulative callback count when the producer finishes, so it does not prove reader overlap. Conversely, the callback can finish before enough producer work is scheduled, producing a scheduling-dependent failure. The retained run's 61,159 snapshots supports that particular execution, but the regression does not enforce the explicit concurrency requirement. Add bounded test-only startup/progress coordination and record successful reader observations while callback work is still in progress, with callback advancement during the reader/producer observation interval. Require those witnesses before passing; keep coordination outside the actual render call and preserve the single producer and current root lifetimes. This closes the specific false-pass path without adding callback synchronization to production.

## Fix and verification contract

Retain the existing other-track audio isolation/partition checks and the real
single-producer/callback/reader test with roots kept live through all joins.
Add the missing behavioral assertions and bounded test-only progress/startup
coordination. No production callback synchronization, unbounded waits, raised
limits, event retiming, weakened assertions or additional features. Prove that
the stronger checks reject relevant false-pass cases (for example, discarded
actions or observations only after completion) with bounded diagnostic/mutation
probes where useful; retain red/green logs without treating correct production
behavior as a discovered failure.

Covering files are apps/ultra/tests/alive_session_capacity.cpp and its existing
capacity fixture/runner only if needed. Run the focused actual native capacity
verification with allocation/free/lock guards and retained all-eight partitions,
termination, event/root refusals and concurrent publication checks. Report the
commands, complete output paths and actual overlap/target witnesses. Do not
repeat unchanged full Rust/contracts/GUI suites merely for test-only changes.
If any production source must change, explain the concrete reason and rerun its
covering gates with a fresh source/build/measurement impact assessment.

Keep all a04f259 timing/native runtime results historically attributed. Document
exactly whether amended source changes runtime, fixtures, measured code/layout
or only verification. Keep same-source enabled/disabled and final native timing
provenance explicit; qualify the final code where an unresolved impact requires
it. Do not silently relabel prior production artifacts as newly rebuilt.

Append completed measurement qualification and this fix report to the existing
task-13b-report.md, including source hashes, raw paths, command/output evidence,
self-review and outstanding limitations. Commit your source/test/report files
only; parent paths stay untouched. Freeze and return status, commits, test
summary and concerns. Parent dispatches a scoped re-review of I1/I2 and new fix
breakage only; no subagents or self-dispatched reviewer. Existing Minor warning
attribution remains deferred to final whole-branch triage. The final CI/packages
and expanded endurance remain parent/Task15 gates, not part of this test fix.
