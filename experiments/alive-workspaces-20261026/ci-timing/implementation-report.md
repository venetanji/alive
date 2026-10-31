# Native desktop journey timing report

Status: implemented and verified locally; ready for independent review. This
adds diagnostic observations, not a proved fix for the CI timeout. The eight
minute deadline is provisional. A measured run on the CI runner is still
needed to identify the delayed work and choose the permanent deadline.

Base: `87cb416d0f22d6be65f72bc3c39dd5d3318dc087`.
Targeted commit: `08156eae520945302b14697e23b11b0815aac387`.

Source and index were explicitly frozen at `2026-10-26T05:09:09.126969+00:00`,
before writing this report. The index tree was
`151f5aa486d90e314b88a6d8176d2a6336b43961`; staged diff was empty.
Freeze hashes are retained in
`/tmp/alive-workspaces-ci-timing/source-freeze.json`. No further source/index
edits, push, or release operation were performed. Parent PLAN/docs edits were
preserved and excluded from the targeted commit.

## Change

- `check_alive_desktop.py` activates timing only when executed directly.
  Other desktop journeys importing its helpers remain uninstrumented. The
  startup wrapper and early smoke return retain their original behavior.
- UTC/monotonic checkpoints cover entry, every existing `log` operation,
  capture finalization, final diagnostics, both report writes, final Quit,
  failure and observer shutdown. Only the statement after the final Quit
  assertions emits `journey-complete`; smoke return, failure and cleanup do
  not manufacture that claim.
- `desktop_timing.py` transparently wraps `wait_for`, `scoped_find` and root
  accessibility traversals. Reports contain count, inclusive elapsed wall
  seconds, maximum elapsed and raised-exit count, plus active control names
  while queries are pending. Counts include completed unsuccessful calls;
  the native run's single `scoped_find` raised exit is an ordinary lookup
  miss, not a failed journey assertion.
- Recursive lazy walks count each root once. Timing covers generator
  execution and closing, excludes suspension in caller code, and preserves
  values, generator returns, send/throw, early close and exceptions. Nested
  query totals overlap; they are neither disjoint time nor CPU consumption.
- An observer records main-thread Python stacks and active calls every 20
  seconds. It has a 64-snapshot default lifetime, is canceled and joined on
  normal return and exceptions, and installs no signal handler or child
  process. Default retention is 128 events, active spans are capped at 32,
  labels at 256 characters, and stacks at 40 frames/12,000 characters.
  Stdout is separately limited to 128 ordinary checkpoints, 16 terminal
  checkpoints and 64 periodic snapshots. Terminal observations have a
  reserved budget. Artifact replacement is atomic; retained snapshots copy
  their counters so later calls cannot rewrite historical observations.
- `ultra-ci.yml` registers the GI-free helper tests in the contracts job and
  changes only this journey's step deadline from five to eight minutes.

All 76 existing assertions remain verbatim in AST form. Removing diagnostic
checkpoints and the new timing `with` statements yields exactly the original
`run()` body. The capture-processing body is likewise identical after its
function rename. All original actions, waits, recorder limits and final
close/cancel/history/Quit checks remain. No app/native/UI implementation or
shared desktop helper was changed, and no release app was rebuilt.

## TDD and focused checks

Evidence root: `/tmp/alive-workspaces-ci-timing`.

The focused command throughout was:

```sh
python3 -m unittest discover -s apps/ultra/tests -p test_desktop_timing.py -v
```

Initial red `red.log` exited 1 because the new helper module did not yet
exist. Behavioral red tests then exposed mutable historical counters
(`red-snapshot.log`, exit 1), suppressed late failure/Quit output
(`red-terminal.log`, exit 1), missing bounded active-span accounting
(`red-nesting.log`, exit 1), and an unbounded terminal-only output path
(`red-output-cap.log`, exit 1). Each corresponding implementation change
was followed by green verification. The initial and intermediate green
logs are retained. `green-final.log` and fresh `helper-tests.log` show all
10 tests passing, exit 0.

Tests exercise a genuinely pending call from the observer thread and inspect
its control name and stack before it returns, original return/exception
identity, inclusive nested accounting, lazy recursive root traversal,
caller suspension, early recursive cleanup, send/throw and generator return,
retention/output/lifetime bounds, frozen snapshot counters, nested active
span limits, and observer shutdown on both normal and exceptional exits.

Fresh final checks, all exit 0, are recorded with exact argument vectors in
`verification-exits.json`:

```sh
python3 -m unittest discover -s apps/ultra/tests -p test_desktop_timing.py -v
python3 -m py_compile apps/ultra/tests/desktop_timing.py apps/ultra/tests/test_desktop_timing.py apps/ultra/tests/check_alive_desktop.py
python3 /tmp/alive-workspaces-ci-timing/verify-targeted.py
git diff --check -- .github/workflows/ultra-ci.yml apps/ultra/tests/check_alive_desktop.py apps/ultra/tests/desktop_timing.py apps/ultra/tests/test_desktop_timing.py
```

The targeted verification checks assertion/body/capture preservation, parses
workflow YAML, verifies the helper-test registration, and compares the full
parsed workflow against the base after removing only the new test step and
restoring this one deadline. No unrelated full suites were run.

## One actual native journey

Exact command, run from the existing worktree:

```sh
env ULTRA_TEST_ALIVE=1 \
  ULTRA_TEST_SCRIPT=/home/venetanji/.codex/worktrees/edd5/alive/apps/ultra/tests/check_alive_desktop.py \
  PYTHONUNBUFFERED=1 \
  timeout --signal=TERM --kill-after=10s 480s \
  bash apps/ultra/tests/check_canvas_desktop.sh \
  /tmp/alive-workspaces-ci-timing/native
```

`ALIVE_SMOKE_ONLY` and `ALIVE_ENDURANCE_SECONDS` were unset. The wrapper used
the existing separate Alive release and private Xvfb/software PipeWire graph.
Exit was **0**. Elapsed wrapper time was **194.927714322 seconds**; journey
entry through the completion checkpoint was **185.551739413 seconds**.

Observed phases:

| Phase | Elapsed wall seconds |
| --- | ---: |
| Capture finalization | 1.362364081 |
| Final audio diagnostics | 7.153391488 |
| Final Quit/Discard through process-exit assertion | 0.519224625 |

Final inclusive query aggregates (do not add these rows):

| Query | Completed count | Inclusive wall seconds | Maximum seconds | Raised exits |
| --- | ---: | ---: | ---: | ---: |
| wait_for | 671 | 89.140672348 | 0.329968482 | 0 |
| scoped_find | 703 | 90.851767170 | 0.329954897 | 1 |
| root walk | 791 | 62.697191171 | 0.240556611 | 0 |

Nine periodic snapshots were retained, including active accessibility calls
and named controls. Final timing artifact: 40,817 bytes, 26 retained events,
zero dropped events, empty active-span list, and final `observer-stop`.
The Python process returned through the joined observer; wrapper cleanup
completed. The final report confirms all original close/cancel/Quit checks,
including accepted edit history clearing and final discard exiting Alive.

The retained native log contains inherited private-display environment
messages: portal attempts to activate `org.freedesktop.systemd1` fail in
the private bus, the GTK portal prints AT-SPI/signature warnings, and the
Hyprland portal reports it cannot connect to a Wayland compositor on this
Xvfb run. These messages were retained verbatim; the run is not described
as globally warning-free. The startup PASS and full journey exit 0 follow
them. The focused helper test output itself contains no warnings.

Original capture metadata reports `complete: true`, `requested_stop`,
88.878084762 recorder wall seconds, 33,964,032 audio bytes, and recorder
return code 1. This is the existing requested-stop supervision behavior,
accepted by the unchanged capture assertion; the overall journey exit was
0. The waveform receipt contains 4,245,504 frames / 88.448 audio seconds,
peak 0.35335424542427063, SHA256
`255fd426f4b6044f71296441b7d389cd0ee55bbe5ed3e46b0e647d7da0690338`.
Recorder bounds remain 2,700 wall seconds, 1 GiB audio, 64 MiB metadata,
1 MiB stderr and 256 MiB disk reserve.

Evidence includes `native.log`, `native-command.json` (exact command,
timestamps, exit and before/after hashes), `native-summary.json`, and the
original `native/native-session-report.json`,
`native/native-walkthrough.capture.json`, waveform and screenshots. The
phase/query/stack artifact is `native/journey-timing.json`.

## Provenance and limits

All recorded app, native and harness hashes matched before and after the
native run. Complete hashes are in `native-command.json` and
`source-freeze.json`; principal pinned binaries are:

- Alive: `bac50bb1af01c2d15d985d0cf345f21a1efcd6a0be450f0b77870df4356c3260`.
- Release native: `4c54e3e0a2e7bf2007a56620d1006658e97b86d5f8828e08f13e9ffd3a1e9e70`.
- Ultra: `51788adda242c24e22838737cd6525e0fa0af09223e817d7846449795107add3`.
- Journey harness: `01fa550262a00a1204484582f2d4c495a755c45e2601ecad50fd2516a5e8194d`.
- Timing helper: `a1cfa19830c499ecfee24db0e5acd56fdf89919434c46ade094f7547bd53957c`.
- Focused tests: `8f474098a82c042e32bec05cf3c8cd34bd54b0b054996954f128b0f0dc1c8f98`.
- Workflow: `bfb610bd80510deb22680c59521f0c272715f1fd14caba68010dc60c89d21081`.

The local observations show the instrumentation is transparent to the full
journey and expose capture finalization and final diagnostics separately.
They do not establish where the earlier CI jobs spent time, demonstrate CI
success, quantify instrumentation overhead against a controlled baseline,
or justify a permanent raised ceiling. The next CI runner execution must
be inspected before making those conclusions. PR #6 remains draft and no
push was performed by this implementer.

## Fix round 1: I1 final phase stdout allowance

Review finding I1 was verified: the finite final phase entry/exit events
shared the ordinary progress allowance and could disappear from stdout
after it was exhausted, despite surviving in the retained artifact.

Base: `08156eae520945302b14697e23b11b0815aac387`.
Scoped fix commit / final HEAD:
`cb079f2b95d5d3d5755db85cf88d8744c4806caa`.

`desktop_timing.py` now gives the entry and exit of each finite final phase
its own single-emission reserve: walkthrough capture, optional endurance
capture and final diagnostics. This adds at most six stdout rows. The
allowlist is finite, and repeated observations of an earlier capture cannot
consume the reserve for later diagnostics. Artifact retention, ordinary
checkpoint, terminal failure/Quit and periodic stack allowances remain as
specified above. No journey actions, timing cadence, assertions, capture
processing, workflow or native implementation changed in this fix.

The existing output-budget test was extended to exhaust ordinary progress,
exercise both capture phases and final diagnostics, inspect artifact exits
and all six flushed stdout boundaries, repeat early capture before later
diagnostics, and verify repeated phases remain bounded. Existing failure,
Quit, shutdown and terminal-only bounds are still checked in that test.

RED, before the helper change:

```sh
python3 -m unittest discover -s apps/ultra/tests -p test_desktop_timing.py -v
```

Exit **1**, retained as
`/tmp/alive-workspaces-ci-timing/fix-1-red.log`: nine tests passed; the
extended test failed because the emitted final phase list was empty rather
than containing the six required boundaries. GREEN after the scoped change
uses the same command, exit **0**, all **10 tests passed**, retained as
`fix-1-green.log`.

The remaining fresh checks all exited **0**:

```sh
python3 -m py_compile apps/ultra/tests/desktop_timing.py apps/ultra/tests/test_desktop_timing.py
python3 /tmp/alive-workspaces-ci-timing/verify-targeted.py
git diff --check -- apps/ultra/tests/desktop_timing.py apps/ultra/tests/test_desktop_timing.py
```

Exact check arguments, exits and log names are in
`/tmp/alive-workspaces-ci-timing/fix-1-verification-exits.json`. The
preservation output still confirms all 76 original assertions, the
normalized original full journey and capture body, and the targeted
workflow registration/deadline comparison. No broad suite or native journey
was repeated: I1 changes only bounded diagnostic stdout routing, and its
failure and correction are covered directly by the focused test. The
earlier native evidence continues to describe commit `08156ea` and its
recorded helper hash, rather than claiming a native run of this new helper.
The eight-minute CI deadline remains provisional and the runner diagnosis
remains pending.

Source/index were frozen again at
`2026-10-26T05:18:29.682243+00:00`, before this report appendix; index tree
`58f652c4aa0f46ae49c4c7d9cdf3b6a9f3567965`, staged diff empty. Exact hashes:

- Workflow: `bfb610bd80510deb22680c59521f0c272715f1fd14caba68010dc60c89d21081`.
- Journey: `01fa550262a00a1204484582f2d4c495a755c45e2601ecad50fd2516a5e8194d`.
- Timing helper: `e88e5d5d2bd3fe260984733e1bbd336df2fe2e07a5865541254e259d6df138c7`.
- Focused tests: `7d1dc049575d8da79c6963e04240c205c15b19fb53c4bf7da17484d1d2db3890`.

Freeze provenance is retained at
`/tmp/alive-workspaces-ci-timing/fix-1-source-freeze.json`. Parent PLAN/docs
and evidence edits were preserved and excluded from this two-file source
commit. No push, settings change or release operation was performed.
