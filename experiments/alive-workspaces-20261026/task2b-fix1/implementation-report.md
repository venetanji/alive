# Task 2B fix round 1 report

Status: DONE. Both Important findings from
`.superpowers/sdd/alive-workspaces-20261026/task-2b-review.md` are repaired and
covered by independent RED/GREEN regressions.

Source base: `d7f8490a783762a7c864f07957e12fce045b4b5d`.
Commit: `db39ab08def38c0b566bfa3823df8d604bc0432d` —
`fix(session): preserve rejected START and chased note ordering`.
Source/index freeze was sent to the controller after committing and before
writing this report. No subsequent production source, test or index changes.

## Changes

Only two files changed:

- `apps/ultra/src-tauri/native/alive_session_clips.hpp`
- `apps/ultra/tests/alive_session_v4_test.cpp`

I1: START now reserves its four placement lookup credits before changing the
candidate's playing state, natural-end position/phase, group membership or
unscheduled flag. If reservation fails, only that request's receipt and the
work rejection observation change. Earlier command reductions remain intact.
Successful reservations and later optional-admission failures retain the
existing charging path; failed reservations perform no lookup and spend no
lookup credit.

I2: each entry in the same fixed 32-record dispatch batch now carries an
explicit `chased` origin alongside its event pointer. Sorting retains event
priority first (termination, then automation), then orders chased note-ons
before ordinary note-ons, then uses the existing deterministic track/device/
pitch/pointer ordering. All v3 records have ordinary origin, preserving their
previous order. Event counts, pre-dispatch admission and reservation, and the
32-record cap are unchanged. No ordinary event is relabeled or reordered to
make the test accidentally match pitch order.

## Separate RED evidence

Evidence directory: `/tmp/alive-workspaces-task2b-fix1`.
`commands.txt` records exact fixture generation, compile/link and run commands.
The two test entry points run independently so neither first failure masks the
other finding. The unchanged d7f8490 production backend was freshly compiled
with the dedicated provisional/trace definitions before implementation edits.

I1 command:

```sh
/tmp/alive-workspaces-task2b-fix1/red-test --start-reservation
```

Exit 134, `i1-red.log`:

```text
rejected-start attempt=15 placement=2114 position=375 phase=375
rejected-start attempt=16 placement=2114 position=0 phase=0
Assertion `after.position == before.position && after.playing == before.playing' failed.
```

The regression uses a valid 375-frame source/song at 120 BPM with one placement
and the real saved subtractive graph. Initial START spends 2054 placement
credits. Fifteen one-frame rejected START callbacks consume another four each,
then the next START reaches the initial reservation-failure path.

I2 command:

```sh
/tmp/alive-workspaces-task2b-fix1/red-test --chase-order
```

Exit 134, `i2-red.log`:

```text
entry occurrence=0 frame=512 note-order=60,64 expected=64,60
Assertion `dispatches[begin + 2].kind == ALIVE_SESSION_NOTE_ON && dispatches[begin + 2].pitch == 64' failed.
```

The actual source now has held pitch 64 before offset O, pitch 61 ending at O,
due automation at O, and ordinary pitch 60 beginning at O. The same source is
placed at an offset and again adjacently, with independent exact-order checks.

## GREEN and regression results

All following final commands returned exit 0, recorded in `exit-statuses.json`:

- Dedicated provisional backend/test compilation with `-std=c++17 -O2 -Wall
  -Wextra -Werror -pthread`, `ULTRA_ALIVE_SESSION_TEST_TRACE`, and
  `ULTRA_ALIVE_SESSION_V4_PROVISIONAL`; `green-build.log`.
- `/tmp/alive-workspaces-task2b-fix1/green-test --start-reservation`;
  `i1-green.log`. All 20 rejected receipts preserve playing state, position,
  phase, occurrence, source, authority and generation. Previously queued mixer
  edits in each batch still apply. Attempts 1..15 each charge four placement
  credits; attempts 16..20 charge none and remain at 2114. No extra note is
  emitted. START succeeds once the unchanged rolling allowance expires.
- `/tmp/alive-workspaces-task2b-fix1/green-test --chase-order`;
  `i2-green.log`. Exact order is note-off 61, automation, chased note-on 64,
  ordinary note-on 60 at both occurrence 0/frame 512 and occurrence 1/frame 1536.
- `/tmp/alive-workspaces-task2b-fix1/green-test`; `v4-green.log`. The complete
  guarded v4 suite passes, including both new regressions, original exact
  dispatch frames/occurrences, all original partitions plus 1/31, the saved
  two-effect chain, silence, chase, Stop, receipts and authenticated edits.
- `cmake --build apps/ultra/build --target ultra_native -j2`;
  `normal-build.log`. Normal library retains its shipping gate.
- Retained normal-library shipping test compile and
  `/tmp/alive-workspaces-task2b-fix1/shipping-test`; `shipping-green.log`.
  Zero v4 features and transactional shipping refusal still pass.
- `bash apps/ultra/tests/ci/check-native.sh`; `native-ci.log`. The complete
  native suite passes: original backend/sequence/canvas/audio checks, v1/v2/v3,
  C layouts, envelope oracle, shipping and provisional tests, measured graph /
  capacity checks, concurrent publication, and original Stop comparison.
  Both Stop cases complete 42 cycles; final comparison passes 43008 samples.
- `git diff --check` passes.

No compiler warnings or errors occur in the retained native build logs.
Existing Rust/UI suites were not repeated: this fix changes neither Rust nor
ABI declarations nor UI. The previously parked Rust runtime `write` warning
remains outside scope. Native CI's inherited timing output is not a new v4
production-admission claim.

## Evidence manifest

- `commands.txt`: exact commands and build flags.
- `exit-statuses.json`: independent RED exits 134/134 and all final GREEN exits 0.
- `source.sha256`: final contents of the two changed source/test files.
- `red-source.sha256`, `red-alive_session_clips.hpp`: pre-fix production header
  from exact d7f8490 used for RED.
- `binaries.sha256`: RED/GREEN provisional backend objects and executables,
  shipping test, normal shared library and actual core bundle.
- `fixtures.sha256`, `saved_graphs.hpp`: real subtractive/utility/stereo-lowpass
  saved sources and generated graph fixtures.
- `normal-flags.make`: normal CMake compile definitions, without provisional gate.
- `scope.json`, `fix.diff`: base/head, freeze and exact two-file scope.

## Self-review and remaining gates

The reservation guard precedes every mutation attributable to a new stopped
START, rather than rolling back the whole candidate and accidentally removing
prior mixer/other reductions. The comparator's origin check follows primary
event priority, so chased notes cannot precede note-offs or automation. All
v3 records retain the original comparator order. The callback guard confirms
no allocation/free/mutex operation from the larger but fixed dispatch record.

No ceilings, ABI layouts, source ownership, publication layout, renderer,
production capability bits or provisional activation rules changed. No UI,
Document, persistence, desktop, PCM, release, launcher or settings work was done.
Task 2C Session/loop/mixed authority and Task 2D complete envelopes, integration
and measured activation remain deferred. Task 3 still owns PCM and zero-root
routing. The provisional admission exception must still be reconciled in 2D.
The original reviewer should perform the scoped re-review; no reviewer was
spawned by this implementer.
