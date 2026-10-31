# Live Clip Regions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make ordinary typed track creation, MIDI clip creation and MIDI/audio
range/loop editing immediate during playback, following Live's controls.

**Architecture:** Prepare immutable complete workspace schedules and PCM outside
audio, publish them against retained roots, then commit Rust document/history
on the matching native APPLIED receipt. A shared occurrence region drives UI,
proof and playback while leaving source content intact.

**Tech Stack:** Rust/Tauri, C++ native DSP, JavaScript/DOM/CSS.

**Spec:** `docs/superpowers/specs/2026-10-31-live-clip-regions.md`

## Global Constraints

- No migrations or backward schema/ABI compatibility; current examples evolve.
- Keep six DSP roots, 32 events/frame and 64 events/1024 frames; sparse logical
  track storage may reach eight. Do not admit profile 2.
- Preserve user work, user windows, original repository and shared .so symlink.
- No cloud CI dispatch, merge, release, tag or deployment.
- Work in `/home/venetanji/.codex/worktrees/phase2-ui/alive`.

## Task 1: Native Regions, PCM And Schedule Publication

Owner: native agent. Files: native/alive_session_workspaces.h/.hpp,
alive_session.hpp, alive_session_midi.hpp, alive_session_workspace_envelope.hpp,
backend.cpp and focused native tests. Produces `alive_session_publish_v4` and
`alive_session_publication_state_v4`, request size592 and state size64 per spec;
occurrence markers are start_marker/end_marker/loop_start/loop_end.

- [x] Add regressions for intro then loop, live sparse track/source insertion,
  preserved pending launches/roots and known PCM samples; witness missing behavior.
- [x] Implement normalized immutable bank access, stable remapping, bounded
  reconciliation and exact coherent receipts, then run focused tests/guards.
- [x] Review native spec/correctness independently and resolve confirmed issues.

## Task 2: Saved Regions, Empty Tracks And WAV Preparation

Owner: model agent. Files: session/workspaces.rs, workspace_edits.rs,
workspaces_tests.rs, prepare.rs, prepare_workspaces.rs, document.rs, new WAV
module and current examples. Consumes native marker names. Produces
ClipRegionV4, optional instruments, atomic MIDI-clip edit and retained PCM owners.

- [x] Add failing model tests for non-destructive loop selection, independent
  Start and empty MIDI, plus malformed/count/float WAV cases.
- [x] Implement current schema and compile source-beat markers/PCM into native
  prepared frame regions. Retain device order during musical recompilation.
- [x] Verify model/preparation cases and update current fixtures without converters.

## Task 3: Immediate Desktop Transactions And History

Owner: parent. Files: session/native_v4.rs, new publication bindings,
host.rs, desktop.rs, desktop/midi.rs and history.rs.

- [x] Add a regression that track insertion Undo restores by ID and preserves
  current gain/device settings; add live full-publication APPLIED tests.
- [x] Build candidate config/maps using stable IDs and retained root order;
  queue native publication and hold PCM owners until retirement.
- [x] Generalize the note transaction to ordinary workspace edits and history.
  Make typed rootless track insertion live; keep graph installation separate.
- [x] Add actual WAV import command on the control worker, expose audio metadata
  and waveform peaks, and remove ordinary musical draft confirmation.
- [x] Run focused Rust/native integration checks including rolling creation,
  pending launches, exact commit, Undo/Redo and Stop cancellation.

## Task 4: Editor Controls And Familiar Commands

Owner: UI worker after reference seat is free; parent integrates. Files:
alive.mjs, alive-piano*.mjs/css, alive-timeline.mjs, alive.html/shell.css and tests.

- [x] Add failing controller tests for shortcuts, atomic MIDI clip creation,
  selected range Ctrl+L and independent markers.
- [x] Add shared range/brace/marker interaction for MIDI/audio and Arrangement
  selection-to-loop. Route Ctrl+T/Ctrl+Shift+T outside text inputs.
- [x] Use actual source/audio metadata, explicit Re-Pitch UI and waveform.
  Remove Prepare/Apply dependence for ordinary musical gestures.
- [x] Verify native desktop commands and editor appearance at 800x600 and larger
  sizes, retaining the already implemented resizable/maximizable lower panel.

## Task 5: Review, Verify And Deliver

- [x] Independently review integrated native/model/host/UI behavior and fix
  confirmed issues, with focused retests.
- [x] Run appropriate session, Node, native shipping and actual desktop journeys.
- [x] Record evidence/limitations, update roadmap, commit and push existing draft
  PR branch; build/install immutable launcher artifacts without closing user work.


## Verification Receipt

- Node: 188 passed; current-library Rust session suite: 159 passed.
- Chromium: six region journeys at 800x600, 1280x800 and 1440x1000 passed.
- Native publication/MIDI/launch/shipping/layout and scalar oracle passed;
  independent scalar oracle: 110,195,654 assertions.
- Actual Tauri/WebKit/CPAL journey passed rolling creation, markers, stereo WAV
  capture, Arrangement Ctrl+L/Ctrl+Shift+M, Undo/Redo and Save/Reopen. Zero stream
  errors and rejected commands. Source notes remain unchanged.
- Native gap-bound overcount and five UI selection/scope/capacity findings were
  fixed and independently re-reviewed. No remaining confirmed review finding.
- Evidence and delivery artifact identities:
  `experiments/alive-clip-regions-20261031/README.md`.

The final delivery step uses the existing draft PR and immutable local launcher
installation. It dispatches no cloud build and leaves existing user windows open.
