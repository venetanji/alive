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
alive.windows.focus('Alive')
ui.wait_for('Start transport')
print('Loaded frozen Alive; adding saved utility',flush=True)
ui.click('Pulse clip')
alive.choose_file('Add effect','Load Ultra Device',Path('apps/ultra/examples/utility.ultra').resolve())
print('First chooser accepted',flush=True)
alive.choose_file('Add effect','Load Ultra Device',Path('apps/ultra/examples/stereo-lowpass.ultra').resolve())
print('Second chooser accepted',flush=True)
time.sleep(2)
