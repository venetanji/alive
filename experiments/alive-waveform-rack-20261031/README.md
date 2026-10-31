# Audio Waveform And Horizontal Device Rack

Production source: `3ca2cef`. UI worktree:
`/home/venetanji/.codex/worktrees/phase2-ui/alive`.

Audio tracks use a separate waveform surface, including a WAV import state for
empty slots. Piano keys, notes, Preview and velocity controls are MIDI-only.
Audio has independent time/amplitude navigation, Fit sample, file metadata,
selection, Start/End markers and loop controls. Its view reserves an extra bar
so the sample end can be stretched without first zooming out.

Source BPM, beat length, half/double length and the lower sample-end handle use
the existing Re-Pitch engine. Speed and pitch change together. Source BPM remains
bounded to 30-240, with native duration/PCM/work limits unchanged. The WAV is
immutable; automation and every shared slot/placement region keep their sample
positions. Arrangement placement starts/durations remain fixed. Escape cancels
the drag. Native publication and history retain old PCM until retirement.

Devices is an internally scrolling instrument-to-effects rack. Each card has
its own manifest-bound controls, live readings, bypass and editor/actions.
Subtractive groups Envelope, Filter and Output. Effects have their own controls;
parameter and editor requests bind to the card's instance regardless of selection.
Browser insertion uses the card's X midpoint. Empty MIDI and audio racks retain
the correct controls after track insertion/removal.

Cached fields retain unfinished values across Session/Arrangement selection and
polling. File actions require parked drafts to be finished. Removed tracks and
replaced caches release their parked controls. The previous single-device
inspector and its unused responsive CSS are removed.

## Verification

| Check | Result | Receipt |
| --- | --- | --- |
| Alive JavaScript model/DOM | 144 passed on final source | `logs/node.log` |
| Affected Rust session tests | 106 passed | `logs/rust-session.log` |
| Combined Chromium chain/region run | 97 passed before review fixes | `logs/browser-combined.log` |
| Audio-specific Chromium cases | 11 passed after audio review fixes | `logs/browser-audio.log` |
| Reviewed Chromium cases | 44 passed | `logs/browser-reviewed.log` |
| Final rack/track-identity cases | 11 passed on final source | `logs/browser-identity.log` |
| Release packaging checks | 20 passed | `logs/release.log` |
| Separate Alive and Ultra builds | Passed | `logs/alive-build.log`, `logs/ultra-build.log` |
| Installed native device drag/save/audio | Passed, exit 0 | `reports/devices.json` |
| Installed native waveform/loop/stretch/history/save | Passed, exit 0 | `reports/regions.json` |

The audio-specific run includes repeated Enter and stale-source regressions.
The later 44-case run combines affected audio and rack/navigation/geometry
checks. The final 11 rack cases include stable selected-track identity after
same-index removal. The Rust suite
includes nonempty automation, multiple shared slots, unchanged Arrangement
spans and PCM ownership/rate assertions. Regressions were observed failing before
their fixes. HTTP request lines are omitted from retained browser logs.

Independent review found and verified corrections for floating-point full-sample
end bounds, stale audio-field events, repeated Enter edits, navigation commits,
detached-draft File guards, cache cleanup and selected-track identity. Its final
Chromium reproductions have no remaining findings.

Native journeys use actual Tauri/WebKit controls and XTest gestures on private
Xvfb/accessibility/software PipeWire sessions. The device journey starts from
the installed default empty workspace, loads Subtractive, appends Utility and
inserts Lowpass before it, then saves and captures nonzero audio. Executable,
mapped native library and saved device paths resolve inside the installation.
The region journey edits MIDI/audio loops while rolling, stretches 8 beats to
12, verifies captured stereo frequencies change from 330/550 Hz to
220/366.7 Hz, undoes the stretch, and saves/reopens the current session format.
Both end with zero stream errors and rejected commands. This qualifies software
audio; physical input/output and endurance were not tested here.

The first simultaneous final-path attempts collided while xvfb-run selected a
free display. The device drag screenshot captured the other journey's Quantized
MIDI window, and one display was then cleaned up by the other harness. Those
attempts are failed infrastructure runs, not acceptance evidence. The final
installed journeys run sequentially and both exit 0. No application change was
made in response to the display collision.

## Installation

`Alive (Test)` selects
`/home/venetanji/.local/share/alive/builds/3ca2cef/bin/alive`.
The package contains separate Alive/Ultra binaries, an adjacent frozen native
library and its own bundled resources. `reports/source-build-manifest.json`
records source and artifact hashes. Native library SHA256:
`69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90`.

Existing user windows and the concurrent native Ableton DLL worktree were
preserved. No cloud CI build was dispatched. Pitch-preserving Warp, recording
input routing/monitoring/arm and the shared silent-video engine remain roadmap
work.

## Reproduce

```sh
node --test apps/ultra/ui/alive*.test.mjs
python3 -m unittest discover -s apps/ultra/scripts -p test_release.py
cd apps/ultra/tests/ci
ALIVE_TEST_PORT=4390 ./node_modules/.bin/playwright test \
  --config playwright.config.mjs alive-chain.spec.mjs alive-clip-regions.spec.mjs
```

Run native journeys sequentially, using the installed executable:

```sh
ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_DEFAULT=1 \
  ULTRA_TEST_ALIVE_BINARY="$HOME/.local/share/alive/builds/3ca2cef/bin/alive" \
  ULTRA_TEST_ALIVE_SESSION="$PWD/apps/alive/examples/empty-workspaces.alive" \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_device_drop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-rack-check

ULTRA_TEST_ALIVE=1 \
  ULTRA_TEST_ALIVE_BINARY="$HOME/.local/share/alive/builds/3ca2cef/bin/alive" \
  ULTRA_TEST_ALIVE_SESSION="$PWD/apps/alive/examples/quantized-midi.alive" \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_regions_desktop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-waveform-check
```
