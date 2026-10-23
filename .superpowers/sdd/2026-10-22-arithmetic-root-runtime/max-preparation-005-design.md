# Arithmetic Max Preparation 005 Design

Design only, from the capture004 plus revision1 install refusal. Parent owns
implementation dispatch, preparation and runtime execution. Historical captures,
seals, manifests and reports remain immutable. No score event changes.

## Evidence Binding

| Item | Identity or SHA256 |
| --- | --- |
| Corrected004 ten-file package | `22d237c6efd59c8aa87acad901da09028999e369d62c89deb1cc3fe646da177a` |
| Capture004 REA evidence | `ev_ebf222bc4a6c33847e6667ce57f8dffcf8eb185e38e981a0efbfee44492f47a1` |
| Preparation004 manifest | `9b00b30ab36278e5e387bdac9deeb42364fdfa2948cf902be0a015488a04cd11` |
| Private004 config | `cc06829fbbd1e0e89888152e0f2d4407df5a4e9a3817d7aa7e3a1a40e5ac74fb` |
| Private004 seal | `c3f37c41129eead48fc0f97597731d2c9e3ae3596746ee8d9551ee89d0426e5c` |
| Private004 `observations/ack-request-51.json` | `ed2fe5493d43ee8d00ee06cb76bd39bf5ddbbe00723e9b8ed62730ab66394cd6` |
| Plus pristine source | `d1443c5af7ba8874c7b1d237e3d22bbe518970ad8ae85a09ec8f10494d084895` |
| Frozen score | `95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb` |

The private current command binds failed command51 to `install-plus-r1`,
operation action `install`, plus revision1 and the pinned source. The failure
ACK omits a step field, so it must not independently establish that identity.
The independent capture004 audit is a separate task; bind its frozen hash when
the parent supplies it before implementation is frozen.

Private source inspection recomputed the complete 20-box inventory, 16 Basic
descriptors and eight saved cables and matched the sealed configuration exactly.
The four helper hashes match the existing exact helper inventory. All seven
diagnostic expected classes and saved rectangles match the source. Every row
has exactly one candidate at saved X/Y; root rows contain four candidates and
Basic rows contain 16. These are facts from these arrays, not an explicit live
coverage witness absent from the ACK.

The ACK has seven anchor diagnostic rows, with candidate fields only `maxclass`
and `rect`. `geometry_dispositions`, `numeric_mode_observations` and
`controller_representation_observations` are all empty. It contains no numeric
preflight observation.

## Observed Plus Differences

Dimension indexes are zero-based: 2 is width and 3 is height. No private vectors,
numeric deltas, operands, defaults, helper arguments or authored text are stored
here.

| Anchor | Source runtime class | Actual controller class | Changed dimensions |
| --- | --- | --- | --- |
| `root/obj-1` | `js` | `js` | `[3]` |
| `root/obj-2` | `patcher` | `patcher` | `[3]` |
| `root/obj-2/obj-4` | `jsui` | `jsui` | `[2]` |
| `root/obj-2/obj-1` | `flonum` | `number` | `[]` |
| `root/obj-2/obj-24` | `flonum` | `number` | `[]` |
| `root/obj-2/obj-23` | `flonum` | `number` | `[]` |
| `root/obj-3` | `patcher` | `patcher` | `[3]` |

All four geometry anchors have zero saved incoming and outgoing routes. Each
geometry vector differs on exactly the listed dimension, with X/Y unchanged.
The three numeric anchors retain exact saved geometry.

| Geometry anchor | Saved rectangle SHA256 | Live rectangle SHA256 |
| --- | --- | --- |
| `root/obj-1` | `7c282ca427b38aa6bf81f9155d70ce5720fd0f12f6ab4ef4da21f6441c947cd6` | `da868357a7d43088775aeb0784d73cae93002d63fcabbd3ceddd53521cd20e84` |
| `root/obj-2` | `d354caae9baa0021746491027a9c4aa1da57065450298612fc0a7b77682b0ceb` | `6dff8399adb73f3c4d2f1e05a7407d37381968cd2b51bdbb9eb2cc5ee9f849d3` |
| `root/obj-2/obj-4` | `a421ba89c6cd1917427e84dbab006bf66255f8cf04f84b0b83de8c6c6b4646d2` | `ef478f664cd641a901af80ccc3be0b0f9a1388d863a267d636bdb72fd1a5908a` |
| `root/obj-3` | `d9aad27455a8969fb33a22e3689241f29c2d83d1eac360baf98c043f897e0e86` | `1b3974a5eef49edf4381887e103169ef36e333facb4d2ccab310ef62ea699926` |

| Anchor | Source box SHA256 | Source text SHA256 |
| --- | --- | --- |
| `root/obj-1` | `c4af8c73939eab75ed8940ff6b03159859ca0a782cd411601e0ea594db29d8e2` | `e86f190fbc376badcc5d7b14a552d4e84fad436e0789bb2c7cc221fa38bf9390` |
| `root/obj-2` | `bbc5fe757f0ef027839d4a09709a97b50451ae9a5fec7d7f38aa810d53ce9f92` | `484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393` |
| `root/obj-2/obj-4` | `d9b8da7ef51019bd5837726c704eda09de39cffe89f08bd61e32811cde5acd0f` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `root/obj-2/obj-1` | `c873e45cc1ebc4c71b93a736b509fc0f622d4764df74edb3a21f5bad4d999a78` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `root/obj-2/obj-24` | `d84cf4a6a5daa8db1d4b2616b5c1f94385a15d274a80be64ca07ddcb728d8cb3` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `root/obj-2/obj-23` | `5b0e92ade41a0633d5d5dc178c9fd1ebc519f7014d331e4a924afff0dfe07982` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `root/obj-3` | `310417ef44ee7139be2082fc5bbc63c5a65dfa5d10ab54894b29fe164b84c100` | `bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a` |

| Numeric anchor | Exact saved/live rectangle SHA256 |
| --- | --- |
| `root/obj-2/obj-1` | `97bd3d008866faa2c6cdc5bf0de64333c64bd29bf79bae29b6ae070ec6823267` |
| `root/obj-2/obj-24` | `14acfb0d484e461a00397ecfb34329cfe8167d5e47b6360edbd54f0fabbd91bc` |
| `root/obj-2/obj-23` | `38b2cd4242257c9f9802ef997eccb7d32e451c1b05f37868136baa42fb89636c` |

## Minimal Recommended005

Add four separately plus-bound `plus-observed-geometry-v1` accommodations using
the existing exact measured-geometry mechanism. The binding includes plus
source, exact helper inventory, anchor, source box/text hashes, source/runtime
class, saved/live vector hashes, exact one changed dimension, zero saved routes
and immutable004 evidence. Read approved vectors privately from004; no vector
copy enters public source or reports. Equal vectors shared with times do not
transfer source, helper-argument or anchor authority.

Update every existing geometry-policy consumer: preparation/checkpoint
validation in `arithmetic.py`, controller resolution in `controller.js`,
readback/preclose validation in `v8-readback.js`, and independent stdlib retained
history/close validation in `lifecycle.py`. Keep the existing times branch and
evidence intact. Source descriptors remain `flonum`/`patcher` as authored; actual
runtime classes remain raw. A geometry policy grants no V8 class admission.

Add a separate plus-only branch to the existing read-only controller numeric
preflight diagnostic. Its only targets are the three exact numeric anchors
listed here. Before either capability call, validate pinned plus source/helper,
source box/text/saved-rectangle hashes, source class `flonum`, actual class
`number`, a unique candidate with exact saved geometry, and a complete matching
install identity. That identity includes a positive finite integer request,
exact `install-plus-r<revision>` step, action/document/revision, unique configured
document, working owner/path/source and the correct lifecycle inlet (plus
revision1: 2, plus revision2: 3). Each owner is validated separately; no observation
is inferred across
revisions. The immediate target is the observed plus1 failure. Wrong or missing
identity suppresses capability calls and retains strict refusal.

Keep the current capability result schema and faithfully retain unavailable,
throwing, null, undefined, ambiguous-array, nonfinite and other outcomes. Invoke
only `getattr('format')` and `getvalueof()` after the binding checks; no setter,
input message or observer attachment. Keep these private observations diagnostic
only: source/runtime expected classes are unchanged, and `number` still causes
the aggregate install refusal. Do not add a plus numeric representation policy,
semantic float basis or successful numeric-mode observation.

With otherwise unchanged live objects, the next failure should contain three
numeric anchor diagnostics with capability observations and four exact geometry
dispositions. The original seven004 refusal rows remain immutable. Preserve all
collected failure context through later errors. Existing traversal can already
reach the three numeric anchors via the unique saved child name despite root
geometry refusal; a diagnostic-only change that leaves all four geometry
failures intact is a smaller fallback. The recommended scope admits only the
four measured geometry differences and gathers the missing numeric evidence.

## Capabilities Still Absent

Capture004 establishes no plus live format value or return representation,
getter availability/status/value/shape, source-default equality, controller
numeric admission, V8 numeric/getter/root `jpatcher` evidence, completed install,
readback or preclose. It observes plus revision1 only. Minus remains unobserved
and strict. Controller `patcher` evidence cannot authorize V8 `jpatcher`.

The preflight precedes observer binding, so its journals cannot prove absence of
getter emissions for the unmonitored plus controls. Preserve
`receipt_tag_observed=false`; make no silence, parity, saved-order or new
qualification claim. The existing score and six-owner lifecycle are unchanged.

## Affected Files And Verification

Implementation files: `arithmetic.py`, `controller.js`, `v8-readback.js`,
`lifecycle.py`. Tests: `test_preparation.py`, `test_helpers.cjs`,
`test_lifecycle.py`, all under
`experiments/max-reference/arithmetic-roots-runtime-20261022/`.

- Follow the existing private immutable-evidence loader pattern. Verify004
  ACK/config/seal/manifest/package/source/helper bindings and sealed bytes;
  reject altered, symlinked or escaped private inputs and print hashes/counts
  only. Parent supplies the frozen independent audit binding.
- Exercise all four plus geometry pins in all four consumers. Reject changed
  source/document (including times/minus), helper, anchor, box/text hash,
  evidence, saved/live vector, changed axis, route counts, class or owner.
- Verify exactly three plus diagnostic targets with exact geometry and identity,
  strict class refusal, and private capability observations. Test malformed
  request/step/revision/owner/path/source, duplicate/ambiguous candidate and
  missing/incomplete inventory cases; none may call a getter.
- Test available scalar/array and unavailable/throw/ambiguous capability results
  without changing their meaning. Assert no setters, messages, numeric admission
  or descriptor rewriting, and retain failure context after subsequent errors.
- Run focused Python preparation/lifecycle and Node helper suites plus syntax
  checks. Preserve existing times behavior, complete Basic retention and strict
  minus behavior. Preparation005 and a real runtime launch belong to the parent.
