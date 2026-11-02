"""Build and run the explicit native-device experiment; no bundled resources."""
import argparse
import hashlib
import pathlib
import platform
import subprocess
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument("dll", nargs="+", type=pathlib.Path)
args = parser.parse_args()
if platform.system() != "Linux" or platform.machine() not in ("x86_64", "amd64"):
    parser.error("the explicit native-device experiment requires Linux x86-64")
root = pathlib.Path(__file__).resolve().parents[1]
native = root / "src-tauri/native/external_device"
with tempfile.TemporaryDirectory(prefix="ultra-external-device-") as temporary:
    build = pathlib.Path(temporary)
    subprocess.run(["g++", "-std=c++17", "-O2", str(root / "tests/external_device_disabled_test.cpp"), str(native / "external_device.cpp"), "-o", str(build / "disabled-test")], check=True)
    subprocess.run([str(build / "disabled-test")], check=True, timeout=10)
    subprocess.run(["gcc", "-std=c11", "-O2", "-Wall", "-Wextra", "-Werror", "-Werror=use-after-free", "-Wuse-after-free=3", "-DULTRA_EXTERNAL_DEVICE_EXPERIMENTAL", str(root / "tests/external_device_shim_test.c"), "-pthread", "-lm", "-o", str(build / "shim-test")], check=True)
    subprocess.run([str(build / "shim-test")], check=True, timeout=10)
    subprocess.run(["gcc", "-std=c11", "-O2", "-Werror=use-after-free", "-Wuse-after-free=3", "-DULTRA_EXTERNAL_DEVICE_EXPERIMENTAL", "-c", str(native / "runtime_shim.c"), "-o", str(build / "shim.o")], check=True)
    subprocess.run(["g++", "-std=c++17", "-O2", "-DULTRA_EXTERNAL_DEVICE_EXPERIMENTAL", str(root / "tests/external_device_test.cpp"), str(native / "external_device.cpp"), str(native / "pe_image.cpp"), str(build / "shim.o"), "-pthread", "-lm", "-o", str(build / "test")], check=True)
    subprocess.run(["g++", "-std=c++17", "-O2", "-DULTRA_EXTERNAL_DEVICE_EXPERIMENTAL", str(root / "tests/external_device_pe_test.cpp"), str(native / "pe_image.cpp"), str(build / "shim.o"), "-pthread", "-lm", "-o", str(build / "pe-test")], check=True)
    subprocess.run([str(build / "pe-test")], check=True, timeout=10)
    graph_test = root / "tests/external_device_graph_test.cpp"
    if graph_test.is_file():
        subprocess.run(["g++", "-std=c++17", "-O2", "-DULTRA_EXTERNAL_DEVICE_EXPERIMENTAL", str(graph_test), str(native / "external_device.cpp"), str(native / "pe_image.cpp"), str(build / "shim.o"), "-pthread", "-lm", "-o", str(build / "graph-test")], check=True)
    for dll in args.dll:
        before = dll.read_bytes()
        digest = hashlib.sha256(before).hexdigest()
        subprocess.run([str(build / "test"), str(dll), digest], check=True, timeout=60)
        subprocess.run([str(build / "test"), str(dll), digest, "1"], check=True, timeout=60)
        if digest == "4528afb1fbc78d49ed92161ed13ae1df50606e2e2b2c4f28caeca0cbc1476133":
            if graph_test.is_file():
                subprocess.run([str(build / "graph-test"), str(dll), digest], check=True, timeout=60)
        assert hashlib.sha256(dll.read_bytes()).hexdigest() == digest
