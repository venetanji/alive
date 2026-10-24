# Task 12 Fix Round 1 Scoped Review

Reviewed base: `ecfed29fcaa4306568fe5041a962187da7296bfb`.
Reviewed head: `813ba7645491346a7b87e419033f3d3e8825ddb4`.
Frozen package: `task-12-fix-1-review.diff`, containing UI correction
`93879f5` and separate diagnostic commit `813ba76`.

## Finding Verdicts

- **T12-R1: ADDRESSED.** `apps/ultra/ui/alive.mjs:75` retains the
  Start/Seek result, displays its serial/status and rejection reason, and avoids
  announcing playing from a queued request. `apps/ultra/ui/alive.mjs:118`
  prefers the accepted runtime observation matching both preparation revision
  and request serial, so an immediate QUEUED value cannot overwrite a matching
  APPLIED publication. `apps/ultra/ui/alive.mjs:119` observes changed trackless
  receipts during rendering and exposes later terminal statuses through Session
  status. The receipt text does not infer playing from application; existing
  playing/cued presentation still reads authoritative snapshot state. The Stop
  command and native scheduling path are unchanged; its no-receipt message now
  says stop requested. The four added transport cases in
  `apps/ultra/ui/alive-dom.test.mjs:57` cover immediate Start/Seek rejection,
  queued-to-asynchronous rejection without retry, and matching APPLIED taking
  precedence over immediate QUEUED.
- **T12-R2: ADDRESSED.** `apps/ultra/ui/alive.mjs:113` centralizes receipt
  formatting for immediate actions and polled track/transport observations.
  `apps/ultra/ui/alive.mjs:141` retains the track's authoritative active and
  pending text around the formatted receipt. The known requested prepared clip
  is named in its track output, WORK_LIMIT has the human reason "optional work
  limit", and the text explains retained prior playback/pending action and
  explicit retry after audio advances. No contributor count or automatic retry
  was added. The new regression in `apps/ultra/ui/alive-dom.test.mjs:43`
  asserts the requested Second clip, existing Playing Clip 1 and pending frame,
  recovery guidance, and absence of a launch retry. The formatter/rendering
  change does not modify selection or active/pending model state.

## New Breakage And Diagnostic Review

No new blocking or nonblocking code finding was identified in this scoped diff.

The separate change at `apps/ultra/scripts/release.py:359` satisfies the
diagnostic brief exactly: one `'-v'` argument precedes `'build'` in the existing
Tauri invocation and remains before the runner's `--` separator. All existing
release build flags, target/bundles/config arguments, locked runner argument,
environment object, signing behavior, package verification and downstream gates
are preserved. The diff contains no environment/setting/toolchain change or
functional packaging workaround. It enables the previously investigated Debug
child diagnostics and does not establish a cause or fix for the Intel DMG
failure. No argument-literal-only test was added.

## Evidence Inspected

The code and test assertions were inspected independently of the implementation
report. Retained outputs corroborate the following results; this reviewer did
not rerun suites, builds, GUI, or native journeys.

| Retained evidence | Observed result |
| --- | --- |
| `/tmp/alive-task12-async-notice-red.log` | The new clip regression fails on numeric-only `request 9 rejected reason 12`. |
| `/tmp/alive-task12-transport-notice-red.log` | Four new transport cases fail on the prior unconditional success messages. |
| `/tmp/alive-task12-transport-notice-green.log` | 45 DOM tests pass; zero failed/skipped. |
| `/tmp/alive-task12-ui-receipts-final.log` | 491 UI tests pass; zero failed/skipped. |
| `/tmp/alive-task12-browser-receipts-final.log` | Five Chromium checks pass. |
| `/tmp/alive-task12-release-diagnostic-tests.log` | 17 release-wrapper tests pass, `OK`. |
| `/tmp/alive-task12-release-diagnostic-syntax.log` | Empty success log, consistent with the reported syntax-validation exit 0; exit status itself is report-attributed. |

The original independent review and the two fix briefs were read first, followed
by the frozen diff, report follow-up, final CLI-only diagnostic addendum and
focused retained outputs. One cut-context read completed the diff tail after
combined tool output truncation. No git commands, changed-source rereads,
runtime experiments, subagents, or source/index/HEAD/branch mutations were used.
Only this review report was written.

## Out-Of-Scope Observations

None added. The original review of unchanged storage, engine, scheduling,
ownership, compatibility and capacity paths is not reopened by this review.

## Overall Assessment And Remaining Acceptance

**Spec compliance: PASS for the scoped fix. Code quality: PASS for the scoped
fix.** Both Important findings are addressed with focused regressions, shared
presentation logic and no native/schema/capacity expansion. The verbosity-only
commit meets its separate brief.

Final task acceptance remains **CannotVerify in this report** for the exact-head
rebuilt Alive/native clip confirmation and final CI/package evidence. The report
now records the `813ba76` rebuild and hashes, but the parent owns independent
build association and the running `/tmp/alive-task12-native-receipts-final`
journey. Earlier `ecfed29` full native/Rust/editor evidence stays attributed to
that source. This scoped source verdict does not close those parent-owned gates
or claim local macOS package success.
