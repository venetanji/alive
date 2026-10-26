#!/usr/bin/env bash
set -euo pipefail
DIR=/tmp/alive-workspaces-task2c-song-loops
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -I"$DIR" apps/ultra/tests/alive_session_v4_shipping_test.cpp apps/ultra/src-tauri/native/backend.cpp apps/ultra/build/core/libultra_core_bundle.a -ldl -lrt -o "$DIR/shipping-test"
"$DIR/shipping-test"
