# Task 7 FULL final quality review

## Findings

- P3, `apps/ultra/src-tauri/src/session/desktop.rs:1032` (immutable `72af9f0031b298d723bd73df3ec84efacd05a600`): the retry only asserts that its serial exceeds the original install serial. That does not prove it follows the 64 admitted command serials, or that the serials allocated to the two refused requests are not reused. The current allocator advances monotonically, so this is a witness gap rather than a demonstrated production defect. Retain the last queued and refused allocations, or otherwise assert the retry serial is strictly later than them.
- P3, `apps/ultra/src-tauri/src/session/desktop.rs:1029` (same immutable candidate): comparing `history.view()` checks undo/redo availability and labels, but `History::view` omits the stored entries and their contents. Corruption of the pending history entry could therefore escape this preservation witness. Compare the underlying history state or exercise undo and redo against the expected scores.

## Verdict

PASS with the above nonblocking witness limitations for the scoped 22-line test delta, SHA-256 `d4c68b72cbae281f507b57b4ce281539f47a8cf10a1422873007e82e8874d8a5`, versus `ad314e5843c74fc599b21d9be1748c0a05d8a05a`. No production defect or new breakage found in scope. The fresh subprocess isolates the native globals; external start sets the actual live flag without a rendering callback, all 64 capability calls admit into the 64-usable-entry ring, and gain and reset return FULL. The test compares the entire saved wrapper, dirty state, draft and revision, accepted serial, and visible history state after refusal. Stop drains the queued commands and the retry reaches the quiescent path; receipt and saved gain both equal 0.5, receipt and owner serial agree, wire promotes to V5, dirty is set, and the draft remains. The first queued serial verifies the reserved rollback serial was burned. Native reset and document closure provide cleanup in the subprocess.

## Pending evidence

This review did not run tests, builds, or native workloads. The worker reports the focused actual-library test passed; its final report and controlled baseline profiling remain pending. The earlier native packet, ramp, and partition reviews remain separate evidence.
