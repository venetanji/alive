# Windows runner evidence

Source HEAD `da7c6fb30c14a42502461a2ef2f4297b075b34ec`, application source `f69125c`; package run `40762558971`, Windows job `123078046233`, attempt 1, `windows-2022`. The job completed **failure** at `2026-10-28T20:33:34Z`: step 9, package build, failed because the release Windows Rust suite returned 101. The suite reported 275 passed, 9 failed, 4 ignored. The diagnostic is one of the failures. These observations are from this run, not the earlier `f0f7871` run.

## Actual diagnostic child

The original log lines 1906-1948 contain the fresh diagnostic child output. `ALIVE_MASTER_EXPECT_UNAVAILABLE` was absent. The production test anchor and separately declared direct anchor were both `0x7ff9f3335960`; both were in `D:\\a\\alive\\alive\\apps\\ultra\\src-tauri\\target\\x86_64-pc-windows-msvc\\release\\ultra_native.dll`, module `0x7ff9f32b0000`, and equaled that module's `alive_session_state_v2` export. Both diagnostics found all six Master symbols with the same module owner. Both limits calls returned 1, version 1, bytes 24, features 7, ramp 64, max gain 4. Both reported `stage=ok direct_resolve=true`. Nevertheless the same child reported `production capability=false expected=true` and failed its assertion.

This establishes a discrepancy between the explicit diagnostic calls and the cached production result in this child. It does not establish the address or failure stage actually used inside the `OnceLock` initializer, when that cache was initialized, or the mechanism in other test processes. The production test anchor is obtained via `master_test_anchor()`, a separate function from the closure inside `master_capability()`; equality of the measured anchors does not prove the initializer's actual anchor. The observed child gives no support for applying an import-thunk or link-attribute correction. The earlier run's mechanism remains unobserved. No missing export is indicated by this child's successful resolutions.

## Next investigation and fixtures

Before choosing a production correction, instrument the actual cache initializer in a fresh Windows child: record whether it runs and its anchor, owner, export equality and resolver failure stage/limits at the time it executes; capture cache state and ordering before any diagnostic resolver calls, including whether initialization occurred earlier. Compare the initializer's exact result with the later direct calls. If they differ, investigate the specific boundary or timing shown; if already initialized, identify the caller and its context. Preserve the current owner, anchor equality and limits checks pending evidence.

For a correction supported by that evidence, use a fresh-process positive fixture with the real staged Windows DLL that exercises the production cached path and verifies successful resolution, plus fresh-process negative fixtures using explicitly staged old/partial libraries and wrong-owner or incompatible limits where applicable. Assert fail-closed behavior and absence of cross-process cache contamination, then run the complete Windows release suite and staged package checks alongside existing cross-platform checks. No production fix is justified yet.

## Capture and validation

- `gh api repos/{owner}/{repo}/actions/jobs/123078046233` polled at intervals of at least 45 seconds. Initial observation: `in_progress`, step 9; later observation: `completed`, `failure`. `status-20261028T2032Z.json` and `status-latest.json` preserve the later polling observations.
- `gh api repos/{owner}/{repo}/actions/jobs/123078046233/logs` first failed because CLI refused terminal escape sequences; `log-fetch.stderr` retains the message. `gh run view 40762558971 --job 123078046233 --log` also failed while the overall run remained in progress; `view-fetch.stderr` retains that message. `gh api --allow-escape-sequences repos/{owner}/{repo}/actions/jobs/123078046233/logs` succeeded; no workflow was retried.
- `windows-runner-evidence/job-original.log`: 158784 bytes, SHA-256 `f45ced5d40a6a7bc0a7d0516551d2415ca91c0843443180a700c84ed006988b4`. It is UTF-8 text with a BOM, timestamped runner output, diagnostic output and job cleanup, not an API error response.
- `windows-runner-evidence/job-terminal.json`: 3937 bytes, SHA-256 `89b570047e5d521669c9d1244fbd542e584780eabf692e5721c3981e53a9af78`. Parsed JSON identifies the exact job, head, completed status and failure conclusion.

Only read-only source/cloud inspection, bounded status polling and evidence/report writes were performed. No local build, test or runtime probe and no cloud mutation was performed.
