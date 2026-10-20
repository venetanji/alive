import {OBJECTS, objectText, portHelp} from './canvas-catalog.mjs';

export function createNodeView(node,{doc,select,dragStart,edit,portClick,hover,unhover,context,operate,parameter}) {
  const s=OBJECTS[node.type],make=(tag,className,text)=>{const e=doc.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
  const element=make('article',`node ui-${s.ui}`);element.dataset.node=String(node.id);element.setAttribute('aria-label',`${s.name} object ${node.id}`);
  const header=make('header',s.ui==='object'?'object-label':'ui-handle');header.dataset.drag='true';header.tabIndex=0;header.setAttribute('aria-label',`Select or drag ${s.name} object ${node.id}`);
  const name=make('span','class-name',s.name),args=make('span','arguments');if(s.ui==='object')header.append(name,args);
  header.addEventListener('click',e=>{if(!e.detail)select(node.id,e.shiftKey);});
  header.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();select(node.id,e.shiftKey);}});
  header.addEventListener('pointerdown',e=>dragStart(node.id,e));
  element.addEventListener('pointerdown',e=>{if(e.target===element)dragStart(node.id,e);});
  element.addEventListener('dblclick',e=>{if(e.target?.dataset?.direction)return;e.stopPropagation();edit(node.id);});
  element.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();context(node.id,e);});
  element.append(header);
  const portElements={in:[],out:[]};
  for(const [direction,descriptors] of [['in',s.inlets],['out',s.outlets]]) {
    const row=make('div',`ports ${direction==='in'?'inlets':'outlets'}`);
    descriptors.forEach((p,i)=>{
      const info=portHelp(node.type,direction,i),b=make('button',`port ${p.type}${p.type==='control'&&info.detail.startsWith('Hot.')?' hot':''}`);
      b.type='button';Object.assign(b.dataset,{direction,port:String(i),side:p.side,portType:p.type});
      b.setAttribute('aria-label',`${s.name} ${node.id}, ${direction==='in'?'Inlet':'Outlet'} ${i}: ${info.title} (${p.type})`);
      b.addEventListener('click',e=>{e.stopPropagation();portClick(node.id,direction,i,e);});
      b.addEventListener('pointerdown',e=>e.stopPropagation());
      b.addEventListener('pointerenter',()=>hover(node.id,direction,i,b));b.addEventListener('focus',()=>hover(node.id,direction,i,b));
      b.addEventListener('pointerleave',unhover);b.addEventListener('blur',unhover);
      b.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();context(node.id,e,{direction,index:i});});
      row.append(b);portElements[direction].push(b);
    });element.append(row);
  }
  const body=make('div','node-body'),inputs=new Map();let trigger=null,level=null;
  if(['bang','toggle','message'].includes(node.type)) {
    trigger=make('button',`trigger ${node.type}-trigger`,node.type==='message'?node.params.text:'');
    trigger.type='button';trigger.dataset.trigger=node.type;trigger.setAttribute('aria-label',`Trigger ${s.name} object ${node.id}`);
    trigger.addEventListener('click',e=>operate(node.id,e));
    trigger.addEventListener('pointerdown',e=>dragStart(node.id,e));body.append(trigger);
  } else if(node.type==='number'||node.type==='gain') {
    const input=make('input',node.type==='gain'?'gain-input':'number-input');input.type=node.type==='gain'?'range':'number';
    const p=s.params.value;input.min=p.min;input.max=p.max;input.step=p.integer?1:'any';input.value=node.params.value;input.dataset.parameter='value';
    input.setAttribute('aria-label',`${s.name} value, object ${node.id}`);
    let continuous=false;
    input.addEventListener('input',()=>{if(node.type!=='gain')return;parameter(node.id,'value',Number(input.value),{history:!continuous});continuous=true;});
    input.addEventListener('change',()=>{parameter(node.id,'value',Number(input.value),{history:!continuous});continuous=false;});
    inputs.set('value',input);body.append(input);
    if(node.type==='gain'){level=make('span','gain-value',String(node.params.value));body.append(level);}
  }
  element.append(body);
  let lastPulses=null;
  function update(current,state,{selected=false,locked=false,pending=null,moving=false}={}) {
    if(!moving){element.style.left=`${current.x}px`;element.style.top=`${current.y}px`;}
    const text=objectText(current),parts=text.split(' ');args.textContent=parts.slice(1).join(' ');
    element.style.width=`${Math.max(node.type==='message'?52:48,Math.min(310,(node.type==='message'?current.params.text:text).length*7+18))}px`;
    element.classList.toggle('selected',selected);
    const observation=state.observations[current.id];
    for(const[key,input] of inputs){
      const value=node.type==='number'&&observation?.pulses>0?observation.value:current.params[key];
      if(doc.activeElement!==input)input.value=String(value);
      if(node.type==='number')input.readOnly=!locked;
    }
    if(trigger){
      trigger.disabled=locked&&!state.ready;
      if(node.type==='message')trigger.textContent=current.params.text;
      if(node.type==='toggle'){const on=!!observation?.value;trigger.classList.toggle('on',on);trigger.setAttribute('aria-pressed',String(on));}
      if(node.type==='bang')trigger.classList.toggle('pulse',!!observation&&lastPulses!==null&&observation.pulses>lastPulses);
    }
    lastPulses=observation?.pulses??null;
    if(level)level.textContent=String(current.params.value);
    portElements.out.forEach((b,i)=>b.classList.toggle('pending',pending?.from===current.id&&pending.outlet===i));
  }
  return{type:node.type,element,header,ports:portElements,update};
}
