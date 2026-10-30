# Alive Launch Quantization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add saved global/per-Session-occurrence launch quantization to existing MIDI clip-bank and workspace playback, with native timing and truthful receipts.

**Architecture:** Extend the existing single native request reducer through a new versioned boundary; old v3/v4 structs and requests retain their meanings. Rust owns strict v6 launch settings and history alongside the existing score/Master envelope. The UI submits authenticated settings/actions and displays native target/receipt state.

**Tech Stack:** Existing C++17 native scheduler and Faust roots, Rust/Tauri, CPAL 0.18.2, plain JavaScript DOM, Node tests, C++ fixtures and Chromium tests.

**Spec:** `docs/superpowers/specs/2026-10-31-alive-tracks-recording-launch-design.md`, sections 4, Stage 1 of 5, launch/persistence/UI validation in 8. The 2026-10-26 runtime/desktop contracts and 2026-10-28 Phase 2 design remain authoritative.

## Global Constraints

- Implement only Stage 1 on existing MIDI tracks. No audio tracks/assets, recording, physical MIDI ingress, backend migration or Qt.
- Fixed 4/4. Values: `none`, `thirtySecond`, `sixteenth`, `eighth`, `quarter`, `half`, `bar1`, `bar2`, `bar4`, `bar8`; overrides additionally allow `global`.
- Global defaults to 1 Bar; missing override means Global. Capture effective grid on acceptance. Settings edits never retime accepted requests.
- Native owner chooses earliest reachable boundary including equality, song/loop seams and nonlooping terminal cancellation. None means next control-consumption frame. Stopped requests cue without starting.
- Scene captures one Global grid and includes empty-slot Stops. Track Stop/Return use Global. Reserved global Stop stays immediate.
- Strict old decoders/ABIs remain unchanged; new envelope is exactly `alive-session-v6` plus required `score`, `master`, `launch`. Duplicate/foreign/missing occurrence IDs reject.
- Preserve 1 MiB documents, 64-entry/8 MiB history, original legacy wire until needed, exact IDs across Undo/Redo, and preparation/generation fencing.
- No GitHub Actions, cloud builds, push, merge, release or amendment. Parent independently reviews committed work.
- Preserve charcoal/Liberation Sans/UI patterns; test 1440x900, 1280x800, 1024x768, 800x600.

## Source Map And Admission Decision

`alive_session.hpp::InternalRequest`, `alive_session_clips.hpp::request_ingress`, `begin_v3`, `target_frame`, `optional_admission`, `sample_v3` and `alive_session_workspaces.hpp::transition_v4` already own request reduction and actual sample dispatch. Keep them authoritative. `clip_admission::Prepared` currently stores 65 bars; v3 envelopes and `workspace_admission::compose` cap six scheduled boundaries. Do not reinterpret this as a fine-grid proof.

The additive path will reserve the existing optional guard credit for each consumed quantized batch, limiting accepted batches to one per rolling 1024-frame window. A separate prepared envelope includes up to two arbitrary additional track transitions, using `min(2, width - 1)` positive-length interior cuts per window: one request pending before the window and one accepted batch within it. Each track retains only one pending action; replacements cannot increase that bound. Existing bar/seam/placement work remains included. This conservatively covers every grid, irregular loops and None without expanding a song timeline. The existing event/root/scan/write/placement ceilings remain fixed. If this augmented proof fails, old playback remains admitted and the additive request explicitly refuses. On activation, optional horizon admission compares retained rolling history with the augmented future proof; once activated it remains authoritative until reinstall. This restriction must be visible in capability/refusal information and validated independently before advertising support.

`master.rs::SavedSession` presently owns score, Master, SaveWire; `persistence.rs` explicitly dispatches strict formats. `history.rs::Projection` currently captures musical score only; `desktop.rs::Control` owns draft/history/live settings and fences. Extend these owners rather than attaching fields to strict score schemas.

## Task 1: Native Quantized Boundary And Proof

**Files:** Create `apps/ultra/src-tauri/native/alive-launch-v1.h`, `apps/ultra/src-tauri/native/alive_session_launch.hpp`, `apps/ultra/tests/alive_session_launch_test.cpp`; modify `alive_session.hpp`, `alive_session_clips.hpp`, `alive_session_workspaces.hpp`, `alive_session_workspace_envelope.hpp`, `backend.cpp`, and native test script under the same existing directories.

**Interfaces:** New C `AliveLaunchRequestV1` has `version`, `struct_bytes`, `schedule_version`, finite `quantization`, and an unchanged request payload shape (kind/mask/revision/serial/position/eight actions/reserved). `alive_launch_request_v1` submits only track actions and returns the schedule's original v3/v4 receipt shape through separate typed entry points, avoiding layout casts. `alive_launch_capabilities_v1` reports versioned support/admission and guard-window restriction. Existing `alive_session_request_v3/v4` remain untouched externally. Native helper `launch_target(position, quantization)` computes checked rounded boundaries from beat origin using bounded binary search, never repeated rounded additions.

- [x] Write a native failing fixture using generated saved graphs, request serials, trace dispatch and native sample stepping. Independent oracle enumerates `round(k * beat_period * 48000 * 60 / tempo)` and seam candidates; compare every grid at equality, one frame before/after, tempo 30/137/240 and callback partitions.

```cpp
for (unsigned grid = 0; grid != 10; ++grid) {
  // oracle enumerates beat multiples, then includes the reachable loop-entry seam.
  assert(receipt.target_frame == oracle(grid, tempo, position, absolute, loop));
  assert(first_dispatched_note_frame == receipt.target_frame);
}
```

- [x] Compile/run against baseline and retain the missing-boundary failure in `/tmp/alive-launch-quantization/native-red.log`.
- [x] Add finite grid translation and checked target search, capture enum in `InternalRequest`, and route new requests through the existing reducer. Scene is one request; Start/Seek and old reserved-field validation remain original.
- [x] Prepare separate augmented envelopes with the two-boundary proof; do not alter old preparation results. Reserve optional credit for new batches, activate augmented future only after admission, and preserve existing state/receipts on denial.
- [x] Test repeated/replaced requests, mixed old/new calls, Stop mailbox, seek cancellation, scene members, Return reconstruction, nonlooping end and short-loop internal boundaries. Inspect actual event/PCM onset, guards, allocations and work counts.
- [x] Run focused native regression executables and commit `feat(native): add bounded quantized launch requests`.

## Task 2: Strict Launch Settings And History

**Files:** Create `apps/ultra/src-tauri/src/session/launch.rs`; modify `mod.rs`, `master.rs`, `persistence.rs`, `history.rs`, `prepare.rs`, `desktop.rs`, `clips.rs`, `workspace_edits.rs` where occurrence copy/delete hooks are needed; add unit tests beside these owners.

**Interfaces:** `Quantization` is the finite serde enum; `LaunchSettings { global_quantization: Quantization, clip_quantization: Vec<ClipQuantization> }`; entries contain `occurrence_id: String` and an explicit override enum. `SavedSession` gains `launch`; `SaveWire` gains `V6`. `LaunchSettings::validate(&Document)` resolves only occupied v3 clips/v4 slots. `effective(occurrence_id: Option<&str>) -> Quantization` supplies captured request settings. History entries retain launch settings with before/after score projections and preserve current live Master/mixer/parameters.

- [x] Write failing tests for default legacy wire preservation, v6 round trips, required/malformed/duplicate/unknown fields, enum rejection and foreign/missing occurrence IDs.

```rust
let saved = decode(&text, &origin).unwrap();
assert_eq!(saved.launch.global_quantization, Quantization::Bar1);
assert!(decode(&foreign_occurrence_v6, &origin).is_err());
assert_eq!(decode(&String::from_utf8(serialize_saved(&saved).unwrap()).unwrap(), &origin).unwrap(), saved);
```

- [x] Run focused Rust tests and retain the red result.
- [x] Implement strict v6 dispatch without changing v2-v5 schemas; validate at decode, prepare and save. Preserve v6 when Master changes and never silently downgrade launch metadata.
- [x] Extend owner/history transactions so live launch changes require no schedule reinstall. Draft copy inherits override, delete removes it, Undo/Redo restores metadata and exact occurrence IDs. Apply/Discard/Save As preserve coherent ownership and size bounds.
- [x] Test history interleaving with pending music, live settings, copy/delete and Master edits; compare preparation revision/generation/device identities before/after settings-only changes.
- [x] Commit `feat(session): persist launch settings and occurrence history`.

## Task 3: Authenticated Runtime Integration

**Files:** Create `apps/ultra/src-tauri/src/session/native_launch.rs`; modify `native.rs`, `runtime.rs`, `runtime_workspaces.rs`, `desktop.rs` and command registration.

**Interfaces:** Reuse existing `Runtime::request`, `Runtime::scene`, `Runtime::workspace_request` and `Control::workspace_action`/`launch_scene`. New `alive_launch_settings` command takes generation, preparation revision, draft revision and a strict tagged global/occurrence edit; it returns Snapshot. Snapshot gains saved launch state and explicit native capability. Request results retain the captured quantization alongside native target/receipt fields.

- [x] Add failing tests showing individual clip override, captured Global scene, Stop/Return Global, stale generation/preparation refusal and pending requests retaining their prior grid after settings edits.
- [x] Resolve native versioned capability from the loaded native module using the existing optional-Master resolver pattern; missing support leaves legacy launch truthful and finer settings unavailable, with explicit supported recovery.
- [x] Resolve settings once in serialized Rust owner, then submit native enum and preserve request/member receipts. Do not schedule with JavaScript time or infer support from UI.
- [x] Verify old-library behavior, existing v3/v4 action tests and exact no-reset assertions; commit `feat(desktop): integrate native launch settings and receipts`.

## Task 4: Selector And Accessible Receipt State

**Files:** Modify `apps/ultra/ui/alive.html`, `alive.css`, `alive.mjs`, existing mock-native fixture and `alive-dom.test.mjs`; add a focused `alive-launch.mjs` module only if it keeps owner/UI boundaries clearer.

**Interfaces:** Toolbar select `launch-quantization` maps only finite values. Occupied Session detail select `clip-quantization` includes Global; Arrangement source/placement selection does not acquire a Session override. Settings commands use current generation/preparation/draft fences through existing serialized UI command scheduling. Native pending receipts supply target and captured grid status.

- [x] Load Impeccable context and craft-floor; preserve established Operate surface, typography, spacing and responsive regional scrolling.
- [x] Write failing DOM tests for selector defaults/options, occupied-only overrides, keyboard change, capability absence, captured queued status, stale replies and navigation causing no musical action.

```js
assert.equal(page.ids.get('launch-quantization').value, 'bar1');
await page.ids.get('launch-quantization').fire('change');
assert.equal(native.calls.at(-1).name, 'alive_launch_settings');
assert.equal(native.calls.filter(c => c.name === 'alive_transport').length, 0);
```

- [x] Implement settings UI and actual receipt text with native target; replace hard-coded next-bar tooltips with effective grid labels. Keep selected/queued/playing/stopped states distinct.
- [x] Run focused DOM tests, then all Alive Node tests. Render both views at all four required viewports and inspect control/menu bounds, keyboard focus and Stop/Master visibility.
- [x] Commit `feat(ui): expose global and clip launch quantization`.

## Task 5: Integrated Verification And Handoff

**Files:** Update this plan's checkboxes, native policy documentation as needed and `/tmp/alive-launch-quantization/report.md`; add durable source test fixtures, not generated binaries.

- [x] Build native library and desktop from current source using existing local tooling; retain commands/source hashes. Read Context7 for any library/tool API changes rather than guessing.
- [x] Run all affected native old/new ABI, timing, guard and profile tests; Rust session/library tests; Node suite and Chromium viewport tests once changes settle.
- [x] Run relevant private native launch/Save/reopen journeys. Preserve retained desktop Return-gap/hosted-Cutoff assertions and report baseline failures separately if encountered.
- [x] Check `git diff --check`, inspect complete diff and status, record exact commands/results and commits in the report. Do not claim completion for plan/schema/UI only.
- [x] Commit final verification documentation and hand parent the commit IDs, report path, rerun commands, supported capabilities and measured limitations. Parent independently reviews before push/PR.

## Accepted implementation adjustments

- Parent approved bounded new batches: one per rolling 1024 native frames, shared with Start/Seek. The native proof adds only positive-length interior transitions, `min(2, width - 1)`, since same-sample changes coalesce. Resource ceilings remain unchanged. Native re-review approved commit `1418872`.
- Actual C exports are typed `alive_launch_request_v3_v1`, `alive_launch_request_v4_v1` and `alive_launch_limits_v1`; no schedule discriminator or receipt cast is needed.
- 1 Bar uses the old ABI, preserving default behavior. Other grids require additive admission. The unchanged MIDI Arrangement example is refused by the 72 > 64 events/window proof; the separate sparse `quantized-midi.alive` demo is admitted.
- Settings recovery is available even when the additive feature is unavailable: Global may explicitly change to 1 Bar; an occurrence may explicitly change to 1 Bar, or Global when Global is 1 Bar. Other overrides remain saved and unsupported effective requests still refuse. This avoids trapping loaded v6 intent after a musical Apply or with an older library.
- Rust persistence/history and runtime integration share commit `507bf1f` because the owner paths require coherent metadata throughout. UI is `adaf6bc`.
- Browser regression caught a redundant detail row reducing piano space. Clip settings now share the existing clip heading; original geometry assertions remain unchanged and pass.

## Final verification evidence

- Current-source Rust library: 299 passed, 4 intentionally ignored. Direct executable with task-owned native library is required because Cargo prepends the sibling developer-library directory.
- Alive Node: 159 passed. Full final Alive Chromium: 68 passed; all four required viewports and unchanged piano geometry assertions pass.
- Focused actual desktop: keyboard Global/clip changes, strict v6 Save As, native reopen, saved overrides, software CPAL playback, captured 1/16 receipt, observed Session authority/active voices, zero reported stream errors and global Stop pass. The current-source Alive package was explicitly rebuilt after compact-heading changes.
- Old native library recovery: 6 focused checks pass. Fresh current-library v4 shipping profile test passes; native timing/history/envelope and ABI evidence is recorded in `/tmp/alive-launch-quantization/report.md`.
- Native re-review approved `1418872`; independent whole-feature review is parent-owned. Existing broad desktop Return-gap/hosted-Cutoff failures are not claimed fixed or waived by this focused journey.
