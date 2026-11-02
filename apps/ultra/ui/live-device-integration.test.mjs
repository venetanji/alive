import test from 'node:test';
import assert from 'node:assert/strict';
import {makeNode,validatePatch,nodeSpec} from './canvas-model.mjs';
import {parseObjectText,objectText} from './canvas-catalog.mjs';

test('ordinary native instruments own independent complete persisted source state',()=>{
  const first=makeNode('live_device',1,20,30);
  const second=makeNode('live_device',2,120,30);
  assert.equal(first.params.device,'Analog');
  assert.equal(first.params.state.values.length,203);
  assert.notEqual(first.params.state,second.params.state);
  assert.notEqual(first.params.state.values,second.params.state.values);
  const original=second.params.state.values[0];
  first.params.state.values[0]=original===3?4:3;
  assert.equal(second.params.state.values[0],original);
  const patch=validatePatch({version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[first,second],edges:[]});
  assert.equal(patch.nodes[0].params.state.values[0],first.params.state.values[0]);
  assert.equal(nodeSpec(first).inlets.length,1);
  assert.equal(nodeSpec(first).outlets.length,2);
});

test('native source validation rejects nonfinite values and foreign identities',()=>{
  const source=makeNode('live_device',1,20,30);
  const invalid=structuredClone(source);invalid.params.state.values[2]=Infinity;
  assert.throws(()=>validatePatch({version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[invalid],edges:[]}),/native|finite|value/i);
  const foreign=structuredClone(source);foreign.params.state.dllSha256='0'.repeat(64);
  assert.throws(()=>validatePatch({version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[foreign],edges:[]}),/identity|unsupported/i);
});

test('native source node identities share the native host bound',()=>{
  const patch=id=>({version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[makeNode('live_device',id)],edges:[]});
  assert.equal(validatePatch(patch(100000)).nodes[0].id,100000);
  assert.throws(()=>validatePatch(patch(100001)),/ID|100000|identity/i);
});

test('saved native nodes require explicit device identity and complete source state',()=>{
  const source=makeNode('live_device',1);
  const patch=node=>({version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[node],edges:[]});
  for(const missing of ['device','state']){
    const invalid=structuredClone(source);delete invalid.params[missing];
    assert.throws(()=>validatePatch(patch(invalid)),/complete|explicit|required/i);
  }
});

test('native creation vocabulary preserves source state during same-profile text edits',()=>{
  const source=makeNode('live_device',1);
  source.params.state.values[2]=.25;
  const parsed=parseObjectText('live.device~ Analog',source);
  assert.equal(parsed.type,'live_device');
  assert.deepEqual(parsed.params.state,source.params.state);
  assert.equal(objectText(source),'live.device~ Analog');
  assert.throws(()=>parseObjectText('live.device~ Unqualified'),/unsupported|device/i);
  assert.throws(()=>parseObjectText('live.device~ Analog @state 1'),/option|argument|attribute/i);
});
