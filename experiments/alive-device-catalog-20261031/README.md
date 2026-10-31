# Installed catalog delivery 0

Installed source: `a8b5f67f2e1cc3052dce76ff704b102ffbfac457` on
`feat/phase2-ui-fidelity`. Actual Linux install:
`/home/venetanji/.local/share/alive/builds/a8b5f67/bin/alive`.
This packet requalifies the catalog, unfiltered containment, non-UTF-8 descriptor
refusal and atomic automatic MIDI-track/instrument loading fixes. This evidence
follow-up changes only the native helper, reports/captures and roadmap. Launcher
update and PR publication remain with the controller.

## Accepted behavior

The actual installed Tauri/WebKit browser discovers three bundled devices, one
private authored Ultra fixture and all 22 present Live implementation candidates.
Searching and selecting Analog shows the ownership/transport admission reason.
Load Instrument is disabled. Real Enter, double click (60 ms between clicks) and
pointer drag to the MIDI track leave the saved score and native generation
unchanged; rejected commands stay zero. Adding a second authored fixture after
indexing remains invisible until Refresh Library, which then exposes both.

From an Audio anchor, the cached ready fixture is then removed, invalidated and
changed to an unsupported Voice graph without refreshing. Each real Enter
activation refuses while preserving the accepted two-track score, native
generation, Audio selection and Undo/Redo controls. Restoring the file lets one
activation add MIDI 3 and its instrument together. One Undo restores the baseline;
Redo recreates the exact score and instrument instance identity. Two further
Undos restore the original empty MIDI fixture. Retained saved snapshots were
independently compared, with hashes in `verification.json`. UI evidence does not
expose edit revision/history internals; the native owner tests cover those.

The same native journey then uses actual pointer drags to load Subtractive onto
the track, append Stereo Utility and insert Stereo Lowpass before Utility. It
creates a MIDI clip/note, saves `alive-session-v6` and starts scheduled clip
playback through that chain. Private software PCM is nonzero: 173568 stereo
frames at 48 kHz, peak `0.09684687107801437`. Audio stream errors and rejected
commands are zero. The supervised recorder is complete with `requested_stop`;
its termination return code is 1, with zero stderr bytes, as recorded by the
existing recorder helper. This is software PipeWire/CPAL evidence, without a
physical audio or realtime-capacity claim.

Native unfiltered client captures at 800x600 and 1280x800 were inspected at both
scroll positions. The 26 initial rows use an internally scrolling list that clips above the
selection/load/status footer. Home/End reveals the last candidate, Utility;
40 actual wheel-up inputs return to the first row while preserving that later
selection. Nine footer hit samples per size belong to description/load/status,
with no list/row ownership. The entire settled footer pixel band remains exactly
identical across scrolling. The compact list is 98px high, the normal list 298px;
Utility moves from y=855 to y=250/450 through actual scrolling. Four explicit
unfiltered captures supplement the two filtered Analog captures and the refreshed
empty-MIDI/chain captures. Search, Refresh, the unavailable reason and disabled
load remain reachable; there is no whole-window overflow. The reason is repeated
in the browser status
so it remains readable when the longer selection description clips. The private
XDG library default also contributes a missing-root notice; it does not hide the
valid explicit fixture or installed candidates.

## Identity and scope

Separate `cargo build --locked` development builds of Alive and Ultra passed
from `/tmp/alive-catalog-final-source-a8b5f67-20261031`, a fresh `git archive` of
the exact committed source. All 8733 archived files match fixed git blobs before
and after compilation. The four paused presentation checkpoint changes in the
working tree were preserved and excluded: archived `canvas_tests.rs` uses the
committed blob, and the three untracked presentation files are absent.
`source_worktree` and `build_source_archive` name the actual archive build root.
The manifest includes selected source git blob IDs, their SHA-256 values, fixed
tree identity and archive-tar hash; `archive-verification.json` records the full
archive verification and preserved checkpoint hashes.

Both linking and execution use the approved shipping native library from
`/tmp/alive-live-publish-native-20261031`, SHA-256
`69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90`.
The owned Cargo target remains `/tmp/alive-live-regions-rust-target`. The builds
retain four existing compiler warnings; no native engine was rebuilt. The
installed Alive launch clears `LD_LIBRARY_PATH` in the existing harness and maps
its adjacent installed copy of that same shipping library, verified via `/proc`.

The new versioned install was populated through a fresh staging directory and
atomic rename without overwriting an existing version. The manifest verifies
309 source files, seven packaged resources and all three installed artifacts.
The running `/proc/<pid>/exe` and mapped native library resolve to this exact
install. The helper rechecks all artifact hashes while the process runs; its
maps contain no DLL or Max external mapping. The existing private startup test
also passes using the adjacent installed Ultra binary.

Source integration review confirms the catalog command uses `spawn_blocking`
with a cache separate from session/audio ownership; saved graph preparation
validates metadata and creates Rust graph data without native construction or
installation. Live discovery inspects known artifact metadata only. Browser
activation and drag admission both reject unavailable candidates. Native score
and generation stability corroborate this boundary; this packet does not claim
constructor instrumentation or foreign DSP qualification.

The source-fix worker records 122 Rust session, 162 Alive Node, 120 rendered and
five focused native transaction passes. Those suites were not repeated here.
The helper passes Python compilation and the final installed native journey
exits 0. The earlier `be355bb` filtered-only layout conclusion remains superseded
by full-list checks. Existing pointer parking and the bounded two-second footer
pixel-stability check retain strict equality without masks or tolerances.

Two final native attempts required helper-only corrections. The first reused a
baseline Save As filename and stopped at GTK's overwrite confirmation after
missing-file refusal assertions passed. Each refusal now saves to a distinct
filename in the same directory, retaining exact score equality. The second
passed the complete transaction/Undo/Redo/restoration checks, then was stopped
when transaction diagnostic reads left Audio details over the chain drag target.
The helper now closes that expanded pane before the bundled journey. No product
source changed. `verification.json` records both paths, capture hashes and
diagnoses; earlier clipping/settling attempts remain in the Task 3 history.

Full final private artifacts, including authored session snapshots and raw PCM,
remain at `/tmp/alive-catalog-final-native-accepted-20261031`. The first final
attempt remains at `/tmp/alive-catalog-final-native-20261031`, and the second at
`/tmp/alive-catalog-final-native-retry1-20261031`. Older attempts also remain at
their original paths. The immutable `dd423bd`, `be355bb` and `cf7ac2b` artifacts
were verified unchanged; neither install was overwritten. No proprietary binary,
preset/resource
payload, disassembly or private daemon state is included here. All test display,
bus, configuration and software audio resources are private; user desktop
windows and unsaved work were preserved. CI was not dispatched.

## Reproduce

Create a fresh owned fixture directory under `/tmp` whose name starts with
`alive-catalog-`. Copy the authored `apps/ultra/examples/subtractive.ultra` to
`one.ultra`, changing its `device.id` to `org.alive.catalog-fixture-one` and its
`device.name` to `Catalog Fixture One`. It must contain no `two.ultra` before
each run. The helper creates that second fixture to prove refresh invalidation.

```sh
LD_LIBRARY_PATH=/tmp/alive-live-publish-native-20261031 \
ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_DEFAULT=1 \
ULTRA_TEST_ALIVE_BINARY=/home/venetanji/.local/share/alive/builds/a8b5f67/bin/alive \
ULTRA_TEST_SCRIPT=$PWD/apps/ultra/tests/check_alive_catalog_desktop.py \
ALIVE_LIVE_ROOTS='/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources' \
ALIVE_DEVICE_LIBRARY_PATHS=/tmp/alive-catalog-library-NEW \
bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-catalog-native-NEW
```

Only catalog delivery 0 is complete. All 22 native candidates remain unavailable.
The saved-presentation spec/plan in this source is planning only. Shared saved
presentation, Analog bank ownership/state/transport, other profiles, native audio
input, MIDI routing and composite preset/rack import remain active requirements
in the [hosting ledger](../native-devices-20261031/alive-device-hosting.md).
