# Preparation009 Independent Design Review

Verdict: FAIL pending the three concrete design amendments below. The proposed
diagnostic-only two-file scope is feasible; the current document is not yet an
exact implementation contract. No implementation, test, preparation, runtime
or qualification result is claimed.

Reviewed design SHA256:
`41b8528cf6b9392df422375ad3d1388757cc95bf0714c3e7d59d2a07499f5fa5`.
Reviewed investigation SHA256:
`7b8ddb96a3445d7d8e4718bb6f2fcd27d6ab12704c342fb0e5ce259a09edc68a`.
References below use paths relative to this SDD directory for design/reports,
and to `experiments/max-reference/arithmetic-roots-runtime-20261022/` for code.
Parent subsequently accepted the completed008 audit and investigation during
this review. The audit SHA256 is
`7dc947d18cefb13a2fd3e32987727c95c4980da778ea48979251b1382bfc252d`;
the final verification-capture008.json SHA256 is
`a511ece9cb26450cb83819cffcb901ae76db81c52c143721006c8068219b8833`.
Both hashes were reproduced read-only here. Parent also reports independent
source projection reconstruction and unchanged private inventories. Capture008
remains FAILED/incomplete; accepted audit quality does not change that result.

## Findings

### 1. P1: Safe capability lookup and invocation is unspecified at the critical mutation boundary

References: `max-preparation-009-design.md:130`,
`max-preparation-009-design.md:135`, `controller.js:297`,
`controller.js:301`, `controller.js:313`.

The design requires checks before/after calls and after final host reads but
also directs the worker to the current observation schema. The existing
capability helper reads `object[method]` once to test its type and a second time
to invoke it. A first property getter can mutate the command, source, owner,
target or root after a pre-call check; a second lookup can then invoke a changed
function under those changed bindings. An after-call refusal cannot undo that
extra call. Merely placing currentness checks around the existing helper does
not satisfy suppression of subsequent unauthorized calls. Reusing the helper
also allows a returned array element accessor to throw or mutate state during
classification, after the method returned but before a result is retained.

Amend the design with a concrete operation boundary: latch the request attempt
before the first method-property access; distinguish lookup from invocation;
resolve the method once inside a guarded operation; check the input and host
bindings after lookup and before invocation; invoke that captured method with
its original receiver only through a supported host invocation mechanism; and
retain the invocation outcome before any later classification/currentness
operation can throw. A host method that cannot be captured/invoked safely must
produce an explicit unsupported/unavailable refusal, without falling back to
a second unchecked lookup. Specify how classification failures retain a
returned-method outcome and suppress later calls rather than becoming a
fabricated invocation throw or disappearing result.

Define the finite host-read/currentness sequence and its limits explicitly.
After a host read, finish with plain-data input checks; cover mutations from
method-property getters as well as capability bodies and the final binding
property read. Do not promise an atomic host snapshot or unboundedly repeat
reads until a mutable wrapper happens to look stable. If the required parent,
child, root, identity or invocation semantics are unavailable, refuse honestly.
The successful plus capture does not establish these semantics for minus.
Keep the existing times/plus helper behavior isolated unless a separately
justified regression-safe change is necessary within the authorized files.

### 2. P1: Requiring seven terminal rows conflicts with preserving actual later failures

References: `max-preparation-009-design.md:34`,
`max-preparation-009-design.md:106`, `max-preparation-009-design.md:143`,
`max-preparation-009-design.md:147`,
`capture-008-minus-investigation.md:223`,
`capture-008-minus-investigation.md:286`, `controller.js:490`,
`controller.js:688`, `controller.js:772`.

Exactly seven strict diagnostics is a valid eligibility requirement for the
collection pass. It is not a valid unconditional requirement for the terminal
ACK: validation resets those arrays on each poll, and later mutations or host
errors may create missing/extra/changed hierarchy diagnostics. The instruction
that all seven final strict diagnostics remain intact can cause a worker to
restore the earlier seven rows and erase the actual terminal failure. That
contradicts the investigation's explicit requirement to retain changed later
diagnostics and mark the earlier collection stale. The design currently does
not state which rule prevails.

Amend it to require the seven-case classification only for eligibility and
for unchanged positive synthetic fixtures. The terminal existing diagnostic
arrays must always describe the actual terminal validation pass, including
new count, traversal, binding, class and geometry failures. Retain the
collection-pass binding/results in their separate envelope. Specify a
monotonic later-stale/currentness marker or separate terminal-context record
so later invalidation does not rewrite the original collection identity,
completed results, or collection-pass failure reason. Prohibit copying the
collection's seven rows back into the global terminal arrays. Add an explicit
required control where collection completes, a later pass observes a new
failure, and fail() exports both the original collection and the changed
terminal diagnostics while success remains false.

### 3. P1: The exported evidence contract and count/partial-result semantics are not exact

References: `max-preparation-009-design.md:122`,
`max-preparation-009-design.md:130`, `max-preparation-009-design.md:140`,
`max-preparation-009-design.md:174`,
`capture-008-minus-investigation.md:268`, `controller.js:299`,
`controller.js:310`, `controller.js:688`.

The new ACK envelope has no agreed field name, version, exact top-level or
nested keys, allowed state transitions, counter semantics, or required
presence conditions. Ordered targets are described but their order is not
fixed as an explicit contract. It is also unclear whether a stable unavailable
or throwing format method permits the paired value attempt and later targets,
or terminates the batch. Different reasonable implementations would produce
incompatible evidence and different meanings for a partial count while still
meeting the current prose. Calling the existing schema lossless overstates it:
other and nonfinite results collapse to a representation plus null value;
ambiguous arrays do not retain their full shape/content. That may be sufficient
classified evidence, but must be an explicit evidence boundary.

Before implementation, add an exact schema for the new optional ACK key and
all records. Freeze its version, immutable request/source/projection/helper/
owner/path binding, collection-pass identity, explicit target order, method
records, allowed statuses/dispositions, invalidation/refusal record and
counts. Define absence for never-eligible requests and required retention
once lookup/probing begins. Distinguish method lookups, actual invocation
attempts, retained outcomes and completed pairs; require every prefix to be
consistent with at most six ordered method invocations. Specify stopping or
continuing after unavailable/throwing outcomes when bindings remain current.
Define the serialized representation of a missing/unattempted method without
inventing an unavailable return for a call never attempted.

State whether classified status/representation/value is the complete evidence
contract or whether additional safe primitive type/shape/error information is
required. Never serialize arbitrary returned host objects, invoke their
conversion methods, or claim scalar/default/mode agreement from classification.
Require export from captured plain data so later host getter exceptions cannot
erase completed records. Existing ACK keys and their semantics remain frozen,
with the new field purely diagnostic and unconditional minus refusal retained.
This contract belongs in the amended design rather than being chosen later
by the worker or evidence auditor.

## Feasibility And Source Sufficiency

The nine-key immutable projection is independently reconstructible from the
specified pristine source plus the four helper identities. The investigation
provides the complete distinct Basic/full descriptor schemas, edge/endpoint
and leaf schemas, canonical ASCII escaping and normalization rules, source
size/hash, canonical size18681 and digest
`c17962fba204a882ce5b0bca6c792e55c0a4181366c7dfe0c39b28152215084e`.
It also gives all seven box/text/saved-rectangle pins and four measured live
rectangle pins. No missing raw rectangle or licensed authored string needs to
be embedded in controller source, a public report or an on-disk fixture.

The definition's six dynamic keys remain outside the projection and must be
bound separately exactly as the design requires. In particular, bind the
actual101 operation, both revision fields, owner4 and working root path rather
than treating the nine-key hash as proof of these identities. The source
reconstruction is evidence about saved source, not live cable/text observation
or wrapper stability. Parent's independently reconstructed source gate before
freeze/capture must bind installed/pristine source, immutable008 provenance,
current authorized controller/test bytes and consumed008 script identities.
No historical script execution or arithmetic/V8/lifecycle production change
is needed for this reconstruction.

The complete hierarchy gate is appropriately stricter than the offline
candidate correspondence: require root4, Basic16, empty question scope,
full20, unique retained handles, exact expected parent/named-child ownership
and only the four pinned geometry plus three pinned numeric differences.
Do not reuse `tree()` swallowing child exceptions as complete identity proof.
The collector must establish its own complete binding evidence or refuse.
Recognizing those differences for collection must never return a successful
resolve/validateTree result, emit a geometry disposition, attach observers,
bind a minus root, or advance a revision. The per-install closure must outlive
the per-poll validation pass and own its latch and export; no global historical
observation or later queued callback may reset it or transfer it to a new
request. These are achievable within controller.js/test_helpers.cjs after the
three contracts above are made concrete.

## Checks And Preservation

Read-only review inspected the frozen controller's capability helper,
validateTree aggregation, per-poll plus pass lifetime, install/refusal polling,
terminal failure ACK assembly, and the existing original synthetic Node test
harness. No controller helper was executed, no tests were run, and no private,
licensed source, defaults, mode values, program values or geometry was read or
printed for this review. This is a design/interface review, not a repeat008
evidence audit or source-test run.

SHA256 checks reproduced both supplied report/design hashes. A read-only
`python3 -B` hash-map check loaded
`preparation-008-integrated-review.json`, hashed its sixteen current source
files and confirmed equality with that map:16/16, canonical map SHA256
`4ea3e2265a3a084841b43ec43687885af9184b7629d6a0d184af6e69a7853410`.
Only this report is written. No implementation, fixture, test, private/history,
preparation, archive, runtime/native/display, delegation or commit action was
performed. Frozen readback/lifecycle/runner/policy consumers, helper execution
in Ultra, all timing/capacity limits, denominator and qualification0/2103 remain
unchanged. Parent acceptance of the final008 audit/investigation is recorded
above. Review of the amended009 design remains required before implementation.
