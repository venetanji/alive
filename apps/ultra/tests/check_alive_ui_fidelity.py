#!/usr/bin/env python3
"""Native UI resize checks for the MIDI Arrangement example.

Use the private desktop harness with the midi-arrangement.alive example and
ULTRA_TEST_SCREEN_SIZE=1920x1080. This does not qualify physical audio.
"""
import json

import check_alive_arrangement as arrangement

alive, ui = arrangement.alive, arrangement.ui


def bounds(name, width, height):
    rect = arrangement.rect(name)
    assert (rect.width > 0 and rect.height > 0 and rect.x >= 0 and rect.y >= 0
            and rect.x + rect.width <= width and rect.y + rect.height <= height), (name, rect)
    return dict(x=rect.x, y=rect.y, width=rect.width, height=rect.height)


def run():
    alive.windows.focus('Alive')
    alive.prepare_workspace_control('MIDI source'); ui.wait_for('MIDI source'); ui.click('Source / Clip')
    assert alive.value('Transport position beats') == '0.000 beats'
    ui.click('Browse Audio Effects')
    ui.wait_for('Stereo Lowpass')
    captures = []
    for view in ('session', 'arrangement'):
        ui.click(f'{view.title()} workspace')
        for width, height in ((1440, 900), (1280, 800), (1024, 768), (800, 600)):
            filename = f'native-{view}-{width}x{height}.png'
            arrangement.capture_window(width, height, filename)
            controls = ['Stop transport', 'Master gain', 'Reset Master gain to unity',
                        'Select Master output' if view == 'session' else 'Select Master output in Arrangement']
            captures.append(dict(view=view, width=width, height=height, image=filename,
                                 bounds={name: bounds(name, width, height) for name in controls}))
    assert alive.value('Transport position beats') == '0.000 beats'
    report = dict(kind='Actual Tauri/WebKit on private X display', physical_audio=False,
                  bundled_effect_visible=True, captures=captures, status='passed')
    (ui.output / 'ui-fidelity-report.json').write_text(json.dumps(report, indent=2))
    print('PASS native browser catalog and Session/Arrangement resize controls at four sizes', flush=True)
    arrangement.capture_window(1440, 900, 'native-arrangement-restored.png')


if __name__ == '__main__':
    run()
