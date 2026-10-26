#!/usr/bin/env python3
"""Check native Replace receipts and failed chooser evidence in the private harness.

Run with ULTRA_TEST_ALIVE=1 and this file as ULTRA_TEST_SCRIPT through
check_canvas_desktop.sh. The deliberately absent title must still fail the
original chooser assertion after its original polling bound.
"""
import json
import ctypes as C

import check_alive_desktop as alive


def transient_window(x=0, y=0):
    native = alive.ui.x
    native.XCreateSimpleWindow.argtypes = [C.c_void_p, C.c_ulong, C.c_int, C.c_int,
                                          C.c_uint, C.c_uint, C.c_uint, C.c_ulong, C.c_ulong]
    native.XCreateSimpleWindow.restype = C.c_ulong
    native.XMapRaised.argtypes = [C.c_void_p, C.c_ulong]
    native.XDestroyWindow.argtypes = [C.c_void_p, C.c_ulong]
    native.XSync.argtypes = [C.c_void_p, C.c_int]
    return native.XCreateSimpleWindow(alive.ui.display, native.XDefaultRootWindow(alive.ui.display),
                                      x, y, 4, 4, 0, 0, 0)


def destroyed_hit_input():
    original = alive.native_hit_path
    destroyed = []

    def disappearing_hit(x, y):
        window = transient_window(x - 2, y - 2)
        alive.ui.x.XMapRaised(alive.ui.display, window)
        alive.ui.x.XSync(alive.ui.display, 0)
        path = original(x, y)
        assert window in path, 'Regression requires a genuine covering native window'
        alive.ui.x.XDestroyWindow(alive.ui.display, window)
        alive.ui.x.XSync(alive.ui.display, 0)
        destroyed.append(window)
        return path

    alive.native_hit_path = disappearing_hit
    try:
        alive.choose_file('Replace Pulse device', 'Load Ultra Device', alive.DEVICE)
    finally:
        alive.native_hit_path = original
    before = next(row for row in reversed(alive.native_inputs) if row['action'] == 'chooser input before')
    vanished = next(window for window in before['windows'] if window['window'] == destroyed[0])
    assert vanished['unavailable'] and any(error['code'] == 3 for error in vanished['x_errors'])
    queued = next(row for row in reversed(alive.native_inputs) if row['action'] == 'chooser input queued')
    assert queued['presses'] == queued['releases'] == 1


def destroyed_root_candidate():
    window = transient_window()
    original = alive.native_window_record
    destroyed = []

    def disappearing_record(candidate):
        if candidate == window:
            alive.ui.x.XDestroyWindow(alive.ui.display, window)
            alive.ui.x.XSync(alive.ui.display, 0)
            destroyed.append(window)
        return original(candidate)

    title = 'Diagnostic absent chooser'
    alive.native_window_record = disappearing_record
    try:
        try:
            alive.focus_chooser(title)
        except AssertionError as error:
            assert str(error) == 'Native chooser did not become viewable: ' + title
        else:
            raise AssertionError('Missing chooser unexpectedly accepted')
    finally:
        alive.native_window_record = original
    assert destroyed == [window]
    report = json.loads((alive.ui.output / 'chooser-failure.json').read_text())
    vanished = next(row for row in report['root_windows'] if row['window'] == window)
    assert vanished['unavailable'] and any(error['code'] == 3 for error in vanished['x_errors'])
    assert report['title'] == title and report['candidates'] == []
    assert any(row['title'] == alive.MAIN and row['map_state'] == 2
               and row['pid'] == [alive.ui.pid] for row in report['root_windows'])


def restored_error_handler():
    native, display = alive.ui.x, alive.ui.display
    window = transient_window()
    native.XDestroyWindow(display, window)
    native.XSync(display, 0)
    outside = []

    @alive.XErrorHandler
    def previous_handler(connection, event):
        outside.append((connection, event.contents.error_code))
        return 0

    handler = C.cast(previous_handler, C.c_void_p)
    previous = native.XSetErrorHandler(handler)
    other_display = None
    try:
        # An asynchronous error queued before the trap belongs to the prior handler.
        native.XDestroyWindow(display, window)
        record = alive.native_window_record(window)
        assert record['unavailable'] and record['x_errors']
        assert outside == [(display, 3)]
        native.XDestroyWindow(display, window)
        native.XSync(display, 0)
        assert outside == [(display, 3)] * 2
        other_display = native.XOpenDisplay(None)
        assert other_display
        with alive.native_observation_errors() as errors:
            native.XGetWindowAttributes(other_display, window, C.byref(alive.WindowAttributes()))
        assert not errors and outside[-1] == (other_display, 3) and len(outside) == 3
        try:
            with alive.native_observation_errors():
                raise LookupError('Exercise finally restoration')
        except LookupError:
            pass
        native.XDestroyWindow(display, window)
        native.XSync(display, 0)
        assert outside[-1] == (display, 3) and len(outside) == 4
        assert native.XSetErrorHandler(handler) == handler.value
    finally:
        native.XSetErrorHandler(previous)
        if other_display:
            native.XCloseDisplay.argtypes = [C.c_void_p]
            native.XCloseDisplay(other_display)


def run():
    alive.windows.focus(alive.MAIN)
    alive.ui.wait_for('Start transport')
    alive.choose_file('Replace Pulse device', 'Load Ultra Device', alive.DEVICE)
    before = next(row for row in alive.native_inputs if row['action'] == 'chooser input before')
    queued = next(row for row in alive.native_inputs if row['action'] == 'chooser input queued')
    assert before['name'] == queued['name'] == 'Replace Pulse device'
    assert before['rect'] == queued['rect'] and before['point'] == queued['point']
    assert any(window['title'] == alive.MAIN and window['pid'] == [alive.ui.pid]
               for window in before['windows'])
    assert queued['motions'] == queued['presses'] == queued['releases'] == 1
    destroyed_hit_input()
    destroyed_root_candidate()
    restored_error_handler()
    print('PASS owned receipts, disappearing hit/root windows, original input/assertion and handler restoration')


if __name__ == '__main__':
    run()
