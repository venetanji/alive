#!/usr/bin/env bash
set -euo pipefail
ROOT=${1:?repository root required}
OUT=${2:?new output directory required}
EVIDENCE=$(cd "$(dirname "$0")" && pwd)
mkdir "$OUT"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE \
  -c "$ROOT/apps/ultra/src-tauri/native/backend.cpp" -o "$OUT/backend-trace.o"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE \
  -I"$ROOT/apps/ultra/src-tauri/native" -I"$ROOT/apps/ultra/tests" \
  "$EVIDENCE/v2-master-guard.cpp" "$OUT/backend-trace.o" "$ROOT/apps/ultra/build/core/libultra_core_bundle.a" \
  -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock \
  -ldl -lrt -o "$OUT/v2-master-guard"
"$OUT/v2-master-guard"
