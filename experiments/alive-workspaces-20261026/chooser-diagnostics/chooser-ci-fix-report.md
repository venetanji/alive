# Chooser CI Investigation And Bounded Diagnostics

Status: DONE_WITH_CONCERNS. Final local verification complete; source/index frozen. Original CI40360213014 at 65eb486 first-Replace cause remains unconfirmed. The original local prefix passes, including the unchanged first chooser assertion. The controller explicitly narrowed this slice to failure diagnostics and the pre-existing helper wiring repair after the focused traces did not reproduce the failure; no product or speculative native-input repair is claimed.

Base: a0c34e3006dc920632ec95609ff6e280a70769dd. Branch feat/alive-session-host. Scoped test commit: 0bbad1814dcd8eb58b39be42517aed1466e8a8f2 (test(alive): retain native chooser failure evidence). Only five test files committed; index verified empty before staging and after commit. Parent owns PLAN/docs/PR/evidence curation. No native runtime, application, launcher, settings, release or push changes. No subagents.

## Causal Findings And Limits

Read chooser-ci-fix-brief.md, chooser-ci-diagnosis.md and retained exact-run failure log before testing. The prior diagnosis correctly distinguishes successful New/Discard's normal First Light/Modified/upgraded state from reset failure, and the secondary Audio details miss from the primary missing chooser.

1. baseline.py executes the exact current run() prefix through check_separate_apps, check_audio_settings, upgraded detection, New, Unsaved/Discard, main focus, .5-second wait and first original choose_file. It passes without temporary instrumentation. This is not a reproduction of the CI failure.
2. trace.py installs temporary DOM event observation before New and captures native root windows, target bounds and input calls. First Replace again passes: prepared target rect [164,501,129,25] is outside its scrolled viewport (not SHOWING); original focus scrolls to [164,414,129,25]; original queued native motion/press/release targets [228,426]. DOM receives pointerdown, mousedown, pointerup, mouseup and click on Replace Pulse device. The expected Load Ultra Device appears as viewable root window. Native target initially belongs to Alive, not a tooltip. The trace records the Session workspace scroll changing to 87 and the expected fresh title. These are success receipts, not proof of the missing CI event.
3. trace-forced.py made one native Editor-hover tooltip hypothesis test after focusing Replace. Its genuine-tooltip precondition fails because no covering tooltip appears. This is a failed reproduction setup, not an assertion RED for the CI defect, and it provides no basis to reuse the prior selector fix. Screenshot and native owner/path retained.
4. trace-minimal.py removes the explicit preparation and pre-click snapshot calls, records the actual original extents and input batch, and also passes with DOM click and chooser creation. It is still instrumented (inspector, extents-name query, owned-frame lookup), and cannot exclude timing-sensitive behavior.

No synthetic stale-rectangle replay, invented tooltip, DOM activation, hidden command, retry or wait extension is used. Focus-induced geometry change is observed, but stale geometry at the failing CI click is not demonstrated. The CI artifacts still cannot distinguish delivery, dispatch, precondition or native-presentation failure. Next exact-head CI is needed; a local pass must not be presented as CI regression resolution.

## Scoped Change

- check_canvas_desktop.click accepts an optional observer before its existing queued XTest motion/press/release and after flush. Every original state check, focus operation, rectangle read, input assertion, order and .15-second allowance is retained.
- alive_workspace_navigation routes only exact Replace ... device controls to that observer. It retains the original click path; it does not route replacement through the native-owner selection helper.
- check_alive_desktop records actual post-focus rectangle/point, native hit ancestry, native titles/PIDs/map states/window types before input, then records one accepted motion/press/release after the original XTest assertions and flush. This is native XTest acceptance, not proof of DOM activation. Native query depth is bounded by the existing 32-entry hit bound. The two normal replacement controls produce four small receipt rows. Observer query exceptions are recorded instead of changing input. Before-observation data is flushed with the queued receipt, avoiding a pre-input filesystem write.
- focus_chooser writes matching candidates and at most 128 final root-window records before raising its unchanged original assertion. The 80 polls, .1 sleeps, exact title and map_state==2 condition, native focus behavior, .2 success allowance and original choose_file .6 allowance are unchanged. Success chooser-focus.jsonl stays unchanged. Failure collection errors are reported without replacing the original assertion. The absent chooser scope remains unchanged; no unrelated outer failure-handler behavior is altered.
- check_alive_native_input uses the existing renamed force_covering_tooltip symbol. The old call raised AttributeError. Its native obstruction condition, restored chain/identity assertion, two slash-entry checks and Quit behavior are preserved.
- check_alive_chooser_diagnostics is a focused actual-native diagnostic regression: normal replacement must create the native chooser, receipts must identify Alive and the original geometry/input counts, then an intentionally absent chooser title must hit the original failure assertion and preserve candidate/root-window evidence.

Observational overhead: pre-input native queries can affect a race and therefore are disclosed. The final full journey measures approximately 0.633 ms for Pulse and 0.476 ms for Harmony pre-input observation locally; queued bookkeeping approximately .021/.019 ms. These fields exclude the subsequent receipt JSON write after flush. No claim is made that remote overhead is the same or that observation cannot mask a race.

## Verification

All native invocations use the unchanged check_canvas_desktop.sh private Xvfb/D-Bus/PipeWire harness and pinned release binaries. Complete raw evidence is /tmp/alive-workspaces-chooser-ci-fix. Each NAME below has NAME.log, NAME.exit and NAME/ artifacts unless explicitly stated otherwise.

Command form: ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCRIPT=SCRIPT bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-workspaces-chooser-ci-fix/NAME. Temporary trace runs additionally set WEBKIT_INSPECTOR_HTTP_SERVER=127.0.0.1:19229. No inspector is enabled for final diagnostic/helper/full runs.

- baseline: SCRIPT=/tmp/alive-workspaces-chooser-ci-fix/baseline.py; exit 0; exact original first-Replace prefix.
- trace: SCRIPT=/tmp/alive-workspaces-chooser-ci-fix/trace.py; exit 0; instrumented successful prefix.
- trace-forced: SCRIPT=/tmp/alive-workspaces-chooser-ci-fix/trace-forced.py; exit 1; no actual covering-tooltip precondition. Not a cause-confirming RED.
- trace-minimal: SCRIPT=/tmp/alive-workspaces-chooser-ci-fix/trace-minimal.py; exit 0; reduced-observation original prefix.
- helper-red: SCRIPT=$PWD/apps/ultra/tests/check_alive_native_input.py; exit 1 at stale force_reorder_tooltip AttributeError before repair.
- diagnostic-red: SCRIPT=/tmp/alive-workspaces-chooser-ci-fix/diagnostic-regression.py; exit 1 at missing actual native Replace receipt, after replacement succeeds. This RED tests diagnostic absence, not the original CI cause.
- diagnostic-green: same SCRIPT; exit 0; replacement receipts and unchanged real missing-chooser failure path.
- diagnostic-final: SCRIPT=$PWD/apps/ultra/tests/check_alive_chooser_diagnostics.py; exit 0 on final source; permanent focused diagnostic checks pass.
- helper-green: final helper launched concurrently with diagnostic-final; exit 1 after its private display/accessibility disappeared, missing Transport playing with an empty accessibility tree, xvfb-run reports its owned Xvfb PID no longer exists. No Python product assertion or Alive crash is established. The concurrent launch is a harness/environment failure; retained, not counted as a helper pass. Subsequent helper run must be serial.
- helper-final: SCRIPT=$PWD/apps/ultra/tests/check_alive_native_input.py; serial exit 0; original native covering-tooltip/reorder, exact saved chain identity/order restoration, two native filename entries and final Quit assertions all pass.
- full-original: SCRIPT=$PWD/apps/ultra/tests/check_alive_desktop.py; exit 0, wall 193.556636244 seconds. Exact command/environment/start/end/duration in full-original-run.json. This is the original entire journey with permanent observers only; no temporary inspector or diagnostic-driver substitutions.
- python3 -m py_compile over the five changed/new test modules: exit 0.
- python3 -m unittest discover -s apps/ultra/tests -p test_desktop_frames.py: exit 0, 1 test.
- python3 -m unittest discover -s apps/ultra/tests -p test_desktop_timing.py: exit 0, 10 tests.
- git diff --check: exit 0 before final verification.
- AST comparison against base proves run(), choose_file(), all original other Alive functions unchanged except focus_chooser's appended failure diagnostics; stripping the two observer branches and optional signature from generic click yields its identical original AST. No original journey action, assertion, exact saved value, capacity or timeout is weakened. assertion-and-pin-verification.json retains the function inventory.

## Build Attribution

baseline-pins.json records current source head and exact file hashes. All four Alive UI source hashes, Alive binary and adjacent native library match /tmp/alive-session-ui-revision-fix1-20261026/binary-source-pins.json and the earlier release-build report /tmp/alive-session-ui-revision-report.md. That report attributes the release build to UI fix ad47d2af2ed3422661a6d1e7984821bd57febbae. The current UI files and relevant desktop command code are unchanged from 65eb486; current native test-only MIDI suffix/Seek source is newer than this pinned library and is not exercised/qualified by this Session journey. This task verifies artifact identity and compatibility with the unchanged Session interaction, not independent reproducible-build provenance for that historical build.

Alive SHA256 f9ae9e6e2e33f9ffc875f4438ba5b8c641df16a1ecee923e3e884e8917d7640a.
Adjacent native library SHA256 9a43a0314e76061f4e1407d98d9e27944b96b4fe8b14f8f432540093bcd1dbb5.
Ultra SHA256 d5a568e2220f9a90536e90a92826e0d1d333eaffca744f83c1f1eb59a1c83c19.

No release app rebuild or launcher replacement was needed or performed. Physical output and endurance are outside this software-loopback journey. The final pushed commit needs its own remote CI result.

## Final Native Result And Freeze

Original journey body 184.144453093 seconds; full harness wall 193.556636244 seconds. Every original saved value and native action remains asserted: instrument cutoff 1333, Pulse gain .55, lowpass effect cutoff 2000, automation point 1200, effect instance identity, pending history, source refusal preserving session, independent editor lifetime, Save/reopen, canceled close/quit paths and final Quit Discard. Native timing reaches journey-complete. Both first replacement receipts show owned Alive hit ancestry and one accepted press/release with their original geometry. No temporary trace/inspector instrumentation was used in this final journey.

Final audio reports PipeWire default_output 48000 Hz / 512 frames, callbacks 2671, Audio failed false, stream errors 0, rejected commands 0, both tracks 3 active voices. Independent capture verification reads all 4,244,992 stereo frames (88.437333333 seconds), all finite, peak 0.35335424542427063, with **zero unequal stereo frames** throughout this capture. Thus this run does not demonstrate stereo separation. It is a software capture spanning the walkthrough's intentional stop/restart intervals, not continuous playback or endurance; ALIVE_ENDURANCE_SECONDS remains default 0. No physical audio claim.

Recorder supervision reports complete/requested_stop, wall 88.590040483 seconds, group 1922862 / recorder PID 1922865, returncode 1 for requested termination, 33,959,936 audio bytes and 0 stderr bytes. Independent /proc verification finds neither owned PID still present. See capture-cleanup-verification.json. The harness has exited and cleaned its owned private processes. Ordinary software-display and portal/Hyprland warnings remain in raw logs; no source change attempts to hide them.

Final-source-binary-pins.json and frozen-manifest.json pin the committed test bytes, unchanged release/UI artifacts and raw evidence. Source work is frozen, index empty; only parent-owned documentation/evidence remains dirty. The final report is authored here for parent curation and is not included in the scoped source commit. The controller should preserve the DONE_WITH_CONCERNS status and obtain/review the new exact-head remote run.
