# Q1 Integrated Source Review

Reviewed frozen source `1ebf2161e0fa2a62484566fac65c7e940567f357..210b37e9ca6900c13bfb6c45f7ee8a050914311a` using source and Git inspection only.

## Finding

- **P1 — A queued effect bypass can mutate the replacement project after Open.** `apps/ultra/ui/alive.mjs:415` captures the old effect instance ID and desired bypass state, but the queued closure calls `command`, which obtains the generation at execution (`apps/ultra/ui/alive.mjs:21`). For example, start Open while the old project remains visible, then click an effect's Bypass before the Open request completes. When Open installs a project containing the same instance ID, `file` adopts its snapshot before the queued bypass runs (`apps/ultra/ui/alive.mjs:134`); the bypass is sent with the new generation. The native owner authenticates that new generation and instance ID (`apps/ultra/src-tauri/src/session/desktop.rs:395`), so it silently changes the new project's live and saved bypass state. Capture the originating generation when the user clicks and authenticate that generation at execution, as `setBase` already does at `apps/ultra/ui/alive.mjs:486`; add a delayed Open/reused-effect-ID regression. Audit the adjacent structural command queue (`apps/ultra/ui/alive.mjs:403`) for the same generation substitution when its target IDs are reused.

## Qualification Limits

- Final-head CI and packages, actual Windows runtime capability diagnosis, and 1800 proven playing seconds remain pending gates; this inspection establishes no new runtime pass. The documented eight-track timing excursions remain a qualification risk, not an independently established source defect here.
- Later plan tasks, including expanded editing, browser features, audio files, recording, and general Live/Max compatibility, are outside this checkpoint.
- No tests, builds, application launches, GUI/audio operations, or measurement resources were used for this review.
