#!/usr/bin/env bash
# Actual canvas UI + JACK, using only a private display and accessibility bus.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
if [[ ${ULTRA_TEST_PRIVATE_SESSION:-} != 1 ]]; then
  ultra_software_audio=0
  if [[ ${1:-} == --software-audio ]]; then ultra_software_audio=1; shift; fi
  for tool in dbus-run-session xvfb-run Xvfb python3 c++ pkg-config pgrep; do
    command -v "$tool" >/dev/null
  done
  # JACK is shared even though the display is private. Never target another app.
  if pgrep -u "$(id -u)" -x ultra >/dev/null; then
    echo 'Close the existing Ultra instance before running the isolated test.' >&2
    exit 2
  fi
  if [[ ! -x "$ROOT/apps/ultra/src-tauri/target/release/ultra" ]]; then
    echo 'Build the native app with bash apps/ultra/build.sh first.' >&2
    exit 2
  fi
  ULTRA_TEST_OUTPUT_DIR=${1:-$(mktemp -d /tmp/ultra-isolated.XXXXXX)}
  mkdir -p "$ULTRA_TEST_OUTPUT_DIR"
  ULTRA_TEST_OUTPUT_DIR=$(cd "$ULTRA_TEST_OUTPUT_DIR" && pwd)
  c++ -std=c++20 -O2 "$ROOT/apps/ultra/tests/jack_probe.cpp" \
    $(pkg-config --cflags --libs jack) -pthread -o "$ULTRA_TEST_OUTPUT_DIR/jack-probe"
  export ULTRA_TEST_OUTPUT_DIR ULTRA_TEST_PRIVATE_SESSION=1
  # Portal/a11y auto-activation must not replace the desktop's runtime sockets.
  ultra_runtime_dir=$(mktemp -d /tmp/ultra-runtime.XXXXXX)
  ultra_audio_runtime='' ultra_audio_pid=''
  cleanup_outer() {
    if [[ -n "$ultra_audio_pid" ]]; then
      kill "$ultra_audio_pid" 2>/dev/null || true
      wait "$ultra_audio_pid" 2>/dev/null || true
    fi
    if mountpoint -q "$ultra_runtime_dir/gvfs"; then fusermount3 -u "$ultra_runtime_dir/gvfs"; fi
    rm -rf -- "$ultra_runtime_dir"
    if [[ -n "$ultra_audio_runtime" ]]; then rm -rf -- "$ultra_audio_runtime"; fi
  }
  trap cleanup_outer EXIT
  if [[ $ultra_software_audio == 1 ]]; then
    command -v pipewire >/dev/null
    ultra_audio_runtime=$(mktemp -d /tmp/ultra-audio.XXXXXX)
    export PIPEWIRE_RUNTIME_DIR="$ultra_audio_runtime" PIPEWIRE_REMOTE=ultra-test
    export ULTRA_TEST_AUDIO_SCOPE='private software-only PipeWire JACK at 48 kHz / 1024 frames'
    pipewire -c "$ROOT/apps/ultra/tests/canvas-software-pipewire.conf" \
      >"$ULTRA_TEST_OUTPUT_DIR/pipewire.log" 2>&1 &
    ultra_audio_pid=$!
    for attempt in {1..50}; do
      if [[ -S "$ultra_audio_runtime/ultra-test" ]]; then break; fi
      kill -0 "$ultra_audio_pid"
      sleep .1
    done
    test -S "$ultra_audio_runtime/ultra-test"
  else
    export PIPEWIRE_RUNTIME_DIR="${PIPEWIRE_RUNTIME_DIR:-${XDG_RUNTIME_DIR:-/run/user/$(id -u)}}"
    export ULTRA_TEST_AUDIO_SCOPE='existing user JACK server; physical output may be connected'
  fi
  "$ULTRA_TEST_OUTPUT_DIR/jack-probe" check-free
  export XDG_RUNTIME_DIR="$ultra_runtime_dir"
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
# Test the same build checked above, not run.sh's preferred packaged copy.
LD_LIBRARY_PATH="$ROOT/apps/ultra/src-tauri/target/release${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" \
  "$ROOT/apps/ultra/src-tauri/target/release/ultra" >"$ULTRA_TEST_OUTPUT_DIR/app.log" 2>&1 &
ultra_test_pid=$!
export ULTRA_TEST_PID="$ultra_test_pid"
python3 "$ROOT/apps/ultra/tests/check_canvas_desktop.py"
