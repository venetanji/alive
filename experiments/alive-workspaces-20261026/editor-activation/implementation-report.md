# Hosted Editor Activation Probe

## Result

The CI a1cf2e7 failure remains unexplained. Two bounded native probes delivered
the original single track Editor activation and found its hosted native window.
Neither demonstrated a stale-rectangle miss, occlusion, lost DOM click, blocked
command queue or failed native creation. No input correction, product change,
retry or timeout increase is justified by these results.

The scoped change records only the first original `Open Pulse editor` attempt
in the existing journey. It preserves the original input, all 76 original
assertions, original saved values, pending history and scoped Stop/Quit checks.
The full original journey passed in 193.180813505 seconds, run once after the
final observer code. This verifies local preservation; it does not explain or
repair the CI failure.

## Source And Build Attribution

Writer transfer base: `8e177199c0f7d09b6a9380b67a37709b9ab4b31c`, branch
`feat/alive-session-host`. Existing parent PLAN/docs/evidence edits were left
in place and are excluded from this writer's commit. Source/index ownership is
returned to the parent after the final source commit and empty-index freeze.

All probes use the existing `check_canvas_desktop.sh` private Xvfb (1280x840),
D-Bus/accessibility registry and software PipeWire server. No product rebuild,
settings, user audio session, release, ABI, DSP, capacity or push operation was
performed. Existing binaries were pinned before the probes:

| Artifact | SHA-256 |
| --- | --- |
| release/alive | `ae23ba409de663921cce42ed01d66f27fd60fb007fffe126a77736067fa5d894` |
| release/ultra | `55f84830e64c1346b105e2a0628489728a2f62e0c17838b4929612b64a13fb96` |
| adjacent and build libultra_native.so | `1c579c6d63befb624166174c15a3235fa6fb71acab2e01f03aae124d7801b931` |

These are the coherent local tested artifacts identified by the preservation
report. This probe does not establish that CI used equivalent artifacts or
environment. The failed CI remains attributed to run 40374437793 and head
`a1cf2e71d93c138f7c710440f765900ff81f32eb`.

## Retained Evidence And Experiments

Raw evidence is `/tmp/alive-workspaces-editor-ci-probe`. The existing failure
inputs remain `/tmp/alive-ci-a1cf2e7-desktop`, its run metadata/log and the
parent-curated `experiments/alive-workspaces-20261026/ci-a1cf2e7` evidence.
The earlier effect-editor/history success, correct Subtractive selection,
expanded inspector and missing Editor input receipt were rechecked before
probing. No earlier chooser failure was attributed to this editor boundary.

Native command form, with no ALIVE_SYSROOT and PATH=/usr/bin:/bin:

```sh
ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCRIPT=SCRIPT PYTHONUNBUFFERED=1 \
  bash apps/ultra/tests/check_canvas_desktop.sh \
  /tmp/alive-workspaces-editor-ci-probe/NAME
```

The `run.py` sidecar applies the existing 480-second outer harness bound and
records argv, selected environment, exit, UTC times and wall duration in
`NAME-run.json`; it does not alter the original native focus timeout. The
initial minimal probe used a 100-second outer guard, recorded separately in
`minimal-attribution.json`, and was not repeated. Late runs also retain exact
per-run source copies and hashes. The initial minimal driver was edited before
its source was separately frozen; its retained trace/log and attribution file
are authoritative for its observed behavior, rather than a claimed historical
driver hash. `baseline.json` and `base-*.py` retain the exact source/build base;
`suffix-source-*` retains the suffix sidecar, inspector and command runner.

1. `minimal`: default loaded fixture, initially collapsed Pulse Device / track
   inspector, exactly one original `ui.click('Open Pulse editor')`. Before
   focus the editor rectangle was [164,472,129,25]; after focus it was
   [164,385,129,25]. The original extents read chose [228,397], whose hit path
   contained the owned Alive window. Post-flush geometry stayed unchanged and
   the hosted Cutoff control appeared with value 2400. The driver then failed
   its own final Quit check because it omitted Discard for the fixture's v1 to
   v3 migration prompt. Exit 1 is retained in `minimal.exit` and the log. This
   was a temporary cleanup defect, not an editor activation failure or original
   journey failure. The remaining session was cleaned up by the fixture.
2. `suffix-observed`: playing loaded Session, Pulse instrument selected,
   original suffix Cutoff 1777, Pulse gain .55, Harmony mute twice and Pulse
   solo twice, then exactly one original Editor activation. Exit 0 in
   18.248763153 seconds, including hosted-control discovery, normal Close,
   scoped Stop and Quit Discard. The same 87-pixel focus scroll settled before
   the chosen point; post-flush geometry stayed [164,385,129,25]. Buffered DOM
   events show pointerdown, pointerup and click on `Open Pulse editor`, then the
   original native window lookup succeeds. There was no second activation.
   `dom-events.json`, `editor-probe.json` and `editor-found.png` retain this.

The second probe used the previous chooser study's WebKit loopback inspector
mechanism with `WEBKIT_INSPECTOR_HTTP_SERVER=127.0.0.1:19229`. The attempted
`__TAURI_INTERNALS__.invoke` wrapper yielded no editor invoke receipts. That
hook is not treated as a valid queue/invoke observation; the observed DOM click
and matching native window establish only those observed endpoints. No Rust
build/focus instrumentation or product rebuild was added.

Instrumentation can change timing. The minimal native focus observation took
2.022 ms, chosen hit observation 0.634 ms and post-flush observation 1.277 ms.
The inspector suffix values were 9.370, 0.757 and 1.195 ms respectively; setup
and inspector installation/readback are additional overhead. The passing
probes therefore do not exclude a timing-sensitive CI input failure. Once
these bounded probes passed, causal probing stopped.

## Permanent Scoped Observations

Only three test files change:

- `alive_workspace_navigation.py` wires an optional observer for the existing
  `Open Pulse editor` click, alongside the unchanged Replace observer.
- `check_alive_desktop.py` buffers at most one before/queued pair and one
  window-result receipt in existing `native-inputs.json`. It records the
  original after-focus rectangle/chosen point, X11 input focus, hit ancestry,
  native owner metadata, post-flush accessible geometry and observation
  duration. At the unchanged native focus result it records success or the
  original exception plus at most 128 root-window records and an omitted
  count. Lookup errors become observation errors; the original focus exception
  is re-raised unchanged. No observation refocuses, substitutes a control,
  changes a point, sends input, retries or waits for settling. The original
  XTest motion/press/release/flush batch and post-input allowance remain intact.
- `check_alive_editor_diagnostics.py` checks one actual native activation,
  receipts, the original success assertion, observer-error isolation, finite
  observation counts and Quit Discard. Its optional absent-title mode verifies
  that the original native focus assertion still propagates. It deliberately
  searches the wrong title while a real editor exists; it is a recorder/helper
  test and does not reproduce or explain CI's missing-window condition.

The permanent receipts use the existing click observer's after-focus hooks;
they do not insert pre-focus accessibility work into the original journey.
Pre/post-focus geometry and DOM targets belong only to the temporary probes.
No permanent DOM/invoke instrumentation or guessed source correction is
included. Observation duration measures native/accessibility work, excluding
artifact serialization/writes and surrounding test setup. In the first
successful diagnostic run it was 0.714 ms before input, 34.756 ms after flush
and 1.490 ms at the window result. This is observable overhead, not a controlled
measurement of end-to-end impact or proof that CI cannot still fail.

## Verification

- `diagnostics-red`: exit 1 in 13.555716418 seconds against BASE source plus
  the new native diagnostic. The original editor operation succeeded, then the
  new assertion failed with `AssertionError: []` because receipts were absent.
- `diagnostics-green`: exit 0 in 14.583809306 seconds after only observer
  implementation; one actual activation and all original editor assertions.
- `observation-error`: exit 0 in 14.490269369 seconds with
  `ALIVE_TEST_EDITOR_OBSERVATION_ERROR=1`. A deliberately raising native hit
  observer is recorded, while the original one-click editor operation still
  completes and Quit Discard exits.
- `focus-failure`: exit 0 in 20.973570163 seconds with
  `ALIVE_TEST_EDITOR_FOCUS_FAILURE=1`. The original 80-scan missing-title
  assertion propagates with its original message and scope, and the failure
  receipt still captures the genuine editor window. This is intentional
  negative helper coverage, not a second causal editor probe.
- `verify-preservation.py`: exit 0. All 76 original assertions are identical;
  every original function/class normalizes identically after removing only
  the observation wrapper in `editor_edit`. Original generic click and native
  focus helper are byte-identical. All pinned binary hashes still match.
- Python compilation of the three changed test files and scoped diff checks
  pass. No DSP or unrelated full suite was rerun for these test-only changes.

## Final Original Journey And Freeze

`full-original` exited 0 in 193.180813505 seconds, from
2026-10-26T18:47:45.567856Z to 2026-10-26T18:50:58.748684Z. It used the exact
original journey with the permanent observations only: no inspector,
temporary input/focus substitution or diagnostic environment switches. The
retained `full-original-run.json` has exact command, environment and hashes;
`full-original-sources/` contains the exact tested harness sources.

The journey reaches final Quit, `journey-complete` and `observer-stop`. Both
Editor edits pass, with Cutoff 1333 persisted after reopen, Pulse gain .55,
lowpass effect Cutoff 2000, automation point 1200, unchanged effect identity,
pending history, source/file refusal preservation and every original close /
Quit Cancel / final Discard assertion. Final stream errors and rejected
commands are zero. `full-result-verification.json` retains the exact final
flags, audio diagnostics and receipts rather than restating a shortened
journey as acceptance.

Exactly three first-activation receipts survive the two original Editor opens.
The chosen point [228,397] hits the owned Alive window, chosen/post-flush
rectangles are [164,385,129,25], and the matching owned hosted-editor root
window is viewable. No observation errors were recorded. Observation durations
were 0.624 ms before input, 39.682 ms after flush and 4.832 ms at the window
result, excluding serialization/output work. No permanent observation was
added between the original queued motion, press and release.

The original supervised recorder reports `complete: true`, reason
`requested_stop`, 33,837,056 bytes / 4,229,632 frames and zero stderr bytes;
its raw recorder returncode is 1, retained unchanged. Capture validation and
the original harness succeeded. `cleanup-verification.json` confirms the owned
capture process group, recorder process and Alive process are absent after
the successful Quit. No sustained endurance or physical-output qualification
is claimed by this focused preservation run.

Scoped source commit: `6d8880319f60840d7ae3c005f5d803b347be052d`,
`test(alive): observe first hosted editor activation`. It contains exactly
the three test files listed above. No parent docs/evidence edits were staged.
Fresh preservation verification still confirms all 76 assertions, every
normalized original function/class, the byte-identical original generic input
and native focus helper, and the unchanged pinned binaries.

Source/index frozen at 2026-10-26T18:52:27.015264Z, staged diff empty, index
tree `53b0dd531c6d11716505220e195f2475f1c6f44f`. `source-freeze.json` records
all exact source/build hashes and the remaining parent worktree changes:

| Changed source | SHA-256 |
| --- | --- |
| check_alive_desktop.py | `1f1b7e9786343d255d72f226b06634e3f23524588b4f326cb7b5f47515235614` |
| alive_workspace_navigation.py | `dc7e884dbe17cbd2d4db5984f8315552ea18ccfedd1cc1052202d40b95e3ce20` |
| check_alive_editor_diagnostics.py | `7821c0705366442fc69c9a111d5dfad69426e134f66de7c9f2b94b7699c84cb2` |

The evidence directory also retains copies of the pinned binaries and a final
hash inventory. Source/index ownership is released to the parent. Independent
review precedes any parent push. Actual desktop MIDI integration remains the
next product task; the v3 eight-track Session capability is unchanged by these
observations. The CI activation cause remains unresolved.
