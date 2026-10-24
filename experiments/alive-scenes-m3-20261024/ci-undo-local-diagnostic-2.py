#!/usr/bin/env python3
"""Trace the original click/read cadence without extra accessibility queries."""
import inspect
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path('apps/ultra/tests').resolve()))
import check_alive_desktop as alive

ui, windows, Atspi = alive.ui, alive.windows, alive.Atspi
rows = []


def save(kind, **fields):
    rows.append({'kind': kind, 'monotonic': time.monotonic(), **fields})
    (ui.output / 'undo-diagnostic.json').write_text(json.dumps(rows, indent=2))


original_value = alive.value


def observed_value(name):
    result = original_value(name)
    if name in ('Note 13 pitch', 'Note 13 beat'):
        save('value', name=name, value=result)
    return result


alive.value = observed_value
source = inspect.getsource(ui.click).replace('def click(name):', 'def diagnostic_click(name):', 1)
source = source.replace('    time.sleep(.15)', '''    time.sleep(.15)
    if name in ('Undo pending edit', 'Redo pending edit'):
        save('click', name=name, used_rect=[rect.x, rect.y, rect.width, rect.height])''')
namespace = {**vars(ui), 'save': save}
exec(compile(source, '/tmp/alive-undo-diagnostic-2-click.py', 'exec'), namespace)
ui.click = namespace['diagnostic_click']
alive.check_separate_apps = lambda: {'diagnostic_skip': 'Preserved Alive package has no adjacent Ultra executable; unrelated identity test skipped.'}
original_piano = alive.piano_history_with_effect_editor


class DiagnosticComplete(Exception):
    pass


def piano():
    save('piano_begin')
    original_piano()
    save('piano_pass')
    raise DiagnosticComplete()


alive.piano_history_with_effect_editor = piano
save('begin', binary=str(Path(f'/proc/{ui.pid}/exe').resolve()), click_source=source)
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
            save('after_failure', pitch=original_value('Note 13 pitch'),
                 beat=original_value('Note 13 beat'),
                 redo_enabled=ui.wait_for('Redo pending edit').get_state_set().contains(Atspi.StateType.ENABLED))
        except Exception as observation_error:
            save('observation_error', error=repr(observation_error))
    raise
