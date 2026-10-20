#!/usr/bin/env python3
"""Explicit JACK ABI test double. NOT real JACK, hardware, concurrency or deadline evidence."""
import array, math, os, pathlib, subprocess, tempfile
root=pathlib.Path(__file__).resolve().parents[1]
include=os.environ.get('JACK_INCLUDE','/usr/include')
if not pathlib.Path(include,'jack/jack.h').exists():raise SystemExit('Set JACK_INCLUDE to official JACK2 1.9.22 headers (parent directory of jack/). App itself needs no JACK headers.')
with tempfile.TemporaryDirectory(prefix='ultra-test-double-') as d:
 p=pathlib.Path(d)
 subprocess.run(['c++','-shared','-fPIC','-I'+include,str(root/'tests/fake_jack.cpp'),'-o',str(p/'libjack.so.0')],check=True)
 def run(extra,code):
  env=os.environ.copy();env.update(LD_LIBRARY_PATH=d,FAKE_CAPTURE=str(p/'capture.f32'));env.update(extra)
  result=subprocess.run([str(root/'build/ultra-diagnostic'),'--run-seconds','1'],env=env,capture_output=True,text=True)
  assert result.returncode==code,(result.returncode,result.stdout,result.stderr)
  return result
 normal=run({},0)
 a=array.array('f');a.frombytes((p/'capture.f32').read_bytes());assert len(a)==4096 and all(math.isfinite(x) for x in a)
 left,right=a[::2],a[1::2]
 assert next(i for i,x in enumerate(left) if x)==64
 assert next(i for i,x in enumerate(right) if x)==95
 assert max(i for i,x in enumerate(left) if x)==590
 assert max(i for i,x in enumerate(right) if x)==846
 assert all(x==0 for x in left[600:]) and any(x!=0 for x in right[600:750])
 assert all(x==0 for x in right[900:])
 overloaded=run({'FAKE_OVERLOAD':'1'},1);assert 'flags=7' in overloaded.stdout
 a=array.array('f');a.frombytes((p/'capture.f32').read_bytes());assert all(x==0 for x in a[1024:])
 run({'FAKE_RATE':'44100'},2);run({'FAKE_PERIOD':'2048'},2)
 print('PASS: explicit fake-JACK adapter tests (NOT real JACK/hardware execution)')
