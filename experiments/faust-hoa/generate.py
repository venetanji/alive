#!/usr/bin/env python3
"""Offline, pinned Faust compiler API. Never download or install anything."""
import argparse
import ctypes
import hashlib
from pathlib import Path
import tempfile

ROOT = Path(__file__).resolve().parent
REFERENCE = ROOT.parent / "faust-reference"
FAUST = REFERENCE / ".deps/faust-2.88.0"
CASES = {
    "hoa2d": "Hoa2D",
    "hoa3d": "Hoa3D",
    "hoa3d_ambix": "Hoa3DAmbix",
    "chain2d": "Chain2D",
    "optim3d": "Optim3D",
}


def verify_dependencies():
    for line in (ROOT / "dependencies.sha256").read_text().splitlines():
        digest, name = line.split("  ", 1)
        path = REFERENCE / name
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != digest:
            raise SystemExit(f"Pinned dependency changed: {name}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true",
                        help="Verify generated C++ matches, without modifying it")
    args = parser.parse_args()
    verify_dependencies()
    lib = ctypes.CDLL(str(REFERENCE / ".deps/lib/libfaust.so"))
    generate = lib.generateCAuxFilesFromFile
    generate.argtypes = [
        ctypes.c_char_p, ctypes.c_int,
        ctypes.POINTER(ctypes.c_char_p), ctypes.c_char_p,
    ]
    generate.restype = ctypes.c_bool
    (ROOT / "generated").mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="faust-hoa-") as directory:
        for stem, name in CASES.items():
            output = Path(directory) / f"{stem}.hpp"
            options = [
                "-lang", "cpp", "-cn", name,
                "-I", str(FAUST / "libraries"), "-I", str(ROOT),
                "-o", str(output),
            ]
            argv = (ctypes.c_char_p * len(options))(
                *(option.encode() for option in options))
            error = ctypes.create_string_buffer(4096)
            if not generate(str(ROOT / f"{stem}.dsp").encode(),
                            len(options), argv, error):
                raise SystemExit(error.value.decode())
            text = "\n".join(line.rstrip(" \t")
                             for line in output.read_text().split("\n"))
            if "Code generated with Faust 2.88.0" not in text:
                raise SystemExit("Compiler must be Faust 2.88.0")
            target = ROOT / "generated" / output.name
            if args.check:
                if not target.exists() or target.read_text() != text:
                    raise SystemExit(f"Generated file differs: {target.name}")
            else:
                target.write_text(text)
    print(f"PASS pinned Faust 2.88.0: {len(CASES)} generated C++ files"
          + (" verified" if args.check else " written"))


if __name__ == "__main__":
    main()
