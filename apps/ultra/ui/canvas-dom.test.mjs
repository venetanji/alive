import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {OBJECTS} from './canvas-catalog.mjs';
import {CanvasDocument,makeNode} from './canvas-model.mjs';
import {subtractivePatch} from './canvas-instrument.mjs';

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
const helpPatch=()=>JSON.parse(readFileSync(new URL('../tests/fixtures/help-shell-schema.json',import.meta.url),'utf8'))[0].patch;
const reference=(name='append')=>({status:'available',object:name,sourceSha256:'a'.repeat(64),digest:'Original <digest>',description:'Synthetic description.\nSecond paragraph.',
  arguments:[{name:'tail',type:'anything',optional:true,description:'Synthetic argument.'}],methods:[{name:'bang',description:'Synthetic method.'}],inlets:[],outlets:[],related:[{name:'pack',available:true},{name:'outside',available:false}]});
async function mount(native=false,{documentCurrent=null,tauri,observeInvoke=()=>{},helpReference,documentCommit,audioStatus={},invokeOverride}={}){
  const html=readFileSync(new URL('./canvas.html',import.meta.url),'utf8'),ids=new Map();
  for(const[,tag,id]of html.matchAll(/<([\w-]+)\b[^>]*\bid="([^"]+)"/g))ids.set(id,new Element(tag));
  ids.get('object-entry').hidden=true;
  const documentEvents=new Element(),windowEvents=new Element(),calls=[],timeouts=[],navigations=[],previews=[],observed={},consoleRecords=[];let revision=documentCurrent?.runtimeRevision??0,running=false,patch=documentCurrent?.patch;
  const document={querySelector:s=>{const e=ids.get(s.slice(1));assert.ok(e,`HTML must contain ${s}`);return e;},createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t),addEventListener:(...a)=>documentEvents.addEventListener(...a),hidden:false,activeElement:null};
  const popupSnapshots={value:null};
  const window={addEventListener:(...a)=>windowEvents.addEventListener(...a),setTimeout:(fn,ms)=>{timeouts.push({fn,ms});return timeouts.length;},clearTimeout(){},location:{href:'http://localhost/canvas.html',assign:href=>navigations.push(href)},open:url=>{const child={url};previews.push(child);return child;}};
  if(tauri)window.__TAURI__=tauri;
  ids.get('legacy-link').href='index.html';ids.get('lab-link').href='chord-lab.html';
  let invoke=native?async(name,args={})=>{calls.push({name,args});observeInvoke(name,args);if(name==='document_commit'&&documentCommit)return documentCommit(args);if(name==='help_reference')return helpReference?.(args.name);if(name==='document_current')return documentCurrent;if(name==='document_list')return[{id:1,label:'main',title:'First.ultra',kind:'patch'},{id:2,label:'patch-2',title:'Second.ultra',kind:'patch'}];if(name==='document_save')return{id:1,title:'Saved.ultra',kind:'patch'};if(name==='audio_devices')return{config:{host:'default',device:'default',sample_rate:48000,buffer_frames:null},hosts:['PipeWire'],effective_host:'PipeWire',devices:[{id:'default',name:'System default - Speakers',compatible:true}],notice:'Audio is off.'};if(name==='canvas_apply'){patch=args.patch;return{revision:++revision};}if(name==='audio_start')running=true;if(name==='audio_stop')running=false;if(name==='audio_status')return{running,...audioStatus};if(name==='canvas_status')return{revision,active:true,nodes:patch.nodes.map(n=>({id:n.id,value:0,pulses:0,...observed[n.id]})),console:consoleRecords.splice(0),print_popups:popupSnapshots.value};return true;}:undefined;
  const fallbackInvoke=invoke;if(invokeOverride)invoke=(name,args)=>invokeOverride(name,args,fallbackInvoke);
  const {mountCanvas}=await import('./canvas.mjs');const page=mountCanvas({document,window,invoke});await page.ready;await page.controller.flush();await settle();
  return{...page,ids,calls,timeouts,navigations,previews,observed,consoleRecords,popupSnapshots,windowEvents,documentEvents,document,all:id=>descendants(ids.get(id))};
}
test('Perform renames a device without replacing authored controls or presets',async()=>{
  const p=await mount(true),patch=subtractivePatch();
  patch.device.parameters[4]={...patch.device.parameters[4],key:'tone',label:'Tone',min:100,max:9000};
  for(const preset of patch.device.presets){preset.values.tone=preset.values.cutoff;delete preset.values.cutoff;}
  p.controller.load(patch);await p.controller.flush();await p.ids.get('show-instrument').fire('click');
  p.ids.get('instrument-name').value='Renamed';await p.ids.get('instrument-package').fire('click');
  const after=p.controller.getState().document;
  assert.equal(after.device.name,'Renamed');assert.deepEqual(after.device.parameters,patch.device.parameters);assert.deepEqual(after.device.presets,patch.device.presets);
  assert.ok(p.all('instrument-controls').some(e=>e.attrs['aria-label']==='Tone'));
  await p.dispose();
});
test('effect panel exposes live parameters and presets without a keyboard claim',async()=>{
  const p=await mount(true);
  const patch={version:1,profile:'ultra-canvas-v1',presentation:{version:1,openOnLoad:false,size:{width:160,height:120},items:[]},nodes:[makeNode('audio_in',1),makeNode('line_signal',2,0,0,{value:1})],edges:[],
    device:{version:2,kind:'audioEffect',id:'org.alive.test.utility',name:'Utility',midi:{input:null,output:null},
      audio:{input:{node:1,bundle:{channels:2,layout:'stereo'}},output:{channels:2,layout:'stereo'}},
      parameters:[{key:'gain',label:'Gain',node:2,param:'value',min:0,max:2}],presets:[{name:'Quiet',values:{gain:.25}}]}};
  p.controller.load(patch);await p.controller.flush();await p.ids.get('show-instrument').fire('click');
  assert.equal(p.ids.get('instrument-title').textContent,'Utility');
  assert.equal(p.ids.get('instrument-keyboard').hidden,true);
  assert.equal(p.ids.get('instrument-release').hidden,true);
  assert.match(p.ids.get('instrument-keyboard-note').textContent,/host.*audio/i);
  p.ids.get('instrument-name').value='Renamed effect';await p.ids.get('instrument-package').fire('click');
  assert.deepEqual(p.controller.getState().document.device,{...patch.device,name:'Renamed effect'});
  const control=p.all('instrument-controls').find(e=>e.tagName==='INPUT'&&e.type==='number');
  control.value='0.5';await control.fire('change');await p.controller.flush();
  assert.equal(p.controller.getState().document.nodes.find(n=>n.id===2).params.value,.5);
  p.ids.get('instrument-preset').value='Quiet';await p.ids.get('instrument-recall').fire('click');
  assert.equal(p.controller.getState().document.nodes.find(n=>n.id===2).params.value,.25);
  const instrument=structuredClone(patch);instrument.nodes[0]=makeNode('poly_note',1);
  instrument.device.kind='instrument';instrument.device.midi.input={node:1,inlet:0};instrument.device.audio.input=null;
  p.controller.load(instrument);await p.controller.flush();await p.controller.startAudio();
  assert.equal(p.ids.get('instrument-keyboard').hidden,false);
  const key=p.all('instrument-keyboard').find(e=>e.dataset.note==='60');await key.fire('pointerdown',{pointerId:1});
  assert.ok(p.calls.some(c=>c.name==='canvas_event'&&c.args.node===1&&c.args.inlet===0));
  await p.dispose();
});
test('saving a focused Perform value commits it before the snapshot',async()=>{
  const p=await mount(true);
  const patch={version:1,profile:'ultra-canvas-v1',presentation:{version:1,openOnLoad:false,size:{width:160,height:120},items:[]},nodes:[makeNode('audio_in',1),makeNode('line_signal',2,0,0,{value:1})],edges:[],
    device:{version:2,kind:'audioEffect',id:'org.alive.test.utility',name:'Utility',midi:{input:null,output:null},
      audio:{input:{node:1,bundle:{channels:2,layout:'stereo'}},output:{channels:2,layout:'stereo'}},
      parameters:[{key:'gain',label:'Gain',node:2,param:'value',min:0,max:2}],presets:[]}};
  p.controller.load(patch);await p.controller.flush();await p.ids.get('show-instrument').fire('click');
  const input=p.all('instrument-controls').find(e=>e.type==='number');p.document.activeElement=input;
  input.value='0.5';await input.fire('input');await p.documents.action('save');
  assert.equal(p.calls.filter(c=>c.name==='document_save').at(-1).args.patch.nodes.find(n=>n.id===2).params.value,.5);
  await p.dispose();
});
test('rebuilding Perform controls captures their focused value',async()=>{
  const p=await mount(true);
  const patch={version:1,profile:'ultra-canvas-v1',presentation:{version:1,openOnLoad:false,size:{width:160,height:120},items:[]},nodes:[makeNode('audio_in',1),makeNode('line_signal',2,0,0,{value:1})],edges:[],
    device:{version:2,kind:'audioEffect',id:'org.alive.test.utility',name:'Utility',midi:{input:null,output:null},
      audio:{input:{node:1,bundle:{channels:2,layout:'stereo'}},output:{channels:2,layout:'stereo'}},
      parameters:[{key:'gain',label:'Gain',node:2,param:'value',min:0,max:2}],presets:[]}};
  p.controller.load(patch);await p.controller.flush();await p.ids.get('show-instrument').fire('click');
  const input=p.all('instrument-controls').find(e=>e.type==='number');p.document.activeElement=input;input.value='0.5';await input.fire('input');
  const changed=structuredClone(patch);changed.device.parameters[0].label='Level';p.controller.load(changed);await p.controller.flush();
  assert.equal(p.controller.getState().document.nodes.find(n=>n.id===2).params.value,.5);await p.dispose();
});
test('help shell hosts Basic while question/reference navigation preserves the native runtime',async()=>{
  const patch=helpPatch(),descriptor={shared:true,id:0,label:'main',ownerLabel:'main',title:'Help.ultra',kind:'patch',patch,dirty:false,viewPath:[],authoringRevision:1,runtimeRevision:9};
  const p=await mount(true,{documentCurrent:descriptor,helpReference:async name=>reference(name)});
  assert.deepEqual(p.controller.getState().path,[3]);
  const details=p.all('objects').find(e=>e.dataset.node==='5');
  assert.ok(details);assert.equal(descendants(details).find(e=>e.tagName==='H1').textContent,'append');
  assert.ok(descendants(details).some(e=>e.textContent==='Original <digest>'&&e.children.length===0));
  assert.equal(p.ids.get('help-basic').attrs['aria-selected'],'true');
  const before=p.calls.length,saved=p.controller.export();
  await p.ids.get('help-question').fire('click');await settle();
  assert.equal(p.ids.get('help-reference-menu').hidden,false);
  assert.deepEqual(p.controller.getState().path,[3]);
  await p.all('help-reference-menu').find(e=>e.tagName==='BUTTON'&&e.textContent==='Reference').fire('click');await settle();
  assert.equal(p.ids.get('help-reference-pane').hidden,false);
  assert.ok(p.all('help-reference-body').some(e=>e.textContent==='Synthetic method.'));
  assert.equal(p.controller.getState().revision,9);assert.equal(p.controller.export(),saved);
  assert.equal(p.calls.slice(before).some(c=>['canvas_apply','canvas_stop','canvas_event','document_open_patcher','document_commit'].includes(c.name)),false);
  p.consoleRecords.push({sequence:1,revision:9,node:8,label:'source',level:0,text:'17',frame:0});
  await p.controller.poll();await p.ids.get('show-console').fire('click');await p.ids.get('console-rows').children[0].children[0].fire('click');
  assert.equal(p.ids.get('help-reference-pane').hidden,true);
  assert.ok(p.all('objects').find(e=>e.dataset.node==='8').classList.contains('selected'));
  assert.equal(p.calls.some(c=>c.name==='document_open_patcher'),false);
  await p.dispose();
});
test('Basic cable feedback validates the complete help shell like the committed edit',async()=>{
  const patch=helpPatch();patch.nodes.find(n=>n.id===3).patcher.edges=[];
  const p=await mount();p.controller.load(patch);await p.controller.flush();
  assert.deepEqual(p.controller.getState().path,[3]);
  const port=(id,direction)=>descendants(p.all('objects').find(e=>Number(e.dataset.node)===id)).find(e=>e.dataset.direction===direction);
  await port(7,'out').fire('click');
  assert.equal(port(8,'in').classList.contains('compatible'),true,'Valid Basic cable must be offered with the shell metadata retained.');
  assert.equal(port(8,'in').classList.contains('unavailable'),false);
  await port(8,'in').fire('click');await p.controller.flush();
  assert.deepEqual(p.controller.getState().patch.edges,[{from:7,outlet:0,to:8,inlet:0}]);
  assert.ok(p.controller.getState().document.helpShell,'The edit preserves shell identity.');
  await port(7,'out').fire('click');
  assert.equal(port(8,'in').classList.contains('unavailable'),true,'Full-tree validation still refuses duplicate cables.');
  await p.dispose();
});
test('help reference replies cannot attach to a replacement shell and unavailable states stay readable',async()=>{
  let resolve;
  const patch=helpPatch(),descriptor={shared:true,id:0,label:'main',ownerLabel:'main',title:'Help.ultra',kind:'patch',patch,dirty:false,viewPath:[],authoringRevision:1,runtimeRevision:1};
  const p=await mount(true,{documentCurrent:descriptor,helpReference:name=>name==='append'?new Promise(r=>resolve=r):Promise.resolve({status:'unavailable',reason:'not-configured'})});
  const replacement=helpPatch();replacement.helpShell.object='float';
  p.controller.acceptDescriptor({...descriptor,patch:replacement,authoringRevision:2,runtimeRevision:2});
  await settle();resolve(reference());await settle();
  const details=p.all('objects').find(e=>e.dataset.node==='5');
  assert.equal(descendants(details).find(e=>e.tagName==='H1').textContent,'float');
  assert.equal(descendants(details).some(e=>e.textContent==='Original <digest>'),false);
  await p.ids.get('help-question').fire('click');await p.all('help-reference-menu').find(e=>e.textContent==='Reference').fire('click');await settle();
  assert.ok(p.all('help-reference-body').some(e=>e.textContent.includes('local Max installation')));
  await p.windowEvents.fire('keydown',{key:'Escape'});
  assert.equal(p.ids.get('help-reference-pane').hidden,true);
  assert.equal(p.calls.some(c=>c.name==='canvas_stop'),false,'Closing reference must not stop the shared runtime.');
  await p.dispose();
});
test('importing a help shell waits for native admission before requesting local reference text',async()=>{
  let admit;
  const descriptor={shared:true,id:0,label:'main',ownerLabel:'main',title:'Empty.ultra',kind:'patch',patch:{version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[],edges:[]},dirty:false,viewPath:[],authoringRevision:0,runtimeRevision:1};
  const p=await mount(true,{documentCurrent:descriptor,helpReference:async name=>reference(name),documentCommit:args=>new Promise(resolve=>{
    admit=()=>resolve({accepted:true,document:{...descriptor,patch:args.patch,authoringRevision:1,runtimeRevision:2}});
  })});
  p.controller.load(helpPatch());await settle();
  assert.equal(p.calls.some(c=>c.name==='help_reference'),false,'Optimistic shell appearance does not yet authorize the native reference command.');
  admit();await p.controller.flush();await settle();
  assert.equal(p.calls.filter(c=>c.name==='help_reference').length,1);
  assert.ok(p.all('objects').some(e=>e.textContent==='Original <digest>'));
  assert.deepEqual(p.controller.getState().path,[3]);
  await p.dispose();
});
test('console reveal closes the reference pane in a real bound Basic child',async()=>{
  const descriptor={shared:true,id:0,label:'patch-view-3',ownerLabel:'main',title:'Help.ultra',kind:'patch',patch:helpPatch(),dirty:false,viewPath:[3],authoringRevision:1,runtimeRevision:1};
  const p=await mount(true,{documentCurrent:descriptor,helpReference:async name=>reference(name)});
  await p.all('objects').find(e=>e.dataset.node==='5').fire('click');
  await p.windowEvents.fire('keydown',{key:'F1'});await settle();
  assert.equal(p.ids.get('help-reference-pane').hidden,false);
  p.consoleRecords.push({sequence:1,revision:1,node:8,label:'source',level:0,text:'17',frame:0});
  await p.controller.poll();await p.ids.get('show-console').fire('click');await p.ids.get('console-rows').children[0].children[0].fire('click');
  assert.equal(p.ids.get('help-reference-pane').hidden,true);
  assert.ok(p.all('objects').find(e=>e.dataset.node==='8').classList.contains('selected'));
  assert.deepEqual(p.controller.getState().boundPath,[3]);
  assert.equal(p.calls.some(c=>c.name==='document_open_patcher'),false);
  await p.dispose();
});
test('a native Basic tab can open an independently bound window without changing its hosted scope',async()=>{
  const descriptor={shared:true,id:0,label:'main',ownerLabel:'main',title:'Help.ultra',kind:'patch',patch:helpPatch(),dirty:false,viewPath:[],authoringRevision:1,runtimeRevision:1};
  const p=await mount(true,{documentCurrent:descriptor,helpReference:async name=>reference(name)});
  await p.ids.get('help-basic').fire('contextmenu',{clientX:50,clientY:100});
  const action=p.ids.get('context-menu').children.find(e=>e.textContent==='Open Basic in New Window');
  assert.ok(action);await action.fire('click');await settle();
  assert.deepEqual(p.calls.filter(c=>c.name==='document_open_patcher').map(c=>c.args),[{node:3}]);
  assert.deepEqual(p.controller.getState().boundPath,[]);assert.deepEqual(p.controller.getState().path,[3]);
  assert.equal(p.controller.getState().revision,1);
  await p.dispose();
});
test('live Print bubbles expose safe text and expire independently of console visibility',async()=>{
  const p=await mount(true);
  p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[{id:1,type:'print',x:40,y:40,params:{label:'notes',popup:1}}],edges:[]});
  await p.controller.flush();
  const revision=p.controller.getState().revision,findPopup=()=>p.all('objects').find(element=>element.attrs?.['aria-label']==='Print output, object 1');
  assert.ok(findPopup());assert.equal(findPopup().hidden,true);
  p.popupSnapshots.value={revision,frame:48000,nodes:[{id:1,enabled:true,has_value:true,generation:1,frame:48000,text:'<native> 3.5'}]};
  await p.controller.poll();
  assert.equal(findPopup().hidden,false);assert.equal(findPopup().attrs.role,'status');
  const text=descendants(findPopup()).find(element=>element.id===findPopup().attrs['aria-describedby']);
  assert.equal(text.textContent,'<native> 3.5');assert.equal(text.children.length,0);
  assert.equal(p.ids.get('patch-console').hidden,true);
  p.popupSnapshots.value.frame=144000;await p.controller.poll();assert.equal(findPopup().hidden,true);
  assert.equal(p.controller.getState().revision,revision);assert.equal(p.controller.getState().patch.nodes[0].params.popup,1);
  await p.dispose();
});
test('comment callout geometry follows appearance and resets without native graph work',async()=>{
  const p=await mount(true);
  p.controller.load({version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[
    {id:1,type:'comment',x:40,y:40,params:{text:'Literal <note>\nSecond line.'},style:{width:190,height:70,fontsize:13,bubble:1}},
    {id:2,type:'int',x:40,y:140,params:{value:0}},
  ],edges:[]});await p.controller.flush();
  const node=()=>p.all('objects').find(e=>e.dataset.node==='1');
  const outline=()=>descendants(node()).find(e=>e.attrs.class==='comment-outline');
  const header=()=>descendants(node()).find(e=>e.dataset.drag);
  assert.ok(outline());assert.equal(Object.hasOwn(outline().attrs,'hidden'),false);assert.equal(outline().attrs['aria-hidden'],'true');
  assert.equal(header().textContent,'Literal <note>\nSecond line.');assert.equal(header().children.length,0);
  const original=outline().children[0].attrs.d,revision=p.controller.getState().revision,count=p.calls.filter(c=>c.name==='canvas_apply').length;
  p.controller.style(1,'bubbleside',3);assert.notEqual(outline().children[0].attrs.d,original);
  const changed=outline().children[0].attrs.d;
  await p.controller.poll();await p.controller.poll();assert.equal(outline().children[0].attrs.d,changed);
  p.controller.style(1,'bubble',0);assert.equal(Object.hasOwn(outline().attrs,'hidden'),true);assert.equal(header().style.padding,'');
  p.controller.style(1,null);assert.equal(Object.hasOwn(outline().attrs,'hidden'),true);assert.equal(node().style.fontSize,'');
  p.controller.undo();assert.equal(Object.hasOwn(outline().attrs,'hidden'),true);
  p.controller.undo();assert.equal(Object.hasOwn(outline().attrs,'hidden'),false);assert.equal(outline().children[0].attrs.d,changed);
  await p.controller.flush();assert.equal(p.controller.getState().revision,revision);
  assert.equal(p.calls.filter(c=>c.name==='canvas_apply').length,count);
  await p.dispose();
});
test('console displays native messages safely, filters severity, selects source and clears',async()=>{
  const p=await mount(true),r=p.controller.getState().revision;
  p.consoleRecords.push({sequence:1,revision:r,node:13,label:'notes',level:0,text:'<script> 2.',frame:0},{sequence:2,revision:r,node:14,label:'error',level:2,text:'bang',frame:0});
  await p.controller.poll();await p.ids.get('show-console').fire('click');assert.equal(p.ids.get('patch-console').hidden,false);
  assert.equal(p.ids.get('console-rows').children.length,2);assert.equal(p.ids.get('console-rows').children[0].children[1].textContent,'<script> 2.');
  await p.ids.get('console-rows').children[0].children[0].fire('click');
  assert.ok(p.all('objects').find(e=>e.dataset.node==='13').classList.contains('selected'));
  p.ids.get('console-level').value='2';await p.ids.get('console-level').fire('change');assert.equal(p.ids.get('console-rows').children.length,1);
  await p.ids.get('clear-console').fire('click');assert.equal(p.controller.getState().console.length,0);
  await p.ids.get('close-console').fire('click');assert.equal(p.ids.get('patch-console').hidden,true);
});
test('console source links reveal descendant objects from the root view',async()=>{
  const p=await mount(true);
  p.controller.load({version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[{id:1,type:'patcher',x:40,y:40,params:{name:'child'},patcher:{presentation:null,nodes:[{id:2,type:'print',x:40,y:40,params:{label:'nested'}}],edges:[]}}],edges:[]});
  await p.controller.flush();const revision=p.controller.getState().revision;
  p.consoleRecords.push({sequence:1,revision,node:2,label:'nested',level:0,text:'19',frame:0});
  await p.controller.poll();await p.ids.get('show-console').fire('click');
  const source=p.ids.get('console-rows').children[0].children[0];assert.equal(source.disabled,false);
  await source.fire('click');assert.deepEqual(p.controller.getState().path,[1]);
  assert.ok(p.all('objects').find(e=>e.dataset.node==='2').classList.contains('selected'));
  const count=p.calls.filter(call=>call.name==='canvas_apply').length;
  p.controller.remove(2);await p.controller.flush();
  await source.fire('click');assert.equal(p.calls.filter(call=>call.name==='canvas_apply').length,count+1);
});
test('browser page mounts editable palette, honest preview, and exclusively top/bottom typed ports',async()=>{
  const p=await mount();assert.equal(p.ids.get('preview-banner').hidden,false);assert.equal(p.ids.get('start-audio').disabled,true);
  assert.deepEqual(p.all('palette').filter(e=>e.dataset.add).map(e=>e.dataset.add).sort(),Object.keys(OBJECTS).sort());
  const ports=p.all('objects').filter(e=>e.dataset.direction);assert.ok(ports.length>30);
  for(const port of ports)assert.equal(port.dataset.side,port.dataset.direction==='in'?'top':'bottom');
  await p.ids.get('export-patch').fire('click');assert.equal(p.ids.get('patch-dialog').open,true);assert.equal(JSON.parse(p.ids.get('patch-json').value).profile,'ultra-canvas-v1');assert.equal(p.calls.length,0);
});
test('audio settings save requested device buffer without starting sound, then lock edits during playback',async()=>{
  const p=await mount(true);await p.ids.get('show-audio').fire('click');
  assert.equal(p.ids.get('audio-content').hidden,false);
  p.ids.get('audio-buffer').value='128';await p.ids.get('audio-save').fire('click');
  assert.deepEqual(p.calls.find(c=>c.name==='audio_configure').args.config,{host:'default',device:'default',sample_rate:48000,buffer_frames:128});
  assert.equal(p.calls.filter(c=>c.name==='audio_start').length,0);
  await p.ids.get('audio-start-configured').fire('click');
  assert.equal(p.controller.getState().status.running,true);
  assert.equal(p.ids.get('audio-buffer').disabled,true);
  await p.ids.get('audio-stop-configured').fire('click');
  assert.equal(p.ids.get('audio-buffer').disabled,false);
});
test('audio settings browser preview never invents devices or invokes a native host',async()=>{
  const p=await mount();await p.ids.get('show-audio').fire('click');
  assert.equal(p.ids.get('audio-content').hidden,false);
  assert.equal(p.ids.get('audio-save').disabled,true);
  assert.match(p.ids.get('audio-settings-notice').textContent,/native/i);
  assert.equal(p.calls.length,0);
});
test('real page adds, wires, selects, disconnects, deletes and undoes objects',async()=>{
  const p=await mount();const before=p.controller.getState().patch.nodes.length;
  await p.all('palette').find(e=>e.dataset.add==='bang').fire('click');
  assert.equal(p.controller.getState().patch.nodes.length,before+1);const id=p.controller.getState().patch.nodes.at(-1).id;
  const node=p.all('objects').find(e=>Number(e.dataset.node)===id);const outlet=descendants(node).find(e=>e.dataset.direction==='out');await outlet.fire('click');
  const target=p.all('objects').find(e=>Number(e.dataset.node)===14);await descendants(target).find(e=>e.dataset.direction==='in').fire('click');
  const edge=p.controller.getState().patch.edges.length-1;await p.all('cables').find(e=>Number(e.dataset.edge)===edge).fire('click');await p.ids.get('delete-selection').fire('click');assert.equal(p.controller.getState().patch.edges.length,edge);
  await descendants(node).find(e=>e.dataset.drag).fire('click');await p.ids.get('delete-selection').fire('click');assert.equal(p.controller.getState().patch.nodes.length,before);
  await p.ids.get('undo').fire('click');assert.equal(p.controller.getState().patch.nodes.length,before+1);
});
test('actual numeric, bang, toggle and message controls emit native events; drag is layout-only',async()=>{
  const p=await mount(true);await p.ids.get('start-audio').fire('click');
  await p.ids.get('lock-patch').fire('click');
  const findNode=id=>p.all('objects').find(e=>Number(e.dataset.node)===id);
  for(const id of[1,13,14])await descendants(findNode(id)).find(e=>e.dataset.trigger).fire('click');await p.controller.flush();
  assert.equal(p.calls.filter(c=>c.name==='canvas_event').length,3);
  const number=descendants(findNode(15)).find(e=>e.dataset.parameter==='value');number.value='200';await number.fire('change');await p.controller.flush();assert.ok(p.calls.some(c=>c.name==='canvas_event'&&c.args.node===15&&c.args.value[0]===200));
  await p.ids.get('lock-patch').fire('click');
  const count=p.calls.filter(c=>c.name==='canvas_apply').length,header=descendants(findNode(15)).find(e=>e.dataset.drag),startX=p.controller.getState().patch.nodes.find(n=>n.id===15).x;
  await header.fire('pointerdown',{pointerId:1,clientX:310,clientY:50});await header.fire('pointermove',{pointerId:1,clientX:350,clientY:90});await header.fire('pointerup',{pointerId:1,clientX:350,clientY:90});await p.controller.flush();
  assert.equal(p.controller.getState().patch.nodes.find(n=>n.id===15).x,startX+40);assert.equal(p.calls.filter(c=>c.name==='canvas_apply').length,count);
});
test('message editing validates before replacement and bad ports leave last valid document intact',async()=>{
  const p=await mount();const msg=p.all('objects').find(e=>Number(e.dataset.node)===14);await descendants(msg).find(e=>e.dataset.drag).fire('click');
  const text=p.all('inspector').find(e=>e.dataset.parameter==='text');text.value='60 100';await text.fire('change');assert.equal(p.controller.getState().patch.nodes.find(n=>n.id===14).params.text,'60 100');
  text.value='set $1';await text.fire('change');assert.equal(p.controller.getState().patch.nodes.find(n=>n.id===14).params.text,'60 100');assert.match(p.ids.get('notice').textContent,/literal|Message/);
  const before=p.controller.export(),voice=p.all('objects').find(e=>Number(e.dataset.node)===6);await descendants(voice).find(e=>e.dataset.direction==='out').fire('click');await descendants(msg).find(e=>e.dataset.direction==='in').fire('click');assert.equal(p.controller.export(),before);assert.match(p.ids.get('notice').textContent,/type/i);
});
test('focus and visibility preserve the running graph; navigation disposes only its document',async()=>{
  const p=await mount(true);await p.ids.get('start-audio').fire('click');const stopped=p.calls.filter(c=>c.name==='canvas_stop').length;
  assert.equal(p.ids.get('legacy-link').hidden,true);assert.equal(p.ids.get('lab-link').hidden,true);
  await p.windowEvents.fire('blur');p.document.hidden=true;await p.documentEvents.fire('visibilitychange');
  assert.equal(p.calls.filter(c=>c.name==='canvas_stop').length,stopped);assert.equal(p.controller.getState().status.running,true);
  await p.ids.get('legacy-link').fire('click');assert.equal(p.calls.at(-1).name,'canvas_stop');assert.equal(p.calls.filter(c=>c.name==='audio_stop').length,0);assert.deepEqual(p.navigations,['index.html']);
});

test('pagehide handles an already-closed native graph without an unhandled rejection',async()=>{
  const p=await mount(true);p.controller.disposeDocument=async()=>{throw Error('The document is already closed.');};
  await p.windowEvents.fire('pagehide');await settle();
  assert.equal(p.calls.filter(call=>call.name==='audio_stop').length,0);
});
test('status polls retain cable elements while selection and endpoint changes redraw them',async()=>{
  const p=await mount(true);
  await p.controller.poll();await p.controller.poll();
  const before=[...p.ids.get('cables').children];assert.ok(before.length>0);
  p.observed[1]={value:1,pulses:4};await p.controller.poll();
  assert.ok(before.every((element,index)=>p.ids.get('cables').children[index]===element),'Live observations do not replace stable cable elements.');
  const path=before.find(element=>element.dataset.edge==='0');
  await path.fire('click');
  assert.ok(p.ids.get('cables').children.some(element=>element.attrs.class?.includes('selected')));
  const geometry=p.ids.get('cables').children[0].attrs.d;
  const port=p.all('objects').find(element=>element.dataset.direction==='out');
  port.getBoundingClientRect=()=>({left:40,top:60,width:10,height:8});
  await p.windowEvents.fire('resize');
  assert.notEqual(p.ids.get('cables').children[0].attrs.d,geometry,'Window resize remeasures the port geometry.');
  const resized=p.ids.get('cables').children[0].attrs.d;
  p.ids.get('canvas-zoom').value='2';await p.ids.get('canvas-zoom').fire('change');
  assert.notEqual(p.ids.get('cables').children[0].attrs.d,resized,'Zoom redraws measured endpoints in canvas coordinates.');
  const count=p.ids.get('cables').children.length;p.controller.disconnect(0);await p.controller.flush();
  assert.equal(p.ids.get('cables').children.length,count-2,'Editing the graph invalidates cached cables.');
  await p.dispose();
});
test('a bang flash still clears on the next unchanged observation',async()=>{
  const p=await mount(true);await p.controller.poll();await p.controller.poll();
  const trigger=p.all('objects').find(element=>element.attrs['aria-label']==='Trigger bang object 13');assert.ok(trigger);
  p.observed[13]={value:0,pulses:1};await p.controller.poll();
  assert.equal(trigger.classList.contains('pulse'),true);
  await p.controller.poll();assert.equal(trigger.classList.contains('pulse'),false);
  await p.dispose();
});
test('advancing diagnostics stay current without rewriting the canvas and faults remain visible',async()=>{
  const audioStatus={frames:100,output:{callbacks:1,stream_errors:0}},p=await mount(true,{audioStatus});
  await p.controller.poll();await p.controller.poll();
  const element=p.ids.get('engine-state');let text=element.textContent,writes=0;
  Object.defineProperty(element,'textContent',{get:()=>text,set:value=>{text=value;writes++;}});
  audioStatus.frames=200;audioStatus.output={callbacks:2,stream_errors:0};
  await p.controller.poll();
  assert.equal(p.controller.getState().status.frames,200);
  assert.equal(p.controller.getState().status.output.callbacks,2);
  assert.equal(writes,0,'Diagnostic counters alone do not repaint the canvas.');
  audioStatus.fault=true;audioStatus.message='test output lost';await p.controller.poll();
  assert.match(element.textContent,/Fault/);assert.match(p.ids.get('notice').textContent,/test output lost/);
  await p.dispose();
});
test('hidden windows poll less often and restore immediately without stopping audio',async()=>{
  const p=await mount(true);await p.controller.startAudio();
  p.document.hidden=true;await p.documentEvents.fire('visibilitychange');
  assert.equal(p.timeouts.at(-1).ms,1000);
  p.document.hidden=false;await p.documentEvents.fire('visibilitychange');
  assert.equal(p.timeouts.at(-1).ms,0);
  await p.timeouts.at(-1).fn();
  assert.equal(p.timeouts.at(-1).ms,100);
  assert.equal(p.controller.getState().status.running,true);
  assert.equal(p.calls.some(call=>['audio_stop','canvas_stop','audio_panic'].includes(call.name)),false);
  await p.dispose();
});
test('import replacing a reused node ID rebuilds its type-specific controls and ports',async()=>{
  const p=await mount();p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[{id:1,type:'join',x:50,y:50,params:{}}],edges:[]});
  const node=p.all('objects').find(e=>Number(e.dataset.node)===1),ports=descendants(node).filter(e=>e.dataset.direction);assert.equal(ports.length,3);assert.equal(ports.filter(e=>e.dataset.portType==='mono').length,2);assert.ok(!descendants(node).some(e=>e.dataset.trigger));
});
test('consecutive palette objects are placed without overlapping headers or ports',async()=>{
  const p=await mount();p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[],edges:[]});await p.all('palette').find(e=>e.dataset.add==='bang').fire('click');await p.all('palette').find(e=>e.dataset.add==='number').fire('click');
  const[a,b]=p.controller.getState().patch.nodes;assert.ok(Math.abs(a.x-b.x)>=176||Math.abs(a.y-b.y)>=112);
});
test('keyboard creation rejects unknown objects and Escape cancels without mutating the patch',async()=>{
  const p=await mount();p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[],edges:[]});
  await p.windowEvents.fire('keydown',{key:'n'});
  assert.equal(p.ids.get('object-entry').hidden,false);
  const input=p.ids.get('object-text');input.value='buffer~ wave';await input.fire('input');
  await input.fire('keydown',{key:'Enter'});
  assert.equal(p.controller.getState().patch.nodes.length,0);
  assert.match(p.ids.get('object-error').textContent,/Unknown object/);
  await input.fire('keydown',{key:'Escape'});
  assert.equal(p.ids.get('object-entry').hidden,true);
  await p.windowEvents.fire('keydown',{key:'n'});
  input.value='+ 12';await input.fire('input');await input.fire('keydown',{key:'Enter'});
  const node=p.controller.getState().patch.nodes[0];assert.equal(node.type,'add');assert.equal(node.params.rhs,12);
});
test('lock protects structure while unlocked UI clicks select instead of triggering',async()=>{
  const p=await mount(true);await p.ids.get('start-audio').fire('click');
  const button=p.all('objects').find(e=>Number(e.dataset.node)===13);
  await descendants(button).find(e=>e.dataset.trigger).fire('click');await p.controller.flush();
  assert.equal(p.calls.filter(c=>c.name==='canvas_event').length,0);
  await p.ids.get('lock-patch').fire('click');await p.windowEvents.fire('keydown',{key:'n'});
  assert.equal(p.ids.get('object-entry').hidden,true);
  await descendants(button).find(e=>e.dataset.trigger).fire('click');await p.controller.flush();
  assert.equal(p.calls.filter(c=>c.name==='canvas_event').length,1);
});
test('inlet and outlet context information separates accepted messages from emitted data',async()=>{
  const p=await mount();const node=p.all('objects').find(e=>Number(e.dataset.node)===5);
  const inlet=descendants(node).find(e=>e.dataset.direction==='in'),outlet=descendants(node).find(e=>e.dataset.direction==='out');
  await inlet.fire('contextmenu',{clientX:10,clientY:10});
  assert.ok(p.all('context-menu').some(e=>e.textContent.includes('Accepts')));
  await outlet.fire('contextmenu',{clientX:10,clientY:10});
  assert.ok(p.all('context-menu').some(e=>e.textContent.includes('Emits')));
  assert.ok(p.all('context-menu').some(e=>e.textContent.includes('one list outlet')));
});
test('number display follows native observations without changing saved parameters',async()=>{
  const p=await mount(true);await p.ids.get('start-audio').fire('click');
  const state=p.controller.getState(),node=state.patch.nodes.find(n=>n.id===15);
  const element=p.all('objects').find(e=>Number(e.dataset.node)===15),input=descendants(element).find(e=>e.dataset.parameter==='value');
  p.render({...state,observations:{15:{value:72,pulses:1}}});
  assert.equal(input.value,'72');assert.equal(node.params.value,150);
});
test('saving a focused number commits its draft before taking the snapshot',async()=>{
  const p=await mount(true);
  p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[makeNode('number',1,0,0,{value:10})],edges:[]});
  await p.controller.flush();await p.ids.get('lock-patch').fire('click');
  const input=p.all('objects').find(e=>e.dataset.parameter==='value');
  p.document.activeElement=input;input.value='42';await input.fire('input');
  await p.windowEvents.fire('keydown',{key:'s',ctrlKey:true,target:input});
  const saved=p.calls.filter(c=>c.name==='document_save').at(-1);
  assert.equal(saved.args.patch.nodes[0].params.value,42);
  assert.equal(p.controller.getState().document.nodes[0].params.value,42);
  await p.dispose();
});
test('rebuilding the node container captures the focused draft first',async()=>{
  const p=await mount(true);
  p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[makeNode('number',1,0,0,{value:10})],edges:[]});await p.controller.flush();
  await p.ids.get('lock-patch').fire('click');
  const input=p.all('objects').find(e=>e.dataset.parameter==='value');p.document.activeElement=input;
  input.value='42';await input.fire('input');p.controller.add('bang',100,100);await p.controller.flush();
  assert.equal(p.controller.getState().document.nodes.find(n=>n.id===1).params.value,42);
  await p.dispose();
});
test('saving an invalid focused number refuses the snapshot until cancelled',async()=>{
  const p=await mount(true);
  p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[makeNode('number',1,0,0,{value:10})],edges:[]});
  await p.controller.flush();await p.ids.get('lock-patch').fire('click');
  const input=p.all('objects').find(e=>e.dataset.parameter==='value');p.document.activeElement=input;
  input.value='';await input.fire('input');
  await p.windowEvents.fire('keydown',{key:'s',ctrlKey:true,target:input});
  assert.equal(p.calls.filter(c=>c.name==='document_save').length,0);
  await input.fire('keydown',{key:'Escape'});
  assert.equal(input.value,'10');
  await p.windowEvents.fire('keydown',{key:'s',ctrlKey:true,target:input});
  assert.equal(p.calls.filter(c=>c.name==='document_save').length,1);
  await p.dispose();
});
test('a parked invalid number blocks Save and close after focus moves',async()=>{
  const p=await mountHistoryControl();await p.ids.get('lock-patch').fire('click');
  const input=p.all('objects').find(e=>e.dataset.parameter==='value');p.document.activeElement=input;
  input.value='';await input.fire('input');await input.fire('blur');p.document.activeElement=p.ids.get('document-save');
  await p.documents.action('save').catch(()=>{});
  assert.equal(p.operations.filter(c=>c.name==='document_save').length,0);
  await assert.rejects(p.documents.session.flushBeforeClose({requestLabel:'owner',token:55}),/invalid focused edit/);
  assert.equal(p.operations.find(c=>c.name==='document_close_flushed').args.token,55);
  assert.match(p.operations.find(c=>c.name==='document_close_flushed').args.error,/invalid focused edit/);
  assert.equal(input.value,'');await p.dispose();
});
test('parked invalid number survives container reconstruction',async()=>{
  const p=await mount(true);p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[makeNode('number',1,0,0,{value:10})],edges:[]});await p.controller.flush();
  await p.ids.get('lock-patch').fire('click');const input=p.all('objects').find(e=>e.dataset.parameter==='value');p.document.activeElement=input;
  input.value='';await input.fire('input');await input.fire('blur');p.document.activeElement=p.ids.get('document-save');
  p.controller.add('bang',100,100);await p.controller.flush();
  assert.equal(p.ids.get('objects').children.length,1);assert.equal(p.all('objects').find(e=>e.dataset.parameter==='value'),input);assert.equal(input.value,'');
  await input.fire('keydown',{key:'Escape'});assert.equal(p.ids.get('objects').children.length,2);await p.dispose();
});
test('preflight commits valid parked drafts and rejects another invalid draft',async()=>{
  const p=await mount(true);p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[makeNode('number',1,0,0,{value:10}),makeNode('number',2,100,0,{value:20})],edges:[]});await p.controller.flush();
  await p.ids.get('lock-patch').fire('click');const inputs=p.all('objects').filter(e=>e.dataset.parameter==='value');
  p.document.activeElement=inputs[0];inputs[0].value='42';await inputs[0].fire('input');
  p.document.activeElement=inputs[1];inputs[1].value='';await inputs[1].fire('input');p.document.activeElement=p.ids.get('document-save');
  await p.documents.action('save').catch(()=>{});assert.equal(p.calls.filter(c=>c.name==='document_save').length,0);
  assert.equal(p.controller.getState().document.nodes[0].params.value,42);assert.equal(inputs[1].value,'');await p.dispose();
});
test('an out-of-range number draft is not clamped by Enter',async()=>{
  const p=await mount(true);
  p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[makeNode('number',1,0,0,{value:10})],edges:[]});
  await p.controller.flush();await p.ids.get('lock-patch').fire('click');
  const input=p.all('objects').find(e=>e.dataset.parameter==='value');p.document.activeElement=input;
  input.value=String(Number(input.max)+1);await input.fire('input');await input.fire('keydown',{key:'Enter'});
  assert.equal(p.controller.getState().document.nodes[0].params.value,10);
  assert.equal(input.value,String(Number(input.max)+1));
  await p.dispose();
});
test('saving a focused inspector field commits its draft',async()=>{
  const p=await mount(true);
  p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[makeNode('number',1,0,0,{value:10})],edges:[]});
  await p.controller.flush();
  const node=p.all('objects').find(e=>e.dataset.node==='1');await descendants(node).find(e=>e.dataset.drag).fire('click');
  const input=p.all('inspector').find(e=>e.dataset.parameter==='value');p.document.activeElement=input;
  input.value='42';await input.fire('input');
  await p.windowEvents.fire('keydown',{key:'s',ctrlKey:true,target:input});
  assert.equal(p.calls.filter(c=>c.name==='document_save').at(-1).args.patch.nodes[0].params.value,42);
  await p.dispose();
});
test('changing selection captures a focused inspector draft before rebuilding',async()=>{
  const p=await mount(true);
  p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[makeNode('number',1,0,0,{value:10}),makeNode('bang',2)],edges:[]});await p.controller.flush();
  const select=id=>descendants(p.all('objects').find(e=>e.dataset.node===String(id))).find(e=>e.dataset.drag).fire('click');
  await select(1);const input=p.all('inspector').find(e=>e.dataset.parameter==='value');p.document.activeElement=input;
  input.value='42';await input.fire('input');await select(2);await p.controller.flush();
  assert.equal(p.controller.getState().document.nodes.find(n=>n.id===1).params.value,42);
  await p.dispose();
});
test('saving a focused appearance value commits its draft',async()=>{
  const p=await mount(true);
  p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[makeNode('number',1,0,0,{value:10})],edges:[]});await p.controller.flush();
  const node=p.all('objects').find(e=>e.dataset.node==='1');await descendants(node).find(e=>e.dataset.drag).fire('click');
  const input=p.all('inspector').find(e=>e.dataset.style==='fontsize');assert.ok(input);p.document.activeElement=input;
  input.value='24';await input.fire('input');await p.documents.action('save');
  assert.equal(p.calls.filter(c=>c.name==='document_save').at(-1).args.patch.nodes[0].style.fontsize,24);
  await p.dispose();
});
test('saving an open object entry commits its draft',async()=>{
  const p=await mount(true);
  p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[],edges:[]});await p.controller.flush();
  await p.windowEvents.fire('keydown',{key:'n'});
  const input=p.ids.get('object-text');p.document.activeElement=input;input.value='number 42';await input.fire('input');
  await p.documents.action('save');
  assert.equal(p.calls.filter(c=>c.name==='document_save').at(-1).args.patch.nodes[0].params.value,42);
  await p.dispose();
});
test('saving through a toolbar commits the open object entry after focus moves',async()=>{
  const p=await mount(true);
  p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[],edges:[]});await p.controller.flush();
  await p.windowEvents.fire('keydown',{key:'n'});
  const input=p.ids.get('object-text');input.value='number 42';await input.fire('input');
  p.document.activeElement=p.ids.get('document-save');await p.ids.get('document-save').fire('click');
  assert.equal(p.calls.filter(c=>c.name==='document_save').at(-1).args.patch.nodes[0].params.value,42);
  await p.dispose();
});
test('controls can return a live observed value to the saved value without duplicate native events',async()=>{
  for(const type of ['number','flonum','slider']){
    const p=await mount(true);
    p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[{id:1,type,x:40,y:40,params:{value:20}}],edges:[]});
    await p.controller.flush();await p.ids.get('lock-patch').fire('click');
    p.observed[1]={value:70,pulses:1};await p.controller.poll();
    const input=p.all('objects').find(e=>e.dataset.parameter==='value');
    assert.equal(Number(input.value),70,type);
    p.document.activeElement=input;
    input.value='20';await input.fire('input');await input.fire('change');await p.controller.flush();
    const events=()=>p.calls.filter(c=>c.name==='canvas_event').map(c=>c.args.value);
    assert.deepEqual(events(),[[20]],`${type} emits the restored live value`);
    await input.fire('input');await input.fire('change');await p.controller.poll();await p.controller.flush();
    assert.deepEqual(events(),[[20]],`${type} ignores repeated unchanged gestures and polls`);
    assert.equal(JSON.parse(p.controller.export()).nodes[0].params.value,20);
  }
});
test('Escape stops notes from focused ordinary inputs but entry Escape only cancels',async()=>{
  const p=await mount(true);await p.ids.get('start-audio').fire('click');
  const stops=()=>p.calls.filter(c=>c.name==='canvas_stop').length;
  let before=stops();await p.windowEvents.fire('keydown',{key:'Escape',target:p.ids.get('object-search')});
  assert.equal(stops(),before+1);
  await p.windowEvents.fire('keydown',{key:'n'});before=stops();
  await p.ids.get('object-text').fire('keydown',{key:'Escape'});
  assert.equal(stops(),before);assert.equal(p.ids.get('object-entry').hidden,true);
});
test('locked inspector rejects structural parameters while keeping live controls available',async()=>{
  const p=await mount(true);await p.ids.get('lock-patch').fire('click');
  for(const [type,key,value] of [['message','text','60 100'],['voice','device',1],['midiin','channel',2]]){
    const id=p.controller.getState().patch.nodes.find(n=>n.type===type).id;
    const node=p.all('objects').find(e=>Number(e.dataset.node)===id);
    await descendants(node).find(e=>e.dataset.drag).fire('click');
    const input=p.all('inspector').find(e=>e.dataset.parameter===key);assert.ok(input);
    assert.equal(input.disabled,true,`${id} ${key}`);
    const before=p.controller.export();input.value=String(value);await input.fire('change');assert.equal(p.controller.export(),before);
  }
  const number=p.all('objects').find(e=>Number(e.dataset.node)===15);await descendants(number).find(e=>e.dataset.drag).fire('click');
  const input=p.all('inspector').find(e=>e.dataset.parameter==='value');assert.equal(input.disabled,false);
  input.value='200';await input.fire('change');assert.equal(p.controller.getState().patch.nodes.find(n=>n.id===15).params.value,200);
});
test('camera pan, zoom and reset never send native graph or audio commands',async()=>{
  const p=await mount(true),before=p.controller.export(),calls=p.calls.length;
  const workspace=p.ids.get('workspace');
  await workspace.fire('pointerdown',{button:1,pointerId:7,clientX:300,clientY:300});
  await workspace.fire('pointermove',{pointerId:7,clientX:420,clientY:340});await workspace.fire('pointerup',{pointerId:7});
  assert.match(p.ids.get('canvas').style.transform,/translate\(120px, 40px\)/);
  await workspace.fire('wheel',{ctrlKey:true,deltaY:-200,deltaMode:0,clientX:120,clientY:100});
  assert.ok(Number(p.ids.get('canvas-zoom').value)>1);
  await workspace.fire('pointermove',{clientX:200,clientY:150});
  const zoom=Number(p.ids.get('canvas-zoom').value);
  await p.windowEvents.fire('keydown',{key:'z',target:workspace});
  assert.ok(Number(p.ids.get('canvas-zoom').value)>zoom);
  await p.windowEvents.fire('keydown',{key:'Z',shiftKey:true,target:workspace});
  assert.equal(Number(p.ids.get('canvas-zoom').value),zoom);
  await p.ids.get('reset-view').fire('click');assert.equal(p.ids.get('canvas').style.transform,'translate(0px, 0px) scale(1)');
  assert.equal(p.controller.export(),before);assert.equal(p.calls.length,calls);
});
test('locking cancels an in-flight move and examples open independently',async()=>{
  const p=await mount();const node=p.all('objects').find(e=>Number(e.dataset.node)===15),header=descendants(node).find(e=>e.dataset.drag);
  await header.fire('click');await p.ids.get('show-help').fire('click');
  const example=p.all('help-content').find(e=>e.textContent==='Open runnable example patch');assert.ok(example);assert.equal(example.disabled,false);
  const before=p.controller.export();await header.fire('pointerdown',{pointerId:1,clientX:300,clientY:100});await header.fire('pointermove',{pointerId:1,clientX:340,clientY:160});
  await p.ids.get('lock-patch').fire('click');await header.fire('pointermove',{pointerId:1,clientX:380,clientY:180});await header.fire('pointerup',{pointerId:1});
  assert.equal(p.controller.export(),before);
  assert.ok(!p.all('help-content').some(e=>e.textContent==='Open runnable example patch'&&!e.disabled));
  await example.fire('click');assert.equal(p.controller.export(),before);
  assert.match(p.previews.at(-1).url,/library=example%3Anumber/);
});

test('new variadic objects rebuild node-aware ports after configuration changes',async()=>{
  const p=await mount();
  p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[{id:1,type:'pack',x:40,y:40,params:{args:'0 0'}}],edges:[]});
  const find=()=>p.all('objects').find(e=>Number(e.dataset.node)===1);
  assert.equal(descendants(find()).filter(e=>e.dataset.direction==='in').length,2);
  p.controller.parameter(1,'args','0 f s 0');
  assert.equal(descendants(find()).filter(e=>e.dataset.direction==='in').length,4);
  const fourth=descendants(find()).find(e=>e.dataset.direction==='in'&&e.dataset.port==='3');
  await fourth.fire('pointerenter');assert.match(p.ids.get('assist').textContent,/cold/i);
  await fourth.fire('contextmenu');assert.ok(p.ids.get('context-menu').children.length);
  await p.ids.get('context-menu').children.find(e=>e.textContent==='Help for pack').fire('click');
  assert.match(p.previews.at(-1).url,/library=help%3Apack/);
  await p.ids.get('show-help').fire('click');
  assert.equal(p.all('help-content').filter(e=>e.className==='help-port').length,5);
  p.controller.parameter(1,'args','0 0 0');
  assert.equal(p.all('help-content').filter(e=>e.className==='help-port').length,4);
});
test('MSP channel configuration uses text, rebuilds ports and stays locked during performance',async()=>{
  const p=await mount();
  p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[{id:1,type:'signal_dac',x:40,y:40,params:{channels:'1 2'}}],edges:[]});
  const find=()=>p.all('objects').find(e=>Number(e.dataset.node)===1);
  const inlets=()=>descendants(find()).filter(e=>e.dataset.direction==='in');
  assert.equal(inlets().length,2);
  await descendants(find()).find(e=>e.dataset.drag).fire('click');
  let input=p.all('inspector').find(e=>e.dataset.parameter==='channels');
  assert.equal(input.tagName,'TEXTAREA');assert.equal(input.maxLength,127);
  input.value='1 2 1 2';await input.fire('change');
  assert.equal(p.controller.getState().patch.nodes[0].params.channels,'1 2 1 2');assert.equal(inlets().length,4);
  await p.ids.get('undo').fire('click');assert.equal(inlets().length,2);
  await p.ids.get('redo').fire('click');assert.equal(inlets().length,4);
  await p.ids.get('lock-patch').fire('click');
  await descendants(find()).find(e=>e.dataset.drag).fire('click');
  input=p.all('inspector').find(e=>e.dataset.parameter==='channels');assert.equal(input.disabled,true);
  const before=p.controller.export();input.value='1';await input.fire('change');assert.equal(p.controller.export(),before);
});
test('locked flonum and slider emit hot native events with audio off, physical Tab is a UI action and observations display',async()=>{
  const p=await mount(true);
  p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[{id:1,type:'flonum',x:40,y:40,params:{}},{id:2,type:'slider',x:40,y:100,params:{}}],edges:[]});
  await p.controller.flush();await p.ids.get('lock-patch').fire('click');
  const input=id=>descendants(p.all('objects').find(e=>Number(e.dataset.node)===id)).find(e=>e.dataset.parameter==='value');
  assert.ok(input(1));assert.ok(input(2));
  input(1).value='3.5';await input(1).fire('change');input(2).value='42';await input(2).fire('input');await input(2).fire('change');
  await input(1).fire('keydown',{key:'Tab'});await p.controller.flush();
  assert.ok(p.calls.some(c=>c.name==='canvas_event'&&c.args.node===1&&c.args.value[0]===3.5));
  assert.ok(p.calls.some(c=>c.name==='canvas_event'&&c.args.node===2&&c.args.value[0]===42));
  assert.ok(p.calls.some(c=>c.name==='canvas_event'&&c.args.node===1&&c.args.value===null&&c.args.action==='tab'));
  assert.ok(!p.calls.some(c=>c.name==='audio_start'));
  p.observed[1]={value:7.125,pulses:1};p.observed[2]={value:61,pulses:1};await p.controller.poll();
  assert.equal(Number(input(1).value),7.125);assert.equal(Number(input(2).value),61);
  await input(1).fire('keydown',{key:'Tab'});await p.controller.flush();
  const exported=JSON.parse(p.controller.export());assert.equal(exported.nodes[0].params.value,3.5);assert.equal(exported.nodes[1].params.value,42);
});

test('flonum Tab commits pending text before the native second-outlet event',async()=>{
  const p=await mount(true);
  p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[{id:1,type:'flonum',x:40,y:40,params:{}}],edges:[]});
  await p.controller.flush();await p.ids.get('lock-patch').fire('click');
  const input=p.all('objects').find(e=>e.dataset.parameter==='value');
  input.value='5.25';await input.fire('input');await input.fire('keydown',{key:'Tab'});await input.fire('change');await p.controller.flush();
  assert.deepEqual(p.calls.filter(c=>c.name==='canvas_event').map(c=>c.args),[
    {revision:p.controller.getState().revision,node:1,inlet:0,value:[5.25]},
    {revision:p.controller.getState().revision,node:1,inlet:0,value:null,action:'tab'},
  ]);
});

test('integer UI entry truncates either sign and silent runtime values display without changing the document',async()=>{
  const p=await mount(true);
  p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[{id:1,type:'number_int',x:40,y:40,params:{minimum:-10,maximum:10}}],edges:[]});
  await p.controller.flush();const input=p.all('objects').find(e=>e.dataset.parameter==='value');
  await input.fire('keydown',{key:'Tab'});await p.controller.flush();
  assert.equal(p.calls.some(c=>c.name==='canvas_event'),false);
  await p.ids.get('lock-patch').fire('click');
  for(const [text,value]of [['3.9',3],['-3.9',-3]]){
    input.value=text;await input.fire('input');await input.fire('keydown',{key:'Enter'});await p.controller.flush();
    assert.equal(JSON.parse(p.controller.export()).nodes[0].params.value,value);
  }
  p.observed[1]={value:8,pulses:0};await p.controller.poll();
  assert.equal(Number(input.value),8);
  assert.equal(JSON.parse(p.controller.export()).nodes[0].params.value,-3);
});

test('slider pointer values remain raw and offset/multiplier apply only to the output readout',async()=>{
  const p=await mount(true);
  p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[{id:1,type:'slider',x:40,y:40,params:{min:10,mult:2,size:6}}],edges:[]});
  await p.controller.flush();await p.ids.get('lock-patch').fire('click');
  const input=p.all('objects').find(e=>e.dataset.parameter==='value');
  assert.equal(Number(input.min),0);assert.equal(Number(input.max),5);assert.equal(Number(input.step),1);
  input.value='5';await input.fire('input');await input.fire('change');await p.controller.flush();
  assert.ok(p.calls.some(c=>c.name==='canvas_event'&&c.args.value[0]===5));
  assert.equal(p.all('objects').find(e=>e.className==='slider-value').textContent,'20');
  p.observed[1]={value:3,pulses:1};await p.controller.poll();assert.equal(Number(input.value),3);
  assert.equal(p.all('objects').find(e=>e.className==='slider-value').textContent,'16');
});

test('line Help opens its own runnable native example without starting audio or sending events',async()=>{
  const p=await mount(true);
  p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[{id:1,type:'line',x:40,y:40,params:{}}],edges:[]});
  await p.controller.flush();
  const node=p.all('objects').find(e=>Number(e.dataset.node)===1);
  await node.fire('contextmenu');await p.ids.get('context-menu').children.find(e=>e.textContent==='Help for line').fire('click');
  assert.ok(p.calls.some(c=>c.name==='document_open_help'&&c.args.key==='help:line'));
  const before=p.controller.export();await p.ids.get('show-help').fire('click');
  await p.all('help-content').find(e=>e.textContent==='Open runnable example patch').fire('click');await p.controller.flush();
  assert.equal(p.controller.export(),before);assert.ok(p.calls.some(c=>c.name==='document_open_help'&&c.args.key==='example:line'));
  assert.equal(p.calls.filter(c=>['audio_start','canvas_event'].includes(c.name)).length,0);
});

test('native startup applies only its own document and file controls preserve the current graph',async()=>{
  const patch={version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[{id:1,type:'bang',x:40,y:40,params:{}}],edges:[]};
  const p=await mount(true,{documentCurrent:{id:7,label:'patch-7',title:'Buttons.ultra',kind:'patch',patch}});
  assert.equal(p.calls.filter(c=>c.name==='canvas_apply').length,1);assert.equal(p.controller.getState().patch.nodes.length,1);
  assert.equal(p.ids.get('document-title').textContent,'Buttons.ultra');assert.equal(p.ids.get('document-dirty').hidden,true);
  const before=p.controller.export();await p.ids.get('document-new').fire('click');await p.ids.get('document-open').fire('click');
  assert.equal(p.controller.export(),before);assert.ok(p.calls.some(c=>c.name==='document_new'));assert.ok(p.calls.some(c=>c.name==='document_open'));
  await p.windowEvents.fire('keydown',{key:'S',ctrlKey:true,shiftKey:true,target:new Element('input')});assert.ok(p.calls.some(c=>c.name==='document_save'&&c.args.saveAs));
});

test('searchable library opens a new example window and focuses existing native windows',async()=>{
  const p=await mount(true),before=p.controller.export();await p.ids.get('open-help-library').fire('click');
  assert.equal(p.ids.get('help-library').open,true);p.ids.get('help-library-search').value='timing';await p.ids.get('help-library-search').fire('input');
  assert.ok(p.all('help-library-results').some(e=>e.dataset.libraryKey==='example:metro'));
  await p.all('help-library-results').find(e=>e.dataset.libraryKey==='example:metro').fire('click');assert.equal(p.controller.export(),before);
  assert.ok(p.calls.some(c=>c.name==='document_open_help'&&c.args.key==='example:metro'));
  await p.ids.get('open-help-library').fire('click');await p.all('document-windows').find(e=>e.dataset.windowLabel==='patch-2').fire('click');
  assert.ok(p.calls.some(c=>c.name==='document_focus'&&c.args.label==='patch-2'));
});

test('receive binding edits rebuild inlet DOM and remain structural while locked',async()=>{
  const p=await mount();p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[{id:1,type:'receive',x:40,y:40,params:{name:'notes'}}],edges:[]});
  const find=()=>p.all('objects').find(e=>Number(e.dataset.node)===1);assert.equal(descendants(find()).filter(e=>e.dataset.direction==='in').length,0);
  await descendants(find()).find(e=>e.dataset.drag).fire('click');let input=p.all('inspector').find(e=>e.dataset.parameter==='name');assert.equal(input.type,'text');
  input.value='';await input.fire('change');assert.equal(descendants(find()).filter(e=>e.dataset.direction==='in').length,1);
  await p.ids.get('lock-patch').fire('click');await descendants(find()).find(e=>e.dataset.drag).fire('click');input=p.all('inspector').find(e=>e.dataset.parameter==='name');assert.equal(input.disabled,true);
});

test('native menu, close-save and error events reach only their targeted document window',async()=>{
  const listeners=new Set(),bridge=label=>({webviewWindow:{getCurrentWebviewWindow:()=>({label})},event:{listen:async(name,handler,options)=>{
    const listener={name,handler,target:options?.target||{kind:'Any'}};listeners.add(listener);return()=>listeners.delete(listener);
  }}});
  const emit=async(label,name,payload)=>{
    const target={kind:'WebviewWindow',label};
    for(const listener of [...listeners])if(listener.name===name&&(listener.target.kind==='Any'||listener.target.kind===target.kind&&listener.target.label===target.label))await listener.handler({event:name,payload});
  };
  const first=await mount(true,{tauri:bridge('patch-first')}),second=await mount(true,{tauri:bridge('patch-second')});
  await emit('patch-second','document-action','new');
  assert.equal(first.calls.filter(call=>call.name==='document_new').length,0);assert.equal(second.calls.filter(call=>call.name==='document_new').length,1);
  await emit('patch-second','document-save-before-close',null);
  assert.equal(first.calls.filter(call=>call.name==='document_save'||call.name==='document_close_confirmed').length,0);
  assert.equal(second.calls.filter(call=>call.name==='document_save').length,1);assert.equal(second.calls.filter(call=>call.name==='document_close_confirmed').length,1);
  await emit('patch-first','document-error','First patch is busy.');assert.equal(first.ids.get('notice').textContent,'First patch is busy.');assert.notEqual(second.ids.get('notice').textContent,'First patch is busy.');
  await second.dispose();await emit('patch-second','document-action','new');assert.equal(second.calls.filter(call=>call.name==='document_new').length,1);
});

test('native child boot attaches to its owner snapshot and closing the view leaves execution running',async()=>{
  const patch={version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[{id:2,type:'patcher',x:40,y:40,params:{name:'basic'},patcher:{presentation:null,nodes:[{id:3,type:'number',x:40,y:40,params:{value:19}}],edges:[]}}],edges:[]};
  const descriptor={shared:true,id:0,label:'patch-view-1',ownerLabel:'main',title:'Owner.ultra',viewTitle:'basic',kind:'patch',patch,dirty:true,viewPath:[2],authoringRevision:4,runtimeRevision:1,canUndo:true,canRedo:false};
  const listeners=new Map(),tauri={webviewWindow:{getCurrentWebviewWindow:()=>({label:descriptor.label})},event:{listen:async(name,handler)=>{listeners.set(name,handler);return()=>listeners.delete(name);}}};
  const p=await mount(true,{documentCurrent:descriptor,tauri});
  assert.equal(p.calls.filter(call=>call.name==='canvas_apply').length,0);
  assert.deepEqual(p.controller.getState().path,[2]);assert.equal(p.controller.getState().revision,1);
  assert.ok(p.all('objects').some(e=>e.dataset.node==='3'));assert.equal(p.ids.get('document-dirty').hidden,false);
  const changed=JSON.parse(JSON.stringify(descriptor));changed.authoringRevision=5;changed.patch.nodes[0].patcher.nodes[0].x=90;
  await listeners.get('document-changed')({payload:changed});
  assert.equal(p.controller.getState().patch.nodes[0].x,90);assert.equal(p.controller.getState().revision,1);
  await p.dispose();assert.equal(p.calls.filter(call=>call.name==='canvas_stop').length,0);
});

test('native patcher headers request a child window while retaining the parent view',async()=>{
  const patch={version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[{id:2,type:'patcher',x:40,y:40,params:{name:'basic'},patcher:{presentation:null,nodes:[],edges:[]}}],edges:[]};
  const p=await mount(true,{documentCurrent:{shared:true,id:0,label:'main',ownerLabel:'main',title:'Owner.ultra',kind:'patch',patch,dirty:false,viewPath:[],authoringRevision:1,runtimeRevision:1}});
  await p.all('objects').find(e=>e.dataset.node==='2').fire('dblclick');await settle();
  assert.ok(p.calls.some(call=>call.name==='document_open_patcher'&&call.args.node===2));
  assert.deepEqual(p.controller.getState().path,[]);
});

test('console reveal preserves its source revision across pending edits and native routing',async()=>{
  for(const replaceDuringFlush of [false,true]){
    const patch={version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[{id:2,type:'patcher',x:40,y:40,params:{name:'basic'},patcher:{presentation:null,nodes:[{id:3,type:'print',x:40,y:40,params:{label:'source'}}],edges:[]}}],edges:[]};
    const descriptor={shared:true,id:0,label:'main',ownerLabel:'main',title:'Owner.ultra',kind:'patch',patch,dirty:false,viewPath:[],authoringRevision:1,runtimeRevision:1};
    const listeners=new Map(),tauri={webviewWindow:{getCurrentWebviewWindow:()=>({label:'main'})},event:{listen:async(name,handler)=>{listeners.set(name,handler);return()=>listeners.delete(name);}}};
    const p=await mount(true,{documentCurrent:descriptor,tauri});
    p.consoleRecords.push({sequence:1,revision:1,node:3,label:'source',level:0,text:'19',frame:0});
    await p.controller.poll();await p.ids.get('show-console').fire('click');
    const clicking=p.ids.get('console-rows').children[0].children[0].fire('click');
    if(replaceDuringFlush)await listeners.get('document-changed')({payload:{...descriptor,authoringRevision:2,runtimeRevision:2}});
    await clicking;await settle();
    const routes=p.calls.filter(call=>call.name==='document_open_patcher');
    if(replaceDuringFlush)assert.equal(routes.length,0,'A replaced graph must not reveal a reused source ID.');
    else assert.deepEqual(routes.map(call=>call.args),[{node:2,reveal:3,expectedRevision:1}]);
    await p.dispose();
  }
});

test('target windows reject stale reveal descriptors and events with a reused node ID',async()=>{
  const patch={version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[{id:3,type:'print',x:40,y:40,params:{label:'replacement'}}],edges:[]};
  const descriptor={shared:true,id:0,label:'main',ownerLabel:'main',title:'Owner.ultra',kind:'patch',patch,dirty:false,viewPath:[],authoringRevision:2,runtimeRevision:2,revealNode:3,revealRevision:1};
  const listeners=new Map(),tauri={webviewWindow:{getCurrentWebviewWindow:()=>({label:'main'})},event:{listen:async(name,handler)=>{listeners.set(name,handler);return()=>listeners.delete(name);}}};
  const p=await mount(true,{documentCurrent:descriptor,tauri});
  const source=()=>p.all('objects').find(node=>node.dataset.node==='3');
  assert.equal(source().classList.contains('selected'),false);
  await listeners.get('document-reveal')({payload:{node:3,revision:1}});
  assert.equal(source().classList.contains('selected'),false);
  await listeners.get('document-reveal')({payload:{node:3,revision:2}});
  assert.equal(source().classList.contains('selected'),true);
  await p.dispose();
});

test('target reveal adopts an authoritative descriptor ahead of its last broadcast',async()=>{
  const patch={version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[{id:3,type:'print',x:40,y:40,params:{label:'source'}}],edges:[]};
  const descriptor={shared:true,id:0,label:'main',ownerLabel:'main',title:'Owner.ultra',kind:'patch',patch,dirty:false,viewPath:[],authoringRevision:1,runtimeRevision:1};
  const listeners=new Map(),tauri={webviewWindow:{getCurrentWebviewWindow:()=>({label:'main'})},event:{listen:async(name,handler)=>{listeners.set(name,handler);return()=>listeners.delete(name);}}};
  const p=await mount(true,{documentCurrent:descriptor,tauri});
  descriptor.runtimeRevision=2;descriptor.authoringRevision=2;
  await listeners.get('document-reveal')({payload:{node:3,revision:2}});
  assert.equal(p.controller.getState().revision,2);
  assert.ok(p.all('objects').find(node=>node.dataset.node==='3').classList.contains('selected'));
  await p.dispose();
});

test('native reveal waits for shared controller adoption during startup',async()=>{
  const patch={version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[{id:3,type:'print',x:40,y:40,params:{label:'source'}}],edges:[]};
  const descriptor={shared:true,id:0,label:'main',ownerLabel:'main',title:'Owner.ultra',kind:'patch',patch,dirty:false,viewPath:[],authoringRevision:1,runtimeRevision:1};
  const listeners=new Map(),tauri={webviewWindow:{getCurrentWebviewWindow:()=>({label:'main'})},event:{listen:async(name,handler)=>{listeners.set(name,handler);return()=>listeners.delete(name);}}};
  let delivery;
  const p=await mount(true,{documentCurrent:descriptor,tauri,observeInvoke:name=>{
    if(name==='document_current'&&!delivery)delivery=listeners.get('document-reveal')({payload:{node:3,revision:1}});
  }});
  await delivery;
  assert.equal(p.calls.filter(call=>call.name==='canvas_apply').length,0,'Early reveal must not prepare a standalone starter graph.');
  assert.ok(p.all('objects').find(node=>node.dataset.node==='3').classList.contains('selected'));
  await p.dispose();
});

test('native owner broadcast arriving during initial adoption cannot leave a child on an older snapshot',async()=>{
  const tree={version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[{id:2,type:'patcher',x:40,y:40,params:{name:'basic'},patcher:{presentation:null,nodes:[{id:3,type:'number',x:40,y:40,params:{value:0}}],edges:[]}}],edges:[]};
  const initial={shared:true,id:0,label:'patch-view-1',ownerLabel:'main',title:'Owner.ultra',viewTitle:'basic',kind:'patch',dirty:false,viewPath:[2],authoringRevision:1,runtimeRevision:1};
  const newer={...initial,patch:JSON.parse(JSON.stringify(tree)),authoringRevision:2,dirty:true};newer.patch.nodes[0].patcher.nodes[0].x=90;
  const listeners=new Map();let reads=0;
  Object.defineProperty(initial,'patch',{enumerable:true,get(){
    if(++reads===2)queueMicrotask(()=>listeners.get('document-changed')?.({payload:newer}));
    return tree;
  }});
  const tauri={webviewWindow:{getCurrentWebviewWindow:()=>({label:initial.label})},event:{listen:async(name,handler)=>{listeners.set(name,handler);return()=>listeners.delete(name);}}};
  const p=await mount(true,{documentCurrent:initial,tauri});
  assert.equal(p.documents.session.document.authoringRevision,2);
  assert.equal(p.controller.getState().activeDocumentRevision,2);assert.equal(p.controller.getState().patch.nodes[0].x,90);
});

test('native readiness waits for the close-flush event subscription to finish',async()=>{
  let release,currentReads=0;
  const tauri={webviewWindow:{getCurrentWebviewWindow:()=>({label:'main'})},event:{listen:async name=>{
    if(name==='document-flush-before-close')await new Promise(resolve=>{release=resolve;});
    return()=>{};
  }}};
  const mounting=mount(true,{tauri,observeInvoke:name=>{if(name==='document_current')currentReads++;}});
  await settle();assert.equal(currentReads,0);release();
  const page=await mounting;assert.equal(currentReads,1);await page.dispose();
});

test('a close request arriving before initial native adoption binds to the shared controller',async()=>{
  const listeners=new Map(),request={requestLabel:'main',token:4};let closing;
  const descriptor={shared:true,id:0,label:'main',ownerLabel:'main',title:'Owner.ultra',kind:'patch',patch:{version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[],edges:[]},dirty:false,viewPath:[],authoringRevision:0,runtimeRevision:1};
  const tauri={webviewWindow:{getCurrentWebviewWindow:()=>({label:'main'})},event:{listen:async(name,handler)=>{listeners.set(name,handler);return()=>{};}}};
  const page=await mount(true,{documentCurrent:descriptor,tauri,observeInvoke:name=>{
    if(name==='document_current')closing=listeners.get('document-flush-before-close')({payload:request});
  }});
  await closing;assert.equal(page.controller.getState().closing,true);assert.equal(page.ids.get('workspace').inert,true);
  assert.ok(page.calls.some(call=>call.name==='document_close_flushed'));
  await listeners.get('document-close-cancelled')({payload:request});
  assert.equal(page.controller.getState().closing,false);assert.equal(page.ids.get('workspace').inert,false);
  await page.dispose();
});

test('unchanged stopped status polls preserve cable paths while cable inputs invalidate them',async()=>{
  const p=await mount(true),svg=p.ids.get('cables');
  let rebuilds=0,pathWrites=0;
  const replace=svg.replaceChildren.bind(svg),create=p.document.createElementNS;
  svg.replaceChildren=(...children)=>{rebuilds++;replace(...children);};
  p.document.createElementNS=(...args)=>{const element=create(...args),set=element.setAttribute.bind(element);element.setAttribute=(key,value)=>{if(key==='d')pathWrites++;set(key,value);};return element;};
  const original=[...svg.children],edgeCount=p.controller.getState().patch.edges.length;
  assert.equal(original.length,32);assert.equal(original.length,edgeCount*2);
  for(let i=0;i<10;i++)await p.controller.poll();
  assert.equal(pathWrites,0,'Unchanged polls must not write SVG path data');
  assert.equal(rebuilds,0,'Ten unchanged stopped polls must not rebuild the cable SVG');
  assert.deepEqual(svg.children,original);
  const expectRedraw=async action=>{const before=pathWrites;await action();assert.ok(pathWrites>before,'Changed cable inputs must write fresh path data');};
  await expectRedraw(()=>original.find(e=>e.dataset.edge==='0').fire('click'));
  assert.match(svg.children.find(e=>e.dataset.edge==='0').attrs.class,/selected/);
  await expectRedraw(()=>p.ids.get('workspace').fire('wheel',{ctrlKey:true,deltaY:-200,deltaMode:0,clientX:120,clientY:100}));
  const source=p.all('objects').find(e=>e.dataset.node==='1'),outlet=descendants(source).find(e=>e.dataset.direction==='out');
  await expectRedraw(()=>outlet.fire('click'));
  assert.ok(svg.children.some(e=>e.attrs.class==='cable pending-cable'));
  await expectRedraw(()=>p.ids.get('workspace').fire('pointermove',{clientX:240,clientY:180}));
  await p.windowEvents.fire('keydown',{key:'Escape'});
  const port=descendants(source).find(e=>e.dataset.direction==='out');
  port.getBoundingClientRect=()=>({left:30,top:20,width:10,height:10});
  await expectRedraw(()=>p.controller.poll());
  await expectRedraw(()=>p.windowEvents.fire('resize'));
  const node=p.controller.getState().patch.nodes.find(n=>n.id===1);
  await expectRedraw(()=>p.controller.move(node.id,node.x+20,node.y+10));
  await p.controller.flush();
  await expectRedraw(()=>p.controller.disconnect(0));
  await p.controller.flush();
  await p.dispose();
});


// Delayed history still runs through the real shared controller and node views.
async function mountHistoryControl(type='number') {
  let patch=new CanvasDocument({version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[makeNode(type,1,40,50,{value:150})],edges:[]}).document;
  let revision=1,hold=false,release,holdCommit=false,releaseCommit,cancelSave=false;
  const operations=[],past=[],future=[],descriptor=()=>({shared:true,id:1,label:'owner',ownerLabel:'owner',title:'Numeric',kind:'patch',viewPath:[],
    patch:structuredClone(patch),authoringRevision:revision,runtimeRevision:revision,canUndo:past.length>0,canRedo:future.length>0});
  const p=await mount(true,{documentCurrent:descriptor(),invokeOverride:async(name,args,fallback)=>{
    operations.push({name,args});
    if(name==='document_current')return descriptor();
    if(name==='document_commit'){
      if(holdCommit)await new Promise(resolve=>releaseCommit=resolve);
      assert.equal(args.baseRevision,revision);past.push(structuredClone(patch));future.length=0;
      patch=new CanvasDocument(args.patch).document;revision++;
      return{accepted:true,document:descriptor()};
    }
    if(name==='document_history'){
      if(hold)await new Promise(resolve=>release=resolve);
      assert.equal(args.baseRevision,revision);
      const from=args.direction==='undo'?past:future,to=args.direction==='undo'?future:past;
      if(from.length){to.push(structuredClone(patch));patch=from.pop();revision++;}
      return{accepted:true,document:descriptor()};
    }
    if(name==='canvas_status')return{revision,active:true,nodes:[],console:[]};
    if(name==='document_save'&&cancelSave)return null;
    return fallback(name,args);
  }});
  p.controller.parameter(1,'value',20);await p.controller.flush();
  return{...p,operations,get canonical(){return patch;},get ownerRevision(){return revision;},pauseCommit(){holdCommit=true;return()=>{holdCommit=false;releaseCommit();};},cancelNextSave(){cancelSave=true;},async holdHistory(direction){
    hold=true;const promise=p.controller[direction]();await settle();
    return{promise,release(){hold=false;release();}};
  }};
}

test('close flush acknowledges only after the focused shared edit reaches its owner',async()=>{
  const p=await mountHistoryControl();await p.ids.get('lock-patch').fire('click');
  const input=p.all('objects').find(e=>e.dataset.parameter==='value');p.document.activeElement=input;
  input.value='42';await input.fire('input');const start=p.operations.length;
  await p.documents.session.flushBeforeClose({requestLabel:'owner',token:31});
  assert.equal(p.canonical.nodes[0].params.value,42);
  const calls=p.operations.slice(start),commit=calls.findIndex(c=>c.name==='document_commit'),ack=calls.findIndex(c=>c.name==='document_close_flushed');
  assert.ok(commit>=0&&ack>commit);assert.equal(calls.filter(c=>c.name==='document_commit').length,1);
  assert.equal(calls[ack].args.error,undefined);
  await p.dispose();
});
test('owner Save waits for a linked focused draft and its delayed native admission',async()=>{
  let patch=new CanvasDocument({version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[makeNode('number',1,0,0,{value:10}),
    {...makeNode('patcher',3),patcher:{presentation:null,nodes:[makeNode('number',13,0,0,{value:10})],edges:[]}}],edges:[]}).document;
  let revision=1,release;const calls=[],listeners=new Map();
  const descriptor=label=>({shared:true,id:1,label,ownerLabel:'owner',title:'Shared',kind:'patch',viewPath:label==='child'?[3]:[],patch:structuredClone(patch),authoringRevision:revision,runtimeRevision:1,dirty:false});
  const tauri=label=>({event:{listen:async(name,handler)=>{listeners.set(`${label}/${name}`,handler);return()=>{};}},webviewWindow:{getCurrentWebviewWindow:()=>({label})}});
  const invokeOverride=label=>async(name,args,fallback)=>{
    calls.push({label,name,args});
    if(name==='document_current')return descriptor(label);
    if(name==='document_commit'){
      assert.equal(args.baseRevision,revision);await new Promise(resolve=>release=resolve);
      patch=new CanvasDocument(args.patch).document;revision++;return{accepted:true,document:descriptor(label)};
    }
    if(name==='document_save'){
      await listeners.get('child/document-flush-before-save')({payload:{owner:'owner',token:7}});
      calls.push({name:'snapshot',patch:structuredClone(patch)});
      await listeners.get('child/document-save-flush-released')({payload:{owner:'owner',token:7}});
      return descriptor(label);
    }
    if(name==='document_save_flushed')return true;
    if(name==='canvas_status')return{revision:1,active:true,nodes:[],console:[]};
    return fallback(name,args);
  };
  const owner=await mount(true,{documentCurrent:descriptor('owner'),tauri:tauri('owner'),invokeOverride:invokeOverride('owner')});
  const child=await mount(true,{documentCurrent:descriptor('child'),tauri:tauri('child'),invokeOverride:invokeOverride('child')});
  await child.ids.get('lock-patch').fire('click');const input=child.all('objects').find(e=>e.dataset.parameter==='value');
  child.document.activeElement=input;input.value='73';await input.fire('input');
  const saving=owner.documents.action('save');await settle();assert.equal(typeof release,'function');
  assert.equal(calls.some(call=>call.name==='snapshot'||call.name==='document_save_flushed'),false);
  release();assert.equal(await saving,true);
  const commit=calls.findIndex(call=>call.name==='document_commit'),ack=calls.findIndex(call=>call.name==='document_save_flushed'),snapshot=calls.findIndex(call=>call.name==='snapshot');
  assert.ok(commit>=0&&commit<ack&&ack<snapshot);assert.equal(calls.filter(call=>call.name==='document_commit').length,1);
  assert.equal(calls[snapshot].patch.nodes[1].patcher.nodes[0].params.value,73);assert.equal(revision,2);
  await child.dispose();await owner.dispose();
});
test('close flush reports a focused invalid draft without admitting or acknowledging success',async()=>{
  const p=await mountHistoryControl();await p.ids.get('lock-patch').fire('click');
  const input=p.all('objects').find(e=>e.dataset.parameter==='value');p.document.activeElement=input;
  input.value='';await input.fire('input');const start=p.operations.length;
  await assert.rejects(p.documents.session.flushBeforeClose({requestLabel:'owner',token:32}),/invalid focused edit/);
  const calls=p.operations.slice(start);assert.equal(calls.filter(c=>c.name==='document_commit').length,0);
  assert.match(calls.find(c=>c.name==='document_close_flushed').args.error,/invalid focused edit/);
  assert.equal(p.canonical.nodes[0].params.value,20);await p.dispose();
});
test('close acknowledgement waits for delayed owner admission and advances exactly one revision',async()=>{
  const p=await mountHistoryControl();await p.ids.get('lock-patch').fire('click');
  const input=p.all('objects').find(e=>e.dataset.parameter==='value');p.document.activeElement=input;input.value='42';await input.fire('input');
  const before=p.ownerRevision,release=p.pauseCommit(),start=p.operations.length,closing=p.documents.session.flushBeforeClose({requestLabel:'owner',token:33});
  await settle();assert.equal(p.ownerRevision,before);assert.equal(p.operations.slice(start).some(c=>c.name==='document_close_flushed'),false);
  release();await closing;assert.equal(p.ownerRevision,before+1);assert.equal(p.canonical.nodes[0].params.value,42);
  const calls=p.operations.slice(start);assert.equal(calls.filter(c=>c.name==='document_commit').length,1);
  assert.ok(calls.findIndex(c=>c.name==='document_commit')<calls.findIndex(c=>c.name==='document_close_flushed'));await p.dispose();
});
test('cancelled Save As retains the committed focused draft in the owner',async()=>{
  const p=await mountHistoryControl();await p.ids.get('lock-patch').fire('click');
  const input=p.all('objects').find(e=>e.dataset.parameter==='value');p.document.activeElement=input;input.value='42';await input.fire('input');
  const before=p.ownerRevision;p.cancelNextSave();assert.equal(await p.documents.action('save-as'),false);
  assert.equal(p.ownerRevision,before+1);assert.equal(p.canonical.nodes[0].params.value,42);
  assert.equal(p.operations.filter(c=>c.name==='document_save').at(-1).args.saveAs,true);await p.dispose();
});

for(const type of ['number','number_int','flonum'])for(const direction of ['undo','redo']) {
  test(`${type} preserves a rejected ${direction} draft through blur and retries Enter`,async()=>{
    const p=await mountHistoryControl(type);if(direction==='redo')await p.controller.undo();
    const h=await p.holdHistory(direction);await p.ids.get('lock-patch').fire('click');
    const input=descendants(p.all('objects').find(e=>e.dataset.node==='1')).find(e=>e.dataset.parameter==='value');
    p.document.activeElement=input;input.value='73';await input.fire('input');
    await assert.doesNotReject(input.fire('keydown',{key:'Enter'}));
    assert.match(p.controller.getState().notice,/history.*pending/i);
    p.document.activeElement=null;await input.fire('blur');await p.controller.poll();
    assert.equal(input.value,'73','Rejected draft survives blur and status');
    h.release();await h.promise;await p.controller.poll();assert.equal(input.value,'73');
    assert.equal(p.canonical.nodes[0].params.value,direction==='undo'?150:20);
    p.document.activeElement=input;await input.fire('keydown',{key:'Enter'});await p.controller.flush();
    assert.equal(p.canonical.nodes[0].params.value,73);
    p.document.activeElement=null;await input.fire('blur');await p.controller.poll();
    assert.equal(Number(input.value),73);await p.dispose();
  });
}

for(const direction of ['undo','redo'])test(`drag rejected during ${direction} restores preview and accepts a later gesture`,async()=>{
  const p=await mountHistoryControl();if(direction==='redo')await p.controller.undo();
  const h=await p.holdHistory(direction),node=p.all('objects').find(e=>e.dataset.node==='1');
  const header=descendants(node).find(e=>e.dataset.drag==='true'),before=p.controller.getState().patch.nodes[0];
  const gesture=async()=>{
    await header.fire('pointerdown',{pointerId:1,clientX:10,clientY:10});
    await header.fire('pointermove',{pointerId:1,clientX:60,clientY:50});
    assert.equal(node.style.left,`${before.x+50}px`);
    await assert.doesNotReject(header.fire('pointerup',{pointerId:1,clientX:60,clientY:50}));
  };
  await gesture();assert.match(p.controller.getState().notice,/history.*pending/i);
  assert.equal(node.style.left,`${before.x}px`);assert.equal(node.style.top,`${before.y}px`);
  assert.equal(p.canonical.nodes[0].x,before.x);h.release();await h.promise;
  await gesture();await p.controller.flush();assert.equal(p.canonical.nodes[0].x,before.x+50);
  assert.equal(p.canonical.nodes[0].y,before.y+40);await p.dispose();
});


test('a typed draft matching the pre-Undo display still requires admission',async()=>{
  const p=await mountHistoryControl(),h=await p.holdHistory('undo');await p.ids.get('lock-patch').fire('click');
  const input=descendants(p.all('objects').find(e=>e.dataset.node==='1')).find(e=>e.dataset.parameter==='value');
  p.document.activeElement=input;input.value='20';await input.fire('input');await input.fire('keydown',{key:'Enter'});
  assert.match(p.controller.getState().notice,/history.*pending/i);
  h.release();await h.promise;await input.fire('keydown',{key:'Enter'});await p.controller.flush();
  assert.equal(p.canonical.nodes[0].params.value,20);await p.dispose();
});

test('native save-before-close events retain their Quit generation through the page listener',async()=>{
  const listeners=new Map(),tauri={webviewWindow:{getCurrentWebviewWindow:()=>({label:'main'})},
    event:{listen:async(name,handler)=>{listeners.set(name,handler);return()=>listeners.delete(name);}}};
  const p=await mount(true,{tauri});
  await listeners.get('document-save-before-close')({payload:{quitToken:29}});
  assert.deepEqual(p.calls.find(call=>call.name==='document_close_confirmed').args,{quitToken:29});
  assert.equal(p.calls.some(call=>call.name==='document_cancel_close'),false);await p.dispose();
});

test('range thumb reflects the admitted endpoint in the same pointer dispatch',async()=>{
  const p=await mount(false);
  p.controller.load({version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[{id:1,type:'slider',x:40,y:40,params:{size:101,value:0}}],edges:[]});
  await p.controller.flush();await p.ids.get('lock-patch').fire('click');
  const element=p.all('objects').find(e=>e.dataset.node==='1');
  element.closest=()=>null;
  const dispatch=(type,x)=>{const event={type,target:element,button:0,pointerId:1,clientX:x,clientY:45,preventDefault(){},stopPropagation(){}};for(const listener of element.listeners[type]??[])listener(event);};
  dispatch('pointerdown',80);dispatch('pointermove',150);dispatch('pointermove',160);dispatch('pointerup',160);
  assert.equal(JSON.parse(p.controller.export()).nodes[0].params.value,100);
  assert.equal(element.style['--slider-position'],'1');
});
