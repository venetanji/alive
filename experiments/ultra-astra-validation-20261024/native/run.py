#!/usr/bin/env python3
"""Compile and run the standalone Gain/Stop probe against an existing library."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shlex
import shutil
import signal
import subprocess
import sys
import tempfile


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(args):
    bundle = Path(__file__).resolve().parent
    target = args.target.resolve()
    names = ("libultra_native.so", "libultra_native.dylib")
    if target.is_file():
        library = target
    else:
        library = next((candidate for base in (target, target / "apps/ultra/build")
                        for name in names if (candidate := base / name).is_file()), None)
    if library is None or not library.is_file():
        raise ValueError("No native library found; pass a built repository or library path.")
    roots = [args.repo.resolve()] if args.repo else list(library.parents)
    headers = next((root / "apps/ultra/src-tauri/native" for root in roots
                    if (root / "apps/ultra/src-tauri/native/backend.h").is_file()), None)
    if headers is None:
        raise ValueError("Cannot locate C ABI headers; supply --repo PATH.")
    output = args.output.resolve() if args.output else Path(tempfile.mkdtemp(prefix="ultra-native-probe-"))
    if output == bundle or bundle in output.parents:
        raise ValueError("Keep generated binaries/audio outside the probe bundle.")
    output.mkdir(parents=True, exist_ok=True)
    if any(output.iterdir()):
        raise ValueError("--output must be an empty directory.")
    compiler = shlex.split(os.environ.get("CXX", ""))
    if not compiler:
        compiler = [shutil.which("c++") or shutil.which("g++") or shutil.which("clang++") or "c++"]
    executable = output / "gain_stop_regression"
    command = [*compiler, "-std=c++20", "-O2", "-UNDEBUG", "-I", str(headers),
               str(bundle / "gain_stop_regression.cpp"), str(library),
               "-Xlinker", "-rpath", "-Xlinker", str(library.parent), "-o", str(executable)]
    built = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    (output / "build.log").write_text(built.stdout)
    result = {"library_sha256": sha256(library),
              "probe_sha256": sha256(bundle / "gain_stop_regression.cpp"),
              "compiler_command": command, "assertions_enabled": True,
              "physical_audio_tested": False, "output_directory": str(output)}
    if built.returncode:
        result.update(status="build_failed", returncode=built.returncode)
        (output / "results.json").write_text(json.dumps(result, indent=2) + "\n")
        print(built.stdout, file=sys.stderr)
        return 1

    # Assertion failures are expected when reproducing the parent regression.
    if os.name == "posix":
        import resource
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    env = os.environ.copy()
    loader = "DYLD_LIBRARY_PATH" if sys.platform == "darwin" else "LD_LIBRARY_PATH"
    env[loader] = str(library.parent) + (os.pathsep + env[loader] if env.get(loader) else "")
    for mode in ("edits", "baseline"):
        completed = subprocess.run([str(executable), mode, str(output / (mode + ".f32"))],
                                   env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        (output / (mode + ".log")).write_text(completed.stdout)
        result[mode] = {"returncode": completed.returncode}
        print(completed.stdout, end="")
        if completed.returncode:
            expected_assertion = (completed.returncode == -signal.SIGABRT
                                  and "ultra_external_render" in completed.stdout
                                  and "assert" in completed.stdout.lower())
            reproduced = args.expect_failure and mode == "edits" and expected_assertion
            result["status"] = "expected_regression_reproduced" if reproduced else "probe_failed"
            (output / "results.json").write_text(json.dumps(result, indent=2) + "\n")
            print(f"{result['status']}; artifacts: {output}")
            return 0 if reproduced else 1
    control = (output / "baseline.f32").read_bytes()
    edited = (output / "edits.f32").read_bytes()
    matched = control == edited
    result.update(status=("unexpected_pass" if args.expect_failure else "passed") if matched else "audio_mismatch",
                  samples_compared=len(control) // 4, bytes_compared=len(control),
                  audio_sha256=hashlib.sha256(control).hexdigest(), byte_identical=matched)
    (output / "results.json").write_text(json.dumps(result, indent=2) + "\n")
    print(f"{result['status']}: {len(control) // 4} float samples; artifacts: {output}")
    return 0 if matched and not args.expect_failure else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", type=Path, help="Repository, native build directory, or native shared library")
    parser.add_argument("--repo", type=Path, help="Repository containing the C ABI headers, if not inferable")
    parser.add_argument("--output", type=Path, help="Empty output directory; defaults to a new temporary directory")
    parser.add_argument("--expect-failure", action="store_true", help="Require the parent's render assertion regression")
    args = parser.parse_args()
    if os.name != "posix":
        parser.error("This runner currently supports Linux/macOS with a GCC-compatible C++ compiler.")
    try:
        return run(args)
    except (OSError, ValueError) as error:
        print(f"Native probe setup failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
