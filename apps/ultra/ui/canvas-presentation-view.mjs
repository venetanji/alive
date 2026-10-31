import {createDial,createSlider,createNumber,createToggle,createMenu,createRadioGroup,createButton} from './live-controls.mjs';
import {createLiveDeviceView} from './live-device-view.mjs';

const scopeKey=scope=>JSON.stringify([scope?.ownerId,scope?.generation,scope?.instanceId,scope?.sourceRevision]);
const factories={dial:createDial,slider:createSlider,number:createNumber,toggle:createToggle,menu:createMenu,radio:createRadioGroup,button:createButton};

export function mountPresentation({doc,root,presentation,host,mode='preview',onError=()=>{}}){
  const scope=Object.freeze({...host.scope}),key=scopeKey(scope),views=[],cleanup=[];
  let disposed=false,replaced=null,current=presentation;
  const active=()=>!disposed&&scopeKey(host.scope)===key;
  const make=(tag,cls,text)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  const viewport=make('div','presentation-viewport'),surface=make('div','presentation-surface');
  surface.dataset.mode=mode;surface.style.width=presentation.size.width+'px';surface.style.height=presentation.size.height+'px';viewport.append(surface);root.replaceChildren(viewport);
  const report=(error,container)=>{if(!active())return;if(container){container.textContent=String(error.message??error);container.hidden=false;}onError(error);};
  function mountControl(item,box){
    const resolved=host.resolve(item.target),descriptor=resolved?.descriptor;
    if(item.target.kind==='text'){
      const text=make('div','presentation-text',resolved?.text??'');
      const style=resolved?.style??{},color=rgba=>`rgba(${rgba.slice(0,3).map(c=>Math.round(c*255)).join(',')},${rgba[3]})`;
      if(style.fontsize)text.style.fontSize=style.fontsize+'px';if(style.textcolor)text.style.color=color(style.textcolor);if(style.bgcolor)text.style.backgroundColor=color(style.bgcolor);
      box.append(text);return;
    }
    const error=make('div','presentation-error');error.setAttribute('role','alert');error.hidden=true;
    let gesture=null,serial=0,control;
    const read=()=>resolved?.bindingId?host.snapshot(resolved.bindingId):null;
    const finish=()=>{gesture=null;};
    function write(value,phase){
      if(!active()||!resolved?.bindingId||!read()?.enabled)return false;
      value=Number(value);
      if(!Number.isFinite(value)||value<descriptor.min||value>descriptor.max||descriptor.integral&&!Number.isInteger(value)){report(Error(`${item.label} requires a value from ${descriptor.min} to ${descriptor.max}.`),error);return false;}
      try{gesture??=host.beginGesture(resolved.bindingId);}catch(e){report(e,error);return false;}
      const gestureId=gesture,ticket=++serial;if(phase!=='preview')finish();
      let request;try{request=host.write({scope,bindingId:resolved.bindingId,gestureId,phase,value});}catch(e){request=Promise.reject(e);}
      Promise.resolve(request).then(snapshot=>{
        if(!active()||ticket!==serial)return;
        error.hidden=true;if(snapshot&&!control.hasDraft?.())control.update?.(snapshot.commanded);
        refresh();
      },e=>{if(active()&&ticket===serial){gesture=gestureId;report(e,error);refresh();}});
      return true;
    }
    const state=read(),value=state?.commanded??descriptor?.min??0;
    const options={label:item.label,value,checked:!!value,min:descriptor?.min,max:descriptor?.max,step:descriptor?.integral?1:'any',unit:descriptor?.unit??'',options:item.options??[],disabled:!state?.enabled,onInput:v=>write(v,'preview'),onChange:v=>write(v,'commit'),onCancel:v=>write(v,'cancel'),onClick:()=>{
      if(!active())return;
      Promise.resolve().then(()=>{if(!active())return;return host.sendEvent({scope,target:item.target,action:item.target.action});}).catch(e=>report(e,error));
    }};
    control=factories[item.widget](doc,options);
    if(mode==='performance'){
      if(control.number)control.number.setAttribute('aria-label',`${item.label} base`);
      else if(item.widget==='number')control.input.setAttribute('aria-label',`${item.label} base`);
      if(control.input?.type==='range')control.input.setAttribute('aria-label',`${item.label} base slider`);
    }
    if(item.widget==='button')control.element.disabled=!active()||resolved?.capabilities?.event!==true;
    const output=make('output','presentation-ownership');output.setAttribute('aria-label',`${item.label} effective ownership`);
    function refresh(){
      const snapshot=read(),enabled=active()&&snapshot?.enabled;
      if(item.widget==='button'){control.element.disabled=!active()||resolved?.capabilities?.event!==true;return;}
      if(control.setDisabled)control.setDisabled(!enabled);else (control.input??control.element).disabled=!enabled;
      if(snapshot){control.update?.(item.widget==='toggle'?!!snapshot.commanded:snapshot.commanded);output.textContent=`${snapshot.owner}: ${Number(Number(snapshot.effective).toFixed(3))}${descriptor.unit?' '+descriptor.unit:''}`;box.classList.toggle('automated',snapshot.owner==='Automation');}
    }
    box.dataset.labelPosition=item.style.labelPosition;
    if(item.widget==='number'){const caption=make('span','live-label',item.label);if(item.style.labelPosition==='below')box.append(control.element,caption);else box.append(caption,control.element);}else box.append(control.element);
    box.append(output,error);
    views.push({refresh,hasDraft:()=>gesture!==null||!!control.hasDraft?.(),dispose:()=>{serial++;control.dispose?.();}});refresh();
  }
  function mountPanel(item,box){
    const status=make('div','presentation-panel-status','Loading device panel…');status.setAttribute('role','status');box.append(status);
    let body=null,bindings=null,candidate=null,original=null,gesture=null,queued=null,scheduled=false,serial=0,revoked=false,inFlight=0;
    const authorized=()=>active()&&!revoked;
    const snapshot=()=>structuredClone(bindings.snapshot().values);
    function edit(bindingId,value,phase){
      if(!authorized()||!gesture&&inFlight)return false;
      if(!gesture){original=snapshot();candidate=structuredClone(original);gesture=host.beginGesture(`panel:${item.target.node}`);}
      if(!Object.hasOwn(candidate,bindingId))throw Error(`Panel binding ${bindingId} is absent from complete source state.`);
      candidate[bindingId]=value;if(phase==='cancel')candidate=structuredClone(original);
      queued={scope,sourceNode:item.target.node,gestureId:gesture,phase,values:structuredClone(candidate)};
      if(!scheduled){scheduled=true;queueMicrotask(flush);}
      return true;
    }
    function flush(){
      scheduled=false;if(!authorized()||!queued)return;const request=queued;queued=null;const ticket=++serial;inFlight++;
      if(request.phase!=='preview'){gesture=null;original=null;}
      Promise.resolve().then(()=>{if(authorized())return host.writeBatch(request);}).then(accepted=>{
        if(!authorized()||ticket!==serial||!accepted)return;
        bindings.observe?.(accepted);if(!gesture&&!queued)candidate=null;status.hidden=true;body?.refresh();
      },error=>{if(authorized()&&ticket===serial){candidate=null;gesture=null;original=null;report(error,status);body?.refresh();}}).finally(()=>{inFlight--;});
    }
    const view={refresh:()=>body?.refresh(),hasDraft:()=>!!gesture||!!queued||!!inFlight||!!body?.hasDraft(),dispose(){revoked=true;serial++;queued=null;bindings?.disconnect();body?.dispose();}};views.push(view);
    Promise.resolve().then(()=>{if(authorized())return host.acquirePanel({scope,sourceNode:item.target.node,profile:item.target.profile});}).then(result=>{
      if(!result)return;if(!authorized()){result.bindings?.disconnect();return;}
      const resources=result.resources;bindings=result.bindings;
      if(!resources?.identity||!resources.layout||!bindings?.snapshot||!bindings.resolveBinding)throw Error('Device panel resources or bindings are unavailable.');
      body=createLiveDeviceView(doc,{layout:resources.layout,graphics:resources.graphics,resolveBinding:(connection,node,options)=>{
        const binding=bindings.resolveBinding(connection,node,options);if(!binding)return null;const bindingId=binding.bindingId;
        return{...binding,getState:()=>{const state=binding.getState();return{...state,enabled:authorized()&&state.enabled,value:candidate&&Object.hasOwn(candidate,bindingId)?candidate[bindingId]:state.value};},onInput:v=>edit(bindingId,v,'preview'),onChange:v=>edit(bindingId,v,'commit'),onCancel:v=>edit(bindingId,v,'cancel')};
      },evaluateExpression:(...args)=>bindings.evaluateExpression?.(...args),onError:e=>report(e,status)});
      box.replaceChildren(body.element,status);status.hidden=true;
    }).catch(error=>{if(authorized()){status.setAttribute('role','alert');report(error,status);}});
  }
  for(const item of presentation.items){
    if(!item.included)continue;
    const box=make('div',`presentation-item presentation-${item.kind}`);box.dataset.presentationId=item.id;box.dataset.accent=item.style.accent;box.hidden=!item.visible;
    Object.assign(box.style,{left:item.rect.x+'px',top:item.rect.y+'px',width:item.rect.width+'px',height:item.rect.height+'px'});surface.append(box);
    try{if(item.kind==='livePanel')mountPanel(item,box);else mountControl(item,box);}catch(error){const message=make('div','presentation-error');message.setAttribute('role','alert');box.append(message);report(error,message);}
  }
  const refresh=()=>{if(!disposed)for(const view of views)view.refresh();};
  cleanup.push(host.subscribe(refresh));
  const hasDraft=()=>replaced?replaced.hasDraft():views.some(view=>view.hasDraft());
  function dispose(){if(replaced){replaced.dispose();replaced=null;}if(disposed)return;disposed=true;for(const unsubscribe of cleanup)unsubscribe();for(const view of views)view.dispose();}
  return{hasDraft,dispose,update(next=current){
    if(replaced)return replaced.update(next);
    if(disposed)return false;
    if(JSON.stringify(next)!==JSON.stringify(current)){if(hasDraft())return false;dispose();current=next;replaced=mountPresentation({doc,root,presentation:next,host,mode,onError});return true;}
    refresh();return true;
  }};
}
