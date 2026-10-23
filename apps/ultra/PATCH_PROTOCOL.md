# Editable canvas protocol

The canvas supports flat `ultra-canvas-v1` and embedded `ultra-patcher-v2`
documents, both targeting a bounded native execution profile. Neither denotes
complete Max compatibility.
The canvas edits actual connections. UI/control data is prepared outside rendering;
message dispatch and metro/makenote/line timing run in the native runtime.
While audio runs, its callback owns the graph clock. With audio stopped, a
native worker advances the control scheduler at the same 48 kHz frame scale
under the control lock; audio events are discarded and no device is opened.
Signal evaluation runs only while DSP is on. UI polling never clocks control
messages. The desktop uses Rust CPAL for output and has no physical MIDI
ingress/external clock yet. The MIDI object contract below is supported by the
legacy JACK diagnostic/ABI tests, not a claim of CPAL MIDI input.

Pan/zoom are view-only state: they neither alter node coordinates nor publish
native graphs. Locked mode refuses structural Inspector edits while allowing
ordinary live parameters.

## Workspace and files

The native workspace admits up to 16 patch, help and example documents. Each
root owns an independent graph, revisions, control state, timers and voice state.
Embedded native views bind to that owner without consuming root slots. All
documents share one native runtime and stereo audio device.
Start/Stop audio, audio settings and Panic affect that shared output. Stop audio
clears timers and notes across all documents. `canvas_stop` also freezes and
silences that document's signal graph; closing a child detaches only its view,
while closing the owner disposes its graph and closes its child windows.
An accepted local event, parameter change or incoming named Receive resumes a
locally stopped continuous signal graph. Explicit global DSP restart resumes
continuous signals in every document, including locally stopped ones, but does
not rearm metros. Focus and visibility changes preserve playback. Starting audio
retains documents' ordinary values and runtime receive bindings. Cycle restarts
at its reset phase; Phasor retains its running phase across DSP off/on.

Native New, Open, file drop, startup paths and later process invocations open
separate windows. Reopening a canonical file path focuses the existing window.
Secondary invocations queue delivery on the main event loop so the initial
document is registered before a startup file request can create another window.
Save/Save As validates the whole document and atomically replaces the destination
with Ultra JSON; `.ultra` is preferred and `.json` is accepted. Modified windows
offer Save, Discard or Cancel when closing. Dirty state compares saved content,
so undo can return a patch to clean and edits made during a save remain dirty.
There is no autosave or saved runtime-clock snapshot.

Max JSON sources, including `.maxpat` and `.maxhelp`, enter through the existing
named-patcher compatibility report, with explicit acceptance for partial imports.
The source may be at most 8 MiB; the selected Ultra graph must meet the ordinary
document bounds below. Saving an imported source always requires a separate Ultra
destination, even if its source extension was `.json`. The original source is
protected from overwrite. Advanced JSON / Max import is the explicit workflow
for replacing the current graph. Browser preview uses separate preview windows,
file input and downloads, without native execution.

Help & Examples contains 125 original entries: help and an example for each of
the 60 native kinds and two authoring constructs, plus the starter. Object Help opens or focuses a native help patch
window. The library also lists open native documents for focusing; proprietary
Max help content is not bundled.

## Document and IPC

### Embedded authoring documents

Version 2 uses `{version:2, profile:"ultra-patcher-v2", nodes:[...], edges:[...]}`.
`patcher` nodes add `patcher:{nodes,edges}` and `params:{name:string}`;
`comment` nodes use `params:{text:string}`. Containers and comments have no
native state. Generic `inlet` / `outlet` connectors use empty params and lower
to transparent native relays. IDs are globally unique across the complete tree;
cables reference objects in the same immediate patcher. Connector ports sort
by x, breaking ties in saved node-array order. Moving/removing a boundary
remaps/removes the parent's cables by connector identity in the same undo step.

The complete authoring tree supports 512 nodes, 1024 cables, 16 embedded levels
and 1 MiB compact JSON. Readable files may be up to 8 MiB before parsing.
The compiled graph retains the 32-node / 64-cable limits, including relays;
over-limit inputs report an error without truncation. `patcher` names contain
1..127 printable ASCII bytes; comments contain at most 4096 printable ASCII
bytes with tabs/newlines. Unknown fields and invalid styles are rejected.

Version 2 may add root-only `helpShell:{adapter:"max-help-four-v1",object,
basicNode,questionNode}` for `append`, `prepend`, `int` or `float`. This requires
exactly four root nodes: `starter` and `name` helpers, plus direct patchers named
`basic` and `?` with distinct positive IDs matching the metadata. Basic contains
one `details` and one `arguments` helper; the question scope is empty. Helpers
use `type:"help_helper"` and exactly `params:{role}`, accept general appearance
fields, have no ports or child scopes, and appear nowhere else. Helpers count
toward authoring bounds and are omitted explicitly from native lowering.
Explicit null, extra metadata fields, helper cables and incomplete shells reject.
The metadata survives Save, CAS, history and document publications; it carries
neither provenance nor reference prose. Directly authored valid shells are allowed.

`help_shell_probe({source})` is a read-only pre-import command available to an
open patch caller. It hashes at most 8 MiB of exact UTF-8 source bytes and checks
four known source identities plus four local helper identities without executing
scripts. `help_reference({name})` requires the caller's owner to have an admitted,
validated shell, and returns plain text only for the finite 13-object catalog.
Both commands resolve fixed paths beneath the canonical `ULTRA_MAX_RESOURCES`
directory, or the existing Ableton Wine Max resources directory under `$HOME`
when that setting is absent. An invalid explicit setting never falls back.
Reference XML is bounded to 512 KiB, depth 32, 16 KiB per extracted field,
64 entries per list and 256 KiB per serialized response; excess, duplicate
recognized fields/lists, DOCTYPE, unknown entities and invalid controls reject.
Missing or modified local resources return explicit unavailable states. Local
references and verified shell retention do not qualify complete Max behavior;
whole-help qualification remains 0/2,103.

Double-click `p` or press Enter on its focused header to open/focus its native
editor window; the path bar focuses a parent window. Browser preview navigates
inline. Up to 64 child views attach to each owner. One root tree owns saved
content, history, native revision and runtime. Navigation has no execution or initialization
side effects; Save/export from any scope includes the entire tree. Parent and
child objects exchange messages synchronously and signals sample by sample.
Relays carry control and mono domains independently, and an undriven relay
does not create a phantom signal connection. Legacy stereo bundles do not
pass through these mono boundaries. Child close retains execution; owner close
prompts once and closes its children. Max load initialization remains pending.

Native descriptors separate `label` (view) from `ownerLabel` (document), with
`viewPath`, `authoringRevision`, `runtimeRevision`, `messageTextSerial`, `descriptorRevision` and
complete root `patch`. The owner-wide descriptor revision orders runtime and
save metadata publications, including changes that leave authoring unchanged.
`document_current` prepares an owner once. `document_commit({baseRevision,patch,
parameter?,messageText?,history?,force?})` and `document_history({baseRevision,direction})`
return `{accepted,document}`; stale CAS rejects without mutation. Native validates
the complete tree and admits execution before publishing. History is bounded by
100 snapshots and 16 MiB. `document-changed` targets fresh descriptors to every
owner view. Save uses the canonical root and retains the actual saved baseline
even if another view edits during the picker. `document_open_patcher({node,
reveal?,expectedRevision?})` opens a container view, with zero selecting the root.
Source reveals require the console record's `expectedRevision`. Native checks
that revision and the source's membership under the registry lock before
creating or mutating a view. Pending descriptors pair `revealNode` with
`revealRevision`; graph replacement removes stale pairs. `document-reveal`
carries `{node,revision}`, including events delivered during initial view
adoption. The receiving view waits for initialization and queued authoring,
refreshes an older descriptor when needed, and selects only a matching source.

Native close first asks all ready owner views to flush pending edits, or only
the closing child. `document-flush-before-close` carries `{requestLabel,token}`;
`document_close_flushed` acknowledges from the calling view, or cancels with an
optional error. The dirty decision follows acknowledgement.
The editor blocks new authoring during that request; failed pending edit or
history admission cancels closing. `document-close-cancelled` carries the same
request identity and releases matching barriers after cancellation or a save
choice. A view finishing boot joins its owner's close request. Event listeners
register before `document_current` marks the view ready.
Console draining uses a bounded owner cache and per-view cursors, so polling one view never steals
another's records. Geometry/style edits preserve runtime revision; a single
validated live numeric change, including its undo, uses one atomic native
parameter/hot-event record. A single MessageBox text change, including undo/redo,
uses an atomic text record. Other executable changes replace the owner graph.

Supported embedded Max `p` graphs and comments import as v2 trees. Unsupported
scripts, helpers, abstractions and startup behavior remain explicit diagnostics,
requiring partial-import acceptance where applicable. Whole-help loading and
whole-help conformance are separate; conformance remains 0/2103.

### Flat documents

JSON: `{version:1, profile:"ultra-canvas-v1", nodes:[...], edges:[...]}`.
Node: `{id:positive integer, type:string, x:number, y:number, params:object, style?:object}`.
Edge: `{from:nodeId, outlet:integer, to:nodeId, inlet:integer, midpoints?:number[]}`.
Maximum 32 nodes, 64 edges, 64 KiB JSON per document. IDs are unique within a
document; finite positions 0..4000.
Reject unknown types/parameters, invalid ports, type mismatches, duplicate edges,
and cycles within either the control or signal dependency graph. The two graphs
are validated separately: sampled feedback such as `sig~ -> snapshot~ -> sig~`
is legal. Mixed inlets accept control or mono signals; multiple signal sources
sum at a mono input. Legacy stereo bundles require matching bundle ports.
Disconnected nodes are allowed.
Edge array order is explicit stable fan-out order. Message dispatch is depth-first,
with bounded work; runaway/overflow fails closed. Legacy control arithmetic clips
to -100000..100000; typed scalar arithmetic refuses unrepresentable results
with a Console diagnostic. Integer MIDI/enumerated updates floor, while `int` truncates
toward zero. Incompatible messages are ignored according to each object's
contract. Negative counter/chord indices clip to zero. Scheduled makenote
terminations retain their original pitch/deadline after later parameter changes.

Canvas commands resolve the calling native window's owner. A document cannot
address another owner's nodes by copying its IDs or revision; sibling child
views deliberately share the same owner graph.
`canvas_apply({patch})` returns `{revision}` after validated admission;
`canvas_event({revision,node,inlet,value})` delivers bang with null, or a numeric
list of 1..8 finite values in -100000..100000, or a literal message string.
`canvas_event({revision,node,inlet:0,value:null,action:"tab"})` delivers a physical
Tab action to `number_int` or `flonum`. The dedicated
`ultra_canvas_tab_document(document,revision,node)` ABI admits it through the
same bounded queue and shared executor as messages, with DSP on or off. It emits
one bang from outlet 1 without changing the number or installing a graph.
Other action names, non-null values, nonzero inlets, other object kinds, stale
revisions and closed owners are refused. An ordinary message selector `tab`
emits nothing; it is not the physical UI action.
Strings retain integer/float/symbol tags and an optional selector. At most eight
payload atoms, symbols of at most 31 ASCII bytes, and 127 bytes of literal text
are admitted. Spaces, tabs and line breaks separate atoms. Explicit `list` and
`symbol`, plus selectors such as `set`, `stop`, `pause` and `resume`, are supported.
Quotes, backslashes, commas and semicolons are rejected. Whole-token `$1`/`$2`
are admitted only in MessageBox templates and their cold/set replacement inputs.
`canvas_param({revision,node,key,value})` changes one
supported numeric parameter without replacing the graph. `canvas_stop()` stops
this document's timers/pending note work, clears its voices and freezes/silences
its signal graph until a resume condition described above. `canvas_status()`
returns active revision, per-node `{id,value,pulses}` observations, drained
`console` records and cumulative `console_dropped`, plus nullable `message_boxes`
and `print_popups` described below. UI polls, never clocks notes.
Message literals have the same -100000..100000 bound. Toggle, steps, root, shape, velocity, channel, device, attack, release and gain are integer-valued; number/rhs and interval/duration may be fractional.
Node activation/state readout is native, not simulated. Stale revisions are refused.

Structural edits publish a prepared bounded plan and reset only that document's
runtime state/timers/notes. Audio and other documents stay available; continuous
signals resume from reset state while DSP is on, but users explicitly start the
edited document's metro again.
Ordinary parameter edits do not reapply the graph or stop transport. Message
text, print `label`, send/receive `name`, variadic creation `args`/`channels`,
MIDI channel, voice device and arithmetic `numericmode` changes are structural-only.
Layout edits are UI-only.
Validate/prepare before publishing; invalid edits retain the last valid active graph.
Stop/start audio retains the latest valid graphs but leaves stopped timers off.

### Optional Cable Midpoints

Both document versions accept optional `edge.midpoints`: a flat, even array of
0..256 finite numbers in 0..4000, representing at most 128 local x/y vertices.
Empty arrays, fractional coordinates, repeated vertices and saved order survive
validation, import, serialization and history. Explicit null, odd arrays,
nonnumeric coordinates and coordinates outside the bounds reject authoring
documents. Nested vertices belong to their immediate patcher coordinate space.

Rendering derives rounded segmented routes from these saved arrays without
rewriting them. The first and last bend x coordinates align with the current
ports; one saved point produces two bends at its y. Adjacent duplicate display
points collapse, and corners use up to 12px trims, limited by half of adjoining
segment lengths. This contour fits the retained initial Max image; its precise
radius and general routing algorithm are not qualified. Absent or empty arrays
keep the automatic cubic curve. Visible and hit-test paths share one contour.

Ultra's current movement policy keeps vertices absolute when one endpoint moves
or the endpoints move by different deltas. When both endpoints move by exactly
the same delta, their vertices translate together. An out-of-bounds result rejects
the complete edit without changing the document or history. This editor policy
is not yet qualified against Max movement behavior.

Midpoints are authoring appearance only. Lowering and execution comparisons
explicitly exclude them; moving cables and undo/redo do not install a new native
graph, change its runtime revision or reset live state. Existing native ABI,
graph capacities and document byte limits remain unchanged. Max import retains
valid arrays without a midpoint appearance warning. Invalid saved geometry is
omitted with an `appearance-gap` diagnostic while retaining an otherwise
executable cable; unrelated cable diagnostics remain visible.

### Optional Display Style

`node.style` stores bounded appearance overrides. Omitted fields inherit the
renderer theme; old patches need no new field. JS document validation and Rust
preparation reject unknown, inapplicable or malformed attributes. Rust validates
style but writes none of it into native descriptors. Style edits and their
undo/redo history update the authoring document without graph installation,
runtime parameter IPC, revision changes, timer resets or observation resets.
The 32-node, 64-cable and 64 KiB document limits still apply.

Color fields use native Max attribute names and exactly four finite RGBA
components in 0..1. This is a small inline appearance contract; it does not
resolve Max named styles, arbitrary attributes or font resources.
Attribute names and control groups follow the installed Max jbox, button,
toggle, number, flonum, slider and gain~ references. Numeric bounds are Ultra's
document limits.

| Types | Allowed Style Fields |
| --- | --- |
| All | `width` 12..1200, `height` 12..800, `fontsize` 8..48; RGBA `bgcolor`, `textcolor`, `color` (object outline). |
| `bang` | RGBA `blinkcolor`, `outlinecolor`. |
| `toggle` | RGBA `bordercolor`, `checkedcolor`, `uncheckedcolor`. |
| `number`, `number_int`, `flonum` | RGBA `bordercolor`, `tricolor`; integer `triangle` 0/1. |
| `slider` | RGBA `bordercolor`, `knobcolor`, `elementcolor`; integer `orientation` 0 automatic, 1 horizontal, 2 vertical. |
| `gain` | RGBA `bordercolor`, `knobcolor`; integer `orientation` 0/1/2. |
| `comment` | Integer `bubble` 0/1; integer `bubbleside` 0 top, 1 left, 2 bottom, 3 right; finite `bubblepoint` 0..1. |

Comments use multiline text in saved bounds, with an original callout outline
when `bubble` is 1. Omitted defaults are bubble 0, side 1 and point 0.5. Callout
geometry reserves 15px on the selected side and 5px body padding; corners and
arrow attachment approximate the retained Max observation, scaling safely at
the supported minimum dimensions. Explicit colors remain local authoring
overrides. They do not establish every Max bubble color/style interaction.
Flat Max comments select the existing v2 authoring profile. A missing comment
fontsize may snapshot the nearest valid patcher default_fontsize. Font resource,
named-style and saved linecount warnings remain: Max's linecount loader can fit
new width/height rather than simply preserving patching_rect.

Dimensions are the width and height projected from Max `patching_rect`; existing
node `x` and `y` retain position. Rendering preserves port clearance: gain has a
30px minimum width; other multi-port objects use 18px per port. Resize gestures
use the same rendered minimum. Inspector metadata is exported by
`appearanceFields(type)`, and `validateStyle(type, style)` validates and clones
an override object. `CanvasDocument.style(id, key, value, options)` and the
controller equivalent create history entries. Passing null as the value removes
one override; `style(id, null)` removes the whole style in one history entry.
Null is an editing operation, not a permitted saved attribute value.
Reconfiguring an object preserves all fields still applicable to the new type
and removes only fields that type cannot display.

## Object registry / initial semantics

All inlets are at the TOP, all outlets at the BOTTOM. Port indexes left to right.
Control messages have bounded typed numeric/symbol atoms. Dictionaries and
arbitrary Max message syntax are unsupported. Plain-name global send/receive is
supported for control messages; signal-rate `send~`/`receive~` is not. Signal ports
carry mono samples; mixed inlets also accept control messages. The legacy `join~`
and `stereo.dac~` path carries an explicit stereo bundle.

| kind | type | params (defaults; bounds) | inlets | outlets |
|---|---|---|---|---|
|0|bang|none|0 control: any input emits bang|0 control|
|1|message|text="60 100"; bounded typed literal, <=127 ASCII bytes|0 trigger emits stored message; literal empty `list` emits nothing|0 control|
|2|number|value=0; -100000..100000|0 hot stores/emits or bang emits; 1 cold stores silently|0 control|
|3|toggle|value=0; 0/1|0 bang toggles, scalar sets boolean/emits|0 control|
|4|add|rhs=0; numericmode=0; see typed arithmetic below|0 hot value/bang; 1 cold rhs|0 control|
|5|multiply|rhs=1; numericmode=0; see typed arithmetic below|0 hot value/bang; 1 cold rhs|0 control|
|6|metro|interval=150 ms;20..2000|0 scalar on/off, bang emits once; 1 interval ms|0 control bang|
|7|counter|steps=8;1..32|0 bang emits current index then increments modulo steps;1 resets index from scalar|0 control|
|8|chord|root=48;0..127; shape=0;0 major/1 minor/2 sus4|0 index -> root+triad[index%3]+12*floor(index/3), clipped0..127;1 root|0 control|
|9|makenote|velocity=100;1..127; duration=150 ms;10..2000|0 pitch -> [pitch,velocity], delayed [pitch,0];1 velocity;2 duration|0 control pair|
|10|midiin|channel=2;1..16|none|0 control [pitch,velocity], note-off velocity0|
|11|voice|device=0;0/1; attack=8;0..127; release=28;0..127|0 note pair;1 attack;2 release|0 mono audio|
|12|gain|value=90;0..127|0 mono audio;1 level control|0 mono audio|
|13|join|none|0 mono audio;1 mono audio|0 stereo audio|
|14|dac (authored `stereo.dac~`)|none|0 stereo audio|none|
|15|int|value=0; -100000..100000|0 hot stores/emits, bang recalls, set silent, send name;1 cold stores|0 integer; send name uses named bus only|
|16|float|value=0; -100000..100000|0 hot stores/emits, bang recalls, set silent, send name;1 cold stores|0 float; send name uses named bus only|
|17|flonum|value=0;minimum=-100000;maximum=100000;numdecimalplaces=6 (0..9)|0 hot numeric UI, set silent, min/max bounds|0 float;1 physical Tab bang|
|18|slider|value=0;size=128 (integer1..100000);min=0;mult=1;floatoutput=0 (0/1)|0 numeric value or silent set; setminmax enables float mapping|0 number|
|19|pack|args="0 0";1..8 typed initial fields|N inlets;0 hot emits full list;remaining cold|0 stored sequence|
|20|unpack|args="0 0";1..8 typed fields|0 list, bang recalls stored fields|N outlets, right to left|
|21|select|args="0";1..8 selectors|0 compares first atom;1 cold selector only with one argument|N match bangs + unmatched|
|22|route|args="0";1..8 selectors|0 compares selector/first atom;N cold selector stores|N stripped matches + unmatched|
|23|trigger|args="i i";1..8 formats/constants|0 message|N converted outputs, right to left|
|24|line|value=0;time=0 (0..100000 ms);grain=20 (1..100000 ms);floatoutput=2 (0 int/1 float/2 auto)|0 target/time pairs, set, stop, pause, resume;1 next time;2 grain|0 ramp value;1 completion bang|
|25|print|label="print" (one ASCII token, 1..31 bytes);level=0 (0 message/1 warning/2 error/3 debug);popup=0 (integer 0/1)|0 any accepted message writes to console and optionally shows a transient value bubble|none|
|26|send|name="channel"; required ASCII token, 1..31 bytes|0 forwards complete accepted typed message unchanged|none|
|27|receive|name=""; empty or ASCII token, 1..31 bytes|unnamed creation: 0 accepts `set name`; named creation: none|0 complete received message|
|28|iter|none|0 stores and iterates input; bang recalls|0 successive typed atoms, in source order|
|29|prepend|args=""; 0..8 typed prefix atoms|0 prefixes data; `set` silently replaces prefix; bare object passes through|0 combined message|
|30|append|args=""; 0..8 typed suffix atoms|0 appends retained suffix; `set` silently replaces suffix; bang emits nothing|0 combined message|
|31|zl_reg|args=""; 0..8 initial atoms|0 hot stores/emits or bang recalls;1 cold stores|0 retained sequence;1 inactive|
|32|zl_join|args=""; 0..8 initial right atoms|0 hot left sequence/bang;1 cold right sequence|0 concatenated sequence;1 inactive|
|33|zl_len|none|0 stores/counts sequence;1 inactive|0 integer count;1 inactive|
|34|zl_iter|size=0; integer0..100000|0 stores/iterates sequence or bang recalls;1 cold chunk size|0 successive chunks; size0 emits nothing;1 inactive|
|35|zl_slice|size=0; integer0..100000|0 stores/slices sequence or bang recalls;1 cold leading size|1 tail first, then0 leading slice; empty halves emit nothing|
|36|zl_rev|none|0 stores/reverses sequence or bang recalls;1 inactive|0 reversed sequence;1 inactive|
|37|zl_rot|rotation=0; integer-100000..100000|0 stores/rotates sequence or bang recalls;1 cold signed distance|0 positive right/negative left rotation;1 inactive|
|38|sig (`sig~`)|args="0";1..8 finite numbers|0 mixed control/mono; incoming signal establishes order but values are ignored|N mono signals|
|39|signal_add (`+~`)|rhs=0; -100000..100000|0 and 1 mixed control/mono|0 mono signal|
|40|signal_subtract (`-~`)|rhs=0; -100000..100000|0 and 1 mixed control/mono|0 mono signal|
|41|signal_multiply (`*~`)|rhs=0; -100000..100000|0 and 1 mixed control/mono|0 mono signal|
|42|signal_divide (`/~`)|rhs=0; -100000..100000|0 and 1 mixed control/mono|0 mono signal; division by zero emits 0|
|43|cycle (`cycle~`)|frequency=0;phase=0; -100000..100000|0 frequency mixed control/mono;1 phase offset mixed control/mono|0 mono sine|
|44|phasor (`phasor~`)|frequency=0;phase=0; -100000..100000|0 frequency mixed control/mono;1 phase/reset mixed control/mono|0 mono ramp|
|45|noise (`noise~`)|none|0 physical control inlet; no supported methods|0 mono noise in [-1,1]|
|46|signal_clip (`clip~`)|minimum=0;maximum=0; -100000..100000|0 signal/value, 1 lower, 2 upper; all mixed control/mono|0 mono clipped signal|
|47|line_signal (`line~`)|value=0 (-100000..100000);time=0 (0..100000 ms)|0 control target/time pairs, set, stop, pause, resume; 1 next time|0 mono ramp; 1 completion bang|
|48|snapshot (`snapshot~`)|interval=0 (0..100000 ms);offset=0 (integer 0..63)|0 mixed signal/control: bang, offset, start, stop; 1 interval control|0 float control|
|49|signal_dac (`dac~`)|channels="1 2";1..8 mappings, each 1 or 2|N pure mono signal inlets|none|
|50|inlet|empty params; v2 boundary relay|native mixed port0; no child surface inlet|mixed control/mono port0|
|51|outlet|empty params; v2 boundary relay|mixed control/mono port0|native mixed port0; no child surface outlet|
|52|number_int|integer value=0;minimum=-100000;maximum=100000;ordered bounds|0 numeric/bang, set silent, integral min/max bounds|0 integer;1 physical Tab bang|
|53|message_box|text=""; bounded literal/template, <=127 ASCII bytes|0 hot/recall, `set` silent;1 silent replacement|0 typed control|
|54|subtract (`-`)|rhs=0; numericmode=1|0 hot value/list/bang;1 cold rhs|0 typed difference|
|55|divide (`/`)|rhs=1; numericmode=1|0 hot value/list/bang;1 cold rhs|0 typed quotient|
|56|modulo (`%`)|rhs=1; numericmode=1|0 hot value/list/bang;1 cold rhs|0 typed remainder|
|57|reverse_subtract (`!-`)|rhs=0; numericmode=1|0 hot value/list/bang;1 cold rhs|0 typed right minus hot|
|58|reverse_divide (`!/`)|rhs=1; numericmode=1; omitted Max numerator remains unqualified|0 hot value/list/bang;1 cold rhs|0 typed right divided by hot|
|59|abs|numericmode=1|0 numeric value/list; bang/set silent|0 typed absolute value|

### Typed Scalar Arithmetic

`numericmode` is 0 legacy Ultra, 1 integer or 2 float. Add/Multiply default to
0 when loading old rhs-only documents; the six new kinds allow only 1 or 2.
Binary `rhs` remains within -100000..100000 and must be integral when authored
in integer mode. Native descriptors encode rhs in p0 and mode in p1; Abs uses
p0=0. Existing kinds, descriptor sizes and graph capacities remain unchanged.
Mode changes require graph replacement, including their Undo/Redo. A live rhs
edit is cold, mode-aware and does not replace the graph.

New symbolic `+`/`*` creation explicitly chooses mode and uses rhs=0 for both.
Plain decimal tokens containing a dot choose float mode; whole float editor text
retains its trailing dot. Modern arithmetic refuses exponent creation tokens
explicitly because the original `2e0` probe used default integer behavior.
Small saved float operands render as plain decimal text without rounding.
Arithmetic object text allows 384 characters to retain subnormal operands;
other ordinary object text keeps its 160-character limit.
English `add`/`multiply` and explicit `add.legacy`/`multiply.legacy` retain the
old rhs/default/tag behavior. Saved documents are not globally migrated.

Typed integer operations truncate incoming hot/cold operands toward zero and
emit integer messages. Float operations retain fractions and always emit float,
including whole results. Hot numeric lists use the first numeric atom as hot
input and a numeric second atom as the new cold operand; additional atoms are
ignored in the observed cases. Cold scalar input stores silently; the tested
cold two-number lists do not replace the operand. Bang recomputes with retained operands. `set` stores
the hot operand silently for +, *, -, / and %, while the observed reverse
operators ignore it. Abs uses the first numeric list atom and does not recall
on bang or set.

Integer `/` treats a coerced zero denominator as one; integer `%` by zero emits
zero. Reverse `!/` by zero emits typed zero in either mode. Original floating
`/` by zero emits Infinity and `%` by zero emits NaN. Ultra refuses those
outputs and any result outside its finite control envelope, emitting an error
at the arithmetic object while retaining accepted operands for later recovery.
It does not clamp those results into a claimed Max equivalent. Typed imports
retain an explicit profile limitation, and omitted `!/` creation retains its
unqualified-default warning. Float named-inlet selector variants and untested
message forms are not qualified by the finite oracle.

Original typed receipts are in
`experiments/max-reference/arithmetic-runtime-20261022/`. Their finite replay
does not qualify arbitrary values or complete installed help roots.

### Mutable Message Boxes

Authored `message`/`msg` and shortcut M create kind 53 (`message_box`). Saved
`message` remains immutable kind 1 with its existing one-inlet semantics;
`message.legacy` addresses that type explicitly. New boxes start empty, suppress
hot output and do not remember hot input until nonempty. Empty differs from bang.
Nonempty hot input emits the template; bang recalls prior substitutions. Other
inputs update up to two remembered typed arguments; omitted arguments retain
their previous values, initially integer zero. Anything supplies its selector
before its atoms, symbol supplies its symbol, and list supplies its atoms.

Whole-token `$1` and `$2` are allowed only after a fixed literal head, including
numeric-leading templates. Placeholder heads, `symbol $1`, `bang $1`, embedded
dollars and all other dollar syntax are refused. Cold replacement is silent;
hot `set` silently replaces its remaining atoms and bare `set` clears. Nonempty
runtime replacements retain substitution memory. Clearing and authored text
replacement reset that memory to integer zero as an explicit local policy;
those reset transitions have not been qualified against Max. Cold `set`, a
zero-atom cold list, and hot `append`/`prepend`/`setargs` are refused. The retained
empty-list injector delivered no target input, so it establishes no Max result.

`params.text` is saved startup content. Cold/set runtime content and substitution
memory never dirty, save or enter history. Stop preserves them; graph replacement
initializes them from authored text. `canvas_message_text({revision,node,text})`
returns `{serial}` after one atomic admission. Shared commits infer one text
delta or accept `messageText:{node,text}`, checked against the entire executable
plan. An explicit same-text edit still restores runtime content and advances
`messageTextSerial`, without fabricating an authoring change or undo entry.
Text hints require an active graph and cannot accompany a forced installation;
numeric and text hints cannot be combined.
Events and edits share FIFO ordering; stale/type/closed/full-queue rejection
leaves admitted authored state intact. Serial is bounded to JavaScript's safe
integer range and resets to zero on graph installation.

`canvas_status.message_boxes` is null when unavailable, otherwise
`{revision,text_edit_serial,nodes:[{id,generation,empty,text,prototype,placeholders}]}`.
Prototype is `{selector,atoms:[{tag:0|1,value}|{tag:2,symbol}]}`; placeholders are
parallel payload references 0/1/2. Literal placeholders stay visible after hot
substitution. Typed runtime content is bounded to eight atoms and 31-byte
symbols/selector; display text is at most 287 ASCII bytes, while authored and IPC
literal text remain limited to 127. Rust formats floats with a decimal or exponent
and uses compact scientific notation for long fractional representations.
Views retain cache for null snapshots and fence acceptance by graph revision and
the owner's expected text serial. Runtime observations never overwrite saved text.

The additive native snapshot has a 24-byte header and up to 32 440-byte rows.
`ultra_canvas_message_boxes_document` reads non-consuming atomic-word publication
with four bounded retries. Only dirty rows are copied by the runtime writer;
there are no callback strings, allocation, locks or formatting. Existing ABI
structs and capacities remain unchanged. `ultra_canvas_message_text_document`
compiles text off callback, queues once and replaces only the target live box.

### Integer numeric UI and named numeric sends

Saved `number` retains kind 2, fractional values, two inlets and one outlet.
Saved `number_int` uses kind 52 with one inlet and two outlets; both flat v1 and
hierarchical v2 documents admit it. Numeric input truncates toward zero then
clips to its stored bounds. Bang recalls; `set` stores silently. Numeric-leading
multi-atom lists emit the resulting value twice. Integral `min`/`max` messages
adjust bounds and silently clamp the current value; bare methods remove the
corresponding bound within the finite profile. Fractional bound messages are
outside this profile and leave bounds/value unchanged. They are not silently
coerced. Saved value/minimum/maximum and live parameter edits require integers.
Numeric value edits and their undo/redo use atomic hot-parameter admission,
preserving other nodes and the runtime revision.

Hot `send <single symbol>` on `int` and `float` sends the current stored value,
with integer or float identity, to every loaded matching receiver. It produces
no ordinary outlet output, does not change stored state, and does not bind a
destination. The cold inlet ignores send. Missing, numeric or multiple
destination atoms produce no delivery. The existing shared dispatch budget
bounds cycles across owners. Scoped names remain outside the import profile.

These contracts are anchored in the original finite captures under
`experiments/max-reference/message-ui-runtime-20261022/`, including physical
Tab versus selector input and typed cross-object sends. Numeric bounds and
capacity remain Ultra profile limits; alternate number formats and arbitrary
Max methods are not qualified by this subset.

### Native signal semantics

The native evaluator runs mono sources, arithmetic, ramps and output mapping at
48 kHz. Engine starts and graph replacements mute the first 64 output samples
as a guard while signal state already advances. This guard is separate from the
legacy custom Voice pipeline's 64-frame delay. Mono cables can fan out;
contributions to each signal input sum before evaluation. Signal calculations
can exceed the numeric control range; nonfinite
DSP results are handled safely. `snapshot~` refuses an out-of-range sample as a
control message rather than changing the bounded control atom contract.
Signal-generated control notifications are deferred until every document finishes
the current sample, so cross-document send/receive changes the next sample
independently of document order. Pure signal feedback needs a delay object and
is currently refused.

Arithmetic shares one scalar updated by a numeric message to either inlet.
With no signals, it calculates `op(0, scalar)`; with only a left signal,
`op(left, scalar)`; with only a right signal, `op(scalar, right)`; with both,
the two summed signals replace the scalar. All four scalar defaults are zero,
including `/~`. Division by zero produces zero. `clip~` preserves reversed
thresholds and compares the lower threshold first, then the upper threshold.

`sig~` accepts numeric lists and zero-based `set index value`. Its inlet accepts
a signal connection to establish dependency order but does not use its values.
`cycle~` takes one positional frequency; its right numeric inlet sets phase
offset and `reset phase` sets its reset phase. `phasor~` also takes one positional
frequency; a right numeric input changes running phase, and a nonzero right
signal resets it to its configured phase offset. Phases wrap natively. The
editor's `@phase` option preserves inspector settings, but it is not an admitted
Max import attribute. `cycle~` waveform buffers and tempo/transport syntax are
unsupported.

`line~` takes one positional initial value, accepts target/time pairs, consumes
the cold next duration, and supports `set`, `stop`, `pause` and `resume`. It uses
the native audio sample clock and emits a completion bang. Its editor `@time`
option is not a second positional Max argument. `snapshot~` takes one positional
interval, accepts left `bang`, `offset N`, `start` and `stop`, and a nonnegative
right interval. Bang samples the selected offset in the latest completed
64-frame vector. Its initial observation is zero and cached observations remain
available with DSP off. Editor `@offset` is not an admitted Max import attribute.
Positive periodic reporting is a bounded native approximation: exact Max
scheduler cadence, `sampleinterval` and transport scheduling are not supported.

`noise~` preserves the original physical control inlet, but no method is admitted;
in particular `seed` is refused. The native PRNG produces [-1,1] samples without
a claim of matching Max's algorithm or exact sequences. Numeric creation/control
values are finite -100000..100000 unless a narrower range is listed above;
durations and intervals are 0..100000 ms and snapshot offsets are integers 0..63.

`dac~` accepts independent mono inputs, mapping 1 to physical left and 2 to right;
repeated mappings sum. This host has only two physical output channels. Its
signal inlets refuse numeric DSP-control and `startwindow` messages. `ezdac~`,
other physical channel numbers, signal-rate send/receive, unsupported execution
attributes and general signal feedback remain visible compatibility gaps.

Frozen Max observations and production-header replay are recorded in
`experiments/max-reference/signal-runtime-20261021/` (197 cases, 114560 samples).
Recorded samples were quantized through Max `buffer~` float32 storage; this is
not evidence of Max's internal DSP precision, full object compatibility or
complete installed-help execution.

### List and control semantics

List authoring accepts dotted `zl.<mode>` and corresponding `zl <mode>` names.
All seven modes retain two inlets and two outlets even where roles are inactive.
Iteration uses bounded native continuations so downstream work finishes before
the next atom or chunk. Over-capacity input reports a source-linked console
error and retains prior object state. Prefix/suffix output can use a named
selector plus eight data atoms; list storage and list outputs have eight atoms.
For these modes, `zlclear` clears stored data and zeroes numeric mode parameters;
`zlreset` clears stored data and preserves current mode parameters. Both apply
from either inlet. Runtime mode switching and `fuzzy`/`zlmaxsize` attributes
remain unimplemented.

An empty list delivered directly to a list object is distinct from triggering
a message box containing only `list`, which emits no message. Direct empty
input clears the retained input of `iter` and the zl storage modes; `zl.len`
emits zero and `zl.join` emits the retained right segment. Prefixes and suffixes
remain configured. Empty prefix/suffix behavior and scalar/list/selector
identity follow the recorded finite scores in
`experiments/max-reference/list-runtime-20261021/`. Those scores do not establish
complete installed-help conformance or the larger Max list capacities.

The `int` through `line` batch is a bounded implementation, with details and known
differences in `experiments/max-reference/object-batch-20261021/runtime-batch.md`.
Max intake separately validates the selected patcher against this registry.
Creation aliases are resolved by the editor: `i`, `f`, `sel`, `t`, `s` and `r`.
The saved graph uses canonical type names.
`i` as a single-key UI shortcut creates `number_int`. Authored `number` and
`number.int` create that compatible integer UI; `number.legacy` addresses saved
type `number` without changing its fractional/two-inlet contract.

### Named control messages

`send notes` forwards bang, numeric and symbol atoms, lists and named selectors
unchanged to every matching receive in loaded documents, including the sending
document, with audio on or off. Multiple-receiver delivery order is unspecified.
No matching receiver is a valid silent destination. A received `set` selector is
output as message data; it does not retarget the receiving object.

An unnamed `receive` has one control inlet. Sending `set notes` directly to that
inlet changes its runtime binding without output. Retargeting keeps the inlet
and does not change the saved empty creation name. A named creation has no inlet.
Editing the saved name is a structural change that resets the edited document
and refreshes its port layout. Closing a document removes its receivers and
scheduled work without changing other windows' graphs.

Names are literal ASCII tokens of at most 31 bytes, without whitespace, quotes,
backslashes, commas, semicolons or `$` substitution. `send` requires a nonempty
creation name. Max `#0` and `---` patch-local name expansion is unsupported;
Max intake rejects those scoped names rather than turning them into a global bus.
Dispatch across named links remains bounded; feedback cannot schedule unbounded
work. No signal-rate, remote or network message bus is provided.

The C node descriptor is 192 bytes: existing id/kind/device/count/p0..p2 fields,
appended p3..p5, and text[128]. `args` and message literals occupy text; other
unused fields are zero. The typed C message is 392 bytes with count, values[8],
tags[8] (0 integer, 1 float, 2 symbol), symbols[8][32], and selector[32]. The
original numeric event entry point remains available. Native/Rust tests pin
these layouts; consumers must rebuild together after this ABI extension.

`print notes @level 1` labels warning messages. The label is structural; level
updates live. A fixed 128-record single-producer/single-consumer native ring
preserves ordered typed messages, source node/revision, sequence and graph frame.
The audio callback only copies fixed records and updates atomic cursors. Rust
formats messages off the callback. A full ring drops new console records and
increments a visible counter without faulting or blocking audio. Records survive
graph replacement with their original labels/revisions; old sources cannot select
a replacement node accidentally. The console retains the latest 512 rows, filters
text/severity and clears history, including stale in-flight status replies.
`ultra_canvas_console(records,capacity,dropped)` drains up to 128 records through
the serialized control caller; each C record is 456 bytes. No console/file output
occurs on the callback. The existing node/message/status ABI layouts stay intact.

Console punctuation/precision are Ultra's explicit typed display, not a measured
Max rendering match. Collection expansion, error-object routing, scheduler
time prefixes, custom float precision and symbol quoting are unsupported. Max's
level enum is Print/Warn/Error/Bug; the inspector labels the last level Debug.
Browser preview never synthesizes native console messages.

`print @popup 1` enables a transient, object-adjacent value bubble independently
of the console. Native kind25 keeps severity in p0; p1 holds popup0/1, default0.
Both numeric parameters update live through the existing parameter admission.
Incoming `popup 0` remains ordinary printed data. An actual popup-attribute
transition clears the last bubble receipt; enabling alone does not replay it.
Graph replacement resets receipts. Console draining, filtering and Clear do not
change them; popup messages do not open or focus the console.

The additive `ultra_canvas_print_popups_document(document,snapshot*)` returns
available0/1 with non-consuming reads and at most four contention retries. Its
13592-byte POD has `{revision:u64,frame:u64,node_count:u32,reserved:u32}` followed
by32 424-byte rows. Only Print nodes have rows:
`{id:u32,enabled:u32,has_value:u32,reserved:u32,generation:u64,frame:u64,message}`,
where `message` is the unchanged392-byte typed message POD. Reserved fields are0;
flags are0/1. Row generation advances on enabled receipts and attribute changes.
Only dirty rows are copied to atomic words; the coherent snapshot frame advances
on every publication, even without a new receipt. The callback uses fixed state
and atomic copies, without formatting, allocation, locks or wall-clock calls.
Old console structs/functions and all execution capacities remain unchanged.

Rust validates the snapshot and formats text off callback using the console's
typed formatter. `canvas_status.print_popups` is null when unavailable, otherwise
`{revision,frame,nodes:[{id,enabled,has_value,generation,frame,text}]}`. Disabled or
empty observations have empty text. Display text is bounded to4096 ASCII bytes;
eight tiny floating values can exceed the MessageBox template display bound.
The native control clock stays48 kHz; the existing audio-off background idle
tick advances the published clock with its existing cap. Snapshot reads do not
advance time themselves. Views use receipt age plus a local monotonic deadline so an
already-seen bubble cannot be extended by repeated reads or a paused clock.
The local2000ms display policy is within the original observed1.799..2.650s
interval; it is not an exact Max timing claim. A full polling stall does not
establish exact wall-age reconstruction for a newly opened view. Original
observations, geometry and window-fronting limits are retained in
`experiments/max-reference/print-popup-runtime-20261022/README.md`.

Slider integer mode truncates the final scaled output toward zero; float mode
retains it. This is independent of raw pointer position and display precision.
Integer slider `size` remains a bounded Ultra choice; Max permits fractional size.

Each document retains two prepared custom sine/ASR voice buses, at most one
`voice` per logical device, and at most one legacy `join` and saved `dac` kind.
That legacy sink is authored as `stereo.dac~`, consuming the bundle from `join~`;
old saved graphs keep kind 14 unchanged. A missing join input is silence; a
source can feed either or both join inputs. Gain is evaluated per branch, so
fan-out through independent gains is supported without changing engine-global
voice levels. The legacy Clockwork/Faust Voice pipeline retains its 64-frame
delay; the new MSP sources are evaluated immediately at the native sample rate.
New `dac~` uses kind 49 and independent mono inputs instead of a stereo bundle.
Both output paths mix into the same physical stereo device. Disconnected output
paths are silent. Structural edits clear old voices and reset only the edited
document's signal state.

Voice envelope values use the existing app contract: 0 = 16 frames; nonzero attack
value*4ms and release value*8ms, latched on note-on. Gain changes are live. Message,
bang, toggle and number controls send real native events. Numeric UI values may be
coalesced latest-wins while dragging; note termination/stop must never be discarded.

MIDI input is routed only through connected midiin objects in canvas mode. The old
Chord lab and legacy patcher remain separate profiles. No general MIDI transport,
SysEx, Max MC interpreter or ambisonic DSP is promised by this first graph runtime.
