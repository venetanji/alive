#!/usr/bin/env python3
"""Run the build launcher with inert tools; replacing a mapped .so must be atomic."""
import mmap
import os
import pathlib
import shutil
import subprocess
import tempfile

source = pathlib.Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix="ultra-build-install-") as directory:
    root = pathlib.Path(directory)
    app = root / "apps/ultra"
    app.mkdir(parents=True)
    shutil.copy2(source / "build.sh", app / "build.sh")
    deps = root / "experiments/clockwork-faust/.deps"
    # Only expensive compiler/download commands are substituted. The real
    # launcher's filesystem installation runs against a genuinely mapped file.
    for relative in ("rust/bin/cargo", "cmake-3.31.6-linux-x86_64/bin/cmake"):
        tool = deps / relative
        tool.parent.mkdir(parents=True, exist_ok=True)
        tool.write_text("#!/bin/sh\nexit 0\n")
        tool.chmod(0o755)
    for path in (
        deps / "clockwork-94b67500c96e105491682ec68741b5018560eab7/CMakeLists.txt",
        root / "experiments/faust-reference/.deps/faust-2.88.0/architecture/faust/dsp/dsp.h",
    ):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.touch()
    built = app / "build/libultra_native.so"
    installed = app / "src-tauri/target/release/libultra_native.so"
    built.parent.mkdir(parents=True)
    installed.parent.mkdir(parents=True)
    old, new = b"A" * 65536, b"B" * 32768
    installed.write_bytes(old)
    built.write_bytes(new)
    with installed.open("rb") as file, mmap.mmap(file.fileno(), 0, access=mmap.ACCESS_READ) as mapped:
        inode = os.fstat(file.fileno()).st_ino
        subprocess.run(["bash", str(app / "build.sh")], check=True, capture_output=True, text=True)
        assert installed.stat().st_ino != inode, "Rebuild overwrote the library mapped by a running app"
        assert mapped[:] == old, "Running app's mapped library changed"
        assert installed.read_bytes() == new, "Next launch did not receive the new library"
    assert not list(installed.parent.glob("libultra_native.so.*")), "Temporary install file leaked"
print("PASS build replaces native library atomically; existing mapping stays intact")
