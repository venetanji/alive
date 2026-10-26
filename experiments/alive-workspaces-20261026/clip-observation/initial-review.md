# Spec Compliance

- Issues found: the new outer failure diagnostic can replace the original exception, contrary to the binding observer-isolation requirement (`apps/ultra/tests/check_alive_clip_observation.py:146`). All other requirements visible in the scoped diff are satisfied.
- Cannot verify from this diff: the original remote missing-pending cause, or behavior on a rebuilt integrated product containing the unrelated `ee83d30` UI correction. The report correctly limits its native evidence to the pinned `4b9a88b` product; those are evidence limits, not additional task defects.

# Strengths

- The original pending and applied predicates remain distinct and unchanged. Capture setup precedes Start, and a cached transport accessible supplies a bounded early-phase prerequisite before one launch (`apps/ultra/tests/check_alive_clips.py:55`, `apps/ultra/tests/check_alive_clips.py:119`). The retained late-phase RED/early-phase GREEN measurements substantiate the observation-window mechanism without claiming proof of the remote cause.
- Only automatic runtime disclosure expansion uses the owned-window native activation path (`apps/ultra/tests/alive_workspace_navigation.py:22`). The optional recorder guards receipt work while readiness and pointer failures remain outside that guard (`apps/ultra/tests/check_alive_desktop.py:144`, `apps/ultra/tests/check_alive_desktop.py:394`).
- The native regression checks real tooltip interception, one activation, pending then applied, and original readiness/input failure behavior (`apps/ultra/tests/check_alive_clip_observation.py:35`, `apps/ultra/tests/check_alive_clip_observation.py:63`, `apps/ultra/tests/check_alive_clip_observation.py:128`). Four routine workflow modes and always-upload evidence are wired without editing existing gates or timeouts (`.github/workflows/ultra-ci.yml:181`).

# Issues

## Critical

- None.

## Important

- `apps/ultra/tests/check_alive_clip_observation.py:146`: the new outer `except Exception` calls `alive.screenshot('clip-observation-failure.png')` before its bare `raise`, without isolating screenshot failure. The unchanged screenshot helper directly invokes Gdk capture and `savev` (`apps/ultra/tests/check_alive_desktop.py:54`); a capture or filesystem exception therefore replaces the original unexpected input/assertion failure. This violates the explicit requirement that observer failures never replace the original exception. Guard only this diagnostic call, then re-raise the original exception. Add a focused fault case in which `run` raises a sentinel exception and screenshot recording also raises, asserting that the identical sentinel escapes. The existing four modes consume their expected faults inside `run`, so their success does not cover this outer failure path.

## Minor

- None.

# Checks And Evidence Limits

- Read the task brief, diagnosis, implementer report and complete five-file review diff; no git review commands, product edits, native suites or subagents were used.
- Focused unchanged-helper inspection: `check_canvas_desktop.py:45`, `check_canvas_desktop.py:62` and `check_canvas_desktop.py:84`, plus `check_alive_desktop.py:60` and `check_alive_desktop.py:88`, assessed whether click acquisition/value traversal consumes the pending interval. The measured phase correction and retained native pending/applied results support the selected prerequisite; no predicate weakening or retry was introduced.
- Focused unchanged-helper inspection: `check_alive_desktop.py:54` assessed whether the new outer diagnostic can throw and mask the original failure. It has no error-isolation guard, establishing the Important finding.
- Inspected `/tmp/alive-workspaces-clip-ci-fix/final-verification-results.json`: twelve recorded wrapper invocations exit 0, comprising four disclosure modes, seven prior input/chooser/editor modes and the original observability journey. Inspected the four final disclosure reports: actual tooltip/owned-click receipts, pending/applied text, receipt-write isolation, zero blocked activations, original press exception identity and Quit results are retained. These are retained execution evidence, not independently rerun results.
- Inspected retained source-continuity, workflow-verification, source-freeze and final cleanup JSON: they record 32 original clip assertions preserved, unchanged qualified product/harness hashes, unchanged prior workflow gates/timeouts, the scoped frozen commit, and no remaining matching identities among 87 sampled processes. The diff adds only harness/workflow code; product scheduling, music, capacities and settings are outside it.

# Assessment

**Task quality: Needs fixes.** The synchronization, owned-input correction and recorder-specific isolation are scoped and supported by useful native evidence. Isolate the newly added outer screenshot diagnostic before approving the task; rereview can be restricted to that failure path and exact original-exception preservation.
