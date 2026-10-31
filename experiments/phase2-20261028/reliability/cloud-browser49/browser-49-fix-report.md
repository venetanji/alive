# R-B49: Arrangement lane geometry candidate

Base `49d68bb9fa7e7d1d07ddd26950a22f62a3ba89c6`; candidate `f03516116de0d0823851d9e789f5078e1cecb3f4` in `/home/venetanji/.codex/worktrees/27be/alive`. The commit changes only `apps/ultra/tests/ci/alive-chain.spec.mjs` (18 insertions, 3 deletions). Its complete diff is `git diff --binary 49d68bb9fa7e7d1d07ddd26950a22f62a3ba89c6 f03516116de0d0823851d9e789f5078e1cecb3f4 -- apps/ultra/tests/ci/alive-chain.spec.mjs`, SHA-256 `8d169aa793473b581fede2f7eb396f340be194082d04af8de1511bf696a1a034`. Candidate file SHA-256: `a46a92c187f7321ae1d4d36c293dd2df065b6f8dc0c2522a27e0c45d7eb2ec8d`.

The first blank-lane drag now queries the current first lane and reads its nonzero geometry in a single browser evaluation, then supplies that box to the existing real pointer sequence. All original source, placement, stale gesture, brace, history, and edit assertions remain. The new regression verifies that an actual zoom redraw replaces the lane, exercises the 8-to-10 beat range drag, and checks MIDI source creation. Its test-only pinned Playwright private hook forces an additional real redraw between locator handle resolution and the geometry call if the old handle-based path is used. The candidate's atomic read bypasses that hook; its green result demonstrates a real redraw before the transaction, not a redraw inside the transaction.

## Focused evidence

All test commands used `/home/venetanji/.codex/worktrees/27be/alive/apps/ultra/tests/ci`, pinned dependencies, `ULTRA_TEST_NO_CAPTURES=1`, `timeout --kill-after=3s 30s` for the three final focused runs, and distinct `--output` directories. Full command form:

```
ULTRA_TEST_NO_CAPTURES=1 timeout --kill-after=3s 30s ./node_modules/.bin/playwright test --config=playwright.config.mjs alive-chain.spec.mjs --grep '<case>' --reporter=line --output='<unique results directory>'
```

- Initial original-case diagnostic control: first lane connected and current, box `(332,216,768,63)`; 1 passed. Induced zoom-in/out at the handle boundary detached the old lane, left a current lane at the same box, returned null, and produced the original `box.x` TypeError; 1 expected failure. Each used a separate 45-second supervisor. This establishes an induced mechanism, not the cloud's actual cause.
- `switch.py red` temporarily replaced only the atomic helper body with the original handle-based drag. The new `Arrangement blank-lane drag selects the range after a timeline redraw` regression failed with the expected null `x` TypeError (1 failed). `switch.py green` restored the exact candidate hash above; that same regression passed (1 passed).
- The original `Arrangement creates separate source and occurrence history and cancels stale gestures and brace previews` case passed on the exact restored candidate (1 passed). No assertions or pointer gestures were relaxed.
- `node --check apps/ultra/tests/ci/alive-chain.spec.mjs` and `git diff --check` completed successfully during source preparation. No dependency, UI, runtime, native, or workflow files changed.

Raw logs and separate result directories are retained under `/home/venetanji/.codex/worktrees/27be/alive/.superpowers/sdd/2026-10-28-phase2-live-max/browser-49-worker/`: `control.log`, `forced.log`, `forced-results/`, `RED.log`, `RED-results/`, `GREEN.log`, `GREEN-results/`, `SCENARIO.log`, and `SCENARIO-results/`. The red/green switch script is retained there as diagnostic scratch; it is not in the commit.

The first window ran 6.713 seconds and the final three-run window 9.330 seconds. After each window the owned Playwright, Chromium, and server processes exited; after the latter, port 4173 had no listener. Both windows were released to the native worker. No full browser suite, native/audio, or performance test was run as part of this candidate. The cloud trace does not prove that redraw caused its null geometry, geometry may move after the atomic read, and unrelated placement and brace geometry reads retain their existing behavior. Fresh independent spec and quality reviews, serial integration, and full final-head CI remain required.
