# PR 13 Navigation Acceptance Checkpoint

The navigation coverage slice extends reviewed source
`6abf13b56ae5b68b5f0d81eb9e49e55cdc0a6497` with test commit
`99d82ac8ebfb04170fa0d50c1228ea5ff10f57be`. No application behavior changes in
this follow-up. The existing preflight now has explicit invalid-child Root
refusal/correction coverage and an actual browser save/navigation regression.

The DOM regression fails against the pre-fix implementation because Root
changes scope despite invalid child input. The real browser regression uses
normal pointer/keyboard events: blur masks the initial scope problem, but the
baseline cannot return to Root after correcting the child input. Both cases
pass with the existing PR fix. Valid root and child edits appear in the complete
downloaded document, including the corrected child value.

Verification with local Node 26.13.1 and locked Playwright 1.56.1:

- DOM: 99 passed, zero failures or skips.
- Full Node: 905 passed, 21 private-resource skips, zero failures.
- Targeted sandboxed Chromium: 17 passed, 26 private-resource skips, zero failures.
- Independent Sol review: spec compliance and code quality pass, no findings.
  The reviewer independently ran all 99 DOM cases and three hierarchy browser
  cases, and checked the baseline negative control.
- Diff whitespace check passes. Raw red/green logs, a receipt and SHA-256
  manifest are in `pr13-20261116/`.

The targeted browser selection includes hierarchy, documents, source-preflight,
source-gesture and resource-identity suites. Seven resource-identity and nineteen
source-gesture cases require private fixtures and remain skipped in this slice.
They are not native acceptance evidence. Hosted CI pins Node 22.20.0; a new
manual run on the final published PR commit is the next acceptance step.

The broader implementation plan is
`docs/superpowers/plans/2026-11-16-pr13-review-and-next-stage.md`. Current local
evidence confirms that ordinary native adapters and Alive source sidecar
preservation already exist. Reuse them. Complete Analog initialization,
remaining control authority, lifecycle/timing, endurance and actual Alive
admission remain separate requirements. The profile registry remains empty.

This checkpoint does not merge or release the PR, select desktop launchers,
qualify device DSP or convert historical native observations into fresh ones.
