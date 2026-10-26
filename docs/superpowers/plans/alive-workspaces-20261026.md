# Alive Workspaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task, with one source implementer at a time and independent task reviews.

**Goal:** Complete the current PR #6 Arrangement/Session direction with real MIDI/audio playback.

**Architecture:** One project, track/device owner and native clock serve two views. Versioned placement/audio data and bounded scheduling extend the existing host; local workspace state never owns playback.

**Tech Stack:** Existing Rust/Tauri, C++ native Faust runtime, JavaScript/CSS, Node/browser/native tests.

**Spec:** `docs/superpowers/specs/2026-10-26-alive-workspaces-design.md` and PR comment 6383966857.

## Global Constraints

- Preserve local changes and all prior working features; keep PR #6 draft.
- Reuse Ultra device/runtime ownership; no copied DSP, app-per-track or Clockwork migration.
- Tab changes only the view, never playback, preparation, selection identity or edits.
- Arrangement placements and Session slots are distinct; authority is explicit per track.
- Real audio import/playback/waveforms through Ultra effects; no decorative audio support.
- No callback allocation, blocking locks, synchronous UI dependency or unmeasured raised ceilings.
- No release-branch changes, merges, tags, deployments, publishing or new cloud coding sessions.

## Task 1: Working Session Workspace And Shared Shell

Files: `apps/ultra/ui/alive.html`, `alive.css`, `alive.mjs`, new focused
`alive-workspace.mjs` and tests; update the Alive surface context, not Ultra's
unrelated patcher design. Consume current v3 commands and stable IDs unchanged.

- [x] Add failing tests for plain-Tab versus input/button focus, view-only
  changes during pending requests/playback, selected instance/clip identity,
  detail/browser toggle, and eight columns/four aligned scene rows.
- [x] Build track columns/slots, right scenes, per-column mixer, shared top/left/
  bottom shell and resizable detail with current commands and original assertions.
- [x] Keep Arrangement capability visibly unavailable until its runtime exists;
  no invented placements/waveforms. A transitional shell is not final acceptance.
- [x] Run focused UI/browser checks and actual native launch; retain both target
  viewport screenshots and exact provenance, commit, then independent review.

Task 1: independently approved through `97533b8`, including scoped re-review
of the detail-field blur correction. Evidence and exact source/build attribution:
`experiments/alive-workspaces-20261026/`. This completes the Session/shared-shell
slice; Tasks 2-5 and full Arrangement/audio acceptance remain open.

## Task 2: Arrangement Model And Native MIDI Authority

Files: session model/clips/persistence/prepare/host/runtime/desktop modules;
versioned native host API/scheduler plus deterministic native/Rust tests.

Contract target: `docs/superpowers/specs/2026-10-26-alive-workspaces-runtime-contract.md`.
It specifies the proposed v4 wire/ABI and admission rules; it is not evidence
that the capabilities exist. Stage this task as 2A pure strict model/edits/
prospective conversion, 2B additive ABI and one real MIDI Arrangement lane,
2C complete MIDI envelopes/oracle followed by authority/loops/receipts, then
2D measured qualification, desktop integration and admission. Keep the pure
2A model outside the active `Document` enum until 2D
can replace mandatory-instrument adapters with checked metadata/chain access.
Never add a fake instrument or a panic adapter to make an intermediate compile.
Each bounded slice gets its own tests, commit and independent task review.
Task 2A is independently approved through `59c6076`: 24 focused / 77 session
tests, including ten verified unavailable/smaller-native-profile conversion
scenarios. The pure model remains outside active Document; evidence lives in
`experiments/alive-workspaces-20261026/task2a/`.
Task 2B is independently approved through `db39ab0`: complete additive ABI,
one real native MIDI lane and scoped corrections for rejected START atomicity
and chased-note ordering. Full guarded native/shipping/regression evidence is
retained in `experiments/alive-workspaces-20261026/task2b/` and `task2b-fix1/`.
Only the dedicated test backend admits that finite subset; shipping feature
bits remain zero and the app stays v3. Before widening runtime support, 2C-prep
must prove full MIDI source/placement/authority/loop envelope construction with
an independent bounded oracle. A finite 2B pulse proof cannot certify the new
callback paths. The six-boundary/seven-segment cap and every work ceiling stay
fixed. Subsequent bounded slices add multi-track preparation, authority/actions,
suffix loops/seek, then partial song loops/coincident boundaries. Each has its
own source/test review before the next slice.
Task 2C-prep is independently approved at `c8f6522`: the complete MIDI envelope
builder and bounded independent oracle pass, with complete native regressions.
Evidence: `experiments/alive-workspaces-20261026/task2c-prep/`. Runtime consumption
and finite multi-track preparation follow; this seam enables no app feature.
Finite multi-track preparation is independently approved at `0606542`, consuming
the complete envelopes in actual native configuration. Two active tracks pass
PCM/dispatch/transaction/work checks; an eight-track sparse fixture has one
sounding lane and denser configurations remain refused. Complete native CI
passes in 157.49 seconds. Evidence:
`experiments/alive-workspaces-20261026/task2c-midi-preparation/`.
Finite authority actions are independently approved through `74d92d4`, including
a review correction for pending-slot projection across Arrangement boundaries.
Focused and complete native suites pass; evidence is retained under
`task2c-authority-actions/` and `task2c-authority-actions-fix1/` in the same
experiment root. Source suffix loops and Arrangement-only Seek are independently approved at
`a0c34e3`, with exact Session PCM continuity, pending-survives-refused-Seek and
final-only candidate resolution proved. Full native CI passes in175.99seconds;
evidence is retained in `task2c-suffix-seek/`. Partial song loops/coincident
boundaries are independently approved at `5981cfe`: exact Session PCM continuity,
reachable targets, retained work and Stop/resume at the song end pass. Complete
native CI passes in 180.70 seconds; evidence is in `task2c-song-loops/`. This
completes native Task 2C. Task 2D measurement and desktop admission remain next;
shipping features remain zero.
The accepted desktop interface supplement is
`docs/superpowers/specs/2026-10-26-alive-workspaces-desktop-contract.md`.
Complete the MIDI portion of Task 4 after MIDI admission and before Task 3,
following the owner's MIDI-first workflow priority.
The pure 2A APIs produce prospective candidates: graph-family eligibility and
manifest parameter existence/type/range cannot be certified from wire data or
saved base maps. Task 2D must resolve them before admission. Stored-event counts
use exact compiled endpoints (no note-off at source end) and enabled-lane
points; disabled lanes/points still spend saved aggregate limits.
Before 2D exposes v4 documents to the desktop, adapt the existing Session,
device, mixer and detail readers to the real v4 projections. Keep optional
instruments explicit; active v4 must not pass through legacy `.device` readers.
Task 4 adds timeline editing, rather than repairing a temporarily broken Session.

- [ ] Pin the additive versioned contracts and bounds against current source.
  Name all ABI sizes, ownership/migration and admission policies before code.
- [ ] Write failing round-trip/placement/offset/loop/overlap tests and native
  Session override/Back-to-Arrangement/termination/partition tests.
- [ ] Implement strict model and bounded runtime on the existing frame clock;
  preserve v1/v2/v3 ABI/behavior and all original failure regressions.
- [ ] Expose authenticated edits/receipts, focused history and prepared/observed
  authority; verify headless real Ultra devices, guards and timing; commit/review.

## Task 3: Genuine Audio Tracks

Files: focused WAV decode/source model and waveform preparation, native sample
source path, shared effects/mixer integration, source persistence and tests.

- [ ] Write failing known-PCM mono/stereo/sample-offset/seek/loop/termination,
  malformed/missing/changed-source, capacity, effects/bypass and round-trip tests.
- [ ] Implement bounded off-callback decoding and immutable sample ownership;
  connect shared Ultra effects and mixer with no fake instrument root.
- [ ] Produce bounded min/max waveforms from actual decoded samples; support
  explicit import/recovery and preserve current session on failure.
- [ ] Verify arbitrary partitions, real audio/effects, guards, admission and
  measured work; commit/review. Document supported rates/formats and limitations.

## Task 4: Real Arrangement Editing And Two-View Integration

Files: focused timeline UI/geometry tests and commands consuming accepted
model/runtime contracts; preserve Task 1 shell and existing editor features.

- [ ] Add failing tests for placement create/select/move/resize/duplicate/delete,
  offset/loop changes, zoom/pan/loop brace, undo and source edit scope.
- [ ] Render actual MIDI occurrences and actual decoded audio waveforms, native
  playhead and authority/return controls. Same track selection opens same chain.
- [ ] Verify slots and placements round-trip separately, audio/MIDI clip details,
  navigation/focus/drag/resize and uninterrupted Tab switching; commit/review.

## Task 5: Integrated Native Evidence And PR Handoff

- [ ] Ship one portable contrasting mixed MIDI/audio project with independent
  devices, ordered effects, automation, placements, slots and mixer values.
- [ ] Run bounded Impeccable inspection/fix/confirmation on both workspaces at
  1440x900 and 1280x800, retaining actual native screenshots/interaction recording.
- [ ] Run actual create/edit/launch/override/return/view/editor/save/Quit/reopen
  workflow, final regressions and outstanding endurance/observability gates.
  Retain raw monotonic time, transport-running, absolute-frame and action-boundary
  observations for independent replay of at least 1800 proven playing seconds.
  Capture duration or an unreplayable accumulated counter cannot satisfy this
  gate. Keep bounded resource/epoch logs, observation gaps and recorder cleanup.
- [ ] Reconcile refs, obtain whole-branch review, push tested checkpoints and
  qualify final-head CI/packages; update draft PR with commands/evidence/limits.

## Preflight Interface Checks

| Tasks | Shared Interface | Resolution |
| --- | --- | --- |
| 1/2 | Current v3 document versus new project | Keep v3 operational; versioned capabilities gate Arrangement |
| 2/3 | Track kind and sample ownership | Add audio kind explicitly; no mandatory instrument on audio tracks |
| 2/4 | Placement IDs, edits and authority | Pin before implementation; UI consumes authenticated commands |
| 1/4 | Workspace/selection | UI-local view state; same track/clip IDs independent of runtime |
| 3/4 | Waveforms | Read-only peaks from decoded source, never synthetic display data |
| All/5 | Historical tests and evidence | Preserve original gates and labels; final build needs fresh proof |
