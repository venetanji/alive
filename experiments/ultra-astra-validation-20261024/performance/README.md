# Native release measurements

The four result directories contain recorded results, not benchmark thresholds.
Both source revisions used the original `fixture.ultra` (16 nodes, 16 edges,
32 SVG paths). Each condition has two 30-second samples without interaction:
audio off/on and visible/iconified. `plain-*` repeats only off/visible without
the preload. Source and binary hashes are in `../environment.json`.

The baseline commit `bfe42ff060931eb23384093d9c133ab873f02546` has the same tree
as audited snapshot `b3bf4545fabfabc0fd329c77c4828e9d70183b97`. The fixed build
is `de663840346a12d0fe5b49eb669af1cc1788f25f`. A future rerun from this evidence
branch records that branch's SHA, rather than silently labeling it as the
historical source revision.

## Reproduction

Use a separate checkout at each source SHA, and build the release app with
`bash apps/ultra/build.sh`. The recorded run used the system toolchain listed
in `../environment.json` and pinned native dependency sources. The normal
build script may select its pinned toolchain instead; record that difference.

Linux dependencies include WebKitGTK 4.1 development headers, GTK3, Xvfb,
twm, XTest, D-Bus, AT-SPI2, Python PyGObject, PipeWire, WirePlumber, and the
dependencies used by `apps/ultra/tests/check_canvas_desktop.py`. The launcher
uses private display, bus, data and audio directories. It does not edit the
user's desktop configuration or disable the WebKit sandbox.

From the repository root, set these paths:

```bash
AUDIT_BUNDLE="$PWD/experiments/ultra-astra-validation-20261024"
AUDIT_BUILD_REPO=/absolute/path/to/isolated/alive
AUDIT_OUTPUT=$(mktemp -d /tmp/alive-perf.XXXXXX)
cc -shared -fPIC -O2 "$AUDIT_BUNDLE/performance/metrics.c" \
  -o "$AUDIT_OUTPUT/metrics.so" \
  $(pkg-config --cflags --libs webkit2gtk-4.1) -ldl
AUDIT_ROOT="$AUDIT_BUILD_REPO" AUDIT_PRELOAD="$AUDIT_OUTPUT/metrics.so" \
  bash "$AUDIT_BUNDLE/performance/session.sh" "$AUDIT_OUTPUT/results"
```

The command block assumes the current directory is the repository root.
`AUDIT_TWM` may name an absolute twm executable; the recorded run used a
locally extracted twm 1.0.13.1. Optional `AUDIT_SECONDS`, `AUDIT_REPEATS`, and
comma-separated `AUDIT_MODES` select duration/repeats/conditions. The recorded
measurements used 30 seconds and two repeats. To corroborate without injected
counters:

```bash
AUDIT_ROOT="$AUDIT_BUILD_REPO" AUDIT_PRELOAD='' AUDIT_MODES=off-visible \
  bash "$AUDIT_BUNDLE/performance/session.sh" "$AUDIT_OUTPUT/plain-results"
```

Use fresh output directories and keep the launcher immutable while Bash is
running it. Do not write results over the committed historical data. To
recompute the historical aggregate, run `python3 performance/summarize.py`
from this experiment directory.

## What is measured

`run_native.py` drives the real Tauri app through the repository's desktop
input adapter, then samples `/proc` at one-second intervals. CPU is the sum
of process and thread CPU charged to the app process tree, expressed as a
percentage of one logical CPU; child accumulated CPU is not counted twice.
PSS sums `smaps_rollup` over the same process tree. Process start times guard
against PID reuse. Short-lived subprocesses that vanish between observations
can be missed. Separate Xvfb and PipeWire daemons are outside this tree.

`metrics.c` installs a WebKit user script at load time. `metrics.js` counts
SVG `d` writes, cable-container replacements, geometry reads, 100 ms timer
callbacks, ordinary Tauri IPC, and reported audio/JavaScript errors. This is
an instrumented release executable, not a browser mock. The public invoke
wrapper forwards to Rust. For separate history reproductions it can hold
history IPC; performance samples never enable that switch. The optional
command file is a local test hook and is not shipped with the application.

Iconification is requested through X11 with twm and corroborated by recorded
visibility counters/screenshots. No input is generated during sample periods.
The launcher uses the real CPAL PipeWire backend with a private software
sink, 48 kHz stereo and 512 frames. This is not physical audio hardware.

## Interpretation and limits

All fixed instrumented samples have zero idle cable rebuilds/path writes,
while the baseline rebuilds every poll. Polling persists near 9.5 Hz, with
roughly 45 geometry reads per fixed poll. All instrumented samples reported
zero stream errors/xruns and no JavaScript or native engine faults.

The display is Xvfb software rendering, not the user's Hyprland Wayland/GPU
path. Background user work continued; runs were sequential, not randomized.
Memory sharing and workload contention affect CPU/PSS comparisons. No stack
profile establishes how much of the user's approximately 23% WebKit CPU is
caused by cables. The separate preload-free runs corroborate the direction
of CPU change without proving causal attribution.

All eight baseline samples and their summary completed before a launcher
cleanup parsing error. The validator had edited the launcher while Bash still
had it open. The app, metrics and measurement driver did not change during
samples. That mistake and cleanup are recorded in
`../logs/baseline-wrapper-status.txt`; subsequent launches used immutable
copies. Pilot runs are excluded. Full raw one-second samples, logs and
screenshots remain in the local evidence directory; the committed summaries
retain each sample's duration, CPU/PSS, first/last counters and engine status.
