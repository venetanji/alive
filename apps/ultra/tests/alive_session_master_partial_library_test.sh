#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
TEST_BINARY=$(realpath "$1")
OUT=$2
mkdir "$OUT"
cat > "$OUT/exports.map" <<'EOF'
{
  global: *;
  local: alive_session_master_set; alive_session_master_reset_clip;
         alive_session_master_snapshot_v2; alive_session_master_snapshot_v3;
         alive_session_master_snapshot_v4;
};
EOF
c++ -std=c++17 -O2 -fPIC -shared -pthread "$ROOT/apps/ultra/src-tauri/native/backend.cpp" \
  "$ROOT/apps/ultra/build/core/libultra_core_bundle.a" -ldl -lrt \
  -Wl,-soname,libultra_native.so -Wl,--version-script="$OUT/exports.map" -o "$OUT/libultra_native.so"
nm -D --defined-only "$OUT/libultra_native.so" > "$OUT/exports.txt"
rg -q ' alive_session_master_limits$' "$OUT/exports.txt"
if rg -q ' alive_session_master_set$' "$OUT/exports.txt"; then exit 1; fi
ALIVE_MASTER_EXPECT_UNAVAILABLE=1 LD_LIBRARY_PATH="$OUT" "$TEST_BINARY" \
  --exact session::tests::master_old_library_unity_install_and_nonunity_preflight
ALIVE_MASTER_EXPECT_UNAVAILABLE=1 LD_LIBRARY_PATH="$OUT" "$TEST_BINARY" \
  --exact session::desktop::tests::master_old_library_snapshot_exposes_no_observation
