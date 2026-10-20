#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
python3 generate.py --check
mkdir -p .build
flags=(-std=c++17 -O2 -Wall -Wextra -Werror -Wno-unused-parameter)
if [[ "${1:-}" == "--sanitize" ]]; then
  flags+=(-O1 -g -fsanitize=address,undefined -fno-omit-frame-pointer)
fi
"${CXX:-g++}" "${flags[@]}" \
  -isystem ../faust-reference/.deps/faust-2.88.0/architecture \
  test.cpp -o .build/probe
ASAN_OPTIONS="${ASAN_OPTIONS:-detect_leaks=0}" .build/probe
