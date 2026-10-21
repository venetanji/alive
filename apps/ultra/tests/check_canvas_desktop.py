#!/usr/bin/env python3
"""Exercise the built canvas, audio settings and CPAL software capture privately."""
import array
import ctypes as C
import ctypes.util
import json
import math
import os
from pathlib import Path
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


def find(name):
    for root in Atspi.get_desktop(0):
        try:
            if root.get_process_id() != pid:
                continue
        except GLib.GError:
            continue
        for a in walk(root):
            try:
                if a.get_name() == name:
                    return a
            except GLib.GError:
                continue
    raise StopIteration(name)


def wait_for(name):
    for _ in range(80):
        try:
            return find(name)
        except (StopIteration, GLib.GError):
            time.sleep(.1)
    raise AssertionError('Missing native control: ' + name)


def click(name):
    for _ in range(30):
        control = wait_for(name)
        if control.get_state_set().contains(Atspi.StateType.ENABLED):
            break
        time.sleep(.1)
    if not control.get_state_set().contains(Atspi.StateType.ENABLED):
        names = []
        for root in Atspi.get_desktop(0):
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
    roots = [a for a in Atspi.get_desktop(0) if a.get_process_id() == pid]
    candidates += [a for root in roots for a in walk(root) if a.get_name() == name]
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
    # Focus the workspace so Ctrl S cannot be consumed by a text editor.
    Atspi.Component.grab_focus(wait_for('Editable patch canvas'))
    keys('Control_L', 's')
    value = Atspi.Text.get_text(wait_for('Patch JSON'), 0, -1)
    keys('Escape')
    return json.loads(value)


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


try:
    wait_for('Start audio')
    Atspi.Component.grab_focus(wait_for('Editable patch canvas'))
    keys('Control_L', 'n')
    keys('n')
    text('Object name and arguments', '+ 7')
    keys('Return')
    patch = export()
    assert len(patch['nodes']) == 1 and patch['nodes'][0]['params'] == {'rhs': 7}
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
    keys('Control_L', 'o')
    text('Patch JSON', json.dumps(wiring))
    click('Import JSON')
    source = '+ 1, Outlet 0: Sum (control)'
    target = 'number 2, Inlet 0: Value (control)'
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

    # Reopen a complete authored patch through the shipped JSON dialog.
    starter = json.loads(Path('apps/ultra/ui/canvas-preset.json').read_text())
    for n in starter['nodes']:
        if n['type'] == 'gain':
            n['params']['value'] = 4
    Atspi.Component.grab_focus(wait_for('Editable patch canvas'))
    keys('Control_L', 'o')
    text('Patch JSON', json.dumps(starter))
    click('Import JSON')
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
        for root in Atspi.get_desktop(0):
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
    keys('Control_L', 'e')
    # One confirmation capture of the actual built desktop surface.
    root = Gdk.get_default_root_window()
    image = Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height())
    image.savev(str(output/'native-canvas.png'), 'png', [], [])
    result = {'status': 'passed', 'scope': 'built Tauri canvas + real Rust CPAL device output',
              'audio_environment': os.environ['ULTRA_TEST_AUDIO_SCOPE'],
              'keyboard_create_edit_undo_lock': True, 'json_roundtrip': True,
              'message_path_left_peak': max(map(abs, left)), 'untriggered_right_peak': 0,
              'note_off_tail_peak': 0, 'capture_frames': len(samples)//2, 'saved_audio_config': config,
              'limits': ['No hardware MIDI or latency qualification', 'No Max DSP equivalence claim']}
    (output/'result.json').write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps(result, indent=2))
finally:
    x.XCloseDisplay(display)
