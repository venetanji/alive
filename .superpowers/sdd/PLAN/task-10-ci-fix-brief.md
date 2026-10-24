# Task 10 Native CI Harness Correction

Requirements for a serialized follow-up after the Task 11 code checkpoint.
Do not begin implementation before the controller dispatches this task.

Read `ci-d1f8a66-reorder-diagnosis.md` and
`experiments/alive-piano-m3-20261024/gtk-diagnostic/README.md` first. Those
reports distinguish direct native observations from inference about historical
CI run 40062078651. The product reorder implementation is not implicated.

## Required Scope

- Correct the Alive chain-reorder native input path in
  `apps/ultra/tests/check_alive_desktop.py` or a focused helper it imports.
  Flush pointer motion before button events, wait with a bounded native
  occlusion/ownership predicate for the actual target to be usable, then
  re-resolve its geometry/state and perform one press/release. Resolve the
  expected window from the actual scoped frame, not a hardcoded corner point.
  Timeout retains the blocking window/hit-test and screenshot evidence.
- Prefer an Alive-reorder-specific helper. Preserve shared Ultra pointer
  behavior unless a broader change is necessary and GTK chooser plus optional
  window-manager/client ancestry are independently validated.
- Preserve the original `Select Pulse Stereo Lowpass effect 2` assertion and
  every identity/order check. No repeated clicks, unconditional long sleeps,
  increased test timeout, assertion weakening or product title/tooltip change
  to hide the problem.
- Add a focused actual-native regression that deliberately allows the covering
  tooltip to appear and requires exactly one corrected Earlier click to restore
  the chain. Retain hit-test outcomes and native state evidence. The fixture's
  hover is a diagnostic precondition, not the correction's wait strategy.
- Correct the separate slash location-entry gesture in Alive's native file
  chooser helper: flush press, wait for the new entry to be usable, then
  release. Always release on error. Verify the chooser flow under process-local
  fatal GTK criticals where possible; retain all remaining warning output and
  distinguish debugger post-exit errors from app failures.
- Complete the actual native Alive journey with both corrections and the
  checkpoint's release binary/native library. Record the source/binary/library
  hashes and exact commands/results. No new broad Rust/DSP/UI run is needed for
  a harness-only change; new tests/failures may justify a focused extension.

Do not change app behavior, native DSP, event/admission limits, package tooling,
credentials, persistent environment settings or other branches. Preserve the
Task 11 native changes and parent PLAN/ledger/evidence. Do not dispatch helpers.

Commit only this correction and its focused test/evidence source. Full report:
`.superpowers/sdd/PLAN/task-10-ci-fix-report.md`, with direct red/green evidence,
covering commands/output, changed files, self-review, limitations and any blocker.
Return status, commit, one-line test result and report path in under 15 lines.
An independent scoped review and new exact-head CI qualification follow.
