#!/usr/bin/env bash
set -euo pipefail
c++ -std=c++17 -O2 -Wall -Wextra -Werror apps/ultra/tests/alive_session_workspace_envelope_test.cpp -o /tmp/alive-workspaces-task2c-song-loops/workspace-envelope-test
/tmp/alive-workspaces-task2c-song-loops/workspace-envelope-test
