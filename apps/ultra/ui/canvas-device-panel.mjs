import {presetParameters,withDevicePreset} from './canvas-device.mjs';
import {packageInstrument} from './canvas-instrument.mjs';
import {mountPresentation} from './canvas-presentation-view.mjs';
import {createUltraPresentationHost} from './canvas-presentation-hosts.mjs';

export function mountDevicePanel({doc,win,controller,invoke,beforeOpen=()=>{},drafts}){
  const $=id=>doc.querySelector('#'+id),panel=$('instrument-panel');
  const make=(tag,className,text)=>{const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
  const guard=fn=>(...args)=>{try{return Promise.resolve(fn(...args)).catch(error=>controller.notice(error));}catch(error){controller.notice(error);return Promise.resolve();}};
  const current=()=>controller.getState().document??controller.getState().patch;
  const surfaceIdentity=state=>JSON.stringify([state.ownerId,state.revision,state.shared?state.revision:state.desiredRevision,(state.document??state.patch).presentation]);
  let identity='',presetsKey='',opened=false,surface=null,host=null,watched=[];
  function close(){opened=false;panel.hidden=true;$('show-instrument').setAttribute('aria-pressed','false');}
  function open(){beforeOpen();opened=true;panel.hidden=false;$('show-instrument').setAttribute('aria-pressed','true');update(controller.getState());}
  function build(state){
    surface?.dispose();host?.dispose();for(const input of watched)drafts?.forget(input);watched=[];
    surface=null;host=null;$('instrument-controls').replaceChildren();
    const presentation=(state.document??state.patch).presentation;if(!presentation)return;
    host=createUltraPresentationHost({controller});surface=mountPresentation({doc,root:$('instrument-controls'),presentation,host,mode:'preview',onError:error=>controller.notice(error)});
    watched=[...$('instrument-controls').querySelectorAll('input')].filter(input=>input.commitDraft);
    for(const input of watched)drafts?.watch(input,()=>input.hasDraft());
  }
  function update(state){
    const patch=state.document??state.patch,device=patch.device,next=surfaceIdentity(state);
    if(identity!==next){identity=next;build(state);presetsKey='';}
    host?.publish();
    if(!opened)return;
    $('instrument-title').textContent=device?.name??'Presentation';
    $('instrument-empty').hidden=!!patch.presentation;$('instrument-playable').hidden=!patch.presentation;
    $('instrument-instance').disabled=!device||!invoke||state.closing||state.applying;
    $('instrument-package').disabled=state.closing||state.applying;
    for(const id of ['instrument-preset','instrument-recall','instrument-store','instrument-preset-name'])$(id).disabled=!device;
    if(!device)return;
    const newPresets=JSON.stringify(device.presets.map(preset=>preset.name));
    if(presetsKey!==newPresets){const previous=$('instrument-preset').value;$('instrument-preset').replaceChildren(...device.presets.map(preset=>{const option=make('option','',preset.name);option.value=preset.name;return option;}));if(device.presets.some(preset=>preset.name===previous))$('instrument-preset').value=previous;presetsKey=newPresets;}
  }
  $('show-instrument').addEventListener('click',()=>opened?close():open());
  $('instrument-close').addEventListener('click',close);
  $('instrument-package').addEventListener('click',guard(async()=>{
    await controller.flush();const patch=current(),name=$('instrument-name').value.trim()||patch.device?.name||'Subtractive instrument';
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
  return{open,close,update,wouldRebuild:state=>identity!==surfaceIdentity(state),isOpen:()=>opened,dispose(){surface?.dispose();host?.dispose();for(const input of watched)drafts?.forget(input);}};
}
