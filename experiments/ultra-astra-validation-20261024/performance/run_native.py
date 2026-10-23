import ctypes as C
import json
import os
from pathlib import Path
import statistics
import subprocess
import sys
import time

root = Path(os.environ['AUDIT_ROOT'])
sys.path.insert(0, str(root/'apps/ultra/tests'))
import check_canvas_desktop as ui
from gi.repository import Gdk

out = ui.output
metrics_path = out/'metrics.jsonl'
duration = int(os.environ.get('AUDIT_SECONDS', '30'))
repeats = int(os.environ.get('AUDIT_REPEATS', '2'))
clock_ticks = os.sysconf('SC_CLK_TCK')
ui.x.XDefaultRootWindow.argtypes = [C.c_void_p]
ui.x.XDefaultRootWindow.restype = C.c_ulong
ui.x.XQueryTree.argtypes = [C.c_void_p,C.c_ulong,C.POINTER(C.c_ulong),C.POINTER(C.c_ulong),C.POINTER(C.POINTER(C.c_ulong)),C.POINTER(C.c_uint)]
ui.x.XFetchName.argtypes = [C.c_void_p,C.c_ulong,C.POINTER(C.c_char_p)]
ui.x.XFree.argtypes = [C.c_void_p]
ui.x.XIconifyWindow.argtypes = [C.c_void_p,C.c_ulong,C.c_int]
ui.x.XMapRaised.argtypes = [C.c_void_p,C.c_ulong]
ui.x.XSetInputFocus.argtypes = [C.c_void_p,C.c_ulong,C.c_int,C.c_ulong]

def windows(parent=None):
    parent = parent or ui.x.XDefaultRootWindow(ui.display)
    r,p,n = C.c_ulong(),C.c_ulong(),C.c_uint()
    children=C.POINTER(C.c_ulong)()
    if not ui.x.XQueryTree(ui.display,parent,C.byref(r),C.byref(p),C.byref(children),C.byref(n)): return []
    ids=[children[i] for i in range(n.value)]
    if children: ui.x.XFree(children)
    result=[]
    for wid in ids:
        name=C.c_char_p()
        if ui.x.XFetchName(ui.display,wid,C.byref(name)) and name.value:
            result.append((wid,name.value.decode(errors='replace')))
            ui.x.XFree(name)
        result.extend(windows(wid))
    return result

def metric():
    if not metrics_path.exists(): return None
    for line in reversed(metrics_path.read_text().splitlines()):
        try:
            item=json.loads(line)
            if item.get('type')=='metrics': return item
        except json.JSONDecodeError: pass
    return None

def snapshot():
    all_procs={}
    for path in Path('/proc').glob('[0-9]*'):
        try:
            stat=(path/'stat').read_text(); end=stat.rindex(')'); fields=stat[end+2:].split()
            all_procs[int(path.name)]={'ppid':int(fields[1]),'ticks':int(fields[11])+int(fields[12]),
                'name':stat[stat.index('(')+1:end],'start':int(fields[19])}
        except (OSError,ValueError,IndexError): pass
    ids={ui.pid}
    while True:
        updated=ids|{p for p,s in all_procs.items() if s['ppid'] in ids}
        if updated==ids: break
        ids=updated
    selected={p:s for p,s in all_procs.items() if p in ids}
    for pid,info in selected.items():
        try:
            lines=Path(f'/proc/{pid}/smaps_rollup').read_text().splitlines()
            info['pss_kib']=int(next(l.split()[1] for l in lines if l.startswith('Pss:')))
        except (OSError,StopIteration): info['pss_kib']=None
    return {'monotonic':time.monotonic(),'wall':time.time(),'processes':selected,'metrics':metric(),
        'loadavg':Path('/proc/loadavg').read_text().strip(),'cpu_stat':Path('/proc/stat').read_text().splitlines()[0]}

def sample(audio,visible,repeat):
    label=f'{audio}-{visible}-{repeat}'
    print(json.dumps({'sample':label,'seconds':duration,'pid':ui.pid}),flush=True)
    records=[snapshot()]
    start=time.monotonic()
    while time.monotonic()-start<duration:
        time.sleep(min(1,max(0,start+duration-time.monotonic())))
        records.append(snapshot())
    total_ticks=0; by_name={}
    for before,after in zip(records,records[1:]):
        for pid,info in after['processes'].items():
            old=before['processes'].get(pid)
            if old and old['start']==info['start']:
                delta=info['ticks']-old['ticks']; total_ticks+=delta
                by_name[info['name']]=by_name.get(info['name'],0)+delta
    elapsed=records[-1]['monotonic']-records[0]['monotonic']
    pss=[sum(p['pss_kib'] or 0 for p in s['processes'].values()) for s in records]
    result={'sample':label,'seconds':elapsed,'process_tree_cpu_percent_one_core':total_ticks/clock_ticks/elapsed*100,
        'cpu_by_process_name':{k:v/clock_ticks/elapsed*100 for k,v in by_name.items()},
        'pss_mib_mean':statistics.mean(pss)/1024,'pss_mib_max':max(pss)/1024,
        'pss_missing':sorted({p['name'] for s in records for p in s['processes'].values() if p['pss_kib'] is None}),
        'first_metric':records[0]['metrics'],'last_metric':records[-1]['metrics']}
    a,b=result['first_metric'],result['last_metric']
    if a and b:
        dt=(b['time']-a['time'])/1000
        result['counter_interval_seconds']=dt
        result['counter_delta']={k:b[k]-a[k] for k in ('paths','rebuilds','rects','polls')}
        result['ipc_delta']={k:v-a['ipc'].get(k,0) for k,v in b['ipc'].items()}
        result['poll_hz']=(b['polls']-a['polls'])/dt
    (out/f'{label}.json').write_text(json.dumps({'summary':result,'samples':records},indent=2)+'\n')
    print(json.dumps(result),flush=True)
    return result

ui.wait_for('Start audio')
time.sleep(5)
subprocess.run(['pw-dump'],stdout=(out/'pipewire-graph.json').open('w'),check=True)
wid=next(w for w,n in windows() if 'fixture.ultra' in n)
print(json.dumps({'window':wid,'windows':windows(),'metric':metric()}),flush=True)
if os.environ.get('AUDIT_PRELOAD'):
    assert metric() is not None, 'Native instrumentation did not load'
    assert metric()['cables']==32, metric()
    assert metric()['audio'] is not None, 'IPC instrumentation did not attach'

summaries=[]
selected_modes=os.environ.get('AUDIT_MODES','').split(',')
for audio in ['off','on']:
    if selected_modes!=[''] and not any(s.startswith(audio+'-') for s in selected_modes):continue
    if audio=='on':
        ui.click('Start audio');ui.wait_for('Audio running.',True);time.sleep(3)
    for state in ['visible','minimized']:
        if selected_modes!=[''] and audio+'-'+state not in selected_modes:continue
        if state=='minimized':
            assert ui.x.XIconifyWindow(ui.display,wid,0)
        else:
            ui.x.XMapRaised(ui.display,wid)
            ui.x.XSetInputFocus(ui.display,wid,1,0)
        ui.x.XFlush(ui.display);time.sleep(2)
        ui.t.XTestFakeMotionEvent(ui.display,0,1150,700,0);ui.x.XFlush(ui.display);time.sleep(1)
        screen=Gdk.get_default_root_window()
        Gdk.pixbuf_get_from_window(screen,0,0,screen.get_width(),screen.get_height()).savev(str(out/f'{audio}-{state}.png'),'png',[],[])
        for repeat in range(1,repeats+1):summaries.append(sample(audio,state,repeat))
    ui.x.XMapRaised(ui.display,wid);ui.x.XFlush(ui.display);time.sleep(1)
ui.click('Stop audio')
(out/'summary.json').write_text(json.dumps({'sha':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),
    'instrumented':bool(os.environ.get('AUDIT_PRELOAD')),'scope':'Actual release Tauri/WebKit, private Xvfb + twm, CPAL PipeWire software output',
    'samples':summaries},indent=2)+'\n')
