import {OBJECTS, objectText, portHelp} from './canvas-catalog.mjs';
import {nodeSpec} from './canvas-model.mjs';

export function createNodeView(node,{doc,select,dragStart,edit,portClick,portDown,hover,unhover,context,operate,parameter,event}) {
  const s={...OBJECTS[node.type],...nodeSpec(node)},make=(tag,className,text)=>{const e=doc.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
  const element=make('article',`node ui-${s.ui}`);element.dataset.node=String(node.id);element.setAttribute('aria-label',`${s.name} object ${node.id}`);
  const header=make('header',s.ui==='object'?'object-label':'ui-handle');header.dataset.drag='true';header.tabIndex=0;header.setAttribute('aria-label',`Select or drag ${s.name} object ${node.id}`);
  const name=make('span','class-name',s.name),args=make('span','arguments');if(s.ui==='object')header.append(name,args);
  header.addEventListener('click',e=>{if(!e.detail)select(node.id,e.shiftKey);});
  header.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();select(node.id,e.shiftKey);}});
  header.addEventListener('pointerdown',e=>dragStart(node.id,e));
  element.addEventListener('pointerdown',e=>{if(e.target===element)dragStart(node.id,e);});
  element.addEventListener('dblclick',e=>{if(e.target?.dataset?.direction)return;e.stopPropagation();if(control&&(isLocked||e.ctrlKey||e.metaKey))return;edit(node.id);});
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
  const body=make('div','node-body'),inputs=new Map();let trigger=null,level=null;
  const control=['bang','toggle','message','number','flonum','gain','slider'].includes(node.type);
  let currentNode=node,isLocked=false,gesture=null,suppressClick=false,dirty=false,keyContinuous=false,temporaryEditing=false,displayedValue=node.params.value;
  const canOperate=e=>isLocked||e.ctrlKey||e.metaKey;
  const ranged=['gain','slider'].includes(node.type);
  const valueInput=()=>inputs.get('value');
  function bounds(){
    const input=valueInput();return{min:Number(input.min),max:Number(input.max)};
  }
  function setValue(value,history=true){
    const input=valueInput(),{min,max}=bounds();if(!Number.isFinite(value))return false;
    value=Math.max(min,Math.min(max,value));
    if(input.step==='1')value=Math.round(value);
    value=Number(value.toFixed(9));
    input.value=String(value);displayedValue=value;dirty=false;
    if(value===currentNode.params.value)return false;
    parameter(node.id,'value',value,{history});return true;
  }
  function finishControl(){
    const previous=gesture;gesture=null;keyContinuous=false;temporaryEditing=false;
    element.classList.remove('operating');
    if(previous&&element.hasPointerCapture?.(previous.pointer))element.releasePointerCapture(previous.pointer);
    if(!isLocked&&valueInput())valueInput().readOnly=true;
  }
  function rangePosition(e){
    const rect=element.getBoundingClientRect(),orientation=currentNode.style?.orientation;
    const vertical=orientation===2||(orientation!==1&&rect.height>rect.width);
    const ratio=vertical?1-(e.clientY-rect.top)/rect.height:(e.clientX-rect.left)/rect.width;
    const {min,max}=bounds();return min+Math.max(0,Math.min(1,ratio))*(max-min);
  }
  element.addEventListener('pointerdown',e=>{
    if(!control||e.button!==0||e.target.closest('.port'))return;
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
  element.addEventListener('keydown',e=>{if(e.key==='Escape')finishControl();});
  element.addEventListener('focusout',()=>finishControl());
  const windowBlur=()=>finishControl();
  doc.defaultView?.addEventListener('blur',windowBlur);
  if(['bang','toggle','message'].includes(node.type)) {
    trigger=make('button',`trigger ${node.type}-trigger`,node.type==='message'?node.params.text:'');
    trigger.type='button';trigger.dataset.trigger=node.type;trigger.setAttribute('aria-label',`Trigger ${s.name} object ${node.id}`);
    trigger.addEventListener('click',e=>{if(suppressClick&&e.detail){suppressClick=false;return;}operate(node.id,e);});
    body.append(trigger);
  } else if(['number','gain','flonum','slider'].includes(node.type)) {
    const input=make('input',node.type==='gain'?'gain-input':node.type==='slider'?'slider-input':'number-input');input.type=ranged?'range':'number';
    const p=s.params.value;input.min=p.min;input.max=p.max;input.step=p.integer?1:'any';input.value=node.params.value;input.dataset.parameter='value';
    input.setAttribute('aria-label',`${s.name} value, object ${node.id}`);
    input.addEventListener('input',()=>{if(!ranged){dirty=true;return;}if(isLocked)setValue(Number(input.value),!keyContinuous);});
    input.addEventListener('change',()=>{if(canOperate({})||!input.readOnly)setValue(Number(input.value));dirty=false;});
    input.addEventListener('keydown',e=>{
      if(!canOperate(e)&&input.readOnly){if(e.key!=='Tab')e.preventDefault();return;}
      if(e.key==='Tab'||e.key==='Enter'){
        if(dirty)setValue(input.value===''?NaN:Number(input.value));
        dirty=false;
        if(node.type==='flonum'&&e.key==='Tab')event(node.id,0,'tab');
        if(e.key==='Enter'){e.preventDefault();input.select();}return;
      }
      if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft','Home','End'].includes(e.key)){
        e.preventDefault();e.stopPropagation();const {min,max}=bounds(),step=node.type==='flonum'?.01:1;
        const value=e.key==='Home'?min:e.key==='End'?max:(dirty?Number(input.value):displayedValue)+(['ArrowUp','ArrowRight'].includes(e.key)?step:-step);
        keyContinuous=setValue(value,!keyContinuous)||keyContinuous;
      }
    });
    input.addEventListener('keyup',()=>{keyContinuous=false;});
    input.addEventListener('blur',()=>{if(dirty)setValue(input.value===''?NaN:Number(input.value));dirty=false;finishControl();});
    inputs.set('value',input);body.append(input);
    if(node.type==='gain'){level=make('span','gain-value',String(node.params.value));body.append(level);}
    if(node.type==='slider'){level=make('span','slider-value',String(node.params.value));body.append(level);}
  }
  element.append(body);
  let lastPulses=null;
  function update(current,state,{selected=false,locked=false,pending=null,moving=false}={}) {
    currentNode=current;if(isLocked!==locked)finishControl();isLocked=locked;
    if(!moving){element.style.left=`${current.x}px`;element.style.top=`${current.y}px`;}
    const text=objectText(current),parts=text.split(' ');args.textContent=parts.slice(1).join(' ');
    const controlWidth={bang:24,toggle:24,number:64,flonum:64,gain:30,slider:140}[node.type];
    element.style.width=`${controlWidth??Math.max(node.type==='message'?52:48,Math.max(s.inlets.length,s.outlets.length)*18,Math.min(310,(node.type==='message'?current.params.text:text).length*7+18))}px`;
    element.classList.toggle('selected',selected);
    const observation=state.observations[current.id];
    for(const[key,input] of inputs){
      let value=Number.isFinite(observation?.value)&&(['flonum','slider'].includes(node.type)||(node.type==='number'&&observation.pulses>0))?observation.value:current.params[key];
      if(node.type==='flonum'){input.min=current.params.minimum;input.max=current.params.maximum;}
      if(node.type==='slider'){
        input.min=0;input.max=current.params.size-1;input.step=current.params.floatoutput?'any':1;
      }
      if(doc.activeElement!==input&&!gesture){displayedValue=value;input.value=node.type==='flonum'?Number(value).toFixed(current.params.numdecimalplaces):String(value);}
      input.readOnly=!locked&&!gesture&&!temporaryEditing;
      input.setAttribute('aria-disabled',String(!locked&&!gesture&&!temporaryEditing));
      if(ranged){const vertical=current.style?.orientation===2||(current.style?.orientation!==1&&element.offsetHeight>element.offsetWidth);element.classList.toggle('vertical-control',vertical);input.setAttribute('aria-orientation',vertical?'vertical':'horizontal');}
    }
    if(trigger){
      trigger.disabled=locked&&state.native&&!state.ready;
      if(node.type==='message')trigger.textContent=current.params.text;
      if(node.type==='toggle'){const on=!!observation?.value;trigger.classList.toggle('on',on);trigger.setAttribute('aria-pressed',String(on));}
      if(node.type==='bang')trigger.classList.toggle('pulse',!!observation&&lastPulses!==null&&observation.pulses>lastPulses);
    }
    lastPulses=observation?.pulses??null;
    if(level){
      const raw=gesture?Number(valueInput().value):node.type==='slider'&&Number.isFinite(observation?.value)?observation.value:current.params.value;
      level.textContent=String(node.type==='slider'?Math.max(-100000,Math.min(100000,raw*current.params.mult+current.params.min)):raw);
    }
    for(const direction of ['in','out'])portElements[direction].forEach((b,i)=>{b.tabIndex=locked&&control?-1:0;b.classList.toggle('pending',pending?.id===current.id&&pending.direction===direction&&pending.index===i);});
  }
  return{type:node.type,configuration:node.params.args,element,header,inputs,ports:portElements,update,cancelInteraction:finishControl,dispose(){finishControl();doc.defaultView?.removeEventListener('blur',windowBlur);}};
}
