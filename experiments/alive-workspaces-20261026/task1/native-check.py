import sys
from pathlib import Path
sys.path.insert(0, str(Path.cwd() / 'apps/ultra/tests'))
import ctypes as C
import json
import time
import check_alive_desktop as alive
from gi.repository import Atspi
ui, windows = alive.ui, alive.windows


def activate(name):
    ui.click(name)


def pointer_activate(name):
    control=ui.wait_for(name)
    rect=Atspi.Component.get_extents(control,Atspi.CoordType.SCREEN)
    ui.t.XTestFakeMotionEvent(ui.display,0,rect.x+rect.width//2,rect.y+rect.height//2,0)
    ui.t.XTestFakeButtonEvent(ui.display,1,1,0)
    ui.t.XTestFakeButtonEvent(ui.display,1,0,0)
    ui.x.XFlush(ui.display)
    time.sleep(.2)


def disclose(name, opened):
    item = ui.wait_for(name)
    if item.get_state_set().contains(Atspi.StateType.EXPANDED) != opened:
        activate(name)


def main_window():
    root = C.c_ulong(); parent = C.c_ulong(); children = C.POINTER(C.c_ulong)(); count = C.c_uint()
    ui.x.XQueryTree(ui.display, ui.x.XDefaultRootWindow(ui.display), C.byref(root), C.byref(parent), C.byref(children), C.byref(count))
    try:
        for index in range(count.value):
            name = C.c_char_p()
            if ui.x.XFetchName(ui.display, children[index], C.byref(name)) and name.value:
                text = name.value.decode('utf-8').removeprefix('* ')
                ui.x.XFree(name)
                if text == 'Alive':
                    return children[index]
    finally:
        if children: ui.x.XFree(children)
    raise AssertionError('No Alive native main window')


def capture(name, width, height):
    xid=main_window()
    ui.x.XMoveWindow(ui.display,xid,0,0)
    ui.x.XResizeWindow(ui.display,xid,width,height)
    ui.x.XFlush(ui.display)
    time.sleep(.35)
    root=ui.Gdk.get_default_root_window()
    ui.Gdk.pixbuf_get_from_window(root,0,0,width,height).savev(str(ui.output/name),'png',[],[])


report={'scope':'Task 1 working Session and unavailable Arrangement; private software audio only','observations':[]}
try:
    windows.focus('Alive');ui.wait_for('Select Track 8 slot 4')
    capture('native-session-1440x900.png',1440,900)
    activate('Arrangement workspace');ui.wait_for('Arrangement playback and timeline editing are unavailable in this version.',True)
    capture('native-arrangement-unavailable-1440x900.png',1440,900)
    activate('Session workspace');capture('native-session-1280x800.png',1280,800)
    gain=ui.wait_for('Pulse gain');Atspi.Component.grab_focus(gain);ui.text('Pulse gain','0.2')
    for index in range(3):
        pointer_activate('Arrangement workspace');pointer_activate('Session workspace')
    assert alive.value('Pulse gain')=='0.2', 'WebKit lost unfinished Session gain across navigation'
    report['webkit_unfinished_gain_preserved']=True
    ui.text('Pulse gain','0.125');ui.keys('Tab')
    activate('Arrangement workspace');capture('native-arrangement-unavailable-1280x800.png',1280,800);activate('Session workspace')
    activate('Alive audio settings');activate('Save and start Alive audio');activate('Close audio settings')
    disclose('Audio details',True);alive.wait_value('Audio callbacks',lambda s:int(s)>0);assert alive.value('Transport playing')=='false';disclose('Audio details',False)
    activate('Start transport');time.sleep(.3)
    capture_audio=alive.start_capture('workspace-switch-playback')
    for index in range(4):
        activate('Arrangement workspace');activate('Session workspace')
    activate('Launch scene 2')
    for index in range(3):
        activate('Arrangement workspace');activate('Session workspace')
    alive.wait_value('Pulse clip runtime',lambda s:'Playing Clip 2' in s)
    alive.wait_value('Scene 2 request',lambda s:'applied' in s)
    report['scene_receipt']=alive.value('Scene 2 request')
    report['track_runtime']=alive.value('Pulse clip runtime')
    report['capture']=alive.finish_capture(capture_audio);assert report['capture']['peak']>0
    activate('Select Harmony slot 2');activate('Devices detail')
    activate('Edit selected device in Ultra');windows.focus('Harmony - Ultra Hosted Editor');ui.wait_for('Hosted Cutoff base')
    report['editor_opened']=True
    activate('Close hosted editor');windows.focus('Alive')
    disclose('Audio details',True);before=int(alive.value('Absolute frame'));time.sleep(.2)
    report['audio']=alive.detail();assert int(report['audio']['Absolute frame'])>before
    assert report['audio']['Transport playing']=='true';assert report['audio']['Rejected commands']=='0';assert report['audio']['Audio stream errors']=='0';assert report['audio']['Audio failed']=='false'
    disclose('Audio details',False)
    activate('Stop transport');disclose('Audio details',True);alive.wait_value('Transport playing',lambda s:s=='false');disclose('Audio details',False)
    activate('Save session');activate('Quit Alive')
    deadline=time.monotonic()+8
    while time.monotonic()<deadline:
        if not Path(f'/proc/{ui.pid}/stat').exists() or Path(f'/proc/{ui.pid}/stat').read_text().split(') ',1)[1].split()[0]=='Z':break
        time.sleep(.1)
    else:raise AssertionError('Alive did not quit')
    report['quit_exited']=True
    (ui.output/'native-report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2),flush=True)
except Exception:
    alive.screenshot('native-failure.png')
    raise
