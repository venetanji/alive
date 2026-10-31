#!/usr/bin/env python3
"""Focused real desktop launch settings/save/reopen journey in the private harness.

Use quantized-midi.alive as ULTRA_TEST_ALIVE_SESSION and this file as
ULTRA_TEST_SCRIPT with check_canvas_desktop.sh. No synthetic IPC is used.
"""
import json
import time

import check_alive_desktop as alive
from gi.repository import Atspi

ui = alive.ui


def select(name, index):
    ui.click(name)
    ui.keys('Home')
    for _ in range(index):
        ui.keys('Down')
    ui.keys('Return')
    time.sleep(.4)


def effective(grid):
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        node = ui.wait_for('Clip launch status')
        # WebKit exposes this named output's title as its description.
        text = alive.value('Clip launch status') or node.get_description()
        if 'Effective: ' + grid in text:
            return text
        time.sleep(.12)
    raise AssertionError('Unexpected clip launch status: ' + repr(text))


def run():
    alive.windows.focus('Alive')
    ui.wait_for('Launch Quantization')
    ui.click('Session workspace')
    ui.click('Select Pulse slot 1')
    effective('1/8')
    select('Launch Quantization', 4)  # 1/4
    effective('1/4')
    select('Clip Launch Quantization', 3)  # 1/16
    effective('1/16')
    saved = ui.output / 'quantized-saved.alive'
    alive.choose_file('Save session as', 'Save Alive Session', saved)
    document = json.loads(saved.read_text())
    assert document['format'] == 'alive-session-v6'
    assert document['launch']['globalQuantization'] == 'quarter'
    assert len(document['launch']['clipQuantization']) == 2
    assert all(o['quantization'] == 'sixteenth' for o in document['launch']['clipQuantization'])
    alive.choose_file('Open session', 'Open Alive Session', saved)
    ui.click('Session workspace')
    ui.click('Select Pulse slot 1')
    effective('1/16')
    ui.click('Alive audio settings')
    ui.click('Save and start Alive audio')
    ui.click('Close audio settings')
    ui.click('Audio details')
    alive.wait_value('Audio callbacks', lambda s: s.isdecimal() and int(s) > 0)
    alive.transport('start')
    ui.click('Audio details')
    launch = next(node.get_name() for frame in alive.windows.app_frames() for node in ui.walk(frame)
                  if node.get_name().startswith('Launch Pulse ')
                  and node.get_state_set().contains(Atspi.StateType.SHOWING))
    ui.click(launch)
    receipt = alive.wait_value('Session status', lambda s: '1/16' in s and ('applied' in s or 'pending' in s or 'queued' in s))
    time.sleep(.5)
    alive.screenshot('quantized-playing.png')
    ui.click('Audio details')
    alive.wait_value('Track 1 authority', lambda s: s == 'session')
    alive.wait_value('Track 1 active voices', lambda s: s.isdecimal() and int(s) > 0)
    ui.click('Stop transport')
    alive.wait_value('Transport playing', lambda s: s == 'false')
    alive.wait_value('Audio stream errors', lambda s: s == '0')
    report = {'saved': str(saved), 'launch': document['launch'], 'receipt': receipt,
              'reopened_effective': '1/16', 'native_authority_after_launch': 'session',
              'native_active_voices': True, 'audio_stream_errors': 0, 'stopped': True}
    (ui.output / 'launch-report.json').write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    ui.find = alive.windows.scoped_find
    try:
        run()
    except Exception:
        alive.screenshot('launch-failure.png')
        nodes = [{'name': node.get_name(), 'role': node.get_role_name()}
                 for frame in alive.windows.app_frames() for node in ui.walk(frame)]
        (ui.output / 'launch-failure.json').write_text(json.dumps(nodes, indent=2))
        raise
