# Task 7 Native Master Report

Status: candidate and evidence complete for controller review; acceptance is not claimed. The v3 eight-track practical-buffer observation below includes four deadline excursions that require controller disposition. Foreign-platform runtime witnesses, final integrated-head CI/packages, UI/desktop journeys, physical audio and endurance remain separate gates.

## Identity and scope

- Base: `6f407a488478800b358228c53a73349c8cf72a0d`.
- Candidate: `72af9f0031b298d723bd73df3ec84efacd05a600` in `/home/venetanji/.codex/worktrees/bb01/alive`.
- Commits: `e8c51aa` implementation; `8072edf` fault interval and rollback witness; `4b4687d` exact post-ramp target; `ad314e5` full callback partitions; `e6470ce` owner FULL witness; `72af9f0` retry receipt/owner assertions.
- `git diff --binary 6f407a488478800b358228c53a73349c8cf72a0d 72af9f0031b298d723bd73df3ec84efacd05a600 | sha256sum`: `9249a482684473fbbe2e17e48b33dabc25fdba249a453a5b706733c8cb381dd2`.
- Tracked worktree is clean. The original untracked `.superpowers/sdd/2026-10-28-phase2-live-max/`, `experiments/phase2-20261028/r-u/` and `test-results/` evidence remains present. No Task 8 UI, producer, layout, Node DTO, physical device/settings or licensed application was changed.
- Durable evidence directory: `/home/venetanji/.codex/worktrees/edd5/alive/.superpowers/sdd/2026-10-28-phase2-live-max/task-7-evidence-ad314e5/`. Its `source-and-binary-hashes.txt`, scripts, raw samples, reviewed fixture sources and v4 manifest pin the records below. The directory name reflects the partition candidate at creation; the final head is 72af9f0.

Complete changed-file list:

```text
apps/ultra/src-tauri/native/alive-master-v1.h
apps/ultra/src-tauri/native/alive_session.hpp
apps/ultra/src-tauri/native/alive_session_clips.hpp
apps/ultra/src-tauri/native/alive_session_v3_policy.md
apps/ultra/src-tauri/native/alive_session_v4_policy.md
apps/ultra/src-tauri/native/alive_session_workspaces.hpp
apps/ultra/src-tauri/native/backend.cpp
apps/ultra/src-tauri/src/session/desktop.rs
apps/ultra/src-tauri/src/session/host.rs
apps/ultra/src-tauri/src/session/mod.rs
apps/ultra/src-tauri/src/session/native.rs
apps/ultra/src-tauri/src/session/native_master.rs
apps/ultra/src-tauri/src/session/runtime.rs
apps/ultra/src-tauri/src/session/runtime_workspaces.rs
apps/ultra/src-tauri/src/session/tests.rs
apps/ultra/tests/alive_session_capacity.cpp
apps/ultra/tests/alive_session_master_partial_library_test.sh
apps/ultra/tests/alive_session_master_resolver_test.sh
apps/ultra/tests/alive_session_master_test.cpp
apps/ultra/tests/alive_session_test.cpp
apps/ultra/tests/alive_session_v3_measure.cpp
apps/ultra/tests/alive_session_v3_test.cpp
apps/ultra/tests/alive_session_v4_measure.cpp
apps/ultra/tests/alive_session_v4_test.cpp
apps/ultra/tests/ci/check-native.sh
```

## Implementation and review

The existing `PreparedSession.saved` remains the sole saved score/Master owner. The existing native session and ring carry Master gain/reset, with reserved Stop retained. A same-image optional resolver holds the already-loaded native image, checks all six symbols and capabilities, and fails closed for old, partial or mismatched modules. Score and Master use one bounded publication; callback gain, metering, finite-output guards, FIFO/stopped draining, 64-frame ramps and receipt frames follow the frozen ABI. Control reserves candidate/rollback identities before retirement, updates the owner only on admission, retains the rollback receipt on successful restoration, and exposes generation-checked structured IPC. No eager optional linkage or second production engine is introduced.

The reviewed e8c51aa packet had two spec findings. The fix commits defer interval peak accumulation until a sample passes the final output guard, and use a known 0.25 hosted stereo tap to assert the actual first rollback output is 0.125 at gain 0.5. A further red witness found `0.7 + (0.1 - 0.7)` ends one ULP below 0.1: 4b4687d retains the last rendered coefficient for a command at the boundary and assigns the exact target on the next sample. The partition witness subsequently grew to 512 frames and asserts the requested actual callback size, including 65/127/128/256/512. Independent spec and quality reviews of the implementation and subsequent deltas are recorded in `task-7-spec-review.md`, `task-7-quality-review.md`, `task-7-ramp-{spec,quality}-review.md`, `task-7-partition-{spec,quality}-review.md` and `task-7-full-final-{spec,quality}-review.md` in this SDD directory. The last quality review records two nonblocking test limitations: the retry serial is not compared with every intervening queued/refused allocation, and history comparison uses `History::view` rather than inspecting stored entries. No production finding was reported.

Retained red/green evidence includes: missing actual-library limits red; faulted empty-interval peak red then zero-length and one-valid-frame-prefix green; a deliberately forced unity rollback failing at 0.25 versus required 0.125 then restored green; the 0.7-to-0.1 sample-65 red then green; stale-generation red/green; and the original grouped fresh-Host revision fixture failure followed by fresh-process isolation without relaxing graph revision validation. See `initial-red-transcripts.txt`, `rollback-mutation-red.log`, `ramp-red.log` and the reviewed commits. The owner FULL witness additionally checks structured FULL, accepted serial, saved gain/wire, dirty, draft/history view and successful 0.5 retry.

Context7 Tauri v2 calling-Rust and libloading references were consulted. The pinned Tauri 2.8.5 source in `experiments/clockwork-faust/.deps/cargo/registry/src/index.crates.io-1949cf8c6b5b557f/tauri-2.8.5/src/ipc/{mod.rs,command.rs}` serializes `Result` errors as `InvokeError` values. Pinned libloading 0.8.9 source confirms Unix `this()` searches multiple images and Windows name lookup is ambiguous; its Windows `from_raw` precondition does not name GetModuleHandleExW. The implementation uses an owning platform guard instead.

## Exact-source functional verification

From `/home/venetanji/.codex/worktrees/bb01/alive`:

1. `bash apps/ultra/build.sh --native-only` completed for the 4b native tree, which is byte-identical to 72: `git rev-parse 4b4687d:apps/ultra/src-tauri/native` and `git rev-parse 72af9f0:apps/ultra/src-tauri/native` both return `790b4d7027d88f3920bfb5836249ba0beec724c1`. Core trees both return `ba44ff496cf5aa27671f73622d5a5320494c6ade`. Changes after 4b are confined to Master test code in `desktop.rs` and `alive_session_master_test.cpp`; benchmark and production native inputs are unchanged.
2. `bash apps/ultra/tests/ci/check-native.sh` at ad314e5: exit 0, retained as `native-ci-ad314e5.log`. The only later changes are the two Rust `#[test]` deltas; this native script does not compile `desktop.rs`. It includes real-library ABI/partition/PCM/fault tests, old/partial/collision resolver probes, v2/v3/v4 corpus, forced bounded BUSY/no-write, correlated concurrent score/rejection/Master serial/frame/interval witnesses, callback allocation/free/mutex guards, work/capacity checks and reserved Stop. Native-to-legacy placement remains 0 versus 64 frames in the existing offline guard witness; no physical latency claim follows.
3. `ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build" LD_LIBRARY_PATH="$PWD/apps/ultra/build" cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked --lib --no-run`, followed by `LD_LIBRARY_PATH="$PWD/apps/ultra/build" apps/ultra/src-tauri/target/release/deps/ultra_desktop-6028613c5e5ac959 --test-threads=1`: 286 passed, 4 ignored, exit 0 (`rust-tests-72af9f0.log`). The focused `session::desktop::tests::master_queue_full_preserves_owner_and_allows_retry` also passed at 72. The build emitted existing unused/dead-code and `suspicious_runtime_symbol_definitions` warnings. The Alive companion test binary `apps/ultra/src-tauri/target/release/deps/alive-564692a5c96afcfb --test-threads=1`, pinned with the same `LD_LIBRARY_PATH`, passed 1 test.
4. `bash apps/ultra/tests/alive_session_master_resolver_test.sh`: full, old, partial and dependency-collision Linux fixtures pass; the partial/collision limits function traps if called, demonstrating lookup refusal precedes optional calls. `bash apps/ultra/tests/alive_session_master_partial_library_test.sh <ultra-test-binary> <new-output-dir>` builds a single-engine partial actual library and passes unity install, non-unity refusal and null-observation snapshot. Final test binary was also invoked against both the preserved actual old library and retained partial module: 2/2 pass for each (`old-library-final.log`, `partial-library-final.log`).
5. `cc -std=c11 -Wall -Wextra -Werror -Iapps/ultra/src-tauri/native <evidence>/master-c-layout.c -o /tmp/alive-task7-master-c-layout && /tmp/alive-task7-master-c-layout`: exit 0. Frozen C/C++ assertions and Rust const size/alignment/offset assertions compile. `bash <evidence>/run-v2-guard.sh "$PWD" /tmp/<new-output-dir>`: exit 0, with 63 live sets plus reset, and no callback allocation/free/mutex. The source and reproduction script are retained.

The current pinned native library SHA-256 is `3b031af38becf353fec0fa67722079a369beff30f315541e1204d6990709049b`; the final Rust test executable is `2b79cfd317026d20ad21a337c912c2a71111e688a724915dc2156872837709dc`. `current-loader.log` proves the direct test executable maps `apps/ultra/build/libultra_native.so`. Cargo itself prepended the preexisting adjacent `apps/ultra/src-tauri/target/release/libultra_native.so`, SHA-256 `6cff3b8c852b5cb4122e58c4c805fd19e4c4670028ef03dc0f50fe07434206a4`, which lacks Master; the resolver correctly failed closed (`cargo-old-loader-red.log`). That old artifact was not overwritten. Direct invocation with the scoped library path is essential for reproduction.

## Offline profile and deadline evidence

All timings below use software rendering at 48 kHz on Linux, AMD Ryzen 9 5900HS, 8 cores/16 logical CPUs, with existing scheduler, affinity, services, backend and user settings unchanged. Each timing case uses 1,200 samples; guard cases use 20, with callback allocation/free/mutex wrappers and trace accounting. The 64-command Master case includes a combined score/Master snapshot in its timed envelope. A one-frame or other small offline partition is a DSP test, not a supported hardware-period claim. The v3 capacity/scene runs were 2026-10-29 01:40:24–01:51:47 and 01:52:05–02:00:21 HKT; sampled one-minute load averages were 0.96–1.70 at endpoints. V4 runner was 02:06:56–02:19:49 HKT, endpoint one-minute loads 0.70 and 1.27. A Blender process was seen earlier during exploratory CI; sampled checks at the timing endpoints did not show one. OS scheduling and other host activity were not controlled. These are observed software elapsed times, not physical-underrun, universal deadline or endurance guarantees.

Shipped v3 profile results, from retained `v3-timing.log`, `v3-scenes.log` and `v3-summary.json`:

| Profile / fixture | Practical frames | Samples | Observed overruns | Worst p99.9 / max versus period |
| --- | --- | ---: | ---: | --- |
| Profile 1, 2 tracks / 6 roots | 256 / 512 / 1024 | 31,200 each | 0 / 0 / 0 | 1.900 / 1.953 ms vs 5.333; 2.916 / 3.243 vs 10.667; 4.817 / 5.871 vs 21.333 |
| Profile 2, 4 tracks / 8 roots | 512 / 1024 | 18,000 each | 0 / 0 | 4.624 / 4.721 ms vs 10.667; 6.446 / 8.663 vs 21.333 |
| Profile 2, 8 tracks / 16 roots | 512 / 1024 | 26,400 each | 0 / 4 | 7.869 / 8.623 ms vs 10.667; 21.650 / 24.016 vs 21.333 |

The four profile-2/1024 excursions are all in the 1,200-sample `extended_dense_controls` case, consecutive samples 352–355: 21.540, 21.650, 24.016 and 22.434 ms. Consequently this run does not establish a clean observed pass for every documented practical v3 profile/buffer. The eight-track Master-burst cases themselves record 0/7,200 overruns at each of 512 and 1024 frames, with maxima 5.883 and 16.658 ms. Counts aggregate identically named Master-burst fixtures; retained raw samples and the fixture source provide the scope. The 4-track synthetic combined upper-bound case at the offline 64-frame period overruns 1,200/1,200, max 2.874 ms versus 1.333 ms. The separate instrumented saved/maximal graph run and both v3 guarded runs pass; its synthetic 64-frame maximum is 1.433 ms versus 1.333 ms, while measured 256/1024 maxima are 1.864/4.925 ms.

The v4 runner's `manifest.json` pins e6470ce, its copied native/core/fixture inputs and binaries; the only later 72af9f0 delta changes assertions inside the Rust FULL test. All 15 runner commands exit 0, including focused v4 corpus and guarded work. Shipping profile 1 has zero observed overruns in 108,000 samples at 256/512/1024 (36,000 each). Worst p99.9/max are 2.639/2.848 ms at 256, 4.370/4.668 ms at 512, and 7.582/8.033 ms at 1024. Profile-1 Master bursts, aggregated across the named fixtures, have 0/14,400 overruns at each of those sizes and maxima 0.924/1.699/3.441 ms. Trace family 3 records 64 Master reducer steps for each corresponding v4 Master-burst guard case.

V4 profile 2 remains intentionally non-shipping. Its provisional synthetic probes at 512/1024 record 1,176 overruns across 79,200 samples: 191/1,200 plus-four-voice and 982/1,200 heavy at 512, and 2/1,200 plus-four-voice and 1/1,200 heavy at 1024. These observations do not admit that profile or alter its refusal. One-frame offline cases also overrun and are not hardware qualification. Raw `summary.json`, `work-maxima.json`, runner logs, copied inputs, command receipts and `manifest.json` are in `v4-qualification/`.

At the controller's request, `dense-controlled-72af9f0/` retains a bounded same-host comparison of the exact 8-track/16-root dense-control fixture at 1024 frames. Baseline 6f and candidate 72 use identical generated saved graphs, unchanged fixture/core source, the same core archive, identical `-O2` flags and one comparison harness. Each run warms 64 callbacks, then records 1,200 render-only times; hash and wall-time recording occurs outside the timed interval. Order is baseline/candidate/baseline/candidate:

| Run | Mean | p99.9 | Max | Overruns |
| --- | ---: | ---: | ---: | ---: |
| Baseline 1 | 7.586 ms | 8.720 ms | 9.823 ms | 0/1200 |
| Candidate 1 | 7.850 ms | 9.476 ms | 11.228 ms | 0/1200 |
| Baseline 2 | 7.690 ms | 8.263 ms | 8.951 ms | 0/1200 |
| Candidate 2 | 7.921 ms | 9.525 ms | 10.101 ms | 0/1200 |

All four 1,200-sample PCM-hash sequences are identical. Each comparison starts a fresh process and uses 64 warm-up callbacks; the original long matrix reached the case after other period and workload runs. The repeats therefore do not recreate the full preceding process history. They did not reproduce the original four excursions and do not establish their cause. Candidate means were higher in these short paired runs; scheduling/frequency and system activity were not controlled, so no causal attribution or universal deadline conclusion is made. Source archives, identical generated-fixture hashes, archive/binary hashes, raw samples, per-sample wall timestamps and run load observations are retained.

Reproduce measurements with a fresh output directory, after the native build, from the bb01 root:

```sh
EVIDENCE=/home/venetanji/.codex/worktrees/edd5/alive/.superpowers/sdd/2026-10-28-phase2-live-max/task-7-evidence-ad314e5
bash "$EVIDENCE/build-v3-measure.sh" "$PWD" /tmp/<new-v3-output>
/tmp/<new-v3-output>/guards 20
/tmp/<new-v3-output>/guards --scenes 20
/tmp/<new-v3-output>/timing 1200
/tmp/<new-v3-output>/timing --scenes 1200
/tmp/<new-v3-output>/graphs
python3 apps/ultra/tests/run_alive_workspaces_measurement.py /tmp/<new-v4-output> --samples 1200 --guard-samples 20 --focused
bash "$EVIDENCE/build-dense-comparison.sh" "$PWD" /tmp/<new-comparison-output> 72af9f0031b298d723bd73df3ec84efacd05a600
bash "$EVIDENCE/run-dense-comparison.sh" /tmp/<new-comparison-output>
python3 "$EVIDENCE/summarize-dense.py" /tmp/<new-comparison-output>
```

`build-v3-measure.sh` reproduces the exact flags and inputs of the retained 4b binaries; `git diff --name-only 4b4687d 72af9f0` shows only the two functional test files, and native/core tree IDs and binary hashes are retained. `summarize-v3.py` reads the raw capacity/scene `SAMPLE` rows and retains overrun counts rather than inferring them from p99.9. The interrupted preliminary v3 run is separately retained and excluded from the completed distributions.

## Handoff and resources

No owned native test, build, profiling, audio, GUI or server process remains. The bb01 source/build/cache lease and exclusive offline native-measurement resource are released to the controller; the detached candidate and all evidence remain in place. No physical audio/backend/user settings, licensed app, credentials, persistent environment, deployment, merge, push, tag or release was changed.

Task 8 must remain unleased until the controller resolves the observed v3 deadline excursions and completes its acceptance decision. If accepted, it can consume the frozen generation-authenticated `alive_master` / `alive_master_reset_clip` receipts and `Snapshot.master` fields, respecting accepted-versus-applied serials, coherent/stale observations and structured FULL/BUSY errors. No UI fader, producer or layout is included here. macOS/Windows actual old/partial/full loader runtime witnesses and source/crossbuild review remain open portability gates; local tooling has only the Linux Rust target. Final integrated-head full CI/packages, real desktop/UI, physical audio and endurance remain separate gates.
