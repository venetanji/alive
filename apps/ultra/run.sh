#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [ -x ./ultra ]; then APP=./ultra; elif [ -x src-tauri/target/release/ultra ]; then APP=./src-tauri/target/release/ultra; else echo 'Ultra is not built. Read RUNNING.txt, then run ./build.sh.' >&2; exit 1; fi
HERE=$(cd "$(dirname "$APP")" && pwd)
export LD_LIBRARY_PATH="$HERE${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
MISSING=$(ldd "$APP" 2>&1 | grep -E 'not found|version .* not found' || true)
if [ -n "$MISSING" ]; then printf 'Required runtime libraries are missing/incompatible:\n%s\nRead RUNNING.txt; this launcher does not install or alter system settings.\n' "$MISSING" >&2; exit 1; fi
exec "$APP" "$@"
