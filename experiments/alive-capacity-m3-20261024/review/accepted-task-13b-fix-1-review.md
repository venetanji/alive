- **I1: local launch/Stop target receipt, state, and nonvacuous voice termination** - ADDRESSED. `apps/ultra/tests/alive_session_capacity.cpp:96` requires four target voices before each action; lines 109-124 match the issued serial to an applied receipt, exact target frame/mask, clip/phase, and zero voices after the boundary; lines 131-136 retain the terminal state check. Lines 140-145 retain all eight other-track audio comparisons. The focused log records sixteen `TARGET` witnesses and the discarded-action mutation aborts at line 134.
- **I2: actual concurrent reader/callback/producer progress** - NOT ADDRESSED. `apps/ultra/tests/alive_session_capacity.cpp:189` and line 192 sample a Boolean `rendering` around the state read, but line 202 accepts two `true` values without requiring the same callback on both sides. Exact false-pass order: the reader sees `true` in callback N and is descheduled; N exits, clears the flag, and increments `callbacks`; the reader performs the entire state read in the gap; callback N+1 sets the flag; the reader sees `true` again. Lines 222-225 permit this true/false/true sequence. The callback/frame endpoint assertions at lines 247-248 allow such reads, so observations taken solely in gaps between renders can still be counted as overlaps. `producer_active` can also remain true while the producer waits at line 238. The 54,295 reported overlaps and late-reader mutation show the observed run and exclude reads only after completion; neither closes this between-callback false pass. The smallest missing witness property is that each counted read have unchanged `callbacks` before and after the state call, in addition to both `rendering` reads being true; then callback generations cannot be crossed.

**New Breakage in the Fix Diff**

None separate from the I2 verification gap above. No new production source changed.

**Out-of-Scope Observations**

None.

**Checks Reviewed**

Read the fix brief, full review diff and report appendix; inspected `apps/ultra/tests/alive_session_capacity.cpp` and its existing fixture. `fix-1-final-verify/probe.log` reports a passing guarded capacity probe, sixteen target witnesses, 2,048 callbacks, 1,488 accepted/2,608 refused requests, and the overlap counts quoted above. Both focused negative-probe logs show their intended SIGABRT. No tests were rerun.

**Fix Round**

Findings remain open: I2. I1 is addressed; no separate new Critical, Important, or Minor breakage was found.
