import {REGISTRY, makeNode, nodeSpec, validatePatch} from './canvas-model.mjs';

// This is Ultra's documented authoring vocabulary, not a Max class resolver.
const definitions = {
  bang: {name:'bang',aliases:['button'],args:[],ui:'bang',shortcut:'b',summary:'Convert any input to a bang.',example:'bang'},
  message: {name:'message',aliases:['msg'],args:['text'],ui:'message',shortcut:'m',summary:'Store and send a literal message.',example:'message 60 100'},
  number: {name:'number',aliases:[],args:['value'],ui:'number',shortcut:'i',summary:'Store a number; emit from the hot inlet.',example:'number 60'},
  toggle: {name:'toggle',aliases:[],args:['value'],ui:'toggle',shortcut:'t',summary:'Switch between zero and one.',example:'toggle 0'},
  add: {name:'+',aliases:['add'],args:['rhs'],ui:'object',summary:'Add a stored right operand.',example:'+ 12'},
  multiply: {name:'*',aliases:['multiply'],args:['rhs'],ui:'object',summary:'Multiply by a stored right operand.',example:'* 0.5'},
  metro: {name:'metro',aliases:[],args:['interval'],ui:'object',summary:'Emit bangs on the native clock, including with audio off.',example:'metro 150'},
  counter: {name:'counter',aliases:[],args:['steps'],ui:'object',summary:'Count from zero, wrapping at the step count.',example:'counter 8'},
  chord: {name:'chord',aliases:[],args:['root','shape'],ui:'object',summary:'Turn an index into a triad pitch.',example:'chord 48 0'},
  makenote: {name:'makenote',aliases:[],args:['velocity','duration'],ui:'object',summary:'Create a note pair and a timed note-off.',example:'makenote 100 150'},
  midiin: {name:'midiin',aliases:[],args:['channel'],ui:'object',summary:'Receive JACK MIDI notes on one channel.',example:'midiin 2'},
  voice: {name:'voice~',aliases:[],args:['device','attack','release'],ui:'object',summary:'Play a prepared sine / ASR instrument.',example:'voice~ 0 8 28'},
  gain: {name:'gain~',aliases:[],args:['value'],ui:'gain',summary:'Set the level of a mono signal.',example:'gain~ 4'},
  join: {name:'join~',aliases:[],args:[],ui:'object',summary:'Join two mono signals into a stereo bundle.',example:'join~'},
  dac: {name:'dac~',aliases:[],args:[],ui:'object',summary:'Send one stereo bundle to JACK output.',example:'dac~'},
  int: {name:'int',aliases:['i'],args:['value'],ui:'object',summary:'Store an integer; truncate floats toward zero.',example:'int 3'},
  float: {name:'float',aliases:['f'],args:['value'],ui:'object',summary:'Store and emit a floating-point number.',example:'float 3.5'},
  flonum: {name:'flonum',aliases:[],args:['value','minimum','maximum','numdecimalplaces'],ui:'number',summary:'Edit a floating-point value; Tab emits a second-outlet bang.',example:'flonum 0'},
  slider: {name:'slider',aliases:[],args:['value','size','min','mult','floatoutput'],ui:'slider',summary:'Move a bounded numeric slider.',example:'slider 0'},
  pack: {name:'pack',aliases:[],args:['args'],variadic:true,ui:'object',summary:'Store typed fields; left inlet emits the packed list.',example:'pack 0 0'},
  unpack: {name:'unpack',aliases:[],args:['args'],variadic:true,ui:'object',summary:'Split a typed list into separate outlets, right to left.',example:'unpack i f s'},
  select: {name:'select',aliases:['sel'],args:['args'],variadic:true,ui:'object',summary:'Match typed selectors and emit bangs.',example:'select 0 1'},
  route: {name:'route',aliases:[],args:['args'],variadic:true,ui:'object',summary:'Route matching selectors and pass unmatched input.',example:'route red blue'},
  trigger: {name:'trigger',aliases:['t'],args:['args'],variadic:true,ui:'object',summary:'Emit typed messages from right to left.',example:'trigger b i'},
  line: {name:'line',aliases:[],args:['value','grain'],options:['value','grain','time','floatoutput'],ui:'object',summary:'Ramp a control value on the native clock, including with audio off.',example:'line 0 20 @time 250'},
};

const inletDetails = {
  bang: [['Trigger','Any accepted control input emits a bang.',['bang','number','symbol','list','named selector']]],
  message: [['Trigger','Hot. Any accepted control input sends the stored literal.',['bang','number','symbol','list','named selector']]],
  number: [['Value','Hot. A scalar stores and emits; bang emits the stored number. Range -100000 to 100000.',['bang','number']],['Store','Cold. A scalar stores without output.',['number']]],
  toggle: [['Switch','Hot. Bang toggles; a scalar sets zero or one and emits.',['bang','number']]],
  add: [['Left operand','Hot. A scalar stores and emits the sum; bang reuses the stored left operand.',['bang','number']],['Right operand','Cold. Store the right operand without output.',['number']]],
  multiply: [['Left operand','Hot. A scalar stores and emits the product; bang reuses the stored left operand.',['bang','number']],['Right operand','Cold. Store the right operand without output.',['number']]],
  metro: [['Clock','Hot. Nonzero starts, zero stops, bang emits once. Native sample-clock timing.',['0','1','bang']],['Interval','Cold. Set the next interval in milliseconds; 20 to 2000 ms.',['number (ms)']]],
  counter: [['Advance','Hot. Bang emits the current index and advances modulo steps.',['bang']],['Reset','Cold. Set the next index; negative values clip to zero.',['number']]],
  chord: [['Index','Hot. Convert a nonnegative index to a MIDI pitch. Negative indices clip to zero.',['number']],['Root','Cold. Root pitch 0 to 127.',['number (MIDI pitch)']]],
  makenote: [['Pitch','Hot. Emit [pitch, velocity], then [pitch, 0] after the stored duration.',['number (MIDI pitch)']],['Velocity','Cold. Store velocity 1 to 127.',['number']],['Duration','Cold. Store duration 10 to 2000 milliseconds.',['number (ms)']]],
  voice: [['Notes','Hot. Two-number pitch/velocity list. Velocity 0 releases the note. Four voices, oldest hard steal.',['pitch velocity']],['Attack','Cold. Latches at the next note-on. 1 to 127 times 4 ms; 0 is 16 samples.',['number (0-127)']],['Release','Cold. Latches at the next note-on. 1 to 127 times 8 ms; 0 is 16 samples.',['number (0-127)']]],
  gain: [['Signal','Continuous mono audio from voice~. One supported source per audio inlet.',['mono signal']],['Level','Live linear level 0 to 127. This is a raw value, not dB.',['number (0-127)']]],
  join: [['Left','Continuous mono audio becomes channel 0 / left. A missing connection is silence.',['mono signal']],['Right','Continuous mono audio becomes channel 1 / right. A missing connection is silence.',['mono signal']]],
  dac: [['Output','Continuous stereo bundle: channel 0 left, channel 1 right. Exactly two JACK outputs.',['stereo signal bundle']]],
};
const outletDetails = {
  bang:[['Bang','One bang per accepted input.',['bang']]],
  message:[['Message','The stored literal bang, numeric/symbol atoms or named selector. At most eight atoms; substitution and comma/semicolon syntax are unsupported.',['bang','number','symbol','list','named selector']]],
  number:[['Value','The stored finite numeric value. This profile has one numeric box; it is not Max int or flonum coercion.',['number']]],
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
  if(typeof text!=='string'||text.length>160)throw Error('Object text must be at most 160 characters.');
  const match=text.trim().match(/^(\S+)(?:\s+(.*))?$/);
  if(!match)throw Error('Type a supported object name.');
  const [,name,tail='']=match;
  const entry=Object.values(OBJECTS).find(s=>s.name===name||s.aliases.includes(name));
  if(!entry)throw Error(`Unknown object "${name}". Choose a supported object from the list.`);
  const params=previous?.type===entry.type?{...previous.params}:{};
  if(entry.variadic) {
    if(tail)params.args=tail.startsWith('@args ')?tail.slice(6).trim():tail;
  } else if(entry.type==='message') {
    if(tail)params.text=tail;
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
      if(!word||!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(word))throw Error(`${key} must be a finite number.`);
      params[key]=Number(word);assigned.add(key);
    }
  }
  const node=makeNode(entry.type,1,0,0,params);
  validatePatch({version:1,profile:'ultra-canvas-v1',nodes:[node],edges:[]});
  return {type:node.type,params:node.params};
}

export function objectText(node) {
  const s=OBJECTS[node.type];
  const extra=(s.options||[]).filter(k=>!s.args.includes(k)&&node.params[k]!==s.params[k].value).flatMap(k=>['@'+k,String(node.params[k])]);
  return [s.name,...s.args.map(k=>String(node.params[k])),...extra].join(' ');
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
  if(['int','float','flonum','slider'].includes(type)) {
    if(direction==='in') {title=index?'Store':'Value';detail=index?'Cold. Store the value without output.':`Hot. Store and emit a value; bang emits the stored value; set stores silently. ${s.help}`;}
    else {title=index?'Tab bang':'Value';detail=index?'Tab on the focused flonum emits a bang from this outlet.':s.help;messages=index?['bang']:['number'];}
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
  return {title,detail,messages,type:p.type,direction:direction==='in'?'Accepts':'Emits'};
}
