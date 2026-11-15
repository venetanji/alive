## Task 5: Attribute Native Apply Failure And Make Arrangement CI Real

**Modify:** `apps/ultra/tests/check_canvas_desktop.sh`,
`check_alive_desktop.py`, `check_alive_arrangement.py`,
`alive_workspace_navigation.py`, desktop helper unit tests and
`.github/workflows/ultra-ci.yml`; production ownership code only if demonstrated.

**Proposed harness interface:** `ULTRA_TEST_SCREEN_SIZE=1600x1000` overrides
the existing `1280x840` default with validated decimal dimensions (minimum
`1280x840`, maximum `3840x2160`); reject malformed values before creating Xvfb.
Always export the absolute `ULTRA_TEST_ALIVE_BINARY` actually launched and use
that same path/library on restart. Keep caller desktop/session isolation.

- [ ] Add tests for size parsing/default/refusal and exact restart identity.
  Run them red before changing the wrapper. Declare ffmpeg in the native CI
  dependencies if recording remains mandatory; record tool versions.
- [ ] Instrument original Apply assertion: button rect/visible region, input
  target/receipt, IPC start/end, install revisions, stale editor close and actual
  window enumeration. Identify the first missing transition. Add a regression
  for that cause and fix it without reducing editor-lifetime assertions.
- [ ] Run the unchanged complete journey until it passes, then run Arrangement
  through the checked-in screen-size option, capturing both target viewports.
  Preserve Stop, pending history, scoped controls, Save/Quit/restart and editor
  invariants. Do not infer a pass from absent/shortened steps.
- [ ] Wire Arrangement into CI with independent result/artifact collection even
  when another journey fails; required failures still fail the workflow. Retain
  output at failure. Review process cleanup and commands; commit.

Proposed command after this task implements the new option:

```sh
ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCREEN_SIZE=1600x1000 \
ULTRA_TEST_ALIVE_BINARY="$PWD/apps/ultra/src-tauri/target/release/alive" \
ULTRA_TEST_ALIVE_SESSION="$PWD/apps/alive/examples/midi-arrangement.alive" \
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_arrangement.py" \
bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-phase2-arrangement
```

**P2.0 gate:** all state regressions green, original native assertion attributed
and passing, Arrangement reproducible from checked-in commands/CI. A UI feature
may be explored in parallel, but cannot be declared qualified before this gate.


## Actual controller lease

Packet R-D; task 5; accepted source base 70c356d54e846abb29e21be9e38dfefa14529c75.
Workspace: /home/venetanji/.codex/worktrees/2f1a/alive. Always use this absolute workdir; all edits absolute under it.
Exclusive allowed files: apps/ultra/tests/check_canvas_desktop.sh, check_alive_desktop.py, check_alive_arrangement.py, alive_workspace_navigation.py, focused desktop helper unit tests, .github/workflows/ultra-ci.yml; new narrow tests/helpers within apps/ultra/tests when necessary. Production app changes are excluded unless root leases proven fault. Report any required expansion before mutation.
Resources: Baseline matching binaries/library copied privately into this workspace release folder; use these for initial diagnostics and exact explicit restart binary. Native private sessions/output are owned by you; no root builds or code mutations. Parent will later rerun on integrated candidate. If native failure needs IPC instrumentation in production, request exact file lease before edits.
Read Phase 2 spec and development review for context; only your extracted task is the requirements. Task 1 accepted: original unchanged Alive journey fails at line 754, Apply must close old editor generation. Definitive input receipt unknown. Root evidence /home/venetanji/.codex/worktrees/edd5/alive/experiments/phase2-20261028/baseline/native-result.json. Read that folder read-only if useful.
Use systematic-debugging and test-driven-development skills: reproduce, corrected red regression first, minimal cause fix, green. Keep original regression assertions. Use Context7 for actual library/platform API questions, not repository logic.
No merges, pushes, tags/releases/deployments, credential/persistent environment changes, installs or subagents. Do not change worktree topology. You may commit only explicitly leased source/test files in this detached worker; no broad staging. Never touch root/another worker or protected refs. Preserve valid behavior and current runtime capacity.
Full report: /home/venetanji/.codex/worktrees/2f1a/alive/.superpowers/sdd/2026-10-28-phase2-live-max/task-5-report.md. Record base/candidate/diff hash, complete changed files incl new ones, exact red/green commands/results/logs, original assertions retained, known limitations and self-review. Evidence under this workspace experiments/phase2-20261028/r-d/ or SDD scratch; do not commit bulky artifacts. Return DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT, commit IDs, one-line tests, report path. No self approval. Controller supplies fresh spec then quality reviews.
