# Preparation008 Independent Lifecycle Implementation Report

Status: implementation frozen for parent integration and independent review.
Accepted design SHA256: `79e6d3bd2db09eb87a6d62f02752989c1d571411a2d4afcb8de019866c11943a`.
This report makes no successful target-capture or qualification claim.

## Assigned Delta

Only these assigned repository files were changed by this task:

- `experiments/max-reference/arithmetic-roots-runtime-20261022/lifecycle.py`
- `experiments/max-reference/arithmetic-roots-runtime-20261022/test_lifecycle.py`
- This new report.

Final implementation/test SHA256 values:

| File | SHA256 |
| --- | --- |
| lifecycle.py | `15a7a8fc58ce21ecf8c6ec74485b3f9cba3a91811b219f9e2f9616abaa49409f` |
| test_lifecycle.py | `1366369583f0e5994cea26758467a3cac4386981797681b77d8cba7e7729719c` |

Baseline hashes matched the task's `fa87dd619fc109dcc90ec853ec921ae0151086302ec6bd163fecc98af59e66b8`
and `e41ee2a1ec4a48e30cb0a2c13c710e98c370eb613a24e9610b3a3c1050554650` before editing.
The report's own final SHA is returned separately to avoid a self-reference.

## Independent Consumer

The stdlib consumer encodes the public plus source/numeric/root/helper/E007
pins, existing controller cohort evidence and exact policy schemas locally.
Production imports remain only `collections`, `hashlib`, `json`, `math`, `os`,
`pathlib`, `re`, and `stat`. No arithmetic.py, JavaScript, historical executable,
or specification contract is imported or executed by production lifecycle code.

`_plus_source_projection(owner, definition)` validates both complete source
views and their permitted additions before pristine-field normalization and
hashing. Its production digest is the accepted complete pristine projection
pin. It requires 16 boxes, 20 full descriptors, 8 indexed saved edges and 19
ordered leaves; exact Basic anchor/id bindings; all existing geometry metadata;
three controller/numeric policies and their full-view copies; and two root-only
policies. Full-entry scalar copies are independently checked against the boxes.
Nested leaves and edges have exact schemas, strict integer indices/ports,
identity correspondence and port bounds before numeric normalization.
Geometry and finite source scalar numeric equivalence remains permitted.

The witness consumer binds plus owner inlets2/3, strict revisions1/2, configured
helpers/source/path, the exact close step and newly collected close request.
Witness request_id and operation_request_id must both equal the trusted close
request. Command.op remains `operation`; no serialized op field is added.
Old incomplete plus metadata refuses under the real preflight. Root and Basic
validation still requires all originals, leaves, roots, harness members,
classes, geometry, duplicate-sensitive routes and exact endpoints. Existing
retained close verification is replayed at every later close and final barrier.
Times uses its original document-specific pins and representation rules.

## Fixture Provenance And Containment

All new on-disk state is wholly original synthetic state, created by
`PlusV8Evidence` in test-owned TemporaryDirectory directories with 0700 directory
and 0600 file modes, using the existing Evidence private-file helper. The new
fixture independently authors all descriptor text, source-shaped defaults,
format values, geometry, root identities, routes, helper stub, config, close
proofs, ACKs, reports and retained bytes. Test-only pins bind that synthetic
state. Public accepted evidence hashes/schema vocabulary are reused; no genuine
private-derived source, geometry, scalar, config, proof or observation bytes
were read, copied to temporary storage, serialized in the repository, or
printed. Existing V8Evidence remains entirely synthetic. Editing helper scripts
contained only public code and synthetic fixtures and were removed after use.
The tests do not open installed licensed source or existing evidence directories.

The original minimal generic plus fixture has root/synthetic and three specific
synthetic child identities rather than a complete pristine plus descriptor.
A test-only wrapper in `load()` substitutes only the new source preflight for
that exact Basic anchor/name/three-child identity when no descriptor carries
any policy. It cannot substitute for a complete or policy-bearing plus fixture.
All existing Basic/root/history validators still run. Parent explicitly accepted
this compatibility approach during the task. These original tests exercise it:

- test_basic_retention_accepts_all_six_owners_with_duplicate_cables
- test_basic_retention_revalidates_all_six_forged_histories_after_digest_rebinding
- test_v8_barrier_revalidates_each_forged_retained_witness_after_digest_rebinding
- test_every_revision_closes_and_empty_final_barrier_replays_all_retained_evidence

New plus008 tests use complete PlusV8Evidence and the real source/policy/witness
preflight. A separate test calls `_real_plus_source_projection` on the old
minimal metadata and requires refusal without the test-only substitution.
No synthetic fixture exception exists in production.

## Test-First Evidence

The new acceptance test and nested identity regression were written before
production changes. The meaningful initial admission RED command, from
`experiments/max-reference/arithmetic-roots-runtime-20261022`, was:

```sh
python3 -B -m unittest test_lifecycle.LifecycleTests.test_plus_v8_close_accepts_both_owners_evolved_values_and_all_six_histories
```

Result before production changes: exit1, one test, one failure, with the
explicit assertion `Fresh six-owner plus close conjunction refused: Invalid
lifecycle exact five V8 policies and witnesses`. The original validator
recognized only times-specific anchors. After implementation the same command
passed one test in 0.313s, including both plus owners, evolved values, all six
closes and the complete final barrier. Initial commands from the wrong working
directory produced import errors and are not counted as meaningful RED evidence.
The broader corruption matrix was then added to the admitted path.

A separate in-memory mutation sensitivity RED retained all real source/proof
validation but replaced the exact integer checker with an integer-valued-float
coercion. No production file was modified. Exact command:

```sh
python3 -B - <<'PYRED'
import math
import unittest
import test_lifecycle as t
original = t.load
def permissive_load():
    module = original()
    strict_int = module._int
    def permissive_int(value, minimum=0, maximum=None):
        if type(value) is float and math.isfinite(value) and value.is_integer():
            value = int(value)
        return strict_int(value, minimum, maximum)
    module._int = permissive_int
    return module
t.load = permissive_load
suite = unittest.defaultTestLoader.loadTestsFromName('LifecycleTests.test_plus_v8_close_rejects_nested_identity_types_before_normalization', t)
result = unittest.TextTestRunner(verbosity=1).run(suite)
raise SystemExit(not result.wasSuccessful())
PYRED
```

Result: exit1, one test, four failing subtests (edge index, source port,
destination port, full-entry route count). Each failed because ValueError was
not raised. This demonstrates that the new strict-identity controls detect
normalization accepting malformed identity types, independently of admission
refusal. The unmodified consumer passes these controls in both final runs.

## Final Verification

All unittest commands below use the experiment directory as cwd and Python -B.
No tests were skipped. All original 21 lifecycle test methods remain present
and passing; 10 new plus008 methods are added.

| Exact command | Result |
| --- | --- |
| `python3 -B -m unittest -k plus_v8 test_lifecycle` | exit0; 10 tests; 5.443s; OK |
| `python3 -B -m unittest test_lifecycle` | exit0; 31 tests; 10.005s; OK |

Additional read-only syntax/import verification from repository root used:

```sh
python3 -B - <<'PYCHECK'
import ast
from pathlib import Path
p = Path('experiments/max-reference/arithmetic-roots-runtime-20261022/lifecycle.py')
tree = ast.parse(p.read_text())
imports = sorted({node.module or '' for node in ast.walk(tree) if isinstance(node, ast.ImportFrom)} | {a.name for node in ast.walk(tree) if isinstance(node, ast.Import) for a in node.names})
print('Lifecycle imports:', ', '.join(imports))
for name in ('lifecycle.py', 'test_lifecycle.py'):
    text = (p.parent / name).read_text()
    compile(text, str(p.parent / name), 'exec')
    print(name + ': in-memory syntax PASS')
PYCHECK
```

Result: exit0; both in-memory syntax checks PASS; only the eight stdlib imports
listed earlier. This does not write bytecode.

## Covered Controls And Boundaries

The new matrix covers both plus owners with evolved state; every field of each
numeric/root/controller/geometry policy in each permitted view; unknown/missing
policy members; missing/transferred/extra policy sets; complete descriptor and
consistent dual-view corruption; strict nested identity types and port bounds;
all outer witness members, all five rows, exact row members, coverage and count
types; stale install/event/request/operation/revision/path/action proofs;
malformed/nonfinite/scalar-versus-array capability observations; cross-owner
witness reuse; command.op conjunction; all five retained rows for each plus owner
after root/ACK metadata digest rebinding; and prior close corruption checked by
the next close. Complete root/Basic/harness retention corruption and numeric
geometry/scalar equivalence controls remain separate from identity validation.
The original six-owner and times-specific tests also pass unchanged.

No commits, subagents, target/native/Wine/Max/display launches, preparation,
archive creation, private writes, changes to frozen Python/JavaScript pairs,
or edits outside the three assigned repository files were performed. Existing
private evidence directories were not opened or modified. Controller, runner,
comparator, observer, score, bounds, latches, ownership and cleanup code remain
untouched. Complete denominators remain78 operations,72 live plus6 empty
checkpoints,504 numeric states,141 original emissions,6 closes; native evidence
remains90 cable deliveries/297 typed receipts; qualification remains0/2103 with
zero increment.

## Remaining Review Boundary

Parent owns integrated full Python/Node suites, frozen-delta review, real
read-only source projection reconstruction for both plus revisions and the
independent implementation review. Those checks were not run by this task.
No target launch/capture or preparation008 evidence was produced. Synthetic
pin replacement validates consumer logic but cannot independently establish
real private metadata agreement; the parent's separate reconstruction is
required for that check. No other implementation concern is known from the
focused and complete lifecycle results. This self-report is not independent
approval.
