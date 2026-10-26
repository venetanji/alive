# Native Desktop Journey Timing Requirements

Read this first. This is a narrow verification-infrastructure task between
reviewed native workspace slices; it does not implement or activate v4.
Source base will be pinned at dispatch after Task2B approval. Parent owns
PLAN/docs/PR/evidence curation; you are the sole source/test/index writer.
No subagents, release operations, settings or credentials. Use TDD and
systematic debugging. Preserve every existing assertion and journey action.

Read `ci-timeout-diagnosis.md` beside this brief for observed evidence and
explicit unknowns. CI40264211910/f0fb9e5 and40267085010/9bf3180 exceed a300s
desktop step deadline. Both reach save/reopen/dependency refusal. Their
checkpoint spans and capture durations are2.1-2.2x a passing local run.
No CI stack proves the active call at timeout. The longer deadline alone is
not a diagnosed fix, and this task must not call these runs flaky.

## Scope

- `apps/ultra/tests/check_alive_desktop.py` and a small optional helper beside
  it for pure timing/reporting, with focused helper tests.
- `.github/workflows/ultra-ci.yml`, only this journey's deadline (5 to8minutes)
  and registration of the focused helper tests where appropriate.
- Existing shared desktop helpers only for a concrete necessary hook; prefer
  local transparent wrapping. No UI/runtime/Rust/native changes or rebuilding
  the release app. Existing release assets stay pinned.

## Required observations

1. Flush UTC and monotonic phase checkpoints to stdout and a bounded retained
   artifact: journey entry, existing operations, capture-finalize entry/exit,
   final diagnostics entry/exit, report write, final Quit/exit and failure.
   Preserve early smoke/wrapper entry semantics. A failure/atexit observation
   never writes a success or complete-journey claim.
2. Transparently measure wait_for, scoped_find and top-level accessibility
   traversal count/elapsed/max cost. Keep the active operation/control visible
   while it is pending, not just after it returns. Do not count inclusive
   nested spans as disjoint time or label them CPU consumption. Handle the
   recursive lazy walk generator and early-close/exception paths correctly.
3. Provide bounded periodic Python stack snapshots and timing observations
   within30seconds of a pending slow call, before CI's deadline can terminate
   it. Limit memory/output/file sizes and helper lifetime. Cancel/close the
   observer on normal return and exceptions; do not leave a worker/process
   alive. Preserve signal/error semantics and recorder/process cleanup.
4. Keep the original native tests/actions/assertions, scheduled waits and
   recorder limits unchanged. No retry-on-failure, skipping history/Quit,
   narrowed journey or new application test hook. The diagnostic8min deadline
   is provisional; actual runner evidence will determine the permanent bound.

## Tests and evidence

- Meaningful pure helper tests for active pending-call diagnostics, returned
  values/exceptions unchanged, nested/inclusive query accounting, recursive
  lazy traversal and early exit, bounded retention, observer shutdown and
  failure never reporting success. No GI/native dependency in helper tests.
- One full unchanged-assertions actual native journey with the pinned separate
  Alive and software PipeWire through check_canvas_desktop.sh; retain final
  phase/query/stack artifacts, original final report/capture metadata and
  exact command exits. This validates transparency locally, not CI success.
- No unrelated full suites merely for reporting. Python syntax and affected
  CI registration checks as appropriate. Record app/native/harness hashes.

Retain red/green commands/logs under `/tmp/alive-workspaces-ci-timing`.
Write `.superpowers/sdd/alive-workspaces-20261026/ci-timing-report.md`, commit
targeted changes, explicitly freeze source/index and return status/commit/
test result/report path. Independent task review precedes checkpoint push.
