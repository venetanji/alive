# Alive PR 6 desktop CI timeout: bounded diagnosis

## Observed

The `Exercise the actual Alive desktop session and hosted editor` step in
`.github/workflows/ultra-ci.yml` has a five-minute limit. Runs `40264211910`
(`f0fb9e5`) and `40267085010` (`9bf3180`) timed out at that limit, with no
Python exception or final `native-session-report.json` in the retained desktop
artifacts. Their job logs show the startup PASS at 10.9 and 6.6 seconds after
step entry, respectively, and then no journey progress output. The later
`ca.desrt.dconf` activation at roughly 37 and 33 seconds is not an error.

Both retained `operations.json` files have the same last recorded checkpoint:
"saved/reopened/playing; missing and changed effect source rejected preserving
session." `journey.alive` and `missing-device.alive` exist. Both
`native-walkthrough.capture.json` manifests say `complete: true` and
`requested_stop`, with wall times of 188.38 and 192.73 seconds. Neither
artifact has an endurance capture, endurance progress, or final report. The
last operation is at `check_alive_desktop.py:806`; the next unobserved work is
`finish_capture` and its peak assertion at lines 807-808, followed by the
final diagnostics and close/cancel/quit checks at lines 851-927. A completed
recorder manifest alone does not prove which of those Python statements ran:
`Recorder.finish()` is also registered with `atexit`.

The unchanged full local journey with the pinned UI completed its `run()` body
in 187.540 seconds and wrote the final report. Its corresponding capture took
87.34 seconds; its first-to-last `operations.json` checkpoint span was 53.13
seconds. The two CI spans were 112.69 and 114.51 seconds, about 2.12-2.16
times local; the CI captures were about 2.16-2.21 times local. The local trace
placed the last operation at body +153.68 seconds and the final report at
+187.54, leaving 33.86 seconds of post-checkpoint work locally. Scaling that
remaining segment by the observed CI slowdown suggests roughly 72-75 seconds,
but this is a projection, not a CI measurement or proof of cause.

The local watchdog produced snapshots during slow but progressing calls in
`check_canvas_desktop.py`'s recursive `walk`, `check_documents_desktop.py`'s
`scoped_find`, and `alive_workspace_navigation.py`'s `prepare`. The trace then
advanced through later lines and completed. `wait_for` can make 80 attempts,
each involving a full accessibility tree search; `text` can walk the target
and all app roots again. Workspace preparation adds more lookups. These are
plausible accumulated costs under CI load, especially across many controls,
but the CI artifacts have no per-call timings or stack dump to prove an
accessibility stall. Startup passed promptly relative to the 300-second step;
the measured capture/checkpoint slowdown is the stronger timing signal.

## Smallest next task

Instrument this one desktop journey without changing or skipping assertions:

1. Emit flushed UTC and monotonic checkpoints at journey entry, each existing
   operation, before and after `finish_capture`, after final `detail`, after
   report write, and at final exit. Save the same rows in the uploaded artifact.
2. Aggregate count, total elapsed time, maximum elapsed time, and active
   control name for `wait_for`/`scoped_find` and tree walks. Flush a bounded
   progress snapshot every 20-30 seconds; capture periodic Python stacks
   before the CI step deadline can terminate the process.
   Keep timing diagnostics out of the audio validation and retain all current
   assertions and recorder limits.
3. Run the original full journey once on the CI runner with this probe. A
   provisional eight-minute step limit is justified for that diagnostic run:
   applying the observed ~2.2x capture/checkpoint slowdown to the 187.54-second
   local body predicts about 410-415 seconds, leaving roughly one minute of
   margin within 480 seconds. Do not treat a longer limit alone as a fix.

The next run should answer whether time is spent before/inside capture
finalization, in repeated accessibility queries, or in a specific final
close/quit action. If it completes, inspect the measured phase durations and
set the permanent deadline from those observations; if it does not, the last
checkpoint, active control, and stack should narrow the stalled component.

Sources: `gh run view 40264211910 --log-failed`, `gh run view 40267085010
--job 121391728121 --log-failed`, retained directories under
`/tmp/alive-ci-{f0fb9e5,9bf3180}-native`, and local trace/output at
`/tmp/alive-ci-f0fb9e5-{local.log,trace.py,local}`. This was a read-only
investigation of the test and production source; no suite was rerun.
