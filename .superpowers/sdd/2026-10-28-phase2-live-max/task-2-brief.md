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


## Actual controller lease

Packet R-A; task 2; accepted source base 70c356d54e846abb29e21be9e38dfefa14529c75.
Workspace: /home/venetanji/.codex/worktrees/27be/alive. Always use this absolute workdir; all edits absolute under it.
Exclusive allowed files: apps/ultra/ui/alive.mjs, alive-timeline.mjs, alive-workspace-edits.mjs, alive-dom.test.mjs, alive-timeline.test.mjs, alive-model.test.mjs, apps/ultra/tests/ci/alive-chain.spec.mjs. Report any required expansion before mutation.
Resources: Browser 127.0.0.1:4173 exclusive; copied node_modules are private. No native build or native GUI required in this lane; controller qualifies integrated native build.
Read Phase 2 spec and development review for context; only your extracted task is the requirements. Task 1 accepted: original unchanged Alive journey fails at line 754, Apply must close old editor generation. Definitive input receipt unknown. Root evidence /home/venetanji/.codex/worktrees/edd5/alive/experiments/phase2-20261028/baseline/native-result.json. Read that folder read-only if useful.
Use systematic-debugging and test-driven-development skills: reproduce, corrected red regression first, minimal cause fix, green. Keep original regression assertions. Use Context7 for actual library/platform API questions, not repository logic.
No merges, pushes, tags/releases/deployments, credential/persistent environment changes, installs or subagents. Do not change worktree topology. You may commit only explicitly leased source/test files in this detached worker; no broad staging. Never touch root/another worker or protected refs. Preserve valid behavior and current runtime capacity.
Full report: /home/venetanji/.codex/worktrees/27be/alive/.superpowers/sdd/2026-10-28-phase2-live-max/task-2-report.md. Record base/candidate/diff hash, complete changed files incl new ones, exact red/green commands/results/logs, original assertions retained, known limitations and self-review. Evidence under this workspace experiments/phase2-20261028/r-a/ or SDD scratch; do not commit bulky artifacts. Return DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT, commit IDs, one-line tests, report path. No self approval. Controller supplies fresh spec then quality reviews.
