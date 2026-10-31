### Finding Verdicts

- **I1: prospective conversion depends on native-v3 admission** — ADDRESSED. Direct-document conversion now uses the shared pure `Document::map_to_clips()` mapping at `apps/ultra/src-tauri/src/session/workspaces.rs:810` and `apps/ultra/src-tauri/src/session/clips.rs:66`. The v3-text path uses the shared strict original-text candidate decoder at `apps/ultra/src-tauri/src/session/workspaces.rs:928`, avoiding the native-aware wrapper. V1/v2 text continues through the existing persistence decoder, preserving v1 source resolution. Missing/cross-track saved defaults are explicitly rejected at `apps/ultra/src-tauri/src/session/workspaces.rs:851` before the full v4 model validation.
- **Original app admission behavior** — Preserved by the fix: ordinary legacy `to_clips()` still validates the mapped document at `apps/ultra/src-tauri/src/session/clips.rs:61`; ordinary `decode_v3()` still calls `validate_clips()` at `apps/ultra/src-tauri/src/session/clips.rs:162`. The shared mapping and strict decoder avoid duplicate implementations of legacy conversion or wire semantics.
- **Behavioral evidence for I1** — The test at `apps/ultra/src-tauri/src/session/workspaces_tests.rs:835` first proves that the actual native capability query is unavailable or limited to two tracks, then checks direct v2/v3 documents and v1/v2/v3 text. It also asserts that the old conversion/decode/validation admission gates continue rejecting where appropriate. The temporary interposer is confined to child test processes at `apps/ultra/src-tauri/src/session/workspaces_tests.rs:900`; production native code and flags are untouched.

### New Breakage in the Fix Diff

- None. The extracted mapping retains the original deterministic transformation, and the old validating wrappers retain their previous behavior. The prospective v3 path retains the original duplicate-member pass and typed strict wire decode through `apps/ultra/src-tauri/src/session/clips.rs:165`; its format discriminator only chooses which full original-text decoder runs.
- Malformed-bank/default, duplicate-identity, unknown/missing-field, nested duplicate-parameter and document-size rejection coverage is added at `apps/ultra/src-tauri/src/session/workspaces_tests.rs:977`, including exact input continuity on rejected direct-document conversion.

### Out-of-Scope Observations

- The existing `suspicious_runtime_symbol_definitions` warning at `apps/ultra/src-tauri/src/audio.rs:420` remains disclosed in `/tmp/alive-workspaces-task2a/fix1/05-green-session-regressions.log:1`. It is unchanged and parked by the controller; it does not block this fix round.
- No other out-of-scope observation. The original review's deferred integration requirements remain controller checks for their respective later tasks.

### Verification

- Read the original brief in the initial review and applied its retained scope alongside `task-2a-fix-1-brief.md`, the fix report and the complete fix review package. Reviewed only I1 and the fix diff; no changed source file was reopened. A narrow package scan supplied exact reference line numbers.
- Inspected raw red evidence at `/tmp/alive-workspaces-task2a/fix1/02-red-verified-refusal.log:164`: candidate conversion fails on the unavailable native profile before the fix; the same log records the smaller two-track admission failure at line 255.
- Inspected raw green evidence at `/tmp/alive-workspaces-task2a/fix1/03-green-native-independence.log:24`: all ten capability-verified child combinations succeed; the parent result at line 114 is 2 passed, 0 failed.
- Inspected final run evidence: `/tmp/alive-workspaces-task2a/fix1/04-green-focused.log:136` reports 24 passed, 0 failed; `/tmp/alive-workspaces-task2a/fix1/05-green-session-regressions.log:96` reports 77 passed, 0 failed. No tests or suites rerun, and no source/index/git mutation performed.

### Verdict

- **Spec compliance:** Compliant for this scoped fix; I1 is closed for both direct-document and legacy-text candidate paths.
- **Task quality:** Approved.
- **Fix round:** All findings addressed, no new Critical/Important breakage.
- **Counts:** 1 finding addressed; 0 open findings; 0 new Critical, 0 new Important, 0 new Minor issues; 1 previously parked warning outside the fix scope.
