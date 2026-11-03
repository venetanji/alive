import test from 'node:test';
import assert from 'node:assert/strict';
import {createUltraPresentationHost,createAlivePresentationHost} from './canvas-presentation-hosts.mjs';
import {createCanvasController} from './canvas-model.mjs';
import {deferred} from '../tests/presentation-dom.mjs';
import {dom,all,settle} from '../tests/presentation-dom.mjs';
import {mountPresentation} from './canvas-presentation-view.mjs';
import {createSharedCanvasController} from './canvas-shared.mjs';
import {analogDescriptors,analogIdentity} from './live-profiles/analog/facts.mjs';
import {readFile} from 'node:fs/promises';

test('Ultra resolves authored numeric event and text targets with one canonical commit',async()=>{
  const calls=[],patch={version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[{id:1,type:'number_int',x:0,y:0,params:{value:3}},{id:2,type:'bang',x:0,y:0,params:{}},{id:3,type:'comment',x:0,y:0,params:{text:'Saved text'}}],edges:[]};
  const controller=createCanvasController({patch,invoke:async(name,args)=>{calls.push({name,args});if(name==='canvas_apply')return{revision:1};if(name==='document_parameter_gesture'){if(args.request.phase==='preview')calls.push({name:'native_preview',args:args.request});return{token:1,document:{}};}if(name==='audio_status')return{running:true};if(name==='canvas_status')return{revision:1,active:true,nodes:[],console:[]};}});await controller.prepare();
  const host=createUltraPresentationHost({controller}),target={kind:'parameter',node:1,param:'value'},resolved=host.resolve(target),scope=host.scope,gestureId=host.beginGesture(resolved.bindingId);
  assert.equal(resolved.descriptor.integral,true);assert.equal(host.resolve({kind:'text',node:3,param:'text'}).text,'Saved text');
  await host.write({scope,bindingId:resolved.bindingId,gestureId,phase:'preview',value:9});assert.ok(calls.some(c=>c.name==='native_preview'&&c.args.value===9));assert.equal(controller.getState().document.nodes[0].params.value,3);
  await host.write({scope,bindingId:resolved.bindingId,gestureId,phase:'commit',value:12});assert.equal(controller.getState().document.nodes[0].params.value,12);
  controller.undo();assert.equal(controller.getState().document.nodes[0].params.value,3);await controller.flush();
  await host.sendEvent({scope:host.scope,target:{kind:'event',node:2,inlet:0,action:'bang'},action:'bang'});assert.ok(calls.some(c=>c.name==='canvas_event'&&c.args.node===2&&c.args.value===null));host.dispose();await controller.dispose();
});
function alive(){
  const binding={key:'gain',node:1,param:'gain',min:0,max:2,base:1,integral:false,unit:null},presentation={items:[{target:{kind:'parameter',node:1,param:'gain'},resolved:{kind:'parameter',bindingId:'gain',descriptor:{min:0,max:2,integral:false}}}]};
  let state={generation:1,deviceInstances:{a:{index:0,manifest:{parameters:[binding],presentation}}},document:{tracks:[{chain:{kind:'midi',instrument:{instanceId:'a',sourceSha256:'source',path:'device.ultra'}}}]},state:{devices:[{effective:[.25],owned:[1]}]}},gate=null;
  const calls=[],host=createAlivePresentationHost({instanceId:'a',getSnapshot:()=>state,writeBase:async(request,assert,assertValue)=>{assert();assertValue();calls.push(request);await gate?.promise;assert();binding.base=request.value;assert();}});
  return{host,calls,binding,get state(){return state;},set state(value){state=value;},delay(){gate=deferred();return gate;}};
}
test('Alive retains generation/instance authorization and base/effective ownership through observations',async()=>{
  const h=alive(),resolved=h.host.resolve({kind:'parameter',node:1,param:'gain'}),scope=h.host.scope,gestureId=h.host.beginGesture('gain');
  assert.equal(resolved.bindingId,'gain');assert.deepEqual(h.host.snapshot('gain'),{commanded:1,applied:1,effective:.25,owner:'Automation',enabled:true,revision:0});
  const gate=h.delay(),pending=h.host.write({scope,bindingId:'gain',gestureId,phase:'commit',value:1.3});
  h.state.state.devices[0].effective[0]=.7;h.host.publish();assert.deepEqual(h.host.scope,scope);gate.resolve();await pending;
  assert.deepEqual(h.calls,[{generation:1,instanceId:'a',key:'gain',value:1.3}]);assert.equal(h.host.snapshot('gain').effective,.7);h.host.dispose();
});
test('Alive rejects stale writes and delayed replies after source replacement or owner disposal',async()=>{
  const h=alive(),scope=h.host.scope,gestureId=h.host.beginGesture('gain'),gate=h.delay();
  const pending=h.host.write({scope,bindingId:'gain',gestureId,phase:'commit',value:1.5});await settle();h.state.document.tracks[0].chain.instrument.sourceSha256='replacement';gate.resolve();await assert.rejects(pending,/scope changed/);
  await assert.rejects(h.host.write({scope,bindingId:'gain',gestureId,phase:'commit',value:1}),/scope changed/);assert.equal(h.calls.length,1);
  const next=h.host.scope,id=h.host.beginGesture('gain');h.host.dispose();await assert.rejects(h.host.write({scope:next,bindingId:'gain',gestureId:id,phase:'commit',value:1}),/scope changed/);
});
test('Alive cancellation cannot overwrite an observed edit from another parameter owner',async()=>{
  const h=alive(),scope=h.host.scope,gestureId=h.host.beginGesture('gain');await h.host.write({scope,bindingId:'gain',gestureId,phase:'preview',value:1.2});
  h.binding.base=1.6;await assert.rejects(h.host.write({scope,bindingId:'gain',gestureId,phase:'cancel',value:1}),/changed during/);assert.equal(h.binding.base,1.6);assert.equal(h.calls.length,1);h.host.dispose();
});
for(const commitBeforeReply of [false,true])test(`Alive mounted control recovers from an ownership conflict with a newer ${commitBeforeReply?'gesture':'draft'}`,async()=>{
  const h=alive(),page=dom(),errors=[],presentation={version:1,openOnLoad:false,size:{width:120,height:140},items:[{id:'gain',kind:'control',target:{kind:'parameter',node:1,param:'gain'},widget:'dial',label:'Gain',included:true,visible:true,rect:{x:0,y:0,width:100,height:120},style:{accent:'default',labelPosition:'above'}}]};
  const view=mountPresentation({...page,presentation,host:h.host,onError:error=>errors.push(error)}),range=all(page.root).find(e=>e.type==='range'),number=all(page.root).find(e=>e.type==='number');
  range.fire('pointerdown',{pointerId:1,clientX:0,clientY:0});range.fire('pointermove',{pointerId:1,clientX:16,clientY:0});await settle();assert.equal(h.binding.base,1.2);
  h.binding.base=1.6;h.host.publish();range.fire('keydown',{key:'Escape'});number.value='1.7';number.fire('input');if(commitBeforeReply)number.fire('change');await settle();
  assert.equal(number.value,'1.7');
  if(!commitBeforeReply){assert.equal(h.binding.base,1.6);assert.equal(view.hasDraft(),true);number.fire('change');await settle();}
  assert.equal(h.binding.base,1.7);assert.deepEqual(h.calls.map(call=>call.value),[1.2,1.7]);assert.equal(errors.length,commitBeforeReply?0:1);assert.equal(view.hasDraft(),false);
  view.dispose();h.host.dispose();
});
test('mounted Ultra comment and message text refresh with current and cleared appearance',async()=>{
  const presentation={version:1,openOnLoad:false,size:{width:240,height:120},items:[1,2].map((node,index)=>({id:`text-${node}`,kind:'control',target:{kind:'text',node,param:'text'},widget:'text',label:'',included:true,visible:true,rect:{x:0,y:index*50,width:220,height:40},style:{accent:'default',labelPosition:'above'}}))};
  const patch={version:2,profile:'ultra-patcher-v2',presentation,nodes:[{id:1,type:'comment',x:0,y:0,params:{text:'Before'},style:{fontsize:18,textcolor:[1,0,0,1],bgcolor:[0,0,0,1]}},{id:2,type:'message_box',x:0,y:50,params:{text:'1'}}],edges:[]};
  const controller=createCanvasController({patch}),host=createUltraPresentationHost({controller}),page=dom(),view=mountPresentation({...page,presentation,host});
  const texts=all(page.root).filter(e=>e.classList.contains('presentation-text')),scope=host.scope;
  assert.equal(texts[0].textContent,'Before');assert.equal(texts[0].style.fontSize,'18px');
  controller.parameter(1,'text','After');host.publish();assert.equal(texts[0].textContent,'After');
  controller.parameter(2,'text','2');view.update();assert.equal(texts[1].textContent,'2');assert.deepEqual(host.scope,scope);
  controller.style(1,'fontsize',24);host.publish();assert.equal(texts[0].style.fontSize,'24px');
  controller.style(1,null);view.update();assert.equal(texts[0].style.fontSize,'');assert.equal(texts[0].style.color,'');assert.equal(texts[0].style.backgroundColor,'');
  assert.equal(all(page.root).find(e=>e.classList.contains('presentation-text')),texts[0]);
  controller.load({...patch,nodes:[{...patch.nodes[0],params:{text:'Replacement'}},patch.nodes[1]]});host.publish();assert.equal(texts[0].textContent,'After');
  view.dispose();host.dispose();await controller.dispose();
});
test('disposing a surface during preview writes nothing and owner settlement persists its accepted value',async()=>{
  const calls=[],patch={version:1,profile:'ultra-canvas-v1',presentation:null,nodes:[{id:1,type:'number',x:0,y:0,params:{value:.4}}],edges:[]};
  const controller=createCanvasController({patch,invoke:async(name,args)=>{calls.push({name,args});if(name==='canvas_apply')return{revision:1};if(name==='document_parameter_gesture')return{token:1,document:{}};}});await controller.prepare();
  const host=createUltraPresentationHost({controller}),page=dom(),presentation={version:1,openOnLoad:false,size:{width:120,height:140},items:[{id:'value',kind:'control',target:{kind:'parameter',node:1,param:'value'},widget:'dial',label:'Value',included:true,visible:true,rect:{x:0,y:0,width:100,height:120},style:{accent:'default',labelPosition:'above'}}]};
  const view=mountPresentation({...page,presentation,host}),range=all(page.root).find(e=>e.type==='range');range.value='7';range.fire('input');await settle();
  const before=calls.length;view.dispose();host.dispose();range.fire('change');await settle();assert.equal(calls.length,before);assert.equal(controller.getState().parameterPreviews[0].value,7);assert.equal(controller.getState().document.nodes[0].params.value,.4);
  await controller.settleParameterGestures();assert.equal(controller.getState().document.nodes[0].params.value,7);assert.equal(calls.at(-1).args.request.phase,'commit');await controller.dispose();
});

const panelSource=()=>({version:1,profile:analogIdentity.profile,dllSha256:analogIdentity.dllSha256,
  guiSha256:analogIdentity.guiSha256,graphicsSha256:analogIdentity.graphicsSha256,values:analogDescriptors.map(row=>row.min)});
const panelPresentation={version:1,openOnLoad:false,size:{width:640,height:240},items:[7,8].map((node,index)=>({
  id:`native-${node}`,kind:'livePanel',target:{node,profile:'live12-analog-v1'},included:true,visible:true,
  rect:{x:index*300,y:0,width:300,height:240},style:{accent:'default'},
}))};
async function nativePanelSetup(){
  let runtimeRevision=10,authoringRevision=1,ownerLabel='owner',hook=null,ownerChanged=false;
  let patch={version:2,profile:'ultra-patcher-v2',presentation:structuredClone(panelPresentation),nodes:[7,8].map(id=>({id,type:'live_device',x:0,y:0,params:{device:'Analog',state:panelSource()}})),edges:[]};
  patch.nodes[0].params.state.values[194]=12.1;
  const calls=[],descriptor=()=>({shared:true,id:1,label:'owner',ownerLabel,viewPath:[],patch:structuredClone(patch),runtimeRevision,authoringRevision,descriptorRevision:authoringRevision});
  const invoke=async(name,args={})=>{
    calls.push({name,args:structuredClone(args),at:performance.now()});
    if(hook){const response=hook(name,args);if(response!==undefined)return await response;}
    if(name==='document_current')return descriptor();
    if(name==='live_device_resource_pack'){
      const fixtures=JSON.parse(await readFile(process.env.ALIVE_RESOURCE_PACK_FIXTURES,'utf8'));
      return new Uint8Array(await readFile(fixtures['current-20261102'][args.kind]));
    }
    if(name==='live_device_parameters'){
      const state=patch.nodes.find(node=>node.id===args.node)?.params.state;
      if(!state)throw Error('Source removed');
      return{generation:String(runtimeRevision),parameters:analogDescriptors.map(row=>({...row,value:Math.fround(state.values[row.index]),applied:Math.fround(state.values[row.index]),revision:1,applied_revision:1}))};
    }
    throw Error(`Unexpected panel IPC ${name}`);
  };
  const controller=createSharedCanvasController({invoke});assert.equal(await controller.prepare(),true,controller.getState().notice);
  const host=createUltraPresentationHost({controller:{...controller,getState:()=>ownerChanged?{...controller.getState(),ownerId:'replacement'}:controller.getState()},invoke});
  return{host,controller,calls,descriptor,get patch(){return patch;},
    publish(change=()=>{}){change(patch);authoringRevision++;controller.acceptDescriptor(descriptor());host.publish();},
    reapply(){runtimeRevision++;authoringRevision++;controller.acceptDescriptor(descriptor());host.publish();},
    owner(){ownerChanged=true;host.publish();},
    hook(fn){hook=fn;},async dispose(){host.dispose();await controller.dispose();}};
}
const acquire=(host,node=7)=>host.acquirePanel({scope:host.scope,sourceNode:node,profile:'live12-analog-v1'});
const resourceTests={skip:!process.env.ALIVE_RESOURCE_PACK_FIXTURES||typeof globalThis.DOMParser!=='function'};

test('ordinary panel acquisition requires native shared raw-source capability and refuses every panel write',async()=>{
  const local=createCanvasController({patch:{version:2,profile:'ultra-patcher-v2',presentation:null,nodes:[],edges:[]}}),calls=[];
  const host=createUltraPresentationHost({controller:local,invoke:async(...args)=>calls.push(args)});
  await assert.rejects(Promise.resolve().then(()=>acquire(host)),/unavailable|shared/i);
  assert.equal(calls.length,0);assert.throws(()=>host.writeBatch({}),/unavailable/i);host.dispose();await local.dispose();
  const h=await nativePanelSetup();
  h.hook(name=>name==='live_device_resource_pack'?Promise.reject(Error('bounded resource read reached')):undefined);
  await assert.rejects(acquire(h.host),/bounded resource read reached/);
  assert.equal(h.calls.filter(call=>call.name==='live_device_resource_pack').length,1);
  await assert.rejects(h.host.acquirePanel({scope:h.host.scope,sourceNode:7,profile:'foreign'}),/profile|unavailable/i);
  assert.throws(()=>h.host.writeBatch({sourceNode:7,values:{NoiseBalance:.5}}),/unavailable/i);
  await h.dispose();
});

test('real ordinary host acquires exact installed packs and native cached cells without source writes',resourceTests,async()=>{
  const h=await nativePanelSetup(),raw=h.controller.readLiveSource(7).expected;
  try{
    const result=await acquire(h.host),snapshot=result.bindings.snapshot();
    assert.equal(result.resources.identity.guiSha256,analogIdentity.guiSha256);
    assert.equal(result.resources.identity.graphicsSha256,analogIdentity.graphicsSha256);
    assert.ok(result.resources.layout.nodeCount>100);
    assert.deepEqual(snapshot.expected,raw);assert.equal(snapshot.expected.state.values[194],12.1);
    assert.equal(snapshot.nativeStatus,'observed');
    assert.equal(result.bindings.resolveBinding({scope:[],expression:'NoiseBalance'},{}).getState().enabled,false);
    assert.deepEqual(h.calls.filter(call=>call.name==='live_device_parameters').map(({args})=>args),[{revision:10,node:7}]);
    assert.equal(h.calls.some(call=>/commit|set_parameter|apply/.test(call.name)),false);
    result.bindings.disconnect();
  }finally{await h.dispose();}
});

for(const boundary of ['GUI','Graphics','native'])for(const change of ['source','remove','runtime','owner','hash','profile','presentation','dispose'])
  test(`ordinary acquisition discards ${boundary} replies after ${change} changes`,boundary==='GUI'?{}:resourceTests,async()=>{
    const h=await nativePanelSetup(),gate=deferred();let reached=false;
    h.hook((name,args)=>{
      if(!reached&&(boundary==='native'?name==='live_device_parameters':name==='live_device_resource_pack'&&args.kind===boundary)){
        reached=true;return gate.promise;
      }
    });
    const pending=acquire(h.host);
    while(!reached)await settle();
    if(change==='runtime')h.reapply();else if(change==='owner')h.owner();else if(change==='dispose')h.host.dispose();
    else h.publish(patch=>{
      if(change==='source')patch.nodes[0].params.state.values[194]=12.2;
      if(change==='remove'){patch.nodes.shift();patch.presentation.items.shift();}
      if(change==='hash'){
        patch.nodes[0].params.state.guiSha256='5ec872d673fd5f4f5f05787e4245c56e172ff2663c2d4493e94d598b883114e6';
        patch.nodes[0].params.state.graphicsSha256='a0b8aa480aa3d21f093b416ea59b3f200d2e2466936f95d886a554bffe875cb7';
      }
      if(change==='profile'){patch.nodes[0]={...patch.nodes[0],type:'number',params:{value:0}};patch.presentation.items.shift();}
      if(change==='presentation')patch.presentation=null;
    });
    gate.resolve(null);await assert.rejects(pending,/changed|unavailable|disconnect/i);await h.dispose();
  });

test('multiple ordinary mounts share bounded node observations and refresh raw source in place',resourceTests,async()=>{
  const h=await nativePanelSetup();
  try{
    const [a,b,other]=await Promise.all([acquire(h.host),acquire(h.host),acquire(h.host,8)]);
    assert.equal(a.resources,b.resources);assert.notEqual(a.bindings,b.bindings);
    const reads=()=>h.calls.filter(call=>call.name==='live_device_parameters');
    assert.equal(reads().filter(call=>call.args.node===7).length,1);
    h.publish(patch=>{patch.nodes[0].params.state.values[26]=.75;});
    assert.equal(a.bindings.snapshot().values.NoiseBalance,.25);
    assert.equal(b.bindings.snapshot().values.NoiseBalance,.25);
    assert.equal(other.bindings.snapshot().values.NoiseBalance,1);
    const gate=deferred();let started=false;
    h.hook((name,args)=>name==='live_device_parameters'&&args.node===7?(started=true,gate.promise):undefined);
    await new Promise(resolve=>setTimeout(resolve,275));
    assert.equal(started,true);
    for(let i=0;i<10;i++)h.host.publish();
    assert.equal(reads().filter(call=>call.args.node===7).length,2);
    h.publish(patch=>{patch.nodes[0].params.state.values[26]=.5;});
    gate.resolve({generation:'10',parameters:analogDescriptors.map(row=>({...row,value:row.min,applied:row.min,revision:1,applied_revision:1}))});
    await settle();assert.equal(a.bindings.snapshot().values.NoiseBalance,.5);
    assert.equal(a.bindings.snapshot().nativeStatus,'unavailable');
    const nodeReads=reads().filter(call=>call.args.node===7);assert.ok(nodeReads[1].at-nodeReads[0].at>=250);
    a.bindings.disconnect();b.bindings.disconnect();other.bindings.disconnect();const before=reads().length;
    await new Promise(resolve=>setTimeout(resolve,275));assert.equal(reads().length,before);
  }finally{await h.dispose();}
});

test('disconnect and fresh acquisition retain the per-node interval and disposal cancels a waiting acquisition',resourceTests,async()=>{
  const h=await nativePanelSetup();
  try{
    const first=await acquire(h.host);first.bindings.disconnect();
    const second=await acquire(h.host);second.bindings.disconnect();
    const reads=h.calls.filter(call=>call.name==='live_device_parameters');
    assert.equal(reads.length,2);assert.ok(reads[1].at-reads[0].at>=250);
    h.publish(patch=>{patch.nodes[0].params.state.values[26]=.75;});
    const pending=acquire(h.host);await settle();h.host.dispose();
    await assert.rejects(pending,/disconnect|scope changed/i);
    assert.equal(h.calls.filter(call=>call.name==='live_device_parameters').length,2);
  }finally{await h.dispose();}
});
