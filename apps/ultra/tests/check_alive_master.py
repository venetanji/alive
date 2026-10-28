#!/usr/bin/env python3
"""Native cross-view Master, musical history and process-restart journey."""
import json
import os
from pathlib import Path
import subprocess
import sys
import time

import check_alive_desktop as alive
import check_alive_arrangement as arrangement
from desktop_process_helpers import process_identity, assert_same_identity, cleanup_independently
from gi.repository import Atspi

ui, windows = alive.ui, alive.windows
report = {'kind': 'native Tauri on private software PipeWire', 'physical_audio': False, 'actions': []}
restart = capture = restart_log = None


def record(action, **fields):
    report['actions'].append({'action': action, 'monotonic': time.monotonic(), **fields})
    (ui.output / 'master-report.json').write_text(json.dumps(report, indent=2))


def capture_view(view, width, height):
    arrangement.capture_window(width, height, f'master-{view}-{width}x{height}.png')
    for name in ('Master gain fader', 'Master gain', 'Stop transport'):
        rect = Atspi.Component.get_extents(ui.wait_for(name), Atspi.CoordType.SCREEN)
        assert (rect.width > 0 and rect.height > 0 and rect.x >= 0 and rect.y >= 0 and
                rect.x + rect.width <= width and rect.y + rect.height <= height), (name, rect)
    if view == 'session':
        for track in ('Pulse', 'Harmony'):
            for slot in range(1, 5):
                name = f'Select {track} slot {slot}'
                rect = Atspi.Component.get_extents(ui.wait_for(name), Atspi.CoordType.SCREEN)
                assert (rect.width > 0 and rect.height > 0 and rect.x >= 0 and rect.y >= 0 and
                        rect.x + rect.width <= width and rect.y + rect.height <= height), (name, rect)
        for scene in range(1, 5):
            name = f'Launch scene {scene}'
            rect = Atspi.Component.get_extents(ui.wait_for(name), Atspi.CoordType.SCREEN)
            assert (rect.width > 0 and rect.height > 0 and rect.x >= 0 and rect.y >= 0 and
                    rect.x + rect.width <= width and rect.y + rect.height <= height), (name, rect)
    record('viewport', view=view, width=width, height=height)


def run():
    global restart, capture, restart_log
    windows.focus(alive.MAIN)
    ui.wait_for('Start transport')
    initial = process_identity(ui.pid)
    assert initial['executable_path'] == os.environ['ULTRA_TEST_ALIVE_BINARY']
    record('initial artifact identity', identity=initial)
    alive.check_audio_settings()
    alive.choose_file('Replace Pulse device', 'Load Ultra Device', alive.DEVICE)
    alive.choose_file('Replace Harmony device', 'Load Ultra Device', alive.DEVICE)
    arrangement.expanded('Audio details', False)
    alive.select_clip('Harmony')
    alive.prepare_workspace_control('Select Harmony Subtractive instrument')
    ui.click('Select Harmony Subtractive instrument')
    sibling_cutoff = float(alive.value('Cutoff base'))
    alive.select_clip('Pulse')
    alive.prepare_workspace_control('Select Pulse Subtractive instrument')
    ui.click('Select Pulse Subtractive instrument')
    alive.select_clip('Pulse')
    alive.numeric('Note 1 duration', .75)
    alive.numeric('Note 1 velocity', 83)
    for label, initial_value, second in [('Cutoff', 900, 3400), ('Level', 62, 78)]:
        ui.click(f'{label} automation enabled')
        ui.click(f'Add {label} point')
        alive.numeric(f'{label} point 1 value', initial_value)
        ui.click(f'Add {label} point')
        alive.numeric(f'{label} point 2 beat', 4)
        alive.numeric(f'{label} point 2 value', second)
    ui.click('Prepare / Apply')
    time.sleep(.5)
    arrangement.expanded('Audio details')
    capture = alive.start_capture('master-before-restart')
    alive.transport('start')
    alive.numeric('Master gain', .5)
    alive.wait_value('Master output status', lambda s: 'Saved target -6.0 dB' in s and 'applied -6.0 dB' in s)
    alive.numeric('Pulse gain', .55)
    ui.click('Harmony mute'); ui.click('Harmony mute')
    ui.click('Pulse solo'); ui.click('Pulse solo')
    alive.editor_edit(1333)
    alive.editor_edit(1333)
    assert float(alive.value('Cutoff base')) == 1333
    arrangement.expanded('Audio details', False)
    alive.numeric('Note 1 pitch', 61)
    ui.click('Undo pending edit')
    assert alive.value('Note 1 pitch') == '60'
    assert float(alive.value('Master gain')) == .5
    ui.click('Redo pending edit')
    assert alive.value('Note 1 pitch') == '61'
    assert float(alive.value('Master gain')) == .5
    for width, height in ((1440, 900), (1280, 800)):
        capture_view('session', width, height)
    arrangement.arrangement()
    for width, height in ((1440, 900), (1280, 800)):
        capture_view('arrangement', width, height)
    assert float(alive.value('Master gain')) == .5
    arrangement.session()
    alive.transport('stop')
    ui.click('Prepare / Apply')
    alive.wait_value('Session status', lambda s: 'prepared and applied' in s)
    report['first_audio'] = alive.finish_capture(capture)
    capture = None
    assert report['first_audio']['peak'] > .0001
    path = ui.output / 'master-roundtrip.alive'
    alive.choose_file('Save session as', 'Save Alive Session', path)
    saved = json.loads(path.read_text())
    assert saved['format'] == 'alive-session-v5' and saved['master']['gain'] == .5
    score = alive.file_score(saved)
    assert score['format'] == 'alive-session-v4'
    pulse = score['tracks'][0]['chain']['instrument']
    harmony = score['tracks'][1]['chain']['instrument']
    assert pulse['parameters']['cutoff'] == 1333
    assert harmony['parameters']['cutoff'] == sibling_cutoff
    assert score['tracks'][0]['gain'] == .55
    source_id = score['tracks'][0]['slots'][0]['sourceId']
    source = next(item for item in score['sources'] if item['id'] == source_id)
    assert source['notes'][0]['pitch'] == 61
    assert pulse['instanceId'] != harmony['instanceId']
    ui.click('Quit Alive')
    arrangement.exited(ui.pid)
    record('saved v5 and actual quit', identity=initial)
    env = os.environ.copy(); env.pop('LD_LIBRARY_PATH', None)
    restart_log = (ui.output / 'master-restarted-app.log').open('w')
    restart = subprocess.Popen([os.environ['ULTRA_TEST_ALIVE_BINARY'], str(path)], env=env, stdout=restart_log, stderr=subprocess.STDOUT)
    ui.pid = restart.pid
    windows.scope = 'Alive'
    windows.focus('Alive')
    ui.wait_for('Start transport')
    reopened_identity = process_identity(ui.pid)
    assert_same_identity(initial, reopened_identity)
    assert alive.value('Transport playing') == 'false'
    assert float(alive.value('Master gain')) == .5
    assert float(alive.value('Pulse gain')) == .55
    alive.select_clip('Pulse')
    assert alive.value('Note 1 pitch') == '61'
    assert not ui.wait_for('Undo pending edit').get_state_set().contains(Atspi.StateType.ENABLED)
    assert not ui.wait_for('Redo pending edit').get_state_set().contains(Atspi.StateType.ENABLED)
    reopened_path = ui.output / 'master-reopened.alive'
    alive.choose_file('Save session as', 'Save Alive Session', reopened_path)
    assert json.loads(reopened_path.read_text()) == saved
    capture = alive.start_capture('master-reopened-playback')
    alive.transport('start'); time.sleep(2)
    alive.transport('stop')
    report['reopened_audio'] = alive.finish_capture(capture)
    capture = None
    assert report['reopened_audio']['peak'] > .0001
    ui.click('Quit Alive')
    restart.wait(timeout=8)
    assert restart.returncode == 0
    record('same executable and module, reopened owner and replay', identity=reopened_identity, complete=True)


if __name__ == '__main__':
    try:
        run()
    except BaseException as error:
        failures = cleanup_independently([lambda: record('failure', error=repr(error)),
                                          lambda: alive.screenshot('master-failure.png')])
        if failures:
            print('Master failure evidence errors:', failures, file=sys.stderr, flush=True)
        raise
    finally:
        failed = sys.exc_info()[0] is not None
        actions = []
        if capture is not None:
            actions.append(lambda: alive.finish_capture(capture))
        if restart is not None and restart.poll() is None:
            def stop_restart():
                restart.terminate()
                try: restart.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    restart.kill(); restart.wait()
            actions.append(stop_restart)
        if restart_log is not None:
            actions.append(restart_log.close)
        errors = cleanup_independently(actions)
        if errors:
            if failed:
                print('Master cleanup errors:', errors, file=sys.stderr, flush=True)
            else:
                raise RuntimeError(f'Master cleanup errors: {errors}')
