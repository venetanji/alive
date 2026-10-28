# Arrangement browser specification review

Verdict: PASS against the scoped specification; no findings.

The candidate changes only the initial placement geometry read in the browser test. It retains both viewport cohorts and the original pointer, cancellation, history, local-view, and authority assertions. The replacement reads the current placement and its geometry synchronously and checks for nonzero geometry; it introduces no retries, skips, timeout changes, direct IPC substitute, or production, workflow, settings, native, or audio changes. The placement attribute used by the new selector is assigned to the rendered occurrence in `apps/ultra/ui/alive-timeline.mjs:93`.

The report accurately limits the evidence: the controlled red induces real UI redraws after handle resolution and reproduces the null-box exception in the rendered application, but does not prove that the original cloud failure had the same interleaving. The companion green and both viewport/cohort results support the test correction, not a native or audio claim. The original trace supports detached-node replacement as plausible rather than established causation. A later layout change remains possible after the geometry read, as the report acknowledges.

Review was limited to the supplied diff, brief, report, and source for the selector identity risk. No tests, app, audio, or builds were rerun.
