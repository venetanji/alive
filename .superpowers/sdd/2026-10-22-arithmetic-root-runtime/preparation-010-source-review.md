# Preparation010 Independent Source Review

## Findings

### P1: Custom prototypes bypass the complete plain-input guard

Location: `experiments/max-reference/arithmetic-roots-runtime-20261022/controller.js:452`
(object acceptance at line456 and array acceptance at lines454-455).
Related missing controls: `test_helpers.cjs:2077`.

The new comparator recognizes an ordinary prototype by its ancestry shape,
rather than establishing that it is an allowed plain prototype. Any custom
object whose own prototype is null passes the object check. A custom array
whose prototype is Object.prototype passes the array check. The subsequent
own-property comparison does not inspect properties inherited from these
accepted custom prototypes.

Concrete trigger: add the wholly original `config.synthetic = {value: 0}`
before collector creation. In the first target's getattr property lookup,
set that value's prototype to `Object.create(null)` with an own `toJSON`
function. Current input now has an introduced serialization hook and a
nonplain prototype, but samePlain returns true. The cached source authority
continues authorizing all six capability invocations and exports a complete
collection with `terminal_context.stale=false`. A corresponding array trigger
uses initial `config.synthetic = [0]`, then a custom array prototype made by
`Object.setPrototypeOf([], Object.prototype)` carrying the same hook.

The named focused check `010-custom-prototype-serialization-hook` reproduced
both forms in three phases using only the current controller and original
minus009Fixture support extracted in memory:

| Mutation phase | Required invocation prefix | Observed prefix, both forms | Required stale | Observed stale |
| --- | --- | --- | --- | --- |
| First method lookup after source caching | 0 | 6 | true | false |
| First returned outcome | 1 | 6 | true | false |
| Later validation after collection | 6 | 6 | true | false |

The hook was never invoked (serializationCalls=0 in every case); this is a
failure to reject the changed nonplain input, not a claim of serialization
execution. Strict minus refusal still holds. The problem is unauthorized
continuation of diagnostic calls and falsely current evidence after a mutation
the accepted design explicitly requires to fail closed.

Correction: establish allowed ordinary object/array prototypes explicitly,
including whichever cross-realm plain values the existing harness legitimately
uses, and reject custom prototypes without executing inherited hooks. Do not
use prototype depth alone as proof of plainness or refresh the authority after
mutation. Add these two controls at lookup, returned-outcome and later phases;
assert the exact 0/1/6 prefixes, guard-threw invalidation, retained prior outcome
and first-failure stage. Preserve positive object-key-order, finite-number and
negative-zero controls. Existing custom-prototype tests only add another
prototype-chain level, so they do not exercise these accepted shapes.

No other actionable finding was found in the reviewed frozen diff.

## Verdicts

- Specification: FAIL pending correction of the complete plain-input guard.
- Quality: FAIL pending the prototype correction and focused regression
  coverage. The existing passing suite does not cover this reproduced gap.

These verdicts apply only to the exact frozen source pair recorded below.
They do not require a policy/design change or authorize preparation or launch.

## Review Scope And Positive Evidence

Read the source-review brief first, then the implementation brief, accepted010
design, PASS design review and implementation report. Also inspected normative
009 design/rereview. Reviewed the frozen diff once. Additional current-source
inspection was confined to the comparator/cache/collector interfaces, original
synthetic fixture extraction, canonical primitive and the legacy resolve gate
needed to settle the concrete ordered-candidate ambiguity concern.

Independent Python3 -B byte/hash checks established all16 current files match
the supplied current map, all16 historical009 files match the supplied base
map, exactly controller.js and test_helpers.cjs differ, and the regenerated
two-file unified diff exactly equals the supplied frozen diff. The other14
mapped files are unchanged. The entire controller prefix before the collector,
including minusSourceDefinition, canonical primitive, constants and pins, is
byte-identical. All151341 original test_helpers bytes are an unchanged prefix
of the current test file. Historical source was read only as byte-comparison
material, never executed.

Apart from the finding, the implementation retains the four once-only canonical
strings and derives separately owned parsed authorities. All original action,
configuration, document/helper array, lifecycle/owners, definition and request
identity checks remain. Complete own-data comparison includes field presence,
array length/order/expandos/holes, types, symbols, descriptors, cycles and
128-depth/100000-value bounds. No live-object identity shortcut is used. Finite
numeric equality and negative zero remain accepted. The defect is specifically
the prototype acceptance boundary, not an omitted nested definition subtree.

Source validation success is collector-local. Assignment to sourceValidated
follows full postvalidation sameInputs; every later cache use first runs full
sameInputs. Failed host eligibility is never cached. The new mutation-during-
validation control restores the original value and requires a second source
validation, directly exercising that assignment order.

The first retained binding still uses the complete source-pinned bijection and
exact seven diagnostic rows. Stable later guards retain fresh wrapper,
ownership, class, name, rectangle length/four finite copied coordinates,
subpatcher method lookups/calls for children and nonchildren, named child
lookup, empty-child firstobject, recursive traversal before nextobject and
root filepath as the final host read. Full plain checks follow filepath. The
retained direct comparison includes ordered scopes, objects and data; stable
later guards perform no geometry hashing or source rematching.

The ordered-candidate fast path at controller.js:494 initially raised a
specific ambiguity concern: a changed allowed class could theoretically match
both its ordered row and another row. The existing initial eligibility gate
rules this out. Legacy resolve at controller.js:831 selects geometry matches
before checking classes. Equal live rectangles involving any unpinned row
therefore produce at least two geometry candidates for that row and an extra
diagnostic, preventing the required seven-row eligibility. Equal-rectangle
pinned rows have singleton runtime-class eligibility: overlapping classes
already fail the initial collector bijection, while distinct classes cannot
later become ambiguously eligible. No speculative change is requested here.

For valid retained inventories, new reorder/replacement controls preserve
binding-changed, while invalid class/name/rectangle/ownership controls preserve
guard-threw in both collection and later stages. Original collection guards,
six once-only slots, captured trusted bridge, single lookup/invocation,
outcome-before-classification retention, truthful partial prefixes/counters,
first-failure/stale monotonicity and host-free immutable export remain intact.
Terminal arrays still come from actual terminal observations. The exact009
envelope and unconditional minus refusal remain; no roots, observer, revision,
disposition or qualification admission was added.

## Test Evidence And Independent Check Limits

Inspected the seven appended010 groups and unchanged original007/008/009 test
prefix. The implementation report records meaningful pre-edit RED failures
through install/poll/refusal:91 versus1 top-level canonical calls per snapshot,
and70 versus1 source validations for ineligible ownership. It records a
pre-edit ordered trace baseline, not execution of archived code after editing.

The stable GREEN assertions check89 samples,20820 rectangle reads,159 filepath
reads, six ordered calls, counts6/6/6/3, seven actual terminal diagnostics,
unchanged envelope/digests, four once-only top-level canonicalizations and at
most63 geometry hashes (reported43 source plus20 initial host). Canonical depth
accounting separates nested recursion from top-level snapshot calls. The full
ordered oracle checks274 host events per sample,24386 total, exact method
property/call and rectangle-coordinate ordering, and the recorded baseline
digest. The ineligible control checks70 fresh ownership attempts and no calls
or envelope. These are deterministic assertions, not wall-clock claims.

The implementation report records all44 named Node groups passing
(10/11/16/7 for007/008/009/010), focused010 GREEN, and both syntax checks after
the last edit. Those are reviewed worker evidence, not independently rerun
full suites in this review. Parent independently owns fresh integrated Node,
Python, syntax, real-source reconstruction and all30 private-root inventories.

This reviewer ran only the named concrete prototype concern: first one
object/lookup reproduction, then the focused two-form/three-phase matrix.
Both inline `node - <<'JS'` processes exited1 on their intended fail-closed
assertions. Fixture support was extracted from current test_helpers in memory
by slicing the header before `const controller =`, utilities from
`function memoryFile(` to `const diagnosticMemory =`, and original synthetic
support from `// Wholly original source data:` to the first case009 call. No
old or new full test group executed. The matrix used the two mutations given
in the finding, f.start()/f.run()/f.finish(), and refused009(f); it printed
only original synthetic counters/statuses and asserted no failures. No
fixture, benchmark or trace artifact was written.

Only this review report was created. No implementation edit, private-root
mutation, preparation/archive action, delegation, full suite, historical code
execution or Max/Wine/native/display/REA launch occurred. No licensed values
were placed in output, repository or temporary files. Parent remains owner
of final private inventory preservation and source freshness checks.

## Frozen Bindings

| Artifact | SHA256 |
| --- | --- |
| controller.js | 023ed6b2b0f0b614b4c432f0928c9985b1668a21283c8a30a7311fe953166006 |
| test_helpers.cjs | 084947cd9f3429ee3a07ea6d0dde088c9c7dcbbb0f0998be67c585c7a46d23c3 |
| source-review brief | db718626209b721d8e9e51047217f9895b56d34bf948873b9b53a10700dc6c6b |
| accepted010 design | ca16153b8ccf1911d32ade6cb799026e251216578bbdf5398ac712a6592e229e |
| PASS design review | 6834443607ee29a13525863fc774e3febb323f5917a2562d307614c79f6fea65 |
| implementation report | 079402cd3ce64b7f91bcd250b6a350cc1259948a5cbd83b6630898309203b807 |
| frozen source-review.diff | b3eba67405469296131196850b10f66abb6d5a9c548e1c3352d7135488a27ed4 |
| frozen source-review.json | fa96c8071a7eddc35b31344339da80d343e9374927e19535a8bfc9d13247ce43 |
| canonical16 current-file map | f952095b3e0ae3c5b334bc6a2e85ecd528ace73e2de2f1722b677a9ff6f21ad0 |

The review report hash is supplied to the parent after writing this file;
it is not embedded recursively in its own contents.

## Live-Host And Capture Limits

Capture009 remains FAILED/incomplete:52 accepted times/plus operations,
48 live checkpoints/336 states/94 outputs/4 closes, then request101 has no ACK
within the unchanged10second wait. Internal minus progress remains UNKNOWN;
no timeout cause or actual Max performance/compatibility fix is established.
All six whole-capture flags remain false; saved_order_observed=false and
qualification0/2103 remain.

Full78operations/66events/72live+6empty/504states/141outputs/6closes/
90nativecables/297typedreceipts, commands1-150 plus barrier151, one owner and
pristine resets remain required. No timing/capacity/policy/alias/diagnostic
suppression or changed denominator is authorized by this review.
