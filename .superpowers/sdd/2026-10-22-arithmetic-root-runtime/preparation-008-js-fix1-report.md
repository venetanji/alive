# Preparation008 JavaScript Fix1 Report

Date: 2026-10-23 (Asia/Hong_Kong).

The bounded JavaScript currentness fix is complete and frozen for parent
review. This worker changed only `v8-readback.js`, `test_helpers.cjs` and this
new report. All earlier reports, snapshots and bindings remain unchanged.
No private evidence write, launch, preparation, archive, commit, subagent,
Python regression run or other implementation edit was performed.

## Authorization And Frozen Inputs

Parent explicitly activated this brief after Python fix1 was frozen and
supplied the final independent JavaScript review hash.

- Fix brief: `c6f2c72f434a42c9b3b09ef5579ed5cd4264c896730de192286a4a822d243a06`.
- Independent review: `1884e02804aaafbaf88f949de30ee746598c4b5dff864a05d66132cb0a4d00b9`.
- Initial snapshot binding: `27584596834c217ff10d00d25294ca37b1ef86dd5441e6fd13b30721b36b8bd1`.
- Initial `v8-readback.js`: `5a58d99183eecec88ce703a176fa518145772dc5363f82db4ead1a23ee8c3815`.
- Initial `test_helpers.cjs`: `41a6487ecb1065fd6d202ba8673cc88271133dcca686139f1d3dbf72dbd234f1`.
- Unchanged initial worker report: `abcdc79c3b2c703cc4c16d79324088262a9af17463f6e56199ab5701a2546477`.

## Fix

The independent review identified a confirmed P2 ordering defect:
`dataCurrent()` compared captured data before `plusV8RequestBinding()` read
host root properties. Mutation during that final host read could therefore
change an original live/close request after its last comparison and still
return a proof.

The only production change moves `plusV8RequestBinding()` ahead of the existing
captured-input comparison, with one explanatory comment. The guard now ends
with comparisons of captured configuration/definition/request data and
references, performing no further host read after those comparisons. Every
existing issuance, consumption and final-return use of the shared guard gets
the corrected order. Both original and normalized close requests remain
captured independently.

There is no additional gated probe, host pass, global registry, alias, policy,
schema, timing/capacity change or unrelated refactor. Existing diagnostics,
failure envelope and close outer schema remain unchanged.

## Test-First Evidence

All commands ran from repository root. Tests use the existing synthetic host
fixture and in-memory read-only metadata through its `python3 -B` subprocess;
no private payload, geometry, source/default/mode value was printed.

Two appended groups cover live install and fresh close. Each first measures a
successful control's actual host-path reads, then uses a fresh identical
fixture to mutate the original request's command ID on that control's final
path read. The fixture always returns the unchanged valid path. No incidental
reviewer read count is hard-coded. Both revisions are covered after the fix.

Before production edits:

1. `node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs`
   exited 1. Every earlier suite, all ten preparation007 groups and all nine
   prior preparation008 groups passed. Exactly the two new groups failed:
   `plus008_fix1_final_binding_read_install` and
   `plus008_fix1_final_binding_read_close`, each because the final original
   request mutation still returned instead of refusing.
2. `ARITHMETIC_008_CASE=plus008_fix1_final_binding_read_install node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs`
   exited 1 with the expected final-host-read refusal assertion failure.
3. `ARITHMETIC_008_CASE=plus008_fix1_final_binding_read_close node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs`
   exited 1 with the expected fresh-close final-host-read refusal assertion
   failure. Both focused RED commands ran before the production change.

After the shared ordering fix:

4. The exact focused install command from item 2 exited 0. Its two revision
   baselines succeeded and its two final-read mutations refused.
5. The exact focused close command from item 3 exited 0. Its two fresh-close
   revision baselines succeeded and its two original-close final-read
   mutations refused.
6. `time node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs`
   exited 0: all prior controls, ten preparation007 groups and eleven
   preparation008 groups passed, with empty failure arrays. Shell timing:
   19.177 seconds real, 22.970 seconds user, 0.245 seconds system.
7. `node --check experiments/max-reference/arithmetic-roots-runtime-20261022/v8-readback.js`
   and
   `node --check experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs`
   each exited 0.

The two new groups make eight collections in a complete passing run: four
successful baselines and four mutation refusals across two revisions/actions.
Each collection makes exactly six gated method calls (three format plus three
numeric values), for 48 calls total. Live collections preserve four nongated
getters each (16 total); fresh closes preserve zero. Refusals retain the
original diagnostic request ID, honest `strict_mismatch=true`, all four root
rows and all three returned numeric observations. Earlier exact witness-key,
five-key failure-envelope, final-getter, later-retention, controller coexistence,
trace, latch and queued-failure controls remain GREEN in the complete run.

## Frozen Outputs And Limits

Under `experiments/max-reference/arithmetic-roots-runtime-20261022/`:

- `v8-readback.js`: `868c2bb4e8badceb67f4edcd61726585e7824ee0979f4369becb1447d7d78e16` (1,080 lines).
- `test_helpers.cjs`: `da4d83a2699a7d06e0b4a6b2f38ef8c3514b626c7cfc1f6b8ed86f00396fed28` (1,614 lines).
- Unchanged `controller.js`: `da4473ac8014f39fd255b830121508738c16980b6e303fb0a9b8c963ce0f13a8`.

`sha256sum` and `wc -l` verified these outputs. A read-only `diff -u` against
the initial snapshot confirmed the production delta is the single guard-call
move plus comment; its exit 1 reports that expected difference. All previous
test code is retained, with only the two new regression groups appended.
The report's own hash is returned separately to parent.

No known required synthetic failure remains. No Python regression was run
during this fix, per the concurrency boundary; the test fixture's explicitly
permitted metadata subprocess is its only Python use. Actual Max/V8 host
reference behavior, live performance, journal production, external native
evidence, capture, preparation, archive and independent rereview were not
executed. Parent owns the frozen fix diff/map and scoped independent rereview.
The checks establish ordered observations, with no simultaneous-state claim.
All original denominators and zero qualification increment remain unchanged.
