import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCanvasController, makeNode, nodeSpec, validatePatch} from './canvas-model.mjs';
import {parseObjectText, objectText} from './canvas-catalog.mjs';

const patch = nodes => ({version:1,profile:'ultra-canvas-v1',presentation:null,nodes,edges:[]});
test('print is a typed native sink with a bounded label and live severity',()=>{
  const parsed=parseObjectText('print notes @level 2');
  assert.deepEqual(parsed,{type:'print',params:{label:'notes',level:2,popup:0}});
  assert.deepEqual(parseObjectText(objectText({id:1,...parsed})),parsed);
  assert.equal(nodeSpec(makeNode('print',1)).inlets.length,1);
  assert.equal(nodeSpec(makeNode('print',1)).outlets.length,0);
  for(const label of ['', 'two words', 'x'.repeat(32)])assert.throws(()=>validatePatch(patch([makeNode('print',1,0,0,{label})])));
});
test('console retains ordered native records across polls and graph edits, clears without replay',async()=>{
  let revision=0,records=[],dropped=0;
  const c=createCanvasController({patch:patch([makeNode('print',1)]),invoke:async(name)=>{
    if(name==='canvas_apply')return{revision:++revision};
    if(name==='audio_status')return{running:false};
    if(name==='canvas_status'){const console=records;records=[];return{revision,active:true,nodes:[],console,console_dropped:dropped};}
    return true;
  }});
  await c.prepare();records=[{sequence:1,revision:1,node:1,label:'notes',level:0,text:'list 1 2.',frame:0}];
  await c.poll();assert.equal(c.getState().console.length,1);await c.poll();assert.equal(c.getState().console.length,1);
  c.resize(1,{width:140,height:35});await c.flush();assert.equal(revision,1);
  c.undo();assert.equal(c.getState().patch.nodes[0].style,undefined);assert.equal(c.getState().console.length,1);
  c.clearConsole();await c.poll();assert.equal(c.getState().console.length,0);
  records=Array.from({length:520},(_,i)=>({sequence:i+2,revision:1,node:1,label:'notes',level:0,text:String(i),frame:0}));dropped=3;
  await c.poll();assert.equal(c.getState().console.length,512);assert.equal(c.getState().console[0].text,'8');assert.equal(c.getState().consoleDropped,3);
});
test('Clear discards an older status reply already in flight',async()=>{
  let finish;
  const c=createCanvasController({patch:patch([makeNode('print',1)]),invoke:async name=>{
    if(name==='canvas_apply')return{revision:1};
    if(name==='audio_status')return{};
    if(name==='canvas_status')return new Promise(resolve=>{finish=resolve;});
  }});
  await c.prepare();const polling=c.poll();c.clearConsole();
  finish({revision:1,active:true,nodes:[],console:[{sequence:1,text:'old'}],console_dropped:4});
  await polling;assert.equal(c.getState().console.length,0);assert.equal(c.getState().consoleDropped,0);
});
