#!/usr/bin/env bash
set -euo pipefail
alive_native_evidence=/tmp/alive-live-publish-native-20261031
alive_native_digest=$(sha256sum "$alive_native_evidence/libultra_native.so")
test "${alive_native_digest%% *}" = 69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90
for alive_native_check in publication midi shipping envelope v1 v2 v3 launch v4 v4-midi v4-authority; do
  "$alive_native_evidence/$alive_native_check-test" > "$alive_native_evidence/$alive_native_check.final.log" 2>&1
done
"$alive_native_evidence/layout" > "$alive_native_evidence/layout.final.log" 2>&1
git -C /home/venetanji/.codex/worktrees/phase2-ui/alive diff --check > "$alive_native_evidence/diff-check.final.log" 2>&1
printf 'PASS: frozen native artifact and twelve verification executables\n'
