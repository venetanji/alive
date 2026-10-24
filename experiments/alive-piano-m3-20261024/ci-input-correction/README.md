# Native Input Correction Qualification

Harness source: `79aec9d45b94e51ac76b95c5b3d5a514119b1483`.
Native/application source: `db96180772e59099cc96e0bab189ba2dc8825522`.
The commit changes only the two Python harnesses and its implementation report.
`receipt.json` records the pre-commit application/native HEAD and both tested
Python hashes; the controller verified the latter against the harness commit.
`qualification.json` records that association and retained artifact hashes.

The rebuilt separate Alive executable and adjacent native library complete:

- A focused native covering-tooltip regression under process-local
  `G_DEBUG=fatal-criticals`: the hit-test changes from the actual tooltip to the
  owning main window before exactly one Earlier press/release. Complete saved
  effect identity/order/state is restored. Both slash gestures wait for usable
  entries and release; normal Quit completes.
- The full native two-track journey: chains, automation/base ownership, piano
  edits/history, Apply, editor close/reopen, Save/Open, reference errors, scoped
  termination, cancellation guards and final Quit. All nine chooser slash
  gestures release after readiness. The original Lowpass effect-2 assertion
  remains required and passes.

The full software capture contains 2,719,744 stereo frames at 48 kHz, or
56.6613 seconds including deliberate stops. The controller independently
streamed every sample for finiteness and checked byte count/SHA-256. Peak is
0.3533542454. Raw PCM remains in the original temporary directory and is not
committed; its hash, metadata, receipts, logs and screenshots are retained.
Reported final aggregate stream errors and rejected commands are zero. There
is no playback endurance, physical-audio, typed backend Xrun or deadline claim.

Commands and source/build identities are in the committed implementation
report, `.superpowers/sdd/PLAN/task-10-ci-fix-report.md`. Each retained directory
keeps its original run name. `alive-task10-ci-fix-input` is the initial fixture
failure before either gesture, caused by querying collapsed diagnostics;
`alive-task10-ci-fix-input-v2` is the corrected successful focused run.
The earlier diagnosis, including historical attribution uncertainty, remains in
the sibling `reorder-diagnostic` and `gtk-diagnostic` directories. Historical CI
`40062078651` remains a failed run; new pushed-source CI must qualify this fix.

Application logs retain MESA-EGL warnings but no GTK critical in these runs;
outer private-display portal and PipeWire warnings are retained in full. The
existing unused `reserve_native` build warning remains. Optional window-manager
ancestry is not separately qualified, and shared Ultra input was not changed.
The raw native report's old `underruns: not exposed by CPAL` wording describes
the current UI's missing separate counter imprecisely: pinned CPAL supports
typed backend Xrun reports, but this interface currently aggregates errors.
Zero aggregate errors does not establish zero physical underruns. Task 13
implements separate observability before expanded-capacity/final acceptance.
