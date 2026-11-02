import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareLiveDeviceCreation} from './live-device-creation.mjs';
import {createCanvasController,makeNode} from './canvas-model.mjs';

const patch=()=>({version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[makeNode('cycle',1,30,30)],edges:[]});
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return{promise,resolve};};

test('default acquisition accepts an unchanged authoring target',async()=>{
 const controller=createCanvasController({patch:patch()}),read=deferred();
 const preparing=prepareLiveDeviceCreation(controller,()=>read.promise);
 read.resolve('installed state');assert.equal(await preparing,'installed state');
});

test('delayed device configuration cannot overwrite a newer configuration at the same path',async()=>{
 const controller=createCanvasController({patch:patch()}),read=deferred();
 const preparing=prepareLiveDeviceCreation(controller,()=>read.promise);
 controller.configure(1,'phasor',{frequency:3});
 read.resolve('installed state');await assert.rejects(preparing,/changed|canceled/i);
 assert.equal(controller.getState().document.nodes[0].type,'phasor');
});

test('delayed device creation cannot insert into a replacement document at the same path',async()=>{
 const controller=createCanvasController({patch:patch()}),read=deferred();
 const preparing=prepareLiveDeviceCreation(controller,()=>read.promise);
 controller.load({...patch(),nodes:[]});
 read.resolve('installed state');await assert.rejects(preparing,/changed|canceled/i);
 assert.deepEqual(controller.getState().document.nodes,[]);
});
