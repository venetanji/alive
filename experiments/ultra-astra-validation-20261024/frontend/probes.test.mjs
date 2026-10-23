import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// Override only when running this bundle outside its published repository path.
const repoURL=process.env.ALIVE_VALIDATION_REPO_ROOT
  ?pathToFileURL(resolve(process.env.ALIVE_VALIDATION_REPO_ROOT)+'/')
  :new URL('../../../',import.meta.url);

// This executes the real page module with a small DOM adapter. It does not prove rendered geometry or native sound.
class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.dataset={};this.style={setProperty(key,value){this[key]=value;},removeProperty(key){delete this[key];}};this.attrs={};this.value='';this.disabled=false;this.open=false;this.hidden=false;this.textContent='';this.scrollLeft=0;this.scrollTop=0;
    const classes=new Set();this.classList={add:n=>classes.add(n),remove:n=>classes.delete(n),toggle:(n,v)=>{if(v??!classes.has(n))classes.add(n);else classes.delete(n);},contains:n=>classes.has(n)};
  }
  append(...children){this.children.push(...children);for(const c of children)if(typeof c==='object')c.parentElement=this;}
  replaceChildren(...children){this.children=[];this.append(...children);}
  setAttribute(k,v){this.attrs[k]=String(v);}
  removeAttribute(k){delete this.attrs[k];}
  addEventListener(k,f){(this.listeners[k]??=[]).push(f);}
  removeEventListener(){}
  getBoundingClientRect(){return{left:0,top:0,width:160,height:90};}
  setPointerCapture(){} releasePointerCapture(){} focus(){} select(){} click(){return this.fire('click');}
  showModal(){this.open=true;}close(){this.open=false;}
  async fire(type,extra={}){const e={type,target:this,button:0,preventDefault(){},stopPropagation(){},...extra};await Promise.all((this.listeners[type]||[]).map(f=>f(e)));}
}
const descendants=e=>e.children.filter(x=>typeof x==='object').flatMap(x=>[x,...descendants(x)]);
const settle=()=>new Promise(r=>setImmediate(r));
async function mount(native=false,{documentCurrent=null,tauri,observeInvoke=()=>{},helpReference,documentCommit,invokeOverride}={}){
  const html=readFileSync(new URL('apps/ultra/ui/canvas.html',repoURL),'utf8'),ids=new Map();
  for(const[,tag,id]of html.matchAll(/<([\w-]+)\b[^>]*\bid="([^"]+)"/g))ids.set(id,new Element(tag));
  ids.get('object-entry').hidden=true;
  const documentEvents=new Element(),windowEvents=new Element(),calls=[],timeouts=[],navigations=[],previews=[],observed={},consoleRecords=[];let revision=documentCurrent?.runtimeRevision??0,running=false,patch=documentCurrent?.patch;
  const document={querySelector:s=>{const e=ids.get(s.slice(1));assert.ok(e,`HTML must contain ${s}`);return e;},createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t),addEventListener:(...a)=>documentEvents.addEventListener(...a),hidden:false,activeElement:null};
  const popupSnapshots={value:null};
  const window={addEventListener:(...a)=>windowEvents.addEventListener(...a),setTimeout:(fn,ms)=>{timeouts.push({fn,ms});return timeouts.length;},clearTimeout(){},location:{href:'http://localhost/canvas.html',assign:href=>navigations.push(href)},open:url=>{const child={url};previews.push(child);return child;}};
  if(tauri)window.__TAURI__=tauri;
  ids.get('legacy-link').href='index.html';ids.get('lab-link').href='chord-lab.html';
  let invoke=native?async(name,args={})=>{calls.push({name,args});observeInvoke(name,args);if(name==='document_commit'&&documentCommit)return documentCommit(args);if(name==='help_reference')return helpReference?.(args.name);if(name==='document_current')return documentCurrent;if(name==='document_list')return[{id:1,label:'main',title:'First.ultra',kind:'patch'},{id:2,label:'patch-2',title:'Second.ultra',kind:'patch'}];if(name==='document_save')return{id:1,title:'Saved.ultra',kind:'patch'};if(name==='audio_devices')return{config:{host:'default',device:'default',sample_rate:48000,buffer_frames:null},hosts:['PipeWire'],effective_host:'PipeWire',devices:[{id:'default',name:'System default - Speakers',compatible:true}],notice:'Audio is off.'};if(name==='canvas_apply'){patch=args.patch;return{revision:++revision};}if(name==='audio_start')running=true;if(name==='audio_stop')running=false;if(name==='audio_status')return{running};if(name==='canvas_status')return{revision,active:true,nodes:patch.nodes.map(n=>({id:n.id,value:0,pulses:0,...observed[n.id]})),console:consoleRecords.splice(0),print_popups:popupSnapshots.value};return true;}:undefined;
  const fallbackInvoke=invoke; if(invokeOverride)invoke=(name,args)=>invokeOverride(name,args,fallbackInvoke);
  const {mountCanvas}=await import(new URL('apps/ultra/ui/canvas.mjs',repoURL));const page=mountCanvas({document,window,invoke});await page.ready;await page.controller.flush();await settle();
  return{...page,ids,calls,timeouts,navigations,previews,observed,consoleRecords,popupSnapshots,windowEvents,documentEvents,document,all:id=>descendants(ids.get(id))};
}

const {CanvasDocument, makeNode, validatePatch}=await import(new URL('apps/ultra/ui/canvas-model.mjs',repoURL));
const {lowerHierarchy}=await import(new URL('apps/ultra/ui/canvas-hierarchy.mjs',repoURL));
const {createSharedCanvasController}=await import(new URL('apps/ultra/ui/canvas-shared.mjs',repoURL));

const clone = value => structuredClone(value);
const tick = () => new Promise(resolve=>setImmediate(resolve));
const initial = () => ({version:2,profile:'ultra-patcher-v2',nodes:[
  makeNode('number',1),makeNode('number',2),
  {...makeNode('patcher',3),patcher:{nodes:[makeNode('number',4)],edges:[]}},
],edges:[]});

// This service owns the tree/history. Each controller gets only an IPC view of it.
function nativeService(start=initial()) {
  let patch=clone(start),authoringRevision=1,runtimeRevision=10,installed=false;
  const calls=[],past=[],future=[],listeners=new Map(),cursors=new Map(),records=[],hotEvents=[];
  const live=new Map([[1,0],[2,0],[4,92]]);
  let block=null,failAdmission=false;
  const descriptor=label=>({shared:true,label,ownerLabel:'owner',id:1,title:'Shared',
    viewTitle:label,viewPath:label==='child'?[3]:[],patch:clone(patch),
    authoringRevision,runtimeRevision,canUndo:past.length>0,canRedo:future.length>0});
  const broadcast=()=>{for(const [label,listener] of listeners)listener(descriptor(label));};
  return {
    calls,hotEvents,descriptor,listen:(label,listener)=>listeners.set(label,listener),
    get patch(){return clone(patch);},get revision(){return authoringRevision;},
    rejectNext(){failAdmission=true;},
    holdNextCommit(){let release;const promise=new Promise(resolve=>release=resolve);block=promise;return release;},
    log(record){records.push(record);},
    invoke:label=>async(name,args={})=>{
      calls.push({label,name,args:clone(args)});
      if(name==='document_current'){if(!installed){installed=true;calls.push({name:'install'});}return descriptor(label);}
      if(name==='document_commit'){
        if(block){const pending=block;block=null;await pending;}
        if(args.baseRevision!==authoringRevision)return {accepted:false,document:descriptor(label)};
        const next=validatePatch(args.patch);
        if(failAdmission){failAdmission=false;throw Error('native admission refused');}
        if(args.parameter){
          live.set(args.parameter.node,args.parameter.value);
          if(args.parameter.hot)hotEvents.push(clone(args.parameter));
        }
        if(JSON.stringify(next)===JSON.stringify(patch))return {accepted:true,document:descriptor(label)};
        if(args.history!==false){past.push(clone(patch));future.length=0;}
        const before=new CanvasDocument(patch),after=new CanvasDocument(next);
        const executable=p=>{const graph=lowerHierarchy(p);return JSON.stringify({nodes:graph.nodes.map(({id,type,params})=>({id,type,params})),edges:graph.edges});};
        if(executable(before.document)!==executable(after.document)&&!args.parameter)runtimeRevision++;
        patch=next;authoringRevision++;broadcast();return {accepted:true,document:descriptor(label)};
      }
      if(name==='document_history'){
        if(args.baseRevision!==authoringRevision)return {accepted:false,document:descriptor(label)};
        const from=args.direction==='undo'?past:future,to=args.direction==='undo'?future:past;
        if(from.length){to.push(clone(patch));patch=from.pop();authoringRevision++;runtimeRevision++;broadcast();}
        return {accepted:true,document:descriptor(label)};
      }
      if(name==='audio_status')return {running:false};
      if(name==='canvas_status'){
        const offset=cursors.get(label)||0;cursors.set(label,records.length);
        return {revision:runtimeRevision,active:true,nodes:[...live].map(([id,value])=>({id,value,pulses:2})),console:clone(records.slice(offset)),console_dropped:0};
      }
      if(name==='canvas_event'&&Array.isArray(args.value))live.set(args.node,args.value[0]);
      if(['canvas_apply','canvas_param'].includes(name))throw Error(`Forbidden shared operation ${name}`);
      return true;
    },
  };
}
async function views({broadcast=false,patch}={}) {
  const host=nativeService(patch);
  const owner=createSharedCanvasController({invoke:host.invoke('owner')});
  const child=createSharedCanvasController({invoke:host.invoke('child')});
  if(broadcast){host.listen('owner',owner.acceptDescriptor);host.listen('child',child.acceptDescriptor);}
  await owner.prepare();await child.prepare();return {host,owner,child};
}

async function mountedShared() {
  const host=nativeService();const native=host.invoke('owner');let releaseHistory,held=false;
  const p=await mount(true,{documentCurrent:host.descriptor('owner'),invokeOverride:async(name,args,fallback)=>{
    if(name==='document_history'&&held)await new Promise(resolve=>releaseHistory=resolve);
    if(['document_current','document_commit','document_history','canvas_status','audio_status','canvas_event','canvas_stop','audio_panic'].includes(name))return native(name,args);
    return fallback(name,args);
  }});
  p.controller.parameter(1,'value',20);await p.controller.flush();
  return {...p,host,async holdHistory(direction='undo'){held=true;const promise=p.controller[direction]();await settle();return{promise,release:()=>{held=false;releaseHistory();}};}};
}
test('probe: numeric input rejected by history remains retryable',async()=>{
  const p=await mountedShared();const h=await p.holdHistory();
  await p.ids.get('lock-patch').fire('click');
  const input=descendants(p.all('objects').find(e=>e.dataset.node==='1')).find(e=>e.dataset.parameter==='value');
  p.document.activeElement=input;input.value='73';await input.fire('input');await input.fire('keydown',{key:'Enter'});
  assert.match(p.controller.getState().notice,/history.*pending/i);
  assert.equal(input.value,'73','Focused typed value remains visible');
  h.release();await h.promise;
  await input.fire('keydown',{key:'Enter'});await p.controller.flush();
  assert.equal(p.host.patch.nodes[0].params.value,73,'Retrying Enter after admission must save the typed value');
  await p.dispose();
});
test('probe: drag during history fails without uncaught error and restores preview',async()=>{
  const p=await mountedShared();const h=await p.holdHistory();
  const node=p.all('objects').find(e=>e.dataset.node==='1'),header=descendants(node).find(e=>e.dataset.drag==='true');
  const before=p.controller.getState().patch.nodes.find(n=>n.id===1);
  await header.fire('pointerdown',{pointerId:1,clientX:10,clientY:10});
  await header.fire('pointermove',{pointerId:1,clientX:60,clientY:50});
  assert.equal(node.style.left,`${before.x+50}px`);
  await assert.doesNotReject(header.fire('pointerup',{pointerId:1,clientX:60,clientY:50}),'History barrier must be handled by the drag UI');
  assert.equal(node.style.left,`${before.x}px`,'Rejected movement must restore preview');
  h.release();await h.promise;await p.dispose();
});
test('probe: object entry retains typed work across history rejection',async()=>{
  const p=await mountedShared();const h=await p.holdHistory();
  await p.ids.get('add-object').fire('click');const input=p.ids.get('object-text');input.value='print retained';await input.fire('input');
  await input.fire('keydown',{key:'Enter'});
  assert.equal(p.ids.get('object-entry').hidden,false);assert.equal(input.value,'print retained');
  assert.match(p.ids.get('object-error').textContent,/history.*pending/i);
  h.release();await h.promise;
  await input.fire('keydown',{key:'Enter'});await p.controller.flush();
  assert.equal(p.ids.get('object-entry').hidden,true);assert.ok(p.host.patch.nodes.some(n=>n.type==='print'&&n.params.label==='retained'));
  await p.dispose();
});
test('probe: history barrier rejects every authoring method atomically then admits after Undo and Redo',async()=>{
  for(const direction of ['undo','redo']){
    const {host,owner}=await views();owner.parameter(1,'value',20);await owner.flush();if(direction==='redo')await owner.undo();
    let release;const native=host.invoke('owner');const c=createSharedCanvasController({invoke:async(name,args)=>{
      if(name==='document_history')await new Promise(resolve=>release=resolve);return native(name,args);
    }});await c.prepare();const pending=c[direction]();await tick();
    const before=c.export();
    for(const action of [()=>c.add('number',10,20),()=>c.configure(1,'number',{value:23}),()=>c.remove(1),()=>c.removeMany([1,2]),()=>c.connect(1,0,2,0),()=>c.move(1,55,66),()=>c.moveMany([{id:1,x:55,y:66}]),()=>c.resize(1,{width:80,height:30}),()=>c.style(1,{fontsize:14}),()=>c.parameter(1,'value',33),()=>c.load(initial())]) {
      assert.throws(action,/history.*pending/i);assert.equal(c.export(),before);
    }
    release();await pending;c.parameter(1,'value',33);await c.flush();assert.equal(host.patch.nodes[0].params.value,33);await c.dispose();
  }
});
test('probe: admitted event survives later deletion but Stop and Panic invalidate it',async()=>{
  for(const safety of [null,'stop','panic']){
    const {host,child}=await views();const release=host.holdNextCommit();child.move(4,120,130);await tick();
    const pending=child.event(4,0,[17]);child.remove(4);const safe=safety?child[safety]():null;
    release();assert.equal(await pending,!safety);if(safe)await safe;await child.flush();
    assert.equal(host.calls.filter(c=>c.name==='canvas_event').length,safety?0:1);
    if(safety){const names=host.calls.map(c=>c.name);assert.ok(names.indexOf(safety==='stop'?'canvas_stop':'audio_panic')<names.lastIndexOf('document_commit'));}
    assert.equal(host.patch.nodes[2].patcher.nodes.length,0);
  }
});
test('probe: stopped status cache invalidates for hierarchy document switching and reuses thereafter',async()=>{
  const p=await mount(true),svg=p.ids.get('cables');let rebuilds=0;const replace=svg.replaceChildren.bind(svg);svg.replaceChildren=(...children)=>{rebuilds++;replace(...children);};
  for(let i=0;i<10;i++)await p.controller.poll();assert.equal(rebuilds,0);
  p.controller.load(initial());await p.controller.flush();const changed=rebuilds;assert.ok(changed>0);
  for(let i=0;i<10;i++)await p.controller.poll();assert.equal(rebuilds,changed);
  p.controller.enter(3);assert.ok(rebuilds>changed);const entered=rebuilds;
  for(let i=0;i<10;i++)await p.controller.poll();assert.equal(rebuilds,entered);
  p.controller.leave();assert.ok(rebuilds>entered);await p.dispose();
});
