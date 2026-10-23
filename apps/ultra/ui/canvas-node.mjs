import {OBJECTS, objectText, portHelp} from './canvas-catalog.mjs';
import {nodeSpec} from './canvas-model.mjs';
import {printPopupText} from './canvas-print-ui.mjs';

export function createNodeView(node,{doc,select,dragStart,edit,portClick,portDown,hover,unhover,context,operate,parameter,tab,resize,resized,getZoom=()=>1}) {
  const s={...OBJECTS[node.type],...nodeSpec(node)},make=(tag,className,text)=>{const e=doc.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
  const message=['message','message_box'].includes(node.type);
  const portCount=Math.max(s.inlets.length,s.outlets.length),minimumWidth=node.type==='gain'?30:portCount>1?portCount*18:12;
  const element=make('article',`node ui-${s.ui}`);element.dataset.node=String(node.id);element.setAttribute('aria-label',`${s.name} object ${node.id}`);
  const header=make('header',s.ui==='comment'?'comment-label':s.ui==='object'?'object-label':'ui-handle');header.dataset.drag='true';header.tabIndex=0;header.setAttribute('aria-label',`Select or drag ${s.name} object ${node.id}`);
  const name=make('span','class-name',s.name),args=make('span','arguments');if(s.ui==='object')header.append(name,args);
  header.addEventListener('click',e=>{if(!e.detail)select(node.id,e.shiftKey);});
  header.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();if(e.key==='Enter'&&node.type==='patcher')edit(node.id);else select(node.id,e.shiftKey);}});
  header.addEventListener('pointerdown',e=>dragStart(node.id,e));
  element.addEventListener('pointerdown',e=>{if(e.target===element)dragStart(node.id,e);});
  element.addEventListener('dblclick',e=>{if(e.target?.dataset?.direction||e.target.closest?.('.node-resize'))return;e.stopPropagation();if(control&&(isLocked||e.ctrlKey||e.metaKey))return;edit(node.id);});
  element.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();context(node.id,e);});
  element.append(header);
  const portElements={in:[],out:[]};
  for(const [direction,descriptors] of [['in',s.inlets],['out',s.outlets]]) {
    const row=make('div',`ports ${direction==='in'?'inlets':'outlets'}`);
    descriptors.forEach((p,i)=>{
      const info=portHelp(node,direction,i),b=make('button',`port ${p.type}${p.type==='control'&&info.detail.startsWith('Hot.')?' hot':''}`);
      b.type='button';Object.assign(b.dataset,{direction,port:String(i),side:p.side,portType:p.type});
      b.setAttribute('aria-label',`${s.name} ${node.id}, ${direction==='in'?'Inlet':'Outlet'} ${i}: ${info.title} (${p.type})`);
      b.addEventListener('click',e=>{e.stopPropagation();portClick(node.id,direction,i,e);});
      b.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();portClick(node.id,direction,i);}});
      b.addEventListener('pointerdown',e=>{e.stopPropagation();portDown(node.id,direction,i,e);});
      b.addEventListener('pointerenter',()=>hover(node.id,direction,i,b));b.addEventListener('focus',()=>hover(node.id,direction,i,b));
      b.addEventListener('pointerleave',unhover);b.addEventListener('blur',unhover);
      b.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();context(node.id,e,{direction,index:i});});
      row.append(b);portElements[direction].push(b);
    });element.append(row);
  }
  const body=make('div','node-body'),inputs=new Map();let trigger=null,level=null,messageDescription=null,printPopup=null,printValue=null;
  if(node.type==='print'){
    printPopup=make('div','print-popup');printPopup.hidden=true;
    printPopup.setAttribute('role','status');printPopup.setAttribute('aria-label',`Print output, object ${node.id}`);
    printValue=make('span','print-popup-value');printValue.id=`print-popup-value-${node.id}`;
    printPopup.setAttribute('aria-describedby',printValue.id);
    const dot=make('span','print-popup-dot');dot.setAttribute('aria-hidden','true');
    printPopup.append(dot,printValue);body.append(printPopup);
  }
  const control=['bang','toggle','message','message_box','number','number_int','flonum','gain','slider'].includes(node.type);
  let currentNode=node,authoringPending=false,isLocked=false,gesture=null,sizing=null,resizeHandle=null,suppressClick=false,dirty=false,keyContinuous=false,temporaryEditing=false,displayedValue=node.params.value;
  const canOperate=e=>isLocked||e.ctrlKey||e.metaKey;
  const ranged=['gain','slider'].includes(node.type);
  const valueInput=()=>inputs.get('value');
  function bounds(){
    const input=valueInput();return{min:Number(input.min),max:Number(input.max)};
  }
  function setValue(value,history=true){
    const input=valueInput(),{min,max}=bounds();if(!Number.isFinite(value))return false;
    value=Math.max(min,Math.min(max,value));
    if(input.step==='1')value=node.type==='number_int'?Math.trunc(value):Math.round(value);
    value=Number(value.toFixed(9));
    const unchanged=value===displayedValue;
    if(unchanged&&(!dirty||(!authoringPending&&value===currentNode.params.value))){input.value=String(value);dirty=false;return false;}
    // Publish the draft before admission can synchronously render its thumb.
    // Keep it retryable through admission failures and their renders.
    dirty=true;input.value=String(value);
    if(parameter(node.id,'value',value,{history})===false)return false;
    input.value=String(value);displayedValue=value;dirty=false;return true;
  }
  function finishControl(){
    const previous=gesture;gesture=null;keyContinuous=false;temporaryEditing=false;
    element.classList.remove('operating');
    if(previous&&element.hasPointerCapture?.(previous.pointer))element.releasePointerCapture(previous.pointer);
    if(!isLocked&&valueInput())valueInput().readOnly=true;
  }
  function controlGeometry(width,height){
    element.style.setProperty('--control-size',`${Math.min(width,height)}px`);
    if(!ranged)return;
    const orientation=currentNode.style?.orientation,vertical=orientation===2||(orientation!==1&&height>width);
    element.classList.toggle('vertical-control',vertical);valueInput()?.setAttribute('aria-orientation',vertical?'vertical':'horizontal');
  }
  function previewSize(width,height){
    sizing.width=Math.round(Math.max(minimumWidth,Math.min(1200,width)));sizing.height=Math.round(Math.max(12,Math.min(800,height)));
    element.style.width=`${sizing.width}px`;element.style.height=`${sizing.height}px`;element.style.minWidth='12px';
    controlGeometry(sizing.width,sizing.height);resized?.();
  }
  function finishResize(commit=false){
    if(!sizing)return;
    const previous=sizing;sizing=null;element.classList.remove('resizing');
    if(resizeHandle.hasPointerCapture?.(previous.pointer))resizeHandle.releasePointerCapture(previous.pointer);
    element.style.width=previous.inlineWidth;element.style.height=previous.inlineHeight;element.style.minWidth=previous.minWidth;
    controlGeometry(previous.startWidth,previous.startHeight);
    if(commit&&(previous.width!==previous.startWidth||previous.height!==previous.startHeight))resize?.(node.id,{width:previous.width,height:previous.height});
    resized?.();
  }
  function cancelInteraction(){finishControl();finishResize();}
  function rangePosition(e){
    const rect=element.getBoundingClientRect(),orientation=currentNode.style?.orientation;
    const vertical=orientation===2||(orientation!==1&&rect.height>rect.width);
    const ratio=vertical?1-(e.clientY-rect.top)/rect.height:(e.clientX-rect.left)/rect.width;
    const {min,max}=bounds();return min+Math.max(0,Math.min(1,ratio))*(max-min);
  }
  element.addEventListener('pointerdown',e=>{
    if(!control||e.button!==0||e.target.closest('.port')||e.target.closest('.node-resize'))return;
    if(!canOperate(e)){e.preventDefault();e.stopPropagation();dragStart(node.id,e);return;}
    e.preventDefault();e.stopPropagation();
    if(trigger){suppressClick=true;operate(node.id,e);return;}
    const input=valueInput();input.readOnly=false;input.focus({preventScroll:true});
    gesture={pointer:e.pointerId,x:e.clientX,y:e.clientY,value:dirty?Number(input.value):displayedValue,changed:false,moved:false};
    element.classList.add('operating');element.setPointerCapture?.(e.pointerId);
    if(ranged)gesture.changed=setValue(rangePosition(e));
  },true);
  element.addEventListener('pointermove',e=>{
    if(!gesture||gesture.pointer!==e.pointerId)return;
    e.preventDefault();e.stopPropagation();
    if(Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<2&&!gesture.moved)return;
    gesture.moved=true;
    const value=ranged?rangePosition(e):gesture.value+(gesture.y-e.clientY)*(node.type==='flonum'?.01:1)*(e.shiftKey?.1:1);
    gesture.changed=setValue(value,!gesture.changed)||gesture.changed;
  });
  element.addEventListener('pointerup',e=>{
    if(!gesture||gesture.pointer!==e.pointerId)return;
    const selectText=!ranged&&!gesture.moved;finishControl();
    if(selectText){temporaryEditing=!isLocked;valueInput().readOnly=false;valueInput().setAttribute('aria-disabled','false');valueInput().select();}
  });
  element.addEventListener('pointercancel',finishControl);
  element.addEventListener('lostpointercapture',()=>{if(gesture)finishControl();});
  element.addEventListener('keydown',e=>{if(e.key==='Escape')cancelInteraction();});
  element.addEventListener('focusout',()=>finishControl());
  const windowBlur=()=>cancelInteraction();
  doc.defaultView?.addEventListener('blur',windowBlur);
  if(['bang','toggle'].includes(node.type)||message) {
    trigger=make('button',`trigger ${message?'message':node.type}-trigger`,message?node.params.text:'');
    trigger.type='button';trigger.dataset.trigger=node.type;trigger.setAttribute('aria-label',`Trigger ${s.name} object ${node.id}`);
    if(message){
      // This WebKit exposes described-by text, but does not support aria-description.
      messageDescription=make('span');messageDescription.id=`message-description-${node.id}`;messageDescription.hidden=true;
      trigger.setAttribute('aria-describedby',messageDescription.id);body.append(messageDescription);
    }
    trigger.addEventListener('click',e=>{if(suppressClick&&e.detail){suppressClick=false;return;}operate(node.id,e);});
    body.append(trigger);
  } else if(['number','number_int','gain','flonum','slider'].includes(node.type)) {
    const input=make('input',node.type==='gain'?'gain-input':node.type==='slider'?'slider-input':'number-input');input.type=ranged?'range':'number';
    const p=s.params.value;input.min=p.min;input.max=p.max;input.step=p.integer?'1':'any';input.value=node.params.value;input.dataset.parameter='value';
    input.setAttribute('aria-label',`${s.name} value, object ${node.id}`);
    input.addEventListener('input',()=>{if(!ranged){dirty=true;return;}if(isLocked)setValue(Number(input.value),!keyContinuous);});
    input.addEventListener('change',()=>{if(canOperate({})||!input.readOnly)setValue(Number(input.value));});
    input.addEventListener('keydown',e=>{
      if(!canOperate(e)&&input.readOnly){if(e.key!=='Tab')e.preventDefault();return;}
      if(e.key==='Tab'||e.key==='Enter'){
        if(dirty)setValue(input.value===''?NaN:Number(input.value));
        if(dirty){if(e.key==='Enter')e.preventDefault();return;}
        if(['flonum','number_int'].includes(node.type)&&e.key==='Tab')tab(node.id);
        if(e.key==='Enter'){e.preventDefault();input.select();}return;
      }
      if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft','Home','End'].includes(e.key)){
        e.preventDefault();e.stopPropagation();const {min,max}=bounds(),step=node.type==='flonum'?.01:1;
        const value=e.key==='Home'?min:e.key==='End'?max:(dirty?Number(input.value):displayedValue)+(['ArrowUp','ArrowRight'].includes(e.key)?step:-step);
        keyContinuous=setValue(value,!keyContinuous)||keyContinuous;
      }
    });
    input.addEventListener('keyup',()=>{keyContinuous=false;});
    input.addEventListener('blur',()=>{if(dirty)setValue(input.value===''?NaN:Number(input.value));finishControl();});
    inputs.set('value',input);body.append(input);
    if(node.type==='gain'){level=make('span','gain-value',String(node.params.value));body.append(level);}
    if(node.type==='slider'){level=make('span','slider-value',String(node.params.value));body.append(level);}
  }
  element.append(body);
  if(['bang','toggle','slider','gain'].includes(node.type)){
    resizeHandle=make('button','node-resize');resizeHandle.type='button';resizeHandle.hidden=true;
    resizeHandle.setAttribute('aria-label',`Resize ${s.name} object ${node.id}`);resizeHandle.title='Resize object. Arrow keys resize; Shift uses 10 px. Escape cancels.';
    resizeHandle.addEventListener('pointerdown',e=>{
      e.stopPropagation();e.preventDefault();if(isLocked||e.button!==0||e.ctrlKey||e.metaKey)return;
      finishControl();const rect=element.getBoundingClientRect(),scale=getZoom();
      const width=rect.width/scale,height=rect.height/scale;
      sizing={pointer:e.pointerId,x:e.clientX,y:e.clientY,zoom:scale,startWidth:width,startHeight:height,width,height,inlineWidth:element.style.width,inlineHeight:element.style.height,minWidth:element.style.minWidth};
      element.classList.add('resizing');resizeHandle.focus({preventScroll:true});resizeHandle.setPointerCapture?.(e.pointerId);
    });
    resizeHandle.addEventListener('pointermove',e=>{
      if(!sizing||e.pointerId!==sizing.pointer)return;e.preventDefault();e.stopPropagation();
      previewSize(sizing.startWidth+(e.clientX-sizing.x)/sizing.zoom,sizing.startHeight+(e.clientY-sizing.y)/sizing.zoom);
    });
    resizeHandle.addEventListener('pointerup',e=>{if(sizing?.pointer===e.pointerId){e.stopPropagation();finishResize(true);}});
    resizeHandle.addEventListener('pointercancel',()=>finishResize());resizeHandle.addEventListener('lostpointercapture',()=>finishResize());
    resizeHandle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
    resizeHandle.addEventListener('keydown',e=>{
      if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
      e.preventDefault();e.stopPropagation();if(isLocked)return;
      const rect=element.getBoundingClientRect(),scale=getZoom(),step=e.shiftKey?10:1;
      const width=Math.round(Math.max(minimumWidth,Math.min(1200,rect.width/scale+step*(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0))));
      const height=Math.round(Math.max(12,Math.min(800,rect.height/scale+step*(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0))));
      resize?.(node.id,{width,height});resized?.();
    });
    element.append(resizeHandle);
  }
  let lastPulses=null;
  function update(current,state,{selected=false,locked=false,pending=null,moving=false}={}) {
    currentNode=current;authoringPending=!!state.busy;if(isLocked!==locked)cancelInteraction();isLocked=locked;
    if(!selected)finishResize();if(resizeHandle)resizeHandle.hidden=locked||!selected;
    if(!moving){element.style.left=`${current.x}px`;element.style.top=`${current.y}px`;}
    const text=objectText(current),parts=text.split(' ');name.textContent=parts[0];args.textContent=parts.slice(1).join(' ');
    if(node.type==='comment')header.textContent=current.params.text;
    const controlWidth={bang:24,toggle:24,number:64,number_int:64,flonum:64,gain:30,slider:140}[node.type];
    const display=message?(state.messageBoxes?.[current.id]?.text??current.params.text):text;
    element.style.width=`${controlWidth??Math.max(message?52:48,Math.max(s.inlets.length,s.outlets.length)*18,Math.min(310,display.length*7+18))}px`;
    element.classList.toggle('selected',selected);
    const observation=state.observations[current.id];
    for(const[key,input] of inputs){
      let value=Number.isFinite(observation?.value)&&(['flonum','number_int','slider'].includes(node.type)||(node.type==='number'&&observation.pulses>0))?observation.value:current.params[key];
      if(['flonum','number_int'].includes(node.type)){input.min=current.params.minimum;input.max=current.params.maximum;}
      if(node.type==='slider'){
        input.min=0;input.max=current.params.size-1;input.step=current.params.floatoutput?'any':1;
      }
      if(doc.activeElement!==input&&!gesture&&!dirty){displayedValue=value;input.value=node.type==='flonum'?Number(value).toFixed(current.params.numdecimalplaces):String(value);}
      input.readOnly=!locked&&!gesture&&!temporaryEditing;
      input.setAttribute('aria-disabled',String(!locked&&!gesture&&!temporaryEditing));
      if(ranged){const vertical=current.style?.orientation===2||(current.style?.orientation!==1&&element.offsetHeight>element.offsetWidth);element.classList.toggle('vertical-control',vertical);input.setAttribute('aria-orientation',vertical?'vertical':'horizontal');}
    }
    if(trigger){
      trigger.disabled=locked&&state.native&&!state.ready;
      if(message){trigger.textContent=display;messageDescription.textContent=display||'Empty message';}
      if(node.type==='toggle'){const on=!!observation?.value;trigger.classList.toggle('on',on);trigger.setAttribute('aria-pressed',String(on));}
      if(node.type==='bang')trigger.classList.toggle('pulse',!!observation&&lastPulses!==null&&observation.pulses>lastPulses);
    }
    if(printPopup){
      const value=current.params.popup?printPopupText(state.printPopups?.[current.id]):null;
      printPopup.hidden=value===null;printValue.textContent=value??'';
      element.classList.toggle('has-print-popup',value!==null);
      if(value!==null){
        const bounds=element.closest?.('#workspace')?.getBoundingClientRect();
        const right=bounds?.right??doc.documentElement?.clientWidth;
        if(bounds)printPopup.style.maxWidth=`${Math.max(32,Math.min(320,(bounds.width-24)/getZoom()))}px`;
        printPopup.classList.toggle('opens-left',Number.isFinite(right)&&element.getBoundingClientRect().right+printPopup.getBoundingClientRect().width+12>right);
      }
    }
    lastPulses=observation?.pulses??null;
    if(level){
      const raw=gesture?Number(valueInput().value):node.type==='slider'&&Number.isFinite(observation?.value)?observation.value:current.params.value;
      const scaled=node.type==='slider'?Math.max(-100000,Math.min(100000,raw*current.params.mult+current.params.min)):raw;
      level.textContent=String(node.type==='slider'&&!current.params.floatoutput?Math.trunc(scaled):scaled);
    }
    for(const direction of ['in','out'])portElements[direction].forEach((b,i)=>{b.tabIndex=locked&&control?-1:0;b.classList.toggle('pending',pending?.id===current.id&&pending.direction===direction&&pending.index===i);});
  }
  return{type:node.type,configuration:nodeConfiguration(node),element,header,inputs,ports:portElements,minimumWidth,update,get resizePreview(){return sizing?{width:sizing.width,height:sizing.height}:null;},cancelInteraction,dispose(){cancelInteraction();doc.defaultView?.removeEventListener('blur',windowBlur);}};
}

export const nodeConfiguration=node=>JSON.stringify([node.params.args,node.params.name,node.params.channels,node.patcher?.nodes.filter(child=>['inlet','outlet'].includes(child.type)).map(child=>[child.id,child.type,child.x])]);
