#!/usr/bin/env python3
"""Focused real-GTK chooser and occluded Alive reorder input regression.

Run through check_canvas_desktop.sh with ULTRA_TEST_ALIVE=1 and this script
as ULTRA_TEST_SCRIPT. A process-local G_DEBUG=fatal-criticals launcher can
add the GTK realization assertion gate without changing the desktop session.
"""
import json
from pathlib import Path
import time

import check_alive_desktop as alive

ui = alive.ui
windows = alive.windows


def save_chain(name):
    path = ui.output / name
    alive.choose_file('Save session as', 'Save Alive Session', path)
    return json.loads(path.read_text())['tracks'][0]['effects']


def run():
    windows.focus(alive.MAIN)
    ui.wait_for('Start transport')
    ui.click('Audio details')
    assert alive.value('Transport playing') == 'false'
    ui.click('Audio details')
    ui.click('Pulse clip')
    for filename in ('utility.ultra', 'stereo-lowpass.ultra'):
        source = ui.output / filename
        source.write_bytes((Path('apps/ultra/examples') / filename).read_bytes())
        alive.choose_file('Add effect', 'Load Ultra Device', source)
    before = save_chain('input-before.alive')
    assert len(before) == 2 and len({effect['instanceId'] for effect in before}) == 2

    alive.reorder_click('Move Pulse Stereo Utility effect 1 later')
    ui.wait_for('Select Pulse Stereo Utility effect 2')
    moved = save_chain('input-moved.alive')
    assert [effect['instanceId'] for effect in moved] == [effect['instanceId'] for effect in reversed(before)]
    covering = alive.force_reorder_tooltip('Move Pulse Stereo Utility effect 2 earlier',
                                          'Move Pulse Stereo Lowpass effect 1 later')
    restored = alive.reorder_click('Move Pulse Stereo Utility effect 2 earlier')
    ui.wait_for('Select Pulse Stereo Lowpass effect 2')
    after = save_chain('input-after.alive')
    assert after == before, 'One Earlier click must restore order and every saved effect field'
    assert restored['presses'] == restored['releases'] == 1
    assert covering['owner'] not in covering['hit_path']
    assert restored['owner'] in restored['samples'][-1]['hit_path']
    slash = [row for row in alive.native_inputs if row['action'] == 'slash location entry']
    assert len(slash) == 2 and all(row['ready_before_release'] and row['released'] for row in slash)
    alive.screenshot('input-restored.png')
    ui.click('Audio details')
    audio = alive.detail()
    assert audio['Audio stream errors'] == '0' and audio['Audio failed'] == 'false', audio
    assert audio['Rejected commands'] == '0' and audio['Transport playing'] == 'false', audio
    report = {'effects_before': before, 'effects_moved': moved, 'effects_after': after,
              'covering_tooltip': covering, 'single_earlier_click': restored,
              'slash_entries': slash, 'audio': audio}
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
