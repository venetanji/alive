# Focused Verification Commands

Working directory: `/home/venetanji/.codex/worktrees/phase2-ui/alive`.
The isolated native build and Rust target are session-owned. Shared developer
library symlinks and existing user application processes are not modified.

## Native

```sh
bash /tmp/alive-live-publish-native-20261031/verify-frozen.sh
```

Build settings and guarded link flags are recorded in `native/README.md`.
Current CI wiring includes `alive_session_publication_test.cpp`; it can be
rebuilt with the existing saved-graph fixture/core-bundle process.

## Rust And Desktop Binaries

```sh
env ULTRA_NATIVE_LIB_DIR=/tmp/alive-piano-live-edit-20261031 \
  CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target \
  cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib --no-run

env LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 \
  /tmp/alive-live-regions-rust-target/debug/deps/ultra_desktop-6951be0eecdd253e \
  session:: --test-threads=1

env ULTRA_NATIVE_LIB_DIR=/tmp/alive-piano-live-edit-20261031 \
  CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target \
  cargo build --manifest-path apps/alive/src-tauri/Cargo.toml
env ULTRA_NATIVE_LIB_DIR=/tmp/alive-piano-live-edit-20261031 \
  CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target \
  cargo build --manifest-path apps/ultra/src-tauri/Cargo.toml --bin ultra
```

The old frozen native directory supplies link-time symbols only; execution
explicitly selects the current owned native library. Publication bindings are
resolved from that actual loaded module. Tests execute directly to avoid Cargo
prepending a shared developer library directory to the loader path.

Alive has its own package. Building only Ultra does not rebuild Alive.
Copy the two current executables and current native library adjacent in the
owned `/tmp/alive-live-regions-app/` before running the desktop harness.

## UI And Actual Desktop

```sh
node --test apps/ultra/ui/alive*.test.mjs

cd apps/ultra/tests/ci
ALIVE_TEST_PORT=4287 ./node_modules/.bin/playwright test \
  --config playwright.config.mjs alive-clip-regions.spec.mjs \
  --output /tmp/alive-regions-browser-delivery
```

From the repository root:

```sh
ULTRA_TEST_ALIVE=1 \
ULTRA_TEST_ALIVE_BINARY=/tmp/alive-live-regions-app/alive \
ULTRA_TEST_ALIVE_SESSION="$PWD/apps/alive/examples/quantized-midi.alive" \
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_regions_desktop.py" \
bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-regions-desktop-audited
```

The desktop harness uses native AT-SPI/XTest, Tauri IPC and private CPAL/PipeWire.
It generates and imports its own stereo WAV; there is no mocked IPC or browser
audio substitute. The browser fixtures separately exercise controller payloads
and layout at 800x600, 1280x800 and 1440x1000.
