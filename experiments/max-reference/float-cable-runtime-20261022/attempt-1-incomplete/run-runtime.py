#!/usr/bin/env python3
"""One original fixture, private X display, marked reflink prefix, bounded inputs."""
import ctypes as C
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
PREFIX = Path('/home/venetanji/.cache/alive-max-float-cable-20261022-wine-disposable')
SOURCE = Path('/home/venetanji/.cache/alive-max-list-20261021/wine-disposable')
ORIGINAL = Path('/home/venetanji/.wine-ableton')
MARKER = '.alive-float-cable-disposable'
WORK = Path('/tmp/alive-max-float-cable-20261022')
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


def stop(rows):
    for sig in (signal.SIGTERM, signal.SIGKILL):
        for row in rows:
            try:
                stat=(Path('/proc')/str(row['pid'])/'stat').read_text().split(') ')[1].split()[19]
                if stat == row['start']: os.kill(row['pid'], sig)
            except (FileNotFoundError, ProcessLookupError):
                pass
        time.sleep(.6)


def prefs(prefix):
    rows = []
    for directory in (prefix/'drive_c/users').glob('*/AppData/Roaming/Cycling*'):
        for path in sorted(directory.rglob('*')):
            if path.is_file() and not path.is_symlink():
                rows.append([str(path.relative_to(prefix)), hashlib.sha256(path.read_bytes()).hexdigest()])
    return rows


assert not PREFIX.exists() and not WORK.exists(), 'Single-session evidence paths must be new'
assert not (RESULTS/'session.json').exists()
preserved = dict(original=prefs(ORIGINAL), source=prefs(SOURCE))
subprocess.run(['cp','-a','--reflink=always',str(SOURCE),str(PREFIX)],check=True)
(PREFIX/MARKER).write_text('Original float/cable disposable observation, 2026-10-22\n')
assert not any(p.is_symlink() for p in (PREFIX/'drive_c/users').rglob('*'))
assert not owned('WINEPREFIX',str(PREFIX))
WORK.mkdir()
log=(WORK/'runtime.log').open('w')
xvfb=subprocess.Popen(['Xvfb','-displayfd','1','-screen','0','1600x1100x24','-nolisten','tcp'],stdout=subprocess.PIPE,stderr=log,text=True)
display=':'+xvfb.stdout.readline().strip()
env=dict(os.environ,WINEPREFIX=str(PREFIX),WINEDEBUG='-all',DISPLAY=display,WAYLAND_DISPLAY='',
    WINESERVER=str(WINE.parent/'wineserver'),LIBGL_ALWAYS_SOFTWARE='1',MESA_LOADER_DRIVER_OVERRIDE='llvmpipe')
fixture=ROOT/'fixtures/float-cable.maxpat'
exe=PREFIX/'drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/Max.exe'
session=dict(prefix=str(PREFIX),display=display,xvfb_pid=xvfb.pid,fixture=str(fixture),
             max_sha256=hashlib.sha256(exe.read_bytes()).hexdigest(),screenshot_directory=str(WORK),events=[])
write(RESULTS/'session.json',session)
process=subprocess.Popen([str(WINE),r'C:\ProgramData\Ableton\Live 12 Suite\Resources\Max\Max.exe',
                         'Z:'+str(fixture).replace('/','\\')],env=env,stdout=log,stderr=log)
x,t=C.CDLL('libX11.so.6'),C.CDLL('libXtst.so.6')
P,U=C.c_void_p,C.c_ulong
x.XOpenDisplay.argtypes,x.XOpenDisplay.restype=[C.c_char_p],P
x.XDefaultRootWindow.argtypes,x.XDefaultRootWindow.restype=[P],U
x.XQueryTree.argtypes=[P,U,C.POINTER(U),C.POINTER(U),C.POINTER(C.POINTER(U)),C.POINTER(C.c_uint)]
x.XFetchName.argtypes=[P,U,C.POINTER(C.c_char_p)]
x.XGetGeometry.argtypes=[P,U,C.POINTER(U),C.POINTER(C.c_int),C.POINTER(C.c_int),C.POINTER(C.c_uint),C.POINTER(C.c_uint),C.POINTER(C.c_uint),C.POINTER(C.c_uint)]
x.XRaiseWindow.argtypes=[P,U]
x.XSetInputFocus.argtypes=[P,U,C.c_int,U]
x.XStringToKeysym.argtypes,x.XStringToKeysym.restype=[C.c_char_p],U
x.XKeysymToKeycode.argtypes,x.XKeysymToKeycode.restype=[P,U],C.c_uint
t.XTestFakeKeyEvent.argtypes=[P,C.c_uint,C.c_int,U]
t.XTestFakeMotionEvent.argtypes=[P,C.c_int,C.c_int,C.c_int,U]
t.XTestFakeButtonEvent.argtypes=[P,C.c_uint,C.c_int,U]
x.XFlush.argtypes=[P]
x.XFree.argtypes=[P]
d=x.XOpenDisplay(display.encode()); assert d
request_id=0


def event(kind, **value):
    row=dict(kind=kind,wall_ms=round(time.time()*1000),**value)
    session['events'].append(row);write(RESULTS/'session.json',session)
    print(json.dumps(row),flush=True)


def windows():
    root,parent,children,count=U(),U(),C.POINTER(U)(),C.c_uint()
    x.XQueryTree(d,x.XDefaultRootWindow(d),C.byref(root),C.byref(parent),C.byref(children),C.byref(count))
    result=[]
    for i in range(count.value):
        w=children[i];name=C.c_char_p()
        if x.XFetchName(d,w,C.byref(name)) and name.value:
            label=name.value.decode(errors='replace');x.XFree(name)
            rx,ry,width,height,border,depth=C.c_int(),C.c_int(),C.c_uint(),C.c_uint(),C.c_uint(),C.c_uint()
            x.XGetGeometry(d,w,C.byref(root),C.byref(rx),C.byref(ry),C.byref(width),C.byref(height),C.byref(border),C.byref(depth))
            result.append(dict(id=int(w),name=label,rect=[rx.value,ry.value,width.value,height.value]))
    if children:x.XFree(children)
    return result


def focus():
    candidates=[w for w in windows() if 'float-cable' in w['name']]
    assert len(candidates)==1,candidates
    w=candidates[0];x.XRaiseWindow(d,w['id']);x.XSetInputFocus(d,w['id'],2,0);x.XFlush(d)
    event('focus',window=w);time.sleep(.2)
    return w


def keys(sequence):
    for name,down in sequence:
        t.XTestFakeKeyEvent(d,x.XKeysymToKeycode(d,x.XStringToKeysym(name.encode())),down,0)
    x.XFlush(d);time.sleep(.15)


def press(name): keys([(name,1),(name,0)])


def chord(name): keys([('Control_L',1),(name,1),(name,0),('Control_L',0)])


def click(px,py,count=1):
    t.XTestFakeMotionEvent(d,-1,px,py,0)
    for _ in range(count):
        t.XTestFakeButtonEvent(d,1,1,0);t.XTestFakeButtonEvent(d,1,0,0);x.XFlush(d);time.sleep(.09)


def command(op,label,**attrs):
    global request_id
    request_id+=1;r=dict(id=request_id,op=op,label=label,**attrs)
    write(ROOT/'fixtures/command.json',r)
    end=time.monotonic()+8
    while time.monotonic()<end:
        try:
            if json.loads((RESULTS/'applied.json').read_text())['id']==r['id']:break
        except (FileNotFoundError,json.JSONDecodeError):pass
        time.sleep(.06)
    else:raise RuntimeError('JS command not acknowledged: '+str(r))
    event('command',request=r);time.sleep(.3)


def capture(stage):
    target=WORK/(stage+'.png');assert not target.exists()
    subprocess.run(['import','-display',display,'-window','root',str(target)],check=True)
    event('capture',stage=stage,path=str(target),windows=windows())


def copy(stage):
    focus();chord('a');chord('c');time.sleep(.3)
    code='from gi.repository import Gtk,Gdk; print(Gtk.Clipboard.get(Gdk.SELECTION_CLIPBOARD).wait_for_text() or "")'
    result=subprocess.run(['/usr/bin/python', '-c',code],env=dict(os.environ,DISPLAY=display),capture_output=True,text=True,timeout=6)
    (RESULTS/(stage+'.clipboard.txt')).write_text(result.stdout)
    event('clipboard',stage=stage,returncode=result.returncode,length=len(result.stdout),stderr=result.stderr)
    press('Escape')


try:
    end=time.monotonic()+45
    while not (RESULTS/'ready.json').exists():
        if time.monotonic()>end:raise RuntimeError('Max synthetic JS did not become ready')
        time.sleep(.2)
    command('score','scalar-score')
    focus();capture('initial');copy('initial')
    command('move','one-endpoint',objects=['source'+str(i) for i in range(4)],dx=30,dy=20)
    capture('one-endpoint');copy('one-endpoint')
    command('move','both-script',objects=[name+str(i) for i in range(4) for name in ('source','sink')],dx=30,dy=20)
    capture('both-script');copy('both-script')
    focus();chord('a')
    for _ in range(10):press('Right')
    for _ in range(5):press('Down')
    command('snapshot','physical-group')
    capture('physical-group');copy('physical-group')
    # Lock before entering numbers; selection state cannot move the fixture here.
    command('lock','locked-for-entry',value=1)
    command('select-number','entry-selected',target='entry')
    focus();chord('a')
    for key in ['minus','2','period','1','2','3','4','5','6','7','8','9']:press(key)
    capture('entry-active');press('Return')
    command('snapshot','entry-committed');capture('entry-committed')
    command('select-number','tab-entry-selected',target='entry')
    press('Tab');command('snapshot','after-tab');capture('after-tab')
    event('completed',stages=7)
finally:
    try:chord('q');time.sleep(1)
    except Exception:pass
    before=owned('WINEPREFIX',str(PREFIX));stop(before)
    remaining=owned('WINEPREFIX',str(PREFIX))
    display_rows=[r for r in owned('DISPLAY',display) if r['pid']!=os.getpid()]
    stop(display_rows)
    xvfb.terminate()
    try:xvfb.wait(timeout=4)
    except subprocess.TimeoutExpired:xvfb.kill();xvfb.wait()
    after_preserved=dict(original=prefs(ORIGINAL),source=prefs(SOURCE))
    assert preserved==after_preserved,'Original/source Max preferences changed'
    cleanup=dict(owned_prefix_before=before,owned_prefix_after=remaining,
                 owned_display_after=[r for r in owned('DISPLAY',display) if r['pid']!=os.getpid()],
                 original_preferences_unchanged=True,source_preferences_unchanged=True,
                 preference_file_counts={k:len(v) for k,v in preserved.items()},prefix_removed=False)
    if not remaining:
        assert (PREFIX/MARKER).is_file();shutil.rmtree(PREFIX);cleanup['prefix_removed']=True
    write(RESULTS/'cleanup.json',cleanup)
    print(json.dumps(dict(cleanup=cleanup)),flush=True)
    log.close()
