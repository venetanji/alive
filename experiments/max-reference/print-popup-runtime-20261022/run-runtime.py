#!/usr/bin/env python3
"""Original bounded probe on an owned disposable Wine prefix/private display."""
import ctypes as C
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parent
RESULTS = ROOT / 'results'
PREFIX = Path('/home/venetanji/.cache/alive-max-print-popup-20261022-attempt2-wine-disposable')
WORK = Path('/home/venetanji/.cache/alive-max-print-popup-20261022-attempt2-run')
WINE = Path('/home/venetanji/.local/opt/wine-d2d1-nspa-11.13/bin/wine')
assert PREFIX.is_dir() and not (RESULTS / 'initial.png').exists()
for proc in Path('/proc').glob('[0-9]*'):
    try:
        assert ('WINEPREFIX=' + str(PREFIX)).encode() not in proc.joinpath('environ').read_bytes().split(b'\0')
    except (PermissionError, FileNotFoundError, ProcessLookupError):
        pass
assert not any(path.is_symlink() for path in (PREFIX / 'drive_c/users').glob('*/*'))
WORK.mkdir(exist_ok=True)
log = (WORK / 'runtime.log').open('w')
xvfb = subprocess.Popen(['Xvfb', '-displayfd', '1', '-screen', '0', '1600x1100x24', '-nolisten', 'tcp'], stdout=subprocess.PIPE, stderr=log, text=True)
display = ':' + xvfb.stdout.readline().strip()
env = dict(os.environ, WINEPREFIX=str(PREFIX), WINEDEBUG='-all', DISPLAY=display, WAYLAND_DISPLAY='',
           WINESERVER=str(WINE.parent / 'wineserver'), LIBGL_ALWAYS_SOFTWARE='1', MESA_LOADER_DRIVER_OVERRIDE='llvmpipe')
fixture = ROOT / 'fixtures/print-popup.maxpat'
process = subprocess.Popen([str(WINE), r'C:\ProgramData\Ableton\Live 12 Suite\Resources\Max\Max.exe',
                            'Z:' + str(fixture).replace('/', '\\')], env=env, stdout=log, stderr=log)
session = dict(display=display, xvfb_pid=xvfb.pid, launcher_pid=process.pid, prefix=str(PREFIX))
(WORK / 'session.json').write_text(json.dumps(session, indent=2) + '\n')
print(json.dumps(session), flush=True)
x, t = C.CDLL('libX11.so.6'), C.CDLL('libXtst.so.6')
P, U = C.c_void_p, C.c_ulong
x.XOpenDisplay.argtypes, x.XOpenDisplay.restype = [C.c_char_p], P
x.XDefaultRootWindow.argtypes, x.XDefaultRootWindow.restype = [P], U
x.XQueryTree.argtypes = [P, U, C.POINTER(U), C.POINTER(U), C.POINTER(C.POINTER(U)), C.POINTER(C.c_uint)]
x.XFetchName.argtypes = [P, U, C.POINTER(C.c_char_p)]
x.XGetInputFocus.argtypes = [P, C.POINTER(U), C.POINTER(C.c_int)]
x.XRaiseWindow.argtypes = [P, U]
x.XSetInputFocus.argtypes = [P, U, C.c_int, U]
x.XStringToKeysym.argtypes, x.XStringToKeysym.restype = [C.c_char_p], U
x.XKeysymToKeycode.argtypes, x.XKeysymToKeycode.restype = [P, U], C.c_uint
t.XTestFakeKeyEvent.argtypes = [P, C.c_uint, C.c_int, U]
t.XTestFakeMotionEvent.argtypes = [P, C.c_int, C.c_int, C.c_int, U]
t.XTestFakeButtonEvent.argtypes = [P, C.c_uint, C.c_int, U]
x.XFlush.argtypes = [P]
x.XFree.argtypes = [P]
d = x.XOpenDisplay(display.encode())
assert d
events, start = [], time.monotonic()


def window_name(window):
    if isinstance(window, U): window = window.value
    if window <= 1: return ['None', 'PointerRoot'][window]
    name = C.c_char_p()
    if x.XFetchName(d, window, C.byref(name)) and name.value:
        text = name.value.decode(errors='replace'); x.XFree(name); return text
    return ''


def windows():
    root, parent, children, count = U(), U(), C.POINTER(U)(), C.c_uint()
    x.XQueryTree(d, x.XDefaultRootWindow(d), C.byref(root), C.byref(parent), C.byref(children), C.byref(count))
    result = [dict(id=int(children[i]), name=window_name(children[i])) for i in range(count.value)]
    if children: x.XFree(children)
    return [entry for entry in result if entry['name']]


def keys(pairs):
    for name, down in pairs:
        t.XTestFakeKeyEvent(d, x.XKeysymToKeycode(d, x.XStringToKeysym(name.encode())), down, 0)
    x.XFlush(d)


def capture(stage):
    path = RESULTS / (stage + '.png'); assert not path.exists()
    subprocess.run(['import', '-display', display, '-window', 'root', str(path)], check=True)
    focus, revert = U(), C.c_int(); x.XGetInputFocus(d, C.byref(focus), C.byref(revert))
    row = dict(stage=stage, elapsed_ms=round((time.monotonic()-start)*1000), windows=windows(), focus=dict(id=focus.value, name=window_name(focus)))
    events.append(row); (RESULTS / 'events.json').write_text(json.dumps(events, indent=2) + '\n')
    print(json.dumps(row), flush=True)


try:
    time.sleep(13); capture('initial')
    seen = set(); deadline = time.monotonic() + 240
    while time.monotonic() < deadline:
        control = WORK / 'control.json'
        if control.exists():
            try: request = json.loads(control.read_text())
            except json.JSONDecodeError: continue
            if request['id'] not in seen:
                seen.add(request['id'])
                if request['op'] == 'finish': break
                events.append(dict(action=request))
                if request['op'] == 'command':
                    (ROOT / 'fixtures/command.json').write_text(json.dumps(request['command']) + '\n')
                    end = time.monotonic() + 5
                    while time.monotonic() < end:
                        try:
                            if json.loads((RESULTS/'applied.json').read_text())['id'] == request['command']['id']: break
                        except (FileNotFoundError, json.JSONDecodeError): pass
                        time.sleep(.05)
                    else: raise RuntimeError('Original JS harness did not acknowledge input')
                elif request['op'] == 'focus':
                    target = [w for w in windows() if w['name'] == request['window']]
                    assert len(target) == 1, target
                    x.XRaiseWindow(d, target[0]['id']); x.XSetInputFocus(d, target[0]['id'], 2, 0); x.XFlush(d)
                elif request['op'] == 'keys': keys(request['keys'])
                elif request['op'] == 'click':
                    t.XTestFakeMotionEvent(d, -1, request['x'], request['y'], 0)
                    for _ in range(request.get('count', 1)):
                        t.XTestFakeButtonEvent(d, 1, 1, 0); t.XTestFakeButtonEvent(d, 1, 0, 0); x.XFlush(d); time.sleep(.08)
                else: raise RuntimeError('Unknown external observation action')
                time.sleep(.6); capture(request['stage'])
        if process.poll() is not None: raise RuntimeError('Max exited before bounded observation completed')
        time.sleep(.1)
    else: raise RuntimeError('Bounded observation timed out')
finally:
    keys([('Control_L',1),('q',1),('q',0),('Control_L',0)])
    try: process.wait(timeout=8)
    except subprocess.TimeoutExpired:
        assert ('WINEPREFIX='+str(PREFIX)).encode() in (Path('/proc')/str(process.pid)/'environ').read_bytes().split(b'\0')
        process.terminate(); process.wait(timeout=5)
    session['max_exit'] = process.returncode
    (WORK/'session.json').write_text(json.dumps(session,indent=2)+'\n')
    print(json.dumps(dict(max_exit=process.returncode, stages=len([e for e in events if 'stage' in e]))),flush=True)
    xvfb.terminate(); xvfb.wait(timeout=5)
