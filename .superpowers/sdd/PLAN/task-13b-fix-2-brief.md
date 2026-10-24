# Task 13b fix round 2: bind overlap to one callback

Read task-13b-fix-1-brief.md, your task-13b-report.md and
task-13b-fix-1-review.md. Previous reviewed head is
223dd34b48869d3c548e7add2e39c8da959a154d. I1 is ADDRESSED; preserve it.
Parent accepts this remaining I2 witness gap.

## Open finding, verbatim

- **I2: actual concurrent reader/callback/producer progress** - NOT ADDRESSED. `apps/ultra/tests/alive_session_capacity.cpp:189` and line 192 sample a Boolean `rendering` around the state read, but line 202 accepts two `true` values without requiring the same callback on both sides. Exact false-pass order: the reader sees `true` in callback N and is descheduled; N exits, clears the flag, and increments `callbacks`; the reader performs the entire state read in the gap; callback N+1 sets the flag; the reader sees `true` again. Lines 222-225 permit this true/false/true sequence. The callback/frame endpoint assertions at lines 247-248 allow such reads, so observations taken solely in gaps between renders can still be counted as overlaps. `producer_active` can also remain true while the producer waits at line 238. The 54,295 reported overlaps and late-reader mutation show the observed run and exclude reads only after completion; neither closes this between-callback false pass. The smallest missing witness property is that each counted read have unchanged `callbacks` before and after the state call, in addition to both `rendering` reads being true; then callback generations cannot be crossed.

## Scope and evidence

Close the between-callback Boolean ABA false pass by ensuring every credited
read is enclosed by the same callback generation and active-render witnesses.
Preserve bounded startup/progress coordination outside actual rendering, the
single producer, roots through joins, all original isolation/action checks,
end emergency Stop and all bounds. No production or fixture change.

Run the focused guarded capacity verification on the exact amended source;
retain complete output/source/build hashes and actual same-generation overlap
witnesses. A bounded diagnostic/mutation proof of the specific between-render
false pass is useful, but do not repeat unchanged full Rust/contracts/GUI or
production timing suites. Keep all previous successes/failures and mutations
immutable, and preserve a04f259 timing/runtime attribution. Explicitly assess
that this verification-only change does not alter production or timed functions;
probe executable layout remains distinct.

Append commands/results/paths/impact/self-review to task-13b-report.md. Commit
only capacity verification and report files, freeze and return status/commit/test
summary/concerns. Parent owns PLAN, ledger, PR, retained experiments and scoped
review. No subagents, settings/credentials changes, branch/release operations,
cloud sessions or broad unrelated work.
