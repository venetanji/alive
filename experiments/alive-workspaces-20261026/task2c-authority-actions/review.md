# Task 2C authority actions independent review

Reviewed base `8a6192f01e36dfea5978503d2799dd4339970d1d` to implementation
`92d84d1f53dc1d8ad4f7b345f16f862e911d3ec7` on 2026-10-27.

Spec verdict: REQUEST_CHANGES.
Quality verdict: REQUEST_CHANGES.

## Finding

### P2: Arrangement boundaries erase a still-pending Launch slot

`apps/ultra/src-tauri/native/alive_session_workspaces.hpp:410` replaces the
resolved cursor with `next_arrangement(...)` when an Arrangement occurrence
ends or a gap reaches its next placement. That helper returns a fresh cursor
whose `pending_slot` is NONE. The track's pending action, internal global slot
token, serial and target remain unchanged. `project_v4` reads the erased field
at `apps/ultra/src-tauri/native/alive_session_workspaces.hpp:473`, so StateV4
advertises a pending Launch with no pending slot until application or replacement.
This violates the required coherent pending global-slot projection even though
the eventual scheduler still has its internal Launch token.

Confirmed with the pinned implementation backend and a narrow reproduction
outside the workspace. Starting from `authority_fixture()`, change placement 0
to end at 10000 and placement 1 to start at 10000 with duration 110000. Start,
advance to song position 3000, and queue track 0 local slot 0 (global slot 0).
Its target is 48000. After crossing the adjacent same-source boundary, the run
reports:

```text
before position=3001 action=1 slot=0; after position=10001 action=1 slot=4294967295 receipt_pending=1 fault=0
```

The expected pending slot remains 0 at position 10001. Reproduction execution
exits 1 specifically for the incorrect slot; configuration and rendering pass.
Retained source: `/tmp/alive-authority-review-pending-slot.cpp`.
Retained executable: `/tmp/alive-authority-review-pending-slot`.
Command/result: `/tmp/alive-authority-review-pending-slot-result.json`.

Exact successful reproduction build and run, from the workspace root:

```sh
c++ -std=c++17 -O2 -Wall -Wextra -Werror -Wno-return-type -Wno-subobject-linkage -pthread \
  -DULTRA_ALIVE_SESSION_TEST_TRACE -DULTRA_ALIVE_SESSION_V4_PROVISIONAL \
  -I/tmp/alive-workspaces-task2c-authority-actions \
  /tmp/alive-authority-review-pending-slot.cpp \
  /tmp/alive-workspaces-task2c-authority-actions/backend.o \
  apps/ultra/build/core/libultra_core_bundle.a \
  -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock \
  -ldl -lrt -o /tmp/alive-authority-review-pending-slot
/tmp/alive-authority-review-pending-slot
```

Preserve pending metadata across unrelated Arrangement cursor transitions (or
derive its public projection from the authoritative pending token), and add a
playing regression crossing occurrence/gap boundaries before a future Launch.
Assert global slot, action, serial, absolute target and receipt pending member
through the boundary and successful application at the target. Include the
sparse local/global mapping rather than only slot zero.

The concurrent test at
`apps/ultra/tests/alive_session_v4_authority_test.cpp:929` never issues START.
Consequently its pending-action assertion at line 974 is not exercised by the
stopped action loop. Extend it with actual playing pending actions and boundary
crossings before treating the report's concurrent pending-identity claim as
verified. This is part of the same finding, not a separate blocker.

## Spec assessment

The action scope and main architecture otherwise match this sub-slice. The
changes preserve the shared queue/reducer, receipt algebra, reserved Stop path,
clock and renderer. Track-local ingress resolves via the immutable slot map;
Launch consumes a slot descriptor rather than a legacy clip/source token.
Stopped reductions defer final Arrangement resolution, and the prospective
transition applies due actions before old Arrangement endpoints. Return resolves
at application position, including gaps. One-shot completion retains the
private remembered cue while publishing no active source/slot and phase zero;
natural-end restart and explicit Track Stop follow the stated distinction.

The complete envelope builder and independent oracle are unchanged in the
six-file diff. No work ceiling, ABI, source-loop/song-loop/Seek/audio admission,
shipping feature, desktop integration or second scheduler is introduced. The
existing v4 edits replace only the obsolete valid-action FEATURE_DISABLED
expectations authorized by the parent. Other old assertions are retained;
the original v3 suite is not changed.

The old committed-pending plus failed optional Seek scenario is correctly
carried to the next slice. With Seek refused, a playing track action schedules
through the existing reducer, START while already playing is a no-op, and
reserved Stop cancels old pending members before stopped optional work. There
is no reachable established optional operation preserving old playing pending
members in this slice. Adding a new optional gate to playing actions merely to
construct that case would change the accepted semantics. This does not waive
the future authority-aware Seek regression.

## Atomicity and quality assessment

Scheduled dispatch now computes final tracks/cursors in bounded scratch,
reserves placement work before lookup, reserves reconstruction scans before
reading, and counts the combined synthetic/ordinary event batch before copying
the prospective tracks/cursors or marking due members applied. On a scheduled
failure, fault cleanup operates on committed authority and cancels the pending
members; the callback fault latch prevents later-fragment rearm. The focused
retained 28+4 versus 29+4 test and injected scene fault substantiate this
particular atomicity claim. These are explicit ledger-pressure tests, not a
claim that a 33-event authored score passed configuration admission.

Optional refusal preserves committed authority/cursors and terminal member
outcomes while accepted live mixer/base/bypass commands retain their semantics.
The first-sample preview includes chase allowance for the final changed active
track, and rejected expensive work charges guard/placement credits without
reconstruction. Final-only stopped reduction avoids redundant Return lookup.
No second ownership mechanism or callback allocation was added in the diff.

The pending-slot bug shows that duplicating pending metadata between tracks and
resolved cursors needs an explicit preservation invariant at cursor replacement
sites. Correct that invariant and exercise it in playback before approval.

## Evidence checked

Read the task brief, final report, binding task-2c design brief and runtime
contract sections 2/3/4/6/8. Read the complete 89,368-byte supplied diff once in
bounded chunks. Additional source inspection was limited to concrete questions
about chase/clear, candidate commit/fault cleanup and pending-state projection.
No git command, broad source crawl, suite rerun, subagent or source/index edit
was performed. The parent-owned PLAN change is excluded.

The parent independently matched 29 pins, the six committed blobs and the
145001 finite stereo PCM frames. This review additionally verified SHA-256
against `evidence-sha256.json` for 17 selected metadata/log/trace files, including
the focused and native-CI commands/logs, oracle, shipping check, original RED,
preview mutation, pins, evidence description, dispatch, receipts and work traces.

- Focused run: recorded exit 0, 45.019842373003485 seconds; authority, original
  finite multi-track and one-lane suites pass with callback guards.
- Native CI: recorded exit 0, 170.6433554289979 seconds; authority suite and
  complete oracle appear in the log, with 42 edit and 42 baseline Stop-stress
  cycles over 43008 float samples. No additional full CI was run here.
- Complete oracle: recorded compile/run exit 0 and 106661824 assertions, with
  the report's source/boundary/splice/authority/native counts matching its log.
- Shipping check: recorded current-source compile/run exit 0 without the
  provisional definition; log confirms shipping admission disabled.
- Initial RED: retained behavior assertion fails at valid action ingress,
  recorded compile exit 0 and execution exit 134. Preview mutation also records
  exit 134 at the required candidate-refusal/no-fault assertion.
- Work and dispatch traces agree with the stated 48000/96000 authority targets,
  charged six-resource maxima and first-sample guard 9252 / placement 2058.
  The report distinguishes conservative parameter ledger charges from an
  independent DSP instruction count.

The new test source proves exact PCM/dispatch partitions, unaffected real-device
PCM for no effects/utility/filter/utility-to-filter, scoped Stop/gap silence,
offset chase ordering, receipt replacement, reserved Stop and saturation.
Eight-track evidence is appropriately described as sparse authority coverage,
not eight simultaneously sounding Arrangement lanes. The dense 32-slot
configuration remains refused at placement 66/64. These passing results do not
cover the newly reproduced pending-slot boundary case.

The narrow review reproduction compiled against the retained backend/core with
the same provisional/trace definitions and allocation/lock wrappers. The
include-based harness required suppressing `return-type` and `subobject-linkage`
warnings caused by renaming and including the suite's main translation unit;
the first harness compile failed only on the latter warning, and the corrected
harness compile exited 0. No production warning policy was altered. Both
executions reproduced the same exit-1 pending-slot failure.

## Remaining gates

Fix the finding, add the reachable playing pending-state regression, update the
report/evidence pins and return the scoped delta for independent re-review
before widening. Keep suffix loops and authority-aware Seek as the next slice,
including old-pending optional-refusal continuity and unaffected Session PCM.
Partial song loops and their seam ordering remain later work. Timing/deadline
qualification, Rust/desktop integration, audio sources, production activation
and the final end-user journey remain explicitly gated.
