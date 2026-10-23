# Preparation008 Plus V8 Design

This design specifies a source-bound plus V8 exception for exactly three
numeric objects and two root containers. It is design only, authorized by
`max-preparation-008-design-brief.md`. Implementation, policy admission,
preparation, launches, capture and commits require later authorization.
Earlier evidence and records remain immutable.

## Scope And Evidence Boundary

The proposed implementation changes exactly six existing files under
`experiments/max-reference/arithmetic-roots-runtime-20261022/`:

| File | Responsibility |
| --- | --- |
| `arithmetic.py` | Independent007 loader, source metadata production, exact plus policy/witness/checkpoint and Basic-retention validation, trusted causing-operation conjunction |
| `v8-readback.js` | Complete preflight, honest diagnostics, separate request-local admission, live readback and fresh pre-close witnesses, existing retention consumers |
| `lifecycle.py` | Independent standard-library plus policy/witness, Basic-retention and root-close validation |
| `test_preparation.py` | Loader, metadata, checkpoint, provenance and semantic corruption controls |
| `test_helpers.cjs` | V8 request lifetime/capability/retention controls and frozen controller coexistence/regressions |
| `test_lifecycle.py` | Independent close/proof/owner/history and corruption controls |

`controller.js`, runner, comparator, lifecycle observer, score and native files
stay frozen. There is no runtime dependency on this design, a specification
contract, an audit's prose, or executing historical Python/JavaScript code.
Evidence reports are checked as pinned bytes; validators encode their own
exact source/evidence tables and schemas.

Accepted007 establishes a successful controller install51 followed by a failed
V8 readback52. The historical raw envelope remains `success=false`,
`error_code="numeric-readback-refused"`, null numeric-mode observation and
diagnostic `strict_mismatch=true`. ACK52 is protocol success only. Complete
root8/Basic35 diagnostic coverage establishes neither a successful checkpoint
nor the full seven-getter silence gate, startup output, saved order, scalar
receipt tags, plus events/closes or revision2 live state.

Accepted audit SHA256 is
`2e96fed0d6acd58fff7b033a17294c1ccc54e15a56590862a142fe723eac704e`;
investigation SHA256 is
`dacc776b2429cab7f76f44a589a131cc3b89dd624afbc25c2c85b98116a62d12`.
The brief supplies parent-verification binding
`097f03f2aed69c63b54d747d714cdd2af4e66e509b39fab7007f0ac1787dccfd`;
this design does not claim to have located a separate file with that hash or
make it a loader dependency. The parent retains the complete REA response;
this design uses accepted reports and local immutable evidence without a new
REA lookup, target probe or capture.

## Exact Shared Vocabulary And Pins

Every object schema below has exactly its listed keys. Unknown, missing or
duplicate members refuse. Arrays retain multiplicity; object-key order is
irrelevant. JSON identity/count fields are positive or bounded integers as
specified: Python uses `type(x) is int`, JavaScript uses integer `Number`
checks, and booleans/strings/null never qualify. Numeric observations and
rectangles require actual finite numeric scalars, excluding booleans. Paths
must bind the exact configured private owner and existing path comparison;
arbitrary normalization cannot introduce another owner.

`H4(v)` means the existing normalized four-number geometry digest: reject
wrong length, booleans and nonfinite values, normalize whole-valued coordinates
to integers, then hash compact JSON matching JavaScript `JSON.stringify`.
`Hs(x)=H4([x,0,0,0])` privately pins a scalar. `C(x)` below is compact,
UTF-8, sorted-key JSON after recursively applying the same whole-number
normalization; arrays preserve order. It is used only for source-projection
hashing, with no nonfinite numbers allowed.

`S` is plus source SHA256
`d1443c5af7ba8874c7b1d237e3d22bbe518970ad8ae85a09ec8f10494d084895`.
`T0` is empty-text SHA256
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
`D0`, the common initial-scalar digest, is
`1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121`.
`F0`, the independently measured V8 format-scalar digest, is
`dcdadd560ab2234a2bf2d2b5ed44e5d7640e88eefe6bdbc98aa84aaf31649983`.
No raw default, mode, operand, licensed body or rectangle is reproduced here.

`H` is the exact four-name helper SHA256 map:

| Name | SHA256 |
| --- | --- |
| `helpstarter.js` | `a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8` |
| `helpname.js` | `49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa` |
| `helpdetails.js` | `31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1` |
| `helpargs.js` | `04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469` |

`E007` is an exact object with the following fields and values. It records the
failed diagnostic observation that motivates the exception, never a future
request's live proof.

| Field | Exact Value |
| --- | --- |
| `raw_sha256` | `87459a07efa7a7f8d0bdcaba10148f138369d080104324e520cc7fb1aaf1fd71` |
| `install_ack_sha256` | `ba39c2e9b59c9983d938cb8e500f05aef3b82af830558548e50ef97d31df1a82` |
| `readback_ack_sha256` | `1c4dcdb18ed66194264e9fbfe914664c636ab066375636647cb4d3038fb62f01` |
| `command_sha256` | `be98938644e0ee42eabb329709effcc5ce40d32c6007ee4e139f6856ce7eab28` |
| `config_sha256` | `eb44b4930d0bb2504f9739367dad7b144c12b1baada9ac8d37f8bde127ae550b` |
| `seal_sha256` | `cedafaa9aa57b066b7fa19b95580c08b884ef2267bec42c6143429bbd41a9641` |
| `manifest_sha256` | `73b623f8893e5758f8f74cbc4c41f599e291c12cb9d3a662c572d55fcc40bc7f` |
| `historical_binding_sha256` | `97a59c54d9185b47c417c876b12ac8b8ebc4734bb80ad7b439e6e5790aaf991b` |
| `historical_files_sha256` | `f01f727c2f17b10175de23da47a536e6a10f19d609bb7d0e92add241811fedac` |
| `package_sha256` | `121d5aa5e3056337306bbe2d7a2771221f53e7adb9750572d934d20ac8a8c978` |
| `controller_sha256` | `da4473ac8014f39fd255b830121508738c16980b6e303fb0a9b8c963ce0f13a8` |
| `reader_sha256` | `7d857163d254c82ecbc02b6cd3ff43be1fdf9f67ed09ddf6eb554a7d87c175fa` |
| `trace_sha256` | `bc0e23dc19b130b4bcfe09777a74e56a48f62a9d39860cae7fdc8d3e1a837185` |
| `audit_sha256` | `2e96fed0d6acd58fff7b033a17294c1ccc54e15a56590862a142fe723eac704e` |
| `investigation_sha256` | `dacc776b2429cab7f76f44a589a131cc3b89dd624afbc25c2c85b98116a62d12` |
| `rea_evidence_id` | `ev_c19e98841d00f4654a6c405a8d80067f1d966cf11a11106234b93a05a70c13a5` |
| `observation_role` | `failed-install-readback-diagnostics` |
| `observed_revision`, `observed_request_id`, `observed_operation_request_id` | integer `1`, `52`, `51` respectively |
| `raw_success`, `raw_error_code`, `observed_strict_mismatch` | boolean `false`, `numeric-readback-refused`, boolean `true` respectively |

The dedicated V8 numeric pin table `N` has exactly these three anchors. Each
also pins `source_text_sha256=T0`, `initial_numeric_sha256=D0`, source class
`flonum`, source runtime descriptor `flonum`/`["flonum"]` and actual V8 class
`number`. Saved and measured-live rectangles are equal for these members.

| Anchor | `source_box_sha256` | `saved_rect_sha256` |
| --- | --- | --- |
| `root/obj-2/obj-1` | `c873e45cc1ebc4c71b93a736b509fc0f622d4764df74edb3a21f5bad4d999a78` | `97bd3d008866faa2c6cdc5bf0de64333c64bd29bf79bae29b6ae070ec6823267` |
| `root/obj-2/obj-24` | `d84cf4a6a5daa8db1d4b2616b5c1f94385a15d274a80be64ca07ddcb728d8cb3` | `14acfb0d484e461a00397ecfb34329cfe8167d5e47b6360edbd54f0fabbd91bc` |
| `root/obj-2/obj-23` | `5b0e92ade41a0633d5d5dc178c9fd1ebc519f7014d331e4a924afff0dfe07982` | `38b2cd4242257c9f9802ef997eccb7d32e451c1b05f37868136baa42fb89636c` |

The four root guards are independently pinned, including the ungated roots.
Only `root/obj-2` and `root/obj-3` form V8 root policy table `R`.

| Anchor | Authored / Source Runtime / Actual V8 | Source Box SHA256 | Source Text SHA256 |
| --- | --- | --- | --- |
| `root/obj-1` | `newobj` / `js` / `js` | `c4af8c73939eab75ed8940ff6b03159859ca0a782cd411601e0ea594db29d8e2` | `e86f190fbc376badcc5d7b14a552d4e84fad436e0789bb2c7cc221fa38bf9390` |
| `root/obj-2` | `newobj` / `patcher` / `jpatcher` | `bbc5fe757f0ef027839d4a09709a97b50451ae9a5fec7d7f38aa810d53ce9f92` | `484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393` |
| `root/obj-3` | `newobj` / `patcher` / `jpatcher` | `310417ef44ee7139be2082fc5bbc63c5a65dfa5d10ab54894b29fe164b84c100` | `bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a` |
| `root/obj-4` | `jsui` / `jsui` / `jsui` | `bff84f2c0e682d712f384b4d5f73017bcc936392a7d0b981ec4ef8ef7a3deb29` | `T0` |

| Anchor | Saved Rectangle H4 | Measured Live Rectangle H4 |
| --- | --- | --- |
| `root/obj-1` | `7c282ca427b38aa6bf81f9155d70ce5720fd0f12f6ab4ef4da21f6441c947cd6` | `da868357a7d43088775aeb0784d73cae93002d63fcabbd3ceddd53521cd20e84` |
| `root/obj-2` | `d354caae9baa0021746491027a9c4aa1da57065450298612fc0a7b77682b0ceb` | `6dff8399adb73f3c4d2f1e05a7407d37381968cd2b51bdbb9eb2cc5ee9f849d3` |
| `root/obj-3` | `d9aad27455a8969fb33a22e3689241f29c2d83d1eac360baf98c043f897e0e86` | `1b3974a5eef49edf4381887e103169ef36e333facb4d2ccab310ef62ea699926` |
| `root/obj-4` | `54f83aaab9e2c42a561a2ccf3d705fb635c1c363d5ee0f1cac7a33a87d7debb9` | same as saved |

## Source Projection And Five Policies

Before any admission probe, bind the complete pristine source projection:
`{document:"plus",source_sha256:S,helper_sha256:H,basic_anchor:"root/obj-2",
basic_varname:"basic_tab",boxes,full_inventory,saved_edges,observer_leaves}`.
Here the first three arrays come directly from `source_inventory` on pristine
bytes, before adding policies; the last array is the existing ordered leaf
construction over every box outlet. SHA256 of `C(projection)` is exactly
`ba8d3d1ec23265bd75f16641fa95668466888d4033811fda95bcdef757da600f`
(18,683 canonical bytes; 16 boxes, 20 full entries, 8 saved edges, 19 leaves).
Each consumer independently pins this digest and computes the same projection.

The runtime projects explicit pristine descriptor keys, rejecting other keys
except individually validated existing geometry/controller metadata and the
new policies. `boxes` retains its pristine `id`, role and initial value;
`full_inventory` retains its pristine child, source-varname and saved-route
fields. The only non-pristine full-entry initial-value copies are the three
existing controller members, checked against their corresponding boxes.
This prevents consistent corruption of both descriptor views from passing.
Compare corresponding class/runtime classes/rectangle/box+text hashes/authored
text+empty/inlets/outlets, and numeric initial value/policy on the gated three;
do not require whole-object equality between structurally different views.
Bind each Basic `anchor` to `root/obj-2/` plus its exact `id`.

Use the existing field names `v8_numeric_representation_policy` and
`v8_root_representation_policy`, with independent plus-specific factories,
pin tables and validators. A numeric policy has exactly:

```text
kind: "plus-v8-numeric-representation-v1", engine: "v8", document: "plus",
source_sha256: S, anchor: N member, source_class: "flonum", runtime_class: "number",
source_box_sha256, source_text_sha256: T0, saved_rect_sha256, initial_numeric_sha256: D0,
helper_sha256: H, evidence: E007,
format_method: "getattr", format_attribute: "format", format_representation: "scalar-number",
format_value_sha256: F0, getter_method: "getvalueof", getter_representation: "scalar-number",
finite_required: true, initial_equality_action: "install"
```

A root policy has exactly:

```text
kind: "plus-v8-root-representation-v1", engine: "v8", document: "plus",
source_sha256: S, anchor: R member, source_class: "newobj", runtime_class: "jpatcher",
source_box_sha256, source_text_sha256, saved_rect_sha256, live_rect_sha256,
helper_sha256: H, evidence: E007, source_runtime_class: "patcher",
saved_rect: pristine rectangle, live_rect: exact privately measured rectangle,
source_varname: "basic_tab" for root/obj-2 or "q_tab" for root/obj-3,
saved_incoming_routes: 0, saved_outgoing_routes: 0
```

Unassigned hash fields come from that anchor's dedicated table. Root source
runtime allowlists remain `["patcher","p"]`; numeric allowlists remain
`["flonum"]`. Every source descriptor, authored string, port and raw class
stays intact. Preflight retains and independently validates the complete
existing three-member controller cohort in both views and four geometry
policies in their existing views. These new policies confer no geometry or
controller permission.

Complete plus metadata requires exactly three numeric policies in `boxes`,
identical three copies in `full_inventory`, and exactly two root policies in
`full_inventory` only. No V8 policy may appear on another descriptor, leaf,
view or document under a plus kind. Reject partial, duplicate, extra, malformed
or transferred sets and changed defaults/source copies before target
capabilities. Existing times policies continue their exact existing path.
Old plus metadata with no new V8 policies remains diagnostic-only and refuses;
absence never synthesizes policies from controller or times metadata.

## Independent Private007 Loader

`arithmetic.py` reads only the fixed private work
`/home/venetanji/.cache/alive-ultra-evidence/arithmetic-max-runtime-007` and
archive `/home/venetanji/.cache/alive-ultra-evidence/arithmetic-package-007-historical`,
plus pinned manifest/audit/investigation bytes. Require regular confined files,
reject links/traversal/type/schema changes, and use the existing strict JSON
parser with duplicate-key/nonfinite rejection. Encode the exact007 key sets
for config, seal, archive binding, commands, ACKs, owners, diagnostics and rows.
Do not validate new source metadata by recursively calling `source_metadata`.

Validate provenance and meaning together:

1. Check every `E007` artifact hash, raw byte length5,350, and byte equality of
   `observations/request-52-plus-r1.json` and
   `observations/retained-request-52-plus-r1.json`. Preserve the exact failed
   envelope, including strict mismatch, rather than converting ACK52 to success.
2. Validate archive `binding.json`, its exact sixteen-file map and every
   consumed file's bytes. Recompute the ten-file subset/package digest from
   this historical map, and require equality with archive/config/seal/manifest.
   Require frozen full-score digest
   `95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb`.
   Never use current `package_binding()` or `verify_private()` for historical
   bindings:008 implementation will legitimately change current package bytes.
3. Require exactly22 sealed inputs: config, controller, driver, lifecycle
   observer, observer and V8 reader; four named helpers; twelve pristine/working
   document revisions. Check each sealed byte hash and the source/helper/script
   correspondence, including consumed controller and reader versus the archive.
4. Independently validate all six owners in exact inlet order0..5: times1/2,
   plus1/2, minus1/2. Check owner schema including channel/root-proof path,
   revision/source/working path and generated private path identities; plus-r1
   is inlet2. Require one exact plus-r1 definition and exact pristine/working/
   Windows path binding. Read pristine bytes, require `S`, call `source_inventory`,
   and reconstruct legacy004 geometry plus006 controller additions with pure
   pinned validators. Compare complete saved views/edges/leaves; invoke no new
   metadata loader while reconstructing historical007.
5. Require exact command52 readback/install/`install-plus-r1`, operation51,
   plus action/source/revision1, output path and owner2. Require ACK51 install
   success with original mismatches plus its separately satisfied three-member
   cohort, source-default comparisons and four geometry dispositions. Bind its
   private trace to the pinned007 bytes and exact existing chronology: ten
   fresh passes, sixty returned calls and one final bind. ACK52 remains dispatch
   success for request52/step only, independently of raw content refusal.
6. Reconstruct the complete diagnostic envelope from source: exact request52/
   operation51/action/step/source/helper identities, four root and three numeric
   rows, full root8 and Basic35 coverage with all exact coverage fields, and
   `receipt_tag_observed=false`. Root1/root4 retain both raw unnamed candidates
   (`js` and `jsui`) with exactly one geometric match; named roots have one raw
   candidate each. Counts of geometric matches, raw candidates and unique object
   identities are separate. Reject unexpected classes rather than filtering
   them away. Pin all four source/class/text/box/saved/live root relations.
7. Require each numeric row's exact candidate/source/geometry/probe fields,
   actual class `number`, returned finite scalar-number `getattr("format")`
   and `getvalueof` observations, `Hs(format)=F0`, and private source-default
   equality with `Hs(initial)=D0`. Preserve original expected `flonum` and
   patcher allowlists and the resulting mismatch flag. Return only the validated
   private measurements needed to construct new policies, never an admission
   witness for another request or revision.

Hash-rebound synthetic corruption tests must reach these semantic checks;
checking the pinned outer hashes alone is insufficient. No trace, journal or
report is rewritten, and no loader result asserts full-getter silence.

## Request-Local Runtime Admission And Freshness

Raw diagnostics continue reporting their original expected-vs-actual classes.
For the observed five differences, `strict_mismatch` remains true. Introduce
a separate local satisfied-five-policy result; do not clear that flag, drop
rows, broaden class allowlists or alter actual classes. Both readback and
pre-close gate on the separate result. Failure retains the existing diagnostic
prefix and refusal envelope. A successful serialized witness records raw
source/actual classes; serialized diagnostics never serve as authority.

Create a fresh private closure/pass inside each `collectReadback` and
`collectLifecycleProof` invocation. It captures object identities and immutable
copies of request primitives, original and normalized close request, owner row/
map, selected and configured definition, helpers/policies/source projection,
root reference/path/top-level binding and all selected live object references.
The complete five-policy/source-set preflight precedes host traversal and all
target capabilities. Root8 and Basic35 traversal must then establish complete
unique names, expected classes and exact admitted geometry for all originals,
leaves and harness objects before positive admission probes.

Keep diagnostic collection separate from admission. The legacy no-new-policy
path may produce its bounded diagnostic observations and then strictly refuse.
A malformed/partial/extra new set, bad source/owner/binding or incomplete live
inventory suppresses target format/value calls and retains the diagnostic
prefix available before failure. An exact new set admits only the three `N`
objects and two `R` roots; any additional source/class/geometry mismatch refuses.

The pass performs each gated format and value call once, using the same
captured object/source/request bindings. Compare current inputs with captured
identities and data after existing binding reads, after every capability call
(including the last getter), before witness issuance, before witness
consumption, and before returning the complete checkpoint/close proof. Recheck
live root path/top-level and selected object identity/class/geometry using
existing traversal/property APIs, without repeating gated `getattr`/`getvalueof`.
A last-getter mutation of request, owner, descriptor, configured definition,
helper, root, path, class or geometry must refuse even if all returned values
are individually valid. Final checks also cover mutation during later graph/
retention reads. This is ordered observation, with no simultaneous-state claim.

The closure alone issues and consumes its witness once. A standalone diagnostic
object, copied/forged witness, previous invocation, changed owner or serialized
round trip cannot become authority inside the pass. Keep no global witness
cache or reusable issued-reference registry. Exported test helpers must not
offer a path that promotes caller-supplied diagnostics into an admitted witness.
The serialized proof is independently validated by Python consumers as data.

## Exact Fresh Witness And Consumer Rules

Store the witness in the existing `v8_representation_witnesses` field. Its
exact top-level keys are:

```text
version: "plus-v8-representation-witnesses-v1", engine: "v8",
request_id, operation_request_id, step_id, action, action_document, action_revision,
document: "plus", revision, source_sha256: S, helper_sha256: H, working_path,
root_is_top_level: true, receipt_tag_observed: false, evidence: E007,
inventory_coverage: {root: coverage(8), numeric: coverage(35)}, numeric: [3 N rows], roots: [2 R rows]
```

`coverage(n)` is exactly `{complete:true,status:"complete",observed_count:n,
complete_count:n,limit:n}`. Each numeric row has exactly:

```text
anchor, source_box_sha256, source_text_sha256: T0, source_class: "flonum",
actual_runtime_class: "number", live_rect: exact saved rectangle,
candidate_count: 1, candidate_count_complete: true, geometry_matches: true, receipt_tag_observed: false,
format_observation: {method:"getattr",attribute:"format",status:"returned",representation:"scalar-number",value:f},
value_observation: {method:"getvalueof",status:"returned",representation:"scalar-number",value:v}
```

Require finite `f` and `v`, `Hs(f)=F0`; on every install, `v` equals that
pristine source default. Events and closes require fresh finite actual state
and exact format, permitting evolved values. Arrays, null, undefined, throws,
unavailable/other/nonfinite shapes are refused for gated V8 members.

Each root row has exactly `anchor,source_box_sha256,source_text_sha256,
source_class:"newobj",actual_runtime_class:"jpatcher",varname,live_rect,
candidate_count:1,candidate_count_complete:true`, with exact `R` source hashes,
source varname and privately pinned live geometry.

Require fresh actual request IDs, matching raw/proof IDs, source/helpers/path,
action document `plus`, integer revision1 or2 and owner inlet `revision+1`.
Install steps are `install-plus-r1/r2`; events are `plus-A01`..`plus-A20` for
r1 and `plus-A21`..`plus-A22` for r2; pre-close steps are `close-plus-r1/r2`.
Readback uses `op="readback"` and its actual causing-operation ID. Close uses
`op="operation"` and `request_id==operation_request_id` for a newly collected
proof. The historical52 observation is policy provenance only; it cannot
satisfy a future event, revision2 or close witness.

`arithmetic.py` validates raw/witness agreement independently and, in
`extract_checkpoint`, conjoins it with the already supplied trusted
`request_record` fields (request/causing operation/step/action/action document/
revision/document/source/path). Inspect the trusted record before updating it
with retained-byte fields. Its causing-operation chain originates outside raw
data; agreement of two attacker-supplied IDs is insufficient. Existing frozen
runner/comparator checks remain required; no runner/comparator edit is needed.

For live readback, consume the same three validated values once into the seven
numeric states. Obtain the other four authored-number getters through the
existing path; require their existing shapes, integral semantics and exact
class/identity rules. Keep source-based float semantics for the gated three,
the existing semantic-basis string, and `receipt_tag_observed=false`. Require
the full Basic graph/retention and existing journal `seq_before==seq_after`
silence gate for every successful checkpoint. Bounded diagnostic silence in007
cannot substitute for this gate.

For pre-close, collect a new three-numeric/two-root witness in that close call
and combine it with the existing complete Basic/root retention/endpoints.
Do not reuse readback witnesses or add four nongated numeric getters to the
existing pre-close obligation. Preserve the existing outer close schema and
score semantics. `lifecycle.py` independently validates plus owners2/3,
policies, exact five witness rows, source projection and full Basic/root proof;
it does not import `arithmetic.py` or trust a previous checkpoint validator.

All consumers retain sixteen originals and nineteen leaves, all nongated
objects, authored text/hash/empty flags, ports, source geometry or separately
validated geometry, exact duplicate-sensitive input/output route multisets,
all four roots and four harness identities/classes/geometry, valid object
bindings and complete close histories. Keep six independently proven closes.
No generic `flonum->number` or `patcher->jpatcher` alias is introduced.

## Test-First Controls And Verification Boundary

Later implementation must observe meaningful RED failures before production
changes, then pass these groups in the six-file scope:

| Group | Required Controls |
| --- | --- |
| `plus007_loader_provenance` | All artifacts,22 sealed inputs,16 archive files,10 package files, full score, exact paths/link/type/schema rejection; semantic mutations with outer hashes deliberately rebound |
| `plus007_failed_diagnostics` | False success/error/null envelope, raw-retained byte equality,52/51/owner2/source/helper binding, exact8/35 coverage,4root/3numeric rows, both unnamed raw candidate lists and unique geometric identities |
| `plus_v8_policy_set` | Each policy field/kind/provenance/source/default/mode/geometry,3+3numeric copies/2root-only policies, duplicate/extra/missing/transferred sets, whole-source projection and differing view shapes |
| `plus_v8_preflight` | Invalid source/owner/request/configured definition/inventory suppresses target calls and retains diagnostic prefixes; old complete controller-only fixture remains strict diagnostic refusal |
| `plus_v8_capability_shapes` | Exact scalar format/value, finite/default equality; singleton/multiple arrays, strings, booleans, null, undefined, unavailable, throws, NaN/infinity and wrong private mode refuse |
| `plus_v8_request_lifetime` | Install/events/r2 with current IDs and evolved event state; wrong step/action/revision/path/source/helper/owner refuse; forged/copied/prior-pass diagnostics/witnesses cannot be consumed |
| `plus_v8_last_getter_currentness` | Synchronous final getter mutates request, original close request, owner/map, descriptor/policy/default, configured definition, helpers, root/path/top-level/class/geometry; each refuses before consumption with no second gated calls/global reuse |
| `plus_v8_full_readback` | Successful synthetic seven-state checkpoint, exact three reused values and one call per gated method, four other getters, full endpoint/retention validation, existing journal-silence failure and source-based semantics/receiptfalse |
| `plus_v8_fresh_close` | Independent fresh close IDs/owners2/3 and five witnesses; stale readback/wrong close/history/revision refuse in runtime and independent stdlib consumer; no added four nongated close getters |
| `plus_v8_retention` | Nongated classes/text/empty/ports/geometry, missing/duplicate originals/leaves/routes, wrong endpoint/port, extra cables, raw root candidates/classes, root/harness identity/multiplicity/top-level failures |
| `plus_v8_controller_coexistence` | Adding only admitted V8 metadata preserves frozen controller cohort diagnostics/satisfied dispositions/result lifetime/trace/latch and queued failure behavior; source rewrites or times/controller permission transfer still refuse |
| `arithmetic_regressions` | Every prior P1/P2/source-root/ownership/trace/queued-failure test, times and minus paths, all existing suites and syntax checks, exact authorized6-file delta and preservation checks |

Use synthetic private-state fixtures for positive and semantic-negative tests;
do not print licensed values or depend on live target calls. Tests compare
relations, classes, shapes, identities and hashes. Fresh source reconstruction
must reproduce the fixed projection digest independently of metadata factories.
Post-change full existing suites are required, not only newly named groups.

The complete denominators remain78 operations,72 live plus6 empty checkpoints,
504 numeric states,141 original emissions and6 closes; native evidence remains
90 cable deliveries/297 typed receipts. Qualification stays0/2103 with zero
increment. Keep10-second ACK wait,100ms schedule,70 refusal/80 timeout attempts,
10 polls/5 stable passes,2048 trace records,2048 ASCII bytes per record,2MiB
total, terminal failure latch and exact process ownership/cleanup unchanged.

After design acceptance, the remaining gates are separate bounded
implementation briefs, test-first verification, frozen diff/map, independent
review/fixes, final historical008 archive, fresh preparation, separate concrete
review, parent-only capture and independent audit. This artifact authorizes
none of those actions and makes no admission or successful-capture claim.
