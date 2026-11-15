# Alive checkpoint review — 15 November 2026

## Baseline and ownership

Reviewed integration `e3742282d6a53b0d4b228a7408650db32c104da0` on
`feat/alive-native-library-20261102`. The published environment started clean at
`1b5abc9` with a main-only fetch refspec. Explicitly fetched all remote branch
heads before creating `/workspace/alive-astra-review`, branch
`review/astra-checkpoint-20261115`. The original checkout and other remote
branches remain untouched. No existing desktop, launcher selection, release,
merge or deployment was changed.

The separate experiment is `e556347d9d164045c7a69e90fb752481b1f0d0ec`:
`git rev-list --left-right --count e374228...e556347` reports **203 / 1**.
It was inspected selectively, not merged or cherry-picked. The only open PR
found was draft [#12](https://github.com/venetanji/alive/pull/12), head
`11da097c27627a92629632ab62304d799e50099c`, base `main`. It covers an older UI
implementation, so this review uses a separate draft against the integration
branch rather than retargeting or rewriting #12.

Read `apps/AGENTS.md`, current native-library spec/plan/status, published worktree
checkpoints, `ALIVE_UI_HANDOFF.md`, `PHASE2_HANDOFF.md`, `DESIGN.md` surface
contracts, and the experiment's `docs/skills/live-device-mapping/SKILL.md`.
The latter exists only on the experiment and was consulted for evidence and
lifecycle boundaries, not copied into integration. The published November 3
status supersedes older entries. No separate local-session handoff was found
in this environment; the private local checkout, packets and worker reports
named by that status are not mounted. Their assertions remain author-reported.

## Findings and bounded correction

**Fixed: browser patcher navigation can strand a parked numeric draft.**
`navigatePatcher` changed the controller path before render committed the old
view's inputs. A valid root draft of 42 remained 10; invalid input allowed the
path to become `[2]` while render retained the old controls. Their parameter
callbacks then addressed the new scope. Two regression cases reproduced these
failures before the change. Browser navigation now runs the existing focused
preflight before changing scope. Invalid input keeps its original view; valid
input is accepted in its original scope before view disposal. Tests exercise
entry, return to Root, preservation of a child value and subsequent Save.
Native navigation still opens an independently bound window and retains the
parent's controls. No native queue, revision, close-token or DSP changes.

**Resource admission is already stricter on integration.**
`live-resource-pack.mjs` snapshots input before asynchronous hashing, bounds the
parser, admits exact size/SHA identities, brands verified packs and rejects
mixed releases. `live-device-resources.mjs` requires both packs and checks the
saved identity. The experiment has the same verified-pair primitive but its
resource reader allows Graphics to be absent; do not replace the current reader
with that older convenience API. No expanded allowlist or qualification grant.
Private installed-pack positive tests remain unavailable here.

**Save/Close settlement must remain host-specific.** Integration's
`canvas.mjs`/`canvas-device-panel.mjs` freeze edits, capture and settle drafts,
assert surface scope and drain controller gestures/close barriers. Existing
regressions cover delayed linked drafts, invalid input, rejected publication,
surface replacement, stale close tokens and cancellation. Node view disposal
already forgets registered inputs. The experiment's `settleControls()` waits
for bindings during Save/Close, while disposal disconnects bindings and its
navigation only flushes the controller. Its checkpoint explicitly leaves a
second pending binding during navigation unqualified. That experimental path
is absent from current integration (no `live-device-object.mjs`); this review's
browser numeric fix does **not** qualify its asynchronous binding disposal.

**Native lifecycle has fences, not full qualification.** In `backend.cpp`,
foreign graph installation requires stopped/quiescent I/O, prepares a candidate
bank before publication, restores the prior binding on failure, and refuses
foreign-bank destruction while running/ready. `live_device.cpp` validates full
source/descriptor identity before restoring state, uses bounded note storage
and requested/applied command caches. These source mechanisms do not establish
foreign DSP deadline safety, allocation freedom or internal state readback.
The ledger still records callback overruns, an allocator failure and incomplete
wrapper cleanup observations. None is fixed or waived by this review.

**Qualification remains closed.** `live-device-qualifications.json` has an empty
profile list. Publication requires construction, initialization, audio, mapping,
editor, state, instances, lifecycle, timing and Alive stages all passed.
Analog has a narrow one-widget Noise grant and author-reported actual Ultra
Save/Quit/reopen evidence; aggregate `runtimeQualified` is false. Electric has
authored descriptor/mapping/editor facts but no playable registration or guessed
initial state. Alive's browser still presents native candidates as unavailable.
Do not equate static mapping, cached parameter acknowledgement or a standalone
note test with playable Alive admission.

**Preserve UI decisions.** Unify typography, charcoal/amber tokens and shared
controls while retaining Ultra's Max object/port/patcher hierarchy and Alive's
transport/browser/workspace/contextual bottom detail hierarchy. No extra
standalone synth app, audition keyboard or diagnostics strip. The historical
1100px native panel clipping and 800x600 sidebar clipping remain open; this
logic-only change does not claim a visual redesign or geometry qualification.

## Evidence and limits

Reproduced commands and outputs are retained in `astra-20261115/` with a SHA-256
manifest. Full Node suite: 925 total, **891 passed, 34 skipped**, zero failures;
DOM suite: **98 passed**. Two new navigation cases failed on the baseline and
pass with the fix, including child-to-root settlement. Targeted real sandboxed
Chromium (`canvas-hierarchy`, `canvas-documents`, `canvas-source-preflight`,
`live-resource-identity`): **16 passed, 7 skipped**, zero failures. The seven
skips require private qualified resource fixtures. Node skips include DOMParser
and private-resource cases. Skips are not passes.

The broad `check-contracts.sh` run began on the unmodified baseline. Its main
Node portion therefore has 889 passes/34 skips; the final affected full Node
suite was rerun after the fix. The broad command completed with exit 0; its original output is retained in
the evidence receipt bundle. Licensed capture008 and the optional hierarchy oracle report
UNAVAILABLE; no original-host comparison is inferred. An initial `npm ci`
failed because the default cache path was unavailable, then succeeded with a
private `/tmp/alive-astra-npm-cache`. Chromium used the environment's pinned
container and seccomp profile with its sandbox enabled, against this worktree.

Independently queried GitHub: historical manual run
[41661508873](https://github.com/venetanji/alive/actions/runs/41661508873),
attempt 1, is successful at exact
`a277d22667c01fab8135ade49734b74910c632d7`, with all three jobs successful.
Only documentation/ignore changes separate it from e374228. The ledger reports
889 Node passes/34 skips, 425 Chromium passes/38 skips and 343 Rust passes/five
ignored; these counts and native capture details were not independently rerun
here. Prior [41643987413](https://github.com/venetanji/alive/actions/runs/41643987413)
is failed at `6ca6816`; downstream skipped gates do not become passes. GitHub
lists no run on exact e374228. The PR-run-only connector query is insufficient
for this manual-only workflow; REST branch-run history was also checked.

This review does not reproduce Rust, a full paired desktop build, installed DLL
execution, actual native Save/Quit/reopen, physical audio/MIDI, listening,
1800-playing-second endurance or cross-platform qualification. No old binary
was relabeled as this review's head. The private a277 timing and cleanup limits
remain as recorded in `2026-11-02-native-library-status.md`.

Next-stage execution and gates: [prioritized plan](../superpowers/plans/2026-11-15-native-library-next-stage.md).
