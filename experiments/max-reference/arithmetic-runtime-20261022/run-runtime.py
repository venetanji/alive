#!/usr/bin/env python3
"""Run one original Max score in an owned reflink prefix and private display."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import time

ROOT = Path(__file__).resolve().parent
RESULTS = ROOT/'results'
PREFIX = Path('/home/venetanji/.cache/alive-max-arithmetic-20261022-wine-disposable')
SOURCE = Path('/home/venetanji/.cache/alive-max-list-20261021/wine-disposable')
ORIGINAL = Path('/home/venetanji/.wine-ableton')
WORK = Path('/home/venetanji/.cache/alive-ultra-evidence/arithmetic-20261022')
DISPLAY = ':149'
MARKER = '.alive-arithmetic-disposable'
WINE = Path('/home/venetanji/.local/opt/wine-d2d1-nspa-11.13/bin/wine')


def write(path, value):
    path.write_text(json.dumps(value, indent=2)+'\n')


def owned(key, value):
    result = []
    for proc in Path('/proc').glob('[0-9]*'):
        try:
            if (key+'='+value).encode() in (proc/'environ').read_bytes().split(b'\0'):
                result.append(dict(pid=int(proc.name), start=(proc/'stat').read_text().split(') ')[1].split()[19]))
        except (PermissionError, FileNotFoundError, ProcessLookupError):
            pass
    return result


def stop(rows, key, value):
    for sig in (signal.SIGTERM, signal.SIGKILL):
        for row in rows:
            try:
                proc=Path('/proc')/str(row['pid'])
                if (key+'='+value).encode() not in (proc/'environ').read_bytes().split(b'\0'):
                    continue
                start=(proc/'stat').read_text().split(') ')[1].split()[19]
                if start == row['start']:
                    os.kill(row['pid'], sig)
            except (PermissionError, FileNotFoundError, ProcessLookupError):
                pass
        time.sleep(.6)


def prefs(prefix):
    rows = []
    for directory in (prefix/'drive_c/users').glob('*/AppData/Roaming/*'):
        if not directory.name.startswith(('Cycling', 'Ableton')):
            continue
        for path in sorted(directory.rglob('*')):
            if path.is_file() and not path.is_symlink():
                rows.append([str(path.relative_to(prefix)), hashlib.sha256(path.read_bytes()).hexdigest()])
    return rows


assert not PREFIX.exists() and not WORK.exists(), 'Owned runtime paths must be new'
assert not (RESULTS/'session.json').exists(), 'Refuse to overwrite a run'
assert DISPLAY != os.environ.get('DISPLAY')
assert not Path('/tmp/.X11-unix/X'+DISPLAY[1:]).exists()
preserved = dict(original=prefs(ORIGINAL), source=prefs(SOURCE))
write(RESULTS/'preferences-before.json', preserved)
subprocess.run(['cp', '-a', '--reflink=always', str(SOURCE), str(PREFIX)], check=True)
(PREFIX/MARKER).write_text('Owned original arithmetic study, 2026-10-22\n')
assert not any(p.is_symlink() for p in (PREFIX/'drive_c/users').rglob('*'))
assert not owned('WINEPREFIX', str(PREFIX))
WORK.mkdir(parents=True)
log=(WORK/'runtime.log').open('w')
xvfb=None
session=dict(prefix=str(PREFIX), display=DISPLAY, source_prefix=str(SOURCE),
             screenshot_count=0, clipboard_actions=0, original_fixture=True)
failure=None
try:
    xvfb=subprocess.Popen(['Xvfb', DISPLAY, '-screen', '0', '1280x800x24',
                           '-fakescreenfps', '60', '-nolisten', 'tcp'], stdout=log, stderr=log)
    time.sleep(.5)
    assert xvfb.poll() is None, 'Private X server failed to start'
    session['xvfb_pid']=xvfb.pid
    env=dict(os.environ, WINEPREFIX=str(PREFIX), WINEDEBUG='-all', DISPLAY=DISPLAY,
             WAYLAND_DISPLAY='', WINESERVER=str(WINE.parent/'wineserver'),
             LIBGL_ALWAYS_SOFTWARE='1', MESA_LOADER_DRIVER_OVERRIDE='llvmpipe')
    exe=PREFIX/'drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/Max.exe'
    session['max_sha256']=hashlib.sha256(exe.read_bytes()).hexdigest()
    fixture=ROOT/'fixtures/arithmetic.maxpat'
    process=subprocess.Popen([str(WINE), r'C:\ProgramData\Ableton\Live 12 Suite\Resources\Max\Max.exe',
                              'Z:'+str(fixture).replace('/', '\\')], env=env, stdout=log, stderr=log)
    session['launcher_pid']=process.pid
    write(RESULTS/'session.json', session)
    print(json.dumps(dict(stage='launched', display=DISPLAY)), flush=True)
    end=time.monotonic()+65
    while not (RESULTS/'complete.json').exists():
        if time.monotonic()>end:
            raise RuntimeError('Original Max arithmetic score did not complete')
        time.sleep(.2)
    time.sleep(.3)
    rows=[json.loads(line) for line in (RESULTS/'receipts.jsonl').read_text().splitlines()]
    assert sum(r['kind']=='stimulus' for r in rows)==300
    assert not any(r['kind']=='harness-error' for r in rows)
    session['complete']=True
    session['receipt_count']=sum(r['kind']=='receipt' for r in rows)
    print(json.dumps(dict(stage='complete', steps=300, receipts=session['receipt_count'])), flush=True)
except BaseException as exc:
    failure=str(exc)
    session['failure']=failure
    raise
finally:
    before=owned('WINEPREFIX', str(PREFIX))
    stop(before, 'WINEPREFIX', str(PREFIX))
    remaining=owned('WINEPREFIX', str(PREFIX))
    display_rows=[r for r in owned('DISPLAY', DISPLAY) if r['pid']!=os.getpid()]
    stop(display_rows, 'DISPLAY', DISPLAY)
    if xvfb is not None:
        try:
            xvfb.terminate();xvfb.wait(timeout=4)
        except ProcessLookupError:
            pass
        except subprocess.TimeoutExpired:
            xvfb.kill();xvfb.wait()
    after=dict(original=prefs(ORIGINAL), source=prefs(SOURCE))
    write(RESULTS/'preferences-after.json', after)
    cleanup=dict(owned_prefix_before=before, owned_prefix_after=remaining,
                 owned_display_after=[r for r in owned('DISPLAY', DISPLAY) if r['pid']!=os.getpid()],
                 original_preferences_unchanged=preserved['original']==after['original'],
                 source_preferences_unchanged=preserved['source']==after['source'],
                 preference_file_counts={k:len(v) for k,v in preserved.items()},
                 xvfb_exited=xvfb is None or xvfb.poll() is not None, prefix_removed=False)
    if not remaining:
        assert (PREFIX/MARKER).is_file()
        shutil.rmtree(PREFIX);cleanup['prefix_removed']=True
    write(RESULTS/'cleanup.json', cleanup)
    write(RESULTS/'session.json', session)
    log.close()
    shutil.copyfile(WORK/'runtime.log', RESULTS/'runtime.log')
    print(json.dumps(dict(stage='cleaned', preferences_unchanged=preserved==after,
                         prefix_remaining=len(remaining), display_remaining=len(cleanup['owned_display_after']))), flush=True)
    assert preserved==after, 'Original/source preferences changed'
    assert not remaining and not cleanup['owned_display_after']
