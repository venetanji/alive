# DMG Failure Diagnostic: Independent Spec Review

Candidate: `dmg-failure-diagnostic-review-package.txt`, 15,822 bytes, SHA-256 `effe9eca6f910b9b3330192d1c4a8cd4d7fbaed952af76e444fe9ac995562ec9`.

## Findings

- P2 — `.github/workflows/ultra-desktop.yml:62`: The new headless diagnostic tests are not executed in this workflow. The validation step calls only `test_release.py` and `test_notices.py`, so a later regression in mount selection, bounds, or the failure gate can merge while all existing CI checks pass. Run the new test on an appropriate Unix runner or adapt its `os.fork()` and symlink fixture before running it across the matrix.
- P2 — `apps/ultra/scripts/test_diagnose_dmg.py:94`: The workflow test counts substrings rather than testing the conditions' semantics. For example, replacing each diagnostic `if` with `${{ true || (failure() && runner.os == 'macOS' && github.event_name != 'push' && steps.unsigned_build.outcome == 'failure') }}` preserves every counted substring and passes the assertion but runs diagnostics on successful, non-macOS and push jobs. Assert the actual conditions or evaluate a small representative truth table against parsed expressions.

## Verdict and limits

Spec review: changes requested for the coverage gaps above. The candidate otherwise implements the requested failure-only step and separate short-retention upload, leaves signing and publication unchanged, selects target bundle paths by components with symlink-escape rejection, filters reported lsof fields, and applies shared time/byte and probe limits. The original failing build is not suppressed. The mock tests exercise useful selection, parsing, error, and budget cases, but they cannot establish native command behavior.

In particular, the mocked lsof output does not prove that macOS `lsof -n -P -F0pcfn -- <mount>` selects descendant open files or emits the assumed field/path format; this remains a platform verification question, not a confirmed defect. Similarly, holder visibility, permission behavior, and whether the mount survives long enough to probe remain unproven. No native or cloud commands were run in this review.
