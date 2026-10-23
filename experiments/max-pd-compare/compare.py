#!/usr/bin/env python3
"""Three hand-mapped synchronous message graphs, not a Max interpreter."""
import argparse, ctypes as C, json, re, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--reference-root',type=Path,required=True)
parser.add_argument('--libpd',type=Path,required=True)
args=parser.parse_args()
REF=args.reference_root.resolve()
LIB=args.libpd.resolve()
pd=C.CDLL(str(LIB)); P=C.c_void_p; S=C.c_char_p; I=C.c_int; F=C.c_float

def api(name,args,ret=I):
 f=getattr(pd,'libpd_'+name);f.argtypes=args;f.restype=ret;return f
init=api('init',[]);openfile=api('openfile',[S,S],P);close=api('closefile',[P],None)
bind=api('bind',[S],P);unbind=api('unbind',[P],None)
bang=api('bang',[S]);flt=api('float',[S,F]);symbol=api('symbol',[S,S])
start=api('start_message',[I]);addf=api('add_float',[F],None);adds=api('add_symbol',[S],None)
finishlist=api('finish_list',[S]);finishmsg=api('finish_message',[S,S])
isfloat=api('is_float',[P]);getfloat=api('get_float',[P],F);getsym=api('get_symbol',[P],S);nextatom=api('next_atom',[P],P)
rows=[];errors=[];op=None;hooks=[]
def emit(label,sel,atoms,types):rows.append(dict(operation=op,label=label.decode(),selector=sel,atoms=atoms,atom_types=types))
def atoms(n,p):
 vals=[];types=[]
 for _ in range(n):
  numeric=isfloat(p);vals.append(getfloat(p) if numeric else getsym(p).decode());types.append('float' if numeric else 'symbol');p=nextatom(p)
 return vals,types

def hook(name,args,fn):
 cb=C.CFUNCTYPE(None,*args)(fn);hooks.append(cb);api('set_'+name+'hook',[type(cb)],None)(cb)
hook('print',[S],lambda s: errors.append(dict(operation=op,text=s.decode())))
hook('bang',[S],lambda s:emit(s,'bang',[],[]))
hook('float',[S,F],lambda s,f:emit(s,'float',[f],['float']))
hook('symbol',[S,S],lambda s,v:emit(s,'symbol',[v.decode()],['symbol']))
hook('list',[S,I,P],lambda s,n,p:emit(s,'list',*atoms(n,p)))
hook('message',[S,S,I,P],lambda s,sel,n,p:emit(s,sel.decode(),*atoms(n,p)))
init()
# Explicit manually chosen nodes and graph wires. Inputs are bound receives;
# outputs are sends captured through libpd hooks. Max collector scaffolding omitted.
GRAPHS={
 '19-depth-first':(['r obj-2-0','t b b','t b b','s outer_left','s inner_left','s inner_right'],[(0,0,1,0),(1,1,2,0),(1,0,3,0),(2,0,4,0),(2,1,5,0)]),
 '03-hot-cold':(['r obj-2-0','r obj-2-1','+ 10','s plus','r obj-3-0','r obj-3-1','int 7','s int'],[(0,0,2,0),(1,0,2,1),(2,0,3,0),(4,0,6,0),(5,0,6,1),(6,0,7,0)]),
 '08-pack':(['r obj-2-0','r obj-2-1','r obj-2-2','pack f f s','s pack'],[(0,0,3,0),(1,0,3,1),(2,0,3,2),(3,0,4,0)])}

# Strictly only the literal input language present in these three scores.
# Not a Max message-box parser: no escaping, substitution, comma/semicolon, etc.
def send(e):
 if not re.fullmatch(r'(bang|[-+]?\d+(?:\.\d*)?|symbol pear|set 11|list 8 9\.|list 1 2\. peach extra)', e['message']):
  raise ValueError('unsupported input syntax')
 dest=f"{e['destination']}-{e['inlet']}".encode();parts=e['message'].split()
 if parts==['bang']:return bang(dest)
 if parts[0]=='symbol':return symbol(dest,parts[1].encode())
 try:
  if len(parts)==1:return flt(dest,float(parts[0]))
 except ValueError:pass
 selector=parts[0];values=parts[1:];start(len(values))
 for v in values:
  try:addf(float(v))
  except ValueError:adds(v.encode())
 return finishlist(dest) if selector=='list' else finishmsg(dest,selector.encode())

report={'scope':'actual libpd; three complete supplied scores; synchronous DSP-off messages only','libpd_sha256':hashlib.sha256(LIB.read_bytes()).hexdigest(),'fixtures':{}}
for name,(nodes,wires) in GRAPHS.items():
 score=json.loads((REF/'fixtures'/f'{name}.score.json').read_text());expected=json.loads((REF/'expected'/f'{name}.json').read_text())
 patch='#N canvas 0 0 600 400 10;\n'+''.join(f'#X obj 20 {20+i*25} {text};\n' for i,text in enumerate(nodes))+''.join(f'#X connect {a} {b} {c} {d};\n' for a,b,c,d in wires)
 (ROOT/f'{name}.pd').write_text(patch)
 rows.clear();errors.clear();op=None;bindings=[bind(s.encode()) for s in score['labels']];handle=openfile(f'{name}.pd'.encode(),str(ROOT).encode())
 if not handle:raise RuntimeError('Pd patch failed to open')
 for e in score['events']:
  if e.get('wait_ms',0)!=0:raise ValueError('asynchronous score unsupported')
  op=e['id'];rc=send(e)
  if rc!=0:raise RuntimeError(f'Pd input dispatch failed: {rc}')
 got=list(rows);err=list(errors);close(handle)
 for b in bindings:unbind(b)
 maxrows=[];operation=None
 for e in expected['events']:
  if e['selector']=='stimulus':operation=e['atoms'][0]
  elif not e['label'].startswith('$'):maxrows.append(dict(operation=operation,label=e['label'],selector=e['selector'],atoms=e['atoms'],atom_types=([e['selector']] if e['selector'] in ('int','float') else [('unknown_numeric' if isinstance(x,(int,float)) else 'symbol') for x in e['atoms']])))
 comparisons=[]
 for i in range(max(len(got),len(maxrows))):
  a=maxrows[i] if i<len(maxrows) else None;b=got[i] if i<len(got) else None
  comparisons.append(dict(index=i,max=a,pd=b,exact_observable_equal=(None if a and b and 'unknown_numeric' in a['atom_types'] and all(a[k]==b[k] for k in ['operation','label','selector','atoms']) else a==b),ordered_value_equal=bool(a and b and all(a[k]==b[k] for k in ['operation','label','atoms']))))
 report['fixtures'][name]=dict(score_events=len(score['events']),max_output_count=len(maxrows),pd_output_count=len(got),outputs=got,pd_diagnostics=err,comparisons=comparisons)
(ROOT/'results.json').write_text(json.dumps(report,indent=2)+'\n')
for name,r in report['fixtures'].items():
 print(name, 'outputs',r['pd_output_count'],'exact',sum(c['exact_observable_equal'] is True for c in r['comparisons']),'ordered_values',sum(c['ordered_value_equal'] for c in r['comparisons']))
 for c in r['comparisons']:
  if not c['exact_observable_equal']:print(json.dumps(c))
 print('diagnostics:',r['pd_diagnostics'])
