#!/usr/bin/env python3
"""Narrow owned Max/Wine UI session; only private-display XTest input is accepted."""
import ctypes as C
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[3]
OUTPUT = Path(os.environ.get('ULTRA_MAX_EVIDENCE', '/tmp/ultra-instrument-evidence/max-reference'))
SOURCE = Path('/home/venetanji/.cache/alive-max-list-20261021/wine-disposable')
ORIGINAL = Path('/home/venetanji/.wine-ableton')
WINE = Path('/home/venetanji/.local/opt/wine-d2d1-nspa-11.13/bin/wine')
OUTPUT.mkdir(parents=True, exist_ok=False)
WORK = Path(tempfile.mkdtemp(prefix='alive-instrument-reference-', dir='/home/venetanji/.cache'))
PREFIX = WORK / 'wine'
MARKER = WORK / '.owned-instrument-reference'
MARKER.write_text('Disposable Max UI reference only\n')


def write(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


def preferences(prefix):
    result = {}
    for path in prefix.glob('*.reg'):
        result[str(path.relative_to(prefix))] = hashlib.sha256(path.read_bytes()).hexdigest()
    for user in (prefix / 'drive_c/users').iterdir():
        for directory in (user / 'AppData/Roaming').glob('*'):
            if directory.name.startswith(('Cycling', 'Ableton')):
                for path in sorted(directory.rglob('*')):
                    if path.is_file() and not path.is_symlink():
                        result[str(path.relative_to(prefix))] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def owned(key, value):
    result = []
    for proc in Path('/proc').glob('[0-9]*'):
        try:
            if (key + '=' + value).encode() in (proc / 'environ').read_bytes().split(b'\0'):
                result.append({'pid': int(proc.name), 'start': (proc / 'stat').read_text().split(') ')[1].split()[19]})
        except (PermissionError, FileNotFoundError, ProcessLookupError):
            pass
    return result


def stop_owned(key, value):
    for sig in (signal.SIGTERM, signal.SIGKILL):
        for row in owned(key, value):
            if row['pid'] != os.getpid():
                try:
                    if (Path('/proc') / str(row['pid']) / 'stat').read_text().split(') ')[1].split()[19] == row['start']:
                        os.kill(row['pid'], sig)
                except (PermissionError, FileNotFoundError, ProcessLookupError):
                    pass
        time.sleep(.3)


before = {'original': preferences(ORIGINAL), 'source': preferences(SOURCE)}
write(OUTPUT / 'preferences-before.json', before)
assert not owned('WINEPREFIX', str(SOURCE)), 'Source prefix must be inactive'
subprocess.run(['cp', '-a', '--reflink=always', str(SOURCE), str(PREFIX)], check=True)
assert not any(p.is_symlink() for p in (PREFIX / 'drive_c/users').rglob('*'))
fixture = OUTPUT / 'journey.maxpat'
shutil.copyfile(ROOT / 'experiments/max-ui-reference/ui-study.maxpat', fixture)
log = (OUTPUT / 'runtime.log').open('w')
xvfb = None
session = {'original_patch': True, 'dsp_requested': False, 'source_prefix': str(SOURCE), 'prefix': str(PREFIX),
           'wine': str(WINE), 'wine_version': subprocess.check_output([str(WINE), '--version'], text=True).strip(),
           'kernel': os.uname().release, 'actions': []}
try:
    xvfb = subprocess.Popen(['Xvfb', '-displayfd', '1', '-screen', '0', '1440x1000x24', '-nolisten', 'tcp'], stdout=subprocess.PIPE, stderr=log, text=True)
    display = ':' + xvfb.stdout.readline().strip()
    assert display != os.environ.get('DISPLAY') and xvfb.poll() is None
    session['display'] = display
    env = dict(os.environ, WINEPREFIX=str(PREFIX), WINEDEBUG='-all', DISPLAY=display, WAYLAND_DISPLAY='',
               WINESERVER=str(WINE.parent / 'wineserver'), LIBGL_ALWAYS_SOFTWARE='1', MESA_LOADER_DRIVER_OVERRIDE='llvmpipe')
    exe = PREFIX / 'drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/Max.exe'
    session['max_sha256'] = hashlib.sha256(exe.read_bytes()).hexdigest()
    process = subprocess.Popen([str(WINE), r'C:\ProgramData\Ableton\Live 12 Suite\Resources\Max\Max.exe',
                                'Z:' + str(fixture).replace('/', '\\')], env=env, stdout=log, stderr=log)
    session['launcher_pid'] = process.pid
    x, t = C.CDLL('libX11.so.6'), C.CDLL('libXtst.so.6')
    x.XOpenDisplay.argtypes = [C.c_char_p]; x.XOpenDisplay.restype = C.c_void_p
    x.XStringToKeysym.argtypes = [C.c_char_p]; x.XStringToKeysym.restype = C.c_ulong
    x.XKeysymToKeycode.argtypes = [C.c_void_p, C.c_ulong]; x.XKeysymToKeycode.restype = C.c_uint
    x.XFlush.argtypes = [C.c_void_p]
    t.XTestFakeKeyEvent.argtypes = [C.c_void_p, C.c_uint, C.c_int, C.c_ulong]
    t.XTestFakeMotionEvent.argtypes = [C.c_void_p, C.c_int, C.c_int, C.c_int, C.c_ulong]
    t.XTestFakeButtonEvent.argtypes = [C.c_void_p, C.c_uint, C.c_int, C.c_ulong]
    d = x.XOpenDisplay(display.encode()); assert d
    def keys(names):
        codes = [x.XKeysymToKeycode(d, x.XStringToKeysym(n.encode())) for n in names]; assert all(codes)
        for code in codes: assert t.XTestFakeKeyEvent(d, code, 1, 0)
        for code in reversed(codes): assert t.XTestFakeKeyEvent(d, code, 0, 0)
        x.XFlush(d)
    def screenshot(name):
        subprocess.run(['import', '-display', display, '-window', 'root', str(OUTPUT / (name + '.png'))], check=True)
    write(OUTPUT / 'session.json', session)
    time.sleep(20)
    screenshot('startup')
    (OUTPUT / 'ready').write_text('ready\n')
    print(json.dumps({'stage': 'ready', 'display': display}), flush=True)
    seen = set(); end = time.monotonic() + 150
    while time.monotonic() < end:
        request = OUTPUT / 'request.json'
        if request.exists():
            try: row = json.loads(request.read_text())
            except json.JSONDecodeError: time.sleep(.1); continue
            if row['id'] not in seen:
                seen.add(row['id'])
                if row['kind'] == 'done': break
                if row['kind'] == 'keys': keys(row['names'])
                elif row['kind'] == 'text':
                    for letter in row['text']:
                        keys([letter]); time.sleep(.08)
                elif row['kind'] == 'click':
                    assert 0 <= row['x'] < 1440 and 0 <= row['y'] < 1000
                    assert t.XTestFakeMotionEvent(d, 0, row['x'], row['y'], 0)
                    assert t.XTestFakeButtonEvent(d, row.get('button', 1), 1, 0)
                    assert t.XTestFakeButtonEvent(d, row.get('button', 1), 0, 0)
                    x.XFlush(d)
                elif row['kind'] != 'capture': raise RuntimeError('Unsupported request')
                time.sleep(.5)
                screenshot(row['id'])
                session['actions'].append(row); write(OUTPUT / 'session.json', session)
                (OUTPUT / (row['id'] + '.complete')).write_text('complete\n')
                print(json.dumps({'stage': row['id'], 'kind': row['kind']}), flush=True)
        time.sleep(.1)
    else: session['timed_out_waiting_for_actions'] = True
finally:
    stop_owned('WINEPREFIX', str(PREFIX))
    if xvfb is not None:
        xvfb.terminate()
        try: xvfb.wait(timeout=3)
        except subprocess.TimeoutExpired: xvfb.kill(); xvfb.wait()
    after = {'original': preferences(ORIGINAL), 'source': preferences(SOURCE)}
    write(OUTPUT / 'preferences-after.json', after)
    cleanup = {'original_preferences_unchanged': before['original'] == after['original'],
               'source_preferences_unchanged': before['source'] == after['source'],
               'owned_prefix_remaining': len(owned('WINEPREFIX', str(PREFIX))), 'prefix_removed': False,
               'display_exited': xvfb is None or xvfb.poll() is not None}
    if cleanup['owned_prefix_remaining'] == 0:
        assert MARKER.read_text() == 'Disposable Max UI reference only\n'
        shutil.rmtree(WORK); cleanup['prefix_removed'] = True
    write(OUTPUT / 'cleanup.json', cleanup); write(OUTPUT / 'session.json', session)
    print(json.dumps({'stage': 'cleaned', **cleanup}), flush=True)
    assert all([cleanup['original_preferences_unchanged'], cleanup['source_preferences_unchanged'], cleanup['prefix_removed'], cleanup['display_exited']])
