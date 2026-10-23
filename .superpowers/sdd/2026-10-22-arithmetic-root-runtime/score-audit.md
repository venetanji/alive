# Independent Arithmetic Score Audit

Frozen scope: original score and previously audited numeric/replay interfaces.
Date: 2026-10-22. This report does not review in-progress stage code, execute a
test or runtime, launch Max/REA, make a capture, or qualify installed help.
Only this report is authored by the score auditor.

## Bound Inputs

| Input | SHA-256 |
| --- | --- |
| Runtime design | `66b37af5cd2eb81aeed680d6986db9784cce077f14319d07476f2e1c42a219d9` |
| Authoritative arithmetic score plan | `48958e5d075a3db34fcb089128b301f5db39537d692d11081a0d1732e8f4b055` |
| New `score.json`, 24,179 bytes | `95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb` |

Paths are the design, score plan and score named in the parent assignment.
An independently constructed 78-row operation table matches the parsed score
exactly, including action-specific fields, source identities, scoped anchors,
inlet 0, selectors, atom tags, original stimulus values, revision numbers,
unique step IDs and times/plus/minus order.

Installed sources were parsed only after their complete bytes matched the
pinned digests. Metadata-only identity results:

| Root | Bytes | Source SHA-256 | Basic |
| --- | ---: | --- | --- |
| times | 22,249 | `1eea3861a1605453fb3ed4daa4660f71e175fb2cf16ce4c4098cb53c5b94d54b` | `root/obj-4` |
| plus | 22,248 | `d1443c5af7ba8874c7b1d237e3d22bbe518970ad8ae85a09ec8f10494d084895` | `root/obj-2` |
| minus | 22,246 | `7968c6cf7d348b39d8fb8044c42977bc2b71fe55c4c7db8542150e79e6a1a0b0` | `root/obj-2` |

All four installed helper byte sizes and digests match the existing source
catalog: helpargs.js 3,623 bytes, helpdetails.js 4,199, helpname.js 905 and
helpstarter.js 1,591. All six arithmetic creation-text hashes and twelve
source-bound helper creation/identity hashes match the score-plan pins. No
authored operands, helper strings, source prose or source bodies are retained
here.

For each new root, the existing admission directory's authoring, flat, import
and production-native file hashes match `intake-001.json`; the import source
digest matches the installed source. The native descriptor schema is
`ultra-production-native-descriptors-v1`. Its ten prepared nodes and eight
edges retain the actual importer anchor map, and the prepared edge multiset
matches the saved source edge multiset. No replacement graph or native IDs
were invented for this audit.

## Independent Accounting

Each root has exactly this operation sequence: install r1, A01-A20, close r1,
install pristine r2, A21-A22, close r2. Post-operation live-owner sets were
recomputed; their maximum size is one and their final value is empty.

| Item | Per Root | Three Roots |
| --- | ---: | ---: |
| Explicit operations / checkpoints | 26 | 78 |
| Typed events | 22 | 66 |
| Installs / closes | 2 / 2 | 6 / 6 |
| Live checkpoints / explicitly empty checkpoints | 24 / 2 | 72 / 6 |
| Numeric values, seven per live checkpoint | 168 | 504 |
| Control/button emissions | 15 | 45 |
| Integer/float operator emissions | 7 / 8 | 21 / 24 |
| Integer/float display emissions | 8 / 9 | 24 / 27 |
| All original outlet emissions | 47 | 141 |
| Saved-cable deliveries | 30 | 90 |
| Direct inputs plus saved-cable inputs | 52 | 156 |

If the native trace records each semantic input and original output once,
the expected total is 99 trace receipts per root and 297 overall. This is a
derived native transport expectation, not a count of observer/protocol rows.

The seven numeric roles are IH, IC, ID, FH, AH, FC and FD; their short anchors
are respectively obj-17, obj-16, obj-25, obj-1, obj-7, obj-24 and obj-23.
I=obj-26, F=obj-10 and B=obj-22 complete the ten executable roles. Source
inventory independently confirms four number boxes, three flonums, two
arithmetic nodes and one button. Each root retains 20 complete-tree boxes,
16 Basic boxes and eight Basic cables. There are no isolated executable
nodes. All three saved flonums have format 6.

All ten executable roles emit in the score. The per-root emission histogram
is B=5, IH=2, IC=3, ID=8, I=7, FH=2, AH=1, FC=2, FD=9, F=8.
Every saved cable is exercised. Delivery counts by source role are IH=2,
IC=3, B=5, I=7, FH=2, AH=1, FC=2 and F=8, totaling 30. Preserve all saved
records and their sequence; this tally establishes no saved callback order.

The seven numeric nodes each have two original outlets; I, F and B each have
one. Observe all 17 original outlets per live owner, including all seven
numeric outlet-1 leaves. Every expected emission is outlet 0, and every
numeric outlet 1 is silent in every programmatic event bracket. The button
has no invented persistent numeric state.

## Role-Specific Typed Expectations

This table contains original proposed numeric inputs/results already present
in the public score plan. It contains no installed creation operands. Each
tuple is `(times; plus; minus)`. `i0` and `f0` are separate private,
source-owned initial results for each root. `I -> ID` and `F -> FD` mean one
receipt at each role, with the same selector, tag and value. Unlisted roles
and outlets are silent. These are receipt inventories, not asserted observer
callback ordering.

| Action | Control or Display-Only Receipt | Arithmetic and Connected Display Receipts |
| --- | --- | --- |
| A01 | B bang | I -> ID: int i0 |
| A02 | none | F -> FD: float f0 |
| A03 | IC int -3 | none |
| A04 | IH int 7 | I -> ID: int (-21; 4; 10) |
| A05 | B bang | I -> ID: int (-21; 4; 10) |
| A06 | IC int 0 | none |
| A07 | B bang | I -> ID: int (0; 7; 7) |
| A08 | IC int 7 | none |
| A09 | IH int -3 | I -> ID: int (-21; 4; -10) |
| A10 | ID int -3 | none |
| A11 | B bang | I -> ID: int (-21; 4; -10) |
| A12 | FC float 0.25 | none |
| A13 | FH float 7 | F -> FD: float (1.75; 7.25; 6.75) |
| A14 | none | F -> FD: float (1.75; 7.25; 6.75) |
| A15 | AH int -3 | F -> FD: float (-0.75; -2.75; -3.25) |
| A16 | FC float -3 | none |
| A17 | none | F -> FD: float (9; -6; 0) |
| A18 | FH float 0.25 | F -> FD: float (-0.75; -2.75; 3.25) |
| A19 | FD float 7 | none |
| A20 | none | F -> FD: float (-0.75; -2.75; 3.25) |
| A21 | B bang | I -> ID: int i0, equal to A01 after pristine reinstall |
| A22 | none | F -> FD: float f0, equal to A02 after pristine reinstall |

Whole-valued and zero float results remain float-tagged. Signed-zero
distinction is not established by numeric equality and needs its own
capability evidence before it can become a comparison requirement.

All 504 UI expectations follow a finite recurrence. At each pristine install,
read all seven actual prepared/source-owned initial UI values privately; make
no startup control emission. A03/A06/A08 set IC to -3/0/7. A04/A09 set IH to
7/-3. A12/A16 set FC to 0.25/-3. A13/A18 set FH to 7/0.25. A15 sets AH to -3.
An operator receipt updates only its connected display; A10 and A19 directly
edit ID and FD only. Every other UI value retains its preceding value. Both
installs must match the first pristine seven-value state, independently of
the arithmetic-store reset checked by A21/A22.

In particular, FH still reads 7 after A15 while F's retained left input is
-3; AH still reads -3 after A18 while F's retained left input is 0.25.
A03/A06/A08/A12/A16 leave the corresponding result display unchanged. A11
and A20 undo display-only edits by recall. A06/A09 establish number-UI
truncation, not direct float coercion at I's own inlet. Operator input pairs
on Max remain semantic inferences unless an independently established
internal getter exposes them.

Initial i0/f0 receipts and unchanged initial UI values are source-owned data,
even when numerically equal to a proposed stimulus/result. Keep their raw
snapshots, receipts and descriptor operands private. Public success records
must contain digests, counts and finite assertion outcomes only.

## Concrete Reuse Hazards

These findings concern the old audited interfaces only; they are not findings
against in-progress arithmetic-stage implementations.

1. `help-roots-native-20261022/compare.py:107` requires Message readback and
   cold-Message capability; `compare.py:204` synthesizes eager installs and
   counts Message states. `compare-int-float.py:13` fixes documents/UI roles,
   and `compare-int-float.py:204` requires a particular Message node. None can
   serve as the arithmetic semantic comparator unchanged. There are zero
   arithmetic Message boxes; an empty Message inventory is not a positive
   Message capability observation.
2. `int-float-runtime-20261022/numeric.py:229` fixes Basic anchors to
   `root/obj-2`, which rejects times. `numeric.py:314` rejects an empty
   live-owner checkpoint set. `run-runtime.py:209` fixes 102 snapshots and 612
   numeric states. Arithmetic requires 78 explicit operation records, 72
   live snapshots, six empty close records and 504 numeric values.
3. `lifecycle.py:195` fixes four revision owners and int/float definitions;
   `lifecycle-observer.js:2` fixes five inlets and line 23 fixes four owners.
   `lifecycle.py:473` and its final-state rules encode four monitor slots.
   Its close order `(2,0)` proves only two historical closes. Arithmetic needs
   six unique source/revision owner channels and six real close witnesses.
4. `controller.js:589`, `lifecycle.py:652` and
   `lifecycle-observer.js:40` require both revision-2 int/float owners still
   live/monitoring at the final barrier. Arithmetic ends with every owner
   closed, and all six channels must retain exactly one validated witness
   through the sealed final barrier.
5. `v8-readback.js:9` accepts only finite scalar or singleton-number-array
   getters and derives semantic tags from classes. `numeric.py:296` preserves
   that distinction with `receipt_tag_observed=false`. Reuse those finite
   shape/refusal checks; class-derived tags cannot prove arithmetic outlet
   tags. `observer.js:18` has msg_int/msg_float handlers, but actual current
   dispatch/tag capability still needs observation. `run-runtime.py:172`
   validates typed float injection only at the old E05 anchor.
6. `numeric.py:78`, `numeric.py:94` and `numeric.py:115` define exact old-root
   shell-height, annotation geometry and float-mode profiles. Their source,
   helper, anchor, attributes and geometry pins do not cover arithmetic.
   Preserve an unknown disposition unless new arithmetic-bound evidence
   justifies an exact exception; a global class or geometry relaxation fails
   source retention.
7. `replay.py:257` publishes original trace messages and numeric snapshot
   values. Its current symbol hashing does not redact source-owned numeric
   startup state. Reuse private transport and lifecycle checks, then use a
   separate finite public arithmetic projection. Never publish the full raw
   replay result as arithmetic evidence.

## Finite Schema Recommendations And Admission Blockers

The arithmetic-specific ledger must pin the complete score bytes/digest and
all three source identities. It needs exactly 78 unique ordered operation
rows with step/action/document/source, actual owner identity, installed
revision, request/ACK binding, expected live-owner set and a checkpoint
completion result. Require six install rows, six close rows and 66 typed
event rows; reject extras rather than reducing the denominator.

For 72 live checkpoints, require the exact seven-anchor duplicate-sensitive
numeric inventory, finite observed getter shape/value, source class,
class-derived tag basis explicitly separated from observed receipt tags,
owner/source/revision binding, immutable retained readback digest and byte
length, complete topology/leaf retention, and getter silence. For six close
checkpoints, explicitly require an empty live set and no numeric inventory,
plus independently validated close evidence. An omitted row is a failure.

Require an exact per-operation original-outlet multiset with role/anchor,
port, scalar selector/tag/value, source/revision owner and acknowledged
dispatch bracket. Compare operator outlets before display conversion. An
unknown numeric receipt tag cannot pass a typed result. Cold and display-only
silence needs a completed bracket and unchanged readback, not absence of a
row. Reject forwarding observers, overflow, duplicate or unexpected output,
and stale/closed-owner emissions. Endpoint observations alone retain
`saved_order_observed=false`.

Require a sealed private six-owner lifecycle map, unique fresh working source
bindings, source/pristine/working verification at every install, six
independent real-owner close proofs, and a final all-closed barrier validated
from retained private protocol bytes. Closing only a Basic view, reopening an
instrumented serialization or retaining a revision-2 owner cannot satisfy the
score. Native slot revisions must increase.

Maintain source-owned initialization expectations privately from actual
production descriptors. Public outcomes may report checked/matched counts,
hashes and finite assertion booleans, including reset, silence, tag evidence,
source retention and lifecycle completeness. Do not claim full comparison if
any of the 78 operations, 504 numeric states or 141 emissions is missing,
ambiguous, misbound or extra. Successful native replay alone makes no Max
parity claim; programmatic parity alone makes no installed-help qualification.

No score-design blocker was found. The complete score is internally
consistent. The old interface constraints above are concrete blockers to
using those interfaces unchanged; fresh arithmetic implementation and actual
capability/lifecycle evidence remain the parent's separate work.

Final readback of the three bound design/plan/score inputs, three installed
root sources, four installed helpers and twelve private bundle files found
every recorded digest unchanged. This closes and freezes the score audit;
subsequent implementation or capture review must be a separately scoped
review against this score identity.
