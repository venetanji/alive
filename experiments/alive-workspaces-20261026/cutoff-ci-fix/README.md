# Native Effect Selection After Reopen

Source `cc7d5414cc987b5f8007391b1741bbc92c16ea2d`, baseline `6beb210`.
This fixes the demonstrated test input cause of CI `40308165402` failing the
effect-cutoff assertion after reopen. Product source and saved state are unchanged.

The saved effect cutoff was 2000, while the failed UI still selected the
instrument at 1333. Native hit ancestry identifies a `Devices detail` tooltip
over the selector; actual DOM tracing receives pointer motion but no button
events. Queued motion dismisses the tooltip after the button events target it.
The test now shares the existing bounded reorder input helper: stage motion,
verify the owned Alive native frame at the target, then send one press/release.
The original cutoff assertion remains, with a genuine covering-tooltip
precondition added to the full journey.

Evidence:

- `occlusion/pre-click-native-hit.json` and `dom-events-decoded.json`: native
  tooltip ownership and absent DOM button events.
- `tooltip/covering-selector-tooltip.png`: actual occluding native tooltip.
- `regression-red/` and `regression-green/`: same actual tooltip condition,
  failing then passing exact 2000 cutoff check.
- `full-green/`: original full native journey passes, including pending edits,
  editor lifecycle, save/reopen, source failure preservation, audio and Quit.
- `implementer-report.md`: commands, exits, diagnosis, failed diagnostic setups
  and exact scope. Temporary diagnostic FFI/protocol failures are retained and
  distinguished from app failures.
- `parent-verification.json`: independent verification of nine frozen raw hashes,
  ten source/binary pins, seven committed blobs and the finite audio capture.

Run the affected original journey from the repository root:

```sh
ULTRA_TEST_ALIVE=1 \
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" \
bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-cutoff-full
```

Measured journey entry-to-complete: 199.087435265 seconds, under its unchanged
eight-minute CI limit. Linux x86_64 Ryzen 9 5900HS, native WebKit/Tauri on private
Xvfb, private software PipeWire/CPAL, 48 kHz/512 frames. Final reported stream
errors and rejected commands are zero. Capture contains 4,576,768 stereo frames
(95.3493333333 seconds), peak 0.3533542454. This is neither proven continuous
playing time nor endurance, resource-growth or physical-underrun evidence.
Recorder return code 1 corresponds to supervised requested stop; its capture
is marked complete. Existing private-bus/portal/software-renderer messages
remain in logs. No new deadline or performance qualification is claimed.

The 36,614,144-byte raw float audio stays at
`/tmp/alive-cutoff-ci-fix-20261026/full-green/native-walkthrough.f32`; its SHA-256
is `448d7c60174d5d759adadc615bc134f25f5b7e531ef68066e28875d8f251b358`.
Committed JSON reports retain its length/hash and parent recomputation. Evidence
session files retain original temporary paths and need rebasing to replay.
`manifest.json` covers the curated immutable raw artifacts; this README and
independent review are separate interpretation. Remote exact-head CI remains
required. No Arrangement/WAV feature or acceptance follows from this test fix.
