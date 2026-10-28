# Q1 Expanded Track Inspector Mixer Baseline

Assigned worktree `/home/venetanji/.codex/worktrees/27be/alive` at
`66249c5935e7ae3fc7fcd6e5d9dafeb84783daad`, preserving prior untracked evidence.
Only source files `apps/ultra/ui/alive.css` and
`apps/ultra/tests/ci/alive-chain.spec.mjs`; root owns all other files/refs.

Confirmed evidence: retained original Master-04 native capture
`experiments/phase2-20261028/checkpoint-q1/master-04/master-session-1440x900.png`
shows first track's expanded Device / track actions shortening its fader and
raising its M/S relative to the neighboring collapsed track. Source uses a
flex-growing `.track-mixer` followed by variable-height `.track-inspector`.
The Phase 2 spec requires a common stable mixer baseline. Existing browser
tests check reachability, not this unequal expanded/collapsed geometry.

Make a narrow layout correction retaining the compact Live-style world,
original controls, four slots/scenes and every device action. Root has run
Impeccable context for alive.css, read DESIGN.md, layout playbook and legacy
alive-session surface brief. Reuse these facts; don't repair surface metadata,
rerun context or restyle unrelated areas. Read craft-floor immediately before
the UI edit. Existing aligned rows/disclosure-overlay patterns may help, but
choose the smallest accessible arrangement without permanent unused padding,
clipping, blocked Stop/Master, or a popup that makes device actions unreachable.

First prepare a meaningful rendered regression: compare track fader/control
top/bottom geometry before and after expanding ONE track inspector at both
1440x900 and1280x800, v4 two-track and maximum v3 as relevant. Keep original
tests; assert shared baseline and usable original action/focus/overflow behavior.
Observe actual RED before production CSS, then GREEN and inspect screenshots
as a batch. No source-regex-only assertion. Focused browser cases first; expand
only for changed-state concerns. Native confirmation is a later root build.

INITIAL RESOURCE GATE: SOURCE/TEST PREPARATION ONLY. No tests, browser, app,
native/audio/build/recorder/sampler/Wine or package install until root explicitly
transfers the browser lease after the old endurance recorder/sampler/GUI has
fully exited. Do not start despite near-complete progress. Root will give that
transfer and identify existing dependency cache. No binary changes in any tree.

After the browser lease opens, finish focused red/green plus source self-review,
original captures/commands/exits and brief spatial assessment. Mechanical scan
is a separate pass after the fix; run once for changed targets, distinguish old
unrelated detector findings. Report to root SDD `q1-mixer-baseline-report.md`.
Commit only the two allowed paths and return exact immutable diff/hash; no push,
integration, subagents, other source/docs/ledger changes or native claims.
