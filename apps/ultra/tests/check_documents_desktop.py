#!/usr/bin/env python3
"""Native file/window/message tests using the real app in the private session."""
import array
import ctypes as C
import json
import math
import os
from pathlib import Path
import re
import subprocess
import time

import check_canvas_desktop as ui
from gi.repository import Atspi
from gi.repository import GLib

output = ui.output
binary = Path('apps/ultra/src-tauri/target/release/ultra').resolve()
scope = ''
accessibility_transients = []
private_help_reference = False
ui.x.XDefaultRootWindow.argtypes = [C.c_void_p]
ui.x.XDefaultRootWindow.restype = C.c_ulong
ui.x.XQueryTree.argtypes = [C.c_void_p, C.c_ulong, C.POINTER(C.c_ulong), C.POINTER(C.c_ulong), C.POINTER(C.POINTER(C.c_ulong)), C.POINTER(C.c_uint)]
ui.x.XFetchName.argtypes = [C.c_void_p, C.c_ulong, C.POINTER(C.c_char_p)]
ui.x.XRaiseWindow.argtypes = [C.c_void_p, C.c_ulong]
ui.x.XMoveWindow.argtypes = [C.c_void_p, C.c_ulong, C.c_int, C.c_int]
ui.x.XResizeWindow.argtypes = [C.c_void_p, C.c_ulong, C.c_uint, C.c_uint]
ui.x.XSetInputFocus.argtypes = [C.c_void_p, C.c_ulong, C.c_int, C.c_ulong]
ui.x.XGetInputFocus.argtypes = [C.c_void_p, C.POINTER(C.c_ulong), C.POINTER(C.c_int)]
ui.x.XFree.argtypes = [C.c_void_p]


def app_frames():
    frames = []
    for root in ui.desktop_apps():
        try:
            if root.get_process_id() != ui.pid: continue
            for node in [root.get_child_at_index(i) for i in range(root.get_child_count())]:
                try:
                    if node.get_role_name() in ('frame', 'dialog', 'file chooser', 'alert'):
                        if node not in frames:
                            frames.append(node)
                except GLib.GError:
                    continue
        except GLib.GError:
            continue
    return frames


def scoped_find(name, text_content=False):
    roots = [frame for frame in app_frames() if frame.get_name().removeprefix('* ') == scope
             or (frame.get_role_name() in ('alert', 'dialog')
                 and any(child.get_name() == scope for child in ui.walk(frame)))]
    for frame in roots:
        for node in ui.walk(frame):
            try:
                if name == 'Native filename entry' and 'EditableText' in node.get_interfaces():
                    # GTK also exposes hidden rename/new-folder entries. Wait for
                    # the path shortcut to reveal and focus the actual location entry.
                    states = node.get_state_set()
                    if states.contains(Atspi.StateType.SHOWING) and states.contains(Atspi.StateType.FOCUSED):
                        return node
                if node.get_name() == name or (text_content and 'Text' in node.get_interfaces()
                                              and Atspi.Text.get_text(node, 0, -1) == name):
                    return node
            except GLib.GError as error:
                # Re-rendering can remove an accessible after walk snapshots it.
                if len(accessibility_transients) < 16:
                    try:
                        os.kill(ui.pid, 0)
                        alive = True
                    except ProcessLookupError:
                        alive = False
                    accessibility_transients.append({'scope': scope, 'control': name, 'app_alive': alive,
                                                     'error': str(error)})
                    (output / 'native-accessibility-transients.json').write_text(json.dumps(accessibility_transients, indent=2))
                continue
    raise StopIteration(name)


ui.find = scoped_find


def focus(title):
    global scope
    scope = title
    for _ in range(80):
        root = C.c_ulong(); parent = C.c_ulong(); children = C.POINTER(C.c_ulong)(); count = C.c_uint()
        ui.x.XQueryTree(ui.display, ui.x.XDefaultRootWindow(ui.display), C.byref(root), C.byref(parent), C.byref(children), C.byref(count))
        matched = None
        try:
            for index in range(count.value):
                name = C.c_char_p()
                if ui.x.XFetchName(ui.display, children[index], C.byref(name)) and name.value:
                    text = name.value.decode('utf-8', errors='replace').removeprefix('* ')
                    ui.x.XFree(name)
                    if text == title:
                        matched = children[index]
                        break
        finally:
            if children: ui.x.XFree(children)
        if matched:
            # This private X server has no window manager to keep cascaded
            # windows and native chooser buttons inside the test display.
            ui.x.XMoveWindow(ui.display, matched, 0, 0)
            if title == 'Open Patch':
                ui.x.XResizeWindow(ui.display, matched, 1000, 740)
            ui.x.XRaiseWindow(ui.display, matched)
            ui.x.XSetInputFocus(ui.display, matched, 2, 0)
            ui.x.XFlush(ui.display)
            time.sleep(.2)
            return
        time.sleep(.1)
    if private_help_reference:
        raise AssertionError('Native help window did not open: ' + title)
    details = [{'name': child.get_name(), 'role': child.get_role_name(),
                'interfaces': list(child.get_interfaces())}
               for frame in app_frames() for child in ui.walk(frame)]
    (output / 'native-focus-failure.json').write_text(json.dumps({'title': title, 'nodes': details}, indent=2))
    root = ui.Gdk.get_default_root_window()
    ui.Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height()).savev(str(output/'native-focus-failure.png'), 'png', [], [])
    raise AssertionError('Native window did not open: ' + title)


def open_file(path):
    assert (binary.parent / 'libultra_native.so').is_file(), 'Build the adjacent native library first'
    env = {**os.environ, 'LD_LIBRARY_PATH': os.pathsep.join(filter(None,
        [str(binary.parent), os.environ.get('LD_LIBRARY_PATH')]))}
    result = subprocess.run([str(binary), str(path.resolve())], env=env, capture_output=True, text=True, timeout=12)
    assert result.returncode == 0, f'File delivery exited {result.returncode}: {result.stderr}'
    focus(path.name + ' - Ultra')
    ui.wait_for('Editable patch canvas')
    time.sleep(.3)
    assert Atspi.Component.grab_focus(ui.wait_for('Editable patch canvas'))


def native_menu(action):
    ui.click('File')
    control = ui.wait_for(action)
    # Grabbing accessibility focus on a GTK menu item can consume the following
    # mouse activation. Activate its native accessible action directly.
    assert 'Action' in control.get_interfaces(), action
    assert Atspi.Action.do_action(control, 0), action
    time.sleep(.2)


def write_patch(name, nodes, edges):
    path = output / name
    path.write_text(json.dumps({'version': 1, 'profile': 'ultra-canvas-v1', 'nodes': nodes, 'edges': edges}) + '\n')
    return path


def node(number, kind, params, x=70, y=70):
    return {'id': number, 'type': kind, 'x': x, 'y': y, 'params': params}


def edge(source, destination, inlet=0):
    return {'from': source, 'outlet': 0, 'to': destination, 'inlet': inlet}


def capture(name):
    path = output / name
    process = subprocess.Popen(['pw-cat', '--record', '--raw', '--rate=48000', '--format=f32', '--channels=2', '--target=0', '--sample-count=48000', '--properties={ node.name = Ultra-Documents-Capture }', str(path)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        for _ in range(40):
            if 'Ultra-Documents-Capture:input_FL' in subprocess.check_output(['pw-link', '-i'], text=True): break
            time.sleep(.1)
        for channel in ('FL', 'FR'):
            subprocess.run(['pw-link', 'Ultra-Software-Output:monitor_' + channel, 'Ultra-Documents-Capture:input_' + channel], check=True)
        stdout, stderr = process.communicate(timeout=8)
        assert process.returncode in (0, 1) and not stderr, stdout + stderr
    finally:
        if process.poll() is None:
            process.terminate(); process.communicate(timeout=2)
    samples = array.array('f'); samples.frombytes(path.read_bytes())
    assert len(samples) == 96000 and all(math.isfinite(value) for value in samples)
    return max(map(abs, samples[::2])), max(map(abs, samples[1::2]))


def hierarchy_scenario(signal_document, other_signal_document):
    control = node(3, 'patcher', {'name': 'control boundary'}, y=155)
    control['patcher'] = {
        'nodes': [node(10, 'inlet', {}, y=45), node(11, 'add', {'rhs': 10}, y=115),
                  node(13, 'number', {}, y=185), node(12, 'outlet', {}, y=255),
                  node(14, 'comment', {'text': 'Original native hierarchy probe.'}, x=250, y=45),
                  node(15, 'print', {'label': 'hierarchy-child'}, x=250, y=185),
                  node(16, 'message_box', {'text': 'saved $1 $2'}, x=420, y=270),
                  node(17, 'inlet', {}, x=420, y=110)],
        'edges': [edge(10, 11), edge(11, 13), edge(13, 12), edge(13, 15), edge(17, 16, 1)],
    }
    signal = node(7, 'patcher', {'name': 'signal boundary'}, x=430, y=155)
    signal['patcher'] = {'nodes': [node(20, 'inlet', {}, y=45), node(21, 'outlet', {}, y=155)],
                         'edges': [edge(20, 21)]}
    patch = {
        'version': 2, 'profile': 'ultra-patcher-v2',
        'nodes': [node(1, 'message', {'text': '7'}), node(2, 'message', {'text': '9'}, x=220),
                  control, node(4, 'number', {}, y=245),
                  node(5, 'print', {'label': 'hierarchy-control'}, x=220, y=245),
                  node(6, 'sig', {'args': '0.0625'}, x=430), signal,
                  node(8, 'signal_dac', {'channels': '1 2'}, x=430, y=245),
                  node(9, 'sig', {'args': '0.03125'}, x=610),
                  node(22, 'message_box', {'text': 'saved $1 $2'}, x=650, y=360),
                  node(23, 'message', {'text': 'list 5 pear 2.25'}, x=650, y=290)],
        'edges': [edge(1, 3), edge(2, 3), edge(3, 4), edge(3, 5),
                  edge(6, 7), edge(7, 8), edge(9, 8, 1), edge(23, 22, 1), edge(23, 3, 1)],
    }
    path = output / 'hierarchy.ultra'
    path.write_text(json.dumps(patch) + '\n')
    open_file(path)
    ui.keys('Control_L', 'e'); ui.click('Console')

    def number_value(ident, expected):
        for _ in range(50):
            observed = ui.numeric_value(f'number.legacy value, object {ident}')
            if observed == expected:
                return observed
            time.sleep(.1)
        raise AssertionError(f'Hierarchy number {ident}: {observed}, expected {expected}')

    def trigger_controls():
        for message, expected in [(1, 17), (2, 19)]:
            ui.click(f'Trigger message.legacy object {message}')
            ui.wait_for('hierarchy-control:')
            ui.wait_for(str(expected), text_content=True)
            number_value(4, expected)

    def revision_text():
        for _ in range(50):
            for frame in app_frames():
                if frame.get_name().removeprefix('* ') != scope:
                    continue
                for item in ui.walk(frame):
                    if 'Text' in item.get_interfaces():
                        value = Atspi.Text.get_text(item, 0, -1)
                        if re.fullmatch(r'Document \d+; active \d+; native r\d+\.', value):
                            return value
            time.sleep(.1)
        raise AssertionError('Hierarchy native revision was not exposed by diagnostics')

    root_title = path.name + ' - Ultra'
    child_titles = {}
    navigation_attempts = []

    def titles():
        return [frame.get_name().removeprefix('* ') for frame in app_frames()]

    def wait_closed(*closed_titles):
        for _ in range(80):
            if all(title not in titles() for title in closed_titles):
                return
            time.sleep(.1)
        raise AssertionError(f'Native views did not close: {closed_titles}; remaining {titles()}')

    def show_inspector():
        try:
            visible = ui.find('Close panel').get_state_set().contains(Atspi.StateType.SHOWING)
        except StopIteration:
            visible = False
        if not visible:
            ui.click('Inspector')

    def diagnostics():
        show_inspector()
        if not ui.wait_for('Native observations').get_state_set().contains(Atspi.StateType.EXPANDED):
            ui.click('Native observations')
        return revision_text()

    def runtime_revision():
        return int(re.search(r'native r(\d+)\.', revision_text()).group(1))

    def double_click(name):
        target = ui.wait_for(name)
        rect = Atspi.Component.get_extents(target, Atspi.CoordType.SCREEN)
        assert rect.width > 0 and rect.height > 0, name
        focused = C.c_ulong(); revert = C.c_int(); focused_name = C.c_char_p()
        ui.x.XGetInputFocus(ui.display, C.byref(focused), C.byref(revert))
        focused_title = None
        if focused.value > 1 and ui.x.XFetchName(ui.display, focused.value, C.byref(focused_name)) and focused_name.value:
            focused_title = focused_name.value.decode('utf-8', errors='replace')
            ui.x.XFree(focused_name)
        navigation_attempts.append({'name': name, 'showing': target.get_state_set().contains(Atspi.StateType.SHOWING),
                                    'rect': {'x': rect.x, 'y': rect.y, 'width': rect.width, 'height': rect.height},
                                    'focused_window': focused_title, 'time': time.monotonic()})
        (output/'native-child-navigation.json').write_text(json.dumps(navigation_attempts, indent=2))
        if name == 'Select or drag p object 7':
            root = ui.Gdk.get_default_root_window()
            ui.Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height()).savev(
                str(output/'native-child-before-open.png'), 'png', [], [])
        assert ui.t.XTestFakeMotionEvent(ui.display, 0, rect.x + rect.width // 2, rect.y + rect.height // 2, 0)
        for _ in range(2):
            assert ui.t.XTestFakeButtonEvent(ui.display, 1, 1, 0)
            assert ui.t.XTestFakeButtonEvent(ui.display, 1, 0, 0)
            ui.x.XFlush(ui.display)
            time.sleep(.07)
        time.sleep(.2)

    def enter(ident, name, expected_number=None, source=None):
        focus(root_title)
        before = titles()
        if source:
            ui.click(source)
        else:
            double_click(f'Select or drag p object {ident}')
        known = child_titles.get(ident)
        for _ in range(80):
            current = titles()
            matches = [title for title in current if name in title and title != root_title]
            if len(matches) == 1:
                child_title = matches[0]
                break
            time.sleep(.1)
        else:
            root = ui.Gdk.get_default_root_window()
            ui.Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height()).savev(
                str(output/'native-child-open-failure.png'), 'png', [], [])
            nodes = []
            for frame in app_frames():
                if frame.get_name().removeprefix('* ') != root_title:
                    continue
                for item in ui.walk(frame):
                    try:
                        nodes.append({'name': item.get_name(), 'role': item.get_role_name(),
                                      'description': item.get_description(),
                                      'showing': item.get_state_set().contains(Atspi.StateType.SHOWING),
                                      'text': Atspi.Text.get_text(item, 0, -1) if 'Text' in item.get_interfaces() else ''})
                    except GLib.GError:
                        continue
            (output/'native-child-open-failure.json').write_text(json.dumps(
                {'patcher': ident, 'name': name, 'titles': titles(), 'nodes': nodes}, indent=2))
            raise AssertionError(f'Opening {name} did not create a distinct native view: {titles()}')
        if known in before:
            assert len(current) == len(before), 'Opening an existing child duplicated its native view'
            assert child_title == known
        else:
            assert len(current) == len(before) + 1, 'Opening a child did not create exactly one native window'
        assert root_title in current, 'Opening a child replaced the root native window'
        child_titles[ident] = child_title
        focus(child_title)
        ui.wait_for('Editable patch canvas')
        if expected_number is not None:
            number_value(13, expected_number)
        return child_title

    def comment_text(tree):
        boundary = next(value for value in tree['nodes'] if value['id'] == 3)
        return next(value for value in boundary['patcher']['nodes'] if value['id'] == 14)['params']['text']

    def export_comment(expected):
        for _ in range(30):
            tree = ui.export()
            if comment_text(tree) == expected:
                return tree
            time.sleep(.1)
        raise AssertionError(f'Shared comment was {comment_text(tree)!r}, expected {expected!r}')

    def edit_comment(text):
        # Child views begin in edit mode; later visits preserve that local mode.
        ui.click('Select or drag comment object 14')
        show_inspector()
        ui.text('comment text, selected object 14', text)
        ui.keys('Tab')

    trigger_controls()
    ui.click('Inspector'); ui.click('Native observations')
    original_revision = revision_text()
    original_runtime_revision = runtime_revision()
    control_title = enter(3, 'control boundary', 19)
    assert diagnostics() == original_revision, 'Child boot reinstalled or rebound the owner runtime'
    focus(root_title); number_value(4, 19)
    enter(3, 'control boundary', 19)
    assert revision_text() == original_revision, 'Focusing a child reinstalled the native graph'

    # Both windows poll the same owner snapshot. Reading in the root must not
    # consume the child display, or overwrite either saved message template.
    focus(root_title); ui.click('Trigger message.legacy object 23')
    ui.message_display(22, '5 pear 2.25')
    assert runtime_revision() == original_runtime_revision
    focus(control_title); ui.message_display(16, '5 pear 2.25')
    number_value(13, 19)
    assert runtime_revision() == original_runtime_revision
    focus(root_title); ui.message_display(22, '5 pear 2.25'); number_value(4, 19)
    shared_message_tree = ui.export()
    assert next(value for value in shared_message_tree['nodes'] if value['id'] == 22)['params']['text'] == 'saved $1 $2'
    child_scope = next(value for value in shared_message_tree['nodes'] if value['id'] == 3)['patcher']
    assert next(value for value in child_scope['nodes'] if value['id'] == 16)['params']['text'] == 'saved $1 $2'
    focus(control_title); ui.message_display(16, '5 pear 2.25')
    root = ui.Gdk.get_default_root_window()
    ui.Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height()).savev(str(output/'native-shared-message-ui.png'), 'png', [], [])

    changed_comment = 'Edited in the native child view.'
    edit_comment(changed_comment)
    focus(root_title)
    shared_tree = export_comment(changed_comment)
    assert len(shared_tree['nodes']) == len(patch['nodes']), 'Child edits replaced the root tree'
    ui.keys('Control_L', 'e')
    ui.click('Undo')
    export_comment('Original native hierarchy probe.')
    focus(control_title); export_comment('Original native hierarchy probe.')
    focus(root_title); ui.click('Redo')
    export_comment(changed_comment)
    focus(control_title); export_comment(changed_comment)
    assert runtime_revision() == original_runtime_revision, 'Comment edit/history reinstalled the native graph'
    number_value(13, 19)

    ui.keys('Control_L', 's')
    for _ in range(50):
        saved = json.loads(path.read_text())
        if comment_text(saved) == changed_comment:
            break
        time.sleep(.1)
    assert saved['version'] == 2 and len(saved['nodes']) == len(patch['nodes']), 'Save from child lost the owner tree'
    assert comment_text(saved) == changed_comment, 'Save from child lost its latest shared edit'
    assert next(value for value in saved['nodes'] if value['id'] == 7)['patcher']['nodes'][0]['id'] == 20
    focus(root_title); number_value(4, 19)
    assert runtime_revision() == original_runtime_revision
    ui.keys('Control_L', 'e')
    print('PASS separate native child views, shared edits, owner-wide undo/redo and whole-tree child Save', flush=True)

    ui.click('Start audio'); ui.wait_for('Audio on', text_content=True)
    # Keep another root audible to detect accidental global graph disposal.
    focus(signal_document.name + ' - Ultra'); ui.click('Stop patch')
    focus(other_signal_document.name + ' - Ultra'); ui.wait_for('Audio on', text_content=True)
    focus(root_title); ui.click('Clear'); trigger_controls()
    before_navigation = capture('hierarchy-before-navigation.f32')
    expected_peaks = (.0625, .03125 + .025)
    assert all(abs(actual - expected) < 1e-6 for actual, expected in zip(before_navigation, expected_peaks)), before_navigation

    focus(control_title); native_menu('Close Window')
    wait_closed(control_title)
    focus(root_title); number_value(4, 19)
    source = ui.wait_for('hierarchy-child:')
    assert source.get_state_set().contains(Atspi.StateType.ENABLED), 'Hidden descendant console source is disabled'
    enter(3, 'control boundary', 19, source='hierarchy-child:')
    diagnostics()
    assert runtime_revision() == original_runtime_revision, 'Console source navigation reinstalled the owner graph'
    child_navigation = capture('hierarchy-inside-child.f32')
    assert child_navigation == before_navigation, (before_navigation, child_navigation)
    native_menu('Close Window')
    wait_closed(control_title)
    assert 'Unsaved Patch' not in titles(), 'Closing a child prompted for its owner document'
    focus(root_title); number_value(4, 19)
    assert runtime_revision() == original_runtime_revision, 'Closing a child changed its owner runtime'
    after_child_close = capture('hierarchy-after-child-close.f32')
    assert after_child_close == before_navigation, (before_navigation, after_child_close)
    control_title = enter(3, 'control boundary', 19)
    diagnostics()
    assert runtime_revision() == original_runtime_revision, 'Reopening a child reset its live owner state'
    ui.message_display(16, '5 pear 2.25')
    after_child_reopen = capture('hierarchy-after-child-reopen.f32')
    assert after_child_reopen == before_navigation, (before_navigation, after_child_reopen)

    signal_title = enter(7, 'signal boundary')
    ui.wait_for('Select or drag inlet object 20')
    diagnostics()
    assert runtime_revision() == original_runtime_revision, 'Sibling child boot reinstalled the owner graph'
    signal_navigation = capture('hierarchy-inside-signal-child.f32')
    assert signal_navigation == before_navigation, (before_navigation, signal_navigation)

    # Removing a container closes its obsolete native view, while its sibling
    # remains attached. Undo restores the tree and permits a fresh child view.
    focus(root_title)
    ui.keys('Control_L', 'e')
    ui.click('Select or drag p object 7'); ui.keys('Delete')
    wait_closed(signal_title)
    assert control_title in titles() and root_title in titles(), 'Deleting one child closed a sibling or owner'
    ui.click('Undo')
    ui.wait_for('Select or drag p object 7')
    signal_title = enter(7, 'signal boundary')
    focus(control_title)
    edit_comment('Unsaved owner edit from its child.')
    focus(root_title); export_comment('Unsaved owner edit from its child.')
    owner_views = [root_title, control_title, signal_title]
    window_count = len(titles())
    native_menu('Close Window'); focus('Unsaved Patch')
    assert len(titles()) == window_count + 1, f'Owner close must open one prompt: {titles()}'
    ui.click('Cancel')
    focus(root_title)
    assert all(title in titles() for title in owner_views), 'Cancel closed an owner view'
    assert len(titles()) == window_count, 'Cancel left a prompt or duplicated a view'
    assert capture('hierarchy-after-owner-cancel.f32') == before_navigation, 'Cancel stopped or reset owner audio'
    native_menu('Close Window'); focus('Unsaved Patch'); ui.click('Discard')
    wait_closed(*owner_views)
    assert len(titles()) == window_count - len(owner_views), 'Owner close affected another document or left a child'
    focus(other_signal_document.name + ' - Ultra')
    remaining = capture('hierarchy-after-owner-close.f32')
    assert abs(remaining[0]) < 1e-6 and abs(remaining[1] - .025) < 1e-6, remaining
    ui.click('Stop audio')

    open_file(path); ui.keys('Control_L', 'e'); ui.click('Console'); trigger_controls()
    reopened = ui.export()
    assert reopened['version'] == 2 and len(reopened['nodes']) == len(patch['nodes'])
    assert comment_text(reopened) == changed_comment, 'Child Save or owner Discard lost the saved whole tree'
    print('PASS native child audio continuity, source navigation, detach/reopen, deletion closure and owner close/cancel', flush=True)
    return {'control_console_audio_off_and_on': [17, 19], 'initial_native_revision': original_revision,
            'preserved_runtime_revision': original_runtime_revision, 'separate_native_child_windows': True,
            'shared_child_edits_and_owner_history': True,
            'message_box_non_consuming_root_and_child_display': '5 pear 2.25',
            'message_box_reopen_retains_live_display_and_saved_template': True,
            'before_navigation_stereo_peaks': list(before_navigation), 'control_child_stereo_peaks': list(child_navigation),
            'signal_child_stereo_peaks': list(signal_navigation), 'after_child_close_stereo_peaks': list(after_child_close),
            'after_child_reopen_stereo_peaks': list(after_child_reopen), 'after_owner_close_stereo_peaks': list(remaining),
            'save_from_child_and_reopen_whole_tree': True, 'child_deletion_closes_obsolete_view': True,
            'owner_close_cancel_preserves_all_views': True, 'owner_close_disposes_all_views_once': True,
            'hidden_descendant_console_source_opens_child_without_reset': True}


def help_shell_scenario():
    global private_help_reference
    corpus = json.loads(Path('apps/ultra/tests/fixtures/help-shell-schema.json').read_text())
    patch = next(item['patch'] for item in corpus if item['name'] == 'valid-append')
    basic = next(item for item in patch['nodes'] if item['id'] == 3)['patcher']
    for ident, x, y, style in [(5, 40, 35, {'width': 520, 'height': 130}),
                                (6, 40, 190, {'width': 520, 'height': 85}),
                                (7, 80, 325, None), (8, 80, 375, None)]:
        item = next(item for item in basic['nodes'] if item['id'] == ident)
        item.update(x=x, y=y)
        if style is not None: item['style'] = style
    next(item for item in basic['nodes'] if item['id'] == 8)['params'] = {'label': 'shell-source', 'level': 0, 'popup': 0}
    basic['nodes'].extend([node(9, 'number', {'value': 0}, x=320, y=375),
                           node(10, 'message', {'text': '77'}, x=320, y=325),
                           node(11, 'message', {'text': 'set fresh'}, x=500, y=325)])
    basic['edges'].extend([edge(10, 9), edge(11, 7)])
    path = output / 'help-shell.ultra'
    path.write_text(json.dumps(patch) + '\n')
    root_title = path.name + ' - Ultra'
    original_wait = ui.wait_for
    original_click = ui.click

    # The generic missing-control dump includes every accessible text node.
    # Local references must never be copied into diagnostic JSON or terminal logs.
    def help_wait(name, text_content=False):
        for _ in range(80):
            try:
                return scoped_find(name, text_content)
            except (StopIteration, GLib.GError):
                time.sleep(.1)
        raise AssertionError('Missing help-shell control: ' + name)

    def click(name, button=1):
        target = help_wait(name)
        assert target.get_state_set().contains(Atspi.StateType.ENABLED), name + ' is disabled'
        Atspi.Component.grab_focus(target)
        rect = Atspi.Component.get_extents(target, Atspi.CoordType.SCREEN)
        assert rect.width > 0 and rect.height > 0, name
        assert ui.t.XTestFakeMotionEvent(ui.display, 0, rect.x + rect.width // 2, rect.y + rect.height // 2, 0)
        assert ui.t.XTestFakeButtonEvent(ui.display, button, 1, 0)
        assert ui.t.XTestFakeButtonEvent(ui.display, button, 0, 0)
        ui.x.XFlush(ui.display); time.sleep(.15)

    def showing(name):
        try:
            return scoped_find(name).get_state_set().contains(Atspi.StateType.SHOWING)
        except (StopIteration, GLib.GError):
            return False

    def basic_visible(hosted=True):
        if hosted:
            tab = help_wait('Basic')
            assert tab.get_role_name() in ('page tab', 'tab'), 'Basic is not an accessible tab'
            assert tab.get_state_set().contains(Atspi.StateType.SELECTED), 'Basic lost selection'
        else:
            assert not showing('Basic'), 'A bound Basic child incorrectly hosts root tab controls'
        assert showing('Trigger message object 7'), 'Basic executable content disappeared'
        assert not showing('Select or drag p object 3'), 'Root shell containers overlay Basic'

    def number_value():
        for _ in range(50):
            value = ui.numeric_value('number.legacy value, object 9')
            if value == 77: return value
            time.sleep(.1)
        raise AssertionError('Help navigation lost numeric value 77')

    def runtime_revision():
        click('Inspector')
        details = help_wait('Native observations')
        if not details.get_state_set().contains(Atspi.StateType.EXPANDED): click('Native observations')
        revision = None
        for _ in range(50):
            for frame in app_frames():
                if frame.get_name().removeprefix('* ') != scope: continue
                for item in ui.walk(frame):
                    if 'Text' not in item.get_interfaces(): continue
                    value = Atspi.Text.get_text(item, 0, -1)
                    match = re.fullmatch(r'Document \d+; active \d+; native r(\d+)\.', value)
                    if match: revision = int(match.group(1)); break
                if revision is not None: break
            if revision is not None: break
            time.sleep(.1)
        click('Close panel')
        assert revision is not None, 'Native help runtime revision was not exposed'
        return revision

    def open_reference():
        click('Reference and related objects'); basic_visible()
        click('Reference'); help_wait('Close reference'); basic_visible()

    def unchanged(baseline, revision):
        basic_visible(); number_value(); ui.message_display(7, 'fresh')
        assert runtime_revision() == revision, 'Help navigation reinstalled the native graph'
        assert ui.export() == baseline, 'Help navigation leaked local state or prose into the patch'

    ui.wait_for = help_wait
    ui.click = click
    private_help_reference = True
    try:
        open_file(path); basic_visible(); help_wait('append', text_content=True)
        ui.keys('Control_L', 'e')
        click('Trigger message.legacy object 10'); number_value()
        click('Trigger message.legacy object 11'); ui.message_display(7, 'fresh')
        click('Console'); click('Trigger message object 7')
        help_wait('shell-source:'); help_wait('fresh', text_content=True)
        revision = runtime_revision(); baseline = ui.export()
        frames_before = len(app_frames())
        click('Reference and related objects'); basic_visible(); ui.keys('Escape')
        assert not showing('Reference'), 'Escape did not close the question menu'
        open_reference()
        # The available reference renders a Messages section; unavailable and
        # loading panes do not. Keep the licensed body out of diagnostics.
        help_wait('Messages', text_content=True)
        # A real Basic window is bound to the same scope but owns its overlays.
        click('Basic', button=3); click('Open Basic in New Window')
        child_title = None
        for _ in range(80):
            matches = [frame.get_name().removeprefix('* ') for frame in app_frames()
                       if 'basic' in frame.get_name() and frame.get_name().removeprefix('* ') != root_title]
            if len(matches) == 1: child_title = matches[0]; break
            time.sleep(.1)
        assert child_title is not None, 'Basic context action did not open a bound native child'
        assert len(app_frames()) == frames_before + 1, 'Basic navigation duplicated or replaced a native window'
        focus(child_title); basic_visible(hosted=False); number_value(); ui.message_display(7, 'fresh')
        assert not showing('Close reference'), 'Root reference pane leaked into the Basic child'
        click('append help details'); ui.keys('F1'); help_wait('Close reference'); ui.keys('Escape')
        assert not showing('Close reference'), 'Escape did not close the child reference pane'
        focus(root_title); assert showing('Close reference'), 'Child navigation closed the root reference pane'
        click('shell-source:')
        assert not showing('Close reference'), 'Basic console reveal did not close the reference pane'
        assert len(app_frames()) == frames_before + 1, 'Basic console reveal opened a redundant child'
        click('Inspector'); help_wait('print label, selected object 8'); click('Close panel')
        unchanged(baseline, revision)
        ui.keys('Control_L', 's')
        for _ in range(50):
            saved = json.loads(path.read_text())
            if saved == baseline: break
            time.sleep(.1)
        assert saved == baseline, 'Native Save persisted reference prose or local hosted state'
        saved_basic = next(item for item in saved['nodes'] if item['id'] == 3)['patcher']
        assert next(item for item in saved_basic['nodes'] if item['id'] == 7)['params']['text'] == '17'
        open_reference(); basic_visible()
        if os.environ.get('ULTRA_TEST_HELP_SHELL_CAPTURE', '1') != '0':
            click('Reset canvas view')
            frame = next(frame for frame in app_frames() if frame.get_name().removeprefix('* ') == root_title)
            rect = Atspi.Component.get_extents(frame, Atspi.CoordType.SCREEN)
            root = ui.Gdk.get_default_root_window()
            assert rect.x >= 0 and rect.y >= 0 and rect.width > 0 and rect.height > 0
            assert rect.x + rect.width <= root.get_width() and rect.y + rect.height <= root.get_height()
            (output/'native-help-shell-capture.json').write_text(json.dumps(
                {'window': root_title, 'x': rect.x, 'y': rect.y, 'width': rect.width, 'height': rect.height}, indent=2) + '\n')
            ui.Gdk.pixbuf_get_from_window(root, rect.x, rect.y, rect.width, rect.height).savev(
                str(output/'native-help-shell.png'), 'png', [], [])
        click('Close reference'); unchanged(baseline, revision)
        focus(child_title); native_menu('Close Window')
        focus(root_title); native_menu('Close Window')
        for _ in range(80):
            titles = [frame.get_name().removeprefix('* ') for frame in app_frames()]
            if root_title not in titles and child_title not in titles: break
            time.sleep(.1)
        assert root_title not in titles and child_title not in titles, 'Help windows did not dispose cleanly'
        print('PASS native hosted Basic, local references, independent overlays, source reveal and preserved live state', flush=True)
        return {'status': 'passed', 'local_reference_available': True, 'basic_stays_visible_and_selected': True,
                'independent_native_basic_window': True, 'console_source_reveals_locally': True,
                'preserved_runtime_revision': revision, 'preserved_numeric_value': 77,
                'preserved_message_display': 'fresh', 'saved_message_template': '17',
                'canonical_export_and_save_omit_reference_and_local_state': True,
                'whole_help_roots_qualified': 0}
    finally:
        ui.wait_for = original_wait
        ui.click = original_click
        private_help_reference = False


def run():
    global scope
    help_shell = help_shell_scenario()
    if os.environ.get('ULTRA_TEST_HELP_SHELL_ONLY') == '1':
        (output / 'help-shell-result.json').write_text(json.dumps(help_shell, indent=2) + '\n')
        return
    receiver = write_patch('receiver.ultra', [node(1, 'receive', {'name': 'desktop-notes'}), node(2, 'print', {'label': 'other-window'}, y=155), node(3, 'number', {}, x=300, y=155)], [edge(1, 2), edge(1, 3)])
    sender = write_patch('sender.ultra', [node(1, 'message', {'text': 'orbit 60 100'}), node(2, 'send', {'name': 'desktop-notes'}, y=155)], [edge(1, 2)])
    open_file(receiver)
    ui.click('Console')
    open_file(sender)
    ui.keys('Control_L', 'e')
    ui.click('Trigger message.legacy object 1')
    focus(receiver.name + ' - Ultra')
    ui.wait_for('other-window:')
    ui.wait_for('orbit 60 100', text_content=True)
    print('PASS native file forwarding and cross-window typed messages', flush=True)
    # Reopening an existing canonical path focuses its window, without duplication.
    before = len(app_frames())
    open_file(receiver)
    assert len(app_frames()) == before

    # A native menu action targets exactly one window even with other documents open.
    native_menu('New Patch')
    for _ in range(40):
        if len(app_frames()) == before + 1: break
        time.sleep(.1)
    time.sleep(.3)
    after_new = [frame.get_name() for frame in app_frames()]
    if len(after_new) != before + 1:
        (output / 'native-menu-new-failure.json').write_text(json.dumps({'before': before, 'after': after_new}, indent=2))
        root = ui.Gdk.get_default_root_window()
        ui.Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height()).savev(str(output/'native-menu-new-failure.png'), 'png', [], [])
    assert len(after_new) == before + 1, f'Native New expected {before+1} windows, got {after_new}'
    print('PASS native menu creates exactly one patch window', flush=True)

    # Normal Save writes this known path without any JSON copy/paste or picker.
    focus(sender.name + ' - Ultra')
    ui.keys('Control_L', 'e')
    ui.keys('n'); ui.text('Object name and arguments', '+ 7'); ui.keys('Return')
    ui.keys('Control_L', 's')
    for _ in range(50):
        saved = json.loads(sender.read_text())
        if len(saved['nodes']) == 3: break
        time.sleep(.1)
    assert any(value['type'] == 'add' and value['params']['rhs'] == 7 for value in saved['nodes'])
    print('PASS native Save to an existing path', flush=True)

    # Native close prompts preserve Cancel and deliver Save to this window only.
    ui.keys('n'); ui.text('Object name and arguments', '+ 9'); ui.keys('Return')
    window_count = len(app_frames())
    native_menu('Close Window'); focus('Unsaved Patch'); ui.click('Cancel')
    focus(sender.name + ' - Ultra')
    assert len(json.loads(sender.read_text())['nodes']) == 3, 'Cancel unexpectedly saved the document'
    native_menu('Close Window'); focus('Unsaved Patch'); ui.click('Save')
    for _ in range(80):
        if not any(frame.get_name().removeprefix('* ') == sender.name + ' - Ultra' for frame in app_frames()): break
        time.sleep(.1)
    assert len(app_frames()) == window_count - 1, 'Save on close affected another patch window'
    assert len(json.loads(sender.read_text())['nodes']) == 4, 'Save on close lost the latest edit'
    focus(receiver.name + ' - Ultra')
    ui.wait_for('orbit 60 100', text_content=True)

    discarded = write_patch('discarded.ultra', [], [])
    open_file(discarded)
    ui.keys('n'); ui.text('Object name and arguments', '+ 99'); ui.keys('Return')
    native_menu('Close Window'); focus('Unsaved Patch'); ui.click('Discard')
    focus(receiver.name + ' - Ultra')
    assert not json.loads(discarded.read_text())['nodes'], 'Discard wrote the document'
    print('PASS native unsaved-close Save, Discard, and Cancel', flush=True)

    # Exercise the actual operating-system picker, including a path with spaces.
    picked = write_patch('picked patch.ultra', [], [])
    ui.click('Open patch file'); focus('Open Patch')
    ui.wait_for('File Chooser Widget')
    # GTK can finish mapping the chooser after X focus returns to its parent.
    # Focus a chooser child before sending its location-entry shortcut.
    assert Atspi.Component.grab_focus(ui.wait_for('Files'))
    # GTK's Ctrl+L toggles the entry and can hide it while accessibility catches
    # up. The absolute-path shortcut keeps it open across delayed focus changes.
    for _ in range(20):
        try:
            scoped_find('Native filename entry')
            break
        except StopIteration:
            ui.keys('slash')
    ui.text('Native filename entry', str(picked.resolve()))
    ui.click('Open')
    focus(picked.name + ' - Ultra')
    ui.wait_for('Editable patch canvas')
    print('PASS native Open picker with a path containing spaces', flush=True)

    # Open an original help patch from inside the app; it is an independent window.
    ui.click('Help and examples library')
    ui.text('Search help and examples', 'print')
    # The complete row accessible name also contains its original summary.
    buttons = [value for frame in app_frames() if frame.get_name().removeprefix('* ') == scope
               for value in ui.walk(frame) if value.get_role_name() in ('button', 'push button') and value.get_name().startswith('print help')]
    assert len(buttons) == 1, [value.get_name() for value in buttons]
    ui.click(buttons[0].get_name())
    focus('print help - Ultra')
    ui.wait_for('Editable patch canvas')
    print('PASS help opens an independent native patch window', flush=True)

    # Exercise every new list kind through the real WebKit -> Rust -> native
    # path. Native unit scores assert the exact typed and interleaved order.
    list_cases = [
        ('iter', {}, ['1', '2.', 'amber', '4']),
        ('prepend', {'args': 'route'}, ['route 1 2. amber 4']),
        ('append', {'args': 'tail'}, ['list 1 2. amber 4 tail']),
        ('zl_reg', {}, ['list 1 2. amber 4']),
        ('zl_join', {'args': '8.'}, ['list 1 2. amber 4 8.']),
        ('zl_len', {}, ['4']),
        ('zl_iter', {'size': 2}, ['list 1 2.', 'amber 4']),
        ('zl_slice', {'size': 2}, ['list 1 2.']),
        ('zl_rev', {}, ['list 4 amber 2. 1']),
        ('zl_rot', {'rotation': 1}, ['list 4 1 2. amber']),
    ]
    list_nodes = [node(1, 'message', {'text': 'list 1 2. amber 4'})]
    list_edges = []
    for kind, params, expected in list_cases:
        target = len(list_nodes) + 1
        sink = target + 1
        list_nodes.extend([node(target, kind, params, x=70, y=150),
                           node(sink, 'print', {'label': 'probe-' + kind}, x=300, y=150)])
        list_edges.extend([edge(1, target), edge(target, sink)])
    lists = write_patch('list-objects.ultra', list_nodes, list_edges)
    open_file(lists); ui.keys('Control_L', 'e'); ui.click('Console')

    def trigger_lists():
        ui.click('Trigger message.legacy object 1')
        for kind, params, expected in list_cases:
            ui.wait_for('probe-' + kind + ':')
            for value in expected:
                ui.wait_for(value, text_content=True)

    trigger_lists()
    print('PASS all ten native list objects with audio off', flush=True)

    def audio_patch(filename, pitch, channel):
        return write_patch(filename, [node(1, 'message', {'text': f'{pitch} 100'}), node(2, 'voice', {'device': 0}, y=150), node(3, 'gain', {'value': 4}, y=230), node(4, 'join', {}, y=350), node(5, 'dac', {}, y=430)], [edge(1, 2), edge(2, 3), edge(3, 4, channel), edge(4, 5)])
    left = audio_patch('left.ultra', 60, 0); right = audio_patch('right.ultra', 67, 1)
    open_file(left); ui.keys('Control_L', 'e')
    open_file(right); ui.keys('Control_L', 'e'); ui.click('Start audio'); ui.wait_for('Audio on', text_content=True)
    focus(lists.name + ' - Ultra'); ui.click('Clear'); trigger_lists()
    print('PASS all ten native list objects with audio on', flush=True)
    focus(left.name + ' - Ultra'); ui.click('Trigger message.legacy object 1')
    focus(right.name + ' - Ultra'); ui.click('Trigger message.legacy object 1')
    peaks = capture('two-documents.f32')
    assert min(peaks) > 1e-5, f'Two document banks did not mix independently: {peaks}'
    focus(left.name + ' - Ultra'); ui.click('Stop patch')
    focus(right.name + ' - Ultra')
    time.sleep(.15)
    remaining = capture('one-document-stopped.f32')
    assert remaining[0] == 0 and remaining[1] > 1e-5, f'Scoped Stop affected another window: {remaining}'
    ui.click('Stop patch')
    ui.click('Stop audio')

    # All twelve new MSP kinds run through the built desktop and its real CPAL
    # output. A second signal document stays audible across a local Stop.
    signal_nodes = [node(1, 'message', {'text': '0.05 10'}),
                    node(2, 'line_signal', {}, y=130),
                    node(3, 'cycle', {'frequency': 440}, x=260),
                    node(4, 'signal_multiply', {}, x=260, y=180),
                    node(5, 'signal_clip', {'minimum': -.04, 'maximum': .04}, x=260, y=250),
                    node(6, 'sig', {'args': '0.1 0.2'}, x=450),
                    node(7, 'signal_add', {}, x=450, y=130),
                    node(8, 'signal_subtract', {'rhs': .1}, x=450, y=190),
                    node(9, 'signal_divide', {'rhs': 2}, x=450, y=250),
                    node(10, 'signal_dac', {'channels': '1 2'}, x=350, y=330),
                    node(11, 'noise', {}, x=650),
                    node(12, 'phasor', {'frequency': 1}, x=650, y=130),
                    node(13, 'snapshot', {}, x=650, y=220),
                    node(14, 'print', {'label': 'signal-snapshot'}, x=650, y=300),
                    node(15, 'bang', {}, x=790, y=130),
                    node(16, 'receive', {'name': 'desktop-signal-resume'}, x=450, y=400)]
    signal_edges = [edge(1, 2), edge(3, 4), edge(2, 4, 1), edge(4, 5), edge(5, 10),
                    edge(6, 7), {'from': 6, 'outlet': 1, 'to': 7, 'inlet': 0},
                    edge(7, 8), edge(8, 9), edge(9, 10, 1), edge(11, 13), edge(12, 13),
                    edge(15, 13), edge(13, 14), edge(16, 8, 1)]
    signals = write_patch('signals.ultra', signal_nodes, signal_edges)
    signal_other = write_patch('signal-other.ultra', [node(1, 'sig', {'args': '0.025'}),
                                                    node(2, 'signal_dac', {'channels': '2'}, y=150)], [edge(1, 2)])
    signal_sender = write_patch('signal-sender.ultra', [node(1, 'message', {'text': '0.1'}),
                                                       node(2, 'send', {'name': 'desktop-signal-resume'}, y=150)], [edge(1, 2)])
    open_file(signals); ui.keys('Control_L', 'e')
    open_file(signal_other); ui.click('Start audio'); ui.wait_for('Audio on', text_content=True)
    focus(signals.name + ' - Ultra'); ui.click('Trigger message.legacy object 1')
    ui.click('Console'); ui.click('Trigger bang object 15'); ui.wait_for('signal-snapshot:')
    signal_peaks = capture('msp-two-documents.f32')
    assert abs(signal_peaks[0] - .04) < 1e-6 and abs(signal_peaks[1] - .125) < 1e-6, signal_peaks
    ui.click('Stop patch'); time.sleep(.15)
    signal_stopped = capture('msp-one-document-stopped.f32')
    assert signal_stopped[0] == 0 and abs(signal_stopped[1] - .025) < 1e-6, signal_stopped
    open_file(signal_sender); ui.keys('Control_L', 'e'); ui.click('Trigger message.legacy object 1')
    signal_resumed = capture('msp-named-receive-resumed.f32')
    assert abs(signal_resumed[0] - .04) < 1e-6 and abs(signal_resumed[1] - .125) < 1e-6, signal_resumed
    ui.click('Stop audio')
    ui.click('Start audio'); ui.wait_for('Audio on', text_content=True)
    signal_restarted = capture('msp-global-dsp-restarted.f32')
    assert abs(signal_restarted[0] - .04) < 1e-6 and abs(signal_restarted[1] - .125) < 1e-6, signal_restarted
    ui.click('Stop audio')
    print('PASS all twelve MSP objects, summed inputs, shared output, named Receive resume and global DSP restart', flush=True)
    hierarchy = hierarchy_scenario(signals, signal_other)
    result = {'status': 'passed', 'scope': 'actual Tauri/WebKit windows + native shared runtime and CPAL', 'argv_open_and_single_instance': True, 'canonical_path_deduplication': True, 'native_menu_new_is_local': True, 'native_save_existing_path': True, 'native_close_save_discard_cancel': True, 'native_open_picker': True, 'in_app_help_new_window': True, 'typed_send_receive_audio_off': True, 'typed_list_objects_audio_off_and_on': [case[0] for case in list_cases], 'two_document_stereo_peaks': list(peaks), 'scoped_stop_stereo_peaks': list(remaining), 'msp_twelve_kinds': True, 'msp_stereo_peaks': list(signal_peaks), 'msp_scoped_stop_stereo_peaks': list(signal_stopped), 'msp_named_receive_resume_stereo_peaks': list(signal_resumed), 'msp_global_restart_stereo_peaks': list(signal_restarted), 'audio_environment': os.environ['ULTRA_TEST_AUDIO_SCOPE']}
    result['embedded_hierarchy'] = hierarchy
    result['help_shell'] = help_shell
    (output / 'documents-result.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    try:
        run()
    finally:
        ui.x.XCloseDisplay(ui.display)
