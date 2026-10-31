# Detail Panel Review

Reviewed the uncommitted detail-panel changes against HEAD `9105b10` in `/home/venetanji/.codex/worktrees/phase2-ui/alive`. Scope was `alive-workspace.mjs`, `alive-shell.css`, the maximize button in `alive.html`, and the detail-related browser/DOM tests. Native/Rust/piano live-edit implementation was excluded. No checkout files were changed.

Final rereview result: **both findings are resolved; no unresolved findings remain in the reviewed scope.**

## Resolved Findings

1. **P2: Maximized source controls wrap into a hidden second column.** `apps/ultra/ui/alive-shell.css:59` sets `flex-direction:column` but leaves the existing `.clip-controls { flex-wrap:wrap }` active. At **800x600**, open the workspace fixture, select **Arrangement**, then **Maximize detail**. The timeline inspector consumes 32px, leaving the sidebar 368px tall. **Delete clip** wraps to a second column at x=403 with width=63px, while the sidebar ends at x=405; almost the entire control is clipped. Sidebar `scrollWidth=249`, `clientWidth=179`, `scrollHeight=368`, `clientHeight=368`, so scrolling vertically cannot reach it. Longer source names reproduce this in Session too. Set `flex-wrap:nowrap` in the maximized sidebar and add a compact Arrangement test asserting the control stays in the sidebar's horizontal bounds and remains reachable by vertical scrolling.

2. **P3: Maximizing collapsed Detail clips its bottom seven pixels.** `apps/ultra/ui/alive-workspace.mjs:46` calls `fitHeight()` before painting the newly expanded state. `detailBudget()` therefore measures the chrome with `#detail-resizer` still hidden, missing its 7px height. At **1280x800**, click **Detail** to collapse and then **Maximize detail**: detail content height becomes **639px**, compared with **632px** when maximizing an expanded panel. The panel bottom is **776px** but the workspace ends at **769px**; `.workspace-column { overflow:hidden }` clips its final 7px and the panel has no scroll range for this discrepancy. Paint the expanded state before measuring, or measure invariant chrome independently of hidden state. Add a collapse-to-maximize test asserting panel bottom does not exceed workspace bottom.

Both findings were sent to the parent agent with measured evidence while review was in progress. They describe the reviewed version before the fixes. The parent changed `toggleMaximize()` to paint the expanded/maximized state before fitting height and added `flex-wrap:nowrap` to the maximized sidebar. The retained browser regressions cover collapsed maximization at all three viewport sizes and compact Arrangement sidebar scrolling. I also read the saved failing regression logs: the old implementation exceeded the workspace bottom by 7px and had 70px of horizontal sidebar overflow.

## Fix Verification

Reran the same two reproductions in sandboxed Chromium using `/tmp/detail-panel-fix-verification.mjs`, with assertions and no checkout modifications:

- **Collapsed-to-maximized: PASS.** Expanded and collapsed starting states both produce **632px** of detail content at 1280x800. Panel bottom **769px** equals workspace bottom **769px**.
- **Compact Arrangement sidebar: PASS.** At 800x600, `flex-wrap` is `nowrap`, `scrollWidth=clientWidth=179`, and the 369px content scrolls vertically inside the 368px sidebar. **Delete clip** is fully visible after scrolling, with horizontal bounds **233..396px** inside the sidebar ending at **405px**.
- Both reproductions assert that no musical commands were sent.

The changes directly address the measured causes, and the retained regression assertions match the observed failures. No further issues were found in this focused rereview; the parent's broader final test run is separate.

## Verification

- Used sandboxed Chromium (`chromiumSandbox:true`) with the repository's browser fixture, a private HTTP server on port 4196, and probe scripts under `/tmp`.
- Confirmed regular manually requested height survives a smaller viewport and returns: **516px -> 336px -> 516px**.
- Confirmed initial expanded maximization uses the full available height without clipping at 1280x800 and 800x600.
- Reviewed existing pointer-cancel, Escape, keyboard, unfinished gain input, and maximize/restore coverage. The missing meaningful cases are collapsed-to-maximized sizing and maximized compact Arrangement/sidebar overflow.
- Did not rerun the full existing Node/browser suite; the parent reported those results separately.

## Reproduction Artifacts

- `/tmp/detail-panel-probe.mjs`: collapsed/maximized geometry.
- `/tmp/detail-panel-retention-probe.mjs`: manual resize retention and compact Arrangement sidebar geometry.
- `/tmp/detail-panel-review-arrangement-max.png`: compact Arrangement maximized screenshot.
- `/tmp/detail-panel-long-source-800-probe.mjs`: additional long-source sidebar reproduction.

No additional confirmed defects were found in the reviewed scope.
