# Q1 FULL-retry witness triage

Source: `0f3776c87b79069e989c5e5be24312ed455ee3ce`. Scope: the two carried Task 7 P3 witness gaps, not a packet or branch review.

## Actual defects

None found in the inspected paths. Neither residual witness gap blocks the current two-device Q1 scope on this source-based assessment.

## Retry serial ordering

The FULL fixture at `apps/ultra/src-tauri/src/session/desktop.rs:1024` allocates 64 serials and asserts that the first is install + 2; at `:1025` and `:1027` it obtains FULL for gain and reset. The retry at `:1031` verifies the admitted receipt and owner serial agree, but `:1032` compares the retry only to the install serial. It does not directly capture the last queued serial or the refused serials.

The source supports the stronger ordering: `native_master.rs:24` defines a single mutex-protected allocator, `:26` reserves both install and rollback serials, and `:27` and `:31` checked-increment the same counter for every `next_serial`. Both owner requests allocate before calling native and return immediately on refusal (`desktop.rs:141` and `:151`), so the two refused allocations are burned and the successful retry allocation follows them. The exhaustion test at `native_master.rs:266` independently covers pair allocation at the limit, no wrap, and a failed reservation leaving the counter unchanged; it does not directly test the whole FULL sequence.

Native acceptance has complementary, limited evidence: `apps/ultra/tests/alive_session_master_test.cpp:84` queues serials 5 through 68, receives FULL for reset 69, observes 68 after drain, then accepts and observes 70 (`:85`-`:89`). The stop/quiescent sequence at `:132`-`:136` observes queued serial 76 and then immediate serial 77. Native `alive_session.hpp:148` checks nonzero serial and queue admission, but does not itself enforce serial monotonicity; allocation supplies that property. These tests substantiate drain and later native application, not direct proof that the desktop retry exceeded all allocated serials. That remains a nonblocking integration witness limitation, not a demonstrated defect.

## History entry contents

`desktop.rs:1020`-`:1021` creates a tempo history entry; `:1029` compares draft, revision, and `History::view`, whose `history.rs:56`-`:63` contains availability and labels, not entry projections. Thus that assertion alone cannot detect corrupted before/after payloads.

The focused source establishes why the payload is preserved in this scenario: `master_auth` (`desktop.rs:132`) checks authorization, capability, prepared owner and driver retirement; neither it nor `master_gain` or `master_reset` accesses history. Both native failure paths return before their owner mutations (`:147` and `:154`). History is a separate `Control` field, and its mutation APIs are used by edit/history operations (`:208`-`:215`, `:229`-`:234`), not by these master operations. `desktop.rs` and `history.rs` are unchanged between the reviewed candidate `72af9f0031b298d723bd73df3ec84efacd05a600` and this source. Existing independent `pending_history_versions_noops_baseline_redo_and_live_merge` at `desktop.rs:1210` checks undo to baseline and redo to tempo 130 while preserving live fields (`:1216`-`:1217`); `history.rs:87`-`:94` separately exercises target materialization and transactional redo. They support the history mechanism but do not execute undo/redo after FULL. The missing direct post-FULL entry-content witness is nonblocking for the stated scope, and does not establish corruption.

## Limits

Read-only source and existing test inspection only. No tests, builds, native workloads, browser, Wine, audio, or runtime verification were run; no new runtime pass is claimed. The quality review's P3 observations remain accurate as direct witness limitations, rather than production findings. The comparison with the earlier candidate is limited to the cited history and owner source; this is not a review of other changes or broader Q1 readiness.
