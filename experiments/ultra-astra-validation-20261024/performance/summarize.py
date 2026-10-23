import json
from pathlib import Path
import statistics

root=Path(__file__).resolve().parent
groups={}
for build in ['baseline','fixed','plain-baseline','plain-fixed']:
    path=root/build/'summary.json'
    if not path.exists():continue
    data=json.loads(path.read_text())
    for state in ['off-visible','off-minimized','on-visible','on-minimized']:
        samples=[s for s in data['samples'] if s['sample'].rsplit('-',1)[0]==state]
        if not samples:continue
        values=[s['process_tree_cpu_percent_one_core'] for s in samples]
        item={'build':build,'state':state,'sha':data['sha'],'n':len(samples),
            'cpu_mean':statistics.mean(values),'cpu_min':min(values),'cpu_max':max(values),
            'webkit_cpu_mean':statistics.mean(sum(v for k,v in s['cpu_by_process_name'].items() if k.startswith('WebKit')) for s in samples),
            'pss_mib_mean':statistics.mean(s['pss_mib_mean'] for s in samples),
            'pss_missing':sorted({n for s in samples for n in s['pss_missing']})}
        if all(s.get('counter_delta') for s in samples):
            dt=sum(s['counter_interval_seconds'] for s in samples)
            item['poll_hz']=sum(s['counter_delta']['polls'] for s in samples)/dt
            for name in ['polls','rebuilds','paths','rects']:
                item[name+'_mean_per_sample']=statistics.mean(s['counter_delta'][name] for s in samples)
            item['stream_errors_max']=max(s['last_metric']['audio']['output']['stream_errors'] for s in samples)
            item['xruns_max']=max(s['last_metric']['audio']['xruns'] for s in samples)
            item['faults']=any(s['last_metric']['audio']['fault'] or s['last_metric']['audio']['server_lost'] for s in samples)
            item['js_errors']=sorted({e for s in samples for e in s['last_metric']['errors']})
        groups[build+':'+state]=item
(root/'comparison.json').write_text(json.dumps(groups,indent=2)+'\n')
lines=['| Condition | Baseline CPU % | Fixed CPU % | Baseline / Fixed PSS MiB | Baseline / Fixed polls/s | Baseline / Fixed rebuilds per sample |',
       '| --- | ---: | ---: | ---: | ---: | ---: |']
for state in ['off-visible','off-minimized','on-visible','on-minimized']:
    a=groups.get('baseline:'+state);b=groups.get('fixed:'+state)
    if not a or not b:continue
    lines.append(f"| {state} | {a['cpu_mean']:.1f} ({a['cpu_min']:.1f}-{a['cpu_max']:.1f}) | {b['cpu_mean']:.1f} ({b['cpu_min']:.1f}-{b['cpu_max']:.1f}) | {a['pss_mib_mean']:.0f} / {b['pss_mib_mean']:.0f} | {a['poll_hz']:.2f} / {b['poll_hz']:.2f} | {a['rebuilds_mean_per_sample']:.1f} / {b['rebuilds_mean_per_sample']:.1f} |")
(root/'comparison.md').write_text('\n'.join(lines)+'\n')
print('\n'.join(lines))
for name,item in groups.items():
    if name.startswith('plain-'):print(name,item)
