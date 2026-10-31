# Task 8 Implementation Report

Baseline: `4209eefdb86c66a3d6ca29ba060a3ed492ccd117`.
Scope: Rust/native-v2 integration, saved chains, desktop instance ownership,
the small existing two-track compatibility view, and associated tests/contract.
No chain controls, piano roll, additional tracks, release mutation or publishing.

## Implementation

- Added exact C-layout v2 device/track/event/config/state PODs and initialized
  version/byte-size headers. Retained v1 PODs and old native suite assertions.
  Rust/native tests verify v1 sizes/offsets and frozen v2 sizes/offsets on 64-bit.
- Canonical session-v2 stores independent `instanceId`, reusable `id`, required
  original-source `sourceSha256`, ordered effects, bases and bypass. Lanes use
  instance ID plus stable parameter key. The table is sorted by instance ID;
  each prepared track contains only instrument/effect table indices.
- Separate strict v1 wire types migrate the original example deterministically:
  `legacy-` plus the first 32 SHA-256 hex characters of track ID, no effects,
  bypass false, instrument-retargeted lanes, original-source fingerprints.
  V2 never infers missing fields; unknown/duplicate fields reject.
- Fingerprinting recursively sorts original JSON object keys before any base
  override, preserving array order and numeric values. Normal prepare/Open/Save
  compares expected hashes. Only migration and explicit Load/Replace capture
  new fingerprints. Errors identify track, instance, path and Replace recovery.
- Save As relocates every instrument/effect path, preserves IDs/hashes/bases,
  protects every dependency, and retains bounded same-directory atomic save.
- Host validates graphs, native values and aggregate density before stopping
  device I/O. Six dense roots use sixteen persistent per-root revision counters;
  successful and failed installation attempts consume revisions. Ownership is
  reset before closing previously owned roots. Rollback uses prepared prior data
  with fresh revisions; mappings publish only after successful application.
- Base/bypass resolves current instance to native document/revision and changes
  saved state only after queue admission. Accepted bases also update prepared
  graph/patch snapshots for rollback without recompile or source rehash.
- Main/editor commands use stable instance IDs. Actual native window bindings
  associate a label with generation and instance; there is no numeric-track or
  caller-label authentication fallback. Snapshot `deviceInstances` provides each
  manifest, owning track and current native device index. An effect editor uses
  its own patch/metadata/base/effective/ownership state.
- Musical drafts compare complete identity/reference/hash/order before merging
  accepted live bases, bypass and mixer by instance ID. Stopped structural
  actions support effect add/remove/reorder and device replacement. Effect
  removal/replacement deletes only that instance's lanes; reorder keeps all.
  Existing instrument Remove explicitly removes its whole track/chain/lanes and
  preserves other tracks, as confirmed by the controller. No instrument-less
  track is retained. This distinction is documented in the session contract.
- Both application resource maps now include Utility and Stereo Lowpass so the
  actual saved-chain probe can run against staged dependencies outside the repo.
  Existing capabilities, file/Quit guards and editor/Wry teardown are retained.

## RED / GREEN Evidence

The first system-cargo attempt lacked `ULTRA_NATIVE_LIB_DIR`; this was setup
failure, not a functional RED. Re-running with the existing built library gave
the intended failures. Early focused debug commands used:

```sh
ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build" \
LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml \
  legacy_read_returns_canonical_v2_with_stable_instance_targets -- --nocapture
```

RED: `left: String("alive-session-v1"), right: "alive-session-v2"`,
0 passed / 1 failed. GREEN after strict migration: 1 passed / 0 failed.

```sh
node --test apps/ultra/ui/alive-model.test.mjs
```

RED for independent same-source effect merge: `0.2 !== 0.4`, 4 passed / 1 failed.
GREEN after instance-ID merge and canonical fixtures: 5 passed / 0 failed.

```sh
ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build" \
LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml \
  rust_host_installs_the_saved_session_without_editor_windows -- --nocapture
```

RED for the required saved-chain proof: `left: Null, right: true` for
`savedChainProof.exactLiveDryAndWarmWet`. GREEN after the real saved-chain
extension: 1 passed / 0 failed, retaining every original proof assertion.

```sh
ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build" \
LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml \
  session::desktop::tests -- --nocapture
```

RED: format-changing musical draft incorrectly admitted; reorder-before-self
returned `Unknown destination instance`. Result: 6 passed / 2 failed.
GREEN after the focused fixes is included in the complete Rust gate below.

Additional focused coverage verifies original v1 migration, strict wire shapes,
source changes versus formatting, hashes before bases, all-effect Save As,
JSON dependency overwrite protection, exact ABI layout, identical references,
automation after chain and manifest parameter reorder, cross-track rejection,
effect-scoped lane deletion, whole-track removal preserving the other track,
fresh instance IDs and actual native editor binding authentication. The future
eight-instrument/nine-effect input rejects at the sixteen-root budget before
dependency reads or fixed-array indexing, despite the active two-track profile.

## Final Verification

All commands exit 0 unless explicitly identified as the environment-only attempt.
Full logs are retained in `/tmp/task8-*.log` for controller receipt collection.

```sh
bash apps/ultra/build.sh --native-only
bash apps/alive/build.sh
```

Actual native and both release applications build. The existing script publishes
the developer shared library via mktemp, copy and atomic rename, preserving any
mapped old inode. Observed native-build inode `6803675`, developer-library inode
`6804807`; both SHA-256:
`693f0acff15caa77b8e572255f9e333bd8254eec2905c19386b38ffd9882a3a1`.

```sh
PATH="$PWD/experiments/clockwork-faust/.deps/rust/bin:$PATH" \
CARGO_HOME="$PWD/experiments/clockwork-faust/.deps/cargo" \
ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build" \
LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked
```

`/tmp/task8-rust.log`: 171 passed, 0 failed, 2 existing ignored; main and doc
targets also pass. A final focused run after adding the future-profile and JSON
overwrite assertions passes all 20 `session::tests` tests
(`/tmp/task8-focused-final.log`). These assertion-only additions do not change
the built app behavior. Desktop session tests bring total session coverage to 30.

```sh
PATH="$PWD/experiments/clockwork-faust/.deps/rust/bin:$PATH" \
CARGO_HOME="$PWD/experiments/clockwork-faust/.deps/cargo" \
ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build" \
LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
cargo test --manifest-path apps/alive/src-tauri/Cargo.toml \
  --target-dir "$PWD/apps/ultra/src-tauri/target" --release --locked
```

`/tmp/task8-alive-rust.log`: 1 passed, including own-app session/editor
capabilities. Only the existing unused `reserve_native` warning remains.

```sh
bash apps/ultra/tests/ci/check-native.sh
```

`/tmp/task8-native.log`: full native gate passes, including untouched v1 sample
assertions, v2 order/bypass/warm state/ownership/reset/admission/overload, callback
allocation/free/lock guards, and original 42-cycle scoped Stop stress for edits
and baseline. Native offsets remain 0/1/31/63/64/127 versus legacy +64 frames.
Full six-device fixture: dense 1024-frame mean `1060.894 us`, seek plus one frame
mean `32.054 us`. These are wall-clock observations, not deadline or future
eight-track capacity claims. Added live wet-to-dry callback-boundary samples and
v1 native size/offset assertions carry both deferred Task 7 coverage items.

```sh
uv run --no-project \
  --with-requirements apps/ultra/tests/ci/requirements.txt \
  bash apps/ultra/tests/ci/check-contracts.sh
```

`/tmp/task8-contracts-pinned.log`: complete contracts gate passes. Primary Node
suite 449 passed / 0 failed. The plain-system-Python attempt stopped at the
missing `jsonschema` environment prerequisite (`/tmp/task8-contracts.log`). An
unversioned uv attempt was interrupted to use the repository's exact pinned
requirements. Neither was a source regression. The one known regenerated
arithmetic native-build receipt was restored to HEAD; no unrelated state was
restored or staged.

```sh
env -u DISPLAY -u WAYLAND_DISPLAY \
  LD_LIBRARY_PATH="$PWD/apps/ultra/src-tauri/target/release" \
  apps/ultra/src-tauri/target/release/alive --session-probe \
  "$PWD/apps/alive/examples/two-instruments.alive" /tmp/alive-task8-final-probe
python3 apps/ultra/tests/check_app_entrypoints.py
```

Actual separate release Alive passes without a display or editor. Original
412452-frame comparison, loop/seek and exact saved boundary proofs remain.
`savedChainProof` uses an actually saved impulse instrument and the real saved
Utility/Stereo Lowpass files through canonical save/read/prepare/native install.
It proves noncommuting order, automation identity after reorder, exact live
wet-to-dry at frame 31, warm wet at frame 64, six-device identical-source
independence, failed prospective graph admission preserving playback/model,
queue rejection preserving bases/bypass, Stop under full queue, stale handles,
and save/reopen exact audio. Wet SHA-256:
`005b7781c71d05b4498f5496f2245da4867988f2e65f7e641b12e31ea55a48ed`;
dry SHA-256:
`a40b8aeaf2fd827c7a29515149eda4469e3372a41dea97f32ee0d33507f92f85`.
App entrypoint/launcher/CLI dispatch checks also pass.

The same binary/library and four dependency files are separately staged under
`/tmp/alive-task8-staged`; its display-free probe runs against that staged session
and dependencies, with output `/tmp/alive-task8-staged/proof` and log
`/tmp/task8-staged-probe.log`.

Controller-run real native desktop regressions on this unchanged release build:

```sh
ULTRA_TEST_ALIVE=1 \
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-task8-desktop
ULTRA_TEST_ALIVE=1 \
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_editor_resources.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-task8-editor-resources
```

Both exit 0. Quick journey receipt: 25.0666667 seconds finite nonzero software
stereo capture, peak 0.3726453483, 512 observed frames at 48 kHz on PipeWire
default_output; recorded stream errors 0, failed false, rejected 0. Separate
Alive and Ultra simultaneous, editor Close/reopen, save/reopen/play, missing
source preserving playback, stopped removal, WM Close/Cancel and Quit/Discard
pass. Editor resource receipt: eight Close/reopen cycles retain one WebKit
worker and the same three PIDs; first closed PSS 450273 KiB / 154 FDs, final idle
486094 KiB / 153 FDs. These are bounded software-audio/short-run observations,
not physical-audio, xrun, leak-freedom or endurance evidence.

## Changed Files

- `apps/ultra/src-tauri/src/session/mod.rs`
- `apps/ultra/src-tauri/src/session/native.rs`
- `apps/ultra/src-tauri/src/session/prepare.rs`
- `apps/ultra/src-tauri/src/session/persistence.rs`
- `apps/ultra/src-tauri/src/session/host.rs`
- `apps/ultra/src-tauri/src/session/desktop.rs`
- `apps/ultra/src-tauri/src/session/probe.rs`
- `apps/ultra/src-tauri/src/session/tests.rs`
- `apps/ultra/ui/alive.mjs`
- `apps/ultra/ui/alive-editor.mjs`
- `apps/ultra/ui/alive-model.mjs`
- `apps/ultra/ui/alive-dom.test.mjs`
- `apps/ultra/ui/alive-model.test.mjs`
- `apps/ultra/tests/alive_session_v2_test.cpp`
- `apps/ultra/src-tauri/tauri.conf.json`
- `apps/alive/src-tauri/tauri.conf.json`
- `apps/alive/SESSION_CONTRACT.md`
- `.superpowers/sdd/PLAN/task-8-report.md`

## Self-Review And Concerns

Reviewed the ID/table/root distinctions, all queue-before-model mutation paths,
original-source hashing versus base-modified rollback data, stopped prospective
validation before I/O stop, revision consumption through partial application,
native window binding authority, chain identity checks in generic drafts,
effect-scoped lanes and the confirmed whole-track removal exception. Existing
file/Quit/history/scoped Stop/capabilities/Wry teardown assertions are retained.
`git diff --check` passes. No functional concern remains from this self-review;
independent controller review remains required before task approval.

Scope limits remain intentional: two tracks and six devices, no chain controls,
no bypass automation/crossfade, no track-count expansion, no endurance or
physical-hardware claim. Parent-owned PLAN/progress/CI receipts and scratch
design notes are excluded from implementation commits.
