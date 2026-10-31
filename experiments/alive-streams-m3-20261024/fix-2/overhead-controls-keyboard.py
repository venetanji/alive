#!/usr/bin/env python3
import sys
sys.path.insert(0, '/home/venetanji/.codex/worktrees/edd5/alive/apps/ultra/tests')
import hashlib
import json
import os
import time
from pathlib import Path
import check_alive_desktop as alive
from stream_measurement import ProcessSampler, ProcessGroups, JsonLines, PlayingIntervals
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
    result = {'mode': mode, 'phase': phase, 'monotonic': time.monotonic(), **samplers.sample()}
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
def disclosure(name, expanded):
    item = ui.wait_for(name)
    if item.get_state_set().contains(Atspi.StateType.EXPANDED) != expanded:
        Atspi.Component.grab_focus(item)
        ui.keys('Return')
    deadline = time.monotonic()+3
    while time.monotonic()<deadline:
        if ui.wait_for(name).get_state_set().contains(Atspi.StateType.EXPANDED) == expanded: return
        time.sleep(.1)
    raise AssertionError('Disclosure did not reach requested state: '+name+' '+str(expanded))
capture = None
try:
    windows.focus(alive.MAIN)
    alive.check_audio_settings()
    alive.transport('start')
    time.sleep(1)
    samplers = ProcessGroups(app=ProcessSampler(ui.pid), sampler_capture=ProcessSampler(os.getpid()), server=ProcessSampler(int(os.environ['ULTRA_TEST_AUDIO_PID'])))
    for repetition in range(2):
        for mode in ('baseline', 'sampler_1hz', 'sampler_plus_diagnostics', 'sampler_diagnostics_capture'):
            diagnostics = 'diagnostics' in mode
            disclosure('Audio details', True)
            disclosure('Stream measurements', diagnostics)
            if diagnostics: time.sleep(1.2)
            if mode.endswith('capture'):
                capture = alive.start_capture('overhead-capture-'+str(repetition))
                time.sleep(.5)
            first = sample(samplers, mode, 'start')
            intervals = PlayingIntervals()
            started = time.monotonic()
            for index in range(9):
                if index:
                    time.sleep(max(0, started+index-time.monotonic()))
                now = time.monotonic()
                intervals.observe(now, text('Transport playing')=='true', int(text('Absolute frame')), 0)
                if mode != 'baseline' and index not in (0,8): sample(samplers, mode, 'periodic')
                if diagnostics:
                    raw = json.loads(text('Stream diagnostics'))
                    assert 'error' not in raw, raw
                    (out/('diagnostics-'+str(repetition)+'-'+mode+'.json')).write_text(json.dumps(raw))
            last = sample(samplers, mode, 'end')
            stage = {'mode':mode,'repetition':repetition,'wall_seconds':time.monotonic()-started,'playing_seconds_proven':intervals.seconds,'cpu':endpoint_cpu(first,last),'regular_ui_poll_ms':80,'constant_accessibility_transport_reads_hz':1,'telemetry_enabled':True}
            assert intervals.seconds>6, stage
            if capture:
                stage['capture'] = alive.finish_capture(capture)
                capture = None
            disclosure('Stream measurements', False)
            stages.append(stage)
            (out/'overhead-controls.json').write_text(json.dumps({'complete':False,'stages':stages},indent=2))
    alive.transport('stop')
    disclosure('Audio details', False)
    ui.click('Alive audio settings')
    ui.click('Stop Alive audio to edit settings')
    ui.click('Close audio settings')
    disclosure('Audio details', True)
    disclosure('Stream measurements', True)
    alive.wait_value('Stream diagnostics', lambda value: json.loads(value).get('complete') is True)
    final = json.loads(alive.value('Stream diagnostics'))
    assert final['complete'], final
    (out/'final-epochs.json').write_text(json.dumps(final,indent=2))
    (out/'overhead-controls.json').write_text(json.dumps({'complete':True,'physical_audio':False,'physical_xruns':None,'stages':stages,'resources':rows.manifest(),'scope':'Two repetitions of eight seconds per stage. Constant UI80ms and transport AT-SPI1Hz; optional diagnostic1Hz and observed process CPU. No percentile subtraction or complete-tree CPU claim.'},indent=2))
    ui.click('Quit Alive')
finally:
    if capture: capture[0].finish()
