# Native cutoff CI assertion: frozen implementer report

Status: COMPLETE for first-priority local diagnosis/fix/original-native-journey gate. Independent parent review and any remote CI rerun remain parent-owned. No remote CI pass is claimed.

Commit: cc7d541 (test(alive): wait for owned device selector input), on feat/alive-session-host, parent baseline 6beb2102da43a75f228cc63aaa545c0a58701f47. Only apps/ultra/tests/alive_workspace_navigation.py and apps/ultra/tests/check_alive_desktop.py committed. Product source/UI/native library unchanged. No push, merge, release or deployment. Index verified empty after scoped commit. Parent-owned PLAN.md, apps/alive/README.md and apps/ultra/ui/README.md remain unstaged (parent may add its coverage file independently).

Evidence root: /tmp/alive-cutoff-ci-fix-20261026. Initial downloaded CI evidence retained at /tmp/alive-ci-40308165402-desktop and /tmp/alive-ci-40308165402-failed.log. No original artifact was modified.

## Demonstrated cause

The failing CI journey saved the effect cutoff at 2000, the instrument cutoff at 1333, and the same effect instance identity. The initial artifact's native failure state still displayed Subtractive/1333. A private-copy rebase of every instrument/effect dependency path admitted the saved document in the actual release app; only the paths were changed, not parameters/identities/fingerprints. Native admission validates the canonical-JSON source fingerprints (these are not raw file SHA256 values).

The smallest failing actual-native sequence was: reopen this saved session with the existing native chooser, read Note 13 pitch/beat, Start transport, read Cutoff base 1333 and Pulse gain .55, then focus/move/click the exact Select Pulse Stereo Lowpass effect 2 accessible control using the original XTest sequence. The value remained1333 across all recorded later observations and the selector was focused but not pressed. Skipping accessibility focus also failed. Merely XSync-ing after motion also failed. These eliminate a simple saved-value corruption or rectangle-settling explanation.

The original helper queues pointer motion, button press and release together, then flushes. Direct native hit testing BEFORE those events demonstrated that the selector center [248,581] was owned by a native tooltip window, not the owned Alive main window. For example, occlusion/pre-click-native-hit.json records selector rect [168,569,160,25], Alive owner 4194307, hit path [927,4197537]; window 4197537 has _NET_WM_WINDOW_TYPE_TOOLTIP atom 270. After the failed click, the tooltip had disappeared and the same coordinate hit owned window 4194307.

The transient loopback WebKit inspector captured actual page events without changing product source. occlusion/dom-events.json is the original protocol response; occlusion/dom-events-decoded.json is its decoded payload. It records focusin and pointermove on the exact Lowpass selector; no pointerdown/up, mousedown/up or click reached the page. The instrument remains aria-pressed=true and Lowpass false. tooltip/covering-selector-tooltip.png visibly shows the native 'Devices detail' tooltip covering the Lowpass selector. The events-3 and tooltip directories preserve independent equivalent traces. This is a native test input occlusion failure: pointer motion dismisses the tooltip, while button events queued with that motion were targeted at the tooltip and do not activate the page control.

An untouched full original journey was also run before edits. It failed earlier at the analogous Harmony utility selection: Gain base absent, Subtractive displayed. The exact earlier failure is retained in full-baseline.log and full-baseline/missing-control.json. It is consistent with the same selector-input defect; the complete corrected journey passes this location.

## Scoped correction and regression

The already working reorder_click algorithm stages pointer motion and checks native window ancestry before sending exactly one press/release. It is now shared as native_control_click(name,kind), with reorder_click retaining its existing signature/behavior. Exact Select ... instrument / effectN names in the navigation adapter route to this same owned-input helper. Tab navigation, other actions and text input keep their existing path. The exact same selector accessible control still receives actual XTest mouse input.

The existing 2-second availability/ownership bound, .01-second polling, enabled/showing/sensitive requirements, rectangle checks, owned-frame PID check and release finally remain. Device selection preserves the original .15-second post-click allowance; no blind retries, longer waits or replacement selection operation were added. Failed ownership sends zero button events and retains diagnostics. Receipt labels distinguish reorder from device selection.

A regression in the original save/reopen block explicitly hovers Devices detail until a genuine native tooltip covers the Lowpass selector. It requires tooltip window type and absence of the owned frame from the hit ancestry. Then the original ui.click and exact float(value('Cutoff base')) ==2000 remain. The existing reorder tooltip regression remains in place. A focused pre-fix run with the same forced tooltip condition failed the original 2000 assertion; post-fix it passed. Both capture the actual native app and real software audio.

## Validation commands and exits

All commands ran from /home/venetanji/.codex/worktrees/edd5/alive. Native invocations used the repository's existing apps/ultra/tests/check_canvas_desktop.sh unchanged: owned Xvfb 1280x840, separate D-Bus/accessibility registry, private XDG runtime/config/state and private software-only CPAL PipeWire 48000/512. No original Wine, user desktop/input/audio session, permanent settings, credentials, personal projects or Tailscale state was used.

1. Baseline original full journey, exit 1:
   ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_alive_desktop.py bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-cutoff-ci-fix-20261026/full-baseline
   Raw stdout/stderr: full-baseline.log. Failure at live_chain's original Gain base .85 assertion because Harmony utility selector was missed. Complete failure tree/screenshots retained.

2. Focused forced-tooltip RED, exit 1:
   ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_SESSION=/tmp/alive-cutoff-ci-fix-20261026/rebased.alive ULTRA_TEST_SCRIPT=/tmp/alive-cutoff-ci-fix-20261026/regression.py bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-cutoff-ci-fix-20261026/regression-red
   Raw: regression-red.log, regression-red/native-inputs.json, regression-red/reorder-covering-tooltip.png and selector.json. Genuine covering tooltip precondition passed; original selector click left 1333 and the exact 2000 assertion failed.

3. Focused same-condition GREEN, exit 0:
   ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_SESSION=/tmp/alive-cutoff-ci-fix-20261026/rebased.alive ULTRA_TEST_SCRIPT=/tmp/alive-cutoff-ci-fix-20261026/regression-green.py bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-cutoff-ci-fix-20261026/regression-green
   Raw: regression-green.log and regression-green/. Receipt proves tooltip path [927,4197468] changes to owned [927,4194307], unchanged rect, one press, one release. Result cutoff 2000. Separate green driver only adapts renamed force helper; the asserted behavior is identical to RED.

4. Full affected original journey on corrected source, exit 0:
   ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_alive_desktop.py bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-cutoff-ci-fix-20261026/full-green
   Raw: full-green.log, full-green.exit, full-green/journey-timing.json, full-green/native-session-report.json, full-green/native-inputs.json, full-green/journey.alive, screenshots and original audio capture. Journey-entry monotonic 42317.661253426 to journey-complete 42516.748688691: 199.087435265 s (inside the existing 8-minute CI bound). No assertion removed or value/capacity/time limit relaxed.
   The forced saved-session selector receipt contains covering tooltip path [927,4230688], tooltip atom 270, then owned [927,4194307], same rect [168,569,160,25], exactly 1 press/1 release. All original instrument1333/gain .55/effect 2000/automation1200/save-instance checks pass. Full journey also passes hosted editor lifetime, notes/history, stop/apply/start, source rejection preserving session, audio settings, dirty/pending Quit Cancel, final Quit Discard.
   Final audio: running=true, failed=false, stream errors 0, rejected commands 0, callbacks 2857, frame 4879360, both tracks active 3 voices. Private walkthrough capture 95.3493333333 s, peak .3533542454, unequal stereo samples 1024. ALIVE_ENDURANCE_SECONDS remains the original default 0; this is the CI native journey, not an endurance/hardware audio qualification.

5. python3 -m py_compile apps/ultra/tests/alive_workspace_navigation.py apps/ultra/tests/check_alive_desktop.py: exit 0.
6. git diff --check -- apps/ultra/tests/alive_workspace_navigation.py apps/ultra/tests/check_alive_desktop.py: exit 0 before commit.
7. git diff --cached --exit-code: exit 0 before staging and after scoped commit. git commit returned0; only the two test files appear in commit stat.
8. Pin comparison before reproduction and after full GREEN: every frozen UI/Alive/native-library hash matches the prior release-build record. No rebuild needed for a test-only change. Raw baseline-pins.json and final-source-binary-pins.json record exact pins.

## Diagnostic runs retained, including setup mistakes

Every native invocation used ULTRA_TEST_ALIVE=1, ULTRA_TEST_ALIVE_SESSION=/tmp/alive-cutoff-ci-fix-20261026/rebased.alive when applicable, ULTRA_TEST_SCRIPT pointing to the corresponding root-level diagnostic .py and the unchanged private harness. Raw directories and same-basename .log/.exit files are retained; diagnostic-exits.json is a compact index. No diagnostic result is substituted for final full-green.

- repro-instrumented: exit 1 because the first rebase setup incorrectly compared canonical source fingerprints to raw file hashes; no rebased file had yet been written. The independently running harness then rejected the missing input. This setup mistake was corrected without changing any artifact fingerprints.
- repro-instrumented-2: exit 0. Extra before/after accessibility observations made an initially reduced selection succeed; it lacked the exact reopen/Note 13 history and did not prove a fix.
- repro-tail: exit 1; exact minimal reopened-tail original focus/rectangle/motion/buttons leaves 1333.
- no-focus: exit 1; SELECTOR_MODE=no-focus with diagnose-variants.py, same failure.
- motion-sync: exit 139. Temporary diagnostic called XSync without ctypes pointer argtypes; the Python diagnostic segfaulted. This was a diagnostic FFI declaration error, not an Alive crash. Corrected in the next diagnostic only; product and shipped test input code do not use this addition.
- hit: exit 0; diagnose-hit.py adds page accessibility hit queries/screenshots between native pointer/button stages.
- motion-sync-2: exit 0; SELECTOR_MODE=motion-sync with corrected ctypes argtypes plus WebKit AT-SPI round trip after pointer motion.
- xsync-only: exit 1; diagnose-xsync.py proves XSync alone does not dismiss/wait for the occluding tooltip before buttons.
- inspector: exit 1; diagnose-inspector.py with WEBKIT_INSPECTOR_HTTP_SERVER=127.0.0.1:19229. Native selection fails as before; HTTP root exposes the private target, /json endpoints are 404.
- events: exit 1 because first Node diagnostic expected an uninstalled ws module. Replaced with Node 22's built-in WebSocket in temporary tooling.
- events-2: exit 1; first inspector Runtime call used the WebPage target wrapper incorrectly, protocol reported Runtime domain absent. Native selection still failed; this trace is not used as causal proof.
- events-3: exit 1 with actual DOM trace after correcting Target.sendMessageToTarget wrapping; only pointermove reaches Lowpass, no button events.
- occlusion: exit 1 with native pre-click tooltip ancestry/type plus DOM trace, unchanged selector rectangle and persistent 1333.
- tooltip: exit 1, same proof plus screenshot before motion visibly shows Devices detail native tooltip occlusion.
- regression-red: exit 1, explicit genuine-tooltip precondition and original assertion fail.
- regression-green: exit 0, same native condition then exactly one owned click succeeds.

Temporary inspect.cjs and webkit-target-protocol.json document the loopback inspector procedure. The protocol JSON and WebKitWebViewBase.cpp were fetched read-only from the public upstream WebKit source to interpret event forwarding; they are diagnostic references, not repository/source changes. Final GREEN native invocations did not enable the inspector. Private test launches cleaned up their owned processes on harness exit. Ordinary existing portal/Hyprland activation and MESA software-rendering messages remain in raw logs.

## Pins and limits

Alive release SHA256: f9ae9e6e2e33f9ffc875f4438ba5b8c641df16a1ecee923e3e884e8917d7640a.
Adjacent native library SHA256: 9a43a0314e76061f4e1407d98d9e27944b96b4fe8b14f8f432540093bcd1dbb5.
The complete final-source-binary-pins.json includes all four frozen Alive UI files, original harness, both changed tests and Ultra release binary. frozen-manifest.json records the full commit ID and verification artifacts. It must match reviewed commit source for curation.

The current evidence proves the native selector-input cause and complete local original-journey correction. It does not show a new remote exact-head CI result, physical audio underruns, endurance qualification or new Arrangement behavior. No saved-state production fix was warranted by observed evidence. No additional unresolved local failure remains; parent independent review is pending by design.
