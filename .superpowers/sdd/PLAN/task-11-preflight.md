# Task 11 Native Design Preflight

Date: 2026-10-24. Scope: the Task 11 brief and proposed interface design only,
with the referenced reconciliation's scheduling/work argument. Frozen native
source was inspected through `git show 7d6410f:<path>` for the named compatibility,
publication, command, reset and Stop risks. Task 10 remains the implementation
worker; this report does not authorize implementation or capacity changes.

## Verdict

No architectural blocker was identified. The proposed fixed v3 ABI, common
runtime with explicit legacy policy, cyclic/segment admission proof, bounded
receipt observation table and independent Stop reserve are mutually compatible.
No additional ABI, DSP owner, request log or capacity increase is needed.

Three implementation interpretations below are necessary to preserve the
design's stated guarantees. They can be settled locally without a product
decision or layout change. The outstanding measured work policy and graph-cost
gate remains mandatory before even the 2-track/6-device profile is admitted;
this preflight supplies no performance approval.

## Required Implementation Interpretations

### 1. Apply the horizon check to effective unscheduled discontinuities

Evidence: `task-11-interface-design.md:471` classifies quantized launches and
natural/global seams as scheduled, and specifically calls out effective START
and manual SEEK as arbitrary discontinuities. Its generic "new control batch"
wording at line 476 must retain that distinction. Line 296 promises APPLIED for
an already-playing no-op START; lines 499-505 prohibit rejection of ordinary
admitted playback.

An overbroad reading of line 476 would produce false rejections. For example,
take a long clip with 32 events at phase zero and another 32-event batch far
outside a 1024-frame neighborhood. With widely separated bar boundaries,
`E_t(512)=32`, `K(512)=1`, and the conservative two-segment envelope can be 64.
The bank can satisfy both 32/frame and 64/window. One frame after its phase-zero
batch, an unnecessary horizon check for a no-op START would combine 32 recent
events with the 64-event arbitrary-phase future envelope and reject it. Merely
queuing a launch for a distant existing bar boundary has the same problem.

Narrow reading: only an effective unscheduled phase/playing/clear change enters
the optional discontinuity/horizon candidate. A quantized-only action uses the
already-admitted scheduled proof and retains queue/identity/receipt checks; an
already-playing START is a successful no-op. When a batch also contains an
effective seek/restart, check the combined candidate once as designed. Scheduled
invariant checks still run before actual dispatch.

This is an implementation constraint implied by the existing classification,
not a request to weaken admission or introduce a new control API.

### 2. Enforce each work sub-budget, not only their sum

Evidence: `task-11-interface-design.md:489` requires preserving scheduled/optional
sub-budget separation, while the displayed horizon inequality and subsequent
allowance description use `scheduled_window + optional_window`. Line 516 then
requires checking scheduled work invariants before dispatch.

Checking the total allowance plus the optional allowance alone does not enforce
the scheduled allowance. Illustratively, with separate ceilings of 10 each,
scheduled history 8 plus scheduled future 4 and optional work 1 passes the total
test (13 <= 20) and optional test (1 <= 10), but exceeds the scheduled ceiling.
These numbers illustrate the inequality only; they are not proposed policy.

Narrow reading: retain separate scheduled and optional projections throughout
the overlap check. For every relevant horizon, also check scheduled history plus
scheduled future against its registered scheduled allowance; check optional
history plus the optional charge against its own allowance. Apply the same
separation at the candidate frame. Do not silently relabel scheduled work as
optional, or include emergency clears in either ledger. This makes the explicit
sub-budget requirement agree with the later invariant guard and avoids accepting
a control that predictably faults ordinary playback afterward.

No ABI change is necessary; the separate limits and ledger families already
exist in the proposal.

### 3. Include accepted live edits in the fixed control-work measurement

Evidence: `task-11-interface-design.md:257` retains enqueue success as the
base/bypass persistence commit point. Lines 364-368 require accepted live edits
to apply even if the discontinuity candidate fails. The scheduled work pulses
at lines 435-440 cover clears/chase and stored automation, not independent live
base calls. Lines 507-514 and 531-534 require measuring fixed callback overhead
alongside the other work categories.

Frozen evidence: `apps/ultra/src-tauri/native/alive_session.hpp:89` validates and
enqueues a base edit, and line 264 applies an unowned parameter on consumption.
It can therefore perform real parameter propagation without any START, SEEK,
launch or scheduled event.

Narrow reading: the measured, unavoidable 64-command callback allowance includes
the parameter propagation and state updates for accepted base/bypass/mixer
commands, including the path where optional admission rejects. At most 64 direct
base applications are needed before any permitted coalescing; clear/chase
applications retain their own charges. Treat that bound as fixed control work
when selecting the policy and running combined worst-case measurements. Do not
make already-accepted base edits depend on optional credits, and do not omit
them because the scheduled event array is empty. If the implementation instead
places them in a work ledger, it must reserve their accepted execution capacity
before committing enqueue success.

The existing max_commands field and fixed-overhead measurement requirement are
sufficient; this does not require another public limit record.

## Checked Design Arguments

### Legacy ABI and behavior

The explicit Legacy/V3Clips mode at `task-11-interface-design.md:350` is needed
and sufficient in principle. Frozen `alive_session.h` has inline two-track and
six-device legacy arrays. Frozen `alive_session.hpp:109` admits positive legacy
lengths below the v3 musical minimum and preserves an independent loop range;
line 75 chases automation through the landing frame, whereas v3 intentionally
uses a strict prefix. These are real differences, so shared storage/helpers
must not route old configurations through v3 length, ordering, chase or work
policy. The design explicitly prevents that change.

Frozen v1 projection at `alive_session.hpp:318` uses the configured instrument
index rather than assuming device index equals track index. Preserve that map
when projecting v3 and perform count checks on the coherent snapshot before
writing either legacy output. The proposed rejection of unrepresentable counts
is compatible with frozen layouts. Structural capacity 8/16/32 does not imply
that every track can simultaneously have both effect slots populated; the
device/root/profile limits remain simultaneous constraints.

### Scheduled density and work envelopes

The cyclic whole-period plus circular-residual maximum is a valid bound for
integer half-open windows with duplicate offsets. Taking a maximum over all
clips on each track, then summing tracks, conservatively covers independent
phase/clip choices. The segment recurrence covers an arbitrary choice on each
positive-length segment, with K derived from the actual global bar/seam table.
Counting unchanged-clip global resets as splices closes the important reset
case identified in `task-10-reconciliation.md:134`.

The stated K(1024) <= 6 is consistent with the minimum 188-frame loop period:
short regions have only their repeated zero boundary; regions long enough to
contain a normal bar can bring a bar and a short final seam close together, but
normal bar spacing is at least 48000 frames. It remains an assertion to check
against the computed boundary table, not a replacement for that computation.

Weighted phase-zero work pulses account for empty loops; the extra K*X term
covers arbitrary splice clears/chase. Same-frame coalescing prevents fictitious
outgoing/incoming double dispatch. The H_t scan charge requires cursor rebuild
and chase to share a bounded scan; directly carrying over both frozen passes
at `alive_session.hpp:75` and `alive_session.hpp:83` would need a larger honest
charge. This is a local implementation obligation, not a reset optimization.

### Rolling protection and receipts

The overlap intervals at `task-11-interface-design.md:480` cover every window
that contains both retained history and a candidate future. At j=1 the first
candidate sample joins the preceding W-1 samples; at j=W the window is entirely
future. Windows beyond that point are covered by prospective admission. Keeping
the ledger on absolute frames while stopped prevents Stop/seek/restart from
renewing spent credits. Subject to the separate-budget interpretation above,
there is no missing class of overlapping window in this argument.

The receipt design has a consistent ownership model: the producer owns only
reservation metadata; the callback owns published results. Reuse requires a
coherent terminal record matching the reservation's serial and preparation.
An unpublished new enqueue cannot be released by the previous occupant's
terminal publication. Pending entries remain reserved, and terminal entries
may be reused without an observer acknowledgment because the API explicitly
promises an observation table rather than a lossless log.

Frozen `alive_session.hpp:308` already uses bounded coherent snapshot attempts.
A failed snapshot must conservatively prevent receipt reuse; it is not evidence
that a slot is terminal. Increasing publication size is an explicit measured
cost in the proposal, not an assumed free extension.

### Guaranteed Stop

Frozen enqueue stamps the Stop epoch before release-publishing the queue head
at `alive_session.hpp:35`. Frozen callback entry acquires that head before the
Stop epoch at line 254. The proposed ordering preserves the established race
contract: a captured fresh post-Stop command cannot be judged against an older
Stop observation. Stale transport/clip commands must still receive terminal
cancellation receipts when drained, rather than merely being skipped forever.

Separate mailbox admission, idempotent already-cleared Stop, and an emergency
reserve outside rolling optional credits keep termination independent of queue,
receipt and control-budget exhaustion. Two full-session cleanup allowances are
a sufficient structural bound for entry Stop followed by one latched fault after
a fresh restart, provided fault latching prevents further rearm in that callback.
Scheduled end cleanup retains its scheduled allowance. The design states all
of these conditions; their execution and measurement remain acceptance tests.

## Optional Documentation Improvements

- Put the three implementation interpretations next to the relevant design
  paragraphs so the implementer does not have to infer the scope of "control
  batch" or the separate-budget inequalities.
- State explicitly that failure to obtain a coherent receipt snapshot leaves
  the producer reservation busy, and that a Stop acknowledgment can precede
  publication of cancellation for an old-epoch command outside the acquired
  head snapshot; that command is already unable to execute and is reported when
  drained. This clarifies observation latency without changing Stop semantics.
- State that headers on nested returned receipt records are populated by native;
  the caller initializes the outer requested output header. This avoids an
  unnecessary requirement to initialize 128 nested records before state reads.

## Evidence Limits

This is a static design preflight, not an implementation review or a re-review
of Tasks 7-10. No source, existing PLAN document, Git state, audio capacity or
runtime state was changed. No GUI, build, test suite, timing probe or daemon was
run. Only this requested report was written. The design's prior C++ layout
arithmetic claim was not independently rerun. The planned C/Rust layout checks,
small brute-force envelope oracle, exact-sample/race tests, callback guards and
actual-kernel policy measurements remain required implementation evidence.
