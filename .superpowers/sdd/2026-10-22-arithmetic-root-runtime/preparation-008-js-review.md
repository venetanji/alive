# Preparation008 JavaScript Independent Review

Date: 2026-10-23 (Asia/Hong_Kong).

## Findings

1. **P2 - The final host binding read can change captured input without refusal.** `v8-readback.js:451` compares the captured request/configuration/definition data before calling `plusV8RequestBinding` at `v8-readback.js:457`. That binding function finishes by reading host `root.parentpatcher` and `root.filepath` at `v8-readback.js:438`. Consequently, the last `dataCurrent()` in `check()` at `v8-readback.js:504` performs another host read after its last captured-input comparison. A `filepath` getter that returns the valid path while changing the original request's `command_id` on this final read escapes both the readback return at `v8-readback.js:822` and fresh-close return at `v8-readback.js:997`. A focused synthetic probe reproduced successful returns with the request changed and the issued witness ID no longer equal to the current request ID. This violates the explicit requirement to recheck captured input after every binding read through proof return, including the independently captured original close request. Finish the binding-read sequence with captured-input validation that performs no further host reads, and add regression controls for mutation during the final binding read in both readback and fresh close. The existing first-binding-read, final-capability-getter and later-retention controls do not cover this terminal read.

Specification verdict: **CHANGES REQUIRED**. Code-quality verdict: **CHANGES REQUIRED**. The finding concerns request-local currentness and proof admission; the recorded passing suite does not cover this specific ordering boundary.

## Frozen Review Inputs

| Artifact | SHA256 |
| --- | --- |
| Accepted design | `79e6d3bd2db09eb87a6d62f02752989c1d571411a2d4afcb8de019866c11943a` |
| Common implementation brief | `384040359dd36df664067301d59be7d535befac016d63d315e0d91000202a5f9` |
| JavaScript task brief | `31c53605013c1a4ef332e2884712e6404e2bedb828f0334b5f6c18cf847b2bc2` |
| JavaScript worker report | `abcdc79c3b2c703cc4c16d79324088262a9af17463f6e56199ab5701a2546477` |
| JavaScript review diff | `44940ed8d2d61559974489097ad047aacd02e296fbda4c5e8d2d1aea658209ec` |
| JavaScript review map | `bdd3a460eef55f60a4f042c86da5cd9cf09fa126e0d87179d4c4e75fa739fac1` |
| Frozen `v8-readback.js` | `5a58d99183eecec88ce703a176fa518145772dc5363f82db4ead1a23ee8c3815` |
| Frozen `test_helpers.cjs` | `41a6487ecb1065fd6d202ba8673cc88271133dcca686139f1d3dbf72dbd234f1` |
| Unchanged `controller.js` | `da4473ac8014f39fd255b830121508738c16980b6e303fb0a9b8c963ce0f13a8` |

The review applies the task-review contract and accepted design. Exactly the JavaScript production/test pair differs in the supplied task map; both have corresponding implementation/test hunks. The original command's `op` remains context for binding, with no new serialized `op` field required in raw readbacks, witnesses or close proofs.

## Focused Evidence And Scope

Read the frozen diff once. A narrow outside-diff interface read addressed the named risk of isolating the existing synthetic fixture without executing the suite: `helper`, `plain` and `linkObjects` were inspected so only their declarations and `plus008Fixture` could be evaluated in memory. Narrow reads of the changed binding/return sites supplied exact finding references. No broad source re-audit or complete suite rerun occurred.

One focused Node process extracted those fixture declarations, loaded private source metadata only in memory using the fixture's `python3 -B` subprocess, and ran an unchanged control followed by a final-read mutation for each action. It installed a counting `root.filepath` getter, first measured the successful control's read count, then changed only the original request's command ID on that last read in a fresh identical fixture. Every getter returned the unchanged valid path. Aggregate output was:

| Action / Control | Path Reads | Returned | Request Changed | Witness Matches Current Request | Gated Calls | Nongated Calls |
| --- | --- | --- | --- | --- | --- | --- |
| Install baseline | 2709 | yes | no | yes | 6 | 4 |
| Install final path-read mutation | 2709 | yes | yes | no | 6 | 4 |
| Close baseline | 2064 | yes | no | yes | 6 | 0 |
| Close final path-read mutation | 2064 | yes | yes | no | 6 | 0 |

Both successful controls and both faulty successful returns used revision1. The check isolates a shared ordering defect in the common pass used by both revisions; no claim of a separate revision2 probe is made. No private source/default/mode/geometry values were printed, and the probe wrote no file or evidence. The issue is an ordered observation gap after an actual binding read, independent of simultaneous-state guarantees.

## Other Specification And Quality Checks

The new pass keeps authority in a fresh invocation-local closure, captures original and normalized close requests, and consumes its privately collected witness once. The exported legacy witness helper refuses new plus policies; caller diagnostics, copies and serialized rows do not supply admission authority. No global witness registry or second gated capability collection is introduced.

Metadata preflight independently pins E007, exact distinct numeric/root policies and multiplicities, the full source projection and Basic/full correspondence, helper identities, all source/root sets, and owner/request/configured-definition binding. Nested source ports and edge orders receive integer/range checks before projection hashing. Complete root8/Basic35 bindings and full Basic retention precede gated capabilities. Later retention adds strict actual-object endpoint equality for the new plus path, while the frozen diff preserves legacy paths.

Readback reuses the three privately observed gated values in seven numeric states and retains the four nongated getters. Each close obtains fresh three-numeric/two-root witnesses and full Basic/root retention without the four nongated getters. Strict raw class diagnostics and `strict_mismatch=true` remain separate from satisfied admission. Partial diagnostic observations are attached on refusal, including the returned last getter; the existing failure envelope and close outer schema remain intact. The terminal ordering defect above prevents an unqualified currentness pass.

The append-only tests contain positive controls, consistent cross-view corruption controls, zero-call malformed preflight, capability shape failures, original-close identity and cloned-endpoint controls, final-getter/later-read mutations, retained diagnostic prefixes and controller coexistence. These exercise refusal boundaries beyond comparing a factory result with itself. The fixture's metadata comes from `source_metadata`; actual Max host behavior remains outside that fixture's authority.

The worker records meaningful corrected initial RED failures for six missing feature groups with the prior suites and controller positive control still passing, plus separate RED failures for original-close normalization, initial host-read snapshot timing and root endpoint identity. Its final recorded full Node run passes all prior suites, ten preparation007 groups and nine preparation008 groups; recorded syntax checks pass both changed files. Reported positive collections cover both revisions and install/event/close with36 gated calls and16 nongated calls in total. Those suites and syntax checks were not duplicated here; parent owns fresh complete verification. The new focused check answers the uncovered terminal-binding-read doubt.

## Preservation And Remaining Gates

All26 private arithmetic inventories remain unchanged, including names, modes, sizes, mtimes, inodes, file hashes and symlink targets. The frozen JavaScript pair, controller and listed immutable review inputs retain their hashes. The accepted007 audit remains unchanged, and the native directory retains exactly its five original files. Authorized concurrent Python fixes are outside this JavaScript freeze.

Actual Max/V8 object-reference stability and patchcord endpoint identity have only synthetic coverage for this implementation. A reviewed capture must establish that repeated traversal and patchcord endpoints expose the retained actual host objects. Preserve the strict proof requirements unless new reviewed evidence supports a different exact host binding; synthetic passing controls alone do not justify relaxing them.

Only this report is written. No implementation/private/history write, suite rerun, preparation, archive, target/native/Wine/Max/display launch, capture, commit or delegation occurs in this review. Parent has accepted the bounded finding and owns the test-first fix, scoped rereview and integrated verification. Later preparation/capture gates remain outstanding. A task pass would not authorize a launch or establish Max parity/qualification. Full denominators remain78 operations,72 live plus6 empty checkpoints,504 numeric states,141 original emissions and6 closes; qualification remains0/2103 with zero increment.
