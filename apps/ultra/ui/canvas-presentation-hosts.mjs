import {REGISTRY,nodeSpec} from './canvas-model.mjs';
import {treeNodes} from './canvas-hierarchy.mjs';
import {actualDevices,parameterReading} from './alive-model.mjs';
import {liveDeviceProfile,validateLiveDeviceState,liveDeviceCatalog} from './live-device-profile.mjs';
import {readLiveDeviceResources} from './live-device-resources.mjs';
import {createAnalogPanelBindings,analogWritableKey} from './live-profiles/analog/panel-bindings.mjs';
import {planAnalogCurrentParameters} from './live-profiles/analog/parameter-mapping.mjs';

const equalScope=(a,b)=>['ownerId','generation','instanceId','sourceRevision'].every(key=>a?.[key]===b?.[key]);
const endedGesture=(gestureId,message)=>Object.assign(Error(message),{code:'PRESENTATION_GESTURE_ENDED',gestureId});
const unavailable=()=>{throw Error('Installed device panels are unavailable for this host.');};
function lifetime(readScope){
  const listeners=new Set(),gestures=new Map();let disposed=false,serial=0;
  const assert=scope=>{if(disposed||!equalScope(scope,readScope()))throw Error('Presentation scope changed. Select the device again.');};
  return{assert,gestures,get scope(){return Object.freeze({...readScope()});},beginGesture(bindingId,original){const scope=readScope();assert(scope);const id=`gesture-${++serial}`;gestures.set(id,{bindingId,original,latest:original,scope:{...scope}});return id;},gesture(request){assert(request.scope);const gesture=gestures.get(request.gestureId);if(!gesture||gesture.bindingId!==request.bindingId||!equalScope(gesture.scope,request.scope))throw endedGesture(request.gestureId,'Presentation gesture is no longer authorized.');if(!['preview','commit','cancel'].includes(request.phase))throw Error('Invalid presentation gesture phase.');return gesture;},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},publish(){if(!disposed)for(const fn of listeners)fn();},dispose(){disposed=true;gestures.clear();listeners.clear();}};
}
function validate(value,descriptor){if(!Number.isFinite(value)||value<descriptor.min||value>descriptor.max||descriptor.integral&&!Number.isInteger(value))throw Error(`Parameter requires a value from ${descriptor.min} to ${descriptor.max}.`);}

export function createUltraPresentationHost({controller,invoke,ownerId='ultra-document'}={}){
  const state=()=>controller.getState(),document=()=>state().document??state().patch;
  const scope=()=>{const s=state();return{ownerId:s.ownerId??ownerId,generation:s.revision??0,instanceId:'root',sourceRevision:s.shared?s.revision:s.desiredRevision};};
  const life=lifetime(scope),targets=new Map();
  const resources=new Map(),panels=new Map();let disposed=false,sourceSerial=0;
  const sameSource=(a,b)=>['ownerLabel','runtimeRevision','node','device'].every(key=>a?.[key]===b?.[key])&&
    ['version','profile','dllSha256','guiSha256','graphicsSha256'].every(key=>a?.state?.[key]===b?.state?.[key])&&
    a.state.values.length===b.state.values.length&&a.state.values.every((value,index)=>Object.is(value,b.state.values[index]));
  const samePanel=(a,b)=>sameSource({...a,state:{...a.state,values:[]}},{...b,state:{...b.state,values:[]}});
  function readPanelSource(request){
    life.assert(request.scope);
    const s=state();
    if(disposed||!s.native||!s.shared||typeof invoke!=='function'||typeof controller.readLiveSource!=='function')unavailable();
    const read=controller.readLiveSource(request.sourceNode),expected=read?.expected;
    if(!read?.available||!expected||expected.ownerLabel!==request.scope.ownerId||expected.runtimeRevision!==request.scope.generation||
      expected.node!==request.sourceNode||expected.device!=='Analog'||request.profile!=='live12-analog-v1'||expected.state?.profile!==request.profile)
      throw Error('Installed device panel source or profile is unavailable.');
    validateLiveDeviceState(expected.device,expected.state);
    if(Reflect.ownKeys(expected.state.values).length!==204||!Array.from({length:203},(_,index)=>Object.hasOwn(expected.state.values,index)).every(Boolean))
      throw Error('Installed device panel source is incomplete.');
    if(!document().presentation?.items.some(item=>item.kind==='livePanel'&&item.included&&item.target.node===request.sourceNode&&item.target.profile===request.profile))
      throw Error('Installed device panel target changed. Select the device again.');
    return structuredClone(expected);
  }
  function assertSource(request,expected){
    if(!sameSource(expected,readPanelSource(request)))throw Error('Installed device panel source changed during acquisition.');
  }
  function packBytes(value){
    const length=value instanceof ArrayBuffer?value.byteLength:value?.length;
    if(!Number.isSafeInteger(length)||length<=0||length>64*1024*1024||
      !(value instanceof ArrayBuffer||value instanceof Uint8Array||Array.isArray(value)))throw Error('Installed device resource bytes are unavailable or exceed bounds.');
    if(Array.isArray(value)&&!value.every(byte=>Number.isInteger(byte)&&byte>=0&&byte<=255))throw Error('Installed device resource bytes are invalid.');
    return value instanceof ArrayBuffer?new Uint8Array(value.slice(0)):new Uint8Array(value);
  }
  async function panelResources(request,expected){
    const path=liveDeviceProfile(expected.device).entrypoint,key=JSON.stringify([expected.state.guiSha256,expected.state.graphicsSha256,path]);
    let load=resources.get(key);
    if(!load){
      load=(async()=>{
        const gui=await invoke('live_device_resource_pack',{kind:'GUI'});assertSource(request,expected);
        const guiBytes=packBytes(gui),graphics=await invoke('live_device_resource_pack',{kind:'Graphics'});assertSource(request,expected);
        const result=await readLiveDeviceResources({guiBytes,graphicsBytes:packBytes(graphics),path,identity:expected.state});assertSource(request,expected);
        return result;
      })();
      resources.set(key,load);load.catch(()=>{if(resources.get(key)===load)resources.delete(key);});
    }
    const result=await load;assertSource(request,expected);return result;
  }
  function releasePanel(entry){
    if(entry.members.size||entry.acquiring)return;
    clearTimeout(entry.timer);entry.timer=null;entry.last=null;
    // Retain only the last-start timestamp until its throttle interval expires.
    if(!entry.flight&&entry.started+250<=performance.now()&&panels.get(entry.key)===entry)panels.delete(entry.key);
  }
  function refreshPanelSources(entry){
    for(const member of [...entry.members]){
      try{
        const expected=readPanelSource(member.request);
        if(!samePanel(expected,member.expected))throw Error('Installed device panel identity changed.');
        if(!sameSource(expected,member.expected)){if(member.gesture)member.gesture.stale=true;member.expected=expected;member.bindings.observe({expected,catalog:null});}
      }catch{member.bindings.disconnect();}
    }
  }
  async function nativeObservation(entry,request,expected){
    assertSource(request,expected);
    if(entry.flight){const result=await entry.flight;assertSource(request,expected);if(!sameSource(expected,result.expected))throw Error('Native panel observation source changed.');return result.catalog;}
    const remaining=entry.started+250-performance.now();
    if(remaining>0&&entry.last&&sameSource(expected,entry.last.expected))return entry.last.catalog;
    if(remaining>0){
      await new Promise((resolve,reject)=>{
        const waiter={reject,timer:setTimeout(()=>{entry.waiters.delete(waiter);resolve();},Math.ceil(remaining))};entry.waiters.add(waiter);
      });assertSource(request,expected);
      return nativeObservation(entry,request,expected);
    }
    entry.started=performance.now();
    const flight=(async()=>{
      const catalog=await invoke('live_device_parameters',{revision:expected.runtimeRevision,node:expected.node});assertSource(request,expected);
      return{expected,catalog};
    })();entry.flight=flight;
    try{entry.last=await flight;assertSource(request,expected);return entry.last.catalog;}
    catch(error){entry.last=null;throw error;}
    finally{if(entry.flight===flight)entry.flight=null;}
  }
  function scheduleObservation(entry){
    if(disposed||!entry.members.size||entry.timer||entry.flight)return;
    entry.timer=setTimeout(async()=>{
      entry.timer=null;refreshPanelSources(entry);
      const member=entry.members.values().next().value;if(!member)return;
      const {request,expected}=member;
      // The reply is always checked against this capture, never a later source.
      try{
        entry.last=null;
        const catalog=await nativeObservation(entry,request,expected);assertSource(request,expected);
        for(const current of entry.members)if(sameSource(current.expected,expected))current.bindings.observe({expected,catalog});
      }catch{
        for(const current of entry.members)try{assertSource(current.request,expected);current.bindings.observe({expected,catalog:null});}catch{}
      }finally{scheduleObservation(entry);releasePanel(entry);}
    },Math.max(0,Math.ceil(entry.started+250-performance.now())));
    entry.timer.unref?.();
  }
  async function acquirePanel(request){
    const expected=readPanelSource(request),key=JSON.stringify([expected.ownerLabel,expected.runtimeRevision,expected.node]);
    for(const previous of [...panels.values()])releasePanel(previous);
    let entry=panels.get(key);
    if(!entry){entry={key,members:new Set(),acquiring:0,started:-Infinity,flight:null,last:null,timer:null,waiters:new Set()};panels.set(key,entry);}
    entry.acquiring++;let bindings=null;
    try{
      const packs=await panelResources(request,expected);assertSource(request,expected);
      const catalog=await nativeObservation(entry,request,expected);assertSource(request,expected);
      bindings=createAnalogPanelBindings({expected,catalog,onChange:life.publish});assertSource(request,expected);
      const member={request:{...request,scope:{...request.scope}},expected,bindings},disconnect=bindings.disconnect;
      bindings.disconnect=()=>{if(!entry.members.delete(member))return;member.gesture=null;disconnect();releasePanel(entry);};
      entry.members.add(member);scheduleObservation(entry);
      return{resources:packs,bindings};
    }catch(error){bindings?.disconnect();throw error;}
    finally{entry.acquiring--;releasePanel(entry);}
  }
  function publish(){for(const entry of [...panels.values()]){refreshPanelSources(entry);scheduleObservation(entry);releasePanel(entry);}life.publish();}
  function dispose(){if(disposed)return;disposed=true;for(const entry of [...panels.values()]){
    for(const member of [...entry.members])member.bindings.disconnect();clearTimeout(entry.timer);entry.last=null;
    for(const waiter of entry.waiters){clearTimeout(waiter.timer);waiter.reject(Error('Installed device panel disconnected during acquisition.'));}entry.waiters.clear();
  }panels.clear();resources.clear();life.dispose();}
  function beginSourceGesture(sourceNode){
    const members=[...panels.values()].flatMap(entry=>[...entry.members]).filter(member=>member.request.sourceNode===sourceNode);
    const member=members.find(part=>!part.gesture&&part.bindings.snapshot().nativeStatus==='observed');
    if(!member)throw Error('An acquired available panel is required for a source gesture.');
    const s=state();if(s.closing||s.faulted)unavailable();
    const expected=readPanelSource(member.request),snapshot=member.bindings.snapshot();
    if(!sameSource(expected,snapshot.expected))throw Error('Installed device panel source changed.');
    const gesture={id:`source-${++sourceSerial}`,expected,baseline:snapshot.values,candidate:{},pending:null};
    member.gesture=gesture;return gesture.id;
  }
  function writeBatch(request){
    if(!request?.scope)unavailable();
    const member=[...panels.values()].flatMap(entry=>[...entry.members]).find(part=>part.gesture?.id===request.gestureId);
    try{life.assert(request.scope);}catch(error){if(member)member.gesture=null;throw error;}
    if(!member||member.request.sourceNode!==request.sourceNode||!equalScope(member.request.scope,request.scope))throw endedGesture(request.gestureId,'Panel gesture is no longer authorized.');
    const gesture=member.gesture;
    if(!['preview','commit','cancel'].includes(request.phase))throw Error('Invalid panel gesture phase.');
    const values=request.values;
    if(!values||typeof values!=='object'||Array.isArray(values)||![Object.prototype,null].includes(Object.getPrototypeOf(values)))throw Error('Panel values must be an explicit plain record.');
    const keys=Reflect.ownKeys(values);
    if(keys.length>256||keys.some(key=>typeof key!=='string'||!Object.hasOwn(Object.getOwnPropertyDescriptor(values,key),'value')))throw Error('Invalid panel values.');
    for(const key of keys){
      if(!analogWritableKey(gesture.expected,key)||!Object.hasOwn(gesture.baseline,key))throw Error('Panel value is not qualified for writing.');
      if(typeof values[key]!=='boolean'&&!Number.isFinite(values[key]))throw Error('Invalid panel value.');
    }
    if(gesture.pending){
      if(request.phase==='commit'&&JSON.stringify(values)===gesture.submitted)return gesture.pending;
      throw Error('Panel gesture commit is already pending.');
    }
    const s=state();if(s.closing||s.faulted){member.gesture=null;unavailable();}
    let current;try{current=readPanelSource(member.request);}catch(error){member.gesture=null;throw error;}
    if(gesture.stale||!sameSource(gesture.expected,current)){
      member.gesture=null;return Promise.resolve({outcome:'conflict',reason:'The complete native source changed.',canonical:null,native:{status:'unobserved'}});
    }
    if(member.bindings.snapshot().nativeStatus!=='observed'){member.gesture=null;unavailable();}
    if(request.phase==='cancel'){member.gesture=null;return Promise.resolve({phase:'cancel'});}
    const candidate={...gesture.candidate,...values},changed=new Map(Object.entries(candidate).filter(([key,value])=>!Object.is(value,gesture.baseline[key])));
    const plan=planAnalogCurrentParameters(changed,liveDeviceCatalog(gesture.expected.state));
    if(plan.unknownValues.size)throw Error('Unknown panel value.');
    gesture.candidate=candidate;
    if(request.phase==='preview')return Promise.resolve({phase:'preview'});
    const nextState=structuredClone(gesture.expected.state);
    for(const update of plan.updates)nextState.values[update.index]=update.value;
    gesture.submitted=JSON.stringify(request.values);
    gesture.pending=controller.commitLiveSource({expected:gesture.expected,nextState}).then(result=>{
      if(member.gesture===gesture)member.gesture=null;
      if(['accepted','unchanged'].includes(result.outcome))refreshPanelSources([...panels.values()].find(entry=>entry.members.has(member))??{members:[]});
      return result;
    });
    return gesture.pending;
  }
  function resolve(target){
    const node=treeNodes(document()).find(node=>node.id===target.node);if(!node)throw Error('Presentation target is missing.');
    if(target.kind==='text')return{text:node.params[target.param]??REGISTRY[node.type]?.params[target.param]?.value??'',style:node.style??{},capabilities:{text:true}};
    if(target.kind==='event'){const port=nodeSpec(node).inlets[target.inlet];return{capabilities:{event:!!port&&(port.accepts??[port.type]).includes('control')}};}
    const parameter=REGISTRY[node.type]?.params[target.param],exposed=document().device?.parameters.find(binding=>binding.node===target.node&&binding.param===target.param);
    if(!parameter||typeof parameter.value!=='number')throw Error('Presentation target is not a live numeric parameter.');
    const bindingId=JSON.stringify([target.node,target.param]),descriptor={min:exposed?.min??parameter.min,max:exposed?.max??parameter.max,integral:!!parameter.integer,unit:exposed?.unit??null};
    targets.set(bindingId,{...target,descriptor});return{bindingId,descriptor,capabilities:{write:true}};
  }
  function snapshot(bindingId){
    const target=targets.get(bindingId);if(!target)return null;
    const s=state(),node=treeNodes(s.document??s.patch).find(node=>node.id===target.node);if(!node)return null;
    const owned=s.parameterPreviews?.findLast(preview=>preview.node===target.node&&preview.key===target.param);
    const commanded=owned?.value??node.params[target.param]??REGISTRY[node.type].params[target.param].value;
    const applied=target.param==='value'?(s.observations?.[node.id]?.value??commanded):commanded;
    return{commanded,applied,effective:applied,owner:'Base',enabled:!s.closing&&!s.faulted,revision:s.activeDocumentRevision??0};
  }
  return{get scope(){return life.scope;},resolve,snapshot,subscribe:life.subscribe,publish,beginGesture(bindingId){const id=life.beginGesture(bindingId,snapshot(bindingId)?.commanded),target=targets.get(bindingId);life.gestures.get(id).ownerGesture=controller.beginParameterGesture(target.node,target.param);return id;},async write(request){
    const gesture=life.gesture(request),target=targets.get(request.bindingId);if(!target)throw Error('Unknown presentation binding.');validate(request.value,target.descriptor);
    await controller.writeParameterGesture(gesture.ownerGesture,request.phase,request.value);life.assert(request.scope);
    if(request.phase!=='preview')life.gestures.delete(request.gestureId);
    life.publish();return snapshot(request.bindingId);
  },async sendEvent(request){life.assert(request.scope);if(request.action!=='bang'||request.target.kind!=='event'||!resolve(request.target).capabilities.event)throw Error('Unsupported presentation event.');const accepted=await controller.deviceEvent(request.target.node,request.target.inlet,null);life.assert(request.scope);if(!accepted)throw Error('Presentation event was refused by the current graph.');return accepted;},beginSourceGesture,writeBatch,acquirePanel,dispose};
}

export function createAlivePresentationHost({instanceId,getSnapshot,writeBase}={}){
  const instance=()=>getSnapshot()?.deviceInstances[instanceId];
  const reference=()=>getSnapshot()?.document.tracks.flatMap(actualDevices).find(device=>device.instanceId===instanceId);
  const scope=()=>{const s=getSnapshot(),r=reference();return{ownerId:'alive-session',generation:s?.generation,instanceId,sourceRevision:r?JSON.stringify([r.sourceSha256,r.path,r.id,r.version]):null};};
  const life=lifetime(scope);let writes=Promise.resolve();
  function assertBase(request,gesture){
    if(instance()?.manifest.parameters.find(p=>p.key===request.bindingId)?.base!==gesture.latest){life.gestures.delete(request.gestureId);throw endedGesture(request.gestureId,'The base value changed during this presentation gesture. Try the control again.');}
  }
  function resolve(target){
    const item=instance()?.manifest.presentation?.items.find(item=>JSON.stringify(item.target)===JSON.stringify(target)),resolved=item?.resolved;
    if(!resolved)throw Error('Saved presentation target is unavailable in the accepted manifest.');
    if(resolved.kind==='text')return{...resolved,capabilities:{text:true}};
    if(resolved.kind==='event')return{capabilities:{event:false}};
    return{...resolved,capabilities:{write:!!resolved.bindingId}};
  }
  function snapshot(bindingId){
    const s=getSnapshot(),device=instance(),index=device?.manifest.parameters.findIndex(p=>p.key===bindingId);if(index===undefined||index<0)return null;
    const binding=device.manifest.parameters[index],runtime=s.state.devices[device.index],reading=parameterReading(binding,runtime,index);
    return{commanded:reading.base,applied:runtime?.base?.[index]??reading.base,effective:reading.effective,owner:reading.owner,enabled:!!reference(),revision:s.editRevision??0};
  }
  return{get scope(){return life.scope;},resolve,snapshot,subscribe:life.subscribe,publish:life.publish,beginGesture(bindingId){return life.beginGesture(bindingId,snapshot(bindingId)?.commanded);},write(request){
    const run=async()=>{
      const gesture=life.gesture(request),binding=instance()?.manifest.parameters.find(p=>p.key===request.bindingId);if(!binding||!reference())throw Error('The device instance is no longer available.');
      assertBase(request,gesture);
      const value=request.phase==='cancel'?gesture.original:request.value;validate(value,binding);
      const assert=()=>life.assert(request.scope);
      const assertValue=()=>assertBase(request,gesture);
      await writeBase({generation:request.scope.generation,instanceId:request.scope.instanceId,key:request.bindingId,value},assert,assertValue);life.assert(request.scope);gesture.latest=value;
      if(request.phase!=='preview')life.gestures.delete(request.gestureId);life.publish();return snapshot(request.bindingId);
    };
    const result=writes.then(run);writes=result.catch(()=>{});return result;
  },sendEvent:unavailable,writeBatch:unavailable,acquirePanel:unavailable,dispose:life.dispose};
}
