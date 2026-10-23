# Preparation009 Scoped Design Rereview

Verdict: PASS for the amended design within the requested rereview scope.
All three original P1 findings are ADDRESSED. No new blocking issue was found
in the amendments. This is design review only; implementation and eventual
host behavior remain unverified.

Reviewed design SHA256:
`3cc992afe3da3a5e8e7431ace0f25ace56d5662ec09ac9cb1e333f450f01b22d`.
Original review SHA256:
`69a321b0d9eb10f8024b5364700646e99ba8f48e044b2b50c7142c1515f27335`.
Design references below are to max-preparation-009-design.md in this directory.

## Original Findings

### 1. Safe capability lookup/invocation: ADDRESSED

References: design:163, design:175, design:187, design:197, design:308.

The amended contract isolates the existing times/plus helper and requires a
single guarded method-property lookup for each minus method slot. It latches
before lookup, records that outcome, checks currentness after lookup and before
invoking the captured method with its original receiver, and prohibits a second
lookup or inspection of an untrusted function's call/apply/toString properties.
A trusted captured intrinsic bridge must be used; unsupported invocation stops
the batch rather than falling back, and optional bridge initialization cannot
break times/plus startup.

The invocation outcome is retained in plain data before classification or a
later guard can throw. A throwing array classification remains a returned
invocation with classification-threw representation, preserving completed
results while stopping subsequent slots. Lookup throws, invocation throws,
unsupported invocation and classification exceptions have distinct meanings.

The finite guard now has an explicit host-read order ending with root filepath,
then exact plain-data input comparisons with no further host read in that
guard. No stability-seeking loop or atomic/simultaneous host claim is made;
unobserved changes are explicitly an evidence limitation. Tests must cover
lookup-accessor mutation, once-only lookup, unsupported bridge and returned
outcome preservation after classification failure. This resolves the original
unchecked lookup-to-invocation and result-erasure concerns. Real minus host
invocation/wrapper support remains an implementation/capture question, with
honest refusal mandated when unsupported.

### 2. Actual terminal diagnostics after later changes: ADDRESSED

References: design:151, design:237, design:270, design:306.

The seven-case requirement is explicitly restricted to collection eligibility
and unchanged fixtures. Terminal arrays must describe the actual terminal
validation pass, including changed or additional count/traversal/binding/class/
geometry failures. Copying earlier collection diagnostics back into those
arrays or forcing seven rows is explicitly forbidden.

The original collection identity, results and first stopping reason remain
separate and immutable. Later checked invalidation changes only the monotonic
terminal_context stale marker and its first_invalidation record. Export uses
captured plain data without host reads; even a throwing terminal guard cannot
erase the envelope or replace the actual terminal arrays. A queued callback
cannot mutate a previously exported record or reset the request latch. The
new required completed-collection/changed-later-hierarchy control exercises
this separation directly. There is no remaining conflict between preserving
earlier evidence and reporting new terminal failures truthfully.

### 3. Exact ACK schema and partial-result/count semantics: ADDRESSED

References: design:204, design:219, design:228, design:243, design:250,
design:261, design:270.

The optional key is frozen as minus_numeric_preflight_diagnostic, version
minus-controller-diagnostic-v1, with exact binding, collection, methods,
counts and terminal_context records. The binding includes the original exact
command and owner records, the source projection/helper identity and canonical
snapshot digests. Collection poll identity, eligible-pass diagnostic digest,
complete/stopped status and the immutable first_failure record are specified.

All six method slots have an explicit target/method order and fixed key sets.
Lookup status, invocation status, untouched trailing slots and unavailable/
throwing/unsupported results are distinguished. Stable unavailable methods or
lookup/invocation throws may continue only when currentness passes; guard
failure, an unsafe bridge or classification exception stops the batch.

Counters now distinguish lookups, actual bridge invocations, retained invocation
outcomes and completed guarded pairs. Their prefix, equality and maximum-six/
maximum-three constraints include throwing and classification-threw outcomes.
No skipped invocation is fabricated as a return. Required envelope retention
begins when the first lookup starts, while never-eligible requests omit it.

The design accurately names the evidence classified rather than lossless:
only finite numeric representations retain a numeric value; other shapes carry
null plus an explicit representation, without exporting arbitrary object or
exception content. Plain-data export and immutable results survive later host
exceptions. These are sufficient design-level semantics for implementing and
reviewing a bounded diagnostic envelope without inventing capability,
source-default, mode or admission evidence.

## Amendment Breakage Check

No new scope expansion or conflict was found. The diagnostic collector remains
owned by one install closure across existing polls; its attempted latch cannot
reset after a partial batch or transfer to another request. A completed batch,
unavailable/throwing method or apparently useful numeric result cannot make
minus install succeed. The exact101/minus-r1/owner4 trigger, complete source/
hierarchy gate, source projection and separate dynamic bindings remain intact.
The new invocation and result handling does not authorize geometry/class
policies, source/default rewrites, observer attachment or successful binding.

The nine-key projection remains independently reconstructible as assessed in
the original review. The amended text records the accepted008 audit,
investigation and parent verification hashes. Capture008 remains FAILED/
incomplete. Successful plus evidence does not establish minus wrapper stability.
Timing/capacity, all other source consumers and qualification0/2103 remain
unchanged. Runtime support for the safe bridge and complete host identity reads
must be demonstrated or refused in the eventual separately reviewed capture.

## Verification And Boundaries

Read-only sha256sum confirmed the amended design's supplied SHA256. A
`python3 -B` read-only source-map check reproduced16/16 unchanged current source
files and canonical map SHA256
`4ea3e2265a3a084841b43ec43687885af9184b7629d6a0d184af6e69a7853410`.
The original design review SHA256 was also reproduced. No tests, controller
helpers, source reconstruction, runtime/native/display, private evidence access,
preparation, archive, delegation or commit actions were performed. Only this
rereview report was written. This PASS resolves the three design findings;
it makes no implementation, target capability, successful capture or
qualification claim.
