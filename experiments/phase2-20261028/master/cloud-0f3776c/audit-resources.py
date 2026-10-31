import json
from pathlib import Path
p=Path('.superpowers/sdd/2026-10-28-phase2-live-max/cloud-0f3776c-local/raw/sustained-resources.jsonl')
rows=[json.loads(x) for x in p.read_text().splitlines()]
result={'rows':len(rows),'maximum_delay':max(x['sampling_delay'] for x in rows),'maximum_duration':max(x['sampling_duration'] for x in rows),'maximum_missed_cadences':max(x['missed_cadences'] for x in rows),'app_coverage_gap_rows':sum(x['app']['coverage_gap'] for x in rows)}
for label in ('app_aggregate','alive_process'):
 result[label]={}
 for k in ('rss_kib','fds','threads'):
  vals=([x['app'][k] for x in rows if x['app'].get(k) is not None] if label=='app_aggregate' else [q[k] for x in rows for q in x['app']['processes'] if q['comm']=='alive' and q.get(k) is not None])
  result[label][k]={'first':vals[0],'last':vals[-1],'delta':vals[-1]-vals[0],'peak':max(vals)}
print(json.dumps(result,indent=2))
