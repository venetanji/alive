#!/usr/bin/env python3
"""Retained, isolated native capacity proposal; never enables the shipping profile."""
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
source = output / "source"
shutil.copytree(ROOT / "apps/ultra/src-tauri/native", source / "src-tauri/native")
shutil.copytree(ROOT / "apps/ultra/core", source / "core")
(source / "tests").mkdir()
for name in ("alive_session_capacity.cpp", "alive_session_capacity_fixture.hpp", "canvas_callback_guard.hpp"):
    shutil.copy2(ROOT / "apps/ultra/tests" / name, source / "tests" / name)

policy = source / "src-tauri/native/alive_session_clip_policy.hpp"
text = policy.read_text()
anchor = "  return out;\n}\nstruct Prepared"
assert text.count(anchor) == 1
text = text.replace(anchor, """  // Internal experimental proposal only; shipping sources remain unmodified.
  if (profile == 2) {
    out.work_policy = 2;
    out.features = ALIVE_SESSION_V3_FEATURE_ADMITTED;
    out.scheduled_frame = {48, 3072, 1568, 0};
    out.scheduled_window = {288, 18432, 9280, 0};
    out.optional_frame = {16, 1024, 512, HorizonSteps};
    out.optional_window = out.optional_frame;
    out.emergency = {32, 0, 512, 0};
  }
""" + anchor)
policy.write_text(text)
clips = source / "src-tauri/native/alive_session_clips.hpp"
text = clips.read_text()
old = "  if (c.profile != 1 || c.work_policy != 1 || !(clip_admission::policy(c.profile).features & 1))"
assert text.count(old) == 1
text = text.replace(old, "  const auto limits = clip_admission::policy(c.profile);\n"
                        "  if ((c.profile != 1 && c.profile != 2) || c.work_policy != limits.work_policy || !(limits.features & 1))")
old = "c.track_count > 2 || c.device_count < c.track_count || c.device_count > 6"
assert text.count(old) == 1
clips.write_text(text.replace(old, "c.track_count > limits.max_tracks || c.device_count < c.track_count || c.device_count > limits.max_devices"))

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
            "shipping_profile_changed": False, "diagnostic_guards": args.guards,
            "experimental_policy": 2, "files": {}}
for path in sorted(source.rglob("*")):
    if path.is_file(): manifest["files"][str(path.relative_to(output))] = hashlib.sha256(path.read_bytes()).hexdigest()
for path in (output / "probe", ROOT / "apps/ultra/build/core/libultra_core_bundle.a"):
    manifest["files"][str(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
(output / "manifest.json").write_text(json.dumps(manifest, indent=2))
run([str(output / "probe"), *( ["--verify"] if args.verify else [str(args.samples)] )], "probe.log")
print(output)
