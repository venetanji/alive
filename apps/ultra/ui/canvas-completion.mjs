import {OBJECTS, suggestObjects} from './canvas-catalog.mjs';

const details={
  text:'Literal bang, symbols, list or named selector; at most 8 atoms, 127 ASCII bytes; no substitution, quotes, commas or semicolons',value:'Initial value',rhs:'Stored right operand',
  interval:'Clock interval in milliseconds',steps:'Number of steps',root:'Root MIDI pitch',shape:'Triad shape',
  velocity:'Note velocity',duration:'Note duration in milliseconds',channel:'MIDI channel',
  device:'Prepared voice bank',attack:'Attack, raw value times 4 ms; 0 = 16 frames',
  release:'Release, raw value times 8 ms; 0 = 16 frames',
  args:'1 to 8 typed atoms, at most 127 ASCII bytes; symbols at most 31 bytes. Numeric 0 and 0. retain integer and float identity',
  minimum:'Lower bound for displayed numeric input',maximum:'Upper bound for displayed numeric input',numdecimalplaces:'Displayed decimal places; stored precision is retained',
  size:'Number of raw slider positions, from 0 to size minus 1',min:'Offset added to the scaled output; the pointer range stays raw',mult:'Multiplier applied to the raw value before adding min; may be zero or negative',
  floatoutput:'Numeric output mode',time:'Default ramp time in milliseconds',grain:'Ramp output interval in milliseconds',
};
const options={
  'toggle.value':[[0,'Off'],[1,'On']],
  'chord.shape':[[0,'Major'],[1,'Minor'],[2,'Sus4']],
  'voice.device':[[0,'Bank A'],[1,'Bank B']],
  'slider.floatoutput':[[0,'Integer'],[1,'Float']],
  'line.floatoutput':[[0,'Integer'],[1,'Float'],[2,'Automatic']],
};
const signature=s=>[s.name,...s.args.map(k=>`[${k}${s.variadic?'...':''}]`)].join(' ');
function parameter(s,key) {
  const p=s.params[key],choices=options[`${s.type}.${key}`]||[];
  const detail=['text','args'].includes(key)?`${details[key]}.${key==='args'?` Default ${p.value}. ${s.type==='trigger'?'Use i/int, f/float, b/bang, l/list, s/symbol or constant atoms.':''}`:''}`:`${details[key]}. ${p.integer?'Integer':'Number'} from ${p.min} to ${p.max}; default ${p.value}.`;
  return{...p,key,detail,choices};
}

export function completionFor(text,caret=text.length) {
  const tokens=[...text.matchAll(/\S+/g)].map(m=>({text:m[0],start:m.index,end:m.index+m[0].length}));
  caret=Math.max(0,Math.min(caret,text.length));
  const name=tokens[0],entry=Object.values(OBJECTS).find(s=>s.name===name?.text||s.aliases.includes(name?.text));
  const base={object:entry,parameters:entry?(entry.options||entry.args).map(k=>parameter(entry,k)):[],syntax:entry?signature(entry):'',parameter:null};
  if(!entry||caret<=name.end) {
    const choices=suggestObjects(name?.text||'').map(s=>({
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
  if(entry.type==='message')return{...base,mode:'arguments',parameter:parameter(entry,'text'),choices:[]};
  if(entry.variadic)return{...base,mode:'arguments',parameter:parameter(entry,'args'),choices:[]};
  // Parameter names are Ultra's supported creation options, validated by the same registry as positional arguments.
  if(current.text.startsWith('@')||(!pending&&(named||position>=entry.args.length))) {
    const prefix=text.slice(current.start,caret);
    return{...base,mode:'options',choices:(entry.options||entry.args).filter(k=>!assigned.has(k)&&('@'+k).startsWith(prefix)).map(k=>({
      ...choice('@'+k,parameter(entry,k).detail),kind:'option',parameter:parameter(entry,k),
    }))};
  }
  const key=pending||entry.args[position],p=entry.params[key]?parameter(entry,key):null;
  const prefix=text.slice(current.start,caret),values=p?(p.choices.length?p.choices:[[p.value,`Default ${key}`]]):[];
  return{...base,mode:'values',parameter:p,choices:values.filter(([value])=>String(value).startsWith(prefix)).map(([value,label])=>({
    ...choice(String(value),label),kind:'value',parameter:p,
  }))};
}
