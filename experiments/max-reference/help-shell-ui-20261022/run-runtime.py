#!/usr/bin/env python3
"""Observe installed append help in an owned disposable Max/Xvfb session."""
import ctypes as C
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parent
RESULTS = ROOT / 'results'
RESULTS.mkdir(exist_ok=True)
PREFIX = Path('/home/venetanji/.cache/alive-max-append-shell-20261022-wine-disposable')
WORK = Path('/home/venetanji/.cache/alive-max-append-shell-20261022-run')
WINE = Path('/home/venetanji/.local/opt/wine-d2d1-nspa-11.13/bin/wine')
RESOURCES = PREFIX / 'drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources'
HELP = RESOURCES / 'help/max/append.maxhelp'
assert hashlib.sha256(HELP.read_bytes()).hexdigest() == 'd4a3fe4d87f7fd7b30c747cc18cc09f7ba6dd703adadc279733df38503962729'
assert not (RESULTS / 'initial.png').exists(), 'Preserve existing screenshots'
for proc in Path('/proc').glob('[0-9]*'):
    try:
        assert ('WINEPREFIX=' + str(PREFIX)).encode() not in proc.joinpath('environ').read_bytes().split(b'\0'), 'Prefix already active'
    except (PermissionError, FileNotFoundError, ProcessLookupError):
        pass
for path in (PREFIX / 'drive_c/users').glob('*/*'):
    assert not path.is_symlink(), 'Unexpected copied home symlink'
WORK.mkdir(exist_ok=True)
log = (WORK / 'runtime.log').open('w')
xvfb = subprocess.Popen(['Xvfb', '-displayfd', '1', '-screen', '0', '1440x1000x24', '-nolisten', 'tcp'], stdout=subprocess.PIPE, stderr=log, text=True)
display = ':' + xvfb.stdout.readline().strip()
env = dict(os.environ, WINEPREFIX=str(PREFIX), WINEDEBUG='-all', DISPLAY=display,
           WAYLAND_DISPLAY='', WINESERVER=str(WINE.parent / 'wineserver'),
           LIBGL_ALWAYS_SOFTWARE='1', MESA_LOADER_DRIVER_OVERRIDE='llvmpipe')
process = subprocess.Popen([str(WINE), r'C:\ProgramData\Ableton\Live 12 Suite\Resources\Max\Max.exe',
                           r'C:\ProgramData\Ableton\Live 12 Suite\Resources\Max\resources\help\max\append.maxhelp'], env=env, stdout=log, stderr=log)
session = dict(display=display, xvfb_pid=xvfb.pid, launcher_pid=process.pid, prefix=str(PREFIX), installed_help=str(HELP))
(WORK / 'session.json').write_text(json.dumps(session, indent=2) + '\n')
print(json.dumps(session), flush=True)
x, t = C.CDLL('libX11.so.6'), C.CDLL('libXtst.so.6')
P, U = C.c_void_p, C.c_ulong
x.XOpenDisplay.argtypes, x.XOpenDisplay.restype = [C.c_char_p], P
x.XStringToKeysym.argtypes, x.XStringToKeysym.restype = [C.c_char_p], U
x.XKeysymToKeycode.argtypes, x.XKeysymToKeycode.restype = [P, U], C.c_uint
t.XTestFakeKeyEvent.argtypes = [P, C.c_uint, C.c_int, U]
t.XTestFakeMotionEvent.argtypes = [P, C.c_int, C.c_int, C.c_int, U]
t.XTestFakeButtonEvent.argtypes = [P, C.c_uint, C.c_int, U]
x.XFlush.argtypes = [P]
d = x.XOpenDisplay(display.encode())
assert d
events = []


def capture(stage):
    path = RESULTS / (stage + '.png')
    assert not path.exists()
    subprocess.run(['import', '-display', display, '-window', 'root', str(path)], check=True)
    row = dict(stage=stage, at_ms=round((time.monotonic() - start) * 1000))
    events.append(row)
    (RESULTS / 'events.json').write_text(json.dumps(events, indent=2) + '\n')
    print(json.dumps(row), flush=True)


start = time.monotonic()
try:
    time.sleep(14)
    capture('initial')
    control = WORK / 'control.json'
    seen = set()
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        if control.exists():
            try:
                command = json.loads(control.read_text())
            except json.JSONDecodeError:
                time.sleep(.1)
                continue
            if command['id'] not in seen:
                seen.add(command['id'])
                if command['type'] == 'finish':
                    assert {'question', 'basic-return'} <= {row['stage'] for row in events}
                    break
                assert command['type'] == 'click'
                assert command['stage'] in ['question', 'basic-return']
                xpos, ypos = command['x'], command['y']
                assert 0 <= xpos < 1440 and 0 <= ypos < 1000
                t.XTestFakeMotionEvent(d, -1, xpos, ypos, 0)
                t.XTestFakeButtonEvent(d, 1, 1, 0)
                t.XTestFakeButtonEvent(d, 1, 0, 0)
                x.XFlush(d)
                events.append(dict(action='click', x=xpos, y=ypos, stage=command['stage']))
                time.sleep(.8)
                capture(command['stage'])
        if process.poll() is not None:
            raise RuntimeError('Max exited before observation completed')
        time.sleep(.1)
    else:
        raise RuntimeError('Bounded observation timed out')
finally:
    for key, down in [('Control_L', 1), ('q', 1), ('q', 0), ('Control_L', 0)]:
        t.XTestFakeKeyEvent(d, x.XKeysymToKeycode(d, x.XStringToKeysym(key.encode())), down, 0)
    x.XFlush(d)
    try:
        process.wait(timeout=8)
    except subprocess.TimeoutExpired:
        assert ('WINEPREFIX=' + str(PREFIX)).encode() in (Path('/proc') / str(process.pid) / 'environ').read_bytes().split(b'\0')
        process.terminate()
        process.wait(timeout=5)
    print(json.dumps(dict(max_exit=process.returncode, stages=[row['stage'] for row in events if 'action' not in row])), flush=True)
    xvfb.terminate()
    xvfb.wait(timeout=5)
