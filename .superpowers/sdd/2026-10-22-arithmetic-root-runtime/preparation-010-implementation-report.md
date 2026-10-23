# Preparation010 Implementation Report

Status: implementation complete; final focused/full Node and syntax checks
PASS. The source pair is frozen for independent parent review/integration.

## Requirements And Scope

Read the implementation brief first, SHA256
`3befe3c326a4e2ad761b9d6ff7bfd0e7f7b121c096867a8e609bed33b7295af7`,
then the accepted010 design
`ca16153b8ccf1911d32ade6cb799026e251216578bbdf5398ac712a6592e229e`
and independent PASS review
`6834443607ee29a13525863fc774e3febb323f5917a2562d307614c79f6fea65`.
Read the normative009 design and rereview. This implements the accepted design
without another design/approval cycle.

Only controller.js, test_helpers.cjs and this report changed through this
worker. Paths for the source pair are under
`experiments/max-reference/arithmetic-roots-runtime-20261022/`. No delegation,
commit, branch change, revert, archive, preparation, new private root,
Max/Wine/native/display/REA launch, full Python suite or licensed-source
reconstruction was performed. All Python commands used `python3 -B` and read
metadata/hashes only. Synthetic fixtures and traces are wholly original; traces
exist only transiently in test memory/output, with no benchmark/trace artifact.

## Source Changes And Bindings

| File | Baseline SHA256 | Final SHA256 |
| --- | --- | --- |
| controller.js | 0447c587e09f9eb26ea2bf798d22c32714386baa747d1e73f92f385d5b8ce571 | 023ed6b2b0f0b614b4c432f0928c9985b1668a21283c8a30a7311fe953166006 |
| test_helpers.cjs | 12d1532a645cb975013e3556488c7613080cdf8f62011bd9f4760c32b5f37f4d | 084947cd9f3429ee3a07ea6d0dde088c9c7dcbbb0f0998be67c585c7a46d23c3 |

The collector captures the four original canonical strings before host reads.
Their digest meanings are unchanged. Separate JSON-parsed trees own all four
comparison authorities; no live input object is its own authority. Each old
sameInputs point still runs all original configuration/action/document-array/
helper-array/lifecycle/owners/owner/definition/request identity checks, then
compares every complete command, definition, configuration and owner.

The recursive comparator checks types, own property names and presence, array
length/indices/expandos, ordinary object/array prototypes, symbol additions,
data descriptors and values. It rejects accessors, functions, undefined,
nonfinite changes, holes, cycles and nonplain object/array types, without
calling user serialization/conversion. It compares finite numbers with numeric
equality, including negative zero, and ignores object key insertion order.
Comparison is bounded to128levels/100000visited values per complete tree;
these are fail-closed pure-data bounds. There is no object-reference shortcut.
The last sameInputs checks remain after root filepath, with no subsequent
host read inside that guard.

Successful full source validation is cached only inside that collector, only
after another complete equality check. Every reuse still requires the full
reference/action/plain equality. Host eligibility and seven-row completeness
are never cached as successes when they failed. The full original source
predicate, constants, pins and canonical primitive remain unchanged.

The first complete eligible host sample retains source-pinned owned rectangles,
allowed classes, names, child metadata, ordered data and wrapper identities.
Later samples retain all fresh host reads and compare primitives directly to
those retained values. The unchanged-position path does not rematch source or
hash geometry. A changed ordered position can search the owned eligibility
rows to distinguish an eligible reorder/replacement (`binding-changed`) from
invalid class/name/rectangle/ownership (`guard-threw`). Final ordered wrapper/
data comparison uses primitive equality rather than serialization.

## Test-First RED

All commands ran from `/home/venetanji/Work/alive`, Node v22.23.3. The first
three observations below ran against the current009 controller before its
first source edit, SHA2560447c587e09f9eb26ea2bf798d22c32714386baa747d1e73f92f385d5b8ce571.
No historical code was executed after source edits.

```bash
ARITHMETIC_009_CASE=skip ARITHMETIC_010_CASE=minus010_stable_work_budget node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs
```

Expected/observed RED: four complete snapshots must be canonicalized once;
actual command/definition/configuration/owner counts were91each versus1each.
Actual source1, geometry1823, samples89, rectangles20820, filepath159 and six
ordered once-only calls. Exit1, meaningful repeated-work failure.

```bash
ARITHMETIC_009_CASE=skip ARITHMETIC_010_CASE=minus010_ineligible_source_cache node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs
```

Expected/observed RED: successful immutable validation must survive ineligible
host retries; actual source70 versus1. Four snapshot counts71each,
geometry3010, rectangles19040, filepath70, zero calls/no envelope. Exit1.

```bash
ARITHMETIC_009_CASE=skip ARITHMETIC_010_CASE=minus010_complete_ordered_read_oracle node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs
```

Original009 ordered baseline PASS:89 samples,274 host events/sample,
24386ordered events, digest
`bd9606c23777bcc7bce36c56f688eaea22d3314bf88b55110394d03059fbfea6`.
The oracle covers method-property reads and calls, rectangle length and four
coordinates, recursion before containing nextobject, nonchild subpatcher calls,
named lookup, child ownership, empty-child firstobject, root ownership and
filepath last. Root has no extra child-style box/parent read.

The first preimplementation mutation-group RED was `array-expando/lookup`:
actual6 capability calls versus0, from the same install/poll/refusal path.
The initial implementation's self-review added another meaningful RED for a
custom array prototype: `array-prototype/lookup`, actual6 versus0. It was
closed by requiring a plain array prototype in the bounded comparator.

## Final Verification Commands

Focused010 GREEN uses current fixture/helper definitions extracted into memory,
skipping old009 cases while executing all seven010groups:

```bash
ARITHMETIC_009_CASE=skip node - <<'JS'
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const filename = path.resolve('experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs');
const source = fs.readFileSync(filename, 'utf8');
const header = source.slice(0, source.indexOf('const controller ='));
const utilities = source.slice(source.indexOf('function memoryFile('), source.indexOf('const diagnosticMemory ='));
const support = "const crypto = require('node:crypto'); const canonical = value => JSON.stringify(value); const hash = value => crypto.createHash('sha256').update(canonical(value)).digest('hex');\n";
const focused = new Module(filename, module); focused.filename = filename; focused.paths = module.paths;
focused._compile(header + support + utilities + source.slice(source.indexOf('// Wholly original source data:')), filename);
JS
node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs
node --check experiments/max-reference/arithmetic-roots-runtime-20261022/controller.js
node --check experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs
```

Focused final result: exit0; seven completed010groups and no failures.
Both final syntax checks: exit0. Final full Node result: exit0;44named groups
completed (10/11/16/7 for007/008/009/010), all four failure arrays empty.
Earlier full Node runs also passed all unchanged old007/008/009groups;
final acceptance uses the fresh full run after the last source/test edits.

| Observable | Stable final | Ineligible root final |
| --- | --- | --- |
| Top-level canonical calls, each of four snapshots | 1 | 1 |
| Full source predicate calls | 1 | 1 |
| Geometry hashes | 63 (43 source +20 first host) | 43 source |
| Collector ownership/sample attempts | 89 | 70 |
| Total rectangle reads | 20820 | 19040 |
| Root filepath reads | 159 | 70 |
| Capability calls | 6 ordered, once each | 0 |
| ACK success | false | false |
| Diagnostic envelope | complete | absent |

Canonical counters track call depth and count only outermost input calls,
separating nested definition/owner traversal through configuration. Stable
envelope version/schema/digest checks, actual seven terminal diagnostics,
counts6/6/6/3, original method order and unconditional refusal all pass.
Stable ordered trace exactly matches the original009 digest above. The
ineligible oracle explicitly checks70 repetitions of frontpatcher then root
parentpatcher:140ordered fresh ownership reads and no collector filepath read.
The70total filepath reads in that fixture belong to unchanged legacy polling.

The plain-input group has33mutators exercised in three phases: lookup after
source caching, returned-outcome retention and later validation (99cases).
It covers nested boxes/full inventory/edges/leaves/helpers/paths/owners/other
configured definitions; added/missing fields; array order/length/expando/hole/
prototype; type changes; toJSON/functions/undefined/Infinity/NaN/-Infinity/
cycles; symbol/hidden additions and replacement references. It asserts0/1/6
calls, truthful retained prefixes/counts and first invalidation. Positive
controls retain reordered object keys, finite numeric equivalence and -0.
Source-validation mutation suppresses collection, then restoration requires
source validation again (two calls, collection at poll2), proving a mutated
successful validation was not cached. Host classification has six mutations
across collection/later phases (12cases), retaining preceding outcomes and
the exact `binding-changed`/`guard-threw` stage/code meanings.

## Named Groups

Unchanged007 (10groups):

```text
plus007_preflight_suppresses_capabilities
plus007_current_capability_refusal
plus007_fresh_cohort_bind_reuse
plus007_result_ownership_lifetime
plus007_both_independent_revisions
plus007_old_fixture_refusal
plus007_v8_complete_diagnostics
plus007_v8_incomplete_suppression
plus007_v8_recognition_is_not_admission
plus007_fix1_v8_root_source_class_binding
```

Unchanged008 (11groups):

```text
plus008_full_readback_and_fresh_close
plus008_honest_diagnostics_and_no_external_authority
plus008_metadata_preflight
plus008_capability_shapes
plus008_last_getter_and_retention_currentness
plus008_inventory_preflight_and_retention
plus008_original_close_and_endpoint_identity
plus008_binding_read_snapshots_and_failure_prefix
plus008_controller_coexistence
plus008_fix1_final_binding_read_install
plus008_fix1_final_binding_read_close
```

Unchanged009 (16groups):

```text
minus009_once_only_strict_refusal
minus009_canonical_source_hash
minus009_source_request_owner_schema_suppression
minus009_complete_hierarchy_suppression
minus009_all_classified_outcomes
minus009_stable_lookup_and_invocation_failures_continue
minus009_single_lookup_and_trusted_receiver_bridge
minus009_lookup_mutation_suppresses_invocation
minus009_unsupported_intrinsic_stops_without_fallback
minus009_returned_classification_failure_retains_prefix
minus009_invocation_mutations_and_partial_pairs
minus009_final_host_read_mutation
minus009_later_hierarchy_and_terminal_arrays
minus009_terminal_throw_and_export_immutability
minus009_request_and_queued_callback_ownership
minus009_stopped_batch_keeps_first_failure
```

New010 (seven groups):

```text
minus010_stable_work_budget
minus010_ineligible_source_cache
minus010_complete_ordered_read_oracle
minus010_complete_plain_mutations_after_cache
minus010_object_order_and_finite_numeric_equivalence
minus010_post_source_validation_equality
minus010_binding_change_and_invalid_eligibility_codes
```

No old assertion was changed. Earlier legacy summaries retain12identity/
8geometry cases, zero malformed direct/serialized capability observations,
1710refusal rows/1740longest rows/644956bytes/80polls/420calls/947maxlinebytes,
and10scheduled failure cases with zero postfailure activity/changed ACK/
unexpected queue.

Test-development failures, all resolved: the first focused extraction ended at
the wrong utility boundary (parse error), corrected to `const diagnosticMemory`;
layering counters over the read oracle initially recursed through mutable
method wrappers, producing70887040rectangle counts rather than19040, corrected
by capturing the method value per property lookup; an exploratory overlapping-
class/rectangle fixture could not first establish eligibility (nine legacy
diagnostics, zero calls), so its invalid premise was removed. These changed no
old control or source eligibility rule. The genuine RED failures are recorded
separately above. Final focused failures are empty.

## Preservation And Self-Review

Before/after checks match these exact byte-region SHA256 values:

- Entire minusSourceDefinition function through its following newline:
  `445b493639ba658dab95a37300f40269b9ded68567a8ed117eba729486e117b9`.
- Entire controller prefix before createMinusDiagnosticCollector, including
  constants, source pins, geometry primitive, minusCanonical and
  minusCanonicalHash:
  `da08d32543b945b6fa3ae174f49246903f0821d4c2f35d8840cbb8f0cc1ad7c9`.
- All original test_helpers bytes before the appended Task010 section:
  `e93a82d5a30b882a89f86dcd611eacf454d96b321e88d7a1c13315c95f286c34`.

All14unauthorized mapped files match preparation-009-source-review.json
current_files, with zero mismatches. Original single lookups, trusted receiver
bridge, unsupported bridge refusal, classification failures, all partial
prefixes, actual terminal diagnostics/throws, later hierarchy changes, first
failure, monotonic stale state, request/queued ownership and immutable
host-free exports remain controlled by unchanged assertions. No helper or
times/plus behavior was edited. No minus success/binding/observer/disposition/
revision advancement is admitted by any apparently successful probe.

Before and after inventories cover all30 arithmetic private roots under
`/home/venetanji/.cache/alive-ultra-evidence/arithmetic*`,1523entries. Each row
records path, type/mode, uid/gid, size, mtime_ns, ctime_ns, symlink target where
applicable, and regular-file SHA256. The sorted compact JSON aggregate is
`73aa36f56b1aea0557a84dec10d9343810934c5d812397013faa16531bb7208b`
before and after; exact equality true, zero changed roots/entries. Hashing
prints aggregates only and does not expose private contents.

Self-review checks the owned-authority separation, no object reference
shortcut, complete property domain and bounds, post-source equality before
cache assignment, source/host cache separation, direct primitive host checks,
all retained guard points and host read order, distinction between invalid
eligibility and eligible binding change, final filepath ordering, partial
outcome retention and unconditional refusal. No unresolved implementation
conflict is known. Parent independently reviews the frozen source and performs
fresh integration and real-source reconstruction; no concrete launch or
compatibility acceptance follows from these synthetic controls.

Capture009 remains FAILED/incomplete:52accepted times/plus operations,
48live checkpoints/336states/94outputs/4closes; request101 has no ACK within
the unchanged10second wait. Internal minus progress and timeout cause remain
unknown. These deterministic work reductions establish no actual Max timing
or compatibility fix. Scheduling, poll/command/runtime/REA bounds, file/process
caps, all full-capture obligations, all six false whole-capture flags,
saved_order_observed=false and qualification0/2103 are unchanged.

## Fix Round1: Explicit Plain Prototypes

Status: COMPLETE/PASS. This appended section records the latest frozen source
pair and supersedes the initial pair above. The original15618report bytes
remain identical to preparation-010-implementation-report-initial.md, SHA256
`079402cd3ce64b7f91bcd250b6a350cc1259948a5cbd83b6630898309203b807`.
The initial snapshot itself was not edited.

Read fix brief first, SHA256
`fc2120829d61a71bd289042e3951f6ccb80fa960a6d6759884a6c430bdb7a803`,
then the complete accepted independent source review, SHA256
`18d7c22350519e7921d8be9b183eb3e48cad03a65c6288bc3d63d670d951c5a9`.
The sole P1 inherited-hook/custom-prototype finding is reproduced and fixed.
No change was made to the resolved ordered-candidate path.

### Exact RED/GREEN

Added six separate original regression cases before editing source, so all
two-form/three-phase failures were observed independently. The object form
starts as config.synthetic={value:0}, then acquires an Object.create(null)
prototype with an own toJSON function. The array form starts as [0], then
acquires a custom prototype built by Object.setPrototypeOf([],Object.prototype)
with the same hook. Each mutation occurs at the first lookup, after the first
returned outcome, or at later validation after collection.

The following exact focused command was run for both RED and GREEN:

```bash
ARITHMETIC_009_CASE=skip node - <<'JS'
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const filename = path.resolve('experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs');
const source = fs.readFileSync(filename, 'utf8');
const header = source.slice(0, source.indexOf('const controller ='));
const utilities = source.slice(source.indexOf('function memoryFile('), source.indexOf('const diagnosticMemory ='));
const support = "const crypto = require('node:crypto'); const canonical = value => JSON.stringify(value); const hash = value => crypto.createHash('sha256').update(canonical(value)).digest('hex');\n";
const focused = new Module(filename, module); focused.filename = filename; focused.paths = module.paths;
const cases = source.slice(source.indexOf('// Wholly original source data:')).replace("if (process.env.ARITHMETIC_010_CASE && process.env.ARITHMETIC_010_CASE !== name) return;", "if (!name.startsWith('minus010_fix1_')) return;");
focused._compile(header + support + utilities + cases, filename);
JS
```

RED used controller023ed6b2b0f0b614b4c432f0928c9985b1668a21283c8a30a7311fe953166006.
Exit1, six intended failures: each lookup case completed6 rather than0 calls;
each outcome case completed6 rather than1; each later case retained stale=false
rather thantrue. Every case logged serializationCalls=0. The six positive
ordinary cross-realm/null-prototype forms already passed on the baseline.

GREEN after the source fix: exit0, seven new groups completed, no failures.
Both forms now have exact invocation/outcome prefixes0/1/6, completed pairs0/0/3,
lookups1/1/6 and serializationCalls=0. All retain strict minus refusal, stale=true,
guard-threw, collection-guard at poll1 for collection mutations or
later-validation at poll2. Collection first failure remains
guard-before-invocation or guard-after-outcome at method0; the later phase
retains the complete collection and its null first failure. Previously returned
observations remain retained, and remaining invocations stay unattempted.

New named groups:

```text
minus010_fix1_inherited_hook_object_lookup
minus010_fix1_inherited_hook_object_outcome
minus010_fix1_inherited_hook_object_later
minus010_fix1_inherited_hook_array_lookup
minus010_fix1_inherited_hook_array_outcome
minus010_fix1_inherited_hook_array_later
minus010_fix1_plain_cross_realm_and_null_prototype
```

The positive group replaces equal nested values after source-cache success
with ordinary object/array values from the controller realm, another fresh
realm, or null-prototype object/array values. All six positive forms complete
six calls with unchanged counts and stale=false. Existing key-order,
finite-numeric and negative-zero controls remain unchanged and pass.

### Fix Implementation And Fresh Full Checks

Prototype handling remains inside createMinusDiagnosticCollector. Local
Object.prototype and Array.prototype are explicit allowed identities. A
foreign prototype is recognized only through its own data constructor,
the constructor's own prototype back-pointer to that exact object, and the
captured native Function.prototype.toString result matching the corresponding
intrinsic Object/Array constructor. This calls the native inspection primitive,
never a user function, own toString, valueOf or serialization hook. An array's
parent must also be an allowed ordinary object prototype. Null prototypes
remain accepted. An ancestry depth match alone no longer establishes anything.

Collector-local recognized prototype identities retain their parent identity.
Each subsequent check freshly verifies that identity and rejects an own toJSON
descriptor on the prototype, also checking the object parent of an array.
Descriptors are inspected without invoking getters/hooks. Recognizing a genuine
foreign intrinsic prototype neither refreshes the owned data authority nor
skips complete bounded own-property/value comparison. Source-cache assignment
and all reference/action/input checks are unchanged.

After the final source/test edits, reran the full010 focused command exactly
as recorded in the initial Final Verification Commands section (without the
fix1-only filter): exit0,14completed010groups, failures010 empty. It includes
all99original input-mutation phase cases,12host failure-code cases and all
new fix controls. Then ran:

```bash
node --check experiments/max-reference/arithmetic-roots-runtime-20261022/controller.js
node --check experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs
node experiments/max-reference/arithmetic-roots-runtime-20261022/test_helpers.cjs
```

Both syntax checks exit0. One fresh final full Node run exits0 with51named
groups (10/11/16/14 for007/008/009/010), all four failure arrays empty.
All original assertions and legacy summaries pass unchanged. No further source
or test edits followed these final commands.

Work/read preservation exactly reproduced:

- Stable:1top-level canonical call each of four inputs,1source validation,
  63geometry hashes,89samples,20820rectangle reads,159root filepath reads,
  six ordered once-only calls, counts6/6/6/3, seven terminal diagnostics,
  exact envelope/digests and false ACK.
- Ordered trace:89x274events, digest
  `bd9606c23777bcc7bce36c56f688eaea22d3314bf88b55110394d03059fbfea6`.
- Ineligible:70fresh ownership attempts/140ordered ownership reads,
  1source validation,43geometry hashes,19040rectangle reads,70filepath reads,
  zero calls/no envelope and false ACK.

### Final Bindings And Preservation

Latest frozen source SHA256:

| File | Fix1 Final SHA256 |
| --- | --- |
| controller.js | 90e012563d7a91b5346a071766c5f17b94d7efd1ce912b7e0ba1f303a19ac6a3 |
| test_helpers.cjs | 4ccd76f00cb8a88a55f571afa911b49dd051a1e9108ee6707531a440536be4a4 |

The entire collector region from function sample through the end of
createMinusDiagnosticCollector is byte-identical before/after fix1, SHA256
`602c8e6216a22b623e29898a9d8e120281a558b4e3ee1daf04210474ed8e948c`.
Thus host traversal, ordered-candidate eligibility, collection/lookup/bridge/
classification, cache assignment, later/terminal checks and export code were
not changed in this fix. The source-predicate hash445b4936..., entire
pre-collector constants/pins/canonical prefix hashda08d325..., and original
test-prefix hashe93a82d5... reproduce the full exact hashes above unchanged.
All14unauthorized mapped files still match009current_files.

Before/after fix1 inventories remain30private roots/1523entries, exact
metadata/regular-file-hash equality, aggregate SHA256
`73aa36f56b1aea0557a84dec10d9343810934c5d812397013faa16531bb7208b`.
No private root/evidence/initial report snapshot/review/map/diff/ledger or
unauthorized source file was written. No delegation, commit, revert, branch
change, preparation/archive, full Python/native suite or launch occurred.

Self-review verified the native constructor back-pointer requirement rejects
custom null-parent and array-shaped prototypes, prototype checks do not invoke
inherited hooks, all legitimate realm/null positives pass, the complete owned
snapshot/reference checks and source-cache requirements remain unchanged, and
the host/collection byte region is preserved. No unresolved conflict is known;
independent parent re-review/integration remains required. The source pair is
frozen on return. Capture009 remains FAILED, internal minus progress UNKNOWN,
timeout cause unproven, qualification0/2103 unchanged. No actual Max timing or
compatibility fix is claimed.
