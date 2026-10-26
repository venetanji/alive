#!/usr/bin/env bash
set -euo pipefail
DIR=/tmp/alive-workspaces-task2c-authority-actions/fix-1
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE -DULTRA_ALIVE_SESSION_V4_PROVISIONAL -c apps/ultra/src-tauri/native/backend.cpp -o "$DIR/backend.o"
for name in v4_authority v4_midi v4; do
  c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE -DULTRA_ALIVE_SESSION_V4_PROVISIONAL -I"$DIR" "apps/ultra/tests/alive_session_${name}_test.cpp" "$DIR/backend.o" apps/ultra/build/core/libultra_core_bundle.a -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock -ldl -lrt -o "$DIR/$name-test"
  "$DIR/$name-test"
done
