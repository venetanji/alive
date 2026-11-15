import {createDial} from './live-controls.mjs';
import {createDevicePlayer} from './canvas-device-player.mjs';
import {mountLiveDeviceResources} from './live-device-resources.mjs';
import {createAnalogBindings,analogPresetParameters} from './analog-bindings.mjs';
import {parseAnalogDefaultPresetXml} from './analog-default-preset.mjs';
import {decodeAnalogDefaultPreset} from './analog-default-loader.mjs';

export function mountAnalogTest({doc=document,win=window,invoke=window.__TAURI__?.core?.invoke}={}){
 const $=id=>doc.getElementById(id),keys=new Map();
 let resourcePanel;
 let running=false,busy=false,disposed=false,polling=false,hostEpoch=0;
 const notice=(text,error=false)=>{$('status').textContent=String(text);$('status').classList.toggle('error',error);};
 const call=(command,args={})=>invoke?invoke(command,args):Promise.reject(Error('Open this test in native Ultra to play.'));
 const bindings=createAnalogBindings({send:args=>call('analog_test_parameter',args),sendBatch:args=>call('analog_test_parameter_batch',args),onChange:()=>resourcePanel?.refresh(),onError:error=>notice(error,true)});
 resourcePanel=mountLiveDeviceResources({doc,readInstalledPack:invoke?kind=>invoke('analog_test_resource_pack',{kind}):null,resolveBinding:bindings.resolve,evaluateExpression:bindings.evaluate,onError:error=>notice(error,true)});
 const guard=fn=>(...args)=>Promise.resolve().then(()=>fn(...args)).catch(error=>notice(error,true));
 const velocity=()=>{const n=Number($('velocity').value);return Number.isInteger(n)&&n>=1&&n<=127?n:100;};
 const level=createDial(doc,{label:'Output level',min:0,max:.5,step:.001,value:.15,defaultValue:.15,
  onInput:value=>{if(running)guard(()=>call('analog_test_gain',{value}))();},
  onChange:value=>{if(running)guard(()=>call('analog_test_gain',{value}))();}});
 $('level').append(level.element);
 function update(){
  $('start').disabled=busy||running||!invoke;$('stop').disabled=busy||!running;
  $('release').disabled=busy||!running;level.setDisabled(!running||busy);
  for(const key of keys.values())key.disabled=!running||busy;
 }
 const player=createDevicePlayer({
  send:([pitch,velocity])=>call('analog_test_note',{pitch,velocity}),stop:()=>stop(),
  onError:error=>notice(error,true),onChange:held=>{for(const [note,key]of keys){key.classList.toggle('held',held.includes(note));key.setAttribute('aria-pressed',String(held.includes(note)));}},
 });
 async function start(){
  if(busy||running||disposed)return;busy=true;hostEpoch++;update();notice('Loading Analog...');
  let started=false;
  try{
   await call('analog_test_start');started=true;
   let controls=await call('analog_test_parameters'),startup='',parameters=null;
   try{
    const bytes=await call('analog_test_default_preset');
    if(bytes!=null){
     const {values}=parseAnalogDefaultPresetXml(await decodeAnalogDefaultPreset(bytes),{DOMParser:win.DOMParser});
     parameters=analogPresetParameters(values,controls);
     if(!parameters.length)throw Error('The installed Analog default has no admitted parameters.');
    }
   }catch(error){startup=` Using the neutral init patch: ${error.message}`;}
   if(parameters?.length){
    await call('analog_test_parameter_batch',{generation:controls.generation,values:parameters});
    controls=await call('analog_test_parameters');startup=' Loaded supported values from the installed Analog default.';
   }
   if(disposed){await call('analog_test_stop');return;}
   running=true;level.update(.15);bindings.connect(controls);
   notice(`Audio is running.${startup} Play the keyboard and turn the connected Analog controls.`);
  }catch(error){
   running=false;bindings.disconnect();
   if(started)await call('analog_test_stop');
   throw error;
  }
  finally{busy=false;update();}
 }
 async function stop(){
  if(busy)return;busy=true;hostEpoch++;running=false;bindings.disconnect();update();
  try{await call('analog_test_stop');await player.releaseAll();notice('Audio stopped. Start audio to play again.');$('peak').value=0;$('peak-value').textContent='0.000';}
  finally{busy=false;update();}
 }
 const release=guard(()=>player.releaseAll());
 const names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
 for(let note=48;note<=72;++note){
  const key=doc.createElement('button');key.type='button';key.className='piano-key'+([1,3,6,8,10].includes(note%12)?' black':'');key.dataset.note=String(note);
  key.textContent=note%12===0?`C${Math.floor(note/12)-1}`:'';key.setAttribute('aria-label',`${names[note%12]}${Math.floor(note/12)-1}`);key.setAttribute('aria-pressed','false');
  key.addEventListener('pointerdown',guard(async e=>{e.preventDefault();if(!running)return;key.setPointerCapture?.(e.pointerId);await player.press(note,`pointer:${e.pointerId}`,velocity());}));
  for(const type of ['pointerup','pointercancel','lostpointercapture'])key.addEventListener(type,guard(e=>player.release(`pointer:${e.pointerId}`)));
  key.addEventListener('keydown',guard(e=>{if(!running||![' ','Enter'].includes(e.key))return;e.preventDefault();return player.press(note,`button:${note}`,velocity());}));
  key.addEventListener('keyup',guard(e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();return player.release(`button:${note}`);}}));
  keys.set(note,key);$('keyboard').append(key);
 }
 const map=new Map('awsedftgyhujk'.split('').map((key,i)=>[key,60+i]));
 const keydown=guard(e=>{
  if(e.key==='Escape'){e.preventDefault();return stop();}
  const key=e.key.toLowerCase();if(!running||e.ctrlKey||e.metaKey||e.altKey||!map.has(key)||e.target.closest?.('input,select,textarea'))return;
  e.preventDefault();return player.press(map.get(key),`key:${key}`,velocity());
 });
 const keyup=guard(e=>{const key=e.key.toLowerCase();if(map.has(key))return player.release(`key:${key}`);});
 const visibility=()=>{if(doc.hidden)release();};
 win.addEventListener('keydown',keydown);win.addEventListener('keyup',keyup);win.addEventListener('blur',release);doc.addEventListener('visibilitychange',visibility);
 $('start').addEventListener('click',guard(start));$('stop').addEventListener('click',guard(stop));$('release').addEventListener('click',release);
 async function poll(){
  if(disposed||polling||!invoke||busy)return;polling=true;const ticket=hostEpoch;
  try{
   const state=await call('analog_test_status');if(disposed||ticket!==hostEpoch)return;
   if(running&&(!state.running||state.fault)){running=false;bindings.disconnect();update();await player.releaseAll();notice(state.fault?'Audio stopped after a device error. Stop, then start again.':state.output,true);}
   if(running)bindings.observe(state.controls);
   $('peak').value=state.peak;$('peak-value').textContent=Number(state.peak).toFixed(3);
   $('output-detail').textContent=state.running?`${state.output} Rendered ${state.frames} native frames. Connected controls edit the native DLL at audio block boundaries.`:'Start audio to connect the admitted Analog controls. Unresolved mappings remain disabled.';
  }catch(error){if(!disposed&&ticket===hostEpoch)notice(error,true);}finally{polling=false;}
 }
 const timer=win.setInterval(poll,200);update();if(!invoke)notice('Open this test in native Ultra to play.');
 return {start,stop,player,dispose(){disposed=true;hostEpoch++;bindings.disconnect();win.clearInterval(timer);release();level.dispose();resourcePanel.dispose();win.removeEventListener('keydown',keydown);win.removeEventListener('keyup',keyup);win.removeEventListener('blur',release);doc.removeEventListener('visibilitychange',visibility);}};
}
if(typeof document!=='undefined'&&document.getElementById('keyboard'))mountAnalogTest();
