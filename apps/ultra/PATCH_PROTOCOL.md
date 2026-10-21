# First editable canvas protocol

This is `ultra-canvas-v1`, a bounded Ultra execution profile, not Max compatibility.
The canvas edits actual connections. UI/control data is prepared outside rendering;
message dispatch and metro/makenote/line timing run in the native runtime.
While audio runs, its callback owns the graph clock. With audio stopped, a
native worker advances the same 48 kHz frame scheduler under the control lock;
audio events are discarded and no device is opened. UI polling never clocks
control messages. The desktop uses Rust CPAL for output and has no physical MIDI
ingress/external clock yet. The MIDI object contract below is supported by the
legacy JACK diagnostic/ABI tests, not a claim of CPAL MIDI input.

Pan/zoom are view-only state: they neither alter node coordinates nor publish
native graphs. Locked mode refuses structural Inspector edits while allowing
ordinary live parameters.

## Document and IPC

JSON: `{version:1, profile:"ultra-canvas-v1", nodes:[...], edges:[...]}`.
Node: `{id:positive integer, type:string, x:number, y:number, params:object}`.
Edge: `{from:nodeId, outlet:integer, to:nodeId, inlet:integer}`.
Maximum 32 nodes, 64 edges, 64 KiB JSON. IDs unique; finite positions 0..4000.
Reject unknown types/parameters, invalid ports, type mismatches, duplicate edges,
control cycles and unsupported audio topologies. Disconnected nodes are allowed.
Edge array order is explicit stable fan-out order. Message dispatch is depth-first,
with bounded work; runaway/overflow fails closed. Arithmetic outputs clip to
-100000..100000; integer MIDI/enumerated updates floor, while `int` truncates
toward zero. Incompatible messages are ignored according to each object's
contract. Negative counter/chord indices clip to zero. Scheduled makenote
terminations retain their original pitch/deadline after later parameter changes.

Commands: `canvas_apply({patch})` returns `{revision}` after validated admission;
`canvas_event({revision,node,inlet,value})` delivers bang with null, or a numeric
list of 1..8 finite values in -100000..100000, or a literal message string.
Strings retain integer/float/symbol tags and an optional selector. At most eight
payload atoms, symbols of at most 31 ASCII bytes, and 127 bytes of literal text
are admitted. Spaces, tabs and line breaks separate atoms. Explicit `list` and
`symbol`, plus selectors such as `set`, `stop`, `pause` and `resume`, are supported.
Quotes, backslashes, `$` substitution, commas and semicolons are rejected.
`canvas_param({revision,node,key,value})` changes one
supported numeric parameter without replacing the graph. `canvas_stop()` stops
all timers/pending note work and clears voices. `canvas_status()` returns active
revision and per-node `{id,value,pulses}` observations; UI polls, never clocks notes.
Message literals have the same -100000..100000 bound. Toggle, steps, root, shape, velocity, channel, device, attack, release and gain are integer-valued; number/rhs and interval/duration may be fractional.
Node activation/state readout is native, not simulated. Stale revisions are refused.

Structural edits publish a prepared bounded plan at a callback boundary and reset
runtime state/timers/notes. Audio stays available; users explicitly start metro again.
Ordinary parameter edits do not reapply the graph or stop transport. Message
text, variadic creation `args`, MIDI channel and voice device changes are
structural-only. Layout edits are UI-only.
Validate/prepare before publishing; invalid edits retain the last valid active graph.
Stop/start retains the latest valid graph but starts its timers stopped.

## Object registry / initial semantics

All inlets are at the TOP, all outlets at the BOTTOM. Port indexes left to right.
Control messages have bounded typed numeric/symbol atoms. Dictionaries, arbitrary
Max message syntax and named global send/receive are unsupported. Audio ports
are channel bundles, including mono.

| kind | type | params (defaults; bounds) | inlets | outlets |
|---|---|---|---|---|
|0|bang|none|0 control: any input emits bang|0 control|
|1|message|text="60 100"; bounded typed literal, <=127 ASCII bytes|0 trigger emits stored message|0 control|
|2|number|value=0; -100000..100000|0 hot stores/emits or bang emits; 1 cold stores silently|0 control|
|3|toggle|value=0; 0/1|0 bang toggles, scalar sets boolean/emits|0 control|
|4|add|rhs=0; -100000..100000|0 hot value/bang; 1 cold rhs|0 control|
|5|multiply|rhs=1; -100000..100000|0 hot value/bang; 1 cold rhs|0 control|
|6|metro|interval=150 ms;20..2000|0 scalar on/off, bang emits once; 1 interval ms|0 control bang|
|7|counter|steps=8;1..32|0 bang emits current index then increments modulo steps;1 resets index from scalar|0 control|
|8|chord|root=48;0..127; shape=0;0 major/1 minor/2 sus4|0 index -> root+triad[index%3]+12*floor(index/3), clipped0..127;1 root|0 control|
|9|makenote|velocity=100;1..127; duration=150 ms;10..2000|0 pitch -> [pitch,velocity], delayed [pitch,0];1 velocity;2 duration|0 control pair|
|10|midiin|channel=2;1..16|none|0 control [pitch,velocity], note-off velocity0|
|11|voice|device=0;0/1; attack=8;0..127; release=28;0..127|0 note pair;1 attack;2 release|0 mono audio|
|12|gain|value=90;0..127|0 mono audio;1 level control|0 mono audio|
|13|join|none|0 mono audio;1 mono audio|0 stereo audio|
|14|dac|none|0 stereo audio|none|
|15|int|value=0; -100000..100000|0 hot stores/emits, bang recalls, set silent;1 cold stores|0 integer|
|16|float|value=0; -100000..100000|0 hot stores/emits, bang recalls, set silent;1 cold stores|0 float|
|17|flonum|value=0;minimum=-100000;maximum=100000;numdecimalplaces=6 (0..9)|0 hot numeric UI, set silent, min/max bounds, tab|0 float;1 Tab bang|
|18|slider|value=0;size=128 (integer1..100000);min=0;mult=1;floatoutput=0 (0/1)|0 numeric value or silent set; setminmax enables float mapping|0 number|
|19|pack|args="0 0";1..8 typed initial fields|N inlets;0 hot emits full list;remaining cold|0 stored sequence|
|20|unpack|args="0 0";1..8 typed fields|0 list, bang recalls stored fields|N outlets, right to left|
|21|select|args="0";1..8 selectors|0 compares first atom;1 cold selector only with one argument|N match bangs + unmatched|
|22|route|args="0";1..8 selectors|0 compares selector/first atom;N cold selector stores|N stripped matches + unmatched|
|23|trigger|args="i i";1..8 formats/constants|0 message|N converted outputs, right to left|
|24|line|value=0;time=0 (0..100000 ms);grain=20 (1..100000 ms);floatoutput=2 (0 int/1 float/2 auto)|0 target/time pairs, set, stop, pause, resume;1 next time;2 grain|0 ramp value;1 completion bang|

The ten appended objects are a bounded implementation, with details and known
differences in `experiments/max-reference/object-batch-20261021/runtime-batch.md`.
They do not provide a Max document importer. Creation aliases are resolved by
the editor: `i`, `f`, `sel` and `t`. The saved graph uses canonical type names.
`i` as a single-key UI shortcut still opens the existing numeric UI box.

The C node descriptor is 192 bytes: existing id/kind/device/count/p0..p2 fields,
appended p3..p5, and text[128]. `args` and message literals occupy text; other
unused fields are zero. The typed C message is 392 bytes with count, values[8],
tags[8] (0 integer, 1 float, 2 symbol), symbols[8][32], and selector[32]. The
original numeric event entry point remains available. Native/Rust tests pin
these layouts; consumers must rebuild together after this ABI extension.

At most one voice for each logical device, one gain per voice path, one join and
one dac. Supported audio paths are voice -> gain -> join -> dac. A missing join
input is explicit silence. A source may feed both join inputs for explicit dual
mono; distinct voices may be swapped. The adapter actually maps its fixed two
prepared voice buses to output channels, rather than merely drawing those wires.
Reject ambiguous/parallel gain chains or unsupported audio processing; no fake DSP.
Disconnected voice paths produce no audible output. Connection changes hard-clear
old voices to avoid replaying tails when reconnected.

Voice envelope values use the existing app contract: 0 = 16 frames; nonzero attack
value*4ms and release value*8ms, latched on note-on. Gain changes are live. Message,
bang, toggle and number controls send real native events. Numeric UI values may be
coalesced latest-wins while dragging; note termination/stop must never be discarded.

MIDI input is routed only through connected midiin objects in canvas mode. The old
Chord lab and legacy patcher remain separate profiles. No general MIDI transport,
SysEx, Max MC interpreter or ambisonic DSP is promised by this first graph runtime.
