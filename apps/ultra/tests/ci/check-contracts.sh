#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
cd "$ROOT"

# Node executes the existing tests, including the controller's asynchronous IPC
# boundary tests. No JavaScript timer is accepted as native audio evidence.
node --test apps/ultra/ui/*.test.mjs apps/ultra/ui/components/*.test.mjs
python3 -m unittest discover -v -s experiments/max-subset -p 'test_*.py'
python3 -m unittest discover -v -s experiments/max-reference/scripts -p 'test_*.py'
python3 experiments/max-reference/scripts/verify.py
python3 experiments/max-ui-reference/verify.py
python3 -m unittest discover -v -s experiments/max-reference/help-coverage-20261021 -p 'test_*.py'
python3 apps/ultra/tests/check_cpal_capture.py --self-test
python3 apps/ultra/tests/check_build_install.py
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
c++ -std=c++17 -O2 -Wall -Wextra -Werror \
  apps/ultra/tests/patch_graph_objects_test.cpp -o "$TEST_DIR/patch-graph-objects-test"
"$TEST_DIR/patch-graph-objects-test"
