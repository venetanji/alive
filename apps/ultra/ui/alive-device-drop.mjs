const deviceType='application/x-alive-browser-device';

// Only a drag started by this browser can load a device. File/text drops stay external.
export function mountDeviceDrop({doc,win,scope,track,onDrop,onError}){
  let drag=null,highlight=null,decoration=null,lastError='';
  function clearHighlight(){if(highlight){highlight.classList.remove('device-drop-target');if(decoration)highlight.classList.remove(decoration);}highlight=null;decoration=null;}
  function cancel(){clearHighlight();drag=null;lastError='';}
  function error(message){if(message!==lastError){lastError=message;onError(message);}}
  function start(entry,event){
    cancel();const intent=scope();if(!intent){event.preventDefault();return;}
    drag={entry,intent};event.dataTransfer.setData(deviceType,entry.id);event.dataTransfer.effectAllowed='copy';
  }
  function destination(event){
    const element=event.target.closest?event.target:event.target.parentElement;
    const chain=element?.closest('#chain');
    if(chain){
      const current=track(chain.dataset.trackId);if(!current)return null;
      const row=element.closest('.chain-device'),effect=current.effects.findIndex(e=>e.instanceId===row?.dataset.instanceId);
      const leading=row&&event.clientX<row.getBoundingClientRect().left+row.getBoundingClientRect().width/2;
      const before=effect<0?current.effects[0]:current.effects[effect+(leading?0:1)];
      return{trackId:current.id,beforeInstanceId:row?before?.instanceId??null:null,element:row??element.closest('.chain-drop-tail')??chain,decoration:row?(effect<0||!leading?'device-drop-after':'device-drop-before'):null};
    }
    const row=element?.closest('.track,.timeline-row');
    return row?{trackId:row.dataset.trackId,beforeInstanceId:null,element:row,decoration:null}:null;
  }
  function reason(target){
    const now=scope(),current=track(target.trackId);
    if(!now||now.generation!==drag.intent.generation||now.editRevision!==drag.intent.editRevision)return 'The device drag session changed. Drag the device again.';
    if(!current)return 'The destination track was removed. Drag the device again.';
    if(now.pending)return 'Wait for the musical edit to finish before loading a device.';
    if(now.playing)return 'Stop transport before loading a device.';
    if(drag.entry.kind==='instrument'&&current.chain.kind!=='midi')return 'Drop instruments onto a MIDI track. Audio tracks accept audio effects.';
    if(drag.entry.kind==='effect'&&current.effects.length>=2)return 'This track already has two effects. Remove an effect before adding another.';
    if(now.deviceCount>=now.maxDevices&&!(drag.entry.kind==='instrument'&&current.chain.instrument))return 'Device capacity reached. Remove a device before adding another.';
    return '';
  }
  function over(event){
    if(!drag)return;clearHighlight();const target=destination(event);if(!target)return;
    event.preventDefault();const blocked=reason(target);event.dataTransfer.dropEffect=blocked?'none':'copy';
    if(blocked){error(blocked);return;}
    lastError='';highlight=target.element;decoration=target.decoration;highlight.classList.add('device-drop-target');if(decoration)highlight.classList.add(decoration);
  }
  function drop(event){
    if(!drag)return;const target=destination(event);if(!target){cancel();return;}
    event.preventDefault();event.stopPropagation();const blocked=reason(target),origin=drag;cancel();
    if(blocked){onError(blocked);return;}
    Promise.resolve(onDrop(origin.entry,{trackId:target.trackId,beforeInstanceId:target.beforeInstanceId,intent:origin.intent})).catch(onError);
  }
  const leave=event=>{if(highlight&&!highlight.contains?.(event.relatedTarget))clearHighlight();};
  const escape=event=>{if(event.key==='Escape')cancel();};
  // Native webviews also need dragenter accepted over the chain's button controls.
  doc.addEventListener('dragenter',over);doc.addEventListener('dragover',over);doc.addEventListener('drop',drop);doc.addEventListener('dragleave',leave);doc.addEventListener('dragend',cancel);doc.addEventListener('keydown',escape,true);win?.addEventListener('blur',cancel);
  return{start,cancel,dispose(){cancel();doc.removeEventListener('dragenter',over);doc.removeEventListener('dragover',over);doc.removeEventListener('drop',drop);doc.removeEventListener('dragleave',leave);doc.removeEventListener('dragend',cancel);doc.removeEventListener('keydown',escape,true);win?.removeEventListener('blur',cancel);}};
}
