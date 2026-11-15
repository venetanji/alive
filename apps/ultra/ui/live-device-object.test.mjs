import test from 'node:test';
import assert from 'node:assert/strict';
import {parseObjectText,objectText} from './canvas-catalog.mjs';
import {CanvasDocument,makeNode,nodeSpec,parsePatch,serializePatch,createCanvasController} from './canvas-model.mjs';
import {createLiveDeviceState,patchLiveDeviceState} from './live-device-profile.mjs';

const patch=(nodes,edges=[])=>({version:2,profile:'ultra-patcher-v2',nodes,edges});

test('live.device~ Analog creates independent saved stereo source objects',()=>{
 const parsed=parseObjectText('live.device~ Analog');assert.equal(parsed.type,'live_device');
 const a=makeNode(parsed.type,1,30,30,parsed.params),b=makeNode('live_device',2,600,30);
 assert.equal(objectText(a),'live.device~ Analog');
 assert.deepEqual(nodeSpec(a).inlets.map(p=>p.type),['control']);
 assert.deepEqual(nodeSpec(a).outlets.map(p=>p.type),['mono','mono']);
 a.params.state.values[2]=.125;assert.notEqual(b.params.state.values[2],.125);
 const document=patch([a,b,makeNode('signal_dac',3,150,260)],[{from:1,outlet:0,to:3,inlet:0},{from:1,outlet:1,to:3,inlet:1}]);
 assert.deepEqual(parsePatch(serializePatch(document)),document);
 assert.throws(()=>parseObjectText('live.device~ Unknown'),/device|Analog/i);
});

test('nested device source values survive history and serialization',()=>{
 const node=makeNode('live_device',2,30,30);
 const parent=makeNode('patcher',1);parent.patcher.nodes.push(node);
 const document=new CanvasDocument(patch([parent]));
 const edited=patchLiveDeviceState('Analog',node.params.state,[{index:2,value:.125}]);
 document.parameterRoot(2,'state',edited);
 assert.equal(parsePatch(serializePatch(document.document)).nodes[0].patcher.nodes[0].params.state.values[2],.125);
 document.undo();assert.deepEqual(document.document.nodes[0].patcher.nodes[0].params.state,createLiveDeviceState());
 document.redo();assert.equal(document.document.nodes[0].patcher.nodes[0].params.state.values[2],.125);
});

test('invalid device state is rejected before editing the document',()=>{
 const document=new CanvasDocument(patch([makeNode('live_device',1)])),before=serializePatch(document.document);
 assert.throws(()=>document.parameter(1,'state',{...createLiveDeviceState(),values:[0]}),/state|native|parameter/i);
 assert.equal(serializePatch(document.document),before);
});

test('legacy canvas applies source state through graph admission without numeric parameter IPC',async()=>{
 const calls=[];let revision=0;
 const controller=createCanvasController({patch:patch([makeNode('live_device',1)]),invoke:async(command,args)=>{
  calls.push({command,args});if(command==='canvas_apply')return {revision:++revision};
  if(command==='canvas_stop')return true;
  throw Error(`Unexpected command ${command}`);
 }});
 await controller.prepare();
 await controller.deviceParameter(1,'state',patchLiveDeviceState('Analog',createLiveDeviceState(),[{index:2,value:.125}]));
 await controller.flush();
 assert.equal(calls.filter(c=>c.command==='canvas_param').length,0);
 assert.equal(calls.filter(c=>c.command==='canvas_apply').at(-1).args.patch.nodes[0].params.state.values[2],.125);
});
