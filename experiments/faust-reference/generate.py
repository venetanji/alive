#!/usr/bin/env python3
"""Use the official pinned libfaust C compiler API; no JIT in render process."""
import argparse
import ctypes
from pathlib import Path
parser = argparse.ArgumentParser()
parser.add_argument('--language', choices=['cpp', 'rust'], default='cpp')
language = parser.parse_args().language
root = Path(__file__).resolve().parent
lib = ctypes.CDLL(str(root / '.deps/lib/libfaust.so'))
f = lib.generateCAuxFilesFromFile
f.argtypes = [ctypes.c_char_p, ctypes.c_int, ctypes.POINTER(ctypes.c_char_p), ctypes.c_char_p]
f.restype = ctypes.c_bool
extension = 'hpp' if language == 'cpp' else 'rs'
args = ['-lang', language, '-cn', 'ReferenceVoice', '-I', str(root / '.deps/faust-2.88.0/libraries'), '-o', str(root / ('generated/voice.' + extension))]
(root / 'generated').mkdir(exist_ok=True)
a = (ctypes.c_char_p * len(args))(*(x.encode() for x in args))
error = ctypes.create_string_buffer(4096)
if not f(str(root / 'voice.dsp').encode(), len(args), a, error):
    raise SystemExit(error.value.decode())
# Normalize only trailing horizontal whitespace; preserve generated semantics.
output = root / ('generated/voice.' + extension)
output.write_text('\n'.join(line.rstrip(' \t') for line in output.read_text().split('\n')))
print(f'Faust C API generated {language} voice successfully')
