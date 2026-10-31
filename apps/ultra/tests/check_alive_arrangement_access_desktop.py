#!/usr/bin/env python3
"""Exercise default/New Arrangement access, editing and save/reopen privately.

Run with ULTRA_TEST_ALIVE_DEFAULT=1 and the isolated desktop harness.
"""
import json

import check_alive_desktop as alive

ui = alive.ui


def run():
    alive.windows.focus('Alive')
    ui.wait_for('Create MIDI source')
    ui.click('Arrangement workspace')
    ui.wait_for('Song loop brace')
    alive.screenshot('default-arrangement.png')
    ui.click('Create MIDI source')
    ui.click('Place source in range')
    ui.click('Add note')
    alive.wait_value('Musical edit status', lambda s: 'Updating' not in s)
    path = ui.output / 'arrangement-saved.alive'
    alive.choose_file('Save session as', 'Save Alive Session', path)
    saved = json.loads(path.read_text())
    assert saved['format'] == 'alive-session-v6'
    score = saved['score']
    assert score['format'] == 'alive-session-v4'
    assert len(score['tracks']) == 1
    assert len(score['sources']) == 1
    assert len(score['sources'][0]['notes']) == 1
    assert len(score['placements']) == 1
    placement = score['placements'][0]['id']
    alive.choose_file('Open session', 'Open Alive Session', path)
    ui.click('Arrangement workspace')
    ui.wait_for('Select placement ' + placement)
    for _ in range(3):
        ui.click('Session workspace')
        ui.click('Arrangement workspace')
        ui.wait_for('Select placement ' + placement)
    alive.screenshot('reopened-arrangement.png')
    ui.click('New session')
    ui.click('Arrangement workspace')
    ui.wait_for('Song loop brace')
    ui.wait_for('Create MIDI source')
    fresh = ui.output / 'new-saved.alive'
    alive.choose_file('Save session as', 'Save Alive Session', fresh)
    score = json.loads(fresh.read_text())['score']
    assert score['format'] == 'alive-session-v4'
    assert score['sources'] == [] and score['placements'] == []
    assert score['tracks'][0]['slots'] == [None] * 4
    (ui.output / 'arrangement-access-report.json').write_text(json.dumps({
        'default_arrangement': True, 'new_arrangement': True,
        'created_source_and_placement': True, 'saved_notes': 1,
        'reopened_placement': placement, 'navigation_preserved_placement': True,
    }, indent=2) + '\n')


if __name__ == '__main__':
    ui.find = alive.windows.scoped_find
    try:
        run()
    except Exception:
        alive.screenshot('arrangement-access-failure.png')
        raise
