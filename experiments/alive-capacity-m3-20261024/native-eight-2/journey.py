#!/usr/bin/env python3
"""Actual standalone eight-track journey with finite epoch/resource/audio evidence."""
import json
import os
import threading
import time
from pathlib import Path
import check_alive_desktop as alive
from stream_measurement import EpochCollector, JsonLines, ProcessGroups, ProcessSampler, histogram_summary
from gi.repository import Atspi

ui, windows = alive.ui, alive.windows
stop = threading.Event()
errors = []
resources = JsonLines(ui.output / 'capacity-resources.jsonl')
epoch_log = JsonLines(ui.output / 'capacity-epochs.jsonl')
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
                         'voices': [alive.value(f'Track {index} active voices') for index in range(1, 9)]})
    (ui.output / 'capacity-observations.json').write_text(json.dumps(observations, indent=2))
    return raw

def pause(seconds):
    for index in range(seconds):
        time.sleep(1); collect(f'playing-{index}')

worker = threading.Thread(target=sample)
try:
    windows.focus(alive.MAIN)
    ui.wait_for('Select Track 8 slot 4')
    assert not ui.wait_for('Add instrument track').get_state_set().contains(Atspi.StateType.ENABLED)
    settings = alive.check_audio_settings()
    worker.start()
    collect('prepared-eight')
    alive.transport('start')
    capture = alive.start_capture('capacity-playback')
    pause(3)
    assert all(int(alive.value(f'Track {i} active voices')) == 3 for i in range(1, 9))
    names = ['Pulse', 'Harmony', *[f'Track {i}' for i in range(3, 9)]]
    for name in names: activate(f'Launch {name} Clip 2')
    for name in names:
        alive.wait_value(f'{name} clip runtime', lambda value: 'Playing Clip 2' in value and 'applied' in value)
    collect('quantized-eight-switches')
    activate('Select Pulse slot 1'); activate('Select Pulse Stereo Utility effect 1')
    activate('Edit selected device in Ultra')
    windows.focus('Pulse - Ultra Hosted Editor'); alive.numeric('Hosted Gain base', .65)
    activate('Close hosted editor'); windows.focus(alive.MAIN)
    before = int(alive.value('Absolute frame'))
    activate('Edit selected device in Ultra'); windows.focus('Pulse - Ultra Hosted Editor')
    assert float(alive.value('Hosted Gain base')) == .65
    activate('Close hosted editor'); windows.focus(alive.MAIN)
    assert int(alive.value('Absolute frame')) > before
    activate('Select Pulse Subtractive instrument')
    alive.numeric('Cutoff base', 1777)
    alive.wait_value('Cutoff effective ownership', lambda value: 'Automation:' in value and '1777' not in value)
    alive.numeric('Pulse gain', .2)
    for name in ('Track 8 mute', 'Track 8 solo', 'Track 8 solo', 'Track 8 mute'): activate(name)
    activate('Stop Pulse track')
    alive.wait_value('Track 1 active voices', lambda value: value == '0')
    assert all(int(alive.value(f'Track {i} active voices')) == 3 for i in range(2, 9))
    collect('local-stop-keeps-seven-tracks')
    alive.screenshot('capacity-playing.png')
    alive.transport('stop')
    audio = alive.finish_capture(capture); capture = None
    assert audio['peak'] > .0001
    saved = ui.output / 'capacity-saved.alive'
    disclosure('Audio details', False)
    alive.choose_file('Save session as', 'Save Alive Session', saved)
    record = json.loads(saved.read_text())
    assert len(record['tracks']) == 8 and sum(1 + len(t['effects']) for t in record['tracks']) == 16
    assert record['tracks'][0]['effects'][0]['parameters']['gain'] == .65
    assert record['tracks'][0]['device']['parameters']['cutoff'] == 1777
    alive.choose_file('Open session', 'Open Alive Session', saved)
    assert alive.value('Transport playing') == 'false'
    alive.transport('start'); pause(2); alive.transport('stop')
    collect('saved-opened-eight')
    disclosure('Audio details', False)
    activate('Remove Track 8 track')
    alive.choose_file('Add instrument track', 'Load Ultra Device', Path('apps/ultra/examples/subtractive.ultra').resolve())
    activate('Select Track 8 slot 1'); activate('Create clip'); activate('Add note')
    activate('Prepare / Apply')
    alive.transport('start'); pause(2); alive.transport('stop')
    collect('remove-add-create-apply')
    disclosure('Audio details', False)
    alive.choose_file('Save session as', 'Save Alive Session', ui.output / 'capacity-rebuilt.alive')
    activate('Alive audio settings'); activate('Stop Alive audio to edit settings'); activate('Close audio settings')
    time.sleep(1.2)
    final = collect('witnessed-final-retirement')
    assert final['complete'] and not errors, (final, errors)
    assert all(int(alive.value(f'Track {i} active voices')) == 0 for i in range(1, 9))
    (ui.output / 'capacity-final-epochs.json').write_text(json.dumps(final, indent=2))
    report = {'complete': True, 'physical_audio': False, 'physical_xruns': None,
              'settings': settings, 'audio': audio, 'completed_epochs': epochs.cursor,
              'resources': resources.manifest(), 'epoch_log': epoch_log.manifest(),
              'observations': observations, 'sampling_errors': errors,
              'duration_intervals': {e['epoch_id']: histogram_summary(e['metrics']['duration_hist'], final['duration_upper_edges_ns'], e['metrics']['duration_max_ns']) for e in final['completed']}}
    (ui.output / 'capacity-report.json').write_text(json.dumps(report, indent=2))
    alive.screenshot('capacity-final.png')
    activate('Quit Alive')
finally:
    stop.set()
    if worker.is_alive(): worker.join(timeout=5)
    if capture: capture[0].finish()
    (ui.output / 'capacity-errors.json').write_text(json.dumps(errors))
