#!/usr/bin/env python3
"""Verify first track-editor receipts through the original private native input.

Run through check_canvas_desktop.sh with ULTRA_TEST_ALIVE=1. Set
ALIVE_TEST_EDITOR_OBSERVATION_ERROR=1 to exercise observer failure isolation.
ALIVE_TEST_EDITOR_FOCUS_FAILURE=1 searches a deliberately absent title to
verify that recording still propagates the original native focus assertion.
ALIVE_TEST_EDITOR_WRITE_ERROR=queued or result fails that receipt's write.
"""
import json
import os
from pathlib import Path
import time

import check_alive_desktop as alive


def check_unavailable_observations():
    original = alive.editor_observation, alive.native_inputs, alive.editor_observation_failures
    try:
        alive.native_inputs, alive.editor_observation_failures = [], []
        for _ in range(5):
            alive.editor_observation = None
            alive.observe_editor_input('before', 'Open Pulse editor', None)
            alive.editor_observation = {}
            alive.observe_editor_window(True)
        assert alive.native_inputs == [], 'Unavailable observations must not invent input or ownership'
        assert len(alive.editor_observation_failures) == 3
        assert all(row['unavailable'] and len(row['error']) <= 512
                   for row in alive.editor_observation_failures)
        # A broken fallback collector must not escape the observation boundary.
        alive.editor_observation_failures = None
        alive.editor_observation = None
        alive.observe_editor_input('before', 'Open Pulse editor', None)
        alive.editor_observation = {}
        alive.observe_editor_window(True)
        assert alive.native_inputs == []
    finally:
        alive.editor_observation, alive.native_inputs, alive.editor_observation_failures = original


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
    original_write = Path.write_text
    observation_error = os.environ.get('ALIVE_TEST_EDITOR_OBSERVATION_ERROR') == '1'
    focus_failure = os.environ.get('ALIVE_TEST_EDITOR_FOCUS_FAILURE') == '1'
    write_error = os.environ.get('ALIVE_TEST_EDITOR_WRITE_ERROR', '')
    failed_writes, focus_errors, focus_calls = [], [], []
    absent_title = 'Diagnostic absent hosted editor'

    def observed_focus(title):
        focus_calls.append(title)
        try:
            return original_focus(absent_title if focus_failure and title == 'Pulse - Ultra Hosted Editor' else title)
        except AssertionError as error:
            focus_errors.append(error)
            raise

    def unavailable_write(path, contents, *args, **kwargs):
        action = {'queued': 'editor input queued', 'result': 'editor window result'}.get(write_error)
        if path == ui.output / 'native-inputs.json' and alive.native_inputs[-1]['action'] == action:
            failed_writes.append(action)
            raise OSError('Deliberately unavailable editor receipt write')
        return original_write(path, contents, *args, **kwargs)

    windows.focus = observed_focus
    Path.write_text = unavailable_write
    if observation_error:
        def unavailable_hit(*point):
            raise LookupError('Deliberately unavailable editor observation')
        alive.native_hit_path = unavailable_hit
    try:
        try:
            alive.editor_edit()
        except AssertionError as error:
            assert focus_failure and str(error) == 'Native window did not open: ' + absent_title
            assert focus_errors and error is focus_errors[0], 'The original exception object must propagate'
            assert windows.scope == absent_title
        else:
            assert not focus_failure, 'The original missing-window assertion was swallowed'
    finally:
        alive.native_hit_path = original_hit
        windows.focus = original_focus
        Path.write_text = original_write
    assert focus_calls.count('Pulse - Ultra Hosted Editor') == 1
    if write_error:
        assert len(failed_writes) == 1, failed_writes
        assert len(alive.editor_observation_failures) == 1
        failure = alive.editor_observation_failures[0]
        assert failure['unavailable'] and failure['error_type'] == 'OSError', failure
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
    check_unavailable_observations()
    (ui.output / 'editor-diagnostic-report.json').write_text(json.dumps({
        'receipts': rows, 'observation_error_exercised': observation_error,
        'receipt_write_error_exercised': write_error,
        'observation_failures': alive.editor_observation_failures,
        'original_focus_exception_identity_preserved': bool(focus_errors),
        'bounded_unavailable_observation_helpers_passed': True,
        'original_editor_assertions_passed': not focus_failure,
        'original_missing_window_assertion_propagated': focus_failure,
        'quit_discard_exited': True}, indent=2))
    print('PASS first editor receipts, original success/failure assertion, bounded observer and Quit', flush=True)


if __name__ == '__main__':
    run()
