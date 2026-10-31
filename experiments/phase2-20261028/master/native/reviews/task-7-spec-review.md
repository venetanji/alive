# Task 7 provisional spec review

Candidate: `e8c51aa281b4d3a8bac6b000c09477405977cb74` against `6f407a488478800b358228c53a73349c8cf72a0d`. The complete 25-file binary diff hashes to `7e17bda2a8faf2f9ff08253b111bbf97e7f63079370c928ef04973ffe09699f2`.

Verdict: changes requested; the candidate and final evidence are provisional.

## Findings

1. **P2 - Faulted samples can produce nonzero peaks in an empty observation interval.** `apps/ultra/src-tauri/native/alive_session.hpp:374` records a finite post-gain peak and latch before `apps/ultra/src-tauri/native/backend.cpp:431` rejects an output outside float range. The fault branch breaks before `session.advance` at `backend.cpp:435`, so the published observation end remains at the start frame. The contract requires interval peaks for `[start,end)` and explicitly requires zero peaks when start equals end. The new overload test at `apps/ultra/tests/alive_session_master_test.cpp:160` actually requires nonzero peaks for this fault path but does not check the interval. Consumers can therefore receive an internally inconsistent meter observation and cannot associate the peak with the stated frame interval. Preserve the finite overload/fault distinction while making the interval and its peak semantics consistent with the contract.

2. **P2 - Rollback witness does not prove the first audible sample uses the saved gain.** `apps/ultra/src-tauri/src/session/desktop.rs:971` and `:983` compare two 512-frame buffers produced by the same 0.5 installation path, and only require some sample in the first buffer to be nonzero. A shared initial unity leak or initialization ramp can occur in both buffers and still pass; guarded initial silence also does not prove the first Master-tap sample. The frozen contract and Task 7 clarification require known nonzero hosted PCM at the Master tap, or a properly primed path, and a first-sample 0.5 assertion after failed install and rollback. Add an independent expected-value assertion on the actual rollback path; the separate direct native initialization check does not exercise rollback.

## Evidence still pending

- Final exact-source native/profile measurement and complete worker report, including deadline, guard, allocation/lock and largest v4 publication costs. The stated 285 Rust tests and earlier native/focused results are worker reports, not independently run or final exact-source qualification here.
- macOS and Windows source/crossbuild and actual old/partial/full loader runtime witnesses remain open; no portability claim follows from Linux evidence.
- Final-head CI/packages and Task 8 UI/desktop, physical audio and endurance gates remain separate. This review did not run builds, tests, audio, GUI or measurements.

## Scoped fix-round 1 re-review

Candidate `8072edf7763fecba6a1010f5fab0170e99e3ce39` adds a four-file delta over `e8c51aa`; its binary diff SHA-256 is `ed530a6ead8be46cb3b33b54b7bb791e1d8c37239b7f0d119e6b9b5f210cac41`. Both findings above are resolved in source and test design, with no additional finding in the scoped changes. The output guard now precedes interval peak recording, and the fault witnesses check both an empty interval and a valid prefix while retaining the overload latch. The rollback fixture now asserts the independently expected 0.125 first stereo sample from a constant 0.25 hosted signal at gain 0.5, alongside the serial and gain receipt.

The worker reports red/green fault and rollback mutation witnesses; this review did not run them. Final exact-source measurements, the complete worker report, and foreign-platform runtime evidence remain pending as stated above. This scoped verdict is not final acceptance.
