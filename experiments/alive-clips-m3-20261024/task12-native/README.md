# Saved Clips In The Native Alive Application

Task 12 integrates strict `alive-session-v3`, four clip slots per track,
independent score duplication, focused undo, saved defaults, quantized individual
launch/Stop and native receipt feedback. Selection, draft, prepared identity,
cue and runtime state remain distinct. The supported profile stays two tracks,
six devices and eight clips. Eight-track admission, scenes and the final
1800-playing-second soak remain separate acceptance gates.

Source checkpoint `ecfed29fcaa4306568fe5041a962187da7296bfb` was independently
reviewed. Two Important presentation findings were reproduced and corrected in
`93879f5`; scoped re-review approves both with no new breakage. The separate
`813ba7645491346a7b87e419033f3d3e8825ddb4` adds only Tauri CLI verbosity for the
unresolved Intel DMG failure, not a packaging workaround. Reports are retained
as `implementation-report.md`, `initial-review.md` and `fix-review.md`.

## Evidence Attribution

| Directory | Source and result |
| --- | --- |
| `clips/` | Exact `ecfed29` release clip journey and build provenance. |
| `clips-receipts-final/` | Exact rebuilt `813ba76` clip journey after the UI correction. Parent verified 302 committed/current source hashes and eight build/harness artifacts; see `qualification.json`. |
| `retained-ecfed29/` | Full retained native chain/piano/automation/file/Quit/history journey before the UI correction; all six file/Quit/history flags pass. |
| `editor-resources-ecfed29/` | Eight native editor open/edit/close cycles, source/build association inherited from the exact `ecfed29` build. |
| `checks/` | Twenty-seven original, failing-regression, corrected and final check logs, with hashes in `manifest.json`. |

The actual clip journey verifies stopped defaults/cues, queued to pending to
applied switching, track-local Stop while the other track continues, independent
editor lifetime, Save As/reopen and strict shared-source recovery. Both failed
selected Replace attempts preserve an existing editor and playback; recovery
requires a preserved changed copy and matching original backup, then explicit
per-instance Replace. Generated `.alive` fixtures contain temporary harness
paths and are evidence, not portable examples. Use the bundled example to play.

The final clip capture has 318976 finite stereo frames (6.645333 seconds), peak
0.2225944548845291, SHA-256
`1632fa19f6b3496baf2cb9d4acadaf8b1ec13723c0d57e5200c4fde6ce57db10`.
The full `ecfed29` journey has 2853376 finite frames (59.445333 seconds), peak
0.35335424542427063, SHA-256
`15c526f3fbd5af5103c8b6d1b6c0856caa2a14bc015f8dcb95c8bd5482366219`.
The parent independently streamed the PCM for finiteness, peak and hash. Raw PCM
remains in the temporary paths recorded in qualification JSON; it is not retained
in git and may disappear. Non-PCM logs, receipts, fixtures and screenshots are
retained with hashes.

The original Rust gate reports 187 passes and two existing ignores. Final UI
reports 491 passes, Chromium five and release-wrapper tests seventeen. Commands,
exit results and exact log paths are in the implementation report. The first
native failure is preserved separately in `../task12-first-failure/`; its length
error/readback defects were corrected before the passing source checkpoints.
UI request-pressure feedback is covered by focused DOM regressions plus the
existing native scheduler tests; the desktop run does not inject those pressure
cases into the real UI.

## Scope And Limitations

Native runs use AMD Ryzen 9 5900HS, Linux, private Xvfb and software PipeWire,
48 kHz stereo, requested/observed 512-frame callbacks. This is software-loopback
evidence, not physical output/MIDI qualification. Native AOT Faust remains
alongside Clockwork; existing zero native alignment and excluded legacy Voice's
64-frame latency are unchanged.

Polled zero error values are not cumulative or complete per-epoch totals: the
current driver resets metrics on Stop. The raw full report's statement that
underruns are universally unavailable in CPAL is inaccurate: pinned CPAL supports
typed Xrun while the current UI aggregates stream errors. Neither proves physical
underrun absence. Task 13a supplies typed retained stream epochs and bounded
measurement before capacity/endurance qualification.

Eight editor cycles observe one WebKit worker/three PIDs, fds 154 to 153 and PSS
458055 to 505788 KiB. These short samples show growth and do not prove leak
freedom. Existing `reserve_native`, software-display/MESA and outer portal/
Wayland warnings remain visible. Exact new pushed-head CI and all-platform
package results are pending; earlier `fdcdd1b` green CI and three passing package
targets qualify only that earlier checkpoint. Intel packaging remains unresolved.

## Reproduce

From the repository root:

```sh
bash apps/alive/build.sh
bash apps/alive/run.sh apps/alive/examples/two-instruments.alive
python3 apps/ultra/tests/check_alive_clips.py --help
python3 apps/ultra/tests/check_alive_desktop.py --help
bash apps/ultra/tests/ci/check-native.sh
```

The native harnesses arrange private display/audio services and need their
documented Linux dependencies. Use the implementation report's exact invocations
and arguments to reproduce a named journey. Alive is the separate executable
`apps/ultra/src-tauri/target/release/alive`; the shared target-directory name does
not launch Ultra. Screenshots `clips-receipts-final/clips-stopped-saved.png` and
`clips-receipts-final/clips-recovered.png` show the accepted clip interface.
