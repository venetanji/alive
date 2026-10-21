import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {REGISTRY, CanvasDocument, createCanvasController, makeNode, parsePatch, serializePatch, validatePatch} from './canvas-model.mjs';

const patch = (type='number', style) => ({version:1,profile:'ultra-canvas-v1',nodes:[{...makeNode(type,1),...(style===undefined?{}:{style})}],edges:[]});

test('optional display style round-trips without changing the required legacy document fields', () => {
  const source=patch('number',{bgcolor:[0.1,0.2,0.3,0.4],fontsize:18,width:180,height:44,triangle:0});
  assert.deepEqual(parsePatch(serializePatch(source)).nodes[0].style,source.nodes[0].style);
  assert.equal(Object.hasOwn(validatePatch(patch()).nodes[0],'style'),false);
});

test('JS consumes the shared valid and invalid appearance cases used by Rust preparation', () => {
  const cases=JSON.parse(readFileSync(new URL('./canvas-appearance-cases.json',import.meta.url),'utf8'));
  for(const item of cases.valid)assert.doesNotThrow(()=>validatePatch(patch(item.type,item.style)),item.name);
  for(const item of cases.invalid)assert.throws(()=>validatePatch(patch(item.type,item.style)),undefined,item.name);
});

test('appearance metadata exposes applicable Max attributes and immutable constraints', async () => {
  const {appearanceFields}=await import('./canvas-appearance.mjs');
  for(const type of Object.keys(REGISTRY)) {
    const fields=appearanceFields(type);
    assert.ok(fields.some(field=>field.key==='fontsize'));
    assert.ok(fields.every(field=>field.label&&['number','color','enum'].includes(field.kind)));
    assert.throws(()=>fields.push({key:'unknown'}),TypeError);
  }
  const orientation=appearanceFields('slider').find(field=>field.key==='orientation');
  assert.deepEqual(orientation.options,[{value:0,label:'Automatic'},{value:1,label:'Horizontal'},{value:2,label:'Vertical'}]);
  assert.ok(appearanceFields('bang').some(field=>field.key==='blinkcolor'));
  assert.ok(!appearanceFields('number').some(field=>field.key==='blinkcolor'));
  assert.throws(()=>appearanceFields('unknown'),/unknown object/i);
});

test('style validation rejects nonfinite numbers and clones RGBA input rather than retaining caller state', async () => {
  const {validateStyle}=await import('./canvas-appearance.mjs');
  const source={bgcolor:[0,0.25,0.5,1],width:20};
  const result=validateStyle('number',source);
  source.bgcolor[0]=1;
  assert.deepEqual(result.bgcolor,[0,0.25,0.5,1]);
  for(const value of [NaN,Infinity,-Infinity]) {
    assert.throws(()=>validateStyle('number',{width:value}));
    assert.throws(()=>validateStyle('number',{bgcolor:[0,0,value,1]}));
  }
  assert.throws(()=>validateStyle('number',{bgcolor:[0,,0,1]}));
  assert.throws(()=>validateStyle('number',{bgcolor:[0,undefined,0,1]}));
  assert.throws(()=>validateStyle('unknown',{}),/unknown object/i);
});

test('document styles are atomic undoable overrides, including individual and whole resets', () => {
  const doc=new CanvasDocument(patch());
  const color=[0.1,0.2,0.3,1];
  assert.equal(doc.style(1,'bgcolor',color),true);
  color[0]=1;
  assert.deepEqual(doc.patch.nodes[0].style.bgcolor,[0.1,0.2,0.3,1]);
  assert.equal(doc.style(1,'bgcolor',[0.1,0.2,0.3,1]),false);
  assert.equal(doc.past.length,1);
  const before=serializePatch(doc.patch);
  assert.throws(()=>doc.style(1,'width',2));
  assert.throws(()=>doc.style(1,'unknown',null));
  assert.throws(()=>doc.style(2,'width',80));
  assert.equal(serializePatch(doc.patch),before);
  assert.equal(doc.past.length,1);
  doc.style(1,'fontsize',20,{history:false});
  assert.equal(doc.past.length,1);
  doc.style(1,'bgcolor',null);
  assert.deepEqual(doc.patch.nodes[0].style,{fontsize:20});
  doc.undo();assert.deepEqual(doc.patch.nodes[0].style,{bgcolor:[0.1,0.2,0.3,1],fontsize:20});
  doc.style(1,null);
  assert.equal(Object.hasOwn(doc.patch.nodes[0],'style'),false);
  doc.undo();assert.equal(doc.patch.nodes[0].style.fontsize,20);
  doc.redo();assert.equal(Object.hasOwn(doc.patch.nodes[0],'style'),false);
  assert.equal(doc.style(1,null),false);
});

test('configure preserves shared styles and filters only attributes unavailable on the new type', () => {
  const doc=new CanvasDocument(patch('toggle',{width:20,bgcolor:[0,0,0,1],checkedcolor:[0,1,0,1]}));
  doc.configure(1,'toggle',{value:1});
  assert.deepEqual(doc.patch.nodes[0].style,{width:20,bgcolor:[0,0,0,1],checkedcolor:[0,1,0,1]});
  doc.configure(1,'number',{value:3});
  assert.deepEqual(doc.patch.nodes[0].style,{width:20,bgcolor:[0,0,0,1]});
  doc.undo();assert.deepEqual(doc.patch.nodes[0].style.checkedcolor,[0,1,0,1]);
  const unchanged=serializePatch(doc.patch);
  assert.throws(()=>doc.configure(1,'number',{unknown:1}));
  assert.equal(serializePatch(doc.patch),unchanged);
});

function nativeHost() {
  const calls=[];let current,revision=0;
  return {calls,invoke:async(name,args={})=>{
    calls.push({name,args});
    if(name==='canvas_apply'){current=structuredClone(args.patch);return {revision:++revision};}
    if(name==='canvas_status')return {revision,active:true,nodes:current.nodes.map(node=>({id:node.id,value:7,pulses:3}))};
    if(name==='audio_status')return {running:false,fault:false,server_lost:false};
    return true;
  }};
}

test('controller style edits and history retain native revisions observations and queued events without IPC', async () => {
  const host=nativeHost(),controller=createCanvasController({invoke:host.invoke,patch:patch()});
  await controller.prepare();await controller.poll();
  const before=controller.getState(),exported=controller.export(),calls=host.calls.length;
  controller.style(1,'fontsize',20);await controller.flush();
  assert.notEqual(controller.export(),exported);
  assert.equal(controller.getState().canUndo,true);
  controller.undo();assert.equal(controller.export(),exported);
  controller.redo();assert.equal(controller.getState().patch.nodes[0].style.fontsize,20);
  controller.style(1,null);controller.undo();await controller.flush();
  const after=controller.getState();
  assert.equal(after.revision,before.revision);
  assert.equal(after.desiredRevision,before.desiredRevision);
  assert.equal(after.activeDocumentRevision,before.activeDocumentRevision);
  assert.equal(after.ready,true);
  assert.deepEqual(after.observations,before.observations);
  assert.equal(host.calls.length,calls);
});

test('styles changed while apply is pending do not create a second graph or discard the style', async () => {
  const host=nativeHost();let release;
  const controller=createCanvasController({patch:patch(),invoke:async(name,args)=>{
    if(name==='canvas_apply')await new Promise(resolve=>release=resolve);
    return host.invoke(name,args);
  }});
  const applying=controller.prepare();
  controller.style(1,'width',80);
  release();await applying;await controller.flush();
  assert.equal(host.calls.filter(call=>call.name==='canvas_apply').length,1);
  assert.equal(controller.getState().patch.nodes[0].style.width,80);
  assert.equal(controller.getState().ready,true);
});

test('styling leaves accepted native events in flight and in the queue', async () => {
  const host=nativeHost();let release,first=true;
  const controller=createCanvasController({patch:patch(),invoke:async(name,args)=>{
    if(name==='canvas_event'&&first){first=false;await new Promise(resolve=>release=resolve);}
    return host.invoke(name,args);
  }});
  await controller.prepare();
  const firstEvent=controller.event(1,0,[4]);controller.event(1,0,[5]);
  controller.style(1,'textcolor',[0,1,0,1]);
  release();await firstEvent;await controller.flush();
  assert.deepEqual(host.calls.filter(call=>call.name==='canvas_event').map(call=>call.args.value),[[4],[5]]);
});
