// ultra-canvas-v1: a document/editor and bounded native command adapter, never a JS scheduler or DSP.
import {appearanceFields, validateStyle} from './canvas-appearance.mjs';
import {validateMidpoints, translatedMidpoints} from './canvas-cable-geometry.mjs';
import {parseMessageTemplate, mergeMessageDisplays} from './canvas-message-ui.mjs';
import {mergePrintPopups} from './canvas-print-ui.mjs';
import {HELP_HELPER_SPEC} from './canvas-help-shell.mjs';
import {validateDevice} from './canvas-device.mjs';
import {isArithmetic} from './canvas-arithmetic.mjs';
import {boundaryNodes, hierarchyType, HIERARCHY_LIMITS, lowerHierarchy, remapBoundaryEdges, treeNodes, validateHierarchy, visiblePatcher} from './canvas-hierarchy.mjs';
const C = 'control', M = 'mono', S = 'stereo', V = 'voice4';
const port = (type, label, side, accepts) => ({type, label, side,...({mono:1,stereo:2,voice4:4}[type]?{channels:{mono:1,stereo:2,voice4:4}[type]}:{}),...(accepts?{accepts}:{})});
const ports = (items, side) => items.map(([type,label,accepts])=>port(type,label,side,accepts));
const mixed = label => [M,label,[C,M]];
const number = (value,min,max,integer=false) => ({value,min,max,integer});
const spec = (label, params, inputs, outputs, help) => ({label,params,inlets:ports(inputs,'top'),outlets:ports(outputs,'bottom'),help});
const zlSpec = (label,params,inputs,outputs,help) => spec(label,params,inputs,outputs,`${help} Either inlet accepts zlclear to clear retained lists and reset the mode parameter to zero, or zlreset to clear lists while keeping that parameter.`);
const inletSpec={...spec('inlet',{},[],[],'Forward parent inlet messages and mono signals into this patcher.'),outlets:[{type:'mixed',label:'message / signal',side:'bottom',emits:[C,M]}]};
export const REGISTRY = Object.freeze({
  bang: spec('bang',{},[[C,'trigger']],[[C,'bang']],'Any input emits bang. Click to send a native bang.'),
  message: spec('message',{text:{value:'60 100'}},[[C,'trigger']],[[C,'stored message']],'Literal bang, numeric/symbol atoms or named selector; at most eight atoms. No substitution or comma/semicolon syntax.'),
  number: spec('number',{value:number(0,-100000,100000)},[[C,'hot: store + emit'],[C,'cold: store']],[[C,'value']],'Editing the value sends its own hot inlet, so connected objects receive it.'),
  toggle: spec('toggle',{value:number(0,0,1,true)},[[C,'bang toggles; scalar sets']],[[C,'0 / 1']],'Native state. Structural edits and Stop reset it off.'),
  add: spec('+',{rhs:number(0,-100000,100000),numericmode:number(0,0,2,true)},[[C,'hot: value / bang'],[C,'cold: right operand']],[[C,'sum']],'Hot inlet emits left + right. Numeric mode fixes integer, float or legacy Ultra behavior.'),
  multiply: spec('×',{rhs:number(1,-100000,100000),numericmode:number(0,0,2,true)},[[C,'hot: value / bang'],[C,'cold: right operand']],[[C,'product']],'Hot inlet emits left times right. Numeric mode fixes integer, float or legacy Ultra behavior.'),
  metro: spec('metro',{interval:number(150,20,2000)},[[C,'on / off; bang once'],[C,'interval ms']],[[C,'bang']],'Native control clock, including with audio off. Interval is in milliseconds; no browser clock.'),
  counter: spec('counter',{steps:number(8,1,32,true)},[[C,'advance'],[C,'reset index']],[[C,'index']],'Emits the current index, then advances modulo steps.'),
  chord: spec('chord',{root:number(48,0,127,true),shape:number(0,0,2,true)},[[C,'index'],[C,'root']],[[C,'pitch']],'Triad stair: 0 major, 1 minor, 2 sus4. Repeats one octave higher every third step.'),
  makenote: spec('makenote',{velocity:number(100,1,127,true),duration:number(150,10,2000)},[[C,'pitch'],[C,'velocity'],[C,'duration ms']],[[C,'pitch, velocity']],'Native note-on and delayed note-off. Duration is milliseconds.'),
  midiin: spec('midiin',{channel:number(2,1,16,true)},[],[[C,'pitch, velocity']],'Physical MIDI is deferred on the Rust CPAL output path. The legacy JACK diagnostic supports channel-filtered note pairs.'),
  voice: spec('voice~',{device:number(0,0,1,true),attack:number(8,0,127,true),release:number(28,0,127,true)},[[C,'pitch, velocity'],[C,'attack'],[C,'release']],[[M,'mono voice']],'A/B sine / ASR voices. Attack: raw × 4 ms; release: raw × 8 ms; raw 0 = 16 frames.'),
  gain: spec('gain~',{value:number(90,0,127,true)},[[M,'mono audio'],[C,'level']],[[M,'mono audio']],'Live level, raw 0–127, not decibels.'),
  join: spec('join~',{},[[M,'left / channel 0'],[M,'right / channel 1']],[[S,'stereo bundle']],'Explicit two-channel bundle. Missing inputs are silence; one source may feed both.'),
  dac: spec('stereo.dac~',{},[[S,'stereo bundle']],[],'Legacy explicit stereo-bundle sink. Maps the bundle to left and right on the shared native audio output; use dac~ for ordinary mono channel inlets.'),
  int: spec('int',{value:number(0,-100000,100000)},[[C,'hot: store + emit'],[C,'cold: store']],[[C,'integer']],'Store an integer, truncating toward zero. Bang emits the stored value; set stores silently. send name sends the stored integer to named receivers without outlet output.'),
  float: spec('float',{value:number(0,-100000,100000)},[[C,'hot: store + emit'],[C,'cold: store']],[[C,'float']],'Store a floating-point number. Bang emits the stored value; set stores silently. send name sends the stored float to named receivers without outlet output.'),
  flonum: spec('flonum',{value:number(0,-100000,100000),minimum:number(-100000,-100000,100000),maximum:number(100000,-100000,100000),numdecimalplaces:number(6,0,9,true)},[[C,'hot: store + emit']],[[C,'float'],[C,'Tab bang']],'Floating-point UI box with optional minimum/maximum. Tab emits a bang from its second outlet. Decimal places affect display only.'),
  slider: spec('slider',{value:number(0,-100000,100000),size:number(128,1,100000,true),min:number(0,-100000,100000),mult:number(1,-100000,100000),floatoutput:number(0,0,1,true)},[[C,'hot: store + emit']],[[C,'value']],'Store a raw value. The pointer spans 0 to size - 1. Output is raw * mult + min, clipped to global bounds; direct numeric input can exceed the pointer range.'),
  pack: spec('pack',{args:{value:'0 0'}},[[C,'hot: emit list'],[C,'cold: store']],[[C,'list']],'Store up to eight typed fields. Only the left inlet emits the complete list; remaining inlets store silently.'),
  unpack: spec('unpack',{args:{value:'0 0'}},[[C,'list']],[[C,'field 0'],[C,'field 1']],'Distribute up to eight typed list fields to separate outlets, synchronously from right to left.'),
  select: spec('select',{args:{value:'0'}},[[C,'match input'],[C,'cold: selector']],[[C,'match bang'],[C,'unmatched']],'Compare typed selectors. Matching outlets emit bang; the final outlet passes unmatched input.'),
  route: spec('route',{args:{value:'0'}},[[C,'route input'],[C,'cold: selector']],[[C,'matched remainder'],[C,'unmatched']],'Route a matching selector or leading atom, stripping it from matched messages. Extra inlets replace selectors.'),
  trigger: spec('trigger',{args:{value:'i i'}},[[C,'input']],[[C,'integer'],[C,'integer']],'Emit synchronously from right to left. Arguments i/f/b/l/s coerce to int/float/bang/list/symbol; other atoms are constants.'),
  line: spec('line',{value:number(0,-100000,100000),time:number(0,0,100000),grain:number(20,1,100000),floatoutput:number(2,0,2,true)},[[C,'target / ramp'],[C,'time ms'],[C,'grain ms']],[[C,'value'],[C,'completion bang']],'Native control ramp. Target/time pairs, stop, pause and resume use the backend clock, including while audio is off. Output mode 0 int, 1 float, 2 automatic.'),
  print: spec('print',{label:{value:'print',kind:'label'},level:number(0,0,3,true),popup:number(0,0,1,true)},[[C,'message to console']],[],'Print accepted messages to the native console, including with audio off. Popup shows a temporary value bubble. Optional label; level 0 message, 1 warning, 2 error, 3 debug. No outlets.'),
  send: spec('send',{name:{value:'channel',kind:'name'}},[[C,'message to named receivers']],[],'Send the complete typed message unchanged to matching receivers in every loaded document. Multiple-receiver delivery order is unspecified. No outlets.'),
  receive: spec('receive',{name:{value:'',kind:'name'}},[[C,'set runtime name']],[[C,'received message']],'Receive complete typed messages from matching send objects across loaded documents. An unnamed creation exposes a set inlet; named creations have no inlet. Runtime retargeting leaves the saved creation name unchanged.'),
  iter: spec('iter',{},[[C,'list / recall']],[[C,'successive atoms']],'Emit each incoming list atom synchronously in source order. Bang recalls the retained list. Direct empty list input clears retained data silently. At most eight typed atoms.'),
  prepend: spec('prepend',{args:{value:'',allowEmpty:true,detail:'Optional prefix atoms; 0 to 8 typed atoms, at most 127 ASCII bytes. Bare prepend passes messages through; prepend list explicitly prefixes list. Combined messages must fit the eight-atom native profile.'}},[[C,'data / set prefix']],[[C,'prefixed message']],'Place the retained optional prefix before incoming data. Bare prepend passes messages through, including bang; prepend list forces an explicit list. set replaces the prefix silently. The combined output must fit the native eight-atom message profile.'),
  append: spec('append',{args:{value:'',allowEmpty:true,detail:'Optional suffix atoms; 0 to 8 typed atoms, at most 127 ASCII bytes. Bare append passes data through. Bang is silent. Combined messages must fit the eight-atom native profile.'}},[[C,'data / set suffix']],[[C,'suffixed message']],'Place incoming data before a retained optional suffix. Bare append passes data through. set replaces the suffix silently; bang is always silent. The combined output must fit the native eight-atom message profile.'),
  zl_reg: zlSpec('zl.reg',{args:{value:'',allowEmpty:true,detail:'Optional initial retained list; 0 to 8 typed atoms, at most 127 ASCII bytes. Numeric spelling preserves integer and float identity.'}},[[C,'hot: store + emit'],[C,'cold: store']],[[C,'retained list'],[C,'inactive']],'Store up to eight typed list atoms. Left input stores and emits; right input stores silently; bang recalls. Direct empty list input clears retained data silently. The second outlet is inactive.'),
  zl_join: zlSpec('zl.join',{args:{value:'',allowEmpty:true,detail:'Optional initial right list; 0 to 8 typed atoms, at most 127 ASCII bytes. Left and right segments together must fit eight atoms.'}},[[C,'hot: left list'],[C,'cold: right list']],[[C,'joined list'],[C,'inactive']],'Join the hot left segment with the retained cold right segment. Bang emits their current concatenation. Direct empty list input on the left clears that segment and emits the retained right segment. At most eight combined typed atoms. The second outlet is inactive.'),
  zl_len: zlSpec('zl.len',{},[[C,'list to count'],[C,'inactive']],[[C,'integer length'],[C,'inactive']],'Count the atoms of a list, up to eight typed atoms. Direct empty list input emits zero; bang recalls that zero. The right inlet is inactive for data; the second outlet is inactive.'),
  zl_iter: zlSpec('zl.iter',{size:{...number(0,0,100000,true),detail:'Maximum atoms per emitted chunk. Integer from 0 to 100000; default 0, which produces no chunks. Incoming lists remain limited to eight typed atoms.'}},[[C,'list / recall'],[C,'cold: chunk size']],[[C,'successive chunks'],[C,'inactive']],'Split a list into successive chunks in source order; the final chunk may be shorter. Size defaults to zero, which emits no chunks; the right inlet changes it silently. Direct empty list input clears retained data silently. At most eight source atoms. The second outlet is inactive.'),
  zl_slice: zlSpec('zl.slice',{size:{...number(0,0,100000,true),detail:'Number of leading atoms. Integer from 0 to 100000; default 0, which sends the whole list to the right outlet. Incoming lists remain limited to eight typed atoms.'}},[[C,'list / recall'],[C,'cold: leading size']],[[C,'leading slice'],[C,'remaining tail, first']],'Split a list at the configured leading size, default zero. Emit the tail from the right outlet before the leading slice from the left, skipping empty halves. Direct empty list input clears retained data silently. At most eight source atoms.'),
  zl_rev: zlSpec('zl.rev',{},[[C,'list / recall'],[C,'inactive']],[[C,'reversed list'],[C,'inactive']],'Reverse up to eight typed list atoms without changing their identity. Direct empty list input clears retained data silently. The right inlet is inactive for data; the second outlet is inactive.'),
  zl_rot: zlSpec('zl.rot',{rotation:{...number(0,-100000,100000,true),detail:'Signed rotation distance. Positive rotates right; negative rotates left. Integer from -100000 to 100000; default 0.'}},[[C,'list / recall'],[C,'cold: rotation']],[[C,'rotated list'],[C,'inactive']],'Rotate up to eight typed atoms: positive distances move right, negative distances move left. The right inlet changes the distance. Direct empty list input clears retained data silently. The second outlet is inactive.'),
  sig: spec('sig~',{args:{value:'0',numericOnly:true,detail:'One to eight finite numeric outlet values, each from -100000 to 100000. Numeric arguments create one mono signal outlet each.'}},[mixed('values / signal dependency')],[[M,'constant signal']],'Convert one to eight numbers into constant mono signals. Numeric lists update corresponding outlets; set index value changes one zero-based outlet. An incoming signal establishes execution order but its values are ignored.'),
  signal_add: spec('+~',{rhs:number(0,-100000,100000)},[mixed('left signal / scalar'),mixed('right signal / scalar')],[[M,'sum signal']],'Add the two signal sums. A number at either inlet updates one shared scalar, initially zero. With one signal inlet connected, the scalar supplies the other operand; with neither connected, output is 0 + scalar.'),
  signal_subtract: spec('-~',{rhs:number(0,-100000,100000)},[mixed('left signal / scalar'),mixed('right signal / scalar')],[[M,'difference signal']],'Subtract the right signal sum from the left. A number at either inlet updates one shared scalar, initially zero. The scalar supplies an unconnected operand; with neither connected, output is 0 - scalar.'),
  signal_multiply: spec('*~',{rhs:number(0,-100000,100000)},[mixed('left signal / scalar'),mixed('right signal / scalar')],[[M,'product signal']],'Multiply the two signal sums. A number at either inlet updates one shared scalar, initially zero. The scalar supplies an unconnected operand; with neither connected, output is 0 * scalar.'),
  signal_divide: spec('/~',{rhs:number(0,-100000,100000)},[mixed('dividend signal / scalar'),mixed('divisor signal / scalar')],[[M,'quotient signal']],'Divide the left signal sum by the right. A number at either inlet updates one shared scalar, initially zero. The scalar supplies an unconnected operand; with neither connected, output is 0 / scalar. Division by zero outputs zero.'),
  cycle: spec('cycle~',{frequency:number(0,-100000,100000),phase:number(0,-100000,100000)},[mixed('frequency Hz'),mixed('phase offset, cycles')],[[M,'cosine signal']],'Cosine oscillator with frequency in Hz and wrapped phase offset in cycles. Right-inlet numbers or signals set the phase offset; reset phase restarts at a wrapped phase. Waveform buffers and transport syntax are unsupported.'),
  phasor: spec('phasor~',{frequency:number(0,-100000,100000),phase:number(0,-100000,100000)},[mixed('frequency Hz'),mixed('phase / reset signal')],[[M,'phase ramp signal']],'Wrap a phase ramp from zero to one at the frequency in Hz. A right-inlet number sets running phase; a nonzero right-inlet signal resets it. Tempo, transport and execution attributes are unsupported.'),
  noise: spec('noise~',{},[[C,'unsupported methods']],[[M,'noise signal']],'Generate a native pseudo-random mono signal between -1 and 1. Exact Max random sequences and seed methods are not implemented.'),
  signal_clip: spec('clip~',{minimum:number(0,-100000,100000),maximum:number(0,-100000,100000)},[mixed('input signal / scalar'),mixed('lower bound'),mixed('upper bound')],[[M,'clipped signal']],'Limit a signal using lower and upper bounds, both initially zero. Numeric or signal inputs change the bounds. Reversed bounds retain their ordered clipping behavior; alternate clipping modes are unsupported.'),
  line_signal: spec('line~',{value:number(0,-100000,100000),time:number(0,0,100000)},[[C,'target / ramp / commands'],[C,'ramp time ms']],[[M,'ramp signal'],[C,'completion bang']],'Sample-clock signal ramp. A number sets the target using the stored time; target/time pairs schedule ramps. set stores immediately, stop holds, pause/resume suspend and continue. Completion emits bang. Audio must run for ramps to advance.'),
  snapshot: spec('snapshot~',{interval:number(0,0,100000),offset:number(0,0,63,true)},[mixed('signal / bang / commands'),[C,'report interval ms']],[[C,'sampled float']],'Read a mono signal as a control float. Bang returns the cached sample, initially zero and retained while audio is off. Positive report intervals use the native audio clock; zero disables periodic output. start/stop enable or suspend periodic reports. offset N selects sample 0 to 63 of the latest completed signal vector; sampleinterval and transport timing are unsupported.'),
  signal_dac: spec('dac~',{channels:{value:'1 2',kind:'channels',detail:'One to eight output channels, each 1 (left) or 2 (right). Other physical channels are unavailable on this stereo host.'}},[[M,'output channel 1'],[M,'output channel 2']],[],'Mix mono signals into the selected physical channels of the shared audio runtime. Multiple cables sum. Channel 1 is left and channel 2 is right; repeated mappings sum. Use the shared audio controls to start and stop DSP; dac~ messages are unsupported.'),
  inlet:inletSpec,
  outlet:spec('outlet',{},[mixed('message / signal')],[],'Forward messages and mono signals to the parent outlet.'),
  number_int:spec('number',{value:number(0,-100000,100000,true),minimum:number(-100000,-100000,100000,true),maximum:number(100000,-100000,100000,true)},[[C,'hot: store + emit']],[[C,'integer'],[C,'Tab bang']],'Integer UI box. Numeric input truncates toward zero and clips to its bounds; set stores silently. Physical Tab emits a bang from its second outlet.'),
  message_box:spec('message',{text:{value:''}},[[C,'hot: substitute + emit / set'],[C,'cold: replace template']],[[C,'stored message']],'Store a message or an empty display. Hot input replaces $1/$2 arguments and emits; bang recalls. Cold input and set replace text silently. Runtime updates leave saved text unchanged.'),
  patcher:spec('p',{name:{value:'patcher',kind:'name'}},[],[],'Embedded patcher. Double-click to enter its shared document view.'),
  comment:spec('comment',{text:{value:''}},[],[],'Annotation saved with the patch; it does not execute.'),
  subtract:spec('-',{rhs:number(0,-100000,100000),numericmode:number(1,1,2,true)},[[C,'hot: left operand'],[C,'cold: right operand']],[[C,'difference']],'Subtract the stored right operand from the left. Fixed integer or float mode.'),
  divide:spec('/',{rhs:number(1,-100000,100000),numericmode:number(1,1,2,true)},[[C,'hot: dividend'],[C,'cold: divisor']],[[C,'quotient']],'Divide the left operand by the stored right operand. Fixed integer or float mode; outputs must fit the bounded control profile.'),
  modulo:spec('%',{rhs:number(1,-100000,100000),numericmode:number(1,1,2,true)},[[C,'hot: dividend'],[C,'cold: divisor']],[[C,'remainder']],'Remainder using a stored right operand, in a fixed integer or float mode. Results must fit the bounded control profile.'),
  reverse_subtract:spec('!-',{rhs:number(0,-100000,100000),numericmode:number(1,1,2,true)},[[C,'hot: subtrahend'],[C,'cold: minuend']],[[C,'difference']],'Subtract the left operand from the stored right operand. Fixed integer or float mode.'),
  reverse_divide:spec('!/',{rhs:number(1,-100000,100000),numericmode:number(1,1,2,true)},[[C,'hot: divisor'],[C,'cold: dividend']],[[C,'quotient']],'Divide the stored right operand by the left operand. Fixed integer or float mode; outputs must fit the bounded control profile.'),
  abs:spec('abs',{numericmode:number(1,1,2,true)},[[C,'numeric value']],[[C,'absolute value']],'Emit an absolute value in a fixed integer or float mode.'),
  poly_note:spec('poly.note~',{voices:number(4,1,4,true)},[[C,'MIDI pitch, velocity / panic'],[C,'sustain (0..127)']],[[V,'frequency / 4 voices'],[V,'gate / 4 voices'],[V,'velocity / 4 voices']],'Allocate 1 to 4 voices. Oldest voice is stolen at capacity; velocity zero releases. Four discrete voice lanes, independent of speaker channels.'),
  saw_voice:spec('saw.voice~',{},[[V,'frequency / 4 voices']],[[V,'saw / 4 voices']],'Faust band-limited saw oscillator for each of four voice lanes.'),
  filter_voice:spec('lowpass.voice~',{cutoff:number(2400,20,20000),resonance:number(0.7,0.1,20)},[[V,'audio / 4 voices'],[C,'cutoff Hz'],[C,'resonance Q']],[[V,'filtered / 4 voices']],'Faust resonant low-pass filter with live cutoff and resonance. Four discrete voice lanes.'),
  adsr_voice:spec('adsr.voice~',{attack:number(10,1,10000),decay:number(150,1,10000),sustain:number(0.65,0,1),release:number(300,1,10000)},[[V,'gate / 4 voices'],[C,'attack ms'],[C,'decay ms'],[C,'sustain'],[C,'release ms']],[[V,'envelope / 4 voices']],'Faust ADSR envelope per voice. Live attack, decay, sustain and release controls, in milliseconds except sustain.'),
  multiply_voice:spec('*.voice~',{},[[V,'left / 4 voices'],[V,'right / 4 voices']],[[V,'product / 4 voices']],'Multiply corresponding voice lanes, for envelope and velocity scaling.'),
  mix_voice:spec('mix.voice~',{},[[V,'audio / 4 voices']],[[M,'mono mix']],'Explicitly sum the four voice lanes and divide by four for headroom. Output is one mono channel.'),
  audio_in:spec('audio.in~',{},[],[[M,'host input left'],[M,'host input right']],'Read an explicit stereo sample pair supplied by a reusable-device host. Ordinary Ultra roots receive silence; this is not physical audio input.'),
  filter_stereo:spec('lowpass.stereo~',{cutoff:number(2400,20,20000),resonance:number(0.7,0.1,20)},[[M,'left audio'],[M,'right audio'],[C,'cutoff Hz'],[C,'resonance Q']],[[M,'filtered left'],[M,'filtered right']],'Two independent channels through the shared Faust resonant low-pass kernel. Cutoff and resonance are live; Stop clears filter tails.'),
});
export const structuralParameter=(type,key)=>['text','args','label','name','channels'].includes(key)||
  (isArithmetic(type)&&key==='numericmode')||(type==='midiin'&&key==='channel')||(type==='voice'&&key==='device')||(type==='poly_note'&&key==='voices');
const copy = value => JSON.parse(JSON.stringify(value));
const fail = message => { throw Error(message); };
function fields(value, allowed, context, required=true) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${context} must be an object.`);
  for(const key of Object.keys(value)) if(!allowed.includes(key)) fail(`Unknown ${context} field: ${key}.`);
  for(const key of Array.isArray(required)?required:required?allowed:[]) if(!(key in value)) fail(`Missing ${context} field: ${key}.`);
}
function numeric(value,min,max,integer,context) {
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value))) fail(`${context} must be ${integer?'an integer':'a finite number'} from ${min} to ${max}.`);
}
const numericAtom=/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;
function literalWords(text,context) {
  if(typeof text!=='string'||text.length>127||/[^\x20-\x7e\t\r\n]|[,;$'"\\]/.test(text))fail(`${context} must be at most 127 ASCII bytes, without substitution, quotes, backslashes, commas or semicolons.`);
  const words=text.trim().split(/\s+/);if(!text.trim())fail(`${context} requires at least one atom.`);
  for(const [index,word]of words.entries()){
    const forceSymbol=context==='Message'&&words[0]==='symbol'&&index===1;
    if(!forceSymbol&&numericAtom.test(word))numeric(Number(word),-100000,100000,false,`${context} value`);
    else if(word.length>31||(!forceSymbol&&(/^[\d+.-]/.test(word)||/^(?:nan|inf(?:inity)?)$/i.test(word))))fail(`${context} symbols must contain at most 31 ASCII bytes; numeric atoms must be valid finite numbers.`);
  }
  return words;
}
export function parseArguments(text,{allowEmpty=false,numericOnly=false}={}) {
  if(allowEmpty&&typeof text==='string'&&text.length<=127&&/^[ \t\r\n]*$/.test(text))return [];
  const words=literalWords(text,'Arguments');if(words.length>8)fail('Arguments support at most eight atoms.');
  if(numericOnly&&words.some(word=>!numericAtom.test(word)))fail('Signal arguments require finite numeric atoms.');return words;
}
export function parseMessage(text) {
  const words=literalWords(text,'Message'),head=words[0];
  if(head==='bang'&&words.length===1)return null;
  if(head==='bang')fail('bang does not accept arguments.');
  const numeric=words.every(word=>numericAtom.test(word));
  const count=words.length-(numericAtom.test(head)?0:1);
  if(count>8)fail('Message supports at most eight atoms.');
  if(head==='symbol'&&words.length!==2)fail('symbol requires exactly one symbol atom.');
  if(head==='list'&&words.length===1)return text.trim();
  return numeric?words.map(Number):text.trim();
}
export function nodeSpec(node) {
  if(node.type==='help_helper')return HELP_HELPER_SPEC;
  const s=REGISTRY[node.type];if(!s)fail(`Unknown object type: ${node.type}.`);
  const boundary=label=>({type:'mixed',label,side:'bottom',emits:[C,M]});
  if(node.type==='inlet')return{...s,outlets:[boundary('message / signal')]};
  if(node.type==='patcher')return{...s,inlets:boundaryNodes(node.patcher??{nodes:[]},'inlet').map((_,i)=>port(M,`parent inlet ${i}`,'top',[C,M])),outlets:boundaryNodes(node.patcher??{nodes:[]},'outlet').map((_,i)=>boundary(`parent outlet ${i}`))};
  if(node.type==='receive')return{...s,inlets:(node.params?.name??s.params.name.value)?[]:s.inlets};
  if(node.type==='sig')return{...s,outlets:ports(parseArguments(node.params?.args??s.params.args.value,{numericOnly:true}).map((_,i)=>[M,`constant signal ${i}`]),'bottom')};
  if(node.type==='signal_dac')return{...s,inlets:ports(parseArguments(node.params?.channels??s.params.channels.value,{numericOnly:true}).map(channel=>[M,`output channel ${channel}`]),'top')};
  if(!['pack','unpack','select','route','trigger'].includes(node.type))return s;
  const args=parseArguments(node.params?.args??s.params.args.value),count=args.length;
  const control=(n,label,side)=>ports(Array.from({length:n},(_,i)=>[C,`${label} ${i}`]),side);
  const ins=node.type==='pack'?count:node.type==='route'?count+1:node.type==='select'&&count===1?2:1;
  const outs=['unpack','trigger'].includes(node.type)?count:['select','route'].includes(node.type)?count+1:1;
  return{...s,inlets:control(ins,'inlet','top'),outlets:control(outs,'outlet','bottom')};
}
export function validatePatch(input) {
  if(input?.version===2){
    if(input.profile!=='ultra-patcher-v2')fail('Expected version 2, profile ultra-patcher-v2.');
    const patch=validateHierarchy(input,{nodeSpec,validateStyle,validateLeaf:node=>validateFlatPatch({version:1,profile:'ultra-canvas-v1',nodes:[node],edges:[]},true).nodes[0],validateExecution:patch=>validateFlatPatch(patch,true)});
    validateDevice(patch,REGISTRY,structuralParameter);return patch;
  }
  return validateFlatPatch(input);
}
const executionSpec=node=>['inlet','outlet'].includes(node.type)?{inlets:[port(M,'boundary','top',[C,M])],outlets:[{type:'mixed',emits:[C,M]}]}:nodeSpec(node);
function validateFlatPatch(input,internal=false) {
  fields(input,['version','profile','nodes','edges','device'],'patch',['version','profile','nodes','edges']);
  if(input.version!==1||input.profile!=='ultra-canvas-v1') fail('Expected version 1, profile ultra-canvas-v1.');
  if(!Array.isArray(input.nodes)||input.nodes.length>32) fail('A patch supports at most 32 objects.');
  if(!Array.isArray(input.edges)||input.edges.length>64) fail('A patch supports at most 64 cables.');
  const nodes=new Map(), devices=new Set(), singleton=new Set();
  for(let node of input.nodes) {
    if(hierarchyType(node.type)&&!(internal&&['inlet','outlet'].includes(node.type)))fail('Hierarchy objects require version 2.');
    fields(node,['id','type','x','y','params','style'],'node',['id','type','x','y','params']); numeric(node.id,1,4294967295,true,'Node ID');
    if(nodes.has(node.id)) fail('Duplicate node ID.');
    const s=Object.hasOwn(REGISTRY,node.type)?REGISTRY[node.type]:null; if(!s) fail(`Unknown object type: ${node.type}.`);
    numeric(node.x,0,4000,false,'X position'); numeric(node.y,0,4000,false,'Y position');
    fields(node.params,Object.keys(s.params),`${node.type} parameters`,false);
    node={...node,params:{...Object.fromEntries(Object.entries(s.params).map(([key,p])=>[key,p.value])),...node.params}};
    if(Object.hasOwn(node,'style'))node.style=validateStyle(node.type,node.style);
    for(const [key,p] of Object.entries(s.params)) {
      if(key==='text')(node.type==='message_box'?parseMessageTemplate:parseMessage)(node.params[key]);else if(key==='args')parseArguments(node.params[key],{allowEmpty:p.allowEmpty,numericOnly:p.numericOnly});else if(p.kind==='channels'){
        const channels=parseArguments(node.params[key],{numericOnly:true});
        if(channels.some(channel=>!Number.isInteger(Number(channel))||Number(channel)<1||Number(channel)>2))fail('dac~ channels must be 1 (left) or 2 (right); other physical channels are unsupported.');
      }else if(p.kind==='label'){
        if(typeof node.params[key]!=='string'||! /^[\x21-\x7e]{1,31}$/.test(node.params[key])||/[,;$'"\\]/.test(node.params[key]))fail('Print label must be one ASCII token of 1 to 31 bytes, without quotes, substitution or separators.');
      }else if(p.kind==='name'){
        const name=node.params[key];
        if(typeof name!=='string'||(name===''?node.type!=='receive':! /^[\x21-\x7e]{1,31}$/.test(name)||/[,;$'"\\]/.test(name)))fail(`${node.type} name must be one ASCII token of 1 to 31 bytes, without quotes, substitution or separators; only receive may be unnamed.`);
      }else numeric(node.params[key],p.min,p.max,p.integer,`${node.type}.${key}`);
    }
    if(['flonum','number_int'].includes(node.type)&&node.params.minimum>node.params.maximum)fail(`${node.type} minimum must not exceed maximum.`);
    if(isArithmetic(node.type)&&node.type!=='abs'&&node.params.numericmode===1&&!Number.isInteger(node.params.rhs))fail(`${node.type}.rhs must be an integer in integer numeric mode.`);
    if(node.type==='voice') { if(devices.has(node.params.device)) fail('Only one voice per logical device is supported.'); devices.add(node.params.device); }
    if(['join','dac','poly_note'].includes(node.type)) { if(singleton.has(node.type)) fail(`Only one ${node.type} is supported.`); singleton.add(node.type); }
    nodes.set(node.id,node);
  }
  const duplicates=new Set(),audioInputs=new Set(),controlAdjacency=new Map(),signalAdjacency=new Map(),routes=[];
  for(const edge of input.edges) {
    fields(edge,['from','outlet','to','inlet','midpoints'],'edge',['from','outlet','to','inlet']);
    if(Object.hasOwn(edge,'midpoints'))validateMidpoints(edge.midpoints);
    const from=nodes.get(edge.from),to=nodes.get(edge.to); if(!from||!to) fail('Cable references a missing object.');
    const source=executionSpec(from),target=executionSpec(to);
    numeric(edge.outlet,0,source.outlets.length-1,true,'Outlet index');
    numeric(edge.inlet,0,target.inlets.length-1,true,'Inlet index');
    const output=source.outlets[edge.outlet],kind=output.type;
    const inlet=target.inlets[edge.inlet];
    const domains=(output.emits??[kind]).filter(type=>(inlet.accepts??[inlet.type]).includes(type));
    if(!domains.length) fail('Port type mismatch: this inlet does not accept the cable type.');
    const key=`${edge.from}:${edge.outlet}>${edge.to}:${edge.inlet}`; if(duplicates.has(key)) fail('Duplicate cable.'); duplicates.add(key);
    routes.push({edge,domains});
    if(domains.includes(C)){if(!controlAdjacency.has(edge.from))controlAdjacency.set(edge.from,[]);controlAdjacency.get(edge.from).push(edge.to);}
    if(kind===S) {
      const dest=`${edge.to}:${edge.inlet}`; if(audioInputs.has(dest)) fail('An audio inlet accepts only one source.'); audioInputs.add(dest);
    }
  }
  const active=new Set([...nodes.values()].filter(node=>!['inlet','outlet'].includes(node.type)&&executionSpec(node).outlets.some(port=>[M,S,V].includes(port.type))).map(node=>node.id));
  for(let changed=true;changed;){changed=false;for(const {edge,domains}of routes)if(domains.includes(M)&&active.has(edge.from)&&['inlet','outlet'].includes(nodes.get(edge.to).type)&&!active.has(edge.to)){active.add(edge.to);changed=true;}}
  for(const {edge,domains}of routes)if(domains.some(type=>[M,S,V].includes(type))&&active.has(edge.from)){if(!signalAdjacency.has(edge.from))signalAdjacency.set(edge.from,[]);signalAdjacency.get(edge.from).push(edge.to);}
  for(const [label,adjacency]of [['Control',controlAdjacency],['Signal',signalAdjacency]]){
    const visiting=new Set(),visited=new Set();
    function visit(id) { if(visiting.has(id))fail(`${label} cycles are unsupported.`);if(visited.has(id))return;visiting.add(id);for(const child of adjacency.get(id)||[])visit(child);visiting.delete(id);visited.add(id); }
    for(const id of nodes.keys())visit(id);
  }
  if(new TextEncoder().encode(JSON.stringify(input)).length>65536) fail('Patch exceeds 64 KiB.');
  const patch={...input,nodes:[...nodes.values()]};
  validateDevice(patch,REGISTRY,structuralParameter);return copy(patch);
}
export function parsePatch(text) {
  if(typeof text!=='string'||new TextEncoder().encode(text).length>8*HIERARCHY_LIMITS.bytes) fail('Patch file exceeds 8 MiB.');
  let patch;try{patch=JSON.parse(text);}catch{if(new TextEncoder().encode(text).length>65536)fail('Patch exceeds 64 KiB or is not valid JSON.');fail('Patch is not valid JSON.');}
  if(patch.version!==2&&new TextEncoder().encode(text).length>65536)fail('Patch exceeds 64 KiB.');
  return validatePatch(patch);
}
export const serializePatch = patch => JSON.stringify(validatePatch(patch),null,2);
export function makeNode(type,id,x=40,y=40,params={}) {
  if(!REGISTRY[type]) fail(`Unknown object type: ${type}.`);
  return {id,type,x,y,params:{...Object.fromEntries(Object.entries(REGISTRY[type].params).map(([key,p])=>[key,p.value])),...params},...(type==='patcher'?{patcher:{nodes:[],edges:[]}}:{})};
}
export function starterPatch() {
  const nodes=[
    makeNode('toggle',1,80,50), makeNode('metro',2,80,110), makeNode('counter',3,80,170),
    makeNode('chord',4,80,230), makeNode('makenote',5,80,290), makeNode('voice',6,80,350),
    makeNode('gain',7,80,400), makeNode('join',8,300,530), makeNode('dac',9,300,590),
    makeNode('midiin',10,460,290),makeNode('voice',11,460,350,{device:1}),makeNode('gain',12,460,400),
    makeNode('bang',13,300,170),makeNode('message',14,300,230,{text:'60'}),
    makeNode('number',15,180,50,{value:150}), makeNode('number',16,460,50,{value:90}),
  ];
  const edges=[[1,0,2,0],[2,0,3,0],[3,0,4,0],[4,0,5,0],[5,0,6,0],[6,0,7,0],[7,0,8,0],[10,0,11,0],[11,0,12,0],[12,0,8,1],[8,0,9,0],[13,0,14,0],[14,0,5,0],[15,0,2,1],[16,0,7,1],[16,0,12,1]].map(([from,outlet,to,inlet])=>({from,outlet,to,inlet}));
  return {version:1,profile:'ultra-canvas-v1',nodes,edges};
}
export class CanvasDocument {
  constructor(patch=starterPatch()) { this.document=validatePatch(patch);this.path=[];this.past=[];this.future=[];this.nextId=Math.max(0,...treeNodes(this.document).map(n=>n.id))+1; }
  get patch(){return this.path.length?{version:2,profile:'ultra-patcher-v2',...visiblePatcher(this.document,this.path)}:this.document;}
  setDevice(value){
    const next=copy(this.document);
    if(value===null)delete next.device;else next.device=copy(value);
    const validated=validatePatch(next);
    if(JSON.stringify(validated)===JSON.stringify(this.document))return false;
    this.remember();this.document=validated;return true;
  }
  enter(id){visiblePatcher(this.document,[...this.path,id]);this.path.push(id);}
  leave(depth=this.path.length-1){this.path=this.path.slice(0,Math.max(0,depth));}
  reveal(id){
    function find(scope,path=[]){for(const node of scope.nodes){if(node.id===id)return path;if(node.type==='patcher'){const child=find(node.patcher,[...path,node.id]);if(child)return child;}}return null;}
    const path=find(this.document);if(!path)fail('Missing object.');this.path=path;
  }
  repairPath(){while(this.path.length){try{visiblePatcher(this.document,this.path);break;}catch{this.path.pop();}}}
  remember(){
    this.past.push(copy(this.document));
    let bytes=0;this.past=this.past.reverse().filter(patch=>{bytes+=JSON.stringify(patch).length;return bytes<=16*1048576;}).reverse().slice(-100);
    this.future=[];
  }
  edit(fn,{history=true}={}) {
    const next=copy(this.document);fn(visiblePatcher(next,this.path));
    if(next.version===1&&treeNodes(next).some(node=>hierarchyType(node.type))){next.version=2;next.profile='ultra-patcher-v2';}
    if(next.version===2)remapBoundaryEdges(this.document,next);
    const validated=validatePatch(next);
    if(JSON.stringify(validated)===JSON.stringify(this.document)) return false;
    if(history)this.remember();
    this.document=validated;this.repairPath();this.nextId=Math.max(this.nextId,...treeNodes(validated).map(n=>n.id+1));return true;
  }
  add(type,x=40,y=40,params={},style) {
    const id=this.nextId;params={...params};
    if(type==='voice'&&!Object.hasOwn(params,'device')) params.device=treeNodes(this.document).some(n=>n.type==='voice'&&n.params.device===0)?1:0;
    this.edit(p=>p.nodes.push({...makeNode(type,id,x,y,params),...(style?{style}: {})}));return id;
  }
  configure(id,type,params) { return this.edit(p=>{
    const i=p.nodes.findIndex(n=>n.id===id);if(i<0)fail('Missing object.');
    const old=p.nodes[i],node=makeNode(type,id,old.x,old.y,params);
    if(old.type==='patcher'&&type==='patcher')node.patcher=old.patcher;
    if(old.style) {
      const allowed=new Set(appearanceFields(type).map(field=>field.key));
      const style=Object.fromEntries(Object.entries(old.style).filter(([key])=>allowed.has(key)));
      if(Object.keys(style).length)node.style=style;
    }
    p.nodes[i]=node;
  }); }
  remove(id) { return this.edit(p=>{p.nodes=p.nodes.filter(n=>n.id!==id);p.edges=p.edges.filter(e=>e.from!==id&&e.to!==id);}); }
  removeMany(ids) {const set=new Set(ids);return this.edit(p=>{p.nodes=p.nodes.filter(n=>!set.has(n.id));p.edges=p.edges.filter(e=>!set.has(e.from)&&!set.has(e.to));});}
  connect(from,outlet,to,inlet) { return this.edit(p=>p.edges.push({from,outlet,to,inlet})); }
  disconnect(index) { return this.edit(p=>p.edges.splice(index,1)); }
  move(id,x,y,options) {return this.moveMany([{id,x,y}],options);}
  moveMany(positions,options) {return this.edit(p=>{
    const midpoints=p.edges.map(edge=>translatedMidpoints(edge,positions,p.nodes));
    for(const {id,x,y} of positions){const n=p.nodes.find(n=>n.id===id);if(!n)fail('Missing object.');n.x=x;n.y=y;}
    p.edges.forEach((edge,index)=>{if(midpoints[index]!==undefined)edge.midpoints=midpoints[index];});
  },options);}
  parameter(id,key,value,options) { return this.edit(p=>{const n=p.nodes.find(n=>n.id===id);if(!n)fail('Missing object.');n.params[key]=value;},options); }
  parameterRoot(id,key,value,options) {
    const path=this.path;
    try{this.reveal(id);return this.parameter(id,key,value,options);}
    finally{this.path=path;this.repairPath();}
  }
  style(id,key,value,options) { return this.edit(p=>{
    const node=p.nodes.find(node=>node.id===id);if(!node)fail('Missing object.');
    if(key===null){delete node.style;return;}
    if(!appearanceFields(node.type).some(field=>field.key===key))fail(`Unknown ${node.type} style attribute: ${key}.`);
    const style={...node.style};
    if(value===null)delete style[key];else style[key]=value;
    const validated=validateStyle(node.type,style);
    if(Object.keys(validated).length)node.style=validated;else delete node.style;
  },options); }
  resize(id,{width,height}) {return this.edit(p=>{
    const node=p.nodes.find(node=>node.id===id);if(!node)fail('Missing object.');
    node.style=validateStyle(node.type,{...node.style,width,height});
  });}
  replace(patch) {
    const valid=validatePatch(patch);if(JSON.stringify(valid)===JSON.stringify(this.document)){this.path=[];return false;}
    this.remember();this.document=valid;this.path=[];this.nextId=Math.max(this.nextId,...treeNodes(valid).map(n=>n.id+1));return true;
  }
  undo() { if(!this.past.length)return false;this.future.push(copy(this.document));this.document=this.past.pop();this.repairPath();return true; }
  redo() { if(!this.future.length)return false;this.past.push(copy(this.document));this.document=this.future.pop();this.repairPath();return true; }
}

// A hosted scope belongs to the view; native binding and saved content stay separate.
export function createHelpViewState() {
  let helpShell=null,helpIdentity=null,boundPath=[],hostedPath=null;
  function reconcile(document,{owner='standalone',path=boundPath,restore=false}={}) {
    const shell=document.document.helpShell??null;
    const identity=shell?JSON.stringify([owner,path,shell.adapter,shell.object,shell.basicNode,shell.questionNode]):null;
    const changed=identity!==helpIdentity||JSON.stringify(path)!==JSON.stringify(boundPath);
    helpShell=shell;helpIdentity=identity;boundPath=[...path];
    if(changed)hostedPath=shell&&!boundPath.length?[shell.basicNode]:null;
    if(changed||restore){document.path=[...(hostedPath??boundPath)];document.repairPath();}
    if(hostedPath)hostedPath=[...document.path];
  }
  return {reconcile,
    getState:()=>({helpShell:copy(helpShell),helpIdentity,boundPath:[...boundPath],hostingHelp:!!helpShell&&!boundPath.length}),
    navigate:document=>{if(hostedPath)hostedPath=[...document.path];},
    hostBasic:document=>{
      if(!helpShell||boundPath.length)return false;
      hostedPath=[helpShell.basicNode];document.path=[...hostedPath];return true;
    }};
}

export function createCanvasController({invoke,patch=starterPatch(),onState=()=>{}}={}) {
  const document=new CanvasDocument(patch),native=typeof invoke==='function';
  const helpView=createHelpViewState();helpView.reconcile(document);
  let revision=null,desired=1,applied=0,applyTask=null,paramTask=null,eventTask=null,operation=null;
  let status={},observations={},messageBoxes={},printPopups={},messageSerial=0,inFlightText=null,consoleRecords=[],consoleDropped=0,consoleDroppedBaseline=0,consoleEpoch=0,notice=native?'Preparing native patch…':'Browser preview: native execution is unavailable.',faulted=false,panicked=false,disposed=false,actionEpoch=0;
  let pendingParams=new Map(),events=[],pollTask=null,stopTask=null,stopping=false,lifecycle=0;
  const getState=()=>({patch:copy(document.patch),document:copy(document.document),path:[...document.path],...helpView.getState(),native,revision,desiredRevision:desired,activeDocumentRevision:applied,status:{...status},observations:copy(observations),messageBoxes:copy(messageBoxes),printPopups:copy(printPopups),console:copy(consoleRecords),consoleDropped:Math.max(0,consoleDropped-consoleDroppedBaseline),notice,faulted:faulted||panicked,
    busy:!!operation,applying:!!applyTask,ready:native&&applied===desired&&!status.fault&&!status.server_lost&&!faulted&&!panicked&&!operation&&!stopping&&!disposed,canUndo:!!document.past.length,canRedo:!!document.future.length});
  const emit=()=>onState(getState());
  const report=error=>{notice=String(error?.message||error);emit();};
  const textPending=()=>inFlightText!==null||events.some(item=>item.kind==='text');
  const requireTextAdmission=()=>{if(textPending())fail('Wait for the message text edit to finish before changing the document.');};
  const resetRuntime=({replaceGraph=false}={})=>{observations={};messageBoxes={};if(replaceGraph)printPopups={};messageSerial=0;inFlightText=null;actionEpoch++;for(const item of events)item.resolve?.(false);events=[];};
  const execution=p=>{const flat=p.version===2?lowerHierarchy(p):p;return JSON.stringify({nodes:flat.nodes.map(({id,type,params})=>({id,type,params})),edges:flat.edges.map(({from,outlet,to,inlet})=>({from,outlet,to,inlet}))});};
  function structural(fn,force=false) {
    requireTextAdmission();
    const before=execution(document.document),result=fn();
    helpView.reconcile(document);
    if(!force&&execution(document.document)===before){emit();ensureApply();return result;}
    desired++;pendingParams.clear();resetRuntime({replaceGraph:true});faulted=false;
    notice=native?'Applying graph. Structural edits stop timers and notes.':'Preview edited. Native execution is unavailable.';emit();ensureApply();return result;
  }
  function ensureApply() {
    if(!native||disposed)return Promise.resolve(false);if(applyTask)return applyTask;
    if(applied===desired)return Promise.resolve(true);
    applyTask=(async()=>{
      while(applied!==desired&&!disposed) {
        const epoch=desired,snapshot=copy(document.document);
        try {
          const result=await invoke('canvas_apply',{patch:snapshot});
          if(!Number.isSafeInteger(result?.revision)||result.revision<1)throw Error('Native apply returned an invalid revision.');
          revision=result.revision;applied=epoch;resetRuntime({replaceGraph:true});
          notice='Graph applied. Timers stopped; click a toggle or bang to run.';faulted=false;
        } catch(error) {report(`Graph not applied: ${error?.message||error}. Last valid native graph retained; Stop is available.`);break;}
      }
      return applied===desired;
    })().finally(()=>{applyTask=null;emit();if(applied===desired)pumpParams();});emit();return applyTask;
  }
  function pumpParams() {
    if(!native||disposed||paramTask||applyTask||applied!==desired||faulted||!pendingParams.size)return paramTask||Promise.resolve();
    paramTask=(async()=>{
      while(pendingParams.size&&!applyTask&&applied===desired&&!disposed&&!faulted) {
        const [key,entry]=pendingParams.entries().next().value;pendingParams.delete(key);
        const r=revision,epoch=actionEpoch;
        try {
          await invoke('canvas_param',{revision:r,node:entry.id,key:entry.key,value:entry.value});
          if(entry.hot&&getState().ready&&entry.epoch===actionEpoch&&r===revision&&epoch===actionEpoch&&!applyTask) await invoke('canvas_event',{revision:r,node:entry.id,inlet:0,value:[entry.value]});
        } catch(error) {if(r===revision&&epoch===actionEpoch){faulted=true;report(`Parameter not applied: ${error?.message||error}. Stop and reapply the graph to recover.`);}}
      }
    })().finally(()=>{paramTask=null;emit();});return paramTask;
  }
  function parameter(id,key,value,{history=true,root=false}={}) {
    const node=(root?treeNodes(document.document):document.patch.nodes).find(n=>n.id===id);if(!node)fail('Missing object.');
    const write=(...args)=>root?document.parameterRoot(...args):document.parameter(...args);
    if(node.type==='message_box'&&key==='text'){
      parseMessageTemplate(value);
      if(!native){document.parameter(id,key,value,{history});delete messageBoxes[id];emit();return;}
      if(applyTask||applied!==desired)return structural(()=>document.parameter(id,key,value,{history}),true);
      return enqueueText(id,value,{history,path:[...document.path]});
    }
    requireTextAdmission();
    if(['comment','patcher','help_helper'].includes(node.type)){write(id,key,value,{history});emit();return;}
    if(structuralParameter(node.type,key))return structural(()=>write(id,key,value,{history}));
    write(id,key,value,{history});
    if(native)pendingParams.set(`${id}/${key}`,{id,key,value,epoch:actionEpoch,hot:getState().ready&&['number','number_int','toggle','int','float','flonum','slider'].includes(node.type)&&key==='value'});
    emit();return pumpParams();
  }
  function pumpEvents() {
    if(eventTask)return eventTask;
    eventTask=(async()=>{
      while(events.length) {
        const event=events.shift();
        if(paramTask)await paramTask;
        if(event.epoch!==actionEpoch||!getState().ready){event.resolve?.(false);continue;}
        try{
          if(event.kind==='text'){
            inFlightText=event.node;
            const result=await invoke('canvas_message_text',{revision:event.revision,node:event.node,text:event.value});
            if(disposed||event.revision!==revision||event.documentRevision!==desired){event.resolve?.(false);continue;}
            if(!Number.isSafeInteger(result?.serial)||result.serial<=messageSerial)throw Error('Invalid native text-edit serial.');
            messageSerial=result.serial;
            if(event.direction){document[event.direction]();helpView.reconcile(document);}
            else {
              const path=document.path;document.path=event.path;
              try{document.parameter(event.node,'text',event.value,{history:event.history});}finally{document.path=path;document.repairPath();}
            }
            event.resolve?.(true);
          }else {
            const accepted=await invoke('canvas_event',{revision:event.revision,node:event.node,inlet:event.inlet,value:event.value,...(event.action?{action:event.action}:{})});
            event.resolve?.(accepted!==false);
          }
        }
        catch(error){event.resolve?.(false);if(event.epoch===actionEpoch){faulted=true;report(`Native event rejected: ${error?.message||error}. Stop and reapply to recover.`);}}
        finally{if(event.kind==='text'&&event.epoch===actionEpoch)inFlightText=null;emit();}
      }
    })().finally(()=>{eventTask=null;emit();if(events.length)pumpEvents();});return eventTask;
  }
  function enqueueText(node,value,options={}) {
    if(disposed||stopping||faulted||panicked)fail('Recover the native patch before editing message text.');
    if(events.length>=64)fail('Message edit queue is full. Wait for native admission.');
    delete messageBoxes[node];
    const result=new Promise(resolve=>events.push({kind:'text',node,value,revision,documentRevision:desired,epoch:actionEpoch,resolve,...options}));
    emit();pumpEvents();return result;
  }
  function event(node,inlet=0,value=null,action,root=false) {
    if(!getState().ready){notice=native?'Wait for the current graph or recover the native fault before sending events.':'Browser preview: native execution is unavailable.';emit();return Promise.resolve(false);}
    const n=(root?treeNodes(document.document):document.patch.nodes).find(x=>x.id===node),port=n&&nodeSpec(n).inlets[inlet];if(!port||!(port.accepts??[port.type]).includes(C))fail('Events require an inlet that accepts control messages.');
    if(typeof value==='string'){
      if(n.type==='message_box'&&(inlet===1||/^set(?:\s|$)/.test(value.trimStart())))parseMessageTemplate(value);
      else parseMessage(value);
    }
    else if(value!==null){if(!Array.isArray(value)||value.length<1||value.length>8)fail('Events contain one to eight numbers or a literal message.');value.forEach(v=>numeric(v,-100000,100000,false,'Event value'));}
    if(events.length>=64){faulted=true;return stop('Event queue overflow. Native timers and notes stopped; reapply before playing.');}
    const result=new Promise(resolve=>events.push({node,inlet,value,revision,epoch:actionEpoch,resolve,...(action?{action}:{})}));
    pumpEvents();return result;
  }
  function tab(node) {
    if(!['flonum','number_int'].includes(document.patch.nodes.find(item=>item.id===node)?.type))fail('Tab requires a numeric UI box with a second outlet.');
    return event(node,0,null,'tab');
  }
  async function poll() {
    if(!native||disposed)return;if(pollTask)return pollTask;
    pollTask=(async()=>{
      try {
        const epoch=actionEpoch,logEpoch=consoleEpoch;const [audio,graph]=await Promise.all([invoke('audio_status'),invoke('canvas_status')]);
        status=audio||{};
        if(logEpoch===consoleEpoch&&Array.isArray(graph?.console))consoleRecords=[...consoleRecords,...graph.console].slice(-512);
        if(Number.isSafeInteger(graph?.console_dropped))consoleDropped=graph.console_dropped;
        if(logEpoch!==consoleEpoch)consoleDroppedBaseline=consoleDropped;
        if(epoch===actionEpoch&&graph?.revision===revision&&applied===desired&&!applyTask) {
          const ids=new Set(treeNodes(document.document).map(node=>node.id));
          observations=Object.fromEntries((graph.nodes||[]).filter(n=>ids.has(n.id)).map(n=>[n.id,{value:n.value,pulses:n.pulses}]));
          const pending=new Set(events.filter(item=>item.kind==='text').map(item=>item.node));
          if(inFlightText!==null)pending.add(inFlightText);
          messageBoxes=mergeMessageDisplays(messageBoxes,graph.message_boxes,{revision,serial:messageSerial,ids,pending});
          printPopups=mergePrintPopups(printPopups,graph.print_popups,{revision,ids:new Set(treeNodes(document.document).filter(node=>node.type==='print').map(node=>node.id))});
          if(graph.active===false){faulted=true;notice='Native canvas profile is no longer active. Reapply before playing.';}
        }
        if(status.fault||status.server_lost){faulted=true;notice=`Native audio fault: ${status.message||'backend unavailable'}. Stop audio, then start again.`;}
        emit();
      } catch(error){report(`Native status unavailable: ${error?.message||error}`);}
    })().finally(()=>{pollTask=null;});return pollTask;
  }
  function stop(message='Timers and notes stopped.') {
    resetRuntime();
    if(!native){notice='Browser preview: native execution is unavailable.';emit();return Promise.resolve(true);}
    if(stopTask)return stopTask;
    stopping=true;emit();
    const pending=[eventTask,paramTask,applyTask].filter(Boolean);
    stopTask=(async()=>{
      try {
        await invoke('canvas_stop');
        // A previously submitted command may still be completing. The final stop cannot be overtaken by that command.
        if(pending.length){await Promise.all(pending);await invoke('canvas_stop');}
        observations={};notice=message;return true;
      }catch(error){faulted=true;notice=`Stop failed: ${error?.message||error}`;return false;}
    })().finally(()=>{stopTask=null;stopping=false;emit();});return stopTask;
  }
  function exclusive(fn) {
    // Lifecycle operations serialize, but unlike operations are never collapsed: Stop/dispose cannot become Start.
    const previous=operation;
    const task=(previous||Promise.resolve()).catch(()=>{}).then(fn).finally(()=>{if(operation===task)operation=null;emit();});
    operation=task;emit();return task;
  }
  async function startAudio() {
    if(!native){report('Browser preview: native execution is unavailable.');return;}
    const token=lifecycle;
    return exclusive(async()=>{
      if(disposed||token!==lifecycle)return;
      if(panicked){report('Panic is latched. Stop audio, then Start audio to recover.');return;}
      faulted=false;
      if(!(await ensureApply())||token!==lifecycle)return;
      try{
        const started=await invoke('audio_start');
        if(token!==lifecycle)return;
        resetRuntime();await poll();
        if(status.running&&!status.fault&&!status.server_lost&&!faulted) notice='Audio running. Signal objects are active; use the patch controls to send messages.';
        else {faulted=true;notice=`Audio could not start: ${status.message||started?.message||'native backend is not running'}`;}
        emit();
      }catch(error){faulted=true;report(`Audio could not start: ${error?.message||error}`);}
    });
  }
  async function stopAudio() {
    lifecycle++;resetRuntime();
    if(!native)return true;
    return exclusive(async()=>{
      await stop();
      try{await invoke('audio_stop');status={...status,running:false};faulted=false;panicked=false;notice='Audio stopped.';emit();return true;}
      catch(error){faulted=true;report(error);return false;}
    });
  }
  async function panic() {
    lifecycle++;resetRuntime();faulted=true;panicked=true;notice='Native Panic requested. Stop audio, then Start audio to recover.';emit();if(!native)return;
    const pending=operation;
    try{
      await invoke('audio_panic');
      if(pending){await pending;await invoke('audio_panic');}
      notice='Native Panic sent. Stop audio, then Start audio to recover.';emit();
    }catch(error){report(error);}
  }
  async function flush() {
    for(;;){const tasks=[applyTask,paramTask,eventTask,operation,pollTask,stopTask].filter(Boolean);if(!tasks.length)break;await Promise.all(tasks);await Promise.resolve();}
  }
  const topology = p=>{const flat=p.version===2?lowerHierarchy(p):p;return JSON.stringify({nodes:flat.nodes.map(n=>({id:n.id,type:n.type,structural:n.params.numericmode??n.params.args??n.params.channels??n.params.name??(n.type==='message'?n.params.text:n.type==='print'?n.params.label:n.type==='midiin'?n.params.channel:n.type==='voice'?n.params.device:null)})),edges:flat.edges.map(({from,outlet,to,inlet})=>({from,outlet,to,inlet}))});};
  function history(direction) {
    requireTextAdmission();
    const target=(direction==='undo'?document.past:document.future).at(-1);
    if(!target)return;
    const currentNodes=treeNodes(document.document),targetNodes=treeNodes(target);
    const parameterChanges=targetNodes.filter(node=>!['patcher','comment','help_helper'].includes(node.type)).flatMap(node=>{
      const previous=currentNodes.find(item=>item.id===node.id);
      return previous&&previous.type===node.type?Object.entries(node.params).filter(([key,value])=>value!==previous.params[key]).map(([key,value])=>({node,key,value})):[];
    });
    if(native&&topology(target)===topology(document.document)&&parameterChanges.length===1&&parameterChanges[0].node.type==='message_box'&&parameterChanges[0].key==='text'){
      const change=parameterChanges[0];return enqueueText(change.node.id,change.value,{direction});
    }
    const before=copy(document.document);if(!document[direction]())return;
    helpView.reconcile(document);
    if(topology(document.document)!==topology(before)||parameterChanges.some(change=>change.node.type==='message_box'&&change.key==='text'))structural(()=>{},true);
    else {
      for(const node of treeNodes(document.document).filter(node=>!['patcher','comment','help_helper'].includes(node.type))){
        const previous=treeNodes(before).find(n=>n.id===node.id);
        for(const[key,value]of Object.entries(node.params))if(value!==previous.params[key]&&native){
          pendingParams.set(`${node.id}/${key}`,{id:node.id,key,value,epoch:actionEpoch,hot:getState().ready&&['number','number_int','toggle','int','float','flonum','slider'].includes(node.type)&&key==='value'});
        }
      }
      emit();pumpParams();
    }
  }
  async function dispose(){
    lifecycle++;resetRuntime();
    return exclusive(async()=>{
      if(disposed)return;
      if(await stop('Document timers and notes stopped.')===false)throw Error('Native document cleanup failed. Stay on this page and try closing again.');
      disposed=true;
    });
  }
  return {getState,prepare:ensureApply,startAudio,stopAudio,stop,panic,poll,flush,dispose,disposeDocument:dispose,event,tab,parameter,
    deviceParameter:(id,key,value,options)=>parameter(id,key,value,{...options,root:true}),
    deviceEvent:(node,inlet,value)=>event(node,inlet,value,undefined,true),
    enter:id=>{document.enter(id);helpView.navigate(document);emit();},leave:depth=>{document.leave(depth);helpView.navigate(document);emit();},reveal:id=>{document.reveal(id);helpView.navigate(document);emit();},
    hostHelpBasic:()=>{if(disposed)return false;const hosted=helpView.hostBasic(document);if(hosted)emit();return hosted;},
    clearConsole:()=>{consoleRecords=[];consoleDroppedBaseline=consoleDropped;consoleEpoch++;emit();},
    resize:(...args)=>{requireTextAdmission();const changed=document.resize(...args);if(changed)emit();return changed;},
    style:(...args)=>{requireTextAdmission();const changed=document.style(...args);if(changed)emit();return changed;},
    add:(...args)=>structural(()=>document.add(...args)),configure:(id,type,params)=>{
      if(type==='message_box'&&document.patch.nodes.find(node=>node.id===id)?.type===type)return parameter(id,'text',params.text);
      return structural(()=>document.configure(id,type,params));
    },remove:id=>structural(()=>document.remove(id)),removeMany:ids=>structural(()=>document.removeMany(ids)),
    connect:(...args)=>structural(()=>document.connect(...args)),disconnect:i=>structural(()=>document.disconnect(i)),
    move:(...args)=>{requireTextAdmission();document.move(...args);emit();},moveMany:positions=>{requireTextAdmission();document.moveMany(positions);emit();},undo:()=>history('undo'),redo:()=>history('redo'),
    load:text=>structural(()=>{const changed=document.replace(typeof text==='string'?parsePatch(text):text);helpView.reconcile(document,{restore:true});return changed;},true),
    reapply:()=>structural(()=>{},true),export:()=>serializePatch(document.document),notice:report};
}
