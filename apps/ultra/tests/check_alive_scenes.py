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
                         'voices': [alive.value(f'Track {index} active voices') for index in range(1, 9)]})
    (ui.output / 'scenes-observations.json').write_text(json.dumps(observations, indent=2))
    return raw

def pause(seconds):
    for index in range(seconds):
        time.sleep(1); collect(f'playing-{index}')

worker = threading.Thread(target=sample)
try:
    windows.focus(alive.MAIN)
    ui.wait_for('Select Track 8 slot 4')
    artifacts = {Path(os.readlink(f'/proc/{ui.pid}/exe'))}
    artifacts.update(Path(line.split()[-1]) for line in Path(f'/proc/{ui.pid}/maps').read_text().splitlines()
                     if 'libultra_native.so' in line)
    assert len(artifacts) == 2, artifacts
    (ui.output / 'scenes-artifacts.json').write_text(json.dumps({
        'pid': ui.pid, 'files': {str(path): hashlib.sha256(path.read_bytes()).hexdigest() for path in artifacts}}, indent=2))
    alive.screenshot('scenes-initial.png')
    assert not ui.wait_for('Add instrument track').get_state_set().contains(Atspi.StateType.ENABLED)
    settings = alive.check_audio_settings()
    worker.start()
    collect('prepared-eight')
    activate('Launch scene 4')
    alive.wait_value('Scene 4 request', lambda value: 'applied' in value)
    assert all(alive.value(f'{name} clip runtime').startswith('Stopped') for name in ['Pulse', 'Harmony', *[f'Track {i}' for i in range(3, 9)]])
    assert alive.value('Transport playing') == 'false'
    activate('Launch scene 1')
    alive.wait_value('Pulse clip runtime', lambda value: value.startswith('Cued Clip 1'))
    collect('stopped-empty-row-and-cued-row')
    alive.transport('start')
    capture = alive.start_capture('scenes-playback')
    pause(3)
    assert all(int(alive.value(f'Track {i} active voices')) == 3 for i in range(1, 9))
    names = ['Pulse', 'Harmony', *[f'Track {i}' for i in range(3, 9)]]
    alive.numeric('Seek beat', .125); activate('Seek transport')
    activate('Launch scene 2')
    activate('Launch Pulse Clip 1')
    mixed = alive.wait_value('Scene 2 request', lambda value: 'mixed' in value and 'Pulse: superseded' in value and 'Track 8: applied' in value)
    for name in names[1:]:
        alive.wait_value(f'{name} clip runtime', lambda value: value.startswith('Playing Clip 2'))
    assert alive.value('Pulse clip runtime').startswith('Playing Clip 1')
    collect('scene-partial-individual-override')
    observations.append({'label': 'scene-mixed-native-receipt', 'monotonic': time.monotonic(), 'receipt': mixed})
    activate('Launch scene 2')
    alive.wait_value('Pulse clip runtime', lambda value: value.startswith('Playing Clip 2'))
    applied = alive.wait_value('Scene 2 request', lambda value: 'Pulse: applied' in value and 'Track 8: applied' in value)
    observations.append({'label': 'scene-all-applied-native-receipt', 'monotonic': time.monotonic(), 'receipt': applied})
    collect('quantized-eight-scene')
    activate('Select Pulse slot 1'); activate('Select Pulse Stereo Utility effect 1')
    activate('Edit selected device in Ultra')
    windows.focus('Pulse - Ultra Hosted Editor'); alive.numeric('Hosted Gain base', .65)
    activate('Close hosted editor'); windows.focus(alive.MAIN)
    before = int(alive.value('Absolute frame'))
    activate('Edit selected device in Ultra'); windows.focus('Pulse - Ultra Hosted Editor')
    assert float(alive.value('Hosted Gain base')) == .65
    activate('Close hosted editor'); windows.focus(alive.MAIN)
    assert int(alive.value('Absolute frame')) > before
    activate('Bypass Pulse Stereo Utility effect 1')
    activate('Select Pulse slot 1')
    alive.numeric('Note 1 velocity', 81); activate('Undo pending edit')
    assert alive.value('Note 1 velocity') == '80'
    activate('Select Pulse Subtractive instrument')
    alive.numeric('Cutoff base', 1777)
    alive.wait_value('Cutoff effective ownership', lambda value: 'Automation:' in value and '1777' not in value)
    alive.numeric('Pulse gain', .2)
    for name in ('Track 8 mute', 'Track 8 solo', 'Track 8 solo', 'Track 8 mute'): activate(name)
    activate('Stop Pulse track')
    alive.wait_value('Track 1 active voices', lambda value: value == '0')
    assert all(int(alive.value(f'Track {i} active voices')) == 3 for i in range(2, 9))
    collect('local-stop-keeps-seven-tracks')
    alive.screenshot('scenes-playing.png')
    alive.transport('stop')
    audio = alive.finish_capture(capture); capture = None
    assert audio['peak'] > .0001
    saved = ui.output / 'scenes-saved.alive'
    disclosure('Audio details', False)
    alive.choose_file('Save session as', 'Save Alive Session', saved)
    record = alive.file_score(json.loads(saved.read_text()))
    assert len(record['tracks']) == 8 and sum(1 + len(t['effects']) for t in record['tracks']) == 16
    assert record['tracks'][0]['effects'][0]['parameters']['gain'] == .65
    assert record['tracks'][0]['device']['parameters']['cutoff'] == 1777
    assert all(t['defaultClipId'] == t['slots'][0]['id'] for t in record['tracks'])
    assert record['tracks'][0]['effects'][0]['bypassed'] is True
    alive.choose_file('Open session', 'Open Alive Session', saved)
    collect('opened-stopped')
    assert alive.value('Transport playing') == 'false'
    assert all(alive.value(f'{name} clip runtime').startswith('Cued Clip 1') for name in names)
    alive.transport('start'); pause(2); alive.transport('stop')
    collect('saved-opened-eight')
    disclosure('Audio details', False)
    activate('Remove Track 8 track')
    alive.choose_file('Add instrument track', 'Load Ultra Device', Path('apps/ultra/examples/subtractive.ultra').resolve())
    activate('Select Track 8 slot 1'); activate('Create clip'); activate('Add note')
    activate('Prepare / Apply')
    collect('rebuilt-prepared')
    alive.transport('start'); pause(2); alive.transport('stop')
    collect('remove-add-create-apply')
    disclosure('Audio details', False)
    alive.choose_file('Save session as', 'Save Alive Session', ui.output / 'scenes-rebuilt.alive')
    activate('Alive audio settings'); activate('Stop Alive audio to edit settings'); activate('Close audio settings')
    time.sleep(1.2)
    final = collect('witnessed-final-retirement')
    assert final['complete'] and not errors, (final, errors)
    assert all(int(alive.value(f'Track {i} active voices')) == 0 for i in range(1, 9))
    stop.set(); worker.join(timeout=5)
    assert not worker.is_alive(), 'Resource sampler did not stop before manifest hashing'
    (ui.output / 'scenes-final-epochs.json').write_text(json.dumps(final, indent=2))
    report = {'complete': True, 'atomic_scene_partial_override': True, 'all_empty_scene': True, 'saved_defaults_restored': True, 'physical_audio': False, 'physical_xruns': None,
              'settings': settings, 'audio': audio, 'completed_epochs': epochs.cursor,
              'resources': resources.manifest(), 'epoch_log': epoch_log.manifest(),
              'observations': observations, 'sampling_errors': errors,
              'duration_intervals': {e['epoch_id']: histogram_summary(e['metrics']['duration_hist'], final['duration_upper_edges_ns'], e['metrics']['duration_max_ns']) for e in final['completed']}}
    (ui.output / 'scenes-report.json').write_text(json.dumps(report, indent=2))
    alive.screenshot('scenes-final.png')
    activate('Quit Alive')
except Exception:
    alive.screenshot('scenes-failure.png')
    raise
finally:
    stop.set()
    if worker.is_alive(): worker.join(timeout=5)
    if capture: capture[0].finish()
    (ui.output / 'scenes-errors.json').write_text(json.dumps(errors))
