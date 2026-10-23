# Preparation010 Independent Design Review

Verdict: PASS for design acceptance. No blocking design finding. Implementation,
source review, fresh preparation and concrete review remain separate gates;
this verdict does not authorize a launch or establish a timeout fix.

## Reviewed Bindings

SHA256 values independently reproduced from current bytes:

| Input | SHA256 |
| --- | --- |
| max-preparation-010-design.md | ca16153b8ccf1911d32ade6cb799026e251216578bbdf5398ac712a6592e229e |
| controller.js | 0447c587e09f9eb26ea2bf798d22c32714386baa747d1e73f92f385d5b8ce571 |
| test_helpers.cjs | 12d1532a645cb975013e3556488c7613080cdf8f62011bd9f4760c32b5f37f4d |
| max-preparation-009-design.md | 3cc992afe3da3a5e8e7431ace0f25ace56d5662ec09ac9cb1e333f450f01b22d |
| preparation-009-design-rereview.md | a337fdd4cb15e2fc469fd736d2f873eaa51f13e70b50ed5380fdcf932b46d7b4 |
| capture-009-missing-ack-investigation.md | 813c3a1560e10c68db5b902e5ae3f48ffc0b2779d2d5af24647c67daaedacfbb |

Source references are to experiments/max-reference/arithmetic-roots-runtime-20261022/.
Design references are to max-preparation-010-design.md in this directory.

## Findings And Implementation Review Conditions

No design revision is required. The following are concrete implementation
review conditions under requirements already present in the design, not scope
expansions or reasons to postpone implementation:

1. Preserve the distinction between invalid eligibility and changed retained
   binding (design:122; controller.js:491). Currently sample() rejecting an
   invalid class/name/rectangle/ownership yields guard-threw. A successful
   source-eligible sample with changed ordered handles/data yields
   binding-changed. Returning one generic mismatch code from a new direct
   comparator would change first-failure evidence. Add original controls for
   an eligible inventory reorder or same-shape wrapper replacement versus an
   ineligible class/rectangle/name mutation. Verify both collection and later
   first-invalidation meanings, including preservation of earlier outcomes.
   The design's explicit failure-code preservation clause covers this; it
   must be exercised beyond old tests that assert only stage/stale.

2. Compare the complete JSON data domain without normalizing later invalid
   input (design:46,59,143; controller.js:431). Owned parsed snapshots make
   structural comparison sound, but checking values alone or iterating only
   expected array indices can miss absent fields or array expandos. Inspect
   the implementation's key-presence/type/length checks, recursion bound and
   cycle failure, and test the listed malformed data after source-cache
   success. Retain positive controls for reordered object keys, finite numeric
   equivalence and negative zero. Initial canonical strings remain the digest
   authority; never substitute a newly serialized current object or a live
   object reference. The explicitly required fail-closed treatment of invalid
   non-JSON additions is stricter than incidental old array serialization,
   and is not a source-policy relaxation.

3. Assert ordered fresh reads as well as totals (design:107,133,141;
   controller.js:441). Counts alone cannot detect exchanging or moving reads
   across a guard boundary. The trace oracle should include method-property
   access and invocation for getboxattr/subpatcher/getnamed, rectangle element
   reads, nextobject, empty-child firstobject, and root filepath as the last
   host read. Recursion occurs before the containing object's nextobject read.
   Root does not acquire an extra box/parent read merely because child scopes
   have those checks. Stable traces must agree with009; fail-closed exits may
   truncate reads under the design but cannot add capability calls. Instrument
   canonicalization depth so nested traversal of the definition/owner within
   configuration is not mislabeled as a separate top-level serialization.

## Soundness Assessment

The equality change is sound for accepted plain inputs: canonical JSON is
captured once before host access, separate owned plain authority is derived
from those exact bytes, all four complete current inputs are compared at every
existing sameInputs point, and the original configuration/action/array/
lifecycle/owner/definition identity checks remain. Strict number-versus-boolean
identity, array order and field presence prevent projection-only equivalence.
The comparison still follows the final filepath read. This is a finite
observation, with no new atomicity claim.

Source validation caching is authorized by exact immutable equality, not by
poll count or a previous host outcome. The unchanged full source predicate
must succeed, then full equality must succeed again before its success is
cached. Each reuse requires full current equality and original identity. A
failed host sample or incomplete seven-row diagnostic set remains ineligible
and must be sampled again. The cache is collector-local and does not grant
numeric capability, admission or ownership to another request. Keeping the
predicate, pins and hash primitive frozen makes the later real-source
reconstruction an effective independent binding gate.

The first host sample retains the source bijection and seven diagnostic
checks. Direct equality to that owned eligible binding is sufficient for
later unchanged guards: exact primitive rectangles, classes, names, ordered
objects/scopes and wrapper/parent/child identities preserve the established
mapping without repeating hashes. Full fresh traversal remains necessary,
including nonchild subpatcher calls and empty question scope ownership. All
three per-slot guards, nonterminal later guards and terminal guard remain.
Once-only captured method lookup/invocation, classification, partial counts,
first failure, monotonic stale context and immutable export remain normative
under009. Actual terminal diagnostics are still independent of collection
diagnostics, and minus still refuses unconditionally.

The work budgets target removable computation without permitting dropped host
observations. The stable 63-hash target is the unchanged43 source validations
plus20 first-sample runtime hashes; subsequent guards need no rectangle hashes
when their exact retained comparisons succeed. The ineligible root case
independently exercises source-cache reuse before any eligible batch, where
stable-path once-only source validation alone would provide no regression
signal. New RED assertions must fail on009 through install/poll/fail behavior,
not missing new symbols. Existing007/008/009 tests remain unchanged and must
pass, alongside exact envelope/digest/terminal comparisons.

## Focused Verification

Read-only inspection covered the complete010 design, normative009 design and
rereview, missing-ACK investigation, current collector/source predicate,
install/poll/fail integration, and current009 synthetic fixture and controls.

Four original synthetic install executions were performed in two inline Node
processes. Only fixture/helper definitions were extracted into memory from
the current test file; the full test suite and historical code were not run.
Each process ran one stable and one root-ownership-ineligible fixture against
the current controller, with in-memory counting wrappers. The second process
isolated top-level canonical calls from nested traversal. No benchmark or
fixture artifact was written. Results:

| Observable | Stable70poll | Ineligible root |
| --- | --- | --- |
| Source predicate calls | 1 | 70 |
| Top-level command canonicalizations | 91 | 71 |
| Top-level definition canonicalizations | 91 | 71 |
| Top-level configuration canonicalizations | 91 | 71 |
| Top-level owner canonicalizations | 91 | 71 |
| Geometry hashes | 1823 | 3010 |
| Total getboxattr rectangle reads | 20820 | 19040 |
| Root filepath reads | 159 | 70 |
| Capability calls | 6 | 0 |
| ACK success | false | false |
| Optional envelope present | yes | no |

Stable89 collector samples also follow from the code's one eligibility sample,
18 collection guards,69 nonterminal later guards and one terminal guard.
These results substantiate deterministic RED baselines only. No actual Max
latency, internal009 progress or prospective010 throughput was measured.

## Evidence And Scope Limits

Capture009 remains FAILED/incomplete:52 accepted times/plus operations,
request101 missing ACK, unknown internal Max progress and no proven timeout
cause. No accepted minus result or qualification increment follows from this
review. All six whole-capture flags remain false and qualification is0/2103.

The design preserves timing, capacity, policies, external consumers, licensed
source/evidence boundaries, all original obligations and parent launch/cleanup
ownership. Existing consumed009 work must not be reused. This review did not
access private source graphs or private daemon state, reconstruct licensed
data, mutate private evidence, run Max/native/display/REA, prepare/archive,
delegate, or make git changes. Only this review report was created. Parent
retains responsibility for the independent private inventory and later
freshness/concrete gates.
