#!/usr/bin/env python3
"""Run our finite probe in an explicitly disposable prefix and private display."""
import argparse
import ctypes as C
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--prefix', type=Path, required=True)
parser.add_argument('--wine', type=Path, required=True)
parser.add_argument('--work', type=Path, required=True)
parser.add_argument('--fixture', default='message-ui')
parser.add_argument('--timeout', type=float, default=90)
args = parser.parse_args()
assert args.prefix.name not in ['.wine', '.wine-ableton']
assert args.prefix.is_dir()
for proc in Path('/proc').glob('[0-9]*'):
    try:
        env = proc.joinpath('environ').read_bytes().split(b'\0')
        comm = proc.joinpath('comm').read_text().strip().lower()
        assert not (comm.startswith('max') and ('WINEPREFIX=' + str(args.prefix.resolve())).encode() in env), 'Disposable Max is already running'
    except (PermissionError, FileNotFoundError, ProcessLookupError):
        pass
args.work.mkdir(exist_ok=True, parents=True)
out = ROOT / 'results' / (args.fixture + '.jsonl')
assert not out.exists(), 'Preserve existing raw evidence; select a new fixture or archive it first'
log = (args.work / 'runtime.log').open('w')
xvfb = subprocess.Popen(['Xvfb', '-displayfd', '1', '-screen', '0', '1440x1000x24', '-nolisten', 'tcp'],
                        stdout=subprocess.PIPE, stderr=log, text=True)
number = xvfb.stdout.readline().strip()
assert number.isdigit()
display = ':' + number
env = dict(os.environ, WINEPREFIX=str(args.prefix.resolve()), WINEDEBUG='-all', DISPLAY=display,
           WAYLAND_DISPLAY='', WINESERVER=str(args.wine.parent / 'wineserver'),
           LIBGL_ALWAYS_SOFTWARE='1', MESA_LOADER_DRIVER_OVERRIDE='llvmpipe')
fixture = ROOT / 'fixtures' / (args.fixture + '.maxpat')
max_process = subprocess.Popen([str(args.wine), r'C:\ProgramData\Ableton\Live 12 Suite\Resources\Max\Max.exe',
                               'Z:' + str(fixture).replace('/', '\\')], env=env, stdout=log, stderr=log)
session = dict(display=display, xvfb_pid=xvfb.pid, launcher_pid=max_process.pid,
               prefix=str(args.prefix), wine=str(args.wine), fixture=args.fixture)
(args.work / 'session.json').write_text(json.dumps(session, indent=2) + '\n')
print(json.dumps(session), flush=True)
x = C.CDLL('libX11.so.6')
t = C.CDLL('libXtst.so.6')
P, U = C.c_void_p, C.c_ulong
x.XOpenDisplay.argtypes, x.XOpenDisplay.restype = [C.c_char_p], P
d = x.XOpenDisplay(display.encode())
if d:
    x.XStringToKeysym.argtypes, x.XStringToKeysym.restype = [C.c_char_p], U
    x.XKeysymToKeycode.argtypes, x.XKeysymToKeycode.restype = [P, U], C.c_uint
    t.XTestFakeKeyEvent.argtypes = [P, C.c_uint, C.c_int, U]
    x.XFlush.argtypes = [P]


def keys(pairs):
    if not d:
        return
    for name, down in pairs:
        t.XTestFakeKeyEvent(d, x.XKeysymToKeycode(d, x.XStringToKeysym(name.encode())), down, 0)
    x.XFlush(d)

keyboard_ids = set()
keyboard_path = ROOT / 'results' / 'keyboard-request.json'
start = time.monotonic()
complete = False
while time.monotonic() - start < args.timeout:
    if keyboard_path.exists():
        try:
            request = json.loads(keyboard_path.read_text())
            if request['id'] not in keyboard_ids:
                assert request['key'] == 'Tab'
                keyboard_ids.add(request['id'])
                keys([('Tab', 1), ('Tab', 0)])
                print(json.dumps(dict(keyboard=request['id'], key='Tab')), flush=True)
                subprocess.run(['import', '-display', display, '-window', 'root', str(args.work / (request['id'] + '.png'))], check=False)
        except (ValueError, KeyError):
            pass
    if out.exists():
        try:
            rows = [json.loads(line) for line in out.read_text().splitlines()]
            if rows and rows[-1]['selector'] == 'complete':
                complete = True
                print(json.dumps(dict(status='executed', rows=len(rows), wall_seconds=time.monotonic() - start)), flush=True)
                break
        except (ValueError, KeyError):
            pass
    if max_process.poll() is not None and max_process.returncode != 0:
        print(json.dumps(dict(launcher_exit=max_process.returncode)), flush=True)
        break
    time.sleep(.2)

subprocess.run(['import', '-display', display, '-window', 'root', str(args.work / 'final.png')], check=False)

# Request the application's ordinary Quit command on this owned display only.
# No process-name kill, original prefix, authorization, trial or save is used.
keys([('Control_L', 1), ('q', 1), ('q', 0), ('Control_L', 0)])
deadline = time.monotonic() + 5
while max_process.poll() is None and time.monotonic() < deadline:
    time.sleep(.1)
if max_process.poll() is None:
    process = Path('/proc') / str(max_process.pid)
    assert ('WINEPREFIX=' + str(args.prefix.resolve())).encode() in process.joinpath('environ').read_bytes().split(b'\0')
    print('Ordinary Quit did not finish; terminating only the owned disposable Max PID.', flush=True)
    max_process.terminate()
    max_process.wait(timeout=10)
xvfb.terminate()
xvfb.wait(timeout=5)
raise SystemExit(0 if complete else 1)
