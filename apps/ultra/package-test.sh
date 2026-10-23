#!/usr/bin/env bash
# Package an already built Linux research app. No install, server or release action.
set -euo pipefail
cd "$(dirname "$0")"
ROOT=$(cd ../.. && pwd)
OUT=${1:-"$PWD/build/ultra-chord-lab-linux-x86_64.tar.gz"}
mkdir -p "$(dirname "$OUT")"
OUT=$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")
for f in src-tauri/target/release/ultra src-tauri/target/release/libultra_native.so build/ultra-diagnostic; do
  test -f "$f" || { echo "Missing $f; run ./build.sh first." >&2; exit 1; }
done
# Refuse mismatched diagnostic/app libraries left by an incomplete rebuild.
cmp build/libultra_native.so src-tauri/target/release/libultra_native.so
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
DEST="$TMP/ultra-chord-lab"
mkdir -p "$DEST"
cp src-tauri/target/release/ultra src-tauri/target/release/libultra_native.so build/ultra-diagnostic "$DEST/"
cp run.sh RUNNING.txt AUDIO.md THIRD-PARTY.txt THIRD-PARTY-CRATES.json "$DEST/"
cp "$ROOT/LICENSE" "$ROOT/LICENSING.md" "$DEST/"
cat > "$DEST/BUILD.txt" <<EOF
Private research test build, not a release or portability certification.
Source: https://github.com/venetanji/alive/pull/1
Source revision: ${ULTRA_SOURCE_COMMIT:-$(git -C "$ROOT" rev-parse HEAD)}
Dirty working tree: $(test -z "$(git -C "$ROOT" status --porcelain)" && echo no || echo yes)
Architecture: $(uname -m)
Built: $(date -u +%Y-%m-%dT%H:%M:%SZ)
See RUNNING.txt for runtime dependencies and test scope.
The source and pinned build instructions are required for redistribution review.
EOF
(cd "$DEST" && sha256sum ultra libultra_native.so ultra-diagnostic > SHA256SUMS)
tar -czf "$OUT" -C "$TMP" ultra-chord-lab
printf '%s\n' "$OUT"
