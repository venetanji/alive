# Windows Master fixture source/spec review

Candidate `8a83d13d4e854d431dd47acaba2ad55ba7083900` against `3212065c4b47c068c69e60e8f7a098966f65be4f`.

## Findings

No source/spec findings identified. This is source review only; it does not approve Windows runtime or package behavior.

## Assessment

- `apps/ultra/tests/windows/master_resolver_fixtures.ps1:35` creates a separate directory and process for each of the six cases. It compares each copied anchor DLL's SHA-256 to its source, logs all staged DLL hashes, rejects a preexisting results directory, and does not replace release binaries or alter persistent environment settings.
- `apps/ultra/tests/windows/master_resolver_probe.rs:41` checks the anchor's mapped canonical path against the case DLL and requires exact anchor/export equality. Lines 49-76 check symbol counts and ownership, forwarded target identity, and the limits values before asserting the actual included production resolver result. These checks distinguish the intended rejection conditions from an arbitrary unavailable result. The forwarded target DLL must actually load and resolve on Windows for this case to pass.
- `apps/ultra/tests/windows/CMakeLists.txt:4` builds fixture variants with isolated release output directories. The C layouts and signatures match the resolver's limits and function ABI for the x64 target; the `.def` files specify old, partial, complete and forwarded export sets. MSVC forwarder construction and output placement remain unverified at runtime.
- `apps/ultra/tests/windows/master_resolver_fixtures.ps1:18` selects the VS 2022 x64 generator; lines 23-32 locate C++ tools and initialize `vcvars64` in the child command for the probe. The workflow installs Rust 1.85.1 and CMake 3.31.6 before invoking it. Configure, build, compile and each probe exit status are checked; per-case exceptions aggregate to failure. Actual PowerShell quoting, link library discovery, dependency loading and tool selection require the Windows runner.
- `.github/workflows/ultra-desktop.yml:109` runs the fixtures after the Windows package build, and line 114 attempts transcript retention even on failure. If an earlier step prevents the script from creating a report, the upload warns rather than fabricating a report. This ordering means a failed release build prevents the fixture step from running.

## Limits

The probe includes the unchanged production resolver as a non-test module and tests direct resolution; it does not exercise the full host or the production cache for negative fixtures. The existing fresh-child full-suite positive is a separate instrumented cache test. Neither these fixtures nor the anchor candidate have a Windows GREEN result in the reviewed evidence. The real staged DLL case and matching full fixture are positive controls; old, partial, forwarded-owner and incompatible-limits cases are source-specified negative controls, not observed passes. Windows execution, release suite and package/staging qualification remain necessary.

Reviewed the exact candidate diff, fixture report, workflow and relevant release staging and native build configuration. No build, test, native process, GUI, audio or cloud action was performed for this review.
