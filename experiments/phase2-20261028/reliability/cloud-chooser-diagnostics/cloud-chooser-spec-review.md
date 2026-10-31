# Cloud chooser specification review

Verdict: **Does not fully meet the bounded diagnostics requirement.** The candidate otherwise preserves the original native input sequence and assertions in the reviewed diff, and confines changes to the authorized test files. This is evidence collection for a future cloud run, not a demonstrated correction or G0 acceptance.

## Finding

- **P2 — Diagnostic discovery is not bounded** (`apps/ultra/tests/check_alive_desktop.py:293`, `apps/ultra/tests/check_alive_desktop.py:305`). Each observation calls `ui.find(name)`, which traverses the accessibility tree, and the before-input observation also searches `ui.walk(frame)` for the web document. Neither traversal has a node or time limit; the 32-step bound applies only to the subsequent hit-path descent. These synchronous operations occur before focus or the original click, so a large, cyclic, or unresponsive accessibility tree can delay or prevent the native action. This falls short of the controller's bounded passive observation constraint and can affect the very timing under investigation. AT-SPI calls themselves can also block independently of the path-depth cap.

## Scope and provenance

Reviewed the supplied candidate diff once against the original brief, controller follow-up, and worker report; inspected unchanged `walk`, `find`, and `wait_for` only to resolve the traversal-bound risk. The diff does not remove or alter the native journey's pending-history, scoped Stop, editor lifetime, actual chooser/replacement, or Quit assertions. It retains the same focus, extents-based click decision, one motion/press/release, flush, and existing sleep; added observations can still affect timing, as the report acknowledges.

The report identifies base `c6df81f2d4fd6164930bca6847faf783b1949624` and abbreviated candidate `4c1f19b`, matching the supplied `4c1f19be75ac99862a79e21811850e30d8278520` diff. Its three changed files match that diff, and it distinguishes local binary hashes from unavailable CI binary identity. Its statements that the historical failure remains unproven, no causal correction or red/green regression is claimed, and further cloud evidence is needed are appropriately qualified. The reported executions and artifact contents were not independently rerun or verified in this read-only review.

## Round 1 scoped re-review

**Bounded-discovery finding: ADDRESSED** in `01be885948da67f8ee0962979e0087690166fd1a`. The original control is passed to the observer, eliminating the new full-tree searches. Ancestor and planned-hit walks each limit work to 32 nodes and check a 0.15-second deadline between calls, returning explicit truncated or unavailable results. As the report states, a single synchronous external AT-SPI call can still exceed that work budget; this is a known limitation of the bounded-work approach, not evidence of an unbounded traversal. The reported hit correctly describes a planned pre-motion hit, not the actual input recipient.

No introduced behavioral breakage found in the scoped fix diff. The report explicitly attributes the full native journey to predecessor `4c1f19b`, and reports focused native and helper checks for `01be885`; none was rerun in this review. One minor provenance inconsistency remains: the earlier sentence listing three candidate files omits the two new helper/test files shown in the round 1 diff, although the round 1 section identifies the helper and its regression. No production fix or G0 acceptance is established.

## Round 2 scoped re-review

**Verdict: Meets the scoped specification.** No introduced breakage found in `01be885948da67f8ee0962979e0087690166fd1a..490ec16e0698e02480db020e18fbfe3f17bd7cb6`. The optional editor observer argument restores three-argument direct-call compatibility, the focused diagnostic checks the failure isolation and duplicate behavior, and the single workflow discovery line runs the chooser helper tests under the controller's expanded authorization. The prior file-list inconsistency is corrected in the frozen report.

The report distinguishes its editor regression red/green and focused chooser verification from the full journey, which remains attributed to `4c1f19b`. Its execution results were not rerun in this review. Historical CI causality remains unproven; this verdict is not a G0 pass.
