#!/usr/bin/env python3
"""Create per-experiment manifests conforming to aa13d68's handoff schema."""
import datetime as dt,hashlib,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def j(p):return json.loads(p.read_text())
def f(path,role):return {'path':path,'sha256':digest(ROOT/path),'role':role}
def classes(p):
 out=set()
 def visit(graph):
  for wrapper in graph['boxes']:
   b=wrapper['box'];out.add(b.get('text','').split()[0] if b['maxclass']=='newobj' and b.get('text') else b['maxclass'])
   if 'patcher' in b:visit(b['patcher'])
 visit(j(p)['patcher']);return sorted(out)
settings={'sample_rate_hz':44100,'signal_vector_frames':64,'io_vector_frames':512,'overdrive':False,'scheduler_in_audio_interrupt':False,'audio_enabled':False,'transport':{},'other':{'audio_driver':'ad_mme','wine_version':'wine-11.13','wine_distribution':'2026.08.30.1, d2d1-dcomp build 5c23dd1c + 110 patches','dsp_enabled_during_message_probes':False},'unknown_fields':['transport state and tempo: not queried; scores use only milliseconds','native Windows/macOS behavior: not measured']}
env={'max_version':'9.1.5 (3db35fa476d), x64 windows','live_version':'12.4.6 build 2026-09-10_0de5c8fa9a (installed; standalone probes do not use Live scheduler)','os':'Omarchy 4.0.0.r7083.g81fd2d2; Linux 7.2.8-9-omarchy; Wine Windows 10 Pro','architecture':'x86_64 host / Windows x64 Max','runtime_host':'standalone_max'}
md=ROOT/'manifests';md.mkdir(exist_ok=True)
for p in sorted((ROOT/'fixtures').glob('[0-9][0-9]-*.maxpat')):
 trace=ROOT/'results'/(p.stem+'.jsonl');score=ROOT/'fixtures'/(p.stem+'.score.json')
 if not score.exists():continue
 executed=trace.exists();rows=[json.loads(x) for x in trace.read_text().splitlines()] if executed else []
 s=json.loads(json.dumps(settings));kind='exact_ordered_messages';limits=['Only listed input messages in this fixture are observed.','JS defers high-priority input; sequence reflects collector arrival.','Scalar int/float selectors are preserved; numeric types within lists are unknown in this logger.','Expected files are observed baselines, not independently certified oracles.']
 if p.stem in ['00-environment','14-scheduler','15-scope','02-fanout','16-fanout-metadata','17-fanout-reversed']:kind='inventory_only'
 limits+=['latest_input_id is arrival context only; causal_input_id is null because causality was not measured.','Source candidates come from direct logger patchlines; shared inlets are ambiguous and no unique source is asserted.']
 if p.stem=='14-scheduler':limits+=['Metro tick count and wall time vary; no exact tick-count comparison.']
 if p.stem=='15-scope':limits+=['Multiple receive object delivery order is officially nondeterministic.']
 if 'fanout' in p.stem:limits+=['Authored order did not override layout; explicit order semantics unresolved.']
 if p.stem=='19-depth-first':
  s.update(sample_rate_hz=48000);s['other']['audio_driver']='NonRealTime';s['other']['settings_context']='Same disposable Max process immediately after 18-dsp completed with DSP off.'
 if p.stem=='18-dsp':
  s.update(sample_rate_hz=48000,audio_enabled=True);s['other'].update(audio_driver='NonRealTime',audio_enabled='on during recording, off before buffer export',recording_frames=1920,storage='buffer~ float32, four channels',fresh_process_required=True);kind='audio_tolerance'
 paths=[f('fixtures/'+p.name,'patch'),f('fixtures/'+score.name,'operations'),f('fixtures/probe.js','dependency')]
 if p.stem=='15-scope':paths.append(f('fixtures/scoped-bus.maxpat','dependency'))
 if executed:paths+=[f('results/'+trace.name,'message_trace'),f('expected/'+p.stem+'.json','message_trace')]
 if p.stem=='18-dsp':paths += [f('dsp/max-reference.wav','audio'),f('dsp/max-samples.jsonl','audio'),f('dsp/analysis.json','notes')]
 paths.append(f('docs/semantic-gaps.md','notes'))
 capture=dt.datetime.fromtimestamp(rows[-1]['wall_ms']/1000,dt.timezone.utc).isoformat().replace('+00:00','Z') if rows else None
 m={'schema_version':1,'fixture_id':p.stem,'provenance':'MAX_REFERENCE_CAPTURE' if executed else 'SYNTHETIC_NOT_MAX_EXECUTED','max_executed':executed,'captured_at_utc':capture,'environment':env if executed else dict(env,runtime_host='none'),'settings':s,'initial_state':{'reset':'Freshly loaded self-created patch, original arguments and saved parameter attributes in the source patch. DSP probe must be the only open DSP patch in a fresh Max process.','score':'fixtures/'+score.name},'object_classes':classes(p),'files':paths,'procedure':'Open fixtures/'+p.name+' in a disposable copy with sibling probe.js and score JSON. The Max loadbang schedules the recorded score after 500 wall ms. See README for prefix isolation and reproduction. Do not change original projects/preferences.','comparison':{'kind':kind,'absolute_tolerance':1e-6 if kind=='audio_tolerance' else None,'relative_tolerance':None,'alignment':'DSP frame zero: first recorded frame at fresh DSP start, phase 0 cosine, ramp n/480; otherwise seq is collector arrival and wall_ms is UTC wall clock, not logical time.','limitations':limits},'redistribution':{'authorship':'Original fixtures and analysis authored for Alive local reference research; short official interface descriptions in objects.json cited separately.','permission':'Self-created fixtures/results for integration into venetanji/alive. No proprietary examples, executables, license material or bundled media included.','contains_proprietary_assets':False},'notes':['Reference-manifest schema from integration base aa13d68; paths relative to experiments/max-reference/, not the manifests/ subdirectory.','This manifest authenticates bytes and execution scope, not broad Max/MSP compatibility.']}
 (md/(p.stem+'.manifest.json')).write_text(json.dumps(m,indent=2)+'\n')
# Authored property-change inputs have no Max execution provenance.
for patch in sorted((ROOT/'format').glob('*.maxpat')):
 m=json.loads(json.dumps(m))
 m.update(fixture_id='format-'+patch.stem,provenance='SYNTHETIC_NOT_MAX_EXECUTED',max_executed=False,captured_at_utc=None)
 m['environment']={key:('none' if key=='runtime_host' else None) for key in env}
 m['settings']={key:None for key in ['sample_rate_hz','signal_vector_frames','io_vector_frames','overdrive','scheduler_in_audio_interrupt']}
 m['settings'].update(audio_enabled=False,transport={},other={},unknown_fields=['No runtime settings: authored structural input, not Max-saved or executed'])
 m['initial_state']={'authored_input':True};m['object_classes']=classes(patch)
 m['files']=[f(str(patch.relative_to(ROOT)),'patch'),f('format/observations.json','notes'),f('format/import-mapping.json','notes')]
 m['procedure']='Compare this original authored JSON to format/base.maxpat using format/observations.json. Not a Max-produced save; do not execute feedback or dependency inputs as behavioral tests.'
 m['comparison']={'kind':'inventory_only','absolute_tolerance':None,'relative_tolerance':None,'alignment':'JSON paths in original authored inputs','limitations':['No Max save/roundtrip observed','Not a runtime behavior test']}
 m['notes']=['Authored-input delta only. Max for Live snapshots and self-created AMXD remain deferred after editor launch stalled in the disposable session.']
 (md/('format-'+patch.stem+'.manifest.json')).write_text(json.dumps(m,indent=2)+'\n')

# Aggregate bundle index, separate from the per-run schema.
files=[{'path':str(p.relative_to(ROOT)),'sha256':digest(p),'bytes':p.stat().st_size} for p in sorted(ROOT.rglob('*')) if p.is_file() and p.name not in ['manifest.json','bundle-index.json'] and '__pycache__' not in p.parts]
index={'schema':'alive-max-reference-bundle-index-v1','reference_manifest_schema':'../max-subset/reference-manifest.schema.json','initial_start_commit':'9f9c225dfd6774342df21112ccd025197ee725a9','integration_base_commit':subprocess.check_output(['git','rev-parse','aa13d68'],cwd=ROOT,text=True).strip(),'work_branch':'research/max-reference-local-20261020','created_utc':'2026-10-20','environment':env,'message_settings':settings,'execution_status':{p.stem:j(p)['provenance'] for p in sorted(md.glob('*.manifest.json'))},'artifacts':files}
(ROOT/'bundle-index.json').write_text(json.dumps(index,indent=2)+'\n')
root_manifest=j(md/'00-environment.manifest.json');root_manifest['files'].append(f('bundle-index.json','notes'));root_manifest['notes'].append('Bundle entry point: environment probe manifest; per-experiment settings and statuses are in manifests/. bundle-index.json hashes every artifact except itself and this root manifest.');(ROOT/'manifest.json').write_text(json.dumps(root_manifest,indent=2)+'\n')
print('Built',len(list(md.glob('*.manifest.json'))),'reference manifests;',len(files),'hashed artifacts')
