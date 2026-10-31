# Spec Compliance

- Approved for this correction scope. The Important stale-receipt identity finding and Minor CI-discovery finding from `/tmp/alive-session-ui-review.md` are resolved. No new blocking issue found in the two fix packages.
- Reviewed core correction `e38676ac5e54427631db3f14f17d11eef03a6c49` -> `ad47d2af2ed3422661a6d1e7984821bd57febbae`, then native-driver-only correction -> `6a8f644b194a612af7bec268b4e2b49ea23fb73e`. This was a fix-only review; the original revision was not reviewed or tested again.

# Finding Verdicts

- Resolved, Important: `apps/ultra/ui/alive.html:17` gives the disclosure a stable `scene-history` ID and starts it hidden. `apps/ultra/ui/alive.mjs:126` now applies the same mode visibility to history, scene controls and scene help before returning for legacy mode. Existing v3 rendering refreshes prepared names and result text before the next browser paint. Hidden legacy contents are removed from both visual presentation and the accessibility tree.
- Resolved, Minor: `.github/workflows/ultra-ci.yml:44` retains timing-test discovery and explicitly adds `test_desktop_frames.py` discovery in the same CI step. The existing null-child regression will now run in CI.
- Unchanged, nonblocking: browser color-environment warnings, existing Rust unused-code warnings, private-desktop startup warnings and the original disclosed compact-desktop detector exceptions. No environment changes were requested or added by the correction.

# Strengths And New-Breakage Check

- The production fix is narrowly confined to disclosure identity and mode visibility; it does not change launch commands, scene membership, receipts, native admission, audio, capacity or schemas (`apps/ultra/ui/alive.mjs:126`).
- The DOM regression verifies v3 -> legacy -> fresh v3 identity changes and zero mutation commands (`apps/ultra/ui/alive-dom.test.mjs:139`). The rendered Chromium regression additionally checks actual visibility and the accessibility snapshot, including removal of old identities/results (`apps/ultra/tests/ci/alive-chain.spec.mjs:56`). These test the observed failure rather than merely checking the new hook.
- The targeted native driver uses a genuinely playable legacy fixture refused by conservative clip-bank admission, checks legacy accessibility absence, opens fresh prepared identities, verifies the previous scene receipt is blank, and obtains a newly applied receipt (`apps/ultra/tests/check_alive_scene_modes.py:33`, `apps/ultra/tests/check_alive_scene_modes.py:51`, `apps/ultra/tests/check_alive_scene_modes.py:59`). Restarting audio after Open is explicit and respects the existing stopped-audio session boundary (`apps/ultra/tests/check_alive_scene_modes.py:68`). The first failed native attempt remains documented; no production workaround or weakened assertion was introduced.

# Evidence Checked

- Read both supplied fix diff packages and the appended report section; no further production files or broader codebase were inspected. No git operations, suite reruns, native reruns, visual pass or worktree mutation were performed by this reviewer.
- Raw `/tmp/alive-session-ui-revision-fix1-20261026/node-green.log`: 68 passed, 0 failed. `browser-green.log`: targeted rendered transition 1 passed. `ci-timing.log`: 10 tests OK. `ci-frames.log`: 1 test OK. Their exit files and `build-final.exit` all contain 0. Retained `browser-red.log` and `transition-visibility-red.log` reproduce the old visible-disclosure failure.
- `native-corrected.exit` contains 0. Raw `native-corrected/scene-mode-report.json` contains 189 legacy accessibility nodes with none of Scene receipts / Prepared scene 1 / Scene 4 request / Launch scene 4; its 226-node fresh tree contains the fresh prepared name and an empty old Scene 4 output. The final new Scene 1 request is request 2 applied with both members applied, after old Scene 4 request 1 applied. The full original clip journey was not repeated for this localized correction.
- Independently computed SHA-256 values match all six entries in fix1 `binary-source-pins.json`, including new Alive binary `f9ae9e6e2e33f9ffc875f4438ba5b8c641df16a1ecee923e3e884e8917d7640a` and unchanged native library `9a43a0314e76061f4e1407d98d9e27944b96b4fe8b14f8f432540093bcd1dbb5`. `final-manifest.json` records the core/native-driver commits, scoped source/test/workflow pins, matching binary-source pins and successful corrected native run.
- Verification boundaries remain those of the original review: physical audio/endurance and unchanged whole-product behavior are outside this fix-only approval. The supplied corrected native evidence and rendered transition test directly cover this correction's risk.

# Assessment

- Spec compliance: Approved.
- Code quality: Approved.
- Blockers: None. Both actionable original findings are resolved; previously disclosed warning noise remains nonblocking.
