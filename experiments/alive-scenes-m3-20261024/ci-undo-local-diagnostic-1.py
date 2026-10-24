#!/usr/bin/env python3
"""Observe the original native pending-history regression without source edits."""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path('apps/ultra/tests').resolve()))
import check_alive_desktop as alive

ui, windows, Atspi = alive.ui, alive.windows, alive.Atspi
original_click = ui.click
rows = []


def save(kind, **fields):
    row = {'kind': kind, 'monotonic': time.monotonic(), **fields}
    rows.append(row)
    (ui.output / 'undo-diagnostic.json').write_text(json.dumps(rows, indent=2))


def rect(control):
    r = Atspi.Component.get_extents(control, Atspi.CoordType.SCREEN)
    return [r.x, r.y, r.width, r.height]


def observation():
    return {'pitch': alive.value('Note 13 pitch'), 'beat': alive.value('Note 13 beat'),
            'redo_enabled': ui.wait_for('Redo pending edit').get_state_set().contains(Atspi.StateType.ENABLED),
            'status': alive.value('Session status')}


def click(name):
    if name not in ('Undo pending edit', 'Redo pending edit'):
        return original_click(name)
    for _ in range(30):
        control = ui.wait_for(name)
        if control.get_state_set().contains(Atspi.StateType.ENABLED):
            break
        time.sleep(.1)
    assert control.get_state_set().contains(Atspi.StateType.ENABLED), name
    before = rect(control)
    Atspi.Component.grab_focus(control)
    used = rect(control)
    px, py = used[0] + used[2] // 2, used[1] + used[3] // 2
    assert ui.t.XTestFakeMotionEvent(ui.display, 0, px, py, 0)
    assert ui.t.XTestFakeButtonEvent(ui.display, 1, 1, 0)
    assert ui.t.XTestFakeButtonEvent(ui.display, 1, 0, 0)
    ui.x.XFlush(ui.display)
    sent = time.monotonic()
    time.sleep(.15)
    observed = observation()
    save('click', name=name, before_focus_rect=before, used_rect=used,
         after_rect=rect(ui.wait_for(name)), sent_monotonic=sent, observed=observed)
    alive.screenshot('undo-diagnostic-' + str(len(rows)) + '.png')


ui.click = click
alive.check_separate_apps = lambda: {'diagnostic_skip': 'The preserved Alive package has no adjacent Ultra executable; this unrelated identity test is skipped.'}
original_piano = alive.piano_history_with_effect_editor


class DiagnosticComplete(Exception):
    pass


def piano():
    save('piano_begin')
    original_piano()
    save('piano_pass')
    raise DiagnosticComplete()


alive.piano_history_with_effect_editor = piano
save('begin', binary=str(Path(f'/proc/{ui.pid}/exe').resolve()),
     source=str(Path(alive.__file__).resolve()))
try:
    alive.run()
except DiagnosticComplete:
    print('PASS diagnostic reached original piano/history completion', flush=True)
except Exception as error:
    save('failure', error=repr(error))
    alive.screenshot('undo-diagnostic-failure.png')
    for _ in range(8):
        time.sleep(.25)
        try:
            save('after_failure', observed=observation(), undo_rect=rect(ui.wait_for('Undo pending edit')))
        except Exception as observation_error:
            save('observation_error', error=repr(observation_error))
    raise
