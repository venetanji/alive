#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$ROOT"
out=${1:?Usage: check_cpal_audio.sh /absolute/results/directory}
mkdir -p "$out"
out=$(realpath "$out")
exec > >(tee "$out/runner.log") 2>&1
export PATH="$ROOT/experiments/clockwork-faust/.deps/rust/bin:$PATH"
export CARGO_HOME="${CARGO_HOME:-$ROOT/experiments/clockwork-faust/.deps/cargo}"
export ULTRA_NATIVE_LIB_DIR="$ROOT/apps/ultra/build"
export LD_LIBRARY_PATH="$ULTRA_NATIVE_LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
# Fail before building if the private-server tools are missing. Never use or
# reconfigure an existing user/system audio service.
for tool in pipewire wireplumber pw-cat pw-link pw-dump dbus-run-session timeout python3; do
    command -v "$tool" >/dev/null || { echo "Missing required tool: $tool" >&2; exit 1; }
done
{
    rustc --version
    cargo --version
    pipewire --version
    wireplumber --version
    pw-cat --version | tee "$out/capture-version.txt"
} >"$out/versions.txt" 2>&1
cargo test --release --manifest-path apps/ultra/src-tauri/Cargo.toml --locked --no-run --message-format=json >"$out/build-artifacts.jsonl" 2>"$out/build.log"
probe_binary=$(python3 - "$out/build-artifacts.jsonl" <<'PY'
import json,sys
rows=[json.loads(x) for x in open(sys.argv[1])]
bins=[x['executable'] for x in rows if x.get('reason')=='compiler-artifact' and x.get('profile',{}).get('test') and x.get('target',{}).get('name')=='ultra' and x.get('executable')]
assert len(bins)==1,bins
print(bins[0])
PY
)
# Rust test filters silently succeed with zero matches; explicitly reject that.
test_name=audio::tests::private_software_output
"$probe_binary" --list --ignored >"$out/test-list.txt"
grep -Fxq "$test_name: test" "$out/test-list.txt"
runtime=$(mktemp -d /tmp/ultra-cpal.XXXXXX)
export PIPEWIRE_RUNTIME_DIR="$runtime" PIPEWIRE_REMOTE=ultra-audio-test XDG_RUNTIME_DIR="$runtime"
export GIO_USE_VFS=local GTK_USE_PORTAL=0
export XDG_STATE_HOME="$runtime/state" XDG_CONFIG_HOME="$runtime/config"
mkdir -p "$XDG_STATE_HOME" "$XDG_CONFIG_HOME"
export ULTRA_AUDIO_PROBE_SETTINGS="$runtime/settings.json"
server='' policy='' capture='' probe=''
cleanup() {
    for pid in "$probe" "$capture" "$policy" "$server"; do
        if [[ -n "$pid" ]]; then kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; fi
    done
    rm -rf -- "$runtime"
}
trap cleanup EXIT
pipewire -c "$ROOT/apps/ultra/tests/cpal-software-pipewire.conf" >"$out/pipewire.log" 2>&1 &
server=$!
for attempt in {1..60}; do
    if [[ -S "$runtime/ultra-audio-test" ]]; then break; fi
    kill -0 "$server"; sleep .1
done
test -S "$runtime/ultra-audio-test"
# CPAL 0.18.2's discovery checks pipewire-0 even with PIPEWIRE_REMOTE set.
ln -s ultra-audio-test "$runtime/pipewire-0"
# Policy only configures/routes our software nodes; it loads no hardware monitors.
# Ubuntu 24.04 ships WirePlumber 0.4: its upstream policy.conf loads only
# policy.lua, not main.lua/bluetooth.lua or any hardware discovery monitors.
# WirePlumber 0.5 replaced these configurations with built-in profiles.
case "$(wireplumber --version)" in
    *"0.4."*) policy_args=(-c policy.conf) ;;
    *) policy_args=(-p policy) ;;
esac
WIREPLUMBER_CONFIG_DIR=/usr/share/wireplumber \
    timeout --kill-after=5s 60s dbus-run-session -- wireplumber "${policy_args[@]}" >"$out/policy.log" 2>&1 &
policy=$!
sleep .3
kill -0 "$policy"
# Newer pw-cat defaults stdout to an AU container; older releases write raw PCM.
pw-cat --help >"$out/capture-help.txt"
capture_args=()
if grep -q -- '--raw' "$out/capture-help.txt"; then capture_args+=(--raw); fi
timeout --signal=INT --kill-after=5s 40s pw-cat "${capture_args[@]}" --record --rate=48000 --format=f32 --channels=2 --channel-map=FL,FR --target=0 \
    --properties='{ node.name = Ultra-Capture }' - >"$out/loopback.f32" 2>"$out/capture.log" &
capture=$!
for attempt in {1..80}; do
    timeout 5s pw-link -o >"$out/ports-out.txt"
    timeout 5s pw-link -i >"$out/ports-in.txt"
    if grep -q 'Ultra-Capture:input_FL' "$out/ports-in.txt" &&
       grep -q 'Ultra-Capture:input_FR' "$out/ports-in.txt" &&
       grep -q 'Ultra-Software-Output:monitor_FL' "$out/ports-out.txt" &&
       grep -q 'Ultra-Software-Output:monitor_FR' "$out/ports-out.txt"; then break; fi
    kill -0 "$capture"; kill -0 "$policy"; kill -0 "$server"; sleep .1
done
timeout 5s pw-link Ultra-Software-Output:monitor_FL Ultra-Capture:input_FL
timeout 5s pw-link Ultra-Software-Output:monitor_FR Ultra-Capture:input_FR
# Connect recording before starting the score; slow policy startup cannot
# silently consume the probe's two-second pre-roll.
timeout --kill-after=5s 30s "$probe_binary" "$test_name" --ignored --exact --nocapture >"$out/probe.log" 2>&1 &
probe=$!
timeout 5s pw-link -l >"$out/connections.txt"
timeout 5s pw-dump >"$out/graph.json"
wait "$probe"
probe=''
# PipeWire 1.0 (Ubuntu 24.04) has no finite-frame recording option. Stop
# gracefully after the test has rendered its score and completed restart checks.
# timeout forwards SIGINT to pw-cat and bounds a stuck recorder as well.
kill -INT "$capture"
printf 'SIGINT\n' >"$out/capture-stop.txt"
capture_status=0
wait "$capture" || capture_status=$?
capture=''
python3 apps/ultra/tests/check_cpal_capture.py "$out" "$capture_status"
