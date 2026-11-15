import json
import time
import check_alive_desktop as alive
from gi.repository import Atspi

ui = alive.ui
alive.windows.focus(alive.MAIN)
ui.wait_for('Start transport')
alive.select_clip('Harmony')
alive.prepare_workspace_control('Replace Harmony device')

def scroll_top():
    assert ui.t.XTestFakeMotionEvent(ui.display, 0, 375, 200, 0)
    for _ in range(20):
        assert ui.t.XTestFakeButtonEvent(ui.display, 4, 1, 0)
        assert ui.t.XTestFakeButtonEvent(ui.display, 4, 0, 0)
    ui.x.XFlush(ui.display)
    time.sleep(.4)

def sample(control):
    rect = Atspi.Component.get_extents(control, Atspi.CoordType.SCREEN)
    state = control.get_state_set()
    return {'rect': [rect.x, rect.y, rect.width, rect.height],
            'showing': state.contains(Atspi.StateType.SHOWING),
            'visible': state.contains(Atspi.StateType.VISIBLE),
            'monotonic': time.monotonic()}

scroll_top()
control = ui.wait_for('Replace Harmony device')
pre = sample(control)
assert Atspi.Component.grab_focus(control)
immediate = sample(control)
time.sleep(.3)
settled = sample(control)
scroll_top()
alive.screenshot('before-scroll-probe.png')
alive.choose_file('Replace Harmony device', 'Load Ultra Device', alive.DEVICE)
rows = [row for row in alive.native_inputs if row.get('name') == 'Replace Harmony device']
report = {'pre_focus': pre, 'immediate_focus': immediate, 'settled_focus': settled, 'input': rows,
          'chooser_opened_and_device_selected': True}
(ui.output / 'scroll-probe.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2), flush=True)
ui.click('Quit Alive')
