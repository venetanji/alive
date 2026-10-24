# CI d1f8a66 Reorder Diagnosis

Read-only diagnosis, 2026-10-24. No application/test source edits, builds,
commits, unchanged full-suite reruns, or helpers/subagents. Native Task 11
worktree changes remain untouched. Temporary diagnostic scripts and fixtures
live under `/tmp/alive-reorder-diagnostic-20261024`.

## Finding

The native pointer harness can click a tooltip window instead of the intended
Earlier button. After Utility moves later, the pointer remains over the old
Later position. Its native tooltip can appear over the next row, covering the
Utility effect 2 Earlier button. `Atspi.Component.grab_focus` focuses that
underlying button, but does not remove the covering tooltip. `ui.click` then
batches pointer motion, press and release into a single flush. The tooltip has
not dismissed before the button events, and the intended reorder is lost.

This reproduces the CI's exact visible state on the immutable Task 10 release:
Lowpass effect 1 / Utility effect 2, focused enabled Earlier, stopped transport,
unchanged `Chain prepared. Start transport when ready.`, and no error. An
identical click retry restores the original order. A targeted comparison waits
for native screen-coordinate ownership to return to the main window after
pointer motion, then uses the same immediate press/release; that succeeds even
when the covering tooltip is deliberately present.

The historical CI did not retain the pre-click tooltip or raw button-event
trace. Attribution of that exact run to this reproduced mechanism is therefore
an inference supported by the matching state, source sequence and controlled
native reproduction, not a historical event trace. No evidence justifies a
Rust/native reorder implementation change.

## CI And Source Evidence

- Failed run: `40062078651`; pushed source `d1f8a66`.
- Raw failure: `/tmp/alive-ci-d1f8a66-failed.log`. `prepare_chain` reaches the
  second reorder and fails at line 283 waiting for
  `Select Pulse Stereo Lowpass effect 2`. The missing-control assertion is valid.
- `/tmp/alive-ci-d1f8a66-desktop/missing-control.json` and
  `/tmp/alive-ci-d1f8a66-desktop/missing-control.png` retain Lowpass 1 / Utility 2
  and the unchanged success notice. The screenshot shows Earlier focused.
- `apps/ultra/tests/check_canvas_desktop.py:86` focuses a control, gets its
  rectangle, then submits motion/press/release together before `XFlush`.
  It checks enabled state and geometry, but not native occlusion at that point.
- At `d1f8a66`, `buildChain` correctly binds Utility effect 2 Earlier to the
  preceding Lowpass instance. `change_device` removes that Utility and inserts
  it before the requested Lowpass. The observed wrong state does not establish
  that this callback was invoked.
- The button's `title` is the long chain-status explanation. The retained
  pre-click screenshot visibly identifies this tooltip and its covering area.

The four GTK realization assertions in the CI app log occur during the earlier
chooser sequence. The separate retained slash-key diagnosis is documented in
`experiments/alive-piano-m3-20261024/gtk-diagnostic/README.md`. The focused
reorder fixture opens with both effects already prepared and uses no chooser,
so this click loss does not require that slash-key assertion.

## Target And Scope

Main target: `/tmp/alive-gtk-diagnostic-20261024/alive`.
SHA-256: `0e0576124a45460c266f49f309bf140d02bda4cd8d223f1a1455abaf56846fdc`.
Adjacent native library:
`/tmp/alive-gtk-diagnostic-20261024/libultra_native.so`.
SHA-256: `693f0acff15caa77b8e572255f9e333bd8254eec2905c19386b38ffd9882a3a1`.
`ldd` confirms that this adjacent library resolves for the immutable executable.
No rebuild is used and the Task 11 changing native library is not loaded.

`prepared.alive` is a temporary absolute-path copy of the earlier qualified
`/tmp/alive-task10-scope-native/before-reorder.alive`. Its saved instrument,
Utility and Lowpass sources remain existing files; only reference paths are
resolved for relocation. This avoids chooser effects and isolates the reorder
input sequence. Private Xvfb, accessibility bus and software PipeWire are owned
by the existing sequential harness. No physical input/audio claim is made.

## Bounded Observations

1. `run/probe.json`: the ordinary helper reproduces the loss on cycle 0. The
   target is enabled with screen rectangle `[1018, 385, 52, 25]`. After the
   failed click, an identical click retry restores the expected order. The
   remaining eleven cycles succeed. `run/failed-0.png` matches the CI failure.
2. `press-flush/compare.json`: separating press/release with a 50 ms hold passes
   six pairs. This alone is not causal proof: `batched/compare.json` also passes
   six fast pairs without that hold.
3. `hover-batched/compare.json`: a 1.1-second diagnostic hover before Earlier
   recreates the cycle-0 loss; an identical retry restores it. The subsequent
   five pairs pass. `hover-batched/before-earlier-0.png` shows the old Later
   tooltip at approximately x=654..1279, y=381..446, covering the Earlier target
   center x=1044, y=397. `before-earlier-1.png` has no covering tooltip and that
   pair succeeds. The hover is a diagnostic trigger, not a proposed sleep fix.
4. `hover-motion-condition/compare.json`: the same diagnostic hover followed
   by motion-only flush and an occlusion predicate passes all six pairs. In
   cycle 0, `XTranslateCoordinates` at the target center initially returns
   native child `4194413`, while the owned main window is `4194307`. After
   motion and a bounded poll it returns `4194307` in 0.010334581 seconds. Only
   then are the unchanged press/release events sent. The order restores.
   Later pairs already resolve to the main window, so the predicate completes
   immediately rather than imposing a fixed delay.

All five focused harness processes exit zero; these diagnostic scripts record
initial failures and recovery intentionally. Their zero exits do not mean the
original CI assertion passes unchanged. No CI job is reclassified as green.
The local harness retains its usual portal/display diagnostics.

## Commands

The original focused reproduction uses the unchanged `probe.py`:

```sh
ULTRA_TEST_ALIVE=1 \
ULTRA_TEST_ALIVE_BINARY=/tmp/alive-gtk-diagnostic-20261024/alive \
ULTRA_TEST_ALIVE_SESSION=/tmp/alive-reorder-diagnostic-20261024/prepared.alive \
ULTRA_TEST_SCRIPT=/tmp/alive-reorder-diagnostic-20261024/probe.py \
  bash apps/ultra/tests/check_canvas_desktop.sh \
  /tmp/alive-reorder-diagnostic-20261024/run
```

The final condition-based comparison uses `compare.py`:

```sh
PROBE_CLICK_MODE=hover-motion-condition ULTRA_TEST_ALIVE=1 \
ULTRA_TEST_ALIVE_BINARY=/tmp/alive-gtk-diagnostic-20261024/alive \
ULTRA_TEST_ALIVE_SESSION=/tmp/alive-reorder-diagnostic-20261024/prepared.alive \
ULTRA_TEST_SCRIPT=/tmp/alive-reorder-diagnostic-20261024/compare.py \
  bash apps/ultra/tests/check_canvas_desktop.sh \
  /tmp/alive-reorder-diagnostic-20261024/hover-motion-condition
```

The other mode/output pairs are `press-flush`, `batched` and `hover-batched`.
Their exact JSON results and harness logs are retained in the corresponding
directories; `compare.py` acquired its coordinate-ownership instrumentation for
the final comparison. Earlier mode runs did not include those extra native
coordinate queries. Do not treat the 50 ms hold comparison as a proven fix.

## Narrow Recommendation And Remaining Work

Serialize a harness-only fix through the designated implementer. Prefer a
bounded helper scoped to the Alive reorder interaction first: shared
`check_canvas_desktop.ui.click` also drives Ultra, GTK file choosers and
optional WM sessions. Changing that shared helper requires validating owned
dialog/client-window ancestry under the WM as well as direct Xvfb top-levels;
the diagnostic alone does not establish that broader contract.

For the scoped helper, move the pointer to the freshly resolved target and
flush that motion separately;
wait, with a short bounded poll, until its center belongs to the expected owned
top-level window rather than an overlaid tooltip; then re-resolve target
geometry/state after motion and issue press/release. Resolve the expected top-level from the
actual scoped frame; the diagnostic's known point `(10,10)` is not a generic
production helper. Timeout should retain the blocking native window and screen
evidence. Keep the original Lowpass effect 2 assertion and avoid blind retries.

Add a focused native check that deliberately permits the covering tooltip and
requires one delivered click to restore order. The independent slash press/
release lifecycle issue remains a separate harness fix from the GTK diagnosis.
Then qualify the actual changed journey and rerun the failed exact-head CI gate.
No application reorder or DSP change is recommended from this evidence.

Status: diagnosis complete; no implementation blocker. The exact CI remains
failed until the serialized fix and new exact-head qualification succeed.
