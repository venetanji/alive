# Task 6 worker report: incomplete, not a candidate

Base: e6c5dd79cea2c4b5a704fe81fd69f5ea7519838d. No candidate commit. Worker: /home/venetanji/.codex/worktrees/bb01/alive. Do not merge or accept this work as Task 6.

Tracked working diff (SHA-256 of `git diff --binary` at report creation: 1bf3cd5d224806d2b14788415d393e3ce35a5a9e71f0ed9f3d6ab7cd8707acbd):

- apps/ultra/src-tauri/src/session/clips.rs: exposes existing recursive original-text duplicate scan to persistence and makes its error format-neutral.
- apps/ultra/src-tauri/src/session/persistence.rs: checks input length and scans duplicates before the existing Value parse.
- apps/ultra/src-tauri/src/session/tests.rs: adds escaped duplicate v1 map regression and a v5 envelope acceptance regression.

Red evidence, using bb01 pinned Rust, cargo cache and native library, with CARGO_TARGET_DIR=apps/ultra/src-tauri/target, ULTRA_NATIVE_LIB_DIR=apps/ultra/build and LD_LIBRARY_PATH including that build:

- `cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked bare_legacy_parameter_maps_reject_escaped_duplicate_keys -- --nocapture`: failed as intended: decoder accepted escaped-equivalent duplicate keys (0 passed, 1 failed).
- Same command filtered `v5_envelope_accepts_a_valid_score_and_master`: failed as intended, unsupported envelope (0 passed, 1 failed).
- First build attempt omitted ULTRA_NATIVE_LIB_DIR and failed before tests; an earlier build command with --exact was interrupted before completion.

Green evidence: duplicate test rerun after scan change passed (1 passed, 0 failed), before the later error-message-only edit. The v5 test remains red. No full Rust, Alive, Node, component or native GUI/audio suite has run. Existing warnings were emitted. Untracked original evidence was not changed intentionally.

Remaining: complete SavedSession owner, strict v5 raw envelope, propagation through all score preparation/conversion/history/host/desktop/runtime/probe paths, atomic complete-wrapper Save As, unavailable snapshot DTO, Node model tests, native non-unity preflight refusal and all contract witnesses. Include apps/ultra/tests/check_canvas_desktop.sh staging as well as the source-preparation inventory. Re-run focused and complete suites and self-review before candidate commit. The partial diff must not be treated as a safe standalone implementation of the feature.

Task 7 retains exclusive native capability/ABI/resolver/DSP/IPC gain work and requires its own native lease. Task 8 owns alive-master.mjs and fader/UI; this worker has not touched either. No native GUI/audio was launched, no external state changed, and no portability, timing, endurance or final CI claim is made.


# Candidate update (controller review required)

Base: e6c5dd79cea2c4b5a704fe81fd69f5ea7519838d
Candidate: 30c8fa91253e4ab46b5f5fae48e93f990a830393
Binary diff SHA-256 (`git diff --binary BASE CANDIDATE`): c3fa5885cab594d300dea28364c9c178fe216002422e24533bad6443b8f73f5d

The earlier section records the initial partial stop and is historical; this candidate contains the owner/codec/propagation work. The controller separately assigned the four JS model/Master files to another worker; this candidate does not contain that independent packet. It is not independently reviewed or approved.

## Candidate files

- `apps/alive/README.md`
- `apps/alive/SESSION_CONTRACT.md`
- `apps/ultra/src-tauri/src/audio_instrumentation.rs`
- `apps/ultra/src-tauri/src/session/clips.rs`
- `apps/ultra/src-tauri/src/session/desktop.rs`
- `apps/ultra/src-tauri/src/session/history.rs`
- `apps/ultra/src-tauri/src/session/host.rs`
- `apps/ultra/src-tauri/src/session/master.rs`
- `apps/ultra/src-tauri/src/session/mod.rs`
- `apps/ultra/src-tauri/src/session/persistence.rs`
- `apps/ultra/src-tauri/src/session/prepare.rs`
- `apps/ultra/src-tauri/src/session/prepare_workspaces.rs`
- `apps/ultra/src-tauri/src/session/probe.rs`
- `apps/ultra/src-tauri/src/session/runtime.rs`
- `apps/ultra/src-tauri/src/session/runtime_workspaces.rs`
- `apps/ultra/src-tauri/src/session/tests.rs`
- `apps/ultra/src-tauri/src/session/workspace_edits.rs`
- `apps/ultra/src-tauri/src/session/workspaces.rs`
- `apps/ultra/src-tauri/src/session/workspaces_tests.rs`
- `apps/ultra/tests/check_alive_arrangement.py`
- `apps/ultra/tests/check_alive_capacity.py`
- `apps/ultra/tests/check_alive_clips.py`
- `apps/ultra/tests/check_alive_desktop.py`
- `apps/ultra/tests/check_alive_native_input.py`
- `apps/ultra/tests/check_alive_packaged.py`
- `apps/ultra/tests/check_alive_scene_modes.py`
- `apps/ultra/tests/check_alive_scenes.py`
- `apps/ultra/tests/check_canvas_desktop.sh`
- `apps/ultra/tests/stage_alive_session.py`
- `apps/ultra/tests/test_stage_alive_session.py`
- `apps/ultra/ui/alive-dom.test.mjs`
- `apps/ultra/ui/alive.mjs`

## Evidence

- Initial red witnesses: escaped v1 duplicate parameter key was accepted and v5 envelope was rejected before implementation (0/1 each), as recorded in the historical section. Both then passed.
- Additional read boundary red: `cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked master_read_checks_byte_limit_before_utf8_decoding -- --nocapture` failed with `Cannot read session as UTF-8` instead of the 1 MiB refusal; the final full Rust suite reports this test passing. The raw red log is in worker evidence.
- Focused `master_` tests: nine passed before the final variants/read and New-session witnesses; final complete Rust covers all of them. Raw fixture tests include v1-v4 bare files, v5 variants including eight tracks, gains 0/0.5/1/4, literal duplicate-key negatives, malformed/nested cases and byte limits. Save tests cover rebasing, rename failure, invalid master, size including newline, wire retention and migration feedback. History/conversion tests use a test-only non-unity owner and never install it.
- Final `cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked -- --test-threads=1`: 272 passed, 0 failed, 4 ignored. Final `cargo test --manifest-path apps/alive/src-tauri/Cargo.toml --target-dir "$CARGO_TARGET_DIR" --release --locked -- --test-threads=1`: 1 passed, 0 failed. Used bb01's pinned Rust/Cargo, cargo cache, target, and native build, with process-local ULTRA_NATIVE_LIB_DIR and LD_LIBRARY_PATH. Existing compiler warnings were emitted.
- `node --test apps/ultra/ui/*.test.mjs apps/ultra/ui/components/*.test.mjs`: 573 passed, 0 failed. `node --test apps/ultra/ui/alive-dom.test.mjs`: 93 passed, 0 failed after migration-notice changes. `python3 -m unittest discover -s apps/ultra/tests -p test_stage_alive_session.py`: 1 passed. Fixture checker passed.
- `bash apps/ultra/tests/ci/check-contracts.sh` first stopped at missing system `jsonschema`; a second run passed using an existing Python 3.13 environment containing the exact `apps/ultra/tests/ci/requirements.txt` versions, with bytecode writes disabled. No dependency installation occurred. The script rewrote a tracked generated `native-build.json`; the output was preserved in worker evidence and the initially clean base bytes restored.
- `git diff --check`, `bash -n` for the staging shell and Python consumer AST parsing passed. Logs are in bb01 `.superpowers/sdd/2026-10-28-phase2-live-max/task-6-worker-evidence/`; original untracked evidence remains in place.

## Boundaries and limitations

Production rejects non-unity in both direct `Host::install` and `Control::install` before native or driver retirement, and candidate Open/New preflights before dialog resolution. Tests establish refusal and saved owner/history retention; they do not instrument a real CPAL stop or claim playback behavior. No native GUI/audio was launched. Round trips and score history at non-unity use prepare/save and test-only owner seams; no gain request, native admission, meter observation, serial allocation, DSP, ABI, resolver or fader is implemented. Actual successful gain changes, sticky promotion/no-op semantics and admitted non-unity Apply/rollback require Task 7's native admission and its own native lease. Serialization size failure is tested at the serializer boundary; failure atomicity is also tested at invalid preparation and rename, not with an injected serializer I/O fault. File chooser/dialog cancellation and already-approved effects retain existing tests, with native GUI witnesses still a separate lease. No portability, latency, endurance or final CI qualification claim is made.

Task 7 owns native capability, admission, ABI/resolver, ramp, commands, serials and coherent observations; it must invoke gain/wire/dirty mutation only after actual native admission and retain the `saved_wire` migration feedback bookkeeping. Task 8 owns the fader and eventual `alive-master.mjs` UI; the four JS model/Master files are currently reserved by the controller for its separate Task 6 DTO worker, whose changes must be reviewed/integrated before any Task 8 work. Independent spec and quality review remain controller-owned.


# Fix Round 1: Candidate Update

This section supersedes the earlier candidate identifier. Base: e6c5dd79cea2c4b5a704fe81fd69f5ea7519838d; prior candidate: 30c8fa91253e4ab46b5f5fae48e93f990a830393; fix commit and cumulative candidate: e716e43406cb6b15a9fcd90dc9471d853ef93c74. SHA-256 of `git diff --binary BASE CANDIDATE`: 2bd0298738199287fb80ac6f152aee91548268b39b2545382e3c64a4997a157e.

Conversion notices now distinguish bare v3/v4 scores from v5 files containing those scores. New/Open/startup derive the dirty conversion flag from the actual legacy-to-clips score transition rather than notice text. Workspace conversion retains its wire-specific notice through saves; the immediate UI status makes no incorrect file-format claim. The staging helper unittest is now explicitly run in the existing CI desktop diagnostics list.

Cumulative candidate files:

- `.github/workflows/ultra-ci.yml`
- `apps/alive/README.md`
- `apps/alive/SESSION_CONTRACT.md`
- `apps/ultra/src-tauri/src/audio_instrumentation.rs`
- `apps/ultra/src-tauri/src/session/clips.rs`
- `apps/ultra/src-tauri/src/session/desktop.rs`
- `apps/ultra/src-tauri/src/session/history.rs`
- `apps/ultra/src-tauri/src/session/host.rs`
- `apps/ultra/src-tauri/src/session/master.rs`
- `apps/ultra/src-tauri/src/session/mod.rs`
- `apps/ultra/src-tauri/src/session/persistence.rs`
- `apps/ultra/src-tauri/src/session/prepare.rs`
- `apps/ultra/src-tauri/src/session/prepare_workspaces.rs`
- `apps/ultra/src-tauri/src/session/probe.rs`
- `apps/ultra/src-tauri/src/session/runtime.rs`
- `apps/ultra/src-tauri/src/session/runtime_workspaces.rs`
- `apps/ultra/src-tauri/src/session/tests.rs`
- `apps/ultra/src-tauri/src/session/workspace_edits.rs`
- `apps/ultra/src-tauri/src/session/workspaces.rs`
- `apps/ultra/src-tauri/src/session/workspaces_tests.rs`
- `apps/ultra/tests/check_alive_arrangement.py`
- `apps/ultra/tests/check_alive_capacity.py`
- `apps/ultra/tests/check_alive_clips.py`
- `apps/ultra/tests/check_alive_desktop.py`
- `apps/ultra/tests/check_alive_native_input.py`
- `apps/ultra/tests/check_alive_packaged.py`
- `apps/ultra/tests/check_alive_scene_modes.py`
- `apps/ultra/tests/check_alive_scenes.py`
- `apps/ultra/tests/check_canvas_desktop.sh`
- `apps/ultra/tests/stage_alive_session.py`
- `apps/ultra/tests/test_stage_alive_session.py`
- `apps/ultra/ui/alive-dom.test.mjs`
- `apps/ultra/ui/alive.mjs`

Evidence:

- Rust `conversion_notices_and_saves_match_the_owner_wire` red: the v5 clip conversion still said Save writes v3; green after changes. The witness covers both LegacyScore and V5, v2-to-v3 and v3-to-v4, semantic conversion flag, dirty on workspace conversion, clearing dirty on save, nested score and outer wire, Master unity, and repeated save/notice preservation. It is a headless native-control test, not GUI/audio evidence.
- Node `workspace conversion feedback does not misidentify a v5 envelope as a v4 file` red on the literal UI claim and green after the correction.
- During the first green attempt, the second native case failed at `Host::install` with `Native device 1 installation failed` and rollback failure; a repeat reproduced it. Inspection of `backend.cpp` showed that closing a root retains its admitted graph revision while a new Host restarts local counters. The test now reuses one Host for both cases and cleans roots after both; no production ownership change. Both failed and passing logs are preserved in the worker evidence directory.
- Final full Ultra Rust: 273 passed, 0 failed, 4 ignored, using the pinned worker toolchain and native build, serialized test threads. Alive entrypoint suite: 1 passed, 0 failed. Full Node/component suite: 574 passed, 0 failed. The exact added CI staging command passed 1 test; `git diff --check` passed. Existing Rust warnings remain.
- The prior candidate's full pinned `check-contracts.sh` pass remains documented above; it was not repeated for this limited notice/CI-wiring change. Full Rust and Node/component suites and the newly wired Python test were rerun. No native GUI/audio, push, merge or external changes.

Task 7 native lease and Task 8 UI/fader ownership remain as stated above. The separate Node DTO packet is controller-owned. This fix candidate awaits controller-owned scoped re-review; it is not self-approved.
