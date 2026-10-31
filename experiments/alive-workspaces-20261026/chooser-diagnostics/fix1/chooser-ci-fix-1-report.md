# Chooser Diagnostic Review Fix 1

Status: DONE_WITH_CONCERNS. Confirmed P2 diagnostic repair verified; source/index frozen. The final original full journey has a separately preserved changed-source status failure, so this round does not claim a complete native acceptance pass. This round fixes the confirmed P2 diagnostic defect from chooser-ci-fix-review.md: Xlib protocol errors from disappearing windows could terminate observation outside Python exception handling. The original 65eb486 CI missing-chooser cause remains unconfirmed; no product or original input-path repair is claimed.

Base: 5981cfeeefc52f6dcb0e1ee536c0bd3ff9ec9e4b. Branch feat/alive-session-host. Scoped commit: 0d9ccd6e82e01d9144d1ed1e3d255d01d16af2f9 (test(alive): contain disappearing diagnostic windows). Only apps/ultra/tests/check_alive_desktop.py and apps/ultra/tests/check_alive_chooser_diagnostics.py are committed. Index verified empty before staging and after commit. No native runtime, app rebuild, launcher, settings, release, push or subagent work. Parent-owned docs/evidence are excluded from the scoped source commit.

## Confirmed Cause And Correction

The exact review reproduction was extracted into fix-1/review-repro.py and executed unchanged against the baseline with `xvfb-run -a python3 /tmp/alive-workspaces-chooser-ci-fix/fix-1/review-repro.py`. It exits 1 with `BadWindow`, opcode 20 / X_GetProperty, before the observer or its outer Python exception handler returns. This establishes an Xlib protocol-error boundary, not a Python exception and not the original CI failure cause.

The scoped native_observation_errors context locks the existing diagnostic X connection and synchronizes outstanding requests **before** replacing its error handler. Therefore errors queued by an earlier operation retain their original handler. It records at most 16 protocol-error receipts only for the locked connection's requests starting at the captured request serial. Errors on another connection, or earlier serials, delegate to the previous native handler. The callback and previous-handler callable remain live through the exit XSync, which delivers asynchronous diagnostic errors before a finally block restores the original handler pointer; the display lock is then released. Both normal and Python-exception exits use that restoration.

native_window_record runs its existing bounded name, attributes and property queries inside this scope. A vanished or otherwise unavailable window retains its exact ID and error receipt, is marked unavailable, and cannot fabricate ownership: map_state becomes null and pid/type arrays are empty. Partial title text, if already observed, may remain as diagnostic context. The pre-input hit-path traversal also receives a scoped trap because a child can disappear while traversal is in progress. Its error list is attached before traversal so a failed traversal still leaves error evidence when the existing Python observation guard catches the failure.

The original generic native click and adapter are byte-identical to base. run(), choose_file(), focus_chooser(), all original chooser polls/title/map-state checks, input order/assertions and saved-value assertions have identical ASTs. No retry, focus change, coordinate substitution, DOM activation, larger wait or weaker assertion is introduced. Only the two existing observational functions change, plus the scoped error types/context and the focused regression.

This does not globally make all historical Xlib calls best effort. Original chooser scanning and ownership helpers retain their existing behavior. The trap is scoped to the newly added observation work and does not suppress unrelated subsequent native errors.

## Native Regression Evidence

The permanent check_alive_chooser_diagnostics.py first proves a normal Replace creates the real chooser and records the actual owned Alive target plus one native motion/press/release. It then performs these independent checks:

1. Create and map a genuine 4x4 native overlay at the target point, obtain the actual native hit path and assert that it contains that window, destroy/synchronize the window, and return the captured path to the observer. The stale record must identify unavailable/BadWindow. The original queued Replace click still opens its native chooser and original choose_file completes, with one accepted press/release.
2. Create an owned root candidate and leave it alive throughout the unchanged 80 chooser polls. Destroy/synchronize it precisely when failure collection begins querying that captured ID. The process survives, failure JSON retains its unavailable/BadWindow record plus the ordinary owned Alive frame, and the unchanged original `Native chooser did not become viewable: Diagnostic absent chooser` assertion still occurs.
3. Install a test-local previous handler, queue a real asynchronous BadWindow before entering observation, and verify it reaches that handler. Verify a diagnostic BadWindow is recorded inside the scope; a subsequent error reaches the previous handler; an error on a separate X connection also delegates while observation is active; a Python exception exits the context and preserves the same handler for the next error. The installed-handler pointer is checked and restored in finally.

The two full-harness RED tests fail at the missing `unavailable` receipt on baseline code (native-red.log and root-red.log). In that harness, the existing toolkit error-handler state allowed the stale query to return instead of terminating, but the required error evidence was absent. This is distinct from the exact default-handler review RED, which does terminate. Both forms are retained; neither is misrepresented as the original CI symptom.

The exact review check was rerun with only extraction dependencies updated for the new context/type definitions: review-repro-green.py exits 0 and its observer returns explicit unavailable/BadWindow evidence. default-handler-repro.py then issues an unrelated BadWindow after that successful observer. The restored default handler terminates the child with expected exit 1 after its explicit EXPECT marker. This proves the fix does not globally swallow subsequent native errors.

## Commands And Outcomes

All evidence for this round is under /tmp/alive-workspaces-chooser-ci-fix/fix-1. Initial parent-directory artifacts, manifest and report are unchanged; all 224 original artifact hashes and original report hash were reverified in preservation-verification.json.

For actual Alive tests the exact command form is:

`ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCRIPT=SCRIPT bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-workspaces-chooser-ci-fix/fix-1/NAME`

Every NAME has retained .log and .exit files. helper-final and full-original also have -run.json with exact command/environment, UTC start/end and monotonic duration. Runs are serial, avoiding the initial round's concurrent private-display conflict.

- review-red: `xvfb-run -a python3 .../fix-1/review-repro.py`; exit 1, fatal BadWindow before Python recovery.
- native-red: SCRIPT=$PWD/apps/ultra/tests/check_alive_chooser_diagnostics.py; exit 1, missing unavailable evidence after genuine hit-window destruction. Exact RED regression source retained as native-regression-red-source.py.
- root-red: SCRIPT=/tmp/alive-workspaces-chooser-ci-fix/fix-1/root-repro.py; exit 1, missing unavailable evidence after root-candidate destruction.
- review-green: `xvfb-run -a python3 .../fix-1/review-repro-green.py`; exit 0; observer survives with BadWindow receipt.
- native-green: SCRIPT=$PWD/apps/ultra/tests/check_alive_chooser_diagnostics.py; exit 0; normal owned receipts, destroyed hit/root cases and handler restoration/delegation all pass on final source.
- default-handler: `xvfb-run -a python3 .../fix-1/default-handler-repro.py`; expected child exit 1 after successful observation and EXPECT marker; later unrelated error is still fatal.
- helper-final: SCRIPT=$PWD/apps/ultra/tests/check_alive_native_input.py; exit 0; genuine covering tooltip, one reorder click, exact saved chain/identity restoration, two filename entries and Quit pass.
- full-original: SCRIPT=$PWD/apps/ultra/tests/check_alive_desktop.py; exit 1 after 161.976979084 seconds at the unchanged changed-source refusal status assertion; no temporary inspector/injection. Preserved and not blindly rerun. See the separate failure analysis below.
- `python3 -m py_compile apps/ultra/tests/check_alive_desktop.py apps/ultra/tests/check_alive_chooser_diagnostics.py`: exit 0.
- `python3 -m unittest discover -s apps/ultra/tests -p test_desktop_frames.py`: exit 0, 1 test.
- `python3 -m unittest discover -s apps/ultra/tests -p test_desktop_timing.py`: exit 0, 10 tests.
- `git diff --check` scoped to the two changed tests: exit 0.

## Synchronization And Attribution

Each observation scope adds one XSync before installing and one XSync before restoring the handler. A normal root/main hit path uses three scopes (traversal and two window records), thus six synchronization round trips. Window traversal remains bounded at 32, property reads at 16 values, failure root collection at 128 windows, and each error list at 16 receipts. Existing observation_seconds measures the complete pre-input observation, including these extra round trips; post-flush JSON writing remains outside that field. Remote timing can differ, and instrumentation can influence a race. Final-run measured values are recorded separately below.

baseline-pins.json records exact 5981cfe test/binary hashes. Alive executable SHA256 f9ae9e6e2e33f9ffc875f4438ba5b8c641df16a1ecee923e3e884e8917d7640a and adjacent native library SHA256 9a43a0314e76061f4e1407d98d9e27944b96b4fe8b14f8f432540093bcd1dbb5 match the initial round and earlier build attribution. The prior build report attributes the compatible unchanged UI to ad47d2af2ed3422661a6d1e7984821bd57febbae. The pinned library predates the current test-only MIDI song-loop source, which this Session journey does not qualify. No app rebuild or independent historical reproducible-build claim is made.

The final pushed commit still needs its own remote CI result. This round closes the demonstrated disappearing-window diagnostic defect; it does not close the unconfirmed original first-Replace CI investigation.

## Final Original Journey Failure And Narrow Follow-Up

The final original run passed the initial Replace choosers, actual native effect reorder/tooltip checks, live note/history editing, editor close/reopen behavior, Save/reopen identity, instrument cutoff 1333 / Pulse gain .55 / effect cutoff 2000 / automation 1200, and the missing-source refusal preserving playback. It then failed check_alive_desktop.py:932 at the unchanged `wait_value('Session status', lambda s: 'Replace' in s and 'journey-utility' in s)`. Actual final text is `Session state is temporarily unavailable`. Later changed-source playback checks, source restoration, final reporting and close/Quit obligations were not reached and are not claimed as passing for this round.

The artifact's private journey-utility.ultra has first-node x=76 versus the original x=75, confirming the intended dependency mutation occurred. The final accessibility tree reports Transport playing true, Audio output running, stream errors 0 and rejected commands 0. Both earlier replacement observers report owned Alive ancestry, no native protocol errors and exactly one queued press/release. Their pre-input observation times are 0.942298 ms and 0.734266 ms. These observed facts do not prove which asynchronous command/poll produced the final status, or that a correct dependency message was ever visible.

Read-only source analysis identifies two distinct candidates, neither changed in this slice:

- `alive.mjs` file() invokes `alive_file` in try and awaits `alive_current` in finally (lines 79-82). If the file operation rejects with the dependency error and the finally refresh rejects with a snapshot-unavailable error, JavaScript replaces the primary rejection with the finally rejection before enqueue's notice handler sees it.
- `alive.mjs` enqueue() routes any rejected work to `notice(error,true)` (line 13); periodic poll() enqueues refresh() every 80 ms (line 436). A later failed poll can overwrite an already displayed dependency notice, while successful refresh() renders model state without restoring the earlier notice.

The exact temporary-state string originates from runtime.rs:54 when alive_session_state_v3 returns 0; it can also be emitted by other native-state reads. desktop.rs alive_file open resolves/read-validates prospective dependencies before the later native-state/install paths. prepare.rs fingerprint mismatch guidance names the changed path and Replace. This makes error masking/poll overwrite credible mechanisms, but the native failure artifacts contain no per-invoke return/notice trace and do not distinguish them. No missing-chooser, diagnostic trap failure, app panic or original input failure is established here.

Narrow next action, assigned separately by the controller: add deterministic view tests where the real file workflow receives an `alive_file` dependency rejection followed by a rejected `alive_current` in finally, and another where a dependency notice is followed by a rejected periodic refresh. Verify the primary actionable error remains visible without disabling polling or hiding state-read failures, then inspect native invoke/notice ordering if needed and rerun the unchanged original journey after the separately reviewed correction. No such product change or weakened assertion is included here.

## Capture, Preservation And Handoff

Failure cleanup retained complete/requested_stop recorder supervision: group 1959659 / recorder PID 1959662, returncode 1 for requested termination, 87.753085036 wall seconds, 33,636,352 audio bytes, zero stderr bytes. Independent /proc checks find neither owned process remaining. Full capture verification reads 4,204,544 stereo frames / 87.594666667 seconds at 48 kHz, all finite, peak .35335424542427063, with zero unequal stereo frames. This is software loopback across walkthrough stop/restart intervals; no stereo-separation, continuous-playback, endurance or physical-output claim is made. See capture-cleanup-verification.json.

The original full run's failure log/tree/screenshots, capture and exact command/timing remain in fix-1/full-original and its sibling files. The initial investigation's 224 artifacts, manifest and report remain byte-identical. No source file, application or launcher outside the two scoped tests was edited for this fix. The initial complete native pass remains historical evidence only; it is not substituted for this round's failed final run.

Final-source-binary-pins.json pins the corrected source, unchanged harness/helper and pinned release artifacts. frozen-manifest.json pins this round's evidence and final report. Parent may proceed with the independent native measurement writer and scoped read-only review; this writer is frozen and index empty. The confirmed disappearing-window diagnostic defect is corrected, while full original native acceptance and the original exact-head CI cause remain outstanding.
