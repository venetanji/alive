# Ultra CI

`.github/workflows/ultra-ci.yml` runs on pull requests, pushes to `main`, and manual
dispatch, avoiding duplicate PR/branch builds. It does not deploy, release,
publish a package, or submit to a store.
The token is read-only, checkout credentials are not persisted, and the workflow
does not read repository secrets or use `pull_request_target`.

## What the three jobs establish

1. **UI, protocol, and reference tests:** all UI/controller/component Node tests,
   bounded Max inventory tests, recorded Max evidence/schema integrity, launcher
   installation regressions, and portable native sequence/graph execution tests.
   The reference checks validate existing captured evidence; they do not run Max
   or establish new Max compatibility.
2. **Chromium canvas editing smoke:** the actual HTML/CSS/modules served over
   loopback HTTP in sandboxed Chromium. It checks document editing and visible
   top-inlet/bottom-outlet geometry, keyboard creation, text-edit undo, lock
   protection, directional help, group moves, zoomed cord geometry and small
   viewport controls. There is no Tauri/native IPC shim and no
   fake browser audio. A passing preview test is not native audio qualification.
3. **Linux native build, Rust bridge, and CPAL loopback:** builds the pinned real Clockwork/Faust
   engine and `libultra_native.so`, runs backend/sequence/canvas integration tests
   against an explicitly identified JACK ABI test double, then builds and tests
   the real Rust/Tauri bridge using `Cargo.lock`. Finally it explicitly runs the
   ignored `audio::tests::private_software_output` test in a private software-only
   PipeWire graph and checks recorded stereo PCM for finite, non-silent,
   non-clipping samples. The test must exist (zero matched tests fails the gate).
   This executes actual CPAL callbacks and native DSP, not an audio mock.
   It does not prove real JACK server behavior, physical MIDI, audible hardware
   output, hardware latency, or realtime deadlines.

The native runner installs JACK headers, ALSA/PipeWire/libclang build dependencies
for CPAL, and Tauri's GTK/WebKit dependencies from
Ubuntu's official apt repositories, plus `pipewire-bin`, `wireplumber`, and `dbus`
for the private loopback gate. It also tests the Rust-host native rendering ABI
across callback partitions. Physical and native desktop Audio settings UI
qualification remain separate tasks described in `../../RUNNING.txt` and
`../../AUDIO.md`; neither is claimed by the cloud job.

The loopback script starts only its own PipeWire server, policy-only WirePlumber,
and D-Bus session under a fresh mode-0700 temporary runtime directory. No hardware
monitors, system service reconfiguration, device permissions, or security bypasses
are needed. Ubuntu 24.04's WirePlumber 0.4 uses upstream `policy.conf`; newer
WirePlumber uses its `policy` profile. Capture uses raw stdout (supported by
PipeWire 1.0), not newer `--raw` / `--sample-count` flags. Recording stops cleanly
after the real Rust test, so frame count varies. Probe and capture timeouts bound
failures; process cleanup removes the private runtime directory.

CI uploads build logs, exact tool versions, the matched test list, daemon/test
logs, graph and link snapshots, raw stereo float32 PCM, and a JSON signal report
when successful. Available failure evidence is uploaded too, for seven days.
No waveform or JSON report is a claim of acoustic or hardware qualification.
The Ubuntu runner and apt security updates are intentionally not frozen images.

## Run locally

From the repository root, with Node 22.20.0, Python 3.12, and a C++ compiler:

```sh
python3 -m pip install -r apps/ultra/tests/ci/requirements.txt
bash apps/ultra/tests/ci/check-contracts.sh
```

For browser smoke:

```sh
cd apps/ultra/tests/ci
npm ci --ignore-scripts --no-audit --no-fund
npx --no-install playwright install --with-deps chromium
npm run test:browser
```

The browser must support its normal sandbox. The test configuration explicitly
keeps it enabled; do not work around a launch failure with `--no-sandbox`.
The browser job uses the supported Ubuntu 22.04 runner so it does not need to
change Ubuntu 24.04's AppArmor user-namespace restrictions for downloaded browsers.
The test runner owns its loopback HTTP server and shuts it down afterward.
GitHub retains browser reports, screenshots, and failed-test traces for seven
days. Tests use only the checked-in research patch, never a user's private data.

For native checks, first install the apt packages listed in the workflow, then:

```sh
bash apps/ultra/build.sh --native-only
python3 apps/ultra/tests/check_backend.py
python3 apps/ultra/tests/check_sequence.py
python3 apps/ultra/tests/check_canvas.py
export PATH="$PWD/experiments/clockwork-faust/.deps/rust/bin:$PATH"
export CARGO_HOME="$PWD/experiments/clockwork-faust/.deps/cargo"
export ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build"
export LD_LIBRARY_PATH="$ULTRA_NATIVE_LIB_DIR"
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked
cargo build --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked
bash apps/ultra/tests/check_cpal_audio.sh "$PWD/apps/ultra/build/cpal-evidence"
```

## Dependency and cache policy

The existing native setup scripts pin Rust 1.85.1, CMake 3.31.6, Faust 2.88.0,
and the Clockwork commit, with SHA256 verification. CI caches only downloaded
archives and Cargo registry downloads/index, not multi-gigabyte extracted
toolchains or native build products. A fresh runner rechecks the archive hashes.
There are no broad fallback cache keys. Jobs have bounded timeouts; new commits
cancel older runs for the same ref.

Playwright 1.56.1 and its matching browser revision are locked in `package-lock.json`.
Schema-validator dependencies are exact-version pinned in `requirements.txt`.
Every GitHub Action uses a full commit SHA verified in its official repository:

- [checkout 11bd719](https://github.com/actions/checkout/commit/11bd71901bbe5b1630ceea73d27597364c9af683)
- [setup-node 49933ea](https://github.com/actions/setup-node/commit/49933ea5288caeca8642d1e84afbd3f7d6820020)
- [setup-python a26af69](https://github.com/actions/setup-python/commit/a26af69be951a213d495a4c3e4e4022e16d87065)
- [cache 0400d5f](https://github.com/actions/cache/commit/0400d5f644dc74513175e3cd8d07132dd4860809)
- [upload-artifact ea165f8](https://github.com/actions/upload-artifact/commit/ea165f8d65b6e75b540449e92b4886f43607fa02)

Update pins deliberately and rerun the workflow. Do not describe a newly added
workflow as passing until GitHub reports all jobs successful for that commit.
