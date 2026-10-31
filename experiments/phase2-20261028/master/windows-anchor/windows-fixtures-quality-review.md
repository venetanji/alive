# Windows Master fixture quality review

Reviewed candidate `8a83d13d4e854d431dd47acaba2ad55ba7083900` against parent `3212065c4b47c068c69e60e8f7a098966f65be4f`, the supplied fixture diff and producer report. This review is source-only; it does not approve or claim Windows runtime success.

## Findings

No source-blocking findings identified in the candidate packet. The probe includes the unmodified production resolver in non-test mode and links its required anchor explicitly to `ultra_native`. Its real-DLL and complete-fixture cases require successful resolution. Each negative case first checks its actual mapped anchor path, anchor export equality, expected symbol count and ownership, and, where applicable, limits values; a process failure, wrong DLL, wrong topology or unexpected resolver success fails the case. The forwarded case checks the target DLL's mapped path. No production resolver, release script, owner/export/limits check or host behavior is changed.

The script stages each case in a separate new directory, compares the primary staged DLL hash to its intended source, logs DLL hashes and module paths, and does not overwrite the release DLL. The module references acquired by the probe are released; the production resolver retains its own reference while the capability exists. The fixture ABI and x64 Windows configuration appear consistent with the included resolver's calls. CMake and Rust use the workflow's pinned tool installations, and the script checks native build and probe exit codes and aggregates case failures. The Windows report upload uses `always()` and warns when no report was created.

## Limits and follow-up

The fixture step at `.github/workflows/ultra-desktop.yml:109` runs only after earlier steps succeed. In particular, a Windows package or cached-positive test failure skips all fixture cases; the always-run upload may then warn about a missing report. This is a coverage and diagnostics limitation, not evidence that negative cases passed. The packet tests the direct production resolver in fresh processes, not full-host or cached-path negative behavior. The existing full-suite fresh-child positive is independent and remains necessary.

None of the six cases has been built or executed. Windows CI must validate MSVC `.def` forwarding, probe link and command quoting, loader and dependency staging, owner/path checks, transcripts, and exit handling, as well as the real-DLL and complete-fixture positive controls and each specific negative. Verify the full package and actual cached positive separately. These unexecuted checks are runtime risks, not observed source failures.

No tests, builds, native processes, cloud operations, or source mutations were performed for this review.
