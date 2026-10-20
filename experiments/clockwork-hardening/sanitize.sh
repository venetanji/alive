#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
D="$(cd ../clockwork-faust/.deps && pwd)"
export PATH="$D/cmake-3.31.6-linux-x86_64/bin:$D/rust/bin:$PATH" CARGO_HOME="$D/cargo"
cmake -S . -B build-sanitize -DCMAKE_BUILD_TYPE=Debug -DCMAKE_C_FLAGS='-fsanitize=address,undefined -fno-omit-frame-pointer' -DCMAKE_CXX_FLAGS='-fsanitize=address,undefined -fno-omit-frame-pointer' -DCMAKE_EXE_LINKER_FLAGS='-fsanitize=address,undefined'
cmake --build build-sanitize --target check_core -j "${JOBS:-4}"
ASAN_OPTIONS="${SANITIZER_OPTIONS:-detect_leaks=0}" build-sanitize/check_core
