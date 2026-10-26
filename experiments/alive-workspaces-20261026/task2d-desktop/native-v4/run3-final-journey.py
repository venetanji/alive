"""Temporary actual-app v4 integration journey; no native command injection."""
import ctypes as C
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
import time
sys.path.insert(0, str(Path('apps/ultra/tests').resolve()))
import check_alive_desktop as alive
import check_alive_session_ui as presentation
from gi.repository import Atspi
ui, windows = alive.ui, alive.windows
report={'physical_audio':False,'kind':'actual Tauri/WebKit, private Xvfb and software PipeWire/CPAL','hardware':platform.uname()._asdict(),'actions':[]}
restart=None

def record(action,**data):
    report['actions'].append({'action':action,'monotonic':time.monotonic(),**data})
    (ui.output/'v4-native-report.json').write_text(json.dumps(report,indent=2))

def expanded(name,wanted=True):
    item=ui.wait_for(name)
    if item.get_state_set().contains(Atspi.StateType.EXPANDED)!=wanted:
        Atspi.Component.grab_focus(item);ui.keys('Return')
    deadline=time.monotonic()+3
    while time.monotonic()<deadline:
        if ui.wait_for(name).get_state_set().contains(Atspi.StateType.EXPANDED)==wanted:return
        time.sleep(.05)
    raise AssertionError('Disclosure did not settle: '+name)

def state(track,expected):
    expanded(track+' runtime details')
    result=alive.wait_value(track+' clip runtime',expected)
    record('track state',track=track,value=result)
    return result

def save(name):
    path=ui.output/name
    alive.choose_file('Save session as','Save Alive Session',path)
    result=json.loads(path.read_text());record('save',path=str(path),format=result['format'])
    return path,result

def stopped():
    alive.transport('stop')
    for i in (1,2):assert alive.wait_value(f'Track {i} active voices',lambda s:s=='0')=='0'

def exited(pid):
    deadline=time.monotonic()+8
    while time.monotonic()<deadline:
        try:
            if Path(f'/proc/{pid}/stat').read_text().split(') ',1)[1].split()[0]=='Z':return
        except FileNotFoundError:return
        time.sleep(.1)
    raise AssertionError('Quit failed to exit')

def run():
    global restart
    windows.focus(alive.MAIN);record('loaded artifacts',executable=str(Path(f'/proc/{ui.pid}/exe').resolve()),native_mappings=[line for line in Path(f'/proc/{ui.pid}/maps').read_text().splitlines() if 'libultra_native' in line]);ui.wait_for('Select Pulse slot 1');ui.click('Select Pulse slot 1');ui.click('Clip detail')
    report['legacy_audio_settings']=alive.check_audio_settings();alive.transport('start');time.sleep(.6);stopped();record('legacy playback before conversion')
    ui.click('Clip detail')
    old_path,old=save('before-conversion.alive');assert old['format']=='alive-session-v3'
    ui.click('Enable MIDI workspaces');ui.wait_for('Return Pulse to Arrangement')
    path,converted=save('converted.alive');assert converted['format']=='alive-session-v4'
    assert len(converted['tracks'])==2 and len(converted['placements'])==2
    assert len(converted['sources'])==2
    record('explicit conversion',sources=len(converted['sources']),placements=len(converted['placements']))
    ui.click('Select Pulse slot 1');before=alive.value('Note 1 velocity')
    alive.numeric('Note 1 velocity',79);assert alive.value('Note 1 velocity')=='79'
    ui.click('Undo pending edit');assert alive.value('Note 1 velocity')==before
    ui.click('Redo pending edit');assert alive.value('Note 1 velocity')=='79'
    point=alive.value('Cutoff point 1 value');alive.numeric('Cutoff point 1 value',1781)
    assert alive.value('Cutoff point 1 value')=='1781';ui.click('Prepare / Apply')
    record('pending notes and automation applied',original_velocity=before,original_cutoff_point=point)
    alive.numeric('Pulse gain',.713)
    report['audio_settings']=alive.check_audio_settings()
    capture=alive.start_capture('workspace-playback')
    alive.transport('start');state('Pulse',lambda s:s.startswith('Arrangement: Playing'))
    state('Harmony',lambda s:s.startswith('Arrangement: Playing'))
    ui.click('Launch Pulse Clip 1');state('Pulse',lambda s:s.startswith('Session: Playing') and 'applied' in s)
    state('Harmony',lambda s:s.startswith('Arrangement: Playing'))
    alive.reorder_click('Return Pulse to Arrangement');state('Pulse',lambda s:s.startswith('Arrangement: Playing') and 'applied' in s)
    ui.click('Stop Pulse track');state('Pulse',lambda s:s.startswith('Session: Session silence') and 'applied' in s)
    assert alive.value('Transport playing')=='true';state('Harmony',lambda s:s.startswith('Arrangement: Playing'))
    alive.reorder_click('Return Pulse to Arrangement');state('Pulse',lambda s:s.startswith('Arrangement: Playing') and 'applied' in s)
    ui.click('Select Pulse slot 1');ui.click('Select Pulse Subtractive instrument');ui.click('Edit selected device in Ultra')
    windows.focus('Pulse - Ultra Hosted Editor');alive.numeric('Hosted Cutoff base',1777)
    assert float(alive.value('Hosted Cutoff base'))==1777
    ownership=alive.wait_value('Hosted Cutoff effective ownership',lambda s:'Automation' in s);record('hosted edit',ownership=ownership)
    ui.click('Close hosted editor');windows.focus(alive.MAIN)
    frame=int(alive.value('Absolute frame'));time.sleep(.6);assert int(alive.value('Absolute frame'))>frame
    ui.click('Edit selected device in Ultra');windows.focus('Pulse - Ultra Hosted Editor');assert float(alive.value('Hosted Cutoff base'))==1777
    ui.click('Close hosted editor');windows.focus(alive.MAIN)
    assert alive.value('Transport playing')=='true'
    stopped();report['audio']=alive.finish_capture(capture);assert report['audio']['peak']>.0001
    expanded('Stream measurements');report['stream_diagnostics']=json.loads(alive.value('Stream diagnostics'));path,saved=save('workspace-roundtrip.alive')
    assert saved['tracks'][0]['gain']==.713
    expanded('Audio details',False)
    presentation.capture(1440,900);presentation.capture(1280,800)
    ui.click('Quit Alive');exited(ui.pid);record('Quit exited')
    env=os.environ.copy();env.pop('LD_LIBRARY_PATH',None)
    logfile=(ui.output/'restarted-app.log').open('w')
    restart=subprocess.Popen([os.environ['ULTRA_TEST_ALIVE_BINARY'],str(path)],env=env,stdout=logfile,stderr=subprocess.STDOUT)
    ui.pid=restart.pid;windows.scope=alive.MAIN
    windows.focus(alive.MAIN);ui.wait_for('Return Pulse to Arrangement')
    assert alive.value('Transport playing')=='false'
    second,reopened=save('reopened.alive');assert reopened==saved
    ui.click('Select Pulse slot 1');assert alive.value('Note 1 velocity')=='79';assert alive.value('Cutoff point 1 value')=='1781'
    alive.transport('start');state('Pulse',lambda s:s.startswith('Arrangement: Playing'))
    frame=int(alive.value('Absolute frame'));time.sleep(1);assert int(alive.value('Absolute frame'))>frame
    stopped();report['final_audio']=alive.detail();assert report['final_audio']['Audio stream errors']=='0'
    ui.click('Quit Alive');restart.wait(timeout=8);assert restart.returncode==0
    record('process restart roundtrip and playback',complete=True)
try:
    run()
except Exception as error:
    record('failure',error=repr(error),status=alive.value('Session status'));alive.screenshot('workspace-failure.png');raise
finally:
    if restart is not None and restart.poll() is None:
        restart.terminate()
        try:restart.wait(timeout=5)
        except subprocess.TimeoutExpired:restart.kill();restart.wait()
