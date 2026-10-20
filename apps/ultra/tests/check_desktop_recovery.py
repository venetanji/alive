#!/usr/bin/env python3
"""Check actual desktop recovery AFTER an explicitly approved server restart.

Requires a visible Ultra reporting server loss, an existing 48 kHz JACK server
with a supported period, and both app gains set to 1..8. This script does not
restart a server or change any audio settings. Run jack-probe basic afterward
to check the recovered native MIDI/audio path.
"""
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
    if len({a.get_process_id() for a in apps}) != 1:
        raise RuntimeError("Run exactly one actual Ultra desktop app")
    return apps


def find(name, role):
    return next(
        a for root in applications() for a in walk(root)
        if a.get_role_name() == role and (
            Atspi.Text.get_text(a, 0, -1) if role == "description value" else a.get_name()
        ) == name
    )


def wait_for(value):
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        try:
            find(value, "description value")
            return
        except StopIteration:
            time.sleep(0.1)
    raise AssertionError("Desktop engine state did not become " + value)


def main():
    for device in ("A", "B"):
        level = Atspi.Value.get_current_value(find("Level device " + device, "slider"))
        assert 1 <= level <= 8, "Set both app gains to 1..8 before restarting audio"
    assert any(
        a.get_role_name() == "status bar" and "JACK server disconnected" in Atspi.Text.get_text(a, 0, -1)
        for root in applications() for a in walk(root)
    ), "Expected observed server loss"
    stop = find("Stop", "button")
    assert stop.get_state_set().contains(Atspi.StateType.SENSITIVE), "Server loss disabled Stop despite the Stop/Start recovery instruction"
    assert Atspi.Action.do_action(stop, 0)
    wait_for("Stopped")
    assert Atspi.Action.do_action(find("Start audio", "button"), 0)
    wait_for("Running")
    print("PASS actual desktop server-loss recovery: Stop remains usable; Start recreates the client")


if __name__ == "__main__":
    main()
