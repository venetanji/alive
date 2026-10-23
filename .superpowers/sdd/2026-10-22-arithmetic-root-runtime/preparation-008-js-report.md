# Preparation008 JavaScript Implementation Report

Date: 2026-10-23 (Asia/Hong_Kong).

The authorized JavaScript portion is complete and frozen for parent review.
This worker changed only `v8-readback.js`, `test_helpers.cjs`, and this report.
No commit, subagent, preparation, archive, target/native/Wine/Max/display
launch, private evidence write, or change to the Python/controller/runner/
observer implementations was performed. Independent review remains a separate
parent-owned gate.

## Inputs And Frozen Hashes

- Accepted design: `79e6d3bd2db09eb87a6d62f02752989c1d571411a2d4afcb8de019866c11943a`.
- Common brief: `384040359dd36df664067301d59be7d535befac016d63d315e0d91000202a5f9`.
- JavaScript brief: `31c53605013c1a4ef332e2884712e6404e2bedb828f0334b5f6c18cf847b2bc2`.
- `v8-readback.js`: `5a58d99183eecec88ce703a176fa518145772dc5363f82db4ead1a23ee8c3815` (1,079 lines).
- `test_helpers.cjs`: `41a6487ecb1065fd6d202ba8673cc88271133dcca686139f1d3dbf72dbd234f1` (1,585 lines).
- Unchanged `controller.js`: `da4473ac8014f39fd255b830121508738c16980b6e303fb0a9b8c963ce0f13a8`.

Implementation files are under
`experiments/max-reference/arithmetic-roots-runtime-20261022/`. This report
is under `.superpowers/sdd/2026-10-22-arithmetic-root-runtime/`; its final
hash is returned separately to parent.

## Behavior And Boundaries

The reader independently encodes E007, exact plus numeric/root policies,
the pristine projection digest, and the explicit distinct Basic/full source
descriptor views. It validates the complete controller and geometry metadata
alongside the exact 3+3 numeric / 2 full-root V8 set. Unknown, partial,
duplicate, extra, transferred, inconsistent and consistently corrupted source
sets refuse. Nested observer/source-edge ports and edge orders receive integer
and range checks before projection hashing. Runtime code imports neither
Python nor a specification or historical executable.

Each readback/pre-close creates its own captured pass. It retains immutable
primitive/object-reference bindings for request, original close request,
normalized close request, configuration, selected/configured definition,
helper/policy/source data and owner/map. It checks complete root8/Basic35 host
inventories, original/leaf classes and admitted geometry, the four root harness
bindings, and Basic retention before gated capabilities. It rechecks captured
data, live references/classes/geometry, root path/top-level and Basic handle
after capability calls, including the last getter, at issuance/consumption and
after later getter/graph/retention reads through final return.

The pass privately collects and consumes its witness once. Exported
`collectRepresentationWitnesses` refuses new plus metadata; caller diagnostics,
copies and serialized data therefore cannot be promoted into plus authority.
There is no global witness registry and no second gated capability pass.
Standalone diagnostic observations cannot replace the fresh observations in a
new collection. Raw original allowlists/classes remain intact and diagnostic
`strict_mismatch=true` remains honest. Partial diagnostic rows, including a
returned final getter observation, survive currentness refusal.

Successful readback uses exactly three gated format calls and three gated
value calls, reuses those three values in the seven numeric states, and retains
the four nongated value getters and source-based float semantics with observed
receipt tags false. Each close obtains its own three numeric and two root
witnesses and complete Basic/root retention without adding the four nongated
getters. Same-name cloned Basic and root patchcord endpoints refuse on the new
plus path. Existing times/minus endpoint behavior remains unchanged.

Original close fields are independently checked before normalization so supplied
revision, action-document or operation identities cannot be hidden by normalized
copies. The design's `op` requirement binds request context only. No `op` field
is added to raw checkpoints, witnesses or close proofs. The exact five-key
failed readback envelope and existing close-proof outer schema remain intact.

## Test-First Evidence

Commands below run from repository root unless a working directory is stated.
All existing test content was retained; the new tests are appended.

1. Initial RED:
   `node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs`
   exited 1. Its first draft reported five failing new groups; two involved
   fixture details (source inventory root order and the controller's pre-install
   tree shape), so this first draft alone is not the production RED claim.
2. Corrected RED: the same command, before production edits, exited 1 with
   six expected new group failures: full readback/close, diagnostic/admission
   separation, metadata suppression, capability positive control, freshness
   positive control and full live-inventory suppression. The controller
   coexistence positive control passed. All existing suites and all ten
   preparation007 groups passed. Positive controls prevent capability/freshness
   negatives from passing solely because old plus always refused.
3. Additional RED:
   `ARITHMETIC_008_CASE=plus008_original_close_and_endpoint_identity node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs`
   exited 1 with the expected missing exception for an original close identity
   hidden by normalization. Independent original-close checks and strict Basic
   endpoint-reference checks were then added; the next full run passed all
   eight then-existing preparation008 groups.
4. Additional RED:
   `ARITHMETIC_008_CASE=plus008_binding_read_snapshots_and_failure_prefix node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs`
   exited 1 with the expected missing exception when the first root-path
   binding read mutated the request before capture. Capture was moved ahead of
   that host read. The same targeted command then exited 0, including retained
   last-getter diagnostic prefix checks.
5. Additional RED: the original-close/endpoint command from item 3 was rerun
   after adding an actual root endpoint clone control. It exited 1 with
   `Missing expected exception: root endpoint must bind the actual retained object`.
   The admitted plus root proof now compares endpoint references to retained
   root objects, preserving legacy paths.
6. Final GREEN:
   `time node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs`
   exited 0 in 17.147 seconds real time. All prior suites, ten preparation007
   groups and nine preparation008 groups passed, with empty failure arrays.
   The earlier attempted `/usr/bin/time -f 'elapsed_seconds=%e' node ...`
   command exited 127 because `/usr/bin/time` is not installed; the shell
   builtin `time` command above executed the complete verification.

## Coverage And Counts

The nine preparation008 groups cover full readback/fresh close, honest
diagnostics/private authority, metadata preflight, capability shapes,
last-getter/later-retention currentness, complete inventory/retention,
original-close/endpoint identities, binding snapshots/failure prefix/envelope,
and unchanged-controller coexistence with only the new metadata added.

The full-readback group executes both revisions for install, event and close:
six successful collections, exactly 36 total gated method calls, 16 nongated
getter calls, three numeric/two root witnesses per collection and seven numeric
states per live readback. Both close collections have zero nongated getters.
It checks exact top-level/numeric/root witness key sets and ID/coverage binding.

Metadata preflight includes 17 direct source/request/helper/owner/configuration/
root corruptions and each of the 21 numeric policy fields removed from each of
six descriptor copies (126 controls): 143 cases, each with zero gated calls.
It includes consistent corruption of both descriptor views and nested source
identity types. Capability controls cover 20 invalid returned method/shape
combinations, four unavailable/throw combinations, wrong format and wrong
install default, with an explicit successful control.

Freshness controls include 13 mutations at the final gated getter for each
of live and close (26 cases), two later patchcord-read mutations and one later
nongated-getter mutation. They preserve the six-call maximum and independently
bind original close state. Separate controls cover two first-binding-read
mutations, diagnostic-prefix retention and the exact five-key serialized
failure envelope. Complete live inventory/class/geometry/name controls and
invalid Basic ports suppress capabilities; cloned Basic/root endpoints refuse.

Preserved legacy output includes 12 identity and 8 geometry cases with zero
invalid calls, the 80-poll trace boundary (1,740 rows, 644,956 bytes, 420
capability calls and maximum line length 947), and ten queued-failure cases
with zero post-failure activity, changed ACK or unexpected queue cases.
All ten preparation007 lifetime/cohort/currentness/source-root regressions
remain GREEN. The new controller coexistence case uses the exact admitted
metadata with a synthetic pre-install tree and preserves three original
mismatch diagnostics and three separately satisfied controller dispositions.

Fixtures load `arithmetic.source_metadata()` using a child `python3 -B` solely
for tests, retain private metadata in memory, and synthesize every target/API
object and call. Assertions/output expose counts, classes, shapes, hashes and
outcomes rather than licensed source/default/geometry data. Production has no
such dependency. No fixture writes private files; the envelope test uses the
existing in-memory File implementation.

## Additional Verification And Limits

- `node --check experiments/max-reference/arithmetic-roots-runtime-20261022/v8-readback.js`: exit 0.
- `node --check experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs`: exit 0.
- From `experiments/max-reference/arithmetic-roots-runtime-20261022/`,
  `python3 -B -m unittest discover -p 'test_*.py'`: 77 tests in 16.978 seconds,
  exit 0, OK (skipped=1); 76 executed tests passed. The existing external
  native-evidence skip remains unchanged. This run precedes the independently
  queued Python review fixes and new lifecycle implementation.
- `sha256sum` and `wc -l` confirmed the frozen code hashes/counts above and
  the unchanged controller hash. The directory is untracked in the surrounding
  worktree, so ordinary `git diff --numstat` does not provide an implementation
  delta; parent owns the frozen file-map/diff review.

No live host performance, target capability behavior, journal generation,
capture, new lifecycle implementation, external native evidence, preparation,
archive or independent review was run by this worker. Synthetic calls and the
frozen runner's regression suite do not establish a successful live capture or
historical full-getter silence. Parent retains integrated verification and
review ownership. There is no known failing required synthetic control at
freeze; in-process checks provide ordered observations, not simultaneous state.

Denominators and qualification remain unchanged: 78 operations, 72 live plus
6 empty checkpoints, 504 numeric states, 141 original emissions and 6 closes;
native 90 cable deliveries / 297 typed receipts; qualification 0/2103 and zero
increment.
