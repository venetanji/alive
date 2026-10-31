#!/usr/bin/env python3
"""Generate the three authored voice primitives with pinned Faust 2.88.0.

Generation is an offline build operation. The signal-input-only kernels require
no UI discovery, dynamic compilation or shared oscillator table during rendering.
"""
import ctypes
from pathlib import Path

root = Path(__file__).resolve().parent
reference = root.parents[2] / "experiments/faust-reference"
library = ctypes.CDLL(str(reference / ".deps/lib/libfaust.so"))
generate = library.generateCAuxFilesFromFile
generate.argtypes = [ctypes.c_char_p, ctypes.c_int,
                    ctypes.POINTER(ctypes.c_char_p), ctypes.c_char_p]
generate.restype = ctypes.c_bool
for name, classname in (("saw", "UltraSawKernel"),
                        ("filter", "UltraFilterKernel"),
                        ("adsr", "UltraAdsrKernel")):
    output = root / "generated" / f"voice_{name}.hpp"
    arguments = ["-lang", "cpp", "-cn", classname,
                 "-I", str(reference / ".deps/faust-2.88.0/libraries"),
                 "-o", str(output)]
    argv = (ctypes.c_char_p * len(arguments))(*(arg.encode() for arg in arguments))
    error = ctypes.create_string_buffer(4096)
    if not generate(str(root / f"voice_{name}.dsp").encode(), len(arguments), argv, error):
        raise SystemExit(error.value.decode())
    text = output.read_text()
    if "Code generated with Faust 2.88.0" not in text:
        raise SystemExit("Authored voice primitives require pinned Faust 2.88.0")
    output.write_text("\n".join(line.rstrip(" \t") for line in text.split("\n")))
    print(f"Faust 2.88.0 generated {output.relative_to(root)}")
