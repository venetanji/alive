#!/usr/bin/env python3
"""Saved cable routes and retained execution in the actual private native app."""
import json
import time

import check_documents_desktop as desktop
from check_comments_desktop import bounds, capture, resize, revision

ui = desktop.ui
output = ui.output


def drag(name, dx, dy):
    rect = bounds(ui.wait_for(name))
    sx, sy = rect['x'] + 15, rect['y'] + rect['height'] // 2
    assert ui.t.XTestFakeMotionEvent(ui.display, 0, sx, sy, 0)
    assert ui.t.XTestFakeButtonEvent(ui.display, 1, 1, 0)
    for step in range(1, 9):
        assert ui.t.XTestFakeMotionEvent(ui.display, 0, round(sx + dx * step / 8), round(sy + dy * step / 8), 0)
        ui.x.XFlush(ui.display)
        time.sleep(.04)
    assert ui.t.XTestFakeButtonEvent(ui.display, 1, 0, 0)
    ui.x.XFlush(ui.display)
    time.sleep(.3)


def remembered():
    for _ in range(50):
        value = ui.numeric_value('number.legacy value, object 3')
        if value == 77:
            return value
        time.sleep(.1)
    raise AssertionError('Cable geometry edit lost native remembered value 77')


def run():
    patch = {'version': 1, 'profile': 'ultra-canvas-v1', 'nodes': [
        desktop.node(1, 'message', {'text': '77'}, x=60, y=60),
        desktop.node(2, 'int', {'value': 0}, x=320, y=240),
        desktop.node(3, 'number', {'value': 0}, x=500, y=380),
        desktop.node(4, 'bang', {}, x=60, y=380),
    ], 'edges': [
        {**desktop.edge(1, 2), 'midpoints': [67, 150, 280, 150, 280, 220, 327, 220]},
        {**desktop.edge(2, 3), 'midpoints': [327, 310, 507, 310, 507, 310]},
        {**desktop.edge(4, 2), 'midpoints': [67, 490, 680, 490, 680, 210, 327, 210]},
    ]}
    path = output / 'cables.ultra'
    path.write_text(json.dumps(patch) + '\n')
    title = path.name + ' - Ultra'
    desktop.open_file(path)
    resize(title, 1120, 780)
    baseline = ui.export()
    assert baseline == patch, 'Native cable document did not retain the exact saved authoring shape'
    ui.keys('Control_L', 'e')
    ui.click('Trigger message.legacy object 1')
    remembered()
    initial_revision = revision()
    ui.keys('Control_L', 'e')

    header = 'Select or drag int object 2'
    drag(header, 40, 30)
    moved = ui.export()
    assert moved['nodes'][1]['x'] == 360 and moved['nodes'][1]['y'] == 270
    assert moved['edges'] == baseline['edges'], 'Moving one endpoint changed saved absolute bends'
    ui.click('Undo')
    assert ui.export() == baseline

    ui.click(header)
    ui.keys('Control_L', 'a')
    drag(header, 30, 20)
    grouped = ui.export()
    assert [(node['x'], node['y']) for node in grouped['nodes']] == [(90, 80), (350, 260), (530, 400), (90, 400)]
    assert [edge['midpoints'] for edge in grouped['edges']] == [
        [97, 170, 310, 170, 310, 240, 357, 240],
        [357, 330, 537, 330, 537, 330],
        [97, 510, 710, 510, 710, 230, 357, 230],
    ], 'Group drag did not translate the complete saved routes'
    ui.click('Undo')
    assert ui.export() == baseline
    ui.click('Redo')
    assert ui.export() == grouped
    ui.click('Undo')
    assert ui.export() == baseline

    # Fresh recall distinguishes retained native state from stale readout text.
    ui.keys('Control_L', 'e')
    ui.click('Trigger bang object 4')
    remembered()
    assert revision() == initial_revision, 'Cable authoring/history replaced the executable graph'
    ui.keys('Control_L', 'e')
    ui.keys('Control_L', 's')
    for _ in range(50):
        saved = json.loads(path.read_text())
        if saved == baseline:
            break
        time.sleep(.1)
    assert saved == baseline, 'Native Save lost or reordered cable geometry'

    captures = []
    for width, height, name in [(1120, 780, 'native-cables-desktop.png'), (800, 600, 'native-cables-compact.png')]:
        captures.append({'file': name, 'window': capture(title, name, width, height)})
    assert ui.export() == baseline
    desktop.native_menu('Close Window')
    for _ in range(80):
        if not any(frame.get_name().removeprefix('* ') == title for frame in desktop.app_frames()):
            break
        time.sleep(.1)
    assert not any(frame.get_name().removeprefix('* ') == title for frame in desktop.app_frames())
    result = {'status': 'passed', 'scope': 'original cable fixture in actual Tauri/WebKitGTK/native runtime',
              'one_endpoint_absolute_bends': True, 'group_translates_bends': True,
              'geometry_history_and_save': True, 'preserved_runtime_revision': initial_revision,
              'preserved_numeric_value_after_fresh_recall': 77, 'captures': captures,
              'whole_help_roots_qualified': 0}
    (output / 'cables-result.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    try:
        run()
    finally:
        ui.x.XCloseDisplay(ui.display)
