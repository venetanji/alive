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

## Task 9 Chain Interface

`efbeeb8` adds the selected-track chain, independent device selection,
metadata-generated parameters and automation targets, stopped structural
controls, live effect bypass and optional per-instance Ultra editors. The
implementation report is `.superpowers/sdd/PLAN/task-9-report.md`; independent
spec/quality review approved with no Critical/Important findings. These local
results still require this checkpoint's own CI/packages after push.

```sh
ULTRA_TEST_ALIVE=1 \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-task9-native-final
ULTRA_TEST_ALIVE=1 \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_editor_resources.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-task9-editor-resources
```

Both commands exit zero on the actual separate release Alive app. The retained
`task9-native/native-session-report.json` and `operations.json` cover Pulse's
instrument -> Utility -> Lowpass chain, Harmony's independent same-source
Utility, reorder preserving instance IDs/lanes, distinct bases, live bypass,
original/effect cutoff ownership, pending versus prepared automation, actual
effect-editor destruction/reopen, Save/reopen/play and prospective source errors.
Existing separate-app/audio-settings, stopped removal, WM Close, pending-edit
Quit Cancel and Quit Discard regressions remain in the same complete journey.

Software capture is finite/nonzero: 1,830,912 frames / 38.144 seconds, peak
0.3533542454, SHA-256
`0422d9d4d02a890cbf3a1e11de5a65c9318118393540e79f92f3d5a2ee02c280`.
The capture includes intentional stopped intervals and equal left/right output;
it does not establish channel separation. Final observation is PipeWire
`default_output`, 48 kHz, observed 512 frames, zero reported errors/failures/
rejections and playing true. Hardware is the Ryzen 9 5900HS/Linux host above.

The resource receipt records eight instrument-editor cycles plus 25 seconds
idle: the same three PIDs, one WebKit worker, first-close -> final-idle PSS
450586 -> 486392 KiB and descriptors 154 -> 153. This short bounded evidence
does not establish leak freedom. Exact DSP sample/order/warm-state guarantees
come from the separately tested native/headless chain gates, not these pixels.
There is no new endurance, physical-audio/MIDI or independent underrun claim.

Focused tests pass 18/18; the two actual Chromium chain/minimum-desktop cases
pass; shared Rust is 171 passed/two existing ignored, Alive context one passed,
and the full pinned contracts gate passes with 454 primary Node tests. Existing
unused-helper/Node warnings remain disclosed. Earlier unsuccessful GTK chooser
driver attempts and the corrected loop-generation assumption are explicitly
listed in the implementation report; none is counted as a passing journey.
The parent inspected the retained chain, automation and effect-editor captures
without another screenshot or visual-polish pass.
