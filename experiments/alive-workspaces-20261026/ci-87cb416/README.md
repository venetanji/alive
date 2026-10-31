# Exact Checkpoint CI: 87cb416

Run `40271664266` tests exact pushed source
`87cb416d0f22d6be65f72bc3c39dd5d3318dc087`. It finishes with failure:
UI/contracts and Chromium pass; native build, Rust, headless renders and the
complete original desktop journey pass. The desktop step runs from
05:07:13 to 05:11:40 UTC on 2026-10-26, 267 seconds under its original
five-minute deadline. This does not explain the earlier timeout failures.

The subsequent saved-clips/stream/measurement step fails at `Duplicate clip`.
`clips/missing-control.png` and its AT-SPI tree show Devices detail selected
after the hosted utility edit. Clip detail is available but unselected, so the
requested clip control is absent. The old-form navigation helper routes note
and automation controls to Clip but omits selected-clip controls. A narrow
navigation correction needs its own original-journey RED/GREEN evidence.
The original assertion is preserved. Editor-resource and CPAL gates are
skipped after this failure; this is not full native qualification.

`ci-run.json` retains exact job/step outcomes; `failed-step.log` retains the
traceback. `native/` retains the passing final report, operations, recorder
cleanup, native input events and three screenshots. `clips/` retains the failure
actions, errors, tree, screenshot and input events. Exact source attribution
comes from the GitHub run's head SHA; these input logs do not contain binary
hashes. The downloaded float recording
remains in `/tmp/alive-ci-87cb416-native/native-walkthrough.f32`; its independent
stream check is `parent-audio-check.json`: 6434816 finite stereo frames,
134.058667 capture seconds at 48 kHz, peak 0.353354245 and SHA256
`96189272e94e011d61ca419cb2849daddcf5e8a2c851834cb44e09f1ac5310a0`.
This is private software PipeWire/CPAL capture, not physical audio or proven
continuously playing time. It does not satisfy endurance.

Package run `40271664433` is recorded separately in `packages-run.json`.
At this snapshot Linux, Windows and ARM macOS succeed; Intel macOS is still
building. No later branch source is qualified by these runs. No publishing
operation is requested.

Reproduction uses the workflow at this commit. Read the native test commands
in `.github/workflows/ultra-ci.yml`; preserve their original assertions and
recorder bounds. The manifest covers the curated files, not the omitted raw
audio or full artifact archive.
