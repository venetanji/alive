# Alive Device Chain Integration, 2026-10-24

This directory distinguishes reviewed native chains from desktop integration.
It is not final expanded-application acceptance or the required 30-minute soak.

`ci-native-4209eef.json` retains all three passing CI jobs at that exact reviewed
native checkpoint. The desktop at that commit still used instrument-only
session-v1; these results do not qualify later Rust/session-v2 integration.
`packages-4209eef.json` records successful separate Alive/Ultra packages on all
four supported targets at the same checkpoint. Publishing was skipped. These
packages likewise precede the desktop chain integration.

## Task 8 Desktop Compatibility

The rebuilt, separate Alive release application passes the existing complete
native journey and eight editor close/reopen regression. This tests migration,
new instance authentication and preservation of the existing musical/file/editor
workflow. Chain controls and effect-editor walkthrough follow in Task 9; real
saved-effect audio is covered separately by Task 8's headless probe/report.

```sh
ULTRA_TEST_ALIVE=1 \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-task8-desktop
ULTRA_TEST_ALIVE=1 \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_editor_resources.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-task8-editor-resources
```

Both commands exit zero. `task8-compatibility/native-session-report.json` records
simultaneous separate Alive/Ultra windows, settings recovery, two loaded devices,
notes/automation/live mixer/base edits, editor destruction/reopen, save/reopen/
play, failed Open preserving playback, stopped removal, WM Close/Cancel and
Quit/Discard. Capture is finite/nonzero: 1,203,200 frames / 25.0667 seconds, peak
0.3726453483. Recorded stream errors, failures and rejected commands are zero.
Capture bytes remain in the temporary harness directory; the receipt retains
their hash and per-second peaks, including intentional stopped intervals.

Eight editor cycles retain one WebKit worker and the same three observed PIDs.
From first closed editor to final idle, PSS changes 450273 -> 486094 KiB and
descriptors 154 -> 153. This is bounded short-run evidence, not leak freedom.
The raw resource receipt and two actual native screenshots are retained beside
the journey report. Host: Ryzen 9 5900HS, Linux x86_64; private Xvfb/software
PipeWire `default_output`, 48 kHz stereo, requested/observed 512-frame buffer.
No physical audio/MIDI, independent underrun or endurance result is claimed.
