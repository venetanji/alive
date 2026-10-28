# Phase 2 Multi-Agent Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development for execution and superpowers:dispatching-parallel-agents for independent packets. This runbook accompanies the primary Phase 2 implementation plan; it does not create a competing task ledger.

**Goal:** Execute the approved Phase 2 direction with multiple
`gpt-6.1-terra` subagents, preserving working music and producing reviewed,
tested checkpoints that survive compaction and can run with little supervision.

**Architecture:** One controller owns integration, shared contracts and final
evidence. At most three children implement disjoint packets or independently
review candidates. Work is parallel where dependencies and file ownership allow;
the saved-owner, native Master and UI slices integrate in that order.

**Tech Stack:** Existing Rust/Tauri/native C++/HTML/CSS/JavaScript and existing
test/CI stack; Codex collaboration agents and isolated task workspaces.

**Spec:** `docs/superpowers/specs/2026-10-28-phase2-live-max-design.md`.
Canonical task definitions: `docs/superpowers/plans/2026-10-28-phase2-live-max.md`.
Resume entry: `docs/PHASE2_HANDOFF.md`.

## Global Constraints

- Linux desktop is the shipped target; preserve separate `alive` and `ultra` binaries.
- Reuse Rust/Tauri, current plain HTML/CSS/JavaScript and the native engine.
- Reuse versioned saved Ultra devices; never copy their DSP into Alive.
- One native absolute audio-frame clock owns scheduling; JavaScript timers never own music.
- Native Faust kernels are not claimed to execute inside Clockwork.
- Keep editor lifetime separate from device/DSP lifetime and instance state.
- Compile, decode, prepare, load and destroy outside the audio callback.
- Callback work is bounded, allocation-free, nonblocking and independent of UI acknowledgement.
- Support explicit mono/stereo channel bundles; arbitrary multichannel and ambisonics are out of scope.
- Preserve four slots/scenes and currently admitted profiles until separately measured admission.
- Keep structural editing stopped and explicit Prepare / Apply until a safer contract passes its own gates.
- Use original UI assets, fixtures and example media; keep private reference captures local.
- No merges, tags, releases, deployments, credential changes or persistent environment-setting changes.

## 1. Model Binding And Capacity

Use **`gpt-6.1-terra`**, exactly. During this planning turn the collaboration API
successfully accepted that ID for `phase2_multiagent_contracts` and
`phase2_multiagent_resume`. The shorter `terra-6.1` failed. The advertised model
list omitted the accepted exact ID; do not infer unavailability from that list
alone or silently substitute Sol. No model/account configuration was changed.

All implementation and review children request `gpt-6.1-terra`, with `high`
reasoning and `fork_turns: "none"`. Supply a self-contained task brief. The
controller remains the main session and does not need a second agent for its
own bookkeeping. Actual capacity here is **four active agents total: controller
plus three children**. Reviewers use the same slots; they are not extra capacity.

If the exact model is rejected in a future session, record the rejection and
continue independent controller work. Do not change settings or choose another
model on the user's behalf. Report a model blocker only when no meaningful
authorized work remains without a new model choice.

Planning review used one earlier Sol scheduling reviewer plus two accepted
Terra reviewers. That mixed planning provenance is not the model policy for
future implementation: the requested execution policy is Terra throughout.

## 2. Roles And Authority

| Role | Responsibility | Mutation boundary |
| --- | --- | --- |
| Controller / integrator | Objective, scope, contract rulings, scheduling, worktree/file leases, integration commits, final evidence and draft PR #6 | Integration branch, planning/progress docs and accepted patches; no protected refs |
| Alive implementer | Queue fixes, Session/Arrangement/Clip/Devices UI and its focused tests | Explicit assigned Alive files only |
| Ultra implementer | Focused drafts, packaging, graph authoring and focused tests | Explicit assigned Ultra files only |
| Host implementer | Saved owner/history/persistence, additive native Master, PCM lifecycle and admission | One bounded host/native packet at a time |
| Delivery implementer | Harness, CI, diagnostics and qualification drivers | Explicit test/workflow files; production changes require an ownership handoff |
| Spec reviewer | Check actual candidate against the frozen task/spec and required behavior | Read-only candidate; tests use separate scratch/artifacts |
| Quality reviewer | Look for bugs, unsafe lifetime/timing, regressions and weak/missing tests | Read-only candidate; cannot approve their own implementation |
| Local reference operator | Bounded Live/Max observation and physical acceptance | One serialized local resource lease; original/source settings preserved |

Roles are assignments, not eight simultaneous persistent workers. Dispatch a
fresh implementer per bounded packet, then fresh reviewers against its exact
candidate. A worker can return findings to the controller but cannot redefine
shared schema/ABI, broaden capacity or approve its own work.

## 3. Workspace And Integration Protocol

The controller is already in a linked feature worktree. Preserve its expected
dirty planning/review files. Before starting workers, publish an intentional
planning checkpoint on the feature branch using explicitly named paths, or
attach an exact original planning packet to each worker. A worker starting at
HEAD alone would otherwise miss currently untracked plans/reproducers.

For parallel implementation, give each packet a separate workspace based on
the accepted integration commit. Prefer a native workspace facility that can
target the worker without moving the controller. If no such per-worker facility
exists, the controller may create task-scoped git worktrees under the user's
already requested isolation policy. Do not relocate the managed root worktree
or create untracked phantom native tasks. Record each path/ref/base and owner.

Collaboration agents initially share the controller's cwd: a spawn does **not**
isolate files. Every tool command must use the assigned absolute `workdir`, and
every edit must target an absolute path inside the assigned worker workspace.
Keep planning packets available there. If workspace isolation is unavailable,
use disjoint file leases in the existing feature worktree; serialize mutation
and stable-candidate testing rather than pretending the workers are isolated.

Worker workspaces have separate indexes, native build outputs, Cargo target
directories, test outputs, temporary XDG state and evidence directories. Copy
verified dependency archives or use a controlled cache; no two setup processes
may extract into one mutable dependency/build directory. A dependency/bootstrap
lease is separate from ordinary source ownership. Do not install packages or
alter the user's environment to increase concurrency.

Only the controller changes worktree topology, integrates patches, pushes the
feature branch or updates the draft PR. Workers may commit bounded changes in
their own assigned worktree, but cannot push or edit other refs. No git merge
operation is used. Return a file-scoped diff, starting head, final candidate
head/diff hash and evidence. The controller verifies applicability and applies
only the reviewed changes serially, retaining worker-to-integration provenance.
Include newly created files in the candidate diff; a plain unstaged `git diff`
does not capture untracked files. No broad `git add -A` or destructive cleanup.

A stale/conflicting patch goes back to a fresh bounded packet against the new
base. Do not auto-resolve a changed contract, dropped user edit or unfamiliar
diff. After application, inspect the integrated diff, run affected tests and
record the resulting integration commit. If application changes the reviewed
logic, review that changed candidate again. Root integration is an acceptance
gate, not proof that worker evidence qualifies a different commit.

## 4. Durable Ledger And Packet Lifecycle

Use the existing SDD mechanism at execution time for the primary plan. Its
workspace is `.superpowers/sdd/2026-10-28-phase2-live-max/`, with first ledger
line identifying `docs/superpowers/plans/2026-10-28-phase2-live-max.md`.
Do not read or repurpose another plan's SDD directory. Keep durable checkpoint
summaries in `docs/PHASE2_HANDOFF.md`; git-ignored worker logs alone are not a
sufficient cloud or compaction handoff.

Each packet follows:

```text
ready -> leased -> implementing -> candidate -> spec review -> quality review
      -> accepted for integration -> integrated -> verified -> complete
```

Failed review returns to `implementing` with finding IDs. A reproducible external
or architecture problem becomes a recorded blocked packet; independent ready
packets continue. "Candidate" and "worker says done" never mean complete.

The ledger records packet ID, parent task, exact scope, dependencies, model,
workspace/base, allowlist, contract version/hash, lease/resource owners, worker
and candidate identities, red/green commands, reviewer findings/verdicts,
integration commit, pending gates, decisions and next runnable action. Record
routine decisions as `Ruling: decision -- evidence/reason -- cost if wrong`.
Never restart a complete packet after compaction merely because its agent is gone.

Review cadence: spec review first, then quality review against the same candidate.
With three active implementers, queue reviews until a child slot becomes free.
Do not start a fourth child. A reviewer can inspect a frozen candidate while
other disjoint packets implement in separate workspaces. At milestone/final
integration, fresh whole-diff review checks interactions beyond individual packets.

## 5. First Tranche Dispatch Schedule

Task numbers below refer to the primary implementation plan. `Accepted` means
reviewed and integrated, with affected integration tests passing.

| Wave / packet | Required predecessor | Child assignments / deliverable |
| --- | --- | --- |
| B0 / Task 1 | Current handoff read and source/dirty identity pinned | One baseline/evidence worker; controller serializes original native failure reproduction; spare slots may inspect bugs read-only |
| R-A / Task 2 | B0 accepted | Alive queue/generation/loop/Duplicate fixes with delayed-IPC regressions |
| R-U / Task 3 | B0 accepted | Ultra focused-editor Save/close preflight, including Perform/Inspector and child views |
| R-D / Task 5 | B0 accepted | Harness/CI owner attributes Apply failure and makes Arrangement journey portable; disjoint from production owners |
| R-P / Task 4 | R-U accepted | Fresh Ultra worker preserves metadata/presets using the accepted preflight; do not overlap Task 3's panel/DOM tests |
| G0 / P2.0 gate | R-A, R-U, R-D and R-P accepted | Controller integrates and verifies unchanged original journeys, state regressions and checked-in Arrangement CI |
| M-C / Contract freeze | G0; read-only preparation may happen earlier | Host implementer plus independent Terra reviews freeze saved owner, native ABI and UI-consumer packet |
| M-S / Task 6 | M-C accepted | Saved v5/legacy ownership, raw strict decode, live/history merge and tests; no UI/native pass claim |
| M-N / Task 7 | M-S accepted | Sole host/native writer implements Master ABI/host/IPC, exact DSP/queue/initialization/rollback tests and profile requalification |
| M-U / Task 8 | M-S and M-N accepted, UI-free native proof | Sole Alive UI writer implements real Master and Live composition; other slots prepare disjoint fixtures or review |
| Q1 / Task 9 | Tasks 2-8 accepted | Native cross-view/save/restart/endurance owner; independent spec/quality reviewers; controller final-head CI/packages and draft checkpoint |

B0 accepts a pinned, reproducible **known-bad baseline**, not a repaired app.
If Apply receipt is not observable in the old harness, record it as unknown
with retained artifacts and dispatch R-D to instrument it. Attribution and the
passing original assertion are required at G0, not prerequisites for the very
diagnostic packet that establishes them.

R-A, R-U and R-D can run concurrently in isolated workspaces. Task 5 may not
quietly edit production Alive/Ultra files: if receipts demonstrate a production
fault, the controller leases that file to one owner and dispatches the smallest
regression/fix packet. Preserve the original editor-close assertion.

Do not run Tasks 6/7 in parallel: they share saved-owner/host/desktop surfaces.
Task 8 may prepare original UI fixtures after interface freeze, but its functional
Master acceptance depends on native proof. Task 6's `alive-master.mjs` ownership
must be explicitly handed to Task 8. Contract design is not an excuse to begin
unfrozen production consumers.

The first user-testable result is **P2.1: trustworthy native Master and Live
workspace**, not the full later roadmap. Later exploration must not delay that
build/PR/checkpoint. Keep the example session playable at each accepted slice.

## 6. Mandatory Master Contract Freeze

M-C is a concrete reviewable packet, not an instruction to "agree on an API".
Its output is updated contract text, raw original fixtures, the exact proposed
C header/Rust layout declarations and the exact snapshot/IPC data shapes. The
three consumers cannot start until each row is resolved and reviewed:

| Boundary | Freeze content and regression witness |
| --- | --- |
| Saved file | Shallow v5 envelope around exactly one v2/v3/v4 score; raw nested-score strict dispatch, duplicate member/map rejection, 1 MiB total, invalid/unknown/nested refusal and actual migration fixtures |
| Migration | Old unity save, non-unity newer save, behavior after touching/resetting gain, v5 reopen retaining its format, new-session defaults, visible newer-format feedback and dirty/cancel semantics |
| Owner/history | Concrete Rust wrapper and `snapshot.master`; musical history owns score only; Master live values survive Undo/Redo/Apply/Discard; failed Open/prepare/save leaves current owner intact |
| Native context | Same single configured Alive session/native engine as existing `alive_session_*`; one output bus outside tracks; document generation authenticated by Rust, not an invented per-track engine |
| ABI | Exact version/struct_bytes input/output negotiation, sizes/offsets/reserved values, capabilities/errors, return values and missing-library/version handling; old layouts unchanged |
| Initialization | Exact quiescent stopped-install route before first output sample, versus callback-boundary live ramp; reset state, no clock advance with I/O off, reapply saved gain and restore old native state on failed install |
| Commands | Bounded queue/callback budget, monotonic serial ownership and wrap/refusal policy, acceptance versus application, actual frame meaning, clear-latch ordering and reserved Stop under saturation |
| Snapshot/meters | Coherent saved target/runtime current gain/serial/frame/peak/latch data; post-gain pre-adapter tap, explicit interval/reset semantics and clip threshold |
| UI / IPC | Exact request/result/event fields with generation and admission/refusal; distinguish pending target/accepted saved target/applied current; bounded drag coalescing retaining final intent on queue pressure |

Use the existing proposed gain range `[0,4]`, 64-output-frame ramp, unity
initialization/equivalence and explicit mono/stereo bundles. Freeze the ramp
formula and absolute-frame receipt with known-PCM tests. An offline stream can
use tiny partitions to prove invariance; that does not admit an unsupported
tiny physical device buffer. No inference of new latency or capacity is allowed.

M-S returns raw decode/migration/history/save/Open rollback results; M-N returns
ABI/layout, per-sample DSP, partition, stopped/live, queue, latch, install and
profile evidence; M-U returns rendered geometry, keyboard/focus/refusal and real
native action receipts. None substitutes its evidence type for another's.

## 7. Later Parallel Waves

| Wave | Permitted parallel packets | Integration dependency |
| --- | --- | --- |
| E0 after Q1 | Task 10 Alive browser/Session; Task 12 Ultra fragments; Task 13 audio contract/decoder fixtures with AUDIO disabled | Each first freezes its focused child contract and ownership |
| E1 | Task 11 Alive editing after Task 10; Task 14 metadata after Task 12 shared-model work; Task 13 isolated decoder/asset implementation | Shared host/history/persistence and native integration serialize under the host lease |
| E2 | Task 13 zero-root PCM/retirement/admission, then waveform/collect/portable UI | Native work follows decoder proof; audio UI acquires Alive lease after Task 11; requalify MIDI |
| X0 | One Task 15 instrument/effect packet; Task 16 matching compatibility fixtures; independent reviews | Core editing/mixed-project gates and cohort prerequisites accepted |
| QF | Task 17 integrated qualification plus fresh spec/quality review | Every included capability accepted; final head and artifacts frozen |

The full parent dependencies still apply. Simpler needs device assets and voice
DSP beyond WAV clips; Sampler needs single-sample proof; recording needs new
input clock/ring/finalization/physical gates. `.als` intake and capacity expansion
are measured lanes after workflow acceptance. A worker must not turn a bounded
packet into arbitrary Live/Max support or select unrelated features to fill time.

## 8. Dispatch Brief And Return Packet

Before each spawn, write a complete brief into this plan's SDD workspace. It
names the accepted base/workspace, task text and relevant spec sections,
allowlist/exclusions, dependencies, frozen interfaces/hashes, red/green tests,
required artifacts and stop/refusal conditions. Do not rely on full chat history.
Do not ask a worker to discover its own protected branch or active file owner.

This is an executable-shaped **example of the Task 2 assignment**, to be filled
from the live lease by the controller before dispatch; the example deliberately
does not invent a worker path or candidate commit:

```js
// collaboration.spawn_agent call; invoke directly, outside functions.exec.
collaboration.spawn_agent({
  task_name: "p20_task2_alive_intent",
  fork_turns: "none",
  model: "gpt-6.1-terra",
  reasoning_effort: "high",
  message: "Implement Task 2 from docs/superpowers/plans/2026-10-28-phase2-live-max.md in the absolute workspace and accepted base stated in your attached lease. Read the Phase 2 spec, focused Oct28 queue reproducers, and the lease first. Own only alive.mjs, alive-timeline.mjs, alive-workspace-edits.mjs, alive-dom.test.mjs, alive-timeline.test.mjs, alive-model.test.mjs and the explicitly leased Alive chain browser tests. Preserve source/occurrence intent and originating project generation, valid queued sibling edits, prepared ownership and current capacity. Port the existing delayed Make Independent/Open examples into failing corrected regressions, then implement and verify. No Ultra, host/native, CI or other workspace edits; no settings, merge, push, release or new agents. Return exact diff including new files, candidate/base identity, red/green commands, observations/limits, changed-file list and unresolved findings. Do not self-approve."
});
```

The attached lease is mandatory input, not something the worker guesses. It
contains actual values at dispatch time; never send a literal unresolved path.
Other packets use the same fields with their own full task and file allowlist.

Each return packet contains:

- Task/lease, model request, exact base/candidate and complete diff hash.
- Changed files, reviewed contract version and deliberate scope exclusions.
- Failing-before and passing-after commands/exit results, with raw artifacts.
- Binary/native-library hashes and environment when execution is involved.
- Original app screenshots/action receipts, resource/clock records if applicable.
- Known limits, refusal/rollback cases and any decisions needing controller ruling.

The spec reviewer checks behavior, scope and acceptance evidence. The quality
reviewer checks actual code, timing/lifetime/error cases and regression coverage.
Findings include severity, file/line, reproducer and required correction. Fixes
receive scoped re-review. Test timeouts, screenshot-only claims, ignored checks
or deleted assertions do not count as resolving a finding.

## 9. Resource Leases And Evidence Boundaries

| Resource | Rule |
| --- | --- |
| Source files / contract | One writer per active file and one accepted version per interface; isolated worktrees do not remove semantic conflicts |
| Native build / dependency bootstrap | Unique mutable build/output roots; one writer for any shared cache extraction |
| Live/Max REA | One bounded local operator on owned private Wine/Xvfb resources; raw proprietary evidence stays local |
| Native GUI/software audio | Isolated display/bus/XDG/audio server/output per job; serial if isolation cannot be proved |
| Physical audio/MIDI | One local device operator; record device/backend/rate/requested and observed periods and routing |
| Endurance / final artifacts | One stable candidate, resource isolation and no binary replacement mid-run |
| Integration / push / PR | Controller only, feature branch/draft PR #6 only |

Cloud workers receive original contracts/fixtures, source pins and allowed
evidence, not proprietary binaries/help/screenshots or personal samples. They
may run genuine native Tauri/software-loopback tests in Xvfb. This proves no
physical output, installed-app equivalence or unobservable backend underrun.

Local reference unavailability blocks only the dependent behavior. Continue
source work supported by accepted evidence, then return to the narrow missing
question before claiming fidelity. Do not rerun all of Live/Max for an already
answered question or reverse engineer Alive/Ultra's available source.

## 10. Resume, Failure And Final Gates

After compaction/restart: read the handoff and primary plan/ledger; inspect
status/refs, worker states, leases, candidates and processes; verify artifact
hashes and the last integrated commit. Reconcile expected dirty files before
dispatch. Unexpected changes from another actor require stopping and asking;
never discard them. Reattach a valid candidate/review or resume the first
incomplete packet; do not duplicate running work or rerun every historical gate.

Routine bounded implementation choices, attributed regressions, transient
infrastructure retries and within-contract fixes are controller rulings. A new
schema/DSP/clock/capacity rule requires the corresponding contract and tests,
not an undocumented worker choice. Preserve failed artifacts and name which
checks were skipped or invalidated.

A concrete architecture/reference/hardware/model blocker records the failing
test or observation, exact source, working slice, attempted alternatives,
measured constraint and narrow decision. Continue independent work first. Stop
the goal when its authorized acceptance gates pass, or meaningful progress
requires that decision or a forbidden/destructive action. Do not fake
completion or mark the old goal complete merely to create a replacement.

Every integrated source/dependency/build-input change invalidates affected
qualification; final CI/packages must run on the final pushed commit. Freeze
that head and exact binary/library hashes for final local native acceptance.
Tests on a dirty worker or former head remain attributed to that candidate.
Preserve original Quit, scoped Stop, pending history and notices gates.

Final musical qualification retains frame offsets `0,1,31,63,64,127`, arbitrary
supported partitions, isolation/overload/termination/mute/solo/round-trip,
cross-path measured alignment and actual native editor/save/restart journeys.
Retain the stronger current **1800 proven playing seconds** gate (beyond the
ten-minute minimum), supervisor bounds and per-epoch resource/counter records.
Physical acceptance remains explicitly pending if hardware is unavailable.
Neither software capture duration nor packages can close that gate.

Task 9 produces a complete first user-testable Master checkpoint. Task 17
produces the final included-scope draft PR with commands, original screenshots,
evidence and honest limitations. No protected-branch edit, merge, release or
deployment is part of either handoff.
