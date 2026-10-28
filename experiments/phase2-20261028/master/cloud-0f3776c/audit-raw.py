import bisect, hashlib, json, math
from pathlib import Path
p = Path('.superpowers/sdd/2026-10-28-phase2-live-max/cloud-0f3776c-local/raw')
r = json.loads((p/'native-session-report.json').read_text())
def rows(n): return [json.loads(x) for x in (p/n).read_text().splitlines()]
def sha(f):
    with f.open('rb') as h: return hashlib.file_digest(h,'sha256').hexdigest()
credits=[x for x in rows('sustained-playing.jsonl') if x['credited_seconds']>0]
bounds=sorted(x['monotonic'] for x in rows('sustained-actions.jsonl')+rows('sustained-gaps.jsonl'))
invalid=[]; crossing=[]
for x in credits:
    a,b=x['previous_monotonic'],x['monotonic']; i=bisect.bisect_right(bounds,a)
    if not (x['running'] is True and x['previous_running'] is True and x['action']==x['previous_action'] and x['frame']>x['previous_frame'] and 0<x['elapsed_seconds']<=2.5 and math.isclose(b-a,x['elapsed_seconds'],abs_tol=1e-8) and x['credited_seconds']<=min(x['elapsed_seconds'],(x['frame']-x['previous_frame'])/x['rate'])+1e-8): invalid.append(x)
    if i<len(bounds) and bounds[i]<=b: crossing.append(x)
assert not invalid and not crossing
whole=sum(x['credited_seconds'] for x in credits); g=r['pilot_growth']
def until(k): return sum(x['credited_seconds'] for x in credits if x['monotonic']<=g[k]['monotonic'])
for k in ('cycle_begin','cycle_end','capture_end','final'): assert math.isclose(until(k),g[k]['playing_seconds'],abs_tol=1e-8)
assert math.isclose(whole,r['stream_measurement']['playing_seconds_proven'],abs_tol=1e-8)
epochs=[x for x in rows('sustained-epochs.jsonl') if 'epoch_id' in x]
assert [int(x['epoch_id']) for x in epochs]==list(range(1,len(epochs)+1))
assert all(x['final'] is True and x['state']=='finalized' and not x['failed'] for x in epochs)
fields=('native_render_failures','invalid_callback_shape','cpal_error_total','cpal_xrun_reports','cpal_non_xrun_reports','over_buffer_budget_count','counter_overflow','clock_anomaly_count')
totals={k:sum(int(x['metrics'][k]) for x in epochs) for k in fields}
for k in ('epochs','gaps','actions','resources','playing'):
    e=r['stream_measurement'][k]; f=p/Path(e['path']).name
    assert f.stat().st_size==e['bytes'] and sha(f)==e['sha256'],k
identity=r['stream_measurement']['process_identity']; builds=(p/'build-sha256.txt').read_text(); assert identity['executable']['sha256'] in builds and identity['libraries'][0]['sha256'] in builds
assert (p/'source-commit.txt').read_text().strip()=='0f3776c87b79069e989c5e5be24312ed455ee3ce'
assert r['stream_measurement']['complete'] and r['stream_measurement']['last_diagnostics']['native_quiescent'] and r['quit_discard_exited']
print(json.dumps({'credited_rows':len(credits),'invalid':len(invalid),'crossings':len(crossing),'maximum_interval':max(x['elapsed_seconds'] for x in credits),'whole_journey_seconds':whole,'cycle_seconds':until('cycle_end')-until('cycle_begin'),'target_seconds':r['playing_seconds_conservative'],'epoch_totals':totals,'epoch_budget_by_id':{x['epoch_id']:x['metrics']['over_buffer_budget_count'] for x in epochs},'raw_report_hashes_match':True,'process_identity':identity,'source_commit':(p/'source-commit.txt').read_text().strip()},indent=2))
