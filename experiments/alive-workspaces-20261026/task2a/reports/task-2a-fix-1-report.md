# Task 2A Fix Round 1 Report

## Result And Freeze

- Base: `b34615c`.
- Fix commit: `59c6076` (`Decouple prospective workspace conversion from native v3 admission`).
- Source/index frozen after this commit. Only this local report is written afterward.
- Owned/committed files: `apps/ultra/src-tauri/src/session/clips.rs`, `apps/ultra/src-tauri/src/session/workspaces.rs`, `apps/ultra/src-tauri/src/session/workspaces_tests.rs`.
- No `persistence.rs`, native engine/ABI, UI, capabilities, GUI build, release binary, production flag/global or production test hook change.
- Parent-owned plan/experiment README/evidence changes remain untouched and unstaged by this commit.

## Cause And Fix

Review issue I1 was confirmed: `prospective_from_document` called `to_clips` and `validate_clips`, which query native `clip_capacity`. For v3 text, the old decoder also performed native admission before prospective mapping. Thus candidate conversion incorrectly depended on an admitted v3 profile, including its track/device capacity.

The fix shares the original deterministic musical mapping through the internal pure `Document::map_to_clips()` helper in `clips.rs`. `prospective_from_document` uses that mapping, checks bank/default membership, maps to the existing v4 wire types and validates the full candidate with `ProjectV4::validate()`. It does not query native capacity. The original `Document::to_clips()` keeps its early return for existing v3 and, for legacy conversion, invokes the shared mapping then the unchanged `validate_clips()` admission gate.

The strict original-text v3 wire path is shared through internal `clips::decode_v3_candidate(text)`: it retains the original duplicate-member pass, typed `Wire` decode, required nullable defaults and unknown/missing field rejection. The original app `decode_v3` wrapper still calls that helper then the unchanged native-aware `validate_clips`. `prospective_from_legacy_text` uses a small format discriminator only to choose the full original-text decoder. V3 text uses the shared strict helper then prospective v4 validation; v1/v2 still use the unchanged persistence decoder. V1 therefore retains its existing strict device-source resolution.

Malformed bank membership, absent/cross-track saved defaults, duplicate global identities and v4-invalid candidates continue to reject while preserving the original document. The text API keeps its 1 MiB bound. No decoder constructs a permissive candidate from discarded unknown fields: the discriminator's result only selects the full decoder for the original text.

Public API signatures are unchanged: `prospective_from_document`, `prospective_from_legacy_text`, and the previously implemented model/edit APIs. New helpers are `pub(super)` and do not introduce runtime admission APIs. Graph eligibility, resolved parameter existence/type/range, file/PCM validation and native v4 admission remain mandatory Task 2D gates.

## Behavioral Refusal Test

`prospective_conversion_survives_unavailable_or_smaller_native_v3_admission` is Linux-only and lives entirely in the existing test module. It compiles a temporary C interposer for exactly `alive_session_limits_v3`, then executes the exact Rust test in child processes with `LD_PRELOAD` set only on each child. The real existing engine supplies every other symbol. The interposer returns refusal without inventing a Limits object; for the smaller-profile case it forwards the 2x4 query to the real engine through `dlsym(RTLD_NEXT, ...)`.

Every child first asserts that 8x4 admission refuses. In `none` mode it also asserts `clip_capacity()` refuses; in `small` mode it asserts the real fallback reports two tracks. Each child logs that capability restriction before attempting prospective conversion. A failed-to-load interposer cannot produce a false pass.

The ten child combinations are `none`/`small` admission crossed with `v2-document`, `v3-document`, `v1-text`, `v2-text`, and `v3-text`. V2/v3 candidates use four tracks, exceeding the small native profile while satisfying pure v4 limits. V1 uses the two-track real source-resolving example. Relevant children additionally verify ordinary v2 `to_clips`, v3 `validate_clips` and old v3 app decode still reject; old v1/v2 decoding still succeeds as before. Direct-document cases compare the full original document before/after.

The second new test, `prospective_conversion_keeps_pure_bank_default_and_strict_text_rejections`, checks missing/duplicate/unknown banks, missing/cross-track saved defaults, duplicate identities, exact input continuity, nested duplicate parameter members, missing fields including required nullable defaults, unknown fields and oversized original text.

## Commands And Environment

Working directory: `/home/venetanji/.codex/worktrees/edd5/alive`.

All cargo commands use this prefix:

```sh
env ULTRA_NATIVE_LIB_DIR=/home/venetanji/.codex/worktrees/edd5/alive/apps/ultra/build LD_LIBRARY_PATH=/home/venetanji/.codex/worktrees/edd5/alive/apps/ultra/build
```

Existing engine SHA-256 remains `4c54e3e0a2e7bf2007a56620d1006658e97b86d5f8828e08f13e9ffd3a1e9e70` for `apps/ultra/build/libultra_native.so`; no engine build or replacement is involved.

Exact cargo command suffixes:

```sh
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib session::workspaces::tests::prospective_conversion_survives -- --test-threads=1 --nocapture
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib session::workspaces::tests::prospective_conversion -- --test-threads=1 --nocapture
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib session::workspaces::tests -- --test-threads=1 --nocapture
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib session:: -- --test-threads=1
```

Formatting/check commands:

```sh
rustfmt --edition 2021 --config skip_children=true apps/ultra/src-tauri/src/session/workspaces.rs apps/ultra/src-tauri/src/session/workspaces_tests.rs
rustfmt --edition 2021 --config skip_children=true --check apps/ultra/src-tauri/src/session/workspaces.rs apps/ultra/src-tauri/src/session/workspaces_tests.rs
git diff --check
git diff --cached --check
```

`clips.rs` retains its existing formatting; its narrow extraction is 13 changed lines. Formatting/check commands exit 0. Both final test runs disclose the pre-existing `suspicious_runtime_symbol_definitions` warning at `src/audio.rs:420`; no change is made to that parked warning.

## Red/Green Evidence

New logs are under `/tmp/alive-workspaces-task2a/fix1`; original Task 2A evidence is preserved.

| Log | Run | Result |
| --- | --- | --- |
| `01-red-native-admission.log` | New isolated native admission test before production edits | Parent test fails; nine of ten child scenarios fail with unavailable/smaller-profile admission errors. Small-profile v1 text is the one expected success. |
| `02-red-verified-refusal.log` | Both new tests, still before production edits, with explicit capability-verification and child-command logging | 1 passed, 1 failed at parent level. All child capability checks complete; nine candidate conversions fail from native coupling. Pure rejection test passes. |
| `03-green-native-independence.log` | Both new tests after shared pure extraction | 2 passed, 0 failed; every one of ten capability-verified child scenarios succeeds. |
| `04-green-focused.log` | Final formatted focused workspace suite | 24 passed, 0 failed, 215 filtered; includes all ten successful isolated child cases. |
| `05-green-session-regressions.log` | Final affected session regression suite | 77 passed, 0 failed, 162 filtered; 24 workspace tests plus 53 pre-existing session tests. |
| `06-format-check.log` | Final rustfmt check of owned workspace files | Exit 0, empty output. |

The refusal fixture logs the exact compiler and child executable command. For the targeted green run in `03-green-native-independence.log`:

```sh
cc -shared -fPIC /tmp/alive-v4-native-refusal-261896/refuse-v3-admission.c -ldl -o /tmp/alive-v4-native-refusal-261896/refuse-v3-admission.so
```

The child executable was:

```sh
/home/venetanji/.codex/worktrees/edd5/alive/apps/ultra/src-tauri/target/debug/deps/ultra_desktop-6951be0eecdd253e --exact session::workspaces::tests::prospective_conversion_survives_unavailable_or_smaller_native_v3_admission --nocapture
```

Each child receives `LD_PRELOAD=/tmp/alive-v4-native-refusal-261896/refuse-v3-admission.so`, `ALIVE_TEST_V3_ADMISSION=none` or `small`, and `ALIVE_TEST_V3_INPUT` set to each of the five named inputs. These variables are consumed only by test-module code or its temporary interposer. Runtime-native production code is unchanged. Temporary interposer files are cleaned after child completion; each later run emits its own PID-specific compile/child paths in the retained log.

## Remaining Scope

I1 is addressed for direct documents and every legacy text path. The Linux regression requires `cc` and the existing admitted real 2x4 engine profile to verify forwarding in its smaller-profile scenario. Other platforms retain the portable structural/strict-text tests but do not run the Linux loader-specific refusal test.

No v4 runtime installation, open/Apply/save, graph admission or PCM ownership is asserted. The model remains outside active `Document`; mandatory runtime integration gates remain deferred. Parent-owned independent native CI reproduction and independent spec/quality review are not claimed by this report. No load-bearing implementation concern remains unresolved within this fix scope.
