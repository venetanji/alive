#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
ALIVE_BIN="$ROOT/apps/ultra/src-tauri/target/release/alive"
if [[ ! -x "$ALIVE_BIN" ]]; then
  echo 'Alive is not built. Run: bash apps/alive/build.sh' >&2
  exit 1
fi
export LD_LIBRARY_PATH="$(dirname "$ALIVE_BIN")${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
exec "$ALIVE_BIN" "$@"
