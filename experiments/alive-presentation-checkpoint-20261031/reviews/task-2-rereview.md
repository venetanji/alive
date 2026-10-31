# Task 2 Fix Round 1 Scoped Re-Review

## Finding Verdicts

- **Non-hot final value equal to the canonical baseline leaves DSP at an earlier preview -- ADDRESSED.** `apps/ultra/src-tauri/src/document_commands.rs:101` no longer takes the matching-graph fast return when a numeric hint exists. The original owner gesture's baseline-return commit therefore reaches complete-plan/target validation and the qualified cold setter. The new actual-native test at `apps/ultra/src-tauri/src/document_parameter_gestures.rs:70` previews multiply RHS 0.4 from canonical 0.65, commits 0.65 without another preview, verifies no commit output or reinstall, then observes 0.65 downstream on a native input message. Retained red output shows the original downstream 0.4 failure; retained green output passes. The wider change to all explicit hints introduces the separate ownership regression below.
- **Alive competing-base rejection traps the mounted control in a stale gesture -- ADDRESSED.** `apps/ultra/ui/canvas-presentation-hosts.mjs:49` revokes the conflicting gesture and returns a terminal error containing its identity from both mutable-base checks. `apps/ultra/ui/canvas-presentation-view.mjs:42` distinguishes terminal failures from retryable failures, clears only the matching gesture, and retains the existing newest-request/scope guards. The renderer-plus-adapter regression at `apps/ultra/ui/canvas-presentation-hosts.test.mjs:41` covers both a newer dirty number and a newer committed gesture across the old conflict reply: writes are exactly 1.2 and 1.7, the competing 1.6 is not cancelled, and no stale gesture remains.
- **Mounted text and appearance never refresh -- ADDRESSED.** `apps/ultra/ui/canvas-presentation-view.mjs:19` registers a scoped text refresher, resolves current authored content, and explicitly clears removed font size/foreground/background styles. `apps/ultra/ui/canvas-presentation-hosts.test.mjs:52` covers controller publication, `update()`, comment and message text, appearance changes/removal, stable DOM identity, and rejection of observations after source replacement.

## New Breakage In The Fix Diff

### Important

**The broadened cold-hint setter path can overwrite another active gesture without its token.** `apps/ultra/src-tauri/src/document_commands.rs:101` changes the early return for every explicit numeric hint, not only the trusted gesture-finalization path. The public `document_commit` endpoint accepts `parameter` from its caller and forwards it directly into `admit_owned` (`apps/ultra/src-tauri/src/document_commands.rs:233`, `apps/ultra/src-tauri/src/document_commands.rs:239`). The existing gesture conflict check compares old and next canonical values; an unchanged patch passes it (`apps/ultra/src-tauri/src/documents_gestures.rs:17`). Consequently the fix creates this path:

1. Canonical multiply RHS is 0.65; a valid owner token successfully previews 0.4. Canonical comparison state intentionally remains 0.65.
2. A caller submits ordinary `document_commit` with the current authoring revision, unchanged canonical patch, and `parameter:{node:1,key:"rhs",value:0.65,hot:false}`. The caller supplies no gesture token.
3. The unchanged patch passes the canonical conflict check. Before this fix, the cold matching-graph fast return performed no write. After the fix, the hint passes `parameter_matches` and the setter overwrites native RHS with 0.65.
4. The active token still records accepted preview 0.4, so owner observation and native execution diverge while the competing write has bypassed gesture ownership.

This is new behavior caused by the changed fast-return condition, not a reopened finding in unchanged code. It violates the binding same-target ownership and qualified cold-reconciliation rulings. Keep the baseline-return fix, but prevent ordinary numeric hints from reaching a setter for a target still owned by an active gesture, or provide a trusted internal reconciliation path qualified by that gesture. Do not solve it by making cold targets hot. Add a focused native regression that attempts this unchanged-patch cold hint during an active preview and verifies refusal before mutation, retention of the accepted preview and token, and successful legitimate owner commit/cancel afterward. Cover a second linked view as the competing caller if the test harness supports it.

No other new Critical/Important breakage found in the five-file fix diff.

## Evidence And Scope

- Reviewed fix base `36aaba1c670060cbf900b1573047695c87cb6c41` to head `0c98d72de3c3e25c2363c151de40fbf02addce83`, using the supplied 266-line diff in one pass and the appended Fix Round 1 report. Prior task requirements and controller rulings remain binding.
- Concrete focused context check: because the changed admission fast return affects all numeric hints, inspected only the unchanged public `document_commit` entry point and immediate forwarding call to determine whether non-gesture callers can reach the new setter behavior. The prior review already established the canonical-only conflict guard. No other unchanged areas were reopened.
- Retained red evidence inspected: `/tmp/alive-presentation-task2/fix1-host-text-red.log` records the conflict recovery and text failures; `/tmp/alive-presentation-task2/fix1-native-red.log` records the actual 0.4-versus-0.65 baseline-return failure.
- Retained green evidence inspected: `/tmp/alive-presentation-task2/fix1-native-green.log` reports the focused native regression passing; `/tmp/alive-presentation-task2/fix1-js-affected.log` reports **262/262 passed**, zero failed/skipped/cancelled; `/tmp/alive-presentation-task2/fix1-native-affected.log` reports **14/14 passed** including both cold-final and retained hot/held-note regressions; `/tmp/alive-presentation-task2/fix1-browser.log` reports **34/34 passed**. The new ownership path above is not asserted by those tests.
- No tests or builds rerun, no helper agents, and no source, git/index/HEAD, native tree, installation, desktop, or publication changes. Only this requested review report was written.

## Out-of-Scope Observations

None newly identified. Previously disclosed warning noise remains outside this fix scope.

## Verdict

**Fix round: Findings remain open.** All three original Important findings are addressed; one new Important regression remains open: unqualified ordinary cold parameter hints can overwrite an active native gesture. The Task 2 gate needs that ownership path fixed before approval.
