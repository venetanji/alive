# File Error Preservation Report

Status: DONE. Source/index frozen at scoped commit
`447023039a93944410b60d94d286a453a177f288`
(`fix(alive): preserve file errors across snapshot failures`), based on
`0d9ccd6e82e01d9144d1ed1e3d255d01d16af2f9`. Only
`apps/ultra/ui/alive.mjs` and `apps/ultra/ui/alive-dom.test.mjs` are committed.
The index was empty before staging and after committing. Parent-owned dirty
planning documents and experiment trees remain intact. No push, launcher edit,
native/DSP edit, capacity change, v4 shipping activation, or subagent work.
Independent review precedes push; runtime measurement and Arrangement integration
remain subsequent work.

## Confirmed Cause And Ownership

The prior unchanged native journey failed its changed-source refusal assertion
with `Session state is temporarily unavailable`. That artifact alone does not
identify the asynchronous path that produced the final text. Both candidate
view-module mechanisms are now confirmed independently with controlled external
invoke results and the real mounted view:

- A rejected `alive_file` followed by a rejected final `alive_current` displays
  only the snapshot error on baseline because JavaScript's finally rejection
  replaces the primary rejection.
- A rejected file with a successful final snapshot first displays its dependency
  error; invoking the actual scheduled 80 ms poll callback with a rejected
  snapshot replaces that error on baseline. Subsequent healthy polling does not
  restore the primary error.

The correction gives explicit operation text and refresh-health text separate
storage while retaining the existing Session status paragraph, its accessible
name/live region, wrapping and error styling. A failed snapshot adds
`Refresh delayed: <original snapshot error>` alongside the operation result.
Recovery removes only this suffix. Timer and initialization refreshes remain
serialized through the existing queue but no longer write explicit operation
results through the queue's rejection handler. Async transport receipts update
the shared status only while a transport result owns it; they cannot replace a
later file refusal. Their existing detailed runtime/receipt views still render.

File operations capture their original rejection, attempt the ordinary final
authoritative read, reconcile available state, then propagate the original
rejection. A successful file command retains its success result when the final
read fails and discloses that failure separately. Rejected/canceled actions with
no accepted boundary preserve selection and mounted unfinished fields. Accepted
generation/draft boundaries still use the existing model validation and scope
invalidation, including inner Apply/Discard followed by outer file cancellation.
There is no retry of a file operation, fabricated snapshot or success, changed
authentication, or musical-state workaround.

## RED And GREEN

Evidence root: `/tmp/alive-workspaces-status-preservation`.

Added regressions before production changes. `view-red.log` records three
expected assertion failures: final-refresh masking, subsequent timer overwrite,
and successful-file result masking. The fourth case, ordinary refresh and later
explicit replacement, already passes on baseline. `view-red-final.log` repeats
the same three expected failures using final regression source against an
isolated baseline UI copy; no working-tree source was reverted.

The final mounted-view tests assert exact primary error text and visible refresh
health, continued real timer callbacks, healthy state/frame reconciliation,
retained draft, selected clip and note, preserved unfinished numeric field/node,
generation/draft arguments, and no extra file action or unrelated mutation.
Recovery also supplies a changed transport receipt to ensure it cannot overwrite
the file refusal. Successful-file recovery removes its health suffix and error
styling; a new explicit Save replaces the prior refusal.

Commands and results:

- `node --test --test-name-pattern='file refusal survives|successful file keeps|ordinary periodic refresh' apps/ultra/ui/alive-dom.test.mjs`: RED, 3 expected failures / 1 pass.
- Same command targeting `baseline/apps/ultra/ui/alive-dom.test.mjs`: final-source RED, 3 expected failures / 1 pass.
- `node --test apps/ultra/ui/alive-dom.test.mjs`: GREEN, 62/62 (`view-final.log`).
- `node --test apps/ultra/ui/*.test.mjs apps/ultra/ui/components/*.test.mjs`: final GREEN, 508/508 (`ui-final.log`).
- Existing sandboxed Chromium Playwright config, `alive-chain.spec.mjs`: 18/18 (`browser.log`, `browser/`, `browser-report/`).
- `bash apps/alive/build.sh`: exit 0 (`build.log`, `build.exit`); existing native/compiler warnings retained.
- `git diff --check` scoped to the two source/test files: exit 0 before commit.

The Impeccable detector reports only two existing unchanged piano-color
advisories, retained in `design-detector.json`; no styling/layout change is made.

## Native Integration And Provenance

Ran the entire original journey once after the successful build, with every
original assertion intact:

`ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_alive_desktop.py bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-workspaces-status-preservation/full-original`

Exit 0 in 193.112072452 seconds. `full-original-run.json` records the exact
command/environment and UTC/monotonic timing; `full-original.log` and
`full-original/` retain all original observations/captures. This passes both
native chooser replacements, reorder/tooltip input, parameter/history/editor
checks, save/reopen identities and exact retained values, missing-source and
changed-source refusals with playback retained, source restoration, accepted
inner Apply/outer Quit cancellation, native close guard, pending-draft Quit
cancellation, and final Discard/Quit exit. The prior failed journey remains
retained separately. A passing integration run does not establish a deterministic
native publication miss, nor choose between the two earlier masking paths.

`before-build-pins.json` records previous release assets, and `usable-launcher/`
retains the old coherent Alive/Ultra/library set unchanged. Successful rebuilding
uses the existing CMake/native plus locked Cargo path. The rebuilt library also
includes already approved MIDI2C native source; this Session journey does not
qualify that separate functionality. `after-build-pins.json` records tracked
frontend, Rust, native/core sources, build inputs/configs, original harnesses,
the exact scoped source diff, and resulting executable/library hashes. This is
source/build/run attribution, not an independent clean reproducible build.

| Artifact | SHA256 |
| --- | --- |
| release/alive | `ae23ba409de663921cce42ed01d66f27fd60fb007fffe126a77736067fa5d894` |
| release/ultra | `55f84830e64c1346b105e2a0628489728a2f62e0c17838b4929612b64a13fb96` |
| adjacent and build libultra_native.so | `1c579c6d63befb624166174c15a3235fa6fb71acab2e01f03aae124d7801b931` |

`native-process-attribution.json` verifies the actual journey process's `/proc`
executable hash and maps of that adjacent native library; `alive-ldd.txt` records
resolved dependencies. The successful coherent replacement remains usable at
the existing launch path; old backups are retained and were not restored.

## Capture, Cleanup And Preservation

The native report's software loopback contains 4,231,168 stereo frames / 88.149333
seconds at 48 kHz, all finite, peak 0.35335424542427063, SHA256
`e23fa53ac6ebe22f606569bf49e2119e0f5e06811ce0a135026a7a782191fe9c`.
Independent streaming verification matches its frames/hash/peak and observes
zero unequal stereo frames. Capture spans intentional Stop/restart intervals;
it does not establish stereo separation, continuous playback, physical output,
latency, endurance, or Arrangement behavior.

Recorder supervision is complete/requested_stop, group 1973181 / recorder
1973184, 33,849,344 audio bytes, zero stderr bytes. The expected requested-stop
recorder returncode is 1. `/proc` verification finds neither remaining capture
group members nor the main journey process (1968301). See
`capture-cleanup-verification.json`, including all final close/Quit flags and
unchanged old backup hashes.

`preservation-verification.json` verifies all 120 previous chooser fix-1 frozen
artifact entries remain identical and the original journey, desktop wrapper and
chooser-diagnostics regression are byte-identical to this task's pinned base.
`frozen-manifest.json` pins this report, final commit/source and evidence. No
additional native rerun or file-operation retry occurred. Source/index ownership
is returned for the parent's independent review and subsequent measurement gate.
