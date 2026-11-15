import {createNodeView} from './canvas-node.mjs';
import {createAnalogBindings} from './analog-bindings.mjs';
import {liveDeviceProfile,liveDeviceCatalog,patchLiveDeviceState} from './live-device-profile.mjs';
import {readLiveDeviceResources} from './live-device-resources.mjs';
import {createLiveDeviceView} from './live-device-view.mjs';
import {createDevicePlayer} from './canvas-device-player.mjs';

const resourcesByHost=new WeakMap();
function installedResources(invoke,profile){
 let resources=resourcesByHost.get(invoke);
 if(!resources){resources=new Map();resourcesByHost.set(invoke,resources);}
 if(!resources.has(profile.profile)){
  const request=Promise.all(['GUI','Graphics'].map(kind=>invoke('live_device_resource_pack',{kind})))
   .then(([gui,graphics])=>readLiveDeviceResources({guiBytes:new Uint8Array(gui),graphicsBytes:new Uint8Array(graphics),path:profile.entrypoint}));
  resources.set(profile.profile,request);request.catch(()=>resources.delete(profile.profile));
 }
 return resources.get(profile.profile);
}
const treeNode=(scope,id)=>{
 for(const node of scope.nodes){if(node.id===id)return node;if(node.patcher){const found=treeNode(node.patcher,id);if(found)return found;}}
 return null;
};

export function createLiveDeviceNodeView(node,options){
  const {doc,controller,invoke,acquireResources,drafts,onResize=()=>{}}=options,win=doc.defaultView;
 const base=createNodeView(node,options),profile=liveDeviceProfile(node.params.device);
 const make=(tag,className,text)=>{const e=doc.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
 base.element.classList.add('live-device-canvas-node');
 const body=base.element.querySelector('.node-body'),panel=make('div','live-device-object-panel'),status=make('p','live-device-object-status','Loading instrument panel...');
 status.setAttribute('role','status');panel.append(status);body.append(panel);
 let disposed=false,view=null,current=node,generation=null,polling=false,epoch=0;
 const notice=error=>{if(disposed)return;status.textContent=String(error?.message??error);status.classList.add('error');controller.notice(error);};
 const guard=fn=>(...args)=>Promise.resolve().then(()=>fn(...args)).catch(notice);
 function currentSource(){return treeNode(controller.getState().document,node.id);}
 async function catalog(){
  const state=controller.getState(),source=currentSource();
  if(!source)throw Error('Live device object is no longer in this document.');
  if(!invoke)return liveDeviceCatalog(source.params.state,'preview');
  if(!state.revision)throw Error('Wait for the instrument to prepare.');
  return invoke('live_device_parameters',{revision:state.revision,node:node.id});
 }
 async function publish({generation:requested,values}){
  if(disposed||requested!==generation)throw Error('Live device edit belongs to an earlier instance.');
  const state=controller.getState(),source=currentSource(),revision=state.revision;
  if(!source||invoke&&String(revision)!==requested)throw Error('Live device instance changed before the edit.');
  const next=patchLiveDeviceState(source.params.device,source.params.state,values);
  controller.deviceParameter(node.id,'state',next);await controller.flush();
  if(disposed||generation!==requested||invoke&&controller.getState().revision!==revision)throw Error('Live device instance changed during the edit.');
  const confirmed=currentSource();
  if(!confirmed||values.some(({index,value})=>confirmed.params.state.values[index]!==Math.fround(value)))throw Error('Instrument edit was not admitted; the saved source state was retained.');
  const result=await catalog();
  if(result.generation!==requested)throw Error('Stale instrument acknowledgment.');
  return result;
 }
  const bindingFailures=[];
  const bindings=createAnalogBindings({
  send:async({generation,index,value})=>(await publish({generation,values:[{index,value}]})).parameters.find(p=>p.index===index),
   sendBatch:publish,onChange:()=>view?.refresh(),onError:error=>{bindingFailures.push(error);notice(error);},
 });
 async function observe(){
  if(disposed||polling)return;polling=true;const ticket=epoch;
  try{
   const state=controller.getState();
   if(invoke&&(!state.revision||state.faulted)){if(generation){generation=null;bindings.disconnect();}return;}
   const result=await catalog();if(disposed||ticket!==epoch)return;
   if(result.generation!==generation){generation=result.generation;bindings.connect(result);}else bindings.observe(result);
  }catch(error){if(!disposed&&ticket===epoch)notice(error);}finally{polling=false;}
 }
 const keyboard=make('div','live-device-object-keyboard'),keys=new Map();
 keyboard.setAttribute('aria-label',`${profile.device} audition keyboard`);
 const player=createDevicePlayer({send:([pitch,velocity])=>controller.deviceEvent(node.id,0,[pitch,velocity]),stop:()=>controller.stop(),onError:notice,
  onChange:held=>{for(const [note,key]of keys){key.classList.toggle('held',held.includes(note));key.setAttribute('aria-pressed',String(held.includes(note)));}}});
 const release=guard(()=>player.releaseAll()),names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
 for(let pitch=60;pitch<=72;pitch++){
  const label=`${names[pitch%12]}${Math.floor(pitch/12)-1}`,key=make('button','live-device-object-key'+([1,3,6,8,10].includes(pitch%12)?' black':''),label);
  key.type='button';key.disabled=true;key.setAttribute('aria-label',`Play ${label}`);key.setAttribute('aria-pressed','false');
  key.addEventListener('pointerdown',guard(e=>{e.preventDefault();if(key.disabled)return;key.setPointerCapture?.(e.pointerId);return player.press(pitch,`pointer:${e.pointerId}`);}));
  for(const type of ['pointerup','pointercancel','lostpointercapture'])key.addEventListener(type,guard(e=>player.release(`pointer:${e.pointerId}`)));
  key.addEventListener('keydown',guard(e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();if(!key.disabled)return player.press(pitch,`button:${pitch}`);}}));
  key.addEventListener('keyup',guard(e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();return player.release(`button:${pitch}`);}}));
  keys.set(pitch,key);keyboard.append(key);
 }
 const footer=make('div','live-device-object-footer'),caption=make('span','live-device-object-caption','Keyboard'),releaseButton=make('button','live-device-object-release','Release notes');
 releaseButton.type='button';releaseButton.addEventListener('click',release);footer.append(caption,keyboard,releaseButton);body.append(footer);
 for(const type of ['pointerdown','dblclick','keydown','keyup'])body.addEventListener(type,e=>{e.stopPropagation();if(type==='keydown'&&e.key==='Escape')release();});
 win?.addEventListener('blur',release);
 const visibility=()=>{if(doc.hidden)release();};doc.addEventListener('visibilitychange',visibility);
 const ready=(async()=>{
  try{
   const resources=await(acquireResources?acquireResources(profile):invoke?installedResources(invoke,profile):Promise.reject(Error('Open native Ultra to read the installed instrument panel.')));
   if(disposed)return false;
    view=createLiveDeviceView(doc,{layout:resources.layout,graphics:resources.graphics,resolveBinding:bindings.resolve,evaluateExpression:bindings.evaluate,onError:notice,drafts});
   panel.prepend(view.element);status.textContent='';status.classList.remove('error');await observe();onResize();return true;
  }catch(error){notice(error);return false;}
 })();
 const timer=win?.setInterval(observe,250);
  return {...base,ready,async settleControls(){
   await bindings.idle();
   if(bindingFailures.length){const [error]=bindingFailures.splice(0);throw error;}
  },
  update(next,state,context){
   base.update(next,state,context);current=next;
   const nextGeneration=invoke?String(state.revision??0):'preview';
   if(generation&&nextGeneration!==generation){epoch++;generation=null;bindings.disconnect();observe();}
   if(!invoke){const result=liveDeviceCatalog(current.params.state,'preview');if(generation===null){generation='preview';bindings.connect(result);}else bindings.observe(result);}
   const enabled=state.native&&(state.ready||state.revision)&&state.status.running&&!state.faulted&&!state.closing&&!state.busy;
   for(const key of keys.values())key.disabled=!enabled;releaseButton.disabled=!enabled;
   if(!enabled&&player.held().length)release();
  },
  dispose(){if(disposed)return;release();disposed=true;epoch++;generation=null;bindings.disconnect();win?.clearInterval(timer);win?.removeEventListener('blur',release);doc.removeEventListener('visibilitychange',visibility);view?.dispose();base.dispose();},
 };
}
