import json, time
from gi.repository import Atspi
import check_alive_desktop as alive
import check_alive_arrangement as arrangement
from desktop_process_helpers import process_identity
ui = alive.ui
report = {'identity': None, 'sizes': {}}
def box(name):
    r = Atspi.Component.get_extents(ui.wait_for(name), Atspi.CoordType.SCREEN)
    return {'x':r.x,'y':r.y,'width':r.width,'height':r.height}
def measure():
    return {name:box(name) for name in ('Pulse gain fader','Harmony gain fader','Master gain fader','Pulse mute','Harmony mute','Pulse solo','Harmony solo')}
def persist():
    (ui.output/'geometry.json').write_text(json.dumps(report,indent=2))
try:
    alive.windows.focus(alive.MAIN)
    ui.wait_for('Start transport')
    report['identity'] = process_identity(ui.pid)
    for w,h in ((1440,900),(1280,800)):
        arrangement.capture_window(w,h,f'{w}-collapsed.png')
        before = measure()
        arrangement.expanded('Device / track',True)
        ui.t.XTestFakeMotionEvent(ui.display,0,500,10,0); ui.x.XFlush(ui.display); time.sleep(.5)
        arrangement.capture_window(w,h,f'{w}-expanded.png')
        opened = measure()
        arrangement.expanded('Device / track',False)
        arrangement.capture_window(w,h,f'{w}-recovered.png')
        recovered = measure()
        report['sizes'][str(w)]={'collapsed':before,'expanded':opened,'recovered':recovered}
        persist()
        for state in (before,opened,recovered):
            for left,right in (('Pulse gain fader','Harmony gain fader'),('Pulse gain fader','Master gain fader'),('Pulse mute','Harmony mute'),('Pulse solo','Harmony solo')):
                for edge in ('y','bottom'):
                    a,b=state[left],state[right]
                    av=a['y']+(a['height'] if edge=='bottom' else 0)
                    bv=b['y']+(b['height'] if edge=='bottom' else 0)
                    assert abs(av-bv)<=2,(w,left,right,edge,av,bv)
        for name in before:
            for edge in ('y','height'):
                assert abs(before[name][edge]-opened[name][edge])<=2,(w,name,edge,before[name],opened[name])
                assert abs(before[name][edge]-recovered[name][edge])<=2,(w,name,edge,before[name],recovered[name])
    ui.click('Quit Alive')
    arrangement.exited(ui.pid)
    report['quit']=True
    persist()
except BaseException as e:
    report['error']=repr(e); persist(); alive.screenshot('failure.png'); raise
