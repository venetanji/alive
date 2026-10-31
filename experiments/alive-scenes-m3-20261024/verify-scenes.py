import array, hashlib, json, math, sys
from pathlib import Path
sys.path.insert(0,str(Path('apps/ultra/tests').resolve()))
from stream_measurement import histogram_summary
p=Path(sys.argv[1]); report=json.loads((p/'scenes-report.json').read_text()); final=json.loads((p/'scenes-final-epochs.json').read_text())
assert report['complete'] and final['complete'] and final['native_quiescent']
assert not final['coverage_gap'] and int(final['evicted_epoch_count'])==0 and not final['active'] and not final['retiring_epoch_id']
for key in ['resources','epoch_log']:
 m=report[key];data=Path(m['path']).read_bytes();assert len(data)==m['bytes'] and hashlib.sha256(data).hexdigest()==m['sha256']
rows=[json.loads(s) for s in (p/'scenes-resources.jsonl').read_text().splitlines()]
def quantile(xs,p):return sorted(xs)[math.ceil(p*len(xs))-1] if xs else None
resources={}
for group in ['app','sampler_capture','server']:
 records=[r[group] for r in rows];cpu=[r['cpu_percent'] for r in records if r['cpu_percent'] is not None];pss=[r['pss_kib'] for r in records if r['pss_kib'] is not None];gaps=[records[i]['monotonic']-records[i-1]['monotonic'] for i in range(1,len(records))]
 identities=sorted({(x['pid'],x['starttime'],x['comm']) for r in records for x in r['processes']})
 resources[group]={'samples':len(records),'duration_s':records[-1]['monotonic']-records[0]['monotonic'],'cpu_percent_one_core':{'p50':quantile(cpu,.5),'p95':quantile(cpu,.95),'max':max(cpu)},'pss_kib':{'first':pss[0],'last':pss[-1],'min':min(pss),'max':max(pss),'growth':pss[-1]-pss[0]},'threads_max':max(r['threads_observed'] for r in records),'fds_max':max(r['fds_observed'] for r in records),'identities':identities,'coverage_gap_samples':sum(r['coverage_gap'] for r in records),'unavailable_records':sum(len(r['unavailable']) for r in records),'enumeration_gap_records':sum(len(r['enumeration_gaps']) for r in records),'unavailable_fields':sum(len(x['unavailable_fields']) for r in records for x in r['processes']),'sample_cadence_s_max':max(gaps),'sample_duration_s_max':max(r['sample_duration'] for r in records),'missed_cadences':sum(r['missed_cadences'] for r in records)}
epochs=[]
for e in final['completed']:
 m=e['metrics'];assert e['final'] and not e['failed'] and not e['stale'];assert sum(map(int,m['duration_hist']))==int(m['duration_samples']);assert sum(map(int,m['util_hist']))==int(m['budget_samples']);assert m['buffer_frames_min']==m['buffer_frames_max']=='512';assert e['config']['rate_hz']==48000
 for key in ['cpal_error_total','native_render_failures','invalid_callback_shape','clock_anomaly_count','counter_overflow']:
  assert int(m[key])==0
 summary=histogram_summary(m['duration_hist'],final['duration_upper_edges_ns'],m['duration_max_ns']);assert summary==report['duration_intervals'][e['epoch_id']]
 epochs.append({'epoch_id':e['epoch_id'],'callbacks':int(m['callbacks_entered']),'over_buffer_budget_count':int(m['over_buffer_budget_count']),'max_utilization_ppm':int(m['max_utilization_ppm']),'duration':summary})
path=p/report['audio']['path'];digest=hashlib.sha256();frames=0;peaks=[0.,0.]
with path.open('rb') as stream:
 while block:=stream.read(8*48000):
  assert len(block)%8==0;digest.update(block);samples=array.array('f');samples.frombytes(block);assert all(math.isfinite(v) for v in samples);frames+=len(samples)//2
  for i in range(2):peaks[i]=max(peaks[i],max(map(abs,samples[i::2]),default=0))
assert digest.hexdigest()==report['audio']['sha256'] and frames==report['audio']['frames']
result={'path':str(p),'verified':True,'resource_rows':len(rows),'resources':resources,'epochs':epochs,'audio':{'frames':frames,'seconds':frames/48000,'channel_peaks':peaks,'sha256':digest.hexdigest()},'artifacts':json.loads((p/'scenes-artifacts.json').read_text()),'coverage_note':'Finite moving-workflow observation; process discovery can miss transient or reparented workers. No physical audio or long-run stability claim.'}
(p/'scenes-verified.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
