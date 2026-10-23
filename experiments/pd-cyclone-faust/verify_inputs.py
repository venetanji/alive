#!/usr/bin/env python3
"""Verify pinned reused inputs, then regenerate the same DSP into this experiment only."""
import ctypes, hashlib, json
from pathlib import Path
root=Path(__file__).resolve().parent
manifest=json.loads((root/'dependencies.json').read_text())
for item in manifest['verified_files']:
 p=root/item['path']; actual=hashlib.sha256(p.read_bytes()).hexdigest()
 if actual!=item['sha256']:raise SystemExit(f'Pinned input changed: {item["path"]}')
froot=root/'../faust-reference'
lib=ctypes.CDLL(str(froot/'.deps/lib/libfaust.so'))
f=lib.generateCAuxFilesFromFile
f.argtypes=[ctypes.c_char_p,ctypes.c_int,ctypes.POINTER(ctypes.c_char_p),ctypes.c_char_p];f.restype=ctypes.c_bool
out=root/'build/regenerated-voice.hpp'
args=['-lang','cpp','-cn','ReferenceVoice','-I',str(froot/'.deps/faust-2.88.0/libraries'),'-o',str(out)]
a=(ctypes.c_char_p*len(args))(*(x.encode() for x in args));err=ctypes.create_string_buffer(4096)
if not f(str(froot/'voice.dsp').encode(),len(args),a,err):raise SystemExit(err.value.decode())
out.write_text('\n'.join(x.rstrip(' \t') for x in out.read_text().split('\n')))
if out.read_bytes()!=(froot/'generated/voice.hpp').read_bytes():raise SystemExit('Faust regeneration differs from oracle header')
print('PASS pinned inputs and regenerated Faust header')
