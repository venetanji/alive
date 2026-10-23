import {createCanvasController,parsePatch,validatePatch,nodeSpec,structuralParameter} from './canvas-model.mjs';
import {arithmeticCreationParams,isArithmetic} from './canvas-arithmetic.mjs';
import {createSharedCanvasController} from './canvas-shared.mjs';
import {OBJECTS,objectText,parseObjectText,portHelp} from './canvas-catalog.mjs';
import {createObjectEntry} from './canvas-entry.mjs';
import {createNodeView,nodeConfiguration} from './canvas-node.mjs';
import {mountAudioSettings} from './audio-settings.mjs';
import {mountDocuments} from './canvas-documents-view.mjs';
import {mountAppearanceFields,createParameterField} from './canvas-inspector.mjs';
import {mountConsole} from './canvas-console-view.mjs';
import {mountMaxImportDialog} from './canvas-max-dialog.mjs';
import {MAX_IMPORT_LIMITS} from './canvas-max-import.mjs';
import {applyNodeAppearance} from './canvas-appearance-view.mjs';
import {mountHelpShell,createHelpHelperView} from './canvas-help-view.mjs';
import {cableBounds,cablePath} from './canvas-cable-path.mjs';
import {translatedMidpoints} from './canvas-cable-geometry.mjs';

export function mountCanvas({document:doc=globalThis.document,window:win=globalThis.window,invoke=win?.__TAURI__?.core?.invoke}={}) {
  const $=id=>doc.querySelector('#'+id),make=(tag,className,text)=>{const e=doc.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
  let initialized=false,selection=null,selected=new Set(),pending=null,locked=false,zoom=1,panel=null,inspectorKey='',helpKey='',drag=null,marquee=null,leaving=false,timer=null;
  let pointer={x:80,y:90},pointerClient=null,panX=0,panY=0,pan=null,spaceHeld=false,suppressPanClick=false;
  let wireGesture=null,wireTarget=null,wireKey='',suppressWireClick=false;
  const wireTargets=new Map();
  const views=new Map(),fields=new Map();
  let appearanceInspector=null,documents=null,helpView=null;
  const onState=state=>{if(initialized)render(state);};
  let activeController=createCanvasController({invoke,onState});
  // Panels and controls retain this reference when native ownership is adopted.
  const controller=new Proxy({},{get:(_,key)=>activeController[key]});
  const audioSettings=mountAudioSettings({document:doc,invoke,controller});
  const maxDialog=mountMaxImportDialog({doc,invoke});
  const consoleView=mountConsole({doc,controller,select:source=>guard(()=>revealSource(source))()});
  const guard=fn=>(...args)=>{try{return Promise.resolve(fn(...args)).catch(error=>controller.notice(error));}catch(error){controller.notice(error);}};
  helpView=mountHelpShell({doc,win,invoke,onChange:()=>{if(initialized)render(controller.getState());},beforeRead:()=>controller.flush(),
    beforeNavigate:async()=>{finishDrag();entry.close();closeMenus();cancelWire(false);for(const view of views.values())view.cancelInteraction?.();await controller.flush();},
    hostBasic:()=>controller.hostHelpBasic()});
  const editing=e=>['INPUT','TEXTAREA','SELECT'].includes(e?.tagName)||e?.isContentEditable;
  const getNode=id=>controller.getState().patch.nodes.find(n=>n.id===id);
  const currentNode=()=>selection?.kind==='node'?getNode(selection.id):null;
  function selectNode(id,extend=false) {
    if(!extend)selected=new Set([id]);else if(selected.has(id))selected.delete(id);else selected.add(id);
    selection=selected.size?{kind:'node',id:selected.has(id)?id:[...selected][0]}:null;inspectorKey='';render(controller.getState());
  }
  function clearSelection(){selection=null;selected.clear();inspectorKey='';}
  function closeMenus(){ $('context-menu').hidden=true;$('port-tooltip').hidden=true;$('file-menu').open=false;helpView?.closeMenu(); }
  function point(e){const rect=$('canvas').getBoundingClientRect();return{x:Math.max(0,Math.min(3900,(e.clientX-rect.left)/zoom)),y:Math.max(0,Math.min(3900,(e.clientY-rect.top)/zoom))};}
  function entryAt(text='',node=null) {
    if(locked){controller.notice('Unlock the patch with Ctrl E to edit objects.');return;}
    closeMenus();cancelWire();
    const rect=$('canvas').getBoundingClientRect(),p=node?{x:node.x,y:node.y}:pointer;
    const size=node?views.get(node.id)?.element.getBoundingClientRect():null;
    entry.open({text,nodeId:node?.id,x:p.x,y:p.y,clientX:rect.left+p.x*zoom,clientY:rect.top+p.y*zoom,width:size?.width??100*zoom,height:24*zoom,fontSize:(node?.style?.fontsize??12)*zoom});
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
  function editNode(id){const n=getNode(id);if(n?.type==='help_helper'){panel='inspector';return applyPanel();}if(n)entryAt(objectText(n),n);}
  function selectRevealed(id){
    if(!getNode(id))return;
    clearSelection();selectNode(id);views.get(id)?.element.scrollIntoView?.({block:'nearest',inline:'nearest'});$('workspace').focus();
  }
  async function revealSource({node:id,revision}){
    await controller.flush();
    if(controller.getState().revision!==revision)return;
    if(controller.acceptDescriptor){
      const state=controller.getState();
      function find(scope,path=[]){for(const node of scope.nodes){if(node.id===id)return path;if(node.type==='patcher'){const found=find(node.patcher,[...path,node.id]);if(found)return found;}}return null;}
      const path=find(state.document);if(!path)return;
      if(state.hostingHelp&&path.length===1&&path[0]===state.helpShell.basicNode){helpView.closeMenu();helpView.closeReference();controller.hostHelpBasic();return selectRevealed(id);}
      if(JSON.stringify(path)===JSON.stringify(state.path)){helpView.closeMenu();helpView.closeReference();return selectRevealed(id);}
      return invoke('document_open_patcher',{node:path.at(-1)??0,reveal:id,expectedRevision:revision});
    }
    helpView.closeMenu();helpView.closeReference();controller.reveal(id);selectRevealed(id);
  }
  async function acceptReveal(source){
    if(!source||!Number.isInteger(source.node)||source.node<1||!Number.isSafeInteger(source.revision)||source.revision<1)return;
    await controller.flush();
    if(source.revision>controller.getState().revision&&controller.acceptDescriptor){
      controller.acceptDescriptor(await invoke('document_current'));
    }
    if(controller.getState().revision===source.revision){helpView.closeMenu();helpView.closeReference();selectRevealed(source.node);}
  }
  async function navigatePatcher(id,depth){
    finishDrag();entry.close();closeMenus();cancelWire(false);clearSelection();
    for(const view of views.values())view.cancelInteraction?.();
    if(controller.acceptDescriptor){
      await controller.flush();
      const path=controller.getState().path;
      return invoke('document_open_patcher',{node:id??(depth?path[depth-1]:0)});
    }
    if(id!==null)controller.enter(id);else controller.leave(depth);
    resetView();$('workspace').focus();
  }
  let patcherPathKey='';
  function renderPatcherPath(state){
    const path=$('patcher-path');path.hidden=state.hostingHelp||!state.path.length&&!state.patch.nodes.some(node=>node.type==='patcher');
    const items=[{name:'Root',depth:0}];let scope=state.document;
    for(const [index,id]of state.path.entries()){const node=scope.nodes.find(node=>node.id===id);items.push({name:node.params.name,depth:index+1});scope=node.patcher;}
    const key=JSON.stringify([state.path,items]);if(key===patcherPathKey)return;patcherPathKey=key;
    path.replaceChildren(...items.map(({name,depth})=>{
      const button=make('button','',name);button.type='button';button.setAttribute('aria-label',depth?`${name} patcher`:'Root patcher');
      if(depth===state.path.length)button.setAttribute('aria-current','page');
      button.addEventListener('click',guard(()=>navigatePatcher(null,depth)));return button;
    }));
  }
  function showPanel(mode) {
    closeMenus();
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
    for(const view of views.values())view.cancelInteraction?.();
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
  $('help-basic').addEventListener('contextmenu',e=>{
    e.preventDefault();closeMenus();const shell=controller.getState().helpShell;if(!shell)return;
    $('context-menu').replaceChildren(make('div','context-heading','Basic'));
    const action=menuItem('Open Basic in New Window',()=>navigatePatcher(shell.basicNode),!controller.acceptDescriptor);
    positionOverlay($('context-menu'),e.clientX,e.clientY,270,110);$('context-menu').hidden=false;action.focus();
  });
  function contextMenu(id,e,port=null) {
    unhover();selectNode(id);const node=getNode(id),s=OBJECTS[node.type],menu=$('context-menu');menu.replaceChildren();
    if(node.type==='help_helper'){
      menu.append(make('div','context-heading',`${helpView.object} help ${node.params.role}`));
      menuItem('Inspector',()=>{panel='inspector';applyPanel();});menuItem('Reference',()=>helpView.openReference(helpView.object));
      positionOverlay(menu,e.clientX,e.clientY,270,150);menu.hidden=false;return;
    }
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
    menuItem(`Help for ${s.name}`,()=>documents.openHelp(`help:${node.type}`));
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
    const bounds=cableBounds(controller.getState().patch.edges.filter(edge=>selected.has(edge.from)&&selected.has(edge.to)));
    const minX=Math.min(bounds?.left??4000,...drag.nodes.map(n=>n.x)),minY=Math.min(bounds?.top??4000,...drag.nodes.map(n=>n.y)),maxX=Math.max(bounds?.right??0,...drag.nodes.map(n=>n.x)),maxY=Math.max(bounds?.bottom??0,...drag.nodes.map(n=>n.y));
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
    const positions=drag?.nodes.map(node=>({id:node.id,x:node.x+drag.dx,y:node.y+drag.dy}));
    patch.edges.forEach((edge,index)=>{
      if(!views.has(edge.from)||!views.has(edge.to))return;
      const source=patch.nodes.find(n=>n.id===edge.from),kind=nodeSpec(source).outlets[edge.outlet].type;
      const midpoints=positions?translatedMidpoints(edge,positions,patch.nodes):edge.midpoints;
      const d=cablePath(endpoint(edge.from,'out',edge.outlet),endpoint(edge.to,'in',edge.inlet),midpoints);
      const path=doc.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);path.setAttribute('class',`cable ${kind}${selection?.kind==='edge'&&selection.index===index?' selected':''}`);path.dataset.edge=String(index);
      path.setAttribute('aria-label',`Cable ${edge.from}:${edge.outlet} to ${edge.to}:${edge.inlet}`);
      const choose=e=>{if(locked)return;e.stopPropagation();selected.clear();selection={kind:'edge',index};inspectorKey='';render(controller.getState());};
      path.addEventListener('click',choose);
      const context=e=>{e.preventDefault();choose(e);const menu=$('context-menu');menu.replaceChildren(make('div','context-heading','Patch cord'),make('p','',`${kind}: ${edge.from}:${edge.outlet} to ${edge.to}:${edge.inlet}`));menuItem('Disconnect cable',removeSelection,locked);positionOverlay(menu,e.clientX,e.clientY,270,150);menu.hidden=false;};
      path.addEventListener('contextmenu',context);
      const hit=doc.createElementNS('http://www.w3.org/2000/svg','path');hit.setAttribute('d',d);hit.setAttribute('class','cable-hit');hit.addEventListener('click',choose);
      hit.addEventListener('contextmenu',context);
      svg.append(hit,path);
    });
    if(pending&&views.has(pending.id)){
      const target=wireTarget&&wireTargets.get(portKey(wireTarget)),end=target&&!target.error?endpoint(wireTarget.id,wireTarget.direction,wireTarget.index):pointer,start=endpoint(pending.id,pending.direction,pending.index);
      const path=doc.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('class','cable pending-cable');path.setAttribute('d',pending.direction==='out'?cablePath(start,end):cablePath(end,start));svg.append(path);
    }
  }
  function renderInspector(state) {
    const n=currentNode(),key=selection?.kind==='edge'?`edge/${selection.index}`:n?`${n.id}/${n.type}/${n.params.numericmode??''}/${selected.size}`:'none';
    if(key!==inspectorKey){
      inspectorKey=key;fields.clear();appearanceInspector=null;const area=$('inspector');area.replaceChildren();
      if(n){
        const helper=n.type==='help_helper',spec=helper?{name:'Help annotation',summary:`${n.params.role} layout for ${helpView.object}.`,params:{}}:OBJECTS[n.type];
        area.append(make('h2','',spec.name),make('p','',selected.size>1?`${selected.size} selected. Drag or delete the group.`:spec.summary));
        for(const [key,p] of Object.entries(spec.params)){
          const {label,input}=createParameterField({doc,node:n,key,definition:p,change:value=>parameter(n.id,key,value)});
          fields.set(key,input);area.append(label);
        }
        area.append(make('p','panel-note',helper?'This annotation is part of the help layout. Reference text comes from the local Max installation.':n.type==='message_box'?'Text edits replace this message silently. Incoming messages change the live display; saved text stays here.':isArithmetic(n.type)?'Numeric mode is structural: unlock to change it and reset this runtime. The stored right operand updates live.':'Parameters update live. Object text and connection edits stop timers and clear notes.'));
        appearanceInspector=mountAppearanceFields({doc,area,node:n,change:guard((key,value)=>controller.style(n.id,key,value)),reset:guard(()=>controller.style(n.id,null))});
        const b=make('button','panel-action',helper?'Reference':`Help for ${spec.name}`);b.addEventListener('click',guard(()=>helper?helpView.openReference(helpView.object):documents.openHelp(`help:${n.type}`)));area.append(b);
      } else if(selection?.kind==='edge') {
        const edge=state.patch.edges[selection.index];if(edge)area.append(make('h2','','Patch cord'),make('p','',`Object ${edge.from} outlet ${edge.outlet} to object ${edge.to} inlet ${edge.inlet}. Fan-out follows saved cable order.`));
      } else area.append(make('p','','Select an object to inspect its parameters. Right-click a port for accepted messages or emitted data.'));
    }
    if(n)for(const [key,input] of fields){input.disabled=locked&&structuralParameter(n.type,key);if(doc.activeElement!==input)input.value=String(n.params[key]);}
    if(n)appearanceInspector?.update(n,locked);
    $('edit-object').disabled=!n||locked||n.type==='help_helper';$('delete-selection').disabled=!selection||locked;
    const observation=n?state.observations[n.id]:null;
    $('observation-state').textContent=observation?`Node observation: ${JSON.stringify(observation.value)}. Total pulses: ${observation.pulses}. This is not a complete outlet trace.`:'No native node observation.';
  }
  const helpIdentity=node=>JSON.stringify([node?.id,node?.type,node?.params.args,node?.params.name,node?.params.channels,node?.params.numericmode,locked]);
  function renderHelp(node) {
    helpKey=helpIdentity(node);
    const area=$('help-content');area.replaceChildren();
    if(node?.type==='help_helper'){
      area.append(make('h2','',`${helpView.object} help`),make('p','','Help annotations display local reference text at the saved patch positions.'));
      const b=make('button','panel-action','Reference');b.addEventListener('click',()=>helpView.openReference(helpView.object));area.append(b);return;
    }
    if(!node){
      area.append(make('h2','','Patching in Ultra'),make('p','','Create objects by typing their name and arguments. Connect bottom outlets to top inlets. Lock the patch to use its controls.'));
      for(const [key,label] of [['Drag between ports','Connect an outlet to an inlet in either direction'],['Enter / Space on a port','Start or finish a connection'],['N','New object at pointer'],['B / M / T','Bang / message / toggle entry'],['I / F / S','Create number / float / vertical slider'],['Ctrl E','Lock or unlock'],['Ctrl I','Inspector'],['Enter / F2','Edit selected object'],['Ctrl Z / Ctrl Shift Z','Undo / redo'],['Ctrl A','Select all objects'],['Delete','Remove selection'],['Escape','Cancel editing or stop this patch'],['Wheel / two-finger scroll','Scroll canvas'],['Shift + wheel','Scroll horizontally'],['Space + drag / middle drag','Pan canvas'],['Z / Shift Z','Zoom in / out at pointer'],['Ctrl +/- / Ctrl 0','Zoom / reset view'],['Ctrl + wheel / pinch','Zoom at pointer'],['Ctrl N / Ctrl O','New window / open file'],['Ctrl S / Ctrl Shift S','Save / Save As'],['F1 / Alt-click object','Open object help in a new window']]){
        const row=make('div','shortcut-row');row.append(make('span','',label),make('kbd','',key));area.append(row);
      }
      const library=make('button','panel-action','Browse Help & Examples');library.addEventListener('click',guard(()=>documents.openLibrary()));area.append(library);
      area.append(make('p','panel-note',`The canvas implements Ultra's ${Object.keys(OBJECTS).length}-object profile. Open a .maxpat or .maxhelp file to inspect its tabs and import a compatible graph. Partial selections require explicit acceptance of the compatibility report. Windows share the audio engine and keep running when focus changes.`));
      return;
    }
    const s={...OBJECTS[node.type],...nodeSpec(node)};area.append(make('h2','',s.name),make('p','',s.summary),make('code','help-example',s.example));
    const add=make('button','panel-action','Create this example object');add.disabled=locked;add.addEventListener('click',()=>entryAt(s.example));area.append(add);
    const run=make('button','panel-action','Open runnable example patch');run.addEventListener('click',guard(()=>documents.openHelp(`example:${node.type}`)));area.append(run);
    for(const direction of ['in','out']){
      const ports=direction==='in'?s.inlets:s.outlets;if(!ports.length)continue;
      const section=make('section','help-section');section.append(make('h3','',direction==='in'?'Inlets / accepted messages':'Outlets / emitted data'));
      ports.forEach((p,i)=>{const h=portHelp(node,direction,i),row=make('div','help-port');row.append(make('strong','',`${i}: ${h.title} (${h.type})`),make('p','',`${h.direction} ${h.messages.join(', ')}. ${h.detail}`));section.append(row);});area.append(section);
    }
    area.append(make('p','panel-note',s.help),make('p','panel-note','Original Ultra help. Similar names do not imply Max semantics. Native observations summarize a node; they are not a scope or message history.'));
  }
  function render(state) {
    documents?.update();
    helpView.update(state);
    renderPatcherPath(state);
    consoleView.render(state);
    audioSettings.update(state);
    $('audio-format').textContent=state.status.running&&state.status.period?`48 kHz / ${state.status.period} frames`:'48 kHz / stereo';
    $('preview-banner').hidden=state.native;$('runtime-label').textContent=state.native?'Native editor':'Browser preview';
    $('legacy-link').hidden=state.native;$('lab-link').hidden=state.native;
    $('engine-state').textContent=!state.native?'Preview':state.faulted?'Fault - restart':state.status.running?'Audio on':'Audio off';$('engine-state').classList.toggle('running',!!state.status.running&&!state.faulted);
    $('start-audio').disabled=!state.native||state.busy||!!state.status.running;
    $('stop-audio').disabled=!state.native||state.busy;$('stop-graph').disabled=!state.native;$('panic').disabled=!state.native;
    $('undo').disabled=locked||state.closing||!state.canUndo;$('redo').disabled=locked||state.closing||!state.canRedo;$('add-object').disabled=locked||state.closing;
    for(const id of ['workspace','inspector','palette','object-entry','context-menu','patch-dialog'])$(id).inert=!!state.closing;
    $('notice').textContent=state.notice;$('notice').title=state.notice;$('notice').setAttribute('aria-label',state.notice);$('patch-summary').textContent=`${state.patch.nodes.length} objects / ${state.patch.edges.length} cables`;
    $('revision-state').textContent=state.native?`Document ${state.desiredRevision}; active ${state.activeDocumentRevision}; native r${state.revision??'-'}.`:'Preview - not executing.';
    $('reapply').disabled=!state.native||state.applying||state.busy;
    $('selection-hint').textContent=locked?'Locked':selected.size?`${selected.size} selected`:'Editing';
    $('empty-patch').hidden=state.patch.nodes.length>0;
    if(pending){const node=state.patch.nodes.find(n=>n.id===pending.id);if(!node||!nodeSpec(node)[pending.direction==='in'?'inlets':'outlets'][pending.index])cancelWire(false);}
    const ids=new Set(state.patch.nodes.map(n=>n.id));for(const id of views.keys())if(!ids.has(id)){views.get(id).dispose?.();views.delete(id);selected.delete(id);}
    if(selection?.kind==='node'&&!ids.has(selection.id))selection=null;
    const children=[];
    for(const node of state.patch.nodes){
      const configuration=node.type==='help_helper'?JSON.stringify(node.params):nodeConfiguration(node);
      if(!views.has(node.id)||views.get(node.id).type!==node.type||views.get(node.id).configuration!==configuration){
        views.get(node.id)?.dispose?.();
        const v=node.type==='help_helper'?createHelpHelperView(node,{doc,select:selectNode,dragStart}):createNodeView(node,{doc,select:selectNode,dragStart,edit:id=>{if(getNode(id)?.type==='patcher')guard(()=>navigatePatcher(id))();else if(locked&&getNode(id)?.type==='print')consoleView.open();else editNode(id);},portClick,portDown,hover:hoverPort,unhover,context:contextMenu,operate,parameter,resize:guard((id,size)=>controller.resize(id,size)),getZoom:()=>zoom,resized:()=>drawCables(controller.getState().patch),tab:id=>guard(()=>controller.tab(id))()});
        for(const target of [v.element,v.header]){target.addEventListener('pointermove',dragMove);target.addEventListener('pointerup',finishDrag);target.addEventListener('pointercancel',finishDrag);target.addEventListener('lostpointercapture',finishDrag);}views.set(node.id,v);
      }
      const view=views.get(node.id);view.update(node,state,{selected:selected.has(node.id),locked,pending,moving:!!drag&&selected.has(node.id),reference:helpView.reference,object:helpView.object});applyNodeAppearance(view,node,doc);children.push(view.element);
    }
    const container=$('objects');if(container.children.length!==children.length||children.some((e,i)=>container.children[i]!==e))container.replaceChildren(...children);
    const bounds=cableBounds(state.patch.edges);
    const width=Math.max(760,(bounds?.right??0)+35,...state.patch.nodes.map(n=>n.x+Math.max(350,n.style?.width??0))),height=Math.max(740,(bounds?.bottom??0)+35,...state.patch.nodes.map(n=>n.y+Math.max(160,n.style?.height??0)));
    $('canvas').style.width=`${width}px`;$('canvas').style.height=`${height}px`;$('canvas').style.transform=`translate(${panX}px, ${panY}px) scale(${zoom})`;
    $('canvas-space').style.width=`${Math.max(width*zoom,$('workspace').clientWidth||0)}px`;$('canvas-space').style.height=`${Math.max(height*zoom,$('workspace').clientHeight||0)}px`;
    wireFeedback(state);renderInspector(state);drawCables(state.patch);
    if(panel==='help'&&helpKey!==helpIdentity(currentNode()))renderHelp(currentNode());
  }
  function zoomLabel() {
    $('zoom-fit').value=String(zoom);$('zoom-fit').textContent=`${Math.round(zoom*100)}%`;$('zoom-fit').hidden=false;
    $('canvas-zoom').value=String(zoom);
  }
  function cameraBusy(){return drag||marquee||pan||wireGesture||[...views.values()].some(view=>view.resizePreview);}
  function setZoom(value,anchor=null) {
    if(cameraBusy()){zoomLabel();return;}
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
  function resetView(){if(cameraBusy())return;zoom=1;panX=panY=0;$('workspace').scrollLeft=0;$('workspace').scrollTop=0;zoomLabel();render(controller.getState());}
  function fitPatch() {
    if(cameraBusy())return;
    const patch=controller.getState().patch;if(!patch.nodes.length){resetView();return;}panX=panY=0;
    const bounds=cableBounds(patch.edges);
    const left=Math.min(bounds?.left??4000,...patch.nodes.map(n=>n.x)),top=Math.min(bounds?.top??4000,...patch.nodes.map(n=>n.y));
    const width=Math.max(bounds?.right??0,...patch.nodes.map(n=>n.x+(views.get(n.id)?.element.offsetWidth||n.style?.width||(n.type==='gain'?30:190))))-left+70;
    const height=Math.max(bounds?.bottom??0,...patch.nodes.map(n=>n.y+(views.get(n.id)?.element.offsetHeight||n.style?.height||(n.type==='gain'?100:24))))-top+70;
    const workspace=$('workspace');zoom=Math.max(.25,Math.min(1.5,(workspace.clientWidth||1000)/width,(workspace.clientHeight||730)/height));
    panX=35-left*zoom;panY=35-top*zoom;
    $('zoom-fit').value=String(zoom);$('zoom-fit').textContent=`${Math.round(zoom*100)}%`;$('zoom-fit').hidden=false;
    $('canvas-zoom').value=String(zoom);workspace.scrollLeft=0;workspace.scrollTop=0;render(controller.getState());
  }
  for(const [type,s] of Object.entries(OBJECTS)){
    const b=make('button');b.type='button';b.dataset.add=type;b.title=s.summary;b.append(make('span','palette-name',s.name),make('kbd','',s.shortcut?.toUpperCase()||''));
    b.addEventListener('click',guard(()=>{
      if(locked)return;
      const existing=controller.getState().patch.nodes;let x=60,y=70;
      for(let slot=0;slot<128;slot++){x=60+(slot%3)*196;y=70+Math.floor(slot/3)*120;if(!existing.some(n=>Math.abs(n.x-x)<176&&Math.abs(n.y-y)<112))break;}
      const id=controller.add(type,x,y,arithmeticCreationParams(type));selectNode(id);
    }));$('palette').append(b);
  }
  $('object-search').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();for(const b of $('palette').children)b.hidden=!`${b.dataset.add} ${OBJECTS[b.dataset.add].name} ${OBJECTS[b.dataset.add].summary}`.toLowerCase().includes(q);});
  $('add-object').addEventListener('click',()=>entryAt());$('empty-add').addEventListener('click',()=>entryAt());
  $('lock-patch').addEventListener('click',()=>setLocked(!locked));$('show-inspector').addEventListener('click',()=>showPanel('inspector'));
  $('show-library').addEventListener('click',()=>showPanel('library'));$('show-help').addEventListener('click',()=>showPanel('help'));
  $('close-panel').addEventListener('click',()=>{panel=null;applyPanel();});$('edit-object').addEventListener('click',()=>{if(currentNode())editNode(selection.id);});
  $('delete-selection').addEventListener('click',guard(removeSelection));$('undo').addEventListener('click',guard(()=>{cancelWire();controller.undo();}));$('redo').addEventListener('click',guard(()=>{cancelWire();controller.redo();}));
  function load(patch){entry.close();closeMenus();clearSelection();pending=null;setLocked(false);controller.load(patch);}
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
    if($('patch-dialog').open||documents?.isOpen())return;
    if(e.key==='Escape'&&helpView.dismiss()){e.preventDefault();e.stopPropagation();return;}
    if(e.target?.closest?.('#help-reference-pane, #help-reference-menu'))return;
    if(entry.isOpen()){if(e.key==='Escape'){e.preventDefault();entry.close();}return;}
    if(e.key==='Escape'){e.preventDefault();for(const view of views.values())view.cancelInteraction?.();cancelWire();closeMenus();releaseNavigation();render(controller.getState());return controller.stop();}
    const command=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();
    if(command&&key==='s'){e.preventDefault();return documents.action(e.shiftKey?'save-as':'save');}
    if(command&&key==='o'){e.preventDefault();return documents.action('open');}
    if(command&&key==='n'){e.preventDefault();return documents.action('new');}
    if(command&&key==='m'){e.preventDefault();consoleView.toggle();return;}
    if(command&&key==='e'){e.preventDefault();setLocked(!locked);return;}
    if(e.target?.closest?.('#patch-console'))return;
    if(editing(e.target))return;
    if(command&&['+','=','-','0'].includes(key)){e.preventDefault();if(key==='0')resetView();else setZoom(zoom*(key==='-'?1/1.2:1.2));return;}
    if(!command&&!e.altKey&&key==='z'){e.preventDefault();setZoom(zoom*(e.shiftKey?1/1.2:1.2),pointerClient);return;}
    if(command&&key==='i'){e.preventDefault();showPanel('inspector');return;}
    if(e.key==='F1'){e.preventDefault();return currentNode()?.type==='help_helper'?helpView.openReference(helpView.object):currentNode()?documents.openHelp(`help:${currentNode().type}`):documents.openLibrary();}
    if(locked)return;
    if(command&&key==='z'){e.preventDefault();cancelWire();return e.shiftKey?controller.redo():controller.undo();}
    if(command&&key==='a'){e.preventDefault();selected=new Set(controller.getState().patch.nodes.map(n=>n.id));selection=selected.size?{kind:'node',id:[...selected][0]}:null;render(controller.getState());return;}
    if(['Delete','Backspace'].includes(e.key)){e.preventDefault();removeSelection();return;}
    const canvasEditTarget=e.target===$('workspace')||e.target?.closest?.('#workspace');
    if(['Enter','F2'].includes(e.key)&&currentNode()&&canvasEditTarget&&!e.target?.closest?.('button,a,summary,[role="button"],[role="menuitem"]')){e.preventDefault();editNode(selection.id);return;}
    if(command||e.altKey)return;
    if(key==='n'){e.preventDefault();entryAt();}
    const quickType={i:'number_int',f:'flonum',s:'slider'}[key];
    if(quickType){
      e.preventDefault();if(e.repeat)return;closeMenus();cancelWire();
      const id=controller.add(quickType,pointer.x,pointer.y,{},quickType==='slider'?{width:20,height:140}:undefined);selectNode(id);return;
    }
    const type={b:'bang',m:'message_box',t:'toggle'}[key];if(type){e.preventDefault();entryAt(OBJECTS[type].name+' ');}
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)&&selected.size){e.preventDefault();const step=e.shiftKey?10:1,dx=step*(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0),dy=step*(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0);controller.moveMany(controller.getState().patch.nodes.filter(n=>selected.has(n.id)).map(n=>({id:n.id,x:Math.max(0,Math.min(4000,n.x+dx)),y:Math.max(0,Math.min(4000,n.y+dy))})));}
  }));
  win.addEventListener('blur',()=>{for(const view of views.values())view.cancelInteraction?.();cancelWire();releaseNavigation();finishDrag();});
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden){for(const view of views.values())view.cancelInteraction?.();cancelWire();releaseNavigation();finishDrag();}});
  win.addEventListener('pagehide',()=>{
    leaving=true;documents?.dispose();
    // Native close may already have removed this document's graph.
    controller.disposeDocument?.().catch(()=>{});
  });
  for(const id of ['legacy-link','lab-link'])$(id).addEventListener('click',guard(async e=>{e.preventDefault();if(leaving)return;leaving=true;if(timer!==null)win.clearTimeout(timer);try{await controller.dispose();win.location.assign(e.currentTarget?.href||$(id).href);}catch(error){leaving=false;timer=win.setTimeout(poll,100);throw error;}}));
  function dialog(mode){entry.close();closeMenus();maxDialog.reset(mode==='open');$('dialog-title').textContent=mode==='open'?'Open patch':'Save / export patch';$('patch-json').value=mode==='open'?'':controller.export();$('dialog-status').textContent=mode==='open'?'The whole document is validated before replacing your current patch. Max files show a compatibility report first.':'Copy or download this JSON to keep the patch. Export contains authored state, not running timers.';$('patch-dialog').showModal();$('patch-json').focus();if(mode!=='open')$('patch-json').select();}
  $('export-patch').addEventListener('click',()=>dialog('save'));$('open-patch').addEventListener('click',()=>dialog('open'));
  $('import-patch').addEventListener('click',async()=>{try{
    if(maxDialog.hasSelection()){
      const result=maxDialog.importSelected();load(result.patch);fitPatch();$('patch-dialog').close();
      controller.notice(`${result.partial?'Partial Max import':'Max patcher imported'}: ${result.selection.name}. ${result.stats.importedBoxes} objects and ${result.stats.importedEdges} cables. Lock the patch to operate controls; timers and audio remain stopped.`);
    }else{
      const text=$('patch-json').value;if(new TextEncoder().encode(text).length>MAX_IMPORT_LIMITS.bytes)throw Error('Input exceeds the 8 MiB analysis limit.');
      let input;try{input=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw Error('Patch is not valid JSON.');}
      if(input&&typeof input==='object'&&Object.hasOwn(input,'patcher')){await maxDialog.inspect(text);return;}
      load(parsePatch(text));$('patch-dialog').close();
    }
  }catch(error){$('dialog-status').textContent=error.message;controller.notice(error);}});
  $('copy-patch').addEventListener('click',async()=>{try{await win.navigator.clipboard.writeText($('patch-json').value);$('dialog-status').textContent='JSON copied.';}catch{$('patch-json').focus();$('patch-json').select();$('dialog-status').textContent='Use your system Copy command on the selected JSON.';}});
  $('download-patch').addEventListener('click',()=>{try{const blob=new Blob([$('patch-json').value],{type:'application/json'}),url=URL.createObjectURL(blob),link=make('a');link.href=url;link.download='patch.ultra.json';link.click();win.setTimeout(()=>URL.revokeObjectURL(url),1000);$('dialog-status').textContent='Download requested. Copy the JSON if this webview does not save it.';}catch(error){$('dialog-status').textContent=error.message;}});
  $('choose-file').addEventListener('click',()=>$('patch-file').click());$('patch-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{
    await maxDialog.inspectFile(file);
  }catch(error){$('dialog-status').textContent=error.message;}finally{e.target.value='';}});
  function adoptDocument(patch,descriptor){
    if(!descriptor?.shared)return load(patch);
    if(!controller.adoptDescriptor){
      activeController=createSharedCanvasController({invoke,onState});
    }
    controller.adoptDescriptor(descriptor);
  }
  documents=mountDocuments({doc,win,invoke,getPatch:()=>controller.getState().document,adopt:adoptDocument,beforeSave:()=>controller.flush(),
    beforeClose:request=>controller.flushBeforeClose?.(request)??controller.flush(),onCloseCancelled:request=>controller.cancelClose?.(request),
    onDescriptor:descriptor=>controller.acceptDescriptor?.(descriptor),onReveal:acceptReveal,
    notice:error=>controller.notice(error),inspect:(source,name)=>{dialog('open');$('patch-json').value=source;return maxDialog.inspect(source,name);}});
  $('object-profile-note').textContent=`${Object.keys(OBJECTS).length} supported objects. Names and arguments belong to Ultra's bounded profile.`;
  $('workspace').addEventListener('click',guard(e=>{if(!e.altKey)return;const node=e.target?.closest?.('[data-node]');if(node){e.preventDefault();e.stopPropagation();const type=getNode(Number(node.dataset.node)).type;return type==='help_helper'?helpView.openReference(helpView.object):documents.openHelp(`help:${type}`);}}),true);
  initialized=true;render(controller.getState());
  const poll=async()=>{if(leaving)return;await controller.poll();if(!leaving)timer=win.setTimeout(poll,100);};
  const ready=documents.ready().then(adopted=>{
    if(!adopted)controller.prepare();
    const descriptor=documents.session.document;
    if(descriptor.revealNode&&descriptor.revealRevision===controller.getState().revision)selectRevealed(descriptor.revealNode);
    if(descriptor.helpKey){const type=descriptor.helpKey.split(':')[1],node=controller.getState().patch.nodes.find(node=>node.type===type);if(node)selectNode(node.id);panel='help';applyPanel();fitPatch();}
    if(!leaving)timer=win.setTimeout(poll,100);
  }).catch(error=>{controller.notice(error);controller.prepare();if(!leaving)timer=win.setTimeout(poll,100);});
  win.addEventListener('resize',()=>{closeMenus();entry.close();drawCables(controller.getState().patch);});
  return{controller,render,ready,documents,dispose:async()=>{leaving=true;helpView.dispose();documents.dispose();if(timer!==null)win.clearTimeout(timer);for(const view of views.values())view.dispose?.();await controller.dispose();}};
}
if(typeof document!=='undefined'&&typeof window!=='undefined')mountCanvas();
