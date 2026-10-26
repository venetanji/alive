# MIDI Workspace Desktop Integration

Source `4b9a88b721bba9728bb6b505e14cc4a14f7c8117`, based on `ad706ca`.
Independent review approves after queued slot field fix `ee83d30`. This slice
makes admitted MIDI v4 projects
usable through Session and the existing device/editor/mixer interface. It does
not implement timeline creation/editing or audio-file tracks.

Strict v4 persistence and source compilation feed the complete native candidate
validator. Only measured profile 1 is enabled; profile 2 remains refused. The
unchanged original template exceeds its event envelope (40/32) and remains
playable as v3 after refusal. The separately authored two-track/three-root
fixture contains a four-chord split-triad progression, cutoff/level automation
and a Utility gain lane. Conversion never trims user music to fit.

Two integration regressions were reproduced and fixed: queued source edits
following a slot rewired by Make Independent, and duplicate request serials
across v3/v4 transitions. The latter now uses the existing shared owner serial;
native scheduling, monotonic ingress and work limits are unchanged.

## Verification

- 252 Rust tests pass, with four existing ignores; 79 model/DOM/piano tests pass.
- All 20 Alive Chromium tests pass, with the two affected focus/navigation tests
  repeated after the source-identity correction.
- Complete native suites pass, retaining the 106661824-assertion envelope oracle,
  callback guards, old eight-track v3 capacity and original queued-edit Stop stress.
- The unchanged original v3 native desktop/editor/history/save/reopen/Quit journey
  passes on coherent adjacent Alive, Ultra and native library binaries.
- Final v4 native run3 first plays/stops v3, converts, edits note history and
  automation, plays both tracks, launches Pulse from Session, returns it, applies
  scoped Stop while Harmony continues, and returns again. A hosted cutoff base
  edit survives close/reopen while automation owns the effective value and
  playback continues. Save/Quit/process restart restores the exact document,
  note/automation/mixer/device values and resumed playback.

Final native screenshots: [1440x900](native-v4/run3-final/native-session-1440x900.png)
and [1280x800](native-v4/run3-final/native-session-1280x800.png). These show Session
with actual Arrangement authority; they are not timeline-editor screenshots.

Fix `ee83d30` closes the review's queued slot field overwrite: both delayed
rename/offset orders fail before correction and pass afterward. Four additional
tests guard deleted and rewired slots. All 85 affected UI tests and two focused
browser checks pass. `fix1/` retains commands and raw outputs;
`fix1/independent-review.md` approves the scoped correction. Broad native evidence
remains attributed to `4b9a88b`; the UI fix does not add a native timing claim.
Existing conflicting color-environment warnings remain in the raw browser log.

## Audio Evidence And Limits

Linux 7.2.8-10-omarchy, AMD Ryzen 9 5900HS, private Xvfb/WebKit and software
PipeWire/CPAL. Final observed epochs request and deliver 512 frames at 48 kHz,
stereo. The pre-Quit snapshot's four observed epochs report zero CPAL errors,
Xrun reports and callbacks over budget. Maximum observed duration is 1.55554 ms;
the active v4 epoch records 1690 samples and a 1.418462 ms maximum. The snapshot
is not a final measurement of every callback through process shutdown.

Parent independently verifies 747008 finite stereo capture frames (15.562667
seconds), peak 0.165784, and the recorded digest. Final reopened-app diagnostics
report zero audio errors, rejected commands and remaining voices after Stop.
This is a short workflow check, not endurance, physical-audio qualification or
a universal deadline guarantee. The separately required 1800-second replayable
playing run remains open.

Earlier provisional run2 passes its workflow but records one callback over
budget (13.340284 ms at a 10.666667 ms buffer budget), with zero reported CPAL
errors/Xruns. Heavy tests were concurrent; causation is unproven. That result
is retained alongside the final run. Run1's second raw-pointer Return activation
does not publish a new request; using the existing bounded owned-window input
helper passes later runs. No product cause is proved for that failed activation.

## Attribution And Reproduction

`qualified-source-pins.json` contains 29 source/test digests independently
matched to the committed blobs. `qualified-build-pins.json` pins the coherent
Alive/Ultra/native binaries and fixtures. Actual process mappings in the native
reports confirm the isolated adjacent library. The installed launcher remains
on its previously tested product.

`implementation-report.md` lists commands, tests and all retained failed
attempts. `logs/` retains original outputs, including the loader mismatch,
correct template/integral-parameter refusals, source-identity and serial REDs,
staged shipping-eligibility assertions and missing-Ultra companion setup failure.
`verification.json` records final exits. `retained-hashes.json` covers retained
inputs; the native-v4 manifest also inventories local raw captures not committed
here. Raw bytes and original warnings are preserved.

The final native driver and private-display wrapper are retained under
`native-v4/`. Its launch uses `ULTRA_TEST_ALIVE=1`, the coherent pinned
`ULTRA_TEST_ALIVE_BINARY`, admitted legacy `ULTRA_TEST_ALIVE_SESSION`, and
`ULTRA_TEST_SCRIPT` pointing to the driver. It performs actual UI input and
accessibility observation, with no injected native commands. Only fixture
device paths are normalized for the private copy; musical content is unchanged.
