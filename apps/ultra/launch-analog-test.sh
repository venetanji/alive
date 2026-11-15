#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [ "$#" -ne 1 ]; then
  printf 'Usage: %s /absolute/path/Analog_64.dll\n' "$0" >&2
  exit 2
fi
ANALOG_RESOURCE=$(realpath "$1")
cmake -S . -B build-analog-test -DCMAKE_BUILD_TYPE=Release \
  -DULTRA_EXTERNAL_DEVICE_EXPERIMENTAL=ON -DULTRA_BUILD_MERGED_ARCHIVE=OFF
cmake --build build-analog-test --target ultra_native -j "${JOBS:-4}"
export ULTRA_NATIVE_LIB_DIR="$PWD/build-analog-test"
cargo build --manifest-path src-tauri/Cargo.toml --release --locked \
  --features native-analog-test --bin ultra-analog-test
export LD_LIBRARY_PATH="$ULTRA_NATIVE_LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
exec src-tauri/target/release/ultra-analog-test "$ANALOG_RESOURCE"
