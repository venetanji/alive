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

# Preserve the original queued-edit Stop regression against the actual library.
python3 experiments/ultra-astra-validation-20261024/native/run.py "$NATIVE_BUILD" \
  --repo "$ROOT" --output "$TEST_DIR/stop-stress"
