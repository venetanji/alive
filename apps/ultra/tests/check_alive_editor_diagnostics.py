#!/usr/bin/env python3
"""Verify first track-editor receipts through the original private native input.

Run through check_canvas_desktop.sh with ULTRA_TEST_ALIVE=1. Set
ALIVE_TEST_EDITOR_OBSERVATION_ERROR=1 to exercise observer failure isolation.
ALIVE_TEST_EDITOR_FOCUS_FAILURE=1 searches a deliberately absent title to
verify that recording still propagates the original native focus assertion.
"""
import json
import os
from pathlib import Path
import time

import check_alive_desktop as alive


def run():
    ui, windows = alive.ui, alive.windows
    windows.focus(alive.MAIN)
    ui.wait_for('Start transport')
    summary = next(item for item in ui.walk(ui.wait_for('Pulse track'))
                   if item.get_name() == 'Device / track')
    assert not summary.get_state_set().contains(alive.Atspi.StateType.EXPANDED)
    alive.transport('start')
    original_hit = alive.native_hit_path
    original_focus = windows.focus
    observation_error = os.environ.get('ALIVE_TEST_EDITOR_OBSERVATION_ERROR') == '1'
    focus_failure = os.environ.get('ALIVE_TEST_EDITOR_FOCUS_FAILURE') == '1'
    absent_title = 'Diagnostic absent hosted editor'
    if focus_failure:
        def absent_focus(title):
            return original_focus(absent_title if title == 'Pulse - Ultra Hosted Editor' else title)
        windows.focus = absent_focus
    if observation_error:
        def unavailable_hit(*point):
            raise LookupError('Deliberately unavailable editor observation')
        alive.native_hit_path = unavailable_hit
    try:
        try:
            alive.editor_edit()
        except AssertionError as error:
            assert focus_failure and str(error) == 'Native window did not open: ' + absent_title
            assert windows.scope == absent_title
        else:
            assert not focus_failure, 'The original missing-window assertion was swallowed'
    finally:
        alive.native_hit_path = original_hit
        windows.focus = original_focus
    rows = [row for row in alive.native_inputs if row['action'].startswith('editor ')]
    assert [row['action'] for row in rows] == [
        'editor input before', 'editor input queued', 'editor window result'], rows
    before, queued, result = rows
    assert before['name'] == queued['name'] == 'Open Pulse editor'
    assert before['rect'] == queued['rect'] and before['point'] == queued['point']
    assert queued['motions'] == queued['presses'] == queued['releases'] == 1
    if observation_error:
        assert all('Deliberately unavailable editor observation' in row['observation_error']
                   for row in (before, queued)), rows
    else:
        assert not any('observation_error' in row for row in rows), rows
        assert any(window['title'] == alive.MAIN and window['pid'] == [ui.pid]
                   for window in before['windows']), before
        assert len(queued['post_flush_rect']) == 4
    assert result['focused'] is not focus_failure and result['title'] == 'Pulse - Ultra Hosted Editor'
    if focus_failure:
        assert absent_title in result['focus_error']
        windows.focus(alive.MAIN)
    assert any(window['title'] == result['title'] and window['map_state'] == 2
               and window['pid'] == [ui.pid] for window in result['root_windows']), result
    assert all(row['observation_seconds'] >= 0 for row in rows)
    # Repeated diagnostics are bounded without sending another activation.
    alive.observe_editor_input('before', before['name'], alive.Atspi.Component.get_extents(
        ui.wait_for(before['name']), alive.Atspi.CoordType.SCREEN))
    alive.observe_editor_window(True)
    assert [row for row in alive.native_inputs if row['action'].startswith('editor ')] == rows
    alive.transport('stop')
    ui.click('Quit Alive')
    windows.focus('Unsaved Alive Session'); ui.click('Discard')
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        try:
            if Path(f'/proc/{ui.pid}/stat').read_text().split(') ', 1)[1].split()[0] == 'Z':
                break
        except FileNotFoundError:
            break
        time.sleep(.1)
    else:
        raise AssertionError('Alive did not quit after the editor diagnostic')
    (ui.output / 'editor-diagnostic-report.json').write_text(json.dumps({
        'receipts': rows, 'observation_error_exercised': observation_error,
        'original_editor_assertions_passed': not focus_failure,
        'original_missing_window_assertion_propagated': focus_failure,
        'quit_discard_exited': True}, indent=2))
    print('PASS first editor receipts, original success/failure assertion, bounded observer and Quit', flush=True)


if __name__ == '__main__':
    run()
