# Task 1 Fix Round 1 Independent Review

## Spec Compliance

**Verdict: Spec compliant for this fix round. I1 ADDRESSED.** Reviewed the exact three-file diff from `238c427708a0de9790a4c8e5d95aa06045b1cac5` to `97533b805c9831766a244163076e16a297f32c5d`, against the fix brief and prior I1. No new behavior or unrelated source changes are introduced.

## Per-Finding Verdict

**I1: ADDRESSED.** The fix covers both previously unsafe detail hide paths and the subsequent polling/commit lifecycle:

- `apps/ultra/ui/alive-workspace.mjs:7` identifies the currently selected detail subtree. `apps/ultra/ui/alive-workspace.mjs:33` parks its focused field before switching to a different tab; `apps/ultra/ui/alive-workspace.mjs:35` parks it before collapsing the outer Detail. Both reuse the existing change suppression and deferred commit behavior at `apps/ultra/ui/alive-workspace.mjs:9`.
- `apps/ultra/ui/alive-workspace.mjs:25` restores only the selected inner subtree while the outer panel is expanded. Reopening an unrelated tab therefore does not focus or mark a hidden field visible; collapse/tab combinations retain the pending value until its own detail is shown.
- `apps/ultra/ui/alive.mjs:377` prevents ordinary device parameter polling from replacing parked numeric/range values. The existing focus guard still applies normally, and no command signature or target-selection logic changes.
- `apps/ultra/tests/ci/alive-chain.spec.mjs:143` adds real-browser regressions for both Cutoff base and Note 1 pitch. The checks at `apps/ultra/tests/ci/alive-chain.spec.mjs:150` wait for three polling calls per step, assert the exact pending string and zero non-poll IPC, and exercise three rounds of inner tab/outer collapse combinations. `apps/ultra/tests/ci/alive-chain.spec.mjs:167` verifies exactly one deliberate Tab commit, correct parameter or track/clip/note scope, unchanged other-track notes, and no later duplicate mutation. Existing assertions remain intact.

## Strengths

- The production correction is limited to a selected-detail-root helper, two park calls, one visibility-aware restore and polling guards. It extends the established presentation safeguard without creating a second editing system.
- The new regressions test actual browser focus/change events and polling, directly addressing why the prior DOM mock missed I1.
- Reported native evidence distinguishes browser IPC counts from actual WebKit state/history/persistence checks. Failed harness observations are retained and explained rather than presented as passing evidence.

## New Breakage

**Critical:** None found.

**Important:** None found.

**Minor:** None found.

The fix does not change native commands, selection IDs, history/editor ownership, keyboard handling, resize logic or layout. Inspection of the changed paths found no new lifecycle breakage. The existing native walkthrough still reports gain preservation, scene application, active playback, hosted editor opening, zero stream errors/rejections and successful Quit.

## Evidence And Limits

Read the supplied diff once; did not reopen unchanged source, run git, dispatch agents or rerun tests. Existing evidence inspected:

- `/tmp/alive-workspaces-task1-fix1/full-ui.log`: 500 tests, 500 pass, zero failures/skips.
- `/tmp/alive-workspaces-task1-fix1/browser-full.log`: 13 browser tests pass.
- `/tmp/alive-workspaces-task1-fix1/native-final/native-report.json`: three WebKit navigation rounds for each pending device/note field preserve the typed value while native Modified remains false and undo disabled; deliberate Tab then commits. Final native report also records 3.136 seconds of software PCM, advancing audio, zero rejected commands/stream errors and successful Quit.

No focused rerun was warranted: the diff's potential failure paths are exercised by the existing real-browser regressions and the retained actual WebKit check. Source review and the tests establish exact mutation counts in Chromium; the native report establishes state/history outcomes rather than logging every IPC. The parent independently checked the final manifest and finite PCM. Build provenance, complete native harness assertions and retained red-run chronology are external evidence, not facts derivable from this source diff alone.

## Out-Of-Scope Observations

None newly identified. The implementer reports that an explicit Save rebuilds controls and can discard a still-uncommitted hidden field; that observation concerns an unchanged file-action/editor lifecycle outside this navigation-only fix. It does not reopen I1 or block this scoped approval. Arrangement/audio implementation, physical audio and broader final qualification remain separate tasks.

## Assessment

**Task Quality: Approved.** I1 is resolved by a focused change with direct regressions for mutation absence, pending value preservation through polling and exactly one later intentional commit. No new breakage was found within the fix diff.

Only this review report was written; source, index, HEAD and concurrent parent documents were untouched.
