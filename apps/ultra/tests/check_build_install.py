#!/usr/bin/env python3
"""Run the build launcher with inert tools; replacing a mapped .so must be atomic."""
import json
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
    launcher_log = root / "selected-builds"
    cargo_log = root / "cargo-arguments"
    (app / "install-launcher.py").write_text(
        "from pathlib import Path\n"
        f"with Path({str(launcher_log)!r}).open('a') as file: file.write('selected\\n')\n"
    )
    deps = root / "experiments/clockwork-faust/.deps"
    # Only expensive compiler/download commands are substituted. The real
    # launcher's filesystem installation runs against a genuinely mapped file.
    for relative in ("rust/bin/cargo", "cmake-3.31.6-linux-x86_64/bin/cmake"):
        tool = deps / relative
        tool.parent.mkdir(parents=True, exist_ok=True)
        tool.write_text("#!/bin/sh\nexit \"${BUILD_TEST_FAILURE:-0}\"\n")
        tool.chmod(0o755)
    (deps / "rust/bin/cargo").write_text(
        "#!/usr/bin/env python3\nimport json, os, sys\n"
        "with open(os.environ['BUILD_TEST_CARGO_LOG'], 'a') as file: file.write(json.dumps(sys.argv[1:]) + '\\n')\n"
        "sys.exit(int(os.environ.get('BUILD_TEST_FAILURE', '0')))\n"
    )
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
        env = {**os.environ, "CI": "", "BUILD_TEST_CARGO_LOG": str(cargo_log),
               "CARGO_TARGET_DIR": str(root / 'unrelated-target')}
        def build(*arguments, **changes):
            return subprocess.run(["bash", str(app / "build.sh"), *arguments],
                                  env={**env, **changes}, capture_output=True, text=True)
        result = build()
        assert result.returncode == 0, result.stderr
        assert installed.stat().st_ino != inode, "Rebuild overwrote the library mapped by a running app"
        assert mapped[:] == old, "Running app's mapped library changed"
        assert installed.read_bytes() == new, "Next launch did not receive the new library"
    assert launcher_log.read_text() == "selected\n", "Full local build did not select both launchers"
    for line in cargo_log.read_text().splitlines():
        arguments = json.loads(line)
        assert '--target-dir' in arguments, "Both apps must build into the selected directory even with CARGO_TARGET_DIR set"
        assert arguments[arguments.index('--target-dir') + 1] == str(app / 'src-tauri/target')
    for arguments, changes in ((("--native-only",), {}), ((), {"CI": "true"}), ((), {"BUILD_TEST_FAILURE": "1"})):
        result = build(*arguments, **changes)
        assert (result.returncode != 0) == bool(changes.get("BUILD_TEST_FAILURE")), result.stderr
        assert launcher_log.read_text() == "selected\n", "Partial, CI or failed build changed launcher selection"
    assert not list(installed.parent.glob("libultra_native.so.*")), "Temporary install file leaked"
print("PASS atomic library replacement and paired launcher selection; partial, CI and failed builds retain selection")
