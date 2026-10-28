#!/usr/bin/env bash
set -euo pipefail
OUT=${1:?built comparison directory required}
for round in 1 2; do
  for mode in baseline candidate; do
    { date -Is; uptime; ps -C blender -o stat=,pcpu=,etime= || true; } > "$OUT/$mode-$round-start.txt"
    "$OUT/$mode/probe" 1200 > "$OUT/$mode-$round.log" 2>&1
    { date -Is; uptime; ps -C blender -o stat=,pcpu=,etime= || true; } > "$OUT/$mode-$round-end.txt"
  done
done
