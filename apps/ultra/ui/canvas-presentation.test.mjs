import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CanvasDocument,createCanvasController,makeNode,REGISTRY,structuralParameter,validatePatch} from './canvas-model.mjs';
const corpus=JSON.parse(readFileSync(new URL('./canvas-presentation-cases.json',import.meta.url)));
const valid=()=>structuredClone(corpus[0].document);
test('current schema accepts an explicit saved surface and rejects unsupported presentation versions',()=>{
  const patch=valid(),p=patch.presentation;
  assert.deepEqual(validatePatch(patch).presentation,p);
  assert.throws(()=>validatePatch({...patch,presentation:{...p,version:2}}));
  assert.deepEqual(validatePatch({...patch,presentation:{...p,items:[]}}).presentation.items,[]);
});
test('shared presentation corpus validates closed records, scope, identity, geometry and supported targets',async()=>{
  const {validatePresentation}=await import('./canvas-presentation.mjs');
  for(const entry of corpus){
    const registry=entry.profiles?{...REGISTRY,live_device:{profiles:Object.values(entry.profiles)}}:REGISTRY;
    const check=()=>validatePresentation(entry.document,registry,structuralParameter);
    if(entry.valid)assert.doesNotThrow(check,entry.name);else assert.throws(check,undefined,entry.name);
    if(!entry.profiles){const publicCheck=()=>validatePatch(entry.document);if(entry.valid)assert.doesNotThrow(publicCheck,entry.name);else assert.throws(publicCheck,undefined,entry.name);}
  }
});
test('presentation history changes no execution revision or native apply count',async()=>{
  let applies=0;
  const controller=createCanvasController({patch:valid(),invoke:async(name)=>{
    if(name==='canvas_apply')return {revision:++applies};
    if(name==='canvas_status')return {revision:applies,active:false,nodes:[]};
    return {};
  }});
  await controller.prepare();const before=controller.getState(),count=applies;
  const p=structuredClone(before.patch.presentation);p.size.width=700;
  controller.setPresentation(p);controller.updatePresentationItem('level',{rect:{x:20,y:10,width:72,height:88}});
  await controller.undo();await controller.undo();await controller.redo();await controller.redo();await controller.flush();
  assert.equal(applies,count);
  const after=controller.getState();
  assert.equal(after.desiredRevision,before.desiredRevision);assert.equal(after.activeDocumentRevision,before.activeDocumentRevision);
  assert.equal(after.patch.presentation.items[0].rect.x,20);
});
test('deletion removes dependent ancestor and nested items atomically; incompatible retype refuses',()=>{
  const document=new CanvasDocument(valid());
  assert.throws(()=>document.configure(1,'bang',{}));
  assert.equal(document.patch.nodes[0].type,'toggle');
  document.remove(1);assert.equal(document.patch.presentation.items.length,0);
  document.undo();assert.equal(document.patch.presentation.items.length,1);
});
test('duplicating authored subtrees remaps node and document-wide item identities',()=>{
  const document=new CanvasDocument(valid());
  const ids=document.duplicateMany([1],{dx:20,dy:20});
  assert.equal(ids.length,1);assert.notEqual(ids[0],1);
  const items=document.patch.presentation.items;
  assert.equal(items.length,2);assert.notEqual(items[0].id,items[1].id);assert.equal(items[1].target.node,ids[0]);
  document.undo();assert.equal(document.patch.presentation.items.length,1);
});
test('one committed rectangle gesture has one history entry; invalid edits preserve the saved surface',()=>{
  const document=new CanvasDocument(valid());
  document.updatePresentationItem('level',{rect:{x:24,y:16,width:72,height:88}});
  assert.equal(document.past.length,1);assert.equal(document.patch.presentation.items[0].rect.x,24);
  const saved=structuredClone(document.document);
  assert.throws(()=>document.updatePresentationItem('level',{rect:{x:639,y:8,width:72,height:88}}));
  assert.deepEqual(document.document,saved);assert.equal(document.past.length,1);
  document.undo();assert.equal(document.patch.presentation.items[0].rect.x,8);
});
test('nested copies remap owned surface identities and deleting a subtree removes ancestor targets',()=>{
  const patch=valid(),child=structuredClone(patch.presentation);
  child.items[0].id='nested_level';child.items[0].target.node=4;
  patch.nodes.push({...makeNode('patcher',5),patcher:{presentation:child,nodes:[makeNode('toggle',4)],edges:[]}});
  patch.presentation.items[0].target.node=4;
  const document=new CanvasDocument(patch),[copyId]=document.duplicateMany([5]);
  const copy=document.patch.nodes.find(node=>node.id===copyId);
  assert.notEqual(copy.patcher.presentation.items[0].id,'nested_level');
  assert.equal(copy.patcher.presentation.items[0].target.node,copy.patcher.nodes[0].id);
  document.remove(5);
  assert.equal(document.patch.presentation.items.some(item=>item.target.node===4),false);
  document.undo();assert.equal(document.patch.presentation.items.some(item=>item.target.node===4),true);
});
test('device packaging preserves an authored surface and accepts zero exposed parameters',async()=>{
  const {subtractivePatch,packageInstrument}=await import('./canvas-instrument.mjs');
  const patch=subtractivePatch();delete patch.device;
  patch.presentation.items=patch.presentation.items.slice(0,1);patch.presentation.items[0].label='Authored';
  const packaged=packageInstrument(patch);
  assert.deepEqual(packaged.presentation,patch.presentation);
  packaged.presentation.items=[];packaged.device.parameters=[];packaged.device.presets=[];
  assert.doesNotThrow(()=>validatePatch(packaged));
  assert.throws(()=>validatePatch({...packaged,presentation:null}));
  assert.throws(()=>validatePatch({...packaged,device:{...packaged.device,version:1}}));
});
test('hierarchy lowering omits surface metadata from the executable graph',async()=>{
  const {lowerHierarchy}=await import('./canvas-hierarchy.mjs');
  const graph=lowerHierarchy(valid());assert.equal(Object.hasOwn(graph,'presentation'),false);
  const document=new CanvasDocument(valid()),before=JSON.stringify(graph);
  document.updatePresentationItem('level',{label:'Renamed'});
  assert.equal(JSON.stringify(lowerHierarchy(document.document)),before);
});
function admissionFixture(){
  const patch=valid(),child=structuredClone(patch.presentation);
  child.items[0].id='nested_level';child.items[0].target.node=4;
  patch.nodes.push({...makeNode('patcher',5),patcher:{presentation:child,nodes:[makeNode('toggle',4)],edges:[]}});
  return patch;
}
for(const admission of ['constructor','replacement'])test(`hierarchical ${admission} detaches root and nested presentations from inputs and sibling documents`,()=>{
  const input=admissionFixture();
  const documents=Array.from({length:2},()=>{
    if(admission==='constructor')return new CanvasDocument(input);
    const document=new CanvasDocument(valid());document.replace(input);return document;
  });
  const expected=structuredClone(documents[0].document),histories=documents.map(document=>document.past.length);
  for(const presentation of [input.presentation,input.nodes.at(-1).patcher.presentation]){
    presentation.size.width=0;presentation.items[0].rect.x=8192;
    presentation.items[0].target.node=999;presentation.items[0].style.accent='invalid';
    presentation.items[0].label='Mutated input';
  }
  documents.forEach((document,index)=>{assert.deepEqual(document.document,expected);assert.equal(document.past.length,histories[index]);});
  documents[0].updatePresentationItem('level',{label:'First document'});
  assert.deepEqual(documents[1].document,expected);
});
test('generic packaging turns an explicit null root into a deliberate empty surface',async()=>{
  const {subtractivePatch,packageInstrument}=await import('./canvas-instrument.mjs');
  const patch=subtractivePatch();delete patch.device;patch.presentation=null;
  assert.deepEqual(packageInstrument(patch).presentation.items,[]);
  assert.equal(patch.presentation,null);
  assert.deepEqual(subtractivePatch().presentation.items.map(item=>item.id),['attack','decay','sustain','release','cutoff','resonance','level']);
});
