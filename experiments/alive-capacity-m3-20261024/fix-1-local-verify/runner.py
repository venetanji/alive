#!/usr/bin/env python3
"""Measure exact native sources in an isolated, immutable output directory."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[3]
parser = argparse.ArgumentParser()
parser.add_argument("output", type=Path)
parser.add_argument("--verify", action="store_true")
parser.add_argument("--guards", action="store_true")
parser.add_argument("--samples", type=int, default=1200)
args = parser.parse_args()
output = args.output.resolve()
output.mkdir(parents=True, exist_ok=False)
shutil.copy2(__file__, output / "runner.py")
source = output / "source"
shutil.copytree(ROOT / "apps/ultra/src-tauri/native", source / "src-tauri/native")
shutil.copytree(ROOT / "apps/ultra/core", source / "core")
(source / "tests").mkdir()
for name in ("alive_session_capacity.cpp", "alive_session_capacity_fixture.hpp", "canvas_callback_guard.hpp"):
    shutil.copy2(ROOT / "apps/ultra/tests" / name, source / "tests" / name)

commands = []
def run(command, log):
    commands.append(command)
    (output / "commands.json").write_text(json.dumps(commands, indent=2))
    with (output / log).open("w") as stream:
        result = subprocess.run(command, cwd=ROOT, stdout=stream, stderr=subprocess.STDOUT)
    if result.returncode:
        raise SystemExit(f"{log}: exit {result.returncode}")

run(["python3", "apps/ultra/tests/alive_session_v3_fixtures.py", str(source / "tests/saved_graphs.hpp")], "fixtures.log")
flags = ["-std=c++17", "-O2", "-Wall", "-Wextra", "-Werror", "-pthread"]
if args.guards:
    flags += ["-DCAPACITY_GUARDS", "-DULTRA_ALIVE_SESSION_TEST_TRACE"]
command = ["c++", *flags, str(source / "tests/alive_session_capacity.cpp"),
           str(source / "src-tauri/native/backend.cpp"), str(ROOT / "apps/ultra/build/core/libultra_core_bundle.a"),
           "-ldl", "-lrt", "-o", str(output / "probe")]
if args.guards:
    command += ["-Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock"]
run(command, "build.log")
manifest = {"base_commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
            "sources_modified_by_runner": False, "diagnostic_guards": args.guards, "files": {}}
for path in sorted(source.rglob("*")):
    if path.is_file(): manifest["files"][str(path.relative_to(output))] = hashlib.sha256(path.read_bytes()).hexdigest()
for path in (output / "probe", ROOT / "apps/ultra/build/core/libultra_core_bundle.a"):
    manifest["files"][str(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
(output / "manifest.json").write_text(json.dumps(manifest, indent=2))
run([str(output / "probe"), *( ["--verify"] if args.verify else [str(args.samples)] )], "probe.log")
print(output)
