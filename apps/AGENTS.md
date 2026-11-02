# Local Test Builds

Before presenting any local Alive or Ultra build for manual testing, select the
matching pair in both desktop launchers. Successful full `build.sh` runs do this
automatically. For direct Cargo builds or another checkout, run that checkout's
`python3 apps/ultra/install-launcher.py --build-dir /absolute/path/to/build-dir`
after both binaries and their matching `libultra_native.so` are ready.

Verify the selected snapshot and artifact hashes, and report which build is
reachable through **Alive (Test)** and **Ultra (Latest Build)**. Preserve existing
windows and prior snapshots. Selecting a build does not mean acceptance passed.
Do not update user launchers from CI or native-only builds.
