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

- [ ] Add failing tests for plain-Tab versus input/button focus, view-only
  changes during pending requests/playback, selected instance/clip identity,
  detail/browser toggle, and eight columns/four aligned scene rows.
- [ ] Build track columns/slots, right scenes, per-column mixer, shared top/left/
  bottom shell and resizable detail with current commands and original assertions.
- [ ] Keep Arrangement capability visibly unavailable until its runtime exists;
  no invented placements/waveforms. A transitional shell is not final acceptance.
- [ ] Run focused UI/browser checks and actual native launch; retain both target
  viewport screenshots and exact provenance, commit, then independent review.

## Task 2: Arrangement Model And Native MIDI Authority

Files: session model/clips/persistence/prepare/host/runtime/desktop modules;
versioned native host API/scheduler plus deterministic native/Rust tests.

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
