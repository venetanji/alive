# Installed catalog delivery 0

Installed source: `be355bbeb675a725001d46b7cd401ae0d4bdbdd7` on
`feat/phase2-ui-fidelity`. Actual Linux install:
`/home/venetanji/.local/share/alive/builds/be355bb/bin/alive`.
This packet follows the approved backend and browser changes. It adds native
acceptance, documentation and a focused desktop helper; no production change
was needed. Launcher update and PR publication remain with the controller.

## Accepted behavior

The actual installed Tauri/WebKit browser discovers three bundled devices, one
private authored Ultra fixture and all 22 present Live implementation candidates.
Searching and selecting Analog shows the ownership/transport admission reason.
Load Instrument is disabled. Real Enter, double click (60 ms between clicks) and
pointer drag to the MIDI track leave the saved score and native generation
unchanged; rejected commands stay zero. Adding a second authored fixture after
indexing remains invisible until Refresh Library, which then exposes both.

The same native journey then uses actual pointer drags to load Subtractive onto
the track, append Stereo Utility and insert Stereo Lowpass before Utility. It
creates a MIDI clip/note, saves `alive-session-v6` and starts scheduled clip
playback through that chain. Private software PCM is nonzero: 197120 stereo
frames at 48 kHz, peak `0.09684687107801437`. Audio stream errors and rejected
commands are zero. The supervised recorder is complete with `requested_stop`;
its termination return code is 1, with zero stderr bytes, as recorded by the
existing recorder helper. This is software PipeWire/CPAL evidence, without a
physical audio or realtime-capacity claim.

Native client captures at 800x600 and 1280x800 were inspected. Search, Refresh,
the unavailable reason and disabled load remain reachable inside the viewport;
there is no whole-window overflow. The reason is repeated in the browser status
so it remains readable when the longer selection description clips. The private
XDG library default also contributes a missing-root notice; it does not hide the
valid explicit fixture or installed candidates.

## Identity and scope

Separate `cargo build --locked` development builds of Alive and Ultra passed
against `ULTRA_NATIVE_LIB_DIR=/tmp/alive-piano-live-edit-20261031` and
`CARGO_TARGET_DIR=/tmp/alive-live-regions-rust-target`. They retain four existing
compiler warnings. No native engine was rebuilt. The assigned link library hash
is recorded separately in `verification.json` from the approved immutable
shipping library hash `69ba16fe7af0e969a86f89f8ae94d33b767f7f47ea02ce74da7365a1dc770a90`.

The new versioned install was populated through a fresh staging directory and
atomic rename without overwriting an existing version. The manifest verifies
308 source files, seven packaged resources and all three installed artifacts.
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

The prior 159 Node, 110 Chromium and 15 Rust provider passes remain their
existing evidence and were not repeated. The new desktop helper passes Python
compilation and the final installed native journey exits 0. An initial owned
run was stopped (143) after diagnostic reads left Audio details open, obscuring
the bundled chain drop. The helper closes diagnostics before captures and
before the bundled journey; no product source changed for that correction.

Full final private artifacts, including authored session snapshots and raw PCM,
remain at `/tmp/alive-catalog-native-final-20261031`; the first attempt remains
at `/tmp/alive-catalog-native-20261031`. No proprietary binary, preset/resource
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
ULTRA_TEST_ALIVE=1 ULTRA_TEST_ALIVE_DEFAULT=1 \
ULTRA_TEST_ALIVE_BINARY=/home/venetanji/.local/share/alive/builds/be355bb/bin/alive \
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
