// Shared passive contextual Help for Alive and Ultra.
// This module has no engine, persistence, editor, or command dependencies.
export const DEFAULT_CONTEXT_INFO='Point to a control for help';
const CONTROL_SELECTOR='[data-help],button,input,select,textarea,summary,[role="separator"]';
const clean=value=>typeof value==='string'?value.trim().replace(/\s+/g,' ').slice(0,240):'';

export function describeContextTarget(target,regions=[],fallback=DEFAULT_CONTEXT_INFO){
  if(!target?.closest)return fallback;
  const control=target.closest(CONTROL_SELECTOR);
  if(control){
    for(const key of ['data-help','title','aria-label']){
      const value=clean(control.getAttribute?.(key));
      if(value)return value;
    }
    const labels=control.labels;
    if(labels?.length){
      const value=clean(labels[0].textContent);
      if(value)return value;
    }
    if(control.matches?.('button,summary')){
      const value=clean(control.textContent);
      if(value)return value;
    }
  }
  for(const [selector,message] of regions)
    if(target.closest(selector))return message;
  return fallback;
}

export function mountContextInfo({doc=globalThis.document,outputId='info-text',regions=[],fallback=DEFAULT_CONTEXT_INFO}={}){
  const output=doc?.getElementById?.(outputId);
  if(!output)return{dispose(){}};
  let previous=output.textContent??fallback;
  function show(target){
    const next=describeContextTarget(target,regions,fallback);
    if(previous===next)return;
    output.textContent=next;
    output.title=next; // full hint when the dedicated rail is narrow
    previous=next;
  }
  const pointerover=event=>show(event.target);
  const pointerout=event=>show(event.relatedTarget);
  const focusin=event=>show(event.target);
  doc.addEventListener('pointerover',pointerover);
  doc.addEventListener('pointerout',pointerout);
  doc.addEventListener('focusin',focusin);
  return{dispose(){
    doc.removeEventListener('pointerover',pointerover);
    doc.removeEventListener('pointerout',pointerout);
    doc.removeEventListener('focusin',focusin);
  }};
}
