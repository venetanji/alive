#!/usr/bin/env python3
"""Real-GTK chooser and owned card reorder/focus/scroll input regression.

The foreign-window fixture checks blocked input independently of contextual
Help. Floating device-path tooltips are no longer part of the product UI.

Run through check_canvas_desktop.sh with ULTRA_TEST_ALIVE=1 and this script
as ULTRA_TEST_SCRIPT. A process-local G_DEBUG=fatal-criticals launcher can
add the GTK realization assertion gate without changing the desktop session.
"""
import ctypes as C
import json
import os
from pathlib import Path
import time

import check_alive_desktop as alive
from gi.repository import Atspi

ui = alive.ui
windows = alive.windows


def save_session(name):
    path = ui.output / name
    alive.choose_file('Save session as', 'Save Alive Session', path)
    alive.wait_value('Session status', lambda text: text == 'Session saved.')
    session = json.loads(path.read_text())
    alive.file_score(session)
    return session


def save_chain(name):
    return alive.file_score(save_session(name))['tracks'][0]['effects']


def add_effect(path, expected_status):
    alive.choose_file('Add effect', 'Load Ultra Device', path)
    return alive.wait_value('Session status', lambda text: text == expected_status)


def chooser_slash_entries(start, scopes):
    entries = [row for row in alive.native_inputs[start:] if row['action'] == 'slash location entry']
    assert [row['scope'] for row in entries] == scopes, 'Chooser slash phase count or scope changed'
    assert all(row['ready_before_release'] and row['released'] for row in entries), 'Chooser slash was not ready or released'
    return entries


def blocked_reorder(name):
    """Cover only this private display with a harness-owned native window."""
    assert os.environ.get('ULTRA_TEST_PRIVATE_SESSION') == '1'
    assert windows.scope == alive.MAIN
    alive.prepare_workspace_control(name)
    Atspi.Component.grab_focus(ui.wait_for(name))
    owner = alive.owned_frame_window()
    root = ui.Gdk.get_default_root_window()
    native = ui.x
    native.XCreateSimpleWindow.argtypes = [C.c_void_p, C.c_ulong, C.c_int, C.c_int,
        C.c_uint, C.c_uint, C.c_uint, C.c_ulong, C.c_ulong]
    native.XCreateSimpleWindow.restype = C.c_ulong
    native.XMapRaised.argtypes = native.XDestroyWindow.argtypes = [C.c_void_p, C.c_ulong]
    native.XSync.argtypes = [C.c_void_p, C.c_int]
    foreign = native.XCreateSimpleWindow(ui.display, native.XDefaultRootWindow(ui.display),
        0, 0, root.get_width(), root.get_height(), 0, 0, 0)
    assert foreign and foreign != owner
    button_events = []
    original_button = ui.t.XTestFakeButtonEvent
    def observed_button(*args):
        button_events.append({'button': args[1], 'pressed': bool(args[2])})
        return original_button(*args)
    try:
        native.XMapRaised(ui.display, foreign)
        native.XSync(ui.display, 0)
        rect, point = alive.reorder_point(ui.wait_for(name))
        path = alive.native_hit_path(*point)
        assert foreign in path and owner not in path, path
        cover = alive.input_record('foreign reorder cover', name=name, owner=owner,
            foreign_window=foreign, rect=rect, hit_path=path)
        ui.t.XTestFakeButtonEvent = observed_button
        before = len(alive.native_inputs)
        try:
            alive.reorder_click(name)
        except AssertionError as error:
            assert str(error) == 'Native reorder target remains occluded or unavailable: ' + name, str(error)
        else:
            raise AssertionError('Native reorder admitted a foreign covering window')
        assert len(alive.native_inputs) == before + 1
        blocked = alive.native_inputs[-1]
        assert blocked['action'] == 'reorder blocked' and blocked['owner'] == owner
        assert blocked['presses'] == blocked['releases'] == 0 and not button_events
        assert all(foreign in sample['hit_path'] and owner not in sample['hit_path']
                   for sample in blocked['samples']), blocked
    finally:
        ui.t.XTestFakeButtonEvent = original_button
        native.XDestroyWindow(ui.display, foreign)
        native.XSync(ui.display, 0)
    return {'foreign_window': foreign, 'cover': cover, 'blocked': blocked,
            'button_events': button_events, 'destroyed': True}


def run():
    windows.focus(alive.MAIN)
    ui.wait_for('Start transport')
    ui.click('Audio details')
    assert alive.value('Transport playing') == 'false'
    initial_rejected = int(alive.value('Rejected commands'))
    assert initial_rejected == 0, 'Initial rejected command count must be zero'
    ui.click('Audio details')
    alive.select_clip('Pulse')
    initial = json.loads((ui.output / 'initial.alive').read_text())
    initial_score = alive.file_score(initial)
    assert len(initial_score['tracks']) == 2 and all(not track['effects'] for track in initial_score['tracks'])
    for filename in ('utility.ultra', 'stereo-lowpass.ultra'):
        source = ui.output / filename
        source.write_bytes((Path('apps/ultra/examples') / filename).read_bytes())

    # Keep the original complete workload as a rejection case before the chain audit.
    slash_start = len(alive.native_inputs)
    utility_status = add_effect(ui.output / 'utility.ultra', 'Device chain updated.')
    negative_before = save_session('input-negative-before.alive')
    negative_score = alive.file_score(negative_before)
    assert (len(negative_score['tracks'][0]['effects']) == 1 and
            negative_score['tracks'][0]['effects'][0]['id'] == 'org.alive.utility' and
            not negative_score['tracks'][1]['effects']), 'Original Utility addition did not install exactly one effect'
    assert negative_score['sources'] == initial_score['sources'] and negative_score['placements'] == initial_score['placements']
    expected_refusal = ('Workspace playback refused the complete candidate: Complete MIDI envelope exceeds bounded '
        'preparation policy. (resource 2, observed 20, limit 18). Reduce simultaneous music or simplify chains.')
    refusal = add_effect(ui.output / 'stereo-lowpass.ultra', expected_refusal)
    ui.click('Audio details')
    refused_rejected = int(alive.value('Rejected commands'))
    assert refused_rejected == initial_rejected + 1, 'Expected exactly one rejected command for original refusal'
    ui.click('Audio details')
    negative_after = save_session('input-negative-after.alive')
    assert negative_after == negative_before, 'Rejected addition changed the saved session'
    slash_phases = {'original_admission': chooser_slash_entries(slash_start, ['Load Ultra Device'] * 2)}
    original_admission = {'utility_status': utility_status, 'refusal': refusal,
        'rejected_commands_before': initial_rejected, 'rejected_commands_after': refused_rejected,
        'expected_rejection_delta': 1,
        'saved_before': 'input-negative-before.alive', 'saved_after': 'input-negative-after.alive',
        'unchanged_saved_state': True, 'track_ids': [track['id'] for track in negative_score['tracks']],
        'note_counts': [len(source.get('notes', [])) for source in negative_score['sources']]}
    admission_report = {'contract': 'owned-card-reorder-admission-v2', 'original_admission': original_admission}
    (ui.output / 'input-admission-report.json').write_text(json.dumps(admission_report, indent=2))

    # Match the existing full desktop chain-audit fixture; both effects still use real Add.
    fixture = alive.bounded_core_fixture(initial)
    fixture_score = alive.file_score(fixture)
    fixture_score['tracks'] = fixture_score['tracks'][:1]
    track_id = fixture_score['tracks'][0]['id']
    fixture_score['sources'] = [source for source in fixture_score['sources'] if source['trackId'] == track_id]
    fixture_score['placements'] = [placement for placement in fixture_score['placements'] if placement['trackId'] == track_id]
    fixture['launch']['clipQuantization'] = []
    fixture_path = ui.output / 'input-chain-audit.alive'
    fixture_path.write_text(json.dumps(fixture, indent=2))
    positive_fixture = {'path': fixture_path.name,
        'derivation': 'bounded_core_fixture(initial.alive), first track and its sources/placements',
        'track_ids': [track_id], 'source_ids': [source['id'] for source in fixture_score['sources']],
        'placement_ids': [placement['id'] for placement in fixture_score['placements']],
        'instrument_count': 1, 'effects_before_add': 0,
        'note_counts': [len(source.get('notes', [])) for source in fixture_score['sources']]}
    admission_report['positive_fixture'] = positive_fixture
    (ui.output / 'input-admission-report.json').write_text(json.dumps(admission_report, indent=2))
    slash_start = len(alive.native_inputs)
    alive.choose_file('Open session', 'Open Alive Session', fixture_path)
    alive.wait_value('Session status', lambda text: text == 'Session ready.')
    slash_phases['positive_fixture_open'] = chooser_slash_entries(slash_start, ['Open Alive Session'])
    slash_start = len(alive.native_inputs)
    add_effect(ui.output / 'utility.ultra', 'Device chain updated.')
    positive_utility = save_chain('input-positive-utility.alive')
    assert len(positive_utility) == 1 and positive_utility[0]['id'] == 'org.alive.utility', 'Positive Utility addition was not installed'
    add_effect(ui.output / 'stereo-lowpass.ultra', 'Device chain updated.')
    before = save_chain('input-before.alive')
    assert len(before) == 2 and len({effect['instanceId'] for effect in before}) == 2, 'Two positive effect additions were not installed'
    slash_phases['positive_additions'] = chooser_slash_entries(slash_start, ['Load Ultra Device'] * 2)

    later = alive.reorder_click('Move Pulse Stereo Utility effect 1 later')
    ui.wait_for('Select Pulse Stereo Utility effect 2')
    moved = save_chain('input-moved.alive')
    assert [effect['instanceId'] for effect in moved] == [effect['instanceId'] for effect in reversed(before)]
    def reset_scroll():
        assert Atspi.Component.grab_focus(ui.wait_for('Device chain overview'))
        ui.keys('Home')
        return alive.wait_value('Device chain overview', lambda text: float(text) == 0)
    navigation = {'control': 'Device chain overview', 'key': 'Home', 'before_blocked': reset_scroll()}
    blocked = blocked_reorder('Move Pulse Stereo Utility effect 2 earlier')
    navigation['before_restored'] = reset_scroll()
    restored = alive.reorder_click('Move Pulse Stereo Utility effect 2 earlier')
    ui.wait_for('Select Pulse Stereo Lowpass effect 2')
    after = save_chain('input-after.alive')
    assert after == before, 'One Earlier click must restore order and every saved effect field'
    for row in (later, restored):
        assert row['presses'] == row['releases'] == 1
        assert row['owner'] in row['samples'][-1]['hit_path']
        assert alive.hit_path_owns(row['samples'][-1]['accessible_hit'], row['name'])
    slash = [row for row in alive.native_inputs if row['action'] == 'slash location entry']
    assert len(slash) == 5 and all(row['ready_before_release'] and row['released'] for row in slash)
    alive.screenshot('input-restored.png')
    ui.click('Audio details')
    audio = alive.detail()
    assert audio['Audio stream errors'] == '0' and audio['Audio failed'] == 'false', audio
    assert int(audio['Rejected commands']) == refused_rejected, 'Unexpected command rejection after original refusal: ' + repr(audio)
    assert audio['Transport playing'] == 'false', audio
    report = {'contract': 'owned-card-reorder-admission-v2',
              'original_admission': original_admission, 'positive_fixture': positive_fixture,
              'effects_before': before, 'effects_moved': moved, 'effects_after': after,
              'foreign_target_block': blocked, 'chain_navigation': navigation,
              'single_later_click': later, 'single_earlier_click': restored,
              'slash_entries': slash, 'slash_entries_by_phase': slash_phases, 'audio': audio}
    (ui.output / 'native-input-report.json').write_text(json.dumps(report, indent=2))
    ui.click('Quit Alive')
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        try:
            if Path(f'/proc/{ui.pid}/stat').read_text().split(') ', 1)[1].split()[0] == 'Z':
                break
        except FileNotFoundError:
            break
        time.sleep(.1)
    else:
        raise AssertionError('Alive did not quit after saving the restored chain')
    report['quit_exited'] = True
    (ui.output / 'native-input-report.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2), flush=True)


if __name__ == '__main__':
    try:
        run()
    except Exception:
        alive.screenshot('native-input-failure.png')
        raise
