#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
ROOT=$(cd ../.. && pwd)
D="$ROOT/experiments/clockwork-faust/.deps"
if [ ! -x "$D/rust/bin/cargo" ] || [ ! -f "$ROOT/experiments/faust-reference/.deps/faust-2.88.0/architecture/faust/dsp/dsp.h" ] || [ ! -x "$D/cmake-3.31.6-linux-x86_64/bin/cmake" ] || [ ! -f "$D/clockwork-94b67500c96e105491682ec68741b5018560eab7/CMakeLists.txt" ]; then
 bash "$ROOT/experiments/clockwork-faust/setup.sh"
fi
export PATH="$D/cmake-3.31.6-linux-x86_64/bin:$D/rust/bin:$PATH"
export CARGO_HOME="${CARGO_HOME:-$D/cargo}"
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --target ultra-diagnostic -j "${JOBS:-4}"
if [ "${1:-}" = --native-only ]; then exit 0; fi
export ULTRA_NATIVE_LIB_DIR="$PWD/build"
cargo build --manifest-path src-tauri/Cargo.toml --release --locked
cp build/libultra_native.so src-tauri/target/release/
printf '\nRun %s\n' "$PWD/src-tauri/target/release/ultra"
