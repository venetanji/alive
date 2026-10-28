# Task 7 FULL final spec review

## Findings

No findings in the scoped change.

## Verdict

PASS for the new witness in immutable candidate `72af9f0031b298d723bd73df3ec84efacd05a600` against `ad314e5843c74fc599b21d9be1748c0a05d8a05a`. The complete one-file, 22-line diff matches the supplied SHA-256 `d4c68b72cbae281f507b57b4ce281539f47a8cf10a1422873007e82e8874d8a5`.

At `apps/ultra/src-tauri/src/session/desktop.rs:1015`, a fresh-process fixture installs the prepared owner, retains a musical draft and history, starts the native live path and fills all 64 usable entries with actual capability calls. It checks structured FULL for gain and reset and compares saved wrapper, dirty flag, accepted serial, draft, revision and history against the pre-refusal state. After stopping I/O it retries gain 0.5, checks both receipt and saved gain, matches receipt serial to the advanced owner serial, checks promotion to V5 and dirty state, and preserves the draft. The first queued serial also confirms the unused install rollback reservation was burned. This addresses the prior missing retry gain and serial assertions. The production paths and other packet changes are outside this review's scope.

## Pending evidence

The worker reports the focused actual-library test passed; this review did not execute tests or native workloads. Final report and controlled profiling comparison remain pending and are not implied by this spec verdict. Existing native packet, ramp and partition reviews are separately recorded in their canonical reviews.
