# Task 3 Frontend Review

Reviewed committed frontend `3a84a3f` against the current
`apps/ultra/src-tauri/src/session/desktop.rs`, the Task 3 brief in PLAN.md,
and `apps/alive/SESSION_CONTRACT.md`. No production edits or commits.

## Findings

### Minor / P3: Live base changes leave the automation graph's base segment stale

Location: `apps/ultra/ui/alive.mjs:127` (music render invalidation),
`apps/ultra/ui/alive.mjs:96` (paintLanes).

The automation SVG starts at the current saved base, which is the effective
value before the first point. Live base changes refresh the numeric controls
and effective readouts, but the music render key contains only selected track,
tempo, length, loop, notes and automation. It omits manifest bases, and render
does not otherwise repaint the lane SVG. A panel or hosted-editor base edit
therefore leaves the visible base segment at its previous height until another
musical edit rebuilds/repaints it. Empty lanes also show the old base line.

Deterministic reproduction using the existing real-module DOM adapter:

1. Set the first cutoff automation point to beat 1 before mounting.
2. Mount Alive, capture the cutoff lane path.
3. Update the backend cutoff base to 3500 and refresh.
4. The Cutoff base number reads 3500, but the initial beat 0..1 SVG segment
   retains the identical old path coordinates.

Evidence: `/tmp/alive-frontend-review.test.mjs` and
`/tmp/alive-frontend-review-curve-red.log` (one expected failing assertion).
Repaint lanes when their current binding bases change; audio admission and
saved base/effective ownership are unaffected by this visual defect.

No Critical or Important functional findings were identified in this scope.

## Reviewed Behavior

- Start directly queues alive_transport(start), then refreshes. There is no
  frontend branch suppressing Start after Apply or device replacement. The
  journey3 failure dump contains a still-open Load Ultra Device chooser,
  consistent with the parent's native-dialog harness diagnosis.
- Real numeric change events create musical drafts; polls retain those drafts
  and merge live base/mixer values. Rejected Apply retains edits. Save/close
  synchronize drafts first and abort on synchronization failure. Native dialog
  results authoritatively restore, discard or retain pending draft state.
- Panel and graph bound edits both call alive_base. The hosted editor captures
  generation/track before queueing, and Rust checks editor identity/track and
  generation. Effective values and automation ownership remain separate from
  the saved base.
- Hosted view renders the real saved graph using incumbent Ultra components.
  Structure changes have the explicit stopped-source/Replace workflow. Its
  close handler blurs/flushes queued edits then closes only the window; it sends
  no native Stop/reset/install operation. Rust owns hosted device lifetime and
  closes stale editors after replacement/application.
- Readouts use actual native/Driver snapshots, including callback peaks,
  active voices, absolute frames, stream errors and reported audio status.

## Verification And Limits

- `node --test apps/ultra/ui/alive-model.test.mjs apps/ultra/ui/alive-dom.test.mjs`:
  8 passed, 0 failed.
- Inspected actual event hookups, queue behavior, state model, graph component
  callbacks, desktop command signatures/ownership and contract boundaries.
- Impeccable context/audit guidance loaded; mechanical detector output saved
  in `/tmp/alive-frontend-review-detector.json`. Palette/type-ramp advisories
  do not establish runtime defects. Its file-preview computed-font warnings
  are not evidence that the native Liberation Sans stack fails.
- This review does not establish real native playback continuity, chooser
  behavior, geometry, physical-device timing or endurance. The parent owns
  that native walkthrough and acceptance evidence. No production files changed.
