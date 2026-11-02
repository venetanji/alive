"""Run only on check_canvas_desktop.sh's private display and software audio."""
import ctypes as C
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

root = Path(__file__).resolve().parents[5]
sys.path.insert(0, str(root / 'apps/ultra/tests'))
import check_canvas_desktop as ui
from gi.repository import Atspi, Gdk

output = Path(os.environ['ULTRA_TEST_OUTPUT_DIR'])
selected = Path('/home/venetanji/.local/share/alive/current-test').resolve(strict=True)
applications = Path('/home/venetanji/.local/share/applications')
manifest = json.loads((selected / 'source-build-manifest.json').read_text())
os.kill(ui.pid, signal.SIGTERM)
time.sleep(.5)

ui.x.XDefaultRootWindow.argtypes = [C.c_void_p]
ui.x.XDefaultRootWindow.restype = C.c_ulong
ui.x.XQueryTree.argtypes = [C.c_void_p, C.c_ulong, C.POINTER(C.c_ulong), C.POINTER(C.c_ulong), C.POINTER(C.POINTER(C.c_ulong)), C.POINTER(C.c_uint)]
ui.x.XFree.argtypes = [C.c_void_p]
ui.x.XInternAtom.argtypes = [C.c_void_p, C.c_char_p, C.c_int]
ui.x.XInternAtom.restype = C.c_ulong
ui.x.XGetWindowProperty.argtypes = [C.c_void_p, C.c_ulong, C.c_ulong, C.c_long, C.c_long, C.c_int, C.c_ulong, C.POINTER(C.c_ulong), C.POINTER(C.c_int), C.POINTER(C.c_ulong), C.POINTER(C.c_ulong), C.POINTER(C.POINTER(C.c_ubyte))]
ui.x.XResizeWindow.argtypes = [C.c_void_p, C.c_ulong, C.c_uint, C.c_uint]
ui.x.XMoveWindow.argtypes = [C.c_void_p, C.c_ulong, C.c_int, C.c_int]
ui.x.XRaiseWindow.argtypes = [C.c_void_p, C.c_ulong]
ui.x.XGetGeometry.argtypes = [C.c_void_p, C.c_ulong, C.POINTER(C.c_ulong), C.POINTER(C.c_int), C.POINTER(C.c_int), C.POINTER(C.c_uint), C.POINTER(C.c_uint), C.POINTER(C.c_uint), C.POINTER(C.c_uint)]

def geometry(window_id):
    root_id = C.c_ulong(); x = C.c_int(); y = C.c_int()
    width = C.c_uint(); height = C.c_uint(); border = C.c_uint(); depth = C.c_uint()
    assert ui.x.XGetGeometry(ui.display, window_id, C.byref(root_id), C.byref(x), C.byref(y), C.byref(width), C.byref(height), C.byref(border), C.byref(depth))
    return width.value, height.value

def wait(check, description):
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        result = check()
        if result:
            return result
        time.sleep(.1)
    raise AssertionError(description)

def processes(name):
    result = []
    for entry in Path('/proc').iterdir():
        if not entry.name.isdigit():
            continue
        try:
            if (entry / 'exe').resolve() != selected / 'bin' / name:
                continue
            environment = (entry / 'environ').read_bytes().split(b'\0')
            if f'DISPLAY={os.environ["DISPLAY"]}'.encode() in environment:
                result.append(int(entry.name))
        except (OSError, PermissionError):
            pass
    return result

def window(pid):
    parent = C.c_ulong(); root_window = C.c_ulong()
    children = C.POINTER(C.c_ulong)(); count = C.c_uint()
    ui.x.XQueryTree(ui.display, ui.x.XDefaultRootWindow(ui.display), C.byref(root_window), C.byref(parent), C.byref(children), C.byref(count))
    atom = ui.x.XInternAtom(ui.display, b'_NET_WM_PID', 0)
    try:
        for index in range(count.value):
            actual = C.c_ulong(); fmt = C.c_int(); length = C.c_ulong(); remaining = C.c_ulong()
            value = C.POINTER(C.c_ubyte)()
            ui.x.XGetWindowProperty(ui.display, children[index], atom, 0, 1, 0, 0, C.byref(actual), C.byref(fmt), C.byref(length), C.byref(remaining), C.byref(value))
            try:
                if (length.value and C.cast(value, C.POINTER(C.c_ulong))[0] == pid
                        and geometry(children[index])[0] >= 800 and geometry(children[index])[1] >= 600):
                    return int(children[index])
            finally:
                if value:
                    ui.x.XFree(value)
    finally:
        if children:
            ui.x.XFree(children)

def digest(path):
    with path.open('rb') as file:
        return hashlib.file_digest(file, 'sha256').hexdigest()

report = {'selected_snapshot': str(selected), 'reported_build_commit': manifest['reported_build_commit'],
          'scope': 'actual desktop entries, private Xvfb/DBus and software-only PipeWire; no audio started', 'apps': []}
for name, identifier, ready in (('alive', 'org.alive.session.test', 'Start transport'),
                                ('ultra', 'org.alive.ultra.research', 'Shared native patch ready.')):
    desktop = applications / f'{identifier}.desktop'
    assert not processes(name)
    with (output / f'{name}-desktop-launch.log').open('w') as log:
        subprocess.run(['gio', 'launch', str(desktop), *([str(output / 'initial.alive')] if name == 'alive' else [])], stdout=log, stderr=log, check=True)
    pid = wait(lambda: next(iter(processes(name)), None), f'{name} desktop did not start selected executable')
    ui.pid = pid
    try:
        ui.wait_for(ready, text_content=True)
        executable = Path(f'/proc/{pid}/exe').resolve(strict=True)
        assert digest(executable) == manifest['artifacts'][f'bin/{name}']['sha256']
        libraries = {line.split()[-1] for line in Path(f'/proc/{pid}/maps').read_text().splitlines() if 'libultra_native.so' in line}
        assert libraries == {str(selected / 'bin/libultra_native.so')}, libraries
        assert digest(Path(next(iter(libraries)))) == manifest['artifacts']['bin/libultra_native.so']['sha256']
        environment = Path(f'/proc/{pid}/environ').read_bytes().split(b'\0')
        assert not any(item.startswith(b'LD_LIBRARY_PATH=') for item in environment)
        native_window = wait(lambda: window(pid), 'Native window missing')
        checks = []
        def bounds(label):
            rect = Atspi.Component.get_extents(ui.wait_for(label), Atspi.CoordType.SCREEN)
            return {'x': rect.x, 'y': rect.y, 'width': rect.width, 'height': rect.height}

        def screenshot(filename, width, height):
            image = Gdk.pixbuf_get_from_window(Gdk.get_default_root_window(), 0, 0, width, height)
            assert image is not None
            image.savev(str(output / filename), 'png', [], [])
            shots.append(filename)

        shots = []
        for width, height in ((800, 600), (1280, 800), (1440, 900), (800, 600), (1440, 900)):
            ui.x.XMoveWindow(ui.display, native_window, 0, 0)
            ui.x.XResizeWindow(ui.display, native_window, width, height)
            ui.x.XRaiseWindow(ui.display, native_window)
            ui.x.XFlush(ui.display)
            time.sleep(.5)
            assert geometry(native_window) == (width, height), (name, geometry(native_window), width, height)
            ui.wait_for('Start audio' if name == 'ultra' else ready, text_content=True)
            screenshot(f'{name}-launcher-{width}x{height}.png', width, height)
            if name == 'alive':
                ui.click('Toggle Device view')
                small = bounds('Contextual help')
                assert small['height'] == 180, small
                separator = ui.wait_for('Resize detail area')
                Atspi.Component.grab_focus(separator)
                ui.keys('Home')
                clip_top = bounds('Resize detail area')['y']
                ui.keys('End')
                large = bounds('Contextual help')
                assert large['height'] == 180 and large['y'] == small['y'], (small, large)
                assert bounds('Resize detail area')['y'] < clip_top
                screenshot(f'alive-both-{width}x{height}.png', width, height)
                ui.click('Toggle Clip view')
                assert bounds('Contextual help')['height'] == 180
                assert not ui.find('Maximize detail').get_state_set().contains(Atspi.StateType.ENABLED)
                screenshot(f'alive-devices-{width}x{height}.png', width, height)
                ui.click('Toggle Clip view')
                ui.click('Toggle Device view')
                ui.click('Toggle Clip view')
                assert bounds('Contextual help')['height'] == 180
                screenshot(f'alive-help-without-editors-{width}x{height}.png', width, height)
                ui.click('Toggle contextual help')
                try:
                    assert not ui.find('Contextual help').get_state_set().contains(Atspi.StateType.SHOWING)
                except StopIteration:
                    pass
                ui.click('Toggle contextual help')
                assert bounds('Contextual help')['height'] == 180
                ui.click('Toggle Clip view')
                header = bounds('Select Pulse track')
                browser = bounds('Device and file browser')
                assert header['height'] == 21, header
                assert browser['width'] == (290 if width == 800 else 334), browser
                ui.click('Display options')
                for unavailable in ('Sends', 'Return Tracks'):
                    assert not ui.find(unavailable).get_state_set().contains(Atspi.StateType.ENABLED)
                ui.click('Show Browser')
                ui.click('Show Browser')
                ui.click('Show mixer controls')
                ui.click('Show mixer controls')
                ui.click('Display options')
                ui.wait_for('Pulse gain fader')
                ui.wait_for('Search browser')
                print(f'PASS Alive panels, resizer and repeated display toggles at {width}x{height}', flush=True)
                checks.append({'size': [width, height], 'device_height': 180,
                               'clip_resize': 'passed', 'device_only_restore': 'passed',
                               'display_toggles': 'passed', 'help_without_editors': 'passed',
                               'study_geometry': {'browser_width': browser['width'], 'track_header_height': header['height']}})
        if name == 'alive':
            # Pointer navigation must not accept the focused mixer's draft.
            def pointer_click(label):
                rect = bounds(label)
                assert rect['width'] > 0 and rect['height'] > 0
                assert ui.t.XTestFakeMotionEvent(ui.display, 0, rect['x'] + rect['width'] // 2,
                                                rect['y'] + rect['height'] // 2, 0)
                assert ui.t.XTestFakeButtonEvent(ui.display, 1, 1, 0)
                assert ui.t.XTestFakeButtonEvent(ui.display, 1, 0, 0)
                ui.x.XFlush(ui.display)
                time.sleep(.2)

            original_gain = ui.numeric_value('Pulse gain fader')
            ui.text('Pulse gain', '0.713')
            pointer_click('Display options')
            pointer_click('Show mixer controls')
            pointer_click('Show mixer controls')
            pointer_click('Display options')
            assert abs(ui.numeric_value('Pulse gain') - .713) < .0001
            assert abs(ui.numeric_value('Pulse gain fader') - original_gain) < .0001
            ui.text('Pulse gain', str(original_gain))
            ui.keys('Tab')
            toggle = ui.wait_for('Display options')
            Atspi.Component.grab_focus(toggle)
            ui.keys('Return')
            ui.keys('Down')
            assert ui.find('Show Browser').get_state_set().contains(Atspi.StateType.FOCUSED)
            ui.keys('Escape')
            assert ui.find('Display options').get_state_set().contains(Atspi.StateType.FOCUSED)
            checks.append({'draft_after_mixer_hide_show': 'passed; admitted fader unchanged',
                           'display_keyboard_and_focus': 'passed'})
            # Exercise the real menu owner against the private staged session.
            session = output / 'initial.alive'
            modified = session.stat().st_mtime_ns
            ui.click('File menu')
            save = bounds('Save session')
            assert 0 <= save['x'] < 1440 and 0 <= save['y'] < 900
            ui.click('Save session')
            ui.wait_for('Session saved.', text_content=True)
            assert session.stat().st_mtime_ns > modified
            checks.append({'save_from_file': 'native acknowledgement and staged-file write passed'})
            ui.click('Display options')
            screenshot('alive-display-menu-1440x900.png', 1440, 900)
            ui.click('Display options')
        report['apps'].append({'app': name, 'desktop_entry': str(desktop), 'executable': str(executable),
                               'executable_sha256': digest(executable), 'native_library': next(iter(libraries)),
                               'native_library_sha256': digest(Path(next(iter(libraries)))),
                               'ready_accessible_text': ready, 'screenshots': sorted(set(shots)),
                               'resize_restore': 'passed', 'checks': checks, 'pass': True})
        print(f'PASS actual {name} desktop entry, exact executable/library, ready UI and 3 sizes with resize/restore', flush=True)
    finally:
        os.kill(pid, signal.SIGTERM)
        wait(lambda: not processes(name), 'Probe app failed to stop')
(output / 'native-shell-results.json').write_text(json.dumps(report, indent=2) + '\n')
