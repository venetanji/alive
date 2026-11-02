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

root = Path('/tmp/alive-pr12-native-20261102')
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
        subprocess.run(['gio', 'launch', str(desktop)], stdout=log, stderr=log, check=True)
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
        shots = []
        for width, height in ((800, 600), (1280, 800), (1440, 900), (800, 600), (1440, 900)):
            ui.x.XMoveWindow(ui.display, native_window, 0, 0)
            ui.x.XResizeWindow(ui.display, native_window, width, height)
            ui.x.XRaiseWindow(ui.display, native_window)
            ui.x.XFlush(ui.display)
            time.sleep(.5)
            assert geometry(native_window) == (width, height), (name, geometry(native_window), width, height)
            ui.wait_for('Start audio' if name == 'ultra' else ready, text_content=True)
            filename = f'{name}-launcher-{width}x{height}.png'
            image = Gdk.pixbuf_get_from_window(Gdk.get_default_root_window(), 0, 0, width, height)
            assert image is not None
            image.savev(str(output / filename), 'png', [], [])
            shots.append(filename)
        report['apps'].append({'app': name, 'desktop_entry': str(desktop), 'executable': str(executable),
                               'executable_sha256': digest(executable), 'native_library': next(iter(libraries)),
                               'native_library_sha256': digest(Path(next(iter(libraries)))),
                               'ready_accessible_text': ready, 'screenshots': sorted(set(shots)),
                               'resize_restore': 'passed', 'pass': True})
        print(f'PASS actual {name} desktop entry, exact executable/library, ready UI and 3 sizes with resize/restore', flush=True)
    finally:
        os.kill(pid, signal.SIGTERM)
        wait(lambda: not processes(name), 'Probe app failed to stop')
(output / 'launcher-results.json').write_text(json.dumps(report, indent=2) + '\n')
