#!/usr/bin/env python3
import sys
sys.path.insert(0, '/home/venetanji/.codex/worktrees/edd5/alive/apps/ultra/tests')
import json
import time
import check_documents_desktop as desktop
from gi.repository import Atspi
ui = desktop.ui
path = desktop.write_patch('numeric-authoring.ultra', [desktop.node(1, 'number_int', {'value':1})], [])
def check(expected):
    for _ in range(50):
        if ui.numeric_value('number value, object 1') == expected:
            break
        time.sleep(.1)
    else:
        raise AssertionError('Numeric observation did not reach '+str(expected))
    patch = ui.export()
    assert patch['nodes'][0]['params']['value'] == expected, patch
    return patch
def edit(value):
    ui.click_control('number value, object 1', .5, .5)
    ui.keys('Control_L', 'a')
    for key in str(value): ui.keys(key)
    ui.keys('Tab')
def focus_canvas():
    assert Atspi.Component.grab_focus(ui.wait_for('Editable patch canvas'))
try:
    desktop.open_file(path)
    ui.click('Start audio')
    ui.wait_for('Audio on', text_content=True)
    focus_canvas()
    ui.keys('Control_L', 'e')
    edit(7)
    check(7)
    focus_canvas()
    ui.keys('Control_L', 'z')
    check(1)
    focus_canvas()
    ui.keys('Control_L', 'Shift_L', 'z')
    check(7)
    focus_canvas()
    ui.keys('Control_L', 's')
    for _ in range(50):
        if json.loads(path.read_text())['nodes'][0]['params']['value'] == 7: break
        time.sleep(.1)
    else: raise AssertionError('Live edit was not saved')
    ui.click('Stop audio')
    edit(11)
    check(11)
    ui.click('Start audio')
    ui.wait_for('Audio on', text_content=True)
    check(11)
    ui.click('Stop audio')
    focus_canvas()
    ui.keys('Control_L', 's')
    for _ in range(50):
        if json.loads(path.read_text())['nodes'][0]['params']['value'] == 11: break
        time.sleep(.1)
    else: raise AssertionError('Stopped edit was not saved')
    desktop.native_menu('Close Window')
    result = {'complete':True, 'scope':'Real Ultra native window/shared authoring path; canvas_param production helper independently tested in Rust', 'live_numeric':7, 'undo':1, 'redo':7, 'stopped_numeric':11, 'restart_retained':11, 'saved_values':[7,11], 'physical_audio':False}
    (ui.output/'numeric-result.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2),flush=True)
finally:
    ui.x.XCloseDisplay(ui.display)
