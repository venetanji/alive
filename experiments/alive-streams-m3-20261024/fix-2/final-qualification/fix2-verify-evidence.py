#!/usr/bin/env python3
import array
from collections import Counter
import hashlib
import json
import math
import os
import sys
from pathlib import Path
sys.path.insert(0, '/home/venetanji/.codex/worktrees/edd5/alive/apps/ultra/tests')
from stream_measurement import EpochCollector, histogram_summary
root=Path('/tmp/alive-task13a-evidence')
def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as stream:
        while block:=stream.read(1<<20):h.update(block)
    return h.hexdigest()
def distribution(values):
    valid=sorted(v for v in values if v is not None)
    if not valid:return {'available':0,'unavailable':len(values)}
    ordered=[v for v in values if v is not None]
    return {'available':len(valid),'unavailable':len(values)-len(valid),'initial':ordered[0],'final':ordered[-1],'minimum':valid[0],'p50':valid[max(0,math.ceil(.5*len(valid))-1)],'p95':valid[max(0,math.ceil(.95*len(valid))-1)],'maximum':valid[-1],'endpoint_delta':ordered[-1]-ordered[0]}
def resources(path,roles):
    rows=[json.loads(line) for line in path.open()]
    result={'samples':len(rows),'raw_sha256':sha(path),'scope':'observed identities, not complete process-tree CPU or no-growth evidence','groups':{}}
    identities=set();maximum=0
    for row in rows:
        current={(p['pid'],p['starttime']) for role in roles for p in row[role]['processes']}
        maximum=max(maximum,len(current));identities.update(current)
    assert maximum<=64 and len(identities)<=256
    result['union_max_simultaneous']=maximum;result['union_lifetime_identities']=len(identities)
    result['samples_per_action_or_mode']=dict(Counter(str(row.get('action',row.get('mode'))) for row in rows))
    result['webkit_process_count']=distribution([sum(process.get('role')=='webkit_worker' for process in row['app']['processes']) for row in rows])
    for role in roles:
        group=[r[role] for r in rows]
        result['groups'][role]={key:distribution([r.get(key) for r in group]) for key in ['pss_kib','rss_kib','cpu_percent','threads','fds','sample_duration']}
        result['groups'][role]['coverage_gap_samples']=sum(bool(r['coverage_gap']) for r in group)
    return result
def epochs(path):
    data=json.loads(path.read_text());c=EpochCollector();assert c.accept(data)
    assert data['complete'] and data['active'] is None and data['native_quiescent'] and not data['coverage_gap']
    assert data['retiring_epoch_id'] is None
    completed=data['completed'];life=data['lifetime'];assert c.cursor==len(completed)>0
    sums=['callbacks_entered','valid_callbacks','output_frames','render_calls','native_render_failures','silenced_callbacks','invalid_callback_shape','zero_frame_callbacks','callbacks_after_failure','cpal_error_total','cpal_xrun_reports','cpal_non_xrun_reports','duration_samples','duration_sum_ns','budget_samples','over_buffer_budget_count','clock_anomaly_count','buffer_size_changed_count']
    for key in sums:assert int(life[key])==sum(int(e['metrics'][key]) for e in completed),key
    for key,number in [('duration_hist',256),('util_hist',202)]:
        assert len(life[key])==number
        assert [int(x) for x in life[key]]==[sum(int(e['metrics'][key][i]) for e in completed) for i in range(number)]
    assert sum(map(int,life['duration_hist']))==int(life['duration_samples'])
    assert sum(map(int,life['util_hist']))==int(life['budget_samples'])
    errors=['cpal_error_total','cpal_xrun_reports','cpal_non_xrun_reports','native_render_failures','invalid_callback_shape','counter_overflow','over_buffer_budget_count','clock_anomaly_count']
    assert all(int(life[k])==0 for k in errors)
    return {'complete':True,'epochs':len(completed),'lifetime':{k:v for k,v in life.items() if not isinstance(v,list)},'configs':[e['config'] for e in completed],'duration':histogram_summary(life['duration_hist'],data['duration_upper_edges_ns'],life['duration_max_ns']),'utilization':{**histogram_summary(life['util_hist'],data['utilization_upper_percent'],life['max_utilization_ppm']),'maximum_unit':'ppm','interval_unit':'percent'},'sha256':sha(path)}
p=root/'fix2-overhead-controls';d=json.loads((p/'overhead-controls.json').read_text())
assert d['complete'] and len(d['stages'])==8
modes=['baseline','sampler_1hz','sampler_plus_diagnostics','sampler_diagnostics_capture']
assert [s['mode'] for s in d['stages']]==modes*2
captures=[]
for s in d['stages']:
    assert s['playing_seconds_proven']>6
    if 'capture' not in s:continue
    cap=s['capture'];path=p/cap['path'];assert cap['supervision']['complete']
    assert path.stat().st_size==cap['frames']*8 and sha(path)==cap['sha256']
    with path.open('rb') as stream:
        while block:=stream.read(384000):
            samples=array.array('f');samples.frombytes(block);assert all(math.isfinite(x) for x in samples)
    group=cap['supervision']['group_id']
    try:os.killpg(group,0)
    except ProcessLookupError:pass
    else:raise AssertionError('owned recorder group remains live')
    captures.append(cap)
summary={'source_commit':'30240579dde52edb9de6c5fdcb7741fa1524b95c','complete':True,'physical_audio':False,'physical_xruns':None,'stage_count':8,'playing_seconds_proven':sum(s['playing_seconds_proven'] for s in d['stages']),'stages':d['stages'],'epochs':epochs(p/'final-epochs.json'),'resources':resources(p/'control-resources.jsonl',['app','sampler_capture','server']),'captures':captures,'controls_report_sha256':sha(p/'overhead-controls.json')}
(root/'fix2-controls-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({'complete':summary['complete'],'stages':8,'playing_seconds_proven':summary['playing_seconds_proven'],'epochs':summary['epochs']['epochs'],'resources':summary['resources']['samples'],'duration':summary['epochs']['duration']},indent=2))
if len(sys.argv)>1:
    p=root/'fix2-native-accepted'
    final=epochs(p/'observability-final.json')
    (root/'fix2-native-epoch-summary.json').write_text(json.dumps(final,indent=2)+'\n')
    raw=resources(p/'observability-resources.jsonl',['app','sampler_capture_overhead','private_audio_server'])
    (root/'fix2-resource-summary.json').write_text(json.dumps(raw,indent=2)+'\n')
    print(json.dumps({'native_epochs':final['epochs'],'resources':raw['samples'],'pss_kib':raw['groups']['app']['pss_kib']},indent=2))

    cap=json.loads((p/'native-clips-report.json').read_text())['audio'];path=p/cap['path']
    assert cap['supervision']['complete'] and path.stat().st_size==cap['frames']*8 and sha(path)==cap['sha256']
    with path.open('rb') as stream:
        while block:=stream.read(384000):
            samples=array.array('f');samples.frombytes(block);assert all(math.isfinite(x) for x in samples)
    try:os.killpg(cap['supervision']['group_id'],0)
    except ProcessLookupError:pass
    else:raise AssertionError('owned native recorder group remains live')
    (root/'fix2-native-capture-verified.json').write_text(json.dumps({'complete':True,'frames':cap['frames'],'sha256':cap['sha256'],'finite':True,'owned_group_gone':True},indent=2)+'\n')
