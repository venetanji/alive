# Numeric Public Capture Schema v1

The parent's first two captures stopped at hierarchy preflight before scored work.
Capture003 retained two int operations/checkpoints and twelve getter states,
then refused float admission. Capture004 retained42 operations through E40,
82 checkpoints/492 getter states,160 actual number-class/format6 reads and19
destination-order witnesses without witness failures, then refused close-float
request125. It remains FAILED/incomplete; complete timeline/close qualification
is unresolved. Capture005 repeated the partial42/82 timeline but its32769-byte
close125 ACK was truncated/invalid JSON, with no retained ACK125 public raw
binding. Its complete prefix snapshots remain incomplete forensic metadata,
not a repaired ACK. The current controller-only JSON transport correction has
offline verification only. The public schema is unchanged.
Public artifacts contain numeric states, permitted identities, endpoint metadata
and hashes only. Original source/configuration/readback/journal bytes stay in a
private `alive-ultra-evidence` directory.

`session.json` contains `schema_version:1`, `status`, `complete`, `score_binding`
(`path`, `sha256`, `bytes`, `operations:54`), `operation_ledger`,
`readback_requests`, `source_metadata`, `message_prototypes`, and explicit
capability booleans. `message_prototypes` binds document/source/anchor and
`text_sha256`/`text_characters` to the verified pristine authored string.
`preparation_binding` binds package script hashes/aggregate digest, the private
config and seal digests, and the public preparation manifest digest. Preparation
and verify commands expose the same safe digest fields for parent review.

Each operation ledger row has `request_id`, `step_id`, `action`, `document`,
`source_sha256`, `action_revision`, `live_owners` (document to revision map),
`checkpoint_request_ids`, and `working_paths` (live document to immutable
revision-specific private working filepath). There are exactly54 operations and
102 checkpoints (52 int, 50 float) on a successful complete timeline. Request
IDs are positive exact integers, globally increasing across operation/readback
commands; no hidden owner installation or synthetic stimulus is allowed.

`receipts.jsonl` rows bind `seq`, `request_id` (operation request), `step_id`,
`action`, `action_document`, `action_revision` and emitter `document`, `revision`,
`source_sha256`, `kind`, `anchor`, `port`, `message`. Global `seq` is strictly
increasing. `kind` includes stimulus/receipt/step-complete/harness-error.
Scalar messages are `{selector:bang,atoms:[]}` or `{selector:int|float,
atoms:[{tag:int|float,value:<finite number>}]}` with matching scalar tag.
Errors have `error_sha256`, never raw Console strings. Injected stimuli are
strictly bang/int/float. Original source Message output uses the shared
`symbol-sha256:` normalization for its custom selector and symbol atoms. Output
lists preserve `unknown-number` when the original recorder cannot observe an
atom subtype; no scalar numeric tag is inferred from a JavaScript number.
Receipts additionally expose `synchronous_dispatch_active` as an observed
boolean; lifecycle `step-complete` rows have no invented stimulus, anchor or
message, and a close completion has `closed_owner_absence_validated:true`.

`display-states.json` is the checkpoint array. Each row binds `request_id`
(readback), `operation_request_id`, `step_id`, `action`, `action_document`,
`action_revision`, observed `document`, `revision`, `source_sha256`,
`working_path`, `raw_sha256`, `raw_bytes`, `readback_method:v8-numeric-getvalueof`.
`numeric_states` covers exactly original number/flonum/slider anchors obj-16,
obj-17,obj-18,obj-20,obj-21,obj-33 in each live owner (612 rows in a complete
timeline). A state has `anchor`, `class_name`, `value`, `getter_method:getvalueof`,
`getter_representation:scalar-number|singleton-number-array`, `semantic_tag`,
`semantic_tag_basis`, `receipt_tag_observed:false`. `semantic_tag` means class
semantics (number=int, flonum=float, source-default integer slider=int), not a
measured receipt tag. Actual receipt tags are measured independently. Stores,
isolated aliases and buttons have no invented getters.

`message_states` contains `anchor`, `text_sha256`, `text_characters`,
`prototype_unchanged:true`; it compares the exact original prototype at every
checkpoint. It never publishes parsed source Message contents.

`retention` has `method:runtime-object-and-endpoint-inventory`,
`original_basic_boxes_retained`, `original_basic_cables_retained`,
`observer_leaf_cables_retained`, `unexpected_basic_cables:0`,
`input_endpoint_multiset_verified:true`, `output_endpoint_multiset_verified:true`,
`saved_order_observed:false`. Full exact Basic inventory and both duplicate-
sensitive endpoint multisets, including zero-output leaves, are validated.

`source_metadata` rows expose `document`, `source_sha256`, `bytes`,
`full_box_count` (25/27), `basic_box_count` (includes Basic comments),
`basic_cable_count` (10/12), `executable_count` (14/16), `observer_leaf_cables`
(sum original saved outlet counts) and `anchors` containing only
anchor/maxclass/runtime_class/rect/outlets. No text or graph body is published.

Each `readback_requests` row binds request/operation/step/action/action-owner/
observed-owner/source/revision/working_path, raw hash/size, and `seq_before` /
`seq_after`; these must match to prove getter silence. `command_requests`
additionally binds every command acknowledgement's exact private bytes by
request ID and hash/size. Failed observations retain raw bytes and their
public hash/size even when validation refuses them.

Private close ACKs now retain `close_diagnostics`, bound to `request_id`,
`step_id`, `action`, `document`, `revision`, `source_sha256`, exact
`working_path`, and `helper_sha256`. `dispose` records `attempted:true` and the
typed message-call result. `samples` contains one `before-dispose`/attempt0
snapshot and every attempted poll, bounded by30. Each retains separate typed
root/reader/disposer `valid` reads; an anchor/typed-validity row for every
original Basic Maxobj; root `filepath` and `firstobject` access, including the
first object's validity when available; and root Wind access, visibility,
associated class and associated filepath observations. Unattempted dependent
probes use null, distinct from a returned null observation.

Returned observations contain `status:returned`, `type`, and primitive `value`
when applicable. Undefined/null/object/function have distinct type tags and
no serialized runtime value. Nonfinite numbers use `representation` values
`nan`, `positive-infinity`, or `negative-infinity`. Thrown observations contain
`status:threw`, a type-only or primitive `exception`, and readable string
`name`/`message` when available. Every getter is exception-isolated. Runtime
objects are never serialized/stringified. No wrapper equality or window-only
absence rule is used. Captures004-006 used the historical three-read close
conjunction and refused unavailable Patcher validity. The prospective supported
freebang proof described below replaces that unavailable property gate; it does
not reinterpret any historical capture as a pass. Existing private ACK raw hash/size binds the entire payload,
including failure; no public comparator/checkpoint fields change.

The current controller transports JSON using ASCII escaping of all non-ASCII
UTF-16 units and `File.writestring` chunks bounded by4096 bytes, with one final
literal newline. Explicit truncation/cursor/EOF checks and `finally` closure
guard the whole payload. Its `File.readstring(4096)` counterpart concatenates
consistent positive reads to the exact stable EOF, then parses JSON; positive
short reads are supported. Stalled/inconsistent reads, premature EOF, short or
stalled writes, invalid initial cursors and final-size mismatches refuse.
This changes private encoding/transport only: no diagnostic sample is omitted,
and all31 snapshots/23 float Basic handles remain required by the diagnostic
fixture. No public raw retention/schema/comparator or observer/journal/V8
transport changes. Capture005 predates this correction and has no complete
close ACK or valid ACK125 raw binding.

Capture006 establishes the chunked transport with a complete91560-byte ACK125,
publicly bound by raw hash/size and retaining all31 samples. Root.valid is
undefined throughout; reader/disposer and all23 original Basic handles change
1->0. The unchanged conjunction refuses close. No lifecycle-pass rule or
root-absence conclusion follows from this transport observation.

A successful install acknowledgement and a failed controller acknowledgement
retain `geometry_dispositions`, an array of accepted discrepancies for the
three pinned saved20/live22 root anchors in each source and the two int/three
float annotation profiles. Each entry binds document/source/revision/anchor/runtime class,
saved/live numeric rectangles and the finite source/helper/zero-route policy.
The existing command acknowledgement raw hash/size binds this private metadata;
the operation ledger, checkpoint and comparator schema shapes do not change.
The annotation profiles are limited to comment obj-23 height54/55 and helpargs
jsui obj-4 width208.315216/208.19552612304688 in int Basic, with exact
source/helper/annotation-attribute/zero-route bindings. Float comments obj-3/5
similarly bind exact height55, and float helpargs obj-4 exact width
190.31402587890625, under distinct float source/metadata profiles. Other
dimensions retain the existing0.01 tolerance. All executable geometry stays strict.
Failed settling sweeps replace prior diagnostics and aggregate all resolvable
hierarchy failures before any observer installation.

V8 raw rectangles are unchanged. The Python validator independently checks
the finite annotation policies and actual geometry before adapting only a
temporary topology-check copy. Derived metadata stays in a private
`geometry-dispositions-<raw-filename>.json` sidecar, binding `schema_version:1`,
request/step/action/document/revision/source, the identical raw hash/size,
`checkpoint_validated`, `geometry_dispositions` and `numeric_mode_observations`. The sidecar is exclusive
and mode0600; accepted geometry may be retained with validation false when a
later checkpoint gate refuses. No sidecar fields enter the public checkpoint,
retention or comparator schemas. Original source/runtime inventories and
all20/22 observer leaves stay required.

The four pinned float source flonums retain source class `flonum` and semantic
getter tags. A source-bound mode policy admits measured runtime class `number`
only with unchanged saved geometry and actual `getattr("format")` primitive
finite number6. Full-tree/Basic admission and every V8/Python checkpoint repeat
the gate. Private raw `numeric_modes` rows bind anchor, `source_class:flonum`,
`runtime_class:number`, `getter_method:getattr`, `attribute:format`,
`getter_representation:scalar-number`, and `getter_value:6`. Missing, malformed,
coerced, nonfinite or wrong values refuse. Failed private observations retain
getter status/representation/value when available. ACKs retain deduplicated
`numeric_mode_observations`; private sidecars bind accepted mode observations
to raw readback hash/size. None of these fields enter the exact public checkpoint
or retention shapes. Actual outlet selectors remain independently measured.

Session capability booleans: `initial_message_prototypes_validated`,
`initial_numeric_readback_validated`, `numeric_readback_validated`,
`numeric_getters_silent_validated`, `runtime_endpoint_readback_validated`,
`typed_float_dispatch_validated`, `synchronous_destination_outputs_validated`.
The last capability uses actual scored step receipts at original obj-21:0 and
obj-24:0, with one scalar followed by one bang in the same completed synchronous
dispatch bracket. It never uses the source-store observer's position. Explicit
order witness rows bind step/document/revision/numeric_seq/button_seq and the
operation request. It establishes those controls' output order only.
They live in `destination_order_witnesses` as
`{step_id,document,revision,request_id,numeric_seq,button_seq,synchronous:true}`.
Unresolved/reversed witnesses populate hash-only `destination_order_failures`;
the synchronous-order capability stays false while endpoint/state capture can
remain reviewable as its own finite evidence.

Cleanup mirrors audited capture fields (`preferences_unchanged`,
`source_preservation`, `helper_preservation`, `owned_capture_after`,
`prefix_processes_after`, `marker_processes_after`, `prefix_removed`,
`xvfb_exited`, `ordinary_quit_requested:false`, `display_only_attribution:false`).
Source preservation contains all four revision working files as well as original
installed/pristine files. `saved_order_observed:false`; physical, shared views,
serialization, rendering, authoring, metadata and whole-help remain unresolved.
`source_preservation` contains exactly four rows
`{document,revision,installed_unchanged,pristine_unchanged,working_unchanged}`.
`helper_preservation` includes `name`, `sha256`, `installed_unchanged` and
`private_unchanged` for all four pinned helper copies.

## Prospective private freebang proof

`close_diagnostics.lifecycle_evidence` uses private version `freebang-v1` and
contains exactly `version`, `binding`, `root_route_path`, `root_route_proof`,
`driver_route_proof`, and `observer_report`. Its nested strict contract is frozen
in `.superpowers/sdd/2026-10-22-max-help-root-behavior/int-float-freebang-protocol.txt`.
The binding includes prepared `monitor_epoch`, exact close request/step/action,
document/revision/source/owner path, and sealed observer helper digest. Epoch
is distinct from the runtime process-ownership marker; config stays immutable.
Root proof bytes are read from the bound private observations path, checked for
parsed equality with the complete ACK-embedded proof, exclusively retained,
and hashed/sized by independent Python. Retention and validator metadata remain
private and never extend public `command_requests` records.

Root inventory accounts exactly for original root objects and four additions
(reader, disposer, freebang, send). The root proof reads V8-only `boxtext` and
actual patchcord inputs/outputs. Text is declaration evidence, not an assumed
internal channel getter; sealed helpers prohibit renaming/retyping/replacement.
Driver inventory accounts exactly for controller, observer, and four receivers.
The observer declares five physical inlets and zero outlets: physical0 controls;
logical ownerN receives at physicalN+1. Closure-private helpers cannot be invoked
by incoming selectors. Bang with atoms, non-bang, unknown selectors, control
selectors at event inlets, and bang at control0 produce sticky refusal. There is
no manual freebang input and no admission challenge.

Existing31 typed diagnostic snapshots and every original member remain. New
`retained_firstobject_valid` reads the Maxobj retained before disposal even when
the current root getter later returns null. New `harness_objects` contains only
the freebang/send typed validity readings. Originals, reader, disposer, retained
first Maxobj and both new harness handles must start valid, provide only primitive
bool/numeric0/1 reads, converge to all invalid by poll30, and never revive after
the first jointly invalid poll. Root.valid and Wind stay diagnostic. Exactly
one automatic bang for the armed owner after dispatch-start and before final
report is required in addition to actual invalidity. Synchronous notification
between dispatch-start and dispatch-return is allowed. Full event/control history
and sticky failures remain private under raw ACK binding, never score receipts.

The runner invokes strict independent `lifecycle.validate_close` after raw ACK
retention and before accepting the public close boolean, action journal bracket,
or ledger advancement. After the final scored checkpoint, an additional private
barrier ACK reports both revision1 owners closed exactly once, revision2 owners
live, and observer state sealed. `validate_barrier` checks the retained full ACK
and complete history before session completion. Post-barrier cleanup notifications
are outside the score and cannot repair a close. The private barrier record is
retained in private completion evidence only; public156 command records,54
operations,102 checkpoints,612 states, schemas and comparator remain unchanged.
No new runtime freebang result is claimed by this prospective schema.
