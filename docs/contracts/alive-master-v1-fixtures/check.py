#!/usr/bin/env python3
"""Check fixture identities and raw structure, not the application decoder."""
import hashlib, json
from pathlib import Path
D = Path(__file__).resolve().parent
class Pairs(list): pass
def raw(name): return (D/name).read_text()
def parse(s): return json.loads(s, object_pairs_hook=Pairs, parse_constant=lambda x: (_ for _ in ()).throw(ValueError(x)))
def materialize(x, path=(), duplicates=None):
    if duplicates is None: duplicates=[]
    if isinstance(x, Pairs):
        out={}
        for k,v in x:
            value=materialize(v,path+(k,),duplicates)
            if k in out: duplicates.append((path,k))
            else: out[k]=value
        return out
    if isinstance(x,list): return [materialize(v,path+(i,),duplicates) for i,v in enumerate(x)]
    return x
def load(name):
    duplicates=[]; value=materialize(parse(raw(name)),duplicates=duplicates)
    return value,duplicates
def clean(name):
    v,dups=load(name); assert not dups,(name,dups); return v
def env(score,gain=1): return {'format':'alive-session-v5','score':score,'master':{'gain':gain}}
def same(a,b):
    if isinstance(a,bool) or isinstance(b,bool): return type(a) is type(b) and a==b
    if isinstance(a,(int,float)) and isinstance(b,(int,float)): return a==b
    if type(a) is not type(b): return False
    if isinstance(a,dict): return a.keys()==b.keys() and all(same(a[k],b[k]) for k in a)
    if isinstance(a,list): return len(a)==len(b) and all(same(x,y) for x,y in zip(a,b))
    return a==b
legacy={v:clean(f'legacy-{v}.json') for v in ('v1','v2','v3','v4')}
for v,score in legacy.items(): assert score['format']=='alive-session-'+v
for v in ('v2','v3','v4'): assert same(clean(f'v5-{v}.json'),env(legacy[v]))
for g in (0,0.5,1,4): assert same(clean(f'gain-{g}.json'),env(legacy['v3'],g))
eight=clean('v5-v3-eight.json'); assert eight['format']=='alive-session-v5' and same(eight['master'],{'gain':1})
t=eight['score']['tracks']; assert len(t)==8
for vals in ([x['id'] for x in t], [d['instanceId'] for x in t for d in [x['device'],*x['effects']]], [c['id'] for x in t for c in x['slots'] if c], [n['id'] for x in t for c in x['slots'] if c for n in c['notes']]): assert len(vals)==len(set(vals))
for x in t:
    ids={d['instanceId'] for d in [x['device'],*x['effects']]}
    assert x['defaultClipId'] is None or x['defaultClipId'] in {c['id'] for c in x['slots'] if c}
    for c in (c for c in x['slots'] if c):
        assert all(l['instanceId'] in ids for l in c['automation'])
        assert all(0<=n['beat'] and n['duration']>0 and n['beat']+n['duration']<=c['lengthBeats']+1e-10 for n in c['notes'])
# Dependencies and canonical source fingerprints, as used by prepare::fingerprint.
def refs(x):
    if isinstance(x,dict):
        if 'sourceSha256' in x and 'path' in x: yield x
        for y in x.values(): yield from refs(y)
    elif isinstance(x,list):
        for y in x: yield from refs(y)
for score in [legacy['v2'],legacy['v3'],legacy['v4'],eight['score']]:
    for ref in refs(score):
        p=(D/ref['path']).resolve(); assert p.is_file(),p
        content=json.loads(p.read_text()); digest=hashlib.sha256(json.dumps(content,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
        assert digest==ref['sourceSha256'],(p,digest,ref['sourceSha256'])
# Assert exact duplicate path and key, then compare first-member projection to valid base.
dupcases={'invalid-duplicate-outer.json':((), 'format','v3'), 'invalid-duplicate-outer-master.json':((), 'master','v3'), 'invalid-duplicate-master.json':(('master',),'gain','v3'), 'invalid-duplicate-score.json':(('score',),'format','v3')}
for ver,path in [('v2',('score','tracks',0,'device','parameters')),('v3',('score','tracks',0,'device','parameters')),('v4',('score','tracks',0,'chain','instrument','parameters'))]: dupcases[f'invalid-duplicate-parameter-{ver}.json']=(path,'attack',ver)
for name,(path,key,ver) in dupcases.items():
    v,duplicates=load(name); assert duplicates==[(path,key)],(name,duplicates); assert same(v,env(legacy[ver])),name
    if 'parameter' in name: assert '\\u0061ttack' in raw(name) and '"attack"' in raw(name)
for name,master in [('missing',{}),('unknown',{'gain':1,'extra':0}),('string',{'gain':'1'}),('negative',{'gain':-1}),('over',{'gain':4.1})]: assert same(clean(f'invalid-{name}.json'),{'format':'alive-session-v5','score':legacy['v3'],'master':master})
assert same(clean('invalid-nested-v1.json'),env(legacy['v1']))
assert same(clean('invalid-nested-v5.json'),env(env(legacy['v3'])))
for name in ('malformed','trailing','nonfinite'):
    try: parse(raw(f'invalid-{name}.json'))
    except ValueError: pass
    else: raise AssertionError(name)
compact=json.dumps(env(legacy['v3']),separators=(',',':'))
assert raw('invalid-malformed.json')==compact[:-1]+'\n'
assert raw('invalid-trailing.json')==compact+' {}\n'
assert raw('invalid-nonfinite.json').replace('NaN','1') == compact+'\n'
assert same(clean('ipc-request-gain.json'),{'generation':3,'gain':0.5})
assert same(clean('ipc-request-reset.json'),{'generation':3})
assert same(clean('ipc-success-gain.json'),{'generation':3,'acceptedGain':0.5,'acceptedSerial':'7','changed':True})
assert same(clean('ipc-success-reset.json'),{'generation':3,'acceptedSerial':'8'})
assert same(clean('ipc-error.json'),{'code':'FULL','message':'Master queue is full; retry.'})
assert same(clean('ipc-snapshot.json'),{'master':{'gain':0.5,'acceptedSerial':'7','available':True,'unavailableReason':None,'observation':{'targetGain':0.5,'currentGain':0.75,'peakLeft':0.2,'peakRight':0.3,'clipMask':0,'appliedSerial':'7','appliedFrame':'100','observationStartFrame':'100','observationEndFrame':'164'},'observationStale':False}})
b=raw('v5-v3.json').rstrip().encode()
for size in (1048576,1048577):
    content=b+b' '*(size-len(b)); assert len(content)==size and same(materialize(parse(content.decode())),env(legacy['v3']))
print('fixture identities, exact duplicate paths, dependencies and boundaries verified; application decoder not invoked')
