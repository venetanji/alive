#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
cd "$ROOT"
NATIVE_BUILD="$ROOT/apps/ultra/build"
if [[ ! -f "$NATIVE_BUILD/libultra_native.so" || ! -f "$NATIVE_BUILD/core/libultra_core_bundle.a" ]]; then
  echo 'Build the native host first: bash apps/ultra/build.sh --native-only' >&2
  exit 1
fi

TEST_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_DIR"' EXIT
python3 apps/ultra/tests/check_backend.py
python3 apps/ultra/tests/check_sequence.py
python3 apps/ultra/tests/check_canvas.py
for test in external_audio document_runtime document_audio signal_audio canvas_numeric_ui_backend canvas_message_ui_backend canvas_print_popup_backend; do
  c++ -std=c++20 -O2 -Wall -Wextra -Werror "apps/ultra/tests/${test}_test.cpp" \
    -L"$NATIVE_BUILD" -lultra_native -Wl,-rpath,"$NATIVE_BUILD" \
    -o "$TEST_DIR/${test}-test"
  "$TEST_DIR/${test}-test"
done

# Static linkage lets the wrappers observe allocation, free and mutex calls
# made inside the backend callback, including calls across the core boundary.
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread \
  apps/ultra/tests/canvas_voice_backend_test.cpp apps/ultra/src-tauri/native/backend.cpp \
  "$NATIVE_BUILD/core/libultra_core_bundle.a" \
  -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock \
  -ldl -lrt -o "$TEST_DIR/canvas-voice-backend-test"
"$TEST_DIR/canvas-voice-backend-test"

c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE \
  apps/ultra/tests/alive_session_test.cpp apps/ultra/src-tauri/native/backend.cpp \
  "$NATIVE_BUILD/core/libultra_core_bundle.a" \
  -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock \
  -ldl -lrt -o "$TEST_DIR/alive-session-test"
"$TEST_DIR/alive-session-test"

c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread \
  apps/ultra/tests/alive_session_v2_test.cpp apps/ultra/src-tauri/native/backend.cpp \
  "$NATIVE_BUILD/core/libultra_core_bundle.a" \
  -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock \
  -ldl -lrt -o "$TEST_DIR/alive-session-v2-test"
"$TEST_DIR/alive-session-v2-test"

c++ -std=c++17 -O2 -Wall -Wextra -Werror \
  apps/ultra/tests/alive_session_v3_layout_test.cpp -o "$TEST_DIR/alive-v3-layout"
"$TEST_DIR/alive-v3-layout"
c++ -std=c++17 -O2 -Wall -Wextra -Werror \
  apps/ultra/tests/alive_session_v4_layout_test.cpp -o "$TEST_DIR/alive-v4-layout"
"$TEST_DIR/alive-v4-layout"
c++ -std=c++17 -O2 -Wall -Wextra -Werror \
  apps/ultra/tests/alive_session_envelope_test.cpp -o "$TEST_DIR/alive-envelope"
"$TEST_DIR/alive-envelope"
c++ -std=c++17 -O2 -Wall -Wextra -Werror \
  apps/ultra/tests/alive_session_workspace_envelope_test.cpp -o "$TEST_DIR/alive-workspace-envelope"
"$TEST_DIR/alive-workspace-envelope"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE \
  -c apps/ultra/src-tauri/native/backend.cpp -o "$TEST_DIR/alive-v3-backend.o"
python3 apps/ultra/tests/alive_session_v3_fixtures.py "$TEST_DIR/saved_graphs.hpp"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -I"$TEST_DIR" \
  apps/ultra/tests/alive_session_v4_shipping_test.cpp \
  -L"$NATIVE_BUILD" -lultra_native -Wl,-rpath,"$NATIVE_BUILD" -o "$TEST_DIR/alive-v4-shipping"
"$TEST_DIR/alive-v4-shipping"
# The provisional definition affects admission only, on this separate object.
# The normal library and the v3 traced backend always retain the shipping gate.
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread \
  -DULTRA_ALIVE_SESSION_TEST_TRACE -DULTRA_ALIVE_SESSION_V4_PROVISIONAL \
  -c apps/ultra/src-tauri/native/backend.cpp -o "$TEST_DIR/alive-v4-backend.o"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread \
  -DULTRA_ALIVE_SESSION_TEST_TRACE -DULTRA_ALIVE_SESSION_V4_PROVISIONAL -I"$TEST_DIR" \
  apps/ultra/tests/alive_session_v4_test.cpp "$TEST_DIR/alive-v4-backend.o" \
  "$NATIVE_BUILD/core/libultra_core_bundle.a" \
  -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock \
  -ldl -lrt -o "$TEST_DIR/alive-v4-test"
"$TEST_DIR/alive-v4-test"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread \
  -DULTRA_ALIVE_SESSION_TEST_TRACE -DULTRA_ALIVE_SESSION_V4_PROVISIONAL -I"$TEST_DIR" \
  apps/ultra/tests/alive_session_v4_midi_test.cpp "$TEST_DIR/alive-v4-backend.o" \
  "$NATIVE_BUILD/core/libultra_core_bundle.a" \
  -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock \
  -ldl -lrt -o "$TEST_DIR/alive-v4-midi-test"
"$TEST_DIR/alive-v4-midi-test"
for test in alive_session_v3_test alive_session_v3_measure alive_session_capacity; do
  c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread -DULTRA_ALIVE_SESSION_TEST_TRACE -DCAPACITY_GUARDS \
    -I"$TEST_DIR" "apps/ultra/tests/${test}.cpp" "$TEST_DIR/alive-v3-backend.o" \
    "$NATIVE_BUILD/core/libultra_core_bundle.a" \
    -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock \
    -ldl -lrt -o "$TEST_DIR/$test"
  "$TEST_DIR/$test" --verify
done

# Preserve the original queued-edit Stop regression against the actual library.
python3 experiments/ultra-astra-validation-20261024/native/run.py "$NATIVE_BUILD" \
  --repo "$ROOT" --output "$TEST_DIR/stop-stress"
