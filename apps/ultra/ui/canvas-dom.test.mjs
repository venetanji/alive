import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';

// This executes the real page module with a small DOM adapter. It does not prove rendered geometry or native sound.
class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.listeners={};this.dataset={};this.style={};this.attrs={};this.value='';this.disabled=false;this.open=false;this.hidden=false;this.textContent='';this.scrollLeft=0;this.scrollTop=0;
    const classes=new Set();this.classList={toggle:(n,v)=>{if(v??!classes.has(n))classes.add(n);else classes.delete(n);},contains:n=>classes.has(n)};
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
  const documentEvents=new Element(),windowEvents=new Element(),calls=[],timeouts=[],navigations=[];let revision=0,running=false,patch;
  const document={querySelector:s=>{const e=ids.get(s.slice(1));assert.ok(e,`HTML must contain ${s}`);return e;},createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t),addEventListener:(...a)=>documentEvents.addEventListener(...a),hidden:false,activeElement:null};
  const window={addEventListener:(...a)=>windowEvents.addEventListener(...a),setTimeout:(fn,ms)=>{timeouts.push({fn,ms});return timeouts.length;},clearTimeout(){},location:{assign:href=>navigations.push(href)}};
  ids.get('legacy-link').href='index.html';ids.get('lab-link').href='chord-lab.html';
  const invoke=native?async(name,args={})=>{calls.push({name,args});if(name==='canvas_apply'){patch=args.patch;return{revision:++revision};}if(name==='audio_start')running=true;if(name==='audio_stop')running=false;if(name==='audio_status')return{running};if(name==='canvas_status')return{revision,active:true,nodes:patch.nodes.map(n=>({id:n.id,value:0,pulses:0}))};return true;}:undefined;
  const {mountCanvas}=await import('./canvas.mjs');const page=mountCanvas({document,window,invoke});await page.controller.flush();await settle();
  return{...page,ids,calls,timeouts,navigations,windowEvents,documentEvents,all:id=>descendants(ids.get(id))};
}
test('browser page mounts editable palette, honest preview, and exclusively top/bottom typed ports',async()=>{
  const p=await mount();assert.equal(p.ids.get('preview-banner').hidden,false);assert.equal(p.ids.get('start-audio').disabled,true);
  assert.equal(p.all('palette').filter(e=>e.dataset.add).length,15);
  const ports=p.all('objects').filter(e=>e.dataset.direction);assert.ok(ports.length>30);
  for(const port of ports)assert.equal(port.dataset.side,port.dataset.direction==='in'?'top':'bottom');
  await p.ids.get('export-patch').fire('click');assert.equal(p.ids.get('patch-dialog').open,true);assert.equal(JSON.parse(p.ids.get('patch-json').value).profile,'ultra-canvas-v1');assert.equal(p.calls.length,0);
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
  text.value='not a valid message';await text.fire('change');assert.equal(p.controller.getState().patch.nodes.find(n=>n.id===14).params.text,'60 100');assert.match(p.ids.get('notice').textContent,/literal|Message/);
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
