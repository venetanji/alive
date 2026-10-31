import ctypes as C
import json
import time

import check_alive_desktop as alive
from gi.repository import Atspi

ui = alive.ui
records = []


def rect(name):
    r = Atspi.Component.get_extents(ui.wait_for(name), Atspi.CoordType.SCREEN)
    return dict(x=r.x, y=r.y, width=r.width, height=r.height)


def bottom(r):
    return r['y'] + r['height']


def run():
    alive.windows.focus('Alive')
    ui.wait_for('Launch Quantization')
    ui.click('Session workspace')
    ui.click('Select Pulse slot 1')
    ui.click('Clip detail')
    xid = alive.owned_frame_window()
    ui.x.XMoveWindow.argtypes = [C.c_void_p, C.c_ulong, C.c_int, C.c_int]
    ui.x.XResizeWindow.argtypes = [C.c_void_p, C.c_ulong, C.c_uint, C.c_uint]
    for width, height in [(1440, 900), (800, 600), (1280, 800)]:
        ui.x.XMoveWindow(ui.display, xid, 0, 0)
        ui.x.XResizeWindow(ui.display, xid, width, height)
        ui.x.XFlush(ui.display)
        time.sleep(.5)
        before = rect('Selected track detail')
        ui.click('Maximize detail')
        panel = rect('Selected track detail')
        assert panel['y'] < before['y'] - 60, (before, panel)
        for name in ['Stop transport', 'Alive audio settings', 'Restore detail size']:
            bounds = rect(name)
            assert bounds['width'] > 0 and bounds['height'] > 0, (name, bounds)
            assert bounds['x'] >= 0 and bottom(bounds) <= height, (name, bounds)
        assert bottom(panel) <= height, panel
        alive.screenshot(f'detail-maximized-{width}x{height}.png')
        ui.click('Restore detail size')
        restored = rect('Selected track detail')
        assert abs(restored['height'] - before['height']) <= 1, (before, restored)
        ui.click('Toggle detail')
        ui.click('Maximize detail')
        collapsed_max = rect('Selected track detail')
        assert abs(collapsed_max['height'] - panel['height']) <= 1, (panel, collapsed_max)
        ui.click('Restore detail size')
        records.append(dict(size=[width, height], before=before, maximized=panel,
                            restored=restored, collapsed_max=collapsed_max))
    ui.click('Arrangement workspace')
    ui.click('Maximize detail')
    alive.screenshot('detail-arrangement-maximized.png')
    ui.click('Restore detail size')
    ui.wait_for('Song loop brace')
    (ui.output / 'detail-panel-report.json').write_text(json.dumps(dict(
        status='passed', native_webkit=True, sizes=records,
        arrangement_restored=True), indent=2) + '\n')


ui.find = alive.windows.scoped_find
try:
    run()
except Exception:
    alive.screenshot('detail-panel-failure.png')
    (ui.output / 'detail-panel-failure.json').write_text(json.dumps([
        dict(name=n.get_name(), role=n.get_role_name())
        for f in alive.windows.app_frames() for n in ui.walk(f)], indent=2))
    raise
