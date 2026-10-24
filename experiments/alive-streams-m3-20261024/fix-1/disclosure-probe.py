#!/usr/bin/env python3
import sys
sys.path.insert(0, '/home/venetanji/.codex/worktrees/edd5/alive/apps/ultra/tests')
import hashlib
import json
import os
import time
from pathlib import Path
import check_alive_desktop as alive
from stream_measurement import ProcessSampler, JsonLines, PlayingIntervals
from gi.repository import Atspi
ui, windows = alive.ui, alive.windows
out = ui.output
rows = JsonLines(out/'control-resources.jsonl')
stages = []
readers = {}
def text(name):
    if name not in readers: readers[name] = ui.wait_for(name)
    return Atspi.Text.get_text(readers[name], 0, -1)
def sample(samplers, mode, phase):
    result = {'mode': mode, 'phase': phase, 'monotonic': time.monotonic(), **{key: value.sample() for key, value in samplers.items()}}
    rows.write(result)
    return result
def endpoint_cpu(first, last):
    result = {}
    for role in ('app', 'sampler_capture', 'server'):
        old = {(p['pid'], p['starttime']): p for p in first[role]['processes']}
        new = {(p['pid'], p['starttime']): p for p in last[role]['processes']}
        shared = old.keys() & new.keys()
        hz = last[role]['clock_ticks_per_second']
        seconds = sum(new[k]['ticks']-old[k]['ticks'] for k in shared)/hz
        elapsed = last[role]['sample_end']-first[role]['sample_end']
        result[role] = {'cpu_seconds_observed': seconds, 'elapsed': elapsed, 'one_core_percent_observed':100*seconds/elapsed, 'identities_shared':len(shared), 'identity_coverage_gap':old.keys()!=new.keys(), 'unavailable_final_deltas':len(old.keys()-new.keys())}
    return result

windows.focus(alive.MAIN)
alive.check_audio_settings()
ui.click('Stream measurements')
time.sleep(1.2)
def observe(label):
    item=ui.wait_for('Stream measurements')
    rect=Atspi.Component.get_extents(item,Atspi.CoordType.SCREEN)
    print(label,item.get_role_name(),item.get_state_set().contains(Atspi.StateType.EXPANDED),[rect.x,rect.y,rect.width,rect.height],flush=True)
    for child in ui.walk(item):
        print('child',child.get_name(),child.get_role_name(),flush=True)
    alive.screenshot(label+'.png')
observe('expanded')
ui.click('Stream measurements')
observe('after-center-click')
Atspi.Component.grab_focus(ui.wait_for('Stream measurements'))
ui.keys('Return')
observe('after-keyboard')
ui.click('Quit Alive')
