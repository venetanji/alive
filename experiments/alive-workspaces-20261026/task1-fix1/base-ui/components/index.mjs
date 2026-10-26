/** Dependency-free presentation controls. No graph, DSP, IPC or Max execution. */
export const TYPES=Object.freeze(['object','message','button','toggle','number','flonum','slider','meter','inlet','outlet']);
const numeric=new Set(['number','flonum','slider','meter']);
const textual=new Set(['object','message']);
const decimal=/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const finite=(n,name)=>{if(typeof n!=='number'||!Number.isFinite(n))throw new TypeError(`${name} must be finite`);return n;};
const text=(v,name,max)=>{if(typeof v!=='string'||v.length>max)throw new TypeError(`${name} must be a string of at most ${max} characters`);return v;};

/** Validate an entire state, provide defaults, strip no unknown data silently. */
export function normalizeState(raw) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new TypeError('Expected component state');
  const allowed=['version','id','type','label','disabled','value',...(numeric.has(raw.type)?['min','max','step']:[])];
  for(const k of Object.keys(raw)){
    if(!allowed.includes(k))throw new TypeError(`Unknown state field: ${k}`);
    if(raw[k]===null&&!(k==='value'&&['button','inlet','outlet'].includes(raw.type)))throw new TypeError(`${k} cannot be null`);
  }
  if(own(raw,'version')&&raw.version!==1)throw new TypeError('Unsupported component state version');
  if(!TYPES.includes(raw.type))throw new TypeError('Unsupported component type');
  const id=text(raw.id,'id',128);if(!id.length)throw new TypeError('id cannot be empty');
  const state={version:1,id,type:raw.type,label:text(raw.label??raw.type,'label',256),disabled:raw.disabled??false};
  if(typeof state.disabled!=='boolean')throw new TypeError('disabled must be boolean');
  if(textual.has(state.type))state.value=text(raw.value??'','value',4096);
  else if(numeric.has(state.type)) {
    const bounded=state.type==='slider'||state.type==='meter';
    state.min=finite(raw.min??(bounded?0:-1e9),'min');state.max=finite(raw.max??(bounded?1:1e9),'max');
    state.step=finite(raw.step??(state.type==='number'?1:.01),'step');
    if(state.min>=state.max||state.step<=0)throw new RangeError('Require min < max and step > 0');
    if(state.type==='number'&&(!Number.isSafeInteger(state.min)||!Number.isSafeInteger(state.max)||!Number.isSafeInteger(state.step)))throw new RangeError('Integer controls require safe integer bounds and step');
    const value=finite(raw.value??0,'value');
    state.value=Math.max(state.min,Math.min(state.max,state.type==='number'?Math.trunc(value):value));
    if(state.type==='slider') {
      const ticks=(state.max-state.min)/state.step;
      if(!Number.isFinite(ticks)||ticks>1e9)throw new RangeError('Slider range supports at most 1 billion steps');
      // Include an exact upper endpoint despite floating-point division error.
      const last=Math.floor(ticks+8*Number.EPSILON*Math.max(1,ticks));
      const tick=Math.min(last,Math.round((state.value-state.min)/state.step));
      state.value=Math.max(state.min,Math.min(state.max,Number((state.min+tick*state.step).toPrecision(15))));
    }
    if(state.value===0)state.value=0; // Canonicalize negative zero for JSON.
  } else if(state.type==='toggle') {
    state.value=raw.value??0;
    if(state.value!==0&&state.value!==1)throw new TypeError('toggle value must be 0 or 1');
  } else {
    if(own(raw,'value')&&raw.value!==null)throw new TypeError('Stateless controls require null value');
    state.value=null;
  }
  return state;
}

/** Small UI protocol, deliberately NOT a Max message parser. */
export function messagePayload(value) {
  const source=text(value,'message',4096).trim();
  if(source==='bang')return {kind:'bang'};
  const tokens=source?source.split(/\s+/):[];
  if(tokens.length&&tokens.every(t=>decimal.test(t)&&Number.isFinite(Number(t))))return {kind:'list',atoms:tokens.map(Number)};
  return {kind:'text',text:value};
}

/** Return {element,control,trigger?,getState,setState,destroy}. */
export function createComponent(initial,{document=globalThis.document,onEvent=()=>{}}={}) {
  let state=normalizeState(initial),destroyed=false;
  if(!document?.createElement)throw new TypeError('A DOM document is required');
  if(typeof onEvent!=='function')throw new TypeError('onEvent must be a function');
  const element=document.createElement('div');element.className=`ultra-control ultra-${state.type}`;
  const caption=document.createElement('span');caption.className='ultra-caption';element.append(caption);
  const tag=textual.has(state.type)||['number','flonum','slider'].includes(state.type)?'input':state.type==='meter'?'meter':'button';
  const control=document.createElement(tag);control.className='ultra-control-input';element.append(control);
  let trigger;
  if(tag==='button')control.type='button';
  if(tag==='input')control.type=state.type==='slider'?'range':numeric.has(state.type)?'number':'text';
  if(textual.has(state.type)){control.maxLength=4096;control.spellcheck=false;control.autocomplete='off';}
  if(state.type==='message'){trigger=document.createElement('button');trigger.type='button';trigger.textContent='▶';trigger.className='ultra-message-send';element.append(trigger);}
  const readout=document.createElement('output');readout.className='ultra-readout';
  if(state.type==='slider'||state.type==='meter')element.append(readout);
  const listeners=[];
  function listen(node,type,handler){node.addEventListener(type,handler);listeners.push([node,type,handler]);}
  function emit(action,fields={}){if(!destroyed&&!state.disabled)onEvent({version:1,id:state.id,type:state.type,action,...fields});}
  function render(){
    caption.textContent=state.label;control.setAttribute('aria-label',state.label);
    control.disabled=state.disabled;control.setAttribute('aria-disabled',String(state.disabled));
    element.setAttribute('data-disabled',String(state.disabled));
    if(numeric.has(state.type)){control.min=String(state.min);control.max=String(state.max);control.step=String(state.step);readout.textContent=String(state.value);}
    // Range inputs sanitize on value assignment; configure their bounds first.
    if(textual.has(state.type)||numeric.has(state.type))control.value=String(state.value);
    if(state.type==='toggle'){control.textContent=state.value?'×':'·';control.setAttribute('aria-pressed',String(state.value===1));}
    if(state.type==='button')control.textContent='●';
    if(state.type==='inlet'||state.type==='outlet'){control.textContent=state.type==='inlet'?'↓':'↑';control.setAttribute('aria-label',`${state.type}: ${state.label}`);}
    if(trigger){trigger.disabled=state.disabled;trigger.setAttribute('aria-label',`Send ${state.label}`);}
  }
  function commit(value){
    if(destroyed||state.disabled){render();return;}
    let next;
    try {next=normalizeState({...state,value});}catch {render();return;}
    const changed=next.value!==state.value;state=next;render();if(changed)emit('change',{value:state.value});
  }
  function readValue(){
    if(textual.has(state.type))return control.value;
    // Number('') is zero; an empty edit is not a request for zero.
    return decimal.test(control.value.trim())?Number(control.value):NaN;
  }
  // Bubble-stage shielding preserves native input/button/range behavior and Tab.
  // Hosts must also ignore input targets in any capture-stage note shortcut handler.
  for(const type of ['keydown','keyup','keypress','pointerdown','pointerup','click','dblclick'])listen(element,type,e=>e.stopPropagation());
  if(tag==='input') {
    listen(control,'keydown',e=>{
      e.stopPropagation();if(e.isComposing)return;
      if(e.key==='Enter'){e.preventDefault();commit(readValue());}
      if(e.key==='Escape'){e.preventDefault();render();}
    });
    listen(control,'change',()=>commit(readValue()));
  }
  if(state.type==='slider')listen(control,'input',()=>{
    if(state.disabled||destroyed){render();return;}
    let preview;try{preview=normalizeState({...state,value:readValue()}).value;}catch{render();return;}
    readout.textContent=String(preview);emit('input',{value:preview});
  });
  if(state.type==='button')listen(control,'click',()=>emit('output',{payload:{kind:'bang'}}));
  if(state.type==='toggle')listen(control,'click',()=>commit(state.value?0:1));
  if(state.type==='inlet'||state.type==='outlet')listen(control,'click',()=>emit('connect',{direction:state.type}));
  if(trigger)listen(trigger,'click',()=>{if(destroyed||state.disabled)return;commit(readValue());emit('output',{payload:messagePayload(state.value)});});
  render();
  return {element,control,...(trigger?{trigger}:{}),getState:()=>({...state}),setState(patch){
    if(destroyed)throw new Error('Component was destroyed');
    if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new TypeError('Expected state update');
    if((own(patch,'id')&&patch.id!==state.id)||(own(patch,'type')&&patch.type!==state.type))throw new TypeError('id and type are immutable');
    state=normalizeState({...state,...patch});render();
  },destroy(){if(destroyed)return;destroyed=true;for(const [node,type,handler] of listeners)node.removeEventListener(type,handler);element.remove();}};
}
