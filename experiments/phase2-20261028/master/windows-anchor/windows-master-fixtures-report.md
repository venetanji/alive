# Windows Master direct-resolver fixtures

Candidate `8a83d13d4e854d431dd47acaba2ad55ba7083900`, parent `3212065c4b47c068c69e60e8f7a098966f65be4f`. Only the Windows fixture directory and desktop workflow changed. File-scoped [patch](windows-master-fixtures-candidate.patch) SHA-256 `fce345bfd1773f6eb652288145c3e0de71ec8d3bf6d897a841a243fdb640d11f`.

The non-test Rust probe includes production `native_master.rs` unchanged, imports its anchor with DLL metadata, confirms the actual anchor module path and export equality, inspects every symbol's owner, and calls limits when all six symbols exist. It then checks the production resolver result. Separate fresh process directories stage the real release DLL, a complete fixture, old, partial, forwarded-owner, and bad-limits fixtures. The first two expect available; the last four expect unavailable, while additionally asserting each intended topology or limits mismatch. The forwarded target's own mapped path is verified. PowerShell reports source and staged SHA-256, per-symbol mapped owners, configuration and case results; it verifies copied DLL hashes and retains a transcript on case or build failure. CMake uses VS 2022 to build fixtures and vcvars64 initializes only the command child used to compile the probe. The workflow runs the packet after a successful Windows package build and retains the report with `always()`; missing report warns if an earlier step prevented creation. No release binaries are overwritten.

These are direct-resolver tests, not full production cache/host negative tests. The existing full-suite fresh-child test remains the real-DLL production-cache positive. The six cases have not been compiled or run; in particular MSVC forwarder construction, PowerShell quoting, DLL staging/dependency resolution, Rust linkage and owner assertions remain Windows CI risks. The 58057f9 cached-positive failure is a retained RED for the anchor candidate, not a RED run of this new fixture harness. No test-driven red/green runtime claim is made for these fixtures.

Static checks performed: `git diff --check`; Python PyYAML parse of the workflow plus fixture definition symbol counts, forwarded export syntax, probe case/symbol inclusion, production resolver path and workflow `always()` checks; all exited zero. No local compiler, native/Rust/C++ build, runtime, GUI, audio or browser process was used. Context7 consulted: `/kitware/cmake` for VS multi-config output directories and .def source usage; `/microsoftdocs/cpp-docs` for .def forwarded exports and vcvars; `/websites/learn_microsoft_en-us_windows_win32_api` for address-based module ownership/refcount and module paths; `/microsoftdocs/powershell-docs` for native command quoting and exit handling; `/websites/github_en_actions` for `always()` artifact retention. These references do not prove this packet compiles or runs.

SHA-256 candidate files:

```
39fc54d37552500595d3c2abb8402f85aa6d654a5122fc0cd90d115f62330c28  .github/workflows/ultra-desktop.yml
c686890f7e953b06b32a47775255b8f4aac51b6c9647843d407b43f44ae428eb  apps/ultra/tests/windows/CMakeLists.txt
1ded72ea96fca249471e9f44cb01dbf302ba2742a21d11407ec4edca987c015b  apps/ultra/tests/windows/forward_target.def
7daca41ffb81ff99118433d0d175c0633d6bf357fc181524a5dcee368d023270  apps/ultra/tests/windows/forwarded.def
c7bad3da47e1fde720193ca2b9e57de99f5b59a04db2098a090e1b709d88a06f  apps/ultra/tests/windows/full.def
cfcbba0e380386c6920a7e25d9dc6750df6c8333a388f1c83d6d66343343ec37  apps/ultra/tests/windows/master_fixture.c
02ab48d561ee526a871b5c939f787d4d3b81140d1a0a723ac44811625d4ee90c  apps/ultra/tests/windows/master_forward_target.c
cb57f939d0c6c490510d5e9e37084ed7b04776b238284945d7b77d3640b86ee0  apps/ultra/tests/windows/master_resolver_fixtures.ps1
981781dd9bcfa94cc497f42d0f5a742f732d01e82104701cdfcaa5dfc3d612c0  apps/ultra/tests/windows/master_resolver_probe.rs
ffb47c07f4e1cb89660caddda5a3f0978cee8ffa8906b63d3b157893797c3ca5  apps/ultra/tests/windows/old.def
bd8184e1a6735c2ead3813d80c3e2b977c52adc67f9f9147e3cfc542639f2d14  apps/ultra/tests/windows/partial.def
```
