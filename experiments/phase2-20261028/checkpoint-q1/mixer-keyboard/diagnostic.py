import json,time,traceback
from gi.repository import Atspi, GLib
import check_alive_desktop as alive
import check_alive_arrangement as arrangement
from desktop_process_helpers import process_identity
ui=alive.ui
report={'identity_before':None,'identity_after':None,'sizes':{},'quit':False}
def persist(): (ui.output/'keyboard.json').write_text(json.dumps(report,indent=2))
def focus():
    result=[]
    for root in ui.desktop_apps():
        if root.get_process_id()!=ui.pid: continue
        for a in ui.walk(root):
            try:
                if a.get_state_set().contains(Atspi.StateType.FOCUSED):
                    r=Atspi.Component.get_extents(a,Atspi.CoordType.SCREEN)
                    result.append({'name':a.get_name(),'role':a.get_role_name(),'rect':[r.x,r.y,r.width,r.height]})
            except (GLib.GError,NotImplementedError): pass
    return result
def summary(): return next(a for a in ui.walk(ui.wait_for('Pulse track')) if a.get_name()=='Device / track')
def state(a,flag): return a.get_state_set().contains(flag)
def box(name):
    r=Atspi.Component.get_extents(ui.wait_for(name),Atspi.CoordType.SCREEN)
    return {'x':r.x,'y':r.y,'width':r.width,'height':r.height}
def measure(): return {n:box(n) for n in ('Pulse gain fader','Harmony gain fader','Master gain fader','Pulse mute','Harmony mute','Pulse solo','Harmony solo')}
def key(row,*keys):
    ui.keys(*keys); row.append({'keys':'+'.join(keys),'focus':focus(),'expanded':state(summary(),Atspi.StateType.EXPANDED)})
def pointer(name):
    a=ui.wait_for(name); r=Atspi.Component.get_extents(a,Atspi.CoordType.SCREEN)
    before=state(a,Atspi.StateType.PRESSED)
    ui.t.XTestFakeMotionEvent(ui.display,0,r.x+r.width//2,r.y+r.height//2,0)
    ui.t.XTestFakeButtonEvent(ui.display,1,1,0); ui.t.XTestFakeButtonEvent(ui.display,1,0,0); ui.x.XFlush(ui.display); time.sleep(.6)
    after=state(ui.wait_for(name),Atspi.StateType.PRESSED)
    return {'name':name,'point':[r.x+r.width//2,r.y+r.height//2],'pressed_before':before,'pressed_after':after,'focus':focus(),'disclosure_open_after':state(summary(),Atspi.StateType.EXPANDED)}
try:
    alive.windows.focus(alive.MAIN); ui.wait_for('Start transport')
    report['identity_before']=process_identity(ui.pid)
    for w,h in ((1440,900),(1280,800)):
        result={'keys':[]}; report['sizes'][str(w)]=result
        arrangement.capture_window(w,h,f'{w}-before.png'); result['before']=measure()
        assert Atspi.Component.grab_focus(summary()); time.sleep(.2)
        result['anchor']=focus()
        key(result['keys'],'Shift_L','Tab'); key(result['keys'],'Tab')
        key(result['keys'],'Return'); result['open']=measure()
        arrangement.capture_window(w,h,f'{w}-open.png')
        for _ in range(5): key(result['keys'],'Tab')
        for _ in range(5): key(result['keys'],'Shift_L','Tab')
        result['pointer']=pointer('Harmony mute')
        if result['pointer']['pressed_after']!=result['pointer']['pressed_before']:
            result['pointer_restore']=pointer('Harmony mute')
        assert Atspi.Component.grab_focus(summary()); time.sleep(.2)
        result['close_anchor']=focus(); key(result['keys'],'Return')
        result['recovered']=measure(); arrangement.capture_window(w,h,f'{w}-recovered.png')
        key(result['keys'],'Shift_L','Tab'); key(result['keys'],'Tab')
        persist()
    report['identity_after']=process_identity(ui.pid); persist()
except BaseException as e:
    report['error']=repr(e); report['traceback']=traceback.format_exc(); persist()
finally:
    try:
        ui.click('Quit Alive'); time.sleep(.5)
        try:
            alive.windows.focus('Unsaved Alive Session'); ui.click('Discard')
        except Exception: pass
        arrangement.exited(ui.pid); report['quit']=True
    except BaseException as e: report['quit_error']=repr(e)
    persist()
if 'error' in report or not report['quit']: raise SystemExit(1)
