#!/usr/bin/env python3
"""Open original arithmetic examples in the rebuilt native app, without captures."""
import json
from pathlib import Path
import time

import check_documents_desktop as desktop
from gi.repository import GLib

ui = desktop.ui


def wait_for(name, text_content=False):
    for _ in range(80):
        try:
            return ui.find(name, text_content)
        except (StopIteration, GLib.GError):
            time.sleep(.1)
    raise AssertionError('Missing native arithmetic control: ' + name)


ui.wait_for = wait_for
desktop.private_help_reference = True  # Suppress the shared focus-failure capture.


def printed(label, value):
    wait_for(label + ':')
    wait_for(value, text_content=True)


def run():
    cases = [('subtract', '5.', '3.'), ('divide', '3.5', '1.75'),
             ('modulo', '1', '3'), ('reverse_subtract', '3.', '-3.'),
             ('reverse_divide', '2.', str(4 / 7)), ('abs', '7.5', None)]
    results = []
    for kind, initial, after_cold in cases:
        path = Path('apps/ultra/examples') / (kind + '.ultra')
        desktop.open_file(path)
        before = ui.export()
        assert before == json.loads(path.read_text()), kind + ' changed on Open'
        ui.keys('Control_L', 'e')
        ui.click('Console')
        ui.click('Trigger message object 1')
        printed(kind, initial)
        if after_cold is not None:
            ui.click('Clear')
            ui.click('Trigger message object 2')
            time.sleep(.3)
            try:
                ui.find(kind + ':')
            except StopIteration:
                pass
            else:
                raise AssertionError(kind + ' cold operand emitted')
            ui.click('Trigger bang object 3')
            printed(kind, after_cold)
        assert ui.export() == before, kind + ' runtime operands changed saved authoring data'
        desktop.native_menu('Close Window')
        results.append({'type': kind, 'initial_console': initial,
                        'after_silent_cold_and_bang': after_cold,
                        'authoring_retained': True})
    result = {'status': 'passed', 'scope': 'six original examples through native File Open, WebKitGTK and C++ execution',
              'audio': 'off', 'captures': 0, 'cases': results,
              'whole_help_roots_qualified': 0}
    (ui.output / 'arithmetic-result.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    try:
        run()
    finally:
        ui.x.XCloseDisplay(ui.display)
