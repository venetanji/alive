#!/usr/bin/env bash
set -euo pipefail
DIR=/tmp/alive-workspaces-task2c-suffix-seek
BASE="$DIR/baseline/apps/ultra"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE -DULTRA_ALIVE_SESSION_V4_PROVISIONAL -c "$BASE/src-tauri/native/backend.cpp" -o "$DIR/exact-base-backend.o"
for name in red-test pending-red-test; do
 c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE -DULTRA_ALIVE_SESSION_V4_PROVISIONAL "$BASE/tests/$name.cpp" "$DIR/exact-base-backend.o" apps/ultra/build/core/libultra_core_bundle.a -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock -ldl -lrt -o "$DIR/exact-base-$name"
done
