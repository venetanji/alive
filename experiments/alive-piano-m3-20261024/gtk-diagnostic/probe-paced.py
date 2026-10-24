import os, sys, time
from pathlib import Path
sys.path.insert(0,str(Path('apps/ultra/tests').resolve()))
import check_canvas_desktop as ui
import check_alive_desktop as alive
parent=int(os.environ['ULTRA_TEST_PID'])
for attempt in range(150):
    children=Path(f'/proc/{parent}/task/{parent}/children').read_text().split()
    candidates=[int(pid) for pid in children if Path(f'/proc/{pid}/exe').exists() and Path(f'/proc/{pid}/exe').resolve().name=='alive']
    if candidates:
        ui.pid=candidates[0]
        break
    time.sleep(.1)
else:
    raise AssertionError('No traced Alive child')
original_keys=ui.keys
def paced_location_key(*names):
    if names!=('slash',):
        return original_keys(*names)
    code=ui.x.XKeysymToKeycode(ui.display,ui.x.XStringToKeysym(b'slash'))
    assert ui.t.XTestFakeKeyEvent(ui.display,code,1,0)
    ui.x.XFlush(ui.display)
    time.sleep(.2)
    assert ui.t.XTestFakeKeyEvent(ui.display,code,0,0)
    ui.x.XFlush(ui.display)
    time.sleep(.15)
ui.keys=paced_location_key
alive.windows.focus('Alive')
ui.wait_for('Start transport')
print('Loaded frozen Alive; adding saved utility',flush=True)
ui.click('Pulse clip')
alive.choose_file('Add effect','Load Ultra Device',Path('apps/ultra/examples/utility.ultra').resolve())
print('First chooser accepted',flush=True)
alive.choose_file('Add effect','Load Ultra Device',Path('apps/ultra/examples/stereo-lowpass.ultra').resolve())
print('Second chooser accepted',flush=True)
time.sleep(2)
ui.click('Quit Alive')
alive.windows.focus('Unsaved Alive Session')
ui.click('Discard')
time.sleep(.5)
print('Paced slash completed both dialogs and Quit',flush=True)
