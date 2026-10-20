#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$ROOT"
out=${1:?Usage: check_cpal_audio.sh /absolute/results/directory}
mkdir -p "$out"
out=$(realpath "$out")
export PATH="$ROOT/experiments/clockwork-faust/.deps/rust/bin:$PATH"
export CARGO_HOME="${CARGO_HOME:-$ROOT/experiments/clockwork-faust/.deps/cargo}"
export ULTRA_NATIVE_LIB_DIR="$ROOT/apps/ultra/build"
export LD_LIBRARY_PATH="$ULTRA_NATIVE_LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --locked --no-run --message-format=json >"$out/build-artifacts.jsonl" 2>"$out/build.log"
probe_binary=$(python3 - "$out/build-artifacts.jsonl" <<'PY'
import json,sys
rows=[json.loads(x) for x in open(sys.argv[1])]
bins=[x['executable'] for x in rows if x.get('reason')=='compiler-artifact' and x.get('profile',{}).get('test') and x.get('target',{}).get('name')=='ultra' and x.get('executable')]
assert len(bins)==1,bins
print(bins[0])
PY
)
runtime=$(mktemp -d /tmp/ultra-cpal.XXXXXX)
export PIPEWIRE_RUNTIME_DIR="$runtime" PIPEWIRE_REMOTE=ultra-audio-test XDG_RUNTIME_DIR="$runtime"
export GIO_USE_VFS=local GTK_USE_PORTAL=0
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
XDG_STATE_HOME="$runtime/state" XDG_CONFIG_HOME="$runtime/config" \
    WIREPLUMBER_CONFIG_DIR=/usr/share/wireplumber \
    dbus-run-session -- wireplumber -p policy >"$out/policy.log" 2>&1 &
policy=$!
sleep .3
pw-cat --record --raw --rate=48000 --format=f32 --channels=2 --target=0 --sample-count=384000 \
    --properties='{ node.name = Ultra-Capture }' "$out/loopback.f32" >"$out/capture.log" 2>&1 &
capture=$!
"$probe_binary" audio::tests::private_software_output --ignored --exact --nocapture >"$out/probe.log" 2>&1 &
probe=$!
for attempt in {1..80}; do
    pw-link -o >"$out/ports-out.txt"
    pw-link -i >"$out/ports-in.txt"
    if rg -q 'Ultra-Capture:input_FL' "$out/ports-in.txt"; then break; fi
    kill -0 "$probe"; sleep .1
done
pw-link -l >"$out/connections.txt"
pw-link Ultra-Software-Output:monitor_FL Ultra-Capture:input_FL
pw-link Ultra-Software-Output:monitor_FR Ultra-Capture:input_FR
wait "$probe"
probe=''
capture_status=0
wait "$capture" || capture_status=$?
capture=''
python3 - "$out" "$capture_status" <<'PY'
import array,json,math,pathlib,sys
out=pathlib.Path(sys.argv[1]);samples=array.array('f');samples.frombytes((out/'loopback.f32').read_bytes())
assert len(samples)>48000, len(samples)
assert len(samples)==384000*2,len(samples)
assert int(sys.argv[2]) in (0,1),sys.argv[2]
assert not (out/'capture.log').read_text().strip()
assert all(math.isfinite(x) for x in samples)
channels=[samples[::2],samples[1::2]]
peaks=[max(abs(x) for x in ch) for ch in channels]
assert all(.001<p<1 for p in peaks),peaks
report={'scope':'private software-only CPAL PipeWire loopback, no physical outputs','rate_hz':48000,'channels':2,'frames':len(samples)//2,'peaks':peaks,'all_finite':True,'capture_exit_status':int(sys.argv[2]),'capture_note':'This pw-cat returns 1 after its requested sample count; exact frame count and empty error log are required.','note_score':'both channels A4 / MIDI 69 velocity 70; on at +2s, off +2.6s; score wall times approximate, not latency measurements','observed':'probe.log records requested and observed callback size; successful stop/start and saved configuration reload'}
(out/'result.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
PY
