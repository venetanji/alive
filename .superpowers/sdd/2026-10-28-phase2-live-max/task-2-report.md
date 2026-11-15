# Task 2 report

Status: DONE_WITH_CONCERNS, candidate frozen for independent review.
Base: 70c356d54e846abb29e21be9e38dfefa14529c75
Candidate: f98d8dc524154e7a0571c53f95e01b8237fb500f
Diff SHA-256: 6ecdd2abeabd3eada672cd1157e24c1d649e444bb272bbdc522f2b57a2024264 (`git diff BASE HEAD --binary | sha256sum`).
Committed files: apps/ultra/ui/alive.mjs, apps/ultra/ui/alive-timeline.mjs, apps/ultra/ui/alive-dom.test.mjs. No new committed files. Original assertions retained.

Source length, rename and note creation capture the originating source and slot or placement identity and refuse if the occurrence is rewired or deleted; direct source targets still resolve by explicit source ID. Workspace operations capture generation, and base edits reject an accepted generation change. Duplicate proposes a free destination when possible and validates current source, placement, bounds and overlap before submission; loop-only changes invalidate brace rendering. Existing sibling edits remain queued and apply in order.

Red evidence (logs beside this report):
- `node --test apps/ultra/ui/alive-dom.test.mjs` with initial regression tests on base: `alive-task2-red.log`, 5 failures (length fixture initially lacked sourceLength support, corrected below).
- Corrected fixture and base `alive.mjs` re-run: `alive-task2-corrected-red.log`, 3 failures: original length 16 vs 8, original rename Changed vs Clip 1, replacement cutoff 3200 vs 2400. The timeline fixes were present during this isolated rerun; initial red captures brace and duplicate failures.
- `node --test --test-name-pattern='queued Add note refuses' apps/ultra/ui/alive-dom.test.mjs` before noteCreate fix: `alive-task2-note-red.log`, original source notes 13 vs 12.

Final green (logs beside this report):
- `node --test apps/ultra/ui/alive-dom.test.mjs`: 92 passed, `alive-task2-final-dom.log`.
- `node --test apps/ultra/ui/alive*.test.mjs`: 107 passed, `alive-task2-final-node.log`.
- From apps/ultra/tests/ci: `ULTRA_TEST_NO_CAPTURES=1 ./node_modules/.bin/playwright test --config=playwright.config.mjs alive-chain.spec.mjs --grep 'Arrangement (pointer edits|creates separate source|selection opens|gain preserves)' --reporter=line`: 6 passed, `alive-task2-final-browser.log`.
- `git diff --check`: clean before commit.

Self-review: existing tests cover valid queued sibling slot and placement fields, selection away, deleted/rewired target refusal and Undo boundaries. New regression covers delayed placement independence followed by length, rename and note creation, selection away, loop-only brace and invalid duplicate; Open reuses the instance ID. Explicit refusal is used instead of retargeting to an independent source. The new independence tests exercise placement, while the existing slot tests exercise rewire/delete and automation; an additional slot source-length/note test would strengthen direct coverage. No native build or GUI was run per lease. The future Master fixture is absent at this base and outside this lease: defer the equivalent Open/reused-instance generation regression to Tasks 6/8. Source candidate frozen pending independent spec and quality reviews; no self-approval.
