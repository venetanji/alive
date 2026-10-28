# Alive / Ultra Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Alive and Ultra dependable, recognizably Live/Max-style music
tools, beginning with state safety and a real Master channel, then completing
direct authoring, mixed audio projects and measured interoperability cohorts.

**Architecture:** Keep the existing native transport, admitted Session/MIDI
Arrangement profiles and reusable-device host. Add Master as shared output
state outside musical tracks; improve both interfaces in complete native,
history and persistence slices. Later audio/device extensions consume the
existing workspace contracts and must earn separate runtime admission.

**Tech Stack:** Existing Rust/Tauri, plain HTML/CSS/JavaScript, native C++
Clockwork/Faust adapter, CPAL; Node tests, pinned Playwright, native offline
probes and private Xvfb/software PipeWire desktop harness.

**Spec:** `docs/superpowers/specs/2026-10-28-phase2-live-max-design.md`.
Also read `docs/DEVELOPMENT_REVIEW_20261028.md`,
`docs/PHASE2_REFERENCE_20261028.md`, and the three 2026-10-26 workspace specs.

**Execution:** The owner requests multiple **`gpt-6.1-terra`** implementers and
reviewers. That exact model ID was accepted by the collaboration API. Read
`docs/superpowers/plans/2026-10-28-phase2-multi-agent-execution.md` for the
three-child schedule, contract freezes, file/resource ownership, review packets
and integration rules. Read `docs/PHASE2_HANDOFF.md` after compaction. The owner
will set the implementation goal after this planning checkpoint; no application
packet has started. Model-selection defaults in skills do not override the
explicit Terra preference.

## Global Constraints

- Linux desktop is the shipped target; preserve separate `alive` and `ultra` binaries.
- Reuse Rust/Tauri, current plain HTML/CSS/JavaScript and the native engine.
- Reuse versioned saved Ultra devices; never copy their DSP into Alive.
- One native absolute audio-frame clock owns scheduling; JavaScript timers never own music.
- Native Faust kernels are not claimed to execute inside Clockwork.
- Keep editor lifetime separate from device/DSP lifetime and instance state.
- Compile, decode, prepare, load and destroy outside the audio callback.
- Callback work is bounded, allocation-free, nonblocking and independent of UI acknowledgement.
- Support explicit mono/stereo channel bundles; arbitrary multichannel and ambisonics are out of scope.
- Preserve four slots/scenes and currently admitted profiles until separately measured admission.
- Keep structural editing stopped and explicit Prepare / Apply until a safer contract passes its own gates.
- Use original UI assets, fixtures and example media; keep private reference captures local.
- No merges, tags, releases, deployments, credential changes or persistent environment-setting changes.

---

## Read This First

Planning checkpoint: `1ebf2161e0fa2a62484566fac65c7e940567f357` on
`feat/alive-session-host`; draft PR #6 targets release foundation `31033483`.
Fetch and inspect refs again at execution, preserving unrelated work. Do not
edit/merge release branches, PR #2/#5. Isolate implementation if another writer
is active. Do not wait for release integration; reconcile the foundation
before final qualification.

This document proposes work; none of the new APIs, files, commands or feature
gates marked **proposed** exists merely because it appears here. Tasks 1-9
define the first executable tranche. Tasks 10-17 are subsequent bounded work
packages: their first deliverable is the stated focused contract/fixtures,
then implementation under a child plan. This avoids fabricating unresolved
clipboard, PCM, recording or interchange semantics into an enormous patch.

The existing `alive-workspaces-20261026.md` remains the implementation record
for delivered MIDI work and the detailed unfinished audio tasks. Do not repeat
its completed Tasks 1/2/4-MIDI or count its WAV descriptors as audio playback.

## Sequence And Ownership

| Milestone | Tasks | Exit artifact | Execution |
| --- | --- | --- | --- |
| P2.0 Trustworthy checkpoint | 1-5 | Regressions fixed, attributed Apply failure, real Arrangement CI | Cloud implementation; local native confirmation where needed |
| P2.1 Real Master + Live shell | 6-9 | Saved native Master and both-view visual/input qualification | Cloud plus local exact-artifact acceptance |
| P2.2 Everyday editing | 10-12 | Live clip/automation/device workflow and Max fragment/selection workflow | Cloud from bounded local reference packets |
| P2.3 Complete mixed project | 13-14 | Genuine WAV, recovery/collect, device metadata authoring | Native/cloud implementation; local music acceptance |
| P2.4 Instruments and compatibility | 15-16 | Individually admitted instrument/effect/recording and compatibility cohorts | Separate decisions and physical/reference gates |
| P2.5 Integrated handoff | 17 | Reviewed draft PR, final-head CI/packages, native/endurance evidence | Both environments |

One writer owns `alive.mjs`/HTML/CSS, one active writer at a time owns shared
Rust host/history/persistence/native ABI files, and one owns CI/harness changes.
Those may be the same worker. Parallel agents may explore, review and create
disjoint fixture files; they must not independently redefine Snapshot, file
format, Master fields or asset lifetime. Freeze each contract before consumers
implement against it. Each task ends with focused tests, a review and a small
commit; passing an intermediate task does not qualify later changes.

## Task 1: Reproduce And Pin The Current Baseline

**Files:** read `PLAN.md`, `PRODUCT.md`, `DESIGN.md`, review/reproducers,
`apps/alive/SESSION_CONTRACT.md`, `apps/alive/STREAM_OBSERVABILITY.md`,
`apps/ultra/PATCH_PROTOCOL.md`, device manifest/host probe and workspace specs.
Record new execution evidence under a new `experiments/phase2-<date>/` path.

**Interface:** consumes source/ref and binary hashes; produces a baseline ledger
with command, head, patch identity, result, limitations and artifact hashes.

- [ ] Record `git status --short`, `git fetch origin`, branch/upstream/base and
  exact commit identities; preserve the expected review documents/evidence.
- [ ] Run the three Oct28 reproducers. They intentionally assert/print the
  defective result; their exit 0 is **not a passing regression**.

```sh
node experiments/development-review-20261028/repro-ui-queues.mjs
node experiments/development-review-20261028/ultra-focused-save-repro.mjs
node experiments/development-review-20261028/ultra-repackage-repro.mjs
```

- [ ] Inspect CI `40421472750` and package run `40421472639` as historical
  baseline only. Reproduce the unchanged desktop failure with a fresh output
  directory using the existing command in the verification section.
- [ ] Record whether Apply input was received, not just whether its editor
  remained. If the existing harness cannot observe receipt, record it as
  unknown and retain the failure artifacts; this does not block baseline
  acceptance or Task 5's diagnostic instrumentation. Task 5 must resolve the
  missing transition before P2.0 acceptance. Keep failure artifacts before fixes.
- [ ] Commit only new original regression/evidence metadata intended for review;
  exclude private reference content. Review gate: all five confirmed bug cases
  and the unassigned native failure have explicit repro paths.

## Task 2: Preserve Queued Alive Edit Intent

**Modify:** `apps/ultra/ui/alive.mjs`, `alive-timeline.mjs`,
`alive-workspace-edits.mjs`; test in `alive-dom.test.mjs`,
`alive-timeline.test.mjs`, `alive-model.test.mjs` and
`apps/ultra/tests/ci/alive-chain.spec.mjs`.

**Interfaces:** keep `mountAlive` and `alive_workspace_edit` responses unchanged.
Use existing `affected.{trackId,sourceId,slotId,placementId,noteId}`, snapshot
generation/revisions and selection tokens. The internal queued edit target must
capture originating generation plus either stable occurrence identity or an
explicit source identity; current selected UI state is not its authority.

- [ ] Port the delayed-IPC examples into ordinary tests with corrected
  expectations: after independence, original source remains unchanged; selected
  slot/placement's independent source receives the later edit, or the UI reports
  an explicit stale-target refusal before any source is changed.

```js
// In the existing alive-dom test fixture after releasing the delayed operation:
assert.equal(doc.sources.find(s => s.id === originalId).lengthBeats, 8);
assert.equal(doc.sources.find(s => s.id === independentId).lengthBeats, 16);
assert.equal(doc.placements[0].sourceId, originalId);
// Also exercise note creation, rename, two valid sibling edits and selection away.
```

- [ ] Add the Open/reused-instance case. Assert a queued base edit retains its
  old generation and cannot modify replacement cutoff. Add the equivalent
  cross-generation boundary to the future Master test fixture.
- [ ] Run `node --test apps/ultra/ui/alive-dom.test.mjs` and retain the failing
  assertion; implement occurrence-aware queue resolution and captured-generation
  live commands. Do not discard all queued operations to make the test pass.
- [ ] Add `loopEnabled` to brace invalidation; assert `.disabled` equals the
  inverse of model loop state after a loop-only edit. Repair Duplicate's
  destination choice/refusal with exact bounds and no mutation on refusal.
- [ ] Run Alive Node and focused Chromium tests. Review ordinary queues,
  selection-away, deleted targets, Open and Undo races; commit the fix.

## Task 3: Make Ultra Save/Close Own Focused Drafts

**Modify:** `apps/ultra/ui/canvas.mjs`, `canvas-node.mjs`,
`canvas-documents.mjs`, `canvas-entry.mjs`, relevant Inspector/Perform editors;
test `canvas-dom.test.mjs`, `canvas-documents.test.mjs`,
`apps/ultra/tests/ci/canvas-documents.spec.mjs` and the native document journey.
Touch `documents_close.rs` only if its existing barrier needs a demonstrated fix.

**Proposed internal interface:** a focused editor registers synchronous
`commit(): boolean` and `cancel(): void` hooks with the canvas owner. `false`
retains invalid draft/focus; native flush is acknowledged only after all valid
commits and shared-controller queues have completed. No DOM reconstruction may
precede capture. This is an editor preflight, not a new audio dependency.

- [ ] Turn the mounted production-UI focused-save reproducer into assertions:
  saved 10 -> type 42 without blur -> Ctrl+S -> owner and disk 42; one accepted
  authoring change. Save/close must never acknowledge while only the UI has 42.
- [ ] Add invalid/empty/out-of-range, Enter/Tab/blur/Escape, Save As cancellation,
  OS close Save/Discard/Cancel, Quit and child-view close cases. Assert the exact
  owner revision and acknowledgement order, not a fixed timer.
- [ ] Run the focused Node/browser tests to demonstrate red. Implement the
  shared focused-draft preflight and enroll every editable surface listed above.
- [ ] Run native save-to-disk/reopen and window-close/Quit tests on the built
  binary. Inspect saved JSON and restarted owner, retaining failed and passing
  receipts. Review preserved close barriers and child concurrency; commit.

## Task 4: Preserve Existing Device Metadata

**Modify:** `apps/ultra/ui/canvas-instrument.mjs`, `canvas-device-panel.mjs`,
`canvas-instrument.test.mjs`, `canvas-dom.test.mjs`, `canvas.html`.
**Interface:** existing `packageInstrument(patch, {id, name})` retains compatible
device metadata; it is not general manifest authoring yet.

- [ ] Add the direct production regression, including customized bindings/ranges:

```js
const before = subtractivePatch();
const after = packageInstrument(before, {id: before.device.id, name: 'Renamed'});
assert.deepEqual(after.device.presets, before.device.presets);
assert.deepEqual(after.device.parameters, before.device.parameters);
```

- [ ] Demonstrate red, then distinguish initial template packaging from editing
  an existing manifest. Reject incompatible bindings with a useful explanation
  and retain the original graph/manifest/presets. Add no implicit reset path.
- [ ] Correct Perform copy that says effects are unhostable. Run the instrument
  and mounted-panel tests, save/reopen the renamed device natively, then host two
  independent instances and verify keys/presets survive. Review/commit.

## Task 5: Attribute Native Apply Failure And Make Arrangement CI Real

**Modify:** `apps/ultra/tests/check_canvas_desktop.sh`,
`check_alive_desktop.py`, `check_alive_arrangement.py`,
`alive_workspace_navigation.py`, desktop helper unit tests and
`.github/workflows/ultra-ci.yml`; production ownership code only if demonstrated.

**Proposed harness interface:** `ULTRA_TEST_SCREEN_SIZE=1600x1000` overrides
the existing `1280x840` default with validated decimal dimensions (minimum
`1280x840`, maximum `3840x2160`); reject malformed values before creating Xvfb.
Always export the absolute `ULTRA_TEST_ALIVE_BINARY` actually launched and use
that same path/library on restart. Keep caller desktop/session isolation.

- [ ] Add tests for size parsing/default/refusal and exact restart identity.
  Run them red before changing the wrapper. Declare ffmpeg in the native CI
  dependencies if recording remains mandatory; record tool versions.
- [ ] Instrument original Apply assertion: button rect/visible region, input
  target/receipt, IPC start/end, install revisions, stale editor close and actual
  window enumeration. Identify the first missing transition. Add a regression
  for that cause and fix it without reducing editor-lifetime assertions.
- [ ] Run the unchanged complete journey until it passes, then run Arrangement
  through the checked-in screen-size option, capturing both target viewports.
  Preserve Stop, pending history, scoped controls, Save/Quit/restart and editor
  invariants. Do not infer a pass from absent/shortened steps.
- [ ] Wire Arrangement into CI with independent result/artifact collection even
  when another journey fails; required failures still fail the workflow. Retain
  output at failure. Review process cleanup and commands; commit.

Proposed command after this task implements the new option:

```sh
ULTRA_TEST_ALIVE=1 ULTRA_TEST_SCREEN_SIZE=1600x1000 \
ULTRA_TEST_ALIVE_BINARY="$PWD/apps/ultra/src-tauri/target/release/alive" \
ULTRA_TEST_ALIVE_SESSION="$PWD/apps/alive/examples/midi-arrangement.alive" \
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_arrangement.py" \
bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-phase2-arrangement
```

**P2.0 gate:** all state regressions green, original native assertion attributed
and passing, Arrangement reproducible from checked-in commands/CI. A UI feature
may be explored in parallel, but cannot be declared qualified before this gate.

## Task 6: Freeze And Implement Saved Master Ownership

**Create:** `apps/ultra/src-tauri/src/session/master.rs`,
`apps/ultra/ui/alive-master.mjs`, `alive-master.test.mjs`.
**Modify:** `session/mod.rs`, `clips.rs`, `document.rs`, `persistence.rs`,
`history.rs`, `desktop.rs`, `session/tests.rs`, `workspaces_tests.rs`,
`alive-model.mjs`, `alive-model.test.mjs`, session contracts and schemas found
by searching `alive-session-v[234]` consumers.

**Proposed wire/DTO interface:**

```ts
// Saved outer envelope. Score is exactly one existing strict v2/v3/v4 score.
type SessionFileV5 = {
  format: 'alive-session-v5'; score: LegacyOrClipOrWorkspaceScore;
  master: {gain: number};
};
// Keep snapshot.document/draft as current score shapes to avoid UI mode churn.
// Add snapshot.master with saved target gain; runtime observations are separate.
type MasterSettings = {gain: number}; // finite, 0 <= gain <= 4
```

`LegacyOrClipOrWorkspaceScore` means the existing decoded `Document` variants,
not a new music type. The envelope is one level deep; total file remains <=1 MiB.
Parse the envelope without losing duplicate keys, retain the raw nested score
text and dispatch it through the existing strict v2/v3/v4 file decoders. Do not
route nested v3 through generic `Document` deserialization or a JSON value that
has already collapsed duplicate members. Keep duplicate checks for the envelope,
Master object, nested score and parameter maps.
Freeze the concrete Rust owner wrapper and Serialize/Deserialize route in the
session contract before changing consumers. Musical history snapshots retain
score only and merge current Master metadata at Apply/Discard/Save.

- [ ] Add old v2/v3/v4 unity fixtures, non-unity v5 round-trip, v3 eight-track
  capacity preservation, invalid/missing/unknown fields, nested envelope refusal,
  duplicate envelope/Master/score fields and parameter-map keys, oversized file,
  atomic Save failure and Save As dependency rebasing cases. Feed these as raw
  JSON text so constructing a JavaScript/Rust map cannot erase the duplicates.
- [ ] Assert old-wire saving stays available at unity until Master metadata is
  used; new sessions save v5; non-unity cannot be silently saved as an old format.
  First migrated save identifies the new format in existing save feedback.
- [ ] Add Undo/Redo/Apply/Discard tests proving accepted live Master gain survives
  music history. Queued commands across Open use originating generation.
- [ ] Run Rust model/history/persistence and Node model tests red, implement the
  narrow wrapper/merge, rerun green. Update probe/schema/entrypoint consumers
  without changing scheduler profiles. Review migration and failure atomicity;
  commit before exposing a fader.

## Task 7: Native Master Gain, Metering And Bounded Commands

**Create:** `apps/ultra/src-tauri/native/alive_session_master.h`,
`apps/ultra/tests/alive_session_master_test.cpp`.
**Modify:** native `alive_session.hpp`, `backend.cpp`,
`session/native.rs`, `native_v4.rs`, `host.rs`, `runtime.rs`,
`runtime_workspaces.rs`, `desktop.rs`, Tauri command registration and
`apps/ultra/tests/ci/check-native.sh`.

**Proposed additive interface:** define this in the new header and mirror every
layout/offset in Rust before implementation:

```c
/* ABI version 1; no edits to existing session struct layouts. */
typedef struct {
  uint32_t version, struct_bytes;
  uint32_t ramp_frames, reserved;
  double max_gain;
} AliveMasterLimitsV1;
typedef struct {
  uint32_t version, struct_bytes;
  uint32_t clip_mask, reserved;
  double target_gain, current_gain, peak_left, peak_right;
  uint64_t applied_serial, applied_frame;
} AliveMasterStateV1;
int alive_session_master_limits(AliveMasterLimitsV1 *out);
int alive_session_master_set(uint32_t version, double gain, uint64_t serial);
int alive_session_master_reset_clip(uint32_t version, uint64_t serial);
int alive_session_master_state(AliveMasterStateV1 *out);
```

Rust validates generation and allocates the monotonic command serial before
enqueueing. Use the existing bounded command admission, callback work charge
and reserved Stop route. The last applied serial/frame and runtime gain expose
accepted state; unsupported ABI/capability, invalid gain and queue-full return
errors without mutating saved state. Install saved initial gain outside playback
before output; no old-project ramp state crosses an install. UI does not wait
synchronously on the callback.

When I/O is off, use the existing quiescent stopped-control publication route:
accept target/current gain without advancing the audio clock. Stopped transport
with running I/O still uses the callback/ramp. Test both conditions explicitly.
Define `master_set`'s stopped-initialization mode in the header: after a stopped
configuration install and before restarting I/O, the authenticated owner calls
it with saved gain and an install serial; native code sets target/current gain
directly and publishes that serial at the unchanged absolute frame. Reset clears
Master state; the host reapplies saved state on every install. Prevalidate gain
and capability before changing configuration, retain the prior native Master
state for rollback, and restore it if candidate installation fails. Test the
very first output sample after reopening gain 0.5 and after a failed install;
neither may leak a unity-gain sample or an initialization ramp.

- [ ] Add a native harness that feeds the existing stereo sum through Master
  and compares every sample to the exact ramp. For frame `k=0..63` after a new
  target, coefficient is `from+(target-from)*(k+1)/64`; a new command begins from
  the current coefficient. At gain 1 with no ramp, pre/post-Master PCM matches.
- [ ] Test silence, unity, gain 4, independent L/R peaks, `abs(sample)>1` latch,
  reset/reclip, invalid values, overload/refusal, applied frame, stop/seek/loop,
  reconfigure and queue starvation. Observe peaks after gain before existing
  adapter conversion. Measure profile cost; no new limiter or hidden latency.
- [ ] Run equivalent streams partitioned by supported counts including
  `1,31,32,63,64,65,127,128,256,512`; commands target the same admitted callback
  boundary or use the offline absolute-frame harness. Distinguish differing live
  boundary receipt frames from DSP scheduling errors.
- [ ] Run allocation/locking/work guards and every previously admitted profile's
  deadline tests; retain monotonic frame and deliberate guard/pipeline measures.
- [ ] Bridge proposed IPC `alive_master(generation, gain)` and
  `alive_master_reset_clip(generation)` through existing owner validation.
  Save gain only after queue admission, publish effective runtime observations,
  test stale generation and history merge. Review ABI/layout/callback lifetime;
  commit. Native UI-free proof is required before Task 8 claims working Master.

## Task 8: Master Strip And Live Workspace Composition

**Modify:** `apps/ultra/ui/alive.html`, `alive.css`, `alive.mjs`,
`alive-workspace.mjs`, `alive-timeline.mjs`, `alive-master.mjs`,
`alive-dom.test.mjs`, `alive-timeline.test.mjs`,
`apps/ultra/tests/ci/alive-chain.spec.mjs`; update
`DESIGN.md` with a separate Alive section and the Alive surface brief.
Read Impeccable craft-floor immediately before UI editing; do not restyle Ultra.

**Interface:** consume `snapshot.master` and native runtime Master observations
from Tasks 6/7. Both views render one output owner. Master selection is a view
selection variant, not a musical track ID or device instance.

- [ ] Add rendered red tests at 1440x900/1280x800: two-track v4 and maximum
  admitted v3; all four slots/scenes; fixed-right Master visible while scrolling;
  matching stereo meter/gain in both views; reachable Stop and no page overflow.
- [ ] Implement the spec's compact geometry/tokens, one-line headers, original
  icon set and stable mixer baseline. Scene actions sit above Master controls.
  Keep honest unused workspace and only four real slot rows.
- [ ] Move Arrangement headers/mixer to the right and place Master at the bottom.
  Move source/placement forms into selected detail; retain every supported exact
  edit/Return control and make keyboard focus/hit geometry follow the new DOM.
- [ ] Implement gain dB readout, silence, unity reset and clip-latch reset using
  real IPC; add pointer/keyboard/numeric tests. Coalesce fader motion so bounded
  command queues cannot grow without limit; final accepted value is displayed
  from owner receipts, with refusal visible.
- [ ] Verify parked text, detail/browser hide/resize, menus, long names, tooltip
  overlays, pending/playing/selected/draft states and Master selection do not
  emit transport/authority/prepare commands. Use icons plus accessible labels.
- [ ] Inspect rendered native WebKit and Chromium at both sizes against the
  local reference and original Alive captures. Record geometry deltas and fix
  the visible issues as a batch. Review screenshot + action receipts; commit.

## Task 9: Qualify The First User-Testable Checkpoint

**Modify:** existing desktop/Arrangement drivers; add
`apps/ultra/tests/check_alive_master.py` for the cross-view/persistence journey;
extend CI and evidence docs. **Output:** usable example session plus a pinned
separate Alive/Ultra build and updated draft PR; no release action.

- [ ] Native journey: load two saved devices, play chord clips, change Master,
  mute/solo and track gain; edit cutoff/level automation, make a musical draft,
  open/edit/close/reopen an instance editor; stop/Apply; save/Quit/process-restart
  and play again. Assert device isolation and Master/history persistence.
- [ ] Run the deterministic timing/isolation/termination/overload suite, latency
  tap checks, original document regressions, headless probes and both-view native
  journeys on the final code. Run the required endurance workload (retain the
  existing 1800-playing-second gate, exceeding the owner's ten-minute minimum).
- [ ] Capture counters/resources by stream epoch with native advancing frames,
  hardware/backend/rate/requested and observed buffers. Mark software-loopback
  honestly and leave unobservable physical underruns unclaimed.
- [ ] Independently review the complete diff. Build both apps, hash binaries and
  adjacent library; test that exact artifact locally. Preserve existing launcher
  identity and do not silently use the Ultra launcher for another checkout.
- [ ] Push only the feature branch and require final-commit CI plus all package
  targets; update draft PR #6 with commands, original app screenshots, measured
  results and limits. Keep user testing focused on this complete checkpoint.

**P2.1 gate:** actual native saved Master, closer Live composition at both sizes,
all required original journeys and regressions green. No Master effects,
recording, extra slots, audio files or full compatibility claim follows.

## Task 10: Real Browser And Session Editing

**Files:** `alive.html`, `alive.css`, `alive.mjs`, `alive-workspace.mjs`,
new `alive-browser.mjs`/tests, existing bundled examples/catalog,
`session/desktop.rs`, `session/workspaces.rs` only for new owner edits.

- [ ] Freeze a focused spec from bounded Live browser/slot reference cases:
  search bundled instrument/effect entries and project sources; select versus
  load, slot keyboard navigation, inline rename and context actions. Existing
  file picker remains fallback. Add action/result fixtures with exact targets.
- [ ] Write red browser/native cases for kind mismatch, capacity refusal,
  selection without launch, shared-source copy versus independence, keyboard
  focus and source deletion. Retain current bar-quantized launch receipts.
- [ ] Implement only real catalog/load/assign/actions, bounded index/search and
  one owner transaction per edit. No external folder scan or media category
  before its preparation contract. Validate maximum v3/two-track v4 layouts,
  persistence and native restart; review and commit.

## Task 11: Direct Clip, Arrangement And Automation Editing

**Files:** `alive-piano.mjs`, `alive-timeline.mjs`, `alive.mjs`, `alive.css`,
`alive-workspace-edits.mjs`, `session/workspaces.rs`, `history.rs` and matching
Node/Rust/Chromium/native tests. Extract focused viewport/selection helpers as
needed; do not move native timing into presentation modules.

- [ ] Write a child spec defining pitch/time transform, keyboard gutter,
  zoom/scroll/fit, selected-note IDs, marquee modifiers and clipboard source
  policy. Define group note operations and range-to-MIDI as atomic typed edits,
  with exact capacity and Undo behavior, before adding corresponding gestures.
- [ ] Use original 16-beat chord fixtures to test add/move/resize/delete/velocity,
  group duplicate/paste at bounds, cancelled/refused operations, shared versus
  independent source readers and loss of pointer capture. Compare model/history
  before and after; no sequential partial commits.
- [ ] Implement stable piano geometry then group edits; Arrangement range ->
  source+placement transaction, pointer-centered navigation and focused detail.
  Preserve nonoverlap refusal/offset/suffix loops and per-track override/Return.
- [ ] Implement direct step-automation points with exact target keys/ranges,
  numeric fallback and one history item per gesture. Test prepared ownership
  against panel bases before/after enabling/disabling lanes and Apply.
- [ ] Render horizontal real device panels with manifest controls, warm bypass
  and stopped structure menus. Native proof includes editor closure while audio
  continues and both instances remain independent. Review/commit each complete
  piano, Arrangement, automation and device sub-slice separately.

## Task 12: Everyday Max-Style Patch Authoring

**Files:** `canvas-model.mjs`, `canvas-shared.mjs`, `canvas.mjs`,
`canvas-node.mjs`, `canvas-inspector.mjs`, `canvas-appearance-view.mjs`,
`canvas-cable-geometry.mjs`, `canvas-cable-path.mjs`, `canvas.css`,
`documents_shared.rs`, `documents_tests.rs`, and corresponding tests.

- [ ] Capture bounded Max cohorts for fragment clipboard, selection/modifiers,
  group Inspector and reconnect/bends. Reuse existing entry/lock/help evidence;
  original fixtures and explicit unknowns form the cloud handoff.
- [ ] Define a versioned bounded Ultra fragment wire, global ID/reference remap,
  node/subtree/internal-edge/bend/style scope, excluded external edges/root
  manifests, placement offset/cascade and text clipboard precedence. Specify
  child/cross-window owner routes and capacity refusal before implementing.
- [ ] Red cases: duplicate selected connected pair preserves only internal edge;
  cut is atomic; paste remaps nested IDs; malformed/oversized/capacity/paste into
  unsupported root leaves owner/history unchanged; Undo/Redo across linked views
  agrees. Implement Copy/Cut/Paste/Duplicate and visible menu/shortcut paths.
- [ ] Separately add common/mixed batch Inspector and observed selection rules,
  then cable reconnect/bend edits. Each has one transaction, type/channel checks,
  Escape/cancel rollback, save/reopen and native focused-input acceptance.
- [ ] Compare current original render against Max at equal zoom/DPI. Review
  control/port/text density and optional panels; preserve scoped Stop/Quit/help
  and non-resetting appearance edits. Commit and qualify each sub-slice.

## Task 13: Genuine WAV, Media Recovery And Portable Mixed Project

**Files:** existing workspace runtime/desktop contracts, unfinished Task 3 in
`alive-workspaces-20261026.md`; proposed `session/audio_source.rs`,
`prepare_workspaces.rs`, `host.rs`, `persistence.rs`, history projection,
native `alive_session_workspaces.hpp`/`backend.cpp`, waveform UI/tests and
original generated WAV fixtures. No codec dependency is chosen by this plan.

- [ ] Reconcile both prior contracts: Replace makes fresh source ID and rewires
  explicitly selected readers; Relocate preserves identity and matching content.
  Specify failed-replacement/history/path behavior and update conflicting text
  before implementation. Use current Context7 docs if selecting a decoder API.
- [ ] Execute decoder/asset/real-peak slice with AUDIO disabled. Test known
  PCM16/24 mono/stereo values, truncated/overflowed headers, wrong rate/format,
  missing/changed assets, per-file/aggregate bounds and symlink/collision paths.
  Hash and decode outside callback; retained buffers are immutable and pinned.
- [ ] Execute zero-instrument PCM/effect/mixer/Master path and retirement rollback
  slice. Prove audio-only zero-root rendering; test exact frame offsets and loop
  suffix, arbitrary partitions, stop/seek/removal and stale preparation. No
  instrument-presence guard may suppress an audio track or the master mixer.
- [ ] Measure the full candidate envelope and deadline/allocation/ownership
  guards before advertising AUDIO. Re-run MIDI profile evidence after shared
  changes; do not inherit old admission timings.
- [ ] Add real waveform/import/source detail and recoverable errors only after
  native proof. Add separate Collect And Save with atomic staging, content-based
  collision safety, devices/audio/history rebasing and rollback. Ordinary Save
  does not silently collect files.
- [ ] Native mixed project: synth + audio + effects + Master, both views, changed
  source/refusal/relink, save/Quit, move collected project, hide originals,
  restart/play and compare PCM/state. Resolve two-track mixed-profile limits
  explicitly; never silently add a third track. Review each staged slice.

## Task 14: General Reusable-Device Authoring

**Files:** `canvas-device.mjs`, `canvas-device-panel.mjs`,
`canvas-instrument.mjs`, `canvas-model.mjs`, `canvas-shared.mjs`,
Rust `canvas_device.rs`, owner command routes and instrument/effect tests.

- [ ] Specify validated metadata owner command using existing
  `CanvasDocument.setDevice` rather than whole-document load. Define parameter
  stable keys, binding eligibility, ranges/defaults/units/order, presets and
  incompatible removal preview; freeze semantics before UI implementation.
- [ ] Test general stereo-effect packaging, custom instrument metadata, preset
  add/rename/remove, duplicate names and missing bindings without losing retained
  entries. UI presents real supported ports/parameters; recipe is one template.
- [ ] Implement metadata editing through shared owner validation/history and
  save/reopen; prove appearance/metadata operations do not accidentally rebuild
  DSP. Host the saved device twice, automate cutoff/level and edit/close an
  instance editor. Preserve hashes/version/kind/channel validation. Review/commit.

## Task 15: Bounded Instruments, Effects And Recording

These are separate contract/spike tasks followed by their own implementation
plans. Their exit conditions, rather than approximate dates, decide readiness:

| Packet | Local reference question | Proof required before feature UI |
| --- | --- | --- |
| Analog-style | Oscillator/filter/envelope/control relationship and familiar performance workflow | Original saved graph/device; bounded voices, velocity/automation/isolation and supported timing |
| Simpler-style | One-sample start/end/envelope/loop and pitch workflow | Versioned device assets, off-callback pinning, bounded sample voices, exact mono/stereo mapping, interpolation/rate policy and portable save |
| Sampler-style | Zone/key/velocity mapping workflow after one-sample proof | Explicit zone/voice/asset memory bounds and transactional mapping; no proprietary preset claim |
| Basic effect | One gain/pan, delay or tone workflow at a time | Saved reusable effect, impulse/latency/tail/bypass tests, bounded memory/work and requalified profile |
| Input recording | Arm/monitor/destination/stop/cancel/error behavior | Input/output clock mapping, preallocated rings, worker finalization, full-ring/disk error policy, take recovery, physical latency/drift acceptance |

- [ ] For each chosen packet, deliver a reproducible narrow feasibility test
  before committing a new runtime interface. A concrete blocker yields the
  failing test, measured limit and choice; do not add unrelated objects.
- [ ] Reuse WAV ownership where suitable, but do not call audio clips a sampler
  or `audio.in~` a physical input. Keep physical recording and output export as
  distinct tap/ownership contracts. Use original or cleared sample content.
- [ ] Admit only packets whose exact profile passes headless/native/portability
  gates; all others remain visibly outside the supported profile.

## Task 16: Measured Compatibility And Capacity

**Files:** `apps/ultra/PATCH_PROTOCOL.md`, existing Max intake/report/test
modules, reference replay/coverage docs, native policy/measurement tests.

- [ ] Establish separate scores for file parse, visual structure, control
  messages, DSP behavior and round-trip. Keep current whole-help `0/2103` claim
  until a defined cohort actually changes it. Preserve unavailable-private-oracle
  versus changed-oracle failure distinctions in cloud replay.
- [ ] Progress original small Max cohorts: entry/control/appearance -> graph
  fragments/cables -> device metadata -> chosen DSP. Every unsupported object
  produces a useful report and cannot execute silently.
- [ ] Inventory `.als` as a separate intake design after workflow acceptance;
  define a small supported cohort before importing it. Opening an arbitrary
  Live Set, Max patch or Max for Live device is not a Phase 2 default promise.
- [ ] Treat more tracks, slots/scenes, voices and roots as individual measured
  admission tasks with complete work-bound proofs and refusal tests. UI empty
  space, ABI constants or a fast average render are not admission evidence.

## Task 17: Final Integration, Endurance And Draft PR Handoff

- [ ] Reconcile source/foundation and every admitted capability. Run the full
  verification ladder below on the final patch, retaining failures as well as
  passes; do not rerun unchanged expensive gates without a new reason.
- [ ] Native walkthrough covers create/load, two device isolation, clip editing,
  automation/base ownership, mixer/Master, hosted edit/close/reopen, both views,
  audio recovery/portable reopen if admitted, Save/Quit/process-restart/play.
- [ ] Endurance uses advancing native frames plus monotonic timestamps, repeated
  transport/edit operations, bounded observation gaps and finalized stream epochs.
  Preserve the stronger current 1800-playing-second gate and recorder supervisor
  bounds (2700s / 1 GiB PCM). Separate app, observer and private audio-server
  resource growth; only report counters available from the actual backend.
- [ ] Measure alignment across supported DSP paths with impulses/onsets, frame
  offsets and arbitrary partitions. Report deliberate legacy 64-frame pipeline
  and start guard separately from scheduling error and adapter buffering.
- [ ] Perform local physical/listening acceptance when hardware is available;
  record the exact device/backend/rate/buffer/routing. If unavailable, keep that
  gate open and mark software-loopback evidence explicitly; do not invent xruns.
- [ ] Review final diff, preserve notices/tests, push feature branch, wait for
  exact-final-commit CI and all four package jobs; update draft PR #6, PLAN.md
  and workflow coverage with original app screenshots, commands, results and
  honest unsupported/untested sections. No merge/tag/release/deploy.

## Verification Commands And Evidence Rules

Existing commands, run from repository root unless shown otherwise:

```sh
bash apps/ultra/tests/ci/check-contracts.sh
python -m unittest discover -s apps/ultra/tests -p test_desktop_timing.py -v
python -m unittest discover -s apps/ultra/tests -p test_desktop_frames.py -v
node --test apps/ultra/ui/alive-*.test.mjs
node --test apps/ultra/ui/canvas-*.test.mjs
```

Pinned browser setup/test, working directory `apps/ultra/tests/ci`:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npx --no-install playwright install --with-deps chromium
npm run test:browser
```

Native/Rust setup uses the existing verified dependencies. These environment
values are process-scoped build settings, not persistent machine changes:

```sh
bash apps/alive/build.sh
bash apps/ultra/tests/ci/check-native.sh
PATH="$PWD/experiments/clockwork-faust/.deps/rust/bin:$PATH" \
CARGO_HOME="$PWD/experiments/clockwork-faust/.deps/cargo" \
ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build" LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
cargo test --manifest-path apps/ultra/src-tauri/Cargo.toml --release --locked
PATH="$PWD/experiments/clockwork-faust/.deps/rust/bin:$PATH" \
CARGO_HOME="$PWD/experiments/clockwork-faust/.deps/cargo" \
ULTRA_NATIVE_LIB_DIR="$PWD/apps/ultra/build" LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
cargo test --manifest-path apps/alive/src-tauri/Cargo.toml \
  --target-dir "$PWD/apps/ultra/src-tauri/target" --release --locked
python3 apps/ultra/tests/check_app_entrypoints.py

env -u DISPLAY -u WAYLAND_DISPLAY LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
  apps/ultra/src-tauri/target/release/ultra --instrument-probe \
  apps/ultra/examples/subtractive.ultra apps/ultra/build/instrument-evidence
env -u DISPLAY -u WAYLAND_DISPLAY LD_LIBRARY_PATH="$PWD/apps/ultra/build" \
  apps/ultra/src-tauri/target/release/alive --session-probe \
  apps/alive/examples/two-instruments.alive apps/ultra/build/session-evidence
```

Native desktop baseline and observability (use fresh output paths per run):

```sh
ULTRA_TEST_ALIVE=1 \
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_desktop.py" \
bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-phase2-desktop
ULTRA_TEST_ALIVE=1 \
ULTRA_TEST_SCRIPT="$PWD/apps/ultra/tests/check_alive_observability.py" \
bash apps/ultra/tests/check_canvas_desktop.sh /tmp/alive-phase2-observability
bash apps/ultra/tests/check_cpal_audio.sh "$PWD/apps/ultra/build/cpal-evidence"
```

The current `--session-probe` example exercises the existing v3 host; it does
not by itself qualify new v5 metadata, v4 Arrangement or PCM. Tasks 6/9/13 must
extend probes/fixtures for those paths without removing the old one.

Current local run commands remain:

```sh
bash apps/alive/run.sh apps/alive/examples/midi-arrangement.alive
bash apps/ultra/run.sh
```

CI `.github/workflows/ultra-ci.yml` owns contracts/browser/native. Packaging
`.github/workflows/ultra-desktop.yml` builds Linux x86_64, Windows x86_64, macOS
arm64 and macOS x86_64; use existing unsigned draft-PR paths. Do not touch its
tag/publication/signing actions. A package pass proves packaging, not playback.

Every evidence row names source commit, any dirty patch, command/exit, binary
and adjacent library hashes, environment, fixture/profile, observed frames,
resources/counters and unavailable observations. Original Alive/Ultra captures
may be attached to the draft; private Live/Max captures remain local.

## Plan Self-Review / Coverage

| Requirement | Tasks / evidence |
| --- | --- |
| Existing baseline, release isolation, current bugs | 1-5; dated development review |
| Missing Master and closer Live layout | 6-9; fresh P2-L1 through P2-L5 reference |
| Two independent saved devices, shared native clock | 7/9/11/17; existing host plus offline probes |
| Notes, automation and ownership, reliable stop/seek/loop | 2/7/9/11/17; deterministic offsets and state tests |
| Native persistence/editor lifetime, Quit/history/Stop | 3-9/12/14/17; unchanged assertions and restarted app |
| Max workflow and visual fidelity | 3/4/12/14/16; bounded local cohorts + original fixtures |
| Real WAV/missing media/portable project | 13; carried-forward accepted audio contracts |
| Analog/Simpler/Sampler/effects/recording | 14-15; individually admitted child plans |
| Cloud execution, local references/physical testing | Every milestone; spec section 12 and final evidence |
| Final CI/packages/endurance/honest limits | 9/17; exact final commit and artifact pins |

No application implementation or new feature pass is claimed by this plan.
Next concrete development checkpoint is P2.0 followed by P2.1; later packages
must not delay delivering and testing the real Master/Live workspace slice.
