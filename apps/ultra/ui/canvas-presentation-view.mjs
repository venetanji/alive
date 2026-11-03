import {createDial,createSlider,createNumber,createToggle,createMenu,createRadioGroup,createButton} from './live-controls.mjs';
import {createLiveDeviceView} from './live-device-view.mjs';

const scopeKey=scope=>JSON.stringify([scope?.ownerId,scope?.generation,scope?.instanceId,scope?.sourceRevision]);
const factories={dial:createDial,slider:createSlider,number:createNumber,toggle:createToggle,menu:createMenu,radio:createRadioGroup,button:createButton};

export function mountPresentation({doc,root,presentation,host,mode='preview',onError=()=>{},onControlsChanged=()=>{},onDraftsCancelled=()=>{},onInvalidated=()=>{}}){
  const scope=Object.freeze({...host.scope}),key=scopeKey(scope),views=[],cleanup=[];
  let disposed=false,replaced=null,current=presentation,freezes=0,capturing=0,revoked=false,freezeFocus=null,retainedFocus=null,focusHolds=0;
  const active=()=>!disposed&&!revoked&&scopeKey(host.scope)===key;
  const make=(tag,cls,text)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  const viewport=make('div','presentation-viewport'),surface=make('div','presentation-surface');
  surface.dataset.mode=mode;surface.style.width=presentation.size.width+'px';surface.style.height=presentation.size.height+'px';viewport.append(surface);root.replaceChildren(viewport);
  const report=(error,container)=>{if(!active())return;if(container){container.textContent=String(error.message??error);container.hidden=false;}onError(error);};
  function mountControl(item,box){
    const resolved=host.resolve(item.target),descriptor=resolved?.descriptor;
    if(item.target.kind==='text'){
      const text=make('div','presentation-text'),color=rgba=>`rgba(${rgba.slice(0,3).map(c=>Math.round(c*255)).join(',')},${rgba[3]})`;
      function refresh(){
        if(!active())return;
        const current=host.resolve(item.target),style=current?.style??{};text.textContent=current?.text??'';
        text.style.fontSize=style.fontsize?style.fontsize+'px':'';text.style.color=style.textcolor?color(style.textcolor):'';text.style.backgroundColor=style.bgcolor?color(style.bgcolor):'';
      }
      box.append(text);views.push({refresh,hasDraft:()=>false,dispose(){}});refresh();return;
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
      },e=>{if(active()&&ticket===serial){
        if(e.code==='PRESENTATION_GESTURE_ENDED'&&e.gestureId===gestureId){if(gesture===gestureId)gesture=null;}else gesture=gestureId;
        report(e,error);refresh();
      }});
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
    const status=make('div','presentation-panel-status','Loading device panel…'),cancel=make('button','presentation-panel-cancel','Cancel draft');status.setAttribute('role','status');cancel.hidden=true;box.append(status,cancel);
    let body=null,bindings=null,candidate=null,original=null,gesture=null,queued=null,scheduled=false,serial=0,revoked=false,pending=null,pendingPhase=null,failure=null,ready,cancelling=false,touched=new Set(),invalidated=false;
    const authorized=()=>active()&&!revoked&&!bindings?.snapshot().disconnected;
    const snapshot=()=>structuredClone(bindings.snapshot().values);
    const changes=()=>Object.fromEntries([...touched].map(key=>[key,candidate[key]]));
    function edit(binding,value,phase,internal=false){
      if(!authorized()||(!internal&&freezes&&!capturing)||binding.getState().enabled!==true||pendingPhase==='commit'||failure)return false;
      const bindingId=binding.bindingId;
      if(!gesture){original=snapshot();candidate=structuredClone(original);gesture=host.beginSourceGesture(item.target.node);}
      if(!Object.hasOwn(candidate,bindingId))throw Error(`Panel binding ${bindingId} is absent from complete source state.`);
      candidate[bindingId]=value;touched.add(bindingId);
      queued={scope,sourceNode:item.target.node,gestureId:gesture,phase,values:phase==='cancel'?{}:changes(),serial:++serial};
      if(!scheduled){scheduled=true;queueMicrotask(flush);}
      return true;
    }
    function flush(){
      scheduled=false;if(!authorized()||!queued||pending)return pending;
      const request=queued;queued=null;const {serial:ticket,...write}=request;
      pendingPhase=request.phase;body?.refresh();pending=Promise.resolve().then(()=>host.writeBatch(write)).then(reply=>{
        if(!authorized())throw Error('Device panel scope changed during settlement.');
        if(request.phase==='preview'&&reply?.phase==='preview')return;
        if(request.phase==='cancel'&&reply?.phase==='cancel'){
          if(ticket===serial){gesture=null;original=null;candidate=null;failure=null;touched.clear();}return;
        }
        if(request.phase==='commit'&&['accepted','unchanged'].includes(reply?.outcome)){
          if(ticket===serial){gesture=null;original=null;candidate=null;failure=null;touched.clear();}status.hidden=true;return;
        }
        throw Error(reply?.reason??`Device panel commit ${reply?.outcome??'returned an unknown outcome'}.`);
      }).catch(error=>{failure=error;cancel.hidden=false;if(authorized())report(error,status);throw error;}).finally(()=>{pending=null;pendingPhase=null;body?.refresh();if(queued&&!failure&&!cancelling)flush();});
      pending.catch(()=>{});return pending;
    }
    async function settleDrafts(){
      await ready;await Promise.resolve();
      if(!authorized()&&(gesture||queued||failure||body?.hasDraft()))throw Error('Device panel scope changed with a retained draft.');
      while(pending)await pending;
      if(failure)throw failure;
      if(queued)await flush();
      if(gesture){queued={scope,sourceNode:item.target.node,gestureId:gesture,phase:'commit',values:changes(),serial:++serial};await flush();}
      if(failure)throw failure;
    }
    async function cancelDrafts(){
      cancelling=true;queued=null;
      if(pending)try{await pending;}catch{}
      if(authorized()&&gesture){try{await host.writeBatch({scope,sourceNode:item.target.node,gestureId:gesture,phase:'cancel',values:{}});}catch{}}
      serial++;queued=null;gesture=null;original=null;candidate=null;failure=null;touched.clear();
      if(retainedFocus){retainedFocus.input.readOnly=retainedFocus.readOnly;retainedFocus=null;}
      for(const input of box.querySelectorAll('input'))input.cancelDraft?.();
      cancelling=false;status.hidden=true;cancel.hidden=true;body?.refresh();onDraftsCancelled();
    }
    cancel.addEventListener('click',()=>{cancelDrafts().catch(error=>report(error,status));});
    const view={refresh:()=>{if(bindings?.snapshot().disconnected&&!invalidated){invalidated=true;queueMicrotask(onInvalidated);}if(!authorized()&&(gesture||queued||failure||body?.hasDraft())){status.textContent='Device panel changed. Cancel the retained draft to continue.';status.hidden=false;cancel.hidden=false;for(const control of body?.element.querySelectorAll('input,select,button')??[])control.disabled=true;}body?.refresh();},hasDraft:()=>!!gesture||!!queued||!!pending||!!failure||!!body?.hasDraft(),failed:()=>!!failure,settleDrafts,cancelDrafts,dispose(){revoked=true;serial++;queued=null;bindings?.disconnect();body?.dispose();onControlsChanged();}};views.push(view);
    ready=Promise.resolve().then(()=>{if(authorized())return host.acquirePanel({scope,sourceNode:item.target.node,profile:item.target.profile});}).then(result=>{
      if(!result)return;if(!authorized()){result.bindings?.disconnect();return;}
      const resources=result.resources;bindings=result.bindings;
      if(!resources?.identity||!resources.layout||!bindings?.snapshot||!bindings.resolveBinding)throw Error('Device panel resources or bindings are unavailable.');
      body=createLiveDeviceView(doc,{layout:resources.layout,gui:resources.gui,graphics:resources.graphics,isCurrent:authorized,resolveBinding:(connection,node,options)=>{
        const binding=bindings.resolveBinding(connection,node,options);if(!binding)return null;const bindingId=binding.bindingId;
        return{...binding,getState:()=>{const state=binding.getState(),focused=retainedFocus?.binding===JSON.stringify([connection?.scope??[],connection?.expression??'']);if(focused&&!failure&&state.enabled){retainedFocus.input.readOnly=retainedFocus.readOnly;retainedFocus=null;}return{...state,enabled:authorized()&&(!freezes||capturing)&&pendingPhase!=='commit'&&((!failure&&state.enabled)||focused),value:candidate&&Object.hasOwn(candidate,bindingId)?candidate[bindingId]:state.value};},onInput:v=>edit(binding,v,'preview'),onChange:v=>edit(binding,v,'commit'),onCancel:v=>edit(binding,v,'cancel')};
      },evaluateExpression:(...args)=>bindings.evaluateExpression?.(...args),onError:e=>report(e,status)});
      box.replaceChildren(body.element,status,cancel);status.hidden=true;onControlsChanged();
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
  function dispose(){if(replaced){replaced.dispose();replaced=null;}if(disposed)return;disposed=true;freezeFocus?.stop();freezeFocus=null;if(retainedFocus){retainedFocus.input.readOnly=retainedFocus.readOnly;retainedFocus=null;}for(const unsubscribe of cleanup)unsubscribe();for(const view of views)view.dispose();}
  return{hasDraft,dispose,captureDrafts(fn){capturing++;refresh();try{return fn();}finally{capturing--;refresh();}},revoke(){revoked=true;refresh();},async cancelDrafts(){if(replaced)return replaced.cancelDrafts();for(const view of views)await view.cancelDrafts?.();},async settleDrafts(){if(replaced)return replaced.settleDrafts();for(const view of views)await view.settleDrafts?.();},freezeEdits(){
    if(focusHolds>0&&freezes===0&&freezeFocus)freezeFocus.changed=true;
    if(focusHolds===0){
      const input=doc.activeElement;
      if(input&&root.contains?.(input)){
        const snapshot={input,value:input.value,start:input.selectionStart,end:input.selectionEnd,direction:input.selectionDirection,binding:input.closest?.('[data-binding]')?.dataset.binding,readOnly:input.readOnly,changed:false,restore:false};
        const onFocus=event=>{if(event.target!==input)snapshot.changed=true;};
        for(const type of ['focusin','pointerdown','keydown'])doc.addEventListener?.(type,onFocus,true);
        snapshot.stop=()=>{for(const type of ['focusin','pointerdown','keydown'])doc.removeEventListener?.(type,onFocus,true);};freezeFocus=snapshot;
      }
    }
    focusHolds++;freezes++;refresh();let locked=true,finished=false;
    const unlock=()=>{if(!locked)return;locked=false;freezes--;refresh();};
    const finish=(failed=false)=>{
      if(finished)return;finished=true;if(failed&&freezeFocus)freezeFocus.restore=true;unlock();focusHolds--;
      if(focusHolds===0&&freezeFocus){
        const saved=freezeFocus;freezeFocus=null;saved.stop();
        if(saved.restore&&!saved.changed&&saved.input.isConnected!==false){
          if(saved.input.disabled&&saved.binding){retainedFocus=saved;retainedFocus.input.readOnly=true;refresh();}
          if(!saved.input.disabled){
            saved.input.focus();
            if(saved.input.value===saved.value&&saved.start!==null&&saved.start!==undefined)try{saved.input.setSelectionRange(saved.start,saved.end,saved.direction);}catch{}
          }
        }
      }
    };
    finish.forBarrier=unlock;return finish;
  },update(next=current){
    if(replaced)return replaced.update(next);
    if(disposed)return false;
    if(JSON.stringify(next)!==JSON.stringify(current)){if(hasDraft())return false;dispose();current=next;replaced=mountPresentation({doc,root,presentation:next,host,mode,onError,onControlsChanged,onDraftsCancelled,onInvalidated});return true;}
    refresh();return true;
  }};
}
