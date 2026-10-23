# Preparation008 JavaScript Fix1 Independent Rereview

Date: 2026-10-23 (Asia/Hong_Kong).

## Findings And Verdicts

No remaining finding in this bounded fix diff. The original final-host-read captured-input currentness P2 is **ADDRESSED**. Specification verdict: **PASS**. Code-quality verdict: **PASS**, scoped to that finding and regressions introduced by this small fix and its new tests.

At `v8-readback.js:451`, `dataCurrent()` now completes `plusV8RequestBinding()` before comparing the recursively captured configuration, definition, normalized request and original request. The final host path/top-level binding reads can no longer mutate those captured inputs after their last comparison. The shared guard is already called at witness issuance, consumption and final proof return, so the correction applies to both live readback and fresh close without adding another capability or host pass. The original close request remains independently captured. The production delta is one reordered call and its explanatory comment; private authority, policies, serialized schemas and all other admission/retention logic remain unchanged.

The two appended groups at `test_helpers.cjs:1584` meaningfully reproduce the reviewed boundary. Each action/revision measures a successful baseline's path reads, then uses a fresh fixture to mutate the original request's command ID on the measured final read while returning the valid path. The tests assert that the mutation is reached, the request changes and collection refuses. They additionally require the diagnostic's original request ID, honest strict mismatch, all four root rows and three returned numeric observations, with exactly six gated calls and four/zero nongated calls. Fresh-close controls change the actual original request rather than only its normalized copy. Baseline read counts are measured dynamically; no incidental reviewer count is hard-coded.

## Frozen Inputs

| Artifact | SHA256 |
| --- | --- |
| Accepted design | `79e6d3bd2db09eb87a6d62f02752989c1d571411a2d4afcb8de019866c11943a` |
| Original JavaScript review | `1884e02804aaafbaf88f949de30ee746598c4b5dff864a05d66132cb0a4d00b9` |
| JavaScript fix1 brief | `c6f2c72f434a42c9b3b09ef5579ed5cd4264c896730de192286a4a822d243a06` |
| JavaScript fix1 report | `aa7ecf81b3fa5086f096f1c9b78b495a4f366fe868d0390cc3b17f07cc1a30e8` |
| JavaScript fix1 diff | `5ff6aa14304fbbcd0795df4050884d5a0fc3c0ec59d78fbc0a96b05e5903ec47` |
| JavaScript fix1 map | `5810eb2b0c79382668a6cd8908db4d3111cca1e9200767335f0e3d967b8c1792` |
| Frozen `v8-readback.js` | `868c2bb4e8badceb67f4edcd61726585e7824ee0979f4369becb1447d7d78e16` |
| Frozen `test_helpers.cjs` | `da4d83a2699a7d06e0b4a6b2f38ef8c3514b626c7cfc1f6b8ed86f00396fed28` |
| Unchanged `controller.js` | `da4473ac8014f39fd255b830121508738c16980b6e303fb0a9b8c963ce0f13a8` |
| Immutable initial JavaScript binding | `27584596834c217ff10d00d25294ca37b1ef86dd5441e6fd13b30721b36b8bd1` |

Read the frozen fix diff once, the matching brief/report/map and original finding, with the accepted design/common/task-review boundaries retained from the initial review. Both required JavaScript files have corresponding implementation/test hunks. The diff leaves all earlier tests intact. Parent verified the other14 implementation/test files at freeze; concurrently authorized Python test-only fix2 changes are outside this JavaScript freeze. No outside-diff implementation body read or broad re-audit was needed; a narrow name search supplied current line references.

## Verification Evidence

The worker records meaningful RED evidence before the production change: the complete Node command and each action-filtered command fail specifically because the original request mutation still returns instead of refusing. Earlier suites, ten preparation007 groups and nine prior preparation008 groups continue to pass during the complete RED run. After the guard-order change, both action-specific commands pass, followed by the full Node suite and syntax checks.

The two new groups exercise eight collections across both revisions/actions: four successful controls and four terminal-mutation refusals, with48 total gated calls,16 nongated live getters and zero nongated close getters. Existing failure-envelope, final-getter, later-retention, controller coexistence, trace/latch and queued-failure controls remain in the full run. This is direct regression evidence for the reviewed defect rather than a test that merely confirms a factory expectation.

Parent independently reports fresh Node session53213 passing all prior controls, ten preparation007 groups and eleven preparation008 groups, plus all three runtime syntax checks. The worker's complete run also passes with empty failure arrays. No suite or focused probe was rerun during this rereview: the bounded diff and adaptive regression evidence resolve the specific doubt, and no additional concrete failure requiring a probe was identified. No claim about live target execution follows from these synthetic results.

## Preservation And Remaining Gates

All26 private arithmetic inventories remain unchanged, including names, modes, sizes, mtimes, inodes, file hashes and link targets. The frozen JavaScript pair/controller, fix1 artifacts, original review/design and initial binding retain their listed hashes. The accepted007 audit and native exact-five inventory remain intact. Only this rereview report is written; no implementation/private/history write, suite rerun, preparation, archive, launch, capture, commit or delegation occurs.

Actual Max/V8 object-reference stability and patchcord endpoint identity remain supported only by synthetic coverage for this implementation. A reviewed capture must establish repeated traversal and patchcord endpoints bind the retained actual host objects. Preserve the strict proof requirements pending such evidence; passing these tests does not justify relaxing identity checks. The checks establish ordered observations and make no simultaneous-state claim.

This scoped JavaScript pass does not resolve the separately queued Python test privacy finding, authorize preparation/launch or establish Max parity/qualification. Parent retains integrated verification, remaining task reviews and all later preparation/capture gates. Full denominators and qualification0/2103 remain unchanged.
