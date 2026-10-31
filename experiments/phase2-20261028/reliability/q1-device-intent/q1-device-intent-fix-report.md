# Q1 Device Intent Generation Fix

Candidate `d13f6e804b7679c8238c8dddc9e7ca10865d0e5e`, based on `210b37e9ca6900c13bfb6c45f7ee8a050914311a`, in `/home/venetanji/.codex/worktrees/27be/alive`. Committed only `apps/ultra/ui/alive.mjs` and `apps/ultra/ui/alive-dom.test.mjs`. SHA-256 of `git diff 210b37e9ca6900c13bfb6c45f7ee8a050914311a HEAD -- apps/ultra/ui/alive.mjs apps/ultra/ui/alive-dom.test.mjs`: `a6e5f1d430f0974c375dbf13266bdc5b02b3f058bb39c35a62616d214e632a28`.

Source SHA-256: `alive.mjs` `9c1659438d8b2acc016cce5c1020bc573f4c26003567adab20b362aebfe71656`; `alive-dom.test.mjs` `c5a34f7e06e00b6654a8bbc2abc64d13619a682d127c9c150e4bdca00bb1f5a4`.

Root cause: the queue retained old track/instance IDs but `command` generated its generation at execution, after Open adopted a replacement snapshot. Existing `setBase` guards against this. The correction captures the click generation and checks it immediately before the synchronous command dispatch for bypass, structural chain commands, track replace/remove/editor (including workspace remove), and selected-device editor. The guard preserves execution-time draft revision for same-generation queue ordering. Track addition has no captured old track/device target and was left outside this narrow correction.

The behavioral regression holds Open, queues each target action with reused IDs, then exercises both successful replacement and failed Open retaining generation. The fixture models generation authentication and mutates state on accepted bypass/device operations, records IPC arguments, asserts replacement remains unchanged and checks same-generation execution. It also checks bypass during playback. Editor cases check IPC identity/generation rather than native editor effects. Device structural fixture uses a title marker to observe accepted mutation, not native structural implementation.

Commands (cwd `/home/venetanji/.codex/worktrees/27be/alive`):

- Before production fix: `node --test --test-name-pattern='queued .* with reused IDs' apps/ultra/ui/alive-dom.test.mjs` exited 1: 6 replacement cases failed and 6 failed-Open cases passed. Evidence `q1-device-intent-red.log`.
- After fix and final test refinements: same command exited 0, 12 passed. Evidence `q1-device-intent-green.log`.
- `node --test apps/ultra/ui/alive-dom.test.mjs` exited 0, 107 passed. Evidence `q1-device-intent-full.log`.
- `git diff --check` exited 0.

Only short GI-free Node tests were run. No build, native/browser/GUI/audio execution, package or environment changes were made. Existing endurance run and pinned binaries were untouched; its native evidence does not qualify these new UI bytes. Fresh final-artifact and native qualification remain necessary.
