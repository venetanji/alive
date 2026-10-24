# Task 11 Fix Round 1: Stopped Action Supersession

Serialized native correction. Begin only after the controller confirms the
Task 10 harness implementer's source checkpoint. Preserve every unrelated local
change and do not stage parent documentation/evidence or harness changes.

Read `task-11-review.md` and the original Task 11 brief/interface/preflight.
The independent review reproduced this against an immutable copy of native
library SHA256 `8d1768cedb1f5b2208f8708deb8fccb663c727dcc4ecbdf183a257cbe9755f00`:
while musical transport is stopped, enqueue launch slot 1 then launch slot 0
for track 0 before a single callback. Both queue successfully and final active
clip is slot 0, but both receipts report APPLIED. The bounded reducer contract
requires the earlier same-track action to be SUPERSEDED and the survivor APPLIED.
The old path only finds an earlier action through `pending_action`, which a
stopped cue never sets. Preserve the callback's last-surviving-action semantics.

Also address the local diagnostic finding M1 from the same review: nonloop-end
cleanup discards the failed resource from `scheduled_fits(charge)` and always
reports ROOT_CLEARS. Preserve and forward the actual failed resource, matching
the other invariant paths. Cover a non-root resource failure through the existing
test-only fault seam if practical; do not add production fault controls.

Fix the reducer with bounded, allocation-free storage and explicit receipt
semantics. Do not add a second runtime, clock, queue, ABI or publication. Preserve
legacy v1/v2 behavior, scheduled/optional work accounting, accepted live controls,
old-pending preservation on work refusal and emergency Stop ordering. Consider
interleaved START/SEEK and track actions so a correction cannot supersede an
action that was genuinely preserved or invalidate another track's receipt.

Add meaningful focused native red/green regressions for same-callback stopped
launch/launch, launch/stop and stop/launch. Check terminal masks, final clip,
phase/playing, per-track isolation and any relevant START/SEEK ordering. Cover
work-refused survivor behavior and old pending preservation where the changed
logic interacts. Keep tests bounded. Run the changed v3 runtime/callback guards
and existing v1/v2 compatibility tests. Do not repeat the unchanged 1200-sample
timing matrix, full contracts, broad Rust/UI suites or GUI journey unless a new
failure or expanded change justifies it. Record why the existing conservative
work bound still covers any added fixed reducer work; measure only if it does not.

If rebuilding a shared native library, use the existing atomic-install build
path; never overwrite an inode mapped by another process. No services, settings,
release branches, credentials, pushes, tags or publishing. No subagents.

Append the fix report and exact command/results to `task-11-report.md`, commit
only this correction and its tests, and return status/commit/one-line results.
Independent scoped re-review follows. Parent owns retained public evidence and
PLAN/ledger/PR updates.
