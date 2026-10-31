import test from 'node:test';
import assert from 'node:assert/strict';
import {createUltraPresentationHost,createAlivePresentationHost} from './canvas-presentation-hosts.mjs';
import {createCanvasController} from './canvas-model.mjs';
import {deferred} from '../tests/presentation-dom.mjs';
import {dom,all,settle} from '../tests/presentation-dom.mjs';
import {mountPresentation} from './canvas-presentation-view.mjs';

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
