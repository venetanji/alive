#!/usr/bin/env python3
"""Convert Max-exported float32 buffer samples to WAV and measure bounded checks."""
import hashlib,json,math,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];D=ROOT/'dsp'
r=[json.loads(x) for x in (D/'max-samples.jsonl').read_text().splitlines()]
assert len(r)==1920 and [x['frame'] for x in r]==list(range(1920))
assert all(len(x['samples'])==4 and all(math.isfinite(v) for v in x['samples']) for x in r)
cs=list(zip(*(x['samples'] for x in r)))
errors=[max(abs(x-math.cos(2*math.pi*(1000*n/48000+phase))) for n,x in enumerate(cs[k])) for k,phase in [(0,0),(1,.25)]]
ramp=max(abs(x-min(n/480,1)) for n,x in enumerate(cs[2]));product=max(abs(x-cs[0][n]*cs[2][n]*.25) for n,x in enumerate(cs[3]))
assert max(errors)<1e-6 and ramp<1e-6 and product<1e-6,(errors,ramp,product)
raw=b''.join(struct.pack('<4f',*x['samples']) for x in r);fmt=struct.pack('<HHIIHH',3,4,48000,48000*16,16,32)
(D/'max-reference.wav').write_bytes(b'RIFF'+struct.pack('<I',4+8+len(fmt)+8+len(raw))+b'WAVEfmt '+struct.pack('<I',len(fmt))+fmt+b'data'+struct.pack('<I',len(raw))+raw)
repeat=D/'max-samples-run1.jsonl';identical=repeat.read_bytes()==(D/'max-samples.jsonl').read_bytes() if repeat.exists() else None
report={'frames':len(r),'sample_rate':48000,'encoding':'IEEE float32 WAV; Max buffer~ storage, not full internal DSP precision','channels':['cosine_1000Hz_phase0','cosine_1000Hz_phase0.25','line_0_to_1_10ms','cosine_times_envelope_times_0.25'],'max_absolute_errors':{'oscillator_vs_analytic_cosine':errors,'envelope_vs_min_n_over_480':ramp,'product_vs_recorded_factors':product},'two_fresh_process_captures_identical':identical,'captured_sample_sha256':hashlib.sha256(raw).hexdigest(),'tolerances':{'same_score_phase_aligned_analytic_absolute':1e-6,'faust_initial_phase_alignment':'required; phase 0 here is cosine','faust_waveform_initial_absolute':0.0001,'faust_ramp_alignment_samples':1,'message_to_dsp_event_alignment':'up to a signal vector when scheduler settings differ; report offset, do not hide it'},'caution':'Proposed Faust tolerance is an integration starting point, not a validated cross-engine guarantee. No hardware output, gain~ taper or real-time reset equivalence tested.'}
(D/'analysis.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
