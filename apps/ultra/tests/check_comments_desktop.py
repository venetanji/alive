#!/usr/bin/env python3
"""Original comment-only fixture on the real private WebKitGTK/native surface."""
import ctypes as C
import json
import re
import time

import check_documents_desktop as desktop
from gi.repository import Atspi

ui = desktop.ui
output = ui.output


def fixture():
    def comment(ident, text, x, y, style):
        return {**desktop.node(ident, 'comment', {'text': text}, x=x, y=y), 'style': style}

    return {'version': 2, 'profile': 'ultra-patcher-v2', 'nodes': [
        comment(1, 'Literal <tag> & "quotes"\nExplicit second line stays text.', 40, 15,
                {'width': 650, 'height': 65, 'fontsize': 18}),
        comment(2, 'Top callout\nPoint 0; font 14', 40, 100,
                {'width': 280, 'height': 115, 'fontsize': 14, 'bubble': 1, 'bubbleside': 0, 'bubblepoint': 0}),
        comment(3, 'Left callout\nPoint 0.25; font 16\nA visible third line.', 360, 100,
                {'width': 280, 'height': 115, 'fontsize': 16, 'bubble': 1, 'bubbleside': 1, 'bubblepoint': .25}),
        comment(4, 'Bottom callout\nPoint 0.75; font 18', 40, 250,
                {'width': 280, 'height': 115, 'fontsize': 18, 'bubble': 1, 'bubbleside': 2, 'bubblepoint': .75}),
        comment(5, 'Right callout\nPoint 1; font 12\nThree explicit lines.', 360, 250,
                {'width': 280, 'height': 115, 'fontsize': 12, 'bubble': 1, 'bubbleside': 3, 'bubblepoint': 1}),
        comment(6, 'tiny', 700, 110,
                {'width': 12, 'height': 12, 'fontsize': 8, 'bubble': 1, 'bubbleside': 3, 'bubblepoint': 1}),
        comment(7, 'Tight line 1\nTight line 2\nTight line 3', 670, 250,
                {'width': 100, 'height': 54, 'fontsize': 13}),
        desktop.node(20, 'message', {'text': '77'}, x=40, y=415),
        desktop.node(21, 'int', {'value': 0}, x=350, y=415),
        desktop.node(22, 'number', {'value': 0}, x=500, y=415),
        desktop.node(23, 'bang', {}, x=200, y=415),
    ], 'edges': [desktop.edge(20, 21), desktop.edge(23, 21), desktop.edge(21, 22)]}


def reveal(name):
    target = ui.wait_for(name)
    Atspi.Component.scroll_to(target, Atspi.ScrollType.ANYWHERE)
    time.sleep(.1)
    return target


def click(name):
    reveal(name)
    ui.click(name)


def choose(name, index):
    click(name); ui.keys('Home')
    for _ in range(index): ui.keys('Down')
    ui.keys('Return'); ui.keys('Tab')


def set_number(name, value):
    reveal(name); ui.text(name, str(value)); ui.keys('Tab')


def inspector():
    try:
        if ui.find('Close panel').get_state_set().contains(Atspi.StateType.SHOWING): return
    except StopIteration:
        pass
    ui.click('Inspector')


def revision():
    inspector()
    control = reveal('Native observations')
    if not control.get_state_set().contains(Atspi.StateType.EXPANDED): click('Native observations')
    value = int(re.search(r'native r(\d+)\.', ui.native_revision_text()).group(1))
    ui.click('Close panel')
    return value


def remembered_value():
    for _ in range(50):
        value = ui.numeric_value('number.legacy value, object 22')
        if value == 77: return value
        time.sleep(.1)
    raise AssertionError('Comment authoring reset the live numeric value 77')


def bounds(target):
    rect = Atspi.Component.get_extents(target, Atspi.CoordType.SCREEN)
    return {'x': rect.x, 'y': rect.y, 'width': rect.width, 'height': rect.height}


def text_geometry(patch):
    measurements = []
    for node in patch['nodes']:
        if node['type'] != 'comment': continue
        header = ui.wait_for(f'Select or drag comment object {node["id"]}')
        article = ui.wait_for(f'comment object {node["id"]}')
        assert 'Text' in header.get_interfaces(), 'Comment lost its native accessible text target'
        observed = Atspi.Text.get_text(header, 0, -1)
        assert observed == node['params']['text'], 'Comment text was parsed as markup or lost newlines'
        outer = bounds(article)
        assert abs(outer['width'] - node['style']['width']) <= 1, 'Saved comment width was not rendered'
        assert abs(outer['height'] - node['style']['height']) <= 1, 'Saved comment height was not rendered'
        starts = [0] + [index + 1 for index, character in enumerate(observed) if character == '\n']
        lines = []
        for offset in starts:
            rect = Atspi.Text.get_character_extents(header, offset, Atspi.CoordType.SCREEN)
            lines.append({'offset': offset, 'x': rect.x, 'y': rect.y, 'width': rect.width, 'height': rect.height})
        if node['id'] != 6:
            assert all(first['y'] < second['y'] for first, second in zip(lines, lines[1:])), 'Multiline comment collapsed to one line'
            assert all(line['height'] > 0 and line['y'] >= outer['y'] and
                       line['y'] + line['height'] <= outer['y'] + outer['height'] + 1 for line in lines), 'Saved comment clipped a required text line'
        measurements.append({'id': node['id'], 'rectangle': outer, 'line_starts': lines,
                             'side': node['style'].get('bubbleside'), 'point': node['style'].get('bubblepoint')})
    return measurements


def resize(title, width, height):
    desktop.focus(title)
    root = C.c_ulong(); parent = C.c_ulong(); children = C.POINTER(C.c_ulong)(); count = C.c_uint()
    ui.x.XQueryTree(ui.display, ui.x.XDefaultRootWindow(ui.display), C.byref(root), C.byref(parent), C.byref(children), C.byref(count))
    matched = None
    try:
        for index in range(count.value):
            name = C.c_char_p()
            if not ui.x.XFetchName(ui.display, children[index], C.byref(name)) or not name.value: continue
            actual = name.value.decode('utf-8', errors='replace').removeprefix('* ')
            ui.x.XFree(name)
            if actual == title:
                matched = children[index]; break
        assert matched is not None, 'Comment native window could not be resized'
        ui.x.XResizeWindow(ui.display, matched, width, height); ui.x.XFlush(ui.display)
    finally:
        if children: ui.x.XFree(children)
    time.sleep(.4); ui.click('Reset canvas view')


def capture(title, name, width, height):
    resize(title, width, height)
    frame = next(frame for frame in desktop.app_frames() if frame.get_name().removeprefix('* ') == title)
    rect = bounds(frame)
    assert rect['width'] == width and rect['height'] == height, 'Unexpected front-window capture size'
    root = ui.Gdk.get_default_root_window()
    assert rect['x'] >= 0 and rect['y'] >= 0
    assert rect['x'] + width <= root.get_width() and rect['y'] + height <= root.get_height()
    ui.Gdk.pixbuf_get_from_window(root, rect['x'], rect['y'], width, height).savev(str(output/name), 'png', [], [])
    return rect


def run():
    patch = fixture(); path = output/'comments.ultra'
    path.write_text(json.dumps(patch) + '\n')
    title = path.name + ' - Ultra'
    desktop.open_file(path); resize(title, 1120, 780)
    baseline = ui.export()
    assert baseline == patch, 'Comment fixture defaults must be explicit before exact Save comparisons'
    initial_geometry = text_geometry(baseline)
    ui.keys('Control_L', 'e'); ui.click('Trigger message.legacy object 20'); remembered_value()
    initial_revision = revision(); ui.keys('Control_L', 'e')

    ui.click('Select or drag comment object 2'); inspector()
    choose('Bubble, selected object 2', 1)
    choose('Bubble Side, selected object 2', 4)
    set_number('Bubble Point, selected object 2', .75)
    set_number('Font Size, selected object 2', 18)
    changed = ui.export()
    expected_style = {**patch['nodes'][1]['style'], 'bubble': 0, 'bubbleside': 3, 'bubblepoint': .75, 'fontsize': 18}
    assert next(node for node in changed['nodes'] if node['id'] == 2)['style'] == expected_style
    remembered_value()
    click('Reset appearance')
    reset = ui.export()
    assert 'style' not in next(node for node in reset['nodes'] if node['id'] == 2), 'Reset left obsolete comment appearance fields'
    reset_bounds = bounds(ui.wait_for('comment object 2'))
    assert (reset_bounds['width'], reset_bounds['height']) != (280, 115), 'Reset left the old rendered comment dimensions'
    ui.click('Undo'); assert ui.export() == changed, 'Undo did not restore the callout appearance'
    ui.click('Redo'); assert ui.export() == reset, 'Redo did not clear callout appearance'
    ui.click('Undo')
    for _ in range(4): ui.click('Undo')
    assert ui.export() == baseline, 'Appearance history did not restore the original comment fixture'
    ui.click('Close panel'); assert revision() == initial_revision

    # Exercise the real textarea and Shift+Enter before committing a multiline comment.
    ui.click('Select or drag comment object 1'); ui.keys('Return')
    ui.text('Comment text', 'comment Native edited'); ui.keys('End'); ui.keys('Shift_L', 'Return'); ui.keys('x')
    control = ui.wait_for('Comment text')
    assert Atspi.Text.get_text(control, 0, -1) == 'comment Native edited\nx'
    ui.keys('Return')
    edited = ui.export()
    assert next(node for node in edited['nodes'] if node['id'] == 1)['params']['text'] == 'Native edited\nx'
    ui.click('Undo'); assert ui.export() == baseline

    # The remembered int catches graph replacement even if a displayed value were stale.
    ui.keys('Control_L', 'e'); ui.click('Trigger bang object 23'); remembered_value()
    assert revision() == initial_revision, 'Comment style/text/history reinstalled the executable graph'
    ui.keys('Control_L', 'e')
    ui.keys('Control_L', 's')
    for _ in range(50):
        saved = json.loads(path.read_text())
        if saved == baseline: break
        time.sleep(.1)
    assert saved == baseline, 'Comment Save changed the canonical appearance or executable tree'
    assert len(saved['nodes']) == 11 and len(saved['edges']) == 3
    captures = []
    for width, height, name in [(1120, 780, 'native-comments-desktop.png'), (800, 600, 'native-comments-compact.png')]:
        captures.append({'file': name, 'window': capture(title, name, width, height), 'comments': text_geometry(baseline)})
    (output/'native-comments-geometry.json').write_text(json.dumps({'initial': initial_geometry, 'captures': captures}, indent=2) + '\n')
    assert ui.export() == baseline
    desktop.native_menu('Close Window')
    for _ in range(80):
        if not any(frame.get_name().removeprefix('* ') == title for frame in desktop.app_frames()): break
        time.sleep(.1)
    assert not any(frame.get_name().removeprefix('* ') == title for frame in desktop.app_frames())
    result = {'status': 'passed', 'scope': 'new original comments on actual Tauri/WebKitGTK/native runtime',
              'four_sides': [0, 1, 2, 3], 'points': [0, .25, .75, 1], 'fonts': [14, 16, 18, 12],
              'explicit_two_and_three_lines': True, 'safe_literal_text': True, 'minimum_rectangle': [12, 12],
              'tight_three_line_rectangle': {'width': 100, 'height': 54, 'fontsize': 13},
              'inspector_edit_reset_undo_redo': True, 'native_multiline_textarea_shift_enter_commit_history': True,
              'saved_authoring_shape_unchanged': True, 'preserved_runtime_revision': initial_revision,
              'preserved_live_numeric_value': 77, 'capture_sizes': [[1120, 780], [800, 600]],
              'whole_help_roots_qualified': 0}
    (output/'comments-result.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    try:
        run()
    finally:
        ui.x.XCloseDisplay(ui.display)
