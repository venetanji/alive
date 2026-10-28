#!/usr/bin/env bash
set -euo pipefail
ROOT=${1:?repository root required}
OUT=${2:?new output directory required}
BASE=6f407a488478800b358228c53a73349c8cf72a0d
CANDIDATE=${3:?candidate commit required}
EVIDENCE=$(cd "$(dirname "$0")" && pwd)
git -C "$ROOT" diff --exit-code "$BASE" "$CANDIDATE" -- apps/ultra/core apps/ultra/examples apps/ultra/tests/alive_session_capacity_fixture.hpp apps/ultra/tests/alive_session_v3_fixtures.py
mkdir "$OUT"
for mode in baseline candidate; do
  mkdir "$OUT/$mode"
  if [[ "$mode" == baseline ]]; then commit=$BASE; else commit=$CANDIDATE; fi
  git -C "$ROOT" archive "$commit" apps/ultra/src-tauri/native apps/ultra/core apps/ultra/examples \
    apps/ultra/tests/alive_session_capacity_fixture.hpp apps/ultra/tests/alive_session_v3_fixtures.py | tar -x -C "$OUT/$mode"
  tree="$OUT/$mode/apps/ultra"
  python3 "$tree/tests/alive_session_v3_fixtures.py" "$tree/tests/saved_graphs.hpp"
  c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -c "$tree/src-tauri/native/backend.cpp" -o "$OUT/$mode/backend.o"
  c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -I"$tree/tests" "$EVIDENCE/dense-control-comparison.cpp" \
    "$OUT/$mode/backend.o" "$ROOT/apps/ultra/build/core/libultra_core_bundle.a" -ldl -lrt -o "$OUT/$mode/probe"
done
cmp "$OUT/baseline/apps/ultra/tests/saved_graphs.hpp" "$OUT/candidate/apps/ultra/tests/saved_graphs.hpp"
sha256sum "$EVIDENCE/dense-control-comparison.cpp" "$ROOT/apps/ultra/build/core/libultra_core_bundle.a" \
  "$OUT/baseline/apps/ultra/tests/saved_graphs.hpp" "$OUT/candidate/apps/ultra/tests/saved_graphs.hpp" \
  "$OUT/baseline/backend.o" "$OUT/candidate/backend.o" "$OUT/baseline/probe" "$OUT/candidate/probe" > "$OUT/hashes.txt"
