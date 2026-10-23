#!/usr/bin/env python3
"""Run only the original comment probe in a marked copied Wine prefix."""
import ctypes as C
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parent
PREFIX = Path('/home/venetanji/.cache/alive-max-comment-20261022-wine-disposable')
WORK = Path('/tmp/alive-max-comment-20261022-confirmation')
WINE = Path('/home/venetanji/.local/opt/wine-d2d1-nspa-11.13/bin/wine')
assert PREFIX.is_dir() and (PREFIX / '.alive-comment-disposable').is_file()
assert not (ROOT / 'results/complete.json').exists()
for proc in Path('/proc').glob('[0-9]*'):
    try:
        assert ('WINEPREFIX=' + str(PREFIX)).encode() not in proc.joinpath('environ').read_bytes().split(b'\0'), 'Prefix already active'
    except (PermissionError, FileNotFoundError, ProcessLookupError):
        pass
for path in (PREFIX / 'drive_c/users').rglob('*'):
    assert not path.is_symlink(), 'Copied user profile must not expose home symlinks'
WORK.mkdir(exist_ok=True)
log = (WORK / 'runtime.log').open('w')
xvfb = subprocess.Popen(['Xvfb', '-displayfd', '1', '-screen', '0', '1440x1100x24', '-nolisten', 'tcp'], stdout=subprocess.PIPE, stderr=log, text=True)
display = ':' + xvfb.stdout.readline().strip()
env = dict(os.environ, WINEPREFIX=str(PREFIX), WINEDEBUG='-all', DISPLAY=display,
           WAYLAND_DISPLAY='', WINESERVER=str(WINE.parent / 'wineserver'),
           LIBGL_ALWAYS_SOFTWARE='1', MESA_LOADER_DRIVER_OVERRIDE='llvmpipe')
fixture = ROOT / 'fixtures/comment-layout.maxpat'
process = subprocess.Popen([str(WINE), r'C:\ProgramData\Ableton\Live 12 Suite\Resources\Max\Max.exe',
                           'Z:' + str(fixture).replace('/', '\\')], env=env, stdout=log, stderr=log)
session = dict(display=display, xvfb_pid=xvfb.pid, launcher_pid=process.pid, prefix=str(PREFIX), fixture=str(fixture))
(WORK / 'session.json').write_text(json.dumps(session, indent=2) + '\n')
print(json.dumps(session), flush=True)
x, t = C.CDLL('libX11.so.6'), C.CDLL('libXtst.so.6')
P, U = C.c_void_p, C.c_ulong
x.XOpenDisplay.argtypes, x.XOpenDisplay.restype = [C.c_char_p], P
x.XStringToKeysym.argtypes, x.XStringToKeysym.restype = [C.c_char_p], U
x.XKeysymToKeycode.argtypes, x.XKeysymToKeycode.restype = [P, U], C.c_uint
t.XTestFakeKeyEvent.argtypes = [P, C.c_uint, C.c_int, U]
x.XFlush.argtypes = [P]
d = x.XOpenDisplay(display.encode())
assert d
seen = set()
complete = False
start = time.monotonic()
try:
    deadline = start + 75
    while time.monotonic() < deadline:
        request = ROOT / 'results/capture-request.json'
        if request.exists():
            try:
                row = json.loads(request.read_text())
                stage = row['stage']
                if stage not in seen:
                    seen.add(stage)
                    time.sleep(.25)
                    subprocess.run(['import', '-display', display, '-window', 'root', str(WORK / (stage + '.png'))], check=True)
                    print(json.dumps(dict(captured=stage, elapsed=round(time.monotonic()-start, 2))), flush=True)
            except (json.JSONDecodeError, KeyError):
                pass
        if (ROOT / 'results/complete.json').exists():
            complete = True
            break
        if process.poll() is not None:
            raise RuntimeError('Max exited before completing probe')
        time.sleep(.1)
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
    xvfb.terminate()
    xvfb.wait(timeout=5)
    result = dict(complete=complete, session=session, max_exit=process.returncode, stages=sorted(seen),
                  duration_seconds=round(time.monotonic()-start, 2), screenshots=str(WORK))
    (ROOT / 'results/runtime.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result), flush=True)
raise SystemExit(0 if complete else 1)
