# Cloud chooser diagnostic quality review

Candidate: `4c1f19be75ac99862a79e21811850e30d8278520`; base: `c6df81f2d4fd6164930bca6847faf783b1949624`.

## Findings

- **P2 — Observation work is not bounded by the 32-node hit-path limit** (`apps/ultra/tests/check_alive_desktop.py:291`, `apps/ultra/tests/check_alive_desktop.py:303`). Every phase calls `ui.find`, which recursively walks the accessibility tree, and the before phase separately walks the frame to find the web document. Those traversals have no node or time limit, and synchronous accessibility calls can stall. They run on the input path, including between focus/geometry and the single click, so an unhealthy or very large accessibility tree can delay or prevent the original action. The 32-iteration cap bounds only the subsequent hit descent, not the full observation. The path also silently stops at that cap without marking truncation.
- **P2 — The accessible hit is sampled before pointer motion, not at delivery** (`apps/ultra/tests/check_alive_desktop.py:305`, `apps/ultra/tests/check_canvas_desktop.py:114`). The candidate resolves the hit path before the original XTest motion, press and release. Hover or other layout changes caused by that motion, or changes during the synchronous observation, can make the recorded hit differ from the control receiving the click. Treat it as a pre-input hit at the planned coordinate, not proof of the recipient; the report's statement that a future failure can distinguish the accessible hit on the button needs this qualification.

## Verdict

Changes requested before calling this bounded diagnostic preparation: bound or explicitly characterize the potentially unbounded tree lookup, make truncation visible, and qualify the hit observation's timing. The review did not run tests or inspect runtime artifacts; reported passing runs and hashes are worker claims, not independently verified here.

The diff retains the existing motion/press/release assertions, one-click picker flow, chooser timeout and journey assertions. The added generic observer phases reach the existing editor observer, which ignores them; existing editor receipts retain their before/queued handling. Observation exceptions inside the main capture and output-write exceptions are recorded or reported without deliberately changing the input decisions, though synchronous work can perturb timing as described above. No production, CI, settings or reference changes appear in the supplied diff.

The report correctly distinguishes the local binary hashes from unavailable CI binaries, reports successful local runs and the controlled clipped pre-focus geometry without claiming the CI cause, and makes no bug-fix or G0 acceptance claim. The original failure's actual accessible recipient and immediate post-focus geometry remain unknown.

## Round 1 re-review: 01be885

- **Finding 1 — ADDRESSED.** The new observer uses the already selected control and replaces full-tree searches with explicitly capped ancestor and hit traversals, including node/time truncation statuses. Budgets constrain work between calls; individual synchronous accessibility RPCs can still block, as the helper and report acknowledge.
- **Finding 2 — ADDRESSED.** The field is now `planned_accessible_hit`, and the report explicitly says it precedes pointer motion and cannot establish the actual recipient after hover or layout changes.

**New P2 — Existing editor diagnostics call the changed signature with three arguments** (`apps/ultra/tests/check_alive_desktop.py:344`, `apps/ultra/tests/check_alive_editor_diagnostics.py:24`). The new fourth required argument is passed correctly through the regular navigation/click observer path, but three direct calls in the unchanged editor diagnostic still use the old signature. The isolation decorator swallows the resulting `TypeError` and records it as an unavailable observation. Consequently the unavailable-observation test can pass without exercising the intended inner failure handling, and the repeated-diagnostic check no longer exercises the intended duplicate guard. Preserve compatibility or update those call sites and verify their intended behavior.

Verdict: both prior findings are addressed; changes requested for the editor diagnostic regression. The reported four helper tests, navigation test and focused native run were not rerun in this review. The report correctly attributes the full journey to 4c1f19b, not 01be885; neither candidate establishes the historical cause, a bug fix or G0 acceptance.

## Round 2 re-review: 490ec16

**Editor direct-call compatibility and false positive — ADDRESSED.** The fourth observer argument is optional, restoring the existing three-argument callers. The editor diagnostic now checks the intended inner failure types and verifies that a duplicate observation adds no swallowed failure. The added CI workflow entry runs the chooser helper tests in the existing explicit desktop diagnostics list.

No new findings in the scoped fix diff; the diagnostic candidate is acceptable for evidence preparation. The worker reports a native editor regression red/green, a passing focused native chooser run, and passing helper and navigation tests; this review did not rerun them. The full native journey remains attributed to 4c1f19b, not this candidate. External accessibility calls can still block and observations can affect timing. The original CI cause remains unproven, and this verdict is neither a bug-fix nor G0 acceptance claim.
