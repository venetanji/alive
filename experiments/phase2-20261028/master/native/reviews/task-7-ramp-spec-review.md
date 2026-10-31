# Task 7 ramp delta spec review

## Findings

No actionable contract defects identified in the scoped delta.

Candidate `4b4687d612cbf3639f15c772b1ce664fd5a09183` against base `8072edf7763fecba6a1010f5fab0170e99e3ce39`; complete two-file review diff SHA-256 `c7bdf075578b190e083df9b55e4236b587c619b819b8eeecc35cf1e659fedeb3`. The frozen contract requires the specified interpolation for 64 samples, exact target thereafter, and a new target to start from the last rendered coefficient. At `apps/ultra/src-tauri/native/alive_session.hpp:372`, the interpolation remains unchanged; line 373 assigns the exact target only when no ramp remains. The existing boundary reducer applies a new target before rendering and captures the current coefficient, so a command immediately after frame 64 starts from that coefficient rather than the subsequent exact target. The added witnesses cover both paths and partitioned retargeting. This assignment is bounded and does not add allocation, locking, capacity, a clock, or an output stage.

## Evidence gaps and verdict

- Source review only; no tests, builds, audio, GUI, or native measurements were run. Worker-reported red/green, Rust and focused native results are not independent final-source evidence.
- Final exact-source native CI, callback deadline/profile, publication and guard evidence remains pending. Foreign-platform build and loader runtime witnesses, final-head CI/packages, Task 8 desktop, physical audio and endurance remain separate gates.

Verdict: no changes requested for the ramp delta on spec review. This is not final acceptance.
