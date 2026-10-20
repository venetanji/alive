#!/usr/bin/env python3
"""Real Tauri + JACK regression. Requires a running, connected, low-gain Ultra.

This edits and restores one A cable. It never starts a server or changes settings.
Python GI/AT-SPI drives the actual webview; the C++ probe sends MIDI and captures
only Ultra's outputs. This is not a hardware latency or deadline benchmark.
"""
import argparse
import array
import math
import pathlib
import subprocess
import sys
import tempfile
import time

import gi

gi.require_version("Atspi", "2.0")
from gi.repository import Atspi


def walk(accessible):
    yield accessible
    for i in range(accessible.get_child_count()):
        yield from walk(accessible.get_child_at_index(i))


def applications():
    apps = [a for a in Atspi.get_desktop(0) if a.get_name() == "ultra"]
    # GTK and WebKit can register separate roots for the same native process.
    if len({a.get_process_id() for a in apps}) != 1:
        raise RuntimeError("Run exactly one actual Ultra desktop app")
    return apps


def find(name):
    return next(a for root in applications() for a in walk(root) if a.get_name() == name)


def click(name):
    if not Atspi.Action.do_action(find(name), 0):
        raise RuntimeError("Unable to activate " + name)
    time.sleep(0.2)


def peak(samples, start, end):
    return max(abs(x) for x in samples[start:end])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--probe", type=pathlib.Path, required=True)
    args = parser.parse_args()
    for device in ("A", "B"):
        level = Atspi.Value.get_current_value(find("Level device " + device))
        if not 1 <= level <= 8:
            raise RuntimeError("Set both app gains to 1..8 before this audible test")
    find("Cable note.in to faust.voice~, device A")
    find("Cable note.in to faust.voice~, device B")
    disconnected = False
    with tempfile.TemporaryDirectory(prefix="ultra-desktop-isolation-") as directory:
        capture = pathlib.Path(directory) / "audio.f32"
        probe = subprocess.Popen(
            [str(args.probe.resolve()), "hold", "ultra", str(capture)],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        )
        try:
            time.sleep(1)
            click("Cable note.in to faust.voice~, device A")
            click("Disconnect cable")
            disconnected = True
            stdout, stderr = probe.communicate(timeout=10)
            if probe.returncode:
                raise RuntimeError(stdout + stderr)
            samples = array.array("f")
            samples.frombytes(capture.read_bytes())
            assert len(samples) == 288000 and all(math.isfinite(x) for x in samples)
            left, right = samples[::2], samples[1::2]
            assert peak(left, 16000, 24000) > 1e-5, "A never sounded before edit"
            assert peak(right, 16000, 24000) > 1e-5, "B never sounded before edit"
            assert peak(left, 70000, 90000) == 0, "Disconnected A remained audible"
            assert peak(right, 70000, 90000) > 1e-5, "Editing A terminated B's held MIDI note"
            for start in range(70000, 90000, 1024):
                assert peak(right, start, start + 1024) > 1e-5, "B was interrupted"
            assert peak(left, 140000, 144000) == peak(right, 140000, 144000) == 0
        finally:
            original_error = sys.exc_info()[1]
            cleanup_errors = []
            try:
                if probe.poll() is None:
                    try:
                        probe.communicate(timeout=2)
                    except subprocess.TimeoutExpired:
                        probe.terminate()
                        try:
                            probe.communicate(timeout=2)
                        except subprocess.TimeoutExpired:
                            probe.kill()
                            probe.communicate(timeout=2)
                        click("Panic")
            except Exception as error:
                cleanup_errors.append(error)
            finally:
                if disconnected:
                    try:
                        click("Outlet · note.in · A")
                        click("Inlet · faust.voice~ · A")
                    except Exception as error:
                        cleanup_errors.append(error)
            if cleanup_errors:
                if original_error is None:
                    raise cleanup_errors[0]
                for error in cleanup_errors:
                    print("Cleanup also failed: " + str(error), file=sys.stderr)
        time.sleep(0.3)
        assert not any(
            a.get_role_name() == "status bar"
            and "Event rejected by native engine" in Atspi.Text.get_text(a, 0, -1)
            for root in applications() for a in walk(root)
        ), "Restoring a valid route incorrectly reported a rejected event"
        print("PASS actual desktop route isolation: A mutes, B continues, MIDI all-off ends B; route restores without rejection")


if __name__ == "__main__":
    main()
