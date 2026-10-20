#!/usr/bin/env python3
"""Freeze observed messages separately from their wall-clock timestamps."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
for p in sorted((ROOT/'results').glob('*.jsonl')):
 rows=[json.loads(line) for line in p.read_text().splitlines()]
 # Keep stimuli and initialization: absence of output after a cold stimulus matters.
 normalized=[{k:v for k,v in row.items() if k!='wall_ms'} for row in rows]
 score=json.loads((ROOT/'fixtures'/(p.stem+'.score.json')).read_text())
 patch=json.loads((ROOT/'fixtures'/(p.stem+'.maxpat')).read_text())['patcher']
 sources={line['patchline']['destination'][1]:line['patchline']['source'] for line in patch['lines'] if line['patchline']['destination'][0]=='logger'}
 annotations=[];operation='$initialization'
 for row in rows:
  if row['label']=='$input':operation=row['atoms'][0]
  source=None
  if row['label'] in score['labels']:source=sources.get(score['labels'].index(row['label']))
  atom_types=[('int' if row['selector']=='int' else 'float') if row['selector'] in ['int','float'] else ('symbol' if isinstance(atom,str) else 'unknown_numeric') for atom in row['atoms']]
  annotations.append({'seq':row['seq'],'operation_id':operation,'source_object_outlet':source,'atom_types':atom_types,'order_domain':'Max JS collector arrival, not scheduler thread timestamp'})
 status='observed-baseline'
 limits=[]
 if p.stem=='14-scheduler':
  status='observed-one-run-not-exact-timing-or-tick-count-oracle';limits=['JS collector arrival order; wall time and metro tick count vary']
 if p.stem=='15-scope':limits=['relative ordering of multiple receivers is explicitly not guaranteed']
 if 'fanout' in p.stem:
  limits=['Authored patchline order disagreed with observed layout order; explicit cord-order semantics remain unresolved. This is an observation, not a portable ordering contract.']
 (ROOT/'expected'/(p.stem+'.json')).write_text(json.dumps({'fixture':p.stem,'status':status,'origin':'executed-Max-9.1.5-Wine-11.13','limitations':limits,'events':normalized,'event_annotations':annotations},indent=2)+'\n')
print('Normalized',len(list((ROOT/'expected').glob('*.json'))),'observed traces')
