# Disappearing-Window Diagnostic Correction

Scoped test commit `0d9ccd6e82e01d9144d1ed1e3d255d01d16af2f9`, based on
`5981cfeeefc52f6dcb0e1ee536c0bd3ff9ec9e4b`. Independent re-review approves the diagnostic repair only.
Scoped Xlib error handling records unavailable windows and restores the previous
handler. Native regressions prove the original Replace input and missing-chooser
assertion still execute; unrelated subsequent native errors are not swallowed.
The original CI chooser cause remains unconfirmed.

The exact fatal review reproduction is RED before the correction and GREEN
after it. Native disappearing-hit/root checks, handler lifetime/delegation,
existing input helper, Python compilation and 11 frame/timing tests pass.
Original chooser/input timing and assertions remain intact.

The full original native journey **fails** after 161.98 seconds at the unchanged
changed-device-file status assertion. Earlier chooser, Save/reopen parameters,
history and missing-device checks pass. The final status says "Session state is
temporarily unavailable" instead of the expected actionable dependency error.
`chooser-ci-fix-1-report.md` distinguishes two source-supported masking paths
from the unknown exact native interleaving. The separate product repair must
preserve operation errors across final/background snapshot failures. No blind
rerun or weakened assertion substitutes for this failed run.

Parent verification checks all 120 artifact hashes, 12 committed-source/binary
pins and the complete capture: 4,204,544 finite stereo frames, 87.594667 capture
seconds at 48 kHz, peak 0.353354, identical channels. This is software
PipeWire/CPAL at 512 frames, not physical output, stereo separation or endurance.
Owned recorder cleanup is retained. The existing app binary predates native v4.

Full raw artifacts remain under `/tmp/alive-workspaces-chooser-ci-fix/fix-1`.
Initial investigation artifacts remain unchanged in the parent evidence record.
