# Local Test Launchers

Current selection: the Clip expansion and native loop display build from
`58eb6829e6bfbf515564a4532f5804d01b9e9d17`, snapshot
`test-3ed29c6aa405049d4d06`. See [the current visual report](CLIP-DIVIDER-LOOP.md)
for its matching hashes and native launcher evidence. The rest of this document
records the earlier launcher-installation batch and its historical build.

Alive (Test) and Ultra (Latest Build) now select the same matching local test
build pair. The previous Alive entry selected `1bca10c-clip-8bbbe283de`; the
previous Ultra entry invoked the unrelated research checkout's `run.sh`.

The selected binaries are the existing debug builds tested from
`c8f4cb3091b9754fa5c94e8a40718e72954aab14`. This batch changes installation,
build workflow, regressions and documentation; it does not rebuild or modify
application UI, engine or DSP behavior. The source baseline for this batch is
`eae71a07ed4b72ff50143ad2bc3102d39dd6c9ee` on
`audit/pr12-native-20261102` in `/tmp/alive-pr12-native-20261102`.

## Selection And Provenance

- Shared selector: `/home/venetanji/.local/share/alive/current-test`.
- Snapshot: `/home/venetanji/.local/share/alive/builds/test-d08638ba3007ceaee395`.
- Source build directory: `/home/venetanji/.cache/alive-pr12-native-20261102/target/debug`.
- Both executables, their shared native library, icon and both apps' configured
  resource destinations are copied into the snapshot. No launch-time build or
  fallback to an older package occurs.
- `source-build-manifest.json` records hashes, source directory and checkout
  context. The supplied build commit is explicitly distinguished from checkout
  context at installation time. The copied manifest is in
  `evidence/test-launchers/source-build-manifest.json`.

| Artifact | SHA-256 |
| --- | --- |
| `bin/alive` | `38d542bc17e7e99ffbc310f4dfd662b51869d04d2ef05a0201da81b2631146cd` |
| `bin/ultra` | `e50bc9efe1d0d0238c4c4e701a244588a072f57a0ce2636f43fc6ffc7982d898` |
| `bin/libultra_native.so` | `1652d52c581395a9919ea2dbe5a03c4d365c7f9a4da6d10cff233e590099eaa8` |

Successful full local builds now select both launchers after both Cargo builds
and atomic native-library installation. Both Cargo calls explicitly use the
same target directory, including when `CARGO_TARGET_DIR` is set elsewhere.
CI, native-only and failed builds leave the current selection unchanged.
An explicit `--build-dir` supports a tested debug pair or another checkout.
`apps/AGENTS.md` records the requirement for future manual test work.

The installer validates all inputs before publishing, stages copied files,
serializes competing installations, preserves changed desktop-entry backups,
and switches the shared selector atomically. Failed desktop database refresh
restores the previous entries. Old snapshots remain available, so existing
processes retain their executable and native-library files. Reopen an app to
use a new selection. Ultra's MIME declarations and standalone `run.sh` fallback
remain available.

## Verification

| Check | Result |
| --- | --- |
| Paired launcher regressions | 6 passed; new requirements failed before implementation |
| Atomic build/install regression | Passed; local hook, shared Cargo directory, CI/native-only/failure exclusions and existing mapped-library preservation |
| Existing isolated/standalone launcher checks | Both checks passed |
| Python helper discovery | 143 passed, 0 failed, 0 skipped |
| Both installed desktop entries | `desktop-file-validate` passed |
| Build shell syntax and whitespace | Passed |
| Actual desktop-entry launches | Both passed through `gio launch` on private Xvfb/DBus and software-only PipeWire |
| Runtime artifact identity | Both executable hashes and mapped native-library paths/hashes match the selected snapshot; `LD_LIBRARY_PATH` absent |
| Initial native document delivery | Passed existing startup race check against the selected Ultra binary |
| Native window geometry | Both apps verified at 800x600, 1280x800 and 1440x900, then shrink/restore repeated |
| Screenshot inspection | All six final captures inspected |
| Full Node/Chromium/Rust/native acceptance rerun | Unrun for this installer/workflow batch; application code unchanged |
| Physical audio, recording and settings changes | Unrun; no physical device/settings changes made, no audio started by the launcher probe |

The file-argument regression uses real desktop Exec parsing, including spaces,
quotes, percent signs, shell metacharacters and multiple Ultra files. It removes
the original build directory before launching, verifying the snapshot is used.
Separate regressions cover missing binaries/resources, immutable previous
copies, backups and desktop-refresh failure.

Two initial viewport probe attempts are retained in `/tmp`: the first selected
a GTK helper window and cropped the unchanged app; the second confirmed actual
geometry but required Ultra's ready-status text after it becomes hidden at the
smallest viewport. Neither attempt qualifies as a viewport pass. The final
probe selects the real app window by PID and minimum initial geometry, asserts
each requested size, verifies initial native readiness and checks the visible
Start audio control at each Ultra size. Final results and the executed probe
are under `evidence/test-launchers/`; final raw artifacts are under
`/tmp/alive-test-launchers-20261102-final`.

Reproduce the final local probe from this checkout:

```sh
env ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_DEFAULT=1 \
  ULTRA_TEST_ALIVE_BINARY=/home/venetanji/.local/share/alive/current-test/bin/alive \
  ULTRA_TEST_SCREEN_SIZE=1600x1000 \
  ULTRA_TEST_SCRIPT="$PWD/docs/ui-review/2026-11-02/evidence/test-launchers/launcher-probe.py" \
  bash apps/ultra/tests/check_canvas_desktop.sh --software-audio /tmp/alive-launcher-recheck
```

This recorded probe contains the exact checkout and installed desktop paths
used for this local verification. It does not operate the user's active display.

| App | 800x600 | 1280x800 | 1440x900 |
| --- | --- | --- | --- |
| Alive | [Capture](captures/alive-launcher-800x600.png) | [Capture](captures/alive-launcher-1280x800.png) | [Capture](captures/alive-launcher-1440x900.png) |
| Ultra | [Capture](captures/ultra-launcher-800x600.png) | [Capture](captures/ultra-launcher-1280x800.png) | [Capture](captures/ultra-launcher-1440x900.png) |

The isolated Alive screenshot reports that the private test home has no user
device-library directory; bundled catalog items load. This is the accurate
unavailable state for the private test home.

## Acceptance Still Open

No CI run was dispatched for this local installer batch. Latest manual CI is
[41381006275](https://github.com/venetanji/alive/actions/runs/41381006275) at
`c8f4cb3`: overall failed. Arrangement Return and Master save/quit/restart passed;
the separate desktop journey failed at the first live-fixture Save As target,
with an unexpected hosted editor covering the main window and causal dispatch
still unproved. Clip observation, saved-clip measurements, editor resources and
CPAL loopback were skipped in that run. Prior separate local passes remain
historical evidence. Hardware and endurance remain unrun. See `AUDIT.md` and
`CONTINUATION-PLAN.md` before broader feature work.

## Changed Files In This Batch

- `apps/AGENTS.md`
- `apps/alive/README.md`
- `apps/ultra/build.sh`
- `apps/ultra/install-launcher.py`
- `apps/ultra/tests/check_build_install.py`
- `apps/ultra/tests/check_patch_file_launch.py`
- `apps/ultra/ui/README.md`
- `docs/superpowers/plans/2026-11-02-test-launchers.md`
- `docs/ui-review/2026-11-02/CHANGED-FILES.md`
- `docs/ui-review/2026-11-02/LAUNCHERS.md`
- Six `captures/{alive,ultra}-launcher-{800x600,1280x800,1440x900}.png` files.
- Six `evidence/test-launchers/` files: `launcher-results.json`,
  `startup-result.json`, `source-build-manifest.json`, `launcher-probe.py`,
  `alive-desktop-launch.log` and `ultra-desktop-launch.log`.

Outside Git, the two existing desktop entries under
`/home/venetanji/.local/share/applications/` were updated with backups, and the
user snapshot/selector and existing Ultra MIME database were installed. The
unrelated research checkout and existing worktree dependency/build symlinks
remain preserved. No merge, release or deployment occurred.
