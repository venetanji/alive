# DMG failure diagnostic: quality review

Verdict: **Changes requested** for missing continuous fixture coverage. The pinned review package SHA-256 is `effe9eca6f910b9b3330192d1c4a8cd4d7fbaed952af76e444fe9ac995562ec9` (15,822 bytes). This review did not run macOS commands or establish a real holder or root cause.

## Findings

1. **Medium — diagnostic regression tests never run in CI.** `.github/workflows/ultra-desktop.yml:62` runs the existing release and notices fixtures but does not invoke `apps/ultra/scripts/test_diagnose_dmg.py`. Consequently changes to filtering, limits or failure gating can pass the packaging workflow without running the new checks. Add this suite to an appropriate existing CI validation step. If it runs on every matrix platform, first address the portability issue below.
2. **Medium — the test suite cannot be added unconditionally to the existing cross-platform matrix.** `apps/ultra/scripts/test_diagnose_dmg.py:32` unconditionally creates a symlink, which can require unavailable privileges on Windows, and `apps/ultra/scripts/test_diagnose_dmg.py:89` launches a Python child that calls `os.fork()`, unavailable on Windows. A Windows test run fails independently of diagnostic correctness. Skip only the platform-specific cases where necessary, or provide portable equivalents; keep the remaining fixture coverage running.

## Scope and limitations

The mounted-filesystem selection implicit in `lsof -n -P -F0pcfn -- <mount>` at `apps/ultra/scripts/diagnose_dmg.py:173` and the NUL/newline framing expected by `parse_lsof` at line 132 need evidence for the pinned macOS runner's `lsof`; the fixture supplies synthetic fields and cannot establish command behavior. Confirm against the relevant macOS `lsof` documentation or a separately authorized macOS observation, and retain a representative framed fixture. No claim of incorrect selection is made without that evidence.

The workflow pins Python 3.12.10, including support for the helper's f-string syntax. Review of the bounded reader, shared byte/deadline accounting, scoped path selection and own-process-group cleanup found no additional concrete defect within this review's scope. This was a static review of the immutable package and corresponding working files; no tests or platform probes were run.
