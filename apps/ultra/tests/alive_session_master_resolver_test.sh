#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
BUILD="$ROOT/apps/ultra/build"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/old" "$TMP/partial" "$TMP/collision"
cat > "$TMP/anchor.c" <<'EOF'
int alive_session_state_v2(void *out) { (void)out; return 0; }
EOF
cat > "$TMP/partial.c" <<'EOF'
int alive_session_master_limits(void *out) { (void)out; __builtin_trap(); }
EOF
cat > "$TMP/dependency.c" <<'EOF'
int alive_session_master_limits(void *out) { (void)out; __builtin_trap(); }
int alive_session_master_set(void) { return 1; }
int alive_session_master_reset_clip(void) { return 1; }
int alive_session_master_snapshot_v2(void) { return 1; }
int alive_session_master_snapshot_v3(void) { return 1; }
int alive_session_master_snapshot_v4(void) { return 1; }
EOF
cc -shared -fPIC "$TMP/anchor.c" -o "$TMP/old/libultra_native.so"
cc -shared -fPIC "$TMP/anchor.c" "$TMP/partial.c" -o "$TMP/partial/libultra_native.so"
cc -shared -fPIC "$TMP/dependency.c" -o "$TMP/collision/libcollision.so"
cc -shared -fPIC "$TMP/anchor.c" -L"$TMP/collision" -Wl,--no-as-needed -lcollision \
  -Wl,-rpath,'$ORIGIN' -o "$TMP/collision/libultra_native.so"
printf '#[path = "%s"]\nmod native_master;\n' "$ROOT/apps/ultra/src-tauri/src/session/native_master.rs" > "$TMP/resolver.rs"
rustc --edition=2021 --test "$TMP/resolver.rs" \
  -L "native=$TMP/old" -C "link-arg=-Wl,-rpath,$BUILD" -o "$TMP/resolver"
# Linking to the full library can satisfy Rust runtime symbols from that image,
# making the test executable fail before it can inspect an older library.
readelf --dyn-syms --wide "$TMP/resolver" > "$TMP/symbols"
awk '$7 == "UND" && $8 ~ /^(_ZN|_R)/ { print "Unexpected Rust symbol dependency: " $8 > "/dev/stderr"; bad=1 } END { exit bad }' "$TMP/symbols"
LD_LIBRARY_PATH="$BUILD" "$TMP/resolver" --exact native_master::tests::resolves_the_loaded_native_image
for fixture in old partial collision; do
  ALIVE_MASTER_EXPECT_UNAVAILABLE=1 LD_LIBRARY_PATH="$TMP/$fixture" \
    "$TMP/resolver" --exact native_master::tests::resolves_the_loaded_native_image
done
