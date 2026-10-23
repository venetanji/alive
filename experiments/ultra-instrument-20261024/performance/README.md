# Ultra release UI performance

The baseline uses the existing release before the reusable instrument changes.
The workload is the original connected starter patch: 16 objects and 16 cables.
Audio-on requests its 150 ms metro/chord/makenote sequence through the existing
legacy voice, gain, join and stereo output. These measurements concern the
Rust/Tauri app and its WebKit descendants; the software audio server and window
manager are outside that process tree.

## Reproduce

From the repository root, build with `bash apps/ultra/build.sh`, then run:

```sh
ULTRA_TEST_WM=1 \
ULTRA_TEST_INITIAL_PATCH="$PWD/apps/ultra/ui/canvas-preset.json" \
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/profile_canvas.py" \
bash apps/ultra/tests/check_canvas_desktop.sh /tmp/ultra-performance
```

The harness uses a private D-Bus, accessibility registry, Xvfb display, software
PipeWire server and policy session. An installed Motif window manager runs on the
private display. The script finds only the app's client by `_NET_WM_PID`, asks
the WM to iconify it with `XIconifyWindow`, and verifies `WM_STATE=Iconic`; visible
cases verify `WM_STATE=Normal`. No user desktop settings or audio devices change.

Each case settles for two seconds, samples process CPU ticks over ten seconds,
then reads each process's `/proc/PID/smaps_rollup` proportional set size (PSS).
CPU is a percentage of one logical core, summed across the app tree. PSS includes
each process's proportional share of shared mappings and is summed in KiB. It is
not the sum of RSS. Run order is audio-off visible/minimized, then audio-on
visible/minimized. The app stays alive across all four cases, so memory reflects
warm-up and cumulative residency as well as the current window state.

## Paired results

`before.json` and `after.json` retain raw samples, child processes, binary SHA-256,
commit, patch SHA-256, hardware, kernel and package versions. Their patch hashes
match exactly. The before/after audio-node JSON retains the observed PipeWire
stereo format and stream identity. The baseline GUI label
collector returned no values: 512 frames is the fixed server configuration, not
a retained baseline callback observation. The after run additionally reads live
Audio settings and records `512 frames / 10.67 ms`, `default_output (PipeWire)`
and `Rust / CPAL - PipeWire`. Its `pw-top` one-iteration output was empty; the
callback observation comes from the GUI, not that empty file.

| Case | Before CPU | After CPU | Before PSS (MiB) | After PSS (MiB) |
| --- | ---: | ---: | ---: | ---: |
| Audio off, visible | 38.10% | 11.60% | 318.37 | 310.47 |
| Audio off, minimized | 28.50% | 2.80% | 348.62 | 314.40 |
| Audio on, visible | 40.10% | 24.20% | 475.06 | 465.76 |
| Audio on, minimized | 31.00% | 20.60% | 486.72 | 462.30 |

Visible idle CPU falls by 69.6%; minimized idle falls by 90.2%. The WebKit web
process accounts for 31.9% -> 8.1% in the visible idle pair and 24.0% -> 1.3% in
the minimized idle pair. Active playback still uses 17.5% WebKit CPU visible and
14.5% minimized; this change does not eliminate all work during execution.

The after artifact contains the integrated new instrument implementation, with
the same original starter loaded. This is an end-to-end comparison of the two
release artifacts on an identical patch, not an isolated microbenchmark proving
that every difference comes only from the UI change.
The measured after artifact predates the final overflow-release and nested
binding corrections. Its hash is retained in `after.json`; the later final
desktop binary hash and results are in `../verification/results.json` and
`../desktop/`. The unchanged starter/polling workload was not remeasured after
those corrections.

Machine: AMD Ryzen 9 5900HS, 8 cores / 16 logical CPUs. The private PipeWire
configuration fixes 48 kHz / stereo / 512 frames (10.67 ms). The retained node
format confirms 48 kHz stereo F32LE for the CPAL stream. Package/kernel details
are in the JSON. This is one paired development-machine run, without controlled
background load or a confidence interval.

## Cause and checks

The previous 100 ms loop emits state on every status response. `mountCanvas`
rewrites text and styles and rebuilds the cable SVG on every emission, including
when only rendered-frame and callback counters advance. Iconification previously
used the same requested loop cadence. The release baseline reproduces high WebKit CPU with
audio off, where the starter has no advancing control sequence.

`canvas-poll.mjs` separates display changes from advancing frame/callback
diagnostics while retaining fresh controller state. A final observation render
clears bang flashes, and popup visibility participates in the display key. Faults,
stream errors, observations, console messages and authored changes still update
the view. When WebKit reports `document.hidden`, polling uses one second and
restores immediately; native
audio, events, Stop and Panic do not depend on that timer. Cable geometry is
remeasured on render but its SVG elements survive when endpoints, edges,
selection and pending-cord geometry are unchanged.

Regression checks cover stable cable identity during live observations, cable
invalidation after resize/zoom/disconnection, diagnostic freshness without canvas
writes, visible faults, bang-flash clearing, hidden/restore cadence, and an
in-flight poll restoring or disposing without overlap. The full UI suite passes
392 tests at this stage; the final integrated count may grow. The Impeccable
detector reports no findings for the changed canvas and polling modules.

## Scope

The private WM performs actual X11 minimization. Its `WM_STATE` is observed;
JavaScript `document.hidden` and native IPC poll counts were not instrumented in
these runs. The hidden scheduler's exact cadence is covered by the tests. These
numbers do not qualify
Hyprland/compositor occlusion, a GPU-backed desktop, physical output latency,
physical MIDI, or sustained realtime deadlines. Xvfb reports unavailable DRI3,
so these are software rendering results. Baseline sequencing is the exercised
UI workload; no baseline PCM capture is retained. The complete new subtractive
instrument has separate playback/capture evidence and must not be compared to
this starter as though it were an identical workload.
