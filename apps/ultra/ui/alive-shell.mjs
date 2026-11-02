// Toolbar disclosures own presentation only; closing them never commits a field.
export function mountTransportOptions(doc=globalThis.document,{onClose=()=>{},onOpen=()=>{}}={}){
  const toggle=doc.getElementById('transport-options-toggle'),panel=doc.getElementById('transport-options');
  if(!toggle||!panel)return{dispose(){}};
  function close(restoreFocus=false){onClose(panel);panel.hidden=true;toggle.setAttribute('aria-expanded','false');if(restoreFocus)toggle.focus();}
  const click=()=>{if(!panel.hidden)close();else{panel.hidden=false;toggle.setAttribute('aria-expanded','true');onOpen(panel);}};
  const pointerdown=event=>event.preventDefault();
  const keydown=event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();event.stopPropagation();close(true);}};
  const outside=event=>{if(!panel.hidden&&!panel.contains(event.target)&&!toggle.contains(event.target))close();};
  toggle.addEventListener('pointerdown',pointerdown);toggle.addEventListener('click',click);doc.addEventListener('keydown',keydown,true);doc.addEventListener('pointerdown',outside);
  return{dispose(){toggle.removeEventListener('pointerdown',pointerdown);toggle.removeEventListener('click',click);doc.removeEventListener('keydown',keydown,true);doc.removeEventListener('pointerdown',outside);}};
}

export function mountDisplayOptions(doc=globalThis.document,{park=()=>{}}={}){
  const menu=doc.getElementById('display-menu'),toggle=doc.getElementById('display-menu-toggle');
  if(!menu||!toggle)return{dispose(){}};
  const entries=[['display-browser','toggle-browser','aria-expanded'],['display-help','toggle-help','aria-expanded']];
  function update(){
    toggle.setAttribute('aria-expanded',String(!!menu.open));
    for(const[id,target,state]of entries)doc.getElementById(id).setAttribute('aria-pressed',doc.getElementById(target).getAttribute(state));
  }
  function close(focus=false){menu.open=false;update();if(focus)toggle.focus();}
  const forwards=entries.map(([id,target])=>{const button=doc.getElementById(id),click=()=>{doc.getElementById(target).click();update();};button.addEventListener('click',click);return{button,click};});
  const pointerdown=event=>{if(menu.contains?.(event.target)){park();event.preventDefault();}else if(menu.open)close();};
  const focusin=event=>{if(menu.open&&!menu.contains?.(event.target))close();};
  let focusTimer;
  // WebKit can omit relatedTarget while moving between controls in this menu.
  const focusout=()=>{clearTimeout(focusTimer);focusTimer=setTimeout(()=>{if(menu.open&&!menu.contains?.(doc.activeElement))close();},0);};
  const keydown=event=>{
    if(!menu.open||!menu.contains?.(event.target))return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);return;}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    const buttons=Array.from(menu.querySelectorAll('button')).filter(button=>!button.disabled);
    event.preventDefault();const index=buttons.indexOf(doc.activeElement),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:event.key==='ArrowDown'?(index+1)%buttons.length:(index<=0?buttons.length-1:index-1);buttons[next]?.focus();
  };
  const Observer=doc.defaultView?.MutationObserver,observer=Observer?new Observer(update):null;
  for(const[,target]of entries)observer?.observe(doc.getElementById(target),{attributes:true,attributeFilter:['aria-expanded']});
  menu.addEventListener('toggle',update);menu.addEventListener('focusout',focusout);doc.addEventListener('pointerdown',pointerdown);doc.addEventListener('keydown',keydown,true);doc.addEventListener('focusin',focusin,true);
  update();
  return{dispose(){clearTimeout(focusTimer);observer?.disconnect();for(const{button,click}of forwards)button.removeEventListener('click',click);menu.removeEventListener('toggle',update);menu.removeEventListener('focusout',focusout);doc.removeEventListener('pointerdown',pointerdown);doc.removeEventListener('keydown',keydown,true);doc.removeEventListener('focusin',focusin,true);}};
}
