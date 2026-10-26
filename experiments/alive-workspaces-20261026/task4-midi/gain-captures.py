import json,time
import check_alive_arrangement as a
ui=a.ui
a.windows.focus('Alive');ui.wait_for('MIDI source');a.arrangement()
d=json.loads((ui.output/'initial.alive').read_text());ui.click('Select placement '+d['placements'][0]['id'])
ui.t.XTestFakeMotionEvent(ui.display,0,1200,420,0);ui.x.XFlush(ui.display);time.sleep(.3)
a.capture_window(1440,900,'native-arrangement-gain-1440x900.png')
a.capture_window(1280,800,'native-arrangement-gain-1280x800.png')
ui.click('Quit Alive');a.exited(ui.pid)
print('PASS final gain screenshots with pointer clear',flush=True)
