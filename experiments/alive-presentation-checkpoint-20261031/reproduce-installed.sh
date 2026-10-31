#!/usr/bin/env bash
# Re-exercise an existing immutable install in fresh private desktop sessions.
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
install=${1:?Usage: reproduce-installed.sh INSTALL_DIRECTORY FRESH_OUTPUT_DIRECTORY}
output=${2:?Usage: reproduce-installed.sh INSTALL_DIRECTORY FRESH_OUTPUT_DIRECTORY}
test ! -e "$output"
mkdir -p "$output/drop" "$output/surface"
output=$(realpath "$output")
install=$(realpath "$install")
python3 - "$install" "$output/two-instruments.alive" <<'PY'
import json
from pathlib import Path
import sys
install, target = map(Path, sys.argv[1:])
resources = install / 'lib/Alive/alive-session'
session = json.loads((resources / 'alive/examples/two-instruments.alive').read_text())
for track in session['score']['tracks']:
    device = track['chain']['instrument']
    device['path'] = str((resources / 'ultra/examples/subtractive.ultra').resolve(strict=True))
target.write_text(json.dumps(session, indent=2) + '\n')
PY
cd "$repo"
export ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_BINARY="$install/bin/alive"
ULTRA_TEST_ALIVE_DEFAULT=1 \
ULTRA_TEST_ALIVE_SESSION="$install/lib/Alive/alive-session/alive/examples/empty-workspaces.alive" \
ULTRA_TEST_SCRIPT="$repo/apps/ultra/tests/check_alive_device_drop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh "$output/drop" >"$output/drop.log" 2>&1
ULTRA_TEST_ALIVE_SESSION="$output/two-instruments.alive" \
ULTRA_TEST_SCRIPT="$repo/apps/ultra/tests/check_saved_presentation_desktop.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh "$output/surface" >"$output/surface.log" 2>&1
