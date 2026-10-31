# Final Catalog Fix Report

Status: source fixes and scoped verification complete. Controller re-review and
fresh immutable desktop acceptance remain separate. BASE:
`7d2259ee4985ded2d1fab04733889becf0f7457d`. Worktree:
`/home/venetanji/.codex/worktrees/phase2-ui/alive`, branch
`feat/phase2-ui-fidelity`.

## Changes And Affected APIs

- The shared saved-device descriptor boundary rejects non-UTF-8 resolved paths
  before reading them. Both user and bundled descriptors retain their existing
  stable ID, but expose `path:null`, `availability:"unavailable"`,
  `qualification:"unsupported"` and an explicit UTF-8 reason. Lossy display text
  never becomes an executable path. Limits, canonical deduplication and discovery
  without DSP construction remain intact. The filesystem test includes a bad
  filename, a bad ancestor/root, a bundled symlink resolving into that ancestor,
  a ready UTF-8 neighbor, complete Page JSON serialization and refresh identity.
- `alive_device` retains its current arguments and Snapshot return type and adds
  action `loadNewTrack`. Its `trackId` names the existing insertion anchor;
  `instanceId` and `beforeInstanceId` must be absent/null. Under the existing
  serialized Control owner, generation/edit revision/pending/stopped checks and
  unchanged track/device capacity admission precede dependency access. A MIDI
  track exists only in the candidate while capture, source fingerprint checks,
  full preparation and native admission run. A single successful full install
  accepts the track and instrument together, with one `Insert MIDI instrument`
  history entry. No preliminary accepted track, frontend deletion, generic Undo
  rollback, separate preflight IPC or later fallible file load is used.
- Existing load/replace/add/remove/reorder operations now share the extracted
  `Control::device_edit` implementation with the IPC wrapper. Picker cancellation
  returns an unchanged accepted owner. Explicit instrument drops onto Audio
  remain refused. The common logical-track insertion helper is reused by
  `alive_workspace_track`; that command's API and musical publication route are
  unchanged.
- `alive_history` keeps its arguments and Snapshot return. A target that changes
  device roots uses stopped full preparation/install and adopts the advanced
  cloned history only after success. Ordinary musical history keeps its existing
  publication/acknowledgement route. Pending or rolling structural Undo/Redo and
  missing/changed Redo sources refuse without moving the accepted cursor. A
  successful structural history action invalidates/closes stale hosted editors
  through the same generation policy as other installed device graph edits.
- History reserves instrument/effect instance IDs even while their tracks are
  undone. Internal `History::rebase_audio_paths` becomes `rebase_paths`, rebasing
  captured device records as well as audio source records during Save As. Redo
  therefore recreates the same captured identity and fingerprint from the
  correct location. Surviving instance base/bypass and track mix values retain
  the current live-field semantics.
- Browser activation and `Open instrument...` now send one `alive_device`
  transaction for automatic creation. Empty MIDI destinations and explicit drops
  keep their existing load/replace behavior. Selection after insertion uses
  stable track identity and the existing newer-selection token. Selection is
  clamped before editor projection so Undo of the last newly created track can
  render its surviving destination. Current rendered fixtures implement the new
  action directly; no old IPC or schema fallback was introduced.
- `check_alive_catalog_desktop.py` now adds real-input cached missing/invalid/
  native-source refusal from an Audio anchor, unchanged accepted score/native
  generation/selection/history controls, successful compound Undo/Redo identity,
  and two Undos restoring the original empty MIDI fixture before the existing
  drag/audio journey. This helper was syntax checked; it has not been run against
  a rebuilt app in this dispatch.

## Frozen Runtime Correction

The brief's original piano runtime rejects the current source's v4 configuration
header. The initial new transaction fixture and an independent existing
`master_failed_install_rolls_back_gain_and_receipt` probe both failed at initial
example installation with:

```text
Workspace playback refused the complete candidate: Invalid v4 configuration header. (resource 0, observed 0, limit 0).
```

The controller corrected the authorized frozen link/runtime directory to
`/tmp/alive-live-publish-native-20261031` for both `ULTRA_NATIVE_LIB_DIR` and
`LD_LIBRARY_PATH`, retaining
`CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target`. Its library SHA-256 is
`69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90`, matching
the shipping dd423bd runtime. The old piano library remains
`5786ef4b55c07a4812d94082766f3ad30ac4e1dd70cb9c3ff1672e0336b4375d`.
Neither library was modified or rebuilt. This was a test-path correction, not a
compatibility fallback or production failure.

Corrected baseline confirmation:

```sh
ULTRA_NATIVE_LIB_DIR=/tmp/alive-live-publish-native-20261031 LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib session::desktop::tests::master_failed_install_rolls_back_gain_and_receipt -- --exact --nocapture > /tmp/alive-final-fix-frozen-corrected-probe.log 2>&1
```

Exit 0: `1 passed; 0 failed; 0 ignored; 0 measured; 288 filtered out`.

## Red/Green Evidence

All commands ran from the assigned worktree. Named `/tmp` logs retain full
output; output excerpts here omit routine compiler/HTTP-server noise.

Non-UTF-8 page test, before and after the shared descriptor encoding check:

```sh
ULTRA_NATIVE_LIB_DIR=/tmp/alive-piano-live-edit-20261031 LD_LIBRARY_PATH=/tmp/alive-piano-live-edit-20261031 CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib session::browser::tests::non_utf8_saved_paths_are_isolated_in_serializable_pages -- --exact --nocapture > /tmp/alive-final-fix-utf8-red.log 2>&1
ULTRA_NATIVE_LIB_DIR=/tmp/alive-piano-live-edit-20261031 LD_LIBRARY_PATH=/tmp/alive-piano-live-edit-20261031 CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib session::browser::tests::non_utf8_saved_paths_are_isolated_in_serializable_pages -- --exact --nocapture > /tmp/alive-final-fix-utf8-green.log 2>&1
```

```text
RED exit 101: one unsupported path must not poison its page: Error("path contains invalid UTF-8 characters", line: 0, column: 0)
test result: FAILED. 0 passed; 1 failed; 0 ignored; 0 measured; 285 filtered out
GREEN exit 0: test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 285 filtered out
```

Native transaction regression, using the corrected shipping runtime. The red
comparison used the extracted original device-edit semantics without the new
action; the compound-action implementation was then restored for green:

```sh
ULTRA_NATIVE_LIB_DIR=/tmp/alive-live-publish-native-20261031 LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib session::desktop::device_transactions -- --nocapture > /tmp/alive-final-fix-transaction-red-corrected.log 2>&1
ULTRA_NATIVE_LIB_DIR=/tmp/alive-live-publish-native-20261031 LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib session::desktop::device_transactions -- --nocapture > /tmp/alive-final-fix-transaction-green.log 2>&1
```

```text
RED exit 101: transaction must reach real missing file admission: An explicit device instance ID is required
test result: FAILED. 0 passed; 3 failed; 0 ignored; 0 measured; 286 filtered out
GREEN exit 0: test result: ok. 5 passed; 0 failed; 0 ignored; 0 measured; 286 filtered out
```

The final five tests include ready catalog entries whose real files are removed,
invalidated or changed to unsupported Voice graphs from both Audio and occupied
MIDI anchors; an injected failure after native reset with successful rollback;
one history entry, Undo and same-identity Redo from each anchor; changed-file
Redo refusal without cursor movement; Save As while undone; surviving live
base/mix/bypass; stale generation/revision/track guards, cancellation, explicit
Audio drop refusal, rolling structural Undo and pending publication refusal.
Retention snapshots include serialized accepted score, generation/revision,
dirty flag, history view, both adjacent history targets and reserved identities.

The first native success test ran both anchors with new Host owners in the same
process, which reused already consumed native canvas revision 1 on its second
initial installation. The cases now use separate existing fresh-process wrappers
and both execute fully. No native revision/capacity policy was weakened.

Rendered automatic activation tests were red against the original frontend,
before the compound action and current fixture implementation:

```sh
env ALIVE_TEST_PORT=4198 ULTRA_TEST_NO_CAPTURES=1 apps/ultra/tests/ci/node_modules/.bin/playwright test --config apps/ultra/tests/ci/playwright.config.mjs apps/ultra/tests/ci/alive-chain.spec.mjs --grep 'automatic instrument activation' --output=/tmp/alive-final-fix-browser-red > /tmp/alive-final-fix-browser-red.log 2>&1
env ALIVE_TEST_PORT=4198 ULTRA_TEST_NO_CAPTURES=1 apps/ultra/tests/ci/node_modules/.bin/playwright test --config apps/ultra/tests/ci/playwright.config.mjs apps/ultra/tests/ci/alive-chain.spec.mjs --grep 'automatic instrument activation' --output=/tmp/alive-final-fix-browser-green > /tmp/alive-final-fix-browser-green.log 2>&1
```

```text
RED exit 1: 8 failed
Refusal state diff: dirty false -> true, extra MIDI track with instrument:null, advanced revision/history.
Success command diff: [alive_workspace_track, alive_device] instead of one alive_device/loadNewTrack.
GREEN exit 0: 8 passed (7.2s)
```

These are six cached user-file refusal cases and two successful one-track loads
with compound Undo/Redo. The first green run was 7/8: Audio-anchor Undo removed
the final selected track and exposed the projection-before-clamp error. Moving
the existing selection clamp before projection fixed that exercised behavior.

Node automatic activation/newer-selection/picker regressions were run against
BASE's actual `alive.mjs`, then against the restored final frontend:

```sh
node --test --test-name-pattern='automatic instrument' apps/ultra/ui/alive-dom.test.mjs > /tmp/alive-final-fix-node-red.log 2>&1
node --test --test-name-pattern='automatic instrument' apps/ultra/ui/alive-dom.test.mjs > /tmp/alive-final-fix-node-focused.log 2>&1
```

```text
RED exit 1: tests 3, pass 0, fail 3; unexpected alive_workspace_track/addMidi publication
GREEN exit 0: tests 3, pass 3, fail 0
```

## Affected Suites And Checks

Ran the affected suites once after implementation. The final focused native
rerun only strengthened its failure-reason/history-target assertions and passed
5/5; it did not change production behavior.

```sh
ULTRA_NATIVE_LIB_DIR=/tmp/alive-live-publish-native-20261031 LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib session:: -- --test-threads=1 > /tmp/alive-final-fix-rust-suite.log 2>&1
node --test apps/ultra/ui/alive*.test.mjs > /tmp/alive-final-fix-node-suite.log 2>&1
env ALIVE_TEST_PORT=4198 ULTRA_TEST_NO_CAPTURES=1 apps/ultra/tests/ci/node_modules/.bin/playwright test --config apps/ultra/tests/ci/playwright.config.mjs apps/ultra/tests/ci/alive-chain.spec.mjs apps/ultra/tests/ci/alive-clip-regions.spec.mjs --output=/tmp/alive-final-fix-browser-suite > /tmp/alive-final-fix-browser-suite.log 2>&1
python3 -m py_compile apps/ultra/tests/check_alive_catalog_desktop.py
rustfmt --edition 2021 --config skip_children=true --check apps/ultra/src-tauri/src/session/browser.rs apps/ultra/src-tauri/src/session/browser/providers.rs apps/ultra/src-tauri/src/session/browser/tests.rs apps/ultra/src-tauri/src/session/desktop/device_transactions.rs
git diff --check
sha256sum -c /tmp/alive-final-fix-checkpoint.sha256
```

```text
Rust exit 0: test result: ok. 122 passed; 0 failed; 0 ignored; 0 measured; 169 filtered out; finished in 15.77s
Node exit 0: tests 162, pass 162, fail 0
Rendered exit 0: 120 passed (2.1m)
Python syntax, touched formatted files and diff checks: exit 0
All four presentation checkpoint SHA-256 checks: OK
```

## Self-Review And Remaining Boundary

The four intentional presentation checkpoint files retain their exact original
contents and are excluded from commits. No unrelated presentation tests, app
build/install, runtime or mapped-library modification, native worktree change,
launcher/window/user-config operation, cloud CI or push occurred. Only Rust test
targets were compiled and run. Existing compiler warnings for `SaveSnapshot`
and the runtime `write` signature remain baseline noise.

Self-review traced all accepted-state assignments: the transaction mutates only
local score/history candidates before install, source files are never reopened
after the complete prepared graph has been accepted, and structural history
adopts its cloned cursor only after success. Existing musical history keeps
publication acknowledgement, live values and stable scope checks. Successful
native rollback retains existing Master receipt semantics; no new rollback
mechanism was invented.

Catalog metadata remains a discovery/admission hint; the final captured file and
existing source fingerprint checks remain authoritative. The changed cached-file
case exercised here is a file changed to an unsupported graph, and Redo also
refuses a changed captured source. This adds no new qualification or native
capacity and makes no claim about physical audio or newly admitted profiles.

The remaining validation is the controller-owned fresh immutable app build and
real desktop execution of the extended catalog helper. Its UI observations do
not expose edit revision/history internals; those are asserted directly by the
Rust owner tests. Review this fix range before that acceptance.
