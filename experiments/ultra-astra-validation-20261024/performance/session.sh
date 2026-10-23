#!/usr/bin/env bash
# Actual canvas UI + Rust CPAL, private display, bus and software audio server.
set -euo pipefail
ROOT=${AUDIT_ROOT:?Set AUDIT_ROOT to the isolated release checkout}
AUDIT_EVIDENCE=$(cd "$(dirname "$0")/.." && pwd)
export AUDIT_EVIDENCE
if [[ ${ULTRA_TEST_PRIVATE_SESSION:-} != 1 ]]; then
  if [[ ${1:-} == --software-audio ]]; then shift; fi
  for tool in dbus-run-session xvfb-run Xvfb python3 pipewire wireplumber pw-cat pw-link; do
    command -v "$tool" >/dev/null
  done
  if [[ ! -x "$ROOT/apps/ultra/src-tauri/target/release/ultra" ]]; then
    echo 'Build the native app with bash apps/ultra/build.sh first.' >&2
    exit 2
  fi
  ULTRA_TEST_OUTPUT_DIR=${1:-$(mktemp -d /tmp/ultra-isolated.XXXXXX)}
  mkdir -p "$ULTRA_TEST_OUTPUT_DIR"
  ULTRA_TEST_OUTPUT_DIR=$(cd "$ULTRA_TEST_OUTPUT_DIR" && pwd)
  export ULTRA_TEST_OUTPUT_DIR ULTRA_TEST_PRIVATE_SESSION=1
  # Portal/a11y auto-activation must not replace the desktop's runtime sockets.
  ultra_runtime_dir=$(mktemp -d /tmp/ultra-runtime.XXXXXX)
  ultra_audio_pid='' ultra_policy_pid=''
  cleanup_outer() {
    for pid in "$ultra_policy_pid" "$ultra_audio_pid"; do
      if [[ -n "$pid" ]]; then kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; fi
    done
    rm -rf -- "$ultra_runtime_dir"
  }
  trap cleanup_outer EXIT
    export XDG_RUNTIME_DIR="$ultra_runtime_dir" XDG_DATA_HOME="$ultra_runtime_dir/data"
    export XDG_STATE_HOME="$ultra_runtime_dir/state" XDG_CONFIG_HOME="$ultra_runtime_dir/config"
    export GIO_USE_VFS=local GTK_USE_PORTAL=0
    export PIPEWIRE_RUNTIME_DIR="$ultra_runtime_dir" PIPEWIRE_REMOTE=ultra-audio-test
    export ULTRA_TEST_AUDIO_SCOPE='private software-only CPAL PipeWire at 48 kHz / 512 frames'
    pipewire -c "$ROOT/apps/ultra/tests/cpal-software-pipewire.conf" \
      >"$ULTRA_TEST_OUTPUT_DIR/pipewire.log" 2>&1 &
    ultra_audio_pid=$!
    for attempt in {1..50}; do
      if [[ -S "$ultra_runtime_dir/ultra-audio-test" ]]; then break; fi
      kill -0 "$ultra_audio_pid"
      sleep .1
    done
    test -S "$ultra_runtime_dir/ultra-audio-test"
    ln -s ultra-audio-test "$ultra_runtime_dir/pipewire-0"
    WIREPLUMBER_CONFIG_DIR=/usr/share/wireplumber dbus-run-session -- \
      wireplumber -p policy >"$ULTRA_TEST_OUTPUT_DIR/policy.log" 2>&1 &
    ultra_policy_pid=$!
    sleep .3
  env -u WAYLAND_DISPLAY dbus-run-session -- xvfb-run -a \
    -s '-screen 0 1280x840x24 -nolisten tcp' bash "$0"
  exit
fi
if [[ ${DISPLAY:-} != :[0-9]* || -n ${WAYLAND_DISPLAY:-} || -z ${XAUTHORITY:-} ]]; then
  echo 'Private X display required.' >&2
  exit 2
fi
export GDK_BACKEND=x11 GDK_SCALE=1 GDK_DPI_SCALE=1
export GTK_USE_PORTAL=0 GIO_USE_VFS=local XDG_CURRENT_DESKTOP=GNOME
ultra_a11y_file=$(mktemp)
ultra_a11y_pid='' ultra_registry_pid='' ultra_test_pid='' ultra_wm_pid=''
cleanup() {
  result=$?
  trap - EXIT
  for pid in "$ultra_test_pid" "$ultra_registry_pid" "$ultra_a11y_pid" "$ultra_wm_pid"; do
    if [[ -n "$pid" ]]; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
  rm -f "$ultra_a11y_file"
  exit "$result"
}
trap cleanup EXIT
# A separate registry avoids using the user's accessibility or input session.
dbus-daemon --config-file=/usr/share/defaults/at-spi2/accessibility.conf \
  --nofork --print-address=3 3>"$ultra_a11y_file" \
  >"$ULTRA_TEST_OUTPUT_DIR/a11y.log" 2>&1 &
ultra_a11y_pid=$!
for attempt in {1..30}; do
  if [[ -s "$ultra_a11y_file" ]]; then break; fi
  sleep .1
done
IFS= read -r AT_SPI_BUS_ADDRESS <"$ultra_a11y_file"
export AT_SPI_BUS_ADDRESS
/usr/lib/at-spi2-registryd >"$ULTRA_TEST_OUTPUT_DIR/registry.log" 2>&1 &
ultra_registry_pid=$!
cd "$ROOT"
"${AUDIT_TWM:-twm}" -f "$AUDIT_EVIDENCE/performance/twmrc" >"$ULTRA_TEST_OUTPUT_DIR/twm.log" 2>&1 &
ultra_wm_pid=$!
mkdir -p "$XDG_DATA_HOME/org.alive.ultra.research"
printf '%s\n' '{"host":"PipeWire","device":"default","sample_rate":48000,"buffer_frames":512}' > "$XDG_DATA_HOME/org.alive.ultra.research/audio-settings.json"
LD_LIBRARY_PATH="$ROOT/apps/ultra/src-tauri/target/release" \
LD_PRELOAD="${AUDIT_PRELOAD:-}" \
ALIVE_METRICS_SCRIPT="$AUDIT_EVIDENCE/performance/metrics.js" \
ALIVE_METRICS_COMMAND="$ULTRA_TEST_OUTPUT_DIR/command.js" \
ALIVE_METRICS_LOG="$ULTRA_TEST_OUTPUT_DIR/metrics.jsonl" \
  "$ROOT/apps/ultra/src-tauri/target/release/ultra" "${AUDIT_PATCH:-$AUDIT_EVIDENCE/performance/fixture.ultra}" >"$ULTRA_TEST_OUTPUT_DIR/app.log" 2>&1 &
ultra_test_pid=$!
export ULTRA_TEST_PID="$ultra_test_pid"
python3 "${AUDIT_DRIVER:-$AUDIT_EVIDENCE/performance/run_native.py}"
