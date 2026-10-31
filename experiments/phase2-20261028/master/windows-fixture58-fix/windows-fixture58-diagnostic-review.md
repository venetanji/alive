# Windows fixture 58 diagnostic review

## Spec Compliance

- **Issues found.** The failure-only diagnostic has no time bound, so an original failed launch can be replaced by an indefinitely running diagnostic instead of the original failure being reported. See the Important issue below.
- **Cannot verify:** No Windows PowerShell or cmd runtime was available. The stdin pipeline's encoding, line-by-line processing, stage markers and exits, native error behavior, and paths containing shell metacharacters need verification on the actual Windows job. The patch is not evidence of a Windows pass or of the cause of package `58be6da`'s path-syntax failure.

## Strengths

- `apps/ultra/tests/windows/master_resolver_fixtures.ps1:30` and `:31` retain the original command assignment and launch. The failure branch saves the original exit before running the diagnostic and throws that value afterwards (`:32`-`:41`); normal diagnostic exceptions are caught.
- `apps/ultra/tests/windows/master_resolver_launcher_diagnostic.ps1:9`-`:20` uses one cmd process, distinguishes vcvars and rustc stages, and skips rustc after a reported vcvars failure. The patch touches only the two requested test scripts; it leaves the fixture loop and its gates unchanged.

## Issues

### Important

- `apps/ultra/tests/windows/master_resolver_launcher_diagnostic.ps1:24` and `apps/ultra/tests/windows/master_resolver_fixtures.ps1:36`: the synchronous stdin pipeline has no timeout or process termination path. If vcvars, rustc, cmd input processing, or a child process hangs on the already-failing machine, control never reaches the catch or the throw of the saved original exit. The job can remain stuck until an external job timeout, and the original failure is not promptly preserved. Bound the diagnostic and terminate its process tree on timeout, report the timeout, and then throw the saved original failure; ensure output handling cannot itself deadlock.

### Critical / Minor

- None identified.

## Assessment

**Task quality: Needs fixes.** The narrow comparison is useful and preserves the original command in the ordinary completion path, but its unbounded failure path makes the diagnostic unsafe as a failure-preserving addition.

**Runtime limits:** On Windows, exercise successful and failed vcvars/rustc stages, confirm individual and overall exit markers, test stdin closure and path encoding, and force a hung stage to verify bounded cleanup and the final original exit. Check native-command error preferences used by the job: if native failure is promoted to a terminating error, the original invocation may exit before the new branch, or the diagnostic invocation may throw before its cmd-exit marker. Confirm stderr handling and transcript capture on the actual host. These are conditional uncertainties, not claims that the observed failure followed any of these paths.

**Evidence:** Reviewed the supplied report and frozen patch (SHA-256 `59f489448193bcd4c0a2c107b880aa6e6f355e4d85fbda66c94a96141be9794a`); `a31ecfd` and `64fcacd` resolve to the same tree. A focused baseline harness read checked the surrounding failure and fixture gates; no suite or Windows runtime was run. The implementer's reported checks were not independently rerun.
