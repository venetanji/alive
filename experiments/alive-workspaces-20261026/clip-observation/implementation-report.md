# Saved-Clip Native CI Harness Correction

Integration base: `ee83d30d9d6aa725f14a76e97d684b533e5b7baa`.
The initial investigation began at `4b9a88b721bba9728bb6b505e14cc4a14f7c8117`;
source ownership was relinquished without harness edits during Task2D fix1,
then explicitly returned after its freeze. Only four scoped Python harness
files and their native CI workflow entry are part of this correction. Parent documentation/evidence edits remain
outside its commit.

All raw attempts, logs, images, capture files, input receipts and source/build
pins are retained under `/tmp/alive-workspaces-clip-ci-fix/`.
The product used for every native attempt is the supplied coherent
`/tmp/alive-workspaces-task2d-desktop/app-qualified/` Alive, Ultra and adjacent
native library, attributable to the frozen Task2D product at `4b9a88b`.
It predates the unrelated `ee83d30` queued workspace slot edit correction.
Every qualified build/fixture hash was independently verified and copied into
this artifact directory; no app rebuild or binary replacement occurred.
`integrated-harness-pins.json` and `executed-harness/` identify the harness
actually run on that product.

## Demonstrated Boundaries

The remote original CI40384189184 at `ad706ca` still has insufficient evidence
to prove its missing-pending cause: its artifacts lack request insertion and
first-sample frame/time. The following controlled local mechanisms are proved;
they must not be described as proof of the original remote cause or generic
flakiness.

### Pending Can Disappear During Accessibility Traversal

The unmodified clip harness starts capture discovery/port linking after Start,
then launches without controlling musical phase and traverses accessibility
before checking transient pending. The initial `original-observed` complete
observability journey passes pending then applied at its actual phase; it does
not reproduce the remote failure.

A bounded focused probe uses the original input and unchanged pending assertion
after a deliberately late musical phase. The first `pending-late-red` attempt
targeted reported 3.8--3.95 beats. Input acquisition crossed the boundary before
insertion, so the request targeted the following bar and passed pending/applied.
That failed experimental precondition is retained and is not counted as RED.

The single adjusted `pending-late-red2` attempt targets reported 3.55--3.7 beats
to account for that measured acquisition delay. It produces this actual native
sequence (`pending-phase.json`):

| Monotonic | Original Harness Boundary | Native Observation |
| --- | --- | --- |
| 64351.167855283 | Launch begins | Reported position 3.644 beats |
| 64351.348127260 | Original click returns | Pending request 3, target frame 214473; current frame 212992 |
| 64351.348969316 | First original value traversal begins | About 1481 frames / 30.85 ms remained at the preceding sample |
| 64351.420553184 | First original value traversal finishes | Request 3 applied, Playing Clip 1 copy |

That traversal takes 71.58 ms and misses the actual pending state already
observed at input return. The original 8-second pending assertion then fails
with the applied value. No extra activation, pending-or-playing predicate,
timeout increase, scheduling change or saved music change creates this result.

`pending-early-candidate-green` preserves the same late precondition, then waits
for an early phase before the original single launch. Reported position changes
from 3.584 to 4.201 beats before launch. At click return, target frame 316306
and current frame 226304 leave 90002 frames, about 1.875 seconds. The unchanged
pending and applied assertions both pass. No further phase search was performed.

### A Native Tooltip Intercepts Disclosure Input

`disclosure-red2` forces an actual native tooltip over `Pulse runtime details`
by hovering `Select Pulse slot 4`, using the existing bounded tooltip helper.
The summary rectangle is `[156, 285, 145, 21]`. Its native hit path
`[927, 4194401]` contains a tooltip window and omits owned main frame 4194307.
The original unchecked pointer activation does not expand the summary; the
original control wait fails `Missing native control: Pulse clip runtime`, and
`disclosure-result.json` records `expanded: false`. This reproduces the older
local collapsed-runtime symptom with a demonstrated input-interception mechanism.

The earlier `disclosure-red` attempt failed in unused probe setup while looking
for a nonexistent disabled empty-slot launch control. It remains retained and
is not counted as RED.

`disclosure-candidate-green` uses the existing owned-window input readiness
helper. It dismisses the covering tooltip, observes a stable owned hit path,
emits one press/release, and expands the actual runtime. The integrated native
regression also fails against the original harness (`focused-source-red`) and
passes with the correction (`focused-source-green`).

## Scoped Implementation

- `check_alive_clips.py` completes capture discovery/linking before Start and
  waits on the cached `Transport position` accessible for phase 0.15--1 beat of
  the existing four-beat native bar before the same single Launch. This bounded
  eight-second prerequisite leaves most of the bar for observation, and avoids
  launching at the instantaneous start-of-bar boundary. Both original pending
  and applied assertions, with their original bounds, remain intact.
- `alive_workspace_navigation.py` injects native activation only for automatic
  runtime disclosure expansion. Other navigation and disclosure paths retain
  their existing behavior. `check_alive_desktop.py` supplies the existing
  `native_control_click` readiness/input algorithm with an optional recorder.
  Only the new disclosure recorder catches receipt failures and stores at most
  three bounded unavailable records. Ownership checks, readiness deadline,
  pointer input and input failures remain outside that guard. Existing callers
  resolve the original recorder as before; existing editor observers are unchanged.
- `check_alive_clip_observation.py` verifies a real covering tooltip, exactly one
  owned disclosure click, a deliberately late precondition redirected to an early
  launch, actual pending then applied, audio counters, and Quit/discard exit. Its
  fault modes inject a disclosure receipt write failure after actual input,
  blocked owned readiness with a receipt write failure, and an original native
  press exception whose exact object must propagate while release still runs.
- `.github/workflows/ultra-ci.yml` runs normal, receipt-write, blocked-readiness
  and native-input-failure modes through the existing private native wrapper and
  always uploads their evidence. The new bounded four-minute step leaves every
  existing gate and timeout intact; the focused file is an executable routine
  CI entry rather than a manual-only probe.

No production source, native scheduling, quantization, frame clock, saved music,
settings, capacities or native shipping gates change. No arbitrary retry, fallback click
or unbounded collector is added.

## Verification

The integrated focused native regression has observed RED/GREEN. The subsequent
`disclosure-write-red` proves that the initially reused helper propagates an
injected `OSError` from `native-inputs.json` after successful input. This is why
receipt isolation is required. The correction guards recording only; failure
probes verify both original blocked-readiness and native-input error behavior.
Syntax and
`git diff --check` pass. `verification-results.json` records each exact wrapper
command, flags, exit code and elapsed time for affected existing checks and the
single original complete clip/observability run after integration.

The existing input, chooser and editor diagnostic checks cover the existing
bounded native input readiness, disappearing native windows and X error-handler
restoration. Editor variants retain original success, injected observation
failure, original missing-window assertion/exception identity, and queued/result
receipt-write failure isolation. These paths are not modified by this correction.

Before the receipt-isolation correction, all eight sequential affected-check/full-
journey invocations exit 0. That preserved
`original-observability-green` run completes in 117.29 seconds with
six completed epochs, 6.848 playing seconds proven by the original sampler and
no sampling errors. Its original pending and applied observations, saved default,
history, editor continuity/generation boundary, scoped Stop with Harmony playing,
dependency refusal/recovery, save/reopen and Quit all complete. The original
report flags for draft editor continuity, Apply boundary, stopped-default reopen,
failed shared replacement editor continuity and sequential recovery are true.

Final observed audio counters are 1972 callbacks, zero stream errors, zero
rejected commands, no audio failure, zero active voices, and stopped transport.
The supervised software capture is complete, finite, 570880 frames with peak
0.2225944548845291; its 11.893-second duration is not the proven playing duration
and is not an endurance result. Reports, original screenshots, retained capture
and action/epoch/resource JSONL remain in that run directory.

`cleanup-verification.json` checks all 58 sampled process identities from the
initial and final full journeys by PID/start-time: none remain. The final
recorder/supervisor and qualified Alive/Ultra processes are absent. The existing
wrapper cleanup completes, and capture supervision reports the requested stop.

The final recorder correction warrants a fresh routine four-mode gate, affected
shared-helper regressions and original full journey. Their results are retained
separately in `final-verification-results.json`; the earlier successful pass and
its executed source pins remain under `prior-isolation-*` and its original run
directory.

Final frozen-source verification completes all twelve checks with exit 0: four
routine disclosure modes, the seven original input/chooser/editor modes, and
`final-observability-green`. The final full journey completes in 117.337 seconds,
with six completed epochs, 6.737 playing seconds proven and no sampling errors.
All original report flags and pending/applied, editor, scoped Stop, default,
dependency, history, save/reopen and Quit assertions pass. Final audio observes
1960 callbacks, 48 kHz / 512 frames, no failure, zero stream errors/rejected
commands/active voices, and stopped transport. Supervised finite software capture
contains 563712 frames (11.744 seconds), peak 0.2225944548845291 and SHA256
`565740d7f42bf4f477ec029288115ad5e8843058207502eb40afdd1cb2025f25`.
That capture duration is distinct from proven playing seconds.

`final-cleanup-verification.json` checks 87 sampled PID/start-time identities
across the initial and both integrated full runs: none remain. No qualified
application, recorder or supervisor process remains. The final source-continuity
check re-verifies all executed harness and product hashes and all 32 original
clip assertions unchanged. Workflow YAML parses, and structural comparison
proves every existing job configuration, step and timeout remains unchanged.

The nonfatal observer contract is tested directly on the final source: one
receipt `OSError` does not prevent successful disclosure input or subsequent
pending/applied checks; an unavailable owned target still raises the exact
original blocked-input assertion with zero activations despite its receipt write
failure; and an injected native press assertion propagates as the identical
exception object with its original release running. Only receipt recording is
guarded, and all prior editor observer/focus/write fault modes also pass.

The scoped source commit and empty-index freeze are recorded in
`source-freeze.json` alongside the artifacts. Parent owns the independent review
and subsequent integrated-build checkpoint; this worker does not push.

## Limits

All native runs use the existing private Xvfb/DBus and software PipeWire/CPAL
wrapper at 48 kHz and delivered 512 frames. They are short observable software
checks, not endurance, physical-audio, physical-xrun or release-capacity evidence.
Capture duration is not a playing-duration claim. The remote original cause
remains unproved even though both local harness mechanisms have controlled
reproductions and corrections.

## Fix Round 1: Failure Screenshot Isolation

The independent review identifies one additional observer failure at base
`6ab77758959d47891ad45dc458f4c9cbe16ff282`: the new regression entrypoint's
unguarded failure screenshot can replace the primary `run()` exception.
The correction guards only `alive.screenshot('clip-observation-failure.png')`
inside that handler and retains its outer bare `raise`. No native input,
journey, assertion, production code or timeout changes.

`apps/ultra/tests/test_alive_clip_observation_failure.py` parses and compiles the
actual source entrypoint AST, supplying only a sentinel `run` and screenshot
dependency so this failure path runs without desktop imports. It does not copy
the handler implementation. One case injects a primary `AssertionError` and a
secondary screenshot `OSError`, then checks the escaping exception by object
identity and the requested diagnostic filename. The other retains a successful
diagnostic file and checks the identical primary exception still escapes.
The existing routine clip-observation CI step now runs this focused regression
before its unchanged four native commands.

Evidence is retained under `/tmp/alive-workspaces-clip-ci-fix/fix1`:

- RED: `python3 apps/ultra/tests/test_alive_clip_observation_failure.py -v`
  exits 1 against the unchanged base wrapper: one failure reports the secondary
  `OSError` is not the original `AssertionError`; the successful capture case
  passes. `red.log`, `red.json` and `red-source/` retain output, exact command,
  source hashes and source copies.
- GREEN: the same command exits 0 after the screenshot-only guard; both tests
  pass. `green.log`, `green.json` and `green-source/` retain matching evidence.
- `python3 -m py_compile apps/ultra/tests/check_alive_clip_observation.py
  apps/ultra/tests/test_alive_clip_observation_failure.py` exits 0 with bytecode
  directed to the evidence directory.
- `python3 /tmp/alive-workspaces-clip-ci-fix/fix1/check_scope.py` exits 0. YAML
  parses; structural comparison against the base proves the only workflow
  change is the focused regression invocation. Existing commands, steps and
  timeouts remain unchanged. AST comparison proves the native regression body
  outside the entrypoint is unchanged.
- `git diff --check` exits 0. The executable cheap-check driver, individual
  command outputs and results are in `run_cheap_checks.py`, `cheap-*.log` and
  `cheap-checks.json`.

Self-review confirms the guard encloses only the diagnostic call, the original
bare raise remains outside the nested handler, and the regression exercises the
actual wrapper in both diagnostic failure and successful capture cases. The
scoped commit and empty-index/source-continuity freeze are recorded in
`fix1/source-freeze.json` for the original reviewer's `6ab7775..FIX_HEAD` check.

This round runs only focused exception-isolation, syntax and workflow/scope
checks. It does not invoke the actual Gdk screenshot helper or rebuild/run the
native app. The twelve native checks and complete observability/audio journey
remain evidence for `6ab7775`, with the original product pin and limits above;
they are not claimed as executions of this screenshot-only follow-up commit.
