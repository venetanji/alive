#!/usr/bin/env python3
"""Short exact-release clip journey plus bounded stream/resource qualification."""
import json
import os
from pathlib import Path
import threading
import time

import check_alive_clips as clips
import check_alive_desktop as alive
from stream_measurement import EpochCollector, JsonLines, PlayingIntervals, ProcessSampler, MAX_WALL, histogram_summary
from gi.repository import Atspi, GLib

ui, windows = alive.ui, alive.windows
stop = threading.Event()
lock = threading.Lock()
errors = []
resource_log = JsonLines(ui.output/'observability-resources.jsonl')
epoch_log = JsonLines(ui.output/'observability-epochs.jsonl')
actions = JsonLines(ui.output/'observability-actions.jsonl')
epochs = EpochCollector(epoch_log)
playing = PlayingIntervals()
app_sampler = ProcessSampler(ui.pid)
overhead_sampler = ProcessSampler(os.getpid())
server_sampler = ProcessSampler(int(os.environ['ULTRA_TEST_AUDIO_PID'])) if os.environ.get('ULTRA_TEST_AUDIO_PID') else None
boundary = 0
last_diagnostics = None
start = time.monotonic()
references = {}


def accessible(name):
    item = references.get(name)
    if item is not None:
        try: return Atspi.Text.get_text(item, 0, -1)
        except GLib.Error: references.pop(name, None)
    for frame in windows.app_frames():
        try:
            for item in ui.walk(frame):
                if item.get_name() == name and 'Text' in item.get_interfaces():
                    references[name] = item
                    return Atspi.Text.get_text(item, 0, -1)
        except GLib.Error:
            continue  # A closing editor is an observation gap, not a zero value.
    return None


def collect():
    global last_diagnostics
    text = accessible('Stream diagnostics')
    if text:
        record = json.loads(text)
        if 'error' not in record:
            epochs.accept(record)
            last_diagnostics = record
        else:
            epoch_log.write({'kind': 'observation_gap', 'monotonic': time.monotonic(), 'reason': str(record['error'])[:256]})
    else:
        epoch_log.write({'kind': 'observation_gap', 'monotonic': time.monotonic(), 'reason': 'diagnostics_unavailable'})
    running, frame = accessible('Transport playing'), accessible('Absolute frame')
    if running is not None and frame is not None:
        playing.observe(time.monotonic(), running == 'true', int(frame), boundary)
    else:
        playing.last = None
        epoch_log.write({'kind': 'observation_gap', 'monotonic': time.monotonic(), 'reason': 'transport_unavailable'})


def sample():
    deadline = time.monotonic()
    while not stop.is_set():
        try:
            if time.monotonic()-start > MAX_WALL: raise RuntimeError('wall_limit')
            row = {'monotonic': time.monotonic(), 'action': boundary, 'app': app_sampler.sample(),
                   'sampler_capture_overhead': overhead_sampler.sample(),
                   'private_audio_server': server_sampler.sample() if server_sampler else None}
            with lock:
                collect()
                row['playing_seconds_proven'] = playing.seconds
                row['missed_cadences'] = max(0, int(time.monotonic()-deadline))
                resource_log.write(row)
        except Exception as error:
            errors.append(str(error))
            (ui.output/"observability-errors.json").write_text(json.dumps(errors))
            stop.set()
            return
        deadline += 1
        stop.wait(max(0, deadline-time.monotonic()))


original_click = ui.click
original_settings = alive.check_audio_settings
worker = None


def settings():
    global worker
    result = original_settings()
    original_click('Stream measurements')
    time.sleep(1.2)
    worker = threading.Thread(target=sample, daemon=True)
    worker.start()
    return result


def clicked(name, *args, **kwargs):
    global boundary
    if errors: raise RuntimeError('Measurement stopped: ' + '; '.join(errors))
    with lock:
        boundary += 1
        actions.write({'monotonic': time.monotonic(), 'action': boundary, 'control': name})
        if worker is not None: collect()
    if name == 'Quit Alive': qualify_and_finish()
    return original_click(name, *args, **kwargs)


def qualify_and_finish():
    # The accepted clip journey ends stopped; repeat editor/Apply/configure on it.
    for cycle in range(3):
        alive.transport('start')
        time.sleep(2.2)
        alive.transport('stop')
        original_click('Select Pulse slot 1')
        alive.numeric('Note 1 velocity', 85+cycle)
        original_click('Prepare / Apply')
        time.sleep(1.1)
        original_click('Select Pulse Subtractive instrument')
        original_click('Open Pulse editor')
        windows.focus('Pulse - Ultra Hosted Editor')
        alive.numeric('Hosted Cutoff base', 900+cycle*50)
        alive.wait_value('Hosted Cutoff effective ownership', lambda text: 'Base:' in text)
        original_click('Close hosted editor')
        windows.focus(alive.MAIN)
        original_click('Audio details')
        original_click('Alive audio settings')
        original_click('Save Alive audio settings')
        original_click('Save and start Alive audio')
        original_click('Close audio settings')
        original_click('Audio details')
        time.sleep(1.1)
    alive.transport('stop')
    original_click('Audio details')
    original_click('Alive audio settings')
    original_click('Stop Alive audio to edit settings')
    original_click('Close audio settings')
    original_click('Audio details')
    time.sleep(1.3)
    with lock: collect()
    stop.set()
    if worker is not None: worker.join(timeout=5)
    assert not errors, errors
    assert last_diagnostics is not None and last_diagnostics['complete'], last_diagnostics
    assert epochs.cursor >= 5, epochs.cursor
    assert playing.seconds > 3, playing.seconds
    (ui.output/'observability-final.json').write_text(json.dumps(last_diagnostics, indent=2))
    summary = {'physical_audio': False, 'physical_xruns': None, 'complete': True,
               'playing_seconds_proven': playing.seconds, 'excluded_seconds': playing.excluded,
               'completed_epochs': epochs.cursor, 'resources': resource_log.manifest(),
               'epochs': epoch_log.manifest(), 'actions': actions.manifest(),
               'wall_seconds': time.monotonic()-start, 'sampling_errors': errors,
               'cpu_coverage': 'observed identities; transient workers and exited final deltas remain unavailable'}
    summary['epoch_duration_intervals'] = {e['epoch_id']: histogram_summary(e['metrics']['duration_hist'], last_diagnostics['duration_upper_edges_ns'], e['metrics']['duration_max_ns']) for e in last_diagnostics['completed']}
    summary['epoch_utilization_intervals'] = {e['epoch_id']: histogram_summary(e['metrics']['util_hist'], last_diagnostics['utilization_upper_percent'], e['metrics']['max_utilization_ppm']) for e in last_diagnostics['completed']}
    (ui.output/'observability-report.json').write_text(json.dumps(summary, indent=2))
    original_click('Save session')


alive.check_audio_settings = settings
ui.click = clicked
try:
    clips.run()
finally:
    (ui.output/"observability-errors.json").write_text(json.dumps(errors))
    stop.set()
    if worker is not None: worker.join(timeout=5)
