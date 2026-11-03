import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CanvasDocument,makeNode} from './canvas-model.mjs';
import {createSharedCanvasController} from './canvas-shared.mjs';
import {createLiveDeviceState} from './live-device-profile.mjs';
import {analogDescriptors} from './live-profiles/analog/facts.mjs';

// Substitute only acquisition and qualification dependencies; the host and U1
// controller under test are the actual source modules. No seam ships to users.
const sourceUrl=new URL('./canvas-presentation-hosts.mjs',import.meta.url);
const original=await readFile(sourceUrl,'utf8');
const fakeResources=`export async function readLiveDeviceResources(){return {layout:{},identity:{}}}`;
const realBindings=new URL('./live-profiles/analog/panel-bindings.mjs',import.meta.url).href;
const fakeBindings=`export {createAnalogPanelBindings} from ${JSON.stringify(realBindings)}; export function analogWritableKey(_expected,key){return key==='NoiseToggle';}`;
const data=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const transformed=original.replace(/from '(\.\/[^']+)'/g,(_,path)=>{
  const url=path==='./live-device-resources.mjs'?data(fakeResources):path==='./live-profiles/analog/panel-bindings.mjs'?data(fakeBindings):new URL(path,sourceUrl).href;
  return `from '${url}'`;
});
const {createUltraPresentationHost}=await import(data(transformed));
const realAuthoritySource=original.replace(/from '(\.\/[^']+)'/g,(_,path)=>`from '${path==='./live-device-resources.mjs'?data(fakeResources):new URL(path,sourceUrl).href}'`);
const productionHost=(await import(data(realAuthoritySource))).createUltraPresentationHost;
const clone=structuredClone;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const profile='live12-analog-v1';
function setupPatch(){
  const presentation={version:1,openOnLoad:false,size:{width:640,height:240},items:[1,2].map((node,index)=>({id:`panel-${node}`,kind:'livePanel',target:{node,profile},included:true,visible:true,rect:{x:index*300,y:0,width:300,height:240},style:{accent:'default'}}))};
  const nodes=[1,2].map(id=>{const state=createLiveDeviceState();state.values[24]=0;state.values[194]=12.1;return {...makeNode('live_device',id),params:{device:'Analog',state}};});
  return {version:2,profile:'ultra-patcher-v2',presentation,nodes,edges:[]};
}
async function setup(hostFactory=createUltraPresentationHost){
  let patch=setupPatch(),revision=1,hold=null,fail=null,unavailable=false,closing=false,faulted=false,overtake=false;
  const calls=[],past=[],listeners=[];
  const descriptor=()=>({shared:true,id:1,label:'owner',ownerLabel:'owner',viewPath:[],patch:clone(patch),runtimeRevision:10,authoringRevision:revision,descriptorRevision:revision,canUndo:past.length>0,canRedo:false,parameterPreviews:[]});
  const invoke=async(name,args={})=>{
    calls.push({name,args:clone(args)});
    if(name==='document_current')return descriptor();
    if(name==='live_device_resource_pack')return [1];
    if(name==='live_device_parameters'){const state=patch.nodes.find(n=>n.id===args.node).params.state;return {generation:'10',parameters:analogDescriptors.map(row=>({...row,value:Math.fround(state.values[row.index]),applied:Math.fround(state.values[row.index]),revision:1,applied_revision:1}))};}
    if(name==='document_commit'){
      if(hold){const gate=hold;hold=null;await gate;}
      if(args.baseRevision!==revision)return {accepted:false,document:descriptor()};
      new CanvasDocument(args.patch);past.push(clone(patch));patch=clone(args.patch);revision++;
      for(const listener of listeners)listener(descriptor());
      if(fail==='lost'){fail=null;throw Error('reply lost');}
      const receipt=descriptor();
      if(overtake){overtake=false;patch.nodes[0].params.state.values[24]=0;revision++;for(const listener of listeners)listener(descriptor());}
      return {accepted:true,document:receipt};
    }
    if(name==='audio_status')return {running:true};
    if(name==='canvas_status')return {revision:10,active:true,nodes:[]};
    if(name==='audio_panic')return true;
    throw Error(`Unexpected IPC ${name}`);
  };
  const controller=createSharedCanvasController({invoke});listeners.push(controller.acceptDescriptor);assert.equal(await controller.prepare(),true);
  const wrapped={...controller,getState:()=>({...controller.getState(),closing:closing||controller.getState().closing,faulted:faulted||controller.getState().faulted}),readLiveSource:node=>unavailable?{available:false,reason:'unavailable'}:controller.readLiveSource(node)};
  const host=hostFactory({controller:wrapped,invoke});
  const acquire=async node=>host.acquirePanel({scope:host.scope,sourceNode:node,profile});
  const begin=node=>{assert.equal(typeof host.beginSourceGesture,'function','host must support acquired source gestures');return host.beginSourceGesture(node);};
  const write=(node,id,phase,values)=>Promise.resolve().then(()=>host.writeBatch({scope:host.scope,sourceNode:node,gestureId:id,phase,values}));
  return {host,controller,acquire,begin,write,calls,past,get patch(){return clone(patch);},hold(){let release;hold=new Promise(r=>release=r);return release;},lose(){fail='lost';},overtake(){overtake=true;},unavailable(){unavailable=true;},close(){closing=true;},fault(){faulted=true;},replace(node,value){patch.nodes.find(n=>n.id===node).params.state.values[24]=value;revision++;for(const listener of listeners)listener(descriptor());host.publish();},dispose(){host.dispose();return controller.dispose();}};
}
const writes=h=>h.calls.filter(c=>c.name==='document_commit');

test('source preview and cancel never publish or create history',async()=>{const h=await setup();try{await h.acquire(1);const id=h.begin(1);await h.write(1,id,'preview',{NoiseToggle:true});await h.write(1,id,'preview',{NoiseToggle:false});await h.write(1,id,'cancel',{});assert.equal(writes(h).length,0);assert.equal(h.past.length,0);assert.equal(h.controller.readLiveSource(1).expected.state.values[24],0);}finally{await h.dispose();}});
test('one commit changes only slot 24 and keeps the second source and raw precision',async()=>{const h=await setup();try{await h.acquire(1);await h.acquire(2);const before=h.patch,id=h.begin(1),reply=await h.write(1,id,'commit',{NoiseToggle:true});assert.equal(reply.outcome,'accepted');assert.equal(writes(h).length,1);assert.equal(h.past.length,1);const expected=clone(before);expected.nodes[0].params.state.values[24]=1;assert.deepEqual(h.patch,expected);assert.equal(h.patch.nodes[0].params.state.values[194],12.1);}finally{await h.dispose();}});
test('reverted candidate is unchanged without a history entry',async()=>{const h=await setup();try{await h.acquire(1);const id=h.begin(1);await h.write(1,id,'preview',{NoiseToggle:true});const result=await h.write(1,id,'commit',{NoiseToggle:false});assert.equal(result.outcome,'unchanged');assert.equal(writes(h).length,0);assert.equal(h.past.length,0);}finally{await h.dispose();}});
test('stale no-op conflicts even when its original value is unchanged',async()=>{const h=await setup();try{await h.acquire(1);const id=h.begin(1);h.replace(1,1);const result=await h.write(1,id,'commit',{NoiseToggle:false});assert.equal(result.outcome,'conflict');assert.equal(writes(h).length,0);}finally{await h.dispose();}});
test('a gesture cannot write to another acquired source identity',async()=>{const h=await setup();try{await h.acquire(1);await h.acquire(2);const id=h.begin(1);await assert.rejects(h.write(2,id,'commit',{NoiseToggle:true}));assert.equal(writes(h).length,0);}finally{await h.dispose();}});
for(const [label,values] of [['unknown',{NoSuchKey:true}],['disabled',{NoiseBalance:.5}],['nonboolean',{NoiseToggle:1}],['nonfinite',{NoiseToggle:NaN}],['prototype',Object.assign(Object.create({NoiseToggle:true}),{NoiseBalance:.5})]])test(`rejects ${label} injection before U1`,async()=>{const h=await setup();try{await h.acquire(1);const id=h.begin(1);await assert.rejects(h.write(1,id,'commit',values));assert.equal(writes(h).length,0);}finally{await h.dispose();}});
for(const mode of ['unavailable','close','fault'])test(`${mode} revokes an acquired gesture before commit`,async()=>{const h=await setup();try{await h.acquire(1);const id=h.begin(1);h[mode]();await assert.rejects(h.write(1,id,'commit',{NoiseToggle:true}));assert.equal(writes(h).length,0);}finally{await h.dispose();}});
test('duplicate pending commit shares one Promise and acknowledgement',async()=>{const h=await setup();try{await h.acquire(1);const id=h.begin(1),release=h.hold(),request={scope:h.host.scope,sourceNode:1,gestureId:id,phase:'commit',values:{NoiseToggle:true}},a=h.host.writeBatch(request),b=h.host.writeBatch(request);assert.strictEqual(a,b);await tick();assert.equal(writes(h).length,1);release();assert.equal((await a).outcome,'accepted');assert.equal((await b).outcome,'accepted');assert.equal(h.past.length,1);}finally{await h.dispose();}});
test('lost acknowledgement returns unknown without replay or rollback',async()=>{const h=await setup();try{await h.acquire(1);h.lose();const id=h.begin(1),reply=await h.write(1,id,'commit',{NoiseToggle:true});assert.equal(reply.outcome,'unknown');assert.equal(writes(h).length,1);assert.equal(h.patch.nodes[0].params.state.values[24],1);assert.equal(h.past.length,1);}finally{await h.dispose();}});

test('invalid phase and stale scope are rejected before U1',async()=>{const h=await setup();try{await h.acquire(1);const id=h.begin(1),scope=h.host.scope;await assert.rejects(h.write(1,id,'bogus',{NoiseToggle:true}));await assert.rejects(Promise.resolve().then(()=>h.host.writeBatch({scope:{...scope,generation:scope.generation+1},sourceNode:1,gestureId:id,phase:'commit',values:{NoiseToggle:true}})));assert.equal(writes(h).length,0);}finally{await h.dispose();}});

test('production authority rejects a simulated NoiseToggle commit',async()=>{const h=await setup(productionHost);try{await h.acquire(1);const id=h.begin(1);await assert.rejects(h.write(1,id,'commit',{NoiseToggle:true}));assert.equal(writes(h).length,0);assert.equal(h.past.length,0);}finally{await h.dispose();}});

test('accepted receipt does not replace a newer canonical broadcast',async()=>{const h=await setup();try{const panel=await h.acquire(1);const id=h.begin(1);h.overtake();const reply=await h.write(1,id,'commit',{NoiseToggle:true});assert.equal(reply.outcome,'accepted');assert.equal(h.controller.readLiveSource(1).expected.state.values[24],0);assert.equal(panel.bindings.snapshot().expected.state.values[24],0);assert.equal(writes(h).length,1);}finally{await h.dispose();}});
test('one acquired member cannot hold two source gestures',async()=>{const h=await setup();try{await h.acquire(1);const id=h.begin(1);assert.throws(()=>h.begin(1),/acquired|gesture/i);await h.write(1,id,'cancel',{});assert.ok(h.begin(1));}finally{await h.dispose();}});
test('a source replacement revokes the gesture even if the source later returns to its old value',async()=>{const h=await setup();try{await h.acquire(1);const id=h.begin(1);h.replace(1,1);h.replace(1,0);const reply=await h.write(1,id,'commit',{NoiseToggle:false});assert.equal(reply.outcome,'conflict');assert.equal(writes(h).length,0);}finally{await h.dispose();}});
test('disconnecting an acquired panel revokes its active source gesture',async()=>{const h=await setup();try{const panel=await h.acquire(1),id=h.begin(1);panel.bindings.disconnect();await assert.rejects(h.write(1,id,'commit',{NoiseToggle:true}));assert.equal(writes(h).length,0);}finally{await h.dispose();}});
