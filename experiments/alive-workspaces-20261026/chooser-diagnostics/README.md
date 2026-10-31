# Native Chooser Failure Diagnostics

Source `0bbad1814dcd8eb58b39be42517aed1466e8a8f2`, base `a0c34e3`.
Status: DONE_WITH_CONCERNS; independent review found a required correction.
If a native window disappears between observational queries, Xlib can exit the
process before input or the original assertion. A private native reproduction
confirms the failure; best-effort error isolation is required before approval.
The exact `65eb486`
CI chooser failure remains unexplained. This change adds evidence collection
and repairs a stale helper reference; it is not a confirmed chooser fix.

The original local prefix and two native/DOM traces pass. Focus scroll changes
the Replace control's position, but the original input uses its correct final
bounds and reaches the native chooser. A proposed actual-tooltip precondition
does not occur. Those results do not reproduce or establish the CI cause.

The existing input path now optionally records bounded Replace target/native
window information and accepted XTest input. Failed chooser polling records
candidates and bounded root-window data before the same assertion. Original
motion/button order, timeout, sleeps, title/mapped-state checks and journey
assertions remain. Native observations add approximately 0.5-0.6 ms locally
before input; that overhead may affect a race and is explicitly disclosed.
The focused helper's stale tooltip function name is corrected separately.

The complete original native journey passes in 193.56 seconds including harness
startup (184.14 seconds inside the journey), with exact saved cutoff/automation/
mixer, pending-history, source-error, editor-lifetime, save/reopen and Quit
assertions intact. Focused diagnostic checks, the serial native helper, Python
compilation and 11 frame/timing tests pass. One concurrent helper launch loses
its private display; its failed evidence is retained, and the serial run passes.

```sh
ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-chooser-verification
```

Tests use the unchanged, hash-pinned Session release executable and native
library. They do not qualify the newer provisional MIDI Arrangement runtime.
Parent verification matches 224 raw artifact hashes, 13 pins and five committed
blobs, and streams the entire capture: 4244992 finite stereo frames at 48 kHz,
88.437333 seconds, peak 0.353354, identical channels. Final reports show zero
stream errors/rejections; owned recorder cleanup completes. This is software
PipeWire/CPAL at 512 frames, not stereo-separation, physical-audio or endurance
evidence. Capture time includes intentional transport changes.

Selected evidence is retained here. Full logs, traces, screenshots and PCM stay
under `/tmp/alive-workspaces-chooser-ci-fix` with their frozen hash inventory.
The initial remote failure is separate in `../ci-65eb486/`. A new exact-head
remote run remains required; local passes do not retroactively clear that run.

Follow-up: scoped correction0d9ccd6 and its native RED/GREEN evidence are
retained separately in fix1/. Independent re-review approves the diagnostic repair. Its full
original journey fails a later changed-source status assertion; the passing
initial journey is not substituted for that result. See fix1/README.md.
