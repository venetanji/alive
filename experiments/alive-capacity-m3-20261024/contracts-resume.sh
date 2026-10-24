#!/usr/bin/env bash
set -euo pipefail
python3 experiments/max-reference/scripts/verify.py
python3 experiments/max-reference/list-runtime-20261021/verify.py
python3 experiments/max-reference/list-runtime-20261021/compare-native.py
PYTHONDONTWRITEBYTECODE=1 python3 experiments/max-reference/signal-runtime-20261021/verify.py
python3 experiments/max-reference/signal-runtime-20261021/compare-native.py
PYTHONDONTWRITEBYTECODE=1 python3 experiments/max-reference/hierarchy-reference-20261021/test_verify.py
PYTHONDONTWRITEBYTECODE=1 python3 experiments/max-reference/hierarchy-reference-20261021/verify.py --allow-unavailable
python3 experiments/max-ui-reference/verify.py
python3 -m unittest discover -v -s experiments/max-reference/help-coverage-20261021 -p 'test_*.py'
python3 apps/ultra/tests/check_cpal_capture.py --self-test
python3 apps/ultra/tests/check_build_install.py
python3 apps/ultra/tests/check_patch_file_launch.py
python3 apps/ultra/tests/check_isolated_launcher.py

# These tests require only the system C++ compiler, not JACK or a running engine.
TEST_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_DIR"' EXIT
c++ -std=c++20 -O2 -Wall -Wextra -Werror \
  apps/ultra/tests/sequence_test.cpp -o "$TEST_DIR/sequence-test"
"$TEST_DIR/sequence-test"
c++ -std=c++17 -O2 -Wall -Wextra -Werror \
  apps/ultra/tests/patch_graph_test.cpp -o "$TEST_DIR/patch-graph-test"
"$TEST_DIR/patch-graph-test"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread \
  apps/ultra/tests/patch_graph_objects_test.cpp -o "$TEST_DIR/patch-graph-objects-test"
"$TEST_DIR/patch-graph-objects-test"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread \
  apps/ultra/tests/canvas_list_objects_test.cpp -o "$TEST_DIR/canvas-list-objects-test"
"$TEST_DIR/canvas-list-objects-test"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread \
  apps/ultra/tests/canvas_signal_objects_test.cpp -o "$TEST_DIR/canvas-signal-objects-test"
"$TEST_DIR/canvas-signal-objects-test"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread \
  apps/ultra/tests/canvas_voice_objects_test.cpp -o "$TEST_DIR/canvas-voice-objects-test"
"$TEST_DIR/canvas-voice-objects-test"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread \
  apps/ultra/tests/canvas_effect_objects_test.cpp -o "$TEST_DIR/canvas-effect-objects-test"
"$TEST_DIR/canvas-effect-objects-test"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread \
  apps/ultra/tests/canvas_hierarchy_test.cpp -o "$TEST_DIR/canvas-hierarchy-test"
"$TEST_DIR/canvas-hierarchy-test"
c++ -std=c++20 -O2 -Wall -Wextra -Werror \
  apps/ultra/tests/canvas_workspace_test.cpp -o "$TEST_DIR/canvas-workspace-test"
"$TEST_DIR/canvas-workspace-test"
PYTHONDONTWRITEBYTECODE=1 python3 experiments/max-reference/help-roots-native-20261022/test-runner.py
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread \
  apps/ultra/tests/canvas_numeric_ui_test.cpp -o "$TEST_DIR/canvas-numeric-ui-test"
"$TEST_DIR/canvas-numeric-ui-test"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread \
  apps/ultra/tests/canvas_arithmetic_test.cpp -o "$TEST_DIR/canvas-arithmetic-test"
"$TEST_DIR/canvas-arithmetic-test"
PYTHONDONTWRITEBYTECODE=1 python3 experiments/max-reference/arithmetic-runtime-20261022/compare-native.py --binary "$TEST_DIR/canvas-arithmetic-test"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread \
  apps/ultra/tests/canvas_message_ui_test.cpp -o "$TEST_DIR/canvas-message-ui-test"
"$TEST_DIR/canvas-message-ui-test"
c++ -std=c++17 -O2 -Wall -Wextra -Werror -pthread \
  apps/ultra/tests/canvas_print_popup_test.cpp -o "$TEST_DIR/canvas-print-popup-test"
"$TEST_DIR/canvas-print-popup-test"
