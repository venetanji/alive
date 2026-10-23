import {deviceValues,presetParameters,withDevicePreset} from './canvas-device.mjs';
import {packageInstrument} from './canvas-instrument.mjs';
import {createDevicePlayer} from './canvas-device-player.mjs';
import {REGISTRY} from './canvas-model.mjs';
import {treeNodes} from './canvas-hierarchy.mjs';

export function mountDevicePanel({doc,win,controller,invoke,beforeOpen=()=>{}}){
  const $=id=>doc.querySelector('#'+id),panel=$('instrument-panel');
  const make=(tag,className,text)=>{const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const guard=fn=>(...args)=>{try{return Promise.resolve(fn(...args)).catch(error=>controller.notice(error));}catch(error){controller.notice(error);return Promise.resolve();}};
  const current=()=>controller.getState().document??controller.getState().patch;
  let identity='',presetsKey='',bindings=[],midi=null,opened=false;
  const inputs=new Map(),keys=new Map();
  const player=createDevicePlayer({
    send:note=>midi?controller.deviceEvent(midi.node,midi.inlet,note):false,
    stop:()=>controller.stop('Keyboard release queue overflow: patch stopped.'),
    onError:error=>controller.notice(error),
    onChange:held=>{for(const [note,key]of keys){key.classList.toggle('held',held.includes(note));key.setAttribute('aria-pressed',String(held.includes(note)));}},
  });
  const release=guard(()=>player.releaseAll());
  function close(){opened=false;panel.hidden=true;$('show-instrument').setAttribute('aria-pressed','false');release();}
  function open(){
    beforeOpen();opened=true;panel.hidden=false;$('show-instrument').setAttribute('aria-pressed','true');
    update(controller.getState());
  }
  function build(device){
    bindings=device?.parameters??[];midi=device?.midi??null;inputs.clear();
    $('instrument-controls').replaceChildren();
    for(const binding of bindings){
      const row=make('div','instrument-control'),label=make('label','',binding.label),range=make('input'),numeric=make('input'),unit=make('span','instrument-unit',binding.unit??'');
      const node=treeNodes(current()).find(node=>node.id===binding.node);
      const integral=!!REGISTRY[node.type].params[binding.param].integer;
      range.type='range';range.min=String(binding.min);range.max=String(binding.max);range.step=integral?'1':'any';
      numeric.type='number';numeric.min=range.min;numeric.max=range.max;numeric.step=integral?'1':binding.max<=1?'0.01':binding.max<=20?'0.1':'1';
      range.id=`device-${binding.key}`;label.htmlFor=range.id;
      range.setAttribute('aria-label',binding.label);numeric.setAttribute('aria-label',`${binding.label} value`);
      let editing=false;
      const write=(value,history=true)=>{
        if(!Number.isFinite(value)||value<binding.min||value>binding.max)throw Error(`${binding.label} must be between ${binding.min} and ${binding.max}.`);
        controller.deviceParameter(binding.node,binding.param,value,{history});
      };
      range.addEventListener('input',guard(()=>{numeric.value=range.value;write(Number(range.value),!editing);editing=true;}));
      for(const name of ['change','pointerup','pointercancel','blur'])range.addEventListener(name,()=>{editing=false;});
      numeric.addEventListener('change',guard(()=>write(Number(numeric.value))));
      row.append(label,range,numeric,unit);$('instrument-controls').append(row);inputs.set(binding.key,{range,numeric});
    }
  }
  function update(state){
    const patch=state.document??state.patch,device=patch.device;
    const next=JSON.stringify(device?{id:device.id,midi:device.midi,parameters:device.parameters}:null);
    if(identity!==next){release();identity=next;build(device);presetsKey='';}
    if(!opened)return;
    $('instrument-title').textContent=device?.name??'Instrument';
    $('instrument-empty').hidden=!!device;$('instrument-playable').hidden=!device;
    $('instrument-instance').disabled=!device||!invoke||state.closing||state.applying;
    $('instrument-package').disabled=state.closing||state.applying;
    if(!device)return;
    const values=deviceValues(patch);
    for(const binding of bindings){
      const {range,numeric}=inputs.get(binding.key),value=values[binding.key];
      if(range.value!==String(value))range.value=String(value);
      if(doc.activeElement!==numeric)numeric.value=String(Number(value.toFixed(4)));
      range.disabled=numeric.disabled=!!state.closing||state.faulted;
    }
    const newPresets=JSON.stringify(device.presets.map(preset=>preset.name));
    if(presetsKey!==newPresets){
      const previous=$('instrument-preset').value;
      $('instrument-preset').replaceChildren(...device.presets.map(preset=>{const option=make('option','',preset.name);option.value=preset.name;return option;}));
      if(device.presets.some(preset=>preset.name===previous))$('instrument-preset').value=previous;
      presetsKey=newPresets;
    }
    const playable=state.native&&state.status.running&&!state.faulted&&!state.closing;
    for(const key of keys.values())key.disabled=!playable;
    $('instrument-keyboard-note').textContent=state.native?(state.status.running?'Play with the keys below, or focus the keyboard and use A W S E D F T G Y H U J K.':'Start audio to play this instrument.'):'Open this patch in native Ultra to play.';
  }
  for(let semitone=0;semitone<=12;semitone++){
    const note=60+semitone,name=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][semitone%12],black=name.includes('#');
    const key=make('button',`instrument-key${black?' sharp':''}`,`${name}${semitone===12?'5':'4'}`);key.type='button';key.dataset.note=String(note);key.setAttribute('aria-label',`Play ${name}${semitone===12?'5':'4'}`);key.setAttribute('aria-pressed','false');
    key.addEventListener('pointerdown',guard(e=>{if(e.button!==0||key.disabled)return;e.preventDefault();key.focus();key.setPointerCapture?.(e.pointerId);return player.press(note,`pointer:${e.pointerId}`);}));
    for(const name of ['pointerup','pointercancel','lostpointercapture'])key.addEventListener(name,guard(e=>player.release(`pointer:${e.pointerId}`)));
    key.addEventListener('keydown',guard(e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();e.stopPropagation();return player.press(note,`button:${note}`);}}));
    key.addEventListener('keyup',guard(e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();e.stopPropagation();return player.release(`button:${note}`);}}));
    $('instrument-keyboard').append(key);keys.set(note,key);
  }
  const keyMap=new Map([...('awsedftgyhujk')].map((key,index)=>[key,60+index]));
  const keydown=e=>{
    const key=e.key.toLowerCase();if(!opened||e.ctrlKey||e.metaKey||e.altKey||!keyMap.has(key)||e.target.closest?.('input,select,textarea'))return;
    if(!panel.contains(e.target))return;
    e.preventDefault();e.stopPropagation();
    if(!e.repeat&&controller.getState().status.running)guard(()=>player.press(keyMap.get(key),`key:${key}`))();
  };
  const keyup=e=>{const key=e.key.toLowerCase();if(!keyMap.has(key))return;guard(()=>player.release(`key:${key}`))();};
  panel.addEventListener('keydown',keydown);win.addEventListener('keyup',keyup);win.addEventListener('blur',release);
  const visibility=()=>{if(doc.hidden)release();};doc.addEventListener('visibilitychange',visibility);
  $('show-instrument').addEventListener('click',()=>opened?close():open());
  $('instrument-close').addEventListener('click',close);
  $('instrument-package').addEventListener('click',guard(async()=>{
    await controller.flush();const patch=current(),name=$('instrument-name').value.trim()||'Subtractive instrument';
    controller.load(packageInstrument(patch,{name,id:patch.device?.id??'org.alive.instrument'}));await controller.flush();open();
  }));
  $('instrument-recall').addEventListener('click',guard(async()=>{
    await controller.flush();const changes=presetParameters(current(),$('instrument-preset').value);
    for(const change of changes)controller.deviceParameter(change.node,change.key,change.value);
    await controller.flush();controller.notice(`Recalled ${$('instrument-preset').value}.`);
  }));
  $('instrument-store').addEventListener('click',guard(async()=>{
    await controller.flush();const name=$('instrument-preset-name').value.trim();
    controller.load(withDevicePreset(current(),name));await controller.flush();
    $('instrument-preset').value=name;controller.notice(`Stored ${name}. Save the patch to keep this preset.`);
  }));
  $('instrument-instance').addEventListener('click',guard(async()=>{await controller.flush();await invoke('document_instantiate');}));
  $('instrument-release').addEventListener('click',guard(async()=>{await player.releaseAll();await controller.stop();}));
  return{open,close,update,isOpen:()=>opened,dispose(){release();win.removeEventListener?.('keyup',keyup);win.removeEventListener?.('blur',release);doc.removeEventListener?.('visibilitychange',visibility);}};
}
