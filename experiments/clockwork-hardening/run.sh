#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
D="$(cd ../clockwork-faust && pwd)/.deps"
# Bootstrap exact pinned sources/tools using the original fixture when absent.
[ -x "$D/cmake-3.31.6-linux-x86_64/bin/cmake" ] && [ -f "$D/clockwork-94b67500c96e105491682ec68741b5018560eab7/src/dsp_api.h" ] || (cd ../clockwork-faust && bash setup.sh)
export PATH="$D/cmake-3.31.6-linux-x86_64/bin:$D/rust/bin:$PATH" CARGO_HOME="$D/cargo"
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --target check_core -j "${JOBS:-4}"
build/check_core
