# Windows Probe Compiler Launcher Correction

Base: `0f3776c87b79069e989c5e5be24312ed455ee3ce`.
Worker: `/home/venetanji/.codex/worktrees/2bb3/alive` (clean detached checkout).
Root: `/home/venetanji/.codex/worktrees/edd5/alive`.
Role: fresh Terra/high implementation of one Task 9 delivery correction.

## Evidence And Scope

Read the root `docs/PHASE2_HANDOFF.md` active checkpoint and
`.superpowers/sdd/2026-10-28-phase2-live-max/windows-0f3776c-report.md`.
Original terminal Windows run 40782901980/job 123148786137 fails the quoted
`cmd.exe /d /s /c` compiler launcher. The controlled diagnostic uses the same
paths/arguments and one stdin-fed cmd process: vcvars/rustc/cmd all exit 0
and the probe exists. No fixture case executed. Separate production Rust
capability tests pass; neither fact establishes interactive Windows audio.

Use that successful bounded stdin route as the primary compilation route.
Propagate start, vcvars, rustc, timeout and missing-output failures; only then
enter the unchanged six-case direct resolver matrix. Retain the shared 45s
input/execution budget and separate bounded 5s owned-tree cleanup. Never turn
failure or uncertain cleanup into a success. Preserve observable stage exits.
Do not change ABI/resolver validation, fixture expectations or package notices.
Prefer a small correction of the two existing PowerShell files; avoid general
launcher frameworks and unrelated refactoring. Additional focused Windows
regression coverage is allowed only if it exercises real stage/failure behavior;
do not add text-shape tests mirroring source. Root must approve any workflow
change first. No new dependency or package installation.

Exclusive mutation lease: `apps/ultra/tests/windows/master_resolver_fixtures.ps1`
and `apps/ultra/tests/windows/master_resolver_launcher_diagnostic.ps1` in the
worker only. You may propose a clearer helper filename, but retain old file
history and explain the narrow change. Any new test file must live under the
same windows directory and be included explicitly in the final diff. Report
at root `.superpowers/sdd/2026-10-28-phase2-live-max/windows-stdin-launcher-report.md`.
Root alone changes refs/worktree topology, shared docs, push or PR state.

## Process And Evidence

Use systematic debugging, TDD and verification skills as applicable. Fetch
current relevant PowerShell/cmd/.NET API documentation via Context7 before
API-specific changes; prior source diagnostic report lists official library IDs.
Keep the actual failed Windows job as the retained red case. Run appropriate
available static checks. No local pwsh is expected; do not fabricate a local
Windows green. Source-reviewed candidate can proceed to real Windows CI under
root's separate integration; keep timeout/tree/transcript gaps explicit.
Do not run Wine, GUI, audio, native builds or browser jobs. No cloud mutation,
commits outside your worker, push, PR edits, settings or credential changes.
Do not spawn children. Use explicit absolute workdirs/paths for all tools.

Return the short report contract: base/candidate commit, exact changed files,
diff SHA-256, checks/commands/results, evidence limits and retained failure
semantics. Commit only the leased source files in the worker. Stop with a
frozen candidate for independent spec and quality review; do not self-approve.
