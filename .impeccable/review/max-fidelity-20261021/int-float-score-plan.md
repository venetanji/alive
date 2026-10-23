# Int/Float Full-Root Score Plan

Planning-only investigation, 2026-10-22. The next finite score should use the
**actual complete int and float imports**, with 48 programmatic events and six
owner install/close operations, followed by separately labelled physical and
shared-view checks. It must cover both documents concurrently and distinguish
the main hot/cold store from the independent named-send store. No harness,
product, source allowlist or qualification counter changes are made here. No
Max, native scorer, desktop, browser, screenshot or clipboard action was run.

This implements the planning scope of
`docs/superpowers/specs/2026-10-22-max-help-root-behavior-design.md` and step 7
of `docs/superpowers/plans/2026-10-22-max-help-root-behavior.md`, using
`after-cables-next-wave.md` rows I1-I2/F1-F2/N1-N2. The spec gates execution on
the preceding append/prepend evidence. Attempt002's retained failed session
has zero public rows. The coordinator reports that attempt003 then loaded the
complete 19/18-box trees but refused an append comment's full-rectangle match
before scoring; numeric geometry diagnostics are being added while acceptance
remains strict. This later capability progress was not re-executed here and
does not establish a programmatic action pass. The arithmetic ordering in
`next-help-roots-map.md` remains subsequent work.

## Source And Native Binding

| Document | Installed Source SHA-256 | Basic Scope | Full Boxes | Native Nodes/Cables |
| --- | --- | --- | ---: | ---: |
| int | `bbb8fc3b458eb168fe69b8709ba343808d23b6d55e2c59cc3086d01976c5ac61` | `root/obj-2` | 25 | 14/10 |
| float | `c5e9bd4e89ebc5808d2faf76400031705c35195c32b363b890787a37bbdec15c` | `root/obj-2` | 27 | 16/12 |

Both installed files still match these identities. The existing private
production-import/Rust-export bundles were inspected without executing them.
Their executable anchors resolve to the classes below. Recreate/revalidate
bundles from the current production importer and Rust `canvas::prepare` before
scoring; derive every runtime ID, parameter and edge from that preparation.
The IDs in an older native file are not a new protocol mapping table.

All short anchors in this report expand to `root/obj-2/<anchor>` in the named
document. The table is an action/observation index, not a redistributed graph.

| Role | Anchors | Int Classes | Float Classes |
| --- | --- | --- | --- |
| Main hot/cold controls | `obj-16`, `obj-17` | number, number | flonum, flonum |
| Main hot/cold sliders | `obj-20`, `obj-18` | slider, slider | slider, slider |
| Main store and display | `obj-22`, `obj-21` | int, number | float, flonum |
| Main recall and pulse | `obj-30`, `obj-24` | button, button | button, button |
| Separate sender store | `obj-28` | int | float |
| Saved send trigger | `obj-29` | Message | Message |
| Sender outlet pulse | `obj-35` | button | button |
| Named receiver/display | `obj-32`, `obj-33` | receive alias, number | receive alias, flonum |
| Hot/cold scale operators | float only: `obj-23`, `obj-19` | absent | multiply, multiply |
| Isolated alias example | `obj-9` | int alias | float alias |

Each complete tree also retains two patcher boxes, five comments and four
verified help annotations. No native capacity change is needed. The isolated
alias has no incoming or outgoing saved cable: retain it and its initial
prepared state without inventing a new demonstration branch. The two
multipliers in float have the existing half-scale, float-creation contract.
Both sliders use the imported default integer range 0..127; 64 is one central
integer sample, not a claim of a unique geometric midpoint.

The crucial separation is `obj-22` versus `obj-28`. The slider/number paths
change the first. The saved send Message reads the second. A score that changes
the slider and then expects that value on the bus would test the wrong state.
The programmatic sender setup below targets the original `obj-28` hot inlet,
so its setup emission and subsequent silent named-send action are separate.

The saved send Message text has SHA-256
`4bda7034b082c0e479748654cef39de5e0d0ace726a42f0d6e45572c91fc3fd1`
in both roots. Its destination and both receiver names share SHA-256
`f767d775f729c65c4d2d40f92016ff14c2fb07d3566764060f6ee7e234c2ffbb`.
The actual name stays private. Trigger the saved Message with bang; do not put
its source-owned text into a public score.

## Exact Programmatic Score

Use owner slots I and F, each revision 1 initially. Every event below targets
inlet 0 of its original source anchor. `int n` and `float n` specify both
selector and atom tag; bang has no atoms. The explicit decimal zero/whole
float distinction must survive serialization. All numeric stimuli below are
original proposed inputs, not copied demonstration text.

`I-main` means the typed main-store result at `obj-22`, its numeric receipt at
`obj-21`, and one pulse at `obj-24`. `F-main` is the same float sequence.
`both receivers` means exactly one typed output at `obj-32` in each live owner,
then its local `obj-33` conversion. Do not assert portable order between the
two documents' receivers.

Start by installing I alone; retain an initial checkpoint before E01. F must
not already be registered through eager template installation.

| Events | Document / Anchor | Exact Ordered Action(s) | Required Observation |
| --- | --- | --- | --- |
| E01 | int / `obj-29` | bang | I receiver alone gets the private source-initial sender value, tagged int. Sender outlet and `obj-35` remain silent. |
| install-F | float owner | Install pristine prepared F, revision 1; initial checkpoint | No control action or invented startup emission. Preserve I state and register exactly one F receiver. |
| E02 | float / `obj-29` | bang | Both receivers get the private source-initial sender value, tagged float before UI conversion. |
| E03 | int / `obj-28` | int 7 | Local sender emits int 7 and its `obj-35` pulses once. No bus delivery or main-store action. |
| E04 | int / `obj-29` | bang | Both receivers get int 7; int display emits int 7, float display emits float 7. No sender outlet/pulse. |
| E05 | float / `obj-28` | float -3.25 | Local sender emits float -3.25 and `obj-35` pulses once; bus/main store unchanged. |
| E06-E07 | float / `obj-29` | bang; bang | Each action gives both receivers float -3.25. Int display converts to int -3; float display retains -3.25. Sender outlet/pulse stays silent. |
| E08-E11 | int / `obj-20` | int 0; int 7; int 64; int 127 | Four separate I-main emissions with the matching integer values. |
| E12 | int / `obj-18` | int 7 | Cold UI emits int 7 and stores silently at main cold inlet. No I-main result/pulse; last hot result stays 127. |
| E13-E14 | int / `obj-30` | bang; bang | I-main emits int 7 once per recall. |
| E15 | int / `obj-17` | float -3.75 | The number UI converts to int -3 before the store; downstream main result/pulse remains silent. This does not independently prove store-side float coercion. |
| E16 | int / `obj-30` | bang | I-main emits int -3. |
| E17-E18 | int / `obj-16` | int -3; float 7.75 | I-main emits int -3, then int 7 after UI conversion. |
| E19-E22 | float / `obj-20` | int 0; int 7; int 64; int 127 | Hot multiply output is float 0, 3.5, 32, 63.5 respectively before flonum receipt; F-main matches with float tags. |
| E23 | float / `obj-18` | int 7 | Cold multiply/flonum emit float 3.5; main result/pulse stays silent at 63.5. |
| E24-E25 | float / `obj-30` | bang; bang | F-main emits float 3.5 once per recall. |
| E26 | float / `obj-17` | float -3.25 | Cold flonum emits float -3.25 and changes retained store silently. |
| E27 | float / `obj-30` | bang | F-main emits float -3.25. |
| E28 | float / `obj-16` | float 0.25 | F-main emits float 0.25; a later recall must retain it. |
| E29-E30 | int / `obj-21`, then `obj-30` | int -9 to display; bang recall | Display-only output emits -9 without changing the store/pulse. Recall restores I-main int 7. |
| E31-E32 | float / `obj-21`, then `obj-30` | float -9.5 to display; bang recall | Display-only output emits -9.5 without store/pulse change. Recall restores F-main float 0.25. |
| E33-E34 | int / `obj-33`, then float / `obj-29` | int 99 to display; bang send | Local display edit causes no bus/store event. Send replaces both bus displays from retained float sender -3.25. |
| E35-E36 | float / `obj-33`, then int / `obj-29` | float 99.5 to display; bang send | Local display edit causes no bus/store event. Send replaces both bus displays from retained int sender 7. |
| E37-E38 | int, then float / `obj-24` | bang in I; bang in F | Each unwired pulse button emits its own bang only; no main-store or bus event. |
| E39-E40 | int, then float / `obj-35` | bang in I; bang in F | Each unwired sender indicator emits its own bang only; no store output or bus event. |

These are planned assertions, not measured results. Keep initial creation
operands private; compare them from source-bound prepared descriptors and
actual Max receipts rather than copying them into this report. Record silence
as zero matching receipts in a bracketed completed action, together with a
checkpoint of the previously visible value; absence of a whole step is failure.
A repeat bang has its own step and receipt count.

## Owner Close/Reopen Continuation

Continue the same timeline after E40; do not silently reset both documents.
Native install revisions increase within a reused slot even after close.
Fresh Max working files for reopened owners must be copied again from the
verified pristine sources, then rebound/instrumented. A serialized working file
already contains instrumentation and live state and must not be reopened as
the pristine source.

| Operation(s) | Exact Action | Required Observation |
| --- | --- | --- |
| close-F; E41 | Close independent F owner; bang I `obj-29` | Only I receiver remains. I sender still emits stored int 7 through the bus; no F trace/snapshot/receiver remains. |
| reinstall-F; E42 | Reinstall original F template at revision 2; bang I `obj-29` | F internal stores begin at source-created values. Both receivers get int 7; the bus display update must not change F main store. |
| E43-E44 | Bang F `obj-30`; bang F `obj-29` | Main recall and bus sender each emit their own source-initial float values, not pre-close 0.25/-3.25. Receiver UI conversion remains separate. |
| close-I; E45 | Close independent I owner; bang F `obj-29` | Only F receiver remains; F state is not reset by I close. |
| reinstall-I; E46 | Reinstall original I template at revision 2; bang F `obj-29` | Both receivers register once and receive the current F sender value. I main store remains at its own source initial state. |
| E47-E48 | Bang I `obj-30`; bang I `obj-29` | Main recall and bus sender each emit their own source-initial int values, not pre-close stored 7. |

The core timeline is exactly 48 event actions plus initial installs I/F,
two independent-owner closes and two reinstalls: **54 native operations**.
Capture a complete initial/per-operation checkpoint of every live owner,
including the receiver document affected by another document's send. A single
active-document checkpoint is insufficient for E02/E04/E06/E07/E34/E36 and the
reopen bus actions. At a close checkpoint, assert the exact live-owner set.

## Shared Views And Physical Actions

Owner lifecycle and view lifecycle are distinct. A Basic child window is a view
of the existing owner, not another independent receiver. Perform these bounded
product checks with both independent roots still open, using the same original
7 and -3.25 sender setup and a fresh captured authoring baseline:

1. Open Basic in a new window for I, then F. Record owner label, native owner ID
   and runtime revision for each root/child pair. Each pair shares one owner
   and one receiver registration. Opening the view emits nothing and performs
   no native graph install.
2. Set I main through its child and F main through its root. Read the same state
   from their other views. Click each owner's saved send Message once: each
   independent owner receives once, irrespective of its number of views.
3. Round-trip Reference -> Basic -> Basic child for each owner, then close and
   reopen only that child. Repeat main recall and send. Retained values,
   source-node mapping and native revision stay unchanged; owner/receiver stays
   live. This must not be implemented with the scorer's independent-owner
   `close` operation.
4. Close one independent owner and verify all its views/receiver disappear;
   the other owner's child/root still share retained state. This is the
   product-side counterpart of the native close continuation, with separate
   authoritative window/registry receipts.
5. Save As only to a new private Ultra document; verify the authored structure,
   Message prototype, help-shell metadata and source protection. Reopen it and
   check initialization against the authored document at the save boundary.
   Runtime cold/bus values must not silently replace authored values; explicit
   UI parameter commits must follow their actual saved-value contract. Record
   a fresh runtime identity/revision and no inherited registration from the
   closed owner. Saving over an installed/pristine Max source is forbidden.

For physical Tab, use this exact ordered matrix after values are already
committed: T01-T04 I `obj-16`, `obj-17`, `obj-21`, `obj-33`, then T05-T08 F at
the same anchors. Select/focus the original control and press the actual Tab
key once. Require one bang on its outlet 1 and zero new outlet-0/main-store/bus
emissions; all eight saved Tab outlets are unconnected. No `event("tab")`
selector or DOM-only event can substitute for the physical action. The native
transport's eight corresponding `tab` operations test the callback contract;
with the 54 core operations they form 62 native operations, but do not alone
qualify keyboard interaction.

Also perform one physical entry/commit at each of those eight numeric controls
using the original numeric values already specified in the main score, and
one physical drag to 7 on each document's hot and cold slider. Label entry,
drag, Tab and programmatic runs separately. Compare their actual emitted typed
receipts and silence against the relevant programmatic row after explicitly
establishing that row's precondition. No screenshots are needed; action receipt,
focus/commit state and nonvisual result evidence must be authoritative. This
small gesture set does not establish all drag trajectories, formatting or view
policies.

## Observation And Capability Gates

Observe every original executable outlet as a non-forwarding leaf; never insert
a JS forwarder or modify original cables/explicit order. In particular, capture
`obj-32` before numeric UI conversion, both float multipliers before flonums,
the source stores and all three buttons. Existing native trace records actual
input processing and output forwarding, including cross-document receipts.

Main-store source fanout explicitly specifies display before pulse. Add a
separate **cross-anchor destination-output order** assertion for every I-main
and F-main action: filter the global step receipts to the original destination
number/flonum `obj-21` outlet 0 and destination button `obj-24` outlet 0;
require exactly one typed scalar and one bang respectively, then require the
numeric destination's receipt to precede the button destination's receipt.
Apply the same output-order predicate to the native trace. Its input receipts
additionally allow a native-only assertion that `obj-21` input precedes
`obj-24` input. Display-only edits and direct indicator clicks use their own
cardinality rules and do not falsely satisfy the main-store order predicate.

The Max leaves are attached to these two original destination outputs, rather
than relying on the relative callback of a source-store leaf. First establish
that these particular controls emit synchronously in the captured control
context and that the observer preserves that callback order. This establishes
the order of the recipients' own outputs and supports the finite input-order
inference for these immediate controls. It does not directly observe arbitrary
inlet delivery, establish portable ordering among named receivers, or prove
Print acceptance/rendering. The generic comparator currently groups outputs
per endpoint and needs this explicit cross-anchor predicate; two matching
per-anchor streams alone cannot pass it. If the synchronous observation
capability fails, leave the order cell unresolved while retaining endpoint
values as their separate result.

The numeric roots each have one authored nonempty Message, `obj-29`, whose
prototype should remain unchanged through all these actions. There is no
initially empty cold Message display in these roots. Consequently the existing
append-specific cold-Message readback check cannot be relabelled as numeric
readback. Establish a finite nonvisual value-readback capability for number,
flonum and slider independently, using the getters or private serialization
only after their returned values are validated. A null getter does not mean
zero, and an absent saved value does not prove current runtime state. Use
button output counts for pulses, not an assumed persistent button value.

Before any recorded score, require exact original/pristine/initial-working
hashes, the full 25/27-box and 10/12-cable retention, unique saved-anchor lookup,
all four helper hashes, numeric readback capability and typed float injection.
The helper starter has a scheduled initialization and looks up the already
saved Basic/question names; wait for settled full-tree identity before taking
initial checkpoints. The existing saved child names avoid its fallback creation
path. The three display helpers remain exact source-bound annotations on Ultra;
this score does not qualify arbitrary script execution or helper rendering.

## Existing Bridge Barriers

These are preparation requirements for a future implementation, not changes
made by this report:

- `help_runtime.py` identifies/builds only append/prepend. Its source inventory,
  private config and action builder need a separate bound int/float preparation;
  completed append/prepend evidence must remain immutable.
- `controller.js` opens every configured root before binding and accepts only
  bang/int actions. The timeline requires delayed F load, typed float input,
  close/reopen/rebind and authoritative all-live-owner checkpoints. Preserve
  exact filepath/full-tree checks and settle helper startup on every reopening.
- `run-runtime.py` hardcodes append/prepend initial snapshots and the first
  append cold-Message capability assertion. Numeric readback, per-live-document
  checkpoints and safe reconstruction of reopened private working files need
  their own finite capabilities. Attempt002's failed startup is not bypassed.
- `replay.py` eagerly installs every bundle and permits event actions only.
  Although C++ supports install/event/tab/param/close, the JSON bridge cannot
  currently represent this 54-operation timeline or shared product views.
  Add explicit lifecycle action schema/coverage later; do not use fake event
  rows to represent close or allow automatic duplicate installs.
- `compare.py` assumes initial installs followed by event labels, inlet 0,
  one active-document Message checkpoint per action, and a mandatory completed
  cold-Message capability. It compares per-endpoint outputs and Message state,
  not numeric retained state, exact live-owner sets, destination order or
  windows. Add the explicit cross-anchor destination-output order assertion
  independently of those endpoint comparisons. The new expected action/live-document matrix must be validated
  before comparing any output; empty checkpoints must never pass vacuously.

Production-side metadata is also still incomplete: the retained census has
132 diagnostic records for int and 141 for float, including four helper info
records each. Saved font/style/editor/tab policies, four format6 flonums and
two finite arithmetic-profile warnings require explicit dispositions. Reuse
the existing finite display/arithmetic evidence without converting it into a
general format claim. Zero omissions, native installation or successful
programmatic endpoint comparison alone does not qualify either root.

## Smallest Native Replay Extension

The C++ transport already has the necessary operations; keep its descriptors,
trace hooks, admission and ABI unchanged. Limit the next orchestration change
to `replay.py`, original replay tests and a short README schema note:

1. Add an opt-in explicit lifecycle mode, for example a CLI flag forwarded as
   `explicit_lifecycle=True` to `build_transport`. Existing event-only scores
   retain their exact automatic-install behavior and coverage expectations.
   In explicit mode no installation is synthesized: every install is a
   declared row in the score, including the first I/F admissions.
2. Reuse the existing immutable bundle-to-slot/anchor maps. Accept only four
   actions in this mode: `install` carries a positive integer `revision`;
   `event` retains the existing executable anchor/inlet/typed-message fields;
   `tab` carries an executable anchor; `close` carries no anchor/message. Every
   action still binds `document`, a unique safe `step_id` and the bundle's
   exact `source_sha256`. Use that document's existing template slot on install;
   do not introduce a parallel graph builder or kind/parameter map.
3. Track each slot's last installed revision and live state while building the
   declared timeline. Refuse stale/noninteger revisions, event/Tab before
   install or after close, and close of an already absent owner. Reinstall
   after close must use a larger revision. An explicit later install may
   replace a live graph only if that reset is deliberately part of its action
   specification; the proposed score uses closes before its reinstalls.
4. Expect exactly the declared step IDs/actions/document slots in output,
   without a hidden install prefix. Compare each result's snapshot document
   set and revisions with the modeled live-owner set after that action;
   reject missing/duplicate live snapshots or lingering closed owners. Keep
   all existing acceptance/failure/overflow/Console-drop/template/authoring
   checks and source-owned string redaction. Include every bundle in the
   before/after retention hashes, even during intervals when it is closed.

This makes the 54-operation native score representable. Shared product views,
Max injection/readback and new comparator assertions remain separate tasks;
the replay schema must not invent a native second owner to stand for a child.

The smallest meaningful regression set is:

- Keep the existing legacy event-score wire/anchor/edge-order and explicit
  symbol-selector cases green; explicit mode must not change their automatic
  install prefix or named-symbol semantics.
- An original two-document fixture verifies delayed installation, a typed
  cross-document event, Tab, close, no delivery to the closed owner, and
  revision-2 reinstall resetting only that owner's state. Run it through the
  existing C++ runner as well as checking encoded operation order. It must not
  read an installed root or preserve source payloads in a public result.
- Refuse wrong source identity on each action family, a nonexecuting or absent
  event/Tab anchor, duplicate operation IDs, unknown action, bad/stale revision,
  event/Tab on an absent owner and repeated close. Exercise these as original
  orchestration fixtures before accepting private production bundles.
- Refuse missing/reordered/duplicated result rows, mismatched action/document,
  missing/duplicate live-owner snapshots, a closed owner left live and a wrong
  reinstall revision. Retain the existing failure/drop/overflow/immutability
  refusal and redaction checks. These prevent plausible empty traces from
  being accepted as lifecycle evidence.

For the separate comparator change, add an original case whose per-anchor
streams are identical but cross-anchor numeric/button order is reversed; it
must fail the new destination-output predicate. Add absent/duplicate endpoint
cases, an expected successful synchronous pair, and a display-only edit that
does not invoke the main-store predicate. No Print or generic interdocument
delivery-order claim belongs in these assertions.

## Preservation And Evidence

Use the existing marked disposable prefix/private-display ownership scheme only
after the parent reviews preparation and preceding evidence. Preserve original
installed sources, pristine copies, reusable source preferences and helpers;
serialize only expendable working files. Retain REA-bound receipt/session/cleanup
hashes and exact-owned cleanup evidence, with no screenshot/clipboard cycle.

Public output may contain source hashes, anchor IDs, classes, original numeric
stimuli, typed receipts, assertion outcomes and stable symbol hashes. Full
source/import/native descriptors, helper payloads, working snapshots and raw
source-owned strings stay private. Use the same `public_message` redaction on
both engines. Keep artifact integrity, numeric/endpoint parity, destination
order, physical action, shared-owner lifecycle, saved metadata and qualification
as distinct evidence fields with explicit unresolved outcomes.

The four helper identities checked privately here match the existing catalog:

| Helper | SHA-256 |
| --- | --- |
| helpstarter.js | `a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8` |
| helpname.js | `49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa` |
| helpdetails.js | `31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1` |
| helpargs.js | `04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469` |

The inspected native bundle metadata report has SHA-256
`80676933f935f6816e65ed1b6f9d68aacda9e953e8510322e0f310825d85188f`.
Planning code snapshots: replay
`8d5ee561b4c5cad40e188ae486339d132b31a5278ae64da9c8700b6ed3ce712b`,
compare `801563dd6264d41d9cfccd9935f75ec0f00ffc71de1d7a6672008453772adfd9`,
Max metadata/score builder
`6984de732e2a6a031139b7824509688f2ea5fbdad36a29673a658813d1ea0dc1`,
and Max controller
`5fce79613f8e63d19626b905b383e37227f9b2f0ea1281fa80f4cba615d74a0e`.
These identify the reviewed planning inputs and make no execution claim.
