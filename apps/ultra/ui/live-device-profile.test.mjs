import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveDeviceState,validateLiveDeviceState,liveDeviceProfile,liveDeviceCatalog,patchLiveDeviceState} from './live-device-profile.mjs';
import {analogPresetParameters} from './analog-bindings.mjs';

test('device source states own every native value and roundtrip independently',()=>{
 const a=createLiveDeviceState('Analog'),b=createLiveDeviceState('Analog');
 assert.equal(a.profile,'live12-analog-v1');assert.equal(a.values.length,203);
 a.values[2]=.25;
 assert.notEqual(b.values[2],a.values[2]);
 assert.deepEqual(validateLiveDeviceState('Analog',JSON.parse(JSON.stringify(a))),a);
 assert.equal(liveDeviceProfile('Analog').entrypoint,'Devices/UltraAnalog/Contents.xml');
 assert.throws(()=>createLiveDeviceState('Unqualified'),/device/i);
});

test('source validation rejects incompatible identities and malformed native state',()=>{
 const initial=createLiveDeviceState();
 for(const change of [{version:2},{profile:'guessed'},{dllSha256:'0'.repeat(64)},{guiSha256:'0'.repeat(64)},{graphicsSha256:'0'.repeat(64)},{path:'/tmp/other.dll'},{values:initial.values.slice(1)}])
  assert.throws(()=>validateLiveDeviceState('Analog',{...initial,...change}));
 for(const value of [NaN,Infinity,-1,1.1]){
  const values=[...initial.values];values[2]=value;
  assert.throws(()=>validateLiveDeviceState('Analog',{...initial,values}));
 }
 const values=[...initial.values];values[0]=1.5;
 assert.throws(()=>validateLiveDeviceState('Analog',{...initial,values}),/integer|native/i);
});

test('current and retained resources preserve exact pairs without accepting mixed releases',()=>{
 const initial=createLiveDeviceState();
 const pairs=[
  ['5ec872d673fd5f4f5f05787e4245c56e172ff2663c2d4493e94d598b883114e6','a0b8aa480aa3d21f093b416ea59b3f200d2e2466936f95d886a554bffe875cb7'],
  ['75940fa314699a5fe0f37a6b0ee904bd7cc2ee87fc42acce2c8cea61df55563f','ec6ed560b42b1497fd976beff38d86424aa0c2ef59e4995e3d10ba9b68535c9d'],
 ];
 for(const [guiSha256,graphicsSha256]of pairs){
  const state={...initial,guiSha256,graphicsSha256};
  assert.deepEqual(validateLiveDeviceState('Analog',state),state);
 }
 for(let i=0;i<2;i++)assert.throws(()=>validateLiveDeviceState('Analog',{...initial,guiSha256:pairs[i][0],graphicsSha256:pairs[1-i][1]}),/identity|pair|resource/i);
});

test('state batches preserve complete source and encode compound parameters together',()=>{
 const initial=createLiveDeviceState(),catalog=liveDeviceCatalog(initial,'7');
 const encoded=analogPresetParameters(new Map([
  ['NoiseBalance',1],['SignalChain1.OscillatorEnvAmount',-.5],
 ]),catalog);
 const changed=patchLiveDeviceState('Analog',initial,encoded);
 assert.equal(changed.values.length,203);assert.equal(changed.values[39],.5);assert.equal(changed.values[40],1);
 const after=liveDeviceCatalog(changed,'7');
 assert.equal(after.generation,'7');
 for(const {index,value} of encoded)assert.equal(after.parameters[index].value,Math.fround(value));
 assert.deepEqual(initial,createLiveDeviceState());
 assert.throws(()=>patchLiveDeviceState('Analog',initial,[{index:29,value:.2},{index:29,value:.3}]),/duplicate/i);
 assert.throws(()=>patchLiveDeviceState('Analog',initial,[{index:203,value:0}]),/index/i);
});
