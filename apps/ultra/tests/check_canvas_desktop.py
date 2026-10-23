#!/usr/bin/env python3
"""Exercise the built canvas, audio settings and CPAL software capture privately."""
import array
import ctypes as C
import ctypes.util
import json
import math
import os
from pathlib import Path
import re
import subprocess
import time

import gi
gi.require_version('Atspi', '2.0')
gi.require_version('Gdk', '3.0')
from gi.repository import Atspi, Gdk, GLib

assert os.environ.get('ULTRA_TEST_PRIVATE_SESSION') == '1'
assert os.environ.get('XAUTHORITY') and not os.environ.get('WAYLAND_DISPLAY')
display_name = os.environ['DISPLAY']
servers = subprocess.check_output(['pgrep', '-a', '-x', 'Xvfb'], text=True)
assert any(display_name in line.split()[2:] for line in servers.splitlines())
pid = int(os.environ['ULTRA_TEST_PID'])
output = Path(os.environ['ULTRA_TEST_OUTPUT_DIR'])


def desktop_apps():
    desktop = Atspi.get_desktop(0)
    return (desktop.get_child_at_index(i) for i in range(desktop.get_child_count()))


def walk(a):
    if a is None:
        return
    yield a
    try:
        children = [a.get_child_at_index(i) for i in range(a.get_child_count())]
    except GLib.GError:
        return
    for child in children:
        yield from walk(child)


def find(name, text_content=False):
    for root in desktop_apps():
        try:
            if root.get_process_id() != pid:
                continue
        except GLib.GError:
            continue
        for a in walk(root):
            try:
                if a.get_name() == name or (text_content and 'Text' in a.get_interfaces()
                                          and Atspi.Text.get_text(a, 0, -1) == name):
                    return a
            except GLib.GError:
                continue
    raise StopIteration(name)


def wait_for(name, text_content=False):
    for _ in range(80):
        try:
            return find(name, text_content)
        except (StopIteration, GLib.GError):
            time.sleep(.1)
    nodes = []
    for root in desktop_apps():
        if root.get_process_id() != pid:
            continue
        for item in walk(root):
            try:
                nodes.append({'name': item.get_name(), 'role': item.get_role_name(),
                              'text': Atspi.Text.get_text(item, 0, -1) if 'Text' in item.get_interfaces() else ''})
            except GLib.GError:
                continue
    (output/'missing-control.json').write_text(json.dumps({'missing': name, 'nodes': nodes}, indent=2))
    root = Gdk.get_default_root_window()
    Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height()).savev(str(output/'missing-control.png'), 'png', [], [])
    raise AssertionError('Missing native control: ' + name)


def click(name):
    for _ in range(30):
        control = wait_for(name)
        if control.get_state_set().contains(Atspi.StateType.ENABLED):
            break
        time.sleep(.1)
    if not control.get_state_set().contains(Atspi.StateType.ENABLED):
        names = []
        for root in desktop_apps():
            if root.get_process_id() != pid:
                continue
            for a in walk(root):
                try:
                    names.append({'name': a.get_name(), 'role': a.get_role_name(),
                                  'enabled': a.get_state_set().contains(Atspi.StateType.ENABLED)})
                except GLib.GError:
                    continue
        (output/'accessibility-failure.json').write_text(json.dumps(names, indent=2))
        root = Gdk.get_default_root_window()
        image = Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height())
        image.savev(str(output/'native-action-failure.png'), 'png', [], [])
        raise AssertionError(name + ' is disabled')
    Atspi.Component.grab_focus(control)
    rect = Atspi.Component.get_extents(control, Atspi.CoordType.SCREEN)
    assert rect.width > 0 and rect.height > 0, name
    assert t.XTestFakeMotionEvent(display, 0, rect.x+rect.width//2, rect.y+rect.height//2, 0)
    assert t.XTestFakeButtonEvent(display, 1, 1, 0)
    assert t.XTestFakeButtonEvent(display, 1, 0, 0)
    x.XFlush(display)
    time.sleep(.15)


def text(name, value):
    target = wait_for(name)
    candidates = list(walk(target))
    for root in desktop_apps():
        try:
            if root.get_process_id() != pid:
                continue
            for item in walk(root):
                try:
                    if item.get_name() == name:
                        candidates.append(item)
                except GLib.GError:
                    continue
        except GLib.GError:
            continue
    editable = next((a for a in candidates if 'EditableText' in a.get_interfaces()), None)
    if editable is not None:
        assert Atspi.EditableText.set_text_contents(editable, value), name
        return
    # WebKit exposes these controls as Text, without EditableText. Own the
    # clipboard only on this verified private X server while ordinary Paste runs.
    owner = subprocess.Popen(['python3', '-c', '''
import sys, gi
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk, Gdk
Gtk.Clipboard.get(Gdk.SELECTION_CLIPBOARD).set_text(sys.stdin.read(), -1)
print('ready', flush=True)
Gtk.main()
'''], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    try:
        owner.stdin.write(value)
        owner.stdin.close()
        assert owner.stdout.readline().strip() == 'ready'
        Atspi.Component.grab_focus(target)
        keys('Control_L', 'a')
        keys('Control_L', 'v')
    finally:
        owner.terminate()
        owner.wait(timeout=3)


x = C.CDLL(ctypes.util.find_library('X11'))
t = C.CDLL(ctypes.util.find_library('Xtst'))
x.XOpenDisplay.argtypes = [C.c_char_p]
x.XOpenDisplay.restype = C.c_void_p
x.XStringToKeysym.argtypes = [C.c_char_p]
x.XStringToKeysym.restype = C.c_ulong
x.XKeysymToKeycode.argtypes = [C.c_void_p, C.c_ulong]
x.XKeysymToKeycode.restype = C.c_uint
x.XFlush.argtypes = [C.c_void_p]
x.XCloseDisplay.argtypes = [C.c_void_p]
t.XTestFakeKeyEvent.argtypes = [C.c_void_p, C.c_uint, C.c_int, C.c_ulong]
t.XTestFakeMotionEvent.argtypes = [C.c_void_p, C.c_int, C.c_int, C.c_int, C.c_ulong]
t.XTestFakeButtonEvent.argtypes = [C.c_void_p, C.c_uint, C.c_int, C.c_ulong]
display = x.XOpenDisplay(display_name.encode())
assert display


def keys(*names):
    codes = [x.XKeysymToKeycode(display, x.XStringToKeysym(n.encode())) for n in names]
    assert all(codes)
    for code in codes:
        assert t.XTestFakeKeyEvent(display, code, 1, 0)
    for code in reversed(codes):
        assert t.XTestFakeKeyEvent(display, code, 0, 0)
    x.XFlush(display)
    time.sleep(.2)


def export():
    click('Patch file actions')
    click('Export JSON...')
    value = Atspi.Text.get_text(wait_for('Patch JSON'), 0, -1)
    keys('Escape')
    return json.loads(value)


def import_json():
    click('Patch file actions')
    click('Advanced JSON / Max import...')


def drag_port(source, target, y_offset=0):
    start = Atspi.Component.get_extents(wait_for(source), Atspi.CoordType.SCREEN)
    end = Atspi.Component.get_extents(wait_for(target), Atspi.CoordType.SCREEN)
    sx, sy = start.x + start.width // 2, start.y + start.height // 2
    ex, ey = end.x + end.width // 2, end.y + end.height // 2 + y_offset
    assert t.XTestFakeMotionEvent(display, 0, sx, sy, 0)
    assert t.XTestFakeButtonEvent(display, 1, 1, 0)
    x.XFlush(display)
    for step in range(1, 9):
        assert t.XTestFakeMotionEvent(display, 0, round(sx+(ex-sx)*step/8), round(sy+(ey-sy)*step/8), 0)
        x.XFlush(display)
        time.sleep(.04)
    assert t.XTestFakeButtonEvent(display, 1, 0, 0)
    x.XFlush(display)
    time.sleep(.2)


def control_point(name, x_fraction, y_fraction):
    rect = Atspi.Component.get_extents(wait_for(name), Atspi.CoordType.SCREEN)
    return round(rect.x + rect.width*x_fraction), round(rect.y + rect.height*y_fraction)


def click_control(name, x_fraction=.5, y_fraction=.5):
    px, py = control_point(name, x_fraction, y_fraction)
    assert t.XTestFakeMotionEvent(display, 0, px, py, 0)
    assert t.XTestFakeButtonEvent(display, 1, 1, 0)
    assert t.XTestFakeButtonEvent(display, 1, 0, 0)
    x.XFlush(display)
    time.sleep(.3)


def drag_control(name, start, end, modifier=None):
    sx, sy = control_point(name, *start)
    ex, ey = control_point(name, *end)
    code = x.XKeysymToKeycode(display, x.XStringToKeysym(modifier.encode())) if modifier else None
    if code:
        assert t.XTestFakeKeyEvent(display, code, 1, 0)
    assert t.XTestFakeMotionEvent(display, 0, sx, sy, 0)
    assert t.XTestFakeButtonEvent(display, 1, 1, 0)
    for step in range(1, 9):
        assert t.XTestFakeMotionEvent(display, 0, round(sx+(ex-sx)*step/8), round(sy+(ey-sy)*step/8), 0)
        x.XFlush(display)
        time.sleep(.04)
    assert t.XTestFakeButtonEvent(display, 1, 0, 0)
    if code:
        assert t.XTestFakeKeyEvent(display, code, 0, 0)
    x.XFlush(display)
    time.sleep(.4)


def numeric_value(name):
    control = wait_for(name)
    if 'Value' in control.get_interfaces():
        return float(Atspi.Value.get_current_value(control))
    return float(Atspi.Text.get_text(control, 0, -1))


def message_display(ident, expected):
    label = f'Trigger message object {ident}'
    observed = None
    for _ in range(50):
        try:
            button = wait_for(label)
            description = button.get_description()
            if description:
                observed = '' if description == 'Empty message' else description
            elif 'Text' in button.get_interfaces():
                observed = Atspi.Text.get_text(button, 0, -1)
            else:
                parts = []
                for child in walk(button):
                    if child == button:
                        continue
                    if 'Text' in child.get_interfaces():
                        parts.append(Atspi.Text.get_text(child, 0, -1))
                    elif child.get_role_name() in ('text', 'static'):
                        parts.append(child.get_name())
                observed = ''.join(parts) if parts else None
        except GLib.GError:
            time.sleep(.1)
            continue
        if observed == expected:
            return observed
        time.sleep(.1)
    nodes = []
    for item in walk(button.get_parent()):
        try:
            nodes.append({'name': item.get_name(), 'role': item.get_role_name(),
                          'description': item.get_description(),
                          'interfaces': list(item.get_interfaces()),
                          'text': Atspi.Text.get_text(item, 0, -1) if 'Text' in item.get_interfaces() else ''})
        except GLib.GError:
            continue
    (output/'message-display-failure.json').write_text(json.dumps(
        {'id': ident, 'expected': expected, 'observed': observed, 'nodes': nodes}, indent=2))
    root = Gdk.get_default_root_window()
    Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height()).savev(
        str(output/'message-display-failure.png'), 'png', [], [])
    raise AssertionError(f'MessageBox {ident} displayed {observed!r}, expected {expected!r}')


def native_revision_text():
    for _ in range(50):
        branch = wait_for('Native observations')
        for _ in range(4):
            branch = branch.get_parent()
            if branch is None:
                break
            for item in walk(branch):
                if 'Text' in item.get_interfaces():
                    value = Atspi.Text.get_text(item, 0, -1)
                    if re.fullmatch(r'Document \d+; active \d+; native r\d+\.', value):
                        return value
        time.sleep(.1)
    raise AssertionError('Native runtime revision was not exposed by diagnostics')


def message_box_scenario():
    # A graph reinstall would erase int 9's remembered77, while a stale face
    # would leave the saved template visible after silent runtime replacement.
    fixture = {'version': 1, 'profile': 'ultra-canvas-v1', 'nodes': [
        {'id': 1, 'type': 'message_box', 'x': 280, 'y': 235, 'params': {'text': 'saved $1 $2'}},
        {'id': 2, 'type': 'message', 'x': 70, 'y': 60, 'params': {'text': '6.25'}},
        {'id': 3, 'type': 'message', 'x': 230, 'y': 60, 'params': {'text': 'list 5 pear 2.25'}},
        {'id': 4, 'type': 'bang', 'x': 470, 'y': 60, 'params': {}},
        {'id': 5, 'type': 'message', 'x': 70, 'y': 130, 'params': {'text': 'set fresh'}},
        {'id': 6, 'type': 'message', 'x': 230, 'y': 130, 'params': {'text': 'set'}},
        {'id': 7, 'type': 'message', 'x': 470, 'y': 130, 'params': {'text': 'list 8 9'}},
        {'id': 8, 'type': 'print', 'x': 280, 'y': 310, 'params': {'label': 'message-ui'}},
        {'id': 9, 'type': 'int', 'x': 650, 'y': 235, 'params': {}},
        {'id': 10, 'type': 'message', 'x': 650, 'y': 60, 'params': {'text': '77'}},
        {'id': 11, 'type': 'number_int', 'x': 650, 'y': 310, 'params': {}},
        {'id': 12, 'type': 'bang', 'x': 650, 'y': 130, 'params': {}},
    ], 'edges': [
        {'from': source, 'outlet': 0, 'to': 1, 'inlet': inlet}
        for source, inlet in [(2, 1), (3, 1), (4, 1), (5, 0), (6, 0), (7, 0)]
    ] + [{'from': 1, 'outlet': 0, 'to': 8, 'inlet': 0},
         {'from': 10, 'outlet': 0, 'to': 9, 'inlet': 0},
         {'from': 12, 'outlet': 0, 'to': 9, 'inlet': 0},
         {'from': 9, 'outlet': 0, 'to': 11, 'inlet': 0}]}
    import_json(); text('Patch JSON', json.dumps(fixture)); click('Import JSON')
    click('Reset canvas view')
    authored = export()
    click('Inspector'); click('Native observations')
    original_revision = int(re.search(r'native r(\d+)\.', native_revision_text()).group(1))
    Atspi.Component.grab_focus(wait_for('Editable patch canvas')); keys('Control_L', 'e')
    click('Console')
    click('Clear')
    click('Trigger message.legacy object 10')
    assert numeric_value('number value, object 11') == 77
    message_display(1, 'saved $1 $2')
    for trigger, expected in [('Trigger message.legacy object 2', '6.25'),
                              ('Trigger message.legacy object 3', '5 pear 2.25'),
                              ('Trigger bang object 4', 'bang')]:
        click(trigger); message_display(1, expected)
        wait_for('Connect an outlet to print to see messages here. Audio can stay off.', text_content=True)
    click('Trigger message.legacy object 5'); message_display(1, 'fresh')
    wait_for('Connect an outlet to print to see messages here. Audio can stay off.', text_content=True)
    click('Trigger message.legacy object 7')
    wait_for('message-ui:'); wait_for('fresh', text_content=True); message_display(1, 'fresh')
    click('Clear')
    click('Trigger message.legacy object 6'); message_display(1, '')
    wait_for('Connect an outlet to print to see messages here. Audio can stay off.', text_content=True)
    click('Trigger message.legacy object 7'); time.sleep(.4)
    wait_for('Connect an outlet to print to see messages here. Audio can stay off.', text_content=True)
    assert export() == authored, 'Runtime cold/set replacement changed saved authoring text'

    def inline_text(value):
        click('Select or drag message object 1'); keys('Return')
        text('Object name and arguments', value); keys('Return')

    Atspi.Component.grab_focus(wait_for('Editable patch canvas')); keys('Control_L', 'e')
    inline_text('message saved $1 $2')
    message_display(1, 'saved $1 $2')
    wait_for('Connect an outlet to print to see messages here. Audio can stay off.', text_content=True)
    assert export() == authored, 'Same-text restore changed canonical content'
    Atspi.Component.grab_focus(wait_for('Editable patch canvas')); keys('Control_L', 'e')
    click('Trigger message.legacy object 7')
    wait_for('saved 8 9', text_content=True); message_display(1, 'saved $1 $2')
    click('Clear')
    Atspi.Component.grab_focus(wait_for('Editable patch canvas')); keys('Control_L', 'e')
    inline_text('message edited $1 $2')
    message_display(1, 'edited $1 $2')
    wait_for('Connect an outlet to print to see messages here. Audio can stay off.', text_content=True)
    changed = export()
    assert next(node for node in changed['nodes'] if node['id'] == 1)['params']['text'] == 'edited $1 $2'
    Atspi.Component.grab_focus(wait_for('Editable patch canvas')); keys('Control_L', 'e')
    click('Trigger message.legacy object 7')
    wait_for('edited 8 9', text_content=True); message_display(1, 'edited $1 $2')
    click('Trigger bang object 12')
    assert numeric_value('number value, object 11') == 77, 'Message text edit reset unrelated int state'
    assert int(re.search(r'native r(\d+)\.', native_revision_text()).group(1)) == original_revision, 'Message text edit reinstalled the graph'
    Atspi.Component.grab_focus(wait_for('Editable patch canvas')); keys('Control_L', 'e')
    click('Undo'); message_display(1, 'saved $1 $2')
    assert export() == authored, 'MessageBox undo did not restore saved text'
    assert int(re.search(r'native r(\d+)\.', native_revision_text()).group(1)) == original_revision, 'Message text history reinstalled the graph'
    root = Gdk.get_default_root_window()
    Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height()).savev(str(output/'native-message-ui.png'), 'png', [], [])
    click('Close console'); click('Close panel')
    return {'cold_displays': ['6.25', '5 pear 2.25', 'bang'], 'hot_set_display': 'fresh',
            'bare_set_clears_and_suppresses': True, 'substituted_output': 'edited 8 9',
            'literal_template_display': True, 'runtime_keeps_authored_text': True,
            'physical_inline_same_text_restore': True, 'physical_inline_edit_and_undo': True,
            'preserved_runtime_revision': original_revision, 'unrelated_int_recalled': 77}


def print_popup_scenario():
    fixture = {'version': 1, 'profile': 'ultra-canvas-v1', 'nodes': [
        {'id': 1, 'type': 'message', 'x': 70, 'y': 70, 'params': {'text': 'list 3.5 <native> 7'}},
        {'id': 2, 'type': 'message', 'x': 330, 'y': 70, 'params': {'text': 'popup 0'}},
        {'id': 3, 'type': 'bang', 'x': 560, 'y': 70, 'params': {}},
        {'id': 4, 'type': 'print', 'x': 70, 'y': 200, 'params': {'label': 'popup-off'}},
        {'id': 5, 'type': 'print', 'x': 330, 'y': 200, 'params': {'label': 'popup-first', 'popup': 1}},
        {'id': 6, 'type': 'print', 'x': 560, 'y': 200, 'params': {'label': 'popup-second', 'popup': 1}},
    ], 'edges': [{'from': source, 'outlet': 0, 'to': target, 'inlet': 0}
                 for source, target in [(1, 4), (1, 5), (2, 5), (3, 6)]]}
    import_json(); text('Patch JSON', json.dumps(fixture)); click('Import JSON')
    click('Reset canvas view')
    authored = export()
    assert next(node for node in authored['nodes'] if node['id'] == 4)['params']['popup'] == 0
    click('Inspector')
    if not wait_for('Native observations').get_state_set().contains(Atspi.StateType.EXPANDED):
        click('Native observations')
    original_revision = int(re.search(r'native r(\d+)\.', native_revision_text()).group(1))
    popup_trace = []
    diagnostic_capture = os.environ.get('ULTRA_TEST_PRINT_POPUP_DIAGNOSTIC') == '1'

    def showing(name):
        try:
            return find(name).get_state_set().contains(Atspi.StateType.SHOWING)
        except (StopIteration, GLib.GError):
            return False

    def popup_value(ident):
        try:
            status = find(f'Print output, object {ident}')
            visible = status.get_state_set().contains(Atspi.StateType.SHOWING)
            value = status.get_description()
            popup_trace.append({'time': time.monotonic(), 'id': ident, 'showing': visible,
                                'description': value, 'role': status.get_role_name()})
            if visible:
                return value
        except (StopIteration, GLib.GError) as error:
            popup_trace.append({'time': time.monotonic(), 'id': ident, 'missing': str(error)})
        return None

    def wait_popup(ident, expected, timeout=2):
        nonlocal diagnostic_capture
        if diagnostic_capture:
            diagnostic_capture = False
            root = Gdk.get_default_root_window()
            Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height()).savev(
                str(output/'print-popup-first-poll.png'), 'png', [], [])
            nodes = []
            for app in desktop_apps():
                if app.get_process_id() != pid:
                    continue
                for item in walk(app):
                    try:
                        nodes.append({'name': item.get_name(), 'role': item.get_role_name(),
                                      'description': item.get_description(),
                                      'showing': item.get_state_set().contains(Atspi.StateType.SHOWING),
                                      'text': Atspi.Text.get_text(item, 0, -1) if 'Text' in item.get_interfaces() else ''})
                    except GLib.GError:
                        continue
            (output/'print-popup-first-poll.json').write_text(json.dumps(
                {'time': time.monotonic(), 'trigger_started_at': trigger_started_at, 'nodes': nodes}, indent=2))
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            observed = popup_value(ident)
            if observed == expected:
                return
            time.sleep(.05)
        root = Gdk.get_default_root_window()
        Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height()).savev(
            str(output/'print-popup-failure.png'), 'png', [], [])
        (output/'print-popup-failure.json').write_text(json.dumps(
            {'expected': expected, 'id': ident, 'trigger_started_at': trigger_started_at, 'trace': popup_trace}, indent=2))
        raise AssertionError(f'Print {ident} popup displayed {observed!r}, expected {expected!r}')

    def double_click(name):
        target = wait_for(name)
        Atspi.Component.grab_focus(target)
        rect = Atspi.Component.get_extents(target, Atspi.CoordType.SCREEN)
        assert rect.width > 0 and rect.height > 0, name
        assert t.XTestFakeMotionEvent(display, 0, rect.x + rect.width // 2, rect.y + rect.height // 2, 0)
        for _ in range(2):
            assert t.XTestFakeButtonEvent(display, 1, 1, 0)
            assert t.XTestFakeButtonEvent(display, 1, 0, 0)
            x.XFlush(display)
            time.sleep(.07)

    Atspi.Component.grab_focus(wait_for('Editable patch canvas')); keys('Control_L', 'e')
    assert wait_for('Start audio').get_state_set().contains(Atspi.StateType.ENABLED)
    assert not showing('Close console')
    trigger_started_at = time.monotonic()
    click('Trigger message.legacy object 1'); wait_popup(5, 'list 3.5 <native> 7')
    assert popup_value(4) is None, 'Default-off Print created a popup'
    assert not showing('Close console'), 'Popup receipt opened the console'
    double_click('Select or drag print object 4')
    wait_for('popup-off:'); wait_for('popup-first:'); wait_for('list 3.5 <native> 7', text_content=True)
    assert showing('Close console'), 'Locked Print double-click did not open the console'
    click('Close console')

    click('Trigger message.legacy object 1'); wait_popup(5, 'list 3.5 <native> 7')
    click('Trigger bang object 3'); wait_popup(6, 'bang')
    click_control('Editable patch canvas', .8, .8)
    assert popup_value(5) == 'list 3.5 <native> 7' and popup_value(6) == 'bang', 'Print popups interfered or blank input dismissed them'
    assert not showing('Close console'), 'Independent Print receipt opened the console'
    root = Gdk.get_default_root_window()
    Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height()).savev(
        str(output/'native-print-popup.png'), 'png', [], [])
    deadline = time.monotonic() + 3
    while popup_value(5) is not None or popup_value(6) is not None:
        assert time.monotonic() < deadline, 'DSP-off Print popup did not expire'
        time.sleep(.05)
    time.sleep(.3)
    assert popup_value(5) is None and popup_value(6) is None, 'Repeated native polling resurrected an expired popup'
    assert wait_for('Start audio').get_state_set().contains(Atspi.StateType.ENABLED)

    click('Trigger message.legacy object 1'); wait_popup(5, 'list 3.5 <native> 7')
    Atspi.Component.grab_focus(wait_for('Editable patch canvas')); keys('Control_L', 'e')
    click('Select or drag print object 5')
    Atspi.Component.grab_focus(wait_for('print popup, selected object 5')); keys('Home'); keys('Return')
    wait_popup(5, None, timeout=.5)
    Atspi.Component.grab_focus(wait_for('print popup, selected object 5')); keys('End'); keys('Return')
    time.sleep(.3)
    assert popup_value(5) is None, 'Inspector reenabling resurrected the previous receipt'
    assert int(re.search(r'native r(\d+)\.', native_revision_text()).group(1)) == original_revision, 'Popup attribute edit reinstalled the graph'
    assert export() == authored, 'Popup disable/reenable changed unrelated authoring state'
    Atspi.Component.grab_focus(wait_for('Editable patch canvas')); keys('Control_L', 'e')
    click('Trigger message.legacy object 2'); wait_popup(5, 'popup 0')
    assert not showing('Close console'), 'Ordinary popup selector opened the console'
    click('Console'); wait_for('popup-first:'); wait_for('popup 0', text_content=True)
    click('Clear'); click('Close console'); click('Close panel')
    Atspi.Component.grab_focus(wait_for('Editable patch canvas')); keys('Control_L', 'e')
    return {'default_off_logged_without_popup': True, 'typed_popup_and_console': 'list 3.5 <native> 7',
            'independent_prints': True, 'blank_input_keeps_popups': True, 'dsp_off_expiry': True,
            'inspector_disable_and_reenable_without_resurrection': True, 'ordinary_popup_selector': 'popup 0',
            'receipt_keeps_console_closed': True, 'locked_double_click_opens_console': True,
            'preserved_runtime_revision': original_revision}



def run():
    try:
        wait_for('Start audio')
        Atspi.Component.grab_focus(wait_for('Editable patch canvas'))
        # The native app opens an empty .ultra file from argv in this private session.
        keys('n')
        text('Object name and arguments', '+ 7')
        keys('Return')
        patch = export()
        assert (len(patch['nodes']) == 1 and patch['nodes'][0]['type'] == 'add'
                and patch['nodes'][0]['params'].get('rhs') == 7
                and patch['nodes'][0]['params'].get('numericmode') == 1), patch
        object_id = patch['nodes'][0]['id']
        keys('Return')
        text('Object name and arguments', '* 2')
        keys('Return')
        changed = export()
        assert changed['nodes'][0]['id'] == object_id and changed['nodes'][0]['type'] == 'multiply'
        keys('Control_L', 'z')
        assert export() == patch
        keys('Control_L', 'e')
        keys('n')
        assert export() == patch, 'Locked creation changed the document'
        keys('Control_L', 'e')

        # Real X input checks WebKit pointer capture and the native apply boundary.
        wiring = {'version': 1, 'profile': 'ultra-canvas-v1', 'nodes': [
            {'id': 1, 'type': 'add', 'x': 80, 'y': 80, 'params': {'rhs': 0}},
            {'id': 2, 'type': 'number', 'x': 300, 'y': 240, 'params': {'value': 0}},
        ], 'edges': []}
        import_json()
        text('Patch JSON', json.dumps(wiring))
        click('Import JSON')
        source = '+ 1, Outlet 0: Sum (control)'
        target = 'number.legacy 2, Inlet 0: Value (control)'
        drag_port(source, target, y_offset=9)
        connected = export()
        assert connected['edges'] == [{'from': 1, 'outlet': 0, 'to': 2, 'inlet': 0}], 'Native cord drag failed'
        assert connected['nodes'] == wiring['nodes'], 'Wiring moved the objects'
        keys('Control_L', 'z')
        assert export() == wiring, 'Cord undo changed another part of the patch'
        drag_port(target, source)
        assert export() == connected, 'Native reverse cord drag failed'
        keys('Control_L', 'z')
        click(source)
        click(target)
        assert export() == connected, 'Native click-to-connect regressed'
        (output/'wiring.ultra.json').write_text(json.dumps(connected, indent=2)+'\n')

        controls = {'version': 1, 'profile': 'ultra-canvas-v1', 'nodes': [
            {'id': 1, 'type': 'toggle', 'x': 80, 'y': 60, 'params': {}},
            {'id': 2, 'type': 'bang', 'x': 160, 'y': 60, 'params': {}},
            {'id': 3, 'type': 'number', 'x': 80, 'y': 220, 'params': {}},
            {'id': 4, 'type': 'slider', 'x': 300, 'y': 60, 'params': {},
             'style': {'width': 30, 'height': 120, 'orientation': 2, 'knobcolor': [.8, .4, .2, 1]}},
            {'id': 5, 'type': 'flonum', 'x': 450, 'y': 60, 'params': {'value': 1.25}},
            {'id': 6, 'type': 'int', 'x': 160, 'y': 140, 'params': {'value': 37}},
            {'id': 7, 'type': 'number_int', 'x': 450, 'y': 140, 'params': {'minimum': -10, 'maximum': 10}},
            {'id': 8, 'type': 'print', 'x': 450, 'y': 250, 'params': {'label': 'physical-tab'}},
            {'id': 9, 'type': 'message', 'x': 600, 'y': 60, 'params': {'text': '-3.9'}},
            {'id': 10, 'type': 'message', 'x': 600, 'y': 140, 'params': {'text': 'tab'}},
        ], 'edges': [{'from': 1, 'outlet': 0, 'to': 3, 'inlet': 0},
                     {'from': 2, 'outlet': 0, 'to': 6, 'inlet': 0},
                     {'from': 6, 'outlet': 0, 'to': 3, 'inlet': 0},
                     {'from': 4, 'outlet': 0, 'to': 3, 'inlet': 0},
                     {'from': 7, 'outlet': 1, 'to': 8, 'inlet': 0},
                     {'from': 5, 'outlet': 1, 'to': 8, 'inlet': 0},
                     {'from': 9, 'outlet': 0, 'to': 7, 'inlet': 0},
                     {'from': 10, 'outlet': 0, 'to': 7, 'inlet': 0}]}
        import_json()
        text('Patch JSON', json.dumps(controls))
        click('Import JSON')
        Atspi.Component.grab_focus(wait_for('Editable patch canvas'))
        keys('Control_L', 'e')
        # Exercise the face next to each old connection-notch collision with real X input.
        click_control('Trigger toggle object 1', .2, .1)
        assert numeric_value('number.legacy value, object 3') == 1, 'Toggle top face failed'
        click_control('Trigger toggle object 1', .2, .9)
        assert numeric_value('number.legacy value, object 3') == 0, 'Toggle bottom face failed'
        click_control('Trigger bang object 2', .2, .1)
        assert numeric_value('number.legacy value, object 3') == 37, 'Button face did not emit through native int'
        drag_control('slider value, object 4', (.5, .9), (.5, .1))
        assert numeric_value('number.legacy value, object 3') > 110, 'Locked vertical slider did not emit'
        Atspi.Component.grab_focus(wait_for('Editable patch canvas'))
        keys('Control_L', 'e')
        drag_control('slider value, object 4', (.5, .1), (.5, .8), 'Control_L')
        assert 15 < numeric_value('number.legacy value, object 3') < 40, 'Temporary edit-mode slider did not emit'
        drag_control('number.legacy value, object 3', (.5, .5), (.5, -.5), 'Control_L')
        assert numeric_value('number.legacy value, object 3') > 40, 'Number face did not drag'
        (output/'controls.ultra.json').write_text(json.dumps(export(), indent=2)+'\n')

        Atspi.Component.grab_focus(wait_for('Editable patch canvas'))
        keys('Control_L', 'e')
        click('Console')
        click('Trigger message.legacy object 9')
        assert numeric_value('number value, object 7') == -3, 'Integer box did not truncate incoming float'
        click('Clear')
        click('Trigger message.legacy object 10')
        time.sleep(.4)
        try:
            find('physical-tab:')
        except StopIteration:
            pass
        else:
            raise AssertionError('Incoming selector tab emitted a physical Tab bang')
        for name in ['number value, object 7', 'flonum value, object 5']:
            click_control(name, .5, .5)
            keys('Tab')
            wait_for('physical-tab:')
            wait_for('bang', text_content=True)
            click('Clear')
        click_control('number value, object 7', .5, .5)
        keys('Control_L', 'a')
        for key in ['minus', '4', 'period', '9']:
            keys(key)
        keys('Tab')
        wait_for('physical-tab:')
        assert numeric_value('number value, object 7') == -4, 'Integer text entry did not truncate toward zero'
        authored_numeric = next(node for node in export()['nodes'] if node['id'] == 7)
        assert authored_numeric['params']['value'] == -4, 'Integer text entry did not reach shared authoring admission'
        numeric_ui = {'incoming_float': -3, 'direct_entry': -4,
                      'physical_tab_number_and_flonum': True, 'incoming_tab_selector_silent': True}
        root = Gdk.get_default_root_window()
        Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height()).savev(str(output/'native-numeric-ui.png'), 'png', [], [])
        click('Close console')
        Atspi.Component.grab_focus(wait_for('Editable patch canvas'))
        keys('Control_L', 'e')

        message_ui = message_box_scenario()
        print_popups = print_popup_scenario()

        max_help = Path(os.environ.get('ULTRA_TEST_MAX_HELP', '/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources/help/max/slider.maxhelp'))
        imported_help = {'tested': False, 'reason': 'Installed licensed slider.maxhelp is unavailable'}
        if max_help.is_file():
            import_json()
            text('Patch JSON', max_help.read_text())
            click('Import JSON')
            wait_for('Max patcher or help tab')
            click('Allow partial import with the listed omissions and behavior differences')
            click('Import supported portion')
            converted = export()
            assert len(converted['nodes']) == 16 and len(converted['edges']) == 10
            Atspi.Component.grab_focus(wait_for('Editable patch canvas'))
            keys('Control_L', 'e')
            drag_control('slider value, object 4', (.1, .5), (.75, .5))
            first = numeric_value('number value, object 9')
            assert 80 < first < 110, 'Imported installed slider branch did not run through Tauri'
            drag_control('slider value, object 4', (.75, .5), (.2, .5))
            second = numeric_value('number value, object 9')
            assert 15 < second < 40, 'Imported installed slider branch did not update'
            imported_help = {'tested': True, 'source': str(max_help), 'partial': True,
                             'selected_tab': 'basic', 'imported_nodes': 16, 'imported_edges': 10,
                             'native_downstream_values': [first, second],
                             'whole_help_executed': False}
            (output/'imported-slider.ultra.json').write_text(json.dumps(converted, indent=2)+'\n')
            Atspi.Component.grab_focus(wait_for('Editable patch canvas'))
            keys('Control_L', 'e')

        # Exercise the actual native print queue through the shipped console surface.
        import_json()
        text('Patch JSON', Path('apps/ultra/examples/print.ultra').read_text())
        click('Import JSON')
        # The installed help fixture retains its camera; reset before physical input.
        click('Reset canvas view')
        Atspi.Component.grab_focus(wait_for('Editable patch canvas'))
        keys('Control_L', 'e')
        click('Console')
        click('Trigger message object 1')
        wait_for('notes:')
        wait_for('note 60 100', text_content=True)
        drag_control('slider value, object 3', (.1, .5), (.75, .5))
        wait_for('position:')
        root = Gdk.get_default_root_window()
        Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height()).savev(str(output/'native-console.png'), 'png', [], [])
        click('Clear')
        wait_for('Connect an outlet to print to see messages here. Audio can stay off.', text_content=True)
        click('Close console')
        Atspi.Component.grab_focus(wait_for('Editable patch canvas'))
        keys('Control_L', 'e')

        # Reopen a complete authored patch through the shipped JSON dialog.
        starter = json.loads(Path('apps/ultra/ui/canvas-preset.json').read_text())
        for n in starter['nodes']:
            if n['type'] == 'gain':
                n['params']['value'] = 4
        starter['nodes'].append({'id':17,'type':'print','x':640,'y':230,'params':{'label':'running','level':0,'popup':0}})
        starter['edges'].append({'from':14,'outlet':0,'to':17,'inlet':0})
        Atspi.Component.grab_focus(wait_for('Editable patch canvas'))
        import_json()
        text('Patch JSON', json.dumps(starter))
        click('Import JSON')
        click('Reset canvas view')
        assert export() == starter
        (output/'roundtrip.ultra.json').write_text(json.dumps(starter, indent=2)+'\n')
        keys('Control_L', 'e')
        click('Audio settings')
        wait_for('Save settings')
        time.sleep(.4)
        Atspi.Component.grab_focus(wait_for('Buffer / period'))
        keys('Home')
        for _ in range(5):
            keys('Down')
        keys('Return')
        keys('Escape')
        click('Save settings')
        for _ in range(40):
            settings = list(Path(os.environ['XDG_DATA_HOME']).rglob('audio-settings.json'))
            if settings: break
            time.sleep(.1)
        if not settings:
            names = []
            for root in desktop_apps():
                try:
                    if root.get_process_id() != pid: continue
                    for a in walk(root):
                        try:
                            names.append({'name':a.get_name(),'text':Atspi.Text.get_text(a,0,-1) if 'Text' in a.get_interfaces() else ''})
                        except GLib.GError: pass
                except GLib.GError: pass
            (output/'settings-failure.json').write_text(json.dumps(names,indent=2))
            root = Gdk.get_default_root_window()
            Gdk.pixbuf_get_from_window(root,0,0,root.get_width(),root.get_height()).savev(str(output/'settings-failure.png'),'png',[],[])
        assert len(settings) == 1, settings
        config = json.loads(settings[0].read_text())
        assert config['sample_rate'] == 48000 and config['buffer_frames'] == 512, config
        click('Save & start audio')
        time.sleep(.6)
        assert not wait_for('Start audio').get_state_set().contains(Atspi.StateType.ENABLED)
        root = Gdk.get_default_root_window()
        image = Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height())
        image.savev(str(output/'native-audio-settings.png'), 'png', [], [])
        click('Close panel')
        click('Console')
        capture = output/'canvas-message.f32'
        probe = subprocess.Popen(['pw-cat', '--record', '--raw', '--rate=48000', '--format=f32', '--channels=2', '--target=0', '--sample-count=96000', '--properties={ node.name = Ultra-Canvas-Capture }', str(capture)],
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            for _ in range(40):
                ports = subprocess.check_output(['pw-link','-i'],text=True)
                if 'Ultra-Canvas-Capture:input_FL' in ports: break
                time.sleep(.1)
            subprocess.run(['pw-link','Ultra-Software-Output:monitor_FL','Ultra-Canvas-Capture:input_FL'],check=True)
            subprocess.run(['pw-link','Ultra-Software-Output:monitor_FR','Ultra-Canvas-Capture:input_FR'],check=True)
            click('Trigger bang object 13')
            wait_for('running:')
            stdout, stderr = probe.communicate(timeout=8)
        finally:
            if probe.poll() is None:
                probe.terminate()
                probe.communicate(timeout=2)
        assert probe.returncode in (0,1) and not stderr, stdout+stderr
        samples = array.array('f')
        samples.frombytes(capture.read_bytes())
        assert len(samples) == 96000*2 and all(math.isfinite(v) for v in samples)
        left, right = samples[::2], samples[1::2]
        assert max(map(abs, left)) > 1e-5, 'Connected native bang/message path is silent'
        assert all(v == 0 for v in right), 'Untriggered MIDI voice sounded'
        assert all(v == 0 for v in left[-4096:]), 'Delayed note-off failed'
        click('Stop patch')
        click('Stop audio')
        click('Close console')
        keys('Control_L', 'e')
        # One confirmation capture of the actual built desktop surface.
        root = Gdk.get_default_root_window()
        image = Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height())
        image.savev(str(output/'native-canvas.png'), 'png', [], [])
        result = {'status': 'passed', 'scope': 'built Tauri canvas + real Rust CPAL device output',
                  'audio_environment': os.environ['ULTRA_TEST_AUDIO_SCOPE'],
                  'keyboard_create_edit_undo_lock': True, 'json_roundtrip': True,
                  'control_face_and_numeric_drag': True, 'numeric_ui': numeric_ui, 'message_ui': message_ui,
                  'print_popups': print_popups,
                  'installed_max_help': imported_help,
                  'native_print_console_with_audio_off': True,
                  'native_print_console_with_audio_on': True,
                  'message_path_left_peak': max(map(abs, left)), 'untriggered_right_peak': 0,
                  'note_off_tail_peak': 0, 'capture_frames': len(samples)//2, 'saved_audio_config': config,
                  'limits': ['No hardware MIDI or latency qualification', 'No Max DSP equivalence claim']}
        (output/'result.json').write_text(json.dumps(result, indent=2)+'\n')
        print(json.dumps(result, indent=2))
    finally:
        x.XCloseDisplay(display)


if __name__ == "__main__":
    run()
