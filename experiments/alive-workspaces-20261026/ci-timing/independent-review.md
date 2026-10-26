### Spec Compliance

- Issues found: the final capture and diagnostics phase checkpoints can be suppressed on stdout after the ordinary progress budget is consumed (`apps/ultra/tests/desktop_timing.py:65`). Their artifact records survive, but the brief requires both flushed stdout and retained artifact observations. See Important finding I1.
- The remaining scoped requirements are implemented: direct-execution-only wrapping, separate capture/final-diagnostics phases, final Quit checkpoints, and a completion claim after the original final assertions (`apps/ultra/tests/check_alive_desktop.py:369`, `apps/ultra/tests/check_alive_desktop.py:859`, `apps/ultra/tests/check_alive_desktop.py:928`, `apps/ultra/tests/check_alive_desktop.py:950`). The workflow registers the GI-free tests and makes the diagnostic allowance explicitly provisional (`.github/workflows/ultra-ci.yml:44`, `.github/workflows/ultra-ci.yml:165`).
- Cannot verify from this local run: CI runner timing, the cause of the earlier timeout, instrumentation overhead against a controlled baseline, or a permanent raised deadline. The report explicitly leaves these open (`.superpowers/sdd/alive-workspaces-20261026/ci-timing-report.md:182`). This review does not approve unrelated runtime/global workspace behavior or activate v4.

### Strengths

- Recursive lazy traversal is accounted at the root, with active execution separated from caller suspension. The forwarding iterator preserves yielded values, send/throw, generator return, recursive close and raised exits without inclusive nested double-counting (`apps/ultra/tests/desktop_timing.py:126`, `apps/ultra/tests/desktop_timing.py:185`). The retained helper log contains ten passing tests, including these paths and pending-control observations (`/tmp/alive-workspaces-ci-timing/helper-tests.log:1`).
- Active controls are registered before the underlying call begins; periodic observations include main-thread stacks and copied query counters. Retention, stack size, labels, active spans, snapshot count and stdout budgets are bounded, and normal/exceptional exit joins the observer (`apps/ultra/tests/desktop_timing.py:77`, `apps/ultra/tests/desktop_timing.py:153`, `apps/ultra/tests/desktop_timing.py:174`). Cleanup emits no invented success claim.
- The retained preservation checker compares all 76 assertions, the normalized complete original run body, the capture body, and the parsed workflow against the base; its retained result passes (`/tmp/alive-workspaces-ci-timing/verify-targeted.py:10`, `/tmp/alive-workspaces-ci-timing/verify-targeted.log:1`). Review of the diff confirms the original failure diagnostic actions are preserved as well (`apps/ultra/tests/check_alive_desktop.py:960`).
- Actual retained observations contain capture entry/exit, final diagnostics entry/exit, both report writes, final Quit entry/exit, journey completion and observer shutdown. Nine periodic snapshots include a pending named accessibility lookup and its recursive stack; final active spans are empty (`/tmp/alive-workspaces-ci-timing/native/journey-timing.json:1`). Parent independently verified the committed source/binary provenance, finite stereo capture and raw native exit 0; those expensive checks were not repeated.

### Issues

#### Critical

- None.

#### Important

- I1 - `apps/ultra/tests/desktop_timing.py:65`: `phase-entry` and `phase-exit` use the same finite stdout allowance as ordinary operation progress. After 128 ordinary checkpoints at the default retention, `phase('capture-finalize ...')` and `phase('final-diagnostics')` still update the artifact but print neither their entry nor exit. A longer supported endurance journey can consume that allowance before finalization, losing precisely the stdout boundaries requested to diagnose this timeout. Reserve a separately bounded allowance for these finite final phases, while keeping repeated progress bounded, and extend the existing budget-exhaustion test to cover both phases. The ordinary local journey does not hit this case; this finding does not invalidate its retained measurements.

#### Minor

- M1 - `/tmp/alive-workspaces-ci-timing/native.log:10`, `/tmp/alive-workspaces-ci-timing/native.log:15`, `/tmp/alive-workspaces-ci-timing/native.log:20`: the native log contains private-bus systemd activation failures and portal AT-SPI/signature warnings. The report accurately discloses this inherited environment noise; the helper test output is pristine. This is a visibility limitation, not evidence of a new timing-helper failure, and does not require expanding this source task into portal configuration work.

### Checks

- Read the supplied complete diff as the source review, retrieving its initially truncated package output in bounded sections. No changed source file was separately reread, and no git commands, builds, source/test/index/HEAD/settings mutations, suites or subagents were used.
- Named risk: recursive-global lookup and early traversal exit. Checked `apps/ultra/tests/check_canvas_desktop.py:33` and the focused `scoped_find` body at `apps/ultra/tests/check_documents_desktop.py:51`; they resolve the newly wrapped module attributes dynamically, and their early return paths are covered by root generator closing. Also checked navigation's dynamic `ui.wait_for`/`ui.walk` calls (`apps/ultra/tests/alive_workspace_navigation.py:14`, `apps/ultra/tests/alive_workspace_navigation.py:49`).
- Inspected retained initial and behavioral red evidence, final helper output, verification exits, preservation checker/output, native summary and actual timing/stack artifact. The report's red/green and local observations agree with those files (`/tmp/alive-workspaces-ci-timing/red.log:1`, `/tmp/alive-workspaces-ci-timing/red-output-cap.log:1`, `/tmp/alive-workspaces-ci-timing/verification-exits.json:1`).
- Ran one new GI-free focused reproduction with `PYTHONDONTWRITEBYTECODE=1 python3 -` against `TimingProbe`: issue 128 ordinary checkpoints, execute both final phases, close, inspect stdout and artifact. Exit 0; stdout contains zero final-phase events, the artifact contains all four final-phase events, and the last stdout event is `observer-stop`. This concrete case is not answered by the retained late failure/Quit budget test; no passed test suite was repeated.

### Assessment

**Task quality: Needs fixes.**

The accounting, generator transparency, bounded observer and retained native evidence support the implementation. Fix I1 before accepting the full stdout checkpoint contract; CI runner diagnosis and the permanent deadline remain separate pending work.
