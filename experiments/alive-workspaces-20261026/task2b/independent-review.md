# Task 2B Review

## Spec Compliance

- Issues found: rejected v4 START can commit a rewind, violating candidate transactionality (`apps/ultra/src-tauri/native/alive_session_clips.hpp:972`); combined note-on sorting does not preserve chased-before-ordinary order (`apps/ultra/src-tauri/native/alive_session_clips.hpp:1202`).
- Reviewed the fixed package for `9bf3180665c7beae86ba8e8e72b40c84e7397a2e..d7f8490a783762a7c864f07957e12fce045b4b5d`, both commits, all twelve changed files, the Task 2B brief, the completed implementer report, and the applicable ABI/work/entry-order contract.
- The additive ABI, zero shipping feature bits, native-only admission exception, single scheduler ownership, finite subset, shared reset/render/chase mechanics, and old-mode publication isolation otherwise match this slice. This review does not require 2C/2D, desktop, PCM or production admission work.

## Strengths

- `apps/ultra/tests/alive_session_v4_layout_test.cpp:4` and `apps/ultra/src-tauri/src/session/native_v4.rs:500`: independent C++/Rust assertions cover the specified fourteen sizes, alignments and significant offsets; the Rust defaults distinguish unused zero records from active NONE sentinels.
- `apps/ultra/src-tauri/native/alive_session.hpp:352`: only the active wire payload is published. `apps/ultra/src-tauri/native/alive_session.hpp:357` checks the version inside the coherent read, and `apps/ultra/src-tauri/native/alive_session.hpp:368` selects receipt offsets/stride from that same publication, preserving v3's 16592-byte path and avoiding a v3 copy over v4 receipts.
- `apps/ultra/src-tauri/native/alive_session_clips.hpp:339` and `apps/ultra/src-tauri/native/alive_session_clips.hpp:470`: the measured graph predicate and source/chase mechanics are shared without copying the scheduler. `apps/ultra/src-tauri/native/alive_session_clips.hpp:1137` retains reconstruction reservation before scans; synthetic notes enter the same charged bounded dispatch batch.
- `apps/ultra/src-tauri/native/alive_session_workspaces.hpp:322`: finite pulse preparation is bounded, checks the forced-boundary cap first, covers each width 1..1024, reserves resume-note headroom, and keeps source events in the existing pool.
- `apps/ultra/src-tauri/native/alive_session_workspaces.hpp:546`, `apps/ultra/src-tauri/native/alive_session_workspaces.hpp:671`, and `apps/ultra/tests/ci/check-native.sh:65`: the provisional definition changes admission only and is attached to the dedicated test/object. Normal-library refusal and real saved-device tests exercise separate shipping/provisional paths.

## Issues

### Important: A rejected START can commit a natural-end rewind

- Location: `apps/ultra/src-tauri/native/alive_session_clips.hpp:972`; related commit point `apps/ultra/src-tauri/native/alive_session_clips.hpp:1042`.
- At natural end, START first rewinds `candidate_.position` and track phases at line 965. If `reserve_optional_placement(4)` fails, the new failure branch marks the receipt WORK_LIMIT but sets `candidate_.unscheduled=false`. The later `!candidate_.unscheduled` test therefore accepts and copies the already modified candidate to applied state. Position and phase change even though the request was rejected.
- Concrete reachable trigger: use a valid 375-frame song/source at 120 BPM with one placement. Initial START consumes 4 resolution plus 2050 horizon placement credits. After natural end, issue fifteen STARTs on successive one-frame callbacks before that 1024-frame window expires. Each can spend another 4 resolution credits and then fail the already-used optional guard allowance, reaching 2114 placement credits. The next START fails its initial four-credit reservation and commits position/phase zero while returning WORK_LIMIT. The previous fifteen refusals retain the natural-end position, so the sixteenth changes the installed transport solely because a different rejection branch ran.
- Required fix: reserve lookup work before changing the candidate, or restore all pre-request candidate transport/cursor fields when that reservation fails. Preserve queued-command reduction semantics and charge failed lookup work as appropriate. Add a focused short-song natural-end regression that exhausts placement credits and asserts unchanged applied position, phase, occurrence and playing state for every rejected START.
- Basis: Task 2B requires accepted-only candidate mutation; `docs/superpowers/specs/2026-10-26-alive-workspaces-runtime-contract.md:800` retains candidate batch atomicity. The existing rejected-candidate test stops at an occurrence boundary and reaches optional-admission rejection, not this earlier reservation-failure branch.

### Important: Sorting erases the required chased-before-ordinary note order

- Location: `apps/ultra/src-tauri/native/alive_session_clips.hpp:1202`; test blind spot `apps/ultra/tests/alive_session_v4_test.cpp:161`.
- Synthetic notes are appended before ordinary events at line 1160, but the final combined sort orders both kinds of note-on by track/device/pitch with no synthetic-versus-ordinary rank. A held pitch 64 reconstructed at offset O and an ordinary pitch 60 beginning exactly at O dispatch as ordinary 60, then chased 64. The contract explicitly requires chased notes before ordinary note-ons, each deterministically ordered. This changes the observable event order and voice allocation order for a valid admitted source.
- Required fix: preserve a bounded dispatch-origin/rank alongside each record (or an equivalent explicit ordering), retain termination then automation first, and sort chased note-ons before ordinary note-ons without changing v3 ordering. Extend the boundary test with a chased pitch higher than the due ordinary pitch; assert exact order at both offset entry and adjacent same-source entry.
- Basis: `docs/superpowers/specs/2026-10-26-alive-workspaces-runtime-contract.md:333`. The current fixture chases pitch 60 and starts pitch 62, so its assertions at `apps/ultra/tests/alive_session_v4_test.cpp:189` pass under either ordering.

### Minor: Existing Rust warning remains parked

- `apps/ultra/src-tauri/src/audio.rs:420`: the retained Rust run emits the pre-existing suspicious runtime `write` symbol signature warning (`/tmp/alive-workspaces-task2b/final-rust-session.log:2`). This is unchanged, explicitly out of Task 2B scope, and is not an additional blocking finding or a request for an unrelated fix.

## Evidence And Focused Checks

- Read `/tmp/alive-workspaces-task2b/final-native-ci.log`: native v1/v2/v3, v4 shipping/provisional, C layouts, envelope/capacity, concurrent publication, callback guards and the original Stop comparison pass; the final comparison covers 43008 float samples.
- Read `/tmp/alive-workspaces-task2b/final-provisional.log` and `/tmp/alive-workspaces-task2b/work-trace.log`: all listed partitions pass, exact dispatch frames/source/occurrence checks pass, genuine output and silence checks pass, and seven generated/ordinary dispatches are charged to the scheduled ledger. The two-effect chain is included.
- Read `/tmp/alive-workspaces-task2b/final-shipping.log`, `/tmp/alive-workspaces-task2b/final-rust-session.log`, `/tmp/alive-workspaces-task2b/exit-statuses.json`, and `/tmp/alive-workspaces-task2b/commands.txt`: shipping refusal passes; Rust reports 79 passed, zero failed; the manifest reports all final commands successful and records separate normal/provisional commands.
- Named cross-cutting risk: a new bytewise unused-record check could inspect padding from existing FFI PODs. Checked only the shared DeviceV2/Parameter/EventV2 declarations in `alive_session.h` and `session/native.rs`; their specified fields occupy their complete layouts, so no padding defect was found for the records used here.
- Named cross-cutting risk: v4 could inherit unsafe device fields through the shared device validator. Checked the existing `validate_device` guard at `apps/ultra/src-tauri/native/alive_session.hpp:78`; it checks document bounds, revision, parameter count and reserved device fields before the new validator uses them.
- The package cuts the candidate reducer, optional admission, termination, and sample charging functions mid-function. Read only the missing portions of those functions in `alive_session_clips.hpp` to evaluate failed-candidate mutation, reserved Stop/full-chain cleanup, and reserve-before-chase accounting. No broader source crawl was performed.
- No suites or binaries were rerun, and no source, tests, index, HEAD, settings or build artifacts were changed. The two important findings follow directly from the control flow/comparator; the proposed focused regressions are not claimed as executed evidence.

## Assessment

- Spec compliance: Needs fixes (two important findings).
- Task quality: Needs fixes. The shared architecture and recorded regression evidence are strong, but the rejected-START commit path and exact chase dispatch ordering need correction before this slice is accepted.
- Remaining integration conditions: retain zero shipping capabilities and reconcile/remove the provisional admission exception only with the later measured 2D policy. Full Session/loop authority and PCM are explicitly deferred, not missing Task 2B deliverables.
