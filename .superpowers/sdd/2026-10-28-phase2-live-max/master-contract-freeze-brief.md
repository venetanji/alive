# M-C: Concrete Master Contract Packet

Workspace: `/home/venetanji/.codex/worktrees/bb01/alive`.
Accepted application base: `c6df81f2d4fd6164930bca6847faf783b1949624`.
Controller: `/home/venetanji/.codex/worktrees/edd5/alive`.
Model: explicit `gpt-6.1-terra`, high, fresh context. No subagents.

## Task And Authority

Produce the concrete reviewable M-C packet, not production implementation.
Local G0 is green; exact-head CI/packages 40695723200/40695723144 are running.
Preparation may proceed now. Do not authorize production consumers or declare
the contract frozen; root accepts it after independent review and G0.

Read the retained draft and preflight reviews under
`experiments/phase2-20261028/reliability/proposals/`. These contain the exact
values, declarations and witness cases to preserve. Read spec sections 6/11
and execution runbook section 6 only; do not read/reexecute unrelated tasks.
Inspect current source where the proposal points; its old line numbers may
have moved. The linked-owner Save fixes are already accepted and must survive.

## Exclusive Mutation Lease

Create only these original contract files and tests/fixtures beneath them:

- `docs/contracts/alive-master-v1.md`: concrete saved/native/IPC/UI contract.
- `docs/contracts/alive-master-v1.h`: exact additive future C ABI declarations,
  including existing session header includes, with layout assertions/probe.
- `docs/contracts/alive-master-v1.rs`: matching Rust layouts, function-pointer
  types and compileable size/alignment/offset witnesses using the pinned Rust.
- `docs/contracts/alive-master-v1-fixtures/`: raw original positive/negative
  v5/legacy fixtures, exact DTO/IPC examples, and narrow validation drivers.
- Your report and logs in this plan's ignored `.superpowers/sdd/` workspace.

Do not mutate `apps/`, CI, Cargo dependencies/lockfiles, shared design/PLAN,
the root checkout, protected branches, installed apps or persistent settings.
No GUI/audio launch, native engine build, push, merge, release, or new agents.
You may compile standalone C/C++ ABI and Rust layout witnesses into scratch.
Preserve pre-existing untracked worker evidence. Worktree is already attached
and updated to the accepted base; no new checkout/worktree is needed.

## Required Packet

1. Specify one authoritative `SavedSession` wrapper and exact call boundaries
   for decode, prepare, install, draft materialization, history and atomic Save.
   Keep score DTOs unchanged. Resolve concrete names/ownership without a second
   mutable score/Master copy. Record any justified variation from the proposal.
2. Preserve strict raw parsing: recursive duplicates before any lossy parse,
   raw nested v2/v3/v4 dispatch, nested v1/v5 refusal, complete 1 MiB bound,
   old unity wire retention, sticky promotion after actual accepted gain use,
   no-op/reset/cancel/failure semantics and visible migrated-save feedback.
3. Preserve exact draft ABI/status/version/size/features/layouts, optional symbol
   identity/lifetime rules, full/partial/old module behavior and platform limits.
   Include exact compilable C header and Rust mirrors, not prose-only promises.
4. Preserve both serial reservations before retiring I/O; pending retirement
   returns without native replacement/rollback; successful rollback updates
   retained accepted serial. Quiescent set/reset drains FIFO at unchanged frame;
   live ramp is exactly the stated 64-frame formula. Preserve Stop priority,
   bounded queue/publication, combined rejection coherence and meter intervals.
5. Freeze exact snapshot/request/success/error shapes and code-based retries,
   one in-flight plus one replaceable unsent gain, final drag retention,
   generation cancellation and bounded ordered reset. No UI is implemented.
6. Supply raw literal duplicate/member/map fixtures, v5 each legacy score and
   v3 eight-track case, gain 0/0.5/1/4, invalid/nested/unknown/missing cases and
   reproducible boundary-size fixture generation. Ordinary JSON maps cannot
   serve as duplicate-key witnesses. Derive original scores from repository
   examples/tests and keep dependency references/execution claims explicit.
7. Validate C and Rust ABI witnesses against actual existing header names;
   validate fixture identities and expected raw structure without pretending
   the not-yet-written v5 decoder/native APIs already pass. Label prospective
   implementation witnesses and measured portability/performance gates clearly.

The original draft already addresses five preflight findings plus retirement
and rollback-serial follow-ups. Do not restart that design discussion or erase
those constraints. If a new source conflict appears, isolate and report it.

## Report And Handoff

Write `master-contract-freeze-report.md` beside this brief in the worker's
plan workspace. Include base/candidate commits, complete changed-file list and
diff hash, exact commands/results, fixtures and layout evidence, unresolved
questions/limitations and ownership handoff for Tasks 6/7/8. Commit only leased
contract files in the isolated worker; do not self-approve or freeze consumers.
Return status, candidate, short verification summary and concerns only.
