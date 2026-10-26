# Task 2B Fix Round 1 Review

## Finding Verdicts

- **I1: Failed START lookup reservation commits rewind - ADDRESSED.** `apps/ultra/src-tauri/native/alive_session_clips.hpp:964` reserves placement work before changing candidate playing state, position, phase, group membership or unscheduled status. Its failure changes the rejected receipt and rejection counter, then continues without overwriting the candidate or undoing earlier reductions. The regression at `apps/ultra/tests/alive_session_v4_test.cpp:398` reaches both later optional-admission refusal and initial lookup-reservation refusal; its explicit credit assertion at `apps/ultra/tests/alive_session_v4_test.cpp:433` distinguishes the paths. It checks retained transport/cursor identity, no extra dispatch, preserved earlier mixer edits, and successful restart after allowance expiry.
- **I2: Combined sorting loses chased-before-ordinary order - ADDRESSED.** `apps/ultra/src-tauri/native/alive_session_clips.hpp:1151` adds explicit origin to the fixed 32-record batch. `apps/ultra/src-tauri/native/alive_session_clips.hpp:1214` orders chased records first only after primary event priority, retaining termination/automation precedence and the existing track/device/pitch/pointer ordering within each origin. Ordinary records remain ordinary, so v3 retains its former ordering. The reversed-pitch checks at `apps/ultra/tests/alive_session_v4_test.cpp:203` and `apps/ultra/tests/alive_session_v4_test.cpp:208` assert chased 64 before ordinary 60 at both offset and adjacent occurrence entry.

## New Breakage In The Fix Diff

- None found. The reservation move preserves prior candidate reductions; the bounded dispatch record retains the original count checks, event charge and admission before dispatch. No ABI, publication, ceilings, shipping gate or renderer changes appear in the two-file diff.

## Verification Evidence

- Reviewed the fix brief, completed `task-2b-fix-1-report.md`, and fixed review package for `d7f8490a783762a7c864f07957e12fce045b4b5d..db39ab08def38c0b566bfa3823df8d604bc0432d`. Inspection remained scoped to I1, I2 and the fix diff.
- `/tmp/alive-workspaces-task2b-fix1/i1-red.log:16` reproduces attempt 16 changing position/phase from 375 to zero. `/tmp/alive-workspaces-task2b-fix1/i1-green.log:16` preserves both at 375; attempts 16 through 20 remain at 2114 placement credits, and the regression completes successfully.
- `/tmp/alive-workspaces-task2b-fix1/i2-red.log:1` reproduces incorrect ordinary 60 then chased 64. `/tmp/alive-workspaces-task2b-fix1/i2-green.log:1` and `/tmp/alive-workspaces-task2b-fix1/i2-green.log:2` show correct 64,60 order at frames 512 and 1536.
- `/tmp/alive-workspaces-task2b-fix1/exit-statuses.json` records independent RED exits 134/134 and all final GREEN exits zero. `/tmp/alive-workspaces-task2b-fix1/v4-green.log:40` completes the guarded v4 suite; `/tmp/alive-workspaces-task2b-fix1/shipping-green.log:1` confirms shipping admission stays disabled.
- `/tmp/alive-workspaces-task2b-fix1/native-ci.log:69` confirms original v3 coverage passes; `/tmp/alive-workspaces-task2b-fix1/native-ci.log:95` confirms concurrent publication coverage passes; the original Stop/baseline checks each complete 42 cycles and `/tmp/alive-workspaces-task2b-fix1/native-ci.log:99` reports the 43008-sample comparison passes. No warning/error matches occur in the inspected GREEN/native build output.
- No suites were rerun, no new probe was needed, and no source, tests, index, HEAD, settings or build artifacts were changed by this review.

## Out-Of-Scope Observations

- None new. The previously parked Rust `audio.rs:420` warning remains outside this two-file fix and does not block this verdict; no untouched-code review was reopened.

## Verdict

- Fix round: All findings addressed, no new Critical/Important breakage.
- Spec compliance: Approved for this fix round and the previously reviewed Task 2B slice.
- Task quality: Approved for this fix round; the original review's two Important findings are closed.
- Open blocking findings: 0. New nonblocking findings: 0.
- Existing scope conditions remain: Task 2B is a bounded native test-admitted MIDI slice; production feature bits remain zero, and the later 2D gate reconciliation is still required.
