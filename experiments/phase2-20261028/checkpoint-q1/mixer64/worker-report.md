# Q1 mixer baseline candidate

Candidate `a31ecfd366858d8599659478656d4b1345fce449`, parent `66249c5935e7ae3fc7fcd6e5d9dafeb84783daad`, in `/home/venetanji/.codex/worktrees/27be/alive`. The commit contains only `apps/ultra/ui/alive.css` and `apps/ultra/tests/ci/alive-chain.spec.mjs`.

The inspector's action list now opens upward over its own track, keeping the inspector's flow height and the mixer baseline stable. While open, the overlay covers part of that track's mixer; the disclosure closes it to restore access. It does not cover the neighboring track or Master in the inspected states. No controls or actions were removed.

## Rendered evidence

Commands run from `apps/ultra/tests/ci` with existing local dependencies, Chromium and the configured local web server:

- RED: `./node_modules/.bin/playwright test alive-chain.spec.mjs --grep 'expanded inspector preserves shared mixer baseline' --output /tmp/q1-mixer-red` exited 1. All four cases failed at the intended expanded fader bottom comparison, with gaps 89, 89, 32 and 57 px (v4/v3 at 1440, then v4/v3 at 1280). Playwright additionally reported 30-second timeouts during failure artifact handling; the asserted failure and screenshots had already been recorded.
- GREEN: `ULTRA_TEST_NO_CAPTURES=1 ./node_modules/.bin/playwright test alive-chain.spec.mjs --grep 'expanded inspector preserves shared mixer baseline' --output /tmp/q1-mixer-green` exited 0, 4 passed. Each captures the expanded state, compares both edges of fader and M/S before/after, opens with keyboard, tests action focus and pointer hit targets, Stop and Master hit targets, and document overflow.
- Existing/related cases: `ULTRA_TEST_NO_CAPTURES=1 ./node_modules/.bin/playwright test alive-chain.spec.mjs --grep 'two fixed track columns|Add note queued behind track removal|eight-track|vertical Session faders|Master.*align|vertical gain fader' --output /tmp/q1-mixer-regression` exited 0, 10 passed (including two of the new cases).
- `git diff --check` exited 0 before commit.

Original captures are under `/tmp/q1-mixer-red` and `/tmp/q1-mixer-green`, with one named `expanded-...png` per viewport and fixture. All four green captures were inspected together: the actions are readable within the track, other mixer columns and Master remain in place, and the piano-roll area remains visible. The eight-track 1280 capture retains existing horizontal session scrolling. This is browser fixture evidence, not native hosting/audio verification.

## Mechanical scan

One separate `impeccable detect --json apps/ultra/ui/alive.css` scan exited 0. It reported existing design-system color and font-size advisories throughout the stylesheet; the new rule introduces no literal colors or font sizes and uses existing `--chrome` and `--line`. Detector output was long and truncated in the tool display; no claim is made that the whole legacy stylesheet is clean.

The browser lease is released after the test processes and their server have exited. Native build, desktop, audio, and broader integration remain with root.
