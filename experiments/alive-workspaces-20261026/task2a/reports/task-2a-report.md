# Task 2A Implementation Report

## Result And Freeze

- Source base: `f0fb9e5` on `feat/alive-session-host`.
- Source commit: `b34615c` (`Add prospective v4 workspace model and transactional edits`).
- Source and index are frozen after this commit. This report is written after the source commit for the controller to retain with its evidence/docs.
- Owned source files: `apps/ultra/src-tauri/src/session/mod.rs`, `apps/ultra/src-tauri/src/session/workspaces.rs`, `apps/ultra/src-tauri/src/session/workspaces_tests.rs`.
- Registration adds only `pub mod workspaces`; active `Document`, old decoders, native ABI/capabilities, DSP, scheduling, IPC and UI are unchanged.
- Controller's concurrent `docs/superpowers/plans/alive-workspaces-20261026.md` changes are preserved and were not staged in this source commit.

## Implemented APIs

All APIs below live in `session::workspaces`.

- Wire types: `ProjectV4`, `TrackV4`, `ChainV4`, `SourceV4`, `AudioFileV4`, `DecimalU64`, `SourceOffsetV4`, `SlotV4`, `PlacementV4`, `OccurrenceV4`, `WorkspaceEditV4` and `EditResultV4`.
- `decode(&str)` performs the 1 MiB check, original-text duplicate-map-member pass, strict typed decode and pure model validation. `decode_edit(&str)` uses the same strict pass for focused operations. No permissive Value dispatch or flatten is used in production.
- `encode(&ProjectV4)` validates and returns strict v4 JSON, checking the resulting pretty JSON byte limit. This is a prospective serialize API; app Save/Open has not been enabled for v4.
- `ProjectV4::validate()` checks global identities, ownership/kinds, descriptor shape, byte limits, transport and loop braces, notes and automation, aggregate bounds, exact endpoint timing, suffix offsets/periods and placement overlap/duration.
- `frame_at(beat, tempo)` uses exactly `round(beat * 48000.0 * 60.0 / tempo)` with nonnegative Rust half-away rounding and explicit finite/range checking before the integer cast.
- `ProjectV4::identities()` supplies current identities for controller bookkeeping. `ProjectV4::reference_ids(source_id)` supplies the stable referring slot/placement IDs; its length is the source reference count.
- `prospective_from_document(&Document)` clones through the existing v2-to-v3 conversion where needed, then performs deterministic v3-to-v4 mapping. It returns a candidate only and preserves the input. `prospective_from_legacy_text(text, origin)` first calls the unchanged old decoder; v1 retains its existing strict source resolution.
- `apply_edit(project, operation, reserved_ids)` returns an owned `EditResultV4 { project, affected_ids }`. `apply_edit_with(..., mint)` injects deterministic IDs for tests or another control owner. Every minted ID is validated and checked against current, previously minted and supplied reserved identities; repeated collisions reject after 1024 attempts.
- The caller must include prepared, draft and retained-history identities in `reserved_ids`. The pure model does not own desktop history. Exact before/after snapshots preserve IDs for later undo integration.
- All declared focused MIDI/source/slot/placement/transport/presentation operations are implemented. Source-wide changes report referring occurrence IDs. Duplicate Slot and Duplicate Placement share the source. Make Independent changes only the named occurrence's source reference, mints source/note IDs, retains the occurrence ID and clones audio descriptors without claiming PCM ownership.

## Controller Rulings Applied

1. Stored event counting follows existing semantics without creating event objects: one note-on, an additional note-off only when `F(beat + duration) < F(source_length)`, plus points in enabled lanes. Disabled lanes/points still spend saved per-track aggregate capacity. Totals use checked additions. Tests cover 1024/1025 events and a beat endpoint before source end whose compiled frame equals the source-end frame.
2. Conversion is prospective only. Wire device data cannot prove graph eligibility, and the current parameter map may omit legitimate manifest-default bases. Pure validation checks instance ownership, safe keys, duplicate targets, finite values and increasing distinct source frames. Parameter existence/type/range and graph eligibility remain mandatory resolved preparation gates in Task 2D. No device-ID inference or key-presence requirement is added.
3. `SlotAssign` assigns an empty cell and creates a fresh slot ID. Occupied cells reject with the existing stable slot ID and delete-then-assign guidance. `SlotUpdate` retains the named occurrence ID and changes only its declared fields. Tests verify the rejected project's exact continuity and a subsequent delete/assign producing a new occurrence identity.

## Verification Environment And Commands

Working directory for all commands: `/home/venetanji/.codex/worktrees/edd5/alive`.

Existing native library: `/home/venetanji/.codex/worktrees/edd5/alive/apps/ultra/build/libultra_native.so`.
SHA-256: `4c54e3e0a2e7bf2007a56620d1006658e97b86d5f8828e08f13e9ffd3a1e9e70`.
No native build, GUI run, feature flag, fake dependency or stub library was introduced.

All cargo commands use this environment prefix:

```sh
env ULTRA_NATIVE_LIB_DIR=/home/venetanji/.codex/worktrees/edd5/alive/apps/ultra/build LD_LIBRARY_PATH=/home/venetanji/.codex/worktrees/edd5/alive/apps/ultra/build
```

Focused command after that prefix:

```sh
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib session::workspaces::tests -- --test-threads=1
```

Final regression command after that prefix:

```sh
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib session:: -- --test-threads=1
```

Formatting/check commands:

```sh
rustfmt --edition 2021 --config skip_children=true apps/ultra/src-tauri/src/session/workspaces.rs apps/ultra/src-tauri/src/session/workspaces_tests.rs
rustfmt --edition 2021 --config skip_children=true --check apps/ultra/src-tauri/src/session/workspaces.rs apps/ultra/src-tauri/src/session/workspaces_tests.rs
git diff --check
git diff --cached --check
```

Formatting/check commands exit 0. Final Rust tests emit one existing `suspicious_runtime_symbol_definitions` warning at `src/audio.rs:420`; it concerns the pre-existing runtime `write` declaration. No new warnings remain in the final test build.

## Red/Green Evidence

All logs/artifacts are new files under `/tmp/alive-workspaces-task2a`; prior evidence was not overwritten.

| Log | Command/filter | Observed result |
| --- | --- | --- |
| `01-red-api.log` | Focused command | Expected compile-stage missing API/type errors before definitions existed; supporting API evidence, not a behavioral failure claim. |
| `02-red-behavior.log` | Focused command, strict schema plus not-implemented decoder/edit stubs | 2 passed, 7 failed; failures show `V4 decoding not implemented` or unavailable expected validation behavior. |
| `03-green-foundation.log` | Focused command | 9 passed, 0 failed. |
| `04-red-migration-api.log` | Focused command | Expected compile-stage missing prospective conversion APIs; supporting API evidence only. |
| `05-red-migration-behavior.log` | Focused command with conversion stubs | 14 passed, 2 failed; both migration tests fail with `Prospective workspace conversion not implemented`. |
| `06-green-migration.log` | Focused command | 16 passed, 0 failed. |
| `07-boundaries.log` | Focused command | 21 passed, 0 failed. |
| `08-red-occupied-id.log` | `session::workspaces::tests::occupied_slot` | 0 passed, 1 failed; old error omitted the occupied slot ID and delete/assign guidance. |
| `09-green-complete.log` | Focused command | 22 passed, 0 failed. |
| `11-green-session-regressions.log` | Final `session::` command after restoring mutations and formatting/refactoring | 75 passed, 0 failed, 162 filtered; 22 new focused tests and 53 existing session regressions. |
| `12-rustfmt-check.log` | Formatting check | Exit 0, empty output. |

Additional tests were extended after the initial implementation; their targeted negative sensitivity was checked by controlled temporary source regressions, restored in a `finally` block before the final 75-test run. This is distinguished from the initial test-first red runs above.

`mutation_checks.py` and `10-mutation-results.json` record exact mutation strings and command arrays. Each uses the same environment prefix and `cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --lib session::workspaces::tests::<filter> -- --test-threads=1`. Every mutation produced one intended runtime test failure, exit 101, rather than a compile error:

| Mutation log suffix | Regression introduced | Filter |
| --- | --- | --- |
| `duplicates` | Remove original-text duplicate pass; nested parameter map loses a duplicate member | `wire_rejects` |
| `decimal` | Accept a leading-zero decimal string representing an otherwise valid audio length | `wire_rejects` |
| `event-cap` | Permit 1025 stored source events | `source_event_pool` |
| `source-end` | Always count note-off even when endpoint rounds to the source end | `source_event_pool` |
| `held-notes` | Permit five simultaneously held notes | `notes_reject` |
| `endpoint-duration` | Compare independently rounded duration instead of endpoint difference | `endpoint_difference` |
| `operation-order` | Reassociate F(b) multiplication/division; literal boundary becomes frame 3 instead of 4 | `finite_bounds` |
| `affected-references` | Omit referring occurrence IDs for a source-wide change | `shared_source_edits` |
| `independent-notes` | Copy a source without minting independent note IDs | `shared_source_edits` |

Full filenames are `10-red-mutation-<suffix>.log`. Source was restored and then the aggregate count tuple was refactored into named `TrackCounts` fields before final formatting and regression verification.

## Coverage And Limits

The 22 focused tests exercise strict MIDI/audio round trips; explicit four-element nullable slots; unknown/missing/duplicate nested fields; canonical exact decimal frames; all identity categories; real cross-track source/device references; duplicate automation targets and frame collisions; finite/range/byte/UTF-8/control/size checks; 8-track/16-root/4-source/8-placement and aggregate note/lane/point bounds; 1024-event pool accounting; same-pitch overlap and four-held-note bounds; nonzero beat/frame offsets and minimum loop suffixes; nonloop duration rejection; touching occurrences; beat overlap with touching compiled frames; endpoint duration and exact F(b) operation order; source-wide affected IDs; independent MIDI/audio copy; fresh/reserved identities; operation lifecycle; transactional failure continuity; migration hashes/defaults/collisions and legacy prospective continuity; and rejection of v4 by the unchanged old app decoder.

No v4 document is added to active `Document`. No ProjectRef/TrackRef, Deref removal, PreparedTrack/Schedule integration, v4 native capability, IPC command, frontend, PCM decoding, file verification, native admission, running transport ownership, source event schedule objects, Save As path rewriting or v4 retained-history integration is claimed. The existing app's old open/save behavior and 64-entry/8 MiB history bounds remain under their existing implementation. V4 app open/Apply/enable/save must wait for Task 2D and related runtime stages.

Descriptor validation deliberately reads no audio file and does not impose later decoder/admission file-duration or memory profiles beyond checked descriptor arithmetic in this task. A cloned audio descriptor asserts no PCM buffer exists. Graph-family eligibility and resolved parameter existence/type/range remain explicit mandatory integration gates; a successful prospective candidate is not evidence of runtime admission. V1 prospective text conversion is the stated exception to otherwise pure in-memory conversion: it uses the existing decoder's device-source resolution.

No load-bearing ambiguity remains unresolved within this slice after the three controller rulings. Independent spec and quality review remains controller-owned.
