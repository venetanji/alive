#!/usr/bin/env python3
"""Real Alive/Tauri journey on the owned Xvfb and software PipeWire server.

ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_alive_desktop.py \
  bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-desktop
Set ALIVE_ENDURANCE_SECONDS=600 for the sustained acceptance run.
"""
import array
from contextlib import nullcontext
import ctypes as C
import hashlib
import json
import math
import os
from pathlib import Path
import platform
import subprocess
import time
from stream_measurement import Recorder, ProcessSampler, ProcessGroups, JsonLines, PlayingIntervals
from desktop_timing import TimingProbe

import check_canvas_desktop as ui
import check_documents_desktop as windows
from gi.repository import Atspi, GLib
from alive_workspace_navigation import install as install_workspace_navigation

prepare_workspace_control = install_workspace_navigation(
    ui, windows, select_device=lambda name: select_device_click(name))
timing = None

MAIN = 'Alive'
DEVICE = Path('apps/ultra/examples/subtractive.ultra').resolve()
operations = []
native_inputs = []
resource_sampler = None
resource_groups = None
resource_writer = None
playing = PlayingIntervals()
control_action = 0


def checkpoint(event, control=''):
    if timing is not None:
        timing.checkpoint(event, control)


def screenshot(name):
    root = ui.Gdk.get_default_root_window()
    ui.Gdk.pixbuf_get_from_window(root, 0, 0, root.get_width(), root.get_height()).savev(
        str(ui.output / name), 'png', [], [])


def value(name):
    prepare_workspace_control(name)
    control = ui.wait_for(name)
    if 'Text' in control.get_interfaces():
        return Atspi.Text.get_text(control, 0, -1)
    return ' '.join(Atspi.Text.get_text(a, 0, -1) for a in ui.walk(control)
                    if 'Text' in a.get_interfaces())


def select_clip(track):
    name = f'Select {track} slot 1'
    try:
        ui.find(name)
    except StopIteration:
        name = f'{track} clip'
    ui.click(name)


def score(track):
    return track['slots'][0] if 'slots' in track else track


def numeric(name, number):
    ui.text(name, str(number))
    ui.keys('Tab')
    time.sleep(.12)


def wait_value(name, predicate, seconds=8):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        current = value(name)
        if predicate(current):
            return current
        time.sleep(.12)
    screenshot('failed-value.png')
    raise AssertionError(f'{name}: unexpected value {current!r}')


def detail():
    return {name: value(name) for name in (
        'Audio backend', 'Audio device', 'Audio sample rate', 'Audio buffer frames',
        'Audio callbacks', 'Audio stream errors', 'Audio failed', 'Audio status',
        'Transport playing', 'Absolute frame', 'Rejected commands', 'Native generation',
        'Track 1 active voices', 'Track 2 active voices')}


def log(action):
    checkpoint('operation-entry', action)
    audio = detail()
    operations.append({'action': action, 'monotonic': time.monotonic(), 'audio': audio})
    (ui.output / 'operations.json').write_text(json.dumps(operations, indent=2))
    assert audio['Audio stream errors'] == '0' and audio['Audio failed'] == 'false', audio
    assert audio['Rejected commands'] == '0', audio
    checkpoint('operation-exit', action)


def transport(action):
    global control_action
    control_action += 1
    ui.click(f'{action.title()} transport')
    wait_value('Transport playing', lambda s: s == str(action == 'start').lower())


class WindowAttributes(C.Structure):
    _fields_ = [('x', C.c_int), ('y', C.c_int), ('width', C.c_int), ('height', C.c_int),
                ('border_width', C.c_int), ('depth', C.c_int), ('visual', C.c_void_p),
                ('root', C.c_ulong), ('window_class', C.c_int), ('bit_gravity', C.c_int),
                ('win_gravity', C.c_int), ('backing_store', C.c_int), ('backing_planes', C.c_ulong),
                ('backing_pixel', C.c_ulong), ('save_under', C.c_int), ('colormap', C.c_ulong),
                ('map_installed', C.c_int), ('map_state', C.c_int), ('all_event_masks', C.c_long),
                ('your_event_mask', C.c_long), ('do_not_propagate_mask', C.c_long),
                ('override_redirect', C.c_int), ('screen', C.c_void_p)]


ui.x.XInternAtom.argtypes = [C.c_void_p, C.c_char_p, C.c_int]
ui.x.XInternAtom.restype = C.c_ulong
ui.x.XGetWindowProperty.argtypes = [C.c_void_p, C.c_ulong, C.c_ulong, C.c_long, C.c_long,
                                   C.c_int, C.c_ulong, C.POINTER(C.c_ulong), C.POINTER(C.c_int),
                                   C.POINTER(C.c_ulong), C.POINTER(C.c_ulong), C.POINTER(C.c_void_p)]
ui.x.XTranslateCoordinates.argtypes = [C.c_void_p, C.c_ulong, C.c_ulong, C.c_int, C.c_int,
                                      C.POINTER(C.c_int), C.POINTER(C.c_int), C.POINTER(C.c_ulong)]


def input_record(action, **fields):
    row = {'action': action, 'monotonic': time.monotonic(), **fields}
    native_inputs.append(row)
    (ui.output / 'native-inputs.json').write_text(json.dumps(native_inputs, indent=2))
    return row


def window_property(window, name, kind):
    atom = ui.x.XInternAtom(ui.display, name.encode(), 1)
    actual = C.c_ulong(); form = C.c_int(); count = C.c_ulong(); rest = C.c_ulong(); data = C.c_void_p()
    if not atom:
        return []
    result = ui.x.XGetWindowProperty(ui.display, window, atom, 0, 16, 0, kind,
                                    C.byref(actual), C.byref(form), C.byref(count), C.byref(rest), C.byref(data))
    try:
        if result or actual.value != kind or form.value != 32 or not data.value:
            return []
        return list(C.cast(data, C.POINTER(C.c_ulong))[:count.value])
    finally:
        if data.value:
            ui.x.XFree(data)


def owned_frame_window():
    frame = next(frame for frame in windows.app_frames()
                 if frame.get_name().removeprefix('* ') == windows.scope
                 and frame.get_state_set().contains(Atspi.StateType.SHOWING))
    title = frame.get_name().removeprefix('* ')
    pending = [ui.x.XDefaultRootWindow(ui.display)]
    while pending:
        window = pending.pop(); name = C.c_char_p()
        if ui.x.XFetchName(ui.display, window, C.byref(name)) and name.value:
            text = name.value.decode('utf-8', errors='replace').removeprefix('* ')
            ui.x.XFree(name)
            if text == title and window_property(window, '_NET_WM_PID', 6) == [ui.pid]:
                return window
        root = C.c_ulong(); parent = C.c_ulong(); children = C.POINTER(C.c_ulong)(); count = C.c_uint()
        if ui.x.XQueryTree(ui.display, window, C.byref(root), C.byref(parent), C.byref(children), C.byref(count)):
            try:
                pending.extend(children[index] for index in range(count.value))
            finally:
                if children:
                    ui.x.XFree(children)
    raise AssertionError('No owned native window for scoped frame: ' + title)


def native_hit_path(px, py):
    root = ui.x.XDefaultRootWindow(ui.display); path = [root]
    for _ in range(32):
        dx = C.c_int(); dy = C.c_int(); child = C.c_ulong()
        assert ui.x.XTranslateCoordinates(ui.display, root, path[-1], px, py,
                                         C.byref(dx), C.byref(dy), C.byref(child))
        if not child.value:
            return path
        path.append(child.value)
    raise AssertionError('Native hit-test ancestry exceeds diagnostic bound')


def reorder_point(control):
    states = control.get_state_set()
    if not all(states.contains(state) for state in (Atspi.StateType.ENABLED, Atspi.StateType.SHOWING,
                                                    Atspi.StateType.SENSITIVE)):
        raise LookupError('Reorder control is unavailable')
    rect = Atspi.Component.get_extents(control, Atspi.CoordType.SCREEN)
    if rect.width <= 0 or rect.height <= 0:
        raise LookupError('Reorder control has no screen rectangle')
    return [rect.x, rect.y, rect.width, rect.height], (rect.x + rect.width // 2, rect.y + rect.height // 2)


def native_control_click(name, kind):
    """Dismiss native tooltip occlusion before one owned Alive pointer click."""
    prepare_workspace_control(name)
    assert windows.scope == MAIN, 'Native input is scoped to the Alive main frame'
    owner = owned_frame_window(); control = ui.wait_for(name)
    Atspi.Component.grab_focus(control)
    samples = []; point = None
    deadline = time.monotonic() + 2
    while time.monotonic() < deadline:
        try:
            # Focus/scroll and WebKit layout may change the accessible rectangle.
            control = ui.find(name); rect, current = reorder_point(control)
            path = native_hit_path(*current)
            sample = {'rect': rect, 'hit_path': path}
            if not samples or sample != samples[-1]:
                samples.append(sample)
            if current != point:
                point = current
                assert ui.t.XTestFakeMotionEvent(ui.display, 0, *point, 0)
                ui.x.XFlush(ui.display)
            elif owner in path:
                try:
                    assert ui.t.XTestFakeButtonEvent(ui.display, 1, 1, 0)
                finally:
                    assert ui.t.XTestFakeButtonEvent(ui.display, 1, 0, 0)
                    ui.x.XFlush(ui.display)
                return input_record(kind + ' click', name=name, owner=owner, samples=samples,
                                    presses=1, releases=1, final_rect=rect)
        except (StopIteration, LookupError, GLib.GError) as error:
            sample = {'unavailable': str(error)}
            if not samples or sample != samples[-1]:
                samples.append(sample)
        time.sleep(.01)
    input_record(kind + ' blocked', name=name, owner=owner, samples=samples, presses=0, releases=0)
    screenshot(kind.replace(' ', '-') + '-input-blocked.png')
    raise AssertionError('Native ' + kind + ' target remains occluded or unavailable: ' + name)


def reorder_click(name):
    return native_control_click(name, 'reorder')


def select_device_click(name):
    result = native_control_click(name, 'device selection')
    time.sleep(.15)  # Keep the original selector click's post-input allowance.
    return result


def force_covering_tooltip(name, hover, kind='reorder'):
    prepare_workspace_control(name)
    owner = owned_frame_window(); _, point = reorder_point(ui.wait_for(hover))
    ui.t.XTestFakeMotionEvent(ui.display, 0, *point, 0); ui.x.XFlush(ui.display)
    tooltip = ui.x.XInternAtom(ui.display, b'_NET_WM_WINDOW_TYPE_TOOLTIP', 0)
    deadline = time.monotonic() + 3
    while time.monotonic() < deadline:
        rect, target = reorder_point(ui.find(name)); path = native_hit_path(*target)
        if owner not in path and any(tooltip in window_property(window, '_NET_WM_WINDOW_TYPE', 4) for window in path):
            screenshot(kind.replace(' ', '-') + '-covering-tooltip.png')
            return input_record('covering ' + kind + ' tooltip', name=name, owner=owner,
                                rect=rect, hit_path=path, tooltip_atom=tooltip)
        time.sleep(.02)
    input_record('missing covering tooltip', name=name, owner=owner, rect=rect, hit_path=path)
    screenshot(kind.replace(' ', '-') + '-tooltip-missing.png')
    raise AssertionError('Regression precondition: no native tooltip covering ' + name)


def location_entry():
    code = ui.x.XKeysymToKeycode(ui.display, ui.x.XStringToKeysym(b'slash'))
    assert code
    ready = False
    try:
        assert ui.t.XTestFakeKeyEvent(ui.display, code, 1, 0)
        ui.x.XFlush(ui.display)
        deadline = time.monotonic() + 8
        while time.monotonic() < deadline:
            try:
                entry = ui.find('Native filename entry'); states = entry.get_state_set()
                rect = Atspi.Component.get_extents(entry, Atspi.CoordType.SCREEN)
                if ('EditableText' in entry.get_interfaces() and rect.width > 0 and rect.height > 0
                        and all(states.contains(state) for state in (Atspi.StateType.SHOWING,
                                Atspi.StateType.FOCUSED, Atspi.StateType.ENABLED, Atspi.StateType.SENSITIVE))):
                    ready = True
                    return entry
            except (StopIteration, GLib.GError):
                pass
            time.sleep(.01)
        screenshot('location-entry-unavailable.png')
        raise AssertionError('Native location entry did not become usable before slash release')
    finally:
        released = bool(ui.t.XTestFakeKeyEvent(ui.display, code, 0, 0))
        ui.x.XFlush(ui.display)
        input_record('slash location entry', scope=windows.scope, ready_before_release=ready, released=released)
        assert released, 'Slash key release failed'


def focus_chooser(title):
    ui.x.XGetWindowAttributes.argtypes = [C.c_void_p, C.c_ulong, C.POINTER(WindowAttributes)]
    windows.scope = title
    candidates = []
    for _ in range(80):
        root = C.c_ulong(); parent = C.c_ulong(); children = C.POINTER(C.c_ulong)(); count = C.c_uint()
        ui.x.XQueryTree(ui.display, ui.x.XDefaultRootWindow(ui.display), C.byref(root), C.byref(parent), C.byref(children), C.byref(count))
        matched = None
        try:
            for index in range(count.value):
                name = C.c_char_p()
                if ui.x.XFetchName(ui.display, children[index], C.byref(name)) and name.value:
                    text = name.value.decode('utf-8', errors='replace')
                    ui.x.XFree(name)
                    if text == title:
                        attributes = WindowAttributes()
                        assert ui.x.XGetWindowAttributes(ui.display, children[index], C.byref(attributes))
                        candidates.append({'title': title, 'window': int(children[index]), 'map_state': attributes.map_state})
                        if attributes.map_state == 2:  # IsViewable; GTK may retain an unmapped chooser with the same title.
                            matched = children[index]
                            break
        finally:
            if children: ui.x.XFree(children)
        if matched:
            ui.x.XResizeWindow(ui.display, matched, 1000, 740)
            ui.x.XMoveWindow(ui.display, matched, 0, 0)
            ui.x.XRaiseWindow(ui.display, matched)
            ui.x.XSetInputFocus(ui.display, matched, 2, 0)
            ui.x.XFlush(ui.display)
            with (ui.output / 'chooser-focus.jsonl').open('a') as stream:
                stream.write(json.dumps(candidates) + '\n')
            time.sleep(.2)
            return
        time.sleep(.1)
    raise AssertionError('Native chooser did not become viewable: ' + title)


def choose_file(button, title, path):
    ui.click(button)
    time.sleep(.6)
    focus_chooser(title)
    if title == 'Save Alive Session':
        frame = next(frame for frame in windows.app_frames() if frame.get_name() == title)
        entry = next(node for node in ui.walk(frame) if 'EditableText' in node.get_interfaces()
                     and node.get_state_set().contains(Atspi.StateType.SHOWING))
        assert Atspi.EditableText.set_text_contents(entry, str(path))
    else:
        focus_chooser(title)
        # Give the GTK file pane focus before its location shortcut.
        ui.t.XTestFakeMotionEvent(ui.display, 0, 450, 250, 0)
        ui.t.XTestFakeButtonEvent(ui.display, 1, 1, 0)
        ui.t.XTestFakeButtonEvent(ui.display, 1, 0, 0)
        ui.x.XFlush(ui.display)
        location_entry()
        ui.text('Native filename entry', str(path))
    ui.click('Save' if title == 'Save Alive Session' else 'Open')
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        if not any(frame.get_name() == title and frame.get_state_set().contains(Atspi.StateType.SHOWING)
                   for frame in windows.app_frames()):
            break
        time.sleep(.1)
    else:
        raise AssertionError('Native file chooser did not finish: ' + title)
    time.sleep(.3)
    windows.focus(MAIN)


def start_capture(name):
    path = ui.output / (name + '.f32')
    # Older pw-cat writes raw PCM to stdout without accepting --raw.
    raw = ['--raw'] if '--raw' in subprocess.check_output(['pw-cat', '--help'], text=True) else []
    process = Recorder(path, [
        'pw-cat', '--record', *raw, '--rate=48000', '--format=f32', '--channels=2',
        '--target=0', '--properties={ node.name = Alive-Session-Capture }', '-'])
    for _ in range(50):
        if 'Alive-Session-Capture:input_FL' in subprocess.check_output(['pw-link', '-i'], text=True):
            break
        time.sleep(.1)
    for channel in ('FL', 'FR'):
        subprocess.run(['pw-link', 'Ultra-Software-Output:monitor_' + channel,
                        'Alive-Session-Capture:input_' + channel], check=True)
    return process, path


def finish_capture(capture):
    with timing.phase('capture-finalize ' + capture[1].name) if timing else nullcontext():
        return measured_finish_capture(capture)


def measured_finish_capture(capture):
    process, path = capture
    supervision = process.finish()
    assert supervision["complete"], supervision
    peaks, digest, frames, unequal = [], hashlib.sha256(), 0, 0
    with path.open('rb') as stream:
        while block := stream.read(48000 * 2 * 4):
            digest.update(block)
            samples = array.array('f'); samples.frombytes(block)
            assert all(math.isfinite(s) for s in samples), 'Nonfinite captured audio'
            left, right = samples[::2], samples[1::2]
            if frames >= 4096:
                unequal += sum(a != b for a, b in zip(left, right))
            frames += len(left)
            peaks.append(max(map(abs, samples), default=0))
    return {'frames': frames, 'seconds': frames / 48000, 'peak': max(peaks, default=0),
            'one_second_peaks': peaks, 'unequal_stereo_samples_after_setup': unequal,
            'sha256': digest.hexdigest(), 'path': path.name, 'physical_audio': False, 'supervision': supervision}


def process_sample():
    global resource_sampler, resource_writer, resource_groups
    if resource_sampler is None:
        resource_sampler = ProcessSampler(ui.pid)
        resource_groups = ProcessGroups(app=resource_sampler, sampler_capture_overhead=ProcessSampler(os.getpid()),
            private_audio_server=ProcessSampler(int(os.environ['ULTRA_TEST_AUDIO_PID'])) if os.environ.get('ULTRA_TEST_AUDIO_PID') else None)
        resource_writer = JsonLines(ui.output/'resource-samples.jsonl')
    groups = resource_groups.sample()
    result = {**groups['app'], 'sampler_capture_overhead': groups['sampler_capture_overhead'],
              'private_audio_server': groups['private_audio_server']}
    resource_writer.write(result)
    return result


def editor_edit(number=950):
    ui.click('Open Pulse editor')
    windows.focus('Pulse - Ultra Hosted Editor')
    ui.wait_for('Hosted Cutoff base')
    numeric('Hosted Cutoff base', number)
    wait_value('Hosted Cutoff base', lambda s: float(s) == number)
    wait_value('Hosted Cutoff effective ownership', lambda s: 'Automation' in s)
    screenshot('hosted-editor.png')
    ui.click('Close hosted editor')
    deadline = time.monotonic() + 4
    while time.monotonic() < deadline:
        if not any(frame.get_name() == 'Pulse - Ultra Hosted Editor' and
                   frame.get_state_set().contains(Atspi.StateType.SHOWING)
                   for frame in windows.app_frames()):
            break
        time.sleep(.1)
    else:
        screenshot('editor-close-refused.png')
        raise AssertionError('Hosted Close did not destroy the editor window')
    windows.focus(MAIN)
    wait_value('Transport playing', lambda s: s == 'true')


def automation_target(index):
    prepare_workspace_control('Automation target')
    Atspi.Component.grab_focus(ui.wait_for('Automation target'))
    ui.keys('Home')
    for _ in range(index):
        ui.keys('Down')
    ui.keys('Return')
    ui.keys('Escape')
    ui.click('Add automation lane')


def prepare_chain():
    utility = ui.output / 'journey-utility.ultra'
    lowpass = ui.output / 'journey-lowpass.ultra'
    utility.write_bytes(Path('apps/ultra/examples/utility.ultra').read_bytes())
    lowpass.write_bytes(Path('apps/ultra/examples/stereo-lowpass.ultra').read_bytes())
    select_clip('Pulse')
    choose_file('Add effect', 'Load Ultra Device', utility)
    choose_file('Add effect', 'Load Ultra Device', lowpass)
    # Reordering twice must preserve identities and restore the saved signal order.
    reorder_click('Move Pulse Stereo Utility effect 1 later')
    ui.wait_for('Select Pulse Stereo Utility effect 2')
    force_covering_tooltip('Move Pulse Stereo Utility effect 2 earlier', 'Move Pulse Stereo Lowpass effect 1 later')
    reorder_click('Move Pulse Stereo Utility effect 2 earlier')
    ui.wait_for('Select Pulse Stereo Lowpass effect 2')
    # Another Utility with the same reusable ID/key belongs to Harmony alone.
    select_clip('Harmony')
    choose_file('Add effect', 'Load Ultra Device', utility)
    ui.click('Select Harmony Stereo Utility effect 1')
    numeric('Gain base', .85)
    select_clip('Pulse')
    ui.click('Select Pulse Stereo Utility effect 1')
    numeric('Gain base', .6)
    ui.click('Select Pulse Stereo Lowpass effect 2')
    numeric('Cutoff base', 1800)
    numeric('Resonance base', .9)
    screenshot('chain-prepared-audit.png')
    ui.click('Select Pulse Subtractive instrument')
    # Both original instrument cutoff and effect cutoff remain independently editable.
    automation_target(8)
    ui.click('Stereo Lowpass effect 2 / Cutoff automation enabled')
    ui.click('Add Stereo Lowpass effect 2 / Cutoff point')
    numeric('Stereo Lowpass effect 2 / Cutoff point 1 value', 1200)
    screenshot('automation-audit.png')
    return {'utility_source': str(utility), 'lowpass_source': str(lowpass)}


def close_effect_editor():
    ui.click('Close hosted editor')
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        if not any(frame.get_name() == 'Pulse - Ultra Hosted Editor' and
                   frame.get_state_set().contains(Atspi.StateType.SHOWING)
                   for frame in windows.app_frames()):
            windows.focus(MAIN)
            return
        time.sleep(.1)
    raise AssertionError('Effect editor Close did not destroy its native window')


def piano_history_with_effect_editor():
    # The effect editor stays alive while the main window edits pending music.
    windows.focus(MAIN)
    ui.click('Audio details')  # Close the overlay before focusing the roll.
    ui.click('Selected clip piano roll')
    px, py = ui.control_point('Selected clip piano roll', (32 + 2 / 8 * 608) / 640,
                              (21 + 5.5 * 191 / 39) / 218)
    for _ in range(2):
        ui.t.XTestFakeMotionEvent(ui.display, 0, px, py, 0)
        ui.t.XTestFakeButtonEvent(ui.display, 1, 1, 0)
        ui.t.XTestFakeButtonEvent(ui.display, 1, 0, 0)
        ui.x.XFlush(ui.display)
        time.sleep(.07)
    time.sleep(.3)
    assert value('Note 13 pitch') == '80'
    Atspi.Component.grab_focus(ui.wait_for('Selected clip piano roll'))
    ui.keys('Right'); time.sleep(.2)
    ui.keys('Up'); time.sleep(.2)
    assert value('Note 13 beat') == '2.25' and value('Note 13 pitch') == '81'
    ui.click('Undo pending edit'); assert value('Note 13 pitch') == '80'
    ui.click('Redo pending edit'); assert value('Note 13 pitch') == '81'
    ui.click('Prepare / Apply')
    wait_value('Session status', lambda s: 'Stop transport' in s)
    assert value('Note 13 pitch') == '81'
    assert ui.wait_for('Undo pending edit').get_state_set().contains(Atspi.StateType.ENABLED)
    # Same-generation pending edits/undo do not destroy or borrow the editor's DSP.
    windows.focus('Pulse - Ultra Hosted Editor')
    wait_value('Hosted Cutoff base', lambda s: float(s) == 2000)
    windows.focus(MAIN)
    ui.click('Audio details')  # Expose transport diagnostics before asserting Stop.
    transport('stop')
    ui.click('Prepare / Apply'); time.sleep(.4)
    assert not any(frame.get_name() == 'Pulse - Ultra Hosted Editor' and
                   frame.get_state_set().contains(Atspi.StateType.SHOWING)
                   for frame in windows.app_frames()), 'Apply must close the old editor generation'
    assert not ui.wait_for('Undo pending edit').get_state_set().contains(Atspi.StateType.ENABLED)
    assert value('Note 13 pitch') == '81'
    ui.click('Edit selected device in Ultra')
    windows.focus('Pulse - Ultra Hosted Editor')
    wait_value('Hosted Cutoff base', lambda s: float(s) == 2000)
    close_effect_editor()
    transport('start')
    ui.click('Audio details')
    ui.click('Selected clip piano roll')
    screenshot('piano-history-playing.png')
    ui.click('Audio details')
    log('piano add/keyboard/undo/redo with independent effect editor; Stop/Apply/play')


def live_chain():
    before = int(value('Audio callbacks'))
    # Native generation counts musical discontinuities, including each loop.
    ui.click('Select Pulse Stereo Utility effect 1')
    numeric('Gain base', .65)
    ui.click('Bypass Pulse Stereo Utility effect 1')
    ui.click('Bypass Pulse Stereo Utility effect 1')
    ui.click('Select Pulse Stereo Lowpass effect 2')
    numeric('Cutoff base', 1900)
    wait_value('Cutoff effective ownership', lambda s: 'Automation: 1200' in s)
    ui.click('Audio details')
    numeric('Stereo Lowpass effect 2 / Cutoff point 1 value', 1500)
    wait_value('Cutoff effective ownership', lambda s: 'Automation: 1200' in s)
    assert value('Stereo Lowpass effect 2 / Cutoff point 1 value') == '1500'
    screenshot('automation-draft-audit.png')
    ui.click('Discard edits')
    ui.click('Audio details')
    ui.click('Edit selected device in Ultra')
    windows.focus('Pulse - Ultra Hosted Editor')
    numeric('Hosted Cutoff base', 2000)
    wait_value('Hosted Cutoff effective ownership', lambda s: 'Automation: 1200' in s)
    screenshot('effect-editor-audit.png')
    close_effect_editor()
    ui.click('Edit selected device in Ultra')
    windows.focus('Pulse - Ultra Hosted Editor')
    wait_value('Hosted Cutoff base', lambda s: float(s) == 2000)
    piano_history_with_effect_editor()
    wait_value('Transport playing', lambda s: s == 'true')
    assert int(value('Audio callbacks')) > before
    select_clip('Harmony')
    ui.click('Select Harmony Stereo Utility effect 1')
    assert float(value('Gain base')) == .85
    select_clip('Pulse')
    ui.click('Select Pulse Stereo Utility effect 1')
    assert float(value('Gain base')) == .65
    ui.click('Bypass Pulse Stereo Utility effect 1')
    ui.click('Select Pulse Subtractive instrument')
    screenshot('chain-playing-audit.png')


def request_native_close():
    # Send the same X11 protocol message as a window manager's Close action.
    class Data(C.Union):
        _fields_ = [('bytes', C.c_char * 20), ('longs', C.c_long * 5)]

    class Client(C.Structure):
        _fields_ = [('type', C.c_int), ('serial', C.c_ulong), ('send_event', C.c_int),
                    ('display', C.c_void_p), ('window', C.c_ulong),
                    ('message_type', C.c_ulong), ('format', C.c_int), ('data', Data)]

    class Event(C.Union):
        _fields_ = [('client', Client), ('padding', C.c_long * 24)]

    windows.focus(MAIN)
    focused, revert = C.c_ulong(), C.c_int()
    ui.x.XGetInputFocus(ui.display, C.byref(focused), C.byref(revert))
    ui.x.XInternAtom.argtypes = [C.c_void_p, C.c_char_p, C.c_int]
    ui.x.XInternAtom.restype = C.c_ulong
    ui.x.XSendEvent.argtypes = [C.c_void_p, C.c_ulong, C.c_int, C.c_long, C.POINTER(Event)]
    event = Event()
    event.client.type = 33
    event.client.display = ui.display
    event.client.window = focused.value
    event.client.message_type = ui.x.XInternAtom(ui.display, b'WM_PROTOCOLS', 0)
    event.client.format = 32
    event.client.data.longs[0] = ui.x.XInternAtom(ui.display, b'WM_DELETE_WINDOW', 0)
    assert ui.x.XSendEvent(ui.display, focused.value, 0, 0, C.byref(event))
    ui.x.XFlush(ui.display)


def check_separate_apps():
    binary = Path(f'/proc/{ui.pid}/exe').resolve(strict=True)
    assert binary.name == 'alive', f'Alive journey launched {binary}'
    patch = ui.output / 'alongside.ultra'
    patch.write_text('{"version":1,"profile":"ultra-canvas-v1","nodes":[],"edges":[]}\n')
    with (ui.output / 'alongside-ultra.log').open('w') as log:
        other = subprocess.Popen([str(binary.with_name('ultra')), str(patch)], stdout=log, stderr=log)
        try:
            deadline = time.monotonic() + 15
            while time.monotonic() < deadline:
                assert other.poll() is None, 'Ultra did not remain a separate application'
                for root in ui.desktop_apps():
                    if root.get_process_id() == other.pid:
                        if any(a.get_name() == 'alongside.ultra - Ultra' for a in ui.walk(root)):
                            assert Path(f'/proc/{other.pid}/exe').resolve().name == 'ultra'
                            windows.focus(MAIN)
                            return {'alive_binary': str(binary), 'ultra_binary': str(binary.with_name('ultra')),
                                    'simultaneous_native_windows': True}
                time.sleep(.1)
            raise AssertionError('Ultra did not open its independent patch window alongside Alive')
        finally:
            other.terminate()
            other.wait(timeout=8)


def check_audio_settings():
    ui.click('Alive audio settings')
    ui.click('Audio details')

    def buffer(index):
        Atspi.Component.grab_focus(ui.wait_for('Alive buffer frames'))
        ui.keys('Home')
        for _ in range(index):
            ui.keys('Down')
        ui.keys('Return')
        ui.keys('Escape')

    buffer(5)  # Automatic, 32, 64, 128, 256, 512.
    ui.click('Save Alive audio settings')
    settings = Path(os.environ['XDG_DATA_HOME']) / 'org.alive.session/audio-settings.json'
    deadline = time.monotonic() + 5
    while not settings.exists() and time.monotonic() < deadline:
        time.sleep(.1)
    saved = settings.read_bytes()
    assert json.loads(saved)['buffer_frames'] == 512
    buffer(3)  # The private sink rejects 128-frame requests.
    ui.click('Save Alive audio settings')
    wait_value('Alive audio settings status', lambda s: 'does not advertise' in s)
    assert settings.read_bytes() == saved, 'Rejected settings replaced the saved output'
    buffer(5)
    ui.click('Save and start Alive audio')
    wait_value('Audio callbacks', lambda s: int(s) > 0)
    assert value('Transport playing') == 'false'
    assert not ui.wait_for('Save Alive audio settings').get_state_set().contains(Atspi.StateType.ENABLED)
    screenshot('alive-audio-settings.png')
    ui.click('Close audio settings')
    transport('start')
    ui.click('Audio details')  # Close diagnostics so the settings button is reachable.
    ui.click('Alive audio settings')
    ui.click('Audio details')
    wait_value('Track 1 active voices', lambda s: int(s) > 0)
    ui.click('Stop Alive audio to edit settings')
    wait_value('Transport playing', lambda s: s == 'false')
    wait_value('Track 1 active voices', lambda s: s == '0')
    wait_value('Track 2 active voices', lambda s: s == '0')
    ui.click('Save and start Alive audio')
    wait_value('Audio callbacks', lambda s: int(s) > 0)
    assert value('Transport playing') == 'false'
    ui.click('Close audio settings')
    return {'saved': json.loads(saved), 'unsupported_buffer_preserved_settings': True,
            'stop_audio_terminated_notes': True, 'restart_kept_transport_stopped': True}


def run():
    windows.focus(MAIN)
    ui.wait_for('Start transport')
    entrypoints = check_separate_apps()
    audio_settings = check_audio_settings()
    screenshot('session-ready.png')
    assert value('Transport playing') == 'false'
    if os.environ.get('ALIVE_SMOKE_ONLY') == '1':
        transport('start'); time.sleep(1)
        report = detail(); screenshot('session-playing.png')
        transport('stop')
        (ui.output / 'smoke.json').write_text(json.dumps(report, indent=2))
        return
    try:
        ui.find('Select Pulse slot 1')
        upgraded = True
    except StopIteration:
        upgraded = False
    ui.click('New session')
    if upgraded:
        windows.focus('Unsaved Alive Session'); ui.click('Discard'); windows.focus(MAIN)
    time.sleep(.5)
    # Exercise native device loading twice; each track keeps an independent root.
    choose_file('Replace Pulse device', 'Load Ultra Device', DEVICE)
    choose_file('Replace Harmony device', 'Load Ultra Device', DEVICE)
    ui.click('Audio details')  # Keep the lower automation controls unobscured.
    chain = prepare_chain()
    # Replacement intentionally clears lanes, so explicitly author both enabled lanes.
    select_clip('Pulse')
    numeric('Tempo', 116)
    numeric('Note 1 duration', .75)
    numeric('Note 1 velocity', 83)
    for label, initial, second in [('Cutoff', 900, 3400), ('Level', 62, 78)]:
        ui.click(f'{label} automation enabled')
        ui.click(f'Add {label} point')
        numeric(f'{label} point 1 value', initial)
        ui.click(f'Add {label} point')
        numeric(f'{label} point 2 beat', 4)
        numeric(f'{label} point 2 value', second)
    ui.click('Prepare / Apply')
    time.sleep(.5)
    before_reorder = ui.output / 'before-reorder.alive'
    choose_file('Save session as', 'Save Alive Session', before_reorder)
    chain['prepared_instances'] = [d['instanceId'] for d in json.loads(before_reorder.read_text())['tracks'][0]['effects']]
    reorder_click('Move Pulse Stereo Utility effect 1 later')
    ui.wait_for('Select Pulse Stereo Utility effect 2')
    reorder_click('Move Pulse Stereo Utility effect 2 earlier')
    ui.wait_for('Select Pulse Stereo Lowpass effect 2')
    ui.click('Audio details')
    transport('start')
    capture = start_capture('native-walkthrough')
    live_chain()
    numeric('Cutoff base', 1777)
    wait_value('Cutoff effective ownership', lambda s: 'Automation' in s and '1777' not in s)
    numeric('Pulse gain', .55)
    ui.click('Harmony mute'); time.sleep(.3); ui.click('Harmony mute')
    ui.click('Pulse solo'); time.sleep(.3); ui.click('Pulse solo')
    editor_edit()
    editor_edit(1333)
    wait_value('Cutoff base', lambda s: float(s) == 1333)
    screenshot('session-playing.png')
    log('two loaded devices, notes/automation prepared, live base/mixer, editor closed/reopened')
    ui.click('Audio details')
    numeric('Note 1 pitch', 61)
    ui.click('Undo pending edit')
    assert value('Note 1 pitch') == '60'
    assert ui.wait_for('Redo pending edit').get_state_set().contains(Atspi.StateType.ENABLED)
    ui.click('Audio details')
    source = ui.output / 'journey.alive'
    choose_file('Save session as', 'Save Alive Session', source)
    assert ui.wait_for('Redo pending edit').get_state_set().contains(Atspi.StateType.ENABLED)
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        saved = json.loads(source.read_text())
        if saved['tempo'] == 116 and saved['tracks'][0]['device']['parameters'].get('cutoff') == 1333:
            break
        time.sleep(.1)
    assert saved['tempo'] == 116 and saved['tracks'][0]['gain'] == .55
    effects = saved['tracks'][0]['effects']
    assert [d['id'] for d in effects] == ['org.alive.utility', 'org.alive.stereo-lowpass']
    assert effects[0]['parameters']['gain'] == .65 and effects[1]['parameters']['cutoff'] == 2000
    assert effects[0]['bypassed'] is True and effects[1]['bypassed'] is False
    assert saved['tracks'][1]['effects'][0]['parameters']['gain'] == .85
    assert any(l['instanceId'] == effects[1]['instanceId'] and l['key'] == 'cutoff' and l['points'][0]['value'] == 1200 for l in score(saved['tracks'][0])['automation'])
    chain['saved_instances'] = [d['instanceId'] for d in effects]
    assert chain['saved_instances'] == chain['prepared_instances']
    assert score(saved['tracks'][0])['notes'][0]['duration'] == .75
    assert score(saved['tracks'][0])['notes'][0]['velocity'] == 83
    added = score(saved['tracks'][0])['notes'][12]
    assert {key: added[key] for key in ('beat', 'pitch', 'duration', 'velocity')} == {'beat': 2.25, 'pitch': 81, 'duration': .25, 'velocity': 100}
    if saved['format'] == 'alive-session-v3':
        assert added['id'].startswith('note-')
        assert len({note['id'] for note in score(saved['tracks'][0])['notes']}) == len(score(saved['tracks'][0])['notes'])
    transport('stop')
    wait_value('Track 1 active voices', lambda s: s == '0')
    wait_value('Track 2 active voices', lambda s: s == '0')
    choose_file('Open session', 'Open Alive Session', source)
    assert value('Note 13 pitch') == '81' and value('Note 13 beat') == '2.25'
    assert not ui.wait_for('Redo pending edit').get_state_set().contains(Atspi.StateType.ENABLED)
    transport('start')
    assert float(value('Cutoff base')) == 1333
    assert float(value('Pulse gain')) == .55
    force_covering_tooltip('Select Pulse Stereo Lowpass effect 2', 'Devices detail', kind='device selection')
    ui.click('Select Pulse Stereo Lowpass effect 2')
    assert float(value('Cutoff base')) == 2000
    wait_value('Cutoff effective ownership', lambda s: 'Automation: 1200' in s)
    ui.click('Select Pulse Subtractive instrument')
    # Prospective dependency failure must keep the active session and clock running.
    bad = ui.output / 'missing-device.alive'
    broken = json.loads(source.read_text())
    broken['tracks'][0]['device']['path'] = 'missing-device.ultra'
    bad.write_text(json.dumps(broken))
    before = int(value('Absolute frame'))
    ui.click('Audio details')
    numeric('Note 1 pitch', 61)
    ui.click('Audio details')
    choose_file('Open session', 'Open Alive Session', bad)
    time.sleep(.4)
    assert value('Transport playing') == 'true'
    assert int(value('Absolute frame')) > before
    assert float(value('Cutoff base')) == 1333
    wait_value('Session status', lambda s: 'missing-device' in s)
    assert value('Note 1 pitch') == '61'
    assert ui.wait_for('Undo pending edit').get_state_set().contains(Atspi.StateType.ENABLED)
    ui.click('Discard edits')
    changed = json.loads(Path(chain['utility_source']).read_text())
    changed['nodes'][0]['x'] += 1
    Path(chain['utility_source']).write_text(json.dumps(changed))
    choose_file('Open session', 'Open Alive Session', source)
    wait_value('Session status', lambda s: 'Replace' in s and 'journey-utility' in s)
    assert value('Transport playing') == 'true'
    assert int(value('Absolute frame')) > before
    # Restore the admitted source so later Save can validate its fingerprint.
    Path(chain['utility_source']).write_bytes(Path('apps/ultra/examples/utility.ultra').read_bytes())
    log('saved/reopened/playing; missing and changed effect source rejected preserving session')
    walkthrough = finish_capture(capture)
    assert walkthrough['peak'] > 1e-4
    # Keep a bounded, repeating native workload alive for at least the requested
    # *playing* duration. Paused time is excluded conservatively from the receipt.
    required = float(os.environ.get('ALIVE_ENDURANCE_SECONDS', '0'))
    sustained, samples, cycles, played = None, [], 0, 0.
    if required:
        capture = start_capture('endurance')
        time.sleep(3)
        samples.append(process_sample())
        while played < required:
            started = time.monotonic()
            frame_before = int(value('Absolute frame'))
            numeric('Cutoff base', 700 + cycles % 5 * 200)
            numeric('Pulse gain', .45 + cycles % 3 * .05)
            numeric('Seek beat', cycles % 4 * 2)
            ui.click('Seek transport')
            if cycles % 4 == 0:
                editor_edit(800 + cycles % 5 * 100)
            playing.observe(time.monotonic(), value('Transport playing') == 'true', int(value('Absolute frame')), control_action)
            segment_end = time.monotonic() + min(8, max(0, required - played))
            while time.monotonic() < segment_end:
                time.sleep(min(1, max(0, segment_end-time.monotonic())))
                playing.observe(time.monotonic(), value('Transport playing') == 'true', int(value('Absolute frame')), control_action)
                samples.append(process_sample())
            wait_value('Transport playing', lambda s: s == 'true')
            assert int(value('Absolute frame')) > frame_before, 'Audio frame clock stopped advancing'
            played = playing.seconds
            # Retained stream epochs survive Apply; capture each boundary as well.
            log(f'endurance cycle {cycles + 1} before Stop/possible Apply')
            transport('stop')
            wait_value('Track 1 active voices', lambda s: s == '0')
            wait_value('Track 2 active voices', lambda s: s == '0')
            if cycles % 5 == 0:
                numeric('Cutoff point 2 value', 2600 + cycles % 4 * 200)
                ui.click('Prepare / Apply'); time.sleep(.3)
            transport('start')
            cycles += 1
            if cycles % 3 == 0:
                samples.append(process_sample()); log(f'endurance cycle {cycles}, playing seconds {played:.3f}')
            (ui.output / 'endurance-progress.json').write_text(json.dumps({'playing_seconds': played, 'cycles': cycles, 'required': required}, indent=2))
        samples.append(process_sample())
        sustained = finish_capture(capture)
        assert sustained['seconds'] >= required and sustained['peak'] > 1e-4
    with timing.phase('final-diagnostics') if timing else nullcontext():
        final = detail()
    assert final['Audio stream errors'] == '0' and final['Audio failed'] == 'false', final
    assert final['Rejected commands'] == '0', final
    screenshot('session-endurance.png')
    transport('stop')
    ui.click('Save session')
    # Device removal runs while stopped, after every voice has terminated.
    select_clip('Harmony')
    ui.click('Remove Harmony Stereo Utility effect 1'); time.sleep(.3)
    assert value('Track 1 active voices') == '0'
    choose_file('Replace Harmony device', 'Load Ultra Device', DEVICE)
    ui.click('Remove Harmony track'); time.sleep(.4)
    assert value('Track 2 active voices') == '0'
    report = {'kind': 'actual native Tauri application; private Xvfb + software PipeWire loopback',
              'entrypoints': entrypoints,
              'audio_settings': audio_settings, 'chain': chain,
              'hardware': platform.uname()._asdict(), 'cpu': subprocess.check_output(['lscpu'], text=True),
              'physical_audio': False, 'underruns': 'typed CPAL Xrun reports are available through stream diagnostics; physical underruns unmeasured',
              'walkthrough': walkthrough, 'endurance': sustained,
              'playing_seconds_conservative': played, 'edit_transport_cycles': cycles,
              'process_tree_samples': samples, 'final_audio': final, 'operations': operations}
    (ui.output / 'native-session-report.json').write_text(json.dumps(report, indent=2))
    checkpoint('report-write', 'before close/cancel/quit assertions')
    screenshot('session-device-removed.png')
    # An explicitly accepted musical boundary survives cancellation of a later dialog.
    ui.click('Audio details')
    numeric('Note 1 velocity', 82)
    ui.click('Quit Alive')
    windows.focus('Pending Schedule Edits'); ui.click('Apply edits')
    windows.focus('Unsaved Alive Session'); ui.click('Cancel')
    windows.focus(MAIN)
    assert value('Note 1 velocity') == '82'
    assert not ui.wait_for('Undo pending edit').get_state_set().contains(Atspi.StateType.ENABLED)
    numeric('Note 1 velocity', 81)
    ui.click('Save session as')
    windows.focus('Pending Schedule Edits'); ui.click('Discard edits')
    focus_chooser('Save Alive Session'); ui.click('Cancel')
    windows.focus(MAIN)
    assert value('Note 1 velocity') == '82'
    assert not ui.wait_for('Undo pending edit').get_state_set().contains(Atspi.StateType.ENABLED)
    report['accepted_apply_outer_quit_cancel_cleared_history'] = True
    report['accepted_discard_canceled_save_picker_cleared_history'] = True
    ui.click('Audio details')
    request_native_close()
    windows.focus('Unsaved Alive Session')
    ui.click('Cancel')
    windows.focus(MAIN)
    transport('start')
    report['quit_cancel_preserved_session'] = True
    report['native_window_close_reached_dirty_guard'] = True
    ui.click('Audio details')
    numeric('Note 1 pitch', 63)
    ui.click('Quit Alive')
    windows.focus('Pending Schedule Edits')
    ui.click('Cancel')
    windows.focus(MAIN)
    assert value('Note 1 pitch') == '63'
    ui.click('Discard edits')
    ui.click('Audio details')
    wait_value('Transport playing', lambda s: s == 'true')
    report['pending_draft_quit_cancel_retained_edits_and_playback'] = True
    checkpoint('final-quit-entry')
    ui.click('Quit Alive')
    windows.focus('Unsaved Alive Session')
    ui.click('Discard')
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        try:
            state = Path(f'/proc/{ui.pid}/stat').read_text().split(') ', 1)[1].split()[0]
            if state == 'Z':
                break
        except FileNotFoundError:
            break
        time.sleep(.1)
    else:
        raise AssertionError('Alive Quit did not exit after Discard')
    report['quit_discard_exited'] = True
    checkpoint('final-quit-exit')
    (ui.output / 'native-session-report.json').write_text(json.dumps(report, indent=2))
    checkpoint('report-write', 'final Quit assertions passed')
    print(json.dumps(report, indent=2), flush=True)
    checkpoint('journey-complete')


if __name__ == '__main__':
    timing = TimingProbe(ui.output)
    ui.wait_for = timing.wrap('wait_for', ui.wait_for)
    windows.scoped_find = timing.wrap('scoped_find', windows.scoped_find)
    ui.find = windows.scoped_find
    ui.walk = timing.wrap_walk(ui.walk)
    with timing:
        try:
            run()
        except Exception as error:
            timing.checkpoint('failure', type(error).__name__)
            try:
                ui.click('Audio details')
            except Exception:
                pass
            nodes = []
            for frame in windows.app_frames():
                for item in ui.walk(frame):
                    try:
                        nodes.append({'name': item.get_name(), 'role': item.get_role_name(),
                                      'text': Atspi.Text.get_text(item, 0, -1) if 'Text' in item.get_interfaces() else ''})
                    except Exception:
                        continue
            (ui.output / 'journey-failure.json').write_text(json.dumps(nodes, indent=2))
            screenshot('journey-failure.png')
            raise
