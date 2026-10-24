# Task 11 Native Clip Interface Design

Status: proposed interface freeze, 2026-10-24; design only. Task 11 is not
implemented and eight tracks are not admitted. This follows current PLAN Tasks
11-14 and `task-10-reconciliation.md`, against reviewed native Task 7 `920bdc6`.
Task 12 consumes this interface after its implementation/review. Task 13 enables
capacity only after measurement; Task 14 enables atomic multi-track actions.
The final 30-minute app soak belongs to Task 15 in the current PLAN.

## Scope And Fixed Decisions

One new v3 ABI has structural storage for eight tracks, sixteen devices, four
slots/track and 32 clips. Initially its only admitted profile is 2 tracks / 6
devices / 8 clips. Counts may be below those maxima, with at least one track.
Retain two effects/track, sixteen parameters/device, 128 notes, sixteen lane
records and 256 points/track across stored clips, 1024 stored events, 32 events
per frame, 64 in every half-open 1024-frame window, and 64 queued commands per
native callback snapshot. Root count remains sixteen independently of profile.
All limits apply together. No redundant v4, second score schema, DSP owner or
evaluator is introduced. Task 12's only new saved format is alive-session-v3.

Do not raise event storage/density to fit a fixture or move authored events.
Eight simultaneous triads plus two automation points/track are 40 events and
must reject the 32/frame cap. Chased values and hard-clear work count separately,
not as fictitious scheduled events. Capacity fixtures must include useful legal
material and matching over-limit refusal cases.

Preparation, graph/value validation, admission, installation and destruction
remain stopped/off callback. Individual launch changes bounded cursors and
track state only. Base/bypass keep the existing document/revision APIs; mixer
keeps its existing API. The native sample clock and full existing reset semantics
remain; narrow reset optimization requires measured need and separate review.

## Proposed Exact C Additions

Append these declarations after unchanged v1/v2 definitions in alive_session.h.
All enums are constants; fields use fixed-width integers, never C enum storage.
The `NONE` value is UINT32_MAX. Every output record with a header requires the
caller to initialize its exact version and byte size. Invalid header/null output
returns 0 without writing. All other return/failure meanings follow the text.

```c
enum {
 ALIVE_SESSION_V3_VERSION=3,
 ALIVE_SESSION_V3_TRACKS=8, ALIVE_SESSION_V3_DEVICES=16,
 ALIVE_SESSION_V3_CLIPS=32, ALIVE_SESSION_V3_SLOTS=4,
 ALIVE_SESSION_V3_RECEIPTS=128,
 ALIVE_SESSION_V3_PROFILE_2X4=1, ALIVE_SESSION_V3_PROFILE_8X4=2,
 ALIVE_SESSION_V3_WORK_POLICY_1=1
};
#define ALIVE_SESSION_V3_NONE UINT32_MAX
#define ALIVE_SESSION_V3_NO_FRAME UINT64_MAX
enum {
 ALIVE_SESSION_V3_START=1, ALIVE_SESSION_V3_SEEK=2,
 ALIVE_SESSION_V3_TRACK_ACTIONS=3
};
enum {
 ALIVE_SESSION_V3_NO_ACTION=0, ALIVE_SESSION_V3_LAUNCH=1,
 ALIVE_SESSION_V3_TRACK_STOP=2
};
enum {
 ALIVE_SESSION_V3_RESULT_EMPTY=0, ALIVE_SESSION_V3_QUEUED=1,
 ALIVE_SESSION_V3_PENDING=2, ALIVE_SESSION_V3_APPLIED=3,
 ALIVE_SESSION_V3_REJECTED=4, ALIVE_SESSION_V3_SUPERSEDED=5,
 ALIVE_SESSION_V3_CANCELED=6, ALIVE_SESSION_V3_MIXED=7
};
enum {
 ALIVE_SESSION_V3_OK=0, ALIVE_SESSION_V3_BAD_HEADER=1,
 ALIVE_SESSION_V3_BAD_PROFILE=2, ALIVE_SESSION_V3_BAD_FIELD=3,
 ALIVE_SESSION_V3_BAD_OWNERSHIP=4, ALIVE_SESSION_V3_STALE_PREPARATION=5,
 ALIVE_SESSION_V3_STALE_REQUEST=6, ALIVE_SESSION_V3_QUEUE_FULL=7,
 ALIVE_SESSION_V3_RECEIPT_BUSY=8, ALIVE_SESSION_V3_EMPTY_SLOT=9,
 ALIVE_SESSION_V3_EVENT_FRAME_LIMIT=10,
 ALIVE_SESSION_V3_EVENT_WINDOW_LIMIT=11,
 ALIVE_SESSION_V3_WORK_LIMIT=12, ALIVE_SESSION_V3_STOP_CANCELED=13,
 ALIVE_SESSION_V3_END_CANCELED=14, ALIVE_SESSION_V3_FEATURE_DISABLED=15,
 ALIVE_SESSION_V3_RUNTIME_INVARIANT=16,
 ALIVE_SESSION_V3_GRAPH_REJECTED=17,
 ALIVE_SESSION_V3_REPLACED_REQUEST=18
};
enum {
 ALIVE_SESSION_V3_RESOURCE_NONE=0, ALIVE_SESSION_V3_RESOURCE_EVENTS=1,
 ALIVE_SESSION_V3_RESOURCE_ROOT_CLEARS=2,
 ALIVE_SESSION_V3_RESOURCE_EVENT_SCANS=3,
 ALIVE_SESSION_V3_RESOURCE_PARAMETER_WRITES=4,
 ALIVE_SESSION_V3_RESOURCE_GUARD_STEPS=5
};
enum {
 ALIVE_SESSION_V3_FEATURE_ADMITTED=1,
 ALIVE_SESSION_V3_FEATURE_ATOMIC_TRACK_ACTIONS=2
};

typedef struct AliveSessionTrackV3 {
 AliveSessionTrackV2 chain;
 uint32_t slots[4], initial_clip, reserved;
} AliveSessionTrackV3;

typedef struct AliveSessionClipV3 {
 uint32_t track, event_begin, event_count, lane_count;
 uint64_t length_frames;
 uint32_t owned_masks[16];
} AliveSessionClipV3;

typedef struct AliveSessionConfigV3 {
 uint32_t version, struct_bytes, profile, work_policy;
 uint32_t track_count, device_count, clip_count, event_count;
 uint32_t loop_enabled, reserved;
 uint64_t preparation_revision, length_frames;
 double tempo_bpm;
 AliveSessionTrackV3 tracks[8];
 AliveSessionDeviceV2 devices[16];
 AliveSessionClipV3 clips[32];
 AliveSessionEventV2 events[1024];
} AliveSessionConfigV3;

typedef struct AliveSessionTrackActionV3 {
 uint32_t action, slot;
} AliveSessionTrackActionV3;

typedef struct AliveSessionRequestV3 {
 uint32_t version, struct_bytes, kind, track_mask;
 uint64_t preparation_revision, request_serial, position, reserved;
 AliveSessionTrackActionV3 tracks[8];
} AliveSessionRequestV3;

typedef struct AliveSessionReceiptV3 {
 uint32_t version, struct_bytes, status, error;
 uint64_t preparation_revision, request_serial, observed_frame, target_frame;
 uint32_t kind, track_mask, pending_mask, applied_mask;
 uint32_t superseded_mask, canceled_mask, rejected_mask, reserved;
} AliveSessionReceiptV3;

typedef struct AliveSessionWorkV3 {
 uint64_t root_clears, event_scans, parameter_writes, guard_steps;
} AliveSessionWorkV3;

typedef struct AliveSessionLimitsV3 {
 uint32_t version, struct_bytes, profile, work_policy;
 uint32_t features, max_tracks, max_devices, max_clips;
 uint32_t max_events, max_frame_events, max_window_events, window_frames;
 uint32_t max_commands, max_receipts, reserved0, reserved1;
 AliveSessionWorkV3 scheduled_frame, scheduled_window;
 AliveSessionWorkV3 optional_frame, optional_window, emergency;
} AliveSessionLimitsV3;

typedef struct AliveSessionDiagnosticV3 {
 uint32_t version, struct_bytes, error, resource;
 uint32_t track_mask, conservative, window_frames, reserved;
 uint64_t frame, observed, limit;
 uint32_t clip[8], contribution[8];
} AliveSessionDiagnosticV3;

typedef struct AliveSessionTrackStateV3 {
 AliveSessionTrackStateV2 mixer;
 uint32_t active_clip, pending_action, pending_clip, reserved;
 uint64_t phase, track_epoch, pending_serial, pending_frame;
} AliveSessionTrackStateV3;

typedef struct AliveSessionStateV3 {
 uint32_t version, struct_bytes, configured, playing;
 uint32_t profile, work_policy, track_count, device_count;
 uint32_t clip_count, fault, fault_resource, reserved;
 uint64_t absolute_frame, position, generation, rejected;
 uint64_t preparation_revision, last_consumed_request;
 uint64_t requested_stop_epoch, applied_stop_epoch;
 uint64_t work_rejected, event_faults;
 double peak_left, peak_right;
 AliveSessionTrackStateV3 tracks[8];
 AliveSessionDeviceStateV2 devices[16];
 AliveSessionReceiptV3 receipts[128];
} AliveSessionStateV3;

int alive_session_limits_v3(uint32_t profile, AliveSessionLimitsV3*);
int alive_session_validate_v3(const AliveSessionConfigV3*);
int alive_session_validate_prepared_v3(const AliveSessionConfigV3*,
                                      const UltraCanvasGraph*, uint32_t count);
int alive_session_configure_v3(const AliveSessionConfigV3*);
int alive_session_request_v3(const AliveSessionRequestV3*,
                             AliveSessionReceiptV3* immediate);
uint64_t alive_session_stop_v3(void);
int alive_session_state_v3(AliveSessionStateV3*);
int alive_session_diagnostic_v3(AliveSessionDiagnosticV3*);
```

`limits_v3` returns the registered policy for a known profile, including disabled
profiles with features=0; unknown profiles return 0. Numerical measured work
ceilings are internal registered policy, not caller-set config values. A profile
is not admitted until its nonzero measured policy is registered. Eight-track
storage/definitions may exist while FEATURE_ADMITTED remains zero. Task 14 sets
FEATURE_ATOMIC_TRACK_ACTIONS after its gate, without changing layouts. Unknown
work_policy rejects; callers cannot select larger arbitrary limits.

Expected 64-bit sizes for these field orders are TrackV3=56, ClipV3=88,
ConfigV3=47232, TrackActionV3=8, RequestV3=112, ReceiptV3=80, WorkV3=32,
LimitsV3=224, DiagnosticV3=120, TrackStateV3=88 and StateV3=16592.
Design verification: the declarations above were compiled from stdin with
C++17 `-fsyntax-only`, including the current native header and eleven size
static_asserts; all passed on this 64-bit host. No object file was produced.
This verifies declaration arithmetic only, not implementation or Rust layout.
Confirm every size, alignment and important offset with compiled C++ and Rust
tests; these arithmetic expectations do not override actual target ABI layout.
Arrays are inline and immutable after configuration; there are no C pointers
retained from a caller. Large validation/config/state scratch belongs to bounded
control-owned storage, not an accidental callback stack allocation.

## Validation And Task 12 Mapping

Native receives frames, not a second beat-based score. Rust alone stores notes,
clip names/IDs, lane IDs/keys, source references and musical history. A native
clip contains one event range and ownership masks, with indices resolved by the
prepared instance/clip maps. `event.frame` is clip-relative only in v3. An event
range must be ordered by frame/priority/track/device/target and intervals are
half-open. Clip ranges cover all events exactly once, including zero-length
ranges for empty clips. Each clip is listed by exactly one slot on its owning
track. initial_clip is NONE or a clip listed on that track.

All parameter masks contain only bits below each actual device's parameter
count; masks on other tracks/unconfigured devices are zero. Per-device v2
`automated` is the union of enabled clip masks, checked as a descriptor summary;
current ownership comes only from the active clip's mask and playing state.
Each clip's lane_count includes enabled and disabled records, is <=16, is at
least its enabled-mask population, and the sum over the track's clips is <=16.
Rust validates duplicate disabled/enabled targets and precise lane identities;
native validates the declared aggregate and every executable mask/target.
Enabled empty lanes retain ownership and use base until the first point.

Instrument/effect descriptors and prospective graph/value checks reuse reviewed
M2 helpers, including native parameter constraints. Each device occurs once
in one chain and owns a distinct root; notes target only its track instrument,
automation only its track devices. Validate counts/profile first, then indices,
ownership, structural values and graphs, then envelopes. No path access follows
an already-invalid count/profile. `validate_v3` checks structural/event/work
counts; `validate_prepared_v3` additionally checks all graphs/values and confirms
their declared work fits the measured graph profile. configure repeats all
necessary checks against installed graphs before changing the working session.

Tempo is finite 30..240. Lengths are frames within
`round((1/64)*48000*60/tempo)` through `round(256*48000*60/tempo)` and <=24576000.
The lower bound is at least 188 frames. Rust independently rounds each authored
beat/start/end using that same positive round-to-nearest expression/order; no
repeated rounded-duration addition. Native builds the bar-boundary table off
callback as `round((4*k)*48000*60/tempo)` for k=0..64, retaining values below
length_frames. It has at most 65 entries; loop end returns to boundary zero.
No caller-supplied table or inferred wall-clock launch target is needed.

| Identity | Owner and scope | Must not substitute for it |
| --- | --- | --- |
| Device instance ID / parameter key | Persistent Rust score, stable across reorder/save | Device index, root slot, reusable manifest ID |
| Clip/note ID | Persistent Rust score; duplicate makes fresh IDs | Slot or event-array offset |
| Track/device/clip index | One immutable prepared config | Saved identity |
| Root document/revision | Prepared installed graph handle; revision increases per root, including rollback | Device-table index or preparation revision |
| preparation_revision | Nonzero increasing host preparation identity | Root revision, desktop generation |
| request_serial | Nonzero increasing serialized request identity within the host lifetime | Playback phase or Stop epoch |
| Stop epoch | Native out-of-band cancellation identity | A queued request serial |
| track_epoch / generation | Runtime discontinuity observation | Any persistent ID or revision authentication |

Task 12 maps native diagnostics back through current prepared IDs, never draft
slot contents. Existing live base/bypass enqueue success remains its persistence
commit point. New clip/transport receipt failure changes no saved default, base
or score. Configuration starts stopped with prepared defaults at phase zero;
runtime selection/queued phase is never saved. Reconfiguration resets receipts
and ledger only with stopped I/O; the new preparation identity invalidates prior
observers. The host cancels its old outstanding UI requests at that transition.

## Requests, Receipts And Stop

Request serials must increase; reuse/zero rejects. Consume a fresh serial once
its preparation/header are valid, even on queue/work admission failure; retry
with a fresh serial. Revisions are checked at ingress and carried with queued
work. Uint64 exhaustion is a stopped-session restart error, never silent wrap.

START requires position=0, track_mask=0 and all track actions NO_ACTION/slot=0.
SEEK has the same empty mask/actions and position<length_frames. TRACK_ACTIONS
requires position=0, a nonempty valid mask, and, in Task 11, exactly one bit.
Masked actions are LAUNCH with slot 0..3 or TRACK_STOP with slot=NONE. Empty
LAUNCH rejects. Unmasked actions are NO_ACTION/slot=0. Multi-bit actions reject
FEATURE_DISABLED until Task 14; afterward the same record is one atomic command.
All reserved fields are zero.

`request_v3` returns 1 only after enqueue, writes an immediate QUEUED receipt,
and sets observed_frame/target_frame to NO_FRAME: ingress cannot know the native
observation boundary. A valid output receives REJECTED plus a reason on ordinary
return-0 failure. It does not change a pending action. Invalid output headers
return 0 without enqueue or output writes. Synchronous errors also update the
serialized control diagnostic; callback faults use state/receipt codes, never
race on the existing control-thread error string.

At callback observation, running track actions target the first native bar
boundary at/after position, including the current sample. If a looping seam
comes first, target its zero boundary; a nonloop end with no future boundary
cancels END_CANCELED. A stopped LAUNCH sets active clip/phase zero without
starting transport; stopped TRACK_STOP removes it. Same-clip LAUNCH retriggers.
START resumes active phases (or resets them/global position after natural end),
chases automation, and never retriggers held past notes. SEEK reanchors active
phases to position modulo each clip length, cancels pending actions and does not
chase held notes. Applied includes a harmless no-op START while already playing.

Each track has one pending action. A later admitted request supersedes that
track's earlier pending request only after the newer request passes validation.
An empty slot, full queue or rejected work check preserves previous pending
work. Request receipts transition QUEUED -> PENDING -> terminal, or directly
QUEUED -> terminal. observed_frame is when consumed; target_frame is the decided
application frame or NO_FRAME when canceled before a target exists. The per-track
terminal masks partition the requested mask; pending_mask covers the remainder.
Overall status is PENDING while any bit remains, otherwise the uniform terminal
status or MIXED. START/SEEK have mask zero and a single terminal status.

Future scene admission is all-or-none in one queue slot with one target frame.
Individual later actions may supersede members; other members retain that target
and one receipt records the resulting masks. At a scene's target, all remaining
members transition together; execution never applies only some members because
of work exhaustion. Global Stop cancels all remaining members. No scene-specific
root or schedule is introduced.

Receipts are a **bounded last-128-slot observation table**, not an audit log.
Slot=request_serial%128. The serialized producer reserves it before enqueue and
rejects RECEIPT_BUSY if its previous request is still queued/pending. It may
reuse a terminal slot. Callback alone owns result mutations and publishes them
coherently. Producer reservation bookkeeping is separate fixed control storage;
it checks a coherent published terminal result before reuse, with no callback
lock. Unobserved enqueue keeps the producer reservation, so an old terminal
publication cannot incorrectly free it. A terminal receipt may disappear on
reuse; Rust compares both serial and preparation, never assumes a different
slot occupant describes its request. Pending receipts are never evicted.

Immediate QUEUED remains authoritative until the callback consumes the request.
`last_consumed_request` and matching receipts distinguish that interval. Rust
polls one state, caches only its bounded outstanding requests, and may retain a
small bounded UI notification history. No per-request heap object, unbounded
observer list or lossless long-term result log is promised. Queue-full and
receipt-busy do not reserve a cell or modify callback state.

`stop_v3` always advances the same independent Stop mailbox as existing stop,
returns its epoch, and consumes neither command nor receipt capacity. It is
intentionally not authenticated by possibly stale preparation: Stop must work.
The next callback acknowledges applied_stop_epoch after canceling pre-Stop
transport/clip actions and clearing sound/ownership/pending actions. Repeated
Stop while already cleared is idempotent DSP work. Preserve the acquired queue
head **before** Stop-epoch snapshot ordering from the existing race fix. Fresh
post-Stop START/SEEK/actions remain valid; older epoch commands never rearm notes.
Existing `alive_session_stop()` continues to use this mailbox in all modes.

Existing start/seek entry points remain unchanged in legacy mode. In v3, reject
those identity-free entry points explicitly and direct new callers to request_v3;
do not invent hidden request serials. Reset, mixer, base_v2/bypass_v2 and global
Stop retain shared meanings. Stopped-I/O reset remains unconditional cleanup.

## One Internal Runtime And Frame Order

Retain AliveSession, one command queue/Stop mailbox, one native clock, one
coherent publication and one instrument-then-effects render path. Introduce an
internal maximum-capacity device/chain representation and mode Legacy/V3Clips.
Normalize v1/v2 into it with explicit legacy validation policy; keep their
original global timeline/loop range, density rules, chase, command behavior and
snapshot semantics. V3 stores clip metadata plus per-track cursors/phases. Do not
force legacy clips through stricter v3 minimum lengths/work admission or change
legacy event ordering/results. Shared graph validation, parameter application,
root ownership, chain rendering, clear helpers and publication remain common.

At callback entry reduce up to 64 observed commands in bounded scratch state.
Simulate order/epochs and determine final position/playing/clip/pending choices;
the last surviving seek and per-track action supersede earlier same-purpose
requests. A START and a SEEK may both apply through one final discontinuity.
Base/bypass/mixer retain their accepted ordering/final values. Do not mutate old
pending choices until optional action admission succeeds. If a combined batch
of new discontinuity requests fails, reject those surviving requests as a group,
preserve prior musical/pending state, and still apply accepted base/bypass/mixer
and unconditional Stop. This bounded conservative batch rule is explicit API
behavior, not silent command dropping.

At each frame resolve all causes before touching DSP: Stop/nonloop end cleanup;
otherwise seek/global wrap, surviving due launches/stops, then natural wrap if
still applicable. Clear each affected track at most once. Release outgoing
ownership, compute final bases/chased values, apply bounded parameter candidates,
then merge event heads across tracks using termination/automation/note-on order.
Chase scans only events strictly before the landing phase; landing events execute
once in the normal batch. No outgoing event executes at a switch frame. A note
ending exactly at a hard-clear seam terminates through that clear, without a
fabricated second event at an invalid clip offset.

Stop/seek/end/global wrap clear affected active and bypassed effects. Local
launch/stop/wrap clears only that track; unaffected tracks remain sample-identical.
Muted/soloed tracks still advance/render. A stopped track has no endpoint output;
graphs remain installed. Keep warm effect bypass between discontinuities and
the final deferred notification flush after hosted and ordinary Ultra roots.

## Bounded Prospective Admission

Native validation is authoritative. Rust may provide explanatory preflight but
cannot bypass it. Recompute envelopes from immutable frames/masks; no unchecked
caller-supplied certificate. Let W=1024, N<=1024, C<=32, T<=8, Q<=65.

For a clip c with period L and m events, compute E_c(w), for w=1..W, as
`floor(w/L)*m + max_circular_count(w%L)`. For a residual window, two pointers over
two copies of its sorted event offsets find the maximum starting at an event;
duplicates count separately. Do not expand repeats. Empty clips produce zero
events. The same procedure accepts weighted pulses component by component.
It costs O(W*(N+C)) overall and O(N+C+W*T) working storage; integer arithmetic
saturates at the relevant rejection threshold plus one.

Let E_t(w)=max over a track's clips and stopped=0. Compute K(w) from the rounded
global bar/seam table using the same periodic method when looping; nonlooping
uses a finite sliding window. Counting a boundary at a window's first sample
is an acceptable overestimate. With period>=188 and normal bar spacing>=48000,
K(W)<=6: short regions repeat zero at most six times; longer regions can bring
at most two bar/seam boundaries close together. Assert the derived K bound;
do not use it as a substitute for actual boundary computation.

For positive lengths define the at-most-j-segment envelope:

```text
D[1,w] = E_t(w)
D[j,w] = max(D[j-1,w], max(1 <= a < w) (D[j-1,w-a] + E_t(a)))
F_t(w) = D[min(w,K(w)+1),w]
```

Require sum E_t(1)<=32 and sum F_t(W)<=64. Natural wraps are already cyclic;
every allowed quantized launch/stop and global seam is a splice, including a
global seam that retains the same clip. This bounds arbitrary phase alignment
and outgoing/incoming windows without 4^8 combinations or an LCM timeline.
Future prefix event envelopes `A_event(w)=sum F_t(w)`, with A_event(0)=0, are
also retained for runtime checks. For w=1 use sum E_t(1), not two batches.

For work, retain these separate nonnegative counters:

- root_clears: one complete current reset of one root;
- event_scans: one event visited during chase/cursor reconstruction;
- parameter_writes: one native bound parameter application;
- guard_steps: one candidate/horizon ledger comparison step.

Graph/node/kernel limits continue to bound the work inside a root clear or
parameter propagation. Work counters do not prove identical CPU cost for unlike
graphs. Let D_t be root count, P_t total bound parameters and H_t maximum clip
event count. A conservative reset/chase charge is
`X_t=(D_t,H_t,2*P_t,0)`. The implementation may apply fewer writes but charges
that bound. Add a weighted pulse X_t at phase zero even in empty clips; scheduled
automation adds one parameter_write at its event. Take cyclic maxima and the
same segment DP for each work component, then add K(w)*X_t for forced splices
(safe double counting of some seam work). Include one additional all-track clear
charge in a nonlooping window containing end; using it for every such session's
window is an acceptable conservative initial bound. Keep scheduled frame and
window maxima below registered scheduled policy limits.

This has O(T*J*W^2*M + W*(N+C+Q)*M) time, where J<=7 and M=5 including events.
For eight tracks, the straightforward DP is at most roughly 294 million simple
candidate-component operations, off callback. Process one track/component at a
time with two W+1 rows; retain aggregate envelopes and per-track witnesses, not
all DP histories. Fixed arithmetic tables require well below 1 MiB (excluding
existing bounded graph plans), even with 64-bit unsaturated work counters and
witnesses. Preflight counts/density early, cache identical tracks, and bound
preparation wall-time in tests; improve this local DP if needed without changing
the proof. No iteration count depends on session duration in frames or an LCM.

Conservative diagnostics include track_mask, per-track bound contributions and
one contributing clip where a single clip witnesses the maximum. If multiple
segments/clips contribute, clip[t]=NONE and conservative=1; say "combination
envelope" rather than fabricate a real simultaneous frame. `frame=NO_FRAME`
when there is no concrete witness. Counts may saturate to limit+1; report them
as at least that many. Rust renders named clips/tracks, resource and limit.

## Repeated-Control Protection And Guaranteed Cleanup

Use fixed W-frame circular ledgers indexed by native absolute_frame for actual
dispatched events, scheduled work and optional discontinuity work. Keep rolling
sums; expire a slot on frame advance. They survive transport Stop/seek/wrap/
restart and advance while stopped. Keep envelopes/ledger arrays in prepared
storage, never allocate them in callback. For all five components, storing
64-bit per-frame entries costs about 40 KiB per ledger family; three separate
families remain below 128 KiB. Aggregate/precomputed tables remain bounded too.

Quantized launches and natural/global seams are included in scheduled admission.
Manual SEEK and effective START add arbitrary discontinuities. Stopped clip
selection may avoid a clear only if the track is provably already clear; charge
any actual clear as optional. Coalesce all same-frame causes before charging.

For a surviving new control batch at absolute frame f, validate its optional
charge X against per-frame and rolling optional work ceilings. Then check every
overlap with retained history for j=0..W:

```text
past(j) = actual total on [f+j-W, f)
future(j) = candidate upper bound on [f, f+j)
past(j) + future(j) <= total admitted window allowance
```

For j=0 future is empty; for j>=1 it includes the candidate first frame.
Windows end at f+j and include future frames f through f+j-1.
Build past(j) suffix totals in one backward ledger pass, O(W), not W scans.
Use A_event(j) and component work envelopes for any playing candidate future;
zero for a stopped candidate. Add optional charge once at f, and preserve the
scheduled/optional sub-budget separation. Event allowance is always 64; normal
work allowance is scheduled_window + optional_window componentwise, with the
optional component also checked against its own ceiling. Emergency work is
accounted separately as the unconditional per-callback reserve described below.
Test the first candidate frame's
complete batch against the remaining 32/frame allowance as well. No old/new
batch can both be dispatched at a coalesced transition.

The all-combination future envelope may reject a seek that an exact trajectory
would admit; report that fact. It must not reject ordinary scheduled playback
that was already admitted. Before accepting a control, use the maximum actual
scheduled and optional history with the future envelope, not only event-array
size or its first batch. Otherwise a dense prefix reached later can violate the
rolling cap after an apparently safe seek. Successful checks protect every
future overlap until old history ages out; later manual controls repeat them.

At most one combined horizon check per callback snapshot is necessary. Its
O(W*M) work, and scanning/reducing at most 64 commands even when rejected, are
unavoidable fixed callback overhead; they cannot be made safe merely by
rejecting the resulting seek. Measure that overhead separately at actual native
partition/driver buffer combinations. No polling loop retries in the callback.
Charge guard_steps for optional checks according to the implementation's fixed
loop count and reserve its rejection-path maximum in measurement; a depleted
optional budget may reject before the expensive horizon check.

Before every actual batch, verify dispatch and scheduled work invariants. On a
violation, hard-stop before partial note-on/automation dispatch and clear sound;
do not defer a note-off waiting for credits. Publish fault/resource and counts.
The ordinary future envelope guarantees expected scheduled actions fit; this
guard catches defects/unexpected control interaction, not normal admission.

Emergency capacity is independent of optional credits. Conservatively reserve
two full-session clears/ownership releases and bounded pending cancellation per
native callback: an entry Stop, then a possible fault after a fresh post-Stop
START. This is a structural worst-case count, not a guessed duration. A fault
latches transport stopped for the rest of that callback; it cannot rearm and
fault repeatedly. A normal scheduled end already has its scheduled work charge.
Coalescing may reduce actual clears, and repeated Stop in a cleared state does
not clear DSP again. This reserve is not a rolling-credit check that could
reject Stop, even with saturated command/receipt queues. Optional requests
cannot spend it. Measure signal,
scheduled and optional maxima, fixed command/check/publication overhead, and
this emergency reserve together. Scheduled termination is never optional. All
work ceilings and this reserve are policy measured before initial profile
admission, not guessed hardware deadlines.

## State Projection, Measurements And Tests

One coherent publication contains transport/devices/tracks/receipts from the
same callback boundary. `state_v3` is valid in v3/unconfigured mode; active legacy
mode returns 0 without writing (legacy consumers keep their existing getter).
Legacy v1/v2 getters project a v3 state only when track_count<=2 and device_count
<=6. Project old meters/transport and instrument parameter state exactly as
before; larger state returns 0 without writing any output byte. Never copy a
large native count into a small legacy array. Test surrounding canaries, output
unchanged on rejection, bad headers, and coherent projection during publication.
Receipts increase publication cost; measure the full 16.6 KiB snapshot and its
atomic storage rather than claiming it is free. No separate audio state owner.

To choose WORK_POLICY_1, measure the admitted 2/6 actual Faust graphs with dense
events, maximum bound parameters/voices, shortest empty/populated loops, full
schedule seek/chase, repeated 64-command bursts, receipt publication/reuse and
Stop after that combined work. Record each counter maximum alongside duration.
Test high-cost admitted graph/reset paths, not only trivial root counts. Select
documented finite scheduled/optional ceilings plus cleanup reserve that admit
the real two-track example at practical negotiated desktop buffers. If a useful
short loop fails, report work admission and investigate its measured reset cost;
do not widen caps. Keep profile disabled until the policy values and fixtures
are checked in. Internal larger fixtures do not enable the 8/16 profile.

Existing means near 1053 us/1024 frames and 33.5 us/seek-plus-one-frame are
offline six-device averages only. They select workloads to inspect, not ceiling
values or p99.9 guarantees. Keep actual buffer/rate/build/CPU provenance, release
duration distributions and maxima distinct from instrumented guards and software
loopback. The proposed 50% p99.9 utilization is advisory. One-frame partitions
prove sample correctness, not physical one-frame deadline support.

Required acceptance before Task 12 depends on this interface:

1. Unchanged v1/v2 suites/layouts/symbols/samples; configured legacy loop range
   and control race semantics; old getter projection/canary tests on v3.
2. C/Rust size/offset fixtures; all count/profile/field/mask/ownership/graph/value
   failures; no mutation of a working configuration on failed admission.
3. Brute-force tiny cyclic/splice/work oracle including unchanged-clip global
   reset, short empty loops, partial bars, prime clip lengths, unsafe nondefault
   combinations and dense outgoing/incoming fragments. Check every horizon w.
4. 32/33 per-frame and 64/65 rolling boundaries; explicit 40-event triad case;
   note ending at seam; chase distinct from scheduled automation counts; no
   truncation, dropped lanes or hidden event shifts.
5. Scalar versus 1/31/63/64/127/1024/mixed/seeded partitions with commands at the
   same native entry frames; incoming phase-zero once, global event priority,
   unaffected track exact samples, active/bypassed tails and ownership release.
6. Queue/receipt saturation, terminal receipt reuse versus pending retention,
   stale identities, pre/post-Stop races, combined command reducer, supersession,
   stopped selection, nonloop cancellation, repeated seek/restart with dense
   future suffix, and Stop while every optional budget is exhausted.
7. Callback allocation/free/lock guards, bounded stack/storage, measured full
   publication/guard overhead, actual saved instrument/effect rendering, and a
   documented measured initial work policy. No task-complete claim based only
   on arithmetic counts or browser UI behavior.

Task 14 adds multi-bit action/receipt-mask and all-or-none scene tests through
the same API. Task 13 supplies measured 8/16 admission. Neither requires a v4
ABI or a different persistent score format. Remaining implementer gate: measured
work ceilings and graph-cost policy; no external product decision is required
unless measurements force a material change to the requested useful workflow.
