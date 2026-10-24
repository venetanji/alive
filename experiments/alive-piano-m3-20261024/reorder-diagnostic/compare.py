import sys,time,json,os,ctypes as C
from pathlib import Path
sys.path.insert(0,str(Path('apps/ultra/tests').resolve()))
import check_canvas_desktop as ui
import check_alive_desktop as alive
from gi.repository import Atspi
rows=[]
ui.x.XTranslateCoordinates.argtypes=[C.c_void_p,C.c_ulong,C.c_ulong,C.c_int,C.c_int,C.POINTER(C.c_int),C.POINTER(C.c_int),C.POINTER(C.c_ulong)]
def window_at(x,y):
 root=ui.x.XDefaultRootWindow(ui.display);dx=C.c_int();dy=C.c_int();child=C.c_ulong()
 assert ui.x.XTranslateCoordinates(ui.display,root,root,x,y,C.byref(dx),C.byref(dy),C.byref(child))
 return child.value

def exists(name):
 try:ui.find(name);return True
 except StopIteration:return False
def record(action,**extra):
 row={'time':time.monotonic(),'action':action,**extra};rows.append(row);(ui.output/'compare.json').write_text(json.dumps(rows,indent=2));print(json.dumps(row),flush=True)
def click(name,mode):
 c=ui.wait_for(name);assert c.get_state_set().contains(Atspi.StateType.ENABLED)
 if mode!='no-focus':Atspi.Component.grab_focus(c)
 r=Atspi.Component.get_extents(c,Atspi.CoordType.SCREEN)
 px,py=r.x+r.width//2,r.y+r.height//2
 expected=window_at(10,10);before=window_at(px,py);started=time.monotonic()
 ui.t.XTestFakeMotionEvent(ui.display,0,px,py,0)
 if mode=='motion-condition':
  ui.x.XFlush(ui.display)
  deadline=time.monotonic()+1
  while window_at(px,py)!=expected and time.monotonic()<deadline:time.sleep(.01)
  record('pointer target unoccluded',before=before,after=window_at(px,py),expected=expected,elapsed=time.monotonic()-started)
  assert window_at(px,py)==expected

 if mode=='motion-flush':ui.x.XFlush(ui.display);time.sleep(.05)
 ui.t.XTestFakeButtonEvent(ui.display,1,1,0)
 if mode=='press-flush':ui.x.XFlush(ui.display);time.sleep(.05)
 ui.t.XTestFakeButtonEvent(ui.display,1,0,0);ui.x.XFlush(ui.display);time.sleep(.15)
def wait_restore():
 deadline=time.monotonic()+2
 while time.monotonic()<deadline:
  if exists('Select Pulse Stereo Lowpass effect 2'):return True
  time.sleep(.1)
 return False
alive.windows.focus('Alive');ui.wait_for('Start transport');ui.click('Pulse clip')
mode=os.environ.get('PROBE_CLICK_MODE','press-flush')
for cycle in range(6):
 ui.click('Move Pulse Stereo Utility effect 1 later');ui.wait_for('Select Pulse Stereo Utility effect 2')
 if mode.startswith('hover-'):
  time.sleep(1.1);alive.screenshot(f'before-earlier-{cycle}.png')
 click('Move Pulse Stereo Utility effect 2 earlier',mode.removeprefix('hover-'))
 ok=wait_restore();record('after Earlier',cycle=cycle,mode=mode,restored=ok)
 if not ok:
  alive.screenshot(f'failed-{cycle}.png');ui.click('Move Pulse Stereo Utility effect 2 earlier');assert wait_restore()
print('COMPARISON COMPLETE',flush=True)
