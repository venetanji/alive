# Int/float automatic freebang close proof: design only

Date: 2026-10-22. Status: design approved by parent with bounded-convergence
amendment; implementation and a new runtime capture remain separate work.
This note changes no runtime package, source copy, preparation, score, or public
schema. Capture006 and the controller transport correction remain frozen.

Frozen implementation review amendments: the independent validator must bind
every later close/barrier history to the exact previously accepted private
ACK/root proofs. The finite score requires float-r1 then int-r1, so missing
predecessors cannot be concealed by dropping their history or files. Revalidate
prior proof semantics and raw bindings, then compare report prefixes with strict
JSON types. Failure cleanup must also gate public close claims on independent
acceptance; it cannot export a controller-only positive completion after Python
refuses. The successful public schema and finite score stay unchanged.

## Evidence and intended claim

Capture006 retained all 31 close snapshots. The float owner root's `.valid`
was `undefined` before disposal and in every poll. The reader, disposer, all
23 original Basic Maxobjs, and the retained firstobject wrapper changed from
numeric 1 to numeric 0. Window information remained visible. Those observations
establish invalidity of those objects, but do not establish destruction of the
top-level owner. An unavailable `Patcher.valid` must never count as false.

The API assessment in `int-float-close-api-assessment.md` identifies the
supported additional evidence: `freebang` automatically outputs a bang when
its patcher is freed. It also accepts a manual bang and can be double-clicked,
so an unqualified observed bang is insufficient. The proposed acceptance claim
is limited to the positively bound owned root entering its documented freeing
phase, together with invalidity of its retained owned Maxobjs. This does not
enumerate all roots, establish absence of unrelated roots, or use window
visibility as destruction evidence.

## Recommended route and alternative

Use this private route for each document/revision owner:

```text
owner root:  freebang -> send <private channel>
driver:      receive <same channel> -> dedicated inlet of lifecycle V8 observer
```

The smallest shared driver design is four receivers, one per int/float revision,
and one V8 lifecycle observer with four dedicated event inlets plus a reserved
control inlet. Logical owner N maps to physical event inlet N+1; physical inlet
0 accepts guarded control methods only. The sealed preparation
maps each channel and inlet to exactly one owner. The existing driver controller
remains separate. Each owner gains exactly two root objects. The receiver and
observer must exist, pass verification, and be monitoring before the owner route
is connected. Neither new owner object is inside Basic.

A root-local observer removes the send/receive hop, but its callback receiver or
file writer can be destroyed before it records the root's freebang. Documentation
does not establish an ordering that makes that implementation dependable. It
must not be the sole acceptance witness. A driver observer survives owner
teardown and can continue detecting duplicates or stale events. Runtime failure
to deliver a top-level freebang through this route must refuse close; it must
not fall back to object invalidity alone.

## Binding and actual route proof

Preparation generates a fresh high-entropy channel for each of the four owners.
The sealed private configuration binds capture identity, exact document,
revision, prepared owner path, source digest, channel, driver inlet, observer
helper digest, and expected harness inventory. Channels are unique across this
capture and disjoint from every named send/receive symbol in the original source
trees and score. No channel is reused on reinstall. Do not publish channel text
or private configuration contents.

The existing exact source-tree preflight still runs before instrumentation.
Additional verification accounts for the exact root additions and exact driver
inventory; it introduces no generic inventory exclusion. Original boxes,
incident cables, and source copies stay unchanged. Basic inventory continues
to include exactly the current original boxes and current outlet-observer
leaves. All modes, geometry, numeric policy, and leaf counts remain unchanged.

Verify the following from actual Max objects and actual patchcord collections,
not from the intended creation commands or saved JSON alone:

- The owner's freebang is the exact new root object of class `freebang`, with
  zero incoming patchcords and exactly one outgoing connection from outlet 0 to
  inlet 0 of that owner's private send.
- The send is the exact new root object of class `send`, with precisely that
  incoming connection and no outgoing connections. Its actual creation text
  names the sealed channel exactly, without substitution or extra arguments.
- The driver receiver is class `receive`, names exactly the same channel,
  has zero incoming patchcords, and has exactly one outgoing connection from
  outlet 0 to the assigned observer inlet. In particular there is no `set`
  input route that can rename it.
- The driver observer is the exact sealed V8 helper instance, has exactly the
  four declared event inlets and one control inlet, no output routes, and no extra incident connections.
  All four receiver channels and inlet assignments are checked together.
- Expected scope, varname, class, instance count, harness geometry, and
  duplicate-sensitive patchcord endpoint multisets match. Endpoint identity is
  resolved against the enumerated exact objects rather than relying on JavaScript
  wrapper equality. No original object has an incident route to this harness.

`Maxobj.boxtext` is documented for V8 only. Do not use it from the legacy `js`
controller. The existing owner V8 reader should produce a readonly private
root-route proof immediately before close, using actual `boxtext` and
`patchcords.inputs/outputs`; the driver V8 observer verifies its actual local
receiver routes. Neither `send` nor `receive` has a documented channel-name
attribute on which this design relies. Do not substitute assumed
`getattr("name")` reads. If the actual V8 APIs cannot expose exact runtime
channel text or route endpoints, refuse this proof capability.

Box text is evidence of exact object text, not a documented getter for the
receiver's internal active name. The sealed helper audit must prohibit every
`receive.set`, retyping, scripting replacement, and channel mutation after
creation, including between attestation and disposal. The observer declares
and self-reports five physical inlets and zero outlets; do not assume generic
`getattr("numinlets")` or `getattr("numoutlets")` attributes. Actual patchcord
inventory still checks all incident routes. Receipt of the eligible automatic
bang supplies the runtime delivery observation in addition to construction,
text, and topology evidence.

A possible alternative is a unique non-bang admission challenge sent directly
to the injected send before arming, requiring its exact assigned receiver and
all other receivers silent. It must never enter freebang, become a witness, or
reach an original object. That could establish causal routing without a name
getter, but adds a notification phase and explicit direct-send control path.
The recommended smallest design omits this challenge and uses V8 proof, the
audited prohibition on mutation, and the actual automatic event instead.

The root-route read is an internal part of the existing close action, not a new
score action or checkpoint. It uses the existing reader's private request and
raw-result mechanism with a distinct proof kind and matching close request ID.
Its full raw bytes and metadata must be retained and bound to the close ACK.
The driver route proof is also included in the private observer evidence. Python
validates both against sealed preparation and exact endpoint sets. No helper
arguments or source bodies need be included in public evidence.

## Automatic provenance and observer state

There is no authored manual bang, double-click, or direct send to freebang,
send, receiver, or observer's event inlet. No code path in the sealed helpers
invokes any of those objects to synthesize a lifecycle event. The runner makes
no UI interaction with the added objects; they are placed outside the visible
working area. If an additional click-suppression box attribute is used, its
documented behavior and actual readback must be verified rather than assumed.
These are provenance guarantees for the controlled capture, not protection
against an unrelated adversarial process that learns a channel and injects it.

Internal helper functions and state are enclosed in an IIFE so arbitrary Max
selectors cannot call transition, persistence, or file helpers. Only guarded Max
callbacks and the guarded control method are global. Control methods reject
event inlets; bang/nonbang on the control inlet refuses. Unknown selectors
record sticky unexpected input.

The lifecycle helper is independent of `observer.js` and never appends a scoring
receipt. Each dedicated inlet accepts exactly a bang as a lifecycle event and
records the inlet-derived owner identity. An event cannot supply or override
its own owner metadata. Non-bang input is a sticky provenance failure. Control
methods use explicit selectors and a separate direct controller method call;
they do not send a bang through an event inlet or receiver.

For each owner, the private state progresses through monitoring, armed,
dispatch-started, witnessed, and close-validated. A single monotonic event
sequence covers the four owner states. The controller:

1. Checks matching owner/source/path/revision and a fresh complete root proof;
   obtains a fresh driver route proof and confirms no prior lifecycle event.
2. Arms exactly the pending close request. Arming binds the request ID and
   immutable owner map; it does not itself create a witness.
3. Marks the single disposal dispatch as starting, then sends `dispose` exactly
   once to the retained, valid, positively bound root `thispatcher` object.
4. Records nonthrowing dispatch completion, retains all 30 timed poll samples,
   and obtains the final driver observer report after those polls.
5. Accepts only one bang for that owner after dispatch-start and before the
   final close report. Its binding and route proof must match the pending close.

The event may occur synchronously inside the disposal call; do not require it
to follow dispatch return. Capture006's function-typed method return is not a
failure by itself. A thrown dispatch fails. Early events, duplicate events,
events from a different owner while this close is armed, stale notifications
from a previously closed revision, unexpected control transitions, or any
attempt to rearm/reuse a request produce a sticky refusal. Do not reset or
discard that failure while advancing the score. A witness already present
before arming cannot be relabeled as a response to the current close.

Keep monitoring closed revision-1 channels through an explicit final capture
barrier. Revision-2 roots remain loaded at the end of this score; their later
freebangs during owned cleanup are outside the scored lifetime. At the final
barrier, require exactly the expected revision-1 witnesses, no additional event,
and no witness for either live revision-2 owner, then seal the observer evidence.
Only after that boundary may cleanup notifications be classified separately.
They can never become score-close witnesses or repair a refused close. Any
unexpected event before that boundary invalidates the run even if an earlier
close ACK already passed. The runner must validate the barrier before publishing
a complete ledger.

## Supported close conjunction and unchanged diagnostics

Keep every existing typed diagnostic member and all 31 samples: before disposal
plus 30 polls at the current interval. Preserve root validity, firstobject,
window, reader/disposer, and every original Basic handle reading, including
unavailable/throwing read distinctions. Root `.valid` can remain `undefined`;
it is a diagnostic, never the replacement proof. Do not require a window to
disappear or treat its persistence as evidence either way.

Additionally retain typed validity readings for the two new owner-root harness
Maxobjs. The required actual invalidity set is the retained original Basic
handles, reader, disposer, freebang, and send. All must be positively valid
before dispatch. Every poll must have primitive boolean or numeric 0/1 validity
readings. Allow true/1 while teardown is pending; all required handles must be
false/0 by the final poll, with no revival after the first jointly invalid
sample. An initially live post-disposal sample can reflect asynchronous
teardown; it does not authorize acceptance. Missing, throwing, unavailable,
nonfinite, or other typed validity values refuse. Preserve the current root firstobject getter and validity diagnostics unchanged.
Separately retain the positively valid first Maxobj before disposal and add
`retained_firstobject_valid` to all samples as another required convergence
handle. An unavailable before handle refuses capability; later getter null or
a different wrapper cannot replace that retained handle. Do not promote a stale
wrapper's mere existence into validity. Driver receivers/observer must remain
valid at route proof, final close report, and final barrier, since they survive
the owner and are needed to observe later events.

The proposed supported conjunction is: exact ownership and fresh route proof,
single nonthrowing disposal dispatch, exactly one eligible automatic freebang
witness, and the required owned Maxobj invalidity. No witness plus invalid
handles still refuses. A witness plus any live required handle also refuses.
No postcondition depends on top-level `Patcher.valid`, window enumeration, or
the disposal call's return type. Continue all polls even when invalidity and the
witness appear early, preserving full diagnostics and the duplicate-detection
window. A capability unavailable in the real runtime is a retained refusal,
not a reason to weaken this conjunction.

## Private evidence and independent Python gate

Keep lifecycle notification data out of `private-journal.jsonl` and all existing
public receipts. Put the observer report in a separate private lifecycle field
of the close ACK, with the close request binding, complete ordered transitions,
all observed inlet events, sticky failures, and driver route proof. Bind the
private owner-reader proof's raw path/hash/size in that ACK. The existing
exclusive raw-ACK retention binds the report's exact bytes; there is no new
public witness schema. If a separate observer result file is needed by the
implementation, retain it exclusively and bind its exact bytes/hash/size in
the ACK as well, rather than copying a summary into the scoring journal.

The proposed exact private ACK addition is
`close_diagnostics.lifecycle_evidence`, versioned as `freebang-v1`, with these
required members (all remain private):

- `version` and `binding`: capture ID, close request ID, score step/action,
  document, revision, exact owner path, source digest, and sealed helper/map
  identity. The controller's existing diagnostic binding remains intact.
- `root_route_path` and `root_route_proof`: bound private reader-proof path and
  full parsed proof, including request/version/owner identity, exact original
  root inventory and four additions, and duplicate-sensitive actual endpoints.
  Python reads the raw file, checks parsed equality with this ACK-bound object,
  retains exact bytes exclusively, and computes hash/size in separate private
  validator evidence. No Max cryptographic API is assumed.
- `driver_route_proof`: actual receiver/observer inventory, V8 box text,
  channel-to-inlet map, declared inlet/outlet configuration, exact connections,
  and driver Maxobj validity readings.
- `observer_report`: monitor epoch, monotonic report sequence, ordered control
  transitions and inlet events, derived per-owner states, and sticky failure
  codes. Each event has its sequence, inlet, inlet-derived owner identity,
  payload kind, and armed request identity; no event may override the owner.
Dispatch evidence is folded into exactly one observer `dispatch-start` and
`dispatch-return` transition plus the existing typed dispose diagnostic.
Synchronous events can lie between those transitions. The same observer
sequence orders all control/event markers without comparing helper clocks.

The exact final barrier report is a separate retained private result of the
existing capture completion path, using the same observer report version and
sealed binding. It is not a new score operation or public receipt. Its raw
hash/size are retained with the private completion evidence. Unknown fields in
these strict private proof structures should refuse unless a versioned schema
explicitly permits them.

After retaining raw ACK bytes, `run-runtime.py` must call a strict independent
Python validator before trusting `closed_owner_absence_validated`, accepting
the action's journal bracket, projecting receipts, or advancing the ledger.
The validator checks sealed config/helper/source binding, exact request and
owner identity, retained raw proof digests and sizes, actual route topology and
channel pairing, complete typed sample coverage, valid-before/invalid-after
conditions, observer event/control ordering, single dispatch, event count,
timing within the close interval, and the absence of sticky failures. It rejects
missing or unknown proof versions and inconsistent duplicate fields. It does
not merely check a controller boolean or a helper's `passed` flag.

The public boolean is true only when the controller conjunction and independent
Python validation both pass. Existing public schemas, comparator, score,
54 operations, 102 checkpoints, 612 numeric states, six numeric UI getters,
four float modes, original geometry, and 13 score bus actions stay unchanged.
The final private barrier is independently validated before final publication.

## Implementation acceptance tests after approval

Meaningful fixtures should cover these cases before a new runtime preparation:

- Positive close with top-level `Patcher.valid` omitted, matching capture006's
  capability, succeeds only with an eligible driver-observed witness and every
  required owned handle invalid by the final poll without revival after the
  first jointly invalid sample. Delayed convergence succeeds; revival refuses.
- Identical invalidity without a witness refuses; a witness with a live required
  handle refuses; missing/throwing typed reads refuse. All cases retain 31
  samples and their original diagnostic fields.
- Early, duplicate, stale, cross-owner, wrong-inlet, and non-bang notifications
  refuse. Synchronous notification during disposal is accepted with correct
  ordering; disposal throw or repeated dispatch refuses.
- Root/driver channel mismatch, assumed channel attributes, duplicate routes,
  extra input to freebang/receive, wrong endpoint or class, extra harness object,
  stale proof request, and source/path/revision tampering refuse. V8-only
  channel verification is exercised explicitly.
- Python refuses a forged true boolean, missing raw proof bytes, altered
  hash/size, inconsistent transition sequence, incomplete samples, or an
  otherwise valid ACK with a mismatched private observer report.
- The final barrier rejects stale revision-1 and early revision-2 events;
  separately classified post-barrier cleanup events never authorize a close.
- Full-size private ACK/proof payloads survive the corrected JSON transport;
  existing score/public-schema/comparator and source-preservation checks pass.

The exact nested implementation contract is frozen in
`int-float-freebang-protocol.txt`. Retention metadata and the final barrier
request remain private; the existing 156 public score/readback command records
keep their count and shape. `monitor_epoch` identifies one-use prepared work and
is distinct from the runtime process-ownership capture marker. Sealed config
is never rewritten to inject runtime identity.

No code, tests, preparation, Max launch, or capture is supplied by this design
note. The parent approved this mechanism for bounded harness implementation,
with no admission challenge and the bounded-convergence rule above. A future
controlled capture must establish
that the documented notification is delivered through this exact route in
the installed runtime before any positive close claim can be made.
