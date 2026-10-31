# Task 2A Fix Round 1: Pure prospective conversion

Base: b34615c. Read task-2a-review.md and the original task-2a-brief.md.
Address Important I1: prospective_from_document currently calls to_clips and
validate_clips, which query native::clip_capacity and its ADMITTED v3 profiles.
The pure candidate must not depend on that runtime gate. Both direct-document
and prospective legacy-text conversion must work independently of v3 native
admission, subject to the v4 pure limits; mandatory graph/manifest/native
admission still occurs in 2D. V1 retains the existing strict source resolution.

Share the deterministic v2-to-v3 mapping rather than copy it. A narrow pure
helper extracted from clips.rs is allowed. Keep ordinary v1/v2/v3 app decode,
to_clips and validate_clips admission behavior unchanged. Do not weaken
validation, duplicate-map handling or old limits, or add a fake Limits object,
environment flag, production test hook or alternate decoder semantics. The
pure conversion still rejects malformed bank membership, defaults, identities
and v4-invalid candidates transactionally. Existing text API still applies the
1MiB bound and strict original-text validation where required.

Owned source: original workspaces.rs/workspaces_tests.rs plus a narrow clips.rs
shared conversion/validation/typed decode extraction. persistence.rs may only
be touched if a necessary shared path cannot be expressed cleanly otherwise;
explain any expansion before mutation. No UI/native ABI/engine changes.
Controller owns docs/ledger/PR and an independent local CI reproduction, so do
not run GUI or change release binaries. Do not spawn subagents.

Use TDD for the specific coupling; retain red/green evidence demonstrating
candidate conversion survives unavailable native v3 admission rather than only
asserting source shape. Any test-only refusal mechanism must be isolated to
the test process, not a mutable production global or a replacement engine.
Once stable, run the focused workspace tests and affected legacy session
regressions once. Preserve prior logs; put new evidence under
/tmp/alive-workspaces-task2a/fix1. The pre-existing audio.rs:420 warning is
parked by the controller and must remain disclosed, not fixed here.

Commit only targeted source/tests, freeze source/index and write
task-2a-fix-1-report.md with exact commands, evidence, APIs, commit, original
decoder behavior and any remaining concerns. Return concise status and report.
