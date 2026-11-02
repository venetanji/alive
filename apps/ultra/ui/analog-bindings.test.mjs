import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnalogBindings} from './analog-bindings.mjs';
import * as analogBindings from './analog-bindings.mjs';

const parameter=(index,module,property,kind=0,min=0,max=1)=>({index,module,property,kind,min,max,value:.5,applied:.5,revision:1,applied_revision:1});
const catalog={generation:'1',parameters:[parameter(45,3514,1),parameter(128,3522,1),parameter(52,3516,2),{...parameter(28,3513,65535,3),value:1,applied:1}]};
const connection=(scope,expression)=>({scope,expression,resource:'Devices/UltraAnalog/Osc.xml'});

test('binds the original two oscillator scopes to distinct admitted DLL descriptors',async()=>{
 const sent=[],model=createAnalogBindings({send:async command=>{sent.push(command);return{...catalog.parameters.find(p=>p.index===command.index),value:command.value,revision:2};}});
 const osc1=model.resolve(connection(['SignalChain1'],'OscillatorLevel'));
 assert.equal(osc1.getState().enabled,false);
 model.connect(catalog);
 assert.equal(osc1.getState().enabled,true);
 assert.equal(osc1.getState().value,.5);
 const osc2=model.resolve(connection(['SignalChain2'],'OscillatorLevel'));
 osc1.onChange(.75);osc2.onChange(.25);await model.idle();
 assert.deepEqual(sent,[{generation:'1',index:45,value:.75},{generation:'1',index:128,value:.25}]);
 assert.equal(model.resolve(connection(['SignalChain1'],'ImaginaryParameter')),null);
 assert.equal(model.resolve(connection(['doc'],'OscillatorLevel')),null);
});

test('coalesces drag writes and does not overwrite a pending value with stale polling',async()=>{
 const calls=[],waits=[];
 const model=createAnalogBindings({send:command=>{calls.push(command);return new Promise(resolve=>waits.push(resolve));}});model.connect(catalog);
 const knob=model.resolve(connection(['SignalChain1'],'OscillatorLevel'));
 knob.onInput(.6);knob.onInput(.7);knob.onInput(.8);
 assert.equal(calls.length,1);model.observe(catalog);assert.equal(knob.getState().value,.8);
 waits.shift()({...catalog.parameters[0],value:.6,revision:2});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calls.length,2);assert.equal(calls[1].value,.8);
 waits.shift()({...catalog.parameters[0],value:.8,revision:3});await model.idle();
 model.observe(catalog);assert.equal(knob.getState().value,.8);
 model.observe({generation:'1',parameters:[{...catalog.parameters[0],value:.8,applied:.8,revision:3,applied_revision:3}]});
 assert.equal(knob.getState().applied,.8);
});

test('rejects mismatched metadata and out-of-range edits without sending',()=>{
 const sent=[],model=createAnalogBindings({send:command=>sent.push(command)});
 model.connect({...catalog,parameters:[parameter(45,3514,1,0,0,2)]});
 const knob=model.resolve(connection(['SignalChain1'],'OscillatorLevel'));
 assert.equal(knob.getState().enabled,false);
 model.connect(catalog);knob.onChange(NaN);knob.onChange(1.1);assert.deepEqual(sent,[]);
});

test('disconnects stale edit completions from the next native instance',async()=>{
 const errors=[];let reject;
 const model=createAnalogBindings({send:()=>new Promise((_,no)=>{reject=no;}),onError:e=>errors.push(e)});model.connect(catalog);
 const knob=model.resolve(connection(['SignalChain1'],'OscillatorLevel'));knob.onChange(.9);
 model.disconnect();assert.equal(knob.getState().enabled,false);
 model.connect({...catalog,generation:'2'});reject(Error('Old instance closed'));await model.idle();
 assert.equal(knob.getState().value,.5);assert.deepEqual(errors,[]);
});

test('mapped state expressions follow current toggles and unknown expressions stay disabled',async()=>{
 const model=createAnalogBindings({send:async c=>({...catalog.parameters.find(p=>p.index===c.index),value:c.value,revision:2})});model.connect(catalog);
 const stateExpressions=[{scope:['SignalChain1'],name:'StateExpression',value:'OscillatorToggle ? KEnabled : KIrrelevant'}];
 const knob=model.resolve(connection(['SignalChain1'],'OscillatorLevel'),null,{stateExpressions});
 assert.equal(knob.getState().enabled,true);
 model.resolve(connection(['SignalChain1'],'OscillatorToggle')).onChange(false);await model.idle();
 assert.equal(knob.getState().enabled,false);
 const unknown=model.resolve(connection(['SignalChain1'],'OscillatorLevel'),null,{stateExpressions:[{scope:[],name:'StateExpression',value:'Imaginary ? KEnabled : KIrrelevant'}]});
 assert.equal(unknown.getState().enabled,false);
});

const pitchCatalog={generation:'1',parameters:[
 {...parameter(39,3513,10),value:.5,applied:.5},
 {...parameter(40,3513,16,3),value:1,applied:1},
 {...parameter(122,3521,10),value:.25,applied:.25},
 {...parameter(123,3521,16,3),value:0,applied:0},
]};
const pitchAck=(command,revision=2,applied=false)=>({generation:command.generation,parameters:command.values.map(({index,value})=>{
 const previous=pitchCatalog.parameters.find(p=>p.index===index);
 return{...previous,value,revision,...applied?{applied:value,applied_revision:revision}:{}};
})});

test('preset initialization encodes admitted scopes, pitch pairs and tuning offsets in one batch',()=>{
 assert.equal(typeof analogBindings.analogPresetParameters,'function');
 const rows={generation:'1',parameters:[...catalog.parameters,...pitchCatalog.parameters,{...parameter(30,3513,1,3,0,6),value:3,applied:3}]};
 const values=new Map([['SignalChain1.OscillatorToggle',false],['SignalChain1.OscillatorLevel',.8],['SignalChain2.OscillatorLevel',.2],['SignalChain1.OscillatorEnvAmount',-.25],['SignalChain1.OscillatorOct',-1],['Unknown.Property',5]]);
 assert.deepEqual(analogBindings.analogPresetParameters(values,rows),[{index:28,value:0},{index:30,value:2},{index:39,value:.25},{index:40,value:1},{index:45,value:.8},{index:128,value:.2}]);
});

test('preset initialization rejects invalid values and mismatched descriptors before publication',()=>{
 assert.equal(typeof analogBindings.analogPresetParameters,'function');
 assert.throws(()=>analogBindings.analogPresetParameters(new Map([['SignalChain1.OscillatorLevel',2]]),catalog),/range/i);
 assert.throws(()=>analogBindings.analogPresetParameters(new Map([['SignalChain1.OscillatorLevel',.2]]),{...catalog,parameters:[parameter(45,999,1)]}),/descriptor/i);
});

test('F1/F2 routing converts between the Live model and native mixer in both directions',async()=>{
 const routes=[['NoiseBalance',26,3512,[]],['OscillatorBalance',38,3514,['SignalChain1']],['OscillatorBalance',121,3522,['SignalChain2']]];
 const rows=routes.map(([,index,module])=>({...parameter(index,module,2),value:0,applied:0}));
 const calls=[],model=createAnalogBindings({send:async command=>{
  calls.push(command);return{...rows.find(p=>p.index===command.index),value:command.value,applied:command.value,revision:2,applied_revision:2};
 }});
 model.connect({generation:'1',parameters:rows});
 for(const [name,index,,scope]of routes){
  const binding=model.resolve(connection(scope,name));
  assert.equal(binding.getState().value,1);assert.equal(binding.getState().applied,1);
  assert.equal(binding.display.format(binding.getState().value),'F1');
  binding.onChange(0);await model.idle();
  assert.deepEqual(calls.at(-1),{generation:'1',index,value:1});
  assert.equal(binding.getState().value,0);assert.equal(binding.getState().applied,0);
  assert.equal(binding.display.format(binding.getState().value),'F2');
  binding.onChange(.75);await model.idle();
  assert.deepEqual(calls.at(-1),{generation:'1',index,value:.25});
  assert.equal(binding.getState().value,.75);
 }
 model.observe({generation:'1',parameters:rows.map(p=>({...p,value:.25,applied:.5,revision:3,applied_revision:3}))});
 for(const [name,,,scope]of routes){const state=model.resolve(connection(scope,name)).getState();assert.equal(state.value,.75);assert.equal(state.applied,.5);}
});

test('preset routing uses the same F1/F2 conversion as interactive edits',()=>{
 const rows={generation:'1',parameters:[parameter(26,3512,2),parameter(38,3514,2),parameter(121,3522,2)]};
 const values=new Map([['NoiseBalance',1],['SignalChain1.OscillatorBalance',.75],['SignalChain2.OscillatorBalance',0]]);
 assert.deepEqual(analogBindings.analogPresetParameters(values,rows),[{index:26,value:0},{index:38,value:.25},{index:121,value:1}]);
});

test('qualified signed pitch amount sends magnitude and negative flag together for each chain',async()=>{
 const calls=[],model=createAnalogBindings({send:()=>assert.fail('Pitch pairs require the batch transport'),sendBatch:async command=>{calls.push(command);return pitchAck(command);}});
 model.connect(pitchCatalog);
 const first=model.resolve(connection(['SignalChain1'],'OscillatorEnvAmount'));
 const second=model.resolve(connection(['SignalChain2'],'OscillatorEnvAmount'));
 assert.ok(first);assert.ok(second);assert.equal(first.min,-1);assert.equal(first.max,1);
 assert.equal(first.getState().enabled,true);assert.equal(first.getState().value,-.5);
 assert.equal(second.getState().value,.25);
 first.onInput(.75);second.onInput(-.125);await model.idle();
 assert.deepEqual(calls,[
  {generation:'1',values:[{index:39,value:.75},{index:40,value:0}]},
  {generation:'1',values:[{index:122,value:.125},{index:123,value:1}]},
 ]);
 assert.equal(first.getState().value,.75);assert.equal(second.getState().value,-.125);
});

test('signed pitch fails closed unless both complete descriptor identities and batch transport match',()=>{
 const calls=[],model=createAnalogBindings({sendBatch:c=>calls.push(c)});
 const knob=model.resolve(connection(['SignalChain1'],'OscillatorEnvAmount'));assert.ok(knob);
 for(const parameters of [pitchCatalog.parameters.slice(0,1),[pitchCatalog.parameters[0],{...pitchCatalog.parameters[1],property:15}],
  [pitchCatalog.parameters[0],{...pitchCatalog.parameters[1],kind:0}],
  [pitchCatalog.parameters[0],{...pitchCatalog.parameters[1],value:.5}],
  [pitchCatalog.parameters[0],{...pitchCatalog.parameters[1],max:2}]]){
  model.connect({generation:'1',parameters});assert.equal(knob.getState().enabled,false);knob.onInput(.2);
 }
 model.connect(pitchCatalog);knob.onInput(-1.01);knob.onInput(NaN);assert.deepEqual(calls,[]);
 const unavailable=createAnalogBindings({send:()=>assert.fail('No single fallback for a pitch pair')});unavailable.connect(pitchCatalog);
 assert.equal(unavailable.resolve(connection(['SignalChain1'],'OscillatorEnvAmount')).getState().enabled,false);
});

test('signed pitch coalesces as one logical edit and ignores partial and stale polling',async()=>{
 const calls=[],waits=[],model=createAnalogBindings({sendBatch:command=>{calls.push(command);return new Promise(resolve=>waits.push(resolve));}});model.connect(pitchCatalog);
 const knob=model.resolve(connection(['SignalChain1'],'OscillatorEnvAmount'));
 knob.onInput(.2);knob.onInput(-.3);knob.onInput(.8);assert.equal(calls.length,1);
 model.observe(pitchCatalog);assert.equal(knob.getState().value,.8);
 waits.shift()(pitchAck(calls[0]));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calls.length,2);assert.deepEqual(calls[1].values,[{index:39,value:.8},{index:40,value:0}]);
 waits.shift()(pitchAck(calls[1],3,true));await model.idle();
 assert.equal(knob.getState().value,.8);assert.equal(knob.getState().applied,.8);assert.equal(knob.getState().pending,false);
 model.observe(pitchCatalog);assert.equal(knob.getState().value,.8);assert.equal(knob.getState().applied,.8);
 model.observe({generation:'1',parameters:[{...pitchCatalog.parameters[0],value:.1,revision:4}]});
 assert.equal(knob.getState().value,.8);
 model.observe({generation:'0',parameters:pitchAck({generation:'0',values:[{index:39,value:.1},{index:40,value:1}]},4,true).parameters});
 assert.equal(knob.getState().value,.8);
});

test('signed pitch ignores old instance completions and rejects incomplete acknowledgments',async()=>{
 const errors=[],waits=[],model=createAnalogBindings({sendBatch:command=>new Promise(resolve=>waits.push([resolve,command])),onError:e=>errors.push(e)});model.connect(pitchCatalog);
 const knob=model.resolve(connection(['SignalChain1'],'OscillatorEnvAmount'));knob.onInput(.2);
 model.disconnect();model.connect({...pitchCatalog,generation:'2'});
 const [resolve,command]=waits.shift();resolve(pitchAck(command));await model.idle();
 assert.equal(knob.getState().value,-.5);assert.deepEqual(errors,[]);
 knob.onInput(.7);waits.shift()[0]({generation:'2',parameters:[{...pitchCatalog.parameters[0],value:.7,revision:2}]});await model.idle();
 assert.equal(knob.getState().value,-.5);assert.equal(knob.getState().enabled,false);assert.equal(errors.length,1);
});

test('a delayed pitch acknowledgment cannot undo a newer coherent poll',async()=>{
 let finish,command;
 const model=createAnalogBindings({sendBatch:c=>{command=c;return new Promise(resolve=>{finish=resolve;});}});model.connect(pitchCatalog);
 const knob=model.resolve(connection(['SignalChain1'],'OscillatorEnvAmount'));knob.onInput(.3);
 model.observe(pitchAck({generation:'1',values:[{index:39,value:.9},{index:40,value:1}]},4,true));
 finish(pitchAck(command,2));await model.idle();
 assert.equal(knob.getState().value,-.9);assert.equal(knob.getState().applied,-.9);
});

test('single and paired binding states expose the current generation across reconnects',()=>{
 const model=createAnalogBindings({send:()=>assert.fail('No edit expected'),sendBatch:()=>assert.fail('No edit expected')});
 const bindings=[model.resolve(connection(['SignalChain1'],'OscillatorLevel')),model.resolve(connection(['SignalChain1'],'OscillatorEnvAmount'))];
 for(const binding of bindings){assert.equal(binding.getState().generation,null);assert.equal(binding.getState().known,false);}
 const parameters=[...catalog.parameters,...pitchCatalog.parameters];model.connect({generation:'1',parameters});
 const original=bindings.map(binding=>binding.getState());
 for(const state of original){assert.equal(state.generation,'1');assert.equal(state.known,true);}
 model.disconnect();
 for(const [i,binding]of bindings.entries()){
  const state=binding.getState();assert.equal(state.generation,null);assert.equal(state.known,true);assert.equal(state.value,original[i].value);
 }
 model.connect({generation:2,parameters});
 for(const binding of bindings)assert.equal(binding.getState().generation,'2');
 for(const state of original)assert.equal(state.generation,'1');
});
