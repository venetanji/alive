import sys,time,json
from pathlib import Path
sys.path.insert(0,str(Path('apps/ultra/tests').resolve()))
import check_canvas_desktop as ui
import check_alive_desktop as alive
from gi.repository import Atspi

rows=[]
def chain():
 return [name for name in ['Select Pulse Stereo Utility effect 1','Select Pulse Stereo Utility effect 2','Select Pulse Stereo Lowpass effect 1','Select Pulse Stereo Lowpass effect 2'] if present(name)]
def present(name):
 try:ui.find(name);return True
 except StopIteration:return False
def record(action,**extra):
 row={'time':time.monotonic(),'action':action,'chain':chain(),'status':alive.value('Session status'),**extra};rows.append(row);(ui.output/'probe.json').write_text(json.dumps(rows,indent=2));print(json.dumps(row),flush=True)

alive.windows.focus('Alive');ui.wait_for('Start transport');ui.click('Pulse clip')
for cycle in range(12):
 record('before later',cycle=cycle)
 ui.click('Move Pulse Stereo Utility effect 1 later');ui.wait_for('Select Pulse Stereo Utility effect 2')
 control=ui.wait_for('Move Pulse Stereo Utility effect 2 earlier');r=Atspi.Component.get_extents(control,Atspi.CoordType.SCREEN)
 record('before earlier',cycle=cycle,rect=[r.x,r.y,r.width,r.height],enabled=control.get_state_set().contains(Atspi.StateType.ENABLED))
 ui.click('Move Pulse Stereo Utility effect 2 earlier')
 deadline=time.monotonic()+3
 while time.monotonic()<deadline and not present('Select Pulse Stereo Lowpass effect 2'):time.sleep(.1)
 restored=present('Select Pulse Stereo Lowpass effect 2');record('after earlier',cycle=cycle,restored=restored)
 if not restored:
  alive.screenshot(f'failed-{cycle}.png')
  ui.click('Move Pulse Stereo Utility effect 2 earlier');time.sleep(.5)
  record('after click retry',cycle=cycle,restored=present('Select Pulse Stereo Lowpass effect 2'))
  if not present('Select Pulse Stereo Lowpass effect 2'):
   Atspi.Component.grab_focus(ui.wait_for('Move Pulse Stereo Utility effect 2 earlier'));ui.keys('space');time.sleep(.5)
   record('after keyboard Space',cycle=cycle,restored=present('Select Pulse Stereo Lowpass effect 2'))
  if not present('Select Pulse Stereo Lowpass effect 2'):break
alive.screenshot('final.png')
print('FOCUSED PROBE COMPLETE',flush=True)
