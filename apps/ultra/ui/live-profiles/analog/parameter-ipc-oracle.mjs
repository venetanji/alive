// Called by the Rust test with the unmodified Tauri response body on stdin.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAnalogPanelBindings} from './panel-bindings.mjs';
import {analogDescriptors,analogIdentity} from './facts.mjs';

const catalog=JSON.parse(readFileSync(0,'utf8'));
const expected={ownerLabel:'wire-precision-oracle',runtimeRevision:10,node:7,device:'Analog',state:{
  version:1,profile:analogIdentity.profile,dllSha256:analogIdentity.dllSha256,
  guiSha256:analogIdentity.guiSha256,graphicsSha256:analogIdentity.graphicsSha256,
  values:analogDescriptors.map(row=>row.min),
}};
for(const [index,value] of [[1,0.1666666716337204],[2,0.6499999761581421],[26,.25],[194,12.1],[196,-.1]])expected.state.values[index]=value;
assert.equal(catalog.generation,'10');
assert.equal(catalog.parameters.length,203);
const bindings=createAnalogPanelBindings({expected,catalog});
for(const row of catalog.parameters)assert.equal(row.value,Math.fround(expected.state.values[row.index]),`native index ${row.index}`);
assert.equal(bindings.snapshot().nativeStatus,'observed');
assert.equal(bindings.snapshot().expected.state.values[194],12.1);
const noise=bindings.resolveBinding({expression:'NoiseBalance',scope:[],resource:'Devices/UltraAnalog/Contents.xml'},{}).getState();
assert.equal(noise.value,.75);assert.equal(noise.applied,.25);assert.equal(noise.pending,true);
assert.equal(noise.enabled,false);assert.deepEqual(noise.revisions,[1]);assert.deepEqual(noise.applied_revisions,[0xffffffff]);
const cases=[
  ['numeric generation',c=>{c.generation=10;}],['stale generation',c=>{c.generation='11';}],
  ['noncanonical generation',c=>{c.generation='010';}],
  ['adjacent f32 requested value',c=>{const view=new DataView(new ArrayBuffer(4));view.setFloat32(0,c.parameters[1].value);view.setUint32(0,view.getUint32(0)+1);c.parameters[1].value=view.getFloat32(0);}],
  ...['revision','applied_revision'].flatMap(field=>[0,-1,1.5,0x100000000].map(value=>[`${field}=${value}`,c=>{c.parameters[1][field]=value;}]))
];
for(const [label,mutate] of cases){
  const bad=structuredClone(catalog);mutate(bad);
  assert.throws(()=>createAnalogPanelBindings({expected,catalog:bad}),/generation|observation/,label);
  const current=createAnalogPanelBindings({expected,catalog});
  assert.equal(current.observe({expected,catalog:bad}),false,label);
  assert.equal(current.snapshot().nativeStatus,'unavailable',label);
  assert.deepEqual(current.snapshot().expected,expected,label);
}
