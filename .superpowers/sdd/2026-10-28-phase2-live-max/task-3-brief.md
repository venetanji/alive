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


## Actual controller lease

Packet R-U; task 3; accepted source base 70c356d54e846abb29e21be9e38dfefa14529c75.
Workspace: /home/venetanji/.codex/worktrees/bb01/alive. Always use this absolute workdir; all edits absolute under it.
Exclusive allowed files: apps/ultra/ui/canvas.mjs, canvas-node.mjs, canvas-documents.mjs, canvas-entry.mjs, canvas-inspector.mjs, canvas-appearance-view.mjs, canvas-device-panel.mjs, canvas-dom.test.mjs, canvas-documents.test.mjs, corresponding existing focused tests, apps/ultra/tests/ci/canvas-documents.spec.mjs and a new narrowly named focused-draft module/test if needed. documents_close.rs only after demonstrated existing barrier fault and root notified. Report any required expansion before mutation.
Resources: Private dependency trees copied by controller; all builds inside this workspace. Browser must use separate 127.0.0.1:4174 via scratch config with absolute testDir and webServer cwd/url, not shared 4173; do not edit checked-in config just for port. Native tests use private Xvfb/bus/XDG/software audio and own artifacts. No global settings/package install.
Read Phase 2 spec and development review for context; only your extracted task is the requirements. Task 1 accepted: original unchanged Alive journey fails at line 754, Apply must close old editor generation. Definitive input receipt unknown. Root evidence /home/venetanji/.codex/worktrees/edd5/alive/experiments/phase2-20261028/baseline/native-result.json. Read that folder read-only if useful.
Use systematic-debugging and test-driven-development skills: reproduce, corrected red regression first, minimal cause fix, green. Keep original regression assertions. Use Context7 for actual library/platform API questions, not repository logic.
No merges, pushes, tags/releases/deployments, credential/persistent environment changes, installs or subagents. Do not change worktree topology. You may commit only explicitly leased source/test files in this detached worker; no broad staging. Never touch root/another worker or protected refs. Preserve valid behavior and current runtime capacity.
Full report: /home/venetanji/.codex/worktrees/bb01/alive/.superpowers/sdd/2026-10-28-phase2-live-max/task-3-report.md. Record base/candidate/diff hash, complete changed files incl new ones, exact red/green commands/results/logs, original assertions retained, known limitations and self-review. Evidence under this workspace experiments/phase2-20261028/r-u/ or SDD scratch; do not commit bulky artifacts. Return DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT, commit IDs, one-line tests, report path. No self approval. Controller supplies fresh spec then quality reviews.
