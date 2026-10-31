import test from 'node:test';
import assert from 'node:assert/strict';
import {createParameterGestures} from './canvas-parameter-gestures.mjs';
import {deferred} from '../tests/presentation-dom.mjs';

test('owner retains a live preview after UI disposal and settles it as one canonical edit',async()=>{
  const calls=[],commits=[];let scope={ownerLabel:'main',runtimeRevision:9},canonical=1,native=1;
  const owner=createParameterGestures({native:true,scope:()=>scope,read:()=>canonical,invoke:async(name,{request})=>{calls.push({name,request});if(request.phase==='preview')native=request.value;return{token:1,document:{}};},onCommit:(node,key,value)=>{canonical=value;commits.push(value);}});
  const id=owner.begin(1,'value');await owner.write(id,'preview',7);assert.equal(native,7);assert.equal(canonical,1);assert.equal(owner.snapshots()[0].value,7);
  assert.throws(()=>owner.assertTarget(1,'value'),/active presentation/);owner.assertTarget(2,'value');
  await owner.settle();assert.deepEqual(commits,[7]);assert.equal(owner.snapshots().length,0);assert.equal(calls.at(-1).request.phase,'commit');
});
test('cancel and stale replies preserve unrelated edits and cannot publish to a replacement',async()=>{
  let scope={ownerLabel:'main',runtimeRevision:9},value=1;const gate=deferred(),calls=[];
  const owner=createParameterGestures({native:true,scope:()=>scope,read:()=>value,invoke:async(name,{request})=>{calls.push(request);if(request.phase==='preview')await gate.promise;return{token:1,document:{}};},onCommit:(_,__,v)=>{value=v;}});
  const id=owner.begin(1,'value'),pending=owner.write(id,'preview',4);await new Promise(resolve=>setImmediate(resolve));scope={ownerLabel:'replacement',runtimeRevision:10};gate.resolve();await assert.rejects(pending,/scope changed/);assert.equal(value,1);assert.equal(owner.snapshots().length,0);
});
test('a refused begin can retry the current baseline and an unstarted cancel sends nothing',async()=>{
  let value=1,refuse=true;const calls=[];
  const owner=createParameterGestures({native:true,scope:()=>({ownerLabel:'main',runtimeRevision:9}),read:()=>value,invoke:async(name,{request})=>{calls.push(request);if(refuse){refuse=false;value=2;throw Error('The parameter changed before begin.');}return{token:1,document:{}};},onCommit:(_,__,next)=>{value=next;}});
  const id=owner.begin(1,'value');await assert.rejects(owner.write(id,'commit',7),/changed before/);
  assert.equal(owner.snapshots()[0].baseline,2);await owner.write(id,'commit',7);assert.equal(calls[1].value,2);assert.equal(value,7);assert.equal(owner.snapshots().length,0);
  const cancelled=owner.begin(1,'value'),before=calls.length;await owner.write(cancelled,'cancel',7);assert.equal(calls.length,before);assert.equal(owner.snapshots().length,0);
});
