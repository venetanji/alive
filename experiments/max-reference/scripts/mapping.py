#!/usr/bin/env python3
"""Record JSON-path deltas in our own authored files, without treating them as Max saves."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def diffs(a,b,path='$'):
 if type(a)!=type(b):return [{'path':path,'before':a,'after':b}]
 if isinstance(a,dict):
  out=[]
  for k in sorted(a.keys()|b.keys()):
   p=path+'['+json.dumps(k)+']'
   if k not in a:out.append({'path':p,'after':b[k],'before_absent':True})
   elif k not in b:out.append({'path':p,'before':a[k],'after_absent':True})
   else:out+=diffs(a[k],b[k],p)
  return out
 if isinstance(a,list):
  if len(a)!=len(b):return [{'path':path,'before':a,'after':b}]
  return sum((diffs(x,y,path+'['+str(i)+']') for i,(x,y) in enumerate(zip(a,b))),[])
 return [] if a==b else [{'path':path,'before':a,'after':b}]
base=json.loads((ROOT/'format/base.maxpat').read_text())
observations=[]
for p in sorted((ROOT/'format').glob('*.maxpat')):
 if p.stem=='base':continue
 observations.append({'fixture':str(p.relative_to(ROOT)),'status':'authored-input-not-Max-saved','delta':diffs(base,json.loads(p.read_text()))})
(ROOT/'format/observations.json').write_text(json.dumps({'scope':'Observed structure of our self-created JSON inputs. Max-saved pairs are separately identified when available.','observations':observations},indent=2)+'\n')
