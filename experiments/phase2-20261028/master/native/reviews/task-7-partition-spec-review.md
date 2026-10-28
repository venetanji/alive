# Task 7 partition delta spec review

## Findings

No actionable contract defects or new test breakage identified in the scoped delta.

Candidate `ad314e5843c74fc599b21d9be1748c0a05d8a05a` against `4b4687d612cbf3639f15c772b1ce664fd5a09183`; complete one-file diff SHA-256 `85d1c1d3d08e97c48c12c8d4da79a4bb466512fb8ac037736986aba50133be9a`. The witness at `apps/ultra/tests/alive_session_master_test.cpp:100` now sends each requested partition size through the actual external render path, checks its largest requested callback, and checks every stereo sample across 512 frames against the 64-frame formula and subsequent target. The common set boundary follows one rendered frame in each case. The 512-element output buffers cover the largest request, and extending the configured length to 2048 keeps this 513-frame stream within the session. Stop/reset between fixtures preserves isolation; the later immediate-retarget witness remains separately bounded to 64 frames. The changed session length persists into later fixtures, but their assertions do not depend on the prior 256-frame end.

## Evidence gaps and verdict

- This was a read-only source review; no tests, builds, audio, GUI, or native measurements were run. The worker reports a focused actual-library pass; the full changed native suite remains pending.
- Final exact-source native CI, callback deadline/profile, publication and guard evidence remains pending. Foreign-platform build and loader runtime witnesses, final-head CI/packages, Task 8 desktop, physical audio and endurance remain separate gates. Offline partitions do not qualify hardware.

Verdict: no changes requested for this test-only delta on spec review; this is not final acceptance.
