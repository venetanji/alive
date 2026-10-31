"""Installed saved-surface acceptance on the existing private desktop/audio harness."""
import ctypes as C
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

import check_alive_desktop as alive
from gi.repository import Atspi

ui = alive.ui
windows = alive.windows
ui.find = windows.scoped_find
report = {'synthetic_ipc': False, 'physical_audio': False, 'inputs': [], 'layouts': []}


def record():
    (ui.output / 'saved-presentation-report.json').write_text(json.dumps(report, indent=2) + '\n')


def raw(name):
    control = ui.wait_for(name)
    return Atspi.Text.get_text(control, 0, -1)


def enter(name, text, commit=True):
    ui.click(name)
    ui.keys('Control_L', 'a')
    ui.keys('BackSpace')
    for char in text:
        ui.keys({'-': 'minus', '.': 'period'}.get(char, char))
    if commit:
        ui.keys('Tab')
    report['inputs'].append({'control': name, 'text': text, 'commit': commit, 'method': 'XTest keys'})
    record()


def save(name):
    path = ui.output / name
    alive.choose_file('Save session as', 'Save Alive Session', path)
    return json.loads(path.read_text())['score']


def instrument(score, track):
    return score['tracks'][track]['chain']['instrument']


def bounds(control):
    rect = Atspi.Component.get_extents(control, Atspi.CoordType.SCREEN)
    return [rect.x, rect.y, rect.width, rect.height]


def resize(width, height):
    window = alive.owned_frame_window()
    ui.x.XResizeWindow(ui.display, window, width, height)
    ui.x.XMoveWindow(ui.display, window, 0, 0)
    ui.x.XFlush(ui.display)
    time.sleep(.6)
    attributes = alive.WindowAttributes()
    assert ui.x.XGetWindowAttributes(ui.display, window, C.byref(attributes))
    actual = [attributes.width, attributes.height]
    report.setdefault('native_window_sizes', []).append({'scope': windows.scope,
        'requested': [width, height], 'actual': actual})
    record()
    assert actual == [width, height], {'requested': [width, height], 'actual': actual}


def horizontal_wheel(point, button):
    ui.t.XTestFakeMotionEvent(ui.display, 0, *point, 0)
    shift = ui.x.XKeysymToKeycode(ui.display, ui.x.XStringToKeysym(b'Shift_L'))
    ui.t.XTestFakeKeyEvent(ui.display, shift, 1, 0)
    try:
        for _ in range(12):
            ui.t.XTestFakeButtonEvent(ui.display, button, 1, 0)
            ui.t.XTestFakeButtonEvent(ui.display, button, 0, 0)
    finally:
        ui.t.XTestFakeKeyEvent(ui.display, shift, 0, 0)
    ui.x.XFlush(ui.display)
    time.sleep(.35)


def layout(product, width, height, parameter):
    resize(width, height)
    ownership = 'Attack effective ownership'
    first = ui.wait_for(parameter)
    dial_name = 'Attack base slider' if product == 'alive' else 'Attack'
    dial = next(item for frame in windows.app_frames() for item in ui.walk(frame)
                if item.get_name() == dial_name and item.get_role_name() == 'slider')
    dial_bounds = bounds(dial)
    wheel_x = dial_bounds[0] + dial_bounds[2] // 2
    viewport_left = 0
    if product == 'ultra':
        panel_bounds = bounds(ui.wait_for('Instrument panel'))
        wheel_x = panel_bounds[0] + panel_bounds[2] // 2
        viewport_left = panel_bounds[0]
    # Saved items have an eight-pixel top gutter, outside their interactive body.
    group_bounds = bounds(ui.wait_for('Attack'))
    wheel_point = [wheel_x, group_bounds[1] - 4]
    original_first = raw(parameter)
    last_name = 'Level base' if product == 'alive' else 'Level value'
    original_last = raw(last_name)
    Atspi.Component.grab_focus(first)
    for left_batches in range(1, 17):
        horizontal_wheel(wheel_point, 4)
        if bounds(first)[0] >= viewport_left:
            break
    time.sleep(.2)
    first_bounds = bounds(first)
    owner_text = alive.value(ownership)
    assert 'Base:' in owner_text, owner_text
    assert (first_bounds[0] >= viewport_left and first_bounds[0] + first_bounds[2] <= width and
            first_bounds[1] >= 0 and first_bounds[1] + first_bounds[3] <= height), first_bounds
    alive.screenshot(f'{product}-{width}x{height}-start.png')
    fixed_control = ui.wait_for('Save session' if product == 'alive' else 'Close instrument panel')
    fixed_bounds = bounds(fixed_control)
    last = ui.wait_for(last_name)
    Atspi.Component.grab_focus(last)
    scroll_attempts = []
    for _ in range(16):
        horizontal_wheel(wheel_point, 5)
        last_bounds = bounds(last)
        scroll_attempts.append(last_bounds)
        if last_bounds[0] >= 0 and last_bounds[0] + last_bounds[2] <= width - 14:
            break
    report.setdefault('scroll_attempts', []).append({'product': product, 'window': [width, height],
        'wheel_point': wheel_point, 'last_bounds': scroll_attempts})
    record()
    assert (min(last_bounds[2:]) > 0 and last_bounds[0] >= 0 and last_bounds[0] + last_bounds[2] <= width and
            last_bounds[1] >= 0 and last_bounds[1] + last_bounds[3] <= height), last_bounds
    alive.screenshot(f'{product}-{width}x{height}-end.png')
    assert bounds(fixed_control) == fixed_bounds, 'Horizontal scroll moved window chrome'
    assert raw(parameter) == original_first and raw(last_name) == original_last, 'Wheel input changed saved values'
    if width == 800:
        assert bounds(first)[0] < first_bounds[0], 'Saved controls did not scroll internally'
    report['layouts'].append({'product': product, 'window': [width, height], 'first': first_bounds,
                              'last_after_focus_scroll': last_bounds, 'ownership': owner_text,
                              'first_after_scroll': bounds(first), 'fixed_control_bounds': fixed_bounds,
                              'scroll_input': 'XTest Shift + vertical wheel', 'actual_first_value': raw(parameter),
                              'wheel_point': wheel_point,
                              'left_wheel_batches': left_batches, 'wheel_batches': len(scroll_attempts),
                              'wheel_values_unchanged': True,
                              'actual_last_value': raw(last.get_name())})
    record()


def identity(pid):
    binary = Path(f'/proc/{pid}/exe').resolve()
    native = binary.parent / 'libultra_native.so'
    assert str(native) in Path(f'/proc/{pid}/maps').read_text()
    return {'pid': pid, 'binary': str(binary), 'binary_sha256': hashlib.sha256(binary.read_bytes()).hexdigest(),
            'native_library': str(native), 'native_sha256': hashlib.sha256(native.read_bytes()).hexdigest()}


ui.x.XResizeWindow.argtypes = [C.c_void_p, C.c_ulong, C.c_uint, C.c_uint]
ui.x.XGetWindowAttributes.argtypes = [C.c_void_p, C.c_ulong, C.POINTER(alive.WindowAttributes)]
ultra = None
alive_pid = ui.pid


def run_alive():
    windows.focus('Alive')
    ui.wait_for('Select Pulse track')
    ui.click('Devices detail')
    ui.click('Select Pulse track')
    ui.wait_for('Attack base')
    baseline = save('independent-baseline.alive')
    one, two = instrument(baseline, 0), instrument(baseline, 1)
    assert one['sourceSha256'] == two['sourceSha256'] and one['instanceId'] != two['instanceId']
    enter('Attack base', '23')
    alive.wait_value('Attack base', lambda text: float(text) == 23)
    ui.click('Select Harmony track')
    assert float(alive.value('Attack base')) == two['parameters']['attack']
    enter('Attack base', '47')
    alive.wait_value('Attack base', lambda text: float(text) == 47)
    ui.click('Select Pulse track')
    assert float(alive.value('Attack base')) == 23
    # An empty number is an unfinished field, never an accepted base mutation.
    enter('Attack base', '', commit=False)
    assert raw('Attack base') == ''
    ui.click('Select Harmony track')
    assert float(alive.value('Attack base')) == 47
    ui.click('Select Pulse track')
    assert raw('Attack base') == ''
    alive.screenshot('independent-unfinished-field.png')
    ui.click('Attack base')
    ui.keys('Escape')
    assert float(alive.value('Attack base')) == 23
    # Native keyboard manipulation of the saved dial exercises its real handler.
    dial = ui.wait_for('Attack base slider')
    Atspi.Component.grab_focus(dial)
    ui.keys('Right')
    time.sleep(.4)
    dial_value = float(alive.value('Attack base'))
    assert dial_value != 23
    accepted = save('independent-accepted.alive')
    assert instrument(accepted, 0)['parameters']['attack'] == dial_value
    assert instrument(accepted, 1)['parameters']['attack'] == 47
    report['independence'] = {'same_source_sha256': one['sourceSha256'],
        'instance_ids': [one['instanceId'], two['instanceId']], 'unfinished_field_survived_navigation': True,
        'accepted_values': [dial_value, 47], 'other_parameters_unchanged':
        all({k:v for k,v in instrument(accepted, i)['parameters'].items() if k != 'attack'} ==
            {k:v for k,v in instrument(baseline, i)['parameters'].items() if k != 'attack'} for i in [0, 1])}
    assert report['independence']['other_parameters_unchanged']
    record()
    for size in [(800, 600), (1280, 800)]:
        layout('alive', *size, 'Attack base')
    capture = alive.start_capture('editor-close-playing')
    alive.transport('start')
    ui.click('Launch Pulse Clip 1')
    time.sleep(2)
    ui.click('Open Pulse editor')
    windows.focus('Pulse - Ultra Hosted Editor')
    ui.wait_for('Hosted Attack base')
    assert float(alive.value('Hosted Attack base')) == dial_value
    alive.screenshot('installed-hosted-editor-playing.png')
    ui.click('Close hosted editor')
    time.sleep(.4)
    assert not any(frame.get_name() == 'Pulse - Ultra Hosted Editor' and
                   frame.get_state_set().contains(Atspi.StateType.SHOWING) for frame in windows.app_frames())
    windows.focus('Alive')
    assert alive.value('Transport playing') == 'true'
    time.sleep(2)
    alive.screenshot('installed-editor-closed-playing.png')
    pcm = alive.finish_capture(capture)
    assert pcm['peak'] > .001 and max(pcm['one_second_peaks'][-2:]) > .001, pcm
    alive.transport('stop')
    assert alive.value('Audio stream errors') == '0' and alive.value('Rejected commands') == '0'
    report['alive'] = {**identity(ui.pid), 'audio': pcm, 'stream_errors': 0, 'rejected_commands': 0,
                       'editor_closed_while_playing': True}
    record()


def run_ultra():
    global ultra
    binary = Path(os.environ['ULTRA_TEST_ALIVE_BINARY']).with_name('ultra')
    fixture = (binary.parent.parent / 'lib/Ultra Research/alive-session/ultra/examples/subtractive.ultra').resolve(strict=True)
    with (ui.output / 'ultra-perform.log').open('w') as log:
        ultra = subprocess.Popen([str(binary), str(fixture)], stdout=log, stderr=subprocess.STDOUT,
                                 env={key:value for key,value in os.environ.items() if key != 'LD_LIBRARY_PATH'})
    ui.pid = ultra.pid
    windows.focus(fixture.name + ' - Ultra')
    ui.wait_for('Perform instrument')
    ui.click('Perform instrument')
    ui.wait_for('Attack value')
    panel = ui.wait_for('Instrument panel')
    controls = [{'name': item.get_name(), 'role': item.get_role_name()}
                for item in ui.walk(panel) if item.get_role_name() in ('push button', 'slider', 'spin button', 'entry')]
    assert not any('keyboard' in item['name'].lower() or item['name'] in ('Play note', 'Stop instrument') for item in controls)
    saved_presentation = json.loads(fixture.read_text())['presentation']
    saved_labels = [item['label'] for item in saved_presentation['items'] if item['kind'] == 'control']
    assert [item['name'] for item in controls if item['role'] == 'slider'] == saved_labels
    for size in [(800, 600), (1280, 800)]:
        layout('ultra', *size, 'Attack value')
    ui.click('Close instrument panel')
    ui.click('Perform instrument')
    assert float(alive.value('Attack value')) == 10
    report['ultra'] = {**identity(ui.pid), 'automatic_keyboard': False,
                       'observed_panel_controls': controls,
                       'saved_surface_size': saved_presentation['size'], 'saved_surface_controls': saved_labels}


try:
    report['mode'] = 'ultra-only' if os.environ.get('ALIVE_PRESENTATION_ULTRA_ONLY') == '1' else 'full'
    if report['mode'] == 'full':
        run_alive()
    run_ultra()
    report['passed'] = True
    record()
except Exception:
    alive.screenshot('saved-presentation-failure.png')
    record()
    raise
finally:
    if ultra is not None:
        ultra.terminate()
        ultra.wait(timeout=8)
        ui.pid = alive_pid
