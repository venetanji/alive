# Alive Application Milestone 1

This checkpoint makes Alive an independently packaged application with audio
settings. It continues draft PR #6; effect chains, interactive clips, eight-track
capacity and the new 30-minute acceptance soak remain outstanding in PLAN.md.

## Observed Results

- Actual separate Alive executable: two saved-device loads, note/automation and
  live mixer/base edits, editor edit/close/reopen, save/reopen/play, dependency
  failure preservation, stopped removal, native window-manager Close/Cancel and
  Quit/Discard all pass. The final walkthrough captures 25.355
  seconds of finite stereo software audio, peak 0.372645.
- Audio settings save a 512-frame request; the private sink rejects 128 frames
  without replacing preferences. Running configuration stays disabled. Stop
  audio is checked after active voices, clears notes/transport, and restarting
  audio retains stopped transport. Musical drafts survive driver operations.
- A new-package capability omission was reproduced by the strengthened native
  regression (`editor-close-red.log`): Close left the editor open. The corrected
  package grants listen/unlisten/close only to owned windows. The actual generated
  context regression and native editor destruction/window-close tests pass.
- Eight real editor close/reopen cycles retain one WebKit worker. From the first
  closed editor to final idle: descriptors 154 -> 153, PSS
  446037 -> 473161 KiB. These bounded observations do not
  establish leak freedom or meet the new endurance gate.
- The extracted final Alive DEB runs without a development library override.
  Different disposable bundled-template titles prove default startup and New
  resolve the packaged files, then both devices play. Capture: 3.008
  seconds, peak 0.222594. Both DEB file-ownership sets have
  no collisions; each package's notices, native lookup and offline session probe
  pass. See `alive-m1-package-report.json` for hashes and local artifact paths.

Hardware/backend: Ryzen 9 5900HS, Linux x86_64, actual release Tauri application,
private Xvfb and software PipeWire/default_output, 48 kHz stereo / observed 512
frames (10.67 ms). All checked observations have zero reported stream errors,
native failures and rejected commands. Physical audio/MIDI is untested. CPAL
provides no separate underrun count; no zero-underrun claim is made. Raw PCM stays
local, with hashes retained in the reports.

## Regression Gates

151 shared Rust tests pass (two intentional ignores), plus the Alive generated
context test. All 443 UI/component and 103 Chromium tests pass. The complete
protocol/reference/contracts gate passes with jsonschema supplied through a
disposable uv environment. Native timing/partition/isolation/ownership/mixer/
termination/callback allocation-free-lock guards and the 43,008-sample scoped
Stop stress pass. Sixteen release tests and four notice tests pass. Current-head
CI/package results must be checked after pushing; earlier green CI is historical.

## Commands

```sh
bash apps/alive/build.sh
bash apps/alive/run.sh
bash apps/alive/run.sh apps/alive/examples/two-instruments.alive
python3 -m unittest discover -s apps/ultra/scripts -p 'test_*.py'
bash apps/ultra/tests/ci/check-native.sh
uv run --no-project --with jsonschema -- bash apps/ultra/tests/ci/check-contracts.sh
ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-desktop
ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_editor_resources.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-editors
```

The exact source/binary hashes for the observed developer runtime are in
`runtime.json`. The final DEBs are available locally under `dist/alive` and
`dist/ultra`, deliberately excluded from Git. Local AppImage generation fails
because the pinned bundler's strip/GTK plugin does not support this Arch
installation's RELR/glycin loader layout. No system packages or settings were
changed to work around it. Ubuntu, Windows and macOS package CI must qualify
those artifacts; Linux observations do not establish other-platform behavior.
