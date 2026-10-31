# Final Fixed-Source Installed Acceptance

Status: exact committed-source build/install and extended actual-native journey
pass. Controller's combined scoped re-review and integration remain pending.
Product source: `a8b5f67f2e1cc3052dce76ff704b102ffbfac457`, incorporating
`9ec9863` and `a8b5f67` source fixes. This follow-up changes only the acceptance
helper, evidence and documentation.

## Exact Archive And Build Identity

Build root: `/tmp/alive-catalog-final-source-a8b5f67-20261031`.
Archive: `/tmp/alive-catalog-final-source-a8b5f67-20261031.tar`.
The archive was produced from the fixed commit, not the intentionally dirty
worktree:

```sh
git archive --format=tar --output=/tmp/alive-catalog-final-source-a8b5f67-20261031.tar a8b5f67f2e1cc3052dce76ff704b102ffbfac457
tar -xf /tmp/alive-catalog-final-source-a8b5f67-20261031.tar -C /tmp/alive-catalog-final-source-a8b5f67-20261031
```

Python orchestration creates the fresh source directory, runs those commands and
verifies all 8733 archived files against `git ls-tree -rz` blob identities.
Regular bytes and symlink target bytes use the Git blob header/hash; the same
full verification passes again after compilation. Archive SHA-256:
`76c220417a957a88153e13b1fbeb92d8018d8715530b931f2210f6088148ab7b`.
`archive-verification.json` records the source commit, full counts and checkpoint
hashes; `source-build-manifest.json` records the fixed tree and each of the 309
selected source paths' git blob IDs and SHA-256 values.

The four paused presentation checkpoint contents retain their original hashes.
The archived `canvas_tests.rs` uses the committed version, excluding its paused
modification; the three untracked presentation files are absent from the
archive. `source_worktree` and `build_source_archive` both name the actual archive
build root. No equality with the intentionally dirty worktree is asserted.

Exact separate build and fresh installer commands:

```sh
ULTRA_NATIVE_LIB_DIR=/tmp/alive-live-publish-native-20261031 LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target cargo build --manifest-path /tmp/alive-catalog-final-source-a8b5f67-20261031/apps/alive/src-tauri/Cargo.toml --locked > /tmp/alive-catalog-final-build-20261031/alive.log 2>&1
ULTRA_NATIVE_LIB_DIR=/tmp/alive-live-publish-native-20261031 LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target cargo build --manifest-path /tmp/alive-catalog-final-source-a8b5f67-20261031/apps/ultra/src-tauri/Cargo.toml --locked > /tmp/alive-catalog-final-build-20261031/ultra.log 2>&1
python3 /tmp/alive-catalog-final-install-20261031.py > /tmp/alive-catalog-final-build-20261031/install-verification.json
```

All exit 0. Builds finish in 49.01s and 45.50s with four existing warnings. The
installer selects tracked paths from the fixed git tree, rechecks their archive
bytes against git blobs, copies resources from that archive and uses a fresh
staging directory/atomic rename. It refuses an existing destination.

Immutable install: `/home/venetanji/.local/share/alive/builds/a8b5f67`.
Alive: `/home/venetanji/.local/share/alive/builds/a8b5f67/bin/alive`.
Ultra: `/home/venetanji/.local/share/alive/builds/a8b5f67/bin/ultra`.
Both link and runtime use the shipping native library SHA-256
`69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90` from
`/tmp/alive-live-publish-native-20261031`; the old piano ABI is not used. No native
library was rebuilt. The harness clears `LD_LIBRARY_PATH` for installed Alive,
whose `/proc` mapping resolves to its adjacent copy of the same shipping bytes.
The manifest verifies 309 sources, seven resources and all three artifacts.
`cf7ac2b`, `be355bb` and `dd423bd` artifact hashes also verify unchanged.

## Extended Native Attempts

Every attempt uses a fresh private fixture/output root. Each initial fixture is
the authored bundled Subtractive renamed/id-changed to Catalog Fixture One;
the helper creates the second authored fixture only after initial indexing.

First command:

```sh
LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_DEFAULT=1 ULTRA_TEST_ALIVE_BINARY=/home/venetanji/.local/share/alive/builds/a8b5f67/bin/alive ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_alive_catalog_desktop.py ALIVE_LIVE_ROOTS='/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources' ALIVE_DEVICE_LIBRARY_PATHS=/tmp/alive-catalog-final-library-20261031 bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-catalog-final-native-20261031 > /tmp/alive-catalog-final-native-20261031.log 2>&1
```

Exit 1 in the new transaction's repeated Save As snapshot. Its missing-file
refusal reason, Audio selection, unchanged generation and history controls had
passed. `catalog-failure.png` explicitly shows GTK's overwrite confirmation for
`catalog-automatic-baseline.alive`. Helper-only fix: use unique
`catalog-automatic-refused-{missing,invalid,unsupported}.alive` names in the same
directory while retaining exact accepted-score comparison.

Second command:

```sh
LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_DEFAULT=1 ULTRA_TEST_ALIVE_BINARY=/home/venetanji/.local/share/alive/builds/a8b5f67/bin/alive ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_alive_catalog_desktop.py ALIVE_LIVE_ROOTS='/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources' ALIVE_DEVICE_LIBRARY_PATHS=/tmp/alive-catalog-final-library-retry1-20261031 bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-catalog-final-native-retry1-20261031 > /tmp/alive-catalog-final-native-retry1-20261031.log 2>&1
```

All transaction assertions and original-fixture restoration pass. The later
`drag-hover-2.png` shows Audio details, opened by transaction diagnostic reads,
covering the chain drop target. The owned helper was stopped (exit 143) before
waiting further for that obscured drop. Helper-only fix: close Audio details if
expanded after transaction restoration, before the existing bundled drag helper.
No production failure or source change was involved. Both attempt paths and
diagnostic capture hashes are preserved in `verification.json`.

Final command:

```sh
LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_DEFAULT=1 ULTRA_TEST_ALIVE_BINARY=/home/venetanji/.local/share/alive/builds/a8b5f67/bin/alive ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_alive_catalog_desktop.py ALIVE_LIVE_ROOTS='/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources' ALIVE_DEVICE_LIBRARY_PATHS=/tmp/alive-catalog-final-library-accepted-20261031 bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-catalog-final-native-accepted-20261031 > /tmp/alive-catalog-final-native-accepted-20261031.log 2>&1
```

Exit 0. Actual installed Tauri/WebKit acceptance includes:

- All 22 unavailable installed candidates, three bundled devices, initial user
  fixture and explicit refresh discovering the second fixture.
- Analog's useful reason/disabled load, real Enter/double-click/drag refusal and
  unchanged accepted score/native generation, with zero rejected commands.
- Unfiltered 26-row clipping/scrolling at 800x600 and 1280x800, Home/End and 40
  wheel-up inputs, nine footer ownership samples per size and exact settled
  footer pixel equality. All four unfiltered captures were visually inspected.
- Cached missing, invalid and unsupported user-file activation from Audio 2,
  each preserving saved score, generation, selected Audio track and history
  controls. One successful load adds MIDI 3 and its instrument atomically;
  one Undo restores the baseline and Redo restores identical score/instance ID.
  Two further Undos restore the original empty MIDI fixture.
- Existing actual track/chain/card drags, Lowpass-before-Utility order, clip/note
  creation, v6 save and scheduled playback through that chain.

Retained session snapshots were independently compared for all three refusals,
Undo, full Redo score/instance identity and original-fixture restoration. Their
authored file hashes are recorded in `verification.json`. UI observations do not
claim internal edit-revision/history-cursor inspection; the source-fix owner's
direct Rust tests establish those internals.

Raw private PCM independently verifies 173568 stereo frames at 48 kHz, peak
`0.09684687107801437`, SHA-256
`c58c9983ffc3af9d7c7fcf6be03963d55da7016625ba40ecffe991a7e94a6e9f`.
Audio stream errors and rejected commands are both zero. Recorder supervision
is complete with `requested_stop`, return code 1 and zero stderr bytes, as in the
existing recorder helper. This is private software audio, with no physical or
new realtime/native-profile qualification claim.

## Final Verification And Boundary

```sh
python3 -m py_compile apps/ultra/tests/check_alive_catalog_desktop.py
git diff --check
sha256sum -c /tmp/alive-final-fix-checkpoint.sha256
```

All pass; all four checkpoint hashes remain OK. The source-fix worker's 122 Rust
session, 162 Alive Node, 120 rendered and five native transaction passes remain
their recorded evidence and were not rerun. The final packet refreshes exact
archive/source/artifact identities, build logs, eight native captures, metadata
and transaction/drop reports; its evidence manifest covers the current files.

The four intentionally paused files remain dirty/untracked and are excluded
from this evidence commit. User windows, unsaved work, native `2a0f` state,
existing installs and mapped libraries were preserved. No production code,
native admission, launcher, push or cloud CI changed in this dispatch. Only
delivery 0 is marked complete; all remaining saved-presentation/full-hosting
milestones stay active. Controller owns the combined final review and subsequent
launcher/PR integration.
