#!/usr/bin/env python3
"""Run real loader and fail if the probe can pass with a missing dependency."""
import csv, hashlib, json, pathlib, shutil, subprocess, platform
root=pathlib.Path(__file__).resolve().parent
build=root/'build'
checks=['exact_b_lifecycle_isolation','same_dsp_tick_exact','instance_and_reset','stopped_replacement','typed_dispatch_order','subtick_ceil','capacity_fail_closed','tick_budget_fail_closed','invalid_fail_closed','same_frame_stable_order']
def run(path):
 return subprocess.run([str(build/'probe'),str(path)],cwd=root,text=True,capture_output=True)
r=run(root)
(build/'test.log').write_text(r.stdout);(build/'runtime.log').write_text(r.stderr)
assert r.returncode==0,r.stdout+r.stderr
assert all('PASS '+c+'\n' in r.stdout for c in checks)
# Save baseline before negative controls, which can reach the trace/audio writers.
timing=(build/'timing.csv').read_bytes()
audio=(build/'audio.csv').read_bytes();trace=(build/'dispatch-trace.txt').read_bytes()
negative=[]
for filename in ['alivevoice~.pd_linux','cyclone/clip~.pd_linux','cyclone/gate.pd_linux','cyclone/split.pd_linux']:
 case=build/'negative'/filename.replace('/','_')
 (case/'build').mkdir(parents=True,exist_ok=True)
 shutil.copyfile(root/'voice.pd',case/'voice.pd')
 shutil.copytree(build/'externals',case/'build/externals',dirs_exist_ok=True)
 (case/'build/externals'/filename).unlink()
 n=run(case)
 (case/'test.log').write_text(n.stdout+n.stderr)
 assert n.returncode!=0, f'Probe falsely passes without {filename}'
 assert "couldn't create" in n.stderr, n.stderr
 negative.append({'removed_external':filename,'expected_failure':True,'last_line':(n.stdout+n.stderr).splitlines()[-1]})
(build/'timing.csv').write_bytes(timing)
(build/'audio.csv').write_bytes(audio);(build/'dispatch-trace.txt').write_bytes(trace)
rows=list(csv.DictReader(audio.decode().splitlines()))
error=max(abs(float(x['oracle'])-float(x['hosted'])) for x in rows)
assert len(rows)==1536 and error==0
result={'schema_version':1,'status':'pass','profile':'libpd-0.56.5-cyclone-0.9.4-faust-2.88.0','sample_rate':48000,'tick_frames':64,'channels':3,'oracle_frames':1536,'max_abs_error':error,'comparison':'same generated Faust voice, same host, aligned tick controls; bit-exact float comparison in C++','checks':[{'id':x,'status':'pass'} for x in checks],'negative_controls':negative,'dispatch_trace':trace.decode().splitlines(),'timing_cases':list(csv.DictReader(timing.decode().splitlines())),'audio_csv_sha256':hashlib.sha256(audio).hexdigest(),'platform':platform.platform(),'compiler':subprocess.check_output(['c++','--version'],text=True).splitlines()[0],'max_reference_status':'not supplied; no Max equivalence claimed','realtime_status':'not qualified; offline only; arbitrary Pd patch execution is not bounded','product_license':'undecided'}
(build/'results.json').write_text(json.dumps(result,indent=2)+'\n')
print(r.stdout,end='');print('PASS four missing-external negative controls');print('Wrote build/results.json and build/audio.csv')
