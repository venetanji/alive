# Capture008 Minus Refusal Investigation

Date: 2026-10-23 (Asia/Hong_Kong).

## Findings

1. **Confirmed source-bound install refusal, not a missing response.** Command
   101 is `operation/install-minus-r1`, minus revision1, lifecycle owner4. Its
   current and retained ACK bytes are identical and explicitly record
   `success=false`, `error_code=arithmetic-controller-refused`. The journal's
   sole harness error binds the same request/step/action/revision and records
   `Error: aggregate-original-hierarchy-preflight-failed`. The runner retains
   that ACK before raising `ValueError: Private controller refused command`
   at `run-runtime.py:186`.
2. **Exactly four geometry-only and three class-only mismatches explain all
   seven diagnostics.** The four geometry cases retain an allowed source
   runtime class but differ in exactly one rectangle coordinate. Each change
   exceeds the existing strict resolver's tolerance. The three authored
   `flonum` objects have exactly their saved geometry but observed class
   `number`, which their unchanged source allowlists reject. No additional
   class or geometry mismatch appears in the complete recorded root/Basic
   candidate inventories under the unique mappings described below.
3. **No minus capability evidence exists in this capture.** All three
   observation/disposition arrays are empty. The seven diagnostics contain
   only expected source identity/rectangle and raw class/rectangle candidates;
   none contains a numeric probe observation. Frozen controller code excludes
   minus from both times and plus diagnostic capability paths. There is no
   minus readback, event, close or completed install.
4. **Recommend a diagnostic-only minus collector as the next bounded design.**
   Preserve all seven refusals, zero geometry dispositions and unconditional
   failure while collecting the missing three-object controller capability
   evidence behind an exact source/helper/request/owner and complete hierarchy
   gate. Four geometry admissions now would leave the numeric blockers
   unresolved and widen the number of consumers changed before the missing
   evidence is available. This recommendation authorizes no implementation,
   preparation or launch.

## Evidence Binding And Verification

Paths in this report are relative to
`experiments/max-reference/arithmetic-roots-runtime-20261022/` unless stated.
Private work is the existing
`~/.cache/alive-ultra-evidence/arithmetic-max-runtime-008`; historical code is
the existing adjacent `arithmetic-package-008-historical` archive.

| Artifact | SHA256 |
| --- | --- |
| Public `results/arithmetic-008/capture-evidence.json` | `7fe464885c95cd551631597357f220ef3729085f734a501b712f61fae30780af` |
| Public session | `53df6177d426a1e7b8ad80a812ed2e655bc62c09ebec8916d5b059bbd7b835b6` |
| Private command101, 234 bytes | `7aef00f82dc331f6c37aeca85d20f1e3297bf57ff09f76a666ccec3e690976c8` |
| Current/retained ACK101, 4,650 bytes | `cd86e257eac4d6dcbecfd25e133226bfa6728366b7df26b1f946f171a0970fe4` |
| Private journal, 64,038 bytes | `87d2239c23ff8aa9820e5b7c292c811ccb9308716567df074bf4413f8377030b` |
| Private failure file | `1a49981cfa96e4e2778c9a635ba739e7a6143d572a264e4d8ba708a7c3f7cfa1` |
| Runner failure message digest | `6d8bf3bb5ba4145f22c2d48cae211c17564ed8e5057fbfcb683f04272a2b2322` |
| Config, 285,388 bytes | `54fc4f6f07aa5bab24ed7cd0f1babaa1a85b06bda86829fb40fe185f5495363e` |
| Seal, 3,486 bytes | `a2e22eb7a750261415d9ce7a3fb742032ca32da7bdcdca4ccb2530445e21296a` |
| Preparation manifest008 | `d85a990ff83eec5c15c25dbd388c8b05e21b6636997329fa4430f45aee8e51ba` |
| Historical008 binding | `0e5263ffbf1d4e79fa35529c615e73196377f3c7750229e64da17e0512f64926` |
| Consumed controller | `da4473ac8014f39fd255b830121508738c16980b6e303fb0a9b8c963ce0f13a8` |
| Consumed V8 reader | `868c2bb4e8badceb67f4edcd61726585e7824ee0979f4369becb1447d7d78e16` |

The REA reference is
`ev_5918c4938b343ff302dfbdac274410bd597c3ebb78ef89e33637a72d1bfeb2ee`.
Parent reports exit1 and `truncated=false`, retains the complete response and
directly verified all six observed public file hashes/sizes before projecting
the public capture record. **That complete-response proof is parent-only.**
This investigator checked the supplied public capture digest and local
artifact relationships, did not retrieve/reproduce the complete REA response,
and does not substitute the public projection for that proof. The separately
assigned full capture audit remains independent of this refusal investigation.

Read-only checks confirm all sixteen current files match the final008 review
map, all sixteen archive files match the archive binding, and archive/current
bytes agree. All twenty-two sealed inputs match. Consumed controller, reader
and both observers equal their archived files. Config/archive/seal package
maps and recomputed package digest agree; manifest config/seal/package
bindings agree. All four private helper files match their configured and
independently pinned hashes. No historical executable was imported.

The public session binds the retained ACK hash/size, current journal hash and
frozen runner digest. Its failure digest binds the error **message**, as
implemented at `run-runtime.py:304`, rather than the failure JSON file bytes;
that message digest matches. The failed ACK deliberately has no success
`step_id` field; exact step/action binding is supplied by command101, the
session command record and journal error, not invented from that ACK.

## Source Reconstruction And Seven Mappings

Minus source is SHA256
`7968c6cf7d348b39d8fb8044c42977bc2b71fe55c4c7db8542150e79e6a1a0b0`,
22,246 bytes. Installed source, pristine r1/r2 and working r1/r2 are byte-equal.
Pure in-memory `source_inventory` reconstruction produces sixteen Basic boxes,
twenty full descriptors, eight saved edges and nineteen observer leaves; all
four configured projections are equal to that reconstruction. Minus contains
zero policy fields in its Basic/full descriptors.

The complete pristine projection over document/source/helpers, Basic identity,
both descriptor views, edges and leaves has normalized canonical digest
`c17962fba204a882ce5b0bca6c792e55c0a4181366c7dfe0c39b28152215084e`.
This is a measured reconstruction pin for a future design, not a newly
admitted policy or evidence of live text/port observation.

Precisely, the projection has exactly these nine keys: `document`,
`source_sha256`, `basic_anchor`, `basic_varname`, `helper_sha256`, `boxes`,
`full_inventory`, `saved_edges`, `observer_leaves`. It omits exactly the six
remaining configured definition keys: `revision`, `lifecycle_owner_inlet`,
`pristine_path`, `source_path`, `working_path`, `working_windows_path`. Those
dynamic identities must be validated separately; omission from this digest
does not waive their binding.

Every Basic row has exactly `anchor,authored_empty,authored_text,id,
initial_numeric,inlets,maxclass,outlets,rect,role,runtime_class,runtime_classes,
source_box_sha256,source_text_sha256`. Every full row has exactly
`anchor,authored_empty,authored_text,child,inlets,maxclass,outlets,rect,
runtime_class,runtime_classes,saved_incoming_routes,saved_outgoing_routes,
source_box_sha256,source_text_sha256,source_varname`. Every edge has exactly
`destination,index,source`, with two-member source/destination endpoint arrays.
Every leaf has exactly `anchor,port,varname`. Arrays preserve complete order
and multiplicity, including runtime class arrays. No policy or other extra
descriptor field is part of this pristine schema.

Canonicalization recursively sorts object keys, uses compact JSON without
whitespace, preserves booleans/null/strings and array order, rejects nonfinite
numbers and normalizes whole-valued numeric scalars to integers. JSON uses
ASCII escaping (`ensure_ascii=True`); the measured projection is 18,681 bytes
and all actual source strings are ASCII. Strict identity/count/port types and
bounds must be checked before numeric normalization, so floating/boolean
identities cannot canonicalize into valid source identities. A dedicated
recursive canonical serializer plus ASCII SHA256 can reproduce this pin in
the controller using data read from config, with no embedded raw authored
strings or rectangles. `geometryVectorHash` must remain restricted to its
four-finite-number schema and must not be repurposed to hash this projection.

All seven diagnostic expected anchors/classes/rectangles equal their pristine
descriptors. The root diagnostics each contain the same four class/rectangle
candidates; the four Basic diagnostics each contain the same sixteen. There
are four and sixteen unique class/rectangle pairs respectively. For every
source descriptor, matching either its exact rectangle or a rectangle with
exactly one changed width/height coordinate yields exactly one candidate.
Each scope's mapping is bijective. These relations classify the observations;
they are **not** a generic tolerance or permission proposed for production.

Coordinate indices are zero-based: index2 is width and index3 is height.

| Source anchor | Authored / expected runtime / observed class | Changed indices | Saved rectangle equal | Failure |
| --- | --- | --- | --- | --- |
| `root/obj-1` | `newobj` / `js` / `js` | 3 | false | geometry |
| `root/obj-2` | `newobj` / `patcher` / `patcher` | 3 | false | geometry |
| `root/obj-2/obj-4` | `jsui` / `jsui` / `jsui` | 2 | false | geometry |
| `root/obj-2/obj-1` | `flonum` / `flonum` / `number` | none | true | class |
| `root/obj-2/obj-24` | `flonum` / `flonum` / `number` | none | true | class |
| `root/obj-2/obj-23` | `flonum` / `flonum` / `number` | none | true | class |
| `root/obj-3` | `newobj` / `patcher` / `patcher` | 3 | false | geometry |

The four geometry cases have zero candidates at their saved rectangle under
the existing `sameRect` predicate, exactly one source-compatible mapped
candidate, and all other coordinates equal. Their saved incoming and outgoing
route counts are both zero. Each numeric case has exactly one saved-geometry
candidate and fails the unchanged class allowlist. The remaining thirteen
descriptors match both class and geometry under the in-memory mapping.

| Anchor | Source box SHA256 | Source text SHA256 |
| --- | --- | --- |
| `root/obj-1` | `47b23e380478f1e93c6b234356c0fa2f472fa399cc583372ce1abbb9616188b0` | `490326e775bc3adc514c502064cb4b937c4122d2450e8b62c85f583077795a37` |
| `root/obj-2` | `e254f23d85b8ee207253f4dc1029b3edfc6f0c1a812bda01d40c8d2d6439d709` | `484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393` |
| `root/obj-2/obj-4` | `524b28f0b96fd76c10f82fa9f77f97758537b51d01698a5186e35842d9ba07e7` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `root/obj-2/obj-1` | `28fec7d46992171319a9ec22ab58a29f4bd64b37d0911c1737011b8ec6ada820` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `root/obj-2/obj-24` | `d26fc7fade06b3d6932ac9c355de12f1aaa240599fed6461867b5bfcfa81ed19` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `root/obj-2/obj-23` | `7d43f313c084a84dea7eac4e09e104439f9b21553a056c9d3858c8122b6e628b` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `root/obj-3` | `3622827a44f82021c6fdc23b03d27df271c3c9f9984a27b866204a10f93c49f6` | `bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a` |

| Anchor | Saved rectangle digest | Observed rectangle digest |
| --- | --- | --- |
| `root/obj-1` | `4f39e57126f4c857cccaa454c4ab0e63ba3242488875a7ce82e28a36a8473599` | `2bbedba5a709496a6e1b8b7252ad7551792415160de76c6243e424be2e44fecf` |
| `root/obj-2` | `d354caae9baa0021746491027a9c4aa1da57065450298612fc0a7b77682b0ceb` | `6dff8399adb73f3c4d2f1e05a7407d37381968cd2b51bdbb9eb2cc5ee9f849d3` |
| `root/obj-2/obj-4` | `340d5343c495ec0ef2df4cf661f7721c884d92e69f786c61876d64cc258789df` | `c4bfc3fab3c2e8957c0b09681ee183e78f32d3b524c9b4d8710ac11c17dcfd6a` |
| `root/obj-2/obj-1` | `8fcf2982f5c69c778c940dccf3fdaea0019d77ca05f69b6867da71b1f05f8ec5` | equal to saved |
| `root/obj-2/obj-24` | `0096550e8a7358d46eaf6b7e05238b1df060d90b50bf8a9c65ba87a1f3e7f763` | equal to saved |
| `root/obj-2/obj-23` | `620809c4f421f0cf433e13bd34bb01d5bf3cb08603635a78463b2694197b2f95` | equal to saved |
| `root/obj-3` | `d9aad27455a8969fb33a22e3689241f29c2d83d1eac360baf98c043f897e0e86` | `1b3974a5eef49edf4381887e103169ef36e333facb4d2ccab310ef62ea699926` |

All three numeric source descriptors have empty authored text. Their private
source initial scalars share digest
`1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121`
under the existing scalar-to-four-vector convention. This hashes saved source
defaults; it establishes no observed getter return or numeric mode.

| Helper | SHA256 |
| --- | --- |
| `helpstarter.js` | `a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8` |
| `helpname.js` | `49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa` |
| `helpdetails.js` | `31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1` |
| `helpargs.js` | `04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469` |

Canonical helper-map digest is
`ff07f2238fc6191f8d0399feef39caf918c825e6350255f9d5e7abc3ab0bf89e`.

## Controller Cause And Diagnostic Limits

`controller.js:443` records every candidate before attempting strict source
geometry/class resolution. Minus has no observed-geometry policy, so the four
changed rectangles have no admission path. It also has no controller numeric
representation policy. The three numeric candidates reach the exact saved
geometry, fail their original class allowlist and remain diagnostic rows.

`controller.js:490` aggregates hierarchy failures instead of stopping at the
first root mismatch. Its unique saved child-name fallback is diagnostic
traversal only, which permits Basic inspection despite the root geometry
failure. There is no tree-count, scope-count or unresolved-child diagnostic
among the seven rows. Together with the frozen traversal code and recorded
candidate inventories, this supports complete root4/Basic16 source traversal,
including the otherwise empty child scope. It does not claim live
post-install root8/Basic35 coverage: no harness/observer installation was
accepted for minus.

The final error at `controller.js:600` follows from the retained aggregate
diagnostics. `controller.js:775` keeps the existing bounded retry/refusal path;
`controller.js:680` records the harness error and false ACK. The actual error
is the hierarchy preflight error, not `bounded-helper-settling-timeout` and
not the runner's no-ACK timeout. The failure therefore supplies a concrete
geometry/class cause and gives no basis for increasing time or capacity.

No minus install trace exists. `controller.js:60` scopes that trace to the
specific plus-r1 command, so its absence does not imply a failed trace sink.
The ACK captures the terminal diagnostic arrays, not every earlier polling
attempt. Exact attempt count, when each object settled and intermediate
class/geometry stability remain unknown. The identical candidate arrays are
across rows in the terminal ACK, not proof of temporal stability.

The raw candidate rows contain no object reference, name, authored text, port,
capability result or patchcord identity. Their unique source mapping is an
offline correspondence, not proof that actual host wrappers remain identical
across traversal or calls. Source hashes and pristine graphs establish the
configured origin; they do not fabricate unrecorded live text/port/endpoint
observations. No entire-runtime inventory or simultaneous-state claim follows.

At `controller.js:345`, diagnostic numeric observations are explicitly bound
to times or plus; at `controller.js:461`, the numeric mismatch branch likewise
does not admit minus. Thus no minus `getattr("format")` or `getvalueof` result
is established by this harness path. Availability, thrown/returned status,
scalar versus array shape, finite value, format digest, source-default equality
and call silence are all unmeasured for these minus objects. Their class names
alone cannot answer any of those questions. V8 behavior, revision2 live state,
startup output and saved order are independently unknown.

Times and plus have the same structural counts and the same distribution of
four admitted geometry differences: three height changes and one width
change. They use the same helper map but different source and box pins. That
similarity identifies a useful design pattern, not transferable permission.
Neither prior controller shape evidence nor plus V8 success supplies a minus
capability, class alias, geometry policy or receipt tag.

## Smallest Next Design Boundary

Prefer a narrowly bound **diagnostic-only minus install collector**. Current
config already retains the complete pristine minus source views and hashes;
the existing controller already aggregates all seven failures and emits a
retained failed ACK. A collector can build on those observation boundaries
without adding geometry policy metadata to preparation, arithmetic readback,
lifecycle or V8 consumers. Exact file ownership and serialization changes
still require the next separate design/review; this is not an implementation
instruction to reuse times/plus authority.

The proposed `controller.js` plus `test_helpers.cjs` scope is feasible on the
inspected interfaces. Preparation already hashes current package files;
source metadata need not change to carry the nine-key pristine projection.
The runner retains false ACK bytes before refusing and therefore need not
accept a new admission schema. A dedicated optional diagnostic ACK field can
carry source/request-bound observations without changing the existing seven
strict rows or any geometry-policy consumer. Its exact schema and downstream
evidence audit still require design review. A two-file implementation should
not silently expand into new source factories, generic policy consumers or
new trace machinery.

The narrowest proposed trigger is exactly command101, minus-r1, owner4 and
`install-minus-r1` in a separately prepared/sealed capture. Instantiate a
per-install diagnostic closure outside `poll()`, where it persists across
eligibility retries; the existing per-poll validation pass is too short-lived
to enforce a whole-request call budget. Before the first attempted probe the
closure may retry incomplete eligibility. Once probing starts, latch it before
calling any capability and never reset that latch: at most three targets
times two method attempts total for that install, including throws, partial
results and queued callbacks. Never reuse prior poll observations as current
validation authority.

Keep that immutable collection outcome and any changed-currentness disposition
in the separate optional failed-ACK field, bound to the original command,
owner, source and collection context. Do not splice earlier results into later
`anchor_diagnostics`: those must remain the actual terminal strict diagnostics.
On unchanged observed inputs they remain the seven rows described here; if
later input changes produce different strict diagnostics, preserve that truth
and explicitly mark the earlier collection stale instead of forcing seven
rows or suppressing new failures. No result, including apparently correct
capabilities, permits successful validation or root binding in this design.

The next design should require these properties:

- Bind exactly minus/source/helper pins, the complete pristine projection,
  current configured definition and owner4, revision1, current request and
  original install action/step/path. Provenance is command101/capture008;
  future diagnostic calls must bind their own actual request and sealed work.
- Before any numeric call, establish complete root4/Basic16/full20 hierarchy,
  unique object candidates and the exact seven-case classification. Recognize
  only the four individually hash-pinned geometric differences and three
  exact saved-geometry numeric candidates for diagnostic targeting. Preserve
  all original expected classes and all seven failure rows. Additional,
  missing, duplicate or ambiguous candidates, changed source content or any
  unpinned difference suppress all target numeric calls.
- Keep diagnostic eligibility separate from install admission. In particular,
  do not pass the four geometry mismatches into `resolve` as successful
  geometry dispositions, mutate source allowlists, remove failure rows or set
  a satisfied cohort flag. No result combination may bind a working minus
  root, emit a successful install ACK or continue the score.
- Use fresh request-local target references and checked source/owner/path
  snapshots. Observe at most one format and one value call per selected
  numeric target in the bounded diagnostic pass; record actual status, shape
  and private result without assuming a method exists or predicting a return.
  Check currentness after host binding reads and each call, including the last,
  before retaining the result. Preserve partial diagnostics when a call or
  currentness check refuses. Do not assume repeated Max wrappers are stable;
  validate required identity in that future capture and refuse if unavailable.
- Specify once-per-request behavior across scheduled polling and queued
  callbacks, terminal refusal and latch ownership before adding the collector.
  Missing eligibility must not trigger partial probing, and a later poll must
  not turn an old diagnostic result into authority. Preserve all existing
  scheduling, ACK wait, refusal/timeout and trace capacity bounds.
- Keep raw results private and exactly retained/accounted for. Future audit
  must bind the complete response, command/ACK/journal/config/seal/archive and
  each source target, while public output contains only approved hashes,
  counts, classifications and equality predicates. No observed result is a
  receipt-tag claim or proof of seven-getter silence.

The alternative, four exact geometry policies plus three diagnostic targets,
is technically separable but larger. It requires exact minus-specific
source/helper/box/text/saved/live-rectangle and capture provenance admission
across every metadata/runtime/consumer boundary that receives those fields.
It still cannot admit the three numeric classes because their capability
evidence is absent. Prefer postponing that policy work until a diagnostic-only
capture provides independent controller observations, then design one
source-bound geometry plus measured controller cohort change if warranted.
Any eventual V8 exception needs its own observed V8 evidence and consumers;
the controller's observation shapes must never be copied into that gate.

Meaningful future refusal controls include: corruption of every source/helper/
owner/request/path pin; consistent corruption of both source views; duplicate,
missing or extra candidates; any unpinned rectangle coordinate or class;
changed defaults; transferred times/plus/minus-r2 metadata; incomplete child
traversal; unavailable/thrown/null/undefined/array/nonfinite/other capability
returns; request/source/owner/target mutation on the final call; endpoint or
wrapper replacement; queued callback after terminal refusal; and retained
diagnostic substitution after outer hash rebinding. A positive wholly
synthetic collection must still end with the original seven failures, zero
geometry dispositions and a false ACK, while proving the exact bounded call
count. Source-derived fixture bytes must remain in memory; disk fixtures must
be wholly synthetic. None of these tests or collector changes was performed
in this investigation.

## Capture Scope, Unknowns And Preservation

Local session counts agree with the supplied prefix: 52 accepted operations,
26 times and 26 plus, comprising four installs, 44 events and four closes;
48 live readbacks, 336 numeric states and 94 original outputs are reported.
The last accepted step is `close-plus-r2`. Journal counts are 52 step-complete,
44 stimulus, 94 receipt and one harness-error row, total191. There are
101 command records, including the failed minus install, and no minus
readback/root-proof observation files. All six aggregate validation flags
remain false; lifecycle completion and full comparison are absent. Complete
prefix parity is the separate capture auditor's responsibility.

Parent's capture record reports owned cleanup success, preference equality and
source/helper preservation. Its before/after capture inventory reports only
the008work root changed. This investigator independently inventories all28
arithmetic private roots before and after investigation, including names,
modes, sizes, mtimes, inode/ownership metadata, file hashes and link targets.
All28 roots and1,259 inventory entries are unchanged in the final comparison;
all sixteen current source hashes still match the frozen review map. Only
this investigation report is written. No source/test,
private/history or prior report edit, fixture copy, helper execution in Ultra,
preparation, archive, launch, capture, native action, commit or delegation is
performed. Current Python was used only for pure source reconstruction and
read-only validation under `python3 -B`.

Remaining unknowns are minus controller capabilities, object/reference
stability through those calls, runtime initialization history and all later
minus readback/event/close/V8 behavior. Parent-only separately reviewed,
sealed and owned capture rules persist. Full obligations remain78operations,
72live plus6empty checkpoints,504states,141original outputs,6independent
closes,90native cable deliveries and297typed receipts. Keep
`saved_order_observed=false`, qualification **0/2103** and zero increment.
No generic alias, timing/capacity expansion, diagnostic suppression or
denominator reduction follows from the four geometry measurements or this
recommendation.
