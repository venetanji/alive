#!/usr/bin/env python3
"""Actual rolling clip-region journey in the owned desktop/software audio session.

Run check_canvas_desktop.sh with ULTRA_TEST_ALIVE=1,
ULTRA_TEST_ALIVE_SESSION=apps/alive/examples/quantized-midi.alive and this file as
ULTRA_TEST_SCRIPT. Every action uses native input or accessibility; no IPC mock.
"""
import array
import json
import math
import time
import wave

import check_alive_desktop as alive
import check_alive_launch_desktop as launch
from gi.repository import Atspi

ui = alive.ui
report = {'fixture': 'quantized-midi.alive', 'synthetic_ipc': False}


def showing(name):
    try:
        return ui.find(name).get_state_set().contains(Atspi.StateType.SHOWING)
    except StopIteration:
        return False


def wait_showing(name, expected=True, seconds=8):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if showing(name) == expected:
            return
        time.sleep(.08)
    raise AssertionError(f'{name}: showing did not become {expected}')


def number(name):
    return ui.numeric_value(name)


def wait_number(name, expected, seconds=8):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if showing(name) and abs(number(name) - expected) < .00001:
            return
        time.sleep(.08)
    raise AssertionError(f'{name}: expected {expected}, observed {number(name)}')


def settled():
    wait_value('Musical edit status', lambda value: bool(value) and 'Updating' not in value)
    status = accessible_value('Session status')
    assert not any(word in status.lower() for word in ('error:', 'refused', 'stale', 'changed during')), status


def accessible_value(name):
    if name.startswith('Track ') and not ui.wait_for('Audio details').get_state_set().contains(Atspi.StateType.EXPANDED):
        ui.click('Audio details')
    alive.prepare_workspace_control(name)
    node = ui.wait_for(name)
    texts = []
    for item in ui.walk(node):
        if 'Text' in item.get_interfaces():
            count = Atspi.Text.get_character_count(item)
            text = Atspi.Text.get_text(item, 0, count)
            if text.strip():
                texts.append(text)
    return ' '.join(texts) or node.get_description()


def wait_value(name, predicate, seconds=8):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        current = accessible_value(name)
        if predicate(current):
            return current
        time.sleep(.12)
    raise AssertionError(f'{name}: unexpected value {current!r}')


def close_diagnostics():
    if ui.wait_for('Audio details').get_state_set().contains(Atspi.StateType.EXPANDED):
        ui.click('Audio details')


def maximize():
    close_diagnostics()
    if showing('Maximize detail'):
        ui.click('Maximize detail')
    wait_showing('Restore detail size')


def restore():
    if showing('Restore detail size'):
        ui.click('Restore detail size')


def choose_slot(track, slot):
    restore()
    close_diagnostics()
    ui.click('Session workspace')
    ui.click(f'Select {track} slot {slot}')
    ui.click('Clip detail')


def pointer_click(x, y, count=1):
    assert ui.t.XTestFakeMotionEvent(ui.display, 0, round(x), round(y), 0)
    for _ in range(count):
        assert ui.t.XTestFakeButtonEvent(ui.display, 1, 1, 0)
        assert ui.t.XTestFakeButtonEvent(ui.display, 1, 0, 0)
        ui.x.XFlush(ui.display)
        time.sleep(.06)
    time.sleep(.2)


def double_click(name):
    node = ui.wait_for(name)
    Atspi.Component.grab_focus(node)
    rect = Atspi.Component.get_extents(node, Atspi.CoordType.SCREEN)
    pointer_click(rect.x + rect.width / 2, rect.y + rect.height / 2, 2)


def drag(sx, sy, ex, ey):
    assert ui.t.XTestFakeMotionEvent(ui.display, 0, round(sx), round(sy), 0)
    assert ui.t.XTestFakeButtonEvent(ui.display, 1, 1, 0)
    ui.x.XFlush(ui.display)
    for step in range(1, 13):
        assert ui.t.XTestFakeMotionEvent(ui.display, 0, round(sx + (ex - sx) * step / 12),
                                       round(sy + (ey - sy) * step / 12), 0)
        ui.x.XFlush(ui.display)
        time.sleep(.025)
    assert ui.t.XTestFakeButtonEvent(ui.display, 1, 0, 0)
    ui.x.XFlush(ui.display)
    time.sleep(.2)


def clip_geometry(audio=False):
    node = ui.wait_for('Selected audio clip waveform' if audio else 'Selected clip piano roll')
    rect = Atspi.Component.get_extents(node, Atspi.CoordType.SCREEN)
    assert rect.width > 200 and rect.height >= 150, (rect.width, rect.height)
    return rect


def select_clip_loop(start, end, length=8, audio=False):
    maximize()
    rect = clip_geometry(audio)
    pad, extent = (16, math.ceil(length / 4) * 4 + 4) if audio else (48, length)
    x = lambda beat: rect.x + pad + (rect.width - pad) * beat / extent
    drag(x(start), rect.y + rect.height - 14, x(end), rect.y + rect.height - 14)
    ui.keys('Control_L', 'l')
    wait_number('Clip Start', start)
    wait_number('Loop Position', start)
    wait_number('Loop Length', end - start)
    settled()


def start_marker(from_beat, to_beat, length=8):
    rect = clip_geometry()
    x = lambda beat: rect.x + 48 + (rect.width - 48) * beat / length + 2
    drag(x(from_beat), rect.y + 39, x(to_beat), rect.y + 39)
    wait_number('Clip Start', to_beat)
    settled()


def make_wav():
    path = (ui.output / 'RangeTone.wav').resolve()
    samples = array.array('h')
    for frame in range(48000 * 4):
        samples.extend((round(9000 * math.sin(2 * math.pi * 330 * frame / 48000)),
                        round(7500 * math.sin(2 * math.pi * 550 * frame / 48000))))
    import sys
    if sys.byteorder != 'little':
        samples.byteswap()
    with wave.open(str(path), 'wb') as stream:
        stream.setnchannels(2)
        stream.setsampwidth(2)
        stream.setframerate(48000)
        stream.writeframes(samples.tobytes())
    return path


def import_wav(path):
    double_click('Select Audio 2 slot 1')
    time.sleep(.4)
    alive.focus_chooser('Import Audio Clip')
    pointer_click(450, 250)
    alive.location_entry()
    ui.text('Native filename entry', str(path))
    ui.click('Open')
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        if not any(frame.get_name() == 'Import Audio Clip' and
                   frame.get_state_set().contains(Atspi.StateType.SHOWING)
                   for frame in alive.windows.app_frames()):
            break
        time.sleep(.1)
    else:
        raise AssertionError('WAV import chooser did not finish')
    alive.windows.focus('Alive')
    maximize()
    wait_number('Clip End', 8)
    settled()


def tone_energy(samples, frequency):
    energy = sum(value * value for value in samples)
    assert energy > 1e-6
    real = sum(value * math.cos(2 * math.pi * frequency * i / 48000)
               for i, value in enumerate(samples))
    imag = sum(value * math.sin(2 * math.pi * frequency * i / 48000)
               for i, value in enumerate(samples))
    return 2 * (real * real + imag * imag) / (len(samples) * energy)


def capture_audio(name='regions-audio', left_frequency=330, right_frequency=550):
    capture = alive.start_capture(name)
    time.sleep(1.3)
    measured = alive.finish_capture(capture)
    assert measured['peak'] > .03 and measured['frames'] > 48000, measured
    samples = array.array('f')
    samples.frombytes(capture[1].read_bytes())
    tail = samples[-48000 * 2:]
    measured['left_frequency'] = left_frequency
    measured['right_frequency'] = right_frequency
    measured['left_tone_fraction'] = tone_energy(tail[::2], left_frequency)
    measured['right_tone_fraction'] = tone_energy(tail[1::2], right_frequency)
    assert measured['left_tone_fraction'] > .8, measured
    assert measured['right_tone_fraction'] > .8, measured
    return measured


def run():
    initial = alive.file_score(json.loads((ui.output / 'initial.alive').read_text()))
    assert len(initial['tracks']) == 1 and initial['tracks'][0]['name'] == 'Pulse'
    original_source = initial['sources'][0]
    alive.windows.focus('Alive')
    ui.wait_for('Insert Audio Track')
    choose_slot('Pulse', 1)
    ui.click('Alive audio settings')
    ui.click('Save and start Alive audio')
    ui.click('Close audio settings')
    wait_value('Audio callbacks', lambda value: value.isdecimal() and int(value) > 0)
    alive.transport('start')
    before_frame = int(accessible_value('Absolute frame'))
    close_diagnostics()

    ui.click('Select Pulse slot 1')
    ui.keys('Control_L', 't')
    ui.wait_for('Select Audio 2 track')
    settled()
    assert ui.wait_for('Select Audio 2 track').get_state_set().contains(Atspi.StateType.PRESSED)
    ui.keys('Control_L', 'Shift_L', 't')
    ui.wait_for('Select MIDI 3 track')
    settled()
    assert ui.wait_for('Select MIDI 3 track').get_state_set().contains(Atspi.StateType.PRESSED)
    assert not any(frame.get_role_name() == 'file chooser' and
                   frame.get_state_set().contains(Atspi.StateType.SHOWING)
                   for frame in alive.windows.app_frames())
    assert int(accessible_value('Absolute frame')) > before_frame
    wait_value('Transport playing', lambda value: value == 'true')
    report['rolling_typed_tracks'] = True

    choose_slot('MIDI 3', 1)
    double_click('Select MIDI 3 slot 1')
    maximize()
    wait_number('Clip End', 4)
    wait_number('Loop Length', 4)
    choose_slot('MIDI 3', 2)
    ui.keys('Control_L', 'Shift_L', 'm')
    maximize()
    wait_number('Clip End', 4)
    settled()
    ui.click('Undo')
    wait_showing('Clip Start', False)
    settled()
    ui.click('Redo')
    wait_number('Clip End', 4)
    settled()
    report['atomic_one_bar_creation'] = {'double_click': True, 'shortcut': True, 'undo_redo': True}

    choose_slot('Pulse', 1)
    select_clip_loop(2, 6)
    wait_number('Clip End', 8)
    start_marker(2, 0)
    wait_number('Loop Position', 2)
    wait_number('Loop Length', 4)
    ui.click('Undo')
    wait_number('Clip Start', 2)
    ui.click('Redo')
    wait_number('Clip Start', 0)
    alive.screenshot('regions-midi.png')
    report['midi_selection_and_independent_start'] = True

    wav = make_wav()
    choose_slot('Audio 2', 1)
    import_wav(wav)
    select_clip_loop(2, 6, audio=True)
    wait_number('Clip End', 8)
    ui.text('Audio length in beats', '12')
    ui.keys('Tab')
    wait_number('Audio source BPM', 180)
    wait_number('Clip End', 12)
    settled()
    ui.click('Undo')
    wait_number('Audio length in beats', 8)
    settled()
    report['audio_repitch_stretch_undo'] = True
    alive.screenshot('regions-audio.png')
    restore()
    ui.click('Audio 2 solo')
    ui.click('Launch Quantization')
    ui.keys('Home')
    # 1 Bar remains available when an optional fine-grid proof is unavailable.
    for _ in range(6):
        ui.keys('Down')
    ui.keys('Return')
    launch.effective('1 Bar')
    ui.click('Launch Audio 2 RangeTone')
    wait_value('Track 2 authority', lambda value: value == 'session')
    wait_value('Track 2 active source', lambda value: value not in ('', '-', 'none', 'None'))
    report['audio_pcm'] = capture_audio()
    close_diagnostics()
    maximize()
    ui.text('Audio length in beats', '12')
    ui.keys('Tab')
    wait_number('Audio source BPM', 180)
    settled()
    restore()
    ui.click('Launch Audio 2 RangeTone')
    time.sleep(2.2)
    report['stretched_audio_pcm'] = capture_audio('regions-stretched-audio', 220, 550 * 2 / 3)
    close_diagnostics()
    ui.click('Undo')
    wait_number('Audio length in beats', 8)
    settled()
    wait_value('Transport playing', lambda value: value == 'true')
    close_diagnostics()

    ui.click('Arrangement workspace')
    lane = Atspi.Component.get_extents(ui.wait_for('Pulse timeline lane'), Atspi.CoordType.SCREEN)
    drag(lane.x + 9 * 48, lane.y + 45, lane.x + 13 * 48, lane.y + 45)
    ui.keys('Control_L', 'l')
    wait_number('Song loop start', 9)
    wait_number('Song loop end', 13)
    settled()
    ui.click('Undo')
    wait_number('Song loop start', initial['loopStartBeats'])
    ui.click('Redo')
    wait_number('Song loop start', 9)
    # Restore keyboard focus to the owned timeline after history buttons.
    Atspi.Component.grab_focus(ui.wait_for('Arrangement timeline'))
    ui.keys('Control_L', 'Shift_L', 'm')
    settled()
    report['arrangement_selection_loop_and_clip'] = True
    alive.screenshot('regions-arrangement.png')

    alive.transport('stop')
    wait_value('Audio stream errors', lambda value: value == '0')
    wait_value('Rejected commands', lambda value: value == '0')
    close_diagnostics()
    saved = (ui.output / 'live-regions-saved.alive').resolve()
    alive.choose_file('Save session as', 'Save Alive Session', saved)
    score = alive.file_score(json.loads(saved.read_text()))
    assert [track['name'] for track in score['tracks']] == ['Pulse', 'Audio 2', 'MIDI 3']
    midi = score['tracks'][2]
    assert midi['chain'] == {'kind': 'midi', 'instrument': None}
    assert all(slot and slot['region']['end'] == 4 for slot in midi['slots'][:2])
    assert score['loopStartBeats'] == 9 and score['loopEndBeats'] == 13
    pulse = score['tracks'][0]['slots'][0]
    assert pulse['region'] == {'start': 0, 'end': 8, 'loopStart': 2, 'loopEnd': 6, 'loopEnabled': True}
    source = next(source for source in score['sources'] if source['id'] == original_source['id'])
    assert source['notes'] == original_source['notes'], 'Loop editing cropped or changed original notes'
    audio_slot = score['tracks'][1]['slots'][0]
    assert audio_slot['region'] == {'start': 2, 'end': 8, 'loopStart': 2, 'loopEnd': 6, 'loopEnabled': True}
    audio_source = next(source for source in score['sources'] if source['id'] == audio_slot['sourceId'])
    assert audio_source['kind'] == 'audio' and audio_source['warpMode'] == 'repitch'
    assert audio_source['file']['frames'] == '192000'
    assert any(p['start'] == 9 and p['duration'] == 4 and p['trackId'] == score['tracks'][0]['id'] for p in score['placements'])
    alive.choose_file('Open session', 'Open Alive Session', saved)
    choose_slot('Pulse', 1)
    maximize()
    wait_number('Clip Start', 0)
    wait_number('Loop Position', 2)
    wait_number('Loop Length', 4)
    wait_number('Clip End', 8)
    wait_value('Audio stream errors', lambda value: value == '0')
    report.update(save_reopen=True, source_notes_preserved=True, stream_errors=0,
                  rejected_commands=0, stopped=True)
    (ui.output / 'regions-report.json').write_text(json.dumps(report, indent=2) + '\n')


ui.find = alive.windows.scoped_find
try:
    run()
except Exception:
    alive.screenshot('regions-failure.png')
    (ui.output / 'regions-failure.json').write_text(json.dumps([
        {'name': node.get_name(), 'role': node.get_role_name(),
         'description': node.get_description(),
         'text': Atspi.Text.get_text(node, 0, -1) if 'Text' in node.get_interfaces() else ''}
        for frame in alive.windows.app_frames() for node in ui.walk(frame)
    ], indent=2))
    raise
