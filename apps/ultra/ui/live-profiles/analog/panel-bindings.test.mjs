import test from 'node:test';
import assert from 'node:assert/strict';
import {analogDescriptors,analogIdentity} from './facts.mjs';
import {analogCurrentMappings} from './parameter-mapping.mjs';

const adapter=await import('./panel-bindings.mjs').catch(error=>{
  if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;
  return {};
});
const clone=value=>structuredClone(value);
const source=()=>({ownerLabel:'owner',runtimeRevision:10,node:7,device:'Analog',state:{
  version:1,profile:analogIdentity.profile,dllSha256:analogIdentity.dllSha256,
  guiSha256:analogIdentity.guiSha256,graphicsSha256:analogIdentity.graphicsSha256,
  values:analogDescriptors.map(row=>row.min),
}});
const catalog=expected=>({generation:String(expected.runtimeRevision),parameters:analogDescriptors.map(row=>({...row,
  value:Math.fround(expected.state.values[row.index]),applied:Math.fround(expected.state.values[row.index]),revision:1,applied_revision:1,
}))});
const connection=(expression,scope=[])=>({expression,scope,resource:'Devices/UltraAnalog/Contents.xml'});
const bind=(bindings,key,scope=[])=>bindings.resolveBinding(connection(key,scope),{});
function setup({dormantValues=new Map(),onChange=()=>{}}={}){
  assert.equal(typeof adapter.createAnalogPanelBindings,'function','the current read-only Analog adapter must exist');
  const expected=source();
  for(const [index,value]of [[26,.25],[39,.5],[40,1],[194,12.1]])expected.state.values[index]=value;
  const native=catalog(expected),bindings=adapter.createAnalogPanelBindings({expected,catalog:native,dormantValues,onChange});
  return{expected,native,bindings};
}

test('current adapter decodes reversed balance and signed groups without narrowing saved raw numbers',()=>{
  const {bindings,expected}=setup(),snapshot=bindings.snapshot();
  assert.equal(snapshot.values.NoiseBalance,.75);
  assert.equal(snapshot.values['SignalChain1.OscillatorEnvAmount'],-.5);
  assert.equal(snapshot.values.DummyPerNotePitchBendRange,Math.fround(12.1));
  assert.equal(snapshot.expected.state.values[194],12.1);
  assert.deepEqual(snapshot.expected,expected);
  snapshot.expected.state.values[194]=0;
  assert.equal(bindings.snapshot().expected.state.values[194],12.1);
  assert.equal(bind(bindings,'OscillatorEnvAmount',['doc','SignalChain1']).bindingId,'SignalChain1.OscillatorEnvAmount');
  assert.equal(bind(bindings,'SignalChain1.Envelope[0].AttackTime',['SignalChain2']).bindingId,'SignalChain1.Envelope[0].AttackTime');
  assert.equal(bindings.snapshot().nativeStatus,'observed');
});

test('unrepresentable groups and off gates stay individually unknown with bounded caller-owned dormant choices',()=>{
  const {bindings,expected}=setup(),next=clone(expected);next.state.values[47]=5;
  assert.equal(bindings.observe({expected:next,catalog:catalog(next)}),true);
  const snapshot=bindings.snapshot();
  for(const key of ['SignalChain1.FilterType','KeyboardUnison','SignalChain1.LFOSync','SignalChain2.LFOSync','PerNotePitchBendRange']){
    assert.equal(Object.hasOwn(snapshot.values,key),false,key);
    assert.ok(snapshot.unknownKeys.includes(key),key);
  }
  assert.equal(snapshot.values.KeyboardUnisonToggle,false);
  assert.equal(snapshot.values['SignalChain1.LFOSyncToggle'],0);
  assert.equal(snapshot.values.NoiseBalance,.75);
  assert.equal(bind(bindings,'FilterType',['SignalChain1']).getState().known,false);
  const dormant=new Map([['KeyboardUnison',1],['SignalChain1.LFOSync',23],['SignalChain2.LFOSync',3]]);
  const local=setup({dormantValues:dormant});
  assert.equal(local.bindings.snapshot().values['SignalChain1.LFOSync'],23);
  local.bindings.observe({expected:local.expected,catalog:null});
  assert.equal(local.bindings.snapshot().values.KeyboardUnison,1);
  assert.deepEqual(dormant,new Map([['KeyboardUnison',1],['SignalChain1.LFOSync',23],['SignalChain2.LFOSync',3]]));
  assert.throws(()=>setup({dormantValues:new Map([['Volume',0]])}),/dormant/i);
});

test('all bindings withhold display and edit authority even for known source and applied cells',()=>{
  const {bindings}=setup(),numeric=bind(bindings,'NoiseBalance'),state=numeric.getState();
  assert.equal(state.enabled,false);assert.equal(state.known,true);assert.equal(state.value,.75);
  assert.equal(state.applied,.75);assert.equal(state.initial,.75);
  assert.equal(numeric.verified,false);assert.equal(numeric.display.format(.75),'--');
  assert.throws(()=>numeric.display.parse('75'),/unqualified|read.only/i);
  assert.equal(numeric.options,undefined);
  for(const name of ['onInput','onChange','onCancel'])assert.equal(numeric[name],undefined);
  assert.equal(bind(bindings,'NoiseToggle').getState().enabled,false);
  assert.equal(bind(bindings,'SetRouting1'),null);
  assert.equal(bind(bindings,'PerNotePitchBendRange'),null);
});

test('compound observations preserve commanded state and compare wrapping receipt versions by equality',()=>{
  const {bindings,expected,native}=setup();
  native.parameters[39].applied=.25;native.parameters[39].revision=1;native.parameters[39].applied_revision=0xffffffff;
  assert.equal(bindings.observe({expected,catalog:native}),true);
  const pending=bind(bindings,'OscillatorEnvAmount',['SignalChain1']).getState();
  assert.equal(pending.value,-.5);assert.equal(pending.applied,-.25);assert.equal(pending.pending,true);
  assert.deepEqual(pending.revisions,[1,1]);assert.deepEqual(pending.applied_revisions,[0xffffffff,1]);
  bindings.observe({expected,catalog:null});
  const unavailable=bind(bindings,'OscillatorEnvAmount',['SignalChain1']).getState();
  assert.equal(unavailable.nativeStatus,'unavailable');assert.equal(unavailable.pending,true);
  assert.deepEqual(unavailable.applied_revisions,[0xffffffff,1]);
  native.parameters[39].applied_revision=1;
  bindings.observe({expected,catalog:native});
  assert.equal(bind(bindings,'OscillatorEnvAmount',['SignalChain1']).getState().pending,true,'equal versions with different cached values remain pending');
  native.parameters[39].applied=.5;bindings.observe({expected,catalog:native});
  assert.equal(bind(bindings,'OscillatorEnvAmount',['SignalChain1']).getState().pending,false);
});

test('source refresh preserves acquisition initial values and exact hidden fields through native faults',()=>{
  let changes=0;const {bindings,expected}=setup({onChange:()=>changes++}),next=clone(expected);
  const lag=catalog(expected);lag.parameters[26].applied=0;lag.parameters[26].applied_revision=0xffffffff;
  bindings.observe({expected,catalog:lag});assert.equal(bind(bindings,'NoiseBalance').getState().pending,true);
  next.state.values[26]=.875;next.state.values[194]=12.2;
  assert.equal(bindings.observe({expected:next,catalog:null}),true);
  const state=bind(bindings,'NoiseBalance').getState();
  assert.equal(state.value,.125);assert.equal(state.initial,.75);assert.equal(state.applied,undefined);
  assert.equal(state.pending,undefined,'a new source without its native observation has unknown settlement');
  assert.equal(state.applied_revisions,undefined);
  assert.equal(bindings.snapshot().nativeStatus,'unavailable');
  assert.equal(bindings.snapshot().expected.state.values[194],12.2);
  assert.equal(bindings.observe({expected:next,catalog:catalog(next)}),true);
  assert.equal(bindings.snapshot().nativeStatus,'observed');
  assert.ok(changes>=2);bindings.disconnect();
  const before=changes;assert.equal(bindings.observe({expected:next,catalog:catalog(next)}),false);
  assert.equal(changes,before);assert.equal(bind(bindings,'NoiseBalance').getState().enabled,false);
  assert.match(bind(bindings,'NoiseBalance').getState().unavailableReason,/disconnect/i);
});

test('native observation refuses malformed catalogs and raw-source mismatches without retargeting',()=>{
  for(const mutate of [
    c=>{c.generation=10;},c=>{c.generation='11';},c=>{c.parameters[0].property++;},
    c=>{delete c.parameters[0];},c=>{c.parameters[0].revision=0;},c=>{c.parameters[0].applied_revision=0x100000000;},
    c=>{c.parameters[0].value=NaN;},c=>{c.parameters[0].applied=Infinity;},
    c=>{c.parameters[3].applied=.5;},c=>{c.parameters[26].value=.5;},
    c=>{const row=c.parameters[0],value=row.value;delete row.value;Object.setPrototypeOf(row,{value});},
  ]){
    const {bindings,expected}=setup(),bad=catalog(expected);mutate(bad);
    assert.equal(bindings.observe({expected,catalog:bad}),false);
    assert.equal(bindings.snapshot().nativeStatus,'unavailable');
    assert.equal(bindings.snapshot().values.NoiseBalance,.75);
  }
  for(const field of ['ownerLabel','runtimeRevision','node','device']){
    const {bindings,expected}=setup(),foreign=clone(expected);foreign[field]=field==='node'?8:field==='runtimeRevision'?11:'foreign';
    assert.equal(bindings.observe({expected:foreign,catalog:catalog(foreign)}),false);
    assert.deepEqual(bindings.snapshot().expected,expected);
  }
  const {expected}=setup(),bad=catalog(expected);bad.parameters[0].revision=0;
  assert.throws(()=>adapter.createAnalogPanelBindings({expected,catalog:bad}),/version|revision|observation/i);
});

test('resource expressions use scoped current keys and their own bound IsActive connection',()=>{
  const {bindings}=setup();
  const expression={name:'ShowWhen',value:'IsActive && NoiseBalance > 0',scope:[],connection:connection('NoiseBalance')};
  assert.equal(bindings.evaluateExpression(expression,{connection:connection('KeyboardUnison')}),true);
  assert.equal(bindings.evaluateExpression({...expression,value:'KeyboardUnison == 0'}),undefined);
  assert.equal(bindings.evaluateExpression({...expression,value:'unknown()'}),undefined);
  assert.equal(bindings.evaluateExpression({...expression,value:'OscillatorEnvAmount < 0',scope:['SignalChain1']}),true);
  assert.equal(bind(bindings,'NoiseBalance').handlesExpressions,true);
  assert.equal(bindings.resolveBinding(connection('NoiseBalance'),{},{stateExpressions:[{...expression,value:'missing'}]}).handlesExpressions,false);
});

test('production writable authority keeps every mapped model field disabled',()=>{
  const {bindings,expected}=setup();
  for(const row of analogCurrentMappings)for(const key of [row.model,row.secondary].filter(Boolean)){
    assert.equal(adapter.analogWritableKey(expected,key),false,key);
    const binding=bind(bindings,key);if(binding){assert.equal(binding.verified,false,key);assert.equal(binding.getState().enabled,false,key);}
  }
});
