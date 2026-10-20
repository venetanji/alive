# First editable canvas protocol

This is `ultra-canvas-v1`, a bounded Ultra execution profile, not Max compatibility.
The canvas edits actual connections. UI/control data is prepared outside rendering;
message dispatch and metro/makenote timing run on the native audio timeline.

## Document and IPC

JSON: `{version:1, profile:"ultra-canvas-v1", nodes:[...], edges:[...]}`.
Node: `{id:positive integer, type:string, x:number, y:number, params:object}`.
Edge: `{from:nodeId, outlet:integer, to:nodeId, inlet:integer}`.
Maximum 32 nodes, 64 edges, 64 KiB JSON. IDs unique; finite positions 0..4000.
Reject unknown types/parameters, invalid ports, type mismatches, duplicate edges,
control cycles and unsupported audio topologies. Disconnected nodes are allowed.
Edge array order is explicit stable fan-out order. Message dispatch is depth-first,
with bounded work; runaway/overflow fails closed. No implicit numeric Max semantics. Arithmetic outputs clip to -100000..100000; scalar control inlet updates clip to the destination range (integer MIDI/enumerated values floor). Incompatible message cardinalities are ignored; negative counter/chord indices clip to zero. Scheduled makenote terminations retain their original pitch/deadline after later parameter changes.

Commands: `canvas_apply({patch})` returns `{revision}` after validated admission;
`canvas_event({revision,node,inlet,value})` delivers bang with null, or a numeric
list of 1..3 finite values in -100000..100000. `canvas_param({revision,node,key,value})` changes one
supported numeric parameter without replacing the graph. `canvas_stop()` stops
all timers/pending note work and clears voices. `canvas_status()` returns active
revision and per-node `{id,value,pulses}` observations; UI polls, never clocks notes.
Message literals have the same -100000..100000 bound. Toggle, steps, root, shape, velocity, channel, device, attack, release and gain are integer-valued; number/rhs and interval/duration may be fractional.
Node activation/state readout is native, not simulated. Stale revisions are refused.

Structural edits publish a prepared bounded plan at a callback boundary and reset
runtime state/timers/notes. Audio stays available; users explicitly start metro again.
Ordinary parameter edits do not reapply the graph or stop transport. MIDI channel and voice device changes are structural-only, preventing old-channel note-offs from being stranded. Layout edits are UI-only.
Validate/prepare before publishing; invalid edits retain the last valid active graph.
Stop/start retains the latest valid graph but starts its timers stopped.

## Object registry / initial semantics

All inlets are at the TOP, all outlets at the BOTTOM. Port indexes left to right.
Control messages are bang or 1..3-number lists; no symbols/dicts/Max message grammar
are executed in this first profile. Audio ports are channel bundles, including mono.

| kind | type | params (defaults; bounds) | inlets | outlets |
|---|---|---|---|---|
|0|bang|none|0 control: any input emits bang|0 control|
|1|message|text="60 100"; bang or 1..3 finite literal numbers, <=128 chars|0 trigger emits stored message|0 control|
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
