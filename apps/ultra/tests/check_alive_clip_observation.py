#!/usr/bin/env python3
"""Actual native regressions for tooltip activation and transient clip receipts."""
import json
import os
from pathlib import Path
import time

import check_alive_clips as clips
import check_alive_desktop as alive

ui, windows = alive.ui, alive.windows


def quit_alive():
    ui.click('Quit Alive')
    windows.focus('Unsaved Alive Session'); ui.click('Discard')
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        try:
            if Path(f'/proc/{ui.pid}/stat').read_text().split(') ', 1)[1].split()[0] == 'Z':
                return
        except FileNotFoundError:
            return
        time.sleep(.1)
    raise AssertionError('Alive did not quit after the clip observation regression')


def run():
    windows.focus(alive.MAIN)
    ui.wait_for('Select Pulse slot 4')
    summary = ui.wait_for('Pulse runtime details')
    assert not summary.get_state_set().contains(alive.Atspi.StateType.EXPANDED)
    covering = alive.force_covering_tooltip('Pulse runtime details', 'Select Pulse slot 4',
                                          kind='disclosure')
    write_error = os.environ.get('ALIVE_TEST_DISCLOSURE_WRITE_ERROR') == '1'
    blocked = os.environ.get('ALIVE_TEST_DISCLOSURE_BLOCKED') == '1'
    input_error = os.environ.get('ALIVE_TEST_DISCLOSURE_INPUT_ERROR') == '1'
    original_write, original_hit = Path.write_text, alive.native_hit_path
    original_button = ui.t.XTestFakeButtonEvent
    press_error = AssertionError('Deliberately unavailable native disclosure press')
    failed_writes = []
    releases = []

    def unavailable_write(path, contents, *args, **kwargs):
        if (write_error and path == ui.output / 'native-inputs.json' and
                alive.native_inputs[-1]['action'] in ('disclosure click', 'disclosure blocked')):
            failed_writes.append(alive.native_inputs[-1]['action'])
            raise OSError('Deliberately unavailable disclosure receipt write')
        return original_write(path, contents, *args, **kwargs)

    Path.write_text = unavailable_write
    if blocked:
        alive.native_hit_path = lambda *point: []
    if input_error:
        def unavailable_button(display, button, pressed, delay):
            if pressed:
                raise press_error
            result = original_button(display, button, pressed, delay)
            releases.append(bool(result))
            return result
        ui.t.XTestFakeButtonEvent = unavailable_button
    try:
        if input_error:
            try:
                alive.value('Pulse clip runtime')
            except AssertionError as error:
                assert error is press_error, 'The original native input exception must propagate'
            else:
                raise AssertionError('Native input failure was swallowed')
        elif blocked:
            try:
                alive.value('Pulse clip runtime')
            except AssertionError as error:
                assert str(error) == ('Native disclosure target remains occluded or unavailable: '
                                      'Pulse runtime details')
            else:
                raise AssertionError('Blocked owned-window input was accepted')
        else:
            runtime = alive.value('Pulse clip runtime')
    finally:
        Path.write_text, alive.native_hit_path = original_write, original_hit
        ui.t.XTestFakeButtonEvent = original_button
    if write_error:
        assert len(failed_writes) == 1, failed_writes
        assert len(alive.disclosure_observation_failures) == 1
        assert alive.disclosure_observation_failures[0]['error_type'] == 'OSError'
    if blocked or input_error:
        if blocked:
            receipt = next(row for row in alive.native_inputs if row['action'] == 'disclosure blocked')
            assert receipt['presses'] == receipt['releases'] == 0
        else:
            assert releases == [True]
            assert not alive.disclosure_observation_failures
            receipt = None
        quit_alive()
        (ui.output / 'clip-observation-report.json').write_text(json.dumps({
            'original_blocked_assertion_preserved': blocked,
            'original_input_exception_identity_preserved': input_error,
            'failed_writes': failed_writes, 'observation_failures': alive.disclosure_observation_failures,
            'receipt': receipt, 'quit_discard_exited': True}, indent=2))
        print('PASS original native readiness/input failure and Quit', flush=True)
        return
    assert runtime
    assert ui.wait_for('Pulse runtime details').get_state_set().contains(alive.Atspi.StateType.EXPANDED)
    receipts = [row for row in alive.native_inputs if row['action'] == 'disclosure click']
    assert len(receipts) == 1 and receipts[0]['presses'] == receipts[0]['releases'] == 1
    assert covering['owner'] not in covering['hit_path']
    assert receipts[0]['owner'] in receipts[0]['samples'][-1]['hit_path']

    ui.click('Duplicate clip')
    ui.click('Prepare / Apply')
    settings = alive.check_audio_settings()
    alive.value('Pulse clip runtime')
    position = ui.wait_for('Transport position beats')
    alive.transport('start')
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        late_position = alive.Atspi.Text.get_text(position, 0, -1)
        if 2.5 <= float(late_position.split()[0]) % 4 < 3.5:
            break
        time.sleep(.01)
    else:
        raise AssertionError('Transport did not reach the late-bar regression precondition')
    launch_position = clips.launch_at_observable_phase('Launch Pulse Clip 1 copy')
    assert .15 <= launch_position % 4 <= 1
    pending = alive.wait_value('Pulse clip runtime', lambda text: 'pending launch' in text)
    applied = alive.wait_value('Pulse clip runtime',
                               lambda text: 'Playing Clip 1 copy' in text and 'applied' in text)
    alive.transport('stop')
    audio = alive.detail()
    assert audio['Audio stream errors'] == '0' and audio['Audio failed'] == 'false', audio
    assert audio['Rejected commands'] == '0' and audio['Transport playing'] == 'false', audio
    quit_alive()
    report = {'physical_audio': False, 'covering_tooltip': covering,
              'single_disclosure_click': receipts[0], 'late_position': late_position,
              'launch_position_beats': launch_position, 'pending': pending, 'applied': applied,
              'settings': settings, 'audio': audio, 'quit_discard_exited': True,
              'failed_writes': failed_writes,
              'observation_failures': alive.disclosure_observation_failures}
    (ui.output / 'clip-observation-report.json').write_text(json.dumps(report, indent=2))
    print('PASS one owned disclosure click, late-bar synchronization, pending then applied and Quit', flush=True)


if __name__ == '__main__':
    try:
        run()
    except Exception:
        try:
            alive.screenshot('clip-observation-failure.png')
        except Exception:
            pass
        raise
