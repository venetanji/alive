# Changed files from the PR 12 audited head

Audited base: `11da097c27627a92629632ab62304d799e50099c`.
Current code/helper commit: `c8f4cb3091b9754fa5c94e8a40718e72954aab14`.
Manual CI: https://github.com/venetanji/alive/actions/runs/41381006275 (failed; Arrangement/Master pass, desktop fails; downstream skipped).

This inventory includes the current audit/evidence working changes. Later
report updates do not change the application or acceptance helpers.

## Scope

- Production UI: one `isolation:isolate` property keeps workspace children below shell popups.
- Native Rust: opt-in Arrangement/history diagnostics and action serialization; no engine or DSP source changed.
- Acceptance: coherent request/receipt observation, owned native inputs, layout/lifecycle preconditions and regressions.
- Workflow: diagnostics/helper checks and bounded runtime budgets in the existing manual-only workflow.
- Unrelated dirty research work and PR 12 remain preserved.
- Local build/dependency symlinks are excluded from commits and this source inventory.

## Application And Diagnostics

- `apps/ultra/src-tauri/src/session/desktop.rs`
- `apps/ultra/src-tauri/src/session/runtime_workspaces.rs`
- `apps/ultra/ui/alive-shell.css`

## Acceptance Drivers And Regressions

- `apps/ultra/tests/alive_workspace_navigation.py`
- `apps/ultra/tests/arrangement_observation.py`
- `apps/ultra/tests/check_alive_arrangement.py`
- `apps/ultra/tests/check_alive_clip_observation.py`
- `apps/ultra/tests/check_alive_clips.py`
- `apps/ultra/tests/check_alive_desktop.py`
- `apps/ultra/tests/check_alive_observability.py`
- `apps/ultra/tests/ci/alive-chain.spec.mjs`
- `apps/ultra/tests/test_alive_workspace_navigation.py`
- `apps/ultra/tests/test_arrangement_observation.py`

## Manual CI

- `.github/workflows/ultra-ci.yml`

## Audit, Evidence And Captures

- `docs/ui-review/2026-11-02/AUDIT.md`
- `docs/ui-review/2026-11-02/CAPABILITIES.json`
- `docs/ui-review/2026-11-02/CHANGED-FILES.md`
- `docs/ui-review/2026-11-02/CONTINUATION-PLAN.md`
- `docs/ui-review/2026-11-02/HARDWARE-CHECKLIST.md`
- `docs/ui-review/2026-11-02/captures/browser-both-1280x800.png`
- `docs/ui-review/2026-11-02/captures/browser-both-1440x900.png`
- `docs/ui-review/2026-11-02/captures/browser-both-800x600.png`
- `docs/ui-review/2026-11-02/captures/ci-41381006275-native-arrangement-1280x800.png`
- `docs/ui-review/2026-11-02/captures/ci-41381006275-native-arrangement-1440x900.png`
- `docs/ui-review/2026-11-02/captures/ci-41381006275-native-arrangement-800x600.png`
- `docs/ui-review/2026-11-02/captures/ci-41381006275-transport-popup-1280x800.png`
- `docs/ui-review/2026-11-02/captures/ci-41381006275-transport-popup-1440x900.png`
- `docs/ui-review/2026-11-02/captures/ci-41381006275-transport-popup-800x600.png`
- `docs/ui-review/2026-11-02/captures/ci-desktop-failure-41381006275.png`
- `docs/ui-review/2026-11-02/captures/ci-native-arrangement-1280x800.png`
- `docs/ui-review/2026-11-02/captures/ci-native-arrangement-1440x900.png`
- `docs/ui-review/2026-11-02/captures/ci-native-arrangement-800x600.png`
- `docs/ui-review/2026-11-02/captures/ci-source-disclosure-failure-41377736023.png`
- `docs/ui-review/2026-11-02/captures/ci-transport-popup-1280x800.png`
- `docs/ui-review/2026-11-02/captures/ci-transport-popup-1440x900.png`
- `docs/ui-review/2026-11-02/captures/ci-transport-popup-800x600.png`
- `docs/ui-review/2026-11-02/captures/native-arrangement-1280x800.png`
- `docs/ui-review/2026-11-02/captures/native-arrangement-1440x900.png`
- `docs/ui-review/2026-11-02/captures/native-arrangement-800x600.png`
- `docs/ui-review/2026-11-02/captures/native-seek-blocked-before-fix.png`
- `docs/ui-review/2026-11-02/captures/native-source-disclosure-1280x800.png`
- `docs/ui-review/2026-11-02/captures/native-source-disclosure-1440x900.png`
- `docs/ui-review/2026-11-02/captures/native-source-disclosure-800x600.png`
- `docs/ui-review/2026-11-02/captures/transport-popup-1280x800.png`
- `docs/ui-review/2026-11-02/captures/transport-popup-1440x900.png`
- `docs/ui-review/2026-11-02/captures/transport-popup-800x600.png`
- `docs/ui-review/2026-11-02/evidence/ci-arrangement-41381006275.json`
- `docs/ui-review/2026-11-02/evidence/ci-clip-observation-41374074682.json`
- `docs/ui-review/2026-11-02/evidence/ci-desktop-41374074682.json`
- `docs/ui-review/2026-11-02/evidence/ci-desktop-failure-41381006275.json`
- `docs/ui-review/2026-11-02/evidence/ci-first-gap-41371482057.json`
- `docs/ui-review/2026-11-02/evidence/ci-first-gap-41374074682.json`
- `docs/ui-review/2026-11-02/evidence/ci-history-41374074682.json`
- `docs/ui-review/2026-11-02/evidence/ci-master-41374074682.json`
- `docs/ui-review/2026-11-02/evidence/ci-master-41381006275.json`
- `docs/ui-review/2026-11-02/evidence/ci-measurement-timeout-41374074682.json`
- `docs/ui-review/2026-11-02/evidence/ci-results-41374074682.json`
- `docs/ui-review/2026-11-02/evidence/ci-results-41381006275.json`
- `docs/ui-review/2026-11-02/evidence/ci-return-short-gap.json`
- `docs/ui-review/2026-11-02/evidence/ci-source-disclosure-failure-41377736023.json`
- `docs/ui-review/2026-11-02/evidence/clip-observation-blocked.json`
- `docs/ui-review/2026-11-02/evidence/clip-observation-input-error.json`
- `docs/ui-review/2026-11-02/evidence/clip-observation-normal.json`
- `docs/ui-review/2026-11-02/evidence/clip-observation-write-error.json`
- `docs/ui-review/2026-11-02/evidence/local-clips.json`
- `docs/ui-review/2026-11-02/evidence/local-cpal-capture.json`
- `docs/ui-review/2026-11-02/evidence/local-cpal-probe.log`
- `docs/ui-review/2026-11-02/evidence/local-desktop.json`
- `docs/ui-review/2026-11-02/evidence/local-editor-resources.json`
- `docs/ui-review/2026-11-02/evidence/local-history-repeat.json`
- `docs/ui-review/2026-11-02/evidence/local-history-trace.json`
- `docs/ui-review/2026-11-02/evidence/local-measurements.json`
- `docs/ui-review/2026-11-02/evidence/local-prehistory-input-trace.json`
- `docs/ui-review/2026-11-02/evidence/local-return-first-gap.json`
- `docs/ui-review/2026-11-02/evidence/local-return-outside-gap.json`
- `docs/ui-review/2026-11-02/evidence/local-source-disclosure-arrangement.json`
