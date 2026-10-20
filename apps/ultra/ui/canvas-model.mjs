// ultra-canvas-v1: a document/editor and bounded native command adapter, never a JS scheduler or DSP.
const C = 'control', M = 'mono', S = 'stereo';
const port = (type, label, side) => ({type, label, side});
const ports = (items, side) => items.map(([type,label])=>port(type,label,side));
const number = (value,min,max,integer=false) => ({value,min,max,integer});
const spec = (label, params, inputs, outputs, help) => ({label,params,inlets:ports(inputs,'top'),outlets:ports(outputs,'bottom'),help});
export const REGISTRY = Object.freeze({
  bang: spec('bang',{},[[C,'trigger']],[[C,'bang']],'Any input emits bang. Click to send a native bang.'),
  message: spec('message',{text:{value:'60 100'}},[[C,'trigger']],[[C,'stored message']],'Bang or one to three literal numbers. Click to emit; edit text in the inspector.'),
  number: spec('number',{value:number(0,-100000,100000)},[[C,'hot: store + emit'],[C,'cold: store']],[[C,'value']],'Editing the value sends its own hot inlet, so connected objects receive it.'),
  toggle: spec('toggle',{value:number(0,0,1,true)},[[C,'bang toggles; scalar sets']],[[C,'0 / 1']],'Native state. Structural edits and Stop reset it off.'),
  add: spec('+',{rhs:number(0,-100000,100000)},[[C,'hot: value / bang'],[C,'cold: right operand']],[[C,'sum']],'Hot inlet emits left + right. Cold inlet changes the right operand.'),
  multiply: spec('×',{rhs:number(1,-100000,100000)},[[C,'hot: value / bang'],[C,'cold: right operand']],[[C,'product']],'Hot inlet emits left × right.'),
  metro: spec('metro',{interval:number(150,20,2000)},[[C,'on / off; bang once'],[C,'interval ms']],[[C,'bang']],'Native audio-timeline clock. Interval is in milliseconds; no browser clock.'),
  counter: spec('counter',{steps:number(8,1,32,true)},[[C,'advance'],[C,'reset index']],[[C,'index']],'Emits the current index, then advances modulo steps.'),
  chord: spec('chord',{root:number(48,0,127,true),shape:number(0,0,2,true)},[[C,'index'],[C,'root']],[[C,'pitch']],'Triad stair: 0 major, 1 minor, 2 sus4. Repeats one octave higher every third step.'),
  makenote: spec('makenote',{velocity:number(100,1,127,true),duration:number(150,10,2000)},[[C,'pitch'],[C,'velocity'],[C,'duration ms']],[[C,'pitch, velocity']],'Native note-on and delayed note-off. Duration is milliseconds.'),
  midiin: spec('midiin',{channel:number(2,1,16,true)},[],[[C,'pitch, velocity']],'Physical MIDI is deferred on the Rust CPAL output path. The legacy JACK diagnostic supports channel-filtered note pairs.'),
  voice: spec('voice~',{device:number(0,0,1,true),attack:number(8,0,127,true),release:number(28,0,127,true)},[[C,'pitch, velocity'],[C,'attack'],[C,'release']],[[M,'mono voice']],'A/B sine / ASR voices. Attack: raw × 4 ms; release: raw × 8 ms; raw 0 = 16 frames.'),
  gain: spec('gain~',{value:number(90,0,127,true)},[[M,'mono audio'],[C,'level']],[[M,'mono audio']],'Live level, raw 0–127, not decibels.'),
  join: spec('join~',{},[[M,'left / channel 0'],[M,'right / channel 1']],[[S,'stereo bundle']],'Explicit two-channel bundle. Missing inputs are silence; one source may feed both.'),
  dac: spec('dac~',{},[[S,'stereo bundle']],[],'Maps the explicit bundle to left and right on the configured Rust audio output.'),
});
const copy = value => JSON.parse(JSON.stringify(value));
const fail = message => { throw Error(message); };
function fields(value, allowed, context, required=true) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${context} must be an object.`);
  for(const key of Object.keys(value)) if(!allowed.includes(key)) fail(`Unknown ${context} field: ${key}.`);
  for(const key of required?allowed:[]) if(!(key in value)) fail(`Missing ${context} field: ${key}.`);
}
function numeric(value,min,max,integer,context) {
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value))) fail(`${context} must be ${integer?'an integer':'a finite number'} from ${min} to ${max}.`);
}
export function parseMessage(text) {
  if(typeof text!=='string'||text.length>128) fail('Message must contain at most 128 characters.');
  const trimmed=text.trim(); if(trimmed==='bang') return null;
  const words=trimmed.split(/\s+/);
  if(!trimmed||words.length>3||words.some(x=>!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(x))) fail('Message supports bang or one to three literal numbers only.');
  const values=words.map(Number); values.forEach(x=>numeric(x,-100000,100000,false,'Message value')); return values;
}
export function validatePatch(input) {
  fields(input,['version','profile','nodes','edges'],'patch');
  if(input.version!==1||input.profile!=='ultra-canvas-v1') fail('Expected version 1, profile ultra-canvas-v1.');
  if(!Array.isArray(input.nodes)||input.nodes.length>32) fail('A patch supports at most 32 objects.');
  if(!Array.isArray(input.edges)||input.edges.length>64) fail('A patch supports at most 64 cables.');
  const nodes=new Map(), devices=new Set(), singleton=new Set();
  for(let node of input.nodes) {
    fields(node,['id','type','x','y','params'],'node'); numeric(node.id,1,4294967295,true,'Node ID');
    if(nodes.has(node.id)) fail('Duplicate node ID.');
    const s=Object.hasOwn(REGISTRY,node.type)?REGISTRY[node.type]:null; if(!s) fail(`Unknown object type: ${node.type}.`);
    numeric(node.x,0,4000,false,'X position'); numeric(node.y,0,4000,false,'Y position');
    fields(node.params,Object.keys(s.params),`${node.type} parameters`,false);
    node={...node,params:{...Object.fromEntries(Object.entries(s.params).map(([key,p])=>[key,p.value])),...node.params}};
    for(const [key,p] of Object.entries(s.params)) {
      if(key==='text') parseMessage(node.params[key]); else numeric(node.params[key],p.min,p.max,p.integer,`${node.type}.${key}`);
    }
    if(node.type==='voice') { if(devices.has(node.params.device)) fail('Only one voice per logical device is supported.'); devices.add(node.params.device); }
    if(['join','dac'].includes(node.type)) { if(singleton.has(node.type)) fail(`Only one ${node.type} is supported.`); singleton.add(node.type); }
    nodes.set(node.id,node);
  }
  const duplicates=new Set(), audioInputs=new Set(), voiceTargets=new Map(), adjacency=new Map();
  for(const edge of input.edges) {
    fields(edge,['from','outlet','to','inlet'],'edge');
    const from=nodes.get(edge.from),to=nodes.get(edge.to); if(!from||!to) fail('Cable references a missing object.');
    numeric(edge.outlet,0,REGISTRY[from.type].outlets.length-1,true,'Outlet index');
    numeric(edge.inlet,0,REGISTRY[to.type].inlets.length-1,true,'Inlet index');
    const kind=REGISTRY[from.type].outlets[edge.outlet].type;
    if(kind!==REGISTRY[to.type].inlets[edge.inlet].type) fail('Port type mismatch: control, mono and stereo are distinct.');
    const key=`${edge.from}:${edge.outlet}>${edge.to}:${edge.inlet}`; if(duplicates.has(key)) fail('Duplicate cable.'); duplicates.add(key);
    if(kind===C) { if(!adjacency.has(edge.from)) adjacency.set(edge.from,[]); adjacency.get(edge.from).push(edge.to); }
    else {
      const dest=`${edge.to}:${edge.inlet}`; if(audioInputs.has(dest)) fail('An audio inlet accepts only one source.'); audioInputs.add(dest);
      if(![['voice','gain'],['gain','join'],['join','dac']].some(([a,b])=>from.type===a&&to.type===b)) fail('Supported audio paths are voice → gain → join → dac.');
      if(from.type==='voice') {
        if(voiceTargets.has(from.id)&&voiceTargets.get(from.id)!==to.id) fail('Parallel gain paths are unsupported.'); voiceTargets.set(from.id,to.id);
      }
    }
  }
  const visiting=new Set(),visited=new Set();
  function visit(id) { if(visiting.has(id)) fail('Control cycles are unsupported.'); if(visited.has(id))return; visiting.add(id); for(const child of adjacency.get(id)||[]) visit(child); visiting.delete(id); visited.add(id); }
  for(const id of nodes.keys()) visit(id);
  if(new TextEncoder().encode(JSON.stringify(input)).length>65536) fail('Patch exceeds 64 KiB.');
  return copy({...input,nodes:[...nodes.values()]});
}
export function parsePatch(text) {
  if(typeof text!=='string'||new TextEncoder().encode(text).length>65536) fail('Patch exceeds 64 KiB.');
  let patch; try{patch=JSON.parse(text);}catch{fail('Patch is not valid JSON.');} return validatePatch(patch);
}
export const serializePatch = patch => JSON.stringify(validatePatch(patch),null,2);
export function makeNode(type,id,x=40,y=40,params={}) {
  if(!REGISTRY[type]) fail(`Unknown object type: ${type}.`);
  return {id,type,x,y,params:{...Object.fromEntries(Object.entries(REGISTRY[type].params).map(([key,p])=>[key,p.value])),...params}};
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
  constructor(patch=starterPatch()) { this.patch=validatePatch(patch); this.past=[];this.future=[];this.nextId=Math.max(0,...this.patch.nodes.map(n=>n.id))+1; }
  edit(fn,{history=true}={}) {
    const next=copy(this.patch); fn(next); const validated=validatePatch(next);
    if(JSON.stringify(validated)===JSON.stringify(this.patch)) return false;
    if(history) {this.past.push(copy(this.patch));if(this.past.length>100)this.past.shift();this.future=[];}
    this.patch=validated; this.nextId=Math.max(this.nextId,...validated.nodes.map(n=>n.id+1)); return true;
  }
  add(type,x=40,y=40,params={}) {
    const id=this.nextId;params={...params};
    if(type==='voice'&&!Object.hasOwn(params,'device')) params.device=this.patch.nodes.some(n=>n.type==='voice'&&n.params.device===0)?1:0;
    this.edit(p=>p.nodes.push(makeNode(type,id,x,y,params)));return id;
  }
  configure(id,type,params) { return this.edit(p=>{const i=p.nodes.findIndex(n=>n.id===id);if(i<0)fail('Missing object.');const old=p.nodes[i];p.nodes[i]=makeNode(type,id,old.x,old.y,params);}); }
  remove(id) { return this.edit(p=>{p.nodes=p.nodes.filter(n=>n.id!==id);p.edges=p.edges.filter(e=>e.from!==id&&e.to!==id);}); }
  removeMany(ids) {const set=new Set(ids);return this.edit(p=>{p.nodes=p.nodes.filter(n=>!set.has(n.id));p.edges=p.edges.filter(e=>!set.has(e.from)&&!set.has(e.to));});}
  connect(from,outlet,to,inlet) { return this.edit(p=>p.edges.push({from,outlet,to,inlet})); }
  disconnect(index) { return this.edit(p=>p.edges.splice(index,1)); }
  move(id,x,y,options) {return this.edit(p=>{const n=p.nodes.find(n=>n.id===id);if(!n)fail('Missing object.');n.x=x;n.y=y;},options);}
  moveMany(positions) {return this.edit(p=>{for(const {id,x,y} of positions){const n=p.nodes.find(n=>n.id===id);if(!n)fail('Missing object.');n.x=x;n.y=y;}});}
  parameter(id,key,value,options) { return this.edit(p=>{const n=p.nodes.find(n=>n.id===id);if(!n)fail('Missing object.');n.params[key]=value;},options); }
  replace(patch) { const valid=validatePatch(patch);return this.edit(p=>Object.assign(p,valid)); }
  undo() { if(!this.past.length)return false;this.future.push(copy(this.patch));this.patch=this.past.pop();return true; }
  redo() { if(!this.future.length)return false;this.past.push(copy(this.patch));this.patch=this.future.pop();return true; }
}

export function createCanvasController({invoke,patch=starterPatch(),onState=()=>{}}={}) {
  const document=new CanvasDocument(patch),native=typeof invoke==='function';
  let revision=null,desired=1,applied=0,applyTask=null,paramTask=null,eventTask=null,operation=null;
  let status={},observations={},notice=native?'Preparing native patch…':'Browser preview: native execution is unavailable.',faulted=false,panicked=false,disposed=false,actionEpoch=0;
  let pendingParams=new Map(),events=[],pollTask=null,stopTask=null,stopping=false,lifecycle=0;
  const getState=()=>({patch:copy(document.patch),native,revision,desiredRevision:desired,activeDocumentRevision:applied,status:{...status},observations:copy(observations),notice,faulted:faulted||panicked,
    busy:!!operation,applying:!!applyTask,ready:native&&applied===desired&&!!status.running&&!status.fault&&!status.server_lost&&!faulted&&!panicked&&!operation&&!stopping&&!disposed,canUndo:!!document.past.length,canRedo:!!document.future.length});
  const emit=()=>onState(getState());
  const report=error=>{notice=String(error?.message||error);emit();};
  const resetRuntime=()=>{observations={};actionEpoch++;events=[];};
  function structural(fn) {
    const result=fn(); desired++;pendingParams.clear();resetRuntime();faulted=false;
    notice=native?'Applying graph. Structural edits stop timers and notes.':'Preview edited. Native execution is unavailable.';emit();ensureApply();return result;
  }
  function ensureApply() {
    if(!native||disposed)return Promise.resolve(false);if(applyTask)return applyTask;
    if(applied===desired)return Promise.resolve(true);
    applyTask=(async()=>{
      while(applied!==desired&&!disposed) {
        const epoch=desired,snapshot=copy(document.patch);
        try {
          const result=await invoke('canvas_apply',{patch:snapshot});
          if(!Number.isSafeInteger(result?.revision)||result.revision<1)throw Error('Native apply returned an invalid revision.');
          revision=result.revision;applied=epoch;resetRuntime();
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
          if(entry.hot&&!stopping&&entry.epoch===actionEpoch&&status.running&&r===revision&&epoch===actionEpoch&&!applyTask) await invoke('canvas_event',{revision:r,node:entry.id,inlet:0,value:[entry.value]});
        } catch(error) {if(r===revision&&epoch===actionEpoch){faulted=true;report(`Parameter not applied: ${error?.message||error}. Stop and reapply the graph to recover.`);}}
      }
    })().finally(()=>{paramTask=null;emit();});return paramTask;
  }
  function parameter(id,key,value,{history=true}={}) {
    const node=document.patch.nodes.find(n=>n.id===id);if(!node)fail('Missing object.');
    if(key==='text'||(node.type==='midiin'&&key==='channel')||(node.type==='voice'&&key==='device'))return structural(()=>document.parameter(id,key,value,{history}));
    document.parameter(id,key,value,{history});
    if(native)pendingParams.set(`${id}/${key}`,{id,key,value,epoch:actionEpoch,hot:['number','toggle'].includes(node.type)&&key==='value'});
    emit();return pumpParams();
  }
  function pumpEvents() {
    if(eventTask)return eventTask;
    eventTask=(async()=>{
      while(events.length) {
        const event=events.shift();if(event.epoch!==actionEpoch||!getState().ready)continue;
        try{await invoke('canvas_event',{revision:event.revision,node:event.node,inlet:event.inlet,value:event.value});}
        catch(error){if(event.epoch===actionEpoch){faulted=true;report(`Native event rejected: ${error?.message||error}. Stop and reapply to recover.`);}}
      }
    })().finally(()=>{eventTask=null;emit();});return eventTask;
  }
  function event(node,inlet=0,value=null) {
    if(!getState().ready){notice=native?'Wait for the current graph and start audio before sending events.':'Browser preview: native execution is unavailable.';emit();return Promise.resolve(false);}
    const n=document.patch.nodes.find(x=>x.id===node);if(!n||REGISTRY[n.type].inlets[inlet]?.type!==C)fail('Events require a control inlet.');
    if(value!==null){if(!Array.isArray(value)||value.length<1||value.length>3)fail('Events contain one to three numbers.');value.forEach(v=>numeric(v,-100000,100000,false,'Event value'));}
    if(events.length>=64){faulted=true;return stop('Event queue overflow. Native timers and notes stopped; reapply before playing.');}
    events.push({node,inlet,value,revision,epoch:actionEpoch});return pumpEvents();
  }
  async function poll() {
    if(!native||disposed)return;if(pollTask)return pollTask;
    pollTask=(async()=>{
      try {
        const epoch=actionEpoch;const [audio,graph]=await Promise.all([invoke('audio_status'),invoke('canvas_status')]);
        status=audio||{};
        if(epoch===actionEpoch&&graph?.revision===revision&&applied===desired&&!applyTask) {
          observations=Object.fromEntries((graph.nodes||[]).filter(n=>document.patch.nodes.some(x=>x.id===n.id)).map(n=>[n.id,{value:n.value,pulses:n.pulses}]));
          if(graph.active===false){faulted=true;notice='Native canvas profile is no longer active. Reapply before playing.';}
        }
        if(status.fault||status.server_lost){faulted=true;notice=`Native audio fault: ${status.message||'backend unavailable'}. Stop audio, then start again.`;}
        emit();
      } catch(error){report(`Native status unavailable: ${error?.message||error}`);}
    })().finally(()=>{pollTask=null;});return pollTask;
  }
  function stop(message='Timers and notes stopped.') {
    resetRuntime();
    if(!native){notice='Browser preview: native execution is unavailable.';emit();return Promise.resolve();}
    if(stopTask)return stopTask;
    stopping=true;emit();
    const pending=[eventTask,paramTask,applyTask].filter(Boolean);
    stopTask=(async()=>{
      try {
        await invoke('canvas_stop');
        // A previously submitted command may still be completing. The final stop cannot be overtaken by that command.
        if(pending.length){await Promise.all(pending);await invoke('canvas_stop');}
        observations={};notice=message;
      }catch(error){faulted=true;notice=`Stop failed: ${error?.message||error}`;}
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
        await invoke('canvas_stop');resetRuntime();await poll();
        if(status.running&&!status.fault&&!status.server_lost&&!faulted) notice='Audio ready. Click the top-left toggle to start the patch.';
        else notice=`Audio could not start: ${status.message||started?.message||'native backend is not running'}`;
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
  const topology = p=>JSON.stringify({nodes:p.nodes.map(n=>({id:n.id,type:n.type,structural:n.type==='message'?n.params.text:n.type==='midiin'?n.params.channel:n.type==='voice'?n.params.device:null})),edges:p.edges});
  function history(direction) {
    const before=copy(document.patch);if(!document[direction]())return;
    if(topology(document.patch)!==topology(before))structural(()=>{});
    else {
      for(const node of document.patch.nodes){
        const previous=before.nodes.find(n=>n.id===node.id);
        for(const[key,value]of Object.entries(node.params))if(value!==previous.params[key])parameter(node.id,key,value,{history:false});
      }
      emit();
    }
  }
  async function dispose(){const stopped=await stopAudio();if(stopped===false)throw Error('Native audio cleanup failed. Stay on this page and try Stop audio again.');disposed=true;}
  return {getState,prepare:ensureApply,startAudio,stopAudio,stop,panic,poll,flush,dispose,event,parameter,
    add:(...args)=>structural(()=>document.add(...args)),configure:(...args)=>structural(()=>document.configure(...args)),remove:id=>structural(()=>document.remove(id)),removeMany:ids=>structural(()=>document.removeMany(ids)),
    connect:(...args)=>structural(()=>document.connect(...args)),disconnect:i=>structural(()=>document.disconnect(i)),
    move:(...args)=>{document.move(...args);emit();},moveMany:positions=>{document.moveMany(positions);emit();},undo:()=>history('undo'),redo:()=>history('redo'),
    load:text=>structural(()=>document.replace(typeof text==='string'?parsePatch(text):text)),
    reapply:()=>structural(()=>{}),export:()=>serializePatch(document.patch),notice:report};
}
