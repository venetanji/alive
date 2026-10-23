#!/usr/bin/env python3
"""Repeatable release process-tree CPU/PSS on the private software desktop.

ULTRA_TEST_WM=1 ULTRA_TEST_INITIAL_PATCH=$PWD/apps/ultra/ui/canvas-preset.json \
ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/profile_canvas.py \
bash apps/ultra/tests/check_canvas_desktop.sh /tmp/ultra-performance
"""
import ctypes as C
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import time

import check_canvas_desktop as ui

duration = float(os.environ.get('ULTRA_PROFILE_SECONDS', '10'))
ticks = os.sysconf('SC_CLK_TCK')


def processes():
    rows = {}
    for entry in Path('/proc').iterdir():
        if not entry.name.isdigit():
            continue
        try:
            stat = (entry / 'stat').read_text()
            fields = stat[stat.rindex(')') + 2:].split()
            rows[int(entry.name)] = {'parent': int(fields[1]),
                                     'ticks': int(fields[11]) + int(fields[12]),
                                     'name': stat[stat.index('(') + 1:stat.rindex(')')]}
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass
    selected = {ui.pid}
    while True:
        expanded = selected | {pid for pid, row in rows.items() if row['parent'] in selected}
        if expanded == selected:
            break
        selected = expanded
    return {pid: row for pid, row in rows.items() if pid in selected}


def sample(case, window_state):
    time.sleep(2)
    before = processes()
    start = time.monotonic()
    time.sleep(duration)
    elapsed = time.monotonic() - start
    rows = []
    for pid, row in processes().items():
        pss = None
        try:
            fields = (Path('/proc') / str(pid) / 'smaps_rollup').read_text().splitlines()
            pss = int(next(line.split()[1] for line in fields if line.startswith('Pss:')))
        except (FileNotFoundError, PermissionError, StopIteration):
            pass
        cpu = 100 * (row['ticks'] - before.get(pid, row)['ticks']) / ticks / elapsed
        rows.append({'pid': pid, 'process': row['name'], 'cpu_one_core_percent': cpu, 'pss_kib': pss})
    result = {'case': case, 'seconds': elapsed, 'wm_state': window_state, 'processes': rows,
              'cpu_one_core_percent': sum(row['cpu_one_core_percent'] for row in rows),
              'pss_kib': sum(row['pss_kib'] or 0 for row in rows)}
    print(json.dumps(result), flush=True)
    return result


ui.wait_for('Start audio')
assert os.environ.get('ULTRA_TEST_WM') == '1', 'Use the private mwm session for real iconification.'
x = ui.x
x.XDefaultRootWindow.argtypes = [C.c_void_p]
x.XDefaultRootWindow.restype = C.c_ulong
x.XQueryTree.argtypes = [C.c_void_p, C.c_ulong, C.POINTER(C.c_ulong), C.POINTER(C.c_ulong), C.POINTER(C.POINTER(C.c_ulong)), C.POINTER(C.c_uint)]
x.XIconifyWindow.argtypes = [C.c_void_p, C.c_ulong, C.c_int]
x.XMapRaised.argtypes = [C.c_void_p, C.c_ulong]
x.XFree.argtypes = [C.c_void_p]


def children_of(window):
    root = C.c_ulong(); parent = C.c_ulong(); children = C.POINTER(C.c_ulong)(); count = C.c_uint()
    assert x.XQueryTree(ui.display, window, C.byref(root), C.byref(parent), C.byref(children), C.byref(count))
    result = [children[i] for i in range(count.value)]
    if children:
        x.XFree(children)
    return result


def client_window(window):
    value = subprocess.check_output(['xprop', '-id', str(window), '_NET_WM_PID'], text=True)
    if re.search(r'=\s*' + str(ui.pid) + r'\s*$', value):
        return window
    for child in children_of(window):
        found = client_window(child)
        if found:
            return found
    return None


client = client_window(x.XDefaultRootWindow(ui.display))
assert client, 'App window not found on the private display.'


def wm_state():
    return subprocess.check_output(['xprop', '-id', str(client), 'WM_STATE'], text=True).strip()


def visibility(minimized):
    if minimized:
        assert x.XIconifyWindow(ui.display, client, 0)
    else:
        x.XMapRaised(ui.display, client)
    x.XFlush(ui.display)
    expected = 'Iconic' if minimized else 'Normal'
    for _ in range(50):
        value = wm_state()
        if expected in value:
            return value
        time.sleep(.1)
    raise AssertionError('WM_STATE did not become ' + expected + ': ' + value)


patch = ui.export()
assert len(patch['nodes']) == 16 and len(patch['edges']) == 16, 'Profile the same original connected starter patch.'
results = []
audio_text = []
for running in (False, True):
    if running:
        ui.click('Start audio')
        for _ in range(80):
            if not ui.find('Start audio').get_state_set().contains(ui.Atspi.StateType.ENABLED):
                break
            time.sleep(.1)
        else:
            raise AssertionError('Audio did not start')
        ui.keys('Control_L', 'e')
        ui.click('Trigger toggle object 1')
        ui.click('Audio settings')
        time.sleep(.3)
        for root in ui.Atspi.get_desktop(0):
            if root.get_process_id() == ui.pid:
                for node in ui.walk(root):
                    try:
                        name = node.get_name()
                        text = ui.Atspi.Text.get_text(node, 0, -1) if 'Text' in node.get_interfaces() else ''
                        for value in (name, text):
                            if ('kHz' in value or 'frames /' in value or 'PipeWire' in value) and value not in audio_text:
                                audio_text.append(value)
                    except ui.GLib.GError:
                        pass
        ui.click('Close panel')
        dump = json.loads(subprocess.check_output(['pw-dump'], text=True))
        nodes = [row for row in dump if row.get('type') == 'PipeWire:Interface:Node']
        (ui.output / 'pipewire-nodes.json').write_text(json.dumps(nodes, indent=2) + '\n')
        (ui.output / 'pipewire-top.txt').write_text(subprocess.check_output(['pw-top', '-b', '-n', '1'], text=True))
    results.append(sample(f'audio-{"on" if running else "off"}-visible', visibility(False)))
    results.append(sample(f'audio-{"on" if running else "off"}-minimized', visibility(True)))
    visibility(False)
ui.click('Stop audio')
result = {'commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
          'binary_sha256': hashlib.sha256((Path('/proc') / str(ui.pid) / 'exe').read_bytes()).hexdigest(),
          'patch_sha256': hashlib.sha256(json.dumps(patch, sort_keys=True).encode()).hexdigest(),
          'kernel': platform.release(), 'cpu': subprocess.check_output(['lscpu'], text=True),
          'versions': subprocess.check_output(['pacman', '-Q', 'webkit2gtk-4.1', 'gtk3', 'pipewire', 'wireplumber', 'openmotif'], text=True),
          'audio': os.environ['ULTRA_TEST_AUDIO_SCOPE'], 'observed_audio_labels': audio_text,
          'workload': 'Original 16-object / 16-cable starter; DSP-on drives toggle -> metro 150ms -> chord -> makenote -> legacy voice -> gain/join/dac.',
          'results': results,
          'window_scope': 'Private Xvfb 1280x840 with actual Motif WM_STATE Normal/Iconic verified. No compositor/GPU or physical output qualification.'}
(ui.output / 'performance.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2), flush=True)
