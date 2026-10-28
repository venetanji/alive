#!/usr/bin/env python3
"""Retain exact v4 native inputs, separate timing/guard binaries and raw evidence."""
import argparse
import csv
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import time

ROOT = Path(__file__).resolve().parents[3]
RESOURCES = ("events", "roots", "scans", "writes", "guards", "placement")
FLAGS = ["-std=c++17", "-O2", "-Wall", "-Wextra", "-Werror", "-pthread"]


def measurement_flags(guards):
    return FLAGS + ["-DULTRA_ALIVE_SESSION_V4_PROVISIONAL"] + (
        ["-DULTRA_ALIVE_SESSION_TEST_TRACE", "-DWORKSPACES_GUARDS"] if guards else [])


def distribution(samples, frames):
    if not samples:
        raise ValueError("missing callback samples")
    values = sorted(samples)
    deadline = frames * 1e6 / 48000
    return {"samples": len(values), "mean_us": sum(values) / len(values),
            "p99_us": values[(len(values) - 1) * 99 // 100],
            "p999_us": values[(len(values) - 1) * 999 // 1000], "max_us": values[-1],
            "deadline_us": deadline, "overruns": sum(value > deadline for value in values)}


def read_work(path):
    with path.open() as stream:
        reader = csv.DictReader(stream)
        if not set(RESOURCES).issubset(reader.fieldnames or []):
            raise ValueError("incomplete six-resource work trace")
        maxima = {}
        for row in reader:
            key = "/".join(row[k] for k in ("case", "profile", "frames", "family"))
            old = maxima.setdefault(key, dict.fromkeys(RESOURCES, 0))
            for resource in RESOURCES:
                old[resource] = max(old[resource], int(row[resource]))
        return maxima


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--samples", type=int, default=1200)
    parser.add_argument("--guard-samples", type=int, default=20)
    parser.add_argument("--focused", action="store_true", help="run unchanged complete v4 corpus and shipping refusal")
    args = parser.parse_args()
    if args.samples < 1 or args.guard_samples < 1:
        parser.error("sample counts must be positive")
    out = args.output.resolve(); out.mkdir(parents=True, exist_ok=False)
    source = out / "source"
    shutil.copytree(ROOT / "apps/ultra/src-tauri/native", source / "src-tauri/native")
    shutil.copytree(ROOT / "apps/ultra/core", source / "core")
    (source / "tests").mkdir()
    names = ["alive_session_v4_measure.cpp", "alive_session_capacity_fixture.hpp",
             "canvas_callback_guard.hpp", "alive_session_v4_authority_test.cpp",
             "alive_session_v4_midi_test.cpp", "alive_session_v4_test.cpp",
             "alive_session_v4_shipping_test.cpp", "alive_session_v3_fixtures.py"]
    for name in names:
        shutil.copy2(ROOT / "apps/ultra/tests" / name, source / "tests" / name)
    shutil.copytree(ROOT / "apps/ultra/examples", source / "examples")
    shutil.copy2(__file__, out / "runner.py")
    shutil.copy2(ROOT / "apps/ultra/build/core/libultra_core_bundle.a", out / "libultra_core_bundle.a")
    commands = []

    def run(command, log, cwd=out, env=None):
        start = time.monotonic()
        with (out / log).open("w") as stream:
            result = subprocess.run(command, cwd=cwd, env=env, stdout=stream, stderr=subprocess.STDOUT)
        commands.append({"argv": list(map(str, command)), "cwd": str(cwd), "exit": result.returncode,
                         "elapsed_seconds": time.monotonic() - start, "log": log})
        (out / "commands.json").write_text(json.dumps(commands, indent=2))
        if result.returncode:
            raise SystemExit(f"{log}: exit {result.returncode}; retained at {out}")

    run(["python3", str(source / "tests/alive_session_v3_fixtures.py"),
         str(source / "tests/saved_graphs.hpp")], "fixtures.log")
    flags = FLAGS
    wraps = ["-Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=pthread_mutex_lock"]
    common = [str(out / "libultra_core_bundle.a"), "-ldl", "-lrt"]
    for mode in ("timing", "guards"):
        mode_flags = measurement_flags(mode == "guards")
        obj = out / f"{mode}-backend.o"
        run(["c++", *mode_flags, "-c", str(source / "src-tauri/native/backend.cpp"), "-o", str(obj)], f"{mode}-backend.log")
        binary = out / f"{mode}-probe"
        run(["c++", *mode_flags, str(source / "tests/alive_session_v4_measure.cpp"), str(obj),
             *common, *(wraps if mode == "guards" else []), "-o", str(binary)], f"{mode}-build.log")
        directory = out / mode; directory.mkdir()
        run([str(binary), str(args.samples if mode == "timing" else args.guard_samples)], f"{mode}.log", directory)
        if mode == "guards" and args.focused:
            for name in ("v4", "v4_midi", "v4_authority"):
                binary = out / f"{name}-test"
                run(["c++", *mode_flags, str(source / f"tests/alive_session_{name}_test.cpp"), str(obj),
                     *common, *wraps, "-o", str(binary)], f"{name}-build.log")
                evidence = out / "authority"; evidence.mkdir(exist_ok=True)
                env = dict(os.environ, ALIVE_AUTHORITY_EVIDENCE=str(evidence))
                run([str(binary)], f"{name}.log", env=env)
    if args.focused:
        run(["c++", *flags, str(source / "tests/alive_session_v4_shipping_test.cpp"),
             str(source / "src-tauri/native/backend.cpp"), *common,
             "-o", str(out / "shipping-test")], "shipping-build.log")
        run([str(out / "shipping-test")], "shipping.log")
    groups = {}
    with (out / "timing/samples.csv").open() as stream:
        for row in csv.DictReader(stream):
            key = (row["case"], int(row["profile"]), int(row["frames"]))
            groups.setdefault(key, []).append(float(row["us"]))
    summary = {"/".join(map(str, key)): distribution(values, key[2]) for key, values in groups.items()}
    (out / "summary.json").write_text(json.dumps(summary, indent=2))
    (out / "work-maxima.json").write_text(json.dumps(read_work(out / "guards/work.csv"), indent=2))
    manifest = {"base_commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
                "platform": platform.platform(), "cpuinfo": Path("/proc/cpuinfo").read_text(),
                "compiler": subprocess.check_output(["c++", "--version"], text=True),
                "rate": 48000, "flags": flags, "timing_trace": False, "timing_guards": False,
                "provisional_test_admission": True, "shipping_source_modified": False,
                "quantile": "sorted[floor((n-1)*p)]", "files": {}}
    manifest["cpu_governors"] = {str(path): path.read_text().strip() for path in
                                 Path("/sys/devices/system/cpu").glob("cpu*/cpufreq/scaling_governor")}
    for path in sorted(out.rglob("*")):
        if path.is_file():
            manifest["files"][str(path.relative_to(out))] = hashlib.sha256(path.read_bytes()).hexdigest()
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(out)


if __name__ == "__main__":
    main()
