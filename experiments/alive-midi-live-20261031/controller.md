# Controller Integration Check

The parent independently runs the frozen implementation after review fixes:

- `node --test apps/ultra/ui/alive*.test.mjs`: 168 pass, zero failures.
- Direct worker-built Rust test executable with the current native library:
  `session:: --test-threads=1`: 139 pass, zero failures. This includes the real
  native transaction/history regression; Cargo's shared target/library paths
  are not used.
- Frozen native `midi-test`: 17 scenarios pass source reconciliation, stopped Preview PCM,
  ownership, phase, refusal, deletion and AudioStop receipt checks with callback
  allocation/free/mutex guards. Its local 32-sample, 256-frame reconciliation
  measurement reaches 243.6us maximum against a 5333.3us block duration. This
  sample does not establish a worst-case or physical-audio guarantee.
- Independent native/history/UI review has no unresolved confirmed findings;
  original red reproductions and corrected results are in the review report.
- Parent panel checks pass separately: 15 focused browser cases and the real
  Tauri/WebKit journey at three sizes. See `../alive-detail-20261031`.

The worker also supplies current launch and V4 admission regression results,
12 focused browser cases and the real isolated desktop MIDI journey. The parent
inspects its report and code, including native PCM capture, playing note edits,
Undo/Redo, Save/reopen, Stop and zero stream errors. Software PipeWire capture
does not establish physical playback. No cloud CI, endurance rerun, release,
merge or tag is performed for this change.

Production sources are frozen for integration. Alive and Ultra are rebuilt
against the same owned native library. Artifact/source hashes are in the
adjacent manifest files; the installed versioned launcher manifest records
the integration commit and installed hashes separately. Existing user windows,
the other active checkout and its developer native-library symlink are preserved.
