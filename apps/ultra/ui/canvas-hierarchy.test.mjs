import test from 'node:test';
import assert from 'node:assert/strict';
import {CanvasDocument, createCanvasController, makeNode, parsePatch, serializePatch, validatePatch} from './canvas-model.mjs';
import {lowerHierarchy} from './canvas-hierarchy.mjs';

const wire=(from,to,outlet=0,inlet=0)=>({from,outlet,to,inlet});
const copy=value=>JSON.parse(JSON.stringify(value));
const nested=()=>({version:2,profile:'ultra-patcher-v2',nodes:[
  makeNode('message',1,40,40,{text:'7'}),
  {id:2,type:'patcher',x:40,y:100,params:{name:'basic'},patcher:{nodes:[
    {id:3,type:'inlet',x:40,y:30,params:{}},makeNode('add',4,40,90,{rhs:10}),
    {id:5,type:'outlet',x:40,y:150,params:{}},
    {id:7,type:'comment',x:150,y:30,params:{text:'A shared embedded patcher.'}},
  ],edges:[wire(3,4),wire(4,5)]}},makeNode('number',6,40,160),
],edges:[wire(1,2),wire(2,6)]});

test('v2 hierarchy round trips the complete tree and preserves v1 strictness',()=>{
  const patch=validatePatch(nested());
  assert.equal(parsePatch(serializePatch(patch)).nodes[1].patcher.nodes[3].params.text,'A shared embedded patcher.');
  assert.throws(()=>validatePatch({...nested(),version:1,profile:'ultra-canvas-v1'}),/version 2|hierarch|Unknown node field/);
  const extra=nested();extra.nodes[1].patcher.unrecognized=true;
  assert.throws(()=>validatePatch(extra),/Unknown/);
});
test('hierarchy midpoints stay in their source scope and are stripped explicitly from native lowering',()=>{
  const patch=nested();patch.edges[0].midpoints=[];patch.edges[1].midpoints=[0,4000];
  patch.nodes[1].patcher.edges[0].midpoints=[30.5,40,30.5,40];
  const valid=validatePatch(patch);assert.deepEqual(parsePatch(serializePatch(valid)),valid);
  assert.ok(lowerHierarchy(valid).edges.every(edge=>Object.keys(edge).sort().join(',')==='from,inlet,outlet,to'));
  const doc=new CanvasDocument(valid);doc.enter(2);doc.moveMany([{id:3,x:50,y:35},{id:4,x:50,y:95}]);
  assert.deepEqual(doc.patch.edges[0].midpoints,[40.5,45,40.5,45]);assert.deepEqual(doc.document.edges[1].midpoints,[0,4000]);
  for(const midpoints of [null,[1],Array(258).fill(0),[4001,0],[0,'1']]){
    const invalid=nested();invalid.nodes[1].patcher.edges[0].midpoints=midpoints;assert.throws(()=>validatePatch(invalid),/midpoint/i);
  }
});

test('global IDs and authoring scopes are checked before flattening',()=>{
  const duplicate=nested();duplicate.nodes[1].patcher.nodes[3].id=6;
  assert.throws(()=>validatePatch(duplicate),/Duplicate.*ID/i);
  const crossing=nested();crossing.nodes[1].patcher.edges.push(wire(1,4));
  assert.throws(()=>validatePatch(crossing),/missing|scope/i);
  const hiddenInput=nested();hiddenInput.nodes[1].patcher.edges.push(wire(4,3));
  assert.throws(()=>validatePatch(hiddenInput),/inlet|port/i);
});

test('virtual objects reject explicitly invalid styles like native leaves',()=>{
  for(const type of ['patcher','comment'])for(const style of [null,false,0,'']){
    const patch=nested();const node=type==='patcher'?patch.nodes[1]:patch.nodes[1].patcher.nodes[3];node.style=style;
    assert.throws(()=>validatePatch(patch),/style/);
  }
});

test('nested execution validates control and signal cycles through boundaries',()=>{
  const cycle=nested();cycle.edges=[wire(2,6),wire(6,2)];
  assert.throws(()=>validatePatch(cycle),/Control cycles/);
  const audio=nested();audio.nodes[0]=makeNode('sig',1,40,40,{args:'3'});
  audio.nodes[1].patcher.nodes[1]=makeNode('signal_add',4,40,90,{rhs:10});
  audio.nodes[2]=makeNode('snapshot',6,40,160);
  assert.doesNotThrow(()=>validatePatch(audio));
  // A signal-bearing boundary can also feed a control-only tap.
  audio.nodes.push(makeNode('print',8,160,160));audio.edges.push(wire(2,8));
  assert.doesNotThrow(()=>validatePatch(audio));
});

test('execution limits count leaves and relays, omitting containers and comments',()=>{
  const patch=nested();
  for(let id=10;id<35;id++)patch.nodes[1].patcher.nodes.push({id,type:'comment',x:20,y:20,params:{text:'note'}});
  assert.doesNotThrow(()=>validatePatch(patch));
  for(let id=40;id<70;id++)patch.nodes[1].patcher.nodes.push(makeNode('bang',id));
  assert.throws(()=>validatePatch(patch),/32/);
});

test('view navigation keeps a single root history and complete serialization',()=>{
  const model=new CanvasDocument(nested());
  model.enter(2);assert.deepEqual(model.patch.nodes.map(n=>n.id),[3,4,5,7]);
  model.parameter(4,'rhs',12);
  assert.equal(model.document.nodes[1].patcher.nodes[1].params.rhs,12);
  assert.equal(model.past.length,1);model.leave();assert.equal(model.patch.nodes[1].params.name,'basic');
  model.undo();assert.equal(model.document.nodes[1].patcher.nodes[1].params.rhs,10);
  model.redo();model.enter(2);const id=model.add('bang');assert.ok(id>7);
  assert.equal(model.document.nodes[1].patcher.nodes.at(-1).id,id);
});

test('voice allocation considers the complete owner tree',()=>{
  const patch=nested();patch.nodes.push(makeNode('voice',8));
  const model=new CanvasDocument(patch);model.enter(2);const id=model.add('voice');
  assert.equal(model.patch.nodes.find(node=>node.id===id).params.device,1);
});

test('moving and removing boundaries preserves cable identity in one undo transaction',()=>{
  const patch=nested(),child=patch.nodes[1].patcher;
  child.nodes.push({id:8,type:'inlet',x:140,y:30,params:{}});
  patch.edges.push(wire(1,2,0,1));
  const model=new CanvasDocument(patch);model.enter(2);model.move(8,20,300);
  assert.deepEqual(model.document.edges.map(e=>e.inlet),[1,0,0]);
  assert.equal(model.past.length,1);model.undo();assert.equal(model.document.edges[0].inlet,0);
  model.remove(3);assert.deepEqual(model.document.edges,[wire(2,6),wire(1,2)]);
});

test('controller navigation neither installs a graph nor loses live descendant observations',async()=>{
  const calls=[],controller=createCanvasController({patch:nested(),invoke:async(name,args)=>{
    calls.push([name,args]);
    if(name==='canvas_apply')return{revision:1};
    if(name==='canvas_status')return{revision:1,active:true,nodes:[{id:4,value:17,pulses:1}]};
    return{};
  }});
  await controller.prepare();await controller.poll();const before=calls.length;
  controller.enter(2);controller.leave();controller.enter(2);
  assert.equal(calls.length,before);assert.equal(controller.getState().observations[4].value,17);
  assert.equal(controller.getState().document.nodes[1].type,'patcher');
  assert.equal(JSON.parse(controller.export()).nodes[1].patcher.nodes[1].id,4);
  assert.equal(calls[0][1].patch.version,2);
  controller.leave();controller.reveal(4);assert.deepEqual(controller.getState().path,[2]);
  assert.equal(calls.length,before);
  assert.throws(()=>controller.event(3,0,[7]),/inlet/);
});

test('comment edits and boundary-preserving moves do not reinstall the runtime',async()=>{
  const calls=[],controller=createCanvasController({patch:nested(),invoke:async(name,args)=>{calls.push([name,args]);return{revision:1};}});
  await controller.prepare();controller.enter(2);
  controller.move(3,80,30);controller.parameter(7,'text','Updated note.');await controller.flush();
  assert.equal(calls.filter(([name])=>name==='canvas_apply').length,1);
  controller.parameter(4,'rhs',12);await controller.flush();
  assert.deepEqual(calls.at(-1),['canvas_param',{revision:1,node:4,key:'rhs',value:12}]);
});

test('loading replacement values installs them even when topology is unchanged',async()=>{
  const calls=[],controller=createCanvasController({patch:nested(),invoke:async(name,args)=>{calls.push([name,args]);return{revision:calls.length};}});
  await controller.prepare();const replacement=nested();replacement.nodes[1].patcher.nodes[1].params.rhs=99;
  controller.load(replacement);await controller.flush();
  assert.equal(calls.filter(([name])=>name==='canvas_apply').at(-1)[1].patch.nodes[1].patcher.nodes[1].params.rhs,99);
});

test('object text changes install numeric arguments while metadata edits keep execution',async()=>{
  const calls=[],controller=createCanvasController({patch:nested(),invoke:async(name,args)=>{calls.push([name,args]);return{revision:calls.length};}});
  await controller.prepare();controller.enter(2);controller.configure(4,'add',{rhs:12});await controller.flush();
  assert.equal(calls.filter(([name])=>name==='canvas_apply').length,2);
  assert.equal(calls.at(-1)[1].patch.nodes[1].patcher.nodes.find(node=>node.id===4).params.rhs,12);
  controller.configure(7,'comment',{text:'A new note.'});await controller.flush();
  assert.equal(calls.filter(([name])=>name==='canvas_apply').length,2);
});

test('near-limit authoring documents round trip their readable exported representation',()=>{
  const patch={version:2,profile:'ultra-patcher-v2',nodes:[],edges:[]};
  for(let id=1;id<=249;id++)patch.nodes.push({id,type:'comment',x:40,y:40,params:{text:'a'.repeat(4096)}});
  assert.doesNotThrow(()=>parsePatch(serializePatch(patch)));
});
