#!/usr/bin/env python3
"""Read-only structural, evidence-integrity and semantic regression checks."""
import argparse,hashlib,json,math,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(p):
 def pairs(xs):
  d={}
  for k,v in xs:
   assert k not in d,(str(p),'duplicate key',k)
   d[k]=v
  return d
 return json.loads(p.read_text(),object_pairs_hook=pairs,parse_constant=lambda x:(_ for _ in ()).throw(ValueError(x)))
def graph(g):
 boxes={b['box']['id']:b['box'] for b in g['boxes']};assert len(boxes)==len(g['boxes'])
 for line in g['lines']:
  for end in ['source','destination']:
   bid,port=line['patchline'][end];assert bid in boxes and type(port)==int and port>=0
  assert 'order' not in line['patchline'] or type(line['patchline']['order'])==int
 for box in boxes.values():
  if 'patcher' in box:graph(box['patcher'])
def observed(name):return [x for x in traces[name] if not x['label'].startswith('$')]
def tuples(name):return [(x['label'],x['selector'],x['atoms']) for x in observed(name)]
patches=list(ROOT.rglob('*.maxpat'))
for p in patches:graph(load(p)['patcher'])
traces={}
for p in (ROOT/'results').glob('*.jsonl'):
 rows=[json.loads(x) for x in p.read_text().splitlines()];traces[p.stem]=rows
 assert [x['seq'] for x in rows]==list(range(1,len(rows)+1)),p
 score=load(ROOT/'fixtures'/(p.stem+'.score.json'))
 assert rows[-1]['selector']=='complete' and rows[-1]['atoms']==[len(score['events'])],p
 assert [x['atoms'][0] for x in rows if x['selector']=='stimulus' and x['label']=='$input']==[x['id'] for x in score['events']],p
 expected=load(ROOT/'expected'/(p.stem+'.json'))
 assert expected['events']==[{k:v for k,v in x.items() if k!='wall_ms'} for x in rows],p
 annotations=expected['event_annotations'];assert len(annotations)==len(rows),p
 edges=[line['patchline'] for line in load(ROOT/'fixtures'/(p.stem+'.maxpat'))['patcher']['lines']]
 latest_input=None
 for row,annotation in zip(rows,annotations):
  if row['label']=='$input':latest_input=row['atoms'][0]
  assert annotation['seq']==row['seq'] and 'operation_id' not in annotation,(p,row['seq'],'annotation sequence/context')
  assert annotation['latest_input_id']==latest_input,(p,row['seq'],'latest input is context only')
  assert annotation['causal_input_id'] is None and annotation['causality']=='not_measured',(p,row['seq'],'unmeasured causality')
  labelled=row['label'] in score['labels']
  destination=['logger',score['labels'].index(row['label'])] if labelled else None
  candidates={tuple(edge['source']) for edge in edges if edge['destination']==destination}
  recorded=annotation['source_object_outlet_candidates']
  assert len(recorded)==len(candidates) and {tuple(source) for source in recorded}==candidates,(p,row['seq'],'all candidate sources required')
  resolution='not_applicable' if not labelled else ('unique_patchline' if len(candidates)==1 else ('ambiguous' if candidates else 'unresolved'))
  assert annotation['source_resolution']==resolution,(p,row['seq'],'source ambiguity')
  source=list(next(iter(candidates))) if len(candidates)==1 else None
  assert annotation['source_object_outlet']==source,(p,row['seq'],'unique source only')
assert [x['label'] for x in observed('01-trigger')]==['right','middle','left']
assert [x['label'] for x in observed('19-depth-first')]==['inner_right','inner_left','outer_left']
assert tuples('03-hot-cold')==[('plus','int',[12]),('plus','int',[102]),('plus','int',[105]),('int','int',[9]),('int','int',[11])]
assert tuples('08-pack')[0]==('pack','list',[0,0,'s'])
assert all(x['selector']=='float' for x in observed('05-float'))
assert all(x['selector']=='int' for x in observed('04-int'))
assert [x['label'] for x in observed('13-initialization')]==['parameter','child_loadbang','root_loadbang','parameter']
assert [x['atoms'] for x in observed('15-scope') if x['label'].startswith('instance_')]==[[7],[8]]
frames=[json.loads(x) for x in (ROOT/'dsp/max-samples.jsonl').read_text().splitlines()]
assert len(frames)==1920 and [x['frame'] for x in frames]==list(range(1920))
assert (ROOT/'dsp/max-samples-run1.jsonl').read_bytes()==(ROOT/'dsp/max-samples.jsonl').read_bytes()
for n,row in enumerate(frames):
 a,b,e,y=row['samples'];assert all(math.isfinite(x) for x in [a,b,e,y])
 assert abs(a-math.cos(2*math.pi*n/48))<1e-6
 assert abs(b-math.cos(2*math.pi*(n/48+.25)))<1e-6
 assert abs(e-min(n/480,1))<1e-6 and abs(y-a*e*.25)<1e-6
wav=(ROOT/'dsp/max-reference.wav').read_bytes();assert wav[:4]==b'RIFF' and wav[8:12]==b'WAVE'
assert len(wav)==44+1920*4*4
assert wav[44:]==b''.join(struct.pack('<4f',*r['samples']) for r in frames)
manifests=[ROOT/'manifest.json',*sorted((ROOT/'manifests').glob('*.manifest.json'))]
for p in manifests:
 m=load(p)
 for item in m['files']:
  q=ROOT/item['path'];assert q.is_file() and hashlib.sha256(q.read_bytes()).hexdigest()==item['sha256'],(p,item['path'])
index=load(ROOT/'bundle-index.json')
for item in index['artifacts']:
 p=ROOT/item['path'];assert p.is_file() and p.stat().st_size==item['bytes'] and hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256'],item['path']
ap=argparse.ArgumentParser();ap.add_argument('--schema',type=Path,default=ROOT.parent/'max-subset/reference-manifest.schema.json');args=ap.parse_args()
try:
 from jsonschema import Draft202012Validator,FormatChecker
except ImportError:raise SystemExit('jsonschema is required for the handoff-schema check; use uv run --no-project --with jsonschema scripts/verify.py')
v=Draft202012Validator(load(args.schema),format_checker=FormatChecker())
for p in manifests:v.validate(load(p))
print(json.dumps({'status':'verified','patch_graphs':len(patches),'complete_Max_traces':len(traces),'schema_valid_manifests':len(manifests),'hashed_artifacts':len(index['artifacts']),'dsp_frames':len(frames),'dsp_fresh_process_repeat_identical':True}))
