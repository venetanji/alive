#!/usr/bin/env python3
"""Real native Preview/live-note/Undo/Save journey with quantized-midi.alive.

Run through check_canvas_desktop.sh with ULTRA_TEST_ALIVE=1 and this script as
ULTRA_TEST_SCRIPT. Uses AT-SPI/XTest and private PipeWire capture, no synthetic IPC.
"""
import json, time
import check_alive_desktop as alive
from gi.repository import Atspi
ui=alive.ui

def run():
    alive.windows.focus('Alive')
    ui.wait_for('Launch Quantization')
    ui.click('Session workspace');ui.click('Select Pulse slot 1');ui.click('Clip detail')
    toggle=ui.wait_for('MIDI note Preview')
    assert toggle.get_state_set().contains(Atspi.StateType.ENABLED)
    assert not toggle.get_state_set().contains(Atspi.StateType.PRESSED)
    ui.click('Alive audio settings');ui.click('Save and start Alive audio');ui.click('Close audio settings')
    alive.wait_value('Audio callbacks',lambda s:s.isdecimal() and int(s)>0)
    ui.click('Audio details');ui.click('Clip detail');ui.click('MIDI note Preview')
    capture=alive.start_capture('preview')
    px,py=ui.control_point('Selected clip piano roll',.01,.5)
    ui.t.XTestFakeMotionEvent(ui.display,0,px,py,0);ui.t.XTestFakeButtonEvent(ui.display,1,1,0);ui.x.XFlush(ui.display)
    time.sleep(.3)
    ui.t.XTestFakeButtonEvent(ui.display,1,0,0);ui.x.XFlush(ui.display)
    time.sleep(.1)
    capture_report=alive.finish_capture(capture);assert capture_report['peak']>1e-6
    assert 'Preview reached' not in alive.value('Session status')
    alive.screenshot('preview.png')
    alive.transport('start')
    ui.click('Audio details')
    launch=next(n.get_name() for f in alive.windows.app_frames() for n in ui.walk(f) if n.get_name().startswith('Launch Pulse ') and n.get_state_set().contains(Atspi.StateType.SHOWING))
    ui.click(launch);time.sleep(.8)
    before=alive.value('Note 1 pitch');changed=int(before)+1
    alive.numeric('Note 1 pitch',changed)
    alive.wait_value('Note 1 pitch',lambda s:s==str(changed))
    alive.wait_value('Musical edit status', lambda s: 'Updating' not in s)
    alive.wait_value('Transport playing',lambda s:s=='true');ui.click('Audio details')
    ui.click('Undo');alive.wait_value('Note 1 pitch',lambda s:s==before)
    ui.click('Redo');alive.wait_value('Note 1 pitch',lambda s:s==str(changed))
    alive.numeric('Note 1 velocity',83)
    alive.wait_value('Note 1 velocity',lambda s:s=='83')
    alive.wait_value('Musical edit status', lambda s: 'Updating' not in s)
    alive.wait_value('Track 1 active voices',lambda s:s.isdecimal() and int(s)>0)
    alive.screenshot('live-edit.png')
    alive.transport('stop');alive.wait_value('Audio stream errors',lambda s:s=='0')
    saved=ui.output/'live-edit-saved.alive';alive.choose_file('Save session as','Save Alive Session',saved)
    document=json.loads(saved.read_text());assert document['format']=='alive-session-v6';notes=document['score']['sources'][0]['notes'];assert notes[0]['pitch']==changed and notes[0]['velocity']==83
    alive.choose_file('Open session','Open Alive Session',saved)
    ui.click('Session workspace');ui.click('Select Pulse slot 1')
    alive.wait_value('Note 1 pitch',lambda s:s==str(changed))
    (ui.output/'midi-report.json').write_text(json.dumps({'standard_fixture':True,'preview_control':True,'preview_pcm':capture_report,'playing_edit':True,'undo_redo':True,'save_reopen':True,'stream_errors':0,'stopped':True},indent=2)+'\n')

ui.find=alive.windows.scoped_find
try:run()
except Exception:
    alive.screenshot('midi-failure.png')
    (ui.output/'midi-failure.json').write_text(json.dumps([{'name':n.get_name(),'role':n.get_role_name()} for f in alive.windows.app_frames() for n in ui.walk(f)],indent=2))
    raise
