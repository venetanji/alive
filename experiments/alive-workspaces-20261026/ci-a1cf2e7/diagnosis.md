# Exact-Head Editor CI Diagnosis

Status: retained-evidence diagnosis only. No app, build, test, native probe,
source/test/index/branch/settings change, or subagent was run. The active full
native timing measurement was left undisturbed. This report is the only write.

## Result And Attribution

CI run `40374437793` tested head
`a1cf2e71d93c138f7c710440f765900ff81f32eb`. Its original desktop journey fails
at `apps/ultra/tests/check_alive_desktop.py:860`, the first `editor_edit()` call,
inside `windows.focus('Pulse - Ultra Hosted Editor')` at line 530. The failure
is `check_documents_desktop.py:126`: no matching root-child X11 window title
was found during the existing 80 scans. This demonstrates a missing editor
window after the attempted action, not a failed editor parameter assertion.
The second reopen, later file refusal/preservation checks and subsequent CI
desktop gates were not reached; their absence must not be called a pass.

Inputs examined: `/tmp/alive-ci-a1cf2e7-failed.log`,
`/tmp/alive-ci-a1cf2e7-run.json`, and retained files under
`/tmp/alive-ci-a1cf2e7-desktop/`, including the focus/failure trees and pixels,
native input receipts, operation/timing records and app log. A scoped read-only
diff confirms the inspected relevant UI, editor command, original harness and
navigation sources equal this tested head.

The status error preservation report records the separate local source/build
attribution and an intact original journey passing in 193.112 seconds after
approved commit `447023039a93944410b60d94d286a453a177f288`. That is evidence
that the local coherent binary completed the journey, not evidence that this CI
failure was fixed or that CI used an equivalent environment/build artifact.

## Demonstrated Evidence

1. Both initial Replace choosers completed. The earlier live effect editor was
   opened, edited to Cutoff 2000, closed, reopened, retained across pending
   piano edits/history, closed by Apply, then reopened and closed again.
   `operations.json` records the piano/history/Stop/Apply/play operation exiting
   at monotonic 848.618, with playback true, zero rejected commands and zero
   audio errors. Generic editor creation and native close were working earlier.
2. The last input receipt at monotonic 853.212 selects Pulse's Subtractive
   instrument through the owned selector path: rectangle `[168,544,160,25]`,
   hit path containing Alive XID `4194307`, one press and one release. The
   failure tree/pixels also show the Subtractive parameter panel, Cutoff base
   1777, Pulse gain 0.55 and `Transport request 3 applied`. The selection is
   consistent with the intended instrument; no wrong effect selection is shown.
3. `native-focus-failure.json` contains 197 main-window accessibility nodes,
   including `Open Pulse editor`, and no hosted editor frame. The failure
   screenshot shows the main window and enabled Editor button, with no chooser,
   editor, modal or tooltip covering it at capture time. The app log has only
   the initial EGL/DRI3 warnings. It contains no editor command error receipt.
4. `chain-playing-audit.png`, immediately before subsequent base/mixer operations,
   shows Pulse's Device / track summary collapsed around y=462. In
   `native-focus-failure.png` it is expanded around y=374 and Editor is at
   approximately x=164,y=385,width=129,height=25. The board has scrolled upward
   about 88 pixels: track headers and upper clip slots disappear. Expansion and
   scrolling therefore occurred along the path to the failing action.
5. There is no native-input receipt for `Open Pulse editor`. Existing observer
   wiring only attaches the generic click observer to Replace track actions.
   A visible unoccluded button eight seconds later cannot establish its input
   rectangle, window hit path, or DOM target at press time.
6. The retained `missing-control.json` for `Audio details` is secondary failure
   collection. `focus()` sets `windows.scope` to the editor title before its
   search; the catch block at desktop lines 1078-1081 then attempts to click a
   main-window control while that scope remains selected. Its lookup fails and
   is swallowed. This explains the later missing-control evidence and roughly
   eight additional seconds after the first failure; it is not the original
   journey failure or evidence of lost main-window accessibility.

## Narrowed Cause And Remaining Uncertainty

The demonstrated failure boundary is between attempted track-editor activation
and publication of a matching native window. The retained evidence does not
distinguish input delivery, click-handler/queue entry, Rust invocation, or native
window creation/publication. A single definite root cause cannot be claimed.

The leading hypothesis is a pointer miss during focus-induced scrolling of the
expanded track inspector. `alive_workspace_navigation.py:60` expands that
inspector via accessibility focus and Return. `check_canvas_desktop.py:106`
then focuses the Editor accessible, reads one rectangle, and immediately queues
motion/press/release. It checks positive size and enabled state but does not
observe geometry settling, the owner hit path, or the actual DOM event target.
By comparison, `check_alive_desktop.py:297` re-finds selector/reorder geometry
after focus, observes window ownership and waits before sending its one click.
The observed scroll transition makes this a concrete hypothesis to test.
It does not prove a stale rectangle or tooltip interception in this action.

Both track Editor and Edit selected device call the same `alive_editor` backend;
the track action captures `track.device.instanceId`, while the selected-device
action captures `selectedInstance`. The backend checks current generation and
instance, then focuses an existing labeled window or builds a new one with the
track-derived title (`session/desktop.rs:321`). The failure text remains the
previous transport success rather than an editor error, which is compatible
with an unreceived click. It does not exclude an outstanding queue/invoke or
unpublished native window. There are no retained boundary receipts to resolve
those alternatives. Initial chooser success and the absence of a chooser here
provide no basis to reuse the earlier chooser explanation.

## Exact Proposed Next Step After Owner Transfer

Preserve the original input sequence and assertions. Add observation only for
the first `Open Pulse editor` attempt and run a targeted causal reproduction
after the measurement owner releases native/source/test ownership. Do not
replace this action with the selected-device editor action, add a retry, extend
the existing timeout, or use a successful full rerun as a causal explanation.

The smallest candidate reproduction is the original 1200x800 Alive window on
the harness's 1280x840 private Xvfb display, with a prepared playing v3 Session,
Devices detail open, Pulse selected,
and Pulse's Device / track inspector initially collapsed. Keep the original
suffix that edits Cutoff/Pulse gain, toggles Harmony mute twice and Pulse solo
twice, then executes one `editor_edit()`. Starting only from the default
collapsed inspector and executing one editor action is a cheaper first
isolation; add the original suffix and prior effect-editor close/Apply sequence
only if necessary to reproduce the failing boundary. No reproduction was run
as part of this diagnosis, so none is claimed deterministic.

Capture, without another activation or focus change: editor/summary accessible
state and rectangle before and after the existing grab_focus; the chosen point;
X11 owner hit path/window metadata and input focus around the original queued
motion/press/release; post-flush geometry; and timestamped DOM pointer/click
target plus `alive_editor` invocation/result and native build/focus outcome.
Use an isolated diagnostic change or sidecar so production behavior and the
original assertion remain reviewable. Boundary observations should be buffered
where possible because added synchronous traversal can itself alter timing.

Decision criterion: if the one click misses the Editor or hits a different
window while its rectangle moves, isolate that focus/scroll or occlusion
transition and only then choose a one-click input correction. If the Editor
receives the click, trace the first missing handler/queue/invoke/build receipt
instead. This experiment separates the alternatives; the retained screenshots
alone do not justify implementing either correction today.
