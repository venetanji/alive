#!/usr/bin/env python3
"""Each case is a fresh process: Clockwork's embed_close is not guest teardown."""
import os, pathlib, subprocess
root=pathlib.Path(__file__).resolve().parent
exe=pathlib.Path(os.environ.get("PROBE",str(root/"build/probe")))
cases=[]
for block in [1,31,32,63,64,127,128,256]:
    cases += [('reference',block,0),('reference',block,256),('timing',block,0)]
for block in [32,64,128,256]:
    cases += [('input',block,0),('input',block,block),('input',block,32)]
cases += [('immediate',0),('immediate',1),('late',),('held',),('isolation',6),('isolation',8),('lifecycle',),
          ('unsupported',512),('unsupported',0),('ring',0),('ring',1),
          ('store',0),('store',1),('guest',)]
for args in cases:
    cmd=[str(exe),*map(str,args)]
    print('$',' '.join(cmd),flush=True)
    subprocess.run(cmd,check=True)
print(f'PASS {len(cases)} fresh-process cases; known limitations are asserted diagnostics, not production guarantees')
