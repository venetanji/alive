- **I2: actual concurrent reader/callback/producer progress** - ADDRESSED. `apps/ultra/tests/alive_session_capacity.cpp:188` and lines 189-193 load `callbacks` around both rendering witnesses and the state call; line 203 credits a read only when both rendering flags are true and the counts match. The sole callback thread clears `rendering` before incrementing `callbacks` at lines 223-226, then sets `rendering` for the next callback. With sequentially consistent atomics and only 2048 callbacks, the reported callback-N/gap/callback-N+1 trace cannot satisfy equal counts. Lines 203-204 retain the producer, completion, and consumed-request gates; lines 248-249 still require overlap across callback and frame endpoints. The guarded focused log records 51,077 same-callback overlaps across callbacks 65-1984. The retained controlled gap probe credits the old predicate but rejects the new one on the same between-callback state read.
- **I1: local launch/Stop target receipt, state, and nonvacuous voice termination** - ADDRESSED (preserved). The fix diff does not change `apps/ultra/tests/alive_session_capacity.cpp:96` through the local-action checks; the focused log again records sixteen applied target-action witnesses with four voices before and zero after each action.

**New Breakage in the Fix Diff**

None. The source diff adds only the generation condition, comment, and output-field name in the verification test; no production source or existing coordination/guard is changed.

**Out-of-Scope Observations**

None.

**Checks Reviewed**

Read the fix-2 brief, prior review, full supplied fix diff, report appendix, current test context, and retained focused and gap-probe outputs. `fix-2-final-verify/probe.log` reports guarded capacity completion, exact root/event refusals, all sixteen target witnesses, 2,048 callbacks, 1,352 accepted and 2,744 refused requests, and 51,077 same-callback overlaps. `fix-2-gap-probe-1/results.json` and both probe logs show the scheduled gap trace credited by the old predicate (expected SIGABRT) and rejected by the new predicate (exit 0). No tests, builds, hashes, or git commands were run for this review.

**Fix Round**

All findings addressed, no new Critical or Important breakage. I2 is closed; previously accepted I1 remains intact.
