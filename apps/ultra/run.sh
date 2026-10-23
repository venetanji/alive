#!/usr/bin/env bash
set -euo pipefail
ultra_launch_directory=$PWD
ultra_patch_arguments=()
for ultra_patch_argument in "$@"; do
  if [[ $ultra_patch_argument = -- || $ultra_patch_argument = /* ]]; then
    ultra_patch_arguments+=("$ultra_patch_argument")
  else
    ultra_patch_arguments+=("$ultra_launch_directory/$ultra_patch_argument")
  fi
done
cd "$(dirname "$0")"
if [ -x src-tauri/target/release/ultra ]; then APP=./src-tauri/target/release/ultra; elif [ -x ./ultra ]; then APP=./ultra; else echo 'Ultra is not built. Read RUNNING.txt, then run ./build.sh.' >&2; exit 1; fi
HERE=$(cd "$(dirname "$APP")" && pwd)
export LD_LIBRARY_PATH="$HERE${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
MISSING=$(ldd "$APP" 2>&1 | grep -E 'not found|version .* not found' || true)
if [ -n "$MISSING" ]; then printf 'Required runtime libraries are missing/incompatible:\n%s\nRead RUNNING.txt; this launcher does not install or alter system settings.\n' "$MISSING" >&2; exit 1; fi
exec "$APP" "${ultra_patch_arguments[@]}"
