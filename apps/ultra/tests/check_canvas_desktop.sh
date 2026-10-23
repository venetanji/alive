#!/usr/bin/env bash
# Actual canvas UI + Rust CPAL, private display, bus and software audio server.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
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
ultra_a11y_pid='' ultra_registry_pid='' ultra_test_pid=''
cleanup() {
  result=$?
  trap - EXIT
  for pid in "$ultra_test_pid" "$ultra_registry_pid" "$ultra_a11y_pid"; do
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
python3 "$ROOT/apps/ultra/tests/check_document_startup.py"
if [[ ${ULTRA_TEST_STARTUP_ONLY:-0} == 1 ]]; then exit; fi
if [[ ${ULTRA_TEST_PINCH_ONLY:-0} == 1 ]]; then
  python3 "$ROOT/apps/ultra/tests/check_canvas_pinch.py"
  exit
fi
# Test the same build checked above, not run.sh's preferred packaged copy.
ultra_initial_patch="$ULTRA_TEST_OUTPUT_DIR/initial.ultra"
printf '%s\n' '{"version":1,"profile":"ultra-canvas-v1","nodes":[],"edges":[]}' > "$ultra_initial_patch"
LD_LIBRARY_PATH="$ROOT/apps/ultra/src-tauri/target/release${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" \
  "$ROOT/apps/ultra/src-tauri/target/release/ultra" "$ultra_initial_patch" >"$ULTRA_TEST_OUTPUT_DIR/app.log" 2>&1 &
ultra_test_pid=$!
export ULTRA_TEST_PID="$ultra_test_pid"
if [[ ${ULTRA_TEST_COMMENTS_ONLY:-0} == 1 ]]; then
  python3 "$ROOT/apps/ultra/tests/check_comments_desktop.py"
  exit
fi
if [[ ${ULTRA_TEST_CABLES_ONLY:-0} == 1 ]]; then
  python3 "$ROOT/apps/ultra/tests/check_cables_desktop.py"
  exit
fi
if [[ ${ULTRA_TEST_ARITHMETIC_ONLY:-0} == 1 ]]; then
  python3 "$ROOT/apps/ultra/tests/check_arithmetic_desktop.py"
  exit
fi
if [[ ${ULTRA_TEST_DOCUMENTS_ONLY:-0} != 1 && ${ULTRA_TEST_HELP_SHELL_ONLY:-0} != 1 ]]; then
  python3 "$ROOT/apps/ultra/tests/check_canvas_desktop.py"
fi
python3 "$ROOT/apps/ultra/tests/check_documents_desktop.py"
