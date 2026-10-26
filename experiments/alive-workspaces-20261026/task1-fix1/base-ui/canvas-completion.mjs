import {OBJECTS, suggestObjects} from './canvas-catalog.mjs';
import {isArithmetic,ARITHMETIC} from './canvas-arithmetic.mjs';

const details={
  name:'Global message name: one ASCII token, up to 31 bytes',
  label:'Console prefix: one ASCII word or number, up to 31 bytes',level:'Console severity: 0 message, 1 warning, 2 error, 3 debug',
  text:'Literal bang, symbols, list or named selector; at most 8 atoms, 127 ASCII bytes; no substitution, quotes, commas or semicolons',value:'Initial value',rhs:'Stored right operand',numericmode:'Fixed integer or float arithmetic mode',
  interval:'Clock interval in milliseconds',steps:'Number of steps',root:'Root MIDI pitch',shape:'Triad shape',
  velocity:'Note velocity',duration:'Note duration in milliseconds',channel:'MIDI channel',
  device:'Prepared voice bank',attack:'Attack, raw value times 4 ms; 0 = 16 frames',
  release:'Release, raw value times 8 ms; 0 = 16 frames',
  args:'1 to 8 typed atoms, at most 127 ASCII bytes; symbols at most 31 bytes. Numeric 0 and 0. retain integer and float identity',
  minimum:'Lower bound for displayed numeric input',maximum:'Upper bound for displayed numeric input',numdecimalplaces:'Displayed decimal places; stored precision is retained',
  size:'Number of raw slider positions, from 0 to size minus 1',min:'Offset added to the scaled output; the pointer range stays raw',mult:'Multiplier applied to the raw value before adding min; may be zero or negative',
  floatoutput:'Numeric output mode',time:'Default ramp time in milliseconds',grain:'Ramp output interval in milliseconds',
  frequency:'Oscillator frequency in Hz',phase:'Wrapped phase in cycles',offset:'Sample index in the most recent 64-frame signal vector',channels:'Physical output channel numbers: 1 is left, 2 is right',
};
const options={
  'toggle.value':[[0,'Off'],[1,'On']],
  'chord.shape':[[0,'Major'],[1,'Minor'],[2,'Sus4']],
  'voice.device':[[0,'Bank A'],[1,'Bank B']],
  'slider.floatoutput':[[0,'Integer'],[1,'Float']],
  'line.floatoutput':[[0,'Integer'],[1,'Float'],[2,'Automatic']],
};
const signature=s=>[s.name,...s.args.map(k=>`[${k}${s.variadic?'...':''}]`)].join(' ');
function parameter(s,key,authoredName=s.name) {
  if(isArithmetic(s.type)){
    if(ARITHMETIC[s.type].legacy&&authoredName!==s.name)return{...s.params[key],key,detail:'Stored right operand for legacy Ultra arithmetic. Decimal and exponent tokens retain legacy numeric behavior; bare creation resets the operand.',choices:[]};
    if(key==='numericmode')return{...s.params[key],key,detail:'A numeric creation token selects integer output; a decimal marker selects float output. The magnitude is not stored.',choices:[[0,'Integer format'],['0.','Float format']]};
    return{...s.params[key],value:ARITHMETIC[s.type].rhs,key,detail:'Stored right operand. An integer token selects integer output; use a decimal marker such as 2. for float output. Bare creation resets the operand and mode. Exponent syntax is not supported.',choices:[]};
  }
  const p=s.params[key],choices=options[`${s.type}.${key}`]||[];
  const detail=p.kind==='name'?`${details[key]}. ${s.type==='receive'?'Optional; omit for an unbound receiver with a set inlet.':'Required for object-text creation.'}`:p.kind==='label'?`${details[key]}; default ${p.value}.`:['text','args'].includes(key)?`${details[key]}.${key==='args'?` Default ${p.value}. ${s.type==='trigger'?'Use i/int, f/float, b/bang, l/list, s/symbol or constant atoms.':''}`:''}`:`${details[key]}. ${p.integer?'Integer':'Number'} from ${p.min} to ${p.max}; default ${p.value}.`;
  return{...p,key,detail:p.detail||detail,choices};
}

export function completionFor(text,caret=text.length) {
  const tokens=[...text.matchAll(/\S+/g)].map(m=>({text:m[0],start:m.index,end:m.index+m[0].length}));
  const legacy=tokens[0]?.text==='zl'&&Object.values(OBJECTS).find(s=>s.name===`zl.${tokens[1]?.text}`);
  if(legacy)tokens.splice(0,2,{text:legacy.name,start:tokens[0].start,end:tokens[1].end});
  caret=Math.max(0,Math.min(caret,text.length));
  const name=tokens[0],entry=Object.values(OBJECTS).find(s=>s.name===name?.text||s.aliases.includes(name?.text));
  const entryParameter=key=>parameter(entry,key,name?.text);
  const base={object:entry,parameters:entry?(entry.options||entry.args).map(entryParameter):[],syntax:entry?signature(entry):'',parameter:null};
  if(!entry||caret<=name.end) {
    const choices=(name?suggestObjects(name.text):[]).map(s=>({
      kind:'object',object:s,label:s.name,detail:s.summary,syntax:signature(s),insert:s.name,
      start:name?.start||0,end:name?.end||caret,
    }));
    return{...base,mode:'objects',choices};
  }
  if(!entry)return{...base,mode:'arguments',choices:[]};
  const current=tokens.slice(1).find(t=>caret>=t.start&&caret<=t.end)||{text:'',start:caret,end:caret};
  const before=tokens.slice(1).filter(t=>t.end<current.start),assigned=new Set();
  let position=0,pending=null,named=false;
  for(const token of before) {
    if(token.text.startsWith('@')){pending=token.text.slice(1);assigned.add(pending);named=true;}
    else if(pending)pending=null;
    else assigned.add(entry.args[position++]);
  }
  const choice=(label,detail,insert=label)=>({label,detail,insert,start:current.start,end:current.end});
  if(['message','message_box'].includes(entry.type))return{...base,mode:'arguments',parameter:{...entryParameter('text'),...(entry.type==='message_box'?{detail:'Optional message text; empty sends nothing. Use $1/$2 payload atoms for substitution. Cold input or set replaces the live template silently.'}:{})},choices:[]};
  if(entry.variadic)return{...base,mode:'arguments',parameter:entryParameter(entry.args[0]),choices:[]};
  // Parameter names are Ultra's supported creation options, validated by the same registry as positional arguments.
  if(current.text.startsWith('@')||(!pending&&(named||position>=entry.args.length))) {
    const prefix=text.slice(current.start,caret);
    return{...base,mode:'options',choices:(entry.options||entry.args).filter(k=>!assigned.has(k)&&('@'+k).startsWith(prefix)).map(k=>({
      ...choice('@'+k,entryParameter(k).detail),kind:'option',parameter:entryParameter(k),
    }))};
  }
  const key=pending||entry.args[position],p=entry.params[key]?entryParameter(key):null;
  const prefix=text.slice(current.start,caret),values=p?(p.choices.length?p.choices:p.value===''?[]:[[p.value,`Default ${key}`]]):[];
  return{...base,mode:'values',parameter:p,choices:values.filter(([value])=>String(value).startsWith(prefix)).map(([value,label])=>({
    ...choice(String(value),label),kind:'value',parameter:p,
  }))};
}
