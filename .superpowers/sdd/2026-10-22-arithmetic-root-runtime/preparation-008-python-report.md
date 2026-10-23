# Preparation008 Python Implementation Report

Date: 2026-10-23 (Asia/Hong_Kong).

The authorized Python implementation is complete and frozen for parent review.
This worker changed only `arithmetic.py`, `test_preparation.py` and this report.
The independent review and integration decision remain with parent. No commit,
preparation, archive, target/native/Wine/Max/display launch, subagent or private
evidence write was performed.

## Accepted Inputs And Changed Files

- Accepted design: `79e6d3bd2db09eb87a6d62f02752989c1d571411a2d4afcb8de019866c11943a`.
- Common brief: `384040359dd36df664067301d59be7d535befac016d63d315e0d91000202a5f9`.
- Python brief: `1e9763ad5e85e7d7a20cb162fd24dc4e02a3755a24b5fba04f1c880616e3287e`.
- `arithmetic.py`: `83498823d4bf54c614ffe6a070edbba231144f2b31b9fcaef90eab9899a3205b`.
- `test_preparation.py`: `22db6ad9cb9005c4549f26ffb1261a47178eab4af94194bd0481daca67da2106`.

Implementation paths are under
`experiments/max-reference/arithmetic-roots-runtime-20261022/`. This report is
under `.superpowers/sdd/2026-10-22-arithmetic-root-runtime/`; its final hash is
returned separately to parent to avoid a self-referential digest.

## Implementation

The independent007 loader confines private reads to the fixed007 work/archive
owners using the existing regular-file/mode/link/identity checks. It validates
the pinned config, seal, command, install ACK51, dispatch ACK52, raw envelope,
controller, V8 reader, trace and public manifest/audit/investigation bytes. It
requires the 5,350-byte raw payload to equal its retained copy. The exact failed
envelope, null mode observation and strict mismatch remain unchanged.

Historical binding validation checks the exact archive schema and sixteen-file
map, every consumed archived byte, the ten-file package subset/digest and full
score digest. Current `package_binding()` and `verify_private()` are never used
for historical verification. The loader independently verifies all twenty-two
sealed inputs, helper sizes/identities, source revisions, consumed script/archive
correspondence, generated private paths, all six ordered owners and their
channels/root-proof paths, source paths, driver inventory and driver bytes.

Pure `source_inventory` reconstruction binds both historical plus revisions,
all saved descriptor fields, geometry additions, the controller cohort, saved
edges and leaves. It imports no historical executable and never recursively
calls `source_metadata`. The trace validator checks all 268 rows, exact schemas,
integer identities, sequence and wall-clock relationships, original source
mismatches and complete candidate inventories, four geometry observations,
ten fresh controller passes, sixty direct-return calls and one final bind.
ACK51 separately binds the satisfied three-member controller cohort, private
source-default relations and all four geometry dispositions. ACK52 establishes
dispatch success only.

The diagnostic validator checks the entire failed envelope and every numeric
and root row, complete root8/Basic35 coverage, raw root-candidate multiplicity
and classes, source/class/text/box/saved/live relations, strict counts, original
allowlists, scalar format/value shapes, finite values and private scalar hashes.
The returned measurements contain only three validated source-default values
and the two privately measured root rectangles, with no admission witness.

The new independent plus-specific policy factory/validator and metadata
validator preserve source descriptors and pin the complete pristine projection.
Explicit field projection preserves the distinct Basic/full view schemas and
validates permitted geometry/controller additions. It checks exact Basic
anchor/id relations, correspondence, initial-value copies, complete controller
and geometry sets, exactly three numeric policies in each view and two root
policies in full inventory only. Unknown, partial, duplicate, malformed,
transferred and extra policy/source sets refuse. Existing times factories and
their evidence path remain separate.

The witness validator consumes the frozen serialized schema as data, checks
all five rows, source/helpers/path, exact actions/steps, actual IDs, integer
revision/owner, root8/Basic35 coverage, exact format hashes, scalar finite live
values, install-default equality and fresh close request/operation equality.
Checkpoint validation reuses the same three witnessed values in the seven
numeric states and preserves all existing Basic retention and duplicate-sensitive
endpoint checks. A plus numeric row cannot claim an observed receipt tag.

`extract_checkpoint` inspects the supplied trusted request record before any
retained-byte write/update on the new plus path. It conjoins actual request,
causing-operation, step/action/action-document/action-revision, document,
revision, source and working-path identities with raw data and independently
validated witnesses. Failure leaves the trusted record and retained path
untouched. Existing nongated extraction behavior remains intact.

## Test-First Evidence

All commands use `python3 -B`; unittest commands run from the arithmetic package
directory unless otherwise stated.

1. Initial RED command:
   `python3 -B -m unittest test_preparation.Preparation008Tests`.
   Ran 5 tests; exit 1 with five expected assertion failures for the missing
   independent007 loader, metadata validator/provenance and dependent witness/
   trusted-record behaviors. No import, syntax or unrelated failure substituted
   for this RED result.
2. First GREEN command: the same command.
   Ran 5 tests; exit 0, OK. The real immutable007 loader and in-memory rebound
   mutations passed. Raw size and outer public/config/seal hashes are rebound
   in tests where necessary, allowing corrupt diagnostics and owners to reach
   their semantic checks. Original evidence stays read-only.
3. Second RED command:
   `python3 -B -m unittest test_preparation.Preparation008Tests.test_plus_v8_007_rebound_semantics`.
   Ran 1 test; exit 1 with three expected subtest failures: source-path,
   driver-map and driver-bytes mutations were not yet rejected. Production
   correspondence checks were then added. The next complete preparation run
   ran 27 tests and exited 0, OK.
4. Third RED command:
   `python3 -B -m unittest test_preparation.Preparation008Tests.test_plus_v8_strict_metadata_counts_and_receipt_claim`.
   Ran 1 test; exit 1 with three expected failures for boolean incoming/outgoing
   metadata route counts and a raw gated numeric receipt claim. Strict count
   typing and receipt-claim refusal were then implemented.
5. Final targeted GREEN command:
   `python3 -B -m unittest test_preparation.Preparation008Tests`.
   Ran 6 tests in 4.391 seconds; exit 0, OK.
6. Final complete Python regression command:
   `python3 -B -m unittest discover -p 'test_*.py'`.
   Ran 77 tests in 16.575 seconds; exit 0, OK (skipped=1): 76 executed tests
   passed, zero failures/errors. Suites include preparation, lifecycle,
   comparison, native-score logic and frozen runner controls.

The existing skip is
`test_native_score.ActualCaptureRefusals.test_complete_actual_capture_refuses_each_declared_corruption`:
the explicit external private-evidence environment paths are not supplied.
No test was removed or newly skipped. The earlier synthetic controller metadata
producer test now supplies explicit synthetic007 measurements/pins/projection
and additionally expects the newly required V8 policies while retaining its
controller/source-view assertions.

Coverage includes 32 rebound semantic mutation cases, each of six owners,
both revisions and every install/event/close action, every new policy member
and copy with missing/changed mutations, complete-view and consistent two-view
corruption, partial/duplicate/extra/transferred sets, strict identity/count
types, stale historical/changed-request/close boundaries, trusted record
mutations, Basic class and route-multiplicity failures, and invalid scalar
observations (singleton/multiple arrays, strings, booleans, null, missing values,
unavailable, throws, undefined/other representations, nonfinite values and
wrong private format).

## Additional Verification

From repository root, a `python3 -B` heredoc parsed both changed Python files
with `ast.parse` and printed their SHA256 values. Both AST checks passed and
the hashes are recorded above. No bytecode files were generated by these
commands.

Independent read-only projection reconstruction called `source_inventory` on
pristine private plus bytes, built its own projection and ordered observer
leaves, and normalized/hashes it without a metadata factory. Result:
`ba8d3d1ec23265bd75f16641fa95668466888d4033811fda95bcdef757da600f`,
18,683 canonical bytes, counts 16 boxes / 20 full entries / 8 edges / 19 leaves.
The actual independent007 loader returned 3 numeric and 2 root measurements.

A separate read-only `source_metadata()` call against installed sources and
historical evidence succeeded: 3 documents, 4 helpers; both times and plus have
3 Basic numeric / 3 full numeric / 2 full root V8 policies, while minus has zero.
No preparation or archive was created.

## Integration Clarification And Limits

Parent clarified during implementation that the design's `op="readback"` and
`op="operation"` describe original command/request context. They are not new
serialized raw/proof fields. The validator therefore does not add or require
an `op` field in the raw payload, close proof or exact witness schema. JS must
validate/snapshot original request context; independent lifecycle validation
must bind the command. Arithmetic keeps trusted causing-operation conjunction
and close witness ID equality. This preserves the frozen runner's supplied
record schema and the existing strict outer close schema.

The independently tasked JS and standard-library lifecycle consumers are not
implemented, imported or changed by this worker. They must reproduce the
complete source/policy validation and exact shared witness schema, including
request-local authority/currentness and fresh close collection. Python cannot
prove in-process JS object identity or currentness from serialized data.
Frozen runner checks still provide complete seven-getter journal silence and
process ownership/cleanup; the loader makes no historical full-silence claim.

JS suites, live target/native execution, actual external native-evidence tests,
new preparations/archives/captures and independent review were not run by this
worker. Parent owns integrated JS/lifecycle checks and independent review.
All existing private evidence, controller, score and native results remain
read-only. Denominators and qualification remain unchanged: 78 operations,
72 live plus 6 empty checkpoints, 504 numeric states, 141 original emissions,
6 closes; native 90 cable deliveries / 297 typed receipts; 0/2103 qualification
and zero increment.
