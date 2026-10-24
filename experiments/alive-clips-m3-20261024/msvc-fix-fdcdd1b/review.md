# Spec Compliance

- Spec verdict: Approved. The frozen dc76fa9..fdcdd1b diff replaces both failing builtins with portable C++17 unsigned operations, without changing either caller's surrounding logic: `apps/ultra/src-tauri/native/alive_session_clips.hpp:146` and `apps/ultra/src-tauri/native/alive_session_clips.hpp:899`.
- Scope is appropriate: one internal header, its include, the two substitutions, and compile-time checks. The diff changes no ABI, policy, event limit, compiler setting, scene admission, or legacy implementation.
- Platform qualification remains pending: the following pushed-source Windows package job is the controller-owned gate. The retained Linux native test results do not establish MSVC or Windows packaging success.

# Strengths

- `apps/ultra/src-tauri/native/alive_session_bits.hpp:5`: count shifts an unsigned 32-bit value right until zero and adds each low bit exactly once. It returns zero for zero, counts all 32 set bits correctly, and terminates after at most 32 iterations.
- `apps/ultra/src-tauri/native/alive_session_bits.hpp:14`: first explicitly returns 32 for zero; all nonzero inputs produce the least significant set-bit index, including 31 for the highest bit, with at most 31 iterations. No allocation, locking, platform intrinsic, signed shift, or shift by the word width is introduced.
- `apps/ultra/src-tauri/native/alive_session_clips.hpp:899`: the replacement preserves the former nonzero single-track indexing result. Named risk checked outside the correction diff: whether unchanged ingress validation admits zero, multiple, or out-of-range track bits. The retained frozen `task-11-review.diff:1444` rejects out-of-range masks, `task-11-review.diff:1447` rejects zero for track actions, and `task-11-review.diff:1449` rejects multiple bits. The existing two-track admission at `task-11-review.diff:887` limits this callback scan to one iteration; structural eight-track storage would require at most seven. This was a focused historical validation check, not a rereview of the host or a read of mutable source.
- `apps/ultra/tests/alive_session_v3_test.cpp:10`: seven static assertions cover zero, full-width and sparse counts, bit zero, bit 31, and least-set-bit selection for multiple-bit input. These exercise actual constexpr helper behavior and will fail compilation on a regression.

# Issues

- Critical: None.
- Important: None.
- Minor: None.

# Assessment

- Task quality: Approved.
- The implementation is small, deterministic, and preserves the exact mathematical behavior required by both existing callers. Callback work remains fixed and bounded; the preparation-only count is bounded by the mask width.
- Evidence inspected: actual retained MSVC errors at `experiments/alive-clips-m3-20261024/windows-build-dc76fa9/alive-dc76fa9-windows-job.log:963` and `experiments/alive-clips-m3-20261024/windows-build-dc76fa9/alive-dc76fa9-windows-job.log:966`, identifying precisely the two removed builtins.
- Evidence inspected: `/tmp/alive-task11-msvc-fix/build.log` contains no diagnostics; retained `alive_session_v3_test.log`, `alive_session_test.log`, and `alive_session_v2_test.log` report PASS for v3 behavior/callback guards and v1/v2 compatibility. The legacy timing lines are informational wall-clock measurements, not deadline qualification. No builds, tests, GUI, git commands, or source mutations were performed during this review; only this requested report was written.
