# Windows package run at 0f3776c

Run `40782901980`, Windows job `123148786137`, head `0f3776c87b79069e989c5e5be24312ed455ee3ce`, completed failure. The unsigned package build succeeded; fixture CMake built all five fixture DLLs and the forward target. The `Test Windows Master resolver fixtures` step failed, and its report artifact was retained successfully.

## Controlled launcher evidence

At 23:13:39 UTC, the original `cmd.exe /d /s /c` launcher printed `The filename, directory name, or volume label syntax is incorrect.` and returned 1. The expanded command and `native-argument-passing=Windows` are in the log. The diagnostic then used the same resolved vcvars path, rustc path and compilation arguments in a single `cmd.exe /d /q` session via stdin. It recorded `vcvars-exit=0`, `rustc-exit=0`, `cmd-exit=0`, and `probe-exists=True`. This is controlled evidence that the stdin launcher can compile the probe with these parameters on this runner, while the original combined launcher fails. It does not identify the exact parsing operation or prove the general behavior of all paths and environments.

The diagnostic deliberately rethrows `probe compile failed: 1`; consequently none of the `real`, `full`, `old`, `partial`, `forwarded` or `bad_limits` fixture cases executed. A compiled probe is not a fixture pass. The diagnostic completed normally; the timeout and cleanup paths were not exercised.

A minimal proposed harness correction is to use the successful bounded same-process stdin launcher as the primary probe compilation route, propagate its stage/overall failures, require the probe output, and only proceed to the existing six-case loop on success. Preserve its timeout and owned-tree cleanup and then run the actual Windows fixture job. This is a proposal, not an authorized edit or a claim that all failure paths work.

## Separate production evidence

Earlier in the Windows package build, Rust tests reported 284 passed, 4 ignored, including `session::native_master::tests::production_capability_fresh_process_diagnostics` and `resolves_the_loaded_native_image`. The former runs a fresh child and checks the cached capability twice against its environment-dependent expectation; the normal test log captures the pass, not the diagnostic child details. This production cached-capability evidence is distinct from the unrun direct fixture matrix and is not evidence of an interactive full-host or audio qualification. A separate Alive unit test passed. No full-host qualification is established by this job.

## Retained evidence

`experiments/phase2-20261028/master/windows-0f3776c/` contains the exact API responses, deterministic `gzip -n` terminal log, artifact ZIP, commands, errors and hashes. `gh api --include .../jobs/123148786137`, `gh api --allow-escape-sequences .../jobs/123148786137/logs | gzip -n`, `gh api --include .../runs/40782901980/artifacts`, and `gh api .../artifacts/12858992964/zip` each exited 0. The artifact SHA-256 `10d6e3a066b6cb9d29ed0aa995d837de5375b1d4cb4938212e8c4913f5c13c96` matches the API digest. The decompressed original log SHA-256 is `4da564d8e520958127bc8e652da58ea74a7d137e08ae996824becac751697c9a`; the deterministic gzip SHA-256 is `dcc446dc9aa0e33ae3b74f304047db3d6500bbba525acea79b3ba9f89277e212`. No source, ref, cloud, or local runtime mutation was performed.

Raw HTTP receipts are published with lossless gzip to retain their original CRLF bytes. `ORIGINAL_SHA256SUMS` preserves the supplied four-file receipt; its HTTP names refer to decoded bytes. `SHA256SUMS` checks the current stored files; `manifest.json` also records decoded gzip hashes. Uncompressed originals remain in the ignored plan workspace.
