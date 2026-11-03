import test from 'node:test';
import assert from 'node:assert/strict';
import {mountPresentation} from './canvas-presentation-view.mjs';
import {dom,all,settle,deferred} from '../tests/presentation-dom.mjs';
import {createAnalogPanelBindings} from './live-profiles/analog/panel-bindings.mjs';
import {analogDescriptors,analogIdentity} from './live-profiles/analog/facts.mjs';

const layout={version:1,openOnLoad:false,size:{width:640,height:220},items:[{id:'level',kind:'control',target:{kind:'parameter',node:1,param:'value'},widget:'dial',label:'Level',rect:{x:8,y:8,width:88,height:112},included:true,visible:true,style:{accent:'cyan',labelPosition:'above'}}]};
function fake(instanceId='one'){
  let scope={ownerId:'owner',generation:1,instanceId,sourceRevision:'source'},state={commanded:.4,applied:.4,effective:.8,owner:'Automation',enabled:true,revision:1},next=0;
  const listeners=new Set(),writes=[],errors=[];
  const host={get scope(){return scope;},resolve:()=>({bindingId:'level',descriptor:{min:0,max:1,integral:false},capabilities:{write:true}}),snapshot:()=>state,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},beginGesture:()=>++next,async write(request){writes.push(request);state={...state,commanded:request.value};return state;},sendEvent:async()=>{},acquirePanel:async()=>{throw Error('Panel resources unavailable');}};
  return{host,writes,errors,listeners,change(value){state={...state,...value};for(const fn of listeners)fn();},changeScope(){scope={...scope,sourceRevision:'changed'};for(const fn of listeners)fn();}};
}
const number=root=>all(root).find(e=>e.tagName==='INPUT'&&e.type==='number');
test('same saved layout has independent drafts, writes, effective readings and no keyboard',async()=>{
  const a=dom(),b=dom(),ha=fake(),hb=fake('two');
  const va=mountPresentation({...a,presentation:layout,host:ha.host}),vb=mountPresentation({...b,presentation:layout,host:hb.host});
  const input=number(a.root);input.value='.63';input.fire('input');assert.equal(va.hasDraft(),true);assert.equal(vb.hasDraft(),false);
  ha.change({commanded:.2,enabled:false});assert.equal(input.value,'.63');assert.equal(va.hasDraft(),true);
  ha.change({enabled:true});input.fire('change');await settle();assert.equal(ha.writes.at(-1).value,.63);assert.equal(hb.writes.length,0);assert.equal(number(b.root).value,'0.4');
  assert.ok(all(a.root).some(e=>e.textContent==='Automation: 0.8'));assert.equal(all(a.root).some(e=>/keyboard/.test(e.className)),false);
  va.dispose();vb.dispose();assert.equal(ha.listeners.size,0);
});
test('range cancellation carries explicit phase and stale replies cannot overwrite later drafts',async()=>{
  const page=dom(),h=fake(),gate=deferred();h.host.write=request=>{h.writes.push(request);return gate.promise;};
  const view=mountPresentation({...page,presentation:layout,host:h.host});const range=all(page.root).find(e=>e.type==='range');
  range.fire('pointerdown',{pointerId:1,clientX:0,clientY:0});range.fire('pointermove',{pointerId:1,clientX:10,clientY:0});range.fire('keydown',{key:'Escape'});await settle();
  assert.equal(h.writes.at(-1).phase,'cancel');assert.equal(h.writes.at(-1).value,.4);
  const input=number(page.root);input.value='.77';input.fire('input');h.changeScope();gate.resolve({commanded:.1,enabled:true});await settle();assert.equal(input.value,'.77');
  const before=h.writes.length;input.fire('change');await settle();assert.equal(h.writes.length,before);view.dispose();
});
test('rejected writes reconcile accepted state and preserve a newer numeric draft',async()=>{
  const page=dom(),h=fake(),gate=deferred();h.host.write=()=>gate.promise;
  const view=mountPresentation({...page,presentation:layout,host:h.host,onError:e=>h.errors.push(e)}),input=number(page.root);
  input.value='.6';input.fire('input');input.fire('change');input.value='.7';input.fire('input');gate.reject(Error('Rejected value'));await settle();
  assert.equal(input.value,'.7');assert.equal(view.hasDraft(),true);assert.match(h.errors[0].message,/Rejected/);view.dispose();
});
test('empty, excluded and missing panel surfaces preserve authored sizes and dispose without playback',async()=>{
  const page=dom(),h=fake();const panel={id:'panel',kind:'livePanel',target:{node:7,profile:'fixture'},rect:{x:20,y:20,width:300,height:140},included:true,visible:true,style:{accent:'default'}};
  const view=mountPresentation({...page,presentation:{...layout,items:[panel,{...layout.items[0],included:false}]},host:h.host});await settle();
  const error=all(page.root).find(e=>e.getAttribute('role')==='alert');assert.match(error.textContent,/resources unavailable/);assert.equal(error.parentElement.style.width,'300px');assert.equal(number(page.root),undefined);
  view.dispose();assert.equal(h.writes.length,0);assert.equal(h.listeners.size,0);
  const empty=dom(),v=mountPresentation({...empty,presentation:{...layout,items:[]},host:h.host});assert.equal(all(empty.root).filter(e=>e.tagName==='INPUT').length,0);v.dispose();
});

const resourceNode=(className,{expression,children=[],properties={},text=''}={})=>({className,scope:[],resource:'fixture.xml',properties,children,connection:expression?{scope:[],expression,resource:'fixture.xml'}:null,text:()=>text});
function panelHost(instanceId){
  const prop=value=>({attributes:{Value:String(value)}});
  const h=fake(instanceId),resources=Object.freeze({identity:'fixture:gui-sha:graphics-sha:EN:fixture.xml',layout:{root:resourceNode('VertBoxView',{children:[
    resourceNode('FingerView',{expression:'page',properties:{IndexExpression:prop(0),ViewId:prop('first')},children:[resourceNode('TextField',{text:'First'})]}),
    resourceNode('FingerView',{expression:'page',properties:{IndexExpression:prop(1),ViewId:prop('second')},children:[resourceNode('TextField',{text:'Second'})]}),
    resourceNode('CardView',{expression:'page',children:[resourceNode('VertBoxView',{children:[resourceNode('LoadableDisplayStyleEditField',{expression:'a'}),resourceNode('LoadableDisplayStyleEditField',{expression:'b',properties:{ShowWhen:{tag:'ViewExpressionProperty',attributes:{Value:'show'}}}})]}),resourceNode('TextField',{text:'Second page',properties:{IsVisible:prop(false)}})]})]}),warnings:[]},graphics:null});
  let state={a:.2,b:.3,undisplayed:.9},enabled=true,disconnected=0,show=true;
  const batches=[];
  h.host.acquirePanel=async()=>({resources,bindings:{resolveBinding:connection=>({bindingId:connection.expression,verified:true,handlesExpressions:true,min:0,max:1,getState:()=>({enabled,known:true,value:state[connection.expression],initial:state[connection.expression],generation:1})}),evaluateExpression:()=>show,snapshot:()=>({values:{...state}}),observe:accepted=>{state={...accepted.values};},disconnect(){enabled=false;disconnected++;}}});
  h.host.beginSourceGesture=()=>1;h.host.writeBatch=async request=>{batches.push(request);if(request.phase==='commit')state={...state,...request.values};return request.phase==='commit'?{outcome:'accepted'}:{phase:request.phase};};
  return{...h,resources,batches,get state(){return state;},get disconnected(){return disconnected;},hide(){show=false;h.change({});}};
}
const panelLayout={...layout,items:[{id:'panel',kind:'livePanel',target:{node:7,profile:'fixture'},rect:{x:8,y:8,width:300,height:140},included:true,visible:true,style:{accent:'default'}}]};
test('a rejected Boolean source commit retains its candidate and reports the outcome',async()=>{
  const page=dom(),h=fake(),gate=deferred(),batches=[];let observations=0;
  h.host.acquirePanel=async()=>({resources:{identity:'bool',layout:{root:resourceNode('LoadableCheckControlText',{expression:'flag'}),warnings:[]}},bindings:{snapshot:()=>({values:{flag:false}}),resolveBinding:()=>({bindingId:'flag',verified:true,getState:()=>({enabled:true,known:true,value:false})}),observe:()=>observations++,disconnect(){}}});
  h.host.beginSourceGesture=()=>42;h.host.writeBatch=request=>{batches.push(request);return gate.promise;};
  const view=mountPresentation({...page,presentation:panelLayout,host:h.host});await settle();
  all(page.root).find(e=>e.tagName==='BUTTON').fire('click');await settle();
  assert.deepEqual(batches[0].values,{flag:true});gate.resolve({outcome:'rejected',reason:'Source rejected'});await settle();
  assert.equal(observations,0);assert.equal(view.hasDraft(),true);assert.match(all(page.root).find(e=>e.getAttribute('role')==='status').textContent,/Source rejected/);
  view.dispose();
});
test('a pending Boolean commit blocks another click and an overtaking canonical value wins',async()=>{
  const page=dom(),h=fake(),gate=deferred();let value=false,writes=0;
  h.host.acquirePanel=async()=>({resources:{identity:'bool',layout:{root:resourceNode('LoadableCheckControlText',{expression:'flag'}),warnings:[]}},bindings:{snapshot:()=>({values:{flag:value}}),resolveBinding:()=>({bindingId:'flag',verified:true,getState:()=>({enabled:true,known:true,value})}),disconnect(){}}});
  h.host.beginSourceGesture=()=>1;h.host.writeBatch=()=>{writes++;return gate.promise;};
  const view=mountPresentation({...page,presentation:panelLayout,host:h.host});await settle();const button=all(page.root).find(e=>e.tagName==='BUTTON');
  button.fire('click');await settle();assert.equal(button.disabled,true);button.fire('click');assert.equal(writes,1);
  value=false;h.change({});gate.resolve({outcome:'accepted'});await settle();assert.equal(button.getAttribute('aria-pressed'),'false');assert.equal(view.hasDraft(),false);view.dispose();
});
test('a commit waits for an outstanding preview and submits its changed fields',async()=>{
  const page=dom(),h=panelHost('one'),gate=deferred(),requests=[];
  h.resources.layout.root.children[2].children[0].children[0].className='LoadableCombiSliderSmall';
  h.host.writeBatch=request=>{requests.push(request);return requests.length===1?gate.promise:Promise.resolve({outcome:'accepted'});};
  const view=mountPresentation({...page,presentation:panelLayout,host:h.host});await settle();
  const input=all(page.root).find(e=>e.type==='range');input.value='.6';input.fire('input');await settle();input.fire('change');
  gate.resolve({phase:'preview'});await settle();
  assert.equal(requests.length,2);assert.equal(requests[1].phase,'commit');assert.deepEqual(requests[1].values,{a:.6});view.dispose();
});
test('cancel while a preview is pending does not submit a queued commit',async()=>{
  const page=dom(),h=panelHost('one'),gate=deferred(),requests=[];
  h.resources.layout.root.children[2].children[0].children[0].className='LoadableCombiSliderSmall';
  h.host.writeBatch=request=>{requests.push(request);return requests.length===1?gate.promise:Promise.resolve({phase:'cancel'});};
  const view=mountPresentation({...page,presentation:panelLayout,host:h.host});await settle();
  const input=all(page.root).find(e=>e.type==='range');input.value='.6';input.fire('input');await settle();input.fire('change');
  const cancelled=view.cancelDrafts();gate.resolve({phase:'preview'});await cancelled;await settle();
  assert.deepEqual(requests.map(request=>request.phase),['preview','cancel']);assert.equal(view.hasDraft(),false);view.dispose();
});
test('a reverted preview sends its original value so the host can recognize a no-op',async()=>{
  const page=dom(),h=panelHost('one'),requests=[];
  h.resources.layout.root.children[2].children[0].children[0].className='LoadableCombiSliderSmall';
  h.host.writeBatch=async request=>{requests.push(request);return request.phase==='commit'?{outcome:'unchanged'}:{phase:request.phase};};
  const view=mountPresentation({...page,presentation:panelLayout,host:h.host});await settle();
  const input=all(page.root).find(e=>e.type==='range');input.value='.6';input.fire('input');await settle();input.value='.2';input.fire('input');input.fire('change');await settle();
  assert.deepEqual(requests.at(-1).values,{a:.2});assert.equal(requests.at(-1).phase,'commit');view.dispose();
});
test('settlement waits for an asynchronously acquired panel and its commit',async()=>{
  const page=dom(),h=panelHost('one'),acquire=deferred(),commit=deferred(),realAcquire=h.host.acquirePanel;let mounted=0,settled=false;
  h.host.acquirePanel=()=>acquire.promise;h.host.writeBatch=()=>commit.promise;
  const view=mountPresentation({...page,presentation:panelLayout,host:h.host,onControlsChanged:()=>mounted++});
  const pending=view.settleDrafts().then(()=>settled=true);await settle();assert.equal(settled,false);
  acquire.resolve(await realAcquire());await pending;assert.equal(mounted,1);
  const input=number(page.root);input.value='.6';input.fire('input');input.fire('change');
  const saving=view.settleDrafts().then(()=>settled=true);settled=false;await settle();assert.equal(settled,false);
  commit.resolve({outcome:'accepted'});await saving;assert.equal(settled,true);view.dispose();
});
test('scope replacement retains a disabled draft until explicit cancellation',async()=>{
  const page=dom(),h=panelHost('one'),view=mountPresentation({...page,presentation:panelLayout,host:h.host});await settle();
  const input=number(page.root);input.value='.6';input.fire('input');input.fire('change');
  view.revoke();await settle();assert.equal(view.hasDraft(),true);assert.equal(number(page.root),input);assert.equal(input.disabled,true);
  await assert.rejects(view.settleDrafts(),/changed|scope/i);
  await view.cancelDrafts();assert.equal(view.hasDraft(),false);view.dispose();
});
test('disconnected bindings retain a draft and report a replaced panel',async()=>{
  const page=dom(),h=panelHost('one'),acquire=h.host.acquirePanel;let disconnected=false;
  h.host.acquirePanel=async request=>{const result=await acquire(request),snapshot=result.bindings.snapshot;result.bindings.snapshot=()=>({...snapshot(),disconnected});return result;};
  const view=mountPresentation({...page,presentation:panelLayout,host:h.host});await settle();
  const input=number(page.root);input.value='.6';input.fire('input');input.fire('change');disconnected=true;h.change({});
  assert.equal(input.disabled,true);assert.match(all(page.root).find(e=>e.getAttribute('role')==='status').textContent,/changed/i);
  await assert.rejects(view.settleDrafts(),/changed|scope/i);await view.cancelDrafts();view.dispose();
});
test('frozen panel can validate an existing numeric draft during settlement',async()=>{
  const page=dom(),h=panelHost('one'),view=mountPresentation({...page,presentation:panelLayout,host:h.host});await settle();
  const input=number(page.root);input.value='.6';input.fire('input');const release=view.freezeEdits();assert.equal(input.disabled,true);
  assert.equal(view.captureDrafts(()=>input.commitDraft()),true);await view.settleDrafts();assert.deepEqual(h.batches.at(-1).values,{a:.6});
  assert.equal(input.disabled,true);release();view.dispose();
});
test('same-source resource panels keep independent drafts and conditional pages and write complete atomic state',async()=>{
  const a=dom(),b=dom(),ha=panelHost('one'),hb=panelHost('two');
  const va=mountPresentation({...a,presentation:panelLayout,host:ha.host}),vb=mountPresentation({...b,presentation:panelLayout,host:hb.host});await settle();
  const inputs=all(a.root).filter(e=>e.type==='number');inputs[0].value='.6';inputs[0].fire('input');inputs[1].value='.7';inputs[1].fire('input');
  assert.equal(va.hasDraft(),true);assert.equal(vb.hasDraft(),false);
  inputs[0].fire('change');inputs[1].fire('change');await settle();
  assert.equal(ha.batches.length,1);assert.deepEqual(ha.batches[0].values,{a:.6,b:.7});assert.equal(hb.batches.length,0);assert.equal(number(b.root).value,'0.2');
  ha.hide();assert.equal(all(a.root).find(e=>e.dataset.binding?.includes('"b"')).hidden,true);assert.equal(all(b.root).find(e=>e.dataset.binding?.includes('"b"')).hidden,false);
  all(a.root).find(e=>e.dataset.viewId==='second').fire('pointerdown');assert.equal(inputs[0].parentElement.parentElement.hidden,true);assert.equal(number(b.root).parentElement.parentElement.hidden,false);
  const retained=inputs[0],before=ha.batches.length;va.dispose();retained.value='.8';retained.fire('input');retained.fire('change');await settle();assert.equal(ha.batches.length,before);assert.equal(ha.disconnected,1);vb.dispose();
});
test('two-axis envelope edits are complete atomic batches and disposal cannot restore native state',async()=>{
  const page=dom(),h=fake(),names=['AttackTime','DecayTime','SustainLevel','SustainTime','ReleaseTime','ExponentialSlope','Loop','FreeRun'];let state=Object.fromEntries(names.map(name=>[name,.5])),enabled=true;
  const batches=[],resources=Object.freeze({identity:'envelope:qualified-fixture',layout:{root:resourceNode('AnalogAdsrEnvelopeDisplay',{expression:'env'}),warnings:[]}});
  h.host.acquirePanel=async()=>({resources,bindings:{snapshot:()=>({values:{...state}}),resolveBinding:connection=>({bindingId:connection.expression,verified:true,min:0,max:1,getState:()=>({enabled,known:true,value:state[connection.expression],initial:.5,generation:1})}),observe:accepted=>{state={...accepted.values};},disconnect(){enabled=false;}}});
  h.host.beginSourceGesture=()=>1;h.host.writeBatch=async request=>{batches.push(request);return request.phase==='commit'?{outcome:'accepted'}:{phase:request.phase};};
  const view=mountPresentation({...page,presentation:panelLayout,host:h.host});await settle();const handle=all(page.root).find(e=>e.getAttribute('data-handle')==='sustain');
  handle.fire('pointerdown',{pointerId:1,clientX:80,clientY:30});handle.fire('pointermove',{pointerId:1,clientX:85,clientY:25});await settle();
  assert.equal(batches.length,1);assert.equal(Object.keys(batches[0].values).length,2);assert.notEqual(batches[0].values.DecayTime,.5);assert.notEqual(batches[0].values.SustainLevel,.5);assert.equal(view.hasDraft(),true);
  handle.fire('keydown',{key:'Escape'});await settle();assert.equal(batches.at(-1).phase,'cancel');assert.deepEqual(batches.at(-1).values,{});
  handle.fire('pointerdown',{pointerId:2,clientX:80,clientY:30});handle.fire('pointermove',{pointerId:2,clientX:86,clientY:24});await settle();
  const before=batches.length;view.dispose();await settle();assert.equal(batches.length,before);assert.equal(h.writes.length,0);
});
test('panel replies and resource acquisition are revoked before disposal',async()=>{
  const a=dom(),h=panelHost('one'),gate=deferred(),acquire=h.host.acquirePanel;h.host.acquirePanel=()=>gate.promise;
  const view=mountPresentation({...a,presentation:panelLayout,host:h.host});await settle();view.dispose();gate.resolve(await acquire());await settle();
  assert.equal(h.disconnected,1);assert.equal(all(a.root).some(e=>e.type==='number'),false);assert.equal(h.batches.length,0);
});

function currentAnalogPanel(){
  const h=fake('ordinary'),prop=value=>({attributes:{Value:String(value)}}),batches=[];let gestures=0;
  const expected={ownerLabel:'owner',runtimeRevision:1,node:7,device:'Analog',state:{version:1,profile:analogIdentity.profile,
    dllSha256:analogIdentity.dllSha256,guiSha256:analogIdentity.guiSha256,graphicsSha256:analogIdentity.graphicsSha256,
    values:analogDescriptors.map(row=>row.min)}};
  expected.state.values[26]=.25;expected.state.values[24]=1;
  const catalog=()=>({generation:'1',parameters:analogDescriptors.map(row=>({...row,value:Math.fround(expected.state.values[row.index]),applied:Math.fround(expected.state.values[row.index]),revision:1,applied_revision:1}))});
  const bindings=createAnalogPanelBindings({expected,catalog:catalog(),onChange:()=>h.change({})});
  const resources={identity:{guiSha256:analogIdentity.guiSha256,graphicsSha256:analogIdentity.graphicsSha256},layout:{root:resourceNode('VertBoxView',{children:[
    resourceNode('FingerView',{expression:'SelectedFinger',properties:{IndexExpression:prop(0),ViewId:prop('first')},children:[resourceNode('TextField',{text:'First'})]}),
    resourceNode('FingerView',{expression:'SelectedFinger',properties:{IndexExpression:prop(1),ViewId:prop('second')},children:[resourceNode('TextField',{text:'Second'})]}),
    resourceNode('CardView',{expression:'SelectedFinger',children:[resourceNode('VertBoxView',{children:[
      resourceNode('LoadableCombiSliderSmall',{expression:'NoiseBalance'}),
      resourceNode('LoadableCheckControlText',{expression:'NoiseToggle'}),
      resourceNode('LoadableChooserControl',{expression:'KeyboardPriority'}),
    ]}),resourceNode('TextField',{text:'Second page'})]})]}),warnings:[]}};
  h.host.acquirePanel=async()=>({resources,bindings});
  h.host.beginGesture=()=>{gestures++;return 'must-not-start';};h.host.writeBatch=async request=>{batches.push(request);return null;};
  return{...h,bindings,expected,batches,get gestures(){return gestures;},refresh(value,native=true){expected.state.values[26]=value;bindings.observe({expected,catalog:native?catalog():null});}};
}
test('current read-only Analog adapter mounts disabled inputs and refuses synthetic events at the panel boundary',async()=>{
  const page=dom(),h=currentAnalogPanel(),view=mountPresentation({...page,presentation:panelLayout,host:h.host});await settle();
  const inputs=all(page.root).filter(element=>['INPUT','SELECT'].includes(element.tagName));
  assert.ok(inputs.length>=3);assert.ok(inputs.every(input=>input.disabled));
  assert.equal(inputs.find(input=>input.type==='text').value,'--');
  const before=h.bindings.snapshot();
  for(const input of inputs){
    input.value='.9';input.fire('input');input.fire('change');input.fire('live-cancel');
    input.fire('keydown',{key:'ArrowUp'});input.fire('dblclick');
    input.fire('pointerdown',{pointerId:1,clientX:0,clientY:0});input.fire('pointermove',{pointerId:1,clientX:80,clientY:0});input.fire('pointerup',{pointerId:1});
  }
  for(const button of all(page.root).filter(element=>element.tagName==='BUTTON'&&element.disabled))button.fire('click');
  await settle();assert.equal(view.hasDraft(),false);assert.equal(h.gestures,0);assert.equal(h.batches.length,0);assert.deepEqual(h.bindings.snapshot(),before);
  view.dispose();
});
test('current read-only source/native refresh preserves the mounted controls and selected navigation page',async()=>{
  const page=dom(),h=currentAnalogPanel(),view=mountPresentation({...page,presentation:panelLayout,host:h.host});await settle();
  const input=all(page.root).find(element=>element.type==='range');let firstPage=input;
  while(!Object.hasOwn(firstPage.dataset,'cardSelected'))firstPage=firstPage.parentElement;
  all(page.root).find(element=>element.dataset.viewId==='second').fire('pointerdown');
  assert.equal(firstPage.hidden,true);
  h.refresh(.75,false);assert.equal(h.bindings.snapshot().nativeStatus,'unavailable');
  assert.equal(h.bindings.snapshot().values.NoiseBalance,.25);assert.equal(firstPage.hidden,true);
  assert.equal(all(page.root).find(element=>element.type==='range'),input);assert.equal(input.disabled,true);
  h.refresh(.5);assert.equal(h.bindings.snapshot().values.NoiseBalance,.5);assert.equal(firstPage.hidden,true);
  all(page.root).find(element=>element.dataset.viewId==='first').fire('pointerdown');assert.equal(firstPage.hidden,false);
  assert.equal(input.value,'0.5');assert.equal(h.batches.length,0);view.dispose();
});
