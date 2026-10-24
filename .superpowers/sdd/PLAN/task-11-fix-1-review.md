**I1. Stopped same-track actions were all reported APPLIED** - ADDRESSED. `apps/ultra/src-tauri/native/alive_session_clips.hpp:818` adds eight callback-local receipt indices independently of quantized pending state. The stopped branch at `apps/ultra/src-tauri/native/alive_session_clips.hpp:921` finishes the preceding stopped selection as SUPERSEDED/REPLACED_REQUEST before recording the replacement. The last selection retains its existing candidate/admission/publication path. The focused regressions at `apps/ultra/tests/alive_session_v3_test.cpp:279` cover launch/launch, launch/stop and stop/launch, with and without intervening SEEK, another track's independent receipt, final selection/phase/transport, exact terminal masks and a full 64-command snapshot.

**M1. Nonloop cleanup always reported ROOT_CLEARS** - ADDRESSED. `apps/ultra/src-tauri/native/alive_session_clips.hpp:985` captures `scheduled_fits(charge)` and forwards that exact failure to `fault_v3`. The regression at `apps/ultra/tests/alive_session_v3_test.cpp:689` uses the existing test-only fault/charge hooks to force PARAMETER_WRITES specifically at end cleanup and verifies the exact resource, stopped/cleared state and single invariant fault. The diff introduces no production fault control.

### New Breakage In The Fix Diff

None identified. No new Critical, Important or Minor finding.

- START/SEEK check: the new index is used only while the candidate is stopped. A stopped cue can therefore remain APPLIED when SEEK reanchors it and START preserves it as the active selection while a later action waits for a future boundary. The new ordering regression explicitly checks that sequence. A running action canceled by SEEK retains CANCELED when a later running action replaces it; the fix does not apply stopped-selection supersession to that action.
- Refusal/preservation check: supersession changes the earlier candidate receipt; it does not commit candidate tracks or alter the existing admission boundary. New tests check that a refused combined batch leaves prior selection/position intact, reports earlier replaced actions as SUPERSEDED and surviving actions/SEEK as REJECTED, and still applies accepted base/mixer commands. A separate test preserves an older pending serial/target and an earlier applied cue when a later SEEK/action batch is refused.
- Isolation/mask check: indices are keyed by track and refer directly to bounded callback candidate receipt entries. The interleaved second-track action retains APPLIED. The shared receipt assertion checks request identity, track mask and every pending/terminal mask; the saturation case checks all 63 replaced receipts and the surviving receipt.
- Bounded-work check: the new state is eight unsigned indices initialized once per callback. Each newly observed stopped action adds one constant-time lookup/update and, after the first action on that track, one existing receipt finalization. The unchanged 64-command snapshot limits this to at most 63 such finalizations, without a search, allocation, DSP reset/chase, additional horizon pass or new unbounded loop. The report's existing fixed reducer allowance argument is consistent with this diff; it does not require rerunning the unchanged timing matrix. Emergency Stop ordering is not modified.

### Out-Of-Scope Observations

None newly identified. The prior review's unrelated Rust warning, timing provenance/64-frame outlier limitations and concurrent publication verification limit remain outside this correction. This scoped re-review does not resolve or reopen them.

### Checks

- Reviewed the supplied frozen diff once for base `79aec9d45b94e51ac76b95c5b3d5a514119b1483` to head `1bc37b91a9a269ddc9b5450d7a8dc803dda141fd`, together with the fix brief, original brief, prior findings, reducer interface contract, preflight and appended implementation report. The tool's aggregate display shortened part of the diff's report/header material; the runtime/test changes were visible and the report was read independently. No Git command or additional source crawl was performed.
- Read retained `/tmp/alive-task11-fix1/stopped-red.log` and `/tmp/alive-task11-fix1/nonloop-red.log`: they show the expected receipt status/error assertion and exact PARAMETER_WRITES resource assertion failures, respectively.
- Read retained focused green logs: `PASS: stopped action supersession, ordering, masks and work refusal` and `PASS: nonloop cleanup preserves the failed work resource`.
- Read retained final v3/v1/v2 logs: v3 reports admission, prime clips, partitions, quantization, receipts, Stop and callback guards passing; v1 reports its exact-frame/ownership/Stop/seek/loop/isolation/mixer guards passing; v2 reports ordered chains, exact bypass/warm state, partitions, ownership, resets, admission, overload and callback guards passing. The report identifies the guarded compile/link commands and records successful exits. These existing logs support the amended paths and compatibility claims; no suite, build, GUI or timing run was repeated for this review.
- Wrote only this requested review report. No source, index, HEAD or branch mutation; no subagent dispatch. Parent-owned retained evidence and cross-task final CI/concurrent-publication validation remain separate gates.

### Verdict

**Fix round: All findings addressed, no new Critical/Important breakage.** Open findings in this scoped correction: none.
