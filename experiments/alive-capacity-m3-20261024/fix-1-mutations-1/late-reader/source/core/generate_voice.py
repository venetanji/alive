#!/usr/bin/env python3
"""Regenerate only the app voice with the repository's pinned Faust 2.88.0.

Run from any directory: python3 apps/ultra/core/generate_voice.py
Uses the same official C compiler API and flags as the frozen reference fixture.
The compiler is an offline build dependency, never part of the audio callback.
"""
import ctypes
from pathlib import Path

root = Path(__file__).resolve().parent
reference = root.parents[2] / "experiments/faust-reference"
library = ctypes.CDLL(str(reference / ".deps/lib/libfaust.so"))
generate = library.generateCAuxFilesFromFile
generate.argtypes = [
    ctypes.c_char_p, ctypes.c_int,
    ctypes.POINTER(ctypes.c_char_p), ctypes.c_char_p,
]
generate.restype = ctypes.c_bool
output = root / "generated/app_voice.hpp"
output.parent.mkdir(exist_ok=True)
arguments = [
    "-lang", "cpp", "-cn", "UltraAppVoice",
    "-I", str(reference / ".deps/faust-2.88.0/libraries"),
    "-o", str(output),
]
argv = (ctypes.c_char_p * len(arguments))(*(arg.encode() for arg in arguments))
error = ctypes.create_string_buffer(4096)
if not generate(str(root / "voice.dsp").encode(), len(arguments), argv, error):
    raise SystemExit(error.value.decode())
text = output.read_text()
if "Code generated with Faust 2.88.0" not in text:
    raise SystemExit("Unexpected compiler version; generated app voice must use Faust 2.88.0")
output.write_text("\n".join(line.rstrip(" \t") for line in text.split("\n")))
print("Faust 2.88.0 generated apps/ultra/core/generated/app_voice.hpp")
