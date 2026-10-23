# Capture010 Missing Minus Diagnostic Investigation

## Findings

1. **Capture010 retained an explicit refusal, not a missing ACK.** Command101
   is `operation/install-minus-r1`. Its retained and current ACK101 bytes are
   equal, record `success=false`, and contain seven anchor diagnostics but no
   `minus_numeric_preflight_diagnostic`. The private failure is
   `ValueError: Private controller refused command`. Journal row191 records
   `Error: minus-diagnostic-install-refused` for that request.
2. **The collector was present and its observe call was reached.** In the
   frozen controller, that journal error follows the call to a nonnull
   collector's `observe()` method. It does not identify which collector gate
   passed, which host sample failed, whether a lookup was attempted, or any
   invocation outcome. The absent envelope alone establishes none of those.
3. **No causal implementation defect is demonstrated by the retained data.**
   Focused Node checks of the actual010 plain config/command pass the unchanged
   production command and complete source/schema/projection predicates. The
   terminal candidate arrays also pass the available class/rectangle pin and
   diagnostic metadata comparisons. Neither check observes actual Max wrapper
   ownership, identity, currentness, or earlier polling history.
4. **The smallest useful next step is bounded refusal-progress evidence.**
   Preserve a fixed phase/reason at existing collector returns and catches,
   including initialization and the first host sample, and retain it even when
   the capability envelope is absent. Do not change calls, equality, admission,
   host read order, timing, or capacity. This report implements no diagnostic
   or other source change.

## Evidence Binding

Source paths are relative to
`experiments/max-reference/arithmetic-roots-runtime-20261022/`. Private work is
`~/.cache/alive-ultra-evidence/arithmetic-max-runtime-010`. REA reference:
`ev_7e2cc3a5915c4685d125f751389b1227bc5a28ee82a8b910278ae8a192c25221`.
The parent reports one invocation, exit1, untruncated, and direct verification
of all six original public file hashes before projection. That response proof
and the independent capture/native-prefix audit remain parent owned.

| Artifact | SHA256 |
| --- | --- |
| Public capture-evidence.json | 99e00d5f0c963dc5c7e892fc6d6519d718b77796f3abde3683000dc56f0729b3 |
| Public session.json | 712412727928c1fecbb03b23d33075cb63ba0ff3b922a59532c02b97b0d16419 |
| Private command101,234bytes | 7aef00f82dc331f6c37aeca85d20f1e3297bf57ff09f76a666ccec3e690976c8 |
| Current/retained ACK101,4650bytes | cd86e257eac4d6dcbecfd25e133226bfa6728366b7df26b1f946f171a0970fe4 |
| Private failure,67bytes | 1a49981cfa96e4e2778c9a635ba739e7a6143d572a264e4d8ba708a7c3f7cfa1 |
| Private journal,64025bytes | eab68d43aee372e4f39504d9d9d6ee81171f7dc6bf54c491e54cbfa05836fa94 |
| Raw runtime log,616bytes | 5b21cb9431f03cdbfbe32bbc6dcc482281d593a212cf7cf5d7ad01504308bd4a |
| Actual010 config,285388bytes | 2aded5c0a45252e5256ef57ebd4a80061cfc2c063a9451725072d89d4e2f1252 |
| Current/consumed controller.js | 90e012563d7a91b5346a071766c5f17b94d7efd1ce912b7e0ba1f303a19ac6a3 |
| Frozen test_helpers.cjs | 4ccd76f00cb8a88a55f571afa911b49dd051a1e9108ee6707531a440536be4a4 |
| Frozen16 canonical map | 625b52d524b49919ac149287ac06274d3e067ffe211fbbdbd9fbed1bdfb8e400 |
| Historical010 binding.json | 5ccfc019c04d072d9d58d553ac41d94a5cc54bb3974c134a550e28b913aff502 |

Both current and historical010 copies of all sixteen files match the map in
`.superpowers/sdd/2026-10-22-arithmetic-root-runtime/preparation-010-source-review-fix1.json`,
whose SHA256 is
`a6790ed0840efe8492ed53eeb2e38ca0454eadbd0e0339294cac76c237b054b2`.
Historical code was hashed only, never executed or imported.

The journal has191 contiguous rows:52 step-complete,44 stimulus,94 receipt
and one final harness-error. The final error binds request101, minus-r1,
install and `install-minus-r1`. The ACK has the ordinary refusal code,
seven terminal anchor rows, and empty geometry, numeric-mode and controller-
representation arrays. It is byte-identical to preserved008 ACK101; this
does not make their internal collector histories equal. No minus observation
file exists.

The ACK file mtime follows the command file by9.932474254seconds; the private
failure follows it by9.970484584seconds. These are filesystem boundaries, not
Max callback timings. A matching false ACK was retained before the runner
raised its refusal. The runtime log has10 lines and no TypeError,
ReferenceError, RangeError, SyntaxError, minus or controller.js marker.
This log is not complete Max-console evidence and cannot exclude a swallowed
collector exception.

## Observed Call Path And Its Limits

`controller.js:1161` creates the request-local collector before opening the
working root. Matching poll passes run `validateTree()`; it aggregates strict
diagnostics and then, at line997, calls `minusCollector.observe(...)`. The
next line unconditionally throws `minus-diagnostic-install-refused` when that
collector is present. The retained journal error is that exact fixed error,
so collector presence and observe-call reachability have actual runtime
support. The error is not an eligibility result.

Collector initialization at line447 catches snapshot/input errors and retains
only `initial=null`. At line624, `observe()` can return before source
validation, after a failed complete plain-input comparison, after the first
host sample, or at any seven-row diagnostic comparison. Its catch at line659
discards the eligibility exception. The first host sample checks root
ownership, wrappers, scope ownership, complete ordered inventory,
class/name/rectangle pins and child associations, then reads root filepath
last and checks all plain inputs again.

Only after those gates does it construct evidence and enter collection. Each
method slot has guards before lookup, before invocation and after outcome;
the lookup latch is set before the property access. Guard exceptions are
reduced to `guard-threw`. Later and terminal guards run only when the latch
is set. At lines1091-1094, terminal refusal asks the collector to export;
`exportData()` at line663 ordinarily returns null unless that latch is set.
The normal code's intended export condition is not an observation of the
actual010 latch or of an exact zero/partial/completed attempt count. No
retained stage record or envelope permits reconstructing those internals.

The accepted prefix remains52 operations,48 live readbacks,336 states,
94 original outputs and four independent closes. There are101 ACKs,
100 successful. Capture010 is FAILED/incomplete, all six whole-capture flags
remain false, and qualification remains0/2103.

## Focused Read-Only Gate Checks

Two inline Node processes evaluated the current controller and parsed actual010
config/command/ACK data only in memory. They did not call `start()`, `install()`,
Max methods, historical code or the test suite. No private graph was turned
into a host fixture, and no private-derived fixture or measurement file was
written. Output was limited to booleans and counts.

The first check used unchanged production predicates:

- `minusCommand(command)` passed.
- `minusSourceDefinition(definition,config,command)` returned actual owner4.
- With plain inputs parsed in the controller's Node realm and action set using
  production `setAction()`, collector creation succeeded. An observe call
  executed source validation once and reached a throwing sentinel on the first
  `max.frontpatcher` read. This establishes Node passage through initialization,
  complete plain comparison and source validation, not Max passage.

The second check directly compared retained terminal candidate data against
the actual source definition using production equality and hashing functions.
All seven expected diagnostic metadata rows passed; anchors were unique;
repeated arrays for the same scope were equal. The recorded root4 and Basic16
candidate arrays each mapped uniquely, including all seven pinned cases.
All three disposition/observation arrays were empty. The candidates contain
class and rectangle data only: no object/patcher wrapper, parent ownership,
name, child association, capability result or simultaneous-currentness proof.
The empty child scope has no candidate array of its own in these seven rows.

Thus a retained static request/schema/projection or terminal class/rectangle
pin mismatch was not demonstrated. Possible actual initialization/input
failure, host ownership/reference failure, transient mismatch, runtime API
exception and later collection behavior remain unresolved. Node success
does not establish legacy-js API compatibility or Max wrapper identity.

## Ownership Evidence Assessment

| Current predicate | Retained actual-Max support and limitation |
| --- | --- |
| `root.parentpatcher === null` | Successful legacy-js plus installs51/94 each retain three satisfied cohort observations. Production `plusNumericPreflightBinding()` at line730 requires this exact condition. This supports those plus roots, not the minus root. |
| `max.frontpatcher === root` on repeated reads | No retained strict reference-equality result. Plus trace root decisions record presence/path match, which is a different predicate. |
| `object.patcher === containingPatcher` | No retained actual equality observation. The minus synthetic fixture explicitly assigns the property. |
| `child.parentpatcher === root` and `child.box === container` | No retained actual equality observation. The minus fixture explicitly assigns both relationships. |
| Repeated wrapper/ordered-handle identity and named-child equality | No retained minus guard result. Terminal candidate correspondence supplies no reference identities. |

The current production controller uses the latter ownership relationships only
inside the minus sample; successful prefix controller binding does not check
them. V8 top-level root results likewise do not transfer strict legacy-js
wrapper identity. These are unverified assumptions to diagnose, not confirmed
failures or grounds to weaken the predicate.

The parent separately read Cycling74's legacy `jsmaxobj` and `jspatcherobject`
documentation: the listed APIs describe containing patcher, box and parent
patcher, with nil for a top-level parent. As the parent notes, API existence
does not establish JavaScript strict identity across repeated wrappers. No
documented-property argument resolves the actual010 refusal boundary.

## Minimal Diagnostic Recommendation

Retain one bounded, owned plain progress record for this exact diagnostic
request independently of the capability envelope. It needs initialization
success/failure, observe-entry count, actual source-validated and lookup-latch
states, and first/latest rejection records containing poll index, fixed phase
and original fixed refusal code. Instrument the existing returns and catches;
do not add a second eligibility pass. For unexpected exceptions, retain the
phase and an allowlisted exception type rather than arbitrary private text.

The phase must distinguish initialization, complete plain inputs, source
validation, root ownership, per-object parent identity, child ownership,
remaining inventory/pins, final filepath/plain-input checks, diagnostic-array
agreement and pre-lookup guard. Where compound ownership conditions can fail,
identify the existing short-circuited subcondition using only operands already
read. Record a first-sample rejection before the outer catch erases it, and
retain the original fixed error before a guard reduces it to `guard-threw`.
Do not force evaluation of a branch or property that would not already run.

Attach that record to terminal refusal even when the ordinary numeric envelope
is absent. Keep the ordinary envelope's actual six-slot statuses, partial
counts, once-only lookup/invocation behavior and stale-context contract.
This would distinguish never-initialized, plain/source-gate rejection,
specific host-boundary refusal, diagnostic disagreement and a started batch
without predicting any of them from the present absence.

Preserve every current host read and its order, filepath last and final plain
checks, all strict equalities, unconditional minus refusal, zero root/revision
binding and observer/disposition admission,70/80 poll limits,100ms scheduling
and the10second ACK wait. No extra capability call, replay of private graphs,
timing/capacity increase or policy/admission change follows from this report.
The next diagnostic requires a separate design/review and a parent-owned
preparation/capture; no such action was performed here.

## Preservation

All32 private arithmetic roots and1788 entries match the investigation's
before/after inventory digest:
`f8fde306b517bb855b9b1ab84075da8625989b7e03c0faca2a4f849959e22728`.
The inventory covers relative names, type/mode, uid/gid, size, mtime_ns,
ctime_ns, inode, link targets and regular-file SHA256. This is investigation
preservation, separate from the parent's prepared-to-captured comparison.
All sixteen current source files still match the frozen map. Only this report
was written.

No source/test, private artifact, archive, prior report, runtime/display state
or native proof was modified. No Max/Wine/native/REA/display launch, helper
execution, broad suite, preparation, commit or delegation occurred. Every
Python command used `python3 -B`. Private values remained in memory and no
licensed graph, operands, defaults, modes, geometry or helper bodies were
emitted or persisted by the investigation.
