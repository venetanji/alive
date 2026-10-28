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


def save(name, apply=False):
    expanded('Audio details', False)
    if apply:
        ui.click('Prepare / Apply')
        alive.wait_value('Session status', lambda s: 'prepared and applied' in s)
    path = ui.output / name
    alive.choose_file('Save session as', 'Save Alive Session', path)
    result = json.loads(path.read_text())
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
    global restart, video, capture
    windows.focus('Alive')
    ui.wait_for('MIDI source')
    arrangement()
    capture_window(1440, 900, 'native-example-1440x900.png')
    initial_identity = process_identity(ui.pid)
    assert initial_identity['executable_path'] == os.environ['ULTRA_TEST_ALIVE_BINARY']
    record('loaded', process_identity=initial_identity)
    video_log = (ui.output/'interaction-video.log').open('w')
    video = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'x11grab', '-video_size', '1440x900', '-framerate', '12', '-i', os.environ['DISPLAY'], '-an', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '24', '-pix_fmt', 'yuv420p', str(ui.output/'arrangement-interaction.mp4')], stdout=video_log, stderr=subprocess.STDOUT, stdin=subprocess.PIPE)
    tick, header = rect('Seek to beat 8'), rect('Select Pulse Arrangement track')
    drag(tick.x, header.y+40, tick.x+96, header.y+40)
    ui.click('Create MIDI source')
    ui.text('MIDI source name', 'MIDI journey')
    ui.keys('Tab')
    ui.click('Add note')
    alive.numeric('Note 1 beat', .25)
    alive.numeric('Note 1 duration', 1)
    alive.numeric('Note 1 pitch', 67)
    alive.numeric('Note 1 velocity', 83)
    arrangement()
    before_ids = placement_ids()
    ui.click('Place source in range')
    first = (placement_ids()-before_ids).pop()
    control = rect('Select placement '+first)
    drag(control.x+30, control.y+12, control.x+78, control.y+12)
    control = rect('Select placement '+first)
    drag(control.x+control.width-3, control.y+25, control.x+control.width+45, control.y+25)
    control = rect('Select placement '+first)
    drag(control.x+3, control.y+25, control.x+27, control.y+25)
    assert alive.value('Placement start') == '9.5'
    assert alive.value('Placement duration') == '2.5'
    assert alive.value('Placement source offset') == '0.5'
    stop_recorder(video)
    assert video.returncode == 0
    video = None
    record('native create, note, place, move, right resize, fixed-end left trim', placement_id=first, video='arrangement-interaction.mp4', video_scope='UI interaction only; no audio or exact timing proof')
    alive.numeric('Placement source offset', .25)
    ui.click('Loop source suffix')
    alive.wait_value('Session status', lambda s: 'suffix' in s)
    alive.numeric('Placement duration', 1.5)
    ui.click('Loop source suffix')
    assert not ui.wait_for('Loop source suffix').get_state_set().contains(Atspi.StateType.CHECKED)
    ui.click('Loop source suffix')
    alive.numeric('Placement duration', 2.5)
    alive.numeric('Duplicate placement start', 12.5)
    before_ids = placement_ids()
    ui.click('Duplicate placement')
    duplicate = (placement_ids()-before_ids).pop()
    ui.click('Assign source to Session')
    ui.click('Make placement independent')
    alive.numeric('Note 1 velocity', 71)
    arrangement()
    ui.click('Delete placement')
    assert duplicate not in placement_ids()
    ui.click('Undo pending edit')
    assert duplicate in placement_ids()
    ui.click('Redo pending edit')
    assert duplicate not in placement_ids()
    ui.click('Undo pending edit')
    ui.click('Select placement '+duplicate)
    alive.numeric('Placement start', 1)
    alive.wait_value('Session status', lambda s: 'overlap' in s.lower())
    alive.numeric('Song loop start', 2)
    alive.numeric('Song loop end', 16)
    before_generation = alive.value('Native generation')
    before_rejected = int(alive.value('Rejected commands'))
    before_prepared = observed(1, 'active placement', lambda s: bool(s))
    arrangement()
    ui.click('Prepare / Apply')
    refusal = alive.wait_value('Session status', lambda s: 'observed 21, limit 18' in s)
    assert alive.value('Native generation') == before_generation
    assert int(alive.value('Rejected commands')) == before_rejected + 1
    report['expected_admission_rejections'] = before_rejected + 1
    assert observed(1, 'active placement', lambda s: bool(s)) == before_prepared
    arrangement()
    assert ui.wait_for('Undo pending edit').get_state_set().contains(Atspi.StateType.ENABLED)
    ui.click('Undo pending edit')
    assert alive.value('Song loop end') == '8'
    ui.click('Redo pending edit')
    assert alive.value('Song loop end') == '16'
    record('complete candidate refused without changing preparation or clearing pending history', refusal=refusal, native_generation=before_generation, prepared_placement=before_prepared)
    # A nonzero loop start adds a conservative prefix boundary. Explicitly trim
    # these occurrences into the brace; never change source music or policy.
    initial = json.loads((ui.output/'initial.alive').read_text())
    for original in initial['placements']:
        ui.click('Select placement '+original['id'])
        alive.numeric('Placement duration', 6)
        alive.numeric('Placement start', 2)
        alive.numeric('Placement source offset', 2)
    record('explicit original-occurrence trim to fit partial-brace admission', range=[2, 8], offset=2)
    path, authored = save('authored.alive', apply=True)
    p = next(p for p in authored['placements'] if p['id'] == first)
    q = next(p for p in authored['placements'] if p['id'] == duplicate)
    assert (p['start'], p['duration'], p['sourceOffset']['value'], p['loopEnabled']) == (9.5, 2.5, .25, True)
    assert q['start'] == 12.5 and q['sourceId'] != p['sourceId']
    assert authored['tracks'][0]['slots'][1]['sourceId'] == p['sourceId']
    assert next(s for s in authored['sources'] if s['id'] == p['sourceId'])['notes'][0]['velocity'] == 83
    assert next(s for s in authored['sources'] if s['id'] == q['sourceId'])['notes'][0]['velocity'] == 71
    record('occurrence edits, refusal, independent copy, Session reuse, delete/undo/redo, stopped Apply', first=p, independent=q)
    capture = alive.start_capture('midi-arrangement-playback')
    alive.transport('start')
    report['playing_started'] = time.monotonic()
    seek(9.6)
    assert observed(1, 'active placement', lambda s: s == first) == first
    assert observed(1, 'active source', lambda s: s == p['sourceId']) == p['sourceId']
    record('newly authored MIDI is native-active inside extended brace', placement=first, source=p['sourceId'], absolute_frame=alive.value('Absolute frame'))
    session()
    ui.click('Launch Pulse Clip 1')
    observed(1, 'authority', lambda s: s == 'session')
    for _ in range(3):
        arrangement()
        session()
    assert observed(1, 'authority', lambda s: s == 'session') == 'session'
    session()
    ui.click('Stop Pulse track')
    observed(1, 'active source', lambda s: s == '-')
    assert observed(1, 'authority', lambda s: s == 'session') == 'session'
    session()
    ui.click('Launch Harmony Clip 1')
    observed(2, 'authority', lambda s: s == 'session')
    seek(4.1)
    arrangement()
    alive.reorder_click('Return Pulse')
    pending = alive.wait_value('Pulse Arrangement authority', lambda s: 'pending return' in s)
    session()
    arrangement()
    record('view navigation during pending Return', observed=pending)
    observed(1, 'authority', lambda s: s == 'arrangement')
    gap_source = observed(1, 'active source', lambda s: s == '-', seconds=3)
    assert observed(2, 'authority', lambda s: s == 'session') == 'session'
    record('Return into Arrangement gap while Harmony retains Session', pulse_source=gap_source, absolute_frame=alive.value('Absolute frame'))
    seek(15.5)
    time.sleep(.8)
    assert float(alive.value('Transport position').split()[0]) < 5
    assert observed(2, 'authority', lambda s: s == 'session') == 'session'
    arrangement()
    alive.reorder_click('Return all tracks to Arrangement')
    observed(2, 'authority', lambda s: s == 'arrangement')
    record('partial brace wrap, seek retains Session, global Return observed')
    arrangement()
    ui.click('Select Pulse Arrangement track')
    alive.numeric('Pulse Arrangement gain', .713)
    record('shared live track gain from Arrangement', gain=.713)
    session()
    assert float(alive.value('Pulse gain')) == .713
    ui.click('Select Pulse slot 1')
    alive.numeric('Pulse gain', .713)
    alive.numeric('Cutoff point 1 value', 1781)
    for _ in range(2):
        arrangement()
        session()
    ui.click('Select Pulse Subtractive instrument')
    ui.click('Edit selected device in Ultra')
    windows.focus('Pulse - Ultra Hosted Editor')
    alive.numeric('Hosted Cutoff base', 1777)
    ui.click('Close hosted editor')
    windows.focus('Alive')
    arrangement()
    ui.click('Edit selected device in Ultra')
    windows.focus('Pulse - Ultra Hosted Editor')
    assert float(alive.value('Hosted Cutoff base')) == 1777
    ui.click('Close hosted editor')
    windows.focus('Alive')
    frame = int(alive.value('Absolute frame'))
    time.sleep(.4)
    assert int(alive.value('Absolute frame')) > frame
    alive.transport('stop')
    report['playing_stopped'] = time.monotonic()
    report['audio'] = alive.finish_capture(capture)
    capture = None
    assert report['audio']['peak'] > .0001
    expanded('Stream measurements')
    report['stream_diagnostics'] = json.loads(alive.wait_value('Stream diagnostics', lambda s: s.startswith('{')))
    report['native_audio'] = alive.detail()
    assert int(report['native_audio']['Rejected commands']) == report['expected_admission_rejections']
    path, saved = save('arrangement-roundtrip.alive', apply=True)
    assert saved['tracks'][0]['gain'] == .713
    assert saved['tracks'][0]['chain']['instrument']['parameters']['cutoff'] == 1777
    assert saved['loopStartBeats'] == 2 and saved['loopEndBeats'] == 16
    arrangement()
    ui.click('Select placement '+first)
    ui.click('Clip detail')
    capture_window(1440, 900, 'native-arrangement-1440x900.png')
    capture_window(1280, 800, 'native-arrangement-1280x800.png')
    session()
    capture_window(1280, 800, 'native-session-1280x800.png')
    capture_window(1440, 900, 'native-session-1440x900.png')
    ui.click('Quit Alive')
    exited(ui.pid)
    record('Save and Quit exited')
    env = os.environ.copy()
    env.pop('LD_LIBRARY_PATH', None)
    log = (ui.output/'restarted-app.log').open('w')
    restart = subprocess.Popen([os.environ['ULTRA_TEST_ALIVE_BINARY'], str(path)], env=env, stdout=log, stderr=subprocess.STDOUT)
    ui.pid = restart.pid
    windows.scope = 'Alive'
    windows.focus('Alive')
    ui.wait_for('MIDI source')
    restarted_identity = process_identity(ui.pid)
    record('restart identity', process_identity=restarted_identity)
    assert_same_identity(initial_identity, restarted_identity)
    assert alive.value('Transport playing') == 'false'
    assert alive.value('Transport position') == '0.000 beats'
    assert observed(1, 'authority', lambda s: s == 'arrangement') == 'arrangement'
    _, reopened = save('reopened.alive')
    assert reopened == saved
    capture = alive.start_capture('reopened-playback')
    alive.transport('start')
    seek(9.6)
    observed(1, 'active placement', lambda s: s == first)
    time.sleep(.4)
    alive.transport('stop')
    report['reopened_audio'] = alive.finish_capture(capture)
    capture = None
    assert report['reopened_audio']['peak'] > .0001
    report['final_audio'] = alive.detail()
    assert report['final_audio']['Audio stream errors'] == '0'
    ui.click('Quit Alive')
    restart.wait(timeout=8)
    assert restart.returncode == 0
    record('process restart exact document roundtrip and authored MIDI replay', complete=True)
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
