# Task 10 Native CI Input Correction Review

## Spec Compliance

- PASS: The frozen change from `db96180772e59099cc96e0bab189ba2dc8825522` to `79aec9d45b94e51ac76b95c5b3d5a514119b1483` implements the requested Alive-specific input correction. `apps/ultra/tests/check_alive_desktop.py:125` derives the expected native client from the showing scoped accessible frame, its title and the application PID; `apps/ultra/tests/check_alive_desktop.py:148` follows native hit-test ancestry rather than guessing an owner at a fixed corner.
- PASS: `apps/ultra/tests/check_alive_desktop.py:171` waits at most two seconds for target availability and native ownership. Its first pointer motion is flushed separately; subsequent polls re-find the accessible target and read its current state and rectangle. A changed center triggers another motion-only flush. A matching owner path on a later poll permits exactly one press/release. The timeout records unavailable states or hit paths and writes a screenshot (`apps/ultra/tests/check_alive_desktop.py:203`).
- PASS: The existing Lowpass effect-2 assertion and reorder restoration guards remain in `apps/ultra/tests/check_alive_desktop.py:424`; the later reorder pair gains explicit resulting-order waits at `apps/ultra/tests/check_alive_desktop.py:692`. The diff does not change shared Ultra click behavior, product behavior, global timeouts, titles, tooltips, or the existing identity/order assertions.
- PASS: `apps/ultra/tests/check_alive_desktop.py:224` flushes slash key-down before a bounded entry-readiness wait, requires focused/showing/enabled/sensitive EditableText with positive geometry, and releases and flushes the key in `finally`. `apps/ultra/tests/check_alive_desktop.py:289` removes the previous repeated slash gestures.
- PASS: The actual-native focused regression at `apps/ultra/tests/check_alive_native_input.py:25` loads two real devices, checks distinct stable identities, saves reversed intermediate order, deliberately requires a native tooltip over Earlier, and restores the exact original serialized effect state with one corrected Earlier call. It retains native ownership samples, screenshots, slash readiness/release receipts, audio diagnostics and process-exit evidence (`apps/ultra/tests/check_alive_native_input.py:43`).
- Evidence limit: The implementer's report records the focused fatal-critical GTK run, full native journey, commands and source/binary/library hashes (`.superpowers/sdd/PLAN/task-10-ci-fix-report.md:1`). Raw screenshots, receipts, capture hashes and exact-head CI qualification are controller-owned checks; this diff review does not independently certify them. The report explicitly distinguishes the historical failure from the new local qualification and discloses optional WM ancestry as unqualified.

## Strengths

- `apps/ultra/tests/check_alive_desktop.py:160` makes availability explicit, and `apps/ultra/tests/check_alive_desktop.py:181` refreshes geometry after focus and motion. This addresses the event-ordering failure without using tooltip disappearance time as a fixed delay.
- `apps/ultra/tests/check_alive_desktop.py:190` allows a native child beneath the actual client through ancestry membership, while rejecting an unrelated tooltip covering the point. The bounded failure path preserves actionable evidence rather than silently retrying clicks.
- `apps/ultra/tests/check_alive_desktop.py:246` guarantees slash release when entry discovery, the readiness wait or its timeout fails, and records whether readiness preceded release.
- `apps/ultra/tests/check_alive_native_input.py:47` compares every saved effect field after restoration, so a click that merely changes a visible label cannot satisfy the central regression assertion.

## Issues

### Critical (Must Fix)

- None found in the frozen diff.

### Important (Should Fix)

- None found in the frozen diff.

### Minor (Nice to Have)

- None identified that warrants expanding this focused correction. Existing disclosed environmental/build warnings are outside this correction's scope and are not presented as introduced defects.

## Assessment

**Task quality:** Approved.

**Reasoning:** The correction has a narrow Alive-specific boundary, uses actual native ownership and fresh accessibility state, preserves the original regression guard, and tests complete restored chain state after an intentionally covering tooltip. The chooser's guaranteed release handles the separate GTK event-ordering problem cleanly. Approval covers the frozen code change; controller artifact review and exact-head CI remain separate gates.

**Checks performed:** Read the brief, implementer report and retained frozen diff; reviewed the complete changed input helpers and new regression from the diff. No changed-source re-read, broader source crawl, git command, build, GUI session, test rerun or subagent dispatch was performed. No unresolved code doubt required an additional focused test.
