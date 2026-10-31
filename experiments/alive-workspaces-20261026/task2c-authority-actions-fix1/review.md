# Task 2C authority actions fix round 1 review

Reviewed `92d84d1f53dc1d8ad4f7b345f16f862e911d3ec7` to
`74d92d407602d3fd7b8c2ac6161d59220eb09f1f` on 2026-10-27.

Scoped spec verdict: APPROVED.
Scoped quality verdict: APPROVED.
New breakage in the fix delta: none found.

This closes the prior pending-slot P2 and its associated playing/concurrent
coverage gap. The original review's architectural assessment and explicit
future gates continue to apply. Approval covers this finite MIDI authority
sub-slice with the reviewed correction; it does not activate shipping v4.

## Per-finding verdicts

### Pending Launch slot erased at Arrangement boundaries: addressed

`apps/ultra/src-tauri/native/alive_session_workspaces.hpp:421` now derives
`cursor.pending_slot` from the existing track pending action and global pending
token after the prospective authority/occurrence calculation. Thus fresh
Arrangement cursors cannot erase an independent future Launch's slot. For
Return, Stop and no pending action the field is NONE. The assignment stays
inside the shared transition scratch; it introduces no extra lookup, admission
path, pending owner or receipt mutation. Due actions still use the previously
reviewed commit/receipt/clear ordering, which clears pending metadata before
publication. Rejected prospective work does not publish this scratch field.

The new `pending_slot_boundaries` regression at
`apps/ultra/tests/alive_session_v4_authority_test.cpp:939` uses track 1 local
slot 3, global slot 5, source 3. It checks pending action, slot, serial, absolute
target and receipt identity/masks at twelve checkpoints around the same-source
boundary at 10000, gap entry at 20000, gap exit at 30000 and target 48000.
Arrangement source/placement and gap phase are checked separately. Application
then requires Session authority, global slot 5/source 3, phase 1001 after the
first sample, exactly one additional epoch, cleared pending fields and applied
member mask 2 with the original target preserved.

The retained original reproduction is RED against the baseline backend and
GREEN against the corrected backend: at position 10001 the pending slot now
remains 0 while action 1 and receipt pending mask 1 remain unchanged. The new
sparse regression is independently RED against the baseline at its required
global slot 5 identity assertion. This is direct coverage of the reported
failure, not merely an assertion of the new assignment.

### Concurrent pending projection was unexercised: addressed

`bounded_reduction_and_coherence` retains the stopped reduction checks and adds
playing sparse Launch coverage while its snapshot reader runs. The reader
checks pending receipt target against track target and requires the expected
global slot, serial and absolute target. Atomic observation counters require
successful reads after each of the three Arrangement boundaries and after
application. The control thread waits outside the callback for each region's
observation, with a five-second deadline, so missing every pending transition
cannot produce a vacuous pass.

Expected identity is established before rendering consumes the queued action.
The test stops advancing at position 48001 while it requires an applied-state
observation, making its exact position/phase assertions consistent with the
published state. No production synchronization, allocation or lock was added.
The updated implementation report explicitly corrects the historical
stopped-only coverage claim.

## Evidence verification

Read the prior authority-actions brief, current report's fix handoff and the
complete supplied 13,078-byte `review-92d84d1..74d92d4.diff` once in bounded
chunks. The delta contains only two files: two production lines and the
focused regression/concurrent coverage additions. Unchanged implementation
was not re-reviewed.

Under `/tmp/alive-workspaces-task2c-authority-actions/fix-1`, independently
matched all 68 inventoried artifact SHA-256 values, all 15 current-file pins
and all 43 retained-artifact pins. The two `final-source/` copies match current
source bytes. Base/implementation pins match this review's stated scope.
The PCM, dispatch and work traces are byte-identical to the original
implementation; the PCM hash remains
`d33c7335cb3c14d8f6d34990770d645a5064958e08844948096152ed66c0bc11`.

Verified command metadata and corresponding logs establish:

- Original review reproduction: baseline compile exit 0 and execution exit 1;
  corrected compile and execution exit 0, with slot 0 retained at 10001.
- Sparse regression RED: compile exit 0 and SIGABRT return -6 (shell 134) at
  the pending global slot 5/action/serial/target assertion.
- Final focused run: exit 0 in 45.13031977100036 seconds, including the new
  twelve checkpoints, existing authority checks and original v4 suites under
  the existing warning and callback-guard policy.
- Final native CI: exit 0 in 171.13981463100208 seconds. The log includes the
  unchanged 106661824-assertion oracle, new authority regression, original
  regressions and 42 edit plus 42 baseline Stop-stress cycles over 43008 samples.
- Concurrent observations: focused run has 27010 playing-pending reads,
  boundary mask 7 and two applied reads; native CI has 29367, mask 7 and two.
  Scheduling-dependent counts are reported as evidence, not exact expectations.
- Current-source shipping check: compile/run exit 0 without the provisional
  definition; shipping admission remains disabled.

The baseline and corrected review harnesses retain the original review's two
include/renamed-main warning suppressions only. The focused production/test
build continues using Werror without those suppressions. Original RED artifacts
and the initial implementation record remain separately retained.

No unanswered behavior doubt required an additional reproduction or suite run.
This review performed no git command, source/index edit, build, broad crawl or
subagent work. Only this review document was written; parent PLAN is excluded.

## Scope and residual gates

No additional out-of-scope defect was observed in this delta. It changes no
envelope, resource ceiling, ABI, queue/receipt capacity, Stop semantics, clock,
renderer or shipping gate, and leaves the established legacy assertions intact.
The evidence supports closure of the two prior concerns without widening the
review to unchanged code.

The carried old-pending plus failed optional Seek scenario remains a required
next-slice test when authority-aware Seek is admitted. Source suffix loops,
song loops, audio, desktop/Rust integration, timing/deadline qualification,
shipping activation and the end-user journey retain their prior gates.
