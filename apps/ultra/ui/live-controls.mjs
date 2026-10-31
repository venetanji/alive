const svgNS='http://www.w3.org/2000/svg';
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const tidy=value=>Number(value.toPrecision(12));
const make=(doc,tag,cls,text)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};

function emit(input,type){const EventClass=input.ownerDocument?.defaultView?.Event??globalThis.Event;input.dispatchEvent(new EventClass(type,{bubbles:true}));}

// The existing native input remains the focus target and event/parameter owner.
export function decorateRange(input,{doc=input.ownerDocument,kind='dial',defaultValue=Number(input.value),step,unit='',formatValue}={}){
  const element=make(doc,'span',`live-range live-${kind}`),min=Number(input.min),max=Number(input.max),span=max-min;
  if(!Number.isFinite(min)||!Number.isFinite(max)||span<=0)throw Error('A control requires a finite increasing range.');
  const quantum=input.step==='any'?0:Number(input.step)||1,keyboardStep=step??(quantum||span/100);
  let gesture=null,arc,needle,resetValue=defaultValue;
  const svg=(tag,attrs)=>{const e=doc.createElementNS(svgNS,tag);for(const [key,value]of Object.entries(attrs))e.setAttribute(key,String(value));return e;};
  if(kind==='dial'){
    const drawing=svg('svg',{viewBox:'0 0 52 52','aria-hidden':'true',focusable:'false'});
    for(let i=0;i<=10;i++){
      const angle=(-135+i*27)*Math.PI/180;
      drawing.append(svg('line',{x1:26+23*Math.sin(angle),y1:26-23*Math.cos(angle),x2:26+25*Math.sin(angle),y2:26-25*Math.cos(angle),class:'live-dial-tick'}));
    }
    const path='M 12.565 39.435 A 19 19 0 1 1 39.435 39.435';
    drawing.append(svg('path',{d:path,class:'live-dial-track',pathLength:100}));
    arc=svg('path',{d:path,class:'live-dial-arc',pathLength:100});drawing.append(arc);
    drawing.append(svg('circle',{cx:26,cy:26,r:13,class:'live-dial-face'}));
    needle=svg('line',{x1:26,y1:26,x2:26,y2:14,class:'live-dial-needle'});drawing.append(needle);element.append(drawing);
  }
  input.classList.add('live-range-input');input.title=`${input.getAttribute('aria-label')??'Value'}; drag to adjust, Shift for fine adjustment, double-click to reset.`;
  element.append(input);
  function update(value=Number(input.value)){
    const position=clamp((Number(value)-min)/span,0,1);
    element.style.setProperty('--live-position',`${position*100}%`);
    element.classList.toggle('is-disabled',!!input.disabled);
    if(arc)arc.setAttribute('stroke-dashoffset',String(100-position*100));
    if(needle)needle.setAttribute('transform',`rotate(${-135+position*270} 26 26)`);
    input.setAttribute('aria-valuetext',formatValue?formatValue(Number(value)):`${tidy(Number(value))}${unit?' '+unit:''}`);
  }
  function write(value){
    value=clamp(value,min,max);if(quantum)value=min+Math.round((value-min)/quantum)*quantum;
    const next=String(tidy(clamp(value,min,max)));
    if(input.value===next)return false;
    if(gesture)gesture.changed=true;
    input.value=next;update();emit(input,'input');return true;
  }
  function finish(cancel=false){
    if(!gesture)return;
    const previous=gesture;gesture=null;element.classList.remove('is-adjusting');
    if(input.hasPointerCapture?.(previous.id))input.releasePointerCapture(previous.id);
    if(cancel){input.value=String(previous.value);update();emit(input,'live-cancel');}
    else if(previous.changed)emit(input,'change');
  }
  const listeners=[];
  const on=(type,handler)=>{input.addEventListener(type,handler);listeners.push([type,handler]);};
  on('input',()=>update());
  on('pointerdown',event=>{
    if(input.disabled||event.button!==0||gesture)return;
    event.preventDefault();input.focus();input.setPointerCapture?.(event.pointerId);
    gesture={id:event.pointerId,value:Number(input.value),x:event.clientX,y:event.clientY,raw:Number(input.value)};
    element.classList.add('is-adjusting');
  });
  on('pointermove',event=>{
    if(!gesture||gesture.id!==event.pointerId)return;
    if(input.disabled){finish(true);return;}
    const delta=kind==='slider'?event.clientX-gesture.x:gesture.y-event.clientY+event.clientX-gesture.x;
    gesture.raw+=delta*span/(event.shiftKey?1600:160);gesture.x=event.clientX;gesture.y=event.clientY;write(gesture.raw);
    gesture.raw=clamp(gesture.raw,min,max);
  });
  for(const name of ['pointerup','blur'])on(name,()=>finish());
  for(const name of ['pointercancel','lostpointercapture'])on(name,()=>finish(true));
  on('keydown',event=>{
    if(input.disabled||event.altKey||event.ctrlKey||event.metaKey)return;
    if(event.key==='Escape'&&gesture){event.preventDefault();event.stopPropagation();finish(true);return;}
    const amounts={ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1,PageUp:10,PageDown:-10};
    let value;
    if(event.key==='Home')value=min;else if(event.key==='End')value=max;
    else if(Object.hasOwn(amounts,event.key))value=Number(input.value)+amounts[event.key]*keyboardStep/(event.shiftKey?10:1);
    else return;
    event.preventDefault();event.stopPropagation();if(write(value))emit(input,'change');
  });
  on('dblclick',event=>{if(input.disabled)return;event.preventDefault();event.stopPropagation();if(write(resetValue))emit(input,'change');});
  update();
  return{element,input,update,hasDraft:()=>!!gesture,setDefaultValue(value){if(Number.isFinite(value)&&value>=min&&value<=max)resetValue=value;},reset(){if(!input.disabled&&write(resetValue))emit(input,'change');},dispose(){for(const [type,handler]of listeners)input.removeEventListener(type,handler);gesture=null;}};
}

export function decorateNumber(input){input.classList.add('live-value');return input;}

export function createNumber(doc,{label,value=0,min,max,step='any',display,disabled=false,onChange=()=>{}}={}){
  const formatted=typeof display?.format==='function'&&typeof display?.parse==='function';
  const input=decorateNumber(make(doc,'input'));input.type=formatted?'text':'number';input.step=String(step);input.disabled=disabled;
  if(formatted){input.setAttribute('role','spinbutton');input.setAttribute('inputmode','decimal');}
  input.setAttribute('aria-label',label??'Value');if(min!==undefined)input.min=String(min);if(max!==undefined)input.max=String(max);
  let accepted=Number(value),dirty=false;
  const text=value=>formatted?display.format(value):String(value);
  const paint=()=>{
    if(!dirty)input.value=text(accepted);
    if(formatted){
      const physical=display.toDisplay?.(accepted)??accepted;
      if(Number.isFinite(physical))input.setAttribute('aria-valuenow',String(physical));else input.removeAttribute('aria-valuenow');
      input.setAttribute('aria-valuetext',text(accepted));
      for(const [name,value]of [['aria-valuemin',display.min],['aria-valuemax',display.max]])if(Number.isFinite(value))input.setAttribute(name,String(value));
    }
  };
  const update=value=>{accepted=Number(value);paint();};
  function commit(){
    if(input.disabled)return false;
    if(!dirty)return true;
    let next;try{next=input.value.trim()===''?NaN:formatted?display.parse(input.value):Number(input.value);}catch{next=NaN;}
    if(!Number.isFinite(next)||(min!==undefined&&next<min)||(max!==undefined&&next>max)||!input.checkValidity()||step!=='any'&&Math.abs((next-(min??0))/Number(step)-Math.round((next-(min??0))/Number(step)))>1e-7){
      input.setAttribute('aria-invalid','true');return false;
    }
    const previous=accepted;input.removeAttribute('aria-invalid');dirty=false;accepted=next;
    if(onChange(next)===false){accepted=previous;dirty=true;input.setAttribute('aria-invalid','true');return false;}
    paint();return true;
  }
  const listeners=[],on=(type,handler)=>{input.addEventListener(type,handler);listeners.push(()=>input.removeEventListener(type,handler));};
  on('input',()=>{dirty=true;input.removeAttribute('aria-invalid');});
  on('change',commit);on('blur',commit);
  on('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dirty=false;paint();input.removeAttribute('aria-invalid');}
    else if(event.key==='Enter'){event.preventDefault();commit();}
    else if(formatted&&!input.disabled&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&['ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();event.stopPropagation();if(!commit())return;
      const quantum=step==='any'?(max-min)/100:Number(step),delta=quantum/(event.shiftKey&&step==='any'?10:1);
      if(!Number.isFinite(delta)||delta<=0)return;
      const next=tidy(clamp(accepted+(event.key==='ArrowUp'?delta:-delta),min,max));
      if(next!==accepted){accepted=next;paint();onChange(next);}
    }
  });
  const cancel=()=>{dirty=false;paint();input.removeAttribute('aria-invalid');};
  input.commitDraft=commit;input.cancelDraft=cancel;input.hasDraft=()=>dirty;
  paint();
  return{element:input,input,update,commit,cancel,hasDraft:()=>dirty,setDisabled(value){input.disabled=!!value;},dispose(){for(const remove of listeners)remove();}};
}

function createContinuous(doc,kind,{label,value=0,min=0,max=1,step='any',keyboardStep,unit='',display,defaultValue=value,disabled=false,onInput=()=>{},onChange=()=>{},onCancel=()=>{}}={}){
  const element=make(doc,'div',`live-control live-control-${kind}`),caption=make(doc,'span','live-label',label),input=make(doc,'input');
  if(display?.format)element.classList.add('live-control-formatted');
  element.setAttribute('role','group');element.setAttribute('aria-label',label);
  input.type='range';input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(value);input.disabled=disabled;input.setAttribute('aria-label',label);
  const control=decorateRange(input,{doc,kind,defaultValue,step:keyboardStep,unit,formatValue:display?.format});
  const number=createNumber(doc,{label:`${label} value`,value,min,max,step,display,disabled,onChange:value=>{const accepted=onChange(value);if(accepted===false)return false;input.value=String(value);control.update();return true;}});
  const preview=()=>{number.update(input.value);onInput(Number(input.value));},change=()=>onChange(Number(input.value)),cancel=()=>{number.update(input.value);onCancel(Number(input.value));};
  input.addEventListener('input',preview);input.addEventListener('change',change);input.addEventListener('live-cancel',cancel);
  const readout=make(doc,'span','live-readout');readout.append(number.element);if(unit&&!display)readout.append(make(doc,'span','live-unit',unit));
  element.append(caption,control.element,readout);
  return{element,input,number:number.input,hasDraft:()=>number.hasDraft()||control.hasDraft(),update(value){if(!control.hasDraft()){input.value=String(value);control.update();}number.update(value);},setDisabled(value){input.disabled=!!value;number.setDisabled(value);control.update();},setDefaultValue:control.setDefaultValue,reset:control.reset,dispose(){input.removeEventListener('input',preview);input.removeEventListener('change',change);input.removeEventListener('live-cancel',cancel);control.dispose();number.dispose();}};
}

export const createDial=(doc,options)=>createContinuous(doc,'dial',options);
export const createSlider=(doc,options)=>createContinuous(doc,'slider',options);

export function createButton(doc,{label,disabled=false,onClick=()=>{}}={}){
  const element=make(doc,'button','live-button',label);element.type='button';element.disabled=disabled;element.addEventListener('click',event=>{if(!element.disabled)onClick(event);});return{element};
}

export function createToggle(doc,{label,checked=false,disabled=false,onChange=()=>{}}={}){
  const {element}=createButton(doc,{label,disabled,onClick:()=>{checked=!checked;update(checked);onChange(checked);}});element.classList.add('live-toggle');
  function update(value){checked=!!value;element.setAttribute('aria-pressed',String(checked));}
  update(checked);return{element,update};
}

export function createMenu(doc,{label,options=[],value,disabled=false,onChange=()=>{}}={}){
  const element=make(doc,'label','live-menu'),caption=make(doc,'span','live-label',label),input=make(doc,'select');input.disabled=disabled;input.setAttribute('aria-label',label);
  for(const option of options){const e=make(doc,'option','',option.label??option);e.value=String(option.value??option);input.append(e);}
  if(value!==undefined)input.value=String(value);input.addEventListener('change',()=>onChange(input.value));element.append(caption,input);return{element,input,update(value){input.value=String(value);}};
}

export function createRadioGroup(doc,{label,options=[],value,disabled=false,vertical=false,onChange=()=>{}}={}){
  const element=make(doc,'div','live-radio-group');element.setAttribute('role','radiogroup');element.setAttribute('aria-label',label??'Options');
  element.setAttribute('aria-orientation',vertical?'vertical':'horizontal');
  const listeners=[],buttons=[];let selected=value;
  const key=value=>String(typeof value==='boolean'?Number(value):value);
  function update(next){
    selected=next;
    buttons.forEach(({button,option},i)=>{const checked=key(option.value)===key(selected);button.setAttribute('aria-checked',String(checked));button.tabIndex=!disabled&&(checked||i===0&&!options.some(o=>key(o.value)===key(selected)))?0:-1;});
  }
  const choose=next=>{const changed=key(next)!==key(selected);update(next);if(changed)onChange(next);};
  for(const [index,option]of options.entries()){
    const button=make(doc,'button','live-radio-option',option.label);button.type='button';button.setAttribute('role','radio');button.setAttribute('aria-label',option.label);button.disabled=disabled;
    const click=()=>{if(!disabled)choose(option.value);};
    const keydown=event=>{
      if(disabled)return;
      let next;if(event.key==='Home')next=0;else if(event.key==='End')next=options.length-1;
      else if(['ArrowLeft','ArrowUp'].includes(event.key))next=(index+options.length-1)%options.length;
      else if(['ArrowRight','ArrowDown'].includes(event.key))next=(index+1)%options.length;else return;
      event.preventDefault();event.stopPropagation();choose(options[next].value);buttons[next].button.focus();
    };
    button.addEventListener('click',click);button.addEventListener('keydown',keydown);
    listeners.push(()=>{button.removeEventListener('click',click);button.removeEventListener('keydown',keydown);});
    buttons.push({button,option});element.append(button);
  }
  update(value);
  return{element,update,setDisabled(value){disabled=!!value;for(const {button}of buttons)button.disabled=disabled;update(selected);},dispose(){for(const release of listeners)release();}};
}

export function createPanel(doc,{title,controls=[]}={}){
  const element=make(doc,'section','live-panel'),header=make(doc,'header','live-panel-header'),body=make(doc,'div','live-panel-body');
  header.append(make(doc,'h2','',title));body.append(...controls.map(control=>control.element??control));element.append(header,body);return{element,header,body};
}
