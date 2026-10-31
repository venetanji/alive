#!/usr/bin/env python3
"""Actual release clip-bank journey; existing private display/audio/input guards."""
import json
import time
from pathlib import Path
import check_alive_desktop as alive
from gi.repository import Atspi

ui, windows = alive.ui, alive.windows
events = []


def shared_owner_fixture(document):
    fixture = json.loads(json.dumps(document))
    assert fixture['format'] == 'alive-session-v6'
    score = fixture['score']
    assert score['format'] == 'alive-session-v4'
    harmony = next(track for track in score['tracks'] if track['name'] == 'Harmony')
    removed_id = harmony['chain']['instrument']['instanceId']
    # Pulse supplies audio while both tracks retain a shared Utility owner.
    harmony['chain']['instrument'] = None
    for source in score['sources']:
        if source['trackId'] == harmony['id']:
            source['automation'] = [lane for lane in source['automation']
                                    if lane['instanceId'] != removed_id]
    return fixture



def set_audio_details(expanded):
    control = ui.wait_for('Audio details')
    if control.get_state_set().contains(Atspi.StateType.EXPANDED) != expanded:
        ui.click('Audio details')
    deadline = time.monotonic() + 3
    while time.monotonic() < deadline:
        if ui.wait_for('Audio details').get_state_set().contains(Atspi.StateType.EXPANDED) == expanded:
            return
        time.sleep(.01)
    raise AssertionError('Audio details did not reach the requested disclosure state')


def edit_selected():
    # The diagnostics overlay covers the selected-device Editor button.
    restore = ui.wait_for('Audio details').get_state_set().contains(Atspi.StateType.EXPANDED)
    if restore:
        set_audio_details(False)
    ui.click('Edit selected device in Ultra')
    if restore:
        windows.focus('Pulse - Ultra Hosted Editor')
        windows.focus(alive.MAIN)
        set_audio_details(True)

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
    return path, alive.file_score(json.loads(path.read_text()))


def launch_at_observable_phase(name):
    """Leave most of the next native bar for the original pending observation."""
    position = ui.wait_for('Transport position beats')
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        beat = float(Atspi.Text.get_text(position, 0, -1).split()[0])
        if .15 <= beat % 4 <= 1:
            ui.click(name)
            return beat
        time.sleep(.01)
    raise AssertionError('Transport did not reach an early bar phase for pending observation')


def run():
    windows.focus(alive.MAIN)
    ui.wait_for('Select Pulse slot 4')
    alive.screenshot('clips-initial.png')
    initial_path, initial = saved('initial-v4.alive')
    assert initial['format'] == 'alive-session-v4'
    fixture_path = ui.output / 'shared-owner.alive'
    fixture_path.write_text(json.dumps(shared_owner_fixture(json.loads(initial_path.read_text())), indent=2) + '\n')
    alive.choose_file('Open session', 'Open Alive Session', fixture_path)
    shared = ui.output / 'shared-utility.ultra'
    original = Path('apps/ultra/examples/utility.ultra').read_bytes()
    shared.write_bytes(original)
    for track in ('Pulse', 'Harmony'):
        ui.click(f'Select {track} slot 1')
        alive.choose_file('Add effect', 'Load Ultra Device', shared)
    ui.click('Select Pulse slot 1')
    ui.click('Select Pulse Stereo Utility effect 1')
    edit_selected()
    windows.focus('Pulse - Ultra Hosted Editor'); alive.numeric('Hosted Gain base', .65)
    windows.focus(alive.MAIN)
    ui.click('Duplicate clip')
    ui.click('Select Pulse slot 2')
    ui.text('Clip name', 'Clip 1 copy'); ui.keys('Tab')
    _, duplicated = saved('clips-shared-source.alive')
    assert duplicated['tracks'][0]['slots'][0]['sourceId'] == duplicated['tracks'][0]['slots'][1]['sourceId']
    ui.click('Make source independent')
    alive.numeric('Note 1 pitch', 61)
    ui.click('Undo'); alive.wait_value('Note 1 pitch', lambda value: value == '60')
    ui.click('Redo'); alive.wait_value('Note 1 pitch', lambda value: value == '61')
    alive.numeric('Loop Length', 4)
    alive.numeric('Loop Position', 2)
    alive.numeric('Clip Start', 1)
    alive.settled()
    assert editor_exists(), 'Immediate musical edits must retain the independent hosted editor'
    ui.click('Select Pulse slot 1'); assert alive.value('Note 1 pitch') == '60'
    assert float(alive.value('Clip Start')) == 0
    ui.click('Select Pulse slot 3'); ui.click('Create clip'); ui.click('Add note')
    assert alive.value('Note 1 velocity') == '100'
    ui.click('Delete clip'); ui.click('Undo')
    ui.click('Select Pulse slot 2')
    assert float(alive.value('Clip Start')) == 1
    assert float(alive.value('Loop Position')) == 2
    assert float(alive.value('Loop Length')) == 4
    path, bank = saved('clips-current.alive')
    track = bank['tracks'][0]
    first = alive.source_score(bank, track)
    independent = alive.source_score(bank, track, 1)
    assert first['notes'][0]['pitch'] == 60
    assert independent['notes'][0]['pitch'] == 61
    assert track['slots'][0]['sourceId'] != track['slots'][1]['sourceId']
    assert track['slots'][0]['region']['start'] == 0
    assert track['slots'][1]['region'] == {'start': 1, 'end': 8, 'loopStart': 2, 'loopEnd': 6, 'loopEnabled': True}
    assert track['effects'][0]['parameters']['gain'] == .65
    settings = alive.check_audio_settings()
    assert alive.value('Audio buffer frames') == '512'
    # A stopped cue changes Session authority without starting transport.
    alive.reorder_click('Launch Pulse Clip 1')
    alive.wait_value('Pulse clip runtime', lambda s: 'Cued Clip 1 /' in s and 'applied' in s)
    observed('Pulse clip runtime'); assert alive.value('Transport playing') == 'false'
    capture = alive.start_capture('clips-rendered')
    alive.transport('start')
    launch_at_observable_phase('Launch Pulse Clip 1 copy')
    alive.wait_value('Pulse clip runtime', lambda s: 'pending launch' in s)
    observed('Pulse clip runtime')
    alive.wait_value('Pulse clip runtime', lambda s: 'Playing Clip 1 copy' in s and 'applied' in s)
    observed('Pulse clip runtime'); observed('Harmony clip runtime')
    ui.click('Select Pulse Stereo Utility effect 1'); edit_selected()
    windows.focus('Pulse - Ultra Hosted Editor'); alive.numeric('Hosted Gain base', .55); windows.focus(alive.MAIN)
    ui.click('Bypass Pulse Stereo Utility effect 1')
    ui.click('Select Pulse slot 1'); alive.numeric('Note 1 velocity', 82); ui.click('Undo')
    assert editor_exists()
    ui.click('Stop Pulse track')
    alive.wait_value('Pulse clip runtime', lambda s: 'Session silence' in s and 'applied' in s)
    observed('Pulse clip runtime'); assert 'Playing' in observed('Harmony clip runtime')
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
    assert 'Arrangement' in observed('Pulse clip runtime')
    ui.click('Select Pulse slot 1'); ui.click('Select Pulse Stereo Utility effect 1')
    edit_selected()
    windows.focus('Pulse - Ultra Hosted Editor'); ui.wait_for('Hosted Gain base'); windows.focus(alive.MAIN)
    # A shared external input must validate for every owner before replacement.
    changed = json.loads(original); changed['nodes'][0]['x'] += 1
    shared.write_text(json.dumps(changed))
    errors = []
    for name in ('Pulse', 'Harmony'):
        ui.click(f'Select {name} slot 1')
        alive.choose_file(f'Replace {name} Stereo Utility effect 1', 'Load Ultra Device', shared)
        status = alive.wait_value('Session status', lambda s: 'matching original backup' in s)
        assert ('Harmony' if name == 'Pulse' else 'Pulse') in status
        errors.append(status)
        assert editor_exists()
    changed_path = ui.output / 'preserved-changed.ultra'; changed_path.write_bytes(shared.read_bytes())
    shared.write_bytes(original)
    recovery = []
    for name in ('Pulse', 'Harmony'):
        ui.click(f'Select {name} slot 1')
        alive.choose_file(f'Replace {name} Stereo Utility effect 1', 'Load Ultra Device', changed_path)
        assert not editor_exists()
        _, document = saved(f'recovered-{name}.alive'); recovery.append(document)
    assert recovery[0]['tracks'][1]['effects'][0]['instanceId'] == relocated['tracks'][1]['effects'][0]['instanceId']
    assert recovery[0]['tracks'][1]['effects'][0]['sourceSha256'] == relocated['tracks'][1]['effects'][0]['sourceSha256']
    assert recovery[1]['tracks'][0]['effects'][0]['instanceId'] == recovery[0]['tracks'][0]['effects'][0]['instanceId']
    report = {'kind': 'actual standalone release Alive; private Xvfb and software PipeWire',
              'physical_audio': False, 'settings': settings, 'observed_buffer': 512,
              'audio': audio, 'native_observations': events, 'shared_source_errors': errors,
              'initial': str(initial_path), 'fixture': str(fixture_path), 'saved': str(relocated_path),
              'immediate_edit_editor_continuity': True, 'independent_source_and_region': True,
              'reopen_stopped_arrangement': True, 'sequential_shared_source_recovery': True,
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
