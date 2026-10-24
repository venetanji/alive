# Task 13a Fix Round 1 Of 5

Read this first. Address the four Important findings T13A-R1 through T13A-R4 in
`task-13a-review.md`, against frozen checkpoint
`68846ce83b56e8e4c419b22685f8486a240764d8`. The original Task 13a brief/design,
storage interpretation and owned-CPAL-error boundary remain binding. The review
has no Critical finding; its inherited warning R5 stays attributed/deferred.
Parent accepts the four Important findings. This is the same task's fix round,
not permission for capacity, scenes, new schema or an engine/dependency rewrite.

## Required Corrections

1. Gate centralized Ultra native graph admission/replacement and root-close
   paths against unresolved Driver retirement. Audit both ordinary document
   commands and native-window/application Quit callers named in the review.
   One nonblocking reap/refusal must precede native replacement and authoring
   state changes. Preserve current successful live-authoring behavior while a
   normal stream is running; this gate concerns unresolved retirement, not a
   blanket stopped-transport requirement for Ultra. Refusal preserves document,
   pending history and native root/admission state. Authorized saves/discards
   must still complete and Quit must retain the immediate terminal-exit
   contingency rather than wait forever or release the old native owner.
   Reproduce and test Ultra admission/root close plus authorized Quit while
   callbacks independently remain alive; normal/live authoring stays covered.
2. Make the epoch consumer distinguish an already-collected evicted prefix
   from an actual missed interval. Use the collector cursor or an equivalent
   explicit retained-view comparison; never globally ignore coverage quality.
   A contiguous 65+ attempt run must succeed and preserve every final record in
   incremental artifacts. A truly skipped/evicted epoch must fail incomplete.
   Keep run identity, finalization, overflow, duplicate and 256-attempt bounds.
3. Clean up the entire owned recorder group even when its leader exits promptly
   and a helper ignores SIGTERM. Successful finish means no live owned helper
   can retain capture descriptors or continue writing. The supervisor-timeout
   fallback must terminate the owned recorder processes before killing the
   supervisor, including a stalled sampler/supervisor case. Use bounded cleanup
   and short real fork/helper regressions. Probes must clean up their helpers
   on every outcome; no process or descriptor may be intentionally abandoned.
4. Enforce the run-wide union budgets of 64 simultaneous sampled processes and
   256 distinct `(PID,starttime)` identities across app, observer/capture and
   private-server groups. Keep their reporting separate and preserve CPU/HZ,
   reparenting/PID-reuse and unavailable-delta semantics. A combined fixture
   whose groups individually fit but whose union exceeds either bound must
   terminate incomplete. Shared admission must not duplicate CPU accounting.

Write meaningful failing focused regressions before each correction; retain
red and green output. Do not weaken native assertions, increase limits, drop
old tests or turn a failed/incomplete measurement into a passing result.

## Evidence And Verification

Finish the pending overhead-control diagnosis with explicit disclosure state
checks, fresh reads and verified stage labels. Preserve the original incomplete
control run and first closure-probe failure as raw evidence. Do not qualify the
blind-toggle comparative labels. Run a bounded corrected control comparison;
no need to repeat unrelated reference research or the final long soak.

Run affected Rust/Python/owner/terminal/callback guards and the required normal
Ultra document regression paths. Rebuild both standalone apps and verify the
adjacent unchanged native library on new inodes. Repeat the short native wrapper
as justified by the changed lifetime/harness paths, with final source/build/
harness IDs and complete epoch/CPU/resource/finite-capture evidence. Existing
source-identical native overhead distributions may be retained with an explicit
impact assessment; remeasure only if a timing-path change invalidates them.
Preserve pending-history, native Quit/window Close, scoped Stop, original clip
assertions and notices. Do not broaden unrelated suite reruns automatically.

Append the correction, commands/results/raw paths, source/build association,
warning/limitation and self-review sections to `task-13a-report.md`; clearly
separate original runs and corrected source. Commit only your source/tests/
source contracts. Parent owns PLAN/ledger/PR/retained experiments and performs
scoped re-review. Notify parent before checkpoint/index activity finishes and
again at source freeze so parent can generate a precise fix package.

No subagents, release-branch edits, merges, tags, publishing/deployment,
persistent settings/credential changes or cloud sessions. One source lane;
parent does not stage/commit while you may use the index.
