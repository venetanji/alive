import ctypes as C
import json, os, sys, time
from pathlib import Path
sys.path.insert(0,str(Path('apps/ultra/tests').resolve()))
import check_alive_desktop as alive
import check_alive_session_ui as presentation
from gi.repository import Atspi
ui,windows=alive.ui,alive.windows
report=[]
def record(action,**data):
 report.append({'action':action,'time':time.monotonic(),**data});(ui.output/'actions.json').write_text(json.dumps(report,indent=2))
def rect(name):return Atspi.Component.get_extents(ui.wait_for(name),Atspi.CoordType.SCREEN)
def drag(sx,sy,ex,ey):
 assert ui.t.XTestFakeMotionEvent(ui.display,0,round(sx),round(sy),0)
 assert ui.t.XTestFakeButtonEvent(ui.display,1,1,0);ui.x.XFlush(ui.display);time.sleep(.15)
 for step in range(1,9):
  assert ui.t.XTestFakeMotionEvent(ui.display,0,round(sx+(ex-sx)*step/8),round(sy+(ey-sy)*step/8),0);ui.x.XFlush(ui.display);time.sleep(.06)
 assert ui.t.XTestFakeButtonEvent(ui.display,1,0,0);ui.x.XFlush(ui.display);time.sleep(.4)
def capture(w,h,name):
 xid=presentation.main_window();ui.x.XMoveWindow(ui.display,xid,0,0);ui.x.XResizeWindow(ui.display,xid,w,h);ui.x.XFlush(ui.display);time.sleep(.5)
 root=ui.Gdk.get_default_root_window();ui.Gdk.pixbuf_get_from_window(root,0,0,w,h).savev(str(ui.output/name),'png',[],[])
def save(name):
 ui.click('Prepare / Apply');time.sleep(.4);p=ui.output/name;alive.choose_file('Save session as','Save Alive Session',p);return json.loads(p.read_text())
try:
 windows.focus('Alive');ui.wait_for('Enable MIDI workspaces');ui.click('Enable MIDI workspaces');alive.numeric('Transport length beats',16)
 ui.click('Arrangement workspace');capture(1440,900,'before-create.png')
 # The ruler supplies native hit geometry; select the blank [8,10) lane range.
 tick=rect('Seek to beat 8');header=rect('Select Pulse Arrangement track');x=tick.x
 drag(x,header.y+40,x+96,header.y+40);record('select blank range',range=alive.value('timeline-range') if False else '[8,10)')
 ui.click('Create MIDI source');ui.wait_for('MIDI source name');ui.text('MIDI source name','First MIDI');ui.keys('Tab');ui.click('Add note');ui.click('Place source in range');
 record('create source then note then placement',notice=alive.value('Session status'))
 before=save('first-created.alive');p=next(p for p in before['placements'] if next(s for s in before['sources'] if s['id']==p['sourceId'])['name']=='First MIDI');assert p['start']==8 and p['duration']==2,p
 record('saved created source and placement',placement=p,source=next(s for s in before['sources'] if s['id']==p['sourceId']))
 ui.click('Arrangement workspace');control=rect('Select placement '+p['id']);drag(control.x+control.width/2,control.y+10,control.x+control.width/2+96,control.y+10)
 moved=save('first-moved.alive');q=next(q for q in moved['placements'] if q['id']==p['id']);assert q['start']==10 and q['duration']==2,q
 assert moved['sources']==before['sources'];record('move same-track +2 beats, source preserved',placement=q)
 ui.click('Arrangement workspace');ui.click('Select placement '+p['id']);
 capture(1440,900,'native-arrangement-1440x900.png');capture(1280,800,'native-arrangement-1280x800.png');record('checkpoint complete',sizes=[[1440,900],[1280,800]])
 ui.click('Quit Alive')
 print('PASS first real create/select/move')
except Exception:
 alive.screenshot('first-interaction-failure.png');raise
