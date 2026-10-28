# Phase 2 Reliability Checkpoint

Application source: `b4b1a5c526830026321e3c3c02db24d7c9a76d3c`.
Task 3 candidate `5663956` is integrated as `9997589`; Task 4 candidate
`a2fdc98` is integrated as `b4b1a5c`. The independent reviews and selected
original worker receipts are retained here, with hashes in
`retained-evidence.json`. Candidate evidence and integrated evidence have
different source identities; neither qualifies later Master work.

## Accepted Changes

- Focused Ultra drafts survive reconstruction and participate in Save, Save As,
  close and Quit. Save checks every ready linked view before snapshot, retains
  its reservation through picker/write, reconciles missed release events and
  resumes Quit through the existing coordinator. Linux has a real Quit menu.
- A Save-only barrier permits held-device note-off while authoring is frozen.
  A genuine close barrier retains its bounded Stop fallback. This distinction
  has deterministic controller/IPC coverage; native rendered note-off timing
  is not claimed by these receipts.
- Repackaging validates and preserves an existing device manifest, including
  custom bindings, ranges, versions and presets. Existing effects can be
  renamed. Invalid bindings fail before controller mutation.
- The native instrument driver uses the actual Package device button label;
  the surrounding assertions remain unchanged.

## Evidence Boundaries

`root/build.json` records a fresh successful build and exact Alive, Ultra and
adjacent library hashes. The retained integrated logs record 572 passing
Node/component tests and eight focused Chromium checks.

The full pinned contracts command also exits 0 in 212.257s on `b4b1a5c`,
including the 572 UI/component tests, schema validation, recorded-reference
regressions and native C++ suites. `root/contracts.json` records its command,
terminal exit and log hash; the full output is in `root/contracts.log`. The
command's own generated arithmetic build receipt is retained separately and
the tracked file restored to its prior bytes.

Task 3's ten-case protocol matrix predates its final lifetime changes. Four
final-build native cases cover invalid peer refusal, OS close Save, real Quit
Cancel/Save/process exit and edits during Save As. The worker report retains
the earlier failures and their diagnoses. Mock delayed IPC is distinguished
from native focus-serialized editing.

Task 4's native save and separate reopen compare the complete custom manifest.
Alive then hosts that saved file twice with independent Tone values 1200/3400.
No hosted preset recall UI/API is implemented or claimed. The first host-driver
attempt failed because Devices detail was closed; both logs are retained.

All four complete combined native journeys exit 0 on the rebuilt source:

| Journey | Wall Seconds | Exit |
| --- | ---: | ---: |
| Alive Session and hosted editor | 197.710 | 0 |
| MIDI Arrangement, Save/Quit/restart | 118.157 | 0 |
| Ultra canvas and documents | 166.320 | 0 |
| Instrument authoring and performance | 139.502 | 0 |

`native/results.json` records exact commands, environment and log hashes;
`native/summary.json` records observed audio counters and limitations. Both
target viewport captures are retained for Session and Arrangement. The full
Ultra journey now passes the strict optional installed-slider fixture; no
licensed patch or converted graph is published.

Combined native qualification uses separate
private Xvfb displays and software PipeWire/CPAL at 48 kHz / 512 frames. These
are software-loopback observations. They do not establish physical audio,
hardware latency, final playing-time endurance or general Live/Max compatibility.
The instrument journey performs 18 edit cycles over 62.833 seconds. Independent
PCM verification finds 10,873,472 finite stereo frames across 26 local capture
files; their hashes are retained in `native/pcm-verification.json`, while PCM
stays local. Alive and instrument report zero stream errors. Sampled Arrangement
telemetry reports zero typed CPAL Xrun reports and render/budget failures. Its
one pre-restart rejected command is the deliberate refusal in the original
journey; the reopened final count is zero. Physical underruns and resource
growth are not qualified. Existing portal/a11y/Mesa warnings remain in logs.

The instrument driver's historical statement about absent Alive hosting
describes that driver's scope. The complete Alive and Arrangement journeys
exercise hosting separately; no whole-app absence is inferred from that text.

Earlier pushed commit `5b464e7` passes CI `40686059005` and all four package
targets in `40686058990`, with publication skipped. Those cloud results apply
to that earlier commit; the new pushed checkpoint requires its own CI.

## Reproduction

Build both binaries with `bash apps/alive/build.sh`. Run the existing native
journeys serially from the checkout root, using fresh output directories:

```sh
ULTRA_TEST_ALIVE=1 \
  ULTRA_TEST_ALIVE_BINARY="$PWD/apps/ultra/src-tauri/target/release/alive" \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-phase2-g0-session
ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCREEN_SIZE=1600x1000 \
  ULTRA_TEST_ALIVE_BINARY="$PWD/apps/ultra/src-tauri/target/release/alive" \
  ULTRA_TEST_ALIVE_SESSION="$PWD/apps/alive/examples/midi-arrangement.alive" \
  ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_arrangement.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-phase2-g0-arrangement
bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-phase2-g0-ultra
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_instrument_desktop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-phase2-g0-instrument
```

Private installed-help fixture outputs from the Ultra journey stay local.
Only original Alive/Ultra artifacts and derived result metadata are retained
here; no proprietary Live/Max assets or raw loopback PCM are copied.

## Resume Inputs

`proposals/` retains the existing Master contract draft and preflight reviews.
It is a proposal, not a frozen API or implemented capability. Resume contract
acceptance after G0, then saved ownership (Task 6), native proof (Task 7), UI
(Task 8) and the complete user-testable checkpoint (Task 9). Do not restart
accepted reliability tasks or skip the independent review gates.
