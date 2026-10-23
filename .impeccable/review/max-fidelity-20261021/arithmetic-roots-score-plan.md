# Times/Plus/Minus Full-Root Score Plan

Planning-only follow-up, 2026-10-22, limited to ranks 1-3 of
`next-help-roots-map.md`: times, plus and minus. The proposed score has 22
programmatic actions and four owner lifecycle operations per root, or **78
declared native operations** across the three roots. All numeric stimuli below
are original proposed inputs. These are expected observations to establish in
a future capture, not measured results or installed-root qualification.

Only this planning document is added. No importer, source allowlist, runtime,
harness or qualification counter is changed. No Max, native scorer, product,
test, browser, screenshot or clipboard action was run. The three installed
sources were read as private data only after their bytes matched the map's
digests; they were checked again before the final metadata projection. No XML
or other installed help source was read. Authored creation values, helper
strings, prose and complete patch graphs are not reproduced here.

## Source Identity And Complete-Tree Binding

Installed paths are relative to the existing licensed local resource root:
`/home/venetanji/.wine-ableton/drive_c/ProgramData/Ableton/Live 12 Suite/Resources/Max/resources`.

| Rank / Safe Page ID | Max Class | Source | Bytes | SHA-256 | Basic / Question Scope |
| --- | --- | --- | ---: | --- | --- |
| 1 / times | `*` | `help/max/times.maxhelp` | 22249 | `1eea3861a1605453fb3ed4daa4660f71e175fb2cf16ce4c4098cb53c5b94d54b` | `root/obj-4` / `root/obj-1` |
| 2 / plus | `+` | `help/max/plus.maxhelp` | 22248 | `d1443c5af7ba8874c7b1d237e3d22bbe518970ad8ae85a09ec8f10494d084895` | `root/obj-2` / `root/obj-3` |
| 3 / minus | `-` | `help/max/minus.maxhelp` | 22246 | `7968c6cf7d348b39d8fb8044c42977bc2b71fe55c4c7db8542150e79e6a1a0b0` | `root/obj-2` / `root/obj-3` |

Each complete tree contains 20 boxes: four at root, 16 in Basic, and zero in
the question scope. The census is ten executable nodes, four comments, two
structural patcher boxes and four helper annotations. The executable nodes are
two arithmetic operators, four number boxes, three flonums and one button.
All eight saved cables and all ten executable nodes belong to Basic. None of
these three roots contains an isolated executable box. Retain every box and
cable; an unconnected executable example in a later root must also remain in
its full-tree inventory rather than being dropped by this score's tooling.

Each independent owner uses 10/32 native node slots and 8/64 native cable
slots, leaving 22 and 56 free. The larger authoring hierarchy limits are not
the native execution limits. No capacity increase is needed. All three saved
flonums in each root use format 6; no number/flonum minimum or maximum override
is saved. This does not expand Ultra's finite numeric range or qualify every
format-6 display behavior.

All short anchors below expand under that root's Basic scope. Bind them from
the current production importer and Rust preparation, with the exact full
source and scoped-node maps retained privately. Do not invent native IDs,
kind numbers, parameters or a separate hand-built graph from this index.

| Role | Original Anchor | Saved Class / Connection Role |
| --- | --- | --- |
| Integer-mode operator/store, I | `obj-26` | Corresponding arithmetic class, one integer creation operand |
| Integer hot control | `obj-17` | number; outlet 0 drives I hot inlet |
| Integer cold control | `obj-16` | number; outlet 0 drives I cold inlet |
| Integer recall source | `obj-22` | button; outlet 0 drives I hot inlet |
| Integer result/display | `obj-25` | number; receives I result, no saved outgoing cable |
| Float-mode operator/store, F | `obj-10` | Corresponding arithmetic class, one float creation operand |
| Float hot control | `obj-1` | flonum; outlet 0 drives F hot inlet |
| Alternate integer hot source | `obj-7` | number; outlet 0 also drives F hot inlet |
| Float cold control | `obj-24` | flonum; outlet 0 drives F cold inlet |
| Float result/display | `obj-23` | flonum; receives F result, no saved outgoing cable |

The whole creation-text hashes below pin the private source operands without
publishing them. A pristine initial arithmetic state must be established from
the actual prepared descriptor and clean Max opening; a saved UI value must
not be treated as an implicit startup message into its connected operator.

| Root | Integer Operator Creation-Text SHA-256 | Float Operator Creation-Text SHA-256 |
| --- | --- | --- |
| times | `64b5eb5de415bf479817dc8f26c6e8b663360ef0b51213a4e373e83451586c83` | `d9b9f4eb4114a78bacfa73eeced5fee6a87084f115f6a8874ce72735b49ef02f` |
| plus | `946eb99b2d46c8d1b5b684f81a8d51459e44860f734fd0691d925b238886c236` | `6e21ff328a68f4b336f90954873c129127e2f379bccdffda94f292f26758ebb5` |
| minus | `4f5450721ae52377bbd0fd626ee048bde869ec3b1b37f2d3c17fe47dd9aeb829` | `726777f34732977bd5ab08b0fc23ca2e1f591d9f8c17ce75670e736153cc086b` |

## Exact Programmatic Actions

Use rank order times, then plus, then minus, with one independent owner live
at a time. Give each action a globally unique prefix, such as `times-A01`.
Every event targets inlet 0 of its declared original anchor. `int n` and
`float n` specify the selector and atom tag, including a whole-valued float;
bang has no atoms. Direct bangs to F are original programmatic object actions,
not a claim that a saved button or physical gesture performs those actions.

In the table, an operand pair is `(left, right)` retained by the named
operator. `I(a;b;c)` and `F(a;b;c)` are respectively int- and float-tagged
operator results for times, plus and minus. Each operator result must appear
once at the operator outlet and once at its connected display's outlet 0.
Private initial results are named `i0` and `f0`, separately for each root.

The last column is the exact outlet-emission count `C/O/D`: C is a saved
control or button, O is an arithmetic operator, and D is a result display.
It excludes the injected input, observer plumbing and snapshot bookkeeping.
Unlisted original outlets, the other branch and numeric outlet 1 are silent.

| Event | Anchor / Typed Input | Store Or Display Requirement | Operator Result (times; plus; minus) | C/O/D |
| --- | --- | --- | --- | --- |
| A01 | `obj-22` / bang | Recall pristine I; button emits one bang | Private int `i0` | 1/1/1 |
| A02 | `obj-10` / bang | Recall pristine F; no numeric hot-control output | Private float `f0` | 0/1/1 |
| A03 | `obj-16` / int -3 | Cold number emits int -3; I right becomes -3; display retains A01 | Silent | 1/0/0 |
| A04 | `obj-17` / int 7 | Hot number emits int 7; I pair `(7,-3)` | `I(-21;4;10)` | 1/1/1 |
| A05 | `obj-22` / bang | Recall unchanged I pair; hot number stays silent | `I(-21;4;10)` | 1/1/1 |
| A06 | `obj-16` / float 0.25 | Number emits int 0; I right becomes 0; display retains A05 | Silent | 1/0/0 |
| A07 | `obj-22` / bang | Recall I pair `(7,0)` | `I(0;7;7)` | 1/1/1 |
| A08 | `obj-16` / int 7 | Cold number emits int 7; I right becomes 7; display retains A07 | Silent | 1/0/0 |
| A09 | `obj-17` / float -3.75 | Number emits int -3; I pair `(-3,7)` | `I(-21;4;-10)` | 1/1/1 |
| A10 | `obj-25` / int -3 | Display emits int -3 only; both operators and source controls unchanged | Silent | 0/0/1 |
| A11 | `obj-22` / bang | Recall I pair `(-3,7)` and replace display-only edit | `I(-21;4;-10)` | 1/1/1 |
| A12 | `obj-24` / float 0.25 | Cold flonum emits float 0.25; F right becomes 0.25; display retains A02 | Silent | 1/0/0 |
| A13 | `obj-1` / float 7 | Hot flonum emits float 7; F pair `(7,0.25)` | `F(1.75;7.25;6.75)` | 1/1/1 |
| A14 | `obj-10` / bang | Recall unchanged F pair; both hot controls stay silent | `F(1.75;7.25;6.75)` | 0/1/1 |
| A15 | `obj-7` / int -3 | Alternate number emits int -3; F pair `(-3,0.25)` | `F(-0.75;-2.75;-3.25)` | 1/1/1 |
| A16 | `obj-24` / float -3 | Cold flonum emits float -3; F right becomes -3; display retains A15 | Silent | 1/0/0 |
| A17 | `obj-10` / bang | Recall F pair `(-3,-3)` | `F(9;-6;0)` | 0/1/1 |
| A18 | `obj-1` / float 0.25 | Hot flonum emits float 0.25; F pair `(0.25,-3)` | `F(-0.75;-2.75;3.25)` | 1/1/1 |
| A19 | `obj-23` / float 7 | Display emits float 7 only; both operators and source controls unchanged | Silent | 0/0/1 |
| A20 | `obj-10` / bang | Recall F pair `(0.25,-3)` and replace display-only edit | `F(-0.75;-2.75;3.25)` | 0/1/1 |
| A21, after pristine reinstall | `obj-22` / bang | Recall fresh I, not pre-close pair `(-3,7)` | Same private int `i0` as A01 | 1/1/1 |
| A22, after pristine reinstall | `obj-10` / bang | Recall fresh F, not pre-close pair `(0.25,-3)` | Same private float `f0` as A02 | 0/1/1 |

A06/A09 establish number-UI truncation before arithmetic; they do not
independently establish float coercion at I's own inlet. A15 distinguishes an
int-tagged hot source from F's fixed float result mode. After A15, `obj-1`
still displays 7 although F's retained left operand is -3. After A18, the
alternate number still displays -3 although F's left operand is 0.25. Read
both controls rather than conflating the last operator input with every
connected control's displayed value. Whole and zero float results retain
float tags. Signed-zero discrimination is an additional capability question,
not a result established by numeric equality in this plan.

## Lifecycle, Checkpoints And Counts

For each root, declare this exact sequence: install pristine revision 1;
A01-A20; close owner; install a new pristine copy at revision 2; A21-A22;
close owner. Then begin the next root. Do not represent install/close as event
actions, eagerly install all three roots, or reopen a live/instrumented working
serialization as a pristine source. A reused native slot's installed revision
must increase. Max must perform a real independent-owner close and fresh
source binding, not merely close and reopen a Basic view.

| Accounting Item | Per Root | All Three |
| --- | ---: | ---: |
| Declared event actions | 22 | 66 |
| Declared install / close operations | 2 / 2 | 6 / 6 |
| Total native operations and post-operation checkpoints | 26 | 78 |
| Live-owner checkpoints / empty close checkpoints | 24 / 2 | 72 / 6 |
| Numeric states, seven per live checkpoint | 168 | 504 |
| Control/button outlet emissions | 15 | 45 |
| Arithmetic outlet emissions, I / F | 7 / 8 | 21 / 24 |
| Result-display outlet emissions, I / F | 8 / 9 | 24 / 27 |
| Total original outlet emissions | 47 | 141 |
| Saved-cable deliveries | 30 | 90 |

The 30 saved-cable deliveries per root consist of integer cold/hot/button
deliveries 3/2/5, integer result-to-display deliveries 7, float cold/hot/alternate
hot deliveries 2/2/1 and float result-to-display deliveries 8. Every one of the
eight saved cables is exercised. At the semantic input-delivery level this
is 22 direct event inputs plus 30 saved-cable deliveries, or 52 original-box
input deliveries per root; do not equate observer/internal protocol rows with
that count.

Each post-operation checkpoint asserts the exact live-owner set, source
identity and installed revision. A close checkpoint must explicitly contain
the empty live set, not an omitted checkpoint. An install checkpoint precedes
its first event and includes no invented control startup emission. Each live
checkpoint reads exactly the seven original number/flonum anchors from the
role table, including unchanged controls and both displays. Check source-
initial UI state privately at each install; compare all seven reset values
against the first pristine checkpoint. A21/A22 then test the arithmetic
stores' reset independently of UI values.

Bracket each event with acknowledged completion and the full required
checkpoint. Cold silence means zero operator/display receipts and an unchanged
display value inside that completed bracket; a missing step cannot satisfy it.
Display-only actions likewise require zero operator/control receipts and the
later recall restoring the retained arithmetic result. Observe all ten
original executable nodes as non-forwarding leaves, with numeric outlet 1
observed for silence. The button has no assumed persistent numeric value.

Operand pairs in the action table are semantic state assertions supported
by the injected/forwarded typed receipts, unchanged UI readback where
applicable and subsequent bang recomputation. Do not label an inferred pair
as a direct Max internal-state read. Native trace/snapshot fields may add a
direct assertion only where those fields actually expose that state.

There is no saved executable source fanout here and no explicit saved order
on the arithmetic-to-display cables. Preserve all eight saved cable records
and their sequence. Matching streams at operator/display endpoints do not
prove saved patchline order or justify ordering an observer callback before
the original downstream callback. Retain the existing `saved_order_observed`
false distinction when only V8 endpoint inventories are available.

## Exact Finite Helper Policy

Propose a separate versioned policy such as `max-help-arithmetic-three-v1`,
with exactly the three source/class/safe-page tuples above, leaving the
existing four-root policy's identity distinct. This is a design for later
implementation, not an allowlist extension made by this report. The backend
must verify the exact source digest and the four known installed helper file
digests before minting recognition. Frontend recognition must remain bound
to the identical source through the current nonforgeable identity mechanism;
an arbitrary deserialized object is not a probe result.

| Root | Starter Anchor | Name Anchor | Details Anchor | Arguments Anchor |
| --- | --- | --- | --- | --- |
| times | `root/obj-3` | `root/obj-6` | `root/obj-4/obj-2` | `root/obj-4/obj-5` |
| plus | `root/obj-1` | `root/obj-4` | `root/obj-2/obj-2` | `root/obj-2/obj-4` |
| minus | `root/obj-1` | `root/obj-4` | `root/obj-2/obj-2` | `root/obj-2/obj-4` |

Require exactly four root boxes with no root cables, the source-pinned Basic
and empty question scopes, and saved child names `basic_tab` / `q_tab`.
Starter is a newobj with saved filename `helpstarter.js`; its
`saved_object_attributes` has exactly `filename` and `parameter_enable`, with
enable 0. The other three helpers are jsui with their exact role filenames
`helpname.js`, `helpdetails.js`, `helpargs.js`, border 0, ignoreclick 1,
parameter_enable 0, and exactly one string argument. Every helper saves one
inlet, one outlet and exactly one empty outlettype entry. None has an incident
saved cable. Reject any additional js/jsui box anywhere in the complete tree.

Validate each helper at its source-bound anchor against the following exact
UTF-8 hashes of the single identity argument. The starter's complete private
creation text has its separate hash. Do not reconstruct or publish authored
helper strings, execute their scripts in Ultra, or treat arbitrary scripts
with similar ports as annotations.

| Root | Starter / Name / Details Argument SHA-256 | Arguments-Helper Argument SHA-256 | Whole Starter Creation-Text SHA-256 |
| --- | --- | --- | --- |
| times | `684888c0ebb17f374298b65ee2807526c066094c701bcc7ebbe1c1095f494fc1` | `684888c0ebb17f374298b65ee2807526c066094c701bcc7ebbe1c1095f494fc1` | `0ca81c69553c5299b7dc137769cb0887e0f1dc26c73bfe08c0e04891d8a99d02` |
| plus | `a318c24216defe206feeb73ef5be00033fa9c4a74d0b967f6532a26ca5906d3b` | `383ef36928344f56ffe8fe23ceed2ad8c0db8ec222c5f56c47163747dc738a0e` | `e86f190fbc376badcc5d7b14a552d4e84fad436e0789bb2c7cc221fa38bf9390` |
| minus | `3973e022e93220f9212c18d0d0c543ae7c309e46640da93a4a0314de999f5112` | `129fa7713adba71e12dca1d217e4236dad4fd946a80ea339180c243e1c7888da` | `490326e775bc3adc514c502064cb4b937c4122d2450e8b62c85f583077795a37` |

| Known Helper File Under `help/resources/` | Required SHA-256 |
| --- | --- |
| `helpstarter.js` | `a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8` |
| `helpname.js` | `49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa` |
| `helpdetails.js` | `31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1` |
| `helpargs.js` | `04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469` |

Keep four `help_helper` authoring annotations with their original roles and
geometry, and no native surface ports or script execution. Preserve private
source retention and exact rejection on any source/helper mismatch. This
policy grants no root-wide geometry relaxation. The earlier append-specific
width disposition cannot automatically cover these sources or anchors.

## Safe Reference Identity

Keep symbolic Max class, safe reference ID, and XML identity as separate
fields. The finite class-to-page mapping and fixed file routes are:

| Max Class | Safe `helpShell.object` / Reference ID | Fixed Relative XML Route |
| --- | --- | --- |
| `*` | times | `docs/refpages/max-ref/times.maxref.xml` |
| `+` | plus | `docs/refpages/max-ref/plus.maxref.xml` |
| `-` | minus | `docs/refpages/max-ref/minus.maxref.xml` |

Do not interpolate an arbitrary helper argument or symbolic class into a
filesystem path, normalize aliases generically, or let a source-supplied title
choose the route. Name/details versus arguments helpers deliberately have
different source-pinned identity hashes in plus/minus; comparing every helper
argument to the safe page ID is incorrect. Public reference results and UI
request keys should retain the safe page ID. Related-page availability may
use these same exact three mapping rows only after admission, with unknown
names retaining the existing unavailable behavior.

**XML admission remains unverified.** This task did not read these three XML
files, establish their hashes, or inspect their `c74object` name attributes.
They might identify a symbolic class rather than the safe filename stem.
Before admission, inspect only these three fixed routes as bounded private
data and pin each exact expected XML identity. Compare that identity through
the finite tuple; do not remove the current XML-name check or accept either
string generically. Retain canonical containment, regular-file and size
checks, bounded parsing/fields/response, plain-text handling and the admitted
owner requirement. Missing, changed or mismatched XML must remain unavailable
without implying failure or success of the independent arithmetic score.

Coordinator follow-up, 2026-10-22: a bounded read of those three exact XML
routes resolves the identity question. All are regular nonsymlink files with
root tag `c74object`; their `name` attributes are the symbolic classes in the
table below. These are filesystem observations only, with no product admission,
source change or runtime claim. The earlier planning-only worker did not read
XML; this is a separate metadata observation.

| Safe Page | Exact XML Identity | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| times | `*` |3964 | `85baf43d8613f3da7fa70ff326005e0fdd07d049e0b0c2e2a7e0bf7c1623253e` |
| plus | `+` |4393 | `441f02ffe58bbc571e594398a6495430affc45240cdde79feecbadc769f91002` |
| minus | `-` |3960 | `1cace7ba26cec674dec28196c28c0fd8063b4a8e8bdfd712fd12b64ec8675bcc` |

Future implementation must compare the exact tuple of safe page, fixed route,
symbolic identity and digest. Filename stems do not equal XML identities for
these three pages. Retain the existing contained/bounded read and admitted-owner
requirements; this observation authorizes no generic alias or XML-name bypass.

## Current Implementation Barriers

Locations below describe source inspected for this plan; implementation work
must recheck them against its final revision.

| Gate | Current Location And Consequence |
| --- | --- |
| Backend source and helper identity | `apps/ultra/src-tauri/src/help_reference.rs:11` has a 13-page catalog; `:13` admits only append/prepend/int/float source hashes. `:90` probes those roots and all four helper hashes, returning the literal four-root adapter at `:102`. None of these three roots can currently receive the required identity. |
| Frontend source binding | `apps/ultra/ui/canvas-help-shell.mjs:2` and `:5` contain only four names/hashes. `:18` accepts only that adapter; `:25` requires a source-bound probe identity. Keep that source binding while adding a distinct finite policy later. |
| Helper shape | `apps/ultra/ui/canvas-help-shell.mjs:31` requires every helper argument to equal the safe object name, and `:36` uses that same name in the starter-text predicate. Both assumptions reject the arithmetic helper identities. `:42` checks exact roles/disconnection; `:50` rejects other scripts. Keep those finite structural checks. |
| Shared shell schema | `apps/ultra/ui/canvas-help-shell.mjs:71` and `apps/ultra/src-tauri/src/canvas_hierarchy.rs:151` accept only the four-root adapter/names. `apps/ultra/src-tauri/src/canvas_hierarchy.rs:154` checks root/tab/helper topology; `:191` rejects helper surface ports. Changing only a source hash list cannot create a valid shared document. |
| Importer shell emission and runtime completeness | `apps/ultra/ui/canvas-max-import.mjs:104` adapts a helper only after recognition; unrecognized scripts fail through `:143` / `:166`. `:350` hardcodes the four-root emitted adapter. `:162` retains the bounded arithmetic warning, `:361` checks native 32/64 capacity, and `:369` requires every diagnostic to be informational for completeness, independently of zero omissions. |
| Saved policies and geometry | `apps/ultra/ui/canvas-max-import.mjs:179`, `:184` and `:191` retain style/automation/other saved-attribute diagnostics. Fonts, editor/tab/service metadata, format 6 and helper geometry need exact source-bound dispositions; this plan does not suppress them. |
| Reference admission, routing and identity | `apps/ultra/src-tauri/src/help_reference.rs:46` requires an admitted owner. `:81` bounds contained file reads. `:107` requires catalog membership, `:108` constructs the page route from that member, and `:194` currently requires XML name equal to the requested safe name. `:200` marks related pages by raw catalog membership. Those paths need the finite class/page/XML distinction. |
| Help discovery | `apps/ultra/ui/canvas-help-view.mjs:42` requests the shell object's Reference page. Ordinary object Help/F1 still uses `documents.openHelp` in `apps/ultra/ui/canvas.mjs:352` and `:544`. Recognizing an installed shell or completing this proposed score would not automatically make ordinary Help open that installed root. |

Normal arithmetic creation already maps through the catalog and
`canvas-max-import.mjs:142`; these roots do not justify new executable types
or Ultra legacy arithmetic spellings. The latter are explicitly refused by
`canvas-max-import.mjs:141`.

## Capture Admission And Remaining Proof

Before a future score, require matching original/pristine/working identities,
unique original anchors, exact complete 20-box/8-cable retention and role
inventory, the four helper file identities, production-import/Rust preparation
and full settled startup binding on every install. The named Basic/question
children must already exist; do not accept helper-created replacement children
as equivalent source retention.

The numeric implementation in progress has a finite `getvalueof` observer at
`experiments/max-reference/int-float-runtime-20261022/v8-readback.js:9`.
Reuse only its validated finite scalar or singleton-array shapes, source/owner
binding and private retention where applicable, then establish capability for
these seven anchors. A getter's class-implied int/float tag is not an observed
outlet tag. Null, missing, nonfinite, wrong-class or ambiguous readback must
refuse the checkpoint rather than become zero. These roots have no Message
box; neither a Message prototype check nor a cold-Message capability can stand
in for their numeric state observations.

Likewise establish typed float injection and the outlet observer's actual tag
capability before using the table as a typed comparison. Preserve unobserved
or ambiguous tags as unknown; do not convert class-implied tags into captured
tag evidence. Capture direct operator output before numeric-display conversion.
No particular V8 numeric callback representation, signed-zero distinction or
unimplemented arithmetic internal getter is presumed by this plan.

Require the declared action/live-owner matrix, all 78 operation results, all
141 expected original outlet emissions and all 504 numeric states before
comparing values. Missing, duplicate or unexpected rows, residual closed
owners, admission failures, overflow, observer forwarding or source retention
changes are failures rather than a smaller passing denominator. Retain source-
owned initial receipts and strings privately; public reporting may retain
hashes and finite comparison outcomes.

After such a programmatic capture, full installed-root qualification still
needs exact metadata/format/geometry dispositions, ordinary Help routing,
Basic/Reference/child shared-owner behavior, independent-owner close behavior,
source-protected Save As/reopen, and separately captured physical numeric
entry/commit, bang and Tab behavior. Numeric outlet 1 is intentionally silent
in this programmatic score; it does not test physical Tab. Saved-order and
visual claims also require their own evidence. No test result, qualification
increment or parity claim is supplied by this document.
