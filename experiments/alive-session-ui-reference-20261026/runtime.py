#!/usr/bin/env python3
"""Launch only a fresh disposable Live prefix and a private Xvfb display."""
import ctypes
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent
WORK = Path('/home/venetanji/.cache/alive-session-ui-reference-20261026')
PREFIX = WORK / 'wine-disposable'
SOURCE = Path('/home/venetanji/.cache/alive-max-list-20261021/wine-disposable')
ORIGINAL = Path('/home/venetanji/.wine-ableton')
WINE = Path('/home/venetanji/.local/opt/wine-d2d1-nspa-11.13/bin/wine')


def write(name, value):
    (ROOT / name).write_text(json.dumps(value, indent=2) + '\n')


def preferences(prefix):
    rows = []
    for directory in (prefix / 'drive_c/users').glob('*/AppData/Roaming/*'):
        if not directory.name.startswith(('Ableton', 'Cycling', 'Max')):
            continue
        for path in sorted(directory.rglob('*')):
            if path.is_file() and not path.is_symlink():
                rows.append((str(path.relative_to(prefix)), hashlib.sha256(path.read_bytes()).hexdigest()))
    return dict(files=len(rows), digest=hashlib.sha256(json.dumps(rows).encode()).hexdigest())


def owned(prefix):
    result = []
    for proc in Path('/proc').glob('[0-9]*'):
        try:
            if ('WINEPREFIX=' + str(prefix)).encode() in (proc / 'environ').read_bytes().split(b'\0'):
                result.append((int(proc.name), (proc / 'stat').read_text().split(') ')[1].split()[19]))
        except (PermissionError, FileNotFoundError, ProcessLookupError):
            pass
    return result


def launch():
    assert not WORK.exists(), 'Refuse to reuse an existing runtime directory'
    assert not (ROOT / 'session.json').exists(), 'Refuse to overwrite a capture'
    before = dict(original=preferences(ORIGINAL), source=preferences(SOURCE))
    WORK.mkdir()
    subprocess.run(['cp', '-a', '--reflink=always', str(SOURCE), str(PREFIX)], check=True)
    (PREFIX / '.alive-workflow-owned').write_text('disposable reference copy\n')
    assert not any(p.is_symlink() for p in (PREFIX / 'drive_c/users').rglob('*'))
    log = (WORK / 'runtime.log').open('w')
    display = ':166'
    assert display != os.environ.get('DISPLAY')
    assert not Path('/tmp/.X11-unix/X166').exists()
    xvfb = subprocess.Popen(['Xvfb', display, '-screen', '0', '1440x900x24',
                             '-fakescreenfps', '60', '-nolisten', 'tcp'], stdout=log,
                            stderr=log, text=True)
    time.sleep(.5)
    assert xvfb.poll() is None
    env = dict(os.environ, WINEPREFIX=str(PREFIX), DISPLAY=display, WAYLAND_DISPLAY='',
               WINEDEBUG='-all', WINESERVER=str(WINE.parent / 'wineserver'),
               LIBGL_ALWAYS_SOFTWARE='1', MESA_LOADER_DRIVER_OVERRIDE='llvmpipe')
    process = subprocess.Popen([str(WINE), r'C:\ProgramData\Ableton\Live 12 Suite\Program\Ableton Live 12 Suite.exe'],
                               env=env, stdout=log, stderr=log)
    session = dict(display=display, prefix=str(PREFIX), launcher_pid=process.pid,
                   xvfb_pid=xvfb.pid, source_prefix=str(SOURCE), preferences_before=before)
    write('session.json', session)
    print(json.dumps(session), flush=True)
    def finish(signum, frame):
        raise KeyboardInterrupt()
    signal.signal(signal.SIGTERM, finish)
    try:
        time.sleep(1200)
    except KeyboardInterrupt:
        pass
    finally:
        for sig in (signal.SIGTERM, signal.SIGKILL):
            for pid, start in owned(PREFIX):
                try:
                    if (Path('/proc') / str(pid) / 'stat').read_text().split(') ')[1].split()[19] == start:
                        os.kill(pid, sig)
                except (ProcessLookupError, FileNotFoundError):
                    pass
            time.sleep(.5)
        xvfb.terminate()
        xvfb.wait(timeout=5)
        after = dict(original=preferences(ORIGINAL), source=preferences(SOURCE))
        cleanup = dict(preferences_after=after, preferences_unchanged=before == after,
                       owned_processes_after=owned(PREFIX), xvfb_exited=xvfb.poll() is not None)
        if not cleanup['owned_processes_after']:
            assert (PREFIX / '.alive-workflow-owned').is_file()
            shutil.rmtree(PREFIX)
            cleanup['prefix_removed'] = True
        write('cleanup.json', cleanup)
        print(json.dumps(cleanup), flush=True)


def control(args):
    session = json.loads((ROOT / 'session.json').read_text())
    pid = session['xvfb_pid']
    assert 'Xvfb' in (Path('/proc') / str(pid) / 'cmdline').read_bytes().decode()
    x11 = ctypes.CDLL('libX11.so.6')
    xt = ctypes.CDLL('libXtst.so.6')
    x11.XOpenDisplay.argtypes = [ctypes.c_char_p]
    x11.XOpenDisplay.restype = ctypes.c_void_p
    x11.XKeysymToKeycode.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
    x11.XKeysymToKeycode.restype = ctypes.c_uint
    x11.XStringToKeysym.argtypes = [ctypes.c_char_p]
    x11.XStringToKeysym.restype = ctypes.c_ulong
    x11.XFlush.argtypes = [ctypes.c_void_p]
    xt.XTestFakeKeyEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint, ctypes.c_int, ctypes.c_ulong]
    xt.XTestFakeButtonEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint, ctypes.c_int, ctypes.c_ulong]
    xt.XTestFakeMotionEvent.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_ulong]
    display = x11.XOpenDisplay(session['display'].encode())
    assert display
    def key(name, down):
        code = x11.XKeysymToKeycode(display, x11.XStringToKeysym(name.encode()))
        assert code, name
        xt.XTestFakeKeyEvent(display, code, down, 0)
    action = args[0]
    if action == 'move':
        xt.XTestFakeMotionEvent(display, -1, int(args[1]), int(args[2]), 0)
    elif action == 'drag':
        xt.XTestFakeMotionEvent(display, -1, int(args[1]), int(args[2]), 0)
        xt.XTestFakeButtonEvent(display, 1, 1, 0)
        x11.XFlush(display)
        time.sleep(.15)
        steps = 12
        for step in range(1, steps + 1):
            x = round(int(args[1]) + (int(args[3]) - int(args[1])) * step / steps)
            y = round(int(args[2]) + (int(args[4]) - int(args[2])) * step / steps)
            xt.XTestFakeMotionEvent(display, -1, x, y, 0)
            x11.XFlush(display)
            time.sleep(.025)
        xt.XTestFakeButtonEvent(display, 1, 0, 0)
    elif action == 'right':
        xt.XTestFakeMotionEvent(display, -1, int(args[1]), int(args[2]), 0)
        xt.XTestFakeButtonEvent(display, 3, 1, 0)
        xt.XTestFakeButtonEvent(display, 3, 0, 0)
    elif action == 'focus':
        x11.XRaiseWindow.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
        x11.XSetInputFocus.argtypes = [ctypes.c_void_p, ctypes.c_ulong, ctypes.c_int, ctypes.c_ulong]
        window = int(args[1], 0)
        x11.XRaiseWindow(display, window)
        x11.XSetInputFocus(display, window, 2, 0)
    elif action == 'click':
        xt.XTestFakeMotionEvent(display, -1, int(args[1]), int(args[2]), 0)
        for _ in range(int(args[3]) if len(args) > 3 else 1):
            xt.XTestFakeButtonEvent(display, 1, 1, 0)
            xt.XTestFakeButtonEvent(display, 1, 0, 0)
    elif action == 'key':
        names = args[1].split('+')
        for name in names:
            key(name, 1)
        for name in reversed(names):
            key(name, 0)
    elif action == 'text':
        for char in args[1]:
            name = {' ': 'space', ':': 'colon', '/': 'slash', '.': 'period', '-': 'minus'}.get(char, char)
            if char.isupper():
                key('Shift_L', 1)
            key(name, 1)
            key(name, 0)
            if char.isupper():
                key('Shift_L', 0)
    elif action == 'capture':
        subprocess.run(['import', '-display', session['display'], '-window', 'root', str(ROOT / args[1])], check=True)
    else:
        raise ValueError(action)
    x11.XFlush(display)
    if action != 'capture':
        time.sleep(.3)
    with (ROOT / 'actions.jsonl').open('a') as receipt:
        receipt.write(json.dumps(dict(utc=datetime.now(timezone.utc).isoformat(),
                                     display=session['display'], args=args)) + '\n')


if __name__ == '__main__':
    if sys.argv[1] == 'launch':
        launch()
    else:
        control(sys.argv[1:])
