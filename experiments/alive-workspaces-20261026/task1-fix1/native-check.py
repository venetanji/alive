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



def direct_value(name):
    return Atspi.Text.get_text(ui.wait_for(name),0,-1)


def enabled(name):
    return ui.wait_for(name).get_state_set().contains(Atspi.StateType.ENABLED)


def modified():
    # WebKit omits the plain status span but exposes the same native dirty/draft
    # state through the document title, which render prefixes with '* '.
    return any(node.get_role_name()=='document web' and node.get_name().startswith('* ')
               for frame in windows.app_frames() for node in ui.walk(frame))


def saved_document():
    return json.loads((ui.output/'initial.alive').read_text())


def check_detail_field(kind):
    device=kind=='device'
    own='Devices detail' if device else 'Clip detail'
    other='Clip detail' if device else 'Devices detail'
    name='Cutoff base' if device else 'Note 1 pitch'
    typed='1717' if device else '73'
    activate(own)
    if not device: disclose('Note inspector',True)
    original_value=direct_value(name)
    activate('Save session')
    baseline=saved_document()
    field=ui.wait_for(name);Atspi.Component.grab_focus(field);ui.text(name,typed)
    observations=[]
    for index in range(3):
        pointer_activate(other)
        assert not modified(), f'{kind}: navigation mutated native dirty/draft state'
        assert saved_document()==baseline, f'{kind}: navigation changed saved document'
        assert not enabled('Undo pending edit'), f'{kind}: navigation created native history'
        pointer_activate('Toggle detail');pointer_activate('Toggle detail')
        pointer_activate(own);time.sleep(.4)
        assert direct_value(name)==typed, f'{kind}: lost unfinished field after polling'
        pointer_activate('Toggle detail');pointer_activate(other)
        pointer_activate(own);time.sleep(.4)
        assert direct_value(name)==typed, f'{kind}: wrong inner field restored'
        assert not enabled('Undo pending edit')
        observations.append({'round':index+1,'typed_value':direct_value(name),'native_modified':False,'undo_enabled':False})
    Atspi.Component.grab_focus(ui.wait_for(name));ui.keys('Tab');time.sleep(.4)
    assert direct_value(name)==typed
    assert modified(), 'Intentional Tab did not mark native state modified'
    if device:
        activate('Save session')
        committed=saved_document()
        assert committed['tracks'][0]['device']['parameters']['cutoff']==1717
        for index in range(1,len(baseline['tracks'])):
            assert committed['tracks'][index]==baseline['tracks'][index], 'Parameter commit changed another track'
    else:
        assert enabled('Undo pending edit'), 'Intentional note blur did not commit'
        activate('Undo pending edit');time.sleep(.3)
        assert direct_value(name)==original_value
        assert not enabled('Undo pending edit'), 'One deliberate note commit created multiple undo steps'
        activate('Discard edits');activate('Save session')
        assert saved_document()==baseline, 'Undo/discard changed original note scope'
    report['webkit_unfinished_'+kind]={'rounds':observations,'deliberate_tab_committed':True,'original_value':original_value,'intentional_value':typed,'native_verification':'native Modified state, saved document after commit and undo history; exact IPC count checked in browser regression'}

report={'scope':'Task 1 working Session and unavailable Arrangement; private software audio only','observations':[]}
try:
    windows.focus('Alive');ui.wait_for('Select Track 8 slot 4')
    capture('native-session-1440x900.png',1440,900)
    activate('Arrangement workspace');ui.wait_for('Arrangement playback and timeline editing are unavailable in this version.',True)
    capture('native-arrangement-unavailable-1440x900.png',1440,900)
    activate('Session workspace');capture('native-session-1280x800.png',1280,800)
    check_detail_field('device');check_detail_field('note')
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
