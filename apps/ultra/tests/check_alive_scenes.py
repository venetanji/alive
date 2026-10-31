#!/usr/bin/env python3
"""Actual standalone atomic-scene journey with finite epoch/resource/audio evidence."""
import json
import hashlib
import os
import threading
import time
from pathlib import Path
import check_alive_desktop as alive
from stream_measurement import EpochCollector, JsonLines, ProcessGroups, ProcessSampler, histogram_summary
from gi.repository import Atspi
from check_alive_clips import launch_at_observable_phase

ui, windows = alive.ui, alive.windows
stop = threading.Event()
errors = []
resources = JsonLines(ui.output / 'scenes-resources.jsonl')
epoch_log = JsonLines(ui.output / 'scenes-epochs.jsonl')
epochs = EpochCollector(epoch_log)
groups = ProcessGroups(app=ProcessSampler(ui.pid), sampler_capture=ProcessSampler(os.getpid()),
                       server=ProcessSampler(int(os.environ['ULTRA_TEST_AUDIO_PID'])))
observations = []
capture = None

def activate(name):
    item = ui.wait_for(name)
    assert item.get_state_set().contains(Atspi.StateType.ENABLED), name
    assert Atspi.Component.grab_focus(item), name
    ui.keys('Return')
    time.sleep(.15)

def sample():
    deadline = time.monotonic()
    while not stop.is_set():
        try:
            resources.write({'monotonic': time.monotonic(), **groups.sample()})
        except Exception as error:
            errors.append(str(error)); stop.set(); return
        deadline += 1
        stop.wait(max(0, deadline - time.monotonic()))

def disclosure(name, expanded):
    item = ui.wait_for(name)
    if item.get_state_set().contains(Atspi.StateType.EXPANDED) != expanded:
        Atspi.Component.grab_focus(item); ui.keys('Return')
    deadline = time.monotonic() + 3
    while time.monotonic() < deadline:
        if ui.wait_for(name).get_state_set().contains(Atspi.StateType.EXPANDED) == expanded: return
        time.sleep(.1)
    raise AssertionError('Disclosure did not reach its requested state: ' + name)

def collect(label):
    disclosure('Audio details', True)
    disclosure('Stream measurements', True)
    time.sleep(.15)
    raw = json.loads(alive.value('Stream diagnostics'))
    assert 'error' not in raw, raw
    epochs.accept(raw)
    observations.append({'label': label, 'monotonic': time.monotonic(),
                         'playing': alive.value('Transport playing'), 'frame': alive.value('Absolute frame'),
                         'voices': [alive.value(f'Track {index} active voices') for index in range(1, 3)]})
    (ui.output / 'scenes-observations.json').write_text(json.dumps(observations, indent=2))
    return raw

def pause(seconds):
    for index in range(seconds):
        time.sleep(1); collect(f'playing-{index}')

worker = threading.Thread(target=sample)
try:
    windows.focus(alive.MAIN)
    ui.wait_for('Select Harmony slot 4')
    artifacts = {Path(os.readlink(f'/proc/{ui.pid}/exe'))}
    artifacts.update(Path(line.split()[-1]) for line in Path(f'/proc/{ui.pid}/maps').read_text().splitlines()
                     if 'libultra_native.so' in line)
    assert len(artifacts) == 2, artifacts
    (ui.output / 'scenes-artifacts.json').write_text(json.dumps({
        'pid': ui.pid, 'files': {str(path): hashlib.sha256(path.read_bytes()).hexdigest() for path in artifacts}}, indent=2))
    names = ('Pulse', 'Harmony')
    for name in names:
        ui.click(f'Select {name} slot 1')
        ui.click('Duplicate clip')
        ui.click(f'Select {name} slot 2')
        ui.text('Clip name', 'Clip 2'); ui.keys('Tab')
        ui.click('Make source independent')
        alive.numeric('Note 1 pitch', int(alive.value('Note 1 pitch')) + 12)
    alive.settled()
    settings = alive.check_audio_settings()
    worker.start()
    collect('current-two-track-session')
    ui.click('Launch scene 4')
    alive.wait_value('Scene 4 request', lambda value: 'applied' in value)
    assert all('Session silence' in alive.value(f'{name} clip runtime') for name in names)
    assert alive.value('Transport playing') == 'false'
    ui.click('Launch scene 1')
    for name in names:
        alive.wait_value(f'{name} clip runtime', lambda value: 'Cued Clip 1' in value)
    collect('stopped-empty-scene-and-cued-scene')
    capture = alive.start_capture('scenes-playback')
    alive.transport('start')
    pause(2)
    for track in range(1, 3):
        alive.wait_value(f'Track {track} active voices', lambda value: int(value) > 0)
    launch_at_observable_phase('Launch scene 2')
    ui.click('Launch Pulse Clip 1')
    mixed = alive.wait_value('Scene 2 request', lambda value: 'mixed' in value and 'Pulse: superseded' in value and 'Harmony: applied' in value)
    alive.wait_value('Harmony clip runtime', lambda value: 'Playing Clip 2' in value)
    assert 'Playing Clip 1' in alive.value('Pulse clip runtime')
    observations.append({'label': 'scene-partial-individual-override', 'monotonic': time.monotonic(), 'receipt': mixed})
    ui.click('Launch scene 2')
    applied = alive.wait_value('Scene 2 request', lambda value: 'Pulse: applied' in value and 'Harmony: applied' in value)
    for name in names:
        alive.wait_value(f'{name} clip runtime', lambda value: 'Playing Clip 2' in value)
    observations.append({'label': 'scene-all-applied', 'monotonic': time.monotonic(), 'receipt': applied})
    ui.click('Stop Pulse track')
    alive.wait_value('Track 1 active voices', lambda value: value == '0')
    alive.wait_value('Track 2 active voices', lambda value: int(value) > 0)
    collect('local-stop-keeps-sibling-playing')
    alive.transport('stop')
    audio = alive.finish_capture(capture); capture = None
    assert audio['peak'] > .0001
    saved = ui.output / 'scenes-saved.alive'
    disclosure('Audio details', False)
    alive.choose_file('Save session as', 'Save Alive Session', saved)
    document = alive.file_score(json.loads(saved.read_text()))
    assert len(document['tracks']) == 2
    for track in document['tracks']:
        assert track['slots'][0]['sourceId'] != track['slots'][1]['sourceId']
        assert track['slots'][0]['name'] == 'Clip 1' and track['slots'][1]['name'] == 'Clip 2'
    alive.choose_file('Open session', 'Open Alive Session', saved)
    assert alive.value('Transport playing') == 'false'
    assert all('Arrangement' in alive.value(f'{name} clip runtime') for name in names)
    collect('opened-stopped-with-arrangement-authority')
    alive.transport('start'); pause(2); alive.transport('stop')
    ui.click('Alive audio settings')
    ui.click('Stop Alive audio to edit settings')
    ui.click('Close audio settings')
    time.sleep(1.2)
    final = collect('witnessed-final-retirement')
    assert final['complete'] and not errors, (final, errors)
    assert all(alive.value(f'Track {track} active voices') == '0' for track in range(1, 3))
    stop.set(); worker.join(timeout=5)
    assert not worker.is_alive(), 'Resource sampler did not stop before manifest hashing'
    (ui.output / 'scenes-final-epochs.json').write_text(json.dumps(final, indent=2))
    report = {'complete': True, 'tracks': 2, 'atomic_scene_partial_override': True,
              'all_empty_scene': True, 'reopen_arrangement_authority': True,
              'physical_audio': False, 'physical_xruns': None,
              'settings': settings, 'audio': audio, 'completed_epochs': epochs.cursor,
              'resources': resources.manifest(), 'epoch_log': epoch_log.manifest(),
              'observations': observations, 'sampling_errors': errors,
              'duration_intervals': {e['epoch_id']: histogram_summary(e['metrics']['duration_hist'], final['duration_upper_edges_ns'], e['metrics']['duration_max_ns']) for e in final['completed']}}
    (ui.output / 'scenes-report.json').write_text(json.dumps(report, indent=2))
    alive.screenshot('scenes-final.png')
    ui.click('Quit Alive')
except Exception:
    alive.screenshot('scenes-failure.png')
    raise
finally:
    stop.set()
    if worker.is_alive(): worker.join(timeout=5)
    if capture: capture[0].finish()
    (ui.output / 'scenes-errors.json').write_text(json.dumps(errors))
