# Windows fixture 58 diagnostic re-review

## Spec Compliance

- **Source-only verdict: compliant**, subject to the runtime limits below. The original command and fixture gates remain unchanged, and the diagnostic is entered only after a nonzero original exit. The saved original exit is thrown after the diagnostic returns.
- **Cannot verify from source:** Windows PowerShell syntax and runtime behavior, delivery and encoding of stdin, inherited stdout/stderr in the runner and transcript, stage and overall exit reporting, and the actual termination of a hung process tree. This verdict does not establish a Windows pass or the cause of the observed path-syntax error.

## Strengths

- `apps/ultra/tests/windows/master_resolver_launcher_diagnostic.ps1:34`-`:46` puts asynchronous input write, flush, and cmd wait under one elapsed-time budget. The explicit cleanup task wait at `:59`-`:63` is separately bounded, so a non-returning `Kill(true)` does not itself cause an unbounded wait. Errors and cleanup timeouts are logged before control returns to the caller.
- `apps/ultra/tests/windows/master_resolver_fixtures.ps1:32`-`:41` retains the original exit across the diagnostic and prevents its normal completion or caught exception from turning the original failure into a fixture pass.

## Issues

### Critical / Important

- None identified from this source-only re-review. The prior finding about an unbounded synchronous wait for the diagnostic stages is addressed by the timed waits. This does not prove all descendants die or that every operating-system operation has a hard deadline.

### Minor

- `apps/ultra/tests/windows/master_resolver_launcher_diagnostic.ps1:27`-`:28`: cmd's inherited output bypasses PowerShell's output pipeline. Its stage output may reach the runner's job log without appearing in the `Start-Transcript` report artifact; verify both destinations on Windows and preserve the job log when interpreting the diagnostic. This does not by itself prevent a comparison if the runner log captures the inherited handles.

## Assessment

**Task quality: Approved for source-only diagnostic review.** The previous blocking wait is bounded in the ordinary supervision paths; the patch expressly reports cleanup failure or timeout rather than claiming process-tree termination. The existing Windows workflow selects `pwsh` (`.github/workflows/ultra-desktop.yml:111`), checked specifically for compatibility risk around the .NET `Kill(bool)` API; exact runner/runtime behavior still needs execution.

**Required runtime checks:** On Windows, exercise successful and failing vcvars/rustc stages and verify their markers and cmd exit in both available logs; exercise stalled stdin, a hung stage and a descendant holding inherited handles; confirm timely original-error reporting, cleanup task behavior, and whether any processes survive. Check `Kill(true)` reflection/expression compilation, pending asynchronous I/O, `Dispose`, native error preferences and non-ASCII/metacharacter paths. Process start, console writes, and OS-level cleanup are not proven strictly bounded by this source. Do not interpret a missing marker as a stage result without checking these conditions.

**Evidence:** Read the updated report and frozen two-file patch, SHA-256 `4495c99cd3c21896dcaf830e8bf38e835c63ce49ba3e805b0cd733ea67d24e7c`. No Windows runtime, suite rerun, build, or resource test was performed; the implementer's verification results were not independently rerun.
