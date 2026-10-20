#!/usr/bin/env bash
# Actual native UI + real JACK, with no desktop-wide keyboard/pointer injection.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
if [[ ${ULTRA_TEST_PRIVATE_SESSION:-} != 1 ]]; then
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
  "$ULTRA_TEST_OUTPUT_DIR/jack-probe" check-free
  export ULTRA_TEST_OUTPUT_DIR ULTRA_TEST_PRIVATE_SESSION=1
  # Portal/a11y auto-activation must not replace the desktop's runtime sockets.
  ultra_runtime_dir=$(mktemp -d /tmp/ultra-runtime.XXXXXX)
  trap 'rm -rf -- "$ultra_runtime_dir"' EXIT
  export PIPEWIRE_RUNTIME_DIR="${PIPEWIRE_RUNTIME_DIR:-${XDG_RUNTIME_DIR:-/run/user/$(id -u)}}"
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
bash apps/ultra/run.sh >"$ULTRA_TEST_OUTPUT_DIR/app.log" 2>&1 &
ultra_test_pid=$!
export ULTRA_TEST_PID="$ultra_test_pid"
python3 - <<'PY'
import os
import pathlib
import shutil
import subprocess
import time

import gi

gi.require_version("Atspi", "2.0")
gi.require_version("Gdk", "3.0")
from gi.repository import Atspi, Gdk

pid = int(os.environ["ULTRA_TEST_PID"])
output = pathlib.Path(os.environ["ULTRA_TEST_OUTPUT_DIR"])


def walk(accessible):
    yield accessible
    for i in range(accessible.get_child_count()):
        yield from walk(accessible.get_child_at_index(i))


def find(name):
    roots = [a for a in Atspi.get_desktop(0) if a.get_process_id() == pid]
    return next(a for root in roots for a in walk(root) if a.get_name() == name)


def click(name):
    assert Atspi.Action.do_action(find(name), 0), name
    time.sleep(0.25)


for _ in range(60):
    try:
        find("Start audio")
        break
    except StopIteration:
        time.sleep(0.2)
else:
    raise AssertionError("Native window not accessible on the private display")

for device in ("A", "B"):
    assert Atspi.Value.set_current_value(find("Level device " + device), 4)
click("Start audio")
time.sleep(1)
if shutil.which("jack_lsp"):
    with (output / "jack-connections.txt").open("w") as connections:
        subprocess.run(["jack_lsp", "-c"], stdout=connections, check=True)
subprocess.run(["python3", "apps/ultra/tests/check_private_pointer.py"], check=True)
subprocess.run([
    "python3", "apps/ultra/tests/check_desktop_isolation.py",
    "--probe", str(output / "jack-probe"),
], check=True)
subprocess.run([str(output / "jack-probe"), "basic"], check=True)
root = Gdk.get_default_root_window()
pixbuf = Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height())
assert pixbuf is not None
pixbuf.savev(str(output / "native-isolated.png"), "png", [], [])
click("Stop")
print("PASS isolated native window + real JACK; no user keyboard/pointer input")
print("Evidence:", output)
PY
