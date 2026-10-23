# Preparation011 Independent Source Review

## Findings And Verdicts

No actionable correctness, specification, regression or code-quality finding
was identified in the frozen two-file change.

Specification verdict: **PASS** against accepted design
`b65608f50bd6e87600e511a97947f611a7b911e62e69bc8aa9cf1a7791f0f80b`
and scoped design rereview
`0ce650bae98f298fa0c88de3f84a9912a336ac1cc19aa1ae1a37d86571bf4c21`.

Code-quality verdict: **PASS** within the diagnostic-only progress scope.
No correction or broader test expansion is requested by this review.

## Assessment

References are relative to
`experiments/max-reference/arithmetic-roots-runtime-20261022/`.

- `controller.js:435`: Progress is a bounded collector-owned aggregate. Its
  request/source/owner identity uses fixed trusted metadata and an owned string
  working path or explicit null. Malformed snapshot paths cannot become nested
  identity payloads. Initialization failures retain their original fixed phase
  and code-owned reason without inspecting caught exceptions.
- `controller.js:509`: Ownership splits preserve the original strict
  comparisons, operand order and short-circuit reads. Front-root/root-parent
  and duplicate-scope/child-parent/child-container have distinct markers.
  Remaining sample instrumentation assigns owned state around the existing
  property, inventory, rectangle, mapping, child and iterator boundaries. Root
  filepath remains the final host read, followed by the original plain checks.
  Explicit rejection codes and generic guard-threw behavior are preserved.
- `controller.js:600`, `controller.js:680`: Attempts and source-cache success
  flags follow actual existing boundaries. First failure is retained; the last
  failure and its poll/stage/phase track subsequent checked failures, including
  collection, later and terminal guards. Unknown exceptions receive only threw
  plus the active phase; no exception property, type or conversion probe is
  introduced. Original guards, retries and stale transitions remain intact.
- `controller.js:730`, `controller.js:1170`: Progress export uses retained
  owned data and original evidence counts, with explicit zeros before evidence
  creation and collection status/first-failure snapshots when evidence exists.
  Repeated export deep-copies the complete result. No input/host read, full-input
  serialization, I/O or exposed live reference is added. The old optional
  envelope retains its original schema and attempted-latch export condition,
  including absence after an attempted=false first-guard stop. Nonminus ACKs
  gain no progress field.

The original six-slot lookup/invocation/outcome accounting, partial results,
first stopping reason, once-only lifetime, terminal arrays and unconditional
minus refusal remain authoritative. The new progress cannot admit a policy,
attach observers, bind a root/revision or advance the score. Its counters are
instrumentation for a future011 capture; they establish no internal counts or
refusal boundary for009/010.

## Verification Scope

Read the implementation brief/report, complete frozen diff and binding map,
and inspected relevant current interfaces and existing inherited-hook controls.
The report records meaningful terminal-ACK RED before implementation, a second
malformed-path RED, final GREEN and65 passing named groups. Reviewed additions
cover distinct failed/throwing ownership operands and skipped-read prefixes,
hostile uninspected exceptions, initial/input/source/diagnostic boundaries,
0/1/6 prefixes, first-guard stops, stale state, immutable host-free export and
queued/nonminus behavior. Existing assertions remain in the unchanged prefix.
No concrete unresolved concern required an additional synthetic control.

Independent read-only `python3 -B` checks reproduced current16 and historical010
base16 hashes, the exact frozen two-file diff, the unchanged169409-byte test
prefix, unchanged controller bytes outside createMinusDiagnosticCollector/fail
and the unchanged score hash. Historical code was compared only as bytes.

Verified review bindings:

- Diff: `4090c8d12df31faa1a99784f94c8013deba0e8786d3d103a5c65b1e37d66bbc9`.
- Map: `d01113c99037c40e72e4739d80f3e56db3d339588dcd8b98864b7cb1b7b56d36`.
- Canonical16 map: `f49624494c8a540b6e470e88766a48546303f99c142d025ce0fc3ca37b0a9248`.
- Implementation report: `0954bfa8dc4cb0a0e1d05a105c8bbbe37ef1536e0463f4ebefe8a6d052cada20`.

Parent separately reports fresh Node65-group PASS, unchanged stable/ineligible
work and89x274 read digest, Python89run/88pass/1existing external skip, syntax
and real-source/config/projection PASS, and unchanged32private roots/1788entries.
These are parent verification results, not suites rerun by this reviewer.

Only this report was written. No implementation/private edits, historical code
execution, full suites, target/display launches, preparation, archive, commit
or delegation occurred. No licensed data was printed or copied.

## Limits And Frozen Source

Actual Max API compatibility, strict wrapper identity and collector progress
remain unknown until separately prepared capture and audit. Capture010 remains
FAILED with unknown internal progress; no011 capture has occurred. Finite
observations provide no atomic snapshot, getter-silence or capability/admission
claim. Qualification remains0/2103; all timing, score, refusal and denominator
gates remain unchanged.

- controller.js: `d1f2a675a6a28fc146baa5d9661d6eb96537972784829452fa0d0c6ffcb4edaa`.
- test_helpers.cjs: `ddabd1f17a0c464e5b6c56d87edbca3735d9f5043476f6b73e843f1048754779`.

The report hash is supplied after writing in the reviewer return message.
