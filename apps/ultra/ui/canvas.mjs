import {REGISTRY,createCanvasController,parsePatch} from './canvas-model.mjs';

export function mountCanvas({document:doc=globalThis.document,window:win=globalThis.window,invoke=win?.__TAURI__?.core?.invoke}={}) {
  const $=selector=>doc.querySelector(selector),make=(tag,className,text)=>{const e=doc.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
  let initialized=false,selection=null,pendingPort=null,leaving=false,drag=null,inspectorKey='',timer=null;
  const views=new Map(),inspectorFields=new Map();
  const controller=createCanvasController({invoke,onState:state=>{if(initialized)render(state);}});
  const guard=fn=>async(...args)=>{try{return await fn(...args);}catch(error){controller.notice(error);}};
  const setData=(e,key,value)=>{e.dataset[key]=String(value);return e;};
  const isEditing=e=>['INPUT','TEXTAREA','SELECT'].includes(e?.tagName)||e?.isContentEditable;
  function select(value){selection=value;inspectorKey='';render(controller.getState());}
  function actParameter(node,key,value,options){try{controller.parameter(node.id,key,value,options);}catch(error){controller.notice(error);}}
  function numericInput(node,key,range=false){
    const parameter=REGISTRY[node.type].params[key],input=make('input');input.type=range?'range':'number';input.min=parameter.min;input.max=parameter.max;input.step=parameter.integer?1:'any';input.value=node.params[key];setData(input,'parameter',key);input.setAttribute('aria-label',`${REGISTRY[node.type].label} ${key}, object ${node.id}`);
    let continuous=false;
    if(range)input.addEventListener('input',()=>{actParameter(node,key,Number(input.value),{history:!continuous});continuous=true;});
    input.addEventListener('change',()=>{actParameter(node,key,Number(input.value),{history:!continuous});continuous=false;});
    return input;
  }
  function objectView(node){
    const s=REGISTRY[node.type],element=make('article',`node${['join','dac'].includes(node.type)?' stereo-node':''}`);setData(element,'node',node.id);element.setAttribute('aria-label',`${s.label} object ${node.id}`);
    const header=make('header'),title=make('span','',s.label),id=make('span','node-id',`#${node.id}`);setData(header,'drag','true');header.tabIndex=0;header.setAttribute('aria-label',`Select or drag ${s.label} object ${node.id}`);header.append(title,id);element.append(header);
    header.addEventListener('click',()=>select({kind:'node',id:node.id}));
    header.addEventListener('keydown',event=>{if([' ','Enter'].includes(event.key)){event.preventDefault();select({kind:'node',id:node.id});}});
    header.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();select({kind:'node',id:node.id});const current=controller.getState().patch.nodes.find(n=>n.id===node.id);drag={id:node.id,pointer:event.pointerId,startX:event.clientX,startY:event.clientY,x:current.x,y:current.y,nextX:current.x,nextY:current.y};header.setPointerCapture(event.pointerId);});
    header.addEventListener('pointermove',event=>{if(!drag||drag.id!==node.id||drag.pointer!==event.pointerId)return;drag.nextX=Math.max(0,Math.min(4000,drag.x+event.clientX-drag.startX));drag.nextY=Math.max(0,Math.min(4000,drag.y+event.clientY-drag.startY));element.style.left=`${drag.nextX}px`;element.style.top=`${drag.nextY}px`;drawCables(controller.getState().patch);});
    const finishDrag=()=>{if(!drag||drag.id!==node.id)return;const d=drag;drag=null;controller.move(d.id,d.nextX,d.nextY);};
    header.addEventListener('pointerup',finishDrag);header.addEventListener('pointercancel',finishDrag);header.addEventListener('lostpointercapture',finishDrag);
    const portElements={in:[],out:[]};
    for(const [direction,descriptors]of[['in',s.inlets],['out',s.outlets]]) {
      const row=make('div',`ports ${direction==='in'?'inlets':'outlets'}`);
      descriptors.forEach((p,index)=>{
        const button=make('button',`port ${p.type}`);button.type='button';setData(button,'direction',direction);setData(button,'port',index);setData(button,'side',p.side);setData(button,'portType',p.type);button.title=`${direction==='in'?'Inlet':'Outlet'} ${index}: ${p.label} (${p.type})`;button.setAttribute('aria-label',`${s.label} ${node.id}, ${button.title}`);
        button.addEventListener('click',guard(event=>{
          event.stopPropagation();
          if(direction==='out'){pendingPort={from:node.id,outlet:index};select({kind:'node',id:node.id});controller.notice(`Connect ${s.label} outlet ${index}: click a matching top inlet.`);}
          else if(pendingPort){controller.connect(pendingPort.from,pendingPort.outlet,node.id,index);pendingPort=null;render(controller.getState());}
          else{select({kind:'node',id:node.id});controller.notice('Start a cable by clicking a bottom outlet.');}
        }));row.append(button);portElements[direction].push(button);
      });element.append(row);
    }
    const body=make('div','node-body'),readout=make('div','node-readout','native —'),inputs=new Map();let trigger=null,copy=null,level=null;
    if(['bang','message','toggle'].includes(node.type)) {
      trigger=make('button',`trigger ${node.type}-trigger`,node.type==='message'?node.params.text:'○');trigger.type='button';setData(trigger,'trigger',node.type);trigger.setAttribute('aria-label',`Trigger ${s.label} object ${node.id}`);trigger.addEventListener('click',guard(()=>controller.event(node.id,0,null)));body.append(trigger);
      if(node.type==='message'){const edit=make('button','edit-message','edit');edit.title='Edit the stored message';edit.addEventListener('click',()=>select({kind:'node',id:node.id}));body.append(edit);}
    } else if(node.type==='gain') {const input=numericInput(node,'value',true);inputs.set('value',input);level=make('span','level-readout',node.params.value);body.append(input,level);}
    else {
      const key={number:'value',add:'rhs',multiply:'rhs',metro:'interval',counter:'steps',chord:'root',makenote:'duration',midiin:'channel'}[node.type];
      if(key){const input=numericInput(node,key);inputs.set(key,input);body.append(input,make('span','unit',{interval:'ms',steps:'steps',root:'root',duration:'ms',channel:'ch',rhs:'rhs'}[key]||''));}
      else {copy=make('span','node-copy');body.append(copy);}
    }
    element.append(body,readout);return{type:node.type,element,header,ports:portElements,inputs,trigger,copy,level,readout,lastPulses:null};
  }
  function drawCables(patch){
    const svg=$('#cables');svg.replaceChildren();
    const endpoint=(id,direction,index)=>{
      // Anchor to the rendered port center, including actual node height, border and scroll geometry.
      const base=$('#canvas').getBoundingClientRect(),rect=views.get(id).ports[direction][index].getBoundingClientRect();
      return{x:rect.left-base.left+rect.width/2,y:rect.top-base.top+rect.height/2};
    };
    patch.edges.forEach((edge,index)=>{
      if(!views.has(edge.from)||!views.has(edge.to))return;
      const a=endpoint(edge.from,'out',edge.outlet),b=endpoint(edge.to,'in',edge.inlet),kind=REGISTRY[patch.nodes.find(n=>n.id===edge.from).type].outlets[edge.outlet].type;
      const bend=Math.max(30,Math.min(180,Math.abs(b.y-a.y)*.45));
      const path=doc.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M ${a.x} ${a.y} C ${a.x} ${a.y+bend}, ${b.x} ${b.y-bend}, ${b.x} ${b.y}`);path.setAttribute('class',`cable ${kind}${selection?.kind==='edge'&&selection.index===index?' selected':''}`);setData(path,'edge',index);path.setAttribute('aria-label',`Cable ${edge.from}:${edge.outlet} to ${edge.to}:${edge.inlet}, ${kind}`);path.setAttribute('tabindex','0');path.addEventListener('click',event=>{event.stopPropagation();select({kind:'edge',index});});path.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();select({kind:'edge',index});}});svg.append(path);
    });
  }
  function renderInspector(state){
    const key=selection?.kind==='node'?`node:${selection.id}:${state.patch.nodes.find(n=>n.id===selection.id)?.type}`:selection?.kind==='edge'?`edge:${selection.index}:${JSON.stringify(state.patch.edges[selection.index])}`:'none';
    if(key!==inspectorKey){
      inspectorKey=key;inspectorFields.clear();const area=$('#inspector');area.replaceChildren();
      if(selection?.kind==='node') {
        const node=state.patch.nodes.find(n=>n.id===selection.id);if(!node){selection=null;return renderInspector(state);}const s=REGISTRY[node.type];
        area.append(make('h2','',`${s.label} #${node.id}`),make('p','',s.help));
        for(const [name,p]of Object.entries(s.params)) {
          const label=make('label','field'),nameLabel=make('span','field-name',name);if(name!=='text')nameLabel.append(make('span','',`${p.min}…${p.max}`));label.append(nameLabel);
          let input;
          if(name==='text'){input=make('textarea');input.value=node.params.text;input.maxLength=128;setData(input,'parameter',name);input.setAttribute('aria-label',`Stored message for object ${node.id}`);input.addEventListener('change',()=>actParameter(node,name,input.value));}
          else if(name==='shape'||name==='device'){
            input=make('select');setData(input,'parameter',name);for(const[value,text]of(name==='shape'?[[0,'Major'],[1,'Minor'],[2,'Sus4']]:[[0,'A'],[1,'B']])){const option=make('option','',text);option.value=value;input.append(option);}input.value=String(node.params[name]);input.setAttribute('aria-label',name);input.addEventListener('change',()=>actParameter(node,name,Number(input.value)));
          }else input=numericInput(node,name);
          label.append(input);if(['text','device','channel'].includes(name))label.append(make('small','field-help','Structural edit: stops timers and notes.'));
          if(['attack','release'].includes(name))label.append(make('small','field-help',`0 = 16 frames; otherwise raw × ${name==='attack'?4:8} ms. Latched on note-on.`));
          area.append(label);inspectorFields.set(name,input);
        }
        if(!Object.keys(s.params).length)area.append(make('p','','No stored parameters. Connect the ports to define its behavior.'));
      }else if(selection?.kind==='edge'){
        const edge=state.patch.edges[selection.index];if(!edge){selection=null;return renderInspector(state);}area.append(make('h2','','Cable'),make('p','',`Object ${edge.from} outlet ${edge.outlet} → object ${edge.to} inlet ${edge.inlet}`),make('p','','Fan-out order is the cable order in the saved patch. Delete this cable to disconnect it.'));
      }else area.append(make('p','','Select an object to edit its parameters or a cable to disconnect it. Add objects from the palette.'));
    }
    if(selection?.kind==='node'){
      const node=state.patch.nodes.find(n=>n.id===selection.id);for(const[key,input]of inspectorFields)if(doc.activeElement!==input&&node)input.value=String(node.params[key]);
    }
    $('#delete-selection').disabled=!selection;
  }
  function render(state){
    $('#preview-banner').hidden=state.native;$('#engine-state').textContent=!state.native?'Preview':state.faulted?'Fault · restart':state.status.running?'Audio on':'Audio off';
    $('#start-audio').disabled=!state.native||state.busy||!!state.status.running;
    $('#stop-audio').disabled=!state.native||state.busy;$('#stop-graph').disabled=!state.native;$('#panic').disabled=!state.native;
    $('#undo').disabled=!state.canUndo;$('#redo').disabled=!state.canRedo;
    $('#notice').textContent=state.notice;$('#patch-summary').textContent=`${state.patch.nodes.length} / 32 objects · ${state.patch.edges.length} / 64 cables`;
    $('#revision-state').textContent=!state.native?'Preview · not executing':`Document ${state.desiredRevision} · active ${state.activeDocumentRevision}${state.revision!==null?` · native r${state.revision}`:''}${state.applying?' · applying…':''}`;
    $('#reapply').disabled=!state.native||state.applying||state.busy;
    const ids=new Set(state.patch.nodes.map(n=>n.id));for(const[id]of views)if(!ids.has(id))views.delete(id);
    const children=[];
    for(const node of state.patch.nodes){
      if(!views.has(node.id)||views.get(node.id).type!==node.type)views.set(node.id,objectView(node));const v=views.get(node.id);children.push(v.element);
      if(drag?.id!==node.id){v.element.style.left=`${node.x}px`;v.element.style.top=`${node.y}px`;}
      v.element.classList.toggle('selected',selection?.kind==='node'&&selection.id===node.id);
      for(const[key,input]of v.inputs)if(doc.activeElement!==input)input.value=String(node.params[key]);
      const observation=state.observations[node.id],pulse=observation&&v.lastPulses!==null&&observation.pulses>v.lastPulses;
      if(v.trigger){v.trigger.disabled=!state.ready;if(node.type==='message')v.trigger.textContent=node.params.text;if(node.type==='toggle'){const on=!!observation?.value;v.trigger.classList.toggle('on',on);v.trigger.textContent=on?'×':'○';v.trigger.setAttribute('aria-pressed',String(on));}if(node.type==='bang')v.trigger.classList.toggle('pulse',!!pulse);}
      if(v.level)v.level.textContent=String(node.params.value);
      if(v.copy)v.copy.textContent=node.type==='voice'?`${node.params.device===0?'A':'B'} · sine / ASR`:node.type==='join'?'mono 0 + mono 1 → stereo':'stereo → JACK L / R';
      v.readout.textContent=observation?`${Array.isArray(observation.value)?observation.value.join(' '):Number.isFinite(observation.value)?Number(observation.value.toFixed(3)):observation.value??'—'} · ${observation.pulses} pulses`:'native —';
      v.lastPulses=observation?.pulses??null;
      v.ports.out.forEach((p,i)=>p.classList.toggle('pending',pendingPort?.from===node.id&&pendingPort.outlet===i));
    }
    // Do not detach focused controls / pointer capture on a status poll or parameter edit.
    const container=$('#objects');if(container.children.length!==children.length||children.some((e,i)=>container.children[i]!==e))container.replaceChildren(...children);
    $('#canvas').style.width=`${Math.max(860,...state.patch.nodes.map(n=>n.x+240))}px`;$('#canvas').style.height=`${Math.max(1160,...state.patch.nodes.map(n=>n.y+180))}px`;
    renderInspector(state);drawCables(state.patch);
  }
  for(const[type,s]of Object.entries(REGISTRY)){
    const button=make('button','',s.label);button.type='button';setData(button,'add',type);button.title=s.help;button.addEventListener('click',guard(()=>{
      const workspace=$('#workspace'),existing=controller.getState().patch.nodes;
      const columns=Math.max(1,Math.floor(((workspace.clientWidth||800)-70)/196));
      let x=40,y=40;
      for(let slot=0;slot<128;slot++){x=Math.min(3800,workspace.scrollLeft+40+(slot%columns)*196);y=Math.min(3900,workspace.scrollTop+40+Math.floor(slot/columns)*120);if(!existing.some(n=>Math.abs(n.x-x)<176&&Math.abs(n.y-y)<112))break;}
      const id=controller.add(type,x,y);pendingPort=null;select({kind:'node',id});
    }));$('#palette').append(button);
  }
  $('#object-search').addEventListener('input',event=>{const q=event.target.value.trim().toLowerCase();for(const button of $('#palette').children)button.hidden=!`${button.dataset.add} ${REGISTRY[button.dataset.add].label}`.toLowerCase().includes(q);});
  const remove=guard(()=>{if(selection?.kind==='node')controller.remove(selection.id);else if(selection?.kind==='edge')controller.disconnect(selection.index);selection=null;pendingPort=null;inspectorKey='';render(controller.getState());});
  $('#delete-selection').addEventListener('click',remove);$('#undo').addEventListener('click',guard(()=>{pendingPort=null;controller.undo();}));$('#redo').addEventListener('click',guard(()=>{pendingPort=null;controller.redo();}));
  $('#new-patch').addEventListener('click',guard(()=>{selection=null;pendingPort=null;controller.load({version:1,profile:'ultra-canvas-v1',nodes:[],edges:[]});}));
  $('#start-audio').addEventListener('click',()=>controller.startAudio());$('#stop-audio').addEventListener('click',()=>controller.stopAudio());$('#stop-graph').addEventListener('click',()=>controller.stop());$('#panic').addEventListener('click',()=>controller.panic());$('#reapply').addEventListener('click',()=>controller.reapply());
  $('#workspace').addEventListener('click',event=>{if(event.target===$('#workspace')||event.target===$('#canvas')||event.target===$('#objects')){pendingPort=null;select(null);}});
  win.addEventListener('keydown',event=>{
    if($('#patch-dialog').open)return;
    if(event.key==='Escape'){event.preventDefault();pendingPort=null;controller.stop();render(controller.getState());return;}
    if(isEditing(event.target))return;
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?controller.redo():controller.undo();}
    else if(['Delete','Backspace'].includes(event.key)){event.preventDefault();remove();}
  });
  win.addEventListener('blur',()=>controller.stop('Focus left the canvas. Timers and notes stopped.'));
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden)controller.stop('Canvas hidden. Timers and notes stopped.');});
  win.addEventListener('pagehide',()=>{leaving=true;controller.stopAudio();});
  for(const id of['legacy-link','lab-link'])$('#'+id).addEventListener('click',guard(async event=>{event.preventDefault();if(leaving)return;leaving=true;if(timer!==null)win.clearTimeout(timer);try{await controller.dispose();win.location.assign(event.currentTarget?.href||$('#'+id).href);}catch(error){leaving=false;timer=win.setTimeout(poll,100);throw error;}}));
  function dialog(mode){$('#dialog-title').textContent=mode==='open'?'Open patch':'Save / export patch';$('#patch-json').value=mode==='open'?'':controller.export();$('#dialog-status').textContent=mode==='open'?'Import validates the entire document before replacing it.':'Save this JSON to reopen the patch later. Unsaved changes are not automatically persisted.';$('#patch-dialog').showModal();$('#patch-json').focus();if(mode!=='open')$('#patch-json').select();}
  $('#export-patch').addEventListener('click',()=>dialog('save'));$('#open-patch').addEventListener('click',()=>dialog('open'));
  $('#import-patch').addEventListener('click',()=>{try{const patch=parsePatch($('#patch-json').value);selection=null;pendingPort=null;controller.load(patch);$('#patch-dialog').close();}catch(error){$('#dialog-status').textContent=error.message;controller.notice(error);}});
  $('#copy-patch').addEventListener('click',async()=>{try{await win.navigator.clipboard.writeText($('#patch-json').value);$('#dialog-status').textContent='JSON copied.';}catch{$('#patch-json').focus();$('#patch-json').select();$('#dialog-status').textContent='Clipboard unavailable. The JSON is selected; use your system Copy command.';}});
  $('#download-patch').addEventListener('click',()=>{try{const blob=new Blob([$('#patch-json').value],{type:'application/json'}),url=URL.createObjectURL(blob),link=make('a');link.href=url;link.download='patch.ultra.json';link.click();win.setTimeout(()=>URL.revokeObjectURL(url),1000);$('#dialog-status').textContent='Download requested. If your webview does not save it, copy the JSON instead.';}catch(error){$('#dialog-status').textContent=`Download unavailable: ${error.message}. Copy the JSON instead.`;}});
  $('#choose-file').addEventListener('click',()=>$('#patch-file').click());$('#patch-file').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{if(file.size>65536)throw Error('Patch exceeds 64 KiB.');const text=await file.text();parsePatch(text);$('#patch-json').value=text;$('#dialog-status').textContent='File validated. Choose Import JSON to replace the current patch.';}catch(error){$('#dialog-status').textContent=error.message;}finally{event.target.value='';}});
  initialized=true;render(controller.getState());controller.prepare();
  const poll=async()=>{if(leaving)return;await controller.poll();if(!leaving)timer=win.setTimeout(poll,100);};timer=win.setTimeout(poll,100);
  win.addEventListener('resize',()=>drawCables(controller.getState().patch));
  return{controller,render,dispose:async()=>{leaving=true;if(timer!==null)win.clearTimeout(timer);await controller.dispose();}};
}
if(typeof document!=='undefined'&&typeof window!=='undefined')mountCanvas();
