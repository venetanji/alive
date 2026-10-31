# Alive Current Model Cleanup

The user authorized removing obsolete Alive iterations without preserving old
file formats, conversion flows or compatibility entrypoints. Keep the existing
Live-style workspace and immediate musical editing behavior.

- [x] Verify launcher identity, installed build and both checkout statuses.
- [x] Remove old document models, conversion IPC, draft Apply/Discard and old
  save envelopes. Support the v6 envelope with its v4 workspace score directly.
- [x] Remove old UI branches and controls; retain current MIDI/audio tracks,
  clip regions, Arrangement, quantization, Preview and responsive detail sizing.
- [x] Author all bundled examples in the current format, refresh active docs,
  and adapt staging/release/desktop tests to the current workflow.
- [x] Review the combined changes and run Node, Rust, browser and packaged
  desktop verification appropriate to the cleanup.
- [ ] Commit and push draft PR #6, install a versioned verified local build and
  verify the Omarchy launcher resolves that executable.

## Ownership And Boundaries

All edits belong in `/home/venetanji/.codex/worktrees/phase2-ui/alive`.
The main checkout and native-device session's worktrees are read-only here.
Do not replace shared native-library symlinks or stop user application windows.
Keep native ABIs that the current engine, probes or regression tests still use;
remove obsolete app workflows rather than unrelated Ultra functionality.

The session-host worker owns Rust, the UI worker owns HTML/CSS/JS and browser
tests, the harness worker owns Python verification/release scripts, and the
parent owns examples, documentation, packaging configuration and installation.
Review the integrated result before publication. Do not dispatch cloud CI,
merge, tag or release. Historical experiment evidence remains attributable.
