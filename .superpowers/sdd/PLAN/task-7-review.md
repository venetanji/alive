# Task 7 Scoped Review

Reviewer: native_chain_review, f89ccb9..edd7678.
Spec: issues found. Quality: needs fixes. No functional rendering defect found.

Important: alive_session.hpp:173 duplicates graph compilation/revision checks,
Voice/Send/Receive exclusions, stereo sinks, numeric structural exclusions and
base compatibility from alive_session.hpp:152. The frozen design requires v1
to adapt into shared graph helpers with a private legacy policy. Extract the
common validator while preserving v1 standalone admission behavior.

Minor coverage: alive_session_v2_test.cpp:14 lacks native v1 size/offset asserts;
the v1 header is untouched. At :74 the test covers initial dry bypass and live
unbypass but not exact samples for live wet-to-dry switching. Record for Task8's
ABI and actual saved-chain regressions; not evidence of current rendering bugs.

Strengths: ordered evaluation/warm wet state/endpoint-only mixing; one schedule
scan; all-device resets; noncommuting impulse/order proof; active and bypassed
termination tests; full six-device/1024-event callback measurement. Scoped checks
of deferred notifications/frame order, reset/clear and hosted ingress confirmed
the intended existing behavior. Final native/focused/build logs checked; no
suites rerun, no checkout mutations. Rust/persistence/UI remain outside Task7.

## Fix Round 1

Reviewer: native_chain_fix_review, edd7678..920bdc6.
Duplicated graph-profile/binding validation: ADDRESSED. One private helper
handles compilation/revision, entry kind, Voice/Send/Receive exclusions, stereo
sinks, structural numeric exclusions and base compatibility. LegacyV1 preserves
old admission ordering/errors; DeviceV2 applies strict descriptor admission.
No new Critical/Important breakage. The fresh unchanged v1/v2 focused compilation
and execution commands/output in task-7-report.md were checked. No tests rerun
and no out-of-scope observations. The two Minor coverage findings stay assigned
to Task 8.
