# Arrangement Chromium investigation

Base: c272c4a6ac350372e990cad1e5fe3289bba86f9a. Candidate: c7f12ea (commit changes only `apps/ultra/tests/ci/alive-chain.spec.mjs`). No native GUI, audio, build, workflow, dependency, or production changes. Original exact-head cloud failure: root worktree `.superpowers/sdd/2026-10-28-phase2-live-max/cloud-c272c4a/browser-full.log` and `browser/test-results/alive-chain-Arrangement-po-79798-local-view-controls-at-1440/trace.zip`.

The trace shows `toBeVisible` succeeded at 40636 ms, then boundingBox's waitForSelector resolved a visible p-0 at 40651 ms; null was returned and box.x threw. The failure screenshot and accessibility snapshot still contain the placement. Playwright 1.56.1 is both pinned and installed; its locator implementation obtains an element handle then reads the handle's bounding box. Context7 `/microsoft/playwright` documentation says boundingBox returns null for an invisible element and locators re-resolve across actions. The timeline render key includes visible scroll width; a changed key calls canvas.replaceChildren. A local MutationObserver diagnostic recorded replacement during initial display, at visible widths 1268 and 1124. These facts support node replacement as a plausible cause, but the original trace does not record the precise mutation or prove which render caused the original null.

A controlled diagnostic demonstrates the detached-handle mechanism in the actual rendered application at both sizes. Starting from base, immediately before the existing `const box=await p.boundingBox()` insert:

```js
const withElement=p._withElement.bind(p);p._withElement=(task,options)=>withElement(async handle=>{await page.getByRole('button',{name:'Zoom timeline in',exact:true}).click();await page.getByRole('button',{name:'Zoom timeline out',exact:true}).click();return task(handle);},options);
```

This diagnostic uses a private Playwright hook solely to schedule real UI zoom redraws between handle resolution and the box read; it is not included in the candidate. The red reproduces the original TypeError but is an induced interleaving, not a replay of the cloud timing. Candidate reads the currently attached placement and its rectangle together inside one synchronous page evaluation, explicitly checks nonzero geometry, and retains the prior visible assertion and all pointer/history/cancel/authority assertions. It does not guarantee against later layout movement or establish a production defect. A companion forced-green diagnostic inserted the same two real zoom clicks immediately before the atomic read; this validates its behavior after redraw, but cannot prove identical interleaving inside a single JavaScript task.

From `apps/ultra/tests/ci` with installed Chromium and sandbox enabled, commands (logs in `cloud-arrangement-browser-evidence/`):

- Base plus controlled diagnostic: `ULTRA_TEST_NO_CAPTURES=1 ./node_modules/.bin/playwright test --config=playwright.config.mjs alive-chain.spec.mjs --grep 'Arrangement pointer edits' --reporter=line` -> 2 failed, both `TypeError: Cannot read properties of null (reading 'x')` (`alive-arrangement-red.log`).
- Candidate, same command -> 2 passed (5.6s), (`alive-arrangement-green.log`).
- Candidate plus temporary zoom-in/out immediately before evaluation, same command -> 2 passed (4.2s), (`alive-arrangement-forced-green.log`); instrumentation removed before commit.
- Candidate: `ULTRA_TEST_NO_CAPTURES=1 ./node_modules/.bin/playwright test --config=playwright.config.mjs alive-chain.spec.mjs --grep 'Arrangement' --reporter=line` -> 14 passed (14.9s), (`alive-arrangement-cohort.log`).
- `git diff --check` -> exit 0. Local diagnostic output `alive-arrangement-diagnostic.log`; original cloud trace above remains authoritative for the original failure.

Browser tests use the existing browser fixture and do not qualify the native application or audio. Controller owns independent review and fresh exact-head cloud verification.
