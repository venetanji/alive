### Spec Compliance

- ❌ Issues found: prospective conversion retains an unintended native-v3 admission dependency at `apps/ultra/src-tauri/src/session/workspaces.rs:810`; see Important issue 1. The strict model, focused edits, identity rules, timing checks, and conversion mapping otherwise match this bounded slice and its controller rulings.
- ⚠️ Cannot verify from diff: resolved manifest parameter existence/type/range, graph-family eligibility, actual PCM ownership/playback, runtime authority, preparation order, callback work, and v4 installation/open/save/history integration belong to later tasks. The controller must enforce those gates before enabling v4; this module explicitly defers them at `apps/ultra/src-tauri/src/session/workspaces.rs:1` and `apps/ultra/src-tauri/src/session/workspaces.rs:807`.
- ⚠️ Cannot verify from diff: preservation of every prior app feature, the retained-history 64-entry/8 MiB bounds, and PR #6 draft/release state are unchanged or external requirements. The registration-only existing-code change at `apps/ultra/src-tauri/src/session/mod.rs:9` and the reported session regression evidence support continuity, but do not independently establish every global requirement.

### Strengths

- Original-text duplicate-member checking precedes typed decoding, including nested parameter maps, and both project/edit entry points share it: `apps/ultra/src-tauri/src/session/workspaces.rs:273`, `apps/ultra/src-tauri/src/session/workspaces.rs:308`.
- Timing uses the specified operation order and endpoint differences, with finite arithmetic, suffix constraints, and both beat/frame placement overlap checks; the tests distinguish the rounding-sensitive cases: `apps/ultra/src-tauri/src/session/workspaces.rs:289`, `apps/ultra/src-tauri/src/session/workspaces_tests.rs:655`.
- Edits clone the validated input, check minted IDs against current and reserved identities, validate the whole candidate, and report source-reference IDs without modifying the original: `apps/ultra/src-tauri/src/session/workspaces.rs:935`, `apps/ultra/src-tauri/src/session/workspaces.rs:1267`.
- Migration tests pin deterministic hash outputs and preserve the input while checking authored-ID collisions and null defaults: `apps/ultra/src-tauri/src/session/workspaces_tests.rs:293`. Stored-event boundary and occupied-slot identity tests directly cover the controller rulings: `apps/ultra/src-tauri/src/session/workspaces_tests.rs:463`, `apps/ultra/src-tauri/src/session/workspaces_tests.rs:770`.

### Issues

#### Critical (Must Fix)

- None.

#### Important (Should Fix)

1. `apps/ultra/src-tauri/src/session/workspaces.rs:810`: the proposed pure prospective conversion depends on the currently admitted native v3 profile. `document.to_clips()` invokes `validate_clips()` for v2 inputs, and the explicit next call also invokes it for v3 inputs. The unchanged validator calls `native::clip_capacity()` at `apps/ultra/src-tauri/src/session/clips.rs:77`; `clip_limits()` calls the native ABI and requires `V3_FEATURE_ADMITTED` at `apps/ultra/src-tauri/src/session/native.rs:431`. Consequently a structurally valid v4 candidate can fail solely because the linked native library admits no v3 profile, or only its smaller profile. That contradicts the Task2A ruling that this slice validates pure v4 limits and defers graph/native admission to Task2D, and makes candidate conversion depend on native capability state rather than its document input. Retain the deterministic old musical mapping and all structural rejection, but separate/reuse its pure checks without querying admitted native capacity. Cover conversion under unavailable/smaller v3 admission so it remains candidate-only while Task2D continues to refuse actual installation when appropriate.

#### Minor (Nice to Have)

1. `apps/ultra/src-tauri/src/audio.rs:420`: the final reported test build emits `suspicious_runtime_symbol_definitions` for the existing `write` declaration (`*const u8` versus the expected `*const c_void`). This is pre-existing and outside the owned source slice, so it does not justify expanding Task2A; the controller should track it separately rather than describe the final validation output as pristine. Evidence: `/tmp/alive-workspaces-task2a/11-green-session-regressions.log:2`.

### Assessment

- **Task quality:** Needs fixes.
- **Issue counts:** 0 Critical, 1 Important, 1 Minor (pre-existing warning).
- **Reasoning:** The model and edit implementation is coherent and has substantial behavioral coverage, but prospective migration is still coupled to native-v3 admission despite its pure-candidate contract. Separating that gate is necessary before callers can rely on the advertised API boundary.
- **Checks:** Read the supplied brief, implementation report, final five ruling lines available in `progress.md`, and the review package. The initial package output was truncated mid-validation; read only the missing package ranges to recover the cut-off validation/edit/migration/test hunks. No changed source file was reopened; a narrow package scan supplied exact reference line numbers.
- **Focused unchanged-code checks:** Named risk: reused validation helpers could weaken byte/token/finite constraints; checked `prepare.rs:36`, `prepare.rs:40`, `prepare.rs:296`. Named risk: prospective conversion could inherit admission/schedule behavior from the existing conversion; checked `clips.rs:61`, `clips.rs:71`, and the complete `native.rs:425` profile-query function. The latter establishes Important issue 1.
- **Validation evidence inspected:** `/tmp/alive-workspaces-task2a/11-green-session-regressions.log:18` reports 75 tests; its final result is 75 passed, 0 failed, including 22 workspace tests and the existing session regressions. No tests or suites rerun, and no source/index/git mutation performed.
