import {createCanvasController,parsePatch,validatePatch,starterPatch,nodeSpec} from './canvas-model.mjs';
import {OBJECTS,objectText,parseObjectText,portHelp} from './canvas-catalog.mjs';
import {createObjectEntry} from './canvas-entry.mjs';
import {createNodeView} from './canvas-node.mjs';
import {mountAudioSettings} from './audio-settings.mjs';
import {OBJECT_EXAMPLES} from './canvas-object-examples.mjs';

export function mountCanvas({document:doc=globalThis.document,window:win=globalThis.window,invoke=win?.__TAURI__?.core?.invoke}={}) {
  const $=id=>doc.querySelector('#'+id),make=(tag,className,text)=>{const e=doc.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
  let initialized=false,selection=null,selected=new Set(),pending=null,locked=false,zoom=1,panel=null,inspectorKey='',helpKey='',drag=null,marquee=null,leaving=false,timer=null;
  let pointer={x:80,y:90},pointerClient=null,panX=0,panY=0,pan=null,spaceHeld=false,suppressPanClick=false;
  let wireGesture=null,wireTarget=null,wireKey='',suppressWireClick=false;
  const wireTargets=new Map();
  const views=new Map(),fields=new Map();
  const controller=createCanvasController({invoke,onState:state=>{if(initialized)render(state);}});
  const audioSettings=mountAudioSettings({document:doc,invoke,controller});
  const guard=fn=>(...args)=>{try{return Promise.resolve(fn(...args)).catch(error=>controller.notice(error));}catch(error){controller.notice(error);}};
  const editing=e=>['INPUT','TEXTAREA','SELECT'].includes(e?.tagName)||e?.isContentEditable;
  const getNode=id=>controller.getState().patch.nodes.find(n=>n.id===id);
  const currentNode=()=>selection?.kind==='node'?getNode(selection.id):null;
  function selectNode(id,extend=false) {
    if(!extend)selected=new Set([id]);else if(selected.has(id))selected.delete(id);else selected.add(id);
    selection=selected.size?{kind:'node',id:selected.has(id)?id:[...selected][0]}:null;inspectorKey='';render(controller.getState());
  }
  function clearSelection(){selection=null;selected.clear();inspectorKey='';}
  function closeMenus(){ $('context-menu').hidden=true;$('port-tooltip').hidden=true;$('file-menu').open=false; }
  function point(e){const rect=$('canvas').getBoundingClientRect();return{x:Math.max(0,Math.min(3900,(e.clientX-rect.left)/zoom)),y:Math.max(0,Math.min(3900,(e.clientY-rect.top)/zoom))};}
  function entryAt(text='',node=null) {
    if(locked){controller.notice('Unlock the patch with Ctrl E to edit objects.');return;}
    closeMenus();cancelWire();
    const rect=$('canvas').getBoundingClientRect(),p=node?{x:node.x,y:node.y}:pointer;
    entry.open({text,nodeId:node?.id,x:p.x,y:p.y,clientX:rect.left+p.x*zoom,clientY:rect.top+p.y*zoom});
  }
  const entry=createObjectEntry({document:doc,window:win,onClose:()=>{$('workspace').focus();},commit:(text,context)=>{
    if(locked)throw Error('Unlock the patch before editing.');
    const parsed=parseObjectText(text,context.nodeId?getNode(context.nodeId):null);
    if(context.nodeId)controller.configure(context.nodeId,parsed.type,parsed.params);
    else {
      if(parsed.type==='voice'&&text.trim()==='voice~')delete parsed.params.device;
      const id=controller.add(parsed.type,context.x,context.y,parsed.params);selectNode(id);
    }
  }});
  function editNode(id){const n=getNode(id);if(n)entryAt(objectText(n),n);}
  function showPanel(mode) {
    panel=panel===mode?null:mode;return applyPanel();
  }
  function applyPanel() {
    $('details-panel').hidden=!panel;$('panel-title').textContent={library:'Objects',inspector:'Inspector',help:'Help',audio:'Audio settings'}[panel]||'Inspector';
    $('details-panel').setAttribute('aria-label',$('panel-title').textContent);
    $('details-panel').classList.toggle('audio-panel',panel==='audio');
    for(const mode of ['library','inspector','help','audio'])$(mode+'-content').hidden=panel!==mode;
    $('show-audio').setAttribute('aria-pressed',String(panel==='audio'));
    $('show-inspector').setAttribute('aria-pressed',String(panel==='inspector'));
    if(panel==='inspector')renderInspector(controller.getState());
    if(panel==='help')renderHelp(currentNode());
    if(panel==='library')$('object-search').focus();
    drawCables(controller.getState().patch);
    if(panel==='audio')return audioSettings.open();
  }
  function setLocked(value) {
    locked=value;drag=null;releaseNavigation();entry.close();cancelWire();closeMenus();
    if(locked)clearSelection();
    if(panel==='help')renderHelp(currentNode());
    $('workspace').classList.toggle('locked',locked);$('lock-patch').setAttribute('aria-pressed',String(locked));
    $('lock-label').textContent=locked?'Locked':'Edit';
    const icon=$('lock-patch').children[0]?.children[0];icon?.setAttribute('href',locked?'#i-lock':'#i-unlock');
    resetAssist();
    render(controller.getState());
  }
  function positionOverlay(element,x,y,width=275,height=200) {
    element.style.left=`${Math.max(8,Math.min(x,(win.innerWidth||1280)-width-8))}px`;
    element.style.top=`${Math.max(8,Math.min(y,(win.innerHeight||840)-height-8))}px`;
  }
  function hoverPort(id,direction,index,button) {
    if(pending)return;
    const node=getNode(id),info=portHelp(node,direction,index),tip=$('port-tooltip');
    tip.replaceChildren(make('strong','',`${OBJECTS[node.type].name}: ${info.title}`),make('p','',`${info.direction}: ${info.messages.join(' / ')}. ${info.detail}`));
    const r=button.getBoundingClientRect();positionOverlay(tip,r.left+12,r.top+14,275,120);tip.hidden=false;
    button.setAttribute('aria-describedby','port-tooltip');$('assist').textContent=`${direction==='in'?'Inlet':'Outlet'} ${index} / ${info.type}: ${info.detail}`;
  }
  function unhover(){ $('port-tooltip').hidden=true;if(!pending)resetAssist(); }
  function resetAssist(){ $('assist').textContent=locked?'Click controls to play. Ctrl E unlocks the patch.':'Drag between ports to connect. N: new object. Ctrl E: lock to perform.'; }
  function menuItem(text,fn,disabled=false) {
    const b=make('button','',text);b.type='button';b.setAttribute('role','menuitem');b.disabled=disabled;
    b.addEventListener('click',guard(()=>{closeMenus();return fn();}));$('context-menu').append(b);return b;
  }
  function contextMenu(id,e,port=null) {
    unhover();selectNode(id);const node=getNode(id),s=OBJECTS[node.type],menu=$('context-menu');menu.replaceChildren();
    if(port) {
      const info=portHelp(node,port.direction,port.index);
      menu.append(make('div','context-heading',`${s.name} / ${port.direction==='in'?'inlet':'outlet'} ${port.index}`),make('p','',info.detail),make('div','context-heading',info.direction));
      for(const message of info.messages)menu.append(make('span','message-type',message));
      if(port.direction==='out') {
        const edges=controller.getState().patch.edges.filter(edge=>edge.from===id&&edge.outlet===port.index);
        menu.append(make('p','',`${edges.length} outgoing cable${edges.length===1?'':'s'}. Cable array order is fan-out order.`),make('p','','Native status is a node observation, not a complete outlet-message trace.'));
        menuItem('Start a cable',()=>portClick(id,'out',port.index,e),locked);
      }
    } else {
      menu.append(make('div','context-heading',objectText(node)),make('p','',s.summary));
      menuItem('Edit object text',()=>editNode(id),locked);menuItem('Inspector',()=>{panel='inspector';applyPanel();});
      menuItem('Delete object',removeSelection,locked);
    }
    menuItem(`Help for ${s.name}`,()=>{panel='help';applyPanel();});
    positionOverlay(menu,e.clientX,e.clientY,270,360);menu.hidden=false;
    const first=[...menu.children].find(c=>c.tagName==='BUTTON'&&!c.disabled);first?.focus();
  }
  const samePort=(a,b)=>!!a&&!!b&&a.id===b.id&&a.direction===b.direction&&a.index===b.index;
  const portKey=p=>`${p.id}/${p.direction}/${p.index}`;
  function cableEdge(target) {
    const a=pending.direction==='out'?pending:target,b=pending.direction==='in'?pending:target;
    return{from:a.id,outlet:a.index,to:b.id,inlet:b.index};
  }
  function cancelWire(refresh=true) {
    const active=!!pending,gesture=wireGesture;wireGesture=null;pending=null;wireTarget=null;wireKey='';wireTargets.clear();
    if(gesture&&$('workspace').hasPointerCapture?.(gesture.pointer))$('workspace').releasePointerCapture(gesture.pointer);
    resetAssist();
    if(active&&refresh)render(controller.getState());
  }
  function startWire(id,direction,index) {
    pending={id,direction,index};wireTarget=null;wireKey='';unhover();selectNode(id);
    $('assist').textContent=`Drag or click a highlighted ${direction==='out'?'top inlet':'bottom outlet'}. Escape cancels.`;
  }
  function connectWire(target) {
    const edge=cableEdge(target);
    try{cancelWire();controller.connect(edge.from,edge.outlet,edge.to,edge.inlet);}
    catch(error){controller.notice(error);}
    render(controller.getState());
  }
  function portClick(id,direction,index,e) {
    if(e?.detail&&suppressWireClick)return;
    if(locked){controller.notice('Unlock the patch with Ctrl E to connect ports.');return;}
    unhover();
    const target={id,direction,index};
    if(samePort(pending,target)){cancelWire();render(controller.getState());}
    else if(pending&&pending.direction!==direction)connectWire(target);
    else startWire(id,direction,index);
  }
  function portDown(id,direction,index,e) {
    if(e.button!==0)return;
    // The captured pointer is handled on release; ignore its synthetic click.
    e.preventDefault();suppressWireClick=true;
    if(locked){controller.notice('Unlock the patch with Ctrl E to connect ports.');return;}
    const pressed={id,direction,index},started=!pending||(pending.direction===direction&&!samePort(pending,pressed));
    if(started)startWire(id,direction,index);
    pointer=point(e);wireGesture={pointer:e.pointerId,x:e.clientX,y:e.clientY,pressed,started,moved:false};
    $('workspace').setPointerCapture?.(e.pointerId);drawCables(controller.getState().patch);
  }
  function targetAt(e) {
    const hit=doc.elementFromPoint?.(e.clientX,e.clientY);
    if(!hit?.closest?.('#workspace'))return null;
    const direct=hit.closest('.port'),node=direct?.closest('[data-node]');
    if(direct&&direct.dataset.direction!==pending.direction)return{id:Number(node.dataset.node),direction:direct.dataset.direction,index:Number(direct.dataset.port)};
    let nearest=null,distance=14;
    for(const candidate of wireTargets.values()){
      const r=candidate.button.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,d=Math.hypot(e.clientX-x,e.clientY-y);
      if(d<distance&&doc.elementFromPoint(x,y)?.closest('.port')===candidate.button){nearest=candidate.target;distance=d;}
    }
    return nearest;
  }
  function wireFeedback(state) {
    $('workspace').classList.toggle('wiring',!!pending);
    const key=pending?`${state.desiredRevision}/${portKey(pending)}`:'';
    if(key!==wireKey){
      wireKey=key;wireTargets.clear();
      if(pending)for(const [id,view] of views)for(const direction of ['in','out']){
        if(direction===pending.direction)continue;
        view.ports[direction].forEach((button,index)=>{
          const target={id,direction,index};let error='';
          try{validatePatch({...state.patch,edges:[...state.patch.edges,cableEdge(target)]});}catch(reason){error=reason.message;}
          wireTargets.set(portKey(target),{target,button,error});
        });
      }
    }
    if(wireTarget&&!wireTargets.has(portKey(wireTarget)))wireTarget=null;
    for(const [id,view] of views)for(const direction of ['in','out'])view.ports[direction].forEach((button,index)=>{
      const candidate=wireTargets.get(`${id}/${direction}/${index}`),active=samePort(wireTarget,candidate?.target);
      button.classList.toggle('compatible',!!candidate&&!candidate.error);
      button.classList.toggle('unavailable',!!candidate&&!!candidate.error);
      button.classList.toggle('wire-target',!!candidate&&active&&!candidate.error);
      button.classList.toggle('wire-invalid',!!candidate&&active&&!!candidate.error);
    });
    if(wireTarget){
      const candidate=wireTargets.get(portKey(wireTarget));
      $('assist').textContent=candidate?.error||`Release to connect ${OBJECTS[getNode(wireTarget.id).type].name} ${wireTarget.direction==='in'?'inlet':'outlet'} ${wireTarget.index}. Escape cancels.`;
    } else if(pending){
      $('assist').textContent=`Drag or click a highlighted ${pending.direction==='out'?'top inlet':'bottom outlet'}. Escape cancels.`;
    }
  }
  function finishWire(e) {
    if(!wireGesture||wireGesture.pointer!==e.pointerId)return;
    const gesture=wireGesture,target=pending?targetAt(e):null;wireGesture=null;
    if($('workspace').hasPointerCapture?.(e.pointerId))$('workspace').releasePointerCapture(e.pointerId);
    if(gesture.moved){if(target)connectWire(target);else{cancelWire();render(controller.getState());}}
    else if(!gesture.started)portClick(gesture.pressed.id,gesture.pressed.direction,gesture.pressed.index);
  }
  function dragStart(id,e) {
    if(locked||e.button!==0||e.ctrlKey||e.metaKey)return;
    e.preventDefault();e.stopPropagation();cancelWire();
    if(e.shiftKey){selectNode(id,true);return;}
    if(!selected.has(id))selectNode(id);
    const nodes=controller.getState().patch.nodes.filter(n=>selected.has(n.id));
    drag={id,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,nodes,dx:0,dy:0};
    views.get(id)?.header.setPointerCapture?.(e.pointerId);
  }
  function dragMove(e) {
    if(!drag||drag.pointer!==e.pointerId)return;
    const minX=Math.min(...drag.nodes.map(n=>n.x)),minY=Math.min(...drag.nodes.map(n=>n.y)),maxX=Math.max(...drag.nodes.map(n=>n.x)),maxY=Math.max(...drag.nodes.map(n=>n.y));
    drag.dx=Math.max(-minX,Math.min(4000-maxX,(e.clientX-drag.startX)/zoom));drag.dy=Math.max(-minY,Math.min(4000-maxY,(e.clientY-drag.startY)/zoom));
    for(const n of drag.nodes){const v=views.get(n.id);v.element.style.left=`${n.x+drag.dx}px`;v.element.style.top=`${n.y+drag.dy}px`;}
    drawCables(controller.getState().patch);
  }
  function finishDrag() {
    if(!drag)return;const d=drag;drag=null;
    if(d.dx||d.dy)controller.moveMany(d.nodes.map(n=>({id:n.id,x:n.x+d.dx,y:n.y+d.dy})));
  }
  function operate(id,e) {
    if(!locked&&!e.ctrlKey&&!e.metaKey){if(!selected.has(id))selectNode(id,e.shiftKey);return;}
    return guard(()=>controller.event(id,0,null))();
  }
  const structuralParameter=(type,key)=>key==='text'||key==='args'||(type==='midiin'&&key==='channel')||(type==='voice'&&key==='device');
  function parameter(id,key,value,options){
    if(locked&&structuralParameter(getNode(id)?.type,key)){controller.notice('Unlock the patch to change this structural parameter.');return;}
    return guard(()=>controller.parameter(id,key,value,options))();
  }
  function removeSelection() {
    if(locked)return;
    if(selection?.kind==='edge')controller.disconnect(selection.index);
    else if(selected.size)controller.removeMany([...selected]);
    clearSelection();cancelWire();render(controller.getState());
  }
  function drawCables(patch) {
    const svg=$('cables');svg.replaceChildren();
    const endpoint=(id,direction,index)=>{
      const base=$('canvas').getBoundingClientRect(),r=views.get(id).ports[direction][index].getBoundingClientRect();
      return{x:(r.left-base.left+r.width/2)/zoom,y:(r.top-base.top+r.height/2)/zoom};
    };
    const pathData=(a,b)=>{const bend=Math.max(22,Math.min(130,Math.abs(b.y-a.y)*.45));return`M ${a.x} ${a.y} C ${a.x} ${a.y+bend}, ${b.x} ${b.y-bend}, ${b.x} ${b.y}`;};
    patch.edges.forEach((edge,index)=>{
      if(!views.has(edge.from)||!views.has(edge.to))return;
      const source=patch.nodes.find(n=>n.id===edge.from),kind=nodeSpec(source).outlets[edge.outlet].type;
      const d=pathData(endpoint(edge.from,'out',edge.outlet),endpoint(edge.to,'in',edge.inlet));
      const path=doc.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);path.setAttribute('class',`cable ${kind}${selection?.kind==='edge'&&selection.index===index?' selected':''}`);path.dataset.edge=String(index);
      path.setAttribute('aria-label',`Cable ${edge.from}:${edge.outlet} to ${edge.to}:${edge.inlet}`);
      const choose=e=>{if(locked)return;e.stopPropagation();selected.clear();selection={kind:'edge',index};inspectorKey='';render(controller.getState());};
      path.addEventListener('click',choose);
      path.addEventListener('contextmenu',e=>{e.preventDefault();choose(e);const menu=$('context-menu');menu.replaceChildren(make('div','context-heading','Patch cord'),make('p','',`${kind}: ${edge.from}:${edge.outlet} to ${edge.to}:${edge.inlet}`));menuItem('Disconnect cable',removeSelection,locked);positionOverlay(menu,e.clientX,e.clientY,270,150);menu.hidden=false;});
      const hit=doc.createElementNS('http://www.w3.org/2000/svg','path');hit.setAttribute('d',d);hit.setAttribute('class','cable-hit');hit.addEventListener('click',choose);
      svg.append(hit,path);
    });
    if(pending&&views.has(pending.id)){
      const target=wireTarget&&wireTargets.get(portKey(wireTarget)),end=target&&!target.error?endpoint(wireTarget.id,wireTarget.direction,wireTarget.index):pointer,start=endpoint(pending.id,pending.direction,pending.index);
      const path=doc.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('class','cable pending-cable');path.setAttribute('d',pending.direction==='out'?pathData(start,end):pathData(end,start));svg.append(path);
    }
  }
  function renderInspector(state) {
    const n=currentNode(),key=selection?.kind==='edge'?`edge/${selection.index}`:n?`${n.id}/${n.type}/${selected.size}`:'none';
    if(key!==inspectorKey){
      inspectorKey=key;fields.clear();const area=$('inspector');area.replaceChildren();
      if(n){
        area.append(make('h2','',OBJECTS[n.type].name),make('p','',selected.size>1?`${selected.size} selected. Drag or delete the group.`:OBJECTS[n.type].summary));
        for(const [key,p] of Object.entries(OBJECTS[n.type].params)){
          const label=make('label','field'),name=make('span','field-name',key),input=make(['text','args'].includes(key)?'textarea':'input');
          input.dataset.parameter=key;input.setAttribute('aria-label',`${OBJECTS[n.type].name} ${key}, selected object ${n.id}`);
          if(!['text','args'].includes(key)){input.type='number';input.min=p.min;input.max=p.max;input.step=p.integer?1:'any';}
          input.value=n.params[key];input.addEventListener('change',()=>parameter(n.id,key,['text','args'].includes(key)?input.value:Number(input.value)));fields.set(key,input);label.append(name,input);area.append(label);
        }
        area.append(make('p','panel-note','Parameters update live. Object text and connection edits stop timers and clear notes.'));
        const b=make('button','panel-action',`Help for ${OBJECTS[n.type].name}`);b.addEventListener('click',()=>{panel='help';applyPanel();});area.append(b);
      } else if(selection?.kind==='edge') {
        const edge=state.patch.edges[selection.index];if(edge)area.append(make('h2','','Patch cord'),make('p','',`Object ${edge.from} outlet ${edge.outlet} to object ${edge.to} inlet ${edge.inlet}. Fan-out follows saved cable order.`));
      } else area.append(make('p','','Select an object to inspect its parameters. Right-click a port for accepted messages or emitted data.'));
    }
    if(n)for(const [key,input] of fields){input.disabled=locked&&structuralParameter(n.type,key);if(doc.activeElement!==input)input.value=String(n.params[key]);}
    $('edit-object').disabled=!n||locked;$('delete-selection').disabled=!selection||locked;
    const observation=n?state.observations[n.id]:null;
    $('observation-state').textContent=observation?`Node observation: ${JSON.stringify(observation.value)}. Total pulses: ${observation.pulses}. This is not a complete outlet trace.`:'No native node observation.';
  }
  const helpIdentity=node=>JSON.stringify([node?.id,node?.type,node?.params.args,locked]);
  function renderHelp(node) {
    helpKey=helpIdentity(node);
    const area=$('help-content');area.replaceChildren();
    if(!node){
      area.append(make('h2','','Patching in Ultra'),make('p','','Create objects by typing their name and arguments. Connect bottom outlets to top inlets. Lock the patch to use its controls.'));
      for(const [key,label] of [['Drag between ports','Connect an outlet to an inlet in either direction'],['Enter / Space on a port','Start or finish a connection'],['N','New object at pointer'],['B / M / T / I','Bang / message / toggle / number'],['Ctrl E','Lock or unlock'],['Ctrl I','Inspector'],['Enter / F2','Edit selected object'],['Ctrl Z / Ctrl Shift Z','Undo / redo'],['Ctrl A','Select all objects'],['Delete','Remove selection'],['Escape','Cancel editing or stop notes'],['Wheel / two-finger scroll','Scroll canvas'],['Shift + wheel','Scroll horizontally'],['Space + drag / middle drag','Pan canvas'],['Z / Shift Z','Zoom in / out at pointer'],['Ctrl +/- / Ctrl 0','Zoom / reset view'],['Ctrl + wheel / pinch','Zoom at pointer'],['Ctrl S / Ctrl O','Export / open JSON']]){
        const row=make('div','shortcut-row');row.append(make('span','',label),make('kbd','',key));area.append(row);
      }
      area.append(make('p','panel-note',`The canvas implements Ultra's ${Object.keys(OBJECTS).length}-object profile. It does not import .maxpat or execute arbitrary Max objects. Focus loss stops timers and notes.`));
      return;
    }
    const s={...OBJECTS[node.type],...nodeSpec(node)};area.append(make('h2','',s.name),make('p','',s.summary),make('code','help-example',s.example));
    const add=make('button','panel-action','Create this example object');add.disabled=locked;add.addEventListener('click',()=>entryAt(s.example));area.append(add);
    const run=make('button','panel-action','Open runnable example patch');run.disabled=locked;run.addEventListener('click',()=>{
      if(locked){controller.notice('Unlock the patch before loading an example.');return;}
      if(win.confirm&&!win.confirm('Replace this patch with the example? Export your current patch first to keep it.'))return;
      const patch=examplePatch(node.type);controller.load(patch);clearSelection();panel=null;applyPanel();fitPatch();
    });area.append(run);
    for(const direction of ['in','out']){
      const ports=direction==='in'?s.inlets:s.outlets;if(!ports.length)continue;
      const section=make('section','help-section');section.append(make('h3','',direction==='in'?'Inlets / accepted messages':'Outlets / emitted data'));
      ports.forEach((p,i)=>{const h=portHelp(node,direction,i),row=make('div','help-port');row.append(make('strong','',`${i}: ${h.title} (${h.type})`),make('p','',`${h.direction} ${h.messages.join(', ')}. ${h.detail}`));section.append(row);});area.append(section);
    }
    area.append(make('p','panel-note',s.help),make('p','panel-note','Original Ultra help. Similar names do not imply Max semantics. Native observations summarize a node; they are not a scope or message history.'));
  }
  function examplePatch(type) {
    if(Object.hasOwn(OBJECT_EXAMPLES,type))return JSON.parse(JSON.stringify(OBJECT_EXAMPLES[type]));
    const patch=starterPatch();for(const n of patch.nodes)if(n.type==='gain')n.params.value=4;
    if(['add','multiply'].includes(type)){
      patch.nodes.push({id:17,type,x:300,y:290,params:{rhs:type==='add'?12:1}});
      const edge=patch.edges.find(e=>e.from===14&&e.to===5);edge.to=17;patch.edges.push({from:17,outlet:0,to:5,inlet:0});
    }
    return patch;
  }
  function render(state) {
    audioSettings.update(state);
    $('audio-format').textContent=state.status.running&&state.status.period?`48 kHz / ${state.status.period} frames`:'48 kHz / stereo';
    $('preview-banner').hidden=state.native;$('runtime-label').textContent=state.native?'Native editor':'Browser preview';
    $('engine-state').textContent=!state.native?'Preview':state.faulted?'Fault - restart':state.status.running?'Audio on':'Audio off';$('engine-state').classList.toggle('running',!!state.status.running&&!state.faulted);
    $('start-audio').disabled=!state.native||state.busy||!!state.status.running;
    $('stop-audio').disabled=!state.native||state.busy;$('stop-graph').disabled=!state.native;$('panic').disabled=!state.native;
    $('undo').disabled=locked||!state.canUndo;$('redo').disabled=locked||!state.canRedo;$('add-object').disabled=locked;
    $('notice').textContent=state.notice;$('notice').title=state.notice;$('notice').setAttribute('aria-label',state.notice);$('patch-summary').textContent=`${state.patch.nodes.length} objects / ${state.patch.edges.length} cables`;
    $('revision-state').textContent=state.native?`Document ${state.desiredRevision}; active ${state.activeDocumentRevision}; native r${state.revision??'-'}.`:'Preview - not executing.';
    $('reapply').disabled=!state.native||state.applying||state.busy;
    $('selection-hint').textContent=locked?'Locked':selected.size?`${selected.size} selected`:'Editing';
    $('empty-patch').hidden=state.patch.nodes.length>0;
    if(pending){const node=state.patch.nodes.find(n=>n.id===pending.id);if(!node||!nodeSpec(node)[pending.direction==='in'?'inlets':'outlets'][pending.index])cancelWire(false);}
    const ids=new Set(state.patch.nodes.map(n=>n.id));for(const id of views.keys())if(!ids.has(id)){views.delete(id);selected.delete(id);}
    if(selection?.kind==='node'&&!ids.has(selection.id))selection=null;
    const children=[];
    for(const node of state.patch.nodes){
      if(!views.has(node.id)||views.get(node.id).type!==node.type||views.get(node.id).configuration!==node.params.args){
        const v=createNodeView(node,{doc,select:selectNode,dragStart,edit:editNode,portClick,portDown,hover:hoverPort,unhover,context:contextMenu,operate,parameter,event:(...args)=>guard(()=>controller.event(...args))()});
        for(const target of [v.element,v.header]){target.addEventListener('pointermove',dragMove);target.addEventListener('pointerup',finishDrag);target.addEventListener('pointercancel',finishDrag);target.addEventListener('lostpointercapture',finishDrag);}views.set(node.id,v);
      }
      const view=views.get(node.id);view.update(node,state,{selected:selected.has(node.id),locked,pending,moving:!!drag&&selected.has(node.id)});children.push(view.element);
    }
    const container=$('objects');if(container.children.length!==children.length||children.some((e,i)=>container.children[i]!==e))container.replaceChildren(...children);
    const width=Math.max(760,...state.patch.nodes.map(n=>n.x+350)),height=Math.max(740,...state.patch.nodes.map(n=>n.y+160));
    $('canvas').style.width=`${width}px`;$('canvas').style.height=`${height}px`;$('canvas').style.transform=`translate(${panX}px, ${panY}px) scale(${zoom})`;
    $('canvas-space').style.width=`${Math.max(width*zoom,$('workspace').clientWidth||0)}px`;$('canvas-space').style.height=`${Math.max(height*zoom,$('workspace').clientHeight||0)}px`;
    wireFeedback(state);renderInspector(state);drawCables(state.patch);
    if(panel==='help'&&helpKey!==helpIdentity(currentNode()))renderHelp(currentNode());
  }
  function zoomLabel() {
    $('zoom-fit').value=String(zoom);$('zoom-fit').textContent=`${Math.round(zoom*100)}%`;$('zoom-fit').hidden=false;
    $('canvas-zoom').value=String(zoom);
  }
  function setZoom(value,anchor=null) {
    if(drag||marquee||pan||wireGesture)return;
    const next=Math.max(.25,Math.min(3,value));if(!Number.isFinite(next))return;
    const workspace=$('workspace'),r=workspace.getBoundingClientRect(),base=$('canvas').getBoundingClientRect();
    const at=anchor||{x:r.left+(workspace.clientWidth||0)/2,y:r.top+(workspace.clientHeight||0)/2};
    panX+=(at.x-base.left)*(1-next/zoom);panY+=(at.y-base.top)*(1-next/zoom);zoom=next;
    const left=workspace.scrollLeft,top=workspace.scrollTop;
    entry.close();closeMenus();zoomLabel();render(controller.getState());
    // Shrinking the scroll surface may clamp scroll offsets. Keep the same
    // world point under the cursor even at those boundaries.
    panX+=workspace.scrollLeft-left;panY+=workspace.scrollTop-top;render(controller.getState());
  }
  function resetView(){if(drag||marquee||pan)return;zoom=1;panX=panY=0;$('workspace').scrollLeft=0;$('workspace').scrollTop=0;zoomLabel();render(controller.getState());}
  function fitPatch() {
    const patch=controller.getState().patch;if(!patch.nodes.length){resetView();return;}panX=panY=0;
    const width=Math.max(...patch.nodes.map(n=>n.x+(n.type==='gain'?40:190)))+35,height=Math.max(...patch.nodes.map(n=>n.y+(n.type==='gain'?120:35)))+35;
    const workspace=$('workspace');zoom=Math.max(.4,Math.min(1.5,(workspace.clientWidth||1000)/width,(workspace.clientHeight||730)/height));
    $('zoom-fit').value=String(zoom);$('zoom-fit').textContent=`${Math.round(zoom*100)}%`;$('zoom-fit').hidden=false;
    $('canvas-zoom').value=String(zoom);workspace.scrollLeft=0;workspace.scrollTop=0;render(controller.getState());
  }
  for(const [type,s] of Object.entries(OBJECTS)){
    const b=make('button');b.type='button';b.dataset.add=type;b.title=s.summary;b.append(make('span','palette-name',s.name),make('kbd','',s.shortcut?.toUpperCase()||''));
    b.addEventListener('click',guard(()=>{
      if(locked)return;
      const existing=controller.getState().patch.nodes;let x=60,y=70;
      for(let slot=0;slot<128;slot++){x=60+(slot%3)*196;y=70+Math.floor(slot/3)*120;if(!existing.some(n=>Math.abs(n.x-x)<176&&Math.abs(n.y-y)<112))break;}
      const id=controller.add(type,x,y);selectNode(id);
    }));$('palette').append(b);
  }
  $('object-search').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();for(const b of $('palette').children)b.hidden=!`${b.dataset.add} ${OBJECTS[b.dataset.add].name} ${OBJECTS[b.dataset.add].summary}`.toLowerCase().includes(q);});
  $('add-object').addEventListener('click',()=>entryAt());$('empty-add').addEventListener('click',()=>entryAt());
  $('lock-patch').addEventListener('click',()=>setLocked(!locked));$('show-inspector').addEventListener('click',()=>showPanel('inspector'));
  $('show-library').addEventListener('click',()=>showPanel('library'));$('show-help').addEventListener('click',()=>showPanel('help'));
  $('close-panel').addEventListener('click',()=>{panel=null;applyPanel();});$('edit-object').addEventListener('click',()=>{if(currentNode())editNode(selection.id);});
  $('delete-selection').addEventListener('click',guard(removeSelection));$('undo').addEventListener('click',guard(()=>{cancelWire();controller.undo();}));$('redo').addEventListener('click',guard(()=>{cancelWire();controller.redo();}));
  function load(patch){entry.close();closeMenus();clearSelection();pending=null;setLocked(false);controller.load(patch);}
  $('new-patch').addEventListener('click',guard(()=>load({version:1,profile:'ultra-canvas-v1',nodes:[],edges:[]})));
  $('starter-patch').addEventListener('click',guard(()=>{load(starterPatch());fitPatch();}));
  $('show-audio').addEventListener('click',()=>showPanel('audio'));
  $('start-audio').addEventListener('click',async()=>{await controller.startAudio();if(!controller.getState().status.running){panel='audio';await applyPanel();}});$('stop-audio').addEventListener('click',()=>controller.stopAudio());$('stop-graph').addEventListener('click',()=>controller.stop());$('panic').addEventListener('click',()=>controller.panic());$('reapply').addEventListener('click',()=>controller.reapply());
  $('canvas-zoom').addEventListener('change',e=>setZoom(Number(e.target.value)));$('reset-view').addEventListener('click',resetView);$('fit-patch').addEventListener('click',fitPatch);
  function endPan(){pan=null;$('workspace').classList.toggle('panning',false);}
  function releaseNavigation(){spaceHeld=false;endPan();marquee=null;$('selection-box').hidden=true;$('workspace').classList.toggle('pan-ready',false);}
  $('workspace').addEventListener('pointerdown',e=>{
    suppressPanClick=false;suppressWireClick=false;
    if(e.button!==1&&!(e.button===0&&spaceHeld))return;
    e.preventDefault();e.stopPropagation();entry.close();closeMenus();finishDrag();cancelWire();marquee=null;$('selection-box').hidden=true;
    pan={pointer:e.pointerId,x:e.clientX,y:e.clientY,startX:panX,startY:panY};suppressPanClick=true;
    $('workspace').classList.toggle('panning',true);$('workspace').setPointerCapture?.(e.pointerId);
  },true);
  for(const event of ['click','auxclick','dblclick'])$('workspace').addEventListener(event,e=>{if(suppressPanClick||(suppressWireClick&&e.detail)){e.preventDefault();e.stopPropagation();}},true);
  $('workspace').addEventListener('lostpointercapture',endPan);
  $('workspace').addEventListener('lostpointercapture',()=>{if(wireGesture){cancelWire();render(controller.getState());}});
  $('workspace').addEventListener('wheel',e=>{
    if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();
    const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?$('workspace').clientHeight:1);
    setZoom(zoom*Math.exp(-delta*.002),{x:e.clientX,y:e.clientY});
  },{passive:false});
  $('workspace').addEventListener('pointermove',e=>{
    pointerClient={x:e.clientX,y:e.clientY};
    if(pan&&pan.pointer===e.pointerId){panX=pan.startX+e.clientX-pan.x;panY=pan.startY+e.clientY-pan.y;render(controller.getState());return;}
    pointer=point(e);
    if(wireGesture&&wireGesture.pointer===e.pointerId&&Math.hypot(e.clientX-wireGesture.x,e.clientY-wireGesture.y)>4)wireGesture.moved=true;
    if(pending){wireTarget=targetAt(e);const state=controller.getState();wireFeedback(state);drawCables(state.patch);}
    if(marquee){
      const x=Math.min(marquee.x,pointer.x),y=Math.min(marquee.y,pointer.y),width=Math.abs(pointer.x-marquee.x),height=Math.abs(pointer.y-marquee.y),box=$('selection-box');
      box.hidden=false;Object.assign(box.style,{left:`${x}px`,top:`${y}px`,width:`${width}px`,height:`${height}px`});
      selected=new Set(controller.getState().patch.nodes.filter(n=>n.x>=x&&n.y>=y&&n.x<x+width&&n.y<y+height).map(n=>n.id));selection=selected.size?{kind:'node',id:[...selected][0]}:null;render(controller.getState());
    }
  });
  const background=e=>['workspace','canvas-space','canvas','objects'].some(id=>e.target===$(id));
  $('workspace').addEventListener('pointerdown',e=>{if(!background(e))return;closeMenus();entry.close();if(locked||e.button!==0)return;pointer=point(e);cancelWire();clearSelection();marquee=pointer;$('workspace').setPointerCapture?.(e.pointerId);render(controller.getState());});
  $('workspace').addEventListener('pointerup',e=>{finishWire(e);endPan();marquee=null;$('selection-box').hidden=true;});
  $('workspace').addEventListener('pointercancel',()=>{cancelWire();releaseNavigation();marquee=null;$('selection-box').hidden=true;finishDrag();render(controller.getState());});
  $('workspace').addEventListener('dblclick',e=>{if(background(e)){pointer=point(e);entryAt();}});
  $('workspace').addEventListener('contextmenu',e=>{if(!background(e))return;e.preventDefault();pointer=point(e);const menu=$('context-menu');menu.replaceChildren();menuItem('New object',()=>entryAt(),locked);menuItem(locked?'Unlock patch':'Lock patch',()=>setLocked(!locked));menuItem('Fit patch',fitPatch);positionOverlay(menu,e.clientX,e.clientY,270,150);menu.hidden=false;});
  $('workspace').addEventListener('scroll',()=>{entry.close();closeMenus();});
  $('context-menu').addEventListener('keydown',e=>{
    e.stopPropagation();
    const items=[...$('context-menu').children].filter(c=>c.tagName==='BUTTON'&&!c.disabled),i=items.indexOf(doc.activeElement);
    if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();items[(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();}
    if(e.key==='Escape'){e.preventDefault();closeMenus();$('workspace').focus();}
  });
  win.addEventListener('keyup',e=>{if(e.key===' '){spaceHeld=false;$('workspace').classList.toggle('pan-ready',false);}});
  win.addEventListener('keydown',e=>{
    if(e.target?.dataset?.direction)return;
    let target=e.target;while(target&&target!==$('workspace'))target=target.parentElement;
    if(e.key===' '&&(target||e.target===doc.body)&&!editing(e.target)&&!entry.isOpen()&&!$('patch-dialog').open){e.preventDefault();e.stopPropagation();spaceHeld=true;$('workspace').classList.toggle('pan-ready',true);}
  },true);
  win.addEventListener('keydown',guard(e=>{
    if($('patch-dialog').open)return;
    if(entry.isOpen())return;
    if(e.key==='Escape'){e.preventDefault();cancelWire();closeMenus();releaseNavigation();render(controller.getState());return controller.stop();}
    if(editing(e.target))return;
    const command=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();
    if(command&&['+','=','-','0'].includes(key)){e.preventDefault();if(key==='0')resetView();else setZoom(zoom*(key==='-'?1/1.2:1.2));return;}
    if(!command&&!e.altKey&&key==='z'){e.preventDefault();setZoom(zoom*(e.shiftKey?1/1.2:1.2),pointerClient);return;}
    if(command&&key==='e'){e.preventDefault();setLocked(!locked);return;}
    if(command&&key==='i'){e.preventDefault();showPanel('inspector');return;}
    if(command&&key==='s'){e.preventDefault();dialog('save');return;}
    if(command&&key==='o'){e.preventDefault();dialog('open');return;}
    if(command&&key==='n'){e.preventDefault();$('new-patch').click();return;}
    if(e.key==='F1'){e.preventDefault();panel='help';applyPanel();return;}
    if(locked)return;
    if(command&&key==='z'){e.preventDefault();cancelWire();return e.shiftKey?controller.redo():controller.undo();}
    if(command&&key==='a'){e.preventDefault();selected=new Set(controller.getState().patch.nodes.map(n=>n.id));selection=selected.size?{kind:'node',id:[...selected][0]}:null;render(controller.getState());return;}
    if(['Delete','Backspace'].includes(e.key)){e.preventDefault();removeSelection();return;}
    if(['Enter','F2'].includes(e.key)&&currentNode()){e.preventDefault();editNode(selection.id);return;}
    if(command||e.altKey)return;
    if(key==='n'){e.preventDefault();entryAt();}
    const type={b:'bang',m:'message',t:'toggle',i:'number'}[key];if(type){e.preventDefault();entryAt(OBJECTS[type].name+' ');}
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)&&selected.size){e.preventDefault();const step=e.shiftKey?10:1,dx=step*(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0),dy=step*(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0);controller.moveMany(controller.getState().patch.nodes.filter(n=>selected.has(n.id)).map(n=>({id:n.id,x:Math.max(0,Math.min(4000,n.x+dx)),y:Math.max(0,Math.min(4000,n.y+dy))})));}
  }));
  win.addEventListener('blur',()=>{cancelWire();releaseNavigation();finishDrag();controller.stop('Focus left the patch. Timers and notes stopped.');});
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden){cancelWire();releaseNavigation();finishDrag();controller.stop('Patch hidden. Timers and notes stopped.');}});
  win.addEventListener('pagehide',()=>{leaving=true;controller.stopAudio();});
  for(const id of ['legacy-link','lab-link'])$(id).addEventListener('click',guard(async e=>{e.preventDefault();if(leaving)return;leaving=true;if(timer!==null)win.clearTimeout(timer);try{await controller.dispose();win.location.assign(e.currentTarget?.href||$(id).href);}catch(error){leaving=false;timer=win.setTimeout(poll,100);throw error;}}));
  function dialog(mode){entry.close();closeMenus();$('dialog-title').textContent=mode==='open'?'Open patch':'Save / export patch';$('patch-json').value=mode==='open'?'':controller.export();$('dialog-status').textContent=mode==='open'?'The whole document is validated before replacing your current patch.':'Copy or download this JSON to keep the patch. Export contains authored state, not running timers.';$('patch-dialog').showModal();$('patch-json').focus();if(mode!=='open')$('patch-json').select();}
  $('export-patch').addEventListener('click',()=>dialog('save'));$('open-patch').addEventListener('click',()=>dialog('open'));
  $('import-patch').addEventListener('click',()=>{try{load(parsePatch($('patch-json').value));$('patch-dialog').close();}catch(error){$('dialog-status').textContent=error.message;controller.notice(error);}});
  $('copy-patch').addEventListener('click',async()=>{try{await win.navigator.clipboard.writeText($('patch-json').value);$('dialog-status').textContent='JSON copied.';}catch{$('patch-json').focus();$('patch-json').select();$('dialog-status').textContent='Use your system Copy command on the selected JSON.';}});
  $('download-patch').addEventListener('click',()=>{try{const blob=new Blob([$('patch-json').value],{type:'application/json'}),url=URL.createObjectURL(blob),link=make('a');link.href=url;link.download='patch.ultra.json';link.click();win.setTimeout(()=>URL.revokeObjectURL(url),1000);$('dialog-status').textContent='Download requested. Copy the JSON if this webview does not save it.';}catch(error){$('dialog-status').textContent=error.message;}});
  $('choose-file').addEventListener('click',()=>$('patch-file').click());$('patch-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>65536)throw Error('Patch exceeds 64 KiB.');const text=await file.text();parsePatch(text);$('patch-json').value=text;$('dialog-status').textContent='File validated. Choose Import JSON to replace the patch.';}catch(error){$('dialog-status').textContent=error.message;}finally{e.target.value='';}});
  initialized=true;render(controller.getState());controller.prepare();
  const poll=async()=>{if(leaving)return;await controller.poll();if(!leaving)timer=win.setTimeout(poll,100);};timer=win.setTimeout(poll,100);
  win.addEventListener('resize',()=>{closeMenus();entry.close();drawCables(controller.getState().patch);});
  return{controller,render,dispose:async()=>{leaving=true;if(timer!==null)win.clearTimeout(timer);await controller.dispose();}};
}
if(typeof document!=='undefined'&&typeof window!=='undefined')mountCanvas();
