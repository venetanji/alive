# Clip Navigation Correction And Next Failure

Source: `729dc9a555a389130304fe52b081bae351f814da`, based on `cb079f2`.
Only the existing workspace navigation helper changes: selected-clip controls
now select the visible Clip detail before acting. Original journeys, musical
actions, assertions, waits, resource limits, product source and binaries remain
unchanged. This does not satisfy the full original journey's GREEN gate.

The actual original observability journey first exits 1 at `Duplicate clip`,
matching CI: Devices detail is open and the clip control is hidden. With the
helper correction, one complete original run is attempted and passes editing,
Undo/Redo, invalid truncation rejection, create/delete, saved default, Apply,
editor lifetime and prepared Save assertions through `check_alive_clips.py:102`.
It then exits 1 at the unchanged stopped-launch assertion on line 103:
expected `Cued Clip 1 /` plus `applied`, observed `Cued Clip 1 copy`.
The folder named `green/` is the attempted run's original name, not a pass.

Original input evidence records one press/release targeting Launch Pulse
Clip 1 at [555,159,49,24], with the Alive native frame in the hit path.
The screenshot confirms focus and the unchanged cue. This proves targeting,
not DOM activation, native request submission or receipt application. The
failure path did not persist raw runtime receipts or Session status, so its
cause remains unproved. `distinct-failure-isolation.json` records this boundary
and the narrow next diagnostic need. No retry or weakened assertion follows.

`red-command.json` and `green-command.json` retain exact commands/exits.
`implementation-report.md`, `verification.json` and the separate raw logs
record scope and results. Parent verifies 95 unchanged/expected input hashes,
the committed helper blob and all 62 entries in the worker's raw evidence
manifest. Actual `/proc` mappings identify the pinned release Alive and its
adjacent native library, rather than the development build. The independent
review is retained separately.

Tests use private Xvfb/software PipeWire/CPAL on Linux/AMD Ryzen 9 5900HS,
48 kHz stereo and requested/observed 512 frames. The run fails before recording
starts and has no successful final observability report or Quit result.
Partial resource/epoch logs, zero reported errors/rejections in the screenshot
and an empty sampler-error list do not qualify the full journey, physical
audio, resource stability or endurance. No production v4 capability changes.

Raw evidence stays in `/tmp/alive-workspaces-clip-navigation`; only selected
logs, screenshots, reports, prepared session and provenance are curated here.
The worker's `evidence-sha256.json` covers the original raw directory, including
omitted files. This directory's `manifest.json` covers its own curated files.
