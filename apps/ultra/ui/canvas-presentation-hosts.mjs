import {REGISTRY,nodeSpec} from './canvas-model.mjs';
import {treeNodes} from './canvas-hierarchy.mjs';
import {actualDevices,parameterReading} from './alive-model.mjs';

const equalScope=(a,b)=>['ownerId','generation','instanceId','sourceRevision'].every(key=>a?.[key]===b?.[key]);
const endedGesture=(gestureId,message)=>Object.assign(Error(message),{code:'PRESENTATION_GESTURE_ENDED',gestureId});
const unavailable=()=>{throw Error('Installed device panels are unavailable for this host.');};
function lifetime(readScope){
  const listeners=new Set(),gestures=new Map();let disposed=false,serial=0;
  const assert=scope=>{if(disposed||!equalScope(scope,readScope()))throw Error('Presentation scope changed. Select the device again.');};
  return{assert,gestures,get scope(){return Object.freeze({...readScope()});},beginGesture(bindingId,original){const scope=readScope();assert(scope);const id=`gesture-${++serial}`;gestures.set(id,{bindingId,original,latest:original,scope:{...scope}});return id;},gesture(request){assert(request.scope);const gesture=gestures.get(request.gestureId);if(!gesture||gesture.bindingId!==request.bindingId||!equalScope(gesture.scope,request.scope))throw endedGesture(request.gestureId,'Presentation gesture is no longer authorized.');if(!['preview','commit','cancel'].includes(request.phase))throw Error('Invalid presentation gesture phase.');return gesture;},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},publish(){if(!disposed)for(const fn of listeners)fn();},dispose(){disposed=true;gestures.clear();listeners.clear();}};
}
function validate(value,descriptor){if(!Number.isFinite(value)||value<descriptor.min||value>descriptor.max||descriptor.integral&&!Number.isInteger(value))throw Error(`Parameter requires a value from ${descriptor.min} to ${descriptor.max}.`);}

export function createUltraPresentationHost({controller,ownerId='ultra-document'}={}){
  const state=()=>controller.getState(),document=()=>state().document??state().patch;
  const scope=()=>{const s=state();return{ownerId:s.ownerId??ownerId,generation:s.revision??0,instanceId:'root',sourceRevision:s.shared?s.revision:s.desiredRevision};};
  const life=lifetime(scope),targets=new Map();
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
  return{get scope(){return life.scope;},resolve,snapshot,subscribe:life.subscribe,publish:life.publish,beginGesture(bindingId){const id=life.beginGesture(bindingId,snapshot(bindingId)?.commanded),target=targets.get(bindingId);life.gestures.get(id).ownerGesture=controller.beginParameterGesture(target.node,target.param);return id;},async write(request){
    const gesture=life.gesture(request),target=targets.get(request.bindingId);if(!target)throw Error('Unknown presentation binding.');validate(request.value,target.descriptor);
    await controller.writeParameterGesture(gesture.ownerGesture,request.phase,request.value);life.assert(request.scope);
    if(request.phase!=='preview')life.gestures.delete(request.gestureId);
    life.publish();return snapshot(request.bindingId);
  },async sendEvent(request){life.assert(request.scope);if(request.action!=='bang'||request.target.kind!=='event'||!resolve(request.target).capabilities.event)throw Error('Unsupported presentation event.');const accepted=await controller.deviceEvent(request.target.node,request.target.inlet,null);life.assert(request.scope);if(!accepted)throw Error('Presentation event was refused by the current graph.');return accepted;},writeBatch:unavailable,acquirePanel:unavailable,dispose:life.dispose};
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
