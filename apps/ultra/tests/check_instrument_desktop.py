#!/usr/bin/env python3
"""Author and perform the device through the actual private Tauri desktop.

ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_instrument_desktop.py \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/ultra-instrument-desktop
"""
import array
import hashlib
import json
import math
import os
from pathlib import Path
import platform
import subprocess
import time

import check_canvas_desktop as ui
import check_documents_desktop as windows
from gi.repository import Atspi


def screenshot(name):
    root = ui.Gdk.get_default_root_window()
    ui.Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height()).savev(
        str(ui.output / name), 'png', [], [])


def move(x, y):
    assert ui.t.XTestFakeMotionEvent(ui.display, 0, round(x), round(y), 0)
    ui.x.XFlush(ui.display)


def key_state(name, down):
    code = ui.x.XKeysymToKeycode(ui.display, ui.x.XStringToKeysym(name.encode()))
    assert code and ui.t.XTestFakeKeyEvent(ui.display, code, int(down), 0)
    ui.x.XFlush(ui.display)


def port(node, direction, index):
    prefix = f', {direction} {index}:'
    for frame in windows.app_frames():
        if frame.get_name().removeprefix('* ') != windows.scope:
            continue
        for item in ui.walk(frame):
            name = item.get_name()
            if f' {node}{prefix}' in name:
                return name
    raise AssertionError(f'Missing {node} {direction} {index}')


def numeric(name, value):
    ui.text(name + ' value', str(value))
    ui.keys('Tab')
    time.sleep(.1)


def export_patch():
    patch = ui.export()
    # A newly delivered native window can receive a delayed focus event while
    # Escape is sent. Close the actual modal explicitly if it is still present.
    try:
        ui.find('Close dialog')
    except StopIteration:
        pass
    else:
        ui.click('Close dialog')
    return patch


def start_capture(name, seconds):
    path = ui.output / (name + '.f32')
    process = subprocess.Popen([
        'pw-cat', '--record', '--raw', '--rate=48000', '--format=f32', '--channels=2',
        '--target=0', '--sample-count=' + str(round(seconds * 48000)),
        '--properties={ node.name = Ultra-Instrument-Capture }', str(path)],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    for _ in range(40):
        if 'Ultra-Instrument-Capture:input_FL' in subprocess.check_output(['pw-link', '-i'], text=True):
            break
        time.sleep(.1)
    for channel in ('FL', 'FR'):
        subprocess.run(['pw-link', 'Ultra-Software-Output:monitor_' + channel,
                        'Ultra-Instrument-Capture:input_' + channel], check=True)
    return process, path, seconds


def finish_capture(capture):
    process, path, seconds = capture
    try:
        stdout, stderr = process.communicate(timeout=seconds + 10)
        assert process.returncode in (0, 1) and not stderr, stdout + stderr
    finally:
        if process.poll() is None:
            process.terminate()
            process.communicate(timeout=3)
    samples = array.array('f'); samples.frombytes(path.read_bytes())
    assert len(samples) == round(seconds * 48000) * 2
    assert all(math.isfinite(value) for value in samples)
    # pw-link creates the two monitor links separately; ignore their setup prefix.
    left, right = samples[8192::2], samples[8193::2]
    assert left == right, 'Explicit mono duplication did not produce equal stereo channels'
    windows = [max(map(abs, left[offset:offset+48000])) for offset in range(0, len(left), 48000)]
    return {'frames': len(samples)//2, 'analyzed_frames': len(left), 'setup_frames_ignored': 4096,
            'one_second_peaks': windows, 'peak': max(map(abs, left)),
            'mean_square': sum(value * value for value in left) / len(left),
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def capture(name, seconds=1):
    return finish_capture(start_capture(name, seconds))


def save(path):
    ui.keys('Control_L', 's')
    for _ in range(50):
        saved = json.loads(path.read_text())
        if saved.get('device'):
            return saved
        time.sleep(.1)
    raise AssertionError('Native Save did not persist the device')


def run():
    source = ui.output / 'initial.ultra'
    title = source.name + ' - Ultra'
    windows.focus(title)
    ui.wait_for('Start audio')
    assert export_patch()['nodes'] == []
    # Every object is created with compact N entry, never JSON import.
    objects = ['midiin', 'poly.note~ 4', 'saw.voice~', 'lowpass.voice~ 2400 0.7',
               'adsr.voice~ 10 150 0.65 300', '*.voice~', '*.voice~', 'mix.voice~',
               'gain~ 90', 'join~', 'stereo.dac~', 'toggle', 'metro 250',
               'counter 8', 'chord 48 1', 'makenote 100 400']
    for index, text in enumerate(objects):
        canvas = Atspi.Component.get_extents(ui.wait_for('Editable patch canvas'), Atspi.CoordType.SCREEN)
        Atspi.Component.grab_focus(ui.wait_for('Editable patch canvas'))
        move(canvas.x + 65 + (index % 4) * 245, canvas.y + 65 + (index // 4) * 130)
        ui.keys('n')
        if index == 1:
            ui.text('Object name and arguments', 'poly.n')
            ui.keys('Tab')
        ui.text('Object name and arguments', text)
        ui.keys('Return')
    patch = export_patch()
    assert len(patch['nodes']) == 16, patch
    edges = [(1, 0, 2, 0), (2, 0, 3, 0), (3, 0, 4, 0), (2, 1, 5, 0),
             (4, 0, 6, 0), (5, 0, 6, 1), (6, 0, 7, 0), (2, 2, 7, 1),
             (7, 0, 8, 0), (8, 0, 9, 0), (9, 0, 10, 0), (9, 0, 10, 1),
             (10, 0, 11, 0), (12, 0, 13, 0), (13, 0, 14, 0),
             (14, 0, 15, 0), (15, 0, 16, 0), (16, 0, 2, 0)]
    for source_id, outlet, target, inlet in edges:
        ui.drag_port(port(source_id, 'Outlet', outlet), port(target, 'Inlet', inlet))
    authored = export_patch()
    assert len(authored['edges']) == len(edges), authored['edges']
    screenshot('authored-canvas.png')
    ui.click('Perform instrument')
    ui.click('Package device')
    ui.wait_for('Cutoff value')
    numeric('Cutoff', 1200); numeric('Attack', 35)
    ui.text('New preset name', 'Warm'); ui.click('Store preset')
    numeric('Cutoff', 6000)
    ui.click('Recall')
    packaged = export_patch()
    assert packaged['device']['presets'][-1]['name'] == 'Warm'
    assert next(node for node in packaged['nodes'] if node['id'] == 4)['params']['cutoff'] == 1200
    ui.click('Audio settings')
    Atspi.Component.grab_focus(ui.wait_for('Buffer / period'))
    ui.keys('Home')
    for _ in range(5): ui.keys('Down')
    ui.keys('Return'); ui.keys('Escape')
    ui.click('Save & start audio'); time.sleep(.8)
    assert not ui.wait_for('Start audio').get_state_set().contains(Atspi.StateType.ENABLED)
    audio_labels = []
    for frame in windows.app_frames():
        for item in ui.walk(frame):
            if 'Text' in item.get_interfaces():
                text = Atspi.Text.get_text(item, 0, -1)
                if any(token in text for token in ['kHz', 'frames /', 'PipeWire']): audio_labels.append(text)
    screenshot('audio-settings.png')
    ui.click('Close panel')
    # Opening settings closes Perform. Reopen before actual keyboard playback.
    ui.click('Perform instrument')
    Atspi.Component.grab_focus(ui.wait_for('Instrument keyboard'))
    key_state('g', True); time.sleep(.2)
    held = capture('keyboard-held')
    assert held['peak'] > 1e-4, held
    numeric('Cutoff', 500)
    live = capture('keyboard-live-cutoff')
    assert live['peak'] > 1e-4 and live['mean_square'] < held['mean_square'], live
    key_state('g', False); time.sleep(.7)
    released = capture('keyboard-released')
    assert released['peak'] < 1e-7, released
    numeric('Cutoff', 1200)
    saved = save(source)
    ui.click('Close instrument panel')
    Atspi.Component.grab_focus(ui.wait_for('Editable patch canvas')); ui.keys('Control_L', 'e')
    ui.click('Trigger toggle object 12')
    first_score = capture('first-score')
    assert first_score['peak'] > 1e-4
    ui.click('Perform instrument'); ui.click('New instance')
    for _ in range(60):
        titles = [frame.get_name().removeprefix('* ') for frame in windows.app_frames()]
        others = [value for value in titles if value != title and value.endswith(' - Ultra')]
        if others: break
        time.sleep(.1)
    assert len(others) == 1, titles
    second_title = others[0]; windows.focus(second_title)
    ui.click('Perform instrument'); numeric('Cutoff', 320); numeric('Level', 0)
    second_muted = export_patch()
    assert second_muted['device'] == saved['device']
    assert capture('first-survives-second-mute')['peak'] > 1e-4
    windows.focus(title)
    numeric('Level', 0)
    assert capture('both-muted')['peak'] < 1e-7
    windows.focus(second_title)
    numeric('Level', 90); ui.click('Close instrument panel')
    Atspi.Component.grab_focus(ui.wait_for('Editable patch canvas')); ui.keys('Control_L', 'e')
    ui.click('Trigger toggle object 12')
    assert capture('second-score')['peak'] > 1e-4
    windows.focus(title)
    numeric('Level', 90); ui.click('Stop patch'); save(source)
    windows.native_menu('Close Window')
    windows.focus(second_title)
    assert capture('second-survives-first-close')['peak'] > 1e-4
    windows.open_file(source)
    assert export_patch() == saved, 'Save/close/reopen changed connections, values or presets'
    ui.click('Perform instrument'); screenshot('reopened-instrument.png')
    windows.focus(second_title)
    ui.click('Perform instrument')
    # One minute of actual output while editing parameters, authoring, zooming and panning.
    duration = float(os.environ.get('ULTRA_INSTRUMENT_EDIT_SECONDS', '60'))
    recording = start_capture('editing-playback', duration)
    start = time.monotonic(); edits = 0
    while time.monotonic() - start < duration:
        numeric('Cutoff', 400 + (edits % 8) * 500)
        ui.click('Close instrument panel')
        Atspi.Component.grab_focus(ui.wait_for('Editable patch canvas'))
        ui.keys('z'); ui.keys('Shift_L', 'z')
        ui.drag_control('Editable patch canvas', (.5, .5), (.53, .53), modifier='space')
        ui.click('Reset canvas view')
        if edits % 3 == 0:
            ui.keys('Control_L', 'e')
            ui.drag_control('Select or drag saw.voice~ object 3', (.5, .5), (.55, .55))
            ui.keys('Control_L', 'e')
        ui.click('Perform instrument'); edits += 1
    sustained = finish_capture(recording)
    assert min(sustained['one_second_peaks']) > 1e-5, sustained
    screenshot('editing-playback.png')
    (ui.output / 'pipewire-top.txt').write_text(subprocess.check_output(['pw-top', '-b', '-n', '2'], text=True))
    ui.click('Audio settings')
    final_audio = [Atspi.Text.get_text(item, 0, -1) for frame in windows.app_frames()
                   for item in ui.walk(frame) if 'Text' in item.get_interfaces()]
    stream_errors = int(final_audio[final_audio.index('Stream errors') + 1])
    assert stream_errors == 0, final_audio
    screenshot('final-audio-settings.png')
    ui.click('Stop audio')
    result = {'status': 'passed', 'scope': 'actual release Tauri, WebKitGTK, Rust CPAL and private software PipeWire',
              'kernel': platform.release(), 'cpu': subprocess.check_output(['lscpu'], text=True),
              'binary_sha256': hashlib.sha256(Path('/proc', str(ui.pid), 'exe').read_bytes()).hexdigest(),
              'audio_scope': os.environ['ULTRA_TEST_AUDIO_SCOPE'], 'audio_labels': audio_labels,
              'final_audio_text': final_audio, 'stream_errors': stream_errors, 'keyboard_entry_objects': len(objects),
              'dragged_cables': len(edges), 'preset_saved_recalled_reopened': 'Warm',
              'independent_windows': 2, 'keyboard_held': held, 'keyboard_live_cutoff': live,
              'keyboard_released': released, 'first_score': first_score,
              'sustained': sustained, 'edit_cycles': edits, 'editing_seconds': time.monotonic() - start,
              'limits': ['software sink, no physical MIDI/analog latency qualification',
                         'Alive session hosting remains absent; separate headless harness proves device interface']}
    (ui.output / 'instrument-result.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2), flush=True)


if __name__ == '__main__':
    run()
