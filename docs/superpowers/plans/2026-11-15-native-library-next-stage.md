# Native Library Next-Stage Implementation Plan

> For agentic workers: use `superpowers:executing-plans` task by task. This is a
> handoff of remaining work, not authorization to merge, release or open gates.

**Goal:** Complete the first defensible native profile qualification without
regressing accepted music, document ownership or the shared Alive/Ultra UI.

**Architecture:** Keep ordinary Ultra presentation hosts, acknowledged native
transactions and the existing qualified-profile importer. Treat the old device
experiment as evidence, never as a replacement host implementation.

**Tech stack:** JavaScript/Tauri, Rust ownership, C++ native DSP adapters, Node,
Playwright and exact-artifact desktop/CPAL harnesses.

**Spec:** `docs/superpowers/specs/2026-11-02-native-library.md`.
**Starting evidence:** `docs/checkpoints/2026-11-15-astra-review.md` and the latest
entry of `docs/superpowers/plans/2026-11-02-native-library-status.md`.

## Global constraints and review focus

Keep all admission/work bounds, driver fences, rollback and revision checks.
Keep proprietary DLLs/resources/captures private. Discovery is not publication;
all ten stages must pass before registry admission. Preserve Max hierarchy in
Ultra and Alive's existing workspace/detail structure. Software loopback never
qualifies physical hardware. Do not mutate a binary used by another session.

Five failure classes own explicit gates below: pending writes on navigation;
foreign reset/retirement during transport changes; incomplete initialization;
small-screen clipped controls; mixed artifact or stale-source evidence.

## P0 — Recover exact evidence and settle navigation ownership

Files: `ui/canvas.mjs`, `ui/canvas-device-panel.mjs`, `ui/canvas-presentation-view.mjs`,
`ui/canvas-presentation-hosts.mjs`, `ui/canvas-dom.test.mjs`,
`tests/ci/canvas-source-preflight.spec.mjs` (all under `apps/ultra`).
Consumes existing `captureScope`, `assertScope`, `settleDrafts`,
`settleParameterGestures` and controller close barriers; produces regression
coverage through those interfaces, not another queue.

- [ ] Fetch branch heads/PRs again; reconcile the private local-session handoff
  and packet identities before touching an actively used checkout.
- [ ] On current ordinary hosts, reproduce two edits where the first native
  acknowledgement is delayed, then select another source/navigate/close.
  Assert exact owner and revision, no redirected second write, and explicit
  commit/refusal/cancellation with the original input recoverable.
- [ ] Test failure of the first and second publication, source deletion,
  cancellation and scope replacement during Save/Close. Retain failed receipts.
- [ ] If a failure exists, fix only the existing scope/settlement boundary;
  preserve rejection and stale-token checks. Do not port `settleControls` or the
  experimental object wholesale. Test entry and Root navigation separately.
- [ ] Run full Node plus `canvas-source-preflight`, `canvas-documents` and
  `live-source-gesture` browser suites with private fixtures when available.
  Review and commit the bounded result with exact SHA and fixture identities.

## P1 — Resolve timing and lifecycle before Alive admission

Files: `src-tauri/native/backend.cpp`, `src-tauri/native/external_device/live_device.cpp`,
`src-tauri/native/alive_session*.hpp`, `src-tauri/src/session/prepare.rs`, and existing
`tests/live_device_*`/desktop timing harnesses, under `apps/ultra`.
Consumes the existing quiescent install/close fence and bounded state batches;
produces measured acceptance or a retained failure, not increased limits.

- [ ] Pin matching Alive/Ultra/native artifacts and run a short diagnostic
  reproducing the ledger's allocator failure and callback overruns. Record
  build mode, sample rate, buffer, playing frames and final worker identities.
- [ ] Add/retain regressions for Stop/Start, seek, loop, clip transition,
  rollback, independent instances and note termination. Assert no preparation
  or destruction in the callback and no allocation in supported callback work.
- [ ] Correct only reproduced causes; rerun the same workload and record every
  over-budget callback. Separate cached requested/applied state from DSP readback.
- [ ] Require exact-artifact native Save/Quit/reopen and bounded retirement,
  then the existing 1800 proven-playing-second gate. A short pilot is not
  endurance. Keep Alive admission closed until measured lifecycle/timing pass.

## P2 — Finish one profile and usable shared editor

Files: `ui/live-profiles/analog/*`, `ui/live-profiles/electric/*`,
`ui/live-device-view.*`, `ui/canvas-presentation-view.*`, and existing
`tests/ci/analog-profile.spec.mjs`, `electric-profile.spec.mjs`,
`live-electric-geometry.spec.mjs`, under `apps/ultra`.
Consumes immutable evidence packets, exact descriptors and complete commanded
state; produces scoped grants with evidence, never guessed defaults.

- [ ] Finish Analog first: endpoint/enum/compound-state checks against original
  observations, complete initialization before notes, same-source instance
  isolation, undo/redo and exact reopened values. Preserve raw slot 194 `12.1`.
- [ ] Reproduce original/current editor captures at 800x600, 1280x800 and
  1440x900; fix clipping within the existing hierarchy and shared controls.
  Require visible reachability, focus and invalid-draft preservation, not just
  screenshots. Recheck actual WebKit after Chromium geometry passes.
- [ ] Keep Electric unavailable until complete initialization and independent
  lifecycle/audio/editor evidence exist. Static facts may progress independently
  but cannot grant runtime qualification.
- [ ] Commit reviewed profile/editor slices with explicit unsupported controls
  and no unrelated shell redesign or new standalone application.

## P3 — Exact-head qualification and eventual library gate

Files: `apps/ultra/live-device-qualifications.json`,
`apps/ultra/import-live-library.py`, `.github/workflows/ultra-ci.yml`, and the
native-library status ledger. Consumes passed stage evidence; produces a reviewed
qualification packet. Publication is a separate authorized action.

- [ ] Build a matching pair at the final source SHA; verify all artifact hashes.
  Follow `apps/AGENTS.md` only when presenting a local manual-test build.
- [ ] Dispatch the existing manual Ultra CI at that exact head. Inspect every
  required job/step/artifact; retain failures/skips and raw wrapper statuses.
- [ ] Reconcile all ten stages and the independent physical hardware/listening
  gap. Do not turn broad CI success into foreign-DSP deadline qualification.
- [ ] Prepare registry changes only after all stages, including Alive, pass;
  test immutable revision/no-op rescans and preservation of user files.
- [ ] Update the draft PR and handoff with exact heads and checks. Recheck remote
  heads before publication; never force-overwrite concurrent work. No merge,
  release or deployment is part of this review handoff.
