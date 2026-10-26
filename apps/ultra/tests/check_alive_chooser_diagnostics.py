#!/usr/bin/env python3
"""Check native Replace receipts and failed chooser evidence in the private harness.

Run with ULTRA_TEST_ALIVE=1 and this file as ULTRA_TEST_SCRIPT through
check_canvas_desktop.sh. The deliberately absent title must still fail the
original chooser assertion after its original polling bound.
"""
import json

import check_alive_desktop as alive


def run():
    alive.windows.focus(alive.MAIN)
    alive.ui.wait_for('Start transport')
    alive.choose_file('Replace Pulse device', 'Load Ultra Device', alive.DEVICE)
    before = next(row for row in alive.native_inputs if row['action'] == 'chooser input before')
    queued = next(row for row in alive.native_inputs if row['action'] == 'chooser input queued')
    assert before['name'] == queued['name'] == 'Replace Pulse device'
    assert before['rect'] == queued['rect'] and before['point'] == queued['point']
    assert any(window['title'] == alive.MAIN and window['pid'] == [alive.ui.pid]
               for window in before['windows'])
    assert queued['motions'] == queued['presses'] == queued['releases'] == 1
    title = 'Diagnostic absent chooser'
    try:
        alive.focus_chooser(title)
    except AssertionError as error:
        assert str(error) == 'Native chooser did not become viewable: ' + title
    else:
        raise AssertionError('Missing chooser unexpectedly accepted')
    report = json.loads((alive.ui.output / 'chooser-failure.json').read_text())
    assert report['title'] == title and report['candidates'] == []
    assert any(window['title'] == alive.MAIN and window['map_state'] == 2
               and window['pid'] == [alive.ui.pid] for window in report['root_windows'])
    print('PASS native Replace receipt and unchanged missing-chooser failure evidence')


if __name__ == '__main__':
    run()
