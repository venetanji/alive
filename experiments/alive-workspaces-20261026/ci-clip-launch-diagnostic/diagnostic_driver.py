"""Read-only observations around the unchanged journey's original stopped launch."""
import ctypes as C
import datetime
import hashlib
import json
import os
from pathlib import Path
import runpy
import sys
import time

ROOT = Path('/home/venetanji/.codex/worktrees/edd5/alive')
sys.path.insert(0, str(ROOT/'apps/ultra/tests'))
import check_alive_desktop as alive
from gi.repository import Atspi

ui, windows = alive.ui, alive.windows
original_launch = alive.reorder_click
launch_count = 0
state_names = ('SHOWING', 'VISIBLE', 'ENABLED', 'SENSITIVE', 'FOCUSED',
               'SELECTED', 'PRESSED', 'EXPANDED', 'EDITABLE')


def observation(label):
    start = time.monotonic()
    record = {'label': label, 'start_monotonic': start,
              'start_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'scope': windows.scope, 'nodes': [], 'errors': [],
              'node_limit': 2000, 'wall_limit_seconds': 4}
    try:
        focus, revert = C.c_ulong(), C.c_int()
        ui.x.XGetInputFocus(ui.display, C.byref(focus), C.byref(revert))
        record['native_input_focus'] = focus.value
        record['native_focus_revert'] = revert.value
        record['owned_main_window'] = alive.owned_frame_window()
        for frame in windows.app_frames():
            for item in ui.walk(frame):
                if len(record['nodes']) >= 2000 or time.monotonic()-start > 4:
                    record['bounded_truncation'] = True
                    break
                try:
                    name = item.get_name()
                    interfaces = list(item.get_interfaces())
                    states = item.get_state_set()
                    if not name and 'Text' not in interfaces:
                        continue
                    row = {'name': name, 'role': item.get_role_name(),
                           'frame': frame.get_name(), 'interfaces': interfaces,
                           'states': {key: states.contains(getattr(Atspi.StateType, key))
                                      for key in state_names}}
                    if 'Text' in interfaces:
                        text = Atspi.Text.get_text(item, 0, -1)
                        row['text'] = text[:131072]
                        row['text_truncated'] = len(text) > 131072
                    if 'Component' in interfaces and (name or row['states']['FOCUSED']):
                        rect = Atspi.Component.get_extents(item, Atspi.CoordType.SCREEN)
                        row['screen_rect'] = [rect.x, rect.y, rect.width, rect.height]
                        if name == 'Launch Pulse Clip 1' and rect.width > 0 and rect.height > 0:
                            row['native_hit_path'] = alive.native_hit_path(
                                rect.x+rect.width//2, rect.y+rect.height//2)
                    record['nodes'].append(row)
                except Exception as error:
                    record['errors'].append(str(error)[:512])
            if record.get('bounded_truncation'):
                break
        process = Path('/proc')/str(ui.pid)
        exe = (process/'exe').resolve(strict=True)
        mapped = sorted({line.split()[-1] for line in (process/'maps').read_text().splitlines()
                         if 'libultra_native' in line})
        record['process'] = {'pid': ui.pid, 'exe': str(exe),
                             'exe_sha256': hashlib.sha256(exe.read_bytes()).hexdigest(),
                             'native_mappings': {p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
                                                 for p in mapped}}
        alive.screenshot('diagnostic-'+label+'.png')
    except Exception as error:
        record['errors'].append(repr(error))
    record['end_monotonic'] = time.monotonic()
    record['overhead_seconds'] = record['end_monotonic']-start
    record['original_input_records'] = list(alive.native_inputs)
    (ui.output/('diagnostic-'+label+'.json')).write_text(json.dumps(record, indent=2)+'\n')
    return record


def diagnosed_launch(name):
    global launch_count
    if name != 'Launch Pulse Clip 1':
        return original_launch(name)
    launch_count += 1
    assert launch_count == 1, 'Diagnostic may observe only the original stopped launch'
    observation('before-original-launch')
    boundary = {'start_monotonic': time.monotonic(),
                'start_utc': datetime.datetime.now(datetime.timezone.utc).isoformat()}
    try:
        return original_launch(name)
    finally:
        boundary['end_monotonic'] = time.monotonic()
        boundary['input_records'] = list(alive.native_inputs)
        (ui.output/'diagnostic-original-gesture.json').write_text(json.dumps(boundary, indent=2)+'\n')
        observation('after-original-launch')


alive.reorder_click = diagnosed_launch
try:
    runpy.run_path(str(ROOT/'apps/ultra/tests/check_alive_observability.py'), run_name='__main__')
except BaseException as error:
    observation('original-failure')
    (ui.output/'diagnostic-exception.json').write_text(json.dumps(
        {'type': type(error).__name__, 'message': str(error), 'launch_count': launch_count,
         'monotonic': time.monotonic()}, indent=2)+'\n')
    raise
