# Saved-clip harness boundary diagnosis

Starting source commit 4b9a88b721bba9728bb6b505e14cc4a14f7c8117.
Original harness copies are retained alongside this note. Coherent pinned product
is /tmp/alive-workspaces-task2d-desktop/app-qualified/{alive,ultra,libultra_native.so};
qualified-build-pins.json and qualified-source-pins.json are copied here, and
attribution.json verifies every declared binary/fixture hash. No product settings,
scheduling, quantization, saved music or runtime code were changed for these probes.
The private wrapper creates its own Xvfb, DBus, PipeWire and XDG directories and
cleans its child processes/runtime. No home audio or physical output qualification.

## Original full observability journey

original-observed exited 0. It retained pending and applied, saved defaults,
undo/redo, editor lifetime, scoped Stop with Harmony playing, external dependency
refusal and atomic recovery, save/reopen, final observability cycles and Quit.
Report: observability-report.json complete=true, 6 completed epochs,
4.831318125673375 playing seconds proven (not capture duration/endurance).
The added observer records original click/value entry and exit, plus disclosure
native hit path/expanded state. It adds bounded observation overhead. It did not
reproduce the original remote failure. It is not an explanation of the remote run.

## Native disclosure reproduction

The first disclosure-red attempt failed in unused probe setup, trying to find the
nonexistent disabled empty-slot launch control. This is retained, not counted as
RED. The corrected disclosure-red2 uses existing force_covering_tooltip with
hover='Select Pulse slot 4', target='Pulse runtime details'. Native target rectangle
is [156,285,145,21]. At monotonic 64161.310862273, native hit_path is
[927,4194401]; main-frame owner 4194307 is absent, and the covering path contains
_NET_WM_WINDOW_TYPE_TOOLTIP. Original alive.value('Pulse clip runtime') performs
unchecked summary pointer activation, then exhausts the existing control wait and
fails Missing native control: Pulse clip runtime. disclosure-result.json records
expanded=false. This demonstrates tooltip/input interception causing the local
collapsed-disclosure failure mechanism. The older local artifact alone did not
prove the mechanism, and the remote failure was at pending, not this boundary.

A /tmp-only candidate replaces only runtime expansion input with the existing
native_control_click(...,'disclosure') helper. disclosure-candidate-green exited 0:
one press/release; the final hit path contains the owned main frame; disclosure
expanded=true and actual runtime output is readable. No fallback activation.
Candidate is not yet integrated in source.

## Pending sampling reproduction

pending-late-red first targeted reported phase 3.8--3.95. Reported 3.903 beats plus
actual accessibility/input acquisition crossed the native boundary before launch,
so it targeted the following bar and pending/applied passed. Retained as a failed
experimental precondition, not a successful regression reproduction.

The single adjusted pending-late-red2 targeted reported phase 3.55--3.7. At
64351.167855283, launch begins at reported position 3.644 beats. At 64351.348127260,
original ui.click has returned; the actual cached runtime says request 3 pending
launch at frame 214473, current frame 212992: 1481 frames / 30.854ms remaining.
The first original alive.value traversal begins 64351.348969316 and completes
64351.420553184, taking 71.584ms and returning Playing Clip 1 copy / request 3
applied. The unchanged 8-second pending assertion eventually fails with that
applied value. This proves an actual transient pending observation can be present
at input return and disappear during original accessibility traversal. No pending
assertion was weakened to pending-or-playing, and no extra input or timeout was
added. This controlled local reproduction does not establish the original remote
cause, whose artifact lacks insertion/first-sample frame/time.

Next candidate keeps the deliberately late-phase precondition, then waits for an
early bar phase (0.15--1 beat) via the existing cached transport-position accessible
before the same single Launch and the unchanged pending then applied assertions.
Full journey integration should also move capture discovery/port linking before
Start to remove that unrelated work from the pending observation window.

## Candidate GREEN observations

pending-early-candidate-green exited 0. The same late precondition was reported
3.584 beats. With only the early-phase prerequisite enabled, original Launch
begins at 64442.613648368, reported position 4.201 beats. At original click return
64442.795927488, pending target=316306 and current frame=226304, leaving 90002
frames (1.875 seconds). Unchanged pending assertion passes at 64442.868837511;
unchanged applied assertion passes at 64444.829087708. This candidate did not
move capture, which the focused probe does not start; full harness integration
must place capture outside the transport/pending window as already described.

All candidate code remains under /tmp while source ownership belongs to the
independent Task2D product correction. No harness source or index edits by this
worker preceded that ownership handoff.
