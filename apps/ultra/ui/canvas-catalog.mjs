import {REGISTRY, makeNode, nodeSpec, validatePatch} from './canvas-model.mjs';
import {ARITHMETIC,isArithmetic,arithmeticCreationParams,arithmeticModeChoices,arithmeticObjectText} from './canvas-arithmetic.mjs';

// This is Ultra's documented authoring vocabulary, not a Max class resolver.
const definitions = {
  poly_note:{name:'poly.note~',aliases:[],args:['voices'],ui:'object',summary:'Allocate up to four MIDI voices with frequency, gate and velocity lanes.',example:'poly.note~ 4'},
  saw_voice:{name:'saw.voice~',aliases:[],args:[],ui:'object',summary:'Faust saw oscillator on four voice lanes.',example:'saw.voice~'},
  filter_voice:{name:'lowpass.voice~',aliases:[],args:['cutoff','resonance'],ui:'object',summary:'Resonant Faust low-pass filter on four voice lanes.',example:'lowpass.voice~ 2400 0.7'},
  adsr_voice:{name:'adsr.voice~',aliases:[],args:['attack','decay','sustain','release'],ui:'object',summary:'Faust ADSR envelopes with live controls for four voice lanes.',example:'adsr.voice~ 10 150 0.65 300'},
  multiply_voice:{name:'*.voice~',aliases:[],args:[],ui:'object',summary:'Multiply matching voice lanes for envelope or velocity scaling.',example:'*.voice~'},
  mix_voice:{name:'mix.voice~',aliases:[],args:[],ui:'object',summary:'Mix four voice lanes to one mono channel, with headroom.',example:'mix.voice~'},
  patcher:{name:'p',aliases:['patcher'],args:['name'],ui:'object',summary:'Edit an embedded patcher in the same document and runtime.',example:'p basic'},
  comment:{name:'comment',aliases:[],args:['text'],ui:'comment',summary:'Add a saved patch annotation.',example:'comment A shared patcher'},
  inlet:{name:'inlet',aliases:[],args:[],ui:'object',summary:'Receive parent messages and mono signals inside a patcher.',example:'inlet'},
  outlet:{name:'outlet',aliases:[],args:[],ui:'object',summary:'Send messages and mono signals to the parent patcher.',example:'outlet'},
  bang: {name:'bang',aliases:['button'],args:[],ui:'bang',shortcut:'b',summary:'Convert any input to a bang.',example:'bang'},
  message: {name:'message.legacy',aliases:[],args:['text'],ui:'message',summary:'Legacy literal-only message with one inlet.',example:'message.legacy 60 100'},
  message_box: {name:'message',aliases:['msg'],args:['text'],ui:'message',shortcut:'m',summary:'Store a message, replace it silently or substitute $1/$2.',example:'message saved $1 $2'},
  number: {name:'number.legacy',aliases:[],args:['value'],ui:'number',summary:'Legacy fractional box with hot and cold inlets.',example:'number.legacy 60'},
  number_int: {name:'number',aliases:['number.int'],args:['value'],options:['value','minimum','maximum'],ui:'number',shortcut:'i',summary:'Edit an integer; Tab emits a second-outlet bang.',example:'number 60'},
  toggle: {name:'toggle',aliases:[],args:['value'],ui:'toggle',shortcut:'t',summary:'Switch between zero and one.',example:'toggle 0'},
  add: {name:'+',aliases:['add','add.legacy'],args:['rhs'],options:[],ui:'object',summary:'Add a stored right operand with fixed integer or float output; add.legacy retains Ultra arithmetic.',example:'+ 12'},
  multiply: {name:'*',aliases:['multiply','multiply.legacy'],args:['rhs'],options:[],ui:'object',summary:'Multiply by a stored right operand with fixed integer or float output; multiply.legacy retains Ultra arithmetic.',example:'* 0.5'},
  subtract:{name:'-',aliases:[],args:['rhs'],options:[],ui:'object',summary:'Subtract the stored right operand from the left.',example:'- 2.'},
  divide:{name:'/',aliases:[],args:['rhs'],options:[],ui:'object',summary:'Divide the left operand by the stored right operand.',example:'/ 2.'},
  modulo:{name:'%',aliases:[],args:['rhs'],options:[],ui:'object',summary:'Emit the remainder in a fixed integer or float mode.',example:'% 3'},
  reverse_subtract:{name:'!-',aliases:[],args:['rhs'],options:[],ui:'object',summary:'Subtract the left operand from the stored right operand.',example:'!- 10.'},
  reverse_divide:{name:'!/',aliases:[],args:['rhs'],options:[],ui:'object',summary:'Divide the stored right operand by the left operand.',example:'!/ 10.'},
  abs:{name:'abs',aliases:[],args:['numericmode'],options:[],ui:'object',summary:'Emit an absolute value with fixed integer or float output.',example:'abs 0.'},
  metro: {name:'metro',aliases:[],args:['interval'],ui:'object',summary:'Emit bangs on the native clock, including with audio off.',example:'metro 150'},
  counter: {name:'counter',aliases:[],args:['steps'],ui:'object',summary:'Count from zero, wrapping at the step count.',example:'counter 8'},
  chord: {name:'chord',aliases:[],args:['root','shape'],ui:'object',summary:'Turn an index into a triad pitch.',example:'chord 48 0'},
  makenote: {name:'makenote',aliases:[],args:['velocity','duration'],ui:'object',summary:'Create a note pair and a timed note-off.',example:'makenote 100 150'},
  midiin: {name:'midiin',aliases:[],args:['channel'],ui:'object',summary:'Receive JACK MIDI notes on one channel.',example:'midiin 2'},
  voice: {name:'voice~',aliases:[],args:['device','attack','release'],ui:'object',summary:'Play a prepared sine / ASR instrument.',example:'voice~ 0 8 28'},
  gain: {name:'gain~',aliases:[],args:['value'],ui:'gain',summary:'Set the level of a mono signal.',example:'gain~ 4'},
  join: {name:'join~',aliases:[],args:[],ui:'object',summary:'Join two mono signals into a stereo bundle.',example:'join~'},
  dac: {name:'stereo.dac~',aliases:[],args:[],ui:'object',summary:'Send a legacy stereo bundle to the shared audio output.',example:'stereo.dac~'},
  int: {name:'int',aliases:['i'],args:['value'],ui:'object',summary:'Store an integer; truncate floats toward zero.',example:'int 3'},
  float: {name:'float',aliases:['f'],args:['value'],ui:'object',summary:'Store and emit a floating-point number.',example:'float 3.5'},
  flonum: {name:'flonum',aliases:[],args:['value','minimum','maximum','numdecimalplaces'],ui:'number',shortcut:'f',summary:'Edit a floating-point value; Tab emits a second-outlet bang.',example:'flonum 0'},
  slider: {name:'slider',aliases:[],args:['value','size','min','mult','floatoutput'],ui:'slider',shortcut:'s',summary:'Move a bounded numeric slider.',example:'slider 0'},
  pack: {name:'pack',aliases:[],args:['args'],variadic:true,ui:'object',summary:'Store typed fields; left inlet emits the packed list.',example:'pack 0 0'},
  unpack: {name:'unpack',aliases:[],args:['args'],variadic:true,ui:'object',summary:'Split a typed list into separate outlets, right to left.',example:'unpack i f s'},
  select: {name:'select',aliases:['sel'],args:['args'],variadic:true,ui:'object',summary:'Match typed selectors and emit bangs.',example:'select 0 1'},
  route: {name:'route',aliases:[],args:['args'],variadic:true,ui:'object',summary:'Route matching selectors and pass unmatched input.',example:'route red blue'},
  trigger: {name:'trigger',aliases:['t'],args:['args'],variadic:true,ui:'object',summary:'Emit typed messages from right to left.',example:'trigger b i'},
  line: {name:'line',aliases:[],args:['value','grain'],options:['value','grain','time','floatoutput'],ui:'object',summary:'Ramp a control value on the native clock, including with audio off.',example:'line 0 20 @time 250'},
  print: {name:'print',aliases:[],args:['label'],options:['label','level','popup'],ui:'object',summary:'Write messages to the console, with optional value bubbles.',example:'print notes @popup 1'},
  send: {name:'send',aliases:['s'],args:['name'],ui:'object',summary:'Send typed messages to named receivers across documents.',example:'send notes'},
  receive: {name:'receive',aliases:['r'],args:['name'],ui:'object',summary:'Receive named messages across documents; an unnamed receiver accepts set.',example:'receive notes'},
  iter: {name:'iter',aliases:[],args:[],options:[],ui:'object',summary:'Emit individual typed list atoms in source order.',example:'iter'},
  prepend: {name:'prepend',aliases:[],args:['args'],variadic:true,listArgs:true,ui:'object',summary:'Place a retained optional prefix before incoming data.',example:'prepend list'},
  append: {name:'append',aliases:[],args:['args'],variadic:true,listArgs:true,ui:'object',summary:'Place a retained optional suffix after incoming data.',example:'append 9 tail'},
  zl_reg: {name:'zl.reg',aliases:['zl reg'],args:['args'],variadic:true,listArgs:true,ui:'object',summary:'Store a typed list with hot output and cold replacement.',example:'zl.reg 1 2.5 red'},
  zl_join: {name:'zl.join',aliases:['zl join'],args:['args'],variadic:true,listArgs:true,ui:'object',summary:'Concatenate hot left and cold right lists.',example:'zl.join 8 blue'},
  zl_len: {name:'zl.len',aliases:['zl len'],args:[],options:[],ui:'object',summary:'Count the atoms in a typed list.',example:'zl.len'},
  zl_iter: {name:'zl.iter',aliases:['zl iter'],args:['size'],options:[],ui:'object',summary:'Split a list into successive sized chunks.',example:'zl.iter 3'},
  zl_slice: {name:'zl.slice',aliases:['zl slice'],args:['size'],options:[],ui:'object',summary:'Split a list into its leading slice and remaining tail.',example:'zl.slice 2'},
  zl_rev: {name:'zl.rev',aliases:['zl rev'],args:[],options:[],ui:'object',summary:'Reverse the order of typed list atoms.',example:'zl.rev'},
  zl_rot: {name:'zl.rot',aliases:['zl rot'],args:['rotation'],options:[],ui:'object',summary:'Rotate list atoms right or left by a signed distance.',example:'zl.rot -2'},
  sig: {name:'sig~',aliases:[],args:['args'],variadic:true,listArgs:true,ui:'object',summary:'Convert one to eight numbers into constant mono signals.',example:'sig~ 0.25'},
  signal_add: {name:'+~',aliases:[],args:['rhs'],options:[],ui:'object',summary:'Add signal inputs with a shared scalar for an unconnected inlet.',example:'+~ 0.5'},
  signal_subtract: {name:'-~',aliases:[],args:['rhs'],options:[],ui:'object',summary:'Subtract the right signal from the left.',example:'-~ 0.5'},
  signal_multiply: {name:'*~',aliases:[],args:['rhs'],options:[],ui:'object',summary:'Multiply signals, or scale a signal by a number.',example:'*~ 0.1'},
  signal_divide: {name:'/~',aliases:[],args:['rhs'],options:[],ui:'object',summary:'Divide signals; a zero divisor outputs zero.',example:'/~ 2'},
  cycle: {name:'cycle~',aliases:[],args:['frequency'],options:['frequency','phase'],ui:'object',summary:'Generate a cosine signal at a frequency in Hz.',example:'cycle~ 440'},
  phasor: {name:'phasor~',aliases:[],args:['frequency'],options:['frequency','phase'],ui:'object',summary:'Generate a wrapping zero-to-one phase ramp.',example:'phasor~ 2'},
  noise: {name:'noise~',aliases:[],args:[],options:[],ui:'object',summary:'Generate a native mono noise signal between -1 and 1.',example:'noise~'},
  signal_clip: {name:'clip~',aliases:[],args:['minimum','maximum'],options:[],ui:'object',summary:'Limit a signal using lower and upper bounds.',example:'clip~ -1 1'},
  line_signal: {name:'line~',aliases:[],args:['value'],options:['value','time'],ui:'object',summary:'Ramp a signal on the native sample clock and bang on completion.',example:'line~ 0'},
  snapshot: {name:'snapshot~',aliases:[],args:['interval'],options:['interval','offset'],ui:'object',summary:'Read a signal as a floating-point control message.',example:'snapshot~ 100'},
  signal_dac: {name:'dac~',aliases:[],args:['channels'],variadic:true,listArgs:true,ui:'object',summary:'Mix mono signals into the shared left and right audio channels.',example:'dac~ 1 2'},
};

const inletDetails = {
  send: [['Send','Forward the complete typed message unchanged, including set, to matching named receivers across loaded documents. Delivery order among multiple receivers is unspecified.',['bang','number','symbol','list','named selector']]],
  receive: [['Set name','Set the runtime receive name without output. This inlet exists only for an unnamed creation; retargeting does not alter its saved creation name or ports.',['set <name>']]],
  print: [['Print','Write the complete accepted message to the console. No message interpretation and no outlets.',['bang','number','symbol','list','named selector']]],
  bang: [['Trigger','Any accepted control input emits a bang.',['bang','number','symbol','list','named selector']]],
  message: [['Trigger','Hot. Any accepted control input sends the stored literal.',['bang','number','symbol','list','named selector']]],
  message_box: [['Trigger / set','Hot. Replace $1/$2 arguments and send the stored template; bang recalls. set replaces the template silently. An empty display sends nothing.',['bang','number','symbol','list','named selector','set']],['Store','Cold. Replace the displayed template without output. Runtime changes leave saved text unchanged.',['bang','number','symbol','list','named selector']]],
  number: [['Value','Hot. A scalar stores and emits; bang emits the stored number. Range -100000 to 100000.',['bang','number']],['Store','Cold. A scalar stores without output.',['number']]],
  toggle: [['Switch','Hot. Bang toggles; a scalar sets zero or one and emits.',['bang','number']]],
  add: [['Left operand','Hot. A scalar stores and emits the sum; bang reuses the stored left operand.',['bang','number']],['Right operand','Cold. Store the right operand without output.',['number']]],
  multiply: [['Left operand','Hot. A scalar stores and emits the product; bang reuses the stored left operand.',['bang','number']],['Right operand','Cold. Store the right operand without output.',['number']]],
  metro: [['Clock','Hot. Nonzero starts, zero stops, bang emits once. Native sample-clock timing.',['0','1','bang']],['Interval','Cold. Set the next interval in milliseconds; 20 to 2000 ms.',['number (ms)']]],
  counter: [['Advance','Hot. Bang emits the current index and advances modulo steps.',['bang']],['Reset','Cold. Set the next index; negative values clip to zero.',['number']]],
  chord: [['Index','Hot. Convert a nonnegative index to a MIDI pitch. Negative indices clip to zero.',['number']],['Root','Cold. Root pitch 0 to 127.',['number (MIDI pitch)']]],
  makenote: [['Pitch','Hot. Emit [pitch, velocity], then [pitch, 0] after the stored duration.',['number (MIDI pitch)']],['Velocity','Cold. Store velocity 1 to 127.',['number']],['Duration','Cold. Store duration 10 to 2000 milliseconds.',['number (ms)']]],
  voice: [['Notes','Hot. Two-number pitch/velocity list. Velocity 0 releases the note. Four voices, oldest hard steal.',['pitch velocity']],['Attack','Cold. Latches at the next note-on. 1 to 127 times 4 ms; 0 is 16 samples.',['number (0-127)']],['Release','Cold. Latches at the next note-on. 1 to 127 times 8 ms; 0 is 16 samples.',['number (0-127)']]],
  gain: [['Signal','Continuous mono audio. Multiple connected signals sum before applying the gain.',['mono signal']],['Level','Live linear level 0 to 127. This is a raw value, not dB.',['number (0-127)']]],
  join: [['Left','Continuous mono audio becomes channel 0 / left. A missing connection is silence.',['mono signal']],['Right','Continuous mono audio becomes channel 1 / right. A missing connection is silence.',['mono signal']]],
  dac: [['Output','Continuous stereo bundle: channel 0 left, channel 1 right. Exactly two JACK outputs.',['stereo signal bundle']]],
};
const outletDetails = {
  receive:[['Received message','The complete typed message from matching sends in any loaded document. A received set selector is emitted as data; it does not retarget this receiver.',['bang','number','symbol','list','named selector']]],
  bang:[['Bang','One bang per accepted input.',['bang']]],
  message:[['Message','The stored literal bang, numeric/symbol atoms or named selector. At most eight atoms; substitution and comma/semicolon syntax are unsupported.',['bang','number','symbol','list','named selector']]],
  message_box:[['Message','The stored template with $1/$2 replaced by remembered typed arguments. The displayed template stays literal. An empty template emits nothing.',['bang','number','symbol','list','named selector']]],
  number:[['Value','The stored fractional value from the legacy two-inlet, one-outlet Ultra number box.',['number']]],
  toggle:[['State','The current boolean state, zero or one.',['0','1']]],
  add:[['Sum','Left plus right, clipped to -100000 to 100000.',['number']]],
  multiply:[['Product','Left times right, clipped to -100000 to 100000.',['number']]],
  metro:[['Tick','Bang at each native scheduled deadline. Browser polling is not the clock.',['bang']]],
  counter:[['Index','Index from zero to steps minus one.',['number']]],
  chord:[['Pitch','MIDI pitch clipped to 0 to 127. Shape 0 major, 1 minor, 2 sus4.',['number (MIDI pitch)']]],
  makenote:[['Notes','Note-on [pitch, velocity], followed by [pitch, 0]. This is one list outlet, unlike Max makenote.',['pitch velocity']]],
  midiin:[['Notes','Channel-filtered MIDI note pairs. Note-off is [pitch, 0]. No clock, CC, SysEx or general MIDI byte stream.',['pitch velocity']]],
  voice:[['Signal','One mono sine / ASR signal. Uses prepared bank A (0) or B (1).',['mono signal']]],
  gain:[['Signal','One mono signal multiplied by the linear level.',['mono signal']]],
  join:[['Stereo','Two-channel bundle: left at channel 0, right at channel 1.',['stereo signal bundle']]],
};

export const OBJECTS = Object.freeze(Object.fromEntries(Object.entries(REGISTRY).map(([type,s])=>[type,Object.freeze({...s,...definitions[type],type})])));

export function parseObjectText(text, previous=null) {
  if(typeof text==='string'){
    // A comment's body is literal, including leading spaces and line breaks.
    const comment=text.match(/^\s*comment(?:\s([\s\S]*))?$/);
    if(comment){
      const node=makeNode('comment',1,0,0,{text:comment[1]??''});
      validatePatch({version:2,profile:'ultra-patcher-v2',nodes:[node],edges:[]});
      return{type:node.type,params:node.params};
    }
  }
  if(typeof text!=='string')throw Error('Object text must be a string.');
  const normalized=text.trim().replace(/^zl\s+(reg|join|len|iter|slice|rev|rot)(?=\s|$)/,'zl.$1');
  const match=normalized.match(/^(\S+)(?:\s+(.*))?$/);
  if(!match)throw Error('Type a supported object name.');
  const [,name,tail='']=match;
  const entry=Object.values(OBJECTS).find(s=>s.name===name||s.aliases.includes(name));
  // Plain decimal spelling of a subnormal double can exceed 320 characters.
  const textLimit=entry&&isArithmetic(entry.type)?384:160;
  if(text.length>textLimit)throw Error(`Object text must be at most ${textLimit} characters.`);
  if(!entry)throw Error(`Unknown object "${name}". Choose a supported object from the list.`);
  const params=!isArithmetic(entry.type)&&previous?.type===entry.type?{...previous.params}:{};
  if(entry.type==='send'&&!tail.trim())throw Error('send requires a name.');
  if(entry.type==='receive'&&!tail.trim())params.name='';
  if(isArithmetic(entry.type)) {
    const values=tail.trim()?tail.trim().split(/\s+/):[];
    if(values.length>1)throw Error(`${entry.name} accepts one numeric creation argument.`);
    const word=values[0];
    if(word&&!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(word))throw Error('Arithmetic creation argument must be a finite number.');
    const legacy=ARITHMETIC[entry.type].legacy&&name!==entry.name;
    if(word&&!legacy&&/[eE]/.test(word))throw Error('Exponent creation syntax is not qualified; use a decimal argument to select float mode.');
    Object.assign(params,legacy?{rhs:entry.params.rhs.value,numericmode:0}:arithmeticCreationParams(entry.type));
    if(word){
      const value=Number(word);if(!Number.isFinite(value)||Math.abs(value)>100000)throw Error('Arithmetic creation argument is outside the bounded control profile.');
      params.numericmode=legacy?0:/[.eE]/.test(word)?2:1;
      if(entry.type!=='abs')params.rhs=value;
    }
  } else if(entry.listArgs) {
    if(tail.split(/\s+/).some(word=>word.startsWith('@')))throw Error(`${entry.name} has no supported creation attributes.`);
    const key=entry.args[0];if(tail||entry.params[key].allowEmpty)params[key]=tail;
  } else if(entry.variadic) {
    if(tail)params.args=tail.startsWith('@args ')?tail.slice(6).trim():tail;
  } else if(['patcher','comment'].includes(entry.type)) {
    if(tail)params[entry.type==='patcher'?'name':'text']=tail;
  } else if(['message','message_box'].includes(entry.type)) {
    if(tail||entry.type==='message_box')params.text=tail;
  } else {
    const values=tail.trim()?tail.trim().split(/\s+/):[];
    const assigned=new Set();let position=0,named=false;
    for(let i=0;i<values.length;i++) {
      let key,word=values[i];
      if(word.startsWith('@')) {
        named=true;key=word.slice(1);
        const allowed=entry.options||entry.args;
        if(!allowed.includes(key))throw Error(`Unknown ${entry.name} option "${word}". Supported options: ${allowed.map(k=>'@'+k).join(', ')||'none'}.`);
        word=values[++i];
      } else {
        if(named)throw Error('Place positional arguments before @options.');
        key=entry.args[position++];
        if(!key)throw Error(`${entry.name} accepts ${entry.args.length} argument${entry.args.length===1?'':'s'}: ${entry.args.join(', ')||'none'}.`);
      }
      if(assigned.has(key))throw Error(`${key} is already supplied.`);
      if(['label','name'].includes(entry.params[key].kind)){
        if(!word)throw Error(`${key} requires a ${entry.params[key].kind}.`);params[key]=word;
      }else{
        if(!word||!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(word))throw Error(`${key} must be a finite number.`);
        params[key]=Number(word);
      }
      assigned.add(key);
    }
  }
  const node=makeNode(entry.type,1,0,0,params);
  const hierarchical=['patcher','comment','inlet','outlet'].includes(entry.type);
  validatePatch({version:hierarchical?2:1,profile:hierarchical?'ultra-patcher-v2':'ultra-canvas-v1',nodes:[node],edges:[]});
  return {type:node.type,params:node.params};
}

export function objectText(node) {
  if(isArithmetic(node.type))return arithmeticObjectText(node);
  const s=OBJECTS[node.type];
  const extra=(s.options||[]).filter(k=>!s.args.includes(k)&&node.params[k]!==s.params[k].value).flatMap(k=>['@'+k,String(node.params[k])]);
  return [s.name,...s.args.map(k=>String(node.params[k])).filter(value=>value!==''),...extra].join(' ');
}

export function suggestObjects(text) {
  const q=text.trim().split(/\s+/)[0].toLowerCase();
  return Object.values(OBJECTS).map((s,index)=>{
    const names=[s.name,...s.aliases];
    const score=!q?3:names.some(n=>n===q)?0:names.some(n=>n.startsWith(q))?1:names.some(n=>n.includes(q))?2:99;
    return{...s,score,index};
  }).filter(s=>s.score<99).sort((a,b)=>a.score-b.score||a.index-b.index);
}

export function portHelp(nodeOrType,direction,index) {
  const node=typeof nodeOrType==='string'?makeNode(nodeOrType,1):nodeOrType,type=node.type,s=nodeSpec(node),p=(direction==='in'?s.inlets:s.outlets)[index];
  if(!p)throw Error('This port does not exist.');
  const known=(direction==='in'?inletDetails:outletDetails)[type]?.[index];
  let [title,detail,messages]=known||[p.label,s.help,['bang','number','symbol','list','named selector']];
  if(isArithmetic(type)){
    const mode=node.params.numericmode??0,label=arithmeticModeChoices(type).find(([value])=>value===mode)?.[1]??'Integer';
    if(direction==='out'){title=p.label;detail=`${label} output. ${s.help} Results must fit -100000 to 100000.`;messages=[mode===2?'float':mode===1?'int':'number'];}
    else if(type==='abs'){title='Value';detail=`${label} mode. A numeric input or numeric list emits the absolute value of its first atom. Bang and set are silent.`;messages=['int','float','numeric list'];}
    else {title=index?'Right operand':'Left operand';detail=index?`Cold. Store the right operand without output. ${label} mode.`:`Hot. Store the left operand and emit; bang recomputes with the stored operands. ${label} mode.`;messages=index?['int','float']:mode===0?['bang','number']:['bang','int','float','numeric list',...(['reverse_subtract','reverse_divide'].includes(type)?[]:['set'])];}
  }
  if(['int','float','flonum','number_int','slider'].includes(type)) {
    if(direction==='in') {title=index?'Store':'Value';detail=index?'Cold. Store the value without output.':`Hot. Store and emit a value; bang emits the stored value; set stores silently. ${s.help}`;}
    else {title=index?'Tab bang':'Value';detail=index?'Physical Tab on the focused numeric box emits a bang from this outlet. The input selector tab does not.':s.help;messages=index?['bang']:['number'];}
  }
  if(type==='pack') {title=direction==='in'?`Field ${index}`:'List';detail=direction==='out'?s.help:index?'Cold. Store this typed list field without output.':'Hot. Store the left field and emit the complete list; bang emits the stored list.';}
  if(type==='unpack') {title=direction==='in'?'List':`Field ${index}`;detail=direction==='in'?`Hot. ${s.help}`:`Emit field ${index}, coerced by its creation argument. Outlets fire synchronously from right to left.`;}
  if(type==='trigger') {title=direction==='in'?'Input':`Output ${index}`;detail=direction==='in'?`Hot. ${s.help}`:`Argument ${node.params.args.trim().split(/\s+/)[index]} controls this output. ${s.help}`;}
  if(['select','route'].includes(type)) {
    const count=s.outlets.length-1;
    title=direction==='in'?(index?`Selector ${index-1}`:'Input'):(index===count?'Unmatched':`Match ${index}`);
    detail=direction==='in'&&index?'Cold. Replace the corresponding selector without output.':`${direction==='in'?'Hot. ':''}${s.help}`;
    if(direction==='out'&&index<count&&type==='select')messages=['bang'];
  }
  if(type==='line') {
    title=direction==='in'?['Target / commands','Ramp time','Output grain'][index]:['Value','Complete'][index];
    detail=direction==='in'&&index?`Cold. Store ${index===1?'ramp time':'output grain'} in milliseconds.`:`${direction==='in'?'Hot. ':''}${s.help}`;
    messages=direction==='out'?(index?['bang']:['number']):index?['number (ms)']:['number','target time pairs','set','stop','pause','resume'];
  }
  if(['sig','signal_add','signal_subtract','signal_multiply','signal_divide','cycle','phasor','noise','signal_clip','line_signal','snapshot','signal_dac'].includes(type)){
    detail=s.help;
    if(direction==='out'){
      title=p.type==='mono'?'Signal':type==='line_signal'?'Complete':'Sampled float';
      messages=p.type==='mono'?['mono signal']:type==='line_signal'?['bang']:['float'];
    }else{
      title=p.label;
      if(type==='sig')messages=['number','numeric list','set index value','signal (dependency only)'];
      else if(type.startsWith('signal_')&&['signal_add','signal_subtract','signal_multiply','signal_divide','signal_clip'].includes(type))messages=['mono signal','number'];
      else if(type==='cycle')messages=index?['mono signal','number (cycles)']:['mono signal','number (Hz)','reset phase'];
      else if(type==='phasor')messages=index?['mono reset signal','number (cycles)']:['mono signal','number (Hz)'];
      else if(type==='noise')messages=['none'];
      else if(type==='line_signal')messages=index?['number (ms)']:['number','target time pairs','set','stop','pause','resume'];
      else if(type==='snapshot')messages=index?['number (ms)']:['mono signal','bang','start','stop','offset <0-63>'];
      else if(type==='signal_dac')messages=['mono signal'];
    }
  }
  if(type.startsWith('zl_')) {
    const inactive=direction==='out'?index===1&&type!=='zl_slice':index===1&&['zl_len','zl_rev'].includes(type);
    if(inactive){title='Inactive';detail='Inactive in this zl mode. The saved port remains available to preserve Max cable indices.';messages=['none'];}
    else if(direction==='in'&&index===1){
      title={zl_reg:'Store list',zl_join:'Right list',zl_iter:'Chunk size',zl_slice:'Leading size',zl_rot:'Rotation'}[type];
      detail=['zl_reg','zl_join'].includes(type)?`Cold. Replace the ${type==='zl_reg'?'retained':'right'} list silently; at most eight typed atoms.`:`Cold. Change the ${title.toLowerCase()} without output. ${s.help}`;
      messages=['zl_reg','zl_join'].includes(type)?['number','symbol','list','named selector']:['integer'];
    }else if(direction==='out'){
      title=type==='zl_slice'?(index?'Remaining tail':'Leading slice'):p.label;
      detail=type==='zl_slice'?(index?'Emit a nonempty remaining tail first, before the leading slice from the left outlet. An empty tail emits nothing.':'Emit a nonempty leading slice after the remaining tail from the right outlet. An empty leading slice emits nothing.'):s.help;
      if(type!=='zl_len')detail+=' Numeric singletons emit as int or float; symbol-headed results emit a named selector with remaining atoms.';
      messages=type==='zl_len'?['integer']:['number','list','named selector'];
    }else {title='List / recall';detail=`Hot. ${s.help}`;}
    if(direction==='in') {
      if(inactive){detail='Inactive for data in this zl mode; reset commands are still accepted. The saved port preserves Max cable indices.';messages=[];}
      if(index===1&&['zl_reg','zl_join','zl_len','zl_rev'].includes(type))detail+=' zlclear clears retained lists and resets the mode parameter to zero; zlreset clears lists while keeping the parameter.';
      messages=[...messages,'zlclear','zlreset'];
    }
  }
  return {title,detail,messages,type:p.type,direction:direction==='in'?'Accepts':'Emits'};
}
