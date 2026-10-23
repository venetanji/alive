#!/usr/bin/env python3
"""Exercise actual pointer handlers only on the isolated runner's Xvfb display."""
import array
import ctypes
import ctypes.util
import math
import os
import pathlib
import subprocess
import time

import gi

gi.require_version("Atspi", "2.0")
from gi.repository import Atspi


def walk(accessible):
    yield accessible
    for i in range(accessible.get_child_count()):
        yield from walk(accessible.get_child_at_index(i))


def main():
    display_name = os.environ.get("DISPLAY", "")
    assert os.environ.get("ULTRA_TEST_PRIVATE_SESSION") == "1"
    assert display_name.startswith(":") and not os.environ.get("WAYLAND_DISPLAY")
    assert os.environ.get("XAUTHORITY"), "Only the private runner may invoke this test"
    # Verify the addressed X server is Xvfb before sending any pointer events.
    servers = subprocess.run(["pgrep", "-a", "-x", "Xvfb"], capture_output=True, text=True, check=True)
    assert any(display_name in line.split()[2:] for line in servers.stdout.splitlines())
    pid = int(os.environ["ULTRA_TEST_PID"])
    output = pathlib.Path(os.environ["ULTRA_TEST_OUTPUT_DIR"])

    def find(name):
        roots = [a for a in Atspi.get_desktop(0) if a.get_process_id() == pid]
        return next(a for root in roots for a in walk(root) if a.get_name() == name)

    x11 = ctypes.CDLL(ctypes.util.find_library("X11"))
    xtst = ctypes.CDLL(ctypes.util.find_library("Xtst"))
    x11.XOpenDisplay.argtypes = [ctypes.c_char_p]
    x11.XOpenDisplay.restype = ctypes.c_void_p
    x11.XFlush.argtypes = [ctypes.c_void_p]
    x11.XCloseDisplay.argtypes = [ctypes.c_void_p]
    xtst.XTestFakeMotionEvent.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_ulong]
    xtst.XTestFakeButtonEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint, ctypes.c_int, ctypes.c_ulong]
    display = x11.XOpenDisplay(display_name.encode())
    assert display
    try:
        for device in ("B", "A"):
            level = Atspi.Value.get_current_value(find("Level device " + device))
            assert 1 <= level <= 8, "Use low app gains for audible checks"
            key = find("Play MIDI note 60 on device " + device)
            rect = Atspi.Component.get_extents(key, Atspi.CoordType.SCREEN)
            # The lower white-key area cannot be covered by a black key.
            x, y = rect.x + rect.width // 2, rect.y + rect.height - 6
            capture = output / ("pointer-" + device + ".f32")
            probe = subprocess.Popen([
                str(output / "jack-probe"), "capture", "ultra", str(capture),
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            try:
                try:
                    time.sleep(0.5)
                    assert xtst.XTestFakeMotionEvent(display, 0, x, y, 0)
                    assert xtst.XTestFakeButtonEvent(display, 1, 1, 0)
                    x11.XFlush(display)
                    time.sleep(0.25)
                finally:
                    xtst.XTestFakeButtonEvent(display, 1, 0, 0)
                    x11.XFlush(display)
                stdout, stderr = probe.communicate(timeout=10)
            finally:
                if probe.poll() is None:
                    probe.terminate()
                    try:
                        probe.communicate(timeout=2)
                    except subprocess.TimeoutExpired:
                        probe.kill()
                        probe.communicate(timeout=2)
            assert probe.returncode == 0, stdout + stderr
            (output / ("pointer-" + device + ".json")).write_text(stdout)
            samples = array.array("f")
            samples.frombytes(capture.read_bytes())
            assert len(samples) == 96000 and all(math.isfinite(x) for x in samples)
            left, right = samples[::2], samples[1::2]
            played, silent = (right, left) if device == "B" else (left, right)
            assert max(abs(x) for x in played) > 1e-5, device + " pointer key produced no audio"
            assert all(x == 0 for x in silent), device + " sounded on the wrong output"
            assert all(x == 0 for x in played[-4096:]), device + " pointer release did not terminate"
            print("PASS private pointer keyboard", device, "peak", max(abs(x) for x in played))
    finally:
        x11.XCloseDisplay(display)


if __name__ == "__main__":
    main()
