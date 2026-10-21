import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';

// This executes the real page module with a small DOM adapter. It does not prove rendered geometry or native sound.
class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.dataset={};this.style={setProperty(key,value){this[key]=value;},removeProperty(key){delete this[key];}};this.attrs={};this.value='';this.disabled=false;this.open=false;this.hidden=false;this.textContent='';this.scrollLeft=0;this.scrollTop=0;
    const classes=new Set();this.classList={add:n=>classes.add(n),remove:n=>classes.delete(n),toggle:(n,v)=>{if(v??!classes.has(n))classes.add(n);else classes.delete(n);},contains:n=>classes.has(n)};
  }
  append(...children){this.children.push(...children);for(const c of children)if(typeof c==='object')c.parentElement=this;}
  replaceChildren(...children){this.children=[];this.append(...children);}
  setAttribute(k,v){this.attrs[k]=String(v);}
  addEventListener(k,f){(this.listeners[k]??=[]).push(f);}
  removeEventListener(){}
  getBoundingClientRect(){return{left:0,top:0,width:160,height:90};}
  setPointerCapture(){} releasePointerCapture(){} focus(){} select(){} click(){return this.fire('click');}
  showModal(){this.open=true;}close(){this.open=false;}
  async fire(type,extra={}){const e={type,target:this,button:0,preventDefault(){},stopPropagation(){},...extra};await Promise.all((this.listeners[type]||[]).map(f=>f(e)));}
}
const descendants=e=>e.children.filter(x=>typeof x==='object').flatMap(x=>[x,...descendants(x)]);
const settle=()=>new Promise(r=>setImmediate(r));
async function mount(native=false){
  const html=readFileSync(new URL('./canvas.html',import.meta.url),'utf8'),ids=new Map();
  for(const[,tag,id]of html.matchAll(/<([\w-]+)\b[^>]*\bid="([^"]+)"/g))ids.set(id,new Element(tag));
  ids.get('object-entry').hidden=true;
  const documentEvents=new Element(),windowEvents=new Element(),calls=[],timeouts=[],navigations=[],observed={};let revision=0,running=false,patch;
  const document={querySelector:s=>{const e=ids.get(s.slice(1));assert.ok(e,`HTML must contain ${s}`);return e;},createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t),addEventListener:(...a)=>documentEvents.addEventListener(...a),hidden:false,activeElement:null};
  const window={addEventListener:(...a)=>windowEvents.addEventListener(...a),setTimeout:(fn,ms)=>{timeouts.push({fn,ms});return timeouts.length;},clearTimeout(){},location:{assign:href=>navigations.push(href)}};
  ids.get('legacy-link').href='index.html';ids.get('lab-link').href='chord-lab.html';
  const invoke=native?async(name,args={})=>{calls.push({name,args});if(name==='audio_devices')return{config:{host:'default',device:'default',sample_rate:48000,buffer_frames:null},hosts:['PipeWire'],effective_host:'PipeWire',devices:[{id:'default',name:'System default - Speakers',compatible:true}],notice:'Audio is off.'};if(name==='canvas_apply'){patch=args.patch;return{revision:++revision};}if(name==='audio_start')running=true;if(name==='audio_stop')running=false;if(name==='audio_status')return{running};if(name==='canvas_status')return{revision,active:true,nodes:patch.nodes.map(n=>({id:n.id,value:0,pulses:0,...observed[n.id]}))};return true;}:undefined;
  const {mountCanvas}=await import('./canvas.mjs');const page=mountCanvas({document,window,invoke});await page.controller.flush();await settle();
  return{...page,ids,calls,timeouts,navigations,observed,windowEvents,documentEvents,all:id=>descendants(ids.get(id))};
}
test('browser page mounts editable palette, honest preview, and exclusively top/bottom typed ports',async()=>{
  const p=await mount();assert.equal(p.ids.get('preview-banner').hidden,false);assert.equal(p.ids.get('start-audio').disabled,true);
  assert.equal(p.all('palette').filter(e=>e.dataset.add).length,25);
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
test('focus loss stops native graph and safe navigation awaits audio cleanup',async()=>{
  const p=await mount(true);await p.ids.get('start-audio').fire('click');await p.windowEvents.fire('blur');assert.ok(p.calls.some(c=>c.name==='canvas_stop'));
  await p.ids.get('legacy-link').fire('click');assert.equal(p.calls.at(-1).name,'audio_stop');assert.deepEqual(p.navigations,['index.html']);
});
test('import replacing a reused node ID rebuilds its type-specific controls and ports',async()=>{
  const p=await mount();p.controller.load({version:1,profile:'ultra-canvas-v1',nodes:[{id:1,type:'join',x:50,y:50,params:{}}],edges:[]});
  const node=p.all('objects').find(e=>Number(e.dataset.node)===1),ports=descendants(node).filter(e=>e.dataset.direction);assert.equal(ports.length,3);assert.equal(ports.filter(e=>e.dataset.portType==='mono').length,2);assert.ok(!descendants(node).some(e=>e.dataset.trigger));
});
test('consecutive palette objects are placed without overlapping headers or ports',async()=>{
  const p=await mount();await p.ids.get('new-patch').fire('click');await p.all('palette').find(e=>e.dataset.add==='bang').fire('click');await p.all('palette').find(e=>e.dataset.add==='number').fire('click');
  const[a,b]=p.controller.getState().patch.nodes;assert.ok(Math.abs(a.x-b.x)>=176||Math.abs(a.y-b.y)>=112);
});
test('keyboard creation rejects unknown objects and Escape cancels without mutating the patch',async()=>{
  const p=await mount();await p.ids.get('new-patch').fire('click');
  await p.windowEvents.fire('keydown',{key:'n'});
  assert.equal(p.ids.get('object-entry').hidden,false);
  const input=p.ids.get('object-text');input.value='cycle~ 440';await input.fire('input');
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
test('locking cancels an in-flight move and disables already-open runnable help',async()=>{
  const p=await mount();const node=p.all('objects').find(e=>Number(e.dataset.node)===15),header=descendants(node).find(e=>e.dataset.drag);
  await header.fire('click');await p.ids.get('show-help').fire('click');
  const example=p.all('help-content').find(e=>e.textContent==='Open runnable example patch');assert.ok(example);assert.equal(example.disabled,false);
  const before=p.controller.export();await header.fire('pointerdown',{pointerId:1,clientX:300,clientY:100});await header.fire('pointermove',{pointerId:1,clientX:340,clientY:160});
  await p.ids.get('lock-patch').fire('click');await header.fire('pointermove',{pointerId:1,clientX:380,clientY:180});await header.fire('pointerup',{pointerId:1});
  assert.equal(p.controller.export(),before);
  assert.ok(!p.all('help-content').some(e=>e.textContent==='Open runnable example patch'&&!e.disabled));
  await example.fire('click');assert.equal(p.controller.export(),before);
});

test('new variadic objects rebuild node-aware ports after configuration changes',async()=>{
  const p=await mount();
  p.controller.load({version:1,profile:'ultra-canvas-v1',nodes:[{id:1,type:'pack',x:40,y:40,params:{args:'0 0'}}],edges:[]});
  const find=()=>p.all('objects').find(e=>Number(e.dataset.node)===1);
  assert.equal(descendants(find()).filter(e=>e.dataset.direction==='in').length,2);
  p.controller.parameter(1,'args','0 f s 0');
  assert.equal(descendants(find()).filter(e=>e.dataset.direction==='in').length,4);
  const fourth=descendants(find()).find(e=>e.dataset.direction==='in'&&e.dataset.port==='3');
  await fourth.fire('pointerenter');assert.match(p.ids.get('assist').textContent,/cold/i);
  await fourth.fire('contextmenu');assert.ok(p.ids.get('context-menu').children.length);
  await p.ids.get('context-menu').children.find(e=>e.textContent==='Help for pack').fire('click');
  assert.equal(p.all('help-content').filter(e=>e.className==='help-port').length,5);
  p.controller.parameter(1,'args','0 0 0');
  assert.equal(p.all('help-content').filter(e=>e.className==='help-port').length,4);
});
test('locked flonum and slider emit hot native events with audio off, Tab emits a selector and observations display',async()=>{
  const p=await mount(true);
  p.controller.load({version:1,profile:'ultra-canvas-v1',nodes:[{id:1,type:'flonum',x:40,y:40,params:{}},{id:2,type:'slider',x:40,y:100,params:{}}],edges:[]});
  await p.controller.flush();await p.ids.get('lock-patch').fire('click');
  const input=id=>descendants(p.all('objects').find(e=>Number(e.dataset.node)===id)).find(e=>e.dataset.parameter==='value');
  assert.ok(input(1));assert.ok(input(2));
  input(1).value='3.5';await input(1).fire('change');input(2).value='42';await input(2).fire('input');await input(2).fire('change');
  await input(1).fire('keydown',{key:'Tab'});await p.controller.flush();
  assert.ok(p.calls.some(c=>c.name==='canvas_event'&&c.args.node===1&&c.args.value[0]===3.5));
  assert.ok(p.calls.some(c=>c.name==='canvas_event'&&c.args.node===2&&c.args.value[0]===42));
  assert.ok(p.calls.some(c=>c.name==='canvas_event'&&c.args.node===1&&c.args.value==='tab'));
  assert.ok(!p.calls.some(c=>c.name==='audio_start'));
  p.observed[1]={value:7.125,pulses:1};p.observed[2]={value:61,pulses:1};await p.controller.poll();
  assert.equal(Number(input(1).value),7.125);assert.equal(Number(input(2).value),61);
  await input(1).fire('keydown',{key:'Tab'});await p.controller.flush();
  const exported=JSON.parse(p.controller.export());assert.equal(exported.nodes[0].params.value,3.5);assert.equal(exported.nodes[1].params.value,42);
});

test('flonum Tab commits pending text before the native second-outlet event',async()=>{
  const p=await mount(true);
  p.controller.load({version:1,profile:'ultra-canvas-v1',nodes:[{id:1,type:'flonum',x:40,y:40,params:{}}],edges:[]});
  await p.controller.flush();await p.ids.get('lock-patch').fire('click');
  const input=p.all('objects').find(e=>e.dataset.parameter==='value');
  input.value='5.25';await input.fire('input');await input.fire('keydown',{key:'Tab'});await input.fire('change');await p.controller.flush();
  assert.deepEqual(p.calls.filter(c=>c.name==='canvas_event').map(c=>c.args.value),[[5.25],'tab']);
});

test('slider pointer values remain raw and offset/multiplier apply only to the output readout',async()=>{
  const p=await mount(true);
  p.controller.load({version:1,profile:'ultra-canvas-v1',nodes:[{id:1,type:'slider',x:40,y:40,params:{min:10,mult:2,size:6}}],edges:[]});
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
  p.controller.load({version:1,profile:'ultra-canvas-v1',nodes:[{id:1,type:'line',x:40,y:40,params:{}}],edges:[]});
  await p.controller.flush();
  const node=p.all('objects').find(e=>Number(e.dataset.node)===1);
  await node.fire('contextmenu');await p.ids.get('context-menu').children.find(e=>e.textContent==='Help for line').fire('click');
  await p.all('help-content').find(e=>e.textContent==='Open runnable example patch').fire('click');await p.controller.flush();
  const patch=JSON.parse(p.controller.export());assert.ok(patch.nodes.some(n=>n.type==='line'));
  assert.ok(patch.nodes.some(n=>n.type==='message'));assert.ok(patch.edges.length);
  assert.equal(p.calls.filter(c=>['audio_start','canvas_event'].includes(c.name)).length,0);
});
