#!/usr/bin/env python3
"""Run only the original tab probes on an owned display and disposable prefix."""
import ctypes as C
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parent
PREFIX = Path('/home/venetanji/.cache/alive-max-tabs-followup-20261022-wine-disposable')
WINE = Path('/home/venetanji/.local/opt/wine-d2d1-nspa-11.13/bin/wine')
WORK = Path('/home/venetanji/.cache/alive-max-tabs-followup-20261022-run')
WORK.mkdir(exist_ok=True)
for proc in Path('/proc').glob('[0-9]*'):
    try:
        assert ('WINEPREFIX=' + str(PREFIX)).encode() not in proc.joinpath('environ').read_bytes().split(b'\0'), 'Prefix already active'
    except (PermissionError, FileNotFoundError, ProcessLookupError):
        pass
for path in (PREFIX / 'drive_c/users').glob('*/*'):
    assert not path.is_symlink(), 'Unexpected copied home symlink'
log = (WORK / 'runtime.log').open('w')
xvfb = subprocess.Popen(['Xvfb', '-displayfd', '1', '-screen', '0', '1440x1000x24', '-nolisten', 'tcp'], stdout=subprocess.PIPE, stderr=log, text=True)
display = ':' + xvfb.stdout.readline().strip()
env = dict(os.environ, WINEPREFIX=str(PREFIX), WINEDEBUG='-all', DISPLAY=display,
           WAYLAND_DISPLAY='', WINESERVER=str(WINE.parent / 'wineserver'),
           LIBGL_ALWAYS_SOFTWARE='1', MESA_LOADER_DRIVER_OVERRIDE='llvmpipe')
x, t = C.CDLL('libX11.so.6'), C.CDLL('libXtst.so.6')
P, U = C.c_void_p, C.c_ulong
x.XOpenDisplay.argtypes, x.XOpenDisplay.restype = [C.c_char_p], P
x.XStringToKeysym.argtypes, x.XStringToKeysym.restype = [C.c_char_p], U
x.XKeysymToKeycode.argtypes, x.XKeysymToKeycode.restype = [P, U], C.c_uint
t.XTestFakeKeyEvent.argtypes = [P, C.c_uint, C.c_int, U]
x.XFlush.argtypes = [P]
d = x.XOpenDisplay(display.encode())
assert d
sessions = []
try:
    for fixture in ['position-swapped', 'nested-parent-hidden']:
        complete = ROOT / 'results' / (fixture + '-complete.json')
        assert not complete.exists(), 'Do not overwrite retained observations'
        path = ROOT / 'fixtures' / (fixture + '.maxpat')
        process = subprocess.Popen([str(WINE), r'C:\ProgramData\Ableton\Live 12 Suite\Resources\Max\Max.exe',
                                    'Z:' + str(path).replace('/', '\\')], env=env, stdout=log, stderr=log)
        session = dict(fixture=fixture, display=display, launcher_pid=process.pid, xvfb_pid=xvfb.pid, prefix=str(PREFIX))
        sessions.append(session)
        (WORK / 'session.json').write_text(json.dumps(sessions, indent=2) + '\n')
        print(json.dumps(session), flush=True)
        seen = set()
        deadline = time.monotonic() + 45
        try:
            while time.monotonic() < deadline:
                request = ROOT / 'results' / (fixture + '-request.json')
                if request.exists():
                    try:
                        row = json.loads(request.read_text())
                        stage = row['stage']
                        if stage not in seen:
                            seen.add(stage)
                            image = ROOT / 'results' / (fixture + '-' + stage + '.png')
                            assert not image.exists()
                            subprocess.run(['import', '-display', display, '-window', 'root', str(image)], check=True)
                            print(json.dumps(row), flush=True)
                    except json.JSONDecodeError:
                        pass
                if complete.exists():
                    assert len(seen) == 10, seen
                    break
                if process.poll() is not None:
                    raise RuntimeError('Max launcher exited before probe completion')
                time.sleep(.1)
            else:
                subprocess.run(['import', '-display', display, '-window', 'root', str(WORK / (fixture + '-timeout.png'))], check=False)
                raise RuntimeError('Probe timed out')
        finally:
            for key, down in [('Control_L', 1), ('q', 1), ('q', 0), ('Control_L', 0)]:
                t.XTestFakeKeyEvent(d, x.XKeysymToKeycode(d, x.XStringToKeysym(key.encode())), down, 0)
            x.XFlush(d)
            try:
                process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                assert ('WINEPREFIX=' + str(PREFIX)).encode() in (Path('/proc') / str(process.pid) / 'environ').read_bytes().split(b'\0')
                print('Terminating only verified owned Max PID', process.pid, flush=True)
                process.terminate()
                process.wait(timeout=5)
            print(json.dumps(dict(fixture=fixture, exit=process.returncode)), flush=True)
finally:
    xvfb.terminate()
    xvfb.wait(timeout=5)
