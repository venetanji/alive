#!/usr/bin/env python3
"""Actual release clip-bank journey; existing private display/audio/input guards."""
import json
import time
from pathlib import Path
import check_alive_desktop as alive
from gi.repository import Atspi

ui, windows = alive.ui, alive.windows
events = []

_original_click = ui.click
_original_extents = Atspi.Component.get_extents
_click_rectangles = None

def _extents(control, coordinate):
    rect = _original_extents(control, coordinate)
    if _click_rectangles is not None:
        _click_rectangles.append({'name': control.get_name(), 'rect': [rect.x, rect.y, rect.width, rect.height], 'at': time.monotonic()})
    return rect

Atspi.Component.get_extents = _extents

def _diagnostic_click(name):
    global _click_rectangles
    if name != 'Launch Pulse Clip 1':
        return _original_click(name)
    _click_rectangles = []
    _original_click(name)
    used = _click_rectangles
    _click_rectangles = None
    rect = _original_extents(ui.wait_for(name), Atspi.CoordType.SCREEN)
    row = {'name': name, 'used': used, 'after_rect': [rect.x, rect.y, rect.width, rect.height],
           'runtime_after': alive.value('Pulse clip runtime'), 'at': time.monotonic()}
    (ui.output / 'launch-click-diagnostic.json').write_text(json.dumps(row, indent=2))

ui.click = _diagnostic_click



def observed(label):
    value = alive.value(label)
    events.append({'label': label, 'value': value, 'monotonic': time.monotonic()})
    (ui.output / 'clip-observations.json').write_text(json.dumps(events, indent=2))
    return value


def editor_exists():
    return any(w.get_name() == 'Pulse - Ultra Hosted Editor' and
               w.get_state_set().contains(Atspi.StateType.SHOWING) for w in windows.app_frames())


def saved(name):
    path = ui.output / name
    alive.choose_file('Save session as', 'Save Alive Session', path)
    return path, json.loads(path.read_text())


def run():
    windows.focus(alive.MAIN)
    ui.wait_for('Select Pulse slot 4')
    alive.screenshot('clips-initial.png')
    # New exercises the accepted dirty guard for an in-memory legacy upgrade.
    ui.click('New session')
    windows.focus('Unsaved Alive Session'); ui.click('Discard'); windows.focus(alive.MAIN)
    initial_path, initial = saved('initial-v3.alive')
    assert initial['format'] == 'alive-session-v3'
    shared = ui.output / 'shared-utility.ultra'
    original = Path('apps/ultra/examples/utility.ultra').read_bytes()
    shared.write_bytes(original)
    for track in ('Pulse', 'Harmony'):
        ui.click(f'Select {track} slot 1')
        alive.choose_file('Add effect', 'Load Ultra Device', shared)
    ui.click('Select Pulse slot 1')
    ui.click('Select Pulse Stereo Utility effect 1')
    ui.click('Edit selected device in Ultra')
    windows.focus('Pulse - Ultra Hosted Editor'); alive.numeric('Hosted Gain base', .65)
    windows.focus(alive.MAIN)
    ui.click('Duplicate clip')
    alive.numeric('Note 1 pitch', 61)
    ui.click('Undo pending edit'); assert alive.value('Note 1 pitch') == '60'
    ui.click('Redo pending edit'); assert alive.value('Note 1 pitch') == '61'
    alive.numeric('Selected clip length', .25)
    alive.wait_value('Session status', lambda s: 'truncate' in s)
    assert float(alive.value('Selected clip length')) == 8
    ui.click('Select Pulse slot 1'); ui.click('Select Pulse slot 2')
    assert float(alive.value('Selected clip length')) == 8
    assert editor_exists()
    ui.click('Select Pulse slot 3'); ui.click('Create clip'); ui.click('Add note')
    assert alive.value('Note 1 velocity') == '100'
    ui.click('Delete clip'); ui.click('Undo pending edit')
    ui.click('Select Pulse slot 2'); ui.click('Set Saved Default')
    assert editor_exists()
    ui.click('Prepare / Apply'); time.sleep(.4)
    assert not editor_exists(), 'Apply retains the existing generation/editor boundary'
    path, bank = saved('clips-prepared.alive')
    track = bank['tracks'][0]
    assert track['slots'][0]['notes'][0]['pitch'] == 60
    assert track['slots'][1]['notes'][0]['pitch'] == 61
    assert track['slots'][0]['notes'][0]['id'] != track['slots'][1]['notes'][0]['id']
    assert track['defaultClipId'] == track['slots'][1]['id']
    assert track['effects'][0]['parameters']['gain'] == .65
    settings = alive.check_audio_settings()
    assert alive.value('Audio buffer frames') == '512'
    # Stopped transport + live audio accepts a cue without starting transport.
    ui.click('Launch Pulse Clip 1')
    alive.wait_value('Pulse clip runtime', lambda s: 'Cued Clip 1 /' in s and 'applied' in s)
    observed('Pulse clip runtime'); assert alive.value('Transport playing') == 'false'
    alive.transport('start')
    capture = alive.start_capture('clips-rendered')
    ui.click('Launch Pulse Clip 1 copy')
    alive.wait_value('Pulse clip runtime', lambda s: 'pending launch' in s)
    observed('Pulse clip runtime')
    alive.wait_value('Pulse clip runtime', lambda s: 'Playing Clip 1 copy' in s and 'applied' in s)
    observed('Pulse clip runtime'); observed('Harmony clip runtime')
    ui.click('Select Pulse Stereo Utility effect 1'); ui.click('Edit selected device in Ultra')
    windows.focus('Pulse - Ultra Hosted Editor'); alive.numeric('Hosted Gain base', .55); windows.focus(alive.MAIN)
    ui.click('Bypass Pulse Stereo Utility effect 1')
    ui.click('Select Pulse slot 1'); alive.numeric('Note 1 velocity', 82); ui.click('Undo pending edit')
    assert editor_exists()
    ui.click('Stop Pulse track')
    alive.wait_value('Pulse clip runtime', lambda s: s.startswith('Stopped') and 'applied' in s)
    observed('Pulse clip runtime'); assert observed('Harmony clip runtime').startswith('Playing')
    assert editor_exists()
    alive.transport('stop'); assert editor_exists()
    audio = alive.finish_capture(capture); assert audio['peak'] > .0001
    moved = ui.output / 'moved'; moved.mkdir()
    relocated_path, relocated = saved('moved/relocated.alive')
    assert editor_exists()
    assert relocated['tracks'][0]['slots'] == bank['tracks'][0]['slots']
    alive.screenshot('clips-stopped-saved.png')
    alive.choose_file('Open session', 'Open Alive Session', relocated_path)
    assert not editor_exists()
    assert alive.value('Transport playing') == 'false'
    assert 'Cued Clip 1 copy' in observed('Pulse clip runtime')
    ui.click('Select Pulse slot 1'); ui.click('Select Pulse Stereo Utility effect 1')
    ui.click('Edit selected device in Ultra')
    windows.focus('Pulse - Ultra Hosted Editor'); ui.wait_for('Hosted Gain base'); windows.focus(alive.MAIN)
    # An external shared-source edit blocks either selected replacement atomically.
    changed = json.loads(original); changed['nodes'][0]['x'] += 1
    shared.write_text(json.dumps(changed))
    errors = []
    for name in ('Pulse', 'Harmony'):
        ui.click(f'Select {name} slot 1')
        alive.choose_file(f'Replace {name} Stereo Utility effect 1', 'Load Ultra Device', shared)
        text = alive.wait_value('Session status', lambda s: 'matching original backup' in s)
        assert ('Harmony' if name == 'Pulse' else 'Pulse') in text
        errors.append(text)
        assert editor_exists()
    changed_path = ui.output / 'preserved-changed.ultra'; changed_path.write_bytes(shared.read_bytes())
    shared.write_bytes(original)
    recovery = []
    for name in ('Pulse', 'Harmony'):
        ui.click(f'Select {name} slot 1')
        alive.choose_file(f'Replace {name} Stereo Utility effect 1', 'Load Ultra Device', changed_path)
        assert not editor_exists()
        _, record = saved(f'recovered-{name}.alive'); recovery.append(record)
    assert recovery[0]['tracks'][1]['effects'][0]['instanceId'] == relocated['tracks'][1]['effects'][0]['instanceId']
    assert recovery[0]['tracks'][1]['effects'][0]['sourceSha256'] == relocated['tracks'][1]['effects'][0]['sourceSha256']
    assert recovery[1]['tracks'][0]['effects'][0]['instanceId'] == recovery[0]['tracks'][0]['effects'][0]['instanceId']
    report = {'kind': 'actual standalone release Alive; private Xvfb and software PipeWire',
              'physical_audio': False, 'settings': settings, 'observed_buffer': 512,
              'audio': audio, 'native_observations': events, 'shared_source_errors': errors,
              'initial': str(initial_path), 'saved': str(relocated_path),
              'draft_editor_continuity': True, 'apply_editor_boundary': True,
              'reopen_stopped_default': True, 'sequential_shared_source_recovery': True,
              'failed_shared_replace_editor_continuity': True,
              'native_inputs': alive.native_inputs, 'final_audio': alive.detail()}
    (ui.output / 'native-clips-report.json').write_text(json.dumps(report, indent=2))
    alive.screenshot('clips-recovered.png')
    ui.click('Quit Alive')
    print(json.dumps(report, indent=2), flush=True)


if __name__ == '__main__':
    try:
        run()
    except Exception:
        alive.screenshot('clips-failure.png')
        raise
