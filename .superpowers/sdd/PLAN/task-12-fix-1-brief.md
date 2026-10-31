# Task 12 Fix Round 1

Address both Important findings in `task-12-review.md` against frozen source
`ecfed29fcaa4306568fe5041a962187da7296bfb`. The independent review otherwise
accepts the task's inspected storage/compatibility/ownership/capacity paths.
Keep the correction focused on UI request presentation and covering tests.

- T12-R1: preserve Start/Seek RequestResult identities/status, distinguish
  immediate native refusal, queued and authoritative application, and expose
  later trackless terminal outcomes. A resolved IPC promise is not success.
  Reconcile with the same preparation/serial keys used for track actions; an
  older immediate QUEUED result must not hide a matching newer publication.
  Never announce playback merely from enqueue success. Keep global Stop and
  existing native scheduling behavior unchanged.
- T12-R2: share immediate/polled receipt formatting. Asynchronous WORK_LIMIT
  identifies the known requested track/clip, human reason, retained prior
  playback/pending state and explicit retry after audio advances. Do not invent
  native contributor counts or retry automatically. Preserve active/pending
  presentation and selection while showing the refusal.

Retain the reported red-stage logs and focused immediate/queued/applied/async
rejection regressions. Run affected DOM, full UI and Chromium checks; qualify
the changed UI in a rebuilt separate Alive/native clip journey with exact
source/build/harness hashes. Existing ecfed29 Rust/native/full desktop/editor-
resource evidence remains attributed to that source and need not be rerun for
an isolated formatter change without a concrete new concern. Final CI still
qualifies the later exact pushed head.

Append the fix, commands/results/provenance and self-review to
`task-12-report.md`. Commit this correction separately. Parent supplies an
independent scoped re-review and closes native/build CannotVerify evidence.
No source capacity/schema/engine/ownership changes, no subagents, no persistent
settings/credential changes and no release/merge/tag/publish actions.
