#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
bash setup.sh
export PATH="$PWD/.deps/cmake-3.31.6-linux-x86_64/bin:$PWD/.deps/rust/bin:$PATH"
export CARGO_HOME="$PWD/.deps/cargo"
cmake -S . -B build/sanitize -DCMAKE_BUILD_TYPE=RelWithDebInfo \
 -DCMAKE_C_FLAGS='-fsanitize=address,undefined -fno-omit-frame-pointer' \
 -DCMAKE_CXX_FLAGS='-fsanitize=address,undefined -fno-omit-frame-pointer' \
 -DCMAKE_EXE_LINKER_FLAGS='-fsanitize=address,undefined'
cmake --build build/sanitize --target probe -j "${JOBS:-4}"
# Rust staticlib remains the pinned release build; only C/C++ is instrumented.
# LeakSanitizer is unavailable in the ptraced cloud session. Override locally.
ASAN_OPTIONS="${ASAN_OPTIONS:-detect_leaks=0}" PROBE="$PWD/build/sanitize/probe" python3 check.py
