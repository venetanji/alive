#!/usr/bin/env bash
set -euo pipefail
ROOT=${1:?repository root required}
OUT=${2:?new output directory required}
mkdir "$OUT"
python3 "$ROOT/apps/ultra/tests/alive_session_v3_fixtures.py" "$OUT/saved_graphs.hpp"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -c "$ROOT/apps/ultra/src-tauri/native/backend.cpp" -o "$OUT/backend.o"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE -c "$ROOT/apps/ultra/src-tauri/native/backend.cpp" -o "$OUT/backend-trace.o"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -I"$OUT" "$ROOT/apps/ultra/tests/alive_session_capacity.cpp" "$OUT/backend.o" "$ROOT/apps/ultra/build/core/libultra_core_bundle.a" -ldl -lrt -o "$OUT/timing"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE -DCAPACITY_GUARDS -I"$OUT" "$ROOT/apps/ultra/tests/alive_session_capacity.cpp" "$OUT/backend-trace.o" "$ROOT/apps/ultra/build/core/libultra_core_bundle.a" -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock -ldl -lrt -o "$OUT/guards"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE -I"$OUT" "$ROOT/apps/ultra/tests/alive_session_v3_measure.cpp" "$OUT/backend-trace.o" "$ROOT/apps/ultra/build/core/libultra_core_bundle.a" -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock -ldl -lrt -o "$OUT/graphs"
