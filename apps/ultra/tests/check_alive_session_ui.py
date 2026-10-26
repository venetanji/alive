#!/usr/bin/env python3
"""Session presentation/fader preflight followed by the original native clip journey."""
import ctypes as C
import json
import time
import check_alive_clips as clips
from gi.repository import Atspi

alive, ui, windows = clips.alive, clips.ui, clips.windows


def main_window():
    root, parent, count = C.c_ulong(), C.c_ulong(), C.c_uint()
    children = C.POINTER(C.c_ulong)()
    ui.x.XQueryTree(ui.display, ui.x.XDefaultRootWindow(ui.display), C.byref(root),
                   C.byref(parent), C.byref(children), C.byref(count))
    try:
        for index in range(count.value):
            name = C.c_char_p()
            if ui.x.XFetchName(ui.display, children[index], C.byref(name)) and name.value:
                title = name.value.decode().removeprefix('* ')
                ui.x.XFree(name)
                if title == 'Alive':
                    return children[index]
    finally:
        if children:
            ui.x.XFree(children)
    raise AssertionError('No Alive main window')


def capture(width, height):
    xid = main_window()
    ui.x.XMoveWindow(ui.display, xid, 0, 0)
    ui.x.XResizeWindow(ui.display, xid, width, height)
    ui.x.XFlush(ui.display)
    time.sleep(.4)
    for name in ('Pulse mute', 'Pulse solo', 'Harmony mute', 'Harmony solo'):
        control = ui.wait_for(name)
        rect = Atspi.Component.get_extents(control, Atspi.CoordType.SCREEN)
        assert control.get_state_set().contains(Atspi.StateType.SHOWING), name
        assert 0 <= rect.y < rect.y + rect.height <= height, (name, rect)
    root = ui.Gdk.get_default_root_window()
    ui.Gdk.pixbuf_get_from_window(root, 0, 0, width, height).savev(
        str(ui.output / f'native-session-{width}x{height}.png'), 'png', [], [])


def run():
    windows.focus(alive.MAIN)
    slider = ui.wait_for('Pulse gain fader')
    before = float(alive.value('Pulse gain'))
    Atspi.Component.grab_focus(slider)
    ui.keys('Up')
    after = float(alive.wait_value('Pulse gain', lambda value: float(value) != before))
    assert before < after <= 2, (before, after)
    alive.numeric('Pulse gain', .713)
    slider = ui.wait_for('Pulse gain fader')
    assert abs(Atspi.Value.get_current_value(slider) - .713) < .00001
    (ui.output / 'native-fader.json').write_text(json.dumps(
        {'before': before, 'arrow_up': after, 'numeric_and_fader': .713}, indent=2))
    capture(1440, 900)
    capture(1280, 800)
    ui.click('Edit selected device in Ultra')
    windows.focus('Pulse - Ultra Hosted Editor')
    ui.wait_for('Hosted Cutoff base')
    ui.click('Close hosted editor')
    windows.focus(alive.MAIN)
    assert not clips.editor_exists()
    original_point = alive.value('Cutoff point 1 value')
    alive.numeric('Cutoff point 1 value', 1781)
    assert alive.value('Cutoff point 1 value') == '1781'
    ui.click('Undo pending edit')
    assert alive.value('Cutoff point 1 value') == original_point
    (ui.output / 'native-preflight.json').write_text(json.dumps(
        {'editor_open_close': True, 'automation_edit_undo': True,
         'original_cutoff_point': original_point}, indent=2))
    clips.run()


if __name__ == '__main__':
    try:
        run()
    except Exception:
        alive.screenshot('session-ui-failure.png')
        raise
