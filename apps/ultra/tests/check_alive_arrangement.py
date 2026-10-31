#!/usr/bin/env python3
"""Actual admitted MIDI Arrangement journey on a private native desktop.

Run with ULTRA_TEST_ALIVE=1, ULTRA_TEST_ALIVE_SESSION pointing to the shipped
midi-arrangement.alive, and this file as ULTRA_TEST_SCRIPT. A 1600x1000 private
X display permits both target window captures. Never inject native commands.
"""
import ctypes as C
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from desktop_process_helpers import process_identity, assert_same_identity, stop_recorder, cleanup_independently

import check_alive_desktop as alive
import check_alive_session_ui as presentation
from gi.repository import Atspi

ui, windows = alive.ui, alive.windows
report = {'physical_audio': False, 'actions': [], 'kind': 'Actual Tauri/WebKit with private software PipeWire'}
restart = video = capture = None


def record(action, **data):
    report['actions'].append({'action': action, 'monotonic': time.monotonic(), **data})
    (ui.output / 'arrangement-report.json').write_text(json.dumps(report, indent=2))


def expanded(name, wanted=True):
    control = ui.wait_for(name)
    if control.get_state_set().contains(Atspi.StateType.EXPANDED) != wanted:
        alive.native_control_click(name, 'disclosure')
    time.sleep(.12)


def arrangement():
    expanded('Audio details', False)
    ui.click('Arrangement workspace')


def session():
    expanded('Audio details', False)
    ui.click('Session workspace')


def rect(name):
    return Atspi.Component.get_extents(ui.wait_for(name), Atspi.CoordType.SCREEN)


def drag(sx, sy, ex, ey):
    assert ui.t.XTestFakeMotionEvent(ui.display, 0, round(sx), round(sy), 0)
    assert ui.t.XTestFakeButtonEvent(ui.display, 1, 1, 0)
    ui.x.XFlush(ui.display)
    time.sleep(.1)
    for step in range(1, 9):
        assert ui.t.XTestFakeMotionEvent(ui.display, 0, round(sx+(ex-sx)*step/8), round(sy+(ey-sy)*step/8), 0)
        ui.x.XFlush(ui.display)
        time.sleep(.04)
    assert ui.t.XTestFakeButtonEvent(ui.display, 1, 0, 0)
    ui.x.XFlush(ui.display)
    time.sleep(.2)


def capture_window(width, height, name):
    xid = presentation.main_window()
    ui.x.XMoveWindow(ui.display, xid, 0, 0)
    ui.x.XResizeWindow(ui.display, xid, width, height)
    ui.x.XFlush(ui.display)
    time.sleep(.4)
    root = ui.Gdk.get_default_root_window()
    assert root.get_width() >= width and root.get_height() >= height
    ui.Gdk.pixbuf_get_from_window(root, 0, 0, width, height).savev(str(ui.output / name), 'png', [], [])


def save(name):
    expanded('Audio details', False)
    alive.settled()
    path = ui.output / name
    alive.choose_file('Save session as', 'Save Alive Session', path)
    result = alive.file_score(json.loads(path.read_text()))
    record('saved', path=str(path))
    return path, result


def placement_ids():
    return {node.get_name().removeprefix('Select placement ') for root in ui.desktop_apps()
            if root.get_process_id() == ui.pid for node in ui.walk(root)
            if node.get_name().startswith('Select placement ')}


def observed(track, field, predicate, seconds=8):
    expanded('Audio details')
    return alive.wait_value(f'Track {track} {field}', predicate, seconds)


def seek(beat):
    expanded('Audio details', False)
    alive.numeric('Seek beat', beat)
    ui.click('Seek transport')


def exited(pid):
    deadline = time.monotonic()+8
    while time.monotonic() < deadline:
        try:
            if Path(f'/proc/{pid}/stat').read_text().split(') ', 1)[1].split()[0] == 'Z':
                return
        except FileNotFoundError:
            return
        time.sleep(.1)
    raise AssertionError('Quit did not exit')


def run():
    global restart, capture
    windows.focus('Alive')
    alive.prepare_workspace_control('MIDI source'); ui.wait_for('MIDI source'); ui.click('Source / Clip')
    assert alive.value('Transport position beats') == '0.000 beats'
    initial = alive.file_score(json.loads((ui.output / 'initial.alive').read_text()))
    initial_identity = process_identity(ui.pid)
    assert initial_identity['executable_path'] == os.environ['ULTRA_TEST_ALIVE_BINARY']
    record('loaded', process_identity=initial_identity)
    arrangement()
    capture_window(1440, 900, 'native-example-1440x900.png')
    tick, header = rect('Seek to beat 8'), rect('Select Pulse Arrangement track')
    drag(tick.x, header.y + 40, tick.x + 96, header.y + 40)
    ui.click('Create MIDI source')
    ui.text('MIDI source name', 'MIDI journey'); ui.keys('Tab')
    alive.numeric('MIDI source length', 8)
    ui.click('Add note')
    alive.numeric('Note 1 beat', .25)
    alive.numeric('Note 1 duration', 1)
    alive.numeric('Note 1 pitch', 67)
    alive.numeric('Note 1 velocity', 83)
    arrangement()
    before_ids = placement_ids()
    ui.click('Place source in range')
    first = (placement_ids() - before_ids).pop()
    arrangement()
    ui.click('Select placement ' + first)
    alive.numeric('Placement start', 9.5)
    alive.numeric('Placement duration', 2.5)
    alive.numeric('Placement source Start', .25)
    alive.numeric('Loop Length', 2)
    alive.numeric('Loop Position', .5)
    arrangement()
    alive.numeric('Duplicate placement start', 12.5)
    before_ids = placement_ids()
    ui.click('Duplicate placement')
    duplicate = (placement_ids() - before_ids).pop()
    ui.click('Select placement ' + first)
    ui.click('Assign source to Session')
    arrangement()
    ui.click('Select placement ' + duplicate)
    ui.click('Make placement independent')
    alive.numeric('Note 1 velocity', 71)
    arrangement()
    ui.click('Delete placement')
    assert duplicate not in placement_ids()
    ui.click('Undo'); assert duplicate in placement_ids()
    ui.click('Redo'); assert duplicate not in placement_ids()
    ui.click('Undo')
    alive.numeric('Song loop start', 2)
    alive.numeric('Song loop end', 16)
    path, authored = save('authored.alive')
    p = next(item for item in authored['placements'] if item['id'] == first)
    q = next(item for item in authored['placements'] if item['id'] == duplicate)
    assert (p['start'], p['duration']) == (9.5, 2.5)
    assert p['region'] == {'start': .25, 'end': 8, 'loopStart': .5, 'loopEnd': 2.5, 'loopEnabled': True}
    assert q['start'] == 12.5 and q['sourceId'] != p['sourceId']
    assert authored['tracks'][0]['slots'][1]['sourceId'] == p['sourceId']
    assert next(s for s in authored['sources'] if s['id'] == p['sourceId'])['notes'][0]['velocity'] == 83
    assert next(s for s in authored['sources'] if s['id'] == q['sourceId'])['notes'][0]['velocity'] == 71
    for original in initial['placements']:
        assert next(item for item in authored['placements'] if item['id'] == original['id']) == original
    for source in initial['sources']:
        assert next(item for item in authored['sources'] if item['id'] == source['id'])['notes'] == source['notes']
    record('immediate occurrence regions, independent copy, Session source reuse and history', first=p, independent=q)
    capture = alive.start_capture('midi-arrangement-playback')
    alive.transport('start')
    report['playing_started'] = time.monotonic()
    seek(9.6)
    observed(1, 'active placement', lambda s: s == first)
    observed(1, 'active source', lambda s: s == p['sourceId'])
    record('authored MIDI native-active inside the extended brace', placement=first, source=p['sourceId'])
    session()
    ui.click('Launch Pulse Clip 1')
    observed(1, 'authority', lambda s: s == 'session')
    for _ in range(3):
        arrangement(); session()
    assert observed(1, 'authority', lambda s: s == 'session') == 'session'
    session(); ui.click('Stop Pulse track')
    observed(1, 'active source', lambda s: s == '-')
    assert observed(1, 'authority', lambda s: s == 'session') == 'session'
    session(); ui.click('Launch Harmony Clip 1')
    observed(2, 'authority', lambda s: s == 'session')
    seek(4.1)
    arrangement(); alive.reorder_click('Return Pulse')
    pending = alive.wait_value('Pulse Arrangement authority', lambda s: 'pending return' in s)
    session(); arrangement()
    observed(1, 'authority', lambda s: s == 'arrangement')
    observed(1, 'active source', lambda s: s == '-', seconds=3)
    assert observed(2, 'authority', lambda s: s == 'session') == 'session'
    record('Return into Arrangement gap preserves sibling Session authority', receipt=pending)
    seek(15.5); time.sleep(.8)
    assert float(alive.value('Transport position beats').split()[0]) < 5
    arrangement(); alive.reorder_click('Return all tracks to Arrangement')
    observed(2, 'authority', lambda s: s == 'arrangement')
    arrangement(); ui.click('Select Pulse Arrangement track')
    alive.numeric('Pulse Arrangement gain', .713)
    session(); assert float(alive.value('Pulse gain')) == .713
    ui.click('Select Pulse slot 1')
    alive.numeric('Cutoff point 1 value', 1781)
    ui.click('Select Pulse Subtractive instrument')
    ui.click('Edit selected device in Ultra')
    windows.focus('Pulse - Ultra Hosted Editor')
    alive.numeric('Hosted Cutoff base', 1777)
    ui.click('Close hosted editor'); windows.focus('Alive')
    arrangement(); ui.click('Edit selected device in Ultra')
    windows.focus('Pulse - Ultra Hosted Editor')
    assert float(alive.value('Hosted Cutoff base')) == 1777
    ui.click('Close hosted editor'); windows.focus('Alive')
    frame = int(alive.value('Absolute frame')); time.sleep(.4)
    assert int(alive.value('Absolute frame')) > frame
    alive.transport('stop')
    report['playing_stopped'] = time.monotonic()
    report['audio'] = alive.finish_capture(capture); capture = None
    assert report['audio']['peak'] > .0001
    expanded('Stream measurements')
    report['stream_diagnostics'] = json.loads(alive.wait_value('Stream diagnostics', lambda s: s.startswith('{')))
    report['native_audio'] = alive.detail()
    assert report['native_audio']['Rejected commands'] == '0'
    path, saved = save('arrangement-roundtrip.alive')
    assert saved['tracks'][0]['gain'] == .713
    assert saved['tracks'][0]['chain']['instrument']['parameters']['cutoff'] == 1777
    assert saved['loopStartBeats'] == 2 and saved['loopEndBeats'] == 16
    arrangement(); ui.click('Select placement ' + first); ui.click('Clip detail')
    capture_window(1440, 900, 'native-arrangement-1440x900.png')
    capture_window(1280, 800, 'native-arrangement-1280x800.png')
    session(); capture_window(1280, 800, 'native-session-1280x800.png')
    ui.click('Quit Alive'); exited(ui.pid)
    env = os.environ.copy(); env.pop('LD_LIBRARY_PATH', None)
    restart_log = (ui.output / 'restarted-app.log').open('w')
    restart = subprocess.Popen([os.environ['ULTRA_TEST_ALIVE_BINARY'], str(path)], env=env, stdout=restart_log, stderr=subprocess.STDOUT)
    restart_log.close()
    ui.pid = restart.pid; windows.scope = 'Alive'; windows.focus('Alive')
    alive.prepare_workspace_control('MIDI source'); ui.wait_for('MIDI source'); ui.click('Source / Clip')
    reopened_identity = process_identity(ui.pid)
    assert_same_identity(initial_identity, reopened_identity)
    assert alive.value('Transport playing') == 'false'
    assert alive.value('Transport position beats') == '0.000 beats'
    observed(1, 'authority', lambda s: s == 'arrangement')
    _, reopened = save('reopened.alive'); assert reopened == saved
    capture = alive.start_capture('reopened-playback')
    alive.transport('start'); seek(9.6)
    observed(1, 'active placement', lambda s: s == first)
    time.sleep(.4); alive.transport('stop')
    report['reopened_audio'] = alive.finish_capture(capture); capture = None
    assert report['reopened_audio']['peak'] > .0001
    report['final_audio'] = alive.detail()
    assert report['final_audio']['Audio stream errors'] == '0'
    ui.click('Quit Alive'); restart.wait(timeout=8); assert restart.returncode == 0
    record('same-artifact process restart, exact document and authored MIDI replay', identity=reopened_identity, complete=True)
    print('PASS complete native MIDI Arrangement journey', flush=True)


if __name__ == '__main__':
    try:
        run()
    except Exception as error:
        cleanup_independently([lambda: record('failure', error=repr(error)),
                               lambda: alive.screenshot('arrangement-failure.png')])
        raise
    finally:
        had_failure = sys.exc_info()[0] is not None
        def finish_audio():
            report['interrupted_audio'] = alive.finish_capture(capture)
            record('capture finalized after interrupted journey')
        def finish_restart():
            restart.terminate()
            try:
                restart.wait(timeout=5)
            except subprocess.TimeoutExpired:
                restart.kill()
                restart.wait()
        actions = []
        if video is not None: actions.append(lambda: stop_recorder(video))
        if capture is not None: actions.append(finish_audio)
        if restart is not None and restart.poll() is None: actions.append(finish_restart)
        errors = cleanup_independently(actions)
        if errors:
            print('Arrangement cleanup errors:', errors, file=sys.stderr, flush=True)
            if not had_failure: raise RuntimeError(f'Arrangement cleanup errors: {errors}')
