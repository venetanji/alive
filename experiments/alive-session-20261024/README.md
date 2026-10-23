# First Alive Hosted Session: Acceptance Evidence

Foundation: `31033483eb3baf15edab1734b966cc6d55c4b8c7` on the fetched combined
release branch. This includes PR #4's saved instrument at `ab8b0e2`, PR #5's
integration at `bf4301e` and subsequent release fixes. Main remains `8217458`;
the feature branch depends on that integration. No release branch was edited
or merged.

## Actual Native Journey

`native-session-report.json` and screenshots come from the release Rust/Tauri
application on a private Xvfb display and software-only PipeWire server.
CPAL reports PipeWire/default_output, 48 kHz, stereo, 512 frames (10.67 ms).
Hardware is AMD Ryzen 9 5900HS; the report retains `uname`/`lscpu` observations.
This is software loopback, not physical audio/MIDI latency or hardware playback.

The harness created a new session, loaded the real saved subtractive device on
both tracks through native pickers, changed tempo/note duration/velocity, authored
cutoff and level lanes, applied while stopped, played, changed bases and mixer,
opened/edited/closed/reopened the actual Ultra graph editor, saved/reopened/played,
preserved playback on missing-device Open and removed a stopped device. It also
proved Quit Cancel preserves a working session and Quit Discard exits from
playback. The 25.557-second finite stereo capture has peak0.372645 and exactly
equal channels after monitor-link setup, matching the device's authored mono
duplication. Stops/reopen account for silent windows. Raw capture remains under
`/tmp/alive-native-final-quick/`; its SHA256 is in the report.

![Alive playing](session-playing.png)
![Optional hosted Ultra editor](hosted-editor.png)

## Deterministic Host Proof

`headless-report.json` is emitted by the real display-free `--session-probe`
binary, loading the original `.ultra` file twice with independent roots.
It compares412452 frames per partition schedule, proves actual second-cycle
audio, wrap/seek generations, isolation, ownership, mixer and round-trip playback.
The saved-device boundary fixture schedules notes, cutoff and level on both
instances at0,1,31,63,64,127; all twelve effective-value observations are checked
on the exact scheduled sample and complete audio matches irregular partitions.

Separate native timing kernels measure native onsets0,1,31,63,64,127 and
legacy Clockwork onsets64,65,95,127,128,191. Native alignment delay is0; the
legacy adapter's64samples are deliberate buffering. Hosted v1 rejects legacy
Voice, so it does not silently combine different paths or claim the AOT Faust
kernels execute inside Clockwork. Mono joins and stereo descriptors are tested;
wider layouts are unsupported.

## Reproduce

Use `apps/alive/README.md` for build/run/host commands. The actual desktop gate:

```sh
ULTRA_TEST_ALIVE=1 ALIVE_ENDURANCE_SECONDS=600 \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-native-final
```

The sustained run is currently in progress. Its acceptance requires at least
600 conservatively counted playing seconds, excluding stopped work; finite
loopback capture; retained counters before every possible I/O restart; repeated
transport/edit/editor operations; and process-tree resource samples. CPAL
stream errors and native rejection/failure observations are distinct from
underruns, which CPAL does not expose. No xrun count is inferred from a zero
stream-error observation.

Local gates already pass: native callback/allocation/free/mutex guards and
scoped Stop stress;150Rust tests with two intentional ignores;442UI/component
tests;103rendered Chromium tests; the full recorded-reference/contracts gate;
14package/notice tests. Pending-history edits, native Quit generation guards and
scoped Stop regressions remain covered. Final pushed-commit CI is still pending.

Installed Live12.4.6 reference observations of Analog, Simpler, Sampler, Utility,
Auto Filter and Delay are retained separately in
`../alive-live-reference-20261024/README.md`. They establish UI/runtime evidence
and bounded static lifecycle observations, not recovered DSP implementations.
