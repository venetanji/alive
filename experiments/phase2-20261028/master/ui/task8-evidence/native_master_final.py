import json, time, os
from pathlib import Path
from gi.repository import Atspi
import check_alive_desktop as alive
import check_alive_arrangement as arrangement
from desktop_process_helpers import process_identity
ui=alive.ui
report={'scope':'private Xvfb / software PipeWire, no physical audio claim','actions':[]}
def record(action, **data):
    report['actions'].append({'action':action,**data}); (ui.output/'master-actions.json').write_text(json.dumps(report,indent=2))
def val(name):
    return Atspi.Value.get_current_value(ui.wait_for(name))
def drag(name):
    ui.drag_control(name,(.5,.8),(.5,.2)); high=val(name)
    ui.drag_control(name,(.5,.2),(.5,.8)); low=val(name)
    assert high>low,(name,high,low)
    record('vertical pointer', control=name, high=high, low=low)
def status(): return alive.value('Master output status')
def snapshot(view, width, height):
    ui.t.XTestFakeMotionEvent(ui.display,0,500,10,0);ui.x.XFlush(ui.display);time.sleep(.8)
    arrangement.capture_window(width,height,f'{view}-{width}x{height}.png')
    names=['Master gain fader','Master stereo peak','Master gain','Master left peak','Master right peak','Stop transport']
    if view=='session':names+=['Pulse gain fader','Pulse stereo peak']
    boxes={}
    for name in names:
        rect=Atspi.Component.get_extents(ui.wait_for(name),Atspi.CoordType.SCREEN)
        boxes[name]={'x':rect.x,'y':rect.y,'width':rect.width,'height':rect.height}
    if view=='session':
        for left,right in [('Master gain fader','Pulse gain fader'),('Master stereo peak','Pulse stereo peak')]:
            assert abs(boxes[left]['y']-boxes[right]['y'])<=2 and abs((boxes[left]['y']+boxes[left]['height'])-(boxes[right]['y']+boxes[right]['height']))<=2, boxes
    record('capture',view=view,width=width,height=height,boxes=boxes,status=status())
try:
    alive.windows.focus(alive.MAIN)
    ui.wait_for('Master gain fader')
    record('identity',process=process_identity(ui.pid))
    for size in [(1440,900),(1280,800)]: snapshot('session',*size)
    drag('Pulse gain fader');drag('Master gain fader')
    alive.numeric('Master gain',0)
    result=alive.wait_value('Master output status',lambda s:'Saved target -inf' in s and 'applied -inf' in s)
    record('gain zero admitted and observed',status=result)
    ui.click('Reset Master gain to unity')
    result=alive.wait_value('Master output status',lambda s:'Saved target 0.0 dB' in s and 'applied 0.0 dB' in s)
    record('unity admitted and observed',status=result)
    ui.click('Reset Master digital overload')
    record('overload reset',status=alive.wait_value('Master output status',lambda s:'reset admitted' in s.lower()))
    if os.environ.get('TASK8_SESSION_ONLY')=='1':
        for _ in range(30):
            ui.t.XTestFakeMotionEvent(ui.display,0,900,150,0);ui.t.XTestFakeButtonEvent(ui.display,7,1,0);ui.t.XTestFakeButtonEvent(ui.display,7,0,0);ui.x.XFlush(ui.display)
        time.sleep(.5)
        rect=Atspi.Component.get_extents(ui.wait_for('Select Track 8 slot 4'),Atspi.CoordType.SCREEN)
        master=Atspi.Component.get_extents(ui.wait_for('Select Master output'),Atspi.CoordType.SCREEN)
        record('session scroll right',track8={'x':rect.x,'width':rect.width},master={'x':master.x,'width':master.width})
        ui.t.XTestFakeMotionEvent(ui.display,0,500,10,0);ui.x.XFlush(ui.display);time.sleep(.8)
        arrangement.capture_window(1280,800,'session-1280-right.png')
        if not (rect.x>=0 and rect.x+rect.width<=1280 and master.x+master.width<=1280): raise AssertionError((rect.x,master.x))
        raise SystemExit(0)
    ui.click('Arrangement workspace')
    for size in [(1440,900),(1280,800)]: snapshot('arrangement',*size)
    drag('Master gain fader')
    alive.numeric('Master gain',.5)
    result=alive.wait_value('Master output status',lambda s:'Saved target -6.0 dB' in s and 'applied -6.0 dB' in s)
    record('arrangement gain admitted and observed',status=result)
except Exception:
    alive.screenshot('master-failure.png')
    raise
