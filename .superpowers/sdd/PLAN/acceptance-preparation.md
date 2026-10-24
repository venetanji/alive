# Expanded Acceptance Preparation

Do not count the M1 or original ten-minute run as M5 qualification. Run a new
30-minute playing interval only after final chain/clip/editor behavior is stable.
Every stream epoch must be sampled before Apply resets driver counters.

Existing check_alive_desktop.py collects PSS/RSS, threads, descriptors, process
IDs and stream failures but needs these additions for the expanded spec:

- Per-process CPU ticks and process names/worker counts, with monotonic sample
  times and explicit treatment of exited PIDs; aggregate deltas rather than
  claiming CPU from RSS or process count.
- Observable callback elapsed-time counts/total/max and processing-over-budget
  counts, with each callback's actual frame count/rate budget. Instrument
  off-thread publication with bounded atomics; clock reads have overhead.
  Processing time is not scheduling lateness or a physical underrun measure.
- Preserve actual CPAL stream-error reporting. A separate backend-reported
  Xrun counter may count ErrorKind::Xrun if exposed, but absence of reports
  cannot establish absence of physical underruns or dropouts.
- Chain, clip launch/stop, note editing/undo, editor cycles and save/reopen/play
  operations with current selected-instance identity, not hardcoded first two
  cutoff/level fields. Keep a shorter CI mode with the same real operations.
- Hardware/backend/rate/requested and observed buffer; private software
  PipeWire/Xvfb stays explicitly software evidence. No desktop system settings.
- Audio capture remains finite stereo; silence/stream resets must be visible
  in per-interval reporting rather than hidden by aggregate energy.

Keep GUI harnesses sequential. Replacing a mapped native library must use a new
inode and atomic rename. Retain pending-history, scoped Stop, native Quit/Close
guards and editor destruction/resource assertions.

## Measurement Details For Task 13 / 15

CPU samples should retain each observed descendant's PID, start-time ticks,
process/executable name and user/system ticks, plus SC_CLK_TCK and monotonic
time. Parse /proc/PID/stat after its final closing parenthesis so spaces in a
process name cannot shift fields. Compare (PID,starttime), not PID alone.
Report delta CPU seconds and percentage of one core for matching identities;
exited processes between samples leave an explicit observability gap. Count
actual WebKit workers by observed process names. Do not infer CPU or leak
freedom from a PSS delta or a stable process count.

Callback metrics must use fixed atomic storage and monotonic clock reads, with
no formatting/allocation on callback. Include callback count, frame count,
duration total/max and processing-over-budget count, using that callback's
actual frames/48000 budget. A bounded histogram is optional if useful for
distribution estimates; report clock/instrumentation overhead and bin limits.
Retain each retired stream's counters before reconfiguration, including errors
and any separately observable backend Xrun errors. A stream-error counter that
also includes xruns is not itself an independent physical-underrun measurement.

Use the short native journey to validate metric/resource collection before the
1800-playing-second run. Record every intentional pause/restart and retain
per-interval finite/nonzero audio evidence, not only aggregate capture energy.
The final soak follows stable clips/scenes/example; capacity benchmarking is
performed earlier, without claiming that the final endurance gate passed.

All three CI jobs and all four both-app package targets pass at848f53e (M1)
and4209eef (reviewed native-chain checkpoint). Publishing was skipped. The
downloaded848f53e Linux artifact remains M1-only evidence; later local desktop
chains/clips still require their own final pushed-commit CI and packages.
